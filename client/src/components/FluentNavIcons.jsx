'use client';

import React from 'react';

// Common shadow styling for Fluent depth
const shadowClass = "filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.18)]";

// 1. Dashboard (3D Orange & Terracotta House)
export function FluentDashboardIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <path d="M16 2L2 14h5v14h18V14h5L16 2z" fill="#f97316" />
            <path d="M16 2L16 14h10V14h4L16 2z" fill="#ea580c" />
            <path d="M12 28V18h8v10h-8z" fill="#fed7aa" />
            <path d="M12 18h8v2h-8z" fill="#fdba74" />
            <rect x="7" y="18" width="3" height="4" rx="0.5" fill="#ffedd5" />
        </svg>
    );
}

// 2. Code Practice IDE (Terminal Window with macOS red/yellow/green dots & cyan code prompt)
export function FluentCodePracticeIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="2" y="4" width="28" height="24" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            <circle cx="6" cy="9" r="1.5" fill="#ef4444" />
            <circle cx="10" cy="9" r="1.5" fill="#f59e0b" />
            <circle cx="14" cy="9" r="1.5" fill="#10b981" />
            <path d="M7 16l4 3-4 3" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="14" y1="22" x2="20" y2="22" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

// 3. Classes & Students (Multi-color student group avatars)
export function FluentClassesIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <circle cx="12" cy="10" r="5" fill="#f87171" />
            <path d="M4 26c0-4.418 3.582-8 8-8s8 3.582 8 8H4z" fill="#ef4444" />
            <circle cx="22" cy="12" r="4" fill="#38bdf8" />
            <path d="M16 26c0-3.314 2.686-6 6-6s6 2.686 6 6h-12z" fill="#0284c7" />
        </svg>
    );
}

// 4. Manage Users (User with golden addition plus badge)
export function FluentManageUsersIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <circle cx="13" cy="11" r="6" fill="#38bdf8" />
            <path d="M4 27c0-4.97 4.03-9 9-9s9 4.03 9 9H4z" fill="#0284c7" />
            <circle cx="24" cy="11" r="5" fill="#10b981" />
            <path d="M24 8v6M21 11h6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

// 5. Labs & PC Stations (Silver iMac desktop workstation with glowing cyan terminal)
export function FluentLabsIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="2" y="4" width="28" height="19" rx="3" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
            <rect x="5" y="7" width="22" height="13" rx="1.5" fill="#0284c7" />
            <path d="M8 12l3 3-3 3" stroke="#e0f2fe" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 23v4M10 27h12" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

// 6. Assignments (Master Curriculum Dossier with gold ribbon and verified seal)
export function FluentAssignmentsIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <defs>
                <linearGradient id="fluent_assign_base" x1="4" y1="3" x2="28" y2="29" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3b82f6" />
                    <stop offset="1" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="fluent_assign_ribbon" x1="18" y1="2" x2="24" y2="14" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#fbbf24" />
                    <stop offset="1" stopColor="#d97706" />
                </linearGradient>
            </defs>
            {/* Indigo/Blue Master Folder Binder */}
            <rect x="4" y="3" width="24" height="26" rx="4" fill="url(#fluent_assign_base)" stroke="#60a5fa" strokeWidth="1.2" />
            <path d="M4 8h24v2H4z" fill="#1e40af" opacity="0.6" />
            {/* Bookmark Ribbon */}
            <path d="M19 2v10l3-2.5l3 2.5V2z" fill="url(#fluent_assign_ribbon)" />
            {/* Ruled Assignment Content Lines */}
            <rect x="8" y="14" width="8" height="2" rx="1" fill="#93c5fd" />
            <rect x="8" y="18" width="16" height="2" rx="1" fill="#bfdbfe" />
            <rect x="8" y="22" width="12" height="2" rx="1" fill="#bfdbfe" />
            {/* Verification Checkmark Badge */}
            <circle cx="22" cy="23" r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
            <path d="M20.5 23l1 1l2-2" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// 6b. Assigned Work (Class Dispatch & Task Distribution Board with student nodes & deadline clock)
