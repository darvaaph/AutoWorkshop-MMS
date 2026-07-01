import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use(
  config => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  error => Promise.reject(error)
);

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.includes('/login')
    ) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth-storage');
      document.cookie = 'auth_token=; max-age=0; path=/';
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
