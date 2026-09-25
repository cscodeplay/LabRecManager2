'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Rotate3d, Lock, Unlock, Trash2, Copy,
    Infinity as InfinityIcon, Sliders, RotateCcw,
    ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
    ChevronsUp, ChevronsDown, Palette, Sun, Eye, X
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
            const segments = 36;
            const v = [];
            const f = [];
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const x = Math.cos(angle);
                const z = Math.sin(angle);
                v.push([x, -1, z]); // Top rim (2*i)
                v.push([x, 1, z]);  // Bottom rim (2*i + 1)
            }
            const topCenter = v.length;
            v.push([0, -1, 0]);
            const bottomCenter = v.length;
            v.push([0, 1, 0]);

            for (let i = 0; i < segments; i++) {
                const next = (i + 1) % segments;
                // Side quad
                f.push([i * 2, next * 2, next * 2 + 1, i * 2 + 1]);
                // Top cap triangle
                f.push([topCenter, next * 2, i * 2]);
                // Bottom cap triangle
                f.push([bottomCenter, i * 2 + 1, next * 2 + 1]);
            }
            return { vertices: v, faces: f, color: '#06b6d4' };
        }
        case 'cone': {
            const segments = 36;
            const v = [[0, -1.2, 0]]; // Apex (index 0)
            const f = [];
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                v.push([Math.cos(angle), 1, Math.sin(angle)]);
            }
            const baseCenter = v.length;
            v.push([0, 1, 0]); // Base center

            for (let i = 1; i <= segments; i++) {
                const next = i === segments ? 1 : i + 1;
                // Side triangle
                f.push([0, i, next]);
                // Base cap triangle
                f.push([baseCenter, next, i]);
            }
            return { vertices: v, faces: f, color: '#ec4899' };
        }
        case 'sphere': {
            const latBands = 26;
            const lonBands = 36;
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

/* ─── Color Shading & Realistic 3D Lighting ─── */
function shadeColor(colorStr, intensity, materialStyle) {
    if (!colorStr) return '#3b82f6';
    let r = 59, g = 130, b = 246;
    if (colorStr.startsWith('#')) {
        let hex = colorStr.slice(1);
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length >= 6) {
            r = parseInt(hex.substring(0, 2), 16) || 0;
            g = parseInt(hex.substring(2, 4), 16) || 0;
            b = parseInt(hex.substring(4, 6), 16) || 0;
        }
    } else if (colorStr.startsWith('rgb')) {
        const parts = colorStr.match(/\d+/g);
        if (parts && parts.length >= 3) {
            r = parseInt(parts[0], 10);
            g = parseInt(parts[1], 10);
            b = parseInt(parts[2], 10);
        }
    }

    if (materialStyle === 'flat') {
        return `rgb(${r}, ${g}, ${b})`;
    }

    // Ambient + diffuse lighting factor: 0.32 ambient to 1.0 full light
    const diffuse = 0.32 + 0.68 * intensity;
    let nr = Math.min(255, Math.max(0, Math.round(r * diffuse)));
    let ng = Math.min(255, Math.max(0, Math.round(g * diffuse)));
    let nb = Math.min(255, Math.max(0, Math.round(b * diffuse)));

    // Specular highlight for metallic / shiny look
    if (materialStyle === 'metallic') {
        const spec = Math.pow(intensity, 4) * 110;
        nr = Math.min(255, Math.round(nr + spec));
        ng = Math.min(255, Math.round(ng + spec));
        nb = Math.min(255, Math.round(nb + spec));
    } else if (materialStyle === 'clay') {
        const softDiff = 0.45 + 0.55 * intensity;
        nr = Math.min(255, Math.round(r * softDiff));
        ng = Math.min(255, Math.round(g * softDiff));
        nb = Math.min(255, Math.round(b * softDiff));
    }

    return `rgb(${nr}, ${ng}, ${nb})`;
}

