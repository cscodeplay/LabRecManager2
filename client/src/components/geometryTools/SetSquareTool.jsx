'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
    RotateCw,
    X,
    Check,
    Triangle as TriangleIcon,
    FlipHorizontal,
    Minus,
    Plus
} from 'lucide-react';
import {
    PX_PER_CM,
    PX_PER_MM,
    snapAngleDeg,
    degToRad,
    screenToCanvasCoords
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
    onClose,
    onStateChange
}) {
    // Right-angle vertex position (Origin at 90° corner) in Canvas Coordinates
    const [pos, setPos] = useState({ x: initialX, y: initialY });
    const [squareType, setSquareType] = useState(initialType);
    const [sizeCm, setSizeCm] = useState(Math.min(18.0, Math.max(6.0, initialSizeCm)));
    const [angle, setAngle] = useState(initialAngle);
    const [isFlipped, setIsFlipped] = useState(false);

    // Calculate dimensions in px
    const basePx = sizeCm * PX_PER_CM;
    const heightPx = squareType === '45' ? basePx : basePx * Math.tan(degToRad(60));

    // Report physical boundary for outer edge pen guidance
    React.useEffect(() => {
        if (onStateChange) {
            onStateChange({
                type: 'setsquare',
                x: pos.x,
                y: pos.y,
                angle,
                basePx,
                heightPx,
                isFlipped
            });
        }
    }, [onStateChange, pos.x, pos.y, angle, basePx, heightPx, isFlipped]);

    // Drag repositioning ref
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ canvasStartX: 0, canvasStartY: 0, initialPosX: 0, initialPosY: 0 });

    // Rotation drag ref
    const isRotatingRef = useRef(false);
    const rotateOffsetRef = useRef(0);

    // ─── 1. Reposition Set Square Body (Draggable from surface) ───
    const handleBodyPointerDown = (e) => {
        if (e.target.closest('button') || e.target.closest('[data-handle="true"]')) return;
        e.stopPropagation();
        e.preventDefault();
        isDraggingRef.current = true;

        const coords = screenToCanvasCoords(e.clientX, e.clientY);
        dragStartRef.current = {
            canvasStartX: coords.x,
            canvasStartY: coords.y,
            initialPosX: pos.x,
            initialPosY: pos.y
        };

        const onPointerMove = (moveEvt) => {
            if (!isDraggingRef.current) return;
            const curCoords = screenToCanvasCoords(moveEvt.clientX, moveEvt.clientY);
            const dx = curCoords.x - dragStartRef.current.canvasStartX;
            const dy = curCoords.y - dragStartRef.current.canvasStartY;
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

    // ─── 2. Rotate Set Square ───
    const handleRotatePointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        isRotatingRef.current = true;

        const coords = screenToCanvasCoords(e.clientX, e.clientY);
        const startRad = Math.atan2(coords.y - pos.y, coords.x - pos.x);
        let startDeg = (startRad * 180) / Math.PI;
        if (startDeg < 0) startDeg += 360;

        let offset = startDeg - angle;
        if (offset < 0) offset += 360;
        rotateOffsetRef.current = offset;

        const onPointerMove = (moveEvt) => {
            if (!isRotatingRef.current) return;
            const curCoords = screenToCanvasCoords(moveEvt.clientX, moveEvt.clientY);
            const curRad = Math.atan2(curCoords.y - pos.y, curCoords.x - pos.x);
            let curDeg = (curRad * 180) / Math.PI;
            if (curDeg < 0) curDeg += 360;

            let newAngle = curDeg - rotateOffsetRef.current;
            if (newAngle < 0) newAngle += 360;

            const snapped = snapAngleDeg(newAngle, moveEvt.shiftKey ? 15 : 2, moveEvt.shiftKey);
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

    // ─── 3. Stamping Perpendicular / Triangle Actions ───
    const handleDrawPerpendicular = useCallback(() => {
        if (!onDrawPerpendicular) return;
        const rad = degToRad(angle);
        const perpRad = degToRad(angle + (isFlipped ? -90 : 90));

        const baseEndX = pos.x + basePx * Math.cos(rad);
        const baseEndY = pos.y + basePx * Math.sin(rad);

        const perpEndX = pos.x + heightPx * Math.cos(perpRad);
        const perpEndY = pos.y + heightPx * Math.sin(perpRad);

        const c = { x: Math.round(pos.x), y: Math.round(pos.y) };
        const bEnd = { x: Math.round(baseEndX), y: Math.round(baseEndY) };
        const hEnd = { x: Math.round(perpEndX), y: Math.round(perpEndY) };

        onDrawPerpendicular({
            corner: c,
            baseEnd: bEnd,
            heightEnd: hEnd,
            cornerX: c.x,
            cornerY: c.y,
            baseEndX: bEnd.x,
            baseEndY: bEnd.y,
            perpEndX: hEnd.x,
            perpEndY: hEnd.y,
            baseLenCm: sizeCm,
            heightLenCm: heightPx / PX_PER_CM,
            angleDeg: angle
        });
    }, [onDrawPerpendicular, pos, basePx, heightPx, sizeCm, angle, isFlipped]);

    const handleDrawFullTriangle = useCallback(() => {
        if (!onDrawTriangle) return;
        const rad = degToRad(angle);
        const perpRad = degToRad(angle + (isFlipped ? -90 : 90));

        const p1 = { x: Math.round(pos.x), y: Math.round(pos.y) };
        const p2 = {
            x: Math.round(pos.x + basePx * Math.cos(rad)),
            y: Math.round(pos.y + basePx * Math.sin(rad))
        };
        const p3 = {
            x: Math.round(pos.x + heightPx * Math.cos(perpRad)),
            y: Math.round(pos.y + heightPx * Math.sin(perpRad))
        };

        onDrawTriangle({
            p1,
            p2,
            p3,
            points: [p1, p2, p3],
            squareType,
            baseCm: sizeCm,
            angleDeg: angle
        });
    }, [onDrawTriangle, pos, basePx, heightPx, squareType, sizeCm, angle, isFlipped]);

    return (
        <div data-geometry-tool="true" className="geometry-instrument absolute inset-0 pointer-events-none select-none z-[75]">
            {/* SVG Acrylic Drafting Triangle */}
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
                    <filter id="setSquareShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="8" stdDeviation="8" floodOpacity="0.25" />
                    </filter>
                </defs>

                {/* Solid Transparent Acrylic Triangle (No Hollow Cutout - Draggable from anywhere on surface) */}
                <path
                    d={`M 0 0 L ${basePx} 0 L 0 ${heightPx} Z`}
                    fill="rgba(241, 245, 249, 0.40)"
                    stroke="#475569"
                    strokeWidth="1.2"
                    filter="url(#setSquareShadow)"
                    className="cursor-grab active:cursor-grabbing pointer-events-auto transition hover:fill-slate-100/55 backdrop-blur-[2px]"
                    onPointerDown={handleBodyPointerDown}
                />

                {/* 90° Perpendicular Right-Angle Mark */}
                <path
                    d="M 0 16 L 16 16 L 16 0"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                />

                {/* Base Edge Clear Black Graduations */}
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
                                stroke="#0f172a"
                                strokeWidth={isCm ? 1.4 : 0.75}
                            />
                            {isCm && mm > 0 && (
                                <text
                                    x={x}
                                    y={tickH + 9}
                                    fill="#0f172a"
                                    fontSize="8"
                                    fontFamily="sans-serif"
                                    fontWeight="700"
                                    textAnchor="middle"
                                >
                                    {mm / 10}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Height Edge Clear Black Graduations */}
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
                                stroke="#0f172a"
                                strokeWidth={isCm ? 1.4 : 0.75}
                            />
                            {isCm && mm > 0 && (
                                <text
                                    x={tickW + 8}
                                    y={y + 3}
                                    fill="#0f172a"
                                    fontSize="8"
                                    fontFamily="sans-serif"
                                    fontWeight="700"
                                    textAnchor="start"
                                >
                                    {mm / 10}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Type Label on Solid Acrylic Face */}
                <text
                    x={28}
                    y={38}
                    fill="#0f172a"
                    fontSize="9.5"
                    fontFamily="sans-serif"
                    fontWeight="700"
                    letterSpacing="0.5"
                >
                    {squareType === '45' ? '45° / 45° / 90°' : '30° / 60° / 90°'}
                </text>

                {/* ─── Control 2: Integrated Rotation Grip (Directly Attached to Triangle Base, Never Detached) ─── */}
                <g
                    data-handle="true"
                    onPointerDown={handleRotatePointerDown}
                    className="pointer-events-auto cursor-grab active:cursor-grabbing group/rot"
                >
                    {/* Connecting physical stem from base corner */}
                    <line
                        x1={basePx}
                        y1={0}
                        x2={basePx + 18}
                        y2={0}
                        stroke="#f43f5e"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    />
                    {/* Rotation Dial Badge */}
                    <circle
                        cx={basePx + 18}
                        cy={0}
                        r="12"
                        fill="#0f172a"
                        stroke="#f43f5e"
                        strokeWidth="2"
                        filter="url(#setSquareShadow)"
                    />
                    <path
                        d={`M ${basePx + 15} -3 L ${basePx + 21} -3 L ${basePx + 21} 3 M ${basePx + 21} -3 C ${basePx + 18} -5 ${basePx + 14} -5 ${basePx + 13} -3 C ${basePx + 11} -1 ${basePx + 11} 2 ${basePx + 13} 4`}
                        fill="none"
                        stroke="#fda4af"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </g>
            </svg>

            {/* ─── Control 1: 90° Corner Vertex Crosshair ─── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto'
                }}
                onPointerDown={handleBodyPointerDown}
                className="w-7 h-7 rounded-full bg-slate-900/90 border-2 border-rose-400 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition"
                title="Corner 90°: Drag to reposition Set Square"
            >
                <div className="w-2 h-2 rounded-full bg-rose-400 ring-2 ring-rose-500/40" />
            </div>

            {/* ─── Control 3: Top Action HUD (All Icon-Only with Tooltips & Resizing) ─── */}
            <div
                style={{
                    position: 'absolute',
                    left: `${pos.x + 40}px`,
                    top: `${pos.y - 42}px`,
                    pointerEvents: 'auto'
                }}
                className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full px-2 py-0.5 shadow-2xl flex items-center gap-1.5 h-7"
            >
                {/* Resizing Stepper Minus */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setSizeCm(s => +(Math.max(6.0, s - 1.0)).toFixed(1));
                    }}
                    className="w-4 h-4 rounded-full bg-slate-800 hover:bg-rose-500 text-slate-300 hover:text-white flex items-center justify-center transition"
                    title="Shrink set square (-1 cm, min 6 cm)"
                >
                    <Minus className="w-2.5 h-2.5" />
                </button>

                {/* Type Switcher Icon Badge */}
                <button
                    type="button"
                    onClick={() => setSquareType(squareType === '45' ? '30_60' : '45')}
                    className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono font-bold text-rose-300 hover:text-white transition flex items-center gap-1"
                    title={squareType === '45' ? '45°-45°-90° Triangle (Click to switch to 30°-60°-90°)' : '30°-60°-90° Triangle (Click to switch to 45°-45°-90°)'}
                >
                    <TriangleIcon className="w-2.5 h-2.5" />
                    <span>{squareType === '45' ? '45°' : '30/60°'}</span>
                </button>

                {/* Resizing Stepper Plus */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setSizeCm(s => +(Math.min(18.0, s + 1.0)).toFixed(1));
                    }}
                    className="w-4 h-4 rounded-full bg-slate-800 hover:bg-rose-500 text-slate-300 hover:text-white flex items-center justify-center transition"
                    title="Enlarge set square (+1 cm, max 18 cm)"
                >
                    <Plus className="w-2.5 h-2.5" />
                </button>

                <div className="w-px h-3 bg-slate-700" />

                {/* Flip Triangle (Icon Only) */}
                <button
                    type="button"
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition"
                    title="Flip horizontally"
                >
                    <FlipHorizontal className="w-3 h-3" />
                </button>

                {/* Draw 90° Perpendicular (Icon Only) */}
                <button
                    type="button"
                    onClick={handleDrawPerpendicular}
                    className="w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow transition active:scale-95"
                    title="Draw true 90° perpendicular lines onto whiteboard"
                >
                    <Check className="w-3 h-3 stroke-[3]" />
                </button>

                {/* Draw Full Triangle (Icon Only) */}
                <button
                    type="button"
                    onClick={handleDrawFullTriangle}
                    className="w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shadow transition active:scale-95"
                    title="Stamp complete drafting triangle onto whiteboard"
                >
                    <TriangleIcon className="w-2.5 h-2.5" />
                </button>

                {/* Close Button (Icon Only) */}
                <button
                    type="button"
                    onClick={onClose}
                    className="w-5 h-5 rounded-full bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition"
                    title="Close Set Square"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
