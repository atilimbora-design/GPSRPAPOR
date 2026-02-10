import { Sequelize, DataTypes, Model, Optional } from 'sequelize';
import { databaseConfig, paths } from '@/config';
import path from 'path';

// Database connection with optimized settings
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.NODE_ENV === 'test' ? ':memory:' : path.join(paths.data, 'database.sqlite'),
  logging: false,
  pool: {
    max: databaseConfig.pool.max,
    min: databaseConfig.pool.min,
    acquire: databaseConfig.pool.acquire,
    idle: databaseConfig.pool.idle,
  },
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true,
  },
  // SQLite optimizations
  dialectOptions: process.env.NODE_ENV === 'test' ? {} : {
    // Enable WAL mode for better concurrency (not available in memory)
    mode: 'WAL',
  },
});

// User Model
interface UserAttributes {
  id: number;
  personnelId: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'personnel' | 'admin';
  passwordHash: string;
  isActive: boolean;
  lastSeen?: Date;
  deviceInfo?: object;
  preferences?: object;
  avatar?: string;
  lastLat?: number;
  lastLng?: number;
  speed?: number;
  battery?: number;
  lastLogout?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public personnelId!: string;
  public name!: string;
  public email?: string;
  public phone?: string;
  public role!: 'personnel' | 'admin';
  public passwordHash!: string;
  public isActive!: boolean;
  public lastSeen?: Date;
  public deviceInfo?: object;
  public preferences?: object;
  public avatar?: string;
  public lastLat?: number;
  public lastLng?: number;
  public speed?: number;
  public battery?: number;
  public lastLogout?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  personnelId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 10],
    },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100],
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      is: /^[\+]?[1-9][\d]{0,15}$/,
    },
  },
  role: {
    type: DataTypes.ENUM('personnel', 'admin'),
    allowNull: false,
    defaultValue: 'personnel',
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  lastSeen: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deviceInfo: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  preferences: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastLat: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: -90,
      max: 90,
    },
  },
  lastLng: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: -180,
      max: 180,
    },
  },
  speed: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0,
    },
  },
  battery: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100,
    },
  },
  lastLogout: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
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

// Location Model
interface LocationAttributes {
  id: string;
  userId: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
  batteryLevel: number;
  source: 'gps' | 'network' | 'passive';
  isManual: boolean;
  metadata?: object;
  syncStatus: 'pending' | 'synced' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

interface LocationCreationAttributes extends Optional<LocationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Location extends Model<LocationAttributes, LocationCreationAttributes> implements LocationAttributes {
  public id!: string;
  public userId!: number;
  public latitude!: number;
  public longitude!: number;
  public accuracy!: number;
  public altitude?: number;
  public speed?: number;
  public heading?: number;
  public timestamp!: Date;
  public batteryLevel!: number;
  public source!: 'gps' | 'network' | 'passive';
  public isManual!: boolean;
  public metadata?: object;
  public syncStatus!: 'pending' | 'synced' | 'failed';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Location.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: -90,
      max: 90,
    },
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: -180,
      max: 180,
    },
  },
  accuracy: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  altitude: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  speed: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0,
    },
  },
  heading: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0,
      max: 360,
    },
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  batteryLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 100,
    },
  },
  source: {
    type: DataTypes.ENUM('gps', 'network', 'passive'),
    allowNull: false,
    defaultValue: 'gps',
  },
  isManual: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  syncStatus: {
    type: DataTypes.ENUM('pending', 'synced', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
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

// Message Model
interface MessageAttributes {
  id: string;
  conversationId: string;
  senderId: number;
  recipientIds: string;
  content: string;
  type: 'text' | 'location' | 'image' | 'system';
  status: 'pending' | 'sent' | 'delivered' | 'read';
  timestamp: Date;
  editedAt?: Date;
  attachments?: string;
  locationData?: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

interface MessageCreationAttributes extends Optional<MessageAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  public id!: string;
  public conversationId!: string;
  public senderId!: number;
  public recipientIds!: string;
  public content!: string;
  public type!: 'text' | 'location' | 'image' | 'system';
  public status!: 'pending' | 'sent' | 'delivered' | 'read';
  public timestamp!: Date;
  public editedAt?: Date;
  public attachments?: string;
  public locationData?: string;
  public syncStatus!: 'pending' | 'synced' | 'failed';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Message.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  conversationId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  recipientIds: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('text', 'location', 'image', 'system'),
    allowNull: false,
    defaultValue: 'text',
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'delivered', 'read'),
    allowNull: false,
    defaultValue: 'pending',
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  editedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  attachments: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  locationData: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  syncStatus: {
    type: DataTypes.ENUM('pending', 'synced', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
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

// Report Model
interface ReportAttributes {
  id: string;
  type: 'daily' | 'weekly' | 'custom';
  title: string;
  description?: string;
  criteria: string;
  status: 'generating' | 'completed' | 'failed';
  fileUrl?: string;
  fileSize?: number;
  generatedBy: number;
  generatedAt?: Date;
  expiresAt?: Date;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ReportCreationAttributes extends Optional<ReportAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Report extends Model<ReportAttributes, ReportCreationAttributes> implements ReportAttributes {
  public id!: string;
  public type!: 'daily' | 'weekly' | 'custom';
  public title!: string;
  public description?: string;
  public criteria!: string;
  public status!: 'generating' | 'completed' | 'failed';
  public fileUrl?: string;
  public fileSize?: number;
  public generatedBy!: number;
  public generatedAt?: Date;
  public expiresAt?: Date;
  public downloadCount!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Report.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  type: {
    type: DataTypes.ENUM('daily', 'weekly', 'custom'),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  criteria: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('generating', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'generating',
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  generatedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  generatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  downloadCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
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

// Sync Operations Model
interface SyncOperationAttributes {
  id: string;
  operationType: string;
  tableName: string;
  recordId: string;
  operation: 'insert' | 'update' | 'delete';
  data?: string;
  status: 'pending' | 'completed' | 'failed';
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SyncOperationCreationAttributes extends Optional<SyncOperationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class SyncOperation extends Model<SyncOperationAttributes, SyncOperationCreationAttributes> implements SyncOperationAttributes {
  public id!: string;
  public operationType!: string;
  public tableName!: string;
  public recordId!: string;
  public operation!: 'insert' | 'update' | 'delete';
  public data?: string;
  public status!: 'pending' | 'completed' | 'failed';
  public retryCount!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SyncOperation.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  operationType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tableName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  recordId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  operation: {
    type: DataTypes.ENUM('insert', 'update', 'delete'),
    allowNull: false,
  },
  data: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  retryCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
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

// Define associations
User.hasMany(Location, { foreignKey: 'userId', as: 'locations' });
Location.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

User.hasMany(Report, { foreignKey: 'generatedBy', as: 'reports' });
Report.belongsTo(User, { foreignKey: 'generatedBy', as: 'generator' });

export {
  sequelize,
  User,
  Location,
  Message,
  Report,
  SyncOperation,
};

export default sequelize;