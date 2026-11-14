'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LogOut, GraduationCap, Menu, X, Pin, PinOff } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useConfirm } from '@/components/ConfirmDialog';
import { useEdgeHoverReveal, useLowMemoryDevice } from '@/hooks/useEdgeHoverReveal';
import {
    FluentDashboardIcon,
    FluentClassesIcon,
    FluentManageUsersIcon,
    FluentCodePracticeIcon,
    FluentLabSuiteIcon,
    FluentAssignmentsIcon,
    FluentAssignedWorkIcon,
    FluentReviewSubmissionsIcon,
    FluentTrainingIcon,
    FluentDocumentsIcon,
    FluentStorageIcon,
    FluentGradesIcon,
    FluentLiveCollabIcon,
    FluentQuizIcon,
    FluentTicketsIcon,
    FluentBuildingIcon,
    FluentTimetableIcon,
    FluentCalendarIcon,
    FluentReportsIcon,
    FluentStudentProgressIcon,
    FluentNotesIcon,
    FluentInstituteOpsIcon,
    FluentRolesIcon,
    FluentPlansIcon,
    FluentSettingsIcon,
    FluentTeachingIcon,
    FluentLecturePlansIcon
} from './FluentNavIcons';

const navItems = {
    admin: [
        { href: '/dashboard', labelKey: 'Dashboard', icon: FluentDashboardIcon },
        { href: '/classes', labelKey: 'Classes', icon: FluentClassesIcon },
        { href: '/users', labelKey: 'Users', icon: FluentManageUsersIcon },
        { href: '/practice-ide', labelKey: 'Practice IDE', icon: FluentCodePracticeIcon },
        { href: '/admin/labs', labelKey: 'Labs & Hardware', icon: FluentLabSuiteIcon },
        { href: '/assignments', labelKey: 'Assignments', icon: FluentAssignmentsIcon },
        { href: '/training', labelKey: 'Training', icon: FluentTrainingIcon },
        { href: '/documents', labelKey: 'Office Suite', icon: FluentDocumentsIcon },
        { href: '/grades', labelKey: 'Grades', icon: FluentGradesIcon },
        { href: '/meetings', labelKey: 'Meetings & Collab', icon: FluentLiveCollabIcon },
        { href: '/quiz', labelKey: 'Quizzes', icon: FluentQuizIcon },
        { href: '/reports/progress', labelKey: 'Student Progress', icon: FluentStudentProgressIcon },
        { href: '/admin/audit-logs', labelKey: 'Operations & Audit', icon: FluentInstituteOpsIcon },
        { href: '/admin/timetable', labelKey: 'Timetable', icon: FluentTimetableIcon },
        { href: '/admin/calendar', labelKey: 'Calendar', icon: FluentCalendarIcon },
        { href: '/reports', labelKey: 'Reports', icon: FluentReportsIcon },
        { href: '/admin/notes', labelKey: 'Notes', icon: FluentNotesIcon },
        { href: '/admin/roles-permissions', labelKey: 'Roles & Access', icon: FluentRolesIcon },
        { href: '/admin/implementation-plans', labelKey: 'Plans', icon: FluentPlansIcon },
        { href: '/admin/school-profile', labelKey: 'School Profile', icon: FluentBuildingIcon },
        { href: '/admin/storage', labelKey: 'Storage', icon: FluentStorageIcon },
        { href: '/settings', labelKey: 'Settings', icon: FluentSettingsIcon },
    ],
    principal: [
        { href: '/dashboard', labelKey: 'Dashboard', icon: FluentDashboardIcon },
        { href: '/classes', labelKey: 'Classes', icon: FluentClassesIcon },
        { href: '/users', labelKey: 'Users', icon: FluentManageUsersIcon },
        { href: '/practice-ide', labelKey: 'Practice IDE', icon: FluentCodePracticeIcon },
        { href: '/admin/labs', labelKey: 'Labs & Hardware', icon: FluentLabSuiteIcon },
        { href: '/assignments', labelKey: 'Assignments', icon: FluentAssignmentsIcon },
        { href: '/training', labelKey: 'Training', icon: FluentTrainingIcon },
        { href: '/documents', labelKey: 'Office Suite', icon: FluentDocumentsIcon },
        { href: '/grades', labelKey: 'Grades', icon: FluentGradesIcon },
        { href: '/meetings', labelKey: 'Meetings & Collab', icon: FluentLiveCollabIcon },
        { href: '/quiz', labelKey: 'Quizzes', icon: FluentQuizIcon },
        { href: '/reports/progress', labelKey: 'Student Progress', icon: FluentStudentProgressIcon },
        { href: '/admin/audit-logs', labelKey: 'Operations & Audit', icon: FluentInstituteOpsIcon },
        { href: '/admin/timetable', labelKey: 'Timetable', icon: FluentTimetableIcon },
        { href: '/admin/calendar', labelKey: 'Calendar', icon: FluentCalendarIcon },
        { href: '/reports', labelKey: 'Reports', icon: FluentReportsIcon },
        { href: '/admin/notes', labelKey: 'Notes', icon: FluentNotesIcon },
        { href: '/admin/roles-permissions', labelKey: 'Roles & Access', icon: FluentRolesIcon },
        { href: '/admin/implementation-plans', labelKey: 'Plans', icon: FluentPlansIcon },
        { href: '/admin/school-profile', labelKey: 'School Profile', icon: FluentBuildingIcon },
        { href: '/admin/storage', labelKey: 'Storage', icon: FluentStorageIcon },
        { href: '/settings', labelKey: 'Settings', icon: FluentSettingsIcon },
    ],
    instructor: [
        { href: '/dashboard', labelKey: 'Dashboard', icon: FluentDashboardIcon },
        { href: '/classes', labelKey: 'Classes', icon: FluentClassesIcon },
        { href: '/practice-ide', labelKey: 'Practice IDE', icon: FluentCodePracticeIcon },
        { href: '/teaching', labelKey: 'Teaching', icon: FluentTeachingIcon },
        { href: '/teaching/plans', labelKey: 'Lecture Plans', icon: FluentLecturePlansIcon },
        { href: '/assignments', labelKey: 'Assignments', icon: FluentAssignmentsIcon },
        { href: '/training', labelKey: 'Training', icon: FluentTrainingIcon },
        { href: '/documents', labelKey: 'Office Suite', icon: FluentDocumentsIcon },
        { href: '/grades', labelKey: 'Grades', icon: FluentGradesIcon },
        { href: '/meetings', labelKey: 'Meetings & Collab', icon: FluentLiveCollabIcon },
        { href: '/quiz', labelKey: 'Quizzes', icon: FluentQuizIcon },
        { href: '/reports/progress', labelKey: 'Student Progress', icon: FluentStudentProgressIcon },
        { href: '/timetable', labelKey: 'Timetable', icon: FluentTimetableIcon },
        { href: '/tickets', labelKey: 'Support Desk', icon: FluentTicketsIcon },
        { href: '/reports', labelKey: 'Reports', icon: FluentReportsIcon },
        { href: '/settings', labelKey: 'Settings', icon: FluentSettingsIcon },
    ],
    lab_assistant: [
        { href: '/dashboard', labelKey: 'Dashboard', icon: FluentDashboardIcon },
        { href: '/classes', labelKey: 'Classes', icon: FluentClassesIcon },
        { href: '/admin/labs', labelKey: 'Labs & Hardware', icon: FluentLabSuiteIcon },
        { href: '/practice-ide', labelKey: 'Practice IDE', icon: FluentCodePracticeIcon },
        { href: '/assignments', labelKey: 'Assignments', icon: FluentAssignmentsIcon },
        { href: '/training', labelKey: 'Training', icon: FluentTrainingIcon },
        { href: '/quiz', labelKey: 'Quizzes', icon: FluentQuizIcon },
        { href: '/documents', labelKey: 'Office Suite', icon: FluentDocumentsIcon },
        { href: '/tickets', labelKey: 'Support Desk', icon: FluentTicketsIcon },
        { href: '/settings', labelKey: 'Settings', icon: FluentSettingsIcon },
    ],
    student: [
        { href: '/dashboard', labelKey: 'Dashboard', icon: FluentDashboardIcon },
        { href: '/my-work', labelKey: 'My Work', icon: FluentAssignedWorkIcon },
        { href: '/practice-ide', labelKey: 'Practice IDE', icon: FluentCodePracticeIcon },
        { href: '/submissions', labelKey: 'Submissions', icon: FluentReviewSubmissionsIcon },
        { href: '/training', labelKey: 'Training', icon: FluentTrainingIcon },
        { href: '/quiz', labelKey: 'Quizzes', icon: FluentQuizIcon },
        { href: '/documents', labelKey: 'Office Suite', icon: FluentDocumentsIcon },
        { href: '/grades', labelKey: 'Grades', icon: FluentGradesIcon },
        { href: '/meetings', labelKey: 'Meetings & Collab', icon: FluentLiveCollabIcon },
        { href: '/timetable', labelKey: 'Timetable', icon: FluentTimetableIcon },
        { href: '/tickets', labelKey: 'Support Desk', icon: FluentTicketsIcon },
        { href: '/settings', labelKey: 'Settings', icon: FluentSettingsIcon },
    ],
};

