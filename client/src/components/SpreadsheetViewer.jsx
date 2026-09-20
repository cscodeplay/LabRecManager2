'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as xlsx from 'xlsx';
import {
    Search, Download, ZoomIn, ZoomOut, RotateCcw,
    ChevronLeft, ChevronRight, FileSpreadsheet, Layers,
    Maximize2, Minimize2, Check, AlertCircle, Loader2
} from 'lucide-react';

/**
 * Converts a 0-indexed column number to Excel column letters (0 -> A, 25 -> Z, 26 -> AA)
 */
function getColumnLetter(colIndex) {
    let temp = colIndex;
    let letter = '';
    while (temp >= 0) {
        letter = String.fromCharCode((temp % 26) + 65) + letter;
        temp = Math.floor(temp / 26) - 1;
    }
    return letter;
}

/**
 * Parses a SheetJS worksheet into a structured grid with full merged-cell support.
 */
function parseWorksheetWithMerges(ws) {
    if (!ws || !ws['!ref']) {
        return { rows: [], totalRows: 0, totalCols: 0, mergesCount: 0, colHeaders: [] };
    }

    const range = xlsx.utils.decode_range(ws['!ref']);
    const merges = ws['!merges'] || [];

    // Map: 'r,c' -> { isStart, rowSpan, colSpan, hidden }
    const mergeMap = new Map();
    for (const m of merges) {
        const rowSpan = m.e.r - m.s.r + 1;
        const colSpan = m.e.c - m.s.c + 1;
        for (let r = m.s.r; r <= m.e.r; r++) {
            for (let c = m.s.c; c <= m.e.c; c++) {
                if (r === m.s.r && c === m.s.c) {
                    mergeMap.set(`${r},${c}`, { isStart: true, rowSpan, colSpan, hidden: false });
                } else {
                    mergeMap.set(`${r},${c}`, { isStart: false, hidden: true });
                }
            }
        }
    }

    const totalRows = range.e.r - range.s.r + 1;
    const totalCols = range.e.c - range.s.c + 1;

    // Generate column headers (A, B, C...)
    const colHeaders = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
        colHeaders.push({
            colIndex: c,
            label: getColumnLetter(c)
        });
    }

    const rows = [];
    for (let r = range.s.r; r <= range.e.r; r++) {
        const cells = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
            const key = `${r},${c}`;
            const mergeInfo = mergeMap.get(key);

            // If this cell is swallowed by an active merge from another start cell, omit it
            if (mergeInfo && mergeInfo.hidden) {
                continue;
            }

            const cellAddress = xlsx.utils.encode_cell({ r, c });
            const cell = ws[cellAddress];

            let displayValue = '';
            let rawValue = null;
            let cellType = 'z';

            if (cell) {
                rawValue = cell.v;
                cellType = cell.t || 's';
                if (cell.w !== undefined && cell.w !== null) {
                    displayValue = String(cell.w);
                } else if (cell.v !== undefined && cell.v !== null) {
                    displayValue = String(cell.v);
                }
            }

            cells.push({
                r,
                c,
                address: cellAddress,
                value: displayValue,
                rawValue,
                type: cellType,
                rowSpan: mergeInfo ? mergeInfo.rowSpan : 1,
                colSpan: mergeInfo ? mergeInfo.colSpan : 1,
                isMerged: Boolean(mergeInfo && mergeInfo.isStart)
            });
        }
        rows.push({
            rowNumber: r + 1,
            cells
        });
    }

    return {
        rows,
        totalRows,
        totalCols,
        mergesCount: merges.length,
        colHeaders
    };
}

