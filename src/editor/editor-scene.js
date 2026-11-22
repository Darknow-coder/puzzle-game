// The board of the level editor: same rendering as the game, but taps paint.
import { GameScene } from '../game/scene.js';
import * as A from '../game/art.js';
import { toDef, THEMES } from './model.js';

export class EditorScene extends GameScene {
  constructor(app) {
    super(app);
    this.model = null;
    this.layoutArgs = null;
    this.painting = null;
    this.noDots = true;
  }

  setModel(model) {
    this.model = model;
    this.rebuild();
  }

  /** Re-parses the model after an edit and keeps the current layout. */
  rebuild() {
    const m = this.model;
    const keepT = this.t;
    const wi = Math.max(0, THEMES.indexOf(m.theme));
    try {
      this.load({ def: toDef(m, { forRender: true }), world: { id: m.theme }, wi, li: 0, bonus: false, solution: null });
      this.broken = null;
    } catch (err) {
      this.broken = err.message;
    }
    this.t = keepT;
    if (this.layoutArgs) super.resize(...this.layoutArgs);
  }

  resize(...args) {
    this.layoutArgs = args;
    if (this.L) super.resize(...args);
  }

  update(dt) {
    this.t += dt;
    this.fx.update(dt);
    for (let i = 0; i < (this.blinks || []).length; i++) {
      this.blinks[i] -= dt;
      if (this.blinks[i] < -0.14) this.blinks[i] = 2 + Math.random() * 3.5;
    }
  }

  pointerDown(px, py, id) {
    const idx = this.cellAt(px, py);
    if (idx < 0) return;
    this.painting = { id, last: idx };
    this.app.editorPaint(idx, false);
  }

  pointerMove(px, py, id) {
    const p = this.painting;
    if (!p || p.id !== id) return;
    const idx = this.cellAt(px, py);
    if (idx >= 0 && idx !== p.last) {
      p.last = idx;
      this.app.editorPaint(idx, true);
    }
  }

  pointerUp() {
    this.painting = null;
  }

  render(g) {
    if (!this.L) return;
    super.render(g);
    const m = this.model;
    const S = this.S;
    // Faint grid over every cell, holes included, so you can see where to paint.
    g.save();
    g.strokeStyle = 'rgba(255,255,255,0.16)';
    g.lineWidth = 1;
    g.setLineDash([4, 5]);
    for (let y = 0; y < m.h; y++)
      for (let x = 0; x < m.w; x++) {
        const c = m.cells[y * m.w + x];
        if (c.t !== ' ' && c.t !== 'o') continue;
        g.beginPath();
        A.roundRect(g, this.ox + x * S + 3, this.oy + y * S + 3, S - 6, S - 6, S * 0.15);
        g.stroke();
      }
    g.setLineDash([]);
    // A lone moon gate is shown with a question mark until its twin exists.
    const count = { '@': 0, '%': 0 };
    for (const c of m.cells) if (c.e === '@' || c.e === '%') count[c.e]++;
    m.cells.forEach((c, i) => {
      if ((c.e === '@' || c.e === '%') && count[c.e] !== 2) {
        const [cx, cy] = this.cellCenter(i);
        A.drawPortal(g, cx, cy, S, c.e === '@' ? 0 : 1, this.t);
        g.fillStyle = '#fff';
        g.font = `700 ${Math.round(S * 0.32)}px Fredoka, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('?', cx, cy + 1);
      }
    });
    g.restore();
  }
}
