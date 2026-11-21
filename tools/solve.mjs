// Usage:
//   node tools/solve.mjs                 analyse every level of the campaign
//   node tools/solve.mjs 2-4 3-1         analyse some levels
//   node tools/solve.mjs --file x.mjs    analyse the `levels` array exported by a draft file
import { analyse, report } from './lib.mjs';
import { allLevels } from '../src/data/levels.js';

const args = process.argv.slice(2);
let defs;
const fi = args.indexOf('--file');
if (fi >= 0) {
  const mod = await import(new URL(args[fi + 1], 'file://' + process.cwd() + '/').href);
  defs = mod.levels;
  const ids = args.filter((a, i) => i !== fi && i !== fi + 1);
  if (ids.length) defs = defs.filter((d) => ids.includes(d.id));
} else {
  defs = allLevels();
  if (args.length) defs = defs.filter((d) => args.includes(d.id));
}
for (const def of defs) {
  try {
    console.log(report(def, analyse(def)));
  } catch (e) {
    console.log(`■ ${def.id}: ERROR ${e.message}`);
  }
}
