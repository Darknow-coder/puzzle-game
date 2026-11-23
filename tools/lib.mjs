// Shared helpers for the level tools (Node only).
import { parseLevel, simulate, validateLevel, PIECE, PIECE_KEYS, DIR_CHARS } from '../src/engine/core.js';
import { solve, checkSolution } from '../src/engine/solver.js';

const ARROWS = ['↑', '→', '↓', '←'];
const COMETS = ['⇡', '⇢', '⇣', '⇠'];

export function overlay(L, placements) {
  const rows = L.rows.map((r) => r.padEnd(L.w, ' ').split(''));
  for (const p of placements) {
    const x = p.idx % L.w;
    const y = (p.idx / L.w) | 0;
    rows[y][x] = p.type === PIECE.ARROW ? ARROWS[p.dir] : p.type === PIECE.COMET ? COMETS[p.dir] : p.type === PIECE.MIRROR ? (p.dir ? '⟍' : '⟋') : p.type === PIECE.LILY ? 'L' : p.type === PIECE.MUSHROOM ? 'M' : 'F';
  }
  return rows.map((r) => '   ' + r.join('')).join('\n');
}

export function describe(p, L) {
  const x = p.idx % L.w;
  const y = (p.idx / L.w) | 0;
  const t = PIECE_KEYS[p.type];
  const o = p.type === PIECE.ARROW || p.type === PIECE.COMET ? ' ' + DIR_CHARS[p.dir] : p.type === PIECE.MIRROR ? ' ' + '/\\'[p.dir] : '';
  return `${t}${o}@${x},${y}`;
}

/** Full analysis of one level definition. */
export function analyse(def, { cap = 12, timeLimitMs = 120000 } = {}) {
  const L = parseLevel(def);
  const errors = validateLevel(L);
  const empty = simulate(L, []);
  const t0 = Date.now();
  const win = solve(L, { countCap: 1, timeLimitMs });
  const perfect = solve(L, { fireflies: true, countCap: cap, timeLimitMs });
  const ms = Date.now() - t0;
  return { L, errors, empty, win, perfect, ms };
}

export function report(def, a) {
  const { L, errors, empty, win, perfect, ms } = a;
  const inv = Object.entries(L.inventory)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}×${v}`)
    .join(' ');
  const lines = [];
  lines.push(`■ ${def.id}  ${def.name?.fr || ''}   [${L.w}x${L.h}] inv: ${inv}  fireflies: ${L.fireflies.length}  (${ms}ms)`);
  if (errors.length) lines.push('  !! ' + errors.join('; '));
  lines.push(`  no pieces → ${empty.result}${empty.cause ? ' (' + empty.cause.type + ')' : ''}${empty.result === 'win' ? ' fireflies ' + empty.fireflies : ''}`);
  lines.push(`  ★ min pieces: ${win.timedOut ? 'TIMEOUT' : win.min}`);
  lines.push(
    `  ★★★ par: ${perfect.timedOut ? 'TIMEOUT' : perfect.min}   optimal solutions: ${perfect.solutions.length}${perfect.solutions.length >= 12 ? '+' : ''}   nodes ${perfect.nodes}`,
  );
  if (perfect.solutions[0]) {
    lines.push('  e.g. ' + perfect.solutions[0].map((p) => describe(p, L)).join(', '));
    lines.push(overlay(L, perfect.solutions[0]));
  }
  return lines.join('\n');
}

export { parseLevel, simulate, solve, checkSolution };
