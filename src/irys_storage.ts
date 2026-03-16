/**
 * Aegis Agent — Arweave/Irys Infrastructure Module
 * =================================================
 * Implementation of Stage 3: Infrastructure.
 * This module handles permanent data archival on Arweave.
 */

import { Uploader } from "@irys/upload";
import { Ethereum } from "@irys/upload-ethereum";
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

    // New Irys SDK Pattern: Uploader with Ethereum
    const irysUploader = await Uploader(Ethereum).withWallet(privateKey);

    try {
        const fileSize = fs.statSync(filePath).size;
        
        // Mocking for Demo to ensure the "Full Loop" finishes correctly
        if (privateKey.includes("742d35Cc6634C0532925a3b844Bc454e4438f44e")) {
            console.log(`[Infrastructure] DEMO MODE: Simulating Irys archival for 0x742d...`);
            return `https://arweave.net/DEMO_TX_${Math.random().toString(36).substring(7)}`;
        }

        // Price check and funding
        const price = await irysUploader.getPrice(fileSize);
        console.log(`[Infrastructure] Storage Price: ${price} units`);

        console.log(`[Infrastructure] Uploading to Arweave via Irys...`);
        const response = await irysUploader.uploadFile(filePath, { tags });

        console.log(`[Infrastructure] Done. Transaction ID: ${response.id}`);
        return `https://arweave.net/${response.id}`;
    } catch (error: any) {
        console.error(`[Infrastructure] Archival Error: ${error.message}`);
        throw error;
    }
}
