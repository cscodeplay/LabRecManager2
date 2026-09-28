'use client';

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
    sampleFunctionCurve,
    samplePolarCurve,
    sampleParametricCurve,
    segmentsToSvgPath,
    buildInequalityFillPath,
    numericalDerivative,
    findRoots,
    findExtrema,
    findIntersections,
    calculateDefiniteIntegral,
    getTangentLine,
    getSecantLine
} from './mathParser';
import { hexToRgba } from './colorPalette';
import katex from 'katex';
import { 
    Move, ZoomIn, ZoomOut, RotateCcw, Crosshair, Pin, Eye, 
    Calculator, Sparkles, TrendingUp, Compass, Maximize2 
} from 'lucide-react';

/**
 * Intelligent tick spacing calculation for Cartesian axes
 */
function calculateTickInterval(range, maxTicks = 12) {
    const rawInterval = range / maxTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)));
    const normalized = rawInterval / magnitude;

    let interval;
    if (normalized < 1.5) interval = 1 * magnitude;
    else if (normalized < 3.5) interval = 2 * magnitude;
    else if (normalized < 7.5) interval = 5 * magnitude;
    else interval = 10 * magnitude;

    return interval;
}

export default function GraphCanvas({
    width = 800,
    height = 500,
    equations = [],
    selectedEqId = null,
    onSelectEquation,
    viewBounds = { xMin: -10, xMax: 10, yMin: -6, yMax: 6 },
    onUpdateViewBounds,
    coordinateSystem = 'cartesian', // 'cartesian' | 'polar'
    showGrid = true,
    showMinorGrid = true,
    showAxisLabels = true,
    lockAspectRatio = false,
    snapToGrid = false,
    parameters = {},
    legendConfig = { show: true, position: 'top-right' },
    showCurveLabels = true,
    activeAnalysis = null, // { type: 'roots' | 'extrema' | 'intersections' | 'tangent' | 'integral' | 'derivative', eqId, x0, a, b }
    onUpdateAnalysis,
    annotations = [],
    onUpdateAnnotations,
    activeAnnotationTool = null, // null | 'pen' | 'arrow' | 'text'
    annotationColor = '#ef4444',
    isPresentationMode = false,
    theme = 'dark', // 'dark' | 'light'
    onDoubleClickCanvas
}) {
    const containerRef = useRef(null);
    const svgRef = useRef(null);

    // Pan & Drag state
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0 });
    const boundsStartRef = useRef(null);

    // Active inspection point under cursor
    const [cursorMathPos, setCursorMathPos] = useState(null);
    const [snappedPoint, setSnappedPoint] = useState(null);
    const [placedPoints, setPlacedPoints] = useState([]); // Array<{ id, x, y, eqId, label, color }>

    // Tangent / Integral interactive drag handle
    const [draggingHandle, setDraggingHandle] = useState(null); // 'tangent_x0' | 'integral_a' | 'integral_b'

    // Freehand annotation drawing state
    const [currentDrawingStroke, setCurrentDrawingStroke] = useState(null);

    // Destructure bounds
    const { xMin, xMax, yMin, yMax } = viewBounds;

    // Coordinate conversion utilities
    const mathToScreenX = useCallback((mx) => {
        return ((mx - xMin) / (xMax - xMin)) * width;
    }, [xMin, xMax, width]);

    const mathToScreenY = useCallback((my) => {
        return height - ((my - yMin) / (yMax - yMin)) * height;
    }, [yMin, yMax, height]);

    const screenToMathX = useCallback((sx) => {
        return xMin + (sx / width) * (xMax - xMin);
    }, [xMin, xMax, width]);

    const screenToMathY = useCallback((sy) => {
        return yMin + ((height - sy) / height) * (yMax - yMin);
    }, [yMin, yMax, height]);

    // Calculate intelligent grid intervals
    const xInterval = useMemo(() => calculateTickInterval(xMax - xMin, Math.max(6, Math.floor(width / 90))), [xMin, xMax, width]);
    const yInterval = useMemo(() => calculateTickInterval(yMax - yMin, Math.max(5, Math.floor(height / 75))), [yMin, yMax, height]);

    // Generate grid lines and tick marks
    const gridData = useMemo(() => {
        const xTicks = [];
        const yTicks = [];
        const minorXTicks = [];
        const minorYTicks = [];

        // X Major Ticks
        const firstMajorX = Math.ceil(xMin / xInterval) * xInterval;
        for (let x = firstMajorX; x <= xMax + 1e-9; x += xInterval) {
            const rx = Math.round(x / xInterval) * xInterval;
            const sx = mathToScreenX(rx);
            if (sx >= 0 && sx <= width) {
                xTicks.push({ val: rx, sx, isOrigin: Math.abs(rx) < 1e-8 });
            }
        }

        // X Minor Ticks (subdivided by 2 or 5)
        if (showMinorGrid) {
            const sub = xInterval >= 5 ? 5 : 2;
            const minorStep = xInterval / sub;
            const firstMinorX = Math.ceil(xMin / minorStep) * minorStep;
            for (let x = firstMinorX; x <= xMax + 1e-9; x += minorStep) {
                const rx = Math.round(x / minorStep) * minorStep;
                const sx = mathToScreenX(rx);
                if (sx >= 0 && sx <= width && !xTicks.some(t => Math.abs(t.sx - sx) < 1)) {
                    minorXTicks.push({ val: rx, sx });
                }
            }
        }

        // Y Major Ticks
        const firstMajorY = Math.ceil(yMin / yInterval) * yInterval;
        for (let y = firstMajorY; y <= yMax + 1e-9; y += yInterval) {
            const ry = Math.round(y / yInterval) * yInterval;
            const sy = mathToScreenY(ry);
            if (sy >= 0 && sy <= height) {
                yTicks.push({ val: ry, sy, isOrigin: Math.abs(ry) < 1e-8 });
            }
        }

        // Y Minor Ticks
        if (showMinorGrid) {
            const sub = yInterval >= 5 ? 5 : 2;
            const minorStep = yInterval / sub;
            const firstMinorY = Math.ceil(yMin / minorStep) * minorStep;
            for (let y = firstMinorY; y <= yMax + 1e-9; y += minorStep) {
                const ry = Math.round(y / minorStep) * minorStep;
                const sy = mathToScreenY(ry);
                if (sy >= 0 && sy <= height && !yTicks.some(t => Math.abs(t.sy - sy) < 1)) {
                    minorYTicks.push({ val: ry, sy });
                }
            }
        }

        return { xTicks, yTicks, minorXTicks, minorYTicks };
    }, [xMin, xMax, yMin, yMax, xInterval, yInterval, width, height, mathToScreenX, mathToScreenY, showMinorGrid]);

    // Position of origin axes on screen
    const originScreenX = mathToScreenX(0);
    const originScreenY = mathToScreenY(0);

    // Compute plotted curves for all equations
    const plottedCurves = useMemo(() => {
        return equations.map(eq => {
            if (!eq.visible || !eq.parsed || eq.parsed.error) return null;

            let segments = [];
            let fillPath = '';

            try {
                if (eq.parsed.type === 'polar') {
                    segments = samplePolarCurve({
                        fn: eq.compiled,
                        xMin, xMax, yMin, yMax,
                        width, height,
                        params: parameters,
                        thetaMin: eq.parsed.domainRestriction?.min ?? 0,
                        thetaMax: eq.parsed.domainRestriction?.max ?? Math.PI * 4,
                        samples: 800
                    });
                } else if (eq.parsed.type === 'parametric' && eq.compiledX && eq.compiledY) {
                    segments = sampleParametricCurve({
                        fnX: eq.compiledX,
                        fnY: eq.compiledY,
                        xMin, xMax, yMin, yMax,
                        width, height,
                        params: parameters,
                        tMin: eq.parsed.parametric.tMin,
                        tMax: eq.parsed.parametric.tMax,
                        samples: 800
                    });
                } else {
                    // Standard Cartesian & Inequalities
                    segments = sampleFunctionCurve({
                        fn: eq.compiled,
                        xMin, xMax, yMin, yMax,
                        width, height,
                        params: parameters,
                        minSamples: Math.min(600, Math.round(width * 1.2)),
                        maxSamples: 1600,
                        domainRestriction: eq.domainRestriction || eq.parsed.domainRestriction
                    });

                    if (eq.parsed.type === 'inequality') {
                        fillPath = buildInequalityFillPath({
                            segments,
                            operator: eq.parsed.operator,
                            ineqVariable: eq.parsed.ineqVariable || 'y',
                            width, height,
                            xMin, xMax, yMin, yMax
                        });
                    }
                }
            } catch (err) {
                console.warn('Curve plot evaluation error:', err);
                return null;
            }

            const pathD = segmentsToSvgPath(segments);
            const isSelected = selectedEqId === eq.id;
            const isStrictIneq = eq.parsed.operator === '<' || eq.parsed.operator === '>';

            // Midpoint of curve for displaying curve label
            let labelPoint = null;
            if (segments.length > 0) {
                const mainSeg = segments[Math.floor(segments.length / 2)];
                if (mainSeg && mainSeg.length > 0) {
                    const mid = mainSeg[Math.floor(mainSeg.length / 2)];
                    if (mid.screenX >= 20 && mid.screenX <= width - 60 && mid.screenY >= 20 && mid.screenY <= height - 20) {
                        labelPoint = { x: mid.screenX, y: mid.screenY, text: eq.label || eq.raw };
                    }
                }
            }

            return {
                id: eq.id,
                color: eq.color,
                segments,
                pathD,
                fillPath,
                isSelected,
                isStrictIneq,
                labelPoint,
                raw: eq.raw,
                label: eq.label || eq.raw
            };
        }).filter(Boolean);
    }, [equations, selectedEqId, xMin, xMax, yMin, yMax, width, height, parameters]);

    // Mathematical Analysis Results (Roots, Extrema, Intersections, Tangent, Integral)
    const analysisResults = useMemo(() => {
        if (!activeAnalysis) return null;

        const targetEq = equations.find(e => e.id === activeAnalysis.eqId && e.visible && e.compiled);
        if (!targetEq) return null;

        const results = {
            type: activeAnalysis.type,
            eqId: targetEq.id,
            color: targetEq.color,
            markers: [],
            tangentLineData: null,
            secantLineData: null,
            integralData: null,
            derivativeCurvePath: null
        };

        try {
            if (activeAnalysis.type === 'roots') {
                const roots = findRoots(targetEq.compiled, xMin, xMax, parameters);
                results.markers = roots.map(rx => ({
                    x: rx,
                    y: 0,
                    screenX: mathToScreenX(rx),
                    screenY: mathToScreenY(0),
                    label: `Root (${rx.toFixed(2)}, 0)`,
                    badge: 'x-int'
                }));
            } else if (activeAnalysis.type === 'extrema') {
                const extrema = findExtrema(targetEq.compiled, xMin, xMax, parameters);
                results.markers = extrema.map(ext => ({
                    x: ext.x,
                    y: ext.y,
                    screenX: mathToScreenX(ext.x),
                    screenY: mathToScreenY(ext.y),
                    label: `${ext.label} (${ext.x.toFixed(2)}, ${ext.y.toFixed(2)})`,
                    badge: ext.type
                }));
            } else if (activeAnalysis.type === 'intersections') {
                // Find intersections between target equation and other visible equations
                const otherEqs = equations.filter(e => e.id !== targetEq.id && e.visible && e.compiled);
                const inters = [];
                for (const oEq of otherEqs) {
                    const pts = findIntersections(targetEq.compiled, oEq.compiled, xMin, xMax, parameters);
                    pts.forEach(p => {
                        inters.push({
                            x: p.x,
                            y: p.y,
                            screenX: mathToScreenX(p.x),
                            screenY: mathToScreenY(p.y),
                            label: `Intersection (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`,
                            badge: 'intersect'
                        });
                    });
                }
                results.markers = inters;
            } else if (activeAnalysis.type === 'tangent') {
                const x0 = activeAnalysis.x0 !== undefined ? activeAnalysis.x0 : (xMin + xMax) / 2;
                const tangent = getTangentLine(targetEq.compiled, x0, parameters);
                if (tangent) {
                    const sx0 = mathToScreenX(tangent.x0);
                    const sy0 = mathToScreenY(tangent.y0);

                    // Compute tangent line endpoints across screen
                    const yAtXMin = tangent.evaluate(xMin);
                    const yAtXMax = tangent.evaluate(xMax);

                    results.tangentLineData = {
                        ...tangent,
                        sx0,
                        sy0,
                        x1: mathToScreenX(xMin),
                        y1: mathToScreenY(yAtXMin),
                        x2: mathToScreenX(xMax),
                        y2: mathToScreenY(yAtXMax)
                    };
                }
            } else if (activeAnalysis.type === 'integral') {
                const a = activeAnalysis.a !== undefined ? activeAnalysis.a : -2;
                const b = activeAnalysis.b !== undefined ? activeAnalysis.b : 2;
                const area = calculateDefiniteIntegral(targetEq.compiled, a, b, parameters);

                // Build shaded polygon between curve and y = 0
                const numPts = 100;
                const step = (b - a) / numPts;
                const pts = [];
                for (let i = 0; i <= numPts; i++) {
                    const mx = a + i * step;
                    const my = targetEq.compiled({ x: mx }, parameters);
                    pts.push({ sx: mathToScreenX(mx), sy: mathToScreenY(my) });
                }

                const sY0 = mathToScreenY(0);
                let polygonD = `M ${mathToScreenX(a)} ${sY0} `;
                for (const p of pts) {
                    polygonD += `L ${p.sx.toFixed(1)} ${p.sy.toFixed(1)} `;
                }
                polygonD += `L ${mathToScreenX(b)} ${sY0} Z`;

                results.integralData = {
                    a,
                    b,
                    area: isNaN(area) ? 0 : area,
                    polygonD,
                    sa: mathToScreenX(a),
                    sb: mathToScreenX(b),
                    sY0
                };
            } else if (activeAnalysis.type === 'derivative') {
                // Plot numerical derivative f'(x)
                const derivFn = (v, p) => numericalDerivative(targetEq.compiled, v.x, p);
                const derivSegs = sampleFunctionCurve({
                    fn: derivFn,
                    xMin, xMax, yMin, yMax,
                    width, height,
                    params: parameters,
                    minSamples: 400
                });
                results.derivativeCurvePath = segmentsToSvgPath(derivSegs);
            }
        } catch (err) {
            console.warn('Analysis error:', err);
        }

        return results;
    }, [activeAnalysis, equations, xMin, xMax, yMin, yMax, parameters, mathToScreenX, mathToScreenY, width, height]);

    // ─────────────────────────────────────────────────────────────────────────
    // PAN & ZOOM EVENT HANDLERS
    // ─────────────────────────────────────────────────────────────────────────

    const handlePointerDown = (e) => {
        // If clicking on an interactive handle (tangent / integral)
        if (e.target.dataset.handle) {
            setDraggingHandle(e.target.dataset.handle);
            e.stopPropagation();
            return;
        }

        // If freehand annotation tool is active
        if (activeAnnotationTool) {
            const rect = svgRef.current.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            setCurrentDrawingStroke({
                id: `ann_${Date.now()}`,
                tool: activeAnnotationTool,
                color: annotationColor,
                points: [{ x: sx, y: sy }]
            });
            return;
        }

        // Standard Pan
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY };
        boundsStartRef.current = { ...viewBounds };
    };

    const handlePointerMove = (e) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        const mathX = screenToMathX(sx);
        const mathY = screenToMathY(sy);
        setCursorMathPos({ x: mathX, y: mathY, screenX: sx, screenY: sy });

        // If dragging an analysis handle
        if (draggingHandle && activeAnalysis && onUpdateAnalysis) {
            const clampedX = Math.round(mathX * 20) / 20; // 0.05 precision snap
            if (draggingHandle === 'tangent_x0') {
                onUpdateAnalysis({ ...activeAnalysis, x0: clampedX });
            } else if (draggingHandle === 'integral_a') {
                onUpdateAnalysis({ ...activeAnalysis, a: clampedX });
            } else if (draggingHandle === 'integral_b') {
                onUpdateAnalysis({ ...activeAnalysis, b: clampedX });
            }
            return;
        }

        // If drawing annotation stroke
        if (currentDrawingStroke) {
            setCurrentDrawingStroke(prev => ({
                ...prev,
                points: [...prev.points, { x: sx, y: sy }]
            }));
            return;
        }

        // If panning canvas
        if (isPanning && boundsStartRef.current) {
            const deltaX = e.clientX - panStartRef.current.x;
            const deltaY = e.clientY - panStartRef.current.y;

            const mathDeltaX = (deltaX / width) * (boundsStartRef.current.xMax - boundsStartRef.current.xMin);
            const mathDeltaY = (deltaY / height) * (boundsStartRef.current.yMax - boundsStartRef.current.yMin);

            const newBounds = {
                xMin: boundsStartRef.current.xMin - mathDeltaX,
                xMax: boundsStartRef.current.xMax - mathDeltaX,
                yMin: boundsStartRef.current.yMin + mathDeltaY,
                yMax: boundsStartRef.current.yMax + mathDeltaY
            };

            if (onUpdateViewBounds) onUpdateViewBounds(newBounds);
            return;
        }

        // Curve Point Inspection & Magnetic Snap:
        // Find closest curve and point to cursor
        let closestSnap = null;
        let minPixelDist = 24; // Pixel hit threshold

        // 1. Check existing analysis markers for snap
        if (analysisResults && analysisResults.markers) {
            for (const m of analysisResults.markers) {
                const dist = Math.hypot(sx - m.screenX, sy - m.screenY);
                if (dist < minPixelDist) {
                    minPixelDist = dist;
                    closestSnap = {
                        x: m.x,
                        y: m.y,
                        screenX: m.screenX,
                        screenY: m.screenY,
                        label: m.label,
                        color: analysisResults.color,
                        isSpecial: true
                    };
                }
            }
        }

        // 2. Check curves if no special point snapped
        if (!closestSnap) {
            for (const curve of plottedCurves) {
                for (const seg of curve.segments) {
                    for (const pt of seg) {
                        const dist = Math.hypot(sx - pt.screenX, sy - pt.screenY);
                        if (dist < minPixelDist) {
                            minPixelDist = dist;
                            closestSnap = {
                                x: pt.x,
                                y: pt.y,
                                screenX: pt.screenX,
                                screenY: pt.screenY,
                                eqId: curve.id,
                                color: curve.color,
                                label: `(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`
                            };
                        }
                    }
                }
            }
        }

        setSnappedPoint(closestSnap);
    };

    const handlePointerUp = () => {
        if (isPanning) setIsPanning(false);
        if (draggingHandle) setDraggingHandle(null);

        if (currentDrawingStroke) {
            if (onUpdateAnnotations) {
                onUpdateAnnotations([...annotations, currentDrawingStroke]);
            }
            setCurrentDrawingStroke(null);
        }
    };

    // Zoom via mouse wheel / trackpad pinch
    const handleWheel = (e) => {
        e.preventDefault();
        const rect = svgRef.current.getBoundingClientRect();
        const cursorSx = e.clientX - rect.left;
        const cursorSy = e.clientY - rect.top;

        // Zoom factor: wheel down = zoom out, wheel up = zoom in
        const zoomFactor = e.deltaY < 0 ? 0.85 : 1.18;

        const cursorMathX = screenToMathX(cursorSx);
        const cursorMathY = screenToMathY(cursorSy);

        const newXRange = (xMax - xMin) * zoomFactor;
        const newYRange = (yMax - yMin) * zoomFactor;

        // Keep point under cursor stable during zoom
        const xFraction = cursorSx / width;
        const yFraction = (height - cursorSy) / height;

        const newXMin = cursorMathX - xFraction * newXRange;
        const newXMax = newXMin + newXRange;
        const newYMin = cursorMathY - yFraction * newYRange;
        const newYMax = newYMin + newYRange;

        if (onUpdateViewBounds) {
            onUpdateViewBounds({
                xMin: newXMin,
                xMax: newXMax,
                yMin: newYMin,
                yMax: newYMax
            });
        }
    };

    // Pin inspection point on click
    const handleCanvasClick = (e) => {
        if (isPanning || activeAnnotationTool) return;
        if (snappedPoint) {
            // Select associated equation
            if (snappedPoint.eqId && onSelectEquation) {
                onSelectEquation(snappedPoint.eqId);
            }
            // Add pinned point
            setPlacedPoints(prev => [
                ...prev,
                {
                    id: `pt_${Date.now()}`,
                    x: snappedPoint.x,
                    y: snappedPoint.y,
                    screenX: snappedPoint.screenX,
                    screenY: snappedPoint.screenY,
                    color: snappedPoint.color,
                    label: snappedPoint.label
                }
            ]);
        }
    };

    // Auto-fit graph view to plotted equations
    const handleFitToEquations = useCallback(() => {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        let hasPoints = false;

        for (const curve of plottedCurves) {
            for (const seg of curve.segments) {
                for (const pt of seg) {
                    if (isFinite(pt.x) && isFinite(pt.y)) {
                        minX = Math.min(minX, pt.x);
                        maxX = Math.max(maxX, pt.x);
                        minY = Math.min(minY, pt.y);
                        maxY = Math.max(maxY, pt.y);
                        hasPoints = true;
                    }
                }
            }
        }

        if (hasPoints && isFinite(minX) && isFinite(maxX)) {
            const padX = Math.max(1, (maxX - minX) * 0.15);
            const padY = Math.max(1, (maxY - minY) * 0.15);
            if (onUpdateViewBounds) {
                onUpdateViewBounds({
                    xMin: minX - padX,
                    xMax: maxX + padX,
                    yMin: minY - padY,
                    yMax: maxY + padY
                });
            }
        } else {
            if (onUpdateViewBounds) onUpdateViewBounds({ xMin: -10, xMax: 10, yMin: -6, yMax: 6 });
        }
    }, [plottedCurves, onUpdateViewBounds]);

    // Colors according to theme
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0f172a' : '#ffffff';
    const gridMajorColor = isDark ? 'rgba(71, 85, 105, 0.45)' : 'rgba(203, 213, 225, 0.7)';
    const gridMinorColor = isDark ? 'rgba(51, 65, 85, 0.25)' : 'rgba(241, 245, 249, 0.9)';
    const axisColor = isDark ? '#94a3b8' : '#334155';
    const textColor = isDark ? '#cbd5e1' : '#475569';

    return (
        <div 
            ref={containerRef}
            className={`relative select-none overflow-hidden rounded-xl border border-slate-700/60 shadow-2xl ${
                isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'
            }`}
            style={{ width: `${width}px`, height: `${height}px` }}
            onDoubleClick={onDoubleClickCanvas}
        >
            <svg
                ref={svgRef}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                className={`w-full h-full ${activeAnnotationTool ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onWheel={handleWheel}
                onClick={handleCanvasClick}
            >
                <defs>
                    {/* Arrow Marker for Axes */}
                    <marker id="axis-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={axisColor} />
                    </marker>
                    {/* Shadow Filter for emphasized curves */}
                    <filter id="curve-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.6" />
                    </filter>
                </defs>

                {/* 1. Background Fill */}
                <rect width={width} height={height} fill={bgColor} />

                {/* 2. Polar Grid (if coordinateSystem === 'polar') */}
                {coordinateSystem === 'polar' && (
                    <g className="polar-grid">
                        {/* Concentric radius circles */}
                        {Array.from({ length: 8 }).map((_, i) => {
                            const rRadius = ((i + 1) * xInterval);
                            const screenRadius = (rRadius / (xMax - xMin)) * width;
                            return (
                                <circle
                                    key={`polar_c_${i}`}
                                    cx={originScreenX}
                                    cy={originScreenY}
                                    r={screenRadius}
                                    fill="none"
                                    stroke={gridMajorColor}
                                    strokeWidth="1"
                                    strokeDasharray="3,3"
                                />
                            );
                        })}
                        {/* Radial Ray Lines (every 30 degrees = π/6) */}
                        {Array.from({ length: 12 }).map((_, i) => {
                            const angle = (i * Math.PI) / 6;
                            const maxDist = Math.max(width, height) * 2;
                            const x2 = originScreenX + maxDist * Math.cos(angle);
                            const y2 = originScreenY - maxDist * Math.sin(angle);
                            return (
                                <line
                                    key={`polar_r_${i}`}
                                    x1={originScreenX}
                                    y1={originScreenY}
                                    x2={x2}
                                    y2={y2}
                                    stroke={gridMinorColor}
                                    strokeWidth="1"
                                />
                            );
                        })}
                    </g>
                )}

                {/* 3. Cartesian Grid Lines */}
                {coordinateSystem === 'cartesian' && showGrid && (
                    <g className="cartesian-grid">
                        {/* Minor Grid Lines */}
                        {showMinorGrid && (
                            <>
                                {gridData.minorXTicks.map((t, idx) => (
                                    <line
                                        key={`min_x_${idx}`}
                                        x1={t.sx}
                                        y1={0}
                                        x2={t.sx}
                                        y2={height}
                                        stroke={gridMinorColor}
                                        strokeWidth="0.75"
                                    />
                                ))}
                                {gridData.minorYTicks.map((t, idx) => (
                                    <line
                                        key={`min_y_${idx}`}
                                        x1={0}
                                        y1={t.sy}
                                        x2={width}
                                        y2={t.sy}
                                        stroke={gridMinorColor}
                                        strokeWidth="0.75"
                                    />
                                ))}
                            </>
                        )}

                        {/* Major Grid Lines */}
                        {gridData.xTicks.map((t, idx) => (
                            <line
                                key={`maj_x_${idx}`}
                                x1={t.sx}
                                y1={0}
                                x2={t.sx}
                                y2={height}
                                stroke={t.isOrigin ? 'transparent' : gridMajorColor}
                                strokeWidth="1"
                            />
                        ))}
                        {gridData.yTicks.map((t, idx) => (
                            <line
                                key={`maj_y_${idx}`}
                                x1={0}
                                y1={t.sy}
                                x2={width}
                                y2={t.sy}
                                stroke={t.isOrigin ? 'transparent' : gridMajorColor}
                                strokeWidth="1"
                            />
                        ))}
                    </g>
                )}

                {/* 4. Coordinate Axes (X and Y with Arrowheads) */}
                <g className="coordinate-axes">
                    {/* X Axis */}
                    {originScreenY >= -10 && originScreenY <= height + 10 && (
                        <g>
                            <line
                                x1={0}
                                y1={originScreenY}
                                x2={width}
                                y2={originScreenY}
                                stroke={axisColor}
                                strokeWidth="2"
                                markerEnd="url(#axis-arrow)"
                            />
                            {/* X-Axis Label */}
                            <text
                                x={width - 15}
                                y={originScreenY - 8}
                                fill={axisColor}
                                fontSize="13"
                                fontWeight="bold"
                                fontFamily="monospace"
                            >
                                x
                            </text>
                        </g>
                    )}

                    {/* Y Axis */}
                    {originScreenX >= -10 && originScreenX <= width + 10 && (
                        <g>
                            <line
                                x1={originScreenX}
                                y1={height}
                                x2={originScreenX}
                                y2={0}
                                stroke={axisColor}
                                strokeWidth="2"
                                markerEnd="url(#axis-arrow)"
                            />
                            {/* Y-Axis Label */}
                            <text
                                x={originScreenX + 8}
                                y={16}
                                fill={axisColor}
                                fontSize="13"
                                fontWeight="bold"
                                fontFamily="monospace"
                            >
                                y
                            </text>
                        </g>
                    )}

                    {/* Origin Marker (0, 0) */}
                    {originScreenX >= 0 && originScreenX <= width && originScreenY >= 0 && originScreenY <= height && (
                        <g>
                            <circle cx={originScreenX} cy={originScreenY} r="3" fill={axisColor} />
                            <text
                                x={originScreenX - 12}
                                y={originScreenY + 14}
                                fill={textColor}
                                fontSize="10"
                                fontFamily="monospace"
                                opacity="0.8"
                            >
                                0
                            </text>
                        </g>
                    )}
                </g>

                {/* 5. Axis Number Labels */}
                {showAxisLabels && (
                    <g className="axis-labels">
                        {/* X-Axis Numbers */}
                        {gridData.xTicks.filter(t => !t.isOrigin).map((t, idx) => {
                            const labelY = Math.min(Math.max(20, originScreenY + 16), height - 8);
                            return (
                                <g key={`x_lbl_${idx}`}>
                                    <line x1={t.sx} y1={originScreenY - 3} x2={t.sx} y2={originScreenY + 3} stroke={axisColor} strokeWidth="1.5" />
                                    <text
                                        x={t.sx}
                                        y={labelY}
                                        textAnchor="middle"
                                        fill={textColor}
                                        fontSize="11"
                                        fontFamily="monospace"
                                        fontWeight="500"
                                    >
                                        {formatAxisNumber(t.val)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Y-Axis Numbers */}
                        {gridData.yTicks.filter(t => !t.isOrigin).map((t, idx) => {
                            const labelX = Math.min(Math.max(26, originScreenX - 8), width - 36);
                            return (
                                <g key={`y_lbl_${idx}`}>
                                    <line x1={originScreenX - 3} y1={t.sy} x2={originScreenX + 3} stroke={axisColor} strokeWidth="1.5" />
                                    <text
                                        x={labelX}
                                        y={t.sy + 4}
                                        textAnchor="end"
                                        fill={textColor}
                                        fontSize="11"
                                        fontFamily="monospace"
                                        fontWeight="500"
                                    >
                                        {formatAxisNumber(t.val)}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                )}

                {/* 6. Plotted Curves & Inequalities */}
                <g className="equations-layer">
                    {/* Inequality Shaded Regions (rendered underneath curves) */}
                    {plottedCurves.map(curve => {
                        if (!curve.fillPath) return null;
                        return (
                            <path
                                key={`fill_${curve.id}`}
                                d={curve.fillPath}
                                fill={hexToRgba(curve.color, curve.isSelected ? 0.28 : 0.16)}
                                stroke="none"
                            />
                        );
                    })}

                    {/* Definite Integral Area Under Curve Shading */}
                    {analysisResults && analysisResults.integralData && (
                        <path
                            d={analysisResults.integralData.polygonD}
                            fill={hexToRgba(analysisResults.color, 0.35)}
                            stroke={analysisResults.color}
                            strokeWidth="1.5"
                            strokeDasharray="4,2"
                        />
                    )}

                    {/* Derivative Curve (optional analysis overlay) */}
                    {analysisResults && analysisResults.derivativeCurvePath && (
                        <path
                            d={analysisResults.derivativeCurvePath}
                            fill="none"
                            stroke={analysisResults.color}
                            strokeWidth="2"
                            strokeDasharray="4,3"
                            opacity="0.8"
                        />
                    )}

                    {/* Main Function Curves */}
                    {plottedCurves.map(curve => {
                        const isEmphasized = curve.isSelected;
                        const isSubdued = selectedEqId && !curve.isSelected;
                        const strokeWidthVal = isEmphasized ? 3.5 : 2.5;

                        return (
                            <g key={`curve_${curve.id}`} className="transition-opacity duration-150">
                                <path
                                    d={curve.pathD}
                                    fill="none"
                                    stroke={curve.color}
                                    strokeWidth={strokeWidthVal}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeDasharray={curve.isStrictIneq ? '6,4' : 'none'}
                                    opacity={isSubdued ? 0.35 : 1}
                                    filter={isEmphasized ? 'url(#curve-glow)' : 'none'}
                                />
                                {/* Optional In-Canvas Curve Label */}
                                {showCurveLabels && curve.labelPoint && !isSubdued && (
                                    <g
                                        transform={`translate(${curve.labelPoint.x}, ${curve.labelPoint.y})`}
                                        className="pointer-events-none"
                                    >
                                        <rect
                                            x="-6"
                                            y="-14"
                                            width={(curve.labelPoint.text.length * 7.5) + 12}
                                            height="20"
                                            rx="5"
                                            fill={isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)'}
                                            stroke={curve.color}
                                            strokeWidth="1.5"
                                        />
                                        <text
                                            x="0"
                                            y="0"
                                            fill={curve.color}
                                            fontSize="11"
                                            fontWeight="bold"
                                            fontFamily="monospace"
                                        >
                                            {curve.labelPoint.text}
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    })}

                    {/* Tangent Line Overlay */}
                    {analysisResults && analysisResults.tangentLineData && (
                        <g className="tangent-overlay">
                            <line
                                x1={analysisResults.tangentLineData.x1}
                                y1={analysisResults.tangentLineData.y1}
                                x2={analysisResults.tangentLineData.x2}
                                y2={analysisResults.tangentLineData.y2}
                                stroke="#f59e0b"
                                strokeWidth="2.5"
                                strokeDasharray="6,3"
                            />
                            {/* Point of tangency (x0, y0) with draggable handle */}
                            <circle
                                cx={analysisResults.tangentLineData.sx0}
                                cy={analysisResults.tangentLineData.sy0}
                                r="6"
                                fill="#f59e0b"
                                stroke="#ffffff"
                                strokeWidth="2.5"
                                data-handle="tangent_x0"
                                className="cursor-ew-resize hover:scale-125 transition-transform"
                            />
                            {/* Tangent badge */}
                            <g transform={`translate(${analysisResults.tangentLineData.sx0 + 12}, ${analysisResults.tangentLineData.sy0 - 12})`}>
                                <rect x="0" y="-12" width="160" height="24" rx="6" fill="rgba(15, 23, 42, 0.92)" stroke="#f59e0b" strokeWidth="1" />
                                <text x="8" y="4" fill="#fbbf24" fontSize="11" fontFamily="monospace" fontWeight="bold">
                                    {analysisResults.tangentLineData.equationText}
                                </text>
                            </g>
                        </g>
                    )}

                    {/* Definite Integral Draggable Boundary Handles */}
                    {analysisResults && analysisResults.integralData && (
                        <g className="integral-handles">
                            {/* a Handle */}
                            <line
                                x1={analysisResults.integralData.sa}
                                y1={0}
                                x2={analysisResults.integralData.sa}
                                y2={height}
                                stroke="#10b981"
                                strokeWidth="2"
                                strokeDasharray="3,3"
                            />
                            <circle
                                cx={analysisResults.integralData.sa}
                                cy={analysisResults.integralData.sY0}
                                r="7"
                                fill="#10b981"
                                stroke="#ffffff"
                                strokeWidth="2"
                                data-handle="integral_a"
                                className="cursor-ew-resize hover:scale-125 transition-transform"
                            />
                            {/* b Handle */}
                            <line
                                x1={analysisResults.integralData.sb}
                                y1={0}
                                x2={analysisResults.integralData.sb}
                                y2={height}
                                stroke="#10b981"
                                strokeWidth="2"
                                strokeDasharray="3,3"
                            />
                            <circle
                                cx={analysisResults.integralData.sb}
                                cy={analysisResults.integralData.sY0}
                                r="7"
                                fill="#10b981"
                                stroke="#ffffff"
                                strokeWidth="2"
                                data-handle="integral_b"
                                className="cursor-ew-resize hover:scale-125 transition-transform"
                            />
                            {/* Area Result Badge */}
                            <g transform={`translate(${(analysisResults.integralData.sa + analysisResults.integralData.sb) / 2}, ${Math.max(30, analysisResults.integralData.sY0 - 30)})`}>
                                <rect x="-60" y="-14" width="120" height="26" rx="6" fill="rgba(15, 23, 42, 0.92)" stroke="#10b981" strokeWidth="1" />
                                <text x="0" y="4" textAnchor="middle" fill="#34d399" fontSize="12" fontFamily="monospace" fontWeight="bold">
                                    ∫ = {analysisResults.integralData.area.toFixed(3)}
                                </text>
                            </g>
                        </g>
                    )}

                    {/* Analysis Markers (Roots, Extrema, Intersections) */}
                    {analysisResults && analysisResults.markers.map((m, idx) => (
                        <g key={`marker_${idx}`} className="animate-in fade-in duration-200">
                            {/* Diamond for Extrema, Circle for Roots, Star/Square for Intersections */}
                            {m.badge === 'max' || m.badge === 'min' ? (
                                <polygon
                                    points={`${m.screenX},${m.screenY - 7} ${m.screenX + 7},${m.screenY} ${m.screenX},${m.screenY + 7} ${m.screenX - 7},${m.screenY}`}
                                    fill={m.badge === 'max' ? '#ec4899' : '#06b6d4'}
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                />
                            ) : m.badge === 'intersect' ? (
                                <rect
                                    x={m.screenX - 5}
                                    y={m.screenY - 5}
                                    width="10"
                                    height="10"
                                    fill="#f59e0b"
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                />
                            ) : (
                                <circle
                                    cx={m.screenX}
                                    cy={m.screenY}
                                    r="6"
                                    fill={analysisResults.color}
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                />
                            )}
                            <rect
                                x={m.screenX + 8}
                                y={m.screenY - 18}
                                width={(m.label.length * 7) + 8}
                                height="20"
                                rx="4"
                                fill="rgba(15, 23, 42, 0.9)"
                                stroke={analysisResults.color}
                                strokeWidth="1"
                            />
                            <text
                                x={m.screenX + 12}
                                y={m.screenY - 4}
                                fill="#ffffff"
                                fontSize="10"
                                fontFamily="monospace"
                                fontWeight="bold"
                            >
                                {m.label}
                            </text>
                        </g>
                    ))}
                </g>

                {/* 7. Persistent Pinned Inspection Points */}
                <g className="pinned-points">
                    {placedPoints.map((pt) => (
                        <g key={pt.id} className="cursor-pointer" onClick={(e) => {
                            e.stopPropagation();
                            setPlacedPoints(prev => prev.filter(p => p.id !== pt.id));
                        }}>
                            <circle cx={pt.screenX} cy={pt.screenY} r="6" fill={pt.color || '#3b82f6'} stroke="#ffffff" strokeWidth="2.5" />
                            <rect
                                x={pt.screenX + 8}
                                y={pt.screenY - 20}
                                width={84}
                                height="22"
                                rx="5"
                                fill="rgba(15, 23, 42, 0.92)"
                                stroke={pt.color || '#3b82f6'}
                                strokeWidth="1"
                            />
                            <text x={pt.screenX + 12} y={pt.screenY - 5} fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                                {pt.label}
                            </text>
                        </g>
                    ))}
                </g>

                {/* 8. Snapped Hover Inspector Badge under Cursor */}
                {snappedPoint && (
                    <g className="hover-inspector pointer-events-none">
                        <circle
                            cx={snappedPoint.screenX}
                            cy={snappedPoint.screenY}
                            r="7"
                            fill="none"
                            stroke={snappedPoint.color || '#3b82f6'}
                            strokeWidth="2.5"
                            className="animate-ping"
                            style={{ transformOrigin: `${snappedPoint.screenX}px ${snappedPoint.screenY}px` }}
                        />
                        <circle
                            cx={snappedPoint.screenX}
                            cy={snappedPoint.screenY}
                            r="5"
                            fill={snappedPoint.color || '#3b82f6'}
                            stroke="#ffffff"
                            strokeWidth="2"
                        />
                        <g transform={`translate(${Math.min(width - 120, Math.max(10, snappedPoint.screenX + 10))}, ${Math.max(25, snappedPoint.screenY - 20)})`}>
                            <rect
                                x="0"
                                y="-14"
                                width="115"
                                height="28"
                                rx="6"
                                fill="rgba(15, 23, 42, 0.95)"
                                stroke={snappedPoint.color || '#3b82f6'}
                                strokeWidth="1.5"
                                filter="drop-shadow(0 4px 6px rgba(0,0,0,0.4))"
                            />
                            <text x="8" y="4" fill="#38bdf8" fontSize="11" fontFamily="monospace" fontWeight="bold">
                                x = {snappedPoint.x.toFixed(2)}
                            </text>
                            <text x="64" y="4" fill="#a7f3d0" fontSize="11" fontFamily="monospace" fontWeight="bold">
                                y = {snappedPoint.y.toFixed(2)}
                            </text>
                        </g>
                    </g>
                )}

                {/* 9. Freehand In-Canvas Annotations Layer */}
                <g className="annotations-layer">
                    {annotations.map((ann) => (
                        <path
                            key={ann.id}
                            d={pointsToSvgPath(ann.points)}
                            fill="none"
                            stroke={ann.color || '#ef4444'}
                            strokeWidth={ann.tool === 'highlighter' ? 12 : 3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={ann.tool === 'highlighter' ? 0.4 : 1}
                        />
                    ))}
                    {currentDrawingStroke && (
                        <path
                            d={pointsToSvgPath(currentDrawingStroke.points)}
                            fill="none"
                            stroke={currentDrawingStroke.color || '#ef4444'}
                            strokeWidth={currentDrawingStroke.tool === 'highlighter' ? 12 : 3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={currentDrawingStroke.tool === 'highlighter' ? 0.4 : 1}
                        />
                    )}
                </g>
            </svg>

            {/* 10. Graph Legend (Configurable on/off, draggable or selectable position) */}
            {legendConfig.show && equations.length > 0 && (
                <div
                    className={`absolute p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-2xl flex flex-col gap-1.5 z-20 max-w-[240px] text-xs pointer-events-auto transition-all ${
                        legendConfig.position === 'top-left' ? 'top-3 left-3' :
                        legendConfig.position === 'bottom-right' ? 'bottom-3 right-3' :
                        legendConfig.position === 'bottom-left' ? 'bottom-3 left-3' :
                        'top-3 right-3'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Equations</span>
                        <span className="text-slate-500 font-mono">({equations.filter(e => e.visible).length}/{equations.length})</span>
                    </div>
                    <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto pr-1">
                        {equations.map((eq, idx) => (
                            <button
                                key={eq.id}
                                type="button"
                                onClick={() => onSelectEquation && onSelectEquation(eq.id)}
                                className={`flex items-center gap-2 px-2 py-1 rounded-lg text-left transition-all ${
                                    selectedEqId === eq.id
                                        ? 'bg-slate-800 text-white font-semibold shadow-xs ring-1 ring-inset ring-slate-600'
                                        : 'text-slate-300 hover:bg-slate-800/60'
                                } ${!eq.visible ? 'opacity-40 line-through' : ''}`}
                            >
                                <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                    style={{ backgroundColor: eq.color }}
                                />
                                <span className="truncate font-mono text-[11px]" title={eq.raw}>
                                    {eq.label || eq.raw}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 11. Coordinate Inspection Overlay Badge in Corner */}
            {cursorMathPos && !snappedPoint && (
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-slate-900/85 backdrop-blur-sm border border-slate-700/60 text-slate-300 font-mono text-[11px] pointer-events-none z-10 flex items-center gap-2">
                    <Crosshair className="w-3 h-3 text-slate-400" />
                    <span>x: <strong className="text-sky-400">{cursorMathPos.x.toFixed(2)}</strong></span>
                    <span>y: <strong className="text-emerald-400">{cursorMathPos.y.toFixed(2)}</strong></span>
                </div>
            )}
        </div>
    );
}

// Helpers
function formatAxisNumber(val) {
    if (Math.abs(val) < 1e-8) return '0';
    if (Math.abs(val) >= 10000 || (Math.abs(val) < 0.01 && Math.abs(val) > 0)) {
        return val.toExponential(1);
    }
    return Number(val.toFixed(3)).toString();
}

function pointsToSvgPath(pts) {
    if (!pts || pts.length === 0) return '';
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} `;
    for (let i = 1; i < pts.length; i++) {
        d += `L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} `;
    }
    return d.trim();
}
