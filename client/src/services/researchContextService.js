import api from './api';

export const researchContextService = {
  async predict(tasks) {
    const response = await api.post('/research-context/predict', { tasks });
    return response.data;
  },
};
