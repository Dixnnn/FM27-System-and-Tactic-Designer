// Tells the user exactly which columns are missing and where to add them in FM27.

const GK_ONLY = new Set(['Aerial Reach', 'Command of Area', 'Communication', 'Eccentricity', 'Handling', 'Kicking',
  'One on Ones', 'Punching (Tendency)', 'Reflexes', 'Rushing Out (Tendency)', 'Throwing']);

/**
 * @returns {{fatal: string|null, missingEssential: Array, missingRecommended: Array,
 *            attributesFound: number, attributesTotal: number, unknownHeaders: string[]}}
 */
export function checkColumns(map, columnsDoc) {
  const missingEssential = [];
  const missingRecommended = [];
  const note = (item, label) => {
    const entry = { label, menu: item.menu, why: item.why || '' };
    if (item.importance === 'essential') missingEssential.push(entry);
    else if (item.importance === 'recommended') missingRecommended.push(entry);
  };
  for (const f of columnsDoc.fields) if (!(f.field in map.fields)) note(f, f.headers[0]);
  for (const a of columnsDoc.attributes) if (!(a.field in map.attributes)) note(a, a.headers.includes(a.field) ? a.field : a.headers[0]);

  const attributesFound = Object.keys(map.attributes).length;
  const outfieldFound = Object.keys(map.attributes).filter((a) => !GK_ONLY.has(a)).length;
  let fatal = null;
  if (!('name' in map.fields)) {
    fatal = 'No player name column was found. Is this a squad export from FM27? The first column should be "Player" or "Name".';
  } else if (outfieldFound < 10) {
    fatal =
      `Only ${outfieldFound} player attributes were found in this file, so a tactic can't be built from it. ` +
      'Export your squad with a view that shows the attributes (see "Set up the squad view" in the README).';
  }
  return {
    fatal,
    missingEssential,
    missingRecommended,
    attributesFound,
    attributesTotal: columnsDoc.attributes.length,
    unknownHeaders: map.unknown,
  };
}
