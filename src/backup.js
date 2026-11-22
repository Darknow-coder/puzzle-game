// Progress backup codes, to move a save to another device or restore it after
// the browser's data was cleared: "LUMISAVE1." + format + "." + base64url.
// Format "z": deflate-compressed JSON (when the browser can compress), "j": plain JSON.
const PREFIX = 'LUMISAVE1.';

function b64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

/** Turns save data into a code that can be pasted in a message or a note. */
export async function exportBackup(data) {
  const json = new TextEncoder().encode(JSON.stringify(data));
  if (typeof CompressionStream === 'function') {
    try {
      return PREFIX + 'z.' + b64url(await pipe(json, new CompressionStream('deflate-raw')));
    } catch {
      /* fall back to plain JSON */
    }
  }
  return PREFIX + 'j.' + b64url(json);
}

/** Reads a code (spaces and line breaks added by messaging apps are ignored). Throws on bad input. */
export async function importBackup(text) {
  const m = String(text || '')
    .replace(/\s+/g, '')
    .match(/LUMISAVE1\.([zj])\.([A-Za-z0-9_-]+)/);
  if (!m) throw new Error('code');
  let bytes = unb64url(m[2]);
  if (m[1] === 'z') {
    if (typeof DecompressionStream !== 'function') throw new Error('unsupported');
    bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
  }
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (!data || typeof data !== 'object' || data.v !== 1 || !data.levels || typeof data.levels !== 'object') throw new Error('code');
  return data;
}
