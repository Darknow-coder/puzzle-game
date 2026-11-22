// Procedural art for Lumignons. Everything is drawn with Canvas 2D paths, so
// the game ships without any bitmap asset (no licence concerns, tiny download).

export const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Colours

export const LUMI = [
  { name: 'amber', body: '#ffe6ad', shade: '#f5b55d', line: '#b8692a', flame: '#ff9a1f', core: '#fff2a8', glow: 'rgba(255,170,60,', ui: '#ffb547' },
  { name: 'blue', body: '#d3efff', shade: '#86c9f2', line: '#3b78b5', flame: '#38a6ff', core: '#d9f6ff', glow: 'rgba(80,175,255,', ui: '#6cc8ff' },
  { name: 'rose', body: '#ffd9ea', shade: '#f59cc4', line: '#b84c82', flame: '#ff4f9a', core: '#ffe0f0', glow: 'rgba(255,90,160,', ui: '#ff8fc1' },
  { name: 'mint', body: '#d4f8e2', shade: '#8fdcb0', line: '#2e8a5c', flame: '#1fcf7c', core: '#dcffe9', glow: 'rgba(40,220,130,', ui: '#7eebb0' },
];

/** Shape drawn for colour-blind players: circle, triangle, diamond, square. */
export function colorSymbol(g, kind, x, y, r, fill, stroke) {
  g.save();
  g.fillStyle = fill;
  g.strokeStyle = stroke;
  g.lineWidth = Math.max(1, r * 0.28);
  g.beginPath();
  if (kind === 0) g.arc(x, y, r, 0, Math.PI * 2);
  else if (kind === 1) {
    g.moveTo(x, y - r * 1.1);
    g.lineTo(x + r, y + r * 0.75);
    g.lineTo(x - r, y + r * 0.75);
    g.closePath();
  } else if (kind === 2) {
    g.moveTo(x, y - r * 1.15);
    g.lineTo(x + r * 0.95, y);
    g.lineTo(x, y + r * 1.15);
    g.lineTo(x - r * 0.95, y);
    g.closePath();
  } else g.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
  g.stroke();
  g.fill();
  g.restore();
}

export const WORLD_STYLES = {
  meadow: {
    sky: ['#231a45', '#5a3478', '#c45f74', '#f3a066'],
    stars: 0.55,
    moon: { x: 0.8, y: 0.16, r: 0.06, color: '#fff3d6' },
    hills: ['#3a2a5e', '#2c2150'],
    grass: ['#8fd18a', '#82c77e'],
    grassEdge: '#b4e6a3',
    side: ['#7a5236', '#5c3b27'],
    soilLine: '#8f6443',
    water: ['#3f8fd0', '#2f6fa8'],
    accent: '#ffd27a',
    particle: 'rgba(255,230,150,',
    props: ['bush', 'rock', 'tree', 'bush', 'flowers'],
  },
  pond: {
    sky: ['#0d1c3d', '#173f6e', '#2f7aa6', '#7cc3d6'],
    stars: 0.7,
    moon: { x: 0.22, y: 0.12, r: 0.05, color: '#e8f6ff' },
    hills: ['#16325a', '#10284a'],
    grass: ['#7ccfa4', '#70c398'],
    grassEdge: '#a6ecc5',
    side: ['#4f6b6e', '#3b5255'],
    soilLine: '#668487',
    water: ['#3aa0dc', '#2678b8'],
    accent: '#9fe8ff',
    particle: 'rgba(170,235,255,',
    props: ['reeds', 'rock', 'reeds', 'stump'],
  },
  grove: {
    sky: ['#140b26', '#2d1650', '#5a2a77', '#8a4a92'],
    stars: 0.8,
    moon: { x: 0.75, y: 0.1, r: 0.045, color: '#ffe6ff' },
    hills: ['#2a1544', '#1f0f36'],
    grass: ['#6fbf8f', '#64b384'],
    grassEdge: '#97e0b2',
    side: ['#5a3f6e', '#432e55'],
    soilLine: '#70528a',
    water: ['#4b7fd6', '#3561ad'],
    accent: '#ff9df0',
    particle: 'rgba(255,170,250,',
    props: ['bigshroom', 'stump', 'bigshroom', 'fern'],
  },
  ruins: {
    sky: ['#0b1230', '#1b2c5c', '#3d5b94', '#7f9fd0'],
    stars: 0.9,
    moon: { x: 0.5, y: 0.13, r: 0.09, color: '#f4f7ff' },
    hills: ['#1b2850', '#142043'],
    grass: ['#c3cbe0', '#b5bed6'],
    grassEdge: '#e2e8f7',
    side: ['#5d6890', '#465073'],
    soilLine: '#717da6',
    water: ['#4a8fd8', '#3670b5'],
    accent: '#8ff6ff',
    particle: 'rgba(170,250,255,',
    props: ['pillar', 'block', 'pillar', 'brokenpillar'],
    paved: true,
  },
  gloom: {
    sky: ['#04090f', '#0b1f26', '#163c3d', '#2a5c52'],
    stars: 0.5,
    moon: { x: 0.18, y: 0.15, r: 0.05, color: '#d9ffe9' },
    hills: ['#0a1a1f', '#071317'],
    grass: ['#4f9277', '#47866c'],
    grassEdge: '#71b796',
    side: ['#2f3f45', '#222f34'],
    soilLine: '#3d5058',
    water: ['#2c6f8f', '#1f5470'],
    accent: '#b28cff',
    particle: 'rgba(180,140,255,',
    props: ['darktree', 'thorns', 'darktree', 'rock'],
  },
  peak: {
    sky: ['#070b22', '#16234f', '#2c3f7a', '#5f6fae'],
    stars: 1,
    moon: { x: 0.82, y: 0.11, r: 0.05, color: '#fffbe8' },
    hills: ['#24346a', '#1a2757'],
    grass: ['#eaf2fb', '#dde8f5'],
    grassEdge: '#ffffff',
    side: ['#8ea6cc', '#7189b2'],
    soilLine: '#a7bcdb',
    water: ['#58a8e6', '#3b86c9'],
    accent: '#fff1a6',
    particle: 'rgba(255,255,255,',
    props: ['pine', 'snowrock', 'pine', 'crystal'],
    aurora: true,
  },
  dawn: {
    sky: ['#2c3170', '#6f5bab', '#e48eb2', '#ffd9a6'],
    stars: 0.35,
    moon: { x: 0.76, y: 0.7, r: 0.1, color: '#fff0c4' },
    sun: true,
    hills: ['#4d4689', '#3c3675'],
    grass: ['#ace6d4', '#9edcc9'],
    grassEdge: '#dcfff4',
    side: ['#8b78b9', '#6e5d9e'],
    soilLine: '#a795d3',
    water: ['#7bcbf0', '#59afe0'],
    accent: '#ffd6ea',
    particle: 'rgba(255,214,236,',
    props: ['prism', 'rock', 'prism', 'flowers'],
  },
};

const PORTAL_COLORS = ['#69e6ff', '#c78bff'];

// ---------------------------------------------------------------------------
// Helpers

export function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
export function mix(a, b, t) {
  const p = hexToRgb(a);
  const q = hexToRgb(b);
  const r = p.map((v, i) => Math.round(v + (q[i] - v) * t));
  return `rgb(${r[0]},${r[1]},${r[2]})`;
}
export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
export function hash2(x, y, s = 0) {
  let h = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 1442695041, 2246822519) ^ Math.imul(s + 97, 3266489917);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function roundRect(ctx, x, y, w, h, r) {
  const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  if (tr) ctx.arcTo(x + w, y, x + w, y + tr, tr);
  else ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - br);
  if (br) ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  else ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + bl, y + h);
  if (bl) ctx.arcTo(x, y + h, x, y + h - bl, bl);
  else ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + tl);
  if (tl) ctx.arcTo(x, y, x + tl, y, tl);
  else ctx.lineTo(x, y);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, TAU);
}

export function makeCanvas(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' && !globalThis.document ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  watchCanvas(c);
  return c;
}

// ---------------------------------------------------------------------------
// Lost canvases
//
// Mobile browsers may throw away the pixels of every canvas when the GPU
// process is reclaimed — typically while the app sits in the background. The
// main view is redrawn each frame, but everything drawn once and reused (the
// caches below, the scenes' sky and island layers, the icons in the HUD) would
// stay blank. `gpu.epoch` changes whenever that happens: caches are dropped,
// scenes rebuild their layers, and canvases drawn through paint() are redrawn.

export const gpu = { epoch: 0 };
let resetTimer = 0;
export function canvasesLost() {
  if (resetTimer || !globalThis.document) return;
  // Every canvas reports at once (and again when restored): rebuild once.
  resetTimer = setTimeout(() => {
    resetTimer = 0;
    gpu.epoch++;
    glowCache.clear();
    propCache.clear();
    for (const cv of document.querySelectorAll('canvas')) if (cv.__paint) repaint(cv);
  }, 30);
}

export function watchCanvas(c) {
  if (!c.addEventListener || c.__watched) return;
  c.__watched = true;
  c.addEventListener('contextlost', canvasesLost);
  c.addEventListener('contextrestored', canvasesLost);
}

/** Draws a page canvas now, and again whenever canvases lose their pixels. */
export function paint(cv, draw) {
  cv.__paint = draw;
  watchCanvas(cv);
  repaint(cv);
  return cv;
}

function repaint(cv) {
  const g = cv.getContext('2d');
  if (!g) return;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, cv.width, cv.height);
  cv.__paint(g);
}

// Not every browser reports the loss: when the app comes back, a canary canvas
// (large enough to live on the GPU) tells whether its pixels survived. A fresh
// canary is made each time, since reading pixels back can move a canvas to the CPU.
let canary = null;
export function checkCanvases() {
  if (!globalThis.document) return;
  try {
    if (canary && canary.getContext('2d').getImageData(1, 1, 1, 1).data[3] === 0) canvasesLost();
    canary = makeCanvas(256, 256);
    const g = canary.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, 256, 256);
  } catch {
    canary = null;
  }
}

const glowCache = new Map();
/** Soft radial glow sprite, cached by colour prefix ("rgba(r,g,b,"). */
export function glow(ctx, x, y, r, colorPrefix, alpha = 1) {
  if (r <= 0 || alpha <= 0) return;
  const key = colorPrefix;
  let spr = glowCache.get(key);
  if (!spr) {
    spr = makeCanvas(128, 128);
    const g = spr.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, colorPrefix + '0.9)');
    grd.addColorStop(0.25, colorPrefix + '0.45)');
    grd.addColorStop(0.6, colorPrefix + '0.12)');
    grd.addColorStop(1, colorPrefix + '0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    glowCache.set(key, spr);
  }
  const prev = ctx.globalAlpha;
  const prevOp = ctx.globalCompositeOperation;
  ctx.globalAlpha = prev * Math.min(1, alpha);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prev;
  ctx.globalCompositeOperation = prevOp;
}

// ---------------------------------------------------------------------------
// Sky

