// Builds a self-contained page for a claude.ai Artifact preview of the game:
// inline CSS (font as data: URI), the HTML body, and the ES modules published
// next to the page. Usage: node tools/build-artifact.mjs <outDir>
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] || path.join(root, 'dist/artifact'));
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
const font = fs.readFileSync(path.join(root, 'assets/fonts/fredoka-latin-wght.woff2')).toString('base64');
let css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
css = css.replace("url('../assets/fonts/fredoka-latin-wght.woff2')", `url(data:font/woff2;base64,${font})`);
css = css.replace(':root {', ':root {\n  color-scheme: dark;');
const page = `<title>Lumignons</title>
<meta name="theme-color" content="#231a45">
<style>
${css}
</style>
${body.trim()}
`;
fs.writeFileSync(path.join(out, 'index.html'), page);
console.log(`${path.join(out, 'index.html')} (${(page.length / 1024).toFixed(0)} KB)`);
