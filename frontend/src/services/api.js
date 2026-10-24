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
// Fetch the Firebase ID token and attach it to every outgoing request.
// Dynamic import prevents a circular dependency at module load time.
api.interceptors.request.use(
  async (config) => {
    try {
      const { auth } = await import('./firebase');
      const token = await auth.currentUser?.getIdToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (_) {}
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────
// On 401, sign out from Firebase, clear the local cache, and redirect.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const { auth } = await import('./firebase');
        await auth.signOut();
      } catch (_) {}
      localStorage.removeItem('soilsense_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
