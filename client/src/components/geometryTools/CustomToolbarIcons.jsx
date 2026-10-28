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

// 17. Paint Bucket & Liquid Fill Icon
export function ArgonFillIcon({ className = "w-4 h-4", ...props }) {
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
            <path d="M19 11L13 5L4.5 13.5C3.7 14.3 3.7 15.7 4.5 16.5L7.5 19.5C8.3 20.3 9.7 20.3 10.5 19.5L19 11Z" fill="currentColor" fillOpacity="0.16" />
            <path d="M5 2L13 10" strokeWidth="1.6" />
            <path d="M2 12l8 8" strokeWidth="1.6" />
            <path d="M19 11a4 4 0 0 1 0 8 2 2 0 0 1-2-2c0-1.5 2-2 2-6z" fill="currentColor" fillOpacity="0.3" />
        </svg>
    );
}

// 18. Structured Table & Data Grid Icon
export function ArgonTableIcon({ className = "w-4 h-4", ...props }) {
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
            <rect x="3" y="4" width="18" height="16" rx="2" fill="currentColor" fillOpacity="0.12" />
            <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
            <line x1="3" y1="15" x2="21" y2="15" strokeWidth="1.5" />
            <line x1="9" y1="4" x2="9" y2="20" strokeWidth="1.8" />
            <line x1="15" y1="4" x2="15" y2="20" strokeWidth="1.8" />
        </svg>
    );
}

// 19. Pan & Canvas Grab Hand Icon
export function ArgonGrabIcon({ className = "w-4 h-4", ...props }) {
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
            <path d="M18 11V6a2 2 0 0 0-4 0v4" />
            <path d="M14 10V4a2 2 0 0 0-4 0v7" />
            <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
            <path d="M6 14a2 2 0 0 0-2 2v2a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-5a2 2 0 0 0-4 0" fill="currentColor" fillOpacity="0.16" />
        </svg>
    );
}

// 20. Video & Audio Media Player Icon
export function ArgonMediaIcon({ className = "w-4 h-4", ...props }) {
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
            <rect x="2" y="3" width="20" height="18" rx="3" fill="currentColor" fillOpacity="0.12" />
            <path d="M10 8.5l6 3.5-6 3.5v-7z" fill="currentColor" />
            <line x1="2" y1="8" x2="6" y2="8" strokeWidth="1.5" />
            <line x1="18" y1="8" x2="22" y2="8" strokeWidth="1.5" />
            <line x1="2" y1="16" x2="6" y2="16" strokeWidth="1.5" />
            <line x1="18" y1="16" x2="22" y2="16" strokeWidth="1.5" />
        </svg>
    );
}

// 21. Isometric 3D Model Cube Icon
export function Argon3DIcon({ className = "w-4 h-4", ...props }) {
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
            <path d="M12 2l9 5-9 5-9-5 9-5z" fill="currentColor" fillOpacity="0.25" />
            <path d="M21 7v10l-9 5V12l9-5z" fill="currentColor" fillOpacity="0.18" />
            <path d="M3 7v10l9 5V12L3 7z" fill="currentColor" fillOpacity="0.1" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
    );
}

// 22. Classroom Tasks Checklist Icon
export function ArgonTasksIcon({ className = "w-4 h-4", ...props }) {
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
            <rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor" fillOpacity="0.1" />
            <path d="M7 8l2 2 4-4" strokeWidth="2" />
            <line x1="15" y1="9" x2="18" y2="9" strokeWidth="1.8" />
            <line x1="7" y1="14" x2="18" y2="14" strokeWidth="1.8" />
            <line x1="7" y1="18" x2="14" y2="18" strokeWidth="1.8" />
        </svg>
    );
}

// 23. Focus Spotlight Torch Icon
export function ArgonSpotlightIcon({ className = "w-4 h-4", ...props }) {
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
            <path d="M15 3l6 6-4 4-6-6 4-4z" fill="currentColor" fillOpacity="0.2" />
            <path d="M11 7L3 15v4l2 2h4l8-8" strokeWidth="1.8" />
            <line x1="17" y1="5" x2="20" y2="8" strokeWidth="2" />
            <path d="M18 14l4 4" strokeWidth="1.5" strokeDasharray="2 2" />
            <path d="M14 18l4 4" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
    );
}

