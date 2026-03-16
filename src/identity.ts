/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AEGIS AGENT — Stage 4: Identity (ERC-8004)                 ║
 * ║  On-chain agent registration on Ethereum Sepolia.           ║
 * ║  Registry: 0xf66e7CBdAE1Cb710fee7732E4e1f173624e137A7       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { config } from './utils/config';
import { logInfo, logDebug, logWarn, logError } from './utils/logger';

const MODULE = 'Identity';

// ─── ERC-8004 Contract Configuration ─────────────────────────

/**
 * ERC-8004 Identity Registry on Sepolia.
 * Confirmed from: https://github.com/ercs/erc-8004/tree/main/contracts
 *
 * Each agent is identified by a unique ERC-721 NFT token.
 * The tokenURI (agentURI) resolves to a registration file (agent.json).
 */
const SEPOLIA_REGISTRIES = {
    identity: '0xf66e7CBdAE1Cb710fee7732E4e1f173624e137A7',
    reputation: '0x6E2a285294B5c74CB76d76AB77C1ef15c2A9E407',
    validation: '0xC26171A3c4e1d958cEA196A5e84B7418C58DCA2C'
};

const IDENTITY_REGISTRY_ABI = [
    // ERC-721 + ERC-8004 extensions
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function balanceOf(address owner) view returns (uint256)',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function totalSupply() view returns (uint256)',
    // ERC-8004 specific
    'function register(string metadataURI) returns (uint256)',
    'function updateURI(uint256 tokenId, string metadataURI)',
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

// ─── Types ───────────────────────────────────────────────────

export interface AgentIdentity {
    agentId: string;
    agentRegistry: string;
    operatorAddress: string;
    metadataURI: string;
    registeredOnChain: boolean;
    network: string;
    timestamp: string;
}

// ─── Registration File Builder ───────────────────────────────

/**
 * Builds the agent registration file as per ERC-8004 spec.
 * This JSON file describes the agent's capabilities and endpoints.
 */
export function buildRegistrationFile(): object {
    // Load agent.json manifest
    const agentManifest = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '../agent.json'), 'utf-8')
    );

    return {
        type: 'AutonomousAgent',
        name: agentManifest.agent_name || 'Aegis ZK-Sentinel',
        description: 'Autonomous guardian for digital rights. Detects, proves, and archives sensitive data using ZK-proofs on Arweave.',
        version: '1.0.0',
        capabilities: agentManifest.supported_tools || [],
        endpoints: {
            a2a: null, // Agent-to-Agent protocol (future)
            mcp: null  // Model Context Protocol (future)
        },
        wallets: [
            {
                chain: 'eip155:11155111', // Sepolia
                address: config.operatorPrivateKey
                    ? new ethers.Wallet(config.operatorPrivateKey).address
                    : '0x0000000000000000000000000000000000000000'
            }
        ],
        registries: SEPOLIA_REGISTRIES,
        constraints: agentManifest.compute_constraints || {}
    };
}

// ─── Core Registration ───────────────────────────────────────

export async function registerAgentIdentity(metadataURI: string): Promise<AgentIdentity> {
    logInfo(MODULE, 'Initiating ERC-8004 identity verification...');

    // Demo mode — return a mock identity
    if (config.isDemoMode) {
        logWarn(MODULE, 'Demo mode — generating mock Agent ID.');

        const mockWallet = ethers.Wallet.createRandom();
        const mockId = `AEGIS-${Date.now().toString(36).toUpperCase()}`;

        return {
            agentId: mockId,
            agentRegistry: `eip155:11155111:${SEPOLIA_REGISTRIES.identity}`,
            operatorAddress: mockWallet.address,
            metadataURI,
            registeredOnChain: false,
            network: 'sepolia',
            timestamp: new Date().toISOString()
        };
    }

    // Production mode — interact with on-chain registry
    try {
        const provider = new ethers.JsonRpcProvider(config.ethRpcUrl);
        const wallet = new ethers.Wallet(config.operatorPrivateKey, provider);
        const registry = new ethers.Contract(
            SEPOLIA_REGISTRIES.identity,
            IDENTITY_REGISTRY_ABI,
            wallet
        );

        logDebug(MODULE, `Operator: ${wallet.address}`);
        logDebug(MODULE, `Registry: ${SEPOLIA_REGISTRIES.identity}`);

        // Check if the operator already has an agent registered
        const balance = await registry.balanceOf(wallet.address);
        logDebug(MODULE, `Existing registrations for operator: ${balance}`);

        if (balance > 0n) {
            // Find the agent's token ID (simplified: use first token)
            logInfo(MODULE, 'Agent already registered. Retrieving ID...');

            // Query Transfer events to find tokenId
            const filter = registry.filters.Transfer(ethers.ZeroAddress, wallet.address);
            const events = await registry.queryFilter(filter);

            if (events.length > 0) {
                const lastEvent = events[events.length - 1] as any;
                const tokenId = lastEvent.args?.[2]?.toString() || lastEvent.topics?.[3] ? BigInt(lastEvent.topics[3]).toString() : '0';
                const tokenURI = await registry.tokenURI(tokenId);

                logInfo(MODULE, `Agent ID: ${tokenId}, URI: ${tokenURI}`);

                return {
                    agentId: tokenId,
                    agentRegistry: `eip155:11155111:${SEPOLIA_REGISTRIES.identity}`,
                    operatorAddress: wallet.address,
                    metadataURI: tokenURI,
                    registeredOnChain: true,
                    network: 'sepolia',
                    timestamp: new Date().toISOString()
                };
            }
        }

        // Register new agent
        logInfo(MODULE, 'Registering new agent on-chain...');
        const tx = await registry.register(metadataURI);
        logInfo(MODULE, `Transaction sent: ${tx.hash}`);

        const receipt = await tx.wait();
        logInfo(MODULE, `Transaction confirmed in block ${receipt?.blockNumber}`);

        // Extract token ID from Transfer event
        const transferEvent = receipt?.logs?.find(
            (log: any) => log.topics[0] === ethers.id('Transfer(address,address,uint256)')
        );
        const tokenId = transferEvent
            ? BigInt(transferEvent.topics[3]).toString()
            : 'UNKNOWN';

        return {
            agentId: tokenId,
            agentRegistry: `eip155:11155111:${SEPOLIA_REGISTRIES.identity}`,
            operatorAddress: wallet.address,
            metadataURI,
            registeredOnChain: true,
            network: 'sepolia',
            timestamp: new Date().toISOString()
        };

    } catch (error: any) {
        logError(MODULE, `ERC-8004 registration failed: ${error.message}`);

        // Graceful fallback
        return {
            agentId: `AEGIS-FALLBACK-${Date.now().toString(36)}`,
            agentRegistry: `eip155:11155111:${SEPOLIA_REGISTRIES.identity}`,
            operatorAddress: 'UNKNOWN',
            metadataURI,
            registeredOnChain: false,
            network: 'sepolia',
            timestamp: new Date().toISOString()
        };
    }
}

// ─── CLI Entry Point ─────────────────────────────────────────

if (require.main === module) {
    registerAgentIdentity('https://arweave.net/aegis_manifest').then((id) => {
        console.log('\n=== Agent Identity ===');
        console.log(JSON.stringify(id, null, 2));
    }).catch(console.error);
}
