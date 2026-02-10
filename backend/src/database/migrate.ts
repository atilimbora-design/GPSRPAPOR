import { sequelize } from '@/models';
import { logInfo, logError } from '@/utils/logger';

/**
 * Database migration script
 * Handles database schema creation and updates
 * 
 * Optimizations implemented:
 * - WAL (Write-Ahead Logging) mode for better concurrency
 * - Connection pooling configured in models/index.ts
 * - Optimized indexes for common query patterns
 * - Full-text search for messages
 * - SQLite performance tuning
 */
export const migrate = async (): Promise<void> => {
  try {
    logInfo('Starting database migration...');

    // Test database connection
    await sequelize.authenticate();
    logInfo('Database connection established successfully');

    // Sync all models (create tables if they don't exist)
    await sequelize.sync({ alter: true });
    logInfo('Database schema synchronized');

    // Run any custom migrations here
    await runCustomMigrations();

    logInfo('Database migration completed successfully');
  } catch (error) {
    logError(error as Error, { operation: 'database_migration' });
    throw error;
  }
};

/**
 * Run custom migrations for schema updates
 * Implements optimizations for Requirements 7.2 (Performance) and 9.1 (Offline-First)
 */
const runCustomMigrations = async (): Promise<void> => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    // Check if we need to add any new columns or indexes
    const tables = await queryInterface.showAllTables();
    
    // Migration 1: Add performance indexes for locations table
    if (tables.includes('locations')) {
      const indexes = await queryInterface.showIndex('locations') as Array<{ name: string }>;
      const indexNames = indexes.map((idx) => idx.name);
      
      // Composite index for user-based time-series queries (most common query pattern)
      if (!indexNames.includes('locations_user_timestamp_idx')) {
        await queryInterface.addIndex('locations', ['userId', 'timestamp'], {
          name: 'locations_user_timestamp_idx',
        });
        logInfo('Added index: locations_user_timestamp_idx');
      }
      
      // Spatial index for location-based queries
      if (!indexNames.includes('locations_spatial_idx')) {
        await queryInterface.addIndex('locations', ['latitude', 'longitude'], {
          name: 'locations_spatial_idx',
        });
        logInfo('Added index: locations_spatial_idx');
      }
      
      // Index for sync operations
      if (!indexNames.includes('locations_sync_status_idx')) {
        await queryInterface.addIndex('locations', ['syncStatus'], {
          name: 'locations_sync_status_idx',
        });
        logInfo('Added index: locations_sync_status_idx');
      }
      
      // Index for timestamp-based queries (for reports and analytics)
      if (!indexNames.includes('locations_timestamp_idx')) {
        await queryInterface.addIndex('locations', ['timestamp'], {
          name: 'locations_timestamp_idx',
        });
        logInfo('Added index: locations_timestamp_idx');
      }
    }

    // Migration 2: Add performance indexes for messages table
    if (tables.includes('messages')) {
      const indexes = await queryInterface.showIndex('messages') as Array<{ name: string }>;
      const indexNames = indexes.map((idx) => idx.name);
      
      // Composite index for conversation queries
      if (!indexNames.includes('messages_conversation_timestamp_idx')) {
        await queryInterface.addIndex('messages', ['conversationId', 'timestamp'], {
          name: 'messages_conversation_timestamp_idx',
        });
        logInfo('Added index: messages_conversation_timestamp_idx');
      }
      
      // Index for sender-based queries
      if (!indexNames.includes('messages_sender_timestamp_idx')) {
        await queryInterface.addIndex('messages', ['senderId', 'timestamp'], {
          name: 'messages_sender_timestamp_idx',
        });
        logInfo('Added index: messages_sender_timestamp_idx');
      }
      
      // Index for sync operations
      if (!indexNames.includes('messages_sync_status_idx')) {
        await queryInterface.addIndex('messages', ['syncStatus'], {
          name: 'messages_sync_status_idx',
        });
        logInfo('Added index: messages_sync_status_idx');
      }
    }

    // Migration 3: Add indexes for sync_operations table
    if (tables.includes('sync_operations')) {
      const indexes = await queryInterface.showIndex('sync_operations') as Array<{ name: string }>;
      const indexNames = indexes.map((idx) => idx.name);
      
      // Composite index for pending operations
      if (!indexNames.includes('sync_operations_status_created_idx')) {
        await queryInterface.addIndex('sync_operations', ['status', 'createdAt'], {
          name: 'sync_operations_status_created_idx',
        });
        logInfo('Added index: sync_operations_status_created_idx');
      }
      
      // Index for table-based queries
      if (!indexNames.includes('sync_operations_table_idx')) {
        await queryInterface.addIndex('sync_operations', ['tableName'], {
          name: 'sync_operations_table_idx',
        });
        logInfo('Added index: sync_operations_table_idx');
      }
    }

    // Migration 4: Add indexes for users table
    if (tables.includes('users')) {
      const indexes = await queryInterface.showIndex('users') as Array<{ name: string }>;
      const indexNames = indexes.map((idx) => idx.name);
      
      // Index for active users queries
      if (!indexNames.includes('users_active_role_idx')) {
        await queryInterface.addIndex('users', ['isActive', 'role'], {
          name: 'users_active_role_idx',
        });
        logInfo('Added index: users_active_role_idx');
      }
      
      // Index for last seen queries (for monitoring)
      if (!indexNames.includes('users_last_seen_idx')) {
        await queryInterface.addIndex('users', ['lastSeen'], {
          name: 'users_last_seen_idx',
        });
        logInfo('Added index: users_last_seen_idx');
      }
    }

    // Migration 5: Add indexes for reports table
    if (tables.includes('reports')) {
      const indexes = await queryInterface.showIndex('reports') as Array<{ name: string }>;
      const indexNames = indexes.map((idx) => idx.name);
      
      // Composite index for report queries
      if (!indexNames.includes('reports_status_type_idx')) {
        await queryInterface.addIndex('reports', ['status', 'type'], {
          name: 'reports_status_type_idx',
        });
        logInfo('Added index: reports_status_type_idx');
      }
      
      // Index for expiration cleanup
      if (!indexNames.includes('reports_expires_at_idx')) {
        await queryInterface.addIndex('reports', ['expiresAt'], {
          name: 'reports_expires_at_idx',
        });
        logInfo('Added index: reports_expires_at_idx');
      }
    }

    // Migration 6: Set up full-text search for messages (SQLite FTS5)
    if (tables.includes('messages')) {
      try {
        // Check if FTS table already exists
        const ftsExists = tables.includes('messages_fts');
        
        if (!ftsExists) {
          // Create FTS5 virtual table for full-text search
          await sequelize.query(`
            CREATE VIRTUAL TABLE messages_fts USING fts5(
              content,
              content='messages',
              content_rowid='rowid'
            );
          `);
          
          // Populate FTS table with existing data
          await sequelize.query(`
            INSERT INTO messages_fts(rowid, content)
            SELECT rowid, content FROM messages;
          `);
          
          logInfo('Created FTS5 table for messages');
        }
        
        // Create triggers to keep FTS table in sync
        await sequelize.query(`
          CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages BEGIN
            INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
          END;
        `);
        
        await sequelize.query(`
          CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.rowid, old.content);
          END;
        `);
        
        await sequelize.query(`
          CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.rowid, old.content);
            INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
          END;
        `);
        
        logInfo('Created FTS triggers for messages');
      } catch (error) {
        logError(error as Error, { operation: 'fts_setup' });
      }
    }

    // Migration 7: Apply SQLite performance optimizations
    // These settings optimize for the GPS RAPOR use case with concurrent reads/writes
    await sequelize.query('PRAGMA journal_mode = WAL;'); // Write-Ahead Logging for better concurrency
    await sequelize.query('PRAGMA synchronous = NORMAL;'); // Balance between safety and performance
    await sequelize.query('PRAGMA cache_size = 10000;'); // 10000 pages (~40MB cache)
    await sequelize.query('PRAGMA temp_store = MEMORY;'); // Store temp tables in memory
    await sequelize.query('PRAGMA mmap_size = 268435456;'); // 256MB memory-mapped I/O
    await sequelize.query('PRAGMA page_size = 4096;'); // Optimal page size for modern systems
    await sequelize.query('PRAGMA auto_vacuum = INCREMENTAL;'); // Incremental auto-vacuum
    await sequelize.query('PRAGMA busy_timeout = 5000;'); // 5 second timeout for locked database
    
    logInfo('Applied SQLite performance optimizations');

  } catch (error) {
    logError(error as Error, { operation: 'custom_migrations' });
    throw error;
  }
};

/**
 * Rollback database to previous state (if needed)
 */
export const rollback = async (): Promise<void> => {
  try {
    logInfo('Starting database rollback...');
    
    // Drop all tables (use with caution!)
    await sequelize.drop();
    
    logInfo('Database rollback completed');
  } catch (error) {
    logError(error as Error, { operation: 'database_rollback' });
    throw error;
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  migrate()
    .then(() => {
      logInfo('Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logError(error as Error, { operation: 'migration_script' });
      process.exit(1);
    });
}