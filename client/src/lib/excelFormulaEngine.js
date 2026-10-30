/**
 * excelFormulaEngine.js
 * 
 * High-performance, grammar-based formula parser and evaluation engine for LabSheets.
 * Supports:
 * - Direct cell coordinates (A1, B2, AA10) and absolute references ($A$1, $B$2:$D$10)
 * - Cascading cell value resolution (extracts computed output values of referenced formulas)
 * - Full arithmetic operator precedence: ^ > *, /, % > +, -
 * - Comparison operators: =, <>, !=, <, >, <=, >=
 * - String concatenation: &
 * - Multi-argument & multi-range functions (e.g. SUM(A1:A5, B1:B5, 10))
 * - Logical branching: IF, IFS, IFERROR, AND, OR, NOT
 * - Lookup functions: VLOOKUP, HLOOKUP, XLOOKUP, INDEX, MATCH
 * - Complete STEM & Lab formulas (Slope, Intercept, Molarity, Dilution, pH, etc.)
 * - Circular dependency detection (#CIRCULAR!)
 * - Reactive DAG (Directed Acyclic Graph) dependency management for topological recalculation
 */

// 1. Coordinate Utilities
export const colLetterToIndex = (colStr) => {
    if (!colStr) return 0;
    const clean = String(colStr).toUpperCase().replace(/\$/g, '').trim();
    let index = 0;
    for (let i = 0; i < clean.length; i++) {
        index = index * 26 + (clean.charCodeAt(i) - 64);
    }
    return index - 1;
};

export const indexToColLetter = (index) => {
    let label = '';
    let num = index;
    while (num >= 0) {
        label = String.fromCharCode((num % 26) + 65) + label;
        num = Math.floor(num / 26) - 1;
    }
    return label;
};

export const parseCoord = (coord) => {
    if (!coord) return null;
    const clean = String(coord).trim().toUpperCase().replace(/\$/g, '');
    const match = clean.match(/^([A-Z]+)([0-9]+)$/);
    if (!match) return null;
    return {
        col: colLetterToIndex(match[1]),
        row: parseInt(match[2], 10),
        colLetter: match[1],
        key: `${match[1]}${match[2]}`
    };
};

export const normalizeKey = (key) => {
    if (!key) return '';
    return String(key).trim().toUpperCase().replace(/\$/g, '');
};

// 2. Criteria Matcher for SUMIF, COUNTIF, AVERAGEIF
export const matchesCriteria = (val, criteria) => {
    if (criteria === undefined || criteria === null || criteria === '') return true;
    let strCrit = String(criteria).trim();
    if ((strCrit.startsWith('"') && strCrit.endsWith('"')) || (strCrit.startsWith("'") && strCrit.endsWith("'"))) {
        strCrit = strCrit.slice(1, -1);
    }
    const strVal = String(val ?? '').trim();
    if (strCrit.startsWith('>=') || strCrit.startsWith('<=') || strCrit.startsWith('>') || strCrit.startsWith('<') || strCrit.startsWith('!=') || strCrit.startsWith('<>')) {
        const op = strCrit.match(/^([><!=]=?|<>)/)[1];
        const target = Number(strCrit.substring(op.length).trim());
        const numVal = Number(val);
        if (isNaN(numVal) || isNaN(target)) return false;
        if (op === '>=') return numVal >= target;
        if (op === '<=') return numVal <= target;
        if (op === '>') return numVal > target;
        if (op === '<') return numVal < target;
        if (op === '!=' || op === '<>') return numVal !== target;
    }
    if (strCrit.startsWith('=')) {
        return strVal.toLowerCase() === strCrit.substring(1).trim().toLowerCase();
    }
    return strVal.toLowerCase() === strCrit.toLowerCase();
};

