// Maps the column headers of an export to the tool's field names, using data/columns.json.

export function normHeader(h) {
  return String(h || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * @param {string[]} headers
 * @param {object} columnsDoc  data/columns.json
 * @param {object} [extraAliases]  {field: [header, ...]} from the input adapter
 * @returns {{fields: Object<string, number>, attributes: Object<string, number>, unknown: string[]}}
 */
export function buildHeaderMap(headers, columnsDoc, extraAliases = {}) {
  const lookup = new Map(); // normalised header -> {kind, name}
  const add = (kind, name, header) => {
    const key = normHeader(header);
    if (key && !lookup.has(key)) lookup.set(key, { kind, name });
  };
  // Attributes first: FM24 abbreviations such as "Pos" (Positioning) must win over loose field aliases.
  for (const a of columnsDoc.attributes) for (const h of a.headers) add('attr', a.field, h);
  for (const f of columnsDoc.fields) for (const h of f.headers) add('field', f.field, h);
  for (const [field, hs] of Object.entries(extraAliases)) for (const h of hs) add('field', field, h);

  const fields = {};
  const attributes = {};
  const unknown = [];
  headers.forEach((h, i) => {
    const hit = lookup.get(normHeader(h));
    if (!hit) {
      if (h) unknown.push(h);
      return;
    }
    const target = hit.kind === 'attr' ? attributes : fields;
    if (!(hit.name in target)) target[hit.name] = i; // first column wins (FM27 repeats e.g. "Nation")
  });
  return { fields, attributes, unknown };
}
