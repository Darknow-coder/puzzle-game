// Books of énigmes (Playwright, server on :8080): opened by finishing a world,
// 20 puzzles in three tiers, played from the book, chained with "Next".
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8080/index.html';
const KEYS = ['', 'arrow', 'lily', 'mushroom', 'daisy', 'mirror'];
let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) failed++;
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'fr-FR' });
  const levels = {};
  for (let i = 1; i <= 10; i++) levels['1-' + i] = { done: true, stars: 3, best: 3, tries: 1 };
  await ctx.addInitScript((levels) => {
    window.__LUMI_FIREBASE__ = { apiKey: '', projectId: '' }; // never the real rankings
    const K = 'lumignons.save.v1';
    if (!localStorage.getItem(K)) localStorage.setItem(K, JSON.stringify({ v: 1, levels, online: { asked: true }, tips: { tour: 1, stars: 1, two: 1, loop: 1, place: 1, placeDone: 1, swipe: 1, long: 1 }, worldsSeen: { meadow: 1, pond: 1 } }));
  }, levels);
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  const closeModals = () =>
    p.evaluate(() => {
      for (const m of document.querySelectorAll('.modal')) m.parentNode.removeChild(m);
      window.lumignons.modalStack.splice(0);
    });
  try {
    await p.goto(BASE);
    await p.waitForSelector('#screen-title.active');
    await closeModals();
    await p.click('[data-act=play]');
    await p.waitForSelector('#screen-map .enigma-card');
    const cards = await p.$$eval('#screen-map .enigma-card', (els) => els.map((e) => e.className.includes('locked')));
    check(cards.length === 7 && !cards[0] && cards.slice(1).every((x) => x), 'every world has its book; world 1 finished opens the first one only');
    await p.waitForTimeout(600);
    const modal = await p.evaluate(() => document.querySelector('.modal.show')?.textContent.slice(0, 80) || '');
    if (modal) console.log('  (map opened with a dialog: ' + modal + ')');
    await closeModals();
    await p.click('#screen-map .enigma-card:not(.locked)');
    await p.waitForSelector('.enigmas .en-node');
    const tiers = await p.$$eval('.enigmas .en-tier-name', (els) => els.map((e) => e.textContent));
    const nodes = (await p.$$('.enigmas .en-node')).length;
    check(nodes >= 15 && tiers.join() === 'Malin,Rusé,Génie', `the book holds ${nodes} énigmes in three tiers (${tiers})`);
    await p.click('.enigmas .en-node[data-id="e1-01"]');
    await p.waitForFunction(() => window.lumignons.screen === 'game' && window.lumignons.game.L.id === 'e1-01');
    check((await p.textContent('#screen-game .lv-num')).includes('1-1') && (await p.textContent('#screen-game .lv-name')) === 'Énigme 1', 'an énigme opens in the game, with its label');
    await closeModals();
    await p.evaluate((KEYS) => {
      const g = window.lumignons.game;
      for (const [i, t, d] of g.solution.sol) g.placeAt(i, KEYS[t], d);
      g.picker = null;
      g.timeScale = 8;
      g.go();
    }, KEYS);
    await p.waitForSelector('.win-stars', { timeout: 30000 });
    await p.waitForTimeout(1600);
    check((await p.$$('.win-star.on')).length === 3, 'its perfect layout gives three stars');
    check(await p.evaluate(() => !!window.lumignons.save.save.data.achievements.enigma1), 'the first énigme earns an achievement');
    await p.click('.modal [data-a=next]');
    await p.waitForFunction(() => window.lumignons.game.L.id === 'e1-02');
    check(true, '"Next" goes on to the next énigme');
    const st = await p.evaluate(() => window.lumignons.save.enigmaStats(0));
    check(st.done === 1 && st.stars === 3, 'the book counts its stars');
    check(await p.evaluate(() => window.lumignons.save.totalStars() === 30), 'the campaign total of stars is unchanged');
    check(errors.length === 0, `no script errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  } catch (e) {
    console.error(e);
    failed++;
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
