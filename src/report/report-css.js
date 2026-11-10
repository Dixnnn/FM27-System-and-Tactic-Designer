// Styles for the report (shared by the app and the "Save report" file). Print-friendly.
export const REPORT_CSS = `
.report {
  --ink: #17202a; --muted: #5b6672; --line: #d9dee3; --soft: #f4f6f8; --card: #ffffff;
  --accent: #1f6f50; --accent-soft: #e5f2ec; --warn: #8a5a00; --warn-soft: #fff4dc;
  --pitch: #2f7d4f; --pitch-line: rgba(255,255,255,.75);
  --s-top: #1b7a43; --s-good: #5d9b3a; --s-ok: #c08a12; --s-low: #b4473a; --s-none: #9aa3ab;
  color: var(--ink); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  max-width: 1120px; margin: 0 auto; padding: 8px 16px 48px; background: var(--card);
}
.report * { box-sizing: border-box; }
.report h1 { font-size: 28px; line-height: 1.2; margin: 4px 0 6px; }
.report h2 { font-size: 21px; margin: 36px 0 10px; padding-top: 10px; border-top: 2px solid var(--ink); }
.report h3 { font-size: 16px; margin: 22px 0 8px; }
.report p { margin: 6px 0; }
.report .eyebrow { text-transform: uppercase; letter-spacing: .08em; font-size: 12px; font-weight: 700; color: var(--accent); }
.report .meta { color: var(--muted); font-size: 13px; }
.report .notice { border: 1px solid #e6c46a; background: var(--warn-soft); color: #4d3600; border-radius: 8px; padding: 10px 14px; margin: 14px 0; }
.report .notice strong { color: #4d3600; }
.report .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin: 12px 0 16px; }
.report .kpi { background: var(--soft); border-radius: 8px; padding: 10px 12px; }
.report .kpi .k { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
.report .kpi .v { font-size: 19px; font-weight: 700; }
.report .pitches { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; }
.report figure { margin: 0; }
.report figcaption { font-weight: 700; margin: 0 0 6px; }
.report figcaption span { font-weight: 400; color: var(--muted); }
.report svg.pitch { width: 100%; max-width: 420px; height: auto; display: block; }
.report .pl .dot { fill: #fff; stroke: var(--s-none); stroke-width: 3; }
.report .pl.s-top .dot { stroke: var(--s-top); } .report .pl.s-good .dot { stroke: var(--s-good); }
.report .pl.s-ok .dot { stroke: var(--s-ok); } .report .pl.s-low .dot { stroke: var(--s-low); }
.report .pl text { text-anchor: middle; font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
.report .pl .abbr { font-size: 10px; font-weight: 800; fill: #17202a; }
.report .pl .nm { font-size: 11.5px; font-weight: 700; fill: #fff; paint-order: stroke; stroke: rgba(0,0,0,.45); stroke-width: 3px; }
.report .pl .sc { font-size: 10px; fill: #e9f5ee; }
.report table { border-collapse: collapse; width: 100%; font-size: 13.5px; margin: 8px 0 4px; }
.report th, .report td { border-bottom: 1px solid var(--line); padding: 6px 8px; text-align: left; vertical-align: top; }
.report th { background: var(--soft); font-size: 12px; text-transform: uppercase; letter-spacing: .03em; color: var(--muted); }
.report td.num, .report th.num { text-align: right; font-variant-numeric: tabular-nums; }
.report .tablewrap { overflow-x: auto; }
.report .score { display: inline-block; min-width: 34px; padding: 1px 6px; border-radius: 10px; text-align: center; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
.report .score.s-top { background: var(--s-top); } .report .score.s-good { background: var(--s-good); }
.report .score.s-ok { background: var(--s-ok); } .report .score.s-low { background: var(--s-low); } .report .score.s-none { background: var(--s-none); }
.report table.matrix td, .report table.matrix th { padding: 4px 5px; text-align: center; }
.report table.matrix td:first-child, .report table.matrix th:first-child { text-align: left; white-space: nowrap; }
.report table.matrix .score { min-width: 30px; font-size: 12px; }
.report table.matrix .best { outline: 2px solid var(--ink); outline-offset: 1px; }
.report .phase-ip { color: #0f5e8c; } .report .phase-oop { color: #8c2f4b; }
.report .tag { display: inline-block; font-size: 11.5px; padding: 0 6px; border-radius: 9px; background: var(--soft); color: var(--muted); margin: 1px 2px 1px 0; }
.report .tag.warn { background: var(--warn-soft); color: var(--warn); }
.report ul.notes { padding-left: 20px; margin: 6px 0; }
.report ul.notes li.plus::marker { content: "+  "; color: var(--s-top); font-weight: 700; }
.report ul.notes li.minus::marker { content: "–  "; color: var(--s-low); font-weight: 700; }
.report ol.steps li { margin: 4px 0; }
.report .legend { font-size: 12.5px; color: var(--muted); }
.report .muted { color: var(--muted); }
.report .small { font-size: 12.5px; }
.report h4 { font-size: 14px; margin: 16px 0 4px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
.report nav.toc { font-size: 13px; color: var(--muted); margin: 4px 0 8px; }
.report nav.toc a { color: var(--accent); text-decoration: none; }
.report table.settings td { vertical-align: top; }
.report table.settings td:first-child { width: 22%; }
.report table.settings td.setting { width: 20%; white-space: nowrap; }
.report table.settings tr.unchanged td { color: var(--muted); }
.report table.settings tr.unchanged td strong { color: var(--muted); font-weight: 600; }
.report table.settings tr.changed td.setting strong { color: var(--accent); }
.report td.why { font-size: 13px; }
.report .pitches.small { grid-template-columns: repeat(auto-fit, minmax(220px, 300px)); }
.report .pitches.small svg.pitch { max-width: 300px; }
.report td.delta.up { color: var(--s-top); font-weight: 700; }
.report td.delta.down { color: var(--s-low); font-weight: 700; }
.report tr.muted td { color: var(--muted); }
.report .next { background: var(--accent-soft); border-radius: 8px; padding: 10px 14px; margin-top: 18px; }
@media print {
  .report { max-width: none; padding: 0; font-size: 12px; }
  .report h2 { break-before: page; border-top: none; margin-top: 0; }
  .report section.keep-with-prev h2 { break-before: auto; }
  .report table, .report figure { break-inside: avoid; }
  .report .tablewrap { overflow: visible; }
  .report .score { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .report svg.pitch { max-width: 300px; }
  .report nav.toc { display: none; }
  .report table.settings td.setting { white-space: normal; }
}
`;
