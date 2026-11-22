import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newModel, toDef, fromDef, applyTool, resize, problems, encodeShare, decodeShare, cloneModel } from '../src/editor/model.js';
import { parseLevel, simulate } from '../src/engine/core.js';
import { solve } from '../src/engine/solver.js';
import { allLevels } from '../src/data/levels.js';

test('a new level is valid and playable', () => {
  const m = newModel();
  assert.deepEqual(problems(m), []);
  const L = parseLevel(toDef(m));
  assert.equal(L.walkers.length, 1);
  assert.ok(solve(L, {}).min !== null, 'the starter level can be solved');
});

test('tools paint terrain, place, rotate and remove entities', () => {
  const m = newModel();
  const i = 2 * m.w + 2;
  assert.ok(applyTool(m, i, '#'));
  assert.equal(m.cells[i].t, '#');
  assert.ok(applyTool(m, i, 'arrow'));
  assert.equal(m.cells[i].t, '.');
  assert.equal(m.cells[i].e, 'arrow');
  const d0 = m.cells[i].d;
  applyTool(m, i, 'arrow');
  assert.equal(m.cells[i].d, (d0 + 1) & 3, 'tapping again rotates');
  applyTool(m, i, '*');
  applyTool(m, i, '*');
  assert.equal(m.cells[i].e, null, 'tapping a firefly again removes it');
  applyTool(m, i, 'H');
  applyTool(m, i, 'H');
  assert.equal(m.gateOpen[0], true, 'tapping brambles again opens the whole group');
  applyTool(m, i, '~');
  assert.equal(m.cells[i].e, null, 'water clears entities');
});

test('every campaign level survives a round trip through the editor', () => {
  for (const def of allLevels()) {
    const m = fromDef(def);
    const back = toDef(m);
    const a = parseLevel(def);
    const b = parseLevel(back);
    assert.deepEqual(b.rows, a.rows, def.id);
    assert.deepEqual(
      b.walkers.map((w) => [w.x, w.y, w.dir, w.color]),
      a.walkers.map((w) => [w.x, w.y, w.dir, w.color]),
      def.id,
    );
    assert.deepEqual(b.vanes, a.vanes, def.id);
  }
});

test('share codes round-trip and reject garbage', () => {
  const def = allLevels().find((d) => d.id === '6-9');
  const m = fromDef(def, 'peak');
  m.name = 'Rose des vents';
  const code = encodeShare(m);
  assert.ok(code.startsWith('LUMI1.'));
  assert.ok(code.length < 400, `code length ${code.length}`);
  const back = decodeShare('regarde : https://example.org/#play=' + code + ' !');
  assert.equal(back.name, 'Rose des vents');
  assert.equal(back.theme, 'peak');
  const a = simulate(parseLevel(toDef(m)), []);
  const b = simulate(parseLevel(toDef(back)), []);
  assert.equal(a.result, b.result);
  assert.deepEqual(back.inv, m.inv);
  assert.throws(() => decodeShare('bonjour'));
  assert.throws(() => decodeShare('LUMI1.@@@'));
});

test('problems are explained in plain words', () => {
  const m = newModel();
  const lantern = m.cells.findIndex((c) => c.e === 'A');
  m.cells[lantern].e = null;
  assert.ok(problems(m).some((p) => p.fr.includes('lanterne')));
  const n = cloneModel(newModel());
  applyTool(n, 0 + n.w * 3, '@');
  assert.ok(problems(n).some((p) => p.fr.includes('jumelle')));
});

test('resizing keeps the top-left content', () => {
  const m = newModel();
  const r = resize(m, 4, 4);
  assert.equal(r.w, 4);
  assert.equal(r.cells[1 * 4 + 1].e, 'a');
  const big = resize(m, 20, 20);
  assert.equal(big.w, 8);
  assert.equal(big.h, 10);
});
