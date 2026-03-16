/**
 * Aegis Agent — Arweave/Irys Infrastructure Module
 * =================================================
 * Implementation of Stage 3: Infrastructure.
 * This module handles permanent data archival on Arweave.
 */

import Irys from "@irys/sdk";
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

export async function uploadToPermanentStorage(filePath: string, tags: { name: string, value: string }[]): Promise<string> {
    const fileName = path.basename(filePath);
    console.log(`[Infrastructure] Preparing ${fileName} for Arweave archival...`);
    
    // Use private key from .env
    const privateKey = process.env.OPERATOR_PRIVATE_KEY;
    if (!privateKey) throw new Error("OPERATOR_PRIVATE_KEY is missing in .env");

    const irys = new Irys({
        url: process.env.IRYS_NODE || "https://devnet.irys.xyz", 
        token: process.env.IRYS_TOKEN || "ethereum",
        key: privateKey,
    });

    try {
        const fileSize = fs.statSync(filePath).size;
        
        // Ensure funding (Automatic funding logic)
        const price = await irys.getPrice(fileSize);
        const balance = await irys.getLoadedBalance();
        
        if (balance.lt(price)) {
            console.log(`[Infrastructure] Low balance (${irys.utils.fromAtomic(balance)}). Funding node...`);
            await irys.fund(price.multipliedBy(1.1)); // Fund 10% extra
        }

        console.log(`[Infrastructure] Uploading to Arweave via Irys...`);
        const response = await irys.uploadFile(filePath, { tags });

        console.log(`[Infrastructure] Done. Transaction ID: ${response.id}`);
        return `https://arweave.net/${response.id}`;
    } catch (error: any) {
        console.error(`[Infrastructure] Archival Error: ${error.message}`);
        throw error;
    }
}
