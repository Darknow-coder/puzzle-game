// Lumignons — deterministic puzzle engine.
// Pure module: no DOM access, usable in the browser and in Node (tests, solver).

export const DIR_CHARS = ['N', 'E', 'S', 'W'];
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
export const cw = (d) => (d + 1) & 3;
export const ccw = (d) => (d + 3) & 3;
export const back = (d) => (d + 2) & 3;

export const T = { VOID: 0, GRASS: 1, WALL: 2, WATER: 3, CLOUD: 4 };

export const COLORS = ['amber', 'blue', 'rose', 'mint'];
export const LUMI_NAMES = ['Pip', 'Nim', 'Lou', 'Bo'];

// Pieces the player can place. Index 0 = none.
export const PIECE = { NONE: 0, ARROW: 1, LILY: 2, MUSHROOM: 3, DAISY: 4 };
export const PIECE_KEYS = ['none', 'arrow', 'lily', 'mushroom', 'daisy'];

export const KIND = { LUMI: 0, SHADOW: 1 };
export const STATUS = { ACTIVE: 0, HOME: 1, DEAD: 2 };

export const MAX_TICKS = 400;

/**
 * Map legend (one character per cell):
 *   ' ' or '_' void            '.' grass             '#' wall          '~' water
 *   'o' cloud (vanishes once left)
 *   '*' firefly (optional collectible)
 *   'a'..'d' Lumignon start    'A'..'D' lantern      '1'..'4' spark (opens lantern A..D)
 *   '^' '>' 'v' '<' engraved (fixed) arrow
 *   'm' fixed bounce mushroom  'f' fixed daisy
 *   '@' / '%' portal pairs
 *   'P' / 'Q' switch stones (groups 0 / 1)
 *   'H' / 'K' brambles closed (group 0 / 1)   'h' / 'k' brambles open
 *   'R' weathervane (directions from `vanes`, reading order)
 *   'G' wandering Gloomnib (directions from dirs.G)    'Z' sleeping Gloomnib
 */
