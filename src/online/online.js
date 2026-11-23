// The online rankings, seen from the game: the player's pseudo and anonymous
// identity, what each level's best result is and whether the server has it,
// and the rankings fetched from Cloud Firestore. Everything works offline:
// results wait in the save and are sent when the network comes back.
//
// Data (see firestore.rules):
//   names/{key}                 who owns a pseudo (key = nameKey(pseudo))
//   players/{uid}               pseudo, look, total of stars (global ranking)
//   boards/{board}/entries/{uid} best result of a player on a level / daily puzzle
//   reports/{id}                a pseudo reported by a player (read in the console)
import { createClient, OnlineError } from './firebase.js';
import { FIREBASE } from './config.js';
import { checkName, cleanName, nameKey } from './names.js';
import { makeEntry, isLevelBoard, isDailyBoard, boardDay, globalKey, UNKNOWN, CAP } from './score.js';

export { OnlineError };

/** On a local server, "?emulator" plays against the Firebase emulators (see docs/FIREBASE.md). */
function localEmulator() {
  try {
    const u = new URL(globalThis.location.href);
    if (!u.searchParams.has('emulator') || !/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) return null;
    return { apiKey: 'demo-key', projectId: 'demo-lumignons', emulator: { auth: 'http://127.0.0.1:9099', firestore: 'http://127.0.0.1:8085' } };
  } catch {
    return null;
  }
}

const TOP = 20;
const CACHE_MS = 45000;
const PLAYER_CACHE_MS = 5 * 60000;
const DAILY_GRACE_H = 44; // a daily result is accepted up to two days later (time zones)

/**
 * deps: {
 *   save, persist,
 *   info(board) → { min, par } of a campaign level or daily puzzle, or null,
 *   look(color) → { hat, glasses, flame } worn by that Lumignon,
 *   levelBoards() → every campaign board id,
 *   onChange(what), config?, fetch?
 * }
 */
