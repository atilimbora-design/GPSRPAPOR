import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '@/models';
import authRoutes from '@/routes/auth';
import { createTestUser, generateTestJWT } from './setup';

// Mock the security middleware to avoid issues in tests
jest.mock('@/middleware/security', () => ({
  rateLimiter: (req: any, res: any, next: any) => next(),
  authRateLimiter: (req: any, res: any, next: any) => next(),
  helmetConfig: (req: any, res: any, next: any) => next(),
  compressionConfig: (req: any, res: any, next: any) => next(),
  securityHeaders: (req: any, res: any, next: any) => next(),
  securityLogger: (req: any, res: any, next: any) => next(),
  sanitizeRequest: (req: any, res: any, next: any) => next(),
}));

// Mock express-rate-limit to avoid rate limiting in tests
jest.mock('express-rate-limit', () => {
  return jest.fn(() => (req: any, res: any, next: any) => next());
});

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Authentication System', () => {
  describe('POST /api/auth/register', () => {
    let adminUser: any;
    let adminToken: string;

    beforeEach(async () => {
      // Create admin user for registration tests
      adminUser = await createTestUser({
        personnelId: 'ADMIN001',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        passwordHash: await bcrypt.hash('AdminPassword123!', 12),
      });
      adminToken = generateTestJWT(adminUser.id, adminUser.role);
    });

    it('should register a new user successfully', async () => {
      const userData = {
        personnelId: 'TEST001',
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        password: 'TestPassword123!',
        role: 'personnel',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        personnelId: userData.personnelId,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
      });
      expect(response.body.user.id).toBeDefined();
      expect(response.body.message).toBe('User registered successfully');

      // Verify user was created in database
      const user = await User.findOne({ where: { personnelId: userData.personnelId } });
      expect(user).toBeTruthy();
      expect(user?.name).toBe(userData.name);
    });

    it('should reject registration with duplicate personnel ID', async () => {
      // Create existing user
      await createTestUser({ personnelId: 'TEST001' });

      const userData = {
        personnelId: 'TEST001',
        name: 'Another User',
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User with this personnel ID already exists');
    });

    it('should reject registration with invalid password', async () => {
      const userData = {
        personnelId: 'TEST002',
        name: 'Test User',
        password: 'weak', // Too weak
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        personnelId: 'TEST003',
        name: 'Test User',
        email: 'invalid-email',
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser({
        personnelId: 'TEST001',
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('TestPassword123!', 12),
      });
    });

    it('should login with personnel ID successfully', async () => {
      const loginData = {
        username: 'TEST001',
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        id: testUser.id,
        personnelId: testUser.personnelId,
        name: testUser.name,
        role: testUser.role,
      });
      expect(response.body.tokens).toBeDefined();
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
      expect(response.body.tokens.expiresIn).toBe(24 * 60 * 60);
    });

    it('should login with email successfully', async () => {
      const loginData = {
        username: 'test@example.com',
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(testUser.id);
    });

    it('should reject login with invalid credentials', async () => {
      const loginData = {
        username: 'TEST001',
        password: 'WrongPassword',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login for non-existent user', async () => {
      const loginData = {
        username: 'NONEXISTENT',
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login for inactive user', async () => {
      await testUser.update({ isActive: false });

      const loginData = {
        username: 'TEST001',
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Account is deactivated');
    });

    it('should include device info in login', async () => {
      const loginData = {
        username: 'TEST001',
        password: 'TestPassword123!',
        deviceInfo: {
          deviceId: 'test-device-123',
          platform: 'android',
          appVersion: '1.0.0',
          fcmToken: 'test-fcm-token',
        },
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify device info was saved
      await testUser.reload();
      expect(testUser.deviceInfo).toMatchObject(loginData.deviceInfo);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let testUser: any;
    let refreshToken: string;

    beforeEach(async () => {
      testUser = await createTestUser();
      
      // Login to get refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.personnelId,
          password: 'testpassword',
        });
      
      refreshToken = loginResponse.body.tokens.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tokens).toBeDefined();
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
      expect(response.body.tokens.expiresIn).toBe(24 * 60 * 60);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid refresh token');
    });

    it('should reject refresh token for inactive user', async () => {
      await testUser.update({ isActive: false });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid user');
    });
  });

  describe('GET /api/auth/profile', () => {
    let testUser: any;
    let accessToken: string;

    beforeEach(async () => {
      testUser = await createTestUser();
      accessToken = generateTestJWT(testUser.id, testUser.role);
    });

    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: testUser.id,
        personnelId: testUser.personnelId,
        name: testUser.name,
        role: testUser.role,
      });
      expect(response.body.data.passwordHash).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('PUT /api/auth/profile', () => {
    let testUser: any;
    let accessToken: string;

    beforeEach(async () => {
      testUser = await createTestUser();
      accessToken = generateTestJWT(testUser.id, testUser.role);
    });

    it('should update profile successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        phone: '+9876543210',
        preferences: {
          notifications: {
            messages: false,
            alerts: true,
          },
          theme: 'dark',
        },
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(updateData);
      expect(response.body.message).toBe('Profile updated successfully');

      // Verify changes in database
      await testUser.reload();
      expect(testUser.name).toBe(updateData.name);
      expect(testUser.email).toBe(updateData.email);
      expect(testUser.phone).toBe(updateData.phone);
    });

    it('should reject duplicate email', async () => {
      // Create another user with email
      await createTestUser({
        personnelId: 'TEST002',
        email: 'existing@example.com',
      });

      const updateData = {
        email: 'existing@example.com',
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email address is already in use');
    });
  });

  describe('GET /api/auth/verify', () => {
    let testUser: any;
    let accessToken: string;

    beforeEach(async () => {
      testUser = await createTestUser();
      accessToken = generateTestJWT(testUser.id, testUser.role);
    });

    it('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: testUser.id,
        role: testUser.role,
        name: testUser.name,
        code: testUser.personnelId,
      });
      expect(response.body.message).toBe('Token is valid');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('POST /api/auth/logout', () => {
    let testUser: any;
    let accessToken: string;

    beforeEach(async () => {
      testUser = await createTestUser();
      accessToken = generateTestJWT(testUser.id, testUser.role);
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');

      // Verify lastLogout was updated
      await testUser.reload();
      expect(testUser.lastLogout).toBeDefined();
      expect(testUser.lastLogout).toBeValidDate();
    });

    it('should handle logout without token gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });
  });
});