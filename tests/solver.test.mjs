// Cross-checks the pruned solver against a naive brute force on hundreds of
// tiny random boards that use every mechanic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, simulate, canPlace, PIECE } from '../src/engine/core.js';
import { solve } from '../src/engine/solver.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0;
    s ^= s >>> 12;
    return (s >>> 0) / 4294967296;
  };
}

function randomLevel(seed) {
  const r = rng(seed);
  const w = 3 + Math.floor(r() * 3);
  const h = 3 + Math.floor(r() * 2);
  const cells = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      const p = r();
      row.push(p < 0.08 ? ' ' : p < 0.18 ? '#' : p < 0.26 ? '~' : '.');
    }
    cells.push(row);
  }
  const free = () => {
    for (let k = 0; k < 50; k++) {
      const x = Math.floor(r() * w);
      const y = Math.floor(r() * h);
      if (cells[y][x] === '.') return [x, y];
    }
    return null;
  };
  const put = (ch) => {
    const p = free();
    if (p) cells[p[1]][p[0]] = ch;
    return !!p;
  };
  const dirs = { a: '', b: '', G: '' };
  const D = 'NESW';
  if (!put('a')) return null;
  dirs.a = D[Math.floor(r() * 4)];
  if (!put('A')) return null;
  if (r() < 0.3) {
    if (!put('b') || !put('B')) return null;
    dirs.b = D[Math.floor(r() * 4)];
  }
  const extras = ['*', '*', 'm', 'f', '>', 'v', '1', 'P', 'H', 'G', 'Z', 'o', 'o', 'R', '@'];
  const nx = Math.floor(r() * 4);
  let vanes = '';
  for (let k = 0; k < nx; k++) {
    const e = extras[Math.floor(r() * extras.length)];
    if (e === '@') {
      if (cells.flat().includes('@')) continue;
      put('@');
      put('@');
    } else if (e === '1') {
      if (!cells.flat().includes('1')) put('1');
    } else if (e === 'G') {
      if (put('G')) dirs.G += D[Math.floor(r() * 4)];
    } else if (e === 'R') {
      if (put('R')) vanes += D[Math.floor(r() * 4)];
    } else put(e);
  }
  const map = cells.map((row) => row.join(''));
  if (map.join('').split('@').length === 2) return null;
  const inv = { arrow: 1 + Math.floor(r() * 2), lily: r() < 0.5 ? 1 : 0, mushroom: r() < 0.3 ? 1 : 0, daisy: r() < 0.3 ? 1 : 0 };
  const d = {};
  for (const k of Object.keys(dirs)) if (dirs[k]) d[k] = dirs[k];
  try {
    return parseLevel({ id: 'r' + seed, map, dirs: d, inv, vanes });
  } catch {
    return null;
  }
}

function brute(L, maxK, wantFireflies) {
  const n = L.w * L.h;
  const opts = [];
  for (let i = 0; i < n; i++) {
    for (const t of [PIECE.ARROW, PIECE.LILY, PIECE.MUSHROOM, PIECE.DAISY]) {
      if (!canPlace(L, i, t)) continue;
      const key = ['', 'arrow', 'lily', 'mushroom', 'daisy'][t];
      if (!L.inventory[key]) continue;
      if (t === PIECE.ARROW) for (let d = 0; d < 4; d++) opts.push({ idx: i, type: t, dir: d, key });
      else opts.push({ idx: i, type: t, dir: 0, key });
    }
  }
  const ok = (sim) => sim.result === 'win' && (!wantFireflies || sim.allFireflies);
  for (let k = 0; k <= maxK; k++) {
    let found = false;
    const pick = [];
    const rec = (start) => {
      if (found) return;
      if (pick.length === k) {
        const used = {};
        const cells = new Set();
        for (const p of pick) {
          if (cells.has(p.idx)) return;
          cells.add(p.idx);
          used[p.key] = (used[p.key] || 0) + 1;
          if (used[p.key] > L.inventory[p.key]) return;
        }
        if (ok(simulate(L, pick))) found = true;
        return;
      }
      for (let i = start; i < opts.length; i++) {
        pick.push(opts[i]);
        rec(i + 1);
        pick.pop();
      }
    };
    rec(0);
    if (found) return k;
  }
  return null;
}

test('pruned solver agrees with brute force on random tiny levels', () => {
  let checked = 0;
  let solvable = 0;
  for (let seed = 1; checked < 500 && seed < 20000; seed++) {
    const L = randomLevel(seed);
    if (!L) continue;
    const total = L.inventory.arrow + L.inventory.lily + L.inventory.mushroom + L.inventory.daisy;
    const maxK = Math.min(3, total);
    for (const ff of [false, true]) {
      const b = brute(L, maxK, ff);
      const s = solve(L, { fireflies: ff, maxPieces: maxK, timeLimitMs: 20000 });
      assert.equal(s.timedOut, false);
      assert.equal(s.min, b, `seed ${seed} fireflies=${ff}\n${L.def.map.join('\n')}`);
      if (b !== null) solvable++;
    }
    checked++;
  }
  assert.ok(checked >= 400);
  assert.ok(solvable > 150, `only ${solvable} solvable cases`);
});
