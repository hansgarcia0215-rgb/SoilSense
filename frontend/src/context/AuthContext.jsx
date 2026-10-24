/**
 * AuthContext.jsx — Global authentication state
 *
 * What it does:
 *   Provides the current user, login function, logout function, and
 *   loading state to the entire React component tree via Context API.
 *
 * Why it exists:
 *   Without context, every component that needs to know "who is logged in"
 *   would need the user passed down as props. Context makes it available
 *   anywhere in the app without prop drilling.
 *
 * How to use:
 *   Wrap your app with <AuthProvider>.
 *   In any component: const { user, login, logout } = useAuth();
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import authService from '../services/authService';

// Create the context object
const AuthContext = createContext(null);

/**
 * AuthProvider — wraps the app and provides auth state to all children.
 */
export function AuthProvider({ children }) {
  // The currently logged-in user object (or null if not logged in)
  const [user, setUser] = useState(null);

  // Whether we are currently checking auth status (to avoid flash of login page)
  const [loading, setLoading] = useState(true);

  // Subscribe to Firebase Auth state changes — replaces the localStorage check.
  // loading stays true until the first callback fires, which prevents a flash of
  // the unauthenticated UI before Firebase has resolved the session.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const data = await authService.getProfile();
          setUser(data.user);
          authService.updateStoredUser(data.user);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  /**
   * Log in with email and password.
   * Updates state on success.
   */
  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    setUser(data.user);
    return data;
  }, []);

  /**
   * Register a new farmer account.
   * Firebase Auth is created first, then the Firestore profile is synced.
   */
  const register = useCallback(async (userData) => {
    await authService.register(userData);
    const data = await authService.getProfile();
    setUser(data.user);
    return data;
  }, []);

  /**
   * Sign in with Google popup.
   */
  const loginWithGoogle = useCallback(async () => {
    const data = await authService.loginWithGoogle();
    setUser(data.user);
    return data;
  }, []);

  /**
   * Log out the current user.
   * Clears Firebase session and local cache.
   */
  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  /**
   * Update the user in state and storage (e.g. after profile edit).
   */
  const updateUser = useCallback((updatedUser) => {
    authService.updateStoredUser(updatedUser);
    setUser(updatedUser);
  }, []);

  // Helper: check if the current user has a specific role
  const hasRole = useCallback((role) => {
    if (!user) return false;
    if (Array.isArray(role)) return role.includes(user.role);
    return user.role === role;
  }, [user]);

  // Expose values to all children components
  const value = {
    user,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    updateUser,
    hasRole,
    isAuthenticated: !!user,
    isFarmer:            user?.role === 'farmer',
    isExtensionWorker:   user?.role === 'extension_worker',
    isAdmin:             ['researcher', 'admin'].includes(user?.role),
    isResearcherOrAdmin: ['researcher', 'admin'].includes(user?.role),
    // Preferred ESP32 device ID from settings (falls back to default)
    preferredDeviceId: user?.preferredDeviceId || 'SS-ESP32-001',
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Don't render children until Firebase Auth has resolved */}
      {!loading && children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth — custom hook to consume AuthContext.
 * Throws a helpful error if used outside of AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider. Wrap your app with <AuthProvider>.');
  }
  return context;
}

export default AuthContext;
