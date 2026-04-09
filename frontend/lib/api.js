// lib/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL || 'https://real-time-text-editor-0obb.onrender.com'}/api`,
  timeout: 15000,
});

// Request interceptor for auth token - reads fresh on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const auth = JSON.parse(localStorage.getItem('collabflow-auth') || '{}');
      const token = auth?.state?.token;
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
  }
  return config;
});

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('collabflow-auth');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export default api;
