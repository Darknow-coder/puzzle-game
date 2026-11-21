// Animated backdrops for the title screen and the map.
import * as A from '../game/art.js';
import { parseLevel } from '../engine/core.js';

/** Title: a little floating island where the Lumignons play around a lantern. */
export class TitleScene {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.stars = A.makeStars(160, 5);
    this.L = parseLevel({
      id: 'title',
      map: [' ..... ', '.......', '..#.#..', ' ..... '],
      dirs: {},
    });
    this.lumis = [0, 1, 2, 3].map((c, i) => ({ c, x: [1, 5, 2, 4][i], y: [1, 1, 3, 3][i], fx: 0, fy: 0, tx: 0, ty: 0, p: 1, wait: i * 0.7, dir: 2 }));
    this.layoutKey = '';
  }

  resize(w, h, dpr) {
    this.W = w;
    this.H = h;
    this.dpr = dpr;
    const S = Math.floor(Math.min(w / 8.6, h / 11, 72));
    this.S = S;
    this.ox = Math.round((w - this.L.w * S) / 2);
    this.oy = Math.round(h * 0.47 - (this.L.h * S) / 2);
    const key = `${w}|${h}|${dpr}`;
    if (key !== this.layoutKey) {
      this.layoutKey = key;
      this.sky = A.renderSky(Math.ceil(w), Math.ceil(h), 'meadow', { moon: { x: 0.86, y: 0.3, r: 0.045 } });
      this.island = A.renderIsland(this.L, 'meadow', S, dpr);
    }
  }

  free(x, y) {
    const L = this.L;
    if (x < 0 || y < 0 || x >= L.w || y >= L.h) return false;
    const i = y * L.w + x;
    if (L.terrain[i] !== 1) return false;
    if (x === 3 && y === 1) return false;
    return !this.lumis.some((l) => (l.x === x && l.y === y) || (l.p < 1 && l.tx === x && l.ty === y));
  }

  update(dt) {
    this.t += dt;
    for (const l of this.lumis) {
      if (l.p < 1) {
        l.p = Math.min(1, l.p + dt / 0.45);
        if (l.p >= 1) {
          l.x = l.tx;
          l.y = l.ty;
          l.wait = 0.4 + Math.random() * 1.6;
          this.app.titleStep?.(l.c, l.x, l.y);
        }
        continue;
      }
      l.wait -= dt;
      if (l.wait > 0) continue;
      const dirs = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      for (const d of dirs) {
        const nx = l.x + [0, 1, 0, -1][d];
        const ny = l.y + [-1, 0, 1, 0][d];
        if (this.free(nx, ny)) {
          l.tx = nx;
          l.ty = ny;
          l.dir = d;
          l.p = 0;
          break;
        }
      }
      if (l.p >= 1) l.wait = 0.5;
    }
  }

  render(g) {
    const { W, H, S, t } = this;
    g.drawImage(this.sky, 0, 0, W, H);
    A.drawStars(g, this.stars, W, H, t, 0.8, 1.3);
    const fy = Math.sin(t * 0.9) * 4;
    g.save();
    g.translate(0, fy);
    const isl = this.island;
    g.drawImage(isl.canvas, this.ox - isl.pad, this.oy - isl.pad, isl.width, isl.height);
    const cell = (x, y) => [this.ox + (x + 0.5) * S, this.oy + (y + 0.5) * S];
    const items = [];
    for (let i = 0; i < this.L.w * this.L.h; i++) {
      if (this.L.terrain[i] !== 2) continue;
      const x = i % this.L.w;
      const y = (i / this.L.w) | 0;
      const [cx, cy] = cell(x, y);
      const spr = A.propSprite(x < 3 ? 'tree' : 'bush', S, 'meadow', x, this.dpr);
      items.push([cy + S * 0.22, () => g.drawImage(spr.canvas, cx - spr.ax, cy + S * 0.22 - spr.ay, spr.w, spr.h)]);
    }
    const [lx, ly] = cell(3, 1);
    const glowAmt = this.app.progressGlow ? this.app.progressGlow() : 0.5;
    items.push([ly + S * 0.22, () => {
      A.glow(g, lx, ly - S * 0.4, S * (2.2 + glowAmt * 2.5), 'rgba(255,190,90,', 0.35 + glowAmt * 0.4);
      A.drawLantern(g, lx, ly + S * 0.22, S * 1.25, 0, { lit: 0.6 + glowAmt * 0.4, home: true, t });
    }]);
    for (const l of this.lumis) {
      const [ax, ay] = cell(l.x, l.y);
      const [bx, by] = cell(l.p < 1 ? l.tx : l.x, l.p < 1 ? l.ty : l.y);
      const e = l.p < 1 ? (l.p < 0.5 ? 2 * l.p * l.p : 1 - Math.pow(-2 * l.p + 2, 2) / 2) : 1;
      const x = ax + (bx - ax) * e;
      const y = ay + (by - ay) * e + S * 0.24 - (l.p < 1 ? Math.sin(Math.PI * l.p) * S * 0.2 : 0);
      items.push([y, () => A.drawLumi(g, x, y, S, { color: l.c, dir: l.dir, t: t + l.c, walk: l.p * 2, squash: l.p < 1 ? 0 : Math.sin(t * 3 + l.c) * 0.05, hat: this.app.hat(), mood: l.p < 1 ? 'idle' : 'happy' })]);
    }
    items.sort((a, b) => a[0] - b[0]);
    for (const [, fn] of items) fn();
    g.restore();
  }
}

/** Map: the sky of the world currently in view, cross-faded while scrolling. */
export class MapBackdrop {
  constructor() {
    this.t = 0;
    this.key = 'meadow';
    this.prev = null;
    this.fade = 1;
    this.skies = new Map();
    this.stars = A.makeStars(170, 9);
  }
  resize(w, h, dpr) {
    if (w !== this.W || h !== this.H) this.skies.clear();
    this.W = w;
    this.H = h;
    this.dpr = dpr;
  }
  sky(key) {
    let s = this.skies.get(key);
    if (!s) {
      s = A.renderSky(Math.ceil(this.W), Math.ceil(this.H), key);
      this.skies.set(key, s);
    }
    return s;
  }
  setWorld(key) {
    if (key === this.key) return;
    this.prev = this.key;
    this.key = key;
    this.fade = 0;
  }
  update(dt) {
    this.t += dt;
    if (this.fade < 1) this.fade = Math.min(1, this.fade + dt * 1.8);
  }
  render(g) {
    if (this.prev && this.fade < 1) g.drawImage(this.sky(this.prev), 0, 0, this.W, this.H);
    g.globalAlpha = this.prev ? this.fade : 1;
    g.drawImage(this.sky(this.key), 0, 0, this.W, this.H);
    g.globalAlpha = 1;
    A.drawStars(g, this.stars, this.W, this.H, this.t, A.WORLD_STYLES[this.key].stars, 1.3);
  }
}
