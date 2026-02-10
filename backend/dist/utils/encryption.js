"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskSensitiveData = exports.generateSessionId = exports.sanitizeInput = exports.generateUUID = exports.decryptJSON = exports.encryptJSON = exports.verifyHMAC = exports.createHMAC = exports.hashData = exports.generateSecurePassword = exports.generateSecureToken = exports.decrypt = exports.encrypt = exports.verifyPassword = exports.hashPassword = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const config_1 = require("@/config");
const hashPassword = async (password) => {
    const saltRounds = 12;
    return bcryptjs_1.default.hash(password, saltRounds);
};
exports.hashPassword = hashPassword;
const verifyPassword = async (password, hash) => {
    return bcryptjs_1.default.compare(password, hash);
};
exports.verifyPassword = verifyPassword;
const encrypt = (text) => {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(config_1.securityConfig.encryption.key, 'hex');
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipher(algorithm, key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
    };
};
exports.encrypt = encrypt;
const decrypt = (encryptedData) => {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(config_1.securityConfig.encryption.key, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    const decipher = crypto_1.default.createDecipher(algorithm, key);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};
exports.decrypt = decrypt;
const generateSecureToken = (length = 32) => {
    return crypto_1.default.randomBytes(length).toString('hex');
};
exports.generateSecureToken = generateSecureToken;
const generateSecurePassword = (length = 16) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&';
    let password = '';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '@$!%*?&';
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    for (let i = 4; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }
    return password.split('').sort(() => Math.random() - 0.5).join('');
};
exports.generateSecurePassword = generateSecurePassword;
const hashData = (data) => {
    return crypto_1.default.createHash('sha256').update(data).digest('hex');
};
exports.hashData = hashData;
const createHMAC = (data, secret) => {
    const key = secret || config_1.securityConfig.encryption.key;
    return crypto_1.default.createHmac('sha256', key).update(data).digest('hex');
};
exports.createHMAC = createHMAC;
const verifyHMAC = (data, signature, secret) => {
    const key = secret || config_1.securityConfig.encryption.key;
    const expectedSignature = crypto_1.default.createHmac('sha256', key).update(data).digest('hex');
    return crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};
exports.verifyHMAC = verifyHMAC;
const encryptJSON = (data) => {
    const jsonString = JSON.stringify(data);
    const encrypted = (0, exports.encrypt)(jsonString);
    return JSON.stringify(encrypted);
};
exports.encryptJSON = encryptJSON;
const decryptJSON = (encryptedString) => {
    const encryptedData = JSON.parse(encryptedString);
    const decryptedString = (0, exports.decrypt)(encryptedData);
    return JSON.parse(decryptedString);
};
exports.decryptJSON = decryptJSON;
const generateUUID = () => {
    return crypto_1.default.randomUUID();
};
exports.generateUUID = generateUUID;
const sanitizeInput = (input) => {
    return input
        .replace(/[<>]/g, '')
        .replace(/['"]/g, '')
        .replace(/[;]/g, '')
        .trim();
};
exports.sanitizeInput = sanitizeInput;
const generateSessionId = () => {
    const timestamp = Date.now().toString();
    const randomBytes = crypto_1.default.randomBytes(16).toString('hex');
    return (0, exports.hashData)(timestamp + randomBytes);
};
exports.generateSessionId = generateSessionId;
const maskSensitiveData = (data, visibleChars = 4) => {
    if (data.length <= visibleChars * 2) {
        return '*'.repeat(data.length);
    }
    const start = data.substring(0, visibleChars);
    const end = data.substring(data.length - visibleChars);
    const middle = '*'.repeat(data.length - (visibleChars * 2));
    return start + middle + end;
};
exports.maskSensitiveData = maskSensitiveData;
//# sourceMappingURL=encryption.js.map