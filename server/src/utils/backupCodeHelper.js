const crypto = require('crypto');

/**
 * Normalizes a backup code by trimming and stripping all dashes and spaces.
 * Example: " 4921 - 8392 " -> "49218392"
 */
function normalizeBackupCode(code) {
    if (!code) return '';
    return String(code).trim().replace(/[-\s]/g, '').toUpperCase();
}

/**
 * Computes a deterministic SHA-256 hash of the normalized backup code.
 */
function hashBackupCode(code) {
    const clean = normalizeBackupCode(code);
    return crypto.createHash('sha256').update(clean).digest('hex');
}

/**
 * Generates 10 unique, human-friendly 8-digit numeric backup codes.
 * Formatted as "XXXX-XXXX" for easy reading on paper chips.
 * Returns both raw codes (to print once) and their hashes (for secure DB storage).
 */
function generate10BackupCodes() {
    const generated = new Set();
    const codes = [];

    while (codes.length < 10) {
        // Generate random 8-digit number (10,000,000 to 99,999,999)
        const part1 = crypto.randomInt(1000, 9999);
        const part2 = crypto.randomInt(1000, 9999);
        const rawCode = `${part1}-${part2}`;
        const clean = normalizeBackupCode(rawCode);

        if (!generated.has(clean)) {
            generated.add(clean);
            codes.push({
                turnIndex: codes.length + 1,
                rawCode,
                codeHash: hashBackupCode(clean)
            });
        }
    }

    return codes;
}

module.exports = {
    normalizeBackupCode,
    hashBackupCode,
    generate10BackupCodes
};
