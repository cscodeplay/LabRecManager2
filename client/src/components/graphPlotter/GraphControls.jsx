'use client';

import React, { useState } from 'react';
import { 
    ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize, Settings2, 
    Download, Calculator, Edit3, Presentation, Grid, Eye, Check,
    Compass, Lock, Unlock, Layers, Share2, Copy, FileText, Image as ImageIcon,
    FileSpreadsheet, Sparkles, X, ChevronDown, Crosshair,
    Sun, Moon, Camera
} from 'lucide-react';

export default function GraphControls({
    viewBounds,
    onUpdateViewBounds,
    onResetView,
    onFitToEquations,
    showGrid,
    onToggleGrid,
    showMinorGrid,
    onToggleMinorGrid,
    showAxisLabels,
    onToggleAxisLabels,
    lockAspectRatio,
    onToggleLockAspectRatio,
    snapToGrid,
    onToggleSnapToGrid,
    coordinateSystem,
    onToggleCoordinateSystem,
    isFullscreen,
    onToggleFullscreen,
    isPresentationMode,
    onTogglePresentationMode,
    activeAnalysis,
    onSelectAnalysis,
    activeAnnotationTool,
    onSelectAnnotationTool,
    onClearAnnotations,
    onExportGraph,
    onConvertToStatic,
    theme = 'dark',
    onToggleTheme
}) {
    const isDark = theme === 'dark';
    const [showRangeModal, setShowRangeModal] = useState(false);
    const [showAnalysisMenu, setShowAnalysisMenu] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showAnnotationMenu, setShowAnnotationMenu] = useState(false);

    // Range modal local state
    const [rangeForm, setRangeForm] = useState({
        xMin: viewBounds.xMin,
        xMax: viewBounds.xMax,
        yMin: viewBounds.yMin,
        yMax: viewBounds.yMax
    });

    const handleApplyRange = (e) => {
        e.preventDefault();
        onUpdateViewBounds({
            xMin: parseFloat(rangeForm.xMin) || -10,
            xMax: parseFloat(rangeForm.xMax) || 10,
            yMin: parseFloat(rangeForm.yMin) || -6,
            yMax: parseFloat(rangeForm.yMax) || 6
        });
        setShowRangeModal(false);
    };

    return (
        <div className={`flex items-center gap-1 p-1 backdrop-blur-md rounded-xl shadow-2xl z-30 select-none border transition-colors ${
            isDark ? 'bg-slate-900/90 border-slate-700/80 text-slate-100' : 'bg-white/95 border-slate-300 text-slate-800'
        }`}>
            {/* Zoom In */}
            <button
                type="button"
                onClick={() => {
                    const factor = 0.8;
                    const xRange = (viewBounds.xMax - viewBounds.xMin) * factor;
                    const yRange = (viewBounds.yMax - viewBounds.yMin) * factor;
                    const cx = (viewBounds.xMin + viewBounds.xMax) / 2;
                    const cy = (viewBounds.yMin + viewBounds.yMax) / 2;
                    onUpdateViewBounds({
                        xMin: cx - xRange / 2,
                        xMax: cx + xRange / 2,
                        yMin: cy - yRange / 2,
                        yMax: cy + yRange / 2
                    });
                }}
                className={`p-1.5 rounded-lg transition ${
                    isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Zoom In (+)"
            >
                <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Zoom Out */}
            <button
                type="button"
                onClick={() => {
                    const factor = 1.25;
                    const xRange = (viewBounds.xMax - viewBounds.xMin) * factor;
                    const yRange = (viewBounds.yMax - viewBounds.yMin) * factor;
                    const cx = (viewBounds.xMin + viewBounds.xMax) / 2;
                    const cy = (viewBounds.yMin + viewBounds.yMax) / 2;
                    onUpdateViewBounds({
                        xMin: cx - xRange / 2,
                        xMax: cx + xRange / 2,
                        yMin: cy - yRange / 2,
                        yMax: cy + yRange / 2
                    });
                }}
                className={`p-1.5 rounded-lg transition ${
                    isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Zoom Out (-)"
            >
                <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Reset View */}
            <button
                type="button"
                onClick={onResetView}
                className={`p-1.5 rounded-lg transition ${
                    isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Reset View (Default [-10, 10])"
            >
                <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Fit to Equations */}
            <button
                type="button"
                onClick={onFitToEquations}
                className={`p-1.5 rounded-lg transition ${
                    isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Fit View to Equations"
            >
                <Crosshair className="w-3.5 h-3.5" />
            </button>

            <div className={`w-px h-4 mx-0.5 ${isDark ? 'bg-slate-700/80' : 'bg-slate-300'}`} />

            {/* Range Settings Modal Button */}
            <button
                type="button"
                onClick={() => {
                    setRangeForm(viewBounds);
                    setShowRangeModal(true);
                }}
                className={`p-1.5 rounded-lg transition ${
                    showRangeModal 
                        ? 'bg-sky-500 text-white' 
                        : (isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                }`}
                title="Axes Range Settings"
            >
                <Settings2 className="w-3.5 h-3.5" />
            </button>

            {/* Grid Toggle */}
            <button
                type="button"
                onClick={onToggleGrid}
                className={`p-1.5 rounded-lg transition ${
                    showGrid 
                        ? 'text-sky-400 bg-sky-500/20' 
                        : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')
                }`}
                title={showGrid ? "Hide Grid" : "Show Grid"}
            >
                <Grid className="w-3.5 h-3.5" />
            </button>

            {/* Coordinate System Toggle (Cartesian vs Polar) */}
            <button
                type="button"
                onClick={onToggleCoordinateSystem}
                className={`p-1.5 rounded-lg transition ${
                    coordinateSystem === 'polar' 
                        ? 'text-emerald-500 bg-emerald-500/20 font-bold' 
                        : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')
                }`}
                title={`Coordinate System: ${coordinateSystem === 'polar' ? 'Switch to Cartesian Grid' : 'Switch to Polar Grid'}`}
            >
                <Compass className="w-3.5 h-3.5" />
            </button>

            {/* Aspect Ratio Lock Toggle */}
            <button
                type="button"
                onClick={onToggleLockAspectRatio}
                className={`p-1.5 rounded-lg transition ${
                    lockAspectRatio 
                        ? 'text-amber-500 bg-amber-500/20' 
                        : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')
                }`}
                title={lockAspectRatio ? "Unlock 1:1 Aspect Ratio" : "Lock 1:1 Aspect Ratio (Square Scale)"}
            >
                {lockAspectRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>

            <div className={`w-px h-4 mx-0.5 ${isDark ? 'bg-slate-700/80' : 'bg-slate-300'}`} />

            {/* Theme Toggle (Dark / Light) */}
            {onToggleTheme && (
                <button
                    type="button"
                    onClick={onToggleTheme}
                    className={`p-1.5 rounded-lg transition ${
                        isDark ? 'text-amber-400 hover:text-white hover:bg-slate-800' : 'text-amber-600 hover:text-amber-900 hover:bg-slate-100'
                    }`}
                    title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
                >
                    {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
            )}

            {/* Directly Insert Graph as Image onto Whiteboard */}
            {onConvertToStatic && (
                <button
                    type="button"
                    onClick={onConvertToStatic}
                    className={`p-1.5 rounded-lg transition ${
                        isDark ? 'text-indigo-400 hover:text-white hover:bg-slate-800' : 'text-indigo-600 hover:text-indigo-900 hover:bg-slate-100'
                    }`}
                    title="Insert Graph as Image onto Whiteboard"
                >
                    <Camera className="w-3.5 h-3.5" />
                </button>
            )}

            {/* Mathematical Analysis Tools Menu */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => {
                        setShowAnalysisMenu(prev => !prev);
                        setShowExportMenu(false);
                        setShowAnnotationMenu(false);
                    }}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                        activeAnalysis 
                            ? 'bg-amber-500/25 text-amber-500 ring-1 ring-amber-500/50' 
                            : (isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100')
                    }`}
                    title="Mathematical Analysis Tools (Roots, Extrema, Intersections, Tangents, Integrals)"
                >
                    <Calculator className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden sm:inline">Analysis</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {showAnalysisMenu && (
                    <div className={`absolute right-0 bottom-full mb-2 border rounded-xl shadow-2xl p-1.5 w-52 flex flex-col gap-0.5 text-xs z-50 animate-in fade-in duration-100 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}>
                        <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-b ${
                            isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
                        }`}>
                            Mathematical Tools
                        </div>
                        {[
                            { id: 'roots', label: 'Find Roots (x-intercepts)' },
                            { id: 'extrema', label: 'Find Min / Max Extrema' },
                            { id: 'intersections', label: 'Find Intersections' },
                            { id: 'tangent', label: 'Interactive Tangent Line' },
                            { id: 'integral', label: 'Area Under Curve (Integral)' },
                            { id: 'derivative', label: 'Plot Derivative f\'(x)' },
                        ].map((tool) => (
                            <button
                                key={tool.id}
                                type="button"
                                onClick={() => {
                                    onSelectAnalysis(activeAnalysis?.type === tool.id ? null : tool.id);
                                    setShowAnalysisMenu(false);
                                }}
                                className={`px-2 py-1.5 rounded-lg text-left flex items-center justify-between transition ${
                                    activeAnalysis?.type === tool.id 
                                        ? 'bg-amber-500/20 text-amber-500 font-semibold' 
                                        : (isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900')
                                }`}
                                title={`Calculate and plot ${tool.label}`}
                            >
                                <span>{tool.label}</span>
                                {activeAnalysis?.type === tool.id && <Check className="w-3.5 h-3.5 text-amber-500" />}
                            </button>
                        ))}
                        {activeAnalysis && (
                            <button
                                type="button"
                                onClick={() => {
                                    onSelectAnalysis(null);
                                    setShowAnalysisMenu(false);
                                }}
                                className="mt-1 px-2 py-1 text-center text-rose-500 hover:bg-rose-500/10 rounded-lg text-[11px]"
                                title="Clear Analysis Overlays"
                            >
                                Clear Analysis Overlays
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Annotation Tools Menu */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => {
                        setShowAnnotationMenu(prev => !prev);
                        setShowAnalysisMenu(false);
                        setShowExportMenu(false);
                    }}
                    className={`p-1.5 rounded-lg transition ${
                        activeAnnotationTool 
                            ? 'bg-emerald-500/20 text-emerald-500 ring-1 ring-emerald-500/50' 
                            : (isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                    }`}
                    title="Graph Freehand Annotations & Drawing Tools"
                >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
                </button>

                {showAnnotationMenu && (
                    <div className={`absolute right-0 bottom-full mb-2 border rounded-xl shadow-2xl p-1.5 w-48 flex flex-col gap-0.5 text-xs z-50 animate-in fade-in duration-100 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}>
                        <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-b ${
                            isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
                        }`}>
                            Graph Annotations
                        </div>
                        <button
                            type="button"
                            onClick={() => { onSelectAnnotationTool(activeAnnotationTool === 'pen' ? null : 'pen'); setShowAnnotationMenu(false); }}
                            className={`px-2 py-1.5 rounded-lg text-left flex items-center justify-between transition ${
                                activeAnnotationTool === 'pen' 
                                    ? 'bg-emerald-500/20 text-emerald-500 font-bold' 
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900')
                            }`}
                            title="Freehand Pen Tool"
                        >
                            <span>Freehand Pen</span>
                            {activeAnnotationTool === 'pen' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => { onSelectAnnotationTool(activeAnnotationTool === 'highlighter' ? null : 'highlighter'); setShowAnnotationMenu(false); }}
                            className={`px-2 py-1.5 rounded-lg text-left flex items-center justify-between transition ${
                                activeAnnotationTool === 'highlighter' 
                                    ? 'bg-emerald-500/20 text-emerald-500 font-bold' 
                                    : (isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900')
                            }`}
                            title="Highlighter Tool"
                        >
                            <span>Highlighter</span>
                            {activeAnnotationTool === 'highlighter' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => { onClearAnnotations(); setShowAnnotationMenu(false); }}
                            className="mt-1 px-2 py-1 text-center text-rose-500 hover:bg-rose-500/10 rounded-lg text-[11px]"
                            title="Clear Annotations"
                        >
                            Clear Annotations
                        </button>
                    </div>
                )}
            </div>

            {/* Presentation Mode Toggle */}
            <button
                type="button"
                onClick={onTogglePresentationMode}
                className={`p-1.5 rounded-lg transition ${
                    isPresentationMode 
                        ? 'bg-violet-600 text-white shadow-md' 
                        : (isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                }`}
                title={isPresentationMode ? "Exit Classroom Presentation Mode" : "Classroom Presentation Mode (Clean View & Step-by-Step Reveal)"}
            >
                <Presentation className="w-3.5 h-3.5 text-violet-400" />
            </button>

            {/* Fullscreen Toggle */}
            <button
                type="button"
                onClick={onToggleFullscreen}
                className={`p-1.5 rounded-lg transition ${
                    isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Graph Mode"}
            >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>

            {/* Export Menu */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => {
                        setShowExportMenu(prev => !prev);
                        setShowAnalysisMenu(false);
                        setShowAnnotationMenu(false);
                    }}
                    className={`p-1.5 rounded-lg transition ${
                        isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Export & Convert Graph"
                >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                </button>

                {showExportMenu && (
                    <div className={`absolute right-0 bottom-full mb-2 border rounded-xl shadow-2xl p-1.5 w-56 flex flex-col gap-0.5 text-xs z-50 animate-in fade-in duration-100 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}>
                        <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-b ${
                            isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
                        }`}>
                            Export Options
                        </div>
                        <button
                            type="button"
                            onClick={() => { onExportGraph('png'); setShowExportMenu(false); }}
                            className={`px-2 py-1.5 rounded-lg text-left flex items-center gap-2 transition ${
                                isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                            title="Export Graph as PNG Image file"
                        >
                            <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                            <span>Export as PNG Image</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { onExportGraph('svg'); setShowExportMenu(false); }}
                            className={`px-2 py-1.5 rounded-lg text-left flex items-center gap-2 transition ${
                                isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                            title="Export Graph as SVG Vector file"
                        >
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Export as SVG Vector</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { onExportGraph('copy_image'); setShowExportMenu(false); }}
                            className={`px-2 py-1.5 rounded-lg text-left flex items-center gap-2 transition ${
                                isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                            title="Copy Graph Image to Clipboard"
                        >
                            <Copy className="w-3.5 h-3.5 text-amber-400" />
                            <span>Copy Image to Clipboard</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { onExportGraph('copy_equations'); setShowExportMenu(false); }}
                            className={`px-2 py-1.5 rounded-lg text-left flex items-center gap-2 transition ${
                                isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                            title="Copy All Equation Formulas as Text"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-violet-400" />
                            <span>Copy Equations as Text</span>
                        </button>

                        <div className={`w-full h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

                        {/* Directly Insert Graph as Image onto Whiteboard */}
                        <button
                            type="button"
                            onClick={() => { onConvertToStatic(); setShowExportMenu(false); }}
                            className={`px-2 py-1.5 rounded-lg text-left flex items-center gap-2 font-semibold transition ${
                                isDark ? 'text-indigo-300 hover:bg-indigo-600/20' : 'text-indigo-600 hover:bg-indigo-50'
                            }`}
                            title="Insert Graph as Image onto Whiteboard"
                        >
                            <Camera className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Insert Image onto Whiteboard</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Range Settings Modal */}
            {showRangeModal && (
                <div 
                    className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setShowRangeModal(false)}
                >
                    <form
                        onSubmit={handleApplyRange}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 w-full max-w-xs flex flex-col gap-3 text-slate-100 animate-in zoom-in-95 duration-150"
                    >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="font-bold text-sm">Coordinate Axes Ranges</span>
                            <button
                                type="button"
                                onClick={() => setShowRangeModal(false)}
                                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
                                title="Close Range Dialog"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase font-bold">X Min</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={rangeForm.xMin}
                                    onChange={(e) => setRangeForm({ ...rangeForm, xMin: e.target.value })}
                                    className="w-full mt-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase font-bold">X Max</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={rangeForm.xMax}
                                    onChange={(e) => setRangeForm({ ...rangeForm, xMax: e.target.value })}
                                    className="w-full mt-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase font-bold">Y Min</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={rangeForm.yMin}
                                    onChange={(e) => setRangeForm({ ...rangeForm, yMin: e.target.value })}
                                    className="w-full mt-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 uppercase font-bold">Y Max</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={rangeForm.yMax}
                                    onChange={(e) => setRangeForm({ ...rangeForm, yMax: e.target.value })}
                                    className="w-full mt-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => {
                                    setRangeForm({ xMin: -10, xMax: 10, yMin: -6, yMax: 6 });
                                }}
                                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                                title="Reset to Default Range [-10, 10]"
                            >
                                Reset Default
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold"
                                title="Apply Axes Ranges"
                            >
                                Apply Ranges
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
