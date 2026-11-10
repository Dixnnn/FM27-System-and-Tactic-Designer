// SVG pitch diagrams. Own goal at the bottom, attacking upwards. Colours come from theme tokens, so the
// same SVG works in dark mode, light mode and print.

import { esc, scoreClass, shortName } from './util.js';

const W = 340;
const H = 500;
const PAD_X = 28;
const PAD_TOP = 32;
const PAD_BOTTOM = 58;

const px = (x) => PAD_X + (x / 100) * (W - 2 * PAD_X);
const py = (y) => H - PAD_BOTTOM - (y / 100) * (H - PAD_TOP - PAD_BOTTOM);

function markings() {
  const stripes = [];
  const bands = 10;
  const bh = (H - 24) / bands;
  for (let i = 0; i < bands; i++) {
    if (i % 2) stripes.push(`<rect x="12" y="${(12 + i * bh).toFixed(1)}" width="${W - 24}" height="${bh.toFixed(1)}" fill="var(--pitch-stripe)" />`);
  }
  const l = 'fill="none" stroke="var(--pitch-line)" stroke-width="1.25"';
  const dot = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="1.8" fill="var(--pitch-line)" />`;
  const top = 12;
  const bot = H - 12;
  return [
    `<rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="var(--pitch)" />`,
    ...stripes,
    `<rect x="12" y="${top}" width="${W - 24}" height="${H - 24}" ${l} />`,
    `<line x1="12" y1="${H / 2}" x2="${W - 12}" y2="${H / 2}" ${l} />`,
    `<circle cx="${W / 2}" cy="${H / 2}" r="42" ${l} />`,
    dot(W / 2, H / 2),
    // boxes, six-yard boxes, spots, arcs
    `<rect x="${W / 2 - 80}" y="${top}" width="160" height="60" ${l} />`,
    `<rect x="${W / 2 - 34}" y="${top}" width="68" height="20" ${l} />`,
    dot(W / 2, top + 42),
    `<path d="M ${W / 2 - 30} ${top + 60} A 34 34 0 0 0 ${W / 2 + 30} ${top + 60}" ${l} />`,
    `<rect x="${W / 2 - 80}" y="${bot - 60}" width="160" height="60" ${l} />`,
    `<rect x="${W / 2 - 34}" y="${bot - 20}" width="68" height="20" ${l} />`,
    dot(W / 2, bot - 42),
    `<path d="M ${W / 2 - 30} ${bot - 60} A 34 34 0 0 1 ${W / 2 + 30} ${bot - 60}" ${l} />`,
    `<rect x="${W / 2 - 18}" y="${top - 5}" width="36" height="5" ${l} />`,
    `<rect x="${W / 2 - 18}" y="${bot}" width="36" height="5" ${l} />`,
    // corner arcs
    `<path d="M 12 ${top + 7} A 7 7 0 0 0 19 ${top}" ${l} />`,
    `<path d="M ${W - 19} ${top} A 7 7 0 0 0 ${W - 12} ${top + 7}" ${l} />`,
    `<path d="M 12 ${bot - 7} A 7 7 0 0 1 19 ${bot}" ${l} />`,
    `<path d="M ${W - 19} ${bot} A 7 7 0 0 1 ${W - 12} ${bot - 7}" ${l} />`,
  ].join('');
}

/**
 * Players in one phase: a token per player (ring colour = fit band), role abbreviation inside,
 * surname and fit score underneath.
 * @param {Array<{slot:string, abbr:string, roleName:string, name:string, score:number}>} items
 */
export function pitchSVG(items, slots, title) {
  const players = items
    .map((it) => {
      const [x, y] = slots[it.slot];
      const cx = px(x).toFixed(1);
      const cy = py(y).toFixed(1);
      const s = Math.round(it.score);
      return `<g class="pl ${scoreClass(it.score)}" tabindex="0">
  <title>${esc(it.name)} · ${esc(it.roleName)} · fit ${s}</title>
  <circle cx="${cx}" cy="${cy}" r="22" class="hit" />
  <circle cx="${cx}" cy="${cy}" r="15.5" class="dot" />
  <text x="${cx}" y="${(+cy + 3.4).toFixed(1)}" class="abbr">${esc(it.abbr)}</text>
  <text x="${cx}" y="${(+cy + 29).toFixed(1)}" class="nm">${esc(shortName(it.name))}</text>
  <text x="${cx}" y="${(+cy + 40.5).toFixed(1)}" class="sc">${s}</text>
</g>`;
    })
    .join('\n');
  return `<svg class="pitch" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${markings()}${players}</svg>`;
}

/**
 * How each player moves between the two shapes: hollow ring = out-of-possession spot,
 * filled dot = in-possession spot, joined by a thin line with an arrow towards the in-possession spot.
 * @param {Array<{ip:string, oop:string, player:{name:string}}>} lanes
 */
export function movementSVG(lanes, slots, title) {
  const marks = lanes
    .map((l) => {
      const [x1, y1] = slots[l.oop];
      const [x2, y2] = slots[l.ip];
      const a = [px(x1), py(y1)];
      const b = [px(x2), py(y2)];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      let path = '';
      if (len > 14) {
        const ux = dx / len;
        const uy = dy / len;
        const s = [a[0] + ux * 8, a[1] + uy * 8];
        const e = [b[0] - ux * 9, b[1] - uy * 9];
        const h1 = [e[0] - ux * 6 - uy * 3.5, e[1] - uy * 6 + ux * 3.5];
        const h2 = [e[0] - ux * 6 + uy * 3.5, e[1] - uy * 6 - ux * 3.5];
        path = `<line x1="${s[0].toFixed(1)}" y1="${s[1].toFixed(1)}" x2="${e[0].toFixed(1)}" y2="${e[1].toFixed(1)}" class="mv" />
  <path d="M ${h1[0].toFixed(1)} ${h1[1].toFixed(1)} L ${e[0].toFixed(1)} ${e[1].toFixed(1)} L ${h2[0].toFixed(1)} ${h2[1].toFixed(1)}" class="mv" />`;
      }
      return `<g class="mvg" tabindex="0"><title>${esc(l.player.name)}: ${esc(slots[l.oop][3])} out of possession → ${esc(slots[l.ip][3])} in possession</title>
  ${path}
  <circle cx="${a[0].toFixed(1)}" cy="${a[1].toFixed(1)}" r="6" class="oopdot" />
  <circle cx="${b[0].toFixed(1)}" cy="${b[1].toFixed(1)}" r="6" class="ipdot" />
  <text x="${b[0].toFixed(1)}" y="${(b[1] + 19).toFixed(1)}" class="nm">${esc(shortName(l.player.name))}</text>
</g>`;
    })
    .join('\n');
  return `<svg class="pitch move" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${markings()}${marks}</svg>`;
}

/** True when at least one player changes spot between the two shapes. */
export const hasMovement = (lanes) => lanes.some((l) => l.ip !== l.oop);
