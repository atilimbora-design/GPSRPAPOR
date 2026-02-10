import { sequelize } from '@/models';
import { logInfo } from '@/utils/logger';

/**
 * Test setup configuration
 * This file is run before all tests
 */

// Global test timeout
jest.setTimeout(30000);

// Setup database for testing
beforeAll(async () => {
  try {
    // Use in-memory SQLite for tests
    await sequelize.sync({ force: true });
    logInfo('Test database initialized');
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await sequelize.close();
    logInfo('Test database connection closed');
  } catch (error) {
    console.error('Failed to close test database connection:', error);
  }
});

// Clean up between tests
beforeEach(async () => {
  // Clear all tables before each test
  try {
    // Disable foreign key checks temporarily
    await sequelize.query('PRAGMA foreign_keys = OFF');
    
    // Delete in order to respect foreign keys
    const { Location, Message, SyncOperation, Report, User } = sequelize.models;
    
    if (Location) await Location.destroy({ where: {}, force: true });
    if (Message) await Message.destroy({ where: {}, force: true });
    if (SyncOperation) await SyncOperation.destroy({ where: {}, force: true });
    if (Report) await Report.destroy({ where: {}, force: true });
    if (User) await User.destroy({ where: {}, force: true });
    
    // Re-enable foreign key checks
    await sequelize.query('PRAGMA foreign_keys = ON');
  } catch (error) {
    console.warn('Table cleanup failed:', error);
  }
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidDate(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Date`,
        pass: false,
      };
    }
  },
});

// Mock external services for testing
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

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// Test helper functions
export const createTestUser = async (overrides: any = {}) => {
  const { User } = await import('@/models');
  const bcrypt = await import('bcryptjs');
  
  // Remove passwordHash from overrides if it's undefined to prevent override
  const { passwordHash: overridePasswordHash, ...otherOverrides } = overrides;
  
  const defaultUser = {
    personnelId: 'TEST001',
    name: 'Test User',
    role: 'personnel',
    passwordHash: overridePasswordHash || await bcrypt.hash('testpassword', 12),
    isActive: true,
    ...otherOverrides,
  };
  
  return User.create(defaultUser);
};

export const createTestLocation = async (userId: number, overrides: any = {}) => {
  const { Location } = await import('@/models');
  
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

export const createTestMessage = async (senderId: number, overrides: any = {}) => {
  const { Message } = await import('@/models');
  
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

export const generateTestJWT = (userId: number, role: string = 'personnel') => {
  const jwt = require('jsonwebtoken');
  const { securityConfig } = require('@/config');
  
  return jwt.sign(
    {
      id: userId,
      role,
      name: 'Test User',
      code: 'TEST001',
    },
    securityConfig.jwt.secret,
    { expiresIn: '1h' }
  );
};