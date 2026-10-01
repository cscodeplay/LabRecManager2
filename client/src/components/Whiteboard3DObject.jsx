'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Rotate3d, Lock, Unlock, Trash2, Copy,
    Infinity as InfinityIcon, Sliders, RotateCcw, RotateCw,
    ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
    ChevronsUp, ChevronsDown, Palette, Sun, Eye, X, Ruler,
    Download, Image as ImageIcon
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import PlanetRenderer3D from './PlanetRenderer3D';
import { getNetworkTexture, getTextureSVGDataUri, NETWORK_3D_TEXTURES } from './Network3DTextures';

// Snap angle to nearest 45 degree cardinal/diagonal within 3.5 deg threshold
const snapRotationAngle = (rawAngle) => {
    const normalized = ((rawAngle % 360) + 360) % 360;
    const nearest45 = Math.round(normalized / 45) * 45;
    const diff = Math.abs(normalized - nearest45);
    if (diff <= 3.5 || diff >= 356.5) {
        return (nearest45 % 360);
    }
    return Math.round(rawAngle * 10) / 10;
};

// 360-Degree Circular Radial Rotation Dial UI for 3D Objects
function RotationDial3D({ cx, cy, radius, rotation }) {
    const normRot = ((rotation % 360) + 360) % 360;
    const rad = (normRot - 90) * (Math.PI / 180); // 0 deg is at top (12 o'clock)
    
    const pointerX = cx + radius * Math.cos(rad);
    const pointerY = cy + radius * Math.sin(rad);

    // Generate 24 tick marks (every 15 degrees)
    const ticks = [];
    for (let deg = 0; deg < 360; deg += 15) {
        const tickRad = (deg - 90) * (Math.PI / 180);
        const isCardinal = deg % 90 === 0;
        const isDiagonal = deg % 45 === 0 && !isCardinal;
        const tickLen = isCardinal ? 14 : isDiagonal ? 9 : 5;
        const isCurrentSnapped = Math.abs(normRot - deg) < 2 || Math.abs(normRot - deg) > 358;

        const x1 = cx + (radius - tickLen) * Math.cos(tickRad);
        const y1 = cy + (radius - tickLen) * Math.sin(tickRad);
        const x2 = cx + radius * Math.cos(tickRad);
        const y2 = cy + radius * Math.sin(tickRad);

        let labelPos = null;
        if (isCardinal) {
            const labelDist = radius + 18;
            labelPos = {
                x: cx + labelDist * Math.cos(tickRad),
                y: cy + labelDist * Math.sin(tickRad),
                text: `${deg}°`
            };
        }

        ticks.push({ deg, x1, y1, x2, y2, isCardinal, isDiagonal, isCurrentSnapped, labelPos });
    }

    return (
        <div className="absolute inset-0 pointer-events-none z-[80] overflow-visible animate-in fade-in duration-150">
            <svg width="100%" height="100%" className="overflow-visible pointer-events-none">
                {/* Outer guide circle */}
                <circle cx={cx} cy={cy} r={radius} fill="rgba(15, 23, 42, 0.4)" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3,3" />

                {/* Cardinal & minor tick marks */}
                {ticks.map((t, idx) => (
                    <g key={idx}>
                        <line
                            x1={t.x1}
                            y1={t.y1}
                            x2={t.x2}
                            y2={t.y2}
                            stroke={t.isCurrentSnapped ? '#10b981' : t.isCardinal ? '#3b82f6' : t.isDiagonal ? '#38bdf8' : 'rgba(148, 163, 184, 0.5)'}
                            strokeWidth={t.isCurrentSnapped ? 3 : t.isCardinal ? 2.5 : t.isDiagonal ? 1.75 : 1}
                        />
                        {t.labelPos && (
                            <text
                                x={t.labelPos.x}
                                y={t.labelPos.y}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill={t.isCurrentSnapped ? '#34d399' : '#93c5fd'}
                                fontSize="11"
                                fontWeight="bold"
                                fontFamily="monospace"
                            >
                                {t.labelPos.text}
                            </text>
                        )}
                    </g>
                ))}

                {/* Center Pivot Point */}
                <circle cx={cx} cy={cy} r="4" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />

                {/* Active Radial Line */}
                <line
                    x1={cx}
                    y1={cy}
                    x2={pointerX}
                    y2={pointerY}
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeDasharray={normRot % 45 === 0 ? "none" : "4,2"}
                />

                {/* Active Indicator Node */}
                <circle cx={pointerX} cy={pointerY} r="7" fill="#6366f1" stroke="#ffffff" strokeWidth="2.5" />
            </svg>

            {/* Floating Angle Tooltip Badge */}
            <div
                className="absolute px-3 py-1.5 rounded-full bg-slate-950/95 text-white text-xs font-mono font-bold shadow-2xl border border-indigo-500/60 flex items-center gap-1.5 backdrop-blur-md z-[85] transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${cx}px`, top: `${cy - radius - 36}px` }}
            >
                <RotateCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '4s' }} />
                <span className="text-indigo-200">Angle:</span>
                <span className="text-emerald-400 font-extrabold text-[13px]">{Math.round(normRot)}°</span>
            </div>
        </div>
    );
}


/* ─── Default Dimensions and Units Helper ─── */
export function getDefaultDimensions(modelType = 'cube') {
    switch ((modelType || '').toLowerCase()) {
        case 'prism':
            return { base: 10, height: 10, depth: 12 };
        case 'cylinder':
            return { radius: 5, height: 12 };
        case 'cone':
            return { radius: 5, height: 12 };
        case 'cube':
            return { width: 10, height: 10, depth: 10 };
        case 'pyramid':
            return { width: 10, depth: 10, height: 12 };
        case 'sphere':
        case 'sun':
        case 'earth':
        case 'moon':
        case 'mars':
        case 'jupiter':
        case 'saturn':
        case 'neptune':
            return { radius: 6 };
        case 'optical_fiber':
        case 'fiber':
        case 'fiber_optic':
            return { outerRadius: 5, innerRadius: 2, length: 16 };
        case 'twisted_cables':
        case 'twisted_pair':
        case 'utp':
        case 'ethernet_cable':
            return { radius: 5, length: 16 };
        case 'multwan_router':
        case 'multi_wan_router':
        case 'multiwan':
        case 'wan_router':
            return { width: 14, height: 4, depth: 10 };
        case 'network_switch':
        case 'switch':
        case 'managed_switch':
            return { width: 16, height: 3.5, depth: 9 };
        case 'laptop':
        case 'cs_laptop':
        case 'workstation_laptop':
            return { width: 13, height: 9, depth: 10 };
        case 'ip_panel':
        case 'patch_panel':
        case 'ip_patch_panel':
            return { width: 16, height: 3.5, depth: 6 };
        default:
            return { width: 10, height: 10, depth: 10 };
    }
}

/* ─── Dimension Annotations Calculator for 3D Shapes ─── */
export function getDimensionAnnotations(obj, transformedVertices, w, h) {
    if (!obj || !transformedVertices || transformedVertices.length === 0) {
        return [];
    }
    const mType = (obj.modelType || 'cube').toLowerCase();
    const dims = { ...getDefaultDimensions(mType), ...(obj.dimensions || {}) };
    const unit = obj.unit || 'cm';
    const annotations = [];

    if (mType === 'prism') {
        const v0 = transformedVertices[0]; // front-bottom-left
        const v1 = transformedVertices[1]; // front-bottom-right
        const v2 = transformedVertices[2]; // front-apex
        const v3 = transformedVertices[3]; // back-bottom-left
        if (v0 && v1 && v2) {
            // Base dimension line below front base
            const bx1 = v0.px;
            const by1 = v0.py;
            const bx2 = v1.px;
            const by2 = v1.py;
            annotations.push({
                type: 'line',
                dimensionKey: 'base',
                x1: bx1, y1: by1, x2: bx2, y2: by2,
                label: `b = ${dims.base} ${unit}`,
                midX: (bx1 + bx2) / 2, midY: (by1 + by2) / 2 + 14
            });

            // Height dimension line from base center to apex
            const baseMidX = (v0.px + v1.px) / 2;
            const baseMidY = (v0.py + v1.py) / 2;
            annotations.push({
                type: 'dashed-line',
                dimensionKey: 'height',
                x1: baseMidX, y1: baseMidY, x2: v2.px, y2: v2.py,
                label: `h = ${dims.height} ${unit}`,
                midX: (baseMidX + v2.px) / 2 - 28, midY: (baseMidY + v2.py) / 2
            });

            // Depth / length dimension line from v0 to v3
            if (v3) {
                annotations.push({
                    type: 'line',
                    dimensionKey: 'depth',
                    x1: v0.px, y1: v0.py, x2: v3.px, y2: v3.py,
                    label: `l = ${dims.depth} ${unit}`,
                    midX: (v0.px + v3.px) / 2 - 24, midY: (v0.py + v3.py) / 2 - 8
                });
            }
        }
    } else if (mType === 'cylinder') {
        const topCenter = transformedVertices[transformedVertices.length - 2];
        const botCenter = transformedVertices[transformedVertices.length - 1];
        const topRim0 = transformedVertices[0];
        if (topCenter && topRim0 && botCenter) {
            // Radius on top circular face
            annotations.push({
                type: 'line',
                dimensionKey: 'radius',
                x1: topCenter.px, y1: topCenter.py, x2: topRim0.px, y2: topRim0.py,
                label: `r = ${dims.radius} ${unit}`,
                midX: (topCenter.px + topRim0.px) / 2, midY: (topCenter.py + topRim0.py) / 2 - 14
            });
            // Height along vertical side
            const offX = 18;
            annotations.push({
                type: 'line',
                dimensionKey: 'height',
                x1: botCenter.px + offX, y1: botCenter.py, x2: topCenter.px + offX, y2: topCenter.py,
                label: `h = ${dims.height} ${unit}`,
                midX: topCenter.px + offX + 22, midY: (topCenter.py + botCenter.py) / 2
            });
        }
    } else if (mType === 'cone') {
        const apex = transformedVertices[0];
        const baseCenter = transformedVertices[transformedVertices.length - 1];
        const baseRim0 = transformedVertices[1];
        if (apex && baseCenter && baseRim0) {
            // Radius on base circle
            annotations.push({
                type: 'line',
                dimensionKey: 'radius',
                x1: baseCenter.px, y1: baseCenter.py, x2: baseRim0.px, y2: baseRim0.py,
                label: `r = ${dims.radius} ${unit}`,
                midX: (baseCenter.px + baseRim0.px) / 2, midY: (baseCenter.py + baseRim0.py) / 2 + 16
            });
            // Height from apex to base center
            annotations.push({
                type: 'dashed-line',
                dimensionKey: 'height',
                x1: baseCenter.px, y1: baseCenter.py, x2: apex.px, y2: apex.py,
                label: `h = ${dims.height} ${unit}`,
                midX: (baseCenter.px + apex.px) / 2 - 30, midY: (baseCenter.py + apex.py) / 2
            });
        }
    } else if (mType === 'cube') {
        const v0 = transformedVertices[0]; // [-w, -h, -d]
        const v1 = transformedVertices[1]; // [w, -h, -d]
        const v2 = transformedVertices[2]; // [w, h, -d]
        const v5 = transformedVertices[5]; // [w, -h, d]
        if (v0 && v1 && v2) {
            annotations.push({
                type: 'line',
                dimensionKey: 'width',
                x1: v0.px, y1: v0.py, x2: v1.px, y2: v1.py,
                label: `w = ${dims.width} ${unit}`,
                midX: (v0.px + v1.px) / 2, midY: (v0.py + v1.py) / 2 - 14
            });
            annotations.push({
                type: 'line',
                dimensionKey: 'height',
                x1: v1.px, y1: v1.py, x2: v2.px, y2: v2.py,
                label: `h = ${dims.height} ${unit}`,
                midX: (v1.px + v2.px) / 2 + 28, midY: (v1.py + v2.py) / 2
            });
            if (v5) {
                annotations.push({
                    type: 'line',
                    dimensionKey: 'depth',
                    x1: v1.px, y1: v1.py, x2: v5.px, y2: v5.py,
                    label: `d = ${dims.depth} ${unit}`,
                    midX: (v1.px + v5.px) / 2 + 24, midY: (v1.py + v5.py) / 2 - 12
                });
            }
        }
    } else if (mType === 'pyramid') {
        const v0 = transformedVertices[0];
        const v1 = transformedVertices[1];
        const v2 = transformedVertices[2];
        const apex = transformedVertices[4];
        if (v0 && v1 && apex) {
            annotations.push({
                type: 'line',
                dimensionKey: 'width',
                x1: v0.px, y1: v0.py, x2: v1.px, y2: v1.py,
                label: `w = ${dims.width} ${unit}`,
                midX: (v0.px + v1.px) / 2, midY: (v0.py + v1.py) / 2 + 14
            });
            if (v2) {
                annotations.push({
                    type: 'line',
                    dimensionKey: 'depth',
                    x1: v1.px, y1: v1.py, x2: v2.px, y2: v2.py,
                    label: `d = ${dims.depth} ${unit}`,
                    midX: (v1.px + v2.px) / 2 + 24, midY: (v1.py + v2.py) / 2
                });
            }
            const baseMidX = (v0.px + (v2 ? v2.px : v1.px)) / 2;
            const baseMidY = (v0.py + (v2 ? v2.py : v1.py)) / 2;
            annotations.push({
                type: 'dashed-line',
                dimensionKey: 'height',
                x1: baseMidX, y1: baseMidY, x2: apex.px, y2: apex.py,
                label: `h = ${dims.height} ${unit}`,
                midX: (baseMidX + apex.px) / 2 - 32, midY: (baseMidY + apex.py) / 2
            });
        }
    } else if (['sphere', 'sun', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'neptune'].includes(mType) || (obj.name && /earth|planet|sphere/i.test(obj.name))) {
        const cx = w / 2;
        const cy = h / 2;
        const r = (Math.min(w, h) / 2) * 0.76;
        annotations.push({
            type: 'line',
            dimensionKey: 'radius',
            x1: cx, y1: cy, x2: cx + r, y2: cy,
            label: `r = ${dims.radius || 6} ${unit}`,
            midX: cx + r / 2, midY: cy - 14
        });
    } else if (['optical_fiber', 'fiber', 'fiber_optic', 'twisted_cables', 'twisted_pair', 'utp', 'ethernet_cable'].includes(mType)) {
        const cx = w / 2;
        const cy = h / 2;
        const r = (Math.min(w, h) / 2) * 0.35;
        const l = (Math.min(w, h) / 2) * 0.75;
        annotations.push({
            type: 'line',
            dimensionKey: mType.includes('fiber') ? 'outerRadius' : 'radius',
            x1: cx - r, y1: cy - l, x2: cx + r, y2: cy - l,
            label: `r = ${dims.outerRadius || dims.radius || 5} ${unit}`,
            midX: cx, midY: cy - l - 12
        });
        annotations.push({
            type: 'line',
            dimensionKey: 'length',
            x1: cx + r + 15, y1: cy - l, x2: cx + r + 15, y2: cy + l,
            label: `l = ${dims.length || 16} ${unit}`,
            midX: cx + r + 30, midY: cy
        });
    } else if (['multwan_router', 'multi_wan_router', 'multiwan', 'wan_router', 'network_switch', 'switch', 'managed_switch', 'ip_panel', 'patch_panel', 'ip_patch_panel'].includes(mType)) {
        const cx = w / 2;
        const cy = h / 2;
        const hw = (w / 2) * 0.75;
        const hh = (h / 2) * 0.28;
        annotations.push({
            type: 'line',
            dimensionKey: 'width',
            x1: cx - hw, y1: cy + hh + 10, x2: cx + hw, y2: cy + hh + 10,
            label: `w = ${dims.width || 16} ${unit}`,
            midX: cx, midY: cy + hh + 24
        });
        annotations.push({
            type: 'line',
            dimensionKey: 'height',
            x1: cx + hw + 14, y1: cy - hh, x2: cx + hw + 14, y2: cy + hh,
            label: `h = ${dims.height || 3.5} ${unit}`,
            midX: cx + hw + 28, midY: cy
        });
        annotations.push({
            type: 'line',
            dimensionKey: 'depth',
            x1: cx - hw, y1: cy - hh - 8, x2: cx - hw + 24, y2: cy - hh - 22,
            label: `d = ${dims.depth || 10} ${unit}`,
            midX: cx - hw + 20, midY: cy - hh - 28
        });
    } else if (['laptop', 'cs_laptop', 'workstation_laptop'].includes(mType)) {
        const cx = w / 2;
        const cy = h / 2;
        const hw = (w / 2) * 0.7;
        const hh = (h / 2) * 0.6;
        annotations.push({
            type: 'line',
            dimensionKey: 'width',
            x1: cx - hw, y1: cy + hh * 0.5 + 10, x2: cx + hw, y2: cy + hh * 0.5 + 10,
            label: `w = ${dims.width || 13} ${unit}`,
            midX: cx, midY: cy + hh * 0.5 + 24
        });
        annotations.push({
            type: 'line',
            dimensionKey: 'height',
            x1: cx + hw + 12, y1: cy - hh, x2: cx + hw + 12, y2: cy + hh * 0.5,
            label: `h = ${dims.height || 9} ${unit}`,
            midX: cx + hw + 26, midY: cy - hh * 0.25
        });
    } else {
        const cx = w / 2;
        const cy = h / 2;
        const hw = (w / 2) * 0.7;
        const hh = (h / 2) * 0.7;
        annotations.push({
            type: 'line',
            dimensionKey: 'width',
            x1: cx - hw, y1: cy + hh, x2: cx + hw, y2: cy + hh,
            label: `w = ${dims.width || 10} ${unit}`,
            midX: cx, midY: cy + hh + 14
        });
        annotations.push({
            type: 'line',
            dimensionKey: 'height',
            x1: cx + hw, y1: cy - hh, x2: cx + hw, y2: cy + hh,
            label: `h = ${dims.height || 10} ${unit}`,
            midX: cx + hw + 24, midY: cy
        });
    }

    return annotations;
}

