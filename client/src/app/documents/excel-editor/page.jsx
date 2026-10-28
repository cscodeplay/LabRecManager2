'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Save,
    Download,
    FileSpreadsheet,
    Bold,
    Italic,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Plus,
    Trash2,
    BarChart3,
    Sigma,
    Cloud,
    CloudOff,
    RefreshCw,
    X,
    Filter,
    ArrowUpDown,
    ArrowDown,
    ArrowUp,
    Table,
    FileCode,
    Sliders,
    Layers,
    ExternalLink,
    HardDrive,
    Percent,
    IndianRupee,
    FileText,
    Presentation,
    Printer,
    Sparkles,
    Settings,
    ChevronDown,
    ChevronUp,
    Check,
    Film,
    History,
    Square,
    Search,
    Copy,
    Scissors,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Minimize2,
    Eye,
    EyeOff,
    GripVertical,
    Palette,
    ListFilter,
    ClipboardPaste,
    Menu,
    HelpCircle,
    CheckSquare,
    Undo,
    Redo
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import OfficeThemeToggle from '@/components/OfficeThemeToggle';
import VersionHistoryDrawer from '@/components/VersionHistoryDrawer';
import OfficeAppBlurLoader from '@/components/OfficeAppBlurLoader';
import OfficeOpenImportMenu from '@/components/OfficeOpenImportMenu';
import { useThemeStore } from '@/lib/store';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    AreaChart,
    Area,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend
} from 'recharts';

// Formula autocomplete suggestions database with signatures and documentation
const FORMULA_SUGGESTIONS = [
    { name: 'SUM', syntax: '=SUM(number1, [number2], ...)', desc: 'Adds all the numbers in a range of cells' },
    { name: 'SUMIF', syntax: '=SUMIF(range, criteria, [sum_range])', desc: 'Adds the cells specified by a given condition or criteria' },
    { name: 'SUMIFS', syntax: '=SUMIFS(sum_range, criteria_range1, criteria1, ...)', desc: 'Adds cells in a range that meet multiple criteria' },
    { name: 'SUMPRODUCT', syntax: '=SUMPRODUCT(array1, [array2], ...)', desc: 'Multiplies corresponding components in given arrays, and returns the sum' },
    { name: 'AVERAGE', syntax: '=AVERAGE(number1, [number2], ...)', desc: 'Returns the arithmetic mean of its arguments' },
    { name: 'AVERAGEIF', syntax: '=AVERAGEIF(range, criteria, [average_range])', desc: 'Returns the average of cells in a range that meet a given condition' },
    { name: 'AVERAGEIFS', syntax: '=AVERAGEIFS(avg_range, criteria_range1, criteria1, ...)', desc: 'Returns the average of cells that meet multiple criteria' },
    { name: 'COUNT', syntax: '=COUNT(value1, [value2], ...)', desc: 'Counts how many cells contain numbers in range' },
    { name: 'COUNTA', syntax: '=COUNTA(value1, [value2], ...)', desc: 'Counts the number of cells that are not empty' },
    { name: 'COUNTIF', syntax: '=COUNTIF(range, criteria)', desc: 'Counts cells within a range that meet the given criteria' },
    { name: 'COUNTIFS', syntax: '=COUNTIFS(criteria_range1, criteria1, ...)', desc: 'Counts the number of cells that meet multiple conditions' },
    { name: 'COUNTBLANK', syntax: '=COUNTBLANK(range)', desc: 'Counts empty cells in a specified range' },
    { name: 'MIN', syntax: '=MIN(number1, [number2], ...)', desc: 'Returns the smallest number in a set of values' },
    { name: 'MAX', syntax: '=MAX(number1, [number2], ...)', desc: 'Returns the largest number in a set of values' },
    { name: 'PRODUCT', syntax: '=PRODUCT(number1, [number2], ...)', desc: 'Multiplies all the numbers given as arguments' },
    { name: 'MEDIAN', syntax: '=MEDIAN(number1, [number2], ...)', desc: 'Returns the median of the given numbers' },
    { name: 'STDEV', syntax: '=STDEV(number1, [number2], ...)', desc: 'Estimates standard deviation based on a sample' },
    { name: 'ROUND', syntax: '=ROUND(number, num_digits)', desc: 'Rounds a number to a specified number of digits' },
    { name: 'ROUNDUP', syntax: '=ROUNDUP(number, num_digits)', desc: 'Rounds a number up, away from zero' },
    { name: 'ROUNDDOWN', syntax: '=ROUNDDOWN(number, num_digits)', desc: 'Rounds a number down, toward zero' },
    { name: 'ABS', syntax: '=ABS(number)', desc: 'Returns the absolute positive value of a number' },
    { name: 'SQRT', syntax: '=SQRT(number)', desc: 'Returns the positive square root of a number' },
    { name: 'POWER', syntax: '=POWER(number, power)', desc: 'Returns the result of a number raised to a power' },
    { name: 'IF', syntax: '=IF(logical_test, [value_if_true], [value_if_false])', desc: 'Returns one value if a condition is true, another if false' },
    { name: 'IFS', syntax: '=IFS(logical_test1, value_if_true1, ...)', desc: 'Checks whether one or more conditions are met and returns corresponding value' },
    { name: 'IFERROR', syntax: '=IFERROR(value, value_if_error)', desc: 'Returns value_if_error if formula evaluates to an error' },
    { name: 'AND', syntax: '=AND(logical1, [logical2], ...)', desc: 'Returns TRUE if all arguments are TRUE' },
    { name: 'OR', syntax: '=OR(logical1, [logical2], ...)', desc: 'Returns TRUE if any argument is TRUE' },
    { name: 'NOT', syntax: '=NOT(logical)', desc: 'Reverses the logic of its argument' },
    { name: 'VLOOKUP', syntax: '=VLOOKUP(lookup_val, table, col_index, [exact])', desc: 'Looks for a value in the leftmost column of a table' },
    { name: 'HLOOKUP', syntax: '=HLOOKUP(lookup_val, table, row_index, [exact])', desc: 'Looks for a value in the top row of a table' },
    { name: 'XLOOKUP', syntax: '=XLOOKUP(lookup_val, lookup_array, return_array)', desc: 'Searches a range or array and returns corresponding item' },
    { name: 'INDEX', syntax: '=INDEX(range, row_num, [col_num])', desc: 'Returns the value of a cell within a range by coordinate' },
    { name: 'MATCH', syntax: '=MATCH(lookup_val, lookup_array, [match_type])', desc: 'Returns the relative position of an item in a range' },
    { name: 'CONCATENATE', syntax: '=CONCATENATE(text1, [text2], ...)', desc: 'Joins several text strings into one text string' },
    { name: 'TEXT', syntax: '=TEXT(value, format_text)', desc: 'Formats a number and converts it to text' },
    { name: 'LEFT', syntax: '=LEFT(text, [num_chars])', desc: 'Returns leftmost characters from text string' },
    { name: 'RIGHT', syntax: '=RIGHT(text, [num_chars])', desc: 'Returns rightmost characters from text string' },
    { name: 'MID', syntax: '=MID(text, start_num, num_chars)', desc: 'Returns specific characters from a text string starting at position' },
    { name: 'LEN', syntax: '=LEN(text)', desc: 'Returns the number of characters in a text string' },
    { name: 'UPPER', syntax: '=UPPER(text)', desc: 'Converts text to all uppercase letters' },
    { name: 'LOWER', syntax: '=LOWER(text)', desc: 'Converts text to all lowercase letters' },
    { name: 'TRIM', syntax: '=TRIM(text)', desc: 'Removes all spaces from text except single spaces between words' },
    { name: 'TODAY', syntax: '=TODAY()', desc: 'Returns current date' },
    { name: 'NOW', syntax: '=NOW()', desc: 'Returns current date and time timestamp' }
];

// Worksheet tab color palette options
const TAB_COLORS = [
    { name: 'Default', value: '' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Slate', value: '#64748b' }
];

const PALETTES = {
    emerald: ['#10b981', '#059669', '#34d399', '#6ee7b7', '#047857'],
    indigo: ['#6366f1', '#4f46e5', '#818cf8', '#a5b4fc', '#3730a3'],
    amber: ['#f59e0b', '#d97706', '#fbbf24', '#fde68a', '#b45309'],
    crimson: ['#ef4444', '#dc2626', '#f87171', '#fca5a5', '#991b1b'],
    ocean: ['#06b6d4', '#0891b2', '#22d3ee', '#67e8f9', '#0e7490']
};

// Helper to convert column number (0-indexed) to letter (0 -> A, 25 -> Z)
function colToLetter(colIndex) {
    let letter = '';
    let temp = colIndex;
    while (temp >= 0) {
        letter = String.fromCharCode((temp % 26) + 65) + letter;
        temp = Math.floor(temp / 26) - 1;
    }
    return letter;
}

// Helper to convert column letter to index (A -> 0, Z -> 25, AA -> 26)
function letterToCol(letter) {
    let col = 0;
    const str = String(letter).trim().toUpperCase();
    for (let i = 0; i < str.length; i++) {
        col = col * 26 + (str.charCodeAt(i) - 64);
    }
    return col - 1;
}

// Distinct high-contrast colors for Excel-style formula reference highlighting
const REFERENCE_COLORS = [
    { border: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)', text: '#2563eb' }, // Blue
    { border: '#9333ea', bg: 'rgba(147, 51, 234, 0.12)', text: '#9333ea' }, // Purple
    { border: '#059669', bg: 'rgba(5, 150, 105, 0.12)', text: '#059669' }, // Emerald
    { border: '#d97706', bg: 'rgba(217, 119, 6, 0.12)', text: '#d97706' }, // Amber
    { border: '#e11d48', bg: 'rgba(225, 29, 72, 0.12)', text: '#e11d48' }, // Rose
    { border: '#0891b2', bg: 'rgba(8, 145, 178, 0.12)', text: '#0891b2' }, // Cyan
];

// Extracts all cell & range references from an Excel formula string
function extractFormulaReferences(formula) {
    if (!formula || typeof formula !== 'string' || !formula.startsWith('=')) return [];
    const regex = /(?:([A-Za-z0-9_]+)!)?(\$?[A-Z]+)(\$?[0-9]+)(?::(\$?[A-Z]+)(\$?[0-9]+))?/g;
    const refs = [];
    let match;
    let colorIdx = 0;
    while ((match = regex.exec(formula)) !== null) {
        const col1Str = match[2].replace(/\$/g, '');
        const row1Str = match[3].replace(/\$/g, '');
        const col2Str = match[4] ? match[4].replace(/\$/g, '') : null;
        const row2Str = match[5] ? match[5].replace(/\$/g, '') : null;

        const startCol = letterToCol(col1Str);
        const startRow = parseInt(row1Str, 10);
        const endCol = col2Str ? letterToCol(col2Str) : startCol;
        const endRow = row2Str ? parseInt(row2Str, 10) : startRow;

        if (isNaN(startRow) || isNaN(startCol) || startRow < 1 || startCol < 0) continue;

        const color = REFERENCE_COLORS[colorIdx % REFERENCE_COLORS.length];
        colorIdx++;

        refs.push({
            raw: match[0],
            sheetName: match[1] || null,
            startCol: Math.min(startCol, endCol),
            startRow: Math.min(startRow, endRow),
            endCol: Math.max(startCol, endCol),
            endRow: Math.max(startRow, endRow),
            color
        });
    }
    return refs;
}

// Adjusts relative references in formula when dragging/autofilling
function adjustFormulaReferences(formula, deltaCol, deltaRow) {
    if (!formula || typeof formula !== 'string' || !formula.startsWith('=')) return formula;
    return formula.replace(/(\$?[A-Z]+)(\$?[0-9]+)/g, (match, colPart, rowPart) => {
        let newColPart = colPart;
        let newRowPart = rowPart;
        if (!colPart.startsWith('$')) {
            const colIdx = letterToCol(colPart) + deltaCol;
            if (colIdx >= 0) newColPart = colToLetter(colIdx);
        }
        if (!rowPart.startsWith('$')) {
            const rowNum = parseInt(rowPart, 10) + deltaRow;
            if (rowNum >= 1) newRowPart = String(rowNum);
        }
        return `${newColPart}${newRowPart}`;
    });
}

// Indian Numbering Formatter: 1234567 -> ₹ 12,34,567.00
function formatIndianCurrency(num) {
    if (isNaN(num) || num === '' || num === null) return num;
    const n = Number(num);
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
    }).format(n);
}

// Lakhs / Crores Formatter
function formatLakhsCrores(num) {
    if (isNaN(num) || num === '' || num === null) return num;
    const n = Number(num);
    const abs = Math.abs(n);
    if (abs >= 10000000) {
        return `${(n / 10000000).toFixed(2)} Cr`;
    } else if (abs >= 100000) {
        return `${(n / 100000).toFixed(2)} Lakhs`;
    }
    return n.toLocaleString('en-IN');
}

// Helper to parse cell coordinate e.g. "B12" -> { col: 1, row: 12 }
function parseCellCoord(coord) {
    const match = String(coord).trim().toUpperCase().match(/^([A-Z]+)([0-9]+)$/);
    if (!match) return null;
    let col = 0;
    const colStr = match[1];
    for (let i = 0; i < colStr.length; i++) {
        col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    return { col: col - 1, row: parseInt(match[2], 10) };
}

// Helper to get array of cell values in range e.g. "A1:B3"
function getRangeValues(startCoord, endCoord, cells) {
    const p1 = parseCellCoord(startCoord);
    const p2 = parseCellCoord(endCoord);
    if (!p1 || !p2) return [];

    const minRow = Math.min(p1.row, p2.row);
    const maxRow = Math.max(p1.row, p2.row);
    const minCol = Math.min(p1.col, p2.col);
    const maxCol = Math.max(p1.col, p2.col);

    const values = [];
    for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
            const key = `${colToLetter(c)}${r}`;
            values.push(cells[key]?.val);
        }
    }
    return values;
}

// Helper to get 2D matrix of cell values in range e.g. "A1:C3" -> [[A1, B1, C1], [A2, B2, C2], [A3, B3, C3]]
function getRangeMatrix(startCoord, endCoord, cells) {
    const p1 = parseCellCoord(startCoord);
    const p2 = parseCellCoord(endCoord);
    if (!p1 || !p2) return [];

    const minRow = Math.min(p1.row, p2.row);
    const maxRow = Math.max(p1.row, p2.row);
    const minCol = Math.min(p1.col, p2.col);
    const maxCol = Math.max(p1.col, p2.col);

    const matrix = [];
    for (let r = minRow; r <= maxRow; r++) {
        const row = [];
        for (let c = minCol; c <= maxCol; c++) {
            const key = `${colToLetter(c)}${r}`;
            row.push(cells[key]?.val);
        }
        matrix.push(row);
    }
    return matrix;
}

