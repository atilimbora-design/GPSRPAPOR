"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollback = exports.migrate = void 0;
const models_1 = require("@/models");
const logger_1 = require("@/utils/logger");
const migrate = async () => {
    try {
        (0, logger_1.logInfo)('Starting database migration...');
        await models_1.sequelize.authenticate();
        (0, logger_1.logInfo)('Database connection established successfully');
        await models_1.sequelize.sync({ alter: true });
        (0, logger_1.logInfo)('Database schema synchronized');
        await runCustomMigrations();
        (0, logger_1.logInfo)('Database migration completed successfully');
    }
    catch (error) {
        (0, logger_1.logError)(error, { operation: 'database_migration' });
        throw error;
    }
};
exports.migrate = migrate;
const runCustomMigrations = async () => {
    const queryInterface = models_1.sequelize.getQueryInterface();
    try {
        const tables = await queryInterface.showAllTables();
        if (tables.includes('locations')) {
            const indexes = await queryInterface.showIndex('locations');
            const indexNames = indexes.map(idx => idx.name);
            if (!indexNames.includes('locations_user_timestamp_idx')) {
                await queryInterface.addIndex('locations', ['userId', 'timestamp'], {
                    name: 'locations_user_timestamp_idx',
                });
                (0, logger_1.logInfo)('Added index: locations_user_timestamp_idx');
            }
            if (!indexNames.includes('locations_spatial_idx')) {
                await queryInterface.addIndex('locations', ['latitude', 'longitude'], {
                    name: 'locations_spatial_idx',
                });
                (0, logger_1.logInfo)('Added index: locations_spatial_idx');
            }
        }
        if (tables.includes('messages')) {
            try {
                await models_1.sequelize.query(`
          CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
            id,
            content,
            content='messages',
            content_rowid='id'
          );
        `);
                await models_1.sequelize.query(`
          CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages BEGIN
            INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
          END;
        `);
                await models_1.sequelize.query(`
          CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.id, old.content);
          END;
        `);
                await models_1.sequelize.query(`
          CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.id, old.content);
            INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
          END;
        `);
                (0, logger_1.logInfo)('Created FTS table and triggers for messages');
            }
            catch (error) {
                (0, logger_1.logError)(error, { operation: 'fts_setup' });
            }
        }
        await models_1.sequelize.query('PRAGMA journal_mode = WAL;');
        await models_1.sequelize.query('PRAGMA synchronous = NORMAL;');
        await models_1.sequelize.query('PRAGMA cache_size = 10000;');
        await models_1.sequelize.query('PRAGMA temp_store = MEMORY;');
        await models_1.sequelize.query('PRAGMA mmap_size = 268435456;');
        (0, logger_1.logInfo)('Applied SQLite optimizations');
    }
    catch (error) {
        (0, logger_1.logError)(error, { operation: 'custom_migrations' });
        throw error;
    }
};
const rollback = async () => {
    try {
        (0, logger_1.logInfo)('Starting database rollback...');
        await models_1.sequelize.drop();
        (0, logger_1.logInfo)('Database rollback completed');
    }
    catch (error) {
        (0, logger_1.logError)(error, { operation: 'database_rollback' });
        throw error;
    }
};
exports.rollback = rollback;
if (require.main === module) {
    (0, exports.migrate)()
        .then(() => {
        (0, logger_1.logInfo)('Migration script completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        (0, logger_1.logError)(error, { operation: 'migration_script' });
        process.exit(1);
    });
}
//# sourceMappingURL=migrate.js.map