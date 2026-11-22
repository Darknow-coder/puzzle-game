// How results are ranked. One number, the "key", orders a level's ranking
// (smaller is better) so that the online database can sort and count with a
// single field:
//   1. more stars,
//   2. fewer pieces,
//   3. found without a hint,
//   4. fewer tries (Go presses until that result, all sessions together),
//   5. less time spent on the level until that result.
// firestore.rules recomputes the key from the other fields, so keep both in step.

export const CAP = { pieces: 63, tries: 9999, ms: 99999999 };
export const UNKNOWN = -1; // time not measured (results from before the rankings)

/** The ranking key of a result. */
export function rankKey({ stars, pieces, helped, tries, ms }) {
  const p = Math.min(CAP.pieces, Math.max(0, pieces | 0));
  const tr = Math.min(CAP.tries, Math.max(1, tries | 0));
  const tm = ms === UNKNOWN ? CAP.ms : Math.min(CAP.ms, Math.max(0, Math.round(ms)));
  return ((((3 - stars) * 64 + p) * 2 + (helped ? 1 : 0)) * 10000 + tr) * 100000000 + tm;
}

/** A result as it is stored and sent: capped, with its key. */
export function makeEntry({ stars, pieces, helped, tries, ms }) {
  const e = {
    stars: Math.min(3, Math.max(1, stars | 0)),
    pieces: Math.min(CAP.pieces, Math.max(0, pieces | 0)),
    helped: !!helped,
    tries: Math.min(CAP.tries, Math.max(1, tries | 0)),
    ms: ms === UNKNOWN ? UNKNOWN : Math.min(CAP.ms, Math.max(1000, Math.round(ms))),
  };
  e.key = rankKey(e);
  return e;
}

// ------------------------------------------------------------------ boards

const LEVEL_RE = /^[1-9]-(?:[1-9]|10|B)$/;
const DAILY_RE = /^d-(\d{4})-(\d{2})-(\d{2})-([a-z]{3,10})-(\d{1,2})$/;

/** Board of a campaign level ("1-3", "1-B"), or null. */
export const levelBoard = (id) => (LEVEL_RE.test(id) ? id : null);

/** Board of a daily puzzle: date + the puzzle itself (players see different ones). */
export const dailyBoard = (d) => `d-${d.key}-${d.theme}-${d.idx}`;

export const isLevelBoard = (b) => LEVEL_RE.test(b);
export const isDailyBoard = (b) => DAILY_RE.test(b);

/** The calendar day of a daily board ("2026-11-22"), or null. */
export function boardDay(b) {
  const m = DAILY_RE.exec(b);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

// ------------------------------------------------------------- global ranking

// Players are ranked by their total of stars, then by who got there first:
// gkey = (1000 − stars) × 10¹⁰ + the second the total was reached.
export const MAX_STARS = 1000;
export const globalKey = (stars, seconds) => (MAX_STARS - stars) * 1e10 + Math.floor(seconds);

// ------------------------------------------------------------------ display

/** "42 s", "3 min 05", "1 h 12" — or "—" when the time is unknown. */
export function formatTime(ms, lang = 'fr') {
  if (ms == null || ms < 0) return '—';
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${String(s % 60).padStart(2, '0')}`;
  const h = Math.floor(m / 60);
  return lang === 'fr' ? `${h} h ${String(m % 60).padStart(2, '0')}` : `${h} h ${String(m % 60).padStart(2, '0')} min`;
}

/** "1er", "2e" / "1st", "2nd"… */
export function ordinal(n, lang = 'fr') {
  if (lang === 'fr') return n === 1 ? '1<sup>er</sup>' : `${n}<sup>e</sup>`;
  const t = n % 100;
  const suf = t >= 11 && t <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th';
  return `${n}<sup>${suf}</sup>`;
}
