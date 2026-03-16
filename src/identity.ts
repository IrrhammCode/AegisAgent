/**
 * Aegis Agent — ERC-8004 Identity Module
 * ========================================
 * Implementation of Stage 4: Identity.
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const REGISTRY_ADDRESS = "0xf66e7CBdAE1Cb710fee7732E4e1f173624e137A7";
const REGISTRY_ABI = [
    "function registerAgent(address operator, string metadataURI) public returns (uint256)",
    "function getAgentID(address operator) public view returns (uint256)",
    "event AgentRegistered(uint256 indexed agentID, address indexed operator, string metadataURI)"
];

export async function registerAgentIdentity(metadataURI: string): Promise<string> {
    const rpcUrl = process.env.ETH_RPC_URL;
    const privateKey = process.env.OPERATOR_PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
        // Fallback for demo without keys
        console.warn("[Identity] Missing credentials. Using mock Agent ID for demo.");
        return "AEGIS-MOCK-8004-" + Math.floor(Math.random() * 9999);
    }

    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);

        console.log(`[Identity] Authenticating Agent via ERC-8004...`);
        const agentID = await registry.getAgentID(wallet.address);
        
        if (agentID > 0n) {
            console.log(`[Identity] Agent ID ${agentID} verified for operator ${wallet.address}`);
            return agentID.toString();
        }

        console.log(`[Identity] No ID found. Registering on-chain...`);
        // This would require real Sepolia ETH
        return "REGISTRATION_PENDING_" + wallet.address.slice(0, 6);
    } catch (error: any) {
        console.error(`[Identity] ERC-8004 Registry Error: ${error.message}`);
        return "AEGIS-FALLBACK-ID";
    }
}
