// The FM27 Tactic Builder crest: a club-style shield with a tactics board inside (half pitch, three players,
// a curved run) and a star on top. One drawing, used in the app bar, the favicon, the report header, the
// cheat sheet and the picture to share. Our own artwork; no game or club branding.

const SHIELD = 'M37 8 L66 16 V44 C66 62 54 74 37 80 C20 74 8 62 8 44 V16 Z';
const STAR = 'M37 2.5l1.9 4 4.4.4-3.3 3 1 4.3L37 12l-4 2.2 1-4.3-3.3-3 4.4-.4z';
const RUN = 'M22 58 C 26 40, 36 30, 50 30';
const HEAD = 'M45 26 L51 30 L45 35';
const LINES = ['M16 46 H58', 'M27 46 A10 10 0 0 0 47 46'];
const BOX = { x: 26, y: 62, w: 22, h: 9 };
const DOTS = [[22, 60], [37, 54], [52, 58]];

/** Drawing data for the canvas (share picture). viewBox 0 0 74 86. */
export const CREST_PATHS = { SHIELD, STAR, RUN, HEAD, LINES, BOX, DOTS, W: 74, H: 86 };

export const CREST_COLOURS = { fill: '#0f1a15', edgeTop: '#25c48c', edgeBottom: '#0d7a55', star: '#f2b632', run: '#25c48c', chalk: '#e8efe9' };

let uid = 0;

/**
 * Inline SVG of the crest.
 * @param {{id?: string, cls?: string, title?: string, simple?: boolean}} [o]  simple = bolder version for small sizes (favicon)
 */
export function crestSVG(o = {}) {
  const id = o.id || `crest${++uid}`;
  const c = CREST_COLOURS;
  const label = o.title ? `role="img" aria-label="${o.title}"` : 'aria-hidden="true"';
  if (o.simple) {
    return `<svg ${o.cls ? `class="${o.cls}" ` : ''}viewBox="0 0 74 86" ${label} xmlns="http://www.w3.org/2000/svg"><path d="${SHIELD}" fill="${c.fill}" stroke="${c.edgeTop}" stroke-width="6" stroke-linejoin="round"/><path d="${RUN}" fill="none" stroke="${c.edgeTop}" stroke-width="6" stroke-linecap="round"/><circle cx="22" cy="60" r="6.5" fill="${c.chalk}"/><circle cx="52" cy="58" r="6.5" fill="${c.chalk}"/></svg>`;
  }
  return `<svg ${o.cls ? `class="${o.cls}" ` : ''}viewBox="0 0 74 86" ${label} xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.edgeTop}"/><stop offset="1" stop-color="${c.edgeBottom}"/></linearGradient></defs>
<path d="${SHIELD}" fill="${c.fill}" stroke="url(#${id})" stroke-width="4" stroke-linejoin="round"/>
<path d="${STAR}" fill="var(--crest-star, ${c.star})"/>
<g fill="none" stroke="${c.chalk}" stroke-width="1.6" opacity=".55">${LINES.map((d) => `<path d="${d}"/>`).join('')}<rect x="${BOX.x}" y="${BOX.y}" width="${BOX.w}" height="${BOX.h}" rx="1"/></g>
<path d="${RUN}" fill="none" stroke="${c.run}" stroke-width="3" stroke-linecap="round"/><path d="${HEAD}" fill="none" stroke="${c.run}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
${DOTS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="${c.chalk}"/>`).join('')}
</svg>`;
}

/** The crest as a data: URL for <link rel="icon"> (bold version that stays readable at 16 px). */
export function crestFavicon() {
  return `data:image/svg+xml,${encodeURIComponent(crestSVG({ simple: true }))}`;
}
