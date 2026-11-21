// Design aid: proposes candidate puzzles for a recipe, verified by the solver.
// Candidates are only raw material: every level kept in the campaign was then
// reviewed, reshaped by hand and given an intent.
//
// Usage: node tools/generate.mjs <recipe> [attempts] [seed]
import { parseLevel, simulate, validateLevel, PIECE, KIND } from '../src/engine/core.js';
import { solve } from '../src/engine/solver.js';
import { overlay, describe } from './lib.mjs';

const RECIPES = {
  meadow: { w: [6, 7], h: [7, 9], lumis: [2, 2], walls: [3, 7], arrows: [0, 2], inv: { arrow: 7 }, par: [4, 6] },
  meadow1: { w: [6, 7], h: [6, 8], lumis: [1, 1], walls: [3, 7], arrows: [1, 2], inv: { arrow: 7 }, par: [4, 5] },
  pond: { w: [6, 7], h: [7, 9], lumis: [1, 2], walls: [2, 5], water: [5, 12], arrows: [0, 1], sparks: [0, 1], inv: { arrow: 6, lily: 3 }, par: [4, 6], need: ['lily'] },
  pondSpark: { w: [6, 7], h: [7, 9], lumis: [1, 2], walls: [2, 5], water: [3, 9], arrows: [0, 1], sparks: [1, 2], inv: { arrow: 6, lily: 3 }, par: [4, 6], need: ['spark'] },
  grove: { w: [6, 7], h: [7, 9], lumis: [1, 2], walls: [3, 7], water: [0, 6], mush: [0, 2], daisyF: [0, 1], inv: { arrow: 5, mushroom: 2, daisy: 1 }, par: [4, 6], need: ['mushroom'] },
  groveDaisy: { w: [6, 7], h: [7, 9], lumis: [2, 2], walls: [3, 6], water: [0, 4], mush: [0, 1], inv: { arrow: 5, mushroom: 1, daisy: 2 }, par: [4, 6], need: ['daisy'] },
  ruins: { w: [6, 7], h: [7, 9], lumis: [1, 2], walls: [3, 7], portals: [1, 2], inv: { arrow: 6 }, par: [4, 6], need: ['portal'] },
  ruinsGate: { w: [6, 7], h: [7, 9], lumis: [1, 2], walls: [3, 6], plates: [1, 2], gates: [1, 3], portals: [0, 1], inv: { arrow: 6, daisy: 1 }, par: [4, 6], need: ['plate'] },
  gloom: { w: [6, 7], h: [7, 9], lumis: [1, 2], walls: [3, 6], shadows: [1, 2], sleepers: [0, 2], inv: { arrow: 6, daisy: 1 }, par: [4, 6], need: ['shadowFall'] },
  gloomMix: { w: [6, 7], h: [7, 9], lumis: [2, 2], walls: [2, 5], water: [0, 4], shadows: [1, 2], sleepers: [0, 1], mush: [0, 1], inv: { arrow: 6, daisy: 1, mushroom: 1, lily: 1 }, par: [4, 6], need: ['shadow'] },
  peak: { w: [6, 7], h: [7, 9], lumis: [1, 2], walls: [2, 5], vanes: [1, 2], clouds: [2, 6], inv: { arrow: 6, daisy: 1 }, par: [4, 6], need: ['vane'] },
  peakCloud: { w: [6, 7], h: [7, 9], lumis: [2, 2], walls: [2, 5], clouds: [4, 9], vanes: [0, 1], inv: { arrow: 6, mushroom: 1, daisy: 1 }, par: [4, 6], need: ['cloud'] },
  finale: { w: [7, 7], h: [8, 9], lumis: [2, 3], walls: [3, 6], water: [0, 4], portals: [0, 1], plates: [0, 1], gates: [0, 2], shadows: [0, 1], vanes: [0, 1], clouds: [0, 4], mush: [0, 1], inv: { arrow: 7, lily: 1, mushroom: 1, daisy: 1 }, par: [5, 7] },
};

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0;
    s ^= s >>> 12;
    return (s >>> 0) / 4294967296;
  };
}

const recipeName = process.argv[2] || 'meadow';
const attempts = Number(process.argv[3] || 300);
const R = RECIPES[recipeName];
const rand = rng(Number(process.argv[4] || Date.now() % 100000));
const ri = ([a, b]) => a + Math.floor(rand() * (b - a + 1));
const D = 'NESW';

