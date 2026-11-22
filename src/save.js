// Local save (localStorage) and progression rules.
import { WORLDS } from './data/levels.js';
import { HATS_INFO, ACHIEVEMENTS } from './data/meta.js';

const KEY = 'lumignons.save.v1';

function defaults() {
  return {
    v: 1,
    levels: {},
    settings: { music: true, sound: true, vibration: true, lang: null, speed: 1, reducedMotion: false, dots: true, symbols: false, openAll: false },
    hat: 'none',
    seen: {},
    tips: {},
    achievements: {},
    hatsSeen: { none: 1 },
    worldsSeen: { meadow: 1 },
    stats: { fireflies: 0, wins: 0, fails: 0, hints: 0, plays: 0 },
    last: null,
  };
}

export const save = { data: defaults() };

/** Fills in whatever an older (or partial) save lacks. */
function normalize(d) {
  const base = defaults();
  return {
    ...base,
    ...d,
    settings: { ...base.settings, ...(d.settings || {}) },
    stats: { ...base.stats, ...(d.stats || {}) },
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) save.data = normalize(JSON.parse(raw));
  } catch {
    save.data = defaults();
  }
  return save.data;
}

/** Replaces the whole save (restoring a backup). */
export function replaceSave(d) {
  save.data = normalize(d);
  persistNow();
}

let pending = 0;
export function persist() {
  clearTimeout(pending);
  pending = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(save.data));
    } catch {
      /* storage full or disabled: the game keeps working for this session */
    }
  }, 50);
}
export function persistNow() {
  clearTimeout(pending);
  try {
    localStorage.setItem(KEY, JSON.stringify(save.data));
  } catch {
    /* ignore */
  }
}

export function resetSave() {
  const settings = save.data.settings;
  save.data = defaults();
  save.data.settings = settings;
  persistNow();
}

export function levelRecord(id) {
  return save.data.levels[id] || null;
}

/** Records the outcome of a winning run. Returns what improved. */
export function recordWin(id, { stars, pieces, fireflies, usedHint }) {
  const prev = save.data.levels[id] || { stars: 0, best: null, fireflies: 0, tries: 0, hint: false };
  const rec = { ...prev };
  rec.done = true;
  rec.stars = Math.max(prev.stars || 0, stars);
  rec.fireflies = Math.max(prev.fireflies || 0, fireflies);
  if (stars >= 1) rec.best = rec.best == null ? pieces : Math.min(rec.best, pieces);
  rec.hint = !!(prev.hint || usedHint);
  save.data.levels[id] = rec;
  save.data.stats.wins++;
  const gained = Math.max(0, (rec.stars || 0) - (prev.stars || 0));
  save.data.stats.fireflies += Math.max(0, fireflies - (prev.fireflies || 0));
  persist();
  return { gained, firstClear: !prev.done, rec, prevStars: prev.stars || 0 };
}

export function recordTry(id) {
  const rec = save.data.levels[id] || { stars: 0, best: null, fireflies: 0, tries: 0 };
  rec.tries = (rec.tries || 0) + 1;
  save.data.levels[id] = rec;
  save.data.stats.plays++;
  persist();
  return rec.tries;
}

export function recordHint(id) {
  const rec = save.data.levels[id] || { stars: 0, best: null, fireflies: 0, tries: 0 };
  rec.hint = true;
  save.data.levels[id] = rec;
  save.data.stats.hints++;
  persist();
}

// ---------------------------------------------------------------------------
// Progression rules

export function totalStars() {
  let n = 0;
  for (const k in save.data.levels) n += save.data.levels[k].stars || 0;
  return n;
}

export function worldStars(w) {
  let n = 0;
  for (const lv of [...w.levels, w.bonus]) n += save.data.levels[lv.id]?.stars || 0;
  return n;
}

export function isDone(id) {
  return !!save.data.levels[id]?.done;
}

export function worldComplete(w) {
  if (!w) return false;
  return w.levels.every((lv) => isDone(lv.id));
}

export function worldUnlocked(wi) {
  if (wi === 0 || save.data.settings.openAll) return true;
  const prev = WORLDS[wi - 1];
  return worldComplete(prev) && totalStars() >= WORLDS[wi].unlock;
}

/** Why a world is locked (for the map). */
export function worldLockReason(wi) {
  if (wi === 0) return null;
  if (!worldComplete(WORLDS[wi - 1])) return { type: 'prev' };
  if (totalStars() < WORLDS[wi].unlock) return { type: 'stars', n: WORLDS[wi].unlock };
  return null;
}

