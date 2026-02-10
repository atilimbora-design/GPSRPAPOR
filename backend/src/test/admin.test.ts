import request from 'supertest';
import express from 'express';
import { User } from '@/models';
import { sequelize } from '@/models';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/middleware/auth';
import adminRoutes from '@/routes/admin';
import { helmetConfig, compressionConfig } from '@/middleware/security';

describe('Admin API Endpoints', () => {
  let app: express.Application;
  let adminUser: User;
  let personnelUser: User;
  let adminToken: string;
  let personnelToken: string;

  beforeAll(async () => {
    // Setup test Express app
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);
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

  describe('GET /api/admin/users', () => {
    it('should allow admin to get all users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should deny personnel from getting all users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${personnelToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/admin/users?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });

    it('should support role filtering', async () => {
      const response = await request(app)
        .get('/api/admin/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every((user: any) => user.role === 'admin')).toBe(true);
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=Admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/admin/users/:userId', () => {
    it('should allow admin to get user by ID', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${personnelUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(personnelUser.id);
      expect(response.body.data.personnelId).toBe(personnelUser.personnelId);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/admin/users/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should deny personnel from getting user by ID', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${personnelUser.id}`)
        .set('Authorization', `Bearer ${personnelToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/admin/users', () => {
    it('should allow admin to create new user', async () => {
      const newUser = {
        personnelId: 'PERS02',
        name: 'New Personnel',
        email: 'newpersonnel@test.com',
        password: 'NewUser123!',
        role: 'personnel',
      };

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.personnelId).toBe(newUser.personnelId);
      expect(response.body.data.name).toBe(newUser.name);
      expect(response.body.data.role).toBe(newUser.role);
    });

    it('should prevent creating user with duplicate personnel ID', async () => {
      const duplicateUser = {
        personnelId: 'PERS01', // Already exists
        name: 'Duplicate User',
        password: 'Duplicate123!',
        role: 'personnel',
      };

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateUser);

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });

    it('should deny personnel from creating users', async () => {
      const newUser = {
        personnelId: 'PERS03',
        name: 'Another Personnel',
        password: 'NewUser123!',
        role: 'personnel',
      };

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${personnelToken}`)
        .send(newUser);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/admin/users/:userId', () => {
    it('should allow admin to update user', async () => {
      const updates = {
        name: 'Updated Personnel Name',
        email: 'updated@test.com',
      };

      const response = await request(app)
        .put(`/api/admin/users/${personnelUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updates.name);
      expect(response.body.data.email).toBe(updates.email);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/admin/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' });

      expect(response.status).toBe(404);
    });

    it('should deny personnel from updating users', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${personnelUser.id}`)
        .set('Authorization', `Bearer ${personnelToken}`)
        .send({ name: 'Test' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/admin/users/:userId', () => {
    it('should allow admin to delete user', async () => {
      // Create a user to delete
      const userToDelete = await User.create({
        personnelId: 'TODELETE',
        name: 'To Delete',
        role: 'personnel',
        passwordHash: await bcrypt.hash('Test123!', 12),
        isActive: true,
      });

      const response = await request(app)
        .delete(`/api/admin/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify user is deleted
      const deletedUser = await User.findByPk(userToDelete.id);
      expect(deletedUser).toBeNull();
    });

    it('should prevent admin from deleting themselves', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot delete your own account');
    });

    it('should deny personnel from deleting users', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${personnelUser.id}`)
        .set('Authorization', `Bearer ${personnelToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/admin/users/:userId/role', () => {
    it('should allow admin to update user role', async () => {
      // Create a user to change role
      const userToUpdate = await User.create({
        personnelId: 'ROLECHANGE',
        name: 'Role Change User',
        role: 'personnel',
        passwordHash: await bcrypt.hash('Test123!', 12),
        isActive: true,
      });

      const response = await request(app)
        .patch(`/api/admin/users/${userToUpdate.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('admin');
    });

    it('should prevent admin from changing their own role', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${adminUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'personnel' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot change your own role');
    });

    it('should deny personnel from changing roles', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${personnelUser.id}/role`)
        .set('Authorization', `Bearer ${personnelToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/admin/users/:userId/status', () => {
    it('should allow admin to toggle user status', async () => {
      const initialStatus = personnelUser.isActive;

      const response = await request(app)
        .patch(`/api/admin/users/${personnelUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(!initialStatus);
    });

    it('should prevent admin from changing their own status', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${adminUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot change your own status');
    });
  });

  describe('POST /api/admin/users/:userId/reset-password', () => {
    it('should allow admin to reset user password', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${personnelUser.id}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'NewPassword123!' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset successfully');
    });

    it('should deny personnel from resetting passwords', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${personnelUser.id}/reset-password`)
        .set('Authorization', `Bearer ${personnelToken}`)
        .send({ newPassword: 'NewPassword123!' });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/admin/users/statistics', () => {
    it('should allow admin to get user statistics', async () => {
      const response = await request(app)
        .get('/api/admin/users/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('inactive');
      expect(response.body.data).toHaveProperty('personnel');
      expect(response.body.data).toHaveProperty('admin');
      expect(response.body.data).toHaveProperty('recentlyActive');
    });

    it('should deny personnel from getting statistics', async () => {
      const response = await request(app)
        .get('/api/admin/users/statistics')
        .set('Authorization', `Bearer ${personnelToken}`);

      expect(response.status).toBe(403);
    });
  });
});
