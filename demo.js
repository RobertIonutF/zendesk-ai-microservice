require('dotenv').config();

const axios = require('axios');
const crypto = require('crypto');
const logger = require('./src/common/utils/logger');

const payload = require('./example-webhook-payload.json');

const DEFAULT_PORT = process.env.PORT || 3000;
const BASE_URL = process.env.DEMO_BASE_URL || `http://localhost:${DEFAULT_PORT}`;
const HEALTH_TIMEOUT_MS = parseInt(process.env.DEMO_HEALTH_TIMEOUT_MS, 10) || 10000;
const WEBHOOK_TIMEOUT_MS = parseInt(process.env.DEMO_WEBHOOK_TIMEOUT_MS, 10) || 35000;

function buildHeaders(body) {
  const headers = {
    'Content-Type': 'application/json'
  };

  const secret = process.env.ZENDESK_WEBHOOK_SECRET;
  if (secret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const rawBody = JSON.stringify(body);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    headers['x-zendesk-webhook-signature'] = signature;
    headers['x-zendesk-webhook-signature-timestamp'] = timestamp;
  }

  return headers;
}

async function checkHealth() {
  logger.info('🔍 Checking service health...');
  const response = await axios.get(`${BASE_URL}/health`, {
    timeout: HEALTH_TIMEOUT_MS
  });

  logger.info('✅ Service responded to /health', {
    status: response.status,
    data: response.data
  });

  return response.data;
}

async function sendWebhook() {
  logger.info('📨 Sending Zendesk webhook payload...');
  const headers = buildHeaders(payload);

  const response = await axios.post(`${BASE_URL}/webhook/zendesk`, payload, {
    headers,
    timeout: WEBHOOK_TIMEOUT_MS
  });

  logger.info('✅ Webhook processed successfully', {
    status: response.status,
    data: response.data
  });

  return response.data;
}

async function runDemo() {
  logger.info('🚀 Starting Zendesk AI microservice demo', {
    baseUrl: BASE_URL
  });

  try {
    await checkHealth();
    await sendWebhook();

    logger.info('🎉 Demo completed successfully');
    process.exit(0);
  } catch (error) {
    if (error.response) {
      logger.error('❌ Request failed', {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      logger.error('❌ No response received from server', {
        message: error.message
      });
    } else {
      logger.error('❌ Unexpected error occurred', {
        message: error.message
      });
    }

    process.exit(1);
  }
}

runDemo();

