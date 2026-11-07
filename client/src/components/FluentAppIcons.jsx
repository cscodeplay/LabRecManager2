'use client';

import React from 'react';

// Common shadow styling for Fluent depth
const shadowClass = "filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.18)]";

// Helper for Lucide polymorphism (accepts both className and size)
const getStyle = (size, customStyle) => (size ? { width: size, height: size, ...customStyle } : customStyle);

// ==========================================
// SURFACE 1: CODE PRACTICE IDE & CONSOLE
// ==========================================

/**
 * Authentic Python dual-snake vector glyph (PSF / MIT)
 */
export function FluentPythonIcon({ className = "w-4 h-4 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 128 128" fill="none" {...props}>
            <path fill="#387eb8" d="M63.58 3.5c-30.82 0-28.9 13.37-28.9 13.37l.03 13.85h29.35v4.18H23.51S3.5 32.55 3.5 63.56c0 31.02 17.43 29.9 17.43 29.9h10.4V78.85s-.56-17.43 17.15-17.43h29.07s16.6 0 16.6-16.03V16.87S96.27 3.5 63.58 3.5M47.7 12.63a4.7 4.7 0 1 1 0 9.4a4.7 4.7 0 0 1 0-9.4" />
            <path fill="#ffe052" d="M64.42 124.5c30.82 0 28.9-13.37 28.9-13.37l-.03-13.85H63.94v-4.18h40.55s20.01 2.35 20.01-28.66c0-31.02-17.43-29.9-17.43-29.9h-10.4v14.61s.56 17.43-17.15 17.43H30.85s-16.6 0-16.6 16.03v28.52s-2.12 13.37 30.57 13.37m15.88-9.13a4.7 4.7 0 1 1 0-9.4a4.7 4.7 0 0 1 0 9.4" />
        </svg>
    );
}

/**
 * SQL Relational Database Cylinder Glyph
 */
export function FluentSqlIcon({ className = "w-4 h-4 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <ellipse cx="16" cy="7" rx="12" ry="4" fill="#38bdf8" />
            <path d="M4 7v6c0 2.21 5.37 4 12 4s12-1.79 12-4V7" fill="#0284c7" />
            <ellipse cx="16" cy="13" rx="12" ry="3.5" fill="#38bdf8" opacity="0.6" />
            <path d="M4 14v6c0 2.21 5.37 4 12 4s12-1.79 12-4v-6" fill="#0369a1" />
            <ellipse cx="16" cy="20" rx="12" ry="3.5" fill="#38bdf8" opacity="0.6" />
            <path d="M4 21v4c0 2.21 5.37 4 12 4s12-1.79 12-4v-4" fill="#075985" />
            <polygon points="17,14 13,21 17,21 15,27 21,19 17,19" fill="#facc15" />
        </svg>
    );
}

/**
 * C++ Vector Glyph
 */
