import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportBackup, importBackup } from '../src/backup.js';

const sample = () => {
  const levels = {};
  for (let w = 1; w <= 7; w++) for (let l = 1; l <= 10; l++) levels[`${w}-${l}`] = { done: true, stars: 3, fireflies: 2, best: 4, tries: 1 };
  return { v: 1, levels, settings: { lang: 'fr', openAll: true }, custom: [{ name: 'Mon île ✨', def: { map: ['a./', '.\\A'] } }] };
};

test('a backup code round-trips, survives line breaks and stays short', async () => {
  const data = sample();
  const code = await exportBackup(data);
  assert.match(code, /^LUMISAVE1\.[zj]\.[A-Za-z0-9_-]+$/);
  assert.ok(code.length < JSON.stringify(data).length / 3, `code too long: ${code.length}`);
  const pasted = '  ' + code.slice(0, 25) + '\n' + code.slice(25, 60) + ' ' + code.slice(60) + '\n';
  assert.deepEqual(await importBackup(pasted), data);
});

test('plain codes (browsers without compression) are read too', async () => {
  const data = sample();
  const b64 = Buffer.from(JSON.stringify(data)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.deepEqual(await importBackup('LUMISAVE1.j.' + b64), data);
});

test('anything else is refused', async () => {
  for (const bad of ['', 'hello', 'LUMI1.abc', 'LUMISAVE1.j.' + Buffer.from('{"v":2,"levels":{}}').toString('base64'), 'LUMISAVE1.j.' + Buffer.from('[1,2]').toString('base64')]) {
    await assert.rejects(importBackup(bad), `accepted: ${bad}`);
  }
});
