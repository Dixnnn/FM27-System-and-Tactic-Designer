// A picture of the tactic to share (Discord, Reddit, a group chat): both shapes, the key settings and the
// set-piece takers on one 1600 x 900 card, drawn on a canvas inside the page. Nothing leaves the PC.
// Always the Floodlights night look (it's a picture for other people), with your club colours on the tokens.

import { CREST_PATHS, CREST_COLOURS } from '../report/crest.js';
import { punditLine } from '../report/pundit.js';
import { cleanKit, kitInk } from '../report/kit.js';

const W = 1600;
const H = 900;
const C = {
  bg: '#05080f', panel: '#0b111d', line: '#1b2740', ink: '#eaf1ff', ink2: '#bac6dc', muted: '#7c89a3', accent: '#c6ff3d',
  pitch: '#0c1f16', stripe: '#10291c', pitchLine: 'rgba(234,241,255,0.26)', token: '#060c0a', track: 'rgba(42,59,92,0.9)',
  ip: '#3987e5', oop: '#d95926', fit: ['#205d44', '#169065', '#25c48c', '#8bf4c4'], captain: '#b7820f',
  board: '#020407', amber: '#ffd84d', lime: '#c6ff3d',
};
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const DISPLAY = '"TB Display", "Segoe UI Semibold", system-ui, sans-serif';
const BOARD = '"TB Scoreboard", Consolas, monospace';
const NUMBERS = '"TB Numbers", Impact, sans-serif';
const band = (s) => (s >= 75 ? 3 : s >= 65 ? 2 : s >= 55 ? 1 : 0);
const last = (name) => String(name).trim().split(/\s+/).pop();

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, { size = 16, weight = 400, color = C.ink, align = 'left', max, font = FONT, glow } = {}) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  let out = String(s);
  if (max) while (out.length > 3 && ctx.measureText(out).width > max) out = out.slice(0, -2) + '…';
  if (glow) {
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 10;
    ctx.fillText(out, x, y);
    ctx.restore();
  } else ctx.fillText(out, x, y);
  return ctx.measureText(out).width;
}

