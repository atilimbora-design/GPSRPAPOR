"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearDatabase = exports.seed = void 0;
const models_1 = require("@/models");
const encryption_1 = require("@/utils/encryption");
const logger_1 = require("@/utils/logger");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("@/config");
const personnelList = [
    { code: '01', name: 'Dinçer Sezan' },
    { code: '02', name: 'Ferhat Öztaş' },
    { code: '03', name: 'Sercan Dinç' },
    { code: '04', name: 'Orçun Cansız' },
    { code: '05', name: 'Muhammet Arık' },
    { code: '06', name: 'Hüseyin Akgüneş' },
    { code: '07', name: 'Emre Özdemir' },
    { code: '08', name: 'Murat Deniz G. Dozdu' },
    { code: '09', name: 'İlker Hepçetinler' },
    { code: '11', name: 'Cemal Çenikli' },
    { code: '13', name: 'Ozan Yılmaz' },
    { code: '16', name: 'Ertunç Terazi' },
    { code: '17', name: 'Hakan Kılınçdemir' },
    { code: '19', name: 'Salih Arı' },
    { code: '21', name: 'Fatih Tercan' },
    { code: '23', name: 'Mertcan Sekerci' },
    { code: '24', name: 'M. Cabbar Balarısı' },
    { code: '25', name: 'Feti Bende' },
    { code: '26', name: 'Tugay Güven' },
    { code: '27', name: 'İsmail Sağır' },
    { code: '28', name: 'Bahadır Deniz' },
    { code: '40', name: 'Hasan Güler' },
    { code: '42', name: 'Erol Dereli' },
];
const createPersonnelDirectories = (personnelCode, name) => {
    const sanitizedName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const personnelDir = path_1.default.join(config_1.paths.uploads, 'personnel', `${personnelCode}_${sanitizedName}`);
    const directories = [
        personnelDir,
        path_1.default.join(personnelDir, 'reports'),
        path_1.default.join(personnelDir, 'receipts'),
        path_1.default.join(personnelDir, 'avatars'),
    ];
    directories.forEach(dir => {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    });
};
const seed = async (force = false) => {
    try {
        (0, logger_1.logInfo)('Starting database seeding...');
        const existingUserCount = await models_1.User.count();
        if (existingUserCount > 0 && !force) {
            (0, logger_1.logInfo)('Database already contains users, skipping seed');
            return;
        }
        if (force) {
            (0, logger_1.logInfo)('Force flag set, clearing existing data...');
            await models_1.User.destroy({ where: {}, truncate: true });
        }
        const defaultPassword = '1234';
        const hashedPassword = await (0, encryption_1.hashPassword)(defaultPassword);
        const adminUser = await models_1.User.create({
            personnelId: 'admin',
            name: 'System Administrator',
            email: 'admin@gpsrapor.com',
            role: 'admin',
            passwordHash: hashedPassword,
            isActive: true,
            preferences: {
                notifications: {
                    messages: true,
                    alerts: true,
                    reports: true,
                    systemStatus: true,
                },
                locationUpdateInterval: 30000,
                theme: 'system',
            },
        });
        (0, logger_1.logInfo)(`Created admin user: ${adminUser.name}`);
        const createdPersonnel = [];
        for (const personnel of personnelList) {
            try {
                const user = await models_1.User.create({
                    personnelId: personnel.code,
                    name: personnel.name,
                    role: 'personnel',
                    passwordHash: hashedPassword,
                    isActive: true,
                    preferences: {
                        notifications: {
                            messages: true,
                            alerts: true,
                            reports: false,
                            systemStatus: false,
                        },
                        locationUpdateInterval: 30000,
                        theme: 'system',
                    },
                });
                createPersonnelDirectories(personnel.code, personnel.name);
                createdPersonnel.push(user);
                (0, logger_1.logInfo)(`Created personnel user: ${user.name} (${user.personnelId})`);
            }
            catch (error) {
                (0, logger_1.logError)(error, {
                    operation: 'create_personnel_user',
                    personnelCode: personnel.code,
                    personnelName: personnel.name,
                });
            }
        }
        if (process.env.NODE_ENV !== 'production') {
            await createSampleData(createdPersonnel);
        }
        (0, logger_1.logInfo)(`Database seeding completed successfully. Created ${createdPersonnel.length + 1} users.`);
    }
    catch (error) {
        (0, logger_1.logError)(error, { operation: 'database_seeding' });
        throw error;
    }
};
exports.seed = seed;
const createSampleData = async (personnel) => {
    try {
        (0, logger_1.logInfo)('Creating sample data for development...');
        const { Location } = await Promise.resolve().then(() => __importStar(require('@/models')));
        const sampleLocations = [
            { lat: 39.9334, lng: 32.8597 },
            { lat: 39.9208, lng: 32.8541 },
            { lat: 39.9375, lng: 32.8648 },
        ];
        for (let i = 0; i < Math.min(3, personnel.length); i++) {
            const user = personnel[i];
            const location = sampleLocations[i];
            await Location.create({
                userId: user.id,
                latitude: location.lat,
                longitude: location.lng,
                accuracy: 10,
                timestamp: new Date(),
                batteryLevel: 85,
                source: 'gps',
                isManual: false,
                syncStatus: 'synced',
            });
        }
        const { Message } = await Promise.resolve().then(() => __importStar(require('@/models')));
        await Message.create({
            conversationId: 'admin_broadcast',
            senderId: 1,
            recipientIds: JSON.stringify(personnel.map(p => p.id)),
            content: 'Welcome to the GPS RAPOR system! This is a test message.',
            type: 'text',
            status: 'sent',
            timestamp: new Date(),
            syncStatus: 'synced',
        });
        (0, logger_1.logInfo)('Sample data created successfully');
    }
    catch (error) {
        (0, logger_1.logError)(error, { operation: 'create_sample_data' });
    }
};
const clearDatabase = async () => {
    try {
        (0, logger_1.logInfo)('Clearing database...');
        const { Location, Message, Report, SyncOperation } = await Promise.resolve().then(() => __importStar(require('@/models')));
        await SyncOperation.destroy({ where: {}, truncate: true });
        await Report.destroy({ where: {}, truncate: true });
        await Message.destroy({ where: {}, truncate: true });
        await Location.destroy({ where: {}, truncate: true });
        await models_1.User.destroy({ where: {}, truncate: true });
        (0, logger_1.logInfo)('Database cleared successfully');
    }
    catch (error) {
        (0, logger_1.logError)(error, { operation: 'clear_database' });
        throw error;
    }
};
exports.clearDatabase = clearDatabase;
if (require.main === module) {
    const force = process.argv.includes('--force');
    (0, exports.seed)(force)
        .then(() => {
        (0, logger_1.logInfo)('Seed script completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        (0, logger_1.logError)(error, { operation: 'seed_script' });
        process.exit(1);
    });
}
//# sourceMappingURL=seed.js.map