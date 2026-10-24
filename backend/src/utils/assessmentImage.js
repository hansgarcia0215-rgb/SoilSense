const { storage } = require('../firebase/admin');
const { randomUUID } = require('crypto');

async function getAssessmentImageUrl(imageData = {}) {
  if (!imageData || !imageData.imagePath) {
    return imageData?.imageUrl || null;
  }

  if (typeof imageData.imagePath !== 'string' || !imageData.imagePath.startsWith('soil-images/')) {
    throw new Error('Assessment image path is invalid.');
  }

  const bucket = storage.bucket();
  const file = bucket.file(imageData.imagePath);
  let metadata;
  try {
    [metadata] = await file.getMetadata();
  } catch (error) {
    if (error.code === 404) {
      console.warn(`[AssessmentImage] Stored image not found: ${imageData.imagePath}`);
      return null;
    }
    throw error;
  }
  let downloadToken = metadata.metadata?.firebaseStorageDownloadTokens
    ?.split(',')[0];

  if (!downloadToken) {
    downloadToken = randomUUID();
    await file.setMetadata({
      metadata: {
        ...metadata.metadata,
        firebaseStorageDownloadTokens: downloadToken,
      },
    });
  }

  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(imageData.imagePath)}?alt=media&token=${downloadToken}`;
}

module.exports = { getAssessmentImageUrl };
