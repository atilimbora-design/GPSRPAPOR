import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { securityConfig } from '@/config';
import { User } from '@/models';
import { JwtPayload } from '@/types';
import { logSecurity, logError } from '@/utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { dbUser?: User };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logSecurity('Missing authentication token', undefined, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, securityConfig.jwt.secret) as JwtPayload;
    
    // Get fresh user data from database
    const dbUser = await User.findByPk(decoded.id);
    if (!dbUser || !dbUser.isActive) {
      logSecurity('Invalid or inactive user token', decoded.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });
      res.status(403).json({ error: 'Invalid or inactive user' });
      return;
    }

    // Attach user info to request
    req.user = {
      ...decoded,
      dbUser,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logSecurity('Invalid JWT token', undefined, {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });
      res.status(403).json({ error: 'Invalid token' });
    } else {
      logError(error as Error, { operation: 'authenticateToken' });
      res.status(500).json({ error: 'Authentication error' });
    }
  }
};

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'admin') {
    logSecurity('Unauthorized admin access attempt', req.user.id, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
    });
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
};

/**
 * Middleware to check if user can access resource (admin or owner)
 */
export const requireOwnershipOrAdmin = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const resourceUserId = parseInt(req.params[userIdParam] || '0', 10);
    
    if (req.user.role === 'admin' || req.user.id === resourceUserId) {
      next();
    } else {
      logSecurity('Unauthorized resource access attempt', req.user.id, {
        resourceUserId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });
      res.status(403).json({ error: 'Access denied' });
    }
  };
};

/**
 * Middleware to check if user has personnel role
 */
export const requirePersonnel = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'personnel' && req.user.role !== 'admin') {
    logSecurity('Unauthorized personnel access attempt', req.user.id, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
    });
    res.status(403).json({ error: 'Personnel access required' });
    return;
  }

  next();
};

/**
 * Middleware to check if user has any of the specified roles
 */
export const requireAnyRole = (...roles: Array<'personnel' | 'admin'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logSecurity('Unauthorized role access attempt', req.user.id, {
        requiredRoles: roles,
        userRole: req.user.role,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });
      res.status(403).json({ 
        error: `Access denied. Required roles: ${roles.join(', ')}` 
      });
      return;
    }

    next();
  };
};

/**
 * Permission definitions for different resources
 */
export enum Permission {
  // User management
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_MANAGE_ROLES = 'user:manage_roles',
  
  // Location management
  LOCATION_READ_OWN = 'location:read_own',
  LOCATION_READ_ALL = 'location:read_all',
  LOCATION_CREATE = 'location:create',
  
  // Message management
  MESSAGE_READ_OWN = 'message:read_own',
  MESSAGE_READ_ALL = 'message:read_all',
  MESSAGE_CREATE = 'message:create',
  MESSAGE_DELETE = 'message:delete',
  
  // Report management
  REPORT_READ = 'report:read',
  REPORT_CREATE = 'report:create',
  REPORT_DELETE = 'report:delete',
  
  // System management
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_MONITOR = 'system:monitor',
}

/**
 * Role-based permission mapping
 */
const rolePermissions: Record<'personnel' | 'admin', Permission[]> = {
  personnel: [
    Permission.USER_READ,
    Permission.LOCATION_READ_OWN,
    Permission.LOCATION_CREATE,
    Permission.MESSAGE_READ_OWN,
    Permission.MESSAGE_CREATE,
    Permission.REPORT_READ,
  ],
  admin: [
    Permission.USER_READ,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_MANAGE_ROLES,
    Permission.LOCATION_READ_OWN,
    Permission.LOCATION_READ_ALL,
    Permission.LOCATION_CREATE,
    Permission.MESSAGE_READ_OWN,
    Permission.MESSAGE_READ_ALL,
    Permission.MESSAGE_CREATE,
    Permission.MESSAGE_DELETE,
    Permission.REPORT_READ,
    Permission.REPORT_CREATE,
    Permission.REPORT_DELETE,
    Permission.SYSTEM_ADMIN,
    Permission.SYSTEM_MONITOR,
  ],
};

/**
 * Check if a role has a specific permission
 */
export const hasPermission = (
  role: 'personnel' | 'admin',
  permission: Permission
): boolean => {
  return rolePermissions[role]?.includes(permission) || false;
};

/**
 * Middleware to check if user has specific permission
 */
export const requirePermission = (...permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userPermissions = rolePermissions[req.user.role] || [];
    const hasRequiredPermission = permissions.some(permission =>
      userPermissions.includes(permission)
    );

    if (!hasRequiredPermission) {
      logSecurity('Unauthorized permission access attempt', req.user.id, {
        requiredPermissions: permissions,
        userRole: req.user.role,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });
      res.status(403).json({ 
        error: 'Insufficient permissions' 
      });
      return;
    }

    next();
  };
};

/**
 * Generate JWT token for user
 */
export const generateToken = (user: User): string => {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    id: user.id,
    role: user.role,
    name: user.name,
    code: user.personnelId,
  };

  return jwt.sign(payload, securityConfig.jwt.secret, {
    expiresIn: securityConfig.jwt.expiresIn,
  } as jwt.SignOptions);
};

/**
 * Generate refresh token for user
 */
export const generateRefreshToken = (user: User): string => {
  const payload = {
    id: user.id,
    type: 'refresh',
  };

  return jwt.sign(payload, securityConfig.jwt.secret, {
    expiresIn: securityConfig.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
};

/**
 * Verify refresh token and return user ID
 */
export const verifyRefreshToken = (token: string): number => {
  try {
    const decoded = jwt.verify(token, securityConfig.jwt.secret) as any;
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded.id;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

/**
 * Middleware to log authentication attempts
 */
export const logAuthAttempt = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const originalSend = res.send;
  
  res.send = function(data) {
    const statusCode = res.statusCode;
    const { username } = req.body;
    
    if (statusCode === 200) {
      logSecurity('Successful login', undefined, {
        username,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
    } else {
      logSecurity('Failed login attempt', undefined, {
        username,
        statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};