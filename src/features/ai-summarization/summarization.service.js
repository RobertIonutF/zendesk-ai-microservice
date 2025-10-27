const logger = require('../../common/utils/logger');
const { config } = require('../../config');
const OpenAIProvider = require('./providers/openai.provider');
const MockProvider = require('./providers/mock.provider');

/**
 * AI Summarization Service
 * Manages AI providers and handles summarization requests
 */
class SummarizationService {
  constructor() {
    this.provider = this._initializeProvider();
  }

  /**
   * Initialize the appropriate AI provider based on configuration
   * @private
   */
  _initializeProvider() {
    if (config.ai.useMock) {
      logger.info('Initializing Mock AI provider');
      return new MockProvider();
    }

    logger.info('Initializing OpenAI provider');
    return new OpenAIProvider(config.ai.openai);
  }

  /**
   * Summarize ticket content
   * @param {Object} ticket - Ticket object containing title and description
   * @returns {Promise<string>} - Summarized text
   */
  async summarize(ticket) {
    logger.info('Summarizing ticket', {
      ticketId: ticket.id,
      titleLength: ticket.title.length,
      descriptionLength: ticket.description.length
    });

    const startTime = Date.now();

    try {
      const content = this._formatTicketContent(ticket);
      const summary = await this.provider.summarize(content);

      const duration = Date.now() - startTime;
      logger.info('Summarization completed', {
        ticketId: ticket.id,
        duration: `${duration}ms`,
        summaryLength: summary.length
      });

      return summary;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Summarization failed', {
        ticketId: ticket.id,
        duration: `${duration}ms`,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Format ticket content for AI processing
   * @private
   */
  _formatTicketContent(ticket) {
    return `Title: ${ticket.title}\n\nDescription: ${ticket.description}`;
  }

  /**
   * Get current provider information
   */
  getProviderInfo() {
    return {
      name: this.provider.name,
      isMock: config.ai.useMock
    };
  }
}

module.exports = SummarizationService;
