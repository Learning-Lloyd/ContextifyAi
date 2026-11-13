import api from './api';

export const goalsService = {
  async list() { return (await api.get('/goals')).data.goals; },
  async create(data) { return (await api.post('/goals', data)).data.goal; },
  async update(id, data) { return (await api.put(`/goals/${id}`, data)).data.goal; },
  async remove(id) { return api.delete(`/goals/${id}`); },
  async report(period) { return api.get('/user/report', { params: { period }, responseType: 'blob' }); },
};
