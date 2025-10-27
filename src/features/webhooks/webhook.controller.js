const logger = require('../../common/utils/logger');
const SummarizationService = require('../ai-summarization/summarization.service');
const ZendeskService = require('../zendesk-integration/zendesk.service');
const { config } = require('../../config');

/**
 * Webhook Controller
 * Handles incoming webhook requests
 */
class WebhookController {
  constructor() {
    this.summarizationService = new SummarizationService();
    this.zendeskService = new ZendeskService();
  }

  /**
   * Process Zendesk webhook
   */
  async processZendeskWebhook(req, res) {
    const startTime = Date.now();
    const { ticket } = req.body;

    logger.info('Received Zendesk webhook', {
      ticketId: ticket.id,
      ip: req.ip
    });

    try {
      // Generate AI summary
      const summary = await this.summarizationService.summarize(ticket);

      // Post to Zendesk when credentials are available
      if (this.zendeskService.isConfigured()) {
        await this.zendeskService.addSummaryNote(ticket.id, summary);
      } else {
        logger.info('Zendesk integration not configured - skipping API call', {
          ticketId: ticket.id,
          isMockMode: config.ai.useMock
        });
        logger.debug('Would have posted summary', {
          ticketId: ticket.id,
          summaryPreview: summary.substring(0, 100)
        });
      }

      const processingTime = Date.now() - startTime;

      logger.info('Webhook processed successfully', {
        ticketId: ticket.id,
        processingTimeMs: processingTime
      });

      res.json({
        success: true,
        ticket_id: ticket.id,
        summary: summary,
        processed_at: new Date().toISOString(),
        processing_time_ms: processingTime
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Webhook processing failed', {
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

  /**
   * Health check endpoint
   */
  async health(req, res) {
    const providerInfo = this.summarizationService.getProviderInfo();

    res.json({
      status: 'healthy',
      service: 'zendesk-ai-microservice',
      version: '2.0.0',
      environment: config.nodeEnv,
      ai_provider: providerInfo.name,
      mock_mode: providerInfo.isMock,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = WebhookController;