function isNavItemActive(href, pathname, userRole) {
    if (href === '/assignments') {
        return pathname === '/assignments' ||
            pathname.startsWith('/assignments/') ||
            pathname === '/assigned-work' ||
            pathname.startsWith('/assigned-work/') ||
            (pathname.startsWith('/submissions') && userRole !== 'student');
    }
    if (href === '/meetings') {
        return pathname === '/meetings' ||
            pathname.startsWith('/meetings/') ||
            pathname === '/meeting' ||
            pathname.startsWith('/meeting/') ||
            pathname === '/whiteboard' ||
            pathname.startsWith('/whiteboard/') ||
            pathname === '/admin/whiteboards' ||
            pathname.startsWith('/admin/whiteboards/') ||
            pathname === '/live-board' ||
            pathname.startsWith('/live-board/') ||
            pathname === '/recordings' ||
            pathname.startsWith('/recordings/') ||
            pathname === '/admin/recordings' ||
            pathname.startsWith('/admin/recordings/');
    }
    if (href === '/admin/labs') {
        return pathname === '/admin/labs' ||
            pathname.startsWith('/admin/labs/') ||
            (pathname.startsWith('/tickets') && ['admin', 'principal', 'lab_assistant'].includes(userRole)) ||
            pathname.startsWith('/admin/laptop-issuances') ||
            pathname.startsWith('/admin/barcode-generator') ||
            pathname.startsWith('/admin/procurement');
    }
    if (href === '/admin/audit-logs') {
        return pathname === '/admin/audit-logs' ||
            pathname.startsWith('/admin/audit-logs/') ||
            pathname.startsWith('/activity-logs') ||
            pathname.startsWith('/admin/query-logs') ||
            pathname.startsWith('/admin/sql-console');
    }
    if (href === '/reports/progress') {
        return pathname === '/reports/progress' || pathname.startsWith('/reports/progress');
    }
    if (href === '/training') {
        return pathname === '/training' || pathname.startsWith('/training/');
    }
    return pathname === href || pathname.startsWith(href + '/');
}

