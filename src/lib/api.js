import axios from 'axios';

const API_URL = '/api';

export const api = {
  login: (credentials) => axios.post(`${API_URL}/login`, credentials),
  getSettings: () => axios.get(`${API_URL}/settings`),
  updateSettings: (settings) => axios.put(`${API_URL}/settings`, settings),
  getAppointments: () => axios.get(`${API_URL}/appointments?_t=${Date.now()}`),
  createAppointment: (appt) => axios.post(`${API_URL}/appointments`, appt),
  updateAppointment: (id, data) => axios.put(`${API_URL}/appointments/${id}`, data),
  deleteAppointment: (id) => axios.delete(`${API_URL}/appointments/${id}`),
  getMessages: () => axios.get(`${API_URL}/messages?_t=${Date.now()}`),
  sendMessage: (msg) => axios.post(`${API_URL}/messages`, msg),
  getUsers: () => axios.get(`${API_URL}/users`),
  createUser: (user) => axios.post(`${API_URL}/users`, user),
  deleteUser: (id) => axios.delete(`${API_URL}/users/${id}`),
};
