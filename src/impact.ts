/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AEGIS AGENT — Stage 5: Impact Evaluation (Hypercerts)      ║
 * ║  Verifiable on-chain impact receipts for agent actions.     ║
 * ║  SDK: @hypercerts-org/sdk (ERC-1155 semi-fungible tokens)   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import * as crypto from 'crypto';
import { config } from './utils/config';
import { logInfo, logDebug, logWarn, logError } from './utils/logger';

const MODULE = 'Impact';

// ─── Types ───────────────────────────────────────────────────

export interface HypercertMetadata {
    name: string;
    description: string;
    image: string;
    external_url: string;
    work_scope: string[];
    work_timeframe: { start: number; end: number };
    impact_scope: string[];
    impact_timeframe: { start: number; end: number };
    contributors: string[];
    rights: string[];
    properties: { trait_type: string; value: string }[];
}

export interface ImpactReceipt {
    claimId: string;
    metadata: HypercertMetadata;
    totalUnits: number;
    transferRestriction: string;
    transactionHash: string | null;
    isDemo: boolean;
    timestamp: string;
}

// ─── Metadata Builder ────────────────────────────────────────

function buildHypercertMetadata(
    agentId: string,
    arweaveUrl: string,
    category: string,
    fileCount: number = 1
): HypercertMetadata {
    const now = Math.floor(Date.now() / 1000);
    const startOfDay = now - (now % 86400);

    return {
        name: `Aegis Digital Rights Protection: ${category}`,
        description: [
            `The Aegis Autonomous ZK-Sentinel (Agent ID: ${agentId}) has successfully`,
            `detected, verified, and permanently archived ${fileCount} sensitive data`,
            `asset(s) categorized as "${category}".`,
            '',
            `Each asset was processed through a 5-stage pipeline:`,
            `1. ML Classification (Impulse AI)`,
            `2. ZK Integrity Proof (Noir)`,
            `3. Permanent Archival (Arweave/Irys)`,
            `4. Agent Identity Verification (ERC-8004)`,
            `5. Impact Receipt (This Hypercert)`,
            '',
            `Archived at: ${arweaveUrl}`
        ].join('\n'),
        image: 'ipfs://bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52ue', // Placeholder
        external_url: arweaveUrl,
        work_scope: [
            'Digital Rights Protection',
            'Autonomous Data Security',
            'Zero-Knowledge Verification',
            'Permanent Data Archival'
        ],
        work_timeframe: {
            start: startOfDay,
            end: now
        },
        impact_scope: [
            'Data Privacy',
            'Censorship Resistance',
            'Decentralized Infrastructure',
            'Human Rights'
        ],
        impact_timeframe: {
            start: startOfDay,
            end: now + 86400 * 365 // Impact lasts 1 year
        },
        contributors: [
            `Aegis Agent (${agentId})`,
            'Autonomous ZK-Sentinel System'
        ],
        rights: ['Public Display'],
        properties: [
            { trait_type: 'Agent ID', value: agentId },
            { trait_type: 'Category', value: category },
            { trait_type: 'Storage Network', value: 'Arweave' },
            { trait_type: 'Proof System', value: 'Noir ZK' },
            { trait_type: 'Identity Standard', value: 'ERC-8004' },
            { trait_type: 'Pipeline Version', value: '1.0.0' }
        ]
    };
}

// ─── Core Impact Issuance ────────────────────────────────────

export async function issueImpactReceipt(
    agentId: string,
    arweaveUrl: string,
    category: string,
    fileCount: number = 1
): Promise<ImpactReceipt> {
    logInfo(MODULE, 'Preparing Hypercert impact receipt...');

    const metadata = buildHypercertMetadata(agentId, arweaveUrl, category, fileCount);
    const totalUnits = fileCount * 1000; // 1000 units per file protected

    logDebug(MODULE, `Impact scope: ${metadata.impact_scope.join(', ')}`);
    logDebug(MODULE, `Total units: ${totalUnits}`);

    // Demo mode — simulate minting
    if (config.isDemoMode) {
        logWarn(MODULE, 'Demo mode — simulating Hypercert mint.');

        const claimId = `HC-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

        logInfo(MODULE, `Impact receipt generated: ${claimId}`);
        logDebug(MODULE, `Metadata:\n${JSON.stringify(metadata, null, 2)}`);

        return {
            claimId,
            metadata,
            totalUnits,
            transferRestriction: 'FromCreatorOnly',
            transactionHash: null,
            isDemo: true,
            timestamp: new Date().toISOString()
        };
    }

    // Production mode — mint via Hypercerts SDK
    try {
        logInfo(MODULE, 'Connecting to Hypercerts SDK...');

        const { HypercertClient } = await import('@hypercerts-org/sdk');

        // Create wallet client for SDK
        const provider = new ethers.JsonRpcProvider(config.ethRpcUrl);
        const wallet = new ethers.Wallet(config.operatorPrivateKey, provider);

        // Initialize Hypercerts client
        // Note: The SDK expects a viem WalletClient. For ethers.js compatibility,
        // we use the metadata preparation and call the contract directly if needed.
        const client = new HypercertClient({
            environment: config.hypercertsEnvironment as any,
        });

        // Format metadata using SDK helper if available
        logInfo(MODULE, 'Minting Hypercert...');

        // Attempt to mint
        const tx = await client.mintHypercert({
            metaData: metadata as any,
            totalUnits: BigInt(totalUnits),
            transferRestriction: 2, // FromCreatorOnly
        });

        logInfo(MODULE, `Hypercert minted! TX: ${tx}`);

        return {
            claimId: `HC-${typeof tx === 'string' ? tx.slice(0, 16) : crypto.randomBytes(8).toString('hex')}`,
            metadata,
            totalUnits,
            transferRestriction: 'FromCreatorOnly',
            transactionHash: typeof tx === 'string' ? tx : null,
            isDemo: false,
            timestamp: new Date().toISOString()
        };

    } catch (error: any) {
        logError(MODULE, `Hypercert minting failed: ${error.message}`);
        logWarn(MODULE, 'Falling back to demo receipt.');

        const claimId = `HC-FALLBACK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        return {
            claimId,
            metadata,
            totalUnits,
            transferRestriction: 'FromCreatorOnly',
            transactionHash: null,
            isDemo: true,
            timestamp: new Date().toISOString()
        };
    }
}

// ─── CLI Entry Point ─────────────────────────────────────────

if (require.main === module) {
    issueImpactReceipt(
        'AEGIS-TEST-001',
        'https://arweave.net/test_tx_id',
        'PII',
        1
    ).then((receipt) => {
        console.log('\n=== Impact Receipt ===');
        console.log(JSON.stringify(receipt, null, 2));
    }).catch(console.error);
}
