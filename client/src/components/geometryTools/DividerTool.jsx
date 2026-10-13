'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
    RotateCw,
    X,
    Check,
    Lock,
    Unlock,
    Move,
    Maximize2,
    Crosshair
} from 'lucide-react';
import {
    PX_PER_CM,
    pxToCm,
    pxToInches,
    snapAngleDeg,
    degToRad
} from './geometryMath';

export default function DividerTool({
    initialX = 400,
    initialY = 300,
    initialSpanCm = 8,
    initialAngle = 0,
    scale = 1,
    onMarkDistance,
    onClose
}) {
    // Needle 1 (Primary Point)
    const [pointA, setPointA] = useState({ x: initialX, y: initialY });
    const [spanCm, setSpanCm] = useState(initialSpanCm);
    const [angle, setAngle] = useState(initialAngle);
    const [isLocked, setIsLocked] = useState(false);

    const spanPx = spanCm * PX_PER_CM;

    // Reposition primary needle / entire divider
    const isDraggingPointARef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, initialAx: 0, initialAy: 0 });

    // Adjust span / rotate secondary needle (Point B)
    const isAdjustingPointBRef = useRef(false);

    // Primary Needle 1 Drag
    const handlePointAPointerDown = (e) => {
        if (e.target.closest('button') || e.target.closest('[data-handle="true"]')) return;
        e.stopPropagation();
        e.preventDefault();
        isDraggingPointARef.current = true;
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            initialAx: pointA.x,
            initialAy: pointA.y
        };

        const onPointerMove = (moveEvt) => {
            if (!isDraggingPointARef.current) return;
            const dx = (moveEvt.clientX - dragStartRef.current.x) / (scale || 1);
            const dy = (moveEvt.clientY - dragStartRef.current.y) / (scale || 1);
            setPointA({
                x: Math.round(dragStartRef.current.initialAx + dx),
                y: Math.round(dragStartRef.current.initialAy + dy)
            });
        };

        const onPointerUp = () => {
            isDraggingPointARef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // Secondary Needle 2 Drag (Adjust span or rotate)
    const handlePointBPointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        isAdjustingPointBRef.current = true;

        const onPointerMove = (moveEvt) => {
            if (!isAdjustingPointBRef.current) return;
            const mouseX = (moveEvt.clientX - pointA.x) / (scale || 1);
            const mouseY = (moveEvt.clientY - pointA.y) / (scale || 1);

            const distPx = Math.hypot(mouseX, mouseY);
            const rad = Math.atan2(mouseY, mouseX);
            let deg = (rad * 180) / Math.PI;
            if (deg < 0) deg += 360;

            const snappedAngle = snapAngleDeg(deg, moveEvt.shiftKey ? 15 : 1, moveEvt.shiftKey);
            setAngle(snappedAngle);

            if (!isLocked) {
                const cm = Math.max(1.5, Math.min(30, Math.round((distPx / PX_PER_CM) * 2) / 2));
                setSpanCm(cm);
            }
        };

        const onPointerUp = () => {
            isAdjustingPointBRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // Mark / Transfer Distance onto Whiteboard
    const handleMarkDistance = useCallback(() => {
        if (!onMarkDistance) return;
        const rad = degToRad(angle);
        const endX = pointA.x + spanPx * Math.cos(rad);
        const endY = pointA.y + spanPx * Math.sin(rad);

        onMarkDistance({
            startX: Math.round(pointA.x),
            startY: Math.round(pointA.y),
            endX: Math.round(endX),
            endY: Math.round(endY),
            distanceCm: spanCm,
            distancePx: spanPx,
            angleDeg: angle
        });
    }, [onMarkDistance, pointA, spanPx, spanCm, angle]);

    // Coordinates of Point B
    const bRad = degToRad(angle);
    const pointBX = pointA.x + spanPx * Math.cos(bRad);
    const pointBY = pointA.y + spanPx * Math.sin(bRad);

    // Hinge top apex
    const hingeHeight = Math.max(75, spanPx * 0.75);
    const midX = (pointA.x + pointBX) / 2;
    const midY = (pointA.y + pointBY) / 2 - hingeHeight;

    return (
        <div className="absolute inset-0 pointer-events-none select-none z-[66]">
            {/* SVG Dual Needle Brass / Steel Arms */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                <defs>
                    <linearGradient id="dividerLegGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="50%" stopColor="#cbd5e1" />
                        <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                </defs>

                {/* Primary Needle Leg (Point A to Hinge) */}
                <line
                    x1={pointA.x}
                    y1={pointA.y}
                    x2={midX}
                    y2={midY}
                    stroke="url(#dividerLegGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"
                />

                {/* Secondary Needle Leg (Point B to Hinge) */}
                <line
                    x1={pointBX}
                    y1={pointBY}
                    x2={midX}
                    y2={midY}
                    stroke="url(#dividerLegGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"
                />

                {/* Top Friction Hinge Joint */}
                <circle
                    cx={midX}
                    cy={midY}
                    r="8"
                    fill="#0f172a"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"
                />
                <circle cx={midX} cy={midY} r="3" fill="#38bdf8" />

                {/* Distance Span Dimension Line */}
                <line
                    x1={pointA.x}
                    y1={pointA.y}
                    x2={pointBX}
                    y2={pointBY}
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                    opacity="0.8"
                />
            </svg>

            {/* 1. Needle Point A (Primary Reference Point) */}
            <div
                style={{
                    position: 'absolute',
                    left: `${pointA.x}px`,
                    top: `${pointA.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handlePointAPointerDown}
                className="w-8 h-8 rounded-full bg-slate-950/90 border-2 border-cyan-400 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition group"
                title="Point A: Drag to reposition Divider"
            >
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-cyan-500/30 shadow-[0_0_8px_#22d3ee]" />
            </div>

            {/* 2. Needle Point B (Span & Angle Handle) */}
            <div
                data-handle="true"
                style={{
                    position: 'absolute',
                    left: `${pointBX}px`,
                    top: `${pointBY}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handlePointBPointerDown}
                className="w-8 h-8 rounded-full bg-slate-950/90 border-2 border-emerald-400 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition group"
                title="Point B: Drag to adjust span distance or rotate"
            >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/30 shadow-[0_0_8px_#34d399]" />
            </div>

            {/* 3. Center Span Measurement Badge */}
            <div
                style={{
                    position: 'absolute',
                    left: `${(pointA.x + pointBX) / 2}px`,
                    top: `${(pointA.y + pointBY) / 2}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                className="px-2.5 py-0.5 rounded-full bg-slate-950/90 border border-slate-700/80 text-[11px] font-mono font-bold text-cyan-300 shadow-xl flex items-center gap-1.5"
            >
                <span>{spanCm.toFixed(1)} cm</span>
                <span className="text-[9px] text-slate-500">|</span>
                <span className="text-[10px] text-amber-300 font-mono">{angle.toFixed(0)}°</span>
            </div>

            {/* 4. Top Action HUD above Hinge */}
            <div
                style={{
                    position: 'absolute',
                    left: `${midX}px`,
                    top: `${midY - 42}px`,
                    transform: 'translateX(-50%)',
                    pointerEvents: 'auto'
                }}
                className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full px-3 py-1 shadow-2xl flex items-center gap-2"
            >
                {/* Lock Span Toggle */}
                <button
                    type="button"
                    onClick={() => setIsLocked(!isLocked)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                        isLocked
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                    title={isLocked ? 'Span locked for exact distance transfer' : 'Lock span distance'}
                >
                    {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    <span>{isLocked ? 'Locked' : 'Lock'}</span>
                </button>

                {/* Mark / Transfer Distance on Canvas */}
                <button
                    type="button"
                    onClick={handleMarkDistance}
                    className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] rounded-full shadow transition active:scale-95"
                    title="Transfer distance marks onto whiteboard"
                >
                    <Crosshair className="w-3 h-3" />
                    <span>Mark Distance</span>
                </button>

                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded-full bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white transition"
                    title="Close Divider"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
