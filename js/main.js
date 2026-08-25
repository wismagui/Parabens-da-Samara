import * as THREE from 'three';
import { Maze } from './maze.js';
import { Player } from './player.js';
import { InputController } from './input.js';
import { BattleSystem } from './battle.js';
import { UI } from './ui.js';
import * as audio from './audio.js';
import { Typewriter, FINAL_MESSAGE } from './story.js';
import {
  CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_LOOK_HEIGHT, CAMERA_DAMPING,
  CAMERA_ROTATE_SENSITIVITY, TOTAL_GAPS,
  PLAYER_MAX_HP, PLAYER_BASE_ATK, PLAYER_ATK_GROWTH_PER_WIN, PLAYER_HP_GROWTH_PER_WIN,
  CHEST_PICKUP_RADIUS, ENERGY_DRINK_PICKUP_RADIUS,
} from './config.js';

// ---------- renderer / scene / camera ----------
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1624);
scene.fog = new THREE.Fog(0x1a1624, 26, 70);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 100));
resize();

// ---------- lighting ----------
scene.add(new THREE.HemisphereLight(0x9d8cc4, 0x3d3348, 2.1));
const ambient = new THREE.AmbientLight(0x6f5f82, 1.35);
scene.add(ambient);
// Soft directional fill (no shadows) so corridors far from any torch still
// read clearly instead of dropping to near-black.
const fill = new THREE.DirectionalLight(0xcfc0e8, 0.55);
fill.position.set(12, 22, 8);
scene.add(fill);

// ---------- world ----------
const maze = new Maze(scene);
const ui = new UI();
ui.primeMinimap(maze.grid);

const spawn = maze.getSpawnWorld();
const player = new Player(scene, spawn.x, spawn.z);

const hubCenter = maze.getHubWorldCenter();
const hubLight = new THREE.PointLight(0xffb877, 10, 30, 2);
hubLight.position.set(hubCenter.x, 3.6, hubCenter.z);
scene.add(hubLight);

const finalRoomCenter = maze.getFinalRoomWorldCenter();
const finalLight = new THREE.PointLight(0xffe9a8, 10, 22, 2);
finalLight.position.set(finalRoomCenter.x, 3.2, finalRoomCenter.z);
scene.add(finalLight);

// ---------- input ----------
const input = new InputController({
  joystickZone: document.getElementById('joystick-zone'),
  cameraZone: document.getElementById('camera-zone'),
  joystickBase: document.getElementById('joystick-base'),
  joystickKnob: document.getElementById('joystick-knob'),
});

// ---------- camera rig state ----------
let cameraYaw = Math.PI; // start facing into the hub nicely
const camPos = new THREE.Vector3();
const camLookAt = new THREE.Vector3();
let camInitialized = false;

// ---------- game state ----------
let state = 'loading'; // 'explore' | 'battle' | 'story' | 'item-prompt'
const defeatedRooms = new Set();
let storyTriggered = false;
let swordCollected = false;
let chestAwaitingExit = false;

// Samara's stats grow with every Gap she beats. HP is persistent — it
// carries the damage she took into exploration and into the next fight;
// only growth (on victory) or an energy-drink pickup restores it.
const playerStats = { atk: PLAYER_BASE_ATK, maxHp: PLAYER_MAX_HP, hp: PLAYER_MAX_HP };
ui.setPlayerHudHp(playerStats.hp, playerStats.maxHp);

const battle = new BattleSystem(scene, {
  onLog: (text) => ui.appendLog(text),
  onHpChange: (snapshot) => {
    ui.setMonsterName(snapshot.monsterName);
    ui.setHpBars(snapshot);
  },
  onTurnChange: () => {},
  onActionsEnabled: (enabled) => ui.setActionsEnabled(enabled),
  onVictory: (roomId) => handleVictory(roomId),
});

ui.bindBattleButtons({
  onAttack: () => { audio.playTap(); battle.playerAction('attack'); },
  onDefend: () => { audio.playTap(); battle.playerAction('defend'); },
  onSpecial: () => { audio.playTap(); battle.playerAction('special'); },
});

