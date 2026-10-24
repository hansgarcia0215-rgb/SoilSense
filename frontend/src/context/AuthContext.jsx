/**
 * AuthContext.jsx — Firebase Auth state management
 *
 * Uses onAuthStateChanged to track the logged-in Firebase user.
 * Fetches the extended profile (role, barangay, etc.) from Firestore
 * via the backend on every auth state change.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged }  from 'firebase/auth';
import { auth }                from '../services/firebase';
import authService             from '../services/authService';
import api                     from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);  // true until Firebase resolves

  useEffect(() => {
    // onAuthStateChanged fires once immediately with the current auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get fresh ID token and store it
          const token = await firebaseUser.getIdToken();
          localStorage.setItem('soilsense_token', token);

          // Fetch extended profile (role, barangay, etc.) from backend
          const res     = await api.get('/auth/me');
          const profile = res.data.user;
          localStorage.setItem('soilsense_user', JSON.stringify(profile));
          setUser(profile);
        } catch (err) {
          console.error('[Auth] Failed to fetch profile:', err.message);
          // Firebase user exists but no Firestore profile yet — use Firebase data
          setUser({
            uid:         firebaseUser.uid,
            email:       firebaseUser.email,
            displayName: firebaseUser.displayName || 'User',
            role:        'farmer',
            photoURL:    firebaseUser.photoURL || null,
          });
        }
      } else {
        // No Firebase user — clear everything
        localStorage.removeItem('soilsense_token');
        localStorage.removeItem('soilsense_user');
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    setUser(data.user);
    return data;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const data = await authService.loginWithGoogle();
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (userData) => {
    const data = await authService.register(userData);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    authService.updateStoredUser(updatedUser);
    setUser(updatedUser);
  }, []);

  const hasRole = useCallback((role) => {
    if (!user) return false;
    return Array.isArray(role) ? role.includes(user.role) : user.role === role;
  }, [user]);

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    register,
    logout,
    updateUser,
    hasRole,
    isAuthenticated:    !!user,
    isFarmer:           user?.role === 'farmer',
    isExtensionWorker:  user?.role === 'extension_worker',
    isResearcher:       user?.role === 'researcher',
    isAdmin:            user?.role === 'admin',
    isResearcherOrAdmin: ['researcher', 'admin'].includes(user?.role),
    preferredDeviceId:  user?.preferredDeviceId || 'SS-ESP32-001',
  };

  // Show nothing until Firebase resolves auth state (prevents flash of login)
  if (loading) return null;

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be inside AuthProvider');
  return context;
}

export default AuthContext;
