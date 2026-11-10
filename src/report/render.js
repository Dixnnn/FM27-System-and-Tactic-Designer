// Builds the HTML report from an analyse() result. Section 2 follows the order of FM27's tactics screens.

import { pitchSVG, movementSVG, hasMovement } from './pitch.js';
import { REPORT_CSS } from './report-css.js';
import { THEME_CSS } from './theme.js';
import { esc, fmt, shortName, fitChip, phaseKey, pickTags, ICON, scoreClass as scoreClassOf } from './util.js';
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

const PROFILE_GROUPS = [
  ['Physical and work rate', ['pace', 'stamina', 'workRate', 'pressing', 'aggression']],
  ['On the ball', ['passing', 'technique', 'composure', 'buildUp', 'creativity', 'dribbling', 'crossing', 'longShots']],
  ['Defending', ['cbPace', 'cbAerial', 'cbReading', 'tackling', 'wideDefending', 'centralDefending']],
  ['Attacking', ['fwdPace', 'fwdMovement', 'finishing', 'aerialAttack']],
  ['Goalkeeper', ['gkSweeping', 'gkDistribution', 'gkAerial']],
];

const SHORT = {
  pace: 'Pace & acceleration', stamina: 'Stamina', workRate: 'Work rate & teamwork', pressing: 'Pressing', aggression: 'Aggression & bravery',
  passing: 'Passing & vision', technique: 'Technique & first touch', composure: 'Composure & decisions', buildUp: 'Playing out from the back',
  creativity: 'Midfield creativity', dribbling: 'Dribbling & flair', crossing: 'Crossing', longShots: 'Long shots',
  cbPace: 'Centre-backs: pace', cbAerial: 'Centre-backs: in the air', cbReading: 'Centre-backs: reading the game', tackling: 'Tackling & marking',
  wideDefending: 'Wide defending', centralDefending: 'Central defending', fwdPace: 'Front line: pace', fwdMovement: 'Front line: movement',
  finishing: 'Finishing', aerialAttack: 'Strikers: in the air', gkSweeping: 'Keeper: sweeping', gkDistribution: 'Keeper: distribution', gkAerial: 'Keeper: in the air',
};

const slotLabel = (slots, code) => slots[code][3];
const signed = (n, d = 1) => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n), d)}`;

function bySlotOrder(slots, key) {
  return (a, b) => {
    const [ax, ay] = slots[a[key]];
    const [bx, by] = slots[b[key]];
    return ay - by || ax - bx;
  };
}

const role = (phase, r) => `<span class="role">${phaseKey(phase)}${esc(r.name)} <span class="ab">${esc(r.abbr)}</span></span>`;

function laneNotes(lane) {
  const notes = [];
  for (const [phase, s, slot] of [['IP', lane.ipScore, lane.ip], ['OOP', lane.oopScore, lane.oop]]) {
    if (s.familiarity !== 'Natural') {
      const est = s.familiarity === 'Accomplished' ? '' : ' (estimated)';
      notes.push(`<span class="tag${s.familiarity === 'Accomplished' ? '' : ' warn'}">${phase}: ${esc(s.familiarity)} at ${esc(slot)}${est}</span>`);
    }
    if (s.footFactor < 0.96) notes.push(`<span class="tag warn">${phase}: weaker foot for this side</span>`);
    if (s.hi - s.lo >= 6) notes.push(`<span class="tag warn">${phase}: ±${fmt((s.hi - s.lo) / 2)} (scouting ranges)</span>`);
    if (s.missingShare > 0.35) notes.push(`<span class="tag warn">${phase}: key attributes unknown</span>`);
  }
  if (lane.player.condition != null && lane.player.condition < 85) notes.push(`<span class="tag warn">Condition ${fmt(lane.player.condition)}%</span>`);
  return [...new Set(notes)].join(' ');
}

function fitLegend() {
  return `<div class="legend">
  <span>Arc and meter = fit for the role (0–100): the fuller and brighter, the better</span>
  <span><i class="swatch" style="background:var(--fit-1)"></i>under 55</span>
  <span><i class="swatch" style="background:var(--fit-2)"></i>55–64</span>
  <span><i class="swatch" style="background:var(--fit-3)"></i>65–74</span>
  <span><i class="swatch" style="background:var(--fit-4)"></i>75+</span>
  <span><span class="cpt-key">C</span>captain</span>
</div>`;
}

const FIT_WORD = (score) => (score >= 75 ? 'excellent' : score >= 65 ? 'good' : score >= 55 ? 'usable' : 'weak');

const KPI_ICON = {
  style: '<path d="M3 14V2.5M3 3h8.5l-1.8 2.8L11.5 8.5H3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>',
  mentality: '<path d="M2.5 11.5a5.5 5.5 0 0 1 11 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="m8 11.5 2.6-3.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  press: '<path d="M8 13.5V3m-4 4 4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  build: '<path d="M3 13h10M5 13V9m3 4V6m3 7V3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  transition: '<path d="M2.5 8h9m-3-3.5L12 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  fit: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2" fill="currentColor"/>',
};
const kpiIcon = (name) => `<svg class="ki" viewBox="0 0 16 16" aria-hidden="true">${KPI_ICON[name]}</svg>`;
const kpi = (icon, label, value, extra = '') => `<div class="kpi"><div class="k">${icon}${label}</div><div class="v">${value}</div>${extra}</div>`;

function pitches(system, slots, small = false, captain = null) {
  const mark = (p) => p.label || (p.mustStart ? 'start' : null);
  const isCaptain = (p) => !!captain && p === captain;
  const ipItems = system.lanes.map((l) => ({ slot: l.ip, abbr: l.ipRole.abbr, roleName: l.ipRole.name, name: l.player.name, score: l.ipScore.score, mark: mark(l.player), captain: isCaptain(l.player) }));
  const oopItems = system.lanes.map((l) => ({ slot: l.oop, abbr: l.oopRole.abbr, roleName: l.oopRole.name, name: l.player.name, score: l.oopScore.score, mark: mark(l.player), captain: isCaptain(l.player) }));
  const move = hasMovement(system.lanes)
    ? `<figure><figcaption><span class="key ip"></span>Movement between phases</figcaption>${movementSVG(system.lanes, slots, 'How players move between the two shapes')}
