'use client';

import React from 'react';

/**
 * GreenSegmentedSpinner
 * 8-segment annular ring spinner with graduated opacity decay and continuous smooth rotation.
 * Precision-modeled after the segmented circular donut reference design.
 */
export default function GreenSegmentedSpinner({
    size = 'md',
    label = '',
    fullscreen = false,
    className = ''
}) {
    // Size mappings
    const sizeMap = {
        xs: 'w-4 h-4',
        sm: 'w-6 h-6',
        md: 'w-9 h-9',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    };

    const spinnerClass = sizeMap[size] || size;

    // SVG annular arc paths for 8 segments
    // R = 44, r = 26, cx = 50, cy = 50, gap = 5 deg, seg = 40 deg
    const segments = [
        { d: "M 51.919 6.042 A 44 44 0 0 1 79.431 17.439 L 67.391 30.760 A 26 26 0 0 0 51.134 24.025 Z", opacity: 1.0 },
        { d: "M 82.561 20.569 A 44 44 0 0 1 93.958 48.081 L 75.975 48.866 A 26 26 0 0 0 69.240 32.609 Z", opacity: 0.88 },
        { d: "M 93.958 51.919 A 44 44 0 0 1 82.561 79.431 L 69.240 67.391 A 26 26 0 0 0 75.975 51.134 Z", opacity: 0.75 },
        { d: "M 79.431 82.561 A 44 44 0 0 1 51.919 93.958 L 51.134 75.975 A 26 26 0 0 0 67.391 69.240 Z", opacity: 0.62 },
        { d: "M 48.081 93.958 A 44 44 0 0 1 20.569 82.561 L 32.609 69.240 A 26 26 0 0 0 48.866 75.975 Z", opacity: 0.50 },
        { d: "M 17.439 79.431 A 44 44 0 0 1 6.042 51.919 L 24.025 51.134 A 26 26 0 0 0 30.760 67.391 Z", opacity: 0.38 },
        { d: "M 6.042 48.081 A 44 44 0 0 1 17.439 20.569 L 30.760 32.609 A 26 26 0 0 0 24.025 48.866 Z", opacity: 0.26 },
        { d: "M 20.569 17.439 A 44 44 0 0 1 48.081 6.042 L 48.866 24.025 A 26 26 0 0 0 32.609 30.760 Z", opacity: 0.15 }
    ];

    const spinnerSvg = (
        <svg
            viewBox="0 0 100 100"
            className={`animate-spin ${spinnerClass} ${className} shrink-0 drop-shadow-xs`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ animationDuration: '0.85s' }}
            role="status"
            aria-label="Loading"
        >
            {segments.map((seg, idx) => (
                <path
                    key={idx}
                    d={seg.d}
                    fill="#10B981"
                    opacity={seg.opacity}
                />
            ))}
        </svg>
    );

    if (fullscreen) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors">
                <div className="flex flex-col items-center gap-3">
                    {spinnerSvg}
                    {label && (
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide animate-pulse">
                            {label}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (label) {
        return (
            <div className="inline-flex items-center gap-2.5">
                {spinnerSvg}
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {label}
                </span>
            </div>
        );
    }

    return spinnerSvg;
}