function enterBattle(roomId) {
  state = 'battle';
  input.setEnabled(false);
  ui.showBattleUI();
  const center = maze.getRoomWorldCenter(roomId);
  // snap the player into a consistent battle-stage pose facing the monster
  player.mesh.position.set(center.x, 0, center.z + 1.6);
  player.facing = Math.PI;
  player.mesh.rotation.y = player.facing;
  battle.start(roomId, center, playerStats);
}

function handleVictory(roomId) {
  defeatedRooms.add(roomId);
  maze.markRoomCleared(roomId);
  ui.markRoomDefeated(roomId);
  ui.setGapCount(defeatedRooms.size);
  ui.hideBattleUI();
  input.setEnabled(true);
  state = 'explore';

  playerStats.atk += PLAYER_ATK_GROWTH_PER_WIN;
  playerStats.maxHp += PLAYER_HP_GROWTH_PER_WIN;
  playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + PLAYER_HP_GROWTH_PER_WIN);
  ui.setPlayerHudHp(playerStats.hp, playerStats.maxHp);

  if (defeatedRooms.size >= TOTAL_GAPS) {
    maze.openFinalDoor();
    audio.playDoorOpen();
    ui.showToast('Todos os Gaps vencidos! O portão final se abriu.', 3200);
  } else {
    ui.showToast(`Gap vencido! ${defeatedRooms.size}/${TOTAL_GAPS} — Samara ficou mais forte!`);
  }
}

// ---------- story sequence ----------
const typewriter = new Typewriter(document.getElementById('story-text'));
const storyBoxEl = document.getElementById('story-box');

async function enterStory() {
  state = 'story';
  storyTriggered = true;
  input.setEnabled(false);
  ui.showStoryBox();
  await typewriter.play(FINAL_MESSAGE);
  ui.showStoryHint();
}

storyBoxEl.addEventListener('pointerdown', () => {
  if (state !== 'story') return;
  if (!typewriter.skip()) {
    // already showing full text; a tap here just keeps the message open
  } else {
    ui.showStoryHint();
  }
});

// ---------- item pickup prompt (generic: energy drinks, the sword chest) ----------
let pendingItem = null; // { onUse, onSkip }

function openItemPrompt({ icon, title, desc, useLabel, onUse, onSkip }) {
  pendingItem = { onUse, onSkip };
  state = 'item-prompt';
  input.setEnabled(false);
  ui.setItemPromptContent(icon, title, desc, useLabel);
  ui.showItemPrompt();
}

function closeItemPrompt() {
  pendingItem = null;
  ui.hideItemPrompt();
  input.setEnabled(true);
  state = 'explore';
}

ui.bindItemPrompt({
  onUse: () => {
    audio.playTap();
    const item = pendingItem;
    closeItemPrompt();
    if (item && item.onUse) item.onUse();
  },
  onSkip: () => {
    audio.playTap();
    const item = pendingItem;
    closeItemPrompt();
    if (item && item.onSkip) item.onSkip();
  },
});

// ---------- orientation handling ----------
function checkOrientation() {
  const portrait = window.innerHeight > window.innerWidth;
  ui.setOrientationWarning(portrait);
}
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 100));
checkOrientation();

// ---------- start screen ----------
ui.showStartScreen(() => {
  audio.unlock();
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
  state = 'explore';
});

