const { db } = require('../firebase/admin');

function createApplicationSchedule(cropName) {
  const cropLabel = cropName ? ` for ${cropName}` : '';
  return [
    {
      timing: '14-21 days before planting',
      fertilizerType: 'Soil test first; no fertilizer yet',
      instructions: `Submit a representative soil sample and request pH plus available N-P-K results. Use the crop-specific recommendation${cropLabel} to select a fertilizer and rate.`,
    },
    {
      timing: '7-14 days before planting',
      fertilizerType: 'Mature compost or fully composted manure',
      instructions: 'Use only if locally recommended and incorporate it into the soil during bed preparation. Its nutrient content varies; it does not replace a soil-test-based fertilizer plan.',
    },
    {
      timing: 'At planting (Day 0)',
      fertilizerType: 'Basal fertilizer only if specified by the soil test or local crop guide',
      instructions: 'Use the recommended product and rate from the soil-test interpretation or municipal agriculture office. Follow the product label; do not let concentrated fertilizer touch seeds, cuttings, or roots.',
    },
    {
      timing: '14-21 days after crop establishment',
      fertilizerType: 'Side-dress only if the crop-specific plan calls for it',
      instructions: 'Treat this as a crop check, not an automatic fertilizer date. For fruit trees and other perennial crops, follow a tree-age and growth-stage schedule instead of this annual-crop window.',
    },
    {
      timing: 'Later applications',
      fertilizerType: 'Only the product and rate in the crop-specific plan',
      instructions: 'There is no safe universal repeat interval. Follow local extension advice and the product label; avoid adding fertilizer just because the assessment class is poor or moderate.',
    },
  ];
}

const BASE_GUIDANCE = {
  poor: {
    summary: 'The screening result indicates poor soil fertility. Confirm the result with a laboratory soil test before choosing fertilizer.',
    fertilizerGuidance: 'For organic matter, use mature compost or fully composted manure if locally recommended. Select any mineral fertilizer (including its N-P-K grade and rate) only from a soil test and crop-specific local guidance; this assessment does not identify a nutrient deficiency.',
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
    fertilizerGuidance: 'Maintain organic matter with mature compost or fully composted manure if locally recommended. Choose a mineral fertilizer grade and rate only from a soil test and crop-specific local guidance; this assessment does not measure soil N-P-K.',
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
    fertilizerGuidance: 'Use mature compost or fully composted manure only if needed to maintain organic matter. Apply mineral fertilizer only when a soil test or crop-specific local guidance identifies a need; this assessment does not measure nutrient reserves or crop nutrient removal.',
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
    version: 2,
    applicationSchedule: createApplicationSchedule(cropName),
    recommendedActions: actions,
    limitations,
    provider: 'SoilSense assessment guidance',
    source: 'General decision-support guidance; not a locally verified fertilizer prescription.',
    kind: 'rule_based',
    generatedAt: new Date(),
  };
}

function normalizeReviewedRecommendation(doc, cropId, cropName) {
  const recommendation = doc.data();
  if (recommendation.reviewStatus !== 'reviewed' || recommendation.isDemoData === true) {
    return null;
  }

  return {
    version: 2,
    summary: recommendation.generalRecommendation ||
      'Follow this reviewed crop-specific fertilizer recommendation.',
    fertilizerGuidance: recommendation.fertilizerGuidance ||
      'Follow the reviewed crop-specific guidance and verify nutrient needs with a soil test.',
    applicationSchedule: Array.isArray(recommendation.applicationSchedule) &&
      recommendation.applicationSchedule.length > 0
      ? recommendation.applicationSchedule
      : createApplicationSchedule(recommendation.cropName || cropName),
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
      const reviewed = normalizeReviewedRecommendation(doc, cropId, cropName);
      if (reviewed) return reviewed;
    }

    const snapshot = await db.collection('fertilizer_recommendations')
      .where('fertilityClass', '==', normalizedClass)
      .get();
    const reviewed = snapshot.docs
      .map(doc => normalizeReviewedRecommendation(doc, cropId, cropName))
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
  createApplicationSchedule,
  createFallbackRecommendation,
  getFertilizerRecommendation,
};
