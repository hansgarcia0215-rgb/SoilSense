/**
 * assessment.routes.js — Soil assessment endpoint definitions
 */

const express  = require('express');
const router   = express.Router();
const { body, param } = require('express-validator');

const { authenticate }          = require('../middleware/auth.middleware');
const { requireRole }           = require('../middleware/role.middleware');
const { handleSoilImageUpload } = require('../middleware/upload.middleware');
const { validate }              = require('../middleware/validate.middleware');
const { getAssessmentImageMetadata } = require('../utils/assessmentImage');
const { createError }           = require('../utils/errorHandler');
const {
  createApplicationSchedule,
  getFertilizerRecommendation,
} = require('../services/fertilizerRecommendations');

// All assessment routes require authentication
router.use(authenticate);

// ─── Analyze ─────────────────────────────────────────────────
router.post('/analyze',
  handleSoilImageUpload,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return next(createError(400, 'NO_IMAGE', 'A soil image is required.'));
      }

      const { runAssessment } = require('../services/assessmentOrchestrator');
      const { latitude, longitude, soilPH, soilMoisture, soilTemperature, deviceId, barangay, notes } = req.body;
      const assessmentBarangay = typeof barangay === 'string' && barangay.trim()
        ? barangay.trim()
        : typeof req.user.barangay === 'string' && req.user.barangay.trim()
          ? req.user.barangay.trim()
          : null;

      if (soilPH != null) {
        const ph = parseFloat(soilPH);
        if (isNaN(ph) || ph < 0 || ph > 14) {
          return next(createError(422, 'INVALID_PH', 'Soil pH must be between 0 and 14.'));
        }
      }
      if (soilMoisture != null) {
        const m = parseFloat(soilMoisture);
        if (isNaN(m) || m < 0 || m > 100) {
          return next(createError(422, 'INVALID_MOISTURE', 'Soil moisture must be between 0 and 100%.'));
        }
      }
      if (soilTemperature != null) {
        const t = parseFloat(soilTemperature);
        if (isNaN(t) || t < -10 || t > 80) {
          return next(createError(422, 'INVALID_TEMPERATURE', 'Soil temperature must be between -10°C and 80°C.'));
        }
      }

      const result = await runAssessment({
        imageBuffer:     req.file.buffer,
        mimetype:        req.file.mimetype,
        userId:          req.user.uid,
        farmerName:      req.user.displayName,
        latitude, longitude, soilPH, soilMoisture, soilTemperature, deviceId,
        barangay: assessmentBarangay,
        notes,
      });

      res.status(201).json({
        success: true,
        ...result,
        imageData: getAssessmentImageMetadata(result.imageData),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── List Assessments ────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { db } = require('../firebase/admin');
    const { uid, role } = req.user;
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);

    const assessmentFields = [
      'assessmentId',
      'userId',
      'farmerName',
      'createdAt',
      'status',
      'location',
      'fuzzyResult.fertilityClass',
      'fuzzyResult.fertilityScore',
      'rootcropResults',
      'imageData.imagePath',
      'imageData.imageUrl',
      'imageData.imageSizeBytes',
      'hasImage',
      'labValidation.isValidated',
    ];
    let query = db.collection('soil_assessments');

    if (role === 'farmer') {
      // Fetch by userId only — no orderBy avoids needing a composite index
      query = query.where('userId', '==', uid);
    }
    const snapshot = await query.select(...assessmentFields).get();

    // Map to summary objects
    let data = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        assessmentId:     d.assessmentId,
        userId:           d.userId,
        farmerName:       d.farmerName || null,
        createdAt:        d.createdAt,
        status:           d.status,
        location:         d.location || {},
        fertilityClass:   d.fuzzyResult?.fertilityClass || null,
        fertilityScore:   d.fuzzyResult?.fertilityScore || null,
        bestRootcrop:     d.rootcropResults?.find(r => r.rank === 1)?.cropName || null,
        hasImage:         Boolean(d.hasImage || getAssessmentImageMetadata(d.imageData).hasImage),
        hasLabValidation: !!d.labValidation?.isValidated,
      };
    });

    // Sort by createdAt descending in memory — avoids composite index requirement
    data.sort((a, b) => {
      const tA = a.createdAt?._seconds ?? (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
      const tB = b.createdAt?._seconds ?? (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
      return tB - tA;
    });

    // Apply limit after sorting
    data = data.slice(0, limit);

    // Use current profile barangays for older assessments that have no saved label.
    const missingBarangayUserIds = [...new Set(
      data.filter(item => !item.location?.barangay && item.userId).map(item => item.userId)
    )];
    const profileBarangays = new Map();
    await Promise.all(missingBarangayUserIds.map(async userId => {
      if (userId === uid && req.user.barangay) {
        profileBarangays.set(userId, req.user.barangay);
        return;
      }
      const userDoc = await db.collection('users').doc(userId).get();
      const profileBarangay = userDoc.exists ? userDoc.data().barangay : null;
      if (typeof profileBarangay === 'string' && profileBarangay.trim()) {
        profileBarangays.set(userId, profileBarangay.trim());
      }
    }));

    data = data.map(item => {
      const barangay = profileBarangays.get(item.userId);
      return barangay
        ? { ...item, location: { ...item.location, barangay } }
        : item;
    });

    res.json({ success: true, total: data.length, data });
  } catch (err) {
    next(err);
  }
});

