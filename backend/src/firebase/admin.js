/**
 * admin.js — Firebase Admin SDK initialization
 *
 * What it does:
 *   Initializes the Firebase Admin SDK using service account credentials
 *   from environment variables. Exports the admin instance, Firestore,
 *   and Storage for use throughout the backend.
 *
 * Why it exists:
 *   The Admin SDK allows the backend to securely read/write Firestore,
 *   verify Firebase Auth tokens, and manage Storage — all server-side.
 *
 * How to configure:
 *   Set FIREBASE_* environment variables in .env
 *   (from Firebase Console > Project Settings > Service Accounts)
 */

const admin = require('firebase-admin');
const { createPrivateKey } = require('crypto');

// Only initialize once — prevents duplicate app error during hot reload
if (!admin.apps.length) {
  // Validate that required env vars are set before attempting to initialize
  const missingVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']
    .filter(v => !process.env[v] || process.env[v].startsWith('your-'));

  if (missingVars.length > 0) {
    console.error('\n❌ [Firebase] Missing or placeholder credentials detected.');
    console.error('   Missing/placeholder vars:', missingVars.join(', '));
    console.error('\n   To fix this:');
    console.error('   1. Go to Firebase Console → Project Settings → Service Accounts');
    console.error('   2. Click "Generate new private key"');
    console.error('   3. Copy the values into backend/.env\n');
    // In development, throw a clear error; in production this should be fatal
    if (process.env.NODE_ENV === 'production') process.exit(1);
    // Development: throw so the server startup shows a clear error
    throw new Error('Firebase credentials not configured. See backend/.env for instructions.');
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    .replace(/\\n/g, '\n')
    .trim();

  try {
    createPrivateKey(privateKey);
  } catch {
    throw new Error(
      'FIREBASE_PRIVATE_KEY is not a valid PEM key. Copy the private_key value from a Firebase service account JSON file into backend/.env, preserving its BEGIN/END lines and replacing escaped \\n with newlines.'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:    process.env.FIREBASE_PROJECT_ID,
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const db      = admin.firestore();   // Firestore database instance
const storage = admin.storage();     // Cloud Storage instance
const auth    = admin.auth();        // Firebase Auth admin instance

module.exports = { admin, db, storage, auth };
