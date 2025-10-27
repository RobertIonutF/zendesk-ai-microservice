const logger = require('../../common/utils/logger');
const ZendeskClient = require('./zendesk.client');
const { config } = require('../../config');

/**
 * Zendesk Integration Service
 * Handles business logic for Zendesk operations
 */
class ZendeskService {
  constructor() {
    this.client = new ZendeskClient(config.zendesk);
  }

  /**
   * Add AI summary as internal note to ticket
   * @param {number} ticketId - Zendesk ticket ID
   * @param {string} summary - AI-generated summary
   * @returns {Promise<Object>} - Updated ticket data
   */
  async addSummaryNote(ticketId, summary) {
    logger.info('Adding AI summary to ticket', { ticketId });

    const note = this._formatSummaryNote(summary);

    try {
      const result = await this.client.addInternalNote(ticketId, note);
      
      logger.info('Summary note added successfully', { ticketId });
      return result;
    } catch (error) {
      logger.error('Failed to add summary note', {
        ticketId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Format summary as internal note
   * @private
   */
  _formatSummaryNote(summary) {
    return `🤖 AI-Generated Summary\n\n${summary}\n\n---\nGenerated at: ${new Date().toISOString()}\nPowered by Zendesk AI Microservice`;
  }

  /**
   * Check if Zendesk integration is configured
   */
  isConfigured() {
    return !!(config.zendesk.subdomain && config.zendesk.email && config.zendesk.apiToken);
  }
}

module.exports = ZendeskService;
