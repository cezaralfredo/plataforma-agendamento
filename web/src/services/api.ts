import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const tenantId = localStorage.getItem('tenantId');
  const tenantSlug = localStorage.getItem('tenantSlug');
  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId;
  } else if (tenantSlug) {
    config.headers['x-tenant-id'] = tenantSlug;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.erro && !error.response.data.error) {
      error.response.data.error = error.response.data.erro;
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('tenantSlug');
      localStorage.removeItem('tenantId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
