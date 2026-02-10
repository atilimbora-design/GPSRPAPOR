import request from 'supertest';
import express from 'express';
import { User } from '@/models';
import {
  authenticateToken,
  requireAdmin,
  requirePersonnel,
  requireAnyRole,
  requirePermission,
  requireOwnershipOrAdmin,
  Permission,
  generateToken,
} from '@/middleware/auth';
import { sequelize } from '@/models';
import bcrypt from 'bcryptjs';

describe('Role-Based Access Control (RBAC)', () => {
  let app: express.Application;
  let adminUser: User;
  let personnelUser: User;
  let adminToken: string;
  let personnelToken: string;

  beforeAll(async () => {
    // Setup test Express app
    app = express();
    app.use(express.json());

    // Test routes for different permission levels
    app.get('/admin-only', authenticateToken, requireAdmin, (req, res) => {
      res.json({ message: 'Admin access granted' });
    });

    app.get('/personnel-only', authenticateToken, requirePersonnel, (req, res) => {
      res.json({ message: 'Personnel access granted' });
    });

    app.get('/any-role', authenticateToken, requireAnyRole('personnel', 'admin'), (req, res) => {
      res.json({ message: 'Access granted' });
    });

    app.get('/user-read', authenticateToken, requirePermission(Permission.USER_READ), (req, res) => {
      res.json({ message: 'User read permission granted' });
    });

    app.get('/user-create', authenticateToken, requirePermission(Permission.USER_CREATE), (req, res) => {
      res.json({ message: 'User create permission granted' });
    });

    app.get('/location-read-all', authenticateToken, requirePermission(Permission.LOCATION_READ_ALL), (req, res) => {
      res.json({ message: 'Location read all permission granted' });
    });

    app.get('/user/:userId/profile', authenticateToken, requireOwnershipOrAdmin('userId'), (req, res) => {
      res.json({ message: 'Profile access granted' });
    });
  });

  beforeEach(async () => {
    // Create test users before each test (after cleanup)
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    adminUser = await User.create({
      personnelId: 'ADMIN01',
      name: 'Admin User',
      email: 'admin@test.com',
      role: 'admin',
      passwordHash: adminPassword,
      isActive: true,
    });

    const personnelPassword = await bcrypt.hash('Personnel123!', 12);
    personnelUser = await User.create({
      personnelId: 'PERS01',
      name: 'Personnel User',
      email: 'personnel@test.com',
      role: 'personnel',
      passwordHash: personnelPassword,
      isActive: true,
    });

    // Generate tokens
    adminToken = generateToken(adminUser);
    personnelToken = generateToken(personnelUser);
  });

  describe('Admin Role Middleware', () => {
    it('should allow admin users to access admin-only routes', async () => {
      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Admin access granted');
    });

    it('should deny personnel users access to admin-only routes', async () => {
      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${personnelToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should deny unauthenticated users access to admin-only routes', async () => {
      const response = await request(app)
        .get('/admin-only');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('Personnel Role Middleware', () => {
    it('should allow personnel users to access personnel routes', async () => {
      const response = await request(app)
        .get('/personnel-only')
        .set('Authorization', `Bearer ${personnelToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Personnel access granted');
    });

    it('should allow admin users to access personnel routes', async () => {
      const response = await request(app)
        .get('/personnel-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Personnel access granted');
    });
  });

  describe('Any Role Middleware', () => {
    it('should allow admin users to access any-role routes', async () => {
      const response = await request(app)
        .get('/any-role')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Access granted');
    });

    it('should allow personnel users to access any-role routes', async () => {
      const response = await request(app)
        .get('/any-role')
        .set('Authorization', `Bearer ${personnelToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Access granted');
    });
  });

  describe('Permission-Based Middleware', () => {
    it('should allow admin users to read users (USER_READ permission)', async () => {
      const response = await request(app)
        .get('/user-read')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User read permission granted');
    });

    it('should allow personnel users to read users (USER_READ permission)', async () => {
      const response = await request(app)
        .get('/user-read')
        .set('Authorization', `Bearer ${personnelToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User read permission granted');
    });

    it('should allow admin users to create users (USER_CREATE permission)', async () => {
      const response = await request(app)
        .get('/user-create')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User create permission granted');
    });

    it('should deny personnel users from creating users (USER_CREATE permission)', async () => {
      const response = await request(app)
        .get('/user-create')
        .set('Authorization', `Bearer ${personnelToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should allow admin users to read all locations (LOCATION_READ_ALL permission)', async () => {
      const response = await request(app)
        .get('/location-read-all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Location read all permission granted');
    });

    it('should deny personnel users from reading all locations (LOCATION_READ_ALL permission)', async () => {
      const response = await request(app)
        .get('/location-read-all')
        .set('Authorization', `Bearer ${personnelToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('Ownership or Admin Middleware', () => {
    it('should allow admin users to access any user profile', async () => {
      const response = await request(app)
        .get(`/user/${personnelUser.id}/profile`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile access granted');
    });

    it('should allow users to access their own profile', async () => {
      const response = await request(app)
        .get(`/user/${personnelUser.id}/profile`)
        .set('Authorization', `Bearer ${personnelToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile access granted');
    });

    it('should deny users from accessing other users profiles', async () => {
      const response = await request(app)
        .get(`/user/${adminUser.id}/profile`)
        .set('Authorization', `Bearer ${personnelToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('Permission System', () => {
    it('should grant all permissions to admin role', () => {
      const adminPermissions = [
        Permission.USER_READ,
        Permission.USER_CREATE,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
        Permission.USER_MANAGE_ROLES,
        Permission.LOCATION_READ_ALL,
        Permission.MESSAGE_READ_ALL,
        Permission.MESSAGE_DELETE,
        Permission.REPORT_CREATE,
        Permission.REPORT_DELETE,
        Permission.SYSTEM_ADMIN,
        Permission.SYSTEM_MONITOR,
      ];

      // Import hasPermission function
      const { hasPermission } = require('@/middleware/auth');

      adminPermissions.forEach(permission => {
        expect(hasPermission('admin', permission)).toBe(true);
      });
    });

    it('should grant limited permissions to personnel role', () => {
      const personnelPermissions = [
        Permission.USER_READ,
        Permission.LOCATION_READ_OWN,
        Permission.LOCATION_CREATE,
        Permission.MESSAGE_READ_OWN,
        Permission.MESSAGE_CREATE,
        Permission.REPORT_READ,
      ];

      const { hasPermission } = require('@/middleware/auth');

      personnelPermissions.forEach(permission => {
        expect(hasPermission('personnel', permission)).toBe(true);
      });
    });

    it('should deny admin-only permissions to personnel role', () => {
      const adminOnlyPermissions = [
        Permission.USER_CREATE,
        Permission.USER_DELETE,
        Permission.USER_MANAGE_ROLES,
        Permission.LOCATION_READ_ALL,
        Permission.MESSAGE_READ_ALL,
        Permission.MESSAGE_DELETE,
        Permission.REPORT_CREATE,
        Permission.REPORT_DELETE,
        Permission.SYSTEM_ADMIN,
      ];

      const { hasPermission } = require('@/middleware/auth');

      adminOnlyPermissions.forEach(permission => {
        expect(hasPermission('personnel', permission)).toBe(false);
      });
    });
  });
});
