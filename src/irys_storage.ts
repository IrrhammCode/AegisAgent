/**
 * Aegis Agent — Arweave/Irys Infrastructure Module
 * =================================================
 * Handles permanent data storage on Arweave using the Irys SDK.
 * This satisfies the "Infrastructure" track requirement by providing
 * uncensorable, permanent archival of protected data.
 */

import Irys from "@irys/sdk";
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

export async function uploadToPermanentStorage(filePath: string, tags: { name: string, value: string }[]): Promise<string> {
    console.log(`[Infrastructure] Initializing Irys client (Arweave)...`);
    
    const irys = new Irys({
        url: process.env.IRYS_NODE || "https://devnet.irys.xyz", 
        token: process.env.IRYS_TOKEN || "ethereum",
        key: process.env.OPERATOR_PRIVATE_KEY,
    });

    try {
        const fileSize = fs.statSync(filePath).size;
        console.log(`[Infrastructure] Checking funding for ${fileSize} bytes...`);
        
        // Price check
        const price = await irys.getPrice(fileSize);
        console.log(`[Infrastructure] Price: ${irys.utils.fromAtomic(price)} ${irys.token}`);

        console.log(`[Infrastructure] Uploading ${filePath} to Arweave...`);
        const response = await irys.uploadFile(filePath, { tags });

        console.log(`[Infrastructure] Permanent Upload Successful! ID: ${response.id}`);
        return `https://arweave.net/${response.id}`;
    } catch (error: any) {
        console.error(`[Infrastructure] Arweave upload failed: ${error.message}`);
        throw error;
    }
}

if (require.main === module) {
    // Test with a dummy file if path provided
    const args = process.argv.slice(2);
    if (args.length > 0) {
        uploadToPermanentStorage(args[0], [{ name: "Content-Type", value: "text/plain" }]).catch(console.error);
    }
}
