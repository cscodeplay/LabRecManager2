'use client';

import React, { useState, useEffect } from 'react';
import {
    Sparkles, HelpCircle, Plus, Trash2, ArrowUp, ArrowDown, 
    Save, Play, BarChart3, Clock, CheckCircle2, XCircle, 
    ChevronLeft, ChevronRight, Maximize2, Minimize2, X, 
    Share2, QrCode, Copy, Check, Pin, RefreshCw, FileText, 
    SlidersHorizontal, Award, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { quizAPI } from '@/lib/api';

const DEFAULT_OPTIONS = [
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' }
];

export default function WhiteboardQuizSideroll({
    mode = 'closed', // 'closed' | 'partial' | 'full'
    onModeChange,
    currentPage = 0,
    isInstructor = true,
    user,
    attachedQuizzes = [],
    onAttachQuizToPage,
    onDetachQuizFromPage,
    activeTakingQuiz = null,
    onClearActiveTakingQuiz
}) {
    // Top Tabs: 'designer' | 'library' | 'take' | 'results'
    const [activeTab, setActiveTab] = useState(isInstructor ? 'designer' : 'take');

    // Generator Form State
    const [keywords, setKeywords] = useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const [questionCount, setQuestionCount] = useState(5);
    const [timeLimitMinutes, setTimeLimitMinutes] = useState(10);
    const [customInstructions, setCustomInstructions] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStep, setGenerationStep] = useState('');

    // Editor / Current Draft State
    const [quizTitle, setQuizTitle] = useState('');
    const [quizDescription, setQuizDescription] = useState('');
    const [draftQuestions, setDraftQuestions] = useState([]);
    const [quizStatus, setQuizStatus] = useState('published'); // 'published' | 'draft'
    const [isSaving, setIsSaving] = useState(false);
    const [savedQuizId, setSavedQuizId] = useState(null);
    const [savedQuizCode, setSavedQuizCode] = useState(null);

    // Saved Library State
    const [savedQuizzes, setSavedQuizzes] = useState([]);
    const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
    const [libraryFilter, setLibraryFilter] = useState('');

    // Take / Test Drive State
    const [takingQuiz, setTakingQuiz] = useState(null);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [userAnswers, setUserAnswers] = useState({}); // { [questionId]: 'A' | 'B' | 'C' | 'D' }
    const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [testResult, setTestResult] = useState(null); // detailed results

    // Results / Leaderboard Modal / View State
    const [inspectingQuizResults, setInspectingQuizResults] = useState(null);
    const [leaderboardData, setLeaderboardData] = useState(null);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

    // Share / QR Modal State
    const [shareModalQuiz, setShareModalQuiz] = useState(null);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);

    // Synchronize taking quiz if triggered externally from canvas widget
    useEffect(() => {
        if (activeTakingQuiz) {
            handleStartTakingQuiz(activeTakingQuiz);
        }
    }, [activeTakingQuiz]);

    // Fetch library when switching to library tab or when panel opens
    useEffect(() => {
        if (mode !== 'closed' && activeTab === 'library') {
            fetchSavedQuizzes();
        }
    }, [mode, activeTab]);

    // Countdown Timer Effect for Quiz Taking
    useEffect(() => {
        let timer = null;
        if (isTimerRunning && timeLeftSeconds > 0) {
            timer = setInterval(() => {
                setTimeLeftSeconds((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setIsTimerRunning(false);
                        handleAutoSubmitTimeout();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isTimerRunning, timeLeftSeconds]);

    const fetchSavedQuizzes = async () => {
        try {
            setIsLoadingLibrary(true);
            const res = await quizAPI.getAll();
            if (res.data.success) {
                setSavedQuizzes(res.data.data.quizzes || []);
            }
        } catch (err) {
            console.error('Failed to load saved quizzes', err);
            toast.error('Failed to load saved quizzes');
        } finally {
            setIsLoadingLibrary(false);
        }
    };

    // 1. AI Generation Handler
    const handleGenerateAIQuiz = async () => {
        if (!keywords.trim()) {
            toast.error('Please enter keywords or a topic');
            return;
        }

        try {
            setIsGenerating(true);
            setGenerationStep('Analyzing topic & curriculum...');

            const timer1 = setTimeout(() => setGenerationStep('Formulating 4-choice questions...'), 1200);
            const timer2 = setTimeout(() => setGenerationStep('Validating distractors & explanations...'), 2400);

            const res = await quizAPI.generate({
                keywords: keywords.trim(),
                difficulty,
                numberOfQuestions: questionCount,
                timeLimitMinutes,
                customInstructions
            });

            clearTimeout(timer1);
            clearTimeout(timer2);

            if (res.data.success) {
                const data = res.data.data;
                setQuizTitle(`Quiz: ${keywords.trim().slice(0, 40)}`);
                setQuizDescription(`AI Generated quiz on ${keywords.trim()} (${difficulty})`);
                setDraftQuestions(data.questions || []);
                setSavedQuizId(null);
                setSavedQuizCode(null);
                toast.success(`Generated ${data.questions.length} questions! You can now edit, rearrange, or add more.`);
            }
        } catch (err) {
            console.error('AI quiz generation failed', err);
            toast.error(err.response?.data?.message || 'Failed to generate quiz with AI');
        } finally {
            setIsGenerating(false);
            setGenerationStep('');
        }
    };

    // 2. Question Editing & Re-sequencing Handlers
    const resequenceQuestions = (questionsList) => {
        return questionsList.map((q, idx) => ({
            ...q,
            id: idx + 1
        }));
    };

    const handleAddManualQuestion = () => {
        const newQ = {
            id: draftQuestions.length + 1,
            question: '',
            options: [
                { key: 'A', text: '' },
                { key: 'B', text: '' },
                { key: 'C', text: '' },
                { key: 'D', text: '' }
            ],
            correctOption: 'A',
            explanation: '',
            difficulty,
            points: 1
        };
        const updated = [...draftQuestions, newQ];
        setDraftQuestions(resequenceQuestions(updated));
        toast.success(`Question ${updated.length} added`);
    };

    const handleDeleteQuestion = (indexToDelete) => {
        if (draftQuestions.length <= 1) {
            toast.error('Quiz must have at least one question');
            return;
        }
        const updated = draftQuestions.filter((_, idx) => idx !== indexToDelete);
        setDraftQuestions(resequenceQuestions(updated));
        toast.success('Question deleted');
    };

    const handleMoveQuestion = (index, direction) => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= draftQuestions.length) return;

        const updated = [...draftQuestions];
        const [movedItem] = updated.splice(index, 1);
        updated.splice(targetIndex, 0, movedItem);
        setDraftQuestions(resequenceQuestions(updated));
    };

    const handleUpdateQuestionText = (index, text) => {
        setDraftQuestions(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], question: text };
            return copy;
        });
    };

    const handleUpdateOptionText = (questionIndex, optKey, text) => {
        setDraftQuestions(prev => {
            const copy = [...prev];
            const q = copy[questionIndex];
            const updatedOpts = (q.options || DEFAULT_OPTIONS).map(o => 
                o.key === optKey ? { ...o, text } : o
            );
            copy[questionIndex] = { ...q, options: updatedOpts };
            return copy;
        });
    };

    const handleSetCorrectOption = (questionIndex, optKey) => {
        setDraftQuestions(prev => {
            const copy = [...prev];
            copy[questionIndex] = { ...copy[questionIndex], correctOption: optKey };
            return copy;
        });
    };

    const handleUpdateExplanation = (questionIndex, text) => {
        setDraftQuestions(prev => {
            const copy = [...prev];
            copy[questionIndex] = { ...copy[questionIndex], explanation: text };
            return copy;
        });
    };

    // 3. Save & Publish Handlers
    const handleSaveQuiz = async (publishStatus = 'published') => {
        if (!quizTitle.trim()) {
            toast.error('Please enter a quiz title');
            return;
        }
        if (draftQuestions.length === 0) {
            toast.error('Quiz has no questions. Please generate or add questions.');
            return;
        }

        // Validate question content
        const emptyQuestion = draftQuestions.find(q => !q.question.trim());
        if (emptyQuestion) {
            toast.error(`Question ${emptyQuestion.id} has no question text`);
            return;
        }

        try {
            setIsSaving(true);
            const payload = {
                title: quizTitle.trim(),
                description: quizDescription.trim(),
                keywords: keywords.trim(),
                difficulty,
                totalQuestions: draftQuestions.length,
                timeLimitMinutes,
                questions: draftQuestions,
                status: publishStatus
            };

            let res;
            if (savedQuizId) {
                res = await quizAPI.update(savedQuizId, payload);
            } else {
                res = await quizAPI.create(payload);
            }

            if (res.data.success) {
                const quiz = res.data.data;
                setSavedQuizId(quiz.id);
                setSavedQuizCode(quiz.code);
                setQuizStatus(quiz.status);
                toast.success(`Quiz saved successfully! Join Code: ${quiz.code}`);
                fetchSavedQuizzes();
            }
        } catch (err) {
            console.error('Failed to save quiz', err);
            toast.error(err.response?.data?.message || 'Failed to save quiz');
        } finally {
            setIsSaving(false);
        }
    };

    // 4. Attach to Page Handler
    const handleAttachCurrentToPage = () => {
        if (!savedQuizId && draftQuestions.length === 0) {
            toast.error('Please generate or save a quiz first');
            return;
        }

        const quizToAttach = {
            id: savedQuizId || `local-${Date.now()}`,
            code: savedQuizCode || 'LOCAL',
            title: quizTitle || `Quiz: ${keywords}`,
            difficulty,
            totalQuestions: draftQuestions.length,
            timeLimitMinutes,
            questions: draftQuestions,
            status: quizStatus,
            x: 50,
            y: 50
        };

        if (onAttachQuizToPage) {
            onAttachQuizToPage(quizToAttach, currentPage);
            toast.success(`Quiz attached to Page ${currentPage + 1}!`);
        }
    };

    // 5. Test Drive / Take Mode Handlers
    const handleStartTakingQuiz = async (quiz) => {
        try {
            setTakingQuiz(quiz);
            setActiveTab('take');
            setCurrentQuestionIdx(0);
            setUserAnswers({});
            setTestResult(null);

            const durationSec = (quiz.timeLimitMinutes || 10) * 60;
            setTimeLeftSeconds(durationSec);
            setIsTimerRunning(true);
            toast.success(`Started Quiz: ${quiz.title}`);
        } catch (err) {
            console.error('Failed to start quiz', err);
            toast.error('Failed to initialize quiz');
        }
    };

    const handleSelectAnswer = (questionId, optKey) => {
        setUserAnswers(prev => ({
            ...prev,
            [questionId]: optKey
        }));
    };

    const handleAutoSubmitTimeout = () => {
        toast('Time is up! Auto-submitting quiz...', { icon: '⏰' });
        handleSubmitQuiz(true);
    };

    const handleSubmitQuiz = async (isTimeout = false) => {
        if (!takingQuiz) return;

        try {
            setIsSubmitting(true);
            setIsTimerRunning(false);

            const formattedAnswers = Object.entries(userAnswers).map(([qId, opt]) => ({
                questionId: parseInt(qId) || qId,
                selectedOption: opt
            }));

            const durationTaken = Math.max(0, ((takingQuiz.timeLimitMinutes || 10) * 60) - timeLeftSeconds);

            // If taking a saved quiz with ID, submit to API
            if (takingQuiz.id && !takingQuiz.id.startsWith('local-')) {
                const res = await quizAPI.submit(takingQuiz.id, {
                    answers: formattedAnswers,
                    timeTakenSeconds: durationTaken,
                    isTimedOut: Boolean(isTimeout)
                });

                if (res.data.success) {
                    setTestResult(res.data.data);
                    toast.success(`Quiz completed! Score: ${res.data.data.score}/${res.data.data.totalQuestions}`);
                }
            } else {
                // Local test grading fallback
                let correctCount = 0;
                const detailed = (takingQuiz.questions || []).map(q => {
                    const selected = userAnswers[q.id];
                    const isCorrect = selected === q.correctOption;
                    if (isCorrect) correctCount++;
                    return {
                        questionId: q.id,
                        questionText: q.question,
                        selectedOption: selected,
                        correctOption: q.correctOption,
                        isCorrect,
                        explanation: q.explanation
                    };
                });

                const total = takingQuiz.questions.length;
                const score = correctCount;
                const percentage = total > 0 ? Number(((score / total) * 100).toFixed(1)) : 0;

                setTestResult({
                    score,
                    totalQuestions: total,
                    percentage,
                    correctAnswers: correctCount,
                    timeTakenSeconds: durationTaken,
                    answers: detailed,
                    isTimedOut: isTimeout
                });
                toast.success(`Local quiz graded! Score: ${score}/${total}`);
            }
        } catch (err) {
            console.error('Failed to submit quiz', err);
            toast.error(err.response?.data?.message || 'Failed to submit quiz');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 6. Leaderboard & Results View
    const handleViewLeaderboard = async (quiz) => {
        try {
            setInspectingQuizResults(quiz);
            setActiveTab('results');
            setIsLoadingLeaderboard(true);
            const res = await quizAPI.getResults(quiz.id || quiz.code);
            if (res.data.success) {
                setLeaderboardData(res.data.data);
            }
        } catch (err) {
            console.error('Failed to load leaderboard', err);
            toast.error('Failed to load quiz results');
        } finally {
            setIsLoadingLeaderboard(false);
        }
    };

    // 7. Share & QR Code Helper
    const handleOpenShare = async (quiz) => {
        try {
            setShareModalQuiz(quiz);
            const url = `${window.location.origin}/quiz/join/${quiz.code || quiz.id}`;
            const qr = await QRCode.toDataURL(url, { width: 220, margin: 2 });
            setQrCodeDataUrl(qr);
        } catch (err) {
            console.error('QR code generation error', err);
        }
    };

    const handleCopyShareLink = () => {
        if (!shareModalQuiz) return;
        const url = `${window.location.origin}/quiz/join/${shareModalQuiz.code || shareModalQuiz.id}`;
        navigator.clipboard.writeText(url);
        setLinkCopied(true);
        toast.success('Link copied!');
        setTimeout(() => setLinkCopied(false), 2000);
    };

    if (mode === 'closed') {
        return null;
    }

    const formatTimer = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const panelWidthStyle = mode === 'full' 
        ? 'w-full max-w-full' 
        : 'w-[440px] max-w-[460px] min-w-[380px]';

    return (
        <aside
            className={`${panelWidthStyle} h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 text-slate-100 flex flex-col z-40 transition-all duration-300 shadow-2xl relative select-none`}
        >
            {/* Top Bar Header */}
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-2 flex-shrink-0 bg-slate-950/60">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                        <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                            AI Quiz Hub
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                {isInstructor ? 'Instructor' : 'Student'}
                            </span>
                        </h3>
                        <p className="text-[11px] text-slate-400 truncate">
                            Attached to Page {currentPage + 1}
                        </p>
                    </div>
                </div>

                {/* Sideroll Controls: Partial, Full, Close */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onModeChange(mode === 'full' ? 'partial' : 'full')}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                        title={mode === 'full' ? 'Split View' : 'Full Screen'}
                    >
                        {mode === 'full' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => onModeChange('closed')}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition"
                        title="Close Sideroll"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-slate-800 px-3 py-1.5 gap-1 bg-slate-900/60 text-xs flex-shrink-0 overflow-x-auto">
                {isInstructor && (
                    <button
                        onClick={() => setActiveTab('designer')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'designer'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Designer
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('library')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'library'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                >
                    <FileText className="w-3.5 h-3.5" />
                    Saved Library
                </button>
                <button
                    onClick={() => {
                        if (!takingQuiz && draftQuestions.length > 0) {
                            handleStartTakingQuiz({
                                title: quizTitle || 'Draft Test',
                                difficulty,
                                timeLimitMinutes,
                                questions: draftQuestions
                            });
                        } else {
                            setActiveTab('take');
                        }
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                        activeTab === 'take'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                >
                    <Play className="w-3.5 h-3.5" />
                    Take Test
                </button>
                {inspectingQuizResults && (
                    <button
                        onClick={() => setActiveTab('results')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'results'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                    >
                        <BarChart3 className="w-3.5 h-3.5" />
                        Results
                    </button>
                )}
            </div>

            {/* TAB CONTENT CONTAINER */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">

                {/* TAB 1: DESIGNER (AI GENERATOR + QUESTION EDITOR) */}
                {activeTab === 'designer' && (
                    <div className="space-y-4">
                        {/* 1. Generator Parameters Box */}
                        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    AI Generator Controls
                                </span>
                                <span className="text-[11px] text-slate-400">Gemini / Groq Engine</span>
                            </div>

                            {/* Keywords Input (Crucial User Requirement) */}
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Keywords / Topics <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={keywords}
                                    onChange={(e) => setKeywords(e.target.value)}
                                    placeholder="e.g. Photosynthesis, Cellular Respiration, ATP"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            {/* Difficulty, Questions, Time Grid */}
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                                        Difficulty
                                    </label>
                                    <select
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                        <option value="mixed">Mixed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                                        Questions
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="30"
                                        value={questionCount}
                                        onChange={(e) => setQuestionCount(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                                        Time (Mins)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="120"
                                        value={timeLimitMinutes}
                                        onChange={(e) => setTimeLimitMinutes(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerateAIQuiz}
                                disabled={isGenerating || !keywords.trim()}
                                className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                                        <span>{generationStep || 'Generating Questions...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Generate 4-Choice Questions
                                    </>
                                )}
                            </button>
                        </div>

                        {/* 2. Current Quiz Header & Global Actions */}
                        {draftQuestions.length > 0 && (
                            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-3.5 space-y-3">
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={quizTitle}
                                        onChange={(e) => setQuizTitle(e.target.value)}
                                        placeholder="Quiz Title"
                                        className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                                    />
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setQuizStatus(quizStatus === 'published' ? 'draft' : 'published')}
                                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition ${
                                                quizStatus === 'published'
                                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                            }`}
                                        >
                                            {quizStatus === 'published' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                            {quizStatus === 'published' ? 'Published (Students Can Join)' : 'Draft (Hidden from Students)'}
                                        </button>
                                        {savedQuizCode && (
                                            <span className="text-[11px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                                                Code: {savedQuizCode}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Main Action Buttons */}
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <button
                                        onClick={() => handleSaveQuiz(quizStatus)}
                                        disabled={isSaving}
                                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-1.5"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        {isSaving ? 'Saving...' : 'Save Quiz'}
                                    </button>

                                    <button
                                        onClick={handleAttachCurrentToPage}
                                        className="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-1.5"
                                        title="Attach this interactive quiz to the current whiteboard page"
                                    >
                                        <Pin className="w-3.5 h-3.5" />
                                        Attach to Page {currentPage + 1}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 3. Question Cards List (Editable, Re-orderable, Deletable) */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                    Questions ({draftQuestions.length})
                                </h4>
                                <button
                                    onClick={handleAddManualQuestion}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Question
                                </button>
                            </div>

                            {draftQuestions.map((q, idx) => (
                                <div
                                    key={q.id || idx}
                                    className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 space-y-3 transition-all hover:border-slate-600"
                                >
                                    {/* Question Header & Order Buttons */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow">
                                                {q.id}
                                            </span>
                                            <span className="text-[11px] text-slate-400 font-medium">
                                                Question #{q.id}
                                            </span>
                                        </div>

                                        {/* Move Up / Down & Delete */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleMoveQuestion(idx, 'up')}
                                                disabled={idx === 0}
                                                className="p-1 hover:bg-slate-700 disabled:opacity-30 text-slate-400 hover:text-white rounded transition"
                                                title="Move Question Up"
                                            >
                                                <ArrowUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleMoveQuestion(idx, 'down')}
                                                disabled={idx === draftQuestions.length - 1}
                                                className="p-1 hover:bg-slate-700 disabled:opacity-30 text-slate-400 hover:text-white rounded transition"
                                                title="Move Question Down"
                                            >
                                                <ArrowDown className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQuestion(idx)}
                                                className="p-1 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 rounded transition"
                                                title="Delete Question"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Question Textarea */}
                                    <textarea
                                        rows={2}
                                        value={q.question}
                                        onChange={(e) => handleUpdateQuestionText(idx, e.target.value)}
                                        placeholder="Enter question statement..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                                    />

                                    {/* 4 Choices (A, B, C, D) */}
                                    <div className="space-y-1.5">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            4 Choices (Select radio button for Correct Answer)
                                        </div>
                                        {['A', 'B', 'C', 'D'].map((optKey) => {
                                            const optObj = (q.options || []).find(o => o.key === optKey) || { key: optKey, text: '' };
                                            const isCorrect = q.correctOption === optKey;
                                            return (
                                                <div
                                                    key={optKey}
                                                    className={`flex items-center gap-2 p-1.5 rounded-xl border transition ${
                                                        isCorrect
                                                            ? 'bg-emerald-950/40 border-emerald-500/50'
                                                            : 'bg-slate-900/60 border-slate-700/60'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`correct-${q.id}`}
                                                        checked={isCorrect}
                                                        onChange={() => handleSetCorrectOption(idx, optKey)}
                                                        className="w-3.5 h-3.5 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                                                        title="Mark as Correct Answer"
                                                    />
                                                    <span className={`w-5 h-5 rounded font-bold text-xs flex items-center justify-center font-mono ${
                                                        isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                                                    }`}>
                                                        {optKey}
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={optObj.text}
                                                        onChange={(e) => handleUpdateOptionText(idx, optKey, e.target.value)}
                                                        placeholder={`Option ${optKey}`}
                                                        className="flex-1 bg-transparent text-xs text-white focus:outline-none"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Explanation Field */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                            Explanation for Students
                                        </label>
                                        <input
                                            type="text"
                                            value={q.explanation || ''}
                                            onChange={(e) => handleUpdateExplanation(idx, e.target.value)}
                                            placeholder="Why is this answer correct?"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB 2: SAVED QUIZ LIBRARY */}
                {activeTab === 'library' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                Saved Quizzes
                            </h4>
                            <button
                                onClick={fetchSavedQuizzes}
                                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
                                title="Refresh List"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLibrary ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* Search in library */}
                        <input
                            type="text"
                            value={libraryFilter}
                            onChange={(e) => setLibraryFilter(e.target.value)}
                            placeholder="Filter by title or topic..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />

                        {isLoadingLibrary ? (
                            <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
                                Loading saved quizzes...
                            </div>
                        ) : savedQuizzes.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-500">
                                No saved quizzes found. Use the Designer tab to create one!
                            </div>
                        ) : (
                            savedQuizzes
                                .filter(q => !libraryFilter || q.title.toLowerCase().includes(libraryFilter.toLowerCase()) || (q.keywords && q.keywords.toLowerCase().includes(libraryFilter.toLowerCase())))
                                .map((q) => (
                                    <div
                                        key={q.id}
                                        className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 space-y-2.5 hover:border-slate-600 transition shadow-md"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                                        q.status === 'published'
                                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                    }`}>
                                                        {q.status}
                                                    </span>
                                                    <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                                        {q.code}
                                                    </span>
                                                </div>
                                                <h5 className="font-bold text-xs text-white">
                                                    {q.title}
                                                </h5>
                                                <p className="text-[11px] text-slate-400 truncate">
                                                    {q.totalQuestions} Questions • {q.timeLimitMinutes} Mins • {q.difficulty}
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => handleOpenShare(q)}
                                                className="p-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                                                title="Share & QR Code"
                                            >
                                                <Share2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                                            <button
                                                onClick={() => {
                                                    if (onAttachQuizToPage) {
                                                        onAttachQuizToPage(q, currentPage);
                                                        toast.success(`Attached "${q.title}" to Page ${currentPage + 1}!`);
                                                    }
                                                }}
                                                className="py-1.5 px-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition"
                                                title="Attach to currently active page"
                                            >
                                                <Pin className="w-3 h-3" />
                                                Attach P.{currentPage + 1}
                                            </button>

                                            <button
                                                onClick={() => handleStartTakingQuiz(q)}
                                                className="py-1.5 px-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition"
                                            >
                                                <Play className="w-3 h-3 fill-current" />
                                                Take
                                            </button>

                                            <button
                                                onClick={() => handleViewLeaderboard(q)}
                                                className="py-1.5 px-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition"
                                            >
                                                <BarChart3 className="w-3 h-3" />
                                                Results
                                            </button>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                )}

                {/* TAB 3: TAKE / TEST DRIVE QUIZ */}
                {activeTab === 'take' && (
                    <div className="space-y-4">
                        {!takingQuiz ? (
                            <div className="text-center py-10 space-y-3">
                                <HelpCircle className="w-10 h-10 text-slate-600 mx-auto" />
                                <p className="text-xs text-slate-400">
                                    No quiz currently loaded for taking.
                                </p>
                                <button
                                    onClick={() => setActiveTab('library')}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow"
                                >
                                    Choose from Saved Library
                                </button>
                            </div>
                        ) : testResult ? (
                            /* SCORECARD & RESULT REVIEW */
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-500/40 rounded-2xl p-4 text-center space-y-2 shadow-xl">
                                    <Award className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
                                    <h4 className="text-sm font-bold text-white">Quiz Completed!</h4>
                                    <p className="text-xs text-slate-300 font-mono">
                                        Participant Login ID: {user?.id?.slice(0, 8) || 'Current User'}
                                    </p>
                                    <div className="text-3xl font-extrabold text-white">
                                        {testResult.score} / {testResult.totalQuestions}
                                    </div>
                                    <div className="text-xs font-bold text-emerald-400">
                                        Score: {testResult.percentage}%
                                    </div>
                                    <div className="text-[11px] text-slate-400">
                                        Time Spent: {Math.floor(testResult.timeTakenSeconds / 60)}m {testResult.timeTakenSeconds % 60}s
                                    </div>
                                </div>

                                {/* Question-by-Question Review */}
                                <div className="space-y-3">
                                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                        Answer Review & Explanations
                                    </h5>
                                    {(testResult.answers || []).map((ans, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                                                ans.isCorrect
                                                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                                                    : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between font-bold">
                                                <span>Q{idx + 1}: {ans.questionText || `Question ${idx + 1}`}</span>
                                                {ans.isCorrect ? (
                                                    <span className="flex items-center gap-1 text-emerald-400">
                                                        <CheckCircle2 className="w-4 h-4" /> Correct
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-rose-400">
                                                        <XCircle className="w-4 h-4" /> Incorrect
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-slate-300">
                                                Your Choice: <strong className="font-mono">{ans.selectedOption || 'None'}</strong> • Correct: <strong className="font-mono text-emerald-400">{ans.correctOption}</strong>
                                            </div>
                                            {ans.explanation && (
                                                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-xl mt-1">
                                                    💡 {ans.explanation}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => {
                                        setTestResult(null);
                                        setTakingQuiz(null);
                                        setActiveTab('library');
                                    }}
                                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                                >
                                    Back to Library
                                </button>
                            </div>
                        ) : (
                            /* ACTIVE TIMED QUESTION PLAYER */
                            <div className="space-y-4">
                                {/* Timer Bar */}
                                <div className={`flex items-center justify-between p-3 rounded-2xl border ${
                                    timeLeftSeconds < 60
                                        ? 'bg-rose-950/60 border-rose-500 text-rose-300 animate-pulse'
                                        : 'bg-slate-800/80 border-slate-700 text-white'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-indigo-400" />
                                        <span className="text-xs font-bold">Time Left:</span>
                                    </div>
                                    <div className="font-mono font-extrabold text-base">
                                        {formatTimer(timeLeftSeconds)}
                                    </div>
                                </div>

                                {/* Active Question Card */}
                                {takingQuiz.questions && takingQuiz.questions[currentQuestionIdx] && (() => {
                                    const currentQ = takingQuiz.questions[currentQuestionIdx];
                                    const currentAnswer = userAnswers[currentQ.id];

                                    return (
                                        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 space-y-3 shadow-lg">
                                            <div className="flex items-center justify-between text-xs text-slate-400">
                                                <span className="font-bold text-indigo-400">
                                                    Question {currentQuestionIdx + 1} of {takingQuiz.questions.length}
                                                </span>
                                                <span className="bg-slate-900 px-2 py-0.5 rounded text-[11px]">
                                                    {currentQ.difficulty || 'Medium'}
                                                </span>
                                            </div>

                                            <h4 className="text-sm font-bold text-white">
                                                {currentQ.question}
                                            </h4>

                                            {/* 4 Choices */}
                                            <div className="space-y-2 pt-1">
                                                {(currentQ.options || []).map((opt) => {
                                                    const isSelected = currentAnswer === opt.key;
                                                    return (
                                                        <button
                                                            key={opt.key}
                                                            onClick={() => handleSelectAnswer(currentQ.id, opt.key)}
                                                            className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium transition flex items-center gap-3 ${
                                                                isSelected
                                                                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                                                                    : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                                                            }`}
                                                        >
                                                            <span className={`w-6 h-6 rounded-lg font-bold font-mono text-xs flex items-center justify-center flex-shrink-0 ${
                                                                isSelected ? 'bg-white text-indigo-700' : 'bg-slate-800 text-slate-400'
                                                            }`}>
                                                                {opt.key}
                                                            </span>
                                                            <span className="flex-1">{opt.text}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Question Pagination */}
                                            <div className="flex items-center justify-between pt-2">
                                                <button
                                                    onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                                                    disabled={currentQuestionIdx === 0}
                                                    className="py-1.5 px-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition"
                                                >
                                                    Previous
                                                </button>

                                                {currentQuestionIdx < takingQuiz.questions.length - 1 ? (
                                                    <button
                                                        onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                                                        className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
                                                    >
                                                        Next
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSubmitQuiz(false)}
                                                        disabled={isSubmitting}
                                                        className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg transition"
                                                    >
                                                        {isSubmitting ? 'Grading...' : 'Submit Quiz'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: LEADERBOARD & SUBMISSIONS */}
                {activeTab === 'results' && inspectingQuizResults && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-bold text-white">
                                    {inspectingQuizResults.title}
                                </h4>
                                <p className="text-[11px] text-slate-400">
                                    Participant Leaderboard & Scores
                                </p>
                            </div>
                            <button
                                onClick={() => handleViewLeaderboard(inspectingQuizResults)}
                                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLeaderboard ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {isLoadingLeaderboard ? (
                            <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
                                Loading submissions...
                            </div>
                        ) : !leaderboardData || leaderboardData.submissions.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-500">
                                No student submissions recorded yet. Share the quiz code to invite participants!
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Summary Metrics */}
                                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700">
                                    <div>
                                        <div className="text-slate-400 text-[10px]">Total Submissions</div>
                                        <div className="font-extrabold text-white">{leaderboardData.summary.totalParticipants}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400 text-[10px]">Avg Score</div>
                                        <div className="font-extrabold text-indigo-400">{leaderboardData.summary.avgScore}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400 text-[10px]">Top Score</div>
                                        <div className="font-extrabold text-emerald-400">{leaderboardData.summary.highestScore}</div>
                                    </div>
                                </div>

                                {/* Participants Table */}
                                <div className="space-y-1.5">
                                    {leaderboardData.submissions.map((sub) => (
                                        <div
                                            key={sub.id}
                                            className="bg-slate-800/70 border border-slate-700/70 rounded-xl p-2.5 flex items-center justify-between text-xs"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`w-6 h-6 rounded-lg font-bold font-mono text-[11px] flex items-center justify-center ${
                                                    sub.rank === 1 ? 'bg-amber-500 text-white' : sub.rank === 2 ? 'bg-slate-300 text-slate-900' : 'bg-slate-700 text-slate-300'
                                                }`}>
                                                    #{sub.rank}
                                                </span>
                                                <div className="truncate">
                                                    <div className="font-bold text-white truncate">{sub.userName}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono truncate">{sub.userEmail || sub.userId}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-emerald-400">{sub.score}/{sub.totalQuestions} ({sub.percentage}%)</div>
                                                <div className="text-[10px] text-slate-400">{sub.timeTakenSeconds}s</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Share / QR Code Modal */}
            {shareModalQuiz && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-default"
                    onClick={() => setShareModalQuiz(null)}
                >
                    <div
                        className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-5 text-center shadow-2xl space-y-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
                            <QrCode className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-white text-sm">
                            {shareModalQuiz.title}
                        </h4>
                        <p className="text-xs text-slate-400">
                            Scan with phone or open link to join from other devices.
                        </p>

                        {qrCodeDataUrl && (
                            <div className="bg-white p-3 rounded-2xl inline-block shadow-lg">
                                <img src={qrCodeDataUrl} alt="QR Code" className="w-44 h-44 mx-auto rounded" />
                            </div>
                        )}

                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Quiz Join Code
                            </div>
                            <div className="text-2xl font-mono font-extrabold text-indigo-400 bg-slate-950 py-1.5 px-4 rounded-xl border border-slate-800 inline-block">
                                {shareModalQuiz.code}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl text-xs font-mono text-slate-300 border border-slate-800">
                            <span className="truncate flex-1 text-left">{`${window.location.origin}/quiz/join/${shareModalQuiz.code}`}</span>
                            <button
                                onClick={handleCopyShareLink}
                                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
                            >
                                {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>

                        <button
                            onClick={() => setShareModalQuiz(null)}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </aside>
    );
}
