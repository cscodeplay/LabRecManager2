'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Trash2 } from 'lucide-react';

// Returns { x, y } for the anchor of a shape, synchronized with rotation and flips
export const getAnchorPoint = (shape, anchor, otherPoint = null) => {
    if (!shape) return { x: 0, y: 0 };
    
    const center = { 
        x: (shape.x || 0) + (shape.width || 100) / 2, 
        y: (shape.y || 0) + (shape.height || 100) / 2 
    };
    
    let resolvedAnchor = anchor;
    if (anchor === 'auto') {
        if (otherPoint) {
            const dx = otherPoint.x - center.x;
            const dy = otherPoint.y - center.y;
            if (Math.abs(dx) > Math.abs(dy)) {
                resolvedAnchor = dx > 0 ? 'right' : 'left';
            } else {
                resolvedAnchor = dy > 0 ? 'bottom' : 'top';
            }
        } else {
            resolvedAnchor = 'right'; // Default fallback
        }
    }

    let unrotatedPt;
    switch (resolvedAnchor) {
        case 'top': unrotatedPt = { x: center.x, y: shape.y || 0 }; break;
        case 'right': unrotatedPt = { x: (shape.x || 0) + (shape.width || 100), y: center.y }; break;
        case 'bottom': unrotatedPt = { x: center.x, y: (shape.y || 0) + (shape.height || 100) }; break;
        case 'left': unrotatedPt = { x: shape.x || 0, y: center.y }; break;
        case 'center': unrotatedPt = center; break;
        default: return center;
    }

    let dx = unrotatedPt.x - center.x;
    let dy = unrotatedPt.y - center.y;

    if (shape.flipX) dx = -dx;
    if (shape.flipY) dy = -dy;

    const rotation = shape.rotation || 0;
    if (!rotation) {
        return {
            x: center.x + dx,
            y: center.y + dy
        };
    }

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return {
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos
    };
};

// Returns { shape, anchor } or null if no shape is within threshold distance
export const findNearestShape = (point, shapes, threshold = 30) => {
    let nearest = null;
    let minDistance = threshold;
    let bestAnchor = null;

    const anchors = ['top', 'right', 'bottom', 'left', 'center'];

    shapes.forEach(shape => {
        anchors.forEach(anchor => {
            const pt = getAnchorPoint(shape, anchor);
            const dist = Math.hypot(pt.x - point.x, pt.y - point.y);
            if (dist < minDistance) {
                minDistance = dist;
                nearest = shape;
                bestAnchor = anchor;
            }
        });
    });

    if (nearest) {
        return { shape: nearest, anchor: bestAnchor };
    }
    return null;
};

// Helper to compute cubic control points for curved paths
export const getCurvedControlPoints = (startPt, endPt, sourceAnchor = null, targetAnchor = null) => {
    const dx = endPt.x - startPt.x;
    const dy = endPt.y - startPt.y;
    const dist = Math.hypot(dx, dy);

    let cp1, cp2;
    const curveOffset = Math.max(25, Math.min(dist * 0.45, 120));

    if (sourceAnchor || targetAnchor) {
        const getAnchorVector = (anc, fallbackDx, fallbackDy) => {
            if (anc === 'top') return { x: 0, y: -1 };
            if (anc === 'bottom') return { x: 0, y: 1 };
            if (anc === 'left') return { x: -1, y: 0 };
            if (anc === 'right') return { x: 1, y: 0 };
            return Math.abs(fallbackDx) >= Math.abs(fallbackDy)
                ? { x: Math.sign(fallbackDx) || 1, y: 0 }
                : { x: 0, y: Math.sign(fallbackDy) || 1 };
        };

        const v1 = getAnchorVector(sourceAnchor, dx, dy);
        const v2 = getAnchorVector(targetAnchor, -dx, -dy);

        cp1 = { x: startPt.x + v1.x * curveOffset, y: startPt.y + v1.y * curveOffset };
        cp2 = { x: endPt.x + v2.x * curveOffset, y: endPt.y + v2.y * curveOffset };
    } else {
        if (Math.abs(dy) > Math.abs(dx)) {
            // Vertical connection (e.g. flowchart step 1 -> step 2)
            const lateralBow = Math.abs(dx) > 10 ? 0 : Math.min(35, dist * 0.2);
            cp1 = { x: startPt.x + dx * 0.1 + lateralBow, y: startPt.y + dy * 0.5 };
            cp2 = { x: endPt.x - dx * 0.1 + lateralBow, y: endPt.y - dy * 0.5 };
        } else {
            // Horizontal connection
            const verticalBow = Math.abs(dy) > 10 ? 0 : Math.min(35, dist * 0.2);
            cp1 = { x: startPt.x + dx * 0.5, y: startPt.y + dy * 0.1 + verticalBow };
            cp2 = { x: endPt.x - dx * 0.5, y: endPt.y - dy * 0.1 + verticalBow };
        }
    }
    return { cp1, cp2 };
};

