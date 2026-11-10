// Builds the HTML report from an analyse() result. Section 2 follows the order of FM27's tactics screens.

import { pitchSVG } from './pitch.js';
import { REPORT_CSS } from './report-css.js';
import { esc, scoreClass, fmt, shortName } from './util.js';
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
const slotLabel = (slots, code) => slots[code][3];

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

function pitches(system, slots, small = false) {
  const ipItems = system.lanes.map((l) => ({ slot: l.ip, abbr: l.ipRole.abbr, roleName: l.ipRole.name, name: l.player.name, score: l.ipScore.score }));
  const oopItems = system.lanes.map((l) => ({ slot: l.oop, abbr: l.oopRole.abbr, roleName: l.oopRole.name, name: l.player.name, score: l.oopScore.score }));
  return `<div class="pitches${small ? ' small' : ''}">
    <figure><figcaption class="phase-ip">In possession <span>· ${esc(system.ipName)}</span></figcaption>${pitchSVG(ipItems, slots, 'In possession shape')}</figure>
    <figure><figcaption class="phase-oop">Out of possession <span>· ${esc(system.oopName)}</span></figcaption>${pitchSVG(oopItems, slots, 'Out of possession shape')}</figure>
  </div>`;
}

// ---------------------------------------------------------------- 1. overview

function overview(result) {
  const { best, instructions: ins, ctx } = result;
  return `
<section id="overview">
  <h2>1. The tactic at a glance</h2>
  <div class="kpis">
    <div class="kpi"><div class="k">Style to start from</div><div class="v">${esc(ins.style.value || 'Any (custom)')}</div></div>
    <div class="kpi"><div class="k">Mentality</div><div class="v">${esc(ins.mentality.value)}</div></div>
    <div class="kpi"><div class="k">In possession</div><div class="v">${esc(best.ipName)}</div></div>
    <div class="kpi"><div class="k">Out of possession</div><div class="v">${esc(best.oopName)}</div></div>
    <div class="kpi"><div class="k">Pressing</div><div class="v">${esc(ins.values.lineOfEngagement)}</div></div>
    <div class="kpi"><div class="k">Team fit (0–100)</div><div class="v">${fmt(best.fit, 1)}</div></div>
  </div>
  ${pitches(best, ctx.slots)}
  <p class="legend">Each circle shows the role's FM27 abbreviation, the player's surname and his fit score for that role (0–100; ring colour:
  <span class="score s-top">75+</span> excellent, <span class="score s-good">65+</span> good, <span class="score s-ok">55+</span> usable, <span class="score s-low">&lt;55</span> weak).</p>
</section>`;
}

// ---------------------------------------------------------------- 2. enter it in FM27

