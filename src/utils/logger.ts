/**
 * Aegis Agent — Structured Logger Utility
 * ========================================
 * Provides consistent, timestamped logging across all modules.
 * Outputs both to console and to a structured JSON log file.
 */

import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'CRITICAL';

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    module: string;
    message: string;
    data?: Record<string, any>;
}

const LOG_DIR = path.resolve(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'aegis_runtime.log');

/**
 * Security: Sanitize and truncate data before logging to prevent 
 * credential leakage or log flooding.
 */
function sanitizeData(data: any): any {
    if (!data) return data;
    
    // Convert to string to check size and content
    const raw = JSON.stringify(data);
    
    // Truncate large blobs (like file content samples)
    if (raw.length > 1024) {
        return { _info: "Data truncated for security/size", _length: raw.length };
    }

    // Redact obvious keys/secrets in object keys
    const sanitized = { ...data };
    const secretKeys = ['privateKey', 'apiKey', 'secret', 'mnemonic', 'token', 'password'];
    
    for (const key of Object.keys(sanitized)) {
        if (secretKeys.some(sk => key.toLowerCase().includes(sk))) {
            sanitized[key] = "[REDACTED]";
        }
    }

    return sanitized;
}

function ensureLogDir(): void {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
}

export function log(level: LogLevel, module: string, message: string, data?: Record<string, any>): void {
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        module,
        message,
        data: data ? sanitizeData(data) : undefined
    };

    // Pretty console output
    const prefix = `[${module}]`;
    const icon = level === 'ERROR' || level === 'CRITICAL' ? '❌' :
                 level === 'WARN' ? '⚠️' :
                 level === 'DEBUG' ? '🔍' : '✅';
    console.log(`${icon} ${prefix} ${message}`);

    // Append to file
    ensureLogDir();
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

export function logInfo(module: string, message: string, data?: Record<string, any>): void {
    log('INFO', module, message, data);
}

export function logError(module: string, message: string, data?: Record<string, any>): void {
    log('ERROR', module, message, data);
}

export function logWarn(module: string, message: string, data?: Record<string, any>): void {
    log('WARN', module, message, data);
}

export function logDebug(module: string, message: string, data?: Record<string, any>): void {
    log('DEBUG', module, message, data);
}
