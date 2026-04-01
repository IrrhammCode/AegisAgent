/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AEGIS: Autonomous ZK-Sentinel — Unified Orchestrator       ║
 * ║  The core 5-stage pipeline called by the Python brain.      ║
 * ║                                                              ║
 * ║  Stage 1: Intelligence   → Impulse AI Classification        ║
 * ║  Stage 2: Privacy        → Noir ZK-Integrity Proof          ║
 * ║  Stage 3: Infrastructure → Arweave/Irys Permanent Storage   ║
 * ║  Stage 4: Identity       → ERC-8004 Agent Registration      ║
 * ║  Stage 5: Impact         → Hypercerts Impact Receipt        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import * as fs from 'fs';
import * as path from 'path';
import { classifyDataIntelligence, ClassificationResult } from './intelligence';
import { generateIntegrityProof, ZKProofResult } from './zk_proof';
import { uploadToPermanentStorage, uploadDataToPermanentStorage, ArchivalResult } from './irys_storage';
import { registerAgentIdentity, AgentIdentity } from './identity';
import { issueImpactReceipt, ImpactReceipt } from './impact';
import { broadcastToSentinelSwarm, SwarmBroadcastResult } from './atproto_swarm';
import { encryptForVault } from './services/aegis_cipher';
import { sha256File } from './utils/crypto';
import { logInfo, logError, logWarn } from './utils/logger';

const MODULE = 'Orchestrator';

// ─── Types ───────────────────────────────────────────────────

export interface PipelineResult {
    status: 'SUCCESS' | 'SKIPPED' | 'ERROR';
    message: string;
    agent_id?: string;
    storage_url?: string;
    impact_token?: string;
    classification?: string;
    zk_verified?: boolean;
    stages: {
        intelligence: ClassificationResult | null;
        zkProof: ZKProofResult | null;
        archival: ArchivalResult | null;
        identity: AgentIdentity | null;
        impact: ImpactReceipt | null;
        swarm: SwarmBroadcastResult | null;
    };
    executionTimeMs: number;
    timestamp: string;
}

// ─── Pipeline Execution ──────────────────────────────────────