<div class="legend"><span><span class="key ring"></span>out of possession</span><span><span class="key ip"></span>in possession</span></div></figure>`
    : '';
  return `<div class="pitches${small ? ' small' : ''}${move ? ' three' : ''}">
    <figure><figcaption>${phaseKey('IP')}In possession <span class="sub">· ${esc(system.ipName)}</span></figcaption>${pitchSVG(ipItems, slots, 'In possession shape')}</figure>
    <figure><figcaption>${phaseKey('OOP')}Out of possession <span class="sub">· ${esc(system.oopName)}</span></figcaption>${pitchSVG(oopItems, slots, 'Out of possession shape')}</figure>
    ${move}
  </div>`;
}

// ---------------------------------------------------------------- 1. overview

function overview(result) {
  const { best, instructions: ins, ctx } = result;
  return `
<section id="overview" class="card">
  <h2><span class="num">1</span>The tactic at a glance</h2>
  <div class="kpis">
    ${kpi(kpiIcon('style'), 'Style to start from', esc(ins.style.value || 'Any (custom)'))}
    ${kpi(kpiIcon('mentality'), 'Mentality', esc(ins.mentality.value))}
    ${kpi(phaseKey('IP'), 'In possession', esc(best.ipName))}
    ${kpi(phaseKey('OOP'), 'Out of possession', esc(best.oopName))}
    ${kpi(kpiIcon('press'), 'Pressing', esc(ins.values.lineOfEngagement))}
    ${kpi(kpiIcon('fit'), 'Team fit', `${fmt(best.fit, 1)} <span class="muted small">/ 100 · ${FIT_WORD(best.fit)}</span>`, `<div class="meter ${scoreClassOf(best.fit)}"><i style="width:${Math.max(0, Math.min(100, best.fit)).toFixed(0)}%"></i></div>`)}
  </div>
  ${pitches(best, ctx.slots, false, result.captain?.captain?.player)}
  ${fitLegend()}
  ${picksBlock(result)}
</section>`;
}

function picksBlock(result) {
  const summary = result.picks?.summary || [];
  if (!summary.length) {
    return `<p class="hint-line">${ICON.info}<span>Want the tactic built around particular players? Use <strong>Choose players</strong> in the app to mark players who must start, a marquee player or future stars.</span></p>`;
  }
  const slots = result.ctx.slots;
  const rows = summary
    .map(({ player: p, lane, best, inBestRole }) => {
      const plays = lane
        ? `${esc(slotLabel(slots, lane.ip))} · ${role('IP', lane.ipRole)}<br>${esc(slotLabel(slots, lane.oop))} · ${role('OOP', lane.oopRole)}`
        : '<span class="muted">Not in the starting XI: see his development plan in section 6.</span>';
      const bestTxt = [best.ip && `${esc(best.ip.role.name)} ${fmt(best.ip.score)}`, best.oop && `${esc(best.oop.role.name)} ${fmt(best.oop.score)}`].filter(Boolean).join('<br>');
      return `<tr><td><strong>${esc(p.name)}</strong><div class="sub">${esc(p.positionsText)}${p.age != null ? ' · ' + fmt(p.age) : ''}${p.injured ? ' · injured' : ''}</div></td>
<td>${pickTags(p)}</td><td>${plays}</td><td class="num">${lane ? fitChip(lane.value) : ''}</td>
<td class="small">${bestTxt}${lane && inBestRole ? `<div class="muted">${ICON.check} playing his best role</div>` : ''}</td></tr>`;
    })
    .join('');
  const fc = result.freeChoice;
  let cost = '';
  if (fc) {
    const names = (ps) => ps.map((p) => esc(p.name)).join(', ');
    cost =
      fc.fitCost <= 0.2
        ? `Fitting your picks costs nothing: left to choose freely, the tool would field an equally strong team (fit ${fmt(fc.system.fit, 1)}).`
        : `Fitting your picks costs <strong>${fmt(fc.fitCost, 1)}</strong> team-fit points. Left to choose freely, the tool would play <strong>${esc(fc.system.ipName)} / ${esc(fc.system.oopName)}</strong> (fit ${fmt(fc.system.fit, 1)})${fc.benched.length ? ` with ${names(fc.benched)} instead of ${names(fc.added)}` : ''}.`;
  }
  const groups = new Map();
  for (const b of result.instructions.builtAround || []) {
    const key = `${b.id}|${b.value}`;
    if (!groups.has(key)) groups.set(key, { ...b, players: new Set() });
    groups.get(key).players.add(b.player.name.split(/\s+/).pop());
  }
  const allItems = [...result.instructions.ip, ...result.instructions.oop];
  const tweaks = [...groups.values()]
    .map((g) => `<li><span class="pts">${ICON.check}</span><span><strong>${esc(allItems.find((i) => i.id === g.id)?.name || g.id)}: ${esc(g.value)}</strong> <span class="muted">– for ${esc([...g.players].join(' and '))}</span></span></li>`)
    .join('');
  return `<h3>Built around your picks</h3>