export default function Sidebar() {
    const pathname = usePathname();
    const { t } = useTranslation('common');
    const { user, logout } = useAuthStore();
    const confirm = useConfirm();
    const isLowMemory = useLowMemoryDevice();

    const [logoError, setLogoError] = useState(false);
    const [confirmingLogout, setConfirmingLogout] = useState(false);
    const [hoveredPill, setHoveredPill] = useState(null);
    const pillTimerRef = useRef(null);

    const [schoolInfo, setSchoolInfo] = useState(() => {
        try {
            if (typeof window !== 'undefined') {
                const cached = localStorage.getItem('school_branding');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed?.name || parsed?.logoUrl) {
                        return {
                            name: parsed.name || 'ULRMS',
                            nameHindi: parsed.nameHindi || '',
                            logoUrl: parsed.logoUrl || ''
                        };
                    }
                }
            }
        } catch {
            // ignore
        }
        return { name: 'ULRMS', nameHindi: '', logoUrl: '' };
    });

    const dockReveal = useEdgeHoverReveal({
        autoHideMs: 2500,
        initialPeekMs: 2500,
        storageKey: 'dockSidebarPinned',
        isLocked: confirmingLogout,
    });

    // Auto-close unpinned dock whenever route changes
    useEffect(() => {
        if (!dockReveal.isPinned) {
            dockReveal.closeNow();
        }
    }, [pathname, dockReveal.isPinned]);

    // Touch inactivity auto-hide for iPad & touch devices
    const touchTimeoutRef = useRef(null);
    const bumpTouchInactivity = useCallback(() => {
        if (dockReveal.isPinned || confirmingLogout) return;
        clearTimeout(touchTimeoutRef.current);
        touchTimeoutRef.current = setTimeout(() => {
            dockReveal.closeNow();
        }, 3200);
    }, [dockReveal, confirmingLogout]);

    useEffect(() => {
        if (dockReveal.isOpen && !dockReveal.isPinned) {
            bumpTouchInactivity();
        }
        return () => clearTimeout(touchTimeoutRef.current);
    }, [dockReveal.isOpen, dockReveal.isPinned, bumpTouchInactivity]);

    // Sync school info from user session and backend
    useEffect(() => {
        if (user?.school?.logoUrl || user?.school?.name) {
            setSchoolInfo(prev => ({
                name: user.school.name || prev.name || 'ULRMS',
                nameHindi: user.school.nameHindi || prev.nameHindi || '',
                logoUrl: user.school.logoUrl || prev.logoUrl || ''
            }));
            setLogoError(false);
        }

        const fetchSchool = async () => {
            try {
                const { schoolAPI, default: api } = await import('@/lib/api');
                let foundSchool = null;

                if (user?.schoolId) {
                    try {
                        const res = await api.get(`/schools/${user.schoolId}`);
                        if (res.data?.success && res.data?.data?.school) {
                            foundSchool = res.data.data.school;
                        }
                    } catch {
                        // ignore and fallback
                    }
                }

                if (!foundSchool || !foundSchool.logoUrl) {
                    try {
                        const brandRes = await schoolAPI.getBranding();
                        if (brandRes.data?.success && brandRes.data?.data?.school) {
                            foundSchool = { ...(foundSchool || {}), ...brandRes.data.data.school };
                        }
                    } catch {
                        // ignore
                    }
                }

                if (foundSchool && (foundSchool.name || foundSchool.logoUrl)) {
                    setSchoolInfo({
                        name: foundSchool.name || 'ULRMS',
                        nameHindi: foundSchool.nameHindi || '',
                        logoUrl: foundSchool.logoUrl || ''
                    });
                    setLogoError(false);
                    try {
                        localStorage.setItem('school_branding', JSON.stringify({
                            name: foundSchool.name,
                            nameHindi: foundSchool.nameHindi,
                            logoUrl: foundSchool.logoUrl
                        }));
                    } catch {}
                }
            } catch (err) {
                console.error('[Sidebar] Failed to load school info:', err);
            }
        };

        fetchSchool();
    }, [user?.schoolId, user?.school]);

    const clearPill = useCallback(() => {
        clearTimeout(pillTimerRef.current);
        setHoveredPill(null);
    }, []);

    // Multi-Pill Display States (Momentary on show, or continuous while hovering pinned sidebar)
    const navRef = useRef(null);
    const itemRefs = useRef(new Map());
    const logoutRef = useRef(null);
    const [showAllPillsMomentary, setShowAllPillsMomentary] = useState(false);
    const [isPointerHoveringDock, setIsPointerHoveringDock] = useState(false);
    const [allPills, setAllPills] = useState([]);
    const momentaryTimerRef = useRef(null);

    useEffect(() => {
        if (dockReveal.isVisible) {
            setShowAllPillsMomentary(true);
            if (momentaryTimerRef.current) clearTimeout(momentaryTimerRef.current);
            momentaryTimerRef.current = setTimeout(() => {
                setShowAllPillsMomentary(false);
            }, 2500);
        } else {
            setShowAllPillsMomentary(false);
            setIsPointerHoveringDock(false);
            clearPill();
        }
        return () => {
            if (momentaryTimerRef.current) clearTimeout(momentaryTimerRef.current);
        };
    }, [dockReveal.isVisible, clearPill]);

    useEffect(() => () => clearTimeout(pillTimerRef.current), []);

    const shouldShowAllPills = showAllPillsMomentary || (dockReveal.isPinned && isPointerHoveringDock);

    const updateAllPills = useCallback(() => {
        if (!dockReveal.isVisible) {
            setAllPills([]);
            return;
        }
        const navEl = navRef.current;
        if (!navEl) return;
        const navRect = navEl.getBoundingClientRect();
        const pills = [];

        itemRefs.current.forEach((el, key) => {
            if (!el) return;
            const rect = el.getBoundingClientRect();
            // Check if item is within visible nav viewport
            if (rect.top >= navRect.top - 8 && rect.bottom <= navRect.bottom + 8) {
                pills.push({
                    key,
                    label: el.getAttribute('data-label') || key,
                    top: rect.top + rect.height / 2,
                    left: rect.right + 12,
                    tone: 'default',
                });
            }
        });

        if (logoutRef.current) {
            const rect = logoutRef.current.getBoundingClientRect();
            pills.push({
                key: 'logout',
                label: t('auth.logout') || 'Logout',
                top: rect.top + rect.height / 2,
                left: rect.right + 12,
                tone: 'danger',
            });
        }

        setAllPills(pills);
    }, [dockReveal.isVisible, t]);

    useEffect(() => {
        if (shouldShowAllPills) {
            const timer = setTimeout(updateAllPills, 40);
            return () => clearTimeout(timer);
        }
    }, [shouldShowAllPills, updateAllPills]);

    const showPillFor = useCallback((el, label, tone = 'default') => {
        if (!el || shouldShowAllPills) return;
        clearTimeout(pillTimerRef.current);
        const rect = el.getBoundingClientRect();
        setHoveredPill({
            label,
            top: rect.top + rect.height / 2,
            left: rect.right + 12,
            tone,
        });
    }, [shouldShowAllPills]);

    const schedulePillHide = useCallback(() => {
        if (shouldShowAllPills) return;
        clearTimeout(pillTimerRef.current);
        pillTimerRef.current = setTimeout(() => {
            setHoveredPill(null);
        }, 60);
    }, [shouldShowAllPills]);

    const handleLogout = async () => {
        setConfirmingLogout(true);
        try {
            const approved = await confirm({
                title: 'Sign Out of ULRMS?',
                message: 'Any unsaved edits or whiteboard changes will be lost. Are you sure you want to log out?',
                confirmText: t('auth.logout') || 'Logout',
                cancelText: 'Cancel',
                type: 'danger',
            });
            if (approved) {
                logout();
                window.location.href = '/login';
            }
        } finally {
            setConfirmingLogout(false);
        }
    };

    const items = navItems[user?.role] || navItems.student;

    // Don't render on login/register pages
    if (pathname === '/login' || pathname === '/register') {
        return null;
    }

    const glassSurface = isLowMemory
        ? 'bg-white/95 dark:bg-slate-900/95'
        : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm';

    return (
        <>
            {/* Invisible Left-Edge Mouse & Pen Hover Hot-Zone (0ms reveal) */}
            <div
                {...dockReveal.triggerProps}
                className="fixed top-14 left-0 bottom-3 w-3.5 z-[74] flex items-center"
                aria-hidden="true"
            >
                {!dockReveal.isVisible && (
                    <span className="ml-1 w-1 h-14 rounded-full bg-slate-400/40 dark:bg-slate-500/40 transition-opacity" />
                )}
            </div>

            {/* Floating Hamburger Toggle Button (Shown whenever sidebar is hidden/closed) */}
            {!dockReveal.isVisible && (
                <button
                    type="button"
                    onClick={dockReveal.toggleOpen}
                    className={`fixed top-2.5 left-3.5 z-[76] w-10 h-10 rounded-full ${glassSurface} border border-slate-200/90 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 shadow-md flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all`}
                    aria-label="Open navigation sidebar"
                    title="Open Navigation Dock (Menu)"
                >
                    <Menu className="w-5 h-5" />
                </button>
            )}

            {/* Left-Edge macOS-Style Auto-Hide Icon Dock */}
            <aside
                {...dockReveal.containerProps}
                onPointerEnter={(e) => {
                    if (!e.pointerType || e.pointerType === 'mouse' || e.pointerType === 'pen') {
                        setIsPointerHoveringDock(true);
                    }
                }}
                onPointerLeave={() => {
                    setIsPointerHoveringDock(false);
                }}
                onTouchStart={bumpTouchInactivity}
                onTouchMove={bumpTouchInactivity}
                onPointerDown={bumpTouchInactivity}
                aria-label="Primary Navigation Dock"
                style={{ willChange: dockReveal.isVisible ? 'transform, opacity' : 'auto' }}
                className={`fixed top-14 left-3 bottom-3 w-16 z-[75] rounded-full border border-slate-200/90 dark:border-slate-700/80 shadow-2xl flex flex-col items-center py-2.5 ${glassSurface} transition-opacity duration-150 motion-safe:transition-[transform,opacity] motion-safe:duration-150 motion-safe:ease-out ${
                    dockReveal.isVisible
                        ? 'translate-x-0 opacity-100 pointer-events-auto'
                        : '-translate-x-[calc(100%+24px)] opacity-0 pointer-events-none'
                }`}
            >
                {/* Round Brand Logo & Dock Header Controls (Pin & Close) */}
                <div className="w-full px-2 pb-2 border-b border-slate-200/80 dark:border-slate-800 flex flex-col items-center gap-1.5 shrink-0">
                    <div className="w-10 h-10 rounded-full p-1 flex items-center justify-center overflow-hidden shadow-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        {schoolInfo.logoUrl && !logoError ? (
                            <img
                                src={schoolInfo.logoUrl}
                                alt={schoolInfo.name || 'School Logo'}
                                className="w-full h-full object-contain rounded-full"
                                onError={() => setLogoError(true)}
                            />
                        ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white">
                                <GraduationCap className="w-5 h-5" />
                            </div>
                        )}
                    </div>

                    {/* Compact Pin & Close Actions */}
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={dockReveal.togglePinned}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center transition cursor-pointer ${
                                dockReveal.isPinned
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-900'
                            }`}
                            title={dockReveal.isPinned ? 'Unpin Dock (Auto-Hide)' : 'Pin Dock Open'}
                            aria-label={dockReveal.isPinned ? 'Unpin dock' : 'Pin dock'}
                        >
                            {dockReveal.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                        </button>

                        <button
                            type="button"
                            onClick={dockReveal.closeNow}
                            className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 flex items-center justify-center transition cursor-pointer"
                            title="Close Sidebar (Esc)"
                            aria-label="Close sidebar"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Icon-Only Navigation Rail (Round Icon Backgrounds) */}
                <nav
                    ref={navRef}
                    onScroll={() => {
                        clearPill();
                        if (shouldShowAllPills) updateAllPills();
                    }}
                    className="flex-1 w-full overflow-y-auto overscroll-contain no-scrollbar px-2 py-2"
                    aria-label="Modules"
                >
                    <ul className="flex flex-col items-center gap-2">
                        {items.map((item) => {
                            const isActive = isNavItemActive(item.href, pathname, user?.role);
                            const Icon = item.icon;
                            const label = !item.labelKey.startsWith('nav.') ? item.labelKey : t(item.labelKey);

                            return (
                                <li key={item.href}>
                                    <Link
                                        ref={(el) => {
                                            if (el) itemRefs.current.set(item.href, el);
                                            else itemRefs.current.delete(item.href);
                                        }}
                                        data-label={label}
                                        href={item.href}
                                        onClick={() => {
                                            clearPill();
                                            if (!dockReveal.isPinned) {
                                                dockReveal.closeNow();
                                            }
                                        }}
                                        onPointerEnter={(e) => {
                                            if (!e.pointerType || e.pointerType === 'mouse' || e.pointerType === 'pen') {
                                                showPillFor(e.currentTarget, label);
                                            }
                                        }}
                                        onPointerLeave={schedulePillHide}
                                        onFocus={(e) => showPillFor(e.currentTarget, label)}
                                        onBlur={schedulePillHide}
                                        aria-label={label}
                                        aria-current={isActive ? 'page' : undefined}
                                        className={`group w-11 h-11 rounded-full flex items-center justify-center border transition-colors active:scale-95 ${
                                            isActive
                                                ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-400 dark:border-primary-500 ring-2 ring-primary-500/20 shadow-xs'
                                                : 'bg-slate-100/90 dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-200/80 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <Icon className="w-6 h-6 flex-shrink-0 transition-transform duration-150 group-hover:scale-105" />
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Static Footer: Round Logout Icon with Confirmation */}
                <div className="w-full px-2 pt-2 border-t border-slate-200/80 dark:border-slate-800 flex flex-col items-center shrink-0">
                    <button
                        ref={logoutRef}
                        type="button"
                        onClick={handleLogout}
                        onPointerEnter={(e) => {
                            if (!e.pointerType || e.pointerType === 'mouse' || e.pointerType === 'pen') {
                                showPillFor(e.currentTarget, t('auth.logout') || 'Logout', 'danger');
                            }
                        }}
                        onPointerLeave={schedulePillHide}
                        onFocus={(e) => showPillFor(e.currentTarget, t('auth.logout') || 'Logout', 'danger')}
                        onBlur={schedulePillHide}
                        aria-label={t('auth.logout') || 'Logout'}
                        className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/70 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </aside>

            {/* All Visible Items Label Pills (Momentary on display, or while mouse/pencil hovers over pinned sidebar) */}
            {shouldShowAllPills && dockReveal.isVisible ? (
                allPills.map((pill) => (
                    <div
                        key={pill.key}
                        role="tooltip"
                        style={{
                            top: `${pill.top}px`,
                            left: `${pill.left}px`,
                            transform: 'translate3d(0, -50%, 0)',
                        }}
                        className={`fixed z-[90] px-4 py-1.5 rounded-full shadow-xl border text-xs font-bold whitespace-nowrap pointer-events-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150 ${
                            pill.tone === 'danger'
                                ? 'bg-red-600 text-white border-red-400 shadow-red-950/40'
                                : 'bg-slate-900 dark:bg-slate-800 text-white border-slate-700/90 shadow-slate-950/60'
                        }`}
                    >
                        {pill.label}
                    </div>
                ))
            ) : hoveredPill && dockReveal.isVisible ? (
                /* Single Reused Pill-Shaped Hover Label Portal */
                <div
                    role="tooltip"
                    style={{
                        top: `${hoveredPill.top}px`,
                        left: `${hoveredPill.left}px`,
                        transform: 'translate3d(0, -50%, 0)',
                    }}
                    className={`fixed z-[90] px-4 py-1.5 rounded-full shadow-xl border text-xs font-bold whitespace-nowrap pointer-events-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-100 ${
                        hoveredPill.tone === 'danger'
                            ? 'bg-red-600 text-white border-red-400'
                            : 'bg-slate-900 text-white border-slate-700'
                    }`}
                >
                    {hoveredPill.label}
                </div>
            ) : null}
        </>
    );
}
