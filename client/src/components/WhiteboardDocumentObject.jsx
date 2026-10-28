'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    FileSpreadsheet, FileText, Maximize2, Minimize2, ExternalLink,
    Download, Trash2, Copy, Lock, Unlock, Move, Check, Loader2,
    Eye, Link as LinkIcon, AlertCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import SpreadsheetViewer from './SpreadsheetViewer';
import DocxViewer from './DocxViewer';
import WhiteboardPdfViewer from './WhiteboardPdfViewer';

/**
 * Auto-detects the document type from file name, URL, or MIME type
 */
export function detectDocumentType(fileName = '', mimeType = '', url = '') {
    const combined = `${fileName} ${url} ${mimeType}`.toLowerCase();
    
    if (combined.includes('.xlsx') || combined.includes('.xls') || combined.includes('.csv') ||
        combined.includes('spreadsheet') || combined.includes('excel')) {
        return 'excel';
    }
    if (combined.includes('.docx') || combined.includes('.doc') ||
        combined.includes('word') || combined.includes('wordprocessingml')) {
        return 'word';
    }
    if (combined.includes('.pdf') || combined.includes('application/pdf')) {
        return 'pdf';
    }
    return 'word'; // Default fallback
}

export function getDocumentMetadata(docType, fileName = '') {
    switch (docType) {
        case 'excel':
            return {
                label: 'Excel Workbook',
                shortTag: fileName.toLowerCase().endsWith('.csv') ? 'CSV' : 'XLSX',
                icon: FileSpreadsheet,
                accentColor: '#10b981', // emerald-500
                bgSoft: 'rgba(16, 185, 129, 0.15)',
                borderSoft: 'rgba(16, 185, 129, 0.3)',
                ringColor: 'ring-emerald-500'
            };
        case 'word':
            return {
                label: 'Word Document',
                shortTag: fileName.toLowerCase().endsWith('.doc') ? 'DOC' : 'DOCX',
                icon: FileText,
                accentColor: '#3b82f6', // blue-500
                bgSoft: 'rgba(59, 130, 246, 0.15)',
                borderSoft: 'rgba(59, 130, 246, 0.3)',
                ringColor: 'ring-blue-500'
            };
        case 'pdf':
            return {
                label: 'PDF Document',
                shortTag: 'PDF',
                icon: FileText,
                accentColor: '#f43f5e', // rose-500
                bgSoft: 'rgba(244, 63, 94, 0.15)',
                borderSoft: 'rgba(244, 63, 94, 0.3)',
                ringColor: 'ring-rose-500'
            };
        default:
            return {
                label: 'Linked Document',
                shortTag: 'DOC',
                icon: FileText,
                accentColor: '#6366f1',
                bgSoft: 'rgba(99, 102, 241, 0.15)',
                borderSoft: 'rgba(99, 102, 241, 0.3)',
                ringColor: 'ring-indigo-500'
            };
    }
}

/**
 * WhiteboardDocumentObject
 * Renders linked documents (Excel workbooks, Word docs, PDFs) as either:
 * - Mode A: Compact Link Badge ("as link")
 * - Mode B: Resizable Draggable Inset Window ("as inset window")
 * Preserves fonts, cell styles, formulas, and document formatting.
 */
