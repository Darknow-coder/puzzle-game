import { test } from 'node:test';
import assert from 'node:assert/strict';
import { START, REWARD, CATALOG, HINT_PRICE, winReward, dailyReward, giftFor, retroGrant } from '../src/economy.js';
import { save, resetSave } from '../src/save.js';
import * as W from '../src/wallet.js';

const fresh = () => {
  resetSave();
  delete save.data.wallet;
};

test('wins pay for firsts only: first clear, new stars, shooting stars, worlds', () => {
  assert.deepEqual(winReward({ firstClear: true, prevStars: 0, stars: 3 }).total, REWARD.firstClear + 3 * REWARD.star);
  assert.equal(winReward({ firstClear: false, prevStars: 3, stars: 3 }).total, 0, 'a replay with the same stars pays nothing');
  assert.equal(winReward({ firstClear: false, prevStars: 1, stars: 3 }).total, 2 * REWARD.star, 'only the new stars');
  assert.equal(winReward({ firstClear: false, prevStars: 3, stars: 1 }).total, 0, 'fewer stars never cost anything');
  const b = winReward({ firstClear: true, bonus: true, prevStars: 0, stars: 2, worldDone: true });
  assert.deepEqual(b.lines.map((l) => l.key), ['bonusClear', 'stars', 'world']);
  assert.equal(b.total, REWARD.bonusClear + 2 * REWARD.star + REWARD.world);
});

test('the daily puzzle pays more with the streak, up to a cap; gifts grow for a week', () => {
  assert.equal(dailyReward(1).total, REWARD.daily);
  assert.equal(dailyReward(3).total, REWARD.daily + 2 * REWARD.dailyStreak);
  assert.equal(dailyReward(40).total, REWARD.daily + REWARD.dailyStreakMax);
  assert.deepEqual(giftFor(1), { coins: 10, hints: 0 });
  assert.deepEqual(giftFor(7), { coins: 60, hints: 1 });
  assert.deepEqual(giftFor(9), { coins: 60, hints: 0 });
  assert.equal(giftFor(14).hints, 1);
});

test('the catalogue is consistent: unique ids, packs cheaper than single hints', () => {
  assert.equal(new Set(CATALOG.map((c) => c.id)).size, CATALOG.length);
  for (const c of CATALOG) assert.ok(c.price > 0 && Number.isInteger(c.price), c.id);
  const packs = CATALOG.filter((c) => c.kind === 'hints');
  assert.ok(packs.find((p) => p.qty === 1).price === HINT_PRICE);
  for (const p of packs) assert.ok(p.price / p.qty <= HINT_PRICE, `${p.id} is not a deal`);
  const perHint = packs.map((p) => p.price / p.qty);
  assert.deepEqual([...perHint].sort((a, b) => b - a), perHint, 'bigger packs, lower unit price');
});

test('a new player starts with a little purse; earning, spending and buying', () => {
  fresh();
  const w = W.wallet();
  assert.equal(w.coins, START.coins);
  assert.equal(w.hints, START.hints);
  assert.equal(w.welcome, 0, 'nothing to announce to a new player');
  W.earn(100, 'win', '1-1');
  assert.equal(w.coins, START.coins + 100);
  assert.equal(W.spend(1000, 'buy'), false, 'no debt');
  assert.deepEqual(W.buy('hint5'), { ok: true, item: CATALOG.find((c) => c.id === 'hint5') });
  assert.equal(w.hints, START.hints + 5);
  assert.equal(w.coins, START.coins + 100 - 85);
  W.earn(500, 'win');
  assert.ok(W.buy('beret').ok);
  assert.deepEqual(W.buy('beret'), { ok: false, why: 'owned' });
  const before = w.coins;
  const r = W.buy('tophat');
  if (before < 260) assert.deepEqual(r, { ok: false, why: 'coins', missing: 260 - before });
  assert.equal(W.setTrail('rainbow'), false, 'a trail must be owned first');
  W.earn(1000, 'win');
  assert.ok(W.buy('rainbow').ok);
  assert.ok(W.setTrail('rainbow'));
  assert.equal(w.trail, 'rainbow');
  assert.deepEqual([w.log[0].k, w.log[0].id, w.log[0].n], ['buy', 'rainbow', -280], 'newest first');
  assert.ok(w.earned - w.spent === w.coins, 'the books balance');
});

test('hint tokens are used one by one, then bought on the spot', () => {
  fresh();
  const w = W.wallet();
  for (let i = 0; i < START.hints; i++) assert.ok(W.useHint());
  assert.equal(W.useHint(), false);
  const coins = w.coins;
  assert.ok(W.buyAndUseHint());
  assert.equal(w.coins, coins - HINT_PRICE);
  w.coins = HINT_PRICE - 1;
  assert.equal(W.buyAndUseHint(), false);
  assert.equal(w.hintsUsed, START.hints + 1);
});

test('the daily gift opens once a day and grows on consecutive days', () => {
  fresh();
  const day = (d) => new Date(2026, 10, d, 9);
  const a = W.claimGift(day(20));
  assert.deepEqual(a, { coins: 10, hints: 0, day: 1 });
  assert.equal(W.claimGift(day(20)), null, 'once a day');
  assert.equal(W.giftState(day(20)).available, false);
  assert.equal(W.claimGift(day(21)).day, 2);
  assert.equal(W.claimGift(day(23)).day, 1, 'a missed day starts again');
  for (let d = 24; d <= 29; d++) W.claimGift(day(d));
  assert.equal(W.wallet().gift.streak, 7);
  assert.ok(W.wallet().hints >= START.hints + 1, 'the seventh day brings a hint');
});

test('players from before the shop get what their progress is worth, announced once', () => {
  fresh();
  save.data.levels = { '1-1': { done: true, stars: 3 }, '1-2': { done: true, stars: 1 }, '1-B': { done: true, stars: 2 }, '1-3': { tries: 4 } };
  save.data.achievements = { first: 1, perfect1: 1 };
  save.data.daily = { results: { '2026-11-20': 3 }, streak: 1, best: 1, last: '2026-11-20' };
  const expected = retroGrant({ levels: save.data.levels, bonusIds: new Set(['1-B']), worldsDone: 0, achievements: 2, dailies: 1 });
  assert.equal(expected, 10 + 15 + 10 + 5 + 40 + 10 + 2 * 30 + 15);
  const w = W.wallet();
  assert.equal(w.coins, START.coins + expected);
  assert.equal(W.takeWelcome(), expected);
  assert.equal(W.takeWelcome(), 0, 'announced only once');
});
