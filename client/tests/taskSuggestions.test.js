import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTaskSuggestion, createTaskSuggestions } from '../src/utils/taskSuggestions.js';

test('education and academic preferences return relevant academic ideas', () => {
  const suggestions = createTaskSuggestions({ focus: ['Education'], categories: ['Academic'] });
  assert.equal(suggestions.length, 3);
  assert.ok(suggestions.every((item) => item.category === 'Academic'));
  assert.match(suggestions[0].title, /lecture notes/i);
});

test('multiple focus areas and categories contribute ideas', () => {
  const suggestions = createTaskSuggestions({
    focus: ['Education', 'Work'],
    categories: ['Academic', 'Work'],
  });
  assert.ok(suggestions.length >= 3 && suggestions.length <= 5);
  assert.ok(suggestions.some((item) => item.title.includes('lecture')));
  assert.ok(suggestions.some((item) => item.category === 'Work'));
});

test('personal productivity and Personal category produce personal ideas', () => {
  const suggestions = createTaskSuggestions({ focus: ['Personal Productivity'], categories: ['Personal'] });
  assert.ok(suggestions.some((item) => item.title === 'Plan the week ahead'));
  assert.ok(suggestions.every((item) => item.category === 'Personal'));
});

test('project suggestions use a selected category where appropriate', () => {
  const suggestions = createTaskSuggestions({ focus: ['Projects and Tasks'], categories: ['Work', 'Academic'] });
  assert.ok(suggestions.some((item) => item.title.includes('project milestone') && item.category === 'Work'));
  assert.ok(suggestions.some((item) => item.category === 'Academic'));
});

test('skipped onboarding returns general ideas without requiring a provider', () => {
  const suggestions = createTaskSuggestions();
  assert.equal(suggestions.length, 4);
  assert.ok(suggestions.every((item) => item.category === ''));
  assert.deepEqual(suggestions, createTaskSuggestions({ focus: [], categories: [] }));
});

test('updated preferences deterministically refresh the suggestion set', () => {
  const academic = createTaskSuggestions({ focus: ['Education'], categories: ['Academic'] });
  const work = createTaskSuggestions({ focus: ['Work'], categories: ['Work'] });
  assert.notDeepEqual(academic, work);
  assert.ok(work.some((item) => item.title.includes('weekly work update')));
});

test('suggestion fills only task content and leaves scheduling and score inputs alone', () => {
  const current = { title: '', description: '', category: '', estimated_duration_hours: '', due_date: '', due_time: '', importance: 8, urgency: 7 };
  const idea = { title: 'Review lecture notes', description: 'Summarize class notes.', category: 'Academic', estimated_duration_hours: '0.5' };
  const result = applyTaskSuggestion(current, idea);
  assert.equal(result.requiresConfirmation, false);
  assert.deepEqual(result.form, { ...current, ...idea });
});

test('existing task details are protected until the user confirms replacement', () => {
  const current = { title: 'My typed title', description: 'Keep this', category: 'Work', estimated_duration_hours: '2', due_date: '2026-11-25', importance: 9 };
  const idea = { title: 'Review lecture notes', description: 'Summarize class notes.', category: 'Academic', estimated_duration_hours: '0.5' };
  const first = applyTaskSuggestion(current, idea);
  assert.equal(first.requiresConfirmation, true);
  assert.equal(first.form, current);
  const confirmed = applyTaskSuggestion(current, idea, true);
  assert.equal(confirmed.form.title, idea.title);
  assert.equal(confirmed.form.due_date, current.due_date);
  assert.equal(confirmed.form.importance, current.importance);
});
