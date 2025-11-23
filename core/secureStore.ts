import fs from "fs";
import path from "path";
import crypto from "crypto";

const baseDir = path.resolve(process.cwd(), "data/secure");
const filePath = path.join(baseDir, "integrations.telegram.json.enc");
const keyHex = process.env.TELEGRAM_VAULT_KEY || "";

function getKey() {
  const b = Buffer.from(keyHex, /^[A-Fa-f0-9]+$/.test(keyHex) ? "hex" : "base64");
  if (b.length !== 32) console.error("Invalid TELEGRAM_VAULT_KEY");
  return b;
}

export function readTelegramConfig(): any | null {
  if (!fs.existsSync(filePath)) return null;
  const key = getKey();
  const buf = fs.readFileSync(filePath);
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(dec.toString("utf-8"));
}

export function writeTelegramConfig(obj: any) {
  fs.mkdirSync(baseDir, { recursive: true });
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(obj))), cipher.final()]);
  const tag = cipher.getAuthTag();
  const out = Buffer.concat([iv, tag, enc]);
  fs.writeFileSync(filePath, out);
}