export function FluentAssignedWorkIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <defs>
                <linearGradient id="fluent_dispatch_bg" x1="3" y1="5" x2="29" y2="27" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0d9488" />
                    <stop offset="1" stopColor="#0f766e" />
                </linearGradient>
            </defs>
            {/* Teal Work Allocation Board */}
            <rect x="3" y="5" width="26" height="22" rx="4" fill="url(#fluent_dispatch_bg)" stroke="#2dd4bf" strokeWidth="1.2" />
            <rect x="3" y="5" width="26" height="6" rx="4" fill="#134e4a" />
            {/* Student/Group Avatar Nodes */}
            <circle cx="9" cy="17" r="3" fill="#38bdf8" />
            <circle cx="17" cy="17" r="3" fill="#818cf8" />
            {/* Outgoing Distribution Links */}
            <path d="M9 22c0-2 2-3 4-3h4c2 0 4 1 4 3" stroke="#ccfbf1" strokeWidth="1.5" strokeLinecap="round" />
            {/* Live Scheduled Clock / Pin Badge */}
            <circle cx="23" cy="10" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
            <path d="M23 8v2.5l1.5 1" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}

// 6c. Review Submissions (Turn-in Ingestion Tray & Inspection Evaluation Lens)
export function FluentReviewSubmissionsIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <defs>
                <linearGradient id="fluent_tray_grad" x1="4" y1="12" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4f46e5" />
                    <stop offset="1" stopColor="#3730a3" />
                </linearGradient>
            </defs>
            {/* Turn-in Ingestion Tray Base */}
            <path d="M4 14l3-8h18l3 8v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V14z" fill="url(#fluent_tray_grad)" stroke="#818cf8" strokeWidth="1.2" />
            {/* Inflowing Submission Document */}
            <rect x="9" y="4" width="14" height="12" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
            <line x1="12" y1="7" x2="20" y2="7" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="10" x2="18" y2="10" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
            {/* Front Cutout of Tray */}
            <path d="M4 18h8v3h8v-3h8v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-8z" fill="#312e81" />
            {/* Inspection / Evaluation Magnifier Lens with Green Verified Tick */}
            <circle cx="22" cy="18" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M19.5 18l1.8 1.8l3.2-3.2" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M26.5 22.5l3 3" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

// 7. Training & Courses (Graduation cap with gold tassel and diploma)
export function FluentTrainingIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <polygon points="16,4 30,11 16,18 2,11" fill="#4f46e5" />
            <polygon points="16,4 30,11 16,14 2,11" fill="#6366f1" />
            <path d="M7 14v8c0 4.4 4 8 9 8s9-3.6 9-8v-8" fill="#4338ca" />
            <path d="M28 12v9" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            <circle cx="28" cy="22" r="2" fill="#fbbf24" />
        </svg>
    );
}

// 8. Documents & Office Suite (Multi-sheet stack: Word doc + Excel sheet)
export function FluentDocumentsIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="8" y="2" width="18" height="24" rx="2" fill="#10b981" />
            <rect x="4" y="6" width="18" height="24" rx="2" fill="#2563eb" />
            <path d="M8 12h10M8 16h8M8 20h6" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="18" y="16" width="10" height="12" rx="1.5" fill="#f97316" />
            <circle cx="23" cy="22" r="2.5" fill="#ffffff" />
        </svg>
    );
}

// 9. Storage / Hard Drive (Server rack array with emerald activity lights)
export function FluentStorageIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="3" y="5" width="26" height="9" rx="2.5" fill="#334155" stroke="#475569" strokeWidth="1" />
            <circle cx="7" cy="9.5" r="1.5" fill="#10b981" />
            <circle cx="11" cy="9.5" r="1.5" fill="#38bdf8" />
            <line x1="16" y1="9.5" x2="25" y2="9.5" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />

            <rect x="3" y="18" width="26" height="9" rx="2.5" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <circle cx="7" cy="22.5" r="1.5" fill="#10b981" />
            <circle cx="11" cy="22.5" r="1.5" fill="#f59e0b" />
            <line x1="16" y1="22.5" x2="25" y2="22.5" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

