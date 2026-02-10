import { Request, Response } from 'express';
import { Location, User } from '@/models';
import { logInfo, logError } from '@/utils/logger';
import { Op } from 'sequelize';

/**
 * Location Controller
 * Handles location tracking, storage, and retrieval
 */

// Store reference to Socket.IO instance for broadcasting
let io: any = null;

export const setSocketIO = (socketInstance: any) => {
  io = socketInstance;
};

export class LocationController {
  /**
   * Store location update from mobile device
   */
  static async storeLocation(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const {
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        heading,
        timestamp,
        batteryLevel,
        source
      } = req.body;

      // Validate required fields
      if (!latitude || !longitude || !timestamp) {
        return res.status(400).json({ 
          error: 'Missing required fields: latitude, longitude, timestamp' 
        });
      }

      // Validate coordinate ranges
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ 
          error: 'Invalid coordinates' 
        });
      }

      // Create location record
      const locationData: any = {
        userId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : 0,
        timestamp: new Date(timestamp),
        batteryLevel: batteryLevel ? parseFloat(batteryLevel) : 0,
        source: source || 'gps',
        isManual: false,
        syncStatus: 'synced' as const
      };

      if (altitude) locationData.altitude = parseFloat(altitude);
      if (speed) locationData.speed = parseFloat(speed);
      if (heading) locationData.heading = parseFloat(heading);

      const location = await Location.create(locationData);

      // Update user's last seen
      await User.update(
        { lastSeen: new Date() },
        { where: { id: userId } }
      );

      // Broadcast location update via WebSocket
      if (io) {
        io.emit('locationUpdate', {
          userId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
          batteryLevel: location.batteryLevel,
          source: location.source
        });
      }

      logInfo(`Location stored for user ${userId}: ${latitude}, ${longitude}`);

      return res.status(201).json({
        success: true,
        location: {
          id: location.id,
          timestamp: location.timestamp
        }
      });
    } catch (error) {
      logError(error as Error, { operation: 'store_location' });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Store multiple location updates (batch)
   */
  static async storeBatchLocations(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { locations } = req.body;
      if (!Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({ error: 'Invalid locations array' });
      }

      // Validate and prepare location data
      const locationData = locations.map(loc => {
        if (!loc.latitude || !loc.longitude || !loc.timestamp) {
          throw new Error('Missing required fields in location data');
        }

        const locationItem: any = {
          userId,
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
          accuracy: loc.accuracy ? parseFloat(loc.accuracy) : 0,
          timestamp: new Date(loc.timestamp),
          batteryLevel: loc.batteryLevel ? parseFloat(loc.batteryLevel) : 0,
          source: loc.source || 'gps',
          isManual: false,
          syncStatus: 'synced' as const
        };

        if (loc.altitude) locationItem.altitude = parseFloat(loc.altitude);
        if (loc.speed) locationItem.speed = parseFloat(loc.speed);
        if (loc.heading) locationItem.heading = parseFloat(loc.heading);

        return locationItem;
      });

      // Bulk insert locations
      const createdLocations = await Location.bulkCreate(locationData);

      // Update user's last seen
      await User.update(
        { lastSeen: new Date() },
        { where: { id: userId } }
      );

      logInfo(`Batch locations stored for user ${userId}: ${locations.length} locations`);

      return res.status(201).json({
        success: true,
        count: createdLocations.length,
        locations: createdLocations.map(loc => ({
          id: loc.id,
          timestamp: loc.timestamp
        }))
      });
    } catch (error) {
      logError(error as Error, { operation: 'store_batch_locations' });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get location history for a user
   */
  static async getLocationHistory(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      const targetUserId = req.params.userId || userId;

      // Check if user can access this data
      if (req.user?.role !== 'admin' && targetUserId !== userId?.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { 
        startDate, 
        endDate, 
        limit = 100, 
        offset = 0,
        source 
      } = req.query;

      // Build where clause
      const whereClause: any = { userId: targetUserId };

      if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate) whereClause.timestamp[Op.gte] = new Date(startDate as string);
        if (endDate) whereClause.timestamp[Op.lte] = new Date(endDate as string);
      }

      if (source) {
        whereClause.source = source;
      }

      const locations = await Location.findAll({
        where: whereClause,
        order: [['timestamp', 'DESC']],
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        include: [{
          model: User,
          attributes: ['id', 'personnelId', 'name']
        }]
      });

      return res.json({
        success: true,
        locations: locations.map(loc => ({
          id: loc.id,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          altitude: loc.altitude,
          speed: loc.speed,
          heading: loc.heading,
          timestamp: loc.timestamp,
          batteryLevel: loc.batteryLevel,
          source: loc.source,
          user: (loc as any).User ? {
            id: (loc as any).User.id,
            personnelId: (loc as any).User.personnelId,
            name: (loc as any).User.name
          } : null
        }))
      });
    } catch (error) {
      logError(error as Error, { operation: 'get_location_history' });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get current locations of all active users (admin only)
   */
  static async getCurrentLocations(req: Request, res: Response): Promise<Response> {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Get latest location for each active user
      const locations = await Location.findAll({
        attributes: [
          'userId',
          'latitude',
          'longitude',
          'accuracy',
          'timestamp',
          'batteryLevel',
          'source'
        ],
        include: [{
          model: User,
          attributes: ['id', 'personnelId', 'name', 'isActive'],
          where: { isActive: true }
        }],
        where: {
          timestamp: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        order: [['timestamp', 'DESC']]
      });

      // Group by user and get latest location
      const userLocations = new Map();
      locations.forEach(loc => {
        if (!userLocations.has(loc.userId)) {
          userLocations.set(loc.userId, {
            userId: loc.userId,
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            timestamp: loc.timestamp,
            batteryLevel: loc.batteryLevel,
            source: loc.source,
            user: {
              id: (loc as any).User.id,
              personnelId: (loc as any).User.personnelId,
              name: (loc as any).User.name
            }
          });
        }
      });

      return res.json({
        success: true,
        locations: Array.from(userLocations.values())
      });
    } catch (error) {
      logError(error as Error, { operation: 'get_current_locations' });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get location statistics for a user
   */
  static async getLocationStats(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      const targetUserId = req.params.userId || userId;

      // Check if user can access this data
      if (req.user?.role !== 'admin' && targetUserId !== userId?.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get location count and accuracy stats
      const stats = await Location.findAll({
        where: {
          userId: targetUserId,
          timestamp: {
            [Op.between]: [start, end]
          }
        },
        attributes: [
          [Location.sequelize!.fn('COUNT', Location.sequelize!.col('id')), 'totalLocations'],
          [Location.sequelize!.fn('AVG', Location.sequelize!.col('accuracy')), 'avgAccuracy'],
          [Location.sequelize!.fn('MIN', Location.sequelize!.col('timestamp')), 'firstLocation'],
          [Location.sequelize!.fn('MAX', Location.sequelize!.col('timestamp')), 'lastLocation']
        ],
        raw: true
      });

      // Get source distribution
      const sourceStats = await Location.findAll({
        where: {
          userId: targetUserId,
          timestamp: {
            [Op.between]: [start, end]
          }
        },
        attributes: [
          'source',
          [Location.sequelize!.fn('COUNT', Location.sequelize!.col('id')), 'count']
        ],
        group: ['source'],
        raw: true
      });

      return res.json({
        success: true,
        stats: {
          totalLocations: parseInt((stats[0] as any)?.totalLocations as string) || 0,
          avgAccuracy: parseFloat((stats[0] as any)?.avgAccuracy as string) || 0,
          firstLocation: (stats[0] as any)?.firstLocation || null,
          lastLocation: (stats[0] as any)?.lastLocation || null,
          sourceDistribution: sourceStats.reduce((acc: any, stat: any) => {
            acc[stat.source] = parseInt(stat.count);
            return acc;
          }, {})
        }
      });
    } catch (error) {
      logError(error as Error, { operation: 'get_location_stats' });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Compress location history by reducing frequency of old data
   */
  static async compressLocationHistory(req: Request, res: Response): Promise<Response> {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { days = 30, compressionRatio = 0.5 } = req.query;
      const cutoffDate = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);

      // Get old locations that need compression
      const oldLocations = await Location.findAll({
        where: {
          timestamp: {
            [Op.lt]: cutoffDate
          }
        },
        order: [['userId', 'ASC'], ['timestamp', 'ASC']]
      });

      if (oldLocations.length === 0) {
        return res.json({
          success: true,
          message: 'No locations to compress',
          compressed: 0
        });
      }

      // Group by user and compress
      const userGroups = new Map();
      oldLocations.forEach(loc => {
        if (!userGroups.has(loc.userId)) {
          userGroups.set(loc.userId, []);
        }
        userGroups.get(loc.userId).push(loc);
      });

      let totalCompressed = 0;
      const ratio = parseFloat(compressionRatio as string);

      for (const [userId, locations] of userGroups) {
        const locationsToKeep = Math.ceil(locations.length * ratio);
        const step = Math.floor(locations.length / locationsToKeep);
        
        // Keep every nth location
        const locationsToDelete = [];
        for (let i = 0; i < locations.length; i++) {
          if (i % step !== 0) {
            locationsToDelete.push(locations[i].id);
          }
        }

        if (locationsToDelete.length > 0) {
          await Location.destroy({
            where: {
              id: {
                [Op.in]: locationsToDelete
              }
            }
          });
          totalCompressed += locationsToDelete.length;
        }
      }

      logInfo(`Compressed ${totalCompressed} location records older than ${days} days`);

      return res.json({
        success: true,
        compressed: totalCompressed,
        cutoffDate,
        compressionRatio: ratio
      });
    } catch (error) {
      logError(error as Error, { operation: 'compress_location_history' });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete old location data (cleanup)
   */
  static async cleanupOldLocations(req: Request, res: Response): Promise<Response> {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { days = 90 } = req.query;
      const cutoffDate = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);

      const deletedCount = await Location.destroy({
        where: {
          timestamp: {
            [Op.lt]: cutoffDate
          }
        }
      });

      logInfo(`Cleaned up ${deletedCount} old location records older than ${days} days`);

      return res.json({
        success: true,
        deletedCount,
        cutoffDate
      });
    } catch (error) {
      logError(error as Error, { operation: 'cleanup_locations' });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}