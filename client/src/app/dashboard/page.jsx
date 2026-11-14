'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ChevronRight, CalendarDays, PlusCircle, ArrowUpRight } from 'lucide-react';
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
    FluentLiveCollabIcon,
    FluentMeetingsIcon,
    FluentWhiteboardIcon,
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
} from '@/components/FluentNavIcons';
import {
    FluentWordDocIcon,
    FluentExcelDocIcon,
    FluentPdfDocIcon,
    FluentSlidesDocIcon,
    FluentWorkstationIcon,
    FluentTrophyIcon,
    FluentAssignmentLedgerIcon
} from '@/components/FluentAppIcons';
import { useAuthStore } from '@/lib/store';
import { dashboardAPI } from '@/lib/api';
import AssignmentCalendar from '@/components/AssignmentCalendar';
import { formatDate } from '@/lib/dateUtils';
import GreenSegmentedSpinner from '@/components/GreenSegmentedSpinner';

export default function DashboardPage() {
    const router = useRouter();
    const { t } = useTranslation('common');
    const { user, isAuthenticated, _hasHydrated, selectedSessionId } = useAuthStore();
    const [stats, setStats] = useState({});
    const [deadlines, setDeadlines] = useState([]);
    const [siteUpdate, setSiteUpdate] = useState(null);
    const [studentProfile, setStudentProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');

    const studentShortcuts = [
        { title: t('dashboard.viewAssignments', 'Assignments'), desc: 'Tasks & deadlines', href: '/assignments', icon: FluentAssignmentsIcon, category: 'academics' },
        { title: t('dashboard.mySubmissions', 'Submissions'), desc: 'Uploaded files', href: '/submissions', icon: FluentReviewSubmissionsIcon, category: 'academics' },
        { title: t('dashboard.viewGrades', 'Grades & Marks'), desc: 'Scores & ledger', href: '/grades', icon: FluentGradesIcon, category: 'academics' },
        { title: 'Class Timetable', desc: 'Weekly schedule', href: '/timetable', icon: FluentTimetableIcon, category: 'academics' },
        { title: 'Coding Training', desc: 'Interactive units', href: '/training', icon: FluentCodePracticeIcon, category: 'academics' },
        { title: 'Live Meeting / Viva', desc: 'Real-time oral exam', href: '/meetings', icon: FluentLiveCollabIcon, category: 'live' },
        { title: t('nav.liveBoard', 'Live Whiteboard'), desc: 'Shared canvas', href: '/live-board', icon: FluentWhiteboardIcon, category: 'live' },
        { title: 'Study Documents', desc: 'Course materials', href: '/documents', icon: FluentDocumentsIcon, category: 'live' },
        { title: t('dashboard.reportIssue', 'Report Issue'), desc: 'Help & support', href: '/tickets', icon: FluentTicketsIcon, category: 'ops' },
    ];

    const staffShortcuts = [
        // Academics & Teaching
        { title: t('dashboard.createAssignment', 'Create Assignment'), desc: 'Curriculum task', href: '/assignments/create', icon: FluentAssignmentsIcon, category: 'academics' },
        { title: t('dashboard.reviewPending', 'Review Submissions'), desc: 'Pending grading', href: '/submissions', icon: FluentReviewSubmissionsIcon, category: 'academics' },
        { title: t('dashboard.manageClasses', 'Manage Classes'), desc: 'Batches & students', href: '/classes', icon: FluentClassesIcon, category: 'academics' },
        { title: 'Teaching & Lecture Plans', desc: 'Syllabus coverage', href: '/teaching/plans', icon: FluentLecturePlansIcon, category: 'academics' },
        { title: 'Timetable Schedules', desc: 'Lab & class slots', href: '/timetable', icon: FluentTimetableIcon, category: 'academics' },
        { title: 'Training & Coding Modules', desc: 'Interactive practice', href: '/training', icon: FluentTrainingIcon, category: 'academics' },
        { title: 'Grades & Evaluation', desc: 'Ledger & marksheets', href: '/grades', icon: FluentGradesIcon, category: 'academics' },

        // Lab & Hardware
        { title: 'Lab Inventory & Hardware', desc: 'Workstations & PCs', href: '/admin/labs', icon: FluentLabSuiteIcon, category: 'labs' },
        { title: 'Equipment Shift Requests', desc: 'Hardware movement', href: '/admin/labs/shift-requests', icon: FluentLabsIcon, category: 'labs' },
        { title: 'Hardware Audit Reports', desc: 'System inspection', href: '/admin/labs/inventory-reports', icon: FluentReportsIcon, category: 'labs' },
        { title: 'Device Issuance', desc: 'Laptops & peripherals', href: '/admin/laptop-issuances', icon: FluentWorkstationIcon, category: 'labs' },
        { title: 'Barcode & QR Labels', desc: 'Asset tags generator', href: '/admin/barcode-generator', icon: FluentPlansIcon, category: 'labs' },

        // Live & Collaboration
        { title: 'Live Meetings & Viva', desc: 'Voice & video rooms', href: '/meetings', icon: FluentLiveCollabIcon, category: 'live' },
        { title: t('nav.whiteboard', 'Interactive Whiteboard'), desc: 'Drawing & formulas', href: '/whiteboard', icon: FluentWhiteboardIcon, category: 'live' },
        { title: 'Documents Hub & Share', desc: 'Cloud office library', href: '/documents', icon: FluentDocumentsIcon, category: 'live' },

        // Operations & Admin
        { title: 'IT & Support Tickets', desc: 'Issues & inquiries', href: '/tickets', icon: FluentTicketsIcon, category: 'ops' },
        { title: 'Procurement & RFQ', desc: 'Hardware purchasing', href: '/admin/procurement', icon: FluentStorageIcon, category: 'ops' },
        { title: 'Academic Calendar', desc: 'Terms & holidays', href: '/admin/calendar', icon: FluentCalendarIcon, category: 'ops' },
        { title: 'Sticky Notes & Memos', desc: 'Desk scratchpad', href: '/admin/notes', icon: FluentNotesIcon, category: 'ops' },
        { title: 'Reports & Certificates', desc: 'Analytics & export', href: '/reports', icon: FluentReportsIcon, category: 'ops' },
        { title: 'Activity Logs & Audit', desc: 'Security trail', href: '/activity-logs', icon: FluentInstituteOpsIcon, category: 'ops' },
        ...(user?.role === 'admin' || user?.role === 'principal' ? [
            { title: 'Database SQL Console', desc: 'Live SQL queries', href: '/admin/sql-console', icon: FluentSettingsIcon, category: 'ops' }
        ] : [])
    ];

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!useAuthStore.getState()._hasHydrated) {
            useAuthStore.getState().setHasHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!mounted && !_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadDashboardData();
    }, [isAuthenticated, _hasHydrated, mounted, selectedSessionId]);

    const loadDashboardData = async () => {
        setLoading(true);
        const safetyTimer = setTimeout(() => {
            setLoading(false);
        }, 5000);

        try {
            const requests = [
                dashboardAPI.getStats().catch(() => ({ data: { data: { stats: {} } } })),
                dashboardAPI.getDeadlines().catch(() => ({ data: { data: { upcomingDeadlines: [] } } })),
                dashboardAPI.getSiteUpdate().catch(() => null)
            ];
            if (user?.role === 'student') {
                requests.push(dashboardAPI.getStudentProfile().catch(() => null));
            }
            const [statsRes, deadlinesRes, siteUpdateRes, studentProfileRes] = await Promise.all(requests);
            if (statsRes?.data?.data?.stats) setStats(statsRes.data.data.stats);
            if (deadlinesRes?.data?.data?.upcomingDeadlines) setDeadlines(deadlinesRes.data.data.upcomingDeadlines);
            if (siteUpdateRes?.data?.data) setSiteUpdate(siteUpdateRes.data.data);
            if (studentProfileRes?.data?.data) setStudentProfile(studentProfileRes.data.data);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            clearTimeout(safetyTimer);
            setLoading(false);
        }
    };

    const StatCard = ({ icon: Icon, label, value, color, trend }) => (
        <div className="card p-4 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">{label}</p>
                </div>
            </div>
        </div>
    );

    if (!isAuthenticated || loading) {
        return <GreenSegmentedSpinner fullscreen label="Initializing ULRMS Dashboard..." />;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-100/80 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* 1. Bento Hero Action Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl shadow-indigo-950/10 border border-slate-800">
                    <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute right-40 -top-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Academic Session {selectedSessionId || 'Active'}
                                </span>
                                <span className="text-slate-500">•</span>
                                <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-300 font-mono capitalize">
                                    Role: {user?.role?.replace('_', ' ') || 'User'}
                                </span>
                                {user?.role === 'student' && (user?.studentId || user?.admissionNumber) && (
                                    <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold">
                                        ID: {user.studentId || user.admissionNumber}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                                {t('dashboard.welcomeBack', { name: user?.firstName })} 👋
                            </h1>
                            <p className="text-sm text-slate-300 max-w-xl">
                                {user?.role === 'student'
                                    ? 'Stay on track with your lab experiments, submissions, and live viva schedules.'
                                    : 'Lab operations and academic services are active. Fast one-click access to all teaching and hardware tools.'}
                            </p>
                        </div>

                        {/* Quick Hero Buttons */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {user?.role !== 'student' ? (
                                <>
                                    <Link
                                        href="/assignments/create"
                                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 transition active:scale-95"
                                    >
                                        <FluentAssignmentsIcon className="w-5 h-5 flex-shrink-0" />
                                        {t('dashboard.createAssignment', 'Create Assignment')}
                                    </Link>
                                    <Link
                                        href="/whiteboard"
                                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-2 backdrop-blur-sm border border-white/10 transition active:scale-95"
                                    >
                                        <FluentWhiteboardIcon className="w-5 h-5 flex-shrink-0" />
                                        Interactive Whiteboard
                                    </Link>
                                    <Link
                                        href="/admin/labs"
                                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-2 backdrop-blur-sm border border-white/10 transition active:scale-95"
                                    >
                                        <FluentLabSuiteIcon className="w-5 h-5 flex-shrink-0" />
                                        Lab Hardware
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/assignments"
                                        className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-500/20 transition active:scale-95"
                                    >
                                        <FluentAssignmentsIcon className="w-5 h-5 flex-shrink-0" />
                                        My Assignments
                                    </Link>
                                    <Link
                                        href="/live-board"
                                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-2 backdrop-blur-sm border border-white/10 transition active:scale-95"
                                    >
                                        <FluentWhiteboardIcon className="w-5 h-5 flex-shrink-0" />
                                        Live Whiteboard
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Top Horizontal KPI Metrics Row (Balanced 4-Column Grid) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {user?.role === 'student' ? (
                        <>
                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/80 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition group">
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs group-hover:scale-105 active:scale-95 transition-transform">
                                        <FluentAssignmentsIcon className="w-7 h-7 flex-shrink-0" />
                                    </div>
                                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800 px-2 py-0.5 rounded-md">Tasks</span>
                                </div>
                                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3">{stats.assignedToMe ?? 0}</div>
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{t('dashboard.assignedToMe', 'Assigned To Me')}</div>
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Active terms</span>
                                    <Link href="/assignments" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">View &rarr;</Link>
                                </div>
                            </div>

                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/80 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md transition group">
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs group-hover:scale-105 active:scale-95 transition-transform">
                                        <FluentReviewSubmissionsIcon className="w-7 h-7 flex-shrink-0" />
                                    </div>
                                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800 px-2 py-0.5 rounded-md">Submitted</span>
                                </div>
                                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3">{stats.mySubmissions ?? 0}</div>
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{t('dashboard.mySubmissions', 'My Submissions')}</div>
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Uploaded files</span>
                                    <Link href="/submissions" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">History &rarr;</Link>
                                </div>
                            </div>

                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/80 shadow-xs hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md transition group">
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs group-hover:scale-105 active:scale-95 transition-transform">
                                        <FluentLiveCollabIcon className="w-7 h-7 flex-shrink-0" />
                                    </div>
                                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-600 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800 px-2 py-0.5 rounded-md">Live Viva</span>
                                </div>
                                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3">{stats.pendingVivas ?? 0}</div>
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{t('dashboard.pendingVivas', 'Pending Vivas')}</div>
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Oral assessment</span>
                                    <Link href="/meetings" className="text-amber-600 dark:text-amber-400 font-semibold hover:underline">Join &rarr;</Link>
                                </div>
                            </div>

                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/80 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition group">
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs group-hover:scale-105 active:scale-95 transition-transform">
                                        <FluentGradesIcon className="w-7 h-7 flex-shrink-0" />
                                    </div>
                                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-blue-600 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800 px-2 py-0.5 rounded-md">Ledger</span>
                                </div>
                                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3">
                                    {stats.avgScore != null ? `${stats.avgScore}%` : '--'}
                                </div>
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{t('dashboard.avgScore', 'Average Score')}</div>
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Cumulative marks</span>
                                    <Link href="/grades" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Report &rarr;</Link>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Staff & Admin KPI 1: Active Labs */}
                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/80 shadow-xs hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-md transition group">
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs group-hover:scale-105 active:scale-95 transition-transform">
                                        <FluentLabSuiteIcon className="w-7 h-7 flex-shrink-0" />
                                    </div>
                                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Nominal
                                    </span>
                                </div>
                                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3">
                                    {stats.activeLabs ?? (stats.totalClasses || 0)}
                                </div>
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                    {stats.activeLabs != null ? t('dashboard.activeLabs', 'Active Labs') : 'Active Classes'}
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Computer workstations</span>
                                    <Link href="/admin/labs" className="text-sky-600 dark:text-sky-400 font-semibold hover:underline">Manage &rarr;</Link>
                                </div>
                            </div>

                            {/* Staff & Admin KPI 2: Pending Grading */}
                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/80 shadow-xs hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md transition group">
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs group-hover:scale-105 active:scale-95 transition-transform">
                                        <FluentReviewSubmissionsIcon className="w-7 h-7 flex-shrink-0" />
                                    </div>
                                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-700 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800 px-2 py-0.5 rounded-md">Queue</span>
                                </div>
                                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3">
                                    {stats.pendingGrading ?? 0}
                                </div>
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                    {t('dashboard.pendingGrading', 'Pending Grading')}
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Submissions to evaluate</span>
                                    <Link href="/submissions" className="text-amber-600 dark:text-amber-400 font-semibold hover:underline">Grade &rarr;</Link>
                                </div>
                            </div>

                            {/* Staff & Admin KPI 3: Students / Enrolled Users */}
                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/80 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition group">
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs group-hover:scale-105 active:scale-95 transition-transform">
                                        <FluentClassesIcon className="w-7 h-7 flex-shrink-0" />
                                    </div>
                                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800 px-2 py-0.5 rounded-md">Enrolled</span>
                                </div>
                                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3">
                                    {stats.totalStudents ?? (stats.totalUsers || 0)}
                                </div>
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Total Students</div>
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Across active batches</span>
                                    <Link href="/classes" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Rosters &rarr;</Link>
                                </div>
                            </div>

                            {/* Staff & Admin KPI 4: Live Vivas & Meetings */}
                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/80 shadow-xs hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition group">
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs group-hover:scale-105 active:scale-95 transition-transform">
                                        <FluentLiveCollabIcon className="w-7 h-7 flex-shrink-0" />
                                    </div>
                                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-purple-700 bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800 px-2 py-0.5 rounded-md">Live Viva</span>
                                </div>
                                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3">
                                    {stats.totalVivas ?? (stats.scheduledVivas || 0)}
                                </div>
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Scheduled Vivas / Meetings</div>
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Real-time assessment</span>
                                    <Link href="/meetings" className="text-purple-600 dark:text-purple-400 font-semibold hover:underline">Launch &rarr;</Link>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* 3. Main Bento Content Grid (8 Columns Left + 4 Columns Right on Large Screens) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* LEFT COLUMN (8 cols): Actionable Deadlines, Calendar & Recent Workspaces */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-6">

                        {/* Actionable Deadlines & Lab Schedule */}
                        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs overflow-hidden">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                                        <FluentCalendarIcon className="w-6 h-6 flex-shrink-0" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900 dark:text-white text-sm">{t('dashboard.upcomingDeadlines', 'Upcoming Deadlines & Schedule')}</h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Assignments and submissions requiring attention</p>
                                    </div>
                                </div>
                                <Link href="/assignments" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition flex items-center gap-1">
                                    {t('common.viewAll', 'View All')} <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {deadlines.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 mx-auto mb-2 shadow-xs">
                                            <FluentAssignmentsIcon className="w-6 h-6 flex-shrink-0" />
                                        </div>
                                        <p className="text-sm font-medium">{t('dashboard.noUpcomingDeadlines', 'No upcoming deadlines')}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">All assignments and evaluations are currently up to date.</p>
                                    </div>
                                ) : (
                                    deadlines.slice(0, 5).map((item, i) => {
                                        const dueDate = new Date(item.dueDate);
                                        const now = new Date();
                                        const timeLeft = dueDate - now;
                                        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                                        const daysLeft = Math.floor(hoursLeft / 24);
                                        const timeLeftText = daysLeft > 0
                                            ? t('dashboard.daysLeft', { days: daysLeft, hours: hoursLeft % 24 })
                                            : hoursLeft > 0
                                                ? t('dashboard.hoursLeft', { hours: hoursLeft })
                                                : t('dashboard.dueSoon', 'Due soon');

                                        const statusColors = {
                                            graded: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                                            submitted: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                                            needs_revision: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                                            pending: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                        };

                                        return (
                                            <Link
                                                key={i}
                                                href={`/assignments/${item.id}`}
                                                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                                            >
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                                                        <FluentAssignmentsIcon className="w-6 h-6 flex-shrink-0" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-900 dark:text-white text-sm truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                                                            {item.title}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                            <span>{item.subject?.name || 'Lab Course'}</span>
                                                            <span>•</span>
                                                            <span className={hoursLeft < 24 ? 'text-red-600 font-semibold' : 'text-slate-500 dark:text-slate-400'}>
                                                                {timeLeftText}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-md border ${statusColors[item.status] || statusColors.pending}`}>
                                                        {item.status || t('dashboard.pending', 'Pending')}
                                                    </span>
                                                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition hidden sm:inline-flex items-center gap-1">
                                                        {user?.role === 'student' ? 'Open' : 'Review'} &rarr;
                                                    </span>
                                                </div>
                                            </Link>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Recent Workspaces, Whiteboards & Office Documents */}
                        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs p-5">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                                        <FluentDocumentsIcon className="w-6 h-6 flex-shrink-0" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900 dark:text-white text-sm">Recent Boards & Office Documents</h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Pick up right where you left off</p>
                                    </div>
                                </div>
                                <Link href="/documents" className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 transition">
                                    Browse All &rarr;
                                </Link>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                                <Link
                                    href="/whiteboard"
                                    className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition group"
                                >
                                    <div className="flex items-center justify-between mb-2.5">
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs group-hover:scale-105 transition-transform">
                                            <FluentWhiteboardIcon className="w-6 h-6 flex-shrink-0" />
                                        </div>
                                        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">Canvas</span>
                                    </div>
                                    <p className="font-bold text-slate-900 dark:text-white text-xs truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">Live Whiteboard</p>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Drawing & AI Bot</p>
                                </Link>

                                <Link
                                    href="/documents/word-editor"
                                    className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition group"
                                >
                                    <div className="flex items-center justify-between mb-2.5">
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs group-hover:scale-105 transition-transform">
                                            <FluentWordDocIcon className="w-6 h-6 flex-shrink-0" />
                                        </div>
                                        <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">Word</span>
                                    </div>
                                    <p className="font-bold text-slate-900 dark:text-white text-xs truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">Word Document</p>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Lab manuals & docs</p>
                                </Link>

                                <Link
                                    href="/documents/excel-editor"
                                    className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition group"
                                >
                                    <div className="flex items-center justify-between mb-2.5">
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs group-hover:scale-105 transition-transform">
                                            <FluentExcelDocIcon className="w-6 h-6 flex-shrink-0" />
                                        </div>
                                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">Excel</span>
                                    </div>
                                    <p className="font-bold text-slate-900 dark:text-white text-xs truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">Excel Sheet</p>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Marks & ledgers</p>
                                </Link>

                                <Link
                                    href="/documents/pdf-studio"
                                    className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 hover:border-rose-400 dark:hover:border-rose-500 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition group"
                                >
                                    <div className="flex items-center justify-between mb-2.5">
                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs group-hover:scale-105 transition-transform">
                                            <FluentPdfDocIcon className="w-6 h-6 flex-shrink-0" />
                                        </div>
                                        <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold">PDF</span>
                                    </div>
                                    <p className="font-bold text-slate-900 dark:text-white text-xs truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition">PDF Studio</p>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Annotate & merge</p>
                                </Link>
                            </div>
                        </div>

                        {/* Student Assignment Calendar */}
                        {user?.role === 'student' && (
                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs p-5">
                                <AssignmentCalendar />
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN (4-5 cols): Modular Launchpad, Live Lab Status & Profile Summary */}
                    <div className="lg:col-span-5 xl:col-span-4 space-y-6">

                        {/* Modular Quick Launchpad */}
                        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs p-5">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                                        <FluentDashboardIcon className="w-6 h-6 flex-shrink-0" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900 dark:text-white text-sm">Modular Launchpad</h2>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500">One-click direct access</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Fluent Hub</span>
                            </div>

                            {/* Category Filter Pills */}
                            {user?.role !== 'student' && (
                                <div className="flex items-center gap-1 py-3 overflow-x-auto scrollbar-none">
                                    {[
                                        { id: 'all', label: 'All' },
                                        { id: 'academics', label: 'Academics' },
                                        { id: 'labs', label: 'Labs' },
                                        { id: 'live', label: 'Live' },
                                        { id: 'ops', label: 'Admin' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveCategory(tab.id)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                                                activeCategory === tab.id
                                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Compact Icon Tiles (High Information Density, Zero URL clutter) */}
                            <div className="grid grid-cols-2 gap-2.5 pt-2">
                                {(user?.role === 'student' ? studentShortcuts : staffShortcuts)
                                    .filter(s => activeCategory === 'all' || s.category === activeCategory)
                                    .slice(0, 8)
                                    .map((item, idx) => {
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={idx}
                                                href={item.href}
                                                className="p-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition group flex items-center gap-2.5"
                                            >
                                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs group-hover:scale-105 shrink-0 transition-transform">
                                                    <Icon className="w-6 h-6 flex-shrink-0" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate capitalize">
                                                        {item.desc || item.category}
                                                    </p>
                                                </div>
                                            </Link>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Live Lab Workstation Pulse */}
                        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs p-5">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <h2 className="font-bold text-slate-900 dark:text-white text-sm">Lab Hardware & Workstations</h2>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                    Nominal
                                </span>
                            </div>

                            <div className="space-y-3.5 pt-3">
                                <div>
                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">Lab 1 (Computer Systems)</span>
                                        <span className="font-mono text-slate-500 dark:text-slate-400">28 / 30 Active</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: '93%' }} />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between text-xs mb-1.5">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">Lab 2 (Web & Mobile Dev)</span>
                                        <span className="font-mono text-slate-500 dark:text-slate-400">30 / 30 Full</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                <span>Active PCs: {stats.activeLabs != null ? stats.activeLabs * 30 : '60'}</span>
                                <Link href="/admin/labs" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                                    Station Map &rarr;
                                </Link>
                            </div>
                        </div>

                        {/* Student Specific Profile / PC Widget */}
                        {user?.role === 'student' && studentProfile && (
                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs p-5">
                                <h2 className="font-bold text-slate-900 dark:text-white text-sm mb-3">My Lab Workstation</h2>
                                <div className="grid grid-cols-2 gap-3 text-center">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase">{t('dashboard.class', 'Class')}</p>
                                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{studentProfile.primaryClass?.name || '-'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase">{t('dashboard.assignedPc', 'Assigned PC')}</p>
                                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{studentProfile.assignedPc?.itemNumber || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                </div>

            </div>
        </div>
    );
}
