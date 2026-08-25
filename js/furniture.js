import * as THREE from 'three';

// Small reusable furniture builders (low-poly primitives), used to dress up
// the hub, the final room, and the maze's dead ends so the castle reads as a
// lived-in place rather than bare corridors.

export function buildTable(woodTex) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0xffffff, roughness: 0.7 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.9), mat);
  top.position.y = 0.75;
  g.add(top);
  const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.72, 8);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(sx * 0.68, 0.36, sz * 0.36);
      g.add(leg);
    }
  }
  return g;
}

export function buildChair(woodTex) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0xffffff, roughness: 0.7 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 0.46), mat);
  seat.position.y = 0.45;
  g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.07), mat);
  back.position.set(0, 0.71, -0.2);
  g.add(back);
  const legGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.44, 6);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(sx * 0.18, 0.22, sz * 0.18);
      g.add(leg);
    }
  }
  return g;
}

export function buildBench(woodTex) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0xffffff, roughness: 0.75 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.09, 0.4), mat);
  top.position.y = 0.42;
  g.add(top);
  const legGeo = new THREE.BoxGeometry(0.08, 0.4, 0.34);
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, mat);
    leg.position.set(sx * 0.55, 0.2, 0);
    g.add(leg);
  }
  return g;
}

export function buildBookshelf(woodTex) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0xffffff, roughness: 0.75 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.35), mat);
  frame.position.y = 1.0;
  g.add(frame);
  const bookColors = [0x8a2a12, 0x1f3a63, 0x2f6b3a, 0x6b3fa0, 0xc9a227, 0xb0202f];
  for (let shelf = 0; shelf < 3; shelf++) {
    const y = 0.45 + shelf * 0.6;
    let x = -0.45;
    let i = 0;
    while (x < 0.4 && i < 8) {
      const w = 0.1 + Math.random() * 0.06;
      const h = 0.32 + Math.random() * 0.14;
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, 0.26),
        new THREE.MeshStandardMaterial({ color: bookColors[i % bookColors.length], roughness: 0.6 }),
      );
      book.position.set(x + w / 2, y, 0.02);
      g.add(book);
      x += w + 0.015;
      i++;
    }
  }
  return g;
}

export function buildBarrel(woodTex) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: woodTex, color: 0xffffff, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.32, 0.65, 12), mat);
  body.position.y = 0.33;
  g.add(body);
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x2a2620, metalness: 0.4, roughness: 0.6 });
  for (const y of [0.1, 0.33, 0.56]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.025, 6, 16), bandMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    g.add(band);
  }
  return g;
}

export function buildCandelabra() {
  const g = new THREE.Group();
  const standMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.7, roughness: 0.3 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.1, 8), standMat);
  pole.position.y = 0.55;
  g.add(pole);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.06, 10), standMat);
  dish.position.y = 1.1;
  g.add(dish);
  const flameMat = new THREE.MeshStandardMaterial({ color: 0xffa23a, emissive: 0xff6a00, emissiveIntensity: 1.3, roughness: 0.4 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 8), flameMat);
    flame.position.set(Math.cos(a) * 0.1, 1.25, Math.sin(a) * 0.1);
    g.add(flame);
  }
  return g;
}

export function buildGoblet() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, 0.18, 8), mat);
  stem.position.y = 0.09;
  g.add(stem);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.14, 10), mat);
  cup.position.y = 0.24;
  g.add(cup);
  return g;
}

/** A small energy-drink can — the item Samara can collect to heal. */
export function buildEnergyCan() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8e8ec, metalness: 0.7, roughness: 0.25 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.28, 14), bodyMat);
  g.add(body);
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xff2d2d, emissive: 0x7a0f0f, emissiveIntensity: 0.6, roughness: 0.4 });
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.1, 14), stripeMat);
  g.add(stripe);
  const boltMat = new THREE.MeshStandardMaterial({ color: 0xffe14d, emissive: 0xb38f00, emissiveIntensity: 0.5, roughness: 0.3 });
  const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.17, 4), boltMat);
  bolt.rotation.z = Math.PI * 0.18;
  bolt.position.set(0, 0, 0.115);
  g.add(bolt);
  const topMat = new THREE.MeshStandardMaterial({ color: 0xc9c9cf, metalness: 0.8, roughness: 0.2 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.02, 14), topMat);
  top.position.y = 0.15;
  g.add(top);
  return g;
}

/** The crate/barrel a supply can sits on/inside, for the un-collected state. */
export function buildSupplyBarrel(woodTex) {
  const g = buildBarrel(woodTex);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xff2d2d, emissive: 0x7a0f0f, emissiveIntensity: 0.4, roughness: 0.5 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 16), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.66;
  g.add(ring);
  return g;
}

/** A wall-mounted shield with two crossed swords behind it — cheap medieval
 * corridor dressing, flat against the wall face. */
export function buildWallShield(accentColor = 0x8a2a12) {
  const g = new THREE.Group();
  const swordMat = new THREE.MeshStandardMaterial({ color: 0xb8bec7, metalness: 0.75, roughness: 0.3 });
  const hiltMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.7 });
  for (const side of [-1, 1]) {
    const sword = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.02), swordMat);
    blade.position.y = 0.4;
    sword.add(blade);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.05), hiltMat);
    sword.add(guard);
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6), hiltMat);
    hilt.position.y = -0.11;
    sword.add(hilt);
    sword.rotation.z = side * 0.45;
    g.add(sword);
  }
  const shieldMat = new THREE.MeshStandardMaterial({ color: accentColor, metalness: 0.4, roughness: 0.5 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.7, roughness: 0.3 });
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 6), shieldMat);
  shield.rotation.x = Math.PI / 2;
  shield.rotation.z = Math.PI / 6;
  g.add(shield);
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), trimMat);
  boss.position.z = 0.04;
  g.add(boss);
  return g;
}

/** A small framed painting, ready to hang flush against a wall face. */
export function buildWallPainting(paintingTex) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: paintingTex, roughness: 0.6 });
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.05), mat);
  g.add(canvas);
  return g;
}

/** A stone statue on a pedestal — a simple robed figure, abstracted from
 * primitives, for corridor junctions and grand rooms. */
export function buildStatue() {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8f8a97, roughness: 0.75 });
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.4, 8), stoneMat);
  pedestal.position.y = 0.2;
  g.add(pedestal);
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.1, 10), stoneMat);
  robe.position.y = 0.95;
  g.add(robe);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.5, 10), stoneMat);
  torso.position.y = 1.45;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), stoneMat);
  head.position.y = 1.85;
  g.add(head);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.4, 8), stoneMat);
    arm.position.set(side * 0.24, 1.5, 0.1);
    arm.rotation.x = -0.5;
    arm.rotation.z = side * 0.3;
    g.add(arm);
  }
  return g;
}

/** A simple potted plant — a cheap green accent against all the stone. */
export function buildPottedPlant() {
  const g = new THREE.Group();
  const potMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.8 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.32, 10), potMat);
  pot.position.y = 0.16;
  g.add(pot);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f7a3f, roughness: 0.7 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x5a9a52, roughness: 0.7 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.55, 6), i % 2 === 0 ? leafMat : leafMat2);
    leaf.position.set(Math.cos(a) * 0.08, 0.58, Math.sin(a) * 0.08);
    leaf.rotation.x = Math.cos(a) * 0.35;
    leaf.rotation.z = Math.sin(a) * -0.35;
    g.add(leaf);
  }
  return g;
}
