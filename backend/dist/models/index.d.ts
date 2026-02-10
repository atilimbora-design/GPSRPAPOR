import { Sequelize, Model, Optional } from 'sequelize';
declare const sequelize: Sequelize;
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
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt'> {
}
declare class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
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
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
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
interface LocationCreationAttributes extends Optional<LocationAttributes, 'id' | 'createdAt' | 'updatedAt'> {
}
declare class Location extends Model<LocationAttributes, LocationCreationAttributes> implements LocationAttributes {
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
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
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
interface MessageCreationAttributes extends Optional<MessageAttributes, 'id' | 'createdAt' | 'updatedAt'> {
}
declare class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
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
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
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
interface ReportCreationAttributes extends Optional<ReportAttributes, 'id' | 'createdAt' | 'updatedAt'> {
}
declare class Report extends Model<ReportAttributes, ReportCreationAttributes> implements ReportAttributes {
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
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
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
interface SyncOperationCreationAttributes extends Optional<SyncOperationAttributes, 'id' | 'createdAt' | 'updatedAt'> {
}
declare class SyncOperation extends Model<SyncOperationAttributes, SyncOperationCreationAttributes> implements SyncOperationAttributes {
    id: string;
    operationType: string;
    tableName: string;
    recordId: string;
    operation: 'insert' | 'update' | 'delete';
    data?: string;
    status: 'pending' | 'completed' | 'failed';
    retryCount: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export { sequelize, User, Location, Message, Report, SyncOperation, };
export default sequelize;
//# sourceMappingURL=index.d.ts.map