export default function WhiteboardDocumentObject({
    doc,
    isSelected = false,
    scale = 1,
    onSelect,
    onUpdate,
    onDelete,
    onDuplicate,
    onBringForward,
    onSendBackward
}) {
    const documentObj = doc || {};
    const docId = documentObj.id;
    const fileName = documentObj.fileName || documentObj.title || 'Untitled Document';
    const docType = documentObj.docType || detectDocumentType(fileName, documentObj.mimeType, documentObj.url);
    const meta = useMemo(() => getDocumentMetadata(docType, fileName), [docType, fileName]);
    const IconComponent = meta.icon;

    // Presentation mode: 'link' (compact badge) | 'inset' (resizable window)
    const presentationMode = documentObj.presentationMode || 'inset';
    const isLinkMode = presentationMode === 'link';
    const isLocked = Boolean(documentObj.isLocked);
    const zIndex = documentObj.zIndex || 35;

    // Dimensions
    const x = documentObj.x || 100;
    const y = documentObj.y || 100;
    const width = documentObj.width || (isLinkMode ? 320 : 640);
    const height = documentObj.height || (isLinkMode ? 54 : 480);

    // Drag & Resize state
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [activeHandle, setActiveHandle] = useState(null);
    const dragStartRef = useRef({ x: 0, y: 0, objX: 0, objY: 0 });
    const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0, objX: 0, objY: 0 });

    // Drag start handler (from badge surface or window header)
    const handleDragStart = (e) => {
        if (isLocked) return;
        e.stopPropagation();
        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

        setIsDragging(true);
        dragStartRef.current = {
            x: clientX,
            y: clientY,
            objX: x,
            objY: y
        };
        onSelect?.(docId);
    };

    // Resize start handler for inset window
    const handleResizeStart = (e, handle) => {
        if (isLocked || isLinkMode) return;
        e.stopPropagation();
        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

        setIsResizing(true);
        setActiveHandle(handle);
        resizeStartRef.current = {
            x: clientX,
            y: clientY,
            w: width,
            h: height,
            objX: x,
            objY: y
        };
        onSelect?.(docId);
    };

    // Window mousemove / mouseup listener for dragging & resizing
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

                const minW = 340;
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

    // Handle toggle between Link Badge and Inset Window
    const togglePresentationMode = (e) => {
        e?.stopPropagation?.();
        if (isLinkMode) {
            onUpdate?.({
                presentationMode: 'inset',
                width: documentObj.prevInsetWidth || 640,
                height: documentObj.prevInsetHeight || 480
            });
            toast.success(`Expanded ${fileName} into Inset Window`, { icon: '🪟' });
        } else {
            onUpdate?.({
                presentationMode: 'link',
                prevInsetWidth: width,
                prevInsetHeight: height,
                width: 320,
                height: 54
            });
            toast.success(`Collapsed ${fileName} to Link Badge`, { icon: '🔗' });
        }
    };

    // Download file handler
    const handleDownload = (e) => {
        e?.stopPropagation?.();
        if (documentObj.url) {
            const a = document.createElement('a');
            a.href = documentObj.url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success(`Downloaded ${fileName}`);
        } else if (documentObj.data) {
            const blob = documentObj.data instanceof Blob ? documentObj.data : new Blob([documentObj.data]);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success(`Downloaded ${fileName}`);
        } else {
            toast.error('No document file data available for download');
        }
    };

    // Open in new browser tab
    const handleOpenInNewTab = (e) => {
        e?.stopPropagation?.();
        if (documentObj.url) {
            window.open(documentObj.url, '_blank');
        } else {
            handleDownload(e);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // MODE A: LINK BADGE PRESENTATION ("as link")
    // ─────────────────────────────────────────────────────────────
    if (isLinkMode) {
        return (
            <div
                data-document-id={docId}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.(docId);
                }}
                onPointerDown={handleDragStart}
                style={{
                    position: 'absolute',
                    left: `${x}px`,
                    top: `${y}px`,
                    width: 'auto',
                    minWidth: '280px',
                    maxWidth: '420px',
                    height: '52px',
                    zIndex: isSelected ? 50 : zIndex,
                    cursor: isLocked ? 'default' : 'grab'
                }}
                className={`group select-none rounded-2xl shadow-xl transition-all ${
                    isSelected ? 'ring-2 ring-indigo-500 shadow-indigo-500/25 scale-[1.01]' : 'ring-1 ring-slate-700/80 hover:ring-slate-500/80'
                }`}
            >
                <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-slate-900/95 border border-slate-700/80 rounded-2xl backdrop-blur-md text-white h-full">
                    {/* Left: Icon bubble + Document title */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div 
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition group-hover:scale-105"
                            style={{ backgroundColor: meta.bgSoft, borderColor: meta.borderSoft, color: meta.accentColor }}
                        >
                            <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex flex-col justify-center">
                            <span className="text-xs font-semibold text-slate-100 truncate max-w-[160px] sm:max-w-[200px]" title={fileName}>
                                {fileName}
                            </span>
                            <div className="flex items-center gap-1.5 text-[9.5px]">
                                <span 
                                    className="px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-wider text-[8.5px]"
                                    style={{ backgroundColor: meta.bgSoft, color: meta.accentColor }}
                                >
                                    {meta.shortTag}
                                </span>
                                <span className="text-slate-400">Linked Document</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Quick Action Controls */}
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {/* Expand to Inset Window */}
                        <button
                            type="button"
                            onClick={togglePresentationMode}
                            className="p-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 transition shadow-xs"
                            title="Expand to Resizable Inset Window"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Open in new tab / Download */}
                        <button
                            type="button"
                            onClick={handleOpenInNewTab}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                            title="Open or Download File"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Lock / Unlock */}
                        <button
                            type="button"
                            onClick={() => onUpdate?.({ isLocked: !isLocked })}
                            className={`p-1.5 rounded-lg transition ${
                                isLocked ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                            title={isLocked ? 'Unlock Object' : 'Lock Position'}
                        >
                            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>

                        {/* Duplicate */}
                        <button
                            type="button"
                            onClick={() => onDuplicate?.(docId)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                            title="Duplicate Document Object"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                            type="button"
                            onClick={() => onDelete?.(docId)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition"
                            title="Remove Document from Whiteboard"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // MODE B: RESIZABLE INSET WINDOW PRESENTATION ("as inset window")
    // ─────────────────────────────────────────────────────────────
    return (
        <div
            data-document-id={docId}
            onClick={(e) => {
                e.stopPropagation();
                onSelect?.(docId);
            }}
            style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${height}px`,
                zIndex: isSelected ? 48 : zIndex
            }}
            className={`group select-none rounded-2xl shadow-2xl transition-shadow ${
                isSelected ? 'ring-2 ring-indigo-500 shadow-indigo-500/25' : 'ring-1 ring-slate-700/80 hover:ring-slate-500/80'
            }`}
        >
            <div className="flex flex-col w-full h-full bg-slate-900 border border-slate-700/90 rounded-2xl overflow-hidden backdrop-blur-md">
                {/* Draggable Header Bar */}
                <div
                    onPointerDown={handleDragStart}
                    className="flex items-center justify-between px-3 py-2 bg-slate-800/95 border-b border-slate-700/80 cursor-grab active:cursor-grabbing text-slate-200 select-none flex-shrink-0"
                >
                    {/* Left: Icon, Title, and Format Tag */}
                    <div className="flex items-center gap-2 min-w-0">
                        <div 
                            className="p-1.5 rounded-lg border transition"
                            style={{ backgroundColor: meta.bgSoft, borderColor: meta.borderSoft, color: meta.accentColor }}
                        >
                            <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold truncate max-w-[140px] sm:max-w-[220px]" title={fileName}>
                            {fileName}
                        </span>
                        <span 
                            className="px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-wider text-[9px] shrink-0"
                            style={{ backgroundColor: meta.bgSoft, color: meta.accentColor }}
                        >
                            {meta.shortTag}
                        </span>
                    </div>

                    {/* Right: Window Controls */}
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {/* Collapse to Link Badge */}
                        <button
                            type="button"
                            onClick={togglePresentationMode}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white text-[10.5px] font-medium transition"
                            title="Collapse to compact Link Badge"
                        >
                            <Minimize2 className="w-3 h-3" />
                            <span>Link</span>
                        </button>

                        {/* Download / Open */}
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition"
                            title="Download original document file"
                        >
                            <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open('/documents/converter', '_blank');
                            }}
                            className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-indigo-400 transition"
                            title="Convert Document (Universal Converter)"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>

                        <button
                            type="button"
                            onClick={handleOpenInNewTab}
                            className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition"
                            title="Open in new browser tab"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        <div className="h-3.5 w-px bg-slate-700 mx-0.5" />

                        {/* Lock / Unlock */}
                        <button
                            type="button"
                            onClick={() => onUpdate?.({ isLocked: !isLocked })}
                            className={`p-1 rounded-lg transition ${
                                isLocked ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                            title={isLocked ? 'Unlock Object' : 'Lock Position & Size'}
                        >
                            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>

                        {/* Duplicate */}
                        <button
                            type="button"
                            onClick={() => onDuplicate?.(docId)}
                            className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition"
                            title="Duplicate Inset Window"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                            type="button"
                            onClick={() => onDelete?.(docId)}
                            className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition"
                            title="Remove Document from Whiteboard"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Main Inset Viewer Viewport */}
                <div className="relative flex-1 w-full min-h-0 bg-white dark:bg-slate-950 overflow-hidden">
                    {docType === 'excel' && (
                        <SpreadsheetViewer
                            data={documentObj.data}
                            url={documentObj.url}
                            fileName={fileName}
                            className="w-full h-full border-0 rounded-none shadow-none"
                        />
                    )}

                    {docType === 'word' && (
                        <DocxViewer
                            data={documentObj.data}
                            url={documentObj.url}
                            fileName={fileName}
                            className="w-full h-full border-0 rounded-none shadow-none"
                        />
                    )}

                    {docType === 'pdf' && (
                        documentObj.url ? (
                            <iframe
                                src={`${documentObj.url}#toolbar=0`}
                                className="w-full h-full border-0"
                                title={fileName}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                                <FileText className="w-10 h-10 text-rose-500 mb-2" />
                                <span className="text-xs font-semibold text-slate-300">{fileName}</span>
                                <span className="text-[11px] text-slate-500 mt-1">PDF document loaded into whiteboard</span>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* 8-Point Outer Resize Handles (only when selected and not locked) */}
            {isSelected && !isLocked && (
                <>
                    {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(handle => {
                        const isTop = handle.includes('n');
                        const isBottom = handle.includes('s');
                        const isLeft = handle.includes('w');
                        const isRight = handle.includes('e');

                        let cursor = 'nwse-resize';
                        if (handle === 'n' || handle === 's') cursor = 'ns-resize';
                        else if (handle === 'e' || handle === 'w') cursor = 'ew-resize';
                        else if (handle === 'ne' || handle === 'sw') cursor = 'nesw-resize';

                        const handleStyle = {
                            top: isTop ? '-5px' : isBottom ? 'calc(100% - 5px)' : 'calc(50% - 5px)',
                            left: isLeft ? '-5px' : isRight ? 'calc(100% - 5px)' : 'calc(50% - 5px)',
                            cursor
                        };

                        return (
                            <div
                                key={handle}
                                onPointerDown={(e) => handleResizeStart(e, handle)}
                                style={handleStyle}
                                className="absolute w-2.5 h-2.5 bg-white border-2 border-indigo-600 rounded-sm shadow-md z-50 hover:scale-125 transition-transform"
                            />
                        );
                    })}
                </>
            )}
        </div>
    );
}
