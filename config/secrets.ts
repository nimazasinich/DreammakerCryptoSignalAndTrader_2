import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const scryptAsync = promisify(scrypt);

const VAULT_PATH = join(process.cwd(), 'data', 'secrets.enc.json');
const KEY_PATH = join(process.cwd(), 'data', '.secret.key');

interface VaultData {
  telegram?: {
    enabled: boolean;
    bot_token?: string;
    chat_id?: string;
    flags?: {
      signals: boolean;
      positions: boolean;
      liquidation: boolean;
      success: boolean;
    };
  };
  [key: string]: any;
}

function ensureDataDir(): void {
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
}

async function getOrCreateKey(): Promise<Buffer> {
  const envKey = process.env.SECRET_KEY;
  if (envKey) {
    return Buffer.from(envKey, 'hex').slice(0, 32);
  }

  if (existsSync(KEY_PATH)) {
    const keyData = readFileSync(KEY_PATH);
    return Buffer.from(keyData.toString('hex'), 'hex');
  }

  const key = randomBytes(32);
  ensureDataDir();
  writeFileSync(KEY_PATH, key.toString('hex'), { mode: 0o600 });
  return key;
}

async function deriveKey(password: Buffer, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, 32)) as Buffer;
}

async function encrypt(data: string): Promise<string> {
  const key = await getOrCreateKey();
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(key, salt);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', derivedKey, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted}`;
}

async function decrypt(encryptedData: string): Promise<string> {
  const key = await getOrCreateKey();
  const [saltHex, ivHex, encrypted] = encryptedData.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const derivedKey = await deriveKey(key, salt);
  const decipher = createDecipheriv('aes-256-cbc', derivedKey, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export async function readVault(): Promise<VaultData> {
  if (!existsSync(VAULT_PATH)) {
    return {};
  }

  try {
    const encrypted = readFileSync(VAULT_PATH, 'utf8');
    if (!encrypted.trim()) {
      return {};
    }
    const decrypted = await decrypt(encrypted);
    return JSON.parse(decrypted) as VaultData;
  } catch (error) {
    // Logger might not be available in config context, use console as fallback
    if (typeof window === 'undefined') {
      // Node.js environment
      const { Logger } = await import('../core/Logger.js');
      Logger.getInstance().error('Failed to read vault:', {}, error as Error);
    } else {
      console.error('Failed to read vault:', error);
    }
    return {};
  }
}

export async function writeVault(payload: VaultData): Promise<void> {
  ensureDataDir();
  const data = JSON.stringify(payload, null, 2);
  const encrypted = await encrypt(data);
  writeFileSync(VAULT_PATH, encrypted, { mode: 0o600 });
}

