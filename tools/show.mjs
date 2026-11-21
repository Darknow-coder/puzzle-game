// Prints a level, its stored perfect solution and what each walker does.
import { allLevels } from '../src/data/levels.js';
import { SOLUTIONS } from '../src/data/solutions.js';
import { parseLevel, simulate, KIND, LUMI_NAMES } from '../src/engine/core.js';
import { overlay } from './lib.mjs';

for (const id of process.argv.slice(2)) {
  const def = allLevels().find((d) => d.id === id);
  const L = parseLevel(def);
  const sol = SOLUTIONS[id].sol.map(([idx, type, dir]) => ({ idx, type, dir }));
  console.log(`== ${id} ${def.name.fr} — ${def.intent}`);
  console.log(overlay(L, sol));
  const sim = simulate(L, sol, { record: true });
  L.walkers.forEach((w, i) => {
    const name = w.kind === KIND.LUMI ? LUMI_NAMES[w.color] : 'Gloomnib';
    const steps = [];
    for (let t = 1; t < sim.frames.length; t++) {
      const m = sim.frames[t].moves[i];
      const ev = sim.frames[t].events.filter((e) => e.id === i && e.type !== 'turn').map((e) => e.type);
      if (m.type === 'none') continue;
      steps.push(`${m.type === 'jump' ? '^' : m.type === 'wait' ? 'w' : ''}${m.x},${m.y}${ev.length ? '[' + ev.join(',') + ']' : ''}${m.outcome && m.outcome !== 'home' ? '!' + m.outcome : ''}`);
    }
    console.log(`  ${name}: ${steps.join(' ')}`);
  });
}
