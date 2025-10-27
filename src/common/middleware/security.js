const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { config } = require('../../config');

/**
 * Verify Zendesk webhook signature
 */
function verifyWebhookSignature(req, res, next) {
  if (!config.webhookSecret) {
    logger.warn('⚠️  Webhook signature verification skipped - no secret configured');
    return next();
  }
  
  const signature = req.headers['x-zendesk-webhook-signature'];
  const timestamp = req.headers['x-zendesk-webhook-signature-timestamp'];
  
  if (!signature || !timestamp) {
    logger.warn('Missing webhook signature headers', { ip: req.ip });
    return res.status(401).json({ error: 'Unauthorized: Missing signature' });
  }
  
  const requestTime = parseInt(timestamp);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(currentTime - requestTime);
  
  if (timeDiff > 300) {
    logger.warn('Webhook timestamp too old', { timeDiff, ip: req.ip });
    return res.status(401).json({ error: 'Unauthorized: Timestamp expired' });
  }
  
  const payload = `${timestamp}.${JSON.stringify(req.body)}`;
  const expectedSignature = crypto
    .createHmac('sha256', config.webhookSecret)
    .update(payload)
    .digest('hex');
  
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
  
  if (!isValid) {
    logger.warn('Invalid webhook signature', { ip: req.ip });
    return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
  }
  
  logger.info('✅ Webhook signature verified');
  next();
}

/**
 * Input validation rules for webhook payload
 */
const validateWebhookPayload = [
  body('ticket').exists().withMessage('ticket object is required'),
  body('ticket.id')
    .exists().withMessage('ticket.id is required')
    .isInt({ min: 1 }).withMessage('ticket.id must be a positive integer'),
  body('ticket.title')
    .exists().withMessage('ticket.title is required')
    .isString().withMessage('ticket.title must be a string')
    .trim()
    .isLength({ min: 1, max: 1000 }).withMessage('ticket.title must be 1-1000 characters'),
  body('ticket.description')
    .exists().withMessage('ticket.description is required')
    .isString().withMessage('ticket.description must be a string')
    .trim()
    .isLength({ min: 1, max: 10000 }).withMessage('ticket.description must be 1-10000 characters'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed', { errors: errors.array(), ip: req.ip });
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }
    next();
  }
];

/**
 * Request timeout middleware
 */
function requestTimeout(req, res, next) {
  req.setTimeout(config.requestTimeout, () => {
    logger.warn('Request timeout', { path: req.path, ip: req.ip });
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
}

/**
 * Additional security headers
 */
function additionalSecurityHeaders(req, res, next) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.removeHeader('X-Powered-By');
  next();
}

/**
 * IP whitelist middleware
 */
function ipWhitelist(req, res, next) {
  if (config.allowedIPs.length === 0) {
    return next();
  }
  
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (!config.allowedIPs.includes(clientIP)) {
    logger.warn('IP not whitelisted', { ip: clientIP });
    return res.status(403).json({ error: 'Forbidden: IP not allowed' });
  }
  
  next();
}

/**
 * Global error handler
 */
function errorHandler(error, req, res, next) {
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  const statusCode = error.statusCode || 500;
  const message = config.nodeEnv === 'production' 
    ? 'An error occurred processing your request'
    : error.message;
  
  res.status(statusCode).json({
    error: message,
    ...(req.id && { requestId: req.id })
  });
}

module.exports = {
  verifyWebhookSignature,
  validateWebhookPayload,
  requestTimeout,
  additionalSecurityHeaders,
  ipWhitelist,
  errorHandler
};
