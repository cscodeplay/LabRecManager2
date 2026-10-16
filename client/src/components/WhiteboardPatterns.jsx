'use client';

import React from 'react';

export const PATTERN_PRESETS = [
    { id: 'pattern-dots', name: 'Dots', preview: '• • •' },
    { id: 'pattern-stripes-diag', name: 'Diagonal Stripes', preview: '/////' },
    { id: 'pattern-stripes-horizontal', name: 'Horizontal Lines', preview: '=====' },
    { id: 'pattern-crosshatch', name: 'Crosshatch', preview: 'XXXXX' },
    { id: 'pattern-grid', name: 'Grid / Graph', preview: '田田田' },
    { id: 'pattern-brick', name: 'Brick', preview: '🧱🧱🧱' },
    { id: 'pattern-zigzag', name: 'Zigzag', preview: 'WWWWW' }
];

export const GRADIENT_PRESETS = [
    { id: 'grad-sunset', name: 'Sunset Flare', from: '#ff512f', to: '#dd2476', type: 'linear', angle: 45 },
    { id: 'grad-ocean', name: 'Ocean Breeze', from: '#00c6ff', to: '#0072ff', type: 'linear', angle: 90 },
    { id: 'grad-emerald', name: 'Emerald Forest', from: '#11998e', to: '#38ef7d', type: 'linear', angle: 45 },
    { id: 'grad-neon', name: 'Neon Berry', from: '#f857a6', to: '#ff5858', type: 'linear', angle: 135 },
    { id: 'grad-cyberpunk', name: 'Cyberpunk', from: '#7f00ff', to: '#e100ff', type: 'linear', angle: 90 },
    { id: 'grad-amber', name: 'Amber Gold', from: '#f59e0b', to: '#b45309', type: 'linear', angle: 45 },
    { id: 'grad-aurora', name: 'Northern Aurora', from: '#a8ff78', to: '#78ffd6', type: 'linear', angle: 90 },
    { id: 'grad-fire', name: 'Blazing Fire', from: '#f12711', to: '#f5af19', type: 'linear', angle: 45 },
    { id: 'grad-radial-glow', name: 'Center Glow', from: '#60a5fa', to: '#1e3a8a', type: 'radial' },
    { id: 'grad-radial-warm', name: 'Sunburst', from: '#fde047', to: '#ea580c', type: 'radial' },
    { id: 'grad-radial-iris', name: 'Mystic Iris', from: '#c084fc', to: '#581c87', type: 'radial' },
    { id: 'grad-radial-mint', name: 'Mint Core', from: '#6ee7b7', to: '#047857', type: 'radial' }
];

/**
 * WhiteboardPatterns provides all SVG definitions for patterns and gradients.
 * It is rendered inside Whiteboard's canvas wrapper so all vector shapes and SVG layers
 * can reference fills via `url(#pattern-dots)`, `url(#grad-sunset)`, etc.
 */
