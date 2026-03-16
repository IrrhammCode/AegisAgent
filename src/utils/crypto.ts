/**
 * Aegis Agent — Crypto Utility
 * ============================
 * Provides cryptographic hashing utilities used across the agent,
 * particularly for ZK-proof data preparation and integrity checks.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';

/**
 * Computes SHA-256 hash of a string.
 */
export function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Computes SHA-256 hash of a file's contents.
 */
export function sha256File(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Converts a hex string to a Uint8Array (32 bytes).
 * Used for Noir circuit inputs.
 */
export function hexToBytes32(hex: string): number[] {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes: number[] = [];
    for (let i = 0; i < 64; i += 2) {
        bytes.push(parseInt(clean.substring(i, i + 2), 16));
    }
    return bytes;
}

/**
 * Generates a random nonce for ZK circuit inputs.
 */
export function generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Computes HMAC-SHA256 given data and a key.
 */
export function hmacSha256(data: string, key: string): string {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
}
