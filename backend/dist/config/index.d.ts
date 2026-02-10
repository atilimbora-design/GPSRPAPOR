import { DatabaseConfig, ServerConfig, SecurityConfig } from '@/types';
export declare const serverConfig: ServerConfig;
export declare const databaseConfig: DatabaseConfig;
export declare const securityConfig: SecurityConfig;
export declare const uploadConfig: {
    maxFileSize: number;
    uploadPath: string;
    avatarPath: string;
    reportPath: string;
};
export declare const redisConfig: {
    url: string;
    password: string;
    db: number;
};
export declare const loggingConfig: {
    level: string;
    file: string;
    maxSize: string;
    maxFiles: number;
};
export declare const locationConfig: {
    updateInterval: number;
    batchSize: number;
    retentionDays: number;
};
export declare const messageConfig: {
    retentionDays: number;
    maxSize: number;
};
export declare const reportConfig: {
    generationTimeout: number;
    retentionDays: number;
};
export declare const notificationConfig: {
    fcm: {
        serverKey: string;
        senderId: string;
    };
};
export declare const monitoringConfig: {
    healthCheckInterval: number;
    performanceMonitoring: boolean;
};
export declare const developmentConfig: {
    debug: string;
    mockExternalServices: boolean;
};
export declare const paths: {
    root: string;
    src: string;
    uploads: string;
    logs: string;
    data: string;
};
export declare const isDevelopment: boolean;
export declare const isProduction: boolean;
export declare const isTest: boolean;
//# sourceMappingURL=index.d.ts.map