// 24. Screen Curtain & Theater Projector Icon
export function ArgonCurtainIcon({ className = "w-4 h-4", ...props }) {
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
            <rect x="2" y="3" width="20" height="4" rx="1.5" fill="currentColor" />
            <path d="M4 7v13c3-1 5-1 8 0v-13" fill="currentColor" fillOpacity="0.18" />
            <path d="M12 7v13c3-1 5-1 8 0v-13" fill="currentColor" fillOpacity="0.12" />
            <line x1="12" y1="17" x2="12" y2="21" strokeWidth="2" />
            <circle cx="12" cy="21" r="1.5" fill="currentColor" />
        </svg>
    );
}

// 25. Screen & Lecture Recorder Icon
export function ArgonRecorderIcon({ className = "w-4 h-4", ...props }) {
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
            <rect x="2" y="5" width="14" height="14" rx="3" fill="currentColor" fillOpacity="0.14" />
            <polygon points="16,10 22,7 22,17 16,14" fill="currentColor" fillOpacity="0.25" />
            <circle cx="9" cy="12" r="3" fill="#ef4444" stroke="none" />
        </svg>
    );
}

// 26. Classroom Timer & Stopwatch Icon
export function ArgonTimerIcon({ className = "w-4 h-4", ...props }) {
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
            <circle cx="12" cy="13" r="8" fill="currentColor" fillOpacity="0.12" />
            <path d="M12 9v4l3 3" strokeWidth="2" />
            <line x1="12" y1="2" x2="12" y2="5" strokeWidth="2.2" />
            <line x1="10" y1="2" x2="14" y2="2" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="18.5" y1="5.5" x2="20" y2="7" strokeWidth="1.8" />
        </svg>
    );
}

// 27. Layout Templates & SmartArt Wireframe Icon
export function ArgonTemplatesIcon({ className = "w-4 h-4", ...props }) {
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
            <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" fillOpacity="0.1" />
            <rect x="6" y="6" width="5" height="5" rx="1" fill="currentColor" fillOpacity="0.25" />
            <line x1="14" y1="7" x2="18" y2="7" strokeWidth="1.8" />
            <line x1="14" y1="10" x2="18" y2="10" strokeWidth="1.8" />
            <rect x="6" y="14" width="12" height="4" rx="1" fill="currentColor" fillOpacity="0.2" />
        </svg>
    );
}

// 28. Keyboard Shortcuts & Keycap Icon
export function ArgonShortcutsIcon({ className = "w-4 h-4", ...props }) {
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
            <rect x="3" y="4" width="18" height="16" rx="2.5" fill="currentColor" fillOpacity="0.12" />
            <path d="M7 8h.01M11 8h.01M15 8h.01M7 12h.01M11 12h.01M15 12h.01M7 16h10" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );
}

// 29. Web Browser & Search Globe Icon
export function ArgonBrowserIcon({ className = "w-4 h-4", ...props }) {
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
            <circle cx="11" cy="11" r="8" fill="currentColor" fillOpacity="0.1" />
            <line x1="3" y1="11" x2="19" y2="11" strokeWidth="1.5" />
            <path d="M11 3c2.5 2.5 4 5 4 8s-1.5 5.5-4 8c-2.5-2.5-4-5-4-8s1.5-5.5 4-8z" strokeWidth="1.5" />
            <line x1="17" y1="17" x2="22" y2="22" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );
}

// 30. Whiteboard Games Controller Icon
export function ArgonGamesIcon({ className = "w-4 h-4", ...props }) {
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
            <rect x="2" y="6" width="20" height="12" rx="4" fill="currentColor" fillOpacity="0.15" />
            <path d="M6 12h4M8 10v4" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="10" r="1.2" fill="currentColor" />
            <circle cx="18" cy="13" r="1.2" fill="currentColor" />
        </svg>
    );
}

// 31. Parametric Geometry Curve & Angle Icon
export function ArgonParametricIcon({ className = "w-4 h-4", ...props }) {
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
            <circle cx="6" cy="18" r="2" fill="currentColor" />
            <circle cx="18" cy="6" r="2" fill="currentColor" />
            <path d="M6 18C6 9 12 6 18 6" strokeWidth="2.2" />
            <path d="M6 14a6 6 0 0 1 6-6" strokeWidth="1.5" strokeDasharray="2 2" />
            <path d="M14 6l4 0l0 4" strokeWidth="1.8" />
        </svg>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// CURATED PRESET ALTERNATIVE ICONS (for customization picker)
// ══════════════════════════════════════════════════════════════════════════════

export function PresetFountainPenIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
            <path d="M12 2L19 9L15 22L12 18L9 22L5 9L12 2Z" fill="currentColor" fillOpacity="0.15" />
            <circle cx="12" cy="10" r="1.5" fill="currentColor" />
            <line x1="12" y1="10" x2="12" y2="18" strokeWidth="1.8" />
        </svg>
    );
}

