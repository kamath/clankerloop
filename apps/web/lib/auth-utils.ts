import { createCipheriv, randomBytes, pbkdf2Sync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

/**
 * Derives a key from a password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha256");
}

/**
 * Encrypts a user ID using AES-256-GCM
 * @param userId - The user ID to encrypt
 * @param password - The password to use for encryption (defaults to WORKOS_COOKIE_PASSWORD)
 * @returns Base64 encoded encrypted string (format: salt:iv:encrypted:tag)
 */
export function encryptUserId(
  userId: string,
  password: string = process.env.WORKOS_COOKIE_PASSWORD!
): string {
  if (!password) {
    throw new Error("WORKOS_COOKIE_PASSWORD environment variable is not set");
  }

  // Generate random salt and IV
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  // Derive key from password
  const key = deriveKey(password, salt);

  // Create cipher
  const cipher = createCipheriv(ALGORITHM, key, iv);

  // Encrypt
  let encrypted = cipher.update(userId, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Get auth tag
  const tag = cipher.getAuthTag();

  // Combine: salt:iv:encrypted:tag
  const combined = Buffer.concat([salt, iv, encrypted, tag]);

  // Return as base64
  return combined.toString("base64");
}