export function parseLevel(def) {
  const rows = def.map;
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const n = w * h;
  const L = {
    id: def.id,
    def,
    w,
    h,
    terrain: new Uint8Array(n),
    fixedArrow: new Int8Array(n).fill(-1),
    fixedMushroom: new Uint8Array(n),
    fixedDaisy: new Uint8Array(n),
    portal: new Int16Array(n).fill(-1), // paired cell index
    portalId: new Int8Array(n).fill(-1),
    plate: new Int8Array(n).fill(-1),
    gate: new Int8Array(n).fill(-1),
    gateInitOpen: [true, true],
    vaneIndex: new Int16Array(n).fill(-1),
    vanes: [], // {idx, dir}
    lantern: new Int8Array(n).fill(-1),
    spark: new Int8Array(n).fill(-1),
    sparkList: [], // {idx, color}
    fireflyIndex: new Int16Array(n).fill(-1),
    fireflies: [], // idx list
    walkers: [], // {kind, color, x, y, dir, sleeping}
    startCell: new Uint8Array(n),
    inventory: { arrow: 0, lily: 0, mushroom: 0, daisy: 0, ...(def.inv || {}) },
    colorsUsed: [],
    cloudCells: [],
  };
  const dirs = def.dirs || {};
  const dirCursor = {};
  const takeDir = (key) => {
    const s = dirs[key];
    if (!s) throw new Error(`${def.id}: missing direction for '${key}'`);
    const i = dirCursor[key] || 0;
    dirCursor[key] = i + 1;
    const c = s[Math.min(i, s.length - 1)];
    const d = DIR_CHARS.indexOf(c);
    if (d < 0) throw new Error(`${def.id}: bad direction '${c}' for '${key}'`);
    return d;
  };
  const portalCells = { '@': [], '%': [] };
  const vaneDirs = (def.vanes || '').split('').map((c) => DIR_CHARS.indexOf(c));
  let vaneCursor = 0;
  let gateSeen = [false, false];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x] ?? ' ';
      const i = y * w + x;
      let t = T.GRASS;
      switch (ch) {
        case ' ':
        case '_':
          t = T.VOID;
          break;
        case '.':
          break;
        case '#':
          t = T.WALL;
          break;
        case '~':
          t = T.WATER;
          break;
        case 'o':
          t = T.CLOUD;
          L.cloudCells.push(i);
          break;
        case '*':
          L.fireflyIndex[i] = L.fireflies.length;
          L.fireflies.push(i);
          break;
        case 'a':
        case 'b':
        case 'c':
        case 'd': {
          const color = ch.charCodeAt(0) - 97;
          L.walkers.push({ kind: KIND.LUMI, color, x, y, dir: takeDir(ch), sleeping: false });
          L.startCell[i] = 1;
          break;
        }
        case 'A':
        case 'B':
        case 'C':
        case 'D':
          L.lantern[i] = ch.charCodeAt(0) - 65;
          break;
        case '1':
        case '2':
        case '3':
        case '4': {
          const color = ch.charCodeAt(0) - 49;
          L.spark[i] = color;
          L.sparkList.push({ idx: i, color });
          break;
        }
        case '^':
          L.fixedArrow[i] = 0;
          break;
        case '>':
          L.fixedArrow[i] = 1;
          break;
        case 'v':
          L.fixedArrow[i] = 2;
          break;
        case '<':
          L.fixedArrow[i] = 3;
          break;
        case 'm':
          L.fixedMushroom[i] = 1;
          break;
        case 'f':
          L.fixedDaisy[i] = 1;
          break;
        case '@':
        case '%':
          portalCells[ch].push(i);
          break;
        case 'P':
          L.plate[i] = 0;
          break;
        case 'Q':
          L.plate[i] = 1;
          break;
        case 'H':
        case 'h':
        case 'K':
        case 'k': {
          const g = ch === 'H' || ch === 'h' ? 0 : 1;
          const open = ch === 'h' || ch === 'k';
          if (gateSeen[g] && L.gateInitOpen[g] !== open) {
            throw new Error(`${def.id}: brambles of group ${g} must share their initial state`);
          }
          gateSeen[g] = true;
          L.gate[i] = g;
          L.gateInitOpen[g] = open;
          break;
        }
        case 'R': {
          const d = vaneDirs[vaneCursor++];
          if (d === undefined || d < 0) throw new Error(`${def.id}: missing vane direction`);
          L.vaneIndex[i] = L.vanes.length;
          L.vanes.push({ idx: i, dir: d });
          break;
        }
        case 'G':
          L.walkers.push({ kind: KIND.SHADOW, color: -1, x, y, dir: takeDir('G'), sleeping: false });
          L.startCell[i] = 1;
          break;
        case 'Z':
          L.walkers.push({ kind: KIND.SHADOW, color: -1, x, y, dir: 2, sleeping: true });
          L.startCell[i] = 1;
          break;
        default:
          throw new Error(`${def.id}: unknown map character '${ch}' at ${x},${y}`);
      }
      L.terrain[i] = t;
    }
  }
  let pid = 0;
  for (const key of ['@', '%']) {
    const cells = portalCells[key];
    if (cells.length === 0) continue;
    if (cells.length !== 2) throw new Error(`${def.id}: portal '${key}' needs exactly two cells`);
    L.portal[cells[0]] = cells[1];
    L.portal[cells[1]] = cells[0];
    L.portalId[cells[0]] = pid;
    L.portalId[cells[1]] = pid;
    pid++;
  }
  // Sort walkers: Lumignons first (stable reading order), then Gloomnibs.
  L.walkers.sort((p, q) => p.kind - q.kind);
  const used = new Set(L.walkers.filter((wk) => wk.kind === KIND.LUMI).map((wk) => wk.color));
  L.colorsUsed = [...used].sort();
  L.sparkColors = L.sparkList.reduce((m, sp) => m | (1 << sp.color), 0);
  return L;
}

