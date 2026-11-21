// Design aid: given a draft level, tries firefly positions and ranks them by
// how interesting the resulting perfect run is (higher par, fewer optimal
// solutions). Usage: node tools/explore-fireflies.mjs draft.mjs <id> [count=1|2]
import { parseLevel, simulate, solve } from './lib.mjs';
import { overlay, describe } from './lib.mjs';

const [file, id, countArg] = process.argv.slice(2);
const mod = await import(new URL(file, 'file://' + process.cwd() + '/').href);
const def = mod.levels.find((d) => d.id === id);
const count = Number(countArg || 1);
const base = { ...def, map: def.map.map((r) => r.replace(/\*/g, '.')) };
const L0 = parseLevel(base);
const win = solve(L0, { countCap: 1 });
console.log(`base: 1★ min ${win.min}`);
const cells = [];
for (let y = 0; y < L0.h; y++)
  for (let x = 0; x < L0.w; x++) {
    if (base.map[y][x] === '.') cells.push([x, y]);
  }
const results = [];
const withFlies = (list) => {
  const map = base.map.map((r) => r.split(''));
  for (const [x, y] of list) map[y][x] = '*';
  return { ...base, map: map.map((r) => r.join('')) };
};
const combos = [];
if (count === 1) for (const c of cells) combos.push([c]);
else
  for (let i = 0; i < cells.length; i++)
    for (let j = i + 1; j < cells.length; j++) combos.push([cells[i], cells[j]]);
for (const combo of combos) {
  const d = withFlies(combo);
  const L = parseLevel(d);
  const r = solve(L, { fireflies: true, countCap: 4, timeLimitMs: 4000 });
  if (r.min === null) continue;
  results.push({ combo, par: r.min, n: r.solutions.length, sol: r.solutions[0], L });
}
results.sort((a, b) => b.par - a.par || a.n - b.n);
for (const r of results.slice(0, Number(process.env.TOP || 6))) {
  console.log(`fireflies ${r.combo.map((c) => c.join(',')).join(' ')} → par ${r.par} (${r.n}${r.n >= 4 ? '+' : ''} sol)  ${r.sol.map((p) => describe(p, r.L)).join(', ')}`);
  console.log(overlay(r.L, r.sol));
}
