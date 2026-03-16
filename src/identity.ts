/**
 * Aegis Agent — ERC-8004 Identity Module
 * ========================================
 * Handles the registration and management of the agent's unique identity
 * on the Ethereum Sepolia testnet using the ERC-8004 standard.
 * 
 * Flow:
 *   1. Check if agent is already registered
 *   2. If not, submit registration tx to IdentityRegistry
 *   3. Retrieve the unique AgentID
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const REGISTRY_ADDRESS = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

// Minimal ABI for ERC-8004 IdentityRegistry
const REGISTRY_ABI = [
    "function registerAgent(address operator, string metadataURI) public returns (uint256)",
    "function getAgentID(address operator) public view returns (uint256)",
    "event AgentRegistered(uint256 indexed agentID, address indexed operator, string metadataURI)"
];

export async function registerAgentIdentity(metadataURI: string): Promise<string> {
    const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
    const wallet = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY!, provider);
    const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);

    console.log(`[Identity] Checking registration for operator: ${wallet.address}`);

    try {
        const existingID = await registry.getAgentID(wallet.address);
        if (existingID > 0n) {
            console.log(`[Identity] Agent already registered! ID: ${existingID}`);
            return existingID.toString();
        }

        console.log(`[Identity] Submitting ERC-8004 registration...`);
        const tx = await registry.registerAgent(wallet.address, metadataURI);
        const receipt = await tx.wait();
        
        // Find AgentRegistered event
        const event = receipt.logs.find((log: any) => log.fragment && log.name === 'AgentRegistered');
        const agentID = event ? event.args[0] : "unknown";

        console.log(`[Identity] Registration Successful! Agent ID: ${agentID}`);
        return agentID.toString();
    } catch (error: any) {
        console.error(`[Identity] ERC-8004 Registration failed: ${error.message}`);
        // Fallback or re-throw
        throw error;
    }
}

if (require.main === module) {
    registerAgentIdentity("https://aegis-agent.com/manifest.json").catch(console.error);
}
