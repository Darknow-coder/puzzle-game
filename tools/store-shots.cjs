// Store screenshots (1080×1920, JPEG) and the Google Play feature graphic (1024×500).
// Run with the local server on :8080:  node tools/store-shots.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'store', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:8080/index.html';

// The rankings are shown with a stand-in for Firebase: the game's real code talks to these answers.
const PEOPLE = {
  fr: ['Comète Rusée', 'Pip le Malin', null, 'Zoé-Lou', 'Hibou Sage', 'Brume Douce', 'Grillon Farceur', 'Lanterne Vive', 'Plume Agile', 'Nuage Câlin', 'Renard Doré', 'Aurore 77'],
  en: ['Sly Comet', 'Clever Pip', null, 'Zoe-Lou', 'Wise Owl', 'Misty Moth', 'Cheeky Cricket', 'Bright Lantern', 'Nimble Feather', 'Cosy Cloud', 'Golden Fox', 'Aurora 77'],
};
const LOOKS = [
  [1, 'tophat', 'monocle', 'flame-star'],
  [0, 'aurora', 'none', 'classic'],
  [2, 'beret', 'shades', 'classic'],
  [2, 'bow', 'lovely', 'classic'],
  [3, 'antlers', 'shades', 'flame-heart'],
  [3, 'raincloud', 'round', 'classic'],
  [1, 'headphones', 'none', 'flame-swirl'],
  [0, 'straw', 'starry', 'classic'],
  [1, 'partyhat', 'none', 'classic'],
  [2, 'pompom', 'round', 'classic'],
  [0, 'chef', 'none', 'flame-twin'],
  [3, 'phoenix', 'visor', 'flame-sparkler'],
];
async function fakeFirebase(ctx, lang, myName) {
  const DB = 'projects/demo-shots/databases/(default)/documents';
  const now = new Date().toISOString();
  const S = (v) => ({ stringValue: v });
  const I = (v) => ({ integerValue: String(v) });
  const people = PEOPLE[lang].map((n, i) => ({ uid: n ? 'u' + i : 'u-me', name: n || myName, look: LOOKS[i] }));
  const player = (p, i) => ({
    name: `${DB}/players/${p.uid}`,
    fields: { name: S(p.name), key: S(p.uid), color: I(p.look[0]), hat: S(p.look[1]), glasses: S(p.look[2]), flame: S(p.look[3]), stars: I(150 - i * 9), gkey: I(0), lastBoard: S(''), v: I(1) },
  });
  const entry = (p, i, board) => {
    const tries = [1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 6][i];
    const ms = [38000, 46000, 51000, 64000, 71000, 83000, 97000, 104000, 121000, 133000, 162000, 190000][i];
    const fields = { stars: I(3), pieces: I(5), helped: { booleanValue: i === 7 }, tries: I(tries), ms: I(ms), key: I(i), min: I(3), par: I(5), v: I(1) };
    return { name: `${DB}/boards/${board}/entries/${p.uid}`, fields };
  };
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
  const json = (route, body, status = 200) => route.fulfill({ status, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const handler = async (route) => {
    const req = route.request();
    const url = req.url();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.includes('accounts:signUp') || url.includes('/token?')) {
      return json(route, { localId: 'u-me', user_id: 'u-me', idToken: 't', id_token: 't', refreshToken: 'r', refresh_token: 'r', expiresIn: '3600', expires_in: '3600' });
    }
    const body = req.postDataJSON?.() || {};
    if (url.includes(':batchGet')) {
      return json(route, (body.documents || []).map((n) => {
        const i = people.findIndex((p) => n.endsWith('/players/' + p.uid));
        return i >= 0 ? { found: player(people[i], i), readTime: now } : { missing: n, readTime: now };
      }));
    }
    if (url.includes(':runQuery')) {
      const board = (url.match(/boards\/([^:/]+):runQuery/) || [])[1];
      if (board) return json(route, people.map((p, i) => ({ document: entry(p, i, board), readTime: now })));
      return json(route, people.map((p, i) => ({ document: player(p, i), readTime: now })));
    }
    if (url.includes(':runAggregationQuery')) {
      const where = !!body.structuredAggregationQuery?.structuredQuery?.where;
      return json(route, [{ result: { aggregateFields: { n: I(where ? 2 : 342) } }, readTime: now }]);
    }
    if (url.includes(':commit')) return json(route, { writeResults: (body.writes || []).map(() => ({ updateTime: now })), commitTime: now });
    return json(route, { error: { code: 404, status: 'NOT_FOUND', message: 'not found' } }, 404);
  };
  await ctx.route('https://firestore.googleapis.com/**', handler);
  await ctx.route('https://identitytoolkit.googleapis.com/**', handler);
  await ctx.route('https://securetoken.googleapis.com/**', handler);
  await ctx.addInitScript(() => {
    window.__LUMI_FIREBASE__ = { apiKey: 'shots', projectId: 'demo-shots' };
  });
}

const SEEN = { lumi: 1, lantern: 1, arrow: 1, void: 1, firefly: 1, rock: 1, engraved: 1, water: 1, lily: 1, spark: 1, mushroom: 1, daisy: 1, portal: 1, plate: 1, brambles: 1, gloomnib: 1, sleeper: 1, vane: 1, cloud: 1 };
function seed(lang) {
  const levels = {};
  const ids = [];
  for (let w = 1; w <= 6; w++) {
    for (let l = 1; l <= 10; l++) ids.push(`${w}-${l}`);
    ids.push(`${w}-B`);
  }
  ids.slice(0, 38).forEach((id, i) => (levels[id] = { done: true, stars: i % 4 === 0 ? 2 : 3, fireflies: 2, best: 4, tries: 1 }));
  // 2-9 is replayed in the screenshots, from ★★ to ★★★: a new record.
  levels['2-9'] = { done: true, stars: 2, fireflies: 2, best: 8, tries: 3 };
  const online = { name: lang === 'fr' ? 'Lune Rêveuse' : 'Dreamy Moon', asked: true, color: 2, uid: 'u-me', refresh: 'r' };
  // Every past result is already online: only the new one is sent.
  const boards = Object.fromEntries(ids.slice(0, 38).map((id) => [id, { tries: 1, ms: 0, best: { key: 1 }, sent: 1, server: 1 }]));
  boards['2-9'] = { tries: 0, ms: 44000, best: { stars: 2, pieces: 8, helped: false, tries: 3, ms: 95000, key: 1e15 }, sent: 1e15, server: 1e15 };
  return JSON.stringify({ v: 1, levels, online, boards, settings: { music: false, sound: false, vibration: false, lang, speed: 1, dots: true }, hat: 'flowers', seen: SEEN, tips: { stars: 1, two: 1, loop: 1, place: 1, placeDone: 1, swipe: 1, long: 1, editor: 1 }, achievements: {}, hatsSeen: { none: 1, leaf: 1, acorn: 1, flowers: 1, lily: 1, mushroom: 1 }, worldsSeen: { meadow: 1, pond: 1, grove: 1, ruins: 1 }, stats: {}, daily: { results: {}, streak: 3, best: 3, last: null }, wallet: { coins: 640, hints: 4, earned: 900, spent: 260, hintsUsed: 3, log: [], gift: { day: null, streak: 0 }, owned: { sparkle: 1 }, trail: 'sparkle', welcome: 0 } });
}

(async () => {
  const b = await chromium.launch();
  for (const lang of ['fr', 'en']) {
    const ctx = await b.newContext({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 1080 / 405, isMobile: true, hasTouch: true, locale: lang });
    await ctx.addInitScript((s) => {
      try {
        localStorage.setItem('lumignons.save.v1', s);
      } catch {}
    }, seed(lang));
    await fakeFirebase(ctx, lang, lang === 'fr' ? 'Lune Rêveuse' : 'Dreamy Moon');
    const p = await ctx.newPage();
    const shot = async (name) => p.screenshot({ path: path.join(OUT, `${lang}-${name}.jpg`), type: 'jpeg', quality: 88 });
    const clean = () => p.evaluate(() => {
      document.querySelectorAll('.modal,.toast').forEach((m) => m.remove());
      window.lumignons.modalStack.splice(0);
    });
    await p.goto(BASE);
    await p.waitForTimeout(1200);
    await shot('1-title');
    await p.click('[data-act=play]');
    await p.waitForTimeout(900);
    await shot('2-map');
    // A pond level mid-run, with light trails.
    await p.evaluate(() => window.lumignons.startLevel('2-10'));
    await p.waitForTimeout(500);
    await clean();
    await p.evaluate(() => {
      const app = window.lumignons;
      const g = app.game;
      for (const [i, t, d] of app.solutions['2-10'].sol) g.placeAt(i, ['', 'arrow', 'lily', 'mushroom', 'daisy', 'mirror'][t], d);
      g.picker = null;
      g.go();
    });
    await p.waitForTimeout(4200);
    await shot('3-play');
    // Victory, with the player's new place in the level's ranking.
    await p.evaluate(() => window.lumignons.save.collectUnlocks()); // rewards of the seeded progress, out of the way
    await p.evaluate(() => window.lumignons.startLevel('2-9'));
    await p.waitForTimeout(500);
    await clean();
    await p.waitForTimeout(1500);
    await p.evaluate(() => {
      const app = window.lumignons;
      const g = app.game;
      for (const [i, t, d] of app.solutions['2-9'].sol) g.placeAt(i, ['', 'arrow', 'lily', 'mushroom', 'daisy', 'mirror'][t], d);
      g.picker = null;
      g.timeScale = 6;
      g.go();
    });
    await p.waitForSelector('.win-stars', { timeout: 30000 });
    await p.waitForSelector('.rank-line.podium', { timeout: 10000 });
    await p.waitForTimeout(1600);
    await shot('4-victory');
    // The level's ranking: the other players and their dressed-up Lumignons.
    await p.click('.rank-line .rk-see');
    await p.waitForSelector('.rk-body .rk-board');
    await p.waitForTimeout(900);
    await shot('5-ranks');
    await clean();
    // Crystal Dawn: three Lumignons among the mirrors, mid-run.
    await p.evaluate(() => window.lumignons.startLevel('7-10'));
    await p.waitForTimeout(500);
    await clean();
    await p.evaluate(() => {
      const app = window.lumignons;
      const g = app.game;
      for (const [i, t, d] of app.solutions['7-10'].sol) g.placeAt(i, ['', 'arrow', 'lily', 'mushroom', 'daisy', 'mirror'][t], d);
      g.picker = null;
      g.timeScale = 1;
      g.go();
    });
    await p.waitForTimeout(3400);
    await shot('6-dawn');
    // Workshop editor.
    await p.evaluate(() => window.lumignons.atelier.openEditor(null));
    await p.waitForTimeout(800);
    await clean();
    await shot('7-atelier');
    // Madame Phalène's shop, the Lumignons trying on a top hat.
    await p.evaluate(() => window.lumignons.shop.open('hat'));
    await p.waitForTimeout(700);
    await clean();
    await p.click('#screen-shop .sk-card[data-item="tophat"]');
    await p.waitForTimeout(1200);
    await shot('8-shop');
    await ctx.close();
  }
  // Feature graphic 1024×500.
  const ctx = await b.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(BASE.replace('index.html', 'tools/preview/feature.html'));
  await p.waitForFunction(() => window.done === true);
  await p.screenshot({ path: path.join(OUT, 'feature-graphic.jpg'), type: 'jpeg', quality: 90 });
  await b.close();
  console.log('screenshots written to', OUT);
})();
