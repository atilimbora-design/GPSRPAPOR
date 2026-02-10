import { User } from '@/models';
import bcrypt from 'bcryptjs';
import { logInfo, logError } from '@/utils/logger';
import fs from 'fs';
import path from 'path';
import { paths } from '@/config';

/**
 * Personnel data for seeding
 */
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

/**
 * Create directory structure for personnel
 */
const createPersonnelDirectories = (personnelCode: string, name: string): void => {
  const sanitizedName = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const personnelDir = path.join(paths.uploads, 'personnel', `${personnelCode}_${sanitizedName}`);
  
  // Create directories
  const directories = [
    personnelDir,
    path.join(personnelDir, 'reports'),
    path.join(personnelDir, 'receipts'),
    path.join(personnelDir, 'avatars'),
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

/**
 * Seed database with initial data
 */
export const seed = async (force: boolean = false): Promise<void> => {
  try {
    logInfo('Starting database seeding...');

    // Check if users already exist
    const existingUserCount = await User.count();
    if (existingUserCount > 0 && !force) {
      logInfo('Database already contains users, skipping seed');
      return;
    }

    if (force) {
      logInfo('Force flag set, clearing existing data...');
      await User.destroy({ where: {}, truncate: true });
    }

    // Default password for all users
    const defaultPassword = '1234';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    // Create admin user
    const adminUser = await User.create({
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

    logInfo(`Created admin user: ${adminUser.name}`);

    // Create personnel users
    const createdPersonnel = [];
    for (const personnel of personnelList) {
      try {
        const user = await User.create({
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

        // Create directory structure for this personnel
        createPersonnelDirectories(personnel.code, personnel.name);

        createdPersonnel.push(user);
        logInfo(`Created personnel user: ${user.name} (${user.personnelId})`);
      } catch (error) {
        logError(error as Error, { 
          operation: 'create_personnel_user',
          personnelCode: personnel.code,
          personnelName: personnel.name,
        });
      }
    }

    // Create sample data for development (only if not in production)
    if (process.env.NODE_ENV !== 'production') {
      await createSampleData(createdPersonnel);
    }

    logInfo(`Database seeding completed successfully. Created ${createdPersonnel.length + 1} users.`);
  } catch (error) {
    logError(error as Error, { operation: 'database_seeding' });
    throw error;
  }
};

/**
 * Create sample data for development and testing
 */
const createSampleData = async (personnel: User[]): Promise<void> => {
  try {
    logInfo('Creating sample data for development...');

    // Sample locations for first few personnel
    const { Location } = await import('@/models');
    
    const sampleLocations = [
      { lat: 39.9334, lng: 32.8597 }, // Ankara
      { lat: 39.9208, lng: 32.8541 }, // Kızılay
      { lat: 39.9375, lng: 32.8648 }, // Çankaya
    ];

    for (let i = 0; i < Math.min(3, personnel.length); i++) {
      const user = personnel[i];
      const location = sampleLocations[i];
      
      if (user && location) {
        await Location.create({
          userId: user.id,
          latitude: location.lat,
          longitude: location.lng,
          accuracy: 10,
          timestamp: new Date(),
          batteryLevel: 85,
          source: 'gps',
          isManual: false,
          syncStatus: 'synced'
        });
      }
    }

    // Sample messages
    const { Message } = await import('@/models');
    
    await Message.create({
      conversationId: 'admin_broadcast',
      senderId: 1, // Admin user
      recipientIds: JSON.stringify(personnel.map((p: User) => p.id)),
      content: 'Welcome to the GPS RAPOR system! This is a test message.',
      type: 'text',
      status: 'sent',
      timestamp: new Date(),
      syncStatus: 'synced',
    });

    logInfo('Sample data created successfully');
  } catch (error) {
    logError(error as Error, { operation: 'create_sample_data' });
  }
};

/**
 * Clear all data from database
 */
export const clearDatabase = async (): Promise<void> => {
  try {
    logInfo('Clearing database...');
    
    const { Location, Message, Report, SyncOperation } = await import('@/models');
    
    await SyncOperation.destroy({ where: {}, truncate: true });
    await Report.destroy({ where: {}, truncate: true });
    await Message.destroy({ where: {}, truncate: true });
    await Location.destroy({ where: {}, truncate: true });
    await User.destroy({ where: {}, truncate: true });
    
    logInfo('Database cleared successfully');
  } catch (error) {
    logError(error as Error, { operation: 'clear_database' });
    throw error;
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  const force = process.argv.includes('--force');
  
  seed(force)
    .then(() => {
      logInfo('Seed script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logError(error as Error, { operation: 'seed_script' });
      process.exit(1);
    });
}