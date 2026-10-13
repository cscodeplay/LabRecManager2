'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    RotateCw,
    X,
    Check,
    Move,
    Maximize2,
    FlipHorizontal,
    Ruler as RulerIcon
} from 'lucide-react';
import {
    PX_PER_CM,
    PX_PER_MM,
    PX_PER_INCH,
    pxToCm,
    pxToInches,
    snapAngleDeg,
    degToRad
} from './geometryMath';

export default function RulerTool({
    initialX = 180,
    initialY = 180,
    initialLengthCm = 18,
    initialAngle = 0,
    scale = 1,
    onDrawLine,
    onClose
}) {
    const [pos, setPos] = useState({ x: initialX, y: initialY });
    const [lengthCm, setLengthCm] = useState(initialLengthCm);
    const [angle, setAngle] = useState(initialAngle);
    const [unitMode, setUnitMode] = useState('cm'); // 'cm' | 'in'
    const [isFlipped, setIsFlipped] = useState(false);

    const lengthPx = lengthCm * PX_PER_CM;
    const heightPx = 76; // ruler width/thickness

    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const isRotatingRef = useRef(false);
    const rotateStartRef = useRef({ x: 0, y: 0, initialAngle: 0 });

    const isResizingRef = useRef(false);
    const resizeStartRef = useRef({ x: 0, initialLength: 0 });

    // Handle Repositioning Drag
    const handleBodyPointerDown = (e) => {
        if (e.target.closest('button') || e.target.closest('[data-handle="true"]')) return;
        e.stopPropagation();
        e.preventDefault();
        isDraggingRef.current = true;
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            posX: pos.x,
            posY: pos.y
        };

        const onPointerMove = (moveEvt) => {
            if (!isDraggingRef.current) return;
            const dx = (moveEvt.clientX - dragStartRef.current.x) / (scale || 1);
            const dy = (moveEvt.clientY - dragStartRef.current.y) / (scale || 1);
            setPos({
                x: Math.round(dragStartRef.current.posX + dx),
                y: Math.round(dragStartRef.current.posY + dy)
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

    // Handle Rotation Drag
    const handleRotatePointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        isRotatingRef.current = true;
        const centerX = pos.x + lengthPx / 2;
        const centerY = pos.y + heightPx / 2;

        const onPointerMove = (moveEvt) => {
            if (!isRotatingRef.current) return;
            // Calculate angle from center
            const rad = Math.atan2(moveEvt.clientY - centerY, moveEvt.clientX - centerX);
            let deg = (rad * 180) / Math.PI;
            if (deg < 0) deg += 360;
            const snapped = snapAngleDeg(deg, moveEvt.shiftKey ? 15 : 3, moveEvt.shiftKey);
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

    // Handle Length Resizing Drag
    const handleResizePointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        isResizingRef.current = true;
        resizeStartRef.current = {
            clientX: e.clientX,
            initialLengthCm: lengthCm
        };

        const onPointerMove = (moveEvt) => {
            if (!isResizingRef.current) return;
            const rad = degToRad(angle);
            // Project mouse delta along ruler axis
            const rawDx = (moveEvt.clientX - resizeStartRef.current.clientX) / (scale || 1);
            const rawDy = (moveEvt.clientY - resizeStartRef.current.clientX) / (scale || 1);
            const deltaAlongAxis = rawDx * Math.cos(rad) + rawDy * Math.sin(rad);

            const deltaCm = deltaAlongAxis / PX_PER_CM;
            const newCm = Math.max(8, Math.min(50, Math.round((resizeStartRef.current.initialLengthCm + deltaCm) * 2) / 2));
            setLengthCm(newCm);
        };

        const onPointerUp = () => {
            isResizingRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // Draw straight line along ruler top edge
    const handleDrawLineAlongEdge = useCallback(() => {
        if (!onDrawLine) return;
        const rad = degToRad(angle);
        const startX = pos.x;
        const startY = pos.y;
        const endX = pos.x + lengthPx * Math.cos(rad);
        const endY = pos.y + lengthPx * Math.sin(rad);

        onDrawLine({
            startX: Math.round(startX),
            startY: Math.round(startY),
            endX: Math.round(endX),
            endY: Math.round(endY),
            lengthPx,
            lengthCm,
            angleDeg: angle
        });
    }, [onDrawLine, pos, lengthPx, lengthCm, angle]);

    // Quick 45° / 90° step rotation
    const stepRotation = (step = 45) => {
        setAngle(prev => (prev + step) % 360);
    };

    // Render graduation ticks along top (metric cm/mm) and bottom (inches)
    const totalMm = Math.floor(lengthCm * 10);
    const totalInches = Math.floor(pxToInches(lengthPx));

    return (
        <div
            style={{
                position: 'absolute',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: `${lengthPx}px`,
                height: `${heightPx}px`,
                transform: `rotate(${angle}deg)`,
                transformOrigin: '0 0',
                zIndex: 65,
                touchAction: 'none'
            }}
            onPointerDown={handleBodyPointerDown}
            className="group select-none"
        >
            {/* Realistic Frosted Acrylic Ruler Body */}
            <div
                className={`relative w-full h-full rounded-md border border-cyan-400/60 shadow-2xl backdrop-blur-md transition-all duration-75 cursor-grab active:cursor-grabbing ${
                    isFlipped
                        ? 'bg-gradient-to-t from-slate-950/85 via-cyan-950/40 to-slate-900/80'
                        : 'bg-gradient-to-b from-slate-950/85 via-cyan-950/40 to-slate-900/80'
                }`}
                style={{
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.45), inset 0 0 12px 1px rgba(56, 189, 248, 0.25)'
                }}
            >
                {/* Ruler Straightedge Drawing Guide Highlight Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />

                {/* Top Edge: Metric Millimeter & Centimeter Graduations */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                    {Array.from({ length: totalMm + 1 }).map((_, mm) => {
                        const x = mm * PX_PER_MM;
                        if (x > lengthPx) return null;
                        const isCm = mm % 10 === 0;
                        const isHalfCm = mm % 5 === 0 && !isCm;
                        const tickHeight = isCm ? 18 : (isHalfCm ? 12 : 7);
                        const cmNumber = mm / 10;

                        return (
                            <g key={`mm-${mm}`}>
                                <line
                                    x1={x}
                                    y1={1}
                                    x2={x}
                                    y2={tickHeight}
                                    stroke={isCm ? '#38bdf8' : '#7dd3fc'}
                                    strokeWidth={isCm ? 1.5 : 0.8}
                                    opacity={isCm ? 1 : 0.65}
                                />
                                {isCm && cmNumber > 0 && (
                                    <text
                                        x={x}
                                        y={tickHeight + 11}
                                        fill="#e0f2fe"
                                        fontSize="9"
                                        fontFamily="sans-serif"
                                        fontWeight="600"
                                        textAnchor="middle"
                                    >
                                        {cmNumber}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* Centimeter Unit Label */}
                    <text
                        x={16}
                        y={heightPx / 2 - 2}
                        fill="#38bdf8"
                        fontSize="9"
                        fontWeight="bold"
                        letterSpacing="1"
                    >
                        METRIC (CM / MM)
                    </text>

                    {/* Bottom Edge: Imperial (Inch) Graduations */}
                    {Array.from({ length: totalInches * 16 + 1 }).map((_, sixteenth) => {
                        const x = sixteenth * (PX_PER_INCH / 16);
                        if (x > lengthPx) return null;
                        const isInch = sixteenth % 16 === 0;
                        const isHalf = sixteenth % 8 === 0 && !isInch;
                        const isQuarter = sixteenth % 4 === 0 && !isHalf && !isInch;
                        const tickH = isInch ? 16 : (isHalf ? 11 : (isQuarter ? 8 : 5));
                        const inchNum = sixteenth / 16;

                        return (
                            <g key={`in-${sixteenth}`}>
                                <line
                                    x1={x}
                                    y1={heightPx - 1}
                                    x2={x}
                                    y2={heightPx - tickH}
                                    stroke={isInch ? '#fbbf24' : '#fde68a'}
                                    strokeWidth={isInch ? 1.5 : 0.8}
                                    opacity={isInch ? 1 : 0.55}
                                />
                                {isInch && inchNum > 0 && (
                                    <text
                                        x={x}
                                        y={heightPx - tickH - 4}
                                        fill="#fef3c7"
                                        fontSize="9"
                                        fontWeight="600"
                                        textAnchor="middle"
                                    >
                                        {inchNum}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>

                {/* Center Control HUD: Angle, Measurement & Drawing Actions */}
                <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
                    {/* Measurement readout pill */}
                    <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-700/80 rounded-full px-3 py-1 pointer-events-auto shadow-md">
                        <span className="text-[11px] font-mono font-bold text-cyan-300">
                            {lengthCm.toFixed(1)} cm
                        </span>
                        <span className="text-[10px] text-slate-400">|</span>
                        <span className="text-[11px] font-mono text-amber-300">
                            {angle.toFixed(1)}°
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 pointer-events-auto">
                        {/* Draw Line Along Edge */}
                        <button
                            type="button"
                            onClick={handleDrawLineAlongEdge}
                            className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] rounded-full shadow-lg transition active:scale-95"
                            title="Draw mathematically straight line along top ruler edge"
                        >
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Draw Line</span>
                        </button>

                        {/* Step Rotation 45° */}
                        <button
                            type="button"
                            onClick={() => stepRotation(45)}
                            className="p-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition"
                            title="Rotate +45°"
                        >
                            <RotateCw className="w-3.5 h-3.5" />
                        </button>

                        {/* Flip Ruler */}
                        <button
                            type="button"
                            onClick={() => setIsFlipped(!isFlipped)}
                            className="p-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition"
                            title="Flip Ruler"
                        >
                            <FlipHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {/* Close Ruler */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 rounded-full bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white transition"
                            title="Close Ruler"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Right Edge: Length Resizing Handle */}
                <div
                    data-handle="true"
                    onPointerDown={handleResizePointerDown}
                    className="absolute right-0 top-0 bottom-0 w-4 bg-cyan-500/30 hover:bg-cyan-400/80 border-l border-cyan-400 rounded-r-md cursor-ew-resize flex items-center justify-center transition group-hover:opacity-100"
                    title="Drag to adjust ruler length"
                >
                    <div className="w-1 h-6 bg-cyan-200 rounded-full" />
                </div>

                {/* Rotation Wheel / Dial Handle */}
                <div
                    data-handle="true"
                    onPointerDown={handleRotatePointerDown}
                    style={{
                        right: '-24px',
                        top: '50%',
                        transform: 'translateY(-50%)'
                    }}
                    className="absolute w-8 h-8 rounded-full bg-slate-900 border-2 border-cyan-400 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 transition"
                    title="Drag to rotate ruler smoothly (Hold Shift for 15° snap)"
                >
                    <RotateCw className="w-3.5 h-3.5" />
                </div>
            </div>
        </div>
    );
}
