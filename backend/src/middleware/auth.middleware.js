/**
 * auth.middleware.js — Firebase ID token verification
 *
 * Verifies the Firebase ID token from the Authorization header.
 * Fetches the user's extended profile (role, barangay, etc.) from
 * Firestore and attaches it to req.user.
 */

const { auth, db } = require('../firebase/admin');
const { createError } = require('../utils/errorHandler');

const ADMIN_UID = process.env.ADMIN_UID?.trim();

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError(401, 'NO_TOKEN', 'Authentication required. Please sign in.'));
  }

  const token = authHeader.split(' ')[1];
  let decoded;

  try {
    decoded = await auth.verifyIdToken(token);
  } catch (err) {
    if (err.code === 'auth/id-token-expired') {
      return next(createError(401, 'TOKEN_EXPIRED', 'Your session has expired. Please sign in again.'));
    }
    return next(createError(401, 'INVALID_TOKEN', 'Invalid authentication token.'));
  }

  let userDoc;
  try {
    userDoc = await db.collection('users').doc(decoded.uid).get();
  } catch (err) {
    return next(createError(503, 'ACCOUNT_STATUS_UNAVAILABLE',
      'Your account status could not be verified. Please try again.'));
  }

  if (userDoc.exists && userDoc.data().isActive === false) {
    return next(createError(403, 'ACCOUNT_DEACTIVATED',
      'This account has been deactivated. Contact the system administrator.'));
  }

  let role = decoded.uid === ADMIN_UID ? 'admin' : 'farmer';
  if (userDoc.exists) {
    const storedRole = userDoc.data().role || 'farmer';
    role = storedRole === 'researcher' ? 'admin' : storedRole;
  }
  if (decoded.uid === ADMIN_UID) role = 'admin';

  req.user = {
    uid:         decoded.uid,
    email:       decoded.email,
    displayName: decoded.name || decoded.display_name || '',
    role,
  };

  next();
}

module.exports = { authenticate };
