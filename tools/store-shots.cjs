// Store screenshots (1080×1920, JPEG) and the Google Play feature graphic (1024×500).
// Run with the local server on :8080:  node tools/store-shots.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'store', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:8080/index.html';

const SEEN = { lumi: 1, lantern: 1, arrow: 1, void: 1, firefly: 1, rock: 1, engraved: 1, water: 1, lily: 1, spark: 1, mushroom: 1, daisy: 1, portal: 1, plate: 1, brambles: 1, gloomnib: 1, sleeper: 1, vane: 1, cloud: 1 };
function seed(lang) {
  const levels = {};
  const ids = [];
  for (let w = 1; w <= 6; w++) {
    for (let l = 1; l <= 10; l++) ids.push(`${w}-${l}`);
    ids.push(`${w}-B`);
  }
  ids.slice(0, 38).forEach((id, i) => (levels[id] = { done: true, stars: i % 4 === 0 ? 2 : 3, fireflies: 2, best: 4, tries: 1 }));
  return JSON.stringify({ v: 1, levels, settings: { music: false, sound: false, vibration: false, lang, speed: 1, dots: true }, hat: 'flowers', seen: SEEN, tips: { stars: 1, two: 1, loop: 1, place: 1, placeDone: 1, swipe: 1, long: 1, editor: 1 }, achievements: {}, hatsSeen: { none: 1, leaf: 1, acorn: 1, flowers: 1, lily: 1, mushroom: 1 }, worldsSeen: { meadow: 1, pond: 1, grove: 1, ruins: 1 }, stats: {}, daily: { results: {}, streak: 3, best: 3, last: null } });
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
    // Victory with the constellation of the path.
    await p.evaluate(() => {
      window.lumignons.game.timeScale = 6;
    });
    await p.waitForSelector('.win-stars', { timeout: 30000 });
    await p.waitForTimeout(1600);
    await shot('4-victory');
    await clean();
    // Gloomnib forest, planning.
    await p.evaluate(() => window.lumignons.startLevel('5-8'));
    await p.waitForTimeout(700);
    await clean();
    await shot('5-gloom');
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