/* ─── 3D Perspective Projection Component ─── */
export default function Whiteboard3DObject({
    obj,
    isSelected = false,
    onSelect,
    onUpdate,
    onDelete,
    onDuplicate,
    onBringToFront,
    onBringForward,
    onSendBackward,
    onSendToBack
}) {
    const [rotX, setRotX] = useState(obj.rotX || -25);
    const [rotY, setRotY] = useState(obj.rotY || 45);
    const [rotZ, setRotZ] = useState(obj.rotZ || 0);
    const [is3DDragging, setIs3DDragging] = useState(false);
    const [showFormatMenu, setShowFormatMenu] = useState(false);
    const lastPointerRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (typeof obj.rotX === 'number') setRotX(obj.rotX);
        if (typeof obj.rotY === 'number') setRotY(obj.rotY);
        if (typeof obj.rotZ === 'number') setRotZ(obj.rotZ);
    }, [obj.rotX, obj.rotY, obj.rotZ]);

    // Directional rotation helper
    const rotateBy = useCallback((dx, dy) => {
        setRotY(prevY => {
            const nextY = (prevY + dx + 360) % 360;
            setRotX(prevX => {
                const nextX = Math.max(-85, Math.min(85, prevX + dy));
                onUpdate && onUpdate({ rotX: nextX, rotY: nextY });
                return nextX;
            });
            return nextY;
        });
    }, [onUpdate]);

    // Keyboard Arrow Keys Orbit Control (Left/Right for yaw, Up/Down for pitch tilt)
    useEffect(() => {
        if (!isSelected || obj.isLocked) return;
        const handleKeyDown = (e) => {
            // Ignore if active typing inside inputs
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                const step = e.shiftKey ? 15 : 5;
                if (e.key === 'ArrowLeft') rotateBy(-step, 0);
                if (e.key === 'ArrowRight') rotateBy(step, 0);
                if (e.key === 'ArrowUp') rotateBy(0, -step);
                if (e.key === 'ArrowDown') rotateBy(0, step);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSelected, obj.isLocked, rotateBy]);

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

        // Light direction vector based on light preset
        let lx = 0.5, ly = -0.7, lz = 0.5;
        if (obj.lightPreset === 'top') {
            lx = 0.1; ly = -0.95; lz = 0.3;
        } else if (obj.lightPreset === 'flat') {
            lx = 0; ly = 0; lz = 1;
        }

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
        const isWireframe = obj.materialStyle === 'wireframe' || !!obj.wireframeOnly;
        const isGlass = obj.materialStyle === 'glass';
        const isFlat = obj.materialStyle === 'flat';
        const userOpacity = obj.opacity !== undefined ? obj.opacity : 1;

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

            // Backface culling: unless glass/wireframe, discard faces facing away
            if (!isGlass && !isWireframe && nnz >= 0.1) return null;

            // Diffuse lighting intensity
            const intensity = isFlat ? 1.0 : Math.max(0.25, Math.min(1.0, nnx * lx + nny * ly + nnz * lz));
            const avgZ = faceIndices.reduce((sum, idx) => sum + (transformedVertices[idx]?.pz || 0), 0) / faceIndices.length;

            const pointsStr = faceIndices
                .map(idx => `${transformedVertices[idx].px.toFixed(1)},${transformedVertices[idx].py.toFixed(1)}`)
                .join(' ');

            let faceFill = shadeColor(baseColor, intensity, obj.materialStyle);
            let faceOpacity = userOpacity;

            if (isWireframe) {
                faceFill = 'transparent';
                faceOpacity = 0;
            } else if (isGlass) {
                faceOpacity = Math.max(0.15, Math.min(0.85, (userOpacity * 0.35) + (intensity * 0.35)));
            }

            return {
                pointsStr,
                avgZ,
                intensity,
                faceFill,
                faceOpacity
            };
        }).filter(Boolean);

        // Painter's algorithm depth sorting (draw furthest first)
        renderedFaces.sort((a, b) => b.avgZ - a.avgZ);

        return { renderedFaces, baseColor };
    }, [rotX, rotY, rotZ, mesh, obj.width, obj.height, obj.color, obj.materialStyle, obj.wireframeOnly, obj.opacity, obj.lightPreset]);

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

    // 2D Move Handler (respects infinite clone toggle)
    const handleMoveStart = (e) => {
        if (obj.isLocked) return;
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();

        // Infinite Cloner drag-to-clone: only when switched ON!
        // When switched OFF, parent object is dragged normally and NOT copied.
        if (obj.isInfiniteCloner && onDuplicate) {
            onDuplicate(obj.id, { startDrag: true, clientX: e.clientX, clientY: e.clientY });
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

    // Stroke Dasharray resolution for edges
    const strokeDash = useMemo(() => {
        const sw = obj.edgeWidth !== undefined ? obj.edgeWidth : 0.8;
        if (obj.edgeStyle === 'dashed') return `${Math.max(2, sw * 4)},${Math.max(2, sw * 3)}`;
        if (obj.edgeStyle === 'dotted') return `${Math.max(1, sw)},${Math.max(2, sw * 2)}`;
        return undefined;
    }, [obj.edgeStyle, obj.edgeWidth]);

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
                {projectedFaces.renderedFaces.map((face, fIdx) => {
                    const isCurved = obj.modelType === 'sphere' || obj.modelType === 'cylinder' || obj.modelType === 'cone';
                    const isWireframe = obj.materialStyle === 'wireframe' || !!obj.wireframeOnly;
                    const strokeColor = isWireframe
                        ? (obj.edgeColor || projectedFaces.baseColor)
                        : (isCurved
                            ? face.faceFill
                            : (obj.edgeColor || (obj.edgeWidth ? '#ffffff' : face.faceFill))
                          );
                    const strokeW = isWireframe
                        ? (obj.edgeWidth !== undefined ? obj.edgeWidth : 1)
                        : (isCurved ? 0.5 : (obj.edgeWidth !== undefined ? obj.edgeWidth : 0.8));
                    const strokeOp = isWireframe
                        ? 1
                        : (isCurved ? face.faceOpacity : (obj.edgeWidth === 0 ? 0 : (obj.materialStyle === 'glass' ? 0.9 : 0.6)));

                    return (
                        <polygon
                            key={fIdx}
                            points={face.pointsStr}
                            fill={face.faceFill}
                            fillOpacity={face.faceOpacity}
                            stroke={strokeColor}
                            strokeWidth={strokeW}
                            strokeOpacity={strokeOp}
                            strokeDasharray={isWireframe ? strokeDash : (isCurved ? undefined : strokeDash)}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    );
                })}

                {/* Outer silhouette border for sphere when edge border is requested */}
                {obj.modelType === 'sphere' && (obj.edgeWidth !== undefined ? obj.edgeWidth > 0 : false) && obj.materialStyle !== 'wireframe' && (
                    <circle
                        cx={(obj.width || 220) / 2}
                        cy={(obj.height || 220) / 2}
                        r={((Math.min(obj.width || 220, obj.height || 220) / 2) * 0.75)}
                        fill="none"
                        stroke={obj.edgeColor || projectedFaces.baseColor}
                        strokeWidth={obj.edgeWidth}
                        strokeDasharray={strokeDash}
                    />
                )}
            </svg>

            {/* Infinite Cloner Badge on Shape */}
            {obj.isInfiniteCloner && (
                <div 
                    className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-bold flex items-center justify-center shadow-md border-2 border-white pointer-events-none z-30"
                    title="Infinite Cloner ON: dragging spawns a copy"
                >
                    <InfinityIcon className="w-3.5 h-3.5" />
                </div>
            )}

            {/* 3D Trackball Gimbal & Virtual 4-Direction Joystick Keys */}
            {isSelected && !obj.isLocked && (
                <div 
                    className="absolute inset-0 m-auto w-24 h-24 flex items-center justify-center pointer-events-auto z-25"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Central Orbit Gimbal */}
                    <div
                        onMouseDown={handle3DPointerDown}
                        onPointerDown={handle3DPointerDown}
                        className="w-11 h-11 rounded-full border-2 border-dashed border-sky-400/90 bg-sky-500/25 hover:bg-sky-500/40 flex items-center justify-center cursor-grab active:cursor-grabbing transition-all backdrop-blur-xs shadow-lg"
                        title="Click & Drag to Orbit 3D Model freely in any direction"
                    >
                        <Rotate3d className="w-5 h-5 text-sky-200 pointer-events-none animate-pulse" />
                    </div>

                    {/* Virtual Direction Keys (Up, Down, Left, Right) for H/V Rotation */}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); rotateBy(0, -10); }}
                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-5 rounded-t bg-slate-900/80 hover:bg-sky-600 border border-slate-700/60 text-slate-200 hover:text-white flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95"
                        title="Tilt Up (Arrow Up)"
                    >
                        <ChevronUp size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); rotateBy(0, 10); }}
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-5 rounded-b bg-slate-900/80 hover:bg-sky-600 border border-slate-700/60 text-slate-200 hover:text-white flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95"
                        title="Tilt Down (Arrow Down)"
                    >
                        <ChevronDown size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); rotateBy(-10, 0); }}
                        className="absolute -left-1 top-1/2 -translate-y-1/2 h-6 w-5 rounded-l bg-slate-900/80 hover:bg-sky-600 border border-slate-700/60 text-slate-200 hover:text-white flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95"
                        title="Rotate Left (Arrow Left)"
                    >
                        <ChevronLeft size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); rotateBy(10, 0); }}
                        className="absolute -right-1 top-1/2 -translate-y-1/2 h-6 w-5 rounded-r bg-slate-900/80 hover:bg-sky-600 border border-slate-700/60 text-slate-200 hover:text-white flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95"
                        title="Rotate Right (Arrow Right)"
                    >
                        <ChevronRight size={13} />
                    </button>
                </div>
            )}

            {/* Top-Right Corner Lock Hook: Dims by default, lightens on hover, acts on click */}
            {isSelected && (
                <div
                    className="absolute -top-2.5 -right-2.5 z-35"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => onUpdate && onUpdate({ isLocked: !obj.isLocked })}
                        className={`w-6 h-6 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-115 shadow-md ${
                            obj.isLocked
                                ? 'bg-amber-500 text-white opacity-95 hover:opacity-100 ring-2 ring-amber-300'
                                : 'bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-slate-300 hover:text-white opacity-35 hover:opacity-100'
                        }`}
                        title={obj.isLocked ? "3D Object is Locked. Click to Unlock" : "Click to Lock 3D Object"}
                    >
                        {obj.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                </div>
            )}

            {/* East-Side 4 Layer Hooks (Bring to Front, Forward, Backward, Send to Back) */}
            {isSelected && (
                <div 
                    className="absolute left-full top-1/2 -translate-y-1/2 ml-1.5 flex flex-col gap-1 z-35"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => onBringToFront && onBringToFront(obj.id)}
                        className="w-5 h-5 flex items-center justify-center rounded bg-slate-900/80 hover:bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white opacity-35 hover:opacity-100 hover:scale-110 shadow-sm transition-all"
                        title="Bring to Front"
                    >
                        <ChevronsUp size={11} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onBringForward && onBringForward(obj.id)}
                        className="w-5 h-5 flex items-center justify-center rounded bg-slate-900/80 hover:bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white opacity-35 hover:opacity-100 hover:scale-110 shadow-sm transition-all"
                        title="Bring Forward (+1)"
                    >
                        <ChevronUp size={11} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onSendBackward && onSendBackward(obj.id)}
                        className="w-5 h-5 flex items-center justify-center rounded bg-slate-900/80 hover:bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white opacity-35 hover:opacity-100 hover:scale-110 shadow-sm transition-all"
                        title="Send Backward (-1)"
                    >
                        <ChevronDown size={11} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onSendToBack && onSendToBack(obj.id)}
                        className="w-5 h-5 flex items-center justify-center rounded bg-slate-900/80 hover:bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white opacity-35 hover:opacity-100 hover:scale-110 shadow-sm transition-all"
                        title="Send to Back"
                    >
                        <ChevronsDown size={11} />
                    </button>
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
                    
                    {/* Format / Styling Popover Toggle */}
                    <button
                        type="button"
                        onClick={() => setShowFormatMenu(prev => !prev)}
                        className={`p-1 rounded transition ${showFormatMenu ? 'bg-sky-600 text-white' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}
                        title="3D Material, Borders & Shading Format"
                    >
                        <Sliders className="w-3.5 h-3.5" />
                    </button>

                    {/* Reset 3D Rotation */}
                    <button
                        type="button"
                        onClick={() => onUpdate && onUpdate({ rotX: -25, rotY: 45, rotZ: 0 })}
                        className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                        title="Reset 3D View Angle"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Infinite Cloner Toggle (Toggles ON/OFF so parent does not copy when dragged if OFF) */}
                    <button
                        type="button"
                        onClick={() => onUpdate && onUpdate({ isInfiniteCloner: !obj.isInfiniteCloner })}
                        className={`p-1 rounded transition ${obj.isInfiniteCloner ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        title={obj.isInfiniteCloner ? "Disable Infinite Copy (Currently ON)" : "Enable Infinite Copy (Currently OFF: Drag moves object)"}
                    >
                        <InfinityIcon className="w-3.5 h-3.5" />
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

            {/* 3D Material & Appearance Format Popover */}
            {showFormatMenu && isSelected && (
                <div 
                    className="absolute -top-72 left-1/2 -translate-x-1/2 w-64 bg-slate-900/98 border border-slate-700/90 rounded-xl shadow-2xl p-3 z-50 text-slate-200 text-xs flex flex-col gap-2.5 backdrop-blur-md pointer-events-auto"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
                            <Sliders size={13} /> 3D Material & Style
                        </span>
                        <button onClick={() => setShowFormatMenu(false)} className="text-slate-400 hover:text-white p-0.5">
                            <X size={12} />
                        </button>
                    </div>

                    {/* Surface Color & Transparency Control */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Surface Color</span>
                            <span className="font-mono text-slate-300">{Math.round((obj.opacity ?? 1) * 100)}% Opacity</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="color" 
                                value={obj.color || '#3b82f6'} 
                                onChange={e => onUpdate && onUpdate({ color: e.target.value })}
                                className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                                title="Surface Base Color"
                            />
                            <input 
                                type="range" 
                                min="0.1" 
                                max="1" 
                                step="0.05"
                                value={obj.opacity ?? 1} 
                                onChange={e => onUpdate && onUpdate({ opacity: parseFloat(e.target.value) })}
                                className="flex-1 accent-sky-500 h-1.5 bg-slate-700 rounded cursor-pointer"
                                title="Surface Transparency"
                            />
                        </div>
                    </div>

                    {/* Surface Shading Presets */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-slate-400">Material Shading</span>
                        <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-medium">
                            {['shaded', 'flat', 'glass', 'wireframe'].map(mat => (
                                <button
                                    key={mat}
                                    type="button"
                                    onClick={() => onUpdate && onUpdate({ materialStyle: mat })}
                                    className={`py-1 px-1 rounded capitalize transition ${
                                        (obj.materialStyle || 'shaded') === mat ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                                >
                                    {mat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Border / Edge Properties */}
                    <div className="flex flex-col gap-1 border-t border-slate-800 pt-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Edge Borders</span>
                            <span className="font-mono text-slate-300">{obj.edgeWidth ?? 0.8}px</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="color" 
                                value={obj.edgeColor || '#ffffff'} 
                                onChange={e => onUpdate && onUpdate({ edgeColor: e.target.value })}
                                className="w-6 h-6 rounded border border-slate-700 bg-transparent cursor-pointer"
                                title="Border Edge Color"
                            />
                            <div className="flex items-center gap-1 flex-1">
                                {[0, 0.8, 1.5, 3].map(w => (
                                    <button
                                        key={w}
                                        type="button"
                                        onClick={() => onUpdate && onUpdate({ edgeWidth: w })}
                                        className={`flex-1 py-0.5 rounded text-[10px] ${
                                            (obj.edgeWidth ?? 0.8) === w ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                    >
                                        {w === 0 ? 'None' : `${w}px`}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Border Line Type: Solid, Dashed, Dotted */}
                        <div className="flex items-center gap-1 mt-1">
                            {[
                                { id: 'solid', label: '━ Solid' },
                                { id: 'dashed', label: '╍ Dash' },
                                { id: 'dotted', label: '┈ Dot' }
                            ].map(st => (
                                <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => onUpdate && onUpdate({ edgeStyle: st.id })}
                                    className={`flex-1 py-1 rounded text-[10px] font-mono transition ${
                                        (obj.edgeStyle || 'solid') === st.id ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                                >
                                    {st.label}
                                </button>
                            ))}
                        </div>
                    </div>
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

