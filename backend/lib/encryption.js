import crypto from 'crypto';

/**
 * Encryption service for sensitive data
 * Encrypts player names, team names, user email/name
 * Compatible with the GitHub repo format (aes-256-cbc with iv:encrypted format)
 */
class EncryptionService {
  static algorithm = 'aes-256-cbc';

  static getKey() {
    const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    return crypto.createHash('sha256').update(key).digest();
  }

  /**
   * Validates that the encryption key is set
   */
  static validateKey() {
    if (!process.env.ENCRYPTION_KEY) {
      console.warn('ENCRYPTION_KEY not set in environment variables. Using default key.');
    }
  }

  /**
   * Encrypt sensitive data (like player names)
   */
  static encrypt(text) {
    if (!text) return text;

    this.validateKey();

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.getKey(), iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Combine IV and encrypted data
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedText) {
    if (!encryptedText) return encryptedText;

    this.validateKey();

    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.getKey(), iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
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
   * Decrypt an array of objects' specified fields
   * @param {Array<Object>} arr - Array of objects to decrypt
   * @param {Array<string>} fields - Field names to decrypt
   * @returns {Array<Object>} - Array with decrypted fields
   */
  static decryptArray(arr, fields) {
    return arr.map(obj => this.decryptFields(obj, fields));
  }
}

export default EncryptionService;
