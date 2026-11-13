import api from './api';

export const researchDatasetService = {
  async getRecords(params = {}) {
    const response = await api.get('/research-dataset/records', { params });
    return response.data;
  },
};
