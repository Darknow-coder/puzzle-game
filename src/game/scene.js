// The puzzle screen: board rendering, touch/mouse input, planning and the
// animated playback of a simulated run.
import { parseLevel, simulate, canPlace, PIECE, PIECE_KEYS, KIND, STATUS, T, DX, DY, LUMI_NAMES } from '../engine/core.js';
import * as A from './art.js';
import { Particles } from './fx.js';
import { sound } from '../audio.js';

const TICK = [0, 0.46, 0.27, 0.14];
const PICK_R = 0.36;

const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp01((p - a) / (b - a));

export class GameScene {
  constructor(app) {
    this.app = app;
    this.fx = new Particles();
    this.t = 0;
    this.L = null;
  }

  // ------------------------------------------------------------------ setup

  load(info) {
    this.info = info;
    this.def = info.def;
    this.L = parseLevel(info.def);
    this.worldKey = info.world.id;
    this.style = A.WORLD_STYLES[this.worldKey];
    this.solution = info.solution || null;
    this.par = this.solution ? this.solution.par : 99;
    this.placements = new Map();
    this.history = [];
    this.mode = 'plan';
    this.picker = null;
    this.gesture = null;
    this.hintCells = [];
    this.wrongCells = [];
    this.hintsUsed = 0;
    this.flashCell = null;
    this.speed = this.app.settings().speed || 1;
    this.coach = null;
    this.clearRun();
    this.lastArrowDir = 1;
    this.blinks = this.L.walkers.map(() => 1 + Math.random() * 3);
    const inv = this.L.inventory;
    this.selected = ['arrow', 'lily', 'mushroom', 'daisy'].find((k) => inv[k] > 0) || 'arrow';
    this.layoutKey = '';
    this.island = null;
    this.sky = null;
    this.stars = A.makeStars(140, info.wi * 17 + 3);
    this.motes = [];
    for (let i = 0; i < 14; i++) this.motes.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random(), p: Math.random() * 6 });
    this.app.hudChanged();
  }

  /** Forgets everything the previous run left on screen (paths, trails, tune, markers). */
  clearRun() {
    this.run = null;
    this.failInfo = null;
    this.trails = [];
    this.winPaths = null;
    this.melody = null;
    clearTimeout(this.melodyTimer);
    this.fx.clear();
    this.shake = 0;
    this.post = 0;
    this.paused = false;
    this.stepping = false;
    this.replaying = false;
  }

  inventoryLeft() {
    const left = { ...this.L.inventory };
    for (const p of this.placements.values()) left[PIECE_KEYS[p.type]]--;
    return left;
  }

  placementList() {
    return [...this.placements.entries()].map(([idx, p]) => ({ idx, type: p.type, dir: p.dir }));
  }

  // ----------------------------------------------------------------- layout

  resize(w, h, dpr, top, bottom, right = 0) {
    this.W = w;
    this.H = h;
    this.dpr = dpr;
    const L = this.L;
    const areaW = w - 16 - right;
    const areaH = h - top - bottom - 10;
    // Room above the top row for tall props, below the last row for the island's side.
    const above = 0.72;
    const below = 0.55;
    let S = Math.min(areaW / (L.w + 0.25), areaH / (L.h + above + below));
    S = Math.max(26, Math.min(S, 88));
    S = Math.floor(S);
    this.S = S;
    const bw = L.w * S;
    this.ox = Math.round((w - right - bw) / 2);
    this.oy = Math.round(top + (areaH - (L.h + above + below) * S) / 2 + above * S);
    const key = `${S}|${dpr}|${w}|${h}`;
    if (key !== this.layoutKey) {
      this.layoutKey = key;
      this.island = A.renderIsland(L, this.worldKey, S, dpr);
      this.sky = A.renderSky(Math.ceil(w), Math.ceil(h), this.worldKey);
    }
  }

  cellCenter(idx) {
    const x = idx % this.L.w;
    const y = (idx / this.L.w) | 0;
    return [this.ox + (x + 0.5) * this.S, this.oy + (y + 0.5) * this.S];
  }

  cellAt(px, py) {
    const x = Math.floor((px - this.ox) / this.S);
    const y = Math.floor((py - this.oy) / this.S);
    if (x < 0 || y < 0 || x >= this.L.w || y >= this.L.h) return -1;
    return y * this.L.w + x;
  }

  // ------------------------------------------------------------- planning

  snapshot() {
    this.history.push(this.placementList());
    if (this.history.length > 200) this.history.shift();
  }

  restore(list) {
    this.placements = new Map(list.map((p) => [p.idx, { type: p.type, dir: p.dir }]));
  }

  candidateTypes(idx) {
    const left = this.inventoryLeft();
    const out = [];
    for (const k of ['arrow', 'lily', 'mushroom', 'daisy']) {
      const type = PIECE[k.toUpperCase()];
      if (this.L.inventory[k] > 0 && canPlace(this.L, idx, type)) out.push({ k, type, left: left[k] });
    }
    return out;
  }

  placeAt(idx, typeKey, dir) {
    const type = PIECE[typeKey.toUpperCase()];
    this.snapshot();
    this.placements.set(idx, { type, dir: type === PIECE.ARROW ? dir : 0, born: this.t });
    this.hintCells = this.hintCells.filter((h) => h.idx !== idx);
    this.wrongCells = this.wrongCells.filter((c) => c !== idx);
    sound.sfx('place');
    const [cx, cy] = this.cellCenter(idx);
    this.fx.emit('star', cx, cy, 6, { speed: 70, life: 0.5, size: this.S * 0.06, color: 'rgba(255,220,140,' });
    this.app.hudChanged();
  }

  removeAt(idx) {
    if (!this.placements.has(idx)) return;
    this.snapshot();
    this.placements.delete(idx);
    this.wrongCells = this.wrongCells.filter((c) => c !== idx);
    sound.sfx('remove');
    const [cx, cy] = this.cellCenter(idx);
    this.fx.emit('puff', cx, cy, 6, { speed: 40, life: 0.5, size: this.S * 0.12, fill: 'rgba(255,255,255,0.7)' });
    this.app.hudChanged();
  }

  setDir(idx, dir) {
    const p = this.placements.get(idx);
    if (!p || p.type !== PIECE.ARROW || p.dir === dir) return;
    this.snapshot();
    p.dir = dir;
    p.born = this.t;
    this.lastArrowDir = dir;
    this.wrongCells = this.wrongCells.filter((c) => c !== idx);
    sound.sfx('rotate');
    this.app.hudChanged();
  }

  undo() {
    if (this.mode !== 'plan' || !this.history.length) return;
    this.restore(this.history.pop());
    this.picker = null;
    sound.sfx('remove');
    this.app.hudChanged();
  }

  clearAll() {
    if (this.mode !== 'plan' || !this.placements.size) return;
    this.snapshot();
    this.placements.clear();
    this.picker = null;
    this.wrongCells = [];
    sound.sfx('remove');
    this.app.hudChanged();
  }

  invalid(idx, msg) {
    this.flashCell = { idx, t: this.t };
    sound.sfx('invalid');
    if (msg) this.app.toast(msg, 1400);
  }

  // ---------------------------------------------------------------- hints

  hint() {
    if (this.mode !== 'plan' || !this.solution) return;
    // Follow the perfect layout that shares the most pieces with the player's.
    const layouts = [this.solution.sol, ...(this.solution.alt || [])].map((l) => l.map(([idx, type, dir]) => ({ idx, type, dir })));
    const matches = (s) => {
      const p = this.placements.get(s.idx);
      return p && p.type === s.type && (s.type !== PIECE.ARROW || p.dir === s.dir);
    };
    let sol = layouts[0];
    let bestScore = -1;
    for (const l of layouts) {
      const score = l.filter(matches).length;
      if (score > bestScore) {
        bestScore = score;
        sol = l;
      }
    }
    const good = new Set();
    for (const s of sol) if (matches(s)) good.add(s.idx);
    const wrong = [...this.placements.keys()].filter((i) => !good.has(i));
    this.wrongCells = wrong;
    const next = sol.find((s) => !good.has(s.idx));
    if (!next) {
      this.app.toast(this.app.t('hintNone'), 2000);
      return;
    }
    if (!this.hintCells.some((h) => h.idx === next.idx)) this.hintCells.push({ ...next, t: this.t });
    this.hintsUsed++;
    this.app.onHint();
    sound.sfx('hint');
    if (wrong.length) this.app.toast(this.app.t('hintClear'), 2600);
  }

  // ---------------------------------------------------------------- input

  pointerDown(px, py, id) {
    if (this.mode === 'run') {
      this.togglePause();
      return;
    }
    if (this.mode !== 'plan') return;
    if (this.picker) {
      const hit = this.pickerHit(px, py);
      const pk = this.picker;
      this.picker = null;
      if (hit === 'remove') {
        this.removeAt(pk.idx);
        return;
      }
      if (hit !== null && hit !== undefined) {
        this.setDir(pk.idx, hit);
        return;
      }
      // Tapping elsewhere only closes the picker.
      return;
    }
    const idx = this.cellAt(px, py);
    this.gesture = { id, x0: px, y0: py, x: px, y: py, idx, t0: this.t, moved: false, drag: null, done: false };
    clearTimeout(this.longTimer);
    this.longTimer = setTimeout(() => {
      const g = this.gesture;
      if (g && !g.moved && !g.done && g.idx >= 0) {
        g.done = true;
        this.app.showInfo(this.describeCell(g.idx), px, py);
      }
    }, 480);
  }

  pointerMove(px, py, id) {
    const g = this.gesture;
    if (!g || g.id !== id || g.done) return;
    g.x = px;
    g.y = py;
    const dx = px - g.x0;
    const dy = py - g.y0;
    const dist = Math.hypot(dx, dy);
    if (dist > 9) {
      g.moved = true;
      clearTimeout(this.longTimer);
    }
    if (!g.moved || g.idx < 0) return;
    const placed = this.placements.get(g.idx);
    if (placed) {
      g.drag = placed;
      return;
    }
    // Swipe on an empty tile: place an arrow in that direction.
    if (dist > Math.max(18, this.S * 0.3)) {
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
      g.done = true;
      if (!canPlace(this.L, g.idx, PIECE.ARROW) || this.L.inventory.arrow === 0) return;
      if (this.inventoryLeft().arrow <= 0) {
        this.invalid(g.idx, this.app.t('noMore', this.app.t('pieces.arrow')));
        return;
      }
      this.lastArrowDir = dir;
      this.placeAt(g.idx, 'arrow', dir);
    }
  }

  pointerUp(px, py, id) {
    const g = this.gesture;
    clearTimeout(this.longTimer);
    if (!g || g.id !== id) return;
    this.gesture = null;
    if (g.done || this.mode !== 'plan') return;
    if (g.drag) {
      const to = this.cellAt(px, py);
      const piece = g.drag;
      if (to === g.idx) {
        // A short swipe that stays on its tile re-orients an arrow.
        const dx = px - g.x0;
        const dy = py - g.y0;
        if (piece.type === PIECE.ARROW && Math.hypot(dx, dy) > this.S * 0.28) {
          this.setDir(g.idx, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
        }
        return;
      }
      if (to < 0) {
        this.removeAt(g.idx);
        return;
      }
      if (this.placements.has(to) || !canPlace(this.L, to, piece.type)) {
        this.invalid(to, this.app.t('cantHere'));
        return;
      }
      this.snapshot();
      this.placements.delete(g.idx);
      this.placements.set(to, { ...piece, born: this.t });
      sound.sfx('place');
      this.app.hudChanged();
      return;
    }
    if (g.moved) return;
    this.tap(g.idx, px, py);
  }

  tap(idx, px, py) {
    if (idx < 0) return;
    // Hint ghost: tap to accept.
    const h = this.hintCells.find((c) => c.idx === idx);
    if (h && !this.placements.has(idx)) {
      const k = PIECE_KEYS[h.type];
      if (this.inventoryLeft()[k] > 0) {
        this.placeAt(idx, k, h.dir);
        return;
      }
    }
    const placed = this.placements.get(idx);
    if (placed) {
      this.picker = { idx, t: this.t, arrow: placed.type === PIECE.ARROW };
      sound.sfx('tap');
      return;
    }
    const cands = this.candidateTypes(idx);
    if (!cands.length) {
      this.invalid(idx);
      return;
    }
    let c = cands.find((x) => x.k === this.selected);
    if (!c) {
      if (cands.length === 1) c = cands[0];
      else c = cands.find((x) => x.left > 0) || cands[0];
      this.selected = c.k;
    }
    if (c.left <= 0) {
      this.invalid(idx, this.app.t('noMore', this.app.t('pieces.' + c.k)));
      this.app.pulseTray(c.k);
      return;
    }
    this.placeAt(idx, c.k, this.lastArrowDir);
    if (c.type === PIECE.ARROW) this.picker = { idx, t: this.t, arrow: true, fresh: true };
  }

  pickerGeometry() {
    const pk = this.picker;
    const [cx, cy] = this.cellCenter(pk.idx);
    const S = this.S;
    const r = Math.max(22, S * PICK_R);
    const d = Math.max(r * 2.05, S * 0.98);
    const items = [];
    if (pk.arrow) for (let dir = 0; dir < 4; dir++) items.push({ key: dir, x: cx + DX[dir] * d, y: cy + DY[dir] * d, r });
    const rr = r * 0.82;
    items.push({ key: 'remove', x: cx + d * 0.9, y: cy - d * 0.9, r: rr });
    return items;
  }

  pickerHit(px, py) {
    for (const it of this.pickerGeometry()) {
      if (Math.hypot(px - it.x, py - it.y) <= it.r * 1.15) return it.key;
    }
    return null;
  }

  keyDir(dir) {
    if (this.picker && this.picker.arrow) {
      this.setDir(this.picker.idx, dir);
      this.picker = null;
    }
  }

  describeCell(idx) {
    const L = this.L;
    const t = this.app.t;
    const tr = this.app.tr;
    const nb = this.app.notebook;
    const name = (id) => tr(nb.find((e) => e.id === id).name);
    const text = (id) => tr(nb.find((e) => e.id === id).text);
    const entry = (id) => ({ title: name(id), text: text(id) });
    const w = L.walkers.findIndex((wk) => wk.y * L.w + wk.x === idx);
    if (w >= 0) {
      const wk = L.walkers[w];
      if (wk.kind === KIND.SHADOW) return entry(wk.sleeping ? 'sleeper' : 'gloomnib');
      return { title: LUMI_NAMES[wk.color], text: text('lumi') };
    }
    const placed = this.placements.get(idx);
    if (placed) return entry(['', 'arrow', 'lily', 'mushroom', 'daisy'][placed.type]);
    if (L.lantern[idx] >= 0) return entry(L.sparkColors & (1 << L.lantern[idx]) ? 'spark' : 'lantern');
    if (L.spark[idx] >= 0) return entry('spark');
    if (L.fireflyIndex[idx] >= 0) return entry('firefly');
    if (L.fixedArrow[idx] >= 0) return entry('engraved');
    if (L.fixedMushroom[idx]) return entry('mushroom');
    if (L.fixedDaisy[idx]) return entry('daisy');
    if (L.portal[idx] >= 0) return entry('portal');
    if (L.plate[idx] >= 0) return entry('plate');
    if (L.gate[idx] >= 0) return entry('brambles');
    if (L.vaneIndex[idx] >= 0) return entry('vane');
    const ter = L.terrain[idx];
    if (ter === T.WALL) return entry('rock');
    if (ter === T.WATER) return entry('water');
    if (ter === T.VOID) return entry('void');
    if (ter === T.CLOUD) return entry('cloud');
    return { title: t('pieceName.arrow'), text: t('tapToPlace') };
  }

  // ------------------------------------------------------------------ run

  go() {
    if (this.mode !== 'plan') return;
    this.picker = null;
    this.hintCells = this.hintCells.filter((h) => !this.placements.has(h.idx));
    const list = this.placementList();
    this.clearRun();
    this.run = simulate(this.L, list, { record: true });
    this.runPieces = list.length;
    this.frame = 0;
    this.p = 0;
    this.mode = 'run';
    this.firedEvents = -1;
    this.trails = this.L.walkers.map(() => []);
    this.liveFireflies = 0;
    this.app.onRunStart();
    sound.sfx('go');
    this.app.hudChanged();
  }

  stop() {
    if (this.mode === 'plan') return;
    this.mode = 'plan';
    this.clearRun();
    sound.sfx('stop');
    this.app.hudChanged();
  }

  // ------------------------------------------------------------ tutorial

  /** Animated hand showing the gestures: 'place' (tap, choose, Go) or 'swipe'. */
  startCoach(kind) {
    const first = this.solution?.sol?.[0];
    if (!first) return;
    const [idx, , dir] = first;
    this.coach = { kind, step: kind === 'swipe' ? 'swipe' : 'tap', idx, dir, t0: this.t };
  }

  updateCoach() {
    const c = this.coach;
    if (!c) return;
    if (c.kind === 'swipe') {
      if (this.placements.size) this.coach = null;
      return;
    }
    if (this.mode !== 'plan') {
      if (c.step === 'go') this.coach = null;
      return;
    }
    const p = this.placements.get(c.idx);
    const step = !p ? 'tap' : p.type === PIECE.ARROW && p.dir === c.dir ? 'go' : 'petal';
    if (step !== c.step) {
      c.step = step;
      c.t0 = this.t;
    }
  }

  drawCoach(g) {
    const c = this.coach;
    if (!c || this.gesture?.drag) return;
    const S = this.S;
    const k = (this.t - c.t0) % 1.4;
    const press = k < 0.25 ? k / 0.25 : k < 0.45 ? 1 - (k - 0.25) / 0.2 : 0;
    let x;
    let y;
    if (c.step === 'swipe') {
      const [cx, cy] = this.cellCenter(c.idx);
      const q = Math.min(1, ((this.t - c.t0) % 1.6) / 1.1);
      const e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
      x = cx + DX[c.dir] * S * (-0.35 + 0.75 * e);
      y = cy + DY[c.dir] * S * (-0.35 + 0.75 * e);
      g.strokeStyle = `rgba(255,236,170,${0.6 * (1 - q)})`;
      g.lineWidth = Math.max(3, S * 0.08);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cx - DX[c.dir] * S * 0.35, cy - DY[c.dir] * S * 0.35);
      g.lineTo(x, y);
      g.stroke();
      A.drawHand(g, x, y, S, 0.6);
      return;
    }
    if (c.step === 'tap') [x, y] = this.cellCenter(c.idx);
    else if (c.step === 'petal') {
      if (this.picker && this.picker.idx === c.idx) {
        const it = this.pickerGeometry().find((i) => i.key === c.dir);
        x = it.x;
        y = it.y;
      } else [x, y] = this.cellCenter(c.idx);
    } else {
      // The Go button glows instead (it sits above the canvas).
      return;
    }
    if (press > 0.6) {
      g.strokeStyle = `rgba(255,236,170,${(press - 0.6) * 2})`;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(x, y, S * (0.25 + 0.35 * (1 - press)), 0, A.TAU);
      g.stroke();
    }
    A.drawHand(g, x, y, S, press);
  }

  /** Pause / resume the playback (tap on the board or the pause button). */
  togglePause() {
    if (this.mode !== 'run') return;
    this.paused = !this.paused;
    this.stepping = false;
    sound.sfx('tap');
    this.app.hudChanged();
  }

  /** While paused: play exactly one more turn, then pause again. */
  stepOnce() {
    if (this.mode !== 'run') return;
    this.paused = false;
    this.stepping = true;
    this.stepUntil = this.frame + 1;
    this.app.hudChanged();
  }

  /** After a failure: replay the last few turns in slow motion. */
  replayFail() {
    if (this.mode !== 'result-fail' || !this.run) return;
    const last = this.run.frames.length - 1;
    this.frame = Math.max(0, last - 5);
    this.p = 0;
    this.firedEvents = this.frame;
    this.failInfo = null;
    this.fx.clear();
    this.trails = this.L.walkers.map(() => []);
    this.replaying = true;
    this.paused = false;
    this.stepping = false;
    this.mode = 'run';
    this.app.hudChanged();
  }

  setSpeed(s) {
    this.speed = s;
  }

  playMelody() {
    if (!this.melody) return;
    clearTimeout(this.melodyTimer);
    let i = 0;
    const next = () => {
      if (i >= this.melody.length) return;
      for (const [c, x, y] of this.melody[i]) sound.step(c, x, y, this.L.h, this.worldKey);
      i++;
      this.melodyTimer = setTimeout(next, 170);
    };
    next();
  }

  update(dt) {
    dt *= this.timeScale || 1;
    this.t += dt;
    this.fx.update(dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.5);
    for (let i = 0; i < this.blinks.length; i++) {
      this.blinks[i] -= dt;
      if (this.blinks[i] < -0.14) this.blinks[i] = 2 + Math.random() * 3.5;
    }
    this.updateCoach();
    if (this.mode === 'run') this.advance(dt);
    else if (this.mode === 'post') {
      this.post += dt;
      if (this.post > (this.run.result === 'win' ? 1.25 : 0.95)) this.finish();
    }
  }

  advance(dt) {
    if (this.paused) return;
    const frames = this.run.frames;
    this.p += dt / (this.replaying ? TICK[1] * 2.4 : TICK[this.speed]);
    if (this.firedEvents < this.frame + 1 && this.p >= 0.62) this.fireEvents(this.frame + 1);
    while (this.p >= 1) {
      if (this.frame + 1 >= frames.length - 1) {
        this.p = 1;
        this.mode = 'post';
        this.post = 0;
        this.onRunEnd();
        return;
      }
      this.p -= 1;
      this.frame++;
      if (this.stepping && this.frame >= this.stepUntil) {
        this.p = 0;
        this.paused = true;
        this.stepping = false;
        this.app.hudChanged();
        return;
      }
      if (this.firedEvents < this.frame + 1 && this.p >= 0.62) this.fireEvents(this.frame + 1);
    }
  }

  fireEvents(fi) {
    this.firedEvents = fi;
    const fr = this.run.frames[fi];
    const L = this.L;
    const S = this.S;
    let gloom = false;
    for (const m of fr.moves) {
      if (m.type !== 'step' && m.type !== 'jump') continue;
      if (L.walkers[m.id].kind === KIND.LUMI) {
        if (m.outcome !== 'fall' && m.outcome !== 'water') sound.step(L.walkers[m.id].color, m.toX, m.toY, L.h, this.worldKey);
      } else gloom = true;
    }
    if (gloom) sound.gloomStep();
    for (const e of fr.events) {
      const cell = e.idx !== undefined ? e.idx : null;
      const [cx, cy] = cell !== null ? this.cellCenter(cell) : [this.ox + (e.x + 0.5) * S, this.oy + (e.y + 0.5) * S];
      switch (e.type) {
        case 'firefly':
          this.liveFireflies++;
          sound.sfx('firefly');
          this.fx.emit('star', cx, cy - S * 0.45, 12, { speed: 90, life: 0.8, size: S * 0.07, color: 'rgba(230,255,120,', fill: '#f3ff8a' });
          this.app.hudChanged();
          break;
        case 'spark':
          sound.sfx('spark');
          this.fx.emit('star', cx, cy - S * 0.4, 14, { speed: 110, life: 0.9, size: S * 0.08, color: A.LUMI[e.color].glow, fill: A.LUMI[e.color].core });
          break;
        case 'home': {
          const n = L.walkers.filter((w, i) => w.kind === KIND.LUMI && fr.walkers[i].status === STATUS.HOME).length;
          sound.sfx('home', (n - 1) * 2);
          this.fx.emit('star', cx, cy - S * 0.5, 16, { speed: 120, life: 1, size: S * 0.08, color: A.LUMI[e.color].glow, fill: A.LUMI[e.color].core });
          break;
        }
        case 'portal': {
          sound.sfx('portal');
          const [tx, ty] = this.cellCenter(e.to);
          this.fx.emit('spark', cx, cy, 10, { speed: 60, life: 0.6, size: S * 0.06, color: 'rgba(120,230,255,' });
          this.fx.emit('spark', tx, ty, 10, { speed: 60, life: 0.6, size: S * 0.06, color: 'rgba(120,230,255,' });
          break;
        }
        case 'mushroom':
          sound.sfx('bounce');
          break;
        case 'daisy':
          sound.sfx('daisy');
          this.fx.emit('star', cx, cy - S * 0.5, 4, { speed: 30, life: 0.9, size: S * 0.05, color: 'rgba(255,255,255,', vy: -30 });
          break;
        case 'plate':
          sound.sfx('plate');
          this.fx.emit('puff', cx, cy, 6, { speed: 40, life: 0.5, size: S * 0.1, fill: 'rgba(200,220,255,0.6)' });
          break;
        case 'vane':
          sound.sfx('vane');
          break;
        case 'cloud':
          sound.sfx('cloud');
          this.fx.emit('puff', cx, cy, 10, { speed: 60, life: 0.8, size: S * 0.16, fill: 'rgba(255,255,255,0.85)' });
          break;
        case 'turn':
          sound.sfx('turn');
          break;
        case 'water':
          sound.sfx('water');
          this.fx.emit('drop', cx, cy, 16, { speed: 140, life: 0.7, size: S * 0.05, gravity: 400, vy: -120, fill: '#9fe0ff' });
          this.fx.emit('puff', cx, cy - S * 0.5, 5, { speed: 20, life: 1.2, size: S * 0.1, fill: 'rgba(120,120,140,0.6)', vy: -30 });
          break;
        case 'fall':
          if (L.walkers[e.id].kind === KIND.LUMI) sound.sfx('fall');
          else sound.gloomStep();
          break;
        case 'caught':
          sound.sfx('caught');
          this.fx.emit('puff', cx, cy - S * 0.3, 14, { speed: 70, life: 1, size: S * 0.13, fill: 'rgba(60,30,90,0.7)' });
          break;
        default:
          break;
      }
    }
  }

  onRunEnd() {
    const run = this.run;
    if (run.result === 'win') {
      sound.sfx('win');
      // The tune written by the Lumignons' footsteps, replayable from the victory screen.
      this.melody = [];
      for (let t = 1; t < run.frames.length; t++) {
        const notes = [];
        for (const m of run.frames[t].moves) {
          if ((m.type === 'step' || m.type === 'jump') && this.L.walkers[m.id].kind === KIND.LUMI && m.outcome !== 'fall' && m.outcome !== 'water') {
            notes.push([this.L.walkers[m.id].color, m.toX, m.toY]);
          }
        }
        this.melody.push(notes);
      }
      // Constellation of the paths walked by each Lumignon.
      this.winPaths = this.L.walkers.map((w, id) => {
        if (w.kind !== KIND.LUMI) return null;
        const pts = [];
        for (const f of run.frames) {
          const wk = f.walkers[id];
          const last = pts[pts.length - 1];
          if (!last || last[0] !== wk.x || last[1] !== wk.y) pts.push([wk.x, wk.y]);
          if (wk.status !== STATUS.ACTIVE) break;
        }
        return { color: w.color, pts };
      }).filter(Boolean);
      this.winT = this.t;
    } else {
      const c = run.cause;
      if (c.type === 'loop') sound.sfx('loop');
      this.shake = c.type === 'loop' ? 0 : 1;
      this.failInfo = { ...c, t: this.t };
    }
  }

  finish() {
    if (this.mode !== 'post') return;
    const run = this.run;
    if (run.result === 'win') {
      this.mode = 'result-win';
      this.app.onWin({ fireflies: run.fireflies, allFireflies: run.allFireflies, pieces: this.runPieces, hintsUsed: this.hintsUsed });
    } else {
      this.mode = 'result-fail';
      const name = LUMI_NAMES[this.L.walkers[run.cause.id]?.color ?? 0];
      this.app.onFail(run.cause, name, this.replaying);
      this.replaying = false;
    }
  }

  retry() {
    if (this.mode === 'plan') return;
    this.mode = 'plan';
    this.clearRun();
    this.app.hudChanged();
  }

  // --------------------------------------------------------------- render

  render(g) {
    const S = this.S;
    const L = this.L;
    const t = this.t;
    // Background.
    g.drawImage(this.sky, 0, 0, this.W, this.H);
    A.drawStars(g, this.stars, this.W, this.H, t, this.style.stars, 1.2);
    for (const m of this.motes) {
      const mx = ((m.x + t * 0.008 * m.s) % 1) * this.W;
      const my = ((m.y - t * 0.012 * m.s + 10) % 1) * this.H;
      A.glow(g, mx, my, 6 + m.s * 5, this.style.particle, 0.35 + 0.25 * Math.sin(t * 2 + m.p));
    }
    g.save();
    const calm = !!this.app.settings().reducedMotion;
    if (this.shake > 0 && !calm) g.translate(Math.sin(t * 60) * this.shake * 5, 0);
    const isl = this.island;
    const floatY = calm ? 0 : Math.sin(t * 0.8) * 1.5;
    g.translate(0, floatY);
    g.drawImage(isl.canvas, this.ox - isl.pad, this.oy - isl.pad, isl.width, isl.height);

    const run = this.mode === 'plan' ? null : this.run;
    const f0 = run ? run.frames[this.frame] : null;
    const f1 = run ? run.frames[Math.min(this.frame + 1, run.frames.length - 1)] : null;
    const p = run ? (this.mode === 'run' ? this.p : 1) : 0;
    const arrived = p >= 0.62;

    // Water shimmer.
    g.save();
    g.globalAlpha = 0.35;
    g.strokeStyle = '#d6f3ff';
    g.lineWidth = Math.max(1, S * 0.03);
    g.lineCap = 'round';
    for (let i = 0; i < L.w * L.h; i++) {
      if (L.terrain[i] !== T.WATER) continue;
      const [cx, cy] = this.cellCenter(i);
      const ph = t * 1.4 + i * 1.7;
      for (let k = 0; k < 2; k++) {
        const ox = Math.sin(ph + k * 2.2) * S * 0.18;
        const oy = (k - 0.5) * S * 0.3 + Math.cos(ph * 0.7 + k) * S * 0.05;
        g.beginPath();
        g.moveTo(cx + ox - S * 0.1, cy + oy);
        g.quadraticCurveTo(cx + ox, cy + oy - S * 0.04, cx + ox + S * 0.1, cy + oy);
        g.stroke();
      }
    }
    g.restore();

    // Clouds (fragile floor).
    for (const c of L.cloudCells) {
      const [cx, cy] = this.cellCenter(c);
      let a = 1;
      let sc = 1;
      if (run) {
        const b0 = f0.broken[c];
        const b1 = f1.broken[c];
        if (b0) continue;
        if (b1) {
          const k = seg(p, 0.3, 0.8);
          a = 1 - k;
          sc = 1 + k * 0.3;
        }
      }
      A.drawCloud(g, cx, cy, S, t, a, sc);
    }

    // Ground decals: arrows, plates, portals, lilies, vanes.
    for (let i = 0; i < L.w * L.h; i++) {
      const [cx, cy] = this.cellCenter(i);
      if (L.portal[i] >= 0) A.drawPortal(g, cx, cy, S, L.portalId[i], t);
      if (L.plate[i] >= 0) {
        const lit = run ? (arrived ? f1 : f0).gateOpen[L.plate[i]] : L.gateInitOpen[L.plate[i]];
        A.drawPlate(g, cx, cy, S, L.plate[i], { lit, press: this.occupied(i, run, f0, f1, p) ? 1 : 0 });
      }
      if (L.fixedArrow[i] >= 0) A.drawArrowStone(g, cx, cy, S, L.fixedArrow[i], { fixed: true });
      if (L.vaneIndex[i] >= 0) {
        const vi = L.vaneIndex[i];
        let ang = (run ? f0.vaneDir[vi] : L.vanes[vi].dir) * (Math.PI / 2);
        if (run && f1.vaneDir[vi] !== f0.vaneDir[vi]) ang += (Math.PI / 2) * easeInOut(seg(p, 0.66, 1));
        A.drawVane(g, cx, cy, S, ang, t);
      }
    }
    for (const [idx, pc] of this.placements) {
      const [cx, cy] = this.cellCenter(idx);
      const g2 = this.gesture;
      if (g2 && g2.drag && g2.idx === idx) continue;
      const age = t - (pc.born ?? -10);
      const pop = age < 0.25 ? 1 + Math.sin((age / 0.25) * Math.PI) * 0.18 : 1;
      if (pc.type === PIECE.ARROW) {
        A.drawArrowStone(g, cx, cy, S, pc.dir, { scale: pop, highlight: this.picker && this.picker.idx === idx });
      } else if (pc.type === PIECE.LILY) A.drawLily(g, cx, cy, S * pop, { t });
    }

    // Placement dots while choosing.
    if (this.mode === 'plan' && this.app.settings().dots && (this.gesture?.drag || this.picker === null)) {
      const left = this.inventoryLeft();
      const showAll = !!this.gesture?.drag;
      const type = showAll ? this.gesture.drag.type : PIECE[this.selected.toUpperCase()];
      if (showAll || left[this.selected] > 0) {
        g.fillStyle = 'rgba(255,255,255,0.22)';
        for (let i = 0; i < L.w * L.h; i++) {
          if (this.placements.has(i) || !canPlace(L, i, type)) continue;
          const [cx, cy] = this.cellCenter(i);
          g.beginPath();
          g.arc(cx, cy, Math.max(2, S * 0.05), 0, A.TAU);
          g.fill();
        }
      }
    }

    // Hint ghosts and wrong pieces.
    for (const h of this.hintCells) {
      if (this.placements.has(h.idx)) continue;
      const [cx, cy] = this.cellCenter(h.idx);
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      A.glow(g, cx, cy, S * 0.8, 'rgba(255,240,160,', 0.4 + 0.3 * pulse);
      if (h.type === PIECE.ARROW) A.drawArrowStone(g, cx, cy, S, h.dir, { ghost: true });
      else if (h.type === PIECE.LILY) A.drawLily(g, cx, cy, S, { ghost: true, t });
      else if (h.type === PIECE.MUSHROOM) A.drawMushroom(g, cx, cy + S * 0.25, S, { ghost: true });
      else if (h.type === PIECE.DAISY) A.drawDaisy(g, cx, cy + S * 0.25, S, { ghost: true, t });
    }
    if (this.mode === 'plan') {
      for (const c of this.wrongCells) {
        const [cx, cy] = this.cellCenter(c);
        g.strokeStyle = `rgba(255,90,110,${0.5 + 0.4 * Math.sin(t * 6)})`;
        g.lineWidth = Math.max(2, S * 0.05);
        g.beginPath();
        g.arc(cx, cy, S * 0.44, 0, A.TAU);
        g.stroke();
      }
    }

    // Trails of light.
    if (run) this.drawTrails(g, f0, f1, p);

    // Standing things, sorted by row.
    const items = [];
    const push = (y, fn) => items.push({ y, fn });
    let v = 0;
    for (let i = 0; i < L.w * L.h; i++) {
      const x = i % L.w;
      const y = (i / L.w) | 0;
      const [cx, cy] = this.cellCenter(i);
      const base = cy + S * 0.22;
      if (L.terrain[i] === T.WALL) {
        const props = this.style.props;
        const kind = props[Math.floor(A.hash2(x, y, 7) * props.length)];
        const spr = A.propSprite(kind, S, this.worldKey, Math.floor(A.hash2(x, y, 3) * 7), this.dpr);
        push(base, () => g.drawImage(spr.canvas, cx - spr.ax, base - spr.ay, spr.w, spr.h));
        v++;
      }
      if (L.lantern[i] >= 0) {
        const color = L.lantern[i];
        push(base, () => {
          const st = this.lanternState(color, run, f0, f1, p);
          A.drawLantern(g, cx, base, S, color, { t, ...st, symbol: this.app.settings().symbols });
        });
      }
      if (L.fixedMushroom[i] || this.placements.get(i)?.type === PIECE.MUSHROOM) {
        const fixed = !!L.fixedMushroom[i];
        const pc = this.placements.get(i);
        push(base - 1, () => {
          let sq = 0;
          if (run) sq = this.bounceAmount(i, f0, f1, p);
          const age = pc ? t - (pc.born ?? -10) : 9;
          const pop = age < 0.25 ? Math.sin((age / 0.25) * Math.PI) * 0.4 : 0;
          if (this.gesture?.drag && this.gesture.idx === i) return;
          A.drawMushroom(g, cx, cy + S * 0.2, S, { fixed, squash: sq - pop });
        });
      }
      if (L.fixedDaisy[i] || this.placements.get(i)?.type === PIECE.DAISY) {
        const fixed = !!L.fixedDaisy[i];
        push(base - 1, () => {
          if (this.gesture?.drag && this.gesture.idx === i) return;
          A.drawDaisy(g, cx, cy + S * 0.22, S, { fixed, t });
        });
      }
      if (L.gate[i] >= 0) {
        const grp = L.gate[i];
        push(base - 2, () => {
          let open = L.gateInitOpen[grp] ? 1 : 0;
          if (run) {
            const o0 = f0.gateOpen[grp] ? 1 : 0;
            const o1 = f1.gateOpen[grp] ? 1 : 0;
            open = lerp(o0, o1, easeInOut(seg(p, 0.62, 1)));
          }
          A.drawBrambles(g, cx, cy, S, grp, open, t);
        });
      }
      if (L.fireflyIndex[i] >= 0) {
        const bit = 1 << L.fireflyIndex[i];
        let a = 1;
        if (run) {
          if (f0.fireflyMask & bit) a = 0;
          else if (f1.fireflyMask & bit) a = 1 - seg(p, 0.6, 0.75);
        }
        if (a > 0) push(base + 1, () => A.drawFirefly(g, cx, cy + S * 0.15, S, t, i * 1.3, a));
      }
      if (L.spark[i] >= 0) {
        const bit = 1 << L.spark[i];
        let a = 1;
        if (run) {
          if (f0.sparkMask & bit) a = 0;
          else if (f1.sparkMask & bit) a = 1 - seg(p, 0.6, 0.75);
        }
        if (a > 0) push(base + 1, () => A.drawSpark(g, cx, cy + S * 0.15, S, L.spark[i], t, a));
      }
    }
    // Walkers.
    L.walkers.forEach((wk, id) => {
      const vis = this.walkerVisual(id, run, f0, f1, p);
      if (!vis) return;
      push(vis.sortY, () => {
        if (wk.kind === KIND.LUMI) {
          A.drawLumi(g, vis.x, vis.y, S * vis.scale, {
            color: wk.color,
            dir: vis.dir,
            t: t + id,
            mood: vis.mood,
            squash: vis.squash,
            walk: vis.walk,
            flame: vis.flame,
            alpha: vis.alpha,
            blink: this.blinks[id] < 0 ? 1 : 0,
            hat: this.app.hat(),
            symbol: this.app.settings().symbols,
          });
        } else {
          A.drawGloomnib(g, vis.x, vis.y, S * vis.scale, { t: t + id, dir: vis.dir, sleeping: wk.sleeping, squash: vis.squash, alpha: vis.alpha });
        }
      });
      // Direction hint in planning.
      if (this.mode === 'plan' && !wk.sleeping) {
        const [cx, cy] = this.cellCenter(wk.y * L.w + wk.x);
        const d = wk.dir;
        const bob = (Math.sin(t * 4) * 0.5 + 0.5) * S * 0.06;
        const hx = cx + DX[d] * (S * 0.62 + bob);
        const hy = cy + DY[d] * (S * 0.62 + bob) + S * 0.08;
        const col = wk.kind === KIND.LUMI ? A.LUMI[wk.color].ui : '#b28cff';
        push(cy - S, () => this.drawChevron(g, hx, hy, d, S * 0.16, col));
      }
    });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.fn();

    // Win constellation.
    if (this.winPaths) this.drawConstellation(g);

    // Fail marker.
    if (this.failInfo && this.failInfo.type !== 'loop') {
      const fi = this.failInfo;
      const fx = this.ox + (fi.x + 0.5) * S;
      const fy = this.oy + (fi.y + 0.5) * S;
      const k = Math.min(1, (t - fi.t) * 3);
      g.strokeStyle = `rgba(255,80,100,${0.9 * k})`;
      g.lineWidth = Math.max(2, S * 0.06);
      g.setLineDash([S * 0.12, S * 0.08]);
      g.lineDashOffset = -t * 30;
      g.beginPath();
      g.arc(fx, fy, S * (0.5 + 0.06 * Math.sin(t * 6)), 0, A.TAU);
      g.stroke();
      g.setLineDash([]);
    }

    // Invalid tap flash.
    if (this.flashCell && t - this.flashCell.t < 0.45) {
      const [cx, cy] = this.cellCenter(this.flashCell.idx);
      const k = 1 - (t - this.flashCell.t) / 0.45;
      g.strokeStyle = `rgba(255,90,110,${k})`;
      g.lineWidth = Math.max(2, S * 0.07);
      const r = S * 0.2;
      const ox = Math.sin(t * 50) * 3 * k;
      g.beginPath();
      g.moveTo(cx - r + ox, cy - r);
      g.lineTo(cx + r + ox, cy + r);
      g.moveTo(cx + r + ox, cy - r);
      g.lineTo(cx - r + ox, cy + r);
      g.stroke();
    }

    this.fx.draw(g);

    // Dragged piece follows the finger.
    if (this.gesture?.drag) {
      const pc = this.gesture.drag;
      const x = this.gesture.x;
      const y = this.gesture.y - S * 0.35;
      if (pc.type === PIECE.ARROW) A.drawArrowStone(g, x, y, S, pc.dir, { lift: 6, scale: 1.1 });
      else if (pc.type === PIECE.LILY) A.drawLily(g, x, y, S, { t });
      else if (pc.type === PIECE.MUSHROOM) A.drawMushroom(g, x, y + S * 0.2, S, {});
      else A.drawDaisy(g, x, y + S * 0.2, S, { t });
    }
    // Radial picker.
    if (this.picker) this.drawPicker(g);
    g.restore();
    this.drawCoach(g);
    if (this.mode === 'run' && (this.paused || this.replaying)) this.drawBadge(g, this.paused ? '❚❚  ' + this.app.t('pausedHint') : '◷  ' + this.app.t('replaySlow'));
  }

  drawBadge(g, text) {
    g.save();
    g.font = `600 ${Math.round(Math.max(13, Math.min(16, this.S * 0.28)))}px Fredoka, sans-serif`;
    const w = g.measureText(text).width + 28;
    const h = 32;
    const x = this.ox + (this.L.w * this.S) / 2 - w / 2;
    const y = Math.max(this.oy - this.S * 0.72 - h - 4, 72);
    g.fillStyle = 'rgba(28,19,58,0.88)';
    g.beginPath();
    A.roundRect(g, x, y, w, h, 16);
    g.fill();
    g.strokeStyle = 'rgba(255,207,90,0.5)';
    g.lineWidth = 1.5;
    g.stroke();
    g.fillStyle = '#fff8ea';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, x + w / 2, y + h / 2 + 1);
    g.restore();
  }

  occupied(idx, run, f0, f1, p) {
    if (!run) return false;
    const f = p >= 0.62 ? f1 : f0;
    return f.walkers.some((w) => w.status === STATUS.ACTIVE && w.y * this.L.w + w.x === idx);
  }

  bounceAmount(idx, f0, f1, p) {
    for (const m of f1.moves) {
      if (m.type === 'jump' && m.fromY * this.L.w + m.fromX === idx && p < 0.3) return 0.6 * (1 - p / 0.3);
      if ((m.type === 'step' || m.type === 'jump') && m.toY * this.L.w + m.toX === idx && p > 0.55) return 0.4 * seg(p, 0.55, 0.8);
    }
    return 0;
  }

  lanternState(color, run, f0, f1, p) {
    const L = this.L;
    const needsSpark = !!(L.sparkColors & (1 << color));
    if (!run) return { lit: needsSpark ? 0.1 : 0.75, locked: needsSpark };
    const bit = 1 << color;
    let unlocked = !needsSpark || !!(f0.sparkMask & bit);
    let lit = unlocked ? 0.75 : 0.1;
    if (!unlocked && f1.sparkMask & bit) {
      const k = seg(p, 0.62, 0.9);
      lit = lerp(0.1, 0.75, k);
      unlocked = k > 0.5;
    }
    let home = false;
    let flash = 0;
    L.walkers.forEach((w, i) => {
      if (w.kind !== KIND.LUMI || w.color !== color) return;
      if (f0.walkers[i].status === STATUS.HOME) home = true;
      else if (f1.walkers[i].status === STATUS.HOME && p > 0.85) {
        home = true;
        flash = Math.max(flash, 1 - seg(p, 0.85, 1));
      }
    });
    if (home) lit = 1;
    if (this.mode === 'post' && run.result === 'win') flash = Math.max(flash, 0.5 * (1 - Math.min(1, this.post)));
    return { lit, locked: !unlocked, home, flash };
  }

  walkerVisual(id, run, f0, f1, p) {
    const L = this.L;
    const S = this.S;
    const wk = L.walkers[id];
    const cx = (x) => this.ox + (x + 0.5) * S;
    const fy = (y) => this.oy + (y + 0.5) * S + S * 0.24;
    const t = this.t;
    if (!run) {
      const breathe = Math.sin(t * 2.2 + id) * 0.04;
      return { x: cx(wk.x), y: fy(wk.y), sortY: fy(wk.y), dir: wk.dir, squash: breathe, walk: 0, mood: wk.sleeping ? 'sleep' : 'idle', flame: 1, alpha: 1, scale: 1 };
    }
    const a = f0.walkers[id];
    const m = f1.moves[id];
    const b = f1.walkers[id];
    if (a.status !== STATUS.ACTIVE) return null;
    const vis = { dir: a.dir, squash: 0, walk: 0, mood: wk.sleeping ? 'sleep' : 'idle', flame: 1, alpha: 1, scale: 1 };
    let x = cx(a.x);
    let y = fy(a.y);
    const post = this.mode === 'post' ? this.post : 0;
    if (m.type === 'step' || m.type === 'jump') {
      const jump = m.type === 'jump';
      vis.dir = p < 0.7 ? m.dir : b.dir;
      if (m.teleport) {
        const half = clamp01(p / 0.5);
        if (p < 0.5) {
          x = lerp(cx(m.fromX), cx(m.toX), easeInOut(half));
          y = lerp(fy(m.fromY), fy(m.toY), easeInOut(half));
          vis.scale = 1 - seg(p, 0.3, 0.5);
        } else {
          x = cx(m.x);
          y = fy(m.y);
          vis.scale = seg(p, 0.5, 0.72);
        }
      } else {
        const e = easeInOut(clamp01(p / 0.85));
        x = lerp(cx(m.fromX), cx(m.toX), e);
        y = lerp(fy(m.fromY), fy(m.toY), e);
        const hop = Math.sin(Math.PI * clamp01(p / 0.85)) * S * (jump ? 0.85 : 0.12);
        y -= hop;
        vis.walk = p * 2;
        vis.squash = p > 0.85 ? Math.sin(((p - 0.85) / 0.15) * Math.PI) * (jump ? 0.45 : 0.2) : p < 0.12 ? -0.15 : 0;
      }
      vis.sortY = lerp(fy(m.fromY), fy(m.toY), clamp01(p)) + (jump ? S * 0.5 : 0);
      switch (m.outcome) {
        case 'home': {
          const k = seg(p, 0.55, 0.92);
          vis.scale *= 1 - k;
          vis.alpha = 1 - k;
          vis.mood = 'happy';
          if (k >= 1) return null;
          break;
        }
        case 'fall': {
          const k = seg(p, 0.55, 1) + post * 1.5;
          y += k * k * S * 2.2;
          vis.scale *= Math.max(0, 1 - k * 0.45);
          vis.alpha = Math.max(0, 1 - k * 0.6);
          vis.mood = 'scared';
          if (wk.kind === KIND.LUMI) vis.sortY = 1e6;
          break;
        }
        case 'water': {
          const k = seg(p, 0.6, 1) + post;
          vis.flame = Math.max(0, 1 - k * 2.5);
          vis.mood = 'sad';
          y += Math.min(1, k) * S * 0.2;
          vis.alpha = Math.max(0.35, 1 - k * 0.5);
          break;
        }
        case 'caught': {
          const k = seg(p, 0.6, 1) + post;
          vis.mood = 'scared';
          vis.alpha = Math.max(0, 1 - k * 0.7);
          vis.flame = Math.max(0, 1 - k);
          break;
        }
        default:
          break;
      }
      if (wk.kind === KIND.SHADOW && (m.outcome === 'fall' || m.outcome === 'water')) {
        const k = seg(p, 0.55, 1) + post * 2;
        vis.alpha = Math.max(0, 1 - k);
        if (vis.alpha <= 0) return null;
      }
    } else if (m.type === 'wait') {
      vis.mood = 'happy';
      vis.squash = Math.sin(t * 8) * 0.08;
    } else if (m.type === 'stuck') {
      x += Math.sin(t * 40) * S * 0.03;
      vis.mood = 'scared';
    } else {
      vis.squash = Math.sin(t * 2.2 + id) * 0.04;
    }
    if (this.mode === 'post' && run.result === 'win') vis.mood = 'happy';
    vis.x = x;
    vis.y = y;
    if (vis.sortY === undefined) vis.sortY = y;
    // Record trail.
    if (wk.kind === KIND.LUMI && this.trails[id] && (m.type === 'step' || m.type === 'jump') && !m.teleport) {
      const tr = this.trails[id];
      const last = tr[tr.length - 1];
      if (!last || t - last.t > 0.035) tr.push({ x, y: y - S * 0.25, t });
    }
    return vis;
  }

  drawTrails(g, f0, f1, p) {
    const now = this.t;
    this.L.walkers.forEach((wk, id) => {
      const tr = this.trails[id];
      if (!tr || !tr.length || wk.kind !== KIND.LUMI) return;
      const col = A.LUMI[wk.color].glow;
      while (tr.length && now - tr[0].t > 1.6) tr.shift();
      for (const pt of tr) {
        const k = 1 - (now - pt.t) / 1.6;
        A.glow(g, pt.x, pt.y + this.S * 0.2, this.S * 0.22 * k, col, 0.35 * k);
      }
    });
  }

  drawConstellation(g) {
    const S = this.S;
    const k = Math.min(1, (this.t - this.winT) * 1.6);
    for (const path of this.winPaths) {
      const P = A.LUMI[path.color];
      const pts = path.pts.map(([x, y]) => [this.ox + (x + 0.5) * S, this.oy + (y + 0.5) * S]);
      const n = Math.max(1, Math.floor(pts.length * k));
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = P.glow + '0.55)';
      g.lineWidth = Math.max(2, S * 0.06);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.beginPath();
      for (let i = 0; i < n; i++) (i ? g.lineTo : g.moveTo).call(g, pts[i][0], pts[i][1]);
      g.stroke();
      g.restore();
      for (let i = 0; i < n; i++) {
        const turn = i === 0 || i === pts.length - 1 || (i > 0 && i < pts.length - 1 && (pts[i - 1][0] - pts[i][0]) * (pts[i + 1][1] - pts[i][1]) !== (pts[i - 1][1] - pts[i][1]) * (pts[i + 1][0] - pts[i][0]));
        if (turn) {
          A.glow(g, pts[i][0], pts[i][1], S * 0.4, P.glow, 0.8);
          g.fillStyle = '#fff';
          A.star(g, pts[i][0], pts[i][1], S * 0.07, 4, 0.4);
        }
      }
    }
  }

  drawChevron(g, x, y, d, r, color) {
    g.save();
    g.translate(x, y);
    g.rotate((d * Math.PI) / 2);
    g.globalAlpha = 0.9;
    g.fillStyle = 'rgba(20,10,40,0.35)';
    g.beginPath();
    g.moveTo(0, -r * 0.9 + 2);
    g.lineTo(r, r * 0.5 + 2);
    g.lineTo(0, r * 0.1 + 2);
    g.lineTo(-r, r * 0.5 + 2);
    g.closePath();
    g.fill();
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, -r * 0.9);
    g.lineTo(r, r * 0.5);
    g.lineTo(0, r * 0.1);
    g.lineTo(-r, r * 0.5);
    g.closePath();
    g.fill();
    g.restore();
  }

  drawPicker(g) {
    const pk = this.picker;
    const [cx, cy] = this.cellCenter(pk.idx);
    const S = this.S;
    const k = Math.min(1, (this.t - pk.t) * 7);
    const items = this.pickerGeometry();
    g.save();
    g.fillStyle = `rgba(20,12,40,${0.35 * k})`;
    g.beginPath();
    g.arc(cx, cy, S * 1.55 * k, 0, A.TAU);
    g.fill();
    const cur = this.placements.get(pk.idx);
    for (const it of items) {
      const x = lerp(cx, it.x, k);
      const y = lerp(cy, it.y, k);
      const r = it.r * (0.6 + 0.4 * k);
      const active = it.key === cur?.dir && pk.arrow;
      g.fillStyle = it.key === 'remove' ? '#ff6b81' : active ? '#ffcf5a' : '#fff8ea';
      g.strokeStyle = 'rgba(60,30,80,0.35)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x, y, r, 0, A.TAU);
      g.fill();
      g.stroke();
      g.fillStyle = it.key === 'remove' ? '#fff' : '#7a3fb0';
      g.strokeStyle = g.fillStyle;
      if (it.key === 'remove') {
        g.lineWidth = Math.max(2, r * 0.18);
        g.lineCap = 'round';
        const q = r * 0.38;
        g.beginPath();
        g.moveTo(x - q, y - q);
        g.lineTo(x + q, y + q);
        g.moveTo(x + q, y - q);
        g.lineTo(x - q, y + q);
        g.stroke();
      } else {
        g.save();
        g.translate(x, y);
        g.rotate((it.key * Math.PI) / 2);
        g.beginPath();
        g.moveTo(0, -r * 0.55);
        g.lineTo(r * 0.45, -r * 0.02);
        g.lineTo(r * 0.16, -r * 0.02);
        g.lineTo(r * 0.16, r * 0.5);
        g.lineTo(-r * 0.16, r * 0.5);
        g.lineTo(-r * 0.16, -r * 0.02);
        g.lineTo(-r * 0.45, -r * 0.02);
        g.closePath();
        g.fill();
        g.restore();
      }
    }
    g.restore();
  }
}
