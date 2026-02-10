"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("@/models");
const logger_1 = require("@/utils/logger");
const router = (0, express_1.Router)();
router.get('/health', async (req, res) => {
    const startTime = Date.now();
    try {
        const services = [];
        let overallStatus = 'healthy';
        try {
            const dbStart = Date.now();
            await models_1.sequelize.authenticate();
            services.push({
                name: 'database',
                status: 'healthy',
                responseTime: Date.now() - dbStart,
            });
        }
        catch (error) {
            services.push({
                name: 'database',
                status: 'unhealthy',
                error: error.message,
            });
            overallStatus = 'unhealthy';
        }
        try {
            const redisStart = Date.now();
            services.push({
                name: 'redis',
                status: 'healthy',
                responseTime: Date.now() - redisStart,
            });
        }
        catch (error) {
            services.push({
                name: 'redis',
                status: 'unhealthy',
                error: error.message,
            });
        }
        const memoryUsage = process.memoryUsage();
        const totalMemory = memoryUsage.heapTotal;
        const usedMemory = memoryUsage.heapUsed;
        const memoryPercentage = (usedMemory / totalMemory) * 100;
        const healthCheck = {
            status: overallStatus,
            timestamp: new Date(),
            services,
            uptime: process.uptime(),
            memory: {
                used: usedMemory,
                total: totalMemory,
                percentage: Math.round(memoryPercentage * 100) / 100,
            },
        };
        const statusCode = overallStatus === 'healthy' ? 200 : 503;
        res.status(statusCode).json(healthCheck);
        if (overallStatus === 'unhealthy') {
            (0, logger_1.logError)(new Error('Health check failed'), {
                services: services.filter(s => s.status === 'unhealthy'),
                responseTime: Date.now() - startTime,
            });
        }
    }
    catch (error) {
        (0, logger_1.logError)(error, { operation: 'health_check' });
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date(),
            error: 'Health check failed',
            uptime: process.uptime(),
        });
    }
});
router.get('/ping', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        uptime: process.uptime(),
    });
});
router.get('/ready', async (req, res) => {
    try {
        await models_1.sequelize.authenticate();
        res.json({
            status: 'ready',
            timestamp: new Date(),
        });
    }
    catch (error) {
        (0, logger_1.logError)(error, { operation: 'readiness_check' });
        res.status(503).json({
            status: 'not_ready',
            timestamp: new Date(),
            error: 'Database not ready',
        });
    }
});
router.get('/live', (req, res) => {
    res.json({
        status: 'alive',
        timestamp: new Date(),
        uptime: process.uptime(),
    });
});
exports.default = router;
//# sourceMappingURL=health.js.map