/** Pre-renders the static part of a world's sky (gradient, moon, far hills). */
export function renderSky(w, h, worldKey, opts = {}) {
  const st = WORLD_STYLES[worldKey] || WORLD_STYLES.meadow;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, h);
  st.sky.forEach((col, i) => grd.addColorStop(i / (st.sky.length - 1), col));
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  const unit = Math.min(w, h * 0.75);
  // Moon with halo.
  const m = { ...st.moon, ...(opts.moon || {}) };
  const mx = m.x * w;
  const my = m.y * h;
  const mr = m.r * unit;
  const halo = g.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 5);
  halo.addColorStop(0, rgba(m.color, 0.35));
  halo.addColorStop(1, rgba(m.color, 0));
  g.fillStyle = halo;
  g.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
  if (st.sun) {
    // Dawn: a wide warm glow and the first rays above the horizon.
    const warm = g.createRadialGradient(mx, my, mr, mx, my, unit * 0.9);
    warm.addColorStop(0, rgba('#ffe2b0', 0.45));
    warm.addColorStop(1, rgba('#ffe2b0', 0));
    g.fillStyle = warm;
    g.fillRect(0, 0, w, h);
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * (0.12 + (0.76 * i) / 8);
      g.strokeStyle = rgba('#fff3d6', 0.06);
      g.lineWidth = mr * 0.7;
      g.beginPath();
      g.moveTo(mx + Math.cos(a) * mr * 1.4, my + Math.sin(a) * mr * 1.4);
      g.lineTo(mx + Math.cos(a) * unit * 0.8, my + Math.sin(a) * unit * 0.8);
      g.stroke();
    }
    g.restore();
  }
  g.fillStyle = m.color;
  ellipse(g, mx, my, mr, mr);
  g.fill();
  if (!st.sun) {
    g.fillStyle = rgba('#000000', 0.06);
    ellipse(g, mx - mr * 0.3, my - mr * 0.2, mr * 0.22, mr * 0.22);
    g.fill();
    ellipse(g, mx + mr * 0.35, my + mr * 0.3, mr * 0.14, mr * 0.14);
    g.fill();
  }
  if (st.aurora) {
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const y0 = h * (0.18 + i * 0.07);
      const ag = g.createLinearGradient(0, y0 - unit * 0.2, 0, y0 + unit * 0.2);
      const col = i === 1 ? '120,255,200' : i === 2 ? '255,140,230' : '110,200,255';
      ag.addColorStop(0, `rgba(${col},0)`);
      ag.addColorStop(0.5, `rgba(${col},0.16)`);
      ag.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = ag;
      g.beginPath();
      g.moveTo(0, y0);
      for (let x = 0; x <= w; x += w / 12) g.lineTo(x, y0 + Math.sin(x / w * 5 + i * 2) * unit * 0.08);
      g.lineTo(w, y0 + unit * 0.25);
      g.lineTo(0, y0 + unit * 0.25);
      g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }
  // Two layers of distant floating islands / hills.
  st.hills.forEach((col, layer) => {
    g.fillStyle = col;
    const base = h * (0.78 + layer * 0.1);
    g.beginPath();
    g.moveTo(0, h);
    g.lineTo(0, base);
    const n = 6 + layer * 2;
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * w;
      const y = base - (0.5 + 0.5 * Math.sin(i * 1.7 + layer * 3)) * unit * (0.12 - layer * 0.03);
      const px = ((i - 0.5) / n) * w;
      g.quadraticCurveTo(px, y - unit * 0.05, x, y);
    }
    g.lineTo(w, h);
    g.fill();
  });
  // Tiny far islands floating in the sky.
  for (let i = 0; i < 3; i++) {
    const ix = w * (0.12 + 0.36 * i + 0.05 * Math.sin(i * 7));
    const iy = h * (0.34 + 0.08 * ((i * 37) % 3));
    const iw = unit * (0.07 + 0.03 * (i % 2));
    g.fillStyle = rgba(st.hills[0], 0.9);
    g.beginPath();
    g.moveTo(ix - iw, iy);
    g.quadraticCurveTo(ix, iy - iw * 0.35, ix + iw, iy);
    g.quadraticCurveTo(ix + iw * 0.3, iy + iw * 0.9, ix, iy + iw * 1.1);
    g.quadraticCurveTo(ix - iw * 0.4, iy + iw * 0.8, ix - iw, iy);
    g.fill();
  }
  return c;
}

/** Deterministic star field for a sky. */
export function makeStars(n, seed = 1) {
  const stars = [];
  for (let i = 0; i < n; i++) {
    stars.push({
      x: hash2(i, 1, seed),
      y: Math.pow(hash2(i, 2, seed), 1.6) * 0.75,
      r: 0.4 + hash2(i, 3, seed) * 1.3,
      p: hash2(i, 4, seed) * TAU,
      s: 0.5 + hash2(i, 5, seed) * 2,
    });
  }
  return stars;
}

