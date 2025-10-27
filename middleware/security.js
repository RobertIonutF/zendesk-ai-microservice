const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const logger = require('../logger');
const { config } = require('../config');

/**
 * Verify Zendesk webhook signature
 * Zendesk signs webhooks with HMAC-SHA256
 */
function verifyWebhookSignature(req, res, next) {
  // Skip signature verification if no secret is configured (development only)
  if (!config.webhookSecret) {
    logger.warn('⚠️  Webhook signature verification skipped - no secret configured');
    return next();
  }
  
  const signature = req.headers['x-zendesk-webhook-signature'];
  const timestamp = req.headers['x-zendesk-webhook-signature-timestamp'];
  
  if (!signature || !timestamp) {
    logger.warn('Missing webhook signature headers', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return res.status(401).json({ error: 'Unauthorized: Missing signature' });
  }
  
  // Verify timestamp is recent (within 5 minutes) to prevent replay attacks
  const requestTime = parseInt(timestamp);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(currentTime - requestTime);
  
  if (timeDiff > 300) { // 5 minutes
    logger.warn('Webhook timestamp too old', {
      timeDiff,
      ip: req.ip
    });
    return res.status(401).json({ error: 'Unauthorized: Timestamp expired' });
  }
  
  // Calculate expected signature
  const payload = `${timestamp}.${JSON.stringify(req.body)}`;
  const expectedSignature = crypto
    .createHmac('sha256', config.webhookSecret)
    .update(payload)
    .digest('hex');
  
  // Compare signatures using timing-safe comparison
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
  
  if (!isValid) {
    logger.warn('Invalid webhook signature', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
  }
  
  logger.info('✅ Webhook signature verified');
  next();
}

/**
 * Input validation rules for webhook endpoint
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
  
  // Middleware to handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed', {
        errors: errors.array(),
        ip: req.ip
      });
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
 * Sanitize error responses to prevent information leakage
 */
function sanitizeError(error, req, res, next) {
  // Log full error details
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  // Send sanitized error to client
  const statusCode = error.statusCode || 500;
  const message = config.nodeEnv === 'production' 
    ? 'An error occurred processing your request'
    : error.message;
  
  res.status(statusCode).json({
    error: message,
    requestId: req.id // If you add request ID middleware
  });
}

/**
 * Request timeout middleware
 */
function requestTimeout(req, res, next) {
  req.setTimeout(config.requestTimeout, () => {
    logger.warn('Request timeout', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
}

/**
 * Security headers middleware (additional to helmet)
 */
function additionalSecurityHeaders(req, res, next) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Remove server header
  res.removeHeader('X-Powered-By');
  
  next();
}

/**
 * IP whitelist middleware (optional)
 */
function ipWhitelist(req, res, next) {
  const allowedIPs = process.env.ALLOWED_IPS?.split(',').map(ip => ip.trim()) || [];
  
  if (allowedIPs.length === 0) {
    return next(); // No whitelist configured
  }
  
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (!allowedIPs.includes(clientIP)) {
    logger.warn('IP not whitelisted', { ip: clientIP });
    return res.status(403).json({ error: 'Forbidden: IP not allowed' });
  }
  
  next();
}

module.exports = {
  verifyWebhookSignature,
  validateWebhookPayload,
  sanitizeError,
  requestTimeout,
  additionalSecurityHeaders,
  ipWhitelist
};
