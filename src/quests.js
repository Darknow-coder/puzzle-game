// Weekly quests: three goals each week (Monday to Sunday, local time), the same
// for everyone who can play them, drawn from a pool. Each one pays éclats; all
// three open a free "chest of the week". Pure logic: the save is passed in.
import { dayNumber } from './daily.js';

export const QUEST_REWARD = 60; // ✦ per quest
export const WEEK_BONUS_COINS = 200; // instead of the chest when the collection is complete
export const PER_WEEK = 3;

/** 1 January 2026 was a Thursday: weeks start on Mondays. */
export const weekNumber = (date = new Date()) => Math.floor((dayNumber(date) + 3) / 7);

/** Milliseconds until next Monday, 00:00 local time. */
export function untilNextWeek(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() + 7 - dow);
  return d - date;
}

// goal: how many; elig(ctx): can this player do it this week?
export const POOL = [
  {
    id: 'levels',
    goal: 5,
    text: { fr: (n) => `Réussis ${n} niveaux différents`, en: (n) => `Solve ${n} different levels` },
  },
  {
    id: 'stars',
    goal: 6,
    text: { fr: (n) => `Gagne ${n} nouvelles étoiles`, en: (n) => `Earn ${n} new stars` },
    elig: (c) => c.starsLeft >= 6,
  },
  {
    id: 'perfect',
    goal: 3,
    text: { fr: (n) => `Réussis ${n} niveaux avec ★★★`, en: (n) => `Solve ${n} levels with ★★★` },
  },
  {
    id: 'nohint',
    goal: 4,
    text: { fr: (n) => `Réussis ${n} niveaux sans indice`, en: (n) => `Solve ${n} levels without a hint` },
  },
  {
    id: 'firsttry',
    goal: 3,
    text: { fr: (n) => `Réussis ${n} niveaux du premier coup`, en: (n) => `Solve ${n} levels on the first try` },
  },
  {
    id: 'fireflies',
    goal: 12,
    text: { fr: (n) => `Attrape ${n} lucioles`, en: (n) => `Catch ${n} fireflies` },
  },
  {
    id: 'daily',
    goal: 3,
    text: { fr: (n) => `Réussis le défi du jour ${n} jours`, en: (n) => `Solve the daily puzzle on ${n} days` },
    elig: (c) => c.dailyOpen,
  },
  {
    id: 'friend',
    goal: 1,
    text: { fr: () => 'Passe devant un ami sur un niveau', en: () => 'Get ahead of a friend on a level' },
    elig: (c) => c.friends > 0,
  },
  {
    id: 'atelier',
    goal: 1,
    text: { fr: () => 'Crée un niveau vérifié dans l’atelier', en: () => 'Make a verified level in the workshop' },
  },
];
export const questDef = (id) => POOL.find((q) => q.id === id);

/** The week's quests for a player: a shuffle of the pool by week, the first three they can do. */
export function pickQuests(week, ctx) {
  let h = (week * 2654435761) >>> 0;
  const rnd = () => {
    h ^= h << 13;
    h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    return h / 4294967296;
  };
  const order = POOL.map((q) => ({ q, r: rnd() })).sort((a, b) => a.r - b.r).map((x) => x.q);
  return order.filter((q) => !q.elig || q.elig(ctx)).slice(0, PER_WEEK).map((q) => q.id);
}

/** This week's state in the save, (re)drawn when a new week starts. */
export function weekState(save, ctx, date = new Date()) {
  const week = weekNumber(date);
  let s = save.data.quests;
  if (!s || s.week !== week) {
    s = save.data.quests = { week, ids: pickQuests(week, ctx), n: {}, seen: {}, claimed: {}, bonus: false };
  }
  return s;
}

/** Progress of each quest: [{id, text(lang), have, goal, done, claimed}]. */
export function questList(save, ctx, lang = 'fr', date = new Date()) {
  const s = weekState(save, ctx, date);
  return s.ids.map((id) => {
    const q = questDef(id);
    const have = Math.min(q.goal, s.n[id] || 0);
    return { id, text: q.text[lang] ? q.text[lang](q.goal) : q.text.fr(q.goal), have, goal: q.goal, done: have >= q.goal, claimed: !!s.claimed[id] };
  });
}

/**
 * Something happened. ev: { type: 'win', board, stars, newStars, hint, firstTry, fireflies }
 * | { type: 'daily', day } | { type: 'friend', board } | { type: 'atelier', id }.
 * Returns the quests that this completed (to celebrate them).
 */
export function recordQuest(save, ctx, ev, date = new Date()) {
  const s = weekState(save, ctx, date);
  const before = new Set(s.ids.filter((id) => (s.n[id] || 0) >= questDef(id).goal));
  // A level counts once per quest and per week (replaying the same one does not farm).
  const once = (id, key) => {
    s.seen[id] ||= [];
    if (s.seen[id].includes(key)) return;
    s.seen[id].push(key);
    s.n[id] = (s.n[id] || 0) + 1;
  };
  const add = (id, k) => (s.n[id] = (s.n[id] || 0) + k);
  if (ev.type === 'win') {
    once('levels', ev.board);
    if (ev.newStars > 0) add('stars', ev.newStars);
    if (ev.stars >= 3) once('perfect', ev.board);
    if (!ev.hint) once('nohint', ev.board);
    if (ev.firstTry) once('firsttry', ev.board);
    if (ev.fireflies > 0) add('fireflies', ev.fireflies);
  } else if (ev.type === 'daily') once('daily', ev.day);
  else if (ev.type === 'friend') once('friend', ev.board);
  else if (ev.type === 'atelier') once('atelier', ev.id);
  return s.ids.filter((id) => !before.has(id) && (s.n[id] || 0) >= questDef(id).goal).map((id) => questDef(id));
}

/** Quests done but not yet collected (for the dot on the title screen). */
export function toClaim(save, ctx, date = new Date()) {
  const s = weekState(save, ctx, date);
  const ready = s.ids.filter((id) => (s.n[id] || 0) >= questDef(id).goal && !s.claimed[id]).length;
  const allClaimed = s.ids.every((id) => s.claimed[id]);
  return ready + (allClaimed && !s.bonus ? 1 : 0);
}

/** Collects one quest's reward: the éclats it pays, or 0. */
export function claimQuest(save, ctx, id, date = new Date()) {
  const s = weekState(save, ctx, date);
  if (!s.ids.includes(id) || s.claimed[id] || (s.n[id] || 0) < questDef(id).goal) return 0;
  s.claimed[id] = true;
  return QUEST_REWARD;
}

/** All three collected: the chest of the week can be opened (once). */
export function bonusReady(save, ctx, date = new Date()) {
  const s = weekState(save, ctx, date);
  return !s.bonus && s.ids.every((id) => s.claimed[id]);
}
export function takeBonus(save, ctx, date = new Date()) {
  if (!bonusReady(save, ctx, date)) return false;
  save.data.quests.bonus = true;
  return true;
}