export function PresetBrushIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L11 16l-5 1 1-5 11.5-9.5z" fill="currentColor" fillOpacity="0.15" />
            <path d="M4 21c1.5 0 3-1 3-3s-1-2-2-3-2 1-2 2 0 4 1 4z" fill="currentColor" />
        </svg>
    );
}

export function PresetChalkEraserIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
            <rect x="3" y="6" width="18" height="12" rx="2" fill="currentColor" fillOpacity="0.18" />
            <line x1="3" y1="14" x2="21" y2="14" strokeWidth="2" />
            <line x1="7" y1="9" x2="17" y2="9" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
    );
}

export function PresetPaintRollerIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
            <rect x="4" y="3" width="16" height="6" rx="2" fill="currentColor" fillOpacity="0.2" />
            <path d="M20 6v5a2 2 0 0 1-2 2H8a2 2 0 0 0-2 2v2" strokeWidth="2" />
            <rect x="4" y="17" width="4" height="6" rx="1" fill="currentColor" />
        </svg>
    );
}

export function PresetSpreadsheetIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
            <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" fillOpacity="0.1" />
            <line x1="3" y1="9" x2="21" y2="9" strokeWidth="2" />
            <line x1="9" y1="3" x2="9" y2="21" strokeWidth="2" />
            <circle cx="6" cy="6" r="1" fill="currentColor" />
        </svg>
    );
}

export function PresetPiMathIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
            <line x1="4" y1="6" x2="20" y2="6" strokeWidth="2.5" />
            <path d="M8 6v12c0 1.5-1 2-2 2" strokeWidth="2.2" />
            <path d="M16 6v12c0 1 1 2 2.5 2" strokeWidth="2.2" />
        </svg>
    );
}

export const PRESET_ICONS_REGISTRY = {
    'fountain_pen': PresetFountainPenIcon,
    'brush': PresetBrushIcon,
    'chalk_eraser': PresetChalkEraserIcon,
    'paint_roller': PresetPaintRollerIcon,
    'spreadsheet': PresetSpreadsheetIcon,
    'pi_math': PresetPiMathIcon,
    'argon_pen': ArgonPenIcon,
    'argon_select': ArgonSelectIcon,
    'argon_eraser': ArgonEraserIcon,
    'argon_fill': ArgonFillIcon,
    'argon_table': ArgonTableIcon,
    'argon_compass': ArgonCompassIcon,
    'argon_ruler': ArgonRulerIcon,
    'argon_math': ArgonMathIcon,
    'argon_media': ArgonMediaIcon,
    'argon_3d': Argon3DIcon,
    'argon_tasks': ArgonTasksIcon,
    'argon_spotlight': ArgonSpotlightIcon,
    'argon_curtain': ArgonCurtainIcon,
    'argon_recorder': ArgonRecorderIcon,
    'argon_timer': ArgonTimerIcon
};

// Custom Toolbar Icon Resolver: Maps standard tool IDs to Argon vector icons
export const ARGON_TOOL_ICON_MAP = {
    select: ArgonSelectIcon,
    grab: ArgonGrabIcon,
    pen: ArgonPenIcon,
    highlighter: ArgonHighlighterIcon,
    eraser: ArgonEraserIcon,
    fill: ArgonFillIcon,
    line: ArgonLineIcon,
    shape: ArgonShapeIcon,
    table: ArgonTableIcon,
    text: ArgonTextIcon,
    geometry_instruments: ArgonCompassIcon,
    compass: ArgonCompassIcon,
    ruler: ArgonRulerIcon,
    protractor: ArgonProtractorIcon,
    setsquare: ArgonRulerIcon,
    divider: ArgonDividerIcon,
    math_tablet: ArgonMathIcon,
    math_solver: ArgonSparkleIcon,
    parametric_shape: ArgonParametricIcon,
    graph_plotter: ArgonGraphIcon,
    physics_space: ArgonPhysicsIcon,
    media: ArgonMediaIcon,
    domain_3d: Argon3DIcon,
    tasks: ArgonTasksIcon,
    templates: ArgonTemplatesIcon,
    shortcuts: ArgonShortcutsIcon,
    timer: ArgonTimerIcon,
    spotlight: ArgonSpotlightIcon,
    curtain: ArgonCurtainIcon,
    recorder: ArgonRecorderIcon,
    games: ArgonGamesIcon,
    browser_panel: ArgonBrowserIcon,
    ai_assistant: ArgonSparkleIcon,
    ai_copilot: ArgonSparkleIcon
};

