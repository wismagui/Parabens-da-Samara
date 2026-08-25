import * as THREE from 'three';
import { MONSTERS } from './monsters.js';
import {
  DEFEND_DAMAGE_MULTIPLIER,
  SPECIAL_ATK_MULTIPLIER, SPECIAL_DEF_PIERCE, TURN_PAUSE_MS,
  BATTLE_CAMERA_DISTANCE, BATTLE_CAMERA_HEIGHT,
} from './config.js';
import * as audio from './audio.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function damageRoll(atk, def) {
  const base = Math.max(1, atk - def);
  const variance = base * (0.8 + Math.random() * 0.4);
  return Math.max(1, Math.round(variance));
}

export class BattleSystem {
  constructor(scene, callbacks) {
    this.scene = scene;
    this.callbacks = callbacks; // { onLog, onHpChange, onTurnChange, onVictory, onActionsEnabled }
    this.active = false;
    this.monsterMesh = null;
    this.stagePosition = new THREE.Vector3();
    this.stageLookAt = new THREE.Vector3();
  }

  get isActive() {
    return this.active;
  }

  /**
   * @param {number} roomId
   * @param {THREE.Vector3|{x:number,z:number}} roomWorldCenter
   * @param {{atk:number, maxHp:number, hp:number}} playerStats current (grown,
   *        possibly wounded) stats — Samara's HP carries over between fights;
   *        this same object is mutated on victory so main.js sees the result.
   */
  start(roomId, roomWorldCenter, playerStats) {
    const def = MONSTERS[roomId];
    this.roomId = roomId;
    this.playerStats = playerStats;
    this.monster = { ...def, hp: def.maxHp, heat: 0, turnsTaken: 0 };
    this.player = { hp: playerStats.hp, maxHp: playerStats.maxHp, atk: playerStats.atk, defending: false };
    this.turn = 'player';
    this.active = true;
    this.ended = false;

    if (this.monsterMesh) this.scene.remove(this.monsterMesh);
    this.monsterMesh = def.build();
    this.monsterMesh.position.set(roomWorldCenter.x, 0, roomWorldCenter.z - 1.6);
    this.scene.add(this.monsterMesh);

    this.stagePosition.set(roomWorldCenter.x, BATTLE_CAMERA_HEIGHT, roomWorldCenter.z + BATTLE_CAMERA_DISTANCE);
    this.stageLookAt.set(roomWorldCenter.x, 1.2, roomWorldCenter.z);

    this.callbacks.onLog(`${def.name} apareceu! ${def.flavor}`);
    this.callbacks.onHpChange(this._hpSnapshot());
    this.callbacks.onTurnChange('player');
    this.callbacks.onActionsEnabled(true);
  }

  _hpSnapshot() {
    return {
      playerHp: Math.max(0, this.player.hp),
      playerMaxHp: this.player.maxHp,
      monsterHp: Math.max(0, this.monster.hp),
      monsterMaxHp: this.monster.maxHp,
      monsterName: this.monster.name,
    };
  }

  update(dt) {
    if (this.monsterMesh) {
      const spin = this.monsterMesh.userData.idleSpin || 0;
      this.monsterMesh.rotation.y += spin * dt;
      this.monsterMesh.position.y = Math.sin(performance.now() * 0.002) * 0.08;
      if (this.monsterMesh.userData.flicker) {
        this.monsterMesh.visible = Math.sin(performance.now() * 0.02) > -0.85;
      }
    }
  }

  async playerAction(action) {
    if (!this.active || this.ended || this.turn !== 'player') return;
    this.callbacks.onActionsEnabled(false);
    this.turn = 'resolving';
    this.player.defending = false;

    if (action === 'attack') {
      const dmg = damageRoll(this.player.atk, this.monster.def);
      this.monster.hp -= dmg;
      audio.playAttack();
      this.callbacks.onLog(`Samara ataca! -${dmg} HP em ${this.monster.name}.`);
    } else if (action === 'defend') {
      this.player.defending = true;
      this.callbacks.onLog('Samara se prepara para o próximo golpe.');
    } else if (action === 'special') {
      const dmg = damageRoll(this.player.atk * SPECIAL_ATK_MULTIPLIER, this.monster.def * SPECIAL_DEF_PIERCE);
      this.monster.hp -= dmg;
      audio.playSpecial();
      this.callbacks.onLog(`Samara usa Gap Reverso! -${dmg} HP em ${this.monster.name}.`);
    }
    this.callbacks.onHpChange(this._hpSnapshot());

    if (this.monster.hp <= 0) {
      await this._handleVictory();
      return;
    }

    await delay(TURN_PAUSE_MS);
    await this._monsterTurn();
  }

