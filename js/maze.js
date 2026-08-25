import * as THREE from 'three';
import {
  buildGrid, WALL, FLOOR, CELL_SIZE, GRID_COLS, GRID_ROWS,
  ROOM_DEFS, HUB, FINAL_ROOM, FINAL_DOOR_CELL, PLAYER_SPAWN, CHEST_CELL,
  gridToWorld, worldToGrid,
} from './mazeData.js';
import { WALL_HEIGHT } from './config.js';
import {
  makeStoneWallTexture, makeStoneWallBumpMap, makeFloorTexture, makeFloorBumpMap,
  makeWoodTexture, makeRugTexture, makeBannerTexture, makePaintingTexture, makeStainedGlassTexture,
} from './textures.js';
import {
  buildTable, buildChair, buildBench, buildBookshelf, buildBarrel,
  buildCandelabra, buildGoblet, buildEnergyCan, buildSupplyBarrel,
  buildWallShield, buildWallPainting, buildStatue, buildPottedPlant,
} from './furniture.js';

// Palette + a signature color per Gap room, used for its banner. Purely
// decorative — chosen to loosely echo each monster's own color scheme.
const ROOM_PALETTE = {
  1: ['#b8bec7', '#3a3d42'],
  2: ['#2f6b3a', '#dff0d8'],
  3: ['#1f3a63', '#8fc1ff'],
  4: ['#8a2a12', '#ffb877'],
  5: ['#2454a8', '#9ec2ff'],
  6: ['#3a2159', '#ffd23f'],
};

const dummy = new THREE.Object3D();

function isFloor(grid, x, z) {
  if (x < 0 || x >= GRID_COLS || z < 0 || z >= GRID_ROWS) return false;
  return grid[z][x] === FLOOR;
}

function hasFloorNeighbor(grid, x, z) {
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dz === 0) continue;
      if (isFloor(grid, x + dx, z + dz)) return true;
    }
  }
  return false;
}

export class Maze {
  constructor(scene) {
    this.scene = scene;
    this.grid = buildGrid();
    this.doorOpen = false;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.stoneTex = makeStoneWallTexture();
    this.stoneBumpTex = makeStoneWallBumpMap();
    this.floorTex = makeFloorTexture();
    this.floorBumpTex = makeFloorBumpMap();
    this.woodTex = makeWoodTexture();
    this.paintingTexVariants = [makePaintingTexture(), makePaintingTexture(), makePaintingTexture()];
    this.energyDrinks = [];

    this._buildFloor();
    this._buildWalls();
    this._buildTorches();
    this._buildWallOrnaments();
    this._buildWindows();
    this._buildDoorGate();
    this._buildRoomMarkers();
    this._buildChest();
    this._buildRoomBanners();
    this._buildHubDecor();
    this._buildFinalRoomDecor();
    this._buildCeilings();
    this._buildDeadEndDecor();
    this._buildJunctionDecor();
    this._buildFloorRunners();
  }

  /** Wall cells that face exactly one floor direction — clean mounting spots
   * for torches, paintings, shields, and windows. Computed once and split
   * into interior (corridor) vs. true outer-boundary faces. */
  _wallFaceCandidates() {
    if (this._wallFaceCache) return this._wallFaceCache;
    const candidates = [];
    for (const [x, z] of this.wallCells) {
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const floorDirs = dirs.filter(([dx, dz]) => isFloor(this.grid, x + dx, z + dz));
      if (floorDirs.length === 1) candidates.push({ x, z, dir: floorDirs[0] });
    }
    this._wallFaceCache = candidates;
    return candidates;
  }

  _isPerimeterCell(x, z) {
    return x === 0 || x === GRID_COLS - 1 || z === 0 || z === GRID_ROWS - 1;
  }

