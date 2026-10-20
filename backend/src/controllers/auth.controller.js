/**
 * auth.controller.js — Authentication request handlers
 *
 * Handles: register, login, get-profile (me), update-profile (me), change-password
 *
 * Passwords are hashed with bcryptjs. Plain-text passwords are NEVER stored.
 * JWT contains { uid, email, role, displayName }.
 */

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { db }  = require('../firebase/admin');
const { createError } = require('../utils/errorHandler');
const { MUNICIPALITY, PROVINCE } = require('../utils/roxasConfig');

const SALT_ROUNDS = 12;

// ─── Register ────────────────────────────────────────────────

async function register(req, res, next) {
  try {
    const { displayName, email, password, role, barangay, municipality, province } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const existingQuery = await db.collection('users')
      .where('email', '==', normalizedEmail).limit(1).get();

    if (!existingQuery.empty) {
      return next(createError(409, 'EMAIL_EXISTS',
        'This email address is already registered. Please sign in instead.'));
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userRef = db.collection('users').doc();
    const userId  = userRef.id;

    // Municipality and province are ALWAYS Roxas, Oriental Mindoro —
    // the only service area. Any client-supplied override is ignored.
    const newUser = {
      uid: userId, displayName: displayName.trim(), email: normalizedEmail,
      passwordHash, role: role || 'farmer', barangay: barangay || '',
      municipality: MUNICIPALITY, province: PROVINCE,
      isActive: true, createdAt: new Date(), updatedAt: new Date(),
    };

    await userRef.set(newUser);
    const token = signToken(newUser);
    res.status(201).json({ success: true, token, user: safeUser(newUser) });
  } catch (err) { next(err); }
}

// ─── Login ───────────────────────────────────────────────────

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const query = await db.collection('users')
      .where('email', '==', normalizedEmail).limit(1).get();

    if (query.empty) {
      return next(createError(401, 'INVALID_CREDENTIALS', 'Invalid credentials.'));
    }

    const userDoc  = query.docs[0];
    const userData = userDoc.data();

    if (!userData.isActive) {
      return next(createError(403, 'ACCOUNT_DISABLED',
        'Your account has been disabled. Please contact the administrator.'));
    }

    const passwordMatch = await bcrypt.compare(password, userData.passwordHash);
    if (!passwordMatch) {
      return next(createError(401, 'INVALID_CREDENTIALS', 'Invalid credentials.'));
    }

    await userDoc.ref.update({ lastLoginAt: new Date() });
    const token = signToken(userData);
    res.json({ success: true, token, user: safeUser(userData) });
  } catch (err) { next(err); }
}

// ─── Get Profile ─────────────────────────────────────────────

async function getProfile(req, res, next) {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return next(createError(404, 'USER_NOT_FOUND', 'User profile not found.'));
    }
    res.json({ success: true, user: safeUser(userDoc.data()) });
  } catch (err) { next(err); }
}

// ─── Update Profile ───────────────────────────────────────────

/**
 * PATCH /api/auth/me
 * Body: { displayName?, barangay?, preferredDeviceId? }
 * Persists safe profile fields. Email, role, passwordHash cannot change here.
 */
async function updateProfile(req, res, next) {
  try {
    const uid = req.user.uid;
    const { displayName, barangay, preferredDeviceId } = req.body;

    const update = { updatedAt: new Date() };

    if (displayName !== undefined) {
      const trimmed = displayName.trim();
      if (!trimmed || trimmed.length < 2 || trimmed.length > 100) {
        return next(createError(422, 'INVALID_NAME', 'Name must be 2–100 characters.'));
      }
      update.displayName = trimmed;
    }

    if (barangay !== undefined) {
      update.barangay = barangay.trim();
    }

    if (preferredDeviceId !== undefined) {
      update.preferredDeviceId = String(preferredDeviceId).trim().slice(0, 50);
    }

    await db.collection('users').doc(uid).update(update);

    const updatedDoc = await db.collection('users').doc(uid).get();
    res.json({ success: true, user: safeUser(updatedDoc.data()) });
  } catch (err) { next(err); }
}

// ─── Change Password ──────────────────────────────────────────

/**
 * PATCH /api/auth/password
 * Body: { currentPassword, newPassword }
 */
async function changePassword(req, res, next) {
  try {
    const uid = req.user.uid;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(createError(422, 'MISSING_FIELDS', 'Both current and new password are required.'));
    }
    if (newPassword.length < 8) {
      return next(createError(422, 'WEAK_PASSWORD', 'New password must be at least 8 characters.'));
    }

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return next(createError(404, 'USER_NOT_FOUND', 'User not found.'));
    }

    const userData = userDoc.data();
    const passwordMatch = await bcrypt.compare(currentPassword, userData.passwordHash);
    if (!passwordMatch) {
      return next(createError(401, 'WRONG_PASSWORD', 'Current password is incorrect.'));
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.collection('users').doc(uid).update({ passwordHash: newHash, updatedAt: new Date() });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) { next(err); }
}

// ─── Helpers ─────────────────────────────────────────────────

function signToken(user) {
  return jwt.sign(
    { uid: user.uid, email: user.email, role: user.role, displayName: user.displayName },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function safeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = { register, login, getProfile, updateProfile, changePassword };
