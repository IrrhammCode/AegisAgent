import { classifyDataWithImpulse } from './intelligence';
import { generateIntegrityProof } from './zk_proof';
import { uploadToPermanentStorage } from './irys_storage';
import { registerAgentIdentity } from './identity';
import { issueImpactReceipt } from './impact';
import * as fs from 'fs';
import * as path from 'path';

/**
 * AEGIS: Autonomous ZK-Sentinel Unified Orchestrator
 * ==================================================
 * The core logic called by the Python autonomous brain.
 */
async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("Usage: ts-node src/index.ts <TASK_TYPE> <FILE_PATH>");
        process.exit(1);
    }

    const [taskType, filePath] = args;

    try {
        console.log(`\n=================================================`);
        console.log(`🛡️  AEGIS CORE: ${taskType}`);
        console.log(`📂  Target: ${path.basename(filePath)}`);
        console.log(`=================================================\n`);

        // --- STAGE 1: INTELLIGENCE ---
        const classification = await classifyDataWithImpulse(filePath);
        if (!classification.isSensitive) {
            console.log(`[Core] Impulse AI result: Normal data. No security archival needed.`);
            process.exit(0);
        }
        console.log(`[Core] Intelligence Recommendation: ${classification.recommendation}`);

        // --- STAGE 2: PRIVACY (Noir ZK) ---
        console.log(`[Core] Generating ZK-Integrity Proof...`);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const proof = await generateIntegrityProof(fileContent, "hash_dummy");

        // --- STAGE 3: INFRASTRUCTURE (Irys) ---
        console.log(`[Core] Committing to Arweave (Permanent Storage)...`);
        const url = await uploadToPermanentStorage(filePath, [
            { name: "App-Name", value: "Aegis-Sentinel" },
            { name: "Content-Category", value: classification.category },
            { name: "ZK-Proof", value: proof }
        ]);

        // --- STAGE 4: IDENTITY (ERC-8004) ---
        const agentID = await registerAgentIdentity("https://aegis-agent.com/manifest.json");

        // --- STAGE 5: IMPACT (Hypercerts) ---
        const impactToken = await issueImpactReceipt(agentID, url, classification.category);

        // --- OUTPUT FOR PYTHON PARSER ---
        const finalResult = {
            status: "SUCCESS",
            agent_id: agentID,
            storage_url: url,
            impact_token: impactToken,
            classification: classification.category,
            timestamp: new Date().toISOString()
        };

        console.log(`\n✅ Aegis Protection Cycle Complete.`);
        console.log(`__AEGIS_RESULT__:${JSON.stringify(finalResult)}`);

    } catch (error: any) {
        console.error(`\n❌ Aegis Critical Error: ${error.message}`);
        console.log(`__AEGIS_RESULT__:{"status":"ERROR","message":"${error.message}"}`);
        process.exit(1);
    }
}

main();
