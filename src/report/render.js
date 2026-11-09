// Builds the HTML report from an analyse() result.

import { pitchSVG } from './pitch.js';
import { REPORT_CSS } from './report-css.js';
import { esc, scoreClass, fmt } from './util.js';
import { slotRoleScore } from '../engine/roles.js';

const GROUPS = [
  { title: 'Goalkeepers', positions: ['GK'] },
  { title: 'Centre-backs', positions: ['D (C)'] },
  { title: 'Full-backs and wing-backs', positions: ['D (L)', 'D (R)', 'WB (L)', 'WB (R)'] },
  { title: 'Defensive midfielders', positions: ['DM'] },
  { title: 'Central midfielders', positions: ['M (C)'] },
  { title: 'Wide midfielders and wingers', positions: ['M (L)', 'M (R)', 'AM (L)', 'AM (R)'] },
  { title: 'Attacking midfielders', positions: ['AM (C)'] },
  { title: 'Strikers', positions: ['ST (C)'] },
];

const score = (v, extra = '') => `<span class="score ${scoreClass(v == null ? v : Math.round(v))}${extra}">${fmt(v)}</span>`;

function slotLabel(slots, code) {
  return slots[code][3];
}

function bySlotOrder(slots, key) {
  return (a, b) => {
    const [ax, ay] = slots[a[key]];
    const [bx, by] = slots[b[key]];
    return ay - by || ax - bx;
  };
}

function laneNotes(lane) {
  const notes = [];
  for (const [phase, s, slot] of [['IP', lane.ipScore, lane.ip], ['OOP', lane.oopScore, lane.oop]]) {
    if (s.familiarity !== 'Natural') {
      const est = s.familiarity === 'Accomplished' ? '' : ' (estimated)';
      notes.push(`<span class="tag${s.familiarity === 'Accomplished' ? '' : ' warn'}">${phase}: ${esc(s.familiarity)} at ${esc(slot)}${est}</span>`);
    }
    if (s.footFactor < 0.96) notes.push(`<span class="tag warn">${phase}: weaker foot for this side</span>`);
    if (s.hi - s.lo >= 6) notes.push(`<span class="tag warn">${phase}: ±${fmt((s.hi - s.lo) / 2)} (scouting ranges)</span>`);
    if (s.missingShare > 0.35) notes.push(`<span class="tag warn">${phase}: some key attributes unknown</span>`);
  }
  if (lane.player.condition != null && lane.player.condition < 85) notes.push(`<span class="tag warn">Condition ${fmt(lane.player.condition)}%</span>`);
  return [...new Set(notes)].join(' ');
}

function overview(result) {
  const best = result.search.best;
  const slots = result.ctx.slots;
  const ipItems = best.lanes.map((l) => ({ slot: l.ip, abbr: l.ipRole.abbr, roleName: l.ipRole.name, name: l.player.name, score: l.ipScore.score }));
  const oopItems = best.lanes.map((l) => ({ slot: l.oop, abbr: l.oopRole.abbr, roleName: l.oopRole.name, name: l.player.name, score: l.oopScore.score }));
  const balance = best.balance.points;
  return `
<section id="overview">
  <h2>1. The tactic at a glance</h2>
  <div class="kpis">
    <div class="kpi"><div class="k">In possession</div><div class="v">${esc(best.ipName)}</div></div>
    <div class="kpi"><div class="k">Out of possession</div><div class="v">${esc(best.oopName)}</div></div>
    <div class="kpi"><div class="k">Team fit (0–100)</div><div class="v">${fmt(best.fit, 1)}</div></div>
    <div class="kpi"><div class="k">Balance</div><div class="v">${balance >= 0 ? '+' : ''}${fmt(balance, 1)} points</div></div>
  </div>
  <div class="pitches">
    <figure><figcaption class="phase-ip">In possession <span>· ${esc(best.ipName)}</span></figcaption>${pitchSVG(ipItems, slots, 'In possession shape')}</figure>
    <figure><figcaption class="phase-oop">Out of possession <span>· ${esc(best.oopName)}</span></figcaption>${pitchSVG(oopItems, slots, 'Out of possession shape')}</figure>
  </div>
  <p class="legend">Each circle shows the role's FM27 abbreviation, the player's surname and his fit score for that role (0–100; ring colour:
  <span class="score s-top">75+</span> excellent, <span class="score s-good">65+</span> good, <span class="score s-ok">55+</span> usable, <span class="score s-low">&lt;55</span> weak).</p>
</section>`;
}

