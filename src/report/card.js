// Player card: what you see when you click a player in the app. His place in the tactic, the key
// attributes of his roles against the team's level, his best roles anywhere and who else can play there.

import { esc, fmt, fitChip, phaseKey, pickTags } from './util.js';
import { laneValue } from '../engine/depth.js';
import { generalLevel } from '../engine/profile.js';

const FORBIDDEN = -500;

function attrRow(p, a, level, isKey) {
  const at = p.attrs[a];
  const k = isKey ? ' keyattr' : '';
  if (!at) return `<div class="ab${k}"><span class="an">${esc(a)}</span><span class="abar"></span><span class="av muted">?</span></div>`;
  const w = (Math.max(1, Math.min(20, at.v)) / 20) * 100;
  const lv = level != null ? (Math.max(1, Math.min(20, level)) / 20) * 100 : null;
  const cls = level == null ? '' : at.v >= level + 2 ? ' hi' : at.v <= level - 2 ? ' lo' : '';
  const shown = at.range ? `${at.lo}–${at.hi}` : fmt(at.v);
  return `<div class="ab${k}${cls}"><span class="an">${esc(a)}</span><span class="abar"><i style="width:${w.toFixed(0)}%"></i>${lv != null ? `<b style="left:${lv.toFixed(0)}%" title="Team level ${fmt(level, 1)}"></b>` : ''}</span><span class="av">${shown}</span></div>`;
}

function roleAttrs(p, role, level, done) {
  const rows = [...role.key.map((a) => [a, true]), ...role.preferred.map((a) => [a, false])].filter(([a]) => !done.has(a));
  rows.forEach(([a]) => done.add(a));
  if (!rows.length) return '';
  return `<div class="pc-role"><div class="pc-rt">${phaseKey(role.phase)}${esc(role.name)} <span class="muted small">key, then preferred</span></div>${rows
    .map(([a, key]) => attrRow(p, a, level, key))
    .join('')}</div>`;
}

/** Best IP and OOP roles anywhere, from the suitability table. */
function bestRoles(result, p) {
  const scores = result.suitability.find((s) => s.player === p)?.scores || {};
  const top = (phase) =>
    result.ctx.roles.roles
      .filter((r) => r.phase === phase && scores[r.id])
      .map((r) => ({ r, s: scores[r.id].score }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 3);
  return { ip: top('IP'), oop: top('OOP') };
}

/**
 * @param {object} result  analyse() result
 * @param {object} p  the player
 * @returns {string} HTML
 */
export function playerCard(result, p) {
  const { best, ctx, depth, profile } = result;
  const slots = ctx.slots;
  const level = profile.level;
  const lane = best.lanes.find((l) => l.player === p);
  const facts = [
    p.age != null && `${fmt(p.age)} years`,
    p.positionsText,
    p.preferredFoot && (/foot/i.test(p.preferredFoot) ? p.preferredFoot : `${p.preferredFoot} foot`),
    p.heightCm && `${p.heightCm} cm`,
    p.personality,
  ].filter(Boolean);
  const status = [
    pickTags(p),
    p.injured ? `<span class="tag warn">Injured${p.injury ? ': ' + esc(p.injury) : ''}</span>` : '',
    p.onLoan ? `<span class="tag">On loan${p.club ? ' at ' + esc(p.club) : ''}</span>` : '',
    p.unavailable ? '<span class="tag warn">Unavailable (your choice)</span>' : '',
    lane ? '<span class="tag accent">Starting XI</span>' : '',
  ].join(' ');

  let place;
  let roles = [];
  if (lane) {
    place = `<div class="pc-place">
  <div>${phaseKey('IP')}<strong>${esc(slots[lane.ip][3])}</strong> · ${esc(lane.ipRole.name)} ${fitChip(lane.ipScore.score)}</div>
  <div>${phaseKey('OOP')}<strong>${esc(slots[lane.oop][3])}</strong> · ${esc(lane.oopRole.name)} ${fitChip(lane.oopScore.score)}</div></div>`;
    roles = [lane.ipRole, lane.oopRole];
    const d = depth.lanes.find((x) => x.lane === lane);
    const cover = d ? [d.secondChoice, ...d.options.filter((o) => o.player !== d.secondChoice?.player)].filter(Boolean).slice(0, 3) : [];
    if (cover.length) {
      place += `<div class="pc-sub">Who else can play here: ${cover.map((o) => `${esc(o.player.name)} <b>${fmt(o.value)}</b>${o.injured ? ' <span class="muted">(injured)</span>' : ''}`).join(' · ')}</div>`;
    }
  } else {
    const options = best.lanes
      .map((l) => ({ l, v: laneValue(ctx, p, l) }))
      .filter((o) => o.v > FORBIDDEN)
      .sort((a, b) => b.v - a.v);
    const o = options[0];
    if (o) {
      const gap = o.l.value - o.v;
      place = `<div class="pc-place"><div>Not in the starting XI. His best spot in this tactic: <strong>${esc(slots[o.l.ip][3])}</strong>
  (${esc(o.l.ipRole.name)} / ${esc(o.l.oopRole.name)}) ${fitChip(o.v)}</div>
  <div class="pc-sub">${gap > 0 ? `${fmt(gap)} behind the starter, ${esc(o.l.player.name)}.` : `Level with the starter, ${esc(o.l.player.name)}.`}</div></div>`;
      roles = [o.l.ipRole, o.l.oopRole];
    } else {
      place = '<div class="pc-place">Not in the starting XI, and no position in this tactic suits him.</div>';
    }
  }
  const done = new Set();
  const attrs = roles.map((r) => roleAttrs(p, r, level, done)).join('');
  const b = bestRoles(result, p);
  const list = (xs) => xs.map((x) => `<div class="line">${fitChip(x.s)} ${esc(x.r.name)}</div>`).join('');
  const gl = generalLevel(p);
  return `<div class="pcard">
  <header class="pc-head"><div><h3>${esc(p.name)}</h3><div class="pc-facts">${facts.map(esc).join(' · ')}</div></div>
  <div class="pc-level"><span class="muted small">General level</span><strong>${gl != null ? fmt(gl, 1) : '–'}</strong><span class="muted small">team ${level != null ? fmt(level, 1) : '–'}</span></div></header>
  <div class="pc-tags">${status}</div>
  <h4>In this tactic</h4>${place}
  ${attrs ? `<h4>Attributes for these roles</h4><div class="pc-attrs">${attrs}</div>
  <div class="legend"><span><span class="tickkey"></span>team level</span><span>bar = his attribute (1–20)</span><span><b class="lo-k">red</b> 2+ below the team level, <b class="hi-k">blue</b> 2+ above</span></div>` : ''}
  <h4>His best roles anywhere</h4>
  <div class="pc-best"><div><div class="pc-rt">${phaseKey('IP')}In possession</div>${list(b.ip)}</div><div><div class="pc-rt">${phaseKey('OOP')}Out of possession</div>${list(b.oop)}</div></div>
  ${p.traits.length ? `<h4>Traits</h4><div class="chips">${p.traits.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
  ${p.fmBestRole ? `<p class="muted small">FM's assistant: best role ${esc(p.fmBestRole)}${p.ability != null ? `, ability ${fmt(p.ability, 1)}` : ''}${p.potential != null ? `, potential ${fmt(p.potential, 1)} stars` : ''}.</p>` : ''}
</div>`;
}
