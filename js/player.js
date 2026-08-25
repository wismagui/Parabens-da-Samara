import * as THREE from 'three';
import { PLAYER_RADIUS, MOVE_SPEED } from './config.js';

function buildPlayerMesh() {
  const g = new THREE.Group();

  const skin = new THREE.MeshStandardMaterial({ color: 0xf0b28c, roughness: 0.6 });
  const dressMat = new THREE.MeshStandardMaterial({ color: 0x7b2cbf, roughness: 0.5 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0xe8c468, roughness: 0.55 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.4 });

  // legs (kept simple + cheap; slight animation via rotation in update loop)
  const legGroup = new THREE.Group();
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.7, 8), skin);
    leg.position.set(side * 0.18, 0.35, 0);
    legGroup.add(leg);
  }
  legGroup.name = 'legs';
  g.add(legGroup);

  // dress (cone body) covers hips/torso
  const dress = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.05, 12), dressMat);
  dress.position.y = 1.15;
  g.add(dress);

  // trim ring at hem
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.05, 8, 16), trimMat);
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.65;
  g.add(trim);

  // torso/shoulders
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.55, 10), dressMat);
  torso.position.y = 1.55;
  g.add(torso);

  // arms
  const armGroup = new THREE.Group();
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.55, 8), skin);
    arm.position.set(side * 0.42, 1.45, 0);
    arm.rotation.z = side * 0.25;
    armGroup.add(arm);
  }
  armGroup.name = 'arms';
  g.add(armGroup);

  // head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), skin);
  head.position.y = 2.05;
  g.add(head);

  // face: expressive eyes, eyebrows, a warm smile and a little blush —
  // small dot/blob meshes set right on the head sphere's front surface.
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x3d7dd6, roughness: 0.3 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x14101a, roughness: 0.5 });
  const browMat = new THREE.MeshStandardMaterial({ color: 0xc79a4b, roughness: 0.6 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0xb85c6b, roughness: 0.5 });
  const blushMat = new THREE.MeshStandardMaterial({ color: 0xff9eb0, roughness: 0.6, transparent: true, opacity: 0.55 });

  // NOTE: the head sphere has radius 0.28 — every feature's z must clear
  // sqrt(0.28^2 - x^2 - y^2) at its (x,y) offset from head center, or it
  // renders hidden inside the opaque head mesh. Values below include margin.
  for (const side of [-1, 1]) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), scleraMat);
    sclera.position.set(side * 0.115, 2.09, 0.27);
    sclera.scale.set(1, 1.15, 0.6);
    g.add(sclera);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 8), irisMat);
    iris.position.set(side * 0.115, 2.085, 0.3);
    g.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.017, 6, 6), pupilMat);
    pupil.position.set(side * 0.115, 2.085, 0.312);
    g.add(pupil);
    // tiny catch-light for sparkle
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), scleraMat);
    glint.position.set(side * 0.115 + 0.012, 2.098, 0.318);
    g.add(glint);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.028, 0.03), browMat);
    brow.position.set(side * 0.115, 2.155, 0.265);
    brow.rotation.z = side * -0.18;
    g.add(brow);

    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), blushMat);
    blush.position.set(side * 0.17, 2.01, 0.25);
    blush.scale.set(1, 0.7, 0.4);
    g.add(blush);
  }

  // smiling mouth: bottom half of a torus reads as a gentle upward curve
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 12, Math.PI), mouthMat);
  mouth.position.set(0, 1.965, 0.3);
  mouth.rotation.set(0, 0, Math.PI);
  g.add(mouth);

  // hair: short blonde bob (chanel cut) — a flattened, backset sphere so the
  // face stays visible up front, plus a small fringe over the forehead.
  const bob = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 12), hairMat);
  bob.position.set(0, 2.05, -0.08);
  bob.scale.set(1.05, 0.8, 0.85);
  g.add(bob);
  const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.1), hairMat);
  fringe.position.set(0, 2.16, 0.24);
  fringe.rotation.x = -0.25;
  g.add(fringe);

  // tiny tiara / accent (birthday-girl touch), resting on top of the bob
  const tiara = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 6, 16, Math.PI), trimMat);
  tiara.rotation.x = Math.PI * 1.55;
  tiara.position.set(0, 2.34, 0.02);
  g.add(tiara);

  g.userData.legGroup = legGroup;
  g.userData.armGroup = armGroup;
  g.userData.walkT = 0;

  return g;
}

