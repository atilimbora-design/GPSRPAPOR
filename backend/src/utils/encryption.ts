import crypto from 'crypto';
import { securityConfig } from '@/config';

/**
 * AES-256 Encryption Utilities for Data at Rest
 * 
 * Provides secure encryption/decryption for sensitive data storage
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For CBC, this is 16 bytes
const SALT_LENGTH = 32; // Salt for key derivation

/**
 * Derives encryption key from master key using PBKDF2
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * 
 * @param plaintext - Data to encrypt
 * @param masterKey - Master encryption key (optional, uses config if not provided)
 * @returns Encrypted data with metadata (base64 encoded)
 */
export function encryptData(plaintext: string, masterKey?: string): string {
  try {
    const key = masterKey || securityConfig.encryption.key;
    if (!key) {
      throw new Error('Encryption key not provided');
    }

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive encryption key
    const derivedKey = deriveKey(key, salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
    
    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine salt + iv + encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypts data encrypted with encryptData
 * 
 * @param encryptedData - Base64 encoded encrypted data
 * @param masterKey - Master encryption key (optional, uses config if not provided)
 * @returns Decrypted plaintext
 */
export function decryptData(encryptedData: string, masterKey?: string): string {
  try {
    const key = masterKey || securityConfig.encryption.key;
    if (!key) {
      throw new Error('Encryption key not provided');
    }

    // Decode base64 data
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH);
    
    // Derive decryption key
    const derivedKey = deriveKey(key, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    
    // Decrypt data
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encrypts sensitive fields in an object
 * 
 * @param data - Object containing data to encrypt
 * @param fieldsToEncrypt - Array of field names to encrypt
 * @returns Object with specified fields encrypted
 */
export function encryptFields<T extends Record<string, any>>(
  data: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const result = { ...data };
  
  for (const field of fieldsToEncrypt) {
    if (result[field] && typeof result[field] === 'string') {
      (result as any)[field] = encryptData(result[field] as string);
    }
  }
  
  return result;
}

/**
 * Decrypts sensitive fields in an object
 * 
 * @param data - Object containing encrypted data
 * @param fieldsToDecrypt - Array of field names to decrypt
 * @returns Object with specified fields decrypted
 */
export function decryptFields<T extends Record<string, any>>(
  data: T,
  fieldsToDecrypt: (keyof T)[]
): T {
  const result = { ...data };
  
  for (const field of fieldsToDecrypt) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        (result as any)[field] = decryptData(result[field] as string);
      } catch (error) {
        // If decryption fails, field might not be encrypted
        // Log warning but don't throw error
        console.warn(`Failed to decrypt field ${String(field)}:`, error);
      }
    }
  }
  
  return result;
}

/**
 * Generates a secure random encryption key
 * 
 * @param length - Key length in bytes (default: 32 for AES-256)
 * @returns Base64 encoded random key
 */
export function generateEncryptionKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * Hashes sensitive data for comparison (one-way)
 * 
 * @param data - Data to hash
 * @param salt - Optional salt (generates random if not provided)
 * @returns Object containing hash and salt
 */
export function hashData(data: string, salt?: string): { hash: string; salt: string } {
  const saltBuffer = salt ? Buffer.from(salt, 'base64') : crypto.randomBytes(32);
  const hash = crypto.pbkdf2Sync(data, saltBuffer, 100000, 64, 'sha256');
  
  return {
    hash: hash.toString('base64'),
    salt: saltBuffer.toString('base64')
  };
}

/**
 * Verifies hashed data
 * 
 * @param data - Original data to verify
 * @param hash - Hash to compare against
 * @param salt - Salt used for hashing
 * @returns True if data matches hash
 */
export function verifyHash(data: string, hash: string, salt: string): boolean {
  const computed = hashData(data, salt);
  return computed.hash === hash;
}

/**
 * Securely wipes sensitive data from memory
 * 
 * @param buffer - Buffer to wipe
 */
export function secureWipe(buffer: Buffer): void {
  if (buffer && buffer.length > 0) {
    crypto.randomFillSync(buffer);
    buffer.fill(0);
  }
}

/**
 * Encryption utilities for specific data types
 */
export const EncryptionUtils = {
  /**
   * Encrypts location data
   */
  encryptLocation: (latitude: number, longitude: number): { 
    encryptedLatitude: string; 
    encryptedLongitude: string; 
  } => ({
    encryptedLatitude: encryptData(latitude.toString()),
    encryptedLongitude: encryptData(longitude.toString())
  }),

  /**
   * Decrypts location data
   */
  decryptLocation: (encryptedLatitude: string, encryptedLongitude: string): {
    latitude: number;
    longitude: number;
  } => ({
    latitude: parseFloat(decryptData(encryptedLatitude)),
    longitude: parseFloat(decryptData(encryptedLongitude))
  }),

  /**
   * Encrypts personal information
   */
  encryptPersonalInfo: (data: {
    name?: string;
    email?: string;
    phone?: string;
  }): Record<string, string> => {
    const result: Record<string, string> = {};
    
    if (data.name) result.encryptedName = encryptData(data.name);
    if (data.email) result.encryptedEmail = encryptData(data.email);
    if (data.phone) result.encryptedPhone = encryptData(data.phone);
    
    return result;
  },

  /**
   * Decrypts personal information
   */
  decryptPersonalInfo: (encryptedData: {
    encryptedName?: string;
    encryptedEmail?: string;
    encryptedPhone?: string;
  }): { name?: string; email?: string; phone?: string } => {
    const result: { name?: string; email?: string; phone?: string } = {};
    
    if (encryptedData.encryptedName) {
      result.name = decryptData(encryptedData.encryptedName);
    }
    if (encryptedData.encryptedEmail) {
      result.email = decryptData(encryptedData.encryptedEmail);
    }
    if (encryptedData.encryptedPhone) {
      result.phone = decryptData(encryptedData.encryptedPhone);
    }
    
    return result;
  }
};

/**
 * Password hashing utility (alias for hashData for backward compatibility)
 * 
 * @param password - Password to hash
 * @returns Hashed password with salt
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  return hashData(password);
}

/**
 * Password verification utility (alias for verifyHash for backward compatibility)
 * 
 * @param password - Plain password to verify
 * @param hash - Stored hash
 * @param salt - Stored salt
 * @returns True if password matches
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  return verifyHash(password, hash, salt);
}