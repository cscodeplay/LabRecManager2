'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    Move, Lock, Unlock, Trash2, Copy, Plus, Minus, 
    Type, Calculator, Image as ImageIcon, Edit3, Palette, 
    X, Check, ChevronsUp, ChevronsDown, Maximize2, Sparkles,
    Undo2, RefreshCw, Bold, Italic, Underline, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, WrapText, ChevronDown
} from 'lucide-react';
import MathRenderer from './MathRenderer';

/**
 * Rich Whiteboard Table Object.
 * Each cell can contain:
 * - Text (multi-line, auto-wrap)
 * - KaTeX Math formula (crisp LaTeX rendering)
 * - Image (file upload or URL)
 * - Freehand Doodle / Ink Drawing
 * - Background shading / color
 * - Rich typography: bold, italic, underline, strikethrough, fontSize, fontFamily, color, align
 * 
 * Supports Excel-like single-click cell selection, inline cell editing,
 * floating formatting toolbar, dynamic column/row resizing, and keyboard navigation.
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
        : Array(cols).fill(Math.max(100, Math.round((table.width || 480) / cols)));

    const rowHeights = (table.rowHeights && table.rowHeights.length === rows)
        ? table.rowHeights
        : Array(rows).fill(Math.max(50, Math.round((table.height || 240) / rows)));

    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
    const totalHeight = rowHeights.reduce((a, b) => a + b, 0);

    // Styling
    const borderColor = table.borderColor || '#334155';
    const borderWidth = table.borderWidth || 2;
    const headerBg = table.headerBg || '#1e293b';
    const headerText = table.headerText || '#f8fafc';
    const cellBg = table.cellBg || '#0f172a';
    const cellText = table.cellText || '#e2e8f0';

    // Cell data map: { 'r-c': { text, math, image, inkData, bg, bold, italic, underline, strikethrough, fontSize, fontFamily, color, align, wrap } }
    const cells = table.cells || {};

    // Excel-Style Selected Cell & Inline Editing State
    const [selectedCellKey, setSelectedCellKey] = useState(null); // 'r-c'
    const [isInlineEditing, setIsInlineEditing] = useState(false);
    const [inlineText, setInlineText] = useState('');
    const inlineInputRef = useRef(null);

    // Format Ribbon Dropdowns State
    const [showFontMenu, setShowFontMenu] = useState(false);
    const [showColorMenu, setShowColorMenu] = useState(false);
    const [showBgMenu, setShowBgMenu] = useState(false);
    const [showSizeMenu, setShowSizeMenu] = useState(false);

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

    // Drag-to-resize column or row divider
    const resizeRef = useRef(null); // { type: 'col' | 'row', index, startPos, startDim }

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

    // Helper: update property of selected cell
    const updateSelectedCell = (propertyUpdates) => {
        if (!selectedCellKey) return;
        const currentCell = cells[selectedCellKey] || {};
        const updatedCells = {
            ...cells,
            [selectedCellKey]: {
                ...currentCell,
                ...propertyUpdates
            }
        };
        onUpdate({
            ...table,
            cells: updatedCells
        });
    };

    // Single-click cell selection
    const handleSelectCell = (r, c) => {
        const key = `${r}-${c}`;
        setSelectedCellKey(key);
        setIsInlineEditing(false);
        setInlineText(cells[key]?.text || '');
    };

    // Start inline editing
    const startInlineEdit = (r, c, initialChar = null) => {
        if (isLocked) return;
        const key = `${r}-${c}`;
        setSelectedCellKey(key);
        setIsInlineEditing(true);
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
    const commitInlineEdit = () => {
        if (!selectedCellKey) return;
        const currentCell = cells[selectedCellKey] || {};
        const updatedCells = {
            ...cells,
            [selectedCellKey]: {
                ...currentCell,
                text: inlineText
            }
        };
        setIsInlineEditing(false);
        onUpdate({
            ...table,
            cells: updatedCells
        });
    };

    // Cancel inline edit
    const cancelInlineEdit = () => {
        setIsInlineEditing(false);
        if (selectedCellKey) {
            setInlineText(cells[selectedCellKey]?.text || '');
        }
    };

    // Navigate to next or previous cell (Excel Tab / Shift-Tab / Arrow keys)
    const moveToCell = (r, c) => {
        const targetR = Math.max(0, Math.min(rows - 1, r));
        const targetC = Math.max(0, Math.min(cols - 1, c));
        handleSelectCell(targetR, targetC);
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

    // Table movement
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
            const newW = Math.max(60, Math.round(initialWidth + delta));
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
            const newH = Math.max(35, Math.round(initialHeight + delta));
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

    // Add Column
    const handleAddColumn = (e) => {
        e.stopPropagation();
        if (cols >= 12) return;
        const newCols = cols + 1;
        const newColWidths = [...colWidths, 140];
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
        if (rows >= 25) return;
        const newRows = rows + 1;
        const newRowHeights = [...rowHeights, 55];
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

    // Extract active selected cell data & label
    const selectedCell = selectedCellKey ? (cells[selectedCellKey] || {}) : null;
    const [selR, selC] = selectedCellKey ? selectedCellKey.split('-').map(Number) : [null, null];
    const cellColLetter = selC !== null && selC !== undefined ? String.fromCharCode(65 + selC) : '';
    const cellRefLabel = selR !== null && selR !== undefined ? `${cellColLetter}${selR + 1}` : '';

    return (
        <div
            className={`whiteboard-table-item absolute select-none transition-shadow outline-none ${
                isSelected ? 'ring-2 ring-indigo-500 shadow-2xl' : ''
            }`}
            style={{
                left: table.x || 100,
                top: table.y || 100,
                width: totalWidth,
                height: totalHeight,
                zIndex: zIndex,
                pointerEvents: 'auto'
            }}
            tabIndex={0}
            onClick={(e) => {
                e.stopPropagation();
                onSelect?.(tableId);
            }}
            onKeyDown={(e) => {
                if (isInlineEditing) return; // Handled by inline textarea
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
                    // Start inline edit on direct typing
                    startInlineEdit(r, c, e.key);
                }
            }}
        >
            {/* 1. Excel-Like Cell Formatting Toolbar (Shown when Table & Cell are Selected) */}
            {isSelected && selectedCellKey && (
                <div 
                    className="absolute -top-22 left-0 min-w-max flex items-center gap-1.5 bg-slate-900/95 border border-slate-700/80 rounded-xl px-2 py-1 shadow-2xl backdrop-blur-md text-slate-300 text-xs z-50 pointer-events-auto"
                    onClick={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                >
                    {/* Active Cell Reference Indicator (e.g. A1, B2) */}
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-mono font-bold text-[11px] shadow-xs">
                        <span>{cellRefLabel || 'Cell'}</span>
                    </div>

                    <div className="h-4 w-px bg-slate-700 mx-0.5" />

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
                            <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 flex flex-col min-w-[110px]">
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
                            <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 flex flex-col min-w-[70px]">
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
                            <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 grid grid-cols-6 gap-1 min-w-[140px]">
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

                    {/* Cell Fill Background Tint Picker */}
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
                            title="Cell Background Fill"
                        >
                            <Palette className="w-3.5 h-3.5" style={{ color: selectedCell?.bg || '#38bdf8' }} />
                        </button>
                        {showBgMenu && (
                            <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 grid grid-cols-5 gap-1.5 min-w-[140px]">
                                {[
                                    { color: '', label: 'None' },
                                    { color: '#0f172a', label: 'Dark' },
                                    { color: '#1e293b', label: 'Slate' },
                                    { color: '#1e1b4b', label: 'Indigo' },
                                    { color: '#064e3b', label: 'Emerald' },
                                    { color: '#451a03', label: 'Amber' },
                                    { color: '#4c0519', label: 'Rose' },
                                    { color: '#172554', label: 'Blue' },
                                    { color: '#581c87', label: 'Purple' },
                                    { color: '#134e4a', label: 'Teal' }
                                ].map(item => (
                                    <button
                                        key={item.color || 'none'}
                                        type="button"
                                        onClick={() => {
                                            updateSelectedCell({ bg: item.color });
                                            setShowBgMenu(false);
                                        }}
                                        className={`w-5 h-5 rounded-md border border-slate-700 hover:scale-110 transition flex items-center justify-center text-[8px] ${
                                            !item.color ? 'bg-transparent text-slate-400' : ''
                                        }`}
                                        style={item.color ? { backgroundColor: item.color } : {}}
                                        title={item.label}
                                    >
                                        {!item.color && '∅'}
                                    </button>
                                ))}
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

                    {/* Formula / Math Mode Toggle */}
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

                    {/* Advanced Modal Editor Trigger (for image/doodle) */}
                    <button
                        type="button"
                        onClick={() => {
                            const [r, c] = selectedCellKey.split('-').map(Number);
                            handleOpenCellEditor(r, c);
                        }}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                        title="Open Advanced Rich Cell Editor (Doodle, Image, Formulas)"
                    >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    </button>
                </div>
            )}

            {/* 2. Control Bar (shown when selected) */}
            {isSelected && (
                <div 
                    className="absolute -top-11 left-0 right-0 flex items-center justify-between bg-slate-900/95 border border-slate-700/80 rounded-xl px-2.5 py-1 shadow-xl backdrop-blur-xs text-slate-300 text-xs z-50 pointer-events-auto"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Drag Move Handle */}
                    <div 
                        onPointerDown={handleMovePointerDown}
                        className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-grab active:cursor-grabbing font-semibold text-[11px] transition"
                        title="Drag to move table"
                    >
                        <Move className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Move Table</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400 font-mono">
                            {rows}R × {cols}C
                        </span>

                        <div className="h-4 w-px bg-slate-700 mx-1" />

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

                        {/* Duplicate */}
                        <button
                            type="button"
                            onClick={() => onDuplicate?.(table)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                            title="Duplicate Table"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Layer Bring to Front */}
                        <button
                            type="button"
                            onClick={() => onBringForward?.(tableId)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                            title="Bring to Front"
                        >
                            <ChevronsUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Layer Send to Back */}
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
                </div>
            )}

            {/* Table Grid DOM Structure */}
            <div 
                className="relative overflow-hidden rounded-xl shadow-lg border"
                style={{
                    width: totalWidth,
                    height: totalHeight,
                    borderColor: borderColor,
                    borderWidth: borderWidth,
                    backgroundColor: cellBg
                }}
            >
                {/* Rows & Cells */}
                <div className="flex flex-col w-full h-full">
                    {Array.from({ length: rows }).map((_, rIdx) => {
                        const isHeader = hasHeaderRow && rIdx === 0;
                        const rHeight = rowHeights[rIdx] || 50;

                        return (
                            <div 
                                key={`row-${rIdx}`} 
                                className="flex relative w-full"
                                style={{ height: rHeight }}
                            >
                                {Array.from({ length: cols }).map((_, cIdx) => {
                                    const cWidth = colWidths[cIdx] || 100;
                                    const cellKey = `${rIdx}-${cIdx}`;
                                    const cell = cells[cellKey] || {};
                                    const isCellSelected = selectedCellKey === cellKey;
                                    const isEditingThisCell = isInlineEditing && isCellSelected;

                                    const cellFontSize = cell.fontSize || (isHeader ? 12 : 11);
                                    const cellFontFamily = cell.fontFamily || 'sans';
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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelect?.(tableId);
                                                handleSelectCell(rIdx, cIdx);
                                            }}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                onSelect?.(tableId);
                                                startInlineEdit(rIdx, cIdx);
                                            }}
                                            className={`relative flex flex-col justify-center p-2 text-xs overflow-hidden transition-all border-r border-b ${
                                                isCellSelected 
                                                    ? 'ring-2 ring-indigo-400 ring-inset bg-indigo-500/15 shadow-inner' 
                                                    : 'hover:outline-dashed hover:outline-1 hover:outline-indigo-400 cursor-pointer'
                                            }`}
                                            style={{
                                                width: cWidth,
                                                height: rHeight,
                                                borderColor: borderColor,
                                                backgroundColor: cellCustomBg || (isHeader ? headerBg : cellBg),
                                                color: cellColor
                                            }}
                                            title="Click to select & format; Double click or Enter to edit inline"
                                        >
                                            {/* Inline Text Area Editor */}
                                            {isEditingThisCell ? (
                                                <textarea
                                                    ref={inlineInputRef}
                                                    value={inlineText}
                                                    onChange={(e) => setInlineText(e.target.value)}
                                                    onBlur={commitInlineEdit}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            commitInlineEdit();
                                                        } else if (e.key === 'Escape') {
                                                            e.preventDefault();
                                                            cancelInlineEdit();
                                                        } else if (e.key === 'Tab') {
                                                            e.preventDefault();
                                                            commitInlineEdit();
                                                            moveToCell(rIdx, cIdx + (e.shiftKey ? -1 : 1));
                                                        }
                                                    }}
                                                    className="w-full h-full bg-slate-900 text-white p-1 resize-none border-2 border-indigo-400 rounded-sm focus:outline-none overflow-hidden leading-tight"
                                                    style={{
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

                                                    {/* Cell Content: Text with Rich Formatting */}
                                                    {cell.text && (
                                                        <div 
                                                            className={`w-full leading-tight ${cellWrap ? 'break-words whitespace-pre-wrap' : 'truncate whitespace-nowrap'}`}
                                                            style={{
                                                                fontSize: `${cellFontSize}px`,
                                                                fontFamily: getFontFamilyCss(cellFontFamily),
                                                                fontWeight: cellBold ? 'bold' : 'normal',
                                                                fontStyle: cellItalic ? 'italic' : 'normal',
                                                                textDecoration: [cellUnderline ? 'underline' : '', cellStrikethrough ? 'line-through' : ''].filter(Boolean).join(' ') || 'none',
                                                                textAlign: cellAlign,
                                                                color: cellColor
                                                            }}
                                                        >
                                                            {cell.text}
                                                        </div>
                                                    )}

                                                    {/* Empty Placeholder Hint */}
                                                    {!cell.text && !cell.math && !cell.image && !cell.inkData && (
                                                        <span className="text-[10px] text-slate-600 italic select-none">
                                                            {isHeader ? `Header ${cIdx + 1}` : 'Empty'}
                                                        </span>
                                                    )}
                                                </>
                                            )}

                                            {/* Column Divider Resizer (on right edge of each cell except last) */}
                                            {cIdx < cols - 1 && (
                                                <div
                                                    onPointerDown={(e) => startColResize(cIdx, e)}
                                                    className="absolute top-0 right-0 w-2 h-full -mr-1 cursor-col-resize z-20 hover:bg-indigo-500/50 transition-colors"
                                                    title="Drag to resize column width"
                                                />
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Row Divider Resizer (on bottom edge of each row except last) */}
                                {rIdx < rows - 1 && (
                                    <div
                                        onPointerDown={(e) => startRowResize(rIdx, e)}
                                        className="absolute bottom-0 left-0 w-full h-2 -mb-1 cursor-row-resize z-20 hover:bg-indigo-500/50 transition-colors"
                                        title="Drag to resize row height"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right-Side Add / Remove Column Controls */}
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

            {/* Bottom Add / Remove Row Controls */}
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

            {/* Rich Cell Editor Modal */}
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
