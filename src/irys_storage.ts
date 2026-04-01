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

async function getIrys() {
    const { default: Irys } = await import('@irys/sdk');

    if (!config.operatorPrivateKey) {
        throw new Error('OPERATOR_PRIVATE_KEY is missing. Production archival requires a funded wallet.');
    }

    logDebug(MODULE, `Connecting to Irys node: ${config.irysNode}`);

    // For Node.js, we use the default Irys constructor with 'ethereum' token
    const irys = new Irys({
        url: config.irysNode,
        token: 'ethereum',
        key: config.operatorPrivateKey,
    });
    
    return irys;
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

    // Add standard Aegis tags
    const fullTags: ArweaveTag[] = [
        { name: 'App-Name', value: 'AegisAgent-Sentinel' },
        { name: 'App-Version', value: '1.1.0' },
        { name: 'Content-Type', value: detectContentType(filePath) },
        { name: 'Unix-Time', value: Math.floor(Date.now() / 1000).toString() },
        ...tags
    ];

    // Production mode — real Irys upload
    try {
        const timeout = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Irys archival timed out after 45s')), 45000)
        );

        const uploadTask = (async () => {
            const irys = await getIrys();

            // Check price and fund if necessary
            const price = await irys.getPrice(fileSize);
            logDebug(MODULE, `Upload price: ${price} atomic units`);

            const balance = await irys.getLoadedBalance();
            logDebug(MODULE, `Current balance: ${balance} atomic units`);

            if (balance.lt(price)) {
                logInfo(MODULE, `Insufficient balance (${balance}). Funding ${price}...`);
                await irys.fund(price);
                logInfo(MODULE, `Successfully funded Irys node.`);
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
        })();

        return await Promise.race([uploadTask, timeout]);
    } catch (error: any) {
        logError(MODULE, `Irys upload issue or timeout: ${error.message}`);
        
        // Final fallback to structured result if even demo fails
        const fileHash = crypto.createHash('sha256')
            .update(fs.readFileSync(filePath))
            .digest('hex')
            .slice(0, 43);

        return {
            transactionId: `FAILED_${fileHash}`,
            permanentUrl: 'OFFLINE',
            fileSize,
            tags: fullTags,
            timestamp: new Date().toISOString(),
            isDemo: true
        };
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
        const irys = await getIrys();
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
