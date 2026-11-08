'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Award, BookOpen, CheckCircle, Clock, Download, FileText,
    Filter, GraduationCap, LayoutGrid, List, Search, Sparkles,
    TrendingUp, User, Users, AlertCircle, ArrowUpRight, Cpu,
    Printer, Shield, BarChart3, ChevronRight, PenTool, Brain, Compass
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { classesAPI, assignmentsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import StudentProgressTabs from '@/components/StudentProgressTabs';
import GreenSegmentedSpinner from '@/components/GreenSegmentedSpinner';
import {
    FluentStudentProgressIcon,
    FluentAssignmentsIcon,
    FluentTrainingIcon,
    FluentQuizIcon,
    FluentExamHubIcon
} from '@/components/FluentNavIcons';

export default function StudentProgressReportPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTabParam = searchParams.get('tab') || 'overview';
    const { user, isAuthenticated, _hasHydrated, selectedSessionId } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [progressFilter, setProgressFilter] = useState('all'); // all, excelling, steady, needs_support

    // Mock Comprehensive Student Roster with 4-pillar data
    const [students, setStudents] = useState([
        {
            id: 'std_1',
            admissionNumber: '10770867',
            name: 'Om Parkash Gupta',
            className: 'Class 12 - CS (A)',
            classId: 'c1',
            avatar: null,
            assignments: { completed: 18, total: 20, score: 92 },
            training: { unitsCompleted: 14, totalUnits: 16, exercisesPassed: 28 },
            quizzes: { attempted: 8, avgScore: 88, masteredTopics: 12 },
            exams: { cbtStatus: 'Eligible', mockExamScore: 94, readinessIndex: 'High' },
            overallHealth: 91,
            status: 'excelling'
        },
        {
            id: 'std_2',
            admissionNumber: '10770868',
            name: 'Aarav Sharma',
            className: 'Class 12 - CS (A)',
            classId: 'c1',
            avatar: null,
            assignments: { completed: 16, total: 20, score: 84 },
            training: { unitsCompleted: 12, totalUnits: 16, exercisesPassed: 24 },
            quizzes: { attempted: 7, avgScore: 81, masteredTopics: 9 },
            exams: { cbtStatus: 'Eligible', mockExamScore: 85, readinessIndex: 'High' },
            overallHealth: 83,
            status: 'steady'
        },
        {
            id: 'std_3',
            admissionNumber: '10770869',
            name: 'Simran Kaur',
            className: 'Class 11 - Informatics (B)',
            classId: 'c2',
            avatar: null,
            assignments: { completed: 19, total: 20, score: 96 },
            training: { unitsCompleted: 16, totalUnits: 16, exercisesPassed: 32 },
            quizzes: { attempted: 9, avgScore: 95, masteredTopics: 15 },
            exams: { cbtStatus: 'Eligible', mockExamScore: 98, readinessIndex: 'Exceptional' },
            overallHealth: 96,
            status: 'excelling'
        },
        {
            id: 'std_4',
            admissionNumber: '10770870',
            name: 'Devansh Verma',
            className: 'Class 11 - Informatics (B)',
            classId: 'c2',
            avatar: null,
            assignments: { completed: 10, total: 20, score: 62 },
            training: { unitsCompleted: 7, totalUnits: 16, exercisesPassed: 12 },
            quizzes: { attempted: 4, avgScore: 58, masteredTopics: 4 },
            exams: { cbtStatus: 'Review Required', mockExamScore: 61, readinessIndex: 'Support Needed' },
            overallHealth: 60,
            status: 'needs_support'
        },
        {
            id: 'std_5',
            admissionNumber: '10770871',
            name: 'Ananya Deshmukh',
            className: 'Class 12 - CS (A)',
            classId: 'c1',
            avatar: null,
            assignments: { completed: 17, total: 20, score: 86 },
            training: { unitsCompleted: 13, totalUnits: 16, exercisesPassed: 26 },
            quizzes: { attempted: 8, avgScore: 84, masteredTopics: 10 },
            exams: { cbtStatus: 'Eligible', mockExamScore: 88, readinessIndex: 'High' },
            overallHealth: 86,
            status: 'steady'
        }
    ]);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadData();
    }, [_hasHydrated, isAuthenticated, selectedSessionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const classesRes = await classesAPI.getAll().catch(() => ({ data: { data: [] } }));
            setClasses(classesRes.data?.data || []);
        } catch (err) {
            console.error('Failed to load classes:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = useMemo(() => {
        return students.filter(std => {
            const matchesSearch = std.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                std.admissionNumber.includes(searchQuery) ||
                std.className.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesClass = selectedClass === 'all' || std.classId === selectedClass;
            const matchesFilter = progressFilter === 'all' || std.status === progressFilter;
            return matchesSearch && matchesClass && matchesFilter;
        });
    }, [students, searchQuery, selectedClass, progressFilter]);

    if (!_hasHydrated || loading) {
        return <GreenSegmentedSpinner fullscreen label="Compiling 360° student academic dossiers..." />;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 flex items-center justify-center border border-cyan-200 dark:border-cyan-800/80">
                            <FluentStudentProgressIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                Student Progress & Performance
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                360° Academic Dossier encompassing Assignments, Training, Quizzes, and Exams
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Print Report Cards</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Hub Navigation Tabs */}
            <StudentProgressTabs activeTab={activeTabParam === 'exams' ? 'exams' : 'overview'} />

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

                {/* EXAMS HUB & QUESTION PAPER DESIGNER SHOWCASE */}
                {activeTabParam === 'exams' ? (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-rose-950/60 via-slate-900 to-slate-900 border border-rose-900/40 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                                        <FluentExamHubIcon className="w-5 h-5" />
                                        <span>Official Assessment Engine & Curriculum Studio</span>
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tight text-white">
                                        Comprehensive Examination Hub
                                    </h2>
                                    <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
                                        Seamlessly conduct Online Computer-Based Tests (CBT) and Offline Physical OMR Exams, paired with a multi-section Question Paper Designer supporting Bloom's Taxonomy and automated answer key generation.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                        Release Ready Architecture
                                    </span>
                                </div>
                            </div>

                            {/* 3 Pillars of Exam Hub */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-4 border border-rose-500/20">
                                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center mb-3">
                                        <Cpu className="w-4 h-4 text-rose-400" />
                                    </div>
                                    <h3 className="font-bold text-sm text-white">1. Online CBT Engine</h3>
                                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                                        Timed countdowns, randomized section orders, browser fullscreen lockdown anti-cheat protection, and instant auto-grading for objective questions.
                                    </p>
                                </div>
                                <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-4 border border-rose-500/20">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center mb-3">
                                        <FileText className="w-4 h-4 text-amber-400" />
                                    </div>
                                    <h3 className="font-bold text-sm text-white">2. Offline OMR & Paper Desk</h3>
                                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                                        Printable student OMR bubble answer sheets, mobile camera scanning verification, physical booklet tabulation, and hall ticket seat allocation.
                                    </p>
                                </div>
                                <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-4 border border-rose-500/20">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-3">
                                        <PenTool className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <h3 className="font-bold text-sm text-white">3. Question Paper Designer</h3>
                                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                                        Bloom's Taxonomy weighting (Knowledge, Application, Analysis), difficulty balance (30% Easy, 50% Medium, 20% Hard), and 1-click export to print-ready PDF exam papers.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* 4-Pillar Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assignments Pass Rate</span>
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center">
                                <FluentAssignmentsIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">88.4%</div>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" /> +4.2% from previous term
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Training Modules Completed</span>
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center">
                                <FluentTrainingIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">82.1%</div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">114 exercises solved this month</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">AI Quiz Performance</span>
                            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center">
                                <FluentQuizIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">85.6%</div>
                        <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-1">36 topics fully mastered</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Exam Readiness</span>
                            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                                <FluentExamHubIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">92.0%</div>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Ready for CBT & Paper exams</p>
                    </div>
                </div>

                {/* Filters and Search Bar */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search by student name or admission number..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="all">All Classes & Sections</option>
                            <option value="c1">Class 12 - CS (A)</option>
                            <option value="c2">Class 11 - Informatics (B)</option>
                        </select>
                        <select
                            value={progressFilter}
                            onChange={(e) => setProgressFilter(e.target.value)}
                            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="all">All Health Profiles</option>
                            <option value="excelling">🌟 Excelling (&gt; 90%)</option>
                            <option value="steady">✅ Steady Progress (75-89%)</option>
                            <option value="needs_support">🌱 Needs Support (&lt; 75%)</option>
                        </select>
                    </div>
                </div>

                {/* Student Comprehensive Progress Dossier Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredStudents.map((std) => (
                        <div
                            key={std.id}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-cyan-400 dark:hover:border-cyan-600 transition-all flex flex-col justify-between gap-4"
                        >
                            <div>
                                {/* Header: Student Identity & Overall Academic Health */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                            {std.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{std.name}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                ID: <span className="font-mono text-slate-700 dark:text-slate-300">{std.admissionNumber}</span> • {std.className}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-cyan-600 dark:text-cyan-400">{std.overallHealth}%</div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            std.status === 'excelling'
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                : std.status === 'steady'
                                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                        }`}>
                                            {std.status === 'excelling' ? 'Excelling' : std.status === 'steady' ? 'On Track' : 'Needs Support'}
                                        </span>
                                    </div>
                                </div>

                                {/* 4 Learning Track Metrics */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5">
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Assignments</span>
                                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                                            {std.assignments.completed}/{std.assignments.total}
                                        </div>
                                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                            {std.assignments.score}% avg
                                        </span>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5">
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Training</span>
                                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                                            {std.training.unitsCompleted}/{std.training.totalUnits} Units
                                        </div>
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                            {std.training.exercisesPassed} solved
                                        </span>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5">
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase">AI Quizzes</span>
                                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                                            {std.quizzes.attempted} tests
                                        </div>
                                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                            {std.quizzes.avgScore}% avg
                                        </span>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5">
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Exam Readiness</span>
                                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                                            {std.exams.readinessIndex}
                                        </div>
                                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                                            {std.exams.mockExamScore}% mock
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Positive Action Toolbar */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    Active Study Trajectory
                                </span>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/reports?student=${std.admissionNumber}`}
                                        className="text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1"
                                    >
                                        Detailed Transcript <ArrowUpRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </main>
        </div>
    );
}
