'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Rotate3d, Lock, Unlock, Trash2, Copy,
    Infinity as InfinityIcon, Sliders, RotateCcw
} from 'lucide-react';

/* ─── Built-in 3D Geometric & Science Mesh Generators ─── */
export function get3DModelMesh(modelType = 'cube') {
    switch (modelType.toLowerCase()) {
        case 'cube': {
            const v = [
                [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
                [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
            ];
            const f = [
                [0, 1, 2, 3], // Front
                [5, 4, 7, 6], // Back
                [4, 0, 3, 7], // Left
                [1, 5, 6, 2], // Right
                [4, 5, 1, 0], // Top
                [3, 2, 6, 7]  // Bottom
            ];
            return { vertices: v, faces: f, color: '#3b82f6' };
        }
        case 'pyramid': {
            const v = [
                [-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1],
                [0, -1.2, 0] // Apex
            ];
            const f = [
                [3, 2, 1, 0], // Base
                [0, 1, 4],    // Front
                [1, 2, 4],    // Right
                [2, 3, 4],    // Back
                [3, 0, 4]     // Left
            ];
            return { vertices: v, faces: f, color: '#f59e0b' };
        }
        case 'prism': {
            const v = [
                [-1, 1, -0.8], [1, 1, -0.8], [0, -1, -0.8], // Front triangle
                [-1, 1, 0.8], [1, 1, 0.8], [0, -1, 0.8]     // Back triangle
            ];
            const f = [
                [0, 1, 2],
                [5, 4, 3],
                [0, 3, 4, 1],
                [1, 4, 5, 2],
                [2, 5, 3, 0]
            ];
            return { vertices: v, faces: f, color: '#8b5cf6' };
        }
        case 'cylinder': {
            const segments = 12;
            const v = [];
            const f = [];
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const x = Math.cos(angle);
                const z = Math.sin(angle);
                v.push([x, -1, z]); // Top circle
                v.push([x, 1, z]);  // Bottom circle
            }
            for (let i = 0; i < segments; i++) {
                const next = (i + 1) % segments;
                f.push([i * 2, next * 2, next * 2 + 1, i * 2 + 1]);
            }
            return { vertices: v, faces: f, color: '#06b6d4' };
        }
        case 'cone': {
            const segments = 12;
            const v = [[0, -1.2, 0]]; // Apex
            const f = [];
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                v.push([Math.cos(angle), 1, Math.sin(angle)]);
            }
            for (let i = 1; i <= segments; i++) {
                const next = i === segments ? 1 : i + 1;
                f.push([0, i, next]);
            }
            return { vertices: v, faces: f, color: '#ec4899' };
        }
        case 'sphere': {
            const latBands = 8;
            const lonBands = 10;
            const v = [];
            const f = [];
            for (let lat = 0; lat <= latBands; lat++) {
                const theta = (lat * Math.PI) / latBands;
                const sinTheta = Math.sin(theta);
                const cosTheta = Math.cos(theta);
                for (let lon = 0; lon <= lonBands; lon++) {
                    const phi = (lon * 2 * Math.PI) / lonBands;
                    v.push([Math.cos(phi) * sinTheta, -cosTheta, Math.sin(phi) * sinTheta]);
                }
            }
            for (let lat = 0; lat < latBands; lat++) {
                for (let lon = 0; lon < lonBands; lon++) {
                    const first = lat * (lonBands + 1) + lon;
                    const second = first + lonBands + 1;
                    f.push([first, second, second + 1, first + 1]);
                }
            }
            return { vertices: v, faces: f, color: '#10b981' };
        }
        case 'dna_double_helix': {
            const steps = 14;
            const v = [];
            const f = [];
            const radius = 0.8;
            for (let i = 0; i < steps; i++) {
                const angle = (i / steps) * Math.PI * 3;
                const y = ((i / steps) - 0.5) * 2.4;
                const x1 = Math.cos(angle) * radius;
                const z1 = Math.sin(angle) * radius;
                const x2 = Math.cos(angle + Math.PI) * radius;
                const z2 = Math.sin(angle + Math.PI) * radius;
                v.push([x1, y, z1]);
                v.push([x2, y, z2]);
            }
            for (let i = 0; i < steps - 1; i++) {
                // Connecting rungs
                f.push([i * 2, i * 2 + 1, (i + 1) * 2 + 1, (i + 1) * 2]);
            }
            return { vertices: v, faces: f, color: '#6366f1' };
        }
        case 'atom': {
            // Nucleus with 3 orbital rings
            const rings = 3;
            const pointsPerRing = 16;
            const v = [[0, 0, 0]]; // Nucleus
            const f = [];
            for (let r = 0; r < rings; r++) {
                const tilt = (r / rings) * Math.PI;
                for (let p = 0; p < pointsPerRing; p++) {
                    const angle = (p / pointsPerRing) * Math.PI * 2;
                    const x = Math.cos(angle) * 1.2;
                    const y = Math.sin(angle) * Math.cos(tilt) * 1.2;
                    const z = Math.sin(angle) * Math.sin(tilt) * 1.2;
                    v.push([x, y, z]);
                }
            }
            for (let r = 0; r < rings; r++) {
                const start = 1 + r * pointsPerRing;
                for (let p = 0; p < pointsPerRing; p++) {
                    const next = p === pointsPerRing - 1 ? start : start + p + 1;
                    f.push([0, start + p, next]);
                }
            }
            return { vertices: v, faces: f, color: '#0ea5e9' };
        }
        default:
            return get3DModelMesh('cube');
    }
}