export function levelUnlocked(wi, li) {
  if (!worldUnlocked(wi)) return false;
  if (save.data.settings.openAll) return true;
  const lv = WORLDS[wi].levels;
  if (li === 0) return true;
  if (isDone(lv[li - 1].id)) return true;
  // One level may be skipped: the next-but-one stays open.
  return li >= 2 && isDone(lv[li - 2].id);
}

export function bonusUnlocked(wi) {
  const w = WORLDS[wi];
  if (!worldUnlocked(wi)) return false;
  if (save.data.settings.openAll) return true;
  return w.levels.every((lv) => (save.data.levels[lv.id]?.stars || 0) >= 2);
}

export function summary() {
  const s = {
    stars: totalStars(),
    completed: 0,
    perfectLevels: 0,
    firefliesCaught: save.data.stats.fireflies,
    worldsDone: 0,
    bonusDone: 0,
    stubborn: !!save.data.stats.stubborn,
    worldNoHint: false,
    allPerfect: true,
    totalLevels: 0,
    dailyDone: Object.keys(save.data.daily?.results || {}).length,
    dailyBest: save.data.daily?.best || 0,
    customMade: (save.data.custom || []).filter((c) => c.verified?.status === 'ok').length,
  };
  WORLDS.forEach((w) => {
    let done = 0;
    let noHint = true;
    for (const lv of w.levels) {
      s.totalLevels++;
      const r = save.data.levels[lv.id];
      if (r?.done) {
        s.completed++;
        done++;
      }
      if (r?.hint) noHint = false;
      if ((r?.stars || 0) >= 3) s.perfectLevels++;
      else s.allPerfect = false;
    }
    const b = save.data.levels[w.bonus.id];
    s.totalLevels++;
    if (b?.done) {
      s.bonusDone++;
      s.completed++;
    }
    if ((b?.stars || 0) >= 3) s.perfectLevels++;
    else s.allPerfect = false;
    if (done === w.levels.length) {
      s.worldsDone++;
      if (noHint) s.worldNoHint = true;
    }
  });
  return s;
}

export function hatUnlocked(h, sum = summary()) {
  const n = h.need;
  if (n.stars !== undefined) return sum.stars >= n.stars;
  if (n.world !== undefined) return worldComplete(WORLDS[n.world]);
  if (n.bonus !== undefined) return sum.bonusDone >= n.bonus;
  if (n.perfect) return sum.allPerfect;
  if (n.shop) return !!save.data.wallet?.owned?.[h.id];
  if (n.collector) return !!save.data.wallet?.owned?.collector;
  return false;
}

/** Newly unlocked hats/achievements/worlds since the last call. */
export function collectUnlocks() {
  const sum = summary();
  const out = { hats: [], achievements: [], worlds: [] };
  for (const h of HATS_INFO) {
    if (!save.data.hatsSeen[h.id] && hatUnlocked(h, sum)) {
      save.data.hatsSeen[h.id] = 1;
      out.hats.push(h);
    }
  }
  for (const a of ACHIEVEMENTS) {
    if (!save.data.achievements[a.id] && a.check(sum)) {
      save.data.achievements[a.id] = Date.now();
      out.achievements.push(a);
    }
  }
  WORLDS.forEach((w, i) => {
    if (!save.data.worldsSeen[w.id] && worldUnlocked(i)) {
      save.data.worldsSeen[w.id] = 1;
      out.worlds.push(w);
    }
  });
  if (out.hats.length || out.achievements.length || out.worlds.length) persist();
  return out;
}

/** Locate a level by id. */
export function findLevel(id) {
  for (let wi = 0; wi < WORLDS.length; wi++) {
    const w = WORLDS[wi];
    const li = w.levels.findIndex((l) => l.id === id);
    if (li >= 0) return { world: w, wi, li, def: w.levels[li], bonus: false };
    if (w.bonus.id === id) return { world: w, wi, li: 10, def: w.bonus, bonus: true };
  }
  return null;
}

/** The level that follows `id` in campaign order (skipping locked bonus levels). */
export function nextLevel(id) {
  const f = findLevel(id);
  if (!f) return null;
  if (!f.bonus && f.li < f.world.levels.length - 1) return f.world.levels[f.li + 1].id;
  const nw = WORLDS[f.wi + 1];
  if (!nw) return null;
  return worldUnlocked(f.wi + 1) ? nw.levels[0].id : null;
}

/** Where "Continue" should take the player. */
export function continueTarget() {
  for (let wi = 0; wi < WORLDS.length; wi++) {
    if (!worldUnlocked(wi)) break;
    const w = WORLDS[wi];
    for (let li = 0; li < w.levels.length; li++) {
      if (!isDone(w.levels[li].id) && levelUnlocked(wi, li)) return w.levels[li].id;
    }
  }
  return save.data.last || WORLDS[0].levels[0].id;
}
