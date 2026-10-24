/**
 * assessmentOrchestrator.js — Full soil assessment pipeline
 *
 * What it does:
 *   Coordinates the complete assessment workflow:
 *   1. Upload image to Firebase Storage
 *   2. Call image-processing microservice (Python/Flask on port 5001)
 *   3. Fetch crops + fuzzy rules from Firestore
 *   4. Call fuzzy logic microservice (Python/Flask on port 5002)
 *   5. Fetch fertilizer recommendation from Firestore
 *   6. Save complete assessment document to Firestore
 *   7. Return the full assessment result
 *
 * Why it exists:
 *   Centralizes orchestration logic so the route handler stays clean.
 *   Makes each step independently testable.
 *
 * Error handling:
 *   If the image processing or fuzzy engine service is unavailable,
 *   the error is caught and a clear message returned to the user.
 */

const axios  = require('axios');
const { v4: uuidv4 } = require('uuid');
const { db, storage } = require('../firebase/admin');
const { generateAssessmentId } = require('../utils/assessmentId');
const { MUNICIPALITY, PROVINCE, REGION, isWithinRoxas } = require('../utils/roxasConfig');

const isProduction = process.env.NODE_ENV === 'production';
const serviceUrl = (key, productionUrl, localUrl) => {
  const configuredUrl = process.env[key]?.trim().replace(/\/+$/, '');
  if (configuredUrl && !(isProduction && /localhost|127\.0\.0\.1/.test(configuredUrl))) {
    return configuredUrl;
  }
  return isProduction ? productionUrl : localUrl;
};
const IMAGE_PROCESSING_URL = serviceUrl(
  'IMAGE_PROCESSING_URL',
  'https://soilsense-image-processing.onrender.com',
  'http://localhost:5001'
);
const FUZZY_ENGINE_URL = serviceUrl(
  'FUZZY_ENGINE_URL',
  'https://soilsense-fuzzy-engine.onrender.com',
  'http://localhost:5002'
);
const SERVICE_API_KEY      = process.env.SERVICE_API_KEY;

/**
 * Run the full assessment pipeline.
 *
 * @param {Object} params
 * @param {Buffer} params.imageBuffer  - Raw image bytes from Multer
 * @param {string} params.mimetype     - Image MIME type
 * @param {string} params.userId       - Authenticated user's ID
 * @param {string} params.farmerName   - Display name
 * @param {number} params.latitude     - GPS lat (optional)
 * @param {number} params.longitude    - GPS lng (optional)
 * @param {number} params.soilPH       - Sensor pH (optional)
 * @param {number} params.soilMoisture - Sensor moisture % (optional)
 * @param {string} params.deviceId     - ESP32 device ID (optional)
 * @param {string} params.barangay     - User's barangay
 * @param {string} params.notes        - Farmer notes (optional)
 *
 * @returns {Object} Complete assessment result including all sub-results
 */
