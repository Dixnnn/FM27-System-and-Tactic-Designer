// SVG pitch diagram: own goal at the bottom, attacking upwards. Each player shows his role abbreviation,
// surname and fit score.

import { esc, scoreClass, shortName } from './util.js';

const W = 340;
const H = 500;
const PAD_X = 26;
const PAD_TOP = 30;
const PAD_BOTTOM = 58;

const px = (x) => PAD_X + (x / 100) * (W - 2 * PAD_X);
const py = (y) => H - PAD_BOTTOM - (y / 100) * (H - PAD_TOP - PAD_BOTTOM);

function markings() {
  const l = 'fill="none" stroke="var(--pitch-line)" stroke-width="2"';
  return [
    `<rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="6" fill="var(--pitch)" />`,
    `<rect x="12" y="12" width="${W - 24}" height="${H - 24}" ${l} />`,
    `<line x1="12" y1="${H / 2}" x2="${W - 12}" y2="${H / 2}" ${l} />`,
    `<circle cx="${W / 2}" cy="${H / 2}" r="44" ${l} />`,
    `<rect x="${W / 2 - 80}" y="12" width="160" height="62" ${l} />`,
    `<rect x="${W / 2 - 80}" y="${H - 74}" width="160" height="62" ${l} />`,
    `<rect x="${W / 2 - 34}" y="12" width="68" height="22" ${l} />`,
    `<rect x="${W / 2 - 34}" y="${H - 34}" width="68" height="22" ${l} />`,
  ].join('');
}

/**
 * @param {Array<{slot:string, abbr:string, roleName:string, name:string, score:number}>} items
 * @param {object} slots  formations.json "slots"
 * @param {string} title
 */
export function pitchSVG(items, slots, title) {
  const players = items
    .map((it) => {
      const [x, y] = slots[it.slot];
      const cx = px(x);
      const cy = py(y);
      const cls = scoreClass(Math.round(it.score));
      return `<g class="pl ${cls}">
  <title>${esc(it.name)}: ${esc(it.roleName)} (${Math.round(it.score)})</title>
  <circle cx="${cx}" cy="${cy}" r="17" class="dot" />
  <text x="${cx}" y="${cy + 3.5}" class="abbr">${esc(it.abbr)}</text>
  <text x="${cx}" y="${cy + 30}" class="nm">${esc(shortName(it.name))}</text>
  <text x="${cx}" y="${cy + 41}" class="sc">${Math.round(it.score)}</text>
</g>`;
    })
    .join('\n');
  return `<svg class="pitch" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${markings()}${players}</svg>`;
}
