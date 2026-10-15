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
    onClose,
    onStateChange
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

    // Report compass boundary
    React.useEffect(() => {
        if (onStateChange) {
            onStateChange({
                type: 'compass',
                centerX: center.x,
                centerY: center.y,
                radiusPx
            });
        }
    }, [onStateChange, center.x, center.y, radiusPx]);

    // Needle drag ref
    const isDraggingNeedleRef = useRef(false);
    const needleDragStartRef = useRef({ canvasStartX: 0, canvasStartY: 0, initialCenterX: 0, initialCenterY: 0 });

    // Radius adjustment ref
    const isResizingRadiusRef = useRef(false);

    // Rotation / sweep drag ref
    const isRotatingPencilRef = useRef(false);
    const sweepStartAngleRef = useRef(0);
    const currentSweepDegRef = useRef(0);
    const startAngleDegRef = useRef(0);
    const isAnimatingCircleRef = useRef(false);

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

    // ─── 2. Adjust Compass Radius (Opening / closing arms in 0.1 cm steps) ───
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
            const clampedPx = Math.max(PX_PER_CM * 1.0, Math.min(maxPx, distPx));
            const newCm = Math.round((clampedPx / PX_PER_CM) * 10) / 10;
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
        startAngleDegRef.current = startDeg;
        currentSweepDegRef.current = 0;
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
                currentSweepDegRef.current = diff;
                setArcSweepDeg(diff);
            }
        };

        const onPointerUp = () => {
            isRotatingPencilRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);

            const finalSweep = currentSweepDegRef.current;
            const finalStartAngle = startAngleDegRef.current;

            if (sweepMode && finalSweep > 4 && onDrawArc) {
                onDrawArc({
                    cx: Math.round(center.x),
                    cy: Math.round(center.y),
                    radius: radiusPx,
                    startAngleDeg: finalStartAngle,
                    endAngleDeg: (finalStartAngle + finalSweep) % 360,
                    sweepDeg: Math.round(finalSweep)
                });
            }
            setIsSweepingArc(false);
            setArcSweepDeg(0);
            currentSweepDegRef.current = 0;
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // ─── 4. Draw Full Circle Action with Animated In-Action Drawing ───
    const handleDrawFullCircle = useCallback(() => {
        if (!onDrawCircle || isAnimatingCircleRef.current) return;
        isAnimatingCircleRef.current = true;
        setIsSweepingArc(true);

        const initialPencilAngle = angle;
        setArcStartAngle(initialPencilAngle);
        setArcSweepDeg(0);

        const duration = 650; // ms for full 360 circle sweep
        const startTime = performance.now();

        const animateCircleSweep = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(1, elapsed / duration);
            // Smooth ease in-out
            const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            const currentSweep = ease * 360;

            setArcSweepDeg(currentSweep);
            setAngle((initialPencilAngle + currentSweep) % 360);

            if (progress < 1) {
                requestAnimationFrame(animateCircleSweep);
            } else {
                setArcSweepDeg(360);
                setTimeout(() => {
                    setIsSweepingArc(false);
                    setArcSweepDeg(0);
                    isAnimatingCircleRef.current = false;
                    onDrawCircle({
                        cx: Math.round(center.x),
                        cy: Math.round(center.y),
                        radius: radiusPx,
                        radiusCm
                    });
                }, 40);
            }
        };

        requestAnimationFrame(animateCircleSweep);
    }, [onDrawCircle, center, radiusPx, radiusCm, angle]);

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

    // Vertical middle of height for radius & angle readout badge
    const midX = (hinge.x + (center.x + pencilTip.x) / 2) / 2;
    const midY = (hinge.y + (center.y + pencilTip.y) / 2) / 2;

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

                    {/* Authentic Indian Classroom Pencil (Natraj 621 Red & Black Stripes) */}
                    <linearGradient id="natrajPencilStripeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#b91c1c" />
                        <stop offset="25%" stopColor="#b91c1c" />
                        <stop offset="25%" stopColor="#09090b" />
                        <stop offset="50%" stopColor="#09090b" />
                        <stop offset="50%" stopColor="#dc2626" />
                        <stop offset="75%" stopColor="#dc2626" />
                        <stop offset="75%" stopColor="#09090b" />
                        <stop offset="100%" stopColor="#09090b" />
                    </linearGradient>

                    {/* Sharpened Pine Wood Cone Gradient */}
                    <linearGradient id="pencilPineConeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="60%" stopColor="#fde047" />
                        <stop offset="100%" stopColor="#f59e0b" />
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

                {/* Authentic Indian Classroom Pencil (Natraj 621 Red & Black) clamped to Arm 2 */}
                {(() => {
                    const legDx = pencilTip.x - hinge.x;
                    const legDy = pencilTip.y - hinge.y;
                    const legLen = Math.hypot(legDx, legDy) || 1;
                    const ux = legDx / legLen;
                    const uy = legDy / legLen;
                    const perpX = -uy * 4.5;
                    const perpY = ux * 4.5;

                    // Pencil body starts 26px back from tip and extends 32px past collar
                    const collarX = pencilTip.x - ux * 26;
                    const collarY = pencilTip.y - uy * 26;
                    const pencilTopX = pencilTip.x - ux * 58;
                    const pencilTopY = pencilTip.y - uy * 58;

                    return (
                        <g filter="url(#compassDropShadow)">
                            {/* Hexagonal Pencil Shaft with Longitudinal Alternating Red & Black Stripes */}
                            {/* Bottom Black Stripe */}
                            <line
                                x1={pencilTopX + perpX * 0.9}
                                y1={pencilTopY + perpY * 0.9}
                                x2={collarX + perpX * 0.9}
                                y2={collarY + perpY * 0.9}
                                stroke="#09090b"
                                strokeWidth="2.5"
                                strokeLinecap="square"
                            />
                            {/* Middle Bold Natraj Red Stripe */}
                            <line
                                x1={pencilTopX}
                                y1={pencilTopY}
                                x2={collarX}
                                y2={collarY}
                                stroke="#dc2626"
                                strokeWidth="3.2"
                                strokeLinecap="square"
                            />
                            {/* Top Black Stripe */}
                            <line
                                x1={pencilTopX - perpX * 0.9}
                                y1={pencilTopY - perpY * 0.9}
                                x2={collarX - perpX * 0.9}
                                y2={collarY - perpY * 0.9}
                                stroke="#09090b"
                                strokeWidth="2.5"
                                strokeLinecap="square"
                            />
                            {/* Pencil Flat End Cap */}
                            <line
                                x1={pencilTopX - perpX * 1.1}
                                y1={pencilTopY - perpY * 1.1}
                                x2={pencilTopX + perpX * 1.1}
                                y2={pencilTopY + perpY * 1.1}
                                stroke="#7f1d1d"
                                strokeWidth="1.5"
                            />

                            {/* Sharpened Pine Wood Cone */}
                            <polygon
                                points={`
                                    ${collarX + perpX * 1.1},${collarY + perpY * 1.1} 
                                    ${collarX - perpX * 1.1},${collarY - perpY * 1.1} 
                                    ${pencilTip.x},${pencilTip.y}
                                `}
                                fill="url(#pencilPineConeGrad)"
                                stroke="#d97706"
                                strokeWidth="0.4"
                            />

                            {/* Subtle Woodgrain / Scalloped Sharpener Blade Cut */}
                            <path
                                d={`M ${collarX - perpX * 0.8} ${collarY - perpY * 0.8} Q ${collarX - ux * 3} ${collarY - uy * 3} ${collarX} ${collarY} Q ${collarX - ux * 3} ${collarY - uy * 3} ${collarX + perpX * 0.8} ${collarY + perpY * 0.8}`}
                                fill="none"
                                stroke="#b45309"
                                strokeWidth="0.6"
                                opacity="0.6"
                            />

                            {/* 2B Dark Graphite Lead Tip */}
                            <polygon
                                points={`
                                    ${pencilTip.x - ux * 7 + perpX * 0.35},${pencilTip.y - uy * 7 + perpY * 0.35} 
                                    ${pencilTip.x - ux * 7 - perpX * 0.35},${pencilTip.y - uy * 7 - perpY * 0.35} 
                                    ${pencilTip.x},${pencilTip.y}
                                `}
                                fill="#0f172a"
                            />

                            {/* Metal Clamp Collar with Thumbscrew */}
                            <rect
                                x={collarX - 5.5}
                                y={collarY - 5.5}
                                width="11"
                                height="11"
                                rx="2"
                                fill="#475569"
                                stroke="#cbd5e1"
                                strokeWidth="1"
                            />
                            {/* Thumbscrew knurled knob */}
                            <circle
                                cx={collarX - perpX * 1.2}
                                cy={collarY - perpY * 1.2}
                                r="2.5"
                                fill="#94a3b8"
                                stroke="#334155"
                                strokeWidth="0.75"
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

            {/* ─── Control 1: Center Needle Anchor (Clean sharp tip, NO icon badge) ─── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${center.x}px`,
                    top: `${center.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handleNeedlePointerDown}
                className="w-7 h-7 rounded-full cursor-grab active:cursor-grabbing hover:bg-cyan-500/15 hover:ring-2 hover:ring-cyan-400/60 transition flex items-center justify-center group"
                title="Drag needle pivot to reposition compass"
            >
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-slate-300 group-hover:border-cyan-400 transition-colors shadow-sm" />
            </div>

            {/* ─── Control 2: Pencil Tip & Sweep Handle (Hand cursor, NO pencil icon badge) ─── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${pencilTip.x}px`,
                    top: `${pencilTip.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={(e) => handlePencilPointerDown(e, true)}
                className="w-7 h-7 rounded-full cursor-grab active:cursor-grabbing hover:bg-amber-400/20 hover:ring-2 hover:ring-amber-400/60 transition flex items-center justify-center group"
                title="Hover & drag to rotate pencil or sweep an arc"
            >
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900/60 border border-amber-400 group-hover:scale-125 transition-transform" />
            </div>

            {/* ─── Control 3: Bending Point Top Hinge Joint (Drag to move whole compass) ─── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${hinge.x}px`,
                    top: `${hinge.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handleNeedlePointerDown}
                className="w-9 h-9 rounded-full cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-cyan-400/70 transition flex items-center justify-center group"
                title="Hold bending point to move compass"
            >
                <div className="w-5 h-5 rounded-full bg-slate-900/80 border border-cyan-400/70 group-hover:scale-110 transition-transform flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                </div>
            </div>

            {/* ─── Control 4: Radius & Angle Readout Badge (Mid-Height, Transparent) ─── */}
            <div
                data-handle="true"
                style={{
                    position: 'absolute',
                    left: `${midX}px`,
                    top: `${midY}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                className="px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-xs border border-white/20 shadow-md flex items-center gap-1.5 transition select-none text-white text-[11px] font-mono"
            >
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setRadiusCm(r => +(Math.max(1.0, r - 0.1)).toFixed(1));
                    }}
                    className="w-4 h-4 rounded-full bg-white/10 hover:bg-cyan-500 text-white flex items-center justify-center text-[10px] font-bold"
                    title="Decrease radius by 0.1 cm"
                >
                    -
                </button>
                <span
                    onPointerDown={handleRadiusPointerDown}
                    className="text-[10.5px] font-mono font-bold text-cyan-200 cursor-ew-resize select-none"
                    title="Drag or click +/- to adjust radius (0.1 cm)"
                >
                    r = {radiusCm.toFixed(1)} cm
                </span>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setRadiusCm(r => +(Math.min(15.0, r + 0.1)).toFixed(1));
                    }}
                    className="w-4 h-4 rounded-full bg-white/10 hover:bg-cyan-500 text-white flex items-center justify-center text-[10px] font-bold"
                    title="Increase radius by 0.1 cm"
                >
                    +
                </button>
                <span className="text-[9px] text-white/40">|</span>
                <span className="text-[10px] font-mono text-purple-200">
                    {angle.toFixed(0)}°
                </span>
            </div>

            {/* ─── Floating Top Control HUD: Icon-Only Draw Circle & Dismiss ─── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${hinge.x}px`,
                    top: `${hinge.y - 28}px`,
                    transform: 'translate(-50%, -100%)',
                    pointerEvents: 'auto'
                }}
                className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full px-2 py-1 shadow-2xl"
            >
                {/* Real-time Angle Display */}
                <span className="text-[10px] font-mono text-slate-300 px-1">
                    {angle.toFixed(0)}°
                </span>

                <div className="w-px h-3 bg-slate-700" />

                {/* Draw Full Circle (Icon Only with Tooltip) */}
                <button
                    type="button"
                    onClick={handleDrawFullCircle}
                    className="w-6 h-6 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shadow transition active:scale-95"
                    title="Draw Circle"
                >
                    <CircleIcon className="w-3.5 h-3.5" />
                </button>

                {/* Close Compass */}
                <button
                    type="button"
                    onClick={onClose}
                    className="w-6 h-6 rounded-full bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition"
                    title="Close Compass"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
