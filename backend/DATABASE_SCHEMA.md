# GPS RAPOR Database Schema Documentation

## Overview

This document describes the optimized database schemas for the GPS RAPOR system redesign. The system uses SQLite for both server and mobile applications, implementing an offline-first architecture with comprehensive synchronization support.

**Requirements Addressed:**
- **Requirement 7.2**: Performance Optimization - Connection pooling, optimized indexes, query optimization
- **Requirement 9.1**: Offline-First Architecture - Local data storage, sync tables, conflict resolution

## Server Database Schema (SQLite)

### Connection Pooling Configuration

The server database uses Sequelize ORM with optimized connection pooling:

```javascript
pool: {
  max: 10,        // Maximum number of connections in pool
  min: 2,         // Minimum number of connections in pool
  acquire: 30000, // Maximum time (ms) to acquire connection
  idle: 10000,    // Maximum time (ms) connection can be idle
}
```

### SQLite Performance Optimizations

The following PRAGMA settings are applied for optimal performance:

```sql
PRAGMA journal_mode = WAL;          -- Write-Ahead Logging for better concurrency
PRAGMA synchronous = NORMAL;        -- Balance between safety and performance
PRAGMA cache_size = 10000;          -- 10000 pages (~40MB cache)
PRAGMA temp_store = MEMORY;         -- Store temp tables in memory
PRAGMA mmap_size = 268435456;       -- 256MB memory-mapped I/O
PRAGMA page_size = 4096;            -- Optimal page size for modern systems
PRAGMA auto_vacuum = INCREMENTAL;   -- Incremental auto-vacuum
PRAGMA busy_timeout = 5000;         -- 5 second timeout for locked database
```

### Tables

#### 1. Users Table

Stores user information for both personnel and administrators.

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  personnel_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'personnel',      -- 'personnel' | 'admin'
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  last_seen DATETIME,
  device_info JSON,                   -- Device metadata
  preferences JSON,                   -- User preferences
  avatar TEXT,                        -- Avatar file path
  last_lat REAL,                      -- Last known latitude
  last_lng REAL,                      -- Last known longitude
  speed REAL,                         -- Last known speed
  battery INTEGER,                    -- Last known battery level
  last_logout DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_users_personnel_id` - Unique index on personnel_id
- `idx_users_active_role` - Composite index on (is_active, role)
- `idx_users_last_seen` - Index on last_seen for monitoring queries

**Validations:**
- personnel_id: 1-10 characters, unique
- name: 2-100 characters
- email: Valid email format
- phone: Valid international phone format
- role: Enum ('personnel', 'admin')
- battery: 0-100
- latitude: -90 to 90
- longitude: -180 to 180

#### 2. Locations Table

Stores location tracking data with comprehensive metadata.

```sql
CREATE TABLE locations (
  id TEXT PRIMARY KEY,                -- UUID
  user_id INTEGER NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy REAL NOT NULL,
  altitude REAL,
  speed REAL,
  heading REAL,
  timestamp DATETIME NOT NULL,
  battery_level INTEGER NOT NULL,
  source TEXT DEFAULT 'gps',          -- 'gps' | 'network' | 'passive'
  is_manual BOOLEAN DEFAULT 0,
  metadata JSON,                      -- Additional metadata
  sync_status TEXT DEFAULT 'pending', -- 'pending' | 'synced' | 'failed'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Indexes:**
- `idx_locations_user_time` - Composite index on (user_id, timestamp DESC) - Primary query pattern
- `idx_locations_timestamp` - Index on timestamp for time-based queries
- `idx_locations_spatial` - Composite index on (latitude, longitude) for spatial queries
- `idx_locations_sync_status` - Index on sync_status for sync operations

**Validations:**
- latitude: -90 to 90
- longitude: -180 to 180
- accuracy: >= 0
- speed: >= 0
- heading: 0-360
- battery_level: 0-100
- source: Enum ('gps', 'network', 'passive')

#### 3. Messages Table

Stores messaging data with full-text search support.

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,                -- UUID
  conversation_id TEXT NOT NULL,
  sender_id INTEGER NOT NULL,
  recipient_ids TEXT NOT NULL,        -- JSON array
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',           -- 'text' | 'location' | 'image' | 'system'
  status TEXT DEFAULT 'pending',      -- 'pending' | 'sent' | 'delivered' | 'read'
  timestamp DATETIME NOT NULL,
  edited_at DATETIME,
  attachments TEXT,                   -- JSON array
  location_data TEXT,                 -- JSON object
  sync_status TEXT DEFAULT 'pending', -- 'pending' | 'synced' | 'failed'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);
