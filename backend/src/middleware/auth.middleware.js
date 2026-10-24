/**
 * auth.middleware.js — Firebase ID token verification
 *
 * Verifies the Firebase ID token from the Authorization header.
 * Fetches the user's extended profile (role, barangay, etc.) from
 * Firestore and attaches it to req.user.
 */

const { auth, db } = require('../firebase/admin');
const { createError } = require('../utils/errorHandler');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError(401, 'NO_TOKEN', 'Authentication required. Please sign in.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify Firebase ID token
    const decoded = await auth.verifyIdToken(token);

    // Fetch extended profile from Firestore (for role, barangay, etc.)
    let role = 'farmer';
    try {
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      if (userDoc.exists) {
        role = userDoc.data().role || 'farmer';
      }
    } catch {
      // Profile not found yet — use default role
    }

    req.user = {
      uid:         decoded.uid,
      email:       decoded.email,
      displayName: decoded.name || decoded.display_name || '',
      role,
    };

    next();
  } catch (err) {
    if (err.code === 'auth/id-token-expired') {
      return next(createError(401, 'TOKEN_EXPIRED', 'Your session has expired. Please sign in again.'));
    }
    return next(createError(401, 'INVALID_TOKEN', 'Invalid authentication token.'));
  }
}

module.exports = { authenticate };
