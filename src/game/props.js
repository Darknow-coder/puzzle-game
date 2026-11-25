// The obstacles standing on the islands (trees, rocks, ruins, crystals…), drawn
// like the Lumignons themselves: a fill shaded from a light top to a deeper
// bottom, an outline in a darker tone of the same colour, a small white shine
// and a soft shadow on the ground. Each prop stands on (x, y), its foot, and
// fits in a cell of size S (up to 1.6 S tall).
import { ellipse, glow, star, roundRect, TAU } from './art.js';

// [light, shade, line] for every material.
const M = {
  leaf: ['#b7ea97', '#52aa63', '#2c7341'],
  leafHi: '#d6f7b9',
  bark: ['#c99566', '#8a5531', '#55311a'],
  wood: ['#f6dcaa', '#d9ab6b', '#8f5d2b'],
  stone: ['#e0dbec', '#9d95b5', '#5f5879'],
  moss: ['#c7ee98', '#7ec35d', '#3d7d39'],
  fern: ['#c9f294', '#5fb35c', '#2d763c'],
  reed: ['#c8ef9c', '#6cb866', '#357a45'],
  cattail: ['#c08552', '#6f4222', '#45260f'],
  stem: ['#fff7e8', '#e7cfae', '#9b7a58'],
  shroom: ['#e2b8ff', '#8b52d8', '#542a90'],
  gill: ['#d9b6e8', '#a77bc0', '#6d4588'],
  ruin: ['#f1f3fc', '#abb5d4', '#69739a'],
  darkBark: ['#666a85', '#30334a', '#171926'],
  gloomLeaf: ['#5aa794', '#24564f', '#10302d'],
  bramble: ['#9b67c2', '#5b3478', '#2a1438'],
  pine: ['#64b693', '#2c6b56', '#183f33'],
  snow: ['#ffffff', '#e3ecf8', '#8ea6cc'],
  ice: ['#effaff', '#8fcdf2', '#4b8cc2'],
  indigo: ['#857cd8', '#3e3788', '#211b50'],
  gold: ['#fff4c2', '#ffcf4d', '#b98112'],
  brass: ['#ffeaa8', '#dfa33a', '#8a5a12'],
  lens: ['#e0f2ff', '#6fb4ff', '#2f6cb4'],
  tripod: ['#cf9b6b', '#8a5a34', '#55331a'],
};
// Rocks take the tone of their world.
const ROCK = {
  gloom: ['#bcd0cd', '#6e8a8a', '#3a5253'],
  dawn: ['#efe2f8', '#ad99cf', '#6c5996'],
  peak: ['#e1eaf7', '#8fa2c4', '#55698f'],
};
const PETALS = [
  ['#ffd0e4', '#ff86b7', '#bd4579'],
  ['#fff3b0', '#ffd24a', '#b9840f'],
  ['#d9ebff', '#83b4ff', '#3e6bbf'],
  ['#f3dcff', '#c391f2', '#7a4cb0'],
];
const SHARDS = [
  ['#f4e9ff', '#c3a1f2', '#7a59b5'],
  ['#ffe6f1', '#f6a8c8', '#b35a86'],
  ['#e6fffb', '#97e3da', '#3a958e'],
  ['#fff2e0', '#ffcd92', '#b57c45'],
];

/** How much each prop sways in the breeze (0: not at all). */
export const PROP_SWAY = { tree: 0.6, bush: 0.25, flowers: 0.7, reeds: 1, fern: 0.8, pine: 0.35, darktree: 0.35, thorns: 0.3, bigshroom: 0.2 };

const lw = (s) => Math.max(1.2, s * 0.034);

function ground(g, x, y, rx, ry, a = 0.26) {
  g.fillStyle = `rgba(20,10,40,${a})`;
  ellipse(g, x, y, rx, ry);
  g.fill();
}

/** Fills the current path with a material's gradient (top → bottom) and outlines it. */
function paint(g, s, mat, top, bottom, { line = true, width = 1 } = {}) {
  const grd = g.createLinearGradient(0, top, 0, bottom);
  grd.addColorStop(0, mat[0]);
  grd.addColorStop(1, mat[1]);
  g.fillStyle = grd;
  g.fill();
  if (line) {
    g.strokeStyle = mat[2];
    g.lineWidth = lw(s) * width;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.stroke();
  }
}

/** A puffy shape made of circles [x, y, r], outlined as one. */
function puff(g, s, circles, mat, top, bottom) {
  g.strokeStyle = mat[2];
  g.lineWidth = lw(s) * 2;
  for (const [cx, cy, r] of circles) {
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.stroke();
  }
  g.beginPath();
  for (const [cx, cy, r] of circles) {
    g.moveTo(cx + r, cy);
    g.arc(cx, cy, r, 0, TAU);
  }
  paint(g, s, mat, top, bottom, { line: false });
}

function shine(g, x, y, rx, ry, a = 0.5, rot = -0.5) {
  g.fillStyle = `rgba(255,255,255,${a})`;
  g.beginPath();
  g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
  g.fill();
}

/** A thick outlined stroke (branches, stems, legs). */
function limb(g, s, pts, mat, w) {
  const path = () => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 3) g.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    else for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  };
  g.lineCap = 'round';
  g.lineJoin = 'round';
  path();
  g.strokeStyle = mat[2];
  g.lineWidth = w + lw(s) * 2;
  g.stroke();
  path();
  g.strokeStyle = mat[1];
  g.lineWidth = w;
  g.stroke();
  path();
  g.strokeStyle = mat[0];
  g.globalAlpha *= 0.55;
  g.lineWidth = w * 0.35;
  g.stroke();
  g.globalAlpha /= 0.55;
}

