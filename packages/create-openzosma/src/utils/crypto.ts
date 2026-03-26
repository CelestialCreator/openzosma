import { randomBytes } from "node:crypto"

/**
 * Generate a cryptographically secure AUTH_SECRET (32 bytes, base64-encoded).
 * Used by Better Auth for session signing.
 */
export const generateAuthSecret = (): string => {
	return randomBytes(32).toString("base64")
}

/**
 * Generate a cryptographically secure ENCRYPTION_KEY (32 bytes, 64-char hex string).
 * Used for AES-256 encryption of integration credentials stored in DB.
 */
export const generateEncryptionKey = (): string => {
	return randomBytes(32).toString("hex")
}
