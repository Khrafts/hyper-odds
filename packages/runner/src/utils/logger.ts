import pino from 'pino';
import { config } from '../config/index.js';
import { randomUUID } from 'crypto';

// Sensitive data patterns to redact from logs
const SENSITIVE_PATTERNS = [
  /0x[a-fA-F0-9]{64}/, // Private keys
  /sk_[a-zA-Z0-9]+/,   // API secret keys
  /password/i,
  /secret/i,
  /token/i,
  /key/i
];

// Custom serializer to redact sensitive data
const redactSensitiveData = (obj: any): any => {
  if (typeof obj === 'string') {
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(obj)) {
        return '[REDACTED]';
      }
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }
  
  if (obj && typeof obj === 'object') {
    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Redact keys that might contain sensitive data
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('key') || lowerKey.includes('secret') || lowerKey.includes('password') || lowerKey.includes('token')) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitiveData(value);
      }
    }
    return redacted;
  }
  
  return obj;
};

// Create logger with environment-appropriate configuration
const createLogger = () => {
  const baseConfig: pino.LoggerOptions = {
    level: config.logLevel,
    serializers: {
      // Custom serializers for common objects
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },
    redact: {
      // Redact sensitive fields at root level
      paths: ['privateKey', 'password', 'secret', 'token', 'authorization', 'cookie'],
      remove: true
    },
    hooks: {
      logMethod(inputArgs, method) {
        // Apply sensitive data redaction to all log arguments
        const redactedArgs = inputArgs.map(redactSensitiveData);
        return method.apply(this, redactedArgs as any);
      }
    }
  };

  // Development environment: use pretty printing
  if (config.nodeEnv === 'development') {
    return pino({
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: false
        }
      }
    });
  }
  
  // Production environment: structured JSON logs
  return pino({
    ...baseConfig,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label })
    }
  });
};

export const logger = createLogger();

// Correlation ID management for request tracing
const correlationStore = new Map<string, string>();

export const correlation = {
  // Generate a new correlation ID
  generateId(): string {
    return randomUUID();
  },

  // Set correlation ID for current context
  setId(id: string): void {
    correlationStore.set('current', id);
  },

  // Get current correlation ID
  getId(): string | undefined {
    return correlationStore.get('current');
  },

  // Create child logger with correlation ID
  child(correlationId: string, additionalFields: Record<string, any> = {}): pino.Logger {
    return logger.child({
      correlationId,
      ...additionalFields
    });
  },

  // Middleware to generate correlation IDs for requests
  middleware() {
    return (req: any, res: any, next: any) => {
      const correlationId = req.headers['x-correlation-id'] || correlation.generateId();
      correlation.setId(correlationId);
      
      // Add correlation ID to request object
      req.correlationId = correlationId;
      
      // Set response header
      res.setHeader('X-Correlation-ID', correlationId);
      
      // Create request logger
      req.logger = correlation.child(correlationId, {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent']
      });
      
      next();
    };
  }
};

// Health check logger that samples high-frequency logs
export const healthLogger = logger.child({ component: 'health' });

// Performance logger for timing operations
export const perfLogger = {
  time(label: string, correlationId?: string): () => void {
    const start = process.hrtime.bigint();
    const loggerInstance = correlationId ? correlation.child(correlationId) : logger;
    
    return () => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to milliseconds
      
      loggerInstance.info({
        duration,
        operation: label
      }, `Operation '${label}' completed in ${duration.toFixed(2)}ms`);
    };
  }
};

// Error logger with stack trace preservation
export const errorLogger = {
  logError(error: Error, context: Record<string, any> = {}, correlationId?: string): void {
    const loggerInstance = correlationId ? correlation.child(correlationId) : logger;
    
    loggerInstance.error({
      err: error,
      stack: error.stack,
      ...context
    }, error.message);
  },

  logAndThrow(message: string, context: Record<string, any> = {}, correlationId?: string): never {
    const error = new Error(message);
    this.logError(error, context, correlationId);
    throw error;
  }
};

// Export default logger for backward compatibility
export default logger;