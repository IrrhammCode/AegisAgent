/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AEGIS AGENT — Stage 6: Sentinel Swarm (ATProto)             ║
 * ║  Decentralized broadcast of protection logs via Bluesky.    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { BskyAgent } from '@atproto/api';
import { config } from './utils/config';
import { logInfo, logError, logWarn } from './utils/logger';

const MODULE = 'AtProtoSwarm';

export interface SwarmBroadcastResult {
    success: boolean;
    uri?: string;
    cid?: string;
    message: string;
}

/**
 * Broadcasts a protection event to the ATProto network.
 * This establishes a collaborative security record across the swarm.
 */
export async function broadcastToSentinelSwarm(
    assetName: string,
    category: string,
    arweaveUrl: string,
    txHash?: string
): Promise<SwarmBroadcastResult> {
    if (!config.atpHandle || !config.atpPassword) {
        return {
            success: false,
            message: 'ATProto credentials not configured. Skipping swarm broadcast.'
        };
    }

    try {
        logInfo(MODULE, `Connecting to Sentinel Swarm as ${config.atpHandle}...`);
        
        const agent = new BskyAgent({
            service: config.atpPdsUrl || 'https://bsky.social'
        });

        // Use a timeout for the entire process
        const result = await Promise.race([
            (async () => {
                await agent.login({
                    identifier: config.atpHandle,
                    password: config.atpPassword
                });

                const postText = `🛡️ [AEGIS SENTINEL LOG]\n\n` +
                    `Asset Protected: ${assetName}\n` +
                    `Intelligence Category: ${category}\n` +
                    `Storage Proof: ${arweaveUrl}\n\n` +
                    `Verified via ZK-Proof & Arweave Permanent Archival.\n` +
                    `#AegisAgent #SentinelSwarm #ZKSecurity`;

                const response = await agent.post({
                    text: postText,
                    embed: {
                        $type: 'app.bsky.embed.external',
                        external: {
                            uri: arweaveUrl,
                            title: `Aegis Protection: ${assetName}`,
                            description: `Autonomous cryptographic protection verified for ${category} asset.`
                        }
                    },
                    createdAt: new Date().toISOString()
                });

                logInfo(MODULE, `Successfully broadcasted to swarm: ${response.uri}`);
                return {
                    success: true,
                    uri: response.uri,
                    cid: response.cid,
                    message: 'Broadcast complete'
                };
            })(),
            new Promise<SwarmBroadcastResult>((_, reject) => 
                setTimeout(() => reject(new Error('Swarm broadcast timed out after 15s')), 15000)
            )
        ]);

        return result;

    } catch (error: any) {
        const errorMsg = error.message || 'Unknown ATProto error';
        logError(MODULE, `Swarm broadcast issue: ${errorMsg}`);
        
        return {
            success: false,
            message: `Broadcast skipped: ${errorMsg}`
        };
    }
}
