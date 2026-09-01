'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    MousePointer2, Pencil, Highlighter, Eraser, Circle, Type, Minus, Sparkles,
    Square, LassoSelect, PenTool, Brush, Droplet, Palette,
    CheckSquare, PaintBucket, Pipette, LayoutTemplate, Clock,
    Square as SquareShape, Circle as CircleShape, Triangle, Star, StickyNote, Waypoints,
    ArrowUpRight, RemoveFormatting, X
} from 'lucide-react';

const INNER_RADIUS = 85;
const OUTER_RADIUS = 145;
const MENU_RADIUS = 165; // Total outer bound to clamp

const INNER_TOOLS = [
    { id: 'select', label: 'Select', icon: MousePointer2 },
    { id: 'pen', label: 'Pen', icon: Pencil },
    { id: 'highlighter', label: 'Highlighter', icon: Highlighter },
    { id: 'eraser', label: 'Eraser', icon: Eraser },
    { id: 'shapes', label: 'Shapes', icon: Circle },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'line', label: 'Line/Arrow', icon: Minus },
    { id: 'more', label: 'More', icon: Sparkles },
];

const OUTER_TOOLS = {
    select: [
        { id: 'rect_select', label: 'Rectangle', icon: Square, action: { selectMode: 'rectangle' } },
        { id: 'lasso_select', label: 'Lasso', icon: LassoSelect, action: { selectMode: 'lasso' } },
    ],
    pen: [
        { id: 'pen_thin', label: 'Thin (2px)', icon: Pencil, action: { strokeWidth: 2 } },
        { id: 'pen_med', label: 'Medium (4px)', icon: Pencil, action: { strokeWidth: 4 } },
        { id: 'pen_thick', label: 'Thick (8px)', icon: Pencil, action: { strokeWidth: 8 } },
        { id: 'pen_calligraphy', label: 'Calligraphy', icon: PenTool, action: { brushType: 'calligraphy' } },
        { id: 'pen_crayon', label: 'Crayon', icon: Brush, action: { brushType: 'crayon' } },
        { id: 'pen_watercolor', label: 'Watercolor', icon: Droplet, action: { brushType: 'watercolor' } },
    ],
    highlighter: [
        { id: 'hl_yellow', label: 'Yellow', icon: Highlighter, action: { color: 'yellow' }, colorClass: 'text-yellow-400' },
        { id: 'hl_green', label: 'Green', icon: Highlighter, action: { color: 'green' }, colorClass: 'text-green-400' },
        { id: 'hl_blue', label: 'Blue', icon: Highlighter, action: { color: 'blue' }, colorClass: 'text-blue-400' },
        { id: 'hl_pink', label: 'Pink', icon: Highlighter, action: { color: 'pink' }, colorClass: 'text-pink-400' },
        { id: 'hl_orange', label: 'Orange', icon: Highlighter, action: { color: 'orange' }, colorClass: 'text-orange-400' },
    ],
    eraser: [
        { id: 'erase_small', label: 'Small', icon: Eraser, action: { eraserSize: 5 } },
        { id: 'erase_med', label: 'Medium', icon: Eraser, action: { eraserSize: 10 } },
        { id: 'erase_large', label: 'Large', icon: Eraser, action: { eraserSize: 20 } },
        { id: 'erase_obj', label: 'Object', icon: RemoveFormatting, action: { eraserMode: 'object' } },
    ],
    shapes: [
        { id: 'shape_rect', label: 'Rectangle', icon: SquareShape, action: { shapeType: 'rectangle' } },
        { id: 'shape_circle', label: 'Circle', icon: CircleShape, action: { shapeType: 'circle' } },
        { id: 'shape_triangle', label: 'Triangle', icon: Triangle, action: { shapeType: 'triangle' } },
        { id: 'shape_star', label: 'Star', icon: Star, action: { shapeType: 'star' } },
        { id: 'shape_sticky', label: 'Sticky', icon: StickyNote, action: { shapeType: 'sticky_note' } },
        { id: 'shape_conn', label: 'Connector', icon: Waypoints, action: { shapeType: 'connector' } },
    ],
    line: [
        { id: 'line_straight', label: 'Line', icon: Minus, action: { lineType: 'straight' } },
        { id: 'line_arrow', label: 'Arrow', icon: ArrowUpRight, action: { lineType: 'arrow' } },
    ],
    more: [
        { id: 'more_laser', label: 'Laser', icon: Sparkles, action: { action: 'laser' } },
        { id: 'more_fill', label: 'Fill', icon: PaintBucket, action: { action: 'fill' } },
        { id: 'more_eye', label: 'Eyedropper', icon: Pipette, action: { action: 'eyedropper' } },
        { id: 'more_tmpl', label: 'Templates', icon: LayoutTemplate, action: { action: 'templates' } },
        { id: 'more_date', label: 'DateTime', icon: Clock, action: { action: 'datetime' } },
    ],
};

