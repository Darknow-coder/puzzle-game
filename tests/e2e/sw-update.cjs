// Release-update path of the offline app: the first install shows no banner; a changed
// sw.js shows "Nouvelle version prête"; its button reloads onto the new cache only.
// Run with the local server on :8080: npm run e2e:update (sw.js is restored afterwards).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const SW = path.join(__dirname, '..', '..', 'sw.js');
const BASE = process.env.BASE || 'http://localhost:8080/index.html';
let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) failed++;
};
(async () => {
  const original = fs.readFileSync(SW, 'utf8');
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 760 }, locale: 'fr-FR' });
  // These tests start past the first-launch pseudo screen (tests/e2e/ranks.cjs covers it).
  await ctx.addInitScript(() => {
    window.__LUMI_FIREBASE__ = { apiKey: '', projectId: '' }; // never the real rankings
    const K = 'lumignons.save.v1';
    if (!localStorage.getItem(K)) localStorage.setItem(K, JSON.stringify({ v: 1, levels: {}, online: { asked: true } }));
  });
  await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  try {
    await p.goto(BASE);
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 10000 });
    await p.waitForTimeout(500);
    const first = await p.evaluate(() => ({ banner: !!document.querySelector('.toast.update') }));
    check(!first.banner, 'no update banner on the first install');
    // Publish a "new release".
    fs.writeFileSync(SW, original.replace(/const CACHE = '[^']+'/, "const CACHE = 'lumignons-nextrelease'"));
    await p.reload();
    await p.waitForSelector('.toast.update', { timeout: 15000 });
    check(/Nouvelle version/.test(await p.textContent('.toast.update')), 'a new release shows the update banner');
    check((await p.evaluate(() => getComputedStyle(document.querySelector('.toast.update')).pointerEvents)) === 'auto', 'the banner is clickable');
    await p.click('.toast.update button');
    await p.waitForLoadState('load');
    await p.waitForTimeout(800);
    const keys = await p.evaluate(() => caches.keys());
    check(!(await p.evaluate(() => !!document.querySelector('.toast.update'))) && keys.join() === 'lumignons-nextrelease', 'reloading runs the new release from its own cache');
    // A burst of ordinary toasts must not push the banner out.
    fs.writeFileSync(SW, original.replace(/const CACHE = '[^']+'/, "const CACHE = 'lumignons-third'"));
    await p.reload();
    await p.waitForSelector('.toast.update', { timeout: 15000 });
    await p.evaluate(() => { for (let i = 0; i < 6; i++) window.lumignons.toast('t' + i, 4000); });
    check(await p.evaluate(() => !!document.querySelector('.toast.update')), 'ordinary toasts never push the banner out');
    check(!errors.length, 'no JavaScript error' + (errors.length ? ': ' + errors.join(' | ') : ''));
  } finally {
    fs.writeFileSync(SW, original);
    await b.close();
  }
  process.exit(failed ? 1 : 0);
})();
