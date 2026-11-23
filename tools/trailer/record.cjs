// Records the gameplay clips of the trailer (vertical 1080×1920 webm), one per scene.
// Usage: node record.cjs <outDir> <lang>
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2];
const LANG = process.argv[3] || 'fr';
const KEYS = ['', 'arrow', 'lily', 'mushroom', 'daisy', 'mirror', 'comet'];
const W = 432;
const H = 768;

async function scene(browser, name, fn) {
  const ctx = await browser.newContext({
    viewport: null, // the window itself, 432×768 at a device scale of 2.5 (see launch)
    locale: LANG === 'fr' ? 'fr-FR' : 'en-US',
  });
  await ctx.addInitScript((lang) => {
    window.__LUMI_FIREBASE__ = { apiKey: '', projectId: '' };
    const seen = {};
    for (const k of ['lumi', 'lantern', 'arrow', 'rock', 'void', 'firefly', 'engraved', 'water', 'lily', 'spark', 'mushroom', 'daisy', 'portal', 'plate', 'brambles', 'gloomnib', 'sleeper', 'vane', 'cloud', 'mirror', 'comet']) seen[k] = 1;
    localStorage.setItem(
      'lumignons.save.v1',
      JSON.stringify({ v: 1, levels: {}, seen, online: { asked: true }, tips: { tour: 1, stars: 1, two: 1, loop: 1, place: 1, placeDone: 1, swipe: 1, long: 1, 'story-comets': 1 }, settings: { openAll: true, lang, music: false, sound: false, dots: false } }),
    );
    // A finger tap, drawn where the "player" touches.
    window.__tap = (x, y) => {
      const d = document.createElement('div');
      d.style.cssText = `position:fixed;left:${x - 22}px;top:${y - 22}px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.55);box-shadow:0 0 0 3px rgba(255,255,255,0.9);z-index:99999;pointer-events:none;transition:transform .45s ease-out, opacity .45s ease-out;`;
      document.body.appendChild(d);
      requestAnimationFrame(() => {
        d.style.transform = 'scale(1.7)';
        d.style.opacity = '0';
      });
      setTimeout(() => d.remove(), 600);
    };
  }, LANG);
  const p = await ctx.newPage();
  // Chrome's screencast gives sharp device-pixel frames (1080×1920) with timestamps.
  const dir = `${OUT}/${name}`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await ctx.newCDPSession(p);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    const file = `${dir}/${String(frames.length).padStart(5, '0')}.jpg`;
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  const t0 = Date.now();
  await p.goto('http://localhost:8080/index.html');
  console.log(name, 'viewport', await p.evaluate(() => [innerWidth, innerHeight, devicePixelRatio].join('×')));
  await p.waitForSelector('#screen-title.active');
  await p.evaluate(() => {
    for (const m of document.querySelectorAll('.modal')) m.remove();
    window.lumignons.modalStack.splice(0);
  });
  const marks = {};
  await fn(p, (k) => (marks[k] = (Date.now() - t0) / 1000));
  marks.end = (Date.now() - t0) / 1000;
  await cdp.send('Page.stopScreencast');
  await ctx.close();
  // Frame list for ffmpeg's concat demuxer: each frame lasts until the next one.
  const base = frames[0].t;
  marks.offset = base - t0 / 1000; // wall-clock start of the first frame, relative to t0
  let list = '';
  frames.forEach((f, i) => {
    const next = frames[i + 1] ? frames[i + 1].t : f.t + 1 / 30;
    list += `file '${f.file}'\nduration ${(next - f.t).toFixed(4)}\n`;
  });
  list += `file '${frames[frames.length - 1].file}'\n`;
  fs.writeFileSync(`${dir}.txt`, list);
  fs.writeFileSync(`${OUT}/${name}.json`, JSON.stringify(marks));
  console.log(name, JSON.stringify(marks));
}

const clean = (p) =>
  p.evaluate(() => {
    for (const m of document.querySelectorAll('.modal')) m.remove();
    window.lumignons.modalStack.splice(0);
  });

async function openLevel(p, id) {
  await p.evaluate((id) => window.lumignons.startLevel(id), id);
  await p.waitForTimeout(700);
  await clean(p);
  await p.waitForTimeout(300);
}

async function placeAll(p, delay) {
  const n = await p.evaluate(() => window.lumignons.game.solution.sol.length);
  for (let k = 0; k < n; k++) {
    await p.evaluate(
      ({ k, KEYS }) => {
        const g = window.lumignons.game;
        const [i, t, d] = g.solution.sol[k];
        const [x, y] = g.cellCenter(i);
        window.__tap(x, y);
        g.placeAt(i, KEYS[t], d);
        g.picker = null;
      },
      { k, KEYS },
    );
    await p.waitForTimeout(delay);
  }
}

const go = (p, speed = 1) =>
  p.evaluate((speed) => {
    const g = window.lumignons.game;
    g.picker = null;
    g.timeScale = speed;
    g.go();
  }, speed);

(async () => {
  fs.mkdirSync(OUT + '/raw', { recursive: true });
  // Screencast frames come at device pixels only without viewport emulation.
  const b = await chromium.launch({ args: ['--force-device-scale-factor=2.5', `--window-size=${W},${H}`] });
  // 1. The main level: place five arrows, press Go, three stars.
  await scene(b, 'main', async (p, mark) => {
    await openLevel(p, '1-10');
    mark('ready');
    await p.waitForTimeout(1200);
    mark('place');
    await placeAll(p, 650);
    await p.waitForTimeout(400);
    mark('go');
    await go(p, 1.25);
    await p.waitForSelector('.win-stars', { timeout: 60000 });
    mark('win');
    await p.waitForTimeout(2600);
  });
  // 2. A tour of the worlds, each already planned and running.
  for (const id of ['2-5', '3-6', '4-5', '6-3', '7-6', '8-5']) {
    await scene(b, 'w' + id, async (p, mark) => {
      await openLevel(p, id);
      await placeAll(p, 0);
      await p.waitForTimeout(300);
      mark('go');
      await go(p, 1.4);
      await p.waitForTimeout(4200);
      mark('cut');
    });
  }
  await b.close();
})();
