import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarEvents, createCrop, createPlanting, createPlot, expectedHarvestDate, rotationConflict, successionSchedule, validateCropInput, validatePlotInput } from '../../src/domain/garden.js';

let counter = 0;
const deps = { clock: { now: () => new Date('2026-10-28T08:00:00.000Z') }, createId: (prefix) => `${prefix}_${++counter}` };

test('plots validate area and sun exposure', () => {
  assert.deepEqual(validatePlotInput({ name: 'Bed A', areaSqm: 6, sunExposure: 'full' }), { name: 'Bed A', areaSqm: 6, sunExposure: 'full' });
  assert.throws(() => validatePlotInput({ name: 'Bed A', areaSqm: 0 }), /areaSqm/);
  assert.throws(() => validatePlotInput({ name: 'Bed A', areaSqm: 5, sunExposure: 'moonlight' }), /sunExposure/);
});

test('crops validate harvest days and frost hardiness', () => {
  assert.equal(validateCropInput({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false }).daysToHarvest, 70);
  assert.throws(() => validateCropInput({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 0, frostHardy: false }), /daysToHarvest/);
  assert.throws(() => validateCropInput({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: 'no' }), /frostHardy/);
});

test('harvest date is planted date plus crop days', () => {
  const crop = createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true }, deps);
  assert.equal(expectedHarvestDate('2026-10-01', crop), '2026-11-15');
});

test('rotation rejects the same family in the same plot within three years', () => {
  const plot = createPlot({ name: 'Bed A', areaSqm: 6 }, deps);
  const tomato = createCrop({ name: 'Tomato', family: 'Solanaceae', daysToHarvest: 70, frostHardy: false }, deps);
  const pepper = createCrop({ name: 'Pepper', family: 'Solanaceae', daysToHarvest: 80, frostHardy: false }, deps);
  const plantings = [createPlanting({ plotId: plot.id, plantedOn: '2024-05-01' }, tomato, deps)];
  assert.equal(rotationConflict({ crop: pepper, plotId: plot.id, plantings, crops: [tomato, pepper], plantedOn: '2026-05-01' }), true);
  assert.equal(rotationConflict({ crop: pepper, plotId: plot.id, plantings, crops: [tomato, pepper], plantedOn: '2029-05-01' }), false);
});

test('calendar lists plant and harvest events in range', () => {
  const plot = createPlot({ name: 'Bed A', areaSqm: 6 }, deps);
  const crop = createCrop({ name: 'Lettuce', family: 'Asteraceae', daysToHarvest: 45, frostHardy: true }, deps);
  const planting = createPlanting({ plotId: plot.id, plantedOn: '2026-10-01' }, crop, deps);
  const events = calendarEvents({ plantings: [planting], crops: [crop], plots: [plot], from: '2026-10-01', to: '2026-11-30' });
  assert.deepEqual(events.map((event) => event.type), ['plant', 'harvest']);
  assert.equal(events[1].date, '2026-11-15');
});

test('crop sowing offsets override frost defaults and drive succession rounds', () => {
  const crop = createCrop({
    name: 'Cilantro', family: 'Apiaceae', daysToHarvest: 50, frostHardy: true,
    earliestSowWeeks: -2, latestSowWeeks: 2
  }, deps);
  const profile = { id: 'frost_1', lastFrostDate: '2026-05-15' };
  const plan = successionSchedule({ crop, profile, count: 3, intervalDays: 14 });
  assert.equal(plan.rounds[0].sowOn, '2026-05-01');
  assert.deepEqual(plan.rounds.map((round) => round.sowOn), ['2026-05-01', '2026-05-15', '2026-05-29']);
  assert.equal(plan.rounds[0].expectedHarvestOn, '2026-06-20');
  assert.throws(() => successionSchedule({ crop, profile, count: 4, intervalDays: 14 }), /exceeds/);
});

test('crop sowing offsets must be supplied as an ordered pair', () => {
  const base = { name: 'Basil', family: 'Lamiaceae', daysToHarvest: 60, frostHardy: false };
  assert.throws(() => validateCropInput({ ...base, earliestSowWeeks: 1 }), /provided together/);
  assert.throws(() => validateCropInput({ ...base, earliestSowWeeks: 3, latestSowWeeks: 2 }), /must not exceed/);
});