function buildSwordMesh() {
  // A RAM stick, held like a sword: gold pin connector as the hilt, green
  // PCB as the blade, with a couple of little chip details on its face.
  const g = new THREE.Group();

  const gripMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.6 });
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 8), gripMat);
  grip.rotation.z = Math.PI / 2;
  grip.position.y = 0.06;
  g.add(grip);

  const pinMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.25 });
  const pins = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.045), pinMat);
  pins.position.y = -0.02;
  g.add(pins);

  const boardMat = new THREE.MeshStandardMaterial({ color: 0x1f8a4c, roughness: 0.4, metalness: 0.15 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.035), boardMat);
  board.position.y = -0.4;
  g.add(board);

  const chipMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.5 });
  for (let i = 0; i < 3; i++) {
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.012), chipMat);
    chip.position.set(0, -0.24 - i * 0.16, 0.024);
    g.add(chip);
  }

  return g;
}

function buildBlobShadow() {
  const geo = new THREE.CircleGeometry(0.55, 20);
  const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;
  return mesh;
}

export class Player {
  constructor(scene, startX, startZ) {
    this.mesh = buildPlayerMesh();
    this.mesh.position.set(startX, 0, startZ);
    scene.add(this.mesh);

    this.shadow = buildBlobShadow();
    scene.add(this.shadow);

    this.radius = PLAYER_RADIUS;
    this.facing = 0; // radians, yaw
    this._tmpDesired = new THREE.Vector3();
    this.hasSword = false;
  }

  get position() {
    return this.mesh.position;
  }

  /** Attaches the RAM-stick sword to Samara's right hand, once she finds the chest. */
  equipSword() {
    if (this.hasSword) return;
    this.hasSword = true;
    const rightArm = this.mesh.userData.armGroup.children[1];
    const sword = buildSwordMesh();
    sword.position.set(0, -0.34, 0.05);
    sword.rotation.x = -0.35;
    rightArm.add(sword);
    this.swordMesh = sword;
  }

  /**
   * @param {number} dt seconds
   * @param {THREE.Vector2} moveInput normalized-ish input (-1..1 each axis), in world XZ space already
   * @param {(pos:THREE.Vector3, radius:number)=>void} collideFn mutates pos in place to resolve wall collisions
   */
  update(dt, moveInput, collideFn) {
    const len = Math.hypot(moveInput.x, moveInput.y);
    const moving = len > 0.02;

    if (moving) {
      const nx = moveInput.x / len;
      const nz = moveInput.y / len;
      const speed = MOVE_SPEED * Math.min(len, 1);
      this.mesh.position.x += nx * speed * dt;
      this.mesh.position.z += nz * speed * dt;

      const targetFacing = Math.atan2(nx, nz);
      let diff = targetFacing - this.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.facing += diff * Math.min(1, dt * 10);

      this.mesh.userData.walkT += dt * 8;
      const swing = Math.sin(this.mesh.userData.walkT) * 0.5;
      this.mesh.userData.legGroup.rotation.x = swing;
      this.mesh.userData.armGroup.children[0].rotation.x = -swing * 0.8;
      this.mesh.userData.armGroup.children[1].rotation.x = swing * 0.8;
    } else {
      this.mesh.userData.legGroup.rotation.x *= 0.8;
      this.mesh.userData.armGroup.children[0].rotation.x *= 0.8;
      this.mesh.userData.armGroup.children[1].rotation.x *= 0.8;
    }

    this.mesh.rotation.y = this.facing;

    if (collideFn) collideFn(this.mesh.position, this.radius);

    this.shadow.position.set(this.mesh.position.x, 0.03, this.mesh.position.z);
  }
}
