// Ranks generator output: node tools/pick.mjs <file> [parMin] [parMax] [top]
import fs from 'node:fs';
const [file, pmin = 0, pmax = 99, top = 8] = process.argv.slice(2);
const txt = fs.readFileSync(file, 'utf8');
const blocks = txt.split(/\n(?=score )/).filter((b) => b.startsWith('score'));
const items = [];
for (const b of blocks) {
  const m = b.match(/score (-?\d+)\s+★min (\d+)\s+par (\d+) \((\d+) sol\)\s+turns (\d+) shared (\d+) revisit (\d+) uses (\{[^}]*\}) events (\{[^}]*\})/);
  if (!m) continue;
  const [, score, min, par, n, turns, shared, revisit, uses, events] = m;
  const lines = b.split('\n');
  const def = lines[1];
  const ev = JSON.parse(events);
  const it = { score: +score, min: +min, par: +par, n: +n, turns: +turns, shared: +shared, revisit: +revisit, uses: JSON.parse(uses), ev, def, body: lines.slice(2).join('\n') };
  const mapStr = (def.match(/map:(\[[^\]]*\])/) || [])[1];
  const map = mapStr ? JSON.parse(mapStr) : [];
  const flat = map.join('');
  const walls = (flat.match(/#/g) || []).length;
  const cells = (flat.match(/[^ ]/g) || []).length;
  // Terrain coherence: water should form a few sizeable ponds, not puddles.
  const H = map.length;
  const W = Math.max(...map.map((r) => r.length));
  const at = (x, y) => (map[y] || '')[x] || ' ';
  const seen = new Set();
  let comps = 0;
  let small = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (at(x, y) !== '~' || seen.has(x + ',' + y)) continue;
      comps++;
      let size = 0;
      const st = [[x, y]];
      seen.add(x + ',' + y);
      while (st.length) {
        const [cx, cy] = st.pop();
        size++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (at(nx, ny) === '~' && !seen.has(nx + ',' + ny)) {
            seen.add(nx + ',' + ny);
            st.push([nx, ny]);
          }
        }
      }
      if (size < 3) small++;
    }
  it.waterComps = comps;
  it.puddles = small;
  it.q = -small * 4 - Math.max(0, comps - 2) * 3 + it.par * 6 + it.turns * 1.0 + it.shared * 5 + it.revisit * 4 - (it.n - 1) * 6 + (it.par - it.min) * 2 - Math.max(0, walls / cells - 0.15) * 40 + Object.keys(ev).length;
  if (it.par >= +pmin && it.par <= +pmax) items.push(it);
}
items.sort((a, b) => b.q - a.q);
console.log(`${items.length} candidates in range`);
for (const it of items.slice(0, +top)) {
  console.log(`\nq ${it.q.toFixed(1)} | ponds ${it.waterComps} puddles ${it.puddles} | ★min ${it.min} par ${it.par} (${it.n}) turns ${it.turns} shared ${it.shared} revisit ${it.revisit} uses ${JSON.stringify(it.uses)} ev ${JSON.stringify(it.ev)}`);
  console.log(it.def);
  console.log(it.body.trim());
}
