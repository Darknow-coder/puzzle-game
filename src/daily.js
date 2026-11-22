// "Défi du jour": one verified puzzle per calendar day, chosen among the
// worlds the player has already opened, plus a streak of consecutive days.
import { DAILY } from './data/daily.js';

const EPOCH = Date.UTC(2026, 0, 1);

/** Days since 1 Jan 2026 for the player's local calendar date. */
export function dayNumber(date = new Date()) {
  return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - EPOCH) / 86400000);
}

export function dayKey(date = new Date()) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function keyForDay(n) {
  const dt = new Date(EPOCH + n * 86400000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** Decodes a pool entry into a level definition + solver data. */
export function decodeEntry(e, theme, key) {
  const [rows, dirsStr, vanes, inv, par, min, sol] = e;
  const dirs = {};
  for (const part of dirsStr.split(' ').filter(Boolean)) dirs[part[0]] = part.slice(1);
  const def = {
    id: 'daily-' + key,
    name: { fr: 'Défi du jour', en: 'Daily challenge' },
    map: rows.split('/'),
    dirs,
    inv: { arrow: +inv[0], lily: +inv[1], mushroom: +inv[2], daisy: +inv[3] },
  };
  if (vanes) def.vanes = vanes;
  const solution = { par, min, sol: sol.split(',').map((p) => p.split('.').map(Number)) };
  return { def, theme, solution, key };
}

/** The puzzle of `date`, drawn from the themes the player can play. */
export function dailyFor(themes, date = new Date()) {
  const usable = themes.filter((t) => DAILY[t]?.length);
  if (!usable.length) return null;
  const n = dayNumber(date);
  const k = ((n % usable.length) + usable.length) % usable.length;
  const theme = usable[k];
  const pool = DAILY[theme];
  const idx = ((Math.floor(n / usable.length) % pool.length) + pool.length) % pool.length;
  return decodeEntry(pool[idx], theme, dayKey(date));
}

/** Records a win; returns the updated streak information. */
export function recordDaily(state, key, stars, date = new Date()) {
  const d = state || { results: {}, streak: 0, best: 0, last: null };
  const prev = d.results[key] || 0;
  d.results[key] = Math.max(prev, stars);
  if (d.last !== key) {
    const yesterday = keyForDay(dayNumber(date) - 1);
    d.streak = d.last === yesterday ? d.streak + 1 : 1;
    d.last = key;
  }
  d.best = Math.max(d.best || 0, d.streak);
  return d;
}

/** Current streak as seen today (it breaks if yesterday was missed). */
export function liveStreak(state, date = new Date()) {
  if (!state || !state.last) return 0;
  const today = dayKey(date);
  const yesterday = keyForDay(dayNumber(date) - 1);
  return state.last === today || state.last === yesterday ? state.streak : 0;
}