// 3. Built-in Function Catalog
export const EXCEL_FUNCTIONS = {
    // Math & Stats
    SUM: (...args) => {
        const flat = args.flat(Infinity);
        return flat.reduce((sum, v) => {
            const n = parseFloat(v);
            return !isNaN(n) ? sum + n : sum;
        }, 0);
    },
    AVERAGE: (...args) => {
        const flat = args.flat(Infinity);
        const nums = flat.map(v => parseFloat(v)).filter(n => !isNaN(n));
        return nums.length ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(4)) : 0;
    },
    COUNT: (...args) => {
        const flat = args.flat(Infinity);
        return flat.filter(v => v !== null && v !== '' && !isNaN(Number(v))).length;
    },
    COUNTA: (...args) => {
        const flat = args.flat(Infinity);
        return flat.filter(v => v !== null && v !== undefined && v !== '').length;
    },
    COUNTBLANK: (...args) => {
        const flat = args.flat(Infinity);
        return flat.filter(v => v === null || v === undefined || v === '').length;
    },
    MIN: (...args) => {
        const nums = args.flat(Infinity).map(v => parseFloat(v)).filter(n => !isNaN(n));
        return nums.length ? Math.min(...nums) : 0;
    },
    MAX: (...args) => {
        const nums = args.flat(Infinity).map(v => parseFloat(v)).filter(n => !isNaN(n));
        return nums.length ? Math.max(...nums) : 0;
    },
    PRODUCT: (...args) => {
        const nums = args.flat(Infinity).map(v => parseFloat(v)).filter(n => !isNaN(n));
        return nums.length ? nums.reduce((a, b) => a * b, 1) : 0;
    },
    MEDIAN: (...args) => {
        const nums = args.flat(Infinity).map(v => parseFloat(v)).filter(n => !isNaN(n)).sort((a, b) => a - b);
        if (!nums.length) return 0;
        const mid = Math.floor(nums.length / 2);
        return nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
    },
    MODE: (...args) => {
        const nums = args.flat(Infinity).map(v => parseFloat(v)).filter(n => !isNaN(n));
        if (!nums.length) return '#N/A';
        const counts = new Map();
        let maxCount = 0;
        let modeVal = nums[0];
        for (const n of nums) {
            const count = (counts.get(n) || 0) + 1;
            counts.set(n, count);
            if (count > maxCount) {
                maxCount = count;
                modeVal = n;
            }
        }
        return modeVal;
    },
    'MODE.SNGL': (...args) => EXCEL_FUNCTIONS.MODE(...args),
    MEAN: (...args) => EXCEL_FUNCTIONS.AVERAGE(...args),
    STDEV: (...args) => {
        const nums = args.flat(Infinity).map(v => parseFloat(v)).filter(n => !isNaN(n));
        if (nums.length <= 1) return 0;
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        const variance = nums.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / (nums.length - 1);
        return Number(Math.sqrt(variance).toFixed(4));
    },
    'STDEV.S': (...args) => EXCEL_FUNCTIONS.STDEV(...args),
    'STDEV.P': (...args) => {
        const nums = args.flat(Infinity).map(v => parseFloat(v)).filter(n => !isNaN(n));
        if (!nums.length) return 0;
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        const variance = nums.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / nums.length;
        return Number(Math.sqrt(variance).toFixed(4));
    },
    ROUND: (num, digits = 0) => {
        const n = parseFloat(num);
        if (isNaN(n)) return '#VALUE!';
        const d = parseInt(digits, 10) || 0;
        return Number(n.toFixed(d));
    },
    ROUNDUP: (num, digits = 0) => {
        const n = parseFloat(num);
        if (isNaN(n)) return '#VALUE!';
        const d = parseInt(digits, 10) || 0;
        const factor = Math.pow(10, d);
        return Number((Math.ceil(n * factor) / factor).toFixed(d));
    },
    ROUNDDOWN: (num, digits = 0) => {
        const n = parseFloat(num);
        if (isNaN(n)) return '#VALUE!';
        const d = parseInt(digits, 10) || 0;
        const factor = Math.pow(10, d);
        return Number((Math.floor(n * factor) / factor).toFixed(d));
    },
    ABS: (v) => Math.abs(parseFloat(v) || 0),
    SQRT: (v) => {
        const n = parseFloat(v);
        return n >= 0 ? Math.sqrt(n) : '#NUM!';
    },
    POWER: (base, exp) => Math.pow(parseFloat(base) || 0, parseFloat(exp) || 0),
    INT: (v) => Math.floor(parseFloat(v) || 0),
    MOD: (n, d) => (parseFloat(n) || 0) % (parseFloat(d) || 1),

    // Conditional Math
    SUMIF: (range, criteria, sumRange) => {
        const vals = Array.isArray(range) ? range.flat(Infinity) : [range];
        const sumVals = sumRange !== undefined ? (Array.isArray(sumRange) ? sumRange.flat(Infinity) : [sumRange]) : vals;
        let sum = 0;
        vals.forEach((v, idx) => {
            if (matchesCriteria(v, criteria)) {
                const n = parseFloat(sumVals[idx]);
                if (!isNaN(n)) sum += n;
            }
        });
        return sum;
    },
    COUNTIF: (range, criteria) => {
        const vals = Array.isArray(range) ? range.flat(Infinity) : [range];
        return vals.filter(v => matchesCriteria(v, criteria)).length;
    },
    AVERAGEIF: (range, criteria, avgRange) => {
        const vals = Array.isArray(range) ? range.flat(Infinity) : [range];
        const avgVals = avgRange !== undefined ? (Array.isArray(avgRange) ? avgRange.flat(Infinity) : [avgRange]) : vals;
        let sum = 0, count = 0;
        vals.forEach((v, idx) => {
            if (matchesCriteria(v, criteria)) {
                const n = parseFloat(avgVals[idx]);
                if (!isNaN(n)) { sum += n; count++; }
            }
        });
        return count ? Number((sum / count).toFixed(4)) : 0;
    },
    SUMIFS: (sumRange, ...criteriaPairs) => {
        const sVals = Array.isArray(sumRange) ? sumRange.flat(Infinity) : [sumRange];
        const pairs = [];
        for (let i = 0; i < criteriaPairs.length; i += 2) {
            if (i + 1 < criteriaPairs.length) {
                pairs.push({
                    range: Array.isArray(criteriaPairs[i]) ? criteriaPairs[i].flat(Infinity) : [criteriaPairs[i]],
                    crit: criteriaPairs[i + 1]
                });
            }
        }
        let sum = 0;
        for (let i = 0; i < sVals.length; i++) {
            const matchesAll = pairs.every(p => matchesCriteria(p.range[i], p.crit));
            if (matchesAll) {
                const n = parseFloat(sVals[i]);
                if (!isNaN(n)) sum += n;
            }
        }
        return sum;
    },
    COUNTIFS: (...criteriaPairs) => {
        const pairs = [];
        for (let i = 0; i < criteriaPairs.length; i += 2) {
            if (i + 1 < criteriaPairs.length) {
                pairs.push({
                    range: Array.isArray(criteriaPairs[i]) ? criteriaPairs[i].flat(Infinity) : [criteriaPairs[i]],
                    crit: criteriaPairs[i + 1]
                });
            }
        }
        if (!pairs.length) return 0;
        const len = pairs[0].range.length;
        let count = 0;
        for (let i = 0; i < len; i++) {
            if (pairs.every(p => matchesCriteria(p.range[i], p.crit))) count++;
        }
        return count;
    },

    // Logical
    IF: (cond, trueVal, falseVal = '') => (Boolean(cond) ? trueVal : falseVal),
    IFS: (...args) => {
        for (let i = 0; i < args.length; i += 2) {
            if (i + 1 < args.length && Boolean(args[i])) {
                return args[i + 1];
            }
        }
        return '#N/A';
    },
    IFERROR: (val, fallback = '') => {
        const s = String(val);
        return s.startsWith('#') ? fallback : val;
    },
    AND: (...args) => args.flat(Infinity).every(v => Boolean(v)),
    OR: (...args) => args.flat(Infinity).some(v => Boolean(v)),
    NOT: (v) => !Boolean(v),

    // Lookups
    VLOOKUP: (lookupVal, table, colIdx, exact = true) => {
        if (!Array.isArray(table) || !table.length) return '#N/A';
        const col = (parseInt(colIdx, 10) || 1) - 1;
        const target = String(lookupVal ?? '').toLowerCase();
        for (const row of table) {
            const rowArr = Array.isArray(row) ? row : [row];
            if (String(rowArr[0] ?? '').toLowerCase() === target) {
                return rowArr[col] !== undefined ? rowArr[col] : '#REF!';
            }
        }
        return '#N/A';
    },
    HLOOKUP: (lookupVal, table, rowIdx, exact = true) => {
        if (!Array.isArray(table) || !table.length) return '#N/A';
        const rIdx = (parseInt(rowIdx, 10) || 1) - 1;
        const target = String(lookupVal ?? '').toLowerCase();
        const firstRow = Array.isArray(table[0]) ? table[0] : table;
        for (let col = 0; col < firstRow.length; col++) {
            if (String(firstRow[col] ?? '').toLowerCase() === target) {
                return table[rIdx] && table[rIdx][col] !== undefined ? table[rIdx][col] : '#REF!';
            }
        }
        return '#N/A';
    },
    INDEX: (table, rowNum, colNum = 1) => {
        if (!Array.isArray(table)) return table;
        const r = (parseInt(rowNum, 10) || 1) - 1;
        const c = (parseInt(colNum, 10) || 1) - 1;
        if (Array.isArray(table[0])) {
            return table[r] && table[r][c] !== undefined ? table[r][c] : '#REF!';
        }
        return table[r] !== undefined ? table[r] : '#REF!';
    },
    MATCH: (lookupVal, range, matchType = 0) => {
        const flat = Array.isArray(range) ? range.flat(Infinity) : [range];
        const target = String(lookupVal ?? '').toLowerCase();
        for (let i = 0; i < flat.length; i++) {
            if (String(flat[i] ?? '').toLowerCase() === target) {
                return i + 1; // 1-based index
            }
        }
        return '#N/A';
    },
    XLOOKUP: (lookupVal, lookupRange, returnRange, notFound = '#N/A') => {
        const lFlat = Array.isArray(lookupRange) ? lookupRange.flat(Infinity) : [lookupRange];
        const rFlat = Array.isArray(returnRange) ? returnRange.flat(Infinity) : [returnRange];
        const target = String(lookupVal ?? '').toLowerCase();
        for (let i = 0; i < lFlat.length; i++) {
            if (String(lFlat[i] ?? '').toLowerCase() === target) {
                return rFlat[i] !== undefined ? rFlat[i] : '#N/A';
            }
        }
        return notFound;
    },

    // String
    CONCATENATE: (...args) => args.flat(Infinity).join(''),
    UPPER: (s) => String(s ?? '').toUpperCase(),
    LOWER: (s) => String(s ?? '').toLowerCase(),
    TRIM: (s) => String(s ?? '').trim(),
    LEN: (s) => String(s ?? '').length,
    LEFT: (s, n = 1) => String(s ?? '').substring(0, parseInt(n, 10) || 1),
    RIGHT: (s, n = 1) => {
        const str = String(s ?? '');
        const len = parseInt(n, 10) || 1;
        return str.substring(Math.max(0, str.length - len));
    },
    MID: (s, start, len) => String(s ?? '').substring((parseInt(start, 10) || 1) - 1, ((parseInt(start, 10) || 1) - 1) + (parseInt(len, 10) || 0)),

    // Date & Time
    TODAY: () => new Date().toLocaleDateString('en-IN'),
    NOW: () => new Date().toLocaleString('en-IN'),

    // Scientific / Lab Calculations
    SLOPE: (knownYs, knownXs) => {
        const ys = (Array.isArray(knownYs) ? knownYs.flat(Infinity) : [knownYs]).map(Number).filter(n => !isNaN(n));
        const xs = (Array.isArray(knownXs) ? knownXs.flat(Infinity) : [knownXs]).map(Number).filter(n => !isNaN(n));
        const n = Math.min(ys.length, xs.length);
        if (n <= 1) return 0;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
            sumX += xs[i]; sumY += ys[i];
            sumXY += xs[i] * ys[i]; sumX2 += xs[i] * xs[i];
        }
        const denom = (n * sumX2 - sumX * sumX);
        return denom !== 0 ? Number(((n * sumXY - sumX * sumY) / denom).toFixed(5)) : 0;
    },
    INTERCEPT: (knownYs, knownXs) => {
        const ys = (Array.isArray(knownYs) ? knownYs.flat(Infinity) : [knownYs]).map(Number).filter(n => !isNaN(n));
        const xs = (Array.isArray(knownXs) ? knownXs.flat(Infinity) : [knownXs]).map(Number).filter(n => !isNaN(n));
        const n = Math.min(ys.length, xs.length);
        if (n <= 1) return 0;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
            sumX += xs[i]; sumY += ys[i];
            sumXY += xs[i] * ys[i]; sumX2 += xs[i] * xs[i];
        }
        const denom = (n * sumX2 - sumX * sumX);
        const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
        return Number(((sumY - slope * sumX) / n).toFixed(5));
    },
    MOLARITY: (moles, volumeLiters) => {
        const m = parseFloat(moles) || 0;
        const v = parseFloat(volumeLiters) || 1;
        return v !== 0 ? Number((m / v).toFixed(4)) : '#DIV/0!';
    },
    DILUTION: (c1, v1, c2) => {
        const c1Num = parseFloat(c1) || 0;
        const v1Num = parseFloat(v1) || 0;
        const c2Num = parseFloat(c2) || 1;
        return c2Num !== 0 ? Number(((c1Num * v1Num) / c2Num).toFixed(4)) : '#DIV/0!';
    },
    PH: (hConcentration) => {
        const h = parseFloat(hConcentration) || 0;
        return h > 0 ? Number((-Math.log10(h)).toFixed(2)) : '#NUM!';
    }
};

