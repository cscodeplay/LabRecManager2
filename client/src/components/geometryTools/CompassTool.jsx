'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
    RotateCw,
    X,
    Check,
    Circle as CircleIcon,
    Move,
    Maximize2,
    Compass as CompassIcon
} from 'lucide-react';
import {
    PX_PER_CM,
    pxToCm,
    snapAngleDeg,
    degToRad,
    describeArc
} from './geometryMath';

export default function CompassTool({
    initialX = 350,
    initialY = 280,
    initialRadiusCm = 6,
    initialAngle = 0,
    scale = 1,
    onDrawCircle,
    onDrawArc,
    onClose
}) {
    // Anchor needle position (center of circle)
    const [center, setCenter] = useState({ x: initialX, y: initialY });
    const [radiusCm, setRadiusCm] = useState(initialRadiusCm);
    const [angle, setAngle] = useState(initialAngle); // current pencil position angle
    const [arcStartAngle, setArcStartAngle] = useState(0);
    const [arcSweepDeg, setArcSweepDeg] = useState(360);
    const [isSweepingArc, setIsSweepingArc] = useState(false);

    const radiusPx = radiusCm * PX_PER_CM;

    // Needle drag (moves entire compass)
    const isDraggingNeedleRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, initialCenterX: 0, initialCenterY: 0 });

    // Radius resize drag
    const isResizingRadiusRef = useRef(false);

    // Rotation / sweep drag
    const isRotatingPencilRef = useRef(false);
    const sweepStartAngleRef = useRef(0);

    // Reposition Compass Needle (Anchor)
    const handleNeedlePointerDown = (e) => {
        if (e.target.closest('button') || e.target.closest('[data-handle="true"]')) return;
        e.stopPropagation();
        e.preventDefault();
        isDraggingNeedleRef.current = true;
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            initialCenterX: center.x,
            initialCenterY: center.y
        };

        const onPointerMove = (moveEvt) => {
            if (!isDraggingNeedleRef.current) return;
            const dx = (moveEvt.clientX - dragStartRef.current.x) / (scale || 1);
            const dy = (moveEvt.clientY - dragStartRef.current.y) / (scale || 1);
            setCenter({
                x: Math.round(dragStartRef.current.initialCenterX + dx),
                y: Math.round(dragStartRef.current.initialCenterY + dy)
            });
        };

        const onPointerUp = () => {
            isDraggingNeedleRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // Adjust Compass Radius (Distance between Needle and Pencil)
    const handleRadiusPointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        isResizingRadiusRef.current = true;

        const onPointerMove = (moveEvt) => {
            if (!isResizingRadiusRef.current) return;
            const mouseX = (moveEvt.clientX - center.x) / (scale || 1);
            const mouseY = (moveEvt.clientY - center.y) / (scale || 1);
            const distPx = Math.hypot(mouseX, mouseY);
            const cm = Math.max(2, Math.min(25, Math.round((distPx / PX_PER_CM) * 2) / 2));
            setRadiusCm(cm);
        };

        const onPointerUp = () => {
            isResizingRadiusRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // Rotate or Sweep Pencil around Needle
    const handlePencilPointerDown = (e, sweepMode = false) => {
        e.stopPropagation();
        e.preventDefault();
        isRotatingPencilRef.current = true;
        setIsSweepingArc(sweepMode);

        const currentRad = Math.atan2(
            (e.clientY - center.y) / (scale || 1),
            (e.clientX - center.x) / (scale || 1)
        );
        let currentDeg = (currentRad * 180) / Math.PI;
        if (currentDeg < 0) currentDeg += 360;

        sweepStartAngleRef.current = currentDeg;
        setArcStartAngle(currentDeg);
        setArcSweepDeg(0);

        const onPointerMove = (moveEvt) => {
            if (!isRotatingPencilRef.current) return;
            const rad = Math.atan2(
                (moveEvt.clientY - center.y) / (scale || 1),
                (moveEvt.clientX - center.x) / (scale || 1)
            );
            let deg = (rad * 180) / Math.PI;
            if (deg < 0) deg += 360;

            const snapped = snapAngleDeg(deg, moveEvt.shiftKey ? 15 : 1, moveEvt.shiftKey);
            setAngle(snapped);

            if (sweepMode) {
                let sweep = snapped - sweepStartAngleRef.current;
                if (sweep < 0) sweep += 360;
                setArcSweepDeg(sweep);
            }
        };

        const onPointerUp = () => {
            isRotatingPencilRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // Draw Complete 360° Circle onto Whiteboard
    const handleDrawFullCircle = useCallback(() => {
        if (!onDrawCircle) return;
        onDrawCircle({
            cx: Math.round(center.x),
            cy: Math.round(center.y),
            radius: Math.round(radiusPx),
            radiusCm
        });
    }, [onDrawCircle, center, radiusPx, radiusCm]);

    // Draw Arc onto Whiteboard
    const handleDrawSweptArc = useCallback(() => {
        if (!onDrawArc) return;
        const start = arcStartAngle;
        const end = (arcStartAngle + (arcSweepDeg || 90)) % 360;
        onDrawArc({
            cx: Math.round(center.x),
            cy: Math.round(center.y),
            radius: Math.round(radiusPx),
            startAngleDeg: Math.round(start),
            endAngleDeg: Math.round(end),
            sweepDeg: Math.round(arcSweepDeg || 90)
        });
        setIsSweepingArc(false);
    }, [onDrawArc, center, radiusPx, arcStartAngle, arcSweepDeg]);

    // Compute pencil position in canvas coordinates
    const pencilRad = degToRad(angle);
    const pencilX = center.x + radiusPx * Math.cos(pencilRad);
    const pencilY = center.y + radiusPx * Math.sin(pencilRad);

    // Hinge top apex position
    const hingeHeight = Math.max(70, radiusPx * 0.7);
    const midX = (center.x + pencilX) / 2;
    const midY = (center.y + pencilY) / 2 - hingeHeight;

    return (
        <div className="absolute inset-0 pointer-events-none select-none z-[66]">
            {/* SVG Compass Arms & Sweep Arc Preview */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                <defs>
                    <radialGradient id="compassCenterGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="needleLegGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="50%" stopColor="#cbd5e1" />
                        <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                    <linearGradient id="pencilLegGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="60%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#ea580c" />
                    </linearGradient>
                </defs>

                {/* Sweep Circle Guide / Radius Track */}
                <circle
                    cx={center.x}
                    cy={center.y}
                    r={radiusPx}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    opacity="0.45"
                />

                {/* Sweeping Arc preview while drawing */}
                {isSweepingArc && arcSweepDeg > 2 && (
                    <path
                        d={describeArc(center.x, center.y, radiusPx, arcStartAngle, (arcStartAngle + arcSweepDeg) % 360)}
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                )}

                {/* Needle Anchor Leg (Center to Apex) */}
                <line
                    x1={center.x}
                    y1={center.y}
                    x2={midX}
                    y2={midY}
                    stroke="url(#needleLegGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"
                />

                {/* Pencil Leg (Apex to Pencil Tip) */}
                <line
                    x1={midX}
                    y1={midY}
                    x2={pencilX}
                    y2={pencilY}
                    stroke="url(#pencilLegGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"
                />

                {/* Hinge Joint at Top */}
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

                {/* Compass Radius Dimension Line & Text */}
                <line
                    x1={center.x}
                    y1={center.y}
                    x2={pencilX}
                    y2={pencilY}
                    stroke="#fbbf24"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                    opacity="0.75"
                />
            </svg>

            {/* 1. Needle Anchor Point (Center Handle) */}
            <div
                style={{
                    position: 'absolute',
                    left: `${center.x}px`,
                    top: `${center.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handleNeedlePointerDown}
                className="w-9 h-9 rounded-full bg-slate-950/90 border-2 border-cyan-400 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition group"
                title="Drag to reposition Compass needle anchor"
            >
                {/* Needle Crosshair */}
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-cyan-500/30 shadow-[0_0_8px_#22d3ee]" />
            </div>

            {/* 2. Pencil Tip Handle & Sweep Controller */}
            <div
                data-handle="true"
                style={{
                    position: 'absolute',
                    left: `${pencilX}px`,
                    top: `${pencilY}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={(e) => handlePencilPointerDown(e, true)}
                className="w-9 h-9 rounded-full bg-slate-950/95 border-2 border-amber-400 shadow-2xl flex items-center justify-center cursor-crosshair hover:scale-110 transition group"
                title="Drag pencil to sweep and draw arc (Hold Shift for 15° snap)"
            >
                {/* Pencil Lead Tip */}
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_0_8px_#f59e0b]" />
            </div>

            {/* 3. Radius Adjustment Handle (Along Radius Spoke) */}
            <div
                data-handle="true"
                style={{
                    position: 'absolute',
                    left: `${(center.x + pencilX) / 2}px`,
                    top: `${(center.y + pencilY) / 2}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handleRadiusPointerDown}
                className="px-2 py-0.5 rounded-full bg-slate-900/95 border border-cyan-400/80 text-[10px] font-mono font-bold text-cyan-300 shadow-xl cursor-ew-resize hover:bg-cyan-500 hover:text-slate-950 transition flex items-center gap-1"
                title="Drag to adjust compass radius"
            >
                <Maximize2 className="w-2.5 h-2.5" />
                <span>{radiusCm.toFixed(1)} cm</span>
            </div>

            {/* 4. Floating Action HUD at Hinge */}
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
                {/* Angle Readout */}
                <span className="text-[11px] font-mono font-bold text-amber-300">
                    {angle.toFixed(0)}°
                </span>

                <div className="w-[1px] h-3.5 bg-slate-700" />

                {/* Draw Full Circle Button */}
                <button
                    type="button"
                    onClick={handleDrawFullCircle}
                    className="flex items-center gap-1 px-2.5 py-0.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] rounded-full shadow transition active:scale-95"
                    title="Stamp 360° circle onto whiteboard canvas"
                >
                    <CircleIcon className="w-3 h-3" />
                    <span>Circle</span>
                </button>

                {/* Draw Arc Button */}
                {isSweepingArc && arcSweepDeg > 5 && (
                    <button
                        type="button"
                        onClick={handleDrawSweptArc}
                        className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-full shadow transition active:scale-95"
                        title="Stamp swept arc onto whiteboard canvas"
                    >
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Arc ({arcSweepDeg.toFixed(0)}°)</span>
                    </button>
                )}

                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded-full bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white transition"
                    title="Close Compass"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
