import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Job, User, DashboardStats } from '../types';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: async (username: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Jobs APIs
export const jobsAPI = {
  getAll: async (status?: string, search?: string): Promise<Job[]> => {
    const params: any = {};
    if (status && status !== 'All') params.status = status;
    if (search) params.search = search;
    const response = await api.get('/jobs', { params });
    return response.data;
  },
  getOne: async (id: string): Promise<Job> => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },
  create: async (jobData: any): Promise<Job> => {
    const response = await api.post('/jobs', jobData);
    return response.data;
  },
  update: async (id: string, jobData: any): Promise<Job> => {
    const response = await api.put(`/jobs/${id}`, jobData);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/jobs/${id}`);
  },
  updateStatus: async (id: string, status: string, notes?: string): Promise<Job> => {
    const response = await api.put(`/jobs/${id}/status`, { status, notes });
    return response.data;
  },
  addPhoto: async (id: string, base64_data: string, caption?: string, photo_type?: string): Promise<Job> => {
    const response = await api.post(`/jobs/${id}/photos`, { base64_data, caption, photo_type });
    return response.data;
  },
  deletePhoto: async (jobId: string, photoId: string): Promise<Job> => {
    const response = await api.delete(`/jobs/${jobId}/photos/${photoId}`);
    return response.data;
  },
};

// Dashboard APIs
export const dashboardAPI = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
};

// Customer/Contact APIs
export const customersAPI = {
  getAll: async (search?: string): Promise<any[]> => {
    const params: any = {};
    if (search) params.search = search;
    const response = await api.get('/customers', { params });
    return response.data;
  },
  getOne: async (id: string): Promise<any> => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },
  create: async (customerData: any): Promise<any> => {
    const response = await api.post('/customers', customerData);
    return response.data;
  },
  update: async (id: string, customerData: any): Promise<any> => {
    const response = await api.put(`/customers/${id}`, customerData);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/customers/${id}`);
  },
  getJobs: async (id: string): Promise<any[]> => {
    const response = await api.get(`/customers/${id}/jobs`);
    return response.data;
  },
};

// Invoice APIs
export const invoicesAPI = {
  getAll: async (status?: string, search?: string): Promise<any[]> => {
    const params: any = {};
    if (status && status !== 'All') params.status = status;
    if (search) params.search = search;
    const response = await api.get('/invoices', { params });
    return response.data;
  },
  getOne: async (id: string): Promise<any> => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },
  create: async (invoiceData: any): Promise<any> => {
    const response = await api.post('/invoices', invoiceData);
    return response.data;
  },
  createFromJob: async (jobId: string): Promise<any> => {
    const response = await api.post(`/invoices/from-job/${jobId}`);
    return response.data;
  },
  update: async (id: string, invoiceData: any): Promise<any> => {
    const response = await api.put(`/invoices/${id}`, invoiceData);
    return response.data;
  },
  updateStatus: async (id: string, status: string): Promise<void> => {
    await api.put(`/invoices/${id}/status?status=${status}`);
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/invoices/${id}`);
  },
  getStats: async (): Promise<any> => {
    const response = await api.get('/invoices/stats/summary');
    return response.data;
  },
};

// Plate Scanning API
export const scanAPI = {
  scanPlate: async (imageBase64: string): Promise<{ 
    registration: string | null; 
    make: string | null;
    model: string | null;
    color: string | null;
    year: number | null;
    returning_customer: boolean;
    owner_info: { name: string; phone: string; email?: string; address?: string } | null;
    insurance_info: { company: string; policy_number?: string; claim_number?: string } | null;
    previous_jobs_count: number;
    success: boolean; 
    message: string 
  }> => {
    const response = await api.post('/scan-plate', { image_base64: imageBase64 });
    return response.data;
  },
  lookupRego: async (registration: string): Promise<{
    found: boolean;
    registration: string | null;
    car_info: any;
    owner_info: any;
    insurance_info: any;
    previous_jobs_count: number;
    message: string;
  }> => {
    const response = await api.get(`/lookup-rego/${registration}`);
    return response.data;
  },
};

export default api;