// 4. Tokenizer
export class FormulaTokenizer {
    constructor(input) {
        this.input = input.startsWith('=') ? input.substring(1).trim() : input.trim();
        this.cursor = 0;
    }

    tokenize() {
        const tokens = [];
        while (this.cursor < this.input.length) {
            const ch = this.input[this.cursor];

            // Whitespace
            if (/\s/.test(ch)) {
                this.cursor++;
                continue;
            }

            // String literal
            if (ch === '"' || ch === "'") {
                const quote = ch;
                this.cursor++;
                let str = '';
                while (this.cursor < this.input.length && this.input[this.cursor] !== quote) {
                    if (this.input[this.cursor] === '\\' && this.cursor + 1 < this.input.length) {
                        str += this.input[this.cursor + 1];
                        this.cursor += 2;
                    } else {
                        str += this.input[this.cursor];
                        this.cursor++;
                    }
                }
                if (this.cursor < this.input.length && this.input[this.cursor] === quote) {
                    this.cursor++;
                }
                tokens.push({ type: 'STRING', value: str });
                continue;
            }

            // Numeric literal
            if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(this.input[this.cursor + 1]))) {
                let numStr = '';
                while (this.cursor < this.input.length && /[0-9.]/.test(this.input[this.cursor])) {
                    numStr += this.input[this.cursor];
                    this.cursor++;
                }
                // Exponential notation like 1.2e-4
                if (this.cursor < this.input.length && /[eE]/.test(this.input[this.cursor])) {
                    numStr += this.input[this.cursor];
                    this.cursor++;
                    if (this.cursor < this.input.length && /[+-]/.test(this.input[this.cursor])) {
                        numStr += this.input[this.cursor];
                        this.cursor++;
                    }
                    while (this.cursor < this.input.length && /[0-9]/.test(this.input[this.cursor])) {
                        numStr += this.input[this.cursor];
                        this.cursor++;
                    }
                }
                tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
                continue;
            }

