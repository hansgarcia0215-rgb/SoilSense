const { storage } = require('../firebase/admin');

const IMAGE_URL_EXPIRATION_MS = 60 * 60 * 1000;

async function getAssessmentImageUrl(imageData = {}) {
  if (!imageData || !imageData.imagePath) {
    return imageData?.imageUrl || null;
  }

  if (typeof imageData.imagePath !== 'string' || !imageData.imagePath.startsWith('soil-images/')) {
    throw new Error('Assessment image path is invalid.');
  }

  const [url] = await storage.bucket().file(imageData.imagePath).getSignedUrl({
    action: 'read',
    expires: Date.now() + IMAGE_URL_EXPIRATION_MS,
  });

  return url;
}

module.exports = { getAssessmentImageUrl };
