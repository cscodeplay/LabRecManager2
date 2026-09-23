'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

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

    const anchors = ['top', 'right', 'bottom', 'left'];

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

export default function ConnectorLine({ connector, shapes = [], isSelected, onUpdate, onSelect, scale = 1 }) {
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
        strokeStyle = 'solid'
    } = connector;

    const [isHovered, setIsHovered] = useState(false);
    const [draggingEndpoint, setDraggingEndpoint] = useState(null); // 'source', 'target', or 'waypoint'
    const [dragPoint, setDragPoint] = useState(null); // {x, y}
    const [snapTarget, setSnapTarget] = useState(null); // { shape, anchor }

    const dragPointRef = useRef(null);
    const snapTargetRef = useRef(null);
    const draggingEndpointRef = useRef(null);

    // Resolve start and end points
    const sourceShape = useMemo(() => shapes.find(s => s.id === sourceId), [shapes, sourceId]);
    const targetShape = useMemo(() => shapes.find(s => s.id === targetId), [shapes, targetId]);

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
        return {
            x: (actualSourcePoint.x + actualTargetPoint.x) / 2,
            y: (actualSourcePoint.y + actualTargetPoint.y) / 2
        };
    }, [draggingEndpoint, dragPoint, waypoint, actualSourcePoint, actualTargetPoint]);

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

            dragPointRef.current = nextPoint;
            setDragPoint(nextPoint);

            if (draggingEndpointRef.current === 'source' || draggingEndpointRef.current === 'target') {
                const snap = findNearestShape(nextPoint, shapes, 45);
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
        </g>
    );
}
