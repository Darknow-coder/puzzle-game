// The player's purse, kept in the save: éclats, hint tokens, owned cosmetics,
// the daily gift and a short journal of what came in and went out.
import { save, persist, summary } from './save.js';
import { WORLDS } from './data/levels.js';
import { START, findItem, giftFor, retroGrant, HINT_PRICE } from './economy.js';
import { dayNumber } from './daily.js';

const LOG_MAX = 60;

/** The wallet, created on first use (with what past progress is worth). */
export function wallet() {
  if (!save.data.wallet) save.data.wallet = createWallet();
  return save.data.wallet;
}

function createWallet() {
  const d = save.data;
  const retro = retroGrant({
    levels: d.levels,
    bonusIds: new Set(WORLDS.map((w) => w.bonus.id)),
    worldsDone: summary().worldsDone,
    achievements: Object.keys(d.achievements || {}).length,
    dailies: Object.keys(d.daily?.results || {}).length,
  });
  const w = { coins: START.coins + retro, hints: START.hints, earned: START.coins + retro, spent: 0, hintsUsed: 0, log: [], gift: { day: null, streak: 0 }, owned: {}, trail: 'classic', welcome: retro };
  w.log.push({ t: Date.now(), n: START.coins, k: 'start' });
  if (retro) w.log.push({ t: Date.now(), n: retro, k: 'retro' });
  return w;
}

function note(n, k, id) {
  const w = wallet();
  w.log.unshift({ t: Date.now(), n, k, ...(id ? { id } : {}) });
  if (w.log.length > LOG_MAX) w.log.length = LOG_MAX;
}

export function earn(n, k, id) {
  if (!(n > 0)) return 0;
  const w = wallet();
  w.coins += n;
  w.earned += n;
  note(n, k, id);
  persist();
  return n;
}

/** Takes éclats if there are enough; returns false otherwise. */
export function spend(n, k, id) {
  const w = wallet();
  if (!(n >= 0) || w.coins < n) return false;
  w.coins -= n;
  w.spent += n;
  note(-n, k, id);
  persist();
  return true;
}

export const owns = (id) => !!wallet().owned[id];

/** Buys a catalog item: {ok} or {ok: false, why: 'owned' | 'coins' | 'unknown', missing}. */
export function buy(id) {
  const it = findItem(id);
  if (!it) return { ok: false, why: 'unknown' };
  const w = wallet();
  if (it.kind !== 'hints' && w.owned[id]) return { ok: false, why: 'owned' };
  if (w.coins < it.price) return { ok: false, why: 'coins', missing: it.price - w.coins };
  spend(it.price, 'buy', id);
  if (it.kind === 'hints') w.hints += it.qty;
  else w.owned[id] = 1;
  persist();
  return { ok: true, item: it };
}

/** Uses a hint token; false when there is none left. */
export function useHint() {
  const w = wallet();
  if (w.hints <= 0) return false;
  w.hints--;
  w.hintsUsed++;
  persist();
  return true;
}

/** No token left: one hint bought on the spot and used at once. */
export function buyAndUseHint() {
  if (!spend(HINT_PRICE, 'hint')) return false;
  wallet().hintsUsed++;
  persist();
  return true;
}

export function setTrail(id) {
  const w = wallet();
  if (id !== 'classic' && !w.owned[id]) return false;
  w.trail = id;
  persist();
  return true;
}

/** Today's gift: {available, day} where `day` is the streak it would complete. */
export function giftState(date = new Date()) {
  const g = wallet().gift;
  const today = dayNumber(date);
  if (g.day === today) return { available: false, day: g.streak, next: giftFor(g.streak + 1) };
  const day = g.day === today - 1 ? g.streak + 1 : 1;
  return { available: true, day, gift: giftFor(day) };
}

/** Opens today's gift once: returns {coins, hints, day} or null if already opened. */
export function claimGift(date = new Date()) {
  const st = giftState(date);
  if (!st.available) return null;
  const w = wallet();
  w.gift = { day: dayNumber(date), streak: st.day };
  w.hints += st.gift.hints;
  earn(st.gift.coins, 'gift');
  persist();
  return { ...st.gift, day: st.day };
}

/** The welcome grant to announce once (existing players), then forgotten. */
export function takeWelcome() {
  const w = wallet();
  const n = w.welcome || 0;
  if (n) {
    w.welcome = 0;
    persist();
  }
  return n;
}
