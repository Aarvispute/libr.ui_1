import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  throw new Error('FATAL: SESSION_SECRET environment variable is missing.');
}

// Hashing the secret ensures we always have exactly a 32-byte key required for AES-256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SECRET).digest();
const IV_LENGTH = 16;

export function encryptSession(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

export function decryptSession(text: string) {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts[0], 'hex');
    const authTag = Buffer.from(textParts[1], 'hex');
    const encryptedText = textParts[2];
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return null; // Return null if the cookie was tampered with
  }
}