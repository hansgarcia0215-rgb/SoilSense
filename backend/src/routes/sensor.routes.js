/**
 * sensor.routes.js — ESP32 sensor data endpoints
 *
 * Routes:
 *   POST /api/sensors/reading           → Receive reading from ESP32
 *   GET  /api/sensors/latest/:deviceId  → Get most recent reading
 *
 * Sensor fields supported:
 *   soilPH          0–14
 *   soilMoisture    0–100 %
 *   soilTemperature -10–60 °C  (optional — DS18B20 or similar)
 */

const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const { db }   = require('../firebase/admin');
const { validate }     = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { createError }  = require('../utils/errorHandler');

// ─── POST /api/sensors/reading ───────────────────────────────
router.post('/reading',
  (req, res, next) => {
    const deviceKey = req.headers['x-device-key'];
    const validKey  = process.env.ESP32_DEVICE_API_KEY || 'soilsense-dev-key';
    if (!deviceKey || deviceKey !== validKey) {
      return next(createError(401, 'UNAUTHORIZED_DEVICE', 'Device API key is invalid.'));
    }
    next();
  },
  [
    body('deviceId').trim().matches(/^[A-Za-z0-9_-]{1,64}$/)
      .withMessage('deviceId must contain only letters, numbers, hyphens, or underscores.'),
    body('soilPH').notEmpty().isFloat({ min: 0, max: 14 }).withMessage('pH must be 0–14.'),
    body('soilMoisture').notEmpty().isFloat({ min: 0, max: 100 }).withMessage('Moisture must be 0–100%.'),
    // Temperature is optional — not all boards have a temp sensor
    body('soilTemperature')
      .optional()
      .isFloat({ min: -10, max: 80 })
      .withMessage('Soil temperature must be between -10°C and 80°C.'),
    body('timestamp').optional().isISO8601(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { deviceId, soilPH, soilMoisture, soilTemperature, timestamp } = req.body;

      const reading = {
        deviceId,
        soilPH:          parseFloat(soilPH),
        soilMoisture:    parseFloat(soilMoisture),
        // Store temperature only if provided (null = sensor not connected)
        soilTemperature: soilTemperature != null ? parseFloat(soilTemperature) : null,
        timestamp:       timestamp ? new Date(timestamp) : new Date(),
        receivedAt:      new Date(),
        isValid:         true,
      };

      const readingRef = db.collection('sensor_readings').doc();
      const latestRef = db.collection('sensor_devices').doc(deviceId);
      const batch = db.batch();
      batch.set(readingRef, reading);
      batch.set(latestRef, reading);
      await batch.commit();
      res.json({ success: true, readingId: readingRef.id, receivedAt: reading.receivedAt });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/sensors/latest/:deviceId ───────────────────────
router.get('/latest/:deviceId',
  authenticate,
  async (req, res, next) => {
    try {
      const { deviceId } = req.params;

      const latestDoc = await db.collection('sensor_devices').doc(deviceId).get();
      let reading;

      if (latestDoc.exists) {
        reading = latestDoc.data();
      } else {
        // Fall back to the historical readings written before latest-document tracking.
        const snapshot = await db.collection('sensor_readings')
          .where('deviceId', '==', deviceId)
          .limit(20)
          .get();

        if (snapshot.empty) {
          return res.json({ success: true, found: false, message: 'No readings found for this device.' });
        }

        const readings = snapshot.docs.map(doc => doc.data());
        readings.sort((a, b) => {
          const timeA = a.receivedAt?.toMillis?.() ?? new Date(a.receivedAt).getTime();
          const timeB = b.receivedAt?.toMillis?.() ?? new Date(b.receivedAt).getTime();
          return timeB - timeA;
        });
        reading = readings[0];
      }

      const receivedAt = reading.receivedAt?.toDate?.() || new Date(reading.receivedAt);
      const secondsAgo = Math.round((Date.now() - receivedAt.getTime()) / 1000);
      const isStale    = secondsAgo > 60;

      res.json({
        success:          true,
        found:            true,
        deviceId:         reading.deviceId,
        soilPH:           reading.soilPH,
        soilMoisture:     reading.soilMoisture,
        soilTemperature:  reading.soilTemperature ?? null,
        timestamp:        reading.timestamp,
        receivedAt,
        secondsAgo,
        isStale,
        statusMessage: isStale
          ? `Last reading ${secondsAgo}s ago — device may be disconnected.`
          : `Live — ${secondsAgo}s ago`,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
