// Renders the crest (src/report/crest.js) into the image files that can't be made at build time:
//   plugin/src/FM27TacticBuilder.Setup/crest.ico         the setup program's icon (16-256 px)
//   plugin/src/FM27TacticBuilder.Setup/crest-header.png  the crest in the setup window's header
//   docs/crest.svg                                       the crest for the README
// Run after changing the crest: node tools/make-icons.mjs (needs Playwright with Chromium installed).

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crestSVG } from '../src/report/crest.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SETUP = join(ROOT, 'plugin/src/FM27TacticBuilder.Setup');
const { chromium } = createRequire(import.meta.url)('playwright');

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

/** PNG of the crest centred in a w x h transparent box. */
async function render(w, h, simple) {
  const svg = crestSVG({ id: 'c', simple });
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0;background:transparent;display:grid;place-items:center;width:${w}px;height:${h}px">
    <div style="height:${h}px;aspect-ratio:74/86">${svg.replace('<svg ', '<svg style="width:100%;height:100%;display:block" ')}</div></body></html>`);
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
}

// Windows icon: PNG-compressed entries (Windows Vista and later); the bold crest below 48 px so it stays readable.
const sizes = [16, 24, 32, 48, 64, 128, 256];
const images = [];
for (const s of sizes) images.push(await render(s, s, s < 48));
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((png, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], e);
  header.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], e + 1);
  header.writeUInt8(0, e + 2);
  header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(png.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
writeFileSync(join(SETUP, 'crest.ico'), Buffer.concat([header, ...images]));
writeFileSync(join(SETUP, 'crest-header.png'), await render(96, 112, false));
writeFileSync(join(ROOT, 'docs/crest.svg'), crestSVG({ id: 'crest', title: 'FM27 Tactic Builder' }).replace('var(--crest-star, #f2b632)', '#f2b632') + '\n');
await browser.close();
console.log('Wrote crest.ico, crest-header.png and docs/crest.svg');
