# Zendesk AI Microservice v2.0

🔒 **Production-Ready** | 🛡️ **Enterprise Security** | ⚡ **Optimized Performance**

An AI-powered microservice that automatically summarizes Zendesk tickets and posts the summary as an internal note. Built with security-first principles and optimized for production deployment.

## 🎯 Overview

This microservice receives Zendesk ticket webhooks, processes them through an AI model (OpenAI GPT), generates a concise summary, and posts it back to the ticket as an internal note.

## 🏗️ Architecture & Flow

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Zendesk   │  POST   │   Microservice   │  POST   │   OpenAI    │
│   Webhook   │────────>│   (Express.js)   │────────>│     API     │
└─────────────┘         └──────────────────┘         └─────────────┘
                                 │                            │
                                 │<───────────────────────────┘
                                 │        AI Summary
                                 │
                                 │ POST (Internal Note)
                                 ▼
                        ┌─────────────────┐
                        │  Zendesk Ticket │
                        │  (Updated)      │
                        └─────────────────┘
```

### Flow Steps:

1. **Webhook Reception**: Zendesk sends a POST request with ticket data (ID, title, description)
2. **AI Processing**: The service sends the ticket content to OpenAI for summarization
3. **Summary Generation**: OpenAI returns a concise, actionable summary
4. **Zendesk Update**: The service posts the summary as an internal note to the original ticket

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Zendesk account with API access (optional for mock mode)
- OpenAI API key (optional for mock mode)

### Installation

```bash
# Clone or navigate to the project directory
cd zendesk-ai-microservice

# Install dependencies
npm install
```

### Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your credentials:
```env
# Server Configuration
PORT=3000

# AI Configuration
USE_MOCK_AI=true
OPENAI_API_KEY=your_openai_api_key_here

# Zendesk Configuration
ZENDESK_SUBDOMAIN=your_subdomain
ZENDESK_EMAIL=your_email@example.com
ZENDESK_API_TOKEN=your_api_token_here
```

### Running the Service

#### Mock Mode (No API Keys Required)
```bash
npm start
```

The service will start on `http://localhost:3000` using mock AI responses.

#### Production Mode (With Real APIs)
```bash
# Update .env file:
# USE_MOCK_AI=false
# Add your OpenAI API key and Zendesk credentials

npm start
```

## 📡 API Endpoints

### Health Check
```bash
GET http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "zendesk-ai-microservice",
  "mock_mode": true,
  "timestamp": "2025-10-27T15:08:24.000Z"
}
```

### Webhook Endpoint
```bash
POST http://localhost:3000/webhook/zendesk
```

**Request Body:**
```json
{
  "ticket": {
    "id": 12345,
    "title": "Customer having login issues",
    "description": "User reports being unable to log in after password reset. Error message: 'Invalid credentials'. Tried multiple browsers."
  }
}
```

**Response:**
```json
{
  "success": true,
  "ticket_id": 12345,
  "summary": "Customer experiencing login issues after password reset...",
  "processed_at": "2025-10-27T15:08:24.000Z"
}
```

## 🧪 Testing

### Using curl (PowerShell on Windows)

```powershell
# Health check
curl.exe http://localhost:3000/health

# Send test webhook (using file)
curl.exe -X POST http://localhost:3000/webhook/zendesk `
  -H "Content-Type: application/json" `
  -d "@example-webhook-payload.json"

# Or use PowerShell native commands
$payload = Get-Content example-webhook-payload.json -Raw
Invoke-RestMethod -Uri http://localhost:3000/webhook/zendesk `
  -Method Post -ContentType "application/json" -Body $payload

# Or use the test script
.\test-webhook.ps1
```

### Using Postman or Insomnia

1. Import `example-webhook-payload.json`
2. Send POST request to `http://localhost:3000/webhook/zendesk`
3. View the response with the AI-generated summary

## 🔐 Security Configuration

### Webhook Signature Verification (Recommended)
```env
ZENDESK_WEBHOOK_SECRET=your_secret_key_here
```

### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=60000        # 1 minute window
RATE_LIMIT_MAX_REQUESTS=10        # 10 requests per window
```

### CORS Configuration
```env
# Development - allow all origins
CORS_ORIGIN=*

# Production - restrict to specific domains
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

### IP Whitelisting (Optional)
```env
ALLOWED_IPS=192.168.1.1,10.0.0.1
```

### Timeout Configuration
```env
REQUEST_TIMEOUT_MS=30000          # Overall request timeout
OPENAI_TIMEOUT_MS=15000           # OpenAI API timeout
ZENDESK_TIMEOUT_MS=10000          # Zendesk API timeout
```

**See [SECURITY.md](SECURITY.md) for complete security guidelines and best practices.**

## 🛠️ Customization

### Changing AI Provider

The service currently uses OpenAI, but you can easily swap to Claude or Gemini:

```javascript
// Replace the openAISummarize function in index.js
async function claudeSummarize(text) {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 300,
      messages: [{ role: 'user', content: text }]
    },
    {
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    }
  );
  return response.data.content[0].text;
}
```

### Modifying Summary Prompt

Edit the system message in `openAISummarize()` function:

```javascript
{
  role: 'system',
  content: 'Your custom prompt here...'
}
```

## 🔒 Security Features

This microservice implements **enterprise-grade security** measures:

### 1. **HTTP Security Headers** (Helmet.js)
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options, X-Content-Type-Options
- XSS Protection

### 2. **Webhook Signature Verification**
- HMAC-SHA256 signature validation
- Replay attack prevention (timestamp validation)
- Timing-safe comparison

### 3. **Input Validation & Sanitization**
- Type checking and length limits
- Required field validation
- SQL injection prevention
- XSS attack prevention

### 4. **Rate Limiting**
- Configurable per-IP rate limits
- DDoS protection
- Brute-force attack prevention

### 5. **Additional Security Measures**
- Request size limits (prevents memory exhaustion)
- Request timeouts (prevents resource exhaustion)
- CORS protection with configurable origins
- Optional IP whitelisting
- Secure logging with sensitive data redaction
- Graceful error handling without information leakage

**See [SECURITY.md](SECURITY.md) for complete security documentation.**

## ⚡ Performance Optimizations

- **Response Compression**: gzip compression for reduced bandwidth
- **Connection Pooling**: Efficient HTTP client configuration
- **Request Timeouts**: Configurable timeouts for all external APIs
- **Graceful Shutdown**: Clean connection closure on termination
- **Structured Logging**: High-performance Winston logger with log rotation
- **Error Recovery**: Automatic retry logic with exponential backoff

## 📦 Project Structure (Feature-Based Architecture)

```
zendesk-ai-microservice/
├── server.js                             # Application entry point
├── src/
│   ├── app.js                            # Express app configuration
│   ├── config/index.js                   # Configuration management
│   ├── common/                           # Shared utilities
│   │   ├── middleware/security.js        # Security middleware
│   │   └── utils/logger.js               # Logging utility
│   └── features/                         # Business features
│       ├── webhooks/                     # Webhook handling
│       │   ├── webhook.controller.js     # Request handlers
│       │   └── webhook.routes.js         # Routes
│       ├── ai-summarization/             # AI summarization
│       │   ├── summarization.service.js  # Business logic
│       │   └── providers/                # AI providers
│       │       ├── openai.provider.js    # OpenAI
│       │       └── mock.provider.js      # Mock
│       └── zendesk-integration/          # Zendesk API
│           ├── zendesk.service.js        # Business logic
│           └── zendesk.client.js         # HTTP client
├── .env.example                          # Configuration template
├── package.json                          # Dependencies
├── Dockerfile                            # Container deployment
├── docker-compose.yml                    # Docker orchestration
├── ARCHITECTURE.md                       # 🔴 Architecture documentation
├── SECURITY.md                           # Security documentation
├── DEPLOYMENT.md                         # Deployment guide
├── LEGAL.md                              # ⚖️ Legal & usage restrictions
└── QUICKSTART.md                         # Quick start guide
```

