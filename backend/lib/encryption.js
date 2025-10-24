const crypto = require('crypto');

/**
 * Encryption service for sensitive data
 * Encrypts player names, team names, user email/name
 */
class EncryptionService {
  static ALGORITHM = 'aes-256-gcm';
  static IV_LENGTH = 16;
  static SALT_LENGTH = 64;
  static TAG_LENGTH = 16;
  static KEY_LENGTH = 32;
  static ITERATIONS = 100000;

  /**
   * Derive encryption key from password
   */
  static deriveKey(password, salt) {
    return crypto.pbkdf2Sync(
      password,
      salt,
      this.ITERATIONS,
      this.KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * Encrypt a string value
   * @param {string} text - The text to encrypt
   * @returns {string} - Base64 encoded encrypted data with IV, salt, and auth tag
   */
  static encrypt(text) {
    if (!text) return text;
    
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      // Derive key from password
      const key = this.deriveKey(encryptionKey, salt);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      
      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get auth tag
      const authTag = cipher.getAuthTag();
      
      // Combine salt + iv + authTag + encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ]);
      
      // Return as base64
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt a string value
   * @param {string} encryptedData - Base64 encoded encrypted data
   * @returns {string} - Decrypted text
   */
  static decrypt(encryptedData) {
    if (!encryptedData) return encryptedData;
    
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    try {
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const salt = combined.slice(0, this.SALT_LENGTH);
      const iv = combined.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const authTag = combined.slice(
        this.SALT_LENGTH + this.IV_LENGTH,
        this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH
      );
      const encrypted = combined.slice(this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH);
      
      // Derive key from password
      const key = this.deriveKey(encryptionKey, salt);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt an object's specified fields
   * @param {Object} obj - The object to encrypt
   * @param {Array<string>} fields - Field names to encrypt
   * @returns {Object} - Object with encrypted fields
   */
  static encryptFields(obj, fields) {
    const result = { ...obj };
    fields.forEach(field => {
      if (result[field]) {
        result[field] = this.encrypt(result[field]);
      }
    });
    return result;
  }

  /**
   * Decrypt an object's specified fields
   * @param {Object} obj - The object to decrypt
   * @param {Array<string>} fields - Field names to decrypt
   * @returns {Object} - Object with decrypted fields
   */
  static decryptFields(obj, fields) {
    const result = { ...obj };
    fields.forEach(field => {
      if (result[field]) {
        result[field] = this.decrypt(result[field]);
      }
    });
    return result;
  }

  /**
   * Encrypt an array of objects
   * @param {Array<Object>} arr - Array of objects to encrypt
   * @param {Array<string>} fields - Field names to encrypt
   * @returns {Array<Object>} - Array with encrypted fields
   */
  static encryptArray(arr, fields) {
    return arr.map(obj => this.encryptFields(obj, fields));
  }

  /**
   * Decrypt an array of objects
   * @param {Array<Object>} arr - Array of objects to decrypt
   * @param {Array<string>} fields - Field names to decrypt
   * @returns {Array<Object>} - Array with decrypted fields
   */
  static decryptArray(arr, fields) {
    return arr.map(obj => this.decryptFields(obj, fields));
  }
}

module.exports = EncryptionService;
