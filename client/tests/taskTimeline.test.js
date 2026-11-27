import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTimelineWeek } from '../src/utils/taskTimeline.js';

test('timeline keeps scheduled days and unscheduled tasks distinct without inventing a start', () => {
  const { days, unscheduled } = buildTimelineWeek(new Date(2026, 10, 23), [
    { id: 1, scheduled_start_date: '2026-11-23', scheduled_start_time: null },
    { id: 2, scheduled_start_date: null, due_date: '2026-11-24' },
  ]);
  assert.equal(days[0].withoutTime[0].id, 1);
  assert.equal(days[0].placed.length, 0);
  assert.equal(unscheduled[0].id, 2);
});

test('timeline plots actual start time and estimated duration on the 24-hour scale', () => {
  const { days } = buildTimelineWeek(new Date(2026, 10, 23), [
    { id: 1, scheduled_start_date: '2026-11-23', scheduled_start_time: '09:30:00', estimated_time_minutes: 90 },
  ]);
  const item = days[0].placed[0];
  assert.equal(item.startMinutes, 570);
  assert.equal(item.endTime, '11:00');
  assert.equal(item.durationMinutes, 90);
  assert.ok(item.heightPercent > 6);
});

test('overlapping tasks use separate visual lanes and unknown durations stay unknown', () => {
  const { days } = buildTimelineWeek(new Date(2026, 10, 23), [
    { id: 1, scheduled_start_date: '2026-11-23', scheduled_start_time: '09:00', estimated_time_minutes: 60 },
    { id: 2, scheduled_start_date: '2026-11-23', scheduled_start_time: '09:30', estimated_time_minutes: null },
  ]);
  assert.equal(days[0].placed[0].laneCount, 2);
  assert.notEqual(days[0].placed[0].lane, days[0].placed[1].lane);
  assert.equal(days[0].placed[1].durationMinutes, null);
  assert.equal(days[0].placed[1].endTime, null);
});