// ─── Get Single Assessment ────────────────────────────────────
router.post('/:id/fertilizer-recommendation',
  [param('id').trim().notEmpty().withMessage('Assessment ID is required.')],
  validate,
  async (req, res, next) => {
    try {
      const { db } = require('../firebase/admin');
      const { uid, role } = req.user;
      const assessmentRef = db.collection('soil_assessments').doc(req.params.id);
      const assessmentDoc = await assessmentRef.get();

      if (!assessmentDoc.exists) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Assessment not found.' });
      }

      const assessment = assessmentDoc.data();
      if (role === 'farmer' && assessment.userId !== uid) {
        return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Access denied.' });
      }

      const crops = assessment.rootcropResults?.length
        ? assessment.rootcropResults
        : assessment.cropRecommendations || [];
      const cropId = assessment.fertilizerRecommendationCropId ||
        crops.find(crop => crop.cropId)?.cropId || null;
      const topCrop = crops.find(crop => crop.cropId === cropId);

      if (assessment.aiFertilizerRecommendation?.kind === 'gemini_ai' &&
          assessment.aiFertilizerRecommendation.version === 2) {
        const aiRecommendation = {
          ...assessment.aiFertilizerRecommendation,
          applicationSchedule: assessment.aiFertilizerRecommendation.applicationSchedule?.length
            ? assessment.aiFertilizerRecommendation.applicationSchedule
            : createApplicationSchedule(topCrop?.cropName),
        };
        return res.json({
          success: true,
          data: {
            aiFertilizerRecommendation: aiRecommendation,
            serviceStatus: assessment.serviceStatus,
          },
        });
      }

      let cropRequirements = null;
      if (cropId) {
        const cropDoc = await db.collection('crops').doc(cropId).get();
        cropRequirements = cropDoc.exists ? cropDoc.data().requirements || null : null;
      }

      const requirements = cropRequirements ? {
        phMin: cropRequirements.phMin,
        phMax: cropRequirements.phMax,
        phOptimal: cropRequirements.phOptimal,
        moistureMin: cropRequirements.moistureMin,
        moistureMax: cropRequirements.moistureMax,
        moistureOptimal: cropRequirements.moistureOptimal,
        fertilityMin: cropRequirements.fertilityMin,
        drainagePreference: cropRequirements.drainagePreference,
        soilTexturePreference: cropRequirements.soilTexturePreference,
      } : null;

      const { generateFertilizerRecommendation } = require('../services/geminiFertilizer');
      const recommendation = await generateFertilizerRecommendation({
        location: {
          municipality: assessment.location?.municipality,
          province: assessment.location?.province,
          region: assessment.location?.region,
        },
        assessment: {
          fertilityClass: assessment.fuzzyResult?.fertilityClass,
          fertilityScore: assessment.fuzzyResult?.fertilityScore,
          confidence: assessment.fuzzyResult?.confidence,
          confidenceLevel: assessment.fuzzyResult?.confidenceLevel,
        },
        measurements: {
          soilPH: assessment.sensorData?.soilPH ?? assessment.fuzzyInputs?.ph ?? null,
          soilMoisture: assessment.sensorData?.soilMoisture ?? assessment.fuzzyInputs?.moisture ?? null,
          soilTemperature: assessment.sensorData?.soilTemperature ?? assessment.fuzzyInputs?.temperature ?? null,
        },
        imageAssessment: {
          visualCondition: assessment.fuzzyInputs?.visualCondition || null,
          imageQuality: assessment.imageFeatures?.imageQuality || null,
        },
        topRankedCrop: topCrop ? {
          cropId: topCrop.cropId,
          cropName: topCrop.cropName,
          suitabilityScore: topCrop.suitabilityScore,
          requirements,
        } : null,
        laboratoryNpkResults: assessment.labValidation?.isValidated
          ? {
            nitrogen: assessment.labValidation.labNitrogen ?? null,
            phosphorus: assessment.labValidation.labPhosphorus ?? null,
            potassium: assessment.labValidation.labPotassium ?? null,
            ph: assessment.labValidation.labPH ?? null,
          }
          : null,
      });
      recommendation.version = 2;
      recommendation.applicationSchedule = createApplicationSchedule(topCrop?.cropName);

      const serviceStatus = {
        ...assessment.serviceStatus,
        aiFertilizerRecommendation: { status: 'online', message: null },
      };
      await assessmentRef.update({
        aiFertilizerRecommendation: recommendation,
        serviceStatus,
        updatedAt: new Date(),
      });

      res.json({
        success: true,
        data: {
          aiFertilizerRecommendation: recommendation,
          serviceStatus,
        },
      });
    } catch (err) {
      if (err.code === 'GEMINI_NOT_CONFIGURED' || err.code === 'GEMINI_REQUEST_FAILED') {
        return next(createError(
          err.code === 'GEMINI_NOT_CONFIGURED' ? 503 : 502,
          err.code,
          err.message
        ));
      }
      next(err);
    }
  }
);

