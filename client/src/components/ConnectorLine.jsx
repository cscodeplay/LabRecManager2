'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Returns { x, y } for the midpoint of a shape's edge
export const getAnchorPoint = (shape, anchor, otherPoint = null) => {
    if (!shape) return { x: 0, y: 0 };
    
    const center = { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
    
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

    switch (resolvedAnchor) {
        case 'top': return { x: center.x, y: shape.y };
        case 'right': return { x: shape.x + shape.width, y: center.y };
        case 'bottom': return { x: center.x, y: shape.y + shape.height };
        case 'left': return { x: shape.x, y: center.y };
        default: return center;
    }
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
export const getConnectorPath = (startPt, endPt, pathType = 'straight') => {
    if (pathType === 'straight') {
        return `M ${startPt.x} ${startPt.y} L ${endPt.x} ${endPt.y}`;
    } else if (pathType === 'orthogonal') {
        const midX = (startPt.x + endPt.x) / 2;
        return `M ${startPt.x} ${startPt.y} L ${midX} ${startPt.y} L ${midX} ${endPt.y} L ${endPt.x} ${endPt.y}`;
    } else if (pathType === 'curved') {
        const dx = endPt.x - startPt.x;
        const dy = endPt.y - startPt.y;
        
        // simple cubic bezier control points based on horizontal distance
        const controlDistX = Math.abs(dx) * 0.5;
        const cp1 = { x: startPt.x + controlDistX * Math.sign(dx || 1), y: startPt.y };
        const cp2 = { x: endPt.x - controlDistX * Math.sign(dx || 1), y: endPt.y };
        
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
const calculateAngle = (p1, p2) => {
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
        pathType = 'straight',
        arrowStart = 'none',
        arrowEnd = 'arrow',
        color = '#000000',
        strokeWidth = 2,
        strokeStyle = 'solid'
    } = connector;

    const [isHovered, setIsHovered] = useState(false);
    const [draggingEndpoint, setDraggingEndpoint] = useState(null); // 'source' or 'target'
    const [dragPoint, setDragPoint] = useState(null); // {x, y}
    const [snapTarget, setSnapTarget] = useState(null); // { shape, anchor }

    // Resolve start and end points
    const sourceShape = useMemo(() => shapes.find(s => s.id === sourceId), [shapes, sourceId]);
    const targetShape = useMemo(() => shapes.find(s => s.id === targetId), [shapes, targetId]);

    const actualSourcePoint = useMemo(() => {
        if (draggingEndpoint === 'source' && dragPoint) return dragPoint;
        if (sourceShape) return getAnchorPoint(sourceShape, sourceAnchor, targetShape ? { x: targetShape.x, y: targetShape.y } : targetPoint);
        return sourcePoint;
    }, [sourceShape, sourceAnchor, draggingEndpoint, dragPoint, sourcePoint, targetShape, targetPoint]);

    const actualTargetPoint = useMemo(() => {
        if (draggingEndpoint === 'target' && dragPoint) return dragPoint;
        if (targetShape) return getAnchorPoint(targetShape, targetAnchor, sourceShape ? { x: sourceShape.x, y: sourceShape.y } : sourcePoint);
        return targetPoint;
    }, [targetShape, targetAnchor, draggingEndpoint, dragPoint, targetPoint, sourceShape, sourcePoint]);

    const pathData = useMemo(() => getConnectorPath(actualSourcePoint, actualTargetPoint, pathType), [actualSourcePoint, actualTargetPoint, pathType]);

    // Handle dragging
    useEffect(() => {
        if (!draggingEndpoint) return;

        const handlePointerMove = (e) => {
            // Simplified drag math; assumes SVG coordinate space aligns with window or requires inverse CTM
            // In a real whiteboard, you'd pass a screen-to-canvas coordinate converter, but we use movement deltas or raw coordinates.
            // Using movementX/Y is safest if we don't have the svg element ref.
            setDragPoint(prev => ({
                x: prev.x + e.movementX / scale,
                y: prev.y + e.movementY / scale
            }));

            // Snapping logic
            const snap = findNearestShape(dragPoint, shapes, 40 / scale);
            setSnapTarget(snap);
        };

        const handlePointerUp = () => {
            // Commit drag
            const updates = {};
            if (snapTarget) {
                if (draggingEndpoint === 'source') {
                    updates.sourceId = snapTarget.shape.id;
                    updates.sourceAnchor = snapTarget.anchor;
                } else {
                    updates.targetId = snapTarget.shape.id;
                    updates.targetAnchor = snapTarget.anchor;
                }
            } else {
                if (draggingEndpoint === 'source') {
                    updates.sourceId = null;
                    updates.sourcePoint = dragPoint;
                } else {
                    updates.targetId = null;
                    updates.targetPoint = dragPoint;
                }
            }
            onUpdate(id, updates);
            
            setDraggingEndpoint(null);
            setDragPoint(null);
            setSnapTarget(null);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [draggingEndpoint, dragPoint, scale, shapes, snapTarget, id, onUpdate]);

    const handlePointerDown = (endpoint, e) => {
        e.stopPropagation();
        setDraggingEndpoint(endpoint);
        setDragPoint(endpoint === 'source' ? actualSourcePoint : actualTargetPoint);
    };

    // Calculate angles for arrows
    // Very simplified tangent calculation based on path type
    const sourceAngle = calculateAngle(actualTargetPoint, actualSourcePoint); // reverse
    const targetAngle = calculateAngle(actualSourcePoint, actualTargetPoint);

    // Stroke dasharray
    let strokeDasharray = 'none';
    if (strokeStyle === 'dashed') strokeDasharray = `${strokeWidth * 3}, ${strokeWidth * 3}`;
    if (strokeStyle === 'dotted') strokeDasharray = `${strokeWidth}, ${strokeWidth * 2}`;

    return (
        <g 
            className="connector-line-group"
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
                strokeWidth={Math.max(15, strokeWidth * 3)}
                className="cursor-pointer"
            />
            
            {/* Glow / Hover effect */}
            {(isHovered || isSelected) && (
                <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth + 4}
                    strokeOpacity={0.2}
                    className="transition-all duration-200"
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
                        onPointerDown={(e) => handlePointerDown('target', e)}
                    />
                </>
            )}

            {/* Snap Indicator */}
            {snapTarget && draggingEndpoint && (
                <circle
                    cx={getAnchorPoint(snapTarget.shape, snapTarget.anchor).x}
                    cy={getAnchorPoint(snapTarget.shape, snapTarget.anchor).y}
                    r={8 / scale}
                    fill="rgba(37, 99, 235, 0.4)" // blue-600 with opacity
                    stroke="#2563eb"
                    strokeWidth={2 / scale}
                    className="animate-pulse pointer-events-none"
                />
            )}
        </g>
    );
}
