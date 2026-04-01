import { resolveAtprotoIdentity } from './identity';
import { issueAtprotoImpactRecord } from './impact';

async function testHyperscan() {
    console.log('--- Testing Hyperscan / ATProto Integration ---');

    console.log('\n1. Testing Identity Resolution...');
    const identity = await resolveAtprotoIdentity();
    if (identity) {
        console.log('✅ Identity resolved:', identity);
    } else {
        console.log('⚠️ Could not resolve identity (Check your .env ATProto variables).');
        console.log('Skipping record creation test.');
        return;
    }

    console.log('\n2. Testing Impact Record Issuance...');
    const uri = await issueAtprotoImpactRecord(
        'AEGIS-TEST-ID',
        'https://arweave.net/test-url',
        'PII',
        1
    );

    if (uri) {
        console.log(`✅ Impact record successfully created on Hypersphere!`);
        console.log(`URI: ${uri}`);
        console.log(`Check it out on Hyperscan: https://www.hyperscan.dev/agents/profile/${identity.handle}`);
    } else {
        console.log('❌ Failed to create impact record.');
    }
}

testHyperscan().catch(console.error);
