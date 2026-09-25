'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    ZoomIn, ZoomOut, RotateCcw, Map, ChevronUp, ChevronDown,
    Maximize, Minimize2, GripHorizontal
} from 'lucide-react';
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
    // Minimap preview toggle
    const [isMinimapExpanded, setIsMinimapExpanded] = useState(false);
    // Compact icon mode vs full bar mode
    const [isBarCollapsed, setIsBarCollapsed] = useState(false);
    const [isDraggingViewport, setIsDraggingViewport] = useState(false);
    const minimapRef = useRef(null);

    // Draggable position state (defaults to bottom-left, away from AI button at bottom-right)
    const [pos, setPos] = useState({ x: 24, y: 0 }); // y calculated on mount
    const [isDraggingBar, setIsDraggingBar] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    // Restore saved position and collapsed state
    useEffect(() => {
        try {
            const saved = localStorage.getItem('whiteboard_zoom_pos');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    const maxX = Math.max(10, (window.innerWidth || 1200) - 340);
                    const maxY = Math.max(60, (window.innerHeight || 800) - 60);
                    setPos({
                        x: Math.max(10, Math.min(maxX, parsed.x)),
                        y: Math.max(60, Math.min(maxY, parsed.y))
                    });
                } else {
                    setPos({ x: 24, y: Math.max(60, (window.innerHeight || 800) - 70) });
                }
                if (typeof parsed.isBarCollapsed === 'boolean') {
                    setIsBarCollapsed(parsed.isBarCollapsed);
                }
            } else {
                setPos({ x: 24, y: Math.max(60, (window.innerHeight || 800) - 70) });
            }
        } catch (e) {
            setPos({ x: 24, y: 650 });
        }
    }, []);

    const saveBarState = useCallback((newPos, collapsed) => {
        try {
            localStorage.setItem('whiteboard_zoom_pos', JSON.stringify({
                x: newPos.x,
                y: newPos.y,
                isBarCollapsed: collapsed
            }));
        } catch (e) {}
    }, []);

    // Dragging bar handler
    const handleDragStart = (e) => {
        const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        setIsDraggingBar(true);
        dragOffsetRef.current = {
            x: clientX - pos.x,
            y: clientY - pos.y
        };
        e.stopPropagation();
    };

    useEffect(() => {
        if (!isDraggingBar) return;

        const handleMove = (e) => {
            const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            const rawX = clientX - dragOffsetRef.current.x;
            const rawY = clientY - dragOffsetRef.current.y;

            const maxX = Math.max(10, (window.innerWidth || 1200) - 330);
            const maxY = Math.max(60, (window.innerHeight || 800) - 50);

            const boundedX = Math.max(10, Math.min(maxX, rawX));
            const boundedY = Math.max(60, Math.min(maxY, rawY));

            const newPos = { x: boundedX, y: boundedY };
            setPos(newPos);
            saveBarState(newPos, isBarCollapsed);
        };

        const handleUp = () => {
            setIsDraggingBar(false);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleUp);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDraggingBar, isBarCollapsed, saveBarState]);

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

        const newPanX = (containerW / 2) - (targetCanvasX * zoomLevel);
        const newPanY = (containerH / 2) - (targetCanvasY * zoomLevel);

        changePan({ x: Math.round(newPanX), y: Math.round(newPanY) });
    }, [canvasWidth, canvasHeight, containerRef, zoomLevel, changePan]);

    // Zoom Controls
    const zoomIn = useCallback((e) => {
        e?.stopPropagation();
        changeZoom(prev => Math.min(3, +(prev + 0.25).toFixed(2)));
    }, [changeZoom]);

    const zoomOut = useCallback((e) => {
        e?.stopPropagation();
        changeZoom(prev => Math.max(0.25, +(prev - 0.25).toFixed(2)));
    }, [changeZoom]);

    const resetZoom = useCallback((e) => {
        e?.stopPropagation();
        changeZoom(1);
        changePan({ x: 0, y: 0 });
    }, [changeZoom, changePan]);

    // Fit Canvas content to Screen
    const fitToScreen = useCallback((e) => {
        e?.stopPropagation();
        const allObjects = [...resolvedShapes, ...resolvedTexts, ...resolvedImages];
        let minX = 0, minY = 0, maxX = canvasWidth, maxY = canvasHeight;

        if (allObjects.length > 0) {
            minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity;
            allObjects.forEach(obj => {
                const ox = obj.x || 0;
                const oy = obj.y || 0;
                const ow = obj.width || 100;
                const oh = obj.height || 100;
                if (ox < minX) minX = ox;
                if (oy < minY) minY = oy;
                if (ox + ow > maxX) maxX = ox + ow;
                if (oy + oh > maxY) maxY = oy + oh;
            });
            // 60px padding
            minX -= 60; minY -= 60; maxX += 60; maxY += 60;
        }

        let containerW = containerRef?.current?.clientWidth || window.innerWidth || 1200;
        let containerH = containerRef?.current?.clientHeight || window.innerHeight || 700;

        const contentW = Math.max(100, maxX - minX);
        const contentH = Math.max(100, maxY - minY);

        const fitZoom = Math.max(0.25, Math.min(2.5, +(Math.min(containerW / contentW, containerH / contentH)).toFixed(2)));
        changeZoom(fitZoom);

        const targetCenterX = (minX + maxX) / 2;
        const targetCenterY = (minY + maxY) / 2;
        const newPanX = (containerW / 2) - (targetCenterX * fitZoom);
        const newPanY = (containerH / 2) - (targetCenterY * fitZoom);
        changePan({ x: Math.round(newPanX), y: Math.round(newPanY) });
    }, [resolvedShapes, resolvedTexts, resolvedImages, canvasWidth, canvasHeight, containerRef, changeZoom, changePan]);

    const handleSliderChange = (e) => {
        const val = parseFloat(e.target.value);
        changeZoom(+(val / 100).toFixed(2));
    };

    return (
        <div 
            style={{
                position: 'fixed',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                zIndex: 80
            }}
            className={`select-none transition-shadow ${isDraggingBar ? 'opacity-90' : ''}`}
        >
            {/* Collapsed Pill Button */}
            {isBarCollapsed ? (
                <div 
                    onClick={() => {
                        setIsBarCollapsed(false);
                        saveBarState(pos, false);
                    }}
                    className="bg-slate-900/95 border border-slate-700/80 text-white rounded-full px-3 py-1.5 shadow-2xl flex items-center gap-2 cursor-pointer hover:bg-slate-800 transition group hover:scale-105"
                    title="Expand Zoom & Minimap Controls"
                >
                    <div
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        className="cursor-grab p-0.5 text-slate-500 hover:text-indigo-400"
                        title="Drag to move zoom controls"
                    >
                        <GripHorizontal className="w-3.5 h-3.5" />
                    </div>
                    <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-mono font-bold text-slate-200">
                        {Math.round(zoomLevel * 100)}%
                    </span>
                    <ChevronUp className="w-3 h-3 text-slate-400 group-hover:text-white" />
                </div>
            ) : (
                /* Full Control Bar & Optional Minimap Popup */
                <div className="flex flex-col items-start gap-2">
                    {/* Minimap Viewport Popup */}
                    {isMinimapExpanded && (
                        <div 
                            className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-2.5 overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
                            style={{ width: `${MAP_WIDTH + 20}px` }}
                        >
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-xs font-semibold text-slate-300">
                                <span className="flex items-center gap-1.5">
                                    <Map className="w-3.5 h-3.5 text-indigo-400" /> Canvas Minimap
                                </span>
                                <button 
                                    onClick={() => setIsMinimapExpanded(false)}
                                    className="text-slate-400 hover:text-white p-0.5"
                                >
                                    ✕
                                </button>
                            </div>

                            <div
                                ref={minimapRef}
                                onMouseDown={handleMinimapPointer}
                                className="relative rounded-lg bg-slate-950/80 border border-slate-800 cursor-crosshair overflow-hidden mt-1.5 shadow-inner"
                                style={{ width: `${MAP_WIDTH}px`, height: `${MAP_HEIGHT}px` }}
                            >
                                <svg width={MAP_WIDTH} height={MAP_HEIGHT} className="absolute inset-0 pointer-events-none">
                                    {resolvedShapes.map(s => (
                                        <rect
                                            key={s.id}
                                            x={(s.x || 0) * scaleX}
                                            y={(s.y || 0) * scaleY}
                                            width={Math.max(2, (s.width || 40) * scaleX)}
                                            height={Math.max(2, (s.height || 40) * scaleY)}
                                            fill={s.fill || 'rgba(99, 102, 241, 0.4)'}
                                            stroke={s.color || '#818cf8'}
                                            strokeWidth="0.8"
                                        />
                                    ))}
                                    {resolvedImages.map(img => (
                                        <rect
                                            key={img.id}
                                            x={(img.x || 0) * scaleX}
                                            y={(img.y || 0) * scaleY}
                                            width={Math.max(2, (img.width || 40) * scaleX)}
                                            height={Math.max(2, (img.height || 40) * scaleY)}
                                            fill="rgba(16, 185, 129, 0.4)"
                                            stroke="#34d399"
                                            strokeWidth="0.8"
                                        />
                                    ))}
                                    {resolvedTexts.map(t => (
                                        <rect
                                            key={t.id}
                                            x={(t.x || 0) * scaleX}
                                            y={(t.y || 0) * scaleY}
                                            width={Math.max(4, (t.width || 60) * scaleX)}
                                            height={Math.max(2, (t.height || 20) * scaleY)}
                                            fill="rgba(244, 63, 94, 0.4)"
                                            stroke="#fb7185"
                                            strokeWidth="0.8"
                                        />
                                    ))}
                                </svg>

                                {/* Viewport Indicator Box */}
                                <div
                                    className="absolute border-2 border-indigo-400 bg-indigo-500/25 rounded shadow-sm pointer-events-none transition-all duration-75"
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

                    {/* Main Draggable Control Bar */}
                    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full shadow-2xl px-2.5 py-1 flex items-center gap-1.5 text-white">
                        {/* Drag Grip Handle */}
                        <div
                            onMouseDown={handleDragStart}
                            onTouchStart={handleDragStart}
                            className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-indigo-400 rounded-full"
                            title="Drag to reposition zoom bar"
                        >
                            <GripHorizontal className="w-3.5 h-3.5" />
                        </div>

                        {/* Minimap Access Toggle */}
                        <button
                            onClick={() => setIsMinimapExpanded(prev => !prev)}
                            className={`p-1.5 rounded-full transition flex items-center gap-1 ${
                                isMinimapExpanded 
                                    ? 'bg-indigo-600 text-white shadow-sm' 
                                    : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                            }`}
                            title={isMinimapExpanded ? 'Hide Canvas Minimap' : 'Show Canvas Minimap'}
                        >
                            <Map className="w-3.5 h-3.5 text-indigo-400" />
                        </button>

                        <div className="w-px h-3.5 bg-slate-700" />

                        {/* Zoom Out */}
                        <button
                            onClick={zoomOut}
                            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition active:scale-95"
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
                            className="w-14 sm:w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            title={`Zoom: ${Math.round(zoomLevel * 100)}%`}
                        />

                        {/* Zoom Reset Button */}
                        <button
                            onClick={resetZoom}
                            className="px-1.5 py-0.5 hover:bg-slate-800 text-slate-200 hover:text-white rounded text-[11px] font-mono font-bold transition flex items-center gap-1"
                            title="Reset Zoom to 100%"
                        >
                            <span>{Math.round(zoomLevel * 100)}%</span>
                            <RotateCcw className="w-2.5 h-2.5 text-slate-400" />
                        </button>

                        {/* Zoom In */}
                        <button
                            onClick={zoomIn}
                            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition active:scale-95"
                            title="Zoom In (+)"
                        >
                            <ZoomIn className="w-3.5 h-3.5" />
                        </button>

                        <div className="w-px h-3.5 bg-slate-700" />

                        {/* Fit to Screen */}
                        <button
                            onClick={fitToScreen}
                            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition"
                            title="Fit Canvas to Screen (9)"
                        >
                            <Maximize className="w-3.5 h-3.5" />
                        </button>

                        {/* Collapse Bar */}
                        <button
                            onClick={() => {
                                setIsBarCollapsed(true);
                                saveBarState(pos, true);
                            }}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition"
                            title="Collapse Zoom Bar"
                        >
                            <Minimize2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
