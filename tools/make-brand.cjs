// Brand images from the AI artwork (assets/brand/lumignons-art.jpg, made with
// tools/imagegen) and the game's font: square icon, square logo with the title,
// Instagram story. The title is drawn here, since the image model misspells words.
//   node tools/make-brand.cjs        (no server needed)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const OUT = path.join(root, 'assets', 'brand');
const art = fs.readFileSync(path.join(OUT, 'lumignons-art.jpg')).toString('base64');
const font = fs.readFileSync(path.join(root, 'assets/fonts/fredoka-latin-wght.woff2')).toString('base64');

const page = `<!doctype html><html><head><style>
@font-face { font-family: Fredoka; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 300 700; }
body { margin: 0; background: #000; }
</style></head><body><script>
const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
function avgRow(img, y) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = 1;
  const g = c.getContext('2d'); g.drawImage(img, 0, -y);
  const d = g.getImageData(0, 0, img.width, 1).data; let r = 0, gr = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4; return 'rgb(' + [r, gr, b].map((v) => Math.round(v / n)).join(',') + ')';
}
function stars(g, W, H, n, seed) {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const x = rnd() * W, y = rnd() * H, r = 0.6 + rnd() * 2.2;
    g.fillStyle = 'rgba(255,240,200,' + (0.25 + rnd() * 0.6) + ')';
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
}
function title(g, text, x, y, size, sub) {
  g.save();
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = '700 ' + size + 'px Fredoka';
  g.shadowColor = 'rgba(255,150,60,0.7)'; g.shadowBlur = size * 0.45;
  g.fillStyle = '#b8692a'; g.fillText(text, x, y + size * 0.06);
  g.shadowColor = 'rgba(255,190,90,0.8)'; g.shadowBlur = size * 0.2;
  g.fillStyle = '#fff4d6'; g.fillText(text, x, y);
  g.shadowBlur = 0;
  if (sub) {
    const ss = Math.round(size * 0.25);
    g.font = '500 ' + ss + 'px Fredoka'; g.fillStyle = '#e4d8ff';
    g.letterSpacing = Math.round(ss * 0.22) + 'px';
    g.fillText(sub, x + ss * 0.11, y + size * 0.55);
  }
  g.restore();
}
/** The artwork with soft top/bottom edges, so it melts into the background. */
function feathered(img, sx, sy, sw, sh, w, h, edge, side = 0) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  g.globalCompositeOperation = 'destination-in';
  const m = g.createLinearGradient(0, 0, 0, h);
  m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(edge, '#000'); m.addColorStop(1 - edge, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m; g.fillRect(0, 0, w, h);
  if (side) {
    const k = g.createLinearGradient(0, 0, w, 0);
    k.addColorStop(0, 'rgba(0,0,0,0)'); k.addColorStop(side, '#000'); k.addColorStop(1 - side, '#000'); k.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = k; g.fillRect(0, 0, w, h);
  }
  return c;
}
window.make = async () => {
  await document.fonts.load('700 100px Fredoka'); await document.fonts.load('500 30px Fredoka');
  const img = await load('data:image/jpeg;base64,${art}');
  const top = avgRow(img, 2), bottom = avgRow(img, img.height - 3);
  const out = {};
  // 1. Square icon: the character, closer.
  { const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
    g.drawImage(img, 150, 200, 750, 750, 0, 0, 1024, 1024);
    const v = g.createRadialGradient(512, 560, 380, 512, 560, 760); v.addColorStop(0, 'rgba(10,5,30,0)'); v.addColorStop(1, 'rgba(10,5,30,0.35)');
    g.fillStyle = v; g.fillRect(0, 0, 1024, 1024); out.icon = c.toDataURL('image/png'); }
  // 2. Square logo (1080x1080): title above the character.
  { const c = document.createElement('canvas'); c.width = c.height = 1080; const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, 1080); bg.addColorStop(0, top); bg.addColorStop(1, bottom); g.fillStyle = bg; g.fillRect(0, 0, 1080, 1080);
    stars(g, 1080, 400, 70, 7);
    g.drawImage(feathered(img, 0, 150, 1024, 874, 960, 820, 0.12, 0.1), 60, 268);
    title(g, 'Lumignons', 540, 230, 168, 'LE CHEMIN DES LANTERNES'); out.logo = c.toDataURL('image/png'); }
  // 3. Instagram story (1080x1920).
  { const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, 1920); bg.addColorStop(0, '#120c26'); bg.addColorStop(0.32, top); bg.addColorStop(0.78, bottom); bg.addColorStop(1, '#2a1638'); g.fillStyle = bg; g.fillRect(0, 0, 1080, 1920);
    stars(g, 1080, 1920, 160, 3);
    g.drawImage(feathered(img, 0, 0, 1024, 1024, 1180, 1180, 0.16), -50, 480);
    title(g, 'Lumignons', 540, 400, 176, 'LE CHEMIN DES LANTERNES');
    g.textAlign = 'center';
    g.font = '600 54px Fredoka'; g.fillStyle = '#fff4d6';
    g.fillText('Guide les petites lueurs', 540, 1640); g.fillText('jusqu’à leurs lanternes', 540, 1706);
    g.font = '500 36px Fredoka'; g.fillStyle = '#e4d8ff';
    g.fillText('Un puzzle tout doux · gratuit · sans pub', 540, 1790);
    g.font = '600 34px Fredoka'; g.fillStyle = '#ffcf5a';
    g.fillText('darknow-coder.github.io/puzzle-game', 540, 1850);
    out.story = c.toDataURL('image/png'); }
  return out;
};
</script></body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent(page);
  const out = await p.evaluate(() => window.make());
  await b.close();
  const files = { icon: 'lumignons-icon-1024.png', logo: 'lumignons-logo-1080.png', story: 'lumignons-story-1080x1920.png' };
  for (const [k, f] of Object.entries(files)) {
    fs.writeFileSync(path.join(OUT, f), Buffer.from(out[k].split(',')[1], 'base64'));
    console.log('✓ assets/brand/' + f);
  }
})();
