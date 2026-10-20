/**
 * auth.routes.js — Authentication endpoint definitions
 *
 * Routes:
 *   POST  /api/auth/register   → Create new user account
 *   POST  /api/auth/login      → Sign in and get JWT token
 *   GET   /api/auth/me         → Get current user profile
 *   PATCH /api/auth/me         → Update profile (displayName, barangay, preferredDeviceId)
 *   PATCH /api/auth/password   → Change password
 */

const express = require('express');
const { body }  = require('express-validator');
const router    = express.Router();

const { register, login, getProfile, updateProfile, changePassword } =
  require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate }     = require('../middleware/validate.middleware');

// ─── Register ─────────────────────────────────────────────────
router.post('/register',
  [
    body('displayName').trim().notEmpty().withMessage('Full name is required.')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters.'),
    body('email').trim().isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
      .matches(/[0-9]/).withMessage('Password must contain at least one number.'),
    body('role').optional().isIn(['farmer', 'extension_worker', 'researcher', 'admin']).withMessage('Invalid role.'),
    body('barangay').trim().notEmpty().withMessage('Barangay is required.'),
  ],
  validate,
  register
);

// ─── Login ────────────────────────────────────────────────────
router.post('/login',
  [
    body('email').trim().isEmail().withMessage('Please provide a valid email address.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  login
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

// ─── Change Password ──────────────────────────────────────────
router.patch('/password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters.'),
  ],
  validate,
  changePassword
);

module.exports = router;
