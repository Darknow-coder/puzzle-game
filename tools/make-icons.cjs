// Renders the PWA icons from the procedural art (node tools/make-icons.cjs, server on :8080).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const jobs = [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['icon-maskable-512.png', 512, 1], ['apple-touch-icon.png', 180, 1], ['favicon-64.png', 64, 0]];
  for (const [name, s, m] of jobs) {
    await p.setViewportSize({ width: s, height: s });
    await p.goto(`http://localhost:8080/tools/preview/icon.html?s=${s}&m=${m}`);
    await p.waitForFunction(() => window.done === true);
    await p.locator('#c').screenshot({ path: 'assets/icons/' + name, omitBackground: true });
  }
  await b.close();
})();
