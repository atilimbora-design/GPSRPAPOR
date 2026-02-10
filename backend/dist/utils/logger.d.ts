import winston from 'winston';
declare const logger: winston.Logger;
export declare const logInfo: (message: string, metadata?: any) => void;
export declare const logError: (error: Error, metadata?: any) => void;
export declare const logWarn: (message: string, metadata?: any) => void;
export declare const logWarning: (message: string, metadata?: any) => void;
export declare const logDebug: (message: string, metadata?: any) => void;
export declare const logHttp: (message: string, metadata?: any) => void;
export declare const logSecurity: (message: string, userId?: number, metadata?: any) => void;
export declare const logPerformance: (operation: string, duration: number, metadata?: any) => void;
export declare const logDatabase: (operation: string, query?: string, duration?: number, metadata?: any) => void;
export declare const logAPI: (method: string, path: string, statusCode: number, duration: number, userId?: number, metadata?: any) => void;
export declare const logSync: (operation: string, recordCount: number, duration: number, userId?: number, metadata?: any) => void;
export declare const logWebSocket: (event: string, socketId: string, userId?: number, metadata?: any) => void;
export declare const loggerStream: {
    write: (message: string) => void;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map