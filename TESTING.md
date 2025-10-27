# Testing Guide

## Quick Test (PowerShell on Windows)

### Method 1: Using Test Script (Recommended)

```powershell
# Make sure server is running in another terminal
npm start

# In a new terminal, run the test script
.\test-webhook.ps1
```

### Method 2: Using curl.exe

```powershell
# Health check
curl.exe http://localhost:3000/health

# Test webhook
curl.exe -X POST http://localhost:3000/webhook/zendesk `
  -H "Content-Type: application/json" `
  -d "@example-webhook-payload.json"
```

### Method 3: Using PowerShell Native Commands

```powershell
# Health check
Invoke-RestMethod -Uri http://localhost:3000/health

# Test webhook
$payload = Get-Content example-webhook-payload.json -Raw
Invoke-RestMethod -Uri http://localhost:3000/webhook/zendesk `
  -Method Post `
  -ContentType "application/json" `
  -Body $payload
```

## Expected Results

### Health Check Response
```json
{
  "status": "healthy",
  "service": "zendesk-ai-microservice",
  "version": "2.0.0",
  "environment": "development",
  "ai_provider": "Mock",
  "mock_mode": true,
  "timestamp": "2025-10-27T15:35:00.000Z"
}
```

### Webhook Response
```json
{
  "success": true,
  "ticket_id": 12345,
  "summary": "[MOCK AI SUMMARY]\n\n📊 Analysis:\n- Word count: 62\n- Sentences: 6\n...",
  "processed_at": "2025-10-27T15:35:00.000Z",
  "processing_time_ms": 523
}
```

## Testing with Postman/Insomnia

1. **Import Collection**
   - Method: POST
   - URL: `http://localhost:3000/webhook/zendesk`
   - Headers: `Content-Type: application/json`
   - Body: Copy content from `example-webhook-payload.json`

2. **Send Request**

3. **Verify Response**
   - Status: 200 OK
   - Response includes summary

## Common Issues

### Error: "Failed to connect"
**Solution**: Make sure the server is running (`npm start`)

### Error: "Invalid JSON"
**Solution**: Use `-Raw` flag with `Get-Content` or use `curl.exe` with `@` prefix

```powershell
# ❌ Wrong
Get-Content file.json  # Returns array of lines

# ✅ Correct
Get-Content file.json -Raw  # Returns single string
```

### Error: "Validation failed"
**Solution**: Check payload format matches expected structure:
```json
{
  "ticket": {
    "id": 12345,
    "title": "string (1-1000 chars)",
    "description": "string (1-10000 chars)"
  }
}
```

### Rate Limiting (429 Error)
**Solution**: Default is 10 requests per minute. Wait or increase limit in `.env`:
```env
RATE_LIMIT_MAX_REQUESTS=50
```

## Security Testing

### Test Webhook Signature (if enabled)
```powershell
# Will fail without valid signature
curl.exe -X POST http://localhost:3000/webhook/zendesk `
  -H "Content-Type: application/json" `
  -H "x-zendesk-webhook-signature: invalid" `
  -H "x-zendesk-webhook-signature-timestamp: 1234567890" `
  -d "@example-webhook-payload.json"

# Expected: 401 Unauthorized
```

### Test Rate Limiting
```powershell
# Send 15 requests quickly (limit is 10/minute)
1..15 | ForEach-Object {
  curl.exe -X POST http://localhost:3000/webhook/zendesk `
    -H "Content-Type: application/json" `
    -d "@example-webhook-payload.json"
  Write-Host "Request $_"
}

# Expected: First 10 succeed, rest return 429
```

### Test Input Validation
```powershell
# Missing required field
$badPayload = '{"ticket":{"id":123}}'  # Missing title and description
curl.exe -X POST http://localhost:3000/webhook/zendesk `
  -H "Content-Type: application/json" `
  -d $badPayload

# Expected: 400 Bad Request with validation errors
```

## Performance Testing

### Measure Response Time
```powershell
$payload = Get-Content example-webhook-payload.json -Raw
Measure-Command {
  Invoke-RestMethod -Uri http://localhost:3000/webhook/zendesk `
    -Method Post -ContentType "application/json" -Body $payload
}

# Mock mode: ~500-700ms
# OpenAI mode: ~1-3 seconds
```

### Load Testing (Simple)
```powershell
# Send 100 requests
1..100 | ForEach-Object {
  $payload = Get-Content example-webhook-payload.json -Raw
  $response = Invoke-RestMethod -Uri http://localhost:3000/webhook/zendesk `
    -Method Post -ContentType "application/json" -Body $payload
  Write-Host "Request $_ - Time: $($response.processing_time_ms)ms"
}
```

## Production Testing

### With Real APIs
```powershell
# 1. Update .env
USE_MOCK_AI=false
OPENAI_API_KEY=sk-your-real-key
ZENDESK_SUBDOMAIN=yourcompany
ZENDESK_EMAIL=your@email.com
ZENDESK_API_TOKEN=your-token

# 2. Restart server
npm start

# 3. Test with real ticket ID
$payload = @{
  ticket = @{
    id = 67890  # Real ticket ID from your Zendesk
    title = "Test from AI Microservice"
    description = "This is a test to verify the integration works correctly."
  }
} | ConvertTo-Json

curl.exe -X POST http://localhost:3000/webhook/zendesk `
  -H "Content-Type: application/json" `
  -d $payload

# 4. Check Zendesk ticket for AI summary note
```

## Automated Testing Setup

### Using Jest (Future Enhancement)
```bash
npm install --save-dev jest supertest
npm test
```

### Using Artillery (Load Testing)
```bash
npm install -g artillery
artillery quick --count 10 --num 50 http://localhost:3000/webhook/zendesk
```

## Troubleshooting

### View Logs
```powershell
# Real-time logs
npm start

# Production logs
Get-Content logs/combined.log -Tail 50
Get-Content logs/error.log -Tail 20
```

### Debug Mode
```powershell
# Set debug logging
$env:LOG_LEVEL="debug"
npm start

# View detailed logs including request/response data
```

### Check Health Status
```powershell
# Detailed health check
$health = Invoke-RestMethod http://localhost:3000/health
$health | Format-List

# Check specific values
Write-Host "AI Provider: $($health.ai_provider)"
Write-Host "Mock Mode: $($health.mock_mode)"
Write-Host "Environment: $($health.environment)"
```

## Next Steps

1. ✅ Test locally in mock mode
2. ✅ Test with example payload
3. ✅ Verify response format
4. ⬜ Test with real API keys
5. ⬜ Test webhook signature verification
6. ⬜ Load test with multiple requests
7. ⬜ Deploy to staging environment
8. ⬜ Integration test with real Zendesk webhooks

---

For more information:
- **Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Security**: See [SECURITY.md](SECURITY.md)
- **Deployment**: See [DEPLOYMENT.md](DEPLOYMENT.md)
