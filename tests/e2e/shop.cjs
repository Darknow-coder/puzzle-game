// The éclats economy and the shop (Playwright + Chromium, local server on :8080):
// rewards paid once, hint tokens and on-the-spot purchase, then the shop screen —
// gift, trying on, buying for all or for one Lumignon, the daily offer, the
// surprise chest, the collection — the daily puzzle, and the welcome grant.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8080/index.html';
let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) failed++;
};
const KEYS = ['', 'arrow', 'lily', 'mushroom', 'daisy', 'mirror', 'comet'];

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'fr-FR' });
  // These tests start past the first-launch pseudo screen (tests/e2e/ranks.cjs covers it).
  await ctx.addInitScript(() => {
    window.__LUMI_FIREBASE__ = { apiKey: '', projectId: '' }; // never the real rankings
    const K = 'lumignons.save.v1';
    if (!localStorage.getItem(K)) localStorage.setItem(K, JSON.stringify({ v: 1, levels: {}, online: { asked: true } }));
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const wallet = () =>
    p.evaluate(() => {
      const w = window.lumignons.wallet.wallet();
      return { coins: w.coins, hints: w.hints, trail: w.trail, party: w.party, owned: { ...w.owned }, looks: JSON.parse(JSON.stringify(w.looks)), same: w.same, log: w.log.map((e) => e.k) };
    });
  const closeModals = () =>
    p.evaluate(() => {
      for (const m of document.querySelectorAll('.modal')) m.parentNode.removeChild(m);
      window.lumignons.modalStack.splice(0);
    });
  const winWith = async (id) => {
    await p.evaluate((id) => window.lumignons.startLevel(id), id);
    await p.waitForTimeout(400);
    await closeModals();
    await p.evaluate(
      ([id, KEYS]) => {
        const app = window.lumignons;
        const g = app.game;
        for (const [i, t, d] of app.solutions[id].sol) g.placeAt(i, KEYS[t], d);
        g.picker = null;
        g.timeScale = 8;
        g.go();
      },
      [id, KEYS],
    );
    await p.waitForSelector('.win-stars', { timeout: 30000 });
    await p.waitForTimeout(2300);
  };
  const placeGhost = () =>
    p.evaluate((KEYS) => {
      const g = window.lumignons.game;
      const h = g.hintCells[g.hintCells.length - 1];
      g.placeAt(h.idx, KEYS[h.type], h.dir);
    }, KEYS);
  try {
    await p.goto(BASE);
    await p.waitForSelector('#screen-title.active');
    let w = await wallet();
    check(w.coins === 60 && w.hints === 3 && !(await p.$('.modal')), 'a new player starts with 60 éclats and 3 hints, without a welcome message');
    check((await p.textContent('#screen-title .coin-pill b')) === '60', 'the title shows the purse');

    // Rewards: firsts only.
    await winWith('1-1');
    const earned = await p.textContent('.coins-earned');
    w = await wallet();
    check(earned.includes('Premier passage +10') && earned.includes('3 nouvelles étoiles +15'), `the victory shows what was earned (${earned.replace(/\s+/g, ' ').trim()})`);
    check(w.coins === 60 + Number(earned.match(/\+(\d+)/)[1]), 'and it is in the purse');
    await closeModals();
    await winWith('1-1');
    check(!(await p.$('.coins-earned')) && (await wallet()).coins === w.coins, 'replaying the same result pays nothing');
    await closeModals();

    // Hints: tokens, the same ghost for free, then a purchase on the spot.
    await p.evaluate(() => window.lumignons.startLevel('1-10'));
    await p.waitForTimeout(400);
    await closeModals();
    check((await p.textContent('#screen-game .hint-badge')) === '3', 'the hint button shows the tokens left');
    const useHint = async () => {
      await p.click('[data-act=hint]');
      await p.waitForTimeout(150);
    };
    await useHint();
    await useHint();
    check((await wallet()).hints === 2, 'showing the same hint again is free');
    for (let i = 0; i < 2; i++) {
      await placeGhost();
      await useHint();
    }
    await placeGhost();
    check((await wallet()).hints === 0 && (await p.textContent('#screen-game .hint-badge')).includes('20'), 'each new hint uses a token; then the button shows the price');
    const before = (await wallet()).coins;
    await p.keyboard.press('h');
    await p.waitForSelector('.modal [data-a=buy]');
    await p.click('.modal [data-a=buy]');
    await p.waitForTimeout(200);
    check((await wallet()).coins === before - 20, 'the keyboard shortcut goes through the same purchase (−20 ✦)');
    await p.evaluate(() => (window.lumignons.wallet.wallet().coins = 5));
    await placeGhost();
    await useHint();
    check((await p.$('.modal [data-a=buy]')) === null && (await p.textContent('.modal')).includes('Il te manque 15'), 'without enough éclats: no purchase, the missing amount instead');
    await closeModals();

    // The shop screen.
    await p.evaluate(() => (window.lumignons.wallet.wallet().coins = 2000));
    await p.evaluate(() => {
      window.lumignons.screen = 'title';
    });
    await p.goto(BASE);
    await p.waitForSelector('#screen-title.active');
    await p.click('#screen-title .shop-tile');
    await p.waitForSelector('#screen-shop.active');
    await p.waitForTimeout(300);
    check((await p.evaluate(() => window.lumignons.screen)) === 'shop' && (await p.textContent('#screen-shop .bubble')).length > 5, 'the shop opens, and Madame Phalène speaks');
    const g0 = (await wallet()).coins;
    await p.click('#screen-shop [data-a=gift]');
    await p.waitForTimeout(700);
    check((await wallet()).coins === g0 + 15 && !(await p.$('#screen-shop [data-a=gift]')), 'the daily gift opens once (+15)');
    await p.evaluate(() => (window.lumignons.wallet.wallet().coins = 2000));
    const offer = await p.evaluate(() => {
      const o = window.lumignons.wallet.offer();
      return { id: o.item.id, price: o.price, full: o.full };
    });
    check(offer.price < offer.full && (await p.textContent('#screen-shop .offer-card')).includes('−30 %'), 'today’s offer is shown at −30 %');
    await p.click('#screen-shop .offer-card .btn');
    await p.waitForTimeout(300);
    check((await p.textContent('#screen-shop .shop-action')).includes(String(offer.price)), 'its card opens with the discounted price');

    // Trying on and buying a hat for all four.
    await p.click('#screen-shop [data-tab=hat]');
    await p.waitForTimeout(200);
    await p.click('#screen-shop .sk-card[data-item="beret"]');
    await p.waitForTimeout(200);
    check((await p.evaluate(() => window.lumignons.shopScene.preview?.id)) === 'beret', 'touching a card makes the Lumignons try it on');
    const c0 = (await wallet()).coins;
    await p.click('#screen-shop .shop-action [data-a=buy]');
    await p.waitForTimeout(900);
    w = await wallet();
    check(w.owned.beret && w.coins === c0 - 110 && w.looks.every((l) => l.hat === 'beret'), 'the beret is bought and worn by all four');
    // Glasses for Lou only.
    await p.click('#screen-shop [data-who="2"]');
    await p.click('#screen-shop [data-tab=glasses]');
    await p.waitForTimeout(200);
    await p.click('#screen-shop .sk-card[data-item="shades"]');
    await p.click('#screen-shop .shop-action [data-a=buy]');
    await p.waitForTimeout(900);
    w = await wallet();
    check(!w.same && w.looks.map((l) => l.glasses).join() === 'none,none,shades,none', 'sunglasses for Lou alone');
    check((await p.evaluate(() => window.lumignons.dress(2).glasses)) === 'shades', 'and the game dresses Lou with them');

    // The surprise chest: a ceremony, then a new item.
    const ownedBefore = Object.keys((await wallet()).owned).length;
    await p.click('#screen-shop [data-tab=featured]');
    await p.waitForTimeout(200);
    check((await p.textContent('#screen-shop .chest-card')).includes('Légendaire 4 %'), 'the chest shows its odds');
    await p.click('#screen-shop .chest-btn');
    await p.waitForSelector('.chest-overlay.show');
    await p.waitForSelector('.chest-info.show', { timeout: 6000 });
    const chestName = await p.textContent('.chest-info b');
    await p.click('.chest-info [data-a=wear]');
    await p.waitForTimeout(400);
    w = await wallet();
    check(Object.keys(w.owned).length === ownedBefore + 1 && chestName.length > 1 && w.log.includes('chest'), `the chest gives something new (${chestName})`);

    // Collection book.
    await p.click('#screen-shop [data-tab=collection]');
    await p.waitForTimeout(300);
    const book = await p.textContent('#screen-shop .shop-panel');
    check(book.includes('25 %') && book.includes('???'), 'the collection shows the milestones and silhouettes of what is missing');
    // The journal.
    await p.click('#screen-shop [data-a=info]');
    await p.waitForSelector('.shop-info');
    check((await p.$$('.shop-info .log .row')).length >= 5, 'the journal lists the purchases and gains');
    await closeModals();
    // Back to the title.
    await p.click('#screen-shop [data-a=back]');
    await p.waitForTimeout(300);
    check((await p.evaluate(() => window.lumignons.screen)) === 'title', 'the back button leaves the shop');

    // Daily puzzle: paid once a day.
    await p.evaluate(() => {
      const S = window.lumignons.save;
      for (let l = 1; l <= 5; l++) S.save.data.levels['1-' + l] = { done: true, stars: 3 };
    });
    const d0 = (await wallet()).coins;
    await p.evaluate(() => document.querySelector('#screen-title [data-act=daily]').click());
    await p.waitForTimeout(400);
    await closeModals();
    await p.evaluate(() => {
      const g = window.lumignons.game;
      g.timeScale = 8;
      for (const [i, t, d] of g.solution.sol) g.placeAt(i, ['', 'arrow', 'lily', 'mushroom', 'daisy', 'mirror', 'comet'][t], d);
      g.go();
    });
    await p.waitForSelector('.win-stars', { timeout: 30000 });
    await p.waitForTimeout(2300);
    check((await p.textContent('.coins-earned')).includes('Défi du jour +15') && (await wallet()).coins >= d0 + 15, 'the daily puzzle pays +15');
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
    check(txt.includes('La boutique ouvre') && txt.includes('45'), 'an older save is welcomed with what its progress is worth (45 ✦)');
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
