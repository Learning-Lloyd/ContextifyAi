import api from './api';

export const authService = {
  async register(data) {
    const response = await api.post('/register', data);
    return response.data;
  },

  async login(data) {
    const response = await api.post('/login', data);
    return response.data;
  },

  async logout() {
    const response = await api.post('/logout');
    return response.data;
  },

  async getUser() {
    const response = await api.get('/user');
    return response.data;
  },

  async updateProfile(data) {
    const response = await api.put('/user/profile', data);
    return response.data;
  },
};