router.get('/:id', async (req, res, next) => {
  try {
    const { db } = require('../firebase/admin');
    const { uid, role } = req.user;

    const doc = await db.collection('soil_assessments').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Assessment not found.' });
    }

    const data = doc.data();

    // Farmers can only view their own assessments
    if (role === 'farmer' && data.userId !== uid) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Access denied.' });
    }

    const crops = data.rootcropResults?.length
      ? data.rootcropResults
      : data.cropRecommendations || [];
    const topCrop = crops.find(crop =>
      crop.cropId === data.fertilizerRecommendationCropId
    ) || crops.find(crop => crop.cropId);
    let fertilizerRecommendationData = data.fertilizerRecommendationData?.kind
      ? data.fertilizerRecommendationData
      : null;
    let serviceStatus = data.serviceStatus || {};

    if (fertilizerRecommendationData?.kind === 'rule_based' &&
        fertilizerRecommendationData.version !== 2) {
      fertilizerRecommendationData = await getFertilizerRecommendation({
        fertilityClass: data.fuzzyResult?.fertilityClass,
        cropId: data.fertilizerRecommendationCropId || topCrop?.cropId,
        cropName: topCrop?.cropName,
        soilPH: data.sensorData?.soilPH ?? data.fuzzyInputs?.ph ?? null,
      });
      await doc.ref.update({ fertilizerRecommendationData });
    } else if (fertilizerRecommendationData &&
        (!Array.isArray(fertilizerRecommendationData.applicationSchedule) ||
          fertilizerRecommendationData.applicationSchedule.length === 0)) {
      fertilizerRecommendationData = {
        ...fertilizerRecommendationData,
        applicationSchedule: createApplicationSchedule(topCrop?.cropName),
      };
    }

    if (!fertilizerRecommendationData && serviceStatus.fuzzyEngine?.status !== 'offline') {
      fertilizerRecommendationData = await getFertilizerRecommendation({
        fertilityClass: data.fuzzyResult?.fertilityClass,
        cropId: data.fertilizerRecommendationCropId || topCrop?.cropId,
        cropName: topCrop?.cropName,
        soilPH: data.sensorData?.soilPH ?? data.fuzzyInputs?.ph ?? null,
      });
      serviceStatus = {
        ...serviceStatus,
        fertilizerRecommendation: {
          status: 'ready',
          source: fertilizerRecommendationData.kind,
          message: null,
        },
      };
      await doc.ref.update({
        fertilizerRecommendationCropId: data.fertilizerRecommendationCropId || topCrop?.cropId || null,
        fertilizerRecommendationData,
        serviceStatus,
      });
    } else if (!fertilizerRecommendationData) {
      serviceStatus = {
        ...serviceStatus,
        fertilizerRecommendation: {
          status: 'unavailable',
          message: 'A fertilizer recommendation requires a completed fuzzy assessment.',
        },
      };
    }

    res.json({
      success: true,
      data: {
        ...data,
        serviceStatus,
        aiFertilizerRecommendation: data.aiFertilizerRecommendation?.version === 2
          ? {
            ...data.aiFertilizerRecommendation,
            applicationSchedule: data.aiFertilizerRecommendation.applicationSchedule?.length
              ? data.aiFertilizerRecommendation.applicationSchedule
              : createApplicationSchedule(topCrop?.cropName),
          }
          : null,
        fertilizerRecommendationCropId: data.fertilizerRecommendationCropId || topCrop?.cropId || null,
        fertilizerRecommendationData,
        imageData: getAssessmentImageMetadata(data.imageData),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Stream Assessment Image ───────────────────────────────────
router.get('/:id/image', async (req, res, next) => {
  try {
    const { db } = require('../firebase/admin');
    const { uid, role } = req.user;
    const doc = await db.collection('soil_assessments').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Assessment not found.' });
    }

    const assessment = doc.data();
    if (role === 'farmer' && assessment.userId !== uid) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Access denied.' });
    }

    const imageData = assessment.imageData || {};
    if (typeof imageData.imageBase64 === 'string' && imageData.imageBase64.length > 0) {
      const imageBuffer = Buffer.from(imageData.imageBase64, 'base64');
      res.set({
        'Content-Type': imageData.imageMimeType || 'image/jpeg',
        'Content-Length': imageBuffer.length,
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      });
      return res.end(imageBuffer);
    }

    return res.status(404).json({ success: false, error: 'IMAGE_NOT_FOUND', message: 'No Firestore photo is stored for this assessment.' });
  } catch (err) {
    next(err);
  }
});

// ─── Enter Lab Result ─────────────────────────────────────────
router.post('/:id/lab-result',
  requireRole(['extension_worker']),
  [
    param('id').notEmpty(),
    body('labFertilityClass')
      .isIn(['poor', 'moderate', 'fertile'])
      .withMessage('Lab fertility class must be poor, moderate, or fertile.'),
    body('labPH')
      .optional()
      .isFloat({ min: 0, max: 14 })
      .withMessage('Lab pH must be between 0 and 14.'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { db } = require('../firebase/admin');
      const assessmentRef = db.collection('soil_assessments').doc(req.params.id);
      const assessmentDoc = await assessmentRef.get();

      if (!assessmentDoc.exists) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Assessment not found.' });
      }

      const labData = {
        ...req.body,
        assessmentId: req.params.id,
        enteredBy:    req.user.uid,
        enteredAt:    new Date(),
        isValidated:  true,
      };

      const labRef = await db.collection('laboratory_results').add(labData);

      await assessmentRef.update({
        labValidation:        labData,
        'labValidation.labId': labRef.id,
      });

      res.status(201).json({ success: true, labId: labRef.id });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
