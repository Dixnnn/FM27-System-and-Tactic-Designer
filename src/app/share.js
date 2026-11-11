// A picture of the tactic to share (Discord, Reddit, a group chat): both shapes, the key settings and the
// set-piece takers on one 1600 x 900 card, drawn on a canvas inside the page. Nothing leaves the PC.

const W = 1600;
const H = 900;
const C = {
  bg: '#0d0f0e', panel: '#161917', line: '#2a2f2c', ink: '#eef0ec', ink2: '#b9bfb9', muted: '#868d87', accent: '#25c48c',
  pitch: '#12201a', stripe: '#16271e', pitchLine: 'rgba(226,240,230,0.22)', token: '#0d1310', track: 'rgba(58,64,60,0.9)',
  ip: '#3987e5', oop: '#d95926', fit: ['#205d44', '#169065', '#25c48c', '#8bf4c4'], captain: '#b7820f',
};
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
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

function text(ctx, s, x, y, { size = 16, weight = 400, color = C.ink, align = 'left', max } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  let out = String(s);
  if (max) while (out.length > 3 && ctx.measureText(out).width > max) out = out.slice(0, -2) + '…';
  ctx.fillText(out, x, y);
  return ctx.measureText(out).width;
}

function pitch(ctx, x, y, w, h, items, slots, title, phaseColor) {
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
    ctx.fillStyle = C.token;
    ctx.beginPath(); ctx.arc(cx, cy, 19, 0, Math.PI * 2); ctx.fill();
    text(ctx, it.abbr, cx, cy + 4.5, { size: 12, weight: 750, align: 'center' });
    if (it.captain) {
      ctx.fillStyle = C.captain;
      ctx.beginPath(); ctx.arc(cx - 18, cy - 18, 8, 0, Math.PI * 2); ctx.fill();
      text(ctx, 'C', cx - 18, cy - 14, { size: 10, weight: 800, color: '#1a1405', align: 'center' });
    }
    ctx.font = `650 14px ${FONT}`;
    const label = `${last(it.name)}  ${Math.round(it.score)}`;
    const tw = ctx.measureText(label).width + 16;
    roundRect(ctx, cx - tw / 2, cy + 28, tw, 22, 11);
    ctx.fillStyle = 'rgba(9,14,11,0.86)';
    ctx.fill();
    text(ctx, last(it.name), cx - tw / 2 + 8, cy + 44, { size: 14, weight: 650 });
    text(ctx, String(Math.round(it.score)), cx + tw / 2 - 8, cy + 44, { size: 13, weight: 600, color: C.muted, align: 'right' });
  }
}

/** Draw the card; returns the canvas. */
export function drawTacticCard(result) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
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
  text(ctx, 'FM27 TACTIC BUILDER', 48, 58, { size: 15, weight: 750, color: C.accent });
  text(ctx, `${result.club || 'Your squad'}: the tactic`, 48, 100, { size: 38, weight: 750, max: 900 });
  const chips = [`Style: ${ins.style.value || 'custom'}`, `Mentality: ${ins.mentality.value}`, ins.values.lineOfEngagement, `Team fit ${best.fit.toFixed(1)}`];
  let cx = 48;
  for (const chip of chips) {
    ctx.font = `600 15px ${FONT}`;
    const w = ctx.measureText(chip).width + 24;
    roundRect(ctx, cx, 122, w, 32, 16);
    ctx.fillStyle = C.panel;
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.stroke();
    text(ctx, chip, cx + 12, 143, { size: 15, weight: 600, color: C.ink2 });
    cx += w + 10;
  }
  // pitches
  pitch(ctx, 48, 214, 420, 640, items('IP'), slots, `In possession · ${best.ipName}`, C.ip);
  pitch(ctx, 500, 214, 420, 640, items('OOP'), slots, `Out of possession · ${best.oopName}`, C.oop);
  // settings panel
  const x0 = 960;
  roundRect(ctx, x0, 190, 592, 664, 16);
  ctx.fillStyle = C.panel;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.stroke();
  let y = 232;
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
  for (const i of changed.slice(0, 12)) row(i.name, i.value);
  if (changed.length > 12) {
    text(ctx, `+ ${changed.length - 12} more in the full report`, x0 + 26, y, { size: 14, color: C.muted });
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

/** Draw the card and download it as a PNG. */
export function saveTacticImage(result, filename) {
  const canvas = drawTacticCard(result);
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
