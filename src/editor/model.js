// Level editor model: an editable grid <-> the campaign's level definition
// format, plus compact share codes. Pure module (works in Node for tests).
import { parseLevel, validateLevel, simulate, KIND, COLORS, DIR_CHARS } from '../engine/core.js';

export const THEMES = ['meadow', 'pond', 'grove', 'ruins', 'gloom', 'peak'];
export const MIN_W = 3;
export const MAX_W = 8;
export const MIN_H = 3;
export const MAX_H = 10;

const TERRAIN = new Set(['.', ' ', '#', '~', 'o']);
const DIRECTED = new Set(['a', 'b', 'c', 'd', 'arrow', 'R', 'G']);

/** A fresh little island with Pip and his lantern. */
export function newModel(name = 'Mon niveau', theme = 'meadow') {
  const w = 6;
  const h = 7;
  const cells = [];
  for (let i = 0; i < w * h; i++) cells.push({ t: '.', e: null, d: 1 });
  const m = { name, theme, w, h, cells, gateOpen: [false, false], inv: { arrow: 3, lily: 0, mushroom: 0, daisy: 0 } };
  // Rounded corners.
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) m.cells[y * w + x].t = ' ';
  set(m, 1, 1, { t: '.', e: 'a', d: 1 });
  set(m, 4, 5, { t: '.', e: 'A', d: 0 });
  return m;
}

function set(m, x, y, c) {
  m.cells[y * m.w + x] = { ...m.cells[y * m.w + x], ...c };
}

export function cloneModel(m) {
  return { ...m, cells: m.cells.map((c) => ({ ...c })), gateOpen: [...m.gateOpen], inv: { ...m.inv } };
}

/** Resizes the grid, keeping the top-left content. */
export function resize(m, w, h) {
  w = Math.max(MIN_W, Math.min(MAX_W, w));
  h = Math.max(MIN_H, Math.min(MAX_H, h));
  const cells = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      cells.push(x < m.w && y < m.h ? { ...m.cells[y * m.w + x] } : { t: '.', e: null, d: 1 });
    }
  return { ...m, w, h, cells };
}

/**
 * Applies a palette tool to a cell. Returns true when something changed.
 * Tools: terrain chars ('.', ' ', '#', '~', 'o') or entity codes
 * ('a'..'d', 'A'..'D', '1'..'4', '*', 'arrow', 'm', 'f', '@', '%', 'P', 'Q', 'H', 'K', 'R', 'G', 'Z').
 */
export function applyTool(m, idx, tool, { repeat = false } = {}) {
  const c = m.cells[idx];
  if (TERRAIN.has(tool)) {
    if (c.t === tool && !c.e) return false;
    if (tool === '~' || tool === 'o' || tool === ' ' || tool === '#') {
      c.e = null;
    }
    c.t = tool;
    return true;
  }
  // Entities stand on grass.
  if (c.e === tool) {
    if (repeat) return false;
    if (DIRECTED.has(tool)) {
      c.d = (c.d + 1) & 3;
      return true;
    }
    if (tool === 'H' || tool === 'K') {
      const g = tool === 'H' ? 0 : 1;
      m.gateOpen[g] = !m.gateOpen[g];
      return true;
    }
    // Same entity again: remove it.
    c.e = null;
    return true;
  }
  c.t = '.';
  c.e = tool;
  if (tool === 'G' || tool === 'R') c.d = 2;
  else if (!DIRECTED.has(tool)) c.d = 0;
  return true;
}

/** Converts the model to a level definition (the campaign format). */
export function toDef(m, { forRender = false } = {}) {
  const rows = [];
  const dirs = {};
  let vanes = '';
  // Portals must come in pairs; while editing, a lone one is drawn as grass.
  const count = { '@': 0, '%': 0 };
  for (const c of m.cells) if (c.e === '@' || c.e === '%') count[c.e]++;
  for (let y = 0; y < m.h; y++) {
    let row = '';
    for (let x = 0; x < m.w; x++) {
      const c = m.cells[y * m.w + x];
      let ch = c.t;
      if (c.e) {
        switch (c.e) {
          case 'arrow':
            ch = '^>v<'[c.d];
            break;
          case 'H':
            ch = m.gateOpen[0] ? 'h' : 'H';
            break;
          case 'K':
            ch = m.gateOpen[1] ? 'k' : 'K';
            break;
          case '@':
          case '%':
            ch = forRender && count[c.e] !== 2 ? '.' : c.e;
            break;
          default:
            ch = c.e;
        }
        if ('abcdG'.includes(c.e)) dirs[c.e] = (dirs[c.e] || '') + DIR_CHARS[c.d];
        if (c.e === 'R') vanes += DIR_CHARS[c.d];
      }
      row += ch;
    }
    rows.push(row);
  }
  const def = { id: 'custom', name: { fr: m.name, en: m.name }, map: rows, dirs, inv: { ...m.inv } };
  if (vanes) def.vanes = vanes;
  return def;
}

