import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { logInfo, logError } from '../utils/logger';

const MODULE = 'AegisCipher';
const ALGORITHM = 'aes-256-gcm';

// Simulation of an Agent's secure local keyring
const KEYRING_PATH = path.resolve(process.cwd(), '.aegis_keyring.json');

interface CipherMetadata {
    iv: string;
    authTag: string;
}

interface KeyringEntry {
    fileName: string;
    fileHash: string;
    encryptionKeyHex: string;
    timestamp: string;
}

/**
 * Ensures the local keyring exists or creates it.
 */
function initKeyring(): Record<string, KeyringEntry> {
    if (!fs.existsSync(KEYRING_PATH)) {
        fs.writeFileSync(KEYRING_PATH, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(KEYRING_PATH, 'utf-8'));
}

/**
 * Saves a decryption key against a file's hash in the local "enclave".
 */
function saveKeyToRing(fileHash: string, fileName: string, keyBuffer: Buffer) {
    const keyring = initKeyring();
    keyring[fileHash] = {
        fileName,
        fileHash,
        encryptionKeyHex: keyBuffer.toString('hex'),
        timestamp: new Date().toISOString()
    };
    fs.writeFileSync(KEYRING_PATH, JSON.stringify(keyring, null, 2));
}

/**
 * Encrypts a local file using AES-256-GCM.
 * The symmetric key is dynamically generated and stored in `.aegis_keyring.json`.
 * Returns the path to the newly created `.enc` ciphertext file.
 * 
 * @param filePath The path to the plaintext file to encrypt.
 * @param fileHash The SHA-256 hash of the plaintext file.
 */
export async function encryptForVault(filePath: string, fileHash: string): Promise<string> {
    const startTime = Date.now();
    const fileName = path.basename(filePath);
    
    try {
        logInfo(MODULE, `Initiating Vault Encryption for ${fileName}...`);
        
        // 1. Read plaintext
        const plaintextBytes = fs.readFileSync(filePath);

        // 2. Generate secure AES key and IV
        const key = crypto.randomBytes(32); // 256-bit key
        const iv = crypto.randomBytes(16);  // 128-bit IV for GCM

        // 3. Encrypt data
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        const encrypted = Buffer.concat([cipher.update(plaintextBytes), cipher.final()]);
        const authTag = cipher.getAuthTag();

        // 4. Save the key in the Agent's secure keyring simulation
        saveKeyToRing(fileHash, fileName, key);

        // 5. Structure the payload (Ciphertext + Metadata needed for decryption, minus the key)
        const aesMetadata: CipherMetadata = {
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
        
        const payload = JSON.stringify({
            cipherType: ALGORITHM,
            cipherMetadata: aesMetadata,
            ciphertextBase64: encrypted.toString('base64'),
            originalName: fileName
        });

        // 6. Write to disk
        const encryptedPath = `${filePath}.aegis.enc`;
        fs.writeFileSync(encryptedPath, payload);
        
        const timeMs = Date.now() - startTime;
        logInfo(MODULE, `Encrypted payload created in ${timeMs}ms. Key secured in local ring.`);

        return encryptedPath;

    } catch (error: any) {
        logError(MODULE, `Encryption Failed: ${error.message}`);
        throw error;
    }
}