            // Cell Coordinate, Range, or Function Identifier
            if (/[A-Za-z$]/.test(ch)) {
                let idStr = '';
                while (this.cursor < this.input.length && /[A-Za-z0-9_$]/.test(this.input[this.cursor])) {
                    idStr += this.input[this.cursor];
                    this.cursor++;
                }

                // Check if followed by ':' for a range e.g. A1:B10
                if (this.cursor < this.input.length && this.input[this.cursor] === ':') {
                    this.cursor++; // consume ':'
                    let endStr = '';
                    while (this.cursor < this.input.length && /[A-Za-z0-9_$]/.test(this.input[this.cursor])) {
                        endStr += this.input[this.cursor];
                        this.cursor++;
                    }
                    tokens.push({ type: 'RANGE', start: idStr.toUpperCase(), end: endStr.toUpperCase() });
                    continue;
                }

                // Check if followed by '(' for a function call
                if (this.cursor < this.input.length && this.input[this.cursor] === '(') {
                    tokens.push({ type: 'FUNC', name: idStr.toUpperCase() });
                    continue;
                }

                // If matches cell coord pattern ($A$1 or A1)
                const cleanCoord = idStr.replace(/\$/g, '').toUpperCase();
                if (/^[A-Z]+[0-9]+$/.test(cleanCoord)) {
                    tokens.push({ type: 'CELL', key: cleanCoord });
                    continue;
                }

                // Boolean constants
                if (cleanCoord === 'TRUE') {
                    tokens.push({ type: 'NUMBER', value: 1 });
                    continue;
                }
                if (cleanCoord === 'FALSE') {
                    tokens.push({ type: 'NUMBER', value: 0 });
                    continue;
                }

                // Fallback identifier as string
                tokens.push({ type: 'STRING', value: idStr });
                continue;
            }

