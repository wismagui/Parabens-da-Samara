import { GRID_COLS, GRID_ROWS, WALL, ROOM_DEFS, HUB, FINAL_ROOM, FINAL_DOOR_CELL, gridToWorld } from './mazeData.js';
import { TOTAL_GAPS } from './config.js';

const MINIMAP_CELL_PX = 5;

export class UI {
  constructor() {
    this.el = {
      startScreen: document.getElementById('start-screen'),
      orientationWarning: document.getElementById('orientation-warning'),
      hud: document.getElementById('hud'),
      gapCounter: document.getElementById('gap-counter'),
      playerHudHpFill: document.getElementById('player-hud-hp-fill'),
      playerHudHpLabel: document.getElementById('player-hud-hp-label'),
      minimapToggle: document.getElementById('minimap-toggle'),
      minimapPanel: document.getElementById('minimap-panel'),
      minimapCanvas: document.getElementById('minimap-canvas'),
      toast: document.getElementById('toast'),
      battleUI: document.getElementById('battle-ui'),
      monsterName: document.getElementById('monster-name'),
      monsterHpFill: document.getElementById('monster-hp-fill'),
      playerHpFill: document.getElementById('player-hp-fill'),
      battleLog: document.getElementById('battle-log'),
      btnAttack: document.getElementById('btn-attack'),
      btnDefend: document.getElementById('btn-defend'),
      btnSpecial: document.getElementById('btn-special'),
      btnFlee: document.getElementById('btn-flee'),
      storyBox: document.getElementById('story-box'),
      storyText: document.getElementById('story-text'),
      storyHint: document.getElementById('story-hint'),
      itemPrompt: document.getElementById('item-prompt'),
      itemPromptIcon: document.getElementById('item-prompt-icon'),
      itemPromptTitle: document.getElementById('item-prompt-title'),
      itemPromptDesc: document.getElementById('item-prompt-desc'),
      itemPromptUse: document.getElementById('item-prompt-use'),
      itemPromptSkip: document.getElementById('item-prompt-skip'),
    };

    this._minimapVisible = false;
    this._toastTimer = null;
    this._defeatedRooms = new Set();

    this.el.minimapToggle.addEventListener('click', () => this.toggleMinimap());
    this._buildMinimapBase();
  }

  // ---------- start / orientation ----------
  showStartScreen(onStart) {
    this.el.startScreen.classList.remove('hidden');
    const handler = () => {
      this.el.startScreen.classList.add('hidden');
      this.el.startScreen.removeEventListener('pointerdown', handler);
      onStart();
    };
    this.el.startScreen.addEventListener('pointerdown', handler);
  }

  setOrientationWarning(show) {
    this.el.orientationWarning.classList.toggle('hidden', !show);
  }

  // ---------- HUD ----------
  setGapCount(n) {
    this.el.gapCounter.textContent = `Gaps vencidos: ${n}/${TOTAL_GAPS}`;
  }

  setPlayerHudHp(hp, maxHp) {
    const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    this.el.playerHudHpFill.style.width = `${pct}%`;
    this.el.playerHudHpLabel.textContent = `${Math.max(0, Math.round(hp))}/${maxHp}`;
  }

