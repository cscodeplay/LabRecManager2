import React from 'react';

/**
 * Custom Vector Toolbar Icons (Google Argon Model 2 Style)
 * Crisp, scalable vector icons designed with consistent 1.75-2px stroke hierarchy,
 * modern geometric accents, and sharp rendering across standard and high-DPI (Retina) displays.
 */

// 1. Precision Selector / Cursor
export function ArgonSelectIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="M4 4l7.07 17 2.51-7.39L21 11.07 4 4z" fill="currentColor" fillOpacity="0.18" />
            <path d="M13.5 13.5l6.5 6.5" strokeWidth="2" />
            <circle cx="4" cy="4" r="1.5" fill="currentColor" />
        </svg>
    );
}

// 2. Dual-Bevel Precision Stylus Pen
export function ArgonPenIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="M17.5 2.5a2.12 2.12 0 0 1 3 3L8 18l-5 1.5 1.5-5L17.5 2.5z" fill="currentColor" fillOpacity="0.15" />
            <path d="M15 5l4 4" strokeWidth="1.5" />
            <path d="M4.5 19.5L7 17" strokeWidth="1.5" />
            <circle cx="3" cy="21" r="1" fill="currentColor" />
        </svg>
    );
}

// 3. Beveled Chisel-Tip Highlighter
export function ArgonHighlighterIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="M9.5 4l10 10-4.5 4.5-10-10L9.5 4z" fill="currentColor" fillOpacity="0.18" />
            <path d="M5 8.5L2 14l3.5 3.5 5.5-3" strokeWidth="1.5" />
            <path d="M14 2l4 4" strokeWidth="2" />
            <line x1="3" y1="21" x2="11" y2="21" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        </svg>
    );
}

// 4. Studio Beveled Block Eraser
export function ArgonEraserIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="M18 13l-5.5 5.5a2.12 2.12 0 0 1-3 0L3 12a2.12 2.12 0 0 1 0-3l5.5-5.5a2.12 2.12 0 0 1 3 0L18 10a2.12 2.12 0 0 1 0 3z" fill="currentColor" fillOpacity="0.16" />
            <path d="M7 8l5 5" strokeWidth="1.5" />
            <path d="M6 18h14" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

// 5. Crisp Geometric Line & Node
export function ArgonLineIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <line x1="4" y1="20" x2="20" y2="4" strokeWidth="2.2" />
            <circle cx="4" cy="20" r="2.5" fill="currentColor" />
            <circle cx="20" cy="4" r="2.5" fill="currentColor" />
        </svg>
    );
}

// 6. Geometric Primitives Fusion (Circle + Hexagon + Square)
export function ArgonShapeIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <rect x="3" y="9" width="10" height="10" rx="2" fill="currentColor" fillOpacity="0.18" />
            <circle cx="15.5" cy="8.5" r="5.5" fill="currentColor" fillOpacity="0.15" />
            <path d="M9 3l4 6H5l4-6z" strokeWidth="1.5" />
        </svg>
    );
}

// 7. Modern Typographic Text 'T'
export function ArgonTextIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <polyline points="4 7 4 4 20 4 20 7" strokeWidth="2" />
            <line x1="12" y1="4" x2="12" y2="20" strokeWidth="2.2" />
            <line x1="9" y1="20" x2="15" y2="20" strokeWidth="2" />
            <line x1="3" y1="22" x2="21" y2="22" strokeWidth="1.2" strokeDasharray="2 3" opacity="0.45" />
        </svg>
    );
}

// 8. Physical Caliper Geometry Compass
export function ArgonCompassIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <circle cx="12" cy="5" r="2.5" fill="currentColor" fillOpacity="0.25" />
            <path d="M10.5 7L4 21" strokeWidth="2" />
            <path d="M13.5 7L20 21" strokeWidth="2" />
            <path d="M7 16a6 6 0 0 1 10 0" strokeWidth="1.5" strokeDasharray="2 2" />
            <circle cx="12" cy="5" r="1" fill="currentColor" />
            <path d="M12 2v1.5" strokeWidth="2" />
        </svg>
    );
}

