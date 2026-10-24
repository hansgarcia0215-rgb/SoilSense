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
const { createError }           = require('../utils/errorHandler');

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
        latitude, longitude, soilPH, soilMoisture, soilTemperature, deviceId, barangay, notes,
      });

      res.status(201).json({ success: true, ...result });
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

    let snapshot;

    if (role === 'farmer') {
      // Fetch by userId only — no orderBy avoids needing a composite index
      snapshot = await db.collection('soil_assessments')
        .where('userId', '==', uid)
        .get();
    } else {
      // Admins and extension workers see all
      snapshot = await db.collection('soil_assessments').get();
    }

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
        imageUrl:         d.imageData?.imageUrl || null,
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

    res.json({ success: true, total: data.length, data });
  } catch (err) {
    next(err);
  }
});

// ─── Get Single Assessment ────────────────────────────────────
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

    res.json({ success: true, data });
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