export function drawStars(ctx, stars, w, h, t, density = 1, scale = 1) {
  ctx.fillStyle = '#fff';
  const n = Math.floor(stars.length * density);
  for (let i = 0; i < n; i++) {
    const s = stars[i];
    const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
    ctx.globalAlpha = a;
    const r = s.r * scale;
    ctx.fillRect(s.x * w - r / 2, s.y * h - r / 2, r, r);
    if (s.r > 1.45) {
      ctx.globalAlpha = a * 0.5;
      ctx.fillRect(s.x * w - r * 1.6, s.y * h - r * 0.15, r * 3.2, r * 0.3);
      ctx.fillRect(s.x * w - r * 0.15, s.y * h - r * 1.6, r * 0.3, r * 3.2);
    }
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Island (static ground layer)

const T_VOID = 0;
const T_GRASS = 1;
const T_WALL = 2;
const T_WATER = 3;
const T_CLOUD = 4;

/**
 * Renders the island ground: grass tops, water, earthy sides. Clouds are drawn
 * dynamically (they can vanish). Returns a canvas covering the board plus a
 * margin for the sides.
 */
export function renderIsland(L, worldKey, S, dpr = 1) {
  const st = WORLD_STYLES[worldKey] || WORLD_STYLES.meadow;
  const th = Math.round(S * 0.34);
  const pad = Math.ceil(S * 0.2);
  const W = L.w * S + pad * 2;
  const H = L.h * S + th + pad * 2;
  const c = makeCanvas(W * dpr, H * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  g.translate(pad, pad);
  const solid = (x, y) => {
    if (x < 0 || y < 0 || x >= L.w || y >= L.h) return false;
    const t = L.terrain[y * L.w + x];
    return t === T_GRASS || t === T_WALL || t === T_WATER;
  };
  const r = S * 0.22;
  const cornerR = (x, y, dx, dy) => (!solid(x + dx, y) && !solid(x, y + dy) && !solid(x + dx, y + dy) ? r : 0);

  // Soft shadow under the island.
  g.save();
  g.fillStyle = 'rgba(10,5,30,0.28)';
  g.filter = typeof g.filter === 'string' ? `blur(${Math.round(S * 0.18)}px)` : 'none';
  for (let y = 0; y < L.h; y++)
    for (let x = 0; x < L.w; x++) {
      if (!solid(x, y)) continue;
      g.fillRect(x * S + S * 0.05, y * S + th + S * 0.25, S * 0.9, S * 0.9);
    }
  g.restore();

  // Sides (earth) where the cell below is empty.
  for (let y = 0; y < L.h; y++)
    for (let x = 0; x < L.w; x++) {
      if (!solid(x, y) || solid(x, y + 1)) continue;
      const bl = !solid(x - 1, y) || !solid(x - 1, y + 1) ? 0 : 0;
      const left = !solid(x - 1, y);
      const right = !solid(x + 1, y);
      const x0 = x * S;
      const y0 = y * S + S * 0.5;
      const grd = g.createLinearGradient(0, y0, 0, y0 + S * 0.5 + th);
      grd.addColorStop(0, st.side[0]);
      grd.addColorStop(1, st.side[1]);
      g.fillStyle = grd;
      g.beginPath();
      roundRect(g, x0, y0, S, S * 0.5 + th, [0, 0, right ? r : bl, left ? r : bl]);
      g.fill();
      // Strata lines.
      g.strokeStyle = st.soilLine;
      g.lineWidth = Math.max(1, S * 0.03);
      g.globalAlpha = 0.6;
      g.beginPath();
      const ly = y0 + S * 0.5 + th * 0.45;
      g.moveTo(x0 + (left ? r * 0.6 : 0), ly + Math.sin(x * 2.1) * 2);
      g.quadraticCurveTo(x0 + S * 0.5, ly + Math.sin(x * 3.3) * 4, x0 + S - (right ? r * 0.6 : 0), ly + Math.sin(x * 2.1 + 2) * 2);
      g.stroke();
      g.globalAlpha = 1;
      // Little dangling roots / icicles.
      const n = 1 + Math.floor(hash2(x, y, 9) * 2);
      for (let i = 0; i < n; i++) {
        const rx = x0 + S * (0.25 + 0.5 * hash2(x, y, i + 3));
        const rl = th * (0.35 + 0.5 * hash2(x, y, i + 7));
        g.strokeStyle = worldKey === 'peak' ? 'rgba(230,245,255,0.8)' : st.side[1];
        g.lineWidth = Math.max(1, S * 0.035);
        g.beginPath();
        g.moveTo(rx, y0 + S * 0.5 + th - 2);
        g.quadraticCurveTo(rx + S * 0.05, y0 + S * 0.5 + th + rl * 0.5, rx - S * 0.02, y0 + S * 0.5 + th + rl);
        g.stroke();
      }
    }

  // Grass tops.
  for (let y = 0; y < L.h; y++)
    for (let x = 0; x < L.w; x++) {
      if (!solid(x, y)) continue;
      const rr = [cornerR(x, y, -1, -1), cornerR(x, y, 1, -1), cornerR(x, y, 1, 1), cornerR(x, y, -1, 1)];
      g.fillStyle = st.grass[(x + y) & 1];
      g.beginPath();
      roundRect(g, x * S - 0.5, y * S - 0.5, S + 1, S + 1, rr);
      g.fill();
    }
  // Paving or grass texture.
  for (let y = 0; y < L.h; y++)
    for (let x = 0; x < L.w; x++) {
      if (!solid(x, y) || L.terrain[y * L.w + x] === T_WATER) continue;
      const x0 = x * S;
      const y0 = y * S;
      if (st.paved) {
        g.strokeStyle = 'rgba(70,80,120,0.25)';
        g.lineWidth = Math.max(1, S * 0.025);
        g.beginPath();
        roundRect(g, x0 + S * 0.06, y0 + S * 0.06, S * 0.88, S * 0.88, S * 0.12);
        g.stroke();
        if (hash2(x, y, 4) < 0.4) {
          g.beginPath();
          g.moveTo(x0 + S * 0.2, y0 + S * 0.3);
          g.lineTo(x0 + S * 0.4, y0 + S * 0.45);
          g.lineTo(x0 + S * 0.35, y0 + S * 0.7);
          g.stroke();
        }
      } else {
        // Blades of grass / pebbles.
        for (let i = 0; i < 3; i++) {
          const gx = x0 + S * (0.15 + 0.7 * hash2(x, y, i));
          const gy = y0 + S * (0.15 + 0.7 * hash2(x, y, i + 10));
          g.strokeStyle = worldKey === 'peak' ? 'rgba(150,180,220,0.45)' : worldKey === 'dawn' ? 'rgba(70,130,130,0.25)' : 'rgba(40,90,50,0.22)';
          g.lineWidth = Math.max(1, S * 0.025);
          g.beginPath();
          g.moveTo(gx, gy);
          g.lineTo(gx - S * 0.03, gy - S * 0.07);
          g.moveTo(gx + S * 0.04, gy);
          g.lineTo(gx + S * 0.06, gy - S * 0.06);
          g.stroke();
        }
      }
    }
  // Highlight on top edges facing the void (rim light).
  g.strokeStyle = st.grassEdge;
  g.lineWidth = Math.max(1.5, S * 0.05);
  g.lineCap = 'round';
  g.globalAlpha = 0.7;
  for (let y = 0; y < L.h; y++)
    for (let x = 0; x < L.w; x++) {
      if (!solid(x, y) || solid(x, y - 1)) continue;
      const left = cornerR(x, y, -1, -1);
      const right = cornerR(x, y, 1, -1);
      g.beginPath();
      g.moveTo(x * S + (left ? r : 0) + 1, y * S + S * 0.04);
      g.lineTo((x + 1) * S - (right ? r : 0) - 1, y * S + S * 0.04);
      g.stroke();
    }
  g.globalAlpha = 1;

  // Water: recessed basins merged across neighbouring water cells.
  const isW = (x, y) => x >= 0 && y >= 0 && x < L.w && y < L.h && L.terrain[y * L.w + x] === T_WATER;
  const m = S * 0.07;
  for (let y = 0; y < L.h; y++)
    for (let x = 0; x < L.w; x++) {
      if (!isW(x, y)) continue;
      const l = isW(x - 1, y) ? 0 : m;
      const rt = isW(x + 1, y) ? 0 : m;
      const tp = isW(x, y - 1) ? 0 : m;
      const bt = isW(x, y + 1) ? 0 : m;
      const rad = S * 0.2;
      const rr = [l && tp ? rad : 0, rt && tp ? rad : 0, rt && bt ? rad : 0, l && bt ? rad : 0];
      const grd = g.createLinearGradient(0, y * S, 0, (y + 1) * S);
      grd.addColorStop(0, st.water[1]);
      grd.addColorStop(1, st.water[0]);
      g.fillStyle = grd;
      g.beginPath();
      roundRect(g, x * S + l, y * S + tp, S - l - rt, S - tp - bt, rr);
      g.fill();
      if (tp) {
        g.fillStyle = 'rgba(0,20,60,0.25)';
        g.beginPath();
        roundRect(g, x * S + l, y * S + tp, S - l - rt, S * 0.1, [rr[0], rr[1], 0, 0]);
        g.fill();
      }
    }
  return { canvas: c, pad, th, width: W, height: H };
}

// ---------------------------------------------------------------------------
// Props (walls). Anchored at the bottom-centre of the cell.

const propCache = new Map();
export function propSprite(kind, S, worldKey, variant, dpr = 1) {
  const key = `${kind}|${S}|${worldKey}|${variant}|${dpr}`;
  let spr = propCache.get(key);
  if (spr) {
    propCache.delete(key); // most recently used last
    propCache.set(key, spr);
    return spr;
  }
  // Each board size makes its own sprites: keep only the most recent ones.
  if (propCache.size >= 96) propCache.delete(propCache.keys().next().value);
  const w = S * 1.3;
  const h = S * 1.9;
  const c = makeCanvas(w * dpr, h * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const cx = w / 2;
  const by = h - S * 0.18; // ground contact
  drawProp(g, kind, cx, by, S, variant);
  spr = { canvas: c, w, h, ax: cx, ay: by };
  propCache.set(key, spr);
  return spr;
}

function shadow(g, x, y, rx, ry, a = 0.25) {
  g.fillStyle = `rgba(20,10,40,${a})`;
  ellipse(g, x, y, rx, ry);
  g.fill();
}

function drawProp(g, kind, x, y, S, v) {
  const s = S;
  switch (kind) {
    case 'bush': {
      shadow(g, x, y, s * 0.42, s * 0.14);
      const cols = ['#3f9a55', '#4fb465', '#68cc7a'];
      const blobs = [
        [-0.2, -0.22, 0.26],
        [0.2, -0.24, 0.25],
        [0, -0.42, 0.28],
      ];
      blobs.forEach(([dx, dy, r], i) => {
        g.fillStyle = cols[0];
        ellipse(g, x + dx * s, y + dy * s, r * s, r * s * 0.95);
        g.fill();
      });
      blobs.forEach(([dx, dy, r]) => {
        g.fillStyle = cols[1];
        ellipse(g, x + dx * s - r * s * 0.12, y + dy * s - r * s * 0.15, r * s * 0.78, r * s * 0.7);
        g.fill();
      });
      g.fillStyle = cols[2];
      ellipse(g, x - s * 0.08, y - s * 0.52, s * 0.1, s * 0.07);
      g.fill();
      // berries
      g.fillStyle = v % 2 ? '#ff7a8a' : '#ffd36b';
      for (let i = 0; i < 3; i++) {
        ellipse(g, x + (i - 1) * s * 0.17, y - s * (0.3 + 0.1 * (i % 2)), s * 0.035, s * 0.035);
        g.fill();
      }
      break;
    }
    case 'rock':
    case 'snowrock': {
      shadow(g, x, y, s * 0.4, s * 0.13);
      g.fillStyle = kind === 'snowrock' ? '#8d9fbf' : '#8a8396';
      g.beginPath();
      g.moveTo(x - s * 0.38, y);
      g.quadraticCurveTo(x - s * 0.42, y - s * 0.38, x - s * 0.1, y - s * 0.5);
      g.quadraticCurveTo(x + s * 0.25, y - s * 0.6, x + s * 0.38, y - s * 0.2);
      g.quadraticCurveTo(x + s * 0.42, y, x + s * 0.3, y + s * 0.02);
      g.closePath();
      g.fill();
      g.fillStyle = kind === 'snowrock' ? '#b3c3dd' : '#aaa3b7';
      g.beginPath();
      g.moveTo(x - s * 0.3, y - s * 0.12);
      g.quadraticCurveTo(x - s * 0.32, y - s * 0.4, x - s * 0.08, y - s * 0.46);
      g.quadraticCurveTo(x + s * 0.12, y - s * 0.5, x + s * 0.2, y - s * 0.34);
      g.quadraticCurveTo(x, y - s * 0.3, x - s * 0.3, y - s * 0.12);
      g.fill();
      if (kind === 'snowrock') {
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.moveTo(x - s * 0.28, y - s * 0.3);
        g.quadraticCurveTo(x - s * 0.1, y - s * 0.62, x + s * 0.3, y - s * 0.32);
        g.quadraticCurveTo(x + s * 0.05, y - s * 0.38, x - s * 0.28, y - s * 0.3);
        g.fill();
      } else {
        g.fillStyle = '#6fae63';
        ellipse(g, x + s * 0.12, y - s * 0.47, s * 0.12, s * 0.05);
        g.fill();
      }
      break;
    }
    case 'tree':
    case 'darktree':
    case 'pine': {
      shadow(g, x, y, s * 0.36, s * 0.12);
      g.fillStyle = kind === 'darktree' ? '#2b2a3a' : '#7a4e31';
      g.beginPath();
      g.moveTo(x - s * 0.08, y);
      g.lineTo(x - s * 0.05, y - s * 0.5);
      g.lineTo(x + s * 0.05, y - s * 0.5);
      g.lineTo(x + s * 0.09, y);
      g.closePath();
      g.fill();
      if (kind === 'pine') {
        for (let i = 0; i < 3; i++) {
          const ty = y - s * (0.35 + i * 0.32);
          const tw = s * (0.45 - i * 0.1);
          g.fillStyle = '#2f7a5e';
          g.beginPath();
          g.moveTo(x - tw, ty);
          g.lineTo(x, ty - s * 0.42);
          g.lineTo(x + tw, ty);
          g.closePath();
          g.fill();
          g.fillStyle = '#f4f9ff';
          g.beginPath();
          g.moveTo(x - tw * 0.55, ty - s * 0.2);
          g.lineTo(x, ty - s * 0.42);
          g.lineTo(x + tw * 0.55, ty - s * 0.2);
          g.quadraticCurveTo(x, ty - s * 0.12, x - tw * 0.55, ty - s * 0.2);
          g.fill();
        }
      } else if (kind === 'darktree') {
        g.strokeStyle = '#2b2a3a';
        g.lineWidth = s * 0.06;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x, y - s * 0.45);
        g.quadraticCurveTo(x - s * 0.3, y - s * 0.7, x - s * 0.32, y - s * 0.95);
        g.moveTo(x, y - s * 0.5);
        g.quadraticCurveTo(x + s * 0.3, y - s * 0.75, x + s * 0.25, y - s * 1.05);
        g.stroke();
        const cols = ['#1d3d3f', '#285254'];
        [[-0.25, -0.95, 0.3], [0.22, -1.05, 0.3], [0, -1.2, 0.32]].forEach(([dx, dy, r], i) => {
          g.fillStyle = cols[i % 2];
          ellipse(g, x + dx * s, y + dy * s, r * s, r * s * 0.85);
          g.fill();
        });
        g.fillStyle = '#c9a8ff';
        for (let i = 0; i < 4; i++) {
          ellipse(g, x + (hash2(v, i) - 0.5) * s * 0.6, y - s * (0.9 + hash2(i, v) * 0.4), s * 0.025, s * 0.025);
          g.fill();
        }
      } else {
        const cols = ['#3c9a5a', '#55b86e', '#7bd68a'];
        g.fillStyle = cols[0];
        ellipse(g, x, y - s * 0.85, s * 0.42, s * 0.4);
        g.fill();
        g.fillStyle = cols[1];
        ellipse(g, x - s * 0.06, y - s * 0.92, s * 0.33, s * 0.3);
        g.fill();
        g.fillStyle = cols[2];
        ellipse(g, x - s * 0.14, y - s * 1.02, s * 0.12, s * 0.08);
        g.fill();
        if (v % 3 === 0) {
          g.fillStyle = '#ff8f6b';
          ellipse(g, x + s * 0.18, y - s * 0.8, s * 0.04, s * 0.04);
          g.fill();
          ellipse(g, x - s * 0.2, y - s * 0.74, s * 0.04, s * 0.04);
          g.fill();
        }
      }
      break;
    }
    case 'flowers': {
      shadow(g, x, y, s * 0.36, s * 0.1);
      g.fillStyle = '#4fb465';
      ellipse(g, x, y - s * 0.2, s * 0.36, s * 0.24);
      g.fill();
      const cols = ['#ff9ec7', '#ffe07a', '#a8b8ff'];
      for (let i = 0; i < 5; i++) {
        const fx = x + (i - 2) * s * 0.13;
        const fy = y - s * (0.3 + 0.12 * ((i * 3) % 2));
        g.fillStyle = cols[(i + v) % 3];
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * TAU;
          ellipse(g, fx + Math.cos(a) * s * 0.035, fy + Math.sin(a) * s * 0.035, s * 0.03, s * 0.03);
          g.fill();
        }
        g.fillStyle = '#fff6c2';
        ellipse(g, fx, fy, s * 0.022, s * 0.022);
        g.fill();
      }
      break;
    }
    case 'reeds': {
      shadow(g, x, y, s * 0.3, s * 0.1);
      for (let i = 0; i < 5; i++) {
        const rx = x + (i - 2) * s * 0.09;
        const hgt = s * (0.55 + 0.25 * hash2(i, v));
        g.strokeStyle = i % 2 ? '#3f8f5a' : '#57a96c';
        g.lineWidth = s * 0.045;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(rx, y);
        g.quadraticCurveTo(rx + s * 0.05, y - hgt * 0.6, rx + (i - 2) * s * 0.04, y - hgt);
        g.stroke();
        if (i % 2 === 0) {
          g.fillStyle = '#7a4f34';
          ellipse(g, rx + (i - 2) * s * 0.035, y - hgt * 0.85, s * 0.035, s * 0.1);
          g.fill();
        }
      }
      break;
    }
    case 'stump': {
      shadow(g, x, y, s * 0.34, s * 0.11);
      g.fillStyle = '#7b5034';
      g.beginPath();
      roundRect(g, x - s * 0.26, y - s * 0.36, s * 0.52, s * 0.38, s * 0.08);
      g.fill();
      g.fillStyle = '#d6a678';
      ellipse(g, x, y - s * 0.36, s * 0.26, s * 0.1);
      g.fill();
      g.strokeStyle = '#a77a52';
      g.lineWidth = s * 0.02;
      ellipse(g, x, y - s * 0.36, s * 0.14, s * 0.05);
      g.stroke();
      g.fillStyle = '#69b56b';
      ellipse(g, x - s * 0.2, y - s * 0.05, s * 0.1, s * 0.06);
      g.fill();
      break;
    }
    case 'bigshroom': {
      shadow(g, x, y, s * 0.38, s * 0.12);
      g.fillStyle = '#f1e3d3';
      g.beginPath();
      roundRect(g, x - s * 0.1, y - s * 0.55, s * 0.2, s * 0.56, s * 0.08);
      g.fill();
      const cap = v % 2 ? ['#7a4cff', '#a98bff'] : ['#2fb7c4', '#7fe3ea'];
      g.fillStyle = cap[0];
      g.beginPath();
      g.moveTo(x - s * 0.44, y - s * 0.52);
      g.quadraticCurveTo(x - s * 0.4, y - s * 1.05, x, y - s * 1.06);
      g.quadraticCurveTo(x + s * 0.4, y - s * 1.05, x + s * 0.44, y - s * 0.52);
      g.quadraticCurveTo(x, y - s * 0.44, x - s * 0.44, y - s * 0.52);
      g.fill();
      g.fillStyle = cap[1];
      for (let i = 0; i < 4; i++) {
        ellipse(g, x + (i - 1.5) * s * 0.17, y - s * (0.75 + 0.12 * (i % 2)), s * 0.05, s * 0.04);
        g.fill();
      }
      break;
    }
    case 'fern': {
      shadow(g, x, y, s * 0.34, s * 0.1);
      g.strokeStyle = '#4bb07c';
      g.lineWidth = s * 0.05;
      g.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.42;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + Math.cos(a) * s * 0.3, y + Math.sin(a) * s * 0.5, x + Math.cos(a) * s * 0.45, y + Math.sin(a) * s * 0.45);
        g.stroke();
      }
      g.fillStyle = '#ff9df0';
      ellipse(g, x + s * 0.05, y - s * 0.32, s * 0.04, s * 0.04);
      g.fill();
      break;
    }
    case 'pillar':
    case 'brokenpillar': {
      shadow(g, x, y, s * 0.34, s * 0.11);
      const top = kind === 'pillar' ? s * 1.15 : s * 0.62;
      g.fillStyle = '#9aa4c4';
      g.beginPath();
      roundRect(g, x - s * 0.3, y - s * 0.16, s * 0.6, s * 0.18, s * 0.04);
      g.fill();
      g.fillStyle = '#c9d0e6';
      g.fillRect(x - s * 0.2, y - top, s * 0.4, top - s * 0.14);
      g.fillStyle = '#b2bad6';
      for (let i = 0; i < 3; i++) g.fillRect(x - s * 0.12 + i * s * 0.1, y - top, s * 0.03, top - s * 0.14);
      if (kind === 'pillar') {
        g.fillStyle = '#dfe5f5';
        g.beginPath();
        roundRect(g, x - s * 0.28, y - top - s * 0.12, s * 0.56, s * 0.14, s * 0.04);
        g.fill();
        g.fillStyle = '#5fe2ef';
        ellipse(g, x, y - top * 0.55, s * 0.05, s * 0.05);
        g.fill();
      } else {
        g.fillStyle = '#dfe5f5';
        g.beginPath();
        g.moveTo(x - s * 0.2, y - top);
        g.lineTo(x - s * 0.05, y - top - s * 0.12);
        g.lineTo(x + s * 0.06, y - top - s * 0.04);
        g.lineTo(x + s * 0.2, y - top - s * 0.14);
        g.lineTo(x + s * 0.2, y - top);
        g.fill();
        g.fillStyle = '#7fbf86';
        ellipse(g, x + s * 0.14, y - s * 0.2, s * 0.09, s * 0.05);
        g.fill();
      }
      break;
    }
    case 'block': {
      shadow(g, x, y, s * 0.38, s * 0.12);
      g.fillStyle = '#8f99bb';
      g.beginPath();
      roundRect(g, x - s * 0.36, y - s * 0.5, s * 0.72, s * 0.52, s * 0.06);
      g.fill();
      g.fillStyle = '#b8c1dc';
      g.beginPath();
      roundRect(g, x - s * 0.36, y - s * 0.58, s * 0.72, s * 0.2, s * 0.06);
      g.fill();
      g.strokeStyle = '#69e6ff';
      g.lineWidth = s * 0.03;
      g.beginPath();
      g.arc(x, y - s * 0.22, s * 0.1, 0, TAU);
      g.moveTo(x, y - s * 0.36);
      g.lineTo(x, y - s * 0.08);
      g.stroke();
      break;
    }
    case 'thorns': {
      shadow(g, x, y, s * 0.38, s * 0.12);
      g.strokeStyle = '#3a2f52';
      g.lineWidth = s * 0.07;
      g.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i - 1.5) * 0.5;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + Math.cos(a + 0.6) * s * 0.3, y + Math.sin(a) * s * 0.3, x + Math.cos(a) * s * 0.42, y + Math.sin(a) * s * 0.6);
        g.stroke();
      }
      g.fillStyle = '#8a6bd6';
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.3;
        const px = x + Math.cos(a) * s * 0.32;
        const py = y + Math.sin(a) * s * 0.42;
        g.beginPath();
        g.moveTo(px, py - s * 0.06);
        g.lineTo(px + s * 0.03, py);
        g.lineTo(px - s * 0.03, py);
        g.fill();
      }
      break;
    }
    case 'prism': {
      shadow(g, x, y, s * 0.32, s * 0.1);
      const shards = [
        [-0.17, 0.46, 0.1, '#c9a6ff', '#efe2ff'],
        [0.17, 0.4, 0.09, '#ffb3cf', '#ffe6f0'],
        [0.02, 0.78, 0.13, '#9fe8e0', '#e6fffb'],
        [-0.04, 0.34, 0.08, '#ffd59a', '#fff3dc'],
      ];
      const tilt = (v - 3) * 0.02;
      for (const [dx, hh, ww, col, light] of shards) {
        const bx = x + dx * s;
        const tx = bx + tilt * s + dx * s * 0.25;
        const ty = y - hh * s;
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(bx - ww * s, y);
        g.lineTo(bx - ww * s * 0.85, y - hh * s * 0.72);
        g.lineTo(tx, ty);
        g.lineTo(bx + ww * s * 0.85, y - hh * s * 0.72);
        g.lineTo(bx + ww * s, y);
        g.closePath();
        g.fill();
        // Lit facet.
        g.fillStyle = light;
        g.beginPath();
        g.moveTo(bx - ww * s * 0.85, y - hh * s * 0.72);
        g.lineTo(tx, ty);
        g.lineTo(bx - ww * s * 0.05, y - hh * s * 0.55);
        g.lineTo(bx - ww * s * 0.35, y - s * 0.02);
        g.lineTo(bx - ww * s, y);
        g.closePath();
        g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,0.85)';
      star(g, x + 0.06 * s, y - 0.7 * s, s * 0.05, 4, 0.3);
      break;
    }
    case 'crystal': {
      shadow(g, x, y, s * 0.3, s * 0.1);
      const cols = ['#9ad8ff', '#d4f0ff', '#6bb5f0'];
      [[-0.14, 0.5, 0.12], [0.1, 0.72, 0.14], [0.24, 0.38, 0.09]].forEach(([dx, hh, ww], i) => {
        g.fillStyle = cols[i];
        g.beginPath();
        g.moveTo(x + dx * s - ww * s, y);
        g.lineTo(x + dx * s - ww * s * 0.8, y - hh * s * 0.75);
        g.lineTo(x + dx * s, y - hh * s);
        g.lineTo(x + dx * s + ww * s * 0.8, y - hh * s * 0.75);
        g.lineTo(x + dx * s + ww * s, y);
        g.fill();
      });
      break;
    }
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Lumignons

