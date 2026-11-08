import api from './api';

export const scheduleService = {
  async getSuggestions(date) {
    const response = await api.get('/schedule/recommendations', { params: { date } });
    return response.data.schedule;
  },
};
