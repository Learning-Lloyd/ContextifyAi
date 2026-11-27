import test from 'node:test';
import assert from 'node:assert/strict';
import { saveTaskWithoutAnalysis } from '../src/utils/taskCreationFlow.js';

const taskData = { title: 'Review lecture notes', due_date: '2026-12-01' };

test('task creation saves once with unchanged data and returns the saved task', async () => {
  let saves = 0;
  const savedTask = { id: 14, ...taskData, priority_score: 7.2, priority_level: 'medium', rank: 1 };
  const result = await saveTaskWithoutAnalysis({
    saveTask: async (data) => { saves += 1; assert.equal(data, taskData); return { task: savedTask }; },
    taskData,
  });

  assert.equal(saves, 1);
  assert.equal(result, savedTask);
});

test('a failed task save propagates without retrying or creating analysis', async () => {
  let saves = 0;
  const failure = new Error('validation failed');
  await assert.rejects(saveTaskWithoutAnalysis({
    saveTask: async () => { saves += 1; throw failure; },
    taskData,
  }), /validation failed/);
  assert.equal(saves, 1);
});
