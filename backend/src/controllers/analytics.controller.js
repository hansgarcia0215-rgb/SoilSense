/**
 * analytics.controller.js — Dashboard summary and analytics endpoints
 *
 * Provides:
 *   GET /api/analytics/summary     → summary cards for dashboard
 *   GET /api/analytics/accuracy    → classification accuracy vs lab results
 *   GET /api/analytics/processing-times → performance metrics
 *   GET /api/analytics/assessments-by-location → geographic distribution
 */

const { db } = require('../firebase/admin');
const { createError } = require('../utils/errorHandler');

// ─── Dashboard Summary ───────────────────────────────────────

/**
 * GET /api/analytics/summary
 * Returns counts and averages for the dashboard cards.
 * For farmers: returns only their own data.
 * For researchers/admin: returns system-wide data.
 */
async function getSummary(req, res, next) {
  try {
    const { uid, role } = req.user;

    // Fetch assessments — avoid composite index by filtering in memory.
    // For farmers: fetch only their docs. For others: fetch all.
    let snapshot;
    if (role === 'farmer') {
      snapshot = await db.collection('soil_assessments')
        .where('userId', '==', uid)
        .get();
    } else {
      snapshot = await db.collection('soil_assessments').get();
    }

    // Filter completed assessments in memory (avoids .where('status') composite index)
    const assessments = snapshot.docs
      .map(d => d.data())
      .filter(a => a.status === 'completed');

    // Calculate this-week count
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const thisWeek = assessments.filter(a => {
      const ts = a.createdAt?._seconds ? new Date(a.createdAt._seconds * 1000) : new Date(a.createdAt);
      return ts >= oneWeekAgo;
    }).length;

    // Average fertility score
    const scores = assessments
      .map(a => a.fuzzyResult?.fertilityScore)
      .filter(s => s != null);
    const avgFertilityScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : null;

    // Most recommended best rootcrop
    const cropCounts = {};
    assessments.forEach(a => {
      const best = a.rootcropResults?.find(r => r.rank === 1);
      if (best?.cropName) {
        cropCounts[best.cropName] = (cropCounts[best.cropName] || 0) + 1;
      }
    });
    const topRecommendedCrop = Object.keys(cropCounts).length > 0
      ? Object.keys(cropCounts).reduce((a, b) => cropCounts[a] > cropCounts[b] ? a : b)
      : null;

    // Fertility distribution
    const distribution = { fertile: 0, moderate: 0, poor: 0 };
    assessments.forEach(a => {
      const cls = a.fuzzyResult?.fertilityClass?.toLowerCase();
      if (cls in distribution) distribution[cls]++;
    });

    res.json({
      success: true,
      data: {
        totalAssessments: assessments.length,
        thisWeek,
        avgFertilityScore: avgFertilityScore ? Math.round(avgFertilityScore * 10) / 10 : null,
        topRecommendedCrop,
        fertilityDistribution: distribution,
      },
    });

  } catch (err) {
    next(err);
  }
}

// ─── Classification Accuracy ─────────────────────────────────

/**
 * GET /api/analytics/accuracy
 * Compares SoilSense classifications to entered laboratory results.
 * Returns accuracy, precision, recall, F1, and confusion matrix.
 */