<p class="lede small">Players marked <strong>must start</strong> and <strong>marquee</strong> are always in the XI; a marquee player's fit counts
2.5 times when systems and roles are compared, so the shape is chosen around him. <strong>Future stars</strong> win close calls for a place and get a
development plan (section 6).</p>
<div class="tablewrap"><table><thead><tr><th>Player</th><th>Your pick</th><th>Plays as</th><th class="num">Fit</th><th>His best roles anywhere</th></tr></thead><tbody>${rows}</tbody></table></div>
${cost ? `<div class="picks-cost">${ICON.info}<span>${cost}</span></div>` : ''}
${tweaks ? `<h4>Team instructions shaped by your marquee players</h4><ul class="notes">${tweaks}</ul>` : ''}
<div class="legend"><span><svg class="ico" viewBox="0 0 16 16"><path d="M8 1.4l1.9 4.1 4.5.5-3.3 3.1.9 4.4L8 11.3l-3.9 2.2.9-4.4L1.6 6l4.5-.5z" fill="currentColor"/></svg>marquee</span>
<span><svg class="ico" viewBox="0 0 16 16"><path d="M8 1.4l1.9 4.1 4.5.5-3.3 3.1.9 4.4L8 11.3l-3.9 2.2.9-4.4L1.6 6l4.5-.5z" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>future star</span>
<span><span class="key" style="background:var(--ink-2)"></span>must start</span><span>(markers on the pitches)</span></div>`;
}

// ---------------------------------------------------------------- 2. enter it in FM27

function scale(item) {
  if (!item.scale) return '';
  return `<span class="scale" aria-hidden="true">${item.options.map((o) => `<i class="${o === item.value ? 'on' : ''}" title="${esc(o)}"></i>`).join('')}</span>`;
}

function settingsTable(items) {
  const rows = items
    .map(
      (i) => `<tr class="${i.changed ? 'changed' : 'unchanged'}">
  <td class="name">${esc(i.name)}${i.verified === false ? ' <span class="tag">check label in-game</span>' : ''}</td>
  <td class="val"><span class="v">${esc(i.value)}</span>${i.changed ? '' : '<span class="deflabel">default</span>'}${scale(i)}</td>
  <td class="why">${esc(i.reason)}${i.note ? ` <span class="muted">${esc(i.note)}</span>` : ''}</td>
</tr>`,
    )
    .join('\n');
  return `<div class="tablewrap"><table class="settings"><thead><tr><th style="padding-left:22px">Setting</th><th>Set to</th><th>Why</th></tr></thead><tbody>${rows}</tbody></table></div>`;
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
  <td><strong>${esc(l.player.name)}</strong> ${pickTags(l.player)}<div class="sub">${esc(l.player.positionsText || [...l.player.positions].join(', '))}</div></td>
  <td>${esc(slotLabel(slots, l.ip))}</td>
  <td>${role('IP', l.ipRole)}</td>
  <td class="num">${fitChip(l.ipScore.score)}</td>
  <td>${esc(slotLabel(slots, l.oop))}</td>
  <td>${role('OOP', l.oopRole)}</td>
  <td class="num">${fitChip(l.oopScore.score)}</td>
  <td>${laneNotes(l)}</td>
</tr>`,
    )
    .join('\n');
  const sections = ['Overview', 'Final Third', 'Progression', 'Build-Up'];
  const ipTables = sections.map((sec) => `<h4>In Possession › ${esc(sec)}</h4>${settingsTable(ins.ip.filter((i) => i.section === sec))}`).join('\n');
  const piRows = result.playerInstructions
    .filter((x) => x.items.length)
    .sort((a, b) => bySlotOrder(slots, 'ip')(a.lane, b.lane))
    .map(
      (x) => `<tr><td><strong>${esc(x.player.name)}</strong><div class="sub">${esc(x.lane.ipRole.name)} / ${esc(x.lane.oopRole.name)}</div></td>
<td>${x.items.map((i) => `<div class="line">${phaseKey(i.phase)}<span>${esc(i.name)}: <strong>${esc(i.value)}</strong></span></div>`).join('')}</td>
<td class="muted">${x.items.map((i) => `<div>${esc(i.reason)}</div>`).join('')}</td></tr>`,
    )
    .join('\n');
  const who = (t) => (t ? `<strong>${esc(t.name)}</strong>${t.foot ? ` <span class="muted small">${esc(t.foot)}</span>` : ''}` : '–');
  const changedCount = [...ins.ip, ...ins.oop].filter((i) => i.changed).length;
  return `
<section id="setup" class="card">
  <h2><span class="num">2</span>Enter it in FM27</h2>
  <p class="lede">Work through these steps in order; they follow the FM27 tactics screens. <strong>${changedCount}</strong> of the
  ${ins.ip.length + ins.oop.length} team instructions differ from FM's defaults (marked with a dot); leave the rest as they are.</p>

  <h3><span class="step">1</span>Style and mentality</h3>
  <div class="tablewrap"><table class="settings"><tbody>
    <tr class="changed"><td class="name">Style</td><td class="val"><span class="v">${esc(ins.style.value || 'Any')}</span></td><td class="why">${esc(ins.style.reason)}</td></tr>
    <tr class="changed"><td class="name">Mentality</td><td class="val"><span class="v">${esc(ins.mentality.value)}</span>${mentalityScale(ins.mentality.value, ctx)}</td><td class="why">${esc(ins.mentality.reason)}</td></tr>
  </tbody></table></div>

  <h3><span class="step">2</span>Formations, players and roles</h3>
  <ol class="steps">
    <li>Switch the pitch to <strong>In Possession</strong> and choose <strong>${esc(best.ipName)}</strong> (or drag players until it matches the in-possession pitch above).</li>
    <li>Put each player in his <strong>IP spot</strong> below with his in-possession role ${phaseKey('IP')}.</li>
    <li>Switch to <strong>Out of Possession</strong>, choose <strong>${esc(best.oopName)}</strong> and set each player's <strong>OOP spot</strong> and out-of-possession role ${phaseKey('OOP')}.</li>
    <li>FM27 roles have no duties, so there is nothing else to pick per player.</li>
  </ol>
  <div class="tablewrap"><table class="roles">
    <thead><tr><th>Player</th><th>IP spot</th><th>In possession role</th><th class="num">Fit</th><th>OOP spot</th><th>Out of possession role</th><th class="num">Fit</th><th>Notes</th></tr></thead>
    <tbody>${roleRows}</tbody>
  </table></div>

  <h3><span class="step">3</span>Team Instructions › In Possession</h3>
  ${ipTables}

  <h3><span class="step">4</span>Team Instructions › Out of Possession</h3>
  ${settingsTable(ins.oop)}
  <p class="legend">The bars under a setting show where it sits on FM27's scale. Names follow FM27 as closely as public sources allow; if a label
  in your game is worded slightly differently, pick the option with the same meaning.</p>

  <h3><span class="step">5</span>Player instructions</h3>
  ${piRows ? `<div class="tablewrap"><table><thead><tr><th>Player</th><th>Instruction</th><th>Why</th></tr></thead><tbody>${piRows}</tbody></table></div>` : '<p>None needed: the roles already cover what these players do.</p>'}
  <p class="legend">Only where a player's attributes or traits clearly call for it. Player instruction names are the least certain labels in
  FM27: if one isn't offered for that role, skip it.</p>

  <h3><span class="step">6</span>Set pieces and captain</h3>
  <div class="tablewrap"><table class="settings"><tbody>
    <tr><td class="name">Captain</td><td class="val">${who(captain.captain)}</td><td class="why">${esc(captain.captain?.why || '')}</td></tr>
    <tr><td class="name">Vice-captain</td><td class="val">${who(captain.vice)}</td><td class="why">${esc(captain.vice?.why || '')}</td></tr>
    <tr><td class="name">Corners (left)</td><td class="val">${who(sp.cornersLeft)}</td><td class="why">${esc(swing('left', sp.cornersLeft))}</td></tr>
    <tr><td class="name">Corners (right)</td><td class="val">${who(sp.cornersRight)}</td><td class="why">${esc(swing('right', sp.cornersRight))}</td></tr>
    <tr><td class="name">Free kicks (shots)</td><td class="val">${who(sp.directFreeKicks)}</td><td class="why">Free Kick Taking, Technique and Long Shots.</td></tr>
    <tr><td class="name">Free kicks (crosses)</td><td class="val">${who(sp.indirectFreeKicks)}</td><td class="why">Free Kick Taking and Crossing.</td></tr>
    <tr><td class="name">Penalties (in order)</td><td colspan="2">${sp.penalties.map((p, i) => `<span class="muted">${i + 1}.</span> ${esc(p?.name || '')}`).join(' &nbsp; ')}</td></tr>
    <tr><td class="name">Long throws</td><td colspan="2">${sp.longThrows ? who(sp.longThrows) : '<span class="muted">Nobody has a long throw worth using.</span>'}</td></tr>
    <tr><td class="name">Attack the ball</td><td colspan="2">${sp.aerialTargets.slice(0, 3).map((t) => `${esc(t.name)}${t.height ? ` <span class="muted small">${t.height} cm</span>` : ''}`).join(' &nbsp;·&nbsp; ')}</td></tr>
    <tr><td class="name">Stay back</td><td colspan="2">${sp.stayBack.map((t) => esc(t?.name || '')).join(' &nbsp;·&nbsp; ')} <span class="muted small">quickest defenders who aren't aerial targets, to stop counter-attacks</span></td></tr>
  </tbody></table></div>
</section>`;
}

