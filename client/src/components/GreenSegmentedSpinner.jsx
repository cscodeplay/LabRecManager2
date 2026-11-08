'use client';

import React, { useEffect, useRef, useId } from 'react';

// Exact 24 radial block paths pre-computed from:
// cx=130, cy=130, count=24, outer=108, inner=66, gap=1.8deg
const BLOCK_PATHS = [
    "M 122.414 64.437 L 117.587 22.716 A 108 108 0 0 1 142.413 22.716 L 137.586 64.437 A 66 66 0 0 0 122.414 64.437 Z",
    "M 139.641 64.708 L 145.777 23.159 A 108 108 0 0 1 169.757 29.584 L 154.296 68.635 A 66 66 0 0 0 139.641 64.708 Z",
    "M 156.212 69.428 L 172.892 30.883 A 108 108 0 0 1 194.392 43.296 L 169.351 77.014 A 66 66 0 0 0 156.212 69.428 Z",
    "M 170.996 78.276 L 197.084 45.361 A 108 108 0 0 1 214.639 62.916 L 181.724 89.004 A 66 66 0 0 0 170.996 78.276 Z",
    "M 182.986 90.649 L 216.704 65.608 A 108 108 0 0 1 229.117 87.108 L 190.572 103.788 A 66 66 0 0 0 182.986 90.649 Z",
    "M 191.365 105.704 L 230.416 90.243 A 108 108 0 0 1 236.841 114.223 L 195.292 120.359 A 66 66 0 0 0 191.365 105.704 Z",
    "M 195.563 122.414 L 237.284 117.587 A 108 108 0 0 1 237.284 142.413 L 195.563 137.586 A 66 66 0 0 0 195.563 122.414 Z",
    "M 195.292 139.641 L 236.841 145.777 A 108 108 0 0 1 230.416 169.757 L 191.365 154.296 A 66 66 0 0 0 195.292 139.641 Z",
    "M 190.572 156.212 L 229.117 172.892 A 108 108 0 0 1 216.704 194.392 L 182.986 169.351 A 66 66 0 0 0 190.572 156.212 Z",
    "M 181.724 170.996 L 214.639 197.084 A 108 108 0 0 1 197.084 214.639 L 170.996 181.724 A 66 66 0 0 0 181.724 170.996 Z",
    "M 169.351 182.986 L 194.392 216.704 A 108 108 0 0 1 172.892 229.117 L 156.212 190.572 A 66 66 0 0 0 169.351 182.986 Z",
    "M 154.296 191.365 L 169.757 230.416 A 108 108 0 0 1 145.777 236.841 L 139.641 195.292 A 66 66 0 0 0 154.296 191.365 Z",
    "M 137.586 195.563 L 142.413 237.284 A 108 108 0 0 1 117.587 237.284 L 122.414 195.563 A 66 66 0 0 0 137.586 195.563 Z",
    "M 120.359 195.292 L 114.223 236.841 A 108 108 0 0 1 90.243 230.416 L 105.704 191.365 A 66 66 0 0 0 120.359 195.292 Z",
    "M 103.788 190.572 L 87.108 229.117 A 108 108 0 0 1 65.608 216.704 L 90.649 182.986 A 66 66 0 0 0 103.788 190.572 Z",
    "M 89.004 181.724 L 62.916 214.639 A 108 108 0 0 1 45.361 197.084 L 78.276 170.996 A 66 66 0 0 0 89.004 181.724 Z",
    "M 77.014 169.351 L 43.296 194.392 A 108 108 0 0 1 30.883 172.892 L 69.428 156.212 A 66 66 0 0 0 77.014 169.351 Z",
    "M 68.635 154.296 L 29.584 169.757 A 108 108 0 0 1 23.159 145.777 L 64.708 139.641 A 66 66 0 0 0 68.635 154.296 Z",
    "M 64.437 137.586 L 22.716 142.413 A 108 108 0 0 1 22.716 117.587 L 64.437 122.414 A 66 66 0 0 0 64.437 137.586 Z",
    "M 64.708 120.359 L 23.159 114.223 A 108 108 0 0 1 29.584 90.243 L 68.635 105.704 A 66 66 0 0 0 64.708 120.359 Z",
    "M 69.428 103.788 L 30.883 87.108 A 108 108 0 0 1 43.296 65.608 L 77.014 90.649 A 66 66 0 0 0 69.428 103.788 Z",
    "M 78.276 89.004 L 45.361 62.916 A 108 108 0 0 1 62.916 45.361 L 89.004 78.276 A 66 66 0 0 0 78.276 89.004 Z",
    "M 90.649 77.014 L 65.608 43.296 A 108 108 0 0 1 87.108 30.883 L 103.788 69.428 A 66 66 0 0 0 90.649 77.014 Z",
    "M 105.704 68.635 L 90.243 29.584 A 108 108 0 0 1 114.223 23.159 L 120.359 64.708 A 66 66 0 0 0 105.704 68.635 Z"
];

