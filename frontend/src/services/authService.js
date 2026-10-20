/**
 * authService.js — Authentication API calls
 */

import api from './api';

const authService = {
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('soilsense_token', response.data.token);
      localStorage.setItem('soilsense_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('soilsense_token', response.data.token);
      localStorage.setItem('soilsense_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout() {
    localStorage.removeItem('soilsense_token');
    localStorage.removeItem('soilsense_user');
  },

  /**
   * Persist profile changes to Firestore via PATCH /api/auth/me
   * @param {{ displayName?, barangay?, preferredDeviceId? }} fields
   */
  async updateProfile(fields) {
    const response = await api.patch('/auth/me', fields);
    if (response.data.user) {
      localStorage.setItem('soilsense_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Change user password
   * @param {string} currentPassword
   * @param {string} newPassword
   */
  async changePassword(currentPassword, newPassword) {
    const response = await api.patch('/auth/password', { currentPassword, newPassword });
    return response.data;
  },

  getCurrentUser() {
    try {
      const user = localStorage.getItem('soilsense_user');
      return user ? JSON.parse(user) : null;
    } catch { return null; }
  },

  getToken()        { return localStorage.getItem('soilsense_token'); },
  isAuthenticated() { return !!this.getToken(); },

  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateStoredUser(updatedUser) {
    localStorage.setItem('soilsense_user', JSON.stringify(updatedUser));
  },
};

export default authService;
