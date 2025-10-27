# Security Best Practices & Implementation

## Overview
This document outlines the security measures implemented in the Zendesk AI Microservice and best practices for deployment.

## 🔒 Security Features Implemented

### 1. HTTP Security Headers
**Implementation**: Helmet.js
- **Content Security Policy (CSP)**: Prevents XSS attacks
- **HSTS**: Enforces HTTPS connections
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-XSS-Protection**: Enables browser XSS filters

### 2. Webhook Signature Verification
**Location**: `middleware/security.js`

Validates incoming webhooks using HMAC-SHA256:
- Verifies signature from Zendesk
- Implements replay attack prevention (5-minute timestamp window)
- Uses timing-safe comparison to prevent timing attacks

```javascript
// Configure webhook secret
ZENDESK_WEBHOOK_SECRET=your_secret_key_here
```

### 3. Input Validation & Sanitization
**Implementation**: express-validator

Validates all webhook payload fields:
- Type checking (string, integer)
- Length limits (title: 1-1000 chars, description: 1-10000 chars)
- Required field validation
- Automatic sanitization

### 4. Rate Limiting
**Implementation**: express-rate-limit

Prevents DoS and brute-force attacks:
- Default: 10 requests per minute per IP
- Configurable via environment variables
- Returns 429 status code when exceeded

```env
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

### 5. Request Size Limits
Prevents memory exhaustion attacks:
- Default limit: 1MB
- Rejects oversized payloads automatically

```env
MAX_REQUEST_SIZE=1mb
```

### 6. Request Timeout
Prevents resource exhaustion:
- Default: 30 seconds per request
- Automatic termination of hanging requests

### 7. CORS Protection
**Implementation**: cors middleware

Controls cross-origin access:
- Configurable allowed origins
- Whitelist specific domains in production

```env
# Development (allow all)
CORS_ORIGIN=*

# Production (specific domains)
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

### 8. IP Whitelisting (Optional)
Restricts access to known IPs:

```env
ALLOWED_IPS=192.168.1.1,10.0.0.1
```

### 9. Secure Logging
**Location**: `logger.js`

Prevents sensitive data leakage:
- Automatic redaction of API keys, tokens, passwords
- Email addresses masked
- Structured JSON logging
- Separate error logs in production

### 10. Error Handling
**Implementation**: Custom error middleware

Prevents information disclosure:
- Generic error messages in production
- Detailed errors only in development
- No stack traces exposed to clients
- All errors logged server-side

### 11. Timeout Protection
API call timeouts prevent hanging requests:
- OpenAI API: 15 seconds
- Zendesk API: 10 seconds
- Overall request: 30 seconds

### 12. Graceful Shutdown
Handles termination signals properly:
- Closes connections cleanly
- Prevents data loss
- 10-second grace period before force shutdown

## 🛡️ Security Best Practices for Deployment

### Environment Variables
1. **Never commit `.env` to version control**
2. **Use strong, unique secrets** for webhook signatures
3. **Rotate credentials regularly** (every 90 days)
4. **Use environment-specific configs** (dev, staging, production)

### HTTPS/TLS
1. **Always use HTTPS in production**
2. **Use TLS 1.2 or higher**
3. **Obtain certificates from trusted CA** (Let's Encrypt, etc.)
4. **Enable HSTS** (already configured)

### Reverse Proxy
Deploy behind a reverse proxy (nginx, Apache, or cloud load balancer):

```nginx
# Example nginx configuration
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### API Keys Management
1. **Use environment variables** (never hardcode)
2. **Use secret management services** (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)
3. **Implement key rotation**
4. **Monitor for leaked credentials** (GitHub scanning, etc.)

### Network Security
1. **Use VPC/private networks** when possible
2. **Implement firewall rules** (allow only necessary ports)
3. **Use security groups** to restrict access
4. **Enable DDoS protection** (Cloudflare, AWS Shield)

### Monitoring & Alerting
1. **Monitor failed authentication attempts**
2. **Alert on rate limit breaches**
3. **Track API error rates**
4. **Monitor resource usage** (CPU, memory, network)

```javascript
// Example monitoring integration
logger.on('data', (log) => {
  if (log.level === 'error') {
    // Send to monitoring service
    sendToDatadog(log);
    // Or send alert
    sendToSlack(log);
  }
});
```

### Regular Updates
1. **Keep dependencies updated** (npm audit)
2. **Monitor security advisories**
3. **Apply security patches promptly**
4. **Review and update security policies quarterly**

## 🔍 Vulnerability Scanning

### Automated Scanning
```bash
# Check for known vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Check for outdated packages
npm outdated
```

### Manual Security Review
- [ ] Review authentication mechanisms
- [ ] Validate input sanitization
- [ ] Check for hardcoded secrets
- [ ] Verify error handling doesn't leak info
- [ ] Test rate limiting effectiveness
- [ ] Verify HTTPS is enforced

## 🚨 Incident Response

### If Credentials Are Compromised:
1. **Immediately rotate all keys/tokens**
2. **Review access logs** for suspicious activity
3. **Notify affected parties** if data was accessed
4. **Update security measures** to prevent recurrence

### If Service Is Under Attack:
1. **Enable stricter rate limits**
2. **Activate IP whitelisting**
3. **Review logs for attack patterns**
4. **Consider temporary service suspension**
5. **Report to relevant authorities** if necessary

## 📋 Security Checklist for Production

- [ ] HTTPS enabled with valid certificate
- [ ] Environment variables properly configured
- [ ] Webhook signature verification enabled
- [ ] Rate limiting configured appropriately
- [ ] CORS restricted to known origins
- [ ] IP whitelisting enabled (if applicable)
- [ ] Logging configured and monitored
- [ ] Error messages sanitized
- [ ] Dependencies up to date
- [ ] Firewall rules configured
- [ ] Backup and recovery plan in place
- [ ] Incident response plan documented
- [ ] Security monitoring active
- [ ] Regular security audits scheduled

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Zendesk API Security](https://developer.zendesk.com/documentation/webhooks/verifying/)

## 📞 Security Contact

For security issues, please contact: [your-security-email@example.com]

**Do not** create public GitHub issues for security vulnerabilities.