/**
 * Draws a Lumignon standing at (x, y) (feet position).
 * o: { color, dir, t, size, mood: 'idle'|'happy'|'scared'|'sad'|'sleep', squash, flame (0..1),
 *      hat, alpha, blink, walk (0..1 walking phase), glowAmt }
 */
export function drawLumi(g, x, y, S, o) {
  const P = LUMI[o.color ?? 0];
  const t = o.t || 0;
  const sq = o.squash ?? 0; // >0 squashed, <0 stretched
  const sx = 1 + sq * 0.35;
  const sy = 1 - sq * 0.35;
  const s = S * 0.92;
  const flame = o.flame ?? 1;
  const bodyW = s * 0.34 * sx;
  const bodyH = s * 0.36 * sy;
  const cy = y - bodyH;
  g.save();
  g.globalAlpha *= o.alpha ?? 1;
  // Glow.
  if (flame > 0) glow(g, x, cy - bodyH * 0.6, s * (0.85 + 0.06 * Math.sin(t * 6)) * (o.glowAmt ?? 1), P.glow, 0.55 * flame);
  // Shadow.
  if (!o.noShadow) {
    g.fillStyle = 'rgba(20,10,40,0.28)';
    ellipse(g, x, y, s * 0.26 * sx, s * 0.08);
    g.fill();
  }
  // Feet.
  const walk = o.walk ?? 0;
  const lift = Math.sin(walk * TAU) * s * 0.04;
  g.fillStyle = P.line;
  ellipse(g, x - s * 0.12, y - s * 0.03 - Math.max(0, lift), s * 0.08, s * 0.05);
  g.fill();
  ellipse(g, x + s * 0.12, y - s * 0.03 - Math.max(0, -lift), s * 0.08, s * 0.05);
  g.fill();
  // Body (soft wax drop).
  const grd = g.createLinearGradient(0, cy - bodyH, 0, cy + bodyH);
  const dead = o.mood === 'sad' && flame <= 0;
  grd.addColorStop(0, dead ? '#d8d3e3' : P.body);
  grd.addColorStop(1, dead ? '#a9a2bb' : P.shade);
  g.fillStyle = grd;
  g.strokeStyle = P.line;
  g.lineWidth = Math.max(1.2, s * 0.035);
  g.beginPath();
  g.moveTo(x, cy - bodyH * 1.05);
  g.bezierCurveTo(x + bodyW * 0.75, cy - bodyH * 1.02, x + bodyW * 1.08, cy - bodyH * 0.2, x + bodyW, cy + bodyH * 0.45);
  g.bezierCurveTo(x + bodyW * 0.92, cy + bodyH * 1.0, x - bodyW * 0.92, cy + bodyH * 1.0, x - bodyW, cy + bodyH * 0.45);
  g.bezierCurveTo(x - bodyW * 1.08, cy - bodyH * 0.2, x - bodyW * 0.75, cy - bodyH * 1.02, x, cy - bodyH * 1.05);
  g.fill();
  g.stroke();
  // Wax drip highlight.
  g.fillStyle = 'rgba(255,255,255,0.55)';
  ellipse(g, x - bodyW * 0.45, cy - bodyH * 0.45, bodyW * 0.18, bodyH * 0.28);
  g.fill();
  // Face.
  const dir = o.dir ?? 2;
  const lx = dir === 1 ? 0.22 : dir === 3 ? -0.22 : 0;
  const ly = dir === 0 ? -0.22 : dir === 2 ? 0.08 : 0;
  const fx = x + bodyW * lx;
  const fy = cy + bodyH * (0.05 + ly);
  const eyeDX = bodyW * 0.36;
  const mood = o.mood || 'idle';
  const blink = o.blink ?? 0;
  g.fillStyle = '#2b1d33';
  g.strokeStyle = '#2b1d33';
  g.lineCap = 'round';
  g.lineWidth = Math.max(1.2, s * 0.035);
  if (dir === 0 && mood === 'idle') {
    // Seen from the back: tiny wick knot only.
    g.fillStyle = rgba('#000000', 0.12);
    ellipse(g, x, cy + bodyH * 0.25, bodyW * 0.3, bodyH * 0.12);
    g.fill();
  } else if (mood === 'happy') {
    for (const sgn of [-1, 1]) {
      g.beginPath();
      g.arc(fx + sgn * eyeDX, fy + s * 0.01, s * 0.045, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    }
  } else if (mood === 'sleep' || blink > 0.5 || (mood === 'sad' && flame <= 0)) {
    for (const sgn of [-1, 1]) {
      g.beginPath();
      g.moveTo(fx + sgn * eyeDX - s * 0.04, fy);
      g.lineTo(fx + sgn * eyeDX + s * 0.04, fy + (mood === 'sad' ? s * 0.015 : 0));
      g.stroke();
    }
  } else {
    const er = mood === 'scared' ? s * 0.055 : s * 0.045;
    for (const sgn of [-1, 1]) {
      g.fillStyle = '#2b1d33';
      ellipse(g, fx + sgn * eyeDX, fy, er * 0.85, er * (mood === 'scared' ? 1.25 : 1.1));
      g.fill();
      g.fillStyle = '#ffffff';
      ellipse(g, fx + sgn * eyeDX - er * 0.25, fy - er * 0.4, er * 0.35, er * 0.35);
      g.fill();
    }
  }
  if (dir !== 0 || mood !== 'idle') {
    // Cheeks.
    g.fillStyle = 'rgba(255,110,130,0.45)';
    ellipse(g, fx - eyeDX * 1.45, fy + s * 0.05, s * 0.045, s * 0.028);
    g.fill();
    ellipse(g, fx + eyeDX * 1.45, fy + s * 0.05, s * 0.045, s * 0.028);
    g.fill();
    // Mouth.
    g.strokeStyle = '#2b1d33';
    g.lineWidth = Math.max(1, s * 0.03);
    g.beginPath();
    if (mood === 'scared') {
      g.fillStyle = '#2b1d33';
      ellipse(g, fx, fy + s * 0.08, s * 0.03, s * 0.04);
      g.fill();
    } else if (mood === 'sad') {
      g.arc(fx, fy + s * 0.11, s * 0.035, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    } else {
      g.arc(fx, fy + s * 0.04, s * (mood === 'happy' ? 0.05 : 0.032), Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();
    }
  }
  if (o.symbol && flame > 0) colorSymbol(g, o.color ?? 0, x, cy + bodyH * 0.62, s * 0.055, P.flame, '#ffffff');
  // Hat (cosmetic) sits on the head, behind the flame.
  const headY = cy - bodyH * 1.0;
  if (o.hat) drawHat(g, x, headY, s, o.hat, t);
  // Flame.
  if (flame > 0) {
    const fl = flame * (1 + 0.08 * Math.sin(t * 13 + x) + 0.05 * Math.sin(t * 21));
    const fh = s * 0.3 * fl;
    const fw = s * 0.12 * flame;
    const wob = Math.sin(t * 9 + y) * s * 0.02;
    const fy0 = headY + s * 0.02 - (o.hat ? s * 0.05 : 0);
    g.fillStyle = P.flame;
    g.beginPath();
    g.moveTo(x - fw, fy0);
    g.quadraticCurveTo(x - fw * 1.1, fy0 - fh * 0.55, x + wob, fy0 - fh);
    g.quadraticCurveTo(x + fw * 1.1, fy0 - fh * 0.55, x + fw, fy0);
    g.quadraticCurveTo(x, fy0 + fw * 0.6, x - fw, fy0);
    g.fill();
    g.fillStyle = P.core;
    g.beginPath();
    g.moveTo(x - fw * 0.5, fy0 - fh * 0.05);
    g.quadraticCurveTo(x - fw * 0.5, fy0 - fh * 0.45, x + wob * 0.6, fy0 - fh * 0.68);
    g.quadraticCurveTo(x + fw * 0.5, fy0 - fh * 0.45, x + fw * 0.5, fy0 - fh * 0.05);
    g.quadraticCurveTo(x, fy0 + fw * 0.2, x - fw * 0.5, fy0 - fh * 0.05);
    g.fill();
  } else {
    // Smoke wisp of an extinguished wick.
    g.strokeStyle = 'rgba(80,70,90,0.8)';
    g.lineWidth = s * 0.03;
    g.beginPath();
    g.moveTo(x, headY);
    g.lineTo(x, headY - s * 0.06);
    g.stroke();
  }
  g.restore();
}

export const HATS = ['none', 'leaf', 'acorn', 'flowers', 'mushroom', 'nightcap', 'lily', 'wizard', 'moon', 'feather', 'crown', 'halo'];

export function drawHat(g, x, y, s, hat, t = 0) {
  g.save();
  switch (hat) {
    case 'leaf':
      g.fillStyle = '#5dc46d';
      g.beginPath();
      g.moveTo(x + s * 0.02, y + s * 0.02);
      g.quadraticCurveTo(x + s * 0.25, y - s * 0.12, x + s * 0.3, y + s * 0.02);
      g.quadraticCurveTo(x + s * 0.16, y + s * 0.08, x + s * 0.02, y + s * 0.02);
      g.fill();
      g.strokeStyle = '#3c8f4d';
      g.lineWidth = s * 0.015;
      g.beginPath();
      g.moveTo(x + s * 0.03, y + s * 0.02);
      g.lineTo(x + s * 0.26, y);
      g.stroke();
      break;
    case 'acorn':
      g.fillStyle = '#8a5a35';
      g.beginPath();
      g.ellipse(x, y + s * 0.02, s * 0.2, s * 0.09, 0, Math.PI, TAU);
      g.fill();
      g.strokeStyle = '#6b4325';
      g.lineWidth = s * 0.012;
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.moveTo(x + i * s * 0.06, y - s * 0.06);
        g.lineTo(x + i * s * 0.07, y + s * 0.02);
        g.stroke();
      }
      break;
    case 'flowers':
      for (let i = -2; i <= 2; i++) {
        const fx = x + i * s * 0.08;
        const fy = y + s * 0.03 - Math.cos(i * 0.6) * s * 0.03;
        g.fillStyle = ['#ff9ec7', '#ffe07a', '#a8b8ff', '#ffb07a', '#ff9ec7'][i + 2];
        ellipse(g, fx, fy, s * 0.045, s * 0.045);
        g.fill();
        g.fillStyle = '#fff6c2';
        ellipse(g, fx, fy, s * 0.018, s * 0.018);
        g.fill();
      }
      break;
    case 'mushroom':
      g.fillStyle = '#e8473f';
      g.beginPath();
      g.ellipse(x, y + s * 0.03, s * 0.24, s * 0.14, 0, Math.PI, TAU);
      g.fill();
      g.fillStyle = '#fff';
      ellipse(g, x - s * 0.1, y - s * 0.03, s * 0.035, s * 0.025);
      g.fill();
      ellipse(g, x + s * 0.08, y - s * 0.06, s * 0.03, s * 0.022);
      g.fill();
      break;
    case 'nightcap':
      g.fillStyle = '#5b7cff';
      g.beginPath();
      g.moveTo(x - s * 0.2, y + s * 0.03);
      g.quadraticCurveTo(x - s * 0.1, y - s * 0.28, x + s * 0.28, y - s * 0.18);
      g.quadraticCurveTo(x + s * 0.1, y - s * 0.1, x + s * 0.2, y + s * 0.03);
      g.closePath();
      g.fill();
      g.fillStyle = '#ffffff';
      ellipse(g, x + s * 0.29, y - s * 0.18, s * 0.05, s * 0.05);
      g.fill();
      g.fillRect(x - s * 0.21, y, s * 0.42, s * 0.05);
      break;
    case 'lily':
      g.fillStyle = '#58c27a';
      ellipse(g, x, y + s * 0.02, s * 0.24, s * 0.07);
      g.fill();
      g.fillStyle = '#ffc4de';
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * TAU;
        g.beginPath();
        g.ellipse(x + Math.cos(a) * s * 0.04, y - s * 0.03 + Math.sin(a) * s * 0.02, s * 0.03, s * 0.06, a, 0, TAU);
        g.fill();
      }
      break;
    case 'wizard':
      g.fillStyle = '#5a3fb0';
      g.beginPath();
      g.moveTo(x - s * 0.24, y + s * 0.04);
      g.lineTo(x + s * 0.04, y - s * 0.4);
      g.lineTo(x + s * 0.24, y + s * 0.04);
      g.closePath();
      g.fill();
      g.fillStyle = '#ffe27a';
      star(g, x + s * 0.02, y - s * 0.14, s * 0.05, 5);
      g.fillStyle = '#3e2a85';
      g.fillRect(x - s * 0.28, y + s * 0.01, s * 0.56, s * 0.05);
      break;
    case 'moon':
      g.fillStyle = '#dfe7ff';
      g.beginPath();
      g.ellipse(x, y + s * 0.03, s * 0.22, s * 0.15, 0, Math.PI, TAU);
      g.fill();
      g.fillStyle = '#69e6ff';
      g.beginPath();
      g.arc(x, y - s * 0.04, s * 0.05, 0, TAU);
      g.fill();
      break;
    case 'feather':
      g.strokeStyle = '#ff7ab6';
      g.lineWidth = s * 0.06;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x + s * 0.05, y + s * 0.02);
      g.quadraticCurveTo(x + s * 0.25, y - s * 0.2, x + s * 0.12, y - s * 0.36);
      g.stroke();
      g.strokeStyle = '#ffd1e6';
      g.lineWidth = s * 0.02;
      g.stroke();
      break;
    case 'crown':
      g.fillStyle = '#ffcf4a';
      g.beginPath();
      g.moveTo(x - s * 0.18, y + s * 0.03);
      g.lineTo(x - s * 0.2, y - s * 0.12);
      g.lineTo(x - s * 0.08, y - s * 0.04);
      g.lineTo(x, y - s * 0.16);
      g.lineTo(x + s * 0.08, y - s * 0.04);
      g.lineTo(x + s * 0.2, y - s * 0.12);
      g.lineTo(x + s * 0.18, y + s * 0.03);
      g.closePath();
      g.fill();
      g.fillStyle = '#ff5d8f';
      ellipse(g, x, y - s * 0.02, s * 0.025, s * 0.025);
      g.fill();
      break;
    case 'prism': {
      // Crystal tiara: a silver band and three dawn-coloured shards.
      g.strokeStyle = '#e9e4ff';
      g.lineWidth = s * 0.028;
      g.beginPath();
      g.moveTo(x - s * 0.19, y + s * 0.02);
      g.quadraticCurveTo(x, y - s * 0.05, x + s * 0.19, y + s * 0.02);
      g.stroke();
      [[-0.11, 0.13, '#c9a6ff'], [0, 0.2, '#9fe8e0'], [0.11, 0.13, '#ffb3cf']].forEach(([dx, hh, col]) => {
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(x + dx * s - s * 0.035, y - s * 0.015);
        g.lineTo(x + dx * s, y - hh * s);
        g.lineTo(x + dx * s + s * 0.035, y - s * 0.015);
        g.closePath();
        g.fill();
      });
      g.fillStyle = `rgba(255,255,255,${0.6 + 0.4 * Math.sin(t * 3)})`;
      star(g, x + s * 0.02, y - s * 0.2, s * 0.03, 4, 0.3);
      break;
    }
    case 'halo': {
      g.strokeStyle = '#fff3a6';
      g.lineWidth = s * 0.025;
      g.beginPath();
      g.ellipse(x, y - s * 0.12, s * 0.2, s * 0.06, 0, 0, TAU);
      g.stroke();
      g.fillStyle = '#fff3a6';
      for (let i = 0; i < 5; i++) {
        const a = t * 1.5 + (i / 5) * TAU;
        star(g, x + Math.cos(a) * s * 0.2, y - s * 0.12 + Math.sin(a) * s * 0.06, s * 0.03, 4);
      }
      break;
    }
    default:
      break;
  }
  g.restore();
}