async function getAccuracy(req, res, next) {
  try {
    // Get all assessments that have lab validation
    const snapshot = await db.collection('laboratory_results').get();

    if (snapshot.empty) {
      return res.json({
        success: true,
        data: {
          totalValidated: 0,
          message: 'No laboratory validation data available yet.',
        },
      });
    }

    const labResults = snapshot.docs.map(d => d.data());
    const classes = ['poor', 'moderate', 'fertile'];

    // Initialize confusion matrix
    const matrix = {};
    classes.forEach(actual => {
      matrix[actual] = {};
      classes.forEach(predicted => { matrix[actual][predicted] = 0; });
    });

    let correct = 0;

    // Match lab results with assessment predictions
    for (const lab of labResults) {
      const assessmentDoc = await db.collection('soil_assessments')
        .doc(lab.assessmentId).get();
      if (!assessmentDoc.exists) continue;

      const assessment = assessmentDoc.data();
      const predicted  = assessment.fuzzyResult?.fertilityClass?.toLowerCase();
      const actual     = lab.labFertilityClass?.toLowerCase();

      if (!predicted || !actual || !classes.includes(predicted) || !classes.includes(actual)) continue;

      matrix[actual][predicted]++;
      if (predicted === actual) correct++;
    }

    const total = labResults.length;
    const accuracy = total > 0 ? (correct / total * 100).toFixed(1) : 0;

    // Per-class precision, recall, F1
    const metrics = {};
    classes.forEach(cls => {
      const tp = matrix[cls][cls];
      const fp = classes.reduce((sum, r) => sum + (r !== cls ? matrix[r][cls] : 0), 0);
      const fn = classes.reduce((sum, c) => sum + (c !== cls ? matrix[cls][c] : 0), 0);
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall    = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1        = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
      metrics[cls] = {
        precision: Math.round(precision * 1000) / 1000,
        recall:    Math.round(recall    * 1000) / 1000,
        f1Score:   Math.round(f1        * 1000) / 1000,
      };
    });

    res.json({
      success: true,
      data: {
        totalValidated: total,
        correctClassifications: correct,
        accuracy: parseFloat(accuracy),
        precision:  Object.fromEntries(classes.map(c => [c, metrics[c].precision])),
        recall:     Object.fromEntries(classes.map(c => [c, metrics[c].recall])),
        f1Score:    Object.fromEntries(classes.map(c => [c, metrics[c].f1Score])),
        confusionMatrix: matrix,
      },
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/processing-times
 * Average processing time breakdown.
 */
async function getProcessingTimes(req, res, next) {
  try {
    // Avoid composite index: fetch without orderBy, sort in memory
    const snapshot = await db.collection('soil_assessments')
      .where('status', '==', 'completed')
      .get();

    const allDocs = snapshot.docs.map(d => d.data());
    // Sort by createdAt desc and take last 100
    allDocs.sort((a, b) => {
      const tA = a.createdAt?._seconds ?? 0;
      const tB = b.createdAt?._seconds ?? 0;
      return tB - tA;
    });
    const recent = allDocs.slice(0, 100);

    const times = recent
      .map(d => d.processingTimeMs)
      .filter(t => t != null);

    const avg = times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : null;

    res.json({
      success: true,
      data: {
        sampleSize: times.length,
        avgTotalMs: avg,
        minMs: times.length > 0 ? Math.min(...times) : null,
        maxMs: times.length > 0 ? Math.max(...times) : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/trend
 * Returns fertility scores over time for the current user (or all for researchers)
 * so the dashboard can render a trend sparkline/chart.
 */
async function getTrend(req, res, next) {
  try {
    const { uid, role } = req.user;

    let snapshot;
    if (role === 'farmer') {
      snapshot = await db.collection('soil_assessments')
        .where('userId', '==', uid)
        .get();
    } else {
      snapshot = await db.collection('soil_assessments').get();
    }

    // Map to {date, score, class, barangay} and keep only completed with a score
    const points = snapshot.docs
      .map(d => d.data())
      .filter(a => a.status === 'completed' && a.fuzzyResult?.fertilityScore != null)
      .map(a => {
        const ts = a.createdAt?._seconds
          ? new Date(a.createdAt._seconds * 1000)
          : new Date(a.createdAt);
        return {
          assessmentId: a.assessmentId,
          date:         ts.toISOString(),
          score:        a.fuzzyResult.fertilityScore,
          fertilityClass: a.fuzzyResult.fertilityClass,
          barangay:     a.location?.barangay || null,
          bestCrop:     a.rootcropResults?.find(r => r.rank === 1)?.cropName || null,
        };
      });

    // Sort ascending by date for charting
    points.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Compute simple trend direction (compare last two)
    let trendDirection = 'stable';
    if (points.length >= 2) {
      const diff = points[points.length - 1].score - points[points.length - 2].score;
      if (diff > 3)      trendDirection = 'improving';
      else if (diff < -3) trendDirection = 'declining';
    }

    res.json({
      success: true,
      data: {
        points,
        count: points.length,
        trendDirection,
        latestScore: points.length > 0 ? points[points.length - 1].score : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/export
 * Exports all assessments as CSV for researchers/analysis.
 * Farmers get only their own; researchers/admins get all.
 */
async function exportCSV(req, res, next) {
  try {
    const { uid, role } = req.user;

    let snapshot;
    if (role === 'farmer') {
      snapshot = await db.collection('soil_assessments').where('userId', '==', uid).get();
    } else {
      snapshot = await db.collection('soil_assessments').get();
    }

    const rows = snapshot.docs.map(d => d.data()).filter(a => a.status === 'completed');

    // Sort by date
    rows.sort((a, b) => {
      const tA = a.createdAt?._seconds ?? 0;
      const tB = b.createdAt?._seconds ?? 0;
      return tA - tB;
    });

    // CSV header
    const headers = [
      'Assessment ID', 'Date', 'Farmer', 'Barangay', 'Municipality',
      'Latitude', 'Longitude',
      'Soil pH', 'Soil Moisture (%)', 'Image Quality',
      'Fertility Class', 'Fertility Score', 'Confidence (%)',
      'Best Crop', 'Best Crop Score', 'Second Crop', 'Second Crop Score',
      'Not Suitable Crop', 'Not Suitable Score',
      'Lab Validated', 'Lab Fertility Class', 'Lab pH',
      'Processing Time (ms)',
    ];

    // Escape a CSV cell (wrap in quotes, double internal quotes)
    const esc = (v) => {
      if (v == null) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [headers.join(',')];

    for (const a of rows) {
      const ts = a.createdAt?._seconds ? new Date(a.createdAt._seconds * 1000) : new Date(a.createdAt);
      const crops = a.rootcropResults || a.cropRecommendations || [];
      const best   = crops.find(c => c.status === 'BEST' || c.status === 'CLOSEST');
      const second = crops.find(c => c.status === 'SECOND_BEST');
      const notSuit = crops.find(c => c.status === 'NOT_SUITABLE');

      lines.push([
        esc(a.assessmentId),
        esc(ts.toISOString().slice(0, 10)),
        esc(a.farmerName),
        esc(a.location?.barangay),
        esc(a.location?.municipality),
        esc(a.location?.latitude),
        esc(a.location?.longitude),
        esc(a.sensorData?.soilPH),
        esc(a.sensorData?.soilMoisture),
        esc(a.imageFeatures?.imageQuality),
        esc(a.fuzzyResult?.fertilityClass),
        esc(a.fuzzyResult?.fertilityScore),
        esc(a.fuzzyResult?.confidence),
        esc(best?.cropName),
        esc(best?.suitabilityScore),
        esc(second?.cropName),
        esc(second?.suitabilityScore),
        esc(notSuit?.cropName),
        esc(notSuit?.suitabilityScore),
        esc(a.labValidation?.isValidated ? 'Yes' : 'No'),
        esc(a.labValidation?.labFertilityClass),
        esc(a.labValidation?.labPH),
        esc(a.processingTimeMs),
      ].join(','));
    }

    const csv = lines.join('\n');
    const filename = `soilsense_assessments_${new Date().toISOString().slice(0,10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary, getAccuracy, getProcessingTimes, getTrend, exportCSV };
