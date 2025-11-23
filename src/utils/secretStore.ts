// Secure secret storage with encryption
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../core/Logger.js';

const logger = Logger.getInstance();

// Secret store file path
const SECRETS_FILE = path.join(process.cwd(), 'data', 'secrets.enc.json');

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

interface SecretData {
  telegramBotToken?: string;
  telegramChatId?: string;
  binanceApiKey?: string;
  binanceSecretKey?: string;
  [key: string]: any;
}

/**
 * Derive encryption key from secret passphrase using PBKDF2
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt data with AES-256-GCM
 */
function encrypt(data: string, secret: string): string {
  if (!secret || secret.length < 16) {
    console.error('TELEGRAM_STORE_SECRET must be at least 16 characters long');
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(secret, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return: salt + iv + authTag + encrypted (all as hex)
  return salt.toString('hex') + ':' + iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt data with AES-256-GCM
 */
function decrypt(encryptedData: string, secret: string): string {
  if (!secret || secret.length < 16) {
    console.error('TELEGRAM_STORE_SECRET must be at least 16 characters long');
  }

  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    console.error('Invalid encrypted data format');
  }

  const salt = Buffer.from(parts[0], 'hex');
  const iv = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  const encrypted = parts[3];

  const key = deriveKey(secret, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Save secrets to encrypted file
 */
export function saveSecrets(secrets: SecretData): void {
  const storeSecret = process.env.TELEGRAM_STORE_SECRET;

  if (!storeSecret) {
    console.error('TELEGRAM_STORE_SECRET environment variable is required');
  }

  if (storeSecret.length < 16) {
    console.error('TELEGRAM_STORE_SECRET must be at least 16 characters long');
  }

  try {
    // Ensure data directory exists
    const dataDir = path.dirname(SECRETS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Serialize and encrypt
    const json = JSON.stringify(secrets);
    const encrypted = encrypt(json, storeSecret);

    // Write to file
    fs.writeFileSync(SECRETS_FILE, encrypted, 'utf8');
    logger.info('Secrets saved successfully');
  } catch (error: any) {
    logger.error('Failed to save secrets', {}, error);
    console.error(`Failed to save secrets: ${error.message}`);
  }
}

/**
 * Load secrets from encrypted file
 */
export function loadSecrets(): SecretData {
  const storeSecret = process.env.TELEGRAM_STORE_SECRET;

  if (!storeSecret) {
    logger.warn('TELEGRAM_STORE_SECRET not set, cannot load secrets');
    return {};
  }

  if (!fs.existsSync(SECRETS_FILE)) {
    logger.info('Secrets file does not exist, returning empty secrets');
    return {};
  }

  try {
    const encrypted = fs.readFileSync(SECRETS_FILE, 'utf8');
    const decrypted = decrypt(encrypted, storeSecret);
    const secrets: SecretData = JSON.parse(decrypted);
    logger.info('Secrets loaded successfully');
    return secrets;
  } catch (error: any) {
    logger.error('Failed to load secrets', {}, error);
    return {};
  }
}

/**
 * Get secret status without revealing the actual values
 */
export function getSecretsStatus(): {
  telegram: { configured: boolean; chatIdMasked?: string };
  binance: { configured: boolean };
} {
  const secrets = loadSecrets();

  const status = {
    telegram: {
      configured: !!(secrets.telegramBotToken && secrets.telegramChatId),
      chatIdMasked: secrets.telegramChatId
        ? `${secrets.telegramChatId.substring(0, 3)}****${secrets.telegramChatId.substring(secrets.telegramChatId.length - 3)}`
        : undefined
    },
    binance: {
      configured: !!(secrets.binanceApiKey && secrets.binanceSecretKey)
    }
  };

  return status;
}