function setup(result) {
  const best = result.search.best;
  const slots = result.ctx.slots;
  const lanes = best.lanes.slice().sort(bySlotOrder(slots, 'ip'));
  const rows = lanes
    .map(
      (l) => `<tr>
  <td><strong>${esc(l.player.name)}</strong><div class="small muted">${esc(l.player.positionsText || [...l.player.positions].join(', '))}</div></td>
  <td>${esc(slotLabel(slots, l.ip))}</td>
  <td><span class="phase-ip">${esc(l.ipRole.name)}</span> <span class="muted small">(${esc(l.ipRole.abbr)})</span></td>
  <td class="num">${score(l.ipScore.score)}</td>
  <td>${esc(slotLabel(slots, l.oop))}</td>
  <td><span class="phase-oop">${esc(l.oopRole.name)}</span> <span class="muted small">(${esc(l.oopRole.abbr)})</span></td>
  <td class="num">${score(l.oopScore.score)}</td>
  <td>${laneNotes(l)}</td>
</tr>`,
    )
    .join('\n');
  return `
<section id="setup">
  <h2>2. Enter it in FM27</h2>
  <ol class="steps">
    <li>Open <strong>Tactics</strong>. Pick an empty tactic slot (or one you don't mind changing).</li>
    <li>Switch the pitch to <strong>In Possession</strong> and choose the formation <strong>${esc(best.ipName)}</strong>
      (or drag players until the shape matches the left-hand pitch above).</li>
    <li>Put each player in the <em>In possession</em> spot below and give him the <span class="phase-ip">In possession role</span>.</li>
    <li>Switch the pitch to <strong>Out of Possession</strong>, choose <strong>${esc(best.oopName)}</strong>, and set each player's spot and
      <span class="phase-oop">Out of possession role</span> the same way.</li>
    <li>FM27 roles have no duties, so there is nothing else to pick per player.</li>
  </ol>
  <div class="tablewrap"><table>
    <thead><tr><th>Player</th><th>IP spot</th><th>In possession role</th><th class="num">Fit</th><th>OOP spot</th><th>Out of possession role</th><th class="num">Fit</th><th>Notes</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
</section>`;
}

function why(result) {
  const { best, ranking, tested } = result.search;
  const notes = best.balance.notes.length
    ? `<ul class="notes">${best.balance.notes
        .map((n) => `<li class="${n.points >= 0 ? 'plus' : 'minus'}">${esc(n.text)} <span class="muted small">(${n.points > 0 ? '+' : ''}${fmt(n.points, 1)})</span></li>`)
        .join('')}</ul>`
    : '<p>No balance problems found.</p>';
  const top = ranking.slice(0, result.ctx.search.topSystems);
  const rows = top
    .map(
      (r, i) => `<tr${i === 0 ? ' style="font-weight:700"' : ''}><td>${i + 1}</td><td>${esc(r.ipName)}</td><td>${esc(r.oopName)}</td>
  <td class="num">${fmt(r.fit, 1)}</td><td class="num">${r.balance.points >= 0 ? '+' : ''}${fmt(r.balance.points, 1)}</td>
  <td class="num">${r.complexity >= 0.05 ? '−' : ''}${fmt(r.complexity, 1)}</td><td class="num">${fmt(r.score, 1)}</td></tr>`,
    )
    .join('');
  const runnerUp = top[1];
  const gap = runnerUp ? best.score - runnerUp.score : 0;
  return `
<section id="why">
  <h2>3. Why this system</h2>
  <p>The tool tested <strong>${tested}</strong> combinations of in-possession and out-of-possession formations. For each one it chose the
  best eleven with the Hungarian algorithm (an exact method, so no other line-up of your players fits that system better), then picked
  each player's two roles for fit and team balance.</p>
  ${runnerUp && gap < 1 ? `<p>The top systems are close (${fmt(gap, 1)} points apart), so any of them suits this squad. Pick the one you prefer to watch.</p>` : ''}
  <h3>Team balance of the chosen system</h3>
  ${notes}
  <h3>Best systems tested</h3>
  <div class="tablewrap"><table>
    <thead><tr><th>#</th><th>In possession</th><th>Out of possession</th><th class="num">Fit</th><th class="num">Balance</th><th class="num">Complexity</th><th class="num">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  <p class="legend">Fit = average of the eleven players' role scores (half in possession, half out of possession). Complexity = a small
  deduction when players move a long way between the two shapes, because FM27 rates complex tactics as harder to learn.</p>
</section>`;
}

