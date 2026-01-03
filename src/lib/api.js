import axios from 'axios';

const API_URL = '/api';

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
  async getUsers() {
    const res = await fetch(`${API_URL}/users`);
    return res.json();
  },

  async createUser(data) {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteUser(id) {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async updateUser(id, data) {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

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
  updateChatName: (data) => axios.post(`${API_URL}/chats/update-name`, data)
};
