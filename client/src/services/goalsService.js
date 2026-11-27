import api from './api';

export const goalsService = {
  async list() {
    const result = await api.get('/goals');
    window.dispatchEvent(new Event('contextify:notifications-refresh'));
    return result.data.goals;
  },
  async create(data) { return (await api.post('/goals', data)).data.goal; },
  async update(id, data) { return (await api.put(`/goals/${id}`, data)).data.goal; },
  async remove(id) { return api.delete(`/goals/${id}`); },
  async report(params) { return api.get('/user/report', { params, responseType: 'blob' }); },
  async reportSummary(params) { return (await api.get('/user/report/summary', { params })).data; },
};
