'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, Users, Award, Zap, CheckCircle2, XCircle, ChevronDown, ChevronUp,
    Search, Filter, BookOpen, Code2, AlertTriangle, Lightbulb, ExternalLink,
    RefreshCw, Copy, Check, Eye, Clock, ShieldCheck, GraduationCap, Flame,
    ArrowRight, ChevronRight
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminTrainingProgressModal({
    isOpen,
    moduleId,
    moduleTitle = '',
    onClose
}) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClass, setSelectedClass] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expandedStudentIds, setExpandedStudentIds] = useState(new Set());
    const [inspectedCode, setInspectedCode] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isOpen || !moduleId) return;
        loadProgressData();
    }, [isOpen, moduleId]);

    const loadProgressData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/training/modules/${moduleId}/progress`);
            if (res.data?.success) {
                setData(res.data.data);
            } else {
                toast.error('Could not load student progress');
            }
        } catch (err) {
            console.error('Error loading module progress:', err);
            toast.error(err.response?.data?.message || 'Failed to load module progress');
        } finally {
            setLoading(false);
        }
    };

    const toggleStudentExpand = (studentId) => {
        setExpandedStudentIds(prev => {
            const next = new Set(prev);
            if (next.has(studentId)) {
                next.delete(studentId);
            } else {
                next.add(studentId);
            }
            return next;
        });
    };

    const expandAll = () => {
        if (!filteredStudents) return;
        setExpandedStudentIds(new Set(filteredStudents.map(s => s.student.id)));
    };

    const collapseAll = () => {
        setExpandedStudentIds(new Set());
    };

    // Extract unique classes for filter dropdown
    const availableClasses = useMemo(() => {
        if (!data?.students) return [];
        const classNames = new Set();
        data.students.forEach(s => {
            const enrollments = s.student?.classEnrollment || [];
            enrollments.forEach(en => {
                if (en.class?.name) classNames.add(en.class.name);
            });
        });
        return Array.from(classNames);
    }, [data]);

    // Filter students by search query, class, and status
    const filteredStudents = useMemo(() => {
        if (!data?.students) return [];
        return data.students.filter(s => {
            const std = s.student || {};
            const q = searchQuery.toLowerCase().trim();
            const matchesQuery = !q || 
                (std.name && std.name.toLowerCase().includes(q)) ||
                (std.email && std.email.toLowerCase().includes(q)) ||
                (std.rollNumber && std.rollNumber.toLowerCase().includes(q));

            let matchesClass = true;
            if (selectedClass !== 'all') {
                const enrollments = std.classEnrollment || [];
                matchesClass = enrollments.some(en => en.class?.name === selectedClass);
            }

            let matchesStatus = true;
            if (statusFilter === 'completed') {
                matchesStatus = s.status === 'completed' || s.overallProgress === 100;
            } else if (statusFilter === 'in_progress') {
                matchesStatus = s.status === 'in_progress' && s.overallProgress < 100;
            } else if (statusFilter === 'not_started') {
                matchesStatus = s.status === 'not_started' || s.overallProgress === 0;
            } else if (statusFilter === 'assisted') {
                matchesStatus = s.usedSolutionCount > 0;
            }

            return matchesQuery && matchesClass && matchesStatus;
        });
    }, [data, searchQuery, selectedClass, statusFilter]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
                
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                                    Student Progress Dashboard
                                </h2>
                                {data?.module?.language && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                        {data.module.language}
                                    </span>
                                )}
                                {data?.module?.classLevel && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        Class {data.module.classLevel}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {data?.module?.title || moduleTitle || 'Training Course'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadProgressData}
                            disabled={loading}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                            title="Refresh Progress"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Main Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {loading && !data ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3">
                            <div className="animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full" />
                            <span className="text-xs text-slate-500">Aggregating assigned students & training mastery...</span>
                        </div>
                    ) : (
                        <>
                            {/* Summary Metric Ribbon */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                                            {data?.metrics?.totalAssigned || 0}
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-medium">Assigned Students</div>
                                    </div>
                                </div>

                                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-lg sm:text-xl font-extrabold text-blue-600 dark:text-blue-400">
                                            {data?.metrics?.totalActive || 0}
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-medium">Active Learners</div>
                                    </div>
                                </div>

                                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                            {data?.metrics?.totalCompleted || 0}
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-medium">100% Completed</div>
                                    </div>
                                </div>

                                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                        <Award className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-lg sm:text-xl font-extrabold text-amber-600 dark:text-amber-400">
                                            {data?.metrics?.avgProgress || 0}%
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-medium">Avg Completion</div>
                                    </div>
                                </div>

                                <div className="col-span-2 sm:col-span-1 p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                                        <Lightbulb className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-lg sm:text-xl font-extrabold text-purple-600 dark:text-purple-400">
                                            {data?.metrics?.solutionAssistedCount || 0}
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-medium">Used Reference Sol.</div>
                                    </div>
                                </div>
                            </div>

                            {/* Search and Filters Bar */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                                <div className="relative flex-1">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search student by name, roll number, or email..."
                                        className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Class Filter */}
                                    {availableClasses.length > 0 && (
                                        <select
                                            value={selectedClass}
                                            onChange={(e) => setSelectedClass(e.target.value)}
                                            className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none"
                                        >
                                            <option value="all">All Classes</option>
                                            {availableClasses.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Status Filter */}
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none"
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="completed">Completed (100%)</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="not_started">Not Started</option>
                                        <option value="assisted">Solution Assisted</option>
                                    </select>

                                    {/* Expand / Collapse All */}
                                    <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2">
                                        <button
                                            type="button"
                                            onClick={expandAll}
                                            className="px-2.5 py-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition"
                                            title="Expand All Accordions"
                                        >
                                            Expand All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={collapseAll}
                                            className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                                            title="Collapse All Accordions"
                                        >
                                            Collapse All
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Student Accordions List */}
                            {filteredStudents.length === 0 ? (
                                <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/20 rounded-3xl border border-slate-200 dark:border-slate-800/80">
                                    <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        No Students Match Filters
                                    </h4>
                                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                        Try adjusting your search query, class, or completion status filters.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredStudents.map((item) => {
                                        const std = item.student || {};
                                        const isExpanded = expandedStudentIds.has(std.id);
                                        const enrollments = std.classEnrollment || [];
                                        const className = enrollments[0]?.class?.name || null;
                                        const section = enrollments[0]?.class?.section || null;

                                        return (
                                            <div
                                                key={std.id}
                                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all shadow-xs"
                                            >
                                                {/* Accordion Summary Bar (Clickable) */}
                                                <div
                                                    onClick={() => toggleStudentExpand(std.id)}
                                                    className="p-3.5 sm:p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 transition"
                                                >
                                                    {/* Left: Avatar & Student Details */}
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                                                            {std.name ? std.name.charAt(0).toUpperCase() : 'S'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                                                    {std.name || 'Unnamed Student'}
                                                                </span>
                                                                {className && (
                                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                                        <GraduationCap className="w-2.5 h-2.5" />
                                                                        {className}{section ? `-${section}` : ''}
                                                                    </span>
                                                                )}
                                                                {std.rollNumber && (
                                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                                        Roll: {std.rollNumber}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-slate-400 truncate">
                                                                {std.email}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right: Progress bar, XP, Solution Tag, and Chevron */}
                                                    <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 shrink-0">
                                                        {/* Status Pill */}
                                                        <div>
                                                            {item.status === 'completed' ? (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                                                    <CheckCircle2 className="w-3 h-3" /> Completed
                                                                </span>
                                                            ) : item.status === 'in_progress' ? (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                                                    <Clock className="w-3 h-3" /> In Progress
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                                    Not Started
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Progress % Bar */}
                                                        <div className="w-28 sm:w-36 flex flex-col gap-1">
                                                            <div className="flex justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                                                <span>{item.passedCount}/{item.totalExercisesCount} Ex</span>
                                                                <span>{item.overallProgress}%</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full transition-all rounded-full ${
                                                                        item.overallProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                                                                    }`}
                                                                    style={{ width: `${item.overallProgress}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* XP / Streak */}
                                                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-500 font-bold">
                                                            <Award className="w-3.5 h-3.5" />
                                                            <span>{item.totalXP || 0} XP</span>
                                                        </div>

                                                        {/* Solution Assisted Badge */}
                                                        {item.usedSolutionCount > 0 && (
                                                            <span 
                                                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                                                                title={`Student viewed reference solution for ${item.usedSolutionCount} exercise(s)`}
                                                            >
                                                                <Lightbulb className="w-3 h-3 text-amber-500" />
                                                                <span>{item.usedSolutionCount} Assisted</span>
                                                            </span>
                                                        )}

                                                        {/* Expand Toggle */}
                                                        <div className="p-1 rounded-lg text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expanded Details Section */}
                                                {isExpanded && (
                                                    <div className="border-t border-slate-100 dark:border-slate-800/80 p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-950/40 space-y-5 animate-in fade-in duration-150">
                                                        {/* Unit-by-Unit Mastery Grid */}
                                                        <div>
                                                            <h5 className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Unit-by-Unit Mastery Progress
                                                            </h5>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                                                {item.unitsProgress.map((u) => (
                                                                    <div
                                                                        key={u.unitId}
                                                                        className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-2"
                                                                    >
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                                                U{u.unitNumber}: {u.title}
                                                                            </span>
                                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
                                                                                u.status === 'mastered'
                                                                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                                                                    : u.status === 'in_progress'
                                                                                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                                            }`}>
                                                                                {u.status}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                                                            <span>Passed: {u.exercisesDone}/{u.totalExercises}</span>
                                                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{u.masteryScore}% score</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Exercises Table & Code Inspector */}
                                                        <div>
                                                            <h5 className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                <Code2 className="w-3.5 h-3.5 text-emerald-500" /> Exercises Submissions & Code Inspector
                                                            </h5>
                                                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                                                <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                                                                    <thead>
                                                                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
                                                                            <th className="py-2.5 px-3">Unit</th>
                                                                            <th className="py-2.5 px-3">Exercise</th>
                                                                            <th className="py-2.5 px-3">Type</th>
                                                                            <th className="py-2.5 px-3 text-center">Status</th>
                                                                            <th className="py-2.5 px-3 text-center">Attempts</th>
                                                                            <th className="py-2.5 px-3 text-center">Assistance</th>
                                                                            <th className="py-2.5 px-3 text-right">Student Code</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                                                        {item.exercisesDetail.map((ex) => (
                                                                            <tr key={ex.exerciseId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                                                                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                                                                    U{ex.unitNumber}
                                                                                </td>
                                                                                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                                                                                    {ex.title}
                                                                                </td>
                                                                                <td className="py-2.5 px-3">
                                                                                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                                                        {ex.exerciseType}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="py-2.5 px-3 text-center">
                                                                                    {ex.status === 'passed' ? (
                                                                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                                                                                            Passed
                                                                                        </span>
                                                                                    ) : ex.status === 'failed' ? (
                                                                                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                                                                                            Failed
                                                                                        </span>
                                                                                    ) : ex.status === 'draft' ? (
                                                                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                                                                                            Draft
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400">
                                                                                            Unvisited
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                                                                                    {ex.attemptsCount}
                                                                                </td>
                                                                                <td className="py-2.5 px-3 text-center">
                                                                                    {ex.usedSolution ? (
                                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                                                                                            <Lightbulb className="w-2.5 h-2.5" /> Solution
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400 font-normal">
                                                                                            Self-solved
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="py-2.5 px-3 text-right">
                                                                                    {ex.latestCode ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => setInspectedCode({
                                                                                                studentName: std.name,
                                                                                                exerciseTitle: ex.title,
                                                                                                code: ex.latestCode,
                                                                                                output: ex.latestOutput,
                                                                                                status: ex.status,
                                                                                                usedSolution: ex.usedSolution,
                                                                                                attemptsCount: ex.attemptsCount
                                                                                            })}
                                                                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition"
                                                                                        >
                                                                                            <Eye className="w-3 h-3" /> View Code
                                                                                        </button>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400 italic">
                                                                                            No Code
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        Showing {filteredStudents.length} of {data?.students?.length || 0} assigned students
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition"
                    >
                        Close Dashboard
                    </button>
                </div>
            </div>

            {/* Code Inspection Modal */}
            {inspectedCode && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                    <Code2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                                        <span>{inspectedCode.studentName}&apos;s Submission</span>
                                        {inspectedCode.usedSolution && (
                                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                                                Solution Assisted
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-[11px] text-slate-400">{inspectedCode.exerciseTitle}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setInspectedCode(null)}
                                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                        inspectedCode.status === 'passed' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                    }`}>
                                        Status: {inspectedCode.status}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        {inspectedCode.attemptsCount} Attempt(s)
                                    </span>
                                </div>

                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(inspectedCode.code || '');
                                        setCopied(true);
                                        toast.success('Code copied');
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition font-medium"
                                >
                                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    <span>{copied ? 'Copied' : 'Copy Code'}</span>
                                </button>
                            </div>

                            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 font-mono text-xs text-indigo-300 overflow-x-auto">
                                <pre className="whitespace-pre">{inspectedCode.code || '# No code recorded'}</pre>
                            </div>

                            {inspectedCode.output && (
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Latest Console Output:</span>
                                    <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-3 font-mono text-xs text-slate-300 overflow-x-auto">
                                        <pre className="whitespace-pre-wrap">{inspectedCode.output}</pre>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-slate-800 bg-slate-950/70 flex justify-end">
                            <button
                                onClick={() => setInspectedCode(null)}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
