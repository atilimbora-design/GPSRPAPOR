"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTest = exports.isProduction = exports.isDevelopment = exports.paths = exports.developmentConfig = exports.monitoringConfig = exports.notificationConfig = exports.reportConfig = exports.messageConfig = exports.locationConfig = exports.loggingConfig = exports.redisConfig = exports.uploadConfig = exports.securityConfig = exports.databaseConfig = exports.serverConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'JWT_SECRET',
    'ENCRYPTION_KEY'
];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
    }
}
exports.serverConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
};
exports.databaseConfig = {
    url: process.env.DATABASE_URL || 'sqlite:./data/database.sqlite',
    pool: {
        max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
        min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
        acquire: parseInt(process.env.DATABASE_POOL_ACQUIRE || '30000', 10),
        idle: parseInt(process.env.DATABASE_POOL_IDLE || '10000', 10),
    },
};
exports.securityConfig = {
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    encryption: {
        key: process.env.ENCRYPTION_KEY,
        algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    },
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
};
exports.uploadConfig = {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    avatarPath: process.env.AVATAR_PATH || './uploads/avatars',
    reportPath: process.env.REPORT_PATH || './uploads/reports',
};
exports.redisConfig = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
};
exports.loggingConfig = {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
};
exports.locationConfig = {
    updateInterval: parseInt(process.env.LOCATION_UPDATE_INTERVAL || '30000', 10),
    batchSize: parseInt(process.env.LOCATION_BATCH_SIZE || '100', 10),
    retentionDays: parseInt(process.env.LOCATION_RETENTION_DAYS || '90', 10),
};
exports.messageConfig = {
    retentionDays: parseInt(process.env.MESSAGE_RETENTION_DAYS || '90', 10),
    maxSize: parseInt(process.env.MESSAGE_MAX_SIZE || '1048576', 10),
};
exports.reportConfig = {
    generationTimeout: parseInt(process.env.REPORT_GENERATION_TIMEOUT || '600000', 10),
    retentionDays: parseInt(process.env.REPORT_RETENTION_DAYS || '30', 10),
};
exports.notificationConfig = {
    fcm: {
        serverKey: process.env.FCM_SERVER_KEY || '',
        senderId: process.env.FCM_SENDER_ID || '',
    },
};
exports.monitoringConfig = {
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
    performanceMonitoring: process.env.PERFORMANCE_MONITORING === 'true',
};
exports.developmentConfig = {
    debug: process.env.DEBUG || 'gps-rapor:*',
    mockExternalServices: process.env.MOCK_EXTERNAL_SERVICES === 'true',
};
exports.paths = {
    root: path_1.default.resolve(__dirname, '../..'),
    src: path_1.default.resolve(__dirname, '..'),
    uploads: path_1.default.resolve(__dirname, '../../uploads'),
    logs: path_1.default.resolve(__dirname, '../../logs'),
    data: path_1.default.resolve(__dirname, '../../data'),
};
const fs_1 = __importDefault(require("fs"));
const ensureDirectoryExists = (dirPath) => {
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
    }
};
ensureDirectoryExists(exports.paths.uploads);
ensureDirectoryExists(exports.paths.logs);
ensureDirectoryExists(exports.paths.data);
ensureDirectoryExists(exports.uploadConfig.avatarPath);
ensureDirectoryExists(exports.uploadConfig.reportPath);
exports.isDevelopment = exports.serverConfig.env === 'development';
exports.isProduction = exports.serverConfig.env === 'production';
exports.isTest = exports.serverConfig.env === 'test';
//# sourceMappingURL=index.js.map