function mentalityScale(value, ctx) {
  const list = ctx.instructionsDoc.mentalities;
  return `<span class="scale" aria-hidden="true">${list.map((m) => `<i class="${m === value ? 'on' : ''}" title="${esc(m)}"></i>`).join('')}</span>`;
}

// ---------------------------------------------------------------- 3. why

function profileChart(profile) {
  const range = 4; // attribute points either side of the team level
  const pct = (d) => (Math.min(range, Math.abs(d)) / range) * 50;
  const row = (m) => {
    const bar = m.delta >= 0 ? `<span class="bar pos" style="width:${pct(m.delta).toFixed(1)}%"></span>` : `<span class="bar neg" style="width:${pct(m.delta).toFixed(1)}%"></span>`;
    return `<div class="pf-row" tabindex="0">
  <span class="pf-label">${esc(SHORT[m.key] || m.label)}</span>
  <span class="pf-chart"><span class="grid" style="left:25%"></span><span class="grid" style="left:75%"></span><span class="zero"></span>${bar}</span>
  <span class="pf-delta">${signed(m.delta)}</span>
  <span class="pf-avg">${fmt(m.value, 1)}</span>
  <span class="tip"><strong>${esc(m.label)}</strong><br>${fmt(m.value, 1)} average · ${signed(m.delta)} vs your team level (${fmt(profile.level, 1)})<br>
  ${esc(m.attrs.join(', '))}<br><span class="muted">${esc(m.players.join(', '))}</span></span>
</div>`;
  };
  const groups = PROFILE_GROUPS.map(([title, keys]) => {
    const rows = keys.map((k) => profile.metrics[k]).filter((m) => m && m.value != null);
    if (!rows.length) return '';
    return `<div class="pf-group"><h4>${esc(title)}</h4>
<div class="pf-axis"><span></span><span class="ticks"><span>−4</span><span>−2</span><span>level</span><span>+2</span><span>+4</span></span><span style="text-align:right">vs level</span><span style="text-align:right">avg</span></div>
${rows.map(row).join('\n')}</div>`;
  }).join('\n');
  return `<div class="profile">${groups}</div>
<div class="legend"><span><i class="swatch" style="background:var(--pos)"></i>above your team's level</span><span><i class="swatch" style="background:var(--neg)"></i>below it</span><span>Hover a row for the attributes and players behind it.</span></div>`;
}

