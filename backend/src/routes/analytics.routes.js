/**
 * analytics.routes.js — Research analytics and dashboard data endpoints
 *
 * Routes:
 *   GET /api/analytics/summary              → Dashboard summary cards
 *   GET /api/analytics/accuracy             → Classification accuracy metrics
 *   GET /api/analytics/processing-times     → Performance timing data
 */

const express  = require('express');
const router   = express.Router();

const { getSummary, getAccuracy, getProcessingTimes, getTrend, exportCSV } = require('../controllers/analytics.controller');
const { authenticate }  = require('../middleware/auth.middleware');

// All analytics routes require authentication
router.use(authenticate);

router.get('/summary',          getSummary);
router.get('/accuracy',         getAccuracy);
router.get('/processing-times', getProcessingTimes);
router.get('/trend',            getTrend);
router.get('/export',           exportCSV);

module.exports = router;
