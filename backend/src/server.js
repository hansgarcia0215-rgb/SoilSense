/**
 * server.js — HTTP server entry point
 *
 * What it does:
 *   Loads the Express app and starts listening on the configured port.
 *
 * How to run:
 *   Development: npm run dev
 *   Production:  npm start
 *
 * Expected result:
 *   [SoilSense API] Server running on port 3001
 */

require('dotenv').config();
const app = require('./app');

const PORT = parseInt(process.env.PORT || '3001', 10);

const server = app.listen(PORT, () => {
  console.log(`\n🌱 [SoilSense API] Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});

// Graceful shutdown — close connections cleanly on process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down...');
  server.close(() => process.exit(0));
});

// Catch unhandled promise rejections (e.g. Firebase connection failures)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});

module.exports = server;