function why(result) {
  const { search, best, profile, ctx } = result;
  const { ranking, tested } = search;
  const balanceNotes = best.balance.notes.filter((n) => !n.plan);
  const planNotes = best.balance.notes.filter((n) => n.plan);
  const noteList = (list) =>
    list.length
      ? `<ul class="notes">${list.map((n) => `<li class="${n.points >= 0 ? 'plus' : 'minus'}"><span class="pts">${n.points >= 0 ? '' : '−'}${fmt(Math.abs(n.points), 1)}</span><span>${esc(n.text)}</span></li>`).join('')}</ul>`
      : '<p class="muted">Nothing to note.</p>';
  const top = ranking.slice(0, ctx.search.topSystems);
  const withPicks = top.some((r) => r.picks > 0.05);
  const rows = top
    .map(
      (r, i) => `<tr${i === 0 ? ' style="font-weight:650"' : ''}><td>${i === 0 ? ICON.check : i + 1}</td><td>${esc(r.ipName)}</td><td>${esc(r.oopName)}</td>
  <td class="num">${fmt(r.fit, 1)}</td><td class="num">${signed(r.balance.points)}</td>${withPicks ? `<td class="num">${signed(r.picks || 0)}</td>` : ''}
  <td class="num">${r.complexity >= 0.05 ? '−' : ''}${fmt(r.complexity, 1)}</td><td class="num">${fmt(r.score, 1)}</td></tr>`,
    )
    .join('');
  const runnerUp = top[1];
  const gap = runnerUp ? best.score - runnerUp.score : 0;
  const v = result.instructions.values;
  return `
<section id="why" class="card">
  <h2><span class="num">3</span>Why this tactic</h2>
  <p class="lede">The tool tested <strong>${tested}</strong> pairs of in-possession and out-of-possession formations. For each one it chose the best
  eleven with the Hungarian algorithm (an exact method: no other line-up of your players fits that system better), then picked each player's
  two roles for fit, team balance and the game plan.${runnerUp && gap < 1 ? ` The top systems are close (${fmt(gap, 1)} points apart), so the runners-up would also suit this squad.` : ''}</p>
  <div class="kpis">
    ${kpi(kpiIcon('press'), 'Pressing', esc(v.lineOfEngagement))}
    ${kpi(kpiIcon('build'), 'Build-up', esc(v.buildUpStrategy))}
    ${kpi(kpiIcon('transition'), 'On winning the ball', esc(v.attackingTransition))}
  </div>
  <h3>How the shapes suit the game plan</h3>
  ${noteList(planNotes)}
  <h3>Team balance</h3>
  ${noteList(balanceNotes)}
  <h3>Best systems tested</h3>
  <div class="tablewrap"><table>
    <thead><tr><th></th><th>In possession</th><th>Out of possession</th><th class="num">Fit</th><th class="num">Balance + plan</th>${withPicks ? '<th class="num">Your picks</th>' : ''}<th class="num">Complexity</th><th class="num">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  <p class="legend">Fit = average of the eleven players' role scores (half in possession, half out of possession). Complexity = a small
  deduction when players move a long way between the two shapes, because FM27 makes complex tactics harder to learn.${withPicks ? ' Your picks = the extra weight given to your marquee players and future stars, which steers the choice towards systems that suit them.' : ''}</p>
  <h3>Squad profile</h3>
  <p class="lede">Each bar compares a part of your starting XI with the team's own general level of <strong>${fmt(profile.level, 1)}</strong>
  (the average of all their outfield attributes). Measuring against your own level means the advice suits your league, whatever its standard.
  The team instructions in section 2 come from these bars.</p>
  ${profileChart(profile)}
</section>`;
}

// ---------------------------------------------------------------- 4. depth

const STAR_PATH = 'M8 1.4l1.9 4.1 4.5.5-3.3 3.1.9 4.4L8 11.3l-3.9 2.2.9-4.4L1.6 6l4.5-.5z';
function star(p) {
  if (p.label === 'marquee') return ` <svg class="ico" viewBox="0 0 16 16" aria-label="marquee"><path d="${STAR_PATH}" fill="currentColor"/></svg>`;
  if (p.label === 'future') return ` <svg class="ico" viewBox="0 0 16 16" aria-label="future star"><path d="${STAR_PATH}" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>`;
  return '';
}

const INJ = '<svg class="ico" viewBox="0 0 16 16" aria-label="injured"><path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

function depth(result) {
  const { depth: dc, ctx } = result;
  const slots = ctx.slots;
  const weakSet = new Set(dc.weakAreas.map((w) => w.lane));
  const lines = [
    ['Attack', (y) => y >= 62],
    ['Midfield', (y) => y >= 30 && y < 62],
    ['Defence', (y) => y > 10 && y < 30],
    ['Goalkeeper', (y) => y <= 10],
  ];
  const card = (d) => {
    const others = d.options.filter((o) => o.player !== d.secondChoice?.player).slice(0, 2);
    const extra = [
      ...others.map((o) =>
        o.injured
          ? `<span class="chip inj" title="Injured">${INJ}${esc(o.player.name)} <b>${fmt(o.value)}</b></span>`
          : `<span class="chip">${esc(o.player.name)} <b>${fmt(o.value)}</b></span>`,
      ),
      ...d.loanOptions.map((o) => `<span class="chip loan" title="On loan at ${esc(o.player.club || '?')}">${esc(o.player.name)} <b>${fmt(o.value)}</b> <i>loan</i></span>`),
    ];
    const weak = weakSet.has(d.lane);
    return `<div class="pos-card${weak ? ' weak' : ''}">
  <div class="hd"><strong>${esc(slotLabel(slots, d.lane.ip))}</strong>
    <span class="roles"><span>${phaseKey('IP')}${esc(d.lane.ipRole.abbr)}</span><span>${phaseKey('OOP')}${esc(d.lane.oopRole.abbr)}</span></span></div>
  <div class="who">
    <span class="rk">1</span><span class="nm1">${esc(d.starter.name)}${star(d.starter)}</span>${fitChip(d.starterValue)}
    <span class="rk">2</span>${d.secondChoice ? `<span class="dim">${esc(d.secondChoice.player.name)}${star(d.secondChoice.player)}</span>${fitChip(d.secondChoice.value)}` : '<span class="dim">nobody fit</span><span></span>'}
  </div>
  ${extra.length ? `<div class="also"><span class="lbl">Also</span>${extra.join('')}</div>` : ''}
  ${weak ? `<div class="flag">${ICON.warn}Weak spot – see below</div>` : ''}
</div>`;
  };
  const board = lines
    .map(([label, test]) => {
      const ds = dc.lanes.filter((d) => test(slots[d.lane.ip][1])).sort((a, b) => slots[a.lane.ip][0] - slots[b.lane.ip][0]);
      return ds.length ? `<div><div class="line-label">${label}</div><div class="cards">${ds.map(card).join('')}</div></div>` : '';
    })
    .join('');
  const weak = dc.weakAreas.length
    ? `<ol class="weak">${dc.weakAreas
        .map(
          (w) => `<li><strong>${esc(slotLabel(slots, w.lane.ip))} · ${esc(w.lane.ipRole.name)} / ${esc(w.lane.oopRole.name)}</strong>
<div class="muted">${esc(w.reasons.join('; '))}.</div>
<div class="look"><span class="small muted">Look for:</span>${w.lookFor.map((a) => `<span class="tag">${esc(a.attr)}${a.starter != null ? ` <span class="muted">${a.starter}</span>` : ''}</span>`).join('')}</div></li>`,
        )
        .join('')}</ol>`
    : `<p>${ICON.check} No weak areas: every position has a good starter and reasonable cover.</p>`;
  return `
<section id="depth" class="card">
  <h2><span class="num">4</span>Depth chart and transfer targets</h2>
  <p class="lede">Second choices form an exact "second XI" for the same system and roles (fit players only), so nobody is listed twice.
  Fit scores use the roles of the main tactic.</p>
  <div class="board">${board}</div>
  <h3>Weak areas worth strengthening</h3>
  ${weak}
  <p class="legend">"Look for" lists the key attributes of the two roles, weakest first for your current starter (his value shown): a signing
  should beat him on these.</p>
</section>`;
}

