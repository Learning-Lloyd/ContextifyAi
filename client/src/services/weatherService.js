import api from './api';

export const weatherService = {
  async searchCities(query) {
    const response = await api.get('/weather/search', { params: { q: query } });
    return response.data;
  },

  async getCurrent(latitude, longitude, location = null) {
    const response = await api.get('/weather/current', {
      params: { latitude, longitude, location },
    });
    return response.data;
  },
};
