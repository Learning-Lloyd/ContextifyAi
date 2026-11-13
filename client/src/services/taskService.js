import api from './api';

const descriptionRequestsInFlight = new Map();
const aiRequestsInFlight = new Map();

function coalesceAiRequest(key, operation) {
  const existing = aiRequestsInFlight.get(key);
  if (existing) return existing;

  const request = operation().finally(() => aiRequestsInFlight.delete(key));
  aiRequestsInFlight.set(key, request);
  return request;
}

export const taskService = {
  async getAll(params = {}) {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  async create(data) {
    const response = await api.post('/tasks', data);
    return response.data;
  },

  async update(id, data) {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  async toggleComplete(id) {
    const response = await api.patch(`/tasks/${id}/toggle-complete`);
    return response.data;
  },

  async archive(id) {
    const response = await api.post(`/tasks/${id}/archive`);
    return response.data;
  },

  async restore(id) {
    const response = await api.post(`/tasks/${id}/restore`);
    return response.data;
  },

  async duplicate(id) {
    const response = await api.post(`/tasks/${id}/duplicate`);
    return response.data;
  },

  analyzeImportance(title, description) {
    const body = { title, description };
    return coalesceAiRequest(`importance:${JSON.stringify(body)}`, () =>
      api.post('/tasks/analyze-importance', body).then((response) => response.data)
    );
  },

  generateDescription(title, description) {
    const requestKey = JSON.stringify([title, description || '']);
    const existingRequest = descriptionRequestsInFlight.get(requestKey);
    if (existingRequest) return existingRequest;

    const request = api.post('/tasks/generate-description', { title, description })
      .then((response) => response.data)
      .finally(() => descriptionRequestsInFlight.delete(requestKey));
    descriptionRequestsInFlight.set(requestKey, request);

    return request;
  },

  generateBreakdown(taskId) {
    return coalesceAiRequest(`breakdown:${taskId}`, () =>
      api.post('/tasks/breakdown', { task_id: taskId }).then((response) => response.data)
    );
  },

  previewScoring({ title, description, due_date, due_time }) {
    const body = {
      title,
      description,
      due_date,
      due_time,
    };
    return coalesceAiRequest(`scoring-preview:${JSON.stringify(body)}`, () =>
      api.post('/tasks/scoring-preview', body).then((response) => response.data)
    );
  },

  async getCalendarContext(params = {}) {
    const response = await api.get('/tasks/calendar-context', { params });
    return response.data;
  },
};