// Returns exact midpoint coordinates for any connector path type
export const getConnectorMidpoint = (startPt, endPt, pathType = 'curved', waypoint = null, sourceAnchor = null, targetAnchor = null) => {
    if (!startPt || !endPt) return { x: 0, y: 0 };

    if (pathType === 'straight') {
        if (waypoint) return waypoint;
        return { x: (startPt.x + endPt.x) / 2, y: (startPt.y + endPt.y) / 2 };
    }

    if (pathType === 'orthogonal') {
        const stepX = waypoint ? waypoint.x : (startPt.x + endPt.x) / 2;
        return { x: stepX, y: (startPt.y + endPt.y) / 2 };
    }

    if (pathType === 'curved') {
        if (waypoint) {
            // Point at t = 0.5 on quadratic curve with control point cp is precisely waypoint
            return waypoint;
        }
        const { cp1, cp2 } = getCurvedControlPoints(startPt, endPt, sourceAnchor, targetAnchor);
        // Point on cubic Bezier at t = 0.5: B(0.5) = 1/8 P0 + 3/8 P1 + 3/8 P2 + 1/8 P3
        return {
            x: 0.125 * startPt.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * endPt.x,
            y: 0.125 * startPt.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * endPt.y
        };
    }

    return { x: (startPt.x + endPt.x) / 2, y: (startPt.y + endPt.y) / 2 };
};

// Returns an SVG path string (d attribute) for the connector
export const getConnectorPath = (startPt, endPt, pathType = 'curved', waypoint = null, sourceAnchor = null, targetAnchor = null) => {
    if (pathType === 'straight') {
        if (waypoint) {
            return `M ${startPt.x} ${startPt.y} L ${waypoint.x} ${waypoint.y} L ${endPt.x} ${endPt.y}`;
        }
        return `M ${startPt.x} ${startPt.y} L ${endPt.x} ${endPt.y}`;
    } else if (pathType === 'orthogonal') {
        const stepX = waypoint ? waypoint.x : (startPt.x + endPt.x) / 2;
        return `M ${startPt.x} ${startPt.y} L ${stepX} ${startPt.y} L ${stepX} ${endPt.y} L ${endPt.x} ${endPt.y}`;
    } else if (pathType === 'curved') {
        if (waypoint) {
            // Quadratic Bezier passing smoothly through the waypoint
            const cpX = 2 * waypoint.x - 0.5 * (startPt.x + endPt.x);
            const cpY = 2 * waypoint.y - 0.5 * (startPt.y + endPt.y);
            return `M ${startPt.x} ${startPt.y} Q ${cpX} ${cpY} ${endPt.x} ${endPt.y}`;
        }

        const { cp1, cp2 } = getCurvedControlPoints(startPt, endPt, sourceAnchor, targetAnchor);
        return `M ${startPt.x} ${startPt.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${endPt.x} ${endPt.y}`;
    }
    return `M ${startPt.x} ${startPt.y} L ${endPt.x} ${endPt.y}`;
};

// Returns SVG elements for arrowhead at the given point
export const renderArrowhead = (type, point, angle, size = 12, color) => {
    if (type === 'none') return null;

    const transform = `translate(${point.x}, ${point.y}) rotate(${angle})`;

    if (type === 'arrow') {
        return (
            <path
                d={`M 0 0 L ${-size} ${size/2} L ${-size} ${-size/2} Z`}
                fill={color}
                transform={transform}
            />
        );
    } else if (type === 'diamond') {
        return (
            <path
                d={`M 0 0 L ${-size/2} ${size/2} L ${-size} 0 L ${-size/2} ${-size/2} Z`}
                fill={color}
                transform={transform}
            />
        );
    } else if (type === 'circle') {
        return (
            <circle
                cx={-size/2}
                cy={0}
                r={size/2}
                fill={color}
                transform={transform}
            />
        );
    }
    return null;
};

