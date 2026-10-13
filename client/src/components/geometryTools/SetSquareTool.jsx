'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
    RotateCw,
    X,
    Check,
    Triangle as TriangleIcon,
    Move,
    Maximize2,
    FlipHorizontal
} from 'lucide-react';
import {
    PX_PER_CM,
    PX_PER_MM,
    snapAngleDeg,
    degToRad
} from './geometryMath';

export default function SetSquareTool({
    initialX = 320,
    initialY = 240,
    initialType = '45', // '45' (45-45-90) or '30_60' (30-60-90)
    initialSizeCm = 14,
    initialAngle = 0,
    scale = 1,
    onDrawPerpendicular,
    onDrawTriangle,
    onClose
}) {
    // Right-angle vertex position (Origin at 90° corner)
    const [pos, setPos] = useState({ x: initialX, y: initialY });
    const [squareType, setSquareType] = useState(initialType);
    const [sizeCm, setSizeCm] = useState(initialSizeCm);
    const [angle, setAngle] = useState(initialAngle);
    const [isFlipped, setIsFlipped] = useState(false);

    // Calculate dimensions in px
    // For 45-45-90: leg1 = leg2 = baseSize
    // For 30-60-90: baseLeg = baseSize, heightLeg = baseSize * Math.tan(60° or 30°)
    const basePx = sizeCm * PX_PER_CM;
    const heightPx = squareType === '45' ? basePx : basePx * Math.tan(degToRad(60));

    // Drag repositioning
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, initialPosX: 0, initialPosY: 0 });

    // Rotation drag
    const isRotatingRef = useRef(false);

    // Reposition Set Square Body
    const handleBodyPointerDown = (e) => {
        if (e.target.closest('button') || e.target.closest('[data-handle="true"]')) return;
        e.stopPropagation();
        e.preventDefault();
        isDraggingRef.current = true;
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            initialPosX: pos.x,
            initialPosY: pos.y
        };

        const onPointerMove = (moveEvt) => {
            if (!isDraggingRef.current) return;
            const dx = (moveEvt.clientX - dragStartRef.current.x) / (scale || 1);
            const dy = (moveEvt.clientY - dragStartRef.current.y) / (scale || 1);
            setPos({
                x: Math.round(dragStartRef.current.initialPosX + dx),
                y: Math.round(dragStartRef.current.initialPosY + dy)
            });
        };

        const onPointerUp = () => {
            isDraggingRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // Rotate Set Square
    const handleRotatePointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        isRotatingRef.current = true;
        const centerX = pos.x + basePx / 3;
        const centerY = pos.y + heightPx / 3;

        const onPointerMove = (moveEvt) => {
            if (!isRotatingRef.current) return;
            const rad = Math.atan2(
                (moveEvt.clientY - centerY) / (scale || 1),
                (moveEvt.clientX - centerX) / (scale || 1)
            );
            let deg = (rad * 180) / Math.PI;
            if (deg < 0) deg += 360;
            const snapped = snapAngleDeg(deg, moveEvt.shiftKey ? 15 : 2, moveEvt.shiftKey);
            setAngle(snapped);
        };

        const onPointerUp = () => {
            isRotatingRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // Transform points from local triangle frame to board canvas coordinates
    const toBoardCoords = (localX, localY) => {
        const rad = degToRad(angle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const fx = isFlipped ? -localX : localX;
        return {
            x: Math.round(pos.x + fx * cos - localY * sin),
            y: Math.round(pos.y + fx * sin + localY * cos)
        };
    };

    // Draw Right Angle (90° Perpendicular Lines)
    const handleDrawPerpendicular = useCallback(() => {
        if (!onDrawPerpendicular) return;
        const vCorner = toBoardCoords(0, 0);
        const vBase = toBoardCoords(basePx, 0);
        const vHeight = toBoardCoords(0, heightPx);

        onDrawPerpendicular({
            corner: vCorner,
            baseEnd: vBase,
            heightEnd: vHeight,
            basePx,
            heightPx,
            angleDeg: angle
        });
    }, [onDrawPerpendicular, pos, basePx, heightPx, angle, isFlipped]);

    // Draw Full Triangle Outline
    const handleDrawFullTriangle = useCallback(() => {
        if (!onDrawTriangle) return;
        const p1 = toBoardCoords(0, 0);
        const p2 = toBoardCoords(basePx, 0);
        const p3 = toBoardCoords(0, heightPx);

        onDrawTriangle({
            p1,
            p2,
            p3,
            squareType,
            angleDeg: angle
        });
    }, [onDrawTriangle, pos, basePx, heightPx, angle, squareType, isFlipped]);

    // Cutout inner triangle dimensions (35% scale)
    const innerMargin = 28;
    const innerBase = Math.max(20, basePx - innerMargin * 2.5);
    const innerHeight = Math.max(20, heightPx - innerMargin * 2.5);

    return (
        <div className="absolute inset-0 pointer-events-none select-none z-[66]">
            {/* SVG Frosted Drafting Triangle with Graduations */}
            <svg
                style={{
                    position: 'absolute',
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    overflow: 'visible',
                    transform: `rotate(${angle}deg) ${isFlipped ? 'scaleX(-1)' : ''}`,
                    transformOrigin: '0 0'
                }}
                className="pointer-events-none"
            >
                <defs>
                    <linearGradient id="setSquareGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0f172a" stopOpacity="0.85" />
                        <stop offset="60%" stopColor="#0369a1" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#082f49" stopOpacity="0.8" />
                    </linearGradient>
                </defs>

                {/* Outer Triangle Body with Inner Cut-out Hole */}
                <path
                    d={`
                        M 0 0 
                        L ${basePx} 0 
                        L 0 ${heightPx} 
                        Z
                        M ${innerMargin} ${innerMargin}
                        L 0 ${innerHeight}
                        L ${innerBase} 0
                        Z
                    `}
                    fill="url(#setSquareGrad)"
                    fillRule="evenodd"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    className="cursor-grab active:cursor-grabbing pointer-events-auto transition hover:stroke-cyan-300"
                    onPointerDown={handleBodyPointerDown}
                    style={{
                        filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.5))'
                    }}
                />

                {/* 90° Perpendicular Right-Angle Indicator Mark */}
                <path
                    d="M 0 16 L 16 16 L 16 0"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="1.5"
                />

                {/* Base Edge Metric Graduations (Ticks) */}
                {Array.from({ length: Math.floor(sizeCm * 10) + 1 }).map((_, mm) => {
                    const x = mm * PX_PER_MM;
                    if (x > basePx - 8) return null;
                    const isCm = mm % 10 === 0;
                    const isHalf = mm % 5 === 0 && !isCm;
                    const tickH = isCm ? 12 : (isHalf ? 8 : 5);

                    return (
                        <g key={`base-mm-${mm}`}>
                            <line
                                x1={x}
                                y1={0}
                                x2={x}
                                y2={tickH}
                                stroke={isCm ? '#38bdf8' : '#7dd3fc'}
                                strokeWidth={isCm ? 1.2 : 0.6}
                            />
                            {isCm && mm > 0 && (
                                <text
                                    x={x}
                                    y={tickH + 9}
                                    fill="#f0f9ff"
                                    fontSize="8"
                                    textAnchor="middle"
                                >
                                    {mm / 10}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Height Edge Metric Graduations (Ticks) */}
                {Array.from({ length: Math.floor((heightPx / PX_PER_CM) * 10) + 1 }).map((_, mm) => {
                    const y = mm * PX_PER_MM;
                    if (y > heightPx - 8) return null;
                    const isCm = mm % 10 === 0;
                    const isHalf = mm % 5 === 0 && !isCm;
                    const tickW = isCm ? 12 : (isHalf ? 8 : 5);

                    return (
                        <g key={`height-mm-${mm}`}>
                            <line
                                x1={0}
                                y1={y}
                                x2={tickW}
                                y2={y}
                                stroke={isCm ? '#38bdf8' : '#7dd3fc'}
                                strokeWidth={isCm ? 1.2 : 0.6}
                            />
                            {isCm && mm > 0 && (
                                <text
                                    x={tickW + 8}
                                    y={y + 3}
                                    fill="#f0f9ff"
                                    fontSize="8"
                                    textAnchor="start"
                                >
                                    {mm / 10}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Type Badge Label in Cutout */}
                <text
                    x={innerMargin + 12}
                    y={innerMargin + 24}
                    fill="#38bdf8"
                    fontSize="10"
                    fontWeight="bold"
                    letterSpacing="1"
                >
                    {squareType === '45' ? '45° / 45° / 90°' : '30° / 60° / 90°'}
                </text>
            </svg>

            {/* 1. 90° Corner Vertex Crosshair */}
            <div
                style={{
                    position: 'absolute',
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handleBodyPointerDown}
                className="w-7 h-7 rounded-full bg-slate-950/90 border-2 border-cyan-400 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition"
                title="Corner 90°: Drag to reposition Set Square"
            >
                <div className="w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-cyan-500/40" />
            </div>

            {/* 2. Rotation Dial Handle */}
            <div
                data-handle="true"
                style={{
                    position: 'absolute',
                    left: `${pos.x + (basePx + 24) * Math.cos(degToRad(angle))}`,
                    top: `${pos.y + (basePx + 24) * Math.sin(degToRad(angle))}`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handleRotatePointerDown}
                className="w-7 h-7 rounded-full bg-slate-900 border-2 border-cyan-400 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 transition"
                title="Drag to rotate set square (Hold Shift for 15° snap)"
            >
                <RotateCw className="w-3.5 h-3.5" />
            </div>

            {/* 3. Top Action HUD */}
            <div
                style={{
                    position: 'absolute',
                    left: `${pos.x + 40}px`,
                    top: `${pos.y - 42}px`,
                    pointerEvents: 'auto'
                }}
                className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full px-3 py-1 shadow-2xl flex items-center gap-2"
            >
                {/* Type Switcher */}
                <button
                    type="button"
                    onClick={() => setSquareType(squareType === '45' ? '30_60' : '45')}
                    className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-cyan-300 hover:text-white transition"
                    title="Switch between 45°-45°-90° and 30°-60°-90° set squares"
                >
                    {squareType === '45' ? '45° Triangle' : '30°/60° Triangle'}
                </button>

                {/* Flip Triangle */}
                <button
                    type="button"
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="p-1 rounded-full bg-slate-800 text-slate-300 hover:text-white transition"
                    title="Flip horizontally"
                >
                    <FlipHorizontal className="w-3 h-3" />
                </button>

                {/* Draw 90° Perpendicular */}
                <button
                    type="button"
                    onClick={handleDrawPerpendicular}
                    className="flex items-center gap-1 px-2.5 py-0.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] rounded-full shadow transition active:scale-95"
                    title="Draw true 90° perpendicular lines onto whiteboard"
                >
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Perpendicular (90°)</span>
                </button>

                {/* Draw Full Triangle */}
                <button
                    type="button"
                    onClick={handleDrawFullTriangle}
                    className="flex items-center gap-1 px-2.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] rounded-full shadow transition active:scale-95"
                    title="Stamp complete drafting triangle onto whiteboard"
                >
                    <TriangleIcon className="w-3 h-3" />
                    <span>Triangle</span>
                </button>

                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded-full bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white transition"
                    title="Close Set Square"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
