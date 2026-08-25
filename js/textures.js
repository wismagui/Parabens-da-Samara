import * as THREE from 'three';

// Small procedural texture generator (canvas-drawn, no external assets) so
// the castle reads as stone/wood/fabric instead of flat solid colors.

function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d') };
}

function finish(c, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Shared stone-block layout used by both the color map and the bump map, so
// the two line up perfectly (same rows/cols/offset/jitter per call site
// would drift if regenerated independently — callers pass a fresh `rng` seed
// so a matching pair can be produced back-to-back).
function stoneBlocks(size, rows, cols) {
  const bw = size / cols;
  const bh = size / rows;
  const blocks = [];
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (bw / 2);
    for (let cIdx = -1; cIdx <= cols; cIdx++) {
      blocks.push({ x: cIdx * bw + offset, y: r * bh, w: bw, h: bh });
    }
  }
  return { blocks, bw, bh };
}

export function makeStoneWallTexture() {
  const size = 256;
  const { c, ctx } = makeCanvas(size);
  ctx.fillStyle = '#4a4552';
  ctx.fillRect(0, 0, size, size);
  const rows = 4;
  const cols = 4;
  const { blocks, bw, bh } = stoneBlocks(size, rows, cols);

  for (const { x, y } of blocks) {
    const base = 92 + Math.floor(Math.random() * 34);
    const grad = ctx.createLinearGradient(x, y, x + bw, y + bh);
    grad.addColorStop(0, `rgb(${base + 28},${base + 24},${base + 32})`);
    grad.addColorStop(0.5, `rgb(${base + 14},${base + 11},${base + 19})`);
    grad.addColorStop(1, `rgb(${base - 8},${base - 9},${base - 2})`);
    ctx.fillStyle = grad;
    ctx.fillRect(x + 3, y + 3, bw - 6, bh - 6);

    // speckled grain within the stone face
    for (let i = 0; i < 10; i++) {
      const sx = x + 4 + Math.random() * (bw - 8);
      const sy = y + 4 + Math.random() * (bh - 8);
      const v = Math.random() < 0.5 ? 255 : 0;
      ctx.fillStyle = `rgba(${v},${v},${v},${0.03 + Math.random() * 0.05})`;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // occasional moss/damp stain
    if (Math.random() < 0.3) {
      ctx.fillStyle = `rgba(70,84,58,${0.06 + Math.random() * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(
        x + bw * (0.25 + Math.random() * 0.4), y + bh * (0.25 + Math.random() * 0.4),
        bw * 0.28, bh * 0.2, Math.random() * Math.PI, 0, Math.PI * 2,
      );
      ctx.fill();
    }

    // fine hairline crack
    if (Math.random() < 0.3) {
      ctx.strokeStyle = 'rgba(18,16,20,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const cx0 = x + bw * (0.2 + Math.random() * 0.6);
      const cy0 = y + bh * (0.2 + Math.random() * 0.6);
      ctx.moveTo(cx0, cy0);
      ctx.lineTo(cx0 + (Math.random() - 0.5) * bw * 0.6, cy0 + (Math.random() - 0.5) * bh * 0.6);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(10,9,13,0.75)';
  ctx.lineWidth = 5;
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * bh); ctx.lineTo(size, r * bh); ctx.stroke();
  }
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (bw / 2);
    for (let cIdx = -1; cIdx <= cols; cIdx++) {
      const x = cIdx * bw + offset;
      ctx.beginPath(); ctx.moveTo(x, r * bh); ctx.lineTo(x, (r + 1) * bh); ctx.stroke();
    }
  }
  return finish(c, 2, 2);
}

/** Grayscale height map matching makeStoneWallTexture's block layout — deep
 * grooves at the mortar lines, gently uneven stone faces. Used as a bumpMap
 * so torch/point lights actually rake across the brickwork. */
export function makeStoneWallBumpMap() {
  const size = 256;
  const { c, ctx } = makeCanvas(size);
  ctx.fillStyle = '#8c8c8c';
  ctx.fillRect(0, 0, size, size);
  const rows = 4;
  const cols = 4;
  const { blocks, bw, bh } = stoneBlocks(size, rows, cols);

  for (const { x, y } of blocks) {
    const shade = 150 + Math.floor(Math.random() * 60);
    const grad = ctx.createRadialGradient(
      x + bw / 2, y + bh / 2, 2, x + bw / 2, y + bh / 2, Math.max(bw, bh) / 1.4,
    );
    grad.addColorStop(0, `rgb(${shade + 30},${shade + 30},${shade + 30})`);
    grad.addColorStop(1, `rgb(${shade - 20},${shade - 20},${shade - 20})`);
    ctx.fillStyle = grad;
    ctx.fillRect(x + 3, y + 3, bw - 6, bh - 6);
  }

  ctx.strokeStyle = '#141414';
  ctx.lineWidth = 6;
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * bh); ctx.lineTo(size, r * bh); ctx.stroke();
  }
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (bw / 2);
    for (let cIdx = -1; cIdx <= cols; cIdx++) {
      const x = cIdx * bw + offset;
      ctx.beginPath(); ctx.moveTo(x, r * bh); ctx.lineTo(x, (r + 1) * bh); ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export function makeFloorTexture() {
  const size = 256;
  const { c, ctx } = makeCanvas(size);
  ctx.fillStyle = '#948da0';
  ctx.fillRect(0, 0, size, size);
  const n = 4;
  const s = size / n;
  for (let r = 0; r < n; r++) {
    for (let cIdx = 0; cIdx < n; cIdx++) {
      const x = cIdx * s;
      const y = r * s;
      const shade = 140 + Math.floor(Math.random() * 20) - 10;
      const grad = ctx.createLinearGradient(x, y, x + s, y + s);
      grad.addColorStop(0, `rgb(${shade + 10},${shade + 6},${shade + 16})`);
      grad.addColorStop(1, `rgb(${shade - 10},${shade - 14},${shade - 4})`);
      ctx.fillStyle = grad;
      ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
      for (let i = 0; i < 6; i++) {
        const sx = x + 4 + Math.random() * (s - 8);
        const sy = y + 4 + Math.random() * (s - 8);
        const v = Math.random() < 0.5 ? 255 : 20;
        ctx.fillStyle = `rgba(${v},${v},${v},${0.04 + Math.random() * 0.05})`;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
    }
  }
  ctx.strokeStyle = 'rgba(35,32,42,0.5)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= n; i++) {
    ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(size, i * s); ctx.stroke();
  }
  return finish(c, 2, 2);
}

/** Grayscale height map for the floor tiles — shallow grout grooves. */
export function makeFloorBumpMap() {
  const size = 256;
  const { c, ctx } = makeCanvas(size);
  ctx.fillStyle = '#a0a0a0';
  ctx.fillRect(0, 0, size, size);
  const n = 4;
  const s = size / n;
  for (let r = 0; r < n; r++) {
    for (let cIdx = 0; cIdx < n; cIdx++) {
      const shade = 165 + Math.floor(Math.random() * 30);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(cIdx * s + 2, r * s + 2, s - 4, s - 4);
    }
  }
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 3;
  for (let i = 0; i <= n; i++) {
    ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(size, i * s); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export function makeWoodTexture() {
  const { c, ctx } = makeCanvas(64);
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 11; i++) {
    ctx.strokeStyle = `rgba(35,18,7,${0.15 + Math.random() * 0.2})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const y0 = i * 6 + Math.random() * 3;
    ctx.moveTo(0, y0);
    ctx.bezierCurveTo(20, y0 + Math.random() * 6 - 3, 44, y0 + Math.random() * 6 - 3, 64, y0);
    ctx.stroke();
  }
  return finish(c, 1, 2);
}

export function makeRugTexture(baseColor, borderColor) {
  const { c, ctx } = makeCanvas(256);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 12;
  ctx.strokeRect(16, 16, 224, 224);
  ctx.lineWidth = 4;
  ctx.strokeRect(34, 34, 188, 188);
  ctx.beginPath();
  ctx.moveTo(128, 66); ctx.lineTo(190, 128); ctx.lineTo(128, 190); ctx.lineTo(66, 128);
  ctx.closePath();
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(128, 128, 24, 0, Math.PI * 2);
  ctx.stroke();
  return finish(c, 1, 1);
}

/** A small framed landscape painting — sky gradient, hills, a distant tower
 * silhouette, all inside a gilded frame. Purely decorative wall dressing. */
export function makePaintingTexture() {
  const { c, ctx } = makeCanvas(128, 160);
  // frame
  ctx.fillStyle = '#8a6a2f';
  ctx.fillRect(0, 0, 128, 160);
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(4, 4, 120, 152);
  // sky
  const skyPalette = [
    ['#3a2a55', '#8a6ab0'],
    ['#2a3a55', '#6a8ab0'],
    ['#4a2a3a', '#b06a8a'],
  ];
  const [skyTop, skyBottom] = skyPalette[Math.floor(Math.random() * skyPalette.length)];
  const inset = 12;
  const sky = ctx.createLinearGradient(0, inset, 0, 130);
  sky.addColorStop(0, skyTop);
  sky.addColorStop(1, skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(inset, inset, 128 - inset * 2, 130 - inset);
  // moon/sun
  ctx.fillStyle = 'rgba(255,230,190,0.85)';
  ctx.beginPath();
  ctx.arc(96, 34, 9, 0, Math.PI * 2);
  ctx.fill();
  // distant hills
  ctx.fillStyle = 'rgba(20,15,25,0.55)';
  ctx.beginPath();
  ctx.moveTo(inset, 110);
  ctx.bezierCurveTo(40, 85, 70, 100, 116, 80);
  ctx.lineTo(116, 130);
  ctx.lineTo(inset, 130);
  ctx.closePath();
  ctx.fill();
  // castle tower silhouette
  ctx.fillStyle = 'rgba(10,8,14,0.75)';
  ctx.fillRect(56, 70, 10, 40);
  ctx.beginPath();
  ctx.moveTo(53, 70); ctx.lineTo(61, 58); ctx.lineTo(69, 70);
  ctx.closePath();
  ctx.fill();
  // ground
  ctx.fillStyle = '#2a3520';
  ctx.fillRect(inset, 118, 128 - inset * 2, 12);
  // canvas craquelure lines
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(inset + Math.random() * 100, inset);
    ctx.lineTo(inset + Math.random() * 100, 130);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Leaded stained glass — a geometric rosette in saturated colors, meant to
 * sit on outer castle walls with a light behind it. */
export function makeStainedGlassTexture() {
  const { c, ctx } = makeCanvas(128, 192);
  ctx.fillStyle = '#0c0a10';
  ctx.fillRect(0, 0, 128, 192);
  const palette = ['#c9302f', '#2f6bc9', '#e0a72e', '#3f9b5c', '#8a4fc9'];
  const cx = 64;
  const cy = 70;
  // arched window shape via wedges
  const wedges = 8;
  for (let i = 0; i < wedges; i++) {
    const a0 = (i / wedges) * Math.PI * 2;
    const a1 = ((i + 1) / wedges) * Math.PI * 2;
    ctx.fillStyle = palette[i % palette.length];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 44, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = palette[4];
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fill();
  // lower panel
  ctx.fillStyle = palette[1];
  ctx.fillRect(24, 120, 80, 60);
  ctx.fillStyle = palette[2];
  ctx.fillRect(24, 150, 80, 12);
  // lead lines
  ctx.strokeStyle = '#0c0a10';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < wedges; i++) {
    const a = (i / wedges) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14);
    ctx.lineTo(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44);
    ctx.stroke();
  }
  ctx.strokeRect(24, 120, 80, 60);
  ctx.beginPath(); ctx.moveTo(24, 150); ctx.lineTo(104, 150); ctx.stroke();
  ctx.strokeStyle = '#1a1520';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 116, 180);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeBannerTexture(color, accent) {
  const { c, ctx } = makeCanvas(64, 128);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 64, 128);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 46, 64, 7);
  ctx.fillRect(0, 62, 64, 7);
  ctx.beginPath();
  ctx.arc(32, 28, 15, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(32, 28, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(8 + i * 16, 128, 8, 0, Math.PI, false);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
