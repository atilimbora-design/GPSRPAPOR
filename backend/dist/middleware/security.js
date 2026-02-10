"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileUploadSecurity = exports.ipWhitelist = exports.securityLogger = exports.securityHeaders = exports.sanitizeRequest = exports.compressionConfig = exports.helmetConfig = exports.authRateLimiter = exports.rateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const config_1 = require("@/config");
const logger_1 = require("@/utils/logger");
exports.rateLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.securityConfig.rateLimit.windowMs,
    max: config_1.securityConfig.rateLimit.maxRequests,
    message: {
        error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        (0, logger_1.logSecurity)('Rate limit exceeded', undefined, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
        });
        res.status(429).json({
            error: 'Too many requests from this IP, please try again later.',
        });
    },
});
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        error: 'Too many authentication attempts, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        (0, logger_1.logSecurity)('Auth rate limit exceeded', undefined, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
        });
        res.status(429).json({
            error: 'Too many authentication attempts, please try again later.',
        });
    },
});
exports.helmetConfig = (0, helmet_1.default)({
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
exports.compressionConfig = (0, compression_1.default)({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression_1.default.filter(req, res);
    },
    level: 6,
    threshold: 1024,
});
const sanitizeRequest = (req, res, next) => {
    for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
            req.query[key] = req.query[key]
                .replace(/[<>]/g, '')
                .trim();
        }
    }
    if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
    }
    next();
};
exports.sanitizeRequest = sanitizeRequest;
const sanitizeObject = (obj) => {
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            obj[key] = obj[key]
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .trim();
        }
        else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
        }
    }
};
const securityHeaders = (req, res, next) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
};
exports.securityHeaders = securityHeaders;
const securityLogger = (req, res, next) => {
    const startTime = Date.now();
    const suspiciousPatterns = [
        /\.\.\//,
        /<script/i,
        /union.*select/i,
        /exec\s*\(/i,
    ];
    const url = req.url.toLowerCase();
    const userAgent = req.get('User-Agent') || '';
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(url) || pattern.test(userAgent)) {
            (0, logger_1.logSecurity)('Suspicious request detected', undefined, {
                ip: req.ip,
                userAgent,
                url: req.url,
                method: req.method,
                pattern: pattern.toString(),
            });
            break;
        }
    }
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        if (duration > 5000) {
            (0, logger_1.logWarning)('Slow request detected', {
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
exports.securityLogger = securityLogger;
const ipWhitelist = (allowedIPs) => {
    return (req, res, next) => {
        const clientIP = req.ip;
        if (!allowedIPs.includes(clientIP)) {
            (0, logger_1.logSecurity)('IP not in whitelist', undefined, {
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
exports.ipWhitelist = ipWhitelist;
const fileUploadSecurity = (req, res, next) => {
    if (req.file) {
        const file = req.file;
        if (file.size > 10 * 1024 * 1024) {
            (0, logger_1.logSecurity)('File upload size exceeded', req.user?.id, {
                filename: file.originalname,
                size: file.size,
                ip: req.ip,
            });
            res.status(413).json({ error: 'File too large' });
            return;
        }
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            (0, logger_1.logSecurity)('Invalid file type uploaded', req.user?.id, {
                filename: file.originalname,
                mimetype: file.mimetype,
                ip: req.ip,
            });
            res.status(415).json({ error: 'File type not allowed' });
            return;
        }
        file.originalname = file.originalname
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .substring(0, 100);
    }
    next();
};
exports.fileUploadSecurity = fileUploadSecurity;
//# sourceMappingURL=security.js.map