/* ─── External 3D File Parsers (.OBJ, .STL, .JSON) ─── */
export function parseOBJ(text) {
    const lines = text.split('\n');
    const vertices = [];
    const faces = [];

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('v ')) {
            const parts = line.split(/\s+/).slice(1).map(Number);
            if (parts.length >= 3) vertices.push([parts[0], -parts[1], parts[2]]);
        } else if (line.startsWith('f ')) {
            const parts = line.split(/\s+/).slice(1).map(p => {
                const idx = parseInt(p.split('/')[0], 10);
                return idx > 0 ? idx - 1 : vertices.length + idx;
            });
            if (parts.length >= 3) faces.push(parts);
        }
    }

    if (vertices.length === 0) return null;

    // Normalize coordinates to [-1, 1] bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    vertices.forEach(([x, y, z]) => {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    });

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
    const scale = 2 / maxDim;

    const normV = vertices.map(([x, y, z]) => [
        (x - cx) * scale,
        (y - cy) * scale,
        (z - cz) * scale
    ]);

    return { vertices: normV, faces, color: '#38bdf8' };
}

export function parseSTL(textOrBuffer) {
    if (typeof textOrBuffer !== 'string') return null;
    const text = textOrBuffer;
    const vertices = [];
    const faces = [];
    const vMap = new Map();

    const getVertexIdx = (x, y, z) => {
        const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
        if (vMap.has(key)) return vMap.get(key);
        const idx = vertices.length;
        vertices.push([x, y, z]);
        vMap.set(key, idx);
        return idx;
    };

    const lines = text.split('\n');
    let currentFacet = [];
    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('vertex ')) {
            const parts = line.split(/\s+/).slice(1).map(Number);
            if (parts.length >= 3) {
                currentFacet.push(getVertexIdx(parts[0], -parts[1], parts[2]));
            }
        } else if (line.startsWith('endfacet')) {
            if (currentFacet.length === 3) {
                faces.push(currentFacet);
            }
            currentFacet = [];
        }
    }

    if (vertices.length === 0) return null;

    // Normalize
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    vertices.forEach(([x, y, z]) => {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    });

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
    const scale = 2 / maxDim;

    const normV = vertices.map(([x, y, z]) => [
        (x - cx) * scale,
        (y - cy) * scale,
        (z - cz) * scale
    ]);

    return { vertices: normV, faces, color: '#f43f5e' };
}

