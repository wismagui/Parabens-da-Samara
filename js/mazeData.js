// Castle layout: a real generated labyrinth (recursive-backtracker maze
// algorithm, fixed seed) with the hub, the 6 Gap rooms and the final room
// carved as open pockets and stitched into the maze through deliberate,
// single-point connectors. No Three.js / DOM dependencies here — pure data,
// so it can be reasoned about and verified independently of the renderer.
//
// Coordinate systems:
//  - "maze-cell" coordinates (mx,mz): one cell per node of the labyrinth graph.
//  - "fine" grid coordinates (x,z): the actual WALL/FLOOR grid the renderer
//    walks, related to maze-cell coordinates by fine = maze*2 + 1 (the classic
//    odd/even "cell / wall-between-cells" doubling scheme).

export const CELL_SIZE = 4;
export const WALL = 0;
export const FLOOR = 1;

const MAZE_SEED = 133742;
const MW = 19; // maze-cell columns
const MH = 15; // maze-cell rows
const BRAID_CHANCE = 0.07; // chance to knock an extra loop into the perfect-tree maze

export const GRID_COLS = MW * 2 + 1;
export const GRID_ROWS = MH * 2 + 1;

function mulberry32(seed) {
  let s = seed | 0;
  return function rng() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function key(x, z) { return `${x},${z}`; }
function toFine(mx, mz) { return [mx * 2 + 1, mz * 2 + 1]; }

function buildReservedSet(rooms) {
  const reserved = new Set();
  for (const r of rooms) {
    for (let dz = -r.h; dz <= r.h; dz++) {
      for (let dx = -r.h; dx <= r.h; dx++) {
        reserved.add(key(r.mx + dx, r.mz + dz));
      }
    }
  }
  return reserved;
}

// Randomized depth-first "recursive backtracker" over every maze-cell that
// isn't reserved by a room footprint. Produces a spanning tree (no loops) of
// the background area — by construction, every visited cell ends up in one
// connected component.
function generateBackground(reserved, rng) {
  const visited = new Set();
  const edges = new Set();
  let start = null;
  for (let mz = 0; mz < MH && !start; mz++) {
    for (let mx = 0; mx < MW; mx++) {
      if (!reserved.has(key(mx, mz))) { start = [mx, mz]; break; }
    }
  }
  const stack = [start];
  visited.add(key(start[0], start[1]));
  while (stack.length) {
    const [cx, cz] = stack[stack.length - 1];
    const candidates = [[cx + 1, cz], [cx - 1, cz], [cx, cz + 1], [cx, cz - 1]]
      .filter(([nx, nz]) => nx >= 0 && nx < MW && nz >= 0 && nz < MH
        && !reserved.has(key(nx, nz)) && !visited.has(key(nx, nz)));
    if (candidates.length === 0) { stack.pop(); continue; }
    const [nx, nz] = candidates[Math.floor(rng() * candidates.length)];
    edges.add(`${key(cx, cz)}|${key(nx, nz)}`);
    visited.add(key(nx, nz));
    stack.push([nx, nz]);
  }
  return { visited, edges };
}

function buildFineGrid(visited, edges, rooms, rng) {
  const grid = [];
  for (let z = 0; z < GRID_ROWS; z++) grid.push(new Array(GRID_COLS).fill(WALL));

  for (const k of visited) {
    const [mx, mz] = k.split(',').map(Number);
    const [fx, fz] = toFine(mx, mz);
    grid[fz][fx] = FLOOR;
  }

  const seenPairs = new Set();
  for (const e of edges) {
    const [a, b] = e.split('|');
    const pairKey = [a, b].sort().join('|');
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);
    const [ax, az] = a.split(',').map(Number);
    const [bx, bz] = b.split(',').map(Number);
    const [afx, afz] = toFine(ax, az);
    const [bfx, bfz] = toFine(bx, bz);
    grid[(afz + bfz) / 2][(afx + bfx) / 2] = FLOOR;
  }

  // Braid a few extra loops into the perfect-tree maze (safe: adding edges to
  // an already-connected graph can never disconnect it) so it reads like a
  // real castle with more than one way around, not a pure dead-end tree.
  for (const k of visited) {
    const [mx, mz] = k.split(',').map(Number);
    for (const [dx, dz] of [[1, 0], [0, 1]]) {
      const nk = key(mx + dx, mz + dz);
      if (!visited.has(nk) || rng() >= BRAID_CHANCE) continue;
      const [afx, afz] = toFine(mx, mz);
      const [bfx, bfz] = toFine(mx + dx, mz + dz);
      grid[(afz + bfz) / 2][(afx + bfx) / 2] = FLOOR;
    }
  }

  for (const r of rooms) {
    const [cfx, cfz] = toFine(r.mx, r.mz);
    const half = r.h * 2;
    for (let z = cfz - half; z <= cfz + half; z++) {
      for (let x = cfx - half; x <= cfx + half; x++) {
        grid[z][x] = FLOOR;
      }
    }
  }

  return grid;
}

const DIR_VECTORS = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };

