'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    MousePointer2, Pencil, Highlighter, Eraser, Circle, Type, Minus, Sparkles,
    Square, LassoSelect, PenTool, Brush, Droplet,
    PaintBucket, Pipette, LayoutTemplate, Clock,
    Square as SquareShape, Circle as CircleShape, Triangle, Star, StickyNote, Waypoints,
    ArrowUpRight, RemoveFormatting, X
} from 'lucide-react';

const INNER_RADIUS = 80;
const SUB_ARC_RADIUS = 55; // Distance from parent tool to sub-tool
const MENU_RADIUS = 160;   // Bounding radius for position clamping

const INNER_TOOLS = [
    { id: 'select', label: 'Select', icon: MousePointer2 },
    { id: 'pen', label: 'Pen', icon: Pencil },
    { id: 'highlighter', label: 'Highlighter', icon: Highlighter },
    { id: 'eraser', label: 'Eraser', icon: Eraser },
    { id: 'shapes', label: 'Shapes', icon: Circle },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'line', label: 'Line', icon: Minus },
    { id: 'more', label: 'More', icon: Sparkles },
];

const OUTER_TOOLS = {
    select: [
        { id: 'rect_select', label: 'Rectangle', icon: Square, action: { selectMode: 'rectangle' } },
        { id: 'lasso_select', label: 'Lasso', icon: LassoSelect, action: { selectMode: 'lasso' } },
    ],
    pen: [
        { id: 'pen_thin', label: '2px', icon: Pencil, action: { strokeWidth: 2 } },
        { id: 'pen_med', label: '4px', icon: Pencil, action: { strokeWidth: 4 } },
        { id: 'pen_thick', label: '8px', icon: Pencil, action: { strokeWidth: 8 } },
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
        { id: 'erase_med', label: 'Medium', icon: Eraser, action: { eraserSize: 15 } },
        { id: 'erase_large', label: 'Large', icon: Eraser, action: { eraserSize: 30 } },
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
    const [clampedPos, setClampedPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setHoveredInner(currentTool);

            let cx = position.x;
            let cy = position.y;
            if (canvasBounds) {
                cx = Math.max(MENU_RADIUS + 20, Math.min(canvasBounds.width - MENU_RADIUS - 20, cx));
                cy = Math.max(MENU_RADIUS + 20, Math.min(canvasBounds.height - MENU_RADIUS - 20, cy));
            }
            setClampedPos({ x: cx, y: cy });
        }
    }, [isOpen, position, canvasBounds, currentTool]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const activeOuterTools = (hoveredInner && OUTER_TOOLS[hoveredInner]) ? OUTER_TOOLS[hoveredInner] : null;
    const parentIndex = INNER_TOOLS.findIndex(t => t.id === hoveredInner);
    const parentAngleDeg = parentIndex !== -1 ? (parentIndex * 45 - 90) : -90;
    const parentAngleRad = parentAngleDeg * (Math.PI / 180);
    const parentX = INNER_RADIUS * Math.cos(parentAngleRad);
    const parentY = INNER_RADIUS * Math.sin(parentAngleRad);

    // Calculate sub-tool positions relative to parent tool
    const subToolPositions = [];
    if (activeOuterTools && activeOuterTools.length > 0) {
        const numSub = activeOuterTools.length;
        const totalSpanDeg = Math.min(130, numSub * 26);
        const stepDeg = numSub > 1 ? totalSpanDeg / (numSub - 1) : 0;
        const startDeg = parentAngleDeg - totalSpanDeg / 2;

        activeOuterTools.forEach((tool, i) => {
            const subDeg = startDeg + i * stepDeg;
            const subRad = subDeg * (Math.PI / 180);
            const sx = parentX + SUB_ARC_RADIUS * Math.cos(subRad);
            const sy = parentY + SUB_ARC_RADIUS * Math.sin(subRad);
            subToolPositions.push({ tool, x: sx, y: sy, angleDeg: subDeg });
        });
    }

    const handleInnerClick = (e, tool) => {
        e.stopPropagation();
        e.preventDefault();
        setHoveredInner(tool.id);
        onToolSelect(tool.id);
        if (!OUTER_TOOLS[tool.id]) {
            onClose();
        }
    };

    const handleOuterClick = (e, innerId, outerTool) => {
        e.stopPropagation();
        e.preventDefault();
        onToolSelect(innerId, outerTool.action);
        onClose();
    };

    const CurrentIcon = INNER_TOOLS.find(t => t.id === currentTool)?.icon || Pencil;

    return (
        <div
            ref={containerRef}
            className="radial-toolbar-container absolute z-50 pointer-events-auto select-none animate-in zoom-in-90 duration-150"
            style={{
                left: clampedPos.x,
                top: clampedPos.y,
                transform: 'translate(-50%, -50%)',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            {/* SVG Ring Background & Arc Highlight */}
            <svg
                className="absolute overflow-visible pointer-events-none"
                style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
                width="360"
                height="360"
                viewBox="-180 -180 360 360"
            >
                <defs>
                    <filter id="radialGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1e293b" stopOpacity="0.92" />
                        <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
                    </linearGradient>
                </defs>

                {/* Main Inner Ring Background Track */}
                <circle
                    cx="0"
                    cy="0"
                    r={INNER_RADIUS}
                    fill="none"
                    stroke="url(#ringGrad)"
                    strokeWidth="48"
                    className="drop-shadow-xl"
                />
                <circle
                    cx="0"
                    cy="0"
                    r={INNER_RADIUS - 24}
                    fill="none"
                    stroke="rgba(99, 102, 241, 0.35)"
                    strokeWidth="1.5"
                />
                <circle
                    cx="0"
                    cy="0"
                    r={INNER_RADIUS + 24}
                    fill="none"
                    stroke="rgba(99, 102, 241, 0.35)"
                    strokeWidth="1.5"
                />

                {/* Sub-tool Connecting Fan Arc Background */}
                {activeOuterTools && activeOuterTools.length > 0 && (
                    <g className="animate-in fade-in zoom-in-75 duration-200">
                        {/* Connector line from parent to arc */}
                        <line
                            x1={parentX}
                            y1={parentY}
                            x2={parentX + Math.cos(parentAngleRad) * (SUB_ARC_RADIUS + 10)}
                            y2={parentY + Math.sin(parentAngleRad) * (SUB_ARC_RADIUS + 10)}
                            stroke="#6366f1"
                            strokeWidth="3"
                            strokeDasharray="4,3"
                            opacity="0.8"
                        />
                        {/* Sub-tool background pill fan */}
                        {subToolPositions.map((st, idx) => (
                            <circle
                                key={idx}
                                cx={st.x}
                                cy={st.y}
                                r="22"
                                fill="#0f172a"
                                stroke="#818cf8"
                                strokeWidth="2"
                                opacity="0.92"
                                filter="url(#radialGlow)"
                            />
                        ))}
                    </g>
                )}
            </svg>

            {/* Sub-Tool Buttons (Anchored near parent tool in an arc) */}
            {activeOuterTools && subToolPositions.map(({ tool, x, y }) => (
                <button
                    key={tool.id}
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => handleOuterClick(e, hoveredInner, tool)}
                    className="absolute flex flex-col items-center justify-center w-10 h-10 rounded-full bg-slate-900/95 border-2 border-indigo-400 text-white shadow-xl hover:scale-115 hover:bg-indigo-600 hover:border-white transition-all duration-150 z-30 cursor-pointer"
                    style={{
                        left: x,
                        top: y,
                        transform: 'translate(-50%, -50%)',
                    }}
                    title={tool.label}
                >
                    <tool.icon className={'w-4 h-4 ' + (tool.colorClass || '')} />
                    <span className="text-[8px] font-bold mt-0.5 leading-none px-1 rounded bg-slate-950/80 text-indigo-200 whitespace-nowrap">
                        {tool.label}
                    </span>
                </button>
            ))}

            {/* Inner Ring Buttons */}
            {INNER_TOOLS.map((tool, i) => {
                const angleRad = (i * 45 - 90) * (Math.PI / 180);
                const x = INNER_RADIUS * Math.cos(angleRad);
                const y = INNER_RADIUS * Math.sin(angleRad);
                const isActive = currentTool === tool.id;
                const isHovered = hoveredInner === tool.id;

                return (
                    <button
                        key={tool.id}
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => handleInnerClick(e, tool)}
                        onMouseEnter={() => setHoveredInner(tool.id)}
                        className={'absolute flex flex-col items-center justify-center w-11 h-11 rounded-full shadow-2xl transition-all duration-150 z-20 cursor-pointer ' + (
                            isHovered
                                ? 'bg-indigo-600 text-white border-2 border-white scale-115 shadow-indigo-500/50'
                                : isActive
                                    ? 'bg-blue-600 text-white border-2 border-blue-300 scale-105'
                                    : 'bg-slate-900/90 text-slate-200 border border-slate-700/80 hover:bg-slate-800 hover:text-white'
                        )}
                        style={{
                            left: x,
                            top: y,
                            transform: 'translate(-50%, -50%)',
                        }}
                        title={tool.label}
                    >
                        <tool.icon className="w-5 h-5" />
                        <span className="text-[8px] font-extrabold leading-none mt-0.5 opacity-90">
                            {tool.label}
                        </span>
                    </button>
                );
            })}

            {/* Center Hub */}
            <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                className="absolute flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-2xl border-2 border-white/40 text-white hover:scale-110 transition-all duration-150 z-40 cursor-pointer"
                style={{
                    left: 0,
                    top: 0,
                    transform: 'translate(-50%, -50%)',
                }}
                title="Close Wheel"
            >
                <CurrentIcon className="w-6 h-6" />
            </button>
        </div>
    );
}
