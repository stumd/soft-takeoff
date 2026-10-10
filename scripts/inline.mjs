// Inline the built JS and CSS into a single self-contained HTML file.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
let html = readFileSync(join(dist, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g, (_, file) => {
  const css = readFileSync(join(dist, file), 'utf8');
  return `<style>${css}</style>`;
});

html = html.replace(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/g, (_, file) => {
  const js = readFileSync(join(dist, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});

// Move the module script to the end of <body> so the DOM exists when it runs.
const m = html.match(/<script type="module">[\s\S]*?<\/script>/);
if (m) {
  // Function replacers, so `$&` and friends inside the minified code stay literal.
  html = html.replace(m[0], () => '');
  html = html.replace('</body>', () => `${m[0]}\n</body>`);
}

mkdirSync('dist-single', { recursive: true });
writeFileSync(join('dist-single', 'index.html'), html);
console.log(`dist-single/index.html — ${(html.length / 1024).toFixed(0)} KB`);

// Optional: a fragment for hosts that supply their own <html>/<head>/<body>.
const fragOut = process.argv[2];
if (fragOut) {
  const pick = (re) => (html.match(re) || [])[0] || '';
  const title = pick(/<title>[\s\S]*?<\/title>/);
  const fonts = (html.match(/<link[^>]*https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>/g) || []).join('\n');
  const styles = (html.match(/<style>[\s\S]*?<\/style>/g) || []).join('\n');
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
  const frag = [title, fonts, styles, body].join('\n');
  writeFileSync(fragOut, frag);
  console.log(`${fragOut} — ${(frag.length / 1024).toFixed(0)} KB`);
}
