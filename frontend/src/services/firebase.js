/**
 * firebase.js — Firebase client initialization
 *
 * What it does:
 *   Initializes the Firebase app using environment variables from .env
 *   and exports the auth and storage instances used throughout the frontend.
 *
 * Why it exists:
 *   All Firebase SDK calls (login, register, storage uploads) need a
 *   single initialized app instance to share. Centralizing here prevents
 *   multiple initializations and keeps credentials in one place.
 *
 * How to configure:
 *   Set the VITE_FIREBASE_* variables in your .env file.
 *   Get these values from Firebase Console > Project Settings > Your Apps.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration — pulled from environment variables
// NEVER hard-code these values directly in the source code
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize the Firebase application
const app = initializeApp(firebaseConfig);

// Export individual Firebase services
export const auth    = getAuth(app);       // For login, register, logout
export const storage = getStorage(app);    // For soil image uploads
export const db      = getFirestore(app);  // For direct Firestore access (optional)
export const googleProvider = new GoogleAuthProvider(); // For Google sign-in

export default app;
