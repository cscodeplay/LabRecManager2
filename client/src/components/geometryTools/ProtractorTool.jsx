'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
    RotateCw,
    X,
    Check,
    Move,
    Maximize2,
    Compass
} from 'lucide-react';
import {
    PX_PER_CM,
    snapAngleDeg,
    degToRad,
    describeArc
} from './geometryMath';

export default function ProtractorTool({
    initialX = 350,
    initialY = 320,
    initialRadiusCm = 9,
    initialAngle = 0, // Protractor base rotation
    initialMeasureAngle = 45, // Arm angle relative to base
    scale = 1,
    onDrawAngle,
    onClose
}) {
    // Vertex position (center origin of protractor)
    const [vertex, setVertex] = useState({ x: initialX, y: initialY });
    const [radiusCm, setRadiusCm] = useState(initialRadiusCm);
    const [baseRotation, setBaseRotation] = useState(initialAngle); // Protractor body tilt
    const [measureAngle, setMeasureAngle] = useState(initialMeasureAngle); // Angle measured (0° to 180°)
    const [is360Mode, setIs360Mode] = useState(false);

    const radiusPx = radiusCm * PX_PER_CM;

    // Protractor body drag
    const isDraggingBodyRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, initialVx: 0, initialVy: 0 });

    // Protractor base rotation drag
    const isRotatingBaseRef = useRef(false);

    // Angle measurement arm drag
    const isDraggingArmRef = useRef(false);

    // Reposition Protractor (Vertex Drag)
    const handleBodyPointerDown = (e) => {
        if (e.target.closest('button') || e.target.closest('[data-handle="true"]')) return;
        e.stopPropagation();
        e.preventDefault();
        isDraggingBodyRef.current = true;
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            initialVx: vertex.x,
            initialVy: vertex.y
        };

        const onPointerMove = (moveEvt) => {
            if (!isDraggingBodyRef.current) return;
            const dx = (moveEvt.clientX - dragStartRef.current.x) / (scale || 1);
            const dy = (moveEvt.clientY - dragStartRef.current.y) / (scale || 1);
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

    // Rotate Base of Protractor
    const handleRotateBasePointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        isRotatingBaseRef.current = true;

        const onPointerMove = (moveEvt) => {
            if (!isRotatingBaseRef.current) return;
            const rad = Math.atan2(
                (moveEvt.clientY - vertex.y) / (scale || 1),
                (moveEvt.clientX - vertex.x) / (scale || 1)
            );
            let deg = (rad * 180) / Math.PI;
            if (deg < 0) deg += 360;
            const snapped = snapAngleDeg(deg, moveEvt.shiftKey ? 15 : 2, moveEvt.shiftKey);
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

    // Drag Measuring Arm to set/measure angle
    const handleArmPointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        isDraggingArmRef.current = true;

        const onPointerMove = (moveEvt) => {
            if (!isDraggingArmRef.current) return;
            const rad = Math.atan2(
                (moveEvt.clientY - vertex.y) / (scale || 1),
                (moveEvt.clientX - vertex.x) / (scale || 1)
            );
            let deg = (rad * 180) / Math.PI;
            if (deg < 0) deg += 360;

            // Relative to base rotation (counter-clockwise or standard angle)
            let relativeDeg = deg - baseRotation;
            if (relativeDeg < 0) relativeDeg += 360;

            const maxAngle = is360Mode ? 360 : 180;
            const clamped = Math.min(maxAngle, Math.max(0, relativeDeg));
            const snapped = snapAngleDeg(clamped, moveEvt.shiftKey ? 15 : 1, moveEvt.shiftKey);
            setMeasureAngle(Math.min(maxAngle, Math.max(0, snapped)));
        };

        const onPointerUp = () => {
            isDraggingArmRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // Draw Measured Angle / Rays onto Canvas
    const handleDrawAngleToCanvas = useCallback(() => {
        if (!onDrawAngle) return;
        const baseRad = degToRad(baseRotation);
        const armRad = degToRad(baseRotation + measureAngle);

        const baseEndX = vertex.x + radiusPx * Math.cos(baseRad);
        const baseEndY = vertex.y + radiusPx * Math.sin(baseRad);

        const armEndX = vertex.x + radiusPx * Math.cos(armRad);
        const armEndY = vertex.y + radiusPx * Math.sin(armRad);

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

    // Arm endpoint coordinates
    const armRad = degToRad(baseRotation + measureAngle);
    const armTipX = vertex.x + radiusPx * Math.cos(armRad);
    const armTipY = vertex.y + radiusPx * Math.sin(armRad);

    // Graduation ticks calculation (0° to 180°)
    const maxDegree = is360Mode ? 360 : 180;

    return (
        <div className="absolute inset-0 pointer-events-none select-none z-[66]">
            {/* SVG Acrylic Protractor Semi-Circle / Full Circle */}
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
                    <radialGradient id="protractorAcrylic" cx="0%" cy="0%" r="100%">
                        <stop offset="0%" stopColor="#0f172a" stopOpacity="0.88" />
                        <stop offset="70%" stopColor="#082f49" stopOpacity="0.82" />
                        <stop offset="100%" stopColor="#0284c7" stopOpacity="0.75" />
                    </radialGradient>
                </defs>

                {/* Frosted Acrylic Semicircular Body (pointer-events-auto for repositioning) */}
                <path
                    d={
                        is360Mode
                            ? `M 0 0 m -${radiusPx}, 0 a ${radiusPx},${radiusPx} 0 1,0 ${radiusPx * 2},0 a ${radiusPx},${radiusPx} 0 1,0 -${radiusPx * 2},0`
                            : `M -${radiusPx} 0 A ${radiusPx} ${radiusPx} 0 0 1 ${radiusPx} 0 Z`
                    }
                    fill="url(#protractorAcrylic)"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    className="cursor-grab active:cursor-grabbing pointer-events-auto transition hover:stroke-cyan-300"
                    onPointerDown={handleBodyPointerDown}
                    style={{
                        filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.5))'
                    }}
                />

                {/* Base Baseline Line */}
                <line
                    x1={-radiusPx}
                    y1={0}
                    x2={radiusPx}
                    y2={0}
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                />

                {/* Degree Graduations (Ticks and Labels) */}
                {Array.from({ length: maxDegree + 1 }).map((_, deg) => {
                    const isTen = deg % 10 === 0;
                    const isFive = deg % 5 === 0 && !isTen;
                    if (!isTen && !isFive && deg % 2 !== 0 && radiusCm < 8) return null; // reduce clutter on smaller radius

                    const tickLen = isTen ? 14 : (isFive ? 9 : 5);
                    const rad = degToRad(deg);
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);

                    const x1 = (radiusPx - tickLen) * cos;
                    const y1 = (radiusPx - tickLen) * sin;
                    const x2 = radiusPx * cos;
                    const y2 = radiusPx * sin;

                    // Label pos for 10-degree increments
                    const labelR = radiusPx - tickLen - 12;
                    const lx = labelR * cos;
                    const ly = labelR * sin;

                    return (
                        <g key={`tick-${deg}`}>
                            <line
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke={isTen ? '#38bdf8' : (isFive ? '#7dd3fc' : '#bae6fd')}
                                strokeWidth={isTen ? 1.5 : (isFive ? 1 : 0.6)}
                                opacity={isTen ? 1 : 0.7}
                            />
                            {isTen && (
                                <text
                                    x={lx}
                                    y={ly + 3}
                                    fill="#f0f9ff"
                                    fontSize="8"
                                    fontFamily="sans-serif"
                                    fontWeight="600"
                                    textAnchor="middle"
                                    transform={`rotate(${deg + 90}, ${lx}, ${ly})`}
                                >
                                    {deg}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Vertex Origin Crosshair */}
                <circle cx={0} cy={0} r={5} fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
                <line x1={-10} y1={0} x2={10} y2={0} stroke="#22d3ee" strokeWidth="1" />
                <line x1={0} y1={-10} x2={0} y2={10} stroke="#22d3ee" strokeWidth="1" />

                {/* Angle Measured Arc Fill & Stroke */}
                {measureAngle > 1 && (
                    <path
                        d={describeArc(0, 0, radiusPx * 0.45, 0, measureAngle)}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        strokeDasharray="none"
                    />
                )}

                {/* Measuring Pointer Arm Line */}
                <line
                    x1={0}
                    y1={0}
                    x2={radiusPx * Math.cos(degToRad(measureAngle))}
                    y2={radiusPx * Math.sin(degToRad(measureAngle))}
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"
                />
            </svg>

            {/* 1. Vertex Point Crosshair Indicator */}
            <div
                style={{
                    position: 'absolute',
                    left: `${vertex.x}px`,
                    top: `${vertex.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handleBodyPointerDown}
                className="w-7 h-7 rounded-full bg-slate-950/90 border-2 border-cyan-400 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition"
                title="Vertex: Drag to reposition Protractor"
            >
                <div className="w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-cyan-500/40" />
            </div>

            {/* 2. Angle Measuring Arm Tip Handle */}
            <div
                data-handle="true"
                style={{
                    position: 'absolute',
                    left: `${armTipX}px`,
                    top: `${armTipY}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handleArmPointerDown}
                className="w-8 h-8 rounded-full bg-amber-500 border-2 border-slate-900 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition group"
                title="Drag arm to set / measure angle (Hold Shift for 15° snap)"
            >
                <div className="w-2.5 h-2.5 rounded-full bg-slate-950" />
            </div>

            {/* 3. Base Rotation Dial Handle */}
            <div
                data-handle="true"
                style={{
                    position: 'absolute',
                    left: `${vertex.x + (radiusPx + 24) * Math.cos(degToRad(baseRotation))}`,
                    top: `${vertex.y + (radiusPx + 24) * Math.sin(degToRad(baseRotation))}`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handleRotateBasePointerDown}
                className="w-7 h-7 rounded-full bg-slate-900 border-2 border-cyan-400 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 transition"
                title="Drag to rotate protractor baseline"
            >
                <RotateCw className="w-3.5 h-3.5" />
            </div>

            {/* 4. Top Action HUD */}
            <div
                style={{
                    position: 'absolute',
                    left: `${vertex.x}px`,
                    top: `${vertex.y - radiusPx - 26}px`,
                    transform: 'translateX(-50%)',
                    pointerEvents: 'auto'
                }}
                className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full px-3 py-1 shadow-2xl flex items-center gap-2"
            >
                {/* Measured Angle Pill */}
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-amber-300">
                    <span>{measureAngle.toFixed(1)}°</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-[10px] text-cyan-300">Base: {baseRotation.toFixed(0)}°</span>
                </div>

                {/* 180° / 360° Mode Toggle */}
                <button
                    type="button"
                    onClick={() => setIs360Mode(!is360Mode)}
                    className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white transition"
                    title="Toggle 180° / 360° protractor"
                >
                    {is360Mode ? '360°' : '180°'}
                </button>

                {/* Draw Angle / Rays onto Canvas */}
                <button
                    type="button"
                    onClick={handleDrawAngleToCanvas}
                    className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-full shadow transition active:scale-95"
                    title="Draw angle rays and arc on whiteboard canvas"
                >
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Draw Angle</span>
                </button>

                {/* Close Button */}
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
