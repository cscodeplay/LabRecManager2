'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Map, ChevronUp, ChevronDown } from 'lucide-react';

export default function WhiteboardMinimap({
    zoomLevel = 1,
    setZoomLevel,
    panOffset = { x: 0, y: 0 },
    setPanOffset,
    canvasWidth = 1920,
    canvasHeight = 1080,
    containerRef,
    shapes = [],
    texts = [],
    images = []
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isDraggingViewport, setIsDraggingViewport] = useState(false);
    const minimapRef = useRef(null);

    const MAP_WIDTH = 180;
    const MAP_HEIGHT = 101; // 16:9 ratio
    const scaleX = MAP_WIDTH / canvasWidth;
    const scaleY = MAP_HEIGHT / canvasHeight;

    // Viewport calculation
    const viewportRect = useMemo(() => {
        if (!containerRef?.current) {
            return { x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT };
        }
        const container = containerRef.current;
        const containerW = container.clientWidth || 1200;
        const containerH = container.clientHeight || 700;

        // How much of the 1920x1080 canvas is visible inside container given zoomLevel and panOffset
        const visibleWidth = Math.min(canvasWidth, (containerW / zoomLevel));
        const visibleHeight = Math.min(canvasHeight, (containerH / zoomLevel));

        const leftCanvas = -panOffset.x / zoomLevel;
        const topCanvas = -panOffset.y / zoomLevel;

        const vpX = Math.max(0, Math.min(MAP_WIDTH - 20, leftCanvas * scaleX));
        const vpY = Math.max(0, Math.min(MAP_HEIGHT - 15, topCanvas * scaleY));
        const vpW = Math.max(20, Math.min(MAP_WIDTH, visibleWidth * scaleX));
        const vpH = Math.max(15, Math.min(MAP_HEIGHT, visibleHeight * scaleY));

        return { x: vpX, y: vpY, width: vpW, height: vpH };
    }, [containerRef, zoomLevel, panOffset, canvasWidth, canvasHeight, scaleX, scaleY]);

    // Handle clicking or dragging on the minimap to pan
    const handleMinimapPointer = useCallback((e) => {
        if (!minimapRef.current) return;
        const rect = minimapRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Convert minimap click to canvas coordinates
        const targetCanvasX = (clickX / MAP_WIDTH) * canvasWidth;
        const targetCanvasY = (clickY / MAP_HEIGHT) * canvasHeight;

        const container = containerRef?.current;
        const containerW = container ? container.clientWidth : 1200;
        const containerH = container ? container.clientHeight : 700;

        // Center viewport at target canvas point
        const newPanX = -(targetCanvasX * zoomLevel - containerW / 2);
        const newPanY = -(targetCanvasY * zoomLevel - containerH / 2);

        setPanOffset({ x: newPanX, y: newPanY });
    }, [canvasWidth, canvasHeight, containerRef, zoomLevel, setPanOffset]);

    useEffect(() => {
        if (!isDraggingViewport) return;

        const handleMove = (e) => {
            handleMinimapPointer(e);
        };

        const handleUp = () => {
            setIsDraggingViewport(false);
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };
    }, [isDraggingViewport, handleMinimapPointer]);

    const zoomIn = () => {
        setZoomLevel(prev => Math.min(3.0, Math.round((prev + 0.15) * 100) / 100));
    };

    const zoomOut = () => {
        setZoomLevel(prev => Math.max(0.25, Math.round((prev - 0.15) * 100) / 100));
    };

    const resetZoom = () => {
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
    };

    return (
        <div className="absolute bottom-4 right-4 z-40 flex flex-col items-end gap-2 pointer-events-auto select-none">
            {/* Minimap Box */}
            {isExpanded && (
                <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-2.5 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                            <Map className="w-3.5 h-3.5 text-indigo-400" /> Canvas Minimap
                        </span>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="text-slate-400 hover:text-white transition p-0.5 rounded"
                            title="Collapse Minimap"
                        >
                            <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Canvas Mini SVG */}
                    <div
                        ref={minimapRef}
                        className="relative rounded-lg overflow-hidden border border-slate-700/90 bg-slate-950 cursor-crosshair shadow-inner"
                        style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
                        onPointerDown={(e) => {
                            setIsDraggingViewport(true);
                            handleMinimapPointer(e);
                        }}
                    >
                        <svg className="w-full h-full pointer-events-none" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
                            {/* Render shapes */}
                            {shapes.filter(s => s.type !== 'connector').map((s) => (
                                <rect
                                    key={s.id}
                                    x={s.x || 0}
                                    y={s.y || 0}
                                    width={s.width || 60}
                                    height={s.height || 40}
                                    fill={s.fillColor && s.fillColor !== 'transparent' ? s.fillColor : (s.color || '#6366f1')}
                                    opacity={0.7}
                                    rx={4}
                                />
                            ))}

                            {/* Render texts */}
                            {texts.map((t) => (
                                <rect
                                    key={t.id}
                                    x={t.x || 0}
                                    y={t.y || 0}
                                    width={t.width || 120}
                                    height={t.height || 30}
                                    fill="#94a3b8"
                                    opacity={0.5}
                                    rx={2}
                                />
                            ))}

                            {/* Render images */}
                            {images.map((img) => (
                                <rect
                                    key={img.id}
                                    x={img.x || 0}
                                    y={img.y || 0}
                                    width={img.width || 100}
                                    height={img.height || 80}
                                    fill="#38bdf8"
                                    opacity={0.6}
                                    rx={4}
                                />
                            ))}
                        </svg>

                        {/* Viewport Indicator */}
                        <div
                            className="absolute border-2 border-indigo-400 bg-indigo-500/25 rounded shadow pointer-events-none transition-all duration-75"
                            style={{
                                left: `${viewportRect.x}px`,
                                top: `${viewportRect.y}px`,
                                width: `${viewportRect.width}px`,
                                height: `${viewportRect.height}px`
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Bottom Zoom Control Strip */}
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full shadow-2xl px-3 py-1.5 flex items-center gap-2">
                {!isExpanded && (
                    <button
                        onClick={() => setIsExpanded(true)}
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition"
                        title="Expand Minimap"
                    >
                        <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                )}

                <button
                    onClick={zoomOut}
                    className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition active:scale-95"
                    title="Zoom Out (−)"
                >
                    <ZoomOut className="w-3.5 h-3.5" />
                </button>

                <button
                    onClick={resetZoom}
                    className="px-2 py-0.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-md text-xs font-mono font-bold transition flex items-center gap-1"
                    title="Reset Zoom to 100%"
                >
                    <span>{Math.round(zoomLevel * 100)}%</span>
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                </button>

                <button
                    onClick={zoomIn}
                    className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition active:scale-95"
                    title="Zoom In (+)"
                >
                    <ZoomIn className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
