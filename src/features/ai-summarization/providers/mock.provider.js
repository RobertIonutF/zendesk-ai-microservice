const logger = require('../../../common/utils/logger');

/**
 * Mock AI Provider for testing without API keys
 */
class MockProvider {
  constructor() {
    this.name = 'Mock';
  }

  /**
   * Generate mock AI summary
   * @param {string} text - Text to summarize
   * @returns {Promise<string>} - Mock summarized text
   */
  async summarize(text) {
    logger.debug('Using mock AI provider');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const words = text.split(' ').length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
    const preview = text.substring(0, 100).replace(/\n/g, ' ');

    return `[MOCK AI SUMMARY]

📊 Analysis:
- Word count: ${words}
- Sentences: ${sentences}
- Content preview: "${preview}..."

📝 Summary: This ticket contains customer feedback that requires attention. The support team should review the details and respond promptly to address the customer's concerns.

✅ Recommended action: Review and respond to customer within 24 hours.

⚠️  Note: This is a mock summary generated for testing purposes.`;
  }
}

module.exports = MockProvider;
