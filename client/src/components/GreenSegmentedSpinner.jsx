'use client';

import React, { useId } from 'react';
import {
    useSpinnerStore,
    SPINNER_PALETTES,
    DEFAULT_SPINNER_CONFIG
} from '@/lib/spinnerStore';

/**
 * GreenSegmentedSpinner (ULRMS Blocks Shuffle 3 Loader)
 *
 * Pure-CSS GPU-composited implementation of MIT-licensed `blocks-shuffle-3`
 * (n3r4zzurr0/svg-spinners), preserving full palette/brand/speed customization
 * from `useSpinnerStore` and `min-h-[100dvh]` fullscreen centering.
 */
export default function GreenSegmentedSpinner({
    size = 'md',
    label = '',
    fullscreen = false,
    palette: propPalette,
    blockCount: _propBlockCount,
    speed: propSpeed,
    showText = true,
    className = ''
}) {
    const rawId = useId();
    const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');

    const store = useSpinnerStore();
    const config = store.isHydrated ? store : DEFAULT_SPINNER_CONFIG;

    const activePaletteKey = propPalette || config.palette || 'emerald';
    const paletteDef = SPINNER_PALETTES[activePaletteKey] || SPINNER_PALETTES.emerald;

    const startColor = activePaletteKey === 'custom' && config.customColors?.start ? config.customColors.start : paletteDef.start;
    const midColor = activePaletteKey === 'custom' && config.customColors?.mid ? config.customColors.mid : paletteDef.mid;
    const endColor = activePaletteKey === 'custom' && config.customColors?.end ? config.customColors.end : paletteDef.end;

    const activeSpeed = Math.max(4, Number(propSpeed || config.speed || 12));
    const cycleSec = Math.max(0.95, Math.min(3.6, 25.2 / activeSpeed));
    const activeBrandText = config.brandText !== undefined ? config.brandText : 'ULRMS';
    const showBrandBadge = (showText && config.showBrandText !== false) && size !== 'xs';

    const sizeMap = {
        xs: 'w-5 h-5',
        sm: 'w-8 h-8',
        md: 'w-11 h-11',
        lg: 'w-14 h-14',
        xl: 'w-16 h-16',
        fullscreen: 'w-16 h-16 sm:w-20 sm:h-20'
    };

    const spinnerClass = sizeMap[fullscreen ? 'fullscreen' : size] || size;

    const spinnerSvg = (
        <>
            <style>{`
                @media (prefers-reduced-motion: no-preference) {
                    @keyframes ulrmsBlocksShuffle-${uid} {
                        0%, 100% { transform: translate(0px, 0px); }
                        8.33%, 25% { transform: translate(12px, 0px); }
                        33.33%, 50% { transform: translate(12px, 12px); }
                        58.33%, 75% { transform: translate(0px, 12px); }
                        83.33%, 91.67% { transform: translate(0px, 0px); }
                    }
                    .ulrms-bs-${uid} {
                        animation: ulrmsBlocksShuffle-${uid} ${cycleSec.toFixed(2)}s cubic-bezier(0.36, 0, 0.64, 1) infinite;
                        will-change: transform;
                    }
                }
            `}</style>
            <svg
                viewBox="0 0 24 24"
                className={`${spinnerClass} ${className} shrink-0 drop-shadow-xs select-none`}
                role="status"
                aria-label="Loading"
            >
                <defs>
                    <linearGradient id={`bsGradA-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={startColor} />
                        <stop offset="100%" stopColor={midColor} />
                    </linearGradient>
                    <linearGradient id={`bsGradB-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={midColor} />
                        <stop offset="100%" stopColor={endColor} />
                    </linearGradient>
                </defs>
                <rect
                    x="1"
                    y="1"
                    width="10"
                    height="10"
                    rx="2"
                    fill={`url(#bsGradA-${uid})`}
                    className={`ulrms-bs-${uid}`}
                />
                <rect
                    x="1"
                    y="1"
                    width="10"
                    height="10"
                    rx="2"
                    fill={`url(#bsGradB-${uid})`}
                    className={`ulrms-bs-${uid}`}
                    style={{ animationDelay: `${(-cycleSec / 3).toFixed(3)}s` }}
                />
                <rect
                    x="1"
                    y="1"
                    width="10"
                    height="10"
                    rx="2"
                    fill={endColor}
                    className={`ulrms-bs-${uid}`}
                    style={{ animationDelay: `${((-cycleSec * 2) / 3).toFixed(3)}s` }}
                />
            </svg>
        </>
    );

    if (fullscreen) {
        return (
            <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors p-6">
                <div className="flex flex-col items-center text-center">
                    {spinnerSvg}
                    {label ? (
                        <p className="mt-4 text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wide">
                            {label}
                        </p>
                    ) : showBrandBadge ? (
                        <p className="mt-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                            Loading {activeBrandText || 'ULRMS'}...
                        </p>
                    ) : null}
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