// 10. Grades & Awards (3D Golden Trophy Cup with star insignia)
export function FluentGradesIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <path d="M7 6h18v7a9 9 0 01-18 0V6z" fill="#eab308" />
            <path d="M7 8H3a3 3 0 003 3h1V8zM25 8h4a3 3 0 01-3 3h-1V8z" fill="#ca8a04" />
            <rect x="14" y="19" width="4" height="6" fill="#eab308" />
            <path d="M10 25h12v3H10z" fill="#ca8a04" />
            <polygon points="16,8 17.5,12 21.5,12 18,14.5 19.5,18.5 16,16 12.5,18.5 14,14.5 10.5,12 14.5,12" fill="#fef08a" />
        </svg>
    );
}

// 11. Live Meetings (Cobalt blue HD camera with optical lens)
export function FluentMeetingsIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="3" y="8" width="18" height="16" rx="3" fill="#2563eb" />
            <path d="M21 12l8-5v18l-8-5V12z" fill="#1d4ed8" />
            <circle cx="12" cy="16" r="4" fill="#60a5fa" />
            <circle cx="12" cy="16" r="2" fill="#1e3a8a" />
        </svg>
    );
}

// 12. Interactive Whiteboard (Wooden easel with artist canvas)
export function FluentWhiteboardIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <path d="M16 3l-8 23h3l1.8-5h6.4l1.8 5h3L16 3z" fill="#b45309" />
            <rect x="6" y="7" width="20" height="13" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
            <circle cx="12" cy="13" r="2.5" fill="#38bdf8" />
            <path d="M16 15l4-3v6l-4-3z" fill="#f43f5e" />
        </svg>
    );
}

// 13. AI Quiz Maker (Glowing purple & gold brain lightbulb with sparks)
export function FluentQuizIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <circle cx="16" cy="16" r="12" fill="#8b5cf6" />
            <path d="M16 7c-3.3 0-6 2.7-6 6 0 2.2 1.2 4.1 3 5.1V20h6v-1.9c1.8-1 3-2.9 3-5.1 0-3.3-2.7-6-6-6z" fill="#fde047" />
            <circle cx="24" cy="7" r="2" fill="#ec4899" />
            <circle cx="7" cy="8" r="1.5" fill="#38bdf8" />
        </svg>
    );
}

// 14. Activity Logs (Heartbeat pulse monitor in emerald/teal)
export function FluentActivityIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <circle cx="16" cy="16" r="13" fill="#0f766e" />
            <path d="M5 16h5l3-8 5 16 3-8h6" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// 15. Tickets & Issue Tracker (Perforated orange ticket stub)
export function FluentTicketsIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <path d="M4 10a2 2 0 012-2h20a2 2 0 012 2v3a3 3 0 000 6v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3a3 3 0 000-6v-3z" fill="#f97316" />
            <line x1="12" y1="10" x2="12" y2="22" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="2 2" />
            <circle cx="20" cy="16" r="2.5" fill="#ffffff" />
        </svg>
    );
}

// 16. School Profile & Campus (Academy building with columns)
export function FluentBuildingIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <polygon points="16,3 30,10 2,10" fill="#0284c7" />
            <rect x="4" y="10" width="24" height="2" fill="#0369a1" />
            <rect x="5" y="12" width="3" height="13" fill="#e0f2fe" />
            <rect x="11" y="12" width="3" height="13" fill="#e0f2fe" />
            <rect x="18" y="12" width="3" height="13" fill="#e0f2fe" />
            <rect x="24" y="12" width="3" height="13" fill="#e0f2fe" />
            <rect x="2" y="25" width="28" height="4" fill="#0369a1" />
        </svg>
    );
}

// 17. Timetable / Schedule (Wall clock with red second hand)
export function FluentTimetableIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <circle cx="16" cy="16" r="13" fill="#0284c7" />
            <circle cx="16" cy="16" r="10" fill="#f8fafc" />
            <line x1="16" y1="10" x2="16" y2="16" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="16" y1="16" x2="21" y2="16" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="16" r="1.5" fill="#0f172a" />
        </svg>
    );
}