  showToast(text, duration = 2200) {
    this.el.toast.textContent = text;
    this.el.toast.classList.remove('hidden');
    this.el.toast.classList.add('show');
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.el.toast.classList.remove('show');
      this._toastTimer = setTimeout(() => this.el.toast.classList.add('hidden'), 300);
    }, duration);
  }

  // ---------- minimap ----------
  toggleMinimap() {
    this._minimapVisible = !this._minimapVisible;
    this.el.minimapPanel.classList.toggle('hidden', !this._minimapVisible);
  }

  get minimapVisible() {
    return this._minimapVisible;
  }

  _buildMinimapBase() {
    const canvas = document.createElement('canvas');
    canvas.width = GRID_COLS * MINIMAP_CELL_PX;
    canvas.height = GRID_ROWS * MINIMAP_CELL_PX;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#120f16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this._baseCanvas = canvas;
    this._baseCtx = ctx;
  }

  primeMinimap(grid) {
    const ctx = this._baseCtx;
    ctx.fillStyle = '#120f16';
    ctx.fillRect(0, 0, this._baseCanvas.width, this._baseCanvas.height);
    ctx.fillStyle = '#8f889a';
    for (let z = 0; z < GRID_ROWS; z++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (grid[z][x] !== WALL) {
          ctx.fillRect(x * MINIMAP_CELL_PX, z * MINIMAP_CELL_PX, MINIMAP_CELL_PX, MINIMAP_CELL_PX);
        }
      }
    }
    // hub tint
    ctx.fillStyle = 'rgba(123,44,191,0.35)';
    ctx.fillRect((HUB.cx - HUB.w / 2) * MINIMAP_CELL_PX, (HUB.cz - HUB.h / 2) * MINIMAP_CELL_PX, HUB.w * MINIMAP_CELL_PX, HUB.h * MINIMAP_CELL_PX);

    const canvas = this.el.minimapCanvas;
    canvas.width = this._baseCanvas.width;
    canvas.height = this._baseCanvas.height;
  }

  markRoomDefeated(roomId) {
    this._defeatedRooms.add(roomId);
  }

  drawMinimap(playerWorldX, playerWorldZ, playerFacing, doorOpen) {
    if (!this._minimapVisible) return;
    const canvas = this.el.minimapCanvas;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this._baseCanvas, 0, 0);

    for (const room of ROOM_DEFS) {
      const px = room.cx * MINIMAP_CELL_PX;
      const pz = room.cz * MINIMAP_CELL_PX;
      ctx.beginPath();
      ctx.arc(px, pz, MINIMAP_CELL_PX * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = this._defeatedRooms.has(room.id) ? '#4caf50' : '#ffd23f';
      ctx.fill();
    }

    // final room / door marker
    const fpx = FINAL_DOOR_CELL.x * MINIMAP_CELL_PX;
    const fpz = FINAL_DOOR_CELL.z * MINIMAP_CELL_PX;
    ctx.beginPath();
    ctx.arc(fpx, fpz, MINIMAP_CELL_PX * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = doorOpen ? '#ffe98a' : '#8a6a10';
    ctx.fill();

    // player marker (arrow)
    const gx = (playerWorldX / 4 + GRID_COLS / 2) * MINIMAP_CELL_PX;
    const gz = (playerWorldZ / 4 + GRID_ROWS / 2) * MINIMAP_CELL_PX;
    ctx.save();
    ctx.translate(gx, gz);
    ctx.rotate(playerFacing);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fillStyle = '#ff5da2';
    ctx.fill();
    ctx.restore();
  }

  // ---------- battle ----------
  showBattleUI() {
    this.el.battleUI.classList.remove('hidden');
    this.el.battleLog.innerHTML = '';
  }

  hideBattleUI() {
    this.el.battleUI.classList.add('hidden');
  }

  setMonsterName(name) {
    this.el.monsterName.textContent = name;
  }

  setHpBars({ playerHp, playerMaxHp, monsterHp, monsterMaxHp }) {
    this.el.playerHpFill.style.width = `${Math.max(0, (playerHp / playerMaxHp) * 100)}%`;
    this.el.monsterHpFill.style.width = `${Math.max(0, (monsterHp / monsterMaxHp) * 100)}%`;
  }

  appendLog(text) {
    const line = document.createElement('div');
    line.className = 'log-line';
    line.textContent = text;
    this.el.battleLog.appendChild(line);
    this.el.battleLog.scrollTop = this.el.battleLog.scrollHeight;
    while (this.el.battleLog.children.length > 4) {
      this.el.battleLog.removeChild(this.el.battleLog.firstChild);
    }
  }

  setActionsEnabled(enabled) {
    for (const btn of [this.el.btnAttack, this.el.btnDefend, this.el.btnSpecial]) {
      btn.disabled = !enabled;
    }
  }

  bindBattleButtons({ onAttack, onDefend, onSpecial }) {
    this.el.btnAttack.addEventListener('click', () => onAttack());
    this.el.btnDefend.addEventListener('click', () => onDefend());
    this.el.btnSpecial.addEventListener('click', () => onSpecial());
  }

  // ---------- story ----------
  showStoryBox() {
    this.el.storyBox.classList.remove('hidden');
    this.el.storyHint.classList.add('hidden');
  }

  hideStoryBox() {
    this.el.storyBox.classList.add('hidden');
  }

  showStoryHint() {
    this.el.storyHint.classList.remove('hidden');
  }

  // ---------- item pickup prompt ----------
  bindItemPrompt({ onUse, onSkip }) {
    this.el.itemPromptUse.addEventListener('click', () => onUse());
    this.el.itemPromptSkip.addEventListener('click', () => onSkip());
  }

  setItemPromptContent(icon, title, desc, useLabel) {
    this.el.itemPromptIcon.textContent = icon;
    this.el.itemPromptTitle.textContent = title;
    this.el.itemPromptDesc.textContent = desc;
    this.el.itemPromptUse.textContent = useLabel;
  }

  showItemPrompt() {
    this.el.itemPrompt.classList.remove('hidden');
  }

  hideItemPrompt() {
    this.el.itemPrompt.classList.add('hidden');
  }
}