/** Carves a single-cell-wide passage from a room's boundary out to the first
 * valid background maze-cell it finds, trying directions in `order`. Returns
 * the list of connections actually made (one per direction that succeeded,
 * unless `stopAtFirst` is set). */
function connectRoom(grid, room, order, reserved, visited, stopAtFirst) {
  const made = [];
  for (const d of order) {
    const [dx, dz] = DIR_VECTORS[d];
    const outerMx = room.mx + dx * (room.h + 1);
    const outerMz = room.mz + dz * (room.h + 1);
    if (outerMx < 0 || outerMx >= MW || outerMz < 0 || outerMz >= MH) continue;
    const outerKey = key(outerMx, outerMz);
    if (reserved.has(outerKey) || !visited.has(outerKey)) continue;

    const [cfx, cfz] = toFine(room.mx, room.mz);
    const boundaryFx = cfx + dx * (room.h * 2);
    const boundaryFz = cfz + dz * (room.h * 2);
    const passage = { x: boundaryFx + dx, z: boundaryFz + dz };
    grid[passage.z][passage.x] = FLOOR;
    made.push({ dir: d, doorCell: passage });
    if (stopAtFirst) break;
  }
  return made;
}

function towardHubOrder(room, hub) {
  const vert = hub.mz >= room.mz ? 'S' : 'N';
  const horiz = hub.mx >= room.mx ? 'E' : 'W';
  const rest = ['N', 'S', 'E', 'W'].filter((d) => d !== vert && d !== horiz);
  return [vert, horiz, ...rest];
}

function generateCastle() {
  const rng = mulberry32(MAZE_SEED);

  const hub = { mx: 9, mz: 7, h: 2 };
  const gapRooms = [
    { id: 1, mx: 2, mz: 2, h: 1 },
    { id: 2, mx: 16, mz: 2, h: 1 },
    { id: 3, mx: 2, mz: 7, h: 1 },
    { id: 4, mx: 16, mz: 7, h: 1 },
    { id: 5, mx: 2, mz: 12, h: 1 },
    { id: 6, mx: 16, mz: 12, h: 1 },
  ];
  const finalRoom = { mx: 9, mz: 12, h: 1 };

  const allRooms = [hub, ...gapRooms, finalRoom];
  const reserved = buildReservedSet(allRooms);
  const { visited, edges } = generateBackground(reserved, rng);
  const grid = buildFineGrid(visited, edges, allRooms, rng);

  const hubConnections = connectRoom(grid, hub, ['N', 'S', 'E', 'W'], reserved, visited, false);
  if (hubConnections.length === 0) throw new Error('mazeData: hub failed to connect to the castle');

  const roomDefs = gapRooms.map((r) => {
    const order = towardHubOrder(r, hub);
    const [conn] = connectRoom(grid, r, order, reserved, visited, true);
    if (!conn) throw new Error(`mazeData: room ${r.id} failed to connect to the castle`);
    const [cfx, cfz] = toFine(r.mx, r.mz);
    return { id: r.id, cx: cfx, cz: cfz, w: r.h * 4 + 1, h: r.h * 4 + 1 };
  });

  const finalOrder = towardHubOrder(finalRoom, hub);
  const [finalConn] = connectRoom(grid, finalRoom, finalOrder, reserved, visited, true);
  if (!finalConn) throw new Error('mazeData: final room failed to connect to the castle');

  const [hubFx, hubFz] = toFine(hub.mx, hub.mz);
  const [finalFx, finalFz] = toFine(finalRoom.mx, finalRoom.mz);

  return {
    grid,
    hub: { cx: hubFx, cz: hubFz, w: hub.h * 4 + 1, h: hub.h * 4 + 1 },
    roomDefs,
    finalRoom: { cx: finalFx, cz: finalFz, w: finalRoom.h * 4 + 1, h: finalRoom.h * 4 + 1 },
    finalDoorCell: finalConn.doorCell,
    playerSpawn: { x: hubFx, z: hubFz },
    // Close to spawn and inside the camera's default view (not tucked behind
    // a pillar, which sit on the hub's diagonals) — a short, clearly visible
    // walk from where Samara starts.
    chestCell: { x: hubFx + 1, z: hubFz - 2 },
  };
}

const CASTLE = generateCastle();

export function buildGrid() {
  return CASTLE.grid;
}

export const ROOM_DEFS = CASTLE.roomDefs;
export const HUB = CASTLE.hub;
export const FINAL_ROOM = CASTLE.finalRoom;
export const FINAL_DOOR_CELL = CASTLE.finalDoorCell;
export const PLAYER_SPAWN = CASTLE.playerSpawn;
export const CHEST_CELL = CASTLE.chestCell;

export function gridToWorld(gx, gz) {
  return {
    x: (gx - GRID_COLS / 2) * CELL_SIZE,
    z: (gz - GRID_ROWS / 2) * CELL_SIZE,
  };
}

export function worldToGrid(wx, wz) {
  return {
    x: Math.round(wx / CELL_SIZE + GRID_COLS / 2),
    z: Math.round(wz / CELL_SIZE + GRID_ROWS / 2),
  };
}
