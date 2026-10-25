/**
 * upload.middleware.js — File upload configuration using Multer
 *
 * What it does:
 *   Configures Multer to:
 *   - Accept only JPEG and PNG image files
 *   - Reject files over MAX_IMAGE_SIZE_MB
 *   - Store files in memory (as Buffer) for compression and analysis
 *
 * Why memory storage (not disk)?
 *   The buffer is compressed and saved in Firestore without a temporary file.
 */

const multer = require('multer');
const { createError } = require('../utils/errorHandler');

// Maximum file size in bytes (from env, default 10 MB)
const MAX_SIZE_MB  = parseInt(process.env.MAX_IMAGE_SIZE_MB || '10', 10);
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

// Store files in memory as Buffer objects for image compression.
const storage = multer.memoryStorage();

/**
 * File filter — reject anything that is not a JPEG or PNG.
 */
function fileFilter(req, file, callback) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    // Pass an error to Multer to reject the file
    callback(
      createError(400, 'INVALID_FILE_TYPE', 'Only JPEG and PNG soil images are accepted.'),
      false
    );
  } else {
    callback(null, true); // Accept the file
  }
}

/**
 * uploadSoilImage — Multer middleware for a single soil image.
 * Field name in the form must be "image".
 */
const uploadSoilImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE_BYTES,
    files: 1,
  },
}).single('image');

/**
 * Wrapper that converts Multer errors to our standard error format.
 */
function handleSoilImageUpload(req, res, next) {
  uploadSoilImage(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(createError(400, 'FILE_TOO_LARGE',
        `Image must be smaller than ${MAX_SIZE_MB} MB. Please compress or resize the image.`));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(createError(400, 'TOO_MANY_FILES', 'Only one soil image can be uploaded at a time.'));
    }
    // Pass through errors from fileFilter and other Multer errors
    next(err);
  });
}

module.exports = { handleSoilImageUpload };
