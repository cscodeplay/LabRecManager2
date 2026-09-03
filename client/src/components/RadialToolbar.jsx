'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    MousePointer2, Pencil, Highlighter, Eraser, Circle, Type, Minus, Sparkles,
    Square, LassoSelect, PenTool, Brush, Droplet, Feather,
    PaintBucket, Pipette, LayoutTemplate, Clock,
    Square as SquareShape, Circle as CircleShape, Triangle, Star, StickyNote, Waypoints,
    ArrowUpRight, ArrowLeftRight, Spline, MoreHorizontal, Diamond, Hexagon, Cloud,
    CheckSquare, Trash2, Undo2, Redo2, RectangleHorizontal, X
} from 'lucide-react';

// ─── Geometric Dimensions (Sleek Proportions) ──────────────────────────────
const R_INNER_RING = 60;       // Inner edge of main wheel
const R_OUTER_RING = 92;       // Outer edge of main wheel (thickness = 32px)
const R_TRACK_MID = 76;        // Midpoint radius of inner wheel buttons
const R_SUB_INNER = 110;       // Inner edge of outer sub-arc
const R_SUB_OUTER = 142;       // Outer edge of outer sub-arc (thickness = 32px)
const R_SUB_MID = 126;         // Midpoint radius of sub-arc buttons
const MENU_BOUNDING_R = 158;   // Clamping radius from center

// ─── Tool Definitions ──────────────────────────────────────────────────────
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
        { id: 'rect_select', label: 'Box', icon: Square, action: { selectMode: 'rectangle' } },
        { id: 'lasso_select', label: 'Lasso', icon: LassoSelect, action: { selectMode: 'lasso' } },
        { id: 'select_all', label: 'All', icon: CheckSquare, action: { action: 'select_all' } },
    ],
    pen: [
        { id: 'pen_thin', label: '2px', icon: Pencil, action: { strokeWidth: 2, brushType: 'normal' } },
        { id: 'pen_med', label: '4px', icon: Pencil, action: { strokeWidth: 4, brushType: 'normal' } },
        { id: 'pen_thick', label: '8px', icon: Pencil, action: { strokeWidth: 8, brushType: 'normal' } },
        { id: 'pen_calligraphy', label: 'Callig', icon: PenTool, action: { brushType: 'calligraphy' } },
        { id: 'pen_crayon', label: 'Crayon', icon: Brush, action: { brushType: 'crayon' } },
        { id: 'pen_watercolor', label: 'Water', icon: Droplet, action: { brushType: 'watercolor' } },
        { id: 'pen_fountain', label: 'Fount', icon: Feather, action: { brushType: 'fountain' } },
    ],
    highlighter: [
        { id: 'hl_yellow', label: 'Yellow', icon: Highlighter, action: { color: 'yellow' }, colorClass: 'text-yellow-400 bg-yellow-400/20' },
        { id: 'hl_green', label: 'Green', icon: Highlighter, action: { color: 'green' }, colorClass: 'text-emerald-400 bg-emerald-400/20' },
        { id: 'hl_blue', label: 'Blue', icon: Highlighter, action: { color: 'blue' }, colorClass: 'text-sky-400 bg-sky-400/20' },
        { id: 'hl_pink', label: 'Pink', icon: Highlighter, action: { color: 'pink' }, colorClass: 'text-pink-400 bg-pink-400/20' },
        { id: 'hl_orange', label: 'Orange', icon: Highlighter, action: { color: 'orange' }, colorClass: 'text-orange-400 bg-orange-400/20' },
        { id: 'hl_purple', label: 'Purple', icon: Highlighter, action: { color: 'purple' }, colorClass: 'text-purple-400 bg-purple-400/20' },
        { id: 'hl_cyan', label: 'Cyan', icon: Highlighter, action: { color: 'cyan' }, colorClass: 'text-cyan-400 bg-cyan-400/20' },
    ],
    eraser: [
        { id: 'erase_small', label: '6px', icon: Eraser, action: { eraserSize: 6, eraserMode: 'pixel' } },
        { id: 'erase_med', label: '16px', icon: Eraser, action: { eraserSize: 16, eraserMode: 'pixel' } },
        { id: 'erase_large', label: '32px', icon: Eraser, action: { eraserSize: 32, eraserMode: 'pixel' } },
        { id: 'erase_obj', label: 'Object', icon: Trash2, action: { eraserMode: 'object' } },
        { id: 'erase_all', label: 'Clear', icon: X, action: { action: 'erase_all' } },
    ],
    shapes: [
        { id: 'shape_rect', label: 'Rect', icon: SquareShape, action: { shapeType: 'rectangle' } },
        { id: 'shape_rounded', label: 'Round', icon: RectangleHorizontal, action: { shapeType: 'rounded_rect' } },
        { id: 'shape_circle', label: 'Circle', icon: CircleShape, action: { shapeType: 'circle' } },
        { id: 'shape_triangle', label: 'Triangle', icon: Triangle, action: { shapeType: 'triangle' } },
        { id: 'shape_diamond', label: 'Diamond', icon: Diamond, action: { shapeType: 'diamond' } },
        { id: 'shape_star', label: 'Star', icon: Star, action: { shapeType: 'star' } },
        { id: 'shape_hexagon', label: 'Hex', icon: Hexagon, action: { shapeType: 'hexagon' } },
        { id: 'shape_arc', label: 'Arc', icon: Spline, action: { shapeType: 'arc' } },
        { id: 'shape_cloud', label: 'Cloud', icon: Cloud, action: { shapeType: 'cloud' } },
        { id: 'shape_sticky', label: 'Sticky', icon: StickyNote, action: { shapeType: 'sticky_note' } },
        { id: 'shape_conn', label: 'Connect', icon: Waypoints, action: { shapeType: 'connector' } },
    ],
    line: [
        { id: 'line_straight', label: 'Line', icon: Minus, action: { lineType: 'straight' } },
        { id: 'line_arrow', label: 'Arrow', icon: ArrowUpRight, action: { lineType: 'arrow' } },
        { id: 'line_double', label: '2-Way', icon: ArrowLeftRight, action: { lineType: 'double_arrow' } },
        { id: 'line_arc', label: 'Curve', icon: Spline, action: { lineType: 'arc' } },
        { id: 'line_dashed', label: 'Dashed', icon: MoreHorizontal, action: { lineType: 'dashed' } },
    ],
    more: [
        { id: 'more_laser', label: 'Laser', icon: Sparkles, action: { action: 'laser' } },
        { id: 'more_fill', label: 'Fill', icon: PaintBucket, action: { action: 'fill' } },
        { id: 'more_eye', label: 'Pick', icon: Pipette, action: { action: 'eyedropper' } },
        { id: 'more_tmpl', label: 'Template', icon: LayoutTemplate, action: { action: 'templates' } },
        { id: 'more_date', label: 'Time', icon: Clock, action: { action: 'datetime' } },
        { id: 'more_undo', label: 'Undo', icon: Undo2, action: { action: 'undo' } },
        { id: 'more_redo', label: 'Redo', icon: Redo2, action: { action: 'redo' } },
    ],
};

