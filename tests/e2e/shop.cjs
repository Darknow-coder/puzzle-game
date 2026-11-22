// Version 3.1 end-to-end checks (Playwright + Chromium, local server on :8080):
// the éclats economy — rewards paid once, hint tokens, buying a hint on the
// spot, the daily gift, buying and wearing cosmetics, the daily puzzle, and the
// welcome grant for a save from before the shop.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8080/index.html';
let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) failed++;
};
const KEYS = ['', 'arrow', 'lily', 'mushroom', 'daisy', 'mirror'];

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'fr-FR' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const wallet = () => p.evaluate(() => {
    const w = window.lumignons.wallet.wallet();
    return { coins: w.coins, hints: w.hints, trail: w.trail, owned: { ...w.owned }, log: w.log.map((e) => e.k) };
  });
  const closeModals = () =>
    p.evaluate(() => {
      for (const m of document.querySelectorAll('.modal')) m.parentNode.removeChild(m);
      window.lumignons.modalStack.splice(0);
    });
  const winWith = async (id, layout) => {
    await p.evaluate((id) => window.lumignons.startLevel(id), id);
    await p.waitForTimeout(400);
    await closeModals();
    await p.evaluate(
      ([id, layout, KEYS]) => {
        const app = window.lumignons;
        const g = app.game;
        for (const [i, t, d] of layout || app.solutions[id].sol) g.placeAt(i, KEYS[t], d);
        g.picker = null;
        g.timeScale = 8;
        g.go();
      },
      [id, layout, KEYS],
    );
    await p.waitForSelector('.win-stars', { timeout: 30000 });
    await p.waitForTimeout(2300);
  };
  try {
    await p.goto(BASE);
    await p.waitForSelector('#screen-title.active');
    let w = await wallet();
    check(w.coins === 60 && w.hints === 3 && !(await p.$('.modal')), 'a new player starts with 60 éclats and 3 hints, without a welcome message');
    check((await p.textContent('#screen-title .coin-pill b')) === '60', 'the title shows the purse');

    // A perfect first clear pays: first clear + 3 new stars (+ the achievements it unlocks).
    await winWith('1-1');
    const earned = await p.textContent('.coins-earned');
    w = await wallet();
    check(/\+\d+/.test(earned) && earned.includes('Premier passage +10') && earned.includes('3 nouvelles étoiles +15'), `the victory shows what was earned (${earned.replace(/\s+/g, ' ').trim()})`);
    const total = Number(earned.match(/\+(\d+)/)[1]);
    check(w.coins === 60 + total, 'and it is in the purse');
    await closeModals();
    await winWith('1-1');
    check(!(await p.$('.coins-earned')) && (await wallet()).coins === w.coins, 'replaying the same result pays nothing');
    await closeModals();

    // Hints: tokens first, the same ghost again for free, then buy one on the spot.
    await p.evaluate(() => window.lumignons.startLevel('1-10'));
    await p.waitForTimeout(400);
    await closeModals();
    const badge = await p.textContent('#screen-game .hint-badge');
    check(badge === '3', 'the hint button shows the tokens left');
    const useHint = async () => {
      await p.click('[data-act=hint]');
      await p.waitForTimeout(150);
    };
    await useHint();
    await useHint();
    check((await wallet()).hints === 2, 'showing the same hint again is free');
    for (let i = 0; i < 2; i++) {
      await p.evaluate((KEYS) => {
        const g = window.lumignons.game;
        const h = g.hintCells[g.hintCells.length - 1];
        g.placeAt(h.idx, KEYS[h.type], h.dir);
      }, KEYS);
      await useHint();
    }
    check((await wallet()).hints === 0, 'each new hint uses a token');
    await p.evaluate((KEYS) => {
      const g = window.lumignons.game;
      const h = g.hintCells[g.hintCells.length - 1];
      g.placeAt(h.idx, KEYS[h.type], h.dir);
    }, KEYS);
    check((await p.textContent('#screen-game .hint-badge')).includes('20'), 'with no token left the button shows the price');
    const before = (await wallet()).coins;
    await p.keyboard.press('h');
    await p.waitForSelector('.modal [data-a=buy]');
    await p.click('.modal [data-a=buy]');
    await p.waitForTimeout(200);
    check((await wallet()).coins === before - 20 && (await p.evaluate(() => window.lumignons.game.hintCells.length)) >= 1, 'the keyboard shortcut goes through the same purchase (−20 ✦, hint shown)');
    await p.evaluate(() => (window.lumignons.wallet.wallet().coins = 5));
    await p.evaluate((KEYS) => {
      const g = window.lumignons.game;
      const h = g.hintCells[g.hintCells.length - 1];
      g.placeAt(h.idx, KEYS[h.type], h.dir);
    }, KEYS);
    await useHint();
    check((await p.$('.modal [data-a=buy]')) === null && (await p.textContent('.modal')).includes('Il te manque 15'), 'without enough éclats: no purchase, the missing amount instead');
    await closeModals();

    // Shop: gift, a hat, a trail.
    await p.evaluate(() => (window.lumignons.wallet.wallet().coins = 400));
    await p.evaluate(() => window.lumignons.shop.open('hats'));
    await p.waitForSelector('.shop');
    await p.click('.shop [data-a=gift]');
    await p.waitForTimeout(150);
    check((await wallet()).coins === 410 && !(await p.$('.shop [data-a=gift]')), 'the daily gift opens once (+10)');
    const bowBtn = await p.evaluateHandle(() => [...document.querySelectorAll('.shop .hat')].find((h) => h.textContent.includes('Nœud')).querySelector('.price-btn'));
    await bowBtn.click();
    check((await wallet()).coins === 410, 'a first tap only asks for confirmation');
    await bowBtn.click();
    await p.waitForTimeout(150);
    w = await wallet();
    check(w.coins === 310 && w.owned.bow && (await p.evaluate(() => window.lumignons.save.save.data.hat)) === 'bow', 'the bow is bought and worn');
    await p.evaluate(() => (window.lumignons.wallet.wallet().coins = 200));
    await p.click('.shop [data-tab=trails]');
    const rb = (await p.$$('.shop .price-btn')).pop();
    await rb.click();
    await rb.click();
    await p.waitForTimeout(150);
    check(!(await wallet()).owned.rainbow && (await wallet()).coins === 200, 'a trail too expensive cannot be bought (280 > 200)');
    const sp = (await p.$$('.shop .price-btn'))[0];
    await sp.click();
    await sp.click();
    await p.waitForTimeout(150);
    w = await wallet();
    check(w.owned.sparkle && w.trail === 'sparkle' && w.coins === 50, 'the stardust trail is bought and chosen');
    await p.click('.shop [data-tab=log]');
    check((await p.$$('.shop .log .row')).length >= 5, 'the journal lists the purchases and gains');
    await closeModals();

    // Daily puzzle: paid once a day.
    await p.evaluate(() => {
      const S = window.lumignons.save;
      for (let l = 1; l <= 5; l++) S.save.data.levels['1-' + l] = { done: true, stars: 3 };
    });
    const c0 = (await wallet()).coins;
    await p.evaluate(() => {
      window.lumignons.screen = 'title';
      document.querySelector('#screen-title [data-act=daily]').click();
    });
    await p.waitForTimeout(400);
    await closeModals();
    await p.evaluate(() => {
      const g = window.lumignons.game;
      g.timeScale = 8;
      for (const [i, t, d] of g.solution.sol) g.placeAt(i, ['', 'arrow', 'lily', 'mushroom', 'daisy', 'mirror'][t], d);
      g.go();
    });
    await p.waitForSelector('.win-stars', { timeout: 30000 });
    await p.waitForTimeout(2300);
    check((await p.textContent('.coins-earned')).includes('Défi du jour +15') && (await wallet()).coins >= c0 + 15, 'the daily puzzle pays +15');
    await closeModals();

    // A save from before the shop: the welcome grant.
    await p.evaluate(() => {
      const S = window.lumignons.save;
      S.resetSave();
      S.save.data.levels = { '1-1': { done: true, stars: 3 }, '1-2': { done: true, stars: 2 } };
      delete S.save.data.wallet;
      S.persistNow();
    });
    await p.goto(BASE);
    await p.waitForSelector('.modal [data-a=shop]', { timeout: 5000 });
    const txt = await p.textContent('.modal');
    check(txt.includes('La boutique ouvre') && txt.includes('45'), 'an older save is welcomed with what its progress is worth (10+15 and 10+10 = 45 ✦)');
    check((await wallet()).coins === 105, 'and the purse holds 60 + 45');
    check(!errors.length, 'no JavaScript error' + (errors.length ? ': ' + errors.join(' | ') : ''));
  } catch (e) {
    console.error(e);
    failed++;
  } finally {
    await b.close();
  }
  process.exit(failed ? 1 : 0);
})();
