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
.report nav.toc { position: sticky; top: 0; z-index: 6; display: flex; flex-wrap: wrap; gap: 6px; margin: 6px -8px 2px; padding: 8px;
  background: var(--topbar, var(--bg)); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
.report nav.toc a { font-size: 12.5px; color: var(--ink-2); text-decoration: none; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); }
.report nav.toc a:hover { color: var(--ink); border-color: var(--line-2); }
.report .hint-line { display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; color: var(--muted); margin-top: 10px; }
.report .hint-line .ico { margin-top: 2px; }
.report .hint-line strong { color: var(--ink-2); }

.report h3[id] { scroll-margin-top: var(--scroll-offset, 64px); }
.report section.card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 22px 24px 24px; margin: 14px 0; box-shadow: var(--shadow); scroll-margin-top: var(--scroll-offset, 64px); }
.report .lede { color: var(--ink-2); max-width: 78ch; }

/* stat tiles */
.report .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(172px, 1fr)); gap: 10px; margin: 4px 0 20px; }
.report .kpi { background: linear-gradient(180deg, var(--surface-2), var(--surface)); border: 1px solid var(--line); border-radius: 11px; padding: 11px 13px 12px; }
.report .kpi .k { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
.report .kpi .k .ki { width: 13px; height: 13px; color: var(--ink-2); flex: none; }
.report .kpi .k .key { width: 8px; height: 8px; margin: 0 2px; }
.report .kpi .v { font-size: 17px; font-weight: 650; line-height: 1.25; margin-top: 3px; text-wrap: balance; }
.report .kpi .meter { height: 4px; border-radius: 2px; background: var(--line); margin-top: 9px; overflow: hidden; }
.report .kpi .meter i { display: block; height: 100%; border-radius: 2px; background: var(--fit-3); }
.report .kpi .meter.f1 i { background: var(--fit-1); } .report .kpi .meter.f2 i { background: var(--fit-2); } .report .kpi .meter.f4 i { background: var(--fit-4); }

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
.report .pl .dot { fill: var(--token); stroke: var(--line); stroke-width: 1; }
.report .pl .trk { fill: none; stroke: var(--line-2); stroke-width: 3.2; opacity: .55; }
.report .pl .arc { fill: none; stroke: var(--fit-2); stroke-width: 3.2; stroke-linecap: round; transition: stroke-width .12s; }
.report .pl.f1 .arc { stroke: var(--fit-1); } .report .pl.f3 .arc { stroke: var(--fit-3); } .report .pl.f4 .arc { stroke: var(--fit-4); }
.report .pl:hover .arc, .report .pl:focus .arc { stroke-width: 4.6; }
.report .pl:focus-visible .dot { stroke: var(--accent); stroke-width: 2; }
.report .pitch text { text-anchor: middle; font-family: var(--font); }
.report .pl .abbr { font-size: 9px; font-weight: 750; fill: var(--ink); letter-spacing: .02em; }
.report .pl .pill { fill: var(--pill); stroke: var(--pill-line); stroke-width: 1; }
.report .pitch .nm { font-size: 10.5px; font-weight: 650; fill: var(--ink); }
.report .pl .sc { font-size: 9.5px; font-weight: 600; fill: var(--muted); font-variant-numeric: tabular-nums; }
.report .pl .cpt circle { fill: var(--warn-line); stroke: var(--pitch); stroke-width: 1.4; }
.report .pl .cpt text { font-size: 8px; font-weight: 800; fill: #1a1405; }
.report .cpt-key { display: inline-grid; place-items: center; width: 14px; height: 14px; border-radius: 50%; background: var(--warn-line); color: #1a1405; font-size: 8.5px; font-weight: 800; }
.report .movement .nm, .report svg.move .nm { paint-order: stroke; stroke: var(--pitch); stroke-width: 3.5px; stroke-linejoin: round; }
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
.report table.roles { min-width: 820px; }
.report table.best td { padding-top: 7px; padding-bottom: 7px; }
.report table.best .line { white-space: nowrap; font-size: 13px; }

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
.report .pos-card .also { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-top: 8px; padding-top: 7px; border-top: 1px dashed var(--line); }
.report .pos-card .also .lbl { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin-right: 2px; }
.report .chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; line-height: 1.5; padding: 0 7px; border-radius: 6px; background: var(--surface-3); color: var(--ink-2); white-space: nowrap; }
.report .chip b { color: var(--ink); font-weight: 650; font-variant-numeric: tabular-nums; }
.report .chip i { font-style: normal; color: var(--muted); }
.report .chip .ico { width: 10px; height: 10px; }
.report .chip.inj { background: var(--warn-soft); color: var(--warn); }
.report .chip.inj b { color: var(--warn); }
.report .chip.loan { background: transparent; border: 1px dashed var(--line-2); color: var(--muted); }
.report .chips { display: flex; flex-wrap: wrap; gap: 5px; margin: 6px 0 2px; }
.report details.more summary { cursor: pointer; }
.report details.more summary:hover { color: var(--ink-2); }

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
.report table.matrix td.h { background: rgb(var(--heat) / var(--a)); background: color-mix(in oklab, var(--heat-lo), var(--heat-hi) var(--t)); border-radius: 4px; color: var(--ink); font-variant-numeric: tabular-nums; }
.report table.matrix td.h.hi { color: var(--heat-ink-hi); font-weight: 600; }
.report table.matrix td.h.best { box-shadow: inset 0 0 0 1px var(--ink-2); font-weight: 700; }
.report table.matrix td.gap { min-width: 10px; padding: 0; }
.report table.matrix tbody tr:hover td:not(.h) { background-color: transparent; }
.report table.matrix tbody tr:hover td.h { filter: brightness(1.12); }
.report .heatscale { display: inline-flex; align-items: center; gap: 8px; }
.report .heatscale .bar { width: 120px; height: 8px; border-radius: 4px; background: linear-gradient(90deg, rgb(var(--heat) / .05), rgb(var(--heat) / .85)); background: linear-gradient(in oklab 90deg, var(--heat-lo), var(--heat-hi)); }
.report .abbr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 3px 16px; margin: 8px 0 4px; font-size: 12px; color: var(--muted); }
.report .abbr-grid span { display: flex; gap: 7px; align-items: baseline; min-width: 0; }
.report .abbr-grid b { color: var(--ink-2); font-weight: 650; min-width: 3.2em; }

/* alternatives */
.report .alt { border-top: 1px solid var(--line); padding-top: 18px; margin-top: 18px; }
.report .alt:first-of-type { border-top: 0; padding-top: 0; }
.report .alt .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 12px; }

