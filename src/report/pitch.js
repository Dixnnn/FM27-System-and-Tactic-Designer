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

let uid = 0;

function markings() {
  const id = `pg${++uid}`;
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
    `<defs><radialGradient id="${id}" cx="50%" cy="45%" r="65%"><stop offset="0" stop-color="var(--pitch-glow)" /><stop offset="1" stop-color="transparent" stop-opacity="0" /></radialGradient></defs>`,
    `<rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="var(--pitch)" />`,
    ...stripes,
    `<rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="url(#${id})" />`,
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

function starPath(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Small badge on a token: filled star = marquee, outline star = future star, dot = must start. */
function pickMark(mark, x, y) {
  if (mark === 'marquee') return `<path d="${starPath(x, y, 6.5)}" class="mk-marquee" />`;
  if (mark === 'future') return `<path d="${starPath(x, y, 6.5)}" class="mk-future" />`;
  if (mark === 'start') return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" class="mk-start" />`;
  return '';
}

const RING = 18.5;
const TUNNEL = [-8, H / 2];
const ARC = 2 * Math.PI * RING;

/** Rough text width for the name pill (no layout engine in an SVG string). */
const textWidth = (t, size) => [...t].reduce((w, c) => w + (/[ilj.,'’\s]/.test(c) ? 0.3 : /[mwMW]/.test(c) ? 0.85 : /[A-Z]/.test(c) ? 0.66 : 0.56), 0) * size;

/**
 * Players in one phase: a token per player with the role abbreviation inside and an arc around it that
 * fills with the fit score (colour = fit band), and the surname with the score in a pill underneath.
 * Badges: pick markers (top right) and C for the captain (top left).
 * @param {Array<{slot:string, abbr:string, roleName:string, name:string, score:number, mark?:string, captain?:boolean, pid?:string}>} items
 */
export function pitchSVG(items, slots, title) {
  const players = items
    .map((it, i) => {
      const [x, y] = slots[it.slot];
      const cx = +px(x).toFixed(1);
      const cy = +py(y).toFixed(1);
      const s = Math.round(it.score);
      const fill = (Math.max(0, Math.min(100, it.score)) / 100) * ARC;
      const markTitle = it.mark === 'marquee' ? ' · marquee player' : it.mark === 'future' ? ' · future star' : it.mark === 'start' ? ' · must start' : '';
      const nm = shortName(it.name);
      const pw = Math.max(34, textWidth(nm, 10.5) + textWidth(String(s), 9.5) + 18);
      const captain = it.captain
        ? `<g class="cpt"><circle cx="${(cx - 14).toFixed(1)}" cy="${(cy - 14).toFixed(1)}" r="6.2" /><text x="${(cx - 14).toFixed(1)}" y="${(cy - 11.2).toFixed(1)}">C</text></g>`
        : '';
      // walk-out animation: where the token starts (the tunnel, just off the left touchline at halfway) and its turn
      const walk = `--wx:${(TUNNEL[0] - cx).toFixed(0)}px;--wy:${(TUNNEL[1] - cy).toFixed(0)}px;--wi:${i}`;
      return `<g class="pl ${scoreClass(it.score)}" tabindex="0" style="${walk}"${it.pid ? ` data-pid="${esc(it.pid)}" role="button"` : ''}>
  <title>${esc(it.name)} · ${esc(it.roleName)} · fit ${s}${markTitle}${it.captain ? ' · captain' : ''}</title>
  <circle cx="${cx}" cy="${cy}" r="24" class="hit" />
  <circle cx="${cx}" cy="${cy}" r="${RING}" class="trk" />
  <circle cx="${cx}" cy="${cy}" r="${RING}" class="arc" stroke-dasharray="${fill.toFixed(1)} ${ARC.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})" />
  <circle cx="${cx}" cy="${cy}" r="15" class="dot" />${captain}${pickMark(it.mark, cx + 14, cy - 14)}
  <text x="${cx}" y="${(cy + 3.4).toFixed(1)}" class="abbr">${esc(it.abbr)}</text>
  <rect x="${(cx - pw / 2).toFixed(1)}" y="${(cy + 23).toFixed(1)}" width="${pw.toFixed(1)}" height="15" rx="7.5" class="pill" />
  <text x="${cx}" y="${(cy + 34).toFixed(1)}" class="nm">${esc(nm)}<tspan class="sc" dx="4">${s}</tspan></text>
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
    .map((l, i) => {
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
        path = `<line x1="${s[0].toFixed(1)}" y1="${s[1].toFixed(1)}" x2="${e[0].toFixed(1)}" y2="${e[1].toFixed(1)}" class="mv" pathLength="1" />
  <path d="M ${h1[0].toFixed(1)} ${h1[1].toFixed(1)} L ${e[0].toFixed(1)} ${e[1].toFixed(1)} L ${h2[0].toFixed(1)} ${h2[1].toFixed(1)}" class="mv" pathLength="1" />`;
      }
      return `<g class="mvg" tabindex="0" style="--wi:${i}"><title>${esc(l.player.name)}: ${esc(slots[l.oop][3])} out of possession → ${esc(slots[l.ip][3])} in possession</title>
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
