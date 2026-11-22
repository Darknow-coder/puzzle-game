// The shop's stage, drawn on the main canvas behind the shop screen: a night
// market stall, Madame Phalène (a moth, the shopkeeper: moths love lights) and
// the four Lumignons on a podium, trying on whatever the player looks at.
import * as A from '../game/art.js';
import { Particles } from '../game/fx.js';

export const RARITY_COLORS = {
  common: ['#7eebb0', 'rgba(126,235,176,'],
  rare: ['#6cc8ff', 'rgba(108,200,255,'],
  epic: ['#c58bff', 'rgba(197,139,255,'],
  legendary: ['#ffcf5a', 'rgba(255,207,90,'],
};

/** Madame Phalène: fluffy body, feathery antennae, soft wings, round spectacles. */
export function drawPhalene(g, x, y, s, t, mood = 'idle') {
  const bob = Math.sin(t * 1.6) * s * 0.02;
  const flap = 0.85 + 0.15 * Math.sin(t * (mood === 'happy' ? 9 : 2.2));
  g.save();
  g.translate(x, y + bob);
  // Wings, behind.
  for (const sg of [-1, 1]) {
    g.save();
    g.scale(sg * flap, 1);
    const grd = g.createLinearGradient(0, -s * 0.5, s * 0.75, s * 0.2);
    grd.addColorStop(0, '#f6d9ff');
    grd.addColorStop(0.6, '#d7a8f0');
    grd.addColorStop(1, '#b07cd8');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(s * 0.05, -s * 0.12);
    g.bezierCurveTo(s * 0.3, -s * 0.62, s * 0.82, -s * 0.55, s * 0.72, -s * 0.12);
    g.bezierCurveTo(s * 0.68, s * 0.02, s * 0.35, s * 0.05, s * 0.05, s * 0.02);
    g.fill();
    g.fillStyle = '#c9a0ea';
    g.beginPath();
    g.moveTo(s * 0.05, s * 0.02);
    g.bezierCurveTo(s * 0.35, s * 0.05, s * 0.55, s * 0.18, s * 0.45, s * 0.36);
    g.bezierCurveTo(s * 0.32, s * 0.48, s * 0.12, s * 0.34, s * 0.05, s * 0.2);
    g.fill();
    // Eye spots.
    g.fillStyle = '#ffe6a6';
    A.ellipse(g, s * 0.45, -s * 0.28, s * 0.1, s * 0.1);
    g.fill();
    g.fillStyle = '#9a5fc9';
    A.ellipse(g, s * 0.45, -s * 0.28, s * 0.055, s * 0.055);
    g.fill();
    g.fillStyle = '#ffffff';
    A.ellipse(g, s * 0.43, -s * 0.3, s * 0.018, s * 0.018);
    g.fill();
    g.restore();
  }
  // Body: a fluffy pear with a fur collar.
  g.fillStyle = '#fff4e4';
  A.ellipse(g, 0, s * 0.12, s * 0.2, s * 0.28);
  g.fill();
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.05 + (i / 8) * 0.9);
    A.ellipse(g, Math.cos(a) * s * 0.17, -s * 0.06 + Math.sin(a) * s * 0.05, s * 0.06, s * 0.05);
    g.fill();
  }
  // Apron.
  g.fillStyle = '#ff8fb8';
  A.roundRect(g, -s * 0.12, s * 0.06, s * 0.24, s * 0.26, s * 0.06);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.fillRect(-s * 0.08, s * 0.14, s * 0.16, s * 0.025);
  // Head.
  g.fillStyle = '#fff4e4';
  A.ellipse(g, 0, -s * 0.2, s * 0.17, s * 0.15);
  g.fill();
  // Antennae, feathery.
  for (const sg of [-1, 1]) {
    const sway = Math.sin(t * 1.3 + sg) * s * 0.03;
    g.strokeStyle = '#8a6a5a';
    g.lineWidth = Math.max(1, s * 0.012);
    g.beginPath();
    g.moveTo(sg * s * 0.06, -s * 0.32);
    g.quadraticCurveTo(sg * s * 0.12 + sway, -s * 0.5, sg * s * 0.24 + sway, -s * 0.58);
    g.stroke();
    for (let k = 1; k < 9; k++) {
      const u = k / 9;
      const px = sg * (s * 0.06 + u * s * 0.18) + sway * u;
      const py = -s * 0.32 - u * s * 0.26;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + sg * s * 0.04, py - s * 0.03);
      g.moveTo(px, py);
      g.lineTo(px - sg * s * 0.02, py - s * 0.045);
      g.stroke();
    }
  }
  // Face: big eyes behind round spectacles, rosy cheeks, smile.
  const blink = Math.sin(t * 0.9) > 0.985 || mood === 'happy';
  for (const sg of [-1, 1]) {
    const ex = sg * s * 0.065;
    const ey = -s * 0.21;
    if (blink) {
      g.strokeStyle = '#3a2a3a';
      g.lineWidth = Math.max(1, s * 0.014);
      g.beginPath();
      g.arc(ex, ey + s * 0.005, s * 0.03, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    } else {
      g.fillStyle = '#3a2a3a';
      A.ellipse(g, ex, ey, s * 0.032, s * 0.04);
      g.fill();
      g.fillStyle = '#ffffff';
      A.ellipse(g, ex - s * 0.01, ey - s * 0.014, s * 0.012, s * 0.012);
      g.fill();
    }
    g.strokeStyle = '#d9a032';
    g.lineWidth = Math.max(1, s * 0.012);
    g.beginPath();
    g.arc(ex, ey, s * 0.055, 0, A.TAU);
    g.stroke();
    g.fillStyle = 'rgba(255,130,150,0.45)';
    A.ellipse(g, sg * s * 0.11, -s * 0.15, s * 0.03, s * 0.018);
    g.fill();
  }
  g.strokeStyle = '#d9a032';
  g.beginPath();
  g.moveTo(-s * 0.012, -s * 0.21);
  g.lineTo(s * 0.012, -s * 0.21);
  g.stroke();
  g.strokeStyle = '#3a2a3a';
  g.lineWidth = Math.max(1, s * 0.014);
  g.beginPath();
  g.arc(0, -s * 0.15, s * (mood === 'happy' ? 0.035 : 0.025), Math.PI * 0.15, Math.PI * 0.85);
  g.stroke();
  // A little lantern in her hand.
  const lx = s * 0.22;
  const ly = s * 0.06 + Math.sin(t * 1.6 + 1) * s * 0.01;
  g.strokeStyle = '#8a6a5a';
  g.beginPath();
  g.moveTo(s * 0.15, s * 0.02);
  g.lineTo(lx, ly - s * 0.06);
  g.stroke();
  A.glow(g, lx, ly, s * 0.22, 'rgba(255,200,110,', 0.8);
  g.fillStyle = '#ffd98a';
  A.roundRect(g, lx - s * 0.04, ly - s * 0.05, s * 0.08, s * 0.1, s * 0.02);
  g.fill();
  g.fillStyle = '#b8692a';
  g.fillRect(lx - s * 0.045, ly - s * 0.06, s * 0.09, s * 0.015);
  g.fillRect(lx - s * 0.045, ly + s * 0.045, s * 0.09, s * 0.015);
  g.restore();
}