function makeBoard() {
  const w = ri(R.w);
  const h = ri(R.h);
  const g = [];
  for (let y = 0; y < h; y++) g.push(new Array(w).fill('.'));
  // Rounded island: carve corners, maybe a notch or a hole.
  for (const [cx, cy] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) {
    if (rand() < 0.75) g[cy][cx] = ' ';
    if (rand() < 0.3) g[cy][cx + (cx === 0 ? 1 : -1)] = ' ';
    if (rand() < 0.3) g[cy + (cy === 0 ? 1 : -1)][cx] = ' ';
  }
  if (rand() < 0.35) g[ri([2, h - 3])][ri([1, w - 2])] = ' ';
  const free = () => {
    for (let k = 0; k < 200; k++) {
      const x = Math.floor(rand() * w);
      const y = Math.floor(rand() * h);
      if (g[y][x] === '.') return [x, y];
    }
    return null;
  };
  const put = (ch, n = 1) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = free();
      if (!p) return null;
      g[p[1]][p[0]] = ch;
      out.push(p);
    }
    return out;
  };
  // Water as small ponds (clustered).
  const water = R.water ? ri(R.water) : 0;
  for (let i = 0; i < water; ) {
    const p = free();
    if (!p) break;
    let [x, y] = p;
    const len = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < len && i < water; k++) {
      if (g[y]?.[x] === '.') {
        g[y][x] = '~';
        i++;
      }
      if (rand() < 0.5) x += rand() < 0.5 ? 1 : -1;
      else y += rand() < 0.5 ? 1 : -1;
    }
  }
  put('#', ri(R.walls));
  const dirs = {};
  const nl = ri(R.lumis);
  const colors = 'abcd'.slice(0, nl);
  for (const c of colors) {
    if (!put(c)) return null;
    dirs[c] = D[Math.floor(rand() * 4)];
    if (!put(c.toUpperCase())) return null;
  }
  const sparks = R.sparks ? Math.min(ri(R.sparks), nl) : 0;
  for (let i = 0; i < sparks; i++) put(String(i + 1));
  const arrows = R.arrows ? ri(R.arrows) : 0;
  for (let i = 0; i < arrows; i++) put('^>v<'[Math.floor(rand() * 4)]);
  if (R.mush) put('m', ri(R.mush));
  if (R.daisyF) put('f', ri(R.daisyF));
  const portals = R.portals ? ri(R.portals) : 0;
  for (let i = 0; i < portals; i++) put('@%'[i], 2);
  if (R.plates) {
    const np = ri(R.plates);
    if (np) {
      put('P', np);
      put(rand() < 0.5 ? 'H' : 'h', Math.max(1, ri(R.gates)));
    }
  }
  if (R.shadows) {
    const ns = ri(R.shadows);
    dirs.G = '';
    for (let i = 0; i < ns; i++) {
      put('G');
      dirs.G += D[Math.floor(rand() * 4)];
    }
    if (!dirs.G) delete dirs.G;
  }
  if (R.sleepers) put('Z', ri(R.sleepers));
  let vanes = '';
  if (R.vanes) {
    const nv = ri(R.vanes);
    for (let i = 0; i < nv; i++) vanes += D[Math.floor(rand() * 4)];
    put('R', nv);
  }
  if (R.clouds) put('o', ri(R.clouds));
  return { map: g.map((r) => r.join('')), dirs, vanes };
}