/**
 * GreenSegmentedSpinner (ULRMS Progressive Green Loader)
 * 
 * Features:
 * - 24 progressive radial blocks with graduated emerald gradient (#bbf7d0 -> #4ade80 -> #15803d)
 * - Metallic green ULRMS center typography with edge stroke & specular shine sweep
 * - Zero React re-rendering overhead (direct RAF DOM sync)
 * - Responsive sizing matrix: xs (24px), sm (40px), md (64px), lg (96px), xl (112px), fullscreen (128px)
 * - Light and Dark theme support with faint radial track guide
 */
export default function GreenSegmentedSpinner({
    size = 'md',
    label = '',
    fullscreen = false,
    showPercent = null, // defaults to true on fullscreen, false otherwise
    showText = true,
    className = ''
}) {
    const rawId = useId();
    const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');

    const svgRef = useRef(null);
    const shineRef = useRef(null);
    const percentRef = useRef(null);

    const isPercentVisible = showPercent !== null ? showPercent : fullscreen;
    const isTextVisible = showText && size !== 'xs';

    // Size mappings
    const sizeMap = {
        xs: 'w-6 h-6',
        sm: 'w-10 h-10',
        md: 'w-16 h-16',
        lg: 'w-24 h-24',
        xl: 'w-28 h-28',
        fullscreen: 'w-28 h-28 sm:w-32 sm:h-32'
    };

    const spinnerClass = sizeMap[fullscreen ? 'fullscreen' : size] || size;

    useEffect(() => {
        let animId;
        let progress = 0;
        let lastTime = performance.now();
        const count = 24;
        const speed = 12; // 2 seconds per complete revolution

        const svg = svgRef.current;
        if (!svg) return;

        const activeBlocks = svg.querySelectorAll('.ulrms-active-block');
        const shine = shineRef.current;
        const percentEl = percentRef.current;

        const animate = (now) => {
            const dt = Math.min((now - lastTime) / 1000, 0.1);
            lastTime = now;
            progress += dt * speed;
            if (progress >= count) {
                progress = 0;
            }

            const visible = Math.min(count, Math.floor(progress));
            const fraction = visible / count;

            activeBlocks.forEach((el, i) => {
                el.style.opacity = i < visible ? String((0.48 + 0.52 * (i + 1) / count).toFixed(3)) : '0';
            });

            if (shine) {
                const shineX = -55 + fraction * 260;
                shine.setAttribute('x', String(shineX));
                shine.setAttribute('opacity', visible > 0 && visible < count ? '1' : '0');
            }

            if (percentEl) {
                percentEl.textContent = `${Math.round(fraction * 100)}%`;
            }

            animId = requestAnimationFrame(animate);
        };

        animId = requestAnimationFrame(animate);
        return () => {
            if (animId) cancelAnimationFrame(animId);
        };
    }, []);

    const spinnerSvg = (
        <svg
            ref={svgRef}
            viewBox="0 0 260 260"
            className={`${spinnerClass} ${className} shrink-0 drop-shadow-xs select-none`}
            role="status"
            aria-label="Loading"
        >
            <defs>
                {/* Emerald Progressive Radial Gradient */}
                <linearGradient id={`greenGradient-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#bbf7d0" />
                    <stop offset="48%" stopColor="#4ade80" />
                    <stop offset="100%" stopColor="#15803d" />
                </linearGradient>

                {/* Specular Shine Gradient for Brand Sweep */}
                <linearGradient id={`shineGradient-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                    <stop offset="35%" stopColor="#ffffff" stopOpacity="0.08" />
                    <stop offset="46%" stopColor="#ffffff" stopOpacity="0.55" />
                    <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="54%" stopColor="#ffffff" stopOpacity="0.75" />
                    <stop offset="65%" stopColor="#ffffff" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>

                {/* Metallic Text Gradient */}
                <linearGradient id={`metalText-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f8fff9" />
                    <stop offset="13%" stopColor="#a7f3d0" />
                    <stop offset="27%" stopColor="#ffffff" />
                    <stop offset="43%" stopColor="#34d399" />
                    <stop offset="58%" stopColor="#047857" />
                    <stop offset="72%" stopColor="#d1fae5" />
                    <stop offset="86%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#064e3b" />
                </linearGradient>

                {/* Metallic Stroke Gradient */}
                <linearGradient id={`metalEdge-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ecfdf5" />
                    <stop offset="50%" stopColor="#065f46" />
                    <stop offset="100%" stopColor="#022c22" />
                </linearGradient>

                {/* Clipping Path for ULRMS Metallic Typography */}
                <clipPath id={`wordClip-${uid}`}>
                    <text
                        x="130"
                        y="137"
                        textAnchor="middle"
                        fontFamily="Inter, system-ui, -apple-system, sans-serif"
                        fontSize="25"
                        fontWeight="900"
                        letterSpacing="1.5"
                    >
                        ULRMS
                    </text>
                </clipPath>
            </defs>

            {/* Faint Background Track & Active Illuminating Blocks */}
            <g className="text-slate-400 dark:text-slate-600">
                {BLOCK_PATHS.map((d, i) => (
                    <React.Fragment key={i}>
                        {/* Static track block */}
                        <path d={d} fill="currentColor" opacity="0.08" />
                        {/* Dynamic active progressive block */}
                        <path
                            d={d}
                            className="ulrms-active-block"
                            fill={`url(#greenGradient-${uid})`}
                            style={{ opacity: 0 }}
                        />
                    </React.Fragment>
                ))}
            </g>

            {/* Central Metallic ULRMS Badge */}
            {isTextVisible && (
                <>
                    <text
                        x="130"
                        y="137"
                        textAnchor="middle"
                        fontFamily="Inter, system-ui, -apple-system, sans-serif"
                        fontSize="25"
                        fontWeight="900"
                        letterSpacing="1.5"
                        fill={`url(#metalText-${uid})`}
                        stroke={`url(#metalEdge-${uid})`}
                        strokeWidth="0.65"
                        paintOrder="stroke fill"
                        style={{ filter: 'drop-shadow(0 1px 1px #064e3b88)' }}
                    >
                        ULRMS
                    </text>

                    {/* Specular Shine Streak Sweeping Across ULRMS */}
                    <g clipPath={`url(#wordClip-${uid})`}>
                        <rect
                            ref={shineRef}
                            x="-55"
                            y="101"
                            width="38"
                            height="46"
                            fill={`url(#shineGradient-${uid})`}
                            opacity="0"
                        />
                        <path
                            d="M0 104 H260"
                            stroke="#ffffff"
                            strokeWidth="0.55"
                            opacity="0.35"
                        />
                    </g>
                </>
            )}
        </svg>
    );

    if (fullscreen) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors p-6">
                <div className="flex flex-col items-center text-center">
                    {spinnerSvg}
                    {isPercentVisible && (
                        <div
                            ref={percentRef}
                            className="mt-3.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight"
                        >
                            0%
                        </div>
                    )}
                    {label ? (
                        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide animate-pulse">
                            {label}
                        </p>
                    ) : (
                        <p className="mt-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                            Loading ULRMS...
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (label) {
        return (
            <div className={`inline-flex flex-col items-center gap-2.5 ${className}`}>
                {spinnerSvg}
                {isPercentVisible && (
                    <span
                        ref={percentRef}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums"
                    >
                        0%
                    </span>
                )}
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 tracking-wide text-center">
                    {label}
                </span>
            </div>
        );
    }

    return spinnerSvg;
}
