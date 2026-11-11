// Club colours: the player tokens on the pitches wear your kit (shirt colour inside, trim as the ring). The fit
// arcs around the tokens keep their own colours, so the data never changes with the kit.

/** Ready-made kits: [name, shirt, trim]. Plain colour pairs, no club names or badges. */
export const KIT_PRESETS = [
  ['Red and white', '#c8102e', '#ffffff'],
  ['Royal blue', '#1d4fb8', '#ffffff'],
  ['Sky blue', '#6cabdd', '#ffffff'],
  ['Claret and blue', '#7a263a', '#9cc3e5'],
  ['Black and white', '#151515', '#ffffff'],
  ['All white', '#f4f4f4', '#151515'],
  ['Yellow and black', '#f5d000', '#151515'],
  ['Green and white', '#007a3d', '#ffffff'],
  ['Navy and gold', '#13254a', '#d4a72c'],
  ['Orange and black', '#f26b1d', '#151515'],
  ['Purple', '#5b2a86', '#ffffff'],
  ['Maroon and gold', '#6b1020', '#e0b13b'],
];

const HEX = /^#[0-9a-f]{6}$/i;

/** A saved kit, cleaned: {shirt, trim} with #rrggbb colours, or null. */
export function cleanKit(kit) {
  if (!kit || !HEX.test(kit.shirt || '') || !HEX.test(kit.trim || '')) return null;
  return { shirt: kit.shirt.toLowerCase(), trim: kit.trim.toLowerCase() };
}

function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** WCAG contrast ratio of two #rrggbb colours. */
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** Text colour for the role letters on the shirt: the trim if it reads well, otherwise black or white. */
export function kitInk(kit) {
  if (contrast(kit.shirt, kit.trim) >= 4.5) return kit.trim;
  return contrast(kit.shirt, '#ffffff') >= contrast(kit.shirt, '#000000') ? '#ffffff' : '#000000';
}

/** CSS custom properties for the report element ('' when no kit is chosen). */
export function kitStyle(kit) {
  const k = cleanKit(kit);
  if (!k) return '';
  return `--kit-1:${k.shirt};--kit-2:${k.trim};--kit-ink:${kitInk(k)};--kit-ring:1.6`;
}