/** A treasure chest (lid opening from 0 to 1), its seam glowing in `glowCol` (rgba prefix). */
export function drawChest(g, x, y, s, open = 0, glowCol = 'rgba(255,220,120,', shake = 0) {
  g.save();
  g.translate(x + Math.sin(shake * 60) * shake * s * 0.04, y);
  g.rotate(Math.sin(shake * 47) * shake * 0.06);
  A.glow(g, 0, -s * 0.2, s * (0.9 + open * 0.8), glowCol, 0.35 + shake * 0.4 + open * 0.5);
  // Box.
  const grd = g.createLinearGradient(0, -s * 0.2, 0, s * 0.3);
  grd.addColorStop(0, '#a8643a');
  grd.addColorStop(1, '#6e3a22');
  g.fillStyle = grd;
  A.roundRect(g, -s * 0.42, -s * 0.18, s * 0.84, s * 0.48, s * 0.06);
  g.fill();
  g.fillStyle = '#e8b53a';
  g.fillRect(-s * 0.42, -s * 0.18, s * 0.84, s * 0.05);
  g.fillRect(-s * 0.3, -s * 0.18, s * 0.06, s * 0.48);
  g.fillRect(s * 0.24, -s * 0.18, s * 0.06, s * 0.48);
  // Light escaping from the seam.
  if (open < 1) {
    g.fillStyle = glowCol + (0.6 + shake * 0.4) + ')';
    g.fillRect(-s * 0.4, -s * 0.2, s * 0.8, s * 0.025 + shake * s * 0.02);
  }
  // The dark inside shows as the lid tips back.
  if (open > 0) {
    g.fillStyle = '#2a1408';
    A.ellipse(g, 0, -s * 0.19, s * 0.4, s * 0.06 * open);
    g.fill();
  }
  // Lid: seen from the front, tipping back flattens it and lifts it.
  g.save();
  g.translate(0, -s * 0.2 - open * s * 0.16);
  g.scale(1, 1 - open * 0.78);
  const lg = g.createLinearGradient(0, -s * 0.28, 0, 0);
  lg.addColorStop(0, '#c07848');
  lg.addColorStop(1, '#8a4a2a');
  g.fillStyle = lg;
  g.beginPath();
  g.moveTo(-s * 0.44, 0);
  g.lineTo(-s * 0.44, -s * 0.12);
  g.quadraticCurveTo(0, -s * 0.34, s * 0.44, -s * 0.12);
  g.lineTo(s * 0.44, 0);
  g.closePath();
  g.fill();
  g.fillStyle = '#e8b53a';
  g.fillRect(-s * 0.3, -s * 0.22, s * 0.06, s * 0.22);
  g.fillRect(s * 0.24, -s * 0.22, s * 0.06, s * 0.22);
  // Lock.
  g.fillStyle = '#ffd24a';
  A.roundRect(g, -s * 0.06, -s * 0.07, s * 0.12, s * 0.12, s * 0.025);
  g.fill();
  g.fillStyle = '#6e3a22';
  A.ellipse(g, 0, -s * 0.015, s * 0.018, s * 0.022);
  g.fill();
  g.restore();
  g.restore();
}

