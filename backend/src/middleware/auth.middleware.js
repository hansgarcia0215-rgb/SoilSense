/**
 * auth.middleware.js — JWT authentication middleware
 *
 * What it does:
 *   Reads the JWT token from the Authorization header,
 *   verifies it, and attaches the decoded user object to req.user.
 *
 * Why it exists:
 *   Every protected route needs to know who is making the request.
 *   This middleware handles that check in one place.
 *
 * How to use:
 *   const { authenticate } = require('../middleware/auth.middleware');
 *   router.get('/protected', authenticate, (req, res) => { ... });
 */

const jwt = require('jsonwebtoken');
const { createError } = require('../utils/errorHandler');

/**
 * Middleware: verify JWT and attach user to request.
 * Rejects with 401 if token is missing, invalid, or expired.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  // Check for "Bearer <token>" format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError(401, 'NO_TOKEN', 'Authentication required. Please sign in.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach the decoded user payload to the request object
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(createError(401, 'TOKEN_EXPIRED', 'Your session has expired. Please sign in again.'));
    }
    return next(createError(401, 'INVALID_TOKEN', 'Invalid authentication token.'));
  }
}

module.exports = { authenticate };
