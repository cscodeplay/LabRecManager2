'use client';

import React, { useState } from 'react';
import { 
    ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize, Settings2, 
    Download, Calculator, Edit3, Presentation, Grid, Eye, Check,
    Compass, Lock, Unlock, Layers, Share2, Copy, FileText, Image as ImageIcon,
    FileSpreadsheet, Sparkles, X, ChevronDown, Crosshair
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
    onConvertToStatic
}) {
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
        <div className="flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl z-30 select-none">
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
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
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
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                title="Zoom Out (-)"
            >
                <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Reset View */}
            <button
                type="button"
                onClick={onResetView}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                title="Reset View (Default [-10, 10])"
            >
                <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Fit to Equations */}
            <button
                type="button"
                onClick={onFitToEquations}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                title="Fit to Equations"
            >
                <Crosshair className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-slate-700/80 mx-0.5" />

            {/* Range Settings Modal Button */}
            <button
                type="button"
                onClick={() => {
                    setRangeForm(viewBounds);
                    setShowRangeModal(true);
                }}
                className={`p-1.5 rounded-lg transition ${
                    showRangeModal ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
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
                    showGrid ? 'text-sky-400 bg-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
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
                    coordinateSystem === 'polar' ? 'text-emerald-400 bg-emerald-500/20 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={`Coordinate System: ${coordinateSystem === 'polar' ? 'Polar Grid' : 'Cartesian Grid'}`}
            >
                <Compass className="w-3.5 h-3.5" />
            </button>

            {/* Aspect Ratio Lock Toggle */}
            <button
                type="button"
                onClick={onToggleLockAspectRatio}
                className={`p-1.5 rounded-lg transition ${
                    lockAspectRatio ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={lockAspectRatio ? "Unlock 1:1 Aspect Ratio" : "Lock 1:1 Aspect Ratio (Square Scale)"}
            >
                {lockAspectRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>

            <div className="w-px h-4 bg-slate-700/80 mx-0.5" />

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
                        activeAnalysis ? 'bg-amber-500/25 text-amber-300 ring-1 ring-amber-500/50' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Mathematical Analysis Features"
                >
                    <Calculator className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Analysis</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {showAnalysisMenu && (
                    <div className="absolute right-0 bottom-full mb-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 w-48 flex flex-col gap-0.5 text-xs z-50 animate-in fade-in duration-100">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
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
                                    activeAnalysis?.type === tool.id ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                <span>{tool.label}</span>
                                {activeAnalysis?.type === tool.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                            </button>
                        ))}
                        {activeAnalysis && (
                            <button
                                type="button"
                                onClick={() => {
                                    onSelectAnalysis(null);
                                    setShowAnalysisMenu(false);
                                }}
                                className="mt-1 px-2 py-1 text-center text-rose-400 hover:bg-rose-500/10 rounded-lg text-[11px]"
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
                        activeAnnotationTool ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Graph Freehand Annotations"
                >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                </button>

                {showAnnotationMenu && (
                    <div className="absolute right-0 bottom-full mb-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 w-44 flex flex-col gap-0.5 text-xs z-50 animate-in fade-in duration-100">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                            Graph Annotations
                        </div>
                        <button
                            type="button"
                            onClick={() => { onSelectAnnotationTool(activeAnnotationTool === 'pen' ? null : 'pen'); setShowAnnotationMenu(false); }}
                            className={`px-2 py-1.5 rounded-lg text-left flex items-center justify-between ${
                                activeAnnotationTool === 'pen' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-300 hover:bg-slate-800'
                            }`}
                        >
                            <span>Freehand Pen</span>
                            {activeAnnotationTool === 'pen' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => { onSelectAnnotationTool(activeAnnotationTool === 'highlighter' ? null : 'highlighter'); setShowAnnotationMenu(false); }}
                            className={`px-2 py-1.5 rounded-lg text-left flex items-center justify-between ${
                                activeAnnotationTool === 'highlighter' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-300 hover:bg-slate-800'
                            }`}
                        >
                            <span>Highlighter</span>
                            {activeAnnotationTool === 'highlighter' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => { onClearAnnotations(); setShowAnnotationMenu(false); }}
                            className="mt-1 px-2 py-1 text-center text-rose-400 hover:bg-rose-500/10 rounded-lg text-[11px]"
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
                    isPresentationMode ? 'bg-violet-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Classroom / Presentation Mode (Clean, Large)"
            >
                <Presentation className="w-3.5 h-3.5 text-violet-400" />
            </button>

            {/* Fullscreen Toggle */}
            <button
                type="button"
                onClick={onToggleFullscreen}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
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
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                    title="Export & Convert Graph"
                >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                </button>

                {showExportMenu && (
                    <div className="absolute right-0 bottom-full mb-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 w-52 flex flex-col gap-0.5 text-xs z-50 animate-in fade-in duration-100">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                            Export Options
                        </div>
                        <button
                            type="button"
                            onClick={() => { onExportGraph('png'); setShowExportMenu(false); }}
                            className="px-2 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                        >
                            <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                            <span>Export as PNG Image</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { onExportGraph('svg'); setShowExportMenu(false); }}
                            className="px-2 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                        >
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Export as SVG Vector</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { onExportGraph('copy_image'); setShowExportMenu(false); }}
                            className="px-2 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                        >
                            <Copy className="w-3.5 h-3.5 text-amber-400" />
                            <span>Copy Image to Clipboard</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { onExportGraph('copy_equations'); setShowExportMenu(false); }}
                            className="px-2 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-violet-400" />
                            <span>Copy Equations as Text</span>
                        </button>

                        <div className="w-full h-px bg-slate-800 my-1" />

                        {/* Convert to Static Drawing */}
                        <button
                            type="button"
                            onClick={() => { onConvertToStatic(); setShowExportMenu(false); }}
                            className="px-2 py-1.5 rounded-lg text-left text-indigo-300 hover:bg-indigo-600/20 flex items-center gap-2 font-semibold"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Convert to Static Drawing</span>
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
                            >
                                Reset Default
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold"
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