export function star(g, x, y, r, n = 5, inner = 0.45) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const rr = i % 2 ? r * inner : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

// ---------------------------------------------------------------------------
// Gloomnibs

export function drawGloomnib(g, x, y, S, o) {
  const t = o.t || 0;
  const s = S * 0.95;
  const sq = o.squash ?? 0;
  const bw = s * 0.32 * (1 + sq * 0.3);
  const bh = s * 0.4 * (1 - sq * 0.3);
  const cy = y - bh * 0.85;
  g.save();
  g.globalAlpha *= o.alpha ?? 1;
  glow(g, x, cy, s * 0.7, 'rgba(150,90,255,', 0.35);
  g.fillStyle = 'rgba(10,0,20,0.35)';
  ellipse(g, x, y, s * 0.24, s * 0.07);
  g.fill();
  // Body: wobbly shadow blob with a wavy hem.
  const grd = g.createLinearGradient(0, cy - bh, 0, cy + bh);
  grd.addColorStop(0, '#4b3a7a');
  grd.addColorStop(1, '#1c1233');
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(x - bw, cy + bh * 0.6);
  g.bezierCurveTo(x - bw * 1.1, cy - bh * 0.6, x - bw * 0.6, cy - bh * 1.1, x, cy - bh * 1.05);
  g.bezierCurveTo(x + bw * 0.6, cy - bh * 1.1, x + bw * 1.1, cy - bh * 0.6, x + bw, cy + bh * 0.6);
  for (let i = 0; i <= 4; i++) {
    const hx = x + bw - (i / 4) * bw * 2;
    const hy = cy + bh * (0.75 + 0.18 * Math.sin(t * 8 + i * 1.7));
    g.quadraticCurveTo(hx + bw * 0.25, hy + bh * 0.25, hx, hy);
  }
  g.closePath();
  g.fill();
  // Little ears.
  g.beginPath();
  g.moveTo(x - bw * 0.7, cy - bh * 0.75);
  g.lineTo(x - bw * 0.85, cy - bh * 1.25);
  g.lineTo(x - bw * 0.3, cy - bh * 0.95);
  g.moveTo(x + bw * 0.7, cy - bh * 0.75);
  g.lineTo(x + bw * 0.85, cy - bh * 1.25);
  g.lineTo(x + bw * 0.3, cy - bh * 0.95);
  g.fillStyle = '#4b3a7a';
  g.fill();
  // Eyes.
  const dir = o.dir ?? 2;
  const lx = dir === 1 ? 0.25 : dir === 3 ? -0.25 : 0;
  const ly = dir === 0 ? -0.2 : 0.05;
  const ex = x + bw * lx;
  const ey = cy - bh * 0.15 + bh * ly;
  if (o.sleeping) {
    g.strokeStyle = '#ffe680';
    g.lineWidth = s * 0.03;
    g.lineCap = 'round';
    for (const sgn of [-1, 1]) {
      g.beginPath();
      g.arc(ex + sgn * bw * 0.35, ey - s * 0.01, s * 0.04, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();
    }
  } else {
    glow(g, ex, ey, s * 0.25, 'rgba(255,230,100,', 0.5);
    g.fillStyle = '#ffe680';
    for (const sgn of [-1, 1]) {
      g.beginPath();
      g.ellipse(ex + sgn * bw * 0.35, ey, s * 0.055, s * 0.04, sgn * 0.3, 0, TAU);
      g.fill();
    }
    g.fillStyle = '#1c1233';
    for (const sgn of [-1, 1]) {
      ellipse(g, ex + sgn * bw * 0.35 + lx * s * 0.03, ey, s * 0.018, s * 0.03);
      g.fill();
    }
    // Grin with a tiny fang.
    g.strokeStyle = '#ffe680';
    g.lineWidth = s * 0.02;
    g.beginPath();
    g.arc(ex, ey + s * 0.07, s * 0.06, Math.PI * 0.2, Math.PI * 0.8);
    g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------------------
// Board items

export function drawLantern(g, x, y, S, color, o = {}) {
  const P = LUMI[color];
  const t = o.t || 0;
  const s = S;
  const lit = o.lit ?? 1; // 0..1 brightness of the glass
  const flash = o.flash || 0;
  if (lit > 0.05) glow(g, x, y - s * 0.5, s * (1.1 + flash * 1.2 + 0.05 * Math.sin(t * 3)), P.glow, 0.45 * lit + flash * 0.6);
  g.fillStyle = 'rgba(20,10,40,0.3)';
  ellipse(g, x, y, s * 0.3, s * 0.09);
  g.fill();
  // Stone base.
  g.fillStyle = '#6d6680';
  g.beginPath();
  roundRect(g, x - s * 0.26, y - s * 0.16, s * 0.52, s * 0.18, s * 0.05);
  g.fill();
  g.fillStyle = '#8d86a2';
  g.beginPath();
  roundRect(g, x - s * 0.26, y - s * 0.2, s * 0.52, s * 0.08, s * 0.04);
  g.fill();
  // Body frame.
  const bx = x - s * 0.2;
  const by = y - s * 0.78;
  const bw = s * 0.4;
  const bh = s * 0.58;
  g.fillStyle = '#3d2f4d';
  g.beginPath();
  roundRect(g, bx, by, bw, bh, s * 0.07);
  g.fill();
  // Glass.
  const glass = g.createLinearGradient(0, by, 0, by + bh);
  const dark = '#2a2440';
  if (lit > 0.05) {
    glass.addColorStop(0, mix(dark, P.core, lit));
    glass.addColorStop(1, mix(dark, P.flame, lit));
  } else {
    glass.addColorStop(0, '#3a3456');
    glass.addColorStop(1, '#262038');
  }
  g.fillStyle = glass;
  g.beginPath();
  roundRect(g, bx + s * 0.05, by + s * 0.06, bw - s * 0.1, bh - s * 0.1, s * 0.05);
  g.fill();
  // Coloured frame bands so the colour reads even when dark.
  g.fillStyle = P.ui;
  g.fillRect(bx + s * 0.02, by + bh - s * 0.07, bw - s * 0.04, s * 0.04);
  g.fillRect(bx + s * 0.02, by + s * 0.02, bw - s * 0.04, s * 0.035);
  // Roof.
  g.fillStyle = P.line;
  g.beginPath();
  g.moveTo(x - s * 0.3, by + s * 0.04);
  g.quadraticCurveTo(x, by - s * 0.26, x + s * 0.3, by + s * 0.04);
  g.closePath();
  g.fill();
  g.fillStyle = P.ui;
  ellipse(g, x, by - s * 0.15, s * 0.05, s * 0.05);
  g.fill();
  if (o.symbol) colorSymbol(g, color, x, y - s * 0.09, s * 0.06, P.ui, '#2b1d33');
  // Inside: a flame if somebody is home, a keyhole-spark if locked.
  if (o.locked) {
    g.fillStyle = P.ui;
    g.globalAlpha *= 0.9;
    star(g, x, by + bh * 0.48, s * 0.09, 4, 0.4);
    g.globalAlpha = 1;
  } else if (o.home) {
    g.fillStyle = P.core;
    g.beginPath();
    const fh = s * 0.2 * (1 + 0.1 * Math.sin(t * 11));
    g.moveTo(x - s * 0.06, by + bh * 0.7);
    g.quadraticCurveTo(x - s * 0.07, by + bh * 0.45, x, by + bh * 0.7 - fh);
    g.quadraticCurveTo(x + s * 0.07, by + bh * 0.45, x + s * 0.06, by + bh * 0.7);
    g.fill();
  } else {
    // Open door: a soft arch.
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath();
    roundRect(g, x - s * 0.08, by + bh * 0.4, s * 0.16, bh * 0.45, [s * 0.08, s * 0.08, 0, 0]);
    g.fill();
  }
}

export function drawArrowStone(g, x, y, S, dir, o = {}) {
  const s = S;
  const fixed = !!o.fixed;
  const lift = o.lift || 0;
  const scale = o.scale ?? 1;
  g.save();
  g.translate(x, y - lift);
  g.scale(scale, scale);
  if (!o.ghost) {
    g.fillStyle = 'rgba(20,10,40,0.25)';
    ellipse(g, 0, s * 0.06 + lift, s * 0.36, s * 0.3);
    g.fill();
  }
  g.globalAlpha *= o.ghost ? 0.55 : 1;
  // Stone disc.
  const r = s * 0.36;
  g.fillStyle = fixed ? '#5e5a73' : '#efe6d2';
  ellipse(g, 0, 0, r, r * 0.92);
  g.fill();
  g.fillStyle = fixed ? '#7b7694' : '#fffaf0';
  ellipse(g, 0, -s * 0.03, r * 0.9, r * 0.8);
  g.fill();
  if (!fixed) {
    g.strokeStyle = o.highlight ? '#ffffff' : 'rgba(255,214,120,0.9)';
    g.lineWidth = s * 0.035;
    ellipse(g, 0, -s * 0.03, r * 0.9, r * 0.8);
    g.stroke();
  }
  // Arrow rune.
  g.rotate((dir * Math.PI) / 2);
  const col = fixed ? '#ffd36b' : '#ff9a1f';
  if (!o.ghost) glow(g, 0, 0, s * 0.35, fixed ? 'rgba(255,210,100,' : 'rgba(255,160,60,', 0.25);
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(0, -s * 0.24);
  g.lineTo(s * 0.17, -s * 0.03);
  g.lineTo(s * 0.065, -s * 0.03);
  g.lineTo(s * 0.065, s * 0.2);
  g.lineTo(-s * 0.065, s * 0.2);
  g.lineTo(-s * 0.065, -s * 0.03);
  g.lineTo(-s * 0.17, -s * 0.03);
  g.closePath();
  g.fill();
  if (fixed) {
    g.strokeStyle = 'rgba(40,30,60,0.6)';
    g.lineWidth = s * 0.02;
    g.stroke();
  }
  g.restore();
}

/**
 * Crystal mirror standing on a stone disc. orient 0 = '/', 1 = '\'.
 * o.fixed (set in the ground), o.ghost, o.scale, o.highlight, o.flash (0..1, just reflected someone).
 */
export function drawMirror(g, x, y, S, orient, o = {}) {
  const s = S;
  const fixed = !!o.fixed;
  const flash = o.flash || 0;
  g.save();
  g.translate(x, y - (o.lift || 0));
  g.scale(o.scale ?? 1, o.scale ?? 1);
  if (!o.ghost) {
    g.fillStyle = 'rgba(20,10,40,0.25)';
    ellipse(g, 0, s * 0.06, s * 0.36, s * 0.3);
    g.fill();
  }
  g.globalAlpha *= o.ghost ? 0.55 : 1;
  // Stone disc, like the arrows: pale for the player's pieces, dark when set in the ground.
  const r = s * 0.36;
  g.fillStyle = fixed ? '#5e5a73' : '#efe6d2';
  ellipse(g, 0, 0, r, r * 0.92);
  g.fill();
  g.fillStyle = fixed ? '#7b7694' : '#fffaf0';
  ellipse(g, 0, -s * 0.03, r * 0.9, r * 0.8);
  g.fill();
  if (!fixed) {
    g.strokeStyle = o.highlight ? '#ffffff' : 'rgba(150,220,255,0.95)';
    g.lineWidth = s * 0.035;
    ellipse(g, 0, -s * 0.03, r * 0.9, r * 0.8);
    g.stroke();
  }
  // The pane stands on the diagonal it reflects along.
  const a = s * 0.25;
  const k = 0.82;
  const h = s * 0.26;
  const [x1, y1, x2, y2] = orient === 0 ? [-a, a * k, a, -a * k] : [-a, -a * k, a, a * k];
  const lift = -s * 0.03;
  if (!o.ghost) glow(g, 0, -h * 0.5, s * (0.42 + flash * 0.35), 'rgba(150,230,255,', 0.22 + flash * 0.7);
  // Groove in the stone.
  g.strokeStyle = fixed ? 'rgba(30,20,50,0.55)' : 'rgba(120,100,80,0.35)';
  g.lineWidth = s * 0.07;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x1, y1 + lift);
  g.lineTo(x2, y2 + lift);
  g.stroke();
  // Glass.
  const grd = g.createLinearGradient(0, lift + Math.max(y1, y2), 0, lift + Math.min(y1, y2) - h);
  grd.addColorStop(0, fixed ? 'rgba(150,140,235,0.95)' : 'rgba(90,190,240,0.95)');
  grd.addColorStop(0.55, fixed ? 'rgba(200,205,255,0.9)' : 'rgba(170,235,255,0.9)');
  grd.addColorStop(1, 'rgba(250,255,255,0.95)');
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(x1, y1 + lift);
  g.lineTo(x2, y2 + lift);
  g.lineTo(x2, y2 + lift - h);
  g.lineTo(x1, y1 + lift - h);
  g.closePath();
  g.fill();
  g.strokeStyle = `rgba(255,255,255,${0.75 + flash * 0.25})`;
  g.lineWidth = s * 0.022;
  g.lineJoin = 'round';
  g.stroke();
  // Reflection streak.
  g.strokeStyle = `rgba(255,255,255,${0.55 + flash * 0.45})`;
  g.lineWidth = s * 0.03;
  g.beginPath();
  g.moveTo(x1 + (x2 - x1) * 0.22, y1 + (y2 - y1) * 0.22 + lift - h * 0.25);
  g.lineTo(x1 + (x2 - x1) * 0.42, y1 + (y2 - y1) * 0.42 + lift - h * 0.8);
  g.stroke();
  // Little crystal tips on the top corners.
  g.fillStyle = '#ffffff';
  for (const [tx, ty] of [[x1, y1], [x2, y2]]) {
    g.beginPath();
    g.moveTo(tx, ty + lift - h - s * 0.06);
    g.lineTo(tx + s * 0.025, ty + lift - h);
    g.lineTo(tx - s * 0.025, ty + lift - h);
    g.closePath();
    g.fill();
  }
  if (flash > 0) {
    g.fillStyle = `rgba(255,255,255,${flash * 0.6})`;
    star(g, (x1 + x2) / 2, (y1 + y2) / 2 + lift - h * 0.55, s * 0.12 * (0.6 + flash), 4, 0.3);
  }
  g.restore();
}

export function drawLily(g, x, y, S, o = {}) {
  const s = S;
  const t = o.t || 0;
  g.save();
  g.globalAlpha *= o.ghost ? 0.55 : 1;
  const bob = Math.sin(t * 2 + x) * s * 0.01;
  g.fillStyle = 'rgba(0,30,60,0.25)';
  ellipse(g, x, y + s * 0.04, s * 0.38, s * 0.3);
  g.fill();
  g.fillStyle = '#4caf5e';
  g.beginPath();
  g.moveTo(x, y + bob);
  g.arc(x, y + bob, s * 0.38, 0.35, TAU - 0.15);
  g.closePath();
  g.fill();
  g.fillStyle = '#6fd07f';
  g.beginPath();
  g.moveTo(x, y + bob - s * 0.02);
  g.arc(x, y + bob - s * 0.02, s * 0.3, 0.4, TAU - 0.2);
  g.closePath();
  g.fill();
  g.strokeStyle = '#4caf5e';
  g.lineWidth = s * 0.02;
  for (let i = 0; i < 5; i++) {
    const a = 0.6 + i * 1.1;
    g.beginPath();
    g.moveTo(x, y + bob);
    g.lineTo(x + Math.cos(a) * s * 0.26, y + bob + Math.sin(a) * s * 0.24);
    g.stroke();
  }
  g.fillStyle = '#ffc4de';
  for (let p = 0; p < 6; p++) {
    const a = (p / 6) * TAU;
    g.beginPath();
    g.ellipse(x - s * 0.12 + Math.cos(a) * s * 0.04, y + bob - s * 0.1 + Math.sin(a) * s * 0.04, s * 0.035, s * 0.06, a, 0, TAU);
    g.fill();
  }
  g.fillStyle = '#fff3a0';
  ellipse(g, x - s * 0.12, y + bob - s * 0.1, s * 0.03, s * 0.03);
  g.fill();
  if (!o.fixed && !o.ghost) {
    g.strokeStyle = 'rgba(255,214,120,0.8)';
    g.lineWidth = s * 0.03;
    ellipse(g, x, y + bob, s * 0.4, s * 0.36);
    g.stroke();
  }
  g.restore();
}

export function drawMushroom(g, x, y, S, o = {}) {
  const s = S;
  const sq = o.squash || 0;
  g.save();
  g.globalAlpha *= o.ghost ? 0.55 : 1;
  g.fillStyle = 'rgba(20,10,40,0.28)';
  ellipse(g, x, y, s * 0.3, s * 0.09);
  g.fill();
  g.fillStyle = '#f6ead8';
  g.beginPath();
  roundRect(g, x - s * 0.09, y - s * 0.32 * (1 - sq * 0.4), s * 0.18, s * 0.33 * (1 - sq * 0.4), s * 0.06);
  g.fill();
  const capY = y - s * 0.3 * (1 - sq * 0.5);
  const cw = s * 0.38 * (1 + sq * 0.25);
  const ch = s * 0.3 * (1 - sq * 0.35);
  g.fillStyle = o.fixed ? '#d4483f' : '#ff5a4f';
  g.beginPath();
  g.moveTo(x - cw, capY + s * 0.04);
  g.quadraticCurveTo(x - cw, capY - ch * 1.3, x, capY - ch * 1.25);
  g.quadraticCurveTo(x + cw, capY - ch * 1.3, x + cw, capY + s * 0.04);
  g.quadraticCurveTo(x, capY - s * 0.02, x - cw, capY + s * 0.04);
  g.fill();
  g.fillStyle = '#ffffff';
  ellipse(g, x - cw * 0.45, capY - ch * 0.55, s * 0.06, s * 0.045);
  g.fill();
  ellipse(g, x + cw * 0.35, capY - ch * 0.75, s * 0.07, s * 0.05);
  g.fill();
  ellipse(g, x + cw * 0.05, capY - ch * 0.2, s * 0.045, s * 0.035);
  g.fill();
  // Spring coil to read as "bouncy".
  g.strokeStyle = 'rgba(120,80,60,0.6)';
  g.lineWidth = s * 0.02;
  g.beginPath();
  for (let i = 0; i < 3; i++) {
    const yy = y - s * 0.06 - i * s * 0.07 * (1 - sq * 0.4);
    g.moveTo(x - s * 0.07, yy);
    g.lineTo(x + s * 0.07, yy - s * 0.02);
  }
  g.stroke();
  if (!o.fixed && !o.ghost) {
    g.strokeStyle = 'rgba(255,214,120,0.85)';
    g.lineWidth = s * 0.03;
    ellipse(g, x, y, s * 0.36, s * 0.13);
    g.stroke();
  }
  g.restore();
}

export function drawDaisy(g, x, y, S, o = {}) {
  const s = S;
  const t = o.t || 0;
  g.save();
  g.globalAlpha *= o.ghost ? 0.55 : 1;
  g.fillStyle = 'rgba(20,10,40,0.22)';
  ellipse(g, x, y, s * 0.26, s * 0.08);
  g.fill();
  g.strokeStyle = '#4caf5e';
  g.lineWidth = s * 0.04;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + s * 0.05, y - s * 0.2, x, y - s * 0.36);
  g.stroke();
  g.fillStyle = '#5ec26e';
  g.beginPath();
  g.ellipse(x - s * 0.08, y - s * 0.12, s * 0.08, s * 0.035, -0.5, 0, TAU);
  g.fill();
  const sway = Math.sin(t * 2 + x) * 0.15;
  const hx = x + Math.sin(sway) * s * 0.05;
  const hy = y - s * 0.4;
  g.fillStyle = '#ffffff';
  for (let p = 0; p < 10; p++) {
    const a = (p / 10) * TAU + sway;
    g.beginPath();
    g.ellipse(hx + Math.cos(a) * s * 0.1, hy + Math.sin(a) * s * 0.08, s * 0.065, s * 0.03, a, 0, TAU);
    g.fill();
  }
  g.fillStyle = '#ffd23f';
  ellipse(g, hx, hy, s * 0.06, s * 0.055);
  g.fill();
  if (o.zz) {
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.font = `700 ${Math.round(s * 0.2)}px Fredoka, sans-serif`;
    g.fillText('z', hx + s * 0.18, hy - s * 0.1 - o.zz * s * 0.15);
  }
  if (!o.fixed && !o.ghost) {
    g.strokeStyle = 'rgba(255,214,120,0.85)';
    g.lineWidth = s * 0.03;
    ellipse(g, x, y, s * 0.3, s * 0.1);
    g.stroke();
  }
  g.restore();
}

export function drawFirefly(g, x, y, S, t, phase = 0, alpha = 1) {
  const s = S;
  const bx = x + Math.cos(t * 1.7 + phase) * s * 0.1;
  const by = y - s * 0.45 + Math.sin(t * 2.3 + phase) * s * 0.08;
  g.save();
  g.globalAlpha *= alpha;
  glow(g, bx, by, s * (0.45 + 0.08 * Math.sin(t * 5 + phase)), 'rgba(230,255,120,', 0.8);
  g.fillStyle = 'rgba(20,10,40,0.18)';
  ellipse(g, x, y + s * 0.05, s * 0.1, s * 0.035);
  g.fill();
  const flap = Math.abs(Math.sin(t * 22 + phase));
  g.fillStyle = 'rgba(220,240,255,0.75)';
  g.beginPath();
  g.ellipse(bx - s * 0.06, by - s * 0.04, s * 0.06, s * 0.03 * (0.3 + flap), -0.6, 0, TAU);
  g.fill();
  g.beginPath();
  g.ellipse(bx + s * 0.06, by - s * 0.04, s * 0.06, s * 0.03 * (0.3 + flap), 0.6, 0, TAU);
  g.fill();
  g.fillStyle = '#4a3b2a';
  ellipse(g, bx, by - s * 0.02, s * 0.035, s * 0.04);
  g.fill();
  g.fillStyle = '#f3ff8a';
  ellipse(g, bx, by + s * 0.035, s * 0.045, s * 0.045);
  g.fill();
  g.restore();
}

export function drawSpark(g, x, y, S, color, t, alpha = 1) {
  const P = LUMI[color];
  const s = S;
  const by = y - s * 0.42 + Math.sin(t * 2.5) * s * 0.05;
  g.save();
  g.globalAlpha *= alpha;
  glow(g, x, by, s * 0.6, P.glow, 0.8);
  g.fillStyle = 'rgba(20,10,40,0.2)';
  ellipse(g, x, y + s * 0.04, s * 0.12, s * 0.04);
  g.fill();
  g.translate(x, by);
  g.rotate(Math.sin(t * 1.5) * 0.3);
  g.fillStyle = P.flame;
  star(g, 0, 0, s * 0.2, 4, 0.42);
  g.fillStyle = P.core;
  star(g, 0, 0, s * 0.11, 4, 0.42);
  g.restore();
}

export function drawPortal(g, x, y, S, pair, t) {
  const s = S;
  const col = PORTAL_COLORS[pair % 2];
  const prefix = pair % 2 ? 'rgba(200,140,255,' : 'rgba(110,230,255,';
  glow(g, x, y, s * 0.7, prefix, 0.45 + 0.1 * Math.sin(t * 3));
  g.save();
  g.translate(x, y);
  g.fillStyle = '#4b4f6e';
  ellipse(g, 0, 0, s * 0.42, s * 0.36);
  g.fill();
  g.fillStyle = '#20213a';
  ellipse(g, 0, 0, s * 0.33, s * 0.27);
  g.fill();
  g.strokeStyle = col;
  g.lineWidth = s * 0.035;
  g.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a0 = t * 2.2 + (i * TAU) / 3;
    g.beginPath();
    g.ellipse(0, 0, s * (0.26 - i * 0.06), s * (0.21 - i * 0.05), 0, a0, a0 + 2.2);
    g.stroke();
  }
  g.fillStyle = col;
  ellipse(g, 0, 0, s * 0.05, s * 0.05);
  g.fill();
  // Moon glyphs around the rim.
  g.fillStyle = '#c9cde8';
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 + 0.4;
    ellipse(g, Math.cos(a) * s * 0.38, Math.sin(a) * s * 0.32, s * 0.03, s * 0.03);
    g.fill();
  }
  g.restore();
}

