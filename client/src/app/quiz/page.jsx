'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Sparkles, HelpCircle, Play, Clock, 
    Share2, QrCode, Copy, Check, Trash2, Search, ArrowRight,
    Award, CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronUp,
    Users, Send, BarChart3, FileText, X, CheckSquare, Square
} from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import PageHeader from '@/components/PageHeader';
import { useAuthStore } from '@/lib/store';
import { quizAPI, classesAPI } from '@/lib/api';
import MathRenderer from '@/components/MathRenderer';

export default function QuizDashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    const [activeTab, setActiveTab] = useState('created'); // 'created' | 'completed'
    const [joinCodeInput, setJoinCodeInput] = useState('');

    // List of created/available quizzes
    const [quizzes, setQuizzes] = useState([]);
    const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');

    // List of completed submissions for student
    const [myResults, setMyResults] = useState([]);
    const [isLoadingResults, setIsLoadingResults] = useState(false);
    const [expandedResultIds, setExpandedResultIds] = useState(new Set());

    // Share / QR Code Modal
    const [shareQuiz, setShareQuiz] = useState(null);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [copied, setCopied] = useState(false);

    // AI Generator Modal in Dashboard
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [keywords, setKeywords] = useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const [questionCount, setQuestionCount] = useState(5);
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(10);
    const [maxAttemptsInput, setMaxAttemptsInput] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState([]);
    const [quizTitle, setQuizTitle] = useState('');
    const [quizStatus, setQuizStatus] = useState('published');
    const [isSaving, setIsSaving] = useState(false);

    // Assign Quiz Modal State
    const [assignQuizTarget, setAssignQuizTarget] = useState(null);
    const [classList, setClassList] = useState([]);
    const [selectedAssignClass, setSelectedAssignClass] = useState('');
    const [assignTargetType, setAssignTargetType] = useState('class'); // 'class' | 'group' | 'student'
    const [groupList, setGroupList] = useState([]);
    const [selectedAssignGroup, setSelectedAssignGroup] = useState('');
    const [studentList, setStudentList] = useState([]);
    const [selectedAssignStudents, setSelectedAssignStudents] = useState([]);
    const [activeAssignments, setActiveAssignments] = useState([]);
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);

    // Submissions / Results Modal State (Admin/Instructor View)
    const [viewSubmissionsQuiz, setViewSubmissionsQuiz] = useState(null);
    const [submissionsData, setSubmissionsData] = useState(null);
    const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
    const [expandedSubmissionIds, setExpandedSubmissionIds] = useState(new Set());

    const isInstructorOrAdmin = user && ['admin', 'instructor', 'principal', 'lab_assistant'].includes(user.role);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login?redirect=/quiz');
            return;
        }
        fetchQuizzes();
        fetchMyResults();
    }, [_hasHydrated, isAuthenticated]);

    const fetchQuizzes = async () => {
        try {
            setIsLoadingQuizzes(true);
            const res = await quizAPI.getAll();
            if (res.data.success) {
                setQuizzes(res.data.data.quizzes || []);
            }
        } catch (err) {
            console.error('Failed to load quizzes', err);
        } finally {
            setIsLoadingQuizzes(false);
        }
    };

    const fetchMyResults = async () => {
        try {
            setIsLoadingResults(true);
            const res = await quizAPI.getMyResults();
            if (res.data.success) {
                setMyResults(res.data.data || []);
            }
        } catch (err) {
            console.error('Failed to load my results', err);
        } finally {
            setIsLoadingResults(false);
        }
    };

    const handleJoinWithCode = (e) => {
        e.preventDefault();
        const code = joinCodeInput.trim().toUpperCase();
        if (!code) {
            toast.error('Please enter a Quiz ID or Join Code');
            return;
        }
        router.push(`/quiz/join/${code}`);
    };

    const handleOpenShare = async (quiz) => {
        try {
            setShareQuiz(quiz);
            const url = `${window.location.origin}/quiz/join/${quiz.code || quiz.id}`;
            const qr = await QRCode.toDataURL(url, { width: 220, margin: 2 });
            setQrCodeDataUrl(qr);
        } catch (err) {
            console.error('QR code error', err);
        }
    };

    const handleCopyLink = () => {
        if (!shareQuiz) return;
        const url = `${window.location.origin}/quiz/join/${shareQuiz.code || shareQuiz.id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDeleteQuiz = async (quizId) => {
        if (!confirm('Are you sure you want to delete this quiz?')) return;
        try {
            const res = await quizAPI.delete(quizId);
            if (res.data.success) {
                toast.success('Quiz deleted');
                fetchQuizzes();
            }
        } catch (err) {
            console.error('Failed to delete quiz', err);
            toast.error('Failed to delete quiz');
        }
    };

    // Toggle Accordion in Student My Scores View
    const toggleResultAccordion = (resId) => {
        setExpandedResultIds(prev => {
            const next = new Set(prev);
            if (next.has(resId)) next.delete(resId);
            else next.add(resId);
            return next;
        });
    };

    // Toggle Accordion in Admin Submissions View
    const toggleSubmissionAccordion = (subId) => {
        setExpandedSubmissionIds(prev => {
            const next = new Set(prev);
            if (next.has(subId)) next.delete(subId);
            else next.add(subId);
            return next;
        });
    };

    // AI Generation inside Modal
    const handleGenerateAI = async () => {
        if (!keywords.trim()) {
            toast.error('Please enter keywords or topics');
            return;
        }
        try {
            setIsGenerating(true);
            const res = await quizAPI.generate({
                keywords: keywords.trim(),
                difficulty,
                numberOfQuestions: questionCount,
                timeLimitMinutes
            });
            if (res.data.success) {
                setGeneratedQuestions(res.data.data.questions || []);
                setQuizTitle(`Quiz: ${keywords.trim()}`);
                toast.success(`Generated ${res.data.data.questions.length} questions!`);
            }
        } catch (err) {
            console.error('Generation failed', err);
            toast.error(err.response?.data?.message || 'Failed to generate quiz');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveGeneratedQuiz = async () => {
        if (!quizTitle.trim()) {
            toast.error('Please enter a quiz title');
            return;
        }
        if (generatedQuestions.length === 0) {
            toast.error('Please generate questions first');
            return;
        }

        try {
            setIsSaving(true);
            const res = await quizAPI.create({
                title: quizTitle.trim(),
                keywords: keywords.trim(),
                difficulty,
                totalQuestions: generatedQuestions.length,
                timeLimitMinutes,
                maxAttempts: Math.max(parseInt(maxAttemptsInput) || 1, 1),
                questions: generatedQuestions,
                status: quizStatus
            });
            if (res.data.success) {
                toast.success(`Quiz "${res.data.data.title}" saved! Join Code: ${res.data.data.code}`);
                setShowCreateModal(false);
                setGeneratedQuestions([]);
                setKeywords('');
                setMaxAttemptsInput(1);
                fetchQuizzes();
                handleOpenShare(res.data.data);
            }
        } catch (err) {
            console.error('Failed to save quiz', err);
            toast.error(err.response?.data?.message || 'Failed to save quiz');
        } finally {
            setIsSaving(false);
        }
    };

    // Open Assign Modal for a Quiz
    const handleOpenAssignModal = async (quiz) => {
        setAssignQuizTarget(quiz);
        setSelectedAssignClass('');
        setAssignTargetType('class');
        setSelectedAssignGroup('');
        setSelectedAssignStudents([]);
        setGroupList([]);
        setStudentList([]);

        try {
            setIsLoadingAssignments(true);
            const [classesRes, assignRes] = await Promise.all([
                classesAPI.getAll(),
                quizAPI.getAssignments(quiz.id)
            ]);

            const loadedClasses = classesRes.data?.data?.classes || classesRes.data?.data || classesRes.data?.classes || [];
            setClassList(loadedClasses);
            if (loadedClasses.length > 0) {
                setSelectedAssignClass(loadedClasses[0].id);
                loadClassTargets(loadedClasses[0].id);
            }

            if (assignRes.data.success) {
                setActiveAssignments(assignRes.data.data || []);
            }
        } catch (err) {
            console.error('Failed to load assignment data', err);
            toast.error('Failed to load classes or current assignments');
        } finally {
            setIsLoadingAssignments(false);
        }
    };

    const loadClassTargets = async (classId) => {
        if (!classId) return;
        try {
            const [groupsRes, studentsRes] = await Promise.all([
                classesAPI.getGroups(classId).catch(() => ({ data: { data: [] } })),
                classesAPI.getStudents(classId).catch(() => ({ data: { data: [] } }))
            ]);
            const groups = groupsRes.data?.data?.groups || groupsRes.data?.data || [];
            const students = studentsRes.data?.data?.students || studentsRes.data?.data || [];
            setGroupList(groups);
            setStudentList(students);
            if (groups.length > 0) setSelectedAssignGroup(groups[0].id);
        } catch (err) {
            console.error('Failed to load class groups or students', err);
        }
    };

    const handleAssignClassChange = (classId) => {
        setSelectedAssignClass(classId);
        loadClassTargets(classId);
    };

    const handleToggleStudentSelection = (studentId) => {
        setSelectedAssignStudents(prev => {
            if (prev.includes(studentId)) {
                return prev.filter(id => id !== studentId);
            } else {
                return [...prev, studentId];
            }
        });
    };

    const handleSaveAssignment = async () => {
        if (!assignQuizTarget || !selectedAssignClass) {
            toast.error('Please select a class');
            return;
        }

        try {
            setIsAssigning(true);
            const payload = {
                targetType: assignTargetType,
                targetClassId: selectedAssignClass
            };

            if (assignTargetType === 'group') {
                if (!selectedAssignGroup) {
                    toast.error('Please select a group');
                    return;
                }
                payload.targetGroupId = selectedAssignGroup;
            } else if (assignTargetType === 'student') {
                if (selectedAssignStudents.length === 0) {
                    toast.error('Please select at least one student');
                    return;
                }
                payload.targetStudentIds = selectedAssignStudents;
            }

            const res = await quizAPI.assign(assignQuizTarget.id, payload);
            if (res.data.success) {
                toast.success('Quiz assigned successfully!');
                // Refresh active assignments
                const updated = await quizAPI.getAssignments(assignQuizTarget.id);
                if (updated.data.success) {
                    setActiveAssignments(updated.data.data || []);
                }
                setSelectedAssignStudents([]);
                fetchQuizzes();
            }
        } catch (err) {
            console.error('Failed to assign quiz', err);
            toast.error(err.response?.data?.message || 'Failed to assign quiz');
        } finally {
            setIsAssigning(false);
        }
    };

    const handleRemoveAssignment = async (assignmentId) => {
        if (!assignQuizTarget) return;
        try {
            const res = await quizAPI.deleteAssignment(assignQuizTarget.id, assignmentId);
            if (res.data.success) {
                toast.success('Assignment removed');
                setActiveAssignments(prev => prev.filter(a => a.id !== assignmentId));
                fetchQuizzes();
            }
        } catch (err) {
            console.error('Failed to remove assignment', err);
            toast.error('Failed to remove assignment');
        }
    };

    // Open Submissions / Leaderboard Modal for Admin/Instructor
    const handleOpenSubmissionsModal = async (quiz) => {
        setViewSubmissionsQuiz(quiz);
        setSubmissionsData(null);
        setExpandedSubmissionIds(new Set());
        try {
            setIsLoadingSubmissions(true);
            const res = await quizAPI.getResults(quiz.id);
            if (res.data.success) {
                setSubmissionsData(res.data.data);
            }
        } catch (err) {
            console.error('Failed to load submissions', err);
            toast.error('Failed to load quiz submissions');
        } finally {
            setIsLoadingSubmissions(false);
        }
    };

    if (!_hasHydrated) return null;

    const pageTitle = isInstructorOrAdmin ? 'AI Quiz Maker' : 'Quizzes & Tests';
    const pageSubtitle = isInstructorOrAdmin
        ? 'Create, assign, and track multiple-choice assessments'
        : 'Take assigned quizzes and review your performance';

    return (
        <div className="min-h-screen bg-[#F3F2EF] dark:bg-slate-950 pb-12">
            {/* Standard Page Header */}
            <PageHeader title={pageTitle} titleHindi={isInstructorOrAdmin ? 'एआई क्विज़ मेकर' : 'क्विज़ और परीक्षाएं'}>
                {isInstructorOrAdmin && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="py-2 px-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                    >
                        <Sparkles className="w-4 h-4" />
                        Create AI Quiz
                    </button>
                )}
            </PageHeader>

            <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 space-y-6">

                {/* Quick Join Card */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 flex items-center justify-center">
                            <Play className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Join with Code</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Have a 6-character Quiz Code? Enter it below to begin.</p>
                        </div>
                    </div>
                    <form onSubmit={handleJoinWithCode} className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                            type="text"
                            value={joinCodeInput}
                            onChange={(e) => setJoinCodeInput(e.target.value)}
                            placeholder="Enter Code (e.g. 8K2P9X)"
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white uppercase font-mono tracking-wider placeholder-slate-400 focus:outline-none focus:border-primary-500 w-full sm:w-56"
                        />
                        <button
                            type="submit"
                            className="py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm flex-shrink-0"
                        >
                            Join <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </form>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <button
                        onClick={() => setActiveTab('created')}
                        className={`py-2 px-4 rounded-xl text-xs font-bold transition ${
                            activeTab === 'created'
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                    >
                        {isInstructorOrAdmin ? `All Quizzes (${quizzes.length})` : `Assigned Quizzes (${quizzes.length})`}
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`py-2 px-4 rounded-xl text-xs font-bold transition ${
                            activeTab === 'completed'
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                    >
                        My Scores & Results ({myResults.length})
                    </button>
                </div>

                {/* TAB 1: AVAILABLE / ASSIGNED QUIZZES */}
                {activeTab === 'created' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    placeholder="Search by title, topic, or code..."
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 shadow-sm"
                                />
                            </div>
                            <button
                                onClick={fetchQuizzes}
                                className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition border border-slate-200 dark:border-slate-700 shadow-sm"
                                title="Refresh"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoadingQuizzes ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {isLoadingQuizzes ? (
                            <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
                                Loading quizzes...
                            </div>
                        ) : quizzes.length === 0 ? (
                            <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
                                <HelpCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    {isInstructorOrAdmin ? 'No Quizzes Created Yet' : 'No Quizzes Assigned to You'}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                    {isInstructorOrAdmin 
                                        ? 'Click "Create AI Quiz" to generate an assessment with AI and assign it to classes or students.' 
                                        : 'Any quizzes assigned to your class or group by your instructor will appear here.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {quizzes
                                    .filter(q => !searchFilter || q.title.toLowerCase().includes(searchFilter.toLowerCase()) || q.code.includes(searchFilter.toUpperCase()))
                                    .map((quiz) => (
                                        <div
                                            key={quiz.id}
                                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 hover:border-primary-400 dark:hover:border-primary-500 transition shadow-sm group flex flex-col justify-between"
                                        >
                                            <div className="space-y-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                                        quiz.status === 'published'
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/40'
                                                            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/40'
                                                    }`}>
                                                        {quiz.status}
                                                    </span>
                                                    <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2 py-0.5 rounded border border-primary-200 dark:border-primary-800">
                                                        {quiz.code}
                                                    </span>
                                                </div>

                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug group-hover:text-primary-600 transition">
                                                    {quiz.title}
                                                </h3>

                                                {quiz.keywords && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                                        Topic: {quiz.keywords}
                                                    </p>
                                                )}

                                                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                                                    <span className="flex items-center gap-1 font-medium">
                                                        <HelpCircle className="w-3.5 h-3.5 text-primary-500" />
                                                        {quiz.totalQuestions} Questions
                                                    </span>
                                                    <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                                    <span className="flex items-center gap-1 font-medium">
                                                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                                                        {quiz.timeLimitMinutes} Mins
                                                    </span>
                                                    <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                                                    <span className="font-medium text-[11px] text-slate-600 dark:text-slate-300">
                                                        Max Attempts: {quiz.maxAttempts || 1}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center gap-2">
                                                <button
                                                    onClick={() => router.push(`/quiz/join/${quiz.code}`)}
                                                    className="flex-1 py-2 px-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                                                >
                                                    <Play className="w-3.5 h-3.5 fill-current" />
                                                    Take Quiz
                                                </button>

                                                {/* Staff Actions: Assign, Submissions, Delete */}
                                                {isInstructorOrAdmin && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenAssignModal(quiz)}
                                                            className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-primary-50 hover:text-primary-600 text-slate-700 dark:text-slate-300 rounded-xl transition"
                                                            title="Assign Quiz to Class/Group/Student"
                                                        >
                                                            <Users className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenSubmissionsModal(quiz)}
                                                            className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition"
                                                            title="View Student Submissions & Responses"
                                                        >
                                                            <BarChart3 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}

                                                <button
                                                    onClick={() => handleOpenShare(quiz)}
                                                    className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition"
                                                    title="Share Code & QR"
                                                >
                                                    <Share2 className="w-4 h-4" />
                                                </button>

                                                {isInstructorOrAdmin && (
                                                    <button
                                                        onClick={() => handleDeleteQuiz(quiz.id)}
                                                        className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition"
                                                        title="Delete Quiz"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: MY RESULTS & SCROLLABLE COLLAPSIBLE RESPONSES */}
                {activeTab === 'completed' && (
                    <div className="space-y-4">
                        {isLoadingResults ? (
                            <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
                                Loading scores...
                            </div>
                        ) : myResults.length === 0 ? (
                            <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
                                <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Completed Quizzes</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                    Take an assigned quiz or join with a code to test your knowledge!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {myResults.map((res) => {
                                    const isExpanded = expandedResultIds.has(res.id);
                                    const answersList = Array.isArray(res.answers) ? res.answers : [];

                                    return (
                                        <div
                                            key={res.id}
                                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4.5 shadow-sm space-y-3 transition"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                                            {res.quiz?.title || 'Assessment Quiz'}
                                                        </h4>
                                                        <span className="text-[10px] font-mono text-primary-600 bg-primary-50 dark:bg-primary-950/40 px-1.5 py-0.5 rounded border border-primary-200 dark:border-primary-800">
                                                            {res.quiz?.code}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        Completed: {new Date(res.submittedAt).toLocaleDateString()} • Time Taken: {Math.floor(res.timeTakenSeconds / 60)}m {res.timeTakenSeconds % 60}s
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <div className="text-base font-extrabold text-primary-600">
                                                            {res.score} / {res.totalQuestions}
                                                        </div>
                                                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                            {res.percentage}% Accuracy
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => toggleResultAccordion(res.id)}
                                                        className="py-1.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                                                    >
                                                        {isExpanded ? 'Hide Responses' : 'View Responses'}
                                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* SCROLLABLE COLLAPSIBLE FOR STUDENT RESPONSES */}
                                            {isExpanded && (
                                                <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                                                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                                        Question-by-Question Review ({answersList.length} Questions)
                                                    </h5>
                                                    <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                                                        {answersList.length === 0 ? (
                                                            <p className="text-xs text-slate-400 py-2">Detailed question breakdown not recorded for this test.</p>
                                                        ) : (
                                                            answersList.map((ans, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                                                                        ans.isCorrect
                                                                            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-slate-800 dark:text-emerald-200'
                                                                            : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-slate-800 dark:text-rose-200'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center justify-between font-bold">
                                                                        <div className="flex-1 pr-2">
                                                                            <span className="text-slate-400 mr-1.5">Q{idx + 1}:</span>
                                                                            <MathRenderer content={ans.questionText} inline />
                                                                        </div>
                                                                        {ans.isCorrect ? (
                                                                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                                                                            </span>
                                                                        ) : (
                                                                            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold shrink-0">
                                                                                <XCircle className="w-3.5 h-3.5" /> Incorrect
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-slate-600 dark:text-slate-300">
                                                                        Your Answer: <strong className="font-mono">{ans.selectedOption || 'None'}</strong> • Correct Answer: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{ans.correctOption}</strong>
                                                                    </div>
                                                                    {ans.explanation && (
                                                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                                                                            <span className="text-amber-500 font-semibold mr-1">💡</span>
                                                                            <MathRenderer content={ans.explanation} inline />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* MODAL 1: CREATE AI QUIZ (FOR STAFF) */}
                {showCreateModal && (
                    <div
                        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <div
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-left"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-primary-600" />
                                    Generate AI Quiz
                                </h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 rounded-lg"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Keywords / Topics <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={keywords}
                                        onChange={(e) => setKeywords(e.target.value)}
                                        placeholder="e.g. Data Structures, Linked Lists, Binary Trees"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                                    />
                                </div>

                                <div className="grid grid-cols-4 gap-2.5">
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Difficulty
                                        </label>
                                        <select
                                            value={difficulty}
                                            onChange={(e) => setDifficulty(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                        >
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                            <option value="mixed">Mixed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Questions
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={questionCount}
                                            onChange={(e) => setQuestionCount(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Time (Mins)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="120"
                                            value={timeLimitMinutes}
                                            onChange={(e) => setTimeLimitMinutes(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Max Attempts
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={maxAttemptsInput}
                                            onChange={(e) => setMaxAttemptsInput(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleGenerateAI}
                                    disabled={isGenerating || !keywords.trim()}
                                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                                    {isGenerating ? 'Generating Questions...' : 'Generate with AI'}
                                </button>
                            </div>

                            {/* Preview and Save */}
                            {generatedQuestions.length > 0 && (
                                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <input
                                        type="text"
                                        value={quizTitle}
                                        onChange={(e) => setQuizTitle(e.target.value)}
                                        placeholder="Quiz Title"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                    />
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>{generatedQuestions.length} Questions Ready • Max Attempts: {maxAttemptsInput}</span>
                                        <button
                                            onClick={() => setQuizStatus(quizStatus === 'published' ? 'draft' : 'published')}
                                            className="text-xs font-bold text-primary-600 hover:underline"
                                        >
                                            Status: {quizStatus}
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleSaveGeneratedQuiz}
                                        disabled={isSaving}
                                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm"
                                    >
                                        {isSaving ? 'Saving...' : 'Save & Publish Quiz'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MODAL 2: ASSIGN QUIZ (TO CLASS, GROUP, OR STUDENT) */}
                {assignQuizTarget && (
                    <div
                        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setAssignQuizTarget(null)}
                    >
                        <div
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-left"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary-600" />
                                    <div>
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Assign Quiz</h3>
                                        <p className="text-[11px] text-slate-500 truncate max-w-xs">{assignQuizTarget.title}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setAssignQuizTarget(null)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 rounded-lg"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Assignment Target Selector */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Select Class <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={selectedAssignClass}
                                        onChange={(e) => handleAssignClassChange(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                    >
                                        {classList.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {c.section ? `(${c.section})` : ''} - Grade {c.gradeLevel}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Assignment Scope
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'class', label: 'Entire Class' },
                                            { id: 'group', label: 'Specific Group' },
                                            { id: 'student', label: 'Specific Students' }
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => setAssignTargetType(t.id)}
                                                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition border ${
                                                    assignTargetType === t.id
                                                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                                }`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Group Selection */}
                                {assignTargetType === 'group' && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Select Group
                                        </label>
                                        {groupList.length === 0 ? (
                                            <p className="text-xs text-slate-400 py-2">No groups created for this class.</p>
                                        ) : (
                                            <select
                                                value={selectedAssignGroup}
                                                onChange={(e) => setSelectedAssignGroup(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                                            >
                                                {groupList.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}

                                {/* Students Multi-select */}
                                {assignTargetType === 'student' && (
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                Select Students ({selectedAssignStudents.length} selected)
                                            </label>
                                            {studentList.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (selectedAssignStudents.length === studentList.length) setSelectedAssignStudents([]);
                                                        else setSelectedAssignStudents(studentList.map(s => s.id));
                                                    }}
                                                    className="text-[11px] text-primary-600 hover:underline font-bold"
                                                >
                                                    {selectedAssignStudents.length === studentList.length ? 'Deselect All' : 'Select All'}
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 space-y-1 bg-slate-50 dark:bg-slate-950 custom-scrollbar">
                                            {studentList.length === 0 ? (
                                                <p className="text-xs text-slate-400 py-2 text-center">No enrolled students found.</p>
                                            ) : (
                                                studentList.map(s => {
                                                    const isChecked = selectedAssignStudents.includes(s.id);
                                                    return (
                                                        <div
                                                            key={s.id}
                                                            onClick={() => handleToggleStudentSelection(s.id)}
                                                            className="flex items-center gap-2 p-1.5 hover:bg-white dark:hover:bg-slate-900 rounded-lg cursor-pointer text-xs transition"
                                                        >
                                                            {isChecked ? (
                                                                <CheckSquare className="w-4 h-4 text-primary-600" />
                                                            ) : (
                                                                <Square className="w-4 h-4 text-slate-400" />
                                                            )}
                                                            <span className="font-medium text-slate-800 dark:text-slate-200">
                                                                {s.firstName} {s.lastName}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">
                                                                {s.studentId ? `(${s.studentId})` : s.email}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleSaveAssignment}
                                    disabled={isAssigning}
                                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
                                </button>
                            </div>

                            {/* Active Assignments List */}
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                                    Currently Assigned Targets ({activeAssignments.length})
                                </h4>
                                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                    {activeAssignments.length === 0 ? (
                                        <p className="text-xs text-slate-400 py-1">This quiz is not currently assigned to any class, group, or student.</p>
                                    ) : (
                                        activeAssignments.map(a => (
                                            <div
                                                key={a.id}
                                                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                                            >
                                                <div>
                                                    <span className="font-bold text-primary-600 capitalize mr-1.5">[{a.targetType}]</span>
                                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                                        {a.targetType === 'class' && (a.class?.name || 'Class')}
                                                        {a.targetType === 'group' && `${a.group?.name || 'Group'} (${a.class?.name || ''})`}
                                                        {a.targetType === 'student' && `${a.student?.firstName || ''} ${a.student?.lastName || 'Student'}`}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveAssignment(a.id)}
                                                    className="p-1 text-slate-400 hover:text-rose-500 rounded"
                                                    title="Remove assignment"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 3: VIEW SUBMISSIONS & RESPONSES (FOR STAFF) */}
                {viewSubmissionsQuiz && (
                    <div
                        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setViewSubmissionsQuiz(null)}
                    >
                        <div
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl text-left"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div>
                                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-primary-600" />
                                        Quiz Submissions & Responses
                                    </h3>
                                    <p className="text-xs text-slate-500 truncate max-w-md">{viewSubmissionsQuiz.title}</p>
                                </div>
                                <button
                                    onClick={() => setViewSubmissionsQuiz(null)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 rounded-lg"
                                >
                                    ✕
                                </button>
                            </div>

                            {isLoadingSubmissions ? (
                                <div className="py-12 text-center text-slate-500 text-xs animate-pulse">
                                    Loading student responses...
                                </div>
                            ) : !submissionsData || submissionsData.submissions?.length === 0 ? (
                                <div className="py-12 text-center text-slate-500 text-xs">
                                    No students have submitted this quiz yet.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Summary Banner */}
                                    <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                                        <div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Participants</div>
                                            <div className="text-base font-extrabold text-slate-900 dark:text-white">
                                                {submissionsData.summary?.totalParticipants}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Average Score</div>
                                            <div className="text-base font-extrabold text-primary-600">
                                                {submissionsData.summary?.avgScore} / {submissionsData.summary?.maxPossibleScore}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Highest Score</div>
                                            <div className="text-base font-extrabold text-emerald-600">
                                                {submissionsData.summary?.highestScore}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Submissions List with Accordion Responses */}
                                    <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                                        {submissionsData.submissions.map((sub) => {
                                            const isExpanded = expandedSubmissionIds.has(sub.id);
                                            const subAnswers = Array.isArray(sub.answers) ? sub.answers : [];

                                            return (
                                                <div
                                                    key={sub.id}
                                                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5 transition"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                                                                {sub.userName}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                {new Date(sub.submittedAt).toLocaleDateString()} • {Math.floor(sub.timeTakenSeconds / 60)}m {sub.timeTakenSeconds % 60}s
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <div className="text-right">
                                                                <span className="font-extrabold text-xs text-primary-600">
                                                                    {sub.score} / {sub.totalQuestions}
                                                                </span>
                                                                <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                    {sub.percentage}%
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() => toggleSubmissionAccordion(sub.id)}
                                                                className="py-1 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-slate-100"
                                                            >
                                                                {isExpanded ? 'Hide' : 'Review'}
                                                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* ACCORDION RESPONSES FOR ADMIN VIEW */}
                                                    {isExpanded && (
                                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                                                            <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                                                                {subAnswers.length === 0 ? (
                                                                    <p className="text-xs text-slate-400">No question breakdown recorded.</p>
                                                                ) : (
                                                                    subAnswers.map((ans, aIdx) => (
                                                                        <div
                                                                            key={aIdx}
                                                                            className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                                                                                ans.isCorrect
                                                                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-emerald-200'
                                                                                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-slate-800 dark:text-rose-200'
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center justify-between font-bold">
                                                                                <div className="flex-1 pr-2">
                                                                                    <span className="text-slate-400 mr-1.5">Q{aIdx + 1}:</span>
                                                                                    <MathRenderer content={ans.questionText} inline />
                                                                                </div>
                                                                                <span className={ans.isCorrect ? 'text-emerald-600 font-bold shrink-0' : 'text-rose-600 font-bold shrink-0'}>
                                                                                    {ans.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="text-slate-600 dark:text-slate-300">
                                                                                Selected: <strong className="font-mono">{ans.selectedOption || 'None'}</strong> • Correct: <strong className="font-mono text-emerald-600">{ans.correctOption}</strong>
                                                                            </div>
                                                                            {ans.explanation && (
                                                                                <div className="text-[10px] text-slate-500 bg-white/70 dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                                                                                    <span className="text-amber-500 font-semibold mr-1">💡</span>
                                                                                    <MathRenderer content={ans.explanation} inline />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MODAL 4: SHARE & QR CODE */}
                {shareQuiz && (
                    <div
                        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShareQuiz(null)}
                    >
                        <div
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-12 h-12 bg-primary-50 dark:bg-primary-950/40 text-primary-600 rounded-2xl flex items-center justify-center mx-auto">
                                <QrCode className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                {shareQuiz.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Scan with camera or use code to join from any device.
                            </p>

                            {qrCodeDataUrl && (
                                <div className="bg-white p-3 rounded-2xl inline-block shadow border border-slate-200">
                                    <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48 mx-auto rounded-lg" />
                                </div>
                            )}

                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Quiz Code
                                </div>
                                <div className="text-2xl font-mono font-extrabold text-primary-600 bg-slate-50 dark:bg-slate-950 py-1.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 inline-block tracking-widest">
                                    {shareQuiz.code}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                                <span className="truncate flex-1 text-left">{`${window.location.origin}/quiz/join/${shareQuiz.code}`}</span>
                                <button
                                    onClick={handleCopyLink}
                                    className="p-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>

                            <button
                                onClick={() => setShareQuiz(null)}
                                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
