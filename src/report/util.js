export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Colour band of a 0-100 fit score. */
export function scoreClass(score) {
  if (score == null) return 's-none';
  if (score >= 75) return 's-top';
  if (score >= 65) return 's-good';
  if (score >= 55) return 's-ok';
  return 's-low';
}

export function shortName(name) {
  const parts = String(name).trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

export const fmt = (n, d = 0) => (n == null || Number.isNaN(n) ? '–' : Number(n).toFixed(d));
