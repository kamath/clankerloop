/**
 * Decrypts an encrypted user ID using AES-256-GCM
 * @param encryptedUserId - Base64 encoded encrypted string (format: salt:iv:encrypted:tag)
 * @param password - The password to use for decryption (defaults to WORKOS_COOKIE_PASSWORD)
 * @returns The decrypted user ID
 */
export async function decryptUserId(
  encryptedUserId: string,
  password: string = process.env.WORKOS_COOKIE_PASSWORD!
): Promise<string> {
  if (!password) {
    throw new Error("WORKOS_COOKIE_PASSWORD environment variable is not set");
  }

  // Decode from base64
  const combined = new Uint8Array(
    Uint8Array.from(atob(encryptedUserId), (c) => c.charCodeAt(0))
  );

  // Extract components
  const SALT_LENGTH = 16;
  const IV_LENGTH = 16;
  const TAG_LENGTH = 16;

  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const encrypted = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    combined.length - TAG_LENGTH
  );
  const tag = combined.subarray(combined.length - TAG_LENGTH);

  // Derive key from password using Web Crypto API (Cloudflare Workers compatible)
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  // Combine encrypted data with tag (AES-GCM requires tag to be appended)
  const ciphertextWithTag = new Uint8Array(encrypted.length + tag.length);
  ciphertextWithTag.set(encrypted);
  ciphertextWithTag.set(tag, encrypted.length);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
      tagLength: 128, // 128 bits = 16 bytes
    },
    key,
    ciphertextWithTag
  );

  return new TextDecoder().decode(decrypted);
}

