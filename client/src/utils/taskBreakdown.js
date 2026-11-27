export function buildReviewedStepsPayload(items, requestId) {
  return {
    request_id: requestId,
    steps: items
      .filter((item) => item.selected && typeof item.title === 'string' && item.title.trim())
      .map((item) => ({
        title: item.title.trim(),
        description: typeof item.description === 'string' && item.description.trim()
          ? item.description.trim()
          : null,
      })),
  };
}

function retryAfterHeader(headers = {}) {
  if (typeof headers.get === 'function') {
    return headers.get('retry-after');
  }

  return headers['retry-after'] ?? headers['Retry-After'] ?? null;
}

function retryDelayLabel(seconds) {
  const delay = Math.max(1, Math.ceil(seconds));
  if (delay < 60) return `${delay} second${delay === 1 ? '' : 's'}`;

  const minutes = Math.ceil(delay / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export function getBreakdownGenerationError(error) {
  const retryAfter = Number(retryAfterHeader(error?.response?.headers));
  if (error?.response?.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0) {
    return `AI step suggestions are temporarily limited. Try again in about ${retryDelayLabel(retryAfter)}.`;
  }

  return error?.response?.data?.message || 'Could not generate subtasks. Your existing suggestions are still available.';
}

export function getBreakdownSaveError(error) {
  const validationMessage = Object.values(error?.response?.data?.errors || {})
    .flat()
    .find((message) => typeof message === 'string' && message.trim());

  return validationMessage
    || error?.response?.data?.message
    || 'Could not save the reviewed steps. Your selections are still available; retrying the same save will not duplicate them.';
}