/** Validates structural invariants of a parsed level. Returns a list of problems. */
export function validateLevel(L) {
  const errs = [];
  const lumis = L.walkers.filter((wk) => wk.kind === KIND.LUMI);
  if (lumis.length === 0) errs.push('no Lumignon');
  for (const c of L.colorsUsed) {
    if (![...L.lantern].includes(c)) errs.push(`no lantern for color ${COLORS[c]}`);
  }
  const sparkColors = L.sparkList.map((s) => s.color);
  if (new Set(sparkColors).size !== sparkColors.length) errs.push('duplicate spark color');
  for (const c of sparkColors) {
    if (!L.colorsUsed.includes(c)) errs.push(`spark for absent color ${COLORS[c]}`);
  }
  if (L.fireflies.length > 30) errs.push('too many fireflies');
  if (L.w > 8 || L.h > 11) errs.push(`board too large (${L.w}x${L.h})`);
  return errs;
}

/** True when the player may put a piece of `type` on cell `idx`. */
export function canPlace(L, idx, type) {
  if (L.startCell[idx]) return false;
  if (L.lantern[idx] >= 0) return false;
  const t = L.terrain[idx];
  if (type === PIECE.LILY) return t === T.WATER;
  if (t !== T.GRASS) return false;
  if (L.fixedArrow[idx] >= 0 || L.fixedMushroom[idx] || L.fixedDaisy[idx]) return false;
  if (L.portal[idx] >= 0 || L.plate[idx] >= 0 || L.gate[idx] >= 0 || L.vaneIndex[idx] >= 0) return false;
  return true;
}

/** Placements: array of {idx, type, dir}. Returns typed arrays for the simulator. */
export function placementsToGrid(L, placements) {
  const n = L.w * L.h;
  const type = new Uint8Array(n);
  const dir = new Int8Array(n);
  for (const p of placements) {
    type[p.idx] = p.type;
    dir[p.idx] = p.dir || 0;
  }
  return { type, dir };
}

export function countPieces(placements) {
  const c = { arrow: 0, lily: 0, mushroom: 0, daisy: 0 };
  for (const p of placements) c[PIECE_KEYS[p.type]]++;
  return c;
}

// ---------------------------------------------------------------------------
// Simulation. The state is kept in typed arrays so that the solver can clone
// it cheaply and resume a run from any turn.

const MV_NONE = 0;
const MV_SLEEP = 1;
const MV_WAIT = 2;
const MV_STUCK = 3;
const MV_STEP = 4;
const MV_JUMP = 5;
const MOVE_NAMES = ['none', 'sleep', 'wait', 'stuck', 'step', 'jump'];
const OUT_NONE = 0;
const OUT_HOME = 1;
const OUT_FALL = 2;
const OUT_WATER = 3;
const OUT_CAUGHT = 4;
const OUTCOME_NAMES = [null, 'home', 'fall', 'water', 'caught'];

// Scratch buffers shared by every simulation (JavaScript is single-threaded).
const MAXW = 64;
const sFX = new Int16Array(MAXW);
const sFY = new Int16Array(MAXW);
const sTX = new Int16Array(MAXW);
const sTY = new Int16Array(MAXW);
const sD0 = new Int8Array(MAXW);
const sType = new Int8Array(MAXW);
const sCloud = new Int16Array(MAXW);
const sOut = new Int8Array(MAXW);
const sPortal = new Int16Array(MAXW);

