# Architecture Documentation

## Overview

The Zendesk AI Microservice follows a **feature-based architecture** with clear separation of concerns, promoting maintainability, testability, and scalability.

## Architecture Principles

1. **Feature-Based Organization**: Code is organized by business features rather than technical layers
2. **Separation of Concerns**: Each module has a single, well-defined responsibility
3. **Dependency Injection**: Services are loosely coupled and easily testable
4. **Clean Architecture**: Business logic is independent of frameworks and external services

## Directory Structure

```
zendesk-ai-microservice/
├── server.js                             # Application entry point
├── src/
│   ├── app.js                           # Express app configuration
│   ├── config/                          # Configuration management
│   │   └── index.js                     # Centralized config & validation
│   ├── common/                          # Shared utilities & middleware
│   │   ├── middleware/
│   │   │   └── security.js              # Security middleware
│   │   └── utils/
│   │       └── logger.js                # Logging utility
│   └── features/                        # Business features
│       ├── webhooks/                    # Webhook handling feature
│       │   ├── webhook.controller.js    # Request handlers
│       │   └── webhook.routes.js        # Route definitions
│       ├── ai-summarization/            # AI summarization feature
│       │   ├── summarization.service.js # Business logic
│       │   └── providers/               # AI provider implementations
│       │       ├── openai.provider.js   # OpenAI integration
│       │       └── mock.provider.js     # Mock for testing
│       └── zendesk-integration/         # Zendesk API feature
│           ├── zendesk.service.js       # Business logic
│           └── zendesk.client.js        # HTTP client
├── .env.example                         # Environment template
├── package.json
└── README.md
```

## Layer Architecture

### 1. Entry Layer (`server.js`)
**Responsibility**: Application bootstrap and lifecycle management

- Loads configuration
- Validates environment
- Creates Express app
- Starts HTTP server
- Handles graceful shutdown
- Manages process signals

**Dependencies**: `src/app`, `src/config`, `src/common/utils/logger`

### 2. Application Layer (`src/app.js`)
**Responsibility**: Express application configuration

- Configures middleware (security, parsing, compression)
- Sets up routing
- Configures error handling
- Applies security headers
- Sets up CORS and rate limiting

**Dependencies**: Features, Common middleware

### 3. Feature Layer (`src/features/`)
**Responsibility**: Business feature implementation

Each feature is self-contained with:
- **Routes**: HTTP endpoint definitions
- **Controllers**: Request/response handling
- **Services**: Business logic
- **Clients/Providers**: External integrations

#### Feature: Webhooks
```
webhooks/
├── webhook.routes.js     # Route: POST /webhook/zendesk, GET /health
└── webhook.controller.js # Orchestrates summarization & Zendesk update
```

**Flow**:
1. Receives webhook request
2. Validates signature & payload
3. Calls AI Summarization service
4. Calls Zendesk Integration service
5. Returns response

#### Feature: AI Summarization
```
ai-summarization/
├── summarization.service.js  # Manages AI providers
└── providers/
    ├── openai.provider.js    # OpenAI API integration
    └── mock.provider.js      # Mock implementation
```

**Responsibilities**:
- Provider selection based on configuration
- Text formatting for AI processing
- Error handling and retries
- Performance tracking

**Provider Pattern**: Enables easy addition of new AI providers (Claude, Gemini, etc.)

#### Feature: Zendesk Integration
```
zendesk-integration/
├── zendesk.service.js  # Business logic layer
└── zendesk.client.js   # HTTP client layer
```

**Separation**:
- **Service**: Business logic (formatting notes, validation)
- **Client**: Low-level HTTP communication

### 4. Common Layer (`src/common/`)
**Responsibility**: Shared utilities and middleware

#### Middleware (`common/middleware/security.js`)
- `verifyWebhookSignature`: HMAC-SHA256 verification
- `validateWebhookPayload`: Input validation
- `requestTimeout`: Timeout handling
- `additionalSecurityHeaders`: Security headers
- `ipWhitelist`: IP-based access control
- `errorHandler`: Global error handling

#### Utils (`common/utils/logger.js`)
- Winston-based structured logging
- Automatic sensitive data redaction
- Environment-based configuration
- Log rotation in production

### 5. Configuration Layer (`src/config/`)
**Responsibility**: Configuration management

- Loads environment variables
- Validates required configuration
- Provides typed configuration object
- Fails fast on invalid config

## Data Flow

### Webhook Processing Flow

```
1. HTTP Request
   ↓
2. Middleware Stack
   ├─ Trust Proxy
   ├─ Helmet (Security Headers)
   ├─ CORS
   ├─ Compression
   ├─ Body Parser
   ├─ Rate Limiter
   └─ Request Timeout
   ↓
3. Route Handler (webhook.routes.js)
   ├─ IP Whitelist Check
   ├─ Signature Verification
   └─ Payload Validation
   ↓
4. Controller (webhook.controller.js)
   ↓
5. AI Summarization Service
   ├─ Select Provider (OpenAI/Mock)
   ├─ Format Ticket Content
   └─ Generate Summary
   ↓
6. Zendesk Integration Service
   ├─ Format Note
   ├─ Call Zendesk Client
   └─ Post Internal Note
   ↓
7. Response to Client
```

## Design Patterns

### 1. **Dependency Injection**
Services receive dependencies through constructors:
```javascript
class WebhookController {
  constructor() {
    this.summarizationService = new SummarizationService();
    this.zendeskService = new ZendeskService();
  }
}
```

### 2. **Strategy Pattern**
AI providers implement a common interface:
```javascript
class OpenAIProvider {
  async summarize(text) { /* implementation */ }
}

class MockProvider {
  async summarize(text) { /* implementation */ }
}
```

