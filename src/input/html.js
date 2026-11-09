// HTML table reader. Works the same in the browser and in Node tests (no DOM needed).
// Picks the largest <table> in the file; the first row with <th> cells (or the first row) is the header.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, code) => {
    const lower = code.toLowerCase();
    if (lower.startsWith('#x')) return String.fromCodePoint(parseInt(lower.slice(2), 16));
    if (lower.startsWith('#')) return String.fromCodePoint(parseInt(lower.slice(1), 10));
    return ENTITIES[lower] ?? m;
  });
}

function cellText(html) {
  const noTags = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '');
  return decodeEntities(noTags).replace(/\s+/g, ' ').trim();
}

function parseRows(tableHtml) {
  const rows = [];
  const rowRe = /<tr\b[^>]*>([\s\S]*?)(?=<tr\b|<\/table>|$)/gi;
  let m;
  while ((m = rowRe.exec(tableHtml))) {
    const cells = [];
    let isHeader = false;
    const cellRe = /<(t[hd])\b([^>]*)>([\s\S]*?)(?=<t[hd]\b|<\/tr>|$)/gi;
    let c;
    while ((c = cellRe.exec(m[1]))) {
      if (c[1].toLowerCase() === 'th') isHeader = true;
      const text = cellText(c[3].replace(/<\/t[hd]>\s*$/i, ''));
      const span = /colspan\s*=\s*"?(\d+)/i.exec(c[2]);
      cells.push(text);
      for (let k = 1; span && k < Number(span[1]); k++) cells.push('');
    }
    if (cells.length) rows.push({ cells, isHeader });
  }
  return rows;
}

/**
 * @returns {{headers: string[], rows: string[][], title: string}}
 */
export function parseHTMLTable(html) {
  const tables = html.match(/<table\b[\s\S]*?<\/table>/gi) || [];
  let best = [];
  for (const t of tables) {
    const rows = parseRows(t);
    if (rows.length > best.length) best = rows;
  }
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? cellText(titleMatch[1]) : '';
  if (!best.length) return { headers: [], rows: [], title };
  let headerIndex = best.findIndex((r) => r.isHeader);
  if (headerIndex < 0) headerIndex = 0;
  const headers = best[headerIndex].cells;
  const rows = best
    .slice(headerIndex + 1)
    .filter((r) => !r.isHeader && r.cells.some((x) => x !== ''))
    .map((r) => {
      const cells = r.cells.slice(0, headers.length);
      while (cells.length < headers.length) cells.push('');
      return cells;
    });
  return { headers, rows, title };
}