/** A pointed leaf from (x, y) towards angle a (0 = up), length len. */
function leafPath(g, x, y, a, len, wid, bend = 0) {
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  const px = -uy;
  const py = ux;
  const tx = x + ux * len + px * bend * len;
  const ty = y + uy * len + py * bend * len;
  const mx = x + ux * len * 0.5;
  const my = y + uy * len * 0.5;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(mx + px * wid, my + py * wid, tx, ty);
  g.quadraticCurveTo(mx - px * wid, my - py * wid, x, y);
  g.closePath();
}

function boulder(g, x, y, s, w, h) {
  g.beginPath();
  g.moveTo(x - w, y);
  g.bezierCurveTo(x - w * 1.12, y - h * 0.55, x - w * 0.62, y - h * 1.02, x - w * 0.05, y - h);
  g.bezierCurveTo(x + w * 0.55, y - h * 0.98, x + w * 1.1, y - h * 0.6, x + w, y);
  g.quadraticCurveTo(x, y + s * 0.05, x - w, y);
  g.closePath();
}

/** A crystal shard: base centre (bx, y), height h, half-width w, lean of the tip. */
function shard(g, s, bx, y, h, w, lean, mat) {
  const tipX = bx + lean * h;
  g.beginPath();
  g.moveTo(bx - w, y);
  g.lineTo(bx - w + lean * h * 0.62, y - h * 0.68);
  g.lineTo(tipX, y - h);
  g.lineTo(bx + w + lean * h * 0.62, y - h * 0.68);
  g.lineTo(bx + w, y);
  g.closePath();
  paint(g, s, mat, y - h, y);
  // The lit facet.
  g.fillStyle = 'rgba(255,255,255,0.38)';
  g.beginPath();
  g.moveTo(bx - w, y);
  g.lineTo(bx - w + lean * h * 0.62, y - h * 0.68);
  g.lineTo(tipX, y - h);
  g.lineTo(bx - w * 0.15 + lean * h * 0.62, y - h * 0.66);
  g.lineTo(bx - w * 0.15, y);
  g.closePath();
  g.fill();
  g.strokeStyle = mat[2];
  g.globalAlpha *= 0.45;
  g.lineWidth = lw(s) * 0.6;
  g.beginPath();
  g.moveTo(bx - w * 0.15, y);
  g.lineTo(bx - w * 0.15 + lean * h * 0.62, y - h * 0.66);
  g.lineTo(tipX, y - h);
  g.stroke();
  g.globalAlpha /= 0.45;
}

/** The ruins' moon rune: a small glowing crescent. */
function moonRune(g, s, x, y, r) {
  glow(g, x, y, r * 4, 'rgba(140,246,255,', 0.5);
  g.beginPath();
  g.arc(x, y, r, 0.5 * Math.PI, 1.5 * Math.PI);
  g.arc(x + r * 0.45, y, r * 0.8, 1.5 * Math.PI, 0.5 * Math.PI, true);
  g.closePath();
  paint(g, s * 0.7, ['#d9fbff', '#6fe0f0', '#3a8fa8'], y - r, y + r);
}

/** A fern frond: pairs of leaflets along a curved stem, outlined as one. */
function frond(g, s, x, y, a, len, mat) {
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  const bend = a * 0.25;
  const pt = (k) => {
    const d = len * k;
    const off = bend * len * k * k;
    return [x + ux * d - uy * off, y + uy * d + ux * off];
  };
  const leaflets = [];
  const n = 6;
  for (let i = 1; i <= n; i++) {
    const k = i / (n + 0.6);
    const [px, py] = pt(k);
    const r = s * 0.075 * (1 - k * 0.6);
    for (const side of [-1, 1]) leaflets.push([px - uy * side * r * 0.9, py + ux * side * r * 0.9, r]);
  }
  const [tx, ty] = pt(1);
  leaflets.push([tx, ty, s * 0.035]);
  puff(g, s * 0.75, leaflets, mat, y - len, y);
  g.strokeStyle = mat[2];
  g.globalAlpha *= 0.6;
  g.lineWidth = lw(s) * 0.6;
  g.beginPath();
  g.moveTo(x, y);
  for (let k = 0.1; k <= 1.001; k += 0.1) g.lineTo(...pt(k));
  g.stroke();
  g.globalAlpha /= 0.6;
}

function flower(g, s, x, y, r, mat) {
  const petals = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU - Math.PI / 2;
    petals.push([x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.78]);
  }
  puff(g, s * 0.7, petals, mat, y - r * 1.8, y + r * 1.8);
  g.fillStyle = '#ffd34d';
  g.strokeStyle = '#c4870f';
  g.lineWidth = lw(s) * 0.6;
  ellipse(g, x, y, r * 0.55, r * 0.55);
  g.fill();
  g.stroke();
  shine(g, x - r * 0.15, y - r * 0.2, r * 0.18, r * 0.12, 0.7);
}