/* checklist mode: tick boxes in "Enter it in FM27" (app: saved per tactic; paper: empty boxes to tick by hand) */
.report .tick { display: inline-flex; align-items: center; gap: 9px; cursor: pointer; }
.report .tick input { appearance: none; -webkit-appearance: none; flex: none; width: 17px; height: 17px; margin: 0; border-radius: 5px; border: 1.5px solid var(--line-2); background: var(--surface); display: grid; place-items: center; cursor: pointer; }
.report .tick input::after { content: ""; width: 9px; height: 5px; border: 2px solid var(--accent-ink); border-top: 0; border-right: 0; transform: rotate(-45deg) translate(1px, -1px); opacity: 0; }
.report .tick input:checked { background: var(--accent); border-color: var(--accent); }
.report .tick input:checked::after { opacity: 1; }
.report .tick input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.report tr.done td { opacity: .5; }
.report tr.done .tick span, .report tr.done .tick .pname { text-decoration: line-through; text-decoration-color: var(--muted); }
.report table.settings.checklist td.name { padding-left: 10px; }
.report table.settings.checklist tr.changed td.name::before { display: none; }
.report table.settings.checklist tr.unchanged td.name { padding-left: 36px; }
.report .app-only { display: none; }
.in-app .report .app-only { display: flex; }
.report .checkbar { align-items: center; gap: 12px; margin: 4px 0 6px; font-size: 13px; color: var(--ink-2); }
.report .checkbar .cb-track { flex: 0 1 240px; height: 6px; border-radius: 3px; background: var(--line); overflow: hidden; }
.report .checkbar .cb-track i { display: block; height: 100%; width: 0; background: var(--accent); border-radius: 3px; transition: width .2s; }
.report .checkbar.complete .cb-text { color: var(--accent); }
.report .linkbtn { font: inherit; font-size: 12.5px; color: var(--muted); background: none; border: 0; padding: 0; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
.report .linkbtn:hover { color: var(--ink); }

/* match plan */
.report .mp-controls { flex-direction: column; gap: 8px; margin: 8px 0 14px; padding: 12px 14px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px; }
.report .mp-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.report .mp-l { width: 82px; flex: none; font-size: 12.5px; color: var(--muted); font-weight: 600; }
.report .mp-chip { position: relative; cursor: pointer; }
.report .mp-chip input { position: absolute; opacity: 0; pointer-events: none; }
.report .mp-chip span { display: inline-block; font-size: 13px; padding: 5px 11px; border-radius: 999px; border: 1px solid var(--line-2); color: var(--ink-2); background: var(--surface); }
.report .mp-chip span:hover { color: var(--ink); border-color: var(--ink-2); }
.report .mp-chip input:checked + span { background: var(--accent-soft); border-color: var(--accent); color: var(--ink); font-weight: 600; }
.report .mp-chip input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: 2px; }
.report .mp-plan .kpis { margin-top: 10px; }

