import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, simulate, canPlace, validateLevel, PIECE, rateRun } from '../src/engine/core.js';
import { solve, checkSolution } from '../src/engine/solver.js';

const lvl = (map, dirs = { a: 'E' }, inv = {}, extra = {}) => parseLevel({ id: 't', map, dirs, inv, ...extra });
const at = (L, x, y) => y * L.w + x;
const arrow = (L, x, y, d) => ({ idx: at(L, x, y), type: PIECE.ARROW, dir: 'NESW'.indexOf(d) });
const piece = (L, x, y, type) => ({ idx: at(L, x, y), type, dir: 0 });
const path = (sim, id = 0) => sim.frames.map((f) => `${f.walkers[id].x},${f.walkers[id].y}`);

test('a Lumignon walks straight and falls off the island edge', () => {
  const L = lvl(['a..', '..A']);
  const s = simulate(L, [], { record: true });
  assert.equal(s.result, 'fail');
  assert.equal(s.cause.type, 'fall');
  assert.deepEqual(path(s), ['0,0', '1,0', '2,0', '3,0']);
});

test('blocked by a wall: turns right (clockwise)', () => {
  const L = lvl(['a.#', '.A.']);
  const s = simulate(L, [], { record: true });
  assert.equal(s.result, 'win');
  assert.deepEqual(path(s), ['0,0', '1,0', '1,1']);
});

test('right blocked too: turns left; dead end: turns back', () => {
  const L1 = lvl(['..A', 'a.#', '.#.'], { a: 'E' });
  // At (1,1) facing E: wall ahead, wall on the right (S): it turns left (N).
  const s1 = simulate(L1, [], { record: true });
  assert.deepEqual(path(s1).slice(0, 3), ['0,1', '1,1', '1,0']);
  const L3 = lvl(['###.', 'A.a#', '####'], { a: 'E' });
  const s3 = simulate(L3, [], { record: true });
  assert.equal(s3.result, 'win');
  assert.deepEqual(path(s3), ['2,1', '1,1', '0,1']);
});

test('placed and engraved arrows redirect walkers', () => {
  const L = lvl(['a..', '...', '..A']);
  const s = simulate(L, [arrow(L, 2, 0, 'S')], { record: true });
  assert.equal(s.result, 'win');
  const F = lvl(['a.v', '...', '..A']);
  assert.equal(simulate(F, []).result, 'win');
});

test('water extinguishes, a lily pad lets the Lumignon cross', () => {
  const L = lvl(['a~A'], { a: 'E' }, { lily: 1 });
  const s = simulate(L, []);
  assert.equal(s.cause.type, 'water');
  assert.equal(simulate(L, [piece(L, 1, 0, PIECE.LILY)]).result, 'win');
  assert.equal(canPlace(L, at(L, 1, 0), PIECE.LILY), true);
  assert.equal(canPlace(L, at(L, 1, 0), PIECE.ARROW), false);
});

test('a lantern of another colour blocks, its own colour lets in', () => {
  const L = lvl(['aB', '..'], { a: 'E' });
  const s = simulate(L, [], { record: true });
  assert.deepEqual(path(s).slice(0, 2), ['0,0', '0,1']);
  const B = lvl(['bB'], { b: 'E' });
  assert.equal(simulate(B, []).result, 'win');
});

test('a spark must be collected before its lantern opens', () => {
  const L = lvl(['a.A#', '....', '.1..'], { a: 'E' }, { arrow: 4 });
  // Without the spark the lantern is closed: the Lumignon turns right before it.
  const s0 = simulate(L, [], { record: true });
  assert.equal(s0.frames[2].walkers[0].x, 1);
  assert.equal(s0.frames[2].walkers[0].y, 1);
  const sol = [arrow(L, 1, 0, 'S'), arrow(L, 1, 2, 'E'), arrow(L, 2, 2, 'N')];
  const s1 = simulate(L, sol, { record: true });
  assert.equal(s1.result, 'win');
  assert.ok(s1.frames.some((f) => f.events?.some((e) => e.type === 'spark')));
});

test('fireflies are counted', () => {
  const L = lvl(['a*.*A'], { a: 'E' });
  const s = simulate(L, []);
  assert.equal(s.result, 'win');
  assert.equal(s.fireflies, 2);
  assert.equal(s.allFireflies, true);
  assert.equal(rateRun(L, s, 0, 0), 3);
  assert.equal(rateRun(L, s, 2, 1), 2);
});

