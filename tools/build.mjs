// Bundles the app into one self-contained HTML file: FM27-Tactic-Builder.html (no internet needed to run it).
// Run: npm run build

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { THEME_CSS } from '../src/report/theme.js';
import { REPORT_CSS } from '../src/report/report-css.js';
import { crestSVG, crestFavicon } from '../src/report/crest.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

// Display fonts, embedded so the page stays one offline file. All three are under the SIL Open Font License 1.1
// (https://openfontlicense.org); the licence text is in plugin/packaging/licenses/OFL-1.1.txt.
const FONTS = [
  { family: 'TB Display', file: 'space-grotesk/files/space-grotesk-latin-500-normal.woff2', weight: 500, range: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' },
  { family: 'TB Display', file: 'space-grotesk/files/space-grotesk-latin-ext-500-normal.woff2', weight: 500, range: 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF' },
  { family: 'TB Numbers', file: 'bebas-neue/files/bebas-neue-latin-400-normal.woff2', weight: 400 },
  { family: 'TB Scoreboard', file: 'vt323/files/vt323-latin-400-normal.woff2', weight: 400 },
];
const FONT_NOTICE = `/* Fonts: Space Grotesk (c) 2020 The Space Grotesk Project Authors; Bebas Neue (c) 2019 The Bebas Neue Project Authors;
   VT323 (c) 2011 The VT323 Project Authors. Licensed under the SIL Open Font License, Version 1.1 (https://openfontlicense.org). */`;
const FONT_CSS = [FONT_NOTICE, ...FONTS.map((f) => {
  const data = readFileSync(join(ROOT, 'node_modules/@fontsource', f.file)).toString('base64');
  return `@font-face{font-family:"${f.family}";font-style:normal;font-weight:${f.weight};font-display:swap;src:url(data:font/woff2;base64,${data}) format("woff2")${f.range ? `;unicode-range:${f.range}` : ''}}`;
})].join('\n');

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
  .replace('/*__THEME_CSS__*/', () => THEME_CSS)
  .replace('/*__REPORT_CSS__*/', () => REPORT_CSS)
  .replace('/*__FONT_CSS__*/', () => FONT_CSS)
  .replace('<!--CREST-->', () => crestSVG({ id: 'crest-app', cls: 'crest' }))
  .replace('<!--FAVICON-->', () => crestFavicon())
  .replace('<!--APP_SCRIPT-->', () => `<script>\n${js}</script>`);

const out = join(ROOT, 'FM27-Tactic-Builder.html');
writeFileSync(out, html);
console.log(`Built ${out} (${(html.length / 1024).toFixed(0)} KB)`);