/** Effective tile features (engraved + placed pieces). */
export function compile(L, placements) {
  const grid = Array.isArray(placements) ? placementsToGrid(L, placements) : placements;
  const n = L.w * L.h;
  const arrow = new Int8Array(L.fixedArrow);
  const mush = new Uint8Array(L.fixedMushroom);
  const daisy = new Uint8Array(L.fixedDaisy);
  const lily = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = grid.type[i];
    if (p === PIECE.ARROW) arrow[i] = grid.dir[i];
    else if (p === PIECE.MUSHROOM) mush[i] = 1;
    else if (p === PIECE.DAISY) daisy[i] = 1;
    else if (p === PIECE.LILY) lily[i] = 1;
  }
  return { L, arrow, mush, daisy, lily };
}

/** Same compiled board with one more piece. */
export function withPiece(ctx, idx, type, dir) {
  const c = { L: ctx.L, arrow: ctx.arrow, mush: ctx.mush, daisy: ctx.daisy, lily: ctx.lily };
  if (type === PIECE.ARROW) {
    c.arrow = ctx.arrow.slice();
    c.arrow[idx] = dir;
  } else if (type === PIECE.MUSHROOM) {
    c.mush = ctx.mush.slice();
    c.mush[idx] = 1;
  } else if (type === PIECE.DAISY) {
    c.daisy = ctx.daisy.slice();
    c.daisy[idx] = 1;
  } else if (type === PIECE.LILY) {
    c.lily = ctx.lily.slice();
    c.lily[idx] = 1;
  }
  return c;
}

export function initialState(L) {
  const k = L.walkers.length;
  const s = {
    wx: new Int16Array(k),
    wy: new Int16Array(k),
    wd: new Int8Array(k),
    ws: new Int8Array(k),
    ww: new Int8Array(k),
    gate: new Uint8Array([L.gateInitOpen[0] ? 1 : 0, L.gateInitOpen[1] ? 1 : 0]),
    vane: new Int8Array(L.vanes.map((v) => v.dir)),
    broken: new Uint8Array(L.w * L.h),
    ff: 0,
    sp: 0,
  };
  L.walkers.forEach((w, i) => {
    s.wx[i] = w.x;
    s.wy[i] = w.y;
    s.wd[i] = w.dir;
  });
  return s;
}

export function cloneState(s) {
  return {
    wx: s.wx.slice(),
    wy: s.wy.slice(),
    wd: s.wd.slice(),
    ws: s.ws.slice(),
    ww: s.ww.slice(),
    gate: s.gate.slice(),
    vane: s.vane.slice(),
    broken: s.broken.slice(),
    ff: s.ff,
    sp: s.sp,
  };
}

/** 53-bit hash of everything that can change during a run. */
export function hashState(L, s) {
  let h1 = 0x811c9dc5;
  let h2 = 0x2545f491;
  const mix = (v) => {
    h1 = Math.imul(h1 ^ v, 16777619);
    h2 = Math.imul(h2 ^ v, 0x5bd1e995);
    h2 ^= h2 >>> 15;
  };
  for (let i = 0; i < s.wx.length; i++) {
    mix(((s.wx[i] + 64) << 20) | ((s.wy[i] + 64) << 10) | (s.wd[i] << 6) | (s.ws[i] << 3) | s.ww[i]);
  }
  mix(s.gate[0] | (s.gate[1] << 1) | 0x100);
  for (let i = 0; i < s.vane.length; i++) mix(s.vane[i] + 8 * i + 0x200);
  mix(s.ff);
  mix(s.sp + 0x400);
  for (const c of L.cloudCells) if (s.broken[c]) mix(0x10000 + c);
  return (h1 >>> 0) * 2097152 + ((h2 >>> 0) & 0x1fffff);
}

function isBlocked(L, s, i, x, y) {
  if (x < 0 || y < 0 || x >= L.w || y >= L.h) return false;
  const c = y * L.w + x;
  if (L.terrain[c] === T.WALL) return true;
  const g = L.gate[c];
  if (g >= 0 && !s.gate[g]) return true;
  const lc = L.lantern[c];
  if (lc >= 0) {
    const w = L.walkers[i];
    if (w.kind !== KIND.LUMI || lc !== w.color) return true;
    if (L.sparkColors & (1 << lc) && !(s.sp & (1 << lc))) return true;
  }
  return false;
}

