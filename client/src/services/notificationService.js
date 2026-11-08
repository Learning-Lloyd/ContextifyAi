import api from './api';

export const notificationService = {
  async getAll(params = {}) {
    const response = await api.get('/notifications', { params });
    return response.data;
  },
  async markAsRead(id) {
    return api.patch(`/notifications/${id}/read`);
  },
  async markAllAsRead() {
    return api.patch('/notifications/read-all');
  },
};
