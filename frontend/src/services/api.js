/**
 * api.js — Axios instance and request/response interceptors
 *
 * In development the Vite proxy forwards /api/* to localhost:3001.
 * We use a relative baseURL ('/api') so requests go through the proxy.
 * In production set VITE_API_BASE_URL to the deployed backend URL + /api.
 */

import axios from 'axios';

// Use relative /api in dev (goes through Vite proxy → localhost:3001/api)
// Use absolute URL in production (set VITE_API_BASE_URL in .env)
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ──────────────────────────────────────
// Attach JWT token to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('soilsense_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────
// On 401, clear session and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('soilsense_token');
      localStorage.removeItem('soilsense_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
