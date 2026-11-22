// Fills the tables at the end of firestore.rules from the game's data: for every
// campaign level and every daily puzzle, the fewest pieces to win and the
// fewest pieces for ★★★. The rules use them to refuse impossible results.
//   node tools/build-rules.mjs          rewrite firestore.rules
//   node tools/build-rules.mjs --check  fail if firestore.rules is out of date
import fs from 'node:fs';
import path from 'node:path';
import { SOLUTIONS } from '../src/data/solutions.js';
import { DAILY } from '../src/data/daily.js';
import { WORLDS } from '../src/data/levels.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const file = path.join(root, 'firestore.rules');

const levels = [];
for (const w of WORLDS) {
  for (const lv of [...w.levels, w.bonus]) {
    const s = SOLUTIONS[lv.id];
    if (!s) throw new Error(`no solution for ${lv.id}`);
    levels.push(`${lv.id}:${s.min}:${s.par}`);
  }
}
const daily = [];
for (const theme of Object.keys(DAILY).sort()) {
  DAILY[theme].forEach((e, i) => daily.push(`${theme}-${i}:${e[5]}:${e[4]}`));
}

const block = `    // BEGIN TABLES
    function levelTable() {
      return '${levels.join(',')}';
    }
    function dailyTable() {
      return '${daily.join(',')}';
    }
    // END TABLES`;

const src = fs.readFileSync(file, 'utf8');
const out = src.replace(/ {4}\/\/ BEGIN TABLES[\s\S]*?\/\/ END TABLES/, block);
if (process.argv.includes('--check')) {
  if (out !== src) {
    console.error('firestore.rules is out of date: run node tools/build-rules.mjs');
    process.exit(1);
  }
  console.log(`firestore.rules up to date (${levels.length} levels, ${daily.length} daily puzzles)`);
} else {
  fs.writeFileSync(file, out);
  console.log(`firestore.rules: ${levels.length} levels, ${daily.length} daily puzzles`);
}
