// Weekly quests: the week, the draw, progress (without farming), rewards, the chest of the week.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../src/quests.js';

const ctx = { starsLeft: 100, dailyOpen: true, friends: 2 };
const fresh = () => ({ data: {} });
const at = (s) => new Date(s);

test('weeks run from Monday to Sunday', () => {
  const mon = Q.weekNumber(at('2026-11-23T00:01:00'));
  assert.equal(Q.weekNumber(at('2026-11-29T23:59:00')), mon, 'Sunday is the same week');
  assert.equal(Q.weekNumber(at('2026-11-30T00:00:01')), mon + 1, 'next Monday is a new week');
  assert.equal(Q.weekNumber(at('2026-11-22T12:00:00')), mon - 1, 'the Sunday before is the previous week');
  const left = Q.untilNextWeek(at('2026-11-28T12:00:00'));
  assert.equal(Math.round(left / 3600e3), 36);
});

test('three quests a week, the same for everyone who can do them, changing over weeks', () => {
  const seen = new Set();
  for (let w = 0; w < 60; w++) {
    const a = Q.pickQuests(w, ctx);
    assert.equal(a.length, 3);
    assert.equal(new Set(a).size, 3);
    assert.deepEqual(Q.pickQuests(w, ctx), a);
    seen.add(a.join());
  }
  assert.ok(seen.size > 30);
  for (let w = 0; w < 60; w++) {
    const a = Q.pickQuests(w, { starsLeft: 0, dailyOpen: false, friends: 0 });
    assert.ok(!a.some((id) => ['stars', 'daily', 'friend'].includes(id)), 'quests the player cannot do are left out');
    assert.equal(a.length, 3);
  }
});

test('progress: a level counts once per quest, replays do not farm', () => {
  const save = fresh();
  const d = at('2026-11-24T10:00:00');
  const s = Q.weekState(save, ctx, d);
  s.ids = ['levels', 'perfect', 'fireflies'];
  for (let i = 0; i < 4; i++) Q.recordQuest(save, ctx, { type: 'win', board: '1-1', stars: 3, fireflies: 2 }, d);
  let l = Q.questList(save, ctx, 'fr', d);
  assert.deepEqual(l.map((q) => q.have), [1, 1, 8]);
  let done = [];
  for (const b of ['1-2', '1-3', '1-4', '1-5']) done = done.concat(Q.recordQuest(save, ctx, { type: 'win', board: b, stars: 2, fireflies: 1 }, d));
  assert.deepEqual(done.map((q) => q.id), ['levels', 'fireflies']);
  l = Q.questList(save, ctx, 'fr', d);
  assert.equal(l[0].text, 'Réussis 5 niveaux différents');
  assert.ok(l[0].done && !l[1].done && l[2].done);
});

test('rewards: each quest once, then the chest of the week once', () => {
  const save = fresh();
  const d = at('2026-11-24T10:00:00');
  const s = Q.weekState(save, ctx, d);
  s.ids = ['levels', 'nohint', 'daily'];
  assert.equal(Q.claimQuest(save, ctx, 'levels', d), 0, 'not done yet');
  for (const b of ['1-1', '1-2', '1-3', '1-4', '1-5']) Q.recordQuest(save, ctx, { type: 'win', board: b, stars: 1, hint: false }, d);
  for (const day of ['a', 'b', 'c']) Q.recordQuest(save, ctx, { type: 'daily', day }, d);
  assert.equal(Q.toClaim(save, ctx, d), 3);
  assert.equal(Q.claimQuest(save, ctx, 'levels', d), Q.QUEST_REWARD);
  assert.equal(Q.claimQuest(save, ctx, 'levels', d), 0, 'only once');
  assert.equal(Q.bonusReady(save, ctx, d), false);
  Q.claimQuest(save, ctx, 'nohint', d);
  Q.claimQuest(save, ctx, 'daily', d);
  assert.equal(Q.toClaim(save, ctx, d), 1, 'the chest waits');
  assert.equal(Q.takeBonus(save, ctx, d), true);
  assert.equal(Q.takeBonus(save, ctx, d), false);
  assert.equal(Q.toClaim(save, ctx, d), 0);
  // Next week starts over.
  const next = at('2026-12-01T10:00:00');
  assert.equal(Q.questList(save, ctx, 'en', next).every((q) => q.have === 0 && !q.claimed), true);
  assert.equal(Q.bonusReady(save, ctx, next), false);
});
