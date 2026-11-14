import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse } from '../src/analyse.js';
import { interpretIdea } from '../src/engine/idea.js';
import { renderReport } from '../src/report/render.js';
import { docs, sample } from './helpers.js';

const CSV = sample('squad_20261108_201500.csv');
const base = analyse(CSV, 'squad.csv', docs, { alternatives: false });
const players = base.players;
const striker = base.best.lanes.find((l) => /^ST/.test(l.ip)).player;
const last = (p) => p.name.split(/\s+/).pop();
const run = (text, intensity) => analyse(CSV, 'squad.csv', docs, { alternatives: false, idea: { text, intensity } });

test('reads ideas and player names; picks a suitable player when none is named', () => {
  const p = interpretIdea(`I want ${last(striker)} to score as many headers as possible`, players, 1);
  const aerial = p.understood.find((u) => u.id === 'aerial');
  assert.ok(aerial, 'headers understood');
  assert.equal(aerial.player, striker);
  assert.ok(p.locks.includes(striker.id));
  const auto = interpretIdea('lots of headed goals please', players, 1).understood.find((u) => u.id === 'aerial');
  assert.ok(auto.player && auto.auto, 'best striker in the air chosen');
  assert.ok([...auto.player.positions].some((x) => /^(ST|AM)/.test(x)));
});

test('team ideas, negation, conflicts and nothing recognised', () => {
  const ids = (t) => interpretIdea(t, players, 1).understood.map((u) => u.id);
  assert.deepEqual(ids('Gegenpress and win the ball back'), ['highPress']);
  assert.deepEqual(ids('park the bus and counter'), ['lowBlock', 'counter']);
  assert.ok(!ids("don't press, just keep the ball").includes('highPress'), 'negated press ignored');
  assert.ok(ids("don't press, just keep the ball").includes('possession'));
  assert.ok(!ids('bypass the press with long balls').includes('highPress'));
  assert.ok(interpretIdea('press high but also park the bus', players, 1).notes.some((n) => /opposite directions/.test(n)));
  assert.equal(interpretIdea('make it nice', players, 1).empty, true);
  assert.ok(!ids('build around my defensive midfielder').includes('lowBlock'));
});

test('a name alone means build around him', () => {
  const p = interpretIdea(`build it around ${base.best.lanes[5].player.name}`, players, 2);
  assert.equal(p.understood[0].id, 'buildAround');
  assert.ok(p.locks.includes(base.best.lanes[5].player.id));
});

test('intensity: Normal stays close to the best team, Extreme follows the idea further', () => {
  const text = `I want ${last(striker)} to score as many headers as possible`;
  const normal = run(text, 0);
  const extreme = run(text, 3);
  for (const r of [normal, extreme]) {
    assert.ok(r.ok, r.error);
    assert.ok(r.best.lanes.some((l) => l.player === r.players.find((p) => p.id === striker.id)), 'he starts');
    assert.equal(r.instructions.values.crossingStyle, 'Floated Crosses');
  }
  assert.ok(Object.keys(extreme.idea.overrides).length > Object.keys(normal.idea.overrides).length);
  assert.ok(normal.idea.choice.fitCost <= extreme.idea.choice.fitCost + 0.3, 'Extreme may cost more fit than Normal');
  const lane = extreme.best.lanes.find((l) => l.player.id === striker.id);
  assert.ok(lane.ipRole.tagSet.has('aerial'), `aerial role at Extreme, got ${lane.ipRole.name}`);
  assert.ok(extreme.instructions.ip.find((i) => i.id === 'crossingStyle').reason.startsWith('Your idea'));
  const html = renderReport(extreme);
  assert.ok(html.includes('Your idea · Extreme'));
  assert.ok(html.includes('team-fit points') || html.includes('costs nothing'));
});

test('team ideas change instructions and mentality; an idea that is not understood changes nothing', () => {
  const press = run('press high and win the ball back fast', 3);
  assert.equal(press.instructions.values.lineOfEngagement, 'High Press');
  assert.equal(press.instructions.values.triggerPress, 'Much More Often');
  const bus = run('park the bus', 3);
  const order = docs.instructions.mentalities;
  assert.ok(order.indexOf(bus.instructions.mentality.value) < order.indexOf(base.instructions.mentality.value));
  assert.equal(bus.instructions.values.lineOfEngagement, 'Low Block');
  const none = run('make it nice', 3);
  assert.equal(none.idea.empty, true);
  assert.equal(none.best.ipName, base.best.ipName);
  assert.match(renderReport(none), /wasn't recognised/);
});

test('alternatives are built without the idea', () => {
  const r = analyse(CSV, 'squad.csv', docs, { idea: { text: 'press high', intensity: 3 } });
  const away = r.alternatives.find((a) => a.title.startsWith('Away'));
  assert.equal(away.instructions.values.lineOfEngagement, 'Low Block');
});
