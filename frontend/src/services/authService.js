/**
 * authService.js — Authentication helpers using Firebase Authentication
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile as firebaseUpdateProfile,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import api from './api';

const authService = {
  /**
   * Register a new farmer account.
   * Creates the Firebase Auth user, sets displayName, then upserts the
   * extended Firestore profile via /auth/sync-profile.
   */
  async register({ displayName, email, password, barangay, municipality, province }) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await firebaseUpdateProfile(user, { displayName });
    await api.post('/auth/sync-profile', {
      displayName,
      barangay,
      municipality,
      province,
      role: 'farmer',
    });
    return { user };
  },

  /**
   * Sign in with email and password.
   * The Firebase token is attached per-request by the api.js interceptor.
   * Fetches the Firestore profile and returns it.
   */
  async login(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
    const response = await api.get('/auth/me');
    return { user: response.data.user };
  },

  /**
   * Sign in with Google popup.
   * Upserts the Firestore profile with upsertOnly so existing roles are preserved.
   */
  async loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const { displayName, email, photoURL } = result.user;
    await api.post('/auth/sync-profile', {
      displayName,
      email,
      photoURL,
      upsertOnly: true,
    });
    const response = await api.get('/auth/me');
    return { user: response.data.user };
  },

  /**
   * Sign out from Firebase and clear local user cache.
   */
  async logout() {
    await signOut(auth);
    localStorage.removeItem('soilsense_user');
  },

  /**
   * Returns a fresh Firebase ID token (auto-refreshed if expired).
   */
  async getToken() {
    return auth.currentUser?.getIdToken() ?? null;
  },

  /**
   * Fetch the full Firestore profile for the current user.
   */
  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Persist profile changes to Firestore via PATCH /api/auth/me.
   * @param {{ displayName?, barangay?, preferredDeviceId? }} fields
   */
  async updateProfile(fields) {
    const response = await api.patch('/auth/me', fields);
    if (response.data.user) {
      localStorage.setItem('soilsense_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /** Read the cached user from localStorage (set by updateStoredUser). */
  getCurrentUser() {
    try {
      const user = localStorage.getItem('soilsense_user');
      return user ? JSON.parse(user) : null;
    } catch { return null; }
  },

  /** Returns true when a Firebase user is currently signed in. */
  isAuthenticated() {
    return !!auth.currentUser;
  },

  /** Write the user object to localStorage so it survives page refresh. */
  updateStoredUser(updatedUser) {
    localStorage.setItem('soilsense_user', JSON.stringify(updatedUser));
  },
};

export default authService;
