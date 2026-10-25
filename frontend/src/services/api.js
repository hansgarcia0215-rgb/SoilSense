/**
 * api.js — Axios instance with Firebase Auth token interceptor
 *
 * Gets a fresh Firebase ID token on every request (auto-refreshes).
 * Falls back to localStorage token if Firebase user not loaded yet.
 */

import axios from 'axios';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — attach Firebase ID token ──────────
api.interceptors.request.use(
  async (config) => {
    try {
      // Try to get a fresh Firebase token first
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
        localStorage.setItem('soilsense_token', token);
        return config;
      }
    } catch {
      // Firebase not ready — fall through to localStorage
    }

    // Fallback: use cached token from localStorage
    const cached = localStorage.getItem('soilsense_token');
    if (cached) {
      config.headers.Authorization = `Bearer ${cached}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — handle 401 ───────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('soilsense_token');
      localStorage.removeItem('soilsense_user');
      window.location.href = '/login';
    } else if (error.response?.data?.error === 'ACCOUNT_DEACTIVATED') {
      localStorage.removeItem('soilsense_token');
      localStorage.removeItem('soilsense_user');
      signOut(auth).catch(signOutError => {
        console.error('[Auth] Could not sign out deactivated account:', signOutError);
      });
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
