// The books of énigmes: every puzzle is solvable with its stored perfect layout,
// catches every firefly, and never repeats a campaign level or a daily puzzle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ENIGMAS } from '../src/data/enigmas.js';
import { WORLDS } from '../src/data/levels.js';
import { findEnigma, enigmaId, packSize, isEnigma } from '../src/enigmas.js';
import { parseLevel, simulate } from '../src/engine/core.js';
import { DAILY } from '../src/data/daily.js';
import { allLevels } from '../src/data/levels.js';

test('every world has its book, and every puzzle is solved by its perfect layout', () => {
  let total = 0;
  WORLDS.forEach((w, wi) => {
    const n = packSize(w.id);
    assert.equal(n, 20, `${w.id}: ${n} énigmes`);
    for (let i = 0; i < n; i++) {
      const id = enigmaId(wi, i);
      assert.ok(isEnigma(id));
      const e = findEnigma(id, WORLDS);
      const L = parseLevel(e.def);
      const placements = e.solution.sol.map(([idx, type, dir]) => ({ idx, type, dir }));
      const run = simulate(L, placements);
      assert.equal(run.result, 'win', `${id} is solved by its layout`);
      assert.equal(run.allFireflies, true, `${id}: every firefly`);
      assert.equal(placements.length, e.solution.par, `${id}: par`);
      assert.ok(e.solution.par >= 5, `${id} is hard enough (par ${e.solution.par})`);
      total++;
    }
  });
  assert.equal(total, 160, `${total} énigmes in all`);
});

test('no énigme repeats a campaign level or a daily puzzle', () => {
  const rows = (s) => s.split(s.includes('|') ? '|' : '/').join('/');
  const known = new Set(allLevels().map((d) => parseLevel(d).rows.join('/')));
  for (const list of Object.values(DAILY)) for (const e of list) known.add(rows(e[0]));
  const seen = new Set();
  for (const list of Object.values(ENIGMAS)) {
    for (const e of list) {
      const k = rows(e[0]);
      assert.ok(!known.has(k) && !seen.has(k));
      seen.add(k);
    }
  }
});