export default function RadialToolbar({
    isOpen,
    position,
    currentTool,
    currentBrushType,
    onToolSelect,
    onClose,
    canvasBounds
}) {
    const [hoveredInner, setHoveredInner] = useState(null);
    const [isClosing, setIsClosing] = useState(false);
    const [clampedPos, setClampedPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
            setHoveredInner(null);

            // Clamp position
            let cx = position.x;
            let cy = position.y;
            if (canvasBounds) {
                cx = Math.max(MENU_RADIUS, Math.min(canvasBounds.width - MENU_RADIUS, cx));
                cy = Math.max(MENU_RADIUS, Math.min(canvasBounds.height - MENU_RADIUS, cy));
            }
            setClampedPos({ x: cx, y: cy });
        }
    }, [isOpen, position, canvasBounds]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 150);
    };

    const handleInnerClick = (tool) => {
        if (!OUTER_TOOLS[tool.id] || OUTER_TOOLS[tool.id].length === 0) {
            onToolSelect(tool.id);
            handleClose();
        } else {
            // Keep it open, just select the tool itself generally, or require outer click?
            onToolSelect(tool.id);
            setHoveredInner(tool.id);
        }
    };

    const handleOuterClick = (innerId, outerTool) => {
        onToolSelect(innerId, outerTool.action);
        handleClose();
    };

    if (!isOpen && !isClosing) return null;

    const CurrentIcon = INNER_TOOLS.find(t => t.id === currentTool)?.icon || Pencil;
    const activeOuterTools = hoveredInner ? OUTER_TOOLS[hoveredInner] : null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
            {/* Backdrop */}
            <div 
                className={`absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto transition-opacity duration-150 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
                onClick={handleClose}
            />

            {/* Radial Container */}
            <div 
                className={`absolute pointer-events-auto transition-all transform-gpu origin-center
                    ${isClosing ? 'scale-80 opacity-0 duration-150 ease-in' : 'scale-100 opacity-100 duration-250'}
                `}
                style={{ 
                    left: clampedPos.x, 
                    top: clampedPos.y,
                    transitionTimingFunction: isClosing ? 'ease-in' : 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
            >
                {/* Outer Ring */}
                {activeOuterTools && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        {activeOuterTools.map((tool, i) => {
                            const angle = (i * (360 / activeOuterTools.length) - 90) * (Math.PI / 180);
                            const x = OUTER_RADIUS * Math.cos(angle);
                            const y = OUTER_RADIUS * Math.sin(angle);
                            
                            return (
                                <button
                                    key={tool.id}
                                    onClick={(e) => { e.stopPropagation(); handleOuterClick(hoveredInner, tool); }}
                                    className={`absolute flex flex-col items-center justify-center w-9 h-9 rounded-full 
                                        bg-slate-800/80 border border-white/10 text-white shadow-lg
                                        hover:bg-white/20 hover:scale-110 transition-all duration-200
                                        animate-in zoom-in spin-in-12 fade-in slide-in-from-center-10
                                    `}
                                    style={{
                                        transform: `translate(${x}px, ${y}px)`,
                                        animationDuration: '200ms',
                                        animationDelay: `${i * 20}ms`,
                                        animationFillMode: 'both'
                                    }}
                                    title={tool.label}
                                >
                                    <tool.icon className={`w-4 h-4 ${tool.colorClass || ''}`} />
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Inner Ring */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {INNER_TOOLS.map((tool, i) => {
                        const angle = (i * 45 - 90) * (Math.PI / 180); // 8 items = 45 degrees
                        const x = INNER_RADIUS * Math.cos(angle);
                        const y = INNER_RADIUS * Math.sin(angle);
                        const isActive = currentTool === tool.id;
                        const isHovered = hoveredInner === tool.id;

                        return (
                            <button
                                key={tool.id}
                                onClick={(e) => { e.stopPropagation(); handleInnerClick(tool); }}
                                onMouseEnter={() => setHoveredInner(tool.id)}
                                onMouseLeave={() => { /* Option to keep open until moving far away or entering center */ }}
                                className={`absolute flex flex-col items-center justify-center w-11 h-11 rounded-full shadow-lg
                                    backdrop-blur-xl border border-white/10 text-white transition-all duration-200
                                    hover:scale-110 group
                                    ${isActive ? 'bg-blue-500/30 ring-2 ring-blue-400' : 'bg-slate-900/90 hover:bg-white/20'}
                                    ${!isClosing ? 'animate-in zoom-in fade-in' : ''}
                                `}
                                style={{
                                    transform: `translate(${x}px, ${y}px)`,
                                    animationDuration: '300ms',
                                    animationDelay: `${i * 30}ms`,
                                    animationFillMode: 'both'
                                }}
                            >
                                <tool.icon className="w-5 h-5 mb-0.5" />
                                <span className="text-[9px] font-medium leading-none opacity-80 group-hover:opacity-100">
                                    {tool.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Center Hub */}
                <button
                    onClick={(e) => { e.stopPropagation(); handleClose(); }}
                    className={`absolute flex items-center justify-center w-[50px] h-[50px] rounded-full 
                        bg-gradient-to-br from-indigo-600 to-purple-600 shadow-xl border-2 border-white/20
                        text-white hover:scale-110 hover:shadow-2xl transition-all duration-200 z-10
                        transform -translate-x-1/2 -translate-y-1/2
                    `}
                    style={{ left: 0, top: 0 }}
                >
                    <CurrentIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}