export function createOnline(deps) {
  const { save, persist, info, look } = deps;
  const onChange = deps.onChange || (() => {});
  const cfg = deps.config || globalThis.__LUMI_FIREBASE__ || localEmulator() || FIREBASE;
  const configured = !!(cfg && cfg.apiKey && cfg.projectId);
  let client = null;
  let status = configured ? 'idle' : 'off';
  let syncing = null;
  let chain = Promise.resolve();
  const cache = new Map();
  const players = new Map();

  const st = () =>
    (save.data.online ||= { name: null, asked: false, optOut: false, color: 0, uid: null, refresh: null, key: null, taken: false, lookSent: null });
  const boards = () => (save.data.boards ||= {});
  const active = () => configured && !st().optOut && !!st().name;

  function setStatus(s) {
    if (s === status) return;
    status = s;
    onChange('status');
  }

  /** One online operation at a time (renaming while results are being sent…). */
  function serial(fn) {
    const p = chain.then(fn, fn);
    chain = p.catch(() => {});
    return p;
  }

  function api() {
    if (!configured) throw new OnlineError('off');
    if (!client) {
      const o = st();
      client = createClient(cfg, {
        fetch: deps.fetch,
        session: o.uid && o.refresh ? { uid: o.uid, refresh: o.refresh } : null,
        onSession: (sess) => {
          const s = st();
          if (sess) {
            // A brand-new account (the old one was removed): nothing is online any more.
            if (s.uid && s.uid !== sess.uid) forgetServer();
            s.uid = sess.uid;
            s.refresh = sess.refresh;
          } else {
            s.uid = null;
            s.refresh = null;
          }
          persist();
        },
      });
    }
    return client;
  }

  /** The server no longer knows us: everything has to be sent again. */
  function forgetServer() {
    const o = st();
    o.key = null;
    o.lookSent = null;
    for (const r of Object.values(boards())) {
      r.sent = null;
      r.server = null;
      delete r.err;
    }
    cache.clear();
  }

  // ----------------------------------------------------------------- profile

  const lookOf = (color) => {
    const l = look(color) || {};
    return { hat: l.hat || 'none', glasses: l.glasses || 'none', flame: l.flame || 'classic' };
  };
  const lookSig = () => {
    const o = st();
    const l = lookOf(o.color | 0);
    return [o.color | 0, l.hat, l.glasses, l.flame].join('|');
  };

  /** The player document as it should be (stars, ranking key and last board kept from `base`). */
  function profileData(c, base) {
    const o = st();
    return {
      name: o.name,
      key: nameKey(o.name),
      color: o.color | 0,
      ...lookOf(o.color | 0),
      stars: base?.stars ?? 0,
      gkey: base?.gkey ?? globalKey(0, c.now() / 1000),
      lastBoard: base?.lastBoard ?? '',
      v: 1,
    };
  }

  function markTaken() {
    const o = st();
    o.taken = true;
    o.key = null;
    persist();
    onChange('taken');
  }

  async function reserveFails(c, uid, key, e) {
    if (e.code !== 'denied' && e.code !== 'conflict') return e;
    const n = await c.get(`names/${key}`);
    if (n && n.data.uid !== uid) {
      markTaken();
      return new OnlineError('taken');
    }
    return e;
  }

  /** Makes sure the server has our profile under our current pseudo and look. */
  async function ensureProfile() {
    const c = api();
    const o = st();
    const uid = await c.signIn();
    const key = nameKey(o.name);
    const [p] = await c.getAll([`players/${uid}`]);
    const ops = [];
    if (!p) {
      const [mine] = await c.getAll([`names/${key}`]);
      if (mine && mine.data.uid !== uid) {
        markTaken();
        throw new OnlineError('taken');
      }
      if (!mine) ops.push({ set: `names/${key}`, data: { uid }, create: true, serverTime: ['at'] });
      ops.push({ set: `players/${uid}`, data: profileData(c, null), create: true, serverTime: ['at'] });
    } else if (p.data.key !== key) {
      const [mine] = await c.getAll([`names/${key}`]);
      if (mine && mine.data.uid !== uid) {
        markTaken();
        throw new OnlineError('taken');
      }
      if (!mine) ops.push({ set: `names/${key}`, data: { uid }, create: true, serverTime: ['at'] });
      ops.push({ set: `players/${uid}`, data: profileData(c, p.data), updateTime: p.updateTime, serverTime: ['at'] });
      if (p.data.key) ops.push({ del: `names/${p.data.key}` });
    } else if (p.data.name !== o.name || lookSig() !== o.lookSent) {
      ops.push({ set: `players/${uid}`, data: profileData(c, p.data), updateTime: p.updateTime, serverTime: ['at'] });
    }
    if (ops.length) {
      try {
        await c.commit(ops);
      } catch (e) {
        throw await reserveFails(c, uid, key, e);
      }
      players.delete(uid);
      cache.delete('global');
    }
    o.key = key;
    o.taken = false;
    o.lookSent = lookSig();
    persist();
    return uid;
  }

  // ------------------------------------------------------------------ results

  function track(bid, legacy) {
    const all = boards();
    if (!all[bid]) {
      const r = { tries: 0, ms: 0, hint: false };
      // Tries made before the rankings existed count, but their time was never measured.
      if (legacy && ((legacy.tries || 0) > 0 || legacy.done)) {
        r.tries = legacy.tries || 0;
        r.hint = !!legacy.hint;
        r.legacy = true;
      }
      if (isDailyBoard(bid)) r.day = boardDay(bid);
      all[bid] = r;
    }
    return all[bid];
  }

  /** A winning run: keeps it if it beats the best result on this board. */
  function win(bid, { stars, pieces }) {
    const r = track(bid);
    const e = makeEntry({ stars, pieces, helped: r.hint, tries: r.tries, ms: r.legacy ? UNKNOWN : r.ms });
    if (r.best && r.best.key <= e.key) return { improved: false, entry: r.best, run: e };
    const prev = r.best || null;
    r.best = e;
    r.t = Date.now();
    persist();
    return { improved: true, entry: e, prev, run: e };
  }

  /** Results from before the rankings: what the save tells (time unknown). */
  function migrate(levels, solutions) {
    let n = 0;
    for (const [id, rec] of Object.entries(levels || {})) {
      const sol = solutions[id];
      if (!rec?.done || !sol || !isLevelBoard(id) || boards()[id]?.best) continue;
      const r = track(id, rec);
      r.legacy = true;
      const stars = Math.min(3, Math.max(1, rec.stars || 1));
      const pieces = stars === 3 ? sol.par : stars === 2 ? Math.max(rec.best ?? 0, sol.par + 1) : Math.max(rec.best ?? sol.min, sol.min);
      r.best = makeEntry({ stars, pieces, helped: !!rec.hint, tries: Math.max(1, rec.tries || 1), ms: UNKNOWN });
      r.t = 0;
      n++;
    }
    // A result refused by the rules may be accepted now (rules published since): try again.
    for (const r of Object.values(boards())) delete r.err;
    // Old daily results that were sent (or can no longer be) are not needed any more.
    const today = Date.now();
    for (const [bid, r] of Object.entries(boards())) {
      if (!r.day) continue;
      const age = (today - Date.parse(r.day + 'T12:00:00')) / 3600e3;
      if (age > 24 * 4) delete boards()[bid];
    }
    if (n) persist();
    return n;
  }

  function expired(bid) {
    const day = boardDay(bid);
    if (!day) return false;
    return Date.now() - Date.parse(day + 'T00:00:00') > (24 + DAILY_GRACE_H) * 3600e3;
  }

  /** Sends one board's best result (if the server does not already have as good). */
  async function submit(bid) {
    const rec = boards()[bid];
    if (!rec?.best || rec.sent === rec.best.key) return 'done';
    const inf = info(bid);
    if (!inf) return 'skip';
    if (expired(bid)) {
      rec.expired = true;
      persist();
      return 'expired';
    }
    const c = api();
    const uid = c.uid;
    for (let attempt = 0; attempt < 2; attempt++) {
      const [p, e] = await c.getAll([`players/${uid}`, `boards/${bid}/entries/${uid}`]);
      if (!p) throw new OnlineError('missing');
      const b = rec.best;
      if (e && e.data.key <= b.key) {
        rec.sent = b.key;
        rec.server = e.data.key;
        persist();
        return 'kept';
      }
      const entry = { stars: b.stars, pieces: b.pieces, helped: b.helped, tries: b.tries, ms: b.ms, key: b.key, min: inf.min, par: inf.par, v: 1 };
      const ops = [{ set: `boards/${bid}/entries/${uid}`, data: entry, ...(e ? { updateTime: e.updateTime } : { create: true }), serverTime: ['at'] }];
      const delta = b.stars - (e?.data.stars || 0);
      if (isLevelBoard(bid) && delta !== 0) {
        const stars = (p.data.stars || 0) + delta;
        ops.push({
          set: `players/${uid}`,
          data: { ...profileData(c, p.data), stars, gkey: globalKey(stars, c.now() / 1000), lastBoard: bid },
          updateTime: p.updateTime,
          serverTime: ['at'],
        });
      }
      try {
        await c.commit(ops);
      } catch (err) {
        if (err.code === 'conflict' && attempt === 0) continue;
        if (err.code === 'denied' || err.code === 'bad') {
          rec.err = err.code;
          persist();
        }
        throw err;
      }
      rec.sent = b.key;
      rec.server = b.key;
      delete rec.err;
      persist();
      cache.delete(bid);
      cache.delete('global');
      players.delete(uid);
      return 'sent';
    }
    return 'conflict';
  }

  function pending() {
    return Object.entries(boards())
      .filter(([bid, r]) => r.best && r.sent !== r.best.key && !r.err && !r.expired && info(bid))
      .sort((a, b) => (a[1].t || 0) - (b[1].t || 0))
      .map(([bid]) => bid);
  }

  /** True when the server has this board's best result (sent now or earlier). */
  const onServer = (bid) => {
    const r = boards()[bid];
    return !!(r?.best && r.sent === r.best.key);
  };

  /**
   * Sends everything that waits (`first` before the rest). Resolves to 'sent'
   * when `first` is now on the server, 'idle' after a full run without `first`,
   * or what went wrong: 'offline', 'taken', 'denied', 'expired', 'inactive'…
   */
  function sync(first = null) {
    if (!active()) return Promise.resolve(configured ? 'inactive' : 'off');
    const run = () =>
      serial(async () => {
        setStatus('busy');
        let out = 'idle';
        try {
          await ensureProfile();
          const list = pending();
          if (first && list.includes(first)) list.splice(list.indexOf(first), 1), list.unshift(first);
          for (const bid of list) {
            try {
              const r = await submit(bid);
              if (bid === first && r === 'expired') out = r;
            } catch (e) {
              if (['offline', 'quota', 'server', 'auth', 'taken', 'missing'].includes(e.code)) throw e;
              if (bid === first) out = e.code;
            }
          }
          if (first && onServer(first)) out = 'sent';
          setStatus('idle');
        } catch (e) {
          out = e.code || 'error';
          setStatus(e.code === 'offline' ? 'offline' : e.code === 'taken' ? 'taken' : 'error');
        }
        onChange('sync');
        return out;
      });
    if (syncing && !first) return syncing;
    syncing = run().finally(() => (syncing = null));
    return syncing;
  }

  // ----------------------------------------------------------------- reading

  async function profilesOf(uids) {
    const c = api();
    const now = Date.now();
    const need = uids.filter((u) => !(players.get(u)?.at > now - PLAYER_CACHE_MS));
    if (need.length) {
      const docs = await c.getAll(need.map((u) => `players/${u}`));
      need.forEach((u, i) => players.set(u, { at: now, p: docs[i]?.data || null }));
    }
    return new Map(uids.map((u) => [u, players.get(u)?.p || null]));
  }

  const whoFields = (p) => ({ name: p.name, color: p.color | 0, hat: p.hat, glasses: p.glasses, flame: p.flame, total: p.stars | 0 });

  /** A board's top results, with the player's own place. */
  async function board(bid, { force = false } = {}) {
    const hit = cache.get(bid);
    if (hit && !force && Date.now() - hit.at < CACHE_MS) return hit.data;
    const c = api();
    const docs = await c.query(`boards/${bid}`, 'entries', { orderBy: 'key', limit: TOP });
    const profiles = await profilesOf(docs.map((d) => d.id));
    const myUid = st().uid;
    const rows = [];
    let rank = 0;
    let lastKey = null;
    docs.forEach((d, i) => {
      if (d.data.key !== lastKey) {
        rank = i + 1;
        lastKey = d.data.key;
      }
      const p = profiles.get(d.id);
      if (!p) return; // a removed player
      rows.push({ rank, uid: d.id, me: d.id === myUid, ...whoFields(p), stars: d.data.stars, pieces: d.data.pieces, helped: !!d.data.helped, tries: d.data.tries, ms: d.data.ms });
    });
    const rec = boards()[bid];
    const mineRow = rows.find((r) => r.me);
    let me = mineRow ? { rank: mineRow.rank } : null;
    let total = docs.length;
    if (docs.length >= TOP) {
      const myKey = mineRow ? null : rec?.server ?? null;
      const [all, better] = await Promise.all([
        c.count(`boards/${bid}`, 'entries'),
        myKey != null ? c.count(`boards/${bid}`, 'entries', { field: 'key', op: 'LESS_THAN', value: myKey }) : null,
      ]);
      total = all;
      if (better != null) me = { rank: better + 1 };
    }
    const data = { rows, me, total, mine: rec?.best || null, waiting: !!(rec?.best && rec.sent !== rec.best.key) };
    cache.set(bid, { at: Date.now(), data });
    return data;
  }

  /** Players ranked by their total of stars. */
  async function globalBoard({ force = false } = {}) {
    const hit = cache.get('global');
    if (hit && !force && Date.now() - hit.at < CACHE_MS) return hit.data;
    const c = api();
    const docs = await c.query('', 'players', { orderBy: 'gkey', limit: TOP });
    const now = Date.now();
    const myUid = st().uid;
    const rows = [];
    let rank = 0;
    let lastStars = null;
    docs.forEach((d, i) => {
      players.set(d.id, { at: now, p: d.data });
      if (d.data.stars !== lastStars) {
        rank = i + 1;
        lastStars = d.data.stars;
      }
      rows.push({ rank, uid: d.id, me: d.id === myUid, ...whoFields(d.data), stars: d.data.stars | 0 });
    });
    const mineRow = rows.find((r) => r.me);
    let me = mineRow ? { rank: mineRow.rank } : null;
    let total = docs.length;
    if (docs.length >= TOP) {
      let mine = null;
      if (!mineRow && myUid) [mine] = await c.getAll([`players/${myUid}`]);
      const [all, better] = await Promise.all([
        c.count('', 'players'),
        mine ? c.count('', 'players', { field: 'stars', op: 'GREATER_THAN', value: mine.data.stars | 0 }) : null,
      ]);
      total = all;
      if (better != null) me = { rank: better + 1, stars: mine.data.stars | 0 };
    }
    const data = { rows, me, total };
    cache.set('global', { at: Date.now(), data });
    return data;
  }

  /** Where the player stands on a board right now: { rank, total } or null. */
  async function standing(bid) {
    const rec = boards()[bid];
    if (rec?.server == null) return null;
    const c = api();
    const [better, total] = await Promise.all([
      c.count(`boards/${bid}`, 'entries', { field: 'key', op: 'LESS_THAN', value: rec.server }),
      c.count(`boards/${bid}`, 'entries'),
    ]);
    return { rank: better + 1, total };
  }

  /** Someone else's card: their look, total of stars and place in the global ranking. */
  async function playerCard(uid) {
    const c = api();
    const [p] = await c.getAll([`players/${uid}`]);
    if (!p) return null;
    players.set(uid, { at: Date.now(), p: p.data });
    const better = await c.count('', 'players', { field: 'stars', op: 'GREATER_THAN', value: p.data.stars | 0 });
    return { ...whoFields(p.data), uid, rank: better + 1, played: p.data.at || null };
  }

  // --------------------------------------------------------------- the pseudo

  /** 'free', 'mine', 'taken', or 'unknown' (offline, not configured). */
  async function availability(name, { timeout = 5000 } = {}) {
    if (!configured) return 'unknown';
    try {
      const key = nameKey(name);
      const n = await api().get(`names/${key}`, { timeout });
      if (!n) return 'free';
      return n.data.uid === st().uid ? 'mine' : 'taken';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Chooses a pseudo. Checks it, then sends it (or keeps it for later when
   * offline). Resolves to { ok: true } or { ok: false, reason }.
   */
  async function choose(raw, { color } = {}) {
    const name = cleanName(raw);
    const bad = checkName(name);
    if (bad) return { ok: false, reason: bad };
    const free = await availability(name);
    if (free === 'taken') return { ok: false, reason: 'taken' };
    const o = st();
    o.name = name;
    o.asked = true;
    o.taken = false;
    o.optOut = false;
    if (color !== undefined) o.color = color | 0;
    persist();
    onChange('name');
    if (configured) sync().catch(() => {});
    return { ok: true };
  }

  function setColor(color) {
    st().color = color | 0;
    persist();
    lookChanged();
  }

  let lookTimer = 0;
  /** What the player's Lumignon wears changed: tell the rankings, without hurry. */
  function lookChanged() {
    if (!active() || lookSig() === st().lookSent) return;
    clearTimeout(lookTimer);
    lookTimer = setTimeout(() => sync().catch(() => {}), 4000);
  }

  function setOptOut(off) {
    st().optOut = !!off;
    st().asked = true;
    persist();
    onChange('optout');
    if (!off) sync().catch(() => {});
  }

  /** Reports a pseudo (it lands in the database for the game's moderators). */
  function report(uid, bid = '') {
    return serial(async () => {
      const c = api();
      await c.signIn();
      const id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20);
      await c.commit([{ set: `reports/${id}`, data: { target: String(uid).slice(0, 64), board: String(bid || '').slice(0, 40), by: c.uid }, create: true, serverTime: ['at'] }]);
    });
  }

  // ------------------------------------------------------------------ presence
  // "Online" or "seen 3 h ago" on a player's card: the game writes the server's
  // time every few minutes while it is open (and not when the player hides it).

  const ONLINE_MS = 6 * 60 * 1000;
  const BEAT_MS = 4 * 60 * 1000;
  let lastBeat = 0;
  const showsPresence = () => !st().hidePresence;

  /** Tells the server "I'm here" (at most every few minutes). */
  async function heartbeat({ force = false } = {}) {
    if (!active() || !showsPresence()) return false;
    if (!force && Date.now() - lastBeat < BEAT_MS - 15000) return false;
    lastBeat = Date.now();
    try {
      const c = api();
      const uid = await c.signIn();
      await c.commit([{ set: `presence/${uid}`, data: {}, serverTime: ['seen'] }]);
      return true;
    } catch {
      lastBeat = 0;
      return false; // offline, or the profile is not on the server yet
    }
  }

  function setShowPresence(on) {
    st().hidePresence = !on;
    persist();
    onChange('presence');
    if (on) return heartbeat({ force: true });
    // Hidden: the last time seen is replaced by a "hidden" mark, so that the
    // card does not show the time of the last result instead.
    return serial(async () => {
      if (!configured || !st().uid) return;
      try {
        const c = api();
        const uid = await c.signIn();
        await c.commit([{ set: `presence/${uid}`, data: { hidden: true } }]);
      } catch {
        /* nothing on the server, or offline */
      }
    });
  }

  /**
   * { online, seen } for a player (seen: ms since epoch); { hidden: true } when
   * they hide it; null when they never sent one (an older version of the game).
   */
  async function presenceOf(uid) {
    const [d] = await api().getAll([`presence/${uid}`]);
    if (d?.data?.hidden) return { hidden: true };
    const seen = d?.data?.seen;
    if (!seen) return null;
    const now = api().now();
    return { seen, online: now - seen < ONLINE_MS };
  }

  /** Removes the profile, every result and the anonymous account from the server. */
  function deleteAll() {
    return serial(async () => {
      const o = st();
      if (configured && o.uid && o.refresh) {
        const c = api();
        const uid = await c.signIn();
        const [p] = await c.getAll([`players/${uid}`]);
        if (p) {
          const ops = [{ del: `presence/${uid}` }, { del: `players/${uid}` }];
          if (p.data.key) ops.push({ del: `names/${p.data.key}` });
          await c.commit(ops);
        }
        const ids = [...new Set([...(deps.levelBoards?.() || []), ...Object.keys(boards())])];
        for (let i = 0; i < ids.length; i += 20) await c.commit(ids.slice(i, i + 20).map((b) => ({ del: `boards/${b}/entries/${uid}` })));
        await c.deleteAccount();
      }
      forgetServer();
      o.uid = null;
      o.refresh = null;
      o.optOut = true;
      client = null;
      players.clear();
      persist();
      onChange('deleted');
    });
  }

  // ------------------------------------------------------------------ friends
  // A friend list kept on this device (and in backups): following someone needs
  // nothing from them, since pseudos and results are public anyway.

  const MAX_FRIENDS = 100;
  const friendList = () => (save.data.friends ||= []);

  /** A player by pseudo (any spelling): { uid, name, … } or null. */
  async function findPlayer(name) {
    const c = api();
    const n = await c.get(`names/${nameKey(name)}`);
    if (!n) return null;
    const [p] = await c.getAll([`players/${n.data.uid}`]);
    if (!p) return null;
    players.set(n.data.uid, { at: Date.now(), p: p.data });
    return { uid: n.data.uid, ...whoFields(p.data) };
  }

  /** 'added' | 'already' | 'self' | 'full' */
  function addFriend(uid, name) {
    const list = friendList();
    if (uid === st().uid) return 'self';
    const f = list.find((x) => x.uid === uid);
    if (f) {
      f.name = name || f.name;
      persist();
      return 'already';
    }
    if (list.length >= MAX_FRIENDS) return 'full';
    list.push({ uid, name, at: Date.now() });
    persist();
    onChange('friends');
    return 'added';
  }

  function removeFriend(uid) {
    const list = friendList();
    const i = list.findIndex((x) => x.uid === uid);
    if (i >= 0) list.splice(i, 1);
    persist();
    onChange('friends');
  }

  const isFriend = (uid) => friendList().some((x) => x.uid === uid);

  /** A board among friends (and me): rows ranked like the full board. */
  async function friendsBoard(bid) {
    const c = api();
    const myUid = st().uid;
    const uids = [...new Set([...friendList().map((f) => f.uid), ...(myUid ? [myUid] : [])])];
    const docs = uids.length ? await c.getAll(uids.map((u) => `boards/${bid}/entries/${u}`)) : [];
    const profiles = await profilesOf(uids);
    const entries = uids.map((u, i) => ({ u, d: docs[i] })).filter((x) => x.d && profiles.get(x.u));
    entries.sort((a, b) => a.d.data.key - b.d.data.key);
    let rank = 0;
    let lastKey = null;
    const rows = entries.map(({ u, d }, i) => {
      if (d.data.key !== lastKey) {
        rank = i + 1;
        lastKey = d.data.key;
      }
      const p = profiles.get(u);
      // Names follow the friend's current pseudo.
      const f = friendList().find((x) => x.uid === u);
      if (f && f.name !== p.name) f.name = p.name;
      return { rank, uid: u, me: u === myUid, ...whoFields(p), stars: d.data.stars, pieces: d.data.pieces, helped: !!d.data.helped, tries: d.data.tries, ms: d.data.ms, key: d.data.key };
    });
    const rec = boards()[bid];
    const mineRow = rows.find((r) => r.me);
    return { rows, me: mineRow ? { rank: mineRow.rank } : null, total: rows.length, mine: rec?.best || null, waiting: !!(rec?.best && rec.sent !== rec.best.key), friends: true };
  }

  /** Friends (and me) by total of stars. */
  async function friendsGlobal() {
    const myUid = st().uid;
    const uids = [...new Set([...friendList().map((f) => f.uid), ...(myUid ? [myUid] : [])])];
    const profiles = await profilesOf(uids);
    const list = uids.filter((u) => profiles.get(u)).map((u) => ({ uid: u, me: u === myUid, ...whoFields(profiles.get(u)), stars: profiles.get(u).stars | 0 }));
    list.sort((a, b) => b.stars - a.stars);
    let rank = 0;
    let last = null;
    list.forEach((r, i) => {
      if (r.stars !== last) {
        rank = i + 1;
        last = r.stars;
      }
      r.rank = rank;
    });
    const mineRow = list.find((r) => r.me);
    return { rows: list, me: mineRow ? { rank: mineRow.rank, stars: mineRow.stars } : null, total: list.length, friends: true };
  }

  /** One player's result on a board (for a duel), or null. */
  async function entryOf(uid, bid) {
    const c = api();
    const [e] = await c.getAll([`boards/${bid}/entries/${uid}`]);
    return e ? e.data : null;
  }

  return {
    configured,
    friends: () => friendList().slice(),
    findPlayer,
    addFriend,
    removeFriend,
    isFriend,
    friendsBoard,
    friendsGlobal,
    entryOf,
    profile: async (uid) => (await profilesOf([uid])).get(uid),
    get status() {
      return status;
    },
    /** What the UI needs to know about the player. */
    me() {
      const o = st();
      return { name: o.name, color: o.color | 0, optOut: !!o.optOut, asked: !!o.asked, taken: !!o.taken, uid: o.uid, active: active() };
    },
    needsName: () => !st().name && !st().optOut,
    markAsked() {
      st().asked = true;
      persist();
    },
    pendingCount: () => pending().length,
    record: (bid) => boards()[bid] || null,
    // play tracking
    track,
    tick(bid, ms) {
      const r = boards()[bid];
      if (r) r.ms = Math.min(CAP.ms, (r.ms || 0) + ms);
    },
    addTry(bid) {
      const r = track(bid);
      r.tries = (r.tries || 0) + 1;
    },
    addHint(bid) {
      track(bid).hint = true;
    },
    win,
    migrate,
    // network
    sync,
    board,
    globalBoard,
    standing,
    playerCard,
    availability,
    choose,
    setColor,
    lookChanged,
    setOptOut,
    heartbeat,
    setShowPresence,
    showsPresence,
    presenceOf,
    now: () => (client ? client.now() : Date.now()),
    report,
    deleteAll,
    /** Clears cached rankings (after a backup is restored…). */
    reset() {
      client = null;
      cache.clear();
      players.clear();
    },
  };
}
