'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
    RotateCw,
    X,
    Circle as CircleIcon,
    Pencil as PencilIcon,
    Minus,
    Plus,
    PenTool,
    MoveHorizontal
} from 'lucide-react';
import {
    PX_PER_CM,
    snapAngleDeg,
    degToRad,
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
    // Strict bounds: Min 1.0 cm, Max 14.0 cm
    const [radiusCm, setRadiusCm] = useState(Math.min(14.0, Math.max(1.0, initialRadiusCm)));
    const [angle, setAngle] = useState(initialAngle); // Angle of pencil relative to center

    // Arc sweep drawing state
    const [isSweepingArc, setIsSweepingArc] = useState(false);
    const [arcStartAngle, setArcStartAngle] = useState(0);
    const [arcSweepDeg, setArcSweepDeg] = useState(0);

    // Dynamic arm length adjusting slightly with radius for realistic proportions
    const ARM_LENGTH = Math.max(140, Math.min(220, 160 + radiusCm * 4));

    const radiusPx = radiusCm * PX_PER_CM;

    // Report compass boundary for pen clamping
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

    // ─── 2. Adjust Compass Radius (Continuous Scaling from 0 to Maximum) ───
    const handleRadiusPointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        isResizingRadiusRef.current = true;

        const onPointerMove = (moveEvt) => {
            if (!isResizingRadiusRef.current) return;
            const coords = screenToCanvasCoords(moveEvt.clientX, moveEvt.clientY);
            const distPx = Math.hypot(coords.x - center.x, coords.y - center.y);

            // Continuous scaling from 0.2 cm to 18.0 cm (maximum reach)
            const minPx = PX_PER_CM * 0.2;
            const maxPx = PX_PER_CM * 18.0;
            const clampedPx = Math.max(minPx, Math.min(maxPx, distPx));
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

    // ─── 3. Rotate Compass & Sweep Arcs (Dual Mechanics) ───
    // When sweepMode === false (Top handle): reorients WITHOUT drawing
    // When sweepMode === true (Pen icon / tip): reorients AND draws ink stroke
    const handleRotationPointerDown = (e, sweepMode = false) => {
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

    // ─── 4. Draw Full Circle Action ───
    const handleDrawFullCircle = useCallback(() => {
        if (!onDrawCircle || isAnimatingCircleRef.current) return;
        isAnimatingCircleRef.current = true;
        setIsSweepingArc(true);

        const initialPencilAngle = angle;
        setArcStartAngle(initialPencilAngle);
        setArcSweepDeg(0);

        const duration = 600; // ms for full 360 sweep
        const startTime = performance.now();

        const animateCircleSweep = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(1, elapsed / duration);
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

    // Mathematically exact apex hinge position ensuring constant arm lengths
    const hinge = calculateHingePoint(center, pencilTip, ARM_LENGTH, false);

    // Spindle / top rotating handle extends past the hinge along the hinge bisector
    const bisectorDx = hinge.x - (center.x + pencilTip.x) / 2;
    const bisectorDy = hinge.y - (center.y + pencilTip.y) / 2;
    const bisectorLen = Math.hypot(bisectorDx, bisectorDy) || 1;
    const spindleTop = {
        x: hinge.x + (bisectorDx / bisectorLen) * 36,
        y: hinge.y + (bisectorDy / bisectorLen) * 36
    };

    // Pen icon position offset slightly outward from pencil tip for optimal clicking
    const legDx = pencilTip.x - hinge.x;
    const legDy = pencilTip.y - hinge.y;
    const legLen = Math.hypot(legDx, legDy) || 1;
    const legUx = legDx / legLen;
    const legUy = legDy / legLen;
    const perpX = -legUy * 20;
    const perpY = legUx * 20;
    const penBadgePos = {
        x: pencilTip.x + perpX,
        y: pencilTip.y + perpY
    };

    // Mid-Height position for radius badge
    const midX = (hinge.x + (center.x + pencilTip.x) / 2) / 2;
    const midY = (hinge.y + (center.y + pencilTip.y) / 2) / 2;

    return (
        <div data-geometry-tool="true" className="geometry-instrument absolute inset-0 pointer-events-none select-none z-[75]">
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

                    {/* Sharpened Pine Wood Cone Gradient */}
                    <linearGradient id="pencilPineConeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="60%" stopColor="#fde047" />
                        <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>

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

                {/* Sweeping Arc Preview while dragging pen */}
                {isSweepingArc && arcSweepDeg > 2 && (
                    <path
                        d={describeArc(center.x, center.y, radiusPx, arcStartAngle, (arcStartAngle + arcSweepDeg) % 360)}
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    />
                )}

                {/* ─── Compass Arm 1: Needle Leg ─── */}
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

                {/* Sharp Steel Needle Point Taper */}
                <line
                    x1={center.x + (hinge.x - center.x) * 0.16}
                    y1={center.y + (hinge.y - center.y) * 0.16}
                    x2={center.x}
                    y2={center.y}
                    stroke="#f8fafc"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />
                <circle cx={center.x} cy={center.y} r="2" fill="#0284c7" />

                {/* ─── Compass Arm 2: Pencil Leg ─── */}
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

                {/* Classroom Pencil Clamped to Arm 2 */}
                {(() => {
                    const collarX = pencilTip.x - legUx * 26;
                    const collarY = pencilTip.y - legUy * 26;
                    const pencilTopX = pencilTip.x - legUx * 58;
                    const pencilTopY = pencilTip.y - legUy * 58;
                    const pPerpX = -legUy * 4.5;
                    const pPerpY = legUx * 4.5;

                    return (
                        <g filter="url(#compassDropShadow)">
                            {/* Pencil Shaft Stripes */}
                            <line
                                x1={pencilTopX + pPerpX * 0.9}
                                y1={pencilTopY + pPerpY * 0.9}
                                x2={collarX + pPerpX * 0.9}
                                y2={collarY + pPerpY * 0.9}
                                stroke="#09090b"
                                strokeWidth="2.5"
                            />
                            <line
                                x1={pencilTopX}
                                y1={pencilTopY}
                                x2={collarX}
                                y2={collarY}
                                stroke="#dc2626"
                                strokeWidth="3.2"
                            />
                            <line
                                x1={pencilTopX - pPerpX * 0.9}
                                y1={pencilTopY - pPerpY * 0.9}
                                x2={collarX - pPerpX * 0.9}
                                y2={collarY - pPerpY * 0.9}
                                stroke="#09090b"
                                strokeWidth="2.5"
                            />

                            {/* Sharpened Pine Wood Cone */}
                            <polygon
                                points={`
                                    ${collarX + pPerpX * 1.1},${collarY + pPerpY * 1.1} 
                                    ${collarX - pPerpX * 1.1},${collarY - pPerpY * 1.1} 
                                    ${pencilTip.x},${pencilTip.y}
                                `}
                                fill="url(#pencilPineConeGrad)"
                                stroke="#d97706"
                                strokeWidth="0.4"
                            />

                            {/* Graphite Lead Tip */}
                            <polygon
                                points={`
                                    ${pencilTip.x - legUx * 7 + pPerpX * 0.35},${pencilTip.y - legUy * 7 + pPerpY * 0.35} 
                                    ${pencilTip.x - legUx * 7 - pPerpX * 0.35},${pencilTip.y - legUy * 7 - pPerpY * 0.35} 
                                    ${pencilTip.x},${pencilTip.y}
                                `}
                                fill="#0f172a"
                            />

                            {/* Metal Clamp Collar */}
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
                    r="6.5"
                    fill="#1e293b"
                    stroke="#38bdf8"
                    strokeWidth="1.8"
                />

                {/* Connector line to Pen Badge */}
                <line
                    x1={pencilTip.x}
                    y1={pencilTip.y}
                    x2={penBadgePos.x}
                    y2={penBadgePos.y}
                    stroke="#0284c7"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.6"
                />
            </svg>

            {/* ─── Control 1: Distinct Sharp Needle Pivot (Clearly Visible Pivot Point) ─── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${center.x}px`,
                    top: `${center.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handleNeedlePointerDown}
                className="w-7 h-7 rounded-full cursor-grab active:cursor-grabbing hover:bg-cyan-500/20 hover:ring-2 hover:ring-cyan-400 transition flex items-center justify-center group"
                title="Needle Pivot — Drag to reposition compass center without changing radius or angle"
            >
                {/* High contrast center needle indicator */}
                <div className="w-3 h-3 rounded-full bg-slate-950 border-2 border-cyan-400 shadow-md flex items-center justify-center group-hover:scale-125 transition-transform">
                    <div className="w-1 h-1 rounded-full bg-white" />
                </div>
            </div>

            {/* ─── Control 2: Rotating Spindle Handle (ROTATES WITHOUT DRAWING) ─── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${spindleTop.x}px`,
                    top: `${spindleTop.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={(e) => handleRotationPointerDown(e, false)}
                className="w-8 h-8 rounded-full cursor-grab active:cursor-grabbing hover:bg-sky-500/30 hover:ring-2 hover:ring-sky-400 transition flex items-center justify-center group"
                title="Rotating Spindle Handle — Drag to reorient compass orientation without drawing"
            >
                <div className="w-5 h-5 rounded-full bg-slate-900 border-2 border-sky-400 shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform text-sky-300">
                    <RotateCw className="w-2.5 h-2.5" />
                </div>
            </div>

            {/* ─── Control 3: Dedicated PEN ICON Alongside Compass (DRAWS INK STROKE) ─── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${penBadgePos.x}px`,
                    top: `${penBadgePos.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={(e) => handleRotationPointerDown(e, true)}
                className="px-2 py-1 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white shadow-xl cursor-crosshair active:scale-95 transition flex items-center gap-1 ring-2 ring-cyan-300 pointer-events-auto"
                title="Pen Tool — Hold & drag to draw arc/circle stroke onto whiteboard canvas"
            >
                <PenTool className="w-3.5 h-3.5 animate-pulse" />
                <span className="text-[9.5px] font-bold tracking-tight">Draw</span>
            </div>

            {/* Lead tip direct sweep grab handle */}
            <div
                style={{
                    position: 'absolute',
                    left: `${pencilTip.x}px`,
                    top: `${pencilTip.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={(e) => handleRotationPointerDown(e, true)}
                className="w-5 h-5 rounded-full cursor-crosshair hover:bg-cyan-400/30 transition flex items-center justify-center"
                title="Hold & drag pencil tip to draw arc/circle stroke"
            >
                <div className="w-2 h-2 rounded-full bg-slate-950 border border-cyan-400" />
            </div>

            {/* ─── Control 4: Double-Headed Arrow Scaling Handle along Pencil Hand (Continuous Scaling from 0 to Maximum) ─── */}
            <div
                data-handle="true"
                style={{
                    position: 'absolute',
                    left: `${(hinge.x + pencilTip.x) / 2}px`,
                    top: `${(hinge.y + pencilTip.y) / 2}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handleRadiusPointerDown}
                className="px-2 py-0.5 rounded-full bg-slate-900 border-2 border-cyan-400 shadow-xl flex items-center gap-1 cursor-ew-resize hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 transition group/scaler"
                title="Continuous Radius Scaling — Drag along arm to continuously adjust compass radius from 0 to maximum"
            >
                <MoveHorizontal className="w-3.5 h-3.5 group-hover/scaler:scale-110 transition-transform" />
                <span className="text-[9.5px] font-mono font-bold">{radiusCm.toFixed(1)} cm</span>
            </div>

            {/* ─── Control 5: Radius Steppers & Angle Readout Badge (Mid-Height) ─── */}
            <div
                data-handle="true"
                style={{
                    position: 'absolute',
                    left: `${midX}px`,
                    top: `${midY}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                className="px-2 py-0.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-md flex items-center gap-1 text-white text-[10.5px] font-mono"
            >
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setRadiusCm(r => +(Math.max(1.0, r - 0.5)).toFixed(1));
                    }}
                    className="w-4 h-4 rounded-full bg-slate-800 hover:bg-cyan-500 text-slate-300 hover:text-slate-950 flex items-center justify-center transition"
                    title="Decrease radius (-0.5 cm, min 1.0 cm)"
                >
                    <Minus className="w-2.5 h-2.5" />
                </button>

                <span
                    onPointerDown={handleRadiusPointerDown}
                    className="text-[10px] font-mono font-bold text-cyan-300 cursor-ew-resize select-none px-0.5"
                    title="Drag to resize radius (bounded 1.0 cm to 14.0 cm)"
                >
                    r = {radiusCm.toFixed(1)} cm
                </span>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setRadiusCm(r => +(Math.min(14.0, r + 0.5)).toFixed(1));
                    }}
                    className="w-4 h-4 rounded-full bg-slate-800 hover:bg-cyan-500 text-slate-300 hover:text-slate-950 flex items-center justify-center transition"
                    title="Increase radius (+0.5 cm, max 14.0 cm)"
                >
                    <Plus className="w-2.5 h-2.5" />
                </button>

                <span className="text-[9px] text-slate-600">|</span>
                <span className="text-[10px] font-mono font-bold text-amber-300">
                    {angle.toFixed(0)}°
                </span>
            </div>

            {/* ─── Control 5: Floating Top Control HUD (All Icon-Only with Tooltips) ─── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${hinge.x}px`,
                    top: `${hinge.y - 28}px`,
                    transform: 'translate(-50%, -100%)',
                    pointerEvents: 'auto'
                }}
                className="flex items-center gap-1 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full px-2 py-0.5 shadow-2xl h-7"
            >
                {/* Draw Full Circle (Icon Only with Tooltip) */}
                <button
                    type="button"
                    onClick={handleDrawFullCircle}
                    className="w-6 h-6 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shadow transition active:scale-95"
                    title="Draw Full Circle (360°)"
                >
                    <CircleIcon className="w-3.5 h-3.5" />
                </button>

                {/* Close Compass (Icon Only with Tooltip) */}
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