export function parseJSON3D(jsonString) {
    try {
        const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
        if (data.vertices && data.faces) {
            return {
                vertices: data.vertices,
                faces: data.faces,
                color: data.color || '#a855f7'
            };
        }
        if (data.data && data.data.attributes && data.data.attributes.position) {
            const pos = data.data.attributes.position.array;
            const vertices = [];
            for (let i = 0; i < pos.length; i += 3) {
                vertices.push([pos[i], -pos[i + 1], pos[i + 2]]);
            }
            const faces = [];
            for (let i = 0; i < vertices.length; i += 3) {
                faces.push([i, i + 1, i + 2]);
            }
            return { vertices, faces, color: '#a855f7' };
        }
    } catch (e) {
        console.error('Failed to parse 3D JSON', e);
    }
    return null;
}

/* ─── 3D Perspective Projection Component ─── */
export default function Whiteboard3DObject({
    obj,
    isSelected = false,
    onSelect,
    onUpdate,
    onDelete,
    onDuplicate
}) {
    const [rotX, setRotX] = useState(obj.rotX || -25);
    const [rotY, setRotY] = useState(obj.rotY || 45);
    const [rotZ, setRotZ] = useState(obj.rotZ || 0);
    const [is3DDragging, setIs3DDragging] = useState(false);
    const lastPointerRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (typeof obj.rotX === 'number') setRotX(obj.rotX);
        if (typeof obj.rotY === 'number') setRotY(obj.rotY);
        if (typeof obj.rotZ === 'number') setRotZ(obj.rotZ);
    }, [obj.rotX, obj.rotY, obj.rotZ]);

    // Mesh resolution
    const mesh = useMemo(() => {
        if (obj.meshData && obj.meshData.vertices && obj.meshData.faces) {
            return obj.meshData;
        }
        return get3DModelMesh(obj.modelType || 'cube');
    }, [obj.meshData, obj.modelType]);

    // 3D Matrix Rotation & Perspective Projection
    const projectedFaces = useMemo(() => {
        const radX = (rotX * Math.PI) / 180;
        const radY = (rotY * Math.PI) / 180;
        const radZ = (rotZ * Math.PI) / 180;

        const cosX = Math.cos(radX), sinX = Math.sin(radX);
        const cosY = Math.cos(radY), sinY = Math.sin(radY);
        const cosZ = Math.cos(radZ), sinZ = Math.sin(radZ);

        // Light direction vector (normalized)
        const lx = 0.5, ly = -0.7, lz = 0.5;

        // Transform vertices
        const transformedVertices = mesh.vertices.map(([vx, vy, vz]) => {
            // Y rotation
            let x1 = vx * cosY + vz * sinY;
            let y1 = vy;
            let z1 = -vx * sinY + vz * cosY;

            // X rotation
            let x2 = x1;
            let y2 = y1 * cosX - z1 * sinX;
            let z2 = y1 * sinX + z1 * cosX;

            // Z rotation
            let x3 = x2 * cosZ - y2 * sinZ;
            let y3 = x2 * sinZ + y2 * cosZ;
            let z3 = z2;

            // Perspective division
            const distance = 4;
            const factor = distance / (distance + z3);
            const scale = (Math.min(obj.width || 220, obj.height || 220) / 2) * 0.75;

            const px = (obj.width || 220) / 2 + x3 * factor * scale;
            const py = (obj.height || 220) / 2 + y3 * factor * scale;

            return { px, py, pz: z3, x3, y3, z3 };
        });

        // Compute face normals, depth, and shading
        const baseColor = obj.color || mesh.color || '#3b82f6';

        const renderedFaces = mesh.faces.map((faceIndices) => {
            if (faceIndices.length < 3) return null;
            const v0 = transformedVertices[faceIndices[0]];
            const v1 = transformedVertices[faceIndices[1]];
            const v2 = transformedVertices[faceIndices[2]];
            if (!v0 || !v1 || !v2) return null;

            // Face normal (in transformed space)
            const ax = v1.x3 - v0.x3, ay = v1.y3 - v0.y3, az = v1.z3 - v0.z3;
            const bx = v2.x3 - v0.x3, by = v2.y3 - v0.y3, bz = v2.z3 - v0.z3;
            const nx = ay * bz - az * by;
            const ny = az * bx - ax * bz;
            const nz = ax * by - ay * bx;
            const len = Math.hypot(nx, ny, nz) || 1;
            const nnx = nx / len, nny = ny / len, nnz = nz / len;

            // Backface culling: if normal points away from camera, discard
            if (nnz >= 0.1) return null;

            // Diffuse lighting intensity
            const intensity = Math.max(0.25, Math.min(1.0, nnx * lx + nny * ly + nnz * lz));
            const avgZ = faceIndices.reduce((sum, idx) => sum + (transformedVertices[idx]?.pz || 0), 0) / faceIndices.length;

            const pointsStr = faceIndices
                .map(idx => `${transformedVertices[idx].px.toFixed(1)},${transformedVertices[idx].py.toFixed(1)}`)
                .join(' ');

            return {
                pointsStr,
                avgZ,
                intensity
            };
        }).filter(Boolean);

        // Painter's algorithm depth sorting (draw furthest first)
        renderedFaces.sort((a, b) => b.avgZ - a.avgZ);

        return { renderedFaces, baseColor };
    }, [rotX, rotY, rotZ, mesh, obj.width, obj.height, obj.color]);

    // 3D Trackball Rotation Gestures
    const handle3DPointerDown = (e) => {
        e.stopPropagation();
        setIs3DDragging(true);
        lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };

    useEffect(() => {
        if (!is3DDragging) return;

        const handleMove = (e) => {
            const dx = e.clientX - lastPointerRef.current.x;
            const dy = e.clientY - lastPointerRef.current.y;
            lastPointerRef.current = { x: e.clientX, y: e.clientY };

            const newY = (rotY + dx * 0.8) % 360;
            const newX = Math.max(-85, Math.min(85, rotX - dy * 0.8));

            setRotX(newX);
            setRotY(newY);
            onUpdate && onUpdate({ rotX: newX, rotY: newY });
        };

        const handleUp = () => {
            setIs3DDragging(false);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [is3DDragging, rotX, rotY, onUpdate]);

    const handleSize = 10;

    // 2D Move Handler
    const handleMoveStart = (e) => {
        if (obj.isLocked) return;
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();

        if (obj.isInfiniteCloner && onDuplicate) {
            onDuplicate(obj.id);
            return;
        }

        const startX = e.clientX;
        const startY = e.clientY;
        const initialX = obj.x || 0;
        const initialY = obj.y || 0;

        const onMove = (moveEvt) => {
            const dx = moveEvt.clientX - startX;
            const dy = moveEvt.clientY - startY;
            onUpdate && onUpdate({ x: initialX + dx, y: initialY + dy });
        };

        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    // 2D 8-handle Resize
    const handleResizeStart = (handle, e) => {
        if (obj.isLocked) return;
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;
        const initialW = obj.width || 220;
        const initialH = obj.height || 220;
        const initialX = obj.x || 0;
        const initialY = obj.y || 0;

        const onMove = (moveEvt) => {
            const dx = moveEvt.clientX - startX;
            const dy = moveEvt.clientY - startY;
            let newW = initialW;
            let newH = initialH;
            let newX = initialX;
            let newY = initialY;

            if (handle.includes('e')) newW = Math.max(60, initialW + dx);
            if (handle.includes('s')) newH = Math.max(60, initialH + dy);
            if (handle.includes('w')) {
                const calculatedW = Math.max(60, initialW - dx);
                newX = initialX + (initialW - calculatedW);
                newW = calculatedW;
            }
            if (handle.includes('n')) {
                const calculatedH = Math.max(60, initialH - dy);
                newY = initialY + (initialH - calculatedH);
                newH = calculatedH;
            }

            onUpdate && onUpdate({ width: newW, height: newH, x: newX, y: newY });
        };

        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    // 2D Rotation
    const handleRotateStart = (e) => {
        if (obj.isLocked) return;
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();

        const centerX = (obj.x || 0) + (obj.width || 220) / 2;
        const centerY = (obj.y || 0) + (obj.height || 220) / 2;

        const onMove = (moveEvt) => {
            const radians = Math.atan2(moveEvt.clientY - centerY, moveEvt.clientX - centerX);
            let degrees = radians * (180 / Math.PI) - 90;
            degrees = (degrees + 360) % 360;
            onUpdate && onUpdate({ rotation: Math.round(degrees) });
        };

        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                onSelect && onSelect(obj.id);
            }}
            onPointerDown={handleMoveStart}
            style={{
                left: `${obj.x}px`,
                top: `${obj.y}px`,
                width: `${obj.width || 220}px`,
                height: `${obj.height || 220}px`,
                transform: `rotate(${obj.rotation || 0}deg)`,
                transformOrigin: 'center center',
                opacity: obj.opacity ?? 1,
                zIndex: obj.zIndex || 15
            }}
            data-interactive="true"
            className={`whiteboard-3d-object absolute select-none group cursor-move ${
                isSelected ? 'ring-2 ring-sky-500 rounded-xl shadow-2xl' : ''
            }`}
        >
            {/* SVG 3D Perspective Canvas */}
            <svg
                viewBox={`0 0 ${obj.width || 220} ${obj.height || 220}`}
                className="w-full h-full pointer-events-none drop-shadow-md overflow-visible"
            >
                {projectedFaces.renderedFaces.map((face, fIdx) => (
                    <polygon
                        key={fIdx}
                        points={face.pointsStr}
                        fill={projectedFaces.baseColor}
                        fillOpacity={face.intensity}
                        stroke="#ffffff"
                        strokeWidth="0.8"
                        strokeOpacity="0.4"
                    />
                ))}
            </svg>

            {/* Infinite Cloner Badge */}
            {obj.isInfiniteCloner && (
                <div 
                    className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-bold flex items-center justify-center shadow-md border-2 border-white pointer-events-none z-30"
                    title="Infinite Cloner Active: drag to clone"
                >
                    <InfinityIcon className="w-3.5 h-3.5" />
                </div>
            )}

            {/* 3D Trackball Rotation Center Handle */}
            {isSelected && !obj.isLocked && (
                <div
                    onMouseDown={handle3DPointerDown}
                    onPointerDown={handle3DPointerDown}
                    className="absolute inset-0 m-auto w-14 h-14 rounded-full border-2 border-dashed border-sky-400/80 bg-sky-500/20 hover:bg-sky-500/30 flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing transition-all backdrop-blur-[1px] shadow-lg z-25"
                    title="Drag to Rotate in 3D (Pitch/Yaw/Roll)"
                >
                    <Rotate3d className="w-6 h-6 text-sky-300 animate-pulse pointer-events-none" />
                </div>
            )}

            {/* 2D Controls Toolbar (When Selected) */}
            {isSelected && (
                <div
                    className="absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-700/80 shadow-2xl rounded-lg px-2 py-1 flex items-center gap-1.5 z-40 text-slate-200 pointer-events-auto select-none backdrop-blur-md"
                    onPointerDown={e => e.stopPropagation()}
                >
                    <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider px-1">
                        {obj.modelType || '3D'}
                    </span>
                    <div className="w-px h-3.5 bg-slate-700" />
                    {/* Reset 3D Rotation */}
                    <button
                        type="button"
                        onClick={() => onUpdate && onUpdate({ rotX: -25, rotY: 45, rotZ: 0 })}
                        className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                        title="Reset 3D View Angle"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    {/* Infinite Cloner Toggle */}
                    <button
                        type="button"
                        onClick={() => onUpdate && onUpdate({ isInfiniteCloner: !obj.isInfiniteCloner })}
                        className={`p-1 rounded transition ${obj.isInfiniteCloner ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        title={obj.isInfiniteCloner ? "Disable Infinite Clone" : "Enable Infinite Clone"}
                    >
                        <InfinityIcon className="w-3.5 h-3.5" />
                    </button>
                    {/* Lock */}
                    <button
                        type="button"
                        onClick={() => onUpdate && onUpdate({ isLocked: !obj.isLocked })}
                        className={`p-1 rounded transition ${obj.isLocked ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        title={obj.isLocked ? "Unlock" : "Lock"}
                    >
                        {obj.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    {/* Duplicate */}
                    {onDuplicate && (
                        <button
                            type="button"
                            onClick={() => onDuplicate(obj.id)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                            title="Duplicate"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {/* Delete */}
                    {onDelete && (
                        <button
                            type="button"
                            onClick={() => onDelete(obj.id)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400"
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}

            {/* 2D Resize & Rotate Handles (When Selected & Not Locked) */}
            {isSelected && !obj.isLocked && (
                <>
                    {/* 2D Rotate Stem */}
                    <div
                        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-30"
                        style={{ top: -32, pointerEvents: 'auto' }}
                        onPointerDown={e => e.stopPropagation()}
                    >
                        <div className="w-px h-4 bg-sky-500" />
                        <div
                            onPointerDown={handleRotateStart}
                            className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center cursor-grab hover:bg-sky-700 shadow-md transition-transform hover:scale-110 active:cursor-grabbing"
                            title="2D Rotate Object"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </div>
                    </div>

                    {/* Corner Resize Handles */}
                    {[
                        { handle: 'nw', style: { left: -handleSize / 2, top: -handleSize / 2, cursor: 'nwse-resize' } },
                        { handle: 'ne', style: { right: -handleSize / 2, top: -handleSize / 2, cursor: 'nesw-resize' } },
                        { handle: 'sw', style: { left: -handleSize / 2, bottom: -handleSize / 2, cursor: 'nesw-resize' } },
                        { handle: 'se', style: { right: -handleSize / 2, bottom: -handleSize / 2, cursor: 'nwse-resize' } },
                    ].map(({ handle, style }) => (
                        <div
                            key={handle}
                            onPointerDown={(e) => handleResizeStart(handle, e)}
                            className="absolute bg-white border-2 border-sky-500 rounded-xs shadow-md z-30 pointer-events-auto"
                            style={{ width: handleSize + 2, height: handleSize + 2, ...style }}
                        />
                    ))}

                    {/* Edge Resize Handles */}
                    {[
                        { handle: 'n', style: { left: '50%', top: -handleSize / 2, transform: 'translateX(-50%)', cursor: 'ns-resize' } },
                        { handle: 's', style: { left: '50%', bottom: -handleSize / 2, transform: 'translateX(-50%)', cursor: 'ns-resize' } },
                        { handle: 'e', style: { right: -handleSize / 2, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' } },
                        { handle: 'w', style: { left: -handleSize / 2, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' } },
                    ].map(({ handle, style }) => (
                        <div
                            key={handle}
                            onPointerDown={(e) => handleResizeStart(handle, e)}
                            className="absolute bg-white border-2 border-sky-500 rounded-xs shadow-md z-30 pointer-events-auto"
                            style={{ width: handleSize, height: handleSize, ...style }}
                        />
                    ))}
                </>
            )}
        </div>
    );
}
