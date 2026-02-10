export interface ServerConfig {
    port: number;
    host: string;
    env: string;
}
export interface DatabaseConfig {
    url: string;
    pool: {
        max: number;
        min: number;
        acquire: number;
        idle: number;
    };
}
export interface SecurityConfig {
    jwt: {
        secret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };
    encryption: {
        key: string;
        algorithm: string;
    };
    cors: {
        origin: string;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
}
export interface JwtPayload {
    id: number;
    role: 'personnel' | 'admin';
    name: string;
    code: string;
    iat?: number;
    exp?: number;
}
export interface LoginRequest {
    username: string;
    password: string;
    deviceInfo?: {
        deviceId: string;
        platform: string;
        appVersion: string;
        fcmToken?: string;
    };
}
export interface LoginResponse {
    success: boolean;
    user: {
        id: number;
        personnelId: string;
        name: string;
        role: 'personnel' | 'admin';
        email?: string;
        phone?: string;
        avatar?: string;
        lastSeen?: Date;
    };
    tokens: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    };
}
export interface RefreshTokenRequest {
    refreshToken: string;
}
export interface RefreshTokenResponse {
    success: boolean;
    tokens: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    };
}
export interface RegisterRequest {
    personnelId: string;
    name: string;
    email?: string;
    phone?: string;
    password: string;
    role?: 'personnel' | 'admin';
}
export interface RegisterResponse {
    success: boolean;
    user: {
        id: number;
        personnelId: string;
        name: string;
        role: 'personnel' | 'admin';
        email?: string;
        phone?: string;
    };
    message: string;
}
export interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    speed?: number;
    heading?: number;
    timestamp: Date;
    batteryLevel: number;
    source: 'gps' | 'network' | 'passive';
    isManual?: boolean;
    metadata?: {
        address?: string;
        activity?: 'still' | 'walking' | 'driving';
        confidence?: number;
    };
}
export interface MessageData {
    conversationId: string;
    content: string;
    type: 'text' | 'location' | 'image' | 'system';
    recipientIds: number[];
    attachments?: {
        id: string;
        type: string;
        url: string;
        size: number;
        metadata?: any;
    }[];
    location?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
}
export interface SyncStatus {
    isOnline: boolean;
    isSyncing: boolean;
    pendingOperations: number;
    lastSyncTime?: Date;
    errors: SyncError[];
}
export interface SyncError {
    id: string;
    operation: string;
    error: string;
    timestamp: Date;
    retryCount: number;
}
export interface Conflict {
    id: string;
    tableName: string;
    recordId: string;
    localData: any;
    serverData: any;
    timestamp: Date;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp: Date;
}
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    code?: string;
}
export interface ServerToClientEvents {
    locationUpdate: (data: LocationData & {
        userId: number;
    }) => void;
    messageReceived: (message: MessageData & {
        id: string;
        senderId: number;
        timestamp: Date;
    }) => void;
    userStatusChanged: (data: {
        userId: number;
        isOnline: boolean;
        lastSeen?: Date;
    }) => void;
    syncStatusChanged: (status: SyncStatus) => void;
    notificationReceived: (notification: NotificationData) => void;
}
export interface ClientToServerEvents {
    authenticate: (token: string) => void;
    updateLocation: (data: LocationData) => void;
    sendMessage: (message: MessageData) => void;
    joinRoom: (roomId: string) => void;
    leaveRoom: (roomId: string) => void;
    requestSync: (data: {
        lastSyncTime?: Date;
    }) => void;
}
export interface InterServerEvents {
    ping: () => void;
}
export interface SocketData {
    userId?: number;
    role?: 'personnel' | 'admin';
    rooms?: string[];
}
export interface NotificationData {
    id: string;
    type: 'message' | 'alert' | 'report' | 'system';
    title: string;
    body: string;
    data?: any;
    priority: 'low' | 'normal' | 'high' | 'critical';
    timestamp: Date;
    expiresAt?: Date;
}
export interface ReportCriteria {
    userIds?: number[];
    startDate: Date;
    endDate: Date;
    includeLocations: boolean;
    includeMessages: boolean;
    includeAnalytics: boolean;
    format?: 'pdf' | 'excel' | 'json';
}
export interface ReportData {
    id: string;
    type: 'daily' | 'weekly' | 'custom';
    title: string;
    description?: string;
    criteria: ReportCriteria;
    status: 'generating' | 'completed' | 'failed';
    fileUrl?: string;
    fileSize?: number;
    generatedBy: number;
    generatedAt?: Date;
    expiresAt?: Date;
    downloadCount: number;
}
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: Date;
    uptime: number;
    version: string;
    services: {
        database: ServiceStatus;
        redis?: ServiceStatus;
        websocket: ServiceStatus;
        fileSystem: ServiceStatus;
    };
    metrics: {
        memoryUsage: NodeJS.MemoryUsage;
        cpuUsage: NodeJS.CpuUsage;
        activeConnections: number;
        requestsPerMinute: number;
    };
}
export interface ServiceStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    error?: string;
    lastCheck: Date;
}
export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type Partial<T> = {
    [P in keyof T]?: T[P];
};
export type Required<T> = {
    [P in keyof T]-?: T[P];
};
export interface UserModel {
    id: number;
    personnelId: string;
    name: string;
    email?: string;
    phone?: string;
    role: 'personnel' | 'admin';
    passwordHash: string;
    isActive: boolean;
    lastSeen?: Date;
    deviceInfo?: any;
    preferences?: any;
    avatar?: string;
    lastLat?: number;
    lastLng?: number;
    speed?: number;
    battery?: number;
    lastLogout?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface LocationModel {
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
    metadata?: any;
    syncStatus: 'pending' | 'synced' | 'failed';
    createdAt: Date;
    updatedAt: Date;
}
export interface MessageModel {
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
//# sourceMappingURL=index.d.ts.map