export default function SpreadsheetViewer({
    data,
    url,
    fileName = 'Spreadsheet',
    className = ''
}) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [workbook, setWorkbook] = useState(null);
    const [sheetNames, setSheetNames] = useState([]);
    const [activeSheetIndex, setActiveSheetIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [zoom, setZoom] = useState(1);
    const [page, setPage] = useState(1);
    const pageSize = 250; // Render up to 250 rows per page for ultra smooth performance

    // Load workbook from buffer or URL
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        const load = async () => {
            try {
                let buffer;
                if (data) {
                    if (data instanceof ArrayBuffer) {
                        buffer = data;
                    } else if (data instanceof Blob) {
                        buffer = await data.arrayBuffer();
                    } else if (data.buffer instanceof ArrayBuffer) {
                        buffer = data.buffer;
                    } else {
                        buffer = data;
                    }
                } else if (url) {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`Failed to load file: ${res.statusText}`);
                    buffer = await res.arrayBuffer();
                } else {
                    throw new Error('No spreadsheet data or URL provided');
                }

                if (!isMounted) return;

                const wb = xlsx.read(buffer, {
                    type: 'array',
                    cellStyles: true,
                    cellDates: true,
                    cellNF: true
                });

                if (!wb.SheetNames || wb.SheetNames.length === 0) {
                    throw new Error('Workbook contains no worksheets');
                }

                setWorkbook(wb);
                setSheetNames(wb.SheetNames);
                setActiveSheetIndex(0);
                setPage(1);
            } catch (err) {
                console.error('[SpreadsheetViewer] Load error:', err);
                if (isMounted) setError(err.message || 'Failed to parse spreadsheet');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        load();

        return () => {
            isMounted = false;
        };
    }, [data, url]);

    // Parse the active sheet
    const activeParsed = useMemo(() => {
        if (!workbook || sheetNames.length === 0) return null;
        const currentSheetName = sheetNames[activeSheetIndex];
        const ws = workbook.Sheets[currentSheetName];
        if (!ws) return null;
        return parseWorksheetWithMerges(ws);
    }, [workbook, sheetNames, activeSheetIndex]);

    // Search matches count
    const searchMatchCount = useMemo(() => {
        if (!searchQuery.trim() || !activeParsed) return 0;
        const q = searchQuery.toLowerCase();
        let count = 0;
        for (const row of activeParsed.rows) {
            for (const cell of row.cells) {
                if (cell.value && cell.value.toLowerCase().includes(q)) {
                    count++;
                }
            }
        }
        return count;
    }, [activeParsed, searchQuery]);

    // Paginated rows
    const paginatedRows = useMemo(() => {
        if (!activeParsed) return [];
        if (searchQuery.trim()) {
            // When searching, show all matching rows (up to 500)
            const q = searchQuery.toLowerCase();
            return activeParsed.rows.filter(row =>
                row.cells.some(c => c.value && c.value.toLowerCase().includes(q))
            ).slice(0, 500);
        }
        const start = (page - 1) * pageSize;
        return activeParsed.rows.slice(start, start + pageSize);
    }, [activeParsed, page, pageSize, searchQuery]);

    const totalPages = useMemo(() => {
        if (!activeParsed || searchQuery.trim()) return 1;
        return Math.ceil(activeParsed.rows.length / pageSize) || 1;
    }, [activeParsed, pageSize, searchQuery]);

    // Export current sheet to CSV
    const handleExportCurrentSheet = () => {
        if (!workbook || !sheetNames[activeSheetIndex]) return;
        const ws = workbook.Sheets[sheetNames[activeSheetIndex]];
        const csv = xlsx.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}_${sheetNames[activeSheetIndex]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    if (loading) {
        return (
            <div className={`w-full h-full min-h-[350px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 ${className}`}>
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Loading spreadsheet workbook...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`w-full h-full min-h-[350px] flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900 text-center ${className}`}>
                <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Spreadsheet Preview Error</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4">{error}</p>
            </div>
        );
    }

    if (!activeParsed) {
        return (
            <div className="w-full h-full min-h-[350px] flex items-center justify-center bg-white dark:bg-slate-900 rounded-xl text-slate-400 text-xs">
                No worksheet data available
            </div>
        );
    }

    return (
        <div className={`w-full h-full flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs ${className}`}>
            {/* Top Toolbar */}
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                {/* Search */}
                <div className="relative w-44 sm:w-60">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search cells in sheet..."
                        className="w-full pl-8 pr-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                    />
                    {searchQuery.trim() && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                            {searchMatchCount} found
                        </span>
                    )}
                </div>

                {/* Sheet Metrics */}
                <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {activeParsed.totalRows.toLocaleString()} rows × {activeParsed.totalCols} cols
                    </span>
                    {activeParsed.mergesCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            {activeParsed.mergesCount} merged areas
                        </span>
                    )}
                </div>

                {/* Zoom & Export Actions */}
                <div className="flex items-center gap-1.5">
                    {/* Zoom Out */}
                    <button
                        type="button"
                        onClick={() => setZoom(z => Math.max(0.75, +(z - 0.1).toFixed(2)))}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                        title="Zoom out"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 w-9 text-center">
                        {Math.round(zoom * 100)}%
                    </span>
                    {/* Zoom In */}
                    <button
                        type="button"
                        onClick={() => setZoom(z => Math.min(1.5, +(z + 0.1).toFixed(2)))}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                        title="Zoom in"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    {zoom !== 1 && (
                        <button
                            type="button"
                            onClick={() => setZoom(1)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                            title="Reset zoom"
                        >
                            <RotateCcw className="w-3 h-3" />
                        </button>
                    )}

                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

                    {/* Export Current Sheet */}
                    <button
                        type="button"
                        onClick={handleExportCurrentSheet}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 transition"
                        title="Export current sheet as CSV"
                    >
                        <Download className="w-3 h-3" />
                        <span className="hidden sm:inline">CSV</span>
                    </button>
                </div>
            </div>

            {/* Table Viewport */}
            <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 p-2 sm:p-3 relative" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div
                    style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                        transition: 'transform 0.1s ease-out'
                    }}
                    className="inline-block min-w-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs"
                >
                    <table className="border-collapse text-xs font-mono select-text w-full">
                        {/* Column Letters Header Row */}
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-20 shadow-2xs">
                                {/* Top-left empty corner */}
                                <th className="w-10 px-2 py-1.5 border border-slate-300 dark:border-slate-700 text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 select-none text-center sticky left-0 z-30">
                                    #
                                </th>
                                {activeParsed.colHeaders.map(col => (
                                    <th
                                        key={col.colIndex}
                                        className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 select-none text-center bg-slate-100 dark:bg-slate-800 min-w-[70px]"
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        {/* Table Body with Merged Cells */}
                        <tbody>
                            {paginatedRows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={activeParsed.colHeaders.length + 1}
                                        className="py-12 text-center text-xs text-slate-400 font-sans"
                                    >
                                        {searchQuery ? 'No cells match your search criteria' : 'This sheet is empty'}
                                    </td>
                                </tr>
                            ) : (
                                paginatedRows.map((row) => (
                                    <tr
                                        key={row.rowNumber}
                                        className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/40 transition-colors"
                                    >
                                        {/* Sticky Row Number */}
                                        <td className="px-2 py-1 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-[10px] text-slate-400 select-none text-center sticky left-0 z-10 font-bold w-10">
                                            {row.rowNumber}
                                        </td>

                                        {/* Row Cells */}
                                        {row.cells.map((cell) => {
                                            const isMatch = searchQuery.trim() && cell.value && cell.value.toLowerCase().includes(searchQuery.toLowerCase());
                                            const isNum = cell.type === 'n' && !cell.isMerged;

                                            return (
                                                <td
                                                    key={cell.address}
                                                    rowSpan={cell.rowSpan}
                                                    colSpan={cell.colSpan}
                                                    title={`${cell.address}: ${cell.value}`}
                                                    className={`px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 ${
                                                        isNum ? 'text-right' : cell.isMerged ? 'text-center font-semibold' : 'text-left'
                                                    } ${
                                                        isMatch
                                                            ? 'bg-amber-200 dark:bg-amber-900/60 font-bold ring-1 ring-amber-400 text-slate-950 dark:text-amber-100'
                                                            : cell.isMerged
                                                            ? 'bg-slate-50/70 dark:bg-slate-800/40'
                                                            : ''
                                                    } whitespace-pre-wrap break-words max-w-sm`}
                                                >
                                                    {cell.value}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Bar: Multi-Sheet Tabs Switcher & Pagination */}
            <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                {/* Sheet Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto max-w-full sm:max-w-xl py-0.5">
                    <div className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400 mr-1 flex-shrink-0" />
                        {sheetNames.map((name, idx) => (
                            <button
                                key={name}
                                type="button"
                                onClick={() => {
                                    setActiveSheetIndex(idx);
                                    setPage(1);
                                }}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition whitespace-nowrap flex items-center gap-1.5 shadow-2xs ${
                                    activeSheetIndex === idx
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                }`}
                                title={`Switch to sheet: ${name}`}
                            >
                                <FileSpreadsheet className="w-3 h-3" />
                                <span>{name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pagination Controls (when rows > pageSize) */}
                {totalPages > 1 && !searchQuery.trim() && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <button
                            type="button"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 disabled:opacity-40"
                            title="Previous rows"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] font-mono px-1">
                            {page} / {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 disabled:opacity-40"
                            title="Next rows"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
