// Éclats (glimmers): the coins of the game. They are earned by playing only,
// never with real money, and spent in the shop on hints and cosmetics. Every
// amount lives here so the whole balance can be read, and tuned, in one place.
//
// Rough balance: a whole campaign played well brings about 3,000 éclats, the
// daily puzzle and gift about 70 more a day, the collection milestones 1,100;
// the 37 cosmetics cost about 10,800 in all (the chest and the daily offer make
// them cheaper) and a hint 15 to 20. Hints stay within easy reach; the collection is
// a long-term goal for players who come back every day.
import { COSMETICS, ODDS, RARITIES } from './data/cosmetics.js';

export const START = { coins: 60, hints: 3 };

export const REWARD = {
  firstClear: 10, // first time a level is finished
  bonusClear: 40, // first time a shooting star is finished
  star: 5, // each star reached for the first time on a level
  world: 60, // all ten levels of a world done
  achievement: 30,
  daily: 15, // the day's puzzle, once per day...
  dailyStreak: 5, // ...plus 5 per day in a row after the first,
  dailyStreakMax: 25, // up to 25.
};

/** Daily gift by days in a row (the seventh day and every seventh after also give a hint). */
export const GIFT = [15, 20, 25, 30, 40, 50, 80];

/** One hint bought on the spot, when none is left. */
export const HINT_PRICE = 20;

export const CATALOG = [
  { id: 'hint1', kind: 'hints', qty: 1, price: 20 },
  { id: 'hint5', kind: 'hints', qty: 5, price: 85 },
  { id: 'hint12', kind: 'hints', qty: 12, price: 180 },
  ...COSMETICS.map((c) => ({ id: c.id, kind: c.slot, rarity: c.rarity, price: c.price })),
];

/** The surprise chest: one cosmetic not owned yet, at random by rarity (odds in data/cosmetics.js). */
export const CHEST_PRICE = 160;
/** At least one epic or legendary every CHEST_PITY chests. */
export const CHEST_PITY = 6;
/** Discount of the daily featured item. */
export const OFFER_OFF = 0.3;

export const offerPrice = (price) => Math.max(5, Math.round((price * (1 - OFFER_OFF)) / 5) * 5);

/**
 * Draws a chest: a rarity first (odds among the rarities still available), then an item of
 * that rarity. `highOnly` keeps epic and legendary items when some are left.
 */
export function drawChest(unowned, rng = Math.random, highOnly = false) {
  let pool = unowned;
  if (highOnly) {
    const hi = unowned.filter((c) => c.rarity === 'epic' || c.rarity === 'legendary');
    if (hi.length) pool = hi;
  }
  if (!pool.length) return null;
  const present = RARITIES.filter((r) => pool.some((c) => c.rarity === r));
  let x = rng() * present.reduce((n, r) => n + ODDS[r], 0);
  let rarity = present[present.length - 1];
  for (const r of present) {
    x -= ODDS[r];
    if (x < 0) {
      rarity = r;
      break;
    }
  }
  const items = pool.filter((c) => c.rarity === rarity);
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

/** The featured item of a day: the same for everyone, starting from a hash of the day. */
export function pickOffer(day, isOwned) {
  const list = [...COSMETICS].sort((a, b) => (a.id < b.id ? -1 : 1));
  let h = Math.imul(day ^ 0x9e3779b9, 2654435761) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0; // keep it unsigned: a negative index would pick nothing
  for (let k = 0; k < list.length; k++) {
    const it = list[(h + k) % list.length];
    if (!isOwned(it.id)) return it;
  }
  return null;
}

export const findItem = (id) => CATALOG.find((c) => c.id === id) || null;

const sum = (lines) => lines.reduce((s, l) => s + l.n, 0);

/** Éclats for a campaign win, line by line ({key, n, count?}). Replays only pay for new stars. */
export function winReward({ firstClear, bonus = false, prevStars = 0, stars, worldDone = false }) {
  const lines = [];
  if (firstClear) lines.push(bonus ? { key: 'bonusClear', n: REWARD.bonusClear } : { key: 'firstClear', n: REWARD.firstClear });
  const fresh = Math.max(0, stars - prevStars);
  if (fresh) lines.push({ key: 'stars', n: fresh * REWARD.star, count: fresh });
  if (worldDone) lines.push({ key: 'world', n: REWARD.world });
  return { total: sum(lines), lines };
}

/** Éclats for the first win of a day's puzzle, `streak` being the days in a row including today. */
export function dailyReward(streak) {
  const lines = [{ key: 'daily', n: REWARD.daily }];
  const extra = Math.min(REWARD.dailyStreakMax, REWARD.dailyStreak * Math.max(0, streak - 1));
  if (extra) lines.push({ key: 'streak', n: extra, count: streak });
  return { total: sum(lines), lines };
}

/** The gift of the `day`-th day in a row (1-based). */
export function giftFor(day) {
  return { coins: GIFT[Math.min(Math.max(1, day), GIFT.length) - 1], hints: day % 7 === 0 ? 1 : 0 };
}

/**
 * What a player who started before the shop existed receives: the same rules,
 * applied to everything already achieved (levels, stars, worlds, achievements, daily puzzles).
 */
export function retroGrant({ levels, bonusIds, worldsDone = 0, achievements = 0, dailies = 0 }) {
  let coins = 0;
  for (const [id, r] of Object.entries(levels || {})) {
    if (!r || !r.done) continue;
    coins += (bonusIds.has(id) ? REWARD.bonusClear : REWARD.firstClear) + (r.stars || 0) * REWARD.star;
  }
  return coins + worldsDone * REWARD.world + achievements * REWARD.achievement + dailies * REWARD.daily;
}
