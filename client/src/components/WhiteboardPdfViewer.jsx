'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    FileText, ChevronLeft, ChevronRight, Maximize2, Minimize2,
    Lock, Unlock, Trash2, ExternalLink, GripHorizontal, RotateCcw,
    ZoomIn, ZoomOut, Crosshair, Target
} from 'lucide-react';

// Robust multi-strategy PDF page count detector
async function detectPdfTotalPages(pdfUrl) {
    if (!pdfUrl) return 1;
    try {
        const res = await fetch(pdfUrl);
        const arrayBuf = await res.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        let text = '';
        const chunk = 32768;
        for (let i = 0; i < bytes.length; i += chunk) {
            text += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, bytes.length)));
        }

        // 1. Linearized PDF check (/Linearized ... /N <pages>)
        const linMatch = text.match(/\/Linearized[\s\S]*?\/N\s+(\d+)/);
        if (linMatch && parseInt(linMatch[1], 10) > 0) {
            return parseInt(linMatch[1], 10);
        }

        // 2. Find all /Type /Pages or /Type/Pages objects and get maximum /Count
        let maxPagesCount = 0;
        const objRegex = /(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/g;
        let match;
        while ((match = objRegex.exec(text)) !== null) {
            const content = match[3];
            if (/\/Type\s*\/Pages\b/.test(content)) {
                const c = content.match(/\/Count\s+(\d+)/);
                if (c) {
                    const val = parseInt(c[1], 10);
                    if (val > maxPagesCount) maxPagesCount = val;
                }
            }
        }
        if (maxPagesCount > 0) return maxPagesCount;

        // 3. Fallback: match any /Type /Page (singular)
        const singlePages = text.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
        if (singlePages && singlePages.length > 0) {
            return singlePages.length;
        }

        // 4. Decompress FlateDecode object streams (/ObjStm) using browser DecompressionStream
        if (typeof window !== 'undefined' && window.DecompressionStream) {
            const streamRegex = /<<[^>]*?\/Filter\s*\/FlateDecode[^>]*?>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
            let streamMatch;
            while ((streamMatch = streamRegex.exec(text)) !== null) {
                try {
                    const streamBytes = new Uint8Array(streamMatch[1].length);
                    for (let j = 0; j < streamMatch[1].length; j++) {
                        streamBytes[j] = streamMatch[1].charCodeAt(j);
                    }
                    const ds = new DecompressionStream('deflate');
                    const writer = ds.writable.getWriter();
                    writer.write(streamBytes);
                    writer.close();
                    const reader = ds.readable.getReader();
                    const chunks = [];
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        chunks.push(value);
                    }
                    let totalLen = 0;
                    for (const c of chunks) totalLen += c.length;
                    const combined = new Uint8Array(totalLen);
                    let offset = 0;
                    for (const c of chunks) {
                        combined.set(c, offset);
                        offset += c.length;
                    }
                    let decompStr = '';
                    for (let k = 0; k < combined.length; k += chunk) {
                        decompStr += String.fromCharCode.apply(null, combined.subarray(k, Math.min(k + chunk, combined.length)));
                    }
                    if (decompStr.includes('/Pages') || decompStr.includes('/Page')) {
                        const cm = decompStr.match(/\/Count\s+(\d+)/);
                        if (cm) {
                            const val = parseInt(cm[1], 10);
                            if (val > maxPagesCount) maxPagesCount = val;
                        }
                        const pMatches = decompStr.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
                        if (pMatches && pMatches.length > maxPagesCount) {
                            maxPagesCount = pMatches.length;
                        }
                    }
                } catch (e) {
                    // Ignore non-zlib streams
                }
            }
        }
        return maxPagesCount > 0 ? maxPagesCount : 1;
    } catch (err) {
        console.warn('PDF page count detection warning:', err);
        return 1;
    }
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

    // Zoom & Centering State for Inset PDF
    const [pdfZoom, setPdfZoom] = useState(pdf.zoomLevel || 1.0);
    const [isEditingPage, setIsEditingPage] = useState(false);
    const [pageInputValue, setPageInputValue] = useState(String(pdf.page || 1));

    const containerRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const dragStartRef = useRef({ x: 0, y: 0, objX: 0, objY: 0 });
    const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0, objX: 0, objY: 0 });

    const handleSize = 10;
    const rawPdfUrl = pdf.src || pdf.url || '';

    // Auto-detect total pages from raw PDF content if unknown or defaulted
    useEffect(() => {
        if (!rawPdfUrl) return;
        let isMounted = true;
        (async () => {
            const count = await detectPdfTotalPages(rawPdfUrl);
            if (isMounted && count > 0) {
                setTotalPages(count);
                onUpdate?.({ totalPages: count });
                setCurrentPage(prev => {
                    if (prev > count) {
                        onUpdate?.({ page: count, totalPages: count });
                        return count;
                    }
                    return prev;
                });
            }
        })();
        return () => { isMounted = false; };
    }, [rawPdfUrl]);

    useEffect(() => {
        if (typeof pdf.isCollapsed === 'boolean') setIsCollapsed(pdf.isCollapsed);
        if (typeof pdf.isLocked === 'boolean') setIsLocked(pdf.isLocked);
        if (pdf.totalPages && pdf.totalPages > 1) {
            setTotalPages(pdf.totalPages);
        }
        if (pdf.page) {
            const clamped = Math.max(1, pdf.page);
            setCurrentPage(clamped);
            setPageInputValue(String(clamped));
        }
        if (pdf.zoomLevel !== undefined) {
            setPdfZoom(pdf.zoomLevel);
        }
    }, [pdf.isCollapsed, pdf.isLocked, pdf.page, pdf.totalPages, pdf.zoomLevel]);

    // Keyboard Delete / Backspace listener when PDF is selected
    useEffect(() => {
        if (!isSelected) return;
        const handleKeyDown = (e) => {
            const tag = e.target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                e.stopPropagation();
                onDelete?.(pdf.id);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSelected, pdf.id, onDelete]);

    // Page navigation with boundary enforcement and unblocking
    const handlePrevPage = (e) => {
        e.stopPropagation();
        if (currentPage > 1) {
            const next = currentPage - 1;
            setCurrentPage(next);
            setPageInputValue(String(next));
            onUpdate?.({ page: next });
        }
    };

    const handleNextPage = (e) => {
        e.stopPropagation();
        const max = Math.max(1, totalPages || 1);
        if (currentPage < max) {
            const next = currentPage + 1;
            setCurrentPage(next);
            setPageInputValue(String(next));
            onUpdate?.({ page: next });
        } else if (totalPages <= 1) {
            // Unblock user if totalPages was stuck at 1 - allow advancing to page 2+
            const next = currentPage + 1;
            setCurrentPage(next);
            setTotalPages(next);
            setPageInputValue(String(next));
            onUpdate?.({ page: next, totalPages: next });
        }
    };

    const handlePageSubmit = (e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        const targetPage = parseInt(pageInputValue, 10);
        if (!isNaN(targetPage) && targetPage >= 1) {
            const next = targetPage;
            setCurrentPage(next);
            if (next > totalPages) {
                setTotalPages(next);
                onUpdate?.({ page: next, totalPages: next });
            } else {
                onUpdate?.({ page: next });
            }
        } else {
            setPageInputValue(String(currentPage));
        }
        setIsEditingPage(false);
    };

    // Zoom Controls
    const handleZoomIn = (e) => {
        e?.stopPropagation?.();
        const next = Math.min(3.0, +(pdfZoom + 0.25).toFixed(2));
        setPdfZoom(next);
        onUpdate?.({ zoomLevel: next });
    };

    const handleZoomOut = (e) => {
        e?.stopPropagation?.();
        const next = Math.max(0.5, +(pdfZoom - 0.25).toFixed(2));
        setPdfZoom(next);
        onUpdate?.({ zoomLevel: next });
    };

    const handleResetZoom = (e) => {
        e?.stopPropagation?.();
        setPdfZoom(1.0);
        onUpdate?.({ zoomLevel: 1.0 });
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
        }
    };

    // Center button: centers PDF view inside container and centers PDF on whiteboard canvas
    const handleCenter = (e) => {
        e?.stopPropagation?.();
        setPdfZoom(1.0);
        onUpdate?.({ zoomLevel: 1.0 });
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
        }
        onCenter?.(pdf);
    };

    // Dragging
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

    // Resizing
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
            w: pdf.width || 480,
            h: pdf.height || 640,
            objX: pdf.x || 0,
            objY: pdf.y || 0
        };
        onSelect?.(pdf.id);
    };

    // Global Pointer Move & Up listeners for Drag/Resize
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

                const minW = 280;
                const minH = 200;

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

    const pdfSrc = rawPdfUrl ? `${rawPdfUrl}#page=${currentPage}&zoom=${Math.round(pdfZoom * 100)}&view=Fit&toolbar=0&navpanes=0` : '';

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
                    className="flex items-center justify-between px-3 py-2 bg-slate-800/95 border-b border-slate-700/80 cursor-grab active:cursor-grabbing text-slate-200"
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 rounded-md bg-red-600/20 text-red-400 border border-red-500/30">
                            <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold truncate max-w-[120px] sm:max-w-[170px]" title={pdf.title || 'PDF Document'}>
                            {pdf.title || 'PDF Document'}
                        </span>
                    </div>

                    {/* PDF Page Navigation, Zoom, Center & Actions */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {!isCollapsed && (
                            <>
                                {/* Page Navigator */}
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
                                                max={totalPages > 1 ? totalPages : 999}
                                                value={pageInputValue}
                                                onChange={(e) => setPageInputValue(e.target.value)}
                                                onBlur={handlePageSubmit}
                                                autoFocus
                                                className="w-8 text-center text-[10.5px] font-bold bg-slate-800 text-white rounded px-0.5 border border-red-500 outline-none"
                                            />
                                            <span className="text-[10px] text-slate-400 ml-1">/ {totalPages || 1}</span>
                                        </form>
                                    ) : (
                                        <span
                                            onClick={() => setIsEditingPage(true)}
                                            className="px-1 text-[10.5px] font-semibold tracking-tight text-slate-200 cursor-pointer hover:text-sky-300 hover:underline select-none"
                                            title="Click to jump to a specific page"
                                        >
                                            {currentPage} / {totalPages || 1}
                                        </span>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleNextPage}
                                        disabled={totalPages > 1 && currentPage >= totalPages}
                                        className="p-0.5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                                        title="Next Page"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Zoom Controls: Out, Badge/Reset, In */}
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

                                {/* Center Button */}
                                <button
                                    type="button"
                                    onClick={handleCenter}
                                    className="p-1 hover:bg-slate-700/60 text-slate-400 hover:text-sky-300 rounded transition"
                                    title="Center PDF View and Center on Canvas"
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
                            title={isLocked ? 'Unlock PDF' : 'Lock PDF'}
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

                {/* PDF Viewer Body with Keyed Embed to force re-render on page/zoom update */}
                {!isCollapsed && (
                    <div
                        ref={scrollContainerRef}
                        className="relative flex-1 w-full bg-slate-950 overflow-auto"
                    >
                        {rawPdfUrl ? (
                            <div
                                style={{
                                    transform: `scale(${pdfZoom})`,
                                    transformOrigin: 'top center',
                                    transition: 'transform 0.15s ease-out'
                                }}
                                className="w-full h-full min-w-full min-h-full"
                            >
                                <object
                                    key={`pdf-obj-${pdf.id}-p${currentPage}-z${pdfZoom}-${isResizing ? 'resizing' : 'settled'}`}
                                    data={pdfSrc}
                                    type="application/pdf"
                                    className="w-full h-full border-0 pointer-events-auto bg-white"
                                >
                                    <iframe
                                        key={`pdf-frame-${pdf.id}-p${currentPage}-z${pdfZoom}-${isResizing ? 'resizing' : 'settled'}`}
                                        src={pdfSrc}
                                        title={pdf.title || 'PDF Preview'}
                                        className="w-full h-full border-0 pointer-events-auto bg-white"
                                    />
                                </object>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-400 text-xs">
                                <FileText className="w-8 h-8 text-red-400 mb-2 opacity-60" />
                                <p>No PDF source attached</p>
                            </div>
                        )}

                        {/* Transparent guard overlay while dragging or resizing to prevent iframe from capturing cursor */}
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
