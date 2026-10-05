'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Sparkles, HelpCircle, Plus, Play, BarChart3, Clock, 
    Share2, QrCode, Copy, Check, Trash2, Search, ArrowRight,
    Award, CheckCircle2, RefreshCw, Eye, EyeOff, LayoutGrid, List
} from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import AppLayout from '@/components/AppLayout';
import { useAuthStore } from '@/lib/store';
import { quizAPI } from '@/lib/api';

export default function QuizDashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    const [activeTab, setActiveTab] = useState('created'); // 'created' | 'completed' | 'create_new'
    const [joinCodeInput, setJoinCodeInput] = useState('');

    // List of created quizzes
    const [quizzes, setQuizzes] = useState([]);
    const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');

    // List of completed submissions
    const [myResults, setMyResults] = useState([]);
    const [isLoadingResults, setIsLoadingResults] = useState(false);

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
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState([]);
    const [quizTitle, setQuizTitle] = useState('');
    const [quizStatus, setQuizStatus] = useState('published');
    const [isSaving, setIsSaving] = useState(false);

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
                questions: generatedQuestions,
                status: quizStatus
            });
            if (res.data.success) {
                toast.success(`Quiz "${res.data.data.title}" saved! Join Code: ${res.data.data.code}`);
                setShowCreateModal(false);
                setGeneratedQuestions([]);
                setKeywords('');
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

    if (!_hasHydrated) return null;

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 border border-indigo-700/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-xl z-10">
                        <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5" />
                            AI-Powered Assessment
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                            AI Quiz Maker & Assessment Hub
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            Generate interactive 4-choice quizzes with AI, attach them to whiteboard slides, and invite participants to join from any mobile or laptop with instant login-tracked scoring.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 z-10">
                        {isInstructorOrAdmin && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="py-3 px-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-2xl font-bold text-sm shadow-xl transition flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                Create AI Quiz
                            </button>
                        )}
                        <button
                            onClick={() => router.push('/whiteboard')}
                            className="py-3 px-5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-2xl font-bold text-sm shadow-xl transition flex items-center justify-center gap-2 border border-slate-700"
                        >
                            <HelpCircle className="w-4 h-4" />
                            Open in Whiteboard
                        </button>
                    </div>
                </div>

                {/* Quick Join Card */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                            <Play className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-white">Join a Quiz</h3>
                            <p className="text-xs text-slate-400">Have a 6-character code? Enter it below to begin.</p>
                        </div>
                    </div>
                    <form onSubmit={handleJoinWithCode} className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                            type="text"
                            value={joinCodeInput}
                            onChange={(e) => setJoinCodeInput(e.target.value)}
                            placeholder="Enter Code (e.g. 8K2P9X)"
                            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white uppercase font-mono tracking-wider placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-56"
                        />
                        <button
                            type="submit"
                            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow flex-shrink-0"
                        >
                            Join <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </form>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <button
                        onClick={() => setActiveTab('created')}
                        className={`py-2 px-4 rounded-xl text-xs font-bold transition ${
                            activeTab === 'created'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        Available Quizzes ({quizzes.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`py-2 px-4 rounded-xl text-xs font-bold transition ${
                            activeTab === 'completed'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        My Scores & Results ({myResults.length})
                    </button>
                </div>

                {/* TAB 1: AVAILABLE QUIZZES */}
                {activeTab === 'created' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    placeholder="Search by title, topic, or code..."
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <button
                                onClick={fetchQuizzes}
                                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition border border-slate-800"
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
                            <div className="py-16 text-center space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800">
                                <HelpCircle className="w-12 h-12 text-slate-600 mx-auto" />
                                <h3 className="text-sm font-bold text-white">No Quizzes Created Yet</h3>
                                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                    Click "Create AI Quiz" to generate your first 4-choice assessment with keywords and difficulty!
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {quizzes
                                    .filter(q => !searchFilter || q.title.toLowerCase().includes(searchFilter.toLowerCase()) || q.code.includes(searchFilter.toUpperCase()))
                                    .map((quiz) => (
                                        <div
                                            key={quiz.id}
                                            className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 hover:border-slate-700 transition shadow-xl group flex flex-col justify-between"
                                        >
                                            <div className="space-y-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                                        quiz.status === 'published'
                                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                    }`}>
                                                        {quiz.status}
                                                    </span>
                                                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                                        {quiz.code}
                                                    </span>
                                                </div>

                                                <h3 className="text-sm font-bold text-white leading-snug group-hover:text-indigo-400 transition">
                                                    {quiz.title}
                                                </h3>

                                                {quiz.keywords && (
                                                    <p className="text-xs text-slate-400 line-clamp-2">
                                                        Topic: {quiz.keywords}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                                                    <span className="flex items-center gap-1 font-medium">
                                                        <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                                                        {quiz.totalQuestions} Questions
                                                    </span>
                                                    <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                                    <span className="flex items-center gap-1 font-medium">
                                                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                                                        {quiz.timeLimitMinutes} Mins
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                                                <button
                                                    onClick={() => router.push(`/quiz/join/${quiz.code}`)}
                                                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow"
                                                >
                                                    <Play className="w-3.5 h-3.5 fill-current" />
                                                    Take Quiz
                                                </button>

                                                <button
                                                    onClick={() => handleOpenShare(quiz)}
                                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
                                                    title="Share Link & QR Code"
                                                >
                                                    <Share2 className="w-4 h-4" />
                                                </button>

                                                {isInstructorOrAdmin && (
                                                    <button
                                                        onClick={() => handleDeleteQuiz(quiz.id)}
                                                        className="p-2 bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 rounded-xl transition"
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

                {/* TAB 2: MY RESULTS */}
                {activeTab === 'completed' && (
                    <div className="space-y-4">
                        {isLoadingResults ? (
                            <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
                                Loading scores...
                            </div>
                        ) : myResults.length === 0 ? (
                            <div className="py-16 text-center space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800">
                                <Award className="w-12 h-12 text-slate-600 mx-auto" />
                                <h3 className="text-sm font-bold text-white">No Completed Quizzes</h3>
                                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                    Take an active quiz or enter a join code to test your knowledge!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {myResults.map((res) => (
                                    <div
                                        key={res.id}
                                        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-lg hover:border-slate-700 transition"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-sm text-white">
                                                    {res.quiz?.title || 'Assessment Quiz'}
                                                </h4>
                                                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                                    {res.quiz?.code}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                Completed: {new Date(res.submittedAt).toLocaleDateString()} • Time Taken: {Math.floor(res.timeTakenSeconds / 60)}m {res.timeTakenSeconds % 60}s
                                            </p>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-base font-extrabold text-indigo-400">
                                                {res.score} / {res.totalQuestions}
                                            </div>
                                            <div className="text-xs font-bold text-emerald-400">
                                                {res.percentage}%
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* CREATE AI QUIZ MODAL */}
                {showCreateModal && (
                    <div
                        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <div
                            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-left"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h3 className="font-bold text-base text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-indigo-400" />
                                    Generate AI Quiz
                                </h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Generator Form */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">
                                        Keywords / Topics <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={keywords}
                                        onChange={(e) => setKeywords(e.target.value)}
                                        placeholder="e.g. Data Structures, Linked Lists, Binary Trees"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                                            Difficulty
                                        </label>
                                        <select
                                            value={difficulty}
                                            onChange={(e) => setDifficulty(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                            <option value="mixed">Mixed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                                            Question Count
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={questionCount}
                                            onChange={(e) => setQuestionCount(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                                            Duration (Mins)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="120"
                                            value={timeLimitMinutes}
                                            onChange={(e) => setTimeLimitMinutes(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleGenerateAI}
                                    disabled={isGenerating || !keywords.trim()}
                                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
                                >
                                    <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                                    {isGenerating ? 'Generating 4-Choice Questions...' : 'Generate with AI'}
                                </button>
                            </div>

                            {/* Preview and Save */}
                            {generatedQuestions.length > 0 && (
                                <div className="space-y-3 pt-2 border-t border-slate-800">
                                    <input
                                        type="text"
                                        value={quizTitle}
                                        onChange={(e) => setQuizTitle(e.target.value)}
                                        placeholder="Quiz Title"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                                    />
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <span>{generatedQuestions.length} Questions Ready</span>
                                        <button
                                            onClick={() => setQuizStatus(quizStatus === 'published' ? 'draft' : 'published')}
                                            className="text-xs font-bold text-indigo-400 hover:underline"
                                        >
                                            Status: {quizStatus}
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleSaveGeneratedQuiz}
                                        disabled={isSaving}
                                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow"
                                    >
                                        {isSaving ? 'Publishing...' : 'Save & Publish Quiz'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* SHARE & QR MODAL */}
                {shareQuiz && (
                    <div
                        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShareQuiz(null)}
                    >
                        <div
                            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
                                <QrCode className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-white text-base">
                                {shareQuiz.title}
                            </h3>
                            <p className="text-xs text-slate-400">
                                Scan with phone camera or use link to take from any device.
                            </p>

                            {qrCodeDataUrl && (
                                <div className="bg-white p-3 rounded-2xl inline-block shadow-lg">
                                    <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48 mx-auto rounded-lg" />
                                </div>
                            )}

                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Quiz Code
                                </div>
                                <div className="text-2xl font-mono font-extrabold text-indigo-400 bg-slate-950 py-1.5 px-4 rounded-xl border border-slate-800 inline-block tracking-widest">
                                    {shareQuiz.code}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl text-xs font-mono text-slate-300 border border-slate-800">
                                <span className="truncate flex-1 text-left">{`${window.location.origin}/quiz/join/${shareQuiz.code}`}</span>
                                <button
                                    onClick={handleCopyLink}
                                    className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>

                            <button
                                onClick={() => setShareQuiz(null)}
                                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </AppLayout>
    );
}