export function drawPlate(g, x, y, S, group, o = {}) {
  const s = S;
  const press = o.press || 0;
  const col = group ? '#ffb86b' : '#8ff6ff';
  g.save();
  g.fillStyle = '#5c6283';
  g.beginPath();
  roundRect(g, x - s * 0.36, y - s * 0.3, s * 0.72, s * 0.62, s * 0.1);
  g.fill();
  g.fillStyle = mix('#9aa2c6', '#7b83a8', press);
  g.beginPath();
  roundRect(g, x - s * 0.32, y - s * 0.32 + press * s * 0.05, s * 0.64, s * 0.56, s * 0.09);
  g.fill();
  // Crescent glyph.
  g.fillStyle = col;
  if (o.lit) glow(g, x, y - s * 0.04, s * 0.45, group ? 'rgba(255,180,100,' : 'rgba(140,245,255,', 0.4);
  g.beginPath();
  g.arc(x, y - s * 0.04 + press * s * 0.05, s * 0.15, 0, TAU);
  g.fill();
  g.fillStyle = mix('#9aa2c6', '#7b83a8', press);
  g.beginPath();
  g.arc(x + s * 0.07, y - s * 0.08 + press * s * 0.05, s * 0.13, 0, TAU);
  g.fill();
  g.restore();
}

