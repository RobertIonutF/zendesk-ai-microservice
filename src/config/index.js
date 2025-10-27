require('dotenv').config();
const logger = require('../common/utils/logger');

/**
 * Validate required environment variables
 */
function validateConfig() {
  const useMockAI = process.env.USE_MOCK_AI === 'true';
  const zendeskDisabled = process.env.ZENDESK_ENABLED === 'false';
  
  if (!useMockAI && !zendeskDisabled) {
    logger.info('Production mode detected - validating API credentials');
    
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      throw new Error('OPENAI_API_KEY is required when USE_MOCK_AI=false');
    }
    
    if (!process.env.ZENDESK_SUBDOMAIN || process.env.ZENDESK_SUBDOMAIN === 'your_subdomain') {
      throw new Error('ZENDESK_SUBDOMAIN is required when USE_MOCK_AI=false and Zendesk integration is enabled');
    }
    
    if (!process.env.ZENDESK_EMAIL || process.env.ZENDESK_EMAIL === 'your_email@example.com') {
      throw new Error('ZENDESK_EMAIL is required when USE_MOCK_AI=false and Zendesk integration is enabled');
    }
    
    if (!process.env.ZENDESK_API_TOKEN || process.env.ZENDESK_API_TOKEN === 'your_api_token_here') {
      throw new Error('ZENDESK_API_TOKEN is required when USE_MOCK_AI=false and Zendesk integration is enabled');
    }
  } else if (zendeskDisabled) {
    logger.info('Zendesk integration disabled via ZENDESK_ENABLED=false');
  }
  
  logger.info('✅ Configuration validated successfully');
}

/**
 * Application configuration
 */
const config = {
  // Server
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Security
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10,
  webhookSecret: process.env.ZENDESK_WEBHOOK_SECRET || null,
  maxRequestSize: process.env.MAX_REQUEST_SIZE || '1mb',
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000,
  allowedIPs: process.env.ALLOWED_IPS?.split(',').map(ip => ip.trim()) || [],
  
  // AI Configuration
  ai: {
    useMock: process.env.USE_MOCK_AI === 'true',
    provider: 'openai',
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 300,
      timeout: parseInt(process.env.OPENAI_TIMEOUT_MS) || 15000,
      temperature: process.env.OPENAI_TEMPERATURE !== undefined
        ? parseFloat(process.env.OPENAI_TEMPERATURE)
        : undefined,
    }
  },
  
  // Zendesk Configuration
  zendesk: {
    enabled: process.env.ZENDESK_ENABLED !== 'false',
    subdomain: process.env.ZENDESK_SUBDOMAIN,
    email: process.env.ZENDESK_EMAIL,
    apiToken: process.env.ZENDESK_API_TOKEN,
    timeout: parseInt(process.env.ZENDESK_TIMEOUT_MS) || 10000,
  },
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Performance
  enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
};

module.exports = {
  config,
  validateConfig
};
