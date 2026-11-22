// Éclats (glimmers): the coins of the game. They are earned by playing only,
// never with real money, and spent in the shop on hints and cosmetics. Every
// amount lives here so the whole balance can be read, and tuned, in one place.
//
// Rough balance: a whole campaign played well brings about 3,000 éclats
// (plus the daily puzzle and the daily gift), the cosmetics cost 2,150 in all,
// and a hint 15 to 20: hints stay within easy reach, and cosmetics are a goal.

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
export const GIFT = [10, 15, 20, 25, 30, 40, 60];

/** One hint bought on the spot, when none is left. */
export const HINT_PRICE = 20;

export const CATALOG = [
  { id: 'hint1', kind: 'hints', qty: 1, price: 20 },
  { id: 'hint5', kind: 'hints', qty: 5, price: 85 },
  { id: 'hint12', kind: 'hints', qty: 12, price: 180 },
  { id: 'bow', kind: 'hat', price: 100 },
  { id: 'beret', kind: 'hat', price: 140 },
  { id: 'pompom', kind: 'hat', price: 160 },
  { id: 'chef', kind: 'hat', price: 180 },
  { id: 'headphones', kind: 'hat', price: 220 },
  { id: 'tophat', kind: 'hat', price: 260 },
  { id: 'sparkle', kind: 'trail', price: 150 },
  { id: 'petals', kind: 'trail', price: 200 },
  { id: 'notes', kind: 'trail', price: 220 },
  { id: 'comet', kind: 'trail', price: 240 },
  { id: 'rainbow', kind: 'trail', price: 280 },
];

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
