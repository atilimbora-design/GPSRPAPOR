"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuthAttempt = exports.verifyRefreshToken = exports.generateRefreshToken = exports.generateToken = exports.requirePermission = exports.hasPermission = exports.Permission = exports.requireAnyRole = exports.requirePersonnel = exports.requireOwnershipOrAdmin = exports.requireAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("@/config");
const models_1 = require("@/models");
const logger_1 = require("@/utils/logger");
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];
        if (!token) {
            (0, logger_1.logSecurity)('Missing authentication token', undefined, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
            });
            res.status(401).json({ error: 'Access token required' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.securityConfig.jwt.secret);
        const dbUser = await models_1.User.findByPk(decoded.id);
        if (!dbUser || !dbUser.isActive) {
            (0, logger_1.logSecurity)('Invalid or inactive user token', decoded.id, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
            });
            res.status(403).json({ error: 'Invalid or inactive user' });
            return;
        }
        req.user = {
            ...decoded,
            dbUser,
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            (0, logger_1.logSecurity)('Invalid JWT token', undefined, {
                error: error.message,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
            });
            res.status(403).json({ error: 'Invalid token' });
        }
        else {
            (0, logger_1.logError)(error, { operation: 'authenticateToken' });
            res.status(500).json({ error: 'Authentication error' });
        }
    }
};
exports.authenticateToken = authenticateToken;
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (req.user.role !== 'admin') {
        (0, logger_1.logSecurity)('Unauthorized admin access attempt', req.user.id, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
        });
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
const requireOwnershipOrAdmin = (userIdParam = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const resourceUserId = parseInt(req.params[userIdParam] || '0', 10);
        if (req.user.role === 'admin' || req.user.id === resourceUserId) {
            next();
        }
        else {
            (0, logger_1.logSecurity)('Unauthorized resource access attempt', req.user.id, {
                resourceUserId,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
            });
            res.status(403).json({ error: 'Access denied' });
        }
    };
};
exports.requireOwnershipOrAdmin = requireOwnershipOrAdmin;
const requirePersonnel = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (req.user.role !== 'personnel' && req.user.role !== 'admin') {
        (0, logger_1.logSecurity)('Unauthorized personnel access attempt', req.user.id, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
        });
        res.status(403).json({ error: 'Personnel access required' });
        return;
    }
    next();
};
exports.requirePersonnel = requirePersonnel;
const requireAnyRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            (0, logger_1.logSecurity)('Unauthorized role access attempt', req.user.id, {
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
exports.requireAnyRole = requireAnyRole;
var Permission;
(function (Permission) {
    Permission["USER_READ"] = "user:read";
    Permission["USER_CREATE"] = "user:create";
    Permission["USER_UPDATE"] = "user:update";
    Permission["USER_DELETE"] = "user:delete";
    Permission["USER_MANAGE_ROLES"] = "user:manage_roles";
    Permission["LOCATION_READ_OWN"] = "location:read_own";
    Permission["LOCATION_READ_ALL"] = "location:read_all";
    Permission["LOCATION_CREATE"] = "location:create";
    Permission["MESSAGE_READ_OWN"] = "message:read_own";
    Permission["MESSAGE_READ_ALL"] = "message:read_all";
    Permission["MESSAGE_CREATE"] = "message:create";
    Permission["MESSAGE_DELETE"] = "message:delete";
    Permission["REPORT_READ"] = "report:read";
    Permission["REPORT_CREATE"] = "report:create";
    Permission["REPORT_DELETE"] = "report:delete";
    Permission["SYSTEM_ADMIN"] = "system:admin";
    Permission["SYSTEM_MONITOR"] = "system:monitor";
})(Permission || (exports.Permission = Permission = {}));
const rolePermissions = {
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
const hasPermission = (role, permission) => {
    return rolePermissions[role]?.includes(permission) || false;
};
exports.hasPermission = hasPermission;
const requirePermission = (...permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const userPermissions = rolePermissions[req.user.role] || [];
        const hasRequiredPermission = permissions.some(permission => userPermissions.includes(permission));
        if (!hasRequiredPermission) {
            (0, logger_1.logSecurity)('Unauthorized permission access attempt', req.user.id, {
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
exports.requirePermission = requirePermission;
const generateToken = (user) => {
    const payload = {
        id: user.id,
        role: user.role,
        name: user.name,
        code: user.personnelId,
    };
    return jsonwebtoken_1.default.sign(payload, config_1.securityConfig.jwt.secret, {
        expiresIn: config_1.securityConfig.jwt.expiresIn,
    });
};
exports.generateToken = generateToken;
const generateRefreshToken = (user) => {
    const payload = {
        id: user.id,
        type: 'refresh',
    };
    return jsonwebtoken_1.default.sign(payload, config_1.securityConfig.jwt.secret, {
        expiresIn: config_1.securityConfig.jwt.refreshExpiresIn,
    });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyRefreshToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.securityConfig.jwt.secret);
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }
        return decoded.id;
    }
    catch (error) {
        throw new Error('Invalid refresh token');
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
const logAuthAttempt = (req, res, next) => {
    const originalSend = res.send;
    res.send = function (data) {
        const statusCode = res.statusCode;
        const { username } = req.body;
        if (statusCode === 200) {
            (0, logger_1.logSecurity)('Successful login', undefined, {
                username,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
        }
        else {
            (0, logger_1.logSecurity)('Failed login attempt', undefined, {
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
exports.logAuthAttempt = logAuthAttempt;
//# sourceMappingURL=auth.js.map