// 18. Calendar (Tear-off desk calendar with red binder header)
export function FluentCalendarIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="4" y="6" width="24" height="22" rx="3" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
            <path d="M4 9a3 3 0 013-3h18a3 3 0 013 3v4H4V9z" fill="#ef4444" />
            <rect x="8" y="3" width="3" height="5" rx="1.5" fill="#991b1b" />
            <rect x="21" y="3" width="3" height="5" rx="1.5" fill="#991b1b" />
            <circle cx="10" cy="18" r="1.5" fill="#0284c7" />
            <circle cx="16" cy="18" r="1.5" fill="#0284c7" />
            <circle cx="22" cy="18" r="1.5" fill="#0284c7" />
            <circle cx="10" cy="23" r="1.5" fill="#0284c7" />
            <circle cx="16" cy="23" r="1.5" fill="#ef4444" />
        </svg>
    );
}

// 19. Reports & Analytics (Rising 3-bar gradient telemetry chart)
export function FluentReportsIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="4" y="16" width="6" height="12" rx="1.5" fill="#38bdf8" />
            <rect x="13" y="10" width="6" height="18" rx="1.5" fill="#3b82f6" />
            <rect x="22" y="5" width="6" height="23" rx="1.5" fill="#1d4ed8" />
        </svg>
    );
}

// 20. Admin Notes (Yellow notepad with ballpoint pencil)
export function FluentNotesIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="5" y="4" width="22" height="24" rx="2" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
            <line x1="9" y1="9" x2="23" y2="9" stroke="#eab308" strokeWidth="1.5" />
            <line x1="9" y1="14" x2="23" y2="14" stroke="#eab308" strokeWidth="1.5" />
            <line x1="9" y1="19" x2="19" y2="19" stroke="#eab308" strokeWidth="1.5" />
            <path d="M22 18l5 5-2 3-5-5 2-3z" fill="#f97316" />
        </svg>
    );
}

// 21. Defaulters & Alerts (Crimson warning shield with exclamation badge)
export function FluentDefaultersIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <path d="M16 3l12 5v9c0 7-5 12-12 13-7-1-12-6-12-13V8l12-5z" fill="#ef4444" />
            <path d="M16 3l12 5v9c0 7-5 12-12 13V3z" fill="#dc2626" />
            <line x1="16" y1="10" x2="16" y2="19" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="16" cy="23" r="1.5" fill="#ffffff" />
        </svg>
    );
}

// 22. Roles & Permissions (Golden key & security lock)
export function FluentRolesIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <circle cx="12" cy="14" r="8" fill="#f59e0b" />
            <circle cx="12" cy="14" r="4" fill="#fef3c7" />
            <path d="M18 14h10v4h-3v3h-3v-3h-4v-4z" fill="#d97706" />
        </svg>
    );
}

// 23. Implementation Plans (Structured task list with checklist icons)
export function FluentPlansIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="4" y="4" width="24" height="24" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <rect x="7" y="8" width="5" height="5" rx="1" fill="#10b981" />
            <line x1="15" y1="10.5" x2="25" y2="10.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            <rect x="7" y="15" width="5" height="5" rx="1" fill="#38bdf8" />
            <line x1="15" y1="17.5" x2="25" y2="17.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            <rect x="7" y="22" width="5" height="5" rx="1" fill="#f59e0b" />
            <line x1="15" y1="24.5" x2="22" y2="24.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

