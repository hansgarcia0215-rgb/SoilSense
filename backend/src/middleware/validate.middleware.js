/**
 * validate.middleware.js — Input validation middleware using express-validator
 *
 * What it does:
 *   Checks validation results accumulated by express-validator rules.
 *   If any field failed validation, returns a 422 with all errors.
 *   Otherwise calls next() to proceed to the controller.
 *
 * Why it exists:
 *   Centralizes the "check for validation errors" logic so each route
 *   doesn't need to repeat it.
 *
 * How to use:
 *   const { body } = require('express-validator');
 *   const { validate } = require('../middleware/validate.middleware');
 *
 *   router.post('/example',
 *     [body('email').isEmail(), body('name').notEmpty()],
 *     validate,            ← checks results here
 *     controller.handler
 *   );
 */

const { validationResult } = require('express-validator');

/**
 * Check validation results and reject if any errors exist.
 */
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error:   'VALIDATION_ERROR',
      message: 'Please check your input and try again.',
      // Return all field errors so the frontend can show them per-field
      errors:  errors.array().map(e => ({
        field:   e.path,
        message: e.msg,
      })),
    });
  }

  next();
}

module.exports = { validate };