### 3. **Service Layer Pattern**
Business logic separated from HTTP concerns:
- **Controllers**: Handle HTTP requests/responses
- **Services**: Contain business logic
- **Clients**: Handle external API calls

### 4. **Factory Pattern**
Provider initialization based on configuration:
```javascript
_initializeProvider() {
  if (config.ai.useMock) {
    return new MockProvider();
  }
  return new OpenAIProvider(config.ai.openai);
}
```

## Security Architecture

### Defense in Depth

1. **Network Layer**: IP whitelisting, rate limiting
2. **Transport Layer**: HTTPS (via reverse proxy)
3. **Application Layer**: Helmet security headers, CORS
4. **Authentication Layer**: Webhook signature verification
5. **Input Layer**: Request validation & sanitization
6. **Logging Layer**: Sensitive data redaction

### Request Lifecycle Security

```
Request → IP Whitelist → Rate Limit → Signature Verify → Validate Input → Process
```

## Scalability Considerations

### Horizontal Scaling
- **Stateless Design**: No server-side sessions
- **Load Balancer Ready**: All instances identical
- **Database-Free**: No state to synchronize

### Vertical Scaling
- **Non-Blocking I/O**: Async/await throughout
- **Connection Pooling**: Efficient HTTP client usage
- **Compression**: Reduced bandwidth usage

### Performance Optimizations
- Request timeouts prevent hanging
- Response compression reduces bandwidth
- Structured logging minimizes I/O
- Graceful shutdown prevents request loss

## Testing Strategy

### Unit Tests (Recommended Structure)
```
tests/
├── unit/
│   ├── features/
│   │   ├── ai-summarization/
│   │   │   ├── summarization.service.test.js
│   │   │   └── providers/
│   │   │       ├── openai.provider.test.js
│   │   │       └── mock.provider.test.js
│   │   └── zendesk-integration/
│   │       ├── zendesk.service.test.js
│   │       └── zendesk.client.test.js
│   └── common/
│       └── middleware/
│           └── security.test.js
└── integration/
    └── webhook.integration.test.js
```

### Mock Requirements
- Mock axios for HTTP calls
- Mock logger to verify logging
- Mock providers for service tests

## Extension Points

### Adding New AI Provider

1. Create provider class in `src/features/ai-summarization/providers/`:
```javascript
class ClaudeProvider {
  constructor(config) {
    this.name = 'Claude';
    this.config = config;
  }
  
  async summarize(text) {
    // Implementation
  }
}
```

2. Update `summarization.service.js` to use new provider
3. Add configuration in `src/config/index.js`

### Adding New Feature

1. Create feature directory in `src/features/`
2. Add routes, controllers, services as needed
3. Register routes in `src/app.js`

### Adding New Middleware

1. Add to `src/common/middleware/`
2. Export from module
3. Apply in `src/app.js` or specific routes

## Configuration Management

### Environment Variables
All configuration via environment variables (12-factor app):
- **Development**: `.env` file
- **Production**: Environment variables from platform

### Configuration Validation
Startup validation ensures all required config is present before starting server.

### Configuration Structure
```javascript
config = {
  port, nodeEnv,
  security: { cors, rateLimit, webhook, ... },
  ai: { provider, openai: {...} },
  zendesk: { subdomain, email, token, ... }
}
```

## Error Handling Strategy

### Error Levels
1. **Validation Errors** (400): Bad input
2. **Authentication Errors** (401): Invalid signature
3. **Authorization Errors** (403): IP not allowed
4. **Timeout Errors** (408/504): Request/API timeout
5. **Server Errors** (500): Unexpected errors

### Error Flow
```
Error occurs → Logger captures → Sanitize for response → Return to client
```

### Production Error Handling
- Generic messages to clients
- Detailed errors logged server-side
- No stack traces exposed

## Monitoring & Observability

### Logging
- **Structured JSON**: Machine-parseable logs
- **Log Levels**: error, warn, info, debug
- **Contextual Data**: Request ID, IP, timing
- **Sensitive Data Redaction**: Auto-redaction

### Metrics (Recommended)
- Request count by endpoint
- Response time percentiles
- Error rate
- AI provider latency
- Zendesk API latency

### Health Checks
- `/health` endpoint for load balancers
- Reports service status, version, config

## Deployment Architecture

### Production Deployment
```
Internet → Load Balancer → [Instance 1, Instance 2, ...] → External APIs
                                                            ├─ OpenAI
                                                            └─ Zendesk
```

### Container Deployment
- Non-root user for security
- Health checks configured
- Resource limits defined
- Log aggregation ready

## Future Enhancements

### Potential Additions
1. **Event Sourcing**: Audit trail of all summaries
2. **Caching Layer**: Redis for repeated summaries
3. **Queue System**: Async processing with Bull/RabbitMQ
4. **Database**: Store summaries for analytics
5. **GraphQL API**: Alternative to REST
6. **Webhooks Out**: Notify external systems
7. **Multi-tenancy**: Support multiple Zendesk accounts

### Migration Path
Feature-based architecture makes these additions straightforward:
- New features added to `src/features/`
- Existing features remain unchanged
- Common utilities available to all features

---

## Summary

This architecture provides:
- ✅ **Maintainability**: Clear structure, easy to navigate
- ✅ **Testability**: Loosely coupled, mockable dependencies
- ✅ **Scalability**: Stateless, horizontally scalable
- ✅ **Security**: Defense in depth, multiple layers
- ✅ **Extensibility**: Easy to add features/providers
- ✅ **Observability**: Comprehensive logging & monitoring

The feature-based structure makes the codebase easier to understand, modify, and extend as requirements evolve.
