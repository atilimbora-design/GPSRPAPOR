const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

// Veritabanı dosyasının nerede saklanacağı
const dbPath = path.join(__dirname, 'database.sqlite');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false
});

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    personelCode: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('admin', 'user'),
        defaultValue: 'user'
    },
    avatar: {
        type: DataTypes.STRING,
        allowNull: true
    },
    lastLat: { type: DataTypes.FLOAT, allowNull: true },
    lastLng: { type: DataTypes.FLOAT, allowNull: true },
    speed: { type: DataTypes.FLOAT, allowNull: true },
    battery: { type: DataTypes.INTEGER, allowNull: true },
    lastSeen: { type: DataTypes.DATE, allowNull: true },
    lastLogout: { type: DataTypes.DATE, allowNull: true }
});

const Report = sequelize.define('Report', {
    date: DataTypes.DATEONLY,
    vehiclePlate: DataTypes.STRING,
    startKm: DataTypes.INTEGER,
    endKm: DataTypes.INTEGER,
    expenses: DataTypes.JSON, // { fuel: {amount, image}, maintenance: {desc, amount, image} }
    collections: DataTypes.JSON, // { cash, creditCard, check, eft }
    cashDelivered: DataTypes.FLOAT,
    description: DataTypes.TEXT,
    pdfPath: DataTypes.STRING,
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
    }
});

const Location = sequelize.define('Location', {
    lat: DataTypes.FLOAT,
    lng: DataTypes.FLOAT,
    speed: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    battery: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    timestamp: DataTypes.DATE
});

const Message = sequelize.define('Message', {
    content: DataTypes.TEXT,
    type: {
        type: DataTypes.ENUM('text', 'image', 'location'),
        defaultValue: 'text'
    },
    mediaUrl: DataTypes.STRING,
    senderName: DataTypes.STRING,
    isGroup: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    groupId: DataTypes.STRING
});

const Group = sequelize.define('Group', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    members: {
        type: DataTypes.JSON, // array of user ids
        allowNull: false,
        defaultValue: []
    }
});

// İlişkiler
User.hasMany(Report);
Report.belongsTo(User);

User.hasMany(Location);
Location.belongsTo(User);

User.hasMany(Message, { as: 'SentMessages', foreignKey: 'senderId' });
User.hasMany(Message, { as: 'ReceivedMessages', foreignKey: 'receiverId' });
Message.belongsTo(User, { as: 'Sender', foreignKey: 'senderId' });
Message.belongsTo(User, { as: 'Receiver', foreignKey: 'receiverId' });

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
    { code: '42', name: 'Erol Dereli' }
];

async function seed() {
    await sequelize.sync({ force: true });

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('1234', salt);
    const adminPassword = await bcrypt.hash('1234', salt); // Admin şifresi 1234

    // Admin oluştur
    await User.create({
        personelCode: 'admin',
        username: 'admin',
        name: 'Yönetici',
        password: adminPassword,
        role: 'admin'
    });

    // Personelleri oluştur
    for (const p of personnelList) {
        await User.create({
            personelCode: p.code,
            username: p.code,
            name: p.name,
            password: defaultPassword,
            role: 'user'
        });

        // Klasör yapısını oluştur
        const userFolder = path.join(__dirname, 'personel', `${p.code}_${p.name.replace(/\s+/g, '_')}`, 'raporlar');
        fs.mkdirSync(userFolder, { recursive: true });
    }

    console.log('Veritabanı ve klasörler başarıyla oluşturuldu!');
}

module.exports = { sequelize, User, Report, Location, Message, Group, seed };

if (require.main === module) {
    seed();
}