/** The crest, drawn from the same paths as the SVG. */
function crest(ctx, x, y, h) {
  const P = CREST_PATHS;
  const k = h / P.H;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  const edge = ctx.createLinearGradient(0, 0, 0, P.H);
  edge.addColorStop(0, CREST_COLOURS.edgeTop);
  edge.addColorStop(1, CREST_COLOURS.edgeBottom);
  const shield = new Path2D(P.SHIELD);
  ctx.fillStyle = CREST_COLOURS.fill;
  ctx.fill(shield);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = edge;
  ctx.stroke(shield);
  ctx.fillStyle = CREST_COLOURS.star;
  ctx.fill(new Path2D(P.STAR));
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = CREST_COLOURS.chalk;
  ctx.lineWidth = 1.6;
  for (const d of P.LINES) ctx.stroke(new Path2D(d));
  ctx.strokeRect(P.BOX.x, P.BOX.y, P.BOX.w, P.BOX.h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = CREST_COLOURS.run;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke(new Path2D(P.RUN));
  ctx.stroke(new Path2D(P.HEAD));
  ctx.fillStyle = CREST_COLOURS.chalk;
  for (const [cx, cy] of P.DOTS) { ctx.beginPath(); ctx.arc(cx, cy, 4.2, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function pitch(ctx, x, y, w, h, items, slots, title, phaseColor, kit) {
  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = C.pitch;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 10; i++) if (i % 2) { ctx.fillStyle = C.stripe; ctx.fillRect(x, y + (i * h) / 10, w, h / 10); }
  ctx.restore();
  const m = 14;
  ctx.strokeStyle = C.pitchLine;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + m, y + m, w - 2 * m, h - 2 * m);
  ctx.beginPath(); ctx.moveTo(x + m, y + h / 2); ctx.lineTo(x + w - m, y + h / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w * 0.12, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeRect(x + w / 2 - w * 0.24, y + m, w * 0.48, h * 0.12);
  ctx.strokeRect(x + w / 2 - w * 0.24, y + h - m - h * 0.12, w * 0.48, h * 0.12);
  // title
  ctx.fillStyle = phaseColor;
  ctx.beginPath(); ctx.arc(x + 6, y - 18, 6, 0, Math.PI * 2); ctx.fill();
  text(ctx, title, x + 20, y - 12, { size: 18, weight: 650 });
  // players
  const px = (sx) => x + 30 + (sx / 100) * (w - 60);
  const py = (sy) => y + h - 64 - (sy / 100) * (h - 64 - 40);
  for (const it of items) {
    const [sx, sy] = slots[it.slot];
    const cx = px(sx);
    const cy = py(sy);
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.track;
    ctx.beginPath(); ctx.arc(cx, cy, 23, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = C.fit[band(it.score)];
    ctx.beginPath(); ctx.arc(cx, cy, 23, -Math.PI / 2, -Math.PI / 2 + (Math.max(0, Math.min(100, it.score)) / 100) * Math.PI * 2); ctx.stroke();
    ctx.fillStyle = kit ? kit.shirt : C.token;
    ctx.beginPath(); ctx.arc(cx, cy, 19, 0, Math.PI * 2); ctx.fill();
    if (kit) { ctx.lineWidth = 2.5; ctx.strokeStyle = kit.trim; ctx.beginPath(); ctx.arc(cx, cy, 17.6, 0, Math.PI * 2); ctx.stroke(); }
    text(ctx, it.abbr, cx, cy + 4.5, { size: 12, weight: 750, align: 'center', color: kit ? kitInk(kit) : C.ink });
    if (it.captain) {
      ctx.fillStyle = C.captain;
      ctx.beginPath(); ctx.arc(cx - 18, cy - 18, 8, 0, Math.PI * 2); ctx.fill();
      text(ctx, 'C', cx - 18, cy - 14, { size: 10, weight: 800, color: '#1a1405', align: 'center' });
    }
    ctx.font = `650 14px ${FONT}`;
    const label = `${last(it.name)}  ${Math.round(it.score)}`;
    const tw = ctx.measureText(label).width + 16;
    roundRect(ctx, cx - tw / 2, cy + 28, tw, 22, 11);
    ctx.fillStyle = 'rgba(5,8,15,0.88)';
    ctx.fill();
    text(ctx, last(it.name), cx - tw / 2 + 8, cy + 44, { size: 14, weight: 650 });
    text(ctx, String(Math.round(it.score)), cx + tw / 2 - 8, cy + 44, { size: 13, weight: 600, color: C.muted, align: 'right' });
  }
}

/** Draw the card; returns the canvas. kit = club colours for the tokens (optional). */
export function drawTacticCard(result, kitIn = null) {
  const kit = cleanKit(kitIn);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  // floodlights: two soft glows from the top corners
  for (const gx of [W * 0.08, W * 0.92]) {
    const g = ctx.createRadialGradient(gx, -60, 0, gx, -60, 620);
    g.addColorStop(0, 'rgba(160,190,255,0.20)');
    g.addColorStop(1, 'rgba(160,190,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  const { best, instructions: ins, ctx: c, setPieces: sp, captain } = result;
  const slots = c.slots;
  const cap = captain.captain?.player;
  const items = (phase) =>
    best.lanes.map((l) => ({
      slot: phase === 'IP' ? l.ip : l.oop,
      abbr: (phase === 'IP' ? l.ipRole : l.oopRole).abbr,
      name: l.player.name,
      score: (phase === 'IP' ? l.ipScore : l.oopScore).score,
      captain: l.player === cap,
    }));
  // header
  crest(ctx, 46, 26, 74);
  text(ctx, 'FM27 TACTIC BUILDER', 124, 50, { size: 14, weight: 750, color: C.accent });
  text(ctx, `${result.club || 'Your squad'}: the tactic`, 122, 96, { size: 42, weight: 500, max: 820, font: DISPLAY });
  text(ctx, `\u201C${punditLine(result)}\u201D`, 124, 128, { size: 17, color: C.ink2, max: 820 });
  // the scoreboard: four LED tiles
  const tiles = [['STYLE', ins.style.value || 'Custom'], ['MENTALITY', ins.mentality.value], ['PRESS', ins.values.lineOfEngagement], ['TEAM FIT', best.fit.toFixed(1)]];
  let tx = 48;
  for (const [i, [k, v]] of tiles.entries()) {
    ctx.font = `400 30px ${BOARD}`;
    const w = Math.max(150, ctx.measureText(v).width + 30);
    roundRect(ctx, tx, 146, w, 54, 8);
    ctx.fillStyle = C.board;
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.stroke();
    text(ctx, k, tx + 14, 162, { size: 10, weight: 650, color: C.muted });
    text(ctx, v, tx + 14, 192, { size: 30, font: BOARD, color: i === 3 ? C.lime : C.amber, glow: i === 3 ? 'rgba(198,255,61,0.6)' : 'rgba(255,200,40,0.6)' });
    tx += w + 10;
    if (tx > 900) break;
  }
  // pitches
  pitch(ctx, 48, 250, 420, 604, items('IP'), slots, `In possession · ${best.ipName}`, C.ip, kit);
  pitch(ctx, 500, 250, 420, 604, items('OOP'), slots, `Out of possession · ${best.oopName}`, C.oop, kit);
  // settings panel
  const x0 = 960;
  roundRect(ctx, x0, 226, 592, 628, 16);
  ctx.fillStyle = C.panel;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.stroke();
  let y = 266;
  const heading = (s) => {
    text(ctx, s.toUpperCase(), x0 + 26, y, { size: 13, weight: 750, color: C.muted });
    y += 26;
  };
  const row = (k, v) => {
    text(ctx, k, x0 + 26, y, { size: 16, color: C.ink2, max: 300 });
    text(ctx, v, x0 + 566, y, { size: 16, weight: 650, align: 'right', max: 250 });
    y += 26;
  };
  heading('Key instructions (changed from default)');
  const changed = [...ins.ip, ...ins.oop].filter((i) => i.changed);
  for (const i of changed.slice(0, 11)) row(i.name, i.value);
  if (changed.length > 11) {
    text(ctx, `+ ${changed.length - 11} more in the full report`, x0 + 26, y, { size: 14, color: C.muted });
    y += 24;
  }
  y += 12;
  heading('Set pieces');
  const nm = (t) => (t ? last(t.name) : '–');
  row('Captain', nm(captain.captain));
  row('Corners L / R', `${nm(sp.cornersLeft)} / ${nm(sp.cornersRight)}`);
  row('Free kicks', nm(sp.directFreeKicks));
  row('Penalties', sp.penalties.slice(0, 2).map(nm).join(', '));
  text(ctx, 'Made with FM27 Tactic Builder · fit = how well each player suits his role (0–100)', 48, 884, { size: 13, color: C.muted });
  return canvas;
}

/** Draw the card (after the embedded fonts are ready) and download it as a PNG. */
export async function saveTacticImage(result, filename, kit = null) {
  try {
    await Promise.all([`500 42px ${DISPLAY}`, `400 30px ${BOARD}`, `400 20px ${NUMBERS}`].map((f) => document.fonts.load(f)));
  } catch {
    /* draw with the fallback fonts */
  }
  const canvas = drawTacticCard(result, kit);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}
