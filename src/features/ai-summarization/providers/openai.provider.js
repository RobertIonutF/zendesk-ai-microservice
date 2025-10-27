const axios = require('axios');
const logger = require('../../../common/utils/logger');

/**
 * OpenAI Provider for AI Summarization
 */
class OpenAIProvider {
  constructor(config) {
    this.name = 'OpenAI';
    this.config = config;
  }

  /**
   * Summarize text using OpenAI API
   * @param {string} text - Text to summarize
   * @returns {Promise<string>} - Summarized text
   */
  async summarize(text) {
    logger.debug('Calling OpenAI API');

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.config.model,
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
          max_tokens: this.config.maxTokens,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout,
          validateStatus: (status) => status < 500
        }
      );

      if (response.status !== 200) {
        logger.error('OpenAI API error', {
          status: response.status,
          data: response.data
        });
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const summary = response.data.choices[0].message.content;
      logger.debug('OpenAI API call successful');
      
      return summary;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('OpenAI API timeout - please try again');
      }

      logger.error('OpenAI API error', {
        message: error.message,
        response: error.response?.data
      });
      
      throw new Error('Failed to generate AI summary');
    }
  }
}

module.exports = OpenAIProvider;