// ---------------------------------------------------------------- 5. alternatives

function alternatives(result) {
  if (!result.alternatives?.length) return '';
  const slots = result.ctx.slots;
  const blocks = result.alternatives
    .map((a, i) => {
      const letter = String.fromCharCode(65 + i);
      if (a.similar) {
        return `<div class="alt"><h3><span class="step">${letter}</span>${esc(a.title)}</h3><p class="muted">${esc(a.when)} Your main tactic already suits this: keep it${a.diffs.length ? `, with ${a.diffs.map((d) => `${esc(d.name)} → <strong>${esc(d.to)}</strong>`).join(', ')}` : ''}.</p></div>`;
      }
      const changedRoles = a.roles.filter((r) => r.changed);
      const roleList = changedRoles.length
        ? `<div class="tablewrap"><table><thead><tr><th>Player</th><th>In possession</th><th>Out of possession</th></tr></thead><tbody>${changedRoles
            .map(
              (r) => `<tr><td><strong>${esc(r.lane.player.name)}</strong>${r.before ? '' : ' <span class="tag accent">comes in</span>'}</td>
<td>${esc(slotLabel(slots, r.lane.ip))} · ${role('IP', r.lane.ipRole)}</td><td>${esc(slotLabel(slots, r.lane.oop))} · ${role('OOP', r.lane.oopRole)}</td></tr>`,
            )
            .join('')}</tbody></table></div>`
        : '<p class="small muted">Same players and roles as the main tactic.</p>';
      const diffRows = a.diffs.map((d) => `<tr class="changed"><td class="name">${esc(d.name)}</td><td class="muted">${esc(d.from)}</td><td><span class="v">${esc(d.to)}</span></td><td class="why">${esc(d.reason)}</td></tr>`).join('');
      return `<div class="alt"><h3><span class="step">${letter}</span>${esc(a.title)}</h3>
<p class="muted">${esc(a.when)}</p>
<div class="chips"><span class="tag">Mentality: ${esc(a.instructions.mentality.value)}</span><span class="tag">${esc(a.instructions.values.lineOfEngagement)}</span>
<span class="tag">${phaseKey('IP')}${esc(a.system.ipName)}</span><span class="tag">${phaseKey('OOP')}${esc(a.system.oopName)}</span><span class="tag">Fit ${fmt(a.system.fit, 1)}</span></div>
${pitches(a.system, slots, true, result.captain?.captain?.player)}
<h4>Players and roles that change</h4>${roleList}
<h4>Settings that change from the main tactic</h4>
${diffRows ? `<div class="tablewrap"><table class="settings"><thead><tr><th style="padding-left:22px">Setting</th><th>Main</th><th>This tactic</th><th>Why</th></tr></thead><tbody>${diffRows}</tbody></table></div>` : '<p class="small muted">No team instruction changes.</p>'}</div>`;
    })
    .join('\n');
  return `
<section id="alternatives" class="card">
  <h2><span class="num">5</span>Alternative tactics</h2>
  <p class="lede">Save these in FM27's other tactic slots. Each one is built the same way as the main tactic, with a different aim.</p>
  ${blocks}
</section>`;
}

// ---------------------------------------------------------------- 6. training

/** "Young enough to improve quickly" says the same for most of a young XI: a small tag reads quicker than the sentence. */
const trainingNote = (note) => (/^Young enough/.test(note || '') ? `<span class="tag accent" title="${esc(note)}">young · improves fast</span>` : esc(note));

function training(result) {
  const t = result.training;
  const list = (xs) => `<ul class="notes">${xs.map((x) => `<li><span class="pts">${ICON.check}</span><span><strong>${esc(x.session)}</strong> <span class="muted">– ${esc(x.why)}</span></span></li>`).join('')}</ul>`;
  const ind = t.individual
    .filter((x) => x.weakest.length)
    .map(
      (x) => `<tr><td><strong>${esc(x.player.name)}</strong>${x.player.age != null ? ` <span class="muted small">${x.player.age}</span>` : ''}</td><td class="muted small">${esc(x.role)}</td>
<td>${x.weakest.map((w) => `<span class="tag">${esc(w.attr)} <span class="muted">${fmt(w.value)}</span></span>`).join(' ')}</td><td class="small muted">${trainingNote(x.note)}</td></tr>`,
    )
    .join('');
  return `
<section id="training" class="card">
  <h2><span class="num">6</span>Training focus</h2>
  <h3>Tactical Understanding sessions</h3>
  <p class="lede small">These teach the tactic, so FM27's Tactical Effectiveness rises faster. Put them in the weekly schedule.</p>
  ${list(t.team)}
  <h3>Match preparation</h3>
  ${list(t.prep)}
  ${t.physical ? `<p class="small">${ICON.info} <strong>Physical:</strong> ${esc(t.physical)}</p>` : ''}
  <h3>Individual focus for the starting XI</h3>
  <p class="lede small">The weakest trainable key attributes for each player's two roles. FM27 renamed some individual training focuses, so pick the one that trains that attribute.</p>
  ${ind ? `<div class="tablewrap"><table><thead><tr><th>Player</th><th>Roles</th><th>Work on</th><th></th></tr></thead><tbody>${ind}</tbody></table></div>` : '<p>No clear weak spots in the starters\' key attributes.</p>'}
  ${futureStars(result)}
</section>`;
}