/* ─── Built-in 3D Geometric & Science Mesh Generators ─── */
function createSphereMesh(latBands = 10, lonBands = 14, radius = 1.0, color = '#10b981', customFaceColorFn = null) {
    const v = [];
    const f = [];
    const faceColors = customFaceColorFn ? [] : null;

    for (let lat = 0; lat <= latBands; lat++) {
        const theta = (lat * Math.PI) / latBands;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        for (let lon = 0; lon <= lonBands; lon++) {
            const phi = (lon * 2 * Math.PI) / lonBands;
            v.push([Math.cos(phi) * sinTheta * radius, -cosTheta * radius, Math.sin(phi) * sinTheta * radius]);
        }
    }
    for (let lat = 0; lat < latBands; lat++) {
        for (let lon = 0; lon < lonBands; lon++) {
            const first = lat * (lonBands + 1) + lon;
            const second = first + lonBands + 1;
            f.push([first, second, second + 1, first + 1]);
            if (customFaceColorFn) {
                faceColors.push(customFaceColorFn(lat, lon, latBands, lonBands));
            }
        }
    }
    return { vertices: v, faces: f, color, faceColors };
}

export function get3DModelMesh(modelType = 'cube', dimensions = null) {
    const mType = (modelType || 'cube').toLowerCase();
    const dims = { ...getDefaultDimensions(mType), ...(dimensions || {}) };

    switch (mType) {
        case 'cube': {
            const halfW = (dims.width || 10) / 10;
            const halfH = (dims.height || 10) / 10;
            const halfD = (dims.depth || 10) / 10;
            const v = [
                [-halfW, -halfH, -halfD], [halfW, -halfH, -halfD], [halfW, halfH, -halfD], [-halfW, halfH, -halfD],
                [-halfW, -halfH, halfD], [halfW, -halfH, halfD], [halfW, halfH, halfD], [-halfW, halfH, halfD]
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
            const halfW = (dims.width || 10) / 10;
            const halfD = (dims.depth || 10) / 10;
            const halfH = (dims.height || 12) / 10;
            const v = [
                [-halfW, halfH, -halfD], [halfW, halfH, -halfD], [halfW, halfH, halfD], [-halfW, halfH, halfD],
                [0, -halfH, 0] // Apex
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
            // Symmetrical uniform triangular prism with congruent bases
            const halfB = (dims.base || 10) / 10;
            const halfH = (dims.height || 10) / 10;
            const halfD = (dims.depth || 12) / 10;

            const v = [
                [-halfB, halfH, -halfD], [halfB, halfH, -halfD], [0, -halfH, -halfD], // Front triangle
                [-halfB, halfH, halfD],  [halfB, halfH, halfD],  [0, -halfH, halfD]   // Back identical congruent triangle
            ];
            const f = [
                [0, 1, 2],       // Front triangle
                [4, 3, 5],       // Back congruent triangle
                [0, 3, 4, 1],    // Bottom rectangular base
                [1, 4, 5, 2],    // Right inclined face
                [2, 5, 3, 0]     // Left inclined face
            ];
            return { vertices: v, faces: f, color: '#8b5cf6' };
        }
        case 'cylinder': {
            const r = (dims.radius || 5) / 5;
            const halfH = (dims.height || 12) / 10;
            const segments = 16;
            const v = [];
            const f = [];
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const x = Math.cos(angle) * r;
                const z = Math.sin(angle) * r;
                v.push([x, -halfH, z]); // Top rim (2*i)
                v.push([x, halfH, z]);  // Bottom rim (2*i + 1)
            }
            const topCenter = v.length;
            v.push([0, -halfH, 0]);
            const bottomCenter = v.length;
            v.push([0, halfH, 0]);

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
            const r = (dims.radius || 5) / 5;
            const halfH = (dims.height || 12) / 10;
            const segments = 16;
            const v = [[0, -halfH, 0]]; // Apex (index 0)
            const f = [];
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                v.push([Math.cos(angle) * r, halfH, Math.sin(angle) * r]);
            }
            const baseCenter = v.length;
            v.push([0, halfH, 0]); // Base center

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
            const r = (dims.radius || 6) / 6;
            return createSphereMesh(10, 14, r, '#10b981');
        }
        case 'sun': {
            const r = (dims.radius || 6) / 6;
            const sphere = createSphereMesh(10, 14, r * 0.9, '#f59e0b', (lat, lon) => {
                return (lat + lon) % 2 === 0 ? '#fbbf24' : '#f59e0b';
            });
            // 8 Corona Solar Flares radiating outward in 3D
            const flareCount = 8;
            for (let i = 0; i < flareCount; i++) {
                const angle = (i / flareCount) * Math.PI * 2;
                const nextAngle = ((i + 0.5) / flareCount) * Math.PI * 2;
                const baseIdx1 = sphere.vertices.length;
                const x1 = Math.cos(angle) * 0.92;
                const z1 = Math.sin(angle) * 0.92;
                const x2 = Math.cos(nextAngle) * 0.92;
                const z2 = Math.sin(nextAngle) * 0.92;
                const tipAngle = ((i + 0.25) / flareCount) * Math.PI * 2;
                const tipX = Math.cos(tipAngle) * 1.35;
                const tipZ = Math.sin(tipAngle) * 1.35;
                const tipY = (i % 2 === 0 ? 0.15 : -0.15);
                sphere.vertices.push([x1, 0, z1]);
                sphere.vertices.push([tipX, tipY, tipZ]);
                sphere.vertices.push([x2, 0, z2]);
                sphere.faces.push([baseIdx1, baseIdx1 + 1, baseIdx1 + 2]);
                if (sphere.faceColors) sphere.faceColors.push('#ea580c');
            }
            return sphere;
        }
        case 'earth': {
            return createSphereMesh(10, 14, 1.0, '#0284c7', (lat, lon, latBands) => {
                if (lat === 0 || lat === latBands - 1) return '#f8fafc'; // Polar ice caps
                const isLand = (lat >= 2 && lat <= 4 && (lon >= 2 && lon <= 5)) ||
                               (lat >= 5 && lat <= 8 && (lon >= 3 && lon <= 6)) ||
                               (lat >= 2 && lat <= 4 && (lon >= 8 && lon <= 12)) ||
                               (lat >= 5 && lat <= 7 && (lon >= 9 && lon <= 12));
                return isLand ? (lat % 2 === 0 ? '#16a34a' : '#22c55e') : '#0284c7';
            });
        }
        case 'moon': {
            return createSphereMesh(10, 14, 0.95, '#94a3b8', (lat, lon) => {
                const isCrater = (lat * 3 + lon * 5) % 7 === 0;
                return isCrater ? '#64748b' : '#94a3b8';
            });
        }
        case 'mars': {
            return createSphereMesh(10, 14, 0.95, '#ea580c', (lat, lon) => {
                if (lat === 0) return '#ffffff'; // North polar ice cap
                const isDark = (lat + lon * 2) % 5 === 0;
                return isDark ? '#9a3412' : '#ea580c';
            });
        }
        case 'jupiter': {
            return createSphereMesh(10, 14, 1.1, '#d97706', (lat, lon) => {
                // Great Red Spot
                if (lat === 5 && (lon === 7 || lon === 8)) return '#dc2626';
                if (lat <= 1 || lat >= 8) return '#78350f'; // Dark polar zones
                if (lat === 2 || lat === 6) return '#fef3c7'; // Light zones
                if (lat === 3 || lat === 7) return '#fed7aa'; // Warm belts
                return '#d97706';
            });
        }
        case 'saturn': {
            const planet = createSphereMesh(10, 14, 0.85, '#eab308', (lat) => {
                return lat % 2 === 0 ? '#ca8a04' : '#eab308';
            });
            // 3D Concentric Ring System
            const ringSegs = 16;
            const rInner = 1.25;
            const rOuter = 1.95;
            const ringStartIdx = planet.vertices.length;
            const tilt = 0.35;
            for (let i = 0; i <= ringSegs; i++) {
                const a = (i / ringSegs) * Math.PI * 2;
                const cosA = Math.cos(a), sinA = Math.sin(a);
                planet.vertices.push([cosA * rInner, sinA * rInner * tilt, sinA * rInner]);
                planet.vertices.push([cosA * rOuter, sinA * rOuter * tilt, sinA * rOuter]);
            }
            for (let i = 0; i < ringSegs; i++) {
                const i1 = ringStartIdx + i * 2;
                const o1 = i1 + 1;
                const i2 = ringStartIdx + ((i + 1) % ringSegs) * 2;
                const o2 = i2 + 1;
                planet.faces.push([i1, o1, o2, i2]);
                if (planet.faceColors) planet.faceColors.push(i % 2 === 0 ? '#fde047' : '#eab308');
            }
            return planet;
        }
        case 'neptune': {
            return createSphereMesh(10, 14, 0.95, '#0284c7', (lat, lon) => {
                return (lat === 4 || lat === 5) && lon % 3 === 0 ? '#bae6fd' : '#0284c7';
            });
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
        case 'rocket': {
            // High-detail 3D Rocket with Nosecone, Fuselage, 4 Aerodynamic Fins, and Nozzle
            const v = [];
            const f = [];
            const faceColors = [];
            v.push([0, -1.3, 0]); // Apex (0)
            const segs = 12;
            const rBody = 0.45;
            for (let i = 0; i < segs; i++) {
                const a = (i / segs) * Math.PI * 2;
                v.push([Math.cos(a) * rBody, -0.6, Math.sin(a) * rBody]);
            }
            for (let i = 0; i < segs; i++) {
                const a = (i / segs) * Math.PI * 2;
                v.push([Math.cos(a) * rBody, 0.7, Math.sin(a) * rBody]);
            }
            for (let i = 0; i < segs; i++) {
                const a = (i / segs) * Math.PI * 2;
                v.push([Math.cos(a) * (rBody * 0.65), 1.1, Math.sin(a) * (rBody * 0.65)]);
            }
            for (let i = 0; i < segs; i++) {
                const nxt = (i + 1) % segs;
                f.push([0, 1 + i, 1 + nxt]);
                faceColors.push('#ef4444');
            }
            for (let i = 0; i < segs; i++) {
                const nxt = (i + 1) % segs;
                f.push([1 + i, 1 + nxt, segs + 1 + nxt, segs + 1 + i]);
                faceColors.push(i % 3 === 0 ? '#38bdf8' : '#f8fafc');
            }
            for (let i = 0; i < segs; i++) {
                const nxt = (i + 1) % segs;
                f.push([segs + 1 + i, segs + 1 + nxt, 2 * segs + 1 + nxt, 2 * segs + 1 + i]);
                faceColors.push('#475569');
            }
            const finDist = 0.95;
            const finAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
            finAngles.forEach((fa) => {
                const fx = Math.cos(fa);
                const fz = Math.sin(fa);
                const baseV = v.length;
                v.push([fx * rBody, 0.2, fz * rBody]);
                v.push([fx * finDist, 0.85, fz * finDist]);
                v.push([fx * rBody, 0.85, fz * rBody]);
                f.push([baseV, baseV + 1, baseV + 2]);
                faceColors.push('#ef4444');
            });
            return { vertices: v, faces: f, color: '#f8fafc', faceColors };
        }
        case 'satellite': {
            // Central bus core + 2 solar arrays + communications dish
            const v = [
                [-0.35, -0.35, -0.35], [0.35, -0.35, -0.35], [0.35, 0.35, -0.35], [-0.35, 0.35, -0.35],
                [-0.35, -0.35, 0.35],  [0.35, -0.35, 0.35],  [0.35, 0.35, 0.35],  [-0.35, 0.35, 0.35],
                [-1.35, -0.3, -0.05], [-0.45, -0.3, -0.05], [-0.45, 0.3, -0.05], [-1.35, 0.3, -0.05],
                [0.45, -0.3, -0.05],  [1.35, -0.3, -0.05],  [1.35, 0.3, -0.05],  [0.45, 0.3, -0.05],
                [0, -0.85, 0]
            ];
            const f = [
                [0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [4, 5, 1, 0], [3, 2, 6, 7],
                [8, 9, 10, 11],
                [12, 13, 14, 15],
                [0, 1, 16], [1, 5, 16], [5, 4, 16], [4, 0, 16]
            ];
            const faceColors = [
                '#e2e8f0', '#e2e8f0', '#cbd5e1', '#cbd5e1', '#94a3b8', '#94a3b8',
                '#0284c7',
                '#0284c7',
                '#f59e0b', '#f59e0b', '#f59e0b', '#f59e0b'
            ];
            return { vertices: v, faces: f, color: '#0284c7', faceColors };
        }
        case 'molecule': {
            const v = [
                [0, 0, 0],
                [0.75, 0.75, 0.75],
                [-0.75, -0.75, 0.75],
                [-0.75, 0.75, -0.75],
                [0.75, -0.75, -0.75]
            ];
            const f = [
                [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1],
                [1, 2, 3], [2, 3, 4], [3, 4, 1], [4, 1, 2]
            ];
            const faceColors = [
                '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
                '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'
            ];
            return { vertices: v, faces: f, color: '#3b82f6', faceColors };
        }
        case 'optical_fiber':
        case 'fiber':
        case 'fiber_optic': {
            return buildOpticalFiberMesh(dims);
        }
        case 'twisted_cables':
        case 'twisted_pair':
        case 'utp':
        case 'ethernet_cable': {
            return buildTwistedCablesMesh(dims);
        }
        case 'multwan_router':
        case 'multi_wan_router':
        case 'multiwan':
        case 'wan_router': {
            return buildMultiWanRouterMesh(dims);
        }
        case 'network_switch':
        case 'switch':
        case 'managed_switch': {
            return buildNetworkSwitchMesh(dims);
        }
        case 'laptop':
        case 'cs_laptop':
        case 'workstation_laptop': {
            return buildLaptopMesh(dims);
        }
        case 'ip_panel':
        case 'patch_panel':
        case 'ip_patch_panel': {
            return buildIpPanelMesh(dims);
        }
        default:
            return get3DModelMesh('cube');
    }
}

/* ─── Mesh Box Primitive Helper ─── */
function addMeshBox(v, f, faceColors, minX, maxX, minY, maxY, minZ, maxZ, boxColor) {
    const base = v.length;
    v.push([minX, minY, minZ], [maxX, minY, minZ], [maxX, maxY, minZ], [minX, maxY, minZ]);
    v.push([minX, minY, maxZ], [maxX, minY, maxZ], [maxX, maxY, maxZ], [minX, maxY, maxZ]);
    const boxFaces = [
        [base, base + 1, base + 2, base + 3],
        [base + 5, base + 4, base + 7, base + 6],
        [base + 4, base, base + 3, base + 7],
        [base + 1, base + 5, base + 6, base + 2],
        [base + 4, base + 5, base + 1, base],
        [base + 3, base + 2, base + 6, base + 7]
    ];
    boxFaces.forEach(face => {
        f.push(face);
        if (faceColors) faceColors.push(boxColor);
    });
}

/* ─── 1. Optical Fiber 3D Mesh ─── */
function buildOpticalFiberMesh(dims) {
    const v = [];
    const f = [];
    const faceColors = [];
    const segs = 16;
    const rJacket = ((dims?.outerRadius || 5) / 5) * 0.55;
    const rBuffer = rJacket * 0.70;
    const rClad = rJacket * 0.40;
    const rCore = rJacket * 0.18;

    // Jacket Cylinder
    const vJacketStart = v.length;
    for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        v.push([Math.cos(a) * rJacket, Math.sin(a) * rJacket, -0.8]);
        v.push([Math.cos(a) * rJacket, Math.sin(a) * rJacket, 0.2]);
    }
    for (let i = 0; i < segs; i++) {
        const nxt = (i + 1) % segs;
        f.push([vJacketStart + i * 2, vJacketStart + nxt * 2, vJacketStart + nxt * 2 + 1, vJacketStart + i * 2 + 1]);
        faceColors.push('#eab308'); // Single-mode optical yellow
    }

    // Buffer Tube Cylinder
    const vBufStart = v.length;
    for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        v.push([Math.cos(a) * rBuffer, Math.sin(a) * rBuffer, 0.2]);
        v.push([Math.cos(a) * rBuffer, Math.sin(a) * rBuffer, 0.6]);
    }
    for (let i = 0; i < segs; i++) {
        const nxt = (i + 1) % segs;
        f.push([vBufStart + i * 2, vBufStart + nxt * 2, vBufStart + nxt * 2 + 1, vBufStart + i * 2 + 1]);
        faceColors.push('#f1f5f9'); // Clean white buffer
    }

    // Silica Glass Cladding Cylinder
    const vCladStart = v.length;
    for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        v.push([Math.cos(a) * rClad, Math.sin(a) * rClad, 0.6]);
        v.push([Math.cos(a) * rClad, Math.sin(a) * rClad, 0.95]);
    }
    for (let i = 0; i < segs; i++) {
        const nxt = (i + 1) % segs;
        f.push([vCladStart + i * 2, vCladStart + nxt * 2, vCladStart + nxt * 2 + 1, vCladStart + i * 2 + 1]);
        faceColors.push('#38bdf8'); // Translucent glass cladding
    }

    // Glowing Laser Core
    const vCoreStart = v.length;
    for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        v.push([Math.cos(a) * rCore, Math.sin(a) * rCore, 0.95]);
        v.push([Math.cos(a) * rCore, Math.sin(a) * rCore, 1.3]);
    }
    for (let i = 0; i < segs; i++) {
        const nxt = (i + 1) % segs;
        f.push([vCoreStart + i * 2, vCoreStart + nxt * 2, vCoreStart + nxt * 2 + 1, vCoreStart + i * 2 + 1]);
        faceColors.push('#00f5ff'); // Glowing neon core
    }
    // Laser Tip Facet
    const coreTip = v.length;
    v.push([0, 0, 1.3]);
    for (let i = 0; i < segs; i++) {
        const nxt = (i + 1) % segs;
        f.push([coreTip, vCoreStart + nxt * 2 + 1, vCoreStart + i * 2 + 1]);
        faceColors.push('#ffffff');
    }

    // Duplex LC Optical Connector at rear
    addMeshBox(v, f, faceColors, -0.45, -0.05, -0.22, 0.22, -1.3, -0.8, '#1d4ed8'); // LC Shell A (Blue)
    addMeshBox(v, f, faceColors, 0.05, 0.45, -0.22, 0.22, -1.3, -0.8, '#1d4ed8');  // LC Shell B (Blue)
    addMeshBox(v, f, faceColors, -0.35, -0.15, -0.12, 0.12, -1.6, -1.3, '#ffffff'); // Ferrule A
    addMeshBox(v, f, faceColors, 0.15, 0.35, -0.12, 0.12, -1.6, -1.3, '#ffffff');  // Ferrule B
    addMeshBox(v, f, faceColors, -0.35, 0.35, -0.38, -0.22, -1.15, -0.85, '#2563eb'); // Latch Clip

    return { vertices: v, faces: f, color: '#eab308', faceColors };
}