export function FluentCppIcon({ className = "w-4 h-4 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <polygon points="16,2 29,9.5 29,24.5 16,32 3,24.5 3,9.5" fill="#0284c7" />
            <polygon points="16,4 27,10.5 27,23.5 16,30 5,10.5" fill="#0369a1" />
            <path d="M15 11a5 5 0 1 0 0 10h2" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M21 14v4M19 16h4M26 14v4M24 16h4" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

/**
 * Microsoft Fluent 2 3D Crimson Bug (Interactive Debugger)
 */
export function FluentDebuggerIcon({ className = "w-4 h-4 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <path fill="#f43f5e" d="M16 6a6 6 0 0 0-6 6v2h12v-2a6 6 0 0 0-6-6" />
            <rect x="8" y="16" width="16" height="12" rx="6" fill="#e11d48" />
            <path stroke="#fb7185" strokeWidth="2" strokeLinecap="round" d="M4 14l6 2m0 0l-6 6m24-8l-6 2m0 0l6 6M8 8L5 5m19 3l3-3" />
            <circle cx="13" cy="11" r="1.2" fill="#ffffff" />
            <circle cx="19" cy="11" r="1.2" fill="#ffffff" />
            <line x1="16" y1="16" x2="16" y2="28" stroke="#9f1239" strokeWidth="1.5" />
        </svg>
    );
}

/**
 * Icons8 Flat Color Terminal Bezel with Emerald Prompt
 */
export function FluentTerminalIcon({ className = "w-4 h-4 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="3" y="5" width="26" height="22" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
            <rect x="3" y="5" width="26" height="6" rx="4" fill="#0f172a" />
            <circle cx="6.5" cy="8" r="1" fill="#ef4444" />
            <circle cx="9.5" cy="8" r="1" fill="#f59e0b" />
            <circle cx="12.5" cy="8" r="1" fill="#10b981" />
            <path stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M7 16l4 4l-4 4m6 0h6" />
        </svg>
    );
}

/**
 * Flowchart Visualizer Tri-color Node Diagram
 */
export function FluentFlowchartIcon({ className = "w-4 h-4 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="4" y="4" width="10" height="7" rx="2" fill="#3b82f6" />
            <polygon points="22 13 28 17.5 22 22 16 17.5" fill="#f59e0b" />
            <rect x="4" y="21" width="10" height="7" rx="2" fill="#10b981" />
            <path d="M9 11v10M14 17.5h2" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
            <circle cx="9" cy="11" r="1" fill="#93c5fd" />
            <circle cx="9" cy="21" r="1" fill="#86efac" />
        </svg>
    );
}

/**
 * AI Copilot Radiant Gradient Star
 */
export function FluentAICopilotIcon({ className = "w-4 h-4 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <defs>
                <linearGradient id="fluent_ai_copilot_grad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#38bdf8" />
                    <stop offset="0.5" stopColor="#818cf8" />
                    <stop offset="1" stopColor="#c084fc" />
                </linearGradient>
            </defs>
            <path fill="url(#fluent_ai_copilot_grad)" d="M16 2l3.5 10.5L30 16l-10.5 3.5L16 30l-3.5-10.5L2 16l10.5-3.5z" />
            <circle cx="16" cy="16" r="2.5" fill="#ffffff" opacity="0.9" />
        </svg>
    );
}

/**
 * Console Clear Action Button (Crimson Wastebasket)
 */
export function FluentConsoleClearIcon({ className = "w-4 h-4 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 48 48" fill="none" {...props}>
            <path fill="#f87171" d="M12 12h24l-2 28a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z" />
            <path fill="#dc2626" d="M9 8h30a2 2 0 0 1 2 2v2H7v-2a2 2 0 0 1 2-2z" />
            <rect x="19" y="4" width="10" height="4" rx="2" fill="#991b1b" />
            <line x1="20" y1="18" x2="20" y2="36" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="28" y1="18" x2="28" y2="36" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );
}

/**
 * Console Export Bundle Action Button (Royal Indigo Arrow to Tray)
 */
export function FluentConsoleExportIcon({ className = "w-4 h-4 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 48 48" fill="none" {...props}>
            <path fill="#38bdf8" d="M6 34v6a4 4 0 0 0 4 4h28a4 4 0 0 0 4-4v-6" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
            <path d="M24 6v24m-8-8l8 8l8-8" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// ==========================================
// SURFACE 2: TOP APP HEADER & PROFILE
// ==========================================

/**
 * Academic Session 3D Mortarboard Cap with Golden Tassel
 */
export function FluentAcademicSessionIcon({ className = "w-4 h-4 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <path fill="#3b82f6" d="M16 4l14 7l-14 7L2 11z" />
            <path fill="#1d4ed8" d="M6 14.5v6.5c0 4 4.5 7 10 7s10-3 10-7v-6.5l-10 5z" />
            <path stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" d="M28 12v9a2 2 0 1 0 4 0v-9z" />
            <circle cx="30" cy="22" r="1.5" fill="#f59e0b" />
        </svg>
    );
}

/**
 * Metallic Gold Brass Notification Bell with Clapper & Unread Ping
 */
export function FluentNotificationBellIcon({ className = "w-5 h-5 flex-shrink-0", size, style, hasUnread = false, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <path fill="#fbbf24" d="M16 3a3 3 0 0 0-3 3v1.1A10 10 0 0 0 6 17v4l-2 2v2h24v-2l-2-2v-4a10 10 0 0 0-7-9.9V6a3 3 0 0 0-3-3" />
            <path fill="#d97706" d="M16 29a4 4 0 0 0 4-4h-8a4 4 0 0 0 4 4" />
            {hasUnread && (
                <circle cx="23" cy="7" r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
            )}
        </svg>
    );
}

/**
 * 3D Royal Azure User Profile Glyph
 */
export function FluentUserProfileIcon({ className = "w-4 h-4 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <circle cx="16" cy="16" r="14" fill="#3b82f6" />
            <circle cx="16" cy="11" r="5" fill="#ffffff" />
            <path d="M7 26c0-4.5 4-7.5 9-7.5s9 3 9 7.5" fill="#ffffff" />
        </svg>
    );
}

/**
 * Satin-Finish Brass Padlock with Brushed Steel Shackle (Security & PIN Reset)
 */
export function FluentSecurityLockIcon({ className = "w-4 h-4 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="5" y="13" width="22" height="16" rx="4" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
            <path d="M10 13V9a6 6 0 0 1 12 0v4" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="16" cy="20" r="2" fill="#78350f" />
            <path d="M16 22v3" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

/**
 * Architectural Egress Portal with Crimson Departure Arrow (Sign Out / Logout)
 */
export function FluentSignOutIcon({ className = "w-4 h-4 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <path fill="#fee2e2" d="M6 5h12a3 3 0 0 1 3 3v3h-4V8H8v16h9v-3h4v3a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3" />
            <path fill="#ef4444" d="M21 11l6 5l-6 5v-3H12v-4h9z" />
        </svg>
    );
}

// ==========================================
// SURFACE 3: DASHBOARD STATS & SHORTCUTS
// ==========================================

/**
 * Layered Indigo Assignment Ledger with Verification Badge
 */
export function FluentAssignmentLedgerIcon({ className = "w-5 h-5 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="5" y="4" width="22" height="25" rx="3" fill="#6366f1" />
            <path fill="#818cf8" d="M5 4h22v6H5z" />
            <rect x="9" y="14" width="14" height="2" rx="1" fill="#c7d2fe" />
            <rect x="9" y="18" width="10" height="2" rx="1" fill="#c7d2fe" />
            <circle cx="23" cy="22" r="5" fill="#10b981" />
            <path d="M21 22l1.5 1.5l3-3" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/**
 * High-Definition LED Workstation Monitor with Stand
 */
export function FluentWorkstationIcon({ className = "w-5 h-5 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="3" y="5" width="26" height="16" rx="2" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
            <rect x="5" y="7" width="22" height="12" fill="#0f172a" />
            <path fill="#38bdf8" d="M12 21h8v3h-8zM8 24h16v2H8z" />
            <circle cx="16" cy="13" r="2" fill="#10b981" />
        </svg>
    );
}

/**
 * 3D Championship Trophy Goblet in Polished Gold on Mahogany Plinth
 */
export function FluentTrophyIcon({ className = "w-5 h-5 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <path fill="#f59e0b" d="M8 5h16v9a8 8 0 0 1-16 0z" />
            <path fill="#d97706" d="M4 7h4v4a4 4 0 0 1-4-4zm24 0h-4v4a4 4 0 0 0 4-4z" />
            <path fill="#b45309" d="M14 21h4v4h-4z" />
            <rect x="10" y="25" width="12" height="3" rx="1.5" fill="#78350f" />
            <circle cx="16" cy="11" r="3" fill="#fef3c7" />
        </svg>
    );
}

/**
 * Teal Desk Calendar Binder with Pinned Dates & Red Active Period Marker
 */
export function FluentTimetableIcon({ className = "w-5 h-5 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="4" y="6" width="24" height="22" rx="4" fill="#0d9488" />
            <rect x="4" y="6" width="24" height="7" rx="3" fill="#14b8a6" />
            <circle cx="9" cy="4" r="1.5" fill="#f8fafc" />
            <circle cx="23" cy="4" r="1.5" fill="#f8fafc" />
            <rect x="8" y="16" width="4" height="4" rx="1" fill="#ccfbf1" />
            <rect x="14" y="16" width="4" height="4" rx="1" fill="#ccfbf1" />
            <rect x="20" y="16" width="4" height="4" rx="1" fill="#ccfbf1" />
            <rect x="8" y="22" width="4" height="4" rx="1" fill="#ccfbf1" />
            <rect x="14" y="22" width="4" height="4" rx="1" fill="#f43f5e" />
        </svg>
    );
}

// ==========================================
// SURFACE 4: OFFICE DOCUMENT STUDIOS
// ==========================================

/**
 * Cobalt Word Processor Document with Typography Badge
 */
export function FluentWordDocIcon({ className = "w-6 h-6 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="5" y="3" width="22" height="26" rx="3" fill="#2563eb" />
            <path fill="#60a5fa" d="M10 9h12v2H10zm0 5h12v2H10zm0 5h8v2H10z" />
            <rect x="2" y="10" width="10" height="12" rx="2" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="1.5" />
            <text x="4" y="19" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="9" fill="#ffffff">W</text>
        </svg>
    );
}

/**
 * Emerald Excel Spreadsheet Workbook with Grid Badge
 */
export function FluentExcelDocIcon({ className = "w-6 h-6 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="5" y="3" width="22" height="26" rx="3" fill="#16a34a" />
            <path fill="#4ade80" d="M10 9h12v1H10zm0 4h12v1H10zm0 4h12v1H10zm0 4h12v1H10z" />
            <rect x="2" y="10" width="10" height="12" rx="2" fill="#15803d" stroke="#22c55e" strokeWidth="1.5" />
            <text x="4.5" y="19" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="9" fill="#ffffff">X</text>
        </svg>
    );
}

/**
 * Scarlet PDF Document Seal with PDF Badge
 */
export function FluentPdfDocIcon({ className = "w-6 h-6 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="5" y="3" width="22" height="26" rx="3" fill="#dc2626" />
            <path fill="#f87171" d="M9 18h14v2H9zm0 4h10v2H9z" />
            <rect x="2" y="9" width="11" height="12" rx="2" fill="#b91c1c" stroke="#ef4444" strokeWidth="1.5" />
            <text x="3.5" y="18" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="7" fill="#ffffff">PDF</text>
        </svg>
    );
}

/**
 * Amber Presentation Deck with Projection Aperture
 */
export function FluentSlidesDocIcon({ className = "w-6 h-6 flex-shrink-0", size, style, ...props }) {
    return (
        <svg style={getStyle(size, style)} className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="4" y="5" width="24" height="18" rx="3" fill="#ea580c" />
            <rect x="7" y="8" width="18" height="12" rx="1.5" fill="#fed7aa" />
            <path fill="#ea580c" d="M9 10h6v3H9zm0 5h14v1.5H9z" />
            <rect x="2" y="10" width="10" height="12" rx="2" fill="#c2410c" stroke="#f97316" strokeWidth="1.5" />
            <text x="4" y="19" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="9" fill="#ffffff">P</text>
        </svg>
    );
}
