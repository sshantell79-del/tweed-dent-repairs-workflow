import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (username, email, password) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Jobs API
export const jobsAPI = {
  getAll: async (params) => {
    const response = await api.get('/jobs', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/jobs', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/jobs/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.put(`/jobs/${id}/status`, { status });
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
};

// Customers API
export const customersAPI = {
  getAll: async () => {
    const response = await api.get('/customers');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/customers', data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  },
};

// Quotes API
export const quotesAPI = {
  getAll: async () => {
    const response = await api.get('/quotes');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/quotes', data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/quotes/${id}`);
    return response.data;
  },
  getPanelPricing: async () => {
    const response = await api.get('/panel-pricing');
    return response.data;
  },
};

// Invoices API
export const invoicesAPI = {
  getAll: async () => {
    const response = await api.get('/invoices');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/invoices', data);
    return response.data;
  },
};

// Scan API
export const scanAPI = {
  scanPlate: async (imageBase64) => {
    const response = await api.post('/scan-plate', { image_base64: imageBase64 });
    return response.data;
  },
  analyzeDamage: async (imageBase64) => {
    const response = await api.post('/analyze-damage', { image_base64: imageBase64 });
    return response.data;
  },
};

// Xero API
export const xeroAPI = {
  getStatus: async () => {
    const response = await api.get('/xero/status');
    return response.data;
  },
  getAuthUrl: async () => {
    const response = await api.get('/xero/auth');
    return response.data;
  },
  syncInvoice: async (invoiceId) => {
    const response = await api.post(`/xero/sync_invoice/${invoiceId}`);
    return response.data;
  },
};

export default api;
