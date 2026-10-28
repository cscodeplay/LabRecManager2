'use client';

import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Ruler as RulerIcon,
    Compass as CompassIcon,
    Triangle,
    X,
    Crosshair,
    Calculator,
    Layers,
    GripVertical
} from 'lucide-react';

import RulerTool from './RulerTool';
import CompassTool from './CompassTool';
import DividerTool from './DividerTool';
import ProtractorTool from './ProtractorTool';
import SetSquareTool from './SetSquareTool';

export default function GeometryInstrumentsOverlay({
    isOpen = false,
    onClose,
    scale = 1,
    onDrawLine,
    onDrawCircle,
    onDrawArc,
    onDrawAngle,
    onDrawPerpendicular,
    onDrawTriangle,
    onMarkDistance,
    onInstrumentBoundsChange,
    onToggleEstimator,
    onToggleFlashcards,
    isEstimatorOpen = false,
    isFlashcardsOpen = false
}) {
    // Multi-tool active state: multiple instruments can be spawned and used simultaneously
    const [activeTools, setActiveTools] = useState({
        ruler: true,
        compass: false,
        divider: false,
        protractor: false,
        set_square: false
    });

    // Combined bounds dictionary for pen clamping across all active tools
    const boundsMapRef = useRef({});

    const handleToolBoundsUpdate = useCallback((toolKey, bounds) => {
        if (bounds) {
            boundsMapRef.current[toolKey] = bounds;
        } else {
            delete boundsMapRef.current[toolKey];
        }
        if (onInstrumentBoundsChange) {
            onInstrumentBoundsChange({ ...boundsMapRef.current });
        }
    }, [onInstrumentBoundsChange]);

    const handleToolToggle = (tool) => {
        setActiveTools(prev => {
            const nextVal = !prev[tool];
            if (!nextVal) {
                handleToolBoundsUpdate(tool, null);
            }
            return {
                ...prev,
                [tool]: nextVal
            };
        });
    };

    const handleCloseTool = (tool) => {
        setActiveTools(prev => ({ ...prev, [tool]: false }));
        handleToolBoundsUpdate(tool, null);
    };

    // Draggable position for the Geometry Dock
    const [dockPos, setDockPos] = useState({ x: null, y: 64 });
    const isDockDraggingRef = useRef(false);
    const dockDragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });

    const handleDockPointerDown = (e) => {
        if (e.target.closest('button')) return;
        e.preventDefault();
        isDockDraggingRef.current = true;
        const rect = e.currentTarget.getBoundingClientRect();
        dockDragStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            startX: rect.left,
            startY: rect.top
        };

        const onMove = (moveEvt) => {
            if (!isDockDraggingRef.current) return;
            const dx = moveEvt.clientX - dockDragStartRef.current.mouseX;
            const dy = moveEvt.clientY - dockDragStartRef.current.mouseY;
            const newX = Math.max(10, Math.min(window.innerWidth - 360, dockDragStartRef.current.startX + dx));
            const newY = Math.max(10, Math.min(window.innerHeight - 50, dockDragStartRef.current.startY + dy));
            setDockPos({ x: newX, y: newY });
        };

        const onUp = () => {
            isDockDraggingRef.current = false;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const handleCloseAll = () => {
        boundsMapRef.current = {};
        if (onInstrumentBoundsChange) onInstrumentBoundsChange(null);
        if (onClose) onClose();
    };

    if (!isOpen) return null;

    const dockJsx = (
        <div
            data-geometry-tool="true"
            onPointerDown={handleDockPointerDown}
            style={
                dockPos.x !== null
                    ? { position: 'fixed', left: `${dockPos.x}px`, top: `${dockPos.y}px`, zIndex: 10005 }
                    : { position: 'fixed', left: '50%', top: '64px', transform: 'translateX(-50%)', zIndex: 10005 }
            }
            className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl px-2 py-1 shadow-2xl pointer-events-auto flex items-center gap-1.5 select-none animate-in fade-in duration-200 h-9 cursor-move"
        >
            {/* Draggable Grip Handle & Indicator */}
            <div className="flex items-center gap-0.5 px-1 py-0.5 text-cyan-400 border-r border-slate-700/60 pr-1.5 cursor-move" title="Drag to move Geometry Dock">
                <GripVertical className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 transition" />
                <CompassIcon className="w-3.5 h-3.5 text-cyan-400" />
            </div>

                {/* Ruler Button (Icon Only with Tooltip) */}
                <button
                    type="button"
                    onClick={() => handleToolToggle('ruler')}
                    className={`p-1.5 rounded-xl transition ${
                        activeTools.ruler
                            ? 'bg-amber-400 text-slate-950 font-bold shadow-xs ring-2 ring-amber-300'
                            : 'text-amber-400 bg-amber-500/15 hover:bg-amber-500/30 hover:text-amber-200'
                    }`}
                    title="Ruler — Measure, resize (8-30 cm) and draw straightedge lines"
                >
                    <RulerIcon className="w-3.5 h-3.5" />
                </button>

                {/* Compass Button (Icon Only with Tooltip) */}
                <button
                    type="button"
                    onClick={() => handleToolToggle('compass')}
                    className={`p-1.5 rounded-xl transition ${
                        activeTools.compass
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs ring-2 ring-cyan-300'
                            : 'text-cyan-400 bg-cyan-500/15 hover:bg-cyan-500/30 hover:text-cyan-200'
                    }`}
                    title="Compass — Reorient with spindle, draw strokes with pen leg, bounded 1-14 cm"
                >
                    <CompassIcon className="w-3.5 h-3.5" />
                </button>

                {/* Divider Button (Icon Only with Tooltip) */}
                <button
                    type="button"
                    onClick={() => handleToolToggle('divider')}
                    className={`p-1.5 rounded-xl transition ${
                        activeTools.divider
                            ? 'bg-purple-600 text-white font-bold shadow-xs ring-2 ring-purple-300'
                            : 'text-purple-400 bg-purple-500/15 hover:bg-purple-500/30 hover:text-purple-200'
                    }`}
                    title="Divider — Measure, compare, and transfer exact distances"
                >
                    <Crosshair className="w-3.5 h-3.5" />
                </button>

                {/* Protractor Button (Icon Only with Tooltip) */}
                <button
                    type="button"
                    onClick={() => handleToolToggle('protractor')}
                    className={`p-1.5 rounded-xl transition ${
                        activeTools.protractor
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs ring-2 ring-emerald-300'
                            : 'text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/30 hover:text-emerald-200'
                    }`}
                    title="Protractor — Measure angles 0°-180° and draw rays (bounded 3.8-9 cm)"
                >
                    <div className="w-3.5 h-2 rounded-t-full border-2 border-current" />
                </button>

                {/* Set Square Button (Icon Only with Tooltip) */}
                <button
                    type="button"
                    onClick={() => handleToolToggle('set_square')}
                    className={`p-1.5 rounded-xl transition ${
                        activeTools.set_square
                            ? 'bg-rose-500 text-white font-bold shadow-xs ring-2 ring-rose-300'
                            : 'text-rose-400 bg-rose-500/15 hover:bg-rose-500/30 hover:text-rose-200'
                    }`}
                    title="Set Square — 45° & 30°/60° Drafting Triangles & 90° Perpendiculars"
                >
                    <Triangle className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-4 bg-slate-700/80 mx-0.5" />

                {/* Estimator Scientific Calculator Quick-Toggle */}
                {onToggleEstimator && (
                    <button
                        type="button"
                        onClick={onToggleEstimator}
                        className={`p-1.5 rounded-xl transition ${
                            isEstimatorOpen
                                ? 'bg-indigo-600 text-white font-bold shadow-xs ring-2 ring-indigo-300'
                                : 'text-indigo-400 bg-indigo-500/15 hover:bg-indigo-500/30 hover:text-indigo-200'
                        }`}
                        title="Estimator — Scientific Calculator with trig, logs, fractions & board insertion"
                    >
                        <Calculator className="w-3.5 h-3.5" />
                    </button>
                )}

                {/* STEM Flashcards Quick-Toggle */}
                {onToggleFlashcards && (
                    <button
                        type="button"
                        onClick={onToggleFlashcards}
                        className={`p-1.5 rounded-xl transition ${
                            isFlashcardsOpen
                                ? 'bg-sky-600 text-white font-bold shadow-xs ring-2 ring-sky-300'
                                : 'text-sky-400 bg-sky-500/15 hover:bg-sky-500/30 hover:text-sky-200'
                        }`}
                        title="STEM Flashcards — 3D flip study cards with spaced repetition"
                    >
                        <Layers className="w-3.5 h-3.5" />
                    </button>
                )}

                <div className="w-[1px] h-4 bg-slate-700/80 mx-0.5" />

                {/* Close All Instruments Overlay */}
                <button
                    type="button"
                    onClick={handleCloseAll}
                    className="p-1 rounded-lg bg-slate-800/80 hover:bg-rose-600 text-slate-400 hover:text-white transition"
                    title="Dismiss Geometry Tools Overlay"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
        </div>
    );

    return (
        <>
            {typeof document !== 'undefined' ? createPortal(dockJsx, document.body) : dockJsx}
            <div className="geometry-instrument absolute inset-0 pointer-events-none z-[75]" data-geometry-tool="true">
                {/* Simultaneously Render All Active Geometry Tools */}
            {activeTools.ruler && (
                <RulerTool
                    initialX={200}
                    initialY={200}
                    scale={scale}
                    onDrawLine={onDrawLine}
                    onClose={() => handleCloseTool('ruler')}
                    onStateChange={(bounds) => handleToolBoundsUpdate('ruler', bounds)}
                />
            )}

            {activeTools.compass && (
                <CompassTool
                    initialX={440}
                    initialY={260}
                    scale={scale}
                    onDrawCircle={onDrawCircle}
                    onDrawArc={onDrawArc}
                    onClose={() => handleCloseTool('compass')}
                    onStateChange={(bounds) => handleToolBoundsUpdate('compass', bounds)}
                />
            )}

            {activeTools.divider && (
                <DividerTool
                    initialX={360}
                    initialY={340}
                    scale={scale}
                    onMarkDistance={onMarkDistance}
                    onClose={() => handleCloseTool('divider')}
                />
            )}

            {activeTools.protractor && (
                <ProtractorTool
                    initialX={540}
                    initialY={320}
                    scale={scale}
                    onDrawAngle={onDrawAngle}
                    onDrawLine={onDrawLine}
                    onClose={() => handleCloseTool('protractor')}
                    onStateChange={(bounds) => handleToolBoundsUpdate('protractor', bounds)}
                />
            )}

            {activeTools.set_square && (
                <SetSquareTool
                    initialX={300}
                    initialY={280}
                    scale={scale}
                    onDrawPerpendicular={onDrawPerpendicular}
                    onDrawTriangle={onDrawTriangle}
                    onClose={() => handleCloseTool('set_square')}
                    onStateChange={(bounds) => handleToolBoundsUpdate('set_square', bounds)}
                />
            )}
            </div>
        </>
    );
}
