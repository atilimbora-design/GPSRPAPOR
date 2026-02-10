import { Router, Request, Response } from 'express';
import { sequelize } from '@/models';
import { HealthCheck, ServiceHealth } from '@/types';
import { logInfo, logError } from '@/utils/logger';

const router = Router();

/**
 * Health check endpoint
 * Returns system health status and service availability
 */
router.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const services: { [key: string]: ServiceHealth } = {};
    let overallStatus: 'healthy' | 'unhealthy' = 'healthy';

    // Check database connection
    try {
      const dbStart = Date.now();
      await sequelize.authenticate();
      services.database = {
        name: 'database',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - dbStart,
      };
    } catch (error) {
      services.database = {
        name: 'database',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      };
      overallStatus = 'unhealthy';
    }

    // Server health
    services.server = {
      name: 'server',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    };

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    const healthCheck: HealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
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

    // Log health check if unhealthy
    if (overallStatus === 'unhealthy') {
      logError(new Error('Health check failed'), {
        services: Object.values(services).filter(s => s.status === 'unhealthy'),
        responseTime: Date.now() - startTime,
      });
    }

  } catch (error) {
    logError(error as Error, { operation: 'health_check' });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      uptime: process.uptime(),
    });
  }
});

/**
 * Simple ping endpoint for basic availability check
 */
router.get('/ping', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Readiness probe endpoint
 * Checks if the application is ready to serve traffic
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Check if database is ready
    await sequelize.authenticate();
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError(error as Error, { operation: 'readiness_check' });
    
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Database not ready',
    });
  }
});

/**
 * Liveness probe endpoint
 * Checks if the application is alive and should not be restarted
 */
router.get('/live', (_req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;