async function runAssessment(params) {
  const startTime = Date.now();
  const {
    imageBuffer, mimetype, userId, farmerName,
    latitude, longitude, soilPH, soilMoisture, soilTemperature,
    deviceId, barangay, notes,
  } = params;

  // ── Step 1: Upload image to Firebase Storage ──────────────────────────────
  const imageId   = uuidv4();
  const imagePath = `soil-images/${userId}/${imageId}.${mimetype.split('/')[1] || 'jpg'}`;
  let   imageUrl  = null;

  try {
    const bucket = storage.bucket();
    const file   = bucket.file(imagePath);
    await file.save(imageBuffer, {
      metadata: { contentType: mimetype },
      resumable: false,
    });
    // Make the file publicly readable (for image display in the UI)
    await file.makePublic();
    imageUrl = `https://storage.googleapis.com/${bucket.name}/${imagePath}`;
  } catch (err) {
    console.error('[Orchestrator] Storage upload failed:', err.message);
    // Continue without cloud URL — we can still process the image
  }

  // ── Step 2: Call image processing service ─────────────────────────────────
  let imageFeatures = {};
  let derivedInputs = { visual_condition: 'moderate', image_quality: 'moderate' };
  let qualityWarning = null;
  const serviceStatus = {
    imageProcessing: { status: 'offline', message: null },
    fuzzyEngine: { status: 'offline', message: null },
  };

  try {
    // Build FormData with the image buffer
    const FormData = require('form-data');
    const form = new FormData();
    form.append('image', imageBuffer, {
      filename:    `soil.${mimetype.split('/')[1] || 'jpg'}`,
      contentType: mimetype,
    });

    const imgRes = await axios.post(`${IMAGE_PROCESSING_URL}/analyze`, form, {
      headers: {
        ...form.getHeaders(),
        ...(SERVICE_API_KEY ? { 'X-Service-Api-Key': SERVICE_API_KEY } : {}),
      },
      timeout: 30000,
    });

    if (!imgRes.data.success) {
      throw new Error(imgRes.data.message || 'Image service returned an unsuccessful response.');
    }

    imageFeatures = {
      ...imgRes.data.colorFeatures,
      ...imgRes.data.textureFeatures,
      imageQuality: imgRes.data.quality?.overall_quality,
      qualityScore: imgRes.data.quality?.quality_score,
      qualityIssues: imgRes.data.quality?.issues,
      originalSize: imgRes.data.originalSize,
    };
    derivedInputs = imgRes.data.derivedInputs || derivedInputs;
    qualityWarning = imgRes.data.qualityWarning;
    serviceStatus.imageProcessing = { status: 'online', message: null };
  } catch (err) {
    console.error('[Orchestrator] Image processing service error:', err.message);
    serviceStatus.imageProcessing = {
      status: 'offline',
      message: err.response?.status === 401
        ? 'Service API key was rejected. Match SERVICE_API_KEY across the API and both Python services.'
        : err.response?.data?.message || err.message,
    };
    imageFeatures = { imageQuality: 'unknown', note: 'Image processing service unavailable' };
  }

  // ── Step 3: Fetch crops + rules from Firestore ────────────────────────────
  let crops = [];
  let rules = null;

  try {
    const [cropsSnap, rulesSnap] = await Promise.all([
      db.collection('crops').where('isActive', '==', true).get(),
      db.collection('fuzzy_rules').where('isActive', '==', true).get(),
    ]);
    crops = cropsSnap.docs.map(d => d.data());
    rules = rulesSnap.docs.map(d => d.data());
  } catch (err) {
    console.error('[Orchestrator] Firestore fetch error:', err.message);
    // Fuzzy engine will fall back to built-in rules; rootcrop ranking skipped
  }

  // ── Step 4: Call fuzzy logic service ─────────────────────────────────────
  let fuzzyResult    = {};
  let rootcropResults = [];
  let allCropsRanked = [];
  let fertRecommKey  = 'fert-moderate-general';
  let confidenceData = {};

  try {
    const fuzzyPayload = {
      ph:             soilPH   != null ? parseFloat(soilPH)   : null,
      moisture:       soilMoisture != null ? parseFloat(soilMoisture) : null,
      visualCondition: derivedInputs.visual_condition || 'moderate',
      imageQuality:   derivedInputs.image_quality    || 'moderate',
      hasGPS:         !!(latitude && longitude),
      crops,
      rules,
    };

    const fuzzyRes = await axios.post(`${FUZZY_ENGINE_URL}/infer`, fuzzyPayload, {
      headers: SERVICE_API_KEY ? { 'X-Service-Api-Key': SERVICE_API_KEY } : {},
      timeout: 20000,
    });

    if (!fuzzyRes.data.success) {
      throw new Error(fuzzyRes.data.message || 'Fuzzy service returned an unsuccessful response.');
    }

    const fd = fuzzyRes.data;
    if (!fd.fertility || !fd.confidence) {
      throw new Error('Fuzzy service response is missing fertility or confidence data.');
    }
    fuzzyResult = {
      fertilityClass:   fd.fertility.classification,
      fertilityScore:   fd.fertility.score,
      confidence:       fd.confidence.score,
      confidenceLevel:  fd.confidence.level,
      phFuzzySet:       fd.fertility.phFuzzySet,
      moistureFuzzySet: fd.fertility.moistureFuzzySet,
      activatedRules:   fd.fertility.activatedRules,
      aggregation:      fd.fertility.aggregation,
      explanation:      fd.fertility.explanation,
      explanationList:  fd.fertility.explanationList,
    };
    rootcropResults = fd.cropRecommendations?.length
      ? fd.cropRecommendations
      : fd.rootcrops || [];
    allCropsRanked  = fd.allCropsRanked || [];
    fertRecommKey   = fd.fertilizerRecommendationKey || 'fert-moderate-general';
    confidenceData  = fd.confidence;
    serviceStatus.fuzzyEngine = { status: 'online', message: null };
  } catch (err) {
    console.error('[Orchestrator] Fuzzy engine error:', err.message);
    serviceStatus.fuzzyEngine = {
      status: 'offline',
      message: err.response?.status === 401
        ? 'Service API key was rejected. Match SERVICE_API_KEY across the API and both Python services.'
        : err.response?.data?.message || err.message,
    };
    // Fallback fertility result
    fuzzyResult = {
      fertilityClass: 'moderate',
      fertilityScore: 50,
      confidence:     40,
      confidenceLevel: 'limited',
      explanation: 'Fuzzy engine unavailable. Result is a default fallback. Please try again.',
    };
  }

  // ── Step 5: Fetch fertilizer recommendation from Firestore ────────────────
  let fertRecommendationData = null;
  try {
    // Try specific crop recommendation first, then fall back to general
    const fertKeys = [fertRecommKey, `fert-${fuzzyResult.fertilityClass}-general`];
    for (const key of fertKeys) {
      const doc = await db.collection('fertilizer_recommendations').doc(key).get();
      if (doc.exists) {
        fertRecommendationData = doc.data();
        break;
      }
    }
  } catch (err) {
    console.error('[Orchestrator] Fertilizer rec fetch error:', err.message);
  }

  // ── Step 6: Generate assessment ID and save to Firestore ──────────────────
  const assessmentId = await generateAssessmentId();
  const processingTimeMs = Date.now() - startTime;

  const assessmentDoc = {
    assessmentId,
    userId,
    farmerName:  farmerName || 'Unknown',
    status:      'completed',
    createdAt:   new Date(),
    updatedAt:   new Date(),
    notes:       notes || null,

    // Location is ALWAYS locked to Roxas, Oriental Mindoro (the only service area).
    // GPS coordinates are stored and flagged if they fall outside the municipal boundary.
    location: {
      latitude:     latitude   ? parseFloat(latitude)  : null,
      longitude:    longitude  ? parseFloat(longitude) : null,
      barangay:     barangay   || null,
      municipality: MUNICIPALITY,
      province:     PROVINCE,
      region:       REGION,
      withinServiceArea: isWithinRoxas(latitude, longitude),
    },

    imageData: {
      imageId,
      imageUrl,
      imagePath,
    },

    imageFeatures,
    serviceStatus,
    qualityWarning,

    sensorData: {
      available:       soilPH != null || soilMoisture != null || soilTemperature != null,
      deviceId:        deviceId || null,
      soilPH:          soilPH          != null ? parseFloat(soilPH)          : null,
      soilMoisture:    soilMoisture    != null ? parseFloat(soilMoisture)    : null,
      soilTemperature: soilTemperature != null ? parseFloat(soilTemperature) : null,
    },

    fuzzyInputs: {
      ph:              soilPH          != null ? parseFloat(soilPH)          : null,
      moisture:        soilMoisture    != null ? parseFloat(soilMoisture)    : null,
      temperature:     soilTemperature != null ? parseFloat(soilTemperature) : null,
      visualCondition: derivedInputs.visual_condition || 'moderate',
    },

    activeCropCount: crops.length,
    fuzzyResult,
    rootcropResults,
    cropRecommendations: rootcropResults,
    allCropsRanked,
    fertilizerRecommendationKey:  fertRecommKey,
    fertilizerRecommendationData: fertRecommendationData,
    confidenceData,

    processingTimeMs,
    labValidation: null,
  };

  await db.collection('soil_assessments').doc(assessmentId).set(assessmentDoc);

  console.log(`[Orchestrator] Assessment ${assessmentId} completed in ${processingTimeMs}ms`);

  // ── Step 7: Return result ─────────────────────────────────────────────────
  return {
    assessmentId,
    ...assessmentDoc,
  };
}

module.exports = { runAssessment };
