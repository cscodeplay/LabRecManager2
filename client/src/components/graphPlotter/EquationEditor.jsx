'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    Plus, Trash2, Copy, Eye, EyeOff, Lock, Unlock, Play, Pause, 
    RotateCcw, Sliders, AlertCircle, CheckCircle2, ChevronDown, 
    ChevronUp, Sparkles, BookOpen, Star, History, ArrowUp, ArrowDown,
    Palette, X, RefreshCw, PanelLeftClose
} from 'lucide-react';
import { PALETTE_CATEGORIES } from './mathPalette';
import { MATH_PRESETS } from './mathPresets';
import { COLOR_SWATCHES, getEquationColor } from './colorPalette';
import katex from 'katex';

export default function EquationEditor({
    equations = [],
    selectedEqId = null,
    onSelectEquation,
    onAddEquation,
    onUpdateEquation,
    onDeleteEquation,
    onDuplicateEquation,
    onReorderEquations,
    onClearAllEquations,
    onToggleAllVisibility,
    parameters = {},
    onUpdateParameter,
    onBatchAddEquations,
    isPresentationMode = false,
    theme = 'dark',
    onCloseDrawer = null
}) {
    const isLight = theme === 'light';
    const [showPalette, setShowPalette] = useState(false);
    const [paletteCategory, setPaletteCategory] = useState('algebra');
    const [showPresetsModal, setShowPresetsModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [colorPickerTargetId, setColorPickerTargetId] = useState(null);

    // Parameter Animation state (Play/Pause loop)
    const [animatingParam, setAnimatingParam] = useState(null); // param name
    const [animDirection, setAnimDirection] = useState(1);
    const animFrameRef = useRef(null);

    // Recent equations history saved in localStorage
    const [recentHistory, setRecentHistory] = useState([
        'y = 2x + 1',
        'y = x^2 - 4',
        'y = sin(x)',
        'r = 3*sin(2*theta)',
        'x^2 + y^2 = 25'
    ]);
    const [favorites, setFavorites] = useState(['y = sin(x)', 'y = x^2 - 4']);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('graph_recent_equations');
            if (saved) setRecentHistory(JSON.parse(saved));
            const favs = localStorage.getItem('graph_favorite_equations');
            if (favs) setFavorites(JSON.parse(favs));
        } catch {}
    }, []);

    const addToHistory = (expr) => {
        if (!expr || expr.length < 2) return;
        setRecentHistory(prev => {
            const filtered = prev.filter(e => e !== expr);
            const next = [expr, ...filtered].slice(0, 15);
            try { localStorage.setItem('graph_recent_equations', JSON.stringify(next)); } catch {}
            return next;
        });
    };

    const toggleFavorite = (expr) => {
        setFavorites(prev => {
            const exists = prev.includes(expr);
            const next = exists ? prev.filter(e => e !== expr) : [...prev, expr];
            try { localStorage.setItem('graph_favorite_equations', JSON.stringify(next)); } catch {}
            return next;
        });
    };

    // Aggregate parameters from all visible equations
    const detectedParams = useMemo(() => {
        const set = new Set();
        equations.forEach(eq => {
            if (eq.parsed && eq.parsed.parameters) {
                eq.parsed.parameters.forEach(p => set.add(p));
            }
        });
        return Array.from(set).sort();
    }, [equations]);

    // Animation loop for parameter slider
    useEffect(() => {
        if (!animatingParam) {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            return;
        }

        let lastTime = performance.now();
        const loop = (time) => {
            const dt = (time - lastTime) / 1000;
            lastTime = time;

            const curr = parameters[animatingParam] ?? 1;
            const min = -10;
            const max = 10;
            const speed = 4; // units per second

            let next = curr + animDirection * speed * dt;
            if (next >= max) {
                next = max;
                setAnimDirection(-1);
            } else if (next <= min) {
                next = min;
                setAnimDirection(1);
            }

            onUpdateParameter(animatingParam, Math.round(next * 100) / 100);
            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [animatingParam, animDirection, parameters, onUpdateParameter]);

    // Handle inserting symbol from palette into currently selected equation
    const handleInsertSymbol = (item) => {
        if (!selectedEqId) return;
        const targetEq = equations.find(e => e.id === selectedEqId);
        if (!targetEq) return;

        const currentVal = targetEq.raw || '';
        const newVal = currentVal + item.insert;
        onUpdateEquation(selectedEqId, { raw: newVal });
        addToHistory(newVal);
    };

    return (
        <div 
            onPointerDown={(e) => e.stopPropagation()}
            className={`flex flex-col h-full w-full overflow-hidden select-none border-r ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
        >
            {/* Header Toolbar */}
            <div className={`flex items-center justify-between px-3.5 py-2.5 border-b shrink-0 ${
                isLight ? 'bg-slate-100/90 border-slate-200 text-slate-800' : 'bg-slate-950/70 border-slate-800/80 text-slate-100'
            }`}>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Equation Editor</span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded font-semibold ${
                        isLight ? 'bg-slate-200 text-sky-700' : 'bg-slate-800 text-sky-400'
                    }`}>
                        {equations.length} {equations.length === 1 ? 'func' : 'funcs'}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Math Palette Toggle */}
                    <button
                        type="button"
                        onClick={() => setShowPalette(prev => !prev)}
                        className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                            showPalette 
                                ? 'bg-sky-500 text-white shadow-xs' 
                                : (isLight ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white')
                        }`}
                        title="Math Symbol Palette"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline text-[11px]">Palette</span>
                    </button>

                    {/* Presets Modal Button */}
                    <button
                        type="button"
                        onClick={() => setShowPresetsModal(true)}
                        className={`p-1.5 rounded-lg text-xs transition flex items-center gap-1 ${
                            isLight ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                        title="Browse Mathematical Function Presets"
                    >
                        <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline text-[11px]">Presets</span>
                    </button>

                    {/* History Button */}
                    <button
                        type="button"
                        onClick={() => setShowHistoryModal(true)}
                        className={`p-1.5 rounded-lg transition ${
                            isLight ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                        title="Equation History & Favorites"
                    >
                        <History className="w-3.5 h-3.5 text-violet-400" />
                    </button>

                    {/* Add Equation Button */}
                    <button
                        type="button"
                        onClick={() => onAddEquation()}
                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1 shadow-md transition"
                        title="Add New Equation"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                    </button>

                    {/* Collapse Sidebar Button */}
                    {onCloseDrawer && (
                        <button
                            type="button"
                            onClick={onCloseDrawer}
                            className={`p-1.5 rounded-lg transition ${
                                isLight ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                            title="Collapse Equation Sidebar"
                        >
                            <PanelLeftClose className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Virtual Math Symbol Palette (Collapsible Drawer) */}
            {showPalette && (
                <div className={`border-b p-2.5 flex flex-col gap-2 shrink-0 animate-in slide-in-from-top-2 duration-150 ${
                    isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/90 border-slate-800'
                }`}>
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] hide-scrollbar">
                        {PALETTE_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setPaletteCategory(cat.id)}
                                className={`px-2 py-0.5 rounded-md whitespace-nowrap font-medium transition ${
                                    paletteCategory === cat.id 
                                        ? 'bg-sky-500/20 text-sky-500 ring-1 ring-sky-500/50' 
                                        : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
                                }`}
                                title={`Category: ${cat.label}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-6 sm:grid-cols-6 gap-1 max-h-[110px] overflow-y-auto pr-1">
                        {PALETTE_CATEGORIES.find(c => c.id === paletteCategory)?.items.map((item, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleInsertSymbol(item)}
                                className={`p-1.5 active:scale-95 rounded font-mono text-xs font-semibold flex items-center justify-center border shadow-xs transition ${
                                    isLight 
                                        ? 'bg-white hover:bg-slate-200 text-slate-800 border-slate-300' 
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700/60'
                                }`}
                                title={item.title || `Insert ${item.label}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Parameter Sliders Panel (Detected Variables) */}
            {detectedParams.length > 0 && (
                <div className={`border-b px-3.5 py-2.5 flex flex-col gap-2 shrink-0 ${
                    isLight ? 'bg-slate-100/60 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                }`}>
                    <div className={`flex items-center justify-between text-[11px] font-bold uppercase tracking-wider ${
                        isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                        <span className="flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-amber-500" />
                            Parameters & Sliders
                        </span>
                        <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Real-time</span>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
                        {detectedParams.map(paramName => {
                            const val = parameters[paramName] ?? 1;
                            const isPlaying = animatingParam === paramName;

                            return (
                                <div key={paramName} className={`flex items-center gap-2 p-1.5 rounded-lg border ${
                                    isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/80 border-slate-800'
                                }`}>
                                    <span className="font-mono font-bold text-sky-500 text-xs w-4">{paramName}</span>
                                    
                                    <input
                                        type="range"
                                        min="-10"
                                        max="10"
                                        step="0.1"
                                        value={val}
                                        onChange={(e) => onUpdateParameter(paramName, parseFloat(e.target.value))}
                                        className={`flex-1 accent-sky-500 h-1.5 rounded-lg cursor-pointer ${
                                            isLight ? 'bg-slate-200' : 'bg-slate-800'
                                        }`}
                                        title={`Adjust parameter ${paramName}`}
                                    />

                                    <input
                                        type="number"
                                        value={val}
                                        onChange={(e) => onUpdateParameter(paramName, parseFloat(e.target.value) || 0)}
                                        className={`w-14 px-1.5 py-0.5 text-right font-mono text-xs border rounded ${
                                            isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                                        }`}
                                        title={`Exact value of ${paramName}`}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setAnimatingParam(isPlaying ? null : paramName)}
                                        className={`p-1 rounded transition ${
                                            isPlaying 
                                                ? 'bg-amber-500 text-slate-950 font-bold' 
                                                : (isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800')
                                        }`}
                                        title={isPlaying ? "Pause Parameter Animation" : "Animate / Play Slider"}
                                    >
                                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* List of Equation Rows */}
            <div className={`flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 ${isLight ? 'bg-slate-50' : 'bg-slate-900'}`}>
                {equations.map((eq, idx) => (
                    <EquationRow
                        key={eq.id}
                        eq={eq}
                        idx={idx}
                        isSelected={selectedEqId === eq.id}
                        onSelect={() => onSelectEquation(eq.id)}
                        onUpdateEquation={onUpdateEquation}
                        onDeleteEquation={onDeleteEquation}
                        onDuplicateEquation={onDuplicateEquation}
                        onReorderEquations={onReorderEquations}
                        colorPickerTargetId={colorPickerTargetId}
                        setColorPickerTargetId={setColorPickerTargetId}
                        isLight={isLight}
                        totalEquations={equations.length}
                        onAddToHistory={addToHistory}
                    />
                ))}

                {/* Empty State */}
                {equations.length === 0 && (
                    <div className={`flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-2xl ${
                        isLight ? 'border-slate-300 bg-white/50 text-slate-500' : 'border-slate-800 text-slate-500'
                    }`}>
                        <Sparkles className={`w-8 h-8 mb-2 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
                        <p className={`text-sm font-medium ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>No equations added yet</p>
                        <p className={`text-xs mt-1 max-w-[200px] ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>Click &quot;+ Add&quot; or choose from Presets to plot mathematical functions.</p>
                        <button
                            type="button"
                            onClick={() => onAddEquation()}
                            className="mt-3 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-lg transition"
                            title="Add First Equation"
                        >
                            + Add First Equation
                        </button>
                    </div>
                )}
            </div>

            {/* Presets Modal */}
            {showPresetsModal && (
                <div 
                    className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setShowPresetsModal(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-emerald-400" />
                                <h3 className="font-bold text-sm text-white">Mathematical Function Presets</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPresetsModal(false)}
                                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                                title="Close Presets Modal"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                            {MATH_PRESETS.map((cat, idx) => (
                                <div key={idx} className="flex flex-col gap-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-1">
                                        {cat.category}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {cat.items.map((preset, pIdx) => (
                                            <button
                                                key={pIdx}
                                                type="button"
                                                onClick={() => {
                                                    onAddEquation(preset.formula);
                                                    setShowPresetsModal(false);
                                                }}
                                                className="p-2.5 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/50 rounded-xl text-left transition flex flex-col gap-1 group"
                                                title={`Insert Preset: ${preset.name} (${preset.formula})`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-xs text-slate-200 group-hover:text-sky-300">
                                                        {preset.name}
                                                    </span>
                                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 font-mono">
                                                        {preset.badge}
                                                    </span>
                                                </div>
                                                <span className="font-mono text-xs text-sky-400 font-bold truncate">
                                                    {preset.formula}
                                                </span>
                                                <p className="text-[11px] text-slate-500 line-clamp-1">
                                                    {preset.description}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* History & Favorites Modal */}
            {showHistoryModal && (
                <div 
                    className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setShowHistoryModal(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <History className="w-4 h-4 text-violet-400" />
                                <h3 className="font-bold text-sm text-white">Recent Equations & Favorites</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowHistoryModal(false)}
                                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                                title="Close History Modal"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">⭐ Favorites</h4>
                                <div className="flex flex-col gap-1.5">
                                    {favorites.map((fav, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-slate-950/70 border border-slate-800 rounded-lg">
                                            <span className="font-mono text-xs text-sky-400 font-bold">{fav}</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => { onAddEquation(fav); setShowHistoryModal(false); }}
                                                    className="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs"
                                                    title={`Insert favorite ${fav}`}
                                                >
                                                    Insert
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleFavorite(fav)}
                                                    className="p-1 text-amber-400 hover:text-slate-400"
                                                    title="Remove from Favorites"
                                                >
                                                    <Star className="w-3.5 h-3.5 fill-current" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">🕒 Recent Equations</h4>
                                <div className="flex flex-col gap-1.5">
                                    {recentHistory.map((rec, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-slate-950/70 border border-slate-800 rounded-lg">
                                            <span className="font-mono text-xs text-slate-200">{rec}</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => { onAddEquation(rec); setShowHistoryModal(false); }}
                                                    className="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs"
                                                    title={`Insert equation ${rec}`}
                                                >
                                                    Insert
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleFavorite(rec)}
                                                    className={`p-1 ${favorites.includes(rec) ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'}`}
                                                    title={favorites.includes(rec) ? "Remove from Favorites" : "Add to Favorites"}
                                                >
                                                    <Star className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function KaTeXPreview({ math }) {
    const html = useMemo(() => {
        try {
            // Clean simple formatting for KaTeX
            let clean = math
                .replace(/\*/g, ' \\cdot ')
                .replace(/pi/g, '\\pi')
                .replace(/theta/g, '\\theta');
            return katex.renderToString(clean, { throwOnError: false, displayMode: false });
        } catch {
            return math;
        }
    }, [math]);

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function EquationRow({
    eq,
    idx,
    isSelected,
    onSelect,
    onUpdateEquation,
    onDeleteEquation,
    onDuplicateEquation,
    onReorderEquations,
    colorPickerTargetId,
    setColorPickerTargetId,
    isLight,
    totalEquations,
    onAddToHistory
}) {
    const [localVal, setLocalVal] = useState(eq.raw || '');
    const inputRef = useRef(null);

    // Sync from parent when formula changed from presets, history, or palette
    useEffect(() => {
        setLocalVal(eq.raw || '');
    }, [eq.raw]);

    const isValid = !eq.parsed?.error;

    const handleChange = (e) => {
        const nextVal = e.target.value;
        setLocalVal(nextVal);
        onUpdateEquation(eq.id, { raw: nextVal });
    };

    const handleBlur = () => {
        if (localVal && onAddToHistory) {
            onAddToHistory(localVal);
        }
    };

    const handleKeyDown = (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            if (localVal && onAddToHistory) {
                onAddToHistory(localVal);
            }
            inputRef.current?.blur();
        }
    };

    return (
        <div
            onClick={onSelect}
            onPointerDown={(e) => e.stopPropagation()}
            className={`group relative flex flex-col p-2.5 rounded-xl border-2 transition-all ${
                isSelected
                    ? (isLight ? 'bg-white shadow-md' : 'bg-slate-850 shadow-lg ring-1')
                    : (isLight ? 'bg-white/80 border-slate-200 hover:border-slate-300' : 'bg-slate-900/90 border-slate-800 hover:border-slate-700')
            }`}
            style={{
                borderColor: isSelected ? eq.color : undefined,
                ringColor: isSelected ? `${eq.color}40` : undefined
            }}
        >
            {/* Equation Top Controls Bar */}
            <div className="flex items-center justify-between gap-1.5 pb-2">
                <div className="flex items-center gap-2">
                    {/* Color Indicator Swatch / Picker Trigger */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setColorPickerTargetId(colorPickerTargetId === eq.id ? null : eq.id);
                            }}
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs cursor-pointer hover:scale-110 transition-transform"
                            style={{ backgroundColor: eq.color }}
                            title="Change Equation Color"
                        />

                        {/* Color Picker Swatches Popover */}
                        {colorPickerTargetId === eq.id && (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute left-0 top-6 z-50 p-2.5 border rounded-xl shadow-2xl grid grid-cols-4 gap-1.5 w-36 animate-in fade-in duration-100 ${
                                    isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                                }`}
                            >
                                {COLOR_SWATCHES.map((hex) => (
                                    <button
                                        key={hex}
                                        type="button"
                                        onClick={() => {
                                            onUpdateEquation(eq.id, { color: hex });
                                            setColorPickerTargetId(null);
                                        }}
                                        className="w-6 h-6 rounded-full border border-black/20 hover:scale-115 transition-transform"
                                        style={{ backgroundColor: hex }}
                                        title={`Select Color ${hex}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Equation Sequence Number Badge */}
                    <span className={`font-mono text-xs font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        #{idx + 1}
                    </span>

                    {/* Validation Status Badge */}
                    {isValid ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" title="Valid expression" />
                    ) : (
                        <span className="flex items-center gap-1 text-[11px] text-rose-500 font-semibold" title={eq.parsed?.error}>
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            Syntax error
                        </span>
                    )}
                </div>

                {/* Row Actions: Reorder, Duplicate, Lock, Visibility, Delete */}
                <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    {/* Move Up */}
                    {idx > 0 && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onReorderEquations(idx, idx - 1); }}
                            className={`p-1 rounded transition ${isLight ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-800' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                            title="Move Up"
                        >
                            <ArrowUp className="w-3 h-3" />
                        </button>
                    )}

                    {/* Move Down */}
                    {idx < totalEquations - 1 && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onReorderEquations(idx, idx + 1); }}
                            className={`p-1 rounded transition ${isLight ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-800' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                            title="Move Down"
                        >
                            <ArrowDown className="w-3 h-3" />
                        </button>
                    )}

                    {/* Duplicate */}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDuplicateEquation(eq.id); }}
                        className={`p-1 rounded transition ${isLight ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-800' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                        title="Duplicate Equation"
                    >
                        <Copy className="w-3 h-3" />
                    </button>

                    {/* Lock Toggle */}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onUpdateEquation(eq.id, { isLocked: !eq.isLocked }); }}
                        className={`p-1 rounded transition ${
                            eq.isLocked 
                                ? 'text-amber-500 bg-amber-500/10' 
                                : (isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800')
                        }`}
                        title={eq.isLocked ? "Unlock Equation" : "Lock Equation"}
                    >
                        {eq.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>

                    {/* Visibility Toggle */}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onUpdateEquation(eq.id, { visible: !eq.visible }); }}
                        className={`p-1 rounded transition ${
                            eq.visible 
                                ? 'text-sky-500' 
                                : (isLight ? 'text-slate-400 hover:text-slate-600' : 'text-slate-600 hover:text-slate-400')
                        }`}
                        title={eq.visible ? "Hide Equation" : "Show Equation"}
                    >
                        {eq.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>

                    {/* Delete Button */}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDeleteEquation(eq.id); }}
                        className="p-1 hover:bg-rose-500/20 rounded text-slate-400 hover:text-rose-500 transition"
                        title="Delete Equation"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Main Formula Input Field */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={localVal}
                    disabled={eq.isLocked}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onPointerDown={(e) => e.stopPropagation()}
                    placeholder="e.g. y = 2x + 1 or sin(x)"
                    className={`w-full px-3 py-1.5 border rounded-lg font-mono text-sm outline-none transition focus:ring-2 ${
                        isLight 
                            ? 'bg-slate-50 text-slate-900 placeholder-slate-400' 
                            : 'bg-slate-950/80 text-slate-100 placeholder-slate-600'
                    } ${
                        isValid
                            ? (isLight ? 'border-slate-300 focus:border-sky-500 focus:ring-sky-500/20' : 'border-slate-700/80 focus:border-sky-500 focus:ring-sky-500/20')
                            : 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20 text-rose-500'
                    }`}
                />
            </div>

            {/* KaTeX Math Formula Preview */}
            {isValid && localVal && (
                <div className={`mt-1.5 px-2 py-0.5 text-xs font-mono overflow-x-auto hide-scrollbar opacity-90 ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                }`}>
                    <KaTeXPreview math={localVal} />
                </div>
            )}

            {/* Inline Error Message */}
            {!isValid && (
                <div className="mt-1.5 text-[11px] text-rose-500 font-mono flex items-center gap-1">
                    <span>Check expression syntax</span>
                </div>
            )}
        </div>
    );
}