// Calculates angle in degrees for the arrowhead
export const calculateAngle = (p1, p2) => {
    return (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
};

export default function ConnectorLine({ connector, shapes = [], images = [], isSelected, onUpdate, onSelect, onDelete = () => {}, scale = 1 }) {
    const {
        id,
        sourceId,
        targetId,
        sourceAnchor = 'auto',
        targetAnchor = 'auto',
        sourcePoint = { x: 0, y: 0 },
        targetPoint = { x: 100, y: 100 },
        waypoint = null,
        pathType = 'straight',
        arrowStart = 'none',
        arrowEnd = 'arrow',
        color = '#000000',
        strokeWidth = 2,
        strokeStyle = 'solid',
        label = ''
    } = connector;

    const [isHovered, setIsHovered] = useState(false);
    const [draggingEndpoint, setDraggingEndpoint] = useState(null); // 'source', 'target', or 'waypoint'
    const [dragPoint, setDragPoint] = useState(null); // {x, y}
    const [snapTarget, setSnapTarget] = useState(null); // { shape, anchor }
    const [isEditingLabel, setIsEditingLabel] = useState(false);
    const [labelText, setLabelText] = useState(label);

    useEffect(() => {
        setLabelText(label || '');
    }, [label]);

    const dragPointRef = useRef(null);
    const snapTargetRef = useRef(null);
    const draggingEndpointRef = useRef(null);

    // Combine shapes and images for connector hook resolution
    const allConnectables = useMemo(() => [...shapes, ...(images || [])], [shapes, images]);

    // Resolve start and end points
    const sourceShape = useMemo(() => allConnectables.find(s => s.id === sourceId), [allConnectables, sourceId]);
    const targetShape = useMemo(() => allConnectables.find(s => s.id === targetId), [allConnectables, targetId]);

    // If neither shape exists and neither endpoint is currently being dragged, return null
    if (!sourceShape && !targetShape && !draggingEndpoint) {
        return null;
    }

    const actualSourcePoint = useMemo(() => {
        if (draggingEndpoint === 'source' && dragPoint) return dragPoint;
        if (sourceShape) return getAnchorPoint(sourceShape, sourceAnchor, targetShape ? { x: targetShape.x, y: targetShape.y } : targetPoint);
        return sourcePoint || (targetShape ? getAnchorPoint(targetShape, targetAnchor) : null);
    }, [sourceShape, sourceAnchor, draggingEndpoint, dragPoint, sourcePoint, targetShape, targetPoint, targetAnchor]);

    const actualTargetPoint = useMemo(() => {
        if (draggingEndpoint === 'target' && dragPoint) return dragPoint;
        if (targetShape) return getAnchorPoint(targetShape, targetAnchor, sourceShape ? { x: sourceShape.x, y: sourceShape.y } : sourcePoint);
        return targetPoint || (sourceShape ? getAnchorPoint(sourceShape, sourceAnchor) : null);
    }, [targetShape, targetAnchor, draggingEndpoint, dragPoint, targetPoint, sourceShape, sourcePoint, sourceAnchor]);

    const actualWaypoint = useMemo(() => {
        if (draggingEndpoint === 'waypoint' && dragPoint) return dragPoint;
        if (waypoint) return waypoint;
        if (!actualSourcePoint || !actualTargetPoint) return { x: 0, y: 0 };
        return getConnectorMidpoint(actualSourcePoint, actualTargetPoint, pathType, null, sourceAnchor, targetAnchor);
    }, [draggingEndpoint, dragPoint, waypoint, actualSourcePoint, actualTargetPoint, pathType, sourceAnchor, targetAnchor]);

    const connectorMidpoint = useMemo(() => {
        if (!actualSourcePoint || !actualTargetPoint) return { x: 0, y: 0 };
        return getConnectorMidpoint(actualSourcePoint, actualTargetPoint, pathType, waypoint || (draggingEndpoint === 'waypoint' ? actualWaypoint : null), sourceAnchor, targetAnchor);
    }, [actualSourcePoint, actualTargetPoint, pathType, waypoint, draggingEndpoint, actualWaypoint, sourceAnchor, targetAnchor]);

    const pathData = useMemo(() => {
        if (!actualSourcePoint || !actualTargetPoint) return '';
        const wp = (waypoint || draggingEndpoint === 'waypoint') ? actualWaypoint : null;
        return getConnectorPath(actualSourcePoint, actualTargetPoint, pathType, wp, sourceAnchor, targetAnchor);
    }, [actualSourcePoint, actualTargetPoint, pathType, waypoint, draggingEndpoint, actualWaypoint, sourceAnchor, targetAnchor]);

    if (!actualSourcePoint || !actualTargetPoint || !pathData) {
        return null;
    }

    // Handle dragging with canvas-relative coordinates
    useEffect(() => {
        if (!draggingEndpoint) return;

        const handlePointerMove = (e) => {
            const canvasEl = document.getElementById('main-whiteboard-canvas') || document.querySelector('.whiteboard-canvas');
            const rect = canvasEl?.getBoundingClientRect();
            if (!rect) return;

            const scaleX = (canvasEl.width || rect.width) / rect.width;
            const scaleY = (canvasEl.height || rect.height) / rect.height;
            const nextPoint = {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };

            if (draggingEndpointRef.current === 'waypoint' && pathType === 'orthogonal' && actualSourcePoint && actualTargetPoint) {
                nextPoint.y = (actualSourcePoint.y + actualTargetPoint.y) / 2;
            }

            dragPointRef.current = nextPoint;
            setDragPoint(nextPoint);

            if (draggingEndpointRef.current === 'source' || draggingEndpointRef.current === 'target') {
                const snap = findNearestShape(nextPoint, allConnectables, 45);
                snapTargetRef.current = snap;
                setSnapTarget(snap);
            }
        };

        const handlePointerUp = () => {
            const currentEndpoint = draggingEndpointRef.current;
            const finalPoint = dragPointRef.current;
            const finalSnap = snapTargetRef.current;

            if (currentEndpoint && finalPoint) {
                const updates = {};
                if (currentEndpoint === 'waypoint') {
                    updates.waypoint = finalPoint;
                    onUpdate(id, updates);
                } else if (finalSnap) {
                    if (currentEndpoint === 'source') {
                        updates.sourceId = finalSnap.shape.id;
                        updates.sourceAnchor = finalSnap.anchor;
                        updates.sourcePoint = getAnchorPoint(finalSnap.shape, finalSnap.anchor);
                    } else {
                        updates.targetId = finalSnap.shape.id;
                        updates.targetAnchor = finalSnap.anchor;
                        updates.targetPoint = getAnchorPoint(finalSnap.shape, finalSnap.anchor);
                    }
                    onUpdate(id, updates);
                }
                // When dropped in empty space without a valid hook snap:
                // Connectors must NEVER become standalone!
                // Revert to the existing connected shape hook cleanly.
            }
            
            setDraggingEndpoint(null);
            draggingEndpointRef.current = null;
            setDragPoint(null);
            dragPointRef.current = null;
            setSnapTarget(null);
            snapTargetRef.current = null;
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [draggingEndpoint, shapes, id, onUpdate]);

    const handlePointerDown = (endpoint, e) => {
        e.stopPropagation();
        e.preventDefault();
        setDraggingEndpoint(endpoint);
        draggingEndpointRef.current = endpoint;
        let startPt = actualSourcePoint;
        if (endpoint === 'target') startPt = actualTargetPoint;
        else if (endpoint === 'waypoint') startPt = actualWaypoint;
        setDragPoint(startPt);
        dragPointRef.current = startPt;
        snapTargetRef.current = null;
        setSnapTarget(null);
    };

    // Calculate angles for arrows
    const sourceAngle = calculateAngle(actualTargetPoint, actualSourcePoint); // reverse
    const targetAngle = calculateAngle(actualSourcePoint, actualTargetPoint);

    // Stroke dasharray
    let strokeDasharray = 'none';
    if (strokeStyle === 'dashed') strokeDasharray = `${strokeWidth * 3}, ${strokeWidth * 3}`;
    if (strokeStyle === 'dotted') strokeDasharray = `${strokeWidth}, ${strokeWidth * 2}`;

    return (
        <g 
            className="connector-line-group"
            style={{ pointerEvents: 'auto' }}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(id);
            }}
        >
            {/* Invisible thicker path for easier clicking/hovering */}
            <path
                d={pathData}
                fill="none"
                stroke="transparent"
                strokeWidth={Math.max(16, strokeWidth * 3)}
                className="cursor-pointer"
                style={{ pointerEvents: 'auto' }}
            />
            
            {/* Glow / Hover effect */}
            {(isHovered || isSelected) && (
                <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth + 4}
                    strokeOpacity={0.25}
                    className="transition-all duration-200 pointer-events-none"
                />
            )}

            {/* Main Path */}
            <path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none"
            />

            {/* Arrowheads */}
            {renderArrowhead(arrowStart, actualSourcePoint, sourceAngle, strokeWidth * 4, color)}
            {renderArrowhead(arrowEnd, actualTargetPoint, targetAngle, strokeWidth * 4, color)}

            {/* Selection Handles */}
            {isSelected && !draggingEndpoint && (
                <>
                    <circle
                        cx={actualSourcePoint.x}
                        cy={actualSourcePoint.y}
                        r={6 / scale}
                        fill="#fff"
                        stroke="#2563eb" // tailwind blue-600
                        strokeWidth={2 / scale}
                        className="cursor-move hover:scale-125 transition-transform"
                        style={{ pointerEvents: 'auto' }}
                        onPointerDown={(e) => handlePointerDown('source', e)}
                    />
                    <circle
                        cx={actualTargetPoint.x}
                        cy={actualTargetPoint.y}
                        r={6 / scale}
                        fill="#fff"
                        stroke="#2563eb"
                        strokeWidth={2 / scale}
                        className="cursor-move hover:scale-125 transition-transform"
                        style={{ pointerEvents: 'auto' }}
                        onPointerDown={(e) => handlePointerDown('target', e)}
                    />
                    {/* Draggable Midpoint / Waypoint Handle (Lucidchart bend tool to change shape of line) */}
                    <g 
                        className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                        style={{ pointerEvents: 'auto' }}
                        onPointerDown={(e) => handlePointerDown('waypoint', e)}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            onUpdate(id, { waypoint: null });
                        }}
                    >
                        <circle
                            cx={actualWaypoint.x}
                            cy={actualWaypoint.y}
                            r={7 / scale}
                            fill="#f59e0b"
                            stroke="#ffffff"
                            strokeWidth={2 / scale}
                            className="shadow-sm"
                            style={{ pointerEvents: 'auto' }}
                        />
                        <title>Drag to reshape line bend (Double-click to reset)</title>
                    </g>
                </>
            )}

            {/* Snap Indicator */}
            {snapTarget && draggingEndpoint && (
                <circle
                    cx={getAnchorPoint(snapTarget.shape, snapTarget.anchor).x}
                    cy={getAnchorPoint(snapTarget.shape, snapTarget.anchor).y}
                    r={9 / scale}
                    fill="rgba(37, 99, 235, 0.45)" // blue-600 with opacity
                    stroke="#2563eb"
                    strokeWidth={2.5 / scale}
                    className="animate-pulse pointer-events-none"
                />
            )}

            {/* Center / Midpoint Text Label & Inline Editor */}
            {connectorMidpoint && (
                <foreignObject
                    x={connectorMidpoint.x - 75}
                    y={connectorMidpoint.y - 14}
                    width={150}
                    height={28}
                    style={{ overflow: 'visible', pointerEvents: 'none' }}
                >
                    <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ pointerEvents: 'none' }}
                    >
                        {isEditingLabel ? (
                            <input
                                autoFocus
                                type="text"
                                value={labelText}
                                onChange={(e) => setLabelText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setIsEditingLabel(false);
                                        onUpdate(id, { label: labelText.trim() });
                                    } else if (e.key === 'Escape') {
                                        setIsEditingLabel(false);
                                        setLabelText(label || '');
                                    }
                                    e.stopPropagation();
                                }}
                                onBlur={() => {
                                    setIsEditingLabel(false);
                                    onUpdate(id, { label: labelText.trim() });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="px-2 py-0.5 text-xs rounded-full border border-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-md outline-none text-center font-medium min-w-[70px] max-w-[140px]"
                                style={{ pointerEvents: 'auto' }}
                                placeholder="Label..."
                            />
                        ) : label ? (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditingLabel(true);
                                }}
                                className="px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-white/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer select-none transition-all hover:scale-105 backdrop-blur-xs max-w-[140px] truncate"
                                style={{ pointerEvents: 'auto' }}
                                title="Click to edit label"
                            >
                                {label}
                            </div>
                        ) : (isHovered || isSelected) ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditingLabel(true);
                                }}
                                className="px-2 py-0.5 text-[10.5px] font-medium rounded-full bg-blue-50/90 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shadow-xs hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer select-none transition-transform hover:scale-105 animate-in fade-in"
                                style={{ pointerEvents: 'auto' }}
                                title="Add label to connector"
                            >
                                + Label
                            </button>
                        ) : null}
                    </div>
                </foreignObject>
            )}

            {/* Inline Floating Connector Format Bar */}
            {isSelected && !isEditingLabel && !draggingEndpoint && connectorMidpoint && (
                <foreignObject
                    x={connectorMidpoint.x - 170}
                    y={connectorMidpoint.y - 54}
                    width={340}
                    height={46}
                    style={{ overflow: 'visible', pointerEvents: 'none' }}
                >
                    <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ pointerEvents: 'none' }}
                    >
                        <div
                            className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl px-2.5 py-1 text-slate-200 pointer-events-auto select-none"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            {/* Path Geometry */}
                            <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/60" title="Path Geometry">
                                <button
                                    type="button"
                                    onClick={() => onUpdate(id, { pathType: 'straight', waypoint: null })}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition ${pathType === 'straight' || !pathType ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                    title="Straight Line"
                                >
                                    Straight
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onUpdate(id, { pathType: 'orthogonal', waypoint: null })}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition ${pathType === 'orthogonal' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                    title="Elbow / Orthogonal"
                                >
                                    Elbow
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onUpdate(id, { pathType: 'curved', waypoint: null })}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition ${pathType === 'curved' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                    title="Curved Line"
                                >
                                    Curved
                                </button>
                            </div>

                            <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                            {/* Dash Style */}
                            <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/60" title="Dash Style">
                                <button
                                    type="button"
                                    onClick={() => onUpdate(id, { strokeStyle: 'solid' })}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition ${strokeStyle === 'solid' || !strokeStyle ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                    title="Solid Line"
                                >
                                    Solid
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onUpdate(id, { strokeStyle: 'dashed' })}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition ${strokeStyle === 'dashed' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                    title="Dashed Line"
                                >
                                    Dash
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onUpdate(id, { strokeStyle: 'dotted' })}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition ${strokeStyle === 'dotted' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                    title="Dotted Line"
                                >
                                    Dot
                                </button>
                            </div>

                            <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                            {/* Arrow Ends */}
                            <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/60" title="Arrow Ends">
                                <button
                                    type="button"
                                    onClick={() => onUpdate(id, { arrowStart: 'none', arrowEnd: 'none' })}
                                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition ${arrowStart === 'none' && arrowEnd === 'none' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                    title="Plain (No Arrows)"
                                >
                                    —
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onUpdate(id, { arrowStart: 'none', arrowEnd: 'arrow' })}
                                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition ${arrowStart === 'none' && arrowEnd === 'arrow' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                    title="Single Arrow (End)"
                                >
                                    →
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onUpdate(id, { arrowStart: 'arrow', arrowEnd: 'arrow' })}
                                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition ${arrowStart === 'arrow' && arrowEnd === 'arrow' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                    title="Double Arrow (Both Ends)"
                                >
                                    ↔
                                </button>
                            </div>

                            <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                            {/* Color */}
                            <div className="relative w-5 h-5 rounded border border-slate-700 cursor-pointer overflow-hidden flex items-center justify-center hover:scale-105 transition" title="Connector Color">
                                <div className="w-full h-full" style={{ backgroundColor: color || '#2563eb' }} />
                                <input
                                    type="color"
                                    value={color || '#2563eb'}
                                    onChange={(e) => onUpdate(id, { color: e.target.value })}
                                    className="absolute inset-[-10px] w-10 h-10 opacity-0 cursor-pointer"
                                    title="Change Color"
                                />
                            </div>

                            {/* Stroke Width */}
                            <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-1 py-0.5" title="Stroke Width">
                                <button
                                    type="button"
                                    onClick={() => onUpdate(id, { strokeWidth: Math.max(1, (strokeWidth || 2) - 1) })}
                                    className="w-3.5 h-4 flex items-center justify-center text-[11px] text-slate-300 hover:text-white font-bold"
                                    title="Decrease Width"
                                >
                                    -
                                </button>
                                <span className="text-[10px] font-mono text-white px-1 select-none min-w-[14px] text-center">
                                    {strokeWidth || 2}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onUpdate(id, { strokeWidth: Math.min(20, (strokeWidth || 2) + 1) })}
                                    className="w-3.5 h-4 flex items-center justify-center text-[11px] text-slate-300 hover:text-white font-bold"
                                    title="Increase Width"
                                >
                                    +
                                </button>
                            </div>

                            {onDelete && (
                                <>
                                    <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(id);
                                        }}
                                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition"
                                        title="Delete Connector"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </foreignObject>
            )}
        </g>
    );
}
