import { registerAgentIdentity } from './identity';
import { generateIntegrityProof } from './zk_proof';
import { uploadToPermanentStorage } from './irys_storage';
import { classifyDataWithImpulse } from './intelligence';
import { issueImpactReceipt } from './impact';
import * as fs from 'fs';

/**
 * AEGIS Unified Orchestrator — 5-Stage Puzzle Loop
 * =================================================
 * 1. Intelligence: Classify data with Impulse AI
 * 2. Privacy: Generate ZK-Proof with Noir
 * 3. Infrastructure: Archive permanently with Irys (Arweave)
 * 4. Identity: Verify/Log with ERC-8004
 * 5. Impact: Issue Receipt with Hypercerts
 */
async function runAegisAutonomousLoop(taskType: string, dataPath: string) {
    console.log(`\n🛡️ AEGIS SENTINEL: Autonomous Loop Initiated`);
    console.log(`Target: ${dataPath}\n`);

    try {
        // STAGE 1: INTELLIGENCE (Impulse AI)
        const classification = await classifyDataWithImpulse(dataPath);
        if (!classification.isSensitive) {
            console.log(`[Sentinel] Data classified as non-sensitive. Skipping protection loop.`);
            return;
        }
        console.log(`[Sentinel] Data classified as ${classification.category} (${(classification.confidence * 100).toFixed(1)}% confidence).`);

        // STAGE 2: PRIVACY (Noir ZK)
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const zkProof = await generateIntegrityProof(fileContent, "sha256_mock");

        // STAGE 3: INFRASTRUCTURE (Irys/Arweave)
        const arweaveUrl = await uploadToPermanentStorage(dataPath, [
            { name: "App-Name", value: "Aegis-ZK-Sentinel" },
            { name: "ZK-Proof", value: zkProof },
            { name: "Content-Type", value: "application/json" }
        ]);

        // STAGE 4: IDENTITY (ERC-8004)
        const agentID = await registerAgentIdentity("https://aegis-agent.com/manifest.json");

        // STAGE 5: IMPACT (Hypercerts)
        const cid = arweaveUrl.split('/').pop() || "unknown";
        const claimID = await issueImpactReceipt(agentID, cid, "PERMANENT_VAULTING");

        console.log(`\n✅ [FINAL RESULT] Aegis has successfully protected this asset.`);
        console.log(`- Agent ID: ${agentID}`);
        printResult({
            status: "SUCCESS",
            url: arweaveUrl,
            proof: zkProof,
            agent_id: agentID,
            impact_id: claimID,
            category: classification.category
        });

    } catch (error: any) {
        console.error(`\n❌ [FAILURE] Aegis Loop Aborted: ${error.message}`);
        printResult({ status: "FAILED", message: error.message });
        process.exit(1);
    }
}

function printResult(data: any) {
    console.log(`\n__AEGIS_RESULT__:${JSON.stringify(data)}`);
}

const args = process.argv.slice(2);
if (args.length >= 2) {
    runAegisAutonomousLoop(args[0], args[1]);
} else {
    console.error("Usage: npx ts-node src/index.ts <task_type> <data_path>");
}
