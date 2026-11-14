'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
    FileText, Upload, Award, Video, Users,
    ChevronRight, TrendingUp, Clock, CheckCircle, BookOpen, Monitor, Pencil, Ticket, GraduationCap, Layers, CalendarDays, Activity,
    Truck, ShoppingBag, Folder, StickyNote, Database, BarChart3, Code2, QrCode, Laptop, History, Sparkles, PlusCircle
} from 'lucide-react';
import {
    FluentAssignmentLedgerIcon,
    FluentWorkstationIcon,
    FluentTrophyIcon,
    FluentTimetableIcon
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
        { title: t('dashboard.viewAssignments', 'Assignments'), href: '/assignments', icon: FluentAssignmentLedgerIcon, category: 'academics', color: 'text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100' },
        { title: t('dashboard.mySubmissions', 'Submissions'), href: '/submissions', icon: Upload, category: 'academics', color: 'text-blue-600 bg-blue-50 group-hover:bg-blue-100' },
        { title: t('dashboard.viewGrades', 'Grades & Marks'), href: '/grades', icon: FluentTrophyIcon, category: 'academics', color: 'text-amber-600 bg-amber-50 group-hover:bg-amber-100' },
        { title: 'Class Timetable', href: '/timetable', icon: FluentTimetableIcon, category: 'academics', color: 'text-teal-600 bg-teal-50 group-hover:bg-teal-100' },
        { title: 'Coding Training', href: '/training', icon: Code2, category: 'academics', color: 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100' },
        { title: 'Live Meeting / Viva', href: '/meetings', icon: Video, category: 'live', color: 'text-rose-600 bg-rose-50 group-hover:bg-rose-100' },
        { title: t('nav.liveBoard', 'Live Whiteboard'), href: '/live-board', icon: Pencil, category: 'live', color: 'text-purple-600 bg-purple-50 group-hover:bg-purple-100' },
        { title: 'Study Documents', href: '/documents', icon: Folder, category: 'live', color: 'text-sky-600 bg-sky-50 group-hover:bg-sky-100' },
        { title: t('dashboard.reportIssue', 'Report Issue'), href: '/tickets', icon: Ticket, category: 'ops', color: 'text-orange-600 bg-orange-50 group-hover:bg-orange-100' },
    ];

    const staffShortcuts = [
        // Academics & Teaching
        { title: t('dashboard.createAssignment', 'Create Assignment'), href: '/assignments/create', icon: PlusCircle, category: 'academics', color: 'text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100' },
        { title: t('dashboard.reviewPending', 'Review Submissions'), href: '/submissions', icon: Clock, category: 'academics', color: 'text-blue-600 bg-blue-50 group-hover:bg-blue-100' },
        { title: t('dashboard.manageClasses', 'Manage Classes'), href: '/classes', icon: Users, category: 'academics', color: 'text-violet-600 bg-violet-50 group-hover:bg-violet-100' },
        { title: 'Teaching & Lecture Plans', href: '/teaching/plans', icon: BookOpen, category: 'academics', color: 'text-cyan-600 bg-cyan-50 group-hover:bg-cyan-100' },
        { title: 'Timetable Schedules', href: '/timetable', icon: FluentTimetableIcon, category: 'academics', color: 'text-teal-600 bg-teal-50 group-hover:bg-teal-100' },
        { title: 'Training & Coding Modules', href: '/training', icon: Code2, category: 'academics', color: 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100' },
        { title: 'Grades & Evaluation', href: '/grades', icon: FluentTrophyIcon, category: 'academics', color: 'text-amber-600 bg-amber-50 group-hover:bg-amber-100' },

        // Lab & Hardware
        { title: 'Lab Inventory & Hardware', href: '/admin/labs', icon: FluentWorkstationIcon, category: 'labs', color: 'text-sky-600 bg-sky-50 group-hover:bg-sky-100' },
        { title: 'Equipment Shift Requests', href: '/admin/labs/shift-requests', icon: Truck, category: 'labs', color: 'text-cyan-600 bg-cyan-50 group-hover:bg-cyan-100' },
        { title: 'Hardware Audit Reports', href: '/admin/labs/inventory-reports', icon: BarChart3, category: 'labs', color: 'text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100' },
        { title: 'Device Issuance', href: '/admin/laptop-issuances', icon: Laptop, category: 'labs', color: 'text-blue-600 bg-blue-50 group-hover:bg-blue-100' },
        { title: 'Barcode & QR Labels', href: '/admin/barcode-generator', icon: QrCode, category: 'labs', color: 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100' },

        // Live & Collaboration
        { title: 'Live Meetings & Viva', href: '/meetings', icon: Video, category: 'live', color: 'text-rose-600 bg-rose-50 group-hover:bg-rose-100' },
        { title: t('nav.whiteboard', 'Interactive Whiteboard'), href: '/whiteboard', icon: Pencil, category: 'live', color: 'text-purple-600 bg-purple-50 group-hover:bg-purple-100' },
        { title: 'Session Recordings', href: (user?.role === 'admin' || user?.role === 'principal') ? '/admin/documents?tab=recordings' : '/documents?tab=recordings', icon: Layers, category: 'live', color: 'text-fuchsia-600 bg-fuchsia-50 group-hover:bg-fuchsia-100' },
        { title: 'Documents Hub & Share', href: '/documents', icon: Folder, category: 'live', color: 'text-violet-600 bg-violet-50 group-hover:bg-violet-100' },

        // Operations & Admin
        { title: 'IT & Support Tickets', href: '/tickets', icon: Ticket, category: 'ops', color: 'text-orange-600 bg-orange-50 group-hover:bg-orange-100' },
        { title: 'Procurement & RFQ', href: '/admin/procurement', icon: ShoppingBag, category: 'ops', color: 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100' },
        { title: 'Academic Calendar', href: '/admin/calendar', icon: CalendarDays, category: 'ops', color: 'text-teal-600 bg-teal-50 group-hover:bg-teal-100' },
        { title: 'Sticky Notes & Memos', href: '/admin/notes', icon: StickyNote, category: 'ops', color: 'text-amber-600 bg-amber-50 group-hover:bg-amber-100' },
        { title: 'Reports & Certificates', href: '/reports', icon: FileText, category: 'ops', color: 'text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100' },
        { title: 'Activity Logs & Audit', href: '/activity-logs', icon: History, category: 'ops', color: 'text-slate-600 bg-slate-100 group-hover:bg-slate-200' },
        ...(user?.role === 'admin' || user?.role === 'principal' ? [
            { title: 'Database SQL Console', href: '/admin/sql-console', icon: Database, category: 'ops', color: 'text-rose-600 bg-rose-50 group-hover:bg-rose-100' }
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
                                        className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 transition active:scale-95"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        {t('dashboard.createAssignment', 'Create Assignment')}
                                    </Link>
                                    <Link
                                        href="/whiteboard"
                                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-2 backdrop-blur-sm border border-white/10 transition active:scale-95"
                                    >
                                        <Pencil className="w-4 h-4 text-purple-300" />
                                        Interactive Whiteboard
                                    </Link>
                                    <Link
                                        href="/admin/labs"
                                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-2 backdrop-blur-sm border border-white/10 transition active:scale-95"
                                    >
                                        <FluentWorkstationIcon className="w-4 h-4 text-sky-300" />
                                        Lab Hardware
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/assignments"
                                        className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-500/20 transition active:scale-95"
                                    >
                                        <FluentAssignmentLedgerIcon className="w-4 h-4" />
                                        My Assignments
                                    </Link>
                                    <Link
                                        href="/live-board"
                                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-2 backdrop-blur-sm border border-white/10 transition active:scale-95"
                                    >
                                        <Pencil className="w-4 h-4 text-purple-300" />
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
                            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-indigo-300 transition group">
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <FluentAssignmentLedgerIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Tasks</span>
                                </div>
                                <div className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">{stats.assignedToMe ?? 0}</div>
                                <div className="text-xs font-semibold text-slate-500 mt-1">{t('dashboard.assignedToMe', 'Assigned To Me')}</div>
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Active terms</span>
                                    <Link href="/assignments" className="text-indigo-600 font-semibold hover:underline">View &rarr;</Link>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-emerald-300 transition group">
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Submitted</span>
                                </div>
                                <div className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">{stats.mySubmissions ?? 0}</div>
                                <div className="text-xs font-semibold text-slate-500 mt-1">{t('dashboard.mySubmissions', 'My Submissions')}</div>
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Uploaded files</span>
                                    <Link href="/submissions" className="text-emerald-600 font-semibold hover:underline">History &rarr;</Link>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-amber-300 transition group">
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Video className="w-5 h-5" />
                                    </div>
                                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">Upcoming</span>
                                </div>
                                <div className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">{stats.pendingVivas ?? 0}</div>
                                <div className="text-xs font-semibold text-slate-500 mt-1">{t('dashboard.pendingVivas', 'Pending Vivas')}</div>
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Live evaluation</span>
                                    <Link href="/meetings" className="text-amber-600 font-semibold hover:underline">Join &rarr;</Link>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-blue-300 transition group">
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <FluentTrophyIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Score</span>
                                </div>
                                <div className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
                                    {stats.avgScore != null ? `${stats.avgScore}%` : '--'}
                                </div>
                                <div className="text-xs font-semibold text-slate-500 mt-1">{t('dashboard.avgScore', 'Average Score')}</div>
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Cumulative mark</span>
                                    <Link href="/grades" className="text-blue-600 font-semibold hover:underline">Report &rarr;</Link>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Staff & Admin KPI 1: Active Labs */}
                            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-sky-300 transition group">
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                                        <FluentWorkstationIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Operational
                                    </span>
                                </div>
                                <div className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
                                    {stats.activeLabs ?? (stats.totalClasses || 0)}
                                </div>
                                <div className="text-xs font-semibold text-slate-500 mt-1">
                                    {stats.activeLabs != null ? t('dashboard.activeLabs', 'Active Labs') : 'Active Classes'}
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Hardware workstations</span>
                                    <Link href="/admin/labs" className="text-sky-600 font-semibold hover:underline">Manage &rarr;</Link>
                                </div>
                            </div>

                            {/* Staff & Admin KPI 2: Pending Grading */}
                            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-amber-300 transition group">
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">Action Due</span>
                                </div>
                                <div className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
                                    {stats.pendingGrading ?? 0}
                                </div>
                                <div className="text-xs font-semibold text-slate-500 mt-1">
                                    {t('dashboard.pendingGrading', 'Pending Grading')}
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Submissions to evaluate</span>
                                    <Link href="/submissions" className="text-indigo-600 font-semibold hover:underline">Grade &rarr;</Link>
                                </div>
                            </div>

                            {/* Staff & Admin KPI 3: Students / Enrolled Users */}
                            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-indigo-300 transition group">
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <GraduationCap className="w-5 h-5" />
                                    </div>
                                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">Enrolled</span>
                                </div>
                                <div className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
                                    {stats.totalStudents ?? (stats.totalUsers || 0)}
                                </div>
                                <div className="text-xs font-semibold text-slate-500 mt-1">Total Students</div>
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Across active batches</span>
                                    <Link href="/classes" className="text-indigo-600 font-semibold hover:underline">Rosters &rarr;</Link>
                                </div>
                            </div>

                            {/* Staff & Admin KPI 4: Live Vivas & Meetings */}
                            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-purple-300 transition group">
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                        <Video className="w-5 h-5" />
                                    </div>
                                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">Live Stream</span>
                                </div>
                                <div className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
                                    {stats.totalVivas ?? (stats.scheduledVivas || 0)}
                                </div>
                                <div className="text-xs font-semibold text-slate-500 mt-1">Scheduled Vivas / Meetings</div>
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Real-time assessment</span>
                                    <Link href="/meetings" className="text-purple-600 font-semibold hover:underline">Launch &rarr;</Link>
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
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                                        <CalendarDays className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900 text-sm">{t('dashboard.upcomingDeadlines', 'Upcoming Deadlines & Schedule')}</h2>
                                        <p className="text-xs text-slate-500">Assignments and submissions requiring attention</p>
                                    </div>
                                </div>
                                <Link href="/assignments" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1">
                                    {t('common.viewAll', 'View All')} <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {deadlines.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">
                                        <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                        <p className="text-sm font-medium">{t('dashboard.noUpcomingDeadlines', 'No upcoming deadlines')}</p>
                                        <p className="text-xs text-slate-400 mt-1">All assignments and evaluations are currently up to date.</p>
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
                                            graded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                            submitted: 'bg-blue-50 text-blue-700 border-blue-200',
                                            needs_revision: 'bg-amber-50 text-amber-700 border-amber-200',
                                            pending: 'bg-slate-100 text-slate-600 border-slate-200'
                                        };

                                        return (
                                            <Link
                                                key={i}
                                                href={`/assignments/${item.id}`}
                                                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition group"
                                            >
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                                                        <FileText className="w-5 h-5 group-hover:scale-105 transition" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-900 text-sm truncate group-hover:text-indigo-600 transition">
                                                            {item.title}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                            <span>{item.subject?.name || 'Lab Course'}</span>
                                                            <span>•</span>
                                                            <span className={hoursLeft < 24 ? 'text-red-600 font-semibold' : 'text-slate-500'}>
                                                                {timeLeftText}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border ${statusColors[item.status] || statusColors.pending}`}>
                                                        {item.status || t('dashboard.pending', 'Pending')}
                                                    </span>
                                                    <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition hidden sm:inline-flex items-center gap-1">
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
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                                        <Folder className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900 text-sm">Recent Boards & Office Documents</h2>
                                        <p className="text-xs text-slate-500">Pick up right where you left off</p>
                                    </div>
                                </div>
                                <Link href="/documents" className="text-xs font-semibold text-purple-600 hover:text-purple-800 transition">
                                    Browse All &rarr;
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                                <Link
                                    href="/whiteboard"
                                    className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition group"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                                            <Pencil className="w-4 h-4" />
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400">Interactive</span>
                                    </div>
                                    <p className="font-bold text-slate-900 text-xs truncate group-hover:text-purple-700 transition">Interactive Whiteboard</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Multi-page drawing & AI tools</p>
                                </Link>

                                <Link
                                    href="/documents/word-editor"
                                    className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition group"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                            W
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400">Word</span>
                                    </div>
                                    <p className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-700 transition">Word Document Editor</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Lab manuals, syllabi & docs</p>
                                </Link>

                                <Link
                                    href="/documents/excel-editor"
                                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition group"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                            X
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400">Excel</span>
                                    </div>
                                    <p className="font-bold text-slate-900 text-xs truncate group-hover:text-emerald-700 transition">Excel Spreadsheet Editor</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Marks sheets & grade records</p>
                                </Link>
                            </div>
                        </div>

                        {/* Student Assignment Calendar */}
                        {user?.role === 'student' && (
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
                                <AssignmentCalendar />
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN (4-5 cols): Modular Launchpad, Live Lab Status & Profile Summary */}
                    <div className="lg:col-span-5 xl:col-span-4 space-y-6">

                        {/* Modular Quick Launchpad */}
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-slate-900 text-white">
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900 text-sm">Modular Launchpad</h2>
                                        <p className="text-[11px] text-slate-400">One-click direct access</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">ULRMS Hub</span>
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
                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                                                activeCategory === tab.id
                                                    ? 'bg-slate-900 text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Compact Icon Tiles (High Information Density, Zero URL clutter) */}
                            <div className="grid grid-cols-2 gap-2 pt-2">
                                {(user?.role === 'student' ? studentShortcuts : staffShortcuts)
                                    .filter(s => activeCategory === 'all' || s.category === activeCategory)
                                    .slice(0, 8)
                                    .map((item, idx) => {
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={idx}
                                                href={item.href}
                                                className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition group flex items-center gap-2.5"
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition ${item.color}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 text-xs truncate group-hover:text-indigo-600 transition">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 truncate capitalize">
                                                        {item.category}
                                                    </p>
                                                </div>
                                            </Link>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Live Lab Workstation Pulse */}
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <h2 className="font-bold text-slate-900 text-sm">Lab Hardware & Workstations</h2>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    Nominal
                                </span>
                            </div>

                            <div className="space-y-3 pt-3">
                                <div>
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-semibold text-slate-700">Lab 1 (Computer Systems)</span>
                                        <span className="font-mono text-slate-500">28 / 30 Active</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: '93%' }} />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-semibold text-slate-700">Lab 2 (Web & Mobile Dev)</span>
                                        <span className="font-mono text-slate-500">30 / 30 Full</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                <span>Active PCs: {stats.activeLabs != null ? stats.activeLabs * 30 : '60'}</span>
                                <Link href="/admin/labs" className="text-indigo-600 font-semibold hover:underline">
                                    Station Map &rarr;
                                </Link>
                            </div>
                        </div>

                        {/* Student Specific Profile / PC Widget */}
                        {user?.role === 'student' && studentProfile && (
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
                                <h2 className="font-bold text-slate-900 text-sm mb-3">My Lab Workstation</h2>
                                <div className="grid grid-cols-2 gap-3 text-center">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase">{t('dashboard.class', 'Class')}</p>
                                        <p className="font-bold text-slate-800 text-sm mt-0.5">{studentProfile.primaryClass?.name || '-'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase">{t('dashboard.assignedPc', 'Assigned PC')}</p>
                                        <p className="font-bold text-slate-800 text-sm mt-0.5">{studentProfile.assignedPc?.itemNumber || '-'}</p>
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