export class ShopScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.stars = A.makeStars(90, 12);
    this.fx = new Particles();
    this.preview = null; // {slot, id} worn for a moment by the chosen Lumignons
    this.who = -1; // -1: all four, else a colour
    this.jump = [0, 0, 0, 0];
    this.mood = 'idle';
    this.moodT = 0;
    this.demo = null; // trail demo: a Lumignon running across the stage
    this.partyT = 0;
    this.lights = Array.from({ length: 9 }, (_, i) => ({ c: ['#ff8fb8', '#ffd24a', '#7eebb0', '#6cc8ff', '#c58bff'][i % 5], p: i * 0.7 }));
  }

  resize(w, h, dpr, top, bottom) {
    this.W = w;
    this.H = h;
    this.dpr = dpr;
    this.top = top;
    this.bottom = Math.max(top + 120, bottom);
    const stage = this.bottom - this.top;
    this.S = Math.max(34, Math.min(64, stage * 0.3, w * 0.15));
    if (this.skyKey !== `${w}|${h}|${A.gpu.epoch}`) {
      this.skyKey = `${w}|${h}|${A.gpu.epoch}`;
      this.sky = A.renderSky(Math.ceil(w), Math.ceil(h), 'grove', { moon: { x: 0.12, y: 0.12, r: 0.035 } });
    }
  }

  /** Positions of the four Lumignons on the podium. */
  spots() {
    const y = this.bottom - this.S * 0.42;
    const x0 = this.W * 0.11;
    const step = Math.min(this.W * 0.155, this.S * 1.25);
    return [0, 1, 2, 3].map((c) => [x0 + c * step + this.S * 0.2, y]);
  }

  hit(px, py) {
    const S = this.S;
    let best = -2;
    this.spots().forEach(([x, y], c) => {
      if (Math.abs(px - x) < S * 0.5 && py > y - S * 1.1 && py < y + S * 0.2) best = c;
    });
    return best;
  }

  setPreview(p) {
    this.preview = p;
    this.demo = p && p.slot === 'trail' ? { style: p.id, t0: this.t, pts: [] } : null;
    this.partyT = p && p.slot === 'party' ? 0.01 : 0;
    if (p && p.slot !== 'trail' && p.slot !== 'party') this.hop();
  }

  hop(c = this.who) {
    for (let i = 0; i < 4; i++) if (c < 0 || c === i) this.jump[i] = 1;
  }

  say(mood) {
    this.mood = mood;
    this.moodT = 1.6;
  }

  /** Purchase or chest: a burst in the rarity's colour from the Lumignons who wear it. */
  celebrate(rarity) {
    const [, col] = RARITY_COLORS[rarity] || RARITY_COLORS.common;
    const pts = this.spots().filter((_, c) => this.who < 0 || c === this.who);
    for (const [x, y] of pts) {
      this.fx.emit('star', x, y - this.S * 0.6, rarity === 'legendary' ? 22 : 12, { speed: 170, life: 1.1, size: this.S * 0.09, color: col, fill: '#fffbe6' });
      this.fx.emit('confetti', x, y - this.S * 0.6, rarity === 'legendary' ? 26 : 10, { speed: 230, life: 1.8, size: this.S * 0.12, gravity: 300, vy: -150, drag: 0.8, fill: 'random' });
    }
    if (rarity === 'legendary' || rarity === 'epic') this.fx.party(rarity === 'legendary' ? 'starfall' : 'confetti', this.W, this.bottom, [], this.S * 0.8);
    this.hop();
    this.say('happy');
  }

  update(dt) {
    this.t += dt;
    this.fx.update(dt);
    for (let i = 0; i < 4; i++) this.jump[i] = Math.max(0, this.jump[i] - dt * 1.8);
    if (this.moodT > 0 && (this.moodT -= dt) <= 0) this.mood = 'idle';
    if (this.partyT > 0) {
      this.partyT -= dt;
      if (this.partyT <= 0 && this.preview?.slot === 'party') {
        const pts = this.spots().map(([x, y]) => [x, y - this.S * 0.5]);
        this.fx.party(this.preview.id === 'classic' ? 'confetti' : this.preview.id, this.W, this.bottom, pts.slice(1, 3), this.S * 0.9);
        if (this.preview.id === 'classic') for (const [x, y] of pts) this.fx.emit('star', x, y, 8, { speed: 120, life: 0.9, size: this.S * 0.08 });
        this.partyT = 3.6;
      }
    }
    if (this.demo) {
      // A Lumignon runs across the stage, back and forth, leaving the trail.
      const d = this.demo;
      const k = ((this.t - d.t0) % 3.2) / 3.2;
      const x = this.W * (0.08 + 0.84 * k);
      const y = this.top + (this.bottom - this.top) * 0.42 - Math.sin(k * Math.PI * 2) * this.S * 0.35;
      d.x = x;
      d.y = y;
      const last = d.pts[d.pts.length - 1];
      if (!last || Math.hypot(x - last.x, y - last.y) > 3) d.pts.push({ x, y, t: this.t, n: (d.n = (d.n || 0) + 1) });
      while (d.pts.length && this.t - d.pts[0].t > 1.4) d.pts.shift();
    }
  }

  lookOf(c) {
    const d = this.app.dress(c);
    const p = this.preview;
    if (p && (this.who < 0 || this.who === c)) {
      if (p.slot === 'hat') d.hat = p.id;
      if (p.slot === 'glasses') d.glasses = p.id;
      if (p.slot === 'flame') d.flameStyle = p.id;
    }
    return d;
  }

  render(g) {
    if (this.skyKey !== `${this.W}|${this.H}|${A.gpu.epoch}`) this.resize(this.W, this.H, this.dpr, this.top, this.bottom);
    const { W, S, t } = this;
    const top = this.top;
    const bottom = this.bottom;
    g.drawImage(this.sky, 0, 0, W, this.H);
    A.drawStars(g, this.stars, W, this.H, t, 0.9, 1.2);
    // Awning across the top of the stage.
    const aw = top + S * 0.25;
    const stripes = Math.ceil(W / (S * 0.6));
    for (let i = 0; i < stripes; i++) {
      const x0 = (i * W) / stripes;
      const x1 = ((i + 1) * W) / stripes;
      g.fillStyle = i % 2 ? '#ffe9c4' : '#8a4fd0';
      g.beginPath();
      g.moveTo(x0, top - S * 0.2);
      g.lineTo(x1, top - S * 0.2);
      g.lineTo(x1, aw);
      g.quadraticCurveTo((x0 + x1) / 2, aw + S * 0.22, x0, aw);
      g.closePath();
      g.fill();
    }
    g.fillStyle = 'rgba(20,10,40,0.18)';
    g.fillRect(0, aw - 2, W, 3);
    // String of little lights under the awning, swinging.
    g.strokeStyle = 'rgba(255,240,210,0.55)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(0, aw + S * 0.3);
    g.quadraticCurveTo(W / 2, aw + S * 0.75, W, aw + S * 0.3);
    g.stroke();
    this.lights.forEach((l, i) => {
      const u = (i + 0.5) / this.lights.length;
      const x = u * W;
      const y = aw + S * 0.3 + 4 * u * (1 - u) * S * 0.45 + Math.sin(t * 2 + l.p) * 2;
      A.glow(g, x, y + S * 0.08, S * 0.45, A.rgba(l.c, 1).replace(/[\d.]+\)$/, ''), 0.55 + 0.2 * Math.sin(t * 3 + l.p));
      g.fillStyle = l.c;
      A.ellipse(g, x, y + S * 0.08, S * 0.07, S * 0.09);
      g.fill();
    });
    // The shop's sign, hanging from the awning.
    if (this.signText) {
      const sx = W * 0.24;
      const sy = aw + S * 0.62;
      const swing = Math.sin(t * 1.2) * 0.03;
      g.save();
      g.translate(sx, aw);
      g.rotate(swing);
      g.strokeStyle = '#d9c39a';
      g.lineWidth = 1.5;
      g.font = `700 ${Math.round(S * 0.34)}px Fredoka, sans-serif`;
      const tw = g.measureText(this.signText).width + S * 0.5;
      const sh = S * 0.5;
      g.beginPath();
      g.moveTo(-tw * 0.35, 0);
      g.lineTo(-tw * 0.35, sy - aw - sh / 2);
      g.moveTo(tw * 0.35, 0);
      g.lineTo(tw * 0.35, sy - aw - sh / 2);
      g.stroke();
      g.translate(0, sy - aw);
      g.fillStyle = 'rgba(20,10,40,0.3)';
      A.roundRect(g, -tw / 2 + 3, -sh / 2 + 4, tw, sh, S * 0.12);
      g.fill();
      const wg = g.createLinearGradient(0, -sh / 2, 0, sh / 2);
      wg.addColorStop(0, '#b47a4a');
      wg.addColorStop(1, '#7e4c2c');
      g.fillStyle = wg;
      A.roundRect(g, -tw / 2, -sh / 2, tw, sh, S * 0.12);
      g.fill();
      g.strokeStyle = '#e8b53a';
      g.lineWidth = 2;
      A.roundRect(g, -tw / 2 + 3, -sh / 2 + 3, tw - 6, sh - 6, S * 0.1);
      g.stroke();
      g.fillStyle = '#fff4d6';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.shadowColor = 'rgba(255,190,90,0.8)';
      g.shadowBlur = 8;
      g.fillText(this.signText, 0, 1);
      g.shadowBlur = 0;
      g.restore();
    }
    // Shelves with glowing jars, on the right.
    const shX = W * 0.62;
    for (let r = 0; r < 2; r++) {
      const sy = top + (bottom - top) * (0.42 + r * 0.22);
      g.fillStyle = '#6e4a32';
      g.fillRect(shX, sy, W - shX - 6, S * 0.07);
      for (let j = 0; j < 3; j++) {
        const jx = shX + S * 0.3 + j * S * 0.55;
        if (jx > W - S * 0.3) break;
        const jy = sy - S * 0.2;
        A.glow(g, jx, jy, S * 0.35, ['rgba(255,230,120,', 'rgba(140,255,200,', 'rgba(255,150,210,'][(j + r) % 3], 0.4 + 0.2 * Math.sin(t * 2 + j + r));
        g.fillStyle = 'rgba(220,240,255,0.3)';
        A.roundRect(g, jx - S * 0.14, jy - S * 0.18, S * 0.28, S * 0.36, S * 0.06);
        g.fill();
        g.fillStyle = '#b8692a';
        g.fillRect(jx - S * 0.1, jy - S * 0.22, S * 0.2, S * 0.05);
        for (let f = 0; f < 3; f++) {
          g.fillStyle = '#fffbe0';
          A.ellipse(g, jx + Math.sin(t * 2 + f * 2 + j) * S * 0.08, jy + Math.cos(t * 1.7 + f * 3) * S * 0.1, S * 0.018, S * 0.018);
          g.fill();
        }
      }
    }
    // Madame Phalène behind her counter.
    const pmS = Math.min(S * 2.3, (bottom - top) * 0.6);
    drawPhalene(g, W * 0.82, bottom - pmS * 0.52, pmS, t, this.mood);
    const cg = g.createLinearGradient(0, bottom - S * 0.45, 0, bottom + S * 0.2);
    cg.addColorStop(0, '#9a6440');
    cg.addColorStop(1, '#6e4028');
    g.fillStyle = cg;
    A.roundRect(g, W * 0.64, bottom - S * 0.45, W * 0.38, S * 0.7, S * 0.08);
    g.fill();
    g.fillStyle = '#e8b53a';
    g.fillRect(W * 0.64, bottom - S * 0.45, W * 0.38, S * 0.05);
    // Podium.
    const spots = this.spots();
    const px0 = spots[0][0] - S * 0.6;
    const px1 = spots[3][0] + S * 0.6;
    g.fillStyle = 'rgba(20,10,40,0.35)';
    A.ellipse(g, (px0 + px1) / 2, bottom - S * 0.32, (px1 - px0) / 2 + S * 0.1, S * 0.2);
    g.fill();
    const pg = g.createLinearGradient(0, bottom - S * 0.5, 0, bottom - S * 0.2);
    pg.addColorStop(0, '#d9a070');
    pg.addColorStop(1, '#a8643a');
    g.fillStyle = pg;
    A.ellipse(g, (px0 + px1) / 2, bottom - S * 0.42, (px1 - px0) / 2, S * 0.17);
    g.fill();
    // Spotlight on whoever is being dressed.
    spots.forEach(([x, y], c) => {
      if (this.who >= 0 && this.who !== c) return;
      const grd = g.createLinearGradient(0, top, 0, y);
      grd.addColorStop(0, 'rgba(255,245,210,0)');
      grd.addColorStop(1, 'rgba(255,245,210,0.16)');
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(x - S * 0.12, top + S * 0.4);
      g.lineTo(x + S * 0.12, top + S * 0.4);
      g.lineTo(x + S * 0.55, y);
      g.lineTo(x - S * 0.55, y);
      g.closePath();
      g.fill();
    });
    // The Lumignons.
    spots.forEach(([x, y], c) => {
      const j = this.jump[c];
      const hopY = Math.sin(j * Math.PI) * S * 0.35;
      const dim = this.who >= 0 && this.who !== c;
      A.drawLumi(g, x, y - hopY, S, { color: c, dir: 2, t: t + c * 1.3, mood: j > 0 || this.mood === 'happy' ? 'happy' : 'idle', squash: j > 0.85 ? 0.2 : 0, alpha: dim ? 0.55 : 1, ...this.lookOf(c) });
    });
    // Trail demo.
    if (this.demo && this.demo.x !== undefined) {
      const d = this.demo;
      d.pts.forEach((pt) => {
        const k = 1 - (t - pt.t) / 1.4;
        A.drawTrailDot(g, d.style, pt.x, pt.y + S * 0.2, S, k, A.LUMI[1].glow, pt.n, t);
      });
      A.drawLumi(g, d.x, d.y + S * 0.4, S * 0.8, { color: 1, dir: 1, t, walk: t * 2, ...this.app.dress(1) });
    }
    this.fx.draw(g);
  }
}
