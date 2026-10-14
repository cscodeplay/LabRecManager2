'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    Pencil,
    Highlighter,
    Eraser,
    Undo2,
    Compass,
    StickyNote as StickyNoteIcon,
    MousePointer2,
    GripHorizontal,
    Minimize2,
    X,
    Sparkles
} from 'lucide-react';

const QUICK_COLORS = [
    { label: 'Black / Dark', value: '#0f172a', bgClass: 'bg-slate-900 border-white/40' },
    { label: 'Vibrant Blue', value: '#2563eb', bgClass: 'bg-blue-600 border-blue-300/60' },
    { label: 'Vibrant Red', value: '#ef4444', bgClass: 'bg-red-500 border-red-300/60' },
    { label: 'Vibrant Green', value: '#10b981', bgClass: 'bg-emerald-500 border-emerald-300/60' }
];

export default function WhiteboardEZWritePalette({
    tool,
    setTool,
    color,
    setColor,
    onUndo,
    canUndo,
    showGeometryInstruments,
    setShowGeometryInstruments,
    isSpotlightActive,
    setIsSpotlightActive,
    isCurtainActive,
    setIsCurtainActive,
    onOpenAiAssistant,
    isInstructor = true,
    onClose
}) {
    // Draggable position state
    const [pos, setPos] = useState({ x: 24, y: 140 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    const paletteRef = useRef(null);

    // Drag handlers
    const handlePointerDown = (e) => {
        setIsDragging(true);
        const rect = paletteRef.current ? paletteRef.current.getBoundingClientRect() : { left: pos.x, top: pos.y };
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        e.stopPropagation();
    };

    useEffect(() => {
        if (!isDragging) return;

        const handlePointerMove = (e) => {
            const maxX = window.innerWidth - 60;
            const maxY = window.innerHeight - 60;
            const newX = Math.max(8, Math.min(maxX, e.clientX - dragOffset.x));
            const newY = Math.max(50, Math.min(maxY, e.clientY - dragOffset.y));
            setPos({ x: newX, y: newY });
        };

        const handlePointerUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, dragOffset]);

    if (!isVisible) return null;

    // Collapsed Mode: Compact Floating Disc
    if (isCollapsed) {
        return (
            <div
                ref={paletteRef}
                style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                className="fixed z-40 select-none animate-in fade-in zoom-in duration-200"
            >
                <button
                    type="button"
                    onClick={() => setIsCollapsed(false)}
                    onPointerDown={handlePointerDown}
                    className="rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-500 to-amber-400 p-[1.5px] shadow-2xl hover:scale-110 active:scale-95 transition-all group"
                    title="Quick Palette (Click to expand)"
                >
                    <div className="w-8 h-8 rounded-full bg-slate-900/95 backdrop-blur-md flex items-center justify-center text-cyan-300 group-hover:text-white border border-slate-700/80 shadow-inner">
                        <Pencil className="w-4 h-4 text-sky-400 group-hover:rotate-12 transition-transform" />
                    </div>
                </button>
            </div>
        );
    }

    // Expanded Mode: Compact Vertical Companion matching Main Toolbar proportions
    return (
        <div
            ref={paletteRef}
            style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
            className={`fixed z-40 select-none bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 min-w-[42px] items-center text-slate-200 ${
                isDragging ? 'cursor-grabbing opacity-90 scale-102' : 'transition-all duration-150'
            }`}
        >
            {/* Header & Drag Grip */}
            <div
                onPointerDown={handlePointerDown}
                className="w-full flex items-center justify-between pb-1 border-b border-slate-700/60 cursor-grab active:cursor-grabbing px-0.5"
                title="Drag floating palette anywhere on screen"
            >
                <div className="flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <GripHorizontal className="w-3 h-3 text-slate-400 hover:text-white" />
                </div>
                <div className="flex items-center gap-0.5">
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(true)}
                        className="p-0.5 text-slate-400 hover:text-amber-400 rounded transition"
                        title="Minimize to quick disc"
                    >
                        <Minimize2 className="w-2.5 h-2.5" />
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-0.5 text-slate-400 hover:text-red-400 rounded transition"
                            title="Close floating palette"
                        >
                            <X className="w-2.5 h-2.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Core Tools */}
            <div className="flex flex-col gap-1 items-center w-full">
                {/* Select Tool */}
                <button
                    type="button"
                    onClick={() => setTool('select')}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        tool === 'select'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/40 ring-1.5 ring-indigo-300 scale-105'
                            : 'text-indigo-400 bg-indigo-500/15 hover:bg-indigo-500/30 hover:scale-105'
                    }`}
                    title="Select & Move (V)"
                >
                    <MousePointer2 className="w-3.5 h-3.5" />
                </button>

                {/* Pen Tool with Live Ink Preview */}
                <button
                    type="button"
                    onClick={() => setTool('pen')}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all relative ${
                        tool === 'pen'
                            ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/40 ring-1.5 ring-sky-300 scale-105'
                            : 'text-sky-400 bg-sky-500/15 hover:bg-sky-500/30 hover:scale-105'
                    }`}
                    title="Drawing Pen (P)"
                >
                    <Pencil className="w-3.5 h-3.5" />
                    <span
                        className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full border border-slate-900 shadow-xs"
                        style={{ backgroundColor: color }}
                    />
                </button>

                {/* 4 Quick Color Chips (ViewSonic / BenQ Classroom style) */}
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-800/80 rounded-lg border border-slate-700/60 my-0.5">
                    {QUICK_COLORS.map(qc => (
                        <button
                            key={qc.value}
                            type="button"
                            onClick={() => {
                                setColor(qc.value);
                                if (tool !== 'pen') setTool('pen');
                            }}
                            className={`w-3 h-3 rounded-full border transition-transform ${qc.bgClass} ${
                                color === qc.value ? 'scale-125 ring-1.5 ring-white shadow-xs' : 'hover:scale-115 opacity-80 hover:opacity-100'
                            }`}
                            title={qc.label}
                        />
                    ))}
                </div>

                {/* Highlighter Tool */}
                <button
                    type="button"
                    onClick={() => setTool('highlighter')}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        tool === 'highlighter'
                            ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/40 ring-1.5 ring-amber-200 scale-105'
                            : 'text-amber-300 bg-amber-500/15 hover:bg-amber-500/30 hover:scale-105'
                    }`}
                    title="Highlighter (H)"
                >
                    <Highlighter className="w-3.5 h-3.5" />
                </button>

                {/* Eraser Tool */}
                <button
                    type="button"
                    onClick={() => setTool('eraser')}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        tool === 'eraser'
                            ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/40 ring-1.5 ring-rose-300 scale-105'
                            : 'text-rose-400 bg-rose-500/15 hover:bg-rose-500/30 hover:scale-105'
                    }`}
                    title="Eraser (E)"
                >
                    <Eraser className="w-3.5 h-3.5" />
                </button>

                {/* Undo Button */}
                <button
                    type="button"
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        canUndo
                            ? 'text-blue-400 bg-blue-500/15 hover:bg-blue-500/30 hover:text-white hover:scale-105 active:scale-95'
                            : 'text-slate-600 bg-slate-800/40 cursor-not-allowed opacity-50'
                    }`}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo2 className="w-3.5 h-3.5" />
                </button>

                <div className="w-5 h-px bg-slate-700/80 my-0.5" />

                {/* Geometry Instruments Toggle */}
                <button
                    type="button"
                    onClick={() => setShowGeometryInstruments(prev => !prev)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        showGeometryInstruments
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/40 ring-1.5 ring-cyan-200 scale-105'
                            : 'text-cyan-400 bg-cyan-500/15 hover:bg-cyan-500/30 hover:scale-105'
                    }`}
                    title="Geometry Instruments Box (Ruler, Compass, Protractor, Divider)"
                >
                    <Compass className="w-3.5 h-3.5" />
                </button>

                {/* Spotlight Focus Toggle */}
                <button
                    type="button"
                    onClick={() => setIsSpotlightActive(prev => !prev)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        isSpotlightActive
                            ? 'bg-yellow-400 text-slate-950 font-bold shadow-md shadow-yellow-400/40 ring-1.5 ring-yellow-200 scale-105'
                            : 'text-yellow-400 bg-yellow-500/15 hover:bg-yellow-500/30 hover:scale-105'
                    }`}
                    title="Classroom Spotlight Focus"
                >
                    <div className="text-xs">🔦</div>
                </button>

                {/* Screen Curtain Toggle */}
                <button
                    type="button"
                    onClick={() => setIsCurtainActive(prev => !prev)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        isCurtainActive
                            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/40 ring-1.5 ring-indigo-300 scale-105'
                            : 'text-indigo-400 bg-indigo-500/15 hover:bg-indigo-500/30 hover:scale-105'
                    }`}
                    title="Screen Curtain Reveal"
                >
                    <StickyNoteIcon className="w-3.5 h-3.5" />
                </button>

                {/* AI Assistant Co-Pilot Quick Button */}
                {onOpenAiAssistant && (
                    <button
                        type="button"
                        onClick={onOpenAiAssistant}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-300 bg-amber-500/15 hover:bg-amber-500/30 hover:scale-105 transition-all shadow-xs"
                        title="Whiteboard AI Co-Pilot & Chat"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
