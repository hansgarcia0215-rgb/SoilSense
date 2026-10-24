/**
 * auth.controller.js — Firebase Auth profile management
 *
 * Login and registration are handled by Firebase Auth client-side.
 * This controller manages the extended profile stored in Firestore
 * (role, barangay, municipality, preferredDeviceId, etc.)
 */

const { db }  = require('../firebase/admin');
const { createError } = require('../utils/errorHandler');
const { MUNICIPALITY, PROVINCE } = require('../utils/roxasConfig');

// ─── Sync Profile ─────────────────────────────────────────────

/**
 * POST /api/auth/sync-profile
 *
 * Called by the frontend immediately after:
 *   - Firebase Email/Password registration
 *   - Google sign-in (first time)
 *
 * Creates or updates the Firestore user document with extended fields
 * that Firebase Auth doesn't store (role, barangay, etc.)
 */
async function syncProfile(req, res, next) {
  try {
    const uid = req.user.uid;
    const {
      displayName, email, barangay,
      municipality, province, photoURL,
    } = req.body;

    // Check if user doc already exists
    const userRef = db.collection('users').doc(uid);
    const existing = await userRef.get();

    if (existing.exists) {
      // Existing user — update only non-sensitive fields
      const update = { updatedAt: new Date() };
      if (displayName) update.displayName = displayName.trim();
      if (barangay !== undefined) update.barangay = barangay;
      await userRef.update(update);
    } else {
      // New user — create full profile document
      const newUser = {
        uid,
        displayName:  (displayName || '').trim(),
        email:        email || req.user.email || '',
        role:         'farmer',
        barangay:     barangay || '',
        municipality: municipality || MUNICIPALITY,
        province:     province    || PROVINCE,
        photoURL:     photoURL || null,
        isActive:     true,
        createdAt:    new Date(),
        updatedAt:    new Date(),
      };
      await userRef.set(newUser);
    }

    const updatedDoc = await userRef.get();
    const userData   = updatedDoc.data();
    // Never return passwordHash (legacy) if it somehow exists
    const { passwordHash, ...safeUser } = userData;

    res.status(existing.exists ? 200 : 201).json({
      success: true,
      user:    safeUser,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get Profile ─────────────────────────────────────────────

/**
 * GET /api/auth/me
 * Returns the current user's Firestore profile.
 */
async function getProfile(req, res, next) {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists) {
      // Profile doesn't exist yet — return basic info from Firebase token
      return res.json({
        success: true,
        user: {
          uid:         req.user.uid,
          email:       req.user.email,
          displayName: req.user.displayName,
          role:        'farmer',
          barangay:    '',
          municipality: MUNICIPALITY,
          province:    PROVINCE,
          isActive:    true,
        },
      });
    }

    const { passwordHash, ...safeUser } = userDoc.data();
    res.json({ success: true, user: safeUser });
  } catch (err) {
    next(err);
  }
}

// ─── Update Profile ───────────────────────────────────────────

/**
 * PATCH /api/auth/me
 * Updates safe profile fields in Firestore.
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
    if (barangay          !== undefined) update.barangay          = barangay.trim();
    if (preferredDeviceId !== undefined) update.preferredDeviceId = String(preferredDeviceId).trim().slice(0, 50);

    await db.collection('users').doc(uid).update(update);

    const updatedDoc = await db.collection('users').doc(uid).get();
    const { passwordHash, ...safeUser } = updatedDoc.data();

    res.json({ success: true, user: safeUser });
  } catch (err) {
    next(err);
  }
}

module.exports = { syncProfile, getProfile, updateProfile };
