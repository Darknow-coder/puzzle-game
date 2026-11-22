import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAILY } from '../src/data/daily.js';
import { dailyFor, recordDaily, liveStreak, dayKey, decodeEntry } from '../src/daily.js';
import { parseLevel, simulate } from '../src/engine/core.js';
import { checkSolution } from '../src/engine/solver.js';

const THEMES = ['meadow', 'pond', 'grove', 'ruins', 'gloom', 'peak'];

test('every daily puzzle decodes, is not trivial and its stored layout is perfect', () => {
  let n = 0;
  for (const theme of THEMES) {
    assert.ok(DAILY[theme]?.length >= 30, `${theme} pool too small`);
    for (const e of DAILY[theme]) {
      const d = decodeEntry(e, theme, 'x');
      const L = parseLevel(d.def);
      assert.notEqual(simulate(L, []).result, 'win', `${theme} trivial`);
      const sol = d.solution.sol.map(([idx, type, dir]) => ({ idx, type, dir }));
      const c = checkSolution(L, sol);
      assert.ok(c.ok && c.sim.allFireflies, `${theme} stored layout fails`);
      assert.equal(sol.length, d.solution.par);
      n++;
    }
  }
  assert.ok(n >= 300, `only ${n} daily puzzles`);
});

test('the daily puzzle depends only on the date and the opened worlds', () => {
  const day = new Date(2026, 10, 22);
  const a = dailyFor(['meadow', 'pond'], day);
  const b = dailyFor(['meadow', 'pond'], new Date(2026, 10, 22, 23, 59));
  assert.deepEqual(a.def.map, b.def.map);
  assert.equal(a.key, '2026-11-22');
  const next = dailyFor(['meadow', 'pond'], new Date(2026, 10, 23));
  assert.notDeepEqual(next.def.map, a.def.map);
  const beginner = dailyFor(['meadow'], day);
  assert.equal(beginner.theme, 'meadow');
  // A whole year without repeating a puzzle for a player with every world open.
  const seen = new Set();
  for (let i = 0; i < 360; i++) seen.add(dailyFor(THEMES, new Date(2026, 0, 1 + i)).def.map.join('/'));
  assert.equal(seen.size, 360);
});

test('streaks grow on consecutive days and break after a gap', () => {
  let s = recordDaily(null, '2026-11-20', 2, new Date(2026, 10, 20));
  s = recordDaily(s, '2026-11-21', 3, new Date(2026, 10, 21));
  s = recordDaily(s, '2026-11-21', 1, new Date(2026, 10, 21));
  assert.equal(s.streak, 2);
  assert.equal(s.results['2026-11-21'], 3, 'best stars are kept');
  assert.equal(liveStreak(s, new Date(2026, 10, 22)), 2, 'still alive the next day');
  assert.equal(liveStreak(s, new Date(2026, 10, 24)), 0, 'broken after a missed day');
  s = recordDaily(s, '2026-11-24', 1, new Date(2026, 10, 24));
  assert.equal(s.streak, 1);
  assert.equal(s.best, 2);
  assert.equal(dayKey(new Date(2026, 0, 5)), '2026-01-05');
});
