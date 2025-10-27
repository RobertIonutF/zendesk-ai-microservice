const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const compression = require('compression');

const logger = require('./common/utils/logger');
const { config } = require('./config');
const {
  requestTimeout,
  additionalSecurityHeaders,
  errorHandler
} = require('./common/middleware/security');

const webhookRoutes = require('./features/webhooks/webhook.routes');

/**
 * Create and configure Express application
 */
function createApp() {
  const app = express();

  // Trust proxy
  app.set('trust proxy', 1);

  // Security: Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // Security: Additional headers
  app.use(additionalSecurityHeaders);

  // Security: CORS
  const corsOptions = {
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
    methods: ['GET', 'POST'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-zendesk-webhook-signature',
      'x-zendesk-webhook-signature-timestamp'
    ],
    credentials: true,
    maxAge: 86400
  };
  app.use(cors(corsOptions));

  // Performance: Compression
  if (config.enableCompression) {
    app.use(compression());
  }

  // Body parsing
  app.use(express.json({ limit: config.maxRequestSize }));
  app.use(express.urlencoded({ extended: true, limit: config.maxRequestSize }));

  // Security: Rate limiting for webhook endpoints
  const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMaxRequests,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
      res.status(429).json({ error: 'Too many requests, please try again later.' });
    }
  });
  app.use('/webhook', limiter);

  // Security: Request timeout
  app.use(requestTimeout);

  // Routes
  app.use('/', webhookRoutes);

  // 404 handler
  app.use((req, res) => {
    logger.warn('Route not found', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    res.status(404).json({ error: 'Route not found' });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
