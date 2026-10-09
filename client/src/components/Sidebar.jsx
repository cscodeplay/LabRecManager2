'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
    Home, BookOpen, FileText, Award, Users, GraduationCap,
    Video, BarChart3, Settings, LogOut, Menu, X, ChevronLeft,
    Beaker, ClipboardList, Activity, ClipboardCheck, Send, ListChecks, UserPlus, Monitor, FolderOpen, Pencil, Ticket, Building, Film, HardDrive,
    Clock, CalendarDays, Presentation, BookMarked, ListTodo, HelpCircle, Shield
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import LanguageSelector from './LanguageSelector';
import UserAvatar from './UserAvatar';

const navItems = {
    admin: [
        { href: '/dashboard', labelKey: 'nav.dashboard', icon: Home },
        { href: '/classes', labelKey: 'nav.classes', icon: Users },
        { href: '/users', labelKey: 'nav.manageUsers', icon: UserPlus },
        { href: '/admin/labs', labelKey: 'nav.labsPCs', icon: Monitor },
        { href: '/assignments', labelKey: 'nav.assignments', icon: BookOpen },
        { href: '/training', labelKey: 'Training', icon: GraduationCap },
        { href: '/assigned-work', labelKey: 'nav.assignedWork', icon: ListChecks },
        { href: '/submissions', labelKey: 'nav.reviewSubmissions', icon: ClipboardList },
        { href: '/admin/documents', labelKey: 'nav.documents', icon: FolderOpen },
        { href: '/admin/storage', labelKey: 'nav.storage', icon: HardDrive },
        { href: '/grades', labelKey: 'nav.grades', icon: Award },
        { href: '/meetings', labelKey: 'Meetings', icon: Video },
        { href: '/whiteboard', labelKey: 'nav.whiteboard', icon: Pencil },
        { href: '/quiz', labelKey: 'AI Quiz Maker', icon: HelpCircle },
        { href: '/admin/whiteboards', labelKey: 'nav.liveSessions', icon: Video },
        { href: '/activity-logs', labelKey: 'nav.activityLogs', icon: Activity },
        { href: '/tickets', labelKey: 'nav.tickets', icon: Ticket },
        { href: '/admin/school-profile', labelKey: 'nav.schoolProfile', icon: Building },
        { href: '/admin/timetable', labelKey: 'nav.timetable', icon: Clock },
        { href: '/admin/calendar', labelKey: 'nav.calendar', icon: CalendarDays },
        { href: '/reports', labelKey: 'nav.reports', icon: BarChart3 },
        { href: '/admin/notes', labelKey: 'Admin Notes', icon: FileText },
        { href: '/admin/roles-permissions', labelKey: 'Roles & Permissions', icon: Shield },
        { href: '/admin/implementation-plans', labelKey: 'Implementation Plans', icon: ListTodo },
        { href: '/settings', labelKey: 'nav.settings', icon: Settings },
    ],
    principal: [
        { href: '/dashboard', labelKey: 'nav.dashboard', icon: Home },
        { href: '/classes', labelKey: 'nav.classes', icon: Users },
        { href: '/users', labelKey: 'nav.manageUsers', icon: UserPlus },
        { href: '/admin/documents', labelKey: 'nav.documents', icon: FolderOpen },
        { href: '/admin/storage', labelKey: 'nav.storage', icon: HardDrive },
        { href: '/training', labelKey: 'Training', icon: GraduationCap },
        { href: '/quiz', labelKey: 'AI Quiz Maker', icon: HelpCircle },
        { href: '/grades', labelKey: 'nav.grades', icon: Award },
        { href: '/activity-logs', labelKey: 'nav.activityLogs', icon: Activity },
        { href: '/tickets', labelKey: 'nav.tickets', icon: Ticket },
        { href: '/admin/school-profile', labelKey: 'nav.schoolProfile', icon: Building },
        { href: '/admin/timetable', labelKey: 'nav.timetable', icon: Clock },
        { href: '/admin/calendar', labelKey: 'nav.calendar', icon: CalendarDays },
        { href: '/reports', labelKey: 'nav.reports', icon: BarChart3 },
        { href: '/admin/notes', labelKey: 'Admin Notes', icon: FileText },
        { href: '/admin/roles-permissions', labelKey: 'Roles & Permissions', icon: Shield },
        { href: '/admin/implementation-plans', labelKey: 'Implementation Plans', icon: ListTodo },
        { href: '/settings', labelKey: 'nav.settings', icon: Settings },
    ],
    instructor: [
        { href: '/dashboard', labelKey: 'nav.dashboard', icon: Home },
        { href: '/classes', labelKey: 'nav.myClasses', icon: Users },
        { href: '/teaching', labelKey: 'nav.teachingDashboard', icon: Presentation },
        { href: '/teaching/plans', labelKey: 'nav.lecturePlans', icon: BookMarked },
        { href: '/assignments', labelKey: 'nav.assignments', icon: BookOpen },
        { href: '/training', labelKey: 'Training', icon: GraduationCap },
        { href: '/assigned-work', labelKey: 'nav.assignedWork', icon: ListChecks },
        { href: '/submissions', labelKey: 'nav.review', icon: ClipboardList },
        { href: '/documents', labelKey: 'nav.sharedDocs', icon: FolderOpen },
        { href: '/grades', labelKey: 'nav.grades', icon: Award },
        { href: '/meetings', labelKey: 'Meetings', icon: Video },
        { href: '/whiteboard', labelKey: 'nav.whiteboard', icon: Pencil },
        { href: '/quiz', labelKey: 'AI Quiz Maker', icon: HelpCircle },
        { href: '/activity-logs', labelKey: 'nav.activityLogs', icon: Activity },
        { href: '/timetable', labelKey: 'nav.myTimetable', icon: Clock },
        { href: '/tickets', labelKey: 'nav.tickets', icon: Ticket },
        { href: '/reports', labelKey: 'nav.reports', icon: BarChart3 },
        { href: '/settings', labelKey: 'nav.settings', icon: Settings },
    ],
    lab_assistant: [
        { href: '/dashboard', labelKey: 'nav.dashboard', icon: Home },
        { href: '/classes', labelKey: 'nav.classes', icon: Users },
        { href: '/admin/labs', labelKey: 'nav.labsPCs', icon: Monitor },
        { href: '/assignments', labelKey: 'nav.assignments', icon: BookOpen },
        { href: '/training', labelKey: 'Training', icon: GraduationCap },
        { href: '/quiz', labelKey: 'AI Quiz Maker', icon: HelpCircle },
        { href: '/assigned-work', labelKey: 'nav.assignedWork', icon: ListChecks },
        { href: '/submissions', labelKey: 'nav.reviewSubmissions', icon: FileText },
        { href: '/documents', labelKey: 'nav.sharedDocs', icon: FolderOpen },
        { href: '/tickets', labelKey: 'nav.tickets', icon: Ticket },
        { href: '/settings', labelKey: 'nav.settings', icon: Settings },
    ],
    student: [
        { href: '/dashboard', labelKey: 'nav.dashboard', icon: Home },
        { href: '/my-work', labelKey: 'nav.myWork', icon: ClipboardCheck },
        { href: '/submissions', labelKey: 'nav.mySubmissions', icon: FileText },
        { href: '/training', labelKey: 'Training', icon: GraduationCap },
        { href: '/quiz', labelKey: 'Quizzes & Tests', icon: HelpCircle },
        { href: '/documents', labelKey: 'nav.sharedDocs', icon: FolderOpen },
        { href: '/grades', labelKey: 'nav.myGrades', icon: Award },
        { href: '/meetings', labelKey: 'Meetings', icon: Video },
        { href: '/live-board', labelKey: 'nav.liveBoard', icon: Pencil },
        { href: '/timetable', labelKey: 'nav.myTimetable', icon: Clock },
        { href: '/tickets', labelKey: 'nav.reportIssue', icon: Ticket },
        { href: '/settings', labelKey: 'nav.settings', icon: Settings },
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
                        <ChevronLeft className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 overflow-y-auto">
                <ul className="space-y-1">
                    {items.map((item) => {
                        // Special handling for /assignments to prevent highlighting on /assignments/assign
                        const isActive = item.href === '/assignments'
                            ? pathname === '/assignments' || (pathname.startsWith('/assignments/') && !pathname.startsWith('/assignments/assign'))
                            : item.href === '/training' 
                                ? pathname === '/training' || pathname.startsWith('/training/')
                                : pathname === item.href || pathname.startsWith(item.href + '/');
                        const Icon = item.icon;
                        const label = !item.labelKey.startsWith('nav.') ? item.labelKey : t(item.labelKey);
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    onClick={() => isMobile && onClose()}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    title={isCollapsed && !isMobile ? label : undefined}
                                >
                                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                                    {(!isCollapsed || isMobile) && (
                                        <span className="font-medium">{label}</span>
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
                className={`fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-50 flex flex-col transition-all duration-300 ${isMobile
                    ? `w-72 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
                    : isCollapsed ? 'w-20' : 'w-64'
                    }`}
            >
                {sidebarContent}
            </aside>
        </>
    );
}
