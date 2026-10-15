'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    Move, Lock, Unlock, Trash2, Copy, Plus, Minus, 
    Type, Calculator, Image as ImageIcon, Edit3, Palette, 
    X, Check, ChevronsUp, ChevronsDown, Maximize2, Sparkles,
    Undo2, RefreshCw
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
 * 
 * Supports dynamic column and row resizing by dragging borders,
 * adding/deleting rows and columns, whole-table movement, and lock/unlock.
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

    // Cell data map: { 'r-c': { text, math, image, inkData, bg } }
    const cells = table.cells || {};

    // Active cell being edited
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

    // Open cell editor
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

    // Save cell changes
    const handleSaveCell = () => {
        if (!activeCellKey) return;
        let finalInk = cells[activeCellKey]?.inkData || null;

        // If doodle canvas was used
        if (doodleCanvasRef.current) {
            finalInk = doodleCanvasRef.current.toDataURL('image/png');
        }

        const updatedCells = {
            ...cells,
            [activeCellKey]: {
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

    return (
        <div
            className={`whiteboard-table-item absolute select-none transition-shadow ${
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
            onClick={(e) => {
                e.stopPropagation();
                onSelect?.(tableId);
            }}
        >
            {/* Control Bar (shown when selected) */}
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
                                    const cellCustomBg = cell.bg;

                                    return (
                                        <div
                                            key={`cell-${cellKey}`}
                                            onDoubleClick={() => handleOpenCellEditor(rIdx, cIdx)}
                                            className={`relative flex flex-col justify-center p-2 text-xs overflow-hidden transition-colors border-r border-b ${
                                                isHeader ? 'font-bold' : 'font-normal'
                                            } hover:outline-dashed hover:outline-1 hover:outline-indigo-400 cursor-pointer`}
                                            style={{
                                                width: cWidth,
                                                height: rHeight,
                                                borderColor: borderColor,
                                                backgroundColor: cellCustomBg || (isHeader ? headerBg : cellBg),
                                                color: isHeader ? headerText : cellText
                                            }}
                                            title="Double click to edit cell content (Text, Math, Image, Doodle)"
                                        >
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

                                            {/* Cell Content: Text */}
                                            {cell.text && (
                                                <div className="w-full break-words whitespace-pre-wrap leading-tight">
                                                    {cell.text}
                                                </div>
                                            )}

                                            {/* Empty Placeholder Hint */}
                                            {!cell.text && !cell.math && !cell.image && !cell.inkData && (
                                                <span className="text-[10px] text-slate-600 italic select-none">
                                                    {isHeader ? `Header ${cIdx + 1}` : 'Empty'}
                                                </span>
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
