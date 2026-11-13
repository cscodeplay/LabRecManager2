'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    X, LayoutGrid, GripVertical, ChevronLeft, ChevronRight, 
    Loader2, Image as ImageIcon, ArrowLeft, ArrowRight, ExternalLink 
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { reorderWhiteboardPagesState } from '@/lib/whiteboardPageUtils';

export default function WhiteboardPagesGridModal({
    isOpen,
    file,
    onClose,
    onSelectPage,
    onFileUpdated,
    onReorderLivePage
}) {
    const [loading, setLoading] = useState(false);
    const [canvasState, setCanvasState] = useState(null);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Load full whiteboard file data if needed
    useEffect(() => {
        if (!isOpen || !file) {
            setCanvasState(null);
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        // Live in-memory whiteboard session
        if (file.isLiveSession) {
            setCanvasState({
                totalPages: file.pageCount || file.totalPages || 1,
                pages: file.pages || Array(file.pageCount || 1).fill(null),
                pageThumbnails: file.pageThumbnails || []
            });
            return;
        }

        let isMounted = true;
        const loadFileData = async () => {
            try {
                setLoading(true);
                let rawData = file.canvasData;
                if (!rawData) {
                    const res = await api.get(`/whiteboard/files/${file.id}`);
                    if (res.data?.success && res.data.data?.canvasData) {
                        rawData = res.data.data.canvasData;
                    }
                }

                if (!isMounted) return;

                let parsed = null;
                if (typeof rawData === 'string' && rawData.trim()) {
                    try {
                        parsed = JSON.parse(rawData);
                    } catch (e) {
                        parsed = null;
                    }
                } else if (typeof rawData === 'object' && rawData !== null) {
                    parsed = rawData;
                }

                const totalPages = Math.max(
                    Number(parsed?.totalPages) || 1,
                    Number(file.pageCount) || 1,
                    Array.isArray(parsed?.pageThumbnails) ? parsed.pageThumbnails.length : 0,
                    Array.isArray(file.pageThumbnails) ? file.pageThumbnails.length : 0,
                    Array.isArray(parsed?.pages) ? parsed.pages.length : 0
                );

                const thumbs = Array.isArray(parsed?.pageThumbnails) && parsed.pageThumbnails.length > 0
                    ? [...parsed.pageThumbnails]
                    : (Array.isArray(file.pageThumbnails) && file.pageThumbnails.length > 0 ? [...file.pageThumbnails] : []);
                while (thumbs.length < totalPages) thumbs.push(null);

                const pages = Array.isArray(parsed?.pages) ? [...parsed.pages] : Array(totalPages).fill(null);
                while (pages.length < totalPages) pages.push(null);

                setCanvasState({
                    ...(parsed || {}),
                    totalPages,
                    pages,
                    pageThumbnails: thumbs
                });
            } catch (err) {
                console.error('Failed to load whiteboard pages for grid view:', err);
                toast.error('Could not load pages preview');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadFileData();

        return () => {
            isMounted = false;
        };
    }, [isOpen, file]);

    if (!isOpen || !file) return null;

    const totalPages = canvasState?.totalPages || file.pageCount || 1;
    const thumbs = canvasState?.pageThumbnails || file.pageThumbnails || [];

    // Perform reorder operation
    const handleReorder = async (fromIdx, toIdx) => {
        if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= totalPages || toIdx >= totalPages) return;
        if (!canvasState) return;

        const updatedState = reorderWhiteboardPagesState(canvasState, fromIdx, toIdx);
        setCanvasState(updatedState);
        setDraggedIndex(null);
        setDragOverIndex(null);

        if (onReorderLivePage) {
            onReorderLivePage(fromIdx, toIdx);
            toast.success(`Page ${fromIdx + 1} moved to position ${toIdx + 1}`);
            if (file.isLiveSession || !file.id || file.id === 'live_session') {
                return;
            }
        }

        try {
            setIsSaving(true);
            const res = await api.put(`/whiteboard/files/${file.id}/save`, {
                canvasData: JSON.stringify(updatedState),
                pageThumbnails: updatedState.pageThumbnails,
                pageCount: updatedState.totalPages
            });

            if (res.data?.success) {
                toast.success(`Page ${fromIdx + 1} moved to position ${toIdx + 1}`);
                if (onFileUpdated) {
                    onFileUpdated({
                        ...file,
                        pageCount: updatedState.totalPages,
                        pageThumbnails: updatedState.pageThumbnails,
                        thumbnailUrl: updatedState.pageThumbnails?.[0] || file.thumbnailUrl,
                        canvasData: JSON.stringify(updatedState)
                    });
                }
            }
        } catch (e) {
            console.error('Failed to persist page reorder:', e);
            toast.error('Failed to save reordered pages');
        } finally {
            setIsSaving(false);
        }
    };

    // Drag and Drop handlers
    const onDragStart = (e, idx) => {
        setDraggedIndex(idx);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(idx));
    };

    const onDragOver = (e, idx) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIndex !== idx) {
            setDragOverIndex(idx);
        }
    };

    const onDragLeave = (e, idx) => {
        if (dragOverIndex === idx) {
            setDragOverIndex(null);
        }
    };

    const onDrop = (e, targetIdx) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData('text/plain');
        const sourceIdx = raw ? parseInt(raw, 10) : draggedIndex;
        if (!isNaN(sourceIdx)) {
            handleReorder(sourceIdx, targetIdx);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90dvh] text-white overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
                            <LayoutGrid className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                                <span>{file.title || 'Untitled Whiteboard'}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700">
                                    {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
                                </span>
                                {isSaving && (
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-normal animate-pulse">
                                        <Loader2 className="w-3 h-3 animate-spin text-primary-400" />
                                        Saving order...
                                    </span>
                                )}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Drag and drop cards or use the arrows to reorder pages. Click a page to open it.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                        title="Close preview"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-900/95">
                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                            <span className="text-sm font-medium">Loading page previews...</span>
                        </div>
                    ) : totalPages === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
                            <ImageIcon className="w-10 h-10 opacity-30" />
                            <span className="text-sm">No pages in this whiteboard.</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Array.from({ length: totalPages }, (_, idx) => {
                                const thumb = thumbs[idx] || (idx === 0 ? file.thumbnailUrl : null);
                                const isBeingDragged = draggedIndex === idx;
                                const isTarget = dragOverIndex === idx && draggedIndex !== idx;
                                const bg = canvasState?.pageBackgrounds?.[idx]?.color || '#ffffff';

                                return (
                                    <div
                                        key={`page-grid-tile-${idx}`}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, idx)}
                                        onDragOver={(e) => onDragOver(e, idx)}
                                        onDragLeave={(e) => onDragLeave(e, idx)}
                                        onDrop={(e) => onDrop(e, idx)}
                                        onDragEnd={() => {
                                            setDraggedIndex(null);
                                            setDragOverIndex(null);
                                        }}
                                        className={`group relative flex flex-col bg-slate-800/80 rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                                            isBeingDragged 
                                                ? 'opacity-40 border-indigo-500 scale-98 shadow-inner' 
                                                : isTarget 
                                                ? 'border-indigo-400 ring-2 ring-indigo-500/50 bg-indigo-950/40 scale-102 shadow-xl' 
                                                : 'border-slate-700/80 hover:border-slate-500 hover:shadow-lg'
                                        }`}
                                        onClick={() => {
                                            if (onSelectPage) {
                                                onSelectPage(file.id, idx);
                                            }
                                        }}
                                        title={`Page ${idx + 1} — Click to open, or drag to reorder`}
                                    >
                                        {/* Aspect-Ratio Preview Canvas */}
                                        <div 
                                            className="relative aspect-video w-full overflow-hidden flex items-center justify-center select-none"
                                            style={{ backgroundColor: bg }}
                                        >
                                            {thumb ? (
                                                <img 
                                                    src={thumb} 
                                                    alt={`Page ${idx + 1}`} 
                                                    className="w-full h-full object-contain pointer-events-none"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center gap-1 text-slate-400 font-mono text-xs">
                                                    <ImageIcon className="w-6 h-6 opacity-40 text-slate-500" />
                                                    <span>Page {idx + 1}</span>
                                                </div>
                                            )}

                                            {/* Top Badge: Page Number */}
                                            <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-950/85 text-white shadow-md border border-slate-700/60 pointer-events-none">
                                                #{idx + 1}
                                            </div>

                                            {/* Drag Handle Indicator */}
                                            <div 
                                                className="absolute top-2 right-2 z-10 p-1 rounded-md bg-slate-950/80 text-slate-400 group-hover:text-white transition shadow border border-slate-700/60"
                                                title="Drag to reorder"
                                            >
                                                <GripVertical className="w-3.5 h-3.5" />
                                            </div>

                                            {/* Quick Open Overlay on hover */}
                                            <div className="absolute inset-0 bg-indigo-950/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                                                <ExternalLink className="w-4 h-4 text-white" />
                                                <span>Open Page {idx + 1}</span>
                                            </div>
                                        </div>

                                        {/* Card Footer: Reorder Arrows & Title */}
                                        <div 
                                            className="p-2.5 bg-slate-850 border-t border-slate-700/60 flex items-center justify-between gap-1 select-none"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <span className="text-xs font-bold text-slate-200 truncate pl-1">
                                                Page {idx + 1}
                                            </span>

                                            <div className="flex items-center gap-0.5">
                                                <button
                                                    type="button"
                                                    disabled={idx === 0 || isSaving}
                                                    onClick={() => handleReorder(idx, idx - 1)}
                                                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition disabled:opacity-20 disabled:cursor-not-allowed"
                                                    title={`Move Page ${idx + 1} Left`}
                                                    aria-label={`Move Page ${idx + 1} Left`}
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={idx === totalPages - 1 || isSaving}
                                                    onClick={() => handleReorder(idx, idx + 1)}
                                                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition disabled:opacity-20 disabled:cursor-not-allowed"
                                                    title={`Move Page ${idx + 1} Right`}
                                                    aria-label={`Move Page ${idx + 1} Right`}
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t border-slate-800 px-6 py-3 bg-slate-950/70 text-xs text-slate-400">
                    <div>
                        Tip: Reordering automatically updates all drawn objects, math, notes, and media on that page.
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl font-medium transition"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