/* recruitment and progress */
.report .loadrow { flex-wrap: wrap; gap: 8px 12px; align-items: center; margin: 10px 0 2px; }
.report .loadrow .btn { font: inherit; font-size: 13px; font-weight: 600; border-radius: 8px; padding: 6px 11px; border: 1px solid var(--line-2); background: transparent; color: var(--ink); cursor: pointer; }
.report .loadrow .btn:hover { border-color: var(--ink-2); }
.report .tag.muted-tag { color: var(--muted); }
.report .tag.up { color: var(--pos); border-color: transparent; background: color-mix(in srgb, var(--pos) 12%, transparent); }
.report .tag.down { color: var(--neg); border-color: transparent; background: color-mix(in srgb, var(--neg) 12%, transparent); }
.report table.scout { min-width: 760px; }
.report svg.trend { width: 100%; max-width: 560px; height: auto; display: block; margin: 8px 0 4px; }
.report svg.trend .grid { stroke: var(--line); stroke-width: 1; }
.report svg.trend .ax { font: 11px var(--font); fill: var(--muted); }
.report svg.trend .val { font: 600 12px var(--font); fill: var(--ink); }
.report svg.trend .ln { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.report svg.trend .hit { fill: transparent; }
.report svg.trend .dot { fill: var(--surface); stroke: var(--accent); stroke-width: 2; }
.report svg.trend .dot.now { fill: var(--accent); }
.report svg.trend .pt:hover .dot, .report svg.trend .pt:focus .dot { stroke-width: 3; }

/* player names open the player card in the app */
.report .pname { font: inherit; color: inherit; background: none; border: 0; padding: 0; text-align: left; cursor: default; }
.in-app .report .pname { cursor: pointer; text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
.in-app .report .pname:hover { text-decoration-color: var(--accent); color: var(--ink); }
.in-app .report .pl[data-pid] { cursor: pointer; }

/* role suitability filter */
.report .sfilter { flex-wrap: wrap; gap: 10px 16px; align-items: center; margin: 4px 0 8px; padding: 10px 12px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px; }
.report .sfilter input[type="search"], .report .sfilter select { font: inherit; font-size: 13.5px; color: var(--ink); background: var(--surface); border: 1px solid var(--line-2); border-radius: 8px; padding: 6px 9px; }
.report .sfilter input[type="search"] { width: min(240px, 100%); }
.report .sfilter .check { display: inline-flex; gap: 7px; align-items: center; font-size: 13px; color: var(--ink-2); margin: 0; }
.report .sfilter .check input { accent-color: var(--accent); }
.report .sf-count { font-size: 12.5px; color: var(--muted); margin-left: auto; }
.report [data-hidden] { display: none !important; }

/* player card */
.pcard-dialog { border: 1px solid var(--line-2); border-radius: 14px; padding: 0; background: var(--surface); color: var(--ink); width: min(680px, calc(100vw - 32px)); max-height: calc(100vh - 48px); box-shadow: 0 24px 60px rgba(0, 0, 0, .45); }
.pcard-dialog::backdrop { background: rgba(0, 0, 0, .55); }
.pcard-dialog .report { padding: 0; }
.pcard-dialog .pc-close { position: sticky; top: 0; float: right; margin: 10px 10px 0 0; z-index: 2; }
.report .pcard { padding: 18px 22px 20px; }
.report .pc-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; padding-right: 44px; }
.report .pc-head h3 { margin: 0; font-size: 20px; }
.report .pc-facts { color: var(--muted); font-size: 13px; margin-top: 2px; }
.report .pc-level { display: grid; justify-items: end; line-height: 1.2; flex: none; }
.report .pc-level strong { font-size: 22px; }
.report .pc-tags { margin: 8px 0 2px; }
.report .pcard h4 { margin-top: 16px; }
.report .pc-place { display: grid; gap: 4px; font-size: 14px; }
.report .pc-place > div { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.report .pc-sub { font-size: 12.5px; color: var(--muted); margin-top: 4px; }
.report .pc-sub b { color: var(--ink-2); }
.report .pc-attrs { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 6px 22px; }
.report .pc-rt { font-size: 12.5px; font-weight: 650; display: flex; align-items: center; gap: 6px; margin: 4px 0 4px; }
.report .ab { display: grid; grid-template-columns: 128px 1fr 34px; gap: 8px; align-items: center; font-size: 12.5px; color: var(--ink-2); padding: 1px 0; }
.report .ab.keyattr .an { color: var(--ink); font-weight: 600; }
.report .abar { position: relative; height: 8px; border-radius: 4px; background: var(--line); }
.report .abar i { position: absolute; inset: 0 auto 0 0; border-radius: 4px; background: var(--muted); opacity: .7; }
.report .ab.hi .abar i { background: var(--pos); opacity: 1; }
.report .ab.lo .abar i { background: var(--neg); opacity: 1; }
.report .abar b { position: absolute; top: -3px; bottom: -3px; width: 2px; margin-left: -1px; background: var(--ink); border-radius: 1px; }
.report .av { text-align: right; font-variant-numeric: tabular-nums; color: var(--ink); font-weight: 600; }
.report .tickkey { display: inline-block; width: 2px; height: 12px; background: var(--ink); border-radius: 1px; vertical-align: -2px; }
.report .hi-k { color: var(--pos); font-weight: 600; } .report .lo-k { color: var(--neg); font-weight: 600; }
.report .pc-best { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 22px; font-size: 13px; }

/* one-page cheat sheet (printed on its own) */
.sheet { font: 9.5px/1.35 var(--font); color: #111; }
.sheet header { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; border-bottom: 1.5px solid #111; padding-bottom: 4px; margin-bottom: 6px; }
.sheet h1 { font-size: 17px; margin: 0; }
.sheet .eyebrow { font-size: 8px; text-transform: uppercase; letter-spacing: .1em; color: #555; font-weight: 700; }
.sheet .sh-kpis { display: flex; flex-wrap: wrap; gap: 3px 12px; justify-content: flex-end; font-size: 9px; color: #444; }
.sheet .sh-kpis b { color: #111; }
.sheet .sh-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 10px; }
.sheet .sh-pitches { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; align-content: start; }
.sheet .sh-pitches table { grid-column: 1 / -1; }
.sheet figure { margin: 0; }
.sheet figcaption { font-weight: 700; font-size: 9px; margin-bottom: 2px; }
.sheet svg.pitch { width: 100%; height: auto; display: block; }
.sheet h2 { font-size: 10px; margin: 6px 0 2px; text-transform: uppercase; letter-spacing: .06em; }
.sheet h2 span { font-weight: 400; text-transform: none; letter-spacing: 0; color: #666; }
.sheet .sh-t { width: 100%; border-collapse: collapse; font-size: inherit; margin: 0; }
.sheet .sh-t th, .sheet .sh-t td { text-align: left; padding: 1.5px 4px; border-bottom: .5px solid #ccc; vertical-align: top; }
.sheet .sh-t th { font-size: 8px; color: #666; font-weight: 600; }
.sheet .sh-foot { margin-top: 6px; font-size: 8px; color: #666; }
.sheet .pl .pill { fill: #fff; } .sheet .pitch .nm { fill: #111; }

@media (max-width: 900px) {
  .report .pitches.three, .report .pitches.small.three { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
}
@media (max-width: 640px) {
  .report section.card { padding: 18px 14px; }
  .report h1 { font-size: 24px; }
  .report .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .report table.settings thead { display: none; }
  .report table.settings tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 12px; border-bottom: 1px solid var(--line); padding: 6px 0; }
  .report table.settings td { border: 0; padding: 4px 6px; }
  .report table.settings td.name { padding-left: 18px; }
  .report table.settings td.why, .report table.settings td[colspan] { grid-column: 1 / -1; padding-left: 18px; }
  .report table.settings td.val { text-align: right; }
  .report table.settings td.val .scale { justify-content: flex-end; }
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
  .report .app-only, .report .sfilter { display: none !important; }
  .report .tick input { border-color: #777; background: #fff; }
  .report .pname { text-decoration: none !important; }
  .report .pl .pill { fill: #ffffff; }
  .report table, .report figure, .report .pos-card, .report .pf-row { break-inside: avoid; }
  .report .tablewrap { overflow: visible; }
  .report * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .report svg.pitch { max-width: 300px; margin: 0 auto; }
  .report tbody tr:hover td { background: none; }
}
`;
