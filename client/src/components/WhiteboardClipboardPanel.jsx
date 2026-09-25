'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Files, X, Trash2, ClipboardPaste, ChevronDown, ChevronUp,
    GripHorizontal, Type, Square, Circle, Image as ImageIcon,
    Minus, Waypoints, Layers, Box
} from 'lucide-react';

export default function WhiteboardClipboardPanel({
    clipboardHistory = [],
    onPasteItem,
    onDeleteItem,
    onClearClipboard,
    isOpen = true,
    onClose
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [position, setPosition] = useState({ x: 24, y: 120 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const panelRef = useRef(null);

    // Restore saved position and state
    useEffect(() => {
        try {
            const saved = localStorage.getItem('whiteboard_clipboard_pos');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    const maxX = Math.max(10, (window.innerWidth || 1200) - 340);
                    const maxY = Math.max(60, (window.innerHeight || 800) - 360);
                    setPosition({
                        x: Math.max(10, Math.min(maxX, parsed.x)),
                        y: Math.max(60, Math.min(maxY, parsed.y))
                    });
                }
                if (typeof parsed.isCollapsed === 'boolean') {
                    setIsCollapsed(parsed.isCollapsed);
                }
            }
        } catch (e) {}
    }, []);

    // Save position and state changes
    const saveState = useCallback((newPos, newCollapsed) => {
        try {
            localStorage.setItem('whiteboard_clipboard_pos', JSON.stringify({
                x: newPos.x,
                y: newPos.y,
                isCollapsed: newCollapsed
            }));
        } catch (e) {}
    }, []);

    // Dragging handler
    const handleDragStart = (e) => {
        const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        setIsDragging(true);
        dragOffsetRef.current = {
            x: clientX - position.x,
            y: clientY - position.y
        };
        e.stopPropagation();
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (e) => {
            const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            const rawX = clientX - dragOffsetRef.current.x;
            const rawY = clientY - dragOffsetRef.current.y;

            const maxX = Math.max(10, (window.innerWidth || 1200) - 330);
            const maxY = Math.max(60, (window.innerHeight || 800) - 100);

            const boundedX = Math.max(10, Math.min(maxX, rawX));
            const boundedY = Math.max(60, Math.min(maxY, rawY));

            const newPos = { x: boundedX, y: boundedY };
            setPosition(newPos);
            saveState(newPos, isCollapsed);
        };

        const handleUp = () => {
            setIsDragging(false);
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
    }, [isDragging, isCollapsed, saveState]);

    if (!isOpen || clipboardHistory.length === 0) return null;

    // Helper to render high-fidelity preview thumbnail for each item
    const renderItemPreview = (item) => {
        if (item.dataURL) {
            return (
                <img
                    src={item.dataURL}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain pointer-events-none select-none rounded"
                />
            );
        }

        if (item.type === 'image' && item.data?.src) {
            return (
                <img
                    src={item.data.src}
                    alt="Pasted item"
                    className="max-w-full max-h-full object-contain pointer-events-none select-none rounded"
                />
            );
        }

        if (item.type === 'text' || item.type === 'texts') {
            const textContent = item.type === 'text' 
                ? (item.data?.text || 'Text') 
                : ((item.data && item.data[0]?.text) ? `${item.data[0].text}...` : 'Multi-text');
            return (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center overflow-hidden">
                    <Type className="w-4 h-4 text-indigo-400 mb-1 shrink-0" />
                    <span 
                        className="text-slate-200 text-xs font-medium line-clamp-2 break-words"
                        style={{
                            color: item.data?.textColor || item.data?.color || '#e2e8f0',
                            fontFamily: item.data?.fontFamily || 'sans-serif'
                        }}
                    >
                        {textContent}
                    </span>
                </div>
            );
        }

        if (item.type === 'shape' || item.type === 'shapes') {
            const isConnector = item.data?.type === 'connector' || (Array.isArray(item.data) && item.data[0]?.type === 'connector');
            const shapeColor = item.data?.color || item.data?.stroke || (Array.isArray(item.data) ? item.data[0]?.color : '#818cf8') || '#818cf8';
            const shapeFill = item.data?.fill || 'rgba(129, 140, 248, 0.2)';
            const shapeLabel = item.data?.text || item.data?.label || (Array.isArray(item.data) ? `${item.data.length} shapes` : (item.data?.type || 'Shape'));

            return (
                <div className="w-full h-full flex flex-col items-center justify-center p-1.5 relative overflow-hidden">
                    <svg viewBox="0 0 80 50" className="w-16 h-10 shrink-0">
                        {isConnector ? (
                            <path d="M 10 35 C 30 10, 50 40, 70 15" stroke={shapeColor} strokeWidth="3" fill="none" markerEnd="url(#arrow)" />
                        ) : (
                            <rect x="10" y="8" width="60" height="34" rx="4" fill={shapeFill} stroke={shapeColor} strokeWidth="2" />
                        )}
                    </svg>
                    <span className="text-[10px] text-slate-300 font-semibold truncate max-w-full px-1 mt-0.5">
                        {shapeLabel}
                    </span>
                </div>
            );
        }

        if (item.type === '3d_object') {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                    <Box className="w-6 h-6 text-sky-400 mb-1" />
                    <span className="text-[10px] text-slate-200 font-bold uppercase truncate">
                        {item.data?.modelType || '3D Model'}
                    </span>
                </div>
            );
        }

        if (item.type === 'group') {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                    <Layers className="w-6 h-6 text-violet-400 mb-1" />
                    <span className="text-[10px] text-slate-200 font-bold truncate">
                        Group ({item.data?.length || 'Items'})
                    </span>
                </div>
            );
        }

        return (
            <div className="text-slate-400 text-xs uppercase font-mono font-bold">
                {item.type}
            </div>
        );
    };

    return (
        <div
            ref={panelRef}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`
            }}
            className={`fixed z-[85] select-none transition-shadow ${
                isDragging ? 'cursor-grabbing opacity-90' : ''
            }`}
        >
            {/* Collapsed Pill Mode */}
            {isCollapsed ? (
                <div 
                    onClick={() => {
                        setIsCollapsed(false);
                        saveState(position, false);
                    }}
                    className="bg-slate-900/95 border border-slate-700/80 text-white rounded-full px-3.5 py-2 shadow-2xl flex items-center gap-2.5 cursor-pointer hover:bg-slate-800 transition group hover:scale-105"
                    title="Expand Clipboard Panel"
                >
                    <div 
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        className="cursor-grab p-0.5 hover:text-indigo-400"
                        title="Drag to reposition"
                    >
                        <GripHorizontal className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <Files className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-200">Clipboard</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-mono font-bold">
                        {clipboardHistory.length}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition" />
                </div>
            ) : (
                /* Full Expanded Panel */
                <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl w-80 max-h-[420px] flex flex-col overflow-hidden text-white animate-in zoom-in-95 duration-150">
                    {/* Header */}
                    <div 
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        className="px-3.5 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between cursor-grab active:cursor-grabbing"
                    >
                        <div className="flex items-center gap-2">
                            <GripHorizontal className="w-3.5 h-3.5 text-slate-500" />
                            <Files className="w-4 h-4 text-indigo-400" />
                            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                                Clipboard History
                                <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-mono">
                                    {clipboardHistory.length}
                                </span>
                            </h3>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => {
                                    setIsCollapsed(true);
                                    saveState(position, true);
                                }}
                                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                                title="Collapse Panel"
                            >
                                <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                                title="Close Clipboard"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Tiles Grid */}
                    <div className="p-3 overflow-y-auto flex-1 grid grid-cols-2 gap-2.5 max-h-[300px] custom-scrollbar">
                        {clipboardHistory.map((item, idx) => (
                            <div
                                key={item.id || idx}
                                className="relative group bg-slate-950/60 border border-slate-800 hover:border-indigo-500/80 rounded-xl overflow-hidden flex flex-col items-center justify-center h-28 p-1.5 transition-all shadow-xs hover:shadow-indigo-500/10 cursor-pointer"
                                onClick={() => onPasteItem && onPasteItem(item)}
                                title={`Click to paste ${item.type || 'element'}`}
                            >
                                {/* Preview Thumbnail */}
                                <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                    {renderItemPreview(item)}
                                </div>

                                {/* Hover Paste Overlay */}
                                <div className="absolute inset-0 bg-indigo-600/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[0.5px]">
                                    <div className="px-2 py-1 rounded-md bg-indigo-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-md">
                                        <ClipboardPaste className="w-3 h-3" /> Paste
                                    </div>
                                </div>

                                {/* Item index badge */}
                                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-900/85 text-[9px] font-mono text-slate-400 border border-slate-800">
                                    #{idx + 1}
                                </div>

                                {/* Delete item button */}
                                {onDeleteItem && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteItem(item.id);
                                        }}
                                        className="absolute top-1 right-1 p-1 rounded bg-slate-900/85 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                                        title="Delete from clipboard"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="px-3.5 py-2.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-2 text-xs">
                        <span className="text-[10px] text-slate-400">Click item to insert</span>
                        {onClearClipboard && (
                            <button
                                onClick={onClearClipboard}
                                className="px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
