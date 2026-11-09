// CSV reader. Handles a UTF-8 BOM, quoted fields (with "" escapes and line breaks inside quotes),
// Windows/Unix line endings, and comma, semicolon or tab separators (detected automatically).

const CANDIDATES = [',', ';', '\t'];

/** Count separators in the first line, ignoring anything inside quotes. */
export function detectDelimiter(text) {
  const firstLine = firstRecord(text);
  let best = ',';
  let bestCount = -1;
  for (const d of CANDIDATES) {
    const count = countOutsideQuotes(firstLine, d);
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

function firstRecord(text) {
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') inQuotes = !inQuotes;
    else if ((c === '\n' || c === '\r') && !inQuotes) return text.slice(0, i);
  }
  return text;
}

function countOutsideQuotes(line, ch) {
  let n = 0;
  let inQuotes = false;
  for (const c of line) {
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ch && !inQuotes) n++;
  }
  return n;
}

/**
 * Parse CSV text into a header row and data rows (all cells are trimmed strings).
 * @returns {{headers: string[], rows: string[][], delimiter: string, decimalComma: boolean}}
 */
export function parseCSV(text, delimiter) {
  text = stripBom(text);
  const d = delimiter || detectDelimiter(text);
  const records = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === d) {
      record.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || record.length) {
    record.push(field);
    records.push(record);
  }
  const clean = records
    .map((r) => r.map((cell) => cell.trim()))
    .filter((r) => r.some((cell) => cell !== ''));
  const headers = clean.length ? clean[0] : [];
  const rows = clean.slice(1).map((r) => padRow(r, headers.length));
  return { headers, rows, delimiter: d, decimalComma: looksDecimalComma(rows, d) };
}

function padRow(row, n) {
  if (row.length >= n) return row;
  return row.concat(Array(n - row.length).fill(''));
}

/** Semicolon files from European-style tools use a decimal comma ("4,5"). */
function looksDecimalComma(rows, d) {
  if (d === ',') return false;
  let comma = 0;
  let dot = 0;
  for (const r of rows.slice(0, 50)) {
    for (const cell of r) {
      if (/^-?\d+,\d+$/.test(cell)) comma++;
      else if (/^-?\d+\.\d+$/.test(cell)) dot++;
    }
  }
  return comma > dot;
}

export function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
