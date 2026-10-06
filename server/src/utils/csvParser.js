/**
 * Robust CSV & Delimited Data Parser
 * Compliant with RFC 4180 quote rules and equipped with smart address/free-text
 * comma recombination to prevent multi-column breakage.
 */

/**
 * Parse a single CSV/delimited line respecting double quotes and escaped quotes.
 * Commas or delimiters inside quotes will NOT split into multiple tokens.
 *
 * @param {string} line - Raw line string
 * @param {string} delimiter - Delimiter character (default: ',')
 * @returns {Array<string>} Parsed column values
 */
function parseCsvLine(line, delimiter = ',') {
    if (typeof line !== 'string') return [];
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped double-quote inside quotes: "" -> "
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            result.push(current.trim().replace(/^["']|["']$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim().replace(/^["']|["']$/g, ''));
    return result;
}

/**
 * Detect delimiter from candidate text line
 */
function detectDelimiter(line) {
    if (!line) return ',';
    if (line.includes('\t')) return '\t';
    if (line.includes(';') && !line.includes(',')) return ';';
    if (line.includes('|') && !line.includes(',')) return '|';
    return ',';
}

/**
 * Check if a column header represents an address or free-text column
 */
function isAddressOrTextHeader(header) {
    if (!header) return false;
    const h = String(header).toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
        h.includes('address') ||
        h.includes('addr') ||
        h.includes('residence') ||
        h.includes('location') ||
        h.includes('street') ||
        h.includes('permanent') ||
        h.includes('residential') ||
        h.includes('notes') ||
        h.includes('remarks') ||
        h.includes('description')
    );
}

/**
 * Parse full CSV/delimited text into structured headers and record objects.
 * Features:
 * 1. RFC 4180 quote parsing (quoted commas in addresses stay in 1 column).
 * 2. Unquoted comma fallback: if a row has excess tokens and contains an address header,
 *    recombines excess tokens back into the address column so subsequent columns align.
 *
 * @param {string} text - Raw CSV text
 * @param {string} [forcedDelimiter] - Optional explicit delimiter
 * @returns {{ headers: Array<string>, records: Array<Object>, delimiter: string }}
 */
function parseCsvContent(text, forcedDelimiter = null) {
    if (!text || typeof text !== 'string') {
        return { headers: [], records: [], delimiter: ',' };
    }

    const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const cleanLines = rawLines.filter(l => !l.startsWith('===') && !l.startsWith('---'));

    if (cleanLines.length === 0) {
        return { headers: [], records: [], delimiter: ',' };
    }

    // Smart header row detection
    let headerIdx = -1;
    let delimiter = forcedDelimiter || ',';

    for (let i = 0; i < Math.min(cleanLines.length, 15); i++) {
        const line = cleanLines[i];
        const d = forcedDelimiter || detectDelimiter(line);
        const pLower = line.toLowerCase();

        const hasKeyCols = (
            (pLower.includes('name') || pLower.includes('student') || pLower.includes('candidate')) &&
            (pLower.includes('roll') || pLower.includes('id') || pLower.includes('adm') || pLower.includes('reg') ||
             pLower.includes('class') || pLower.includes('phone') || pLower.includes('email') || pLower.includes('gender') ||
             pLower.includes('item') || pLower.includes('serial') || pLower.includes('address') || pLower.includes('addr'))
        );

        if (hasKeyCols) {
            headerIdx = i;
            delimiter = d;
            break;
        }
    }

    if (headerIdx === -1 && cleanLines.length >= 1) {
        headerIdx = 0;
        if (!forcedDelimiter) {
            delimiter = detectDelimiter(cleanLines[0]);
        }
    }

    const rawHeaderVals = parseCsvLine(cleanLines[headerIdx], delimiter);
    const headers = rawHeaderVals.map(h => h.trim().replace(/^["']|["']$/g, '')).filter(Boolean);

    if (headers.length === 0) {
        return { headers: [], records: [], delimiter };
    }

    // Find if there is an address or free-text column index among headers
    const addressColIndex = headers.findIndex(isAddressOrTextHeader);

    const records = [];

    for (let r = headerIdx + 1; r < cleanLines.length; r++) {
        let rowVals = parseCsvLine(cleanLines[r], delimiter);

        // Ignore empty lines
        if (rowVals.length === 0 || (rowVals.length === 1 && !rowVals[0])) {
            continue;
        }

        // Address comma recombination heuristic for unquoted CSVs:
        // If row has more tokens than headers, and an address header exists,
        // recombine the extra tokens into the address column so downstream columns align correctly.
        if (rowVals.length > headers.length && addressColIndex !== -1) {
            const excess = rowVals.length - headers.length;
            const preAddress = rowVals.slice(0, addressColIndex);
            const addressParts = rowVals.slice(addressColIndex, addressColIndex + excess + 1);
            const postAddress = rowVals.slice(addressColIndex + excess + 1);

            rowVals = [
                ...preAddress,
                addressParts.join(', '),
                ...postAddress
            ];
        }

        const rowObj = {};
        headers.forEach((h, idx) => {
            rowObj[h] = rowVals[idx] !== undefined ? rowVals[idx] : '';
        });

        rowObj._originalRowIndex = r - headerIdx;
        rowObj.selected = true;
        records.push(rowObj);
    }

    return {
        headers,
        records,
        delimiter
    };
}

module.exports = {
    parseCsvLine,
    detectDelimiter,
    isAddressOrTextHeader,
    parseCsvContent
};
