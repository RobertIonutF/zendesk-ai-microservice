# Quick Start Guide

Get the Zendesk AI Microservice running in 5 minutes!

## ⚡ Fastest Setup (Mock Mode)

```bash
# 1. Navigate to project directory
cd zendesk-ai-microservice

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env

# 4. Start the service
npm start
```

**That's it!** The service is now running on http://localhost:3000 in mock mode (no API keys needed).

## 🧪 Test It

```powershell
# Health check
curl.exe http://localhost:3000/health

# Send a test webhook (Option 1: Using curl)
curl.exe -X POST http://localhost:3000/webhook/zendesk `
  -H "Content-Type: application/json" `
  -d "@example-webhook-payload.json"

# Or use the PowerShell test script (Option 2: Recommended)
.\test-webhook.ps1
```

You should see a response with an AI-generated summary!

## 🚀 Production Setup (5 More Minutes)

### Step 1: Get Your API Keys

1. **OpenAI API Key**
   - Go to https://platform.openai.com/api-keys
   - Create new secret key
   - Copy the key (starts with `sk-`)

2. **Zendesk Credentials**
   - Go to your Zendesk Admin → Channels → API
   - Enable Token Access
   - Click "Add API token"
   - Copy: subdomain, email, and token

### Step 2: Update Configuration

Edit your `.env` file:

```env
# Switch to production mode
USE_MOCK_AI=false

# Add your OpenAI key
OPENAI_API_KEY=sk-your-actual-key-here

# Add your Zendesk credentials
ZENDESK_SUBDOMAIN=yourcompany
ZENDESK_EMAIL=your-email@company.com
ZENDESK_API_TOKEN=your-token-here
```

### Step 3: Restart

```bash
# Stop current service (Ctrl+C)
# Start with production config
npm start
```

## 🐳 Docker Setup (Alternative)

If you prefer Docker:

```bash
# 1. Create .env file with your settings
cp .env.example .env
# Edit .env with your API keys

# 2. Start with docker-compose
docker-compose up -d

# 3. View logs
docker-compose logs -f

# 4. Test
curl http://localhost:3000/health
```

## 🔐 Enable Security (Recommended for Production)

Add to your `.env`:

```env
# Webhook signature verification
ZENDESK_WEBHOOK_SECRET=your-secret-key-here

# Restrict CORS (replace with your domain)
CORS_ORIGIN=https://yourdomain.com

# Optional: IP whitelist
ALLOWED_IPS=192.168.1.100,10.0.0.50

# Set production mode
NODE_ENV=production
```

## 📊 Monitoring

The service logs structured JSON to console and files:

```bash
# View logs in real-time
tail -f logs/combined.log

# View only errors
tail -f logs/error.log
```

## 🔧 Common Issues

### "Configuration validation failed"
- Check your `.env` file exists
- Verify all required fields are set when `USE_MOCK_AI=false`

### "Port 3000 already in use"
- Change port in `.env`: `PORT=3001`

### "OpenAI API error"
- Verify your API key is correct
- Check you have credits: https://platform.openai.com/usage
- Ensure key starts with `sk-`

### "Failed to post note to Zendesk"
- Verify subdomain (without `.zendesk.com`)
- Check email and token are correct
- Ensure ticket ID exists

## 📚 Next Steps

- **Security**: Read [SECURITY.md](SECURITY.md) for production hardening
- **Deployment**: Check [DEPLOYMENT.md](DEPLOYMENT.md) for cloud deployment
- **Full Docs**: See [README.md](README.md) for complete documentation

## 💡 Tips

1. **Test First**: Always test in mock mode before using real APIs
2. **Check Logs**: Most issues show clear error messages in logs
3. **Rate Limits**: Start with low traffic, then increase `RATE_LIMIT_MAX_REQUESTS`
4. **Monitoring**: Set up log aggregation (Datadog, Splunk) for production

## ✅ Verification Checklist

Before going to production:

- [ ] Service starts without errors
- [ ] Health endpoint returns 200
- [ ] Test webhook returns valid summary
- [ ] Logs show no errors
- [ ] Environment variables are secure
- [ ] Rate limiting is configured
- [ ] CORS is restricted (not `*`)
- [ ] Webhook signature verification enabled
- [ ] HTTPS is configured (via reverse proxy)

## 🆘 Need Help?

- Check [README.md](README.md) for detailed documentation
- Review [SECURITY.md](SECURITY.md) for security questions
- Read [DEPLOYMENT.md](DEPLOYMENT.md) for deployment issues
- Open a GitHub issue for bugs

---

**You're all set!** 🎉

The microservice is now ready to automatically summarize your Zendesk tickets using AI.