// ─── Mathematical SVG Annular Sector Generator ─────────────────────────────
function createAnnularSector(cx, cy, rIn, rOut, startAngleDeg, endAngleDeg) {
    const toRad = Math.PI / 180;
    const a1 = startAngleDeg * toRad;
    const a2 = endAngleDeg * toRad;

    const x1Out = (cx + rOut * Math.cos(a1)).toFixed(2);
    const y1Out = (cy + rOut * Math.sin(a1)).toFixed(2);
    const x2Out = (cx + rOut * Math.cos(a2)).toFixed(2);
    const y2Out = (cy + rOut * Math.sin(a2)).toFixed(2);

    const x1In = (cx + rIn * Math.cos(a1)).toFixed(2);
    const y1In = (cy + rIn * Math.sin(a1)).toFixed(2);
    const x2In = (cx + rIn * Math.cos(a2)).toFixed(2);
    const y2In = (cy + rIn * Math.sin(a2)).toFixed(2);

    const arcSpan = (endAngleDeg - startAngleDeg + 360) % 360;
    const largeArc = arcSpan > 180 ? 1 : 0;

    return `M ${x1Out} ${y1Out} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2Out} ${y2Out} L ${x2In} ${y2In} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x1In} ${y1In} Z`;
}

export default function RadialToolbar({
    isOpen,
    position,
    currentTool,
    currentBrushType,
    onToolSelect,
    onClose,
    canvasBounds
}) {
    const [hoveredInner, setHoveredInner] = useState('pen');
    const [hoveredOuter, setHoveredOuter] = useState(null);
    const [clampedPos, setClampedPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    // Synchronize and clamp position when opening
    useEffect(() => {
        if (isOpen) {
            setHoveredInner(currentTool || 'pen');
            setHoveredOuter(null);

            let cx = position.x;
            let cy = position.y;
            if (canvasBounds) {
                cx = Math.max(MENU_BOUNDING_R + 15, Math.min(canvasBounds.width - MENU_BOUNDING_R - 15, cx));
                cy = Math.max(MENU_BOUNDING_R + 15, Math.min(canvasBounds.height - MENU_BOUNDING_R - 15, cy));
            }
            setClampedPos({ x: cx, y: cy });
        }
    }, [isOpen, position, canvasBounds, currentTool]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // ─── Outer Sub-tools & Accurate Arc Positions ──────────────────────────
    const activeOuterTools = useMemo(() => {
        return (hoveredInner && OUTER_TOOLS[hoveredInner]) ? OUTER_TOOLS[hoveredInner] : null;
    }, [hoveredInner]);

    const parentIndex = useMemo(() => {
        return INNER_TOOLS.findIndex(t => t.id === hoveredInner);
    }, [hoveredInner]);

    const parentAngleDeg = parentIndex !== -1 ? (parentIndex * 45 - 90) : -90;

    // Sub-tool calculations along concentric circle R_SUB_MID (126px)
    const { subToolPositions, subArcPath, connectorBridgePath } = useMemo(() => {
        if (!activeOuterTools || activeOuterTools.length === 0) {
            return { subToolPositions: [], subArcPath: null, connectorBridgePath: null };
        }

        const count = activeOuterTools.length;
        // Step angles chosen to guarantee ample space between badges
        const stepDeg = count <= 3 ? 24 : count <= 5 ? 19 : 16;
        const totalSpanDeg = (count - 1) * stepDeg;
        const startDeg = parentAngleDeg - totalSpanDeg / 2;

        const positions = activeOuterTools.map((tool, i) => {
            const angleDeg = startDeg + i * stepDeg;
            const rad = angleDeg * (Math.PI / 180);
            const x = R_SUB_MID * Math.cos(rad);
            const y = R_SUB_MID * Math.sin(rad);
            return { tool, x, y, angleDeg };
        });

        // Construct mathematical annular arc path
        const arcPad = Math.max(10, stepDeg * 0.55);
        const arcStart = startDeg - arcPad;
        const arcEnd = parentAngleDeg + totalSpanDeg / 2 + arcPad;
        const arcPath = createAnnularSector(0, 0, R_SUB_INNER, R_SUB_OUTER, arcStart, arcEnd);

        // Construct connector bridge from parent sector to sub-arc
        const pRad = parentAngleDeg * (Math.PI / 180);
        const halfSpread = 10 * (Math.PI / 180);
        const b1x = (R_OUTER_RING * Math.cos(pRad - halfSpread)).toFixed(2);
        const b1y = (R_OUTER_RING * Math.sin(pRad - halfSpread)).toFixed(2);
        const b2x = (R_OUTER_RING * Math.cos(pRad + halfSpread)).toFixed(2);
        const b2y = (R_OUTER_RING * Math.sin(pRad + halfSpread)).toFixed(2);
        const b3x = (R_SUB_INNER * Math.cos(pRad + halfSpread * 1.2)).toFixed(2);
        const b3y = (R_SUB_INNER * Math.sin(pRad + halfSpread * 1.2)).toFixed(2);
        const b4x = (R_SUB_INNER * Math.cos(pRad - halfSpread * 1.2)).toFixed(2);
        const b4y = (R_SUB_INNER * Math.sin(pRad - halfSpread * 1.2)).toFixed(2);
        const bridgePath = `M ${b1x} ${b1y} L ${b4x} ${b4y} L ${b3x} ${b3y} L ${b2x} ${b2y} Z`;

        return { subToolPositions: positions, subArcPath: arcPath, connectorBridgePath: bridgePath };
    }, [activeOuterTools, parentAngleDeg]);

    // ─── Continuous Radial Angle Tracking ─────────────────────────────────
    const handleContainerPointerMove = useCallback((e) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const x = e.clientX - cx;
        const y = e.clientY - cy;
        const dist = Math.hypot(x, y);
        const angleDeg = Math.atan2(y, x) * (180 / Math.PI);

        // Center hub deadzone
        if (dist < 22) {
            return;
        }

        // Inside inner wheel: calculate 45° sector
        if (dist >= 45 && dist <= R_OUTER_RING + 8) {
            const offset = (angleDeg + 90 + 22.5 + 720) % 360;
            const sectorIdx = Math.floor(offset / 45) % 8;
            const matched = INNER_TOOLS[sectorIdx];
            if (matched && matched.id !== hoveredInner) {
                setHoveredInner(matched.id);
                setHoveredOuter(null);
            }
        }
        // In outer arc zone: calculate nearest sub-tool
        else if (dist > R_OUTER_RING + 8 && subToolPositions.length > 0) {
            let nearestTool = null;
            let minDist = Infinity;
            subToolPositions.forEach(st => {
                const diff = Math.abs(((angleDeg - st.angleDeg + 540) % 360) - 180);
                if (diff < minDist) {
                    minDist = diff;
                    nearestTool = st.tool;
                }
            });
            if (minDist < 25 && nearestTool && nearestTool.id !== hoveredOuter) {
                setHoveredOuter(nearestTool.id);
            }
        }
    }, [hoveredInner, hoveredOuter, subToolPositions]);

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

    if (!isOpen) return null;

    const CurrentIcon = INNER_TOOLS.find(t => t.id === currentTool)?.icon || Pencil;
    const currentInnerLabel = INNER_TOOLS.find(t => t.id === hoveredInner)?.label || '';
    const currentOuterLabel = activeOuterTools?.find(t => t.id === hoveredOuter)?.label || '';

    return (
        <div
            ref={containerRef}
            className="radial-toolbar-container absolute z-50 pointer-events-auto select-none animate-in zoom-in-95 duration-150"
            style={{
                left: clampedPos.x,
                top: clampedPos.y,
                width: 0,
                height: 0,
            }}
            onPointerMove={handleContainerPointerMove}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            {/* ─── SVG Rings & Mathematical Arcs ───────────────────────── */}
            <svg
                className="absolute overflow-visible pointer-events-none"
                style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
                width="360"
                height="360"
                viewBox="-180 -180 360 360"
            >
                <defs>
                    <filter id="sleekGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="sleekRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0f172a" stopOpacity="0.94" />
                        <stop offset="100%" stopColor="#1e293b" stopOpacity="0.96" />
                    </linearGradient>
                    <linearGradient id="activeSectorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.95" />
                    </linearGradient>
                </defs>

                {/* Main Donut Ring Background */}
                <path
                    d={createAnnularSector(0, 0, R_INNER_RING, R_OUTER_RING, 0, 359.99)}
                    fill="url(#sleekRingGrad)"
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="1.2"
                    className="drop-shadow-2xl"
                />

                {/* Subtle Inner & Outer Glowing Accent Rims */}
                <circle
                    cx="0"
                    cy="0"
                    r={R_INNER_RING}
                    fill="none"
                    stroke="rgba(99, 102, 241, 0.3)"
                    strokeWidth="1"
                />
                <circle
                    cx="0"
                    cy="0"
                    r={R_OUTER_RING}
                    fill="none"
                    stroke="rgba(99, 102, 241, 0.35)"
                    strokeWidth="1"
                />

                {/* Sector Dividers (8 radial rays between tools) */}
                {Array.from({ length: 8 }).map((_, i) => {
                    const angle = (i * 45 - 90 - 22.5) * (Math.PI / 180);
                    const x1 = (R_INNER_RING * Math.cos(angle)).toFixed(2);
                    const y1 = (R_INNER_RING * Math.sin(angle)).toFixed(2);
                    const x2 = (R_OUTER_RING * Math.cos(angle)).toFixed(2);
                    const y2 = (R_OUTER_RING * Math.sin(angle)).toFixed(2);
                    return (
                        <line
                            key={`div-${i}`}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="rgba(255, 255, 255, 0.08)"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Active Inner Sector Highlight Wedge */}
                {parentIndex !== -1 && (
                    <path
                        d={createAnnularSector(
                            0,
                            0,
                            R_INNER_RING + 0.5,
                            R_OUTER_RING - 0.5,
                            parentAngleDeg - 22.5,
                            parentAngleDeg + 22.5
                        )}
                        fill="url(#activeSectorGrad)"
                        stroke="rgba(255, 255, 255, 0.4)"
                        strokeWidth="1"
                        opacity="0.9"
                        className="transition-all duration-150"
                    />
                )}

                {/* ─── Outer Sub-Menu Geometric Arc Ribbon ──────────────── */}
                {subArcPath && (
                    <g className="animate-in fade-in zoom-in-95 duration-150">
                        {/* Connector bridge */}
                        {connectorBridgePath && (
                            <path
                                d={connectorBridgePath}
                                fill="#0f172a"
                                stroke="rgba(99, 102, 241, 0.35)"
                                strokeWidth="1"
                                opacity="0.85"
                            />
                        )}

                        {/* Dashed connector centerline */}
                        <line
                            x1={(R_OUTER_RING * Math.cos(parentAngleDeg * Math.PI / 180)).toFixed(2)}
                            y1={(R_OUTER_RING * Math.sin(parentAngleDeg * Math.PI / 180)).toFixed(2)}
                            x2={(R_SUB_INNER * Math.cos(parentAngleDeg * Math.PI / 180)).toFixed(2)}
                            y2={(R_SUB_INNER * Math.sin(parentAngleDeg * Math.PI / 180)).toFixed(2)}
                            stroke="#818cf8"
                            strokeWidth="2"
                            strokeDasharray="3,3"
                            opacity="0.9"
                        />

                        {/* Smooth curved annular arc ribbon */}
                        <path
                            d={subArcPath}
                            fill="#0f172a"
                            stroke="#6366f1"
                            strokeWidth="1.5"
                            opacity="0.96"
                            filter="url(#sleekGlow)"
                            className="drop-shadow-2xl"
                        />
                    </g>
                )}
            </svg>

            {/* ─── Outer Sub-Tool Badges (Concentric, Non-Overlapping) ─── */}
            {activeOuterTools && subToolPositions.map(({ tool, x, y }) => {
                const isHovered = hoveredOuter === tool.id;
                return (
                    <button
                        key={tool.id}
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => handleOuterClick(e, hoveredInner, tool)}
                        onMouseEnter={() => setHoveredOuter(tool.id)}
                        className={`absolute flex flex-col items-center justify-center w-7 h-7 rounded-full transition-all duration-150 z-30 cursor-pointer ${
                            isHovered
                                ? 'bg-indigo-600 text-white scale-115 border-2 border-white shadow-lg shadow-indigo-500/50'
                                : 'bg-slate-900/95 text-slate-200 border border-indigo-400/60 hover:border-white shadow-md'
                        }`}
                        style={{
                            left: x,
                            top: y,
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        <tool.icon className={`w-3.5 h-3.5 ${tool.colorClass ? '' : ''}`} />
                        <span className="text-[7px] font-semibold leading-none mt-0.5 px-0.5 rounded bg-slate-950/80 text-indigo-200 whitespace-nowrap">
                            {tool.label}
                        </span>
                    </button>
                );
            })}

            {/* ─── Inner Ring Tool Buttons (Sleek, Compact) ────────────── */}
            {INNER_TOOLS.map((tool, i) => {
                const angleRad = (i * 45 - 90) * (Math.PI / 180);
                const x = R_TRACK_MID * Math.cos(angleRad);
                const y = R_TRACK_MID * Math.sin(angleRad);
                const isActive = currentTool === tool.id;
                const isHovered = hoveredInner === tool.id;

                return (
                    <button
                        key={tool.id}
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => handleInnerClick(e, tool)}
                        onMouseEnter={() => setHoveredInner(tool.id)}
                        className={`absolute flex flex-col items-center justify-center w-8 h-8 rounded-full transition-all duration-150 z-20 cursor-pointer ${
                            isHovered
                                ? 'bg-white text-indigo-900 scale-110 shadow-lg shadow-indigo-500/50 font-bold border border-white'
                                : isActive
                                    ? 'bg-indigo-600 text-white border-2 border-indigo-300 scale-105 shadow-md'
                                    : 'bg-slate-900/90 text-slate-300 border border-slate-700/60 hover:bg-slate-800 hover:text-white'
                        }`}
                        style={{
                            left: x,
                            top: y,
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        <tool.icon className="w-3.5 h-3.5" />
                        <span className="text-[7.5px] font-bold leading-none mt-0.5 opacity-95">
                            {tool.label}
                        </span>
                    </button>
                );
            })}

            {/* ─── Compact Center Hub ──────────────────────────────────── */}
            <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                className="absolute flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 shadow-xl border-2 border-white/40 text-white hover:scale-105 active:scale-95 transition-all duration-150 z-40 cursor-pointer group"
                style={{
                    left: 0,
                    top: 0,
                    transform: 'translate(-50%, -50%)',
                }}
            >
                <CurrentIcon className="w-4 h-4 group-hover:scale-90 transition-transform" />
            </button>

            {/* ─── Sleek Tool Status HUD Pill (No delayed native tooltips) ── */}
            <div
                className="absolute flex items-center justify-center pointer-events-none z-40 transition-all duration-150"
                style={{
                    left: 0,
                    top: R_OUTER_RING + 22,
                    transform: 'translate(-50%, -50%)',
                }}
            >
                <span className="px-2 py-0.5 rounded-full bg-slate-950/90 border border-indigo-500/40 text-[9px] font-bold text-indigo-200 shadow-xl tracking-wide backdrop-blur-md whitespace-nowrap">
                    {currentOuterLabel ? `${currentInnerLabel} • ${currentOuterLabel}` : currentInnerLabel}
                </span>
            </div>
        </div>
    );
}
