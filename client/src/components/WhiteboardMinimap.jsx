'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Map as MapIcon,
    Maximize,
    ChevronDown,
    X
} from 'lucide-react';
import {
    ArgonFullscreenIcon,
    ArgonFullscreenExitIcon,
    FluentToolIcon
} from './geometryTools/CustomToolbarIcons';

/**
 * Top-Right Minimalist Utility Capsule:
 * Combines Zoom Controls (- / % popover / + / Fit), Collapsible Canvas Minimap,
 * Viewport Screenshot Capture, and Fullscreen Toggle in one fixed top-right bar.
 */
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
    viewportWidth,
    viewportHeight,
    shapes = [],
    shapeObjects = [],
    texts = [],
    textObjects = [],
    images = [],
    imageObjects = [],
    isDrawing = false,
    onCaptureScreenshot,
    onToggleFullscreen,
    isFullscreen = false
}) {
    const [activePanel, setActivePanel] = useState(null); // null | 'zoom' | 'minimap'
    const [isDraggingViewport, setIsDraggingViewport] = useState(false);
    const minimapRef = useRef(null);
    const wrapperRef = useRef(null);

    // Close open downward popups when drawing begins or clicking outside
    useEffect(() => {
        if (isDrawing) {
            setActivePanel(null);
        }
    }, [isDrawing]);

    useEffect(() => {
        if (!activePanel) return;
        const handleOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setActivePanel(null);
            }
        };
        window.addEventListener('pointerdown', handleOutside);
        return () => window.removeEventListener('pointerdown', handleOutside);
    }, [activePanel]);

    const changeZoom = useCallback((updater) => {
        const fn = setZoomLevel || onZoomChange;
        if (typeof fn === 'function') fn(updater);
    }, [setZoomLevel, onZoomChange]);

    const changePan = useCallback((updater) => {
        const fn = setPanOffset || onPanChange;
        if (typeof fn === 'function') fn(updater);
    }, [setPanOffset, onPanChange]);

    const resolvedShapes = useMemo(() => (shapes && shapes.length > 0 ? shapes : shapeObjects) || [], [shapes, shapeObjects]);
    const resolvedTexts = useMemo(() => (texts && texts.length > 0 ? texts : textObjects) || [], [texts, textObjects]);
    const resolvedImages = useMemo(() => (images && images.length > 0 ? images : imageObjects) || [], [images, imageObjects]);

    const MAP_WIDTH = 216;
    const MAP_HEIGHT = 122;

    const bounds = useMemo(() => {
        const containerW = containerRef?.current?.clientWidth || viewportWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200);
        const containerH = containerRef?.current?.clientHeight || viewportHeight || (typeof window !== 'undefined' ? window.innerHeight : 700);
        const z = zoomLevel || 1;

        const vpCanvasW = containerW / z;
        const vpCanvasH = containerH / z;
        const vpCanvasX = (canvasWidth / 2) - (vpCanvasW / 2) - (panOffset.x || 0);
        const vpCanvasY = (canvasHeight / 2) - (vpCanvasH / 2) - (panOffset.y || 0);

        let minX = Math.min(0, vpCanvasX);
        let minY = Math.min(0, vpCanvasY);
        let maxX = Math.max(canvasWidth, vpCanvasX + vpCanvasW);
        let maxY = Math.max(canvasHeight, vpCanvasY + vpCanvasH);

        const allObjects = [...resolvedShapes, ...resolvedTexts, ...resolvedImages];
        allObjects.forEach((obj) => {
            if (!obj) return;
            const ox = obj.x ?? 0;
            const oy = obj.y ?? 0;
            const ow = obj.width ?? 60;
            const oh = obj.height ?? 40;
            if (ox < minX) minX = ox;
            if (oy < minY) minY = oy;
            if (ox + ow > maxX) maxX = ox + ow;
            if (oy + oh > maxY) maxY = oy + oh;
        });

        minX -= 80;
        minY -= 80;
        maxX += 80;
        maxY += 80;

        return {
            minX,
            minY,
            totalW: Math.max(200, maxX - minX),
            totalH: Math.max(120, maxY - minY),
            vpCanvasX,
            vpCanvasY,
            vpCanvasW,
            vpCanvasH
        };
    }, [containerRef, viewportWidth, viewportHeight, panOffset, zoomLevel, canvasWidth, canvasHeight, resolvedShapes, resolvedTexts, resolvedImages]);

    const viewportRect = useMemo(() => {
        const vpX = ((bounds.vpCanvasX - bounds.minX) / bounds.totalW) * MAP_WIDTH;
        const vpY = ((bounds.vpCanvasY - bounds.minY) / bounds.totalH) * MAP_HEIGHT;
        const vpW = (bounds.vpCanvasW / bounds.totalW) * MAP_WIDTH;
        const vpH = (bounds.vpCanvasH / bounds.totalH) * MAP_HEIGHT;

        return {
            x: Math.max(0, Math.min(MAP_WIDTH - 8, vpX)),
            y: Math.max(0, Math.min(MAP_HEIGHT - 8, vpY)),
            width: Math.max(8, Math.min(MAP_WIDTH, vpW)),
            height: Math.max(8, Math.min(MAP_HEIGHT, vpH))
        };
    }, [bounds]);

    const toMapX = useCallback((x) => ((x - bounds.minX) / bounds.totalW) * MAP_WIDTH, [bounds]);
    const toMapY = useCallback((y) => ((y - bounds.minY) / bounds.totalH) * MAP_HEIGHT, [bounds]);
    const toMapW = useCallback((w) => (w / bounds.totalW) * MAP_WIDTH, [bounds]);
    const toMapH = useCallback((h) => (h / bounds.totalH) * MAP_HEIGHT, [bounds]);

    const updatePanFromMinimapPointer = useCallback((clientX, clientY) => {
        if (!minimapRef.current) return;
        const rect = minimapRef.current.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(MAP_WIDTH, clientX - rect.left));
        const clickY = Math.max(0, Math.min(MAP_HEIGHT, clientY - rect.top));

        const targetCanvasX = bounds.minX + (clickX / MAP_WIDTH) * bounds.totalW;
        const targetCanvasY = bounds.minY + (clickY / MAP_HEIGHT) * bounds.totalH;

        changePan({
            x: Math.round((canvasWidth / 2) - targetCanvasX),
            y: Math.round((canvasHeight / 2) - targetCanvasY)
        });
    }, [bounds, canvasWidth, canvasHeight, changePan]);

    useEffect(() => {
        if (!isDraggingViewport) return;
        const handleMove = (e) => {
            updatePanFromMinimapPointer(e.clientX, e.clientY);
        };
        const handleUp = () => setIsDraggingViewport(false);
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);
        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('pointercancel', handleUp);
        };
    }, [isDraggingViewport, updatePanFromMinimapPointer]);

    const zoomIn = useCallback((e) => {
        e?.stopPropagation();
        changeZoom(prev => Math.min(5, +(prev + 0.25).toFixed(2)));
    }, [changeZoom]);

    const zoomOut = useCallback((e) => {
        e?.stopPropagation();
        changeZoom(prev => Math.max(0.1, +(prev - 0.25).toFixed(2)));
    }, [changeZoom]);

    const resetZoom = useCallback((e) => {
        e?.stopPropagation();
        changeZoom(1);
        changePan({ x: 0, y: 0 });
    }, [changeZoom, changePan]);

    const fitToScreen = useCallback((e) => {
        e?.stopPropagation();
        const allObjects = [...resolvedShapes, ...resolvedTexts, ...resolvedImages];
        let minX = 0, minY = 0, maxX = canvasWidth, maxY = canvasHeight;

        if (allObjects.length > 0) {
            minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity;
            allObjects.forEach((obj) => {
                if (!obj) return;
                const ox = obj.x || 0;
                const oy = obj.y || 0;
                const ow = obj.width || 100;
                const oh = obj.height || 100;
                if (ox < minX) minX = ox;
                if (oy < minY) minY = oy;
                if (ox + ow > maxX) maxX = ox + ow;
                if (oy + oh > maxY) maxY = oy + oh;
            });
            minX -= 60; minY -= 60; maxX += 60; maxY += 60;
        }

        const containerW = containerRef?.current?.clientWidth || viewportWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200);
        const containerH = containerRef?.current?.clientHeight || viewportHeight || (typeof window !== 'undefined' ? window.innerHeight : 700);
        const contentW = Math.max(100, maxX - minX);
        const contentH = Math.max(100, maxY - minY);

        const fitZoom = Math.max(0.25, Math.min(2.5, +(Math.min(containerW / contentW, containerH / contentH)).toFixed(2)));
        changeZoom(fitZoom);
        changePan({
            x: Math.round((canvasWidth / 2) - ((minX + maxX) / 2)),
            y: Math.round((canvasHeight / 2) - ((minY + maxY) / 2))
        });
    }, [resolvedShapes, resolvedTexts, resolvedImages, canvasWidth, canvasHeight, containerRef, viewportWidth, viewportHeight, changeZoom, changePan]);

    const handleSliderChange = (e) => {
        const val = parseFloat(e.target.value);
        changeZoom(+(val / 100).toFixed(2));
    };

    const pct = Math.round((zoomLevel || 1) * 100);

    return (
        <div
            ref={wrapperRef}
            data-interactive="true"
            onPointerDown={(e) => e.stopPropagation()}
            className={`whiteboard-minimap absolute top-2.5 right-3 z-40 select-none transition-opacity duration-200 ${
                isDrawing ? 'opacity-20 pointer-events-none' : 'opacity-95 hover:opacity-100'
            }`}
        >
            {/* Unified Top-Right Minimalist Capsule */}
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-xl h-9 px-1 flex items-center gap-0.5 text-slate-200">
                <button
                    type="button"
                    onClick={zoomOut}
                    className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
                    title="Zoom Out (-)"
                    aria-label="Zoom Out"
                >
                    <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
                </button>

                <button
                    type="button"
                    onClick={() => setActivePanel(prev => (prev === 'zoom' ? null : 'zoom'))}
                    className={`h-7 px-1.5 rounded-lg text-[11px] font-mono font-bold flex items-center gap-0.5 transition ${
                        activePanel === 'zoom' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-100'
                    }`}
                    title="Zoom Controls & Fit to Screen"
                    aria-label={`Zoom ${pct}%`}
                    aria-expanded={activePanel === 'zoom'}
                >
                    <span>{pct}%</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${activePanel === 'zoom' ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>

                <button
                    type="button"
                    onClick={zoomIn}
                    className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
                    title="Zoom In (+)"
                    aria-label="Zoom In"
                >
                    <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                </button>

                <div className="w-px h-4 bg-slate-700/80 mx-0.5" />

                {/* Minimap Toggle */}
                <button
                    type="button"
                    onClick={() => setActivePanel(prev => (prev === 'minimap' ? null : 'minimap'))}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition ${
                        activePanel === 'minimap' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                    title={activePanel === 'minimap' ? 'Hide Canvas Minimap' : 'Show Canvas Minimap'}
                    aria-label="Toggle Canvas Minimap"
                    aria-expanded={activePanel === 'minimap'}
                >
                    <MapIcon className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                </button>

                {/* Viewport Screenshot Trigger */}
                {onCaptureScreenshot && (
                    <button
                        type="button"
                        onClick={() => {
                            setActivePanel(null);
                            onCaptureScreenshot();
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
                        title="Capture Viewport Screenshot"
                        aria-label="Capture Viewport Screenshot"
                    >
                        <FluentToolIcon icon="fluent:camera-24-regular" className="w-4 h-4 text-sky-400" />
                    </button>
                )}

                {/* Single Fullscreen Toggle */}
                {onToggleFullscreen && (
                    <button
                        type="button"
                        onClick={onToggleFullscreen}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition group"
                        title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Maximize Whiteboard (F)'}
                        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Maximize Whiteboard'}
                    >
                        {isFullscreen ? (
                            <ArgonFullscreenExitIcon className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" aria-hidden="true" />
                        ) : (
                            <ArgonFullscreenIcon className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" aria-hidden="true" />
                        )}
                    </button>
                )}
            </div>

            {/* Downward Zoom Slider & Fit Popover */}
            {activePanel === 'zoom' && (
                <div className="absolute top-full right-0 mt-2 w-60 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-3 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                        <span>Viewport Zoom</span>
                        <span className="font-mono text-white">{pct}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={zoomOut}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                            aria-label="Zoom Out"
                        >
                            <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <input
                            type="range"
                            min="10"
                            max="500"
                            step="5"
                            value={pct}
                            onChange={handleSliderChange}
                            className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <button
                            type="button"
                            onClick={zoomIn}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                            aria-label="Zoom In"
                        >
                            <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800 text-xs">
                        <button
                            type="button"
                            onClick={resetZoom}
                            className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-1 transition"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset 100%</span>
                        </button>
                        <button
                            type="button"
                            onClick={fitToScreen}
                            className="py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-1 transition"
                        >
                            <Maximize className="w-3 h-3" />
                            <span>Fit Screen</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Downward Interactive Canvas Minimap Popover */}
            {activePanel === 'minimap' && (
                <div
                    className="absolute top-full right-0 mt-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-2.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                    style={{ width: `${MAP_WIDTH + 20}px` }}
                >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-xs font-semibold text-slate-300">
                        <span className="flex items-center gap-1.5">
                            <MapIcon className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Canvas Minimap</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => setActivePanel(null)}
                            className="text-slate-400 hover:text-white p-0.5 rounded"
                            aria-label="Close Minimap"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div
                        ref={minimapRef}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            setIsDraggingViewport(true);
                            updatePanFromMinimapPointer(e.clientX, e.clientY);
                        }}
                        className="relative rounded-lg bg-slate-950/90 border border-slate-800 cursor-crosshair overflow-hidden mt-2 shadow-inner"
                        style={{ width: `${MAP_WIDTH}px`, height: `${MAP_HEIGHT}px`, touchAction: 'none' }}
                    >
                        <svg width={MAP_WIDTH} height={MAP_HEIGHT} className="absolute inset-0 pointer-events-none">
                            {resolvedShapes.map((s) => (
                                <rect
                                    key={s.id}
                                    x={toMapX(s.x || 0)}
                                    y={toMapY(s.y || 0)}
                                    width={Math.max(2, toMapW(s.width || 40))}
                                    height={Math.max(2, toMapH(s.height || 40))}
                                    fill={s.fill || 'rgba(99, 102, 241, 0.35)'}
                                    stroke={s.color || '#818cf8'}
                                    strokeWidth="0.8"
                                />
                            ))}
                            {resolvedImages.map((img) => (
                                <rect
                                    key={img.id}
                                    x={toMapX(img.x || 0)}
                                    y={toMapY(img.y || 0)}
                                    width={Math.max(2, toMapW(img.width || 40))}
                                    height={Math.max(2, toMapH(img.height || 40))}
                                    fill="rgba(16, 185, 129, 0.35)"
                                    stroke="#34d399"
                                    strokeWidth="0.8"
                                />
                            ))}
                            {resolvedTexts.map((t) => (
                                <rect
                                    key={t.id}
                                    x={toMapX(t.x || 0)}
                                    y={toMapY(t.y || 0)}
                                    width={Math.max(4, toMapW(t.width || 60))}
                                    height={Math.max(2, toMapH(t.height || 20))}
                                    fill="rgba(244, 63, 94, 0.35)"
                                    stroke="#fb7185"
                                    strokeWidth="0.8"
                                />
                            ))}
                        </svg>

                        {/* Current Viewport Indicator Box */}
                        <div
                            className="absolute border-2 border-indigo-400 bg-indigo-500/20 rounded pointer-events-none transition-all duration-75"
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
        </div>
    );
}
