'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
    Move, Lock, Unlock, Trash2, Copy, Plus, Minus, 
    Type, Calculator, Image as ImageIcon, Edit3, Palette, 
    X, Check, ChevronsUp, ChevronsDown, Maximize2, Sparkles,
    Undo2, RefreshCw, Bold, Italic, Underline, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, WrapText, ChevronDown,
    Clipboard, ClipboardCheck, Droplet, Sun, Moon, Search
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import MathRenderer from './MathRenderer';
import { evaluateCellFormula, searchStemFunctions, STEM_FUNCTIONS_CATALOG } from '@/lib/tableFormulaEngine';

const CORNER_WIDTH = 28;
const HEADER_HEIGHT = 22;

const getColLabel = (index) => {
    let label = '';
    let num = index;
    while (num >= 0) {
        label = String.fromCharCode((num % 26) + 65) + label;
        num = Math.floor(num / 26) - 1;
    }
    return label;
};

const colLetterToIndex = (colStr) => {
    if (!colStr) return 0;
    const clean = colStr.toUpperCase().trim();
    let index = 0;
    for (let i = 0; i < clean.length; i++) {
        index = index * 26 + (clean.charCodeAt(i) - 64);
    }
    return index - 1;
};

const REFERENCE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];

const getReferencedCellsFromFormula = (formulaStr) => {
    if (!formulaStr || typeof formulaStr !== 'string' || !formulaStr.startsWith('=')) {
        return new Map();
    }
    const map = new Map();
    const regex = /\b([A-Za-z]+)(\d+)(?::([A-Za-z]+)(\d+))?\b/g;
    let match;
    let colorIdx = 0;
    while ((match = regex.exec(formulaStr)) !== null) {
        const col1 = colLetterToIndex(match[1]);
        const row1 = parseInt(match[2], 10) - 1;
        const color = REFERENCE_COLORS[colorIdx % REFERENCE_COLORS.length];
        colorIdx++;

        if (match[3] && match[4]) {
            const col2 = colLetterToIndex(match[3]);
            const row2 = parseInt(match[4], 10) - 1;
            const minR = Math.min(row1, row2);
            const maxR = Math.max(row1, row2);
            const minC = Math.min(col1, col2);
            const maxC = Math.max(col1, col2);
            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    const key = `${r}-${c}`;
                    if (!map.has(key)) map.set(key, color);
                }
            }
        } else {
            const key = `${row1}-${col1}`;
            if (!map.has(key)) map.set(key, color);
        }
    }
    return map;
};

// Comprehensive color families for cell backgrounds (soft pastels to deep tones)
const COLOR_FAMILIES = [
    {
        name: 'Monochrome',
        colors: ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#334155', '#1e293b', '#0f172a', '#000000']
    },
    {
        name: 'Rose & Red',
        colors: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337', '#4c0519']
    },
    {
        name: 'Amber & Orange',
        colors: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03']
    },
    {
        name: 'Yellow & Lime',
        colors: ['#fefce8', '#fef9c3', '#fef08a', '#facc15', '#eab308', '#ca8a04', '#a16207', '#84cc16', '#65a30d', '#4d7c0f', '#365314']
    },
    {
        name: 'Emerald & Green',
        colors: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22']
    },
    {
        name: 'Teal & Cyan',
        colors: ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a', '#042f2e']
    },
    {
        name: 'Sky & Blue',
        colors: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#172554']
    },
    {
        name: 'Indigo & Violet',
        colors: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#1e1b4b']
    },
    {
        name: 'Purple & Fuchsia',
        colors: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87', '#3b0764']
    },
    {
        name: 'Pink & Magenta',
        colors: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843', '#701a75', '#500724']
    }
];

const hexToRgba = (hex, alpha = 1) => {
    if (!hex) return '';
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    if (cleanHex.length !== 6) return hex;
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    if (alpha >= 1) return `#${cleanHex}`;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const isDarkHex = (hex) => {
    if (!hex || hex === 'transparent') return true;
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
        clean = clean.split('').map(c => c + c).join('');
    }
    if (clean.length < 6) return true;
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) < 140;
};

/**
 * Rich Whiteboard Spreadsheet Table Object.
 * Features:
 * - Corner Box (34x26): click selects all cells, drag moves table across whiteboard
 * - Column Header labels (A, B, C...): click selects column, divider drag resizes column width
 * - Row Header numbers (1, 2, 3...): click selects row, divider drag resizes row height
 * - 8-point outer resize handles for viewport resizing
 * - Synchronized edge scrollbars (horizontal on bottom edge, vertical on right edge)
 * - Single consolidated formatting bar safely positioned above table
 * - Comprehensive cell background color palette (8 families, translucency, custom picker)
 * - Copy/Paste tabular data from/to Excel & Word tables via TSV/clipboard
 * - KaTeX math rendering, image attachments, and in-cell ink doodling
 */
