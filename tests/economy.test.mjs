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
  assert.deepEqual(giftFor(1), { coins: 15, hints: 0 });
  assert.deepEqual(giftFor(7), { coins: 80, hints: 1 });
  assert.deepEqual(giftFor(9), { coins: 80, hints: 0 });
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
  const r5 = W.buy('hint5');
  assert.ok(r5.ok && r5.item.id === 'hint5' && r5.price === 85);
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
  assert.deepEqual([w.log[0].k, w.log[0].id, w.log[0].n], ['buy', 'rainbow', -650], 'newest first');
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
  assert.deepEqual(a, { coins: 15, hints: 0, day: 1 });
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

// ------------------------------------------------------------------ 3.2

import { COSMETICS, ODDS, MILESTONES, DEFAULTS } from '../src/data/cosmetics.js';
import { drawChest, pickOffer, offerPrice, CHEST_PRICE, CHEST_PITY } from '../src/economy.js';
import { HATS_INFO } from '../src/data/meta.js';

const seeded = (seed) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0) / 4294967296);
};

test('the catalogue: unique ids across slots, prices growing with rarity, odds summing to 100', () => {
  assert.equal(new Set(COSMETICS.map((c) => c.id)).size, COSMETICS.length);
  assert.equal(Object.values(ODDS).reduce((a, b) => a + b, 0), 100);
  const max = { common: 0, rare: 0, epic: 0, legendary: 0 };
  const min = { common: 1e9, rare: 1e9, epic: 1e9, legendary: 1e9 };
  for (const c of COSMETICS) {
    max[c.rarity] = Math.max(max[c.rarity], c.price);
    min[c.rarity] = Math.min(min[c.rarity], c.price);
  }
  assert.ok(max.common < min.rare && max.rare < min.epic && max.epic < min.legendary, 'a rarer item always costs more');
  for (const slot of Object.keys(DEFAULTS)) assert.ok(COSMETICS.some((c) => c.slot === slot), slot);
  assert.ok(HATS_INFO.some((h) => h.id === 'collector'), 'the collector crown is a hat');
});

test('the chest never gives an owned item, follows the odds and keeps its promise', () => {
  const rng = seeded(7);
  const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
  for (let i = 0; i < 20000; i++) counts[drawChest(COSMETICS, rng).rarity]++;
  for (const r of Object.keys(ODDS)) assert.ok(Math.abs(counts[r] / 200 - ODDS[r]) < 1.5, `${r}: ${counts[r] / 200} % instead of ${ODDS[r]} %`);
  const onlyCommons = COSMETICS.filter((c) => c.rarity === 'common');
  assert.equal(drawChest(onlyCommons, rng, true).rarity, 'common', 'no epic left: the guarantee falls back on what remains');
  assert.ok(['epic', 'legendary'].includes(drawChest(COSMETICS, rng, true).rarity));
  assert.equal(drawChest([], rng), null);

  fresh();
  const w = W.wallet();
  w.coins = 1e6;
  let sinceHigh = 0;
  const got = new Set();
  for (let i = 0; i < COSMETICS.length; i++) {
    const r = W.openChest(seeded(100 + i));
    assert.ok(r.ok, 'opens while something is left');
    assert.ok(!got.has(r.item.id), 'no duplicates');
    got.add(r.item.id);
    const high = r.item.rarity === 'epic' || r.item.rarity === 'legendary';
    sinceHigh = high ? 0 : sinceHigh + 1;
    assert.ok(sinceHigh < CHEST_PITY || !COSMETICS.some((c) => !got.has(c.id) && (c.rarity === 'epic' || c.rarity === 'legendary')), 'an epic at least every six chests');
  }
  assert.deepEqual(W.openChest(), { ok: false, why: 'empty' });
  assert.equal(w.coins, 1e6 - COSMETICS.length * CHEST_PRICE + MILESTONES.reduce((s, m) => s + m.coins, 0));
  assert.ok(W.owns('collector'), 'the full collection gives the crown');
});

test('the daily offer is the same all day, discounted, and stays put once bought', () => {
  fresh();
  const day = new Date(2026, 10, 22, 8);
  const later = new Date(2026, 10, 22, 23);
  const a = W.offer(day);
  assert.equal(W.offer(later).item.id, a.item.id);
  assert.equal(a.price, offerPrice(a.item.price));
  assert.ok(a.price < a.item.price);
  W.earn(2000, 'win');
  const coins = W.wallet().coins;
  const r = W.buy(a.item.id, later);
  assert.ok(r.ok && r.price === a.price && W.wallet().coins === coins - a.price);
  assert.equal(W.offer(later).bought, true, 'still today’s offer, marked bought');
  assert.notEqual(W.offer(new Date(2026, 10, 23, 9)).item.id, a.item.id, 'tomorrow: something else');
  assert.ok(pickOffer(5, () => true) === null, 'nothing to offer when everything is owned');
});

test('looks: one for all, or one each; only owned things can be worn', () => {
  fresh();
  assert.equal(W.wear('hat', 'tophat'), false);
  W.earn(5000, 'win');
  W.buy('tophat');
  W.buy('shades');
  assert.ok(W.wear('hat', 'tophat'));
  assert.deepEqual([0, 1, 2, 3].map((c) => W.look(c).hat), ['tophat', 'tophat', 'tophat', 'tophat']);
  W.setSame(false);
  assert.ok(W.wear('glasses', 'shades', 2));
  assert.deepEqual([0, 1, 2, 3].map((c) => W.look(c).glasses), ['none', 'none', 'shades', 'none'], 'only Lou');
  assert.ok(W.wear('flame', 'classic', 1), 'defaults are always available');
  assert.ok(W.wear('trail', 'classic') && W.wallet().trail === 'classic');
  assert.equal(W.wear('party', 'fireworks'), false);
  W.setSame(true);
  assert.equal(W.look(3).glasses, 'none', 'back to one look: everyone dresses like Pip');
});

test('collection milestones pay once; a 3.1 wallet is upgraded without losing anything', () => {
  fresh();
  const w = W.wallet();
  w.coins = 1e6;
  const quarter = Math.ceil(COSMETICS.length * 0.25);
  const ids = COSMETICS.map((c) => c.id);
  let paid = [];
  for (let i = 0; i < quarter; i++) paid = paid.concat(W.buy(ids[i]).milestones);
  assert.deepEqual(paid.map((m) => m.pct), [25]);
  assert.deepEqual(W.claimMilestones(), [], 'only once');
  // A wallet saved by version 3.1: hat in the save, trails owned, no looks.
  fresh();
  save.data.hat = 'beret';
  save.data.wallet = { coins: 50, hints: 2, earned: 400, spent: 350, hintsUsed: 1, log: [], gift: { day: null, streak: 0 }, owned: { beret: 1, sparkle: 1 }, trail: 'sparkle', welcome: 0 };
  const up = W.wallet();
  assert.equal(W.look(1).hat, 'beret');
  assert.equal(up.trail, 'sparkle');
  assert.equal(up.party, 'classic');
  assert.ok(W.owns('beret') && W.owns('sparkle'));
});
