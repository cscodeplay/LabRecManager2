'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    FileText, ChevronLeft, ChevronRight, Maximize2, Minimize2,
    Lock, Unlock, Trash2, ExternalLink, RotateCcw,
    ZoomIn, ZoomOut, Crosshair, Hand, Loader2, AlertCircle
} from 'lucide-react';
import { getPdfJs } from '@/lib/pdfjsLoader';

// Helper to safely load PDF binary data across local, blob, and remote URLs
async function fetchPdfData(url) {
    if (!url) throw new Error('No PDF URL provided');

    // 1. Direct fetch if blob:, data:, or relative path
    if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/')) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.arrayBuffer();
    }

    // 2. Direct fetch for remote URL
    try {
        const res = await fetch(url);
        if (res.ok) {
            return await res.arrayBuffer();
        }
    } catch (e) {
        console.warn('[WhiteboardPdfViewer] Direct fetch failed, trying stream proxy:', e.message);
    }

    // 3. Fallback to server stream proxy to bypass CORS
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const proxyUrl = `${apiUrl}/documents/stream-proxy?url=${encodeURIComponent(url)}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const res = await fetch(proxyUrl, { headers });
    if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
    return await res.arrayBuffer();
}

export default function WhiteboardPdfViewer({
    pdf,
    isSelected = false,
    onSelect,
    onUpdate,
    onDelete,
    onDuplicate,
    onCenter,
    scale = 1
}) {
    const [currentPage, setCurrentPage] = useState(pdf.page || 1);
    const [totalPages, setTotalPages] = useState(pdf.totalPages || 1);
    const [isCollapsed, setIsCollapsed] = useState(pdf.isCollapsed ?? false);
    const [isLocked, setIsLocked] = useState(pdf.isLocked ?? false);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [activeHandle, setActiveHandle] = useState(null);

    // Zoom & Pan / Hand Tool State
    const [pdfZoom, setPdfZoom] = useState(pdf.zoomLevel || 1.0);
    const [isHandToolActive, setIsHandToolActive] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [isEditingPage, setIsEditingPage] = useState(false);
    const [pageInputValue, setPageInputValue] = useState(String(pdf.page || 1));

    // PDF.js Engine State
    const [pdfDoc, setPdfDoc] = useState(null);
    const [loadingPdf, setLoadingPdf] = useState(true);
    const [pdfError, setPdfError] = useState(null);
    const [useNativeFallback, setUseNativeFallback] = useState(false);
    const [renderedPages, setRenderedPages] = useState(new Set());

    // Refs
    const containerRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const pageContainersRef = useRef({});
    const canvasRefs = useRef({});
    const renderTasksRef = useRef({});
    const dragStartRef = useRef({ x: 0, y: 0, objX: 0, objY: 0 });
    const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0, objX: 0, objY: 0 });
    const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
    const isProgrammaticScrollRef = useRef(false);

    const handleSize = 10;
    const rawPdfUrl = pdf.src || pdf.url || '';

    // Synchronize external prop updates
    useEffect(() => {
        if (typeof pdf.isCollapsed === 'boolean') setIsCollapsed(pdf.isCollapsed);
        if (typeof pdf.isLocked === 'boolean') setIsLocked(pdf.isLocked);
        if (pdf.totalPages && pdf.totalPages > 1 && !pdfDoc) {
            setTotalPages(pdf.totalPages);
        }
        if (pdf.page && !pdfDoc) {
            const clamped = Math.max(1, pdf.page);
            setCurrentPage(clamped);
            setPageInputValue(String(clamped));
        }
        if (pdf.zoomLevel !== undefined) {
            setPdfZoom(pdf.zoomLevel);
        }
    }, [pdf.isCollapsed, pdf.isLocked, pdf.page, pdf.totalPages, pdf.zoomLevel, pdfDoc]);

    // Load PDF document using PDF.js for high-fidelity vector rendering
    useEffect(() => {
        if (!rawPdfUrl) {
            setLoadingPdf(false);
            return;
        }

        let isMounted = true;
        setLoadingPdf(true);
        setPdfError(null);

        (async () => {
            try {
                const pdfjs = await getPdfJs();
                if (!pdfjs || !isMounted) {
                    throw new Error('PDF.js engine could not be initialized');
                }

                let loadingTask;
                try {
                    // Try buffer loading first for highest speed and reliability
                    const data = await fetchPdfData(rawPdfUrl);
                    if (!isMounted) return;
                    loadingTask = pdfjs.getDocument({
                        data,
                        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                        cMapPacked: true
                    });
                } catch (fetchErr) {
                    console.warn('[WhiteboardPdfViewer] Buffer fetch failed, trying direct URL:', fetchErr.message);
                    loadingTask = pdfjs.getDocument({
                        url: rawPdfUrl,
                        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                        cMapPacked: true
                    });
                }

                const doc = await loadingTask.promise;
                if (!isMounted) return;

                setPdfDoc(doc);
                setTotalPages(doc.numPages);
                onUpdate?.({ totalPages: doc.numPages });
                setLoadingPdf(false);
            } catch (err) {
                console.warn('[WhiteboardPdfViewer] PDF.js rendering initialization error:', err);
                if (isMounted) {
                    setPdfError(err.message || 'Failed to render PDF with vector engine');
                    setUseNativeFallback(true);
                    setLoadingPdf(false);
                }
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [rawPdfUrl]);

    // Render individual page canvas with Retina/High-DPI resolution
    const renderPage = useCallback(async (pageNum) => {
        if (!pdfDoc) return;
        const canvas = canvasRefs.current[pageNum];
        if (!canvas) return;

        // Cancel any pending render task on this page
        if (renderTasksRef.current[pageNum]) {
            try {
                renderTasksRef.current[pageNum].cancel();
            } catch {}
            delete renderTasksRef.current[pageNum];
        }

        try {
            const page = await pdfDoc.getPage(pageNum);
            const initialViewport = page.getViewport({ scale: 1.0 });

            // Calculate base container display width
            const containerWidth = Math.max(280, (pdf.width || 500) - 28);
            const baseScale = Math.max(0.4, (containerWidth / initialViewport.width));
            const currentScale = baseScale * pdfZoom;

            const viewport = page.getViewport({ scale: currentScale });

            // High-DPI Crisp Multiplier: Render at 2x+ pixel density (takes canvas zoom into account)
            const canvasScaleFactor = Math.max(1, Math.min(2.5, scale || 1));
            const pixelRatio = typeof window !== 'undefined'
                ? Math.min(3.5, Math.max(window.devicePixelRatio || 1, 2) * canvasScaleFactor)
                : 2;

            canvas.width = Math.floor(viewport.width * pixelRatio);
            canvas.height = Math.floor(viewport.height * pixelRatio);
            canvas.style.width = `${Math.floor(viewport.width)}px`;
            canvas.style.height = `${Math.floor(viewport.height)}px`;

            const ctx = canvas.getContext('2d', { alpha: false });
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            const renderContext = {
                canvasContext: ctx,
                transform: [pixelRatio, 0, 0, pixelRatio, 0, 0],
                viewport
            };

            const task = page.render(renderContext);
            renderTasksRef.current[pageNum] = task;
            await task.promise;
            delete renderTasksRef.current[pageNum];

            setRenderedPages(prev => new Set(prev).add(pageNum));
        } catch (err) {
            if (err?.name !== 'RenderingCancelledException') {
                console.warn(`[WhiteboardPdfViewer] Page ${pageNum} render error:`, err);
            }
        }
    }, [pdfDoc, pdf.width, pdfZoom, scale]);

    // Reset rendered pages set when zoom or width changes to force crisp re-rendering
    useEffect(() => {
        setRenderedPages(new Set());
    }, [pdfZoom, pdf.width]);

    // Lazy load and render pages with IntersectionObserver as the user scrolls
    useEffect(() => {
        if (!pdfDoc || !scrollContainerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const pageNum = parseInt(entry.target.getAttribute('data-page-number'), 10);
                        if (pageNum && !renderedPages.has(pageNum)) {
                            renderPage(pageNum);
                        }
                    }
                });
            },
            {
                root: scrollContainerRef.current,
                rootMargin: '400px 0px 400px 0px' // Pre-render pages before they enter viewport
            }
        );

        Object.values(pageContainersRef.current).forEach((el) => {
            if (el) observer.observe(el);
        });

        // Always render current page immediately
        renderPage(currentPage);

        return () => observer.disconnect();
    }, [pdfDoc, renderedPages, renderPage, currentPage]);

    // Real-time page number calculation on scrolling using viewport overlap ratio
    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container || !pdfDoc || isProgrammaticScrollRef.current) return;

        const containerRect = container.getBoundingClientRect();
        let visiblePage = currentPage;
        let maxVisibleRatio = 0;

        for (let p = 1; p <= totalPages; p++) {
            const pageEl = pageContainersRef.current[p];
            if (pageEl) {
                const r = pageEl.getBoundingClientRect();
                const visibleTop = Math.max(r.top, containerRect.top);
                const visibleBottom = Math.min(r.bottom, containerRect.bottom);
                const visibleHeight = Math.max(0, visibleBottom - visibleTop);

                if (visibleHeight > 0) {
                    const ratio = visibleHeight / Math.min(r.height, containerRect.height);
                    if (ratio > maxVisibleRatio) {
                        maxVisibleRatio = ratio;
                        visiblePage = p;
                    }
                }
            }
        }

        if (visiblePage !== currentPage) {
            setCurrentPage(visiblePage);
            setPageInputValue(String(visiblePage));
            onUpdate?.({ page: visiblePage });
        }
    }, [pdfDoc, totalPages, currentPage, onUpdate]);

    // Programmatic smooth scroll to specific page
    const scrollToPage = useCallback((targetPage) => {
        const pageEl = pageContainersRef.current[targetPage];
        const container = scrollContainerRef.current;
        if (pageEl && container) {
            isProgrammaticScrollRef.current = true;
            pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => {
                isProgrammaticScrollRef.current = false;
            }, 350);
        }
    }, []);

    // Page navigation button handlers
    const handlePrevPage = (e) => {
        e?.stopPropagation?.();
        if (currentPage > 1) {
            const next = currentPage - 1;
            setCurrentPage(next);
            setPageInputValue(String(next));
            onUpdate?.({ page: next });
            scrollToPage(next);
        }
    };

    const handleNextPage = (e) => {
        e?.stopPropagation?.();
        if (currentPage < totalPages) {
            const next = currentPage + 1;
            setCurrentPage(next);
            setPageInputValue(String(next));
            onUpdate?.({ page: next });
            scrollToPage(next);
        }
    };

    const handlePageSubmit = (e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        const targetPage = parseInt(pageInputValue, 10);
        if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
            setCurrentPage(targetPage);
            onUpdate?.({ page: targetPage });
            scrollToPage(targetPage);
        } else {
            setPageInputValue(String(currentPage));
        }
        setIsEditingPage(false);
    };

    // Zoom Controls: Crisp High-DPI updates
    const handleZoomIn = (e) => {
        e?.stopPropagation?.();
        const next = Math.min(3.0, +(pdfZoom + 0.25).toFixed(2));
        setPdfZoom(next);
        onUpdate?.({ zoomLevel: next });
        if (next > 1.0) {
            setIsHandToolActive(true); // Automatically activate Hand tool when zoomed in
        }
    };

    const handleZoomOut = (e) => {
        e?.stopPropagation?.();
        const next = Math.max(0.5, +(pdfZoom - 0.25).toFixed(2));
        setPdfZoom(next);
        onUpdate?.({ zoomLevel: next });
        if (next <= 1.0) {
            setIsHandToolActive(false);
        }
    };

    const handleResetZoom = (e) => {
        e?.stopPropagation?.();
        setPdfZoom(1.0);
        setIsHandToolActive(false);
        onUpdate?.({ zoomLevel: 1.0 });
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
        }
    };

    const handleCenter = (e) => {
        e?.stopPropagation?.();
        setPdfZoom(1.0);
        setIsHandToolActive(false);
        onUpdate?.({ zoomLevel: 1.0 });
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
        }
        onCenter?.(pdf);
    };

    // Keyboard Shortcuts (Space for Pan, Delete/Backspace for removal)
    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = e.target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

            if (e.code === 'Space' && !isSpacePressed) {
                setIsSpacePressed(true);
            }
            if (isSelected && (e.key === 'Delete' || e.key === 'Backspace')) {
                e.preventDefault();
                e.stopPropagation();
                onDelete?.(pdf.id);
            }
        };

        const handleKeyUp = (e) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false);
                setIsPanning(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isSelected, isSpacePressed, pdf.id, onDelete]);

    // Hand Tool Pan drag handlers
    const handlePanPointerDown = (e) => {
        const shouldPan = isHandToolActive || isSpacePressed || e.button === 1;
        if (!shouldPan) return;

        e.stopPropagation();
        e.preventDefault();
        setIsPanning(true);

        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

        panStartRef.current = {
            x: clientX,
            y: clientY,
            scrollLeft: scrollContainerRef.current?.scrollLeft || 0,
            scrollTop: scrollContainerRef.current?.scrollTop || 0
        };
    };

    const handlePanPointerMove = useCallback((e) => {
        if (!isPanning || !scrollContainerRef.current) return;
        e.stopPropagation();
        e.preventDefault();

        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

        const dx = clientX - panStartRef.current.x;
        const dy = clientY - panStartRef.current.y;

        scrollContainerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
        scrollContainerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
    }, [isPanning]);

    const handlePanPointerUp = useCallback(() => {
        if (isPanning) {
            setIsPanning(false);
        }
    }, [isPanning]);

    useEffect(() => {
        if (!isPanning) return;
        window.addEventListener('pointermove', handlePanPointerMove);
        window.addEventListener('pointerup', handlePanPointerUp);
        window.addEventListener('touchmove', handlePanPointerMove, { passive: false });
        window.addEventListener('touchend', handlePanPointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePanPointerMove);
            window.removeEventListener('pointerup', handlePanPointerUp);
            window.removeEventListener('touchmove', handlePanPointerMove);
            window.removeEventListener('touchend', handlePanPointerUp);
        };
    }, [isPanning, handlePanPointerMove, handlePanPointerUp]);

    // Window Inset Dragging
    const handleDragStart = (e) => {
        if (isLocked) return;
        e.stopPropagation();
        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

        setIsDragging(true);
        dragStartRef.current = {
            x: clientX,
            y: clientY,
            objX: pdf.x || 0,
            objY: pdf.y || 0
        };
        onSelect?.(pdf.id);
    };

    // Window Inset Resizing
    const handleResizeStart = (e, handle) => {
        if (isLocked) return;
        e.stopPropagation();
        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

        setIsResizing(true);
        setActiveHandle(handle);
        resizeStartRef.current = {
            x: clientX,
            y: clientY,
            w: pdf.width || 500,
            h: pdf.height || 640,
            objX: pdf.x || 0,
            objY: pdf.y || 0
        };
        onSelect?.(pdf.id);
    };

    // Global Pointer Move & Up listeners for Inset Drag/Resize
    useEffect(() => {
        if (!isDragging && !isResizing) return;

        const handlePointerMove = (e) => {
            const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
            const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

            if (isDragging) {
                const dx = (clientX - dragStartRef.current.x) / (scale || 1);
                const dy = (clientY - dragStartRef.current.y) / (scale || 1);
                onUpdate?.({
                    x: Math.round(dragStartRef.current.objX + dx),
                    y: Math.round(dragStartRef.current.objY + dy)
                });
            } else if (isResizing && activeHandle) {
                const dx = (clientX - resizeStartRef.current.x) / (scale || 1);
                const dy = (clientY - resizeStartRef.current.y) / (scale || 1);
                const { w, h, objX, objY } = resizeStartRef.current;

                let newW = w;
                let newH = h;
                let newX = objX;
                let newY = objY;

                const minW = 300;
                const minH = 220;

                if (activeHandle.includes('e')) newW = Math.max(minW, w + dx);
                if (activeHandle.includes('s')) newH = Math.max(minH, h + dy);
                if (activeHandle.includes('w')) {
                    const candidateW = Math.max(minW, w - dx);
                    newX = objX + (w - candidateW);
                    newW = candidateW;
                }
                if (activeHandle.includes('n')) {
                    const candidateH = Math.max(minH, h - dy);
                    newY = objY + (h - candidateH);
                    newH = candidateH;
                }

                onUpdate?.({
                    x: Math.round(newX),
                    y: Math.round(newY),
                    width: Math.round(newW),
                    height: Math.round(newH)
                });
            }
        };

        const handlePointerUp = () => {
            setIsDragging(false);
            setIsResizing(false);
            setActiveHandle(null);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('touchmove', handlePointerMove);
        window.addEventListener('touchend', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        };
    }, [isDragging, isResizing, activeHandle, scale, onUpdate]);

    const isCursorPan = isHandToolActive || isSpacePressed;

    return (
        <div
            ref={containerRef}
            onClick={(e) => {
                e.stopPropagation();
                onSelect?.(pdf.id);
            }}
            style={{
                position: 'absolute',
                left: `${pdf.x || 0}px`,
                top: `${pdf.y || 0}px`,
                width: `${pdf.width || 500}px`,
                height: isCollapsed ? 'auto' : `${pdf.height || 640}px`,
                zIndex: isSelected ? 45 : (pdf.zIndex || 25),
                transform: `rotate(${pdf.rotation || 0}deg)`,
                transformOrigin: 'center center'
            }}
            className={`group select-none rounded-2xl shadow-2xl transition-shadow ${
                isSelected ? 'ring-2 ring-red-500 shadow-red-500/20' : 'ring-1 ring-slate-700/80 hover:ring-slate-500/80'
            }`}
        >
            <div className="flex flex-col h-full bg-slate-900 border border-slate-700/90 rounded-2xl overflow-hidden backdrop-blur-md">
                {/* Header Bar */}
                <div
                    onPointerDown={handleDragStart}
                    onTouchStart={handleDragStart}
                    className="flex items-center justify-between px-3 py-2 bg-slate-800/95 border-b border-slate-700/80 cursor-grab active:cursor-grabbing text-slate-200 select-none"
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 rounded-md bg-red-600/20 text-red-400 border border-red-500/30">
                            <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold truncate max-w-[110px] sm:max-w-[150px]" title={pdf.title || 'PDF Document'}>
                            {pdf.title || 'PDF Document'}
                        </span>
                    </div>

                    {/* Controls: Page Navigation, Zoom, Hand Tool, Center & Actions */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {!isCollapsed && (
                            <>
                                {/* Real-Time Page Navigator */}
                                <div className="flex items-center bg-slate-900/90 rounded-lg px-1.5 py-0.5 border border-slate-700/70 mr-0.5 text-[11px] font-mono text-slate-300 shadow-inner">
                                    <button
                                        type="button"
                                        onClick={handlePrevPage}
                                        disabled={currentPage <= 1}
                                        className="p-0.5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                                        title="Previous Page"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>

                                    {isEditingPage ? (
                                        <form onSubmit={handlePageSubmit} className="inline-flex items-center mx-1">
                                            <input
                                                type="number"
                                                min="1"
                                                max={totalPages}
                                                value={pageInputValue}
                                                onChange={(e) => setPageInputValue(e.target.value)}
                                                onBlur={handlePageSubmit}
                                                autoFocus
                                                className="w-8 text-center text-[10.5px] font-bold bg-slate-800 text-white rounded px-0.5 border border-red-500 outline-none"
                                            />
                                            <span className="text-[10px] text-slate-400 ml-1">/ {totalPages}</span>
                                        </form>
                                    ) : (
                                        <span
                                            onClick={() => setIsEditingPage(true)}
                                            className="px-1 text-[10.5px] font-semibold tracking-tight text-slate-200 cursor-pointer hover:text-sky-300 hover:underline select-none"
                                            title="Click to jump to page number"
                                        >
                                            {currentPage} / {totalPages}
                                        </span>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleNextPage}
                                        disabled={currentPage >= totalPages}
                                        className="p-0.5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                                        title="Next Page"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Zoom Controls: Out, % / Reset, In */}
                                <div className="flex items-center bg-slate-900/90 rounded-lg px-1 py-0.5 border border-slate-700/70 mr-0.5 text-[10.5px] font-mono text-slate-300 shadow-inner">
                                    <button
                                        type="button"
                                        onClick={handleZoomOut}
                                        disabled={pdfZoom <= 0.5}
                                        className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                                        title="Zoom Out (-25%)"
                                    >
                                        <ZoomOut className="w-3 h-3" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResetZoom}
                                        className="px-1 text-[10px] font-semibold text-sky-400 hover:text-sky-200 transition"
                                        title="Click to reset zoom to 100%"
                                    >
                                        {Math.round(pdfZoom * 100)}%
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleZoomIn}
                                        disabled={pdfZoom >= 3.0}
                                        className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                                        title="Zoom In (+25%)"
                                    >
                                        <ZoomIn className="w-3 h-3" />
                                    </button>
                                </div>

                                {/* Hand / Pan Tool Toggle Button */}
                                <button
                                    type="button"
                                    onClick={() => setIsHandToolActive(prev => !prev)}
                                    className={`p-1 rounded-lg transition ${
                                        isHandToolActive
                                            ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                                            : 'hover:bg-slate-700/60 text-slate-400 hover:text-slate-200'
                                    }`}
                                    title={isHandToolActive ? 'Hand Tool Active (Click & drag anywhere to Pan across page, Spacebar also pans)' : 'Enable Hand Tool (Pan across page)'}
                                >
                                    <Hand className="w-3.5 h-3.5" />
                                </button>

                                {/* Center PDF Button */}
                                <button
                                    type="button"
                                    onClick={handleCenter}
                                    className="p-1 hover:bg-slate-700/60 text-slate-400 hover:text-sky-300 rounded transition"
                                    title="Center PDF View & Center on Canvas"
                                >
                                    <Crosshair className="w-3.5 h-3.5" />
                                </button>
                            </>
                        )}

                        {/* Open in new tab */}
                        {rawPdfUrl && (
                            <a
                                href={rawPdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 rounded transition"
                                title="Open PDF in new tab"
                            >
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}

                        {/* Lock / Unlock */}
                        <button
                            type="button"
                            onClick={() => onUpdate?.({ isLocked: !isLocked })}
                            className={`p-1 rounded transition ${isLocked ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'}`}
                            title={isLocked ? 'Unlock PDF Inset' : 'Lock PDF Inset'}
                        >
                            {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>

                        {/* Collapse / Expand */}
                        <button
                            type="button"
                            onClick={() => onUpdate?.({ isCollapsed: !isCollapsed })}
                            className="p-1 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 rounded transition"
                            title={isCollapsed ? 'Expand PDF Viewer' : 'Collapse PDF Viewer'}
                        >
                            {isCollapsed ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                        </button>

                        {/* Delete */}
                        <button
                            type="button"
                            onClick={() => onDelete?.(pdf.id)}
                            className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition"
                            title="Remove PDF from Canvas"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* PDF Viewer Body: High-DPI Vector Canvas with Pan / Hand Tool */}
                {!isCollapsed && (
                    <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        onPointerDown={handlePanPointerDown}
                        style={{
                            cursor: isPanning ? 'grabbing' : (isCursorPan ? 'grab' : 'default')
                        }}
                        className="relative flex-1 w-full bg-slate-950/95 overflow-auto select-none touch-pan-x touch-pan-y"
                    >
                        {loadingPdf && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-xs text-slate-300 gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                                <span className="text-xs font-medium">Rendering high-resolution PDF...</span>
                            </div>
                        )}

                        {rawPdfUrl ? (
                            !useNativeFallback && pdfDoc ? (
                                <div className="flex flex-col items-center py-4 px-2 gap-4 min-w-full">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                        <div
                                            key={`pdf-page-container-${pdf.id}-${pageNum}`}
                                            ref={el => { pageContainersRef.current[pageNum] = el; }}
                                            data-page-number={pageNum}
                                            className="relative bg-white rounded-lg shadow-xl overflow-hidden border border-slate-700/50 transition-transform duration-75"
                                        >
                                            <canvas
                                                ref={el => {
                                                    canvasRefs.current[pageNum] = el;
                                                    if (el && !renderedPages.has(pageNum)) {
                                                        renderPage(pageNum);
                                                    }
                                                }}
                                                className="block max-w-none bg-white"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Native Fallback Embed (if PDF.js was blocked or failed) */
                                <div className="w-full h-full min-w-full min-h-full">
                                    <object
                                        data={`${rawPdfUrl}#page=${currentPage}&toolbar=0&navpanes=0`}
                                        type="application/pdf"
                                        className="w-full h-full border-0 pointer-events-auto bg-white"
                                    >
                                        <iframe
                                            src={`${rawPdfUrl}#page=${currentPage}`}
                                            title={pdf.title || 'PDF Preview'}
                                            className="w-full h-full border-0 pointer-events-auto bg-white"
                                        />
                                    </object>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-400 text-xs">
                                <FileText className="w-8 h-8 text-red-400 mb-2 opacity-60" />
                                <p>No PDF source attached</p>
                            </div>
                        )}

                        {/* Hand Tool Banner Overlay Indicator when active */}
                        {isHandToolActive && (
                            <div className="pointer-events-none absolute bottom-3 right-3 z-30 px-2.5 py-1 bg-slate-900/90 text-indigo-300 border border-indigo-500/40 rounded-full text-[10px] font-semibold backdrop-blur-md shadow-lg flex items-center gap-1.5 animate-in fade-in duration-150">
                                <Hand className="w-3 h-3 text-indigo-400" />
                                <span>Pan Mode: Drag to move</span>
                            </div>
                        )}

                        {/* Dragging or Resizing Guard Overlay */}
                        {(isDragging || isResizing) && (
                            <div className="absolute inset-0 z-30 bg-transparent cursor-grabbing" />
                        )}
                    </div>
                )}
            </div>

            {/* Resize Handles (8 directions) */}
            {isSelected && !isLocked && !isCollapsed && (
                <>
                    {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((handle) => {
                        let cursor = 'nwse-resize';
                        let style = {};

                        if (handle === 'n') {
                            cursor = 'ns-resize';
                            style = { top: -handleSize / 2, left: '50%', marginLeft: -handleSize / 2 };
                        } else if (handle === 's') {
                            cursor = 'ns-resize';
                            style = { bottom: -handleSize / 2, left: '50%', marginLeft: -handleSize / 2 };
                        } else if (handle === 'w') {
                            cursor = 'ew-resize';
                            style = { left: -handleSize / 2, top: '50%', marginTop: -handleSize / 2 };
                        } else if (handle === 'e') {
                            cursor = 'ew-resize';
                            style = { right: -handleSize / 2, top: '50%', marginTop: -handleSize / 2 };
                        } else if (handle === 'nw') {
                            cursor = 'nwse-resize';
                            style = { top: -handleSize / 2, left: -handleSize / 2 };
                        } else if (handle === 'ne') {
                            cursor = 'nesw-resize';
                            style = { top: -handleSize / 2, right: -handleSize / 2 };
                        } else if (handle === 'se') {
                            cursor = 'nwse-resize';
                            style = { bottom: -handleSize / 2, right: -handleSize / 2 };
                        } else if (handle === 'sw') {
                            cursor = 'nesw-resize';
                            style = { bottom: -handleSize / 2, left: -handleSize / 2 };
                        }

                        return (
                            <div
                                key={handle}
                                onPointerDown={(e) => handleResizeStart(e, handle)}
                                onTouchStart={(e) => handleResizeStart(e, handle)}
                                style={{
                                    ...style,
                                    width: `${handleSize}px`,
                                    height: `${handleSize}px`,
                                    cursor
                                }}
                                className="absolute bg-white border-2 border-red-500 rounded-sm z-50 shadow-md hover:scale-125 transition-transform"
                            />
                        );
                    })}
                </>
            )}
        </div>
    );
}
