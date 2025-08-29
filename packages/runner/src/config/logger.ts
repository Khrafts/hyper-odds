import winston from 'winston';
import { config } from './config';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

const isDevelopment = config.NODE_ENV === 'development';

const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = `\n${  JSON.stringify(meta, null, 2)}`;
    }
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

const jsonFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: isDevelopment ? consoleFormat : jsonFormat,
  defaultMeta: { service: 'market-runner' },
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: jsonFormat,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: jsonFormat,
    }),
  ],
  exitOnError: false,
});

if (isDevelopment && config.ENABLE_DEBUG_LOGS) {
  logger.level = 'debug';
  logger.debug('Debug logging enabled');
}

export default logger;