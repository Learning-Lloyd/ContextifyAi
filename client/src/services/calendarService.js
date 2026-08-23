import api from './api';

export const calendarService = {
  async getCalendar() {
    const response = await api.get('/calendar');
    return response.data;
  },
};
