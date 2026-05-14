import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/api',
  timeout: 20000,
  withCredentials: true, // send httpOnly cookie
});

// Request interceptor — inject token from localStorage as fallback
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ss_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Clear stale credentials and redirect to login
      localStorage.removeItem('ss_token');
      localStorage.removeItem('ss_shop');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
