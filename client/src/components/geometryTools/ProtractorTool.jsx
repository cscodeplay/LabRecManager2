'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
    RotateCw,
    X,
    Check,
    Pencil
} from 'lucide-react';
import {
    PX_PER_CM,
    snapAngleDeg,
    degToRad,
    radToDeg,
    describeArc,
    screenToCanvasCoords
} from './geometryMath';

export default function ProtractorTool({
    initialX = 350,
    initialY = 320,
    initialRadiusCm = 8.5,
    initialAngle = 0, // Protractor base rotation
    initialMeasureAngle = 45, // Angle measured relative to base
    scale = 1,
    onDrawAngle,
    onDrawLine,
    onClose,
    onStateChange
}) {
    // Vertex position (center origin of protractor) in pure Canvas Coordinates
    const [vertex, setVertex] = useState({ x: initialX, y: initialY });
    const [radiusCm, setRadiusCm] = useState(initialRadiusCm);
    const [baseRotation, setBaseRotation] = useState(initialAngle);
    const [measureAngle, setMeasureAngle] = useState(initialMeasureAngle);

    const radiusPx = radiusCm * PX_PER_CM;

    // Report physical boundary for outer edge pen guidance
    React.useEffect(() => {
        if (onStateChange) {
            onStateChange({
                type: 'protractor',
                centerX: vertex.x,
                centerY: vertex.y,
                radiusPx,
                baseRotation
            });
        }
    }, [onStateChange, vertex.x, vertex.y, radiusPx, baseRotation]);

    // Body drag ref (repositioning protractor)
    const isDraggingBodyRef = useRef(false);
    const dragStartRef = useRef({ canvasStartX: 0, canvasStartY: 0, initialVx: 0, initialVy: 0 });

    // Base rotation drag ref
    const isRotatingBaseRef = useRef(false);
    const baseRotateOffsetRef = useRef(0);

    // Measuring arm drag ref
    const isDraggingArmRef = useRef(false);

    // ─── 1. Reposition Protractor (Draggable from anywhere on acrylic surface) ───
    const handleBodyPointerDown = (e) => {
        if (e.target.closest('button') || e.target.closest('[data-handle="true"]')) return;
        e.stopPropagation();
        e.preventDefault();
        isDraggingBodyRef.current = true;

        const coords = screenToCanvasCoords(e.clientX, e.clientY);
        dragStartRef.current = {
            canvasStartX: coords.x,
            canvasStartY: coords.y,
            initialVx: vertex.x,
            initialVy: vertex.y
        };

        const onPointerMove = (moveEvt) => {
            if (!isDraggingBodyRef.current) return;
            const curCoords = screenToCanvasCoords(moveEvt.clientX, moveEvt.clientY);
            const dx = curCoords.x - dragStartRef.current.canvasStartX;
            const dy = curCoords.y - dragStartRef.current.canvasStartY;
            setVertex({
                x: Math.round(dragStartRef.current.initialVx + dx),
                y: Math.round(dragStartRef.current.initialVy + dy)
            });
        };

        const onPointerUp = () => {
            isDraggingBodyRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // ─── 2. Rotate Protractor Base ───
    const handleRotateBasePointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        isRotatingBaseRef.current = true;

        const coords = screenToCanvasCoords(e.clientX, e.clientY);
        const startRad = Math.atan2(coords.y - vertex.y, coords.x - vertex.x);
        let startDeg = (startRad * 180) / Math.PI;
        if (startDeg < 0) startDeg += 360;

        let offset = startDeg - baseRotation;
        if (offset < 0) offset += 360;
        baseRotateOffsetRef.current = offset;

        const onPointerMove = (moveEvt) => {
            if (!isRotatingBaseRef.current) return;
            const curCoords = screenToCanvasCoords(moveEvt.clientX, moveEvt.clientY);
            const curRad = Math.atan2(curCoords.y - vertex.y, curCoords.x - vertex.x);
            let curDeg = (curRad * 180) / Math.PI;
            if (curDeg < 0) curDeg += 360;

            let newAngle = curDeg - baseRotateOffsetRef.current;
            if (newAngle < 0) newAngle += 360;

            const snapped = snapAngleDeg(newAngle, moveEvt.shiftKey ? 15 : 2, moveEvt.shiftKey);
            setBaseRotation(snapped);
        };

        const onPointerUp = () => {
            isRotatingBaseRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // ─── 3. Drag Angle Measuring Arm ───
    const handleArmPointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        isDraggingArmRef.current = true;

        const onPointerMove = (moveEvt) => {
            if (!isDraggingArmRef.current) return;
            const curCoords = screenToCanvasCoords(moveEvt.clientX, moveEvt.clientY);

            // Compute angle in unrotated protractor local coordinates:
            // Semicircle extends upwards (y <= 0), baseline is along x-axis from right (+R) to left (-R)
            const dx = curCoords.x - vertex.x;
            const dy = curCoords.y - vertex.y;

            // Un-rotate by baseRotation
            const baseRad = degToRad(-baseRotation);
            const localX = dx * Math.cos(baseRad) - dy * Math.sin(baseRad);
            const localY = dx * Math.sin(baseRad) + dy * Math.cos(baseRad);

            // In protractor coordinates: baseline right is 0°, top is 90° (localY < 0), left is 180°
            // Standard atan2(-localY, localX) gives angle in [0, 180] when localY <= 0
            const rad = Math.atan2(-localY, localX);
            let deg = (rad * 180) / Math.PI;
            if (deg < 0) deg = 0;
            if (deg > 180) deg = 180;

            const snapped = snapAngleDeg(deg, moveEvt.shiftKey ? 15 : 1, moveEvt.shiftKey);
            setMeasureAngle(Math.min(180, Math.max(0, snapped)));
        };

        const onPointerUp = () => {
            isDraggingArmRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // ─── 4. Stamp Measured Angle onto Whiteboard ───
    const handleDrawAngleToCanvas = useCallback(() => {
        if (!onDrawAngle) return;
        // In local coordinates: baseline is at 0° (right), arm is at measureAngle (upwards counter-clockwise)
        const forwardBaseRad = degToRad(baseRotation);
        const forwardArmRad = degToRad(baseRotation - measureAngle); // negative because SVG Y is down

        const baseEndX = vertex.x + radiusPx * Math.cos(forwardBaseRad);
        const baseEndY = vertex.y + radiusPx * Math.sin(forwardBaseRad);

        const armEndX = vertex.x + radiusPx * Math.cos(forwardArmRad);
        const armEndY = vertex.y + radiusPx * Math.sin(forwardArmRad);

        onDrawAngle({
            vertexX: Math.round(vertex.x),
            vertexY: Math.round(vertex.y),
            baseEndX: Math.round(baseEndX),
            baseEndY: Math.round(baseEndY),
            armEndX: Math.round(armEndX),
            armEndY: Math.round(armEndY),
            angleDeg: measureAngle,
            baseRotationDeg: baseRotation,
            radiusPx
        });
    }, [onDrawAngle, vertex, radiusPx, baseRotation, measureAngle]);

    // ─── 5. Draw Baseline Along Protractor Diameter ───
    const handleDrawBaseline = useCallback(() => {
        if (!onDrawLine) return;
        const forwardBaseRad = degToRad(baseRotation);
        const cos = Math.cos(forwardBaseRad);
        const sin = Math.sin(forwardBaseRad);
        const startX = vertex.x - radiusPx * cos;
        const startY = vertex.y - radiusPx * sin;
        const endX = vertex.x + radiusPx * cos;
        const endY = vertex.y + radiusPx * sin;

        onDrawLine({
            startX: Math.round(startX),
            startY: Math.round(startY),
            endX: Math.round(endX),
            endY: Math.round(endY),
            lengthPx: radiusPx * 2,
            lengthCm: radiusCm * 2,
            angleDeg: baseRotation
        });
    }, [onDrawLine, vertex, radiusPx, radiusCm, baseRotation]);

    // Local coordinates of measuring arm tip
    const armRad = degToRad(measureAngle);
    const armLocalX = radiusPx * Math.cos(armRad);
    const armLocalY = -radiusPx * Math.sin(armRad); // Upwards

    return (
        <div className="absolute inset-0 pointer-events-none select-none z-[66]">
            {/* SVG Transparent Acrylic Semicircular Protractor */}
            <svg
                style={{
                    position: 'absolute',
                    left: `${vertex.x}px`,
                    top: `${vertex.y}px`,
                    overflow: 'visible',
                    transform: `rotate(${baseRotation}deg)`,
                    transformOrigin: '0 0'
                }}
                className="pointer-events-none"
            >
                <defs>
                    <filter id="protractorShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.25" />
                    </filter>
                </defs>

                {/* ─── Semi-Transparent Acrylic Semicircular Body (Upwards Semicircle) ─── */}
                <path
                    d={`
                        M -${radiusPx} 0 
                        A ${radiusPx} ${radiusPx} 0 0 1 ${radiusPx} 0 
                        Z
                    `}
                    fill="rgba(255, 255, 255, 0.22)"
                    stroke="#475569"
                    strokeWidth="1.2"
                    filter="url(#protractorShadow)"
                    className="cursor-grab active:cursor-grabbing pointer-events-auto transition hover:fill-white/30 backdrop-blur-[2px]"
                    onPointerDown={handleBodyPointerDown}
                />

                {/* Center Semicircular Cutout Notch (Transparent view to vertex on whiteboard) */}
                <path
                    d={`
                        M -${radiusPx * 0.28} 0 
                        A ${radiusPx * 0.28} ${radiusPx * 0.28} 0 0 1 ${radiusPx * 0.28} 0 
                        Z
                    `}
                    fill="rgba(255, 255, 255, 0.45)"
                    stroke="#64748b"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                />

                {/* Baseline & Crosshair Origin */}
                <line
                    x1={-radiusPx}
                    y1={0}
                    x2={radiusPx}
                    y2={0}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                />
                {/* Vertical Center 90° Guideline */}
                <line
                    x1={0}
                    y1={0}
                    x2={0}
                    y2={-radiusPx}
                    stroke="#0f172a"
                    strokeWidth="0.8"
                    strokeDasharray="3 3"
                    opacity="0.6"
                />
                {/* Vertex Origin Circle */}
                <circle cx={0} cy={0} r={4} fill="#0f172a" />
                <circle cx={0} cy={0} r={1.5} fill="#ffffff" />

                {/* ─── Clear Black Graduations: Outer Scale & Inner Scale ─── */}
                {Array.from({ length: 181 }).map((_, deg) => {
                    const isTen = deg % 10 === 0;
                    const isFive = deg % 5 === 0 && !isTen;
                    if (!isTen && !isFive && deg % 2 !== 0 && radiusCm < 8) return null;

                    const rad = degToRad(deg);
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);

                    // Outer Rim Graduations (Ticks extending inward from outer arc)
                    const tickLen = isTen ? 14 : (isFive ? 9 : 5);
                    const x1 = (radiusPx - tickLen) * cos;
                    const y1 = -(radiusPx - tickLen) * sin;
                    const x2 = radiusPx * cos;
                    const y2 = -radiusPx * sin;

                    // Outer scale number position (0° on right to 180° on left)
                    const outerLabelR = radiusPx - 21;
                    const olx = outerLabelR * cos;
                    const oly = -outerLabelR * sin;

                    // Inner scale number position (180° on right to 0° on left)
                    const innerLabelR = radiusPx - 34;
                    const ilx = innerLabelR * cos;
                    const ily = -innerLabelR * sin;

                    // Upright text rotation angle to keep numbers readable
                    // Normal radial angle is (90 - deg)
                    const textRot = 90 - deg;

                    return (
                        <g key={`deg-${deg}`}>
                            {/* Graduation Tick */}
                            <line
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke="#0f172a"
                                strokeWidth={isTen ? 1.4 : (isFive ? 1 : 0.65)}
                                opacity={isTen ? 1 : 0.8}
                            />

                            {/* Outer Scale Labels (0° to 180° counter-clockwise) */}
                            {isTen && (
                                <text
                                    x={olx}
                                    y={oly}
                                    fill="#0f172a"
                                    fontSize="8"
                                    fontFamily="sans-serif"
                                    fontWeight="700"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    transform={`rotate(${textRot}, ${olx}, ${oly})`}
                                >
                                    {deg}
                                </text>
                            )}

                            {/* Inner Scale Labels (180° to 0° clockwise) */}
                            {isTen && (
                                <text
                                    x={ilx}
                                    y={ily}
                                    fill="#334155"
                                    fontSize="7"
                                    fontFamily="sans-serif"
                                    fontWeight="600"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    transform={`rotate(${textRot}, ${ilx}, ${ily})`}
                                >
                                    {180 - deg}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* ─── Measured Angle Wedge Arc & Hairline Arm ─── */}
                {measureAngle > 1 && (
                    <path
                        d={`
                            M ${radiusPx * 0.38} 0 
                            A ${radiusPx * 0.38} ${radiusPx * 0.38} 0 0 0 
                            ${radiusPx * 0.38 * Math.cos(degToRad(measureAngle))} 
                            ${-radiusPx * 0.38 * Math.sin(degToRad(measureAngle))}
                        `}
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="2.5"
                    />
                )}

                {/* Measuring Hairline Arm */}
                <line
                    x1={0}
                    y1={0}
                    x2={armLocalX}
                    y2={armLocalY}
                    stroke="#0284c7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    filter="url(#protractorShadow)"
                />
            </svg>

            {/* ─── Control 1: Angle Measuring Arm Handle (Draggable along rim) ─── */}
            {(() => {
                // Position of measuring handle in canvas coordinates
                const forwardBaseRad = degToRad(baseRotation);
                const forwardArmRad = degToRad(baseRotation - measureAngle);
                const hx = vertex.x + (radiusPx + 10) * Math.cos(forwardArmRad);
                const hy = vertex.y + (radiusPx + 10) * Math.sin(forwardArmRad);

                return (
                    <div
                        data-handle="true"
                        style={{
                            position: 'absolute',
                            left: `${hx}px`,
                            top: `${hy}px`,
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'auto'
                        }}
                        onPointerDown={handleArmPointerDown}
                        className="w-5 h-5 rounded-full bg-slate-900 border border-cyan-400 shadow-md flex items-center justify-center cursor-crosshair hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 transition hover:scale-110"
                        title="Drag along rim to measure or draw angle"
                    >
                        <span className="text-[7.5px] font-mono font-bold leading-none">
                            {measureAngle.toFixed(0)}°
                        </span>
                    </div>
                );
            })()}

            {/* ─── Control 2: Protractor Base Rotation Handle ─── */}
            {(() => {
                // Handle at the top of the protractor semicircle (at local 90°, upwards)
                const rotRad = degToRad(baseRotation - 90);
                const bx = vertex.x + (radiusPx + 12) * Math.cos(rotRad);
                const by = vertex.y + (radiusPx + 12) * Math.sin(rotRad);

                return (
                    <div
                        data-handle="true"
                        style={{
                            position: 'absolute',
                            left: `${bx}px`,
                            top: `${by}px`,
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'auto'
                        }}
                        onPointerDown={handleRotateBasePointerDown}
                        className="w-5 h-5 rounded-full bg-slate-900/95 border border-slate-400 shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-slate-700 text-slate-200 transition hover:scale-110"
                        title="Drag to rotate protractor baseline"
                    >
                        <RotateCw className="w-2.5 h-2.5" />
                    </div>
                );
            })()}

            {/* ─── Floating Top Control HUD: Readout, Draw Angle, Close ─── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${vertex.x}px`,
                    top: `${vertex.y + 24}px`,
                    transform: 'translate(-50%, 0)',
                    pointerEvents: 'auto'
                }}
                className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full px-3 py-1 shadow-2xl"
            >
                {/* Real-time Angle Readout */}
                <div className="flex items-center gap-1 font-mono font-bold text-xs">
                    <span className="text-cyan-300">{measureAngle.toFixed(1)}°</span>
                    <span className="text-slate-500 font-normal">|</span>
                    <span className="text-amber-300 font-normal">{baseRotation.toFixed(0)}° tilt</span>
                </div>

                <div className="w-px h-3 bg-slate-700" />

                {/* Draw Angle onto Canvas */}
                <button
                    type="button"
                    onClick={handleDrawAngleToCanvas}
                    className="flex items-center gap-1 px-2.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] rounded-full shadow transition active:scale-95"
                    title="Stamp measured rays and angle arc onto canvas"
                >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    <span>Draw Angle</span>
                </button>

                {/* Draw Baseline Straight Line */}
                {onDrawLine && (
                    <button
                        type="button"
                        onClick={handleDrawBaseline}
                        className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white font-bold text-[10px] rounded-full border border-slate-700 shadow transition active:scale-95"
                        title="Draw straight baseline along protractor edge"
                    >
                        <Pencil className="w-2.5 h-2.5" />
                        <span>Baseline</span>
                    </button>
                )}

                {/* Close Protractor */}
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded-full bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white transition"
                    title="Close Protractor"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