**🏛️ Feature-Based Architecture**: Code is organized by business features rather than technical layers. See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed documentation.

## 🐛 Troubleshooting

### "Failed to generate AI summary"
- Check your OpenAI API key is valid
- Ensure you have credits in your OpenAI account
- Verify network connectivity

### "Failed to post note to Zendesk"
- Verify Zendesk credentials are correct
- Check the ticket ID exists
- Ensure API token has proper permissions

### Webhook not receiving data
- Verify the service is running on the correct port
- Check firewall settings
- Ensure JSON payload is properly formatted

## 📝 License

ISC

⚠️ **IMPORTANT**: See [LEGAL.md](LEGAL.md) for usage restrictions and licensing terms. This project is restricted to interview purposes only.

## 👨‍💻 Author

Robert - Zendesk Developer Interview Task

## 🚀 Deployment

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

### Environment-Specific Configuration
- **Development**: Mock AI, verbose logging, detailed errors
- **Staging**: Real APIs, standard logging, sanitized errors
- **Production**: All security enabled, minimal logging, generic errors

### Health Monitoring
The `/health` endpoint returns:
```json
{
  "status": "healthy",
  "service": "zendesk-ai-microservice",
  "version": "2.0.0",
  "environment": "production",
  "mock_mode": false,
  "timestamp": "2025-10-27T15:12:00.000Z"
}
```

## 📊 Monitoring & Logging

### Structured Logging
All logs are structured JSON with automatic sensitive data redaction:
- API keys, tokens, passwords automatically masked
- Email addresses redacted
- Separate error logs in production
- Log rotation (5MB per file, 5 files max)

### Log Levels
```env
LOG_LEVEL=info    # error, warn, info, debug
```

### Performance Metrics
Each webhook response includes processing time:
```json
{
  "success": true,
  "processing_time_ms": 1250
}
```

## 🧪 Testing Security

### Vulnerability Scanning
```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Check for outdated packages
npm outdated
```

### Rate Limit Testing
```bash
# Test rate limiting (should return 429 after 10 requests)
for i in {1..15}; do curl -X POST http://localhost:3000/webhook/zendesk; done
```

## 🎓 Technical Highlights

### Architecture
- ✅ **Modular Design**: Separated concerns (config, logging, security)
- ✅ **Middleware Pattern**: Composable security and validation layers
- ✅ **Error Boundaries**: Comprehensive error handling at all levels
- ✅ **Graceful Degradation**: Fallback to mock mode when APIs unavailable

### Security (OWASP Top 10 Compliance)
- ✅ **Injection Prevention**: Input validation and sanitization
- ✅ **Authentication**: Webhook signature verification
- ✅ **Sensitive Data Exposure**: Automatic redaction in logs
- ✅ **Security Misconfiguration**: Helmet.js security headers
- ✅ **Rate Limiting**: DDoS and brute-force protection
- ✅ **Logging & Monitoring**: Comprehensive audit trail

### API Integration
- ✅ **Zendesk REST API**: Ticket updates with authentication
- ✅ **OpenAI GPT API**: AI summarization with streaming support
- ✅ **Webhook Verification**: HMAC-SHA256 signature validation
- ✅ **Timeout Handling**: Configurable timeouts for all external calls

### Code Quality
- ✅ **JSDoc Comments**: Comprehensive function documentation
- ✅ **Configuration Validation**: Fail-fast on startup
- ✅ **Structured Logging**: Winston with custom formatters
- ✅ **Environment-Based Config**: Development/production modes

The service is **production-ready** and can be deployed to:
- ☁️ Cloud platforms (AWS, Azure, GCP)
- 🐳 Docker/Kubernetes
- 🚀 Serverless (AWS Lambda, Azure Functions)
- 🌐 Traditional VPS/dedicated servers