test('mushrooms make walkers jump two cells, over anything', () => {
  const L = lvl(['am#.A'], { a: 'E' });
  const s = simulate(L, [], { record: true });
  assert.deepEqual(path(s), ['0,0', '1,0', '3,0', '4,0']);
  assert.equal(s.result, 'win');
  const W = lvl(['am~.A'], { a: 'E' });
  assert.equal(simulate(W, []).result, 'win');
  // Landing cell blocked: turns right and jumps in the new direction.
  const B = lvl(['am.#', '....', '.A..'], { a: 'E' });
  const sb = simulate(B, [], { record: true });
  assert.deepEqual(path(sb).slice(0, 3), ['0,0', '1,0', '1,2']);
});

test('daisies make the walker wait one turn', () => {
  const L = lvl(['af.A'], { a: 'E' });
  const s = simulate(L, [], { record: true });
  assert.deepEqual(path(s), ['0,0', '1,0', '1,0', '2,0', '3,0']);
});

test('portals teleport and keep the direction', () => {
  const L = lvl(['a@#', '###', '@.A'], { a: 'E' });
  const s = simulate(L, [], { record: true });
  assert.equal(s.result, 'win');
  assert.deepEqual(path(s), ['0,0', '0,2', '1,2', '2,2']);
});

test('switch stones toggle brambles', () => {
  const L = lvl(['aPH.A'], { a: 'E' });
  assert.equal(simulate(L, []).result, 'win');
  const C = lvl(['a.H.A', '.....'], { a: 'E' });
  const s = simulate(C, [], { record: true });
  // Closed brambles behave like a wall.
  assert.equal(s.frames[2].walkers[0].y, 1);
  const O = lvl(['aPh.A', '.....'], { a: 'E' });
  const so = simulate(O, [], { record: true });
  assert.equal(so.frames[2].walkers[0].y, 1);
});

test('Gloomnibs catch Lumignons on the same cell or when crossing', () => {
  const L = lvl(['a..G', '....', 'A...'], { a: 'E', G: 'W' });
  const s = simulate(L, []);
  assert.equal(s.cause.type, 'caught');
  const X = lvl(['a.G.', '....', 'A...'], { a: 'E', G: 'W' });
  // a moves to (1,0) while G moves to (1,0): same cell.
  assert.equal(simulate(X, []).cause.type, 'caught');
  const Y = lvl(['aG..', '....', 'A...'], { a: 'E', G: 'W' });
  // they swap cells in the same turn.
  assert.equal(simulate(Y, []).cause.type, 'caught');
  const Z = lvl(['a.Z', '...', '..A'], { a: 'E' });
  assert.equal(simulate(Z, []).cause.type, 'caught');
});

test('Gloomnibs obey arrows and can fall into the void', () => {
  const L = lvl(['G.. ', '... ', 'a.A '], { a: 'E', G: 'E' });
  assert.equal(simulate(L, []).result, 'win');
  const S = lvl(['..G.', '....', 'a..A'], { a: 'E', G: 'S' });
  assert.equal(simulate(S, []).cause.type, 'caught');
  assert.equal(simulate(S, [arrow(S, 2, 1, 'W')]).result, 'win');
});

test('weathervanes turn a quarter clockwise after each use', () => {
  const L = lvl(['aR.', '...', '..A'], { a: 'E' }, {}, { vanes: 'S' });
  const s = simulate(L, [], { record: true });
  assert.equal(s.frames[1].vaneDir[0], 3);
  assert.equal(s.frames[1].walkers[0].dir, 2);
});

test('clouds vanish once left', () => {
  const L = lvl(['ao.#', '..A.'], { a: 'E' });
  const s = simulate(L, [], { record: true });
  assert.equal(s.result, 'win');
  assert.equal(s.frames[2].broken[at(L, 1, 0)], 1);
  // Coming back onto a vanished cloud is a fall.
  const R = lvl(['ao.', '..A'], { a: 'E' }, { arrow: 1 });
  const sr = simulate(R, [arrow(R, 2, 0, 'W')]);
  assert.equal(sr.cause.type, 'fall');
});