            // Multi-char comparison operators: <=, >=, <>, !=, ==
            const twoChar = this.input.substring(this.cursor, this.cursor + 2);
            if (['<=', '>=', '<>', '!=', '=='].includes(twoChar)) {
                tokens.push({ type: 'OP', value: twoChar });
                this.cursor += 2;
                continue;
            }

            // Single-char operators and punctuation
            if (['+', '-', '*', '/', '%', '^', '&', '<', '>', '=', '(', ')', ','].includes(ch)) {
                tokens.push({ type: 'OP', value: ch });
                this.cursor++;
                continue;
            }

            this.cursor++;
        }
        return tokens;
    }
}

// 5. Recursive Descent Evaluator with Cascading Value Resolution
export class FormulaEvaluator {
    constructor(cells = {}, visited = new Set()) {
        this.cells = cells;
        this.visited = visited;
    }

    /**
     * Resolves the evaluated output value of a cell.
     * If the cell contains another formula, recursively resolves its value.
     */
    getCellValue(coordKey) {
        const key = normalizeKey(coordKey);
        const cell = this.cells[key];
        if (!cell) return 0;

        // Circular dependency detection
        if (this.visited.has(key)) {
            return '#CIRCULAR!';
        }

        // Cell has no formula -> return raw value
        if (!cell.formula) {
            if (cell.val === '' || cell.val === null || cell.val === undefined) return 0;
            return isNaN(Number(cell.val)) ? cell.val : Number(cell.val);
        }

        // Cell has a formula -> evaluate recursively
        this.visited.add(key);
        const result = evaluateCellFormula(cell.formula, this.cells, new Set(this.visited));
        this.visited.delete(key);

        return typeof result === 'number' && isNaN(result) ? '#NUM!' : result;
    }

