/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AEGIS AGENT — Stage 1: Intelligence (Local Sentinel)       ║
 * ║  Autonomous high-performance data sensitivity classification.║
 * ║  Privacy-first: No data ever leaves the local environment.  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import * as fs from 'fs';
import * as path from 'path';
import { logInfo, logWarn, logError, logDebug } from './utils/logger';

const MODULE = 'Intelligence';

// ─── Types ───────────────────────────────────────────────────

export type SensitivityCategory = 'PII' | 'FINANCIAL' | 'MEDICAL' | 'CREDENTIALS' | 'MEDIA' | 'INTERNAL' | 'GENERAL';
export type Recommendation = 'ENCRYPT_AND_ARCHIVE' | 'ARCHIVE_ONLY' | 'MONITOR' | 'IGNORE';

export interface ClassificationResult {
    isSensitive: boolean;
    confidence: number;
    category: SensitivityCategory;
    recommendation: Recommendation;
    detectedPatterns: string[];
    entropy: number;
    fileSizeBytes: number;
    summary: string;
}

// ─── Pattern Definitions ─────────────────────────────────────

const SENSITIVITY_PATTERNS: Record<SensitivityCategory, RegExp[]> = {
    CREDENTIALS: [
        /private[_\-\s]?key/i, /secret[_\-\s]?key/i, /mnemonic/i,
        /seed[_\-\s]?phrase/i, /api[_\-\s]?key/i, /password/i,
        /bearer\s+[a-zA-Z0-9\-_]+/i, /0x[a-fA-F0-9]{64}/,
        /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
        /access[_\-\s]?key/i, /aws[_\-\s]?secret/i, /secret[_\-\s]?access[_\-\s]?key/i
    ],
    PII: [
        /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/,  // SSN pattern
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,  // Email
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,  // Credit card
        /passport/i, /driver'?s?\s*licen[cs]e/i,
        /date\s*of\s*birth/i, /social\s*security/i,
        /identity|did:ethr/i
    ],
    FINANCIAL: [
        /balance/i, /transaction/i, /transfer/i,
        /swap|yield|profit|loss/i, /portfolio/i,
        /bank\s*account/i, /routing\s*number/i,
        /\b(ETH|BTC|USDC|USDT|DAI)\b/, /wei|gwei|satoshi/i
    ],
    MEDICAL: [
        /diagnosis/i, /prescription/i, /patient/i,
        /medical\s*record/i, /health\s*insurance/i,
        /blood\s*type/i, /allergy/i, /HIPAA/i
    ],
    INTERNAL: [
        /architecture/i, /roadmap/i, /specification/i, /internal/i,
        /confidential/i, /draft/i, /proprietary/i, /contract/i,
        /aegis/i, /sentinel/i, /infrastructure/i
    ],
    MEDIA: [],
    GENERAL: []
};

const CATEGORY_PRIORITY: SensitivityCategory[] = [
    'CREDENTIALS', 'PII', 'MEDICAL', 'FINANCIAL', 'INTERNAL', 'MEDIA', 'GENERAL'
];

// ─── Entropy Calculator ──────────────────────────────────────

function calculateEntropy(data: string): number {
    const freq: Record<string, number> = {};
    for (const ch of data) {
        freq[ch] = (freq[ch] || 0) + 1;
    }
    let entropy = 0;
    const len = data.length;
    for (const ch in freq) {
        const p = freq[ch] / len;
        entropy -= p * Math.log2(p);
    }
    return Math.round(entropy * 1000) / 1000;
}

// ─── Core Classification ─────────────────────────────────────

async function classifyLocally(content: string): Promise<{
    category: SensitivityCategory;
    confidence: number;
    patterns: string[];
}> {
    const matchedPatterns: string[] = [];
    let bestCategory: SensitivityCategory = 'GENERAL';
    let bestScore = 0;

    for (const category of CATEGORY_PRIORITY) {
        const regexes = SENSITIVITY_PATTERNS[category];
        let matchCount = 0;

        if (!regexes) continue;

        for (const regex of regexes) {
            const matches = content.match(new RegExp(regex.source, regex.flags + 'g'));
            if (matches) {
                matchCount += matches.length;
                matchedPatterns.push(`${category}:${regex.source.slice(0, 30)}`);
            }
        }

        if (matchCount > bestScore) {
            bestScore = matchCount;
            bestCategory = category;
        }
    }

    // Confidence is based on the number of patterns matched
    const confidence = bestScore === 0 ? 0.05 :
                       bestScore <= 2 ? 0.65 :
                       bestScore <= 5 ? 0.85 :
                       0.97;

    return { category: bestCategory, confidence, patterns: matchedPatterns };
}

// ─── Public API ──────────────────────────────────────────────

export async function classifyDataIntelligence(filePath: string): Promise<ClassificationResult> {
    logInfo(MODULE, `Analyzing ${path.basename(filePath)} via Local Sentinel Intelligence...`);

    // Read file
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const sample = content.slice(0, 4096); // First 4KB for analysis
    const entropy = calculateEntropy(sample);

    logDebug(MODULE, `File size: ${stats.size} bytes, Entropy: ${entropy}`);

    // Run local pattern matching
    const localResult = await classifyLocally(sample);

    // Special check for Binary/Media files
    const ext = path.extname(filePath).toLowerCase();
    const isMediaExt = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.pdf', '.zip'].includes(ext);
    
    let finalCategory = localResult.category;
    let finalConfidence = localResult.confidence;
    
    if (isMediaExt || entropy > 6.0) {
        finalCategory = 'MEDIA';
        finalConfidence = Math.max(finalConfidence, 0.9);
    }

    const isSensitive = finalCategory !== 'GENERAL' && finalConfidence > 0.4;

    // Determine recommendation
    let recommendation: Recommendation;
    if (finalCategory === 'CREDENTIALS') {
        recommendation = 'ENCRYPT_AND_ARCHIVE';
    } else if (isSensitive && finalConfidence > 0.7) {
        recommendation = 'ENCRYPT_AND_ARCHIVE';
    } else if (isSensitive) {
        recommendation = 'ARCHIVE_ONLY';
    } else if (entropy > 5.5) {
        recommendation = 'MONITOR';
    } else {
        recommendation = 'IGNORE';
    }

    const result: ClassificationResult = {
        isSensitive,
        confidence: finalConfidence,
        category: finalCategory,
        recommendation,
        detectedPatterns: localResult.patterns,
        entropy,
        fileSizeBytes: stats.size,
        summary: isSensitive
            ? `Detected ${localResult.patterns.length} sensitive pattern(s). Category: ${finalCategory}. Confidence: ${(finalConfidence * 100).toFixed(1)}%.`
            : `No significant sensitive patterns detected. Entropy: ${entropy}.`
    };

    logInfo(MODULE, result.summary);
    return result;
}

