'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
    RotateCcw, Play, Pause, Layers, Compass, 
    ZoomIn, ZoomOut, Sparkles, ChevronDown, Check, Calculator, Circle
} from 'lucide-react';
import { compileExpression, parseQuadricOrImplicit3D } from './mathParser';

// Built-in 3D mathematical surfaces and quadrics
export const SURFACE_3D_PRESETS = [
    {
        id: 'sphere',
        name: 'Sphere (3D Solid)',
        formula: 'x^2 + y^2 + z^2 = 16',
        description: 'Classic closed 3D spherical quad surface (Radius = 4)',
        quadricType: 'sphere',
        radius: 4,
        center: { x: 0, y: 0, z: 0 },
        xRange: [-4.5, 4.5],
        yRange: [-4.5, 4.5]
    },
    {
        id: 'torus',
        name: 'Torus (Donut Ring)',
        formula: '(sqrt(x^2+y^2) - 3)^2 + z^2 = 1',
        description: 'Smooth 3D toroidal ring (Major R = 3, Minor r = 1)',
        quadricType: 'torus',
        majorRadius: 3,
        minorRadius: 1,
        xRange: [-4.5, 4.5],
        yRange: [-4.5, 4.5]
    },
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

// ─────────────────────────────────────────────────────────────────────────────
// PARAMETRIC 3D GEOMETRIC MESH GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

function generateSphereMesh({ radius = 4, center = { x: 0, y: 0, z: 0 }, subType = 'full', latSteps = 26, lonSteps = 36 }) {
    const rawR = radius || 4;
    const cx = center.x || 0;
    const cy = center.y || 0;
    const cz = center.z || 0;

    // Visual framing scale: target display radius ~3.6 units
    const displayR = rawR > 4.5 ? 3.6 : (rawR < 1.8 ? 2.8 : rawR);
    const rScale = displayR / rawR;

    const vertices = [];
    let minZ = Infinity, maxZ = -Infinity;

    // Determine latitude range for full sphere vs hemisphere
    let phiMax = Math.PI;
    let phiMin = 0;
    if (subType === 'upper_hemisphere') {
        phiMax = Math.PI / 2;
    } else if (subType === 'lower_hemisphere') {
        phiMin = Math.PI / 2;
    }

    for (let j = 0; j <= latSteps; j++) {
        const phi = phiMin + (j / latSteps) * (phiMax - phiMin);
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        for (let i = 0; i <= lonSteps; i++) {
            const theta = (i / lonSteps) * 2 * Math.PI;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            // Unit outward normal
            const nx = sinPhi * cosTheta;
            const ny = sinPhi * sinTheta;
            const nz = cosPhi;

            const rawZ = cz + rawR * nz;
            if (rawZ < minZ) minZ = rawZ;
            if (rawZ > maxZ) maxZ = rawZ;

            vertices.push({
                x: cx * rScale + displayR * nx,
                y: cy * rScale + displayR * ny,
                z: cz * rScale + displayR * nz,
                rawZ,
                nx, ny, nz
            });
        }
    }

    const zSpan = maxZ - minZ || 1;
    const faces = [];

    for (let j = 0; j < latSteps; j++) {
        for (let i = 0; i < lonSteps; i++) {
            const row1 = j * (lonSteps + 1);
            const row2 = (j + 1) * (lonSteps + 1);
            const i0 = row1 + i;
            const i1 = row1 + i + 1;
            const i2 = row2 + i + 1;
            const i3 = row2 + i;

            const v0 = vertices[i0], v1 = vertices[i1], v2 = vertices[i2], v3 = vertices[i3];
            const avgRawZ = (v0.rawZ + v1.rawZ + v2.rawZ + v3.rawZ) / 4;
            const normZ = Math.max(0, Math.min(1, (avgRawZ - minZ) / zSpan));

            faces.push({
                indices: [i0, i1, i2, i3],
                avgZ: (v0.z + v1.z + v2.z + v3.z) / 4,
                normZ,
                normal: {
                    nx: (v0.nx + v1.nx + v2.nx + v3.nx) / 4,
                    ny: (v0.ny + v1.ny + v2.ny + v3.ny) / 4,
                    nz: (v0.nz + v1.nz + v2.nz + v3.nz) / 4
                }
            });
        }
    }

    const floorZ = -displayR * 1.15;
    const bounds = displayR * 1.25;
    return {
        vertices,
        faces,
        minZ,
        maxZ,
        floorZ,
        xRange: [-bounds, bounds],
        yRange: [-bounds, bounds],
        maxDimension: displayR
    };
}

function generateEllipsoidMesh({ radii = { x: 3, y: 2, z: 4 }, center = { x: 0, y: 0, z: 0 }, latSteps = 26, lonSteps = 36 }) {
    const { x: rx = 3, y: ry = 2, z: rz = 4 } = radii;
    const { x: cx = 0, y: cy = 0, z: cz = 0 } = center;

    const maxR = Math.max(rx, ry, rz);
    const scale = maxR > 4.5 ? (3.6 / maxR) : (maxR < 1.8 ? (2.8 / maxR) : 1);

    const drx = rx * scale, dry = ry * scale, drz = rz * scale;
    const vertices = [];
    let minZ = Infinity, maxZ = -Infinity;

    for (let j = 0; j <= latSteps; j++) {
        const phi = (j / latSteps) * Math.PI;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        for (let i = 0; i <= lonSteps; i++) {
            const theta = (i / lonSteps) * 2 * Math.PI;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            const nx = (sinPhi * cosTheta) / (rx || 1);
            const ny = (sinPhi * sinTheta) / (ry || 1);
            const nz = cosPhi / (rz || 1);
            const nLen = Math.hypot(nx, ny, nz) || 1;

            const rawZ = cz + rz * cosPhi;
            if (rawZ < minZ) minZ = rawZ;
            if (rawZ > maxZ) maxZ = rawZ;

            vertices.push({
                x: cx * scale + drx * sinPhi * cosTheta,
                y: cy * scale + dry * sinPhi * sinTheta,
                z: cz * scale + drz * cosPhi,
                rawZ,
                nx: nx / nLen,
                ny: ny / nLen,
                nz: nz / nLen
            });
        }
    }

    const zSpan = maxZ - minZ || 1;
    const faces = [];

    for (let j = 0; j < latSteps; j++) {
        for (let i = 0; i < lonSteps; i++) {
            const row1 = j * (lonSteps + 1);
            const row2 = (j + 1) * (lonSteps + 1);
            const i0 = row1 + i;
            const i1 = row1 + i + 1;
            const i2 = row2 + i + 1;
            const i3 = row2 + i;

            const v0 = vertices[i0], v1 = vertices[i1], v2 = vertices[i2], v3 = vertices[i3];
            const avgRawZ = (v0.rawZ + v1.rawZ + v2.rawZ + v3.rawZ) / 4;
            const normZ = Math.max(0, Math.min(1, (avgRawZ - minZ) / zSpan));

            faces.push({
                indices: [i0, i1, i2, i3],
                avgZ: (v0.z + v1.z + v2.z + v3.z) / 4,
                normZ,
                normal: {
                    nx: (v0.nx + v1.nx + v2.nx + v3.nx) / 4,
                    ny: (v0.ny + v1.ny + v2.ny + v3.ny) / 4,
                    nz: (v0.nz + v1.nz + v2.nz + v3.nz) / 4
                }
            });
        }
    }

    const bounds = Math.max(drx, dry) * 1.25;
    return {
        vertices,
        faces,
        minZ,
        maxZ,
        floorZ: -drz * 1.15,
        xRange: [-bounds, bounds],
        yRange: [-bounds, bounds],
        maxDimension: Math.max(drx, dry, drz)
    };
}

function generateTorusMesh({ majorRadius = 3, minorRadius = 1, uSteps = 32, vSteps = 24 }) {
    const R = majorRadius || 3;
    const r = minorRadius || 1;

    const maxDim = R + r;
    const scale = maxDim > 4.5 ? (3.6 / maxDim) : 1;
    const dR = R * scale;
    const dr = r * scale;

    const vertices = [];
    const minZ = -r, maxZ = r;

    for (let j = 0; j <= uSteps; j++) {
        const u = (j / uSteps) * 2 * Math.PI;
        const cosU = Math.cos(u), sinU = Math.sin(u);

        for (let i = 0; i <= vSteps; i++) {
            const v = (i / vSteps) * 2 * Math.PI;
            const cosV = Math.cos(v), sinV = Math.sin(v);

            const x = (dR + dr * cosV) * cosU;
            const y = (dR + dr * cosV) * sinU;
            const z = dr * sinV;

            const nx = cosV * cosU;
            const ny = cosV * sinU;
            const nz = sinV;

            vertices.push({ x, y, z, rawZ: r * sinV, nx, ny, nz });
        }
    }

    const zSpan = 2 * r || 1;
    const faces = [];

    for (let j = 0; j < uSteps; j++) {
        for (let i = 0; i < vSteps; i++) {
            const row1 = j * (vSteps + 1);
            const row2 = (j + 1) * (vSteps + 1);
            const i0 = row1 + i;
            const i1 = row1 + i + 1;
            const i2 = row2 + i + 1;
            const i3 = row2 + i;

            const v0 = vertices[i0], v1 = vertices[i1], v2 = vertices[i2], v3 = vertices[i3];
            const avgRawZ = (v0.rawZ + v1.rawZ + v2.rawZ + v3.rawZ) / 4;
            const normZ = Math.max(0, Math.min(1, (avgRawZ - minZ) / zSpan));

            faces.push({
                indices: [i0, i1, i2, i3],
                avgZ: (v0.z + v1.z + v2.z + v3.z) / 4,
                normZ,
                normal: {
                    nx: (v0.nx + v1.nx + v2.nx + v3.nx) / 4,
                    ny: (v0.ny + v1.ny + v2.ny + v3.ny) / 4,
                    nz: (v0.nz + v1.nz + v2.nz + v3.nz) / 4
                }
            });
        }
    }

    const bounds = (dR + dr) * 1.15;
    return {
        vertices,
        faces,
        minZ,
        maxZ,
        floorZ: -dr * 1.4,
        xRange: [-bounds, bounds],
        yRange: [-bounds, bounds],
        maxDimension: dR + dr
    };
}

function generateCylinderMesh({ radius = 3, height = 6, radialSteps = 32, heightSteps = 16 }) {
    const R = radius || 3;
    const H = height || (R * 2);

    const maxDim = Math.max(R, H / 2);
    const scale = maxDim > 4.5 ? (3.6 / maxDim) : 1;
    const dR = R * scale;
    const dH = H * scale;

    const vertices = [];
    const minZ = -dH / 2, maxZ = dH / 2;

    for (let j = 0; j <= heightSteps; j++) {
        const z = -dH / 2 + (j / heightSteps) * dH;
        for (let i = 0; i <= radialSteps; i++) {
            const theta = (i / radialSteps) * 2 * Math.PI;
            const cosT = Math.cos(theta), sinT = Math.sin(theta);
            vertices.push({
                x: dR * cosT,
                y: dR * sinT,
                z,
                rawZ: z / scale,
                nx: cosT,
                ny: sinT,
                nz: 0
            });
        }
    }

    const faces = [];
    for (let j = 0; j < heightSteps; j++) {
        for (let i = 0; i < radialSteps; i++) {
            const row1 = j * (radialSteps + 1);
            const row2 = (j + 1) * (radialSteps + 1);
            const i0 = row1 + i;
            const i1 = row1 + i + 1;
            const i2 = row2 + i + 1;
            const i3 = row2 + i;

            const v0 = vertices[i0], v1 = vertices[i1], v2 = vertices[i2], v3 = vertices[i3];
            const avgRawZ = (v0.rawZ + v1.rawZ + v2.rawZ + v3.rawZ) / 4;
            const normZ = Math.max(0, Math.min(1, (avgRawZ - (-H / 2)) / H));

            faces.push({
                indices: [i0, i1, i2, i3],
                avgZ: (v0.z + v1.z + v2.z + v3.z) / 4,
                normZ,
                normal: {
                    nx: (v0.nx + v1.nx + v2.nx + v3.nx) / 4,
                    ny: (v0.ny + v1.ny + v2.ny + v3.ny) / 4,
                    nz: 0
                }
            });
        }
    }

    const bounds = dR * 1.35;
    return {
        vertices,
        faces,
        minZ: -H / 2,
        maxZ: H / 2,
        floorZ: -dH / 2 * 1.1,
        xRange: [-bounds, bounds],
        yRange: [-bounds, bounds],
        maxDimension: maxDim * scale
    };
}

function generateConeMesh({ radius = 3, height = 5, radialSteps = 32, heightSteps = 16 }) {
    const R = radius || 3;
    const H = height || 5;
    const maxDim = Math.max(R, H / 2);
    const scale = maxDim > 4.5 ? (3.6 / maxDim) : 1;
    const dR = R * scale;
    const dH = H * scale;

    const vertices = [];
    for (let j = 0; j <= heightSteps; j++) {
        const u = j / heightSteps;
        const z = -dH / 2 + u * dH;
        // Cone tapers from base to apex
        const ringR = dR * (1 - u);

        for (let i = 0; i <= radialSteps; i++) {
            const theta = (i / radialSteps) * 2 * Math.PI;
            const cosT = Math.cos(theta), sinT = Math.sin(theta);
            vertices.push({
                x: ringR * cosT,
                y: ringR * sinT,
                z,
                rawZ: z / scale,
                nx: cosT,
                ny: sinT,
                nz: dR / dH
            });
        }
    }

    const faces = [];
    for (let j = 0; j < heightSteps; j++) {
        for (let i = 0; i < radialSteps; i++) {
            const row1 = j * (radialSteps + 1);
            const row2 = (j + 1) * (radialSteps + 1);
            const i0 = row1 + i;
            const i1 = row1 + i + 1;
            const i2 = row2 + i + 1;
            const i3 = row2 + i;

            const v0 = vertices[i0], v1 = vertices[i1], v2 = vertices[i2], v3 = vertices[i3];
            const avgRawZ = (v0.rawZ + v1.rawZ + v2.rawZ + v3.rawZ) / 4;
            const normZ = Math.max(0, Math.min(1, (avgRawZ - (-H / 2)) / H));

            faces.push({
                indices: [i0, i1, i2, i3],
                avgZ: (v0.z + v1.z + v2.z + v3.z) / 4,
                normZ,
                normal: {
                    nx: (v0.nx + v1.nx + v2.nx + v3.nx) / 4,
                    ny: (v0.ny + v1.ny + v2.ny + v3.ny) / 4,
                    nz: dR / dH
                }
            });
        }
    }

    const bounds = dR * 1.35;
    return {
        vertices,
        faces,
        minZ: -H / 2,
        maxZ: H / 2,
        floorZ: -dH / 2 * 1.1,
        xRange: [-bounds, bounds],
        yRange: [-bounds, bounds],
        maxDimension: maxDim * scale
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: COLOR WITH DIRECTIONAL LIGHTING AND SHADING
// ─────────────────────────────────────────────────────────────────────────────

function hexToRgbaShaded(hex, lighting = 1, alpha = 0.82) {
    if (!hex) return `rgba(59, 130, 246, ${alpha})`;
    let c = hex.replace('#', '');
    if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    const num = parseInt(c, 16);
    if (isNaN(num)) return `rgba(59, 130, 246, ${alpha})`;
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;
    const diffuse = Math.max(0.35, Math.min(1.4, lighting));
    r = Math.min(255, Math.max(0, Math.round(r * diffuse)));
    g = Math.min(255, Math.max(0, Math.round(g * diffuse)));
    b = Math.min(255, Math.max(0, Math.round(b * diffuse)));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE 3D SURFACE MESH GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

function generateSingleSurfaceMesh(surface) {
    if (surface.type === 'quadric' && surface.quadric) {
        const q = surface.quadric;
        if (q.type === 'sphere') {
            return generateSphereMesh({
                radius: q.radius || 4,
                center: q.center || { x: 0, y: 0, z: 0 },
                subType: q.subType || 'full'
            });
        }
        if (q.type === 'ellipsoid') {
            return generateEllipsoidMesh({
                radii: q.radii || { x: 3, y: 2, z: 4 },
                center: q.center || { x: 0, y: 0, z: 0 }
            });
        }
        if (q.type === 'torus') {
            return generateTorusMesh({
                majorRadius: q.majorRadius || 3,
                minorRadius: q.minorRadius || 1
            });
        }
        if (q.type === 'cylinder') {
            return generateCylinderMesh({
                radius: q.radius || 3,
                height: q.height || 6
            });
        }
        if (q.type === 'cone') {
            return generateConeMesh({
                radius: 3,
                height: 5
            });
        }
    }

    const gridSteps = 24;
    const [xMin, xMax] = surface.xRange || [-4, 4];
    const [yMin, yMax] = surface.yRange || [-4, 4];
    const dx = (xMax - xMin) / gridSteps;
    const dy = (yMax - yMin) / gridSteps;

    const rawGrid = [];
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (let j = 0; j <= gridSteps; j++) {
        const y = yMin + j * dy;
        const row = [];
        for (let i = 0; i <= gridSteps; i++) {
            const x = xMin + i * dx;
            let z = 0;
            try {
                z = surface.fn ? surface.fn(x, y) : 0;
                if (!isFinite(z) || isNaN(z)) z = 0;
            } catch {
                z = 0;
            }
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
    const maxSpan = xySpan * 0.65;
    const zScale = (zSpan > maxSpan && zSpan > 0) ? (maxSpan / zSpan) : 1;
    const zCenter = (minZ + maxZ) / 2;

    const vertices = [];
    for (let j = 0; j <= gridSteps; j++) {
        for (let i = 0; i <= gridSteps; i++) {
            const pt = rawGrid[j][i];
            const scaledZ = (pt.rawZ - zCenter) * zScale;
            vertices.push({
                x: pt.x,
                y: pt.y,
                z: scaledZ,
                rawZ: pt.rawZ
            });
        }
    }

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
    return {
        vertices,
        faces,
        minZ,
        maxZ,
        floorZ,
        xRange: [xMin, xMax],
        yRange: [yMin, yMax],
        maxDimension: Math.max(xySpan / 2, (maxSpan || 2))
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D INTERSECTION CURVE EXTRACTION BETWEEN TWO SURFACES
// ─────────────────────────────────────────────────────────────────────────────

function extractIntersectionCurvesBetween(s1, s2) {
    const isSphere1 = s1.type === 'quadric' && s1.quadric?.type === 'sphere';
    const isSphere2 = s2.type === 'quadric' && s2.quadric?.type === 'sphere';

    const getZValues = (s, x, y) => {
        if (s.type === 'quadric' && s.quadric?.type === 'sphere') {
            const r = s.quadric.radius || 4;
            const cx = s.quadric.center?.x || 0;
            const cy = s.quadric.center?.y || 0;
            const cz = s.quadric.center?.z || 0;
            const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
            if (d2 <= r * r) {
                const h = Math.sqrt(Math.max(0, r * r - d2));
                return { top: cz + h, bot: cz - h, isSphere: true, valid: true };
            }
            return { valid: false };
        }
        if (s.type === 'quadric' && s.quadric?.type === 'cylinder') {
            return { valid: false };
        }
        if (s.fn) {
            try {
                const z = s.fn(x, y);
                if (isFinite(z)) {
                    return { top: z, bot: z, isSphere: false, valid: true };
                }
            } catch {}
        }
        return { valid: false };
    };

    // Case A: Sphere + Constant Plane z = c
    let sphere = isSphere1 ? s1 : (isSphere2 ? s2 : null);
    let other = isSphere1 ? s2 : (isSphere2 ? s1 : null);

    if (sphere && other && other.fn) {
        const z0 = other.fn(0, 0);
        const z1 = other.fn(2, 2);
        const z2 = other.fn(-2, 1);
        if (Math.abs(z0 - z1) < 1e-4 && Math.abs(z0 - z2) < 1e-4) {
            const c = z0;
            const R = sphere.quadric.radius || 4;
            const cz = sphere.quadric.center?.z || 0;
            const cx = sphere.quadric.center?.x || 0;
            const cy = sphere.quadric.center?.y || 0;
            const d = Math.abs(c - cz);
            if (d < R) {
                const rInt = Math.sqrt(R * R - d * d);
                const steps = 64;
                const points = [];
                const segments = [];
                for (let i = 0; i <= steps; i++) {
                    const theta = (i / steps) * 2 * Math.PI;
                    points.push({
                        x: cx + rInt * Math.cos(theta),
                        y: cy + rInt * Math.sin(theta),
                        z: c
                    });
                }
                for (let i = 0; i < points.length - 1; i++) {
                    segments.push({ p1: points[i], p2: points[i + 1] });
                }
                return {
                    id: `inter_${s1.id}_${s2.id}`,
                    name: `${s1.name} ∩ ${s2.name}`,
                    formula: `C(t): r(t) = ⟨${rInt.toFixed(2)}·cos(t), ${rInt.toFixed(2)}·sin(t), ${c.toFixed(2)}⟩`,
                    systemFormula: `{ ${s1.formula || s1.name}, ${s2.formula || s2.name} }`,
                    segments,
                    points,
                    pointCount: points.length,
                    type: 'circle'
                };
            }
        }
    }

    // Case B: General Surface Intersection via Marching Squares on Difference Field
    const gridN = 44;
    const xMin = -4, xMax = 4;
    const yMin = -4, yMax = 4;
    const dx = (xMax - xMin) / gridN;
    const dy = (yMax - yMin) / gridN;

    const segments = [];
    const points = [];

    const testSheetPair = (sheetA, sheetB) => {
        const diffGrid = [];
        for (let j = 0; j <= gridN; j++) {
            const y = yMin + j * dy;
            const row = [];
            for (let i = 0; i <= gridN; i++) {
                const x = xMin + i * dx;
                const vA = getZValues(s1, x, y);
                const vB = getZValues(s2, x, y);
                if (vA.valid && vB.valid) {
                    const zA = sheetA === 'top' ? vA.top : vA.bot;
                    const zB = sheetB === 'top' ? vB.top : vB.bot;
                    row.push({ diff: zA - zB, zA, zB, valid: true });
                } else {
                    row.push({ valid: false });
                }
            }
            diffGrid.push(row);
        }

        for (let j = 0; j < gridN; j++) {
            for (let i = 0; i < gridN; i++) {
                const c00 = diffGrid[j][i];
                const c10 = diffGrid[j][i + 1];
                const c11 = diffGrid[j + 1][i + 1];
                const c01 = diffGrid[j + 1][i];

                if (!c00.valid || !c10.valid || !c11.valid || !c01.valid) continue;

                const v0 = c00.diff, v1 = c10.diff, v2 = c11.diff, v3 = c01.diff;
                const b0 = v0 > 0 ? 1 : 0;
                const b1 = v1 > 0 ? 2 : 0;
                const b2 = v2 > 0 ? 4 : 0;
                const b3 = v3 > 0 ? 8 : 0;
                const mask = b0 | b1 | b2 | b3;

                if (mask === 0 || mask === 15) continue;

                const x0 = xMin + i * dx, x1 = x0 + dx;
                const y0 = yMin + j * dy, y1 = y0 + dy;

                const interpPt = (xa, ya, va, za, xb, yb, vb, zb) => {
                    const denom = vb - va;
                    const t = Math.abs(denom) < 1e-12 ? 0.5 : Math.max(0, Math.min(1, -va / denom));
                    const x = xa + t * (xb - xa);
                    const y = ya + t * (yb - ya);
                    const z = za + t * (zb - za);
                    return { x, y, z };
                };

                const edgeB = () => interpPt(x0, y0, v0, (c00.zA + c00.zB) / 2, x1, y0, v1, (c10.zA + c10.zB) / 2);
                const edgeR = () => interpPt(x1, y0, v1, (c10.zA + c10.zB) / 2, x1, y1, v2, (c11.zA + c11.zB) / 2);
                const edgeT = () => interpPt(x0, y1, v3, (c01.zA + c01.zB) / 2, x1, y1, v2, (c11.zA + c11.zB) / 2);
                const edgeL = () => interpPt(x0, y0, v0, (c00.zA + c00.zB) / 2, x0, y1, v3, (c01.zA + c01.zB) / 2);

                const addSeg = (pA, pB) => {
                    segments.push({ p1: pA, p2: pB });
                    points.push(pA);
                };

                switch (mask) {
                    case 1: case 14: addSeg(edgeL(), edgeB()); break;
                    case 2: case 13: addSeg(edgeB(), edgeR()); break;
                    case 3: case 12: addSeg(edgeL(), edgeR()); break;
                    case 4: case 11: addSeg(edgeR(), edgeT()); break;
                    case 5: addSeg(edgeL(), edgeT()); addSeg(edgeB(), edgeR()); break;
                    case 10: addSeg(edgeL(), edgeB()); addSeg(edgeT(), edgeR()); break;
                    case 6: case 9: addSeg(edgeB(), edgeT()); break;
                    case 7: case 8: addSeg(edgeL(), edgeT()); break;
                }
            }
        }
    };

    testSheetPair('top', 'top');
    if (isSphere1 || isSphere2) {
        testSheetPair('bot', 'top');
    }

    if (segments.length === 0) return null;

    return {
        id: `inter_${s1.id}_${s2.id}`,
        name: `${s1.name} ∩ ${s2.name}`,
        formula: `C: { z = f₁(x, y), f₁(x, y) = f₂(x, y) }`,
        systemFormula: `{ ${s1.formula || s1.name}, ${s2.formula || s2.name} }`,
        segments,
        points: points.filter((_, idx) => idx % 4 === 0),
        pointCount: segments.length * 2,
        type: 'contour'
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GRAPH 3D CANVAS COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Graph3DCanvas({
    width = 700,
    height = 500,
    theme = 'dark',
    equations = [],
    selectedEqId = null,
    onSelectEquation = null,
    parameters = {},
    showIntersections = true,
    onShowZoomMessage = null
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

    // Momentary zoom HUD banner
    const [zoomMessage, setZoomMessage] = useState(null);
    const zoomTimerRef = useRef(null);
    const triggerZoomMessage = useCallback((msg) => {
        setZoomMessage(msg);
        if (onShowZoomMessage) onShowZoomMessage(msg);
        if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
        zoomTimerRef.current = setTimeout(() => setZoomMessage(null), 800);
    }, [onShowZoomMessage]);

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

    // ─────────────────────────────────────────────────────────────────────────
    // SIMULTANEOUS MULTI-SURFACE EXTRACTION
    // ─────────────────────────────────────────────────────────────────────────
    const visibleSurfaces = useMemo(() => {
        // 1. If user explicitly picked a preset from dropdown
        const preset = SURFACE_3D_PRESETS.find(p => p.id === selectedSourceId);
        if (preset) {
            let presetSurf;
            if (preset.quadricType === 'sphere') {
                presetSurf = {
                    type: 'quadric',
                    id: preset.id,
                    name: preset.name,
                    formula: preset.formula,
                    quadric: {
                        type: 'sphere',
                        name: preset.name,
                        formula: preset.formula,
                        radius: preset.radius || 4,
                        center: { x: 0, y: 0, z: 0 }
                    },
                    xRange: preset.xRange,
                    yRange: preset.yRange,
                    color: '#38bdf8'
                };
            } else if (preset.quadricType === 'torus') {
                presetSurf = {
                    type: 'quadric',
                    id: preset.id,
                    name: preset.name,
                    formula: preset.formula,
                    quadric: {
                        type: 'torus',
                        name: preset.name,
                        formula: preset.formula,
                        majorRadius: preset.majorRadius || 3,
                        minorRadius: preset.minorRadius || 1
                    },
                    xRange: preset.xRange,
                    yRange: preset.yRange,
                    color: '#f59e0b'
                };
            } else {
                presetSurf = {
                    type: 'preset',
                    id: preset.id,
                    name: preset.name,
                    formula: preset.formula,
                    xRange: preset.xRange,
                    yRange: preset.yRange,
                    fn: preset.fn,
                    color: '#10b981'
                };
            }
            return [presetSurf];
        }

        // 2. Otherwise collect ALL visible equations from user's equations list
        const visEqs = equations.filter(e => e.visible !== false);
        const surfaces = [];

        visEqs.forEach((targetEq, idx) => {
            const raw = (targetEq.raw || '').trim();
            const quadric = targetEq.parsed?.quadric || parseQuadricOrImplicit3D(raw);
            if (quadric) {
                surfaces.push({
                    type: 'quadric',
                    id: targetEq.id,
                    name: raw || quadric.name,
                    formula: quadric.formula || raw,
                    quadric,
                    color: targetEq.color || '#38bdf8'
                });
                return;
            }

            let fn = targetEq.compiled;
            let formula = targetEq.parsed?.expression || raw;

            if (!fn) {
                try {
                    let cleanRaw = raw;
                    const zMatch = cleanRaw.match(/^(?:z|[a-zA-Z]\([xy, ]+\))\s*=\s*(.*)$/i);
                    if (zMatch) {
                        cleanRaw = zMatch[1];
                    } else {
                        const yMatch = cleanRaw.match(/^y\s*=\s*(.*)$/i);
                        if (yMatch) cleanRaw = yMatch[1];
                    }
                    if (cleanRaw) {
                        fn = compileExpression(cleanRaw);
                        formula = cleanRaw;
                    }
                } catch {}
            }

            if (fn) {
                surfaces.push({
                    type: 'equation',
                    id: targetEq.id,
                    name: raw || `Equation ${idx + 1}`,
                    formula: formula,
                    xRange: [-4, 4],
                    yRange: [-4, 4],
                    color: targetEq.color || '#38bdf8',
                    fn: (x, y) => {
                        try {
                            const val = fn({ x, y, z: 0 }, parameters);
                            return (typeof val === 'number' && isFinite(val)) ? val : 0;
                        } catch {
                            return 0;
                        }
                    }
                });
            }
        });

        if (surfaces.length > 0) {
            return surfaces;
        }

        // 3. Fallback to default preset (Sphere)
        const fallback = SURFACE_3D_PRESETS[0];
        return [{
            type: 'quadric',
            id: fallback.id,
            name: fallback.name,
            formula: fallback.formula,
            quadric: {
                type: 'sphere',
                name: fallback.name,
                formula: fallback.formula,
                radius: fallback.radius || 4,
                center: { x: 0, y: 0, z: 0 }
            },
            xRange: fallback.xRange,
            yRange: fallback.yRange,
            color: '#38bdf8'
        }];
    }, [selectedSourceId, equations, parameters]);

    // Active primary surface for preset dropdown label
    const primarySurface = visibleSurfaces[0] || SURFACE_3D_PRESETS[0];

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

    // Generate combined 3D surface mesh vertices and faces for all visible surfaces simultaneously
    const meshData = useMemo(() => {
        const combinedVertices = [];
        const combinedFaces = [];
        let globalMinZ = Infinity;
        let globalMaxZ = -Infinity;
        let maxDimension = 3.5;
        let floorZ = -4;

        visibleSurfaces.forEach((surf, sIdx) => {
            const singleMesh = generateSingleSurfaceMesh(surf);
            if (!singleMesh || !singleMesh.vertices.length) return;

            const vOffset = combinedVertices.length;
            singleMesh.vertices.forEach(v => {
                combinedVertices.push({
                    ...v,
                    surfaceId: surf.id,
                    surfaceIndex: sIdx
                });
            });

            singleMesh.faces.forEach((f, fIdx) => {
                combinedFaces.push({
                    indices: f.indices.map(i => i + vOffset),
                    avgZ: f.avgZ,
                    normZ: f.normZ,
                    normal: f.normal,
                    surfaceId: surf.id,
                    surfaceColor: surf.color || '#38bdf8',
                    surfaceIndex: sIdx,
                    faceId: `${surf.id || sIdx}_${fIdx}`
                });
            });

            if (singleMesh.minZ < globalMinZ) globalMinZ = singleMesh.minZ;
            if (singleMesh.maxZ > globalMaxZ) globalMaxZ = singleMesh.maxZ;
            if (singleMesh.maxDimension > maxDimension) maxDimension = singleMesh.maxDimension;
            if (singleMesh.floorZ < floorZ) floorZ = singleMesh.floorZ;
        });

        return {
            vertices: combinedVertices,
            faces: combinedFaces,
            minZ: isFinite(globalMinZ) ? globalMinZ : -4,
            maxZ: isFinite(globalMaxZ) ? globalMaxZ : 4,
            floorZ: isFinite(floorZ) ? floorZ : -4,
            maxDimension,
            isMultiSurface: visibleSurfaces.length > 1
        };
    }, [visibleSurfaces]);

    // Extract 3D intersection curves between all pairs of visible surfaces
    const intersectionCurves = useMemo(() => {
        if (!showIntersections || visibleSurfaces.length < 2) return [];
        const curves = [];
        for (let i = 0; i < visibleSurfaces.length; i++) {
            for (let j = i + 1; j < visibleSurfaces.length; j++) {
                const res = extractIntersectionCurvesBetween(visibleSurfaces[i], visibleSurfaces[j]);
                if (res && res.segments && res.segments.length > 0) {
                    curves.push(res);
                }
            }
        }
        return curves;
    }, [showIntersections, visibleSurfaces]);

    // Color gradient interpolation for single surface colormap
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
        const diffuse = Math.max(0.35, Math.min(1.3, lighting));
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

        // Project and sort faces by depth across all surfaces (back to front)
        const sortedFaces = meshData.faces.map((f, fIdx) => {
            const v0 = projVertices[f.indices[0]];
            const v1 = projVertices[f.indices[1]];
            const v2 = projVertices[f.indices[2]];
            const v3 = projVertices[f.indices[3]];

            if (!v0 || !v1 || !v2 || !v3) return null;

            const avgDepth = (v0.depth + v1.depth + v2.depth + v3.depth) / 4;

            // Compute face normal in world space for lighting
            let nx = 0, ny = 0, nz = 1;
            if (f.normal) {
                nx = f.normal.nx;
                ny = f.normal.ny;
                nz = f.normal.nz;
            } else {
                const ax = v1.x - v0.x, ay = v1.y - v0.y, az = v1.z - v0.z;
                const bx = v3.x - v0.x, by = v3.y - v0.y, bz = v3.z - v0.z;
                nx = ay * bz - az * by;
                ny = az * bx - ax * bz;
                nz = ax * by - ay * bx;
            }
            const nLen = Math.hypot(nx, ny, nz) || 1;
            const dot = (nx * nlx + ny * nly + nz * nlz) / nLen;
            const lighting = 0.5 + 0.5 * Math.abs(dot);

            const path = `M ${v0.sx.toFixed(1)} ${v0.sy.toFixed(1)} L ${v1.sx.toFixed(1)} ${v1.sy.toFixed(1)} L ${v2.sx.toFixed(1)} ${v2.sy.toFixed(1)} L ${v3.sx.toFixed(1)} ${v3.sy.toFixed(1)} Z`;

            return {
                fIdx,
                path,
                avgDepth,
                normZ: f.normZ,
                lighting,
                surfaceColor: f.surfaceColor,
                surfaceId: f.surfaceId
            };
        }).filter(Boolean).sort((a, b) => a.avgDepth - b.avgDepth);

        // Project intersection curves
        const projectedCurves = (intersectionCurves || []).map(curve => {
            const projSegs = curve.segments.map(seg => ({
                p1: transformPoint(seg.p1.x, seg.p1.y, seg.p1.z),
                p2: transformPoint(seg.p2.x, seg.p2.y, seg.p2.z)
            }));
            const projPoints = (curve.points || []).map(pt => transformPoint(pt.x, pt.y, pt.z));
            return {
                ...curve,
                projSegments: projSegs,
                projPoints
            };
        });

        // 3D Coordinate Axes (X: red, Y: green, Z: blue)
        const maxDim = meshData.maxDimension || 3.5;
        const axisLength = Math.max(3.8, maxDim * 1.35);
        const origin = transformPoint(0, 0, 0);
        const axisX = transformPoint(axisLength, 0, 0);
        const axisY = transformPoint(0, axisLength, 0);
        const axisZ = transformPoint(0, 0, axisLength * 0.9);

        // Ground bounding box wireframe at floorZ
        const floorZ = meshData.floorZ || -4;
        const floorSpan = maxDim * 1.1;
        const floorP1 = transformPoint(-floorSpan, -floorSpan, floorZ);
        const floorP2 = transformPoint(floorSpan, -floorSpan, floorZ);
        const floorP3 = transformPoint(floorSpan, floorSpan, floorZ);
        const floorP4 = transformPoint(-floorSpan, floorSpan, floorZ);

        return {
            projVertices,
            sortedFaces,
            projectedCurves,
            origin,
            axisX,
            axisY,
            axisZ,
            floorBox: [floorP1, floorP2, floorP3, floorP4]
        };
    }, [meshData, intersectionCurves, rotX, rotY, zoom, width, height]);

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
        setZoom(prev => {
            const next = Math.max(0.4, Math.min(3.0, prev * factor));
            triggerZoomMessage(`Zoom: ${Math.round(next * 100)}%`);
            return next;
        });
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

                {/* 3. Render Depth-Sorted Surface Facets (Multi-Surface Translucency & Shading) */}
                <g className="surface-facets">
                    {projectedData.sortedFaces.map((face) => {
                        let fillColor;
                        if (renderStyle === 'wireframe') {
                            fillColor = 'none';
                        } else if (meshData.isMultiSurface) {
                            fillColor = hexToRgbaShaded(face.surfaceColor, face.lighting, 0.82);
                        } else {
                            fillColor = getZColor(face.normZ, face.lighting);
                        }

                        const strokeColor = renderStyle === 'shaded' 
                            ? (isDark ? 'rgba(15, 23, 42, 0.25)' : 'rgba(255, 255, 255, 0.35)') 
                            : (meshData.isMultiSurface ? face.surfaceColor : getZColor(face.normZ, 1.2));
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

                {/* 4. 3D Intersection Space Curves (Highlighted 3D Space Curve) */}
                {showIntersections && projectedData.projectedCurves?.map((curve) => (
                    <g key={curve.id} className="intersection-space-curve pointer-events-none">
                        {/* Glow halo */}
                        {curve.projSegments.map((seg, sIdx) => (
                            <line
                                key={`halo_${sIdx}`}
                                x1={seg.p1.sx}
                                y1={seg.p1.sy}
                                x2={seg.p2.sx}
                                y2={seg.p2.sy}
                                stroke="#eab308"
                                strokeWidth="6"
                                strokeOpacity="0.45"
                                strokeLinecap="round"
                            />
                        ))}
                        {/* Sharp highlighted space curve */}
                        {curve.projSegments.map((seg, sIdx) => (
                            <line
                                key={`seg_${sIdx}`}
                                x1={seg.p1.sx}
                                y1={seg.p1.sy}
                                x2={seg.p2.sx}
                                y2={seg.p2.sy}
                                stroke="#facc15"
                                strokeWidth="3.2"
                                strokeLinecap="round"
                            />
                        ))}
                        {/* Sample points along the space curve */}
                        {curve.projPoints.map((pt, pIdx) => (
                            <circle
                                key={`pt_${pIdx}`}
                                cx={pt.sx}
                                cy={pt.sy}
                                r="2.5"
                                fill="#ffffff"
                                stroke="#ca8a04"
                                strokeWidth="1.2"
                            />
                        ))}
                    </g>
                ))}

                {/* 5. 3D Coordinate Axes (X: Crimson, Y: Emerald, Z: Sky Blue) */}
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

            {/* Momentary Zoom Notification HUD Banner (Centered, auto-fades in 800ms) */}
            {zoomMessage && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <div className={`px-4 py-2 rounded-xl text-[14px] font-semibold tracking-wide backdrop-blur-md shadow-2xl border transition-all duration-300 animate-in fade-in zoom-in-95 ${
                        isDark 
                            ? 'bg-slate-900/90 text-indigo-300 border-indigo-500/40 shadow-indigo-950/50' 
                            : 'bg-white/95 text-indigo-600 border-indigo-200 shadow-slate-300'
                    }`}>
                        {zoomMessage}
                    </div>
                </div>
            )}

            {/* 3D Intersection Space Curve Mathematical Representation Card */}
            {showIntersections && intersectionCurves.length > 0 && (
                <div className="absolute top-12 left-2 z-20 pointer-events-none max-w-[300px]">
                    {intersectionCurves.map((c) => (
                        <div
                            key={c.id}
                            className={`px-3 py-2 rounded-xl border backdrop-blur-md shadow-lg flex flex-col gap-1 text-[13px] font-mono ${
                                isDark
                                    ? 'bg-slate-900/90 border-amber-500/40 text-amber-300'
                                    : 'bg-amber-50/95 border-amber-300 text-amber-900'
                            }`}
                        >
                            <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-amber-400">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                <span>3D Intersection Curve:</span>
                            </div>
                            <div className="font-semibold text-[13px]">{c.formula}</div>
                            <div className="text-[11px] opacity-75 truncate">
                                System: {c.systemFormula}
                            </div>
                            <div className="text-[10px] opacity-60">
                                Space curve ({c.pointCount} 3D points)
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Floating Top Controls Bar inside 3D View */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20" onPointerDown={(e) => e.stopPropagation()}>
                {/* Surface / Equation Selector Dropdown */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowPresetDropdown(prev => !prev)}
                        className={`px-2.5 py-1.5 rounded-xl border text-[14px] font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md transition ${
                            isDark 
                                ? 'bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800' 
                                : 'bg-white/95 border-slate-300 text-slate-800 hover:bg-slate-100'
                        }`}
                        title="Select Equation or 3D Surface Preset"
                    >
                        {visibleSurfaces.length > 1 ? (
                            <>
                                <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span className="truncate max-w-[130px]">{visibleSurfaces.length} Surfaces Visible</span>
                            </>
                        ) : primarySurface.type === 'equation' ? (
                            <>
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: primarySurface.color || '#6366f1' }} />
                                <span className="truncate max-w-[130px]">{primarySurface.name}</span>
                            </>
                        ) : primarySurface.quadric?.type === 'sphere' ? (
                            <>
                                <Circle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span className="truncate max-w-[130px]">{primarySurface.name}</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span className="truncate max-w-[130px]">{primarySurface.name}</span>
                            </>
                        )}
                        <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                    </button>

                    {showPresetDropdown && (
                        <div className={`absolute right-0 top-full mt-1.5 w-72 max-h-80 overflow-y-auto border rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-30 animate-in fade-in duration-100 ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                        }`}>
                            {/* User Equations Section */}
                            {equations.length > 0 && (
                                <>
                                    <div className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider border-b flex items-center justify-between ${
                                        isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
                                    }`}>
                                        <div className="flex items-center gap-1.5">
                                            <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                                            <span>Your Equations (All Rendered)</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedSourceId('equation_auto');
                                            setShowPresetDropdown(false);
                                        }}
                                        className={`px-2 py-1.5 rounded-lg text-left text-[14px] flex items-center justify-between transition ${
                                            selectedSourceId === 'equation_auto'
                                                ? 'bg-indigo-600/20 text-indigo-400 font-semibold'
                                                : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100')
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
                                            <span className="truncate font-semibold">Render All Visible Equations</span>
                                        </div>
                                        {selectedSourceId === 'equation_auto' && <Check className="w-4 h-4 text-indigo-400 shrink-0 ml-1.5" />}
                                    </button>
                                    {equations.map((eq, idx) => {
                                        const isSelected = selectedSourceId === eq.id;
                                        return (
                                            <button
                                                key={eq.id || idx}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedSourceId(eq.id);
                                                    if (onSelectEquation) onSelectEquation(eq.id);
                                                    setShowPresetDropdown(false);
                                                }}
                                                className={`px-2 py-1.5 rounded-lg text-left text-[14px] flex items-center justify-between transition ${
                                                    isSelected
                                                        ? 'bg-indigo-600/20 text-indigo-400 font-semibold'
                                                        : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100')
                                                }`}
                                                title={eq.raw}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: eq.color || '#6366f1' }} />
                                                    <span className="font-mono truncate">{eq.raw || `Equation ${idx + 1}`}</span>
                                                </div>
                                                {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0 ml-1.5" />}
                                            </button>
                                        );
                                    })}
                                    <div className={`my-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
                                </>
                            )}

                            {/* 3D Mathematical Surface Presets Section */}
                            <div className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider border-b flex items-center gap-1.5 ${
                                isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
                            }`}>
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>3D Surface Presets</span>
                            </div>
                            {SURFACE_3D_PRESETS.map((preset) => {
                                const isSelected = selectedSourceId === preset.id;
                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedSourceId(preset.id);
                                            setShowPresetDropdown(false);
                                        }}
                                        className={`px-2 py-1.5 rounded-lg text-left text-[14px] flex flex-col transition ${
                                            isSelected
                                                ? 'bg-amber-500/20 text-amber-400 font-semibold'
                                                : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100')
                                        }`}
                                        title={preset.description}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{preset.name}</span>
                                            {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                                        </div>
                                        <span className="font-mono text-[11px] opacity-70 truncate">{preset.formula}</span>
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
                    <Layers className="w-4 h-4 text-sky-400" />
                </button>

                {/* Color Palette Toggle (single surface mode) */}
                {!meshData.isMultiSurface && (
                    <button
                        type="button"
                        onClick={() => {
                            const maps = ['viridis', 'coolwarm', 'sunset', 'neon'];
                            const nextIdx = (maps.indexOf(colorMap) + 1) % maps.length;
                            setColorMap(maps[nextIdx]);
                        }}
                        className={`px-2.5 py-1 rounded-xl border text-[14px] font-semibold capitalize shadow-md backdrop-blur-md transition ${
                            isDark ? 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-white/95 border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                        title="Change 3D Height Color Gradient (Viridis, Coolwarm, Sunset, Neon)"
                    >
                        {colorMap}
                    </button>
                )}

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
                    {isAutoSpinning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
            </div>

            {/* Bottom Angle & View Orientation Quick Selector */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1 z-20" onPointerDown={(e) => e.stopPropagation()}>
                {['iso', 'top', 'front', 'side'].map(v => (
                    <button
                        key={v}
                        type="button"
                        onClick={() => setViewPreset(v)}
                        className={`px-2 py-0.5 rounded-lg border text-[14px] font-bold uppercase backdrop-blur-md shadow-xs transition ${
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
                    onClick={() => { setRotX(30); setRotY(45); setZoom(1.1); triggerZoomMessage('Reset View'); }}
                    className={`p-1 rounded-lg border backdrop-blur-md shadow-xs transition ${
                        isDark ? 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white' : 'bg-white/90 border-slate-300 text-slate-600 hover:text-black'
                    }`}
                    title="Reset 3D View Orientation"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Bottom-left Formula and Surfaces Badge */}
            <div className="absolute bottom-2 left-2 flex flex-col gap-1 pointer-events-none z-10 font-mono text-[14px] max-w-[340px]">
                {visibleSurfaces.map((surf, idx) => (
                    <div
                        key={surf.id || idx}
                        className={`px-2.5 py-1 rounded-lg border backdrop-blur-md shadow-xs flex items-center gap-1.5 ${
                            isDark ? 'bg-slate-900/90 border-slate-800 text-slate-200' : 'bg-white/95 border-slate-200 text-slate-800'
                        }`}
                    >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: surf.color || '#38bdf8' }} />
                        {surf.type === 'quadric' && surf.quadric?.type === 'sphere' ? (
                            <>
                                <span className="font-bold text-sky-400">Sphere: </span>
                                <span className="font-semibold truncate">{surf.name}</span>
                                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 text-[11px] font-semibold shrink-0">
                                    R = {surf.quadric.radius}
                                </span>
                            </>
                        ) : surf.type === 'quadric' ? (
                            <>
                                <span className="font-bold text-sky-400">Quadric: </span>
                                <span className="font-semibold truncate">{surf.name}</span>
                            </>
                        ) : (
                            <>
                                <span className="font-bold text-sky-400">z = </span>
                                <span className="font-semibold truncate">{surf.formula}</span>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
