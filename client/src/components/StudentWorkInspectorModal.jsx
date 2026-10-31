'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
    UserCheck,
    CheckCircle2,
    AlertCircle,
    Star,
    Sparkles,
    Search,
    Filter,
    Calendar,
    Clock,
    Play,
    Copy,
    Check,
    Terminal,
    Database,
    FileCode,
    Shapes,
    X,
    ChevronRight,
    RefreshCw,
    MessageSquare,
    Lightbulb,
    Plus,
    Trash2,
    Save,
    Layers,
    Send,
    ExternalLink,
    Zap,
    Users,
    CheckSquare,
    Square
} from 'lucide-react';
import toast from 'react-hot-toast';
import { compilerAPI } from '@/lib/api';

// Dynamic Monaco Editor to prevent SSR issues
const Editor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-slate-950 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin text-primary-400 mr-2" />
            <span className="text-xs">Loading Code Inspector...</span>
        </div>
    )
});

export default function StudentWorkInspectorModal({
    isOpen,
    onClose,
    isDarkMode = true,
    initialStudentId = null,
    onOpenInIDE = null
}) {
    // Student Directory State
    const [students, setStudents] = useState([]);
    const [loadingDirectory, setLoadingDirectory] = useState(true);
    const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UNREVIEWED' | 'NEEDS_WORK' | 'REVIEWED' | 'EXCELLENT' | 'ACTIVE_ONLY'

    // Selected Student Workspace State
    const [workspace, setWorkspace] = useState(null);
    const [loadingWorkspace, setLoadingWorkspace] = useState(false);
    const [activeTabId, setActiveTabId] = useState(null);
    const [activeInspectorView, setActiveInspectorView] = useState('code'); // 'code' | 'flowchart' | 'tables' | 'output'

    // Review Form State
    const [reviewMode, setReviewMode] = useState('manual'); // 'manual' | 'ai'
    const [rating, setRating] = useState(5);
    const [reviewStatus, setReviewStatus] = useState('reviewed');
    const [comments, setComments] = useState('');
    const [suggestions, setSuggestions] = useState(['', '', '']);
    const [savingReview, setSavingReview] = useState(false);

    // AI Review State
    const [aiReviewData, setAiReviewData] = useState(null);
    const [generatingAi, setGeneratingAi] = useState(false);

    // Bulk Review State
    const [selectedForBulk, setSelectedForBulk] = useState(new Set());
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(null); // { total, current, studentName, complete }

    // Test run in inspector
    const [isRunningCode, setIsRunningCode] = useState(false);
    const [runOutput, setRunOutput] = useState(null);

    // Copy code button feedback
    const [copied, setCopied] = useState(false);

    // Load Student Directory on Mount / Open
    useEffect(() => {
        if (isOpen) {
            loadStudentDirectory();
        }
    }, [isOpen]);

    // Set initial student when directory loads
    useEffect(() => {
        if (initialStudentId && students.length > 0) {
            setSelectedStudentId(initialStudentId);
        } else if (!selectedStudentId && students.length > 0) {
            setSelectedStudentId(students[0].id);
        }
    }, [students, initialStudentId]);

    // Load student workspace when selectedStudentId changes
    useEffect(() => {
        if (selectedStudentId) {
            loadStudentWorkspace(selectedStudentId);
        }
    }, [selectedStudentId]);

    const loadStudentDirectory = async () => {
        setLoadingDirectory(true);
        try {
            const res = await compilerAPI.getStudentsInspection();
            if (res.data?.success && Array.isArray(res.data?.data)) {
                setStudents(res.data.data);
            }
        } catch (err) {
            toast.error('Failed to load student inspection list');
        } finally {
            setLoadingDirectory(false);
        }
    };

    const loadStudentWorkspace = async (studentId) => {
        setLoadingWorkspace(true);
        setRunOutput(null);
        setAiReviewData(null);
        try {
            const res = await compilerAPI.getStudentWorkspace(studentId);
            if (res.data?.success && res.data?.data) {
                const ws = res.data.data;
                setWorkspace(ws);

                // Set active tab
                if (Array.isArray(ws.tabs) && ws.tabs.length > 0) {
                    const active = ws.tabs.find(t => t.id === ws.activeTabId) || ws.tabs[0];
                    setActiveTabId(active.id);
                } else {
                    setActiveTabId(null);
                }

                // Populate Review Form from latest review if available
                const latest = ws.reviewData?.latestReview;
                if (latest) {
                    setRating(latest.rating || 5);
                    setReviewStatus(latest.status || 'reviewed');
                    setComments(latest.comments || '');
                    setSuggestions(
                        Array.isArray(latest.suggestions) && latest.suggestions.length > 0
                            ? [...latest.suggestions]
                            : ['', '']
                    );
                } else {
                    // Defaults for a new review
                    setRating(5);
                    setReviewStatus('reviewed');
                    setComments('');
                    setSuggestions(['Optimize loop efficiency and boundary checks', 'Add descriptive comments for complex logic']);
                }
            }
        } catch (err) {
            toast.error('Failed to load student practice workspace');
        } finally {
            setLoadingWorkspace(false);
        }
    };

    // Filter Students
    const uniqueClasses = useMemo(() => {
        const clsSet = new Set(students.map(s => s.className).filter(Boolean));
        return Array.from(clsSet);
    }, [students]);

    const filteredStudents = useMemo(() => {
        return students.filter(st => {
            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = st.name.toLowerCase().includes(q);
                const matchAdm = (st.admissionNumber || '').toLowerCase().includes(q);
                const matchEmail = (st.email || '').toLowerCase().includes(q);
                const matchRoll = (st.rollNumber || '').toLowerCase().includes(q);
                if (!matchName && !matchAdm && !matchEmail && !matchRoll) return false;
            }

            // Class filter
            if (classFilter !== 'ALL' && st.className !== classFilter) {
                return false;
            }

            // Status filter
            if (statusFilter === 'UNREVIEWED' && st.reviewStatus !== 'unreviewed') return false;
            if (statusFilter === 'NEEDS_WORK' && st.reviewStatus !== 'needs_improvement') return false;
            if (statusFilter === 'REVIEWED' && st.reviewStatus !== 'reviewed') return false;
            if (statusFilter === 'EXCELLENT' && st.reviewStatus !== 'excellent') return false;
            if (statusFilter === 'ACTIVE_ONLY' && !st.hasWorkspace) return false;

            return true;
        });
    }, [students, searchQuery, classFilter, statusFilter]);

    // Active Tab in Workspace
    const activeTab = useMemo(() => {
        if (!workspace || !Array.isArray(workspace.tabs)) return null;
        return workspace.tabs.find(t => t.id === activeTabId) || workspace.tabs[0] || null;
    }, [workspace, activeTabId]);

    // Handle Manual Review Save
    const handleSaveReview = async () => {
        if (!selectedStudentId) return;
        setSavingReview(true);
        try {
            const payload = {
                rating,
                status: reviewStatus,
                comments: comments.trim(),
                suggestions: suggestions.map(s => s.trim()).filter(Boolean)
            };
            const res = await compilerAPI.submitStudentReview(selectedStudentId, payload);
            if (res.data?.success) {
                toast.success('Review & suggestions saved and sent to student!');
                // Update student in local directory
                setStudents(prev => prev.map(s => {
                    if (s.id === selectedStudentId) {
                        return {
                            ...s,
                            reviewStatus: payload.status,
                            latestRating: payload.rating,
                            latestReviewedAt: new Date().toISOString()
                        };
                    }
                    return s;
                }));
                // Refresh workspace review data
                if (workspace) {
                    setWorkspace(prev => ({
                        ...prev,
                        reviewData: {
                            ...prev.reviewData,
                            latestReview: res.data.data
                        }
                    }));
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setSavingReview(false);
        }
    };

    // Handle Single Student AI Code Review
    const handleGenerateAiReview = async () => {
        if (!selectedStudentId) return;
        setGeneratingAi(true);
        try {
            const res = await compilerAPI.generateStudentAiReview(selectedStudentId, { autoSave: false });
            if (res.data?.success && res.data?.data) {
                setAiReviewData(res.data.data);
                toast.success('AI Code Review generated successfully!');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'AI review generation failed');
        } finally {
            setGeneratingAi(false);
        }
    };

    // Apply AI Review to Manual Form
    const handleApplyAiReviewToForm = () => {
        if (!aiReviewData) return;
        setRating(aiReviewData.rating || 5);
        setReviewStatus(aiReviewData.status || 'reviewed');
        setComments(aiReviewData.comments || '');
        if (Array.isArray(aiReviewData.suggestions) && aiReviewData.suggestions.length > 0) {
            setSuggestions([...aiReviewData.suggestions]);
        }
        setReviewMode('manual');
        toast.success('AI recommendations loaded into review form. Review and click Save!');
    };

    // Handle Test Run Code in Inspector
    const handleTestRunCode = async () => {
        if (!activeTab || !activeTab.code) {
            toast.error('No code available in active tab to execute');
            return;
        }
        setIsRunningCode(true);
        setActiveInspectorView('output');
        try {
            const res = await compilerAPI.execute({
                language: activeTab.language || 'python',
                code: activeTab.code,
                stdin: ''
            });
            if (res.data?.success) {
                setRunOutput(res.data.data);
                toast.success(`Executed in ${res.data.data.durationMs || 0}ms`);
            } else {
                setRunOutput({ stderr: res.data?.message || 'Execution error' });
            }
        } catch (err) {
            setRunOutput({ stderr: err.response?.data?.message || err.message });
        } finally {
            setIsRunningCode(false);
        }
    };

    // Bulk Selection Helpers
    const toggleSelectAll = () => {
        if (selectedForBulk.size === filteredStudents.length) {
            setSelectedForBulk(new Set());
        } else {
            setSelectedForBulk(new Set(filteredStudents.map(s => s.id)));
        }
    };

    const toggleSelectStudent = (id, e) => {
        e.stopPropagation();
        const next = new Set(selectedForBulk);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedForBulk(next);
    };

    // Trigger Bulk AI Review
    const handleRunBulkAiReview = async () => {
        const studentIds = Array.from(selectedForBulk);
        if (studentIds.length === 0) {
            toast.error('Please select at least one student for bulk review');
            return;
        }

        setBulkModalOpen(true);
        setBulkProgress({ total: studentIds.length, current: 0, studentName: 'Initializing...', complete: false });

        try {
            const res = await compilerAPI.bulkAiReview({ studentIds });
            if (res.data?.success) {
                setBulkProgress({
                    total: studentIds.length,
                    current: studentIds.length,
                    studentName: 'Completed!',
                    complete: true,
                    results: res.data.data
                });
                toast.success(`Bulk AI Review complete: ${res.data.data.successCount} students reviewed!`);
                loadStudentDirectory();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Bulk AI review failed');
            setBulkModalOpen(false);
        }
    };

    const handleCopyCode = () => {
        if (!activeTab?.code) return;
        navigator.clipboard.writeText(activeTab.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Code copied to clipboard');
    };

    // Format relative and absolute timestamps
    const formatDateTime = (isoString) => {
        if (!isoString) return { formatted: 'No activity', relative: 'Never' };
        try {
            const date = new Date(isoString);
            const formatted = date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Relative
            const diffMs = Date.now() - date.getTime();
            const mins = Math.floor(diffMs / 60000);
            let relative = '';
            if (mins < 1) relative = 'Just now';
            else if (mins < 60) relative = `${mins}m ago`;
            else if (mins < 1440) relative = `${Math.floor(mins / 60)}h ago`;
            else relative = `${Math.floor(mins / 1440)}d ago`;

            return { formatted, relative };
        } catch (_) {
            return { formatted: isoString, relative: '' };
        }
    };

    if (!isOpen) return null;

    const modalBg = isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800';
    const subCardBg = isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200';
    const inputBg = isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800';

    const getStatusStyle = (status) => {
        switch (status) {
            case 'excellent':
                return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
            case 'needs_improvement':
                return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
            case 'reviewed':
                return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
            case 'unreviewed':
                return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
            default:
                return 'bg-slate-800 text-slate-400 border-slate-700';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className={`relative w-[96vw] h-[94vh] max-w-7xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${modalBg}`}>
                {/* 1. STUDIO TOP BAR */}
                <div className={`flex flex-wrap items-center justify-between px-5 py-3 border-b gap-3 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-bold">Student Coding Work Inspector & Review Studio</h1>
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-400 font-semibold border border-primary-500/25">
                                    {students.length} Enrolled Students
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Inspect real-time student practice code, databases, diagrams, and deliver manual or bulk AI reviews.
                            </p>
                        </div>
                    </div>

                    {/* Top Actions: Bulk AI Review & Close */}
                    <div className="flex items-center gap-3">
                        {selectedForBulk.size > 0 && (
                            <button
                                onClick={handleRunBulkAiReview}
                                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/25 transition cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>Bulk AI Review ({selectedForBulk.size})</span>
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title="Close Inspector (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 2. THREE-PANE STUDIO WORKSPACE */}
                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT PANE: STUDENT DIRECTORY & ACTIVITY TIMELINE */}
                    <div className={`w-80 border-r flex flex-col ${isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/50'}`}>
                        {/* Directory Filters & Search */}
                        <div className="p-3 border-b border-slate-800 space-y-2.5">
                            {/* Search */}
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search student or roll no..."
                                    className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs ${inputBg}`}
                                />
                            </div>

                            {/* Class & Status Filters */}
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <select
                                    value={classFilter}
                                    onChange={(e) => setClassFilter(e.target.value)}
                                    className={`w-full px-2 py-1 rounded-lg border ${inputBg}`}
                                >
                                    <option value="ALL">All Classes</option>
                                    {uniqueClasses.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>

                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className={`w-full px-2 py-1 rounded-lg border ${inputBg}`}
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="UNREVIEWED">Unreviewed</option>
                                    <option value="NEEDS_WORK">Needs Work</option>
                                    <option value="REVIEWED">Reviewed</option>
                                    <option value="EXCELLENT">Excellent</option>
                                    <option value="ACTIVE_ONLY">Active Only</option>
                                </select>
                            </div>

                            {/* Bulk Select All Toolbar */}
                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                                <label
                                    onClick={toggleSelectAll}
                                    className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 transition"
                                >
                                    {selectedForBulk.size === filteredStudents.length && filteredStudents.length > 0 ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                                    ) : (
                                        <Square className="w-3.5 h-3.5 text-slate-500" />
                                    )}
                                    <span>Select All ({filteredStudents.length})</span>
                                </label>

                                <span className="text-[10px] text-slate-500">
                                    {selectedForBulk.size} selected
                                </span>
                            </div>
                        </div>

                        {/* Student Directory List */}
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
                            {loadingDirectory ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                                    <RefreshCw className="w-5 h-5 animate-spin text-primary-400" />
                                    <span className="text-xs">Loading Students...</span>
                                </div>
                            ) : filteredStudents.length === 0 ? (
                                <div className="py-12 px-4 text-center text-xs text-slate-400">
                                    No students match your filter criteria.
                                </div>
                            ) : (
                                filteredStudents.map((st) => {
                                    const isSelected = selectedStudentId === st.id;
                                    const isBulkSelected = selectedForBulk.has(st.id);
                                    const timeInfo = formatDateTime(st.updatedAt);

                                    return (
                                        <div
                                            key={st.id}
                                            onClick={() => setSelectedStudentId(st.id)}
                                            className={`p-3 transition cursor-pointer flex items-start gap-2.5 ${
                                                isSelected
                                                    ? 'bg-amber-500/10 border-l-4 border-amber-500 text-white'
                                                    : 'hover:bg-slate-900/60 text-slate-300'
                                            }`}
                                        >
                                            {/* Bulk Checkbox */}
                                            <button
                                                onClick={(e) => toggleSelectStudent(st.id, e)}
                                                className="mt-0.5 text-slate-500 hover:text-purple-400 transition cursor-pointer"
                                            >
                                                {isBulkSelected ? (
                                                    <CheckSquare className="w-4 h-4 text-purple-400" />
                                                ) : (
                                                    <Square className="w-4 h-4" />
                                                )}
                                            </button>

                                            {/* Details */}
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs truncate">
                                                        {st.name}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${getStatusStyle(st.reviewStatus)}`}>
                                                        {st.reviewStatus.replace('_', ' ')}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                                    <span className="truncate">{st.className} • Roll {st.rollNumber}</span>
                                                    {st.latestRating && (
                                                        <span className="text-amber-400 font-bold flex items-center gap-0.5">
                                                            ★ {st.latestRating}/5
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Datetime & Activity */}
                                                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-slate-500" />
                                                        {timeInfo.relative}
                                                    </span>

                                                    {/* Languages */}
                                                    <div className="flex items-center gap-1">
                                                        {st.languages.includes('python') && (
                                                            <span className="px-1 rounded bg-blue-500/20 text-blue-300 font-mono text-[9px]">
                                                                PY
                                                            </span>
                                                        )}
                                                        {st.languages.includes('sql') && (
                                                            <span className="px-1 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px]">
                                                                SQL
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* CENTER PANE: STUDENT CODE, RUNNER & DATABASE TABLES */}
                    <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800">
                        {loadingWorkspace ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                                <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                                <span className="text-xs">Loading Student Workspace...</span>
                            </div>
                        ) : !workspace ? (
                            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                                Select a student from the directory to inspect their work.
                            </div>
                        ) : (
                            <>
                                {/* Student Info Banner */}
                                <div className={`px-4 py-2.5 border-b flex items-center justify-between text-xs ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-100/60'}`}>
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <span className="font-bold text-sm text-white">
                                                {workspace.studentInfo?.name}
                                            </span>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                                <span>{workspace.studentInfo?.className}</span>
                                                <span>•</span>
                                                <span>Adm: {workspace.studentInfo?.admissionNumber}</span>
                                                <span>•</span>
                                                <span className="text-slate-300 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-amber-400" />
                                                    Last Active: {formatDateTime(workspace.updatedAt).formatted}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons: Test Run, Copy Code */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleCopyCode}
                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                                            title="Copy active student code"
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                            <span>{copied ? 'Copied' : 'Copy'}</span>
                                        </button>

                                        <button
                                            onClick={handleTestRunCode}
                                            disabled={isRunningCode || !activeTab}
                                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition cursor-pointer disabled:opacity-50"
                                        >
                                            {isRunningCode ? (
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Play className="w-3.5 h-3.5 fill-white" />
                                            )}
                                            <span>Test Run Code</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Tabs Strip */}
                                <div className={`flex items-center justify-between px-3 border-b text-xs ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-100'}`}>
                                    <div className="flex items-center gap-1 overflow-x-auto py-1">
                                        {Array.isArray(workspace.tabs) && workspace.tabs.length > 0 ? (
                                            workspace.tabs.map((tab) => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTabId(tab.id)}
                                                    className={`px-3 py-1.5 rounded-t-lg font-medium text-xs flex items-center gap-1.5 transition cursor-pointer ${
                                                        activeTabId === tab.id
                                                            ? 'bg-slate-900 text-white border-t-2 border-primary-500 font-bold'
                                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                                                    }`}
                                                >
                                                    <FileCode className="w-3.5 h-3.5 text-primary-400" />
                                                    <span>{tab.name}</span>
                                                    <span className="text-[10px] text-slate-500 uppercase">
                                                        ({tab.language})
                                                    </span>
                                                </button>
                                            ))
                                        ) : (
                                            <span className="text-xs text-slate-500 py-1">No open tabs found</span>
                                        )}
                                    </div>

                                    {/* View Toggle: Code | Tables | Terminal */}
                                    <div className="flex items-center gap-1 py-1">
                                        <button
                                            onClick={() => setActiveInspectorView('code')}
                                            className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                                                activeInspectorView === 'code'
                                                    ? 'bg-slate-800 text-white font-bold'
                                                    : 'text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            Editor
                                        </button>
                                        <button
                                            onClick={() => setActiveInspectorView('tables')}
                                            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition cursor-pointer ${
                                                activeInspectorView === 'tables'
                                                    ? 'bg-slate-800 text-white font-bold'
                                                    : 'text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            <Database className="w-3 h-3 text-amber-400" />
                                            <span>DB Tables ({workspace.existingTables?.length || 0})</span>
                                        </button>
                                        {runOutput && (
                                            <button
                                                onClick={() => setActiveInspectorView('output')}
                                                className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition cursor-pointer ${
                                                    activeInspectorView === 'output'
                                                        ? 'bg-slate-800 text-white font-bold'
                                                        : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                <Terminal className="w-3 h-3 text-emerald-400" />
                                                <span>Output</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Main Inspector Content: Code / Tables / Output */}
                                <div className="flex-1 overflow-hidden relative">
                                    {activeInspectorView === 'code' && (
                                        <Editor
                                            height="100%"
                                            language={activeTab?.language === 'sql' ? 'sql' : 'python'}
                                            value={activeTab?.code || '# No code in this tab'}
                                            theme="vs-dark"
                                            options={{
                                                readOnly: true,
                                                minimap: { enabled: false },
                                                fontSize: 13,
                                                lineNumbers: 'on',
                                                scrollBeyondLastLine: false,
                                                wordWrap: 'on'
                                            }}
                                        />
                                    )}

                                    {activeInspectorView === 'tables' && (
                                        <div className="h-full p-4 overflow-y-auto space-y-4 bg-slate-950 text-xs">
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                                <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                                                    <Database className="w-4 h-4 text-amber-400" />
                                                    Persistent Database Tables ({workspace.existingTables?.length || 0})
                                                </h3>
                                                <span className="text-[11px] text-slate-400">
                                                    Isolated Schema for Student
                                                </span>
                                            </div>

                                            {(!workspace.existingTables || workspace.existingTables.length === 0) ? (
                                                <div className="py-12 text-center text-slate-500">
                                                    Student has not created any persistent database tables yet.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {workspace.existingTables.map((tName) => (
                                                        <div
                                                            key={tName}
                                                            className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-slate-200"
                                                        >
                                                            <Database className="w-4 h-4 text-primary-400" />
                                                            <span className="font-mono font-semibold">{tName}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeInspectorView === 'output' && runOutput && (
                                        <div className="h-full p-4 overflow-y-auto bg-slate-950 font-mono text-xs text-slate-200 space-y-3">
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                                <span className="font-bold text-emerald-400 flex items-center gap-2">
                                                    <Terminal className="w-4 h-4" />
                                                    Execution Output (Stdout / Stderr)
                                                </span>
                                                <span className="text-[11px] text-slate-500">
                                                    Duration: {runOutput.durationMs || 0}ms
                                                </span>
                                            </div>

                                            {runOutput.stdout && (
                                                <pre className="whitespace-pre-wrap text-emerald-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                                                    {runOutput.stdout}
                                                </pre>
                                            )}

                                            {runOutput.stderr && (
                                                <pre className="whitespace-pre-wrap text-rose-400 bg-rose-950/20 p-3 rounded-lg border border-rose-900/40">
                                                    {runOutput.stderr}
                                                </pre>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* RIGHT PANE: REVIEW, FEEDBACK & AI MENTORSHIP STUDIO */}
                    <div className={`w-96 flex flex-col ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                        {/* Review Mode Toggle: Manual Review | AI Assistant */}
                        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full">
                                <button
                                    onClick={() => setReviewMode('manual')}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                        reviewMode === 'manual'
                                            ? 'bg-amber-600 text-white shadow'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Manual Review</span>
                                </button>
                                <button
                                    onClick={() => setReviewMode('ai')}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                        reviewMode === 'ai'
                                            ? 'bg-purple-600 text-white shadow'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>AI Code Mentor</span>
                                </button>
                            </div>
                        </div>

                        {/* REVIEW STUDIO BODY */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                            {reviewMode === 'manual' ? (
                                <>
                                    {/* Rating Selector */}
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] uppercase font-bold text-slate-400">
                                            Score / Rating
                                        </label>
                                        <div className="flex items-center gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setRating(star)}
                                                    className="p-1 hover:scale-110 transition cursor-pointer"
                                                >
                                                    <Star
                                                        className={`w-6 h-6 ${
                                                            star <= rating
                                                                ? 'fill-amber-400 text-amber-400'
                                                                : 'text-slate-700'
                                                        }`}
                                                    />
                                                </button>
                                            ))}
                                            <span className="font-mono font-bold text-sm text-amber-400 ml-1">
                                                {rating} / 5
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status Selector */}
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] uppercase font-bold text-slate-400">
                                            Evaluation Status
                                        </label>
                                        <select
                                            value={reviewStatus}
                                            onChange={(e) => setReviewStatus(e.target.value)}
                                            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${inputBg}`}
                                        >
                                            <option value="reviewed">Reviewed & Passed</option>
                                            <option value="needs_improvement">Needs Improvement / Revision</option>
                                            <option value="excellent">Outstanding / Excellent</option>
                                        </select>
                                    </div>

                                    {/* Comments / Feedback */}
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] uppercase font-bold text-slate-400">
                                            Instructor Comments & Feedback
                                        </label>
                                        <textarea
                                            rows={4}
                                            value={comments}
                                            onChange={(e) => setComments(e.target.value)}
                                            placeholder="Provide pedagogical feedback on logic, design, or algorithmic structure..."
                                            className={`w-full p-3 rounded-xl border text-xs ${inputBg} resize-none`}
                                        />
                                    </div>

                                    {/* Actionable Suggestions */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                                                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                                                Actionable Suggestions
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setSuggestions([...suggestions, ''])}
                                                className="text-[10px] text-primary-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                            >
                                                <Plus className="w-3 h-3" />
                                                Add Item
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {suggestions.map((sug, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={sug}
                                                        onChange={(e) => {
                                                            const copy = [...suggestions];
                                                            copy[i] = e.target.value;
                                                            setSuggestions(copy);
                                                        }}
                                                        placeholder={`Suggestion #${i + 1}...`}
                                                        className={`flex-1 px-2.5 py-1.5 rounded-lg border text-xs ${inputBg}`}
                                                    />
                                                    {suggestions.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSuggestions(suggestions.filter((_, idx) => idx !== i))}
                                                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Save Button */}
                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={handleSaveReview}
                                            disabled={savingReview || !selectedStudentId}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/25 transition cursor-pointer disabled:opacity-50"
                                        >
                                            {savingReview ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            <span>Save & Deliver Review</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                /* AI CODE MENTOR MODE */
                                <div className="space-y-4">
                                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200/90 text-xs leading-relaxed space-y-1">
                                        <div className="font-bold flex items-center gap-1.5 text-purple-300">
                                            <Sparkles className="w-4 h-4 text-purple-400" />
                                            Automated CS Pedagogical Analysis
                                        </div>
                                        <p className="text-[11px] text-purple-200/80">
                                            Evaluates Big-O time and space complexity, syntax correctness, edge case handling, and generates targeted code suggestions.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleGenerateAiReview}
                                        disabled={generatingAi || !selectedStudentId}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25 transition cursor-pointer disabled:opacity-50"
                                    >
                                        {generatingAi ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-4 h-4" />
                                        )}
                                        <span>{generatingAi ? 'Analyzing Code...' : 'Generate AI Code Review'}</span>
                                    </button>

                                    {aiReviewData && (
                                        <div className="space-y-3 pt-2">
                                            {/* AI Summary Card */}
                                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] uppercase font-bold text-purple-400">
                                                        AI Recommendation
                                                    </span>
                                                    <span className="text-amber-400 font-bold text-xs">
                                                        ★ {aiReviewData.rating} / 5
                                                    </span>
                                                </div>

                                                <div className="text-slate-300 text-[11px] whitespace-pre-wrap leading-relaxed">
                                                    {aiReviewData.comments}
                                                </div>
                                            </div>

                                            {/* AI Suggestions */}
                                            {aiReviewData.suggestions && aiReviewData.suggestions.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <span className="text-[11px] font-bold text-slate-400">
                                                        Key Recommendations:
                                                    </span>
                                                    <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
                                                        {aiReviewData.suggestions.map((sug, i) => (
                                                            <li key={i} className="leading-snug">{sug}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={handleApplyAiReviewToForm}
                                                className="w-full py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                                            >
                                                Apply AI Review to Manual Form
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* BULK AI REVIEW PROGRESS MODAL */}
                {bulkModalOpen && bulkProgress && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-purple-500/30 shadow-2xl text-slate-100 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Bulk AI Code Review</h3>
                                    <p className="text-xs text-slate-400">
                                        Evaluating {bulkProgress.total} student workspaces in parallel
                                    </p>
                                </div>
                            </div>

                            {/* Progress Status */}
                            <div className="space-y-2 py-2">
                                <div className="flex items-center justify-between text-xs text-slate-300">
                                    <span>{bulkProgress.studentName}</span>
                                    <span className="font-mono text-purple-400 font-bold">
                                        {bulkProgress.current} / {bulkProgress.total}
                                    </span>
                                </div>

                                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                                        style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {bulkProgress.complete && (
                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                    <span>
                                        Bulk review complete! {bulkProgress.results?.successCount} students evaluated and feedback delivered.
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => setBulkModalOpen(false)}
                                    disabled={!bulkProgress.complete}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white transition cursor-pointer disabled:opacity-40"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
