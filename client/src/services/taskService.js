import api from './api';

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

  async analyzeImportance(title, description) {
    const response = await api.post('/tasks/analyze-importance', { title, description });
    return response.data;
  },

  async previewScoring({ title, description, due_date, due_time }) {
    const response = await api.post('/tasks/scoring-preview', {
      title,
      description,
      due_date,
      due_time,
    });
    return response.data;
  },

  async getCalendarContext(params = {}) {
    const response = await api.get('/tasks/calendar-context', { params });
    return response.data;
  },
};
