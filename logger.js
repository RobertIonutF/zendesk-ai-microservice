const winston = require('winston');

// Custom format to redact sensitive information
const redactSensitiveData = winston.format((info) => {
  const sensitivePatterns = [
    { pattern: /(api[_-]?key["\s:=]+)([^\s"',}]+)/gi, replacement: '$1***REDACTED***' },
    { pattern: /(token["\s:=]+)([^\s"',}]+)/gi, replacement: '$1***REDACTED***' },
    { pattern: /(password["\s:=]+)([^\s"',}]+)/gi, replacement: '$1***REDACTED***' },
    { pattern: /(authorization["\s:=]+bearer\s+)([^\s"',}]+)/gi, replacement: '$1***REDACTED***' },
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '***EMAIL***' }
  ];

  let message = typeof info.message === 'string' ? info.message : JSON.stringify(info.message);
  
  sensitivePatterns.forEach(({ pattern, replacement }) => {
    message = message.replace(pattern, replacement);
  });
  
  info.message = message;
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    redactSensitiveData(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'zendesk-ai-microservice' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    })
  ]
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

module.exports = logger;