  async _monsterTurn() {
    if (!this.active || this.ended) return;
    this.turn = 'monster';
    this.callbacks.onTurnChange('monster');
    this.monster.turnsTaken += 1;

    const special = this.monster.special;

    // Pentium 4: very strong, but rests every other turn while it "heats up".
    if (special === 'slow' && this.monster.turnsTaken % 2 === 0) {
      await delay(400);
      this.callbacks.onLog(`${this.monster.name} ainda está esquentando... (perdeu a vez)`);
      await delay(TURN_PAUSE_MS * 0.6);
      this.turn = 'player';
      this.callbacks.onTurnChange('player');
      this.callbacks.onActionsEnabled(true);
      return;
    }

    if (this.monster.catchphrase) {
      this.callbacks.onLog(`${this.monster.name} grita: "${this.monster.catchphrase}"`);
      await delay(300);
    }

    // I5cão: very fast, sometimes squeezes in a second hit.
    let hits = 1;
    if (special === 'fast' && Math.random() < 0.45) hits = 2;

    let totalDmg = 0;
    for (let i = 0; i < hits; i++) {
      let atk = this.monster.atk;
      if (special === 'heatUp') {
        // AMD FX: gets hotter (and hits harder) the longer the fight drags on.
        this.monster.heat += 1;
        atk += this.monster.heat * 3;
      }
      let dmg = damageRoll(atk, 0);
      if (this.player.defending) dmg = Math.round(dmg * DEFEND_DAMAGE_MULTIPLIER);
      totalDmg += dmg;
      this.player.hp -= dmg;
      audio.playHit();
      const suffix = hits > 1 ? ` (golpe ${i + 1}/${hits})` : '';
      this.callbacks.onLog(`${this.monster.name} ataca! -${dmg} HP em Samara${suffix}.`);
      this.callbacks.onHpChange(this._hpSnapshot());
      if (this.player.hp <= 0) break;
      if (hits > 1 && i < hits - 1) await delay(350);
    }

    // i7 Rei: the strongest, but so expensive to run that coins spill out —
    // Samara scoops them up mid-fight.
    if (special === 'coinDrop' && totalDmg > 0 && this.player.hp > 0) {
      const heal = 4 + Math.floor(Math.random() * 6);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      this.callbacks.onLog(`Moedas caem de ${this.monster.name}! Samara aproveita e recupera ${heal} HP.`);
      this.callbacks.onHpChange(this._hpSnapshot());
    }

    if (this.player.hp <= 0) {
      await delay(500);
      audio.playDefeatRestart();
      this.callbacks.onLog('Samara levou um Gap daqueles... mas levanta e tenta de novo!');
      await delay(900);
      this.player.hp = this.player.maxHp;
      this.monster.hp = this.monster.maxHp;
      this.monster.heat = 0;
      this.monster.turnsTaken = 0;
      this.callbacks.onHpChange(this._hpSnapshot());
      this.callbacks.onLog(`${this.monster.name} está pronto outra vez. Vamos lá, Samara!`);
      this.turn = 'player';
      this.callbacks.onTurnChange('player');
      this.callbacks.onActionsEnabled(true);
      return;
    }

    await delay(TURN_PAUSE_MS * 0.6);
    this.turn = 'player';
    this.callbacks.onTurnChange('player');
    this.callbacks.onActionsEnabled(true);
  }

  async _handleVictory() {
    this.ended = true;
    audio.playVictory();
    this.callbacks.onLog(`${this.monster.name} foi derrotado! Mais um Gap vencido.`);
    this.callbacks.onTurnChange('ended');
    // Carry Samara's remaining HP forward into exploration and the next fight.
    this.playerStats.hp = this.player.hp;
    await delay(1400);
    this.active = false;
    if (this.monsterMesh) {
      this.scene.remove(this.monsterMesh);
      this.monsterMesh = null;
    }
    this.callbacks.onVictory(this.roomId);
  }
}