    /**
     * Expands range e.g. A1:B3 into 2D matrix or 1D array of resolved output values
     */
    getRangeValues(startKey, endKey) {
        const p1 = parseCoord(startKey);
        const p2 = parseCoord(endKey);
        if (!p1 || !p2) return [];

        const minRow = Math.min(p1.row, p2.row);
        const maxRow = Math.max(p1.row, p2.row);
        const minCol = Math.min(p1.col, p2.col);
        const maxCol = Math.max(p1.col, p2.col);

        // If single row or single column, return 1D array
        if (minRow === maxRow || minCol === maxCol) {
            const values = [];
            for (let r = minRow; r <= maxRow; r++) {
                for (let c = minCol; c <= maxCol; c++) {
                    const key = `${indexToColLetter(c)}${r}`;
                    values.push(this.getCellValue(key));
                }
            }
            return values;
        }

        // If multiple rows and columns, return 2D matrix
        const matrix = [];
        for (let r = minRow; r <= maxRow; r++) {
            const row = [];
            for (let c = minCol; c <= maxCol; c++) {
                const key = `${indexToColLetter(c)}${r}`;
                row.push(this.getCellValue(key));
            }
            matrix.push(row);
        }
        return matrix;
    }

    /**
     * Evaluates a token stream using recursive descent
     */
    evaluateTokens(tokens) {
        let cursor = 0;
        const peek = () => tokens[cursor];
        const consume = (expectedVal = null) => {
            const tok = tokens[cursor];
            if (expectedVal && tok?.value !== expectedVal) {
                throw new Error('#SYNTAX!');
            }
            cursor++;
            return tok;
        };

        const isError = (v) => typeof v === 'string' && v.startsWith('#');

        // Comparison Expression: expr (= | <> | < | <= | > | >=) expr
        const parseComparison = () => {
            let left = parseConcatenation();
            if (isError(left)) return left;

            while (cursor < tokens.length) {
                const tok = peek();
                if (tok?.type === 'OP' && ['=', '<>', '!=', '==', '<', '<=', '>', '>='].includes(tok.value)) {
                    consume();
                    const right = parseConcatenation();
                    if (isError(right)) return right;

                    const op = tok.value;
                    if (op === '=' || op === '==') left = left == right ? 1 : 0;
                    else if (op === '<>' || op === '!=') left = left != right ? 1 : 0;
                    else if (op === '<') left = left < right ? 1 : 0;
                    else if (op === '<=') left = left <= right ? 1 : 0;
                    else if (op === '>') left = left > right ? 1 : 0;
                    else if (op === '>=') left = left >= right ? 1 : 0;
                } else {
                    break;
                }
            }
            return left;
        };

        // Concatenation: term & term
        const parseConcatenation = () => {
            let left = parseAddSub();
            if (isError(left)) return left;

            while (cursor < tokens.length) {
                const tok = peek();
                if (tok?.type === 'OP' && tok.value === '&') {
                    consume();
                    const right = parseAddSub();
                    if (isError(right)) return right;
                    left = String(left ?? '') + String(right ?? '');
                } else {
                    break;
                }
            }
            return left;
        };

        // Addition & Subtraction: term (+ | -) term
        const parseAddSub = () => {
            let left = parseMulDiv();
            if (isError(left)) return left;

            while (cursor < tokens.length) {
                const tok = peek();
                if (tok?.type === 'OP' && (tok.value === '+' || tok.value === '-')) {
                    consume();
                    const right = parseMulDiv();
                    if (isError(right)) return right;
                    const n1 = parseFloat(left) || 0;
                    const n2 = parseFloat(right) || 0;
                    left = tok.value === '+' ? n1 + n2 : n1 - n2;
                } else {
                    break;
                }
            }
            return left;
        };

        // Multiplication, Division, Modulo: power (* | / | %) power
        const parseMulDiv = () => {
            let left = parsePower();
            if (isError(left)) return left;

            while (cursor < tokens.length) {
                const tok = peek();
                if (tok?.type === 'OP' && (tok.value === '*' || tok.value === '/' || tok.value === '%')) {
                    consume();
                    const right = parsePower();
                    if (isError(right)) return right;
                    const n1 = parseFloat(left) || 0;
                    const n2 = parseFloat(right) || 0;

                    if (tok.value === '*') {
                        left = n1 * n2;
                    } else if (tok.value === '/') {
                        if (n2 === 0) return '#DIV/0!';
                        left = n1 / n2;
                    } else if (tok.value === '%') {
                        if (n2 === 0) return '#DIV/0!';
                        left = n1 % n2;
                    }
                } else {
                    break;
                }
            }
            return left;
        };

        // Exponentiation: unary ^ unary
        const parsePower = () => {
            let left = parseUnary();
            if (isError(left)) return left;

            while (cursor < tokens.length) {
                const tok = peek();
                if (tok?.type === 'OP' && tok.value === '^') {
                    consume();
                    const right = parseUnary();
                    if (isError(right)) return right;
                    left = Math.pow(parseFloat(left) || 0, parseFloat(right) || 0);
                } else {
                    break;
                }
            }
            return left;
        };

        // Unary: (+ | -) factor
        const parseUnary = () => {
            const tok = peek();
            if (tok?.type === 'OP' && (tok.value === '+' || tok.value === '-')) {
                consume();
                const val = parseUnary();
                if (isError(val)) return val;
                return tok.value === '-' ? -(parseFloat(val) || 0) : +(parseFloat(val) || 0);
            }
            return parsePrimary();
        };

        // Primary: NUMBER, STRING, CELL, RANGE, FUNC, (expression)
        const parsePrimary = () => {
            const tok = peek();
            if (!tok) return 0;

            if (tok.type === 'NUMBER' || tok.type === 'STRING') {
                consume();
                return tok.value;
            }

            if (tok.type === 'CELL') {
                consume();
                return this.getCellValue(tok.key);
            }

            if (tok.type === 'RANGE') {
                consume();
                return this.getRangeValues(tok.start, tok.end);
            }

            // Function invocation
            if (tok.type === 'FUNC') {
                const funcName = tok.name;
                consume();
                const args = [];
                if (peek()?.type === 'OP' && peek()?.value === '(') {
                    consume('(');
                    if (!(peek()?.type === 'OP' && peek()?.value === ')')) {
                        while (cursor < tokens.length) {
                            args.push(parseComparison());
                            const nextTok = peek();
                            if (nextTok?.type === 'OP' && nextTok.value === ',') {
                                consume(',');
                            } else if (nextTok?.type === 'OP' && nextTok.value === ')') {
                                break;
                            } else {
                                break;
                            }
                        }
                    }
                    if (peek()?.type === 'OP' && peek()?.value === ')') {
                        consume(')');
                    }
                }

                // Look up function implementation
                const fn = EXCEL_FUNCTIONS[funcName];
                if (!fn) return '#NAME?';
                try {
                    return fn(...args);
                } catch {
                    return '#VALUE!';
                }
            }

            // Parenthesized expression
            if (tok.type === 'OP' && tok.value === '(') {
                consume('(');
                const expr = parseComparison();
                if (peek()?.type === 'OP' && peek()?.value === ')') {
                    consume(')');
                }
                return expr;
            }

            consume();
            return 0;
        };

        const finalResult = parseComparison();
        if (typeof finalResult === 'number') {
            if (isNaN(finalResult)) return '#NUM!';
            if (!isFinite(finalResult)) return finalResult > 0 ? '#INF!' : '#-INF!';
            return Number(Math.round(finalResult * 1e8) / 1e8);
        }
        return finalResult;
    }
}

