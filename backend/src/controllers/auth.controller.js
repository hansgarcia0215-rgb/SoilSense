/**
 * auth.controller.js — Authentication request handlers
 *
 * Handles: sync-profile (upsert after Firebase sign-in), get-profile, update-profile
 *
 * Registration and login are handled entirely by Firebase Authentication.
 * The backend only manages the extended Firestore profile (role, barangay, etc.).
 */

const { db }  = require('../firebase/admin');
const { createError } = require('../utils/errorHandler');
const { MUNICIPALITY, PROVINCE } = require('../utils/roxasConfig');

// ─── Sync Profile ─────────────────────────────────────────────

/**
 * POST /api/auth/sync-profile
 * Called by the frontend immediately after Firebase sign-in or registration
 * to upsert the extended Firestore profile.
 *
 * Body: { displayName?, barangay?, municipality?, province?, photoURL?, upsertOnly? }
 *   - upsertOnly: when true (Google sign-in of existing user), only supplied
 *     fields are updated and role/isActive are never overwritten.
 */
async function syncProfile(req, res, next) {
  try {
    const uid = req.user.uid;
    const { displayName, barangay, municipality, province, photoURL, upsertOnly } = req.body;

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // First sign-in — create the full profile document
      const newUser = {
        uid,
        displayName: displayName?.trim() || req.user.displayName || '',
        email:       req.user.email || '',
        photoURL:    photoURL || '',
        role:        'farmer',
        barangay:    barangay?.trim() || '',
        municipality: municipality || MUNICIPALITY,
        province:     province     || PROVINCE,
        isActive:    true,
        createdAt:   new Date(),
        updatedAt:   new Date(),
      };
      await userRef.set(newUser);
      return res.status(201).json({ success: true, user: safeUser(newUser) });
    }

    // Existing user — update only the supplied fields
    const update = { updatedAt: new Date() };
    if (displayName !== undefined) update.displayName = displayName.trim();
    if (barangay    !== undefined) update.barangay    = barangay.trim();
    if (municipality !== undefined) update.municipality = municipality;
    if (province    !== undefined) update.province    = province;
    if (photoURL    !== undefined) update.photoURL    = photoURL;

    // upsertOnly mode (Google existing user): never touch role or isActive
    if (!upsertOnly && req.body.role) {
      // Role changes are admin-only; ignore any role supplied here
    }

    await userRef.update(update);
    const updatedDoc = await userRef.get();
    return res.json({ success: true, user: safeUser(updatedDoc.data()) });
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
 * Persists safe profile fields. Email, role, isActive cannot change here.
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

// ─── Helpers ─────────────────────────────────────────────────

function safeUser(user) {
  // Strip any legacy passwordHash field that may exist in Firestore documents
  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = { syncProfile, getProfile, updateProfile };