  _buildFloor() {
    const floorCells = [];
    for (let z = 0; z < GRID_ROWS; z++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (this.grid[z][x] === FLOOR) floorCells.push([x, z]);
      }
    }
    const geo = new THREE.BoxGeometry(CELL_SIZE, 0.2, CELL_SIZE);
    const mat = new THREE.MeshStandardMaterial({
      map: this.floorTex, bumpMap: this.floorBumpTex, bumpScale: 0.35, color: 0xf0f0f0, roughness: 0.85,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, floorCells.length);
    floorCells.forEach(([x, z], i) => {
      const { x: wx, z: wz } = gridToWorld(x, z);
      dummy.position.set(wx, -0.1, wz);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    this.group.add(mesh);

    // A slightly darker inset tile every few cells for visual variety, cheap.
    const accentCells = floorCells.filter(([x, z]) => (x + z) % 5 === 0);
    if (accentCells.length) {
      const ageo = new THREE.BoxGeometry(CELL_SIZE * 0.7, 0.05, CELL_SIZE * 0.7);
      const amat = new THREE.MeshStandardMaterial({ color: 0x453f45, roughness: 0.95 });
      const amesh = new THREE.InstancedMesh(ageo, amat, accentCells.length);
      accentCells.forEach(([x, z], i) => {
        const { x: wx, z: wz } = gridToWorld(x, z);
        dummy.position.set(wx, 0.001, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        amesh.setMatrixAt(i, dummy.matrix);
      });
      amesh.instanceMatrix.needsUpdate = true;
      this.group.add(amesh);
    }
  }

  _buildWalls() {
    const wallCells = [];
    for (let z = 0; z < GRID_ROWS; z++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (this.grid[z][x] === WALL && hasFloorNeighbor(this.grid, x, z)) {
          wallCells.push([x, z]);
        }
      }
    }
    this.wallCellSet = new Set(wallCells.map(([x, z]) => `${x},${z}`));

    const geo = new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, CELL_SIZE);
    const mat = new THREE.MeshStandardMaterial({
      map: this.stoneTex, bumpMap: this.stoneBumpTex, bumpScale: 0.5, color: 0xededed, roughness: 0.82,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, wallCells.length);
    wallCells.forEach(([x, z], i) => {
      const { x: wx, z: wz } = gridToWorld(x, z);
      dummy.position.set(wx, WALL_HEIGHT / 2, wz);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    this.group.add(mesh);
    this.wallCells = wallCells;
  }

  _buildTorches() {
    // Interior (non-perimeter) wall faces only — the outer boundary is
    // reserved for stained-glass windows in _buildWindows.
    const candidates = this._wallFaceCandidates().filter((c) => !this._isPerimeterCell(c.x, c.z));
    let lightsUsed = 0;
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xffa23a, emissive: 0xff6a00, emissiveIntensity: 1.7, roughness: 0.4 });
    const holderMat = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.8 });
    candidates.forEach((c, idx) => {
      if (idx % 6 !== 0) return; // sparse placement
      const { x: wx, z: wz } = gridToWorld(c.x, c.z);
      const faceX = wx + c.dir[0] * (CELL_SIZE / 2 - 0.15);
      const faceZ = wz + c.dir[1] * (CELL_SIZE / 2 - 0.15);

      const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6), holderMat);
      holder.position.set(faceX, 2.4, faceZ);
      this.group.add(holder);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 8), flameMat);
      flame.position.set(faceX, 2.75, faceZ);
      this.group.add(flame);

      if (lightsUsed < 14 && idx % 14 === 0) {
        const light = new THREE.PointLight(0xff9a44, 9, 14, 2);
        light.position.set(faceX, 2.6, faceZ);
        this.group.add(light);
        lightsUsed++;
      }
    });
  }

  /** Paintings, wall-mounted shields, and potted plants sprinkled along
   * interior corridor walls — denser than torches so corridors don't read
   * as bare stone the whole way through. */
  _buildWallOrnaments() {
    const candidates = this._wallFaceCandidates().filter((c) => !this._isPerimeterCell(c.x, c.z));
    const shieldPalette = [0x8a2a12, 0x1f3a63, 0x3a2159, 0x2f6b3a];
    let paintingCount = 0;
    let shieldCount = 0;
    let plantCount = 0;

    candidates.forEach((c, idx) => {
      const mod = idx % 6;
      if (mod !== 2 && mod !== 4) return;
      const { x: wx, z: wz } = gridToWorld(c.x, c.z);
      const faceX = wx + c.dir[0] * (CELL_SIZE / 2 - 0.06);
      const faceZ = wz + c.dir[1] * (CELL_SIZE / 2 - 0.06);
      const yaw = Math.atan2(-c.dir[0], -c.dir[1]);

      if (mod === 2 && paintingCount < 28) {
        const tex = this.paintingTexVariants[paintingCount % this.paintingTexVariants.length];
        const painting = buildWallPainting(tex);
        painting.position.set(faceX, 2.3, faceZ);
        painting.rotation.y = yaw;
        this.group.add(painting);
        paintingCount++;
      } else if (mod === 4 && idx % 12 === 4 && shieldCount < 16) {
        const shield = buildWallShield(shieldPalette[shieldCount % shieldPalette.length]);
        shield.position.set(faceX, 2.05, faceZ);
        shield.rotation.y = yaw;
        this.group.add(shield);
        shieldCount++;
      } else if (mod === 4 && plantCount < 18) {
        const plant = buildPottedPlant();
        plant.position.set(wx + c.dir[0] * (CELL_SIZE / 2 - 0.45), 0, wz + c.dir[1] * (CELL_SIZE / 2 - 0.45));
        this.group.add(plant);
        plantCount++;
      }
    });
  }

  /** Stained-glass windows on the maze's true outer boundary walls. */
  _buildWindows() {
    const perimeter = this._wallFaceCandidates().filter((c) => this._isPerimeterCell(c.x, c.z));
    if (!perimeter.length) return;
    const glassTex = makeStainedGlassTexture();
    const mat = new THREE.MeshStandardMaterial({
      map: glassTex, emissive: 0xffffff, emissiveMap: glassTex, emissiveIntensity: 0.55,
      roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide,
    });
    let count = 0;
    perimeter.forEach((c, idx) => {
      if (idx % 3 !== 0 || count >= 12) return;
      const { x: wx, z: wz } = gridToWorld(c.x, c.z);
      const faceX = wx + c.dir[0] * (CELL_SIZE / 2 - 0.04);
      const faceZ = wz + c.dir[1] * (CELL_SIZE / 2 - 0.04);
      const window = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.0), mat);
      window.position.set(faceX, 2.6, faceZ);
      window.rotation.y = Math.atan2(-c.dir[0], -c.dir[1]);
      this.group.add(window);
      count++;
    });
  }

  /** Stone ceilings over the hub and final room, for a sense of enclosure
   * and grandeur in the two biggest spaces. Kept well above the explore
   * camera's fixed height (~4.5) so it never clips through — reads as a
   * tall vaulted hall rising above the surrounding corridor walls. */
  _buildCeilings() {
    const ceilingY = WALL_HEIGHT + 3.5;
    const mat = new THREE.MeshStandardMaterial({
      map: this.stoneTex, bumpMap: this.stoneBumpTex, bumpScale: 0.4, color: 0xcfcfcf, roughness: 0.9, side: THREE.DoubleSide,
    });
    for (const room of [HUB, FINAL_ROOM]) {
      const { x: cwx, z: cwz } = gridToWorld(room.cx, room.cz);
      const size = room.w * CELL_SIZE;
      const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.set(cwx, ceilingY, cwz);
      this.group.add(ceiling);

      // stub walls up to the ceiling so there's no visible gap above the
      // normal corridor-height walls when looking up inside these rooms
      const fillMat = new THREE.MeshStandardMaterial({
        map: this.stoneTex, bumpMap: this.stoneBumpTex, bumpScale: 0.4, color: 0xededed, roughness: 0.85,
      });
      const half = size / 2;
      const fillHeight = ceilingY - WALL_HEIGHT;
      const fillY = WALL_HEIGHT + fillHeight / 2;
      const north = new THREE.Mesh(new THREE.BoxGeometry(size + CELL_SIZE, fillHeight, CELL_SIZE), fillMat);
      north.position.set(cwx, fillY, cwz - half - CELL_SIZE / 2);
      this.group.add(north);
      const south = north.clone();
      south.position.set(cwx, fillY, cwz + half + CELL_SIZE / 2);
      this.group.add(south);
      const east = new THREE.Mesh(new THREE.BoxGeometry(CELL_SIZE, fillHeight, size + CELL_SIZE), fillMat);
      east.position.set(cwx + half + CELL_SIZE / 2, fillY, cwz);
      this.group.add(east);
      const west = east.clone();
      west.position.set(cwx - half - CELL_SIZE / 2, fillY, cwz);
      this.group.add(west);
    }
  }

  /** Rug runners laid along straight, room-free corridor stretches. */
  _buildFloorRunners() {
    const straights = [];
    for (let z = 0; z < GRID_ROWS; z++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (this.grid[z][x] !== FLOOR || this._isInsideAnyRoom(x, z)) continue;
        const n = isFloor(this.grid, x, z - 1);
        const s = isFloor(this.grid, x, z + 1);
        const e = isFloor(this.grid, x + 1, z);
        const w = isFloor(this.grid, x - 1, z);
        if (n && s && !e && !w) straights.push({ x, z, vertical: true });
        else if (e && w && !n && !s) straights.push({ x, z, vertical: false });
      }
    }
    if (!straights.length) return;
    const runnerTex = makeRugTexture('#5a3a2a', '#c9a227');
    const mat = new THREE.MeshStandardMaterial({ map: runnerTex, roughness: 0.85 });
    let count = 0;
    straights.forEach((s, idx) => {
      if (idx % 5 !== 0 || count >= 40) return;
      const { x: wx, z: wz } = gridToWorld(s.x, s.z);
      const rug = new THREE.Mesh(
        new THREE.BoxGeometry(s.vertical ? 2.2 : 3.6, 0.04, s.vertical ? 3.6 : 2.2),
        mat,
      );
      rug.position.set(wx, 0.025, wz);
      this.group.add(rug);
      count++;
    });
  }

  _buildDoorGate() {
    const { x: wx, z: wz } = gridToWorld(FINAL_DOOR_CELL.x, FINAL_DOOR_CELL.z);
    const geo = new THREE.BoxGeometry(CELL_SIZE * 0.9, WALL_HEIGHT * 0.85, 0.4);
    const mat = new THREE.MeshStandardMaterial({ color: 0xc9a227, emissive: 0x5c4a10, roughness: 0.35, metalness: 0.5 });
    const gate = new THREE.Mesh(geo, mat);
    gate.position.set(wx, (WALL_HEIGHT * 0.85) / 2, wz);
    this.group.add(gate);
    this.gateMesh = gate;
    this.gateBaseY = gate.position.y;
    this.gateCellKey = `${FINAL_DOOR_CELL.x},${FINAL_DOOR_CELL.z}`;
  }

  _buildRoomMarkers() {
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x8a6a10, roughness: 0.5, transparent: true, opacity: 0.85 });
    this.roomMarkers = {};
    for (const room of ROOM_DEFS) {
      const { x: wx, z: wz } = gridToWorld(room.cx, room.cz);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 8, 24), ringMat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(wx, 0.05, wz);
      this.group.add(ring);
      this.roomMarkers[room.id] = ring;
    }
  }

  _buildChest() {
    const { x: wx, z: wz } = gridToWorld(CHEST_CELL.x, CHEST_CELL.z);
    this.chestPosition = { x: wx, z: wz };
    this.chestOpened = false;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.6, roughness: 0.35 });

    const chestGroup = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), woodMat);
    base.position.y = 0.25;
    chestGroup.add(base);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.08, 0.64), trimMat);
    band.position.y = 0.28;
    chestGroup.add(band);

    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, 0.5, -0.3);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.6), woodMat);
    lid.position.set(0, 0.1, 0.3);
    lidGroup.add(lid);
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05), trimMat);
    latch.position.set(0, 0.0, 0.6);
    lidGroup.add(latch);
    chestGroup.add(lidGroup);

    chestGroup.position.set(wx, 0, wz);
    this.group.add(chestGroup);
    this.chestLidGroup = lidGroup;
  }

  openChest() {
    if (this.chestOpened) return;
    this.chestOpened = true;
    const duration = 0.6;
    let t = 0;
    const anim = () => {
      t += 1 / 60;
      const p = Math.min(1, t / duration);
      this.chestLidGroup.rotation.x = -p * Math.PI * 0.65;
      if (p < 1) requestAnimationFrame(anim);
    };
    anim();
  }

  /** Mounts up to `maxCount` cloth banners on the real wall segments around a
   * room's perimeter (skipping whichever side is actually the doorway). */
  _mountBannersOnRoom(room, color, accent, maxCount = 2) {
    const tex = makeBannerTexture(color, accent);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, side: THREE.DoubleSide });
    const half = Math.floor(room.w / 2);
    const sides = [{ dx: 0, dz: -1 }, { dx: 0, dz: 1 }, { dx: -1, dz: 0 }, { dx: 1, dz: 0 }];
    let placed = 0;
    for (const s of sides) {
      if (placed >= maxCount) break;
      const wallX = room.cx + s.dx * half;
      const wallZ = room.cz + s.dz * half;
      if (!this.grid[wallZ] || this.grid[wallZ][wallX] !== WALL) continue;
      const { x: wx, z: wz } = gridToWorld(wallX, wallZ);
      const faceX = wx - s.dx * (CELL_SIZE / 2 - 0.05);
      const faceZ = wz - s.dz * (CELL_SIZE / 2 - 0.05);
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.7), mat);
      banner.position.set(faceX, 2.4, faceZ);
      banner.rotation.y = Math.atan2(-s.dx, -s.dz);
      this.group.add(banner);
      placed++;
    }
  }

  _buildRoomBanners() {
    for (const room of ROOM_DEFS) {
      const [color, accent] = ROOM_PALETTE[room.id];
      this._mountBannersOnRoom(room, color, accent, 1);
    }
  }

  _buildHubDecor() {
    const { x: cwx, z: cwz } = gridToWorld(HUB.cx, HUB.cz);
    const halfWorld = Math.floor(HUB.w / 2) * CELL_SIZE;

    const rugTex = makeRugTexture('#5b2c8a', '#ffd23f');
    const rugMat = new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.85 });
    const rug = new THREE.Mesh(new THREE.BoxGeometry(halfWorld * 0.9, 0.05, halfWorld * 0.9), rugMat);
    rug.position.set(cwx, 0.03, cwz);
    this.group.add(rug);

    const pillarMat = new THREE.MeshStandardMaterial({
      map: this.stoneTex, bumpMap: this.stoneBumpTex, bumpScale: 0.4, color: 0xededed, roughness: 0.8,
    });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xb8aa8f, roughness: 0.6 });
    const inset = halfWorld - 4.5;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const px = cwx + sx * inset;
        const pz = cwz + sz * inset;
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, WALL_HEIGHT - 0.5, 10), pillarMat);
        shaft.position.set(px, (WALL_HEIGHT - 0.5) / 2, pz);
        this.group.add(shaft);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.3, 10), capMat);
        base.position.set(px, 0.15, pz);
        this.group.add(base);
        const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.65, 0.35, 10), capMat);
        capital.position.set(px, WALL_HEIGHT - 0.33, pz);
        this.group.add(capital);
      }
    }

    const chainMat = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.6 });
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), chainMat);
    chain.position.set(cwx, WALL_HEIGHT - 0.45, cwz);
    this.group.add(chain);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.06, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.7, roughness: 0.3 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(cwx, WALL_HEIGHT - 0.9, cwz);
    this.group.add(ring);
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xffa23a, emissive: 0xff6a00, emissiveIntensity: 1.6, roughness: 0.4 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const candle = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 8), flameMat);
      candle.position.set(cwx + Math.cos(a) * 0.7, WALL_HEIGHT - 0.78, cwz + Math.sin(a) * 0.7);
      this.group.add(candle);
    }

    // resting nooks: a table with chairs on each side of the hub, clear of the pillars
    for (const sx of [-1, 1]) {
      const tx = cwx + sx * 9;
      const tz = cwz;
      const table = buildTable(this.woodTex);
      table.position.set(tx, 0, tz);
      table.rotation.y = Math.PI / 2;
      this.group.add(table);
      const chairOffsets = [[0, -0.85], [0, 0.85], [-1.05, 0]];
      for (const [ox, oz] of chairOffsets) {
        const chair = buildChair(this.woodTex);
        chair.position.set(tx + ox, 0, tz + oz);
        chair.rotation.y = Math.atan2(-ox, -oz);
        this.group.add(chair);
      }
    }

    // bookshelves flanking the north (door-side) wall, clear of the banner
    for (const sx of [-1, 1]) {
      const shelf = buildBookshelf(this.woodTex);
      shelf.position.set(cwx + sx * 5, 0, cwz - (halfWorld - 0.3));
      this.group.add(shelf);
    }

    this._mountBannersOnRoom(HUB, '#5b2c8a', '#ffd23f', 4);
  }

  _buildFinalRoomDecor() {
    const { x: cwx, z: cwz } = gridToWorld(FINAL_ROOM.cx, FINAL_ROOM.cz);
    const halfWorld = Math.floor(FINAL_ROOM.w / 2) * CELL_SIZE;
    const doorWorld = gridToWorld(FINAL_DOOR_CELL.x, FINAL_DOOR_CELL.z);
    const ddx = doorWorld.x - cwx;
    const ddz = doorWorld.z - cwz;
    const len = Math.hypot(ddx, ddz) || 1;
    const dirX = ddx / len;
    const dirZ = ddz / len;

    const throneX = cwx - dirX * (halfWorld - 2.2);
    const throneZ = cwz - dirZ * (halfWorld - 2.2);
    const throneYaw = Math.atan2(dirX, dirZ);

    const woodMat = new THREE.MeshStandardMaterial({ map: this.woodTex, color: 0xffffff, roughness: 0.7 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: 0.6, roughness: 0.3 });
    const throneGroup = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 1.1), woodMat);
    seat.position.y = 0.7;
    throneGroup.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.6, 0.25), woodMat);
    back.position.set(0, 1.5, -0.42);
    throneGroup.add(back);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 1.0), woodMat);
      arm.position.set(side * 0.65, 0.95, 0);
      throneGroup.add(arm);
    }
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 8, 16, Math.PI), goldMat);
    crown.rotation.x = Math.PI;
    crown.position.set(0, 2.35, -0.42);
    throneGroup.add(crown);
    throneGroup.position.set(throneX, 0, throneZ);
    throneGroup.rotation.y = throneYaw;
    this.group.add(throneGroup);

    const carpetLen = Math.max(1, Math.hypot(throneX - doorWorld.x, throneZ - doorWorld.z));
    const carpet = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.05, carpetLen),
      new THREE.MeshStandardMaterial({ color: 0xb0202f, roughness: 0.8 }),
    );
    carpet.position.set((throneX + doorWorld.x) / 2, 0.03, (throneZ + doorWorld.z) / 2);
    carpet.rotation.y = throneYaw;
    this.group.add(carpet);

    // a small side table with a goblet, and standing candelabra flanking the throne
    const perpX = -dirZ;
    const perpZ = dirX;
    const sideTable = buildTable(this.woodTex);
    sideTable.scale.set(0.5, 0.55, 0.5);
    const sideTableX = throneX + perpX * 1.6 - dirX * 0.6;
    const sideTableZ = throneZ + perpZ * 1.6 - dirZ * 0.6;
    sideTable.position.set(sideTableX, 0, sideTableZ);
    this.group.add(sideTable);
    const goblet = buildGoblet();
    goblet.position.set(sideTableX, 0.75 * 0.55, sideTableZ);
    this.group.add(goblet);

    for (const side of [-1, 1]) {
      const candel = buildCandelabra();
      candel.position.set(throneX + perpX * 1.7 * side, 0, throneZ + perpZ * 1.7 * side);
      this.group.add(candel);
    }

    this._mountBannersOnRoom(FINAL_ROOM, '#3a2159', '#ffd23f', 2);
  }

  /** True if the fine-grid cell falls inside the hub, the final room, or any
   * Gap room — those get their own hand-placed decor and battle staging, so
   * generic dead-end/junction dressing must steer clear of them. */
  _isInsideAnyRoom(x, z) {
    for (const room of [HUB, FINAL_ROOM, ...ROOM_DEFS]) {
      const half = Math.floor(room.w / 2);
      if (Math.abs(x - room.cx) <= half && Math.abs(z - room.cz) <= half) return true;
    }
    return false;
  }

  /** Classifies background-maze cells into dead ends (1 floor neighbor) and
   * junctions (3+ floor neighbors), then dresses the dead ends with a mix of
   * energy-drink supply crates, storage crates, benches and potted plants —
   * and reserves junctions for `_buildJunctionDecor`. Gap rooms never get
   * these (monsters only live in the 6 dedicated rooms), matching "pontos
   * sem monstros". */
  _buildDeadEndDecor() {
    const deadEnds = [];
    const junctions = [];
    for (let z = 0; z < GRID_ROWS; z++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (this.grid[z][x] !== FLOOR) continue;
        if (this._isInsideAnyRoom(x, z)) continue;
        let floorNeighbors = 0;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (isFloor(this.grid, x + dx, z + dz)) floorNeighbors++;
        }
        if (floorNeighbors === 1) deadEnds.push([x, z]);
        else if (floorNeighbors >= 3) junctions.push([x, z]);
      }
    }
    this._junctions = junctions;

    const woodMat = new THREE.MeshStandardMaterial({ map: this.woodTex, color: 0xffffff, roughness: 0.8 });
    let energyCount = 0;
    let crateCount = 0;
    let benchCount = 0;
    let plantCount = 0;

    deadEnds.forEach(([x, z], i) => {
      const { x: wx, z: wz } = gridToWorld(x, z);
      const bucket = i % 4;
      if (bucket === 0 && energyCount < 8) {
        this._placeEnergyDrink(wx, wz);
        energyCount++;
      } else if (bucket === 1 && crateCount < 14) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), woodMat);
        crate.position.set(wx + (Math.random() - 0.5) * 0.5, 0.35, wz + (Math.random() - 0.5) * 0.5);
        crate.rotation.y = Math.random() * Math.PI;
        this.group.add(crate);
        crateCount++;
      } else if (bucket === 2 && benchCount < 12) {
        const bench = buildBench(this.woodTex);
        bench.position.set(wx, 0, wz);
        bench.rotation.y = Math.random() * Math.PI;
        this.group.add(bench);
        benchCount++;
      } else if (bucket === 3 && plantCount < 12) {
        const plant = buildPottedPlant();
        plant.position.set(wx + (Math.random() - 0.5) * 0.6, 0, wz + (Math.random() - 0.5) * 0.6);
        this.group.add(plant);
        plantCount++;
      }
    });
  }

  /** Barrels and statues tucked into corridor intersections, so straight
   * stretches of the maze don't feel completely bare either. */
  _buildJunctionDecor() {
    let barrelCount = 0;
    let statueCount = 0;
    (this._junctions || []).forEach(([x, z], i) => {
      if (i % 6 !== 0) return;
      const { x: wx, z: wz } = gridToWorld(x, z);
      if (i % 12 === 0 && statueCount < 10) {
        const statue = buildStatue();
        statue.position.set(wx + 1.15, 0, wz + 1.15);
        this.group.add(statue);
        statueCount++;
      } else if (barrelCount < 14) {
        const barrel = buildBarrel(this.woodTex);
        barrel.position.set(wx + 1.15, 0, wz + 1.15);
        this.group.add(barrel);
        barrelCount++;
      }
    });
  }

  _placeEnergyDrink(wx, wz) {
    const barrel = buildSupplyBarrel(this.woodTex);
    barrel.position.set(wx, 0, wz);
    this.group.add(barrel);

    const can = buildEnergyCan();
    can.position.set(wx, 0.85, wz);
    can.userData.bobPhase = Math.random() * Math.PI * 2;
    this.group.add(can);

    this.energyDrinks.push({
      position: { x: wx, z: wz }, barrelGroup: barrel, canMesh: can, collected: false,
    });
  }

  /** Animates the uncollected energy-drink cans (gentle bob + spin). Call once per frame. */
  update(dt) {
    const t = performance.now() * 0.002;
    for (const drink of this.energyDrinks) {
      if (drink.collected) continue;
      drink.canMesh.rotation.y += dt * 1.5;
      drink.canMesh.position.y = 0.85 + Math.sin(t + drink.canMesh.userData.bobPhase) * 0.08;
    }
  }

  collectEnergyDrink(drink) {
    if (drink.collected) return;
    drink.collected = true;
    const mesh = drink.canMesh;
    const startY = mesh.position.y;
    let t = 0;
    const duration = 0.5;
    const anim = () => {
      t += 1 / 60;
      const p = Math.min(1, t / duration);
      mesh.position.y = startY + p * 1.2;
      mesh.scale.setScalar(Math.max(0, 1 - p));
      if (p < 1) requestAnimationFrame(anim);
      else mesh.visible = false;
    };
    anim();
  }

  openFinalDoor() {
    if (this.doorOpen) return;
    this.doorOpen = true;
    const startY = this.gateMesh.position.y;
    const targetY = startY - WALL_HEIGHT * 0.9;
    const duration = 1.4;
    let t = 0;
    const anim = () => {
      t += 1 / 60;
      const p = Math.min(1, t / duration);
      this.gateMesh.position.y = startY + (targetY - startY) * p;
      if (p < 1) requestAnimationFrame(anim);
    };
    anim();
  }

  markRoomCleared(roomId) {
    const marker = this.roomMarkers[roomId];
    if (marker) {
      marker.material.color.set(0x4caf50);
      marker.material.emissive.set(0x1b5e20);
    }
  }

  /** Circle-vs-grid collision resolution. Mutates `pos` (THREE.Vector3) in place. */
  resolveCollision(pos, radius) {
    const g = worldToGrid(pos.x, pos.z);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = g.x + dx;
        const cz = g.z + dz;
        if (cx < 0 || cx >= GRID_COLS || cz < 0 || cz >= GRID_ROWS) continue;
        const key = `${cx},${cz}`;
        const isWall = this.grid[cz][cx] === WALL;
        const isClosedGate = key === this.gateCellKey && !this.doorOpen;
        if (!isWall && !isClosedGate) continue;

        // Closed gate fully blocks its cell (like a wall) so the player can't
        // strafe around the visually-thin door slab within the open corridor cell.
        const { x: cwx, z: cwz } = gridToWorld(cx, cz);
        const halfExtent = CELL_SIZE / 2;
        const minX = cwx - halfExtent;
        const maxX = cwx + halfExtent;
        const minZ = cwz - halfExtent;
        const maxZ = cwz + halfExtent;

        const closestX = Math.max(minX, Math.min(pos.x, maxX));
        const closestZ = Math.max(minZ, Math.min(pos.z, maxZ));
        const dxp = pos.x - closestX;
        const dzp = pos.z - closestZ;
        const distSq = dxp * dxp + dzp * dzp;
        if (distSq < radius * radius && distSq > 1e-9) {
          const dist = Math.sqrt(distSq);
          const push = (radius - dist) / dist;
          pos.x += dxp * push;
          pos.z += dzp * push;
        } else if (distSq <= 1e-9) {
          // center exactly inside; push out along dominant axis
          pos.x += radius;
        }
      }
    }
  }

  /** Returns the room id the given world position is inside, or null. */
  roomAt(worldX, worldZ) {
    const g = worldToGrid(worldX, worldZ);
    for (const room of ROOM_DEFS) {
      const x0 = room.cx - Math.floor(room.w / 2);
      const x1 = x0 + room.w - 1;
      const z0 = room.cz - Math.floor(room.h / 2);
      const z1 = z0 + room.h - 1;
      if (g.x >= x0 && g.x <= x1 && g.z >= z0 && g.z <= z1) return room.id;
    }
    return null;
  }

  isInFinalRoom(worldX, worldZ) {
    const g = worldToGrid(worldX, worldZ);
    const x0 = FINAL_ROOM.cx - Math.floor(FINAL_ROOM.w / 2);
    const x1 = x0 + FINAL_ROOM.w - 1;
    const z0 = FINAL_ROOM.cz - Math.floor(FINAL_ROOM.h / 2);
    const z1 = z0 + FINAL_ROOM.h - 1;
    return g.x >= x0 && g.x <= x1 && g.z >= z0 && g.z <= z1;
  }

  getRoomWorldCenter(roomId) {
    const room = ROOM_DEFS.find((r) => r.id === roomId);
    if (!room) return null;
    return gridToWorld(room.cx, room.cz);
  }

  getSpawnWorld() {
    return gridToWorld(PLAYER_SPAWN.x, PLAYER_SPAWN.z);
  }

  getHubWorldCenter() {
    return gridToWorld(HUB.cx, HUB.cz);
  }

  getFinalRoomWorldCenter() {
    return gridToWorld(FINAL_ROOM.cx, FINAL_ROOM.cz);
  }
}