/* ─── 2. Twisted Cables 3D Mesh ─── */
function buildTwistedCablesMesh(dims) {
    const v = [];
    const f = [];
    const faceColors = [];
    const segs = 16;
    const rJacket = ((dims?.radius || 5) / 5) * 0.52;

    // Outer Jacket: z from 0.1 to 1.3
    const vJacketStart = v.length;
    for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        v.push([Math.cos(a) * rJacket, Math.sin(a) * rJacket, 0.1]);
        v.push([Math.cos(a) * rJacket, Math.sin(a) * rJacket, 1.3]);
    }
    for (let i = 0; i < segs; i++) {
        const nxt = (i + 1) % segs;
        f.push([vJacketStart + i * 2, vJacketStart + nxt * 2, vJacketStart + nxt * 2 + 1, vJacketStart + i * 2 + 1]);
        faceColors.push('#2563eb'); // Cat6 network blue
    }

    // 4 Twisted Wire Pairs (Orange, Green, Blue, Brown)
    const pairs = [
        { color1: '#ea580c', color2: '#fed7aa', cx: -0.22, cy: -0.22 },
        { color1: '#16a34a', color2: '#bbf7d0', cx: 0.22, cy: -0.22 },
        { color1: '#0284c7', color2: '#bfdbfe', cx: -0.22, cy: 0.22 },
        { color1: '#92400e', color2: '#fef3c7', cx: 0.22, cy: 0.22 }
    ];
    const spiralSteps = 8;
    pairs.forEach(p => {
        const vStart = v.length;
        for (let s = 0; s <= spiralSteps; s++) {
            const z = 0.1 - (s / spiralSteps) * 0.6;
            const twistAngle = s * 0.9;
            const ox = Math.cos(twistAngle) * 0.11;
            const oy = Math.sin(twistAngle) * 0.11;
            v.push([p.cx + ox, p.cy + oy, z]);
            v.push([p.cx - ox, p.cy - oy, z]);
        }
        for (let s = 0; s < spiralSteps; s++) {
            const i1 = vStart + s * 2;
            const i2 = vStart + (s + 1) * 2;
            f.push([i1, i2, i2 + 1, i1 + 1]);
            faceColors.push(s % 2 === 0 ? p.color1 : p.color2);
        }
    });

    // Clear Polycarbonate RJ-45 Plug
    addMeshBox(v, f, faceColors, -0.42, 0.42, -0.28, 0.28, -1.35, -0.5, '#94a3b8'); // Body
    addMeshBox(v, f, faceColors, -0.25, 0.25, 0.14, 0.28, -1.35, -0.9, '#475569');  // Key notch
    addMeshBox(v, f, faceColors, -0.16, 0.16, -0.42, -0.28, -1.15, -0.6, '#38bdf8'); // Retention clip
    // 8 Gold Contact Pins
    for (let p = 0; p < 8; p++) {
        const px = -0.32 + p * 0.09;
        addMeshBox(v, f, faceColors, px - 0.025, px + 0.025, -0.15, 0.15, -1.4, -1.35, '#f59e0b');
    }

    return { vertices: v, faces: f, color: '#2563eb', faceColors };
}

/* ─── 3. Multi-WAN Router 3D Mesh ─── */
function buildMultiWanRouterMesh(dims) {
    const v = [];
    const f = [];
    const faceColors = [];
    const w = ((dims?.width || 14) / 14) * 1.3;
    const h = ((dims?.height || 4) / 4) * 0.25;
    const d = ((dims?.depth || 10) / 10) * 0.85;

    // Chassis Box
    addMeshBox(v, f, faceColors, -w, w, -h, h, -d, d, '#0f172a');
    // Top Plate / Bezel
    addMeshBox(v, f, faceColors, -w * 0.94, w * 0.94, -h * 1.25, -h, -d * 0.94, d * 0.94, '#1e293b');

    // Front OLED Diagnostic Display
    addMeshBox(v, f, faceColors, -w * 0.88, -w * 0.35, -h * 0.7, h * 0.7, d, d + 0.03, '#0284c7');

    // Dual Gigabit WAN Ports (Orange/Yellow bezel)
    addMeshBox(v, f, faceColors, -w * 0.28, -w * 0.04, -h * 0.65, h * 0.65, d, d + 0.03, '#f59e0b');
    addMeshBox(v, f, faceColors, w * 0.04, w * 0.28, -h * 0.65, h * 0.65, d, d + 0.03, '#f59e0b');

    // 3 Gigabit LAN Ports
    addMeshBox(v, f, faceColors, w * 0.36, w * 0.52, -h * 0.65, h * 0.65, d, d + 0.03, '#475569');
    addMeshBox(v, f, faceColors, w * 0.56, w * 0.72, -h * 0.65, h * 0.65, d, d + 0.03, '#475569');
    addMeshBox(v, f, faceColors, w * 0.76, w * 0.92, -h * 0.65, h * 0.65, d, d + 0.03, '#475569');

    // 4 High-Gain Antennas
    const antConfigs = [
        { baseX: -w * 0.95, baseZ: -d * 0.88, tipX: -w * 1.28, tipY: -1.1, tipZ: -d * 1.35 },
        { baseX: -w * 0.50, baseZ: -d * 0.98, tipX: -w * 0.65, tipY: -1.2, tipZ: -d * 1.45 },
        { baseX: w * 0.50, baseZ: -d * 0.98, tipX: w * 0.65, tipY: -1.2, tipZ: -d * 1.45 },
        { baseX: w * 0.95, baseZ: -d * 0.88, tipX: w * 1.28, tipY: -1.1, tipZ: -d * 1.35 }
    ];
    antConfigs.forEach(ant => {
        addMeshBox(v, f, faceColors, ant.baseX - 0.06, ant.baseX + 0.06, -h * 1.5, -h, ant.baseZ - 0.06, ant.baseZ + 0.06, '#d97706');
        const base = v.length;
        const bw = 0.04;
        v.push([ant.baseX - bw, -h * 1.5, ant.baseZ - bw]);
        v.push([ant.baseX + bw, -h * 1.5, ant.baseZ - bw]);
        v.push([ant.tipX + bw, ant.tipY, ant.tipZ - bw]);
        v.push([ant.tipX - bw, ant.tipY, ant.tipZ - bw]);
        f.push([base, base + 1, base + 2, base + 3]);
        faceColors.push('#1e293b');
    });

    return { vertices: v, faces: f, color: '#0f172a', faceColors };
}

