// Design aid: proposes candidate puzzles for a recipe, verified by the solver.
// Candidates are only raw material: every level kept in the campaign was then
// reviewed, reshaped by hand and given an intent.
//
// Usage: node tools/generate.mjs <recipe> [attempts] [seed]
import { parseLevel, simulate, validateLevel, PIECE, KIND } from '../src/engine/core.js';
import { solve, enumerateSolutions } from '../src/engine/solver.js';
import { overlay, describe } from './lib.mjs';

const RECIPES = {
  meadow: { w: [6, 7], h: [7, 9], lumis: [2, 2], walls: [3, 7], arrows: [0, 2], inv: { arrow: 7 }, par: [4, 6] },
  pond: { style: 'pond', w: [6, 7], h: [6, 8], lumis: [1, 1], walls: [2, 4], water: [5, 12], arrows: [0, 1], inv: { arrow: 6, lily: 3 }, par: [3, 6], need: ['lily'] },
  pond2: { style: 'pond', w: [6, 7], h: [7, 9], lumis: [2, 2], walls: [2, 4], water: [5, 12], arrows: [0, 1], inv: { arrow: 6, lily: 3 }, par: [4, 7], need: ['lily'] },
  pondSpark: { style: 'pond', w: [6, 7], h: [6, 8], lumis: [1, 2], walls: [2, 4], water: [3, 9], arrows: [0, 1], sparks: [1, 2], inv: { arrow: 6, lily: 3 }, par: [3, 7], need: ['spark'] },
  grove: { gaps: true, w: [6, 7], h: [6, 8], lumis: [1, 1], walls: [3, 6], water: [0, 6], mush: [0, 2], inv: { arrow: 5, mushroom: 3 }, par: [3, 6], need: ['leap'] },
  grove2: { gaps: true, w: [6, 7], h: [7, 9], lumis: [2, 2], walls: [3, 6], water: [0, 6], mush: [0, 2], sparks: [0, 1], inv: { arrow: 5, mushroom: 3, lily: 1 }, par: [4, 7], need: ['leap'] },
  ruins: { style: 'ruins', w: [7, 7], h: [6, 8], lumis: [1, 2], walls: [3, 7], portals: [1, 2], inv: { arrow: 6 }, par: [3, 6], need: ['portal'] },
  ruinsGate: { style: 'ruins', w: [7, 7], h: [7, 9], lumis: [1, 2], walls: [3, 6], plates: [1, 2], gates: [1, 3], portals: [0, 1], inv: { arrow: 6, daisy: 1 }, par: [3, 7], need: ['plate'] },
  gloom: { w: [6, 7], h: [6, 8], lumis: [1, 1], walls: [3, 6], shadows: [1, 1], sleepers: [0, 1], inv: { arrow: 6 }, par: [3, 6], need: ['shadowFall'] },
  gloom2: { w: [6, 7], h: [7, 9], lumis: [1, 2], walls: [3, 6], water: [0, 4], shadows: [1, 2], sleepers: [0, 2], inv: { arrow: 6, daisy: 1, lily: 1 }, par: [4, 7], need: ['shadow'] },
  gloomDaisy: { w: [5, 7], h: [5, 8], lumis: [1, 2], walls: [2, 5], shadows: [1, 2], sleepers: [0, 1], inv: { arrow: 4, daisy: 2 }, par: [2, 7], need: ['daisy', 'shadow'] },
  peak: { style: 'peak', w: [6, 7], h: [6, 8], lumis: [1, 2], walls: [1, 4], vanes: [1, 2], clouds: [1, 4], inv: { arrow: 6, daisy: 1 }, par: [3, 6], need: ['vane'] },
  peakCloud: { style: 'peak', w: [6, 7], h: [7, 9], lumis: [1, 2], walls: [1, 4], clouds: [4, 9], vanes: [0, 1], inv: { arrow: 6, mushroom: 1, daisy: 1 }, par: [4, 7], need: ['cloud'] },
  finale3: { w: [7, 7], h: [7, 9], lumis: [3, 3], walls: [3, 6], water: [0, 4], portals: [0, 1], vanes: [0, 1], clouds: [0, 3], mush: [0, 1], shadows: [0, 1], inv: { arrow: 8, lily: 1, mushroom: 1, daisy: 1 }, par: [6, 8] },
  finale: { w: [7, 7], h: [8, 9], lumis: [2, 3], walls: [3, 6], water: [0, 4], portals: [0, 1], plates: [0, 1], gates: [0, 2], shadows: [0, 1], vanes: [0, 1], clouds: [0, 4], mush: [0, 1], inv: { arrow: 7, lily: 1, mushroom: 1, daisy: 1 }, par: [5, 8] },
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
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  // Island outline: rounded corners, sometimes a bay or a hole.
  for (const [cx, cy] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) {
    if (rand() < 0.8) g[cy][cx] = ' ';
    if (rand() < 0.25) g[cy][cx + (cx === 0 ? 1 : -1)] = ' ';
    if (rand() < 0.25) g[cy + (cy === 0 ? 1 : -1)][cx] = ' ';
  }
  const style = R.style || 'plain';
  if (style === 'peak' || (R.gaps && rand() < 0.8)) {
    // Two or three floating islands joined by cloud bridges.
    const vertical = rand() < 0.5;
    const n = rand() < 0.6 ? 1 : 2;
    for (let k = 0; k < n; k++) {
      if (vertical) {
        const y0 = Math.floor(((k + 1) * h) / (n + 1));
        for (let x = 0; x < w; x++) g[y0][x] = ' ';
        const bridges = 1 + Math.floor(rand() * 2);
        for (let q = 0; q < bridges; q++) g[y0][1 + Math.floor(rand() * (w - 2))] = R.clouds ? 'o' : '.';
      } else {
        const x0 = Math.floor(((k + 1) * w) / (n + 1));
        for (let y = 0; y < h; y++) g[y][x0] = ' ';
        const bridges = 1 + Math.floor(rand() * 2);
        for (let q = 0; q < bridges; q++) g[1 + Math.floor(rand() * (h - 2))][x0] = R.clouds ? 'o' : '.';
      }
    }
  } else if (rand() < 0.3) {
    g[ri([2, h - 3])][ri([1, w - 2])] = ' ';
  }
  const free = () => {
    for (let k = 0; k < 300; k++) {
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
  // Water: a winding river or a round pond, never scattered puddles.
  const water = R.water ? ri(R.water) : 0;
  if (water > 0) {
    if (rand() < 0.55) {
      const horizontal = rand() < 0.5;
      const len = horizontal ? w : h;
      let pos = horizontal ? ri([1, h - 2]) : ri([1, w - 2]);
      const width = water > 8 ? 2 : 1;
      for (let i = 0; i < len; i++) {
        for (let k = 0; k < width; k++) {
          const x = horizontal ? i : pos + k;
          const y = horizontal ? pos + k : i;
          if (inside(x, y) && g[y][x] === '.') g[y][x] = '~';
        }
        if (rand() < 0.3) pos += rand() < 0.5 ? 1 : -1;
        pos = Math.max(0, Math.min((horizontal ? h : w) - width, pos));
      }
      // Fords: a dry stone or two in the river.
      const fords = Math.floor(rand() * 2);
      for (let f = 0; f < fords; f++) {
        const cells = [];
        g.forEach((row, y) => row.forEach((c, x) => c === '~' && cells.push([x, y])));
        if (cells.length) {
          const [fx, fy] = cells[Math.floor(rand() * cells.length)];
          g[fy][fx] = '.';
        }
      }
    } else {
      const cx = ri([1, w - 2]);
      const cy = ri([1, h - 2]);
      const rx = 0.8 + rand() * 1.6;
      const ry = 0.8 + rand() * 1.6;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
          if (d <= 1 + rand() * 0.3 && g[y][x] === '.') g[y][x] = '~';
        }
    }
  }
  // Obstacles in little clusters (hedges, rock piles), mirrored in the ruins.
  const walls = ri(R.walls);
  let placed = 0;
  for (let tries = 0; placed < walls && tries < 200; tries++) {
    const p = free();
    if (!p) break;
    let [x, y] = p;
    const len = 1 + Math.floor(rand() * 3);
    const horiz = rand() < 0.5;
    for (let k = 0; k < len && placed < walls; k++) {
      if (inside(x, y) && g[y][x] === '.') {
        g[y][x] = '#';
        placed++;
        if (style === 'ruins' && g[y][w - 1 - x] === '.') {
          g[y][w - 1 - x] = '#';
          placed++;
        }
      }
      if (horiz) x++;
      else y++;
    }
  }
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
  if (R.clouds && style !== 'peak') put('o', ri(R.clouds));
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
  f.leap = 0;
  for (let t = 1; t < sim.frames.length; t++) {
    for (const m of sim.frames[t].moves) {
      if (m.type !== 'jump') continue;
      const mx = (m.fromX + m.toX) / 2;
      const my = (m.fromY + m.toY) / 2;
      const out = mx < 0 || my < 0 || mx >= L.w || my >= L.h;
      const ter = out ? 0 : L.terrain[my * L.w + mx];
      if (ter !== 1) f.leap++;
    }
  }
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
const tStart = Date.now();
const budget = Number(process.env.BUDGET_S || 1500) * 1000;
for (let a = 0; a < attempts && Date.now() - tStart < budget; a++) {
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
  const en = enumerateSolutions(L, { maxPieces: R.par[1], timeLimitMs: Number(process.env.ENUM_MS || 2500) });
  if (en.timedOut || !en.solutions.length) continue;
  const sols = en.solutions;
  const min1 = Math.min(...sols.map((x) => x.size));
  if (min1 < R.par[0] - 3 || min1 > R.par[1]) continue;
  // Free grass cells where a firefly may sit.
  const cells = [];
  for (let i = 0; i < L.w * L.h; i++) {
    if (L.terrain[i] !== 1 || L.startCell[i] || L.lantern[i] >= 0 || L.spark[i] >= 0 || L.fixedArrow[i] >= 0) continue;
    if (L.portal[i] >= 0 || L.plate[i] >= 0 || L.gate[i] >= 0 || L.vaneIndex[i] >= 0 || L.fixedMushroom[i] || L.fixedDaisy[i]) continue;
    cells.push(i);
  }
  let best = null;
  const consider = (F) => {
    let par = Infinity;
    let n = 0;
    let pick = null;
    for (const x of sols) {
      if (x.size > par) continue;
      if (!F.every((c) => x.cells.has(c))) continue;
      if (x.size < par) {
        par = x.size;
        n = 1;
        pick = x;
      } else n++;
    }
    if (pick === null) return;
    if (par < R.par[0] || par > R.par[1]) return;
    const score = par * 10 - n * 5 + (par > min1 ? 6 : 0);
    if (!best || score > best.score) best = { score, F, par, n, pick };
  };
  for (let i = 0; i < cells.length; i++) {
    consider([cells[i]]);
    for (let j = i + 1; j < cells.length; j++) consider([cells[i], cells[j]]);
  }
  if (!best || best.n > 2) continue;
  // Final level: fireflies placed, inventory = what the perfect run uses + one spare arrow.
  const m = L.rows.map((r) => r.split(''));
  for (const c of best.F) m[(c / L.w) | 0][c % L.w] = '*';
  const inv = { arrow: 0, lily: 0, mushroom: 0, daisy: 0 };
  for (const p of best.pick.pieces) inv[['', 'arrow', 'lily', 'mushroom', 'daisy'][p.type]]++;
  inv.arrow += 1;
  const def = { id: 'g', map: m.map((r) => r.join('')), dirs: b.dirs, vanes: b.vanes, inv };
  const L3 = parseLevel(def);
  const check = solve(L3, { fireflies: true, countCap: 3, timeLimitMs: 4000 });
  const check1 = solve(L3, { countCap: 1, timeLimitMs: 4000 });
  if (check.min !== best.par || check.solutions.length > 2 || check1.min === null) continue;
  const fx = features(L3, check.solutions[0]);
  if (R.need && R.need.some((k) => !fx[k])) continue;
  const score = check.min * 10 - check.solutions.length * 4 + fx.wallTurns + fx.shared * 4 + fx.revisit * 3 + (check.min - check1.min) * 2;
  const cand = { score, best: { par: check.min, n: check.solutions.length, sol: check.solutions[0], def }, one: check1.min, fx, L: L3 };
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
