const express = require('express');
const WebhookController = require('./webhook.controller');
const {
  verifyWebhookSignature,
  validateWebhookPayload,
  ipWhitelist
} = require('../../common/middleware/security');

const router = express.Router();
const controller = new WebhookController();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => controller.health(req, res));

/**
 * Zendesk webhook endpoint
 * Protected by: signature verification, IP whitelist (optional), input validation
 */
router.post(
  '/webhook/zendesk',
  ipWhitelist,
  verifyWebhookSignature,
  validateWebhookPayload,
  (req, res) => controller.processZendeskWebhook(req, res)
);

module.exports = router;
