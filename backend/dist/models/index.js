"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncOperation = exports.Report = exports.Message = exports.Location = exports.User = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const config_1 = require("@/config");
const path_1 = __importDefault(require("path"));
const sequelize = new sequelize_1.Sequelize({
    dialect: 'sqlite',
    storage: process.env.NODE_ENV === 'test' ? ':memory:' : path_1.default.join(config_1.paths.data, 'database.sqlite'),
    logging: false,
    pool: {
        max: config_1.databaseConfig.pool.max,
        min: config_1.databaseConfig.pool.min,
        acquire: config_1.databaseConfig.pool.acquire,
        idle: config_1.databaseConfig.pool.idle,
    },
    define: {
        timestamps: true,
        underscored: false,
        freezeTableName: true,
    },
    dialectOptions: process.env.NODE_ENV === 'test' ? {} : {
        mode: 'WAL',
    },
});
exports.sequelize = sequelize;
class User extends sequelize_1.Model {
}
exports.User = User;
User.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    personnelId: {
        type: sequelize_1.DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 10],
        },
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 100],
        },
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        validate: {
            isEmail: true,
        },
    },
    phone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        validate: {
            is: /^[\+]?[1-9][\d]{0,15}$/,
        },
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('personnel', 'admin'),
        allowNull: false,
        defaultValue: 'personnel',
    },
    passwordHash: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    lastSeen: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    deviceInfo: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    preferences: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    avatar: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    lastLat: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: true,
        validate: {
            min: -90,
            max: 90,
        },
    },
    lastLng: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: true,
        validate: {
            min: -180,
            max: 180,
        },
    },
    speed: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: true,
        validate: {
            min: 0,
        },
    },
    battery: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 0,
            max: 100,
        },
    },
    lastLogout: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
}, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    indexes: [
        {
            unique: true,
            fields: ['personnelId'],
        },
        {
            fields: ['role'],
        },
        {
            fields: ['isActive'],
        },
        {
            fields: ['lastSeen'],
        },
    ],
});
class Location extends sequelize_1.Model {
}
exports.Location = Location;
Location.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        primaryKey: true,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
    },
    latitude: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
        validate: {
            min: -90,
            max: 90,
        },
    },
    longitude: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
        validate: {
            min: -180,
            max: 180,
        },
    },
    accuracy: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: false,
        validate: {
            min: 0,
        },
    },
    altitude: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: true,
    },
    speed: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: true,
        validate: {
            min: 0,
        },
    },
    heading: {
        type: sequelize_1.DataTypes.FLOAT,
        allowNull: true,
        validate: {
            min: 0,
            max: 360,
        },
    },
    timestamp: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    batteryLevel: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 0,
            max: 100,
        },
    },
    source: {
        type: sequelize_1.DataTypes.ENUM('gps', 'network', 'passive'),
        allowNull: false,
        defaultValue: 'gps',
    },
    isManual: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    metadata: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    syncStatus: {
        type: sequelize_1.DataTypes.ENUM('pending', 'synced', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
}, {
    sequelize,
    modelName: 'Location',
    tableName: 'locations',
    indexes: [
        {
            fields: ['userId', 'timestamp'],
        },
        {
            fields: ['timestamp'],
        },
        {
            fields: ['syncStatus'],
        },
        {
            fields: ['latitude', 'longitude'],
        },
    ],
});
class Message extends sequelize_1.Model {
}
exports.Message = Message;
Message.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        primaryKey: true,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
    },
    conversationId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    senderId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
    },
    recipientIds: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    content: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('text', 'location', 'image', 'system'),
        allowNull: false,
        defaultValue: 'text',
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'sent', 'delivered', 'read'),
        allowNull: false,
        defaultValue: 'pending',
    },
    timestamp: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    editedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    attachments: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    locationData: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    syncStatus: {
        type: sequelize_1.DataTypes.ENUM('pending', 'synced', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
}, {
    sequelize,
    modelName: 'Message',
    tableName: 'messages',
    indexes: [
        {
            fields: ['conversationId', 'timestamp'],
        },
        {
            fields: ['senderId', 'timestamp'],
        },
        {
            fields: ['syncStatus'],
        },
    ],
});
class Report extends sequelize_1.Model {
}
exports.Report = Report;
Report.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        primaryKey: true,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('daily', 'weekly', 'custom'),
        allowNull: false,
    },
    title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    criteria: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('generating', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'generating',
    },
    fileUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    fileSize: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    generatedBy: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
    },
    generatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    expiresAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    downloadCount: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
}, {
    sequelize,
    modelName: 'Report',
    tableName: 'reports',
    indexes: [
        {
            fields: ['generatedBy'],
        },
        {
            fields: ['status'],
        },
        {
            fields: ['type'],
        },
        {
            fields: ['createdAt'],
        },
    ],
});
class SyncOperation extends sequelize_1.Model {
}
exports.SyncOperation = SyncOperation;
SyncOperation.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        primaryKey: true,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
    },
    operationType: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    tableName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    recordId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    operation: {
        type: sequelize_1.DataTypes.ENUM('insert', 'update', 'delete'),
        allowNull: false,
    },
    data: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
    },
    retryCount: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
}, {
    sequelize,
    modelName: 'SyncOperation',
    tableName: 'sync_operations',
    indexes: [
        {
            fields: ['status'],
        },
        {
            fields: ['tableName'],
        },
        {
            fields: ['createdAt'],
        },
    ],
});
User.hasMany(Location, { foreignKey: 'userId', as: 'locations' });
Location.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
User.hasMany(Report, { foreignKey: 'generatedBy', as: 'reports' });
Report.belongsTo(User, { foreignKey: 'generatedBy', as: 'generator' });
exports.default = sequelize;
//# sourceMappingURL=index.js.map