```

**Full-Text Search:**
```sql
CREATE VIRTUAL TABLE messages_fts USING fts5(
  content,
  content='messages',
  content_rowid='rowid'
);
```

**Triggers for FTS Sync:**
- `messages_fts_insert` - Sync on insert
- `messages_fts_delete` - Sync on delete
- `messages_fts_update` - Sync on update

**Indexes:**
- `idx_messages_conversation_timestamp` - Composite index on (conversation_id, timestamp DESC)
- `idx_messages_sender_timestamp` - Composite index on (sender_id, timestamp DESC)
- `idx_messages_sync_status` - Index on sync_status

**Validations:**
- type: Enum ('text', 'location', 'image', 'system')
- status: Enum ('pending', 'sent', 'delivered', 'read')

#### 4. Reports Table

Stores generated PDF reports with metadata.

```sql
CREATE TABLE reports (
  id TEXT PRIMARY KEY,                -- UUID
  type TEXT NOT NULL,                 -- 'daily' | 'weekly' | 'custom'
  title TEXT NOT NULL,
  description TEXT,
  criteria TEXT NOT NULL,             -- JSON object
  status TEXT DEFAULT 'generating',   -- 'generating' | 'completed' | 'failed'
  file_url TEXT,
  file_size INTEGER,
  generated_by INTEGER NOT NULL,
  generated_at DATETIME,
  expires_at DATETIME,
  download_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (generated_by) REFERENCES users(id)
);
```

**Indexes:**
- `idx_reports_status_type` - Composite index on (status, type)
- `idx_reports_expires_at` - Index on expires_at for cleanup operations

**Validations:**
- type: Enum ('daily', 'weekly', 'custom')
- status: Enum ('generating', 'completed', 'failed')

#### 5. Sync Operations Table

Tracks synchronization operations for offline support.

```sql
CREATE TABLE sync_operations (
  id TEXT PRIMARY KEY,                -- UUID
  operation_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,            -- 'insert' | 'update' | 'delete'
  data TEXT,                          -- JSON data
  status TEXT DEFAULT 'pending',      -- 'pending' | 'completed' | 'failed'
  retry_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_sync_ops_status_created` - Composite index on (status, created_at)
- `idx_sync_ops_table` - Index on table_name

**Validations:**
- operation: Enum ('insert', 'update', 'delete')
- status: Enum ('pending', 'completed', 'failed')

## Mobile Database Schema (SQLite)

The mobile database schema mirrors the server schema with additional sync-specific tables for offline-first functionality.

### Additional Mobile Tables

#### 6. Sync Metadata Table

Tracks synchronization state for each table.

```sql
CREATE TABLE sync_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT UNIQUE NOT NULL,
  last_sync_at TEXT,
  last_sync_version INTEGER DEFAULT 0,
  pending_operations INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:**
- Track last successful sync time per table
- Maintain sync version for incremental updates
- Count pending operations for UI indicators

#### 7. Sync Conflicts Table

Stores synchronization conflicts for resolution.

```sql
CREATE TABLE sync_conflicts (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  local_data TEXT NOT NULL,           -- JSON
  server_data TEXT NOT NULL,          -- JSON
  conflict_type TEXT NOT NULL,
  resolution_status TEXT DEFAULT 'pending',
  resolved_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_sync_conflicts_table` - Index on table_name
- `idx_sync_conflicts_status` - Index on resolution_status
- `idx_sync_conflicts_record` - Composite index on (table_name, record_id)

**Purpose:**
- Store conflicts detected during sync
- Enable manual conflict resolution
- Track resolution history

### Mobile Performance Optimizations

```sql
PRAGMA foreign_keys = ON;           -- Enable foreign key constraints
PRAGMA journal_mode = WAL;          -- Write-Ahead Logging
PRAGMA synchronous = NORMAL;        -- Balance safety and performance
PRAGMA cache_size = 10000;          -- 10000 pages cache
PRAGMA temp_store = MEMORY;         -- Memory-based temp storage
PRAGMA page_size = 4096;            -- Optimal page size
```

## Query Optimization Patterns

### 1. Location History Queries

**Most Common Pattern:**
```sql
SELECT * FROM locations 
WHERE user_id = ? AND timestamp >= ? AND timestamp <= ?
ORDER BY timestamp DESC
LIMIT 1000;
```

**Optimized by:** `idx_locations_user_time` composite index

### 2. Message Conversation Queries

**Most Common Pattern:**
```sql
SELECT * FROM messages 
WHERE conversation_id = ?
ORDER BY timestamp DESC
LIMIT 50;
```

**Optimized by:** `idx_messages_conversation_timestamp` composite index

### 3. Pending Sync Operations

**Most Common Pattern:**
```sql
SELECT * FROM sync_operations 
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 100;
```

**Optimized by:** `idx_sync_ops_status_created` composite index

### 4. Full-Text Message Search

**Search Pattern:**
```sql
SELECT messages.* FROM messages
JOIN messages_fts ON messages.rowid = messages_fts.rowid
WHERE messages_fts MATCH ?
ORDER BY messages.timestamp DESC;
```

**Optimized by:** FTS5 virtual table with automatic indexing

## Data Relationships

```
users (1) ----< (N) locations
users (1) ----< (N) messages (as sender)
users (1) ----< (N) reports (as generator)
```

## Synchronization Strategy

### Last-Writer-Wins Conflict Resolution

When conflicts occur during sync:
1. Compare timestamps of local and server versions
2. Most recent timestamp wins
3. Log conflict details for audit
4. Notify administrators of conflicts

### Incremental Sync Process

1. **Client requests sync:**
   - Send last_sync_version for each table
   - Include pending operations from sync_operations table

2. **Server processes sync:**
   - Return delta updates since last_sync_version
   - Apply client's pending operations
   - Detect and resolve conflicts

3. **Client applies updates:**
   - Apply server delta updates
   - Update sync_metadata with new version
   - Clear completed sync_operations

## Maintenance Operations

### Automatic Cleanup

**Location Data:**
- Retention: 90 days
- Cleanup query: `DELETE FROM locations WHERE timestamp < date('now', '-90 days')`

**Message Data:**
- Retention: 90 days
- Cleanup query: `DELETE FROM messages WHERE timestamp < date('now', '-90 days')`

**Report Files:**
- Retention: 30 days
- Cleanup query: `DELETE FROM reports WHERE expires_at < datetime('now')`

### Database Optimization

**Regular Maintenance:**
```sql
VACUUM;           -- Reclaim unused space
ANALYZE;          -- Update query planner statistics
PRAGMA optimize;  -- Optimize indexes
```

**Recommended Schedule:**
- ANALYZE: Daily
- VACUUM: Weekly
- PRAGMA optimize: Daily

## Performance Metrics

### Expected Query Performance

- Location history query (1 user, 1 day): < 50ms
- Message conversation query (50 messages): < 30ms
- Full-text message search: < 100ms
- Pending sync operations query: < 20ms
- User authentication query: < 10ms

### Connection Pool Metrics

- Average connection acquisition time: < 10ms
- Maximum concurrent connections: 10
- Connection idle timeout: 10 seconds
- Connection acquire timeout: 30 seconds

## Security Considerations

### Data Encryption

- Sensitive data encrypted at rest using AES-256
- Password hashes use bcrypt with salt
- JWT tokens for authentication
- TLS 1.3 for data in transit

### Access Control

- Row-level security through user_id foreign keys
- Role-based access control (RBAC) at application layer
- Prepared statements prevent SQL injection
- Input validation on all user data

## Backup and Recovery

### Backup Strategy

**Server Database:**
- Full backup: Daily at 2:00 AM
- Incremental backup: Every 6 hours
- WAL checkpoint before backup
- Retention: 30 days

**Mobile Database:**
- Automatic sync to server acts as backup
- Local backup before major operations
- Export functionality for user data

### Recovery Procedures

1. **Server Recovery:**
   - Restore from latest full backup
   - Apply incremental backups
   - Verify data integrity
   - Resume normal operations

2. **Mobile Recovery:**
   - Clear local database
   - Trigger full sync from server
   - Verify sync completion
   - Resume normal operations

## Monitoring and Alerting

### Key Metrics to Monitor

- Database size and growth rate
- Query execution times
- Connection pool utilization
- Sync operation queue depth
- Conflict resolution rate
- Failed sync operations

### Alert Thresholds

- Database size > 80% of available space
- Average query time > 200ms
- Connection pool exhaustion
- Pending sync operations > 1000
- Failed sync operations > 100

## Conclusion

This optimized database schema provides:
- ✅ High-performance queries through strategic indexing
- ✅ Robust offline-first architecture with sync support
- ✅ Efficient connection pooling for concurrent operations
- ✅ Full-text search capabilities for messages
- ✅ Comprehensive conflict resolution mechanisms
- ✅ Scalable design for 23+ concurrent users

The schema fully satisfies Requirements 7.2 (Performance Optimization) and 9.1 (Offline-First Architecture).
