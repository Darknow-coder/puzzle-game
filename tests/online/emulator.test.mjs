// Online rankings against the Firebase emulators (Authentication + Firestore),
// with the real security rules (firestore.rules). Run with:
//   npm run test:online
// (starts the emulators through firebase-tools; needs Java 11+).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '../../src/online/firebase.js';
import { createOnline } from '../../src/online/online.js';
import { makeEntry, globalKey, UNKNOWN } from '../../src/online/score.js';
import { nameKey } from '../../src/online/names.js';
import { SOLUTIONS } from '../../src/data/solutions.js';
import { DAILY } from '../../src/data/daily.js';
import { ENIGMAS } from '../../src/data/enigmas.js';
import { WORLDS } from '../../src/data/levels.js';

const PROJECT = process.env.GCLOUD_PROJECT || 'demo-lumignons';
const cfg = {
  apiKey: 'demo-key',
  projectId: PROJECT,
  emulator: { auth: 'http://127.0.0.1:9099', firestore: 'http://127.0.0.1:8085' },
};

async function wipe() {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}

/** Admin write that bypasses the rules (the emulator's "owner" token). */
async function adminSet(path, fields) {
  const body = { fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, typeof v === 'number' ? { integerValue: String(v) } : { stringValue: String(v) }])) };
  const r = await fetch(`http://127.0.0.1:8085/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert.ok(r.ok, `admin write ${path}: ${r.status}`);
}

const fakeSave = () => {
  const s = { data: { levels: {}, settings: {} } };
  return s;
};

function service(save = fakeSave(), extra = {}) {
  const changes = [];
  const online = createOnline({
    save,
    persist: () => {},
    config: cfg,
    look: () => ({ hat: 'crown', glasses: 'none', flame: 'classic' }),
    info: (b) => {
      if (SOLUTIONS[b]) return { min: SOLUTIONS[b].min, par: SOLUTIONS[b].par };
      const m = /^d-.*-([a-z]+)-(\d+)$/.exec(b);
      if (m && DAILY[m[1]]?.[+m[2]]) return { min: DAILY[m[1]][+m[2]][5], par: DAILY[m[1]][+m[2]][4] };
      const e = /^e(\d)-(\d\d)$/.exec(b);
      const book = e && ENIGMAS[WORLDS[+e[1] - 1]?.id];
      if (book?.[+e[2] - 1]) return { min: book[+e[2] - 1][5], par: book[+e[2] - 1][4] };
      return null;
    },
    levelBoards: () => Object.keys(SOLUTIONS),
    onChange: (w) => changes.push(w),
    ...extra,
  });
  return { online, save, changes };
}

/** A raw client (to try writes the game would never send). */
async function rawPlayer(name) {
  const c = createClient(cfg);
  const uid = await c.signIn();
  const key = nameKey(name);
  await c.commit([
    { set: `names/${key}`, data: { uid }, create: true, serverTime: ['at'] },
    {
      set: `players/${uid}`,
      data: { name, key, color: 0, hat: 'none', glasses: 'none', flame: 'classic', stars: 0, gkey: globalKey(0, Date.now() / 1000), lastBoard: '', v: 1 },
      create: true,
      serverTime: ['at'],
    },
  ]);
  return { c, uid, key };
}

const denied = async (p, msg) => {
  await assert.rejects(p, (e) => e.code === 'denied' || e.code === 'conflict', msg);
};

test.beforeEach(wipe);

test('a pseudo is unique, whatever its accents, case or separators', async () => {
  await rawPlayer('Lune Rêveuse');
  const c = createClient(cfg);
  const uid = await c.signIn();
  for (const name of ['lune reveuse', 'LUNE-RÊVEUSE', 'Lune.Rêveuse']) {
    const key = nameKey(name);
    await denied(
      c.commit([
        { set: `names/${key}`, data: { uid }, create: true, serverTime: ['at'] },
        { set: `players/${uid}`, data: { name, key, color: 0, hat: 'none', glasses: 'none', flame: 'classic', stars: 0, gkey: globalKey(0, Date.now() / 1000), lastBoard: '', v: 1 }, create: true, serverTime: ['at'] },
      ]),
      name,
    );
  }
});

test('the rules fold pseudos exactly like the game', async () => {
  const c = createClient(cfg);
  const uid = await c.signIn();
  const name = 'Æsa Œuvre Ñoño';
  const profile = (key) => ({ name, key, color: 1, hat: 'none', glasses: 'none', flame: 'classic', stars: 0, gkey: globalKey(0, Date.now() / 1000), lastBoard: '', v: 1 });
  // A key that is not the folded pseudo is refused (that would allow look-alike pseudos).
  await denied(
    c.commit([
      { set: `names/aesa`, data: { uid }, create: true, serverTime: ['at'] },
      { set: `players/${uid}`, data: profile('aesa'), create: true, serverTime: ['at'] },
    ]),
  );
  const key = nameKey(name);
  assert.equal(key, 'aesaoeuvrenono');
  await c.commit([
    { set: `names/${key}`, data: { uid }, create: true, serverTime: ['at'] },
    { set: `players/${uid}`, data: profile(key), create: true, serverTime: ['at'] },
  ]);
});

test('bad pseudos and bad profiles are refused', async () => {
  const c = createClient(cfg);
  const uid = await c.signIn();
  const base = (name, extra = {}) => ({ name, key: nameKey(name), color: 0, hat: 'none', glasses: 'none', flame: 'classic', stars: 0, gkey: globalKey(0, Date.now() / 1000), lastBoard: '', v: 1, ...extra });
  const tryCreate = (data) =>
    c.commit([
      { set: `names/${data.key}`, data: { uid }, create: true, serverTime: ['at'] },
      { set: `players/${uid}`, data, create: true, serverTime: ['at'] },
    ]);
  await denied(tryCreate(base('ab')), 'too short');
  await denied(tryCreate(base('Lune  Double')), 'double space');
  await denied(tryCreate(base('<script>')), 'symbols');
  await denied(tryCreate(base('Pip', { stars: 12 })), 'stars must start at 0');
  await denied(tryCreate(base('Pip', { color: 9 })), 'colour');
  await denied(tryCreate(base('Pip', { hat: 'BIG HAT' })), 'cosmetic id');
  await denied(tryCreate(base('Pip', { gkey: globalKey(0, Date.now() / 1000 - 3600) })), 'stale ranking clock');
  await denied(tryCreate(base('Pip', { extra: 1 })), 'unknown field');
  await tryCreate(base('Pip'));
  // Someone else cannot touch that profile.
  const other = createClient(cfg);
  const ouid = await other.signIn();
  await denied(other.commit([{ set: `players/${uid}`, data: base('Pip'), serverTime: ['at'] }]), 'foreign profile');
  await denied(other.commit([{ del: `names/pip` }]), 'foreign pseudo');
  assert.ok(ouid);
});

test('results: valid ones in, impossible ones out, only improvements replace', async () => {
  const { c, uid } = await rawPlayer('Pip');
  const s = SOLUTIONS['1-3'];
  const entry = (e) => {
    const m = makeEntry(e);
    return { stars: m.stars, pieces: m.pieces, helped: m.helped, tries: m.tries, ms: m.ms, key: m.key, min: s.min, par: s.par, v: 1 };
  };
  const send = async (data, opts = {}) => {
    const [p] = await c.getAll([`players/${uid}`]);
    const [e] = await c.getAll([`boards/1-3/entries/${uid}`]);
    const delta = data.stars - (e?.data.stars || 0);
    const ops = [{ set: `boards/1-3/entries/${uid}`, data, ...(e ? { updateTime: e.updateTime } : { create: true }), serverTime: ['at'] }];
    if (delta && !opts.skipPlayer) {
      const stars = p.data.stars + delta + (opts.cheat || 0);
      ops.push({ set: `players/${uid}`, data: { ...p.data, stars, gkey: globalKey(stars, Date.now() / 1000), lastBoard: '1-3', at: undefined }, updateTime: p.updateTime, serverTime: ['at'] });
    }
    return c.commit(ops);
  };
  // Impossible results.
  await denied(send({ ...entry({ stars: 3, pieces: s.par + 1, tries: 2, ms: 30000 }) }), '★★★ needs exactly par pieces');
  await denied(send({ ...entry({ stars: 2, pieces: s.par, tries: 2, ms: 30000 }) }), '★★ means more than par');
  await denied(send({ ...entry({ stars: 1, pieces: s.min - 1, tries: 2, ms: 30000 }) }), 'below the fewest to win');
  await denied(send({ ...entry({ stars: 3, pieces: s.par, tries: 2, ms: 30000 }), key: 1 }), 'forged key');
  await denied(send({ ...entry({ stars: 3, pieces: s.par, tries: 2, ms: 30000 }), par: s.par - 1, pieces: s.par - 1 }), 'forged par');
  await denied(send({ ...entry({ stars: 2, pieces: s.par + 1, tries: 2, ms: 30000 }) }, { cheat: 5 }), 'total of stars must follow');
  await denied(send({ ...entry({ stars: 2, pieces: s.par + 1, tries: 2, ms: 30000 }) }, { skipPlayer: true }), 'total must be updated');
  // A real one.
  await send(entry({ stars: 2, pieces: s.par + 1, tries: 4, ms: 61000 }));
  // Not better: refused. Better: accepted, and the total follows.
  await denied(send(entry({ stars: 2, pieces: s.par + 2, tries: 4, ms: 61000 })), 'worse result');
  await send(entry({ stars: 3, pieces: s.par, tries: 6, ms: 90000 }));
  const [p] = await c.getAll([`players/${uid}`]);
  assert.equal(p.data.stars, 3);
  // Somebody else cannot write in my name.
  const other = await rawPlayer('Nim');
  await denied(
    other.c.commit([{ set: `boards/1-3/entries/${uid}`, data: entry({ stars: 3, pieces: s.par, tries: 1, ms: 5000 }), serverTime: ['at'] }]),
    'foreign result',
  );
  // Unknown boards are refused.
  await denied(c.commit([{ set: `boards/9-9/entries/${uid}`, data: entry({ stars: 1, pieces: 3, tries: 1, ms: 5000 }), create: true, serverTime: ['at'] }]), 'unknown level');
});

test('a total of stars cannot be raised without the result that earns it', async () => {
  const { c, uid } = await rawPlayer('Lou');
  const [p] = await c.getAll([`players/${uid}`]);
  await denied(
    c.commit([{ set: `players/${uid}`, data: { ...p.data, at: undefined, stars: 200, gkey: globalKey(200, Date.now() / 1000), lastBoard: '1-1' }, updateTime: p.updateTime, serverTime: ['at'] }]),
  );
});

test('banned players cannot write', async () => {
  const { c, uid } = await rawPlayer('Bobo');
  await adminSet(`banned/${uid}`, { why: 'test' });
  const [p] = await c.getAll([`players/${uid}`]);
  await denied(c.commit([{ set: `players/${uid}`, data: { ...p.data, at: undefined, hat: 'crown' }, updateTime: p.updateTime, serverTime: ['at'] }]));
});

test('the game: pseudo, results sent, rankings, renaming, deleting', async () => {
  const A = service();
  const r = await A.online.choose('Comète Rusée', { color: 2 });
  assert.deepEqual(r, { ok: true });
  // The first result of a fresh player.
  A.online.track('1-1');
  A.online.addTry('1-1');
  A.online.tick('1-1', 12345);
  const w = A.online.win('1-1', { stars: 3, pieces: SOLUTIONS['1-1'].par });
  assert.equal(w.improved, true);
  assert.equal(await A.online.sync('1-1'), 'sent');
  assert.deepEqual(await A.online.standing('1-1'), { rank: 1, total: 1 });

  // Another player, better (fewer tries is not possible below 1: faster).
  const B = service();
  assert.deepEqual(await B.online.choose('comete rusee'), { ok: false, reason: 'taken' });
  assert.deepEqual(await B.online.choose('Pip le Malin'), { ok: true });
  B.online.addTry('1-1');
  B.online.tick('1-1', 4000);
  B.online.win('1-1', { stars: 3, pieces: SOLUTIONS['1-1'].par });
  assert.equal(await B.online.sync(), 'idle');
  const board = await A.online.board('1-1', { force: true });
  assert.equal(board.total, 2);
  assert.deepEqual(board.rows.map((x) => [x.rank, x.name, x.me]), [
    [1, 'Pip le Malin', false],
    [2, 'Comète Rusée', true],
  ]);
  assert.equal(board.rows[1].hat, 'crown');
  assert.equal(board.rows[1].color, 2);
  assert.equal(board.rows[1].ms, 12345);

  // A worse replay changes nothing; a result is kept if the server already has better.
  A.online.addTry('1-1');
  assert.equal(A.online.win('1-1', { stars: 3, pieces: SOLUTIONS['1-1'].par }).improved, false);

  // Global ranking: by total of stars, first to get there first.
  const g = await A.online.globalBoard({ force: true });
  assert.deepEqual(g.rows.map((x) => [x.rank, x.name, x.stars]).sort((a, b) => a[1].localeCompare(b[1])), [
    [1, 'Comète Rusée', 3],
    [1, 'Pip le Malin', 3],
  ]);

  // Renaming frees the old pseudo and keeps the results.
  assert.deepEqual(await A.online.choose('Aurore Filante'), { ok: true });
  assert.equal(await A.online.sync(), 'idle');
  const again = await A.online.board('1-1', { force: true });
  assert.ok(again.rows.some((x) => x.name === 'Aurore Filante'));
  assert.deepEqual(await B.online.choose('Comète Rusée'), { ok: true });
  assert.equal(await B.online.sync(), 'idle');

  // Reports are accepted (and unreadable).
  await A.online.report(B.online.me().uid, '1-1');

  // Delete everything: profile, results, pseudo and account.
  await A.online.deleteAll();
  const after = await B.online.board('1-1', { force: true });
  assert.deepEqual(after.rows.map((x) => x.name), ['Comète Rusée']);
  assert.equal(after.total, 1);
  assert.equal(await B.online.availability('Aurore Filante'), 'free');
  assert.equal(A.online.me().optOut, true);
});

test('results from before the rankings are sent once, time unknown', async () => {
  const save = fakeSave();
  save.data.levels = {
    '1-1': { done: true, stars: 3, best: 1, tries: 2, hint: false },
    '1-2': { done: true, stars: 2, best: 1, tries: 5, hint: true },
    '1-3': { done: true, stars: 1, best: 1, tries: 9 },
    '1-4': { done: false, stars: 0, tries: 3 },
  };
  const A = service(save);
  assert.equal(A.online.migrate(save.data.levels, SOLUTIONS), 3);
  assert.equal(A.online.pendingCount(), 3);
  await A.online.choose('Ancien Joueur');
  assert.equal(await A.online.sync(), 'idle');
  assert.equal(A.online.pendingCount(), 0);
  const b = await A.online.board('1-2', { force: true });
  assert.equal(b.rows[0].ms, UNKNOWN);
  assert.equal(b.rows[0].helped, true);
  assert.equal(b.rows[0].pieces, SOLUTIONS['1-2'].par + 1);
  const g = await A.online.globalBoard({ force: true });
  assert.equal(g.rows[0].stars, 6);
  // A level started before the update keeps its tries but not its time.
  A.online.track('1-4', save.data.levels['1-4']);
  A.online.addTry('1-4');
  A.online.tick('1-4', 20000);
  const w = A.online.win('1-4', { stars: 3, pieces: SOLUTIONS['1-4'].par });
  assert.equal(w.entry.tries, 4);
  assert.equal(w.entry.ms, UNKNOWN);
});

test('daily puzzles have their own rankings, open around their day only', async () => {
  const A = service();
  await A.online.choose('Matinal');
  const d = new Date();
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const bid = `d-${key}-meadow-3`;
  A.online.addTry(bid);
  A.online.tick(bid, 30000);
  A.online.win(bid, { stars: 3, pieces: DAILY.meadow[3][4] });
  assert.equal(await A.online.sync(bid), 'sent');
  const b = await A.online.board(bid, { force: true });
  assert.equal(b.rows[0].name, 'Matinal');
  // The total of stars does not count daily puzzles.
  const g = await A.online.globalBoard({ force: true });
  assert.equal(g.rows[0].stars, 0);
  // A puzzle from long ago is refused by the rules.
  const old = 'd-2026-01-02-meadow-3';
  const c = createClient(cfg, { session: { uid: A.online.me().uid, refresh: A.save.data.online.refresh } });
  const m = makeEntry({ stars: 3, pieces: DAILY.meadow[3][4], tries: 1, ms: 9000 });
  await denied(
    c.commit([{ set: `boards/${old}/entries/${A.online.me().uid}`, data: { ...m, min: DAILY.meadow[3][5], par: DAILY.meadow[3][4], v: 1 }, create: true, serverTime: ['at'] }]),
  );
});

test('énigmes have their own rankings, without changing the total of stars', async () => {
  const A = service();
  await A.online.choose('Futée');
  const e = ENIGMAS.pond[4];
  A.online.addTry('e2-05');
  A.online.tick('e2-05', 45000);
  A.online.win('e2-05', { stars: 3, pieces: e[4] });
  assert.equal(await A.online.sync('e2-05'), 'sent');
  const b = await A.online.board('e2-05', { force: true });
  assert.equal(b.rows[0].name, 'Futée');
  const g = await A.online.globalBoard({ force: true });
  assert.equal(g.rows[0].stars, 0);
  // Fewer pieces than the perfect layout, or an énigme that does not exist: refused.
  const c = createClient(cfg, { session: { uid: A.online.me().uid, refresh: A.save.data.online.refresh } });
  const uid = A.online.me().uid;
  const f = ENIGMAS.pond[5];
  const bad = makeEntry({ stars: 3, pieces: f[4] - 1, tries: 1, ms: 9000 });
  await denied(c.commit([{ set: `boards/e2-06/entries/${uid}`, data: { ...bad, min: f[5], par: f[4] - 1, v: 1 }, create: true, serverTime: ['at'] }]), 'forged par');
  const ok = makeEntry({ stars: 1, pieces: 9, tries: 1, ms: 9000 });
  await denied(c.commit([{ set: `boards/e2-21/entries/${uid}`, data: { ...ok, min: 5, par: 8, v: 1 }, create: true, serverTime: ['at'] }]), 'no such énigme');
});

test('presence: "online" or last seen, written only by the player, hidden on request', async () => {
  const A = service();
  // No profile on the server yet: nothing to show.
  assert.equal(await A.online.heartbeat({ force: true }), false);
  await A.online.choose('Veilleur');
  await A.online.sync();
  assert.equal(await A.online.heartbeat({ force: true }), true);
  const B = service();
  await B.online.choose('Curieux');
  const p = await B.online.presenceOf(A.online.me().uid);
  assert.ok(p && p.online, 'seen just now: online');
  // Nobody else can write it, nor set a time of their own.
  const uidA = A.online.me().uid;
  const other = await rawPlayer('Farceur');
  await denied(other.c.commit([{ set: `presence/${uidA}`, data: {}, serverTime: ['seen'] }]), 'foreign presence');
  await denied(other.c.commit([{ set: `presence/${other.uid}`, data: { seen: new Date(Date.now() + 86400000) } }]), 'forged time');
  await denied(other.c.commit([{ set: `presence/${other.uid}`, data: { note: 'x' }, serverTime: ['seen'] }]), 'extra field');
  // Hidden: the last time seen is gone, and no new beat is sent.
  await A.online.setShowPresence(false);
  assert.equal(await B.online.presenceOf(uidA), null);
  assert.equal(await A.online.heartbeat({ force: true }), false);
  // Deleting everything removes it too.
  await A.online.setShowPresence(true);
  assert.ok(await B.online.presenceOf(uidA));
  await A.online.deleteAll();
  assert.equal(await B.online.presenceOf(uidA), null);
});

test('a pseudo taken meanwhile is reported to the player', async () => {
  const A = service();
  // Chosen offline (as far as the server is concerned): someone takes it first.
  A.save.data.online = { name: 'Brume Douce', asked: true, optOut: false, color: 0 };
  await rawPlayer('Brume Douce');
  assert.equal(await A.online.sync(), 'taken');
  assert.equal(A.online.me().taken, true);
  assert.ok(A.changes.includes('taken'));
  assert.deepEqual(await A.online.choose('Brume Douce 2'), { ok: true });
  assert.equal(await A.online.sync(), 'idle');
  assert.equal(A.online.me().taken, false);
});

test('changing the look of the Lumignon updates the profile', async () => {
  let hat = 'beret';
  const A = service(fakeSave(), { look: () => ({ hat, glasses: 'round', flame: 'flame-heart' }) });
  await A.online.choose('Coquette');
  await A.online.sync();
  hat = 'tophat';
  await A.online.sync();
  const g = await A.online.globalBoard({ force: true });
  assert.equal(g.rows[0].hat, 'tophat');
  assert.equal(g.rows[0].glasses, 'round');
  assert.equal(g.rows[0].flame, 'flame-heart');
});