/** Rebuilds an editor model from a level definition. */
export function fromDef(def, theme = 'meadow') {
  const rows = def.map;
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const cursor = {};
  const takeDir = (key) => {
    const s = (key === 'R' ? def.vanes : def.dirs?.[key]) || 'E';
    const i = cursor[key] || 0;
    cursor[key] = i + 1;
    return Math.max(0, DIR_CHARS.indexOf(s[Math.min(i, s.length - 1)]));
  };
  const m = { name: def.name?.fr || def.name || 'Niveau', theme, w, h, cells: [], gateOpen: [false, false], inv: { arrow: 0, lily: 0, mushroom: 0, daisy: 0, ...(def.inv || {}) } };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x] ?? ' ';
      const cell = { t: '.', e: null, d: 0 };
      if (TERRAIN.has(ch) || ch === '_') cell.t = ch === '_' ? ' ' : ch;
      else if ('^>v<'.includes(ch)) {
        cell.e = 'arrow';
        cell.d = '^>v<'.indexOf(ch);
      } else if (ch === 'h' || ch === 'H') {
        cell.e = 'H';
        m.gateOpen[0] = ch === 'h';
      } else if (ch === 'k' || ch === 'K') {
        cell.e = 'K';
        m.gateOpen[1] = ch === 'k';
      } else {
        cell.e = ch;
        if ('abcdG'.includes(ch) || ch === 'R') cell.d = takeDir(ch);
      }
      m.cells.push(cell);
    }
  return m;
}

/** Problems that prevent playing the level, in plain words (French + English). */
export function problems(m) {
  const out = [];
  const count = (e) => m.cells.filter((c) => c.e === e).length;
  const lumis = m.cells.filter((c) => c.e && 'abcd'.includes(c.e));
  if (!lumis.length) out.push({ fr: 'Ajoute au moins un Lumignon.', en: 'Add at least one Lumignon.' });
  for (let k = 0; k < 4; k++) {
    const l = 'abcd'[k];
    if (count(l) && !count(l.toUpperCase())) out.push({ fr: `Il manque la lanterne de ${['Pip', 'Nim', 'Lou', 'Bo'][k]}.`, en: `${['Pip', 'Nim', 'Lou', 'Bo'][k]} has no lantern.` });
    if (count(String(k + 1)) > 1) out.push({ fr: 'Une seule étincelle par couleur.', en: 'Only one spark per colour.' });
    if (count(String(k + 1)) && !count(l)) out.push({ fr: `Étincelle sans Lumignon de sa couleur.`, en: 'A spark has no Lumignon of its colour.' });
  }
  for (const p of ['@', '%']) {
    const n = count(p);
    if (n && n !== 2) out.push({ fr: 'Chaque arche de lune a besoin d’exactement une jumelle.', en: 'Each moon gate needs exactly one twin.' });
  }
  if (count('*') > 30) out.push({ fr: 'Trop de lucioles (30 au plus).', en: 'Too many fireflies (30 at most).' });
  const pieces = m.inv.arrow + m.inv.lily + m.inv.mushroom + m.inv.daisy;
  if (pieces > 12) out.push({ fr: 'Pas plus de 12 pièces au total.', en: 'No more than 12 pieces in total.' });
  if (!out.length) {
    try {
      const L = parseLevel(toDef(m));
      for (const e of validateLevel(L)) out.push({ fr: e, en: e });
    } catch (err) {
      out.push({ fr: err.message, en: err.message });
    }
  }
  return out;
}

/** Quick facts used by the editor before a full verification. */
export function quickCheck(m) {
  const L = parseLevel(toDef(m));
  const sim = simulate(L, []);
  return { winsEmpty: sim.result === 'win', lumis: L.walkers.filter((w) => w.kind === KIND.LUMI).length };
}

// ---------------------------------------------------------------------------
// Share codes: "LUMI1." + base64url(JSON). Short enough to paste in a message.

function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeShare(m) {
  const def = toDef(m);
  const inv = [def.inv.arrow, def.inv.lily, def.inv.mushroom, def.inv.daisy].join('');
  const payload = { n: m.name.slice(0, 40), t: THEMES.indexOf(m.theme), m: def.map.join('/'), d: def.dirs, i: inv };
  if (def.vanes) payload.v = def.vanes;
  return 'LUMI1.' + b64urlEncode(JSON.stringify(payload));
}

/** Accepts a bare code or any link containing "#play=<code>". Throws on bad input. */
export function decodeShare(text) {
  const raw = String(text || '').trim();
  const m = raw.match(/LUMI1\.[A-Za-z0-9_-]+/);
  if (!m) throw new Error('code');
  const payload = JSON.parse(b64urlDecode(m[0].slice(6)));
  const map = String(payload.m || '').split('/');
  if (!map.length || map.length > MAX_H || map.some((r) => r.length > MAX_W)) throw new Error('size');
  const inv = String(payload.i || '0000').padEnd(4, '0');
  const def = {
    id: 'custom',
    name: { fr: String(payload.n || 'Niveau partagé'), en: String(payload.n || 'Shared level') },
    map,
    dirs: payload.d || {},
    inv: { arrow: +inv[0] || 0, lily: +inv[1] || 0, mushroom: +inv[2] || 0, daisy: +inv[3] || 0 },
  };
  if (payload.v) def.vanes = String(payload.v);
  parseLevel(def); // throws when the map is not a valid level
  const model = fromDef(def, THEMES[payload.t] || 'meadow');
  return model;
}

export { COLORS };
