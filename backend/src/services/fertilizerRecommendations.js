const { db } = require('../firebase/admin');

const BASE_GUIDANCE = {
  poor: {
    summary: 'The screening result indicates poor soil fertility. Confirm the result with a laboratory soil test before choosing fertilizer.',
    fertilizerGuidance: 'Do not choose a fertilizer type or application rate from this screening result alone. Use laboratory N-P-K results and local crop guidance.',
    recommendedActions: [
      'Request a soil test that includes pH and available nitrogen, phosphorus, and potassium.',
      'Maintain or gradually add well-composted organic matter where appropriate for the crop.',
      'Ask the municipal agriculture office to interpret the soil test and advise on any pH correction before applying lime or fertilizer.',
    ],
    avoidActions: [
      'Avoid applying lime or concentrated fertilizer based only on the image or fertility class.',
      'Avoid applying an unverified fertilizer rate.',
    ],
    retestRecommendation: 'Use a laboratory soil test before fertilizer application, then follow the local extension officer’s retest schedule.',
  },
  moderate: {
    summary: 'The screening result indicates moderate soil fertility. For the top-ranked crop, use crop-specific nutrient guidance and confirm nutrient needs with a soil test.',
    fertilizerGuidance: 'This assessment does not measure soil N-P-K, so it cannot identify a fertilizer formulation or safe application rate. Base fertilizer selection and amount on a laboratory soil test and local crop recommendations.',
    recommendedActions: [
      'Use the top-ranked crop’s locally recommended nutrient program as a guide, then adjust it using laboratory soil-test results.',
      'Maintain soil organic matter with mature compost or suitable crop residues.',
      'Ask the municipal agriculture office for crop-specific fertilizer guidance before applying nutrients.',
    ],
    avoidActions: [
      'Avoid assuming that moderate fertility means a balanced fertilizer is needed.',
      'Avoid applying lime or fertilizer without confirming the need and rate.',
    ],
    retestRecommendation: 'Obtain a laboratory soil test before the next fertilizer application and follow the local extension officer’s retest schedule.',
  },
  fertile: {
    summary: 'The screening result indicates relatively favorable fertility. For the top-ranked crop, focus on maintaining soil health and avoid unnecessary fertilizer.',
    fertilizerGuidance: 'A favorable screening class does not measure nutrient reserves or crop nutrient removal. Apply fertilizer only when supported by a soil test or crop-specific local guidance.',
    recommendedActions: [
      'Maintain soil organic matter with appropriate compost, cover crops, or retained crop residues.',
      'Use crop-specific nutrient guidance and soil-test results to decide whether fertilizer is needed.',
      'Monitor crop growth and soil condition through the growing season.',
    ],
    avoidActions: [
      'Avoid fertilizer applications that are not supported by crop need or soil-test results.',
    ],
    retestRecommendation: 'Follow the local agricultural extension officer’s soil-testing schedule, especially before changing fertilizer practice.',
  },
};

function createFallbackRecommendation({ fertilityClass, cropName, soilPH }) {
  const normalizedClass = Object.hasOwn(BASE_GUIDANCE, fertilityClass)
    ? fertilityClass
    : 'moderate';
  const guidance = BASE_GUIDANCE[normalizedClass];
  const actions = [...guidance.recommendedActions];
  const limitations = [
    'This is screening-based decision support, not a laboratory soil analysis.',
    'The ESP32 and image assessment do not measure soil nitrogen, phosphorus, or potassium.',
  ];

  if (cropName) {
    actions.unshift(`Use fertilizer guidance specific to ${cropName}; the crop ranking identifies suitability, not its nutrient deficiency.`);
  }
  if (soilPH != null && (Number(soilPH) < 5.5 || Number(soilPH) > 7.5)) {
    limitations.push('The measured pH is outside a commonly used near-neutral range; confirm it with a laboratory test before any pH correction.');
  }

  return {
    ...guidance,
    recommendedActions: actions,
    limitations,
    provider: 'SoilSense assessment guidance',
    source: 'General decision-support guidance; not a locally verified fertilizer prescription.',
    kind: 'rule_based',
    generatedAt: new Date(),
  };
}

function normalizeReviewedRecommendation(doc, cropId) {
  const recommendation = doc.data();
  if (recommendation.reviewStatus !== 'reviewed' || recommendation.isDemoData === true) {
    return null;
  }

  return {
    summary: recommendation.generalRecommendation ||
      'Follow this reviewed crop-specific fertilizer recommendation.',
    fertilizerGuidance: recommendation.fertilizerGuidance ||
      'Follow the reviewed crop-specific guidance and verify nutrient needs with a soil test.',
    recommendedActions: Array.isArray(recommendation.actions) ? recommendation.actions : [],
    avoidActions: Array.isArray(recommendation.avoidActions) ? recommendation.avoidActions : [],
    retestRecommendation: recommendation.retestRecommendation ||
      'Follow the soil-testing schedule recommended by your local agricultural extension officer.',
    limitations: Array.isArray(recommendation.limitations) ? recommendation.limitations : [],
    provider: recommendation.reviewedBy || 'Reviewed Firestore guidance',
    source: recommendation.dataSource || 'Reviewed Firestore guidance',
    kind: 'firestore_reviewed',
    recId: doc.id,
    cropId: recommendation.cropId || cropId,
    generatedAt: new Date(),
  };
}

async function getFertilizerRecommendation({ fertilityClass, cropId, cropName, soilPH }) {
  const normalizedClass = Object.hasOwn(BASE_GUIDANCE, fertilityClass)
    ? fertilityClass
    : 'moderate';
  const keys = [...new Set([
    cropId ? `fert-${normalizedClass}-${cropId}` : null,
    `fert-${normalizedClass}-general`,
  ].filter(Boolean))];

  try {
    for (const key of keys) {
      const doc = await db.collection('fertilizer_recommendations').doc(key).get();
      if (!doc.exists) continue;
      const reviewed = normalizeReviewedRecommendation(doc, cropId);
      if (reviewed) return reviewed;
    }

    const snapshot = await db.collection('fertilizer_recommendations')
      .where('fertilityClass', '==', normalizedClass)
      .get();
    const reviewed = snapshot.docs
      .map(doc => normalizeReviewedRecommendation(doc, cropId))
      .filter(Boolean);

    const matchingCrop = reviewed.find(item => item.cropId === cropId);
    const general = reviewed.find(item => item.cropId === 'general');
    if (matchingCrop || general) return matchingCrop || general;
  } catch (error) {
    console.error('[Fertilizer] Could not load reviewed Firestore guidance:', error.message);
  }

  return createFallbackRecommendation({
    fertilityClass: normalizedClass,
    cropName,
    soilPH,
  });
}

module.exports = {
  createFallbackRecommendation,
  getFertilizerRecommendation,
};
