/**
 * Aegis Agent — Configuration Loader
 * ====================================
 * Centralizes all environment variable access and provides
 * type-safe defaults for the entire agent.
 */

import * as dotenv from 'dotenv';
dotenv.config();

export interface AegisConfig {
    // Ethereum
    ethRpcUrl: string;
    operatorPrivateKey: string;
    erc8004RegistryAddress: string;

    // Irys / Arweave
    irysNode: string;
    irysToken: string;

    // Impulse AI
    impulseApiKey: string;
    impulseEndpoint: string;
    impulseDeploymentId: string;

    // Hypercerts
    hypercertsEnvironment: string;

    // Agent
    maxComputeBudget: number;
    storageDirectory: string;
    archiveDirectory: string;

    // Runtime
    isDemoMode: boolean;
}

function getEnv(key: string, fallback: string = ''): string {
    return process.env[key] || fallback;
}

export function loadConfig(): AegisConfig {
    const operatorKey = getEnv('OPERATOR_PRIVATE_KEY');

    return {
        ethRpcUrl: getEnv('ETH_RPC_URL', 'https://sepolia.infura.io/v3/DEMO'),
        operatorPrivateKey: operatorKey,
        erc8004RegistryAddress: getEnv('ERC8004_REGISTRY', '0xf66e7CBdAE1Cb710fee7732E4e1f173624e137A7'),

        irysNode: getEnv('IRYS_NODE', 'https://devnet.irys.xyz'),
        irysToken: getEnv('IRYS_TOKEN', 'ethereum'),

        impulseApiKey: getEnv('IMPULSE_API_KEY', 'imp_demo_key'),
        impulseEndpoint: getEnv('IMPULSE_ENDPOINT', 'https://inference.impulselabs.ai/infer'),
        impulseDeploymentId: getEnv('IMPULSE_DEPLOYMENT_ID', 'aegis-classifier-v1'),

        hypercertsEnvironment: getEnv('HYPERCERTS_ENV', 'test'),

        maxComputeBudget: parseFloat(getEnv('MAX_COMPUTE_BUDGET', '10.0')),
        storageDirectory: getEnv('STORAGE_DIRECTORY', './vault_data'),
        archiveDirectory: getEnv('ARCHIVE_DIRECTORY', './vault_data_archived'),

        isDemoMode: !operatorKey || operatorKey.includes('742d35Cc') || operatorKey === '0x...',
    };
}

export const config = loadConfig();
