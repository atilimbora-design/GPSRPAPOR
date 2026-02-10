import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { serverConfig, securityConfig, isDevelopment } from '@/config';
import { sequelize } from '@/models';
import { migrate } from '@/database/migrate';
import { seed } from '@/database/seed';
import logger, { logInfo, logError, loggerStream } from '@/utils/logger';
import healthRoutes from '@/routes/health';
import authRoutes from '@/routes/auth';
import adminRoutes from '@/routes/admin';
import locationRoutes from '@/routes/location';
import { setSocketIO } from '@/controllers/location';
import {
  helmetConfig,
  compressionConfig,
  rateLimiter,
  securityHeaders,
  securityLogger,
  sanitizeRequest,
} from '@/middleware/security';

/**
 * GPS RAPOR System Server
 * Main server entry point with TypeScript, security, and monitoring
 */
class GPSRaporServer {
  private app: express.Application;
  private server: http.Server;
  private io: SocketIOServer;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: securityConfig.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
    this.setupErrorHandling();
    
    // Pass Socket.IO instance to location controller
    setSocketIO(this.io);
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmetConfig);
    this.app.use(securityHeaders);
    this.app.use(securityLogger);
    
    // CORS
    this.app.use(cors({
      origin: securityConfig.cors.origin,
      credentials: true,
    }));

    // Compression
    this.app.use(compressionConfig);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ limit: '10mb', extended: true }));

    // Request sanitization
    this.app.use(sanitizeRequest);

    // Rate limiting
    this.app.use(rateLimiter);

    // HTTP request logging
    if (isDevelopment) {
      const morgan = require('morgan');
      this.app.use(morgan('combined', { stream: loggerStream }));
    }

    // Static file serving
    this.app.use('/uploads', express.static('uploads'));
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check routes
    this.app.use('/', healthRoutes);

    // Authentication routes
    this.app.use('/api/auth', authRoutes);

    // Admin routes
    this.app.use('/api/admin', adminRoutes);

    // Location routes
    this.app.use('/api/locations', locationRoutes);

    // API routes will be added here as they are implemented
    // this.app.use('/api/users', userRoutes);
    // this.app.use('/api/locations', locationRoutes);
    // this.app.use('/api/messages', messageRoutes);
    // this.app.use('/api/reports', reportRoutes);

    // Catch-all route for undefined endpoints
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
      });
    });
  }

  /**
   * Setup Socket.IO for real-time communication
   */
  private setupSocketIO(): void {
    this.io.on('connection', (socket) => {
      logInfo('Client connected', { socketId: socket.id });

      // Authentication will be implemented here
      socket.on('authenticate', (token) => {
        // JWT authentication logic
        logInfo('Client authentication attempt', { socketId: socket.id });
      });

      // Location updates
      socket.on('updateLocation', (data) => {
        logInfo('Location update received', { 
          socketId: socket.id,
          lat: data.lat,
          lng: data.lng,
        });
        
        // Broadcast location update to all connected clients (admin users)
        socket.broadcast.emit('locationUpdate', {
          userId: data.userId,
          latitude: data.lat,
          longitude: data.lng,
          timestamp: new Date(),
          source: data.source || 'gps'
        });
      });

      // Message handling
      socket.on('sendMessage', (data) => {
        logInfo('Message received', { 
          socketId: socket.id,
          messageType: data.type,
        });
      });

      socket.on('disconnect', (reason) => {
        logInfo('Client disconnected', { 
          socketId: socket.id,
          reason,
        });
      });
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logError(error, { type: 'uncaughtException' });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logError(new Error(`Unhandled Rejection: ${reason}`), {
        type: 'unhandledRejection',
        promise: promise.toString(),
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logInfo('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logInfo('SIGINT received, shutting down gracefully');
      this.shutdown();
    });

    // Express error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logError(error, {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(500).json({
        error: isDevelopment ? error.message : 'Internal server error',
        ...(isDevelopment && { stack: error.stack }),
      });
    });
  }

  /**
   * Initialize database
   */
  private async initializeDatabase(): Promise<void> {
    try {
      logInfo('Initializing database...');
      
      // Test connection
      await sequelize.authenticate();
      logInfo('Database connection established');

      // Run migrations
      await migrate();

      // Seed database if empty
      const { User } = await import('@/models');
      const userCount = await User.count();
      
      if (userCount === 0) {
        logInfo('Database is empty, running seed...');
        await seed();
      }

      logInfo('Database initialization completed');
    } catch (error) {
      logError(error as Error, { operation: 'database_initialization' });
      throw error;
    }
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Initialize database
      await this.initializeDatabase();

      // Start server
      this.server.listen(serverConfig.port, serverConfig.host, () => {
        logInfo(`GPS RAPOR Server started`, {
          port: serverConfig.port,
          host: serverConfig.host,
          environment: process.env.NODE_ENV,
          nodeVersion: process.version,
        });
      });

    } catch (error) {
      logError(error as Error, { operation: 'server_start' });
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(): Promise<void> {
    try {
      logInfo('Starting graceful shutdown...');

      // Close Socket.IO connections
      this.io.close();

      // Close HTTP server
      this.server.close(() => {
        logInfo('HTTP server closed');
      });

      // Close database connection
      await sequelize.close();
      logInfo('Database connection closed');

      logInfo('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logError(error as Error, { operation: 'graceful_shutdown' });
      process.exit(1);
    }
  }
}

// Start server if this file is executed directly
if (require.main === module) {
  const server = new GPSRaporServer();
  server.start();
}

export default GPSRaporServer;