// Split formula arguments respecting nested parentheses and quotes
function splitTopLevelArgs(str) {
    const args = [];
    let current = '';
    let depth = 0;
    let inQuotes = false;
    let quoteChar = '';
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if ((ch === '"' || ch === "'") && (i === 0 || str[i - 1] !== '\\')) {
            if (!inQuotes) { inQuotes = true; quoteChar = ch; }
            else if (quoteChar === ch) { inQuotes = false; }
            current += ch;
        } else if (inQuotes) {
            current += ch;
        } else if (ch === '(') {
            depth++;
            current += ch;
        } else if (ch === ')') {
            depth--;
            current += ch;
        } else if (ch === ',' && depth === 0) {
            args.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    if (current.trim()) args.push(current.trim());
    return args;
}

// Evaluate criteria expressions for COUNTIF, SUMIF, AVERAGEIF
function matchesCriteria(val, criteria) {
    if (criteria === undefined || criteria === null) return true;
    let strCrit = String(criteria).trim();
    if (strCrit.startsWith('"') && strCrit.endsWith('"')) strCrit = strCrit.slice(1, -1);
    if (strCrit.startsWith("'") && strCrit.endsWith("'")) strCrit = strCrit.slice(1, -1);
    const strVal = String(val ?? '').trim();
    if (strCrit.startsWith('>=') || strCrit.startsWith('<=') || strCrit.startsWith('>') || strCrit.startsWith('<') || strCrit.startsWith('!=')) {
        const op = strCrit.match(/^([><!=]=?)/)[1];
        const target = Number(strCrit.substring(op.length).trim());
        const numVal = Number(val);
        if (isNaN(numVal) || isNaN(target)) return false;
        if (op === '>=') return numVal >= target;
        if (op === '<=') return numVal <= target;
        if (op === '>') return numVal > target;
        if (op === '<') return numVal < target;
        if (op === '!=') return numVal !== target;
    }
    if (strCrit.startsWith('=')) {
        return strVal.toLowerCase() === strCrit.substring(1).trim().toLowerCase();
    }
    return strVal.toLowerCase() === strCrit.toLowerCase();
}

// Evaluate spreadsheet formulas in a cell (VLOOKUP, INDEX, MATCH, COUNTIF, SUMIF, AVERAGEIF, IFERROR, IFS, IF, SUM, AVERAGE, MIN, MAX, PRODUCT, MEDIAN, STDEV, ROUND, ROUNDUP, ROUNDDOWN, ABS, SQRT, INT, POWER, UPPER, LOWER, LEN, TRIM, CONCATENATE, LEFT, RIGHT, MID, arithmetic)
function evaluateFormula(formulaStr, cells) {
    if (!formulaStr || !String(formulaStr).startsWith('=')) return formulaStr;
    const raw = String(formulaStr).substring(1).trim();
    const cleanFormula = raw.toUpperCase();

    try {
        if (cleanFormula === 'TODAY()') return new Date().toLocaleDateString('en-IN');
        if (cleanFormula === 'NOW()') return new Date().toLocaleString('en-IN');

        // IFERROR(expr, fallback)
        const ifErrorMatch = raw.match(/^IFERROR\s*\((.+)\)$/i);
        if (ifErrorMatch) {
            const args = splitTopLevelArgs(ifErrorMatch[1]);
            if (args.length >= 2) {
                let expr = args[0].trim();
                if (!expr.startsWith('=')) expr = '=' + expr;
                const fallback = args[1].trim().replace(/^["']|["']$/g, '');
                const res = evaluateFormula(expr, cells);
                if (String(res).startsWith('#')) return fallback;
                return res;
            }
        }

        // VLOOKUP(lookupVal, A1:C10, colIndex, [exact])
        const vlookupMatch = raw.match(/^VLOOKUP\s*\((.+)\)$/i);
        if (vlookupMatch) {
            const args = splitTopLevelArgs(vlookupMatch[1]);
            if (args.length >= 3) {
                let lookup = args[0].trim().replace(/^["']|["']$/g, '');
                if (parseCellCoord(lookup)) lookup = cells[lookup.toUpperCase()]?.val;
                const rangeParts = args[1].trim().split(':');
                if (rangeParts.length === 2) {
                    const startC = rangeParts[0].trim().toUpperCase();
                    const endC = rangeParts[1].trim().toUpperCase();
                    const colIdx = parseInt(args[2].trim(), 10);
                    const matrix = getRangeMatrix(startC, endC, cells);
                    const target = String(lookup ?? '').toLowerCase();
                    for (const row of matrix) {
                        if (String(row[0] ?? '').toLowerCase() === target) {
                            return row[colIdx - 1] !== undefined ? row[colIdx - 1] : '#REF!';
                        }
                    }
                    return '#N/A';
                }
            }
        }

        // HLOOKUP(lookupVal, A1:Z4, rowIndex, [exact])
        const hlookupMatch = raw.match(/^HLOOKUP\s*\((.+)\)$/i);
        if (hlookupMatch) {
            const args = splitTopLevelArgs(hlookupMatch[1]);
            if (args.length >= 3) {
                let lookup = args[0].trim().replace(/^["']|["']$/g, '');
                if (parseCellCoord(lookup)) lookup = cells[lookup.toUpperCase()]?.val;
                const rangeParts = args[1].trim().split(':');
                if (rangeParts.length === 2) {
                    const matrix = getRangeMatrix(rangeParts[0].trim().toUpperCase(), rangeParts[1].trim().toUpperCase(), cells);
                    const rowIdx = parseInt(args[2].trim(), 10) - 1;
                    const target = String(lookup ?? '').toLowerCase();
                    if (matrix.length > 0) {
                        for (let col = 0; col < matrix[0].length; col++) {
                            if (String(matrix[0][col] ?? '').toLowerCase() === target) {
                                return matrix[rowIdx] && matrix[rowIdx][col] !== undefined ? matrix[rowIdx][col] : '#REF!';
                            }
                        }
                    }
                    return '#N/A';
                }
            }
        }

        // INDEX(range, row, [col])
        const indexMatch = raw.match(/^INDEX\s*\((.+)\)$/i);
        if (indexMatch) {
            const args = splitTopLevelArgs(indexMatch[1]);
            if (args.length >= 2) {
                const rangeParts = args[0].trim().split(':');
                if (rangeParts.length === 2) {
                    const matrix = getRangeMatrix(rangeParts[0].trim().toUpperCase(), rangeParts[1].trim().toUpperCase(), cells);
                    const rowIdx = parseInt(args[1].trim(), 10) - 1;
                    const colIdx = args[2] ? parseInt(args[2].trim(), 10) - 1 : 0;
                    if (matrix[rowIdx] && matrix[rowIdx][colIdx] !== undefined) {
                        return matrix[rowIdx][colIdx];
                    }
                    return '#REF!';
                }
            }
        }

        // MATCH(val, range, [type])
        const matchMatch = raw.match(/^MATCH\s*\((.+)\)$/i);
        if (matchMatch) {
            const args = splitTopLevelArgs(matchMatch[1]);
            if (args.length >= 2) {
                let lookup = args[0].trim().replace(/^["']|["']$/g, '');
                if (parseCellCoord(lookup)) lookup = cells[lookup.toUpperCase()]?.val;
                const rangeParts = args[1].trim().split(':');
                if (rangeParts.length === 2) {
                    const vals = getRangeValues(rangeParts[0].trim().toUpperCase(), rangeParts[1].trim().toUpperCase(), cells);
                    const target = String(lookup ?? '').toLowerCase();
                    for (let i = 0; i < vals.length; i++) {
                        if (String(vals[i] ?? '').toLowerCase() === target) {
                            return i + 1;
                        }
                    }
                    return '#N/A';
                }
            }
        }

        // COUNTIF(range, criteria)
        const countifMatch = raw.match(/^COUNTIF\s*\(([A-Za-z]+[0-9]+):([A-Za-z]+[0-9]+)\s*,\s*(.+)\)$/i);
        if (countifMatch) {
            const vals = getRangeValues(countifMatch[1].toUpperCase(), countifMatch[2].toUpperCase(), cells);
            let crit = countifMatch[3].trim().replace(/^["']|["']$/g, '');
            if (parseCellCoord(crit)) crit = cells[crit.toUpperCase()]?.val;
            return vals.filter(v => matchesCriteria(v, crit)).length;
        }

        // SUMIF(range, criteria, [sum_range])
        const sumifMatch = raw.match(/^SUMIF\s*\(([A-Za-z]+[0-9]+):([A-Za-z]+[0-9]+)\s*,\s*(.+?)(?:\s*,\s*([A-Za-z]+[0-9]+):([A-Za-z]+[0-9]+))?\)$/i);
        if (sumifMatch) {
            const vals = getRangeValues(sumifMatch[1].toUpperCase(), sumifMatch[2].toUpperCase(), cells);
            let crit = sumifMatch[3].trim().replace(/^["']|["']$/g, '');
            if (parseCellCoord(crit)) crit = cells[crit.toUpperCase()]?.val;
            const sumVals = sumifMatch[4] ? getRangeValues(sumifMatch[4].toUpperCase(), sumifMatch[5].toUpperCase(), cells) : vals;
            let sum = 0;
            vals.forEach((v, idx) => {
                if (matchesCriteria(v, crit)) {
                    const n = Number(sumVals[idx]);
                    if (!isNaN(n)) sum += n;
                }
            });
            return sum;
        }

        // AVERAGEIF(range, criteria, [avg_range])
        const avgifMatch = raw.match(/^AVERAGEIF\s*\(([A-Za-z]+[0-9]+):([A-Za-z]+[0-9]+)\s*,\s*(.+?)(?:\s*,\s*([A-Za-z]+[0-9]+):([A-Za-z]+[0-9]+))?\)$/i);
        if (avgifMatch) {
            const vals = getRangeValues(avgifMatch[1].toUpperCase(), avgifMatch[2].toUpperCase(), cells);
            let crit = avgifMatch[3].trim().replace(/^["']|["']$/g, '');
            if (parseCellCoord(crit)) crit = cells[crit.toUpperCase()]?.val;
            const avgVals = avgifMatch[4] ? getRangeValues(avgifMatch[4].toUpperCase(), avgifMatch[5].toUpperCase(), cells) : vals;
            let sum = 0, count = 0;
            vals.forEach((v, idx) => {
                if (matchesCriteria(v, crit)) {
                    const n = Number(avgVals[idx]);
                    if (!isNaN(n)) { sum += n; count++; }
                }
            });
            return count ? Number((sum / count).toFixed(2)) : 0;
        }

        // Range functions: SUM, AVERAGE, COUNT, COUNTA, MIN, MAX, PRODUCT, MEDIAN, STDEV
        const rangeFnMatch = cleanFormula.match(/^(SUM|AVERAGE|COUNT|COUNTA|MIN|MAX|PRODUCT|MEDIAN|STDEV)\(([A-Z]+[0-9]+):([A-Z]+[0-9]+)\)$/);
        if (rangeFnMatch) {
            const fn = rangeFnMatch[1];
            const vals = getRangeValues(rangeFnMatch[2], rangeFnMatch[3], cells);
            const numVals = vals.map(v => Number(v)).filter(v => !isNaN(v) && v !== null && v !== '');

            if (fn === 'SUM') return numVals.reduce((a, b) => a + b, 0);
            if (fn === 'AVERAGE') return numVals.length ? Number((numVals.reduce((a, b) => a + b, 0) / numVals.length).toFixed(2)) : 0;
            if (fn === 'COUNT') return numVals.length;
            if (fn === 'COUNTA') return vals.filter(v => v !== undefined && v !== null && v !== '').length;
            if (fn === 'MIN') return numVals.length ? Math.min(...numVals) : 0;
            if (fn === 'MAX') return numVals.length ? Math.max(...numVals) : 0;
            if (fn === 'PRODUCT') return numVals.length ? numVals.reduce((a, b) => a * b, 1) : 0;
            if (fn === 'MEDIAN') {
                if (!numVals.length) return 0;
                const sorted = [...numVals].sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                return sorted.length % 2 !== 0 ? sorted[mid] : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
            }
            if (fn === 'STDEV') {
                if (numVals.length <= 1) return 0;
                const avg = numVals.reduce((a, b) => a + b, 0) / numVals.length;
                const variance = numVals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / (numVals.length - 1);
                return Number(Math.sqrt(variance).toFixed(2));
            }
        }

        // IF(cond, trueVal, falseVal)
        const ifMatch = raw.match(/^IF\s*\((.+)\)$/i);
        if (ifMatch) {
            const args = splitTopLevelArgs(ifMatch[1]);
            if (args.length >= 3) {
                let cond = args[0].trim();
                const trueVal = args[1].trim().replace(/^["']|["']$/g, '');
                const falseVal = args[2].trim().replace(/^["']|["']$/g, '');

                cond = cond.replace(/([A-Z]+[0-9]+)/gi, (m) => {
                    const cVal = cells[m.toUpperCase()]?.val;
                    return !isNaN(Number(cVal)) ? Number(cVal) : JSON.stringify(cVal || '');
                });
                cond = cond.replace(/(?<![<>!=])=(?!=)/g, '===');
                // eslint-disable-next-line no-new-func
                const evalCond = Function(`return Boolean(${cond})`)();
                return evalCond ? trueVal : falseVal;
            }
        }

        // IFS(cond1, val1, cond2, val2, ...)
        const ifsMatch = raw.match(/^IFS\s*\((.+)\)$/i);
        if (ifsMatch) {
            const args = splitTopLevelArgs(ifsMatch[1]);
            for (let i = 0; i < args.length; i += 2) {
                if (i + 1 < args.length) {
                    let cond = args[i].trim();
                    const val = args[i + 1].trim().replace(/^["']|["']$/g, '');
                    cond = cond.replace(/([A-Z]+[0-9]+)/gi, (m) => {
                        const cVal = cells[m.toUpperCase()]?.val;
                        return !isNaN(Number(cVal)) ? Number(cVal) : JSON.stringify(cVal || '');
                    });
                    cond = cond.replace(/(?<![<>!=])=(?!=)/g, '===');
                    // eslint-disable-next-line no-new-func
                    const evalCond = Function(`return Boolean(${cond})`)();
                    if (evalCond) return val;
                }
            }
            return '#N/A';
        }

        // String functions: LEFT, RIGHT, MID
        const leftMatch = raw.match(/^LEFT\s*\((.+?)(?:\s*,\s*(\d+))?\)$/i);
        if (leftMatch) {
            let str = leftMatch[1].trim().replace(/^["']|["']$/g, '');
            if (parseCellCoord(str)) str = String(cells[str.toUpperCase()]?.val ?? '');
            const len = leftMatch[2] ? parseInt(leftMatch[2], 10) : 1;
            return str.substring(0, len);
        }
        const rightMatch = raw.match(/^RIGHT\s*\((.+?)(?:\s*,\s*(\d+))?\)$/i);
        if (rightMatch) {
            let str = rightMatch[1].trim().replace(/^["']|["']$/g, '');
            if (parseCellCoord(str)) str = String(cells[str.toUpperCase()]?.val ?? '');
            const len = rightMatch[2] ? parseInt(rightMatch[2], 10) : 1;
            return str.substring(Math.max(0, str.length - len));
        }
        const midMatch = raw.match(/^MID\s*\((.+?)\s*,\s*(\d+)\s*,\s*(\d+)\)$/i);
        if (midMatch) {
            let str = midMatch[1].trim().replace(/^["']|["']$/g, '');
            if (parseCellCoord(str)) str = String(cells[str.toUpperCase()]?.val ?? '');
            const start = parseInt(midMatch[2], 10) - 1;
            const len = parseInt(midMatch[3], 10);
            return str.substring(start, start + len);
        }

        // ROUND, ROUNDUP, ROUNDDOWN
        const roundMatch = cleanFormula.match(/^(ROUND|ROUNDUP|ROUNDDOWN)\(([A-Z]+[0-9]+|\d+(?:\.\d+)?)\s*,\s*(\d+)\)$/);
        if (roundMatch) {
            const fn = roundMatch[1];
            let val = roundMatch[2];
            if (parseCellCoord(val)) val = cells[val]?.val;
            const digits = parseInt(roundMatch[3], 10);
            const factor = Math.pow(10, digits);
            const n = Number(val);
            if (fn === 'ROUNDUP') return Number((Math.ceil(n * factor) / factor).toFixed(digits));
            if (fn === 'ROUNDDOWN') return Number((Math.floor(n * factor) / factor).toFixed(digits));
            return Number(n.toFixed(digits));
        }

        // ABS, SQRT, INT
        const singleMathMatch = cleanFormula.match(/^(ABS|SQRT|INT)\(([A-Z]+[0-9]+|\d+(?:\.\d+)?)\)$/);
        if (singleMathMatch) {
            const fn = singleMathMatch[1];
            let val = singleMathMatch[2];
            if (parseCellCoord(val)) val = cells[val]?.val;
            const n = Number(val);
            if (fn === 'ABS') return Math.abs(n);
            if (fn === 'SQRT') return n >= 0 ? Number(Math.sqrt(n).toFixed(2)) : '#NUM!';
            if (fn === 'INT') return Math.floor(n);
        }

        // POWER(val, exp)
        const powerMatch = cleanFormula.match(/^POWER\(([A-Z]+[0-9]+|\d+(?:\.\d+)?)\s*,\s*([A-Z]+[0-9]+|\d+(?:\.\d+)?)\)$/);
        if (powerMatch) {
            let base = powerMatch[1];
            let exp = powerMatch[2];
            if (parseCellCoord(base)) base = cells[base]?.val;
            if (parseCellCoord(exp)) exp = cells[exp]?.val;
            return Number(Math.pow(Number(base), Number(exp)).toFixed(2));
        }

        // String Functions: UPPER, LOWER, LEN, TRIM
        const strFnMatch = raw.match(/^(UPPER|LOWER|LEN|TRIM)\((.+?)\)$/i);
        if (strFnMatch) {
            const fn = strFnMatch[1].toUpperCase();
            let arg = strFnMatch[2].trim().replace(/^["']|["']$/g, '');
            if (parseCellCoord(arg)) arg = String(cells[arg.toUpperCase()]?.val ?? '');
            if (fn === 'UPPER') return arg.toUpperCase();
            if (fn === 'LOWER') return arg.toLowerCase();
            if (fn === 'LEN') return arg.length;
            if (fn === 'TRIM') return arg.trim();
        }

        // CONCATENATE(a, b, ...)
        const concatMatch = raw.match(/^CONCATENATE\((.+?)\)$/i);
        if (concatMatch) {
            const parts = concatMatch[1].split(',').map(p => {
                let s = p.trim().replace(/^["']|["']$/g, '');
                if (parseCellCoord(s)) s = String(cells[s.toUpperCase()]?.val ?? '');
                return s;
            });
            return parts.join('');
        }

        // Simple arithmetic expression with cell coordinates replacement: e.g. B2*C2 or (A1+B1)/2
        let expression = cleanFormula.replace(/([A-Z]+[0-9]+)/g, (match) => {
            const cVal = cells[match]?.val;
            return !isNaN(Number(cVal)) && cVal !== '' && cVal !== null ? Number(cVal) : 0;
        });

        if (/^[0-9+\-*/().\s%]+$/.test(expression)) {
            expression = expression.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
            // eslint-disable-next-line no-new-func
            const computed = Function(`return (${expression})`)();
            return typeof computed === 'number' ? Number(computed.toFixed(2)) : computed;
        }
    } catch (err) {
        return '#VALUE!';
    }
    return formulaStr;
}

export default function ExcelEditorPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const docIdParam = searchParams.get('id') || searchParams.get('docId');
    const driveFileIdParam = searchParams.get('driveFileId');

    // Document state
    const [docId, setDocId] = useState(docIdParam || null);
    const [mediaDocId, setMediaDocId] = useState(null);
    const [title, setTitle] = useState(searchParams.get('title') || 'Untitled Spreadsheet');
    const [isDriveFile, setIsDriveFile] = useState(Boolean(driveFileIdParam));
    const [saveStatus, setSaveStatus] = useState('saved');

    // Grid state
    const [rowCount, setRowCount] = useState(1000);
    const [colCount, setColCount] = useState(26);
    const [sheets, setSheets] = useState([
        {
            name: 'LabGrades',
            cells: {
                'A1': { val: 'Student', bold: true, bg: '#f1f5f9' },
                'B1': { val: 'Physics Lab', bold: true, bg: '#f1f5f9' },
                'C1': { val: 'Chemistry Lab', bold: true, bg: '#f1f5f9' },
                'D1': { val: 'Total', bold: true, bg: '#f1f5f9' },
                'A2': { val: 'Aarav Sharma' },
                'B2': { val: 85 },
                'C2': { val: 90 },
                'D2': { formula: '=B2+C2', val: 175 },
                'A3': { val: 'Diya Patel' },
                'B3': { val: 92 },
                'C3': { val: 88 },
                'D3': { formula: '=B3+C3', val: 180 },
                'A4': { val: 'Rohan Verma' },
                'B4': { val: 78 },
                'C4': { val: 82 },
                'D4': { formula: '=B4+C4', val: 160 },
                'A5': { val: 'Average', bold: true },
                'B5': { formula: '=AVERAGE(B2:B4)', val: 85, bold: true, bg: '#e0f2fe' },
                'C5': { formula: '=AVERAGE(C2:C4)', val: 86.67, bold: true, bg: '#e0f2fe' }
            }
        }
    ]);
    const [activeSheetIndex, setActiveSheetIndex] = useState(0);

    // Selected cell state & Multi-selection
    const [selectedCell, setSelectedCell] = useState('A1');
    const [selectionAnchor, setSelectionAnchor] = useState({ col: 0, row: 1 });
    const [selectionEndpoint, setSelectionEndpoint] = useState({ col: 0, row: 1 });
    const [multiSelectedCells, setMultiSelectedCells] = useState(new Set(['A1']));
    const [formulaInput, setFormulaInput] = useState('');
    const [editingCell, setEditingCell] = useState(null);
    const [freezeHeader, setFreezeHeader] = useState(true);

    // Dynamic formula reference extraction for visual highlighting
    const formulaRefs = useMemo(() => {
        if (!formulaInput || typeof formulaInput !== 'string' || !formulaInput.startsWith('=')) {
            return [];
        }
        return extractFormulaReferences(formulaInput);
    }, [formulaInput]);

    // Interactive Column & Row Resizing
    const [resizingCol, setResizingCol] = useState(null); // { colLetter, startX, startWidth }
    const [resizingRow, setResizingRow] = useState(null); // { rowNum, startY, startHeight }

    // Autofill Fill Handle Dragging
    const [isDraggingFillHandle, setIsDraggingFillHandle] = useState(false);
    const [fillSourceRange, setFillSourceRange] = useState(null);
    const [fillTargetRange, setFillTargetRange] = useState(null);

    // Grid Virtualization for 1,000+ Rows
    const gridContainerRef = useRef(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(650);

    // Multi-cell range selection state & live analytics
    const [selectionRange, setSelectionRange] = useState({ startCol: 0, startRow: 1, endCol: 0, endRow: 1 });
    const [isDraggingRange, setIsDraggingRange] = useState(false);
    const [borderMenuOpen, setBorderMenuOpen] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Clipboard & Marching Ants
    const [copiedData, setCopiedData] = useState(null); // { minC, maxC, minR, maxR, rows: [...], isCut: boolean }
    const [marchingAntsRange, setMarchingAntsRange] = useState(null); // { startCol, startRow, endCol, endRow }

    // Formula Autocomplete & Interactive Suggestion
    const [formulaSuggestions, setFormulaSuggestions] = useState([]);
    const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0);
    const [hoveredSuggestionIdx, setHoveredSuggestionIdx] = useState(null);
    const [isFormulaBarFocused, setIsFormulaBarFocused] = useState(false);

    // Initial Loading & Error Resilience
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    // Row & Column Multi-Selection
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [selectedCols, setSelectedCols] = useState(new Set());
    const [rowAnchor, setRowAnchor] = useState(null);
    const [colAnchor, setColAnchor] = useState(null);

    // Font Color Palette State
    const [fontColorMenuOpen, setFontColorMenuOpen] = useState(false);
    const [activeFontColor, setActiveFontColor] = useState('#000000');

    // Worksheet Tabs Inline Controls, Context Menu & Reordering
    const [activeTabMenuIndex, setActiveTabMenuIndex] = useState(null);
    const [tabContextMenu, setTabContextMenu] = useState(null); // { index, x, y }
    const [draggedSheetIndex, setDraggedSheetIndex] = useState(null);
    const [showAllSheetsMenu, setShowAllSheetsMenu] = useState(false);
    const [sheetSearchQuery, setSheetSearchQuery] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Chart Inspector Data Range Selection
    const [isSelectingChartRange, setIsSelectingChartRange] = useState(false);
    const [chartUseRowHeaders, setChartUseRowHeaders] = useState(true);
    const [chartUseColLabels, setChartUseColLabels] = useState(true);

    // Small Picture / Thumbnail Preview Badge on Every Addition
    const [additionBadge, setAdditionBadge] = useState(null); // { title, subtitle, type, timestamp }

    const triggerAdditionBadge = (title, subtitle, type = 'chart', customThumbnail = null) => {
        setAdditionBadge({
            title,
            subtitle,
            type,
            thumbnail: customThumbnail,
            timestamp: Date.now()
        });
        setTimeout(() => {
            setAdditionBadge(prev => (prev?.title === title ? null : prev));
        }, 3600);
    };

    // Global Theme State
    const { theme } = useThemeStore();
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const updateTheme = () => {
            if (theme === 'dark' || theme === 'contrast') {
                setIsDark(true);
            } else if (theme === 'light') {
                setIsDark(false);
            } else if (theme === 'system') {
                setIsDark(typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            }
        };
        updateTheme();
        if (typeof window !== 'undefined') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const listener = () => { if (theme === 'system') updateTheme(); };
            mq.addEventListener('change', listener);
            return () => mq.removeEventListener('change', listener);
        }
    }, [theme]);

    // View & Layout Preferences
    const [zoomLevel, setZoomLevel] = useState(100); // 50, 75, 100, 125, 150, 200
    const [freezeCol, setFreezeCol] = useState(false);
    const [showGridlines, setShowGridlines] = useState(true);
    const [showHeaders, setShowHeaders] = useState(true);
    const [density, setDensity] = useState('comfortable'); // 'compact' | 'comfortable'
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Right-Click Context Menu State
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, cellKey: null, rowNum: null, colIdx: null });

    // Find and Replace Modal State
    const [showFindReplace, setShowFindReplace] = useState(false);
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');

    // Sheet Rename Modal
    const [sheetModal, setSheetModal] = useState({ open: false, index: 0, name: '' });

    // Dropdown menus
    const [activeMenu, setActiveMenu] = useState(null); // 'file', 'edit', 'view', 'insert', 'format', 'data', 'help'

    // AutoFilter & Sorting State
    const [isFilterActive, setIsFilterActive] = useState(false);
    const [activeFilters, setActiveFilters] = useState({}); // { [colLetter]: string[] }
    const [openFilterCol, setOpenFilterCol] = useState(null);
    const [filterSearch, setFilterSearch] = useState('');

    // In-Cell Data Validation Modal
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [validationInput, setValidationInput] = useState('Pass, Fail, Absent');
    const [openValidationCell, setOpenValidationCell] = useState(null);

    // Conditional Formatting State & Modal
    const [showCondFormatModal, setShowCondFormatModal] = useState(false);
    const [condRules, setCondRules] = useState([
        { id: 'rule_1', range: 'B2:C10', type: 'greater', val: 85, bg: '#dcfce7', color: '#166534' },
        { id: 'rule_2', range: 'B2:C10', type: 'less', val: 50, bg: '#fee2e2', color: '#991b1b' }
    ]);
    const [newRuleRange, setNewRuleRange] = useState('B2:D10');
    const [newRuleType, setNewRuleType] = useState('greater'); // 'greater', 'less', 'equal'
    const [newRuleVal, setNewRuleVal] = useState('80');
    const [newRuleBg, setNewRuleBg] = useState('#dcfce7');
    const [newRuleColor, setNewRuleColor] = useState('#166534');

    // Right-side Chart Configuration Inspector
    const [showChartInspector, setShowChartInspector] = useState(false);
    const [inspectorTab, setInspectorTab] = useState('setup'); // 'setup', 'customize'
    const [chartType, setChartType] = useState('bar'); // 'bar', 'line', 'pie', 'area'
    const [chartDataRange, setChartDataRange] = useState('A1:C4');
    const [chartTitle, setChartTitle] = useState('Lab Performance Distribution');
    const [chartPalette, setChartPalette] = useState('emerald');
    const [legendPos, setLegendPos] = useState('bottom'); // 'top', 'bottom', 'right', 'none'

    // Auto-save timer
    const autoSaveTimerRef = useRef(null);

    const currentSheet = sheets[activeSheetIndex] || sheets[0];
    const cells = currentSheet.cells || {};
    const colWidths = currentSheet.colWidths || {};
    const rowHeights = currentSheet.rowHeights || {};

    // Auto-save logic
    const triggerAutoSave = useCallback(() => {
        setSaveStatus('saving');
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        autoSaveTimerRef.current = setTimeout(async () => {
            try {
                const payload = {
                    title: title || 'Untitled Spreadsheet',
                    docType: 'excel',
                    content: {
                        activeSheet: currentSheet.name || 'Sheet1',
                        sheets: sheets.map(s => ({
                            name: s.name,
                            rows: rowCount,
                            cols: colCount,
                            cells: s.cells || {},
                            colWidths: s.colWidths || {},
                            rowHeights: s.rowHeights || {}
                        }))
                    }
                };

                if (docId) {
                    await api.put(`/office/documents/${docId}`, payload);
                } else {
                    const res = await api.post('/office/documents', payload);
                    if (res.data?.success && res.data.data?.id) {
                        const newId = res.data.data.id;
                        setDocId(newId);
                        if (typeof window !== 'undefined') {
                            const url = new URL(window.location.href);
                            url.searchParams.set('id', newId);
                            window.history.replaceState(null, '', url.toString());
                        }
                    }
                }

                // In-place auto-sync with media files only if already linked
                if (mediaDocId) {
                    api.post('/office/documents/save-to-media-files', {
                        docType: 'excel',
                        format: 'xlsx',
                        title: title || 'Untitled Spreadsheet',
                        content: payload.content,
                        documentId: mediaDocId,
                        officeDocId: docId
                    }).catch(() => {});
                }

                setSaveStatus('saved');
            } catch (err) {
                console.error('Auto-save error:', err);
                setSaveStatus('offline');
            }
        }, 1500);
    }, [title, docId, mediaDocId, sheets, currentSheet.name, rowCount, colCount]);

    const handleSaveToOfficeMediaFiles = async () => {
        try {
            setSaveStatus('saving');
            toast.loading('Saving to Office Media Files/Excel Spreadsheets...', { id: 'excel-media-save' });
            const payloadContent = {
                activeSheet: currentSheet.name || 'Sheet1',
                sheets: sheets.map(s => ({
                    name: s.name,
                    rows: rowCount,
                    cols: colCount,
                    cells: s.cells || {},
                    colWidths: s.colWidths || {},
                    rowHeights: s.rowHeights || {}
                }))
            };
            const res = await api.post('/office/documents/save-to-media-files', {
                docType: 'excel',
                format: 'xlsx',
                title: title || 'Untitled Spreadsheet',
                content: payloadContent,
                documentId: mediaDocId,
                officeDocId: docId
            });
            if (res.data?.success) {
                if (res.data.data?.document?.id) {
                    setMediaDocId(res.data.data.document.id);
                }
                setSaveStatus('saved');
                toast.success('Successfully saved to Office Media Files > Excel Spreadsheets!', { id: 'excel-media-save' });
            } else {
                setSaveStatus('offline');
                toast.error('Failed to save to Office Media Files', { id: 'excel-media-save' });
            }
        } catch (err) {
            console.error('Save to media error:', err);
            setSaveStatus('offline');
            toast.error('Could not save to Office Media Files', { id: 'excel-media-save' });
        }
    };

    const handleOpenOfficeDoc = async (fileItem) => {
        try {
            setIsInitialLoading(true);
            toast.loading(`Opening "${fileItem.name}"...`, { id: 'excel-open' });
            if (fileItem.id) {
                const res = await api.get(`/office/documents/${fileItem.id}`);
                const d = res.data?.data;
                if (d && d.current_content) {
                    setDocId(d.id);
                    setTitle(d.title || fileItem.name);
                    const sheetsData = d.current_content.sheets;
                    if (Array.isArray(sheetsData) && sheetsData.length > 0) {
                        setSheets(sheetsData);
                        setActiveSheetIndex(0);
                    }
                    toast.success(`Opened "${fileItem.name}"!`, { id: 'excel-open' });
                    return;
                }
            }
            if (fileItem.url) {
                // If opening from URL, navigate or load
                window.location.href = `/documents/excel-editor?docId=${fileItem.id}`;
            }
        } catch (err) {
            console.error('Failed to open doc:', err);
            toast.error('Could not open spreadsheet', { id: 'excel-open' });
        } finally {
            setIsInitialLoading(false);
        }
    };

    // Undo / Redo History Stacks
    const undoStackRef = useRef([]);
    const redoStackRef = useRef([]);

    const pushUndoSnapshot = useCallback((snapshotSheets = null) => {
        const s = snapshotSheets || sheets;
        if (s) {
            undoStackRef.current = [...undoStackRef.current.slice(-30), JSON.parse(JSON.stringify(s))];
            redoStackRef.current = [];
        }
    }, [sheets]);

    const handleUndo = useCallback(() => {
        if (!undoStackRef.current || undoStackRef.current.length === 0) {
            toast.error('Nothing to undo');
            return;
        }
        const prev = undoStackRef.current.pop();
        if (prev) {
            redoStackRef.current.push(JSON.parse(JSON.stringify(sheets)));
            setSheets(prev);
            triggerAutoSave();
            toast.success('Undo action');
        }
    }, [sheets, triggerAutoSave]);

    const handleRedo = useCallback(() => {
        if (!redoStackRef.current || redoStackRef.current.length === 0) {
            toast.error('Nothing to redo');
            return;
        }
        const next = redoStackRef.current.pop();
        if (next) {
            undoStackRef.current.push(JSON.parse(JSON.stringify(sheets)));
            setSheets(next);
            triggerAutoSave();
            toast.success('Redo action');
        }
    }, [sheets, triggerAutoSave]);

    // Helper to get all cell keys in current selection (range + multi-select + active cell)
    const getSelectedCellKeys = useCallback(() => {
        const keys = new Set();
        const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
        const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
        const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
        const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                keys.add(`${colToLetter(c)}${r}`);
            }
        }
        if (multiSelectedCells && multiSelectedCells.size > 0) {
            multiSelectedCells.forEach(k => keys.add(k));
        }
        if (selectedCell) keys.add(selectedCell);
        return Array.from(keys);
    }, [selectionRange, multiSelectedCells, selectedCell]);

    // Cell updates
    const updateCell = useCallback((cellKey, updates) => {
        pushUndoSnapshot();
        setSheets(prevSheets => {
            const nextSheets = [...prevSheets];
            const targetSheet = { ...nextSheets[activeSheetIndex] };
            const nextCells = { ...targetSheet.cells };
            nextCells[cellKey] = {
                ...(nextCells[cellKey] || {}),
                ...updates
            };
            targetSheet.cells = nextCells;
            nextSheets[activeSheetIndex] = targetSheet;
            return nextSheets;
        });
        triggerAutoSave();
    }, [pushUndoSnapshot, activeSheetIndex, triggerAutoSave]);

    // Apply updates across all selected cells
    const updateSelectedCells = useCallback((updatesOrFn) => {
        pushUndoSnapshot();
        const targetKeys = getSelectedCellKeys();
        setSheets(prevSheets => {
            const nextSheets = [...prevSheets];
            const targetSheet = { ...nextSheets[activeSheetIndex] };
            const nextCells = { ...targetSheet.cells };
            targetKeys.forEach(cellKey => {
                const currentCell = nextCells[cellKey] || {};
                const updates = typeof updatesOrFn === 'function' ? updatesOrFn(currentCell, cellKey) : updatesOrFn;
                nextCells[cellKey] = {
                    ...currentCell,
                    ...updates
                };
            });
            targetSheet.cells = nextCells;
            nextSheets[activeSheetIndex] = targetSheet;
            return nextSheets;
        });
        triggerAutoSave();
    }, [pushUndoSnapshot, getSelectedCellKeys, activeSheetIndex, triggerAutoSave]);

    // Start Column Width Resizing
    const handleStartColResize = (e, colLetter) => {
        e.stopPropagation();
        e.preventDefault();
        const startWidth = colWidths[colLetter] || 100;
        setResizingCol({ colLetter, startX: e.clientX, startWidth });
    };

    // Start Row Height Resizing
    const handleStartRowResize = (e, rowNum) => {
        e.stopPropagation();
        e.preventDefault();
        const startHeight = rowHeights[rowNum] || (density === 'compact' ? 20 : 24);
        setResizingRow({ rowNum, startY: e.clientY, startHeight });
    };

    // Start Fill Handle Dragging
    const handleStartFillHandleDrag = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
        const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
        const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
        const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
        setIsDraggingFillHandle(true);
        setFillSourceRange({ startCol: minC, startRow: minR, endCol: maxC, endRow: maxR });
        setFillTargetRange({ startCol: minC, startRow: minR, endCol: maxC, endRow: maxR });
    };

    // Execute Excel / Google Sheets Autofill calculation
    const executeAutofill = useCallback(() => {
        if (!fillSourceRange || !fillTargetRange) return;
        const src = fillSourceRange;
        const tgt = fillTargetRange;

        if (src.startCol === tgt.startCol && src.endCol === tgt.endCol &&
            src.startRow === tgt.startRow && src.endRow === tgt.endRow) {
            return;
        }

        pushUndoSnapshot();

        setSheets(prevSheets => {
            const next = [...prevSheets];
            const sh = { ...next[activeSheetIndex] };
            const newCells = { ...(sh.cells || {}) };

            const srcRowCount = src.endRow - src.startRow + 1;
            const srcColCount = src.endCol - src.startCol + 1;

            // 1. Fill downward
            if (tgt.endRow > src.endRow) {
                for (let c = src.startCol; c <= src.endCol; c++) {
                    const colLetter = colToLetter(c);
                    const srcVals = [];
                    for (let r = src.startRow; r <= src.endRow; r++) {
                        srcVals.push(newCells[`${colLetter}${r}`]?.val);
                    }
                    const allNumbers = srcVals.every(v => v !== undefined && v !== '' && !isNaN(Number(v)));
                    let step = 0;
                    if (allNumbers && srcVals.length >= 2) {
                        step = Number(srcVals[srcVals.length - 1]) - Number(srcVals[srcVals.length - 2]);
                    } else if (allNumbers && srcVals.length === 1) {
                        step = 1;
                    }

                    for (let r = src.endRow + 1; r <= tgt.endRow; r++) {
                        const targetKey = `${colLetter}${r}`;
                        const sourceOffset = (r - src.startRow) % srcRowCount;
                        const sourceRow = src.startRow + sourceOffset;
                        const sourceKey = `${colLetter}${sourceRow}`;
                        const sourceCell = newCells[sourceKey] || {};

                        if (sourceCell.formula) {
                            const deltaRow = r - sourceRow;
                            const newFormula = adjustFormulaReferences(sourceCell.formula, 0, deltaRow);
                            newCells[targetKey] = {
                                ...sourceCell,
                                formula: newFormula,
                                val: evaluateFormula(newFormula, newCells)
                            };
                        } else if (allNumbers) {
                            const stepsAway = r - src.endRow;
                            const lastVal = Number(srcVals[srcVals.length - 1]);
                            const newVal = lastVal + step * stepsAway;
                            newCells[targetKey] = {
                                ...sourceCell,
                                val: newVal,
                                formula: null
                            };
                        } else {
                            newCells[targetKey] = { ...sourceCell };
                        }
                    }
                }
            }

            // 2. Fill rightward
            else if (tgt.endCol > src.endCol) {
                for (let r = src.startRow; r <= src.endRow; r++) {
                    const srcVals = [];
                    for (let c = src.startCol; c <= src.endCol; c++) {
                        srcVals.push(newCells[`${colToLetter(c)}${r}`]?.val);
                    }
                    const allNumbers = srcVals.every(v => v !== undefined && v !== '' && !isNaN(Number(v)));
                    let step = 0;
                    if (allNumbers && srcVals.length >= 2) {
                        step = Number(srcVals[srcVals.length - 1]) - Number(srcVals[srcVals.length - 2]);
                    } else if (allNumbers && srcVals.length === 1) {
                        step = 1;
                    }

                    for (let c = src.endCol + 1; c <= tgt.endCol; c++) {
                        const targetKey = `${colToLetter(c)}${r}`;
                        const sourceOffset = (c - src.startCol) % srcColCount;
                        const sourceCol = src.startCol + sourceOffset;
                        const sourceKey = `${colToLetter(sourceCol)}${r}`;
                        const sourceCell = newCells[sourceKey] || {};

                        if (sourceCell.formula) {
                            const deltaCol = c - sourceCol;
                            const newFormula = adjustFormulaReferences(sourceCell.formula, deltaCol, 0);
                            newCells[targetKey] = {
                                ...sourceCell,
                                formula: newFormula,
                                val: evaluateFormula(newFormula, newCells)
                            };
                        } else if (allNumbers) {
                            const stepsAway = c - src.endCol;
                            const lastVal = Number(srcVals[srcVals.length - 1]);
                            const newVal = lastVal + step * stepsAway;
                            newCells[targetKey] = {
                                ...sourceCell,
                                val: newVal,
                                formula: null
                            };
                        } else {
                            newCells[targetKey] = { ...sourceCell };
                        }
                    }
                }
            }

            // 3. Fill upward
            else if (tgt.startRow < src.startRow) {
                for (let c = src.startCol; c <= src.endCol; c++) {
                    const colLetter = colToLetter(c);
                    for (let r = tgt.startRow; r < src.startRow; r++) {
                        const targetKey = `${colLetter}${r}`;
                        const sourceOffset = (r - tgt.startRow) % srcRowCount;
                        const sourceRow = src.startRow + sourceOffset;
                        const sourceCell = newCells[`${colLetter}${sourceRow}`] || {};
                        if (sourceCell.formula) {
                            const deltaRow = r - sourceRow;
                            const newFormula = adjustFormulaReferences(sourceCell.formula, 0, deltaRow);
                            newCells[targetKey] = {
                                ...sourceCell,
                                formula: newFormula,
                                val: evaluateFormula(newFormula, newCells)
                            };
                        } else {
                            newCells[targetKey] = { ...sourceCell };
                        }
                    }
                }
            }

            // 4. Fill leftward
            else if (tgt.startCol < src.startCol) {
                for (let r = src.startRow; r <= src.endRow; r++) {
                    for (let c = tgt.startCol; c < src.startCol; c++) {
                        const targetKey = `${colToLetter(c)}${r}`;
                        const sourceOffset = (c - tgt.startCol) % srcColCount;
                        const sourceCol = src.startCol + sourceOffset;
                        const sourceCell = newCells[`${colToLetter(sourceCol)}${r}`] || {};
                        if (sourceCell.formula) {
                            const deltaCol = c - sourceCol;
                            const newFormula = adjustFormulaReferences(sourceCell.formula, deltaCol, 0);
                            newCells[targetKey] = {
                                ...sourceCell,
                                formula: newFormula,
                                val: evaluateFormula(newFormula, newCells)
                            };
                        } else {
                            newCells[targetKey] = { ...sourceCell };
                        }
                    }
                }
            }

            sh.cells = newCells;
            next[activeSheetIndex] = sh;
            return next;
        });

        setSelectionRange({ ...tgt });
        setSelectionEndpoint({ col: tgt.endCol, row: tgt.endRow });
        triggerAutoSave();
        toast.success('Autofill applied');
    }, [fillSourceRange, fillTargetRange, activeSheetIndex, pushUndoSnapshot, triggerAutoSave]);

    // Global mouse listener for Column & Row Resizing and Fill Handle Dragging
    useEffect(() => {
        if (!resizingCol && !resizingRow && !isDraggingFillHandle) return;

        const handleMouseMove = (e) => {
            if (resizingCol) {
                const deltaX = e.clientX - resizingCol.startX;
                const newWidth = Math.max(40, Math.min(600, resizingCol.startWidth + deltaX));
                setSheets(prevSheets => {
                    const next = [...prevSheets];
                    const sh = { ...next[activeSheetIndex] };
                    sh.colWidths = { ...(sh.colWidths || {}), [resizingCol.colLetter]: newWidth };
                    next[activeSheetIndex] = sh;
                    return next;
                });
            } else if (resizingRow) {
                const deltaY = e.clientY - resizingRow.startY;
                const newHeight = Math.max(18, Math.min(200, resizingRow.startHeight + deltaY));
                setSheets(prevSheets => {
                    const next = [...prevSheets];
                    const sh = { ...next[activeSheetIndex] };
                    sh.rowHeights = { ...(sh.rowHeights || {}), [resizingRow.rowNum]: newHeight };
                    next[activeSheetIndex] = sh;
                    return next;
                });
            }
        };

        const handleMouseUp = () => {
            if (resizingCol || resizingRow) {
                triggerAutoSave();
            }
            setResizingCol(null);
            setResizingRow(null);
            if (isDraggingFillHandle) {
                executeAutofill();
                setIsDraggingFillHandle(false);
                setFillSourceRange(null);
                setFillTargetRange(null);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingCol, resizingRow, isDraggingFillHandle, activeSheetIndex, executeAutofill, triggerAutoSave]);

    // ResizeObserver on gridContainerRef to measure true viewport height for virtualization
    useEffect(() => {
        if (!gridContainerRef.current) return;
        const updateHeight = () => {
            if (gridContainerRef.current) {
                setViewportHeight(gridContainerRef.current.clientHeight || 650);
            }
        };
        updateHeight();
        const ro = new ResizeObserver(updateHeight);
        ro.observe(gridContainerRef.current);
        return () => ro.disconnect();
    }, []);

    // Scroll cell into view helper for keyboard navigation
    const scrollCellIntoView = useCallback((colIdx, rowNum) => {
        if (!gridContainerRef.current) return;
        const container = gridContainerRef.current;
        const ROW_HEIGHT = density === 'compact' ? 20 : 24;
        const targetTop = (rowNum - 1) * ROW_HEIGHT;
        const targetBottom = targetTop + (rowHeights[rowNum] || ROW_HEIGHT);

        if (targetTop < container.scrollTop + 30) {
            container.scrollTop = Math.max(0, targetTop - 30);
        } else if (targetBottom > container.scrollTop + container.clientHeight - 40) {
            container.scrollTop = targetBottom - container.clientHeight + 40;
        }

        let targetLeft = 48;
        for (let c = 0; c < colIdx; c++) {
            targetLeft += colWidths[colToLetter(c)] || 100;
        }
        const cellWidth = colWidths[colToLetter(colIdx)] || 100;
        const targetRight = targetLeft + cellWidth;

        if (targetLeft < container.scrollLeft + 60) {
            container.scrollLeft = Math.max(0, targetLeft - 60);
        } else if (targetRight > container.scrollLeft + container.clientWidth - 40) {
            container.scrollLeft = targetRight - container.clientWidth + 40;
        }
    }, [density, rowHeights, colWidths]);

    // Compute live aggregation statistics across active selection range
    const selectedStats = useMemo(() => {
        const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
        const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
        const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
        const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);

        let count = 0;
        let sum = 0;
        let numCount = 0;
        let min = Infinity;
        let max = -Infinity;

        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                const k = `${colToLetter(c)}${r}`;
                const raw = cells[k]?.val;
                count++;
                if (raw !== undefined && raw !== null && raw !== '' && !isNaN(Number(raw))) {
                    const n = Number(raw);
                    sum += n;
                    numCount++;
                    if (n < min) min = n;
                    if (n > max) max = n;
                }
            }
        }

        return {
            count,
            numCount,
            sum: numCount > 0 ? Number(sum.toFixed(2)) : 0,
            avg: numCount > 0 ? Number((sum / numCount).toFixed(2)) : 0,
            min: numCount > 0 ? min : 0,
            max: numCount > 0 ? max : 0
        };
    }, [selectionRange, cells]);

    // Apply borders to selected range
    const applyRangeBorder = (borderStyle) => {
        const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
        const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
        const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
        const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);

        setSheets(prev => {
            const next = [...prev];
            const updatedCells = { ...next[activeSheetIndex].cells };

            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    const k = `${colToLetter(c)}${r}`;
                    const current = updatedCells[k] || {};
                    const b = { ...(current.borders || {}) };

                    if (borderStyle === 'all') {
                        b.top = '1px solid #94a3b8';
                        b.bottom = '1px solid #94a3b8';
                        b.left = '1px solid #94a3b8';
                        b.right = '1px solid #94a3b8';
                    } else if (borderStyle === 'outer') {
                        if (r === minR) b.top = '1px solid #0f172a';
                        if (r === maxR) b.bottom = '1px solid #0f172a';
                        if (c === minC) b.left = '1px solid #0f172a';
                        if (c === maxC) b.right = '1px solid #0f172a';
                    } else if (borderStyle === 'thick') {
                        if (r === minR) b.top = '2px solid #0f172a';
                        if (r === maxR) b.bottom = '2px solid #0f172a';
                        if (c === minC) b.left = '2px solid #0f172a';
                        if (c === maxC) b.right = '2px solid #0f172a';
                    } else if (borderStyle === 'top') {
                        if (r === minR) b.top = '1px solid #0f172a';
                    } else if (borderStyle === 'bottom') {
                        if (r === maxR) b.bottom = '1px solid #0f172a';
                    } else if (borderStyle === 'double_bottom') {
                        if (r === maxR) b.bottom = '3px double #0f172a';
                    } else if (borderStyle === 'left') {
                        if (c === minC) b.left = '1px solid #0f172a';
                    } else if (borderStyle === 'right') {
                        if (c === maxC) b.right = '1px solid #0f172a';
                    } else if (borderStyle === 'clear') {
                        b.top = undefined;
                        b.bottom = undefined;
                        b.left = undefined;
                        b.right = undefined;
                    }

                    updatedCells[k] = { ...current, borders: b, borderStyle: borderStyle === 'clear' ? 'none' : 'custom' };
                }
            }

            next[activeSheetIndex] = { ...next[activeSheetIndex], cells: updatedCells };
            return next;
        });
        setBorderMenuOpen(false);
        triggerAutoSave();
        toast.success(`Applied ${borderStyle.replace('_', ' ')} border`);
    };

    // Apply font color to selected cells / range
    const applyFontColor = (color) => {
        const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
        const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
        const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
        const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);

        setSheets(prev => {
            const next = [...prev];
            const updated = { ...next[activeSheetIndex].cells };
            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    const k = `${colToLetter(c)}${r}`;
                    updated[k] = { ...(updated[k] || {}), color };
                }
            }
            next[activeSheetIndex] = { ...next[activeSheetIndex], cells: updated };
            return next;
        });
        setActiveFontColor(color);
        setFontColorMenuOpen(false);
        triggerAutoSave();
        toast.success('Applied font color');
    };

    // Row selection handlers
    const handleRowHeaderClick = (e, rowNum) => {
        e.preventDefault();
        if (e.shiftKey && rowAnchor !== null) {
            const minR = Math.min(rowAnchor, rowNum);
            const maxR = Math.max(rowAnchor, rowNum);
            const nextRows = new Set();
            for (let r = minR; r <= maxR; r++) nextRows.add(r);
            setSelectedRows(nextRows);
            setSelectionRange({ startCol: 0, startRow: minR, endCol: colCount - 1, endRow: maxR });
            setSelectedCell(`A${minR}`);
        } else if (e.metaKey || e.ctrlKey) {
            setSelectedRows(prev => {
                const next = new Set(prev);
                if (next.has(rowNum)) next.delete(rowNum);
                else next.add(rowNum);
                return next;
            });
            setRowAnchor(rowNum);
            setSelectedCell(`A${rowNum}`);
        } else {
            setSelectedRows(new Set([rowNum]));
            setSelectedCols(new Set());
            setRowAnchor(rowNum);
            setSelectionRange({ startCol: 0, startRow: rowNum, endCol: colCount - 1, endRow: rowNum });
            setSelectedCell(`A${rowNum}`);
        }
    };

    // Column selection handlers
    const handleColHeaderClick = (e, cIdx) => {
        e.preventDefault();
        if (e.shiftKey && colAnchor !== null) {
            const minC = Math.min(colAnchor, cIdx);
            const maxC = Math.max(colAnchor, cIdx);
            const nextCols = new Set();
            for (let c = minC; c <= maxC; c++) nextCols.add(c);
            setSelectedCols(nextCols);
            setSelectionRange({ startCol: minC, startRow: 1, endCol: maxC, endRow: rowCount });
            setSelectedCell(`${colToLetter(minC)}1`);
        } else if (e.metaKey || e.ctrlKey) {
            setSelectedCols(prev => {
                const next = new Set(prev);
                if (next.has(cIdx)) next.delete(cIdx);
                else next.add(cIdx);
                return next;
            });
            setColAnchor(cIdx);
            setSelectedCell(`${colToLetter(cIdx)}1`);
        } else {
            setSelectedCols(new Set([cIdx]));
            setSelectedRows(new Set());
            setColAnchor(cIdx);
            setSelectionRange({ startCol: cIdx, startRow: 1, endCol: cIdx, endRow: rowCount });
            setSelectedCell(`${colToLetter(cIdx)}1`);
        }
    };

    // Merge cells in selected range
    const handleMergeRange = () => {
        const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
        const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
        const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
        const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);

        if (minC === maxC && minR === maxR) {
            toast.error('Select a multi-cell range to merge');
            return;
        }

        const topLeftKey = `${colToLetter(minC)}${minR}`;
        const colSpan = maxC - minC + 1;
        const rowSpan = maxR - minR + 1;

        setSheets(prev => {
            const next = [...prev];
            const updatedCells = { ...next[activeSheetIndex].cells };

            updatedCells[topLeftKey] = {
                ...updatedCells[topLeftKey],
                colSpan,
                rowSpan
            };

            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    if (r === minR && c === minC) continue;
                    const k = `${colToLetter(c)}${r}`;
                    updatedCells[k] = { ...updatedCells[k], isMergedChild: true };
                }
            }

            next[activeSheetIndex] = { ...next[activeSheetIndex], cells: updatedCells };
            return next;
        });

        triggerAutoSave();
        toast.success(`Merged ${colSpan}×${rowSpan} cells`);
    };

    // Context Menu Handlers
    const handleCellContextMenu = (e, cellKey, rowNum, colIdx) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedCell(cellKey);
        setContextMenu({
            visible: true,
            x: Math.min(e.clientX, window.innerWidth - 220),
            y: Math.min(e.clientY, window.innerHeight - 340),
            cellKey,
            rowNum,
            colIdx
        });
    };

    const handleInsertRow = (atIndex, pos = 'below') => {
        const targetRow = pos === 'above' ? atIndex : atIndex + 1;
        setSheets(prev => {
            const next = [...prev];
            const sh = { ...next[activeSheetIndex] };
            const oldCells = sh.cells || {};
            const newCells = {};

            Object.entries(oldCells).forEach(([key, data]) => {
                const coord = parseCellCoord(key);
                if (!coord) return;
                if (coord.row >= targetRow) {
                    const newKey = `${colToLetter(coord.col)}${coord.row + 1}`;
                    newCells[newKey] = data;
                } else {
                    newCells[key] = data;
                }
            });
            sh.cells = newCells;
            next[activeSheetIndex] = sh;
            return next;
        });
        setRowCount(prev => prev + 1);
        setContextMenu(prev => ({ ...prev, visible: false }));
        triggerAutoSave();
        triggerAdditionBadge('Row Inserted', `Row placed at #${targetRow}`, 'table');
        toast.success(`Inserted row ${pos} row ${atIndex}`);
    };

    const handleDeleteRow = (targetRow) => {
        if (rowCount <= 1) return;
        setSheets(prev => {
            const next = [...prev];
            const sh = { ...next[activeSheetIndex] };
            const oldCells = sh.cells || {};
            const newCells = {};

            Object.entries(oldCells).forEach(([key, data]) => {
                const coord = parseCellCoord(key);
                if (!coord) return;
                if (coord.row === targetRow) {
                    // deleted
                } else if (coord.row > targetRow) {
                    const newKey = `${colToLetter(coord.col)}${coord.row - 1}`;
                    newCells[newKey] = data;
                } else {
                    newCells[key] = data;
                }
            });
            sh.cells = newCells;
            next[activeSheetIndex] = sh;
            return next;
        });
        setRowCount(prev => Math.max(1, prev - 1));
        setContextMenu(prev => ({ ...prev, visible: false }));
        triggerAutoSave();
        toast.success(`Deleted row ${targetRow}`);
    };

    const handleInsertCol = (atCol, pos = 'right') => {
        const targetCol = pos === 'left' ? atCol : atCol + 1;
        setSheets(prev => {
            const next = [...prev];
            const sh = { ...next[activeSheetIndex] };
            const oldCells = sh.cells || {};
            const newCells = {};

            Object.entries(oldCells).forEach(([key, data]) => {
                const coord = parseCellCoord(key);
                if (!coord) return;
                if (coord.col >= targetCol) {
                    const newKey = `${colToLetter(coord.col + 1)}${coord.row}`;
                    newCells[newKey] = data;
                } else {
                    newCells[key] = data;
                }
            });
            sh.cells = newCells;
            next[activeSheetIndex] = sh;
            return next;
        });
        setColCount(prev => prev + 1);
        setContextMenu(prev => ({ ...prev, visible: false }));
        triggerAutoSave();
        triggerAdditionBadge('Column Inserted', `Column placed at ${colToLetter(targetCol)}`, 'table');
        toast.success(`Inserted column ${pos}`);
    };

    const handleDeleteCol = (targetCol) => {
        if (colCount <= 1) return;
        setSheets(prev => {
            const next = [...prev];
            const sh = { ...next[activeSheetIndex] };
            const oldCells = sh.cells || {};
            const newCells = {};

            Object.entries(oldCells).forEach(([key, data]) => {
                const coord = parseCellCoord(key);
                if (!coord) return;
                if (coord.col === targetCol) {
                    // deleted
                } else if (coord.col > targetCol) {
                    const newKey = `${colToLetter(coord.col - 1)}${coord.row}`;
                    newCells[newKey] = data;
                } else {
                    newCells[key] = data;
                }
            });
            sh.cells = newCells;
            next[activeSheetIndex] = sh;
            return next;
        });
        setColCount(prev => Math.max(1, prev - 1));
        setContextMenu(prev => ({ ...prev, visible: false }));
        triggerAutoSave();
        toast.success(`Deleted column ${colToLetter(targetCol)}`);
    };

    // Find and Replace logic
    const handleFindNext = () => {
        if (!findText) return;
        const q = findText.toLowerCase();
        const entries = Object.entries(cells);
        const nextMatch = entries.find(([key, c]) => {
            const str = String(c.val || c.formula || '').toLowerCase();
            return str.includes(q) && key !== selectedCell;
        }) || entries.find(([_, c]) => String(c.val || c.formula || '').toLowerCase().includes(q));

        if (nextMatch) {
            setSelectedCell(nextMatch[0]);
            toast.success(`Found in ${nextMatch[0]}`);
        } else {
            toast.error(`No matches found for "${findText}"`);
        }
    };

    const handleReplaceAll = () => {
        if (!findText) return;
        let count = 0;
        setSheets(prev => {
            const next = [...prev];
            const sh = { ...next[activeSheetIndex] };
            const updated = { ...sh.cells };
            const q = new RegExp(findText, 'gi');

            Object.entries(updated).forEach(([key, cell]) => {
                if (cell.val && String(cell.val).match(q)) {
                    updated[key] = {
                        ...cell,
                        val: String(cell.val).replace(q, replaceText)
                    };
                    count++;
                }
            });
            sh.cells = updated;
            next[activeSheetIndex] = sh;
            return next;
        });
        triggerAutoSave();
        toast.success(`Replaced ${count} occurrences`);
        setShowFindReplace(false);
    };

    // Sheet management
    const handleAddSheet = () => {
        const newName = `Sheet${sheets.length + 1}`;
        setSheets([...sheets, { name: newName, cells: {} }]);
        setActiveSheetIndex(sheets.length);
        triggerAutoSave();
        triggerAdditionBadge('Worksheet Added', `${newName} created`, 'sheet');
        toast.success(`Created ${newName}`);
    };

    const handleInsertSheet = (idx, position = 'after') => {
        const targetIdx = position === 'before' ? idx : idx + 1;
        const newName = `Sheet${sheets.length + 1}`;
        const next = [...sheets];
        next.splice(targetIdx, 0, { name: newName, cells: {} });
        setSheets(next);
        setActiveSheetIndex(targetIdx);
        triggerAutoSave();
        toast.success(`Inserted ${newName} ${position} current sheet`);
    };

    const handleDuplicateSheet = (idx) => {
        const src = sheets[idx];
        const copy = {
            name: `${src.name} (Copy)`,
            cells: JSON.parse(JSON.stringify(src.cells || {})),
            tabColor: src.tabColor
        };
        const next = [...sheets];
        next.splice(idx + 1, 0, copy);
        setSheets(next);
        setActiveSheetIndex(idx + 1);
        triggerAutoSave();
        triggerAdditionBadge('Worksheet Duplicated', `Created copy of ${src.name}`, 'sheet');
        toast.success(`Duplicated ${src.name}`);
    };

    const handleDeleteSheet = (idx) => {
        if (sheets.length <= 1) {
            toast.error('Workbook must contain at least one worksheet');
            return;
        }
        const name = sheets[idx].name;
        const next = sheets.filter((_, i) => i !== idx);
        setSheets(next);
        setActiveSheetIndex(prev => Math.min(prev, next.length - 1));
        triggerAutoSave();
        toast.success(`Deleted worksheet ${name}`);
    };

    const handleRenameSheet = (idx, newName) => {
        if (!newName.trim()) return;
        setSheets(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], name: newName.trim() };
            return next;
        });
        setSheetModal({ open: false, index: 0, name: '' });
        triggerAutoSave();
        toast.success(`Renamed sheet to ${newName.trim()}`);
    };

    const handleHideSheet = (idx) => {
        const visibleSheets = sheets.filter((s, i) => i !== idx && !s.hidden);
        if (visibleSheets.length === 0) {
            toast.error('Cannot hide the only visible sheet');
            return;
        }
        setSheets(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], hidden: true };
            return next;
        });
        // Switch to the first visible sheet
        const firstVisibleIdx = sheets.findIndex((s, i) => i !== idx && !s.hidden);
        if (firstVisibleIdx !== -1) {
            setActiveSheetIndex(firstVisibleIdx);
        }
        triggerAutoSave();
        toast.success(`Sheet "${sheets[idx].name}" hidden. You can unhide it from the Sheets menu.`);
    };

    const handleUnhideSheet = (idx) => {
        setSheets(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], hidden: false };
            return next;
        });
        setActiveSheetIndex(idx);
        triggerAutoSave();
        toast.success(`Unhid sheet "${sheets[idx].name}"`);
    };

    const handleMoveSheet = (fromIdx, toIdx) => {
        if (toIdx < 0 || toIdx >= sheets.length || fromIdx === toIdx) return;
        setSheets(prev => {
            const next = [...prev];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return next;
        });
        setActiveSheetIndex(toIdx);
        triggerAutoSave();
        toast.success('Sheet position updated');
    };

    // Reorder worksheets via drag and drop
    const handleReorderSheets = (fromIdx, toIdx) => {
        if (fromIdx === null || toIdx === null || fromIdx === toIdx) return;
        setSheets(prev => {
            const next = [...prev];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return next;
        });
        setActiveSheetIndex(toIdx);
        setDraggedSheetIndex(null);
        triggerAutoSave();
        toast.success('Worksheets reordered');
    };

    // Global listener to ensure drag range selection releases cleanly
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            setIsDraggingRange(false);
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    // Sort sheet rows by active column (A-Z or Z-A)
    const handleSort = (direction = 'asc') => {
        const p = parseCellCoord(selectedCell);
        const colLetter = p ? colToLetter(p.col) : 'A';
        setSheets(prev => {
            const next = [...prev];
            const sh = { ...next[activeSheetIndex] };
            const oldCells = { ...sh.cells };

            const rowIndices = [];
            for (let r = 2; r <= rowCount; r++) rowIndices.push(r);

            rowIndices.sort((rA, rB) => {
                const valA = oldCells[`${colLetter}${rA}`]?.val ?? '';
                const valB = oldCells[`${colLetter}${rB}`]?.val ?? '';
                const numA = Number(valA);
                const numB = Number(valB);
                if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
                    return direction === 'asc' ? numA - numB : numB - numA;
                }
                return direction === 'asc'
                    ? String(valA).localeCompare(String(valB))
                    : String(valB).localeCompare(String(valA));
            });

            const newCells = {};
            // Preserve row 1 (header row)
            for (let c = 0; c < colCount; c++) {
                const k = `${colToLetter(c)}1`;
                if (oldCells[k]) newCells[k] = oldCells[k];
            }
            // Populate sorted rows
            rowIndices.forEach((origRow, newIdx) => {
                const targetRow = newIdx + 2;
                for (let c = 0; c < colCount; c++) {
                    const origKey = `${colToLetter(c)}${origRow}`;
                    const targetKey = `${colToLetter(c)}${targetRow}`;
                    if (oldCells[origKey]) {
                        newCells[targetKey] = { ...oldCells[origKey] };
                    }
                }
            });
            sh.cells = newCells;
            next[activeSheetIndex] = sh;
            return next;
        });
        triggerAdditionBadge(`Sorted by Col ${colLetter}`, `Order: ${direction === 'asc' ? 'A → Z' : 'Z → A'}`, 'sheet');
        toast.success(`Sorted by Column ${colLetter} (${direction === 'asc' ? 'A → Z' : 'Z → A'})`);
        triggerAutoSave();
    };

    // Toggle AutoFilter on header row
    const handleToggleFilter = () => {
        setIsFilterActive(!isFilterActive);
        if (isFilterActive) {
            setActiveFilters({});
            setOpenFilterCol(null);
        }
        toast.success(isFilterActive ? 'AutoFilter disabled' : 'AutoFilter enabled on Row 1');
    };

    // Get distinct values for a column
    const getColumnDistinctValues = (colLetter) => {
        const set = new Set();
        for (let r = 2; r <= rowCount; r++) {
            const v = cells[`${colLetter}${r}`]?.val;
            if (v !== undefined && v !== null && v !== '') {
                set.add(String(v));
            } else {
                set.add('(Blanks)');
            }
        }
        return Array.from(set).sort();
    };

    // Check if row satisfies all active column filters
    const isRowVisible = (rowNum) => {
        if (!isFilterActive || rowNum === 1) return true;
        for (const [colLetter, allowedValues] of Object.entries(activeFilters)) {
            if (!allowedValues || !allowedValues.length) continue;
            const val = cells[`${colLetter}${rowNum}`]?.val;
            const strVal = (val !== undefined && val !== null && val !== '') ? String(val) : '(Blanks)';
            if (!allowedValues.includes(strVal)) {
                return false;
            }
        }
        return true;
    };

    // Apply data validation to selection
    const handleApplyValidation = () => {
        const items = validationInput.split(',').map(s => s.trim()).filter(Boolean);
        if (!items.length) {
            toast.error('Enter at least one choice');
            return;
        }
        const box = getSelectionBoundingBox();
        setSheets(prev => {
            const next = [...prev];
            const sh = { ...next[activeSheetIndex] };
            const newCells = { ...sh.cells };
            for (let r = box.minR; r <= box.maxR; r++) {
                for (let c = box.minC; c <= box.maxC; c++) {
                    const k = `${colToLetter(c)}${r}`;
                    newCells[k] = { ...(newCells[k] || {}), validationList: items };
                }
            }
            sh.cells = newCells;
            next[activeSheetIndex] = sh;
            return next;
        });
        setShowValidationModal(false);
        triggerAdditionBadge('Data Validation List', `${items.join(', ')} applied`, 'sheet');
        toast.success(`Data validation applied: ${items.join(', ')}`);
        triggerAutoSave();
    };

    // Insert interactive checkbox into cell
    const handleInsertCheckbox = () => {
        updateCell(selectedCell, {
            checkbox: true,
            val: false,
            align: 'center'
        });
        triggerAdditionBadge('Interactive Checkbox', `Inserted into cell ${selectedCell}`, 'shape');
        toast.success(`Checkbox inserted into ${selectedCell}`);
    };

    // Toggle text wrap mode (clip -> wrap -> overflow -> clip)
    const handleToggleWrap = () => {
        const cur = cells[selectedCell]?.wrap || 'clip';
        const nextWrap = cur === 'clip' ? 'wrap' : cur === 'wrap' ? 'overflow' : 'clip';
        updateCell(selectedCell, { wrap: nextWrap });
        toast.success(`Wrap mode: ${nextWrap.toUpperCase()}`);
    };

    // Add conditional formatting rule
    const handleAddCondRule = () => {
        const newRule = {
            id: `rule_${Date.now()}`,
            range: newRuleRange,
            type: newRuleType,
            val: Number(newRuleVal) || newRuleVal,
            bg: newRuleBg,
            color: newRuleColor
        };
        setCondRules(prev => [...prev, newRule]);
        toast.success('Conditional formatting rule added');
        triggerAutoSave();
    };

    // Remove conditional formatting rule
    const handleRemoveCondRule = (id) => {
        setCondRules(prev => prev.filter(r => r.id !== id));
        toast.success('Rule removed');
    };

    // Helper to evaluate if a cell matches any conditional formatting rule
    const getCellCondFormatting = (cellKey, cellVal) => {
        const p = parseCellCoord(cellKey);
        if (!p) return null;
        for (const rule of condRules) {
            const rParts = rule.range.split(':');
            if (rParts.length === 2) {
                const p1 = parseCellCoord(rParts[0]);
                const p2 = parseCellCoord(rParts[1]);
                if (p1 && p2) {
                    const minR = Math.min(p1.row, p2.row);
                    const maxR = Math.max(p1.row, p2.row);
                    const minC = Math.min(p1.col, p2.col);
                    const maxC = Math.max(p1.col, p2.col);
                    if (p.row >= minR && p.row <= maxR && p.col >= minC && p.col <= maxC) {
                        const num = Number(cellVal);
                        if (rule.type === 'greater' && !isNaN(num) && num > Number(rule.val)) {
                            return { bg: rule.bg, color: rule.color };
                        }
                        if (rule.type === 'less' && !isNaN(num) && num < Number(rule.val)) {
                            return { bg: rule.bg, color: rule.color };
                        }
                        if (rule.type === 'equal' && String(cellVal).toLowerCase() === String(rule.val).toLowerCase()) {
                            return { bg: rule.bg, color: rule.color };
                        }
                    }
                }
            }
        }
        return null;
    };

    // Set Worksheet Tab Color
    const handleSetTabColor = (idx, color) => {
        setSheets(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], tabColor: color };
            return next;
        });
        setActiveTabMenuIndex(null);
        triggerAutoSave();
        toast.success('Tab color updated');
    };

    // Filtered sheets for All Sheets Navigator
    const filteredSheets = useMemo(() => {
        if (!sheetSearchQuery.trim()) {
            return sheets.map((s, idx) => ({ ...s, originalIdx: idx }));
        }
        const q = sheetSearchQuery.toLowerCase();
        return sheets
            .map((s, idx) => ({ ...s, originalIdx: idx }))
            .filter(s => s.name.toLowerCase().includes(q));
    }, [sheets, sheetSearchQuery]);

    // Bounding Box Helper
    const getSelectionBoundingBox = useCallback(() => {
        const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
        const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
        const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
        const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
        return { minC, maxC, minR, maxR };
    }, [selectionRange]);

    // Clipboard Copy
    const handleCopy = useCallback(() => {
        const { minC, maxC, minR, maxR } = getSelectionBoundingBox();
        const rows = [];
        const tsvLines = [];

        for (let r = minR; r <= maxR; r++) {
            const rowData = [];
            const tsvCols = [];
            for (let c = minC; c <= maxC; c++) {
                const k = `${colToLetter(c)}${r}`;
                const cell = cells[k] ? { ...cells[k] } : { val: '' };
                rowData.push(cell);
                tsvCols.push(cell.displayVal !== undefined ? cell.displayVal : (cell.val ?? ''));
            }
            rows.push(rowData);
            tsvLines.push(tsvCols.join('\t'));
        }

        const clipObj = { minC, maxC, minR, maxR, rows, isCut: false };
        setCopiedData(clipObj);
        setMarchingAntsRange({ startCol: minC, startRow: minR, endCol: maxC, endRow: maxR });

        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(tsvLines.join('\n')).catch(() => {});
        }
        toast.success(`Copied (${maxR - minR + 1} × ${maxC - minC + 1}) cells`);
    }, [cells, getSelectionBoundingBox]);

    // Clipboard Cut
    const handleCut = useCallback(() => {
        handleCopy();
        setCopiedData(prev => prev ? { ...prev, isCut: true } : null);
        toast.success('Cut cells to clipboard');
    }, [handleCopy]);

    // Clipboard Paste & Paste Special
    const handlePaste = useCallback((mode = 'all') => {
        if (!copiedData || !copiedData.rows || copiedData.rows.length === 0) {
            toast.error('Clipboard is empty. Copy cells first.');
            return;
        }

        pushUndoSnapshot();
        const anchor = parseCellCoord(selectedCell) || { col: 0, row: 1 };
        const numRows = copiedData.rows.length;
        const numCols = copiedData.rows[0]?.length || 1;

        setSheets(prev => {
            const next = [...prev];
            const sh = { ...next[activeSheetIndex] };
            const newCells = { ...(sh.cells || {}) };

            for (let rIdx = 0; rIdx < numRows; rIdx++) {
                const targetRow = anchor.row + rIdx;
                if (targetRow > rowCount) continue;
                for (let cIdx = 0; cIdx < numCols; cIdx++) {
                    const targetCol = anchor.col + cIdx;
                    if (targetCol >= colCount) continue;
                    const targetKey = `${colToLetter(targetCol)}${targetRow}`;
                    const srcCell = copiedData.rows[rIdx][cIdx] || {};

                    if (mode === 'values') {
                        newCells[targetKey] = {
                            ...(newCells[targetKey] || {}),
                            val: srcCell.displayVal !== undefined ? srcCell.displayVal : srcCell.val,
                            formula: null
                        };
                    } else if (mode === 'formulas') {
                        newCells[targetKey] = {
                            ...(newCells[targetKey] || {}),
                            val: srcCell.val,
                            formula: srcCell.formula || null
                        };
                    } else if (mode === 'formats') {
                        newCells[targetKey] = {
                            ...(newCells[targetKey] || {}),
                            bg: srcCell.bg,
                            color: srcCell.color,
                            bold: srcCell.bold,
                            italic: srcCell.italic,
                            align: srcCell.align,
                            borderStyle: srcCell.borderStyle
                        };
                    } else {
                        // all
                        newCells[targetKey] = {
                            ...(newCells[targetKey] || {}),
                            ...srcCell
                        };
                    }
                }
            }

            if (copiedData.isCut) {
                for (let r = copiedData.minR; r <= copiedData.maxR; r++) {
                    for (let c = copiedData.minC; c <= copiedData.maxC; c++) {
                        const srcKey = `${colToLetter(c)}${r}`;
                        const isTarget = c >= anchor.col && c < anchor.col + numCols && r >= anchor.row && r < anchor.row + numRows;
                        if (!isTarget) {
                            delete newCells[srcKey];
                        }
                    }
                }
                setCopiedData(null);
                setMarchingAntsRange(null);
            }

            sh.cells = newCells;
            next[activeSheetIndex] = sh;
            return next;
        });

        triggerAutoSave();
        const modeLabel = mode === 'values' ? 'Values only' : mode === 'formulas' ? 'Formulas only' : mode === 'formats' ? 'Formats only' : 'All';
        toast.success(`Pasted (${modeLabel})`);
    }, [copiedData, selectedCell, rowCount, colCount, activeSheetIndex]);

    // Clear Selected Cells
    const handleClearSelectedCells = useCallback(() => {
        pushUndoSnapshot();
        const { minC, maxC, minR, maxR } = getSelectionBoundingBox();
        setSheets(prev => {
            const next = [...prev];
            const sh = { ...next[activeSheetIndex] };
            const newCells = { ...(sh.cells || {}) };

            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    const k = `${colToLetter(c)}${r}`;
                    if (newCells[k]) {
                        newCells[k] = { ...newCells[k], val: '', formula: null, displayVal: undefined };
                    }
                }
            }

            multiSelectedCells.forEach(k => {
                if (newCells[k]) {
                    newCells[k] = { ...newCells[k], val: '', formula: null, displayVal: undefined };
                }
            });

            sh.cells = newCells;
            next[activeSheetIndex] = sh;
            return next;
        });
        setFormulaInput('');
        triggerAutoSave();
        toast.success('Cleared selected cells');
    }, [getSelectionBoundingBox, activeSheetIndex, multiSelectedCells]);

    // Formula Input and Autocomplete logic
    const handleFormulaInputChange = (text) => {
        // Prevent duplicate equals signs (e.g. "==" -> "=")
        let cleanText = text;
        if (cleanText.startsWith('==')) {
            cleanText = cleanText.replace(/^=+/, '=');
        }
        setFormulaInput(cleanText);
        updateCell(selectedCell, {
            val: cleanText.startsWith('=') ? evaluateFormula(cleanText, cells) : cleanText,
            formula: cleanText.startsWith('=') ? cleanText : null
        });

        if (cleanText.startsWith('=')) {
            const tokenMatch = cleanText.match(/([A-Z0-9_]+)$/i);
            if (tokenMatch) {
                const query = tokenMatch[1].toUpperCase();
                const matches = FORMULA_SUGGESTIONS.filter(item => 
                    item.name.startsWith(query) || item.name.includes(query)
                );
                setFormulaSuggestions(matches);
                setActiveSuggestionIdx(0);
            } else {
                // When only "=", show popular standard functions
                const popular = ['SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX', 'IF', 'VLOOKUP'];
                setFormulaSuggestions(FORMULA_SUGGESTIONS.filter(item => popular.includes(item.name)));
                setActiveSuggestionIdx(0);
            }
        } else {
            setFormulaSuggestions([]);
        }
    };

    const handleSelectFormulaSuggestion = (item) => {
        if (!item) return;
        const tokenMatch = formulaInput.match(/([A-Z_]+)$/i);
        let newFormula = formulaInput;
        if (tokenMatch) {
            newFormula = formulaInput.slice(0, -tokenMatch[1].length) + item.name + '(';
        } else if (formulaInput.endsWith('=')) {
            newFormula = formulaInput + item.name + '(';
        } else {
            newFormula = `=${item.name}(`;
        }

        setFormulaInput(newFormula);
        updateCell(selectedCell, {
            formula: newFormula,
            val: evaluateFormula(newFormula, cells)
        });
        setFormulaSuggestions([]);
    };

    // Interactive formula cell selection on grid click
    const handleFormulaCellClick = (cellCoord) => {
        let f = formulaInput || '';
        if (!f.startsWith('=')) {
            f = `=${cellCoord}`;
        } else if (f.endsWith('(') || f.endsWith(',') || f.endsWith('+') || f.endsWith('-') || f.endsWith('*') || f.endsWith('/') || f.endsWith('=')) {
            f += cellCoord;
        } else {
            const trailingRef = f.match(/([A-Z]+[0-9]+)$/);
            if (trailingRef) {
                f = f.slice(0, -trailingRef[1].length) + cellCoord;
            } else {
                f += cellCoord;
            }
        }

        setFormulaInput(f);
        updateCell(editingCell || selectedCell, {
            formula: f,
            val: evaluateFormula(f, cells)
        });
    };

    // Interactive formula range drag (e.g. dragging across A1:A10 while editing =SUM() )
    const handleFormulaRangeDrag = (startKey, endKey) => {
        let f = formulaInput || '';
        const rangeText = startKey === endKey ? startKey : `${startKey}:${endKey}`;
        const trailingRange = f.match(/([A-Z]+[0-9]+(?::[A-Z]+[0-9]+)?)$/);
        if (trailingRange) {
            f = f.slice(0, -trailingRange[1].length) + rangeText;
        } else if (f.endsWith('(') || f.endsWith(',') || f.endsWith('+') || f.endsWith('-') || f.endsWith('*') || f.endsWith('/') || f.endsWith('=')) {
            f += rangeText;
        } else {
            f += rangeText;
        }

        setFormulaInput(f);
        updateCell(editingCell || selectedCell, {
            formula: f,
            val: evaluateFormula(f, cells)
        });
    };

    // Apply Chart Data Range from Current Sheet Selection
    const handleApplyChartRangeFromSelection = () => {
        const { minC, maxC, minR, maxR } = getSelectionBoundingBox();
        const range = `${colToLetter(minC)}${minR}:${colToLetter(maxC)}${maxR}`;
        setChartDataRange(range);
        setIsSelectingChartRange(false);
        triggerAdditionBadge('Chart Range Updated', `Range set to ${range}`, 'chart');
        toast.success(`Chart data range set to ${range}`);
    };

    // Quick insertion additions with preview thumbnails
    const handleInsertChart = () => {
        setShowChartInspector(true);
        triggerAdditionBadge('Chart Added', `Type: ${chartType.toUpperCase()} | Range: ${chartDataRange}`, 'chart');
        toast.success('Chart Inspector opened with live chart');
    };

    const handleInsertImage = () => {
        const url = prompt('Enter Image URL or click OK for sample lab diagram:', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80');
        if (url) {
            updateCell(selectedCell, {
                imageUrl: url,
                val: '[Image]'
            });
            triggerAdditionBadge('Image Inserted', `Placed at ${selectedCell}`, 'image', url);
            toast.success(`Image inserted at ${selectedCell}`);
        }
    };

    const handleInsertShape = (shapeType = 'rectangle') => {
        updateCell(selectedCell, {
            shape: shapeType,
            val: `[${shapeType.toUpperCase()}]`,
            bg: '#fef3c7',
            bold: true,
            align: 'center'
        });
        triggerAdditionBadge('Shape Inserted', `${shapeType} placed at ${selectedCell}`, 'shape');
        toast.success(`Shape ${shapeType} added at ${selectedCell}`);
    };

    // Comprehensive Keyboard Navigation & Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Formula autocomplete popup keyboard navigation
            if (formulaSuggestions.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveSuggestionIdx(prev => (prev + 1) % formulaSuggestions.length);
                    return;
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveSuggestionIdx(prev => (prev - 1 + formulaSuggestions.length) % formulaSuggestions.length);
                    return;
                } else if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                    e.preventDefault();
                    handleSelectFormulaSuggestion(formulaSuggestions[activeSuggestionIdx]);
                    return;
                } else if (e.key === 'Escape') {
                    setFormulaSuggestions([]);
                    return;
                }
            }

            // Find and Replace shortcut (Ctrl+F / Cmd+F)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                setShowFindReplace(true);
                return;
            }

            // Select All (Ctrl+A / Cmd+A)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                const activeTag = document.activeElement?.tagName;
                if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
                    e.preventDefault();
                    setSelectionRange({ startCol: 0, startRow: 1, endCol: colCount - 1, endRow: rowCount });
                    return;
                }
            }

            // Undo (Ctrl+Z / Cmd+Z) & Redo (Ctrl+Y / Cmd+Shift+Z)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                const activeTag = document.activeElement?.tagName;
                if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        handleRedo();
                    } else {
                        handleUndo();
                    }
                    return;
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                const activeTag = document.activeElement?.tagName;
                if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
                    e.preventDefault();
                    handleRedo();
                    return;
                }
            }

            // If an input or textarea (other than the main formula bar) is active, do not navigate cells
            const activeTag = document.activeElement?.tagName;
            const activeId = document.activeElement?.id;
            const isEditingActive = editingCell !== null;

            if (isEditingActive) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    setEditingCell(null);
                    setFormulaSuggestions([]);
                    const cur = parseCellCoord(editingCell);
                    if (cur && cur.row < rowCount) {
                        const nextKey = `${colToLetter(cur.col)}${cur.row + 1}`;
                        setSelectedCell(nextKey);
                        setSelectionRange({ startCol: cur.col, startRow: cur.row + 1, endCol: cur.col, endRow: cur.row + 1 });
                        const nextData = cells[nextKey] || {};
                        setFormulaInput(nextData.formula || (nextData.val !== undefined ? String(nextData.val) : ''));
                    }
                } else if (e.key === 'Escape') {
                    setEditingCell(null);
                    setFormulaSuggestions([]);
                }
                return;
            }

            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
                if (activeId === 'spreadsheet-formula-bar') {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        document.activeElement.blur();
                        const cur = parseCellCoord(selectedCell);
                        if (cur && cur.row < rowCount) {
                            const nextKey = `${colToLetter(cur.col)}${cur.row + 1}`;
                            setSelectedCell(nextKey);
                            setSelectionRange({ startCol: cur.col, startRow: cur.row + 1, endCol: cur.col, endRow: cur.row + 1 });
                            const nextData = cells[nextKey] || {};
                            setFormulaInput(nextData.formula || (nextData.val !== undefined ? String(nextData.val) : ''));
                        }
                    }
                }
                return;
            }

            // Clipboard shortcuts
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                handleCopy();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
                e.preventDefault();
                handleCut();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                handlePaste('all');
                return;
            }

            // Delete / Backspace cell contents
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                handleClearSelectedCells();
                return;
            }

            // Cell Navigation via Arrows, Tab, Enter
            const current = parseCellCoord(selectedCell) || { col: 0, row: 1 };

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const jumpToEdge = e.ctrlKey || e.metaKey;
                if (e.shiftKey) {
                    const newRow = jumpToEdge ? 1 : Math.max(1, selectionEndpoint.row - 1);
                    const newEndpoint = { ...selectionEndpoint, row: newRow };
                    setSelectionEndpoint(newEndpoint);
                    setSelectionRange({
                        startCol: Math.min(selectionAnchor.col, newEndpoint.col),
                        startRow: Math.min(selectionAnchor.row, newEndpoint.row),
                        endCol: Math.max(selectionAnchor.col, newEndpoint.col),
                        endRow: Math.max(selectionAnchor.row, newEndpoint.row)
                    });
                    scrollCellIntoView(newEndpoint.col, newEndpoint.row);
                } else {
                    const targetRow = jumpToEdge ? 1 : Math.max(1, current.row - 1);
                    const newKey = `${colToLetter(current.col)}${targetRow}`;
                    setSelectedCell(newKey);
                    setSelectionAnchor({ col: current.col, row: targetRow });
                    setSelectionEndpoint({ col: current.col, row: targetRow });
                    setMultiSelectedCells(new Set([newKey]));
                    setSelectionRange({ startCol: current.col, startRow: targetRow, endCol: current.col, endRow: targetRow });
                    setFormulaInput(cells[newKey]?.formula || (cells[newKey]?.val !== undefined ? String(cells[newKey]?.val) : ''));
                    scrollCellIntoView(current.col, targetRow);
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const jumpToEdge = e.ctrlKey || e.metaKey;
                if (e.shiftKey) {
                    const newRow = jumpToEdge ? rowCount : Math.min(rowCount, selectionEndpoint.row + 1);
                    const newEndpoint = { ...selectionEndpoint, row: newRow };
                    setSelectionEndpoint(newEndpoint);
                    setSelectionRange({
                        startCol: Math.min(selectionAnchor.col, newEndpoint.col),
                        startRow: Math.min(selectionAnchor.row, newEndpoint.row),
                        endCol: Math.max(selectionAnchor.col, newEndpoint.col),
                        endRow: Math.max(selectionAnchor.row, newEndpoint.row)
                    });
                    scrollCellIntoView(newEndpoint.col, newEndpoint.row);
                } else {
                    const targetRow = jumpToEdge ? rowCount : Math.min(rowCount, current.row + 1);
                    const newKey = `${colToLetter(current.col)}${targetRow}`;
                    setSelectedCell(newKey);
                    setSelectionAnchor({ col: current.col, row: targetRow });
                    setSelectionEndpoint({ col: current.col, row: targetRow });
                    setMultiSelectedCells(new Set([newKey]));
                    setSelectionRange({ startCol: current.col, startRow: targetRow, endCol: current.col, endRow: targetRow });
                    setFormulaInput(cells[newKey]?.formula || (cells[newKey]?.val !== undefined ? String(cells[newKey]?.val) : ''));
                    scrollCellIntoView(current.col, targetRow);
                }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const jumpToEdge = e.ctrlKey || e.metaKey;
                if (e.shiftKey) {
                    const newCol = jumpToEdge ? 0 : Math.max(0, selectionEndpoint.col - 1);
                    const newEndpoint = { ...selectionEndpoint, col: newCol };
                    setSelectionEndpoint(newEndpoint);
                    setSelectionRange({
                        startCol: Math.min(selectionAnchor.col, newEndpoint.col),
                        startRow: Math.min(selectionAnchor.row, newEndpoint.row),
                        endCol: Math.max(selectionAnchor.col, newEndpoint.col),
                        endRow: Math.max(selectionAnchor.row, newEndpoint.row)
                    });
                    scrollCellIntoView(newEndpoint.col, newEndpoint.row);
                } else {
                    const targetCol = jumpToEdge ? 0 : Math.max(0, current.col - 1);
                    const newKey = `${colToLetter(targetCol)}${current.row}`;
                    setSelectedCell(newKey);
                    setSelectionAnchor({ col: targetCol, row: current.row });
                    setSelectionEndpoint({ col: targetCol, row: current.row });
                    setMultiSelectedCells(new Set([newKey]));
                    setSelectionRange({ startCol: targetCol, startRow: current.row, endCol: targetCol, endRow: current.row });
                    setFormulaInput(cells[newKey]?.formula || (cells[newKey]?.val !== undefined ? String(cells[newKey]?.val) : ''));
                    scrollCellIntoView(targetCol, current.row);
                }
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const jumpToEdge = e.ctrlKey || e.metaKey;
                if (e.shiftKey) {
                    const newCol = jumpToEdge ? colCount - 1 : Math.min(colCount - 1, selectionEndpoint.col + 1);
                    const newEndpoint = { ...selectionEndpoint, col: newCol };
                    setSelectionEndpoint(newEndpoint);
                    setSelectionRange({
                        startCol: Math.min(selectionAnchor.col, newEndpoint.col),
                        startRow: Math.min(selectionAnchor.row, newEndpoint.row),
                        endCol: Math.max(selectionAnchor.col, newEndpoint.col),
                        endRow: Math.max(selectionAnchor.row, newEndpoint.row)
                    });
                    scrollCellIntoView(newEndpoint.col, newEndpoint.row);
                } else {
                    const targetCol = jumpToEdge ? colCount - 1 : Math.min(colCount - 1, current.col + 1);
                    const newKey = `${colToLetter(targetCol)}${current.row}`;
                    setSelectedCell(newKey);
                    setSelectionAnchor({ col: targetCol, row: current.row });
                    setSelectionEndpoint({ col: targetCol, row: current.row });
                    setMultiSelectedCells(new Set([newKey]));
                    setSelectionRange({ startCol: targetCol, startRow: current.row, endCol: targetCol, endRow: current.row });
                    setFormulaInput(cells[newKey]?.formula || (cells[newKey]?.val !== undefined ? String(cells[newKey]?.val) : ''));
                    scrollCellIntoView(targetCol, current.row);
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                const delta = e.shiftKey ? -1 : 1;
                const newCol = Math.min(colCount - 1, Math.max(0, current.col + delta));
                const newKey = `${colToLetter(newCol)}${current.row}`;
                setSelectedCell(newKey);
                setSelectionAnchor({ col: newCol, row: current.row });
                setSelectionEndpoint({ col: newCol, row: current.row });
                setMultiSelectedCells(new Set([newKey]));
                setSelectionRange({ startCol: newCol, startRow: current.row, endCol: newCol, endRow: current.row });
                setFormulaInput(cells[newKey]?.formula || (cells[newKey]?.val !== undefined ? String(cells[newKey]?.val) : ''));
                scrollCellIntoView(newCol, current.row);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const delta = e.shiftKey ? -1 : 1;
                const newRow = Math.min(rowCount, Math.max(1, current.row + delta));
                const newKey = `${colToLetter(current.col)}${newRow}`;
                setSelectedCell(newKey);
                setSelectionAnchor({ col: current.col, row: newRow });
                setSelectionEndpoint({ col: current.col, row: newRow });
                setMultiSelectedCells(new Set([newKey]));
                setSelectionRange({ startCol: current.col, startRow: newRow, endCol: current.col, endRow: newRow });
                setFormulaInput(cells[newKey]?.formula || (cells[newKey]?.val !== undefined ? String(cells[newKey]?.val) : ''));
                scrollCellIntoView(current.col, newRow);
            } else if (e.key === 'F2') {
                e.preventDefault();
                setEditingCell(selectedCell);
            } else if (e.key === '=') {
                // Excel-style: typing '=' immediately enters formula mode
                e.preventDefault();
                setEditingCell(selectedCell);
                setFormulaInput('=');
                updateCell(selectedCell, { formula: '=', val: '' });
                handleFormulaInputChange('=');
            } else if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
                // Printable character starts editing directly
                setEditingCell(selectedCell);
                setFormulaInput(e.key);
                updateCell(selectedCell, { val: e.key, formula: null });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        formulaSuggestions, activeSuggestionIdx, editingCell, selectedCell, rowCount, colCount, cells,
        selectionAnchor, selectionEndpoint, scrollCellIntoView,
        handleCopy, handleCut, handlePaste, handleClearSelectedCells, handleSelectFormulaSuggestion, handleUndo, handleRedo
    ]);

    // Load or initialize spreadsheet
    const loadSpreadsheet = useCallback(async () => {
        setIsInitialLoading(true);
        setLoadError(null);
        if (driveFileIdParam) {
            try {
                setSaveStatus('saving');
                const toastId = toast.loading('Loading spreadsheet from Google Drive...', { id: 'gdrive-sheet' });
                const res = await api.get(`/office/documents/drive/${driveFileIdParam}`);
                if (res.data?.success && res.data.data) {
                    const d = res.data.data;
                    setTitle(d.title || 'Google Drive Spreadsheet');
                    setIsDriveFile(true);
                    if (d.content?.sheets && Array.isArray(d.content.sheets) && d.content.sheets.length > 0) {
                        setSheets(d.content.sheets.map(sh => ({
                            name: sh.name || 'Sheet1',
                            colWidths: sh.colWidths || {},
                            rowHeights: sh.rowHeights || {},
                            cells: Object.fromEntries(
                                Object.entries(sh.cells || {}).map(([k, v]) => [k, { val: v.value !== undefined ? v.value : v.val, formula: v.formula || null }])
                            )
                        })));
                    }
                    toast.success(`Loaded "${d.title}" from Google Drive!`, { id: 'gdrive-sheet' });
                }
                setSaveStatus('saved');
            } catch (err) {
                console.error('Failed to load Google Drive spreadsheet:', err);
                toast.error('Could not load Google Drive spreadsheet', { id: 'gdrive-sheet' });
                setLoadError('Could not load Google Drive spreadsheet');
                setSaveStatus('saved');
            } finally {
                setIsInitialLoading(false);
            }
        } else if (docIdParam) {
            try {
                let d = null;
                try {
                    const res = await api.get(`/office/documents/${docIdParam}`);
                    if (res.data?.success && res.data.data) {
                        d = res.data.data;
                    }
                } catch (e) {
                    try {
                        const resDoc = await api.get(`/documents/${docIdParam}`);
                        if (resDoc.data?.success && resDoc.data.data) {
                            const std = resDoc.data.data;
                            d = {
                                id: std.id,
                                title: std.name || std.fileName || 'Spreadsheet',
                                current_content: {
                                    sheets: [{
                                        name: 'Sheet1',
                                        colWidths: {},
                                        rowHeights: {},
                                        cells: {
                                            'A1': { val: std.name || 'CloudVault File', bold: true, bg: '#e0f2fe' }
                                        }
                                    }]
                                }
                            };
                        }
                    } catch (_) {}
                }
                if (d) {
                    setTitle(d.title || 'Untitled Spreadsheet');
                    setDocId(d.id);
                    if (d.current_content?.sheets && Array.isArray(d.current_content.sheets) && d.current_content.sheets.length > 0) {
                        setSheets(d.current_content.sheets.map(sh => ({
                            name: sh.name || 'Sheet1',
                            colWidths: sh.colWidths || {},
                            rowHeights: sh.rowHeights || {},
                            cells: sh.cells || {}
                        })));
                    }
                } else {
                    setLoadError('Spreadsheet workbook not found in CloudVault');
                }
            } catch (err) {
                console.error('Failed to load spreadsheet:', err);
                setLoadError(err.response?.data?.message || 'Failed to load spreadsheet from server. Please verify your connection and retry.');
            } finally {
                setIsInitialLoading(false);
            }
        } else {
            setIsInitialLoading(false);
        }
    }, [docIdParam, driveFileIdParam]);

    useEffect(() => {
        loadSpreadsheet();
    }, [loadSpreadsheet]);

    // Format toggle across entire active selection
    const toggleCellFormat = (formatKey, defaultVal) => {
        const isCurrentlySet = Boolean(cells[selectedCell]?.[formatKey]);
        updateSelectedCells(cell => ({
            [formatKey]: isCurrentlySet ? undefined : defaultVal
        }));
    };

    // Apply Number Formatting across entire active selection
    const applyNumberFormat = (type) => {
        updateSelectedCells(cell => {
            const currentVal = cell?.val;
            if (currentVal === undefined || currentVal === '') return {};
            if (type === 'inr') {
                return { formatType: 'inr', displayVal: formatIndianCurrency(currentVal) };
            } else if (type === 'lakhs') {
                return { formatType: 'lakhs', displayVal: formatLakhsCrores(currentVal) };
            } else if (type === 'percent') {
                const n = Number(currentVal);
                return { formatType: 'percent', displayVal: !isNaN(n) ? `${(n * 100).toFixed(1)}%` : currentVal };
            } else {
                return { formatType: 'raw', displayVal: undefined };
            }
        });
        toast.success(`Applied ${type.toUpperCase()} formatting`);
    };

    // Recalculate sheet formulas
    const recalculateSheet = () => {
        setSheets(prevSheets => {
            const nextSheets = [...prevSheets];
            const targetSheet = { ...nextSheets[activeSheetIndex] };
            const nextCells = { ...targetSheet.cells };

            Object.entries(nextCells).forEach(([key, cell]) => {
                if (cell.formula) {
                    nextCells[key] = {
                        ...cell,
                        val: evaluateFormula(cell.formula, nextCells)
                    };
                }
            });

            targetSheet.cells = nextCells;
            nextSheets[activeSheetIndex] = targetSheet;
            return nextSheets;
        });
        toast.success('All formulas recalculated');
    };

    // Export handler
    const handleExport = async (format) => {
        try {
            toast.loading(`Exporting spreadsheet as .${format}...`, { id: 'sheet-export' });

            if (format === 'json') {
                const jsonStr = JSON.stringify({
                    title: title || 'Spreadsheet',
                    activeSheetIndex,
                    sheets
                }, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${title.replace(/[^a-zA-Z0-9_.-]/g, '_')}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success('Exported as .json!', { id: 'sheet-export' });
                return;
            }

            let exportDocId = docId;

            if (!exportDocId) {
                const res = await api.post('/office/documents', {
                    title: title || 'Untitled Spreadsheet',
                    docType: 'excel',
                    content: {
                        activeSheet: currentSheet.name || 'Sheet1',
                        sheets: sheets.map(s => ({
                            name: s.name,
                            rows: rowCount,
                            cols: colCount,
                            cells: s.cells || {}
                        }))
                    }
                });
                exportDocId = res.data?.data?.id;
                setDocId(exportDocId);
            }

            const res = await api.post(
                `/office/documents/${exportDocId}/export`,
                { format },
                { responseType: 'blob' }
            );

            const blob = new Blob([res.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-zA-Z0-9_.-]/g, '_')}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Exported as .${format}!`, { id: 'sheet-export' });
        } catch (err) {
            console.error('Export error:', err);
            toast.error('Failed to export spreadsheet', { id: 'sheet-export' });
        }
    };

    // Generate chart data from cell range (e.g. A1:C4)
    const chartRenderData = useMemo(() => {
        try {
            const parts = chartDataRange.toUpperCase().split(':');
            if (parts.length !== 2) return [];

            const start = parts[0];
            const end = parts[1];
            const startCol = start.charCodeAt(0) - 65;
            const startRow = parseInt(start.substring(1), 10);
            const endCol = end.charCodeAt(0) - 65;
            const endRow = parseInt(end.substring(1), 10);

            const result = [];
            for (let r = startRow + 1; r <= endRow; r++) {
                const labelKey = `${colToLetter(startCol)}${r}`;
                const label = cells[labelKey]?.val || `Row ${r}`;
                const rowObj = { name: String(label) };

                for (let c = startCol + 1; c <= endCol; c++) {
                    const headerKey = `${colToLetter(c)}${startRow}`;
                    const seriesName = cells[headerKey]?.val || `Col ${colToLetter(c)}`;
                    const valKey = `${colToLetter(c)}${r}`;
                    const val = Number(cells[valKey]?.val);
                    rowObj[seriesName] = !isNaN(val) ? val : 0;
                }
                result.push(rowObj);
            }
            return result;
        } catch {
            return [];
        }
    }, [chartDataRange, cells]);

    // Active color palette
    const colors = PALETTES[chartPalette] || PALETTES.emerald;

    // Close menu on outer click
    useEffect(() => {
        const closeMenu = () => {
            setActiveMenu(null);
            setBorderMenuOpen(false);
            setFontColorMenuOpen(false);
            setShowExportMenu(false);
        };
        const handleMouseUp = () => setIsDraggingRange(false);
        window.addEventListener('click', closeMenu);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('click', closeMenu);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    return (
        <div className={`min-h-screen flex flex-col font-sans select-none transition-colors duration-150 ${
            isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-850'
        }`}>
            {/* Top Navigation & App Bar */}
            <header className={`border-b sticky top-0 z-40 flex flex-col shadow-xs transition-colors duration-150 pt-10 sm:pt-11 ${
                isDark ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-800'
            }`}>
                {/* Upper Meta Row */}
                <div className={`px-3 py-2 flex items-center justify-between border-b ${
                    isDark ? 'border-slate-800/80 bg-slate-900' : 'border-slate-200 bg-white'
                }`}>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => router.push('/documents')}
                            className={`p-1.5 rounded-lg transition flex items-center gap-1 text-xs font-semibold ${
                                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                            title="Back to Documents"
                        >
                            <ArrowLeft size={16} />
                            <span className="hidden sm:inline">Documents</span>
                        </button>
                        <OfficeOpenImportMenu
                            currentApp="excel"
                            accept=".xlsx,.xls,.csv"
                            onOpenOfficeDoc={handleOpenOfficeDoc}
                        />
                        <div className={`h-4 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                        {/* App Badge & Document Title */}
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs" title="LabSheets Spreadsheet">
                                <FileSpreadsheet size={15} />
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded border hidden md:inline ${
                                isDark ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            }`}>
                                LabSheets
                            </span>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    triggerAutoSave();
                                }}
                                onBlur={async () => {
                                    if (docId) {
                                        try {
                                            await api.put(`/office/documents/${docId}`, { title });
                                            setSaveStatus('saved');
                                        } catch (e) {
                                            console.error('Failed to update title on blur:', e);
                                        }
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.target.blur();
                                }}
                                className={`border border-transparent rounded px-2 py-0.5 text-xs sm:text-sm font-bold focus:outline-none transition max-w-[200px] sm:max-w-xs md:max-w-md truncate ${
                                    isDark ? 'text-white hover:bg-slate-800 focus:bg-slate-800 focus:border-slate-700' : 'text-slate-900 hover:bg-slate-100 focus:bg-slate-50 focus:border-slate-300'
                                }`}
                                title="Click to rename spreadsheet"
                            />
                            {isDriveFile && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[10px] font-semibold whitespace-nowrap">
                                    <HardDrive size={11} className="text-emerald-400" />
                                    Google Drive
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2">
                        {/* Auto-save Status */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-2">
                            {saveStatus === 'saving' && (
                                <>
                                    <RefreshCw size={13} className="text-amber-400 animate-spin" />
                                    <span className="hidden sm:inline">Saving...</span>
                                </>
                            )}
                            {saveStatus === 'saved' && (
                                <>
                                    <Cloud size={14} className="text-emerald-400" />
                                    <span className="hidden sm:inline text-slate-400">Saved</span>
                                </>
                            )}
                        </div>

                        {/* Find & Replace Shortcut Button */}
                        <button
                            type="button"
                            onClick={() => setShowFindReplace(true)}
                            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                            title="Find and Replace (Ctrl+F)"
                        >
                            <Search size={14} className={isDark ? 'text-slate-400' : 'text-slate-600'} />
                        </button>

                        {/* Theme Toggle (Light / Dark / High Contrast) */}
                        <OfficeThemeToggle />

                        {/* Version History Button */}
                        <button
                            type="button"
                            onClick={() => setShowHistory(true)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                            title="View Document Version History & Milestones"
                        >
                            <History size={13} className="text-emerald-500" />
                            <span className="hidden md:inline">History</span>
                        </button>

                        {/* Chart Inspector Toggle Button */}
                        <button
                            type="button"
                            onClick={() => setShowChartInspector(!showChartInspector)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                                showChartInspector
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : isDark
                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                            title="Toggle Right-Side Chart Inspector Panel"
                        >
                            <BarChart3 size={13} className={showChartInspector ? 'text-white' : 'text-emerald-500'} />
                            <span>Chart Inspector</span>
                        </button>

                        {/* Unified Collective Export Dropdown */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                                title="Export Spreadsheet in various formats"
                            >
                                <Download size={13} />
                                <span>Export</span>
                                <ChevronDown size={11} className={showExportMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
                            </button>

                            {showExportMenu && (
                                <div 
                                    onClick={(e) => e.stopPropagation()}
                                    className={`absolute right-0 top-full mt-1 w-52 border rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                                        isDark ? 'bg-slate-900 border-slate-700 text-slate-200 shadow-black/80' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/60'
                                    }`}
                                >
                                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/40 select-none">
                                        Office Media Files
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => { handleSaveToOfficeMediaFiles(); setShowExportMenu(false); }} 
                                        className={`w-full text-left px-3 py-2 flex items-center justify-between text-rose-500 font-semibold transition ${isDark ? 'hover:bg-slate-800' : 'hover:bg-rose-50'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Save size={13} className="text-rose-500" />
                                            <span>Save to Office Media Files</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono">CloudVault</span>
                                    </button>
                                    <div className={`h-px my-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/40 select-none">
                                        Download Formats
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => { handleExport('xlsx'); setShowExportMenu(false); }} 
                                        className={`w-full text-left px-3 py-2 flex items-center justify-between transition ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileSpreadsheet size={13} className="text-emerald-500" />
                                            <span>Excel Workbook</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono">.xlsx</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => { handleExport('csv'); setShowExportMenu(false); }} 
                                        className={`w-full text-left px-3 py-2 flex items-center justify-between transition ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileText size={13} className="text-teal-500" />
                                            <span>Comma-Separated</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono">.csv</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => { handleExport('pdf'); setShowExportMenu(false); }} 
                                        className={`w-full text-left px-3 py-2 flex items-center justify-between transition ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileCode size={13} className="text-rose-500" />
                                            <span>PDF Document</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono">.pdf</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => { handleExport('json'); setShowExportMenu(false); }} 
                                        className={`w-full text-left px-3 py-2 flex items-center justify-between transition ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={13} className="text-amber-500" />
                                            <span>JSON Data</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono">.json</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Lower Menu Bar (File, Edit, View, Insert, Format, Data, Tools, Help) */}
                <div className={`px-4 py-1 flex items-center gap-2 text-xs border-b relative ${
                    isDark ? 'bg-slate-900/90 border-slate-800/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                    {/* File Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'file' ? null : 'file'); }}
                            className={`px-2 py-0.5 rounded transition ${
                                activeMenu === 'file'
                                    ? (isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-200 text-slate-900 font-bold')
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')
                            }`}
                        >
                            File
                        </button>
                        {activeMenu === 'file' && (
                            <div className={`absolute left-0 top-full mt-1 w-52 border rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button onClick={() => { handleSaveToOfficeMediaFiles(); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-rose-500 font-semibold ${isDark ? 'hover:bg-slate-800' : 'hover:bg-rose-50'}`}>
                                    <Save size={13} /> Save to Office Media Files
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => handleExport('xlsx')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Download size={13} /> Download .xlsx
                                </button>
                                <button onClick={() => handleExport('csv')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Download size={13} /> Download .csv
                                </button>
                                <button onClick={() => handleExport('pdf')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Download size={13} /> Download .pdf
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => window.print()} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Printer size={13} /> Print Sheet
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Edit Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'edit' ? null : 'edit'); }}
                            className={`px-2 py-0.5 rounded transition ${
                                activeMenu === 'edit'
                                    ? (isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-200 text-slate-900 font-bold')
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')
                            }`}
                        >
                            Edit
                        </button>
                        {activeMenu === 'edit' && (
                            <div className={`absolute left-0 top-full mt-1 w-60 border rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button onClick={() => { handleUndo(); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span className="flex items-center gap-2"><Undo size={13} /> Undo</span>
                                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+Z</span>
                                </button>
                                <button onClick={() => { handleRedo(); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span className="flex items-center gap-2"><Redo size={13} /> Redo</span>
                                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+Y</span>
                                </button>
                                
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => { handleCut(); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span className="flex items-center gap-2"><Scissors size={13} /> Cut</span>
                                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+X</span>
                                </button>
                                <button onClick={() => { handleCopy(); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span className="flex items-center gap-2"><Copy size={13} /> Copy</span>
                                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+C</span>
                                </button>
                                <button onClick={() => { handlePaste('all'); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span className="flex items-center gap-2"><ClipboardPaste size={13} /> Paste</span>
                                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+V</span>
                                </button>
                                
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Paste Special
                                </div>
                                <button onClick={() => { handlePaste('values'); setActiveMenu(null); }} className={`w-full text-left px-4 py-1 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800 text-emerald-400' : 'hover:bg-slate-100 text-emerald-600'}`}>
                                    <span>• Paste Values Only</span>
                                </button>
                                <button onClick={() => { handlePaste('formulas'); setActiveMenu(null); }} className={`w-full text-left px-4 py-1 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800 text-blue-400' : 'hover:bg-slate-100 text-blue-600'}`}>
                                    <span>• Paste Formulas Only</span>
                                </button>
                                <button onClick={() => { handlePaste('formats'); setActiveMenu(null); }} className={`w-full text-left px-4 py-1 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800 text-purple-400' : 'hover:bg-slate-100 text-purple-600'}`}>
                                    <span>• Paste Formats Only</span>
                                </button>

                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => { setShowFindReplace(true); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span className="flex items-center gap-2"><Search size={13} /> Find & Replace</span>
                                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+F</span>
                                </button>
                                <button onClick={() => { recalculateSheet(); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <RefreshCw size={13} /> Recalculate Formulas
                                </button>
                                <button onClick={() => { handleClearSelectedCells(); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-rose-500/10 text-rose-500 flex items-center justify-between">
                                    <span className="flex items-center gap-2"><Trash2 size={13} /> Clear Contents</span>
                                    <span className="text-[10px] text-slate-400 font-mono">Del</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* View Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'view' ? null : 'view'); }}
                            className={`px-2 py-0.5 rounded transition ${
                                activeMenu === 'view'
                                    ? (isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-200 text-slate-900 font-bold')
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')
                            }`}
                        >
                            View
                        </button>
                        {activeMenu === 'view' && (
                            <div className={`absolute left-0 top-full mt-1 w-56 border rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button onClick={() => setFreezeHeader(!freezeHeader)} className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span>Freeze Row 1</span>
                                    {freezeHeader && <Check size={13} className="text-emerald-500" />}
                                </button>
                                <button onClick={() => setFreezeCol(!freezeCol)} className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span>Freeze Column A</span>
                                    {freezeCol && <Check size={13} className="text-emerald-500" />}
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => setShowGridlines(!showGridlines)} className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span>Show Gridlines</span>
                                    {showGridlines && <Check size={13} className="text-emerald-500" />}
                                </button>
                                <button onClick={() => setShowHeaders(!showHeaders)} className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span>Show Row & Col Headers</span>
                                    {showHeaders && <Check size={13} className="text-emerald-500" />}
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')} className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span>Density Mode</span>
                                    <span className="text-[10px] text-emerald-500 capitalize">{density}</span>
                                </button>
                                <button onClick={() => setIsFullscreen(!isFullscreen)} className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span>Fullscreen Mode</span>
                                    {isFullscreen && <Check size={13} className="text-emerald-500" />}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Insert Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'insert' ? null : 'insert'); }}
                            className={`px-2 py-0.5 rounded transition ${
                                activeMenu === 'insert'
                                    ? (isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-200 text-slate-900 font-bold')
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')
                            }`}
                        >
                            Insert
                        </button>
                        {activeMenu === 'insert' && (
                            <div className={`absolute left-0 top-full mt-1 w-56 border rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button onClick={() => { handleInsertChart(); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-emerald-500/10 flex items-center gap-2 text-emerald-500 font-semibold">
                                    <BarChart3 size={13} /> Insert Interactive Chart
                                </button>
                                <button onClick={() => { handleInsertImage(); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Film size={13} className="text-sky-400" /> Insert Image / Diagram
                                </button>
                                <button onClick={() => { handleInsertShape('rectangle'); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Square size={13} className="text-amber-400" /> Insert Shape (Rectangle)
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => { handleAddSheet(); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Plus size={13} className="text-emerald-500" /> New Worksheet Tab
                                </button>
                                <button onClick={() => { handleInsertRow(parseCellCoord(selectedCell)?.row || 1, 'above'); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Plus size={13} /> Insert Row Above
                                </button>
                                <button onClick={() => { handleInsertCol(parseCellCoord(selectedCell)?.col || 0, 'left'); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Plus size={13} /> Insert Column Left
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => { updateCell(selectedCell, { formula: `=SUM(B2:B${rowCount})` }); recalculateSheet(); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Sigma size={13} /> Auto-SUM Function
                                </button>
                                <button onClick={() => { updateCell(selectedCell, { formula: `=AVERAGE(B2:B${rowCount})` }); recalculateSheet(); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Sigma size={13} /> Average Function
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Format Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'format' ? null : 'format'); }}
                            className={`px-2 py-0.5 rounded transition ${
                                activeMenu === 'format'
                                    ? (isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-200 text-slate-900 font-bold')
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')
                            }`}
                        >
                            Format
                        </button>
                        {activeMenu === 'format' && (
                            <div className={`absolute left-0 top-full mt-1 w-56 border rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button onClick={() => applyNumberFormat('inr')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <IndianRupee size={13} className="text-emerald-500" /> Indian Rupee (₹ 12,34,567)
                                </button>
                                <button onClick={() => applyNumberFormat('lakhs')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Sparkles size={13} className="text-amber-400" /> Lakhs & Crores (12.34 Lakhs)
                                </button>
                                <button onClick={() => applyNumberFormat('percent')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Percent size={13} className="text-blue-400" /> Percentage (%)
                                </button>
                                <button onClick={() => applyNumberFormat('raw')} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <RefreshCw size={13} /> Reset Standard Format
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Data Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'data' ? null : 'data'); }}
                            className={`px-2 py-0.5 rounded transition ${
                                activeMenu === 'data'
                                    ? (isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-200 text-slate-900 font-bold')
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')
                            }`}
                        >
                            Data
                        </button>
                        {activeMenu === 'data' && (
                            <div className={`absolute left-0 top-full mt-1 w-64 border rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button onClick={() => { handleSort('asc'); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <ArrowDown size={13} className="text-emerald-500" /> Sort Sheet A → Z (Ascending)
                                </button>
                                <button onClick={() => { handleSort('desc'); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <ArrowUp size={13} className="text-emerald-500" /> Sort Sheet Z → A (Descending)
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                                <button onClick={() => { handleToggleFilter(); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <span className="flex items-center gap-2"><Filter size={13} className="text-blue-400" /> Toggle AutoFilter</span>
                                    {isFilterActive && <Check size={13} className="text-emerald-500" />}
                                </button>
                                <button onClick={() => { setShowValidationModal(true); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <ListFilter size={13} className="text-amber-400" /> In-Cell Data Validation...
                                </button>
                                <button onClick={() => { setShowCondFormatModal(true); setActiveMenu(null); }} className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <Palette size={13} className="text-purple-400" /> Conditional Formatting Rules...
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Ribbon Toolbar */}
                <div className={`px-4 py-1.5 flex items-center gap-1 overflow-x-auto hide-scrollbar text-xs border-b ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                    {/* Font Styling */}
                    <button
                        type="button"
                        onClick={() => toggleCellFormat('bold', true)}
                        className={`p-1.5 rounded transition ${cells[selectedCell]?.bold ? 'bg-emerald-600 text-white' : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100')}`}
                        title="Bold (Ctrl+B)"
                    >
                        <Bold size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={() => toggleCellFormat('italic', true)}
                        className={`p-1.5 rounded transition ${cells[selectedCell]?.italic ? 'bg-emerald-600 text-white' : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100')}`}
                        title="Italic (Ctrl+I)"
                    >
                        <Italic size={13} />
                    </button>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Alignment */}
                    <button
                        type="button"
                        onClick={() => updateCell(selectedCell, { align: 'left' })}
                        className={`p-1.5 rounded transition ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
                        title="Align Left"
                    >
                        <AlignLeft size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={() => updateCell(selectedCell, { align: 'center' })}
                        className={`p-1.5 rounded transition ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
                        title="Align Center"
                    >
                        <AlignCenter size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={() => updateCell(selectedCell, { align: 'right' })}
                        className={`p-1.5 rounded transition ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
                        title="Align Right"
                    >
                        <AlignRight size={13} />
                    </button>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Number Formatting Buttons (Indian Rupee, Lakhs, %) */}
                    <button
                        type="button"
                        onClick={() => applyNumberFormat('inr')}
                        className={`px-2 py-1 border rounded flex items-center gap-1 font-mono text-[11px] font-bold transition ${
                            isDark ? 'bg-slate-800/80 hover:bg-slate-700 text-emerald-400 border-slate-700/80' : 'bg-slate-50 hover:bg-slate-100 text-emerald-700 border-slate-300'
                        }`}
                        title="Format as Indian Rupee (₹)"
                    >
                        <IndianRupee size={12} />
                        <span>₹ INR</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => applyNumberFormat('lakhs')}
                        className={`px-2 py-1 border rounded flex items-center gap-1 font-mono text-[11px] font-bold transition ${
                            isDark ? 'bg-slate-800/80 hover:bg-slate-700 text-amber-300 border-slate-700/80' : 'bg-slate-50 hover:bg-slate-100 text-amber-700 border-slate-300'
                        }`}
                        title="Format as Lakhs / Crores"
                    >
                        <span>Lakhs/Cr</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => applyNumberFormat('percent')}
                        className={`p-1.5 rounded transition ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
                        title="Percent (%)"
                    >
                        <Percent size={13} />
                    </button>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Cell Color Fill */}
                    <button
                        type="button"
                        onClick={() => toggleCellFormat('bg', '#f1f5f9')}
                        className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
                        title="Light Gray Header Fill"
                    >
                        <div className="w-3 h-3 rounded-full bg-slate-200 border border-slate-400" />
                        <span>Header</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => toggleCellFormat('bg', '#e0f2fe')}
                        className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
                        title="Light Blue Highlight"
                    >
                        <div className="w-3 h-3 rounded-full bg-blue-200 border border-blue-400" />
                        <span>Highlight</span>
                    </button>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Font Color Picker Popover */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFontColorMenuOpen(!fontColorMenuOpen); }}
                            className={`px-2 py-1 rounded flex items-center gap-1.5 text-[11px] transition ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
                            title="Font Color (Text Formatting)"
                        >
                            <span className="font-bold text-xs flex flex-col items-center leading-none">
                                <span>A</span>
                                <span className="w-3.5 h-1 rounded-sm mt-0.5" style={{ backgroundColor: activeFontColor }} />
                            </span>
                            <ChevronDown size={10} />
                        </button>
                        {fontColorMenuOpen && (
                            <div 
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute left-0 top-full mt-1 w-44 p-2.5 border rounded-xl shadow-2xl z-50 text-xs ${
                                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                                }`}
                            >
                                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Font Colors</span>
                                <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                                    {[
                                        '#000000', '#475569', '#94a3b8', '#ffffff', '#ef4444',
                                        '#f97316', '#f59e0b', '#22c55e', '#10b981', '#14b8a6',
                                        '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#f43f5e'
                                    ].map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => applyFontColor(c)}
                                            style={{ backgroundColor: c }}
                                            className="w-6 h-6 rounded-md border border-slate-400/40 hover:scale-110 transition-transform shadow-xs"
                                            title={c}
                                        />
                                    ))}
                                </div>
                                <div className="pt-1.5 border-t border-slate-700/40 flex items-center gap-1.5">
                                    <input
                                        type="color"
                                        value={activeFontColor}
                                        onChange={(e) => applyFontColor(e.target.value)}
                                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                                        title="Custom HEX Color"
                                    />
                                    <span className="text-[11px] text-slate-400">Custom Color</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Cell Borders Menu */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setBorderMenuOpen(!borderMenuOpen); }}
                            className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
                            title="Cell Borders (All, Outer, Top, Bottom, Left, Right, Clear)"
                        >
                            <Square size={12} className={isDark ? 'text-slate-300' : 'text-slate-600'} />
                            <span>Borders</span>
                            <ChevronDown size={10} />
                        </button>
                        {borderMenuOpen && (
                            <div className={`absolute left-0 top-full mt-1 w-44 border rounded-xl shadow-2xl py-1.5 z-50 text-xs ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50'
                            }`}>
                                <button
                                    onClick={() => applyRangeBorder('all')}
                                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'}`}
                                >
                                    <Table size={12} /> All Borders
                                </button>
                                <button
                                    onClick={() => applyRangeBorder('outer')}
                                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'}`}
                                >
                                    <Square size={12} /> Outside Borders
                                </button>
                                <button
                                    onClick={() => applyRangeBorder('thick')}
                                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'}`}
                                >
                                    <span className="w-3 h-3 border-2 border-current inline-block rounded-xs" /> Thick Box Border
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
                                <button
                                    onClick={() => applyRangeBorder('top')}
                                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'}`}
                                >
                                    <span className="w-3 border-t-2 border-emerald-500 inline-block" /> Top Border
                                </button>
                                <button
                                    onClick={() => applyRangeBorder('bottom')}
                                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'}`}
                                >
                                    <span className="w-3 border-b-2 border-emerald-500 inline-block" /> Bottom Border
                                </button>
                                <button
                                    onClick={() => applyRangeBorder('double_bottom')}
                                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'}`}
                                >
                                    <span className="w-3 border-b-4 border-double border-emerald-500 inline-block" /> Double Bottom Border
                                </button>
                                <button
                                    onClick={() => applyRangeBorder('left')}
                                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'}`}
                                >
                                    <span className="h-3 border-l-2 border-emerald-500 inline-block" /> Left Border
                                </button>
                                <button
                                    onClick={() => applyRangeBorder('right')}
                                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'}`}
                                >
                                    <span className="h-3 border-r-2 border-emerald-500 inline-block" /> Right Border
                                </button>
                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
                                <button
                                    onClick={() => applyRangeBorder('clear')}
                                    className="w-full text-left px-3 py-1.5 hover:bg-rose-500/10 text-rose-500 flex items-center gap-2"
                                >
                                    <X size={12} /> Clear Borders
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Merge Cells */}
                    <button
                        type="button"
                        onClick={handleMergeRange}
                        className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
                        title="Merge Selected Cells into Primary Cell"
                    >
                        <span>Merge</span>
                    </button>

                    {/* Text Wrap Mode Toggle */}
                    <button
                        type="button"
                        onClick={handleToggleWrap}
                        className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] ${
                            cells[selectedCell]?.wrap === 'wrap'
                                ? (isDark ? 'bg-slate-800 text-emerald-400 font-bold' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold')
                                : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100')
                        }`}
                        title="Toggle Text Wrapping (Clip / Wrap / Overflow)"
                    >
                        <span>Wrap Text</span>
                    </button>

                    {/* Insert Checkbox Button */}
                    <button
                        type="button"
                        onClick={handleInsertCheckbox}
                        className={`p-1.5 rounded transition ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
                        title="Insert Interactive Checkbox in Active Cell"
                    >
                        <CheckSquare size={13} className="text-emerald-500" />
                    </button>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Sorting Buttons */}
                    <button
                        type="button"
                        onClick={() => handleSort('asc')}
                        className={`p-1.5 rounded transition ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
                        title="Sort Sheet Ascending (A → Z) by Active Column"
                    >
                        <ArrowDown size={13} className="text-emerald-500" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSort('desc')}
                        className={`p-1.5 rounded transition ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
                        title="Sort Sheet Descending (Z → A) by Active Column"
                    >
                        <ArrowUp size={13} className="text-emerald-500" />
                    </button>

                    {/* AutoFilter Toggle Button */}
                    <button
                        type="button"
                        onClick={handleToggleFilter}
                        className={`p-1.5 rounded transition ${
                            isFilterActive
                                ? (isDark ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50' : 'bg-blue-50 text-blue-600 border border-blue-300')
                                : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100')
                        }`}
                        title="Toggle AutoFilter Dropdowns on Row 1"
                    >
                        <Filter size={13} />
                    </button>

                    {/* Data Validation Modal Trigger */}
                    <button
                        type="button"
                        onClick={() => setShowValidationModal(true)}
                        className={`p-1.5 rounded transition ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
                        title="In-Cell Data Validation Dropdown List"
                    >
                        <ListFilter size={13} className="text-amber-500" />
                    </button>

                    {/* Conditional Formatting Modal Trigger */}
                    <button
                        type="button"
                        onClick={() => setShowCondFormatModal(true)}
                        className={`p-1.5 rounded transition ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
                        title="Conditional Formatting Rules & Heatmaps"
                    >
                        <Palette size={13} className="text-purple-400" />
                    </button>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Quick Formula Injection */}
                    <button
                        type="button"
                        onClick={() => {
                            updateCell(selectedCell, { formula: `=SUM(B2:B${rowCount})` });
                            recalculateSheet();
                        }}
                        className={`px-2 py-1 rounded flex items-center gap-1 font-mono text-[11px] ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
                        title="Insert Auto-SUM"
                    >
                        <Sigma size={12} className="text-emerald-500" />
                        <span>Auto-SUM</span>
                    </button>

                    <button
                        type="button"
                        onClick={recalculateSheet}
                        className={`p-1.5 rounded transition ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
                        title="Recalculate Formulas"
                    >
                        <RefreshCw size={13} />
                    </button>

                    <div className={`h-4 w-px mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Freeze Header Toggle */}
                    <button
                        type="button"
                        onClick={() => setFreezeHeader(!freezeHeader)}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                            freezeHeader
                                ? (isDark ? 'bg-slate-800 text-emerald-400 font-bold' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold')
                                : (isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')
                        }`}
                        title="Lock Row 1 during scrolling"
                    >
                        Freeze Row 1
                    </button>

                    {/* Add Rows */}
                    <button
                        type="button"
                        onClick={() => setRowCount(prev => prev + 15)}
                        className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 ${
                            isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                        title="Add 15 more rows"
                    >
                        <Plus size={11} />
                        <span>15 Rows</span>
                    </button>
                </div>

                {/* Interactive Chart Range Selection Mode Indicator Banner */}
                {isSelectingChartRange && (
                    <div className="bg-gradient-to-r from-indigo-600 to-emerald-600 text-white px-4 py-1 text-xs flex items-center justify-between shrink-0 shadow-sm animate-pulse">
                        <span className="flex items-center gap-2 font-medium">
                            🎯 <strong>Chart Data Range Selector Active:</strong> Click or drag on the spreadsheet grid to define chart data (Current Range: <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded font-bold">{chartDataRange}</span>)
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleApplyChartRangeFromSelection}
                                className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white font-semibold text-[11px]"
                            >
                                Use Selected Cells
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsSelectingChartRange(false); toast.success(`Chart Range saved: ${chartDataRange}`); }}
                                className="px-2.5 py-0.5 rounded bg-white text-indigo-800 font-bold hover:bg-indigo-50 shadow-xs text-[11px]"
                            >
                                Done ✓
                            </button>
                        </div>
                    </div>
                )}

                {/* Formula Bar */}
                <div className={`px-4 py-1.5 border-t relative flex items-center gap-2 ${
                    isDark ? 'bg-slate-900 border-slate-800/80 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                    <div className={`w-14 px-2 py-1 border rounded text-center font-mono font-bold text-xs shadow-inner ${
                        isDark ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-white border-slate-300 text-emerald-700 shadow-xs'
                    }`}>
                        {selectedCell}
                    </div>

                    <div className="text-slate-400 font-serif italic text-xs font-bold px-1 select-none">
                        fx
                    </div>

                    <input
                        id="spreadsheet-formula-bar"
                        type="text"
                        value={formulaInput}
                        onChange={(e) => handleFormulaInputChange(e.target.value)}
                        onFocus={() => setIsFormulaBarFocused(true)}
                        onBlur={() => setTimeout(() => setIsFormulaBarFocused(false), 200)}
                        placeholder="Enter value or formula (e.g. =SUM(B2:B4) or =B2+C2 or 150000)"
                        className={`flex-1 border rounded px-3 py-1 text-xs font-mono focus:outline-none transition ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600'
                        }`}
                    />
                </div>
            </header>

            {/* Main Application Layout: Full Viewport Grid + Right Chart Inspector */}
            <div className={`flex-1 flex overflow-hidden ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
                {/* 2. Virtual Spreadsheet Grid Canvas (Full horizontal viewport) */}
                <main className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-800'}`}>
                    <div 
                        ref={gridContainerRef}
                        onScroll={(e) => setScrollTop(e.target.scrollTop)}
                        className="flex-1 overflow-auto p-2"
                        onClick={() => {
                            if (contextMenu.visible) setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                    >
                        <div 
                            style={{
                                transform: `scale(${zoomLevel / 100})`,
                                transformOrigin: 'top left'
                            }}
                            className="inline-block min-w-full"
                        >
                            <table className={`border-collapse table-fixed text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                                <colgroup>
                                    {showHeaders && <col style={{ width: 48, minWidth: 48, maxWidth: 48 }} />}
                                    {Array.from({ length: colCount }).map((_, cIdx) => {
                                        const colW = colWidths[colToLetter(cIdx)] || 100;
                                        return <col key={cIdx} style={{ width: colW, minWidth: colW, maxWidth: colW }} />;
                                    })}
                                </colgroup>
                                {showHeaders && (
                                    <thead>
                                        <tr className={freezeHeader ? `sticky top-0 z-30 ${isDark ? 'bg-slate-900 shadow-sm' : 'bg-slate-200 shadow-sm'}` : (isDark ? 'bg-slate-900' : 'bg-slate-200')}>
                                            <th className={`w-12 min-w-[48px] max-w-[48px] h-6 border text-center font-mono text-[10px] select-none sticky top-0 left-0 z-40 ${
                                                isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-200 border-slate-300 text-slate-600'
                                            }`}>
                                                #
                                            </th>
                                            {Array.from({ length: colCount }).map((_, cIdx) => {
                                                const colLetter = colToLetter(cIdx);
                                                const colW = colWidths[colLetter] || 100;
                                                const hasActiveFilter = Boolean(activeFilters[colLetter]?.length);
                                                const isColActive = selectedCols.has(cIdx);
                                                return (
                                                    <th
                                                        key={cIdx}
                                                        onClick={(e) => handleColHeaderClick(e, cIdx)}
                                                        style={{ width: colW, minWidth: colW, maxWidth: colW }}
                                                        className={`h-6 border font-mono text-[11px] font-bold text-center select-none relative cursor-pointer transition-colors sticky top-0 z-30 ${
                                                            freezeCol && cIdx === 0 ? 'sticky left-12 z-35' : ''
                                                        } ${
                                                            isColActive
                                                                ? 'bg-emerald-600 text-white ring-1 ring-emerald-400 z-10'
                                                                : isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-center gap-1 relative px-1">
                                                            <span>{colLetter}</span>
                                                            {isFilterActive && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenFilterCol(openFilterCol === colLetter ? null : colLetter);
                                                                    }}
                                                                    className={`p-0.5 rounded transition ${
                                                                        hasActiveFilter ? 'text-emerald-500 font-bold' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                                                    }`}
                                                                    title={`Filter Column ${colLetter}`}
                                                                >
                                                                    <Filter size={10} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* AutoFilter Popover */}
                                                        {openFilterCol === colLetter && (
                                                            <div 
                                                                onClick={(e) => e.stopPropagation()}
                                                                className={`absolute top-full left-0 mt-1 w-52 rounded-xl border shadow-2xl p-2.5 z-50 text-xs font-normal text-left ${
                                                                    isDark ? 'bg-slate-900 border-slate-700 text-white shadow-black/80' : 'bg-white border-slate-300 text-slate-900 shadow-slate-300/80'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between pb-1.5 border-b mb-2">
                                                                    <span className="font-bold text-[11px]">Filter Column {colLetter}</span>
                                                                    <button type="button" onClick={() => setOpenFilterCol(null)} className="p-0.5 hover:opacity-70"><X size={12} /></button>
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search values..."
                                                                    value={filterSearch}
                                                                    onChange={(e) => setFilterSearch(e.target.value)}
                                                                    className="w-full px-2 py-1 rounded border text-[11px] outline-none mb-2 bg-transparent"
                                                                />
                                                                <div className="max-h-36 overflow-y-auto space-y-1">
                                                                    {getColumnDistinctValues(colLetter)
                                                                        .filter(v => v.toLowerCase().includes(filterSearch.toLowerCase()))
                                                                        .map(v => {
                                                                            const isChecked = !(activeFilters[colLetter] && !activeFilters[colLetter].includes(v));
                                                                            return (
                                                                                <label key={v} className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-500/10 p-1 rounded">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isChecked}
                                                                                        onChange={(e) => {
                                                                                            const allDistinct = getColumnDistinctValues(colLetter);
                                                                                            let currentAllowed = activeFilters[colLetter] ? [...activeFilters[colLetter]] : [...allDistinct];
                                                                                            if (e.target.checked) {
                                                                                                if (!currentAllowed.includes(v)) currentAllowed.push(v);
                                                                                            } else {
                                                                                                currentAllowed = currentAllowed.filter(x => x !== v);
                                                                                            }
                                                                                            setActiveFilters(prev => ({ ...prev, [colLetter]: currentAllowed }));
                                                                                        }}
                                                                                    />
                                                                                    <span className="truncate text-[11px]">{v}</span>
                                                                                </label>
                                                                            );
                                                                        })}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setActiveFilters(prev => {
                                                                            const next = { ...prev };
                                                                            delete next[colLetter];
                                                                            return next;
                                                                        });
                                                                        setOpenFilterCol(null);
                                                                    }}
                                                                    className="w-full mt-2 py-1 text-[10px] text-slate-400 hover:text-white underline text-center"
                                                                >
                                                                    Clear Filter for Col {colLetter}
                                                                </button>
                                                            </div>
                                                        )}
                                                        {/* Interactive Column Resize Handle */}
                                                        <div
                                                            onMouseDown={(e) => handleStartColResize(e, colLetter)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-emerald-500/50 z-20"
                                                            title={`Drag to resize column ${colLetter}`}
                                                        />
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                )}
                                <tbody>
                                    {/* Virtualized Row Windowing for 1,000+ Rows */}
                                    {(() => {
                                        const ROW_HEIGHT = density === 'compact' ? 20 : 24;
                                        const visibleStartRow = Math.max(1, Math.floor(scrollTop / ROW_HEIGHT) - 15);
                                        const visibleEndRow = Math.min(rowCount, Math.ceil((scrollTop + (viewportHeight || 650)) / ROW_HEIGHT) + 20);

                                        return (
                                            <>
                                                {/* Top Virtual Spacer Row with explicit height container */}
                                                {visibleStartRow > 1 && (
                                                    <tr style={{ height: (visibleStartRow - 1) * ROW_HEIGHT }}>
                                                        <td colSpan={colCount + (showHeaders ? 1 : 0)} className="p-0 border-0 pointer-events-none">
                                                            <div style={{ height: (visibleStartRow - 1) * ROW_HEIGHT }} />
                                                        </td>
                                                    </tr>
                                                )}

                                                {/* Rendered Visible Rows Slice */}
                                                {Array.from({ length: visibleEndRow - visibleStartRow + 1 }).map((_, rIdx) => {
                                                    const rowNum = visibleStartRow + rIdx;
                                                    if (!isRowVisible(rowNum)) return null;
                                                    const rowH = rowHeights[rowNum] || ROW_HEIGHT;

                                                    return (
                                                        <tr key={rowNum} className={density === 'compact' ? 'h-5' : 'h-6'} style={{ height: rowH }}>
                                                            {showHeaders && (
                                                                <td 
                                                                    onClick={(e) => handleRowHeaderClick(e, rowNum)}
                                                                    style={{ height: rowH }}
                                                                    className={`w-12 min-w-[48px] max-w-[48px] border text-center font-mono text-[10px] select-none cursor-pointer transition-colors sticky left-0 z-20 relative ${
                                                                        density === 'compact' ? 'h-5 py-0' : 'h-6 py-0.5'
                                                                    } ${
                                                                        selectedRows.has(rowNum)
                                                                            ? 'bg-emerald-600 text-white font-bold ring-1 ring-emerald-400 z-10'
                                                                            : isDark ? 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800' : 'bg-slate-200 border-slate-300 text-slate-600 font-medium hover:bg-slate-300'
                                                                    }`}
                                                                >
                                                                    {rowNum}
                                                                    {/* Interactive Row Resize Handle */}
                                                                    <div
                                                                        onMouseDown={(e) => handleStartRowResize(e, rowNum)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="absolute bottom-0 left-0 w-full h-1.5 cursor-row-resize hover:bg-emerald-500/50 z-20"
                                                                        title={`Drag to resize row ${rowNum}`}
                                                                    />
                                                                </td>
                                                            )}
                                                            {Array.from({ length: colCount }).map((_, cIdx) => {
                                                                const colLetter = colToLetter(cIdx);
                                                                const cellKey = `${colLetter}${rowNum}`;
                                                                const cellData = cells[cellKey] || {};
                                                                if (cellData.isMergedChild) return null;

                                                                const colW = colWidths[colLetter] || 100;

                                                                const isSelected = selectedCell === cellKey;
                                                                const isEditing = editingCell === cellKey;
                                                                const isMultiSelected = multiSelectedCells.has(cellKey);
                                                                const isRowColSelected = selectedRows.has(rowNum) || selectedCols.has(cIdx);

                                                                const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
                                                                const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
                                                                const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
                                                                const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
                                                                const isInRange = cIdx >= minC && cIdx <= maxC && rowNum >= minR && rowNum <= maxR;

                                                                // Selection bounding box outline edges
                                                                const isTopEdge = isInRange && rowNum === minR && (minR !== maxR || minC !== maxC);
                                                                const isBottomEdge = isInRange && rowNum === maxR && (minR !== maxR || minC !== maxC);
                                                                const isLeftEdge = isInRange && cIdx === minC && (minR !== maxR || minC !== maxC);
                                                                const isRightEdge = isInRange && cIdx === maxC && (minR !== maxR || minC !== maxC);

                                                                // Autofill Target Range Preview borders
                                                                const isInFillTarget = isDraggingFillHandle && fillTargetRange &&
                                                                    cIdx >= Math.min(fillTargetRange.startCol, fillTargetRange.endCol) &&
                                                                    cIdx <= Math.max(fillTargetRange.startCol, fillTargetRange.endCol) &&
                                                                    rowNum >= Math.min(fillTargetRange.startRow, fillTargetRange.endRow) &&
                                                                    rowNum <= Math.max(fillTargetRange.startRow, fillTargetRange.endRow);

                                                                // Dynamic Formula Reference Highlights
                                                                const activeFormulaRef = formulaRefs.find(r => 
                                                                    cIdx >= r.startCol && cIdx <= r.endCol && rowNum >= r.startRow && rowNum <= r.endRow
                                                                );

                                                                // Marching ants indicator for clipboard copy/cut
                                                                const isMarchingAnts = marchingAntsRange && 
                                                                    cIdx >= marchingAntsRange.startCol && cIdx <= marchingAntsRange.endCol &&
                                                                    rowNum >= marchingAntsRange.startRow && rowNum <= marchingAntsRange.endRow;

                                                                // Visual highlight if cell is inside active chart range
                                                                const isChartCell = (() => {
                                                                    if (!chartDataRange || !chartDataRange.includes(':')) return false;
                                                                    const [p1, p2] = chartDataRange.split(':');
                                                                    const c1 = parseCellCoord(p1);
                                                                    const c2 = parseCellCoord(p2);
                                                                    if (!c1 || !c2) return false;
                                                                    const cMinC = Math.min(c1.col, c2.col);
                                                                    const cMaxC = Math.max(c1.col, c2.col);
                                                                    const cMinR = Math.min(c1.row, c2.row);
                                                                    const cMaxR = Math.max(c1.row, c2.row);
                                                                    return cIdx >= cMinC && cIdx <= cMaxC && rowNum >= cMinR && rowNum <= cMaxR;
                                                                })();

                                                                const isHighlighted = isSelected || isMultiSelected || isInRange || isRowColSelected;
                                                                const defaultBg = isDark ? '#020617' : '#ffffff';
                                                                const defaultTextColor = isDark ? '#f1f5f9' : '#0f172a';
                                                                const selectionTint = isSelected 
                                                                    ? (isDark ? '#064e3b' : '#d1fae5') 
                                                                    : (isMultiSelected || isRowColSelected)
                                                                    ? (isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.35)')
                                                                    : (isInRange 
                                                                        ? (isDark ? 'rgba(6, 78, 59, 0.4)' : 'rgba(209, 250, 229, 0.65)') 
                                                                        : (isChartCell
                                                                            ? (isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(224, 231, 255, 0.6)')
                                                                            : (activeFormulaRef ? activeFormulaRef.color.bg : defaultBg)));

                                                                const condStyle = getCellCondFormatting(cellKey, cellData.val);
                                                                const finalBg = isHighlighted ? selectionTint : (activeFormulaRef ? activeFormulaRef.color.bg : (condStyle?.bg || cellData.bg || defaultBg));
                                                                const cellColor = cellData.color ? cellData.color : defaultTextColor;
                                                                const finalColor = condStyle?.color || cellColor;
                                                                const wrapClass = cellData.wrap === 'wrap' 
                                                                    ? 'whitespace-normal break-words h-auto' 
                                                                    : cellData.wrap === 'overflow' 
                                                                    ? 'overflow-visible' 
                                                                    : 'truncate';

                                                                // Border style resolution
                                                                let cellBorder = undefined;
                                                                if (activeFormulaRef) {
                                                                    cellBorder = `2px dashed ${activeFormulaRef.color.border}`;
                                                                } else if (isInFillTarget) {
                                                                    cellBorder = '2px dashed #10b981';
                                                                }

                                                                return (
                                                                    <td
                                                                        key={cellKey}
                                                                        id={`cell-${cellKey}`}
                                                                        colSpan={cellData.colSpan || undefined}
                                                                        rowSpan={cellData.rowSpan || undefined}
                                                                        onMouseDown={(e) => {
                                                                            if (e.button !== 0) return;
                                                                            e.preventDefault(); // Stop native drag text selection

                                                                            // 1. If currently selecting range for chart in sidebar
                                                                            if (isSelectingChartRange) {
                                                                                setIsDraggingRange(true);
                                                                                setChartDataRange(`${cellKey}:${cellKey}`);
                                                                                setSelectionRange({ startCol: cIdx, startRow: rowNum, endCol: cIdx, endRow: rowNum });
                                                                                return;
                                                                            }

                                                                            // 2. Interactive formula cell selection if typing formula
                                                                            const isTypingFormula = formulaInput.startsWith('=') && (isFormulaBarFocused || editingCell);
                                                                            if (isTypingFormula && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                                                                                handleFormulaCellClick(cellKey);
                                                                                setIsDraggingRange(true);
                                                                                return;
                                                                            }

                                                                            // 3. Shift + Click: continuous range selection from anchor
                                                                            if (e.shiftKey) {
                                                                                const anchor = selectionAnchor || parseCellCoord(selectedCell) || { col: 0, row: 1 };
                                                                                const end = { col: cIdx, row: rowNum };
                                                                                setSelectionAnchor(anchor);
                                                                                setSelectionEndpoint(end);
                                                                                setSelectionRange({
                                                                                    startCol: anchor.col,
                                                                                    startRow: anchor.row,
                                                                                    endCol: end.col,
                                                                                    endRow: end.row
                                                                                });
                                                                                setIsDraggingRange(true);
                                                                                return;
                                                                            }

                                                                            // 4. Cmd / Ctrl + Click: non-contiguous multi-selection
                                                                            if (e.metaKey || e.ctrlKey) {
                                                                                setMultiSelectedCells(prev => {
                                                                                    const next = new Set(prev);
                                                                                    if (next.has(cellKey)) next.delete(cellKey);
                                                                                    else next.add(cellKey);
                                                                                    return next;
                                                                                });
                                                                                setSelectedCell(cellKey);
                                                                                setSelectionAnchor({ col: cIdx, row: rowNum });
                                                                                setSelectionEndpoint({ col: cIdx, row: rowNum });
                                                                                setFormulaInput(cellData.formula || (cellData.val !== undefined ? String(cellData.val) : ''));
                                                                                return;
                                                                            }

                                                                            // 5. Standard single cell click
                                                                            setIsDraggingRange(true);
                                                                            setSelectedRows(new Set());
                                                                            setSelectedCols(new Set());
                                                                            setSelectedCell(cellKey);
                                                                            setSelectionAnchor({ col: cIdx, row: rowNum });
                                                                            setSelectionEndpoint({ col: cIdx, row: rowNum });
                                                                            setMultiSelectedCells(new Set([cellKey]));
                                                                            setSelectionRange({ startCol: cIdx, startRow: rowNum, endCol: cIdx, endRow: rowNum });
                                                                            setFormulaInput(cellData.formula || (cellData.val !== undefined ? String(cellData.val) : ''));
                                                                            setEditingCell(null);
                                                                        }}
                                                                        onMouseEnter={() => {
                                                                            // 1. If dragging autofill handle
                                                                            if (isDraggingFillHandle && fillSourceRange) {
                                                                                setFillTargetRange({
                                                                                    startCol: fillSourceRange.startCol,
                                                                                    startRow: fillSourceRange.startRow,
                                                                                    endCol: cIdx,
                                                                                    endRow: rowNum
                                                                                });
                                                                                return;
                                                                            }

                                                                            // 2. If typing formula and dragging across cells to form a range reference
                                                                            const isTypingFormula = formulaInput.startsWith('=') && (isFormulaBarFocused || editingCell);
                                                                            if (isTypingFormula && isDraggingRange) {
                                                                                handleFormulaRangeDrag(cellKey);
                                                                                return;
                                                                            }

                                                                            // 3. If dragging to expand selection range
                                                                            if (isDraggingRange) {
                                                                                const anchor = selectionAnchor || { col: selectionRange.startCol, row: selectionRange.startRow };
                                                                                setSelectionEndpoint({ col: cIdx, row: rowNum });
                                                                                setSelectionRange({
                                                                                    startCol: anchor.col,
                                                                                    startRow: anchor.row,
                                                                                    endCol: cIdx,
                                                                                    endRow: rowNum
                                                                                });
                                                                                if (isSelectingChartRange) {
                                                                                    const cMinC = Math.min(anchor.col, cIdx);
                                                                                    const cMaxC = Math.max(anchor.col, cIdx);
                                                                                    const cMinR = Math.min(anchor.row, rowNum);
                                                                                    const cMaxR = Math.max(anchor.row, rowNum);
                                                                                    setChartDataRange(`${colToLetter(cMinC)}${cMinR}:${colToLetter(cMaxC)}${cMaxR}`);
                                                                                }
                                                                            }
                                                                        }}
                                                                        onDoubleClick={() => setEditingCell(cellKey)}
                                                                        onContextMenu={(e) => handleCellContextMenu(e, cellKey, rowNum, cIdx)}
                                                                        className={`px-2 relative truncate cursor-cell transition-colors select-none ${
                                                                            density === 'compact' ? 'h-5 py-0 text-[11px]' : 'h-6 py-0.5 text-xs'
                                                                        } ${
                                                                            freezeCol && cIdx === 0 ? 'sticky left-12 z-10' : ''
                                                                        } ${
                                                                            !activeFormulaRef && !isInFillTarget && showGridlines 
                                                                                ? (isDark ? 'border border-slate-800/80' : 'border border-slate-200/90') 
                                                                                : ''
                                                                        } ${
                                                                            isMarchingAnts
                                                                                ? 'ring-2 ring-emerald-500 border-dashed border-emerald-400 z-20 animate-pulse'
                                                                                : isSelected
                                                                                ? 'border-2 border-emerald-600 dark:border-emerald-400 z-20 overflow-visible'
                                                                                : isMultiSelected || isRowColSelected
                                                                                ? 'ring-2 ring-emerald-400/80 border-emerald-500/80 z-10'
                                                                                : isChartCell
                                                                                ? 'ring-1 ring-indigo-500 border-dashed border-indigo-400 z-10'
                                                                                : (isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50')
                                                                        } ${
                                                                            !activeFormulaRef && !isInFillTarget && isTopEdge ? 'border-t-2 border-emerald-600 dark:border-emerald-400' : ''
                                                                        } ${
                                                                            !activeFormulaRef && !isInFillTarget && isBottomEdge ? 'border-b-2 border-emerald-600 dark:border-emerald-400' : ''
                                                                        } ${
                                                                            !activeFormulaRef && !isInFillTarget && isLeftEdge ? 'border-l-2 border-emerald-600 dark:border-emerald-400' : ''
                                                                        } ${
                                                                            !activeFormulaRef && !isInFillTarget && isRightEdge ? 'border-r-2 border-emerald-600 dark:border-emerald-400' : ''
                                                                        }`}
                                                                        style={{
                                                                            width: colW,
                                                                            minWidth: colW,
                                                                            maxWidth: colW,
                                                                            height: rowH,
                                                                            backgroundColor: finalBg,
                                                                            fontWeight: cellData.bold ? 'bold' : 'normal',
                                                                            fontStyle: cellData.italic ? 'italic' : 'normal',
                                                                            textAlign: cellData.align || (!isNaN(Number(cellData.val)) && cellData.val !== '' ? 'right' : 'left'),
                                                                            color: finalColor,
                                                                            border: cellBorder,
                                                                            borderTop: !cellBorder ? (cellData.borders?.top || (cellData.borderStyle && cellData.borderStyle !== 'none' && cellData.borderStyle !== 'bottom' ? cellData.borderStyle : undefined)) : undefined,
                                                                            borderBottom: !cellBorder ? (cellData.borders?.bottom || (cellData.borderStyle === 'bottom' ? '2px solid #10b981' : (cellData.borderStyle && cellData.borderStyle !== 'none' ? cellData.borderStyle : undefined))) : undefined,
                                                                            borderLeft: !cellBorder ? (cellData.borders?.left || (cellData.borderStyle && cellData.borderStyle !== 'none' && cellData.borderStyle !== 'bottom' ? cellData.borderStyle : undefined)) : undefined,
                                                                            borderRight: !cellBorder ? (cellData.borders?.right || (cellData.borderStyle && cellData.borderStyle !== 'none' && cellData.borderStyle !== 'bottom' ? cellData.borderStyle : undefined)) : undefined
                                                                        }}
                                                                    >
                                                                        {/* Excel-style Autofill Corner Handle Dot */}
                                                                        {cIdx === maxC && rowNum === maxR && !isEditing && (
                                                                            <div
                                                                                onMouseDown={handleStartFillHandleDrag}
                                                                                className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-600 dark:bg-emerald-400 border border-white dark:border-slate-900 rounded-[1px] cursor-crosshair z-30 pointer-events-auto shadow-xs"
                                                                                title="Autofill handle"
                                                                            />
                                                                        )}

                                                                        {isEditing ? (
                                                                            <div className="absolute inset-0 w-full h-full z-30">
                                                                                <input
                                                                                    type="text"
                                                                                    autoFocus
                                                                                    value={formulaInput}
                                                                                    onChange={(e) => handleFormulaInputChange(e.target.value)}
                                                                                    onBlur={() => {
                                                                                        setTimeout(() => {
                                                                                            updateCell(cellKey, {
                                                                                                val: formulaInput.startsWith('=') ? evaluateFormula(formulaInput, cells) : formulaInput,
                                                                                                formula: formulaInput.startsWith('=') ? formulaInput : null
                                                                                            });
                                                                                            setEditingCell(null);
                                                                                            setFormulaSuggestions([]);
                                                                                        }, 150);
                                                                                    }}
                                                                                    onKeyDown={(e) => {
                                                                                        if (formulaSuggestions.length > 0) {
                                                                                            if (e.key === 'ArrowDown') {
                                                                                                e.preventDefault();
                                                                                                setActiveSuggestionIdx(prev => (prev + 1) % formulaSuggestions.length);
                                                                                                return;
                                                                                            } else if (e.key === 'ArrowUp') {
                                                                                                e.preventDefault();
                                                                                                setActiveSuggestionIdx(prev => (prev - 1 + formulaSuggestions.length) % formulaSuggestions.length);
                                                                                                return;
                                                                                            } else if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                                                                                                e.preventDefault();
                                                                                                handleSelectFormulaSuggestion(formulaSuggestions[activeSuggestionIdx]);
                                                                                                return;
                                                                                            } else if (e.key === 'Escape') {
                                                                                                e.preventDefault();
                                                                                                setFormulaSuggestions([]);
                                                                                                return;
                                                                                            }
                                                                                        }
                                                                                        if (e.key === 'Enter') {
                                                                                            e.preventDefault();
                                                                                            updateCell(cellKey, {
                                                                                                val: formulaInput.startsWith('=') ? evaluateFormula(formulaInput, cells) : formulaInput,
                                                                                                formula: formulaInput.startsWith('=') ? formulaInput : null
                                                                                            });
                                                                                            setEditingCell(null);
                                                                                            setFormulaSuggestions([]);
                                                                                            const cur = parseCellCoord(cellKey);
                                                                                            if (cur && cur.row < rowCount) {
                                                                                                const nextKey = `${colToLetter(cur.col)}${cur.row + 1}`;
                                                                                                setSelectedCell(nextKey);
                                                                                                setSelectionAnchor({ col: cur.col, row: cur.row + 1 });
                                                                                                setSelectionEndpoint({ col: cur.col, row: cur.row + 1 });
                                                                                                setSelectionRange({ startCol: cur.col, startRow: cur.row + 1, endCol: cur.col, endRow: cur.row + 1 });
                                                                                            }
                                                                                        } else if (e.key === 'Tab') {
                                                                                            e.preventDefault();
                                                                                            updateCell(cellKey, {
                                                                                                val: formulaInput.startsWith('=') ? evaluateFormula(formulaInput, cells) : formulaInput,
                                                                                                formula: formulaInput.startsWith('=') ? formulaInput : null
                                                                                            });
                                                                                            setEditingCell(null);
                                                                                            setFormulaSuggestions([]);
                                                                                            const cur = parseCellCoord(cellKey);
                                                                                            if (cur && cur.col < colCount - 1) {
                                                                                                const nextKey = `${colToLetter(cur.col + 1)}${cur.row}`;
                                                                                                setSelectedCell(nextKey);
                                                                                                setSelectionAnchor({ col: cur.col + 1, row: cur.row });
                                                                                                setSelectionEndpoint({ col: cur.col + 1, row: cur.row });
                                                                                                setSelectionRange({ startCol: cur.col + 1, startRow: cur.row, endCol: cur.col + 1, endRow: cur.row });
                                                                                            }
                                                                                        } else if (e.key === 'Escape') {
                                                                                            setEditingCell(null);
                                                                                            setFormulaSuggestions([]);
                                                                                        }
                                                                                    }}
                                                                                    className={`w-full h-full font-mono text-xs px-2 outline-none shadow-md ${
                                                                                        isDark ? 'bg-slate-900 text-white border-2 border-emerald-500' : 'bg-white text-slate-900 border-2 border-emerald-600'
                                                                                    }`}
                                                                                />
                                                                            </div>
                                                                        ) : cellData.checkbox ? (
                                                                            <div className="flex items-center justify-center h-full">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={Boolean(cellData.val === true || cellData.val === 'TRUE' || cellData.val === 1)}
                                                                                    onChange={(e) => updateCell(cellKey, { val: e.target.checked })}
                                                                                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                                                />
                                                                            </div>
                                                                        ) : cellData.validationList && cellData.validationList.length > 0 ? (
                                                                            <div className="flex items-center justify-between w-full relative">
                                                                                <span className={wrapClass}>{cellData.val || '(Select)'}</span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setOpenValidationCell(openValidationCell === cellKey ? null : cellKey);
                                                                                    }}
                                                                                    className="p-0.5 rounded hover:bg-slate-500/20 text-slate-400"
                                                                                    title="Choose option"
                                                                                >
                                                                                    <ChevronDown size={11} />
                                                                                </button>
                                                                                {openValidationCell === cellKey && (
                                                                                    <div 
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        className={`absolute top-full left-0 mt-1 min-w-[120px] rounded-lg border shadow-xl py-1 z-50 text-xs ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                                                                    >
                                                                                        {cellData.validationList.map(opt => (
                                                                                            <button
                                                                                                key={opt}
                                                                                                type="button"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    updateCell(cellKey, { val: opt });
                                                                                                    setOpenValidationCell(null);
                                                                                                }}
                                                                                                className={`w-full text-left px-2.5 py-1 text-[11px] transition ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                                                                                            >
                                                                                                {opt}
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className={`flex items-center gap-1 ${wrapClass}`}>
                                                                                {cellData.imageUrl && (
                                                                                    <img src={cellData.imageUrl} alt="item" className="w-4 h-4 rounded object-cover inline-block shrink-0" />
                                                                                )}
                                                                                {cellData.shape && (
                                                                                    <span className="px-1 py-0 rounded text-[9px] bg-amber-400/30 text-amber-500 font-bold uppercase shrink-0">
                                                                                        {cellData.shape}
                                                                                    </span>
                                                                                )}
                                                                                <span className={wrapClass}>{cellData.displayVal !== undefined ? cellData.displayVal : (cellData.val !== undefined ? String(cellData.val) : '')}</span>
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}

                                                {/* Bottom Virtual Spacer Row with explicit height container */}
                                                {visibleEndRow < rowCount && (
                                                    <tr style={{ height: (rowCount - visibleEndRow) * ROW_HEIGHT }}>
                                                        <td colSpan={colCount + (showHeaders ? 1 : 0)} className="p-0 border-0 pointer-events-none">
                                                            <div style={{ height: (rowCount - visibleEndRow) * ROW_HEIGHT }} />
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })()}
                                </tbody>
                            </table>

                            {/* Refined Minimalistic Formula Autocomplete Floating Overlay with Hover Descriptions */}
                            {formulaSuggestions.length > 0 && (() => {
                                let top = 100;
                                let left = 100;
                                if (typeof document !== 'undefined') {
                                    let targetEl = null;
                                    if (isFormulaBarFocused && !editingCell) {
                                        targetEl = document.getElementById('spreadsheet-formula-bar');
                                    } else {
                                        const targetId = editingCell || selectedCell;
                                        targetEl = document.getElementById(`cell-${targetId}`);
                                    }
                                    if (targetEl) {
                                        const rect = targetEl.getBoundingClientRect();
                                        if (rect.bottom + 240 > window.innerHeight) {
                                            top = Math.max(10, rect.top - 230);
                                        } else {
                                            top = rect.bottom + 4;
                                        }
                                        left = Math.max(10, Math.min(rect.left, window.innerWidth - 480));
                                    }
                                }

                                const displayedDetailItem = hoveredSuggestionIdx !== null && formulaSuggestions[hoveredSuggestionIdx]
                                    ? formulaSuggestions[hoveredSuggestionIdx]
                                    : formulaSuggestions[activeSuggestionIdx] || formulaSuggestions[0];

                                return (
                                    <div
                                        style={{ position: 'fixed', top, left }}
                                        className="flex items-start gap-2 z-[200] pointer-events-auto"
                                        onMouseDown={(e) => e.preventDefault()}
                                    >
                                        {/* Minimalist Function Selector List */}
                                        <div
                                            className={`w-52 max-h-56 overflow-y-auto rounded-xl border shadow-2xl p-1 text-xs select-none backdrop-blur-md ${
                                                isDark ? 'bg-slate-900/95 border-slate-700/80 text-white shadow-black/90' : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-400/50'
                                            }`}
                                        >
                                            <div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/30 flex justify-between">
                                                <span>Function</span>
                                                <span>Tab / ↵</span>
                                            </div>
                                            <div className="py-0.5 flex flex-col gap-0.5">
                                                {formulaSuggestions.map((item, idx) => {
                                                    const isSelected = activeSuggestionIdx === idx;
                                                    const isHovered = hoveredSuggestionIdx === idx;
                                                    return (
                                                        <button
                                                            key={item.name}
                                                            type="button"
                                                            onMouseEnter={() => setHoveredSuggestionIdx(idx)}
                                                            onMouseLeave={() => setHoveredSuggestionIdx(null)}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                handleSelectFormulaSuggestion(item);
                                                            }}
                                                            className={`w-full text-left px-2 py-1 rounded-lg flex items-center justify-between font-mono text-xs transition ${
                                                                isSelected
                                                                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                                                    : isHovered
                                                                        ? (isDark ? 'bg-slate-800 text-slate-100 font-semibold' : 'bg-slate-100 text-slate-900 font-semibold')
                                                                        : (isDark ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-slate-50')
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-1.5 min-w-0 truncate">
                                                                <span className={`text-[10px] px-1 py-0.2 rounded font-sans font-bold ${
                                                                    isSelected ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-500'
                                                                }`}>fx</span>
                                                                <span className="truncate">{item.name}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Minimalist Hover / Active Detail Description Card */}
                                        {displayedDetailItem && (
                                            <div
                                                className={`w-64 p-3 rounded-xl border shadow-xl text-xs flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md ${
                                                    isDark ? 'bg-slate-900/95 border-slate-700 text-slate-200 shadow-black/80' : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/80'
                                                }`}
                                            >
                                                <div className="flex items-center gap-1.5 border-b pb-1.5 border-slate-500/20">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-bold font-mono">fx</span>
                                                    <span className="font-mono font-bold text-emerald-500 text-xs">{displayedDetailItem.name}</span>
                                                </div>
                                                <div className="font-mono text-[11px] text-slate-400 font-semibold break-all">
                                                    {displayedDetailItem.syntax}
                                                </div>
                                                <div className="text-[11px] leading-relaxed text-slate-300 dark:text-slate-300">
                                                    {displayedDetailItem.desc}
                                                </div>
                                                <div className="text-[9px] text-slate-400 italic pt-1 border-t border-slate-500/10">
                                                    Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[9px] border border-slate-700">Tab</kbd> or <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[9px] border border-slate-700">Enter</kbd> to insert
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Bottom Sheet Tabs Bar & Status Bar */}
                    <footer className={`border-t px-3 py-1.5 flex items-center justify-between text-xs shrink-0 select-none relative ${
                        isDark ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-200/90 text-slate-700'
                    }`}>
                        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                            {/* 1. All Sheets Search & Quick Switcher Dropup Navigator */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowAllSheetsMenu(!showAllSheetsMenu)}
                                    className={`px-2 py-1 rounded-lg font-medium transition flex items-center gap-1 text-[11px] border ${
                                        showAllSheetsMenu
                                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                                            : isDark ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                                    }`}
                                    title="View All Sheets & Search"
                                >
                                    <ListFilter size={13} />
                                    <span className="hidden sm:inline">Sheets ({sheets.length})</span>
                                    <ChevronUp size={11} className={showAllSheetsMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
                                </button>

                                 {showAllSheetsMenu && (
                                    <div className={`absolute left-0 bottom-full mb-2 w-64 rounded-xl border shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                    }`}>
                                        <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-slate-700/40">
                                            <Search size={13} className="text-emerald-500 shrink-0" />
                                            <input
                                                type="text"
                                                autoFocus
                                                value={sheetSearchQuery}
                                                onChange={(e) => setSheetSearchQuery(e.target.value)}
                                                placeholder="Search sheets by name..."
                                                className={`w-full text-xs px-2 py-1 rounded outline-none border ${
                                                    isDark ? 'bg-slate-950 border-slate-700 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600'
                                                }`}
                                            />
                                        </div>

                                        <div className="max-h-52 overflow-y-auto space-y-0.5">
                                            {filteredSheets.length === 0 ? (
                                                <div className="p-2 text-center text-slate-400 text-[11px]">
                                                    No sheets matching "{sheetSearchQuery}"
                                                </div>
                                            ) : (
                                                filteredSheets.map((s) => (
                                                    <div
                                                        key={s.originalIdx}
                                                        className={`w-full px-2 py-1 rounded-lg flex items-center justify-between text-xs transition ${
                                                            activeSheetIndex === s.originalIdx
                                                                ? 'bg-emerald-600 text-white font-bold'
                                                                : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                                                        }`}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (s.hidden) {
                                                                    handleUnhideSheet(s.originalIdx);
                                                                } else {
                                                                    setActiveSheetIndex(s.originalIdx);
                                                                }
                                                                setShowAllSheetsMenu(false);
                                                                setSheetSearchQuery('');
                                                            }}
                                                            className="flex items-center gap-2 truncate text-left flex-1"
                                                        >
                                                            {s.tabColor ? (
                                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.tabColor }} />
                                                            ) : (
                                                                <span className="w-2.5 h-2.5 rounded-full border border-slate-400 shrink-0" />
                                                            )}
                                                            <span className="truncate">{s.name}</span>
                                                            {s.hidden && (
                                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-semibold uppercase">
                                                                    Hidden
                                                                </span>
                                                            )}
                                                        </button>

                                                        {s.hidden ? (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUnhideSheet(s.originalIdx);
                                                                }}
                                                                className="text-[10px] text-emerald-400 hover:underline px-1"
                                                                title="Unhide this sheet"
                                                            >
                                                                Unhide
                                                            </button>
                                                        ) : (
                                                            activeSheetIndex === s.originalIdx && <Check size={13} className="shrink-0" />
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="mt-2 pt-1.5 border-t border-slate-700/40 flex justify-between">
                                            <button
                                                type="button"
                                                onClick={() => { handleAddSheet(); setShowAllSheetsMenu(false); }}
                                                className="text-[11px] text-emerald-500 hover:underline flex items-center gap-1 font-semibold"
                                            >
                                                <Plus size={12} /> Add New Sheet
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 2. Draggable Sheet Tabs with Full Context Menu (Right Click & Chevron) */}
                            {sheets.map((sh, idx) => {
                                if (sh.hidden) return null;
                                return (
                                    <div
                                        key={idx}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('text/plain', String(idx));
                                            setDraggedSheetIndex(idx);
                                        }}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            handleReorderSheets(draggedSheetIndex, idx);
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setActiveTabMenuIndex(activeTabMenuIndex === idx ? null : idx);
                                        }}
                                        className={`relative group flex items-center rounded-t-lg transition border-t border-x ${
                                            draggedSheetIndex === idx ? 'opacity-40' : ''
                                        } ${
                                            activeSheetIndex === idx
                                                ? (isDark ? 'bg-slate-950 text-emerald-400 border-emerald-500 font-bold' : 'bg-white text-emerald-700 border-slate-300 font-bold shadow-xs')
                                                : (isDark ? 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-300/70')
                                        }`}
                                        style={{
                                            borderBottom: sh.tabColor ? `3px solid ${sh.tabColor}` : undefined
                                        }}
                                    >
                                        {/* Drag Handle Grip */}
                                        <div className="pl-1.5 cursor-grab active:cursor-grabbing opacity-30 group-hover:opacity-80">
                                            <GripVertical size={11} />
                                        </div>

                                        {/* Tab Name Click to Switch */}
                                        <button
                                            type="button"
                                            onClick={() => setActiveSheetIndex(idx)}
                                            onDoubleClick={() => setSheetModal({ open: true, index: idx, name: sh.name })}
                                            className="py-1 px-1.5 font-medium flex items-center gap-1 text-xs"
                                            title="Click to activate, Double-click to rename, Right-click for options"
                                        >
                                            <span>{sh.name}</span>
                                        </button>

                                        {/* Inline Actions Dropup Trigger Button */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveTabMenuIndex(activeTabMenuIndex === idx ? null : idx);
                                            }}
                                            className={`p-1 mr-1 rounded hover:bg-slate-500/20 text-slate-400 hover:text-emerald-400 transition ${
                                                activeTabMenuIndex === idx ? 'text-emerald-500' : ''
                                            }`}
                                            title="Sheet options (Rename, Duplicate, Insert, Move, Hide, Color, Delete)"
                                        >
                                            <ChevronUp size={11} className={activeTabMenuIndex === idx ? 'rotate-180 transition-transform' : 'transition-transform'} />
                                        </button>

                                        {/* Full Context Dropup Menu for Worksheet Tab */}
                                        {activeTabMenuIndex === idx && (
                                            <div
                                                className={`absolute left-0 bottom-full mb-2 w-56 rounded-xl border shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                                                    isDark ? 'bg-slate-900 border-slate-700 text-white shadow-black/80' : 'bg-white border-slate-300 text-slate-900 shadow-slate-300/80'
                                                }`}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/40">
                                                    {sh.name} Actions
                                                </div>
                                                
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveTabMenuIndex(null);
                                                        setSheetModal({ open: true, index: idx, name: sh.name });
                                                    }}
                                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 ${
                                                        isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <span>✏️ Rename Sheet</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveTabMenuIndex(null);
                                                        handleDuplicateSheet(idx);
                                                    }}
                                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 ${
                                                        isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <span>📋 Duplicate Sheet</span>
                                                </button>

                                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                                                {/* Insert Sheet Before / After */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveTabMenuIndex(null);
                                                        handleInsertSheet(idx, 'before');
                                                    }}
                                                    className={`w-full text-left px-2.5 py-1 rounded-lg flex items-center gap-2 ${
                                                        isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <span>➕ Insert Sheet Before</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveTabMenuIndex(null);
                                                        handleInsertSheet(idx, 'after');
                                                    }}
                                                    className={`w-full text-left px-2.5 py-1 rounded-lg flex items-center gap-2 ${
                                                        isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <span>➕ Insert Sheet After</span>
                                                </button>

                                                <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                                                {/* Move Sheet Options */}
                                                {idx > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveTabMenuIndex(null);
                                                            handleMoveSheet(idx, idx - 1);
                                                        }}
                                                        className={`w-full text-left px-2.5 py-1 rounded-lg flex items-center gap-2 ${
                                                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        <span>⬅️ Move Left</span>
                                                    </button>
                                                )}
                                                {idx < sheets.length - 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveTabMenuIndex(null);
                                                            handleMoveSheet(idx, idx + 1);
                                                        }}
                                                        className={`w-full text-left px-2.5 py-1 rounded-lg flex items-center gap-2 ${
                                                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        <span>➡️ Move Right</span>
                                                    </button>
                                                )}
                                                {idx > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveTabMenuIndex(null);
                                                            handleMoveSheet(idx, 0);
                                                        }}
                                                        className={`w-full text-left px-2.5 py-1 rounded-lg flex items-center gap-2 ${
                                                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        <span>⏮️ Move to Beginning</span>
                                                    </button>
                                                )}
                                                {idx < sheets.length - 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveTabMenuIndex(null);
                                                            handleMoveSheet(idx, sheets.length - 1);
                                                        }}
                                                        className={`w-full text-left px-2.5 py-1 rounded-lg flex items-center gap-2 ${
                                                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        <span>⏭️ Move to End</span>
                                                    </button>
                                                )}

                                                {/* Tab Color Sub-Palette */}
                                                <div className={`my-1 py-1 px-2 border-y ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                                    <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                                                        <Palette size={11} />
                                                        <span>Tab Color</span>
                                                    </div>
                                                    <div className="grid grid-cols-5 gap-1.5">
                                                        {TAB_COLORS.map(c => (
                                                            <button
                                                                key={c.name}
                                                                type="button"
                                                                onClick={() => handleSetTabColor(idx, c.value)}
                                                                className={`w-5 h-5 rounded-full border transition ${
                                                                    sh.tabColor === c.value ? 'ring-2 ring-emerald-500 scale-110' : 'border-slate-600'
                                                                }`}
                                                                style={{ backgroundColor: c.value || '#cbd5e1' }}
                                                                title={c.name}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Hide Sheet */}
                                                {sheets.filter(s => !s.hidden).length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveTabMenuIndex(null);
                                                            handleHideSheet(idx);
                                                        }}
                                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 ${
                                                            isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                                                        }`}
                                                    >
                                                        <span>👁️ Hide Sheet</span>
                                                    </button>
                                                )}

                                                {/* Delete Sheet */}
                                                {sheets.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveTabMenuIndex(null);
                                                            handleDeleteSheet(idx);
                                                        }}
                                                        className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-rose-500 hover:bg-rose-500/10"
                                                    >
                                                        <span>🗑️ Delete Sheet</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* 3. Add New Sheet Button */}
                            <button
                                type="button"
                                onClick={handleAddSheet}
                                className={`p-1.5 rounded-lg transition border ${
                                    isDark ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-white' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                                }`}
                                title="Add New Worksheet Tab"
                            >
                                <Plus size={14} />
                            </button>
                        </div>

                        {/* Status Bar Aggregations, Zoom, & View Mode Controls */}
                        <div className="flex items-center gap-3 font-mono text-[11px]">
                            {selectedStats && (
                                <div className={`hidden sm:flex items-center gap-2 px-2.5 py-0.5 rounded-full border ${
                                    isDark ? 'bg-slate-800/80 border-slate-700/80 text-emerald-300' : 'bg-white border-slate-300 text-emerald-800 shadow-xs'
                                }`}>
                                    <span>Count: <strong>{selectedStats.count}</strong></span>
                                    {selectedStats.numCount > 0 && (
                                        <>
                                            <span>•</span>
                                            <span>Sum: <strong className={isDark ? 'text-white' : 'text-slate-900'}>₹{selectedStats.sum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></span>
                                            <span>•</span>
                                            <span>Avg: <strong className={isDark ? 'text-white' : 'text-slate-900'}>₹{selectedStats.avg.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></span>
                                            <span>•</span>
                                            <span>Min: {selectedStats.min}</span>
                                            <span>•</span>
                                            <span>Max: {selectedStats.max}</span>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Zoom Controls */}
                            <div className={`flex items-center rounded border px-1 ${
                                isDark ? 'bg-slate-800/90 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700 shadow-xs'
                            }`}>
                                <button
                                    type="button"
                                    onClick={() => setZoomLevel(prev => Math.max(50, prev - 25))}
                                    className="px-1.5 py-0.5 font-bold hover:text-emerald-500"
                                    title="Zoom Out (Ctrl -)"
                                >
                                    -
                                </button>
                                <span 
                                    className="px-1 text-[10px] cursor-pointer"
                                    onClick={() => setZoomLevel(100)}
                                    title="Click to reset zoom to 100%"
                                >
                                    {zoomLevel}%
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setZoomLevel(prev => Math.min(200, prev + 25))}
                                    className="px-1.5 py-0.5 font-bold hover:text-emerald-500"
                                    title="Zoom In (Ctrl +)"
                                >
                                    +
                                </button>
                            </div>

                            {/* Density Mode */}
                            <button
                                type="button"
                                onClick={() => setDensity(prev => prev === 'compact' ? 'comfortable' : 'compact')}
                                className={`px-2 py-0.5 rounded border transition ${
                                    isDark ? 'bg-slate-800/90 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 shadow-xs'
                                }`}
                                title="Toggle Grid Density (Compact / Comfortable)"
                            >
                                {density === 'compact' ? 'Compact' : 'Comfortable'}
                            </button>

                            {/* Fullscreen Toggle */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (typeof document !== 'undefined') {
                                        if (!document.fullscreenElement) {
                                            document.documentElement.requestFullscreen?.();
                                            setIsFullscreen(true);
                                        } else {
                                            if (document.exitFullscreen) document.exitFullscreen();
                                            setIsFullscreen(false);
                                        }
                                    }
                                }}
                                className={`p-1 rounded border transition ${
                                    isDark ? 'bg-slate-800/90 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 shadow-xs'
                                }`}
                                title="Toggle Fullscreen"
                            >
                                <Maximize2 size={12} />
                            </button>
                        </div>
                    </footer>
                </main>

                {/* 3. Right-Side Collapsible Chart Configuration Inspector Panel */}
                {showChartInspector && (
                    <aside className={`w-88 border-l flex flex-col shrink-0 z-30 shadow-2xl animate-in slide-in-from-right duration-200 ${
                        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}>
                        {/* Inspector Header */}
                        <div className={`p-3 border-b flex items-center justify-between ${
                            isDark ? 'border-slate-800' : 'border-slate-200'
                        }`}>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                    <BarChart3 size={14} />
                                </div>
                                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    Chart Inspector
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowChartInspector(false)}
                                className={`p-1 rounded transition ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                                title="Close Inspector"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Inspector Tab Switcher: Setup vs Customize */}
                        <div className={`flex border-b text-xs font-semibold ${
                            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
                        }`}>
                            <button
                                type="button"
                                onClick={() => setInspectorTab('setup')}
                                className={`flex-1 py-2 text-center transition border-b-2 ${
                                    inspectorTab === 'setup'
                                        ? 'border-emerald-500 text-emerald-500 font-bold'
                                        : (isDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-900')
                                }`}
                            >
                                Setup
                            </button>
                            <button
                                type="button"
                                onClick={() => setInspectorTab('customize')}
                                className={`flex-1 py-2 text-center transition border-b-2 ${
                                    inspectorTab === 'customize'
                                        ? 'border-emerald-500 text-emerald-500 font-bold'
                                        : (isDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-900')
                                }`}
                            >
                                Customize
                            </button>
                        </div>

                        {/* Inspector Body Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                            {inspectorTab === 'setup' ? (
                                <>
                                    {/* Chart Type Selector */}
                                    <div>
                                        <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                            Chart Type
                                        </label>
                                        <select
                                            value={chartType}
                                            onChange={(e) => setChartType(e.target.value)}
                                            className={`w-full border rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500 ${
                                                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                            }`}
                                        >
                                            <option value="bar">Bar / Column Chart</option>
                                            <option value="line">Line Graph</option>
                                            <option value="area">Area Chart</option>
                                            <option value="pie">Pie / Donut Chart</option>
                                        </select>
                                    </div>

                                    {/* Data Range Input & Interactive Grid Selection */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                Data Range
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleApplyChartRangeFromSelection}
                                                    className="text-[10px] text-emerald-500 hover:underline font-semibold"
                                                    title="Use currently highlighted spreadsheet cells"
                                                >
                                                    Use Active Selection
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setChartDataRange('A1:C4')}
                                                    className="text-[10px] text-slate-400 hover:underline"
                                                >
                                                    Reset
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="text"
                                                value={chartDataRange}
                                                onChange={(e) => setChartDataRange(e.target.value)}
                                                placeholder="e.g. A1:C4"
                                                className={`flex-1 border rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-emerald-500 ${
                                                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = !isSelectingChartRange;
                                                    setIsSelectingChartRange(next);
                                                    if (next) {
                                                        toast.success('Drag or click cells on sheet to select chart data range');
                                                    }
                                                }}
                                                className={`px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 border transition ${
                                                    isSelectingChartRange
                                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md animate-pulse'
                                                        : isDark ? 'bg-slate-800 text-indigo-400 border-slate-700 hover:bg-slate-700' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                                }`}
                                                title="Interactive grid range picker: click and drag across spreadsheet cells"
                                            >
                                                <Table size={13} />
                                                <span>{isSelectingChartRange ? 'Done' : 'Pick [::]'}</span>
                                            </button>
                                        </div>

                                        <div className="mt-2 space-y-1.5 text-[11px] text-slate-400">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={chartUseRowHeaders}
                                                    onChange={(e) => setChartUseRowHeaders(e.target.checked)}
                                                    className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                                                />
                                                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>First row contains series headers</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={chartUseColLabels}
                                                    onChange={(e) => setChartUseColLabels(e.target.checked)}
                                                    className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                                                />
                                                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>First column contains categories / labels</span>
                                            </label>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Chart Title */}
                                    <div>
                                        <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                            Chart Title
                                        </label>
                                        <input
                                            type="text"
                                            value={chartTitle}
                                            onChange={(e) => setChartTitle(e.target.value)}
                                            placeholder="Enter Chart Title..."
                                            className={`w-full border rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500 ${
                                                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                            }`}
                                        />
                                    </div>

                                    {/* Color Palette Selector */}
                                    <div>
                                        <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                            Color Palette
                                        </label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {Object.keys(PALETTES).map(pal => (
                                                <button
                                                    key={pal}
                                                    type="button"
                                                    onClick={() => setChartPalette(pal)}
                                                    className={`h-7 rounded-lg border p-1 flex items-center justify-center transition ${
                                                        chartPalette === pal ? 'border-emerald-500 ring-2 ring-emerald-500' : 'border-slate-700'
                                                    }`}
                                                    style={{ backgroundColor: PALETTES[pal][0] }}
                                                    title={pal}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Legend Position */}
                                    <div>
                                        <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                            Legend Position
                                        </label>
                                        <select
                                            value={legendPos}
                                            onChange={(e) => setLegendPos(e.target.value)}
                                            className={`w-full border rounded-lg p-2 text-xs focus:outline-none ${
                                                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                            }`}
                                        >
                                            <option value="top">Top</option>
                                            <option value="bottom">Bottom</option>
                                            <option value="right">Right</option>
                                            <option value="none">Hidden</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Live Chart Preview Card */}
                            <div className={`mt-4 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                <h4 className={`text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center justify-between ${
                                    isDark ? 'text-slate-300' : 'text-slate-700'
                                }`}>
                                    <span>Live Preview</span>
                                    <span className="text-[10px] font-mono text-emerald-500">{chartRenderData.length} records</span>
                                </h4>
                                <div className={`h-60 border rounded-xl p-2 flex flex-col justify-between overflow-hidden shadow-inner ${
                                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                                }`}>
                                    <span className={`text-center font-bold text-xs truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                        {chartTitle}
                                    </span>
                                    {chartRenderData.length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center text-slate-400 text-[11px]">
                                            Invalid range or empty data
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="88%">
                                            {chartType === 'line' ? (
                                                <LineChart data={chartRenderData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#cbd5e1'} />
                                                    <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} tick={{ fontSize: 10 }} />
                                                    <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} tick={{ fontSize: 10 }} />
                                                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1', fontSize: '11px', color: isDark ? '#ffffff' : '#000000' }} />
                                                    {legendPos !== 'none' && <Legend />}
                                                    {Object.keys(chartRenderData[0] || {})
                                                        .filter(k => k !== 'name')
                                                        .map((key, i) => (
                                                            <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2} />
                                                        ))}
                                                </LineChart>
                                            ) : chartType === 'area' ? (
                                                <AreaChart data={chartRenderData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#cbd5e1'} />
                                                    <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} tick={{ fontSize: 10 }} />
                                                    <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} tick={{ fontSize: 10 }} />
                                                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1', fontSize: '11px', color: isDark ? '#ffffff' : '#000000' }} />
                                                    {legendPos !== 'none' && <Legend />}
                                                    {Object.keys(chartRenderData[0] || {})
                                                        .filter(k => k !== 'name')
                                                        .map((key, i) => (
                                                            <Area key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.3} />
                                                        ))}
                                                </AreaChart>
                                            ) : chartType === 'pie' ? (
                                                <PieChart>
                                                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1', fontSize: '11px', color: isDark ? '#ffffff' : '#000000' }} />
                                                    {legendPos !== 'none' && <Legend />}
                                                    <Pie
                                                        data={chartRenderData}
                                                        dataKey={Object.keys(chartRenderData[0] || {}).find(k => k !== 'name') || 'val'}
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        outerRadius={65}
                                                        label
                                                    >
                                                        {chartRenderData.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                                        ))}
                                                    </Pie>
                                                </PieChart>
                                            ) : (
                                                <BarChart data={chartRenderData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#cbd5e1'} />
                                                    <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} tick={{ fontSize: 10 }} />
                                                    <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} tick={{ fontSize: 10 }} />
                                                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#334155' : '#cbd5e1', fontSize: '11px', color: isDark ? '#ffffff' : '#000000' }} />
                                                    {legendPos !== 'none' && <Legend />}
                                                    {Object.keys(chartRenderData[0] || {})
                                                        .filter(k => k !== 'name')
                                                        .map((key, i) => (
                                                            <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
                                                        ))}
                                                </BarChart>
                                            )}
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>
                    </aside>
                )}
            </div>

            {/* Right-Click Cell Context Menu */}
            {contextMenu.visible && (
                <div 
                    className={`fixed z-50 rounded-xl shadow-2xl border py-1.5 text-xs w-52 animate-in fade-in duration-100 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800 shadow-slate-400/50'
                    }`}
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-3 py-1 text-[10px] font-mono text-emerald-500 font-bold border-b border-slate-700/50 flex justify-between">
                        <span>Cell {contextMenu.cellKey}</span>
                        <span className="text-[9px] text-slate-400 font-normal">Actions</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            handleCut();
                            setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                        }`}
                    >
                        <span className="flex items-center gap-1.5"><Scissors size={12} /> Cut</span>
                        <span className="text-[10px] text-slate-400 font-mono">Ctrl+X</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            handleCopy();
                            setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                        }`}
                    >
                        <span className="flex items-center gap-1.5"><Copy size={12} /> Copy</span>
                        <span className="text-[10px] text-slate-400 font-mono">Ctrl+C</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            handlePaste('all');
                            setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                        }`}
                    >
                        <span className="flex items-center gap-1.5"><ClipboardPaste size={12} /> Paste</span>
                        <span className="text-[10px] text-slate-400 font-mono">Ctrl+V</span>
                    </button>
                    
                    <div className={`my-0.5 py-0.5 border-t border-b ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="px-3 py-0.5 text-[9px] font-bold uppercase text-slate-400">Paste Special</div>
                        <button
                            type="button"
                            onClick={() => {
                                handlePaste('values');
                                setContextMenu(prev => ({ ...prev, visible: false }));
                            }}
                            className={`w-full text-left px-4 py-1 text-[11px] text-emerald-500 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                        >
                            • Values Only
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                handlePaste('formulas');
                                setContextMenu(prev => ({ ...prev, visible: false }));
                            }}
                            className={`w-full text-left px-4 py-1 text-[11px] text-blue-500 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                        >
                            • Formulas Only
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                handlePaste('formats');
                                setContextMenu(prev => ({ ...prev, visible: false }));
                            }}
                            className={`w-full text-left px-4 py-1 text-[11px] text-purple-500 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                        >
                            • Formats Only
                        </button>
                    </div>
                    <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    <button
                        type="button"
                        onClick={() => handleInsertRow(contextMenu.rowNum, 'above')}
                        className={`w-full text-left px-3 py-1.5 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                    >
                        Insert Row Above
                    </button>
                    <button
                        type="button"
                        onClick={() => handleInsertRow(contextMenu.rowNum, 'below')}
                        className={`w-full text-left px-3 py-1.5 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                    >
                        Insert Row Below
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeleteRow(contextMenu.rowNum)}
                        className={`w-full text-left px-3 py-1.5 text-rose-500 ${isDark ? 'hover:bg-rose-950/40' : 'hover:bg-rose-100'}`}
                    >
                        Delete Row {contextMenu.rowNum}
                    </button>
                    <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    <button
                        type="button"
                        onClick={() => handleInsertCol(contextMenu.colIdx, 'left')}
                        className={`w-full text-left px-3 py-1.5 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                    >
                        Insert Column Left
                    </button>
                    <button
                        type="button"
                        onClick={() => handleInsertCol(contextMenu.colIdx, 'right')}
                        className={`w-full text-left px-3 py-1.5 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                    >
                        Insert Column Right
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeleteCol(contextMenu.colIdx)}
                        className={`w-full text-left px-3 py-1.5 text-rose-500 ${isDark ? 'hover:bg-rose-950/40' : 'hover:bg-rose-100'}`}
                    >
                        Delete Column {colToLetter(contextMenu.colIdx)}
                    </button>
                    <div className={`h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    <button
                        type="button"
                        onClick={() => {
                            updateCell(contextMenu.cellKey, { val: '', formula: null, displayVal: '' });
                            setContextMenu(prev => ({ ...prev, visible: false }));
                            toast.success(`Cleared ${contextMenu.cellKey}`);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-amber-500 ${isDark ? 'hover:bg-amber-950/30' : 'hover:bg-amber-100'}`}
                    >
                        Clear Cell Contents
                    </button>
                </div>
            )}

            {/* Find & Replace Modal */}
            {showFindReplace && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-5 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700/50">
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                <Search size={16} className="text-emerald-500" />
                                <span>Find and Replace</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowFindReplace(false)}
                                className="p-1 rounded hover:bg-slate-800/50 text-slate-400 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="space-y-3 text-xs">
                            <div>
                                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Find
                                </label>
                                <input
                                    type="text"
                                    value={findText}
                                    onChange={(e) => setFindText(e.target.value)}
                                    placeholder="Text or number to search for..."
                                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-emerald-500 ${
                                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                    }`}
                                />
                            </div>
                            <div>
                                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Replace With
                                </label>
                                <input
                                    type="text"
                                    value={replaceText}
                                    onChange={(e) => setReplaceText(e.target.value)}
                                    placeholder="Replacement text..."
                                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-emerald-500 ${
                                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                    }`}
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowFindReplace(false)}
                                    className={`px-3 py-1.5 rounded-lg border text-xs ${
                                        isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleFindNext}
                                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium"
                                >
                                    Find Next
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReplaceAll}
                                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
                                >
                                    Replace All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sheet Rename Modal */}
            {sheetModal.open && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className={`w-full max-w-sm rounded-2xl border shadow-2xl p-5 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                        <h3 className="font-bold text-sm mb-3">Rename Worksheet</h3>
                        <input
                            type="text"
                            value={sheetModal.name}
                            onChange={(e) => setSheetModal(prev => ({ ...prev, name: e.target.value }))}
                            className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-emerald-500 mb-4 ${
                                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                            autoFocus
                        />
                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setSheetModal({ open: false, index: 0, name: '' })}
                                className={`px-3 py-1.5 rounded-lg border text-xs ${
                                    isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRenameSheet(sheetModal.index, sheetModal.name)}
                                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* In-Cell Data Validation Modal */}
            {showValidationModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-5 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700/50">
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                <ListFilter size={16} className="text-emerald-500" />
                                <span>Data Validation (Dropdown List)</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowValidationModal(false)}
                                className="p-1 rounded hover:bg-slate-800/50 text-slate-400 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="space-y-3 text-xs">
                            <p className="text-[11px] text-slate-400">
                                Create an in-cell interactive dropdown menu for the currently selected cell or range.
                            </p>
                            <div>
                                <label className={`block text-[11px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Allowed Choices (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={validationInput}
                                    onChange={(e) => setValidationInput(e.target.value)}
                                    placeholder="e.g. Pass, Fail, Absent"
                                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-emerald-500 ${
                                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                                    }`}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-500 block mb-1">Quick Presets:</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        'Pass, Fail, Absent',
                                        'High, Medium, Low',
                                        'Pending, Approved, Rejected',
                                        'Completed, In Progress, Blocked',
                                        'Yes, No, N/A'
                                    ].map(preset => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setValidationInput(preset)}
                                            className={`px-2 py-1 rounded text-[10px] border transition ${
                                                validationInput === preset
                                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-semibold'
                                                    : isDark
                                                    ? 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-slate-200'
                                                    : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-800'
                                            }`}
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowValidationModal(false)}
                                    className={`px-3 py-1.5 rounded-lg border text-xs ${
                                        isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApplyValidation}
                                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
                                >
                                    Apply Validation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Conditional Formatting Modal */}
            {showCondFormatModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-5 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700/50">
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                <Sparkles size={16} className="text-emerald-500" />
                                <span>Conditional Formatting Rules</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowCondFormatModal(false)}
                                className="p-1 rounded hover:bg-slate-800/50 text-slate-400 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Existing Rules List */}
                        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
                            <label className={`block text-[11px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Active Rules ({condRules.length})
                            </label>
                            {condRules.length === 0 ? (
                                <p className="text-xs text-slate-500 py-3 text-center border border-dashed border-slate-700/60 rounded-lg">
                                    No formatting rules created yet.
                                </p>
                            ) : (
                                condRules.map((rule) => (
                                    <div
                                        key={rule.id}
                                        className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                                            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="px-2 py-0.5 rounded text-[11px] font-bold border"
                                                style={{ backgroundColor: rule.bg, color: rule.color, borderColor: rule.color + '40' }}
                                            >
                                                Sample
                                            </span>
                                            <span className="font-mono text-[11px] text-emerald-400">{rule.range}</span>
                                            <span className="text-slate-400">
                                                if cell {rule.type === 'greater' ? '>' : rule.type === 'less' ? '<' : '='} {rule.val}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCondRule(rule.id)}
                                            className="p-1 rounded text-rose-400 hover:bg-rose-500/20"
                                            title="Delete rule"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add New Rule */}
                        <div className={`p-3 rounded-xl border space-y-3 ${
                            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                            <span className="text-[11px] font-bold uppercase text-emerald-500 block">Add New Rule</span>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                    <label className="block text-[10px] text-slate-400 mb-0.5">Range</label>
                                    <input
                                        type="text"
                                        value={newRuleRange}
                                        onChange={(e) => setNewRuleRange(e.target.value)}
                                        placeholder="e.g. B2:D20"
                                        className={`w-full px-2 py-1.5 rounded border font-mono text-xs ${
                                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                                        }`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-400 mb-0.5">Condition</label>
                                    <select
                                        value={newRuleType}
                                        onChange={(e) => setNewRuleType(e.target.value)}
                                        className={`w-full px-2 py-1.5 rounded border text-xs ${
                                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                                        }`}
                                    >
                                        <option value="greater">Greater than (&gt;)</option>
                                        <option value="less">Less than (&lt;)</option>
                                        <option value="equal">Equal to (=)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-400 mb-0.5">Threshold Value</label>
                                    <input
                                        type="text"
                                        value={newRuleVal}
                                        onChange={(e) => setNewRuleVal(e.target.value)}
                                        placeholder="e.g. 80"
                                        className={`w-full px-2 py-1.5 rounded border text-xs ${
                                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                                        }`}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-slate-400">Fill:</span>
                                        <input
                                            type="color"
                                            value={newRuleBg}
                                            onChange={(e) => setNewRuleBg(e.target.value)}
                                            className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-slate-400">Text:</span>
                                        <input
                                            type="color"
                                            value={newRuleColor}
                                            onChange={(e) => setNewRuleColor(e.target.value)}
                                            className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                                        />
                                    </div>
                                    <span
                                        className="px-2 py-0.5 rounded text-[11px] font-bold border ml-2"
                                        style={{ backgroundColor: newRuleBg, color: newRuleColor, borderColor: newRuleColor + '40' }}
                                    >
                                        Preview
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddCondRule}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
                                >
                                    + Add Rule
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowCondFormatModal(false)}
                                className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Visual Thumbnail Picture Preview Badge on Every Addition */}
            {additionBadge && (
                <div className={`fixed bottom-12 right-6 z-50 flex items-center gap-3 p-3 rounded-2xl border shadow-2xl animate-in slide-in-from-bottom duration-300 max-w-sm ${
                    isDark ? 'bg-slate-900 border-emerald-500/50 text-white shadow-emerald-950/40' : 'bg-white border-emerald-400 text-slate-900 shadow-slate-300/80'
                }`}>
                    {/* Visual Graphic Thumbnail Preview */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-1 flex items-center justify-center shrink-0 shadow-sm text-white overflow-hidden">
                        {additionBadge.type === 'chart' ? (
                            <div className="flex items-end gap-1 h-8 w-8 justify-center pb-1">
                                <div className="w-1.5 h-4 bg-white/70 rounded-xs animate-pulse" />
                                <div className="w-1.5 h-6 bg-white rounded-xs" />
                                <div className="w-1.5 h-3 bg-white/80 rounded-xs" />
                                <div className="w-1.5 h-7 bg-emerald-200 rounded-xs" />
                            </div>
                        ) : additionBadge.type === 'image' && additionBadge.thumbnail ? (
                            <img src={additionBadge.thumbnail} alt="preview" className="w-full h-full object-cover rounded-lg" />
                        ) : additionBadge.type === 'shape' ? (
                            <Square size={22} className="text-white" />
                        ) : additionBadge.type === 'table' ? (
                            <Table size={22} className="text-white" />
                        ) : (
                            <FileSpreadsheet size={22} className="text-white" />
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 leading-none">
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">New Addition</span>
                            <span className="text-[9px] text-slate-400">• Just now</span>
                        </div>
                        <h4 className="font-bold text-xs truncate mt-0.5">{additionBadge.title}</h4>
                        <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">{additionBadge.subtitle}</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setAdditionBadge(null)}
                        className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-white shrink-0"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Version History Drawer */}
            <VersionHistoryDrawer
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                docId={docId}
                docTitle={title}
                onRestore={(snapshot) => {
                    if (snapshot?.sheets) {
                        setSheets(snapshot.sheets);
                        toast.success('Worksheet restored from history snapshot');
                    }
                }}
            />

            {/* Blur Breathing Loader on Initial Load or Failure */}
            {(isInitialLoading || loadError) && (
                <OfficeAppBlurLoader
                    appType="excel"
                    message="Initializing LabSheets..."
                    subMessage="Restoring spreadsheet formulas, formatting, and live data charts"
                    error={loadError}
                    onRetry={loadSpreadsheet}
                />
            )}
        </div>
    );
}