/**
 * Public evaluation entry point
 */
export function evaluateCellFormula(formulaStr, cells = {}, visited = new Set()) {
    if (!formulaStr || !String(formulaStr).startsWith('=')) {
        return formulaStr;
    }
    try {
        const tokenizer = new FormulaTokenizer(String(formulaStr));
        const tokens = tokenizer.tokenize();
        if (!tokens.length) return '';
        const evaluator = new FormulaEvaluator(cells, visited);
        return evaluator.evaluateTokens(tokens);
    } catch {
        return '#ERROR!';
    }
}

// 6. Reactive Dependency Graph (DAG) for Cascading Updates
export class SheetDependencyGraph {
    constructor() {
        // Map: cellKey -> Set of cellKeys that this cell references
        this.dependencies = new Map();
        // Map: cellKey -> Set of cellKeys that depend on this cell (dependents)
        this.dependents = new Map();
    }

    /**
     * Extracts all referenced cell keys and range cell keys from a formula
     */
    extractReferences(formula) {
        if (!formula || typeof formula !== 'string' || !formula.startsWith('=')) return [];
        const refs = new Set();
        const tokenizer = new FormulaTokenizer(formula);
        const tokens = tokenizer.tokenize();

        tokens.forEach(tok => {
            if (tok.type === 'CELL') {
                refs.add(normalizeKey(tok.key));
            } else if (tok.type === 'RANGE') {
                const p1 = parseCoord(tok.start);
                const p2 = parseCoord(tok.end);
                if (p1 && p2) {
                    const minR = Math.min(p1.row, p2.row);
                    const maxR = Math.max(p1.row, p2.row);
                    const minC = Math.min(p1.col, p2.col);
                    const maxC = Math.max(p1.col, p2.col);
                    for (let r = minR; r <= maxR; r++) {
                        for (let c = minC; c <= maxC; c++) {
                            refs.add(`${indexToColLetter(c)}${r}`);
                        }
                    }
                }
            }
        });
        return Array.from(refs);
    }