export const PRESET_ICON_PACKS = [
    { id: 'argon', label: 'Argon 2.0 (Modern Vector)', description: 'Crisp, precision-engineered vector icons with subtle geometric accents' },
    { id: 'lucide', label: 'Lucide Classic (Outline)', description: 'Universal, clean lightweight outline vector icons' },
    { id: 'classroom', label: 'Classroom (High Contrast)', description: 'Bold, classroom-friendly icons optimized for interactive smartboards' },
    { id: 'minimal', label: 'Minimalist (Ultra Fine)', description: 'Distraction-free geometric wireframe icons' }
];

export function sanitizeSvgMarkup(rawSvg) {
    if (!rawSvg || typeof rawSvg !== 'string') return '';
    let cleaned = rawSvg.trim();
    cleaned = cleaned.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/on\w+="[^"]*"/gi, '');
    cleaned = cleaned.replace(/on\w+='[^']*'/gi, '');
    if (!/viewBox=/i.test(cleaned) && /width=/i.test(cleaned) && /height=/i.test(cleaned)) {
        const wMatch = cleaned.match(/width=["']?(\d+)/i);
        const hMatch = cleaned.match(/height=["']?(\d+)/i);
        if (wMatch && hMatch) {
            cleaned = cleaned.replace(/<svg/i, `<svg viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"`);
        }
    }
    cleaned = cleaned.replace(/<svg([^>]*?)(\s+width=["'][^"']*["'])?/i, (m, rest) => {
        const cleanRest = rest.replace(/\s+width=["'][^"']*["']/i, '').replace(/\s+height=["'][^"']*["']/i, '');
        return `<svg width="100%" height="100%" ${cleanRest}`;
    });
    return cleaned;
}

export function getCustomToolbarIconsMap() {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem('wb_custom_toolbar_icons');
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

export function getCustomIconConfig(toolId) {
    if (typeof window === 'undefined') return null;
    const localMap = getCustomToolbarIconsMap();
    if (localMap[toolId]) return localMap[toolId];
    if (window.__CUSTOM_WHITEBOARD_ICONS__ && window.__CUSTOM_WHITEBOARD_ICONS__[toolId]) {
        const val = window.__CUSTOM_WHITEBOARD_ICONS__[toolId];
        return typeof val === 'string' ? { type: val.startsWith('<svg') ? 'svg' : 'url', value: val } : val;
    }
    return null;
}

export function saveCustomToolbarIcon(toolId, iconData) {
    if (typeof window === 'undefined') return;
    const map = getCustomToolbarIconsMap();
    map[toolId] = iconData;
    try {
        localStorage.setItem('wb_custom_toolbar_icons', JSON.stringify(map));
        window.dispatchEvent(new CustomEvent('wb-custom-icons-updated', { detail: { toolId, iconData } }));
    } catch (e) {
        console.error('Failed to save custom toolbar icon:', e);
    }
}

export function resetCustomToolbarIcon(toolId) {
    if (typeof window === 'undefined') return;
    const map = getCustomToolbarIconsMap();
    delete map[toolId];
    try {
        localStorage.setItem('wb_custom_toolbar_icons', JSON.stringify(map));
        window.dispatchEvent(new CustomEvent('wb-custom-icons-updated', { detail: { toolId } }));
    } catch (e) {}
}

export function resetAllCustomToolbarIcons() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem('wb_custom_toolbar_icons');
        window.dispatchEvent(new CustomEvent('wb-custom-icons-updated', { detail: { all: true } }));
    } catch (e) {}
}

export function getActiveIconPack() {
    if (typeof window === 'undefined') return 'argon';
    try {
        return localStorage.getItem('wb_toolbar_icon_pack') || 'argon';
    } catch (e) {
        return 'argon';
    }
}

export function setActiveIconPack(packId) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem('wb_toolbar_icon_pack', packId);
        window.dispatchEvent(new CustomEvent('wb-custom-icons-updated', { detail: { pack: packId } }));
    } catch (e) {}
}

export function exportCustomIconsTheme() {
    return JSON.stringify({
        version: '1.0',
        timestamp: new Date().toISOString(),
        iconPack: getActiveIconPack(),
        customIcons: getCustomToolbarIconsMap()
    }, null, 2);
}

