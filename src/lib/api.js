import axios from 'axios';

const API_URL = '/api';

// Add Auth Interceptor
axios.interceptors.request.use((config) => {
  const session = localStorage.getItem('erika_session');
  if (session) {
    try {
      const { token } = JSON.parse(session);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // invalid session
    }
  }
  return config;
});

export const api = {
  login: (credentials) => axios.post(`${API_URL}/login`, credentials),
  getSettings: () => axios.get(`${API_URL}/settings`),
  updateSettings: (settings) => axios.put(`${API_URL}/settings`, settings),
  getGoogleCalendarStatus: () => axios.get(`${API_URL}/settings/status/google-calendar`),
  getGoogleEvents: (start, end) => axios.get(`${API_URL}/calendar/events`, { params: { start, end } }),
  getAppointments: () => axios.get(`${API_URL}/appointments?_t=${Date.now()}`),
  createAppointment: (appt) => axios.post(`${API_URL}/appointments`, appt),
  updateAppointment: (id, data) => axios.put(`${API_URL}/appointments/${id}`, data),
  deleteAppointment: (id) => axios.delete(`${API_URL}/appointments/${id}`),
  getMessages: () => axios.get(`${API_URL}/messages?_t=${Date.now()}`),
  sendMessage: (msg) => axios.post(`${API_URL}/messages`, msg),
  getUsers: () => axios.get(`${API_URL}/users`),

  createUser: (data) => axios.post(`${API_URL}/users`, data),

  deleteUser: (id) => axios.delete(`${API_URL}/users/${id}`),

  updateUser: (id, data) => axios.put(`${API_URL}/users/${id}`, data),

  // Availability
  async getAvailability() {
    const res = await fetch(`${API_URL}/availability`);
    return res.json();
  },

  async addAvailability(data) {
    const res = await fetch(`${API_URL}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteAvailability(id) {
    const res = await fetch(`${API_URL}/availability/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  getChatStatus: (phone) => axios.get(`${API_URL}/chats/status/${encodeURIComponent(phone)}`),
  toggleAiPause: (data) => axios.post(`${API_URL}/chats/toggle-pause`, data),
  updateChatName: (data) => axios.post(`${API_URL}/chats/update-name`, data),

  // Customers/CRM
  async fetchCustomers(params = {}) {
    const queryString = new URLSearchParams({ ...params, _t: Date.now() }).toString();
    const res = await fetch(`${API_URL}/customers?${queryString}`);
    return res.json();
  },

  async fetchCustomer(id) {
    const res = await fetch(`${API_URL}/customers/${id}`);
    return res.json();
  },

  async createCustomer(data) {
    const res = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateCustomer(id, data) {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteCustomer(id) {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async updateCustomerCategory(id, category) {
    const res = await fetch(`${API_URL}/customers/${id}/category`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    });
    return res.json();
  },

  async getCustomerStats() {
    const res = await fetch(`${API_URL}/customers/stats`);
    return res.json();
  },

  // Customer Notes
  async fetchCustomerNotes(customerId) {
    const res = await fetch(`${API_URL}/customers/${customerId}/notes`);
    return res.json();
  },

  async createCustomerNote(customerId, data) {
    const res = await fetch(`${API_URL}/customers/${customerId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateCustomerNote(customerId, noteId, data) {
    const res = await fetch(`${API_URL}/customers/${customerId}/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteCustomerNote(customerId, noteId) {
    const res = await fetch(`${API_URL}/customers/${customerId}/notes/${noteId}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Customer Attachments
  async fetchCustomerAttachments(customerId) {
    const res = await fetch(`${API_URL}/customers/${customerId}/attachments`);
    return res.json();
  },

  async uploadCustomerAttachment(customerId, formData) {
    const res = await fetch(`${API_URL}/customers/${customerId}/attachments`, {
      method: 'POST',
      body: formData, // Don't set Content-Type, let browser set it with boundary
    });
    return res.json();
  },

  async downloadCustomerAttachment(customerId, attachmentId) {
    return `${API_URL}/customers/${customerId}/attachments/${attachmentId}/download`;
  },

  async deleteCustomerAttachment(customerId, attachmentId) {
    const res = await fetch(`${API_URL}/customers/${customerId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Opportunities
  async fetchOpportunities(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/opportunities?${queryString}`);
    return res.json();
  },

  async fetchOpportunity(id) {
    const res = await fetch(`${API_URL}/opportunities/${id}`);
    return res.json();
  },

  async createOpportunity(data) {
    const res = await fetch(`${API_URL}/opportunities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateOpportunity(id, data) {
    const res = await fetch(`${API_URL}/opportunities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateOpportunityStage(id, stage, notes) {
    const res = await fetch(`${API_URL}/opportunities/${id}/stage`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, notes }),
    });
    return res.json();
  },

  async deleteOpportunity(id) {
    const res = await fetch(`${API_URL}/opportunities/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getPipelineStats() {
    const res = await fetch(`${API_URL}/opportunities/pipeline-stats`);
    return res.json();
  }
};
