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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTestJWT = exports.createTestMessage = exports.createTestLocation = exports.createTestUser = void 0;
const models_1 = require("@/models");
const logger_1 = require("@/utils/logger");
jest.setTimeout(30000);
beforeAll(async () => {
    try {
        await models_1.sequelize.sync({ force: true });
        (0, logger_1.logInfo)('Test database initialized');
    }
    catch (error) {
        console.error('Failed to initialize test database:', error);
        throw error;
    }
});
afterAll(async () => {
    try {
        await models_1.sequelize.close();
        (0, logger_1.logInfo)('Test database connection closed');
    }
    catch (error) {
        console.error('Failed to close test database connection:', error);
    }
});
beforeEach(async () => {
    const models = Object.values(models_1.sequelize.models);
    for (const model of models) {
        await model.destroy({ where: {}, truncate: true });
    }
});
expect.extend({
    toBeValidUUID(received) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const pass = uuidRegex.test(received);
        if (pass) {
            return {
                message: () => `expected ${received} not to be a valid UUID`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected ${received} to be a valid UUID`,
                pass: false,
            };
        }
    },
    toBeValidDate(received) {
        const pass = received instanceof Date && !isNaN(received.getTime());
        if (pass) {
            return {
                message: () => `expected ${received} not to be a valid Date`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected ${received} to be a valid Date`,
                pass: false,
            };
        }
    },
});
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(),
        expire: jest.fn(),
        flushall: jest.fn(),
        quit: jest.fn(),
    }));
});
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    unlinkSync: jest.fn(),
}));
const createTestUser = async (overrides = {}) => {
    const { User } = await Promise.resolve().then(() => __importStar(require('@/models')));
    const { hashPassword } = await Promise.resolve().then(() => __importStar(require('@/utils/encryption')));
    const defaultUser = {
        personnelId: 'TEST001',
        name: 'Test User',
        role: 'personnel',
        passwordHash: await hashPassword('testpassword'),
        isActive: true,
        ...overrides,
    };
    return User.create(defaultUser);
};
exports.createTestUser = createTestUser;
const createTestLocation = async (userId, overrides = {}) => {
    const { Location } = await Promise.resolve().then(() => __importStar(require('@/models')));
    const defaultLocation = {
        userId,
        latitude: 39.9334,
        longitude: 32.8597,
        accuracy: 10,
        timestamp: new Date(),
        batteryLevel: 85,
        source: 'gps',
        isManual: false,
        syncStatus: 'synced',
        ...overrides,
    };
    return Location.create(defaultLocation);
};
exports.createTestLocation = createTestLocation;
const createTestMessage = async (senderId, overrides = {}) => {
    const { Message } = await Promise.resolve().then(() => __importStar(require('@/models')));
    const defaultMessage = {
        conversationId: 'test-conversation',
        senderId,
        recipientIds: JSON.stringify([1]),
        content: 'Test message',
        type: 'text',
        status: 'sent',
        timestamp: new Date(),
        syncStatus: 'synced',
        ...overrides,
    };
    return Message.create(defaultMessage);
};
exports.createTestMessage = createTestMessage;
const generateTestJWT = (userId, role = 'personnel') => {
    const jwt = require('jsonwebtoken');
    const { securityConfig } = require('@/config');
    return jwt.sign({
        id: userId,
        role,
        name: 'Test User',
        code: 'TEST001',
    }, securityConfig.jwt.secret, { expiresIn: '1h' });
};
exports.generateTestJWT = generateTestJWT;
//# sourceMappingURL=setup.js.map