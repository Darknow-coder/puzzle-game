// Lost drawings: mobile browsers may drop every canvas' pixels when the GPU
// process is reclaimed (typically while the app is in the background). This
// test crashes Chromium's GPU process for real, then checks that the island,
// the sky, the HUD icons and the map come back; then simulates a silent loss
// (no event) caught by the probe that runs when the app becomes visible again.
// Run with the local server on :8080: npm run e2e:canvas
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8080/index.html';
let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) failed++;
};

// Colour of the main view at the centre of a board cell, and the alpha of an
// HUD icon — read from the page itself.
const probe = (p) =>
  p.evaluate(() => {
    const app = window.lumignons;
    const g = app.game;
    const view = document.getElementById('view');
    const k = view.width / window.innerWidth;
    const px = (x, y) => [...view.getContext('2d').getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data];
    // A plain grass cell, with nothing on it.
    let cell = -1;
    for (let i = 0; i < g.L.w * g.L.h && cell < 0; i++) if (g.L.rows[(i / g.L.w) | 0][i % g.L.w] === '.' && !g.placements.has(i)) cell = i;
    const [cx, cy] = g.cellCenter(cell);
    const icon = document.querySelector('.tray-item canvas');
    const ic = icon ? [...icon.getContext('2d').getImageData(icon.width / 2, icon.height / 2, 1, 1).data] : null;
    return { grass: px(cx + g.S * 0.3, cy + g.S * 0.3), sky: px(window.innerWidth / 2, 70), icon: ic };
  });
const isGreen = ([r, g, b, a]) => a > 200 && g > r + 20 && g > b + 20;

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 2, locale: 'fr-FR' });
  // Keep a list of every canvas the page creates, to simulate a silent loss.
  await ctx.addInitScript(() => {
    const all = (window.__canvases = []);
    const create = Document.prototype.createElement;
    Document.prototype.createElement = function (tag, ...rest) {
      const el = create.call(this, tag, ...rest);
      if (String(tag).toLowerCase() === 'canvas') all.push(new WeakRef(el));
      return el;
    };
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  try {
    // Visit the map first so that its sky is already drawn (and cached) before the loss.
    await p.goto(BASE);
    await p.waitForTimeout(600);
    await p.evaluate(() => window.lumignons.openMap());
    await p.waitForTimeout(600);
    await p.evaluate(() => window.lumignons.startLevel('1-2'));
    await p.waitForTimeout(1200);
    await p.evaluate(() => document.querySelectorAll('.modal').forEach((m) => m.remove()));
    const before = await probe(p);
    check(isGreen(before.grass) && before.icon && before.icon[3] > 0, 'the island and the HUD icons are drawn');

    const cdp = await b.newBrowserCDPSession();
    const lost = p.evaluate(() => new Promise((r) => document.getElementById('view').addEventListener('contextlost', () => r(true), { once: true })));
    await cdp.send('Browser.crashGpuProcess');
    check(await Promise.race([lost, new Promise((r) => setTimeout(() => r(false), 4000))]), 'crashing the GPU process makes the canvases lose their pixels');
    await p.waitForTimeout(1500);
    const after = await probe(p);
    check(isGreen(after.grass), 'the island is drawn again');
    check(after.sky[3] === 255 && Math.abs(after.sky[0] - before.sky[0]) + Math.abs(after.sky[2] - before.sky[2]) < 30, 'the sky is drawn again');
    check(after.icon && after.icon[3] > 0, 'the HUD icons are drawn again');

    // The map draws its own sky: no frozen game frame behind it.
    await p.evaluate(() => window.lumignons.openMap());
    await p.waitForTimeout(800);
    const map = await p.evaluate(() => {
      const view = document.getElementById('view');
      return [...view.getContext('2d').getImageData(view.width / 2, view.height / 2, 1, 1).data];
    });
    check(map[3] === 255 && !isGreen(map), 'the map shows its sky, not the last frame of the level');

    // Silent loss: wipe every canvas without any event, then come back to the app.
    await p.evaluate(() => window.lumignons.startLevel('1-2'));
    await p.waitForTimeout(600);
    await p.evaluate(() => document.querySelectorAll('.modal').forEach((m) => m.remove()));
    await p.evaluate(() => {
      const wipe = (c) => c.getContext('2d') && (c.getContext('2d').setTransform(1, 0, 0, 1, 0, 0), c.getContext('2d').clearRect(0, 0, c.width, c.height));
      for (const ref of window.__canvases) {
        const c = ref.deref();
        if (c && c.id !== 'view') wipe(c);
      }
    });
    await p.waitForTimeout(300);
    const wiped = await probe(p);
    check(!isGreen(wiped.grass), 'a silent loss blanks the island (simulated)');
    await p.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await p.waitForTimeout(500);
    const back = await probe(p);
    check(isGreen(back.grass) && back.icon && back.icon[3] > 0, 'coming back to the app redraws what was lost');
    check(!errors.length, 'no JavaScript error' + (errors.length ? ': ' + errors.join(' | ') : ''));
  } finally {
    await b.close();
  }
  process.exit(failed ? 1 : 0);
})();
