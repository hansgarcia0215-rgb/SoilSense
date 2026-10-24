/**
 * authService.js — Firebase Authentication service
 *
 * All auth is now handled by Firebase Authentication.
 * After Firebase creates/verifies the user, we sync the extended
 * profile (role, barangay, etc.) to Firestore via the backend.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import api from './api';

const authService = {

  // ─── Register with Email/Password ────────────────────────────
  async register({ displayName, email, password, barangay, municipality, province }) {
    // 1. Create Firebase Auth account
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user       = credential.user;

    // 2. Set displayName on Firebase profile
    await updateProfile(user, { displayName });

    // 3. Get ID token for backend call
    const token = await user.getIdToken();
    localStorage.setItem('soilsense_token', token);

    // 4. Sync extended profile to Firestore via backend
    const res = await api.post('/auth/sync-profile', {
      uid:          user.uid,
      displayName,
      email:        user.email,
      role:         'farmer',
      barangay:     barangay || '',
      municipality: municipality || 'Roxas',
      province:     province     || 'Oriental Mindoro',
    });

    const profile = res.data.user;
    localStorage.setItem('soilsense_user', JSON.stringify(profile));
    return { user: profile, token };
  },

  // ─── Login with Email/Password ────────────────────────────────
  async login(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const token      = await credential.user.getIdToken();
    localStorage.setItem('soilsense_token', token);

    // Fetch extended profile from backend
    const res = await api.get('/auth/me');
    const profile = res.data.user;
    localStorage.setItem('soilsense_user', JSON.stringify(profile));
    return { user: profile, token };
  },

  // ─── Login with Google ────────────────────────────────────────
  async loginWithGoogle() {
    const credential = await signInWithPopup(auth, googleProvider);
    const firebaseUser = credential.user;
    const token        = await firebaseUser.getIdToken();
    localStorage.setItem('soilsense_token', token);

    // Sync profile to Firestore (creates doc if first-time Google login)
    const res = await api.post('/auth/sync-profile', {
      uid:         firebaseUser.uid,
      displayName: firebaseUser.displayName || 'User',
      email:       firebaseUser.email,
      role:        'farmer',          // default role for Google sign-in
      barangay:    '',
      municipality:'Roxas',
      province:    'Oriental Mindoro',
      photoURL:    firebaseUser.photoURL || null,
    });

    const profile = res.data.user;
    localStorage.setItem('soilsense_user', JSON.stringify(profile));
    return { user: profile, token };
  },

  // ─── Logout ───────────────────────────────────────────────────
  async logout() {
    await signOut(auth);
    localStorage.removeItem('soilsense_token');
    localStorage.removeItem('soilsense_user');
  },

  // ─── Password Reset ───────────────────────────────────────────
  async sendPasswordReset(email) {
    await sendPasswordResetEmail(auth, email);
  },

  // ─── Get fresh ID token (auto-refreshes if expired) ──────────
  async getToken() {
    const user = auth.currentUser;
    if (!user) return null;
    const token = await user.getIdToken();
    localStorage.setItem('soilsense_token', token);
    return token;
  },

  // ─── Helpers ─────────────────────────────────────────────────
  getCurrentUser() {
    try {
      const u = localStorage.getItem('soilsense_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  },

  isAuthenticated() {
    return !!auth.currentUser || !!localStorage.getItem('soilsense_token');
  },

  async getProfile() {
    const res = await api.get('/auth/me');
    return res.data;
  },

  async updateProfile(fields) {
    const res = await api.patch('/auth/me', fields);
    if (res.data.user) {
      localStorage.setItem('soilsense_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async changePassword(currentPassword, newPassword) {
    // Firebase handles password change via reauthenticate + updatePassword
    // For simplicity, use sendPasswordResetEmail flow
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    await sendPasswordResetEmail(auth, user.email);
    return { message: 'Password reset email sent to ' + user.email };
  },

  updateStoredUser(updatedUser) {
    localStorage.setItem('soilsense_user', JSON.stringify(updatedUser));
  },
};

export default authService;
