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
        ...(data ? { data } : {})
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
