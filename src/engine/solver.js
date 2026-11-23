// Exhaustive solver used to prove that every level is solvable and to compute
// its par (the minimum number of pieces for a perfect run).
//
// Principle: a piece only matters once a walker steps on it. Compare the run
// of the current board with the run of a perfect solution: the first turn
// where they differ is caused by a solution piece lying on a cell the current
// run visits. Adding pieces in the order of those "divergence turns" (which
// never decrease) gives a complete search with almost no duplicates. Runs are
// resumed from the turn where the new piece first acts, so each candidate
// costs only the end of a run.

import { canPlace, compile, withPiece, run, PIECE, PIECE_KEYS, ORIENTED, emptyInventory, inventorySize, T } from './core.js';

const VARIANTS = [
  { type: PIECE.ARROW, dir: 0, key: 'arrow' },
  { type: PIECE.ARROW, dir: 1, key: 'arrow' },
  { type: PIECE.ARROW, dir: 2, key: 'arrow' },
  { type: PIECE.ARROW, dir: 3, key: 'arrow' },
  { type: PIECE.MUSHROOM, dir: 0, key: 'mushroom' },
  { type: PIECE.DAISY, dir: 0, key: 'daisy' },
  { type: PIECE.LILY, dir: 0, key: 'lily' },
  { type: PIECE.MIRROR, dir: 0, key: 'mirror' },
  { type: PIECE.MIRROR, dir: 1, key: 'mirror' },
  { type: PIECE.COMET, dir: 0, key: 'comet' },
  { type: PIECE.COMET, dir: 1, key: 'comet' },
  { type: PIECE.COMET, dir: 2, key: 'comet' },
  { type: PIECE.COMET, dir: 3, key: 'comet' },
];

// Identity of a placed piece, to skip layouts already explored in another order.
const pieceKey = (p) => (p.idx << 5) | (p.type << 2) | (ORIENTED[p.type] ? p.dir : 0);

