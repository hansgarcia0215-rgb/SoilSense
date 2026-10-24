/**
 * role.middleware.js — Role-based access control middleware
 *
 * What it does:
 *   Checks that the authenticated user's role is in the allowed list.
 *   Must be used AFTER the authenticate middleware.
 *
 * How to use:
 *   const { requireRole } = require('../middleware/role.middleware');
 *
 *   // Only admins can access this route:
 *   router.get('/analytics',
 *     authenticate,
 *     requireRole(['admin']),
 *     analyticsController.getSummary
 *   );
 */

const { createError } = require('../utils/errorHandler');

/**
 * Factory function: returns middleware that checks the user's role.
 * @param {string[]} allowedRoles - Array of roles that can access the route
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'NOT_AUTHENTICATED', 'Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(createError(403, 'FORBIDDEN', `This action requires one of the following roles: ${allowedRoles.join(', ')}.`));
    }

    next();
  };
}

module.exports = { requireRole };
