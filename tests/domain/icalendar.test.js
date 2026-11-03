import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCalendarIcs } from '../../src/domain/icalendar.js';
const events = [
  { date: '2026-05-01', type: 'plant', plantingId: 'p1', crop: 'Tomato, early', plot: 'Bed A' },
  { date: '2026-07-10', type: 'harvest', plantingId: 'p1', crop: 'Tomato, early', plot: 'Bed A' }
];
test('calendar export emits stable UIDs and escaped event text', () => {
  const first = buildCalendarIcs({ calendarName: 'Bed A', events, generatedAt: '2026-11-03T08:00:00.000Z' });
  const second = buildCalendarIcs({ calendarName: 'Bed A', events, generatedAt: '2026-11-03T09:00:00.000Z' });
  assert.match(first, /BEGIN:VCALENDAR/);
  assert.match(first, /UID:plant-p1-2026-05-01@gardengrid/);
  assert.match(first, /SUMMARY:Tomato\\, early plant/);
  assert.match(first, /DTSTART;VALUE=DATE:20260501/);
  assert.match(first, /DTSTAMP:20261103T080000Z/);
  assert.equal(first.split('UID:').length, second.split('UID:').length);
});
test('calendar export folds long UTF-8 lines', () => {
  const output = buildCalendarIcs({ calendarName: '菜园', events: [{ ...events[0], plot: '北侧'.repeat(40) }], generatedAt: '2026-11-03T08:00:00.000Z' });
  assert.equal(output.includes('\r\n '), true);
  assert.equal(output.includes('\uFFFD'), false);
});
