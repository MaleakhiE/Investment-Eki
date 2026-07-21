import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  // If key is 32 bytes (256 bits), use directly
  if (key.length === 32) {
    return Buffer.from(key, 'utf-8');
  }
  
  // If key is 64 hex characters (32 bytes), decode from hex
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }
  
  // Otherwise, derive a 32-byte key using SHA-256
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Generate a deterministic IV from the plaintext for searchable encryption.
 * This allows the same plaintext to always produce the same ciphertext,
 * enabling database lookups on encrypted fields.
 * 
 * Note: This is less secure than random IV but necessary for searchable fields.
 */
function getDeterministicIV(plaintext: string): Buffer {
  const key = getEncryptionKey();
  // Use HMAC to derive a deterministic IV from the plaintext
  return crypto.createHmac('sha256', key)
    .update(plaintext)
    .digest()
    .subarray(0, IV_LENGTH);
}

/**
 * Encrypt with random IV (more secure, for non-searchable fields)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:ciphertext (all base64 encoded)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Encrypt with deterministic IV (for searchable fields like email)
 * Same plaintext will always produce the same ciphertext.
 */
export function encryptDeterministic(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = getDeterministicIV(plaintext);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:ciphertext (all base64 encoded)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }
  
  const [ivBase64, authTagBase64, encryptedBase64] = parts;
  
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const encrypted = Buffer.from(encryptedBase64, 'base64');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function encryptNumber(value: number): string {
  return encrypt(value.toString());
}

export function decryptNumber(ciphertext: string): number {
  const decrypted = decrypt(ciphertext);
  const num = parseFloat(decrypted);
  if (isNaN(num)) {
    throw new Error('Decrypted value is not a valid number');
  }
  return num;
}
