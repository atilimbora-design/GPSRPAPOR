"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const config_1 = require("@/config");
const models_1 = require("@/models");
const migrate_1 = require("@/database/migrate");
const seed_1 = require("@/database/seed");
const logger_1 = require("@/utils/logger");
const health_1 = __importDefault(require("@/routes/health"));
const auth_1 = __importDefault(require("@/routes/auth"));
const admin_1 = __importDefault(require("@/routes/admin"));
const security_1 = require("@/middleware/security");
class GPSRaporServer {
    constructor() {
        this.app = (0, express_1.default)();
        this.server = http_1.default.createServer(this.app);
        this.io = new socket_io_1.Server(this.server, {
            cors: {
                origin: config_1.securityConfig.cors.origin,
                methods: ['GET', 'POST'],
                credentials: true,
            },
            transports: ['websocket', 'polling'],
        });
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketIO();
        this.setupErrorHandling();
    }
    setupMiddleware() {
        this.app.use(security_1.helmetConfig);
        this.app.use(security_1.securityHeaders);
        this.app.use(security_1.securityLogger);
        this.app.use((0, cors_1.default)({
            origin: config_1.securityConfig.cors.origin,
            credentials: true,
        }));
        this.app.use(security_1.compressionConfig);
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
        this.app.use(security_1.sanitizeRequest);
        this.app.use(security_1.rateLimiter);
        if (config_1.isDevelopment) {
            const morgan = require('morgan');
            this.app.use(morgan('combined', { stream: logger_1.loggerStream }));
        }
        this.app.use('/uploads', express_1.default.static('uploads'));
    }
    setupRoutes() {
        this.app.use('/', health_1.default);
        this.app.use('/api/auth', auth_1.default);
        this.app.use('/api/admin', admin_1.default);
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Endpoint not found',
                path: req.originalUrl,
                method: req.method,
            });
        });
    }
    setupSocketIO() {
        this.io.on('connection', (socket) => {
            (0, logger_1.logInfo)('Client connected', { socketId: socket.id });
            socket.on('authenticate', (token) => {
                (0, logger_1.logInfo)('Client authentication attempt', { socketId: socket.id });
            });
            socket.on('updateLocation', (data) => {
                (0, logger_1.logInfo)('Location update received', {
                    socketId: socket.id,
                    lat: data.lat,
                    lng: data.lng,
                });
            });
            socket.on('sendMessage', (data) => {
                (0, logger_1.logInfo)('Message received', {
                    socketId: socket.id,
                    messageType: data.type,
                });
            });
            socket.on('disconnect', (reason) => {
                (0, logger_1.logInfo)('Client disconnected', {
                    socketId: socket.id,
                    reason,
                });
            });
        });
    }
    setupErrorHandling() {
        process.on('uncaughtException', (error) => {
            (0, logger_1.logError)(error, { type: 'uncaughtException' });
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            (0, logger_1.logError)(new Error(`Unhandled Rejection: ${reason}`), {
                type: 'unhandledRejection',
                promise: promise.toString(),
            });
        });
        process.on('SIGTERM', () => {
            (0, logger_1.logInfo)('SIGTERM received, shutting down gracefully');
            this.shutdown();
        });
        process.on('SIGINT', () => {
            (0, logger_1.logInfo)('SIGINT received, shutting down gracefully');
            this.shutdown();
        });
        this.app.use((error, req, res, next) => {
            (0, logger_1.logError)(error, {
                url: req.url,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
            res.status(500).json({
                error: config_1.isDevelopment ? error.message : 'Internal server error',
                ...(config_1.isDevelopment && { stack: error.stack }),
            });
        });
    }
    async initializeDatabase() {
        try {
            (0, logger_1.logInfo)('Initializing database...');
            await models_1.sequelize.authenticate();
            (0, logger_1.logInfo)('Database connection established');
            await (0, migrate_1.migrate)();
            const { User } = await Promise.resolve().then(() => __importStar(require('@/models')));
            const userCount = await User.count();
            if (userCount === 0) {
                (0, logger_1.logInfo)('Database is empty, running seed...');
                await (0, seed_1.seed)();
            }
            (0, logger_1.logInfo)('Database initialization completed');
        }
        catch (error) {
            (0, logger_1.logError)(error, { operation: 'database_initialization' });
            throw error;
        }
    }
    async start() {
        try {
            await this.initializeDatabase();
            this.server.listen(config_1.serverConfig.port, config_1.serverConfig.host, () => {
                (0, logger_1.logInfo)(`GPS RAPOR Server started`, {
                    port: config_1.serverConfig.port,
                    host: config_1.serverConfig.host,
                    environment: process.env.NODE_ENV,
                    nodeVersion: process.version,
                });
            });
        }
        catch (error) {
            (0, logger_1.logError)(error, { operation: 'server_start' });
            process.exit(1);
        }
    }
    async shutdown() {
        try {
            (0, logger_1.logInfo)('Starting graceful shutdown...');
            this.io.close();
            this.server.close(() => {
                (0, logger_1.logInfo)('HTTP server closed');
            });
            await models_1.sequelize.close();
            (0, logger_1.logInfo)('Database connection closed');
            (0, logger_1.logInfo)('Graceful shutdown completed');
            process.exit(0);
        }
        catch (error) {
            (0, logger_1.logError)(error, { operation: 'graceful_shutdown' });
            process.exit(1);
        }
    }
}
if (require.main === module) {
    const server = new GPSRaporServer();
    server.start();
}
exports.default = GPSRaporServer;
//# sourceMappingURL=server.js.map