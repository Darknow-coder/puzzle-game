// The main menu's guided tour, right after the tutorial level (Playwright, server on :8080).
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8080/index.html';
const SHOTS = process.env.SHOTS || '';
let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) failed++;
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'fr-FR' });
  await ctx.addInitScript(() => {
    window.__LUMI_FIREBASE__ = { apiKey: '', projectId: '' }; // never the real rankings
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  try {
    await p.goto(BASE);
    await p.waitForSelector('#screen-hello.active .nm-input');
    await p.fill('.nm-input', 'Guide Test');
    await p.click('.nm-go');
    await p.waitForSelector('#screen-game.active');
    await p.evaluate(() => {
      for (const m of document.querySelectorAll('.modal')) m.remove();
      window.lumignons.modalStack.splice(0);
      const app = window.lumignons;
      const g = app.game;
      for (const [i, t, d] of app.solutions['1-1'].sol) g.placeAt(i, ['', 'arrow', 'lily', 'mushroom', 'daisy', 'mirror', 'comet'][t], d);
      g.picker = null;
      g.timeScale = 8;
      g.go();
    });
    await p.waitForSelector('.win-stars', { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.click('.modal [data-a=next]');
    await p.waitForSelector('.tour.show .tour-card');
    check((await p.evaluate(() => window.lumignons.screen)) === 'title', 'after the tutorial level, "Next" opens the main menu');
    check((await p.textContent('.tour-card')).includes('Bravo'), 'and the tour starts with a word of welcome');
    const titles = [];
    for (let k = 0; k < 20; k++) {
      await p.waitForTimeout(500);
      titles.push((await p.textContent('.tour-head b')).trim());
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/tour-${k}.png` });
      const last = await p.$('.tour-card .tour-skip');
      await p.click('.tour-next');
      if (!last) break;
    }
    check(titles.includes('Podium') && titles.includes('La boutique') && titles.includes('Défi du jour') && titles.includes('Ton profil'), `each part of the menu is shown (${titles.join(', ')})`);
    check(titles[titles.length - 1] === 'Bon à savoir', 'it ends with things worth knowing');
    await p.waitForFunction(() => window.lumignons.screen === 'game' && window.lumignons.game.L?.id === '1-2', null, { timeout: 5000 });
    await p.waitForTimeout(400);
    check(!(await p.$('.tour')), 'then level 1-2 starts');
    await p.goto(BASE);
    await p.waitForSelector('#screen-title.active');
    await p.evaluate(() => {
      for (const m of document.querySelectorAll('.modal')) m.remove();
      window.lumignons.modalStack.splice(0);
    });
    check(!(await p.$('.tour')), 'it does not come back by itself');
    await p.click('[data-act=settings]');
    await p.click('.modal [data-a=tour]');
    await p.waitForSelector('.tour.show .tour-card');
    await p.click('.tour-skip');
    await p.waitForTimeout(400);
    check((await p.textContent('.tour-head b')).includes('Bon à savoir'), 'from the settings it can be seen again, and skipped to the end');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(400);
    check(!(await p.$('.tour')), 'Escape closes it');
    check(errors.length === 0, `no script errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  } catch (e) {
    console.error(e);
    failed++;
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