function divergence(a, b, from) {
  const m = Math.min(a.length, b.length);
  for (let i = from; i < m; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : m;
}

/**
 * @param L parsed level
 * @param opts.fireflies   require every firefly
 * @param opts.maxPieces   upper bound (defaults to the inventory size)
 * @param opts.countCap    how many optimal solutions to enumerate
 * @param opts.timeLimitMs give up after this time
 */
export function solve(L, opts = {}) {
  const inv = L.inventory;
  const total = inventorySize(inv);
  const maxPieces = Math.min(opts.maxPieces ?? total, total);
  const countCap = opts.countCap ?? 1;
  const deadline = Date.now() + (opts.timeLimitMs ?? 60000);
  const wantFireflies = !!opts.fireflies;
  const n = L.w * L.h;
  let nodes = 0;
  let timedOut = false;

  const goal = (r) => r.result === 'win' && (!wantFireflies || r.allFireflies);
  const placeable = VARIANTS.map((v) => {
    const ok = new Uint8Array(n);
    for (let i = 0; i < n; i++) ok[i] = canPlace(L, i, v.type) ? 1 : 0;
    return ok;
  });
  const anyPlaceable = new Uint8Array(n);
  for (let i = 0; i < n; i++) for (const ok of placeable) if (ok[i]) anyPlaceable[i] = 1;

  const ctx0 = compile(L, []);
  const base0 = run(ctx0, { trace: true });
  if (goal(base0)) return { min: 0, solutions: [[]], timedOut: false, nodes: 1 };

  for (let k = 1; k <= maxPieces; k++) {
    const solutions = [];
    const seen = new Set();
    const placed = [];
    const occupied = new Uint8Array(n);
    const left = { ...inv };

    const dfs = (ctx, base, lastD) => {
      if (timedOut || solutions.length >= countCap) return;
      nodes++;
      if ((nodes & 127) === 0 && Date.now() > deadline) {
        timedOut = true;
        return;
      }
      // Cell → chronological touches (turn, direction) of the current run.
      const touches = new Map();
      const lg = base.log;
      for (let i = 0; i < lg.length; i += 4) {
        const c = lg[i + 1];
        if (!anyPlaceable[c] || occupied[c]) continue;
        let list = touches.get(c);
        if (!list) touches.set(c, (list = []));
        list.push(lg[i], lg[i + 2]);
      }
      const cells = [...touches.keys()].sort((p, q) => p - q);
      for (const c of cells) {
        const list = touches.get(c);
        for (let vi = 0; vi < VARIANTS.length; vi++) {
          const v = VARIANTS[vi];
          if (!left[v.key] || !placeable[vi][c]) continue;
          // First turn at which this piece changes something.
          let tAct = -1;
          if (v.type === PIECE.ARROW) {
            for (let j = 0; j < list.length; j += 2) {
              if (list[j + 1] !== v.dir) {
                tAct = list[j];
                break;
              }
            }
          } else {
            tAct = list[0];
          }
          if (tAct < 0) continue;
          const lower = v.type === PIECE.MUSHROOM ? tAct + 1 : tAct;
          // Equal turns are allowed: a piece on the landing cell of a mushroom
          // acts on the very turn the mushroom changed the path.
          if (lower < lastD) continue;
          const ctx2 = withPiece(ctx, c, v.type, v.dir);
          const r = run(ctx2, { trace: true, resume: { base, t: tAct - 1 } });
          const d = divergence(base.hashes, r.hashes, tAct);
          if (d < 0) continue;
          if (d < lastD) continue;
          placed.push({ idx: c, type: v.type, dir: v.dir });
          const key = placed
            .map(pieceKey)
            .sort((a, b) => a - b)
            .join(',');
          if (!seen.has(key)) {
            seen.add(key);
            if (placed.length === k) {
              if (goal(r)) solutions.push(placed.map((p) => ({ ...p })));
            } else {
              left[v.key]--;
              occupied[c] = 1;
              dfs(ctx2, r, d);
              occupied[c] = 0;
              left[v.key]++;
            }
          }
          placed.pop();
          if (timedOut || solutions.length >= countCap) return;
        }
      }
    };

    dfs(ctx0, base0, -1);
    if (timedOut) return { min: null, solutions: [], timedOut: true, nodes };
    if (solutions.length) return { min: k, solutions, timedOut: false, nodes };
  }
  return { min: null, solutions: [], timedOut: false, nodes };
}

/**
 * Lists every winning layout with at most `maxPieces` pieces in which each
 * piece matters (design tool). For each: the pieces and the cells entered by
 * Lumignons (where a firefly would be caught).
 */
export function enumerateSolutions(L, opts = {}) {
  const inv = L.inventory;
  const total = inventorySize(inv);
  const maxPieces = Math.min(opts.maxPieces ?? total, total);
  const deadline = Date.now() + (opts.timeLimitMs ?? 10000);
  const cap = opts.cap ?? 100000;
  const n = L.w * L.h;
  const lumi = L.walkers.map((w) => w.kind === 0);
  const placeable = VARIANTS.map((v) => {
    const ok = new Uint8Array(n);
    for (let i = 0; i < n; i++) ok[i] = canPlace(L, i, v.type) ? 1 : 0;
    return ok;
  });
  const out = [];
  const seen = new Set();
  const placed = [];
  const occupied = new Uint8Array(n);
  const left = { ...inv };
  let timedOut = false;
  let nodes = 0;
  const record = (r) => {
    const cells = new Set();
    for (let i = 0; i < r.log.length; i += 4) if (lumi[r.log[i + 3]]) cells.add(r.log[i + 1]);
    out.push({ pieces: placed.map((p) => ({ ...p })), size: placed.length, cells });
  };
  const dfs = (ctx, base, lastD) => {
    if (timedOut || out.length >= cap) return;
    if ((++nodes & 127) === 0 && Date.now() > deadline) {
      timedOut = true;
      return;
    }
    if (base.result === 'win') record(base);
    if (placed.length >= maxPieces) return;
    const touches = new Map();
    const lg = base.log;
    for (let i = 0; i < lg.length; i += 4) {
      const c = lg[i + 1];
      if (occupied[c]) continue;
      let list = touches.get(c);
      if (!list) touches.set(c, (list = []));
      list.push(lg[i], lg[i + 2]);
    }
    for (const [c, list] of touches) {
      for (let vi = 0; vi < VARIANTS.length; vi++) {
        const v = VARIANTS[vi];
        if (!left[v.key] || !placeable[vi][c]) continue;
        let tAct = -1;
        if (v.type === PIECE.ARROW) {
          for (let j = 0; j < list.length; j += 2) {
            if (list[j + 1] !== v.dir) {
              tAct = list[j];
              break;
            }
          }
        } else tAct = list[0];
        if (tAct < 0) continue;
        const lower = v.type === PIECE.MUSHROOM ? tAct + 1 : tAct;
        if (lower < lastD) continue;
        const ctx2 = withPiece(ctx, c, v.type, v.dir);
        const r = run(ctx2, { trace: true, resume: { base, t: tAct - 1 } });
        const d = divergence(base.hashes, r.hashes, tAct);
        if (d < 0 || d < lastD) continue;
        placed.push({ idx: c, type: v.type, dir: v.dir });
        const key = placed
          .map(pieceKey)
          .sort((a, b) => a - b)
          .join(',');
        if (!seen.has(key)) {
          seen.add(key);
          left[v.key]--;
          occupied[c] = 1;
          dfs(ctx2, r, d);
          occupied[c] = 0;
          left[v.key]++;
        }
        placed.pop();
        if (timedOut) return;
      }
    }
  };
  const ctx0 = compile(L, []);
  dfs(ctx0, run(ctx0, { trace: true }), -1);
  return { solutions: out, timedOut, nodes };
}

/** Checks a stored solution against the level rules. */
export function checkSolution(L, placements) {
  const counts = emptyInventory();
  const keys = PIECE_KEYS;
  const cells = new Set();
  for (const p of placements) {
    if (!canPlace(L, p.idx, p.type)) return { ok: false, why: `cannot place ${keys[p.type]} at ${p.idx}` };
    if (cells.has(p.idx)) return { ok: false, why: `two pieces on ${p.idx}` };
    cells.add(p.idx);
    counts[keys[p.type]]++;
  }
  for (const k of Object.keys(counts)) {
    if (counts[k] > L.inventory[k]) return { ok: false, why: `inventory exceeded for ${k}` };
  }
  const sim = run(compile(L, placements));
  return { ok: sim.result === 'win', sim, why: sim.result === 'win' ? '' : `run ends with ${sim.cause?.type}` };
}

export { T };
