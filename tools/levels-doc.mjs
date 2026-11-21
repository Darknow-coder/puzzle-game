// Writes docs/LEVELS.md from the campaign data and the solver results.
import fs from 'node:fs';
import { WORLDS } from '../src/data/levels.js';
import { SOLUTIONS } from '../src/data/solutions.js';
import { parseLevel } from '../src/engine/core.js';

let out = `# Les 66 niveaux

Généré par \`node tools/levels-doc.mjs\` à partir de \`src/data/levels.js\` et des résultats du solveur.
« ★ » = nombre minimal de pièces pour terminer, « ★★★ » = nombre minimal pour un parcours parfait
(toutes les lucioles), « sol. » = nombre de dispositions parfaites distinctes (plafonné à 6).

`;
WORLDS.forEach((w, wi) => {
  out += `## Monde ${wi + 1} — ${w.name.fr}\n\n${w.blurb.fr}\n\n| Niveau | Nom | Taille | Pièces | ★ | ★★★ | sol. | Intention |\n|---|---|---|---|---|---|---|---|\n`;
  for (const lv of [...w.levels, w.bonus]) {
    const L = parseLevel(lv);
    const s = SOLUTIONS[lv.id];
    const inv = Object.entries(L.inventory).filter(([, v]) => v).map(([k, v]) => `${v} ${({ arrow: 'flèche', lily: 'nénuphar', mushroom: 'champignon', daisy: 'pâquerette' })[k]}${v > 1 ? 's' : ''}`).join(', ');
    out += `| ${lv.id} | ${lv.name.fr} | ${L.w}×${L.h} | ${inv} | ${s.min} | ${s.par} | ${s.n} | ${lv.intent} |\n`;
  }
  out += '\n';
});
fs.writeFileSync(new URL('../docs/LEVELS.md', import.meta.url), out);
console.log('docs/LEVELS.md written');
