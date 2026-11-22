// Builds src/data/daily.js: the pool of "Défi du jour" puzzles.
// Candidates come from tools/generate.mjs runs (text files); this script keeps
// only coherent boards whose perfect solution is unique, re-proves every one
// with the solver, and stores par + solution for stars and hints.
//
// Usage: node tools/build-daily.mjs [--only theme,theme] <candidates-dir>...
// With --only, the other worlds keep their current puzzles (so every past day
// keeps its puzzle); new entries join map rows with '|' ('/' is a mirror).
import fs from 'node:fs';
import path from 'node:path';
import { parseLevel, simulate, ORIENTED, PIECE_KINDS } from '../src/engine/core.js';
import { solve } from '../src/engine/solver.js';
import { allLevels } from '../src/data/levels.js';

const args = process.argv.slice(2);
const onlyAt = args.indexOf('--only');
const only = onlyAt >= 0 ? args.splice(onlyAt, 2)[1].split(',') : null;
const dirs = args;
const PER_THEME = 61;
const THEME_OF = (file) => {
  const f = path.basename(file);
  if (f.startsWith('meadow')) return 'meadow';
  if (f.startsWith('pond')) return 'pond';
  if (f.startsWith('grove')) return 'grove';
  if (f.startsWith('ruins')) return 'ruins';
  if (f.startsWith('gloom')) return 'gloom';
  if (f.startsWith('peak')) return 'peak';
  if (f.startsWith('dawn')) return 'dawn';
  return null;
};

const campaign = new Set(allLevels().map((d) => parseLevel(d).rows.join('/')));
const pools = {};
const seen = new Set();

function coherence(map) {
  const H = map.length;
  const at = (x, y) => (map[y] || '')[x] || ' ';
  const visited = new Set();
  let puddles = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < map[y].length; x++) {
      if (at(x, y) !== '~' || visited.has(x + ',' + y)) continue;
      let size = 0;
      const st = [[x, y]];
      visited.add(x + ',' + y);
      while (st.length) {
        const [cx, cy] = st.pop();
        size++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = cx + dx + ',' + (cy + dy);
          if (at(cx + dx, cy + dy) === '~' && !visited.has(k)) {
            visited.add(k);
            st.push([cx + dx, cy + dy]);
          }
        }
      }
      if (size < 3) puddles++;
    }
  const flat = map.join('');
  const walls = (flat.match(/#/g) || []).length;
  const cells = (flat.match(/[^ ]/g) || []).length;
  return { puddles, wallRatio: walls / Math.max(1, cells), cells };
}

for (const dir of dirs) {
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.txt')) continue;
    const theme = THEME_OF(f);
    if (!theme || (only && !only.includes(theme))) continue;
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const b of txt.split(/\n(?=score )/)) {
      const m = b.match(/score (-?\d+)\s+★min (\d+)\s+par (\d+) \((\d+) sol\)\s+turns (\d+) shared (\d+) revisit (\d+) uses (\{[^}]*\})/);
      if (!m) continue;
      const [, , min, par, n, turns, shared, revisit, uses] = m;
      if (+n !== 1 || +par < 4 || +par > 6) continue;
      const line = b.split('\n')[1] || '';
      const mapM = line.match(/map:(\[[^\]]*\])/);
      const dirsM = line.match(/dirs:(\{[^}]*\})/);
      if (!mapM || !dirsM) continue;
      let map;
      let dirsObj;
      try {
        map = JSON.parse(mapM[1]);
        dirsObj = JSON.parse(dirsM[1]);
      } catch {
        continue; // a block still being written
      }
      const c = coherence(map);
      if (c.puddles > 0 || c.wallRatio > 0.2 || c.cells < 20) continue;
      const def = { id: 'daily', map, dirs: dirsObj, inv: {} };
      const vm = line.match(/vanes:'(\w*)'/);
      if (vm) def.vanes = vm[1];
      const u = JSON.parse(uses);
      // What the perfect run uses, plus one spare piece of the world's main kind.
      def.inv = Object.fromEntries(PIECE_KINDS.map((k) => [k, u[k] || 0]));
      def.inv[theme === 'dawn' ? 'mirror' : 'arrow'] += 1;
      let key;
      try {
        key = parseLevel(def).rows.join('/');
      } catch {
        continue;
      }
      if (campaign.has(key) || seen.has(key)) continue;
      seen.add(key);
      const q = +par * 6 + +turns + +shared * 5 + +revisit * 4 + (+par - +min) * 2;
      (pools[theme] ||= []).push({ def, q, par: +par });
    }
  }
}

// Deterministic shuffle so that consecutive days mix easier and harder puzzles.
function shuffle(arr, seed) {
  let s = seed >>> 0;
  const rnd = () => ((s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0) / 4294967296);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const out = only ? { ...(await import('../src/data/daily.js')).DAILY } : {};
for (const [theme, list] of Object.entries(pools)) {
  list.sort((a, b) => b.q - a.q);
  const kept = [];
  for (const c of list) {
    if (kept.length >= PER_THEME) break;
    const L = parseLevel(c.def);
    if (simulate(L, []).result === 'win') continue;
    const best = solve(L, { fireflies: true, countCap: 2, timeLimitMs: 8000 });
    const one = solve(L, { countCap: 1, timeLimitMs: 8000 });
    if (best.timedOut || one.timedOut || best.min === null || best.solutions.length !== 1) continue;
    const sol = best.solutions[0].map((p) => `${p.idx}.${p.type}.${ORIENTED[p.type] ? p.dir : 0}`).join(',');
    const d = Object.entries(c.def.dirs)
      .map(([k, v]) => k + v)
      .join(' ');
    const inv = PIECE_KINDS.map((k) => c.def.inv[k] || 0).join('');
    kept.push([L.rows.join('|'), d, c.def.vanes || '', inv, best.min, one.min, sol]);
  }
  out[theme] = shuffle(kept, theme.length * 7919);
  console.log(`${theme}: ${kept.length} puzzles (from ${list.length} candidates)`);
}

const body = `// Generated by tools/build-daily.mjs — the "Défi du jour" pool.
// Each entry: [map rows joined by "|" (older entries: "/"), directions, weathervanes,
// inventory digits (arrows lilies mushrooms daisies mirrors), par, fewest pieces to
// win, perfect layout "cell.type.dir,...". Every puzzle is proven to have exactly
// one perfect layout.
export const DAILY = ${JSON.stringify(out)};
`;
fs.writeFileSync(new URL('../src/data/daily.js', import.meta.url), body);
console.log(`src/data/daily.js: ${(body.length / 1024).toFixed(0)} KB`);
