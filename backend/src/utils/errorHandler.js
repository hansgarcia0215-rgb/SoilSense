/**
 * errorHandler.js — Centralized Express error handling middleware
 *
 * What it does:
 *   Catches all errors thrown in route handlers and returns a consistent
 *   JSON error response. Prevents stack traces from leaking to clients.
 *
 * Why it exists:
 *   Without centralized error handling, each route would need its own
 *   try/catch and error formatting logic.
 *
 * How to use:
 *   Add as the LAST middleware in app.js:
 *   app.use(errorHandler);
 */

/**
 * Express error-handling middleware.
 * Signature must have 4 parameters (err, req, res, next) for Express to
 * recognize it as an error handler.
 */
function errorHandler(err, req, res, next) {
  // Log the error server-side for debugging
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Determine HTTP status code
  const statusCode = err.statusCode || err.status || 500;

  // Build the error response
  const response = {
    success: false,
    error:   err.code   || 'SERVER_ERROR',
    message: err.message || 'An unexpected error occurred. Please try again.',
  };

  // Only include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Create a structured API error.
 * Usage: throw createError(400, 'INVALID_INPUT', 'pH must be between 0 and 14');
 *
 * @param {number} statusCode HTTP status code
 * @param {string} code       Machine-readable error code
 * @param {string} message    Human-readable error message
 */
function createError(statusCode, code, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

module.exports = { errorHandler, createError };
