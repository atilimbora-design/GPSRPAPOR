import {
  encryptData,
  decryptData,
  encryptFields,
  decryptFields,
  generateEncryptionKey,
  hashData,
  verifyHash,
  EncryptionUtils
} from '@/utils/encryption';

describe('Encryption Utilities', () => {
  const testKey = 'test-encryption-key-32-characters';
  const testData = 'sensitive-test-data-123';

  describe('Basic Encryption/Decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const encrypted = encryptData(testData, testKey);
      const decrypted = decryptData(encrypted, testKey);
      
      expect(decrypted).toBe(testData);
      expect(encrypted).not.toBe(testData);
      expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 format
    });

    it('should produce different encrypted values for same input', () => {
      const encrypted1 = encryptData(testData, testKey);
      const encrypted2 = encryptData(testData, testKey);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to same value
      expect(decryptData(encrypted1, testKey)).toBe(testData);
      expect(decryptData(encrypted2, testKey)).toBe(testData);
    });

    it('should fail with wrong key', () => {
      const encrypted = encryptData(testData, testKey);
      
      expect(() => {
        decryptData(encrypted, 'wrong-key');
      }).toThrow();
    });

    it('should fail with corrupted data', () => {
      const encrypted = encryptData(testData, testKey);
      const corrupted = encrypted.slice(0, -5) + 'XXXXX';
      
      expect(() => {
        decryptData(corrupted, testKey);
      }).toThrow();
    });
  });

  describe('Field Encryption', () => {
    it('should encrypt specified fields in object', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        id: 123
      };

      const encrypted = encryptFields(data, ['name', 'email']);
      
      expect(encrypted.name).not.toBe(data.name);
      expect(encrypted.email).not.toBe(data.email);
      expect(encrypted.role).toBe(data.role); // Not encrypted
      expect(encrypted.id).toBe(data.id); // Not encrypted
    });

    it('should decrypt specified fields in object', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin'
      };

      const encrypted = encryptFields(data, ['name', 'email']);
      const decrypted = decryptFields(encrypted, ['name', 'email']);
      
      expect(decrypted.name).toBe(data.name);
      expect(decrypted.email).toBe(data.email);
      expect(decrypted.role).toBe(data.role);
    });
  });

  describe('Key Generation', () => {
    it('should generate random encryption keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      
      expect(key1).not.toBe(key2);
      expect(key1).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 format
      expect(Buffer.from(key1, 'base64')).toHaveLength(32); // 32 bytes
    });

    it('should generate keys of specified length', () => {
      const key16 = generateEncryptionKey(16);
      const key64 = generateEncryptionKey(64);
      
      expect(Buffer.from(key16, 'base64')).toHaveLength(16);
      expect(Buffer.from(key64, 'base64')).toHaveLength(64);
    });
  });

  describe('Data Hashing', () => {
    it('should hash data with salt', () => {
      const result = hashData(testData);
      
      expect(result.hash).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.hash).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(result.salt).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should verify hashed data', () => {
      const result = hashData(testData);
      
      expect(verifyHash(testData, result.hash, result.salt)).toBe(true);
      expect(verifyHash('wrong-data', result.hash, result.salt)).toBe(false);
    });

    it('should produce same hash with same salt', () => {
      const result1 = hashData(testData);
      const result2 = hashData(testData, result1.salt);
      
      expect(result2.hash).toBe(result1.hash);
    });
  });

  describe('Location Encryption', () => {
    it('should encrypt and decrypt location coordinates', () => {
      const latitude = 41.0082;
      const longitude = 28.9784;
      
      const encrypted = EncryptionUtils.encryptLocation(latitude, longitude);
      const decrypted = EncryptionUtils.decryptLocation(
        encrypted.encryptedLatitude,
        encrypted.encryptedLongitude
      );
      
      expect(decrypted.latitude).toBeCloseTo(latitude, 4);
      expect(decrypted.longitude).toBeCloseTo(longitude, 4);
    });
  });

  describe('Personal Info Encryption', () => {
    it('should encrypt and decrypt personal information', () => {
      const personalInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      };
      
      const encrypted = EncryptionUtils.encryptPersonalInfo(personalInfo);
      const decrypted = EncryptionUtils.decryptPersonalInfo(encrypted);
      
      expect(decrypted.name).toBe(personalInfo.name);
      expect(decrypted.email).toBe(personalInfo.email);
      expect(decrypted.phone).toBe(personalInfo.phone);
    });

    it('should handle partial personal info', () => {
      const partialInfo = {
        name: 'John Doe'
      };
      
      const encrypted = EncryptionUtils.encryptPersonalInfo(partialInfo);
      const decrypted = EncryptionUtils.decryptPersonalInfo(encrypted);
      
      expect(decrypted.name).toBe(partialInfo.name);
      expect(decrypted.email).toBeUndefined();
      expect(decrypted.phone).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty strings', () => {
      const encrypted = encryptData('', testKey);
      const decrypted = decryptData(encrypted, testKey);
      
      expect(decrypted).toBe('');
    });

    it('should handle missing encryption key', () => {
      expect(() => {
        encryptData(testData, '');
      }).toThrow('Encryption key not provided');
    });

    it('should handle invalid base64 data', () => {
      expect(() => {
        decryptData('invalid-base64!@#', testKey);
      }).toThrow();
    });
  });
});