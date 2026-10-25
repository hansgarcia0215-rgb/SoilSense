const sharp = require('sharp');

const MAX_STORED_IMAGE_BYTES = 450 * 1024;
const MAX_ASSESSMENT_DOCUMENT_BYTES = 900 * 1024;
const COMPRESSION_ATTEMPTS = [
  { size: 1280, quality: 72 },
  { size: 1280, quality: 58 },
  { size: 1024, quality: 55 },
  { size: 800, quality: 50 },
];

async function compressAssessmentImage(imageBuffer) {
  for (const attempt of COMPRESSION_ATTEMPTS) {
    const compressed = await sharp(imageBuffer, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({
        width: attempt.size,
        height: attempt.size,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: attempt.quality, mozjpeg: true })
      .toBuffer();

    if (compressed.length <= MAX_STORED_IMAGE_BYTES) {
      return {
        imageBase64: compressed.toString('base64'),
        imageMimeType: 'image/jpeg',
        imageSizeBytes: compressed.length,
      };
    }
  }

  const error = new Error('Compressed photo is too large for Firestore.');
  error.code = 'IMAGE_TOO_LARGE';
  throw error;
}

function getAssessmentImageMetadata(imageData = {}) {
  const data = imageData || {};
  return {
    imageId: data.imageId || null,
    imagePath: data.imagePath || null,
    imageMimeType: data.imageMimeType || null,
    imageSizeBytes: data.imageSizeBytes || null,
    hasImage: Boolean(data.imageBase64 || data.imagePath || data.imageUrl),
  };
}

module.exports = {
  compressAssessmentImage,
  getAssessmentImageMetadata,
  MAX_STORED_IMAGE_BYTES,
  MAX_ASSESSMENT_DOCUMENT_BYTES,
};
