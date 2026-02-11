import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:logger/logger.dart';

/// Mobile SQLite Database Service
/// 
/// Implements offline-first architecture with sync tables for GPS RAPOR system.
/// Optimized for Requirements 7.2 (Performance) and 9.1 (Offline-First Architecture).
/// 
/// Features:
/// - Local data persistence with SQLite
/// - Sync operation tracking for offline changes
/// - Optimized indexes for common query patterns
/// - Connection pooling via sqflite
/// - Full-text search support for messages
class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  static Database? _database;
  final Logger _logger = Logger();

  factory DatabaseService() {
    return _instance;
  }

  DatabaseService._internal();

  /// Get database instance (singleton pattern with connection pooling)
  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  /// Initialize database with optimized settings
  Future<Database> _initDatabase() async {
    final databasesPath = await getDatabasesPath();
    final path = join(databasesPath, 'gps_rapor.db');

    _logger.i('Initializing database at: $path');

    return await openDatabase(
      path,
      version: 1,
      onCreate: _onCreate,
      onConfigure: _onConfigure,
      onUpgrade: _onUpgrade,
    );
  }

  /// Configure database settings before opening
  Future<void> _onConfigure(Database db) async {
    // Enable foreign key constraints
    await db.execute('PRAGMA foreign_keys = ON');
    
    // Enable WAL mode for better concurrency
    await db.execute('PRAGMA journal_mode = WAL');
    
    // Optimize for performance
    await db.execute('PRAGMA synchronous = NORMAL');
    await db.execute('PRAGMA cache_size = 10000');
    await db.execute('PRAGMA temp_store = MEMORY');
    await db.execute('PRAGMA page_size = 4096');
    
    _logger.i('Database configured with performance optimizations');
  }

  /// Create database schema
  Future<void> _onCreate(Database db, int version) async {
    _logger.i('Creating database schema version $version');

    // Users table
    await db.execute('''
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        personnel_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT DEFAULT 'personnel',
        is_active INTEGER DEFAULT 1,
        last_seen TEXT,
        device_info TEXT,
        preferences TEXT,
        avatar TEXT,
        last_lat REAL,
        last_lng REAL,
        speed REAL,
        battery INTEGER,
        last_sync TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    ''');

    // Locations table with sync support
    await db.execute('''
      CREATE TABLE locations (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        accuracy REAL NOT NULL,
        altitude REAL,
        speed REAL,
        heading REAL,
        timestamp TEXT NOT NULL,
        battery_level INTEGER NOT NULL,
        source TEXT DEFAULT 'gps',
        is_manual INTEGER DEFAULT 0,
        metadata TEXT,
        sync_status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    ''');

    // Messages table with sync support
    await db.execute('''
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id INTEGER NOT NULL,
        recipient_ids TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        status TEXT DEFAULT 'pending',
        timestamp TEXT NOT NULL,
        edited_at TEXT,
        attachments TEXT,
        location_data TEXT,
        sync_status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE
      )
    ''');

    // Reports table
    await db.execute('''
      CREATE TABLE reports (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        criteria TEXT NOT NULL,
        status TEXT DEFAULT 'generating',
        file_url TEXT,
        file_size INTEGER,
        generated_by INTEGER NOT NULL,
        generated_at TEXT,
        expires_at TEXT,
        download_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (generated_by) REFERENCES users (id) ON DELETE CASCADE
      )
    ''');

    // Sync operations table - tracks all pending sync operations
    await db.execute('''
      CREATE TABLE sync_operations (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT,
        status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    ''');

    // Sync metadata table - tracks last sync times per table
    await db.execute('''
      CREATE TABLE sync_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT UNIQUE NOT NULL,
        last_sync_at TEXT,
        last_sync_version INTEGER DEFAULT 0,
        pending_operations INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    ''');

    // Conflict resolution table - stores conflicts for manual resolution
    await db.execute('''
      CREATE TABLE sync_conflicts (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        local_data TEXT NOT NULL,
        server_data TEXT NOT NULL,
        conflict_type TEXT NOT NULL,
        resolution_status TEXT DEFAULT 'pending',
        resolved_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    ''');

    // Create indexes for performance optimization
    await _createIndexes(db);

    // Initialize sync metadata for all tables
    await _initializeSyncMetadata(db);

    _logger.i('Database schema created successfully');
  }

  /// Create optimized indexes for common query patterns
  Future<void> _createIndexes(Database db) async {
    _logger.i('Creating database indexes');

    // Users table indexes
    await db.execute('CREATE INDEX idx_users_personnel_id ON users(personnel_id)');
    await db.execute('CREATE INDEX idx_users_role ON users(role)');
    await db.execute('CREATE INDEX idx_users_active ON users(is_active)');
    await db.execute('CREATE INDEX idx_users_last_seen ON users(last_seen)');

    // Locations table indexes
    await db.execute('CREATE INDEX idx_locations_user_timestamp ON locations(user_id, timestamp DESC)');
    await db.execute('CREATE INDEX idx_locations_timestamp ON locations(timestamp DESC)');
    await db.execute('CREATE INDEX idx_locations_sync_status ON locations(sync_status)');
    await db.execute('CREATE INDEX idx_locations_spatial ON locations(latitude, longitude)');
    await db.execute('CREATE INDEX idx_locations_user_sync ON locations(user_id, sync_status)');

    // Messages table indexes
    await db.execute('CREATE INDEX idx_messages_conversation ON messages(conversation_id, timestamp DESC)');
    await db.execute('CREATE INDEX idx_messages_sender ON messages(sender_id, timestamp DESC)');
    await db.execute('CREATE INDEX idx_messages_sync_status ON messages(sync_status)');
    await db.execute('CREATE INDEX idx_messages_status ON messages(status)');

    // Reports table indexes
    await db.execute('CREATE INDEX idx_reports_generated_by ON reports(generated_by)');
    await db.execute('CREATE INDEX idx_reports_status ON reports(status)');
    await db.execute('CREATE INDEX idx_reports_type ON reports(type)');
    await db.execute('CREATE INDEX idx_reports_created_at ON reports(created_at DESC)');

    // Sync operations table indexes
    await db.execute('CREATE INDEX idx_sync_ops_status ON sync_operations(status)');
    await db.execute('CREATE INDEX idx_sync_ops_table ON sync_operations(table_name)');
    await db.execute('CREATE INDEX idx_sync_ops_status_created ON sync_operations(status, created_at)');
    await db.execute('CREATE INDEX idx_sync_ops_record ON sync_operations(table_name, record_id)');

    // Sync conflicts table indexes
    await db.execute('CREATE INDEX idx_sync_conflicts_table ON sync_conflicts(table_name)');
    await db.execute('CREATE INDEX idx_sync_conflicts_status ON sync_conflicts(resolution_status)');
    await db.execute('CREATE INDEX idx_sync_conflicts_record ON sync_conflicts(table_name, record_id)');

    _logger.i('Database indexes created successfully');
  }

  /// Initialize sync metadata for all tables
  Future<void> _initializeSyncMetadata(Database db) async {
    final tables = ['users', 'locations', 'messages', 'reports'];
    
    for (final table in tables) {
      await db.insert('sync_metadata', {
        'table_name': table,
        'last_sync_at': null,
        'last_sync_version': 0,
        'pending_operations': 0,
      });
    }
    
    _logger.i('Sync metadata initialized');
  }

  /// Handle database upgrades
  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    _logger.i('Upgrading database from version $oldVersion to $newVersion');
    
    // Add migration logic here for future schema changes
    // Example:
    // if (oldVersion < 2) {
    //   await db.execute('ALTER TABLE users ADD COLUMN new_field TEXT');
    // }
  }

  /// Close database connection
  Future<void> close() async {
    final db = await database;
    await db.close();
    _database = null;
    _logger.i('Database connection closed');
  }

  /// Clear all data (for testing or logout)
  Future<void> clearAllData() async {
    final db = await database;
    
    await db.transaction((txn) async {
      await txn.delete('sync_conflicts');
      await txn.delete('sync_operations');
      await txn.delete('reports');
      await txn.delete('messages');
      await txn.delete('locations');
      await txn.delete('users');
      
      // Reset sync metadata
      await txn.update('sync_metadata', {
        'last_sync_at': null,
        'last_sync_version': 0,
        'pending_operations': 0,
      });
    });
    
    _logger.i('All data cleared from database');
  }

  /// Get database statistics
  Future<Map<String, dynamic>> getStatistics() async {
    final db = await database;
    
    final userCount = Sqflite.firstIntValue(
      await db.rawQuery('SELECT COUNT(*) FROM users')
    ) ?? 0;
    
    final locationCount = Sqflite.firstIntValue(
      await db.rawQuery('SELECT COUNT(*) FROM locations')
    ) ?? 0;
    
    final messageCount = Sqflite.firstIntValue(
      await db.rawQuery('SELECT COUNT(*) FROM messages')
    ) ?? 0;
    
    final pendingSyncOps = Sqflite.firstIntValue(
      await db.rawQuery("SELECT COUNT(*) FROM sync_operations WHERE status = 'pending'")
    ) ?? 0;
    
    final pendingConflicts = Sqflite.firstIntValue(
      await db.rawQuery("SELECT COUNT(*) FROM sync_conflicts WHERE resolution_status = 'pending'")
    ) ?? 0;
    
    return {
      'users': userCount,
      'locations': locationCount,
      'messages': messageCount,
      'pending_sync_operations': pendingSyncOps,
      'pending_conflicts': pendingConflicts,
    };
  }

  /// Vacuum database to reclaim space
  Future<void> vacuum() async {
    final db = await database;
    await db.execute('VACUUM');
    _logger.i('Database vacuumed');
  }

  /// Analyze database for query optimization
  Future<void> analyze() async {
    final db = await database;
    await db.execute('ANALYZE');
    _logger.i('Database analyzed');
  }
}
