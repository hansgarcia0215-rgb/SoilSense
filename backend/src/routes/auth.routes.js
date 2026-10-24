/**
 * auth.routes.js — Firebase Auth-based authentication routes
 *
 * Login/Register are handled client-side by Firebase Auth SDK.
 * These routes handle the extended profile stored in Firestore.
 *
 * Routes:
 *   POST  /api/auth/sync-profile  → Create/update user profile in Firestore (called after Firebase login/register)
 *   GET   /api/auth/me            → Get current user's Firestore profile
 *   PATCH /api/auth/me            → Update profile (displayName, barangay, preferredDeviceId)
 */

const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();

const { syncProfile, getProfile, updateProfile } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate }     = require('../middleware/validate.middleware');

// ─── Sync profile to Firestore ────────────────────────────────
// Called by frontend immediately after Firebase register or Google login
// to create/update the extended profile document in Firestore.
router.post('/sync-profile',
  authenticate,
  [
    body('displayName').trim().notEmpty().withMessage('Display name is required.')
      .isLength({ max: 100 }),
    body('role').optional().isIn(['farmer','extension_worker','researcher','admin']),
    body('barangay').optional().trim(),
  ],
  validate,
  syncProfile
);

// ─── Get profile ──────────────────────────────────────────────
router.get('/me', authenticate, getProfile);

// ─── Update profile ───────────────────────────────────────────
router.patch('/me',
  authenticate,
  [
    body('displayName').optional().trim().isLength({ min: 2, max: 100 }),
    body('barangay').optional().trim(),
    body('preferredDeviceId').optional().trim().isLength({ max: 50 }),
  ],
  validate,
  updateProfile
);

module.exports = router;
