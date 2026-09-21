import api from './api';

export const feedbackService = {
  /**
   * Get feedback submitted by the authenticated user
   */
  async getUserFeedback(params = {}) {
    const response = await api.get('/feedback', { params });
    return response.data;
  },

  /**
   * Submit new user feedback
   */
  async submitFeedback(data) {
    const response = await api.post('/feedback', data);
    return response.data;
  },

  /**
   * Get all feedback for admin with filters and stats
   */
  async getAdminFeedback(params = {}) {
    const response = await api.get('/admin/feedback', { params });
    return response.data;
  },

  /**
   * Get specific feedback details
   */
  async getAdminFeedbackDetail(id) {
    const response = await api.get(`/admin/feedback/${id}`);
    return response.data;
  },

  /**
   * Update feedback status or response
   */
  async updateAdminFeedback(id, data) {
    const response = await api.patch(`/admin/feedback/${id}`, data);
    return response.data;
  },

  /**
   * Send an administrative response to feedback
   */
  async respondToFeedback(id, responseText, status = 'reviewed') {
    const response = await api.post(`/admin/feedback/${id}/respond`, {
      response: responseText,
      status,
    });
    return response.data;
  },

  /**
   * Delete a feedback record
   */
  async deleteAdminFeedback(id) {
    const response = await api.delete(`/admin/feedback/${id}`);
    return response.data;
  },
};
