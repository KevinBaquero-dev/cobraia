import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — agrega token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('cobraia-auth');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    }
  }
  return config;
});

// Response interceptor — refresca token
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const stored = localStorage.getItem('cobraia-auth');
        if (!stored) throw new Error('No auth');

        const { state } = JSON.parse(stored);
        if (!state?.refreshToken) throw new Error('No refresh token');

        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken: state.refreshToken }
        );

        const { accessToken, refreshToken } = res.data.data;

        // Actualizar store
        const current = JSON.parse(localStorage.getItem('cobraia-auth') || '{}');
        current.state.accessToken = accessToken;
        current.state.refreshToken = refreshToken;
        localStorage.setItem('cobraia-auth', JSON.stringify(current));

        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('cobraia-auth');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);

export default api;

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
};

// Tenants
export const tenantsApi = {
  getMe: () => api.get('/tenants/me'),
  update: (data: any) => api.patch('/tenants/me', data),
  getTemplates: () => api.get('/tenants/templates'),
  completeOnboarding: () => api.post('/tenants/me/complete-onboarding'),
};

// Clients
export const clientsApi = {
  list: (params?: any) => api.get('/clients', { params }),
  get: (id: string) => api.get(`/clients/${id}`),
  create: (data: any) => api.post('/clients', data),
  update: (id: string, data: any) => api.patch(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

// Invoices
export const invoicesApi = {
  list: (params?: any) => api.get('/invoices', { params }),
  get: (id: string) => api.get(`/invoices/${id}`),
  create: (data: any) => api.post('/invoices', data),
  update: (id: string, data: any) => api.patch(`/invoices/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/invoices/${id}/status`, { status }),
  generatePdf: (id: string) => api.post(`/invoices/${id}/pdf`),
  duplicate: (id: string) => api.post(`/invoices/${id}/duplicate`),
};

// Statements
export const statementsApi = {
  preview: (params: any) => api.get('/statements/preview', { params }),
  generate: (data: any) => api.post('/statements/generate', data),
};

// Subscriptions
export const subscriptionsApi = {
  getPlans: () => api.get('/subscriptions/plans'),
  getCurrent: () => api.get('/subscriptions/current'),
  checkout: (plan: string) => api.post('/subscriptions/checkout', { plan }),
  cancel: () => api.delete('/subscriptions/cancel'),
};

// Chat
export const chatApi = {
  sendMessage: (message: string, conversationId?: string) =>
    api.post('/chat/message', { message, conversationId }),
  getHistory: () => api.get('/chat/history'),
  clearHistory: () => api.delete('/chat/history'),
};