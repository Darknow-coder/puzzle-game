// End-to-end checks in a real browser (Playwright + Chromium).
//   node tools/serve.mjs 8080 &  then  node tests/e2e/run.cjs
// 1. Plays level 1-1 through the touch UI (tap tile, pick direction, Go).
// 2. Checks the victory screen, the saved progress after a reload.
// 3. Replays the stored perfect solution of EVERY level through the game
//    client (fast-forwarded) and expects a 3-star victory.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8080/index.html';

function assert(cond, msg) {
  if (!cond) {
    console.error('✗ ' + msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
  console.log('✓ ' + msg);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'fr-FR' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  try {
    await page.goto(BASE);
    await page.waitForSelector('#screen-title.active');
    assert((await page.textContent('#screen-title h1')).includes('Lumignons'), 'title screen shows the logo');
    await page.click('[data-act=play]');
    await page.waitForSelector('#screen-map.active');
    await page.click('.node.current', { force: true });
    await page.waitForSelector('.modal [data-ok]');
    await page.click('.modal [data-ok]');
    await page.waitForTimeout(400);
    assert(await page.isVisible('#screen-game.active'), 'level 1-1 opens');
    // Tap the tile (3,1) then the "down" petal of the picker.
    const cell = await page.evaluate(() => {
      const g = window.lumignons.game;
      const [x, y] = g.cellCenter(1 * g.L.w + 3);
      return { x, y };
    });
    await page.mouse.click(cell.x, cell.y);
    await page.waitForTimeout(250);
    const petal = await page.evaluate(() => {
      const it = window.lumignons.game.pickerGeometry().find((i) => i.key === 2);
      return { x: it.x, y: it.y };
    });
    await page.mouse.click(petal.x, petal.y);
    await page.waitForTimeout(200);
    assert((await page.textContent('.tray-item .count')) === '0', 'the arrow left the tray');
    await page.click('[data-act=go]');
    await page.waitForSelector('.win-stars', { timeout: 15000 });
    await page.waitForTimeout(1500);
    const on = await page.$$eval('.win-star.on', (s) => s.length);
    assert(on === 3, 'perfect run gives 3 stars');
    await page.reload();
    await page.waitForSelector('#screen-title.active');
    const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('lumignons.save.v1')).levels['1-1']);
    assert(rec && rec.done && rec.stars === 3, 'progress survives a reload');
    await page.click('[data-act=play]');
    await page.waitForSelector('#screen-map.active');
    const stars = await page.$$eval('.node .stars .on', (s) => s.length);
    assert(stars >= 3, 'the map shows the earned stars');

    // Replay every stored solution through the client.
    const ids = await page.evaluate(() => {
      const out = [];
      for (const w of window.lumignons.worlds) {
        for (const l of w.levels) out.push(l.id);
        out.push(w.bonus.id);
      }
      return out;
    });
    let ok = 0;
    for (const id of ids) {
      const res = await page.evaluate(async (id) => {
        const app = window.lumignons;
        app.startLevel(id);
        document.querySelectorAll('.modal').forEach((m) => m.remove());
        app.modalStack?.splice?.(0);
        const g = app.game;
        g.timeScale = 12;
        const sol = app.solutions[id].sol;
        for (const [idx, type, dir] of sol) g.placeAt(idx, ['', 'arrow', 'lily', 'mushroom', 'daisy', 'mirror'][type], dir);
        g.go();
        const t0 = performance.now();
        while (g.mode === 'run' || g.mode === 'post') {
          await new Promise((r) => setTimeout(r, 50));
          if (performance.now() - t0 > 20000) return { id, mode: 'timeout' };
        }
        const stars = document.querySelectorAll('.win-star').length ? 'shown' : 'none';
        return { id, mode: g.mode, stars };
      }, id);
      if (res.mode === 'result-win') ok++;
      else console.error('  level', id, '→', res.mode);
      await page.evaluate(() => {
        document.querySelectorAll('.modal').forEach((m) => m.remove());
        window.lumignons.modalStack.splice(0);
      });
    }
    assert(ok === ids.length, `all ${ids.length} stored solutions win in the client`);
    await page.waitForTimeout(200);
    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('lumignons.save.v1')));
    const perfect = ids.filter((id) => save.levels[id]?.stars === 3).length;
    const notPerfect = ids.filter((id) => save.levels[id]?.stars !== 3).map((id) => `${id}:${JSON.stringify(save.levels[id])}`);
    assert(perfect === ids.length, `every stored solution is rated 3 stars (${perfect}/${ids.length}) ${notPerfect.join(" ")}`);
    // Moving on to the next level leaves nothing of the previous run on screen.
    await page.evaluate(() => {
      const app = window.lumignons;
      app.startLevel('1-1');
      document.querySelectorAll('.modal').forEach((m) => m.remove());
      app.modalStack.splice(0);
    });
    const clean = await page.evaluate(() => {
      const g = window.lumignons.game;
      return !g.winPaths && !g.run && g.trails.length === 0 && !g.failInfo;
    });
    assert(clean, 'a new level starts without the previous win constellation');

    // Workshop: create, check, play and share a level.
    const ws = await page.evaluate(async () => {
      const app = window.lumignons;
      app.atelier.openEditor(null);
      await new Promise((r) => setTimeout(r, 300));
      document.querySelector('#screen-editor [data-a=verify]').click();
      for (let i = 0; i < 100 && document.querySelector('.ed-status').classList.contains('busy'); i++) await new Promise((r) => setTimeout(r, 100));
      const status = document.querySelector('.ed-status').textContent;
      document.querySelector('#screen-editor [data-a=test]').click();
      await new Promise((r) => setTimeout(r, 300));
      document.querySelectorAll('.modal').forEach((m) => m.remove());
      app.modalStack.splice(0);
      const g = app.game;
      g.timeScale = 12;
      for (const [i, t, d] of g.solution.sol) g.placeAt(i, ['', 'arrow', 'lily', 'mushroom', 'daisy', 'mirror'][t], d);
      g.go();
      while (g.mode === 'run' || g.mode === 'post') await new Promise((r) => setTimeout(r, 50));
      return { status, mode: g.mode, saved: JSON.parse(localStorage.getItem('lumignons.save.v1')).custom.length };
    });
    assert(ws.status.startsWith('✓') && ws.mode === 'result-win' && ws.saved >= 1, `workshop level is checked, saved and won (${ws.status})`);
    await page.evaluate(() => {
      document.querySelectorAll('.modal').forEach((m) => m.remove());
      window.lumignons.modalStack.splice(0);
    });

    // Daily puzzle (level 1-5 is done by now).
    const daily = await page.evaluate(async () => {
      const app = window.lumignons;
      app.screen = 'title';
      document.querySelector('#screen-title [data-act=daily]')?.click();
      await new Promise((r) => setTimeout(r, 300));
      document.querySelectorAll('.modal').forEach((m) => m.remove());
      app.modalStack.splice(0);
      const g = app.game;
      g.timeScale = 12;
      for (const [i, t, d] of g.solution.sol) g.placeAt(i, ['', 'arrow', 'lily', 'mushroom', 'daisy', 'mirror'][t], d);
      g.go();
      while (g.mode === 'run' || g.mode === 'post') await new Promise((r) => setTimeout(r, 50));
      await new Promise((r) => setTimeout(r, 100));
      return { mode: g.mode, daily: JSON.parse(localStorage.getItem('lumignons.save.v1')).daily };
    });
    assert(daily.mode === 'result-win' && daily.daily && daily.daily.streak >= 1, 'the daily puzzle can be solved and starts a streak');
    assert(errors.length === 0, 'no JavaScript error' + (errors.length ? ': ' + errors.join(' | ') : ''));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