// 24. Settings (Precision Steel Cogwheel / Gray Gear)
export function FluentSettingsIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <defs>
                <linearGradient id="fluent_settings_gear_grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#94a3b8" />
                    <stop offset="0.5" stopColor="#64748b" />
                    <stop offset="1" stopColor="#475569" />
                </linearGradient>
                <linearGradient id="fluent_settings_hub_grad" x1="10" y1="10" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#cbd5e1" />
                    <stop offset="1" stopColor="#475569" />
                </linearGradient>
            </defs>
            {/* 6-Tooth Precision Cogwheel Outer Rim */}
            <path
                fill="url(#fluent_settings_gear_grad)"
                stroke="#334155"
                strokeWidth="1.2"
                strokeLinejoin="round"
                d="M12.9 5.5a3.1 3.1 0 0 1 6.2 0 3.1 3.1 0 0 0 4.4 2.5 3.1 3.1 0 0 1 3.1 5.4 3.1 3.1 0 0 0 0 5.1 3.1 3.1 0 0 1-3.1 5.4 3.1 3.1 0 0 0-4.4 2.5 3.1 3.1 0 0 1-6.2 0 3.1 3.1 0 0 0-4.4-2.5 3.1 3.1 0 0 1-3.1-5.4 3.1 3.1 0 0 0 0-5.1 3.1 3.1 0 0 1 3.1-5.4 3.1 3.1 0 0 0 4.4-2.5z"
            />
            {/* Raised Circular Hub */}
            <circle cx="16" cy="16" r="6" fill="url(#fluent_settings_hub_grad)" stroke="#334155" strokeWidth="1" />
            {/* Axle Bore Center Cutout Hole */}
            <circle cx="16" cy="16" r="3.2" fill="#0f172a" />
            <circle cx="16" cy="16" r="3.2" stroke="#1e293b" strokeWidth="0.8" fill="none" />
            {/* Specular Highlight Sheen */}
            <circle cx="14.5" cy="14.5" r="0.8" fill="#ffffff" opacity="0.6" />
        </svg>
    );
}

// 25. Teaching Dashboard (Presentation blackboard with teacher marker)
export function FluentTeachingIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <rect x="3" y="5" width="26" height="18" rx="2" fill="#065f46" stroke="#047857" strokeWidth="1.5" />
            <path d="M8 11l4 5 4-3 7 6" stroke="#34d399" strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="23" cy="19" r="1.5" fill="#fde047" />
            <path d="M16 23v6M10 29h12" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

// 26. Lecture Plans (Book with colored ribbon bookmark)
export function FluentLecturePlansIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <path d="M6 4h16a3 3 0 013 3v20a1 1 0 01-1 1H7a3 3 0 01-3-3V7a3 3 0 012-3z" fill="#0284c7" />
            <path d="M4 25a3 3 0 013-3h18v4H7a3 3 0 01-3-1z" fill="#0369a1" />
            <path d="M14 4v11l3-2 3 2V4h-6z" fill="#f59e0b" />
        </svg>
    );
}

// 27. Live Collaboration & Virtual Classroom (Interactive Whiteboard with Floating HD Camera & Live Emitter)
export function FluentLiveCollabIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <defs>
                <linearGradient id="fluent_collab_bg" x1="4" y1="5" x2="26" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#8B5CF6" />
                    <stop offset="1" stopColor="#4F46E5" />
                </linearGradient>
                <linearGradient id="fluent_cam_lens" x1="17" y1="13" x2="28" y2="24" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#06B6D4" />
                    <stop offset="1" stopColor="#0284C7" />
                </linearGradient>
            </defs>
            {/* Whiteboard / Presentation Canvas */}
            <rect x="4" y="5" width="20" height="15" rx="3" fill="url(#fluent_collab_bg)" stroke="#A78BFA" strokeWidth="1" />
            {/* Whiteboard Drawing Wave */}
            <path d="M7 13c2-2.5 4 2 6.5-.5" stroke="#E0E7FF" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="16.5" cy="12" r="1.2" fill="#FBBF24" />
            {/* Board Stand Legs */}
            <path d="M8 20l-2.5 7M16 20l2.5 7" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
            {/* Floating HD Camera */}
            <rect x="15" y="13" width="12" height="10" rx="2.5" fill="#1E293B" stroke="#38BDF8" strokeWidth="0.8" />
            <circle cx="19.5" cy="18" r="3" fill="url(#fluent_cam_lens)" />
            <circle cx="20.2" cy="17" r="0.9" fill="#E0F2FE" />
            {/* Camera Projector Cone */}
            <path d="M27 15.5l3.5-1.5v8l-3.5-1.5v-5z" fill="#0284C7" />
            {/* Live Pulse Dot */}
            <circle cx="17" cy="15" r="1" fill="#EF4444" />
        </svg>
    );
}

