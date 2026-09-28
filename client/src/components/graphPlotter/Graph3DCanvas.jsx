'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
    RotateCcw, Play, Pause, Layers, Compass, 
    ZoomIn, ZoomOut, Sparkles, ChevronDown, Check, Calculator
} from 'lucide-react';
import { compileExpression } from './mathParser';

// Built-in 3D mathematical surfaces
export const SURFACE_3D_PRESETS = [
    {
        id: 'ripple',
        name: 'Wave / Ripple',
        formula: 'sin(sqrt(x^2 + y^2))',
        description: 'Circular damped sinusoidal wave ripple',
        xRange: [-4, 4],
        yRange: [-4, 4],
        fn: (x, y) => Math.sin(Math.hypot(x, y) * 1.5) / (0.4 * Math.hypot(x, y) + 1)
    },
    {
        id: 'saddle',
        name: 'Hyperbolic Saddle',
        formula: '(x^2 - y^2) / 4',
        description: 'Classic hyperbolic paraboloid saddle surface',
        xRange: [-3, 3],
        yRange: [-3, 3],
        fn: (x, y) => (x * x - y * y) * 0.25
    },
    {
        id: 'paraboloid',
        name: 'Circular Paraboloid',
        formula: '(x^2 + y^2) / 6',
        description: 'Elliptic bowl paraboloid',
        xRange: [-3, 3],
        yRange: [-3, 3],
        fn: (x, y) => (x * x + y * y) * 0.16
    },
    {
        id: 'peaks',
        name: 'Multi-Peak Terrain',
        formula: '3*(1-x)^2*exp(-x^2-(y+1)^2) - 10*(x/5 - x^3 - y^5)*exp(-x^2-y^2)',
        description: 'Complex multi-modal topological landscape',
        xRange: [-3, 3],
        yRange: [-3, 3],
        fn: (x, y) => {
            const t1 = 3 * Math.pow(1 - x, 2) * Math.exp(-x * x - Math.pow(y + 1, 2));
            const t2 = 10 * (x / 5 - Math.pow(x, 3) - Math.pow(y, 5)) * Math.exp(-x * x - y * y);
            const t3 = (1 / 3) * Math.exp(-Math.pow(x + 1, 2) - y * y);
            return (t1 - t2 - t3) * 0.35;
        }
    },
    {
        id: 'egg_carton',
        name: 'Egg Carton / Waves',
        formula: 'cos(x) * sin(y)',
        description: 'Periodic 2D sine/cosine undulating egg carton',
        xRange: [-4.5, 4.5],
        yRange: [-4.5, 4.5],
        fn: (x, y) => Math.cos(x * 1.2) * Math.sin(y * 1.2)
    },
    {
        id: 'sombrero',
        name: 'Mexican Hat / Sombrero',
        formula: '(1 - r^2/2) * exp(-r^2/2)',
        description: 'Radial Laplacian-of-Gaussian surface',
        xRange: [-3.5, 3.5],
        yRange: [-3.5, 3.5],
        fn: (x, y) => {
            const r2 = x * x + y * y;
            return (1 - 0.5 * r2) * Math.exp(-0.4 * r2) * 1.4;
        }
    }
];