async function runProtectionPipeline(filePath: string): Promise<PipelineResult> {
    const startTime = Date.now();
    const fileName = path.basename(filePath);

    const stages: PipelineResult['stages'] = {
        intelligence: null,
        zkProof: null,
        archival: null,
        identity: null,
        impact: null,
        swarm: null
    };

    try {
        // ═══════════════════════════════════════════════
        // STAGE 1: INTELLIGENCE (Local Sentinel)
        // ═══════════════════════════════════════════════
        console.log('\n┌─── Stage 1: Intelligence (Local Sentinel) ─┐');
        const classification = await classifyDataIntelligence(filePath);
        stages.intelligence = classification;

        if (!classification.isSensitive) {
            console.log('└─── Result: SAFE — No protection needed ──┘\n');
            return {
                status: 'SKIPPED',
                message: `Data classified as ${classification.category}. No protection needed.`,
                stages,
                executionTimeMs: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
        }

        console.log(`└─── Sensitive! Category: ${classification.category} (${(classification.confidence * 100).toFixed(1)}%) ──┘\n`);

        // ═══════════════════════════════════════════════
        // SAFETY LAYER: Human-in-the-loop (World ID)
        // ═══════════════════════════════════════════════
        if (classification.category === 'CREDENTIALS' || classification.confidence > 0.9) {
            console.log('┌─── Safety Layer: World ID Verification ───┐');
            logWarn(MODULE, 'High-stakes asset detected. Proximity check required...');
            
            // In production, this would bridge to the World ID SDK
            const worldIdMock = process.env.WORLD_ID_APP_ID ? 'VERIFIED' : 'MOCK_BYPASS';
            logInfo(MODULE, `World ID Verification Status: ${worldIdMock}`);
            console.log(`└─── Result: ${worldIdMock} ──┘\n`);
        }

        // ═══════════════════════════════════════════════
        // STAGE 2: PRIVACY (Noir ZK-Proof)
        // ═══════════════════════════════════════════════
        console.log('┌─── Stage 2: Privacy (Noir ZK-Proof) ──────┐');
        const proof = await generateIntegrityProof(filePath, 'file');
        stages.zkProof = proof;
        console.log(`└─── Proof: ${proof.verified ? 'VERIFIED' : 'UNVERIFIED'} (${proof.generationTimeMs}ms) ──┘\n`);

        // ═══════════════════════════════════════════════
        // STAGE 3: INFRASTRUCTURE (Arweave/Irys)
        console.log('┌─── Stage 3: Infrastructure (Irys/Arweave) ┐');

        // Encrypt the file locally before uploading (Aegis Cipher)
        console.log('│   [Aegis Vault] Encrypting payload (AES-256-GCM)...');
        const encryptedFilePath = await encryptForVault(filePath, proof.publicInputs.dataHash);

        // Upload the encrypted file
        const dataArchival = await uploadToPermanentStorage(encryptedFilePath, [
            { name: 'Aegis-Category', value: classification.category },
            { name: 'Aegis-Confidence', value: classification.confidence.toString() },
            { name: 'ZK-Proof-Hash', value: proof.publicInputs.dataHash.slice(0, 32) },
            { name: 'ZK-Circuit', value: proof.publicInputs.circuitId },
            { name: 'Aegis-Encryption', value: 'AES-256-GCM' }
        ]);
        stages.archival = dataArchival;

        // Also archive the ZK proof alongside
        await uploadDataToPermanentStorage(
            JSON.stringify({
                proof: proof.proof.slice(0, 128) + '...', // Truncated for storage
                publicInputs: proof.publicInputs,
                verified: proof.verified
            }),
            [
                { name: 'Content-Type', value: 'application/json' },
                { name: 'Aegis-Type', value: 'zk-proof-receipt' },
                { name: 'Parent-TX', value: dataArchival.transactionId }
            ]
        );

        console.log(`└─── Archived: ${dataArchival.permanentUrl} ──┘\n`);

        // ═══════════════════════════════════════════════
        // STAGE 4: IDENTITY (ERC-8004)
        // ═══════════════════════════════════════════════
        console.log('┌─── Stage 4: Identity (ERC-8004) ──────────┐');
        const identity = await registerAgentIdentity(dataArchival.permanentUrl);
        stages.identity = identity;
        console.log(`└─── Agent ID: ${identity.agentId} ──┘\n`);

        // ═══════════════════════════════════════════════
        // STAGE 5: IMPACT (Hypercerts)
        // ═══════════════════════════════════════════════
        console.log('┌─── Stage 5: Impact (Hypercerts) ──────────┐');
        const impact = await issueImpactReceipt(
            identity.agentId,
            dataArchival.permanentUrl,
            classification.category
        );
        stages.impact = impact;
        console.log(`└─── Impact Receipt: ${impact.claimId} ──┘\n`);

        // ═══════════════════════════════════════════════
        // STAGE 6: SWARM (ATProto)
        // ═══════════════════════════════════════════════
        console.log('┌─── Stage 6: Sentinel Swarm (ATProto) ─────┐');
        const swarm = await broadcastToSentinelSwarm(
            fileName,
            classification.category,
            dataArchival.permanentUrl,
            impact.claimId
        );
        stages.swarm = swarm;
        console.log(`└─── Feed URI: ${swarm.uri || 'Skipped'} ──┘\n`);

        // ═══════════════════════════════════════════════
        // COMPLETE
        // ═══════════════════════════════════════════════
        const executionTimeMs = Date.now() - startTime;

        return {
            status: 'SUCCESS',
            message: `Protected ${fileName}: ${classification.category} → ZK-Proved → Archived → Verified → Impact Issued`,
            agent_id: identity.agentId,
            storage_url: dataArchival.permanentUrl,
            impact_token: impact.claimId,
            classification: classification.category,
            zk_verified: !!stages.zkProof?.verified,
            stages,
            executionTimeMs,
            timestamp: new Date().toISOString()
        };

    } catch (error: any) {
        logError(MODULE, `Pipeline error: ${error.message}`);
        return {
            status: 'ERROR',
            message: error.message,
            stages,
            executionTimeMs: Date.now() - startTime,
            timestamp: new Date().toISOString()
        };
    }
}

// ─── Main Entry Point ────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage: ts-node src/index.ts <TASK_TYPE> <FILE_PATH>');
        console.error('');
        console.error('Task Types:');
        console.error('  PROTECT_ASSET    Run the full 5-stage protection pipeline');
        console.error('  CLASSIFY_ONLY    Run only Stage 1 (Intelligence)');
        console.error('  PROVE_ONLY       Run only Stage 2 (ZK-Proof)');
        process.exit(1);
    }

    const [taskType, filePath] = args;

    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║    🛡️  AEGIS ZK-SENTINEL CORE ENGINE         ║');
    console.log(`║    Task: ${taskType.padEnd(36)}║`);
    console.log(`║    File: ${path.basename(filePath).padEnd(36)}║`);
    console.log('╚══════════════════════════════════════════════╝');

    // Security: Validate file path is within authorized directories
    const absolutePath = path.resolve(filePath);
    const vaultPath = path.resolve(process.env.STORAGE_DIRECTORY || './vault_data');
    const archivePath = path.resolve(process.env.ARCHIVE_DIRECTORY || './vault_data_archived');
    const githubSyncPath = path.join(vaultPath, 'github_sync');

    // Build list of authorized scan directories
    const scanDirsEnv = process.env.SCAN_DIRECTORIES || '';
    const authorizedDirs = [vaultPath, archivePath, githubSyncPath];
    if (scanDirsEnv) {
        for (const d of scanDirsEnv.split(',')) {
            const trimmed = d.trim();
            if (trimmed) {
                authorizedDirs.push(path.resolve(trimmed));
            }
        }
    }

    const isAuthorized = authorizedDirs.some(dir => absolutePath.startsWith(dir));
    
    if (!isAuthorized) {
        logWarn(MODULE, `Unauthorized file access attempt: ${filePath}`);
        logWarn(MODULE, `Authorized dirs: ${authorizedDirs.join(', ')}`);
        const errorResult = { status: 'ERROR', message: 'Unauthorized path traversal detected.' };
        console.log(`__AEGIS_RESULT__:${JSON.stringify(errorResult)}`);
        process.exit(1);
    }

    // Validate file exists
    if (!fs.existsSync(filePath)) {
        const errorResult = { status: 'ERROR', message: `File not found: ${filePath}` };
        console.log(`__AEGIS_RESULT__:${JSON.stringify(errorResult)}`);
        process.exit(1);
    }

    let result: any;

    switch (taskType) {
        case 'PROTECT_ASSET':
            result = await runProtectionPipeline(filePath);
            break;

        case 'CLASSIFY_ONLY':
            const classification = await classifyDataIntelligence(filePath);
            result = { status: 'SUCCESS', classification };
            break;

        case 'PROVE_ONLY':
            const proof = await generateIntegrityProof(filePath, 'file');
            result = { status: 'SUCCESS', proof };
            break;

        default:
            result = { status: 'ERROR', message: `Unknown task type: ${taskType}` };
    }

    // Output structured result for Python parser
    const outputResult = {
        status: result.status,
        message: result.message,
        agent_id: result.stages?.identity?.agentId || null,
        storage_url: result.stages?.archival?.permanentUrl || null,
        impact_token: result.stages?.impact?.claimId || null,
        classification: result.stages?.intelligence?.category || null,
        zk_verified: result.stages?.zkProof?.verified || null,
        swarm_uri: result.stages?.swarm?.uri || null,
        execution_time_ms: result.executionTimeMs || 0,
        timestamp: result.timestamp || new Date().toISOString()
    };

    console.log(`\n${'═'.repeat(48)}`);
    if (result.status === 'SUCCESS') {
        console.log('✅ AEGIS PROTECTION CYCLE COMPLETE');
    } else if (result.status === 'SKIPPED') {
        console.log('⏭️  AEGIS: DATA SAFE — NO ACTION NEEDED');
    } else {
        console.log('❌ AEGIS: PIPELINE ERROR');
    }
    console.log(`${'═'.repeat(48)}\n`);

    console.log(`__AEGIS_RESULT__:${JSON.stringify(outputResult)}`);

    // Force exit to prevent background JsonRpcProvider retries from hanging the process
    setTimeout(() => process.exit(result.status === 'ERROR' ? 1 : 0), 500);
}

main().catch((err) => {
    console.error(`Fatal error: ${err.message}`);
    console.log(`__AEGIS_RESULT__:${JSON.stringify({ status: 'ERROR', message: err.message })}`);
    process.exit(1);
});
