// Version 3 end-to-end checks (Playwright + Chromium, local server on :8080):
// opening every level from the settings, placing and turning a mirror with
// real taps, the victory card, and a progress backup restored after a wipe.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8080/index.html';
let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) failed++;
};
const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'fr-FR', acceptDownloads: true });
  // These tests start past the first-launch pseudo screen (tests/e2e/ranks.cjs covers it).
  await ctx.addInitScript(() => {
    const K = 'lumignons.save.v1';
    if (!localStorage.getItem(K)) localStorage.setItem(K, JSON.stringify({ v: 1, levels: {}, online: { asked: true } }));
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const closeModals = () =>
    p.evaluate(() => {
      document.querySelectorAll('.modal').forEach((m) => m.remove());
      window.lumignons.modalStack.splice(0);
    });
  try {
    await p.goto(BASE);
    await p.waitForSelector('#screen-title.active');
    check(!(await p.evaluate(() => window.lumignons.save.worldUnlocked(6))), 'world 7 starts locked');
    // Settings → open every level.
    await p.click('[data-act=settings]');
    await p.click('[data-k=openAll]');
    check(await p.evaluate(() => window.lumignons.save.worldUnlocked(6) && window.lumignons.save.levelUnlocked(6, 9) && window.lumignons.save.bonusUnlocked(6)), '"open every level" opens worlds, levels and shooting stars');
    await p.click('.modal [data-a=close]');

    // 7-1 with real taps: tap the tile, then the '\' petal of the mirror picker.
    await p.evaluate(() => window.lumignons.startLevel('7-1'));
    await p.waitForTimeout(500);
    await closeModals();
    const cell = await p.evaluate(() => {
      const g = window.lumignons.game;
      const [x, y] = g.cellCenter(1 * g.L.w + 4);
      return { x, y };
    });
    await p.mouse.click(cell.x, cell.y);
    await p.waitForTimeout(250);
    const petals = await p.evaluate(() => window.lumignons.game.pickerGeometry().map((i) => ({ key: i.key, x: i.x, y: i.y })));
    check(petals.filter((i) => i.key === 0 || i.key === 1).length === 2, 'a new mirror opens a picker with its two orientations');
    const back = petals.find((i) => i.key === 1);
    await p.mouse.click(back.x, back.y);
    await p.waitForTimeout(200);
    const placed = await p.evaluate(() => [...window.lumignons.game.placements.values()].map((v) => [v.type, v.dir]));
    check(JSON.stringify(placed) === '[[5,1]]', "the mirror is placed and turned to '\\'");
    await p.evaluate(() => (window.lumignons.game.timeScale = 6));
    await p.click('[data-act=go]');
    await p.waitForSelector('.win-stars', { timeout: 20000 });
    await p.waitForTimeout(1400);
    check((await p.$$eval('.win-star.on', (s) => s.length)) >= 1, 'the mirror brings Pip home');

    // Victory card (no share sheet in headless Chromium: it is downloaded).
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 10000 }), p.click('.modal [data-a=share]')]);
    const buf = require('fs').readFileSync(await dl.path());
    check(dl.suggestedFilename() === 'lumignons-7-1.png' && pngSize(buf).join('x') === '1080x1350', 'the victory card is a 1080×1350 picture');
    await closeModals();

    // Backup, wipe, restore.
    await p.goto(BASE);
    await p.waitForSelector('#screen-title.active');
    await p.click('[data-act=settings]');
    await p.click('[data-a=backup]');
    await p.waitForSelector('#backup-code');
    const code = await p.inputValue('#backup-code');
    check(/^LUMISAVE1\.[zj]\./.test(code) && code.length < 2000, `the backup code is compact (${code.length} characters)`);
    await p.evaluate(() => {
      const S = window.lumignons.save;
      S.resetSave();
      S.save.data.settings.openAll = false;
      S.persistNow();
    });
    await p.goto(BASE);
    await p.waitForSelector('#screen-title.active');
    check(await p.evaluate(() => !window.lumignons.save.isDone('7-1') && !window.lumignons.save.worldUnlocked(6)), 'progress wiped');
    await p.click('[data-act=settings]');
    await p.click('[data-a=backup]');
    await p.click('[data-a=restore]');
    await p.fill('#restore-code', 'not a code');
    await p.click('.modal:last-child [data-a=ok]');
    await p.waitForTimeout(300);
    check((await p.textContent('#toast-root')).includes('valable'), 'a wrong code is refused');
    await p.fill('#restore-code', code.slice(0, 40) + '\n' + code.slice(40));
    await p.click('.modal:last-child [data-a=ok]');
    await p.click('.modal:last-child [data-a=yes]');
    await p.waitForTimeout(400);
    await p.goto(BASE);
    await p.waitForSelector('#screen-title.active');
    check(await p.evaluate(() => window.lumignons.save.isDone('7-1') && window.lumignons.save.worldUnlocked(6)), 'the code brings everything back, even after a reload');
    check(!errors.length, 'no JavaScript error' + (errors.length ? ': ' + errors.join(' | ') : ''));
  } catch (e) {
    console.error(e);
    failed++;
  } finally {
    await b.close();
  }
  process.exit(failed ? 1 : 0);
})();
