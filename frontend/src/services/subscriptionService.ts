import api from './api';

export const subscriptionService = {
  async createCheckoutSession() {
    const response = await api.post('/api/subscription/create-checkout-session', {
      price_id: 'price_premium_monthly'
    });
    return response.data;
  },

  async getSubscription() {
    const response = await api.get('/api/subscription/subscription');
    return response.data;
  },

  async cancelSubscription() {
    const response = await api.post('/api/subscription/cancel-subscription');
    return response.data;
  },

  async getNoteLimit() {
    const response = await api.get('/api/subscription/note-limit');
    return response.data;
  },
};
