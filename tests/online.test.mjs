// Online rankings, without network: pseudos, ranking keys, value coding, and
// how the game behaves when Firebase cannot be reached. The rules themselves
// are tested against the Firebase emulators: npm run test:online.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkName, nameKey, cleanName, isRude, suggestName, variantOf, NAME_MAX } from '../src/online/names.js';
import { rankKey, makeEntry, formatTime, ordinal, levelBoard, dailyBoard, isDailyBoard, boardDay, globalKey, UNKNOWN } from '../src/online/score.js';
import { enc, dec, encFields, decFields } from '../src/online/firebase.js';
import { createOnline } from '../src/online/online.js';
import { SOLUTIONS } from '../src/data/solutions.js';
import { WORLDS } from '../src/data/levels.js';

test('pseudos: allowed shapes', () => {
  for (const ok of ['Lune', 'Lune Rêveuse', "L'Écureuil", 'Pip_42', 'Æsa Œuvre', 'Zoé-Lou', 'Comète Rusée 27', 'abc']) {
    assert.equal(checkName(ok), null, ok);
  }
  assert.equal(checkName('ab'), 'short');
  assert.equal(checkName('a'.repeat(NAME_MAX + 1)), 'long');
  assert.equal(checkName('Lune 🌙'), 'chars');
  assert.equal(checkName('<b>Lune'), 'chars');
  assert.equal(checkName('-Lune'), 'edge');
  assert.equal(checkName('Lune  Bleue'), null, 'spaces are tidied first');
  assert.equal(checkName('Lune--Bleue'), 'spaces');
  assert.equal(checkName('12345'), 'letters');
  assert.equal(checkName('Admin'), 'reserved');
  assert.equal(checkName('  Lune   Bleue '), null);
  assert.equal(cleanName('  Lune   Bleue ’s '), "Lune Bleue 's");
});

test('pseudos: one key for every spelling of a name', () => {
  assert.equal(nameKey('Lune-Rêveuse'), 'lunereveuse');
  assert.equal(nameKey('LUNE RÊVEUSE'), 'lunereveuse');
  assert.equal(nameKey('lune.reveuse'), 'lunereveuse');
  assert.equal(nameKey('Æsa Œuvre Ñoño'), 'aesaoeuvrenono');
  assert.equal(nameKey('Straße'), 'strasse');
  assert.notEqual(nameKey('Lune 1'), nameKey('Lune 2'));
});

test('pseudos: rude words are refused, innocent names are not', () => {
  for (const bad of ['Connard', 'gros con', 'C0nnard', 'Fuuuuck', 'Sale Pute', 'PD du 75', 'Hitler', 'Nazi', 'enculé', 'Salope', 'Ta Mère', 'tamere', 'SS 88', 'BITCH 99']) {
    assert.ok(isRude(bad), bad);
    assert.equal(checkName(bad), 'rude', bad);
  }
  for (const good of ['Constance', 'Concombre', 'Nazir', 'Niger', 'Pascal', 'Cassis', 'Unique', 'Technique', 'Violette', 'As de pique', 'Lou 55', 'Pip 88', 'Bitume', 'Scott', 'Pétale']) {
    assert.ok(!isRude(good), good);
  }
});

test('pseudos: suggestions are valid and change', () => {
  let seed = 1;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    for (const lang of ['fr', 'en']) {
      const s = suggestName(lang, rng, i % 2 === 0);
      assert.equal(checkName(s), null, s);
      seen.add(s);
    }
  }
  assert.ok(seen.size > 150);
  const v = variantOf('Comète Rusée', rng);
  assert.match(v, /^Comète Rusée \d{2}$/);
  assert.equal(checkName(variantOf('Mystérieuse Étoile', rng)), null);
});

test('ranking key: stars, then pieces, then no hint, then tries, then time', () => {
  const k = (o) => rankKey({ stars: 3, pieces: 4, helped: false, tries: 2, ms: 60000, ...o });
  assert.ok(k({ stars: 3 }) < k({ stars: 2, pieces: 3 }));
  assert.ok(k({ stars: 2, pieces: 5 }) < k({ stars: 2, pieces: 6 }));
  assert.ok(k({ helped: false, tries: 50 }) < k({ helped: true, tries: 1 }));
  assert.ok(k({ tries: 2, ms: 999999 }) < k({ tries: 3, ms: 1000 }));
  assert.ok(k({ ms: 1000 }) < k({ ms: 2000 }));
  assert.ok(k({ ms: 99999998 }) < k({ ms: UNKNOWN }));
  // The largest key still fits in a double exactly.
  const big = rankKey({ stars: 1, pieces: 99, helped: true, tries: 99999, ms: 1e12 });
  assert.ok(Number.isSafeInteger(big));
  // The formula of firestore.rules.
  const e = makeEntry({ stars: 2, pieces: 7, helped: true, tries: 12, ms: 83456 });
  assert.equal(e.key, ((((3 - 2) * 64 + 7) * 2 + 1) * 10000 + 12) * 100000000 + 83456);
  assert.equal(makeEntry({ stars: 3, pieces: 2, tries: 0, ms: 10 }).tries, 1);
  assert.equal(makeEntry({ stars: 3, pieces: 2, tries: 1, ms: 10 }).ms, 1000);
  assert.equal(makeEntry({ stars: 3, pieces: 2, tries: 1, ms: UNKNOWN }).ms, UNKNOWN);
});