export function importCustomIconsTheme(jsonStr) {
    if (!jsonStr) return false;
    try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.customIcons && typeof parsed.customIcons === 'object') {
            localStorage.setItem('wb_custom_toolbar_icons', JSON.stringify(parsed.customIcons));
        }
        if (parsed.iconPack) {
            localStorage.setItem('wb_toolbar_icon_pack', parsed.iconPack);
        }
        window.dispatchEvent(new CustomEvent('wb-custom-icons-updated', { detail: { imported: true } }));
        return true;
    } catch (e) {
        console.error('Failed to import custom icons theme:', e);
        return false;
    }
}

export const EXTERNAL_AI_ICONS_REGISTRY = {};

/**
 * Dynamic Custom Icon Component
 * Automatically tries to load the user custom override first,
 * then checks icon pack or Argon vector or Lucide fallback.
 */
export function CustomToolIcon({ toolId, fallback: FallbackComponent, className = "w-4 h-4", alt = "", ...props }) {
    const [revision, setRevision] = React.useState(0);

    React.useEffect(() => {
        const handleUpdate = () => setRevision(r => r + 1);
        window.addEventListener('wb-custom-icons-updated', handleUpdate);
        return () => window.removeEventListener('wb-custom-icons-updated', handleUpdate);
    }, []);

    const customConfig = getCustomIconConfig(toolId);
    if (customConfig) {
        if (customConfig.type === 'svg' && customConfig.value) {
            return (
                <span
                    className={`inline-flex items-center justify-center ${className}`}
                    style={{ ...props.style, overflow: 'hidden' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeSvgMarkup(customConfig.value) }}
                    {...props}
                />
            );
        }
        if (customConfig.type === 'url' && customConfig.value) {
            return (
                <img
                    src={customConfig.value}
                    alt={alt || toolId}
                    className={`${className} object-contain`}
                    {...props}
                />
            );
        }
        if (customConfig.type === 'preset' && PRESET_ICONS_REGISTRY[customConfig.value]) {
            const Preset = PRESET_ICONS_REGISTRY[customConfig.value];
            return <Preset className={className} {...props} />;
        }
    }

    const pack = getActiveIconPack();
    if (pack === 'lucide' && FallbackComponent) {
        return <FallbackComponent className={className} {...props} />;
    }

    const ArgonComp = ARGON_TOOL_ICON_MAP[toolId];
    if (ArgonComp) {
        return <ArgonComp className={className} {...props} />;
    }

    if (FallbackComponent) {
        return <FallbackComponent className={className} {...props} />;
    }

    return null;
}

/**
 * Dynamic Toolbar Icon Provider
 * Returns a high-performance React component bound to toolId that updates dynamically.
 */
export function getCustomToolbarIcon(toolId, FallbackComponent) {
    const DynamicIcon = React.forwardRef((props, ref) => {
        const { className = "w-4 h-4", style, ...rest } = props;
        const [revision, setRevision] = React.useState(0);

        React.useEffect(() => {
            const handleUpdate = () => setRevision(r => r + 1);
            window.addEventListener('wb-custom-icons-updated', handleUpdate);
            return () => window.removeEventListener('wb-custom-icons-updated', handleUpdate);
        }, []);

        const customConfig = getCustomIconConfig(toolId);
        if (customConfig) {
            if (customConfig.type === 'svg' && customConfig.value) {
                return (
                    <span
                        ref={ref}
                        className={`inline-flex items-center justify-center ${className}`}
                        style={{ ...style, overflow: 'hidden' }}
                        dangerouslySetInnerHTML={{ __html: sanitizeSvgMarkup(customConfig.value) }}
                        {...rest}
                    />
                );
            }
            if (customConfig.type === 'url' && customConfig.value) {
                return (
                    <img
                        ref={ref}
                        src={customConfig.value}
                        alt={toolId}
                        className={`${className} object-contain`}
                        style={style}
                        {...rest}
                    />
                );
            }
            if (customConfig.type === 'preset' && PRESET_ICONS_REGISTRY[customConfig.value]) {
                const Preset = PRESET_ICONS_REGISTRY[customConfig.value];
                return <Preset ref={ref} className={className} style={style} {...rest} />;
            }
        }

        const pack = getActiveIconPack();
        if (pack === 'lucide' && FallbackComponent) {
            return <FallbackComponent ref={ref} className={className} style={style} {...rest} />;
        }

        const ArgonComp = ARGON_TOOL_ICON_MAP[toolId];
        if (ArgonComp) {
            return <ArgonComp ref={ref} className={className} style={style} {...rest} />;
        }

        if (FallbackComponent) {
            return <FallbackComponent ref={ref} className={className} style={style} {...rest} />;
        }

        return null;
    });

    DynamicIcon.displayName = `CustomToolbarIcon_${toolId}`;
    return DynamicIcon;
}

