'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    X, Keyboard, MousePointer2, Pencil, Highlighter, Eraser, Type,
    Square, Circle, Diamond, Minus, Waypoints, Image as ImageIcon,
    StickyNote, ZoomIn, ZoomOut, RotateCcw, Maximize, Undo2, Redo2,
    Copy, Scissors, ClipboardPaste, Trash2, Layers, Move,
    Sparkles, LayoutTemplate, CheckSquare, Search, Box, Video, Infinity as InfinityIcon
} from 'lucide-react';

export default function WhiteboardShortcutsModal({ isOpen, onClose }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isMac, setIsMac] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent));
        }
    }, []);

    // Dismiss with Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const modKey = isMac ? '⌘' : 'Ctrl';
    const altKey = isMac ? '⌥' : 'Alt';
    const shiftKey = isMac ? '⇧' : 'Shift';

    const shortcutCategories = useMemo(() => [
        {
            title: 'Tools & Drawing',
            icon: Pencil,
            shortcuts: [
                { key: 'V / S', desc: 'Select Tool (Click or Marquee Box)', icon: MousePointer2 },
                { key: 'P', desc: 'Pen / Freehand Pencil Drawing', icon: Pencil },
                { key: 'H', desc: 'Highlighter (Semi-transparent Ink)', icon: Highlighter },
                { key: 'E', desc: 'Eraser Tool', icon: Eraser },
                { key: 'T', desc: 'Text Tool (Click anywhere to type)', icon: Type },
                { key: 'R', desc: 'Rectangle / Box Shape', icon: Square },
                { key: 'C', desc: 'Circle / Ellipse Shape', icon: Circle },
                { key: 'D', desc: 'Diamond Decision Shape', icon: Diamond },
                { key: 'L', desc: 'Straight Line / Arrow Shape', icon: Minus },
                { key: 'K / X', desc: 'Smart Magnetic Connector Line', icon: Waypoints },
                { key: 'I', desc: 'Insert Image from Device', icon: ImageIcon },
                { key: 'N', desc: 'Sticky Note / Card', icon: StickyNote },
                { key: '3', desc: '3D Objects & Models Gallery', icon: Box },
                { key: 'U', desc: 'Insert Canvas Media Player', icon: Video },
            ]
        },
        {
            title: 'Canvas, Zoom & Navigation',
            icon: ZoomIn,
            shortcuts: [
                { key: '+ / =', desc: 'Zoom In (+25%)', icon: ZoomIn },
                { key: '−', desc: 'Zoom Out (-25%)', icon: ZoomOut },
                { key: '0', desc: 'Reset Zoom to 100% (Centered)', icon: RotateCcw },
                { key: '9', desc: 'Fit Canvas Content to Screen', icon: Maximize },
                { key: `${shiftKey} + M`, desc: 'Toggle Interactive Minimap', icon: Layers },
                { key: 'Space + Drag', desc: 'Hand Tool / Pan Canvas Viewport', icon: Move },
                { key: '2-Finger Pinch', desc: 'Touch / Stylus Pinch to Zoom', icon: ZoomIn },
                { key: '2-Finger Drag', desc: 'Touch / Stylus Pan Viewport', icon: Move },
                { key: 'F', desc: 'Toggle Fullscreen Mode', icon: Maximize },
                { key: `${shiftKey} + S`, desc: 'Toggle Spotlight Focus (Torch)', icon: Sparkles },
                { key: `${shiftKey} + C`, desc: 'Toggle Screen Curtain / Shade', icon: Layers },
            ]
        },
        {
            title: 'Edit, History & Clipboard',
            icon: Copy,
            shortcuts: [
                { key: `${modKey} + Z`, desc: 'Undo Last Canvas Action', icon: Undo2 },
                { key: `${modKey} + ${shiftKey} + Z`, desc: 'Redo Canvas Action', icon: Redo2 },
                { key: `${modKey} + C`, desc: 'Copy Selected Elements', icon: Copy },
                { key: `${modKey} + X`, desc: 'Cut Selected Elements', icon: Scissors },
                { key: `${modKey} + V`, desc: 'Paste (Whiteboard, Images, Web, 3D)', icon: ClipboardPaste },
                { key: `${modKey} + D`, desc: 'Duplicate Selected Items', icon: Copy },
                { key: 'Backspace / Del', desc: 'Delete Selected Items', icon: Trash2 },
                { key: `${modKey} + A`, desc: 'Select All Objects on Canvas', icon: MousePointer2 },
                { key: 'Esc', desc: 'Deselect All / Defocus Active Text', icon: X },
                { key: `${shiftKey} + V`, desc: 'Open Movable Clipboard Panel', icon: ClipboardPaste },
                { key: `${shiftKey} + T`, desc: 'Toggle Tasks Checklist Panel', icon: CheckSquare },
            ]
        },
        {
            title: 'Arrange, 3D & Infinite Clone',
            icon: Layers,
            shortcuts: [
                { key: `${modKey} + G`, desc: 'Group Selected Shapes', icon: Layers },
                { key: `${modKey} + ${shiftKey} + G`, desc: 'Ungroup Selected Group', icon: Layers },
                { key: `${modKey} + L`, desc: 'Lock / Unlock Selected Elements', icon: Layers },
                { key: `${modKey} + ]`, desc: 'Bring Forward / To Front', icon: Layers },
                { key: `${modKey} + [`, desc: 'Send Backward / To Back', icon: Layers },
                { key: `${shiftKey} + H`, desc: 'Flip Selected Horizontally', icon: Move },
                { key: `${shiftKey} + V`, desc: 'Flip Selected Vertically', icon: Move },
                { key: 'R (on select)', desc: 'Rotate 90° Clockwise', icon: RotateCcw },
                { key: 'Arrow Keys', desc: 'Nudge Selected Items by 1px', icon: Move },
                { key: `${shiftKey} + Arrows`, desc: 'Nudge Selected Items by 10px', icon: Move },
                { key: '∞ (Infinite Cloner)', desc: 'Drag Object to Spawn Infinite Clones', icon: InfinityIcon },
                { key: '3D Trackball', desc: 'Drag 3D Gimbal for Pitch, Yaw, Roll', icon: Box },
                { key: `${modKey} + J / A`, desc: 'Open AI Diagram & Template Generator', icon: Sparkles },
                { key: 'M', desc: 'Open Templates & SmartArt Gallery', icon: LayoutTemplate },
                { key: '? / ' + modKey + ' + /', desc: 'Open Keyboard Shortcuts Guide', icon: Keyboard },
            ]
        }
    ], [modKey, altKey, shiftKey]);

    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return shortcutCategories;
        const query = searchQuery.toLowerCase();
        return shortcutCategories.map(cat => ({
            ...cat,
            shortcuts: cat.shortcuts.filter(s => 
                s.desc.toLowerCase().includes(query) || 
                s.key.toLowerCase().includes(query)
            )
        })).filter(cat => cat.shortcuts.length > 0);
    }, [shortcutCategories, searchQuery]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 select-none"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-white animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                            <Keyboard className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                Whiteboard Keyboard Shortcuts
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                                    {isMac ? 'macOS (Apple)' : 'Windows / Linux'}
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400">
                                Master your whiteboard workflow with quick keystrokes and stylus shortcuts
                            </p>
                        </div>
                    </div>

                    {/* Search filter */}
                    <div className="flex items-center gap-3">
                        <div className="relative w-48 sm:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search shortcuts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                            title="Close (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Landscape Categorized Grid Content */}
                <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 custom-scrollbar">
                    {filteredCategories.map((category, idx) => (
                        <div 
                            key={idx}
                            className="bg-slate-950/50 border border-slate-800/90 rounded-xl p-4 flex flex-col space-y-3"
                        >
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                                <category.icon className="w-4 h-4 text-indigo-400 shrink-0" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                                    {category.title}
                                </h3>
                                <span className="text-[10px] text-slate-500 ml-auto">
                                    {category.shortcuts.length}
                                </span>
                            </div>

                            <div className="space-y-2 overflow-y-auto pr-1">
                                {category.shortcuts.map((sc, sIdx) => (
                                    <div 
                                        key={sIdx}
                                        className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-800/50 transition group"
                                    >
                                        <span className="text-[11px] text-slate-300 group-hover:text-slate-100 transition leading-snug">
                                            {sc.desc}
                                        </span>
                                        <kbd className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/80 text-[10px] font-mono font-bold text-indigo-200 shrink-0 shadow-xs">
                                            {sc.key}
                                        </kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {filteredCategories.length === 0 && (
                        <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                            <Keyboard className="w-8 h-8 opacity-30" />
                            <p className="text-sm">No shortcuts found matching "{searchQuery}"</p>
                        </div>
                    )}
                </div>

                {/* Footer Tips */}
                <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-4">
                        <span>💡 <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono">?</kbd> anytime to open this guide</span>
                        <span>•</span>
                        <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono">Esc</kbd> to close</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition shadow-sm ml-auto"
                    >
                        Got It
                    </button>
                </div>
            </div>
        </div>
    );
}
