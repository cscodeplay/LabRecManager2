'use client';

import React, { useState } from 'react';
import {
    Ruler as RulerIcon,
    Compass as CompassIcon,
    Triangle,
    X,
    Crosshair,
    Maximize2,
    Move
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
    onMarkDistance
}) {
    // Current active instrument: 'ruler' | 'compass' | 'divider' | 'protractor' | 'set_square' | null
    const [activeTool, setActiveTool] = useState('ruler');

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 pointer-events-none z-[65]">
            {/* Floating Instrument Switcher Dock (myViewBoard style) */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl pointer-events-auto flex items-center gap-1.5 select-none animate-in fade-in duration-200">
                <div className="px-2.5 py-1 text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1 border-r border-slate-700/60 pr-2">
                    <CompassIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Geometry Tools</span>
                </div>

                {/* Ruler Button (Amber) */}
                <button
                    type="button"
                    onClick={() => setActiveTool(activeTool === 'ruler' ? null : 'ruler')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        activeTool === 'ruler'
                            ? 'bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-400/30 ring-2 ring-amber-300'
                            : 'text-amber-400 bg-amber-500/15 hover:bg-amber-500/30 hover:text-amber-200'
                    }`}
                    title="Ruler (Straightedge with Metric and Imperial graduations)"
                >
                    <RulerIcon className="w-3.5 h-3.5" />
                    <span>Ruler</span>
                </button>

                {/* Compass Button (Cyan) */}
                <button
                    type="button"
                    onClick={() => setActiveTool(activeTool === 'compass' ? null : 'compass')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        activeTool === 'compass'
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-300'
                            : 'text-cyan-400 bg-cyan-500/15 hover:bg-cyan-500/30 hover:text-cyan-200'
                    }`}
                    title="Compass (Draw exact circles and swept arcs)"
                >
                    <CompassIcon className="w-3.5 h-3.5" />
                    <span>Compass</span>
                </button>

                {/* Divider Button (Purple) */}
                <button
                    type="button"
                    onClick={() => setActiveTool(activeTool === 'divider' ? null : 'divider')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        activeTool === 'divider'
                            ? 'bg-purple-600 text-white font-bold shadow-lg shadow-purple-500/30 ring-2 ring-purple-300'
                            : 'text-purple-400 bg-purple-500/15 hover:bg-purple-500/30 hover:text-purple-200'
                    }`}
                    title="Divider (Compare, mark, and transfer exact measurements)"
                >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Divider</span>
                </button>

                {/* Protractor Button (Emerald) */}
                <button
                    type="button"
                    onClick={() => setActiveTool(activeTool === 'protractor' ? null : 'protractor')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        activeTool === 'protractor'
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300'
                            : 'text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/30 hover:text-emerald-200'
                    }`}
                    title="Protractor (Measure and draw rays at exact angles 0°-180° / 360°)"
                >
                    <div className="w-3.5 h-3.5 rounded-t-full border border-current" />
                    <span>Protractor</span>
                </button>

                {/* Set Square Button (Rose) */}
                <button
                    type="button"
                    onClick={() => setActiveTool(activeTool === 'set_square' ? null : 'set_square')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        activeTool === 'set_square'
                            ? 'bg-rose-500 text-white font-bold shadow-lg shadow-rose-500/30 ring-2 ring-rose-300'
                            : 'text-rose-400 bg-rose-500/15 hover:bg-rose-500/30 hover:text-rose-200'
                    }`}
                    title="Set Square (45° and 30°/60° Drafting Triangles & 90° Perpendiculars)"
                >
                    <Triangle className="w-3.5 h-3.5" />
                    <span>Set Square</span>
                </button>

                <div className="w-[1px] h-4 bg-slate-700/80 mx-1" />

                {/* Close All Instruments Overlay */}
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-600 text-slate-400 hover:text-white transition"
                    title="Dismiss Geometry Tools Overlay"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Render Active Geometry Tool */}
            {activeTool === 'ruler' && (
                <RulerTool
                    initialX={240}
                    initialY={220}
                    scale={scale}
                    onDrawLine={onDrawLine}
                    onClose={() => setActiveTool(null)}
                />
            )}

            {activeTool === 'compass' && (
                <CompassTool
                    initialX={420}
                    initialY={300}
                    scale={scale}
                    onDrawCircle={onDrawCircle}
                    onDrawArc={onDrawArc}
                    onClose={() => setActiveTool(null)}
                />
            )}

            {activeTool === 'divider' && (
                <DividerTool
                    initialX={440}
                    initialY={320}
                    scale={scale}
                    onMarkDistance={onMarkDistance}
                    onClose={() => setActiveTool(null)}
                />
            )}

            {activeTool === 'protractor' && (
                <ProtractorTool
                    initialX={420}
                    initialY={340}
                    scale={scale}
                    onDrawAngle={onDrawAngle}
                    onDrawLine={onDrawLine}
                    onClose={() => setActiveTool(null)}
                />
            )}

            {activeTool === 'set_square' && (
                <SetSquareTool
                    initialX={380}
                    initialY={280}
                    scale={scale}
                    onDrawPerpendicular={onDrawPerpendicular}
                    onDrawTriangle={onDrawTriangle}
                    onClose={() => setActiveTool(null)}
                />
            )}
        </div>
    );
}
