'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
    LogOut, Menu, X, ChevronLeft, GraduationCap
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import LanguageSelector from './LanguageSelector';
import UserAvatar from './UserAvatar';
import {
    FluentDashboardIcon,
    FluentClassesIcon,
    FluentManageUsersIcon,
    FluentCodePracticeIcon,
    FluentLabsIcon,
    FluentLabSuiteIcon,
    FluentAssignmentsIcon,
    FluentAssignedWorkIcon,
    FluentReviewSubmissionsIcon,
    FluentTrainingIcon,
    FluentDocumentsIcon,
    FluentStorageIcon,
    FluentGradesIcon,
    FluentMeetingsIcon,
    FluentLiveCollabIcon,
    FluentWhiteboardIcon,
    FluentQuizIcon,
    FluentActivityIcon,
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


export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
    const pathname = usePathname();
    const { t } = useTranslation('common');
    const { user, logout } = useAuthStore();
    const [isMobile, setIsMobile] = useState(false);
    const [logoError, setLogoError] = useState(false);
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
        } catch (e) {
            // ignore
        }
        return { name: 'ULRMS', nameHindi: '', logoUrl: '' };
    });

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Sync school info from user session and backend
    useEffect(() => {
        // 1. Immediately hydrate from user object if available
        if (user?.school?.logoUrl || user?.school?.name) {
            setSchoolInfo(prev => ({
                name: user.school.name || prev.name || 'ULRMS',
                nameHindi: user.school.nameHindi || prev.nameHindi || '',
                logoUrl: user.school.logoUrl || prev.logoUrl || ''
            }));
            setLogoError(false);
        }

        // 2. Fetch fresh school branding
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
                    } catch (err) {
                        // ignore and fallback
                    }
                }

                if (!foundSchool || !foundSchool.logoUrl) {
                    try {
                        const brandRes = await schoolAPI.getBranding();
                        if (brandRes.data?.success && brandRes.data?.data?.school) {
                            foundSchool = { ...(foundSchool || {}), ...brandRes.data.data.school };
                        }
                    } catch (bErr) {
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
                    } catch (e) {}
                }
            } catch (err) {
                console.error('[Sidebar] Failed to load school info:', err);
            }
        };

        fetchSchool();
    }, [user?.schoolId, user?.school]);

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    const items = navItems[user?.role] || navItems.student;

    // Don't render on login page
    if (pathname === '/login' || pathname === '/register') {
        return null;
    }

    const sidebarContent = (
        <>
            {/* Logo & Brand Header */}
            <div className={`p-4 border-b border-slate-200 dark:border-slate-700 flex items-center ${isCollapsed && !isMobile ? 'justify-between' : 'justify-between'}`}>
                {(!isCollapsed || isMobile) ? (
                    <Link href="/dashboard" className="flex items-center gap-2.5 group min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 p-1 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                            {schoolInfo.logoUrl && !logoError ? (
                                <img
                                    src={schoolInfo.logoUrl}
                                    alt={schoolInfo.name || 'School Logo'}
                                    className="w-full h-full object-contain"
                                    onError={() => setLogoError(true)}
                                />
                            ) : (
                                <div className="w-full h-full rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white">
                                    <GraduationCap className="w-5 h-5" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 leading-none">
                                <span className="font-extrabold text-primary-600 dark:text-primary-400 text-sm tracking-wider uppercase">ULRMS</span>
                                {schoolInfo.name && schoolInfo.name !== 'ULRMS' && (
                                    <span className="text-slate-300 dark:text-slate-600 text-xs">•</span>
                                )}
                            </div>
                            <h1 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate max-w-[150px] mt-0.5" title={schoolInfo.name || 'ULRMS'}>
                                {schoolInfo.name && schoolInfo.name !== 'ULRMS' ? schoolInfo.name : t('sidebar.unifiedLabRecords')}
                            </h1>
                            {schoolInfo.nameHindi && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                                    {schoolInfo.nameHindi}
                                </p>
                            )}
                        </div>
                    </Link>
                ) : (
                    /* Collapsed View: School Logo centered next to collapse button */
                    <Link href="/dashboard" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 p-1 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0 hover:scale-105 transition-transform" title={schoolInfo.name || 'ULRMS'}>
                        {schoolInfo.logoUrl && !logoError ? (
                            <img
                                src={schoolInfo.logoUrl}
                                alt={schoolInfo.name || 'School Logo'}
                                className="w-full h-full object-contain"
                                onError={() => setLogoError(true)}
                            />
                        ) : (
                            <div className="w-full h-full rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white">
                                <GraduationCap className="w-5 h-5" />
                            </div>
                        )}
                    </Link>
                )}
                {isMobile && (
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                        <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                )}
                {!isMobile && (
                    <button
                        onClick={onToggleCollapse}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 overflow-y-auto">
                <ul className="space-y-1">
                    {items.map((item) => {
                        // Hub-aware active route matching
                        let isActive = false;
                        if (item.href === '/assignments') {
                            isActive = pathname === '/assignments' ||
                                pathname.startsWith('/assignments/') ||
                                pathname === '/assigned-work' ||
                                pathname.startsWith('/assigned-work/') ||
                                (pathname.startsWith('/submissions') && user?.role !== 'student');
                        } else if (item.href === '/meetings') {
                            isActive = pathname === '/meetings' ||
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
                        } else if (item.href === '/admin/labs') {
                            isActive = pathname === '/admin/labs' ||
                                pathname.startsWith('/admin/labs/') ||
                                (pathname.startsWith('/tickets') && ['admin', 'principal', 'lab_assistant'].includes(user?.role)) ||
                                pathname.startsWith('/admin/laptop-issuances') ||
                                pathname.startsWith('/admin/barcode-generator') ||
                                pathname.startsWith('/admin/procurement');
                        } else if (item.href === '/admin/audit-logs') {
                            isActive = pathname === '/admin/audit-logs' ||
                                pathname.startsWith('/admin/audit-logs/') ||
                                pathname.startsWith('/activity-logs') ||
                                pathname.startsWith('/admin/query-logs') ||
                                pathname.startsWith('/admin/sql-console');
                        } else if (item.href === '/reports/progress') {
                            isActive = pathname === '/reports/progress' ||
                                pathname.startsWith('/reports/progress');
                        } else if (item.href === '/training') {
                            isActive = pathname === '/training' || pathname.startsWith('/training/');
                        } else {
                            isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        }
                        const Icon = item.icon;
                        const label = !item.labelKey.startsWith('nav.') ? item.labelKey : t(item.labelKey);
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    onClick={() => isMobile && onClose()}
                                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isActive
                                        ? 'bg-primary-50 dark:bg-slate-800/90 text-primary-900 dark:text-white font-semibold border border-primary-200/80 dark:border-slate-700/80 shadow-sm'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 font-medium'
                                        }`}
                                    title={isCollapsed && !isMobile ? label : undefined}
                                >
                                    <Icon className="w-6 h-6 flex-shrink-0 transition-transform duration-200 group-hover:scale-105" />
                                    {(!isCollapsed || isMobile) && (
                                        <span className="flex-1 truncate text-sm">{label}</span>
                                    )}
                                    {isActive && (!isCollapsed || isMobile) && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-primary-400 flex-shrink-0" />
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User Info & Logout */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700">
                {/* Language Selector */}
                <div className="mb-2">
                    <LanguageSelector isCollapsed={isCollapsed && !isMobile} />
                </div>

                {(!isCollapsed || isMobile) && user && (
                    <Link href="/settings" className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                        <UserAvatar user={user} size="md" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role?.replace('_', ' ')}</p>
                            {(user.studentId || user.admissionNumber || user.employeeId) && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                    ID: {user.studentId || user.admissionNumber || user.employeeId}
                                </p>
                            )}
                        </div>
                    </Link>
                )}
                <button
                    onClick={handleLogout}
                    className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition ${isCollapsed && !isMobile ? 'justify-center' : ''
                        }`}
                    title={isCollapsed && !isMobile ? t('auth.logout') : undefined}
                >
                    <LogOut className="w-5 h-5" />
                    {(!isCollapsed || isMobile) && <span className="font-medium">{t('auth.logout')}</span>}
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Overlay */}
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-50 flex flex-col transition-all duration-300 w-72 ${
                    isCollapsed ? 'lg:w-20' : 'lg:w-64'
                } ${
                    isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
            >
                {sidebarContent}
            </aside>
        </>
    );
}
