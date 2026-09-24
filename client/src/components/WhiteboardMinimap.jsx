'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Map, ChevronUp, ChevronDown, Sliders } from 'lucide-react';
import { getAnchorPoint } from './ConnectorLine';

export default function WhiteboardMinimap({
    zoomLevel = 1,
    setZoomLevel,
    onZoomChange,
    panOffset = { x: 0, y: 0 },
    setPanOffset,
    onPanChange,
    canvasWidth = 1920,
    canvasHeight = 1080,
    containerRef,
    shapes = [],
    shapeObjects = [],
    texts = [],
    textObjects = [],
    images = [],
    imageObjects = []
}) {
    // Keep canvas minimap default invisible; accessed from zoom bar
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDraggingViewport, setIsDraggingViewport] = useState(false);
    const minimapRef = useRef(null);

    // Normalize callbacks and object lists
    const changeZoom = useCallback((updater) => {
        const fn = setZoomLevel || onZoomChange;
        if (typeof fn === 'function') {
            fn(updater);
        }
    }, [setZoomLevel, onZoomChange]);

    const changePan = useCallback((updater) => {
        const fn = setPanOffset || onPanChange;
        if (typeof fn === 'function') {
            fn(updater);
        }
    }, [setPanOffset, onPanChange]);

    const resolvedShapes = useMemo(() => (shapes && shapes.length > 0 ? shapes : shapeObjects) || [], [shapes, shapeObjects]);
    const resolvedTexts = useMemo(() => (texts && texts.length > 0 ? texts : textObjects) || [], [texts, textObjects]);
    const resolvedImages = useMemo(() => (images && images.length > 0 ? images : imageObjects) || [], [images, imageObjects]);

    const MAP_WIDTH = 200;
    const MAP_HEIGHT = 112; // 16:9 ratio
    const scaleX = MAP_WIDTH / canvasWidth;
    const scaleY = MAP_HEIGHT / canvasHeight;

    // Viewport calculation
    const viewportRect = useMemo(() => {
        let containerW = 1200;
        let containerH = 700;
        if (containerRef?.current) {
            containerW = containerRef.current.clientWidth || 1200;
            containerH = containerRef.current.clientHeight || 700;
        } else if (typeof window !== 'undefined') {
            containerW = window.innerWidth;
            containerH = window.innerHeight;
        }

        const visibleWidth = Math.min(canvasWidth, (containerW / zoomLevel));
        const visibleHeight = Math.min(canvasHeight, (containerH / zoomLevel));

        const leftCanvas = -panOffset.x / zoomLevel;
        const topCanvas = -panOffset.y / zoomLevel;

        const vpX = Math.max(0, Math.min(MAP_WIDTH - 10, leftCanvas * scaleX));
        const vpY = Math.max(0, Math.min(MAP_HEIGHT - 10, topCanvas * scaleY));
        const vpW = Math.max(15, Math.min(MAP_WIDTH, visibleWidth * scaleX));
        const vpH = Math.max(12, Math.min(MAP_HEIGHT, visibleHeight * scaleY));

        return { x: vpX, y: vpY, width: vpW, height: vpH };
    }, [containerRef, zoomLevel, panOffset, canvasWidth, canvasHeight, scaleX, scaleY]);

    // Handle clicking or dragging on the minimap to pan
    const handleMinimapPointer = useCallback((e) => {
        if (!minimapRef.current) return;
        const rect = minimapRef.current.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(MAP_WIDTH, e.clientX - rect.left));
        const clickY = Math.max(0, Math.min(MAP_HEIGHT, e.clientY - rect.top));

        // Convert minimap click to canvas coordinates
        const targetCanvasX = (clickX / MAP_WIDTH) * canvasWidth;
        const targetCanvasY = (clickY / MAP_HEIGHT) * canvasHeight;

        let containerW = 1200;
        let containerH = 700;
        if (containerRef?.current) {
            containerW = containerRef.current.clientWidth || 1200;
            containerH = containerRef.current.clientHeight || 700;
        } else if (typeof window !== 'undefined') {
            containerW = window.innerWidth;
            containerH = window.innerHeight;
        }

        // Center viewport at target canvas point
        const newPanX = -(targetCanvasX * zoomLevel - containerW / 2);
        const newPanY = -(targetCanvasY * zoomLevel - containerH / 2);

        changePan({ x: newPanX, y: newPanY });
    }, [canvasWidth, canvasHeight, containerRef, zoomLevel, changePan]);

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
        changeZoom(prev => Math.min(3.0, Math.round(((typeof prev === 'number' ? prev : 1) + 0.15) * 100) / 100));
    };

    const zoomOut = () => {
        changeZoom(prev => Math.max(0.25, Math.round(((typeof prev === 'number' ? prev : 1) - 0.15) * 100) / 100));
    };

    const resetZoom = () => {
        changeZoom(1);
        changePan({ x: 0, y: 0 });
    };

    const handleSliderChange = (e) => {
        const val = parseFloat(e.target.value) / 100;
        changeZoom(Math.max(0.25, Math.min(3.0, Math.round(val * 100) / 100)));
    };

    return (
        <div className="flex flex-col items-end gap-2 pointer-events-auto select-none">
            {/* Minimap Expanded Panel */}
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
                            {/* Render regular geometric & domain shapes */}
                            {resolvedShapes.filter(s => s.type !== 'connector').map((s) => (
                                <g 
                                    key={s.id} 
                                    transform={`rotate(${s.rotation || 0} ${(s.x || 0) + (s.width || 60)/2} ${(s.y || 0) + (s.height || 40)/2})`}
                                >
                                    <rect
                                        x={s.x || 0}
                                        y={s.y || 0}
                                        width={s.width || 60}
                                        height={s.height || 40}
                                        fill={s.fillColor && s.fillColor !== 'transparent' ? s.fillColor : (s.color || '#6366f1')}
                                        stroke={s.color || '#4f46e5'}
                                        strokeWidth={s.strokeWidth || 2}
                                        opacity={0.75}
                                        rx={4}
                                    />
                                </g>
                            ))}

                            {/* Render Connectors */}
                            {resolvedShapes.filter(s => s.type === 'connector').map((conn) => {
                                const src = resolvedShapes.find(s => s.id === conn.sourceId) || resolvedImages.find(i => i.id === conn.sourceId);
                                const tgt = resolvedShapes.find(s => s.id === conn.targetId) || resolvedImages.find(i => i.id === conn.targetId);
                                const pt1 = src ? getAnchorPoint(src, conn.sourceAnchor || 'center') : (conn.sourcePoint || { x: 0, y: 0 });
                                const pt2 = tgt ? getAnchorPoint(tgt, conn.targetAnchor || 'center') : (conn.targetPoint || { x: 100, y: 100 });
                                return (
                                    <line
                                        key={conn.id}
                                        x1={pt1.x}
                                        y1={pt1.y}
                                        x2={pt2.x}
                                        y2={pt2.y}
                                        stroke={conn.color || '#6366f1'}
                                        strokeWidth={Math.max(conn.strokeWidth || 2, 4)}
                                        strokeOpacity={0.8}
                                        strokeDasharray={conn.strokeStyle === 'dashed' ? '6 6' : undefined}
                                    />
                                );
                            })}

                            {/* Render texts */}
                            {resolvedTexts.map((t) => (
                                <g
                                    key={t.id}
                                    transform={`rotate(${t.rotation || 0} ${(t.x || 0) + (t.width || 120)/2} ${(t.y || 0) + (t.height || 30)/2})`}
                                >
                                    <rect
                                        x={t.x || 0}
                                        y={t.y || 0}
                                        width={t.width || 120}
                                        height={t.height || 30}
                                        fill={t.bgColor && t.bgColor !== 'transparent' ? t.bgColor : '#94a3b8'}
                                        opacity={0.6}
                                        rx={2}
                                    />
                                </g>
                            ))}

                            {/* Render images */}
                            {resolvedImages.map((img) => (
                                <g
                                    key={img.id}
                                    transform={`rotate(${img.rotation || 0} ${(img.x || 0) + (img.width || 100)/2} ${(img.y || 0) + (img.height || 80)/2})`}
                                >
                                    <rect
                                        x={img.x || 0}
                                        y={img.y || 0}
                                        width={img.width || 100}
                                        height={img.height || 80}
                                        fill="#38bdf8"
                                        stroke="#0284c7"
                                        strokeWidth={2}
                                        opacity={0.7}
                                        rx={4}
                                    />
                                </g>
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

            {/* Bottom Zoom & Minimap Control Bar */}
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full shadow-2xl px-3 py-1.5 flex items-center gap-2">
                {/* Minimap Access Toggle Button */}
                <button
                    onClick={() => setIsExpanded(prev => !prev)}
                    className={`p-1.5 rounded-full transition flex items-center gap-1 ${
                        isExpanded 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                    title={isExpanded ? 'Hide Canvas Minimap' : 'Show Canvas Minimap'}
                >
                    <Map className="w-3.5 h-3.5 text-indigo-400" />
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3 text-slate-400" />}
                </button>

                <div className="w-px h-4 bg-slate-700" />

                {/* Zoom Out */}
                <button
                    onClick={zoomOut}
                    className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition active:scale-95"
                    title="Zoom Out (−)"
                >
                    <ZoomOut className="w-3.5 h-3.5" />
                </button>

                {/* Interactive Zoom Slider */}
                <input
                    type="range"
                    min="25"
                    max="300"
                    step="5"
                    value={Math.round(zoomLevel * 100)}
                    onChange={handleSliderChange}
                    className="w-16 sm:w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    title={`Zoom: ${Math.round(zoomLevel * 100)}%`}
                />

                {/* Zoom Reset Button */}
                <button
                    onClick={resetZoom}
                    className="px-2 py-0.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded-md text-xs font-mono font-bold transition flex items-center gap-1"
                    title="Reset Zoom to 100%"
                >
                    <span>{Math.round(zoomLevel * 100)}%</span>
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                </button>

                {/* Zoom In */}
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
