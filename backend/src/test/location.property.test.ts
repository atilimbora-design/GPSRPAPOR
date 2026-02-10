import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { sequelize } from '@/models';
import { migrate } from '@/database/migrate';
import { seed } from '@/database/seed';
import GPSRaporServer from '@/server';

/**
 * Property-Based Tests for Location Tracking System
 * **Property 1: Location Tracking Continuity**
 * **Validates: Requirements 1.1, 1.3, 1.4**
 */

describe('Location Tracking Property Tests', () => {
  let server: GPSRaporServer;
  let app: any;
  let authToken: string;
  let userId: number;

  beforeAll(async () => {
    // Initialize test database
    await sequelize.sync({ force: true });
    await migrate();
    await seed();

    // Start server
    server = new GPSRaporServer();
    app = (server as any).app;

    // Get auth token for testing
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: '01',
        password: '1234'
      });

    console.log('Login response:', JSON.stringify(loginResponse.body, null, 2));
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed with status ${loginResponse.status}: ${JSON.stringify(loginResponse.body)}`);
    }

    authToken = loginResponse.body.tokens.accessToken;
    userId = loginResponse.body.user.id;
    
    console.log('Auth token:', authToken);
    console.log('User ID:', userId);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean location data before each test (only locations, not users)
    const { Location } = await import('@/models');
    await Location.destroy({ where: { userId } });
  });

  /**
   * Property 1: Location Tracking Continuity
   * Tests that location updates are stored and retrieved consistently
   */
  describe('Property 1: Location Tracking Continuity', () => {
    it('should maintain location tracking continuity across multiple updates', async () => {
      // Generate test location data
      const locations = [];
      const baseTime = Date.now();
      
      for (let i = 0; i < 10; i++) {
        locations.push({
          latitude: 39.9334 + (Math.random() - 0.5) * 0.01, // Around Ankara
          longitude: 32.8597 + (Math.random() - 0.5) * 0.01,
          accuracy: Math.random() * 50 + 5, // 5-55 meters
          timestamp: new Date(baseTime + i * 30000).toISOString(), // 30 second intervals
          batteryLevel: Math.max(10, 100 - i * 5), // Decreasing battery
          source: Math.random() > 0.5 ? 'gps' : 'network'
        });
      }

      // Store locations one by one
      const storedLocations = [];
      for (const location of locations) {
        const response = await request(app)
          .post('/api/locations')
          .set('Authorization', `Bearer ${authToken}`)
          .send(location)
          .expect(201);

        storedLocations.push(response.body.location);
      }

      // Verify all locations were stored
      expect(storedLocations).toHaveLength(locations.length);

      // Retrieve location history
      const historyResponse = await request(app)
        .get('/api/locations/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const retrievedLocations = historyResponse.body.locations;

      // Property: All stored locations should be retrievable
      expect(retrievedLocations).toHaveLength(locations.length);

      // Property: Locations should be ordered by timestamp (newest first)
      for (let i = 1; i < retrievedLocations.length; i++) {
        const current = new Date(retrievedLocations[i].timestamp);
        const previous = new Date(retrievedLocations[i - 1].timestamp);
        expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
      }

      // Property: Each location should have required fields
      retrievedLocations.forEach((loc: any) => {
        expect(loc).toHaveProperty('latitude');
        expect(loc).toHaveProperty('longitude');
        expect(loc).toHaveProperty('timestamp');
        expect(loc).toHaveProperty('source');
        expect(typeof loc.latitude).toBe('number');
        expect(typeof loc.longitude).toBe('number');
        expect(loc.latitude).toBeGreaterThanOrEqual(-90);
        expect(loc.latitude).toBeLessThanOrEqual(90);
        expect(loc.longitude).toBeGreaterThanOrEqual(-180);
        expect(loc.longitude).toBeLessThanOrEqual(180);
      });
    });

    it('should handle batch location updates correctly', async () => {
      // Generate batch location data
      const batchSize = 5;
      const locations = [];
      const baseTime = Date.now();
      
      for (let i = 0; i < batchSize; i++) {
        locations.push({
          latitude: 39.9334 + (Math.random() - 0.5) * 0.01,
          longitude: 32.8597 + (Math.random() - 0.5) * 0.01,
          accuracy: Math.random() * 50 + 5,
          timestamp: new Date(baseTime + i * 60000).toISOString(), // 1 minute intervals
          batteryLevel: Math.max(10, 100 - i * 10),
          source: 'gps'
        });
      }

      // Store batch locations
      const batchResponse = await request(app)
        .post('/api/locations/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ locations })
        .expect(201);

      // Property: Batch response should confirm all locations stored
      expect(batchResponse.body.count).toBe(batchSize);
      expect(batchResponse.body.locations).toHaveLength(batchSize);

      // Verify locations are retrievable
      const historyResponse = await request(app)
        .get('/api/locations/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Property: All batch locations should be retrievable
      expect(historyResponse.body.locations).toHaveLength(batchSize);
    });

    it('should maintain location accuracy and source information', async () => {
      const testCases = [
        { source: 'gps', accuracy: 5 },
        { source: 'network', accuracy: 50 },
        { source: 'passive', accuracy: 100 }
      ];

      for (const testCase of testCases) {
        const location = {
          latitude: 39.9334,
          longitude: 32.8597,
          accuracy: testCase.accuracy,
          timestamp: new Date().toISOString(),
          source: testCase.source
        };

        await request(app)
          .post('/api/locations')
          .set('Authorization', `Bearer ${authToken}`)
          .send(location)
          .expect(201);
      }

      // Retrieve and verify source-specific data
      const historyResponse = await request(app)
        .get('/api/locations/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const locations = historyResponse.body.locations;

      // Property: Source and accuracy should be preserved
      expect(locations).toHaveLength(testCases.length);
      
      locations.forEach((loc: any) => {
        expect(['gps', 'network', 'passive']).toContain(loc.source);
        expect(typeof loc.accuracy).toBe('number');
        expect(loc.accuracy).toBeGreaterThan(0);
      });
    });
  });

  /**
   * Property 2: Location Data Validation
   * Tests that invalid location data is properly rejected
   */
  describe('Property 2: Location Data Validation', () => {
    it('should reject invalid coordinates', async () => {
      const invalidLocations = [
        { latitude: 91, longitude: 0 }, // Invalid latitude
        { latitude: -91, longitude: 0 }, // Invalid latitude
        { latitude: 0, longitude: 181 }, // Invalid longitude
        { latitude: 0, longitude: -181 }, // Invalid longitude
      ];

      for (const location of invalidLocations) {
        await request(app)
          .post('/api/locations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...location,
            timestamp: new Date().toISOString()
          })
          .expect(400);
      }
    });

    it('should require essential fields', async () => {
      const incompleteLocations = [
        { longitude: 32.8597, timestamp: new Date().toISOString() }, // Missing latitude
        { latitude: 39.9334, timestamp: new Date().toISOString() }, // Missing longitude
        { latitude: 39.9334, longitude: 32.8597 }, // Missing timestamp
      ];

      for (const location of incompleteLocations) {
        await request(app)
          .post('/api/locations')
          .set('Authorization', `Bearer ${authToken}`)
          .send(location)
          .expect(400);
      }
    });
  });
});