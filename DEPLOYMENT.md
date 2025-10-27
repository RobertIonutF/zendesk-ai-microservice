# Deployment Guide

## Quick Start Commands

### Local Development
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your settings
# Set USE_MOCK_AI=true for testing

# Start in development mode
npm start
```

### Docker Deployment
```bash
# Build and run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop service
docker-compose down
```

### Manual Docker Commands
```bash
# Build image
docker build -t zendesk-ai-microservice:latest .

# Run container
docker run -d \
  --name zendesk-ai-service \
  -p 3000:3000 \
  --env-file .env \
  zendesk-ai-microservice:latest

# View logs
docker logs -f zendesk-ai-service

# Stop container
docker stop zendesk-ai-service
```

## Cloud Deployment

### AWS EC2 / VPS
```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone repository
git clone <your-repo-url>
cd zendesk-ai-microservice

# 3. Install dependencies
npm ci --only=production

# 4. Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# 5. Use PM2 for process management
npm install -g pm2
pm2 start index.js --name zendesk-ai-service
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

### AWS Elastic Beanstalk
```bash
# 1. Install EB CLI
pip install awsebcli

# 2. Initialize EB application
eb init -p node.js zendesk-ai-microservice

# 3. Create environment
eb create zendesk-ai-prod

# 4. Set environment variables
eb setenv USE_MOCK_AI=false OPENAI_API_KEY=xxx ZENDESK_SUBDOMAIN=xxx

# 5. Deploy
eb deploy
```

### AWS Lambda (Serverless)
```bash
# 1. Install Serverless Framework
npm install -g serverless

# 2. Create serverless.yml (see example below)

# 3. Deploy
serverless deploy --stage production
```

**serverless.yml example:**
```yaml
service: zendesk-ai-microservice

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    USE_MOCK_AI: false
    OPENAI_API_KEY: ${env:OPENAI_API_KEY}
    ZENDESK_SUBDOMAIN: ${env:ZENDESK_SUBDOMAIN}

functions:
  webhook:
    handler: lambda.handler
    events:
      - http:
          path: webhook/zendesk
          method: post
```

### Heroku
```bash
# 1. Login to Heroku
heroku login

# 2. Create app
heroku create zendesk-ai-microservice

# 3. Set environment variables
heroku config:set USE_MOCK_AI=false
heroku config:set OPENAI_API_KEY=xxx
heroku config:set ZENDESK_SUBDOMAIN=xxx
heroku config:set ZENDESK_EMAIL=xxx
heroku config:set ZENDESK_API_TOKEN=xxx

# 4. Deploy
git push heroku main

# 5. View logs
heroku logs --tail
```

### Azure App Service
```bash
# 1. Login to Azure
az login

# 2. Create resource group
az group create --name zendesk-ai-rg --location eastus

# 3. Create App Service plan
az appservice plan create \
  --name zendesk-ai-plan \
  --resource-group zendesk-ai-rg \
  --sku B1 \
  --is-linux

# 4. Create web app
az webapp create \
  --resource-group zendesk-ai-rg \
  --plan zendesk-ai-plan \
  --name zendesk-ai-microservice \
  --runtime "NODE|18-lts"

# 5. Configure environment variables
az webapp config appsettings set \
  --resource-group zendesk-ai-rg \
  --name zendesk-ai-microservice \
  --settings USE_MOCK_AI=false OPENAI_API_KEY=xxx

# 6. Deploy code
az webapp deployment source config-zip \
  --resource-group zendesk-ai-rg \
  --name zendesk-ai-microservice \
  --src deploy.zip
```

## Reverse Proxy Configuration

### Nginx
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Apache
```apache
<VirtualHost *:80>
    ServerName api.yourdomain.com
    Redirect permanent / https://api.yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName api.yourdomain.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/api.yourdomain.com/cert.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/api.yourdomain.com/privkey.pem
    SSLCertificateChainFile /etc/letsencrypt/live/api.yourdomain.com/chain.pem

    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
</VirtualHost>
```

## Monitoring & Maintenance

### Health Checks
```bash
# Simple health check
curl http://localhost:3000/health

# With jq for formatted output
curl -s http://localhost:3000/health | jq
```

### Log Management
```bash
# View logs (PM2)
pm2 logs zendesk-ai-service

# View logs (Docker)
docker logs -f zendesk-ai-service

# View logs (systemd)
journalctl -u zendesk-ai-service -f

# Rotate logs manually
pm2 flush zendesk-ai-service
```

### Performance Monitoring
```bash
# Monitor with PM2
pm2 monit

# Check resource usage
pm2 status
```

### Security Audits
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

## Troubleshooting

### Service Won't Start
```bash
# Check logs for errors
npm start  # Run directly to see errors

# Verify environment variables
node -e "require('dotenv').config(); console.log(process.env)"

# Test configuration validation
node -e "const {validateConfig} = require('./config'); validateConfig()"
```

### High Memory Usage
```bash
# Check memory usage
pm2 monit

# Restart service
pm2 restart zendesk-ai-service

# Adjust Node.js memory limit
NODE_OPTIONS="--max-old-space-size=512" pm2 start index.js
```

### Rate Limiting Issues
```bash
# Increase rate limits in .env
RATE_LIMIT_MAX_REQUESTS=50

# Or disable for specific IPs
ALLOWED_IPS=trusted.ip.address
```

## Backup & Recovery

### Backup Configuration
```bash
# Backup .env file (encrypted)
gpg --symmetric --cipher-algo AES256 .env

# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

### Disaster Recovery
```bash
# 1. Restore from backup
gpg --decrypt .env.gpg > .env

# 2. Reinstall dependencies
npm ci --only=production

# 3. Restart service
pm2 restart zendesk-ai-service

# 4. Verify health
curl http://localhost:3000/health
```

## Scaling

### Horizontal Scaling (Multiple Instances)
```bash
# PM2 cluster mode
pm2 start index.js -i max --name zendesk-ai-service

# Or specify instance count
pm2 start index.js -i 4 --name zendesk-ai-service
```

### Load Balancer Configuration
```nginx
upstream zendesk_backend {
    least_conn;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://zendesk_backend;
        # ... other proxy settings
    }
}
```

## Support

For issues or questions:
- Check [SECURITY.md](SECURITY.md) for security-related topics
- Review [README.md](README.md) for general documentation
- Open an issue on GitHub (for non-security issues)
