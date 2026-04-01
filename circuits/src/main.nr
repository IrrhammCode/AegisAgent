// Aegis ZK Integrity Proof Circuit
// Proves data authenticity without disclosure.
use dep::std;

fn main(
    // Private input: the raw data (padded to 32 bytes)
    data: [u8; 32],
    // Public input: the expected SHA-256 hash
    expected_hash: pub [u8; 32]
) {
    let computed_hash = std::hash::sha256(data);
    for i in 0..32 {
        assert(computed_hash[i] == expected_hash[i]);
    }
}