function futureStars(result) {
  const plans = result.picks?.futureStars || [];
  if (!plans.length) return '';
  const slots = result.ctx.slots;
  const rows = plans
    .map((f) => {
      const p = f.player;
      const stars = p.ability != null || p.potential != null ? `<div class="sub">${p.ability != null ? `ability ${fmt(p.ability, 1)}` : ''}${p.ability != null && p.potential != null ? ' → ' : ''}${p.potential != null ? `potential ${fmt(p.potential, 1)} stars` : ''}</div>` : '';
      const target = f.lane ? `${esc(slotLabel(slots, f.lane.ip))} · ${role('IP', f.lane.ipRole)}<br>${esc(slotLabel(slots, f.lane.oop))} · ${role('OOP', f.lane.oopRole)}` : '<span class="muted">no natural place in this system</span>';
      const status = f.starting ? '<span class="tag accent">Starts</span>' : f.lane ? `<span class="muted">behind ${esc(f.lane.player.name)} by ${fmt(f.gap)}</span>${f.second ? '<div class="sub">next in line</div>' : ''}` : '';
      return `<tr><td><strong>${esc(p.name)}</strong>${p.age != null ? ` <span class="muted small">${p.age}</span>` : ''}${stars}</td><td>${target}</td>
<td class="num">${f.value != null ? fitChip(f.value) : ''}</td><td>${status}</td>
<td>${f.train.map((t) => `<span class="tag">${esc(t.attr)} <span class="muted">${fmt(t.value)}</span></span>`).join(' ')}</td><td class="small muted">${esc(f.minutes)}</td></tr>`;
    })
    .join('');
  return `<h3>Developing your future stars</h3>
<p class="lede small">The position and roles each future star grows into in this tactic, how close he is to starting there, the key attributes to
train for those roles, and how to give him minutes. Potential stars are FM's own estimate from your export, where included.</p>
<div class="tablewrap"><table><thead><tr><th>Player</th><th>Grows into</th><th class="num">Fit now</th><th>Status</th><th>Train</th><th>Minutes</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// ---------------------------------------------------------------- 7. suitability

function groupScore(ctx, player, r, positions) {
  let best = null;
  for (const pos of r.positions) {
    if (!positions.includes(pos)) continue;
    const s = slotRoleScore(player, r, ctx.slotForPosition[pos], ctx);
    if (!best || s.score > best.score) best = { ...s, position: pos };
  }
  return best;
}

/** Heatmap cell: one hue, from the surface (40 or less) to the brightest teal (85+), mixed in OKLab. */
function heatCell(score, isBest) {
  if (score == null) return '<td></td>';
  const t = Math.max(0, Math.min(1, (score - 40) / 45));
  const a = Math.max(0.04, Math.min(0.85, (score - 35) / 55)); // fallback for browsers without color-mix
  return `<td class="h${t > 0.62 ? ' hi' : ''}${isBest ? ' best' : ''}" style="--a:${a.toFixed(2)};--t:${(t * 100).toFixed(0)}%" title="${fmt(score)}">${fmt(score)}</td>`;
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
          .map(({ r, s }) => `<div class="line">${fitChip(s.score)} ${esc(r.name)}</div>`)
          .join('');
      const flags = [];
      if (xiIds.has(p.id)) flags.push('<span class="tag accent">Starting XI</span>');
      if (p.label || p.mustStart) flags.push(pickTags(p));
      if (p.onLoan) flags.push(`<span class="tag">On loan${p.club ? ' at ' + esc(p.club) : ''}</span>`);
      if (p.injured) flags.push(`<span class="tag warn">${ICON.warn}Injured${p.injury ? ': ' + esc(p.injury) : ''}</span>`);
      if (p.uncertainAttrs.length) flags.push(`<span class="tag warn">${p.uncertainAttrs.length} scouting ranges</span>`);
      if (p.unknownAttrs.length > 3) flags.push(`<span class="tag warn">${p.unknownAttrs.length} attributes unknown</span>`);
      const fm = p.fmBestRole ? `${esc(fmRoleName(p.fmBestRole) || p.fmBestRole)} <span class="muted small">${esc(p.fmBestRole)}</span>` : '<span class="muted">–</span>';
      return `<tr${p.onLoan ? ' class="muted"' : ''}><td><strong>${esc(p.name)}</strong><div class="sub">${esc(p.positionsText)}${p.age != null ? ' · ' + fmt(p.age) : ''}</div></td>
<td>${top('IP')}</td><td>${top('OOP')}</td><td>${fm}</td><td>${flags.join(' ')}</td></tr>`;
    })
    .join('\n');

  const matrices = GROUPS.map((g) => {
    const groupRoles = roles.filter((r) => r.positions.some((pos) => g.positions.includes(pos)));
    const ipRoles = groupRoles.filter((r) => r.phase === 'IP');
    const oopRoles = groupRoles.filter((r) => r.phase === 'OOP');
    const members = ordered.filter((p) => g.positions.some((pos) => p.positions.has(pos)));
    if (!members.length) return `<h3>${esc(g.title)}</h3><p class="muted">Nobody in the squad lists these positions.</p>`;
    const th = (r) => `<th class="${r.phase === 'IP' ? 'ip' : 'oop'}" title="${esc(r.name)}">${esc(r.abbr)}</th>`;
    const head = `${ipRoles.map(th).join('')}<th class="gap"></th>${oopRoles.map(th).join('')}`;
    const body = members
      .map((p) => {
        const cells = [ipRoles, oopRoles].map((list) => {
          const vals = list.map((r) => groupScore(ctx, p, r, g.positions));
          const max = Math.max(...vals.map((v) => (v ? v.score : -1)));
          return vals.map((v) => heatCell(v?.score, v && v.score === max)).join('');
        });
        const tag = p.onLoan ? ' <span class="tag">loan</span>' : p.injured ? ' <span class="tag warn">inj</span>' : '';
        return `<tr><td>${esc(p.name)}${tag}</td>${cells[0]}<td class="gap"></td>${cells[1]}</tr>`;
      })
      .join('');
    const seen = new Set();
    const legend = [...ipRoles, ...oopRoles]
      .filter((r) => !seen.has(`${r.abbr}|${r.name}`) && seen.add(`${r.abbr}|${r.name}`))
      .map((r) => `<span><b>${esc(r.abbr)}</b>${esc(r.name)}</span>`)
      .join('');
    return `<h3>${esc(g.title)}</h3>
<div class="tablewrap"><table class="matrix"><thead><tr><th>Player</th>${head}</tr></thead><tbody>${body}</tbody></table></div>
<div class="abbr-grid">${legend}</div>`;
  }).join('\n');

  return `
<section id="suitability" class="card">
  <h2><span class="num">7</span>Role suitability for the whole squad</h2>
  <p class="lede">Every player scored for every FM27 role. A score weighs the role's key attributes three times and its preferred attributes 1.5 times
  (the same attributes FM27 highlights for that role), adds the attributes the match engine rewards in every role (pace, acceleration,
  anticipation, decisions…), then adjusts for position familiarity and, on the wings, for the stronger foot.</p>
  <h3>Best roles per player</h3>
  <div class="tablewrap"><table class="best">
    <thead><tr><th>Player</th><th>Best in possession</th><th>Best out of possession</th><th>FM's best role</th><th>Notes</th></tr></thead>
    <tbody>${bestRows}</tbody>
  </table></div>
  <p class="legend">"FM's best role" is the assistant manager's opinion from your export, for comparison.</p>
  <div class="legend"><span class="heatscale">40 <span class="bar"></span> 85+</span><span>stronger colour = better fit</span>
  <span><span class="key ip"></span>in possession roles</span><span><span class="key oop"></span>out of possession roles</span><span>outlined = player's best role in that phase</span></div>
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
    items.push(`<details class="more"><summary>${loaned.length} player${loaned.length === 1 ? ' is' : 's are'} out on loan, so they were left out of the tactic and the depth chart (they appear in the suitability tables, marked "loan").</summary>
<div class="chips">${loaned.map((p) => `<span class="chip loan">${esc(p.name)}${p.club ? ` <i>${esc(p.club)}</i>` : ''}</span>`).join('')}</div></details>`);
  }
  for (const ig of result.picks?.ignored || []) items.push(`Your pick of ${esc(ig.player.name)} was ignored: he is ${esc(ig.reason)}.`);
  const ranged = players.filter((p) => p.uncertainAttrs.length);
  if (ranged.length) {
    items.push(`${ranged.length} player(s) have attributes shown as scouting ranges (e.g. "11-14"). The tool uses the middle of the range and shows the possible spread as ±: ${ranged.map((p) => esc(p.name)).join(', ')}.`);
  }
  const unknown = players.filter((p) => p.unknownAttrs.length > 3);
  if (unknown.length) items.push(`Some attributes are unknown ("-") for: ${unknown.map((p) => esc(p.name)).join(', ')}. Their scores use only the known attributes.`);
  const injured = players.filter((p) => p.injured && !p.onLoan);
  if (injured.length) {
    const left = result.ctx.search.excludeInjured;
    items.push(`${left ? 'Left out of the starting XI because injured' : 'Injured (still considered for the XI)'}:
<div class="chips">${injured.map((p) => `<span class="chip inj">${INJ}${esc(p.name)}${p.injury ? ` <i>${esc(p.injury)}</i>` : ''}</span>`).join('')}</div>`);
  }
  items.push(`Team strength used for mentality and pressing: <strong>${esc(result.instructions.strengthLabel)}</strong> (your answer in the app).`);
  items.push('Position familiarity: FM27 only shows it as coloured dots, which no export contains. The tool treats <em>Best Pos</em> as Natural, other positions in the <em>Position</em> column as Accomplished, and neighbouring positions as Competent or Unconvincing (marked "estimated").');
  for (const w of result.warnings) items.push(esc(w));
  return `
<section id="data" class="card">
  <h2><span class="num">8</span>About your data</h2>
  <ul class="muted">${items.map((i) => `<li>${i}</li>`).join('')}</ul>
</section>`;
}

