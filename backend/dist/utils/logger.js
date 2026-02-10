"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerStream = exports.logWebSocket = exports.logSync = exports.logAPI = exports.logDatabase = exports.logPerformance = exports.logSecurity = exports.logHttp = exports.logDebug = exports.logWarning = exports.logWarn = exports.logError = exports.logInfo = void 0;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("@/config");
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};
winston_1.default.addColors(colors);
const format = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}${info.metadata ? ` ${JSON.stringify(info.metadata)}` : ''}`));
const transports = [
    new winston_1.default.transports.Console({
        level: config_1.isDevelopment ? 'debug' : 'info',
    }),
    new winston_1.default.transports.File({
        filename: config_1.loggingConfig.file.replace('.log', '-error.log'),
        level: 'error',
        maxsize: parseInt(config_1.loggingConfig.maxSize.replace('m', '')) * 1024 * 1024,
        maxFiles: config_1.loggingConfig.maxFiles,
    }),
    new winston_1.default.transports.File({
        filename: config_1.loggingConfig.file,
        maxsize: parseInt(config_1.loggingConfig.maxSize.replace('m', '')) * 1024 * 1024,
        maxFiles: config_1.loggingConfig.maxFiles,
    }),
];
const logger = winston_1.default.createLogger({
    level: config_1.loggingConfig.level,
    levels,
    format,
    transports,
});
const logInfo = (message, metadata) => {
    logger.info(message, { metadata });
};
exports.logInfo = logInfo;
const logError = (error, metadata) => {
    logger.error(error.message, {
        metadata: {
            ...metadata,
            stack: error.stack,
            name: error.name,
        },
    });
};
exports.logError = logError;
const logWarn = (message, metadata) => {
    logger.warn(message, { metadata });
};
exports.logWarn = logWarn;
exports.logWarning = exports.logWarn;
const logDebug = (message, metadata) => {
    logger.debug(message, { metadata });
};
exports.logDebug = logDebug;
const logHttp = (message, metadata) => {
    logger.http(message, { metadata });
};
exports.logHttp = logHttp;
const logSecurity = (message, userId, metadata) => {
    logger.warn(`[SECURITY] ${message}`, {
        metadata: {
            ...metadata,
            userId,
            timestamp: new Date().toISOString(),
            type: 'security',
        },
    });
};
exports.logSecurity = logSecurity;
const logPerformance = (operation, duration, metadata) => {
    logger.info(`[PERFORMANCE] ${operation} completed in ${duration}ms`, {
        metadata: {
            ...metadata,
            duration,
            operation,
            type: 'performance',
        },
    });
};
exports.logPerformance = logPerformance;
const logDatabase = (operation, query, duration, metadata) => {
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
exports.logDatabase = logDatabase;
const logAPI = (method, path, statusCode, duration, userId, metadata) => {
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
exports.logAPI = logAPI;
const logSync = (operation, recordCount, duration, userId, metadata) => {
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
exports.logSync = logSync;
const logWebSocket = (event, socketId, userId, metadata) => {
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
exports.logWebSocket = logWebSocket;
exports.loggerStream = {
    write: (message) => {
        logger.http(message.trim());
    },
};
exports.default = logger;
//# sourceMappingURL=logger.js.map