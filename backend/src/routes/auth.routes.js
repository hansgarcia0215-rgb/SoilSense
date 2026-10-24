/**
 * auth.routes.js — Authentication endpoint definitions
 *
 * Routes:
 *   POST  /api/auth/sync-profile → Upsert Firestore profile after Firebase sign-in
 *   GET   /api/auth/me           → Get current user profile
 *   PATCH /api/auth/me           → Update profile (displayName, barangay, preferredDeviceId)
 *
 * Registration and login are handled by Firebase Authentication on the client.
 * The old /register, /login, and /password routes have been removed.
 */

const express = require('express');
const { body }  = require('express-validator');
const router    = express.Router();

const { syncProfile, getProfile, updateProfile } =
  require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate }     = require('../middleware/validate.middleware');

// ─── Sync Profile ─────────────────────────────────────────────
// Upsert the Firestore profile after Firebase creates or signs in a user.
router.post('/sync-profile',
  authenticate,
  [
    body('displayName').optional().trim()
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters.'),
    body('barangay').optional().trim(),
    body('municipality').optional().trim(),
    body('province').optional().trim(),
  ],
  validate,
  syncProfile
);

// ─── Get Profile ──────────────────────────────────────────────
router.get('/me', authenticate, getProfile);

// ─── Update Profile (persists to Firestore) ───────────────────
router.patch('/me',
  authenticate,
  [
    body('displayName').optional().trim()
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters.'),
    body('barangay').optional().trim(),
    body('preferredDeviceId').optional().trim()
      .isLength({ max: 50 }).withMessage('Device ID too long.'),
  ],
  validate,
  updateProfile
);

module.exports = router;