function settingsTable(items) {
  const rows = items
    .map(
      (i) => `<tr class="${i.changed ? 'changed' : 'unchanged'}">
  <td><strong>${esc(i.name)}</strong>${i.verified === false ? ' <span class="tag">check label in-game</span>' : ''}</td>
  <td class="setting">${i.changed ? `<strong>${esc(i.value)}</strong>` : esc(i.value)}${i.changed ? '' : ' <span class="muted small">(default)</span>'}</td>
  <td class="why">${esc(i.reason)}${i.note ? ` <span class="muted">${esc(i.note)}</span>` : ''}</td>
</tr>`,
    )
    .join('\n');
  return `<div class="tablewrap"><table class="settings"><thead><tr><th>Setting</th><th>Set to</th><th>Why</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/** Which way a corner from this side curls, given the taker's stronger foot. */
function swing(side, taker) {
  if (!taker) return '';
  const base = 'Best corner delivery in the starting XI';
  if (taker.foot === 'right-footed') return `${base}; with his right foot it swings ${side === 'left' ? 'in towards goal (inswinger)' : 'away from goal (outswinger)'}.`;
  if (taker.foot === 'left-footed') return `${base}; with his left foot it swings ${side === 'right' ? 'in towards goal (inswinger)' : 'away from goal (outswinger)'}.`;
  return `${base}.`;
}

function enterIt(result) {
  const { best, instructions: ins, ctx, setPieces: sp, captain } = result;
  const slots = ctx.slots;
  const lanes = best.lanes.slice().sort(bySlotOrder(slots, 'ip'));
  const roleRows = lanes
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
  const sections = ['Overview', 'Final Third', 'Progression', 'Build-Up'];
  const ipTables = sections
    .map((sec) => `<h4>In Possession › ${esc(sec)}</h4>${settingsTable(ins.ip.filter((i) => i.section === sec))}`)
    .join('\n');
  const piRows = result.playerInstructions
    .filter((x) => x.items.length)
    .sort((a, b) => bySlotOrder(slots, 'ip')(a.lane, b.lane))
    .map(
      (x) => `<tr><td><strong>${esc(x.player.name)}</strong><div class="small muted">${esc(x.lane.ipRole.name)} / ${esc(x.lane.oopRole.name)}</div></td>
<td>${x.items.map((i) => `<div><span class="${i.phase === 'IP' ? 'phase-ip' : 'phase-oop'}">${esc(i.phase)}</span> ${esc(i.name)}: <strong>${esc(i.value)}</strong></div>`).join('')}</td>
<td>${x.items.map((i) => `<div>${esc(i.reason)}</div>`).join('')}</td></tr>`,
    )
    .join('\n');
  const who = (t) => (t ? `<strong>${esc(t.name)}</strong>${t.foot ? ` <span class="muted small">(${esc(t.foot)})</span>` : ''}` : '–');
  const changedCount = [...ins.ip, ...ins.oop].filter((i) => i.changed).length;
  return `
<section id="setup">
  <h2>2. Enter it in FM27</h2>
  <p>Work through these steps in order; they follow the FM27 tactics screens. ${changedCount} of the ${ins.ip.length + ins.oop.length} team
  instructions differ from FM's defaults (shown in <strong>bold</strong>); leave the rest as they are.</p>

  <h3>Step 1 · Style and mentality</h3>
  <div class="tablewrap"><table class="settings"><tbody>
    <tr class="changed"><td><strong>Style</strong></td><td class="setting"><strong>${esc(ins.style.value || 'Any')}</strong></td><td class="why">${esc(ins.style.reason)}</td></tr>
    <tr class="changed"><td><strong>Mentality</strong></td><td class="setting"><strong>${esc(ins.mentality.value)}</strong></td><td class="why">${esc(ins.mentality.reason)}</td></tr>
  </tbody></table></div>

  <h3>Step 2 · Formations, players and roles</h3>
  <ol class="steps">
    <li>Switch the pitch to <strong>In Possession</strong> and choose <strong>${esc(best.ipName)}</strong> (or drag players until it matches the left-hand pitch above).</li>
    <li>Put each player in his <em>IP spot</em> below with his <span class="phase-ip">in-possession role</span>.</li>
    <li>Switch to <strong>Out of Possession</strong>, choose <strong>${esc(best.oopName)}</strong> and set each player's <em>OOP spot</em> and <span class="phase-oop">out-of-possession role</span>.</li>
    <li>FM27 roles have no duties, so there is nothing else to pick per player.</li>
  </ol>
  <div class="tablewrap"><table>
    <thead><tr><th>Player</th><th>IP spot</th><th>In possession role</th><th class="num">Fit</th><th>OOP spot</th><th>Out of possession role</th><th class="num">Fit</th><th>Notes</th></tr></thead>
    <tbody>${roleRows}</tbody>
  </table></div>

  <h3>Step 3 · Team Instructions › In Possession</h3>
  ${ipTables}

  <h3>Step 4 · Team Instructions › Out of Possession</h3>
  ${settingsTable(ins.oop)}
  <p class="legend">Setting names follow FM27 as closely as public sources allow. If a label in your game is worded slightly differently,
  pick the option with the same meaning.</p>

  <h3>Step 5 · Player instructions</h3>
  ${piRows ? `<div class="tablewrap"><table><thead><tr><th>Player</th><th>Instruction</th><th>Why</th></tr></thead><tbody>${piRows}</tbody></table></div>` : '<p>None needed: the roles already cover what these players do.</p>'}
  <p class="legend">Only where a player's attributes or traits clearly call for it. Player instruction names are the least certain labels in
  FM27: if one isn't offered for that role, skip it.</p>

  <h3>Step 6 · Set pieces and captain</h3>
  <div class="tablewrap"><table class="settings"><tbody>
    <tr><td><strong>Captain</strong></td><td>${who(captain.captain)}</td><td class="why">${esc(captain.captain?.why || '')}</td></tr>
    <tr><td><strong>Vice-captain</strong></td><td>${who(captain.vice)}</td><td class="why">${esc(captain.vice?.why || '')}</td></tr>
    <tr><td><strong>Corners (left)</strong></td><td>${who(sp.cornersLeft)}</td><td class="why">${esc(swing('left', sp.cornersLeft))}</td></tr>
    <tr><td><strong>Corners (right)</strong></td><td>${who(sp.cornersRight)}</td><td class="why">${esc(swing('right', sp.cornersRight))}</td></tr>
    <tr><td><strong>Free kicks (shots)</strong></td><td>${who(sp.directFreeKicks)}</td><td class="why">Free Kick Taking, Technique and Long Shots.</td></tr>
    <tr><td><strong>Free kicks (crosses)</strong></td><td>${who(sp.indirectFreeKicks)}</td><td class="why">Free Kick Taking and Crossing.</td></tr>
    <tr><td><strong>Penalties (in order)</strong></td><td colspan="2">${sp.penalties.map((p, i) => `${i + 1}. ${esc(p?.name || '')}`).join(' &nbsp; ')}</td></tr>
    <tr><td><strong>Long throws</strong></td><td colspan="2">${sp.longThrows ? who(sp.longThrows) : 'Nobody has a long throw worth using.'}</td></tr>
    <tr><td><strong>Attack the ball</strong></td><td colspan="2">${sp.aerialTargets.slice(0, 3).map((t) => `${esc(t.name)}${t.height ? ` <span class="muted small">(${t.height} cm)</span>` : ''}`).join(', ')}</td></tr>
    <tr><td><strong>Stay back</strong></td><td colspan="2">${sp.stayBack.map((t) => esc(t?.name || '')).join(', ')} <span class="muted small">(quickest defenders who aren't aerial targets, to stop counter-attacks)</span></td></tr>
  </tbody></table></div>
</section>`;
}

// ---------------------------------------------------------------- 3. why

function why(result) {
  const { search, best, profile, ctx } = result;
  const { ranking, tested } = search;
  const balanceNotes = best.balance.notes.filter((n) => !n.plan);
  const planNotes = best.balance.notes.filter((n) => n.plan);
  const noteList = (list) =>
    list.length
      ? `<ul class="notes">${list.map((n) => `<li class="${n.points >= 0 ? 'plus' : 'minus'}">${esc(n.text)} <span class="muted small">(${n.points > 0 ? '+' : ''}${fmt(n.points, 1)})</span></li>`).join('')}</ul>`
      : '<p class="muted">Nothing to note.</p>';
  const top = ranking.slice(0, ctx.search.topSystems);
  const rows = top
    .map(
      (r, i) => `<tr${i === 0 ? ' style="font-weight:700"' : ''}><td>${i + 1}</td><td>${esc(r.ipName)}</td><td>${esc(r.oopName)}</td>
  <td class="num">${fmt(r.fit, 1)}</td><td class="num">${r.balance.points >= 0 ? '+' : ''}${fmt(r.balance.points, 1)}</td>
  <td class="num">${r.complexity >= 0.05 ? '−' : ''}${fmt(r.complexity, 1)}</td><td class="num">${fmt(r.score, 1)}</td></tr>`,
    )
    .join('');
  const runnerUp = top[1];
  const gap = runnerUp ? best.score - runnerUp.score : 0;
  const metricRows = Object.values(profile.metrics)
    .filter((m) => m.value != null)
    .map((m) => {
      const cls = m.delta >= 1 ? 'up' : m.delta <= -1 ? 'down' : '';
      return `<tr><td>${esc(m.label)}</td><td class="small muted">${esc(m.players.map(shortName).join(', '))}</td><td class="num">${fmt(m.value, 1)}</td><td class="num delta ${cls}">${m.delta >= 0 ? '+' : ''}${fmt(m.delta, 1)}</td></tr>`;
    })
    .join('');
  return `
<section id="why">
  <h2>3. Why this tactic</h2>
  <p>The tool tested <strong>${tested}</strong> combinations of in-possession and out-of-possession formations. For each one it chose the best
  eleven with the Hungarian algorithm (an exact method: no other line-up of your players fits that system better), then picked each player's
  two roles for fit, team balance and the game plan below.</p>
  ${runnerUp && gap < 1 ? `<p>The top systems are close (${fmt(gap, 1)} points apart), so the runners-up below would also suit this squad.</p>` : ''}
  <h3>Game plan</h3>
  <p>Pressing: <strong>${esc(result.instructions.values.lineOfEngagement)}</strong> · Build-up: <strong>${esc(result.instructions.values.buildUpStrategy)}</strong>
  · On winning the ball: <strong>${esc(result.instructions.values.attackingTransition)}</strong>. The out-of-possession shape and roles were scored on how
  well they suit this plan:</p>
  ${noteList(planNotes)}
  <h3>Team balance</h3>
  ${noteList(balanceNotes)}
  <h3>Best systems tested</h3>
  <div class="tablewrap"><table>
    <thead><tr><th>#</th><th>In possession</th><th>Out of possession</th><th class="num">Fit</th><th class="num">Balance + plan</th><th class="num">Complexity</th><th class="num">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  <p class="legend">Fit = average of the eleven players' role scores (half in possession, half out of possession). Complexity = a small
  deduction when players move a long way between the two shapes, because FM27 makes complex tactics harder to learn.</p>
  <h3>Squad profile</h3>
  <p>Each line is the average of those attributes for the players named, compared with your team's general level of
  <strong>${fmt(profile.level, 1)}</strong> (the average of all their outfield attributes). Comparing with your own level means the advice suits
  your league, whatever its standard.</p>
  <div class="tablewrap"><table class="profile"><thead><tr><th>Area</th><th>Players</th><th class="num">Average</th><th class="num">vs level</th></tr></thead><tbody>${metricRows}</tbody></table></div>
</section>`;
}

// ---------------------------------------------------------------- 4. depth

function depth(result) {
  const { depth: dc, ctx } = result;
  const slots = ctx.slots;
  const rows = dc.lanes
    .slice()
    .sort((a, b) => bySlotOrder(slots, 'ip')(a.lane, b.lane))
    .map((d) => {
      const others = d.options
        .filter((o) => o.player !== d.secondChoice?.player)
        .slice(0, 2)
        .map((o) => `${esc(o.player.name)} ${score(o.value)}${o.injured ? ' <span class="tag warn">injured</span>' : ''}`)
        .join('<br>');
      const loan = d.loanOptions.map((o) => `${esc(o.player.name)} ${score(o.value)} <span class="muted small">on loan at ${esc(o.player.club || '?')}</span>`).join('<br>');
      return `<tr><td><strong>${esc(slotLabel(slots, d.lane.ip))}</strong><div class="small muted">${esc(d.lane.ipRole.abbr)} / ${esc(d.lane.oopRole.abbr)}</div></td>
<td>${esc(d.starter.name)} ${score(d.starterValue)}</td>
<td>${d.secondChoice ? `${esc(d.secondChoice.player.name)} ${score(d.secondChoice.value)}` : '<span class="tag warn">nobody</span>'}</td>
<td>${others || '–'}</td><td>${loan || ''}</td></tr>`;
    })
    .join('\n');
  const weak = dc.weakAreas.length
    ? `<ol>${dc.weakAreas
        .map(
          (w) => `<li><strong>${esc(slotLabel(slots, w.lane.ip))} – ${esc(w.lane.ipRole.name)} / ${esc(w.lane.oopRole.name)}:</strong> ${esc(w.reasons.join('; '))}.
<div class="small">Look for: ${w.lookFor.map((a) => `${esc(a.attr)}${a.starter != null ? ` <span class="muted">(${esc(w.lane.player.name.split(' ').pop())} ${a.starter})</span>` : ''}`).join(', ')}</div></li>`,
        )
        .join('')}</ol>`
    : '<p>No weak areas: every position has a good starter and reasonable cover.</p>';
  return `
<section id="depth">
  <h2>4. Depth chart and transfer targets</h2>
  <p>The second choice in each position is an exact "second XI" for the same system and roles (fit players only), so nobody is listed twice.
  Fit scores use the roles of the main tactic.</p>
  <div class="tablewrap"><table>
    <thead><tr><th>Position</th><th>Starter</th><th>Second choice</th><th>Also</th><th>Better than cover, out on loan</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  <h3>Weak areas worth strengthening</h3>
  ${weak}
  <p class="legend">"Look for" lists the key attributes of the two roles, weakest first for your current starter: a signing should beat him on these.</p>
</section>`;
}

// ---------------------------------------------------------------- 5. alternatives

function alternatives(result) {
  if (!result.alternatives?.length) return '';
  const slots = result.ctx.slots;
  const blocks = result.alternatives
    .map((a, i) => {
      if (a.similar) {
        return `<h3>${String.fromCharCode(65 + i)}. ${esc(a.title)}</h3><p>${esc(a.when)} Your main tactic already suits this: keep it${a.diffs.length ? `, with ${a.diffs.map((d) => `${esc(d.name)} → <strong>${esc(d.to)}</strong>`).join(', ')}` : ''}.</p>`;
      }
      const changedRoles = a.roles.filter((r) => r.changed);
      const roleList = changedRoles.length
        ? `<ul class="small">${changedRoles
            .map((r) => `<li><strong>${esc(r.lane.player.name)}</strong>: ${esc(slotLabel(slots, r.lane.ip))} <span class="phase-ip">${esc(r.lane.ipRole.name)}</span> / ${esc(slotLabel(slots, r.lane.oop))} <span class="phase-oop">${esc(r.lane.oopRole.name)}</span>${r.before ? '' : ' <span class="tag">comes in</span>'}</li>`)
            .join('')}</ul>`
        : '<p class="small">Same players and roles as the main tactic.</p>';
      const diffRows = a.diffs.map((d) => `<tr><td><strong>${esc(d.name)}</strong></td><td class="muted">${esc(d.from)}</td><td><strong>${esc(d.to)}</strong></td><td class="why">${esc(d.reason)}</td></tr>`).join('');
      return `<h3>${String.fromCharCode(65 + i)}. ${esc(a.title)}</h3>
<p>${esc(a.when)} Mentality <strong>${esc(a.instructions.mentality.value)}</strong>, ${esc(a.system.ipName)} in possession, ${esc(a.system.oopName)} out of possession (fit ${fmt(a.system.fit, 1)}).</p>
${pitches(a.system, slots, true)}
<h4>Players and roles that change</h4>${roleList}
<h4>Settings that change from the main tactic</h4>
${diffRows ? `<div class="tablewrap"><table class="settings"><thead><tr><th>Setting</th><th>Main</th><th>This tactic</th><th>Why</th></tr></thead><tbody>${diffRows}</tbody></table></div>` : '<p class="small">No team instruction changes.</p>'}`;
    })
    .join('\n');
  return `
<section id="alternatives">
  <h2>5. Alternative tactics</h2>
  <p>Save these in FM27's other tactic slots. Each one is built the same way as the main tactic, with a different aim.</p>
  ${blocks}
</section>`;
}

// ---------------------------------------------------------------- 6. training

function training(result) {
  const t = result.training;
  const team = t.team.map((x) => `<li><strong>${esc(x.session)}</strong> – ${esc(x.why)}</li>`).join('');
  const prep = t.prep.map((x) => `<li><strong>${esc(x.session)}</strong> – ${esc(x.why)}</li>`).join('');
  const ind = t.individual
    .filter((x) => x.weakest.length)
    .map(
      (x) => `<tr><td><strong>${esc(x.player.name)}</strong>${x.player.age != null ? ` <span class="muted small">${x.player.age}</span>` : ''}</td><td class="small">${esc(x.role)}</td>
<td>${x.weakest.map((w) => `${esc(w.attr)} <span class="muted">(${fmt(w.value)})</span>`).join(', ')}</td><td class="small muted">${esc(x.note)}</td></tr>`,
    )
    .join('');
  return `
<section id="training">
  <h2>6. Training focus</h2>
  <h3>Tactical Understanding sessions</h3>
  <p class="small">These teach the tactic, so FM27's Tactical Effectiveness rises faster. Put them in the weekly schedule.</p>
  <ul>${team}</ul>
  <h3>Match preparation</h3>
  <ul>${prep}</ul>
  ${t.physical ? `<p><strong>Physical:</strong> ${esc(t.physical)}</p>` : ''}
  <h3>Individual focus for the starting XI</h3>
  <p class="small">The weakest key attributes for each player's two roles. FM27 renamed some individual training focuses, so pick the one that trains that attribute.</p>
  ${ind ? `<div class="tablewrap"><table><thead><tr><th>Player</th><th>Roles</th><th>Work on</th><th></th></tr></thead><tbody>${ind}</tbody></table></div>` : '<p>No clear weak spots in the starters\' key attributes.</p>'}
</section>`;
}

// ---------------------------------------------------------------- 7. suitability

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
  const xiIds = new Set(result.best.lanes.map((l) => l.player.id));
  const fmRoleName = (abbr) => roles.find((r) => r.phase === 'IP' && r.abbr === abbr)?.name;
  const ordered = players.slice().sort((a, b) => Number(a.onLoan) - Number(b.onLoan));

  const bestRows = ordered
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
      if (p.onLoan) flags.push(`<span class="tag warn">On loan${p.club ? ' at ' + esc(p.club) : ''}</span>`);
      if (p.injured) flags.push(`<span class="tag warn">Injured${p.injury ? ': ' + esc(p.injury) : ''}</span>`);
      if (p.uncertainAttrs.length) flags.push(`<span class="tag warn">${p.uncertainAttrs.length} attributes are scouting ranges</span>`);
      if (p.unknownAttrs.length > 3) flags.push(`<span class="tag warn">${p.unknownAttrs.length} attributes unknown</span>`);
      const fm = p.fmBestRole ? `${esc(fmRoleName(p.fmBestRole) || p.fmBestRole)} <span class="muted small">(${esc(p.fmBestRole)})</span>` : '–';
      return `<tr${p.onLoan ? ' class="muted"' : ''}><td><strong>${esc(p.name)}</strong><div class="small muted">${esc(p.positionsText)}${p.age != null ? ' · ' + fmt(p.age) : ''}</div></td>
<td>${top('IP')}</td><td>${top('OOP')}</td><td>${fm}</td><td>${flags.join(' ')}</td></tr>`;
    })
    .join('\n');

  const matrices = GROUPS.map((g) => {
    const groupRoles = roles.filter((r) => r.positions.some((pos) => g.positions.includes(pos)));
    const ipRoles = groupRoles.filter((r) => r.phase === 'IP');
    const oopRoles = groupRoles.filter((r) => r.phase === 'OOP');
    const members = ordered.filter((p) => g.positions.some((pos) => p.positions.has(pos)));
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
        const tag = p.onLoan ? ' <span class="tag">loan</span>' : p.injured ? ' <span class="tag warn">inj</span>' : '';
        return `<tr><td>${esc(p.name)}${tag}</td>${cells.join('')}</tr>`;
      })
      .join('');
    const legend = [...ipRoles, ...oopRoles].map((r) => `<strong>${esc(r.abbr)}</strong> ${esc(r.name)}`).join(' · ');
    return `<h3>${esc(g.title)}</h3>
<div class="tablewrap"><table class="matrix"><thead><tr><th>Player</th>${head}</tr></thead><tbody>${body}</tbody></table></div>
<p class="legend"><span class="phase-ip">Blue = in possession</span>, <span class="phase-oop">red = out of possession</span>. ${legend}</p>`;
  }).join('\n');

  return `
<section id="suitability">
  <h2>7. Role suitability for the whole squad</h2>
  <p>Every player scored for every FM27 role. A score weighs the role's key attributes three times and its preferred attributes 1.5 times
  (the same attributes FM27 highlights for that role), adds the attributes the match engine rewards in every role (pace, acceleration,
  anticipation, decisions…), then adjusts for position familiarity and, on the wings, for the stronger foot.</p>
  <h3>Best roles per player</h3>
  <div class="tablewrap"><table>
    <thead><tr><th>Player</th><th>Best in possession</th><th>Best out of possession</th><th>FM's best role</th><th>Notes</th></tr></thead>
    <tbody>${bestRows}</tbody>
  </table></div>
  <p class="legend">"FM's best role" is the assistant manager's opinion from your export, for comparison.</p>
  ${matrices}
</section>`;
}

// ---------------------------------------------------------------- 8. data

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
  if (columns.missingRecommended.length) items.push(`Missing columns that would improve the report:${menuList(columns.missingRecommended)}`);
  const loaned = players.filter((p) => p.onLoan);
  if (loaned.length) {
    items.push(`${loaned.length} player(s) are out on loan, so they were left out of the tactic and the depth chart (they appear in the suitability tables, marked "loan"): ${loaned.map((p) => `${esc(p.name)}${p.club ? ` (${esc(p.club)})` : ''}`).join(', ')}.`);
  }
  const ranged = players.filter((p) => p.uncertainAttrs.length);
  if (ranged.length) {
    items.push(`${ranged.length} player(s) have attributes shown as scouting ranges (e.g. "11-14"). The tool uses the middle of the range and shows the possible spread as ±: ${ranged.map((p) => esc(p.name)).join(', ')}.`);
  }
  const unknown = players.filter((p) => p.unknownAttrs.length > 3);
  if (unknown.length) items.push(`Some attributes are unknown ("-") for: ${unknown.map((p) => esc(p.name)).join(', ')}. Their scores use only the known attributes.`);
  const injured = players.filter((p) => p.injured && !p.onLoan);
  if (injured.length) {
    const left = result.ctx.search.excludeInjured;
    items.push(`${left ? 'Left out of the starting XI because injured' : 'Injured (still considered for the XI)'}: ${injured.map((p) => `${esc(p.name)}${p.injury ? ` (${esc(p.injury)})` : ''}`).join(', ')}.`);
  }
  items.push(`Team strength used for mentality and pressing: <strong>${esc(result.instructions.strengthLabel)}</strong> (your answer in the app).`);
  items.push('Position familiarity: FM27 only shows it as coloured dots, which no export contains. The tool treats <em>Best Pos</em> as Natural, other positions in the <em>Position</em> column as Accomplished, and neighbouring positions as Competent or Unconvincing (marked "estimated").');
  for (const w of result.warnings) items.push(esc(w));
  return `
<section id="data">
  <h2>8. About your data</h2>
  <ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>
</section>`;
}

/**
 * @param {object} result  from analyse()
 * @param {{generatedAt?: Date}} [opts]
 */
export function renderReport(result, opts = {}) {
  const when = (opts.generatedAt || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const club = result.club ? `${esc(result.club)}: ` : '';
  return `<article class="report">
<header>
  <div class="eyebrow">FM27 Tactic Builder</div>
  <h1>${club}your tactic</h1>
  <p class="meta">From ${esc(result.filename)} · ${result.players.length} players · team strength: ${esc(result.instructions.strengthLabel)} · made ${esc(when)}</p>
</header>
<aside class="notice"><strong>This tool can't put the tactic into FM27 for you.</strong> It only reads your export file and never touches the
game or your save. Enter the settings by hand, in the order shown in section 2.</aside>
<nav class="toc"><a href="#overview">At a glance</a> · <a href="#setup">Enter it in FM27</a> · <a href="#why">Why</a> · <a href="#depth">Depth</a> ·
<a href="#alternatives">Alternatives</a> · <a href="#training">Training</a> · <a href="#suitability">Role suitability</a> · <a href="#data">Your data</a></nav>
${overview(result)}
${enterIt(result)}
${why(result)}
${depth(result)}
${alternatives(result)}
${training(result)}
${suitability(result)}
${dataNotes(result)}
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
