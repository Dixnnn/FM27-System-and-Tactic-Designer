// Entry point of the input layer: text of an export file -> a plain table + which route made it.

import { parseCSV, stripBom } from './csv.js';
import { parseHTMLTable } from './html.js';
import { pickAdapter } from './adapters.js';

export function looksLikeHtml(text, filename = '') {
  if (/\.html?$/i.test(filename)) return true;
  return /<table\b/i.test(text.slice(0, 500000)) && /<\/t[dh]>/i.test(text.slice(0, 500000));
}

/**
 * @param {string} text  full file contents
 * @param {string} filename  original file name (used only to recognise the export route)
 * @returns {{headers: string[], rows: string[][], format: 'csv'|'html', delimiter: string|null,
 *            decimalComma: boolean, adapter: object, warnings: string[]}}
 */
export function readExport(text, filename = '') {
  text = stripBom(String(text || ''));
  const warnings = [];
  let table;
  let format;
  if (looksLikeHtml(text, filename)) {
    const t = parseHTMLTable(text);
    table = { headers: t.headers, rows: t.rows, delimiter: null, decimalComma: guessDecimalComma(t.rows) };
    format = 'html';
  } else {
    table = parseCSV(text);
    format = 'csv';
  }
  if (!table.headers.length) warnings.push('The file has no table in it.');
  else if (!table.rows.length) warnings.push('The table has a header row but no players.');
  const adapter = pickAdapter({ ...table, filename, format });
  return { ...table, format, adapter, warnings };
}

function guessDecimalComma(rows) {
  let comma = 0;
  let dot = 0;
  for (const r of rows.slice(0, 50)) {
    for (const cell of r) {
      if (/^-?\d+,\d$/.test(cell)) comma++;
      else if (/^-?\d+\.\d+$/.test(cell)) dot++;
    }
  }
  return comma > dot;
}
