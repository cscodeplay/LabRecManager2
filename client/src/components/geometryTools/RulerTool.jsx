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
    PX_PER_MM,
    pxToCm,
    snapAngleDeg,
    degToRad,
    screenToCanvasCoords
} from './geometryMath';

export default function RulerTool({
    initialX = 180,
    initialY = 180,
    initialLengthCm = 20,
    initialAngle = 0,
    scale = 1,
    onDrawLine,
    onClose
}) {
    const [pos, setPos] = useState({ x: initialX, y: initialY });
    const [lengthCm, setLengthCm] = useState(Math.min(20, Math.max(10, initialLengthCm)));
    const [angle, setAngle] = useState(initialAngle);

    // Live edge drawing state { startT: number, endT: number } in local px
    const [activeEdgeDrawing, setActiveEdgeDrawing] = useState(null);

    const lengthPx = lengthCm * PX_PER_CM;
    const heightPx = 48; // Slimmer, realistic physical ruler width (48px ~ 1.25 cm visual)

    // Repositioning drag ref
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ canvasStartX: 0, canvasStartY: 0, initialPosX: 0, initialPosY: 0 });

    // Inner rotation handle drag ref
    const isRotatingRef = useRef(false);
    const rotateOffsetRef = useRef(0);

    // Length resizing drag ref
    const isResizingRef = useRef(false);
    const resizeStartRef = useRef({ canvasStartX: 0, initialLengthCm: 20 });

    // Edge drawing drag ref
    const isDrawingEdgeRef = useRef(false);

    // ─── 1. Reposition Ruler (Draggable from anywhere on surface) ───
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
            const current = screenToCanvasCoords(moveEvt.clientX, moveEvt.clientY);
            const dx = current.x - dragStartRef.current.canvasStartX;
            const dy = current.y - dragStartRef.current.canvasStartY;
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

    // ─── 2. Inner Rotation Handle (Only inner handle used for rotation) ───
    const handleInnerRotatePointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        isRotatingRef.current = true;

        const coords = screenToCanvasCoords(e.clientX, e.clientY);
        // Angle from ruler origin to mouse
        const currentAngleRad = Math.atan2(coords.y - pos.y, coords.x - pos.x);
        let currentAngleDeg = (currentAngleRad * 180) / Math.PI;
        if (currentAngleDeg < 0) currentAngleDeg += 360;

        // Offset between cursor angle and ruler angle
        let offset = currentAngleDeg - angle;
        if (offset < 0) offset += 360;
        rotateOffsetRef.current = offset;

        const onPointerMove = (moveEvt) => {
            if (!isRotatingRef.current) return;
            const moveCoords = screenToCanvasCoords(moveEvt.clientX, moveEvt.clientY);
            const rad = Math.atan2(moveCoords.y - pos.y, moveCoords.x - pos.x);
            let deg = (rad * 180) / Math.PI;
            if (deg < 0) deg += 360;

            let newAngle = deg - rotateOffsetRef.current;
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

    // ─── 3. Length Resizing Drag (Up to 20 cm) ───
    const handleResizePointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        isResizingRef.current = true;
        const coords = screenToCanvasCoords(e.clientX, e.clientY);
        resizeStartRef.current = {
            canvasStartX: coords.x,
            canvasStartY: coords.y,
            initialLengthCm: lengthCm
        };

        const onPointerMove = (moveEvt) => {
            if (!isResizingRef.current) return;
            const current = screenToCanvasCoords(moveEvt.clientX, moveEvt.clientY);
            const dx = current.x - resizeStartRef.current.canvasStartX;
            const dy = current.y - resizeStartRef.current.canvasStartY;

            const rad = degToRad(angle);
            // Project delta along ruler axis
            const projDeltaPx = dx * Math.cos(rad) + dy * Math.sin(rad);
            const deltaCm = projDeltaPx / PX_PER_CM;

            // Restrict maximum length strictly to 20 cm, minimum 6 cm
            const newCm = Math.max(6, Math.min(20, Math.round((resizeStartRef.current.initialLengthCm + deltaCm) * 2) / 2));
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

    // ─── 4. Interactive Edge Drawing (Click & drag along ruler's edge) ───
    const handleEdgePointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        isDrawingEdgeRef.current = true;

        const coords = screenToCanvasCoords(e.clientX, e.clientY);
        const rad = degToRad(-angle);
        const dx = coords.x - pos.x;
        const dy = coords.y - pos.y;
        const localX = Math.max(0, Math.min(lengthPx, dx * Math.cos(rad) - dy * Math.sin(rad)));

        setActiveEdgeDrawing({ startT: localX, endT: localX });

        const onPointerMove = (moveEvt) => {
            if (!isDrawingEdgeRef.current) return;
            const curCoords = screenToCanvasCoords(moveEvt.clientX, moveEvt.clientY);
            const cdx = curCoords.x - pos.x;
            const cdy = curCoords.y - pos.y;
            const curLocalX = Math.max(0, Math.min(lengthPx, cdx * Math.cos(rad) - cdy * Math.sin(rad)));
            setActiveEdgeDrawing({ startT: localX, endT: curLocalX });
        };

        const onPointerUp = (upEvt) => {
            isDrawingEdgeRef.current = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);

            const upCoords = screenToCanvasCoords(upEvt.clientX, upEvt.clientY);
            const udx = upCoords.x - pos.x;
            const udy = upCoords.y - pos.y;
            const finalLocalX = Math.max(0, Math.min(lengthPx, udx * Math.cos(rad) - udy * Math.sin(rad)));

            const minT = Math.min(localX, finalLocalX);
            const maxT = Math.max(localX, finalLocalX);
            const drawnLengthPx = maxT - minT;

            setActiveEdgeDrawing(null);

            if (drawnLengthPx > 6 && onDrawLine) {
                const forwardRad = degToRad(angle);
                const startX = pos.x + minT * Math.cos(forwardRad);
                const startY = pos.y + minT * Math.sin(forwardRad);
                const endX = pos.x + maxT * Math.cos(forwardRad);
                const endY = pos.y + maxT * Math.sin(forwardRad);
                const drawnLengthCm = drawnLengthPx / PX_PER_CM;

                onDrawLine({
                    startX: Math.round(startX),
                    startY: Math.round(startY),
                    endX: Math.round(endX),
                    endY: Math.round(endY),
                    lengthPx: drawnLengthPx,
                    lengthCm: drawnLengthCm,
                    angleDeg: angle
                });
            }
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // ─── 5. Stamping Full Line Along Edge Button ───
    const handleDrawFullLine = useCallback(() => {
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

    const totalMm = Math.floor(lengthCm * 10);

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
            {/* Realistic Semi-Transparent Acrylic Physical Ruler Body */}
            <div
                className="relative w-full h-full rounded-xs border border-slate-400/50 shadow-xl backdrop-blur-[2px] transition-all duration-75 cursor-grab active:cursor-grabbing bg-white/25 hover:bg-white/30"
                style={{
                    boxShadow: '0 8px 24px 0 rgba(0, 0, 0, 0.18), inset 0 1px 0 0 rgba(255, 255, 255, 0.7), inset 0 -1px 0 0 rgba(0, 0, 0, 0.12)'
                }}
            >
                {/* Ruler Top Edge Drawing Guide & Active Interaction Strip */}
                <div
                    data-handle="edge-draw"
                    onPointerDown={handleEdgePointerDown}
                    className="absolute -top-1 left-0 right-0 h-3 cursor-crosshair group/edge z-20"
                    title="Click and drag along this edge to draw a straight pencil line"
                >
                    <div className="w-full h-[1.5px] bg-slate-900/60 group-hover/edge:bg-cyan-600 transition-colors" />
                </div>

                {/* Live Drawn Line Preview Along Edge */}
                {activeEdgeDrawing && (
                    <div
                        className="absolute top-0 h-[2.5px] bg-cyan-600 shadow-[0_0_6px_rgba(6,182,212,0.8)] z-30 pointer-events-none transition-none"
                        style={{
                            left: `${Math.min(activeEdgeDrawing.startT, activeEdgeDrawing.endT)}px`,
                            width: `${Math.abs(activeEdgeDrawing.endT - activeEdgeDrawing.startT)}px`
                        }}
                    />
                )}

                {/* SVG Clear Black Measurement Markings (0 to 20 cm) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    {Array.from({ length: totalMm + 1 }).map((_, mm) => {
                        const x = mm * PX_PER_MM;
                        if (x > lengthPx) return null;
                        const isCm = mm % 10 === 0;
                        const isHalfCm = mm % 5 === 0 && !isCm;
                        const tickHeight = isCm ? 16 : (isHalfCm ? 10 : 6);
                        const cmNumber = mm / 10;

                        return (
                            <g key={`mm-${mm}`}>
                                <line
                                    x1={x}
                                    y1={0}
                                    x2={x}
                                    y2={tickHeight}
                                    stroke="#0f172a"
                                    strokeWidth={isCm ? 1.5 : (isHalfCm ? 1.1 : 0.75)}
                                    opacity={isCm ? 1 : (isHalfCm ? 0.9 : 0.7)}
                                />
                                {isCm && (
                                    <text
                                        x={x}
                                        y={tickHeight + 10}
                                        fill="#0f172a"
                                        fontSize="9"
                                        fontFamily="sans-serif"
                                        fontWeight="700"
                                        textAnchor="middle"
                                    >
                                        {cmNumber}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* Centimeter Metric Label */}
                    <text
                        x={lengthPx - 26}
                        y={heightPx - 8}
                        fill="#1e293b"
                        fontSize="8.5"
                        fontWeight="700"
                        letterSpacing="0.5"
                    >
                        CM
                    </text>
                </svg>

                {/* Center / Inner Controls Overlay */}
                <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
                    {/* Dynamic Real-Time Measurement & Angle Display */}
                    <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-full px-2.5 py-0.5 pointer-events-auto shadow-md">
                        <span className="text-[10.5px] font-mono font-bold text-cyan-300">
                            {lengthCm.toFixed(1)} cm
                        </span>
                        <span className="text-[9px] text-slate-500">|</span>
                        <span className="text-[10.5px] font-mono font-bold text-amber-300">
                            {angle.toFixed(1)}°
                        </span>
                    </div>

                    {/* Inner Rotation Handle (Rotates ruler smoothly without outer handle) */}
                    <div
                        data-handle="true"
                        onPointerDown={handleInnerRotatePointerDown}
                        className="w-7 h-7 rounded-full bg-slate-900/90 border-2 border-cyan-400 shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 transition pointer-events-auto"
                        title="Drag inner handle to rotate ruler (Hold Shift for 15° snap)"
                    >
                        <RotateCw className="w-3.5 h-3.5" />
                    </div>

                    {/* Action Buttons: Draw Full Line & Close */}
                    <div className="flex items-center gap-1 pointer-events-auto">
                        <button
                            type="button"
                            onClick={handleDrawFullLine}
                            className="flex items-center gap-1 px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] rounded-full shadow transition active:scale-95"
                            title="Draw line along full ruler edge"
                        >
                            <Pencil className="w-2.5 h-2.5" />
                            <span>Draw Line</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 rounded-full bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white transition"
                            title="Close Ruler"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Right Edge: Length Resizing Handle (Max 20 cm) */}
                <div
                    data-handle="true"
                    onPointerDown={handleResizePointerDown}
                    className="absolute right-0 top-0 bottom-0 w-3 hover:w-3.5 bg-slate-700/30 hover:bg-cyan-500/50 border-l border-slate-400/60 cursor-ew-resize flex items-center justify-center transition"
                    title="Drag to adjust ruler length (up to 20 cm)"
                >
                    <div className="w-0.5 h-4 bg-slate-800 rounded-full" />
                </div>
            </div>
        </div>
    );
}
