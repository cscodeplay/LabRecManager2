'use client';

import React, { useEffect, useRef, useId, useMemo } from 'react';
import {
    useSpinnerStore,
    SPINNER_PALETTES,
    THICKNESS_PRESETS,
    DEFAULT_SPINNER_CONFIG,
    generateRadialPaths
} from '@/lib/spinnerStore';

/**
 * GreenSegmentedSpinner (Configurable ULRMS Progressive Loader)
 * 
 * Clean, percentage-free radial loader:
 * - Dynamic color palettes (Emerald, Sapphire, Cyber, Sunset Amber, Ruby Crimson, Oceanic Teal, Titanium Slate, Custom Hex)
 * - Configurable block count (8 to 32 blocks)
 * - Configurable speed, ring thickness, and slot gap
 * - Configurable center brand text ("ULRMS" or custom) & specular shine
 * - Zero React re-rendering overhead (direct RAF DOM sync)
 */
export default function GreenSegmentedSpinner({
    size = 'md',
    label = '',
    fullscreen = false,
    palette: propPalette,
    blockCount: propBlockCount,
    speed: propSpeed,
    showText = true,
    className = ''
}) {
    const rawId = useId();
    const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');

    const store = useSpinnerStore();
    // Use store values once hydrated; otherwise use default config to maintain SSR purity
    const config = store.isHydrated ? store : DEFAULT_SPINNER_CONFIG;

    const activePaletteKey = propPalette || config.palette || 'emerald';
    const paletteDef = SPINNER_PALETTES[activePaletteKey] || SPINNER_PALETTES.emerald;

    // Custom gradient colors if palette is 'custom'
    const startColor = activePaletteKey === 'custom' && config.customColors?.start ? config.customColors.start : paletteDef.start;
    const midColor = activePaletteKey === 'custom' && config.customColors?.mid ? config.customColors.mid : paletteDef.mid;
    const endColor = activePaletteKey === 'custom' && config.customColors?.end ? config.customColors.end : paletteDef.end;

    const activeBlockCount = propBlockCount || config.blockCount || 24;
    const activeSpeed = propSpeed || config.speed || 12;
    const thicknessKey = config.ringThickness || 'standard';
    const activeThickness = THICKNESS_PRESETS[thicknessKey] || THICKNESS_PRESETS.standard;
    const activeGap = config.slotGap || 1.8;
    const activeBrandText = config.brandText !== undefined ? config.brandText : 'ULRMS';
    const isTextVisible = (showText && config.showBrandText !== false) && size !== 'xs';
    const isShineVisible = config.showSpecularShine !== false;
    const isTrackVisible = config.showTrackGuide !== false;

    // Pre-calculate radial paths for current geometry
    const paths = useMemo(() => {
        return generateRadialPaths(
            activeBlockCount,
            activeThickness.inner,
            activeThickness.outer,
            activeGap
        );
    }, [activeBlockCount, activeThickness.inner, activeThickness.outer, activeGap]);

    const svgRef = useRef(null);
    const shineRef = useRef(null);

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
        const count = activeBlockCount;
        const speed = activeSpeed;

        const svg = svgRef.current;
        if (!svg) return;

        const activeBlocks = svg.querySelectorAll('.ulrms-active-block');
        const shine = shineRef.current;

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

            animId = requestAnimationFrame(animate);
        };

        animId = requestAnimationFrame(animate);
        return () => {
            if (animId) cancelAnimationFrame(animId);
        };
    }, [activeBlockCount, activeSpeed]);

    const spinnerSvg = (
        <svg
            ref={svgRef}
            viewBox="0 0 260 260"
            className={`${spinnerClass} ${className} shrink-0 drop-shadow-xs select-none`}
            role="status"
            aria-label="Loading"
        >
            <defs>
                {/* Dynamic Progressive Radial Gradient */}
                <linearGradient id={`radialGradient-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={startColor} />
                    <stop offset="48%" stopColor={midColor} />
                    <stop offset="100%" stopColor={endColor} />
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
                    {paletteDef.textGradient.map((stop, i) => (
                        <stop key={i} offset={stop.offset} stopColor={stop.color} />
                    ))}
                </linearGradient>

                {/* Metallic Stroke Gradient */}
                <linearGradient id={`metalEdge-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    {paletteDef.edgeGradient.map((stop, i) => (
                        <stop key={i} offset={stop.offset} stopColor={stop.color} />
                    ))}
                </linearGradient>

                {/* Clipping Path for Brand Typography */}
                <clipPath id={`wordClip-${uid}`}>
                    <text
                        x="130"
                        y="137"
                        textAnchor="middle"
                        fontFamily="Inter, system-ui, -apple-system, sans-serif"
                        fontSize={activeBrandText.length > 5 ? '20' : '25'}
                        fontWeight="900"
                        letterSpacing="1.5"
                    >
                        {activeBrandText}
                    </text>
                </clipPath>
            </defs>

            {/* Background Track & Active Progressive Blocks */}
            <g className="text-slate-400 dark:text-slate-600">
                {paths.map((d, i) => (
                    <React.Fragment key={i}>
                        {/* Static track block */}
                        {isTrackVisible && (
                            <path d={d} fill="currentColor" opacity="0.08" />
                        )}
                        {/* Dynamic active progressive block */}
                        <path
                            d={d}
                            className="ulrms-active-block"
                            fill={`url(#radialGradient-${uid})`}
                            style={{ opacity: 0 }}
                        />
                    </React.Fragment>
                ))}
            </g>

            {/* Central Metallic Brand Badge */}
            {isTextVisible && Boolean(activeBrandText) && (
                <>
                    <text
                        x="130"
                        y="137"
                        textAnchor="middle"
                        fontFamily="Inter, system-ui, -apple-system, sans-serif"
                        fontSize={activeBrandText.length > 5 ? '20' : '25'}
                        fontWeight="900"
                        letterSpacing="1.5"
                        fill={`url(#metalText-${uid})`}
                        stroke={`url(#metalEdge-${uid})`}
                        strokeWidth="0.65"
                        paintOrder="stroke fill"
                        style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }}
                    >
                        {activeBrandText}
                    </text>

                    {/* Specular Shine Reflection Sweeping Across Center Brand */}
                    {isShineVisible && (
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
                    )}
                </>
            )}
        </svg>
    );

    if (fullscreen) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors p-6">
                <div className="flex flex-col items-center text-center">
                    {spinnerSvg}
                    {label ? (
                        <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide animate-pulse">
                            {label}
                        </p>
                    ) : (
                        <p className="mt-3 text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                            Loading {activeBrandText || 'ULRMS'}...
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
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 tracking-wide text-center">
                    {label}
                </span>
            </div>
        );
    }

    return spinnerSvg;
}
