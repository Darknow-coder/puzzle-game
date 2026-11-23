// Online rankings, end to end: Chromium (Playwright) + the game on :8080 + the
// Firebase emulators (Authentication on :9099, Firestore on :8085, real rules).
//   npm start            (in another terminal)
//   npm run e2e:online   (starts the emulators and runs this file)
// First launch with the pseudo before the tutorial, rankings after a win, two
// players, a pseudo already taken, reporting, renaming, deleting one's data,
// results sent later when offline, a returning player's past results, and the
// game without any Firebase project.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8080/index.html';
const PROJECT = 'demo-lumignons';
const FS = 'http://127.0.0.1:8085';
const AUTH = 'http://127.0.0.1:9099';
const KEYS = ['', 'arrow', 'lily', 'mushroom', 'daisy', 'mirror', 'comet'];
let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) failed++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wipe() {
  await fetch(`${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}
async function adminList(collection) {
  const r = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${collection}`, { headers: { Authorization: 'Bearer owner' } });
  const j = await r.json();
  return j.documents || [];
}

(async () => {
  await wipe();
  const b = await chromium.launch();
  const errors = [];
  async function player({ firebase = true, save = null } = {}) {
    const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'fr-FR' });
    // Always set: the emulators, or no project at all (never the real one).
    await ctx.addInitScript((fb) => {
      window.__LUMI_FIREBASE__ = fb ? { apiKey: 'demo-key', projectId: 'demo-lumignons', emulator: { auth: 'http://127.0.0.1:9099', firestore: 'http://127.0.0.1:8085' } } : { apiKey: '', projectId: '' };
    }, firebase);
    if (save) {
      await ctx.addInitScript((s) => {
        if (!localStorage.getItem('lumignons.save.v1')) localStorage.setItem('lumignons.save.v1', s);
      }, JSON.stringify(save));
    }
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(String(e)));
    p.on('console', (m) => m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text()) && errors.push(m.text()));
    return { ctx, p };
  }
  const closeModals = (p) =>
    p.evaluate(() => {
      for (const m of document.querySelectorAll('.modal')) m.parentNode.removeChild(m);
      window.lumignons.modalStack.splice(0);
    });
  const win = async (p, id, { wait = 0 } = {}) => {
    if ((await p.evaluate(() => window.lumignons.game.L?.id)) !== id || (await p.evaluate(() => window.lumignons.screen)) !== 'game') {
      await p.evaluate((id) => window.lumignons.startLevel(id), id);
    }
    await p.waitForTimeout(300);
    await closeModals(p);
    if (wait) await p.waitForTimeout(wait);
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
  };
  const rankText = async (p) => {
    await p.waitForFunction(() => {
      const r = document.querySelector('.rank-line');
      return r && !r.classList.contains('busy') && r.textContent.trim().length > 0;
    }, null, { timeout: 15000 });
    return (await p.textContent('.rank-line')).replace(/\s+/g, ' ').trim();
  };
  const boardNames = async (p) => {
    await p.waitForSelector('.rk-body .rk-board', { timeout: 10000 });
    return p.$$eval('.rk-body .rk-board .rk-list .rk-row .rk-who b', (els) => els.map((e) => e.firstChild.textContent.trim()));
  };
  const toastHas = (p, txt) => p.waitForFunction((txt) => [...document.querySelectorAll('.toast')].some((t) => t.textContent.includes(txt)), txt, { timeout: 8000 }).then(() => true, () => false);

  try {
    // --- 1. First launch: the pseudo before anything else, then the tutorial.
    const A = await player();
    await A.p.goto(BASE);
    await A.p.waitForSelector('#screen-hello.active .nm-input');
    check(true, 'first launch opens on the pseudo screen');
    const suggested = await A.p.inputValue('.nm-input');
    check(suggested.length >= 3, `a pseudo is suggested (${suggested})`);
    await A.p.click('.nm-dice');
    check((await A.p.inputValue('.nm-input')) !== '', 'the dice draws another one');
    await A.p.fill('.nm-input', 'gros con');
    await A.p.waitForTimeout(200);
    check((await A.p.textContent('.nm-status')).includes('pas autorisé') && (await A.p.isDisabled('.nm-go')), 'a rude pseudo is refused on the spot');
    await A.p.fill('.nm-input', 'Lune Rêveuse');
    await A.p.waitForFunction(() => document.querySelector('.nm-status').textContent.includes('Libre'), null, { timeout: 8000 });
    check(true, 'an unused pseudo is shown as available');
    await A.p.click('.nm-colors button[data-c="2"]');
    await A.p.click('.nm-go');
    await A.p.waitForSelector('#screen-game.active', { timeout: 8000 });
    await A.p.waitForSelector('.modal .card h2');
    check((await A.p.textContent('.modal .card h2')).includes('Bienvenue, Lune Rêveuse'), 'then straight into the tutorial, which greets the player by name');
    check((await A.p.evaluate(() => window.lumignons.game.L.id)) === '1-1', 'on the first level');

    // --- 2. A win sends the result and shows the place.
    await win(A.p, '1-1', { wait: 2500 });
    let line = await rankText(A.p);
    check(/Nouveau record ! 1er sur 1/.test(line), `the victory card shows the place (${line})`);
    check(/1 essai · \d+ s/.test(line), 'with the tries and the time of the run');
    await A.p.click('.rank-line .rk-see');
    let names = await boardNames(A.p);
    check(names.length === 1 && names[0] === 'Lune Rêveuse', `the level's ranking lists the player (${names})`);
    check(!!(await A.p.$('.rk-row.me.top1')), 'highlighted as "toi", with the gold medal');
    await A.p.click('.rk-tabs [data-tab=global]');
    await A.p.waitForSelector('.rk-body .rk-board .rk-total');
    check((await A.p.textContent('.rk-body .rk-total')).includes('3'), 'the overall ranking counts the stars');
    await A.p.click('.rk-tabs [data-tab=daily]');
    await A.p.waitForSelector('.rk-body .rk-msg');
    check((await A.p.textContent('.rk-body .rk-msg')).includes('1-5'), 'the daily ranking waits for the daily puzzle to open');
    await closeModals(A.p);

    // --- 3. A second player: the pseudo is taken, then a faster run.
    const B = await player();
    await B.p.goto(BASE);
    await B.p.waitForSelector('#screen-hello.active .nm-input');
    await B.p.fill('.nm-input', 'lune-reveuse');
    await B.p.waitForSelector('.nm-status .nm-try', { timeout: 8000 });
    check((await B.p.textContent('.nm-status')).includes('Déjà pris'), 'the same pseudo spelled differently is taken');
    await B.p.click('.nm-try');
    check(/^lune-reveuse \d\d$/.test(await B.p.inputValue('.nm-input')), 'and another spelling is offered');
    await B.p.fill('.nm-input', 'Pip le Malin');
    await B.p.waitForFunction(() => document.querySelector('.nm-status').textContent.includes('Libre'), null, { timeout: 8000 });
    await B.p.click('.nm-go');
    await B.p.waitForSelector('#screen-game.active');
    await win(B.p, '1-1');
    line = await rankText(B.p);
    check(/Nouveau record ! 1er sur 2/.test(line), `faster with as many tries: first place (${line})`);
    check((await B.p.getAttribute('.rank-line', 'class')).includes('gold'), 'the first place shines');
    await B.p.click('.rank-line .rk-see');
    names = await boardNames(B.p);
    check(names.join('|') === 'Pip le Malin|Lune Rêveuse', `both players, in order (${names})`);

    // --- 4. Reporting a pseudo.
    await B.p.click('.rk-body .rk-board .rk-row:not(.me)');
    await B.p.waitForSelector('.rk-card [data-a=report]');
    await B.p.click('.rk-card [data-a=report]');
    await B.p.click('.modal:last-child [data-a=yes]');
    check(await toastHas(B.p, 'signalé'), 'a pseudo can be reported');
    await sleep(500);
    const reports = await adminList('reports');
    check(reports.length === 1, 'the report reaches the database');
    await closeModals(B.p);

    // --- 5. Renaming, from the title screen.
    await A.p.goto(BASE);
    await A.p.waitForSelector('#screen-title.active .me-chip');
    check((await A.p.textContent('.me-chip')).includes('Lune Rêveuse'), 'the title screen shows the player and their pseudo');
    await A.p.click('.me-chip');
    await A.p.waitForSelector('.profile [data-a=name]');
    await A.p.waitForFunction(() => /au classement général/.test(document.querySelector('.pf-rank')?.textContent || ''), null, { timeout: 8000 });
    check((await A.p.textContent('.pf-rank')).includes('★ 3'), `the profile shows the stars and the overall place (${(await A.p.textContent('.pf-rank')).trim()})`);
    await A.p.click('.profile [data-a=name]');
    await A.p.waitForSelector('.nm-dialog .nm-input');
    await A.p.fill('.nm-dialog .nm-input', 'Aurore Filante');
    await A.p.waitForFunction(() => document.querySelector('.nm-dialog .nm-status').textContent.includes('Libre'), null, { timeout: 8000 });
    await A.p.click('.nm-dialog .nm-go');
    check(await toastHas(A.p, 'Aurore Filante'), 'a new pseudo is saved');
    await A.p.waitForFunction(() => window.lumignons.online.status === 'idle' && window.lumignons.online.me().name === 'Aurore Filante', null, { timeout: 8000 });
    await sleep(600);
    const names2 = await adminList('names');
    check(names2.map((d) => d.name.split('/').pop()).sort().join(',') === 'aurorefilante,piplemalin', `the old pseudo is free again (${names2.map((d) => d.name.split('/').pop())})`);

    // --- 6. Deleting one's online data.
    await closeModals(A.p);
    await A.p.click('.me-chip');
    await A.p.waitForSelector('.profile [data-a=delete]');
    await A.p.click('.profile [data-a=delete]');
    await A.p.click('.modal:last-child [data-a=yes]');
    check(await toastHas(A.p, 'supprimées'), 'online data can be deleted');
    const left = await B.p.evaluate(async () => (await window.lumignons.online.board('1-1', { force: true })).rows.map((r) => r.name));
    check(left.join('|') === 'Pip le Malin', `the other player no longer sees them (${left})`);
    check((await A.p.evaluate(() => window.lumignons.online.me().optOut)) === true, 'and the game stops sending (until switched back on)');

    // --- 7. Offline: the result waits, then goes on its own.
    const C = await player();
    const block = (r) => r.abort();
    await C.ctx.route('http://127.0.0.1:8085/**', block);
    await C.ctx.route('http://127.0.0.1:9099/**', block);
    await C.p.goto(BASE);
    await C.p.waitForSelector('#screen-hello.active .nm-input');
    await C.p.fill('.nm-input', 'Brume Douce');
    await C.p.click('.nm-go');
    await C.p.waitForSelector('#screen-game.active');
    check(true, 'without network, the pseudo is kept and the game starts');
    await win(C.p, '1-1');
    line = await rankText(C.p);
    check(line.includes('Pas de connexion'), `the victory says the result will be sent later (${line})`);
    await C.ctx.unroute('http://127.0.0.1:8085/**', block);
    await C.ctx.unroute('http://127.0.0.1:9099/**', block);
    await C.p.evaluate(() => window.dispatchEvent(new Event('online')));
    await C.p.waitForFunction(() => window.lumignons.online.pendingCount() === 0, null, { timeout: 10000 });
    const after = await B.p.evaluate(async () => (await window.lumignons.online.board('1-1', { force: true })).rows.map((r) => r.name));
    check(after.includes('Brume Douce'), `back online, the result is sent (${after})`);

    // --- 8. A player from before the rankings.
    const D = await player({
      save: { v: 1, levels: { '1-1': { done: true, stars: 3, best: 1, tries: 3 }, '1-2': { done: true, stars: 2, best: 2, tries: 6, hint: true } }, settings: {} },
    });
    await D.p.goto(BASE);
    await D.p.waitForSelector('#screen-hello.active .nm-input');
    check((await D.p.textContent('#screen-hello h2')).includes('Nouveau'), 'a returning player is told about the rankings');
    await D.p.fill('.nm-input', 'Ancienne');
    await D.p.click('.nm-go');
    await D.p.waitForSelector('#screen-title.active');
    check(true, 'and goes back to the title screen');
    await D.p.waitForFunction(() => window.lumignons.online.pendingCount() === 0 && window.lumignons.online.status === 'idle', null, { timeout: 15000 });
    const g = await D.p.evaluate(async () => (await window.lumignons.online.globalBoard({ force: true })).rows.map((r) => `${r.name}:${r.stars}`));
    check(g.includes('Ancienne:5'), `past results are sent once (${g})`);

    // --- 10. Friends: add by pseudo, rankings among friends, a duel link.
    const F = await player({ save: { v: 1, levels: {}, online: { asked: true }, tips: { tour: 1 }, settings: {} } });
    await F.p.goto(BASE);
    await F.p.waitForSelector('#screen-title.active');
    await F.p.evaluate(() => window.lumignons.online.choose('Plume Agile'));
    await F.p.waitForFunction(() => window.lumignons.online.status === 'idle' && window.lumignons.online.me().uid, null, { timeout: 8000 });
    await F.p.click('#screen-title [data-act=ranks]');
    await F.p.click('.rk-tabs [data-tab=friends]');
    await F.p.waitForSelector('.fr-input');
    check((await F.p.textContent('.rk-friends')).includes('Pas encore d’amis'), 'the friends tab explains how to add friends');
    await F.p.fill('.fr-input', 'personne qui existe pas');
    await F.p.click('.fr-add button');
    await F.p.waitForFunction(() => document.querySelector('.fr-msg').textContent.includes('Personne'), null, { timeout: 8000 });
    check(true, 'an unknown pseudo is said so');
    await F.p.fill('.fr-input', 'pip le malin');
    await F.p.click('.fr-add button');
    await F.p.waitForSelector('.fr-list .fr-row', { timeout: 8000 });
    check((await F.p.textContent('.fr-list')).includes('Pip le Malin'), 'a friend is added by pseudo, whatever the spelling');
    await closeModals(F.p);
    // F solves 1-1 slower than Pip le Malin: second among friends.
    await win(F.p, '1-1', { wait: 3000 });
    line = await rankText(F.p);
    await F.p.waitForFunction(() => /Amis/.test(document.querySelector('.rank-line').textContent), null, { timeout: 8000 }).catch(() => {});
    line = (await F.p.textContent('.rank-line')).replace(/\s+/g, ' ');
    check(/Amis : 2e sur 2/.test(line), `the victory card shows the place among friends (${line})`);
    check(!!(await F.p.$('.duel-row')), 'and offers to challenge a friend');
    await F.p.click('.rank-line .rk-see');
    await F.p.waitForSelector('.rk-scope [data-scope=friends]');
    await F.p.click('.rk-scope [data-scope=friends]');
    names = await boardNames(F.p);
    check(names.join('|') === 'Pip le Malin|Plume Agile', `the level's ranking among friends (${names})`);
    await F.p.click('.rk-tabs [data-tab=global]');
    await F.p.waitForSelector('.rk-body .rk-board .rk-total');
    check((await F.p.$$('.rk-body .rk-board .rk-row')).length === 2, 'and the overall ranking among friends');
    await closeModals(F.p);
    // A duel link opens the level, with the challenger's result, and makes them friends.
    const fuid = await F.p.evaluate(() => window.lumignons.online.me().uid);
    const G = await player({ save: { v: 1, levels: {}, online: { name: 'Grillon Farceur', asked: true }, tips: { tour: 1 }, settings: {} } });
    await G.p.goto(BASE + '#defi=' + fuid + '.1-1');
    await G.p.waitForSelector('.duel [data-a=go]', { timeout: 10000 });
    check((await G.p.textContent('.duel')).includes('Plume Agile te défie') && (await G.p.textContent('.duel')).includes('1 essai'), 'a duel link shows who challenges, and their result');
    check(await G.p.evaluate((u) => window.lumignons.online.isFriend(u), fuid), 'the challenger becomes a friend');
    await G.p.click('.duel [data-a=go]');
    await G.p.waitForFunction(() => window.lumignons.screen === 'game' && window.lumignons.game.L.id === '1-1', null, { timeout: 5000 });
    check(true, 'and "Take the challenge" opens the level');
    // An invite link adds a friend after asking.
    const H = await player({ save: { v: 1, levels: {}, online: { name: 'Hibou Sage', asked: true }, tips: { tour: 1 }, settings: {} } });
    await H.p.goto(BASE + '#ami=' + fuid);
    await H.p.waitForSelector('.rk-card [data-a=yes]', { timeout: 10000 });
    await H.p.click('.rk-card [data-a=yes]');
    check(await H.p.evaluate((u) => window.lumignons.online.isFriend(u), fuid), 'an invite link adds a friend');

    // --- 9. No Firebase project: everything stays local, nothing breaks.
    const E = await player({ firebase: false });
    await E.p.goto(BASE);
    await E.p.waitForSelector('#screen-hello.active .nm-input');
    await E.p.click('.nm-later');
    await E.p.waitForSelector('#screen-game.active');
    check((await E.p.evaluate(() => window.lumignons.game.L.id)) === '1-1', '"Later" still leads to the tutorial');
    await E.p.goto(BASE);
    await E.p.waitForSelector('#screen-title.active');
    check((await E.p.textContent('.me-chip')).includes('Choisir un pseudo'), 'next time, the title screen invites to pick a pseudo (no second prompt)');
    await E.p.click('#screen-title [data-act=ranks]');
    await E.p.waitForSelector('.rk-modal .rk-msg');
    check((await E.p.textContent('.rk-modal .rk-msg')).includes('bientôt'), 'without a Firebase project, the rankings say they open soon');

    check(errors.length === 0, `no script errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  } catch (e) {
    console.error(e);
    failed++;
  }
  await b.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll online checks passed');
  process.exit(failed ? 1 : 0);
})();
