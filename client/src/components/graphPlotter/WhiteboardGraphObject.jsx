'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
    compileExpression, 
    parseEquation,
    extractParameters 
} from './mathParser';
import { getEquationColor } from './colorPalette';
import GraphCanvas from './GraphCanvas';
import EquationEditor from './EquationEditor';
import GraphControls from './GraphControls';
import { 
    Move, Lock, Unlock, Trash2, Copy, RotateCw, Sparkles, 
    Presentation, ChevronLeft, ChevronRight, Download, Eye, EyeOff,
    Check, X, ChevronsUp, ChevronsDown, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen,
    Camera, Sun, Moon
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function WhiteboardGraphObject({
    graph: propGraph,
    graphObj,
    isSelected = false,
    scale = 1,
    onSelect,
    onUpdate,
    onDelete,
    onDuplicate,
    onConvertToStaticDrawing,
    onBringForward,
    onSendBackward
}) {
    const containerRef = useRef(null);
    const graph = propGraph || graphObj;
    if (!graph) return null;

    // Initial state normalization
    const width = Math.max(480, graph?.width || 760);
    const height = Math.max(340, graph?.height || 480);
    const x = graph?.x || 120;
    const y = graph?.y || 80;
    const rotation = graph?.rotation || 0;
    const isLocked = Boolean(graph?.isLocked);

    // Theme (dark / light)
    const theme = graph?.theme || 'dark';
    const isDark = theme === 'dark';

    // Equation editor panel visibility (drawer toggle)
    const [showDrawer, setShowDrawer] = useState(graph?.showDrawer !== undefined ? graph.showDrawer : true);
    const [drawerWidth, setDrawerWidth] = useState(300);

    // Presentation mode
    const [isPresentationMode, setIsPresentationMode] = useState(Boolean(graph?.isPresentationMode));
    const [presentationStep, setPresentationStep] = useState(0);

    // Active selection within graph
    const [selectedEqId, setSelectedEqId] = useState(null);
    const [activeAnalysis, setActiveAnalysis] = useState(null); // { type, eqId, x0, a, b }
    const [activeAnnotationTool, setActiveAnnotationTool] = useState(null);

    // Fullscreen within browser
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Parsing and compiling equations
    // Each equation: { id, raw, label, color, visible, isLocked, parsed, compiled, compiledX, compiledY }
    const compiledEquations = useMemo(() => {
        const rawList = graph?.equations || [
            { id: 'eq_1', raw: 'y = 2x + 1', color: getEquationColor(0), visible: true },
            { id: 'eq_2', raw: 'y = x^2 - 4', color: getEquationColor(1), visible: true }
        ];

        return rawList.map((eq, idx) => {
            const color = eq.color || getEquationColor(idx);
            const parsed = parseEquation(eq.raw || '');
            let compiled = null;
            let compiledX = null;
            let compiledY = null;

            if (!parsed.error) {
                try {
                    if (parsed.type === 'parametric' && parsed.parametric) {
                        compiledX = compileExpression(parsed.parametric.xExpr);
                        compiledY = compileExpression(parsed.parametric.yExpr);
                    } else if (parsed.expression) {
                        compiled = compileExpression(parsed.expression);
                    }
                } catch (err) {
                    parsed.error = err.message;
                }
            }

            return {
                ...eq,
                color,
                visible: eq.visible !== false,
                isLocked: Boolean(eq.isLocked),
                parsed,
                compiled,
                compiledX,
                compiledY
            };
        });
    }, [graph?.equations]);

    // View bounds: [xMin, xMax, yMin, yMax]
    const viewBounds = graph?.viewBounds || { xMin: -10, xMax: 10, yMin: -6, yMax: 6 };
    const coordinateSystem = graph?.coordinateSystem || 'cartesian';
    const showGrid = graph?.showGrid !== undefined ? graph.showGrid : true;
    const showMinorGrid = graph?.showMinorGrid !== undefined ? graph.showMinorGrid : true;
    const showAxisLabels = graph?.showAxisLabels !== undefined ? graph.showAxisLabels : true;
    const lockAspectRatio = Boolean(graph?.lockAspectRatio);
    const parameters = graph?.parameters || {};
    const legendConfig = graph?.legendConfig || { show: true, position: 'top-right' };
    const annotations = graph?.annotations || [];

    // Ensure selected equation defaults to first valid equation
    useEffect(() => {
        if (!selectedEqId && compiledEquations.length > 0) {
            setSelectedEqId(compiledEquations[0].id);
        }
    }, [compiledEquations, selectedEqId]);

    // Update handler helper
    const handleUpdate = useCallback((updates) => {
        if (onUpdate) {
            onUpdate(updates);
        }
    }, [onUpdate]);

    // ─────────────────────────────────────────────────────────────────────────
    // EQUATION MANAGEMENT ACTIONS
    // ─────────────────────────────────────────────────────────────────────────

    const handleAddEquation = (customRaw = '') => {
        const nextColor = getEquationColor(compiledEquations.length);
        const rawFormula = (typeof customRaw === 'string' && customRaw.trim()) ? customRaw.trim() : 'y = sin(x)';
        const newEq = {
            id: `eq_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            raw: rawFormula,
            color: nextColor,
            visible: true
        };
        const nextList = [...(graph?.equations || compiledEquations), newEq];
        handleUpdate({ equations: nextList });
        setSelectedEqId(newEq.id);
        toast.success('Equation added', { icon: '📐' });
    };

    const handleUpdateEquation = (id, updates) => {
        const nextList = compiledEquations.map(e => e.id === id ? { ...e, ...updates } : e);
        handleUpdate({ equations: nextList });
    };

    const handleDeleteEquation = (id) => {
        const nextList = compiledEquations.filter(e => e.id !== id);
        handleUpdate({ equations: nextList });
        if (selectedEqId === id) {
            setSelectedEqId(nextList.length > 0 ? nextList[0].id : null);
        }
        toast.success('Equation deleted');
    };

    const handleDuplicateEquation = (id) => {
        const orig = compiledEquations.find(e => e.id === id);
        if (!orig) return;
        const newEq = {
            ...orig,
            id: `eq_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            color: getEquationColor(compiledEquations.length),
            label: orig.label ? `${orig.label} (Copy)` : undefined
        };
        const nextList = [...compiledEquations, newEq];
        handleUpdate({ equations: nextList });
        setSelectedEqId(newEq.id);
        toast.success('Equation duplicated');
    };

    const handleReorderEquations = (fromIdx, toIdx) => {
        if (fromIdx < 0 || toIdx < 0 || fromIdx >= compiledEquations.length || toIdx >= compiledEquations.length) return;
        const nextList = [...compiledEquations];
        const [moved] = nextList.splice(fromIdx, 1);
        nextList.splice(toIdx, 0, moved);
        handleUpdate({ equations: nextList });
    };

    const handleClearAllEquations = () => {
        handleUpdate({ equations: [] });
        setSelectedEqId(null);
        toast('All equations cleared');
    };

    const handleToggleAllVisibility = () => {
        const allVisible = compiledEquations.every(e => e.visible);
        const nextList = compiledEquations.map(e => ({ ...e, visible: !allVisible }));
        handleUpdate({ equations: nextList });
    };

    const handleUpdateParameter = (paramName, val) => {
        handleUpdate({
            parameters: {
                ...parameters,
                [paramName]: val
            }
        });
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RESIZE & DRAG HANDLERS (Whiteboard Native Integration)
    // ─────────────────────────────────────────────────────────────────────────

    const handleMoveStart = (e) => {
        if (isLocked) return;
        e.stopPropagation();
        onSelect && onSelect(graph?.id);

        const startX = e.clientX;
        const startY = e.clientY;
        const initX = x;
        const initY = y;

        const onPointerMove = (moveEvent) => {
            const dx = (moveEvent.clientX - startX) / scale;
            const dy = (moveEvent.clientY - startY) / scale;
            handleUpdate({
                x: Math.round(initX + dx),
                y: Math.round(initY + dy)
            });
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    const handleResizeStart = (handle, e) => {
        if (isLocked) return;
        e.stopPropagation();
        onSelect && onSelect(graph?.id);

        const startX = e.clientX;
        const startY = e.clientY;
        const initW = width;
        const initH = height;
        const initX = x;
        const initY = y;

        const onPointerMove = (moveEvent) => {
            const dx = (moveEvent.clientX - startX) / scale;
            const dy = (moveEvent.clientY - startY) / scale;

            let newW = initW;
            let newH = initH;
            let newX = initX;
            let newY = initY;

            if (handle.includes('e')) newW = Math.max(460, initW + dx);
            if (handle.includes('s')) newH = Math.max(320, initH + dy);
            if (handle.includes('w')) {
                const proposedW = initW - dx;
                if (proposedW >= 460) {
                    newW = proposedW;
                    newX = initX + dx;
                }
            }
            if (handle.includes('n')) {
                const proposedH = initH - dy;
                if (proposedH >= 320) {
                    newH = proposedH;
                    newY = initY + dy;
                }
            }

            handleUpdate({
                width: Math.round(newW),
                height: Math.round(newH),
                x: Math.round(newX),
                y: Math.round(newY)
            });
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // EXPORT & CONVERT TO STATIC DRAWING
    // ─────────────────────────────────────────────────────────────────────────

    const handleExportGraph = async (type) => {
        const svgEl = containerRef.current?.querySelector('svg');
        if (!svgEl) return;

        try {
            if (type === 'svg') {
                const serializer = new XMLSerializer();
                const svgString = serializer.serializeToString(svgEl);
                const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `graph_plotter_${Date.now()}.svg`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Exported as SVG vector', { icon: '📊' });
            } else if (type === 'png' || type === 'copy_image') {
                const serializer = new XMLSerializer();
                const svgString = serializer.serializeToString(svgEl);
                const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = svgEl.clientWidth * 2;
                    canvas.height = svgEl.clientHeight * 2;
                    const ctx = canvas.getContext('2d');
                    ctx.scale(2, 2);
                    ctx.drawImage(img, 0, 0);
                    URL.revokeObjectURL(url);

                    if (type === 'copy_image') {
                        canvas.toBlob(async (blob) => {
                            if (blob && navigator?.clipboard?.write) {
                                try {
                                    await navigator.clipboard.write([
                                        new ClipboardItem({ 'image/png': blob })
                                    ]);
                                    toast.success('Graph image copied to clipboard!', { icon: '📋' });
                                } catch {
                                    toast.error('Clipboard copy not supported by browser');
                                }
                            }
                        });
                    } else {
                        const a = document.createElement('a');
                        a.href = canvas.toDataURL('image/png');
                        a.download = `graph_plotter_${Date.now()}.png`;
                        a.click();
                        toast.success('Exported as high-res PNG image', { icon: '🖼️' });
                    }
                };
                img.src = url;
            } else if (type === 'copy_equations') {
                const text = compiledEquations.map((e, idx) => `#${idx + 1}: ${e.raw}`).join('\n');
                await navigator.clipboard.writeText(text);
                toast.success('Equations copied to clipboard!', { icon: '📋' });
            }
        } catch (err) {
            console.error('Export error:', err);
            toast.error('Failed to export graph: ' + err.message);
        }
    };

    // Convert to static drawing
    const handleConvertToStatic = async () => {
        const svgEl = containerRef.current?.querySelector('svg');
        if (!svgEl) return;

        try {
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgEl);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = svgEl.clientWidth;
                canvas.height = svgEl.clientHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);

                const dataUrl = canvas.toDataURL('image/png');
                if (onConvertToStaticDrawing) {
                    onConvertToStaticDrawing({
                        x,
                        y,
                        width,
                        height,
                        dataUrl,
                        rotation
                    });
                }
                toast.success('Converted graph into static whiteboard drawing!', { icon: '✨' });
            };
            img.src = url;
        } catch (err) {
            console.error('Convert static error:', err);
            toast.error('Failed to convert graph to static');
        }
    };

    // Classroom Step-by-Step Reveal
    const handlePresentationRevealNext = () => {
        setPresentationStep(prev => {
            const next = prev + 1;
            const updated = compiledEquations.map((e, i) => ({ ...e, visible: i < next }));
            handleUpdate({ equations: updated });
            return next;
        });
    };

    const handlePresentationHideAll = () => {
        setPresentationStep(0);
        const updated = compiledEquations.map(e => ({ ...e, visible: false }));
        handleUpdate({ equations: updated });
    };

    const handlePresentationRevealAll = () => {
        setPresentationStep(compiledEquations.length);
        const updated = compiledEquations.map(e => ({ ...e, visible: true }));
        handleUpdate({ equations: updated });
    };

    // Computed canvas width (total width minus drawer if drawer is open in non-presentation mode)
    const activeDrawerWidth = (showDrawer && !isPresentationMode) ? drawerWidth : 0;
    const canvasWidth = Math.max(300, width - activeDrawerWidth);
    const canvasHeight = Math.max(260, height - 42); // minus header bar

    return (
        <div
            ref={containerRef}
            data-graph-id={graph?.id}
            onClick={() => onSelect && onSelect(graph?.id)}
            style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${height}px`,
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                zIndex: graph?.zIndex || 20
            }}
            className={`group rounded-2xl shadow-2xl flex flex-col overflow-visible select-none border-2 transition-shadow ${
                isDark 
                    ? 'bg-slate-900 border-slate-700/80 shadow-slate-950/80' 
                    : 'bg-white border-slate-300 text-slate-800 shadow-slate-300/60'
            } ${
                isSelected
                    ? 'border-sky-500 shadow-sky-500/20 ring-2 ring-sky-500/30'
                    : ''
            }`}
        >
            {/* 1. Header Drag Bar & Title */}
            <div
                onPointerDown={handleMoveStart}
                className={`h-10 px-3 flex items-center justify-between border-b cursor-move rounded-t-2xl shrink-0 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
            >
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-xs animate-pulse" />
                    <span className={`font-bold text-xs tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {graph?.title || 'Graph Plotter'}
                    </span>
                    {isPresentationMode && (
                        <span className="px-2 py-0.5 rounded-full bg-violet-600/30 border border-violet-500/50 text-violet-300 font-bold text-[10px] uppercase tracking-wider">
                            Classroom Mode
                        </span>
                    )}
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
                    {/* Drawer Toggle */}
                    {!isPresentationMode && (
                        <button
                            type="button"
                            onClick={() => setShowDrawer(prev => !prev)}
                            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
                                showDrawer 
                                    ? 'text-sky-400 bg-sky-500/20' 
                                    : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200')
                            }`}
                            title={showDrawer ? "Collapse Equation Sidebar" : "Expand Equation Sidebar"}
                        >
                            {showDrawer ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
                        </button>
                    )}

                    {/* Classroom Presentation Mode Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsPresentationMode(prev => !prev)}
                        className={`p-1.5 rounded-lg transition ${
                            isPresentationMode 
                                ? 'bg-violet-600 text-white' 
                                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200')
                        }`}
                        title={isPresentationMode ? "Exit Classroom Presentation Mode" : "Classroom Presentation Mode"}
                    >
                        <Presentation className="w-3.5 h-3.5 text-violet-400" />
                    </button>

                    {/* Theme Toggle (Dark / Light) */}
                    <button
                        type="button"
                        onClick={handleToggleTheme}
                        className={`p-1.5 rounded-lg transition ${
                            isDark ? 'text-amber-400 hover:text-white hover:bg-slate-800' : 'text-amber-600 hover:text-amber-900 hover:bg-slate-200'
                        }`}
                        title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
                    >
                        {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                    </button>

                    {/* Directly Insert Graph as Image onto Whiteboard */}
                    <button
                        type="button"
                        onClick={handleConvertToStatic}
                        className={`p-1.5 rounded-lg transition ${
                            isDark ? 'text-indigo-400 hover:text-white hover:bg-slate-800' : 'text-indigo-600 hover:text-indigo-900 hover:bg-slate-200'
                        }`}
                        title="Insert Graph as Image onto Whiteboard"
                    >
                        <Camera className="w-3.5 h-3.5" />
                    </button>

                    {/* Lock Toggle */}
                    <button
                        type="button"
                        onClick={() => handleUpdate({ isLocked: !isLocked })}
                        className={`p-1.5 rounded-lg transition ${
                            isLocked ? 'text-amber-400 bg-amber-500/20' : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200')
                        }`}
                        title={isLocked ? "Unlock Graph Object" : "Lock Graph Object"}
                    >
                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>

                    {/* Delete */}
                    <button
                        type="button"
                        onClick={() => onDelete && onDelete(graph?.id)}
                        className={`p-1.5 rounded-lg transition ${
                            isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-600 hover:text-rose-600 hover:bg-rose-100'
                        }`}
                        title="Delete Graph Object"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* 2. Main Body: Split View (Equation Drawer + Graph Canvas) */}
            <div className="flex-1 flex overflow-hidden relative rounded-b-2xl">
                {/* Equation Editor Drawer */}
                {showDrawer && !isPresentationMode && (
                    <div
                        style={{ width: `${drawerWidth}px` }}
                        className={`h-full shrink-0 flex flex-col border-r animate-in slide-in-from-left-2 duration-150 ${
                            isDark ? 'border-slate-800' : 'border-slate-200'
                        }`}
                    >
                        <EquationEditor
                            equations={compiledEquations}
                            selectedEqId={selectedEqId}
                            onSelectEquation={(id) => setSelectedEqId(id)}
                            onAddEquation={handleAddEquation}
                            onUpdateEquation={handleUpdateEquation}
                            onDeleteEquation={handleDeleteEquation}
                            onDuplicateEquation={handleDuplicateEquation}
                            onReorderEquations={handleReorderEquations}
                            onClearAllEquations={handleClearAllEquations}
                            onToggleAllVisibility={handleToggleAllVisibility}
                            parameters={parameters}
                            onUpdateParameter={handleUpdateParameter}
                            theme={theme}
                            onCloseDrawer={() => setShowDrawer(false)}
                        />
                    </div>
                )}

                {/* Graph Canvas Plane Area */}
                <div className={`flex-1 flex flex-col relative overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
                    {/* Collapsible Sidebar Floating Expand Tab */}
                    {!showDrawer && !isPresentationMode && (
                        <button
                            type="button"
                            onClick={() => setShowDrawer(true)}
                            className={`absolute left-0 top-1/2 -translate-y-1/2 z-30 px-1 py-2.5 rounded-r-xl border shadow-lg flex flex-col items-center gap-1 transition ${
                                isDark
                                    ? 'bg-slate-900/95 border-slate-700 text-slate-300 hover:text-sky-400 hover:bg-slate-800'
                                    : 'bg-white/95 border-slate-300 text-slate-700 hover:text-sky-600 hover:bg-slate-50'
                            }`}
                            title="Expand Equation Sidebar"
                        >
                            <PanelLeftOpen className="w-4 h-4 text-sky-400" />
                            <span className="text-[10px] font-bold tracking-wider [writing-mode:vertical-lr] rotate-180">
                                Equations
                            </span>
                        </button>
                    )}

                    <GraphCanvas
                        width={canvasWidth}
                        height={canvasHeight}
                        equations={compiledEquations}
                        selectedEqId={selectedEqId}
                        onSelectEquation={(id) => setSelectedEqId(id)}
                        viewBounds={viewBounds}
                        onUpdateViewBounds={(nb) => handleUpdate({ viewBounds: nb })}
                        coordinateSystem={coordinateSystem}
                        showGrid={showGrid}
                        showMinorGrid={showMinorGrid}
                        showAxisLabels={showAxisLabels}
                        lockAspectRatio={lockAspectRatio}
                        parameters={parameters}
                        legendConfig={legendConfig}
                        activeAnalysis={activeAnalysis}
                        onUpdateAnalysis={setActiveAnalysis}
                        annotations={annotations}
                        onUpdateAnnotations={(ann) => handleUpdate({ annotations: ann })}
                        activeAnnotationTool={activeAnnotationTool}
                        isPresentationMode={isPresentationMode}
                        theme={theme}
                    />

                    {/* Floating Graph Controls Toolbar at Top of Canvas */}
                    <div className="absolute top-2 left-2 z-30">
                        <GraphControls
                            viewBounds={viewBounds}
                            onUpdateViewBounds={(nb) => handleUpdate({ viewBounds: nb })}
                            onResetView={() => handleUpdate({ viewBounds: { xMin: -10, xMax: 10, yMin: -6, yMax: 6 } })}
                            onFitToEquations={() => {
                                handleUpdate({ viewBounds: { xMin: -8, xMax: 8, yMin: -5, yMax: 5 } });
                                toast.success('Fitted view to equations', { icon: '🎯' });
                            }}
                            showGrid={showGrid}
                            onToggleGrid={() => handleUpdate({ showGrid: !showGrid })}
                            showMinorGrid={showMinorGrid}
                            onToggleMinorGrid={() => handleUpdate({ showMinorGrid: !showMinorGrid })}
                            showAxisLabels={showAxisLabels}
                            onToggleAxisLabels={() => handleUpdate({ showAxisLabels: !showAxisLabels })}
                            lockAspectRatio={lockAspectRatio}
                            onToggleLockAspectRatio={() => handleUpdate({ lockAspectRatio: !lockAspectRatio })}
                            coordinateSystem={coordinateSystem}
                            onToggleCoordinateSystem={() => handleUpdate({ coordinateSystem: coordinateSystem === 'polar' ? 'cartesian' : 'polar' })}
                            isFullscreen={isFullscreen}
                            onToggleFullscreen={() => setIsFullscreen(prev => !prev)}
                            isPresentationMode={isPresentationMode}
                            onTogglePresentationMode={() => setIsPresentationMode(prev => !prev)}
                            activeAnalysis={activeAnalysis}
                            onSelectAnalysis={(type) => {
                                if (!type) {
                                    setActiveAnalysis(null);
                                } else {
                                    const targetEq = selectedEqId || (compiledEquations[0]?.id);
                                    setActiveAnalysis({
                                        type,
                                        eqId: targetEq,
                                        x0: (viewBounds.xMin + viewBounds.xMax) / 2,
                                        a: -2,
                                        b: 2
                                    });
                                }
                            }}
                            activeAnnotationTool={activeAnnotationTool}
                            onSelectAnnotationTool={setActiveAnnotationTool}
                            onClearAnnotations={() => handleUpdate({ annotations: [] })}
                            onExportGraph={handleExportGraph}
                            onConvertToStatic={handleConvertToStatic}
                            theme={theme}
                            onToggleTheme={handleToggleTheme}
                        />
                    </div>

                    {/* Classroom Presentation Mode Bottom Controls */}
                    {isPresentationMode && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl px-4 py-2 flex items-center gap-3 z-30">
                            <span className="font-bold text-xs text-slate-300">Classroom Reveal:</span>
                            <button
                                type="button"
                                onClick={handlePresentationRevealNext}
                                className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold shadow-xs"
                                title="Reveal Next Equation in Presentation"
                            >
                                Reveal Next ({presentationStep}/{compiledEquations.length})
                            </button>
                            <button
                                type="button"
                                onClick={handlePresentationRevealAll}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                                title="Reveal All Equations"
                            >
                                Reveal All
                            </button>
                            <button
                                type="button"
                                onClick={handlePresentationHideAll}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs"
                                title="Hide All Equations"
                            >
                                Hide All
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Floating Context Toolbar on Selection */}
            {isSelected && !isLocked && (
                <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl px-2.5 py-1 flex items-center gap-1.5 z-40 text-xs text-slate-200"
                >
                    <button
                        type="button"
                        onClick={() => onDuplicate && onDuplicate(graph?.id)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white flex items-center gap-1"
                        title="Duplicate Graph"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Duplicate</span>
                    </button>

                    <div className="w-px h-3.5 bg-slate-700" />

                    <button
                        type="button"
                        onClick={() => onBringForward && onBringForward(graph?.id)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                        title="Bring Forward"
                    >
                        <ChevronsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onSendBackward && onSendBackward(graph?.id)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                        title="Send Backward"
                    >
                        <ChevronsDown className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-px h-3.5 bg-slate-700" />

                    {/* Directly Insert Graph as Image onto Whiteboard */}
                    <button
                        type="button"
                        onClick={handleConvertToStatic}
                        className="p-1 hover:bg-slate-800 rounded text-indigo-400 hover:text-white transition flex items-center justify-center"
                        title="Insert Graph as Image onto Whiteboard"
                    >
                        <Camera className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-px h-3.5 bg-slate-700" />

                    {/* Planar Rotation */}
                    <div className="flex items-center gap-1">
                        <RotateCw className="w-3 h-3 text-slate-400" />
                        <input
                            type="number"
                            value={Math.round(rotation)}
                            onChange={(e) => handleUpdate({ rotation: parseInt(e.target.value) || 0 })}
                            className="w-10 text-center bg-slate-800 text-white rounded px-1 py-0.5 font-mono text-[11px] border border-slate-700"
                            title="Rotation Angle (Degrees)"
                        />
                    </div>
                </div>
            )}

            {/* 4. Selection Corner & Edge Resize Handles */}
            {isSelected && !isLocked && (
                <>
                    {/* Corners */}
                    {[
                        { handle: 'nw', style: { left: -6, top: -6, cursor: 'nwse-resize' } },
                        { handle: 'ne', style: { right: -6, top: -6, cursor: 'nesw-resize' } },
                        { handle: 'sw', style: { left: -6, bottom: -6, cursor: 'nesw-resize' } },
                        { handle: 'se', style: { right: -6, bottom: -6, cursor: 'nwse-resize' } },
                    ].map(({ handle, style }) => (
                        <div
                            key={handle}
                            onPointerDown={(e) => handleResizeStart(handle, e)}
                            className="absolute w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm shadow-md z-50 pointer-events-auto"
                            style={style}
                        />
                    ))}

                    {/* Edges */}
                    {[
                        { handle: 'n', style: { left: '50%', top: -5, transform: 'translateX(-50%)', cursor: 'ns-resize' } },
                        { handle: 's', style: { left: '50%', bottom: -5, transform: 'translateX(-50%)', cursor: 'ns-resize' } },
                        { handle: 'e', style: { right: -5, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' } },
                        { handle: 'w', style: { left: -5, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' } },
                    ].map(({ handle, style }) => (
                        <div
                            key={handle}
                            onPointerDown={(e) => handleResizeStart(handle, e)}
                            className="absolute w-3 h-3 bg-white border-2 border-sky-500 rounded-sm shadow-md z-50 pointer-events-auto"
                            style={style}
                        />
                    ))}
                </>
            )}
        </div>
    );
}
