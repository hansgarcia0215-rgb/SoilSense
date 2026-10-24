function isNotFound(error) {
  return Number(error.code) === 404 || Number(error.statusCode) === 404;
}

function getAssessmentBucketNames(storage) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  return [...new Set([
    storage.bucket().name,
    projectId ? `${projectId}.firebasestorage.app` : null,
    projectId ? `${projectId}.appspot.com` : null,
  ].filter(Boolean))];
}

async function findAssessmentImage(storage, imagePath) {
  if (typeof imagePath !== 'string' || !imagePath.startsWith('soil-images/')) {
    return null;
  }

  for (const bucketName of getAssessmentBucketNames(storage)) {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(imagePath);

    try {
      const [metadata] = await file.getMetadata();
      return { bucket, file, metadata };
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }

  return null;
}

module.exports = { findAssessmentImage };