/* ─── 4. Network Switch 3D Mesh ─── */
function buildNetworkSwitchMesh(dims) {
    const v = [];
    const f = [];
    const faceColors = [];
    const w = ((dims?.width || 16) / 16) * 1.35;
    const h = ((dims?.height || 3.5) / 3.5) * 0.22;
    const d = ((dims?.depth || 9) / 9) * 0.75;

    // 1U Switch Chassis
    addMeshBox(v, f, faceColors, -w, w, -h, h, -d, d, '#1e293b');

    // Left and Right 19" Rack Mounting Ears
    addMeshBox(v, f, faceColors, -w * 1.18, -w, -h * 1.18, h * 1.18, d * 0.6, d, '#475569'); // Left Ear
    addMeshBox(v, f, faceColors, w, w * 1.18, -h * 1.18, h * 1.18, d * 0.6, d, '#475569');  // Right Ear

    // Front Status LED & Management Console Port
    addMeshBox(v, f, faceColors, -w * 0.92, -w * 0.78, -h * 0.7, h * 0.7, d, d + 0.03, '#0284c7');

    // 24 Gigabit Ethernet Ports (3 blocks of 8)
    for (let b = 0; b < 3; b++) {
        const blockX = -w * 0.70 + b * (w * 0.48);
        addMeshBox(v, f, faceColors, blockX, blockX + w * 0.42, -h * 0.75, -h * 0.1, d, d + 0.03, '#334155');
        addMeshBox(v, f, faceColors, blockX, blockX + w * 0.42, h * 0.1, h * 0.75, d, d + 0.03, '#334155');
        addMeshBox(v, f, faceColors, blockX, blockX + w * 0.42, -h * 0.95, -h * 0.8, d, d + 0.02, '#22c55e');
    }

    // Dual 10G SFP+ Optical Transceiver Cages
    addMeshBox(v, f, faceColors, w * 0.78, w * 0.87, -h * 0.7, h * 0.7, d, d + 0.04, '#cbd5e1');
    addMeshBox(v, f, faceColors, w * 0.90, w * 0.99, -h * 0.7, h * 0.7, d, d + 0.04, '#cbd5e1');

    return { vertices: v, faces: f, color: '#1e293b', faceColors };
}

/* ─── 5. CS Laptop 3D Mesh ─── */
function buildLaptopMesh(dims) {
    const v = [];
    const f = [];
    const faceColors = [];
    const w = ((dims?.width || 13) / 13) * 1.15;
    const h = ((dims?.height || 9) / 9) * 0.9;
    const d = ((dims?.depth || 10) / 10) * 0.85;

    // Lower Base Deck (Chassis)
    addMeshBox(v, f, faceColors, -w, w, 0.28, 0.38, -d, d, '#334155');
    // Keyboard Deck
    addMeshBox(v, f, faceColors, -w * 0.82, w * 0.82, 0.25, 0.28, -d * 0.75, d * 0.18, '#0f172a');
    // Trackpad
    addMeshBox(v, f, faceColors, -w * 0.30, w * 0.30, 0.26, 0.28, d * 0.35, d * 0.85, '#475569');

    // Angled Display Lid (Tilted backwards in 3D at ~115°)
    const lidBase = v.length;
    v.push([-w, 0.28, -d]);
    v.push([w, 0.28, -d]);
    v.push([w, -h * 1.15, -d * 1.55]);
    v.push([-w, -h * 1.15, -d * 1.55]);
    f.push([lidBase, lidBase + 1, lidBase + 2, lidBase + 3]);
    faceColors.push('#1e293b'); // Outer Lid Bezel

    // Glowing Display Screen Face (Active Network Terminal)
    const sw = w * 0.90;
    const screenBase = v.length;
    v.push([-sw, 0.18, -d * 1.05]);
    v.push([sw, 0.18, -d * 1.05]);
    v.push([sw, -h * 1.05, -d * 1.53]);
    v.push([-sw, -h * 1.05, -d * 1.53]);
    f.push([screenBase, screenBase + 1, screenBase + 2, screenBase + 3]);
    faceColors.push('#0284c7'); // Active terminal screen

    return { vertices: v, faces: f, color: '#334155', faceColors };
}

/* ─── 6. IP Patch Panel 3D Mesh ─── */
function buildIpPanelMesh(dims) {
    const v = [];
    const f = [];
    const faceColors = [];
    const w = ((dims?.width || 16) / 16) * 1.35;
    const h = ((dims?.height || 3.5) / 3.5) * 0.22;
    const d = ((dims?.depth || 6) / 6) * 0.15;

    // 1U Steel Patch Panel Faceplate
    addMeshBox(v, f, faceColors, -w, w, -h, h, -d, d, '#0f172a');
    // Left & Right Rack Ears
    addMeshBox(v, f, faceColors, -w * 1.18, -w, -h * 1.18, h * 1.18, -d * 0.3, d, '#475569');
    addMeshBox(v, f, faceColors, w, w * 1.18, -h * 1.18, h * 1.18, -d * 0.3, d, '#475569');
    // Rear Cable Management Shelf Bar
    addMeshBox(v, f, faceColors, -w * 0.92, w * 0.92, -h * 0.22, h * 0.22, -d * 3.8, -d, '#334155');

    // 4 Modular Color-Coded Keystone Groups (6 Ports Each = 24 Ports Total)
    const groups = [
        { xStart: -w * 0.92, color: '#0284c7' }, // Blue - Servers
        { xStart: -w * 0.44, color: '#16a34a' }, // Green - Workstations
        { xStart: w * 0.04, color: '#9333ea' },  // Purple - APs
        { xStart: w * 0.52, color: '#ea580c' }   // Orange - Management
    ];
    groups.forEach(g => {
        addMeshBox(v, f, faceColors, g.xStart, g.xStart + w * 0.38, -h * 0.82, -h * 0.5, d, d + 0.02, '#f8fafc'); // Label strip
        addMeshBox(v, f, faceColors, g.xStart, g.xStart + w * 0.38, -h * 0.35, h * 0.75, d, d + 0.03, g.color);   // Keystone jacks
    });

    return { vertices: v, faces: f, color: '#0f172a', faceColors };
}

