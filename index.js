const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const compression = require('compression');
const axios = require('axios');

const logger = require('./logger');
const { config, validateConfig } = require('./config');
const {
  verifyWebhookSignature,
  validateWebhookPayload,
  sanitizeError,
  requestTimeout,
  additionalSecurityHeaders,
  ipWhitelist
} = require('./middleware/security');

// Validate configuration on startup
try {
  validateConfig();
} catch (error) {
  logger.error('Configuration validation failed:', error.message);
  process.exit(1);
}

const app = express();

// Trust proxy - important for rate limiting and IP detection
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

// Security: Additional security headers
app.use(additionalSecurityHeaders);

// Security: CORS configuration
const corsOptions = {
  origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-zendesk-webhook-signature', 'x-zendesk-webhook-signature-timestamp'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Performance: Compression
if (config.enableCompression) {
  app.use(compression());
}

// Security: Request size limit
app.use(express.json({ limit: config.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.maxRequestSize }));

// Security: Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});
app.use('/webhook', limiter);

// Security: Request timeout
app.use(requestTimeout);

// Security: IP whitelist (optional)
if (process.env.ALLOWED_IPS) {
  app.use('/webhook', ipWhitelist);
}

/**
 * Mock AI summarization function
 * @param {string} text - Text to summarize
 * @returns {Promise<string>} - Summarized text
 */
async function mockAISummarize(text) {
  logger.info('Using mock AI summarization');
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const words = text.split(' ').length;
  const sentences = text.split(/[.!?]+/).length;
  
  return `[MOCK AI SUMMARY]\n\n📊 Analysis:\n- Word count: ${words}\n- Sentences: ${sentences}\n\n📝 Summary: This ticket contains customer feedback that requires attention. The main topic appears to be related to ${text.substring(0, 50)}...\n\n✅ Recommended action: Review and respond to customer within 24 hours.`;
}

/**
 * Call OpenAI API for summarization
 * @param {string} text - Text to summarize
 * @returns {Promise<string>} - Summarized text
 */
async function openAISummarize(text) {
  logger.info('Calling OpenAI API for summarization');
  
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: config.openaiModel,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes customer support tickets concisely. Provide actionable insights and key points.'
          },
          {
            role: 'user',
            content: `Please summarize this support ticket:\n\n${text}`
          }
        ],
        max_tokens: config.openaiMaxTokens,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${config.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: config.openaiTimeout,
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      }
    );
    
    if (response.status !== 200) {
      logger.error('OpenAI API returned non-200 status', {
        status: response.status,
        data: response.data
      });
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const summary = response.data.choices[0].message.content;
    logger.info('AI summary generated successfully');
    return summary;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      logger.error('OpenAI API timeout');
      throw new Error('AI service timeout - please try again');
    }
    
    logger.error('OpenAI API error', {
      message: error.message,
      response: error.response?.data
    });
    throw new Error('Failed to generate AI summary');
  }
}

/**
 * Post internal note to Zendesk ticket
 * @param {number} ticketId - Zendesk ticket ID
 * @param {string} note - Note content
 * @returns {Promise<void>}
 */
async function postZendeskNote(ticketId, note) {
  const auth = Buffer.from(`${config.zendeskEmail}/token:${config.zendeskApiToken}`).toString('base64');
  
  logger.info('Posting summary to Zendesk', { ticketId });
  
  try {
    const response = await axios.put(
      `https://${config.zendeskSubdomain}.zendesk.com/api/v2/tickets/${ticketId}.json`,
      {
        ticket: {
          comment: {
            body: note,
            public: false // Internal note
          }
        }
      },
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: config.zendeskTimeout,
        validateStatus: (status) => status < 500
      }
    );
    
    if (response.status !== 200) {
      logger.error('Zendesk API returned non-200 status', {
        status: response.status,
        ticketId,
        data: response.data
      });
      throw new Error(`Zendesk API error: ${response.status}`);
    }
    
    logger.info('Note posted successfully to Zendesk', { ticketId });
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      logger.error('Zendesk API timeout', { ticketId });
      throw new Error('Zendesk service timeout - please try again');
    }
    
    logger.error('Zendesk API error', {
      ticketId,
      message: error.message,
      response: error.response?.data
    });
    throw new Error('Failed to post note to Zendesk');
  }
}

/**
 * Process ticket and generate AI summary
 * @param {object} ticket - Ticket data
 * @returns {Promise<string>} - AI summary
 */
async function processTicket(ticket) {
  const ticketText = `Title: ${ticket.title}\n\nDescription: ${ticket.description}`;
  
  logger.info('Processing ticket', {
    ticketId: ticket.id,
    contentLength: ticketText.length
  });
  
  // Choose AI service based on configuration
  const summary = config.useMockAI 
    ? await mockAISummarize(ticketText)
    : await openAISummarize(ticketText);
  
  return summary;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'zendesk-ai-microservice',
    version: '2.0.0',
    environment: config.nodeEnv,
    mock_mode: config.useMockAI,
    timestamp: new Date().toISOString()
  });
});

// Main webhook endpoint
app.post(
  '/webhook/zendesk',
  verifyWebhookSignature,
  validateWebhookPayload,
  async (req, res) => {
    const startTime = Date.now();
    const { ticket } = req.body;
    
    logger.info('Received webhook from Zendesk', {
      ticketId: ticket.id,
      ip: req.ip
    });
    
    try {
      // Generate AI summary
      const summary = await processTicket(ticket);
      
      // Post to Zendesk (skip if mock mode and credentials not provided)
      if (!config.useMockAI || (config.zendeskSubdomain && config.zendeskEmail && config.zendeskApiToken)) {
        const summaryNote = `🤖 AI-Generated Summary\n\n${summary}\n\n---\nGenerated at: ${new Date().toISOString()}`;
        await postZendeskNote(ticket.id, summaryNote);
      } else {
        logger.info('Mock mode: Skipping Zendesk API call');
        logger.debug('Would have posted summary', { summary });
      }
      
      const processingTime = Date.now() - startTime;
      
      logger.info('Webhook processed successfully', {
        ticketId: ticket.id,
        processingTimeMs: processingTime
      });
      
      // Return response
      res.json({
        success: true,
        ticket_id: ticket.id,
        summary: summary,
        processed_at: new Date().toISOString(),
        processing_time_ms: processingTime
      });
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Error processing webhook', {
        ticketId: ticket.id,
        error: error.message,
        processingTimeMs: processingTime,
        ip: req.ip
      });
      
      const statusCode = error.message.includes('timeout') ? 504 : 500;
      
      res.status(statusCode).json({ 
        success: false,
        error: config.nodeEnv === 'production' 
          ? 'An error occurred processing the webhook'
          : error.message,
        ticket_id: ticket.id,
        processing_time_ms: processingTime
      });
    }
  }
);

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
app.use(sanitizeError);

// Start server
const server = app.listen(config.port, () => {
  logger.info('\n🚀 Zendesk AI Microservice started');
  logger.info(`📡 Listening on port ${config.port}`);
  logger.info(`🤖 AI Mode: ${config.useMockAI ? 'MOCK' : 'OpenAI'}`);
  logger.info(`🌍 Environment: ${config.nodeEnv}`);
  logger.info(`\n📍 Endpoints:`);
  logger.info(`   GET  http://localhost:${config.port}/health`);
  logger.info(`   POST http://localhost:${config.port}/webhook/zendesk`);
  logger.info('\n✅ Ready to receive webhooks\n');
});

// Graceful shutdown
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
