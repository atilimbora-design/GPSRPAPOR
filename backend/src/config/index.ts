import dotenv from 'dotenv';
import path from 'path';
import { DatabaseConfig, ServerConfig, SecurityConfig } from '@/types';

// Load environment variables
dotenv.config();

// Validate required environment variables
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

// Server Configuration
export const serverConfig: ServerConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  env: process.env.NODE_ENV || 'development',
};

// Database Configuration
export const databaseConfig: DatabaseConfig = {
  url: process.env.DATABASE_URL || 'sqlite:./data/database.sqlite',
  pool: {
    max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    acquire: parseInt(process.env.DATABASE_POOL_ACQUIRE || '30000', 10),
    idle: parseInt(process.env.DATABASE_POOL_IDLE || '10000', 10),
  },
};

// Security Configuration
export const securityConfig: SecurityConfig = {
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY!,
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

// File Upload Configuration
export const uploadConfig = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  avatarPath: process.env.AVATAR_PATH || './uploads/avatars',
  reportPath: process.env.REPORT_PATH || './uploads/reports',
};

// Redis Configuration
export const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB || '0', 10),
};

// Logging Configuration
export const loggingConfig = {
  level: process.env.LOG_LEVEL || 'info',
  file: process.env.LOG_FILE || './logs/app.log',
  maxSize: process.env.LOG_MAX_SIZE || '10m',
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
};

// Location Tracking Configuration
export const locationConfig = {
  updateInterval: parseInt(process.env.LOCATION_UPDATE_INTERVAL || '30000', 10),
  batchSize: parseInt(process.env.LOCATION_BATCH_SIZE || '100', 10),
  retentionDays: parseInt(process.env.LOCATION_RETENTION_DAYS || '90', 10),
};

// Message Configuration
export const messageConfig = {
  retentionDays: parseInt(process.env.MESSAGE_RETENTION_DAYS || '90', 10),
  maxSize: parseInt(process.env.MESSAGE_MAX_SIZE || '1048576', 10), // 1MB
};

// Report Configuration
export const reportConfig = {
  generationTimeout: parseInt(process.env.REPORT_GENERATION_TIMEOUT || '600000', 10), // 10 minutes
  retentionDays: parseInt(process.env.REPORT_RETENTION_DAYS || '30', 10),
};

// Notification Configuration
export const notificationConfig = {
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY || '',
    senderId: process.env.FCM_SENDER_ID || '',
  },
};

// Monitoring Configuration
export const monitoringConfig = {
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
  performanceMonitoring: process.env.PERFORMANCE_MONITORING === 'true',
};

// Development Configuration
export const developmentConfig = {
  debug: process.env.DEBUG || 'gps-rapor:*',
  mockExternalServices: process.env.MOCK_EXTERNAL_SERVICES === 'true',
};

// Paths
export const paths = {
  root: path.resolve(__dirname, '../..'),
  src: path.resolve(__dirname, '..'),
  uploads: path.resolve(__dirname, '../../uploads'),
  logs: path.resolve(__dirname, '../../logs'),
  data: path.resolve(__dirname, '../../data'),
};

// Ensure directories exist
import fs from 'fs';

const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Create necessary directories
ensureDirectoryExists(paths.uploads);
ensureDirectoryExists(paths.logs);
ensureDirectoryExists(paths.data);
ensureDirectoryExists(uploadConfig.avatarPath);
ensureDirectoryExists(uploadConfig.reportPath);

export const isDevelopment = serverConfig.env === 'development';
export const isProduction = serverConfig.env === 'production';
export const isTest = serverConfig.env === 'test';