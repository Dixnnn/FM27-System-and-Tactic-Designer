export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Fit band of a 0-100 score: f4 excellent (75+), f3 good (65+), f2 usable (55+), f1 weak. One hue, ordinal. */
export function scoreClass(score) {
  if (score == null) return 'f0';
  const s = Math.round(score);
  if (s >= 75) return 'f4';
  if (s >= 65) return 'f3';
  if (s >= 55) return 'f2';
  return 'f1';
}

export function shortName(name) {
  const parts = String(name).trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

export const fmt = (n, d = 0) => (n == null || Number.isNaN(n) ? '–' : Number(n).toFixed(d));

/** A fit score: the number, with a thin meter (length = score, colour = band). */
export function fitChip(score, extra = '') {
  if (score == null) return '<span class="fit f0">–</span>';
  const w = Math.max(2, Math.min(100, score));
  return `<span class="fit ${scoreClass(score)}${extra}" title="Fit ${fmt(score)} / 100"><span class="n">${fmt(score)}</span><span class="m" aria-hidden="true"><i style="width:${w.toFixed(0)}%"></i></span></span>`;
}

/** A small coloured key that says which phase a label belongs to (the text itself stays in ink). */
export const phaseKey = (phase) => `<span class="key ${phase === 'IP' ? 'ip' : 'oop'}" aria-hidden="true"></span>`;

const STAR = 'M8 1.4l1.9 4.1 4.5.5-3.3 3.1.9 4.4L8 11.3l-3.9 2.2.9-4.4L1.6 6l4.5-.5z';

/** Tags for a player's picks (marquee / future star / must start). */
export function pickTags(p) {
  const t = [];
  if (p.label === 'marquee') t.push(`<span class="tag pick"><svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="${STAR}" fill="currentColor"/></svg>Marquee</span>`);
  if (p.label === 'future') t.push(`<span class="tag pick"><svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="${STAR}" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>Future star</span>`);
  if (p.mustStart && p.label !== 'marquee') t.push('<span class="tag pick"><span class="pin" aria-hidden="true"></span>Must start</span>');
  return t.join(' ');
}

export const ICON = {
  warn: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8 15 14H1z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6v3.6M8 11.6v.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  check: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  info: '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 7.2v4M8 4.8v.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
};
