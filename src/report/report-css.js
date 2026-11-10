// Report styles (app and saved report). Colours come from theme tokens (theme.js): dark by default,
// light on request, always light when printed. Marks stay thin and quiet; the data is the loud part.
export const REPORT_CSS = `
.report { max-width: 1180px; margin: 0 auto; padding: 4px 0 56px; color: var(--ink); font: 15px/1.55 var(--font); }
.report * { box-sizing: border-box; }
.report h1 { font-size: 30px; line-height: 1.15; margin: 2px 0 6px; letter-spacing: -.01em; font-weight: 700; }
.report h2 { font-size: 20px; margin: 0 0 14px; display: flex; align-items: center; gap: 10px; letter-spacing: -.005em; }
.report h2 .num { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; background: var(--accent-soft); color: var(--accent); font-size: 13px; font-weight: 700; }
.report h3 { font-size: 15.5px; margin: 26px 0 10px; display: flex; align-items: center; gap: 8px; }
.report h3 .step { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 6px; background: var(--surface-3); color: var(--ink-2); font-size: 12px; font-weight: 700; }
.report h4 { font-size: 12px; margin: 18px 0 6px; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; font-weight: 650; }
.report p { margin: 6px 0; }
.report a { color: var(--accent); }
.report .eyebrow { text-transform: uppercase; letter-spacing: .1em; font-size: 11.5px; font-weight: 700; color: var(--accent); }
.report .meta { color: var(--muted); font-size: 13px; margin: 0; }
.report .muted { color: var(--muted); }
.report .small { font-size: 12.5px; }
.report .ico { width: 14px; height: 14px; vertical-align: -2px; flex: none; }

.report header.top { padding: 18px 2px 8px; }
.report .notice { display: flex; gap: 10px; align-items: flex-start; border: 1px solid var(--line); border-left: 3px solid var(--warn-line);
  background: var(--surface); border-radius: 10px; padding: 10px 14px; margin: 12px 0 4px; color: var(--ink-2); font-size: 14px; }
.report .notice .ico { color: var(--warn); margin-top: 3px; }
.report .notice strong { color: var(--ink); }
.report nav.toc { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0 6px; }
.report nav.toc a { font-size: 12.5px; color: var(--ink-2); text-decoration: none; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); }
.report nav.toc a:hover { color: var(--ink); border-color: var(--line-2); }

.report section.card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 22px 24px 24px; margin: 14px 0; box-shadow: var(--shadow); scroll-margin-top: 70px; }
.report .lede { color: var(--ink-2); max-width: 78ch; }

/* stat tiles */
.report .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 4px 0 20px; }
.report .kpi { background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px; padding: 11px 13px 12px; }
.report .kpi .k { font-size: 12px; color: var(--muted); }
.report .kpi .v { font-size: 18px; font-weight: 650; line-height: 1.25; margin-top: 2px; }
.report .kpi .meter { height: 4px; border-radius: 2px; background: var(--line); margin-top: 9px; overflow: hidden; }
.report .kpi .meter i { display: block; height: 100%; border-radius: 2px; background: var(--accent); }

/* pitches */
.report .pitches { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 420px)); justify-content: center; gap: 22px 40px; align-items: start; }
.report .pitches.three { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px; }
.report .pitches.small { grid-template-columns: repeat(auto-fit, minmax(210px, 320px)); gap: 14px 28px; }
.report .pitches.small.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.report figure { margin: 0; }
.report figcaption { font-weight: 650; font-size: 14px; margin: 0 0 8px; display: flex; align-items: center; gap: 7px; }
.report figcaption span.sub { font-weight: 400; color: var(--muted); }
.report svg.pitch { width: 100%; max-width: 420px; height: auto; display: block; }
.report .pitches.small svg.pitch { max-width: 300px; }
.report .pl { outline: none; cursor: default; }
.report .pl .hit { fill: transparent; }
.report .pl .dot { fill: var(--token); stroke: var(--line-2); stroke-width: 2.5; transition: stroke-width .12s; }
.report .pl.f1 .dot { stroke: var(--fit-1); } .report .pl.f2 .dot { stroke: var(--fit-2); }
.report .pl.f3 .dot { stroke: var(--fit-3); } .report .pl.f4 .dot { stroke: var(--fit-4); }
.report .pl:hover .dot, .report .pl:focus .dot { stroke-width: 4; }
.report .pitch text { text-anchor: middle; font-family: var(--font); }
.report .pl .abbr { font-size: 9px; font-weight: 750; fill: var(--ink); letter-spacing: .02em; }
.report .pitch .nm { font-size: 10.5px; font-weight: 650; fill: var(--ink); paint-order: stroke; stroke: var(--pitch); stroke-width: 3.5px; stroke-linejoin: round; }
.report .pl .sc { font-size: 9.5px; fill: var(--ink-2); font-variant-numeric: tabular-nums; paint-order: stroke; stroke: var(--pitch); stroke-width: 3px; }
.report .mk-marquee { fill: var(--ink); stroke: var(--pitch); stroke-width: 1.6; stroke-linejoin: round; }
.report .mk-future { fill: var(--pitch); stroke: var(--ink); stroke-width: 1.4; stroke-linejoin: round; }
.report .mk-start { fill: var(--ink-2); stroke: var(--pitch); stroke-width: 1.6; }
.report .tag.pick { color: var(--ink); border-color: var(--line-2); background: var(--surface-3); }
.report .tag.pick .pin { width: 7px; height: 7px; border-radius: 50%; background: var(--ink-2); display: inline-block; }
.report .picks-cost { display: flex; gap: 10px; align-items: flex-start; background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px; margin: 10px 0; font-size: 14px; color: var(--ink-2); }
.report .picks-cost .ico { margin-top: 3px; color: var(--accent); }
.report .picks-cost strong { color: var(--ink); }
.report .mvg { outline: none; }
.report .mv { stroke: var(--ink-2); stroke-width: 1.4; fill: none; stroke-linecap: round; stroke-linejoin: round; opacity: .55; }
.report .oopdot { fill: var(--pitch); stroke: var(--oop); stroke-width: 2.5; }
.report .ipdot { fill: var(--ip); stroke: var(--pitch); stroke-width: 2; }
.report .mvg:hover .mv, .report .mvg:focus .mv { opacity: 1; stroke-width: 2; }

/* keys and legends */
.report .key { display: inline-block; width: 9px; height: 9px; border-radius: 50%; flex: none; vertical-align: 0; }
.report .key.ip { background: var(--ip); }
.report .key.oop { background: var(--oop); }
.report .key.ring { background: transparent; box-shadow: inset 0 0 0 2px var(--oop); }
.report .legend { font-size: 12.5px; color: var(--muted); display: flex; flex-wrap: wrap; gap: 6px 16px; align-items: center; margin-top: 10px; }
.report .legend span { display: inline-flex; align-items: center; gap: 6px; }
.report .legend .swatch { width: 26px; height: 4px; border-radius: 2px; display: inline-block; }

/* fit chip: number + thin meter (one hue; brighter = better) */
.report .fit { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; }
.report .fit .n { font-weight: 650; font-variant-numeric: tabular-nums; min-width: 2ch; text-align: right; }
.report .fit .m { width: 34px; height: 4px; border-radius: 2px; background: var(--line); overflow: hidden; display: inline-block; }
.report .fit .m i { display: block; height: 100%; border-radius: 2px; background: var(--fit-2); }
.report .fit.f1 .m i { background: var(--fit-1); } .report .fit.f3 .m i { background: var(--fit-3); } .report .fit.f4 .m i { background: var(--fit-4); }
.report .fit.f1 .n { color: var(--ink-2); }

/* tables */
.report .tablewrap { overflow-x: auto; }
.report table { border-collapse: collapse; width: 100%; font-size: 13.5px; margin: 6px 0 2px; }
.report th, .report td { border-bottom: 1px solid var(--line); padding: 8px 10px; text-align: left; vertical-align: top; }
.report th { font-size: 11.5px; font-weight: 650; color: var(--muted); border-bottom-color: var(--line-2); white-space: nowrap; }
.report tbody tr:hover td { background: var(--surface-2); }
.report td.num, .report th.num { text-align: right; font-variant-numeric: tabular-nums; }
.report td .sub { font-size: 12px; color: var(--muted); margin-top: 1px; }
.report .role { display: inline; }
.report .role .key { margin-right: 6px; vertical-align: 1px; }
.report .role .ab { color: var(--muted); font-size: 12px; white-space: nowrap; }
.report .line { display: flex; align-items: center; gap: 8px; margin: 1px 0; }

/* settings (team instructions) */
.report table.settings td { padding: 10px 10px; }
.report table.settings td.name { width: 24%; font-weight: 600; }
.report table.settings td.val { width: 22%; }
.report table.settings td.why { color: var(--ink-2); font-size: 13.2px; }
.report table.settings tr.changed td.name::before { content: ""; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); margin: 0 8px 2px -14px; vertical-align: middle; }
.report table.settings td.name { padding-left: 22px; }
.report table.settings tr.changed .v { font-weight: 650; color: var(--ink); }
.report table.settings tr.unchanged .v { color: var(--muted); }
.report table.settings tr.unchanged td.name { color: var(--ink-2); font-weight: 500; }
.report table.settings tr.unchanged td.why { color: var(--muted); }
.report .scale { display: flex; gap: 3px; margin-top: 6px; }
.report .scale i { width: 15px; height: 4px; border-radius: 2px; background: var(--line-2); }
.report .scale i.on { background: var(--accent); }
.report tr.unchanged .scale i.on { background: var(--muted); }
.report .deflabel { font-size: 11.5px; color: var(--muted); margin-left: 6px; }

/* tags and notes */
.report .tag { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; padding: 1px 8px; border-radius: 999px; background: var(--surface-2); color: var(--ink-2); border: 1px solid var(--line); margin: 1px 2px 1px 0; white-space: nowrap; }
.report .tag.warn { background: var(--warn-soft); color: var(--warn); border-color: transparent; }
.report .tag.accent { background: var(--accent-soft); color: var(--accent); border-color: transparent; }
.report ul.notes { list-style: none; padding: 0; margin: 6px 0; display: grid; gap: 6px; }
.report ul.notes li { display: flex; gap: 10px; align-items: baseline; }
.report ul.notes .pts { flex: none; width: 46px; text-align: right; font-variant-numeric: tabular-nums; font-size: 12.5px; color: var(--muted); }
.report ul.notes li.plus .pts::before { content: "+"; }
.report ol.steps { padding-left: 20px; margin: 6px 0 12px; color: var(--ink-2); }
.report ol.steps li { margin: 4px 0; }
.report ol.steps strong { color: var(--ink); }

/* squad profile: diverging bars around the team level */
.report .profile { display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 6px 34px; }
.report .pf-group h4 { margin-top: 14px; }
.report .pf-row { position: relative; display: grid; grid-template-columns: minmax(150px, 1.25fr) 2fr 44px 38px; gap: 10px; align-items: center; padding: 4px 6px; border-radius: 6px; outline: none; }
.report .pf-row:hover, .report .pf-row:focus { background: var(--surface-2); }
.report .pf-label { font-size: 13px; color: var(--ink-2); line-height: 1.3; }
.report .pf-chart { position: relative; height: 18px; }
.report .pf-chart .grid { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--line); }
.report .pf-chart .zero { position: absolute; top: -2px; bottom: -2px; left: 50%; width: 1px; background: var(--line-2); }
.report .pf-chart .bar { position: absolute; top: 4px; height: 10px; }
.report .pf-chart .bar.pos { left: 50%; background: var(--pos); border-radius: 0 4px 4px 0; }
.report .pf-chart .bar.neg { right: 50%; background: var(--neg); border-radius: 4px 0 0 4px; }
.report .pf-delta { font-size: 12.5px; font-weight: 650; font-variant-numeric: tabular-nums; text-align: right; color: var(--ink); }
.report .pf-avg { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; text-align: right; }
.report .pf-axis { display: grid; grid-template-columns: minmax(150px, 1.25fr) 2fr 44px 38px; gap: 10px; padding: 0 6px; font-size: 11px; color: var(--muted); }
.report .pf-axis .ticks { display: flex; justify-content: space-between; font-variant-numeric: tabular-nums; }
.report .tip { display: none; position: absolute; z-index: 5; left: 40%; top: calc(100% + 2px); min-width: 240px; max-width: 360px; background: var(--surface-3);
  border: 1px solid var(--line-2); border-radius: 8px; padding: 8px 10px; font-size: 12.5px; color: var(--ink-2); box-shadow: 0 8px 24px rgba(0,0,0,.3); }
.report .tip strong { color: var(--ink); font-size: 14px; }
.report .pf-row:hover .tip, .report .pf-row:focus .tip { display: block; }

/* depth board */
.report .board { display: grid; gap: 14px; }
.report .board .line-label { text-align: center; font-size: 11.5px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; font-weight: 650; margin-bottom: 6px; }
.report .board .cards { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.report .board .cards .pos-card { flex: 0 1 262px; min-width: 210px; }
.report .pos-card { background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px 11px; }
.report .pos-card.weak { border-left: 3px solid var(--warn-line); }
.report .pos-card .hd { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.report .pos-card .hd strong { font-size: 14px; }
.report .pos-card .hd .roles { font-size: 11.5px; color: var(--muted); display: inline-flex; gap: 8px; align-items: center; }
.report .pos-card .roles span { display: inline-flex; align-items: center; gap: 4px; }
.report .pos-card .roles .key { width: 7px; height: 7px; }
.report .pos-card .who { display: grid; grid-template-columns: 16px 1fr auto; gap: 4px 6px; align-items: center; font-size: 13px; }
.report .pos-card .who .rk { font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }
.report .pos-card .who .nm1 { font-weight: 600; }
.report .pos-card .who .dim { color: var(--ink-2); }
.report .pos-card .flag { display: flex; gap: 5px; align-items: center; font-size: 12px; color: var(--warn); margin-top: 7px; }
.report .pos-card .extra { font-size: 12px; color: var(--muted); margin-top: 6px; line-height: 1.45; }

/* weak areas */
.report ol.weak { padding-left: 20px; display: grid; gap: 10px; }
.report ol.weak .look { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }

/* heatmap (role suitability): one hue, more = stronger; 2px surface gaps between cells */
.report table.matrix { border-collapse: separate; border-spacing: 2px; font-size: 12.5px; width: auto; }
.report table.matrix th, .report table.matrix td { border: 0; padding: 5px 4px; text-align: center; min-width: 38px; }
.report table.matrix th { padding-bottom: 6px; font-size: 11.5px; color: var(--ink-2); }
.report table.matrix th.ip { box-shadow: inset 0 -2px 0 var(--ip); }
.report table.matrix th.oop { box-shadow: inset 0 -2px 0 var(--oop); }
.report table.matrix td:first-child, .report table.matrix th:first-child { text-align: left; white-space: nowrap; padding-right: 12px; min-width: 150px; box-shadow: none; }
.report table.matrix td.h { background: rgb(var(--heat) / var(--a)); border-radius: 4px; color: var(--ink); font-variant-numeric: tabular-nums; }
.report table.matrix td.h.hi { color: var(--heat-ink-hi); font-weight: 600; }
.report table.matrix td.h.best { box-shadow: inset 0 0 0 1px var(--ink-2); font-weight: 700; }
.report table.matrix td.gap { min-width: 10px; padding: 0; }
.report table.matrix tbody tr:hover td { background-color: transparent; }
.report table.matrix tbody tr:hover td.h { filter: brightness(1.12); }
.report .heatscale { display: inline-flex; align-items: center; gap: 8px; }
.report .heatscale .bar { width: 120px; height: 8px; border-radius: 4px; background: linear-gradient(90deg, rgb(var(--heat) / .05), rgb(var(--heat) / .85)); }

/* alternatives */
.report .alt { border-top: 1px solid var(--line); padding-top: 18px; margin-top: 18px; }
.report .alt:first-of-type { border-top: 0; padding-top: 0; }
.report .alt .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 12px; }

@media (max-width: 900px) {
  .report .pitches.three, .report .pitches.small.three { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
}
@media (max-width: 640px) {
  .report section.card { padding: 18px 14px; }
  .report .pf-row, .report .pf-axis { grid-template-columns: 1fr 44px 38px; }
  .report .pf-row .pf-label { grid-column: 1 / -1; }
  .report .pf-axis > span:first-child { display: none; }
  .report .profile { grid-template-columns: 1fr; }
  .report table.settings td.name, .report table.settings td.val { width: auto; }
}
@media print {
  .report { max-width: none; padding: 0; font-size: 11.5px; }
  .report section.card { box-shadow: none; border: 0; padding: 0; margin: 0 0 10px; break-before: page; background: none; }
  .report .pitches, .report .pitches.small { grid-template-columns: repeat(2, minmax(0, 1fr)); justify-content: stretch; gap: 12px 24px; }
  .report .pitches.three, .report .pitches.small.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .report .kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .report .profile { grid-template-columns: 1fr 1fr; gap: 4px 20px; }
  .report .pf-row, .report .pf-axis { grid-template-columns: minmax(110px, 1.1fr) 1.6fr 36px 30px; }
  .report section.card#overview { break-before: auto; }
  .report nav.toc, .report .tip { display: none !important; }
  .report table, .report figure, .report .pos-card, .report .pf-row { break-inside: avoid; }
  .report .tablewrap { overflow: visible; }
  .report * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .report svg.pitch { max-width: 300px; margin: 0 auto; }
  .report tbody tr:hover td { background: none; }
}
`;
