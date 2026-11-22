#!/usr/bin/env node
// Image generator for game assets — Cloudflare Workers AI, FLUX.1 [schnell].
// Self-contained (Node 18+, no dependency): copy the tools/imagegen folder into any project.
//
//   node tools/imagegen/gen-image.mjs "a fox carrying a lantern" --type sprite --name fox
//   node tools/imagegen/gen-image.mjs "misty pond at night" --type scene --out assets/backgrounds --count 3
//
// Keys come from the environment, never from the code:
//   CLOUDFLARE_ACCOUNT_ID   your account id
//   CLOUDFLARE_API_TOKEN    an API token with the "Workers AI" permission
// They may also sit in a .env file at the project root (git-ignored), see .env.example.
import fs from 'node:fs';
import path from 'node:path';

export const MODEL = '@cf/black-forest-labs/flux-1-schnell';

/** Style added to the prompt, and default folder, for each kind of asset. */
export const PRESETS = {
  logo: {
    dir: 'logos',
    // FLUX.1 schnell misspells text: logos are emblems, the game's name is added afterwards.
    style: 'logo emblem, mascot or symbol only, centered, clean vector style, flat colors, bold shapes, plain solid background, high contrast, no text, no letters, no words',
  },
  icon: {
    dir: 'icons',
    style: 'app icon, single centered object, simple bold shapes, soft gradient, rounded square composition, no text, plain background',
  },
  sprite: {
    dir: 'sprites',
    style: '2D game sprite, single character or object, full body, centered, clean outline, cel shading, isolated on a plain flat white background, no shadow on the ground, no text',
  },
  scene: {
    dir: 'backgrounds',
    style: '2D video game background, wide environment, painterly, atmospheric lighting, rich depth, no characters, no text, no UI',
  },
  illustration: {
    dir: 'illustrations',
    style: 'storybook illustration, detailed, warm lighting, soft painterly textures, no text',
  },
  raw: { dir: 'generated', style: '' },
};

/** Reads KEY=value lines from a .env file without overriding variables already set. */
export function loadEnv(file = path.resolve('.env')) {
  if (!fs.existsSync(file)) return false;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
  return true;
}

/** "Un Renard Lanterne !" → "un-renard-lanterne" */
export function slug(s) {
  return (
    String(s)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'
  );
}

const EXT = (b) =>
  b[0] === 0x89 && b[1] === 0x50 ? 'png' : b[0] === 0xff && b[1] === 0xd8 ? 'jpg' : b[0] === 0x52 && b[8] === 0x57 ? 'webp' : 'bin';

/**
 * Generates one image. Returns { bytes: Buffer, ext, prompt }.
 * opts: { type, steps (1–8), accountId, token, fetch }
 * (FLUX.1 schnell takes no seed: every call gives a new image.)
 */
export async function generateImage(prompt, opts = {}) {
  const accountId = opts.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = opts.token ?? process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID is missing (environment variable or .env file).');
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN is missing (environment variable or .env file).');
  if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new Error('CLOUDFLARE_ACCOUNT_ID does not look like an account id (32 hexadecimal characters).');
  const preset = PRESETS[opts.type || 'raw'];
  if (!preset) throw new Error(`Unknown type "${opts.type}". Types: ${Object.keys(PRESETS).join(', ')}.`);
  const full = preset.style ? `${prompt}. ${preset.style}` : prompt;
  if (full.length > 2048) throw new Error('Prompt too long (2048 characters at most).');
  const body = { prompt: full, steps: Math.min(8, Math.max(1, Number(opts.steps) || 4)) };
  const res = await (opts.fetch || fetch)(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  if (!res.ok || !data?.success || !data?.result?.image) {
    const why = data?.errors?.map((e) => `${e.code}: ${e.message}`).join('; ') || text.slice(0, 200);
    const hint = res.status === 401 || res.status === 403 ? ' (token missing, wrong, or without the Workers AI permission)' : res.status === 429 ? ' (daily quota or rate limit reached)' : '';
    throw new Error(`Cloudflare refused the request: HTTP ${res.status}${hint}. ${why}`);
  }
  const bytes = Buffer.from(data.result.image, 'base64');
  return { bytes, ext: EXT(bytes), prompt: full };
}

/** The destination folder, refused when it is outside the project. */
export function insideProject(out, root = process.cwd()) {
  const dir = path.resolve(root, out);
  const rel = path.relative(path.resolve(root), dir);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error(`The folder must be inside the project: ${out}`);
  return dir;
}

/** Writes the image inside the project (never outside), without overwriting unless asked. */
export function saveImage({ bytes, ext }, { out, name, force = false, root = process.cwd() }) {
  const dir = insideProject(out, root);
  fs.mkdirSync(dir, { recursive: true });
  let file = path.join(dir, `${slug(name)}.${ext}`);
  for (let i = 2; !force && fs.existsSync(file); i++) file = path.join(dir, `${slug(name)}-${i}.${ext}`);
  fs.writeFileSync(file, bytes);
  return file;
}

// ------------------------------------------------------------------ command line

const HELP = `Usage: node tools/imagegen/gen-image.mjs "<prompt>" [options]

  --type <t>     logo | icon | sprite | scene | illustration | raw   (default: raw)
  --name <n>     file name, without extension            (default: from the prompt)
  --out <dir>    folder inside the project               (default: assets/<type folder>)
  --count <k>    how many variants (1-8)                 (default: 1)
  --steps <n>    1-8: more = more detail, slower         (default: 4)
  --force        overwrite a file with the same name
Keys: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (environment or .env).`;

function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force' || a === '-f') o.force = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
    else o._.push(a);
  }
  return o;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prompt = args._.join(' ').trim();
  if (args.help || !prompt) {
    console.log(HELP);
    process.exit(prompt || args.help ? 0 : 1);
  }
  loadEnv();
  const type = args.type || 'raw';
  const preset = PRESETS[type];
  if (!preset) throw new Error(`Unknown type "${type}". Types: ${Object.keys(PRESETS).join(', ')}.`);
  const out = args.out || path.join('assets', preset.dir);
  const name = args.name || slug(prompt).slice(0, 40);
  const count = Math.min(8, Math.max(1, Number(args.count) || 1));
  insideProject(out);
  for (let k = 0; k < count; k++) {
    const t0 = Date.now();
    const img = await generateImage(prompt, { type, steps: args.steps });
    const file = saveImage(img, { out, name: count > 1 ? `${name}-${k + 1}` : name, force: args.force });
    console.log(`✓ ${path.relative(process.cwd(), file)}  (${(img.bytes.length / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
}

/** Behind an HTTPS proxy, Node's fetch only uses it with NODE_USE_ENV_PROXY: run again with it. */
async function viaProxy() {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, ['--no-warnings', ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
  process.exit(r.status ?? 1);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('gen-image.mjs')) {
  if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) await viaProxy();
  main().catch((e) => {
    console.error('✗ ' + e.message);
    process.exit(1);
  });
}
