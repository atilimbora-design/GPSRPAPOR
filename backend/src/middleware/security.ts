import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import { securityConfig } from '@/config';
import { logSecurity, logWarning } from '@/utils/logger';

/**
 * Rate limiting middleware
 */
export const rateLimiter = rateLimit({
  windowMs: securityConfig.rateLimit.windowMs,
  max: securityConfig.rateLimit.maxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logSecurity('Rate limit exceeded', undefined, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
    });
  },
});

/**
 * Stricter rate limiting for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logSecurity('Auth rate limit exceeded', undefined, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
    });
  },
});

/**
 * Helmet security middleware configuration
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Compression middleware
 */
export const compressionConfig = compression({
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
});

/**
 * Request sanitization middleware
 */
export const sanitizeRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Remove potentially dangerous characters from query parameters
  for (const key in req.query) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = (req.query[key] as string)
        .replace(/[<>]/g, '') // Remove < and >
        .trim();
    }
  }

  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
};

/**
 * Recursively sanitize object properties
 */
const sanitizeObject = (obj: any): void => {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Remove script tags and other potentially dangerous content
      obj[key] = obj[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
};

/**
 * Security headers middleware
 */
export const securityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

/**
 * Request logging middleware for security monitoring
 */
export const securityLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//,  // Directory traversal
    /<script/i, // Script injection
    /union.*select/i, // SQL injection
    /exec\s*\(/i, // Command injection
  ];
  
  const url = req.url.toLowerCase();
  const userAgent = req.get('User-Agent') || '';
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(userAgent)) {
      logSecurity('Suspicious request detected', undefined, {
        ip: req.ip,
        userAgent,
        url: req.url,
        method: req.method,
        pattern: pattern.toString(),
      });
      break;
    }
  }
  
  // Log response time for performance monitoring
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    if (duration > 5000) { // Log slow requests (>5s)
      logWarning('Slow request detected', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        duration,
        statusCode: res.statusCode,
      });
    }
  });
  
  next();
};

/**
 * IP whitelist middleware (for admin endpoints)
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || 'unknown';
    
    if (!allowedIPs.includes(clientIP)) {
      logSecurity('IP not in whitelist', undefined, {
        ip: clientIP,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });
      res.status(403).json({ error: 'Access denied from this IP address' });
      return;
    }
    
    next();
  };
};

/**
 * File upload security middleware
 */
export const fileUploadSecurity = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.file) {
    const file = req.file;
    
    // Check file size
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      logSecurity('File upload size exceeded', req.user?.id, {
        filename: file.originalname,
        size: file.size,
        ip: req.ip,
      });
      res.status(413).json({ error: 'File too large' });
      return;
    }
    
    // Check file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
    ];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      logSecurity('Invalid file type uploaded', req.user?.id, {
        filename: file.originalname,
        mimetype: file.mimetype,
        ip: req.ip,
      });
      res.status(415).json({ error: 'File type not allowed' });
      return;
    }
    
    // Sanitize filename
    file.originalname = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 100);
  }
  
  next();
};