// 28. Lab Infrastructure & IT Tech Desk (Computer Workstation with Diagnostic Support Wrench Badge)
export function FluentLabSuiteIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <defs>
                <linearGradient id="fluent_lab_screen" x1="5" y1="5" x2="23" y2="20" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3B82F6" />
                    <stop offset="1" stopColor="#1D4ED8" />
                </linearGradient>
                <linearGradient id="fluent_wrench_badge" x1="16" y1="16" x2="29" y2="29" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#10B981" />
                    <stop offset="1" stopColor="#059669" />
                </linearGradient>
            </defs>
            {/* Workstation Monitor */}
            <rect x="4" y="5" width="19" height="14" rx="2.5" fill="url(#fluent_lab_screen)" stroke="#93C5FD" strokeWidth="0.8" />
            {/* Screen UI Lines */}
            <rect x="7" y="8" width="8" height="1.5" rx="0.75" fill="#DBEAFE" />
            <rect x="7" y="11" width="12" height="1.5" rx="0.75" fill="#93C5FD" />
            <rect x="7" y="14" width="5" height="1.5" rx="0.75" fill="#60A5FA" />
            {/* Monitor Stand */}
            <path d="M13.5 19v3.5M9.5 22.5h8" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
            {/* Diagnostic Support Wrench Badge */}
            <circle cx="23" cy="22" r="7.2" fill="#0F172A" stroke="#10B981" strokeWidth="1" />
            <circle cx="23" cy="22" r="6" fill="url(#fluent_wrench_badge)" />
            {/* Wrench Symbol */}
            <path d="M25 19.5l-1.3 1.3-.7-.7c-.5-.5-1.4-.5-1.9 0-.5.5-.5 1.4 0 1.9l.7.7-1.3 1.3c-.2.2-.2.5 0 .7l.7.7c.2.2.5.2.7 0l1.3-1.3.7.7c.5.5 1.4.5 1.9 0 .5-.5.5-1.4 0-1.9l-.7-.7 1.3-1.3c.2-.2.2-.5 0-.7l-.7-.7c-.2-.2-.5-.2-.7 0z" fill="#FFFFFF" />
        </svg>
    );
}

// 29. Student Comprehensive Progress & Growth (Academic Ledger Dossier with Ascending Growth Bars & Check)
export function FluentStudentProgressIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <defs>
                <linearGradient id="fluent_prog_dossier" x1="5" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0EA5E9" />
                    <stop offset="1" stopColor="#2563EB" />
                </linearGradient>
            </defs>
            {/* Progress Binder Base */}
            <rect x="5" y="4" width="22" height="24" rx="3.5" fill="url(#fluent_prog_dossier)" stroke="#7DD3FC" strokeWidth="0.8" />
            <path d="M5 9h22" stroke="#38BDF8" strokeWidth="0.8" />
            {/* Binder Rings */}
            <rect x="3.5" y="7" width="3" height="1.8" rx="0.9" fill="#E2E8F0" />
            <rect x="3.5" y="15" width="3" height="1.8" rx="0.9" fill="#E2E8F0" />
            <rect x="3.5" y="23" width="3" height="1.8" rx="0.9" fill="#E2E8F0" />
            {/* Ascending Metric Bars */}
            <rect x="9" y="19" width="3" height="6" rx="1" fill="#BAE6FD" />
            <rect x="13.5" y="16" width="3" height="9" rx="1" fill="#38BDF8" />
            <rect x="18" y="13" width="3" height="12" rx="1" fill="#34D399" />
            {/* Trendline with Achievement Star/Node */}
            <path d="M9.5 18.5l4.5-3.5 4.5-3 4.5-2" stroke="#FDE047" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="23" cy="10" r="2" fill="#FACC15" stroke="#FFFFFF" strokeWidth="0.7" />
            {/* Mastery Verified Pill Badge */}
            <circle cx="23" cy="23" r="5.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="0.9" />
            <path d="M21 23l1.5 1.5 3-3" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// 30. Examination Hub & Question Paper Designer (Official Assessment Dossier with OMR Matrix & Authoring Pen)