export function drawProp(g, kind, x, y, S, v = 0, world = '') {
  const s = S;
  g.save();
  switch (kind) {
    case 'tree': {
      ground(g, x, y, s * 0.4, s * 0.12);
      g.beginPath();
      g.moveTo(x - s * 0.16, y + s * 0.01);
      g.quadraticCurveTo(x - s * 0.07, y - s * 0.04, x - s * 0.07, y - s * 0.2);
      g.lineTo(x - s * 0.06, y - s * 0.56);
      g.lineTo(x + s * 0.06, y - s * 0.56);
      g.lineTo(x + s * 0.07, y - s * 0.2);
      g.quadraticCurveTo(x + s * 0.07, y - s * 0.04, x + s * 0.16, y + s * 0.01);
      g.closePath();
      paint(g, s, M.bark, y - s * 0.56, y);
      const crown = [
        [x - s * 0.21, y - s * 0.72, s * 0.22],
        [x + s * 0.2, y - s * 0.74, s * 0.23],
        [x - s * 0.01, y - s * 0.96, s * 0.27],
        [x, y - s * 0.66, s * 0.22],
      ];
      puff(g, s, crown, M.leaf, y - s * 1.23, y - s * 0.44);
      g.fillStyle = M.leafHi;
      g.globalAlpha = 0.75;
      ellipse(g, x - s * 0.07, y - s * 1.04, s * 0.15, s * 0.1);
      g.fill();
      ellipse(g, x - s * 0.27, y - s * 0.8, s * 0.09, s * 0.07);
      g.fill();
      g.globalAlpha = 1;
      shine(g, x - s * 0.1, y - s * 1.08, s * 0.06, s * 0.035, 0.7);
      // A few leaves drawn in, and fruit or blossoms.
      g.strokeStyle = M.leaf[2];
      g.globalAlpha = 0.35;
      g.lineWidth = lw(s) * 0.7;
      for (const [dx, dy] of [[0.18, -0.68], [-0.14, -0.62], [0.06, -0.86]]) {
        g.beginPath();
        g.arc(x + dx * s, y + dy * s, s * 0.05, 0.2, Math.PI - 0.2);
        g.stroke();
      }
      g.globalAlpha = 1;
      const fruit = v % 2 ? ['#ff8a8a', '#e04b5f', '#9c2a3c'] : PETALS[0];
      for (const [dx, dy] of [[-0.24, -0.78], [0.2, -0.84], [0.02, -0.66]]) {
        g.beginPath();
        g.arc(x + dx * s, y + dy * s, s * 0.04, 0, TAU);
        paint(g, s * 0.6, fruit, y + (dy - 0.04) * s, y + (dy + 0.04) * s);
      }
      break;
    }
    case 'bush': {
      ground(g, x, y, s * 0.42, s * 0.12);
      const blobs = [
        [x - s * 0.22, y - s * 0.2, s * 0.2],
        [x + s * 0.21, y - s * 0.21, s * 0.21],
        [x, y - s * 0.36, s * 0.25],
        [x - s * 0.02, y - s * 0.16, s * 0.21],
      ];
      puff(g, s, blobs, M.leaf, y - s * 0.62, y);
      g.fillStyle = M.leafHi;
      g.globalAlpha = 0.75;
      ellipse(g, x - s * 0.08, y - s * 0.45, s * 0.13, s * 0.08);
      g.fill();
      g.globalAlpha = 1;
      shine(g, x - s * 0.12, y - s * 0.5, s * 0.05, s * 0.03, 0.7);
      const berry = v % 2 ? ['#ff9aa8', '#e9466a', '#a3243f'] : PETALS[1];
      for (const [dx, dy] of [[-0.2, -0.26], [0.16, -0.3], [0.02, -0.18], [-0.04, -0.4]]) {
        g.beginPath();
        g.arc(x + dx * s, y + dy * s, s * 0.035, 0, TAU);
        paint(g, s * 0.55, berry, y + (dy - 0.035) * s, y + (dy + 0.035) * s);
      }
      break;
    }
    case 'rock': {
      ground(g, x, y, s * 0.4, s * 0.12);
      const mat = ROCK[world] || M.stone;
      boulder(g, x, y, s, s * 0.36, s * 0.52);
      paint(g, s, mat, y - s * 0.52, y);
      shine(g, x - s * 0.14, y - s * 0.38, s * 0.11, s * 0.05, 0.42);
      g.strokeStyle = mat[2];
      g.globalAlpha = 0.5;
      g.lineWidth = lw(s) * 0.7;
      g.beginPath();
      g.moveTo(x + s * 0.13, y - s * 0.4);
      g.lineTo(x + s * 0.07, y - s * 0.27);
      g.lineTo(x + s * 0.13, y - s * 0.16);
      g.stroke();
      g.globalAlpha = 1;
      if (world !== 'gloom' && world !== 'dawn') {
        puff(g, s * 0.8, [[x - s * 0.06, y - s * 0.49, s * 0.08], [x + s * 0.06, y - s * 0.5, s * 0.07], [x + s * 0.14, y - s * 0.45, s * 0.05]], M.moss, y - s * 0.58, y - s * 0.42);
      } else if (world === 'dawn') {
        g.fillStyle = 'rgba(255,255,255,0.9)';
        star(g, x + s * 0.18, y - s * 0.42, s * 0.04, 4, 0.3);
      }
      break;
    }
    case 'snowrock': {
      ground(g, x, y, s * 0.4, s * 0.12);
      boulder(g, x, y, s, s * 0.36, s * 0.5);
      paint(g, s, ROCK.peak, y - s * 0.5, y);
      shine(g, x - s * 0.16, y - s * 0.2, s * 0.07, s * 0.035, 0.3);
      // Snow over the top of the rock, dripping a little.
      g.save();
      boulder(g, x, y, s, s * 0.36, s * 0.5);
      g.clip();
      const snowLine = () => {
        g.moveTo(x - s * 0.5, y - s * 0.26);
        const pts = [[-0.34, -0.3], [-0.24, -0.22], [-0.14, -0.3], [-0.04, -0.27], [0.06, -0.33], [0.16, -0.24], [0.26, -0.31], [0.5, -0.27]];
        for (const [dx, dy] of pts) g.quadraticCurveTo(x + (dx - 0.05) * s, y + (dy + 0.03) * s, x + dx * s, y + dy * s);
      };
      g.beginPath();
      snowLine();
      g.lineTo(x + s * 0.5, y - s * 0.7);
      g.lineTo(x - s * 0.5, y - s * 0.7);
      g.closePath();
      paint(g, s, M.snow, y - s * 0.52, y - s * 0.24, { line: false });
      g.beginPath();
      snowLine();
      g.strokeStyle = M.snow[2];
      g.lineWidth = lw(s) * 0.8;
      g.stroke();
      g.restore();
      boulder(g, x, y, s, s * 0.36, s * 0.5);
      g.strokeStyle = ROCK.peak[2];
      g.lineWidth = lw(s);
      g.stroke();
      shine(g, x - s * 0.14, y - s * 0.43, s * 0.08, s * 0.03, 0.9, -0.3);
      break;
    }
    case 'flowers': {
      ground(g, x, y, s * 0.36, s * 0.1);
      for (const [a, len] of [[-1.1, 0.3], [-0.45, 0.36], [0.35, 0.34], [1.05, 0.3], [0, 0.26]]) {
        leafPath(g, x + a * s * 0.05, y - s * 0.01, a, len * s, s * 0.07);
        paint(g, s, M.leaf, y - len * s, y);
      }
      const f = v % PETALS.length;
      flower(g, s, x - s * 0.17, y - s * 0.3, s * 0.065, PETALS[f]);
      flower(g, s, x + s * 0.16, y - s * 0.36, s * 0.07, PETALS[(f + 1) % PETALS.length]);
      flower(g, s, x + s * 0.01, y - s * 0.22, s * 0.06, PETALS[(f + 2) % PETALS.length]);
      break;
    }
    case 'reeds': {
      ground(g, x, y, s * 0.34, s * 0.1);
      const blades = [[-0.16, -0.5, 0.62], [-0.06, -0.15, 0.82], [0.05, 0.1, 0.72], [0.14, 0.45, 0.58], [-0.22, -0.9, 0.42], [0.21, 0.8, 0.4]];
      for (const [dx, a, h] of blades) {
        leafPath(g, x + dx * s, y, a * 0.45, h * s, s * 0.07, a * 0.08);
        paint(g, s, M.reed, y - h * s, y, { width: 0.75 });
      }
      for (const [dx, h, a] of [[-0.09, 0.95, -0.12], [0.1, 0.82, 0.14]]) {
        const tx = x + dx * s + Math.sin(a) * h * s;
        const ty = y - Math.cos(a) * h * s;
        g.strokeStyle = M.reed[2];
        g.lineWidth = lw(s) * 0.9;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x + dx * s, y);
        g.lineTo(tx, ty);
        g.stroke();
        g.save();
        g.translate(tx - Math.sin(a) * s * 0.12, ty + Math.cos(a) * s * 0.12);
        g.rotate(a);
        g.beginPath();
        g.ellipse(0, 0, s * 0.045, s * 0.11, 0, 0, TAU);
        paint(g, s * 0.8, M.cattail, -s * 0.11, s * 0.11);
        shine(g, -s * 0.015, -s * 0.05, s * 0.012, s * 0.04, 0.45, 0);
        g.restore();
      }
      break;
    }
    case 'stump': {
      ground(g, x, y, s * 0.4, s * 0.12);
      g.beginPath();
      g.moveTo(x - s * 0.25, y - s * 0.38);
      g.lineTo(x - s * 0.26, y - s * 0.08);
      g.quadraticCurveTo(x - s * 0.28, y - s * 0.01, x - s * 0.36, y + s * 0.01);
      g.quadraticCurveTo(x, y + s * 0.07, x + s * 0.36, y + s * 0.01);
      g.quadraticCurveTo(x + s * 0.28, y - s * 0.01, x + s * 0.26, y - s * 0.08);
      g.lineTo(x + s * 0.25, y - s * 0.38);
      g.closePath();
      paint(g, s, M.bark, y - s * 0.42, y);
      g.strokeStyle = M.bark[2];
      g.globalAlpha = 0.45;
      g.lineWidth = lw(s) * 0.7;
      for (const dx of [-0.13, 0.02, 0.15]) {
        g.beginPath();
        g.moveTo(x + dx * s, y - s * 0.3);
        g.quadraticCurveTo(x + (dx + 0.02) * s, y - s * 0.16, x + dx * s, y - s * 0.04);
        g.stroke();
      }
      g.globalAlpha = 1;
      ellipse(g, x, y - s * 0.38, s * 0.25, s * 0.09);
      paint(g, s, M.wood, y - s * 0.47, y - s * 0.29);
      g.strokeStyle = M.wood[2];
      g.globalAlpha = 0.45;
      g.lineWidth = lw(s) * 0.6;
      ellipse(g, x, y - s * 0.38, s * 0.15, s * 0.05);
      g.stroke();
      ellipse(g, x, y - s * 0.38, s * 0.06, s * 0.02);
      g.stroke();
      g.globalAlpha = 1;
      leafPath(g, x + s * 0.14, y - s * 0.42, 0.5, s * 0.16, s * 0.05);
      paint(g, s * 0.8, M.leaf, y - s * 0.56, y - s * 0.42);
      leafPath(g, x + s * 0.14, y - s * 0.42, -0.4, s * 0.13, s * 0.045);
      paint(g, s * 0.8, M.leaf, y - s * 0.55, y - s * 0.42);
      break;
    }
    case 'bigshroom': {
      ground(g, x, y, s * 0.36, s * 0.11);
      glow(g, x, y - s * 0.78, s * 0.62, 'rgba(200,140,255,', 0.32);
      g.beginPath();
      g.moveTo(x - s * 0.12, y + s * 0.01);
      g.quadraticCurveTo(x - s * 0.08, y - s * 0.25, x - s * 0.085, y - s * 0.55);
      g.lineTo(x + s * 0.085, y - s * 0.55);
      g.quadraticCurveTo(x + s * 0.08, y - s * 0.25, x + s * 0.12, y + s * 0.01);
      g.quadraticCurveTo(x, y + s * 0.04, x - s * 0.12, y + s * 0.01);
      g.closePath();
      paint(g, s, M.stem, y - s * 0.55, y);
      shine(g, x - s * 0.04, y - s * 0.3, s * 0.018, s * 0.09, 0.5, 0);
      ellipse(g, x, y - s * 0.56, s * 0.34, s * 0.07);
      paint(g, s, M.gill, y - s * 0.63, y - s * 0.49);
      g.beginPath();
      g.moveTo(x - s * 0.43, y - s * 0.56);
      g.bezierCurveTo(x - s * 0.44, y - s * 0.94, x - s * 0.2, y - s * 1.08, x, y - s * 1.08);
      g.bezierCurveTo(x + s * 0.2, y - s * 1.08, x + s * 0.44, y - s * 0.94, x + s * 0.43, y - s * 0.56);
      g.quadraticCurveTo(x, y - s * 0.66, x - s * 0.43, y - s * 0.56);
      g.closePath();
      paint(g, s, M.shroom, y - s * 1.08, y - s * 0.56);
      for (const [dx, dy, r] of [[-0.2, -0.78, 0.065], [0.06, -0.94, 0.07], [0.24, -0.74, 0.055], [-0.04, -0.72, 0.045]]) {
        glow(g, x + dx * s, y + dy * s, r * s * 2.4, 'rgba(255,220,255,', 0.35);
        g.fillStyle = '#f8ecff';
        ellipse(g, x + dx * s, y + dy * s, r * s, r * s * 0.85);
        g.fill();
      }
      shine(g, x - s * 0.2, y - s * 0.93, s * 0.08, s * 0.035, 0.55);
      break;
    }
    case 'fern': {
      ground(g, x, y, s * 0.36, s * 0.1);
      for (const [a, len] of [[-1.1, 0.46], [1.1, 0.44], [-0.55, 0.6], [0.55, 0.58], [0.02, 0.7]]) frond(g, s, x, y - s * 0.02, a, len * s, M.fern);
      // A curled young frond.
      g.strokeStyle = M.fern[2];
      g.lineWidth = lw(s) * 2.2;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x + s * 0.02, y - s * 0.02);
      g.quadraticCurveTo(x + s * 0.1, y - s * 0.3, x + s * 0.06, y - s * 0.4);
      g.arc(x + s * 0.02, y - s * 0.4, s * 0.04, 0, Math.PI * 1.6, true);
      g.stroke();
      g.strokeStyle = M.fern[0];
      g.lineWidth = lw(s);
      g.stroke();
      break;
    }
    case 'pillar':
    case 'brokenpillar': {
      const broken = kind === 'brokenpillar';
      ground(g, x, y, s * 0.36, s * 0.11);
      const top = broken ? 0.66 : 1.02;
      // Plinth.
      g.beginPath();
      roundRect(g, x - s * 0.3, y - s * 0.13, s * 0.6, s * 0.14, s * 0.03);
      paint(g, s, M.ruin, y - s * 0.13, y);
      // Shaft.
      g.beginPath();
      if (broken) {
        g.moveTo(x - s * 0.2, y - s * 0.12);
        g.lineTo(x - s * 0.2, y - s * 0.58);
        g.lineTo(x - s * 0.1, y - s * 0.66);
        g.lineTo(x - s * 0.02, y - s * 0.6);
        g.lineTo(x + s * 0.07, y - s * 0.7);
        g.lineTo(x + s * 0.14, y - s * 0.62);
        g.lineTo(x + s * 0.2, y - s * 0.66);
        g.lineTo(x + s * 0.2, y - s * 0.12);
        g.closePath();
      } else g.rect(x - s * 0.2, y - s * top, s * 0.4, s * (top - 0.12));
      paint(g, s, M.ruin, y - s * top, y - s * 0.12);
      g.strokeStyle = M.ruin[2];
      g.globalAlpha = 0.4;
      g.lineWidth = lw(s) * 0.7;
      for (const dx of [-0.1, 0, 0.1]) {
        g.beginPath();
        g.moveTo(x + dx * s, y - s * 0.16);
        g.lineTo(x + dx * s, y - s * (broken ? 0.6 : top - 0.04));
        g.stroke();
      }
      g.globalAlpha = 1;
      shine(g, x - s * 0.15, y - s * (broken ? 0.4 : 0.6), s * 0.02, s * (broken ? 0.14 : 0.25), 0.55, 0);
      if (!broken) {
        // Capital.
        g.beginPath();
        roundRect(g, x - s * 0.27, y - s * 1.13, s * 0.54, s * 0.12, s * 0.03);
        paint(g, s, M.ruin, y - s * 1.13, y - s * 1.01);
        g.beginPath();
        roundRect(g, x - s * 0.23, y - s * 1.2, s * 0.46, s * 0.08, s * 0.02);
        paint(g, s, M.ruin, y - s * 1.2, y - s * 1.12);
      } else {
        // A fallen piece beside it.
        g.save();
        g.translate(x + s * 0.32, y - s * 0.06);
        g.rotate(0.35);
        g.beginPath();
        roundRect(g, -s * 0.09, -s * 0.07, s * 0.18, s * 0.13, s * 0.03);
        paint(g, s * 0.8, M.ruin, -s * 0.07, s * 0.06);
        g.restore();
      }
      // A moon rune, glowing softly.
      moonRune(g, s, x, y - s * (broken ? 0.38 : 0.56), s * 0.055);
      // Ivy.
      g.strokeStyle = M.leaf[2];
      g.lineWidth = lw(s) * 0.7;
      g.beginPath();
      g.moveTo(x - s * 0.21, y - s * 0.16);
      g.quadraticCurveTo(x - s * 0.08, y - s * 0.3, x - s * 0.2, y - s * (broken ? 0.5 : 0.78));
      g.stroke();
      for (const [dx, dy] of broken ? [[-0.16, -0.24], [-0.15, -0.42]] : [[-0.16, -0.24], [-0.13, -0.44], [-0.19, -0.66]]) {
        leafPath(g, x + dx * s, y + dy * s, dx < -0.15 ? -1 : 1, s * 0.08, s * 0.035);
        paint(g, s * 0.6, M.leaf, y + (dy - 0.08) * s, y + dy * s);
      }
      break;
    }
    case 'block': {
      ground(g, x, y, s * 0.38, s * 0.11);
      // Top face, then the front.
      g.beginPath();
      g.moveTo(x - s * 0.3, y - s * 0.4);
      g.lineTo(x - s * 0.24, y - s * 0.52);
      g.lineTo(x + s * 0.24, y - s * 0.52);
      g.lineTo(x + s * 0.3, y - s * 0.4);
      g.closePath();
      paint(g, s, ['#ffffff', '#d9dff0', M.ruin[2]], y - s * 0.52, y - s * 0.4);
      g.beginPath();
      roundRect(g, x - s * 0.3, y - s * 0.4, s * 0.6, s * 0.41, [0, 0, s * 0.04, s * 0.04]);
      paint(g, s, M.ruin, y - s * 0.4, y);
      // A crescent moon carved in it.
      moonRune(g, s, x - s * 0.02, y - s * 0.2, s * 0.085);
      g.strokeStyle = M.ruin[2];
      g.globalAlpha = 0.45;
      g.beginPath();
      g.moveTo(x + s * 0.2, y - s * 0.4);
      g.lineTo(x + s * 0.16, y - s * 0.3);
      g.lineTo(x + s * 0.21, y - s * 0.22);
      g.stroke();
      g.globalAlpha = 1;
      // Two small chips of stone at its foot.
      for (const [dx, r] of [[-0.36, 0.045], [0.35, 0.035]]) {
        g.beginPath();
        g.moveTo(x + (dx - r) * s, y + s * 0.01);
        g.lineTo(x + (dx - r * 0.4) * s, y - r * 1.6 * s);
        g.lineTo(x + (dx + r) * s, y - r * 0.8 * s);
        g.lineTo(x + (dx + r * 0.9) * s, y + s * 0.01);
        g.closePath();
        paint(g, s * 0.6, M.ruin, y - r * 1.6 * s, y);
      }
      break;
    }
    case 'darktree': {
      ground(g, x, y, s * 0.38, s * 0.11);
      g.beginPath();
      g.moveTo(x - s * 0.15, y + s * 0.01);
      g.quadraticCurveTo(x - s * 0.04, y - s * 0.12, x - s * 0.07, y - s * 0.32);
      g.quadraticCurveTo(x - s * 0.1, y - s * 0.5, x - s * 0.02, y - s * 0.66);
      g.lineTo(x + s * 0.08, y - s * 0.64);
      g.quadraticCurveTo(x + s * 0.02, y - s * 0.46, x + s * 0.07, y - s * 0.3);
      g.quadraticCurveTo(x + s * 0.06, y - s * 0.08, x + s * 0.16, y + s * 0.01);
      g.closePath();
      paint(g, s, M.darkBark, y - s * 0.66, y);
      limb(g, s, [[x - s * 0.04, y - s * 0.5], [x - s * 0.24, y - s * 0.6], [x - s * 0.3, y - s * 0.82]], M.darkBark, s * 0.05);
      limb(g, s, [[x + s * 0.04, y - s * 0.56], [x + s * 0.22, y - s * 0.62], [x + s * 0.28, y - s * 0.8]], M.darkBark, s * 0.045);
      puff(
        g,
        s,
        [
          [x - s * 0.24, y - s * 0.9, s * 0.18],
          [x + s * 0.22, y - s * 0.92, s * 0.19],
          [x, y - s * 1.08, s * 0.22],
          [x + s * 0.02, y - s * 0.84, s * 0.16],
        ],
        M.gloomLeaf,
        y - s * 1.3,
        y - s * 0.7,
      );
      shine(g, x - s * 0.08, y - s * 1.16, s * 0.07, s * 0.035, 0.3);
      // Little glowing berries, purple like the forest's light.
      for (const [dx, dy] of [[-0.22, -0.92], [0.18, -0.98], [0.04, -1.08], [0.24, -0.84]]) {
        glow(g, x + dx * s, y + dy * s, s * 0.12, 'rgba(190,150,255,', 0.6);
        g.fillStyle = '#e3d2ff';
        ellipse(g, x + dx * s, y + dy * s, s * 0.025, s * 0.025);
        g.fill();
      }
      break;
    }
    case 'thorns': {
      ground(g, x, y, s * 0.38, s * 0.1);
      const stems = [
        [[x - s * 0.04, y], [x - s * 0.34, y - s * 0.18], [x - s * 0.3, y - s * 0.5]],
        [[x, y], [x + s * 0.06, y - s * 0.36], [x - s * 0.08, y - s * 0.62]],
        [[x + s * 0.04, y], [x + s * 0.34, y - s * 0.2], [x + s * 0.28, y - s * 0.5]],
        [[x - s * 0.02, y], [x - s * 0.18, y - s * 0.3], [x + s * 0.08, y - s * 0.46]],
      ];
      for (const st of stems) limb(g, s, st, M.bramble, s * 0.045);
      // Thorns along the stems.
      g.fillStyle = M.bramble[2];
      for (const st of stems) {
        for (const k of [0.35, 0.6, 0.85]) {
          const [a, b, c] = st;
          const px = (1 - k) * (1 - k) * a[0] + 2 * (1 - k) * k * b[0] + k * k * c[0];
          const py = (1 - k) * (1 - k) * a[1] + 2 * (1 - k) * k * b[1] + k * k * c[1];
          const side = k === 0.6 ? 1 : -1;
          g.beginPath();
          g.moveTo(px - s * 0.02, py);
          g.lineTo(px + side * s * 0.06, py - s * 0.03);
          g.lineTo(px + s * 0.02, py + s * 0.01);
          g.closePath();
          g.fill();
        }
      }
      leafPath(g, x - s * 0.2, y - s * 0.3, -1.2, s * 0.14, s * 0.05);
      paint(g, s * 0.7, M.gloomLeaf, y - s * 0.4, y - s * 0.3);
      leafPath(g, x + s * 0.2, y - s * 0.34, 1.1, s * 0.13, s * 0.05);
      paint(g, s * 0.7, M.gloomLeaf, y - s * 0.44, y - s * 0.34);
      glow(g, x - s * 0.08, y - s * 0.63, s * 0.14, 'rgba(220,140,255,', 0.5);
      flower(g, s * 0.7, x - s * 0.08, y - s * 0.63, s * 0.045, PETALS[3]);
      break;
    }
    case 'pine': {
      ground(g, x, y, s * 0.36, s * 0.11);
      g.beginPath();
      roundRect(g, x - s * 0.06, y - s * 0.24, s * 0.12, s * 0.25, s * 0.03);
      paint(g, s, M.bark, y - s * 0.24, y);
      const tiers = [
        [0.36, 0.18, 0.56],
        [0.29, 0.46, 0.84],
        [0.21, 0.72, 1.14],
      ];
      for (const [w, b, tp] of tiers) {
        const yb = y - b * s;
        const yt = y - tp * s;
        g.beginPath();
        g.moveTo(x - w * s, yb);
        g.quadraticCurveTo(x - w * s * 0.35, yb - (yb - yt) * 0.45, x, yt);
        g.quadraticCurveTo(x + w * s * 0.35, yb - (yb - yt) * 0.45, x + w * s, yb);
        g.quadraticCurveTo(x, yb + s * 0.06, x - w * s, yb);
        g.closePath();
        paint(g, s, M.pine, yt, yb);
        // Snow on each tier.
        g.beginPath();
        g.moveTo(x - w * s * 0.5, yb - (yb - yt) * 0.46);
        g.quadraticCurveTo(x - w * s * 0.18, yb - (yb - yt) * 0.85, x, yt + s * 0.005);
        g.quadraticCurveTo(x + w * s * 0.18, yb - (yb - yt) * 0.85, x + w * s * 0.5, yb - (yb - yt) * 0.46);
        g.lineTo(x + w * s * 0.25, yb - (yb - yt) * 0.38);
        g.lineTo(x + w * s * 0.05, yb - (yb - yt) * 0.5);
        g.lineTo(x - w * s * 0.18, yb - (yb - yt) * 0.38);
        g.closePath();
        paint(g, s * 0.8, M.snow, yt, yb - (yb - yt) * 0.38);
      }
      shine(g, x - s * 0.05, y - s * 1.02, s * 0.025, s * 0.05, 0.8, 0.4);
      break;
    }
    case 'crystal': {
      ground(g, x, y, s * 0.34, s * 0.1);
      glow(g, x, y - s * 0.42, s * 0.6, 'rgba(160,220,255,', 0.4);
      shard(g, s, x - s * 0.17, y - s * 0.02, s * 0.5, s * 0.08, -0.22, M.ice);
      shard(g, s, x + s * 0.18, y - s * 0.02, s * 0.44, s * 0.075, 0.25, M.ice);
      shard(g, s, x + s * 0.01, y, s * 0.82, s * 0.11, 0.03, M.ice);
      boulder(g, x, y + s * 0.01, s, s * 0.3, s * 0.12);
      paint(g, s, ROCK.peak, y - s * 0.11, y + s * 0.01);
      g.fillStyle = 'rgba(255,255,255,0.95)';
      star(g, x - s * 0.06, y - s * 0.62, s * 0.045, 4, 0.3);
      break;
    }
    case 'prism': {
      ground(g, x, y, s * 0.34, s * 0.1);
      glow(g, x, y - s * 0.45, s * 0.62, 'rgba(255,210,240,', 0.4);
      const k = v % SHARDS.length;
      shard(g, s, x - s * 0.19, y - s * 0.02, s * 0.56, s * 0.08, -0.2, SHARDS[k]);
      shard(g, s, x + s * 0.19, y - s * 0.02, s * 0.5, s * 0.075, 0.22, SHARDS[(k + 1) % 4]);
      shard(g, s, x + s * 0.01, y, s * 0.86, s * 0.11, 0.02, SHARDS[(k + 2) % 4]);
      shard(g, s, x - s * 0.05, y + s * 0.01, s * 0.34, s * 0.07, -0.08, SHARDS[(k + 3) % 4]);
      g.fillStyle = 'rgba(255,255,255,0.95)';
      star(g, x + s * 0.12, y - s * 0.7, s * 0.05, 4, 0.3);
      star(g, x - s * 0.24, y - s * 0.44, s * 0.03, 4, 0.3);
      break;
    }
    case 'starrock': {
      ground(g, x, y, s * 0.4, s * 0.12);
      glow(g, x, y - s * 0.32, s * 0.55, 'rgba(255,220,130,', 0.45);
      boulder(g, x, y, s, s * 0.37, s * 0.58);
      paint(g, s, M.indigo, y - s * 0.58, y);
      shine(g, x - s * 0.16, y - s * 0.44, s * 0.1, s * 0.045, 0.3);
      g.fillStyle = 'rgba(230,235,255,0.8)';
      for (const [dx, dy, r] of [[-0.22, -0.2, 0.014], [0.2, -0.42, 0.012], [0.25, -0.16, 0.016], [-0.1, -0.48, 0.01]]) {
        ellipse(g, x + dx * s, y + dy * s, r * s, r * s);
        g.fill();
      }
      // The fallen star, caught in the stone.
      g.fillStyle = 'rgba(20,12,50,0.55)';
      ellipse(g, x + s * 0.02, y - s * 0.28, s * 0.15, s * 0.12);
      g.fill();
      glow(g, x + s * 0.02, y - s * 0.3, s * 0.3, 'rgba(255,225,140,', 0.75);
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? s * 0.055 : s * 0.12;
        g.lineTo(x + s * 0.02 + Math.cos(a) * rr, y - s * 0.3 + Math.sin(a) * rr);
      }
      g.closePath();
      paint(g, s * 0.8, M.gold, y - s * 0.42, y - s * 0.2);
      shine(g, x - s * 0.01, y - s * 0.33, s * 0.025, s * 0.018, 0.85);
      break;
    }
    case 'telescope': {
      ground(g, x, y, s * 0.36, s * 0.1);
      const hx = x;
      const hy = y - s * 0.5;
      limb(g, s, [[hx, hy], [x + s * 0.04, y + s * 0.01]], M.tripod, s * 0.04);
      limb(g, s, [[hx, hy], [x - s * 0.28, y + s * 0.01]], M.tripod, s * 0.045);
      limb(g, s, [[hx, hy], [x + s * 0.28, y + s * 0.01]], M.tripod, s * 0.045);
      g.beginPath();
      g.arc(hx, hy, s * 0.05, 0, TAU);
      paint(g, s * 0.8, M.brass, hy - s * 0.05, hy + s * 0.05);
      g.save();
      g.translate(hx + s * 0.03, hy - s * 0.12);
      g.rotate(-0.62);
      // Eyepiece, tube with its bands, then the lens.
      g.beginPath();
      roundRect(g, -s * 0.38, -s * 0.045, s * 0.1, s * 0.09, s * 0.02);
      paint(g, s * 0.8, M.brass, -s * 0.045, s * 0.045);
      g.beginPath();
      g.moveTo(-s * 0.3, -s * 0.07);
      g.lineTo(s * 0.26, -s * 0.095);
      g.lineTo(s * 0.26, s * 0.095);
      g.lineTo(-s * 0.3, s * 0.07);
      g.closePath();
      paint(g, s, M.brass, -s * 0.095, s * 0.095);
      g.strokeStyle = M.brass[2];
      g.lineWidth = lw(s) * 0.8;
      for (const bx of [-0.12, 0.12]) {
        g.beginPath();
        g.moveTo(bx * s, -s * 0.085);
        g.lineTo(bx * s, s * 0.085);
        g.stroke();
      }
      shine(g, 0, -s * 0.045, s * 0.2, s * 0.018, 0.55, 0);
      g.beginPath();
      g.ellipse(s * 0.27, 0, s * 0.04, s * 0.1, 0, 0, TAU);
      paint(g, s * 0.8, M.lens, -s * 0.1, s * 0.1);
      shine(g, s * 0.265, -s * 0.03, s * 0.012, s * 0.03, 0.8, 0);
      g.restore();
      g.fillStyle = 'rgba(255,245,200,0.95)';
      star(g, x + s * 0.34, y - s * 0.98, s * 0.045, 4, 0.3);
      star(g, x + s * 0.44, y - s * 0.86, s * 0.025, 4, 0.3);
      break;
    }
    default:
      break;
  }
  g.restore();
}
