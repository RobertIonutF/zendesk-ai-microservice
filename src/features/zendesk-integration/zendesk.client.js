const axios = require('axios');
const logger = require('../../common/utils/logger');

/**
 * Zendesk API Client
 * Low-level HTTP client for Zendesk API calls
 */
class ZendeskClient {
  constructor(config) {
    this.config = config;
    this.baseURL = `https://${config.subdomain}.zendesk.com/api/v2`;
    this.auth = Buffer.from(`${config.email}/token:${config.apiToken}`).toString('base64');
  }

  /**
   * Add internal note to ticket
   * @param {number} ticketId - Ticket ID
   * @param {string} note - Note content
   * @returns {Promise<Object>} - API response
   */
  async addInternalNote(ticketId, note) {
    const url = `${this.baseURL}/tickets/${ticketId}.json`;

    logger.debug('Calling Zendesk API', { ticketId, url });

    try {
      const response = await axios.put(
        url,
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
            'Authorization': `Basic ${this.auth}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout,
          validateStatus: (status) => status < 500
        }
      );

      if (response.status !== 200) {
        logger.error('Zendesk API error', {
          status: response.status,
          ticketId,
          data: response.data
        });
        throw new Error(`Zendesk API error: ${response.status}`);
      }

      logger.debug('Zendesk API call successful', { ticketId });
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Zendesk API timeout - please try again');
      }

      logger.error('Zendesk API error', {
        ticketId,
        message: error.message,
        response: error.response?.data
      });

      throw new Error('Failed to update Zendesk ticket');
    }
  }
}

module.exports = ZendeskClient;