    /**
     * Registers or updates a cell's formula dependencies
     */
    updateCellFormula(cellKey, formula) {
        const normKey = normalizeKey(cellKey);
        // Clear previous dependencies
        const oldDeps = this.dependencies.get(normKey) || new Set();
        oldDeps.forEach(depKey => {
            this.dependents.get(depKey)?.delete(normKey);
        });

        if (!formula || !formula.startsWith('=')) {
            this.dependencies.delete(normKey);
            return;
        }

        const newDeps = new Set(this.extractReferences(formula));
        this.dependencies.set(normKey, newDeps);

        newDeps.forEach(depKey => {
            if (!this.dependents.has(depKey)) {
                this.dependents.set(depKey, new Set());
            }
            this.dependents.get(depKey).add(normKey);
        });
    }

    /**
     * Rebuilds graph from entire sheet cells map
     */
    rebuild(cells = {}) {
        this.dependencies.clear();
        this.dependents.clear();
        Object.entries(cells).forEach(([key, cell]) => {
            if (cell?.formula) {
                this.updateCellFormula(key, cell.formula);
            }
        });
    }

    /**
     * Returns an array of cell keys in topological recalculation order
     * that are affected when changedCellKey is updated.
     */
    getRecalculationOrder(changedCellKey) {
        const normKey = normalizeKey(changedCellKey);
        const order = [];
        const visited = new Set();
        const inProgress = new Set();

        const visit = (key) => {
            if (inProgress.has(key)) return; // Cycle guard
            if (visited.has(key)) return;

            inProgress.add(key);
            const children = this.dependents.get(key) || new Set();
            children.forEach(childKey => visit(childKey));
            inProgress.delete(key);

            visited.add(key);
            if (key !== normKey) {
                order.push(key);
            }
        };

        visit(normKey);
        return order.reverse(); // Downstream dependency order
    }
}