/**
 * Plays one turn. Returns null while the run goes on, else {result, cause}.
 * rec: optional {events: []} that also receives `moves`.
 * log: optional flat array receiving (turn, cell, direction) for each cell entered.
 */
export function step(ctx, s, t, rec, log) {
  const L = ctx.L;
  const W = L.w;
  const H = L.h;
  const K = L.walkers.length;
  const { arrow, mush, daisy, lily } = ctx;
  const walkers = L.walkers;
  const ev = rec ? rec.events : null;

  // 1. Every walker decides where to go.
  for (let i = 0; i < K; i++) {
    sFX[i] = sTX[i] = s.wx[i];
    sFY[i] = sTY[i] = s.wy[i];
    sD0[i] = s.wd[i];
    sCloud[i] = -1;
    sOut[i] = OUT_NONE;
    sPortal[i] = -1;
    if (s.ws[i] !== STATUS.ACTIVE) {
      sType[i] = MV_NONE;
      continue;
    }
    if (walkers[i].sleeping) {
      sType[i] = MV_SLEEP;
      continue;
    }
    if (s.ww[i] > 0) {
      s.ww[i]--;
      sType[i] = MV_WAIT;
      continue;
    }
    const x = s.wx[i];
    const y = s.wy[i];
    const here = y * W + x;
    const dist = mush[here] ? 2 : 1;
    const d0 = s.wd[i];
    let chosen = -1;
    for (let k = 0; k < 4; k++) {
      const d = k === 0 ? d0 : k === 1 ? (d0 + 1) & 3 : k === 2 ? (d0 + 3) & 3 : (d0 + 2) & 3;
      if (!isBlocked(L, s, i, x + DX[d] * dist, y + DY[d] * dist)) {
        chosen = d;
        break;
      }
    }
    if (chosen < 0) {
      sType[i] = MV_STUCK;
      continue;
    }
    s.wd[i] = chosen;
    sType[i] = dist === 2 ? MV_JUMP : MV_STEP;
    sTX[i] = x + DX[chosen] * dist;
    sTY[i] = y + DY[chosen] * dist;
    if (L.terrain[here] === T.CLOUD) sCloud[i] = here;
  }
  // 2. They all move at once.
  for (let i = 0; i < K; i++) {
    if (sType[i] >= MV_STEP) {
      s.wx[i] = sTX[i];
      s.wy[i] = sTY[i];
    }
  }
  // 3. Effects of the cells they reached, in walker order.
  for (let i = 0; i < K; i++) {
    if (sType[i] < MV_STEP) continue;
    const x = s.wx[i];
    const y = s.wy[i];
    if (x < 0 || y < 0 || x >= W || y >= H) {
      s.ws[i] = STATUS.DEAD;
      sOut[i] = OUT_FALL;
      continue;
    }
    const c = y * W + x;
    if (log) log.push(t, c, s.wd[i]);
    const ter = L.terrain[c];
    if (ter === T.VOID || (ter === T.CLOUD && s.broken[c])) {
      s.ws[i] = STATUS.DEAD;
      sOut[i] = OUT_FALL;
      continue;
    }
    if (ter === T.WATER && !lily[c]) {
      s.ws[i] = STATUS.DEAD;
      sOut[i] = OUT_WATER;
      continue;
    }
    if (L.lantern[c] >= 0) {
      s.ws[i] = STATUS.HOME;
      sOut[i] = OUT_HOME;
      if (ev) ev.push({ type: 'home', id: i, idx: c, color: walkers[i].color });
      continue;
    }
    const pc = L.portal[c];
    if (pc >= 0) {
      s.wx[i] = pc % W;
      s.wy[i] = (pc / W) | 0;
      sPortal[i] = c;
      if (ev) ev.push({ type: 'portal', id: i, from: c, to: pc });
      continue;
    }
    if (walkers[i].kind === KIND.LUMI) {
      const f = L.fireflyIndex[c];
      if (f >= 0 && !(s.ff & (1 << f))) {
        s.ff |= 1 << f;
        if (ev) ev.push({ type: 'firefly', id: i, idx: c, n: f });
      }
      const sc = L.spark[c];
      if (sc >= 0 && sc === walkers[i].color && !(s.sp & (1 << sc))) {
        s.sp |= 1 << sc;
        if (ev) ev.push({ type: 'spark', id: i, idx: c, color: sc });
      }
    }
    if (arrow[c] >= 0) {
      if (ev && s.wd[i] !== arrow[c]) ev.push({ type: 'turn', id: i, idx: c });
      s.wd[i] = arrow[c];
    }
    const vi = L.vaneIndex[c];
    if (vi >= 0) {
      s.wd[i] = s.vane[vi];
      s.vane[vi] = (s.vane[vi] + 1) & 3;
      if (ev) ev.push({ type: 'vane', id: i, idx: c, vane: vi, dir: s.vane[vi] });
    }
    if (daisy[c]) {
      s.ww[i] = 1;
      if (ev) ev.push({ type: 'daisy', id: i, idx: c });
    }
    if (mush[c] && ev) ev.push({ type: 'mushroom', id: i, idx: c });
    const pg = L.plate[c];
    if (pg >= 0) {
      s.gate[pg] ^= 1;
      if (ev) ev.push({ type: 'plate', id: i, idx: c, group: pg, open: !!s.gate[pg] });
    }
  }
  // 4. A cloud vanishes as soon as someone steps off it; whoever stands on it falls.
  for (let i = 0; i < K; i++) {
    const c = sCloud[i];
    if (c < 0 || s.broken[c]) continue;
    s.broken[c] = 1;
    if (ev) ev.push({ type: 'cloud', idx: c });
    for (let j = 0; j < K; j++) {
      if (s.ws[j] === STATUS.ACTIVE && s.wy[j] * W + s.wx[j] === c) {
        s.ws[j] = STATUS.DEAD;
        sOut[j] = OUT_FALL;
      }
    }
  }
  // 5. Gloomnibs catch Lumignons sharing their cell or crossing them.
  for (let a = 0; a < K; a++) {
    if (walkers[a].kind !== KIND.LUMI || s.ws[a] !== STATUS.ACTIVE) continue;
    for (let b = 0; b < K; b++) {
      if (walkers[b].kind !== KIND.SHADOW || s.ws[b] !== STATUS.ACTIVE) continue;
      const same = s.wx[a] === s.wx[b] && s.wy[a] === s.wy[b];
      const swap =
        sFX[a] === sTX[b] && sFY[a] === sTY[b] && sFX[b] === sTX[a] && sFY[b] === sTY[a] &&
        (sType[a] === MV_STEP || sType[b] === MV_STEP);
      if (same || swap) {
        s.ws[a] = STATUS.DEAD;
        sOut[a] = OUT_CAUGHT;
        break;
      }
    }
  }

  if (rec) {
    const moves = [];
    for (let i = 0; i < K; i++) {
      moves.push({
        id: i,
        type: MOVE_NAMES[sType[i]],
        fromX: sFX[i],
        fromY: sFY[i],
        toX: sTX[i],
        toY: sTY[i],
        x: s.wx[i],
        y: s.wy[i],
        dir0: sD0[i],
        dir: s.wd[i],
        teleport: sPortal[i] >= 0,
        portalFrom: sPortal[i],
        outcome: OUTCOME_NAMES[sOut[i]],
      });
      if (sOut[i] >= OUT_FALL) ev.push({ type: OUTCOME_NAMES[sOut[i]], id: i, x: s.wx[i], y: s.wy[i] });
    }
    rec.moves = moves;
  }

  let allHome = true;
  for (let i = 0; i < K; i++) {
    if (walkers[i].kind !== KIND.LUMI) continue;
    if (s.ws[i] === STATUS.DEAD) {
      return { result: 'fail', cause: { type: OUTCOME_NAMES[sOut[i]], id: i, x: s.wx[i], y: s.wy[i] } };
    }
    if (s.ws[i] !== STATUS.HOME) allHome = false;
  }
  return allHome ? { result: 'win', cause: null } : null;
}