/* ─── External 3D File Parsers (.OBJ, .STL, .JSON) ─── */
export function parseOBJ(text, mtlText = null) {
    if (!text || typeof text !== 'string') return null;
    const lines = text.split('\n');
    const vertices = [];
    const faces = [];
    const vertexColors = [];
    let detectedColor = null;

    // Check if mtlText was provided with diffuse Kd color
    if (mtlText) {
        const kdMatch = mtlText.match(/Kd\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)/);
        if (kdMatch) {
            const r = Math.round(parseFloat(kdMatch[1]) * 255);
            const g = Math.round(parseFloat(kdMatch[2]) * 255);
            const b = Math.round(parseFloat(kdMatch[3]) * 255);
            detectedColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }
    }

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('v ')) {
            const parts = line.split(/\s+/).slice(1).map(Number);
            if (parts.length >= 3) {
                vertices.push([parts[0], -parts[1], parts[2]]);
                // If line has vertex colors: v x y z r g b
                if (parts.length >= 6) {
                    const r = parts[3] <= 1.0 ? Math.round(parts[3] * 255) : Math.min(255, parts[3]);
                    const g = parts[4] <= 1.0 ? Math.round(parts[4] * 255) : Math.min(255, parts[4]);
                    const b = parts[5] <= 1.0 ? Math.round(parts[5] * 255) : Math.min(255, parts[5]);
                    vertexColors.push([r, g, b]);
                }
            }
        } else if (line.startsWith('f ')) {
            const parts = line.split(/\s+/).slice(1).map(p => {
                const idx = parseInt(p.split('/')[0], 10);
                return idx > 0 ? idx - 1 : vertices.length + idx;
            });
            if (parts.length >= 3) faces.push(parts);
        } else if (line.startsWith('Kd ') && !detectedColor) {
            const parts = line.split(/\s+/).slice(1).map(Number);
            if (parts.length >= 3) {
                const r = Math.round(parts[0] * 255);
                const g = Math.round(parts[1] * 255);
                const b = Math.round(parts[2] * 255);
                detectedColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
            }
        }
    }

    if (vertices.length === 0) return null;

    if (!detectedColor && vertexColors.length > 0) {
        const avgR = Math.round(vertexColors.reduce((s, c) => s + c[0], 0) / vertexColors.length);
        const avgG = Math.round(vertexColors.reduce((s, c) => s + c[1], 0) / vertexColors.length);
        const avgB = Math.round(vertexColors.reduce((s, c) => s + c[2], 0) / vertexColors.length);
        if (avgR + avgG + avgB > 30) {
            detectedColor = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB).toString(16).slice(1)}`;
        }
    }

    // Default vibrant color if unlit or black
    if (!detectedColor || detectedColor === '#000000' || detectedColor === '#111111') {
        const isEarth = /earth/i.test(text);
        detectedColor = isEarth ? '#38bdf8' : '#38bdf8';
    }

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

    return { vertices: normV, faces, color: detectedColor };
}

// ─── Export 3D Model Package (.OBJ + .MTL + JSON metadata) ───
export async function export3DModelPackage(obj, mesh) {
    const rawName = (obj.name || obj.modelType || 'model_3d').toLowerCase().replace(/\s+/g, '_');
    const safeMesh = mesh || get3DModelMesh(obj.modelType || 'cube', obj.dimensions);
    if (!safeMesh || !safeMesh.vertices || safeMesh.vertices.length === 0) {
        toast.error('No 3D geometry available to export');
        return;
    }

    const hexColor = obj.color || safeMesh.color || '#38bdf8';
    let r = 0.22, g = 0.74, b = 0.97;
    if (hexColor.startsWith('#') && hexColor.length >= 7) {
        r = (parseInt(hexColor.slice(1, 3), 16) / 255) || 0.22;
        g = (parseInt(hexColor.slice(3, 5), 16) / 255) || 0.74;
        b = (parseInt(hexColor.slice(5, 7), 16) / 255) || 0.97;
    }

    // 1. Generate OBJ file
    let objText = `# Wavefront OBJ file exported from Whiteboard\n`;
    objText += `# Model: ${obj.name || obj.modelType || '3D Object'}\n`;
    objText += `mtllib ${rawName}.mtl\n`;
    objText += `o ${rawName}\n\n`;

    // Vertices
    safeMesh.vertices.forEach(([x, y, z]) => {
        objText += `v ${x.toFixed(4)} ${(-y).toFixed(4)} ${z.toFixed(4)}\n`;
    });

    // Texture Coordinates (UV mapping)
    safeMesh.vertices.forEach(([x, y, z]) => {
        const u = (Math.atan2(z, x) / (2 * Math.PI) + 0.5).toFixed(4);
        const v = (y / 2 + 0.5).toFixed(4);
        objText += `vt ${u} ${v}\n`;
    });

    // Normals
    objText += `\nvn 0.0000 1.0000 0.0000\n`;
    objText += `vn 0.0000 -1.0000 0.0000\n`;
    objText += `vn 1.0000 0.0000 0.0000\n`;
    objText += `vn -1.0000 0.0000 0.0000\n`;
    objText += `vn 0.0000 0.0000 1.0000\n`;
    objText += `vn 0.0000 0.0000 -1.0000\n\n`;

    objText += `usemtl Material_${rawName}\n`;
    objText += `s 1\n`;

    // Faces (1-indexed)
    safeMesh.faces.forEach((face) => {
        if (face.length >= 3) {
            const fStr = face.map(idx => `${idx + 1}/${idx + 1}`).join(' ');
            objText += `f ${fStr}\n`;
        }
    });

    // 2. Generate MTL file
    let mtlText = `# Material Library for ${rawName}.obj\n`;
    mtlText += `newmtl Material_${rawName}\n`;
    mtlText += `Ka 0.2500 0.2500 0.2500\n`;
    mtlText += `Kd ${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}\n`;
    mtlText += `Ks 0.5000 0.5000 0.5000\n`;
    mtlText += `Ns 65.0\n`;
    mtlText += `d ${(obj.opacity !== undefined ? obj.opacity : 1.0).toFixed(2)}\n`;
    mtlText += `illum 2\n`;

    // 3. Package into ZIP with JSZip
    try {
        const zip = new JSZip();
        zip.file(`${rawName}.obj`, objText);
        zip.file(`${rawName}.mtl`, mtlText);
        zip.file(`metadata.json`, JSON.stringify({
            name: obj.name || obj.modelType,
            modelType: obj.modelType,
            dimensions: obj.dimensions || getDefaultDimensions(obj.modelType),
            unit: obj.unit || 'cm',
            color: hexColor,
            materialStyle: obj.materialStyle || 'shaded',
            isPlanet: ['earth', 'sun', 'moon', 'mars', 'jupiter', 'saturn', 'neptune'].includes((obj.modelType || '').toLowerCase()),
            exportedAt: new Date().toISOString()
        }, null, 2));

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `${rawName}_3d_package.zip`);
        toast.success(`Downloaded 3D Package (.OBJ + .MTL + JSON)!`, { icon: '📦' });
    } catch (err) {
        console.error('Failed to create 3D zip package:', err);
        // Fallback: direct OBJ download
        const blob = new Blob([objText], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, `${rawName}.obj`);
        toast.success(`Downloaded ${rawName}.obj!`, { icon: '📄' });
    }
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
export function shadeColor(colorStr, intensity, materialStyle) {
    if (!colorStr || colorStr === '#000000' || colorStr === 'black' || colorStr === 'rgb(0,0,0)' || colorStr === '#111111') {
        colorStr = '#38bdf8';
    }
    let r = 56, g = 189, b = 248;
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

    if (r === 0 && g === 0 && b === 0) {
        r = 56; g = 189; b = 248;
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

/* ─── Render 3D Object to Standalone SVG Element ─── */
export function render3DObjectSVG(obj) {
    if (!obj) return '';
    const w = obj.width || 220;
    const h = obj.height || 220;
    const userOpacity = obj.opacity !== undefined ? obj.opacity : 1;
    const rot = obj.rotation ? `transform="rotate(${obj.rotation} ${w / 2} ${h / 2})"` : '';

    const networkTexture = getNetworkTexture(obj.modelType);
    const activeTextureUri = obj.textureUrl || (networkTexture ? getTextureSVGDataUri(networkTexture.svg) : null);
    if ((obj.useImageTexture || obj.materialStyle === 'texture') && activeTextureUri) {
        return `<g ${rot}>
            <image href="${activeTextureUri}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" opacity="${userOpacity}" />
        </g>`;
    }

    const mesh = (obj.meshData && obj.meshData.vertices && obj.meshData.faces)
        ? obj.meshData
        : get3DModelMesh(obj.modelType || 'cube', obj.dimensions);
    if (!mesh || !mesh.vertices || !mesh.faces) return '';

    const rotX = obj.rotX ?? -25;
    const rotY = obj.rotY ?? 45;
    const rotZ = obj.rotZ ?? 0;
    const radX = (rotX * Math.PI) / 180;
    const radY = (rotY * Math.PI) / 180;
    const radZ = (rotZ * Math.PI) / 180;

    const cosX = Math.cos(radX), sinX = Math.sin(radX);
    const cosY = Math.cos(radY), sinY = Math.sin(radY);
    const cosZ = Math.cos(radZ), sinZ = Math.sin(radZ);

    let lx = 0.5, ly = -0.7, lz = 0.5;
    if (obj.lightPreset === 'top') { lx = 0.1; ly = -0.95; lz = 0.3; }
    else if (obj.lightPreset === 'flat') { lx = 0; ly = 0; lz = 1; }

    const transformedVertices = mesh.vertices.map(([vx, vy, vz]) => {
        let x1 = vx * cosY + vz * sinY;
        let y1 = vy;
        let z1 = -vx * sinY + vz * cosY;

        let x2 = x1;
        let y2 = y1 * cosX - z1 * sinX;
        let z2 = y1 * sinX + z1 * cosX;

        let x3 = x2 * cosZ - y2 * sinZ;
        let y3 = x2 * sinZ + y2 * cosZ;
        let z3 = z2;

        const isIsometric = (obj.projectionMode || 'isometric') === 'isometric';
        const distance = 10;
        const factor = isIsometric ? 1.0 : (distance / (distance + z3));
        const scale = (Math.min(w, h) / 2) * 0.8;
        const px = w / 2 + x3 * factor * scale;
        const py = h / 2 + y3 * factor * scale;
        return { px, py, pz: z3, x3, y3, z3 };
    });

    const baseColor = obj.color || mesh.color || '#3b82f6';
    const isWireframe = obj.materialStyle === 'wireframe' || !!obj.wireframeOnly;
    const isGlass = obj.materialStyle === 'glass';
    const isFlat = obj.materialStyle === 'flat';

    const mType = (obj.modelType || 'cube').toLowerCase();
    const isSpherical = ['sphere', 'sun', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'neptune'].includes(mType);
    const isCone = mType === 'cone';
    const isCylinder = mType === 'cylinder';
    const isCurved = isSpherical || isCone || isCylinder;

    const renderedFaces = mesh.faces.map((faceIndices, faceIdx) => {
        if (faceIndices.length < 3) return null;
        const v0 = transformedVertices[faceIndices[0]];
        const v1 = transformedVertices[faceIndices[1]];
        const v2 = transformedVertices[faceIndices[2]];
        if (!v0 || !v1 || !v2) return null;

        const ax = v1.x3 - v0.x3, ay = v1.y3 - v0.y3, az = v1.z3 - v0.z3;
        const bx = v2.x3 - v0.x3, by = v2.y3 - v0.y3, bz = v2.z3 - v0.z3;
        const nx = ay * bz - az * by;
        const ny = az * bx - ax * bz;
        const nz = ax * by - ay * bx;
        const len = Math.hypot(nx, ny, nz) || 1;
        const nnx = nx / len, nny = ny / len, nnz = nz / len;

        const dot = nnx * lx + nny * ly + nnz * lz;
        const effDot = nnz < 0 ? -dot : dot;
        const intensity = isFlat ? 1.0 : Math.max(0.25, Math.min(1.0, effDot));
        const avgZ = faceIndices.reduce((sum, idx) => sum + (transformedVertices[idx]?.pz || 0), 0) / faceIndices.length;

        const pointsStr = faceIndices
            .map(idx => `${transformedVertices[idx].px.toFixed(1)},${transformedVertices[idx].py.toFixed(1)}`)
            .join(' ');

        const specificColor = (mesh.faceColors && mesh.faceColors[faceIdx]) || baseColor;
        let faceFill = shadeColor(specificColor, intensity, obj.materialStyle);
        let faceOpacity = userOpacity;
        if (isWireframe) {
            faceFill = 'transparent';
            faceOpacity = 0;
        } else if (isGlass) {
            faceOpacity = Math.max(0.15, Math.min(0.85, (userOpacity * 0.35) + (intensity * 0.35)));
        }

        return { pointsStr, avgZ, faceFill, faceOpacity };
    }).filter(Boolean);

    renderedFaces.sort((a, b) => b.avgZ - a.avgZ);

    const strokeDash = obj.edgeStyle === 'dashed' ? '4,3' : (obj.edgeStyle === 'dotted' ? '2,2' : undefined);
    const strokeColor = isWireframe ? (obj.edgeColor || baseColor) : (obj.edgeColor || '#ffffff');
    const strokeW = obj.edgeWidth !== undefined ? obj.edgeWidth : (isWireframe ? 1.5 : 1);
    const dashAttr = strokeDash ? `stroke-dasharray="${strokeDash}"` : '';

    let polygons = '';
    if (!isWireframe || !isCurved) {
        polygons = renderedFaces.map(face => {
            const fStrokeColor = isWireframe
                ? (obj.edgeColor || baseColor)
                : (isCurved ? face.faceFill : (obj.edgeColor || (obj.edgeWidth ? '#ffffff' : face.faceFill)));
            const fStrokeW = isWireframe
                ? (obj.edgeWidth !== undefined ? obj.edgeWidth : 1)
                : (isCurved ? 0.5 : (obj.edgeWidth !== undefined ? obj.edgeWidth : 0.8));
            const fStrokeOp = isWireframe
                ? 1
                : (isCurved ? face.faceOpacity : (obj.edgeWidth === 0 ? 0 : (obj.materialStyle === 'glass' ? 0.9 : 0.6)));

            return `<polygon points="${face.pointsStr}" fill="${face.faceFill}" fill-opacity="${face.faceOpacity}" stroke="${fStrokeColor}" stroke-width="${fStrokeW}" stroke-opacity="${fStrokeOp}" ${dashAttr} stroke-linecap="round" stroke-linejoin="round" />`;
        }).join('\n        ');
    }

    // Clean aesthetic 3D contours for curved shapes
    let contourElements = '';
    const cx = w / 2;
    const cy = h / 2;
    const r = (Math.min(w, h) / 2) * 0.8;

    if (isSpherical) {
        if (isWireframe || (obj.edgeWidth !== undefined ? obj.edgeWidth > 0 : false)) {
            const rxTilt = Math.max(4, r * Math.abs(Math.sin((rotX || -25) * Math.PI / 180)));
            const ryTilt = Math.max(4, r * Math.abs(Math.sin((rotY || 45) * Math.PI / 180)));
            contourElements = `
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${strokeColor}" stroke-width="${strokeW}" ${dashAttr} />
            <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${rxTilt.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeW}" stroke-opacity="0.8" ${dashAttr} />
            <ellipse cx="${cx}" cy="${cy}" rx="${ryTilt.toFixed(1)}" ry="${r}" fill="none" stroke="${strokeColor}" stroke-width="${strokeW}" stroke-opacity="0.8" ${dashAttr} />`;
            if (mType === 'saturn') {
                contourElements += `
            <ellipse cx="${cx}" cy="${cy}" rx="${(r * 1.55).toFixed(1)}" ry="${(rxTilt * 1.55).toFixed(1)}" fill="none" stroke="#fde047" stroke-width="${strokeW}" stroke-opacity="0.9" />
            <ellipse cx="${cx}" cy="${cy}" rx="${(r * 1.9).toFixed(1)}" ry="${(rxTilt * 1.9).toFixed(1)}" fill="none" stroke="#ca8a04" stroke-width="${strokeW}" stroke-opacity="0.9" />`;
            }
        }
    } else if (isCone) {
        if (isWireframe || (obj.edgeWidth !== undefined ? obj.edgeWidth > 0 : false)) {
            const apex = transformedVertices[0];
            const baseCenter = transformedVertices[transformedVertices.length - 1];
            const baseRx = r * 0.9;
            const baseRy = Math.max(6, baseRx * 0.35);
            contourElements = `
            <ellipse cx="${baseCenter?.px || cx}" cy="${baseCenter?.py || (cy + r * 0.6)}" rx="${baseRx.toFixed(1)}" ry="${baseRy.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeW}" ${dashAttr} />
            <line x1="${apex?.px || cx}" y1="${apex?.py || (cy - r)}" x2="${(baseCenter?.px || cx) - baseRx}" y2="${baseCenter?.py || (cy + r * 0.6)}" stroke="${strokeColor}" stroke-width="${strokeW}" stroke-linecap="round" />
            <line x1="${apex?.px || cx}" y1="${apex?.py || (cy - r)}" x2="${(baseCenter?.px || cx) + baseRx}" y2="${baseCenter?.py || (cy + r * 0.6)}" stroke="${strokeColor}" stroke-width="${strokeW}" stroke-linecap="round" />`;
        }
    } else if (isCylinder) {
        if (isWireframe || (obj.edgeWidth !== undefined ? obj.edgeWidth > 0 : false)) {
            const rx = r * 0.85;
            const ry = Math.max(6, rx * 0.35);
            const topY = cy - r * 0.65;
            const botY = cy + r * 0.65;
            contourElements = `
            <ellipse cx="${cx}" cy="${topY}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeW}" ${dashAttr} />
            <ellipse cx="${cx}" cy="${botY}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeW}" ${dashAttr} />
            <line x1="${cx - rx}" y1="${topY}" x2="${cx - rx}" y2="${botY}" stroke="${strokeColor}" stroke-width="${strokeW}" stroke-linecap="round" />
            <line x1="${cx + rx}" y1="${topY}" x2="${cx + rx}" y2="${botY}" stroke="${strokeColor}" stroke-width="${strokeW}" stroke-linecap="round" />`;
        }
    }

    // Dimension labels and arrows in static SVG export
    let dimensionElements = '';
    if (obj.showDimensions) {
        const annotations = getDimensionAnnotations(obj, transformedVertices, w, h);
        if (annotations.length > 0) {
            dimensionElements = `
            <defs>
                <marker id="dim-arrow-${obj.id || 'svg'}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
                </marker>
            </defs>` + annotations.map(a => {
                const markerAttr = `marker-start="url(#dim-arrow-${obj.id || 'svg'})" marker-end="url(#dim-arrow-${obj.id || 'svg'})"`;
                const lineDash = a.type === 'dashed-line' ? 'stroke-dasharray="3,3"' : '';
                return `
                <line x1="${a.x1.toFixed(1)}" y1="${a.y1.toFixed(1)}" x2="${a.x2.toFixed(1)}" y2="${a.y2.toFixed(1)}" stroke="#38bdf8" stroke-width="1.5" ${lineDash} ${markerAttr} />
                <rect x="${(a.midX - 32).toFixed(1)}" y="${(a.midY - 9).toFixed(1)}" width="64" height="18" rx="4" fill="#0f172a" fill-opacity="0.88" stroke="#38bdf8" stroke-width="1" />
                <text x="${a.midX.toFixed(1)}" y="${(a.midY + 3.5).toFixed(1)}" text-anchor="middle" fill="#38bdf8" font-size="10" font-weight="bold" font-family="monospace">${a.label}</text>`;
            }).join('');
        }
    }

    return `<g transform="translate(${obj.x || 0}, ${obj.y || 0}) ${rot}">
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        ${polygons}
        ${contourElements}
        ${dimensionElements}
    </svg>
</g>`;
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
    onSendToBack,
    scale = 1
}) {
    const [rotX, setRotX] = useState(obj.rotX || -25);
    const [rotY, setRotY] = useState(obj.rotY || 45);
    const [rotZ, setRotZ] = useState(obj.rotZ || 0);
    const [is3DDragging, setIs3DDragging] = useState(false);
    const [isRotating2D, setIsRotating2D] = useState(false);
    const [liveRotation, setLiveRotation] = useState(obj.rotation || 0);
    const [showDimensionsPopover, setShowDimensionsPopover] = useState(false);
    const [showTexturePopover, setShowTexturePopover] = useState(false);
    const textureFileInputRef = useRef(null);
    const [activeEdgeDrag, setActiveEdgeDrag] = useState(null);
    const lastPointerRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (typeof obj.rotX === 'number') setRotX(obj.rotX);
        if (typeof obj.rotY === 'number') setRotY(obj.rotY);
        if (typeof obj.rotZ === 'number') setRotZ(obj.rotZ);
        if (typeof obj.rotation === 'number') setLiveRotation(obj.rotation);
    }, [obj.rotX, obj.rotY, obj.rotZ, obj.rotation]);

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
        return get3DModelMesh(obj.modelType || 'cube', obj.dimensions);
    }, [obj.meshData, obj.modelType, obj.dimensions]);

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

            // Perspective division / Isometric
            const isIsometric = (obj.projectionMode || 'isometric') === 'isometric';
            const distance = 10;
            const factor = isIsometric ? 1.0 : (distance / (distance + z3));
            const scale = (Math.min(obj.width || 220, obj.height || 220) / 2) * 0.8;

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

        const renderedFaces = mesh.faces.map((faceIndices, faceIdx) => {
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

            // Two-sided diffuse lighting intensity: flip normal if facing away so both sides are illuminated
            const dot = nnx * lx + nny * ly + nnz * lz;
            const effDot = nnz < 0 ? -dot : dot;
            const intensity = isFlat ? 1.0 : Math.max(0.25, Math.min(1.0, effDot));
            const avgZ = faceIndices.reduce((sum, idx) => sum + (transformedVertices[idx]?.pz || 0), 0) / faceIndices.length;

            const pointsStr = faceIndices
                .map(idx => `${transformedVertices[idx].px.toFixed(1)},${transformedVertices[idx].py.toFixed(1)}`)
                .join(' ');

            const specificColor = (mesh.faceColors && mesh.faceColors[faceIdx]) || baseColor;
            let faceFill = shadeColor(specificColor, intensity, obj.materialStyle);
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

        return { renderedFaces, baseColor, transformedVertices };
    }, [rotX, rotY, rotZ, mesh, obj.width, obj.height, obj.color, obj.materialStyle, obj.wireframeOnly, obj.opacity, obj.lightPreset, obj.projectionMode, obj.dimensions]);

    // Dimension Annotations Memo
    const dimensionAnnotations = useMemo(() => {
        if (!obj.showDimensions && !isSelected) return [];
        return getDimensionAnnotations(obj, projectedFaces.transformedVertices, obj.width || 220, obj.height || 220);
    }, [obj.showDimensions, isSelected, obj.modelType, obj.name, obj.dimensions, obj.unit, projectedFaces.transformedVertices, obj.width, obj.height]);

    // Dimension fields config helper per model type
    const getDimensionFieldsForType = useCallback((modelType) => {
        switch ((modelType || '').toLowerCase()) {
            case 'prism':
                return [
                    { key: 'base', label: 'Base Width (b)', default: 10, min: 2, max: 30, step: 0.5 },
                    { key: 'height', label: 'Triangle Height (h)', default: 10, min: 2, max: 30, step: 0.5 },
                    { key: 'depth', label: 'Prism Length (l)', default: 12, min: 2, max: 30, step: 0.5 }
                ];
            case 'cylinder':
                return [
                    { key: 'radius', label: 'Base Radius (r)', default: 5, min: 1, max: 20, step: 0.5 },
                    { key: 'height', label: 'Cylinder Height (h)', default: 12, min: 2, max: 30, step: 0.5 }
                ];
            case 'cone':
                return [
                    { key: 'radius', label: 'Base Radius (r)', default: 5, min: 1, max: 20, step: 0.5 },
                    { key: 'height', label: 'Cone Height (h)', default: 12, min: 2, max: 30, step: 0.5 }
                ];
            case 'cube':
                return [
                    { key: 'width', label: 'Width (w)', default: 10, min: 2, max: 30, step: 0.5 },
                    { key: 'height', label: 'Height (h)', default: 10, min: 2, max: 30, step: 0.5 },
                    { key: 'depth', label: 'Depth (d)', default: 10, min: 2, max: 30, step: 0.5 }
                ];
            case 'pyramid':
                return [
                    { key: 'width', label: 'Base Width (w)', default: 10, min: 2, max: 30, step: 0.5 },
                    { key: 'depth', label: 'Base Depth (d)', default: 10, min: 2, max: 30, step: 0.5 },
                    { key: 'height', label: 'Apex Height (h)', default: 12, min: 2, max: 30, step: 0.5 }
                ];
            case 'sphere':
            case 'sun':
            case 'earth':
            case 'moon':
            case 'mars':
            case 'jupiter':
            case 'saturn':
            case 'neptune':
                return [
                    { key: 'radius', label: 'Radius (r)', default: 6, min: 1, max: 25, step: 0.5 }
                ];
            case 'optical_fiber':
            case 'fiber':
            case 'fiber_optic':
                return [
                    { key: 'outerRadius', label: 'Jacket Radius (r)', default: 5, min: 2, max: 20, step: 0.5 },
                    { key: 'length', label: 'Cable Length (l)', default: 16, min: 4, max: 40, step: 0.5 }
                ];
            case 'twisted_cables':
            case 'twisted_pair':
            case 'utp':
            case 'ethernet_cable':
                return [
                    { key: 'radius', label: 'Cable Radius (r)', default: 5, min: 2, max: 20, step: 0.5 },
                    { key: 'length', label: 'Cable Length (l)', default: 16, min: 4, max: 40, step: 0.5 }
                ];
            case 'multwan_router':
            case 'multi_wan_router':
            case 'multiwan':
            case 'wan_router':
                return [
                    { key: 'width', label: 'Chassis Width (w)', default: 14, min: 6, max: 30, step: 0.5 },
                    { key: 'height', label: 'Chassis Height (h)', default: 4, min: 2, max: 15, step: 0.5 },
                    { key: 'depth', label: 'Chassis Depth (d)', default: 10, min: 4, max: 25, step: 0.5 }
                ];
            case 'network_switch':
            case 'switch':
            case 'managed_switch':
                return [
                    { key: 'width', label: 'Rack Width (w)', default: 16, min: 8, max: 30, step: 0.5 },
                    { key: 'height', label: '1U Height (h)', default: 3.5, min: 2, max: 15, step: 0.5 },
                    { key: 'depth', label: 'Chassis Depth (d)', default: 9, min: 4, max: 25, step: 0.5 }
                ];
            case 'laptop':
            case 'cs_laptop':
            case 'workstation_laptop':
                return [
                    { key: 'width', label: 'Width (w)', default: 13, min: 6, max: 30, step: 0.5 },
                    { key: 'height', label: 'Screen Height (h)', default: 9, min: 3, max: 25, step: 0.5 },
                    { key: 'depth', label: 'Base Depth (d)', default: 10, min: 4, max: 25, step: 0.5 }
                ];
            case 'ip_panel':
            case 'patch_panel':
            case 'ip_patch_panel':
                return [
                    { key: 'width', label: '19" Panel Width (w)', default: 16, min: 8, max: 30, step: 0.5 },
                    { key: 'height', label: '1U Height (h)', default: 3.5, min: 2, max: 15, step: 0.5 },
                    { key: 'depth', label: 'Shelf Depth (d)', default: 6, min: 2, max: 20, step: 0.5 }
                ];
            default:
                return [
                    { key: 'width', label: 'Width (w)', default: 10, min: 2, max: 30, step: 0.5 },
                    { key: 'height', label: 'Height (h)', default: 10, min: 2, max: 30, step: 0.5 },
                    { key: 'depth', label: 'Depth (d)', default: 10, min: 2, max: 30, step: 0.5 }
                ];
        }
    }, []);

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
        if (!isSelected || e.shiftKey || e.ctrlKey || e.metaKey) {
            onSelect && onSelect(obj.id, e);
        }

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
        let lastDx = 0;
        let lastDy = 0;

        const onMove = (moveEvt) => {
            const dx = (moveEvt.clientX - startX) / (scale || 1);
            const dy = (moveEvt.clientY - startY) / (scale || 1);
            const stepDx = dx - lastDx;
            const stepDy = dy - lastDy;
            lastDx = dx;
            lastDy = dy;
            onUpdate && onUpdate({ x: initialX + dx, y: initialY + dy }, { stepDx, stepDy, totalDx: dx, totalDy: dy });
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
            const dx = (moveEvt.clientX - startX) / (scale || 1);
            const dy = (moveEvt.clientY - startY) / (scale || 1);
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

    // 2D Rotation with radial dial support and 45° snapping
    const handleRotateStart = (e) => {
        if (obj.isLocked) return;
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();

        setIsRotating2D(true);
        setLiveRotation(obj.rotation || 0);

        const canvasEl = document.getElementById('main-whiteboard-canvas') || document.querySelector('.whiteboard-canvas');
        const rect = canvasEl?.getBoundingClientRect();
        const scaleToScreenX = (canvasEl && canvasEl.width > 0 && rect) ? rect.width / canvasEl.width : 1;
        const scaleToScreenY = (canvasEl && canvasEl.height > 0 && rect) ? rect.height / canvasEl.height : 1;

        const centerX = (obj.x || 0) + (obj.width || 220) / 2;
        const centerY = (obj.y || 0) + (obj.height || 220) / 2;
        const canvasCenterX = rect ? rect.left + centerX * scaleToScreenX : centerX;
        const canvasCenterY = rect ? rect.top + centerY * scaleToScreenY : centerY;

        const startPointerX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const startPointerY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        const startAngle = Math.atan2(startPointerY - canvasCenterY, startPointerX - canvasCenterX);
        const startObjRot = obj.rotation || 0;

        const onMove = (moveEvt) => {
            const currentX = moveEvt.clientX !== undefined ? moveEvt.clientX : (moveEvt.touches && moveEvt.touches[0] ? moveEvt.touches[0].clientX : startPointerX);
            const currentY = moveEvt.clientY !== undefined ? moveEvt.clientY : (moveEvt.touches && moveEvt.touches[0] ? moveEvt.touches[0].clientY : startPointerY);
            const currentAngle = Math.atan2(currentY - canvasCenterY, currentX - canvasCenterX);
            const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);
            const newRotation = snapRotationAngle(startObjRot + angleDiff);

            setLiveRotation(newRotation);
            onUpdate && onUpdate({ rotation: newRotation });
        };

        const onUp = () => {
            setIsRotating2D(false);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
    };

    // 3D Parametric Edge Hold-and-Drag Resizing
    const handleEdgeDragStart = (dimKey, p1, p2, e) => {
        if (obj.isLocked) return;
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();

        const startClientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const startClientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

        const currentDims = { ...getDefaultDimensions(mType), ...(obj.dimensions || {}) };
        const startVal = currentDims[dimKey] !== undefined ? currentDims[dimKey] : 10;

        const edgeDx = p2.x - p1.x;
        const edgeDy = p2.y - p1.y;
        const edgeLen = Math.hypot(edgeDx, edgeDy) || 1;
        const ux = edgeDx / edgeLen;
        const uy = edgeDy / edgeLen;

        setActiveEdgeDrag({
            dimKey,
            currentVal: startVal,
            label: `${dimKey}: ${startVal} ${obj.unit || 'cm'}`
        });

        const onMove = (moveEvt) => {
            const clientX = moveEvt.clientX !== undefined ? moveEvt.clientX : (moveEvt.touches && moveEvt.touches[0] ? moveEvt.touches[0].clientX : startClientX);
            const clientY = moveEvt.clientY !== undefined ? moveEvt.clientY : (moveEvt.touches && moveEvt.touches[0] ? moveEvt.touches[0].clientY : startClientY);

            const dx = (clientX - startClientX) / (scale || 1);
            const dy = (clientY - startClientY) / (scale || 1);

            const proj = (dx * ux + dy * uy);
            const deltaUnits = proj * 0.12;

            const nextVal = Math.max(1, Math.min(100, +(startVal + deltaUnits).toFixed(1)));

            setActiveEdgeDrag({
                dimKey,
                currentVal: nextVal,
                label: `${dimKey}: ${nextVal} ${obj.unit || 'cm'}`
            });

            const nextDims = {
                ...getDefaultDimensions(mType),
                ...(obj.dimensions || {}),
                [dimKey]: nextVal
            };
            onUpdate && onUpdate({ dimensions: nextDims });
        };

        const onUp = () => {
            setActiveEdgeDrag(null);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
    };

    // Stroke Dasharray resolution for edges
    const strokeDash = useMemo(() => {
        const sw = obj.edgeWidth !== undefined ? obj.edgeWidth : 0.8;
        if (obj.edgeStyle === 'dashed') return `${Math.max(2, sw * 4)},${Math.max(2, sw * 3)}`;
        if (obj.edgeStyle === 'dotted') return `${Math.max(1, sw)},${Math.max(2, sw * 2)}`;
        return undefined;
    }, [obj.edgeStyle, obj.edgeWidth]);

    const mType = (obj.modelType || 'cube').toLowerCase();
    const planetType = ['sun', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'neptune'].find(
        p => mType.includes(p) || (obj.name && obj.name.toLowerCase().includes(p))
    );
    const isPlanet = !!planetType;
    const isSpherical = isPlanet || mType === 'sphere';
    const isCone = mType === 'cone';
    const isCylinder = mType === 'cylinder';
    const isCurved = isSpherical || isCone || isCylinder;
    const isWireframe = obj.materialStyle === 'wireframe' || !!obj.wireframeOnly;

    // Network & Computer Science Image Texture Decal Resolution
    const networkTexture = getNetworkTexture(obj.modelType);
    const activeTextureUri = obj.textureUrl || (networkTexture ? getTextureSVGDataUri(networkTexture.svg) : null);
    const hasTexture = !!activeTextureUri;
    const isTextureMode = (obj.useImageTexture || obj.materialStyle === 'texture') && hasTexture;

    const compCx = (obj.width || 220) / 2;
    const compCy = (obj.height || 220) / 2;
    const compR = (Math.min(obj.width || 220, obj.height || 220) / 2) * 0.8;
    const compStrokeColor = isWireframe ? (obj.edgeColor || projectedFaces.baseColor) : (obj.edgeColor || '#ffffff');
    const compStrokeW = obj.edgeWidth !== undefined ? obj.edgeWidth : (isWireframe ? 1.5 : 1);

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                onSelect && onSelect(obj.id, e);
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
            data-3d-id={obj.id}
            className={`whiteboard-3d-object absolute select-none group cursor-move ${
                isSelected ? 'ring-2 ring-sky-500 rounded-xl shadow-2xl' : ''
            }`}
        >
            {/* Real 3D Planet Surface Renderer (for celestial bodies in solid/realistic mode) */}
            {isPlanet && !isWireframe && (
                <div className="absolute inset-0 pointer-events-none overflow-visible rounded-full">
                    <PlanetRenderer3D
                        modelType={planetType || mType}
                        width={obj.width || 220}
                        height={obj.height || 220}
                        rotX={rotX}
                        rotY={rotY}
                        rotZ={rotZ}
                        lightPreset={obj.lightPreset}
                    />
                </div>
            )}

            {/* SVG 3D Canvas */}
            <svg
                viewBox={`0 0 ${obj.width || 220} ${obj.height || 220}`}
                className="w-full h-full pointer-events-none drop-shadow-md overflow-visible"
            >
                {/* Photorealistic 3D Image Decal / Texture Layer */}
                {isTextureMode && !isWireframe && (
                    <image
                        href={activeTextureUri}
                        x={0}
                        y={0}
                        width={obj.width || 220}
                        height={obj.height || 220}
                        preserveAspectRatio="xMidYMid meet"
                        opacity={obj.opacity !== undefined ? obj.opacity : 1}
                        style={{
                            filter: obj.materialStyle === 'glass'
                                ? 'opacity(0.7) drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
                                : 'drop-shadow(0 8px 16px rgba(0,0,0,0.45))'
                        }}
                    />
                )}

                {!isTextureMode && (!isPlanet || isWireframe) && (!isWireframe || !isCurved) && projectedFaces.renderedFaces.map((face, fIdx) => {
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

                {/* Clean aesthetic 3D contours for curved shapes */}
                {isSpherical && (isWireframe || (obj.edgeWidth !== undefined ? obj.edgeWidth > 0 : false)) && (
                    <g>
                        <circle
                            cx={compCx}
                            cy={compCy}
                            r={compR}
                            fill="none"
                            stroke={compStrokeColor}
                            strokeWidth={compStrokeW}
                            strokeDasharray={strokeDash}
                        />
                        <ellipse
                            cx={compCx}
                            cy={compCy}
                            rx={compR}
                            ry={Math.max(4, compR * Math.abs(Math.sin((rotX || -25) * Math.PI / 180)))}
                            fill="none"
                            stroke={compStrokeColor}
                            strokeWidth={compStrokeW}
                            strokeOpacity={0.8}
                            strokeDasharray={strokeDash}
                        />
                        <ellipse
                            cx={compCx}
                            cy={compCy}
                            rx={Math.max(4, compR * Math.abs(Math.sin((rotY || 45) * Math.PI / 180)))}
                            ry={compR}
                            fill="none"
                            stroke={compStrokeColor}
                            strokeWidth={compStrokeW}
                            strokeOpacity={0.8}
                            strokeDasharray={strokeDash}
                        />
                        {mType === 'saturn' && (
                            <>
                                <ellipse
                                    cx={compCx}
                                    cy={compCy}
                                    rx={compR * 1.55}
                                    ry={Math.max(6, compR * 1.55 * Math.abs(Math.sin((rotX || -25) * Math.PI / 180)))}
                                    fill="none"
                                    stroke="#fde047"
                                    strokeWidth={compStrokeW}
                                    strokeOpacity={0.9}
                                />
                                <ellipse
                                    cx={compCx}
                                    cy={compCy}
                                    rx={compR * 1.9}
                                    ry={Math.max(8, compR * 1.9 * Math.abs(Math.sin((rotX || -25) * Math.PI / 180)))}
                                    fill="none"
                                    stroke="#ca8a04"
                                    strokeWidth={compStrokeW}
                                    strokeOpacity={0.9}
                                />
                            </>
                        )}
                    </g>
                )}

                {isCone && (isWireframe || (obj.edgeWidth !== undefined ? obj.edgeWidth > 0 : false)) && (
                    <g>
                        <ellipse
                            cx={projectedFaces.transformedVertices?.[projectedFaces.transformedVertices.length - 1]?.px || compCx}
                            cy={projectedFaces.transformedVertices?.[projectedFaces.transformedVertices.length - 1]?.py || (compCy + compR * 0.6)}
                            rx={compR * 0.9}
                            ry={Math.max(6, compR * 0.9 * 0.35)}
                            fill="none"
                            stroke={compStrokeColor}
                            strokeWidth={compStrokeW}
                            strokeDasharray={strokeDash}
                        />
                        <line
                            x1={projectedFaces.transformedVertices?.[0]?.px || compCx}
                            y1={projectedFaces.transformedVertices?.[0]?.py || (compCy - compR)}
                            x2={(projectedFaces.transformedVertices?.[projectedFaces.transformedVertices.length - 1]?.px || compCx) - compR * 0.9}
                            y2={projectedFaces.transformedVertices?.[projectedFaces.transformedVertices.length - 1]?.py || (compCy + compR * 0.6)}
                            stroke={compStrokeColor}
                            strokeWidth={compStrokeW}
                            strokeLinecap="round"
                        />
                        <line
                            x1={projectedFaces.transformedVertices?.[0]?.px || compCx}
                            y1={projectedFaces.transformedVertices?.[0]?.py || (compCy - compR)}
                            x2={(projectedFaces.transformedVertices?.[projectedFaces.transformedVertices.length - 1]?.px || compCx) + compR * 0.9}
                            y2={projectedFaces.transformedVertices?.[projectedFaces.transformedVertices.length - 1]?.py || (compCy + compR * 0.6)}
                            stroke={compStrokeColor}
                            strokeWidth={compStrokeW}
                            strokeLinecap="round"
                        />
                    </g>
                )}

                {isCylinder && (isWireframe || (obj.edgeWidth !== undefined ? obj.edgeWidth > 0 : false)) && (
                    <g>
                        <ellipse
                            cx={compCx}
                            cy={compCy - compR * 0.65}
                            rx={compR * 0.85}
                            ry={Math.max(6, compR * 0.85 * 0.35)}
                            fill="none"
                            stroke={compStrokeColor}
                            strokeWidth={compStrokeW}
                            strokeDasharray={strokeDash}
                        />
                        <ellipse
                            cx={compCx}
                            cy={compCy + compR * 0.65}
                            rx={compR * 0.85}
                            ry={Math.max(6, compR * 0.85 * 0.35)}
                            fill="none"
                            stroke={compStrokeColor}
                            strokeWidth={compStrokeW}
                            strokeDasharray={strokeDash}
                        />
                        <line
                            x1={compCx - compR * 0.85}
                            y1={compCy - compR * 0.65}
                            x2={compCx - compR * 0.85}
                            y2={compCy + compR * 0.65}
                            stroke={compStrokeColor}
                            strokeWidth={compStrokeW}
                            strokeLinecap="round"
                        />
                        <line
                            x1={compCx + compR * 0.85}
                            y1={compCy - compR * 0.65}
                            x2={compCx + compR * 0.85}
                            y2={compCy + compR * 0.65}
                            stroke={compStrokeColor}
                            strokeWidth={compStrokeW}
                            strokeLinecap="round"
                        />
                    </g>
                )}

                {/* SVG Dimension Lines, Arrows, and Interactive Hold-and-Drag Edge Handles */}
                {(obj.showDimensions || isSelected) && dimensionAnnotations.length > 0 && (
                    <g className="dimension-annotations select-none">
                        <defs>
                            <marker id={`dim-arrow-${obj.id}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
                            </marker>
                        </defs>
                        {dimensionAnnotations.map((a, aIdx) => {
                            const isDraggingThis = activeEdgeDrag?.dimKey === a.dimensionKey;
                            const p1 = { x: a.x1, y: a.y1 };
                            const p2 = { x: a.x2, y: a.y2 };

                            const angle = Math.abs(Math.atan2(a.y2 - a.y1, a.x2 - a.x1) * (180 / Math.PI));
                            let cursor = 'grab';
                            if (angle < 25 || angle > 155) cursor = 'ew-resize';
                            else if (angle > 65 && angle < 115) cursor = 'ns-resize';
                            else cursor = 'nwse-resize';

                            return (
                                <g
                                    key={aIdx}
                                    className="group/edge cursor-pointer"
                                    onPointerDown={(e) => handleEdgeDragStart(a.dimensionKey, p1, p2, e)}
                                    onTouchStart={(e) => handleEdgeDragStart(a.dimensionKey, p1, p2, e)}
                                    style={{ pointerEvents: isSelected && !obj.isLocked ? 'auto' : 'none' }}
                                >
                                    {/* Invisible Wide Hit Area for Easy Touch / Drag */}
                                    <line
                                        x1={a.x1}
                                        y1={a.y1}
                                        x2={a.x2}
                                        y2={a.y2}
                                        stroke="transparent"
                                        strokeWidth="24"
                                        style={{ cursor: isDraggingThis ? 'grabbing' : cursor }}
                                    />

                                    {/* Visible Dimension Line */}
                                    <line
                                        x1={a.x1}
                                        y1={a.y1}
                                        x2={a.x2}
                                        y2={a.y2}
                                        stroke={isDraggingThis ? '#38bdf8' : (isSelected ? '#0284c7' : '#38bdf8')}
                                        strokeWidth={isDraggingThis ? '2.5' : (isSelected ? '2' : '1.5')}
                                        strokeDasharray={a.type === 'dashed-line' ? '3,3' : undefined}
                                        markerStart={`url(#dim-arrow-${obj.id})`}
                                        markerEnd={`url(#dim-arrow-${obj.id})`}
                                        className="transition-colors group-hover/edge:stroke-sky-300"
                                    />

                                    {/* Midpoint Interactive Handle Badge */}
                                    <g
                                        transform={`translate(${a.midX}, ${a.midY})`}
                                        style={{ cursor: isDraggingThis ? 'grabbing' : cursor }}
                                    >
                                        <rect
                                            x="-35"
                                            y="-11"
                                            width="70"
                                            height="22"
                                            rx="5"
                                            fill={isDraggingThis ? '#0284c7' : '#0f172a'}
                                            fillOpacity="0.95"
                                            stroke={isDraggingThis ? '#ffffff' : (isSelected ? '#38bdf8' : '#0284c7')}
                                            strokeWidth={isDraggingThis ? '2' : '1.2'}
                                            className="shadow-lg transition-transform group-hover/edge:scale-110"
                                        />
                                        <text
                                            x="0"
                                            y="4"
                                            textAnchor="middle"
                                            fill={isDraggingThis ? '#ffffff' : '#38bdf8'}
                                            fontSize="10"
                                            fontWeight="bold"
                                            fontFamily="monospace"
                                            className="select-none pointer-events-none"
                                        >
                                            {isDraggingThis ? activeEdgeDrag.label : a.label}
                                        </text>
                                    </g>
                                </g>
                            );
                        })}
                    </g>
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
                    className="absolute -top-2.5 -right-2.5 z-[85]"
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
                    className="absolute left-full top-1/2 -translate-y-1/2 ml-1.5 flex flex-col gap-1 z-[85]"
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

            {/* Sleek Horizontal Floating 3D Format Bar (matches Whiteboard main toolbar design) */}
            {isSelected && (
                <div
                    className="absolute left-1/2 bg-slate-900/95 border border-slate-700/80 shadow-2xl rounded-2xl px-2 py-1 flex items-center gap-1 z-[90] text-slate-200 pointer-events-auto select-none backdrop-blur-md whitespace-nowrap"
                    style={{
                        top: `-${48 / (scale || 1)}px`,
                        transform: `translateX(-50%) rotate(-${obj.rotation || 0}deg) scale(${1 / (scale || 1)})`,
                        transformOrigin: 'bottom center'
                    }}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Model Type Tag */}
                    <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-950/60 border border-sky-800/60">
                        {obj.modelType || '3D'}
                    </span>

                    <div className="w-px h-4 bg-slate-700 mx-0.5" />

                    {/* Surface Color */}
                    <div className="relative w-5 h-5 rounded-full border border-slate-600 cursor-pointer overflow-hidden flex items-center justify-center hover:scale-105 transition" title="Surface Base Color">
                        <div className="w-full h-full" style={{ backgroundColor: obj.color || '#3b82f6' }} />
                        <input 
                            type="color" 
                            value={obj.color || '#3b82f6'} 
                            onChange={e => onUpdate && onUpdate({ color: e.target.value })}
                            className="absolute inset-[-10px] w-10 h-10 opacity-0 cursor-pointer"
                            title="Surface Base Color"
                        />
                    </div>

                    {/* Material Shading Pills: Solid, Image/Decal, Glass, Wire, Flat */}
                    <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/60" title="Material Shading">
                        {[
                            { id: 'shaded', label: 'Solid' },
                            { id: 'texture', label: 'Image' },
                            { id: 'glass', label: 'Glass' },
                            { id: 'wireframe', label: 'Wire' },
                            { id: 'flat', label: 'Flat' }
                        ].map(mat => (
                            <button
                                key={mat.id}
                                type="button"
                                onClick={() => onUpdate && onUpdate({
                                    materialStyle: mat.id,
                                    useImageTexture: mat.id === 'texture'
                                })}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                                    (obj.materialStyle || 'shaded') === mat.id ? 'bg-sky-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
                                }`}
                                title={`${mat.label} Shading`}
                            >
                                {mat.label}
                            </button>
                        ))}
                    </div>

                    {/* Image Texture & Decal Popover Toggle */}
                    <button
                        type="button"
                        onClick={() => setShowTexturePopover(prev => !prev)}
                        className={`px-1.5 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition ${
                            showTexturePopover || obj.useImageTexture || obj.materialStyle === 'texture'
                                ? 'bg-sky-600 text-white shadow'
                                : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                        title="Configure Photorealistic Image Texture or Upload Custom Decal"
                    >
                        <ImageIcon className="w-3 h-3 text-sky-300" />
                        <span>Texture</span>
                    </button>

                    <div className="w-px h-4 bg-slate-700 mx-0.5" />

                    {/* Edge Border Width Stepper */}
                    <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 px-1 py-0.5 h-6" title="Edge Border Width">
                        <button
                            type="button"
                            onClick={() => onUpdate && onUpdate({ edgeWidth: Math.max(0, (obj.edgeWidth !== undefined ? obj.edgeWidth : 0.8) - 0.5) })}
                            className="w-3.5 h-4 flex items-center justify-center text-[11px] text-slate-300 hover:text-white font-bold"
                            title="Thinner Borders"
                        >
                            -
                        </button>
                        <span className="text-[10px] font-mono text-white px-1 select-none min-w-[20px] text-center">
                            {(obj.edgeWidth ?? 0.8) === 0 ? 'Off' : `${(obj.edgeWidth ?? 0.8).toFixed(1)}`}
                        </span>
                        <button
                            type="button"
                            onClick={() => onUpdate && onUpdate({ edgeWidth: Math.min(4, (obj.edgeWidth !== undefined ? obj.edgeWidth : 0.8) + 0.5) })}
                            className="w-3.5 h-4 flex items-center justify-center text-[11px] text-slate-300 hover:text-white font-bold"
                            title="Thicker Borders"
                        >
                            +
                        </button>
                    </div>

                    {/* Edge Border Color */}
                    <div className="relative w-5 h-5 rounded-full border border-slate-600 cursor-pointer overflow-hidden flex items-center justify-center hover:scale-105 transition" title="Border Edge Color">
                        <div className="w-full h-full" style={{ backgroundColor: obj.edgeColor || '#ffffff' }} />
                        <input 
                            type="color" 
                            value={obj.edgeColor || '#ffffff'} 
                            onChange={e => onUpdate && onUpdate({ edgeColor: e.target.value })}
                            className="absolute inset-[-10px] w-10 h-10 opacity-0 cursor-pointer"
                            title="Border Edge Color"
                        />
                    </div>

                    {/* Edge Style: Solid, Dashed, Dotted */}
                    <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/60" title="Edge Dash Style">
                        {[
                            { id: 'solid', label: '—', title: 'Solid' },
                            { id: 'dashed', label: '┄', title: 'Dashed' },
                            { id: 'dotted', label: '┈', title: 'Dotted' }
                        ].map(st => (
                            <button
                                key={st.id}
                                type="button"
                                onClick={() => onUpdate && onUpdate({ edgeStyle: st.id })}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                                    (obj.edgeStyle || 'solid') === st.id ? 'bg-sky-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
                                }`}
                                title={st.title}
                            >
                                {st.label}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-4 bg-slate-700 mx-0.5" />

                    {/* Dimension Parametric Popover Dialog */}
                    {showDimensionsPopover && (
                        <div 
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-slate-950/95 border border-slate-700/80 shadow-2xl rounded-2xl p-3.5 z-[95] text-slate-200 pointer-events-auto backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                                    <Sliders className="w-3.5 h-3.5" />
                                    <span className="capitalize">{mType} Dimensions</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowDimensionsPopover(false)}
                                    className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition"
                                >
                                    <X size={13} />
                                </button>
                            </div>

                            {/* Sliders & Numeric inputs */}
                            <div className="space-y-3">
                                {getDimensionFieldsForType(mType).map(field => {
                                    const currentVal = (obj.dimensions && obj.dimensions[field.key] !== undefined)
                                        ? obj.dimensions[field.key]
                                        : field.default;
                                    return (
                                        <div key={field.key} className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-slate-300 font-medium">{field.label}</span>
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        min={field.min}
                                                        max={field.max * 2}
                                                        step={field.step}
                                                        value={currentVal}
                                                        onChange={(e) => {
                                                            const nextVal = Math.max(field.min, parseFloat(e.target.value) || field.min);
                                                            const nextDims = {
                                                                ...getDefaultDimensions(mType),
                                                                ...(obj.dimensions || {}),
                                                                [field.key]: nextVal
                                                            };
                                                            onUpdate && onUpdate({ dimensions: nextDims });
                                                        }}
                                                        className="w-14 px-1.5 py-0.5 text-right font-mono text-xs bg-slate-900 border border-slate-700 rounded text-white focus:border-sky-500 focus:outline-none"
                                                    />
                                                    <span className="text-[10px] text-sky-400 font-mono select-none">{obj.unit || 'cm'}</span>
                                                </div>
                                            </div>
                                            <input
                                                type="range"
                                                min={field.min}
                                                max={field.max}
                                                step={field.step}
                                                value={currentVal}
                                                onChange={(e) => {
                                                    const nextVal = parseFloat(e.target.value);
                                                    const nextDims = {
                                                        ...getDefaultDimensions(mType),
                                                        ...(obj.dimensions || {}),
                                                        [field.key]: nextVal
                                                    };
                                                    onUpdate && onUpdate({ dimensions: nextDims });
                                                }}
                                                className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Units Selector & Show Dimensions on Shape Toggle */}
                            <div className="pt-2.5 border-t border-slate-800 mt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                                        <Ruler size={11} className="text-sky-400" /> Unit:
                                    </span>
                                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                                        {['cm', 'mm', 'm', 'in', 'px'].map(u => (
                                            <button
                                                key={u}
                                                type="button"
                                                onClick={() => onUpdate && onUpdate({ unit: u })}
                                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                                                    (obj.unit || 'cm') === u ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                {u}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => onUpdate && onUpdate({ showDimensions: !obj.showDimensions })}
                                    className={`w-full py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                                        obj.showDimensions ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700'
                                    }`}
                                >
                                    <Ruler size={13} />
                                    <span>{obj.showDimensions ? 'Hide Dimension Labels on Shape' : 'Show Dimension Labels on Shape'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Image Texture & Custom Decal Popover Dialog */}
                    {showTexturePopover && (
                        <div 
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 bg-slate-950/95 border border-slate-700/80 shadow-2xl rounded-2xl p-3.5 z-[95] text-slate-200 pointer-events-auto backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    <span>3D Texture & Decal</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowTexturePopover(false)}
                                    className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition"
                                >
                                    <X size={13} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {/* Toggle Active Mode */}
                                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                                    <div>
                                        <div className="text-xs font-semibold text-white">Photorealistic Decal</div>
                                        <div className="text-[10px] text-slate-400">Render texture onto 3D shape</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextVal = !obj.useImageTexture;
                                            onUpdate && onUpdate({
                                                useImageTexture: nextVal,
                                                materialStyle: nextVal ? 'texture' : 'standard'
                                            });
                                        }}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                            obj.useImageTexture ? 'bg-sky-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {obj.useImageTexture ? 'ACTIVE' : 'OFF'}
                                    </button>
                                </div>

                                {/* Network Presets Grid */}
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                                        Network Hardware Presets
                                    </label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {[
                                            { key: 'optical_fiber', label: 'Fiber Cable', type: 'optical_fiber' },
                                            { key: 'twisted_cables', label: 'Twisted Pair', type: 'twisted_cables' },
                                            { key: 'multwan_router', label: 'Multi-WAN Router', type: 'multwan_router' },
                                            { key: 'network_switch', label: 'Network Switch', type: 'network_switch' },
                                            { key: 'laptop', label: 'CS Laptop', type: 'laptop' },
                                            { key: 'ip_panel', label: 'IP Patch Panel', type: 'ip_panel' },
                                        ].map(preset => (
                                            <button
                                                key={preset.key}
                                                type="button"
                                                onClick={() => {
                                                    const uri = getTextureSVGDataUri(preset.key);
                                                    onUpdate && onUpdate({
                                                        textureUrl: uri,
                                                        useImageTexture: true,
                                                        materialStyle: 'texture',
                                                        modelType: preset.type
                                                    });
                                                }}
                                                className={`px-2 py-1.5 rounded-lg text-[11px] font-medium text-left truncate border transition ${
                                                    mType === preset.type && obj.useImageTexture
                                                        ? 'bg-sky-950/60 border-sky-500 text-sky-200 shadow-sm'
                                                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-700'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Upload & Custom URL */}
                                <div className="space-y-2 pt-1 border-t border-slate-800">
                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                        Custom Image Texture
                                    </label>
                                    <input
                                        type="file"
                                        ref={textureFileInputRef}
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (uploadEvt) => {
                                                    const result = uploadEvt.target?.result;
                                                    if (result) {
                                                        onUpdate && onUpdate({
                                                            textureUrl: result,
                                                            useImageTexture: true,
                                                            materialStyle: 'texture'
                                                        });
                                                        toast.success('Custom texture applied to 3D model!');
                                                    }
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                    <div className="flex gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => textureFileInputRef.current?.click()}
                                            className="flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 flex items-center justify-center gap-1.5 transition"
                                        >
                                            <ImageIcon size={13} className="text-sky-400" />
                                            <span>Upload Image</span>
                                        </button>
                                        {obj.textureUrl && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onUpdate && onUpdate({
                                                        textureUrl: null,
                                                        useImageTexture: false,
                                                        materialStyle: 'standard'
                                                    });
                                                    toast.success('Texture cleared, reverted to 3D geometry');
                                                }}
                                                className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/50 transition"
                                                title="Reset to 3D Mesh Geometry"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Paste image URL (https://... or data:)"
                                        value={obj.textureUrl?.startsWith('data:image/svg+xml') ? '' : (obj.textureUrl || '')}
                                        onChange={(e) => {
                                            const val = e.target.value.trim();
                                            onUpdate && onUpdate({
                                                textureUrl: val || null,
                                                useImageTexture: !!val,
                                                materialStyle: val ? 'texture' : 'standard'
                                            });
                                        }}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dimensions Popover Toggle Button */}
                    <button
                        type="button"
                        onClick={() => setShowDimensionsPopover(prev => !prev)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition ${
                            showDimensionsPopover ? 'bg-sky-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                        title="Edit Shape Dimensions (Base, Height, Radius, Depth, etc.)"
                    >
                        <Sliders className="w-3 h-3 text-sky-400" />
                        <span>Dims</span>
                    </button>

                    {/* Units Display Toggle Button */}
                    <button
                        type="button"
                        onClick={() => onUpdate && onUpdate({ showDimensions: !obj.showDimensions })}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition ${
                            obj.showDimensions ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title="Toggle Dimension Lines & Measurement Units on Shape"
                    >
                        <Ruler className="w-3 h-3 text-indigo-300" />
                        <span>Units: {obj.showDimensions ? 'ON' : 'OFF'}</span>
                    </button>

                    {/* Unit Cycle Pill (cm -> mm -> m -> in -> px) */}
                    <button
                        type="button"
                        onClick={() => {
                            const units = ['cm', 'mm', 'm', 'in', 'px'];
                            const curIdx = units.indexOf(obj.unit || 'cm');
                            const nextUnit = units[(curIdx + 1) % units.length];
                            onUpdate && onUpdate({ unit: nextUnit });
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-[10px] font-mono text-sky-300 border border-slate-700 hover:border-sky-500 transition"
                        title="Click to Cycle Measurement Unit (cm, mm, m, in, px)"
                    >
                        {obj.unit || 'cm'}
                    </button>

                    {/* Isometric vs Perspective Mode Toggle */}
                    <button
                        type="button"
                        onClick={() => {
                            const nextMode = (obj.projectionMode || 'isometric') === 'isometric' ? 'perspective' : 'isometric';
                            onUpdate && onUpdate({ projectionMode: nextMode });
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                            (obj.projectionMode || 'isometric') === 'isometric' ? 'bg-slate-800 text-sky-300 border border-sky-500/40' : 'bg-slate-800 text-slate-400'
                        }`}
                        title={(obj.projectionMode || 'isometric') === 'isometric' ? "Isometric Mode (Congruent faces, parallel geometry). Click for Perspective." : "Perspective Mode (Camera vanishing point). Click for Isometric."}
                    >
                        {(obj.projectionMode || 'isometric') === 'isometric' ? 'Isometric' : 'Perspective'}
                    </button>

                    <div className="w-px h-4 bg-slate-700 mx-0.5" />

                    {/* Reset 3D View Angle */}
                    <button
                        type="button"
                        onClick={() => onUpdate && onUpdate({ rotX: -25, rotY: 45, rotZ: 0 })}
                        className="p-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center justify-center"
                        title="Reset 3D View Angle"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Infinite Cloner Toggle */}
                    <button
                        type="button"
                        onClick={() => onUpdate && onUpdate({ isInfiniteCloner: !obj.isInfiniteCloner })}
                        className={`p-1 rounded-full transition flex items-center justify-center ${obj.isInfiniteCloner ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        title={obj.isInfiniteCloner ? "Disable Infinite Copy (Currently ON)" : "Enable Infinite Copy (Currently OFF: Drag moves object)"}
                    >
                        <InfinityIcon className="w-3.5 h-3.5" />
                    </button>

                    {/* Download 3D Package (.OBJ + .MTL + JSON) */}
                    <button
                        type="button"
                        onClick={() => export3DModelPackage(obj, mesh)}
                        className="p-1 rounded-full hover:bg-slate-800 text-sky-400 hover:text-sky-200 transition flex items-center justify-center"
                        title="Download 3D Package (.OBJ + .MTL + JSON)"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Duplicate */}
                    {onDuplicate && (
                        <button
                            type="button"
                            onClick={() => onDuplicate(obj.id)}
                            className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition flex items-center justify-center"
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
                            className="p-1 rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition flex items-center justify-center"
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}

            {/* Radial Rotation Dial Overlay (Same UI as 2D Shapes) */}
            {isRotating2D && (
                <div
                    className="absolute inset-0 pointer-events-none z-[80] overflow-visible"
                    style={{
                        transform: `rotate(-${obj.rotation || 0}deg)`,
                        transformOrigin: 'center center'
                    }}
                >
                    <RotationDial3D
                        cx={(obj.width || 220) / 2}
                        cy={(obj.height || 220) / 2}
                        radius={Math.max(90, Math.min(obj.width || 220, obj.height || 220) * 0.75)}
                        rotation={liveRotation}
                    />
                </div>
            )}

            {/* 2D Resize & Rotate Handles (When Selected & Not Locked) */}
            {isSelected && !obj.isLocked && (
                <>
                    {/* Rotate Handle with Angle Badge (Same UI as 2D shapes) */}
                    <div
                        className="absolute left-1/2 -translate-x-1/2 flex flex-col-reverse items-center z-[85]"
                        style={{ top: -42, pointerEvents: 'auto' }}
                        onPointerDown={e => e.stopPropagation()}
                    >
                        <div className="w-px h-5 bg-sky-500" />
                        <div
                            data-handle="rotate"
                            onPointerDown={handleRotateStart}
                            className="w-5 h-5 rounded-full bg-sky-600 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-sky-500 shadow-md text-white transition-transform hover:scale-110"
                            style={{ cursor: 'grab' }}
                            title="Rotate 3D Object (Drag to rotate with radial dial)"
                        >
                            <RotateCw className="w-3 h-3 text-white" />
                        </div>
                        <input
                            type="number"
                            value={Math.round(obj.rotation || 0)}
                            onChange={(e) => onUpdate && onUpdate({ rotation: parseInt(e.target.value) || 0 })}
                            onPointerDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="mb-1 w-12 text-center text-xs bg-slate-800 text-white px-1 py-0.5 rounded shadow-lg z-50 border border-slate-600 outline-none appearance-none"
                            title="Planar Rotation Angle"
                        />
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
                            className="absolute bg-white border-2 border-sky-500 rounded-xs shadow-md z-[85] pointer-events-auto"
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
                            className="absolute bg-white border-2 border-sky-500 rounded-xs shadow-md z-[85] pointer-events-auto"
                            style={{ width: handleSize, height: handleSize, ...style }}
                        />
                    ))}
                </>
            )}
        </div>
    );
}

