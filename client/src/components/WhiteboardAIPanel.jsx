'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
    Sparkles, Trash2, Edit3, Check, Move, Maximize2, 
    ChevronLeft, ChevronRight, Copy, Plus, X, Layers, Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function WhiteboardAIPanel({
    panel,
    scale = 1,
    onUpdate,
    onDelete,
    onSendToCanvasImage
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ startX: 0, startY: 0, startW: 420, startH: 360 });

    // Local draft states when editing
    const [draftTitle, setDraftTitle] = useState(panel.title || 'AI Research Note');
    const [draftSummary, setDraftSummary] = useState(panel.summary || '');
    const [draftKeyPoints, setDraftKeyPoints] = useState(panel.keyPoints || []);
    const [draftFormula, setDraftFormula] = useState(panel.formulaOrEquation || '');
    const [activeImgIdx, setActiveImgIdx] = useState(panel.activeImageIndex || 0);

    const images = panel.images || (panel.diagramUrl ? [{ url: panel.diagramUrl, title: panel.title }] : []);
    const currentImg = images[activeImgIdx] || null;

    const width = panel.width || 440;
    const height = panel.height || 'auto';

    // Dragging the panel
    const handleDragStart = (e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) return;
        e.stopPropagation();
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - (panel.x || 60),
            y: e.clientY - (panel.y || 60)
        });
    };

    useEffect(() => {
        if (!isDragging) return;

        const handlePointerMove = (e) => {
            const newX = Math.max(10, e.clientX - dragOffset.x);
            const newY = Math.max(10, e.clientY - dragOffset.y);
            onUpdate?.(panel.id, { x: newX, y: newY });
        };

        const handlePointerUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, dragOffset, panel.id, onUpdate]);

    // Resizing the panel
    const handleResizeStart = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        setResizeStart({
            startX: e.clientX,
            startY: e.clientY,
            startW: panel.width || 440,
            startH: typeof panel.height === 'number' ? panel.height : 400
        });
    };

    useEffect(() => {
        if (!isResizing) return;

        const handleResizeMove = (e) => {
            const deltaX = (e.clientX - resizeStart.startX) / (scale || 1);
            const deltaY = (e.clientY - resizeStart.startY) / (scale || 1);
            const newWidth = Math.max(300, Math.min(1000, Math.round(resizeStart.startW + deltaX)));
            const newHeight = Math.max(200, Math.min(1200, Math.round(resizeStart.startH + deltaY)));
            onUpdate?.(panel.id, { width: newWidth, height: newHeight });
        };

        const handleResizeUp = () => {
            setIsResizing(false);
        };

        window.addEventListener('pointermove', handleResizeMove);
        window.addEventListener('pointerup', handleResizeUp);
        return () => {
            window.removeEventListener('pointermove', handleResizeMove);
            window.removeEventListener('pointerup', handleResizeUp);
        };
    }, [isResizing, resizeStart, scale, panel.id, onUpdate]);

    // Save inline edits
    const handleSaveEdits = () => {
        setIsEditing(false);
        onUpdate?.(panel.id, {
            title: draftTitle.trim() || panel.title,
            summary: draftSummary.trim(),
            keyPoints: draftKeyPoints.filter(p => p && p.trim()),
            formulaOrEquation: draftFormula.trim() || null
        });
        toast.success('Research panel updated', { icon: '✏️' });
    };

    const handleCopySummary = (e) => {
        e.stopPropagation();
        const fullText = `${panel.title}\n\n${panel.summary}\n\n` + 
            (panel.keyPoints?.length ? 'Key Points:\n• ' + panel.keyPoints.join('\n• ') : '');
        navigator.clipboard?.writeText(fullText);
        toast.success('Summary copied to clipboard!');
    };

    return (
        <div
            className={`absolute z-30 select-none rounded-2xl border transition-shadow duration-200 flex flex-col overflow-hidden bg-slate-900/95 text-slate-100 border-indigo-500/40 shadow-2xl backdrop-blur-md ${
                isDragging ? 'cursor-grabbing shadow-indigo-500/20' : ''
            }`}
            style={{
                left: `${panel.x || 60}px`,
                top: `${panel.y || 60}px`,
                width: `${width}px`,
                height: typeof height === 'number' ? `${height}px` : 'auto',
                minWidth: '320px',
                maxWidth: '960px'
            }}
            onPointerDown={(e) => e.stopPropagation()}
        >
            {/* Panel Header & Drag Bar */}
            <div
                onPointerDown={handleDragStart}
                className="px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border-b border-indigo-500/30 flex items-center justify-between cursor-grab active:cursor-grabbing"
            >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                    <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>
                    {isEditing ? (
                        <input
                            type="text"
                            value={draftTitle}
                            onChange={(e) => setDraftTitle(e.target.value)}
                            className="bg-slate-800 border border-indigo-400/50 rounded px-2 py-0.5 text-sm font-bold text-white w-full focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                    ) : (
                        <h4 className="text-sm font-bold text-white truncate tracking-wide">
                            {panel.title}
                        </h4>
                    )}
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-1 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                    <button
                        onClick={handleCopySummary}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                        title="Copy Summary Text"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>

                    {isEditing ? (
                        <button
                            onClick={handleSaveEdits}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1 text-xs font-semibold px-2"
                            title="Done Editing"
                        >
                            <Check className="w-3.5 h-3.5" />
                            <span>Done</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setDraftTitle(panel.title || '');
                                setDraftSummary(panel.summary || '');
                                setDraftKeyPoints(panel.keyPoints || []);
                                setDraftFormula(panel.formulaOrEquation || '');
                                setIsEditing(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition"
                            title="Edit Panel Content"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                        </button>
                    )}

                    <button
                        onClick={() => onDelete?.(panel.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition"
                        title="Delete Panel"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Panel Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar text-xs">
                {/* Visual / Diagram Container (if available) */}
                {currentImg && (
                    <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 group">
                        <img
                            src={currentImg.url || currentImg.thumbnail}
                            alt={currentImg.title || panel.title}
                            className="w-full max-h-52 object-contain bg-black/40"
                            crossOrigin="anonymous"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-2 flex items-center justify-between text-[11px]">
                            <span className="text-slate-300 truncate max-w-[200px]">
                                {currentImg.title || 'Concept Diagram'}
                            </span>
                            <div className="flex items-center gap-1">
                                {images.length > 1 && (
                                    <div className="flex items-center gap-1 mr-2 bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px] text-slate-400">
                                        <button
                                            onClick={() => setActiveImgIdx(prev => (prev > 0 ? prev - 1 : images.length - 1))}
                                            className="hover:text-white"
                                        >
                                            <ChevronLeft className="w-3 h-3" />
                                        </button>
                                        <span>{activeImgIdx + 1}/{images.length}</span>
                                        <button
                                            onClick={() => setActiveImgIdx(prev => (prev < images.length - 1 ? prev + 1 : 0))}
                                            className="hover:text-white"
                                        >
                                            <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                                {onSendToCanvasImage && (
                                    <button
                                        onClick={() => onSendToCanvasImage(currentImg.url || currentImg.thumbnail)}
                                        className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-semibold flex items-center gap-1"
                                        title="Stamp Diagram as Independent Image on Canvas"
                                    >
                                        <ImageIcon className="w-2.5 h-2.5" />
                                        <span>Pop out to Board</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Concept Summary / Definition */}
                {isEditing ? (
                    <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                            Core Summary & Definition
                        </label>
                        <textarea
                            value={draftSummary}
                            onChange={(e) => setDraftSummary(e.target.value)}
                            rows={3}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
                        />
                    </div>
                ) : (
                    panel.summary && (
                        <p className="text-slate-200 leading-relaxed font-normal bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                            {panel.summary}
                        </p>
                    )
                )}

                {/* Formula or Equation Highlight (if present) */}
                {isEditing ? (
                    <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 block mb-1">
                            Key Formula / Law (Optional)
                        </label>
                        <input
                            type="text"
                            value={draftFormula}
                            onChange={(e) => setDraftFormula(e.target.value)}
                            placeholder="e.g. F = m * a"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                        />
                    </div>
                ) : (
                    panel.formulaOrEquation && (
                        <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5 flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                                Formula
                            </span>
                            <span className="font-mono text-xs text-amber-200 font-semibold">
                                {panel.formulaOrEquation}
                            </span>
                        </div>
                    )
                )}

                {/* Key Points / Insights */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                            Key Takeaways & Insights
                        </span>
                        {isEditing && (
                            <button
                                onClick={() => setDraftKeyPoints(prev => [...prev, ''])}
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> Add Point
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="space-y-1.5">
                            {draftKeyPoints.map((pt, idx) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        value={pt}
                                        onChange={(e) => {
                                            const updated = [...draftKeyPoints];
                                            updated[idx] = e.target.value;
                                            setDraftKeyPoints(updated);
                                        }}
                                        className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
                                    />
                                    <button
                                        onClick={() => setDraftKeyPoints(prev => prev.filter((_, i) => i !== idx))}
                                        className="text-rose-400 hover:text-rose-300 p-1"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <ul className="space-y-1.5">
                            {(panel.keyPoints || []).map((point, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-slate-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                                    <span className="leading-snug">{point}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Bottom Panel Bar with Resize Handle */}
            <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1 text-slate-400">
                    <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                    AI Academic Panel
                </span>
                
                {/* Resize Handle at Bottom-Right */}
                <div
                    onPointerDown={handleResizeStart}
                    className="p-1 -mr-1 rounded hover:bg-slate-800 cursor-se-resize text-slate-400 hover:text-indigo-400 active:text-indigo-300 transition"
                    title="Drag to resize panel"
                >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v6h-6M21 9v2M21 3v2M15 21h-2M9 21h-2M3 21v-2" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
