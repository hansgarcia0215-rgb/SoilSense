/**
 * auth.middleware.js — Firebase Admin token verification middleware
 *
 * What it does:
 *   Reads the Firebase ID token from the Authorization header,
 *   verifies it with the Admin SDK, fetches the user's role from
 *   Firestore, and attaches the user object to req.user.
 *
 * Why it exists:
 *   Every protected route needs to know who is making the request.
 *   This middleware handles that check in one place.
 *
 * How to use:
 *   const { authenticate } = require('../middleware/auth.middleware');
 *   router.get('/protected', authenticate, (req, res) => { ... });
 */

const { auth, db } = require('../firebase/admin');
const { createError } = require('../utils/errorHandler');

/**
 * Middleware: verify Firebase ID token and attach user to request.
 * Rejects with 401 if token is missing, invalid, or expired.
 * Rejects with 403 if the account is disabled.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError(401, 'NO_TOKEN', 'Authentication required. Please sign in.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await auth.verifyIdToken(token);

    // Fetch role and active status from Firestore — not embedded in the token
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      return next(createError(401, 'PROFILE_NOT_FOUND', 'User profile not found. Please complete registration.'));
    }

    const profile = userDoc.data();
    if (!profile.isActive) {
      return next(createError(403, 'ACCOUNT_DISABLED', 'Your account has been disabled.'));
    }

    req.user = {
      uid:         decoded.uid,
      email:       decoded.email,
      role:        profile.role,
      displayName: profile.displayName,
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
