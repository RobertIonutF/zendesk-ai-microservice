require('dotenv').config();
const logger = require('./logger');

/**
 * Validate required environment variables
 * @param {string[]} requiredVars - Array of required variable names
 * @throws {Error} If any required variables are missing
 */
function validateRequiredEnvVars(requiredVars) {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Validate configuration on startup
 */
function validateConfig() {
  const useMockAI = process.env.USE_MOCK_AI === 'true';
  
  // Always required
  const alwaysRequired = [];
  
  // Required only when not in mock mode
  if (!useMockAI) {
    logger.info('Production mode detected - validating API credentials');
    
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      throw new Error('OPENAI_API_KEY is required when USE_MOCK_AI=false');
    }
    
    if (!process.env.ZENDESK_SUBDOMAIN || process.env.ZENDESK_SUBDOMAIN === 'your_subdomain') {
      throw new Error('ZENDESK_SUBDOMAIN is required when USE_MOCK_AI=false');
    }
    
    if (!process.env.ZENDESK_EMAIL || process.env.ZENDESK_EMAIL === 'your_email@example.com') {
      throw new Error('ZENDESK_EMAIL is required when USE_MOCK_AI=false');
    }
    
    if (!process.env.ZENDESK_API_TOKEN || process.env.ZENDESK_API_TOKEN === 'your_api_token_here') {
      throw new Error('ZENDESK_API_TOKEN is required when USE_MOCK_AI=false');
    }
  }
  
  validateRequiredEnvVars(alwaysRequired);
  
  logger.info('✅ Configuration validated successfully');
}

/**
 * Application configuration object
 */
const config = {
  // Server
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Security
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10,
  webhookSecret: process.env.ZENDESK_WEBHOOK_SECRET || null,
  maxRequestSize: process.env.MAX_REQUEST_SIZE || '1mb',
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000, // 30 seconds
  
  // AI
  useMockAI: process.env.USE_MOCK_AI === 'true',
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  openaiMaxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 300,
  openaiTimeout: parseInt(process.env.OPENAI_TIMEOUT_MS) || 15000, // 15 seconds
  
  // Zendesk
  zendeskSubdomain: process.env.ZENDESK_SUBDOMAIN,
  zendeskEmail: process.env.ZENDESK_EMAIL,
  zendeskApiToken: process.env.ZENDESK_API_TOKEN,
  zendeskTimeout: parseInt(process.env.ZENDESK_TIMEOUT_MS) || 10000, // 10 seconds
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Performance
  enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
  cacheEnabled: process.env.CACHE_ENABLED === 'true',
  cacheTTL: parseInt(process.env.CACHE_TTL_SECONDS) || 300 // 5 minutes
};

module.exports = {
  config,
  validateConfig
};
