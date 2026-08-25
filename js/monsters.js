import * as THREE from 'three';

// One "Gap" monster per castle room — all riffing on our CPU joke. Difficulty
// ramps from room 1 through room 6, with rooms 5 and 6 as the two "chefes"
// (bosses). Each monster can carry a `special` battle mechanic handled in
// battle.js, and an optional `catchphrase` it shouts while attacking.

function pinGrid(cols, rows, spacing, color) {
  const group = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6);
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.4 });
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const pin = new THREE.Mesh(geo, mat);
      pin.position.set((i - (cols - 1) / 2) * spacing, -0.06, (j - (rows - 1) / 2) * spacing);
      group.add(pin);
    }
  }
  return group;
}

function coneSpikes(count, radius, color, spikeRadius = 0.18, spikeHeight = 0.5) {
  const group = new THREE.Group();
  const geo = new THREE.ConeGeometry(spikeRadius, spikeHeight, 6);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const spike = new THREE.Mesh(geo, mat);
    spike.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    spike.rotation.z = Math.cos(a) * 0.4;
    spike.rotation.x = -Math.sin(a) * 0.4;
    group.add(spike);
  }
  return group;
}

// ---------- 1: Pentium 4 — very strong, very slow ----------
function buildPentium4() {
  const g = new THREE.Group();
  const die = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.3, 1.3),
    new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.7, roughness: 0.35 }),
  );
  die.position.y = 0.9;
  g.add(die);

  const finMat = new THREE.MeshStandardMaterial({ color: 0xc7cbd1, metalness: 0.8, roughness: 0.25 });
  for (let i = 0; i < 7; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.06), finMat);
    fin.position.set(0, 1.35, -0.55 + i * 0.185);
    g.add(fin);
  }

  const fan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.12, 16),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5 }),
  );
  fan.position.y = 1.7;
  g.add(fan);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff5a1f, emissive: 0x7a2a0a }));
  hub.position.y = 1.77;
  g.add(hub);

  g.add(pinGrid(6, 6, 0.16, 0xd4af37));

  g.userData.idleSpin = 0.15; // slow, heavy
  return g;
}

// ---------- 2: Temido Atom — weakest of all ----------
function buildAtom() {
  const g = new THREE.Group();
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.05, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.8 }),
  );
  board.position.y = 0.45;
  g.add(board);
  const chip = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.12, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.5 }),
  );
  chip.position.y = 0.55;
  g.add(chip);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
    eye.position.set(side * 0.08, 0.62, 0.15);
    g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), pupilMat);
    pupil.position.set(side * 0.08, 0.62, 0.18);
    g.add(pupil);
  }
  g.userData.idleSpin = 1.4; // small and jittery, but harmless
  return g;
}

// ---------- 3: Xeon — the most HP, built for longevity ----------
function buildXeon() {
  const g = new THREE.Group();
  const die = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.35, 1.7),
    new THREE.MeshStandardMaterial({ color: 0x1f3a63, metalness: 0.6, roughness: 0.35 }),
  );
  die.position.y = 1.0;
  g.add(die);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.5, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x3a63a8, metalness: 0.5, roughness: 0.3 }),
  );
  cap.position.y = 1.42;
  g.add(cap);
  const badge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.05, 20),
    new THREE.MeshStandardMaterial({ color: 0x8fc1ff, emissive: 0x1a3a66, roughness: 0.3 }),
  );
  badge.rotation.x = Math.PI / 2;
  badge.position.set(0, 1.68, 0);
  g.add(badge);
  g.add((() => {
    const pins = pinGrid(9, 9, 0.16, 0xc9a227);
    pins.position.y = 0.85;
    return pins;
  })());
  g.userData.idleSpin = 0.25;
  return g;
}

// ---------- 4: AMD FX — attacks with fire (overheats) ----------
function buildAmdFx() {
  const g = new THREE.Group();
  const die = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.3, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x3a1414, metalness: 0.4, roughness: 0.5 }),
  );
  die.position.y = 0.9;
  g.add(die);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0xff4b1f, emissive: 0xb32106, emissiveIntensity: 1.2, roughness: 0.3 }),
  );
  core.position.y = 1.25;
  g.add(core);
  g.add((() => {
    const flames = coneSpikes(8, 0.55, 0xff8a3d, 0.14, 0.5);
    flames.position.y = 1.15;
    return flames;
  })());
  g.userData.idleSpin = 0.7;
  g.userData.flicker = true;
  return g;
}