// 9. Metric Transparent Ruler with Millimetre Graduations
export function ArgonRulerIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <rect x="2" y="6" width="20" height="12" rx="2" fill="currentColor" fillOpacity="0.12" />
            <line x1="6" y1="6" x2="6" y2="12" strokeWidth="1.8" />
            <line x1="9" y1="6" x2="9" y2="9.5" strokeWidth="1.2" />
            <line x1="12" y1="6" x2="12" y2="12" strokeWidth="1.8" />
            <line x1="15" y1="6" x2="15" y2="9.5" strokeWidth="1.2" />
            <line x1="18" y1="6" x2="18" y2="12" strokeWidth="1.8" />
        </svg>
    );
}

// 10. Semicircular Protractor with Degree Ray
export function ArgonProtractorIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="M3 18 A9 9 0 0 1 21 18 Z" fill="currentColor" fillOpacity="0.15" />
            <line x1="3" y1="18" x2="21" y2="18" strokeWidth="2" />
            <line x1="12" y1="18" x2="12" y2="10" strokeWidth="1.5" />
            <line x1="12" y1="18" x2="18" y2="12" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="18" r="1.5" fill="currentColor" />
        </svg>
    );
}

// 11. Dual-Needle Steel Divider Caliper
export function ArgonDividerIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <circle cx="12" cy="4" r="2" fill="currentColor" />
            <path d="M11 6L5 21" strokeWidth="2" />
            <path d="M13 6L19 21" strokeWidth="2" />
            <line x1="7.5" y1="15" x2="16.5" y2="15" strokeWidth="1.3" strokeDasharray="2 2" />
            <circle cx="5" cy="21" r="0.8" fill="currentColor" />
            <circle cx="19" cy="21" r="0.8" fill="currentColor" />
        </svg>
    );
}

// 12. Fine Needle Tip Icon (Replaces Crosshair target on instruments)
export function ArgonNeedleIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Knurled needle chuck */}
            <circle cx="12" cy="6" r="3" fill="currentColor" fillOpacity="0.2" />
            <circle cx="12" cy="6" r="1.5" fill="currentColor" />
            {/* Tapered needle pin */}
            <path d="M11 8L11.7 20L12.3 20L13 8Z" fill="currentColor" />
            {/* Fine pinpoint */}
            <circle cx="12" cy="21.5" r="0.8" fill="currentColor" />
        </svg>
    );
}

// 13. Math Tablet / Formula Icon
export function ArgonMathIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="M3 13h2.5l2.5 8 5-18h8" strokeWidth="2" />
            <path d="M14 13h5" strokeWidth="1.8" />
            <path d="M16.5 10.5v5" strokeWidth="1.8" />
        </svg>
    );
}

// 14. Cartesian Graph & Curve Icon
export function ArgonGraphIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="M3 3v18h18" strokeWidth="2" />
            <path d="M6 16c3-1 5-9 8-9s4 7 7 6" strokeWidth="2.2" />
            <circle cx="14" cy="7" r="1.5" fill="currentColor" />
        </svg>
    );
}

// 15. Physics Orbit & Particle Icon
export function ArgonPhysicsIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)" strokeWidth="1.6" />
            <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)" strokeWidth="1.6" />
        </svg>
    );
}

// 16. Google Argon Model 2 Sparkle Star
export function ArgonSparkleIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
            {...props}
        >
            <path d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z" />
        </svg>
    );
}

// Custom Toolbar Icon Resolver: Maps standard tool IDs to Argon vector icons
export const ARGON_TOOL_ICON_MAP = {
    select: ArgonSelectIcon,
    pen: ArgonPenIcon,
    highlighter: ArgonHighlighterIcon,
    eraser: ArgonEraserIcon,
    line: ArgonLineIcon,
    shape: ArgonShapeIcon,
    text: ArgonTextIcon,
    geometry_instruments: ArgonCompassIcon,
    compass: ArgonCompassIcon,
    ruler: ArgonRulerIcon,
    protractor: ArgonProtractorIcon,
    divider: ArgonDividerIcon,
    math_tablet: ArgonMathIcon,
    graph_plotter: ArgonGraphIcon,
    physics_space: ArgonPhysicsIcon,
    ai_assistant: ArgonSparkleIcon
};

export function getCustomToolbarIcon(toolId, FallbackComponent) {
    return ARGON_TOOL_ICON_MAP[toolId] || FallbackComponent;
}