function groupScore(ctx, player, role, positions) {
  let best = null;
  for (const pos of role.positions) {
    if (!positions.includes(pos)) continue;
    const s = slotRoleScore(player, role, ctx.slotForPosition[pos], ctx);
    if (!best || s.score > best.score) best = { ...s, position: pos };
  }
  return best;
}

function suitability(result) {
  const { ctx, players } = result;
  const roles = ctx.roles.roles;
  const xiIds = new Set(result.search.best.lanes.map((l) => l.player.id));

  const bestRows = players
    .map((p) => {
      const scored = result.suitability.find((s) => s.player === p).scores;
      const top = (phase) =>
        roles
          .filter((r) => r.phase === phase && scored[r.id])
          .map((r) => ({ r, s: scored[r.id] }))
          .sort((a, b) => b.s.score - a.s.score)
          .slice(0, 3)
          .map(({ r, s }) => `${score(s.score)} ${esc(r.name)}`)
          .join('<br>');
      const flags = [];
      if (xiIds.has(p.id)) flags.push('<span class="tag">Starting XI</span>');
      if (p.injured) flags.push(`<span class="tag warn">Injured${p.injury ? ': ' + esc(p.injury) : ''}</span>`);
      if (p.uncertainAttrs.length) flags.push(`<span class="tag warn">${p.uncertainAttrs.length} attributes are scouting ranges</span>`);
      if (p.unknownAttrs.length > 3) flags.push(`<span class="tag warn">${p.unknownAttrs.length} attributes unknown</span>`);
      return `<tr><td><strong>${esc(p.name)}</strong><div class="small muted">${esc(p.positionsText)}${p.age != null ? ' · ' + fmt(p.age) : ''}</div></td>
<td>${top('IP')}</td><td>${top('OOP')}</td><td>${esc(p.fmBestRole || '–')}</td><td>${flags.join(' ')}</td></tr>`;
    })
    .join('\n');

  const matrices = GROUPS.map((g) => {
    const groupRoles = roles.filter((r) => r.positions.some((pos) => g.positions.includes(pos)));
    const ipRoles = groupRoles.filter((r) => r.phase === 'IP');
    const oopRoles = groupRoles.filter((r) => r.phase === 'OOP');
    const members = players.filter((p) => g.positions.some((pos) => p.positions.has(pos)));
    if (!members.length) return `<h3>${esc(g.title)}</h3><p class="muted">Nobody in the squad lists these positions.</p>`;
    const head = [...ipRoles, ...oopRoles]
      .map((r) => `<th class="${r.phase === 'IP' ? 'phase-ip' : 'phase-oop'}" title="${esc(r.name)}">${esc(r.abbr)}</th>`)
      .join('');
    const body = members
      .map((p) => {
        const cells = [ipRoles, oopRoles].map((list) => {
          const vals = list.map((r) => groupScore(ctx, p, r, g.positions));
          const max = Math.max(...vals.map((v) => (v ? v.score : -1)));
          return vals.map((v) => `<td>${v ? score(v.score, v.score === max ? ' best' : '') : ''}</td>`).join('');
        });
        return `<tr><td>${esc(p.name)}${p.injured ? ' <span class="tag warn">inj</span>' : ''}</td>${cells.join('')}</tr>`;
      })
      .join('');
    const legend = [...ipRoles, ...oopRoles].map((r) => `<strong>${esc(r.abbr)}</strong> ${esc(r.name)}`).join(' · ');
    return `<h3>${esc(g.title)}</h3>
<div class="tablewrap"><table class="matrix"><thead><tr><th>Player</th>${head}</tr></thead><tbody>${body}</tbody></table></div>
<p class="legend"><span class="phase-ip">Blue = in possession</span>, <span class="phase-oop">red = out of possession</span>. ${legend}</p>`;
  }).join('\n');

  return `
<section id="suitability">
  <h2>4. Role suitability for the whole squad</h2>
  <p>Every player scored for every FM27 role. A score weighs the role's key attributes three times and its preferred attributes 1.5 times
  (the same attributes FM27 highlights for that role), adds the attributes the match engine rewards in every role (pace, acceleration,
  anticipation, decisions…), then adjusts for position familiarity and, on the wings, for the stronger foot.</p>
  <h3>Best roles per player</h3>
  <div class="tablewrap"><table>
    <thead><tr><th>Player</th><th>Best in possession</th><th>Best out of possession</th><th>FM's best role</th><th>Notes</th></tr></thead>
    <tbody>${bestRows}</tbody>
  </table></div>
  <p class="legend">"FM's best role" is the assistant manager's opinion from your export (if the column was included), for comparison.</p>
  ${matrices}
</section>`;
}

