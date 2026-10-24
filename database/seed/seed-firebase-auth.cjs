/**
 * seed-firebase-auth.cjs — Create demo Firebase Auth accounts
 *
 * Run this once after seed.cjs to create the matching Firebase Auth
 * records so demo users can sign in via the login page.
 *
 * Usage:
 *   node database/seed/seed-firebase-auth.cjs
 *   (or: cd backend && npm run seed:auth)
 *
 * Safe to run multiple times — existing accounts are skipped gracefully.
 */

require('dotenv').config({ path: `${__dirname}/../../backend/.env` });

const BACKEND_MODULES = `${__dirname}/../../backend/node_modules`;
const admin = require(`${BACKEND_MODULES}/firebase-admin`);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const DEMO_USERS = [
  {
    uid:         'demo-farmer-001',
    email:       'farmer@soilsense.demo',
    password:    'Demo1234!',
    displayName: 'Juan dela Cruz',
  },
  {
    uid:         'demo-ext-001',
    email:       'extension@soilsense.demo',
    password:    'Demo1234!',
    displayName: 'Maria Santos',
  },
  {
    uid:         'demo-researcher-001',
    email:       'researcher@soilsense.demo',
    password:    'Demo1234!',
    displayName: 'Dr. Ana Reyes',
  },
];

async function seed() {
  for (const user of DEMO_USERS) {
    try {
      await admin.auth().createUser(user);
      console.log(`✓ Created: ${user.email}`);
    } catch (err) {
      if (
        err.code === 'auth/uid-already-exists' ||
        err.code === 'auth/email-already-exists'
      ) {
        console.log(`⚠ Already exists: ${user.email} — skipping`);
      } else {
        throw err;
      }
    }
  }
  console.log('\nDone. Demo Firebase Auth accounts are ready.');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
