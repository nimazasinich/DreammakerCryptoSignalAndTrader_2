/**
 * Secure Secrets Vault with AES-256-GCM Encryption
 * Stores all sensitive credentials server-side
 * Uses SECRETS_KEY environment variable (32-byte base64)
 */

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
const TAG_LENGTH = 16;

export interface AllSecrets {
  exchanges: {
    kucoin: {
      apiKey: string;
      apiSecret: string;
      passphrase: string;
    };
    binance: {
      apiKey: string;
      secret: string;
    };
  };
  telegram: {
    botToken: string;
    chatId: string;
  };
  huggingface: {
    token: string;
  };
  agents: {
    scanner: {
      enabled: boolean;
      scanIntervalMin: number;
      timeframe: string;
      assetsLimit: number;
      rankRange: [number, number];
      minVolumeUSD: number;
      useHarmonics: boolean;
    };
  };
}

/**
 * Get default secrets structure
 */
function getDefaultSecrets(): AllSecrets {
  return {
    exchanges: {
      kucoin: { apiKey: '', apiSecret: '', passphrase: '' },
      binance: { apiKey: '', secret: '' }
    },
    telegram: {
      botToken: '',
      chatId: ''
    },
    huggingface: {
      token: ''
    },
    agents: {
      scanner: {
        enabled: false,
        scanIntervalMin: 3,
        timeframe: '15m',
        assetsLimit: 100,
        rankRange: [1, 300],
        minVolumeUSD: 5000000,
        useHarmonics: true
      }
    }
  };
}

/**
 * Get encryption key from environment
 */
function getKey(): Buffer {
  const keyBase64 = process.env.SECRETS_KEY;

  if (!keyBase64) {
    // Generate a temporary key and warn (for development)
    logger.warn('SECRETS_KEY not set in environment, using temporary key (NOT FOR PRODUCTION)');
    return crypto.randomBytes(32);
  }

  try {
    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== 32) {
      console.error('SECRETS_KEY must be exactly 32 bytes (base64 encoded)');
    }
    return key;
  } catch (error) {
    logger.error('Invalid SECRETS_KEY format', {}, error as Error);
    console.error('SECRETS_KEY must be a valid base64-encoded 32-byte key');
  }
}

/**
 * Encrypt data with AES-256-GCM
 */
function encrypt(data: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return: iv + authTag + encrypted (all as hex)
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt data with AES-256-GCM
 */
function decrypt(encryptedData: string): string {
  const key = getKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    console.error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Get all secrets (decrypted)
 */
export async function getSecrets(): Promise<AllSecrets> {
  if (!fs.existsSync(SECRETS_FILE)) {
    logger.info('Secrets file does not exist, returning defaults');
    return getDefaultSecrets();
  }

  try {
    const encrypted = fs.readFileSync(SECRETS_FILE, 'utf8');
    const decrypted = decrypt(encrypted);
    const secrets: Partial<AllSecrets> = JSON.parse(decrypted);

    // Merge with defaults to ensure all fields exist
    const defaults = getDefaultSecrets();
    const merged: AllSecrets = {
      exchanges: {
        kucoin: { ...defaults.exchanges.kucoin, ...(secrets.exchanges?.kucoin || {}) },
        binance: { ...defaults.exchanges.binance, ...(secrets.exchanges?.binance || {}) }
      },
      telegram: { ...defaults.telegram, ...(secrets.telegram || {}) },
      huggingface: { ...defaults.huggingface, ...(secrets.huggingface || {}) },
      agents: {
        scanner: { ...defaults.agents.scanner, ...(secrets.agents?.scanner || {}) }
      }
    };

    return merged;
  } catch (error) {
    logger.error('Failed to load secrets, returning defaults', {}, error as Error);
    return getDefaultSecrets();
  }
}

/**
 * Save secrets (partial update supported)
 */
export async function saveSecrets(partial: Partial<AllSecrets>): Promise<AllSecrets> {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(SECRETS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Load existing secrets
    const existing = await getSecrets();

    // Deep merge
    const updated: AllSecrets = {
      exchanges: {
        kucoin: { ...existing.exchanges.kucoin, ...(partial.exchanges?.kucoin || {}) },
        binance: { ...existing.exchanges.binance, ...(partial.exchanges?.binance || {}) }
      },
      telegram: { ...existing.telegram, ...(partial.telegram || {}) },
      huggingface: { ...existing.huggingface, ...(partial.huggingface || {}) },
      agents: {
        scanner: { ...existing.agents.scanner, ...(partial.agents?.scanner || {}) }
      }
    };

    // Serialize and encrypt
    const json = JSON.stringify(updated, null, 2);
    const encrypted = encrypt(json);

    // Write to file (atomic)
    const tempFile = SECRETS_FILE + '.tmp';
    fs.writeFileSync(tempFile, encrypted, 'utf8');
    fs.renameSync(tempFile, SECRETS_FILE);

    logger.info('Secrets saved successfully');
    return updated;
  } catch (error) {
    logger.error('Failed to save secrets', {}, error as Error);
    console.error(`Failed to save secrets: ${(error as Error).message}`);
  }
}