test('engraved mirrors reflect like light: / and \\ in every direction', () => {
  // '/' : east → north, north → east, west → south, south → west.
  const L1 = lvl(['..A', 'a./', '...'], { a: 'E' });
  assert.deepEqual(path(simulate(L1, [], { record: true })), ['0,1', '1,1', '2,1', '2,0']);
  const L2 = lvl(['...', '/.a', 'A..'], { a: 'W' });
  assert.deepEqual(path(simulate(L2, [], { record: true })), ['2,1', '1,1', '0,1', '0,2']);
  // '\\' : east → south, south → east, west → north, north → west.
  const L3 = lvl(['a.\\', '...', '..A'], { a: 'E' });
  const s3 = simulate(L3, [], { record: true });
  assert.equal(s3.result, 'win', 'east → south, down to the lantern');
  assert.deepEqual(path(s3), ['0,0', '1,0', '2,0', '2,1', '2,2']);
  const L4 = lvl(['A..', '\\..', 'a..'], { a: 'N' });
  const s4 = simulate(L4, [], { record: true });
  assert.deepEqual(path(s4).slice(0, 3), ['0,2', '0,1', '-1,1'], 'north → west');
});

test('placed mirrors take one of two orientations', () => {
  const L = lvl(['a...', '....', '...A'], { a: 'E' }, { mirror: 1 });
  const m = (x, y, o) => ({ idx: at(L, x, y), type: PIECE.MIRROR, dir: o });
  assert.equal(simulate(L, [m(3, 0, 1)]).result, 'win', "'\\\\' sends it down to the lantern");
  assert.equal(simulate(L, [m(3, 0, 0)]).result, 'fail', "'/' sends it up, off the island");
  assert.equal(canPlace(L, at(L, 1, 0), PIECE.MIRROR), true);
  const W = lvl(['a/~', '..A'], { a: 'E' }, { mirror: 1 });
  assert.equal(canPlace(W, at(W, 1, 0), PIECE.MIRROR), false, 'not on an engraved mirror');
  assert.equal(canPlace(W, at(W, 2, 0), PIECE.MIRROR), false, 'not on water');
  assert.equal(canPlace(W, at(W, 1, 0), PIECE.ARROW), false, 'nothing else on an engraved mirror');
});

test('a mirror bounces a returning walker the other way', () => {
  // East into '/' goes north into a dead end, turns back south, and the same
  // mirror now sends it west, back where it came from.
  const L = lvl(['####', '##.#', 'a./#', '###A'], { a: 'E' });
  const s = simulate(L, [], { record: true });
  assert.deepEqual(path(s), ['0,2', '1,2', '2,2', '2,1', '2,2', '1,2', '0,2', '-1,2']);
  assert.equal(s.result, 'fail');
});

test('Gloomnibs obey mirrors; a mushroom jump landing on a mirror is reflected', () => {
  const G = lvl(['a.....', '......', 'G..\\..', '......', 'A.....'], { a: 'S', G: 'E' });
  const sg = simulate(G, [], { record: true });
  assert.deepEqual(path(sg, 1).slice(0, 5), ['0,2', '1,2', '2,2', '3,2', '3,3']);
  const M = lvl(['am./', '....', '..A.'], { a: 'E' });
  const sm = simulate(M, [], { record: true });
  // a: (0,0) → mushroom (1,0) → jumps to (3,0) '/' → north, off the board.
  assert.deepEqual(path(sm).slice(0, 3), ['0,0', '1,0', '3,0']);
  assert.equal(sm.result, 'fail');
});