/** Brambles: open = 0 (grown, blocking) .. 1 (retracted). */
export function drawBrambles(g, x, y, S, group, open, t) {
  const s = S;
  const h = 1 - open;
  const thornCol = group ? '#ffb86b' : '#8ff6ff';
  g.save();
  // Roots stay visible on the ground.
  g.strokeStyle = '#5b3f5f';
  g.lineWidth = s * 0.05;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x - s * 0.35, y + s * 0.15);
  g.quadraticCurveTo(x - s * 0.1, y - s * 0.05, x + s * 0.1, y + s * 0.1);
  g.quadraticCurveTo(x + s * 0.25, y + s * 0.2, x + s * 0.36, y - s * 0.05);
  g.stroke();
  g.fillStyle = thornCol;
  ellipse(g, x - s * 0.28, y + s * 0.18, s * 0.04, s * 0.04);
  g.fill();
  if (h > 0.02) {
    g.fillStyle = 'rgba(20,10,40,0.25)';
    ellipse(g, x, y + s * 0.18, s * 0.42 * h, s * 0.12 * h);
    g.fill();
    for (let i = 0; i < 5; i++) {
      const bx = x + (i - 2) * s * 0.16;
      const top = y + s * 0.2 - s * (0.75 + 0.25 * ((i * 7) % 3) / 2) * h;
      g.strokeStyle = i % 2 ? '#4a2f55' : '#5e3b6b';
      g.lineWidth = s * 0.09;
      g.beginPath();
      g.moveTo(bx, y + s * 0.2);
      g.quadraticCurveTo(bx + Math.sin(t * 2 + i) * s * 0.06, (y + top) / 2, bx + (i - 2) * s * 0.03, top);
      g.stroke();
      g.fillStyle = '#c7a4e8';
      for (let k = 1; k < 4; k++) {
        const ty = y + s * 0.2 + (top - y - s * 0.2) * (k / 4);
        const side = k % 2 ? 1 : -1;
        g.beginPath();
        g.moveTo(bx + side * s * 0.04, ty);
        g.lineTo(bx + side * s * 0.11, ty - s * 0.04);
        g.lineTo(bx + side * s * 0.04, ty - s * 0.06);
        g.fill();
      }
      g.fillStyle = thornCol;
      ellipse(g, bx + (i - 2) * s * 0.03, top, s * 0.035, s * 0.035);
      g.fill();
    }
  }
  g.restore();
}

