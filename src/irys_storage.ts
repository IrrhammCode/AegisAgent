/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AEGIS AGENT — Stage 3: Infrastructure (Arweave via Irys)   ║
 * ║  Permanent, censorship-resistant data archival.             ║
 * ║  SDK: @irys/upload + @irys/upload-ethereum                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { config } from './utils/config';
import { logInfo, logDebug, logWarn, logError } from './utils/logger';

const MODULE = 'Infrastructure';

// ─── Types ───────────────────────────────────────────────────

export interface ArweaveTag {
    name: string;
    value: string;
}

export interface ArchivalResult {
    transactionId: string;
    permanentUrl: string;
    fileSize: number;
    tags: ArweaveTag[];
    timestamp: string;
    isDemo: boolean;
}

// ─── Irys Uploader Initialization ────────────────────────────

async function getIrysUploader() {
    const { Uploader } = await import('@irys/upload');
    const { Ethereum } = await import('@irys/upload-ethereum');

    logDebug(MODULE, `Connecting to Irys node: ${config.irysNode}`);

    const irysUploader = await Uploader(Ethereum).withWallet(config.operatorPrivateKey);
    return irysUploader;
}

// ─── Demo Mode Archival ──────────────────────────────────────

function generateDemoArchival(filePath: string, tags: ArweaveTag[]): ArchivalResult {
    const fileSize = fs.statSync(filePath).size;
    const fileHash = crypto.createHash('sha256')
        .update(fs.readFileSync(filePath))
        .digest('hex')
        .slice(0, 43); // Arweave TX IDs are 43 chars

    const txId = `DEMO_${fileHash}`;

    logInfo(MODULE, `[DEMO] Simulated archival. TX: ${txId}`);

    return {
        transactionId: txId,
        permanentUrl: `https://arweave.net/${txId}`,
        fileSize,
        tags,
        timestamp: new Date().toISOString(),
        isDemo: true
    };
}

// ─── Core Upload Function ────────────────────────────────────

export async function uploadToPermanentStorage(
    filePath: string,
    tags: ArweaveTag[]
): Promise<ArchivalResult> {
    const fileName = path.basename(filePath);
    logInfo(MODULE, `Preparing "${fileName}" for permanent Arweave archival...`);

    // Validate file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const fileSize = fs.statSync(filePath).size;
    logDebug(MODULE, `File size: ${fileSize} bytes`);

    // Check for required private key
    if (!config.operatorPrivateKey) {
        throw new Error('OPERATOR_PRIVATE_KEY is required for Irys archival.');
    }

    // Add standard Aegis tags
    const fullTags: ArweaveTag[] = [
        { name: 'App-Name', value: 'Aegis-ZK-Sentinel' },
        { name: 'App-Version', value: '1.0.0' },
        { name: 'Content-Type', value: detectContentType(filePath) },
        { name: 'Unix-Time', value: Math.floor(Date.now() / 1000).toString() },
        ...tags
    ];

    // Demo mode — simulate the upload
    if (config.isDemoMode) {
        logWarn(MODULE, 'Running in DEMO MODE. Simulating Irys archival.');
        return generateDemoArchival(filePath, fullTags);
    }

    // Production mode — real Irys upload
    try {
        const irys = await getIrysUploader();

        // Check price and fund if necessary
        const price = await irys.getPrice(fileSize);
        logDebug(MODULE, `Upload price: ${price} atomic units`);

        const balance = await irys.getLoadedBalance();
        logDebug(MODULE, `Current balance: ${balance} atomic units`);

        if (balance.lt(price)) {
            logInfo(MODULE, 'Insufficient balance. Auto-funding...');
            const fundAmount = price.multipliedBy(1.2); // 20% buffer
            await irys.fund(fundAmount);
            logInfo(MODULE, `Funded ${fundAmount} atomic units.`);
        }

        // Upload the file
        logInfo(MODULE, 'Uploading to Arweave via Irys...');
        const response = await irys.uploadFile(filePath, { tags: fullTags });

        logInfo(MODULE, `Archival complete! TX ID: ${response.id}`);

        return {
            transactionId: response.id,
            permanentUrl: `https://arweave.net/${response.id}`,
            fileSize,
            tags: fullTags,
            timestamp: new Date().toISOString(),
            isDemo: false
        };
    } catch (error: any) {
        logError(MODULE, `Irys upload failed: ${error.message}`);

        // Fallback to demo mode on network errors
        logWarn(MODULE, 'Falling back to demo archival due to network error.');
        return generateDemoArchival(filePath, fullTags);
    }
}

// ─── Upload Raw Data (for ZK proofs, metadata) ───────────────

export async function uploadDataToPermanentStorage(
    data: string | Buffer,
    tags: ArweaveTag[]
): Promise<ArchivalResult> {
    logInfo(MODULE, 'Archiving raw data to Arweave...');

    const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
    const dataHash = crypto.createHash('sha256').update(dataBuffer).digest('hex');

    const fullTags: ArweaveTag[] = [
        { name: 'App-Name', value: 'Aegis-ZK-Sentinel' },
        { name: 'Data-Hash', value: dataHash },
        ...tags
    ];

    if (config.isDemoMode) {
        const txId = `DEMO_DATA_${dataHash.slice(0, 32)}`;
        return {
            transactionId: txId,
            permanentUrl: `https://arweave.net/${txId}`,
            fileSize: dataBuffer.length,
            tags: fullTags,
            timestamp: new Date().toISOString(),
            isDemo: true
        };
    }

    try {
        const irys = await getIrysUploader();
        const response = await irys.upload(dataBuffer, { tags: fullTags });

        return {
            transactionId: response.id,
            permanentUrl: `https://arweave.net/${response.id}`,
            fileSize: dataBuffer.length,
            tags: fullTags,
            timestamp: new Date().toISOString(),
            isDemo: false
        };
    } catch (error: any) {
        logError(MODULE, `Data upload failed: ${error.message}`);
        const txId = `FALLBACK_${dataHash.slice(0, 32)}`;
        return {
            transactionId: txId,
            permanentUrl: `https://arweave.net/${txId}`,
            fileSize: dataBuffer.length,
            tags: fullTags,
            timestamp: new Date().toISOString(),
            isDemo: true
        };
    }
}

// ─── Helpers ─────────────────────────────────────────────────

function detectContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const types: Record<string, string> = {
        '.json': 'application/json',
        '.txt': 'text/plain',
        '.csv': 'text/csv',
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
    };
    return types[ext] || 'application/octet-stream';
}