/**
 * Runs until the end.
 * opts.record   keep a frame per turn for the renderer
 * opts.trace    keep hashes, snapshots and the entry log (solver)
 * opts.resume   {base, t}: continue `base` (a traced run) from the state after turn t
 */
export function run(ctx, opts = {}) {
  const L = ctx.L;
  const record = !!opts.record;
  const trace = !!opts.trace;
  let s;
  let t;
  let hashes;
  let snaps = null;
  let log = null;
  if (opts.resume) {
    const { base, t: t0 } = opts.resume;
    t = t0;
    s = cloneState(base.snaps[t0]);
    hashes = base.hashes.slice(0, t0 + 1);
    snaps = base.snaps.slice(0, t0 + 1);
    log = [];
    const bl = base.log;
    for (let i = 0; i < bl.length && bl[i] <= t0; i += 3) log.push(bl[i], bl[i + 1], bl[i + 2]);
  } else {
    t = 0;
    s = initialState(L);
    hashes = [hashState(L, s)];
    if (trace) {
      snaps = [cloneState(s)];
      log = [];
    }
  }
  const seen = new Set(hashes);
  const frames = record ? [frameOf(s)] : null;
  let end = null;
  while (end === null) {
    t++;
    const rec = record ? { events: [], moves: null } : null;
    end = step(ctx, s, t, rec, log);
    const h = hashState(L, s);
    hashes.push(h);
    if (snaps) snaps.push(cloneState(s));
    if (end === null) {
      if (seen.has(h) || t >= MAX_TICKS) {
        let stuck = 0;
        for (let i = 0; i < L.walkers.length; i++) {
          if (L.walkers[i].kind === KIND.LUMI && s.ws[i] === STATUS.ACTIVE) {
            stuck = i;
            break;
          }
        }
        end = { result: 'fail', cause: { type: 'loop', id: stuck, x: s.wx[stuck], y: s.wy[stuck] } };
      }
      seen.add(h);
    }
    if (record) frames.push({ ...frameOf(s), moves: rec.moves, events: rec.events });
  }
  let fireflies = 0;
  for (let m = s.ff; m; m &= m - 1) fireflies++;
  return {
    result: end.result,
    cause: end.cause,
    ticks: t,
    fireflies,
    allFireflies: fireflies === L.fireflies.length,
    frames,
    hashes,
    snaps,
    log,
    final: s,
  };
}

function frameOf(s) {
  const walkers = [];
  for (let i = 0; i < s.wx.length; i++) {
    walkers.push({ x: s.wx[i], y: s.wy[i], dir: s.wd[i], status: s.ws[i], wait: s.ww[i] });
  }
  return {
    walkers,
    gateOpen: [!!s.gate[0], !!s.gate[1]],
    vaneDir: Array.from(s.vane),
    broken: s.broken.slice(),
    fireflyMask: s.ff,
    sparkMask: s.sp,
  };
}

/** Convenience wrapper: placements → full run. */
export function simulate(L, placements, opts = {}) {
  return run(compile(L, placements), opts);
}

/** Star rating for a finished run. */
export function rateRun(L, sim, piecesUsed, par) {
  if (sim.result !== 'win') return 0;
  let stars = 1;
  if (sim.allFireflies) {
    stars = 2;
    if (piecesUsed <= par) stars = 3;
  }
  return stars;
}
