'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
    RotateCw,
    X,
    Circle as CircleIcon,
    Pencil as PencilIcon,
    Crosshair
} from 'lucide-react';
import {
    PX_PER_CM,
    pxToCm,
    snapAngleDeg,
    degToRad,
    radToDeg,
    describeArc,
    screenToCanvasCoords,
    calculateHingePoint
} from './geometryMath';

export default function CompassTool({
    initialX = 350,
    initialY = 280,
    initialRadiusCm = 6,
    initialAngle = 30,
    scale = 1,
    onDrawCircle,
    onDrawArc,
    onClose
}) {
    // Anchor needle position (center of circle) in canvas coordinates
    const [center, setCenter] = useState({ x: initialX, y: initialY });
    const [radiusCm, setRadiusCm] = useState(initialRadiusCm);
    const [angle, setAngle] = useState(initialAngle); // Angle of pencil relative to center

    // Arc sweep drawing state
    const [isSweepingArc, setIsSweepingArc] = useState(false);
    const [arcStartAngle, setArcStartAngle] = useState(0);
    const [arcSweepDeg, setArcSweepDeg] = useState(0);

    // Constant arm length for both arms (physical geometry compass)
    const ARM_LENGTH = 180; // px (~4.76 cm)

    const radiusPx = radiusCm * PX_PER_CM;

    // Needle drag ref
    const isDraggingNeedleRef = useRef(false);
    const needleDragStartRef = useRef({ canvasStartX: 0, canvasStartY: 0, initialCenterX: 0, initialCenterY: 0 });

    // Radius adjustment ref
    const isResizingRadiusRef = useRef(false);

    // Rotation / sweep drag ref
    const isRotatingPencilRef = useRef(false);
    const sweepStartAngleRef = useRef(0);

    // ─── 1. Needle Drag (Reposition entire compass) ───
    const handleNeedlePointerDown = (e) => {
        if (e.target.closest('button') || e.target.closest('[data-handle="true"]')) return;
        e.stopPropagation();
        e.preventDefault();
        isDraggingNeedleRef.current = true;

        const coords = screenToCanvasCoords(e.clientX, e.clientY);
        needleDragStartRef.current = {
            canvasStartX: coords.x,
            canvasStartY: coords.y,
            initialCenterX: center.x,
            initialCenterY: center.y
        };

        const onPointerMove = (moveEvt) => {
            if (!isDraggingNeedleRef.current) return;
            const curCoords = screenToCanvasCoords(moveEvt.clientX, moveEvt.clientY);
            const dx = curCoords.x - needleDragStartRef.current.canvasStartX;
            const dy = curCoords.y - needleDragStartRef.current.canvasStartY;
            setCenter({
                x: Math.round(needleDragStartRef.current.initialCenterX + dx),
                y: Math.round(needleDragStartRef.current.initialCenterY + dy)
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

    // ─── 2. Adjust Compass Radius (Opening / closing arms) ───
    const handleRadiusPointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        isResizingRadiusRef.current = true;

        const onPointerMove = (moveEvt) => {
            if (!isResizingRadiusRef.current) return;
            const coords = screenToCanvasCoords(moveEvt.clientX, moveEvt.clientY);
            const distPx = Math.hypot(coords.x - center.x, coords.y - center.y);

            // Maximum radius limited by arm geometry (never exceeds 2 * ARM_LENGTH - 10px)
            const maxPx = ARM_LENGTH * 1.85;
            const clampedPx = Math.max(PX_PER_CM * 1.5, Math.min(maxPx, distPx));
            const newCm = Math.round((clampedPx / PX_PER_CM) * 2) / 2;
            setRadiusCm(newCm);
        };

        const onPointerUp = () => {
            isResizingRadiusRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // ─── 3. Rotate Compass & Sweep Arcs ───
    const handlePencilPointerDown = (e, sweepMode = false) => {
        e.stopPropagation();
        e.preventDefault();
        isRotatingPencilRef.current = true;
        setIsSweepingArc(sweepMode);

        const coords = screenToCanvasCoords(e.clientX, e.clientY);
        const startRad = Math.atan2(coords.y - center.y, coords.x - center.x);
        let startDeg = (startRad * 180) / Math.PI;
        if (startDeg < 0) startDeg += 360;

        sweepStartAngleRef.current = startDeg;
        setArcStartAngle(startDeg);
        setArcSweepDeg(0);

        const onPointerMove = (moveEvt) => {
            if (!isRotatingPencilRef.current) return;
            const curCoords = screenToCanvasCoords(moveEvt.clientX, moveEvt.clientY);
            const curRad = Math.atan2(curCoords.y - center.y, curCoords.x - center.x);
            let curDeg = (curRad * 180) / Math.PI;
            if (curDeg < 0) curDeg += 360;

            const snapped = snapAngleDeg(curDeg, moveEvt.shiftKey ? 15 : 1, moveEvt.shiftKey);
            setAngle(snapped);

            if (sweepMode) {
                let diff = curDeg - sweepStartAngleRef.current;
                if (diff < 0) diff += 360;
                setArcSweepDeg(diff);
            }
        };

        const onPointerUp = () => {
            isRotatingPencilRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);

            if (sweepMode && arcSweepDeg > 5 && onDrawArc) {
                onDrawArc({
                    cx: Math.round(center.x),
                    cy: Math.round(center.y),
                    radius: radiusPx,
                    startAngleDeg: arcStartAngle,
                    endAngleDeg: (arcStartAngle + arcSweepDeg) % 360,
                    sweepDeg: Math.round(arcSweepDeg)
                });
            }
            setIsSweepingArc(false);
            setArcSweepDeg(0);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // ─── 4. Draw Full Circle Action ───
    const handleDrawFullCircle = useCallback(() => {
        if (!onDrawCircle) return;
        onDrawCircle({
            cx: Math.round(center.x),
            cy: Math.round(center.y),
            radius: radiusPx,
            radiusCm
        });
    }, [onDrawCircle, center, radiusPx, radiusCm]);

    // Pencil Tip Coordinates
    const pencilRad = degToRad(angle);
    const pencilTip = {
        x: center.x + radiusPx * Math.cos(pencilRad),
        y: center.y + radiusPx * Math.sin(pencilRad)
    };

    // Mathematically exact apex hinge position ensuring constant arm lengths L
    const hinge = calculateHingePoint(center, pencilTip, ARM_LENGTH, false);

    // Spindle / top handle extends past the hinge along the hinge bisector
    const bisectorDx = hinge.x - (center.x + pencilTip.x) / 2;
    const bisectorDy = hinge.y - (center.y + pencilTip.y) / 2;
    const bisectorLen = Math.hypot(bisectorDx, bisectorDy) || 1;
    const spindleTop = {
        x: hinge.x + (bisectorDx / bisectorLen) * 32,
        y: hinge.y + (bisectorDy / bisectorLen) * 32
    };

    return (
        <div className="absolute inset-0 pointer-events-none select-none z-[66]">
            {/* SVG Realistic Physical Compass Render */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                <defs>
                    {/* Metal Steel / Brass Gradients for Arms */}
                    <linearGradient id="compassSteelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="35%" stopColor="#e2e8f0" />
                        <stop offset="70%" stopColor="#64748b" />
                        <stop offset="100%" stopColor="#334155" />
                    </linearGradient>

                    {/* Wooden Pencil Body Gradient */}
                    <linearGradient id="pencilWoodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="50%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>

                    {/* Drop shadow for 3D realism */}
                    <filter id="compassDropShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.4" />
                    </filter>
                </defs>

                {/* Radius Track Dotted Reference Circle */}
                <circle
                    cx={center.x}
                    cy={center.y}
                    r={radiusPx}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    opacity="0.35"
                />

                {/* Sweeping Arc Preview while dragging pencil */}
                {isSweepingArc && arcSweepDeg > 2 && (
                    <path
                        d={describeArc(center.x, center.y, radiusPx, arcStartAngle, (arcStartAngle + arcSweepDeg) % 360)}
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    />
                )}

                {/* ─── Compass Arm 1: Needle Leg (Hinge to Needle Tip) ─── */}
                <line
                    x1={hinge.x}
                    y1={hinge.y}
                    x2={center.x}
                    y2={center.y}
                    stroke="url(#compassSteelGrad)"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    filter="url(#compassDropShadow)"
                />
                {/* Needle Point Taper */}
                <line
                    x1={center.x + (hinge.x - center.x) * 0.12}
                    y1={center.y + (hinge.y - center.y) * 0.12}
                    x2={center.x}
                    y2={center.y}
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    strokeLinecap="round"
                />

                {/* ─── Compass Arm 2: Pencil Leg (Hinge to Pencil Collar) ─── */}
                <line
                    x1={hinge.x}
                    y1={hinge.y}
                    x2={pencilTip.x}
                    y2={pencilTip.y}
                    stroke="url(#compassSteelGrad)"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    filter="url(#compassDropShadow)"
                />

                {/* Realistic Wooden Pencil clamped to Arm 2 */}
                {(() => {
                    const legDx = pencilTip.x - hinge.x;
                    const legDy = pencilTip.y - hinge.y;
                    const legLen = Math.hypot(legDx, legDy) || 1;
                    const ux = legDx / legLen;
                    const uy = legDy / legLen;
                    const perpX = -uy * 5;
                    const perpY = ux * 5;

                    // Pencil body starts 28px back from tip and extends 20px past collar
                    const collarX = pencilTip.x - ux * 28;
                    const collarY = pencilTip.y - uy * 28;
                    const pencilTopX = pencilTip.x - ux * 52;
                    const pencilTopY = pencilTip.y - uy * 52;

                    return (
                        <g filter="url(#compassDropShadow)">
                            {/* Wooden Pencil Shaft */}
                            <line
                                x1={pencilTopX + perpX}
                                y1={pencilTopY + perpY}
                                x2={collarX + perpX}
                                y2={collarY + perpY}
                                stroke="url(#pencilWoodGrad)"
                                strokeWidth="5"
                                strokeLinecap="square"
                            />
                            {/* Sharpened Lead Cone & Tip */}
                            <polygon
                                points={`
                                    ${collarX + perpX - ux * 2},${collarY + perpY - uy * 2} 
                                    ${collarX - perpX - ux * 2},${collarY - perpY - uy * 2} 
                                    ${pencilTip.x},${pencilTip.y}
                                `}
                                fill="#fed7aa"
                                stroke="#d97706"
                                strokeWidth="0.5"
                            />
                            {/* Graphite Lead Tip */}
                            <polygon
                                points={`
                                    ${pencilTip.x - ux * 6 + perpX * 0.4},${pencilTip.y - uy * 6 + perpY * 0.4} 
                                    ${pencilTip.x - ux * 6 - perpX * 0.4},${pencilTip.y - uy * 6 - perpY * 0.4} 
                                    ${pencilTip.x},${pencilTip.y}
                                `}
                                fill="#0f172a"
                            />
                            {/* Metal Clamp Collar with Thumbscrew */}
                            <rect
                                x={collarX - 5}
                                y={collarY - 5}
                                width="10"
                                height="10"
                                rx="2"
                                fill="#475569"
                                stroke="#cbd5e1"
                                strokeWidth="1"
                            />
                        </g>
                    );
                })()}

                {/* ─── Top Hinge Joint & Knurled Spindle Handle ─── */}
                <line
                    x1={hinge.x}
                    y1={hinge.y}
                    x2={spindleTop.x}
                    y2={spindleTop.y}
                    stroke="url(#compassSteelGrad)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    filter="url(#compassDropShadow)"
                />
                <circle
                    cx={hinge.x}
                    cy={hinge.y}
                    r="8.5"
                    fill="#1e293b"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    filter="url(#compassDropShadow)"
                />
                <circle cx={hinge.x} cy={hinge.y} r="3.5" fill="#e2e8f0" />

                {/* Knurled Grip Top Cap */}
                <circle
                    cx={spindleTop.x}
                    cy={spindleTop.y}
                    r="5"
                    fill="#334155"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                />

                {/* Radius Reference Dimension Line */}
                <line
                    x1={center.x}
                    y1={center.y}
                    x2={pencilTip.x}
                    y2={pencilTip.y}
                    stroke="#0284c7"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                    opacity="0.6"
                />
            </svg>

            {/* ─── Control 1: Center Needle Anchor (Draggable) ─── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${center.x}px`,
                    top: `${center.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handleNeedlePointerDown}
                className="w-8 h-8 rounded-full bg-slate-900/90 border-2 border-cyan-400 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition group"
                title="Drag to reposition needle pivot"
            >
                <Crosshair className="w-4 h-4 text-cyan-300 group-hover:text-cyan-100" />
            </div>

            {/* ─── Control 2: Pencil Tip & Sweep Handle ─── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${pencilTip.x}px`,
                    top: `${pencilTip.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={(e) => handlePencilPointerDown(e, true)}
                className="w-8 h-8 rounded-full bg-slate-900/90 border-2 border-amber-400 shadow-xl flex items-center justify-center cursor-crosshair hover:scale-110 transition group"
                title="Drag pencil to sweep and draw an arc"
            >
                <PencilIcon className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
            </div>

            {/* ─── Control 3: Radius Adjustment Handle (Opening / Closing) ─── */}
            <div
                data-handle="true"
                style={{
                    position: 'absolute',
                    left: `${(center.x + pencilTip.x) / 2}px`,
                    top: `${(center.y + pencilTip.y) / 2}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handleRadiusPointerDown}
                className="px-2 py-0.5 rounded-full bg-slate-900/95 border border-cyan-400/80 shadow-md flex items-center gap-1 cursor-ew-resize hover:scale-105 transition"
                title="Drag to open or close compass radius"
            >
                <span className="text-[10px] font-mono font-bold text-cyan-300">
                    r = {radiusCm.toFixed(1)} cm
                </span>
            </div>

            {/* ─── Floating Top Control HUD: Draw Circle & Dismiss ─── */}
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
                {/* Real-time Angle & Radius Display */}
                <span className="text-[10px] font-mono text-slate-300">
                    {angle.toFixed(0)}°
                </span>

                <div className="w-px h-3 bg-slate-700" />

                {/* Draw Full Circle */}
                <button
                    type="button"
                    onClick={handleDrawFullCircle}
                    className="flex items-center gap-1 px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] rounded-full shadow transition active:scale-95"
                    title="Draw exact full circle"
                >
                    <CircleIcon className="w-2.5 h-2.5" />
                    <span>Draw Circle</span>
                </button>

                {/* Close Compass */}
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
