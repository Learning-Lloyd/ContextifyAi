import api from './api';

export const adminService = {
  async getDashboard() {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },
  async getUsers(params = {}) {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },
  async updateUser(id, data) {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data;
  },
  async resetPassword(id, data) {
    const response = await api.post(`/admin/users/${id}/reset-password`, data);
    return response.data;
  },
  async toggleUserActive(id) {
    const response = await api.post(`/admin/users/${id}/toggle-active`);
    return response.data;
  },
  async deleteUser(id) {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },
  async getTasks(params = {}) {
    const response = await api.get('/admin/tasks', { params });
    return response.data;
  },
  async deleteTask(id) {
    const response = await api.delete(`/admin/tasks/${id}`);
    return response.data;
  },
  async getDecisions(params = {}) {
    const response = await api.get('/admin/decisions', { params });
    return response.data;
  },
  async getDecision(id) {
    const response = await api.get(`/admin/decisions/${id}`);
    return response.data;
  },
  async getAuditLogs(params = {}) {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  },
  async getAnalytics(params = {}) {
    const response = await api.get('/admin/analytics', { params });
    return response.data;
  },
  async getNotifications() {
    const response = await api.get('/admin/notifications');
    return response.data;
  },
  async markNotificationRead(id) {
    const response = await api.patch(`/admin/notifications/${id}/read`);
    return response.data;
  },
  exportReport(type, format = 'csv') {
    const token = localStorage.getItem('token');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    return fetch(`${base}/admin/reports/export?type=${type}&format=${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