// ---------- 5 (boss): I5cão — an i5 built like a fast little dog ----------
function buildI5cao() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2454a8, metalness: 0.4, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.6), bodyMat);
  body.position.y = 0.75;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.45), bodyMat);
  head.position.set(0.65, 0.9, 0);
  g.add(head);
  const earMat = new THREE.MeshStandardMaterial({ color: 0x9ec2ff, metalness: 0.6, roughness: 0.3 });
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.2), earMat);
    ear.position.set(0.75, 1.2, side * 0.15);
    ear.rotation.z = side * 0.25;
    g.add(ear);
  }
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x7fe0ff, emissive: 0x1a8fb3, emissiveIntensity: 1.5 }),
  );
  eye.position.set(0.9, 0.92, 0);
  g.add(eye);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x16305c, roughness: 0.5 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), legMat);
      leg.position.set(sx * 0.35, 0.3, sz * 0.22);
      g.add(leg);
    }
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), earMat);
  tail.position.set(-0.6, 0.95, 0);
  tail.rotation.z = Math.PI / 2.6;
  g.add(tail);
  g.userData.idleSpin = 0; // faces its own way; kept still, it's "fast" in battle, not spinning
  return g;
}

// ---------- 6 (final boss): i7 Rei — the strongest, but costs a fortune ----------
function buildI7Rei() {
  const g = new THREE.Group();
  const die = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.4, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x1a0f26, metalness: 0.6, roughness: 0.3 }),
  );
  die.position.y = 1.1;
  g.add(die);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.55, 1.15),
    new THREE.MeshStandardMaterial({ color: 0x3a2159, metalness: 0.5, roughness: 0.25 }),
  );
  cap.position.y = 1.58;
  g.add(cap);
  g.add((() => {
    const crown = coneSpikes(7, 0.55, 0xffd23f, 0.13, 0.42);
    crown.position.y = 1.95;
    return crown;
  })());
  const gem = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xff2d55, emissive: 0x7a0f24, roughness: 0.2 }),
  );
  gem.position.y = 2.05;
  g.add(gem);

  const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: 0.8, roughness: 0.25, emissive: 0x5c4a10 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 16), coinMat);
    coin.position.set(Math.cos(a) * 1.15, 0.03, Math.sin(a) * 1.15);
    coin.rotation.x = Math.PI / 2;
    coin.rotation.z = a;
    g.add(coin);
  }

  g.userData.idleSpin = 0.35;
  return g;
}

export const MONSTERS = {
  1: {
    id: 1, name: 'Pentium 4',
    flavor: 'Forte pra caramba, mas lento demais — ainda está inicializando desde os anos 2000.',
    hp: 90, maxHp: 90, atk: 22, def: 4,
    special: 'slow',
    build: buildPentium4,
  },
  2: {
    id: 2, name: 'Temido Atom',
    flavor: 'Dizem que é "temido", mas ninguém nunca teve medo de um Atom.',
    hp: 45, maxHp: 45, atk: 5, def: 0,
    special: null,
    build: buildAtom,
  },
  3: {
    id: 3, name: 'Xeon',
    flavor: 'Já rodou mais tempo que qualquer outro processador da casa. HP absurdo, resistência de servidor.',
    hp: 140, maxHp: 140, atk: 10, def: 5,
    special: null,
    build: buildXeon,
  },
  4: {
    id: 4, name: 'AMD FX',
    flavor: 'Esquenta rápido e ataca em chamas. Quanto mais o combate dura, mais ele pega fogo.',
    hp: 95, maxHp: 95, atk: 9, def: 3,
    special: 'heatUp',
    build: buildAmdFx,
  },
  5: {
    id: 5, name: 'I5cão',
    flavor: 'O chefe mais rápido do castelo. Prepare-se para o latido: "RODO TUDO!"',
    hp: 100, maxHp: 100, atk: 12, def: 4,
    special: 'fast',
    catchphrase: 'RODO TUDO!',
    build: buildI5cao,
  },
  6: {
    id: 6, name: 'i7 Rei',
    flavor: 'O mais forte de todos os Gaps. Seu único ponto fraco? Custa uma fortuna pra manter.',
    hp: 125, maxHp: 125, atk: 20, def: 6,
    special: 'coinDrop',
    build: buildI7Rei,
  },
};
