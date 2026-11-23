// Weekly quests (Playwright, server on :8080): progress from real wins, the
// victory card note, collecting rewards, and the free chest of the week.
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
  await ctx.addInitScript(() => {
    window.__LUMI_FIREBASE__ = { apiKey: '', projectId: '' }; // never the real rankings
    const K = 'lumignons.save.v1';
    if (!localStorage.getItem(K)) localStorage.setItem(K, JSON.stringify({ v: 1, levels: {}, online: { asked: true }, tips: { tour: 1 } }));
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  const closeModals = () =>
    p.evaluate(() => {
      for (const m of document.querySelectorAll('.modal')) m.parentNode.removeChild(m);
      window.lumignons.modalStack.splice(0);
    });
  const win = async (id) => {
    await p.evaluate((id) => window.lumignons.startLevel(id), id);
    await p.waitForTimeout(300);
    await closeModals();
    await p.evaluate(
      ([id, KEYS]) => {
        const g = window.lumignons.game;
        for (const [i, t, d] of window.lumignons.solutions[id].sol) g.placeAt(i, KEYS[t], d);
        g.picker = null;
        g.timeScale = 8;
        g.go();
      },
      [id, KEYS],
    );
    await p.waitForSelector('.win-stars', { timeout: 30000 });
    await p.waitForTimeout(400);
  };
  const home = async () => {
    await p.goto(BASE);
    await p.waitForSelector('#screen-title.active');
    await closeModals();
  };
  try {
    await home();
    // This week's quests are set for the test.
    await p.evaluate(() => {
      const app = window.lumignons;
      const s = app.quests.weekState(app.save.save, app.questCtx());
      s.ids = ['levels', 'firsttry', 'nohint'];
      s.n = {};
      s.seen = {};
      app.save.persistNow();
    });
    await p.click('[data-act=achievements]');
    await p.waitForSelector('.quests .q-card');
    const cards = await p.$$eval('.quests .q-card b', (els) => els.map((e) => e.textContent));
    check(cards.join('|') === 'Réussis 5 niveaux différents|Réussis 3 niveaux du premier coup|Réussis 4 niveaux sans indice', `the quests window lists the week's three quests (${cards.join(' | ')})`);
    check((await p.textContent('.q-renew')).includes('Nouvelles quêtes dans'), 'with the time left before new ones');
    check(!(await p.$('.q-open')), 'the chest of the week is locked');
    await closeModals();

    for (const id of ['1-1', '1-2', '1-3']) {
      await win(id);
      await closeModals();
    }
    await win('1-4');
    const note = await p.textContent('.unlock-list');
    check(note.includes('Quête accomplie') && note.includes('Réussis 4 niveaux sans indice'), `a finished quest shows on the victory card (${note.replace(/\s+/g, ' ').trim().slice(0, 100)})`);
    await closeModals();
    await win('1-5');
    await home();
    check(!!(await p.$('[data-act=achievements] .gift-dot')), 'the quests tile shows a dot when a reward waits');
    const coins0 = await p.evaluate(() => window.lumignons.wallet.wallet().coins);
    await p.click('[data-act=achievements]');
    await p.waitForSelector('.quests .q-claim');
    const claimable = (await p.$$('.quests .q-claim')).length;
    check(claimable === 3, `the three quests are done (${claimable} to collect)`);
    for (let i = 0; i < claimable; i++) {
      await p.click('.quests .q-claim');
      await p.waitForTimeout(150);
    }
    const coins1 = await p.evaluate(() => window.lumignons.wallet.wallet().coins);
    check(coins1 - coins0 === 180, `each one pays 60 ✦ (+${coins1 - coins0})`);
    check(!!(await p.$('.q-chest.ready .q-open')), 'then the chest of the week opens');
    const owned0 = await p.evaluate(() => Object.keys(window.lumignons.wallet.wallet().owned).length);
    await p.click('.q-open');
    await p.waitForSelector('#screen-shop.active');
    await p.waitForSelector('.chest-info.show', { timeout: 8000 });
    await p.click('.chest-info [data-a=later]');
    const w = await p.evaluate(() => ({ owned: Object.keys(window.lumignons.wallet.wallet().owned).length, coins: window.lumignons.wallet.wallet().coins }));
    check(w.owned === owned0 + 1 && w.coins === coins1, 'the chest is free and gives a new item');
    await home();
    check(!(await p.$('[data-act=achievements] .gift-dot')), 'nothing left to collect this week');
    await p.click('[data-act=achievements]');
    await p.click('.quests [data-tab=achievements]');
    check((await p.textContent('.quests')).includes('Premiers pas'), 'achievements are in the same window');
    check(errors.length === 0, `no script errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  } catch (e) {
    console.error(e);
    failed++;
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
