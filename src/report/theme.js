// Design tokens shared by the app and the saved report. Dark is the default; light is a toggle, and printing
// always uses light (ink-friendly). Data colours were checked with the data-viz validator in both modes:
//   fit ramp (teal, one hue, ordinal)  dark #035c3e #068359 #14ac77 #66e7ae · light #37bf89 #068359 #035c3e #003823
//   phases (categorical, 2 slots)      in possession blue, out of possession orange
//   squad profile (diverging)          above team level blue, below red, neutral grey midpoint

const LIGHT = `
  color-scheme: light;
  --bg: #eef1ee; --surface: #fbfcfb; --surface-2: #f1f4f1; --surface-3: #e7ebe7;
  --line: #dfe3de; --line-2: #c5cbc4;
  --ink: #121513; --ink-2: #49514b; --muted: #747c76;
  --accent: #068359; --accent-ink: #ffffff; --accent-soft: rgba(6, 131, 89, .10);
  --ip: #2a78d6; --oop: #eb6834;
  --pos: #2a78d6; --neg: #e34948; --mid: #e3e5e1;
  --fit-1: #37bf89; --fit-2: #068359; --fit-3: #035c3e; --fit-4: #003823;
  --heat: 6 131 89; --heat-ink-hi: var(--ink);
  --warn: #9a6400; --warn-line: #e3a72f; --warn-soft: rgba(237, 161, 0, .12);
  --pitch: #e3eee6; --pitch-stripe: #dbe8de; --pitch-line: rgba(18, 60, 34, .26); --token: #fbfcfb;
  --shadow: 0 1px 2px rgba(16, 24, 18, .05), 0 6px 18px rgba(16, 24, 18, .05);
`;

const DARK = `
  color-scheme: dark;
  --bg: #0d0f0e; --surface: #161917; --surface-2: #1c201e; --surface-3: #242926;
  --line: #2a2f2c; --line-2: #3a403c;
  --ink: #eef0ec; --ink-2: #b9bfb9; --muted: #868d87;
  --accent: #14ac77; --accent-ink: #03150d; --accent-soft: rgba(20, 172, 119, .13);
  --ip: #3987e5; --oop: #d95926;
  --pos: #3987e5; --neg: #e66767; --mid: #383835;
  --fit-1: #035c3e; --fit-2: #068359; --fit-3: #14ac77; --fit-4: #66e7ae;
  --heat: 20 172 119; --heat-ink-hi: #03150d;
  --warn: #fab219; --warn-line: #b7820f; --warn-soft: rgba(250, 178, 25, .10);
  --pitch: #13201a; --pitch-stripe: #15241c; --pitch-line: rgba(226, 240, 230, .17); --token: #0e1411;
  --shadow: 0 1px 0 rgba(255, 255, 255, .03) inset, 0 10px 30px rgba(0, 0, 0, .28);
`;

export const THEME_CSS = `
:root { ${DARK} }
:root[data-theme="light"] { ${LIGHT} }
@media print { :root:root { ${LIGHT} } }
:root {
  --font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --radius: 12px;
}
html { background: var(--bg); }
body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.55 var(--font); -webkit-font-smoothing: antialiased; }
::selection { background: var(--accent-soft); }
`;
