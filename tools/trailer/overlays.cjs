// Draws the trailer's captions (transparent 1080×1920 PNGs) and its end card.
// Usage: node overlays.cjs <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2];
const font = fs.readFileSync(require('path').join(__dirname, '../../') + 'assets/fonts/fredoka-latin-wght.woff2').toString('base64');
const art = fs.readFileSync(require('path').join(__dirname, '../../') + 'assets/brand/lumignons-art.jpg').toString('base64');

const TEXT = {
  fr: {
    a1: ['Ils foncent tout droit…', 'Montre-leur le chemin !'],
    a2: ['Appuie sur Go…', 'et regarde !'],
    a3: ['Toutes les lucioles', '= 3 étoiles'],
    b1: ['8 mondes enchantés'],
    b2: ['88 niveaux', '+ 160 énigmes'],
    end: { sub: 'LE CHEMIN DES LANTERNES', tag: ['Guide les petites lueurs', 'jusqu’à leurs lanternes'], small: 'Un puzzle tout doux · gratuit · sans pub', cta: 'Joue maintenant !' },
  },
  en: {
    a1: ['They walk straight ahead…', 'Show them the way home!'],
    a2: ['Tap Go…', 'and watch!'],
    a3: ['Catch every firefly', 'for 3 stars'],
    b1: ['8 magical worlds'],
    b2: ['88 levels', '+ 160 brain teasers'],
    end: { sub: 'LANTERN PATH', tag: ['Guide the little lights', 'home to their lanterns'], small: 'A cozy puzzle · free · no ads', cta: 'Play now!' },
  },
};
const URL_TXT = 'darknow-coder.github.io/puzzle-game';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent(`<style>@font-face{font-family:F;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:300 700}</style>`);
  await p.evaluate(async () => {
    await document.fonts.load('700 80px F');
    await document.fonts.load('600 40px F');
  });
  for (const [lang, T] of Object.entries(TEXT)) {
    const imgs = await p.evaluate(
      async ({ T, art, URL_TXT }) => {
        const out = {};
        const W = 1080;
        const H = 1920;
        const glowText = (g, t, x, y, size, col) => {
          g.font = `700 ${size}px F`;
          // Long lines shrink to keep a margin on each side.
          while (g.measureText(t).width > W - 120 && size > 40) g.font = `700 ${(size -= 2)}px F`;
          g.textAlign = 'center';
          g.lineJoin = 'round';
          g.shadowColor = 'rgba(255,170,60,0.75)';
          g.shadowBlur = 24;
          g.fillStyle = '#b8692a';
          g.fillText(t, x, y + size * 0.07);
          g.shadowColor = 'rgba(255,200,100,0.85)';
          g.shadowBlur = 12;
          g.fillStyle = col;
          g.fillText(t, x, y);
          g.shadowBlur = 0;
        };
        // Captions: a soft dark band at the top (over the level's title bar).
        for (const key of ['a1', 'a2', 'a3', 'b1', 'b2']) {
          const c = document.createElement('canvas');
          c.width = W;
          c.height = H;
          const g = c.getContext('2d');
          const lines = T[key];
          const bandH = 120 + lines.length * 110;
          const grd = g.createLinearGradient(0, 0, 0, bandH + 80);
          grd.addColorStop(0, 'rgba(18,12,40,0.97)');
          grd.addColorStop(0.75, 'rgba(18,12,40,0.9)');
          grd.addColorStop(1, 'rgba(18,12,40,0)');
          g.fillStyle = grd;
          g.fillRect(0, 0, W, bandH + 80);
          lines.forEach((t, i) => glowText(g, t, W / 2, 150 + i * 112, i === 0 ? 92 : 84, i === 0 ? '#fff4d6' : '#ffe08a'));
          out[key] = c.toDataURL('image/png');
        }
        // End card: the art, the name, the promise, where to play.
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const g = c.getContext('2d');
        const bg = g.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#120c2b');
        bg.addColorStop(0.55, '#2a1a4d');
        bg.addColorStop(1, '#1a1235');
        g.fillStyle = bg;
        g.fillRect(0, 0, W, H);
        const im = new Image();
        im.src = 'data:image/jpeg;base64,' + art;
        await im.decode();
        // The art fades into the background at its edges.
        const s = 1000;
        const ax = (W - s) / 2;
        const ay = 560;
        const tmp = document.createElement('canvas');
        tmp.width = s;
        tmp.height = s;
        const tg = tmp.getContext('2d');
        tg.drawImage(im, 0, 0, s, s);
        tg.globalCompositeOperation = 'destination-in';
        const mask = tg.createRadialGradient(s / 2, s * 0.52, s * 0.22, s / 2, s * 0.52, s * 0.5);
        mask.addColorStop(0, 'rgba(0,0,0,1)');
        mask.addColorStop(1, 'rgba(0,0,0,0)');
        tg.fillStyle = mask;
        tg.fillRect(0, 0, s, s);
        g.drawImage(tmp, ax, ay);
        glowText(g, 'Lumignons', W / 2, 330, 190, '#fff4d6');
        g.font = '600 46px F';
        g.textAlign = 'center';
        g.fillStyle = '#d9cdf5';
        g.letterSpacing = '8px';
        g.fillText(T.end.sub, W / 2, 430);
        g.letterSpacing = '0px';
        T.end.tag.forEach((t, i) => {
          g.font = '600 64px F';
          g.fillStyle = '#fff4d6';
          g.fillText(t, W / 2, 1600 + i * 76);
        });
        g.font = '500 42px F';
        g.fillStyle = '#d9cdf5';
        g.fillText(T.end.small, W / 2, 1772);
        out.end = c.toDataURL('image/png');
        // The call to action, as a separate layer (it pops in).
        const c2 = document.createElement('canvas');
        c2.width = W;
        c2.height = H;
        const h = c2.getContext('2d');
        const bw = 640;
        const bh = 120;
        const bx = (W - bw) / 2;
        const by = 460;
        h.shadowColor = 'rgba(255,190,80,0.6)';
        h.shadowBlur = 30;
        const bgr = h.createLinearGradient(0, by, 0, by + bh);
        bgr.addColorStop(0, '#ffe08a');
        bgr.addColorStop(1, '#f5b547');
        h.fillStyle = bgr;
        h.beginPath();
        h.roundRect(bx, by, bw, bh, 60);
        h.fill();
        h.shadowBlur = 0;
        h.font = '700 60px F';
        h.textAlign = 'center';
        h.fillStyle = '#3b2412';
        h.fillText(T.end.cta, W / 2, by + 80);
        h.font = '600 40px F';
        h.fillStyle = '#ffcf5a';
        h.fillText(URL_TXT, W / 2, 1860);
        out.cta = c2.toDataURL('image/png');
        return out;
      },
      { T, art, URL_TXT },
    );
    for (const [k, v] of Object.entries(imgs)) fs.writeFileSync(`${OUT}/${lang}-${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
  }
  await b.close();
  console.log('overlays written');
})();
