// The player's purse, kept in the save: éclats, hint tokens, owned cosmetics,
// what each Lumignon wears, the daily gift, the surprise chest, the daily
// offer, the collection milestones and a short journal of what came and went.
import { save, persist, summary, hatUnlocked } from './save.js';
import { WORLDS } from './data/levels.js';
import { HATS_INFO } from './data/meta.js';
import { COSMETICS, DEFAULTS, MILESTONES, COLLECTOR, findCosmetic } from './data/cosmetics.js';
import { START, findItem, giftFor, retroGrant, HINT_PRICE, CHEST_PRICE, CHEST_PITY, drawChest, pickOffer, offerPrice } from './economy.js';
import { dayNumber } from './daily.js';

const LOG_MAX = 60;
const WORN = ['hat', 'glasses', 'flame']; // per Lumignon; trail and party are shared

/** The wallet, created on first use (with what past progress is worth). */
export function wallet() {
  if (!save.data.wallet) save.data.wallet = createWallet();
  return upgrade(save.data.wallet);
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

/** Fields added after 3.1: looks per Lumignon, chest, offer, milestones, "new" badges. */
function upgrade(w) {
  if (!w.looks) {
    const hat = save.data.hat || 'none';
    w.looks = [0, 1, 2, 3].map(() => ({ hat, glasses: 'none', flame: 'classic' }));
    w.same = true;
  }
  w.party ||= 'classic';
  w.chest ||= { opened: 0, sinceHigh: 0 };
  w.milestones ||= {};
  w.seen ||= {};
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

// ---------------------------------------------------------------- owning

const earnedHat = (id) => HATS_INFO.find((h) => h.id === id && !h.need.shop);

/** Can the player wear this item? Free defaults, bought items, hats earned by playing. */
export function owns(id, slot = null) {
  const w = wallet();
  if (w.owned[id]) return true;
  if (slot && DEFAULTS[slot] === id) return true;
  if (id === 'none' || id === 'classic') return true;
  const h = earnedHat(id);
  return !!h && hatUnlocked(h);
}

/** Price to pay now (the daily offer is cheaper). */
export function priceOf(id, date = new Date()) {
  const it = findItem(id);
  if (!it) return null;
  const o = offer(date);
  return o && o.item.id === id && !o.bought ? o.price : it.price;
}

/** Buys a catalog item: {ok, item, milestones} or {ok: false, why: 'owned' | 'coins' | 'unknown', missing}. */
export function buy(id, date = new Date()) {
  const it = findItem(id);
  if (!it) return { ok: false, why: 'unknown' };
  const w = wallet();
  if (it.kind !== 'hints' && w.owned[id]) return { ok: false, why: 'owned' };
  const price = priceOf(id, date);
  if (w.coins < price) return { ok: false, why: 'coins', missing: price - w.coins };
  spend(price, 'buy', id);
  if (it.kind === 'hints') w.hints += it.qty;
  else grant(id);
  const o = offer(date);
  if (o && o.item.id === id) w.offer.bought = true;
  persist();
  return { ok: true, item: it, price, milestones: it.kind === 'hints' ? [] : claimMilestones() };
}

function grant(id) {
  const w = wallet();
  w.owned[id] = 1;
  save.data.hatsSeen[id] = 1; // never announced as a "new hat" after a win
}

// ---------------------------------------------------------------- wearing

/** What the Lumignon of colour `color` wears: {hat, glasses, flame}. */
export function look(color = 0) {
  const w = wallet();
  return w.looks[w.same ? 0 : color] || w.looks[0];
}

/** Puts an item on (hat, glasses, flame: on one Lumignon or on all; trail, party: shared). */
export function wear(slot, id, color = 0) {
  const w = wallet();
  if (!owns(id, slot)) return false;
  if (slot === 'trail') w.trail = id;
  else if (slot === 'party') w.party = id;
  else if (WORN.includes(slot)) {
    if (w.same) for (const l of w.looks) l[slot] = id;
    else w.looks[color][slot] = id;
  } else return false;
  persist();
  return true;
}

/** One look for all four, or a look each (each starts from the shared one). */
export function setSame(same) {
  const w = wallet();
  if (same && !w.same) w.looks = w.looks.map(() => ({ ...w.looks[0] }));
  w.same = !!same;
  persist();
}

export const worn = (slot, color = 0) => (slot === 'trail' ? wallet().trail : slot === 'party' ? wallet().party : look(color)[slot]);

// ---------------------------------------------------------------- hints

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
  return wear('trail', id);
}

// ---------------------------------------------------------------- surprise chest

const unownedShop = () => COSMETICS.filter((c) => !wallet().owned[c.id]);

/** {price, left, guaranteed}: guaranteed = the next chest is sure to be epic or better. */
export function chestState() {
  const w = wallet();
  const left = unownedShop();
  const hi = left.some((c) => c.rarity === 'epic' || c.rarity === 'legendary');
  return { price: CHEST_PRICE, left: left.length, guaranteed: hi && w.chest.sinceHigh >= CHEST_PITY - 1, untilHigh: Math.max(1, CHEST_PITY - w.chest.sinceHigh) };
}

/** Opens a chest: {ok, item, milestones} or {ok: false, why: 'empty' | 'coins', missing}. */
export function openChest(rng = Math.random) {
  const w = wallet();
  const left = unownedShop();
  if (!left.length) return { ok: false, why: 'empty' };
  if (w.coins < CHEST_PRICE) return { ok: false, why: 'coins', missing: CHEST_PRICE - w.coins };
  const st = chestState();
  const item = drawChest(left, rng, st.guaranteed);
  spend(CHEST_PRICE, 'chest', item.id);
  grant(item.id);
  w.chest.opened++;
  w.chest.sinceHigh = item.rarity === 'epic' || item.rarity === 'legendary' ? 0 : w.chest.sinceHigh + 1;
  persist();
  return { ok: true, item, milestones: claimMilestones() };
}

// ---------------------------------------------------------------- daily offer

/** Today's featured item at −30 %: chosen once per day, kept even after it is bought. */
export function offer(date = new Date()) {
  const w = wallet();
  const day = dayNumber(date);
  if (!w.offer || w.offer.day !== day) {
    const it = pickOffer(day, (id) => !!w.owned[id]);
    w.offer = it ? { day, id: it.id, bought: false } : { day, id: null, bought: false };
    persist();
  }
  if (!w.offer.id) return null;
  const item = findCosmetic(w.offer.id);
  return { item, price: offerPrice(item.price), full: item.price, bought: !!w.offer.bought, day };
}

// ---------------------------------------------------------------- collection

/** Share of the shop's cosmetics owned: {owned, total, pct, next}. */
export function collection() {
  const w = wallet();
  const owned = COSMETICS.filter((c) => w.owned[c.id]).length;
  const total = COSMETICS.length;
  const pct = Math.floor((owned / total) * 100);
  const next = MILESTONES.find((m) => !w.milestones[m.pct]) || null;
  return { owned, total, pct, next };
}

/** Pays every milestone reached and not paid yet; the full collection also gives the crown. */
export function claimMilestones() {
  const w = wallet();
  const { pct } = collection();
  const out = [];
  for (const m of MILESTONES) {
    if (pct < m.pct || w.milestones[m.pct]) continue;
    w.milestones[m.pct] = 1;
    earn(m.coins, 'milestone', String(m.pct));
    if (m.pct === 100) grant(COLLECTOR.id);
    out.push(m);
  }
  if (out.length) persist();
  return out;
}

// ---------------------------------------------------------------- daily gift

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

// ---------------------------------------------------------------- badges

/** Marks items as seen (the "new" ribbon goes away). */
export function markSeen(ids) {
  const w = wallet();
  let changed = false;
  for (const id of ids) {
    if (!w.seen[id]) {
      w.seen[id] = 1;
      changed = true;
    }
  }
  if (changed) persist();
}

export const isNew = (id) => !wallet().seen[id];

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
