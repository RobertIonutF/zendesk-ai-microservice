const createApp = require('./src/app');
const logger = require('./src/common/utils/logger');
const { config, validateConfig } = require('./src/config');

/**
 * Server entry point
 */

// Validate configuration on startup
try {
  validateConfig();
} catch (error) {
  logger.error('Configuration validation failed:', error.message);
  process.exit(1);
}

// Create Express app
const app = createApp();

// Start server
const server = app.listen(config.port, () => {
  logger.info('\n🚀 Zendesk AI Microservice started');
  logger.info(`📡 Listening on port ${config.port}`);
  logger.info(`🤖 AI Mode: ${config.ai.useMock ? 'MOCK' : config.ai.provider.toUpperCase()}`);
  logger.info(`🌍 Environment: ${config.nodeEnv}`);
  logger.info(`\n📍 Endpoints:`);
  logger.info(`   GET  http://localhost:${config.port}/health`);
  logger.info(`   POST http://localhost:${config.port}/webhook/zendesk`);
  logger.info('\n✅ Ready to receive webhooks\n');
});

/**
 * Graceful shutdown
 */
const gracefulShutdown = (signal) => {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('👋 Server closed. Exiting process.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason,
    promise
  });
});

module.exports = server;