function features(L, sol) {
  const sim = simulate(L, sol, { record: true });
  const f = { wallTurns: 0, shared: 0, revisit: 0, events: {} };
  const touchers = new Map();
  for (let t = 1; t < sim.frames.length; t++) {
    const fr = sim.frames[t];
    for (const e of fr.events) f.events[e.type] = (f.events[e.type] || 0) + 1;
    for (const m of fr.moves) {
      if ((m.type === 'step' || m.type === 'jump') && m.dir !== m.dir0) f.wallTurns++;
      const c = m.y * L.w + m.x;
      if (!touchers.has(c)) touchers.set(c, []);
      touchers.get(c).push(m.id);
    }
  }
  for (const p of sol) {
    const ids = touchers.get(p.idx) || [];
    if (new Set(ids).size > 1) f.shared++;
    if (ids.length > new Set(ids).size) f.revisit++;
  }
  f.lily = sol.filter((p) => p.type === PIECE.LILY).length;
  f.mushroom = sol.filter((p) => p.type === PIECE.MUSHROOM).length + (f.events.mushroom || 0);
  f.daisy = sol.filter((p) => p.type === PIECE.DAISY).length + (f.events.daisy || 0);
  f.spark = f.events.spark || 0;
  f.portal = f.events.portal || 0;
  f.plate = f.events.plate || 0;
  f.vane = f.events.vane || 0;
  f.cloud = f.events.cloud || 0;
  f.shadowFall = 0;
  f.shadow = L.walkers.some((w) => w.kind === KIND.SHADOW) ? 1 : 0;
  for (let t = 1; t < sim.frames.length; t++) {
    for (const e of sim.frames[t].events) {
      if ((e.type === 'fall' || e.type === 'water') && L.walkers[e.id].kind === KIND.SHADOW) f.shadowFall++;
    }
  }
  return f;
}

const found = [];
let tries = 0;
for (let a = 0; a < attempts; a++) {
  const b = makeBoard();
  if (!b) continue;
  let L;
  try {
    L = parseLevel({ id: 'g', map: b.map, dirs: b.dirs, vanes: b.vanes, inv: R.inv });
  } catch {
    continue;
  }
  if (validateLevel(L).length) continue;
  tries++;
  if (simulate(L, []).result === 'win') continue;
  const one = solve(L, { countCap: 1, timeLimitMs: 1500 });
  if (one.min === null || one.min < R.par[0] - 2) continue;
  // Add fireflies greedily where they raise the par the most.
  let def = { id: 'g', map: b.map.slice(), dirs: b.dirs, vanes: b.vanes, inv: R.inv };
  let best = { par: one.min, n: 1, sol: one.solutions[0], def };
  for (let f = 0; f < 2; f++) {
    const cells = [];
    def.map.forEach((row, y) => [...row].forEach((ch, x) => ch === '.' && cells.push([x, y])));
    let bestF = null;
    for (const [x, y] of cells.sort(() => rand() - 0.5).slice(0, 14)) {
      const m = def.map.map((r) => r.split(''));
      m[y][x] = '*';
      const d2 = { ...def, map: m.map((r) => r.join('')) };
      const L2 = parseLevel(d2);
      const r = solve(L2, { fireflies: true, countCap: 3, timeLimitMs: 1500 });
      if (r.min === null || r.timedOut) continue;
      const score = r.min * 10 - r.solutions.length;
      if (!bestF || score > bestF.score) bestF = { score, par: r.min, n: r.solutions.length, sol: r.solutions[0], def: d2 };
    }
    if (!bestF) break;
    def = bestF.def;
    best = bestF;
  }
  if (best.par < R.par[0] || best.par > R.par[1] || best.n > 2) continue;
  const L3 = parseLevel(best.def);
  const fx = features(L3, best.sol);
  if (R.need && R.need.some((k) => !fx[k])) continue;
  const score = best.par * 10 - best.n * 4 + fx.wallTurns + fx.shared * 4 + fx.revisit * 3 - (best.par - one.min < 1 ? 5 : 0);
  const cand = { score, best, one: one.min, fx, L: L3 };
  found.push(cand);
  if (score >= Number(process.env.MINSCORE || 0)) print(cand);
}
console.log(`\n${recipeName}: ${found.length} candidates from ${tries} boards`);

function print(c) {
  const inv = {};
  for (const p of c.best.sol) {
    const k = ['', 'arrow', 'lily', 'mushroom', 'daisy'][p.type];
    inv[k] = (inv[k] || 0) + 1;
  }
  console.log(`\nscore ${c.score}  ★min ${c.one}  par ${c.best.par} (${c.best.n} sol)  turns ${c.fx.wallTurns} shared ${c.fx.shared} revisit ${c.fx.revisit} uses ${JSON.stringify(inv)} events ${JSON.stringify(c.fx.events)}`);
  console.log(`{ map:${JSON.stringify(c.best.def.map)}, dirs:${JSON.stringify(c.best.def.dirs)}${c.best.def.vanes ? `, vanes:'${c.best.def.vanes}'` : ''} }`);
  console.log(c.best.sol.map((p) => describe(p, c.L)).join(', '));
  console.log(overlay(c.L, c.best.sol));
}