export function drawVane(g, x, y, S, angle, t) {
  const s = S;
  g.save();
  g.fillStyle = 'rgba(20,10,40,0.25)';
  ellipse(g, x, y + s * 0.06, s * 0.38, s * 0.32);
  g.fill();
  // Brass compass disc.
  g.fillStyle = '#9c6a3a';
  ellipse(g, x, y, s * 0.38, s * 0.35);
  g.fill();
  g.fillStyle = '#d9a35c';
  ellipse(g, x, y - s * 0.03, s * 0.35, s * 0.31);
  g.fill();
  // Wind swirls turning clockwise around the rim.
  g.strokeStyle = 'rgba(255,248,220,0.85)';
  g.lineWidth = s * 0.03;
  g.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a0 = (i * Math.PI) / 2 + 0.35 + t * 0.6;
    g.beginPath();
    g.ellipse(x, y - s * 0.03, s * 0.29, s * 0.25, 0, a0, a0 + 0.8);
    g.stroke();
    const ax = x + Math.cos(a0 + 0.8) * s * 0.29;
    const ay = y - s * 0.03 + Math.sin(a0 + 0.8) * s * 0.25;
    const ta = a0 + 0.8 + Math.PI / 2;
    g.beginPath();
    g.moveTo(ax + Math.cos(ta) * s * 0.05, ay + Math.sin(ta) * s * 0.05);
    g.lineTo(ax + Math.cos(ta + 2.4) * s * 0.05, ay + Math.sin(ta + 2.4) * s * 0.05);
    g.stroke();
  }
  // The arrow itself.
  g.translate(x, y - s * 0.03);
  g.rotate(angle);
  glow(g, 0, 0, s * 0.3, 'rgba(255,220,120,', 0.3);
  g.fillStyle = '#fff3d2';
  g.strokeStyle = '#7a4a1f';
  g.lineWidth = s * 0.025;
  g.beginPath();
  g.moveTo(0, -s * 0.22);
  g.lineTo(s * 0.14, -s * 0.04);
  g.lineTo(s * 0.05, -s * 0.04);
  g.lineTo(s * 0.05, s * 0.17);
  g.lineTo(-s * 0.05, s * 0.17);
  g.lineTo(-s * 0.05, -s * 0.04);
  g.lineTo(-s * 0.14, -s * 0.04);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
}

export function drawCloud(g, x, y, S, t, alpha = 1, scale = 1) {
  const s = S * scale;
  g.save();
  g.globalAlpha *= alpha;
  const bob = Math.sin(t * 1.5 + x * 0.1) * S * 0.02;
  g.fillStyle = 'rgba(40,50,100,0.25)';
  ellipse(g, x, y + S * 0.4, s * 0.42, s * 0.1);
  g.fill();
  const blobs = [
    [-0.26, 0.06, 0.22],
    [0, -0.04, 0.28],
    [0.26, 0.06, 0.22],
    [-0.1, 0.16, 0.24],
    [0.14, 0.16, 0.24],
  ];
  g.fillStyle = '#c9d6f2';
  for (const [dx, dy, r] of blobs) {
    ellipse(g, x + dx * s, y + dy * s + bob + s * 0.05, r * s, r * s * 0.85);
    g.fill();
  }
  g.fillStyle = '#ffffff';
  for (const [dx, dy, r] of blobs) {
    ellipse(g, x + dx * s, y + dy * s + bob - s * 0.02, r * s * 0.92, r * s * 0.78);
    g.fill();
  }
  g.restore();
}

/** Small icons for the piece tray and the notebook. */
export function drawPieceIcon(g, kind, x, y, S, t = 0) {
  switch (kind) {
    case 'arrow':
      drawArrowStone(g, x, y, S, 1, {});
      break;
    case 'lily':
      drawLily(g, x, y, S, { t, fixed: true });
      break;
    case 'mushroom':
      drawMushroom(g, x, y + S * 0.25, S, { fixed: true });
      break;
    case 'daisy':
      drawDaisy(g, x, y + S * 0.3, S, { t, fixed: true });
      break;
    case 'mirror':
      drawMirror(g, x, y + S * 0.08, S, 0, {});
      break;
    default:
      break;
  }
}

/** A cartoon pointing hand whose fingertip is at (x, y). */
export function drawHand(g, x, y, S, press = 0, alpha = 1) {
  const s = S * 0.9;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y);
  g.rotate(-0.42);
  const dy = press * s * 0.08;
  g.translate(0, dy);
  g.fillStyle = 'rgba(20,10,40,0.28)';
  g.beginPath();
  roundRect(g, -s * 0.11 + s * 0.06, s * 0.05, s * 0.22, s * 0.5, s * 0.11);
  roundRect(g, -s * 0.22 + s * 0.06, s * 0.36, s * 0.5, s * 0.42, s * 0.16);
  g.fill();
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#3b2a6a';
  g.lineWidth = Math.max(1.5, s * 0.035);
  g.lineJoin = 'round';
  // index finger
  g.beginPath();
  roundRect(g, -s * 0.11, 0, s * 0.22, s * 0.5, s * 0.11);
  g.fill();
  g.stroke();
  // palm with folded fingers
  g.beginPath();
  roundRect(g, -s * 0.22, s * 0.32, s * 0.5, s * 0.42, s * 0.16);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(s * 0.11, s * 0.42);
  g.lineTo(s * 0.11, s * 0.52);
  g.moveTo(s * 0.2, s * 0.44);
  g.lineTo(s * 0.2, s * 0.54);
  g.stroke();
  // thumb
  g.beginPath();
  g.ellipse(-s * 0.24, s * 0.48, s * 0.07, s * 0.12, -0.5, 0, TAU);
  g.fill();
  g.stroke();
  // cuff
  g.fillStyle = '#ffcf5a';
  g.beginPath();
  roundRect(g, -s * 0.22, s * 0.7, s * 0.5, s * 0.12, s * 0.05);
  g.fill();
  g.stroke();
  g.restore();
}
