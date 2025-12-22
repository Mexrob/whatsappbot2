import axios from 'axios';

const API_URL = '/api';

export const api = {
  login: (credentials) => axios.post(`${API_URL}/login`, credentials),
  getSettings: () => axios.get(`${API_URL}/settings`),
  updateSettings: (settings) => axios.put(`${API_URL}/settings`, settings),
  getAppointments: () => axios.get(`${API_URL}/appointments`),
  createAppointment: (appt) => axios.post(`${API_URL}/appointments`, appt),
  updateAppointment: (id, data) => axios.put(`${API_URL}/appointments/${id}`, data),
  deleteAppointment: (id) => axios.delete(`${API_URL}/appointments/${id}`),
  getMessages: () => axios.get(`${API_URL}/messages`),
  sendMessage: (msg) => axios.post(`${API_URL}/messages`, msg),
};
