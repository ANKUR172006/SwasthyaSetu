import crypto from "crypto";
import { env } from "../config/env";

const key = env.FIELD_ENCRYPTION_KEY
  ? crypto.createHash("sha256").update(env.FIELD_ENCRYPTION_KEY).digest()
  : null;

export const canEncrypt = (): boolean => Boolean(key);

export const encryptField = (plainText: string): string => {
  if (!key) {
    return plainText;
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decryptField = (value: string): string => {
  if (!key) {
    return value;
  }
  const [ivHex, tagHex, dataHex] = value.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
};