/** Report sections in order: id and short label (also used by the app's section bar). */
export const SECTIONS = [
  ['overview', 'At a glance'], ['setup', 'Enter it in FM27'], ['why', 'Why'], ['depth', 'Depth'],
  ['alternatives', 'Alternatives'], ['training', 'Training'], ['suitability', 'Role suitability'], ['data', 'Your data'],
];

/**
 * @param {object} result  from analyse()
 * @param {{generatedAt?: Date}} [opts]
 */
export function renderReport(result, opts = {}) {
  const when = (opts.generatedAt || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const club = result.club ? `${esc(result.club)}: ` : '';
  return `<article class="report">
<header class="top">
  <div class="eyebrow">FM27 Tactic Builder</div>
  <h1>${club}your tactic</h1>
  <p class="meta">From ${esc(result.filename)} · ${result.players.length} players · team strength: ${esc(result.instructions.strengthLabel)} · made ${esc(when)}</p>
  <aside class="notice">${ICON.info}<span><strong>This tool can't put the tactic into FM27 for you.</strong> It only reads your squad and never
  changes the game or your save. Enter the settings by hand, in the order shown in section 2.</span></aside>
</header>
<nav class="toc" aria-label="Sections">${SECTIONS.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('')}</nav>
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

/** A complete, self-contained HTML document (for "Save report"). Dark on screen, light when printed. */
export function standaloneReport(result, opts = {}) {
  const title = `${result.club ? result.club + ' – ' : ''}FM27 tactic`;
  const theme = opts.theme === 'light' ? 'light' : 'dark';
  return `<!doctype html>
<html lang="en" data-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><style>${THEME_CSS}body{padding:0 16px}${REPORT_CSS}</style></head>
<body>${renderReport(result, opts)}</body></html>
`;
}
