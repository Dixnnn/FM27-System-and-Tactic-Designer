// Bundles the app into one self-contained HTML file: FM27-Tactic-Builder.html (no internet needed to run it).
// Run: npm run build

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const result = await esbuild.build({
  entryPoints: [join(ROOT, 'src/app/main.js')],
  bundle: true,
  format: 'iife',
  write: false,
  loader: { '.csv': 'text' },
  target: ['chrome105', 'edge105', 'firefox105', 'safari15'],
  legalComments: 'none',
  charset: 'utf8',
});

// "</script" inside the code would end the inline <script> early.
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const template = readFileSync(join(ROOT, 'src/app/index.html'), 'utf8');
const html = template
  .replace('<!--APP_VERSION-->', () => pkg.version)
  .replace('<!--APP_SCRIPT-->', () => `<script>\n${js}</script>`);

const out = join(ROOT, 'FM27-Tactic-Builder.html');
writeFileSync(out, html);
console.log(`Built ${out} (${(html.length / 1024).toFixed(0)} KB)`);