function dataNotes(result) {
  const { columns, players } = result;
  const items = [];
  items.push(`Read <strong>${players.length}</strong> players from <strong>${esc(result.filename)}</strong> (${esc(result.source)}, ${result.format.toUpperCase()}).`);
  items.push(`${columns.attributesFound} of ${columns.attributesTotal} attributes found.`);
  const menuList = (list) =>
    `<ul>${list.map((c) => `<li><strong>${esc(c.label)}</strong>${c.menu ? ` – in FM27: Insert Column › ${esc(c.menu)}` : ''}${c.why ? ` <span class="muted">(${esc(c.why)})</span>` : ''}</li>`).join('')}</ul>`;
  if (columns.missingEssential.length) {
    items.push(`<strong>Missing columns that matter</strong> (scores use the attributes that are present; add these for better results):${menuList(columns.missingEssential)}`);
  }
  if (columns.missingRecommended.length) {
    items.push(`Missing columns that would improve the report:${menuList(columns.missingRecommended)}`);
  }
  const ranged = players.filter((p) => p.uncertainAttrs.length);
  if (ranged.length) {
    items.push(`${ranged.length} player(s) have attributes shown as scouting ranges (e.g. "11-14"). The tool uses the middle of the range and shows the possible spread as ±: ${ranged.map((p) => esc(p.name)).join(', ')}.`);
  }
  const unknown = players.filter((p) => p.unknownAttrs.length > 3);
  if (unknown.length) items.push(`Some attributes are unknown ("-") for: ${unknown.map((p) => esc(p.name)).join(', ')}. Their scores use only the known attributes.`);
  const injured = players.filter((p) => p.injured);
  if (injured.length) {
    const left = result.ctx.search.excludeInjured;
    items.push(`${left ? 'Left out of the starting XI because injured' : 'Injured (still considered for the XI)'}: ${injured.map((p) => `${esc(p.name)}${p.injury ? ` (${esc(p.injury)})` : ''}`).join(', ')}.`);
  }
  items.push('Position familiarity: FM27 only shows it as coloured dots, which no export contains. The tool treats <em>Best Pos</em> as Natural, other positions in the <em>Position</em> column as Accomplished, and neighbouring positions as Competent or Unconvincing (marked "estimated").');
  for (const w of result.warnings) items.push(esc(w));
  return `
<section id="data">
  <h2>5. About your data</h2>
  <ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>
</section>`;
}

/**
 * @param {object} result  from analyse()
 * @param {{generatedAt?: Date, stageNote?: boolean}} [opts]
 */
export function renderReport(result, opts = {}) {
  const when = (opts.generatedAt || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const club = result.club ? `${esc(result.club)}: ` : '';
  return `<article class="report">
<header>
  <div class="eyebrow">FM27 Tactic Builder</div>
  <h1>${club}suggested tactic</h1>
  <p class="meta">From ${esc(result.filename)} · ${result.players.length} players · made ${esc(when)}</p>
</header>
<aside class="notice"><strong>This tool can't put the tactic into FM27 for you.</strong> It only reads your export file and never touches the
game or your save. Enter the settings by hand, in the order shown in section 2.</aside>
${overview(result)}
${setup(result)}
${why(result)}
${suitability(result)}
${dataNotes(result)}
${opts.stageNote ? `<div class="next"><strong>Coming in the next version:</strong> team instructions (mentality, pressing, defensive line, passing and the rest, in FM27's screen order, with reasons), player instructions, a depth chart with second choices and weak areas, set-piece takers, captain, training focus and 2–3 alternative tactics.</div>` : ''}
</article>`;
}

/** A complete, self-contained HTML document (for "Save report"). */
export function standaloneReport(result, opts = {}) {
  const title = `${result.club ? result.club + ' – ' : ''}FM27 tactic`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><style>body{margin:0;background:#fff}${REPORT_CSS}</style></head>
<body>${renderReport(result, opts)}</body></html>
`;
}