export default function WhiteboardTableObject({
    tableObj,
    isSelected = false,
    scale = 1,
    onSelect,
    onUpdate,
    onDelete,
    onDuplicate,
    onBringForward,
    onSendBackward
}) {
    const table = tableObj || {};
    const tableId = table.id;

    // Dimensions and grid counts
    const rows = table.rows || 3;
    const cols = table.cols || 3;
    const hasHeaderRow = table.hasHeaderRow !== false;
    const isLocked = Boolean(table.isLocked);
    const zIndex = table.zIndex || 35;

    // Normalized column widths and row heights
    const colWidths = (table.colWidths && table.colWidths.length === cols)
        ? table.colWidths
        : Array(cols).fill(Math.max(60, Math.round((table.width || 360) / cols)));

    const rowHeights = (table.rowHeights && table.rowHeights.length === rows)
        ? table.rowHeights
        : Array(rows).fill(Math.max(24, Math.round((table.height || (rows * 24)) / rows)));

    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
    const totalHeight = rowHeights.reduce((a, b) => a + b, 0);
    const gridWidth = totalWidth + CORNER_WIDTH;
    const gridHeight = totalHeight + HEADER_HEIGHT;

    // Viewport dimensions for scrollable table container
    const containerWidth = table.width ? Math.max(160, table.width) : gridWidth;
    const containerHeight = table.height ? Math.max(90, table.height) : gridHeight;
    const hasHorizontalOverflow = gridWidth > containerWidth;
    const hasVerticalOverflow = gridHeight > containerHeight;

    // Styling
    const borderColor = table.borderColor || '#334155';
    const borderWidth = table.borderWidth || 2;
    const headerBg = table.headerBg || '#1e293b';
    const headerText = table.headerText || '#f8fafc';
    const cellBg = table.cellBg || '#0f172a';
    const cellText = table.cellText || '#e2e8f0';
    const tableOpacity = table.opacity !== undefined ? Number(table.opacity) : 1.0;

    // Cell data map: { 'r-c': { text, math, image, inkData, bg, bold, italic, underline, strikethrough, fontSize, fontFamily, color, align, wrap } }
    const cells = table.cells || {};

    // Selection State
    // selectionMode: 'CELL' | 'ROW' | 'COL' | 'ALL' | null
    const [selectionMode, setSelectionMode] = useState('CELL');
    const [selectedCellKey, setSelectedCellKey] = useState('0-0'); // 'r-c'
    const [selectedRow, setSelectedRow] = useState(null);
    const [selectedCol, setSelectedCol] = useState(null);

    // Extract active selected cell data & label
    const selectedCell = selectedCellKey ? (cells[selectedCellKey] || {}) : null;
    const [selR, selC] = selectedCellKey ? selectedCellKey.split('-').map(Number) : [null, null];
    const cellColLetter = selC !== null && selC !== undefined ? getColLabel(selC) : '';
    const cellRefLabel = selR !== null && selR !== undefined ? `${cellColLetter}${selR + 1}` : '';

    // Inline Editing State
    const [isInlineEditing, setIsInlineEditing] = useState(false);
    const [inlineText, setInlineText] = useState('');
    const inlineInputRef = useRef(null);

    // STEM Formula Autocomplete State
    const [autocompleteSelectedIdx, setAutocompleteSelectedIdx] = useState(0);
    const [isAutocompleteDismissed, setIsAutocompleteDismissed] = useState(false);

    // Dark Mode Theme State & Handler
    const isTableDark = table.theme === 'light' ? false : (table.theme === 'dark' || isDarkHex(cellBg));
    const handleToggleTableTheme = () => {
        if (isTableDark) {
            onUpdate?.({
                ...table,
                theme: 'light',
                headerBg: '#f1f5f9',
                headerText: '#0f172a',
                cellBg: '#ffffff',
                cellText: '#0f172a',
                borderColor: '#cbd5e1'
            });
            toast.success('Switched table to Light theme', { icon: '☀️' });
        } else {
            onUpdate?.({
                ...table,
                theme: 'dark',
                headerBg: '#1e293b',
                headerText: '#f8fafc',
                cellBg: '#0f172a',
                cellText: '#e2e8f0',
                borderColor: '#334155'
            });
            toast.success('Switched table to Dark theme', { icon: '🌙' });
        }
    };

    // Calculate active STEM formula autocomplete suggestions
    const formulaSuggestions = (isInlineEditing && inlineText.startsWith('=') && !isAutocompleteDismissed)
        ? searchStemFunctions(inlineText)
        : [];

    const applyAutocompleteSuggestion = (funcItem) => {
        if (!funcItem) return;
        const clean = inlineText.trim();
        const lastTokenMatch = clean.match(/([A-Za-z_][A-Za-z0-9_]*)$/);
        let newText = clean;
        if (lastTokenMatch) {
            const tokenStart = clean.lastIndexOf(lastTokenMatch[1]);
            newText = clean.substring(0, tokenStart) + `${funcItem.name}(`;
        } else if (clean.endsWith('(') || clean.endsWith(',') || clean.endsWith('+') || clean.endsWith('-') || clean.endsWith('*') || clean.endsWith('/')) {
            newText = clean + `${funcItem.name}(`;
        } else if (clean === '=') {
            newText = `=${funcItem.name}(`;
        } else {
            newText = `${clean}${funcItem.name}(`;
        }
        setInlineText(newText);
        setAutocompleteSelectedIdx(0);
        setTimeout(() => {
            if (inlineInputRef.current) {
                inlineInputRef.current.focus();
                const len = newText.length;
                inlineInputRef.current.setSelectionRange(len, len);
            }
        }, 20);
    };

    // Format Ribbon Dropdowns State
    const [showFontMenu, setShowFontMenu] = useState(false);
    const [showColorMenu, setShowColorMenu] = useState(false);
    const [showBgMenu, setShowBgMenu] = useState(false);
    const [showSizeMenu, setShowSizeMenu] = useState(false);
    const [showOpacityMenu, setShowOpacityMenu] = useState(false);
    const [showFunctionMenu, setShowFunctionMenu] = useState(false);
    const [funcSearch, setFuncSearch] = useState('');
    const [bgOpacity, setBgOpacity] = useState(1); // 0.15, 0.35, 0.65, 1
    const [customHexInput, setCustomHexInput] = useState('');

    const filteredFunctions = useMemo(() => {
        if (!funcSearch.trim()) return STEM_FUNCTIONS_CATALOG.slice(0, 32);
        const q = funcSearch.toLowerCase().trim();
        return STEM_FUNCTIONS_CATALOG.filter(fn => 
            fn.name.toLowerCase().includes(q) || 
            (fn.category && fn.category.toLowerCase().includes(q)) ||
            (fn.description && fn.description.toLowerCase().includes(q))
        );
    }, [funcSearch]);

    const insertFunctionIntoActiveCell = (fnName) => {
        const targetCellKey = selectedCellKey || '0-0';
        const [r, c] = targetCellKey.split('-').map(Number);
        
        if (isInlineEditing) {
            const clean = inlineText.trim();
            let newText;
            if (clean === '' || clean === '=') {
                newText = `=${fnName}(`;
            } else if (clean.endsWith('(') || clean.endsWith(',') || clean.endsWith('+') || clean.endsWith('-') || clean.endsWith('*') || clean.endsWith('/')) {
                newText = `${clean}${fnName}(`;
            } else {
                newText = `${clean}+${fnName}(`;
            }
            setInlineText(newText);
            setTimeout(() => {
                if (inlineInputRef.current) {
                    inlineInputRef.current.focus();
                    inlineInputRef.current.setSelectionRange(newText.length, newText.length);
                }
            }, 30);
        } else {
            startInlineEdit(r, c, `=${fnName}(`);
        }
    };

    // Calculate dynamic map of referenced cells for multi-color border outlines
    const activeFormulaString = isInlineEditing && inlineText.startsWith('=')
        ? inlineText
        : (selectedCell?.text && String(selectedCell.text).startsWith('=') ? String(selectedCell.text) : '');

    const referencedCellsMap = useMemo(() => {
        return getReferencedCellsFromFormula(activeFormulaString);
    }, [activeFormulaString]);

    // Modal Cell Editor (for advanced Doodle / Image / KaTeX formulas)
    const [activeCellKey, setActiveCellKey] = useState(null);
    const [editorTab, setEditorTab] = useState('text'); // 'text' | 'math' | 'image' | 'doodle' | 'color'
    const [editText, setEditText] = useState('');
    const [editMath, setEditMath] = useState('');
    const [editImage, setEditImage] = useState(null);
    const [editBg, setEditBg] = useState('');

    // In-cell doodle state
    const doodleCanvasRef = useRef(null);
    const [isDoodling, setIsDoodling] = useState(false);
    const [doodleColor, setDoodleColor] = useState('#38bdf8');
    const [doodleSize, setDoodleSize] = useState(3);

    // Drag-to-move whole table
    const [isDraggingTable, setIsDraggingTable] = useState(false);
    const dragStartRef = useRef({ startX: 0, startY: 0, tableX: 0, tableY: 0 });

    // Helpers for font styling
    const getFontFamilyCss = (ff) => {
        switch (ff) {
            case 'serif': return 'Georgia, "Times New Roman", serif';
            case 'mono': return '"Fira Code", Menlo, monospace';
            case 'handwriting': return 'Caveat, "Comic Sans MS", cursive';
            case 'sans':
            default:
                return 'Inter, system-ui, -apple-system, sans-serif';
        }
    };

    // Helper: update property of selected cell(s)
    const updateSelectedCell = (propertyUpdates) => {
        const updatedCells = { ...cells };
        if (selectionMode === 'ALL') {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const key = `${r}-${c}`;
                    updatedCells[key] = { ...(updatedCells[key] || {}), ...propertyUpdates };
                }
            }
        } else if (selectionMode === 'COL' && selectedCol !== null) {
            for (let r = 0; r < rows; r++) {
                const key = `${r}-${selectedCol}`;
                updatedCells[key] = { ...(updatedCells[key] || {}), ...propertyUpdates };
            }
        } else if (selectionMode === 'ROW' && selectedRow !== null) {
            for (let c = 0; c < cols; c++) {
                const key = `${selectedRow}-${c}`;
                updatedCells[key] = { ...(updatedCells[key] || {}), ...propertyUpdates };
            }
        } else if (selectedCellKey) {
            const currentCell = cells[selectedCellKey] || {};
            updatedCells[selectedCellKey] = {
                ...currentCell,
                ...propertyUpdates
            };
        } else {
            return;
        }

        onUpdate({
            ...table,
            cells: updatedCells
        });
    };

    // Cell selection checker
    const isCellSelected = (r, c) => {
        if (!isSelected) return false;
        if (selectionMode === 'ALL') return true;
        if (selectionMode === 'COL' && selectedCol === c) return true;
        if (selectionMode === 'ROW' && selectedRow === r) return true;
        if (selectedCellKey === `${r}-${c}`) return true;
        return false;
    };

    // Selection Handlers
    const handleSelectAll = (e) => {
        e?.stopPropagation();
        onSelect?.(tableId);
        setSelectionMode('ALL');
        setSelectedCellKey('0-0');
        setSelectedRow(null);
        setSelectedCol(null);
        setIsInlineEditing(false);
    };

    const handleSelectCol = (c, e) => {
        e?.stopPropagation();
        onSelect?.(tableId);
        setSelectionMode('COL');
        setSelectedCol(c);
        setSelectedRow(null);
        setSelectedCellKey(`0-${c}`);
        setIsInlineEditing(false);
    };

    const handleSelectRow = (r, e) => {
        e?.stopPropagation();
        onSelect?.(tableId);
        setSelectionMode('ROW');
        setSelectedRow(r);
        setSelectedCol(null);
        setSelectedCellKey(`${r}-0`);
        setIsInlineEditing(false);
    };

    const handleSelectCell = (r, c, e) => {
        e?.stopPropagation();
        onSelect?.(tableId);
        setSelectionMode('CELL');
        setSelectedCellKey(`${r}-${c}`);
        setSelectedRow(null);
        setSelectedCol(null);
        setIsInlineEditing(false);
        setInlineText(cells[`${r}-${c}`]?.text || '');
    };

    // Start inline editing
    const startInlineEdit = (r, c, initialChar = null) => {
        if (isLocked) return;
        const key = `${r}-${c}`;
        setSelectionMode('CELL');
        setSelectedCellKey(key);
        setSelectedRow(null);
        setSelectedCol(null);
        setIsInlineEditing(true);
        setIsAutocompleteDismissed(false);
        setAutocompleteSelectedIdx(0);
        const existingText = cells[key]?.text || '';
        setInlineText(initialChar !== null ? initialChar : existingText);
        setTimeout(() => {
            if (inlineInputRef.current) {
                inlineInputRef.current.focus();
                if (initialChar === null) {
                    inlineInputRef.current.select();
                }
            }
        }, 10);
    };

    // Commit inline edit
    const commitInlineEdit = (newText = null) => {
        if (!selectedCellKey) return;
        const textToCommit = newText !== null ? newText : inlineText;
        const currentCell = cells[selectedCellKey] || {};
        const updatedCells = {
            ...cells,
            [selectedCellKey]: {
                ...currentCell,
                text: textToCommit
            }
        };
        setIsInlineEditing(false);
        setIsAutocompleteDismissed(false);
        onUpdate({
            ...table,
            cells: updatedCells
        });
    };

    // Cancel inline edit
    const cancelInlineEdit = () => {
        setIsInlineEditing(false);
        setIsAutocompleteDismissed(false);
        if (selectedCellKey) {
            setInlineText(cells[selectedCellKey]?.text || '');
        }
    };

    // Commit and move (Excel-style navigation with auto row expansion)
    const commitAndNavigate = (direction) => {
        if (!selectedCellKey) return;
        const [r, c] = selectedCellKey.split('-').map(Number);
        const currentCell = cells[selectedCellKey] || {};
        const updatedCells = {
            ...cells,
            [selectedCellKey]: {
                ...currentCell,
                text: inlineText
            }
        };
        setIsInlineEditing(false);

        if (direction === 'down') {
            if (r < rows - 1) {
                onUpdate({ ...table, cells: updatedCells });
                handleSelectCell(r + 1, c);
                setTimeout(() => startInlineEdit(r + 1, c), 25);
            } else {
                // Auto append row on last row Enter
                const newRows = rows + 1;
                const newRowHeights = [...rowHeights, 50];
                onUpdate({
                    ...table,
                    rows: newRows,
                    rowHeights: newRowHeights,
                    height: newRowHeights.reduce((a, b) => a + b, 0),
                    cells: updatedCells
                });
                setTimeout(() => {
                    handleSelectCell(r + 1, c);
                    startInlineEdit(r + 1, c);
                }, 35);
            }
        } else if (direction === 'right') {
            if (c < cols - 1) {
                onUpdate({ ...table, cells: updatedCells });
                handleSelectCell(r, c + 1);
                setTimeout(() => startInlineEdit(r, c + 1), 25);
            } else if (r < rows - 1) {
                onUpdate({ ...table, cells: updatedCells });
                handleSelectCell(r + 1, 0);
                setTimeout(() => startInlineEdit(r + 1, 0), 25);
            } else {
                // Auto append row on bottom-right cell Tab
                const newRows = rows + 1;
                const newRowHeights = [...rowHeights, 50];
                onUpdate({
                    ...table,
                    rows: newRows,
                    rowHeights: newRowHeights,
                    height: newRowHeights.reduce((a, b) => a + b, 0),
                    cells: updatedCells
                });
                setTimeout(() => {
                    handleSelectCell(r + 1, 0);
                    startInlineEdit(r + 1, 0);
                }, 35);
            }
        } else if (direction === 'left') {
            onUpdate({ ...table, cells: updatedCells });
            if (c > 0) {
                handleSelectCell(r, c - 1);
                setTimeout(() => startInlineEdit(r, c - 1), 25);
            } else if (r > 0) {
                handleSelectCell(r - 1, cols - 1);
                setTimeout(() => startInlineEdit(r - 1, cols - 1), 25);
            }
        } else if (direction === 'up') {
            onUpdate({ ...table, cells: updatedCells });
            if (r > 0) {
                handleSelectCell(r - 1, c);
                setTimeout(() => startInlineEdit(r - 1, c), 25);
            }
        }
    };

    // Navigate without editing
    const moveToCell = (r, c) => {
        const targetR = Math.max(0, Math.min(rows - 1, r));
        const targetC = Math.max(0, Math.min(cols - 1, c));
        handleSelectCell(targetR, targetC);
    };

    // Copy tabular data to clipboard as TSV
    const copyTableDataToClipboard = () => {
        let tsv = '';
        if (selectionMode === 'ALL') {
            const lines = [];
            for (let r = 0; r < rows; r++) {
                const rowVals = [];
                for (let c = 0; c < cols; c++) {
                    const cell = cells[`${r}-${c}`];
                    rowVals.push(cell?.text || cell?.math || '');
                }
                lines.push(rowVals.join('\t'));
            }
            tsv = lines.join('\n');
        } else if (selectionMode === 'COL' && selectedCol !== null) {
            const colVals = [];
            for (let r = 0; r < rows; r++) {
                const cell = cells[`${r}-${selectedCol}`];
                colVals.push(cell?.text || cell?.math || '');
            }
            tsv = colVals.join('\n');
        } else if (selectionMode === 'ROW' && selectedRow !== null) {
            const rowVals = [];
            for (let c = 0; c < cols; c++) {
                const cell = cells[`${selectedRow}-${c}`];
                rowVals.push(cell?.text || cell?.math || '');
            }
            tsv = rowVals.join('\t');
        } else if (selectedCellKey) {
            const cell = cells[selectedCellKey];
            tsv = cell?.text || cell?.math || '';
        } else {
            // Default copy all
            const lines = [];
            for (let r = 0; r < rows; r++) {
                const rowVals = [];
                for (let c = 0; c < cols; c++) {
                    const cell = cells[`${r}-${c}`];
                    rowVals.push(cell?.text || cell?.math || '');
                }
                lines.push(rowVals.join('\t'));
            }
            tsv = lines.join('\n');
        }

        if (tsv) {
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(tsv).then(() => {
                    toast.success('Copied table data to clipboard!', { icon: '📋' });
                }).catch(() => {
                    fallbackCopy(tsv);
                });
            } else {
                fallbackCopy(tsv);
            }
        }
    };

    const fallbackCopy = (text) => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast.success('Copied table data to clipboard!', { icon: '📋' });
    };

    // Paste tabular data into cells (auto-expands rows and columns)
    const pasteTableData = (pastedText) => {
        if (!pastedText || !pastedText.trim()) return;

        const rawLines = pastedText.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        const grid = rawLines.map(line => line.split('\t'));

        const [currR, currC] = selectedCellKey ? selectedCellKey.split('-').map(Number) : [0, 0];
        const startR = currR !== null && currR !== undefined ? currR : 0;
        const startC = currC !== null && currC !== undefined ? currC : 0;

        const neededRows = Math.max(rows, startR + grid.length);
        let maxPastedCols = 0;
        grid.forEach(row => {
            if (row.length > maxPastedCols) maxPastedCols = row.length;
        });
        const neededCols = Math.max(cols, startC + maxPastedCols);

        // Expand colWidths and rowHeights if needed
        const newColWidths = [...colWidths];
        while (newColWidths.length < neededCols) {
            newColWidths.push(120);
        }
        const newRowHeights = [...rowHeights];
        while (newRowHeights.length < neededRows) {
            newRowHeights.push(50);
        }

        const updatedCells = { ...cells };
        grid.forEach((rowVals, rOffset) => {
            rowVals.forEach((val, cOffset) => {
                const targetR = startR + rOffset;
                const targetC = startC + cOffset;
                const key = `${targetR}-${targetC}`;
                updatedCells[key] = {
                    ...(updatedCells[key] || {}),
                    text: val.trim()
                };
            });
        });

        onUpdate({
            ...table,
            rows: neededRows,
            cols: neededCols,
            colWidths: newColWidths,
            rowHeights: newRowHeights,
            width: newColWidths.reduce((a, b) => a + b, 0),
            height: newRowHeights.reduce((a, b) => a + b, 0),
            cells: updatedCells
        });

        toast.success(`Pasted ${grid.length}×${maxPastedCols} cells!`, { icon: '📋' });
    };

    // Container paste listener
    const handlePaste = (e) => {
        if (isInlineEditing) return; // Allow normal paste inside textarea
        e.preventDefault();
        const clipboardData = e.clipboardData || window.clipboardData;
        const pastedText = clipboardData?.getData('text/plain') || '';
        if (pastedText) {
            pasteTableData(pastedText);
        }
    };

    // Keyboard navigation when not inline editing
    const handleContainerKeyDown = (e) => {
        if (isInlineEditing) return;

        // Clipboard Copy
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            copyTableDataToClipboard();
            return;
        }

        // Arrow navigation
        if (!selectedCellKey) return;
        const [r, c] = selectedCellKey.split('-').map(Number);

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            moveToCell(r, c + 1);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            moveToCell(r, c - 1);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            moveToCell(r + 1, c);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            moveToCell(r - 1, c);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            moveToCell(r, c + (e.shiftKey ? -1 : 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            startInlineEdit(r, c);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            updateSelectedCell({ text: '', math: '' });
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Typing directly enters edit mode with pressed key
            startInlineEdit(r, c, e.key);
        }
    };

    // Table movement via Corner Box or Drag Handle
    const handleMovePointerDown = (e) => {
        if (isLocked) return;
        e.stopPropagation();
        onSelect?.(tableId);

        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

        dragStartRef.current = {
            startX: clientX,
            startY: clientY,
            tableX: table.x || 100,
            tableY: table.y || 100
        };
        setIsDraggingTable(true);

        const handlePointerMove = (moveEvent) => {
            const mx = moveEvent.clientX ?? moveEvent.touches?.[0]?.clientX ?? 0;
            const my = moveEvent.clientY ?? moveEvent.touches?.[0]?.clientY ?? 0;
            const dx = (mx - dragStartRef.current.startX) / (scale || 1);
            const dy = (my - dragStartRef.current.startY) / (scale || 1);

            onUpdate({
                ...table,
                x: Math.round(dragStartRef.current.tableX + dx),
                y: Math.round(dragStartRef.current.tableY + dy)
            });
        };

        const handlePointerUp = () => {
            setIsDraggingTable(false);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    // Column divider resize
    const startColResize = (colIndex, e) => {
        if (isLocked) return;
        e.stopPropagation();
        e.preventDefault();

        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        const initialWidth = colWidths[colIndex];

        const onPointerMove = (ev) => {
            const curX = ev.clientX ?? ev.touches?.[0]?.clientX ?? 0;
            const delta = (curX - clientX) / (scale || 1);
            const newW = Math.max(50, Math.round(initialWidth + delta));
            const newColWidths = [...colWidths];
            newColWidths[colIndex] = newW;
            onUpdate({
                ...table,
                colWidths: newColWidths,
                width: newColWidths.reduce((a, b) => a + b, 0)
            });
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // Row divider resize
    const startRowResize = (rowIndex, e) => {
        if (isLocked) return;
        e.stopPropagation();
        e.preventDefault();

        const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
        const initialHeight = rowHeights[rowIndex];

        const onPointerMove = (ev) => {
            const curY = ev.clientY ?? ev.touches?.[0]?.clientY ?? 0;
            const delta = (curY - clientY) / (scale || 1);
            const newH = Math.max(30, Math.round(initialHeight + delta));
            const newRowHeights = [...rowHeights];
            newRowHeights[rowIndex] = newH;
            onUpdate({
                ...table,
                rowHeights: newRowHeights,
                height: newRowHeights.reduce((a, b) => a + b, 0)
            });
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // Auto-adjust column width to max length of data values (Excel style double-click divider)
    const autoFitColWidth = (colIndex, e) => {
        if (isLocked) return;
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        let maxWidth = 48; // minimum comfortable width

        // Check column header title length
        const colHeaderTitle = getColLabel(colIndex);
        maxWidth = Math.max(maxWidth, colHeaderTitle.length * 10 + 20);

        for (let r = 0; r < rows; r++) {
            const cell = cells[`${r}-${colIndex}`];
            if (!cell) continue;

            let strVal = '';
            if (cell.text) {
                if (String(cell.text).startsWith('=')) {
                    strVal = String(evaluateCellFormula(cell.text, cells, rows, cols, `${r}-${colIndex}`));
                } else {
                    strVal = String(cell.text);
                }
            }
            if (cell.math) {
                strVal = cell.math;
            }

            if (strVal) {
                let textLenPx = 0;
                if (typeof document !== 'undefined') {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        const fSize = cell.fontSize || (hasHeaderRow && r === 0 ? 12 : 11);
                        const isBold = cell.bold !== undefined ? cell.bold : (hasHeaderRow && r === 0);
                        ctx.font = `${isBold ? 'bold ' : ''}${fSize}px sans-serif`;
                        const lines = strVal.split('\n');
                        for (const l of lines) {
                            textLenPx = Math.max(textLenPx, ctx.measureText(l).width);
                        }
                    }
                }
                if (!textLenPx) {
                    textLenPx = strVal.length * 7.5;
                }
                maxWidth = Math.max(maxWidth, Math.ceil(textLenPx + 24));
            }

            if (cell.image || cell.inkData) {
                maxWidth = Math.max(maxWidth, 60);
            }
        }

        maxWidth = Math.max(48, Math.min(600, maxWidth));

        const nextColWidths = [...colWidths];
        nextColWidths[colIndex] = maxWidth;
        const newTotalWidth = nextColWidths.reduce((a, b) => a + b, 0);

        onUpdate({
            ...table,
            colWidths: nextColWidths,
            width: Math.max(containerWidth, newTotalWidth + CORNER_WIDTH)
        });

        toast.success(`Auto-fit Column ${getColLabel(colIndex)} (${maxWidth}px)`, { icon: '↔️', id: `autofit-col-${colIndex}` });
    };

    // Auto-adjust row height to fit cell contents (Excel style double-click divider)
    const autoFitRowHeight = (rowIndex, e) => {
        if (isLocked) return;
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        let maxHeight = 24; // minimum compact row height

        for (let c = 0; c < cols; c++) {
            const cell = cells[`${rowIndex}-${c}`];
            if (!cell) continue;

            let strVal = '';
            if (cell.text) {
                if (String(cell.text).startsWith('=')) {
                    strVal = String(evaluateCellFormula(cell.text, cells, rows, cols, `${rowIndex}-${c}`));
                } else {
                    strVal = String(cell.text);
                }
            }

            if (strVal) {
                const lines = strVal.split('\n').length;
                const fSize = cell.fontSize || (hasHeaderRow && rowIndex === 0 ? 12 : 11);
                const h = Math.ceil(lines * (fSize + 4) + 8);
                maxHeight = Math.max(maxHeight, h);
            }

            if (cell.image || cell.inkData) {
                maxHeight = Math.max(maxHeight, 48);
            }
        }

        maxHeight = Math.max(24, Math.min(300, maxHeight));

        const nextRowHeights = [...rowHeights];
        nextRowHeights[rowIndex] = maxHeight;
        const newTotalHeight = nextRowHeights.reduce((a, b) => a + b, 0);

        onUpdate({
            ...table,
            rowHeights: nextRowHeights,
            height: Math.max(containerHeight, newTotalHeight + HEADER_HEIGHT)
        });

        toast.success(`Auto-fit Row ${rowIndex + 1} (${maxHeight}px)`, { icon: '↕️', id: `autofit-row-${rowIndex}` });
    };

    // 8-point outer resize handles (resizes viewport box; content scrolls if smaller than grid)
    const startOuterResize = (handle, e) => {
        if (isLocked) return;
        e.stopPropagation();
        e.preventDefault();

        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

        const startX = table.x || 100;
        const startY = table.y || 100;
        const startW = containerWidth;
        const startH = containerHeight;

        const onPointerMove = (ev) => {
            const curX = ev.clientX ?? ev.touches?.[0]?.clientX ?? 0;
            const curY = ev.clientY ?? ev.touches?.[0]?.clientY ?? 0;
            const dx = (curX - clientX) / (scale || 1);
            const dy = (curY - clientY) / (scale || 1);

            let newX = startX;
            let newY = startY;
            let newW = startW;
            let newH = startH;

            if (handle.includes('e')) {
                newW = Math.max(160, Math.round(startW + dx));
            }
            if (handle.includes('w')) {
                const potentialW = Math.max(160, Math.round(startW - dx));
                newX = Math.round(startX + (startW - potentialW));
                newW = potentialW;
            }
            if (handle.includes('s')) {
                newH = Math.max(90, Math.round(startH + dy));
            }
            if (handle.includes('n')) {
                const potentialH = Math.max(90, Math.round(startH - dy));
                newY = Math.round(startY + (startH - potentialH));
                newH = potentialH;
            }

            onUpdate({
                ...table,
                x: newX,
                y: newY,
                width: newW,
                height: newH
            });
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // Add Column
    const handleAddColumn = (e) => {
        e.stopPropagation();
        if (cols >= 20) return;
        const newCols = cols + 1;
        const newColWidths = [...colWidths, 120];
        onUpdate({
            ...table,
            cols: newCols,
            colWidths: newColWidths,
            width: newColWidths.reduce((a, b) => a + b, 0)
        });
    };

    // Remove Column
    const handleRemoveColumn = (e) => {
        e.stopPropagation();
        if (cols <= 1) return;
        const newCols = cols - 1;
        const newColWidths = colWidths.slice(0, -1);
        onUpdate({
            ...table,
            cols: newCols,
            colWidths: newColWidths,
            width: newColWidths.reduce((a, b) => a + b, 0)
        });
    };

    // Add Row
    const handleAddRow = (e) => {
        e.stopPropagation();
        if (rows >= 50) return;
        const newRows = rows + 1;
        const newRowHeights = [...rowHeights, 50];
        onUpdate({
            ...table,
            rows: newRows,
            rowHeights: newRowHeights,
            height: newRowHeights.reduce((a, b) => a + b, 0)
        });
    };

    // Remove Row
    const handleRemoveRow = (e) => {
        e.stopPropagation();
        if (rows <= 1) return;
        const newRows = rows - 1;
        const newRowHeights = rowHeights.slice(0, -1);
        onUpdate({
            ...table,
            rows: newRows,
            rowHeights: newRowHeights,
            height: newRowHeights.reduce((a, b) => a + b, 0)
        });
    };

    // Open rich modal cell editor (for doodle, image, LaTeX)
    const handleOpenCellEditor = (r, c) => {
        if (isLocked) return;
        const key = `${r}-${c}`;
        const cell = cells[key] || {};
        setActiveCellKey(key);
        setEditText(cell.text || '');
        setEditMath(cell.math || '');
        setEditImage(cell.image || null);
        setEditBg(cell.bg || '');
        setEditorTab(cell.math ? 'math' : (cell.image ? 'image' : (cell.inkData ? 'doodle' : 'text')));
    };

    // Save modal cell changes
    const handleSaveCell = () => {
        if (!activeCellKey) return;
        let finalInk = cells[activeCellKey]?.inkData || null;

        if (doodleCanvasRef.current) {
            finalInk = doodleCanvasRef.current.toDataURL('image/png');
        }

        const currentCell = cells[activeCellKey] || {};
        const updatedCells = {
            ...cells,
            [activeCellKey]: {
                ...currentCell,
                text: editText,
                math: editMath,
                image: editImage,
                inkData: finalInk,
                bg: editBg
            }
        };

        onUpdate({
            ...table,
            cells: updatedCells
        });
        setActiveCellKey(null);
    };

    const handleClearCell = () => {
        if (!activeCellKey) return;
        const updatedCells = { ...cells };
        delete updatedCells[activeCellKey];
        onUpdate({
            ...table,
            cells: updatedCells
        });
        setActiveCellKey(null);
    };

    // Initialize doodle canvas if tab selected
    useEffect(() => {
        if (editorTab === 'doodle' && doodleCanvasRef.current && activeCellKey) {
            const canvas = doodleCanvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            const existingInk = cells[activeCellKey]?.inkData;
            if (existingInk) {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
                img.src = existingInk;
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, [editorTab, activeCellKey]);

    // Doodle canvas drawing handlers
    const startDoodleDraw = (e) => {
        const canvas = doodleCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
        const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = doodleColor;
        ctx.lineWidth = doodleSize;
        setIsDoodling(true);
    };

    const doodleDraw = (e) => {
        if (!isDoodling) return;
        const canvas = doodleCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
        const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const ctx = canvas.getContext('2d');
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDoodleDraw = () => {
        setIsDoodling(false);
    };

    return (
        <div
            data-table-id={tableId}
            data-table-object="true"
            className={`whiteboard-table-item absolute select-none transition-shadow outline-none ${
                isSelected ? 'ring-2 ring-indigo-500 shadow-2xl' : ''
            }`}
            style={{
                left: table.x || 100,
                top: table.y || 100,
                width: containerWidth,
                height: containerHeight,
                zIndex: zIndex,
                pointerEvents: 'auto'
            }}
            tabIndex={0}
            onClick={(e) => {
                e.stopPropagation();
                onSelect?.(tableId);
            }}
            onPaste={handlePaste}
            onKeyDown={handleContainerKeyDown}
        >
            {/* Unified Floating Table Format Bar (Safely positioned above table to NEVER obstruct column headers) */}
            {isSelected && (
                <div 
                    className="absolute left-0 min-w-max max-w-[95vw] flex items-center gap-0.5 bg-slate-900/95 border border-slate-700/80 rounded-2xl px-1.5 py-0.5 shadow-2xl backdrop-blur-md text-slate-300 text-xs z-50 pointer-events-auto h-8"
                    style={{ bottom: 'calc(100% + 8px)' }}
                    onClick={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                >
                    {/* 1. Drag Move Handle */}
                    <div 
                        onPointerDown={handleMovePointerDown}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md cursor-grab active:cursor-grabbing font-semibold text-[10px] transition shadow-xs"
                        title="Drag to move table across whiteboard"
                    >
                        <Move className="w-3 h-3 text-indigo-400" />
                        <span>Move</span>
                    </div>

                    {/* Table Dimensions Badge (R+, R-, C+, C- removed as available inline) */}
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800/80 border border-slate-700/60 rounded-md">
                        <span className="font-mono text-[10px] text-slate-300 font-bold" title="Table dimensions: Rows × Columns">
                            {rows}R × {cols}C
                        </span>
                    </div>

                    {/* Dark / Light Theme Toggle Button */}
                    <button
                        type="button"
                        onClick={handleToggleTableTheme}
                        className={`p-1 rounded-md transition ${
                            isTableDark
                                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/50'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                        }`}
                        title={isTableDark ? "Dark Theme active (Click to switch to Light Theme)" : "Light Theme active (Click to switch to Dark Theme)"}
                    >
                        {isTableDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                    </button>

                    <div className="h-3.5 w-px bg-slate-700 mx-0.5" />

                    {/* Active Cell Reference Indicator with Formula preview */}
                    <div 
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md font-mono font-bold text-[10px] shadow-xs max-w-[150px] truncate"
                        title={selectedCell?.text?.startsWith('=') ? `${cellRefLabel}: ${selectedCell.text}` : 'Selected Cell'}
                    >
                        <span className="truncate">
                            {selectionMode === 'ALL' 
                                ? 'All Cells' 
                                : selectionMode === 'COL' && selectedCol !== null 
                                    ? `Col ${getColLabel(selectedCol)}`
                                    : selectionMode === 'ROW' && selectedRow !== null
                                        ? `Row ${selectedRow + 1}`
                                        : `${cellRefLabel || 'A1'}${selectedCell?.text?.startsWith('=') ? `: ${selectedCell.text}` : ''}`}
                        </span>
                    </div>

                    {/* Font Family Selector */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setShowFontMenu(v => !v);
                                setShowSizeMenu(false);
                                setShowColorMenu(false);
                                setShowBgMenu(false);
                            }}
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] transition"
                            title="Font Family"
                        >
                            <span className="capitalize">{selectedCell?.fontFamily || 'Sans'}</span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>
                        {showFontMenu && (
                            <div className="absolute bottom-full left-0 mb-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 flex flex-col min-w-[110px]">
                                {[
                                    { id: 'sans', label: 'Sans (Inter)' },
                                    { id: 'serif', label: 'Serif (Times)' },
                                    { id: 'mono', label: 'Mono (Code)' },
                                    { id: 'handwriting', label: 'Script (Hand)' }
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => {
                                            updateSelectedCell({ fontFamily: f.id });
                                            setShowFontMenu(false);
                                        }}
                                        className={`px-2.5 py-1 text-left text-xs hover:bg-slate-800 transition ${
                                            (selectedCell?.fontFamily || 'sans') === f.id ? 'text-indigo-400 font-bold bg-slate-800/60' : 'text-slate-300'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Font Size Selector */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setShowSizeMenu(v => !v);
                                setShowFontMenu(false);
                                setShowColorMenu(false);
                                setShowBgMenu(false);
                            }}
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-mono transition"
                            title="Font Size"
                        >
                            <span>{selectedCell?.fontSize || 12}px</span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>
                        {showSizeMenu && (
                            <div className="absolute bottom-full left-0 mb-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 flex flex-col min-w-[70px]">
                                {[10, 11, 12, 14, 16, 18, 20, 24].map(sz => (
                                    <button
                                        key={sz}
                                        type="button"
                                        onClick={() => {
                                            updateSelectedCell({ fontSize: sz });
                                            setShowSizeMenu(false);
                                        }}
                                        className={`px-2.5 py-1 text-left text-xs font-mono hover:bg-slate-800 transition ${
                                            (selectedCell?.fontSize || 12) === sz ? 'text-indigo-400 font-bold bg-slate-800/60' : 'text-slate-300'
                                        }`}
                                    >
                                        {sz}px
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="h-4 w-px bg-slate-700 mx-0.5" />

                    {/* Bold Toggle */}
                    <button
                        type="button"
                        onClick={() => updateSelectedCell({ bold: !selectedCell?.bold })}
                        className={`p-1 rounded-lg transition ${
                            selectedCell?.bold ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Bold (Ctrl+B)"
                    >
                        <Bold className="w-3.5 h-3.5" />
                    </button>

                    {/* Italic Toggle */}
                    <button
                        type="button"
                        onClick={() => updateSelectedCell({ italic: !selectedCell?.italic })}
                        className={`p-1 rounded-lg transition ${
                            selectedCell?.italic ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Italic (Ctrl+I)"
                    >
                        <Italic className="w-3.5 h-3.5" />
                    </button>

                    {/* Underline Toggle */}
                    <button
                        type="button"
                        onClick={() => updateSelectedCell({ underline: !selectedCell?.underline })}
                        className={`p-1 rounded-lg transition ${
                            selectedCell?.underline ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Underline (Ctrl+U)"
                    >
                        <Underline className="w-3.5 h-3.5" />
                    </button>

                    {/* Strikethrough Toggle */}
                    <button
                        type="button"
                        onClick={() => updateSelectedCell({ strikethrough: !selectedCell?.strikethrough })}
                        className={`p-1 rounded-lg transition ${
                            selectedCell?.strikethrough ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Strikethrough"
                    >
                        <Strikethrough className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-4 w-px bg-slate-700 mx-0.5" />

                    {/* Horizontal Alignment Toggles */}
                    <button
                        type="button"
                        onClick={() => updateSelectedCell({ align: 'left' })}
                        className={`p-1 rounded-lg transition ${
                            (selectedCell?.align || 'left') === 'left' ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Align Left"
                    >
                        <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => updateSelectedCell({ align: 'center' })}
                        className={`p-1 rounded-lg transition ${
                            selectedCell?.align === 'center' ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Align Center"
                    >
                        <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => updateSelectedCell({ align: 'right' })}
                        className={`p-1 rounded-lg transition ${
                            selectedCell?.align === 'right' ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Align Right"
                    >
                        <AlignRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-4 w-px bg-slate-700 mx-0.5" />

                    {/* Text Color Picker */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setShowColorMenu(v => !v);
                                setShowBgMenu(false);
                                setShowFontMenu(false);
                                setShowSizeMenu(false);
                            }}
                            className="flex items-center gap-1 p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition"
                            title="Text Color"
                        >
                            <span className="font-bold text-xs underline" style={{ color: selectedCell?.color || '#ffffff' }}>A</span>
                            <div className="w-2 h-2 rounded-full border border-slate-600" style={{ backgroundColor: selectedCell?.color || '#ffffff' }} />
                        </button>
                        {showColorMenu && (
                            <div className="absolute bottom-full left-0 mb-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 grid grid-cols-6 gap-1 min-w-[140px]">
                                {['#ffffff', '#f8fafc', '#94a3b8', '#f87171', '#fb923c', '#fbbf24', '#4ade80', '#22d3ee', '#818cf8', '#c084fc', '#f472b6', '#000000'].map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => {
                                            updateSelectedCell({ color: c });
                                            setShowColorMenu(false);
                                        }}
                                        className="w-5 h-5 rounded-md border border-slate-700 hover:scale-110 transition"
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Comprehensive Cell Fill Background Color Palette */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setShowBgMenu(v => !v);
                                setShowColorMenu(false);
                                setShowFontMenu(false);
                                setShowSizeMenu(false);
                            }}
                            className="flex items-center gap-1 p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition"
                            title="Cell Background Color Palette"
                        >
                            <Palette className="w-3.5 h-3.5" style={{ color: selectedCell?.bg || '#38bdf8' }} />
                            <div 
                                className="w-2 h-2 rounded-full border border-slate-600" 
                                style={{ backgroundColor: selectedCell?.bg || 'transparent' }} 
                            />
                        </button>
                        {showBgMenu && (
                            <div 
                                className="absolute bottom-full left-0 mb-1.5 bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 w-72 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                                    <div className="flex items-center gap-1.5">
                                        <Palette className="w-3.5 h-3.5 text-indigo-400" />
                                        <span className="font-semibold text-xs text-slate-200">Cell Color Palette</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            updateSelectedCell({ bg: '' });
                                            setShowBgMenu(false);
                                        }}
                                        className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 rounded border border-slate-700 transition"
                                        title="Clear background fill"
                                    >
                                        ∅ No Fill
                                    </button>
                                </div>

                                {/* Opacity / Tint Presets */}
                                <div className="flex items-center justify-between mb-2.5 px-1 py-1 bg-slate-900 rounded-lg border border-slate-800 text-[10px]">
                                    <span className="text-slate-400 font-medium pl-1">Tint:</span>
                                    <div className="flex items-center gap-1">
                                        {[
                                            { label: '15%', val: 0.15 },
                                            { label: '35%', val: 0.35 },
                                            { label: '65%', val: 0.65 },
                                            { label: '100%', val: 1.0 }
                                        ].map(op => (
                                            <button
                                                key={op.label}
                                                type="button"
                                                onClick={() => setBgOpacity(op.val)}
                                                className={`px-1.5 py-0.5 rounded font-mono transition ${
                                                    bgOpacity === op.val 
                                                        ? 'bg-indigo-600 text-white font-bold shadow-xs' 
                                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                }`}
                                            >
                                                {op.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Swatch Families */}
                                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                                    {COLOR_FAMILIES.map(fam => (
                                        <div key={fam.name} className="flex items-center gap-1">
                                            <div className="grid grid-cols-11 gap-1 w-full">
                                                {fam.colors.map(col => {
                                                    const finalCol = hexToRgba(col, bgOpacity);
                                                    const isCurrent = selectedCell?.bg === finalCol || selectedCell?.bg === col;
                                                    return (
                                                        <button
                                                            key={col}
                                                            type="button"
                                                            onClick={() => {
                                                                updateSelectedCell({ bg: finalCol });
                                                                setShowBgMenu(false);
                                                            }}
                                                            className={`w-5 h-5 rounded-md border border-slate-700/60 hover:scale-125 transition-transform relative ${
                                                                isCurrent ? 'ring-2 ring-indigo-400 scale-110 z-10' : ''
                                                            }`}
                                                            style={{ backgroundColor: col }}
                                                            title={`${fam.name} (${col})`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Custom Hex / Color Input */}
                                <div className="flex items-center gap-1.5 pt-2.5 mt-2 border-t border-slate-800">
                                    <label className="relative cursor-pointer shrink-0">
                                        <input
                                            type="color"
                                            value={customHexInput.startsWith('#') ? customHexInput : '#6366f1'}
                                            onChange={e => {
                                                setCustomHexInput(e.target.value);
                                                updateSelectedCell({ bg: hexToRgba(e.target.value, bgOpacity) });
                                            }}
                                            className="sr-only"
                                        />
                                        <div 
                                            className="w-6 h-6 rounded-lg border border-slate-700 shadow-xs hover:scale-105 transition"
                                            style={{ backgroundColor: customHexInput || '#6366f1' }}
                                            title="Pick custom color wheel"
                                        />
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="#hex color"
                                        value={customHexInput}
                                        onChange={e => setCustomHexInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && customHexInput) {
                                                updateSelectedCell({ bg: hexToRgba(customHexInput, bgOpacity) });
                                                setShowBgMenu(false);
                                            }
                                        }}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-[11px] font-mono outline-hidden focus:border-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (customHexInput) {
                                                updateSelectedCell({ bg: hexToRgba(customHexInput, bgOpacity) });
                                                setShowBgMenu(false);
                                            }
                                        }}
                                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold shadow transition"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Table Transparency / Opacity Control */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setShowOpacityMenu(v => !v);
                                setShowBgMenu(false);
                                setShowColorMenu(false);
                                setShowFontMenu(false);
                                setShowSizeMenu(false);
                            }}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg transition ${
                                showOpacityMenu ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                            }`}
                            title="Table Opacity / Transparency (Default: 100% Opaque)"
                        >
                            <Droplet className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="font-mono text-[10px]">{Math.round(tableOpacity * 100)}%</span>
                        </button>
                        {showOpacityMenu && (
                            <div
                                className="absolute bottom-full left-0 mb-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2.5 z-50 flex flex-col gap-2 min-w-[150px] animate-in fade-in zoom-in-95 duration-100"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200">
                                    <span>Table Opacity</span>
                                    <span className="font-mono text-cyan-400">{Math.round(tableOpacity * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    step="5"
                                    value={Math.round(tableOpacity * 100)}
                                    onChange={(e) => {
                                        const newOp = parseFloat(e.target.value) / 100;
                                        onUpdate({ ...table, opacity: newOp });
                                    }}
                                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                                />
                                <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-800 text-[10px] font-mono">
                                    {[
                                        { label: '100%', val: 1.0 },
                                        { label: '85%', val: 0.85 },
                                        { label: '50%', val: 0.50 },
                                        { label: '25%', val: 0.25 }
                                    ].map(preset => (
                                        <button
                                            key={preset.label}
                                            type="button"
                                            onClick={() => {
                                                onUpdate({ ...table, opacity: preset.val });
                                                setShowOpacityMenu(false);
                                            }}
                                            className={`px-1 py-0.5 rounded text-center transition ${
                                                Math.abs(tableOpacity - preset.val) < 0.05
                                                    ? 'bg-indigo-600 text-white font-bold'
                                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-4 w-px bg-slate-700 mx-0.5" />

                    {/* Text Wrap Toggle */}
                    <button
                        type="button"
                        onClick={() => updateSelectedCell({ wrap: selectedCell?.wrap === false ? true : false })}
                        className={`p-1 rounded-lg transition ${
                            selectedCell?.wrap !== false ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Toggle Text Wrap"
                    >
                        <WrapText className="w-3.5 h-3.5" />
                    </button>

                    {/* KaTeX Formula / Math Mode Toggle */}
                    <button
                        type="button"
                        onClick={() => {
                            if (selectedCell?.math) {
                                updateSelectedCell({ math: '' });
                            } else {
                                updateSelectedCell({ math: selectedCell?.text || 'x^2 + y^2 = r^2' });
                            }
                        }}
                        className={`px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition ${
                            selectedCell?.math ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Toggle KaTeX Formula Mode"
                    >
                        f(x)
                    </button>

                    {/* Formula Function List Dropdown (Displays above sheet and opens downwards) */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setShowFunctionMenu(v => !v);
                                setShowFontMenu(false);
                                setShowSizeMenu(false);
                                setShowColorMenu(false);
                                setShowBgMenu(false);
                                setShowOpacityMenu(false);
                            }}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition ${
                                showFunctionMenu ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-800 text-indigo-300 hover:text-white'
                            }`}
                            title="Formula & Functions Catalog (Opens downwards above sheet)"
                        >
                            <span>fx</span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>
                        {showFunctionMenu && (
                            <div 
                                className="absolute top-full left-0 mt-1.5 bg-slate-950 border border-slate-700/80 rounded-xl shadow-2xl p-2.5 z-[100] w-80 max-w-[95vw] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-2"
                                onClick={e => e.stopPropagation()}
                                onPointerDown={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                                        <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                                        <span>Formula Functions Catalog</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowFunctionMenu(false)}
                                        className="p-0.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Search Input */}
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={funcSearch}
                                        onChange={(e) => setFuncSearch(e.target.value)}
                                        placeholder="Search SUM, AVERAGE, SIN, OHM..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
                                        autoFocus
                                    />
                                </div>

                                {/* Function list */}
                                <div className="space-y-1 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                                    {filteredFunctions.length === 0 ? (
                                        <div className="text-[11px] text-slate-500 text-center py-3">No matching functions found</div>
                                    ) : (
                                        filteredFunctions.map((fn) => (
                                            <button
                                                key={fn.name}
                                                type="button"
                                                onClick={() => {
                                                    insertFunctionIntoActiveCell(fn.name);
                                                    setShowFunctionMenu(false);
                                                }}
                                                className="w-full flex flex-col text-left px-2 py-1.5 rounded-lg hover:bg-indigo-600/30 hover:border-indigo-500/50 border border-transparent transition group"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono font-bold text-xs text-indigo-300 group-hover:text-white">{fn.name}</span>
                                                    <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-bold tracking-wider">{fn.category}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 line-clamp-1">{fn.description || fn.signature}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Advanced Modal Editor Trigger (doodle, image) */}
                    <button
                        type="button"
                        onClick={() => {
                            const [r, c] = selectedCellKey ? selectedCellKey.split('-').map(Number) : [0, 0];
                            handleOpenCellEditor(r, c);
                        }}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                        title="Open Advanced Rich Cell Editor (Doodle, Image, Formulas)"
                    >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    </button>

                    <div className="h-4 w-px bg-slate-700 mx-0.5" />

                    {/* Copy Table Data TSV */}
                    <button
                        type="button"
                        onClick={copyTableDataToClipboard}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 rounded-lg transition"
                        title="Copy Table Data (TSV / Excel / Word)"
                    >
                        <Clipboard className="w-3.5 h-3.5" />
                    </button>

                    {/* Lock / Unlock */}
                    <button
                        type="button"
                        onClick={() => onUpdate({ ...table, isLocked: !isLocked })}
                        className={`p-1 rounded-lg transition ${
                            isLocked ? 'bg-amber-500/20 text-amber-300' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title={isLocked ? "Unlock Table" : "Lock Table"}
                    >
                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>

                    {/* Duplicate Table */}
                    <button
                        type="button"
                        onClick={() => onDuplicate?.(tableId)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                        title="Duplicate Table"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Layer Bring Forward */}
                    <button
                        type="button"
                        onClick={() => onBringForward?.(tableId)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                        title="Bring to Front"
                    >
                        <ChevronsUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Layer Send Backward */}
                    <button
                        type="button"
                        onClick={() => onSendBackward?.(tableId)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                        title="Send to Back"
                    >
                        <ChevronsDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Table */}
                    <button
                        type="button"
                        onClick={() => onDelete?.(tableId)}
                        className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition"
                        title="Delete Table"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* 2. Table Grid DOM Structure with Sticky Headers & High-Visibility Edge Scrollbars */}
            <div 
                className="whiteboard-table-viewport relative overflow-auto rounded-xl shadow-lg border"
                style={{
                    width: containerWidth,
                    height: containerHeight,
                    maxWidth: containerWidth,
                    maxHeight: containerHeight,
                    borderColor: borderColor,
                    borderWidth: borderWidth,
                    backgroundColor: cellBg,
                    opacity: tableOpacity
                }}
            >
                <style>{`
                    .whiteboard-table-viewport {
                        scrollbar-width: none;
                    }
                    .whiteboard-table-viewport:hover {
                        scrollbar-width: thin;
                    }
                    .whiteboard-table-viewport::-webkit-scrollbar {
                        width: 9px;
                        height: 9px;
                    }
                    .whiteboard-table-viewport::-webkit-scrollbar-track {
                        background: transparent;
                        border-radius: 4px;
                    }
                    .whiteboard-table-viewport::-webkit-scrollbar-thumb {
                        background: transparent;
                        border-radius: 4px;
                        transition: background 0.2s ease-in-out;
                    }
                    .whiteboard-table-viewport:hover::-webkit-scrollbar-track {
                        background: rgba(15, 23, 42, 0.45);
                    }
                    .whiteboard-table-viewport:hover::-webkit-scrollbar-thumb {
                        background: rgba(100, 116, 139, 0.75);
                        border: 1px solid rgba(51, 65, 85, 0.4);
                    }
                    .whiteboard-table-viewport:hover::-webkit-scrollbar-thumb:hover {
                        background: rgba(99, 102, 241, 0.95);
                    }
                    .whiteboard-table-viewport::-webkit-scrollbar-corner {
                        background: transparent;
                    }
                `}</style>

                {/* Inner Content Sized to Full Grid Dimensions */}
                <div style={{ width: gridWidth, minWidth: gridWidth, height: gridHeight, minHeight: gridHeight }}>
                    {/* Top Row: Corner Box (sticky top-0 left-0) + Column Headers (sticky top-0) */}
                    <div className="flex sticky top-0 z-30 bg-[#f8fafc]" style={{ height: HEADER_HEIGHT, width: gridWidth }}>
                        {/* Top-Left Corner Box (Selects All Cells / Drag to Move) */}
                        <div
                            className={`table-corner-box shrink-0 sticky left-0 z-40 flex items-center justify-center border-r border-b cursor-grab active:cursor-grabbing select-none transition ${
                                selectionMode === 'ALL'
                                    ? 'bg-indigo-100 text-indigo-700 font-extrabold border-indigo-400'
                                    : 'bg-[#f8fafc] hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-[#cbd5e1]'
                            }`}
                            style={{
                                width: CORNER_WIDTH,
                                height: HEADER_HEIGHT,
                                borderColor: '#cbd5e1'
                            }}
                            onClick={handleSelectAll}
                            onPointerDown={handleMovePointerDown}
                            title="Click to select all cells / Drag to move table"
                        >
                            <Move className="w-3.5 h-3.5" />
                        </div>

                        {/* Column Labels Strip (A, B, C...) */}
                        <div className="flex flex-1 overflow-hidden" style={{ height: HEADER_HEIGHT }}>
                            {Array.from({ length: cols }).map((_, cIdx) => {
                                const cWidth = colWidths[cIdx] || 100;
                                const isColSel = selectionMode === 'COL' && selectedCol === cIdx;
                                const isAllSel = selectionMode === 'ALL';
                                return (
                                    <div
                                        key={`col-hdr-${cIdx}`}
                                        onClick={(e) => handleSelectCol(cIdx, e)}
                                        className={`table-header-col relative flex items-center justify-center text-[11px] font-bold border-r border-b select-none transition ${
                                            isColSel || isAllSel
                                                ? 'bg-indigo-100 text-indigo-700 font-extrabold border-indigo-400'
                                                : 'bg-[#f8fafc] text-slate-600 hover:bg-slate-200 hover:text-slate-900 border-[#cbd5e1]'
                                        }`}
                                        style={{
                                            width: cWidth,
                                            minWidth: cWidth,
                                            height: HEADER_HEIGHT,
                                            borderColor: '#cbd5e1'
                                        }}
                                        title={`Select Column ${getColLabel(cIdx)}`}
                                    >
                                        <span>{getColLabel(cIdx)}</span>

                                        {/* Column divider drag resize & double-click auto-fit */}
                                        <div
                                            onPointerDown={(e) => startColResize(cIdx, e)}
                                            onDoubleClick={(e) => autoFitColWidth(cIdx, e)}
                                            className="absolute top-0 right-0 w-2.5 h-full -mr-1.5 cursor-col-resize z-20 hover:bg-indigo-500/70 transition-colors"
                                            title="Drag to resize column width; Double-click to auto-fit to content"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bottom Body: Row Headers (sticky left-0) + Cells Grid */}
                    <div className="flex" style={{ height: totalHeight, width: gridWidth }}>
                        {/* Row Headers Strip (1, 2, 3...) */}
                        <div className="flex flex-col shrink-0 sticky left-0 z-20 bg-[#f8fafc]" style={{ width: CORNER_WIDTH, height: totalHeight }}>
                            {Array.from({ length: rows }).map((_, rIdx) => {
                                const rHeight = rowHeights[rIdx] || 24;
                                const isRowSel = selectionMode === 'ROW' && selectedRow === rIdx;
                                const isAllSel = selectionMode === 'ALL';
                                return (
                                    <div
                                        key={`row-hdr-${rIdx}`}
                                        onClick={(e) => handleSelectRow(rIdx, e)}
                                        className={`table-header-row relative flex items-center justify-center text-[10px] font-mono font-bold border-r border-b select-none transition ${
                                            isRowSel || isAllSel
                                                ? 'bg-indigo-100 text-indigo-700 font-extrabold border-indigo-400'
                                                : 'bg-[#f8fafc] text-slate-600 hover:bg-slate-200 hover:text-slate-900 border-[#cbd5e1]'
                                        }`}
                                        style={{
                                            width: CORNER_WIDTH,
                                            height: rHeight,
                                            minHeight: rHeight,
                                            borderColor: '#cbd5e1'
                                        }}
                                        title={`Select Row ${rIdx + 1}`}
                                    >
                                        <span>{rIdx + 1}</span>

                                        {/* Row divider drag resize & double-click auto-fit */}
                                        <div
                                            onPointerDown={(e) => startRowResize(rIdx, e)}
                                            onDoubleClick={(e) => autoFitRowHeight(rIdx, e)}
                                            className="absolute bottom-0 left-0 w-full h-2.5 -mb-1.5 cursor-row-resize z-20 hover:bg-indigo-500/70 transition-colors"
                                            title="Drag to resize row height; Double-click to auto-fit to content"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Cells Grid */}
                        <div className="flex flex-col flex-1 z-10" style={{ width: totalWidth, height: totalHeight }}>
                        {Array.from({ length: rows }).map((_, rIdx) => {
                            const isHeader = hasHeaderRow && rIdx === 0;
                            const rHeight = rowHeights[rIdx] || 24;

                            return (
                                <div 
                                    key={`row-${rIdx}`} 
                                    className={`flex relative w-full ${isInlineEditing && selectedCellKey?.startsWith(`${rIdx}-`) ? 'z-40 overflow-visible' : ''}`}
                                    style={{ height: rHeight }}
                                >
                                    {Array.from({ length: cols }).map((_, cIdx) => {
                                        const cWidth = colWidths[cIdx] || 100;
                                        const cellKey = `${rIdx}-${cIdx}`;
                                        const cell = cells[cellKey] || {};
                                        const inSelection = isCellSelected(rIdx, cIdx);
                                        const isCurrentActiveCell = isSelected && selectedCellKey === cellKey;
                                        const isEditingThisCell = isInlineEditing && isCurrentActiveCell;

                                        const cellFontSize = cell.fontSize || (isHeader ? 12 : 11);
                                        const cellFontFamily = cell.fontFamily || 'sans';
                                        const refHighlightColor = referencedCellsMap.get(cellKey);
                                        const cellBold = cell.bold !== undefined ? cell.bold : isHeader;
                                        const cellItalic = Boolean(cell.italic);
                                        const cellUnderline = Boolean(cell.underline);
                                        const cellStrikethrough = Boolean(cell.strikethrough);
                                        const cellAlign = cell.align || (isHeader ? 'center' : 'left');
                                        const cellColor = cell.color || (isHeader ? headerText : cellText);
                                        const cellCustomBg = cell.bg;
                                        const cellWrap = cell.wrap !== false;

                                        return (
                                            <div
                                                key={`cell-${cellKey}`}
                                                className={`table-cell relative flex flex-col justify-center px-1.5 py-0.5 text-xs transition-all border-r border-b ${
                                                    isEditingThisCell ? 'overflow-visible z-50' : 'overflow-hidden'
                                                } ${
                                                    inSelection
                                                        ? 'bg-indigo-500/20'
                                                        : 'hover:outline-dashed hover:outline-1 hover:outline-indigo-400 cursor-pointer'
                                                }`}
                                                style={{
                                                    width: cWidth,
                                                    height: rHeight,
                                                    borderColor: borderColor,
                                                    backgroundColor: inSelection
                                                        ? 'rgba(99, 102, 241, 0.22)'
                                                        : (cellCustomBg || (isHeader ? headerBg : cellBg)),
                                                    color: cellColor,
                                                    outline: isEditingThisCell 
                                                        ? '2px solid #2563eb' 
                                                        : (refHighlightColor 
                                                            ? `2px dashed ${refHighlightColor}` 
                                                            : (isCurrentActiveCell ? '2px solid #818cf8' : 'none')),
                                                    outlineOffset: '-1px',
                                                    boxShadow: refHighlightColor && !isEditingThisCell ? `inset 0 0 0 1px ${refHighlightColor}40` : undefined
                                                }}
                                                onClick={(e) => handleSelectCell(rIdx, cIdx, e)}
                                                onDoubleClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelect?.(tableId);
                                                    startInlineEdit(rIdx, cIdx);
                                                }}
                                                title="Click to select; Double-click or type to edit inline"
                                            >
                                                {/* Inline Text Area Editor with STEM Autocomplete */}
                                                {isEditingThisCell ? (
                                                    <div className="relative w-full h-full flex items-center">
                                                        <textarea
                                                            ref={inlineInputRef}
                                                            value={inlineText}
                                                            onChange={(e) => {
                                                                setInlineText(e.target.value);
                                                                setIsAutocompleteDismissed(false);
                                                                setAutocompleteSelectedIdx(0);
                                                            }}
                                                            onBlur={() => {
                                                                setTimeout(() => {
                                                                    commitInlineEdit();
                                                                }, 160);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (formulaSuggestions.length > 0) {
                                                                    if (e.key === 'ArrowDown') {
                                                                        e.preventDefault();
                                                                        setAutocompleteSelectedIdx(prev => (prev + 1) % formulaSuggestions.length);
                                                                        return;
                                                                    } else if (e.key === 'ArrowUp') {
                                                                        e.preventDefault();
                                                                        setAutocompleteSelectedIdx(prev => (prev - 1 + formulaSuggestions.length) % formulaSuggestions.length);
                                                                        return;
                                                                    } else if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                                                                        if (formulaSuggestions[autocompleteSelectedIdx]) {
                                                                            e.preventDefault();
                                                                            applyAutocompleteSuggestion(formulaSuggestions[autocompleteSelectedIdx]);
                                                                            return;
                                                                        }
                                                                    } else if (e.key === 'Escape') {
                                                                        e.preventDefault();
                                                                        setIsAutocompleteDismissed(true);
                                                                        return;
                                                                    }
                                                                }

                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    commitAndNavigate('down');
                                                                } else if (e.key === 'Tab') {
                                                                    e.preventDefault();
                                                                    commitAndNavigate(e.shiftKey ? 'left' : 'right');
                                                                } else if (e.key === 'Escape') {
                                                                    e.preventDefault();
                                                                    cancelInlineEdit();
                                                                }
                                                            }}
                                                            className="w-full h-full bg-transparent text-inherit p-0 m-0 border-0 outline-none resize-none leading-tight overflow-hidden"
                                                            style={{
                                                                backgroundColor: 'transparent',
                                                                fontSize: `${cellFontSize}px`,
                                                                fontFamily: getFontFamilyCss(cellFontFamily),
                                                                fontWeight: cellBold ? 'bold' : 'normal',
                                                                fontStyle: cellItalic ? 'italic' : 'normal',
                                                                textDecoration: [cellUnderline ? 'underline' : '', cellStrikethrough ? 'line-through' : ''].filter(Boolean).join(' ') || 'none',
                                                                textAlign: cellAlign,
                                                                color: cellColor
                                                            }}
                                                            autoFocus
                                                        />

                                                        {/* STEM Formula Autocomplete Menu */}
                                                        {formulaSuggestions.length > 0 && (
                                                            <div
                                                                className={`absolute left-0 ${rIdx >= rows - 2 && rIdx > 0 ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]'} z-[9999] bg-slate-950/98 border border-slate-700/90 rounded-xl shadow-2xl p-1.5 w-72 max-w-[90vw] max-h-56 overflow-y-auto custom-scrollbar backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 pointer-events-auto`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onMouseDown={(e) => e.preventDefault()}
                                                            >
                                                                <div className="flex items-center justify-between px-1.5 py-0.5 mb-1 text-[10px] font-semibold text-slate-400 border-b border-slate-800">
                                                                    <span className="flex items-center gap-1">⚡ STEM Formulas</span>
                                                                    <span className="text-[9px] text-slate-500 font-mono">Tab/Enter to apply</span>
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    {formulaSuggestions.map((item, idx) => {
                                                                        const isSelected = idx === autocompleteSelectedIdx;
                                                                        return (
                                                                            <div
                                                                                key={item.name}
                                                                                onMouseDown={(e) => {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    applyAutocompleteSuggestion(item);
                                                                                }}
                                                                                onMouseEnter={() => setAutocompleteSelectedIdx(idx)}
                                                                                className={`flex flex-col gap-0.5 px-2 py-1 rounded-lg cursor-pointer transition text-left ${
                                                                                    isSelected ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-800/80 text-slate-300'
                                                                                }`}
                                                                            >
                                                                                <div className="flex items-center justify-between gap-1">
                                                                                    <div className="flex items-center gap-1 font-mono font-bold text-[11px] truncate">
                                                                                        <span>{item.icon}</span>
                                                                                        <span className={isSelected ? 'text-white' : 'text-indigo-300'}>{item.signature}</span>
                                                                                    </div>
                                                                                    <span className={`text-[8px] px-1 py-0.2 rounded font-sans uppercase font-bold tracking-wider shrink-0 ${
                                                                                        item.category === 'Physics' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                                                                                        item.category === 'Chemistry' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                                                                        item.category === 'Biology' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                                                                        'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                                                    }`}>
                                                                                        {item.category.slice(0, 4)}
                                                                                    </span>
                                                                                </div>
                                                                                <div className={`text-[10px] leading-tight truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                                                    {item.description}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* Cell Content: Image */}
                                                        {cell.image && (
                                                            <div className="w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden mb-1">
                                                                <img 
                                                                    src={cell.image} 
                                                                    alt="Cell media" 
                                                                    className="max-w-full max-h-full object-contain rounded-sm"
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Cell Content: In-Cell Ink / Doodle */}
                                                        {cell.inkData && (
                                                            <div className="w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden mb-1">
                                                                <img 
                                                                    src={cell.inkData} 
                                                                    alt="Cell doodle" 
                                                                    className="max-w-full max-h-full object-contain"
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Cell Content: Math Formula (KaTeX) */}
                                                        {cell.math && (
                                                            <div className="w-full overflow-x-auto overflow-y-hidden py-0.5 text-center leading-snug">
                                                                <MathRenderer 
                                                                    content={`$$${cell.math}$$`} 
                                                                    inline={false}
                                                                    textClassName="text-indigo-200"
                                                                    size="sm"
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Cell Content: Text or Evaluated Formula */}
                                                        {cell.text && (() => {
                                                            const isFormula = String(cell.text).startsWith('=');
                                                            const displayVal = isFormula
                                                                ? evaluateCellFormula(cell.text, cells, rows, cols, cellKey)
                                                                : cell.text;
                                                            const isFormulaErr = isFormula && typeof displayVal === 'string' && displayVal.startsWith('#');

                                                            return (
                                                                <div 
                                                                    className={`w-full leading-tight ${cellWrap ? 'break-words whitespace-pre-wrap' : 'truncate whitespace-nowrap'} ${
                                                                        isFormulaErr ? 'text-rose-400 font-bold' : ''
                                                                    }`}
                                                                    style={{
                                                                        fontSize: `${cellFontSize}px`,
                                                                        fontFamily: getFontFamilyCss(cellFontFamily),
                                                                        fontWeight: cellBold ? 'bold' : 'normal',
                                                                        fontStyle: cellItalic ? 'italic' : 'normal',
                                                                        textDecoration: [cellUnderline ? 'underline' : '', cellStrikethrough ? 'line-through' : ''].filter(Boolean).join(' ') || 'none',
                                                                        textAlign: isFormula && !cell.align ? 'right' : cellAlign,
                                                                        color: isFormulaErr ? '#fb7185' : cellColor
                                                                    }}
                                                                    title={isFormula ? `${cell.text} = ${displayVal}` : cell.text}
                                                                >
                                                                    {String(displayVal)}
                                                                </div>
                                                            );
                                                        })()}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>

            {/* 4. 8-Point Outer Resize Handles */}
            {isSelected && !isLocked && (
                <>
                    {/* NW */}
                    <div
                        onPointerDown={(e) => startOuterResize('nw', e)}
                        className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-[2px] cursor-nwse-resize z-50 hover:scale-125 transition-transform shadow-xs"
                        title="Resize Table"
                    />
                    {/* N */}
                    <div
                        onPointerDown={(e) => startOuterResize('n', e)}
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-indigo-600 rounded-[2px] cursor-ns-resize z-50 hover:scale-125 transition-transform shadow-xs"
                        title="Resize Table Height"
                    />
                    {/* NE */}
                    <div
                        onPointerDown={(e) => startOuterResize('ne', e)}
                        className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-[2px] cursor-nesw-resize z-50 hover:scale-125 transition-transform shadow-xs"
                        title="Resize Table"
                    />
                    {/* E */}
                    <div
                        onPointerDown={(e) => startOuterResize('e', e)}
                        className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-[2px] cursor-ew-resize z-50 hover:scale-125 transition-transform shadow-xs"
                        title="Resize Table Width"
                    />
                    {/* SE */}
                    <div
                        onPointerDown={(e) => startOuterResize('se', e)}
                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-[2px] cursor-nwse-resize z-50 hover:scale-125 transition-transform shadow-xs"
                        title="Resize Table"
                    />
                    {/* S */}
                    <div
                        onPointerDown={(e) => startOuterResize('s', e)}
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-indigo-600 rounded-[2px] cursor-ns-resize z-50 hover:scale-125 transition-transform shadow-xs"
                        title="Resize Table Height"
                    />
                    {/* SW */}
                    <div
                        onPointerDown={(e) => startOuterResize('sw', e)}
                        className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-[2px] cursor-nesw-resize z-50 hover:scale-125 transition-transform shadow-xs"
                        title="Resize Table"
                    />
                    {/* W */}
                    <div
                        onPointerDown={(e) => startOuterResize('w', e)}
                        className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-[2px] cursor-ew-resize z-50 hover:scale-125 transition-transform shadow-xs"
                        title="Resize Table Width"
                    />
                </>
            )}

            {/* 5. Right-Side Add / Remove Column Controls */}
            {isSelected && (
                <div 
                    className="absolute -right-7 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-30 pointer-events-auto"
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={handleAddColumn}
                        className="p-1 bg-slate-900 border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 text-slate-300 hover:text-white rounded-md shadow transition"
                        title="Add Column to Right"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                    {cols > 1 && (
                        <button
                            type="button"
                            onClick={handleRemoveColumn}
                            className="p-1 bg-slate-900 border border-slate-700 hover:bg-red-600 hover:border-red-500 text-slate-300 hover:text-white rounded-md shadow transition"
                            title="Remove Right Column"
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}

            {/* 6. Bottom Add / Remove Row Controls */}
            {isSelected && (
                <div 
                    className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-1 z-30 pointer-events-auto"
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={handleAddRow}
                        className="px-2 py-0.5 bg-slate-900 border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 text-slate-300 hover:text-white rounded-md shadow text-[11px] font-bold flex items-center gap-1 transition"
                        title="Add Row to Bottom"
                    >
                        <Plus className="w-3 h-3" /> Add Row
                    </button>
                    {rows > 1 && (
                        <button
                            type="button"
                            onClick={handleRemoveRow}
                            className="p-1 bg-slate-900 border border-slate-700 hover:bg-red-600 hover:border-red-500 text-slate-300 hover:text-white rounded-md shadow transition"
                            title="Remove Bottom Row"
                        >
                            <Minus className="w-3 h-3" />
                        </button>
                    )}
                </div>
            )}

            {/* 7. Rich Cell Editor Modal (for Doodle, Image, LaTeX) */}
            {activeCellKey && (
                <div 
                    className="fixed inset-0 z-110 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 pointer-events-auto"
                    onClick={() => setActiveCellKey(null)}
                >
                    <div 
                        className="bg-slate-900 border-2 border-indigo-500/80 rounded-2xl shadow-2xl p-5 w-full max-w-lg text-slate-200 select-none animate-in zoom-in-95 duration-100"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Editor Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
                                    <Edit3 className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Edit Table Cell [{activeCellKey}]</h3>
                                    <p className="text-[11px] text-slate-400">Embed text, KaTeX formulas, images, or drawings</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveCellKey(null)}
                                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex items-center gap-1 p-1 bg-slate-950/70 rounded-xl border border-slate-800 my-3">
                            <button
                                type="button"
                                onClick={() => setEditorTab('text')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                                    editorTab === 'text' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Type className="w-3.5 h-3.5" />
                                Text
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditorTab('math')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                                    editorTab === 'math' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Calculator className="w-3.5 h-3.5" />
                                Math
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditorTab('image')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                                    editorTab === 'image' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <ImageIcon className="w-3.5 h-3.5" />
                                Image
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditorTab('doodle')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                                    editorTab === 'doodle' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                Doodle
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditorTab('color')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                                    editorTab === 'color' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Palette className="w-3.5 h-3.5" />
                                Tint
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-[160px] max-h-[260px] overflow-y-auto">
                            {/* 1. Text Tab */}
                            {editorTab === 'text' && (
                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-slate-300">
                                        Cell Text Content (auto-wraps)
                                    </label>
                                    <textarea
                                        value={editText}
                                        onChange={e => setEditText(e.target.value)}
                                        placeholder="Type cell notes, descriptions, labels..."
                                        rows={5}
                                        className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-white text-xs leading-relaxed focus:outline-hidden focus:border-indigo-500 font-sans resize-none"
                                    />
                                </div>
                            )}

                            {/* 2. Math Formula Tab */}
                            {editorTab === 'math' && (
                                <div className="space-y-3">
                                    <label className="block text-xs font-medium text-slate-300">
                                        LaTeX Math Formula (e.g. <code className="text-indigo-400">E = mc^2</code>, <code className="text-indigo-400">\frac{'{a}'}{'{b}'}</code>)
                                    </label>
                                    <input
                                        type="text"
                                        value={editMath}
                                        onChange={e => setEditMath(e.target.value)}
                                        placeholder="f(x) = \int_{0}^{\infty} e^{-x^2} dx"
                                        className="w-full px-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-hidden focus:border-indigo-500"
                                    />

                                    {/* Live KaTeX Preview */}
                                    <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 text-center min-h-[50px] flex items-center justify-center">
                                        {editMath ? (
                                            <MathRenderer content={`$$${editMath}$$`} textClassName="text-indigo-300 font-bold" />
                                        ) : (
                                            <span className="text-xs text-slate-500 italic">Formula preview will appear here</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 3. Image Tab */}
                            {editorTab === 'image' && (
                                <div className="space-y-3">
                                    <label className="block text-xs font-medium text-slate-300">
                                        Insert Image into Cell
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <label className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer text-center transition shadow-md">
                                            Choose Local Image File
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = ev => setEditImage(ev.target.result);
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                        {editImage && (
                                            <button
                                                type="button"
                                                onClick={() => setEditImage(null)}
                                                className="px-3 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-xl text-xs font-semibold transition"
                                            >
                                                Remove Image
                                            </button>
                                        )}
                                    </div>

                                    {editImage && (
                                        <div className="h-28 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden p-1">
                                            <img src={editImage} alt="Preview" className="max-h-full object-contain rounded-md" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 4. In-Cell Doodle Canvas Tab */}
                            {editorTab === 'doodle' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-slate-300">
                                            Sketch / Draw inside Cell
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            {['#38bdf8', '#34d399', '#f87171', '#facc15', '#ffffff'].map(c => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setDoodleColor(c)}
                                                    className={`w-4 h-4 rounded-full border transition ${
                                                        doodleColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                                                    }`}
                                                    style={{ backgroundColor: c, borderColor: '#475569' }}
                                                />
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const canvas = doodleCanvasRef.current;
                                                    if (canvas) {
                                                        const ctx = canvas.getContext('2d');
                                                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                                                    }
                                                }}
                                                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md text-[10px] ml-1 transition"
                                                title="Clear Doodle"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-center bg-slate-950 rounded-xl border border-slate-800 p-1">
                                        <canvas
                                            ref={doodleCanvasRef}
                                            width={340}
                                            height={120}
                                            onMouseDown={startDoodleDraw}
                                            onMouseMove={doodleDraw}
                                            onMouseUp={stopDoodleDraw}
                                            onMouseLeave={stopDoodleDraw}
                                            onTouchStart={startDoodleDraw}
                                            onTouchMove={doodleDraw}
                                            onTouchEnd={stopDoodleDraw}
                                            className="cursor-crosshair bg-slate-900 rounded-lg touch-none"
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-500 block text-center">
                                        Draw freely with mouse or stylus. Saved automatically with cell.
                                    </span>
                                </div>
                            )}

                            {/* 5. Cell Tint / Color Tab */}
                            {editorTab === 'color' && (
                                <div className="space-y-3">
                                    <label className="block text-xs font-medium text-slate-300">
                                        Cell Background Shading
                                    </label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {[
                                            { name: 'Default', hex: '' },
                                            { name: 'Indigo', hex: '#312e81' },
                                            { name: 'Blue', hex: '#1e3a8a' },
                                            { name: 'Emerald', hex: '#064e3b' },
                                            { name: 'Amber', hex: '#78350f' },
                                            { name: 'Rose', hex: '#881337' },
                                            { name: 'Slate', hex: '#334155' },
                                            { name: 'Purple', hex: '#581c87' },
                                            { name: 'Cyan', hex: '#164e63' },
                                            { name: 'Gray', hex: '#27272a' },
                                            { name: 'Black', hex: '#020617' },
                                            { name: 'Highlight', hex: '#eab308' }
                                        ].map(c => (
                                            <button
                                                key={c.name}
                                                type="button"
                                                onClick={() => setEditBg(c.hex)}
                                                className={`h-8 rounded-lg border flex items-center justify-center transition ${
                                                    editBg === c.hex ? 'ring-2 ring-white scale-105' : 'hover:scale-105'
                                                }`}
                                                style={{ backgroundColor: c.hex || cellBg, borderColor: '#475569' }}
                                                title={c.name}
                                            >
                                                {editBg === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Editor Action Buttons */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-3">
                            <button
                                type="button"
                                onClick={handleClearCell}
                                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition"
                            >
                                Clear Cell
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveCellKey(null)}
                                    className="px-3.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-xl transition font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveCell}
                                    className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition flex items-center gap-1.5"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    Apply Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