export function FluentExamHubIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <defs>
                <linearGradient id="fluent_exam_sheet" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#F43F5E" />
                    <stop offset="1" stopColor="#BE123C" />
                </linearGradient>
                <linearGradient id="fluent_pen_gold" x1="18" y1="14" x2="30" y2="26" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FBBF24" />
                    <stop offset="1" stopColor="#D97706" />
                </linearGradient>
            </defs>
            {/* Exam Paper Dossier */}
            <rect x="5" y="4" width="20" height="25" rx="3" fill="url(#fluent_exam_sheet)" stroke="#FDA4AF" strokeWidth="0.8" />
            {/* Header Exam Title Rule */}
            <rect x="8.5" y="7.5" width="11" height="2" rx="0.75" fill="#FFE4E6" />
            {/* OMR Question Circles */}
            <circle cx="9.5" cy="12.5" r="1.1" fill="#FECDD3" />
            <circle cx="13" cy="12.5" r="1.1" fill="#FFFFFF" />
            <circle cx="16.5" cy="12.5" r="1.1" fill="#FECDD3" />
            <circle cx="9.5" cy="16.5" r="1.1" fill="#FFFFFF" />
            <circle cx="13" cy="16.5" r="1.1" fill="#FECDD3" />
            <circle cx="16.5" cy="16.5" r="1.1" fill="#FECDD3" />
            {/* Exam Security Stamp */}
            <circle cx="11.5" cy="23" r="3.5" fill="#FBBF24" stroke="#FFFBEB" strokeWidth="0.7" />
            <path d="M10 23l1 1 2-2" stroke="#78350F" strokeWidth="0.9" strokeLinecap="round" />
            {/* Authoring Fountain Pen */}
            <path d="M29 11l-7 7-1.5 3.5 3.5-1.5 7-7c.7-.7.7-1.5 0-2-.5-.5-1.3-.7-2 0z" fill="url(#fluent_pen_gold)" stroke="#FFFFFF" strokeWidth="0.7" />
            <circle cx="22" cy="19.5" r="0.6" fill="#78350F" />
        </svg>
    );
}

// 31. Institute Operations, Governance & Audit Center (Executive Shield with Pillars, Central Gear & Audit Stamp)
export function FluentInstituteOpsIcon({ className = "w-6 h-6 flex-shrink-0", ...props }) {
    return (
        <svg className={`${className} ${shadowClass}`} viewBox="0 0 32 32" fill="none" {...props}>
            <defs>
                <linearGradient id="fluent_ops_shield" x1="8" y1="4" x2="24" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#475569" />
                    <stop offset="1" stopColor="#1E293B" />
                </linearGradient>
                <linearGradient id="fluent_ops_gear" x1="12" y1="11" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#F59E0B" />
                    <stop offset="1" stopColor="#D97706" />
                </linearGradient>
            </defs>
            {/* Governance Shield */}
            <path d="M16 4l9 3.5v7.5c0 6.5-9 12-9 12s-9-5.5-9-12V7.5L16 4z" fill="url(#fluent_ops_shield)" stroke="#94A3B8" strokeWidth="0.9" />
            {/* Institutional Column Pillars */}
            <path d="M11 9.5h10M11 20.5h10M12.5 9.5v11M16 9.5v11M19.5 9.5v11" stroke="#64748B" strokeWidth="0.8" strokeLinecap="round" />
            {/* Central Governance Gear */}
            <circle cx="16" cy="15" r="4.5" fill="url(#fluent_ops_gear)" stroke="#FEF3C7" strokeWidth="0.7" />
            <circle cx="16" cy="15" r="1.5" fill="#1E293B" />
            {/* Audit Verification Seal */}
            <circle cx="23" cy="22" r="4.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="0.8" />
            <path d="M21 22l1.5 1.5 2.5-2.5" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
