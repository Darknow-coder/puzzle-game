// World 8, the Comet Garden (Playwright, server on :8080): the story chapter
// before its first level, comets in play, and the epilogue after the last level.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8080/index.html';
const KEYS = ['', 'arrow', 'lily', 'mushroom', 'daisy', 'mirror', 'comet'];
let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) failed++;
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'fr-FR' });
  // Every level of worlds 1 to 7 done, and world 8 up to its 9th level.
  const { allLevels } = await import('../../src/data/levels.js');
  const ids = allLevels()
    .map((l) => l.id)
    .filter((id) => !/^8-(10|B)$/.test(id));
  const levels = Object.fromEntries(ids.map((id) => [id, { done: true, stars: 3, best: 3, tries: 1 }]));
  await ctx.addInitScript((levels) => {
    window.__LUMI_FIREBASE__ = { apiKey: '', projectId: '' }; // never the real rankings
    const K = 'lumignons.save.v1';
    if (!localStorage.getItem(K)) {
      const seen = { lumi: 1, lantern: 1, arrow: 1, void: 1, firefly: 1, rock: 1, engraved: 1, water: 1, lily: 1, spark: 1, mushroom: 1, daisy: 1, portal: 1, plate: 1, brambles: 1, gloomnib: 1, sleeper: 1, vane: 1, cloud: 1, mirror: 1 };
      const worldsSeen = { meadow: 1, pond: 1, grove: 1, ruins: 1, gloom: 1, peak: 1, dawn: 1, comets: 1 };
      localStorage.setItem(K, JSON.stringify({ v: 1, levels, seen, worldsSeen, online: { asked: true }, tips: { tour: 1, stars: 1, two: 1, loop: 1, place: 1, placeDone: 1, swipe: 1, long: 1 }, settings: { music: false, sound: false } }));
    }
  }, levels);
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  const closeModals = () =>
    p.evaluate(() => {
      for (const m of document.querySelectorAll('.modal')) m.parentNode.removeChild(m);
      window.lumignons.modalStack.splice(0);
    });
  const solveAndGo = () =>
    p.evaluate((KEYS) => {
      const g = window.lumignons.game;
      for (const [i, t, d] of g.solution.sol) g.placeAt(i, KEYS[t], d);
      g.picker = null;
      g.timeScale = 8;
      g.go();
    }, KEYS);
  try {
    await p.goto(BASE);
    await p.waitForSelector('#screen-title.active');
    await closeModals();
    await p.click('[data-act=play]');
    await p.waitForSelector('#screen-map .world[data-world=comets]');
    check((await p.$$('#screen-map .world[data-world=comets] .story-btn')).length === 1, 'the Comet Garden is open on the map, with its story to read again');

    // The chapter is told before the first level, then the comet is introduced.
    await p.evaluate(() => window.lumignons.startLevel('8-1'));
    await p.waitForSelector('.story .story-art');
    const title = await p.textContent('.story .eyebrow');
    check(title.includes('Chapitre 8'), `chapter 8 opens before level 8-1 (${title})`);
    const pages = [];
    for (let i = 0; i < 4; i++) {
      pages.push(await p.textContent('.story .story-text'));
      await p.click('.story [data-a=next]');
      await p.waitForTimeout(150);
    }
    check(pages[1].includes('plus une seule étoile') || pages[1].includes('Plus une seule étoile'), 'the story tells of the stars gone from the sky');
    await p.waitForSelector('.modal.show .card-illu');
    check((await p.textContent('.modal.show')).includes('Comète'), 'then the notebook card presents the comet');
    await closeModals();
    check(await p.evaluate(() => window.lumignons.game.L.inventory.comet === 1), 'level 8-1 gives a comet to place');

    // Playing the perfect layout: the comet is used once, then gone.
    await solveAndGo();
    await p.waitForSelector('.win-stars', { timeout: 30000 });
    await p.waitForTimeout(1600);
    check((await p.$$('.win-star.on')).length === 3, 'its perfect layout gives three stars');
    const spent = await p.evaluate(() => {
      const g = window.lumignons.game;
      const last = g.run.frames[g.run.frames.length - 1];
      return [...g.placements].filter(([, pc]) => pc.type === 6).every(([i]) => last.spent[i] === 1);
    });
    check(spent, 'the comet flew away once used');
    await closeModals();

    // The chapter is not told twice.
    await p.evaluate(() => window.lumignons.startLevel('8-2'));
    await p.waitForTimeout(800);
    check((await p.$$('.story')).length === 0, 'the story is only told once');
    await closeModals();

    // The last level of the last world: the ending, and the epilogue.
    await p.evaluate(() => window.lumignons.startLevel('8-10'));
    await p.waitForTimeout(500);
    await closeModals();
    await solveAndGo();
    await p.waitForSelector('.win-stars', { timeout: 30000 });
    await p.waitForTimeout(1200);
    check((await p.textContent('.modal.show')).includes('Toutes les étoiles brillent'), 'the last world ends the story');
    await p.click('.modal [data-a=epilogue]');
    await p.waitForSelector('.story .story-art');
    check((await p.textContent('.story .eyebrow')).includes('Épilogue'), 'the epilogue opens from the victory card');
    check(await p.evaluate(() => !!window.lumignons.save.save.data.achievements.world8), 'finishing the Comet Garden earns « Mille étoiles »');
    check(errors.length === 0, `no script errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  } catch (e) {
    console.error(e);
    failed++;
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