test('boards and the global key', () => {
  for (const w of WORLDS) for (const lv of [...w.levels, w.bonus]) assert.equal(levelBoard(lv.id), lv.id);
  assert.equal(levelBoard('daily-2026-01-01'), null);
  const b = dailyBoard({ key: '2026-11-22', theme: 'meadow', idx: 7 });
  assert.equal(b, 'd-2026-11-22-meadow-7');
  assert.ok(isDailyBoard(b));
  assert.equal(boardDay(b), '2026-11-22');
  assert.ok(globalKey(10, 2e9) < globalKey(9, 1e9));
  assert.ok(globalKey(10, 1e9) < globalKey(10, 2e9));
  assert.ok(Number.isSafeInteger(globalKey(0, 4e9)));
});

test('display helpers', () => {
  assert.equal(formatTime(UNKNOWN), '—');
  assert.equal(formatTime(42000), '42 s');
  assert.equal(formatTime(185000), '3 min 05');
  assert.equal(formatTime(4320000), '1 h 12');
  assert.equal(ordinal(1), '1<sup>er</sup>');
  assert.equal(ordinal(2), '2<sup>e</sup>');
  assert.equal(ordinal(1, 'en'), '1<sup>st</sup>');
  assert.equal(ordinal(12, 'en'), '12<sup>th</sup>');
  assert.equal(ordinal(23, 'en'), '23<sup>rd</sup>');
});

test('Firestore values round-trip', () => {
  const o = { a: 1, b: 'x', c: true, d: null, e: [1, 'y'], f: { g: 2.5 }, big: 383999999999999 };
  assert.deepEqual(decFields(encFields(o)), o);
  assert.deepEqual(enc(7), { integerValue: '7' });
  assert.equal(dec({ timestampValue: '2026-11-22T10:00:00Z' }), Date.parse('2026-11-22T10:00:00Z'));
});

function offlineService(fetchImpl) {
  const save = { data: { levels: {} } };
  const online = createOnline({
    save,
    persist: () => {},
    config: { apiKey: 'k', projectId: 'p' },
    fetch: fetchImpl,
    look: () => ({ hat: 'none' }),
    info: (b) => SOLUTIONS[b] || null,
    levelBoards: () => Object.keys(SOLUTIONS),
  });
  return { save, online };
}

test('offline: the pseudo is kept, results wait, nothing is lost', async () => {
  const { save, online } = offlineService(async () => {
    throw new TypeError('Failed to fetch');
  });
  assert.equal(online.needsName(), true);
  assert.deepEqual(await online.choose('Lune Rêveuse'), { ok: true });
  assert.equal(save.data.online.name, 'Lune Rêveuse');
  assert.equal(online.needsName(), false);
  online.addTry('1-1');
  online.tick('1-1', 5000);
  assert.equal(online.win('1-1', { stars: 3, pieces: 1 }).improved, true);
  assert.equal(await online.sync('1-1'), 'offline');
  assert.equal(online.status, 'offline');
  assert.equal(online.pendingCount(), 1);
  assert.equal(online.record('1-1').best.tries, 1);
});

test('not configured: everything stays local', async () => {
  const save = { data: { levels: {} } };
  const online = createOnline({ save, persist: () => {}, config: { apiKey: '', projectId: '' }, look: () => ({}), info: () => null });
  assert.equal(online.configured, false);
  assert.equal(online.status, 'off');
  assert.deepEqual(await online.choose('Pip'), { ok: true });
  assert.equal(await online.sync(), 'off');
  assert.equal(await online.availability('Pip'), 'unknown');
  assert.deepEqual(await online.choose('Connard'), { ok: false, reason: 'rude' });
});

test('opting out: no pseudo asked, nothing sent', async () => {
  let calls = 0;
  const { online } = offlineService(async () => {
    calls++;
    throw new TypeError('x');
  });
  online.setOptOut(true);
  assert.equal(online.needsName(), false);
  online.win('1-1', { stars: 3, pieces: 1 });
  assert.equal(await online.sync(), 'inactive');
  assert.equal(calls, 0);
});
