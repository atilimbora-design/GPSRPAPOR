import winston from 'winston';
import { loggingConfig, isDevelopment } from '@/config';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${
      info.metadata ? ` ${JSON.stringify(info.metadata)}` : ''
    }`
  )
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    level: isDevelopment ? 'debug' : 'info',
  }),
  // File transport for errors
  new winston.transports.File({
    filename: loggingConfig.file.replace('.log', '-error.log'),
    level: 'error',
    maxsize: parseInt(loggingConfig.maxSize.replace('m', '')) * 1024 * 1024,
    maxFiles: loggingConfig.maxFiles,
  }),
  // File transport for all logs
  new winston.transports.File({
    filename: loggingConfig.file,
    maxsize: parseInt(loggingConfig.maxSize.replace('m', '')) * 1024 * 1024,
    maxFiles: loggingConfig.maxFiles,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: loggingConfig.level,
  levels,
  format,
  transports,
});

// Logging helper functions
export const logInfo = (message: string, metadata?: any): void => {
  logger.info(message, { metadata });
};

export const logError = (error: Error, metadata?: any): void => {
  logger.error(error.message, {
    metadata: {
      ...metadata,
      stack: error.stack,
      name: error.name,
    },
  });
};

export const logWarn = (message: string, metadata?: any): void => {
  logger.warn(message, { metadata });
};

export const logWarning = logWarn; // Alias for consistency

export const logDebug = (message: string, metadata?: any): void => {
  logger.debug(message, { metadata });
};

export const logHttp = (message: string, metadata?: any): void => {
  logger.http(message, { metadata });
};

// Security logging function
export const logSecurity = (
  message: string,
  userId?: number,
  metadata?: any
): void => {
  logger.warn(`[SECURITY] ${message}`, {
    metadata: {
      ...metadata,
      userId,
      timestamp: new Date().toISOString(),
      type: 'security',
    },
  });
};

// Performance logging function
export const logPerformance = (
  operation: string,
  duration: number,
  metadata?: any
): void => {
  logger.info(`[PERFORMANCE] ${operation} completed in ${duration}ms`, {
    metadata: {
      ...metadata,
      duration,
      operation,
      type: 'performance',
    },
  });
};

// Database logging function
export const logDatabase = (
  operation: string,
  query?: string,
  duration?: number,
  metadata?: any
): void => {
  logger.debug(`[DATABASE] ${operation}`, {
    metadata: {
      ...metadata,
      query,
      duration,
      operation,
      type: 'database',
    },
  });
};

// API logging function
export const logAPI = (
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  userId?: number,
  metadata?: any
): void => {
  const level = statusCode >= 400 ? 'warn' : 'info';
  logger.log(level, `[API] ${method} ${path} ${statusCode} - ${duration}ms`, {
    metadata: {
      ...metadata,
      method,
      path,
      statusCode,
      duration,
      userId,
      type: 'api',
    },
  });
};

// Sync logging function
export const logSync = (
  operation: string,
  recordCount: number,
  duration: number,
  userId?: number,
  metadata?: any
): void => {
  logger.info(`[SYNC] ${operation} - ${recordCount} records in ${duration}ms`, {
    metadata: {
      ...metadata,
      operation,
      recordCount,
      duration,
      userId,
      type: 'sync',
    },
  });
};

// WebSocket logging function
export const logWebSocket = (
  event: string,
  socketId: string,
  userId?: number,
  metadata?: any
): void => {
  logger.info(`[WEBSOCKET] ${event}`, {
    metadata: {
      ...metadata,
      event,
      socketId,
      userId,
      type: 'websocket',
    },
  });
};

// Create a stream object for Morgan HTTP logging
export const loggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Export the main logger instance
export default logger;