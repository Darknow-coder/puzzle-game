// "Énigmes": for each world, a book of 20 extra puzzles, harder and harder,
// opened once the world is finished. They are generated (tools/generate.mjs,
// recipes "…Hard") and proven by the solver to have exactly one perfect layout
// (tools/build-enigmas.mjs → src/data/enigmas.js).
import { ENIGMAS } from './data/enigmas.js';
import { decodeEntry } from './daily.js';

export const PACK_SIZE = 20;
const RE = /^e([1-9])-(\d{2})$/;

/** "e3-07" for the 7th puzzle of world 3. */
export const enigmaId = (wi, i) => `e${wi + 1}-${String(i + 1).padStart(2, '0')}`;
export const isEnigma = (id) => RE.test(id || '');

/** Number of puzzles in a world's book (0 while none was generated). */
export const packSize = (theme) => Math.min(PACK_SIZE, ENIGMAS[theme]?.length || 0);

/** Difficulty tier of the i-th puzzle (0-based): 0 clever, 1 cunning, 2 genius. */
export const tierOf = (i) => (i < 7 ? 0 : i < 14 ? 1 : 2);

const cache = new Map();
/** { wi, i, def, solution } of an enigma id, given the worlds (for their themes). */
export function findEnigma(id, worlds) {
  if (cache.has(id)) return cache.get(id);
  const m = RE.exec(id || '');
  if (!m) return null;
  const wi = +m[1] - 1;
  const i = +m[2] - 1;
  const w = worlds[wi];
  const e = w && ENIGMAS[w.id]?.[i];
  if (!e) return null;
  const d = decodeEntry(e, w.id, id, i);
  d.def.id = id;
  d.def.name = { fr: `Énigme ${i + 1}`, en: `Puzzle ${i + 1}` };
  const out = { wi, i, def: d.def, solution: d.solution };
  cache.set(id, out);
  return out;
}

/** Fewest pieces to win and for ★★★ (for the online rankings). */
export function enigmaInfo(id, worlds) {
  const f = findEnigma(id, worlds);
  return f ? { min: f.solution.min, par: f.solution.par } : null;
}
