'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
    RotateCw,
    X,
    Check,
    Lock,
    Unlock,
    Crosshair
} from 'lucide-react';
import {
    PX_PER_CM,
    pxToCm,
    snapAngleDeg,
    degToRad,
    radToDeg,
    screenToCanvasCoords,
    calculateHingePoint
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
    // Primary Needle Tip (Point A) in pure Canvas Coordinates
    const [pointA, setPointA] = useState({ x: initialX, y: initialY });
    const [spanCm, setSpanCm] = useState(initialSpanCm);
    const [angle, setAngle] = useState(initialAngle);
    const [isLocked, setIsLocked] = useState(false);

    // Fixed Arm Length for both caliper needle arms (physical divider)
    const ARM_LENGTH = 180; // px (~4.76 cm)

    const spanPx = spanCm * PX_PER_CM;

    // Needle A drag ref (repositioning entire divider)
    const isDraggingPointARef = useRef(false);
    const dragStartRef = useRef({ canvasStartX: 0, canvasStartY: 0, initialAx: 0, initialAy: 0 });

    // Needle B drag ref (adjusting span / rotation)
    const isAdjustingPointBRef = useRef(false);

    // ─── 1. Primary Needle A Drag (Reposition entire divider) ───
    const handlePointAPointerDown = (e) => {
        if (e.target.closest('button') || e.target.closest('[data-handle="true"]')) return;
        e.stopPropagation();
        e.preventDefault();
        isDraggingPointARef.current = true;

        const coords = screenToCanvasCoords(e.clientX, e.clientY);
        dragStartRef.current = {
            canvasStartX: coords.x,
            canvasStartY: coords.y,
            initialAx: pointA.x,
            initialAy: pointA.y
        };

        const onPointerMove = (moveEvt) => {
            if (!isDraggingPointARef.current) return;
            const curCoords = screenToCanvasCoords(moveEvt.clientX, moveEvt.clientY);
            const dx = curCoords.x - dragStartRef.current.canvasStartX;
            const dy = curCoords.y - dragStartRef.current.canvasStartY;
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

    // ─── 2. Secondary Needle B Drag (Adjust span or rotate angle) ───
    const handlePointBPointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        isAdjustingPointBRef.current = true;

        const onPointerMove = (moveEvt) => {
            if (!isAdjustingPointBRef.current) return;
            const curCoords = screenToCanvasCoords(moveEvt.clientX, moveEvt.clientY);
            const dx = curCoords.x - pointA.x;
            const dy = curCoords.y - pointA.y;

            const distPx = Math.hypot(dx, dy);
            const rad = Math.atan2(dy, dx);
            let deg = (rad * 180) / Math.PI;
            if (deg < 0) deg += 360;

            const snappedAngle = snapAngleDeg(deg, moveEvt.shiftKey ? 15 : 1, moveEvt.shiftKey);
            setAngle(snappedAngle);

            if (!isLocked) {
                // Limit span by maximum physical opening of arms (up to 1.85 * ARM_LENGTH)
                const maxPx = ARM_LENGTH * 1.85;
                const clampedPx = Math.max(PX_PER_CM * 1.5, Math.min(maxPx, distPx));
                const cm = Math.round((clampedPx / PX_PER_CM) * 2) / 2;
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

    // ─── 3. Mathematically Exact Distance Marking (Zero Offset) ───
    const handleMarkDistance = useCallback(() => {
        if (!onMarkDistance) return;
        const rad = degToRad(angle);
        const endX = pointA.x + spanPx * Math.cos(rad);
        const endY = pointA.y + spanPx * Math.sin(rad);

        // Begins at Point A needle tip and ends at Point B needle tip precisely
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

    // Exact Canvas Coordinates of Point B
    const bRad = degToRad(angle);
    const pointB = {
        x: pointA.x + spanPx * Math.cos(bRad),
        y: pointA.y + spanPx * Math.sin(bRad)
    };

    // Hinge apex with strictly constant arm lengths ARM_LENGTH
    const hinge = calculateHingePoint(pointA, pointB, ARM_LENGTH, false);

    // Spindle top handle
    const bisectorDx = hinge.x - (pointA.x + pointB.x) / 2;
    const bisectorDy = hinge.y - (pointA.y + pointB.y) / 2;
    const bisectorLen = Math.hypot(bisectorDx, bisectorDy) || 1;
    const spindleTop = {
        x: hinge.x + (bisectorDx / bisectorLen) * 32,
        y: hinge.y + (bisectorDy / bisectorLen) * 32
    };

    return (
        <div className="absolute inset-0 pointer-events-none select-none z-[66]">
            {/* SVG Dual-Needle Steel Caliper Divider Render */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                <defs>
                    {/* Polished Chrome / Brass Metallic Gradients */}
                    <linearGradient id="dividerSteelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="35%" stopColor="#f1f5f9" />
                        <stop offset="70%" stopColor="#64748b" />
                        <stop offset="100%" stopColor="#1e293b" />
                    </linearGradient>

                    {/* Drop shadow */}
                    <filter id="dividerDropShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.45" />
                    </filter>
                </defs>

                {/* Direct Line between Tips (Measurement Transfer Baseline) */}
                <line
                    x1={pointA.x}
                    y1={pointA.y}
                    x2={pointB.x}
                    y2={pointB.y}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.6"
                />

                {/* ─── Caliper Arm 1: Hinge to Needle Point A ─── */}
                <line
                    x1={hinge.x}
                    y1={hinge.y}
                    x2={pointA.x}
                    y2={pointA.y}
                    stroke="url(#dividerSteelGrad)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    filter="url(#dividerDropShadow)"
                />
                {/* Needle Tip A Taper */}
                <line
                    x1={pointA.x + (hinge.x - pointA.x) * 0.15}
                    y1={pointA.y + (hinge.y - pointA.y) * 0.15}
                    x2={pointA.x}
                    y2={pointA.y}
                    stroke="#cbd5e1"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />

                {/* ─── Caliper Arm 2: Hinge to Needle Point B ─── */}
                <line
                    x1={hinge.x}
                    y1={hinge.y}
                    x2={pointB.x}
                    y2={pointB.y}
                    stroke="url(#dividerSteelGrad)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    filter="url(#dividerDropShadow)"
                />
                {/* Needle Tip B Taper */}
                <line
                    x1={pointB.x + (hinge.x - pointB.x) * 0.15}
                    y1={pointB.y + (hinge.y - pointB.y) * 0.15}
                    x2={pointB.x}
                    y2={pointB.y}
                    stroke="#cbd5e1"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />

                {/* ─── Friction Hinge Joint & Knurled Spindle ─── */}
                <line
                    x1={hinge.x}
                    y1={hinge.y}
                    x2={spindleTop.x}
                    y2={spindleTop.y}
                    stroke="url(#dividerSteelGrad)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    filter="url(#dividerDropShadow)"
                />
                <circle
                    cx={hinge.x}
                    cy={hinge.y}
                    r="8.5"
                    fill="#0f172a"
                    stroke="#94a3b8"
                    strokeWidth="2.5"
                    filter="url(#dividerDropShadow)"
                />
                <circle cx={hinge.x} cy={hinge.y} r="3.5" fill="#e2e8f0" />
                <circle cx={spindleTop.x} cy={spindleTop.y} r="5" fill="#334155" stroke="#cbd5e1" strokeWidth="1.5" />
            </svg>

            {/* ─── Control 1: Primary Needle A (Draggable to move divider) ─── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${pointA.x}px`,
                    top: `${pointA.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handlePointAPointerDown}
                className="w-8 h-8 rounded-full bg-slate-900/90 border-2 border-purple-400 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition group"
                title="Drag primary needle tip A"
            >
                <Crosshair className="w-4 h-4 text-purple-300 group-hover:text-purple-100" />
            </div>

            {/* ─── Control 2: Secondary Needle B (Draggable to adjust span / rotate) ─── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${pointB.x}px`,
                    top: `${pointB.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handlePointBPointerDown}
                className="w-8 h-8 rounded-full bg-slate-900/90 border-2 border-cyan-400 shadow-xl flex items-center justify-center cursor-crosshair hover:scale-110 transition group"
                title="Drag needle tip B to adjust span or rotate"
            >
                <Crosshair className="w-4 h-4 text-cyan-300 group-hover:text-cyan-100" />
            </div>

            {/* ─── Control 3: Distance Measurement Badge (Center of span) ─── */}
            <div
                data-handle="true"
                style={{
                    position: 'absolute',
                    left: `${(pointA.x + pointB.x) / 2}px`,
                    top: `${(pointA.y + pointB.y) / 2}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                className="px-2.5 py-0.5 rounded-full bg-slate-900/95 border border-purple-400/80 shadow-md flex items-center gap-1.5"
            >
                <span className="text-[10.5px] font-mono font-bold text-purple-300">
                    {spanCm.toFixed(1)} cm
                </span>
                <span className="text-[9px] text-slate-500">|</span>
                <span className="text-[10px] font-mono text-cyan-300">
                    {angle.toFixed(0)}°
                </span>
            </div>

            {/* ─── Top Control HUD: Mark Distance, Lock, Close ─── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${hinge.x}px`,
                    top: `${hinge.y - 28}px`,
                    transform: 'translate(-50%, -100%)',
                    pointerEvents: 'auto'
                }}
                className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full px-2.5 py-1 shadow-2xl"
            >
                {/* Lock Span Toggle */}
                <button
                    type="button"
                    onClick={() => setIsLocked(!isLocked)}
                    className={`p-1 rounded-full transition ${
                        isLocked ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                    title={isLocked ? 'Unlock span' : 'Lock span distance'}
                >
                    {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </button>

                {/* Mark Distance onto Whiteboard */}
                <button
                    type="button"
                    onClick={handleMarkDistance}
                    className="flex items-center gap-1 px-2.5 py-0.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] rounded-full shadow transition active:scale-95"
                    title="Mark exact distance between needle tips onto canvas"
                >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    <span>Mark Distance</span>
                </button>

                {/* Close Divider */}
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
