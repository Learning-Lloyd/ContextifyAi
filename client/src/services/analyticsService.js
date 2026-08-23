import api from './api';

export const analyticsService = {
  async getAnalytics() {
    const response = await api.get('/analytics');
    return response.data;
  },
};