// ---------- main loop ----------
const clock = new THREE.Clock();
const _camPosScratch = new THREE.Vector3();
const _camLookScratch = new THREE.Vector3();
const _worldMove = { x: 0, y: 0 };

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state === 'explore') {
    cameraYaw += input.consumeYawDelta() * CAMERA_ROTATE_SENSITIVITY;

    const raw = input.getMoveVector();
    const fx = Math.sin(cameraYaw);
    const fz = Math.cos(cameraYaw);
    const rx = -Math.cos(cameraYaw);
    const rz = Math.sin(cameraYaw);
    _worldMove.x = rx * raw.x + fx * raw.y;
    _worldMove.y = rz * raw.x + fz * raw.y;

    player.update(dt, _worldMove, (pos, radius) => maze.resolveCollision(pos, radius));

    // starting chest: find the RAM-stick sword — walking up opens a prompt
    // too, same as the energy drinks, instead of auto-equipping.
    if (!swordCollected) {
      const dx = player.position.x - maze.chestPosition.x;
      const dz = player.position.z - maze.chestPosition.z;
      const inRadius = dx * dx + dz * dz < CHEST_PICKUP_RADIUS * CHEST_PICKUP_RADIUS;
      if (inRadius && !chestAwaitingExit) {
        openItemPrompt({
          icon: '⚔️',
          title: 'Espada de RAM',
          desc: 'Um pente de memória RAM afiado como uma espada. Equipar agora?',
          useLabel: '⚔️ Equipar',
          onUse: () => {
            swordCollected = true;
            maze.openChest();
            player.equipSword();
            audio.playPickup();
            ui.showToast('Espada de RAM equipada!', 2400);
          },
          onSkip: () => { chestAwaitingExit = true; },
        });
      } else if (!inRadius && chestAwaitingExit) {
        chestAwaitingExit = false;
      }
    }

    // energy-drink supply crates scattered through the maze's dead ends —
    // walking up to one just opens a prompt; it's not consumed until she
    // chooses to drink it.
    for (const drink of maze.energyDrinks) {
      if (drink.collected) continue;
      const dx = player.position.x - drink.position.x;
      const dz = player.position.z - drink.position.z;
      const inRadius = dx * dx + dz * dz < ENERGY_DRINK_PICKUP_RADIUS * ENERGY_DRINK_PICKUP_RADIUS;
      if (inRadius && !drink.awaitingExit) {
        openItemPrompt({
          icon: '🥤',
          title: 'Energético Baly Nuclear',
          desc: 'Uma lata gelada de Baly Nuclear. Bebe agora e recupera todo o seu HP.',
          useLabel: '✨ Usar',
          onUse: () => {
            maze.collectEnergyDrink(drink);
            playerStats.hp = playerStats.maxHp;
            ui.setPlayerHudHp(playerStats.hp, playerStats.maxHp);
            audio.playPickup();
            ui.showToast('HP totalmente recuperado!', 2000);
          },
          onSkip: () => { drink.awaitingExit = true; },
        });
        break;
      } else if (!inRadius && drink.awaitingExit) {
        drink.awaitingExit = false;
      }
    }

    // room / door triggers
    const roomId = maze.roomAt(player.position.x, player.position.z);
    if (roomId !== null && !defeatedRooms.has(roomId)) {
      enterBattle(roomId);
    } else if (defeatedRooms.size >= TOTAL_GAPS && !storyTriggered && maze.isInFinalRoom(player.position.x, player.position.z)) {
      enterStory();
    }
  } else {
    input.consumeYawDelta(); // discard drag while not in explore mode
  }

  battle.update(dt);
  maze.update(dt);

  // camera target
  let targetPos; let targetLookAt;
  if (state === 'battle') {
    targetPos = battle.stagePosition;
    targetLookAt = battle.stageLookAt;
  } else {
    const fx = Math.sin(cameraYaw);
    const fz = Math.cos(cameraYaw);
    targetPos = _camPosScratch.set(
      player.position.x - fx * CAMERA_DISTANCE,
      CAMERA_HEIGHT,
      player.position.z - fz * CAMERA_DISTANCE,
    );
    targetLookAt = _camLookScratch.set(player.position.x, CAMERA_LOOK_HEIGHT, player.position.z);
  }

  if (!camInitialized) {
    camPos.copy(targetPos);
    camLookAt.copy(targetLookAt);
    camInitialized = true;
  } else {
    const t = 1 - Math.exp(-CAMERA_DAMPING * dt);
    camPos.lerp(targetPos, t);
    camLookAt.lerp(targetLookAt, t);
  }
  camera.position.copy(camPos);
  camera.lookAt(camLookAt);

  if (ui.minimapVisible) {
    ui.drawMinimap(player.position.x, player.position.z, player.facing, maze.doorOpen);
  }

  renderer.render(scene, camera);
}

frame();
