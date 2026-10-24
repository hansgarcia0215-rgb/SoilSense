/**
 * app.js — Express application setup
 *
 * What it does:
 *   Creates and configures the Express application:
 *   - Security headers (Helmet)
 *   - CORS configuration
 *   - Rate limiting
 *   - Request logging (Morgan)
 *   - Body parsing
 *   - All API routes
 *   - 404 handler
 *   - Centralized error handler
 *
 * How to run:
 *   From the /backend directory:
 *   npm run dev    (development with nodemon)
 *   npm start      (production)
 *
 * Expected result:
 *   Server running at http://localhost:3001
 *   Health check: GET http://localhost:3001/api/health
 */

require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');

const authRoutes        = require('./routes/auth.routes');
const assessmentRoutes  = require('./routes/assessment.routes');
const sensorRoutes      = require('./routes/sensor.routes');
const analyticsRoutes   = require('./routes/analytics.routes');
const adminRoutes       = require('./routes/admin.routes');
const { errorHandler }  = require('./utils/errorHandler');

const app = express();
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

// ─── Security Headers ─────────────────────────────────────────
// Helmet adds important HTTP security headers automatically
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images to be loaded cross-origin
}));

// ─── CORS ─────────────────────────────────────────────────────
// Allows the React frontend to call this API
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. Postman, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Key'],
}));

// ─── Rate Limiting ────────────────────────────────────────────
// Prevents abuse and brute-force attacks
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),  // 15 minutes
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),  // Max 100 requests per window
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    error:   'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please wait a moment and try again.',
  },
});

// Stricter rate limit for authentication endpoints.
// Only FAILED logins count toward the limit — successful sign-ins
// never lock legitimate users out.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // 15 minutes
  max:      10,                  // Max 10 failed login attempts per window
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error:   'AUTH_RATE_LIMIT',
    message: 'Too many login attempts. Please wait 15 minutes and try again.',
  },
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);

// ─── Request Logging ──────────────────────────────────────────
// Logs all HTTP requests in development
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Body Parsing ─────────────────────────────────────────────
// Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Health Check ─────────────────────────────────────────────
// Used to verify the server is running (for deployment checks)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'SoilSense API',
    version: '2.0.0',
    status:  'running',
    time:    new Date().toISOString(),
    env:     process.env.NODE_ENV || 'development',
  });
});

// ─── Services Health Check ────────────────────────────────────
// Checks if the Python microservices (image processing + fuzzy engine) are reachable
app.get('/api/health/services', async (req, res) => {
  const axios = require('axios');
  const check = async (url, name, expectedService) => {
    try {
      const response = await axios.get(`${url}/health`, { timeout: 60000 });
      const service = response.data?.service;
      if (service !== expectedService) {
        return {
          name,
          status: 'misconfigured',
          url,
          message: `Expected ${expectedService}, received ${service || 'unknown service'}.`,
        };
      }
      if (response.data?.ready === false) {
        return {
          name,
          status: 'not_ready',
          url,
          message: response.data.message || 'Service is missing required configuration.',
        };
      }
      return { name, status: 'online', url };
    } catch (err) {
      return {
        name,
        status: 'offline',
        url,
        message: err.response?.status
          ? `Health check returned HTTP ${err.response.status}.`
          : 'Health check could not reach the service.',
      };
    }
  };

  const [imgResult, fuzzyResult] = await Promise.all([
    check(IMAGE_PROCESSING_URL, 'imageProcessing', 'SoilSense Image Processing'),
    check(FUZZY_ENGINE_URL, 'fuzzyEngine', 'SoilSense Fuzzy Logic Engine'),
  ]);

  res.json({
    success: true,
    services: {
      imageProcessing: imgResult,
      fuzzyEngine:     fuzzyResult,
    },
    allOnline: imgResult.status === 'online' && fuzzyResult.status === 'online',
  });
});

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/sensors',     sensorRoutes);
app.use('/api/analytics',   analyticsRoutes);
app.use('/api/admin',       adminRoutes);

// ─── 404 Handler ─────────────────────────────────────────────
// Catches requests to routes that don't exist
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error:   'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found.`,
  });
});

// ─── Centralized Error Handler ────────────────────────────────
// Must be registered LAST — handles all errors from routes/middleware
app.use(errorHandler);

module.exports = app;
