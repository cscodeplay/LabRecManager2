'use client';

import React, { useState } from 'react';
import { Table, X, Check, Grid, Sparkles, LayoutGrid } from 'lucide-react';

export const TABLE_THEMES = {
    dark: {
        id: 'dark',
        name: 'Dark Slate (Default)',
        headerBg: '#1e293b',
        headerText: '#f8fafc',
        cellBg: '#0f172a',
        cellText: '#e2e8f0',
        borderColor: '#334155',
        accentColor: '#38bdf8'
    },
    blueprint: {
        id: 'blueprint',
        name: 'Classroom Blueprint',
        headerBg: '#0284c7',
        headerText: '#ffffff',
        cellBg: '#082f49',
        cellText: '#f0f9ff',
        borderColor: '#0369a1',
        accentColor: '#38bdf8'
    },
    notebook: {
        id: 'notebook',
        name: 'Emerald Lab',
        headerBg: '#047857',
        headerText: '#ffffff',
        cellBg: '#064e3b',
        cellText: '#ecfdf5',
        borderColor: '#059669',
        accentColor: '#34d399'
    },
    light: {
        id: 'light',
        name: 'Clean Paper (Light)',
        headerBg: '#f1f5f9',
        headerText: '#0f172a',
        cellBg: '#ffffff',
        cellText: '#1e293b',
        borderColor: '#cbd5e1',
        accentColor: '#2563eb'
    }
};

export default function WhiteboardTableCreatorModal({
    isOpen,
    onClose,
    onCreateTable
}) {
    const [hoverRows, setHoverRows] = useState(3);
    const [hoverCols, setHoverCols] = useState(3);
    const [selectedRows, setSelectedRows] = useState(3);
    const [selectedCols, setSelectedCols] = useState(3);
    const [hasHeaderRow, setHasHeaderRow] = useState(true);
    const [themeKey, setThemeKey] = useState('dark');
    const [isCustomMode, setIsCustomMode] = useState(false);

    if (!isOpen) return null;

    const maxGrid = 8;

    const handleCellHover = (r, c) => {
        setHoverRows(r);
        setHoverCols(c);
    };

    const handleCellClick = (r, c) => {
        setSelectedRows(r);
        setSelectedCols(c);
        setIsCustomMode(false);
    };

    const handleSubmit = () => {
        const rows = Math.min(20, Math.max(1, selectedRows));
        const cols = Math.min(10, Math.max(1, selectedCols));
        const theme = TABLE_THEMES[themeKey] || TABLE_THEMES.dark;

        onCreateTable({
            rows,
            cols,
            hasHeaderRow,
            theme
        });
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 border-2 border-slate-700/80 rounded-2xl shadow-2xl p-6 w-full max-w-md text-slate-200 select-none"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                            <Table className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white tracking-wide">Insert Table / Grid</h2>
                            <p className="text-xs text-slate-400">Create structured data grids for the whiteboard</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Matrix Grid Selector */}
                <div className="py-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-300">
                            Grid Size: <span className="text-indigo-400 font-bold">{selectedRows} Rows × {selectedCols} Columns</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsCustomMode(!isCustomMode)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                        >
                            {isCustomMode ? 'Use Quick Matrix' : 'Custom Size (up to 20×10)'}
                        </button>
                    </div>

                    {!isCustomMode ? (
                        <div className="flex flex-col items-center justify-center p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                            <div 
                                className="grid gap-1.5"
                                style={{ gridTemplateColumns: `repeat(${maxGrid}, minmax(0, 1fr))` }}
                                onMouseLeave={() => {
                                    setHoverRows(selectedRows);
                                    setHoverCols(selectedCols);
                                }}
                            >
                                {Array.from({ length: maxGrid }).map((_, rIdx) => (
                                    <React.Fragment key={rIdx}>
                                        {Array.from({ length: maxGrid }).map((_, cIdx) => {
                                            const r = rIdx + 1;
                                            const c = cIdx + 1;
                                            const isHovered = r <= hoverRows && c <= hoverCols;
                                            const isSelected = r <= selectedRows && c <= selectedCols;

                                            return (
                                                <button
                                                    key={`${r}-${c}`}
                                                    type="button"
                                                    onMouseEnter={() => handleCellHover(r, c)}
                                                    onClick={() => handleCellClick(r, c)}
                                                    className={`w-7 h-7 rounded-md border transition-all duration-75 ${
                                                        isHovered
                                                            ? 'bg-indigo-600/80 border-indigo-400 scale-105 shadow-xs'
                                                            : isSelected
                                                            ? 'bg-indigo-900/60 border-indigo-500/70'
                                                            : 'bg-slate-800/80 border-slate-700/60 hover:border-slate-500'
                                                    }`}
                                                    title={`${r} × ${c}`}
                                                />
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </div>
                            <span className="text-[11px] text-slate-500 mt-2">
                                Hover to choose dimensions, click to select
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                            <div className="flex-1">
                                <label className="block text-xs text-slate-400 mb-1 font-medium">Rows (1 - 20)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={selectedRows}
                                    onChange={e => setSelectedRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-hidden focus:border-indigo-500"
                                />
                            </div>
                            <div className="text-slate-500 font-bold text-lg mt-4">×</div>
                            <div className="flex-1">
                                <label className="block text-xs text-slate-400 mb-1 font-medium">Columns (1 - 10)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={selectedCols}
                                    onChange={e => setSelectedCols(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-hidden focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Theme Selector */}
                <div className="py-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Table Color Theme</label>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.values(TABLE_THEMES).map(t => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setThemeKey(t.id)}
                                className={`flex items-center gap-2 p-2 rounded-xl border text-left transition ${
                                    themeKey === t.id
                                        ? 'bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/30 text-white'
                                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                }`}
                            >
                                <div 
                                    className="w-4 h-4 rounded-full border shrink-0" 
                                    style={{ backgroundColor: t.headerBg, borderColor: t.borderColor }} 
                                />
                                <span className="text-xs font-medium truncate">{t.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Options */}
                <div className="py-3 flex items-center justify-between border-t border-slate-800 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-medium select-none">
                        <input
                            type="checkbox"
                            checked={hasHeaderRow}
                            onChange={e => setHasHeaderRow(e.target.checked)}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800 w-4 h-4"
                        />
                        <span>Include Header Row (Distinct Color & Bold)</span>
                    </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
                    >
                        <Check className="w-4 h-4" />
                        Create Table ({selectedRows}×{selectedCols})
                    </button>
                </div>
            </div>
        </div>
    );
}
