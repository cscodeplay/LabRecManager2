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

                {/* Ruler Button */}
                <button
                    type="button"
                    onClick={() => setActiveTool(activeTool === 'ruler' ? null : 'ruler')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        activeTool === 'ruler'
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Ruler (Straightedge with Metric and Imperial graduations)"
                >
                    <RulerIcon className="w-3.5 h-3.5" />
                    <span>Ruler</span>
                </button>

                {/* Compass Button */}
                <button
                    type="button"
                    onClick={() => setActiveTool(activeTool === 'compass' ? null : 'compass')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        activeTool === 'compass'
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Compass (Draw exact circles and swept arcs)"
                >
                    <CompassIcon className="w-3.5 h-3.5" />
                    <span>Compass</span>
                </button>

                {/* Divider Button */}
                <button
                    type="button"
                    onClick={() => setActiveTool(activeTool === 'divider' ? null : 'divider')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        activeTool === 'divider'
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Divider (Compare, mark, and transfer exact measurements)"
                >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Divider</span>
                </button>

                {/* Protractor Button */}
                <button
                    type="button"
                    onClick={() => setActiveTool(activeTool === 'protractor' ? null : 'protractor')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        activeTool === 'protractor'
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Protractor (Measure and draw rays at exact angles 0°-180° / 360°)"
                >
                    <div className="w-3.5 h-3.5 rounded-t-full border border-current" />
                    <span>Protractor</span>
                </button>

                {/* Set Square Button */}
                <button
                    type="button"
                    onClick={() => setActiveTool(activeTool === 'set_square' ? null : 'set_square')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        activeTool === 'set_square'
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
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
