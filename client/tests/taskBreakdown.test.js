import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReviewedStepsPayload,
  getBreakdownGenerationError,
  getBreakdownSaveError,
} from '../src/utils/taskBreakdown.js';

test('reviewed-step payload contains only selected, edited, non-empty steps', () => {
  const payload = buildReviewedStepsPayload([
    { title: '  Review notes  ', description: '  Read chapter 2  ', selected: true },
    { title: 'Skip this', description: 'not selected', selected: false },
    { title: '  ', description: 'empty title', selected: true },
    { title: 'Submit assignment', description: '   ', selected: true },
  ], 'request-123');

  assert.deepEqual(payload, {
    request_id: 'request-123',
    steps: [
      { title: 'Review notes', description: 'Read chapter 2' },
      { title: 'Submit assignment', description: null },
    ],
  });
});

test('generation rate-limit message reflects Retry-After without retrying automatically', () => {
  const error = {
    response: {
      status: 429,
      headers: { 'retry-after': '75' },
      data: { message: 'provider message' },
    },
  };

  assert.match(getBreakdownGenerationError(error), /about 2 minutes/);
  assert.equal(getBreakdownGenerationError({ response: { status: 503, data: { message: 'Try later.' } } }), 'Try later.');
});

test('save error shows validation or server details and preserves retry guidance', () => {
  assert.equal(
    getBreakdownSaveError({ response: { status: 422, data: { errors: { 'steps.0.title': ['A title is required.'] } } } }),
    'A title is required.',
  );
  assert.equal(
    getBreakdownSaveError({ response: { status: 409, data: { message: 'Use the same reviewed steps.' } } }),
    'Use the same reviewed steps.',
  );
  assert.match(getBreakdownSaveError(new Error('offline')), /retrying the same save will not duplicate them/);
});