test('a comet turns the first walker that steps on it, then flies away', () => {
  const comet = (L, x, y, d) => ({ idx: at(L, x, y), type: PIECE.COMET, dir: 'NESW'.indexOf(d) });
  // Pip walks east: the comet sends him south, he reaches the lantern.
  const L = lvl(['a...', '...A'], { a: 'E' }, { comet: 1 });
  const s = simulate(L, [comet(L, 3, 0, 'S')], { record: true });
  assert.equal(s.result, 'win');
  assert.equal(s.final.spent[at(L, 3, 0)], 1, 'spent once used');
  assert.ok(s.frames.some((f) => f.events?.some((e) => e.type === 'comet')));
  // Two Lumignons on the same row: the first one turns, the second goes straight on.
  const T2 = lvl(['ba..', '..A.', '..B.'], { a: 'E', b: 'E' }, { comet: 1 });
  const s2 = simulate(T2, [comet(T2, 2, 0, 'S')], { record: true });
  // (walkers are numbered in reading order: Nim, at the far left, is walker 0)
  assert.equal(path(s2, 1).slice(0, 3).join(' '), '1,0 2,0 2,1');
  assert.equal(path(s2, 0).slice(0, 4).join(' '), '0,0 1,0 2,0 3,0');
  // A loop of arrows becomes a single lap: the comet sends Pip into the loop
  // once, and on the next lap he goes straight through to the lantern.
  const R = lvl(['#   ', 'a..A', '..  '], { a: 'E' }, { arrow: 2, comet: 1 });
  const lap = [comet(R, 1, 1, 'S'), arrow(R, 1, 2, 'W'), arrow(R, 0, 2, 'N')];
  const r = simulate(R, lap, { record: true });
  assert.deepEqual(path(r), ['0,1', '1,1', '1,2', '0,2', '0,1', '1,1', '2,1', '3,1']);
  assert.equal(r.result, 'win');
  // With an arrow instead of the comet the same layout loops forever.
  const loop = simulate(R, [arrow(R, 1, 1, 'S'), ...lap.slice(1)]);
  assert.equal(loop.cause?.type, 'loop');
  // Comets go on grass only, like arrows; the solver uses them.
  assert.equal(canPlace(R, at(R, 3, 1), PIECE.COMET), false);
  const best = solve(L, { countCap: 2 });
  assert.equal(best.min, 1);
  assert.equal(best.solutions[0][0].type, PIECE.COMET);
});

test('Lumignons pass through each other', () => {
  const L = lvl(['Ba.bA'], { a: 'E', b: 'W' });
  const s = simulate(L, [], { record: true });
  assert.equal(s.result, 'win');
});

test('endless loops are detected', () => {
  const L = lvl(['....', 'a...', '....', '...A'], { a: 'E' });
  const s = simulate(L, [arrow(L, 1, 1, 'S'), arrow(L, 1, 2, 'E'), arrow(L, 2, 2, 'N'), arrow(L, 2, 1, 'W')]);
  assert.equal(s.result, 'fail');
  assert.equal(s.cause.type, 'loop');
});

test('placement rules', () => {
  const L = lvl(['a.#~', '*1A ', 'v@.@'], { a: 'E' });
  assert.equal(canPlace(L, at(L, 0, 0), PIECE.ARROW), false, 'start cell');
  assert.equal(canPlace(L, at(L, 1, 0), PIECE.ARROW), true, 'grass');
  assert.equal(canPlace(L, at(L, 2, 0), PIECE.ARROW), false, 'wall');
  assert.equal(canPlace(L, at(L, 0, 1), PIECE.DAISY), true, 'firefly cell');
  assert.equal(canPlace(L, at(L, 2, 1), PIECE.ARROW), false, 'lantern');
  assert.equal(canPlace(L, at(L, 3, 1), PIECE.ARROW), false, 'void');
  assert.equal(canPlace(L, at(L, 0, 2), PIECE.ARROW), false, 'engraved arrow');
  assert.equal(canPlace(L, at(L, 1, 2), PIECE.ARROW), false, 'portal');
});

test('validation catches missing lanterns', () => {
  const L = lvl(['a.b', 'A..'], { a: 'E', b: 'W' });
  assert.ok(validateLevel(L).some((e) => e.includes('blue')));
});

test('solver finds minimal solutions and they check out', () => {
  const L = lvl(['......', '.a...#', '......', '.*..A.'], { a: 'E' }, { arrow: 3 });
  const any = solve(L, {});
  assert.equal(any.min, 0);
  const perfect = solve(L, { fireflies: true, countCap: 3 });
  assert.equal(perfect.min, 3);
  for (const sol of perfect.solutions) {
    const c = checkSolution(L, sol);
    assert.ok(c.ok);
    assert.equal(c.sim.allFireflies, true);
  }
  const none = lvl(['a.~.A'], { a: 'E' }, { arrow: 1 });
  assert.equal(solve(none, {}).min, null);
});