export default function WhiteboardPatterns({
    fgColor = '#ffffff',
    bgColor = '#1e293b',
    gradientFrom = '#ff512f',
    gradientTo = '#dd2476',
    gradientAngle = 45
}) {
    const angleRad = ((gradientAngle ?? 45) * Math.PI) / 180;
    const gx1 = Math.round(50 - Math.cos(angleRad) * 50);
    const gy1 = Math.round(50 - Math.sin(angleRad) * 50);
    const gx2 = Math.round(50 + Math.cos(angleRad) * 50);
    const gy2 = Math.round(50 + Math.sin(angleRad) * 50);

    return (
        <svg
            aria-hidden="true"
            className="absolute top-0 left-0 w-0 h-0 pointer-events-none select-none opacity-0"
            style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        >
            <defs>
                {/* Custom User Configured Gradients */}
                <linearGradient id="grad-custom-linear" x1={`${gx1}%`} y1={`${gy1}%`} x2={`${gx2}%`} y2={`${gy2}%`}>
                    <stop offset="0%" stopColor={gradientFrom} />
                    <stop offset="100%" stopColor={gradientTo} />
                </linearGradient>

                <radialGradient id="grad-custom-radial" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={gradientFrom} />
                    <stop offset="100%" stopColor={gradientTo} />
                </radialGradient>
                {/* 1. Dots Pattern */}
                <pattern
                    id="pattern-dots"
                    width="16"
                    height="16"
                    patternUnits="userSpaceOnUse"
                >
                    <rect width="16" height="16" fill={bgColor} />
                    <circle cx="8" cy="8" r="2.5" fill={fgColor} />
                </pattern>

                {/* 2. Diagonal Stripes Pattern */}
                <pattern
                    id="pattern-stripes-diag"
                    width="16"
                    height="16"
                    patternTransform="rotate(45 0 0)"
                    patternUnits="userSpaceOnUse"
                >
                    <rect width="16" height="16" fill={bgColor} />
                    <line x1="0" y1="0" x2="0" y2="16" stroke={fgColor} strokeWidth="4" />
                </pattern>

                {/* 3. Horizontal Lines Pattern */}
                <pattern
                    id="pattern-stripes-horizontal"
                    width="16"
                    height="16"
                    patternUnits="userSpaceOnUse"
                >
                    <rect width="16" height="16" fill={bgColor} />
                    <line x1="0" y1="8" x2="16" y2="8" stroke={fgColor} strokeWidth="3" />
                </pattern>

                {/* 4. Crosshatch Pattern */}
                <pattern
                    id="pattern-crosshatch"
                    width="16"
                    height="16"
                    patternUnits="userSpaceOnUse"
                >
                    <rect width="16" height="16" fill={bgColor} />
                    <path
                        d="M0 0L16 16M16 0L0 16"
                        stroke={fgColor}
                        strokeWidth="2"
                    />
                </pattern>

                {/* 5. Grid / Graph Paper Pattern */}
                <pattern
                    id="pattern-grid"
                    width="20"
                    height="20"
                    patternUnits="userSpaceOnUse"
                >
                    <rect width="20" height="20" fill={bgColor} />
                    <path
                        d="M 20 0 L 0 0 0 20"
                        fill="none"
                        stroke={fgColor}
                        strokeWidth="1.5"
                    />
                </pattern>

                {/* 6. Brick Wall Pattern */}
                <pattern
                    id="pattern-brick"
                    width="32"
                    height="16"
                    patternUnits="userSpaceOnUse"
                >
                    <rect width="32" height="16" fill={bgColor} />
                    <path
                        d="M0 0h32v16H0z"
                        fill="none"
                        stroke={fgColor}
                        strokeWidth="1"
                    />
                    <path
                        d="M0 8h32M16 0v8M0 8v8M32 8v8M8 8v8M24 8v8"
                        stroke={fgColor}
                        strokeWidth="1.5"
                    />
                </pattern>

                {/* 7. Zigzag Pattern */}
                <pattern
                    id="pattern-zigzag"
                    width="24"
                    height="12"
                    patternUnits="userSpaceOnUse"
                >
                    <rect width="24" height="12" fill={bgColor} />
                    <path
                        d="M0 6 L6 0 L12 6 L18 0 L24 6 L18 12 L12 6 L6 12 Z"
                        fill="none"
                        stroke={fgColor}
                        strokeWidth="2"
                    />
                </pattern>

                {/* --- Linear Gradients --- */}
                <linearGradient id="grad-sunset" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff512f" />
                    <stop offset="100%" stopColor="#dd2476" />
                </linearGradient>

                <linearGradient id="grad-ocean" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00c6ff" />
                    <stop offset="100%" stopColor="#0072ff" />
                </linearGradient>

                <linearGradient id="grad-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#11998e" />
                    <stop offset="100%" stopColor="#38ef7d" />
                </linearGradient>

                <linearGradient id="grad-neon" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f857a6" />
                    <stop offset="100%" stopColor="#ff5858" />
                </linearGradient>

                <linearGradient id="grad-cyberpunk" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#7f00ff" />
                    <stop offset="100%" stopColor="#e100ff" />
                </linearGradient>

                <linearGradient id="grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                </linearGradient>

                <linearGradient id="grad-aurora" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a8ff78" />
                    <stop offset="100%" stopColor="#78ffd6" />
                </linearGradient>

                <linearGradient id="grad-fire" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f12711" />
                    <stop offset="100%" stopColor="#f5af19" />
                </linearGradient>

                {/* --- Radial Gradients --- */}
                <radialGradient id="grad-radial-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                </radialGradient>

                <radialGradient id="grad-radial-warm" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fde047" />
                    <stop offset="100%" stopColor="#ea580c" />
                </radialGradient>

                <radialGradient id="grad-radial-iris" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#581c87" />
                </radialGradient>

                <radialGradient id="grad-radial-mint" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#6ee7b7" />
                    <stop offset="100%" stopColor="#047857" />
                </radialGradient>
            </defs>
        </svg>
    );
}