export default function Graph3DCanvas({
    width = 700,
    height = 500,
    theme = 'dark',
    equations = [],
    selectedEqId = null,
    onSelectEquation = null,
    parameters = {}
}) {
    const isDark = theme === 'dark';
    const containerRef = useRef(null);
    const svgRef = useRef(null);

    // Selected 3D surface or equation ID: 'equation_auto' | equationId | presetId
    const [selectedSourceId, setSelectedSourceId] = useState('equation_auto');
    const [showPresetDropdown, setShowPresetDropdown] = useState(false);
    const [renderStyle, setRenderStyle] = useState('shaded'); // 'shaded' | 'wireframe' | 'both'
    const [colorMap, setColorMap] = useState('viridis'); // 'viridis' | 'coolwarm' | 'neon' | 'sunset'

    // 3D rotation & scale state
    const [rotX, setRotX] = useState(30);  // Pitch (tilt up/down)
    const [rotY, setRotY] = useState(45);  // Yaw (turn left/right)
    const [zoom, setZoom] = useState(1.1);

    // Auto-spin animation
    const [isAutoSpinning, setIsAutoSpinning] = useState(false);
    const animRef = useRef(null);

    // Drag tracking
    const [isDragging, setIsDragging] = useState(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    // Sync when selectedEqId changes from sidebar
    useEffect(() => {
        if (selectedEqId && selectedSourceId !== selectedEqId) {
            setSelectedSourceId(selectedEqId);
        }
    }, [selectedEqId]);

    // Active 3D surface function: supports real user equations AND presets
    const activeSurface = useMemo(() => {
        // 1. Check if user explicitly picked a 3D preset
        const preset = SURFACE_3D_PRESETS.find(p => p.id === selectedSourceId);
        if (preset) {
            return {
                type: 'preset',
                id: preset.id,
                name: preset.name,
                formula: preset.formula,
                xRange: preset.xRange,
                yRange: preset.yRange,
                fn: preset.fn
            };
        }

        // 2. Otherwise find the target equation
        let targetEq = null;
        if (selectedSourceId && selectedSourceId !== 'equation_auto') {
            targetEq = equations.find(e => e.id === selectedSourceId);
        }
        if (!targetEq && selectedEqId) {
            targetEq = equations.find(e => e.id === selectedEqId);
        }
        if (!targetEq && equations.length > 0) {
            targetEq = equations.find(e => e.compiled || (e.parsed && !e.parsed.error)) || equations[0];
        }

        if (targetEq) {
            let fn = targetEq.compiled;
            let formula = targetEq.parsed?.expression || targetEq.raw || 'Custom Function';

            if (!fn) {
                try {
                    const cleanRaw = (targetEq.raw || '').replace(/^(z|y|[a-zA-Z]\([xy, ]+\))\s*=\s*/i, '').trim();
                    if (cleanRaw) {
                        fn = compileExpression(cleanRaw);
                        formula = cleanRaw;
                    }
                } catch {}
            }

            if (fn) {
                return {
                    type: 'equation',
                    id: targetEq.id,
                    name: targetEq.raw || 'User Equation',
                    formula: formula,
                    xRange: [-4, 4],
                    yRange: [-4, 4],
                    color: targetEq.color,
                    fn: (x, y) => {
                        try {
                            const val = fn({ x, y }, parameters);
                            return (typeof val === 'number' && isFinite(val)) ? val : 0;
                        } catch {
                            return 0;
                        }
                    }
                };
            }
        }

        // 3. Fallback to default preset (Ripple)
        const fallback = SURFACE_3D_PRESETS[0];
        return {
            type: 'preset',
            id: fallback.id,
            name: fallback.name,
            formula: fallback.formula,
            xRange: fallback.xRange,
            yRange: fallback.yRange,
            fn: fallback.fn
        };
    }, [selectedSourceId, selectedEqId, equations, parameters]);

    // Auto-spin loop
    useEffect(() => {
        if (!isAutoSpinning) {
            if (animRef.current) cancelAnimationFrame(animRef.current);
            return;
        }

        let lastT = performance.now();
        const spin = (t) => {
            const dt = (t - lastT) / 1000;
            lastT = t;
            setRotY(prev => (prev + dt * 25) % 360);
            animRef.current = requestAnimationFrame(spin);
        };
        animRef.current = requestAnimationFrame(spin);
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [isAutoSpinning]);

    // Generate 3D surface mesh vertices and faces with adaptive height scaling
    const meshData = useMemo(() => {
        const gridSteps = 24; // 24x24 facets = 576 quads for smooth 60fps SVG rendering
        const [xMin, xMax] = activeSurface.xRange || [-4, 4];
        const [yMin, yMax] = activeSurface.yRange || [-4, 4];
        const dx = (xMax - xMin) / gridSteps;
        const dy = (yMax - yMin) / gridSteps;

        const rawGrid = [];
        let minZ = Infinity;
        let maxZ = -Infinity;

        // Sample raw values
        for (let j = 0; j <= gridSteps; j++) {
            const y = yMin + j * dy;
            const row = [];
            for (let i = 0; i <= gridSteps; i++) {
                const x = xMin + i * dx;
                let z = 0;
                try {
                    z = activeSurface.fn(x, y);
                    if (!isFinite(z) || isNaN(z)) z = 0;
                } catch {
                    z = 0;
                }
                // Cap extreme singularities
                z = Math.max(-50, Math.min(50, z));
                if (z < minZ) minZ = z;
                if (z > maxZ) maxZ = z;
                row.push({ x, y, rawZ: z });
            }
            rawGrid.push(row);
        }

        if (!isFinite(minZ)) minZ = -1;
        if (!isFinite(maxZ)) maxZ = 1;
        if (minZ === maxZ) {
            minZ -= 1;
            maxZ += 1;
        }

        const zSpan = maxZ - minZ;
        const xySpan = Math.max(xMax - xMin, yMax - yMin);
        // Vertical ceiling ~4.5 units in 3D world space
        const maxSpan = xySpan * 0.65;
        const zScale = (zSpan > maxSpan && zSpan > 0) ? (maxSpan / zSpan) : 1;
        const zCenter = (minZ + maxZ) / 2;

        const vertices = [];
        for (let j = 0; j <= gridSteps; j++) {
            for (let i = 0; i <= gridSteps; i++) {
                const pt = rawGrid[j][i];
                // Center and scale Z for balanced rendering
                const scaledZ = (pt.rawZ - zCenter) * zScale;
                vertices.push({
                    x: pt.x,
                    y: pt.y,
                    z: scaledZ,
                    rawZ: pt.rawZ
                });
            }
        }

        // Construct quad faces
        const faces = [];
        for (let j = 0; j < gridSteps; j++) {
            for (let i = 0; i < gridSteps; i++) {
                const row1 = j * (gridSteps + 1);
                const row2 = (j + 1) * (gridSteps + 1);
                const i0 = row1 + i;
                const i1 = row1 + i + 1;
                const i2 = row2 + i + 1;
                const i3 = row2 + i;

                const avgRawZ = (vertices[i0].rawZ + vertices[i1].rawZ + vertices[i2].rawZ + vertices[i3].rawZ) / 4;
                const normZ = Math.max(0, Math.min(1, (avgRawZ - minZ) / (zSpan || 1)));

                faces.push({
                    indices: [i0, i1, i2, i3],
                    avgZ: (vertices[i0].z + vertices[i1].z + vertices[i2].z + vertices[i3].z) / 4,
                    normZ
                });
            }
        }

        const floorZ = (minZ - zCenter) * zScale;
        return { vertices, faces, minZ, maxZ, floorZ };
    }, [activeSurface]);

    // Color gradient interpolation
    const getZColor = useCallback((normZ, lighting = 1) => {
        const t = Math.max(0, Math.min(1, normZ));
        let r = 0, g = 0, b = 0;

        if (colorMap === 'viridis') {
            r = Math.round(68 + 180 * t);
            g = Math.round(1 + 220 * Math.sin(t * Math.PI));
            b = Math.round(84 + 170 * (1 - t));
        } else if (colorMap === 'coolwarm') {
            if (t < 0.5) {
                const sub = t * 2;
                r = Math.round(59 + 180 * sub);
                g = Math.round(130 + 110 * sub);
                b = Math.round(246 + 9 * (1 - sub));
            } else {
                const sub = (t - 0.5) * 2;
                r = Math.round(239 + 16 * sub);
                g = Math.round(240 * (1 - sub * 0.8));
                b = Math.round(240 * (1 - sub * 0.8));
            }
        } else if (colorMap === 'sunset') {
            r = Math.round(99 + 156 * t);
            g = Math.round(102 * (1 - t) + 180 * t);
            b = Math.round(241 * (1 - t) + 20 * t);
        } else {
            r = Math.round(16 + 239 * t);
            g = Math.round(185 * Math.sin(t * Math.PI));
            b = Math.round(250 * (1 - t * 0.7));
        }

        // Apply directional lighting
        const diffuse = Math.max(0.4, Math.min(1.2, lighting));
        r = Math.min(255, Math.max(0, Math.round(r * diffuse)));
        g = Math.min(255, Math.max(0, Math.round(g * diffuse)));
        b = Math.min(255, Math.max(0, Math.round(b * diffuse)));

        return `rgb(${r}, ${g}, ${b})`;
    }, [colorMap]);

    // 3D Projection Math
    const projectedData = useMemo(() => {
        const radX = (rotX * Math.PI) / 180;
        const radY = (rotY * Math.PI) / 180;
        const cosX = Math.cos(radX), sinX = Math.sin(radX);
        const cosY = Math.cos(radY), sinY = Math.sin(radY);

        const cx = width / 2;
        const cy = height / 2;
        const baseScale = Math.min(width, height) * 0.16 * zoom;

        // Transform vertex
        const transformPoint = (x, y, z) => {
            const x1 = x * cosY - y * sinY;
            const y1 = x * sinY + y * cosY;
            const z1 = z;

            const x2 = x1;
            const y2 = y1 * cosX - z1 * sinX;
            const z2 = y1 * sinX + z1 * cosX;

            const sx = cx + x2 * baseScale;
            const sy = cy - y2 * baseScale; // Y is up
            return { sx, sy, depth: z2, x, y, z };
        };

        const projVertices = meshData.vertices.map(v => transformPoint(v.x, v.y, v.z));

        // Light direction for directional shading
        const lx = 0.5, ly = 0.7, lz = 0.6;
        const lightLen = Math.hypot(lx, ly, lz) || 1;
        const nlx = lx / lightLen, nly = ly / lightLen, nlz = lz / lightLen;

        // Project and sort faces by depth (back to front)
        const sortedFaces = meshData.faces.map((f, fIdx) => {
            const v0 = projVertices[f.indices[0]];
            const v1 = projVertices[f.indices[1]];
            const v2 = projVertices[f.indices[2]];
            const v3 = projVertices[f.indices[3]];

            const avgDepth = (v0.depth + v1.depth + v2.depth + v3.depth) / 4;

            // Compute face normal in world space for lighting
            const ax = v1.x - v0.x, ay = v1.y - v0.y, az = v1.z - v0.z;
            const bx = v3.x - v0.x, by = v3.y - v0.y, bz = v3.z - v0.z;
            const nx = ay * bz - az * by;
            const ny = az * bx - ax * bz;
            const nz = ax * by - ay * bx;
            const nLen = Math.hypot(nx, ny, nz) || 1;
            const lighting = 0.5 + 0.5 * Math.abs((nx * nlx + ny * nly + nz * nlz) / nLen);

            const path = `M ${v0.sx.toFixed(1)} ${v0.sy.toFixed(1)} L ${v1.sx.toFixed(1)} ${v1.sy.toFixed(1)} L ${v2.sx.toFixed(1)} ${v2.sy.toFixed(1)} L ${v3.sx.toFixed(1)} ${v3.sy.toFixed(1)} Z`;

            return {
                fIdx,
                path,
                avgDepth,
                normZ: f.normZ,
                lighting
            };
        }).sort((a, b) => a.avgDepth - b.avgDepth);

        // 3D Coordinate Axes (X: red, Y: green, Z: blue)
        const axisLength = 3.8;
        const origin = transformPoint(0, 0, 0);
        const axisX = transformPoint(axisLength, 0, 0);
        const axisY = transformPoint(0, axisLength, 0);
        const axisZ = transformPoint(0, 0, axisLength * 0.8);

        // Ground bounding box wireframe at floorZ
        const [xMin, xMax] = activeSurface.xRange || [-4, 4];
        const [yMin, yMax] = activeSurface.yRange || [-4, 4];
        const floorZ = meshData.floorZ;
        const floorP1 = transformPoint(xMin, yMin, floorZ);
        const floorP2 = transformPoint(xMax, yMin, floorZ);
        const floorP3 = transformPoint(xMax, yMax, floorZ);
        const floorP4 = transformPoint(xMin, yMax, floorZ);

        return {
            projVertices,
            sortedFaces,
            origin,
            axisX,
            axisY,
            axisZ,
            floorBox: [floorP1, floorP2, floorP3, floorP4]
        };
    }, [meshData, rotX, rotY, zoom, width, height, activeSurface]);

    // ─────────────────────────────────────────────────────────────────────────
    // INTERACTIVE ROTATION & DRAG HANDLERS
    // ─────────────────────────────────────────────────────────────────────────

    const handlePointerDown = (e) => {
        e.stopPropagation();
        setIsDragging(true);
        setIsAutoSpinning(false);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        e.stopPropagation();
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        setRotY(prev => (prev + dx * 0.6) % 360);
        setRotX(prev => Math.max(-85, Math.min(85, prev - dy * 0.6)));
    };

    const handlePointerUp = (e) => {
        setIsDragging(false);
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
    };

    const handleWheel = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        setZoom(prev => Math.max(0.4, Math.min(3.0, prev * factor)));
    };

    const setViewPreset = (view) => {
        if (view === 'iso') { setRotX(30); setRotY(45); }
        else if (view === 'top') { setRotX(85); setRotY(0); }
        else if (view === 'front') { setRotX(0); setRotY(0); }
        else if (view === 'side') { setRotX(0); setRotY(90); }
    };

    const bgColor = isDark ? '#020617' : '#ffffff';

    return (
        <div 
            ref={containerRef}
            className={`relative select-none overflow-hidden rounded-xl w-full h-full flex flex-col ${
                isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'
            }`}
            style={{ width: `${width}px`, height: `${height}px` }}
        >
            {/* Main Interactive 3D SVG Canvas */}
            <svg
                ref={svgRef}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                data-graph-canvas-svg="true"
                xmlns="http://www.w3.org/2000/svg"
                className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={handleWheel}
            >
                {/* 1. Solid Background Rect for Export & Screenshot */}
                <rect width="100%" height="100%" fill={bgColor} />

                {/* 2. Floor Bounding Grid Box */}
                {projectedData.floorBox && (
                    <polygon
                        points={`${projectedData.floorBox[0].sx},${projectedData.floorBox[0].sy} ${projectedData.floorBox[1].sx},${projectedData.floorBox[1].sy} ${projectedData.floorBox[2].sx},${projectedData.floorBox[2].sy} ${projectedData.floorBox[3].sx},${projectedData.floorBox[3].sy}`}
                        fill={isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(226, 232, 240, 0.5)'}
                        stroke={isDark ? 'rgba(71, 85, 105, 0.6)' : 'rgba(148, 163, 184, 0.7)'}
                        strokeWidth="1.2"
                        strokeDasharray="4,4"
                    />
                )}

                {/* 3. Render Depth-Sorted Surface Facets */}
                <g className="surface-facets">
                    {projectedData.sortedFaces.map((face) => {
                        const fillColor = renderStyle === 'wireframe' 
                            ? 'none' 
                            : getZColor(face.normZ, face.lighting);
                        const strokeColor = renderStyle === 'shaded' 
                            ? (isDark ? 'rgba(15, 23, 42, 0.25)' : 'rgba(255, 255, 255, 0.35)') 
                            : getZColor(face.normZ, 1.2);
                        const strokeWidth = renderStyle === 'wireframe' ? 1.2 : 0.4;

                        return (
                            <path
                                key={`f_${face.fIdx}`}
                                d={face.path}
                                fill={fillColor}
                                stroke={strokeColor}
                                strokeWidth={strokeWidth}
                                strokeLinejoin="round"
                            />
                        );
                    })}
                </g>

                {/* 4. 3D Coordinate Axes (X: Crimson, Y: Emerald, Z: Sky Blue) */}
                <g className="coordinate-axes pointer-events-none">
                    {/* X Axis */}
                    <line
                        x1={projectedData.origin.sx}
                        y1={projectedData.origin.sy}
                        x2={projectedData.axisX.sx}
                        y2={projectedData.axisX.sy}
                        stroke="#f43f5e"
                        strokeWidth="2.5"
                    />
                    <text
                        x={projectedData.axisX.sx + 6}
                        y={projectedData.axisX.sy + 4}
                        fill="#f43f5e"
                        fontWeight="bold"
                        fontSize="12"
                        fontFamily="sans-serif"
                    >
                        +X
                    </text>

                    {/* Y Axis */}
                    <line
                        x1={projectedData.origin.sx}
                        y1={projectedData.origin.sy}
                        x2={projectedData.axisY.sx}
                        y2={projectedData.axisY.sy}
                        stroke="#10b981"
                        strokeWidth="2.5"
                    />
                    <text
                        x={projectedData.axisY.sx + 6}
                        y={projectedData.axisY.sy + 4}
                        fill="#10b981"
                        fontWeight="bold"
                        fontSize="12"
                        fontFamily="sans-serif"
                    >
                        +Y
                    </text>

                    {/* Z Axis */}
                    <line
                        x1={projectedData.origin.sx}
                        y1={projectedData.origin.sy}
                        x2={projectedData.axisZ.sx}
                        y2={projectedData.axisZ.sy}
                        stroke="#0ea5e9"
                        strokeWidth="2.5"
                    />
                    <text
                        x={projectedData.axisZ.sx + 6}
                        y={projectedData.axisZ.sy - 4}
                        fill="#0ea5e9"
                        fontWeight="bold"
                        fontSize="12"
                        fontFamily="sans-serif"
                    >
                        +Z
                    </text>

                    {/* Center Origin Dot */}
                    <circle
                        cx={projectedData.origin.sx}
                        cy={projectedData.origin.sy}
                        r="3"
                        fill={isDark ? '#e2e8f0' : '#1e293b'}
                    />
                </g>
            </svg>

            {/* Floating Top Controls Bar inside 3D View */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20" onPointerDown={(e) => e.stopPropagation()}>
                {/* Surface / Equation Selector Dropdown */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowPresetDropdown(prev => !prev)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md transition ${
                            isDark 
                                ? 'bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800' 
                                : 'bg-white/95 border-slate-300 text-slate-800 hover:bg-slate-100'
                        }`}
                        title="Select Equation or 3D Surface Preset"
                    >
                        {activeSurface.type === 'equation' ? (
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: activeSurface.color || '#6366f1' }} />
                        ) : (
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                        <span className="truncate max-w-[130px]">{activeSurface.name}</span>
                        <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                    </button>

                    {showPresetDropdown && (
                        <div className={`absolute right-0 top-full mt-1.5 w-64 max-h-80 overflow-y-auto border rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-30 animate-in fade-in duration-100 ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                        }`}>
                            {/* User Equations Section */}
                            {equations.length > 0 && (
                                <>
                                    <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-b flex items-center gap-1.5 ${
                                        isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
                                    }`}>
                                        <Calculator className="w-3 h-3 text-indigo-400" />
                                        <span>Your Equations</span>
                                    </div>
                                    {equations.map((eq, idx) => {
                                        const isSelected = activeSurface.id === eq.id;
                                        return (
                                            <button
                                                key={eq.id || idx}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedSourceId(eq.id);
                                                    if (onSelectEquation) onSelectEquation(eq.id);
                                                    setShowPresetDropdown(false);
                                                }}
                                                className={`px-2 py-1.5 rounded-lg text-left flex items-center justify-between transition ${
                                                    isSelected
                                                        ? 'bg-indigo-600/20 text-indigo-400 font-semibold'
                                                        : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100')
                                                }`}
                                                title={eq.raw}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: eq.color || '#6366f1' }} />
                                                    <span className="font-mono text-xs truncate">{eq.raw || `Equation ${idx + 1}`}</span>
                                                </div>
                                                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1.5" />}
                                            </button>
                                        );
                                    })}
                                    <div className={`my-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
                                </>
                            )}

                            {/* 3D Mathematical Surface Presets Section */}
                            <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-b flex items-center gap-1.5 ${
                                isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
                            }`}>
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                <span>3D Surface Presets</span>
                            </div>
                            {SURFACE_3D_PRESETS.map((preset) => {
                                const isSelected = activeSurface.id === preset.id;
                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedSourceId(preset.id);
                                            setShowPresetDropdown(false);
                                        }}
                                        className={`px-2 py-1.5 rounded-lg text-left flex flex-col transition ${
                                            isSelected
                                                ? 'bg-amber-500/20 text-amber-400 font-semibold'
                                                : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100')
                                        }`}
                                        title={preset.description}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs">{preset.name}</span>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                                        </div>
                                        <span className="font-mono text-[10px] opacity-70 truncate">{preset.formula}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Shading / Wireframe Toggle */}
                <button
                    type="button"
                    onClick={() => setRenderStyle(prev => prev === 'shaded' ? 'wireframe' : prev === 'wireframe' ? 'both' : 'shaded')}
                    className={`p-1.5 rounded-xl border shadow-md backdrop-blur-md transition ${
                        isDark ? 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-white/95 border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                    title={`Style: ${renderStyle.toUpperCase()} (Click to toggle Shaded / Wireframe / Both)`}
                >
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                </button>

                {/* Color Palette Toggle */}
                <button
                    type="button"
                    onClick={() => {
                        const maps = ['viridis', 'coolwarm', 'sunset', 'neon'];
                        const nextIdx = (maps.indexOf(colorMap) + 1) % maps.length;
                        setColorMap(maps[nextIdx]);
                    }}
                    className={`px-2 py-1 rounded-xl border text-[11px] font-semibold capitalize shadow-md backdrop-blur-md transition ${
                        isDark ? 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-white/95 border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Change 3D Height Color Gradient (Viridis, Coolwarm, Sunset, Neon)"
                >
                    {colorMap}
                </button>

                {/* Auto-Spin Toggle */}
                <button
                    type="button"
                    onClick={() => setIsAutoSpinning(prev => !prev)}
                    className={`p-1.5 rounded-xl border shadow-md backdrop-blur-md transition ${
                        isAutoSpinning 
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                            : (isDark ? 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-white/95 border-slate-300 text-slate-700 hover:bg-slate-100')
                    }`}
                    title={isAutoSpinning ? "Pause Auto-Rotation" : "Start Auto-Rotation Spin"}
                >
                    {isAutoSpinning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
            </div>

            {/* Bottom Angle & View Orientation Quick Selector */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1 z-20" onPointerDown={(e) => e.stopPropagation()}>
                {['iso', 'top', 'front', 'side'].map(v => (
                    <button
                        key={v}
                        type="button"
                        onClick={() => setViewPreset(v)}
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase backdrop-blur-md shadow-xs transition ${
                            isDark 
                                ? 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800' 
                                : 'bg-white/90 border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                        title={`Switch to ${v.toUpperCase()} View`}
                    >
                        {v}
                    </button>
                ))}

                <button
                    type="button"
                    onClick={() => { setRotX(30); setRotY(45); setZoom(1.1); }}
                    className={`p-1 rounded-lg border backdrop-blur-md shadow-xs transition ${
                        isDark ? 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white' : 'bg-white/90 border-slate-300 text-slate-600 hover:text-black'
                    }`}
                    title="Reset 3D View Orientation"
                >
                    <RotateCcw className="w-3 h-3" />
                </button>
            </div>

            {/* Bottom-left Formula and Drag Hint Badge */}
            <div className="absolute bottom-2 left-2 flex flex-col gap-0.5 pointer-events-none z-10 font-mono text-[11px]">
                <div className={`px-2.5 py-1 rounded-lg border backdrop-blur-md shadow-xs flex items-center gap-1.5 ${
                    isDark ? 'bg-slate-900/90 border-slate-800 text-slate-200' : 'bg-white/95 border-slate-200 text-slate-800'
                }`}>
                    <span className="font-bold text-sky-400">z = </span>
                    <span className="font-semibold">{activeSurface.formula}</span>
                </div>
                <div className={`text-[10px] px-1.5 opacity-60 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Drag to rotate · Scroll to zoom
                </div>
            </div>
        </div>
    );
}
