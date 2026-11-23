// Builds src/data/enigmas.js: for each world, 20 "énigmes", harder than the
// campaign and the daily puzzles, ordered from the easiest to the hardest.
// Candidates come from tools/generate.mjs runs of the "…Hard" recipes. Each one
// kept is coherent, unlike any campaign level or daily puzzle, and proven by
// the solver to have exactly one perfect layout.
//
// Usage: node tools/build-enigmas.mjs <candidates-dir>... [--only theme,theme]
import fs from 'node:fs';
import path from 'node:path';
import { parseLevel, simulate, ORIENTED, PIECE_KINDS } from '../src/engine/core.js';
import { solve } from '../src/engine/solver.js';
import { allLevels } from '../src/data/levels.js';
import { DAILY } from '../src/data/daily.js';

const args = process.argv.slice(2);
const onlyAt = args.indexOf('--only');
const only = onlyAt >= 0 ? args.splice(onlyAt, 2)[1].split(',') : null;
const PER_THEME = 20;
const THEMES = ['meadow', 'pond', 'grove', 'ruins', 'gloom', 'peak', 'dawn'];
const themeOf = (f) => THEMES.find((t) => path.basename(f).startsWith(t)) || null;

const known = new Set(allLevels().map((d) => parseLevel(d).rows.join('/')));
for (const list of Object.values(DAILY)) for (const e of list) known.add(e[0].split(e[0].includes('|') ? '|' : '/').join('/'));

function coherence(map) {
  const at = (x, y) => (map[y] || '')[x] || ' ';
  const seen = new Set();
  let puddles = 0;
  for (let y = 0; y < map.length; y++)
    for (let x = 0; x < map[y].length; x++) {
      if (at(x, y) !== '~' || seen.has(x + ',' + y)) continue;
      let size = 0;
      const st = [[x, y]];
      seen.add(x + ',' + y);
      while (st.length) {
        const [cx, cy] = st.pop();
        size++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = cx + dx + ',' + (cy + dy);
          if (at(cx + dx, cy + dy) === '~' && !seen.has(k)) {
            seen.add(k);
            st.push([cx + dx, cy + dy]);
          }
        }
      }
      if (size < 3) puddles++;
    }
  const flat = map.join('');
  return { puddles, wallRatio: (flat.match(/#/g) || []).length / Math.max(1, (flat.match(/[^ ]/g) || []).length), cells: (flat.match(/[^ ]/g) || []).length };
}

const pools = {};
const seenKeys = new Set();
for (const dir of args) {
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.txt')) continue;
    const theme = themeOf(f);
    if (!theme || (only && !only.includes(theme))) continue;
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const b of txt.split(/\n(?=score )/)) {
      const m = b.match(/score (-?\d+)\s+★min (\d+)\s+par (\d+) \((\d+) sol\)\s+turns (\d+) shared (\d+) revisit (\d+) uses (\{[^}]*\})/);
      if (!m) continue;
      const [, , min, par, n, turns, shared, revisit, uses] = m;
      if (+n !== 1 || +par < 5 || +par > 8) continue;
      const line = b.split('\n')[1] || '';
      const mapM = line.match(/map:(\[[^\]]*\])/);
      const dirsM = line.match(/dirs:(\{[^}]*\})/);
      if (!mapM || !dirsM) continue;
      let def;
      try {
        def = { id: 'enigma', map: JSON.parse(mapM[1]), dirs: JSON.parse(dirsM[1]), inv: {} };
      } catch {
        continue;
      }
      const c = coherence(def.map);
      if (c.puddles > 0 || c.wallRatio > 0.22 || c.cells < 24) continue;
      const vm = line.match(/vanes:'(\w*)'/);
      if (vm) def.vanes = vm[1];
      const u = JSON.parse(uses);
      def.inv = Object.fromEntries(PIECE_KINDS.map((k) => [k, u[k] || 0]));
      def.inv[theme === 'dawn' ? 'mirror' : 'arrow'] += 1;
      let key;
      try {
        key = parseLevel(def).rows.join('/');
      } catch {
        continue;
      }
      if (known.has(key) || seenKeys.has(key)) continue;
      seenKeys.add(key);
      // How hard: pieces, path length, shared tiles, revisits, and how far ★★★ is from a plain win.
      const q = +par * 6 + +turns + +shared * 5 + +revisit * 4 + (+par - +min) * 3;
      (pools[theme] ||= []).push({ def, q });
    }
  }
}

const out = only ? { ...(await import('../src/data/enigmas.js')).ENIGMAS } : {};
for (const theme of THEMES) {
  const list = pools[theme];
  if (!list) continue;
  list.sort((a, b) => b.q - a.q);
  const kept = [];
  for (const c of list) {
    if (kept.length >= PER_THEME * 3) break;
    const L = parseLevel(c.def);
    if (simulate(L, []).result === 'win') continue;
    const best = solve(L, { fireflies: true, countCap: 2, timeLimitMs: 15000 });
    const one = solve(L, { countCap: 1, timeLimitMs: 15000 });
    if (best.timedOut || one.timedOut || best.min === null || best.solutions.length !== 1) continue;
    const sol = best.solutions[0].map((p) => `${p.idx}.${p.type}.${ORIENTED[p.type] ? p.dir : 0}`).join(',');
    const d = Object.entries(c.def.dirs).map(([k, v]) => k + v).join(' ');
    const inv = PIECE_KINDS.map((k) => c.def.inv[k] || 0).join('');
    kept.push({ q: c.q, e: [L.rows.join('|'), d, c.def.vanes || '', inv, best.min, one.min, sol] });
  }
  // Easiest first, and a real ramp: picks spread over the proven puzzles, from
  // the lower-middle of the difficulty range up to the very hardest.
  kept.sort((a, b) => a.q - b.q);
  let pick = kept;
  if (kept.length > PER_THEME) {
    const idx = new Set();
    for (let k = 0; k < PER_THEME; k++) idx.add(Math.round((kept.length - 1) * (0.25 + (0.75 * k) / (PER_THEME - 1))));
    for (let i = kept.length - 1; idx.size < PER_THEME && i >= 0; i--) idx.add(i);
    pick = [...idx].sort((a, b) => a - b).map((i) => kept[i]);
  }
  out[theme] = pick.map((k) => k.e);
  console.log(`${theme}: ${out[theme].length} énigmes (${kept.length} proven, ${list.length} candidates), par ${out[theme].map((e) => e[4]).join(' ')}`);
}

const body = `// Generated by tools/build-enigmas.mjs — the books of énigmes, one per world.
// Same entry format as src/data/daily.js: [map rows joined by "|", directions,
// weathervanes, inventory digits (arrows lilies mushrooms daisies mirrors), par,
// fewest pieces to win, perfect layout "cell.type.dir,..."], easiest first.
// Every puzzle is proven to have exactly one perfect layout.
export const ENIGMAS = ${JSON.stringify(out)};
`;
fs.writeFileSync(new URL('../src/data/enigmas.js', import.meta.url), body);
console.log(`src/data/enigmas.js: ${(body.length / 1024).toFixed(0)} KB`);
