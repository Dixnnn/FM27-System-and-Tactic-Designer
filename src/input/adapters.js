// Input adapters: one per known export route. Each one recognises its own files and can add
// extra header aliases. If a patch changes one route, only its adapter needs to change.
// All FM27 routes copy the game's own column headers, so most mapping is shared (see parse/columns.js).

export const fmViewExporter = {
  id: 'fm-view-exporter',
  label: 'FM View Exporter (F9 plugin)',
  detect({ headers, filename }) {
    let score = 0;
    if (/^(?:[\w.-]+-)?(squad|player-database|shortlist)(_\d{8}_\d{6})?\.(csv|html?)$/i.test(baseName(filename))) score += 0.5;
    if (headers.includes('Unique ID')) score += 0.3;
    if (headers.includes('Player') || headers.includes('Name')) score += 0.1;
    return score;
  },
  aliases: {},
};

export const vintesetExport = {
  id: 'fm27-player-export',
  label: 'FM27 Player Export (vinteset plugin)',
  detect({ filename, delimiter, decimalComma }) {
    let score = 0;
    if (/player_export_\d{8}/i.test(baseName(filename))) score += 0.6;
    if (delimiter === ';') score += 0.2;
    if (decimalComma) score += 0.1;
    return score;
  },
  aliases: {},
};

export const genericExport = {
  id: 'generic',
  label: 'Other CSV/HTML export',
  detect() {
    return 0.05;
  },
  aliases: {},
};

export const ADAPTERS = [fmViewExporter, vintesetExport, genericExport];

function baseName(filename = '') {
  return String(filename).split(/[\\/]/).pop();
}

export function pickAdapter(meta) {
  let best = genericExport;
  let bestScore = -1;
  for (const a of ADAPTERS) {
    const s = a.detect(meta);
    if (s > bestScore) {
      best = a;
      bestScore = s;
    }
  }
  return best;
}
