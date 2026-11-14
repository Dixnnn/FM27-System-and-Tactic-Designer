// Design tokens shared by the app and the saved report: the "Floodlights" look (a night match under the lights).
// Dark is the default; light ("day match") is a toggle, and printing always uses light (ink-friendly).
// Data colours were checked with the data-viz validator against these surfaces:
//   fit ramp (teal, one hue, ordinal; OKLCH h163, every adjacent pair ΔE >= 15 so the four bands read apart; each mark also
//   prints its number)                dark #205d44 #169065 #25c48c #8bf4c4 · light #76d4a9 #21a475 #00734f #00432d
//   heatmap: continuous mix from --heat-lo to --heat-hi (same hue) in OKLab
//   phases (categorical, 2 slots)      in possession blue, out of possession orange (pass on #0b111d and #fbfcfe)
//   squad profile (diverging)          above team level blue, below red, neutral grey midpoint
// The lime accent and the scoreboard amber are decoration and controls only, never data.

const LIGHT = `
  color-scheme: light;
  --bg: #edf1f7; --surface: #fbfcfe; --surface-2: #f2f5fa; --surface-3: #e6ebf3;
  --line: #dce2ec; --line-2: #c3ccda;
  --ink: #0c1424; --ink-2: #3f4b61; --muted: #687489;
  --accent: #3f7300; --accent-ink: #ffffff; --accent-soft: rgba(80, 140, 0, .11); --accent-glow: transparent;
  --ip: #2a78d6; --oop: #eb6834;
  --pos: #2a78d6; --neg: #e34948; --mid: #e3e5e1;
  --fit-1: #76d4a9; --fit-2: #21a475; --fit-3: #00734f; --fit-4: #00432d;
  --heat: 6 131 89; --heat-lo: #eef2f7; --heat-hi: #00734f; --heat-ink-hi: #ffffff;
  --warn: #9a6400; --warn-line: #e3a72f; --warn-soft: rgba(237, 161, 0, .12);
  --pitch: #dfece2; --pitch-stripe: #d5e6d9; --pitch-glow: rgba(255, 255, 255, .32); --pitch-line: rgba(18, 60, 34, .28); --token: #fbfcfe;
  --pill: rgba(251, 252, 254, .92); --pill-line: rgba(12, 20, 36, .14); --topbar: rgba(237, 241, 247, .86);
  --shadow: 0 1px 2px rgba(12, 20, 36, .05), 0 8px 22px rgba(12, 20, 36, .06);
  --card-bg: var(--surface);
  --page-bg: radial-gradient(900px 480px at 6% -12%, rgba(198, 255, 61, .22), transparent 70%),
    radial-gradient(900px 480px at 94% -12%, rgba(120, 160, 255, .16), transparent 70%), #edf1f7;
  --arc-glow: none; --crest-star: #d99a1c; --live: #d62f2f;
`;

const DARK = `
  color-scheme: dark;
  --bg: #05080f; --surface: #0b111d; --surface-2: #0f1828; --surface-3: #152036;
  --line: #1b2740; --line-2: #2a3b5c;
  --ink: #eaf1ff; --ink-2: #bac6dc; --muted: #7c89a3;
  --accent: #c6ff3d; --accent-ink: #0b1300; --accent-soft: rgba(198, 255, 61, .12); --accent-glow: rgba(198, 255, 61, .35);
  --ip: #3987e5; --oop: #d95926;
  --pos: #3987e5; --neg: #e66767; --mid: #2a3446;
  --fit-1: #205d44; --fit-2: #169065; --fit-3: #25c48c; --fit-4: #8bf4c4;
  --heat: 20 172 119; --heat-lo: #121b2b; --heat-hi: #8bf4c4; --heat-ink-hi: #03150d;
  --warn: #fab219; --warn-line: #b7820f; --warn-soft: rgba(250, 178, 25, .10);
  --pitch: #0c1f16; --pitch-stripe: #10291c; --pitch-glow: rgba(220, 255, 230, .16); --pitch-line: rgba(234, 241, 255, .3); --token: #060c0a;
  --pill: rgba(5, 8, 15, .86); --pill-line: rgba(234, 241, 255, .1); --topbar: rgba(5, 8, 15, .85);
  --shadow: inset 0 1px 0 rgba(255, 255, 255, .06), 0 20px 50px rgba(0, 0, 0, .5);
  --card-bg: linear-gradient(180deg, rgba(21, 32, 54, .72), rgba(11, 17, 29, .9));
  --page-bg: radial-gradient(900px 500px at 8% -8%, rgba(160, 190, 255, .16), transparent 70%),
    radial-gradient(900px 500px at 92% -8%, rgba(160, 190, 255, .16), transparent 70%), #05080f;
  --arc-glow: drop-shadow(0 0 3px rgba(80, 255, 190, .5)); --crest-star: #f2b632; --live: #ff4d4d;
`;

export const THEME_CSS = `
:root { ${DARK} }
:root[data-theme="light"] { ${LIGHT} }
@media print { :root:root { ${LIGHT} --page-bg: #fff; } }
:root {
  --font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-display: "TB Display", "Segoe UI Semibold", system-ui, -apple-system, sans-serif;
  --font-numbers: "TB Numbers", Impact, "Arial Narrow", sans-serif;
  --font-board: "TB Scoreboard", ui-monospace, Consolas, monospace;
  --radius: 14px;
  /* the scoreboard tiles are a dark object in both themes, like a real stadium board */
  --sb-bg: #020407; --sb-dots: rgba(198, 255, 61, .07); --sb-line: #1b2740; --sb-label: #8a97b0; --sb-ink: #dfe7f5;
  --sb-amber: #ffd84d; --sb-amber-glow: rgba(255, 200, 40, .55); --sb-lime: #c6ff3d; --sb-lime-glow: rgba(198, 255, 61, .55);
}
html { background: var(--bg); }
body { margin: 0; background: var(--page-bg); background-attachment: fixed; color: var(--ink); font: 15px/1.55 var(--font); -webkit-font-smoothing: antialiased; }
::selection { background: var(--accent-soft); }
`;
