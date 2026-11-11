'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LogOut, GraduationCap, Menu, X } from 'lucide-react';
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

    useEffect(() => {
        if (!dockReveal.isVisible) {
            clearPill();
        }
    }, [dockReveal.isVisible, clearPill]);

    useEffect(() => () => clearTimeout(pillTimerRef.current), []);

    const showPillFor = useCallback((el, label, tone = 'default') => {
        if (!el) return;
        clearTimeout(pillTimerRef.current);
        const rect = el.getBoundingClientRect();
        setHoveredPill({
            label,
            top: rect.top + rect.height / 2,
            left: rect.right + 12,
            tone,
        });
    }, []);

    const schedulePillHide = useCallback(() => {
        clearTimeout(pillTimerRef.current);
        pillTimerRef.current = setTimeout(() => {
            setHoveredPill(null);
        }, 60);
    }, []);

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

            {/* Touch-Only Pull Pill (Devices without hover capability) */}
            <button
                type="button"
                onClick={dockReveal.toggleOpen}
                className={`[@media(hover:none)]:flex hidden fixed left-2 top-1/2 -translate-y-1/2 z-[74] w-11 h-11 rounded-full ${glassSurface} border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-lg items-center justify-center cursor-pointer active:scale-95 transition-transform`}
                aria-label={dockReveal.isVisible ? 'Close navigation dock' : 'Open navigation dock'}
                aria-expanded={dockReveal.isVisible}
            >
                {dockReveal.isVisible ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Left-Edge macOS-Style Auto-Hide Icon Dock */}
            <aside
                {...dockReveal.containerProps}
                aria-label="Primary Navigation Dock"
                style={{ willChange: dockReveal.isVisible ? 'transform, opacity' : 'auto' }}
                className={`fixed top-14 left-3 bottom-3 w-16 z-[75] rounded-full border border-slate-200/90 dark:border-slate-700/80 shadow-2xl flex flex-col items-center py-2.5 ${glassSurface} transition-opacity duration-150 motion-safe:transition-[transform,opacity] motion-safe:duration-150 motion-safe:ease-out ${
                    dockReveal.isVisible
                        ? 'translate-x-0 opacity-100 pointer-events-auto'
                        : '-translate-x-[calc(100%+24px)] opacity-0 pointer-events-none'
                }`}
            >
                {/* Round Brand / Pin Crest */}
                <div className="w-full px-2 pb-2 border-b border-slate-200/80 dark:border-slate-800 flex flex-col items-center shrink-0">
                    <button
                        type="button"
                        onClick={dockReveal.togglePinned}
                        onPointerEnter={(e) => {
                            if (!e.pointerType || e.pointerType === 'mouse' || e.pointerType === 'pen') {
                                showPillFor(
                                    e.currentTarget,
                                    dockReveal.isPinned ? 'Unpin Dock (Auto-Hide)' : `${schoolInfo.name || 'ULRMS'} • Pin Dock`
                                );
                            }
                        }}
                        onPointerLeave={schedulePillHide}
                        onFocus={(e) => showPillFor(
                            e.currentTarget,
                            dockReveal.isPinned ? 'Unpin Dock (Auto-Hide)' : `${schoolInfo.name || 'ULRMS'} • Pin Dock`
                        )}
                        onBlur={schedulePillHide}
                        aria-label={dockReveal.isPinned ? 'Unpin navigation dock' : 'Pin navigation dock open'}
                        aria-pressed={dockReveal.isPinned}
                        className={`w-11 h-11 rounded-full p-1 flex items-center justify-center overflow-hidden shadow-sm border transition-transform active:scale-95 cursor-pointer ${
                            dockReveal.isPinned
                                ? 'bg-primary-50 dark:bg-primary-950/70 border-primary-500 ring-2 ring-primary-500/30'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:scale-105'
                        }`}
                    >
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
                    </button>
                </div>

                {/* Scrollable Icon-Only Navigation Rail (Round Icon Backgrounds) */}
                <nav
                    onScroll={clearPill}
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

            {/* Single Reused Pill-Shaped Hover Label Portal (Never clipped by overflow-y-auto) */}
            {hoveredPill && dockReveal.isVisible && (
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
            )}
        </>
    );
}
