'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    HelpCircle, CheckCircle2, XCircle, Clock, Zap, Award, 
    Play, RotateCcw, BarChart3, Users, ChevronRight, Sparkles, 
    Check, X, Plus, Trash2, ArrowRight, History, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_OPTIONS = [
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' }
];

const createEmptyQuestion = (index) => ({
    id: `q-${Date.now()}-${index}`,
    question: '',
    options: [
        { key: 'A', text: '' },
        { key: 'B', text: '' },
        { key: 'C', text: '' },
        { key: 'D', text: '' }
    ],
    correctOption: 'A',
    timeLimit: 30,
    isEnded: false
});

export default function LiveMeetingQuiz({
    socket,
    roomId,
    user,
    isHost,
    activeQuiz,
    setActiveQuiz,
    quizResponses,
    setQuizResponses,
    quizDrafts,
    setQuizDrafts
}) {
    // Multi-Question State for Host (persisted in quizDrafts or fallback)
    const [questions, setQuestions] = useState(() => {
        if (quizDrafts && quizDrafts.length > 0) return quizDrafts;
        return [createEmptyQuestion(1)];
    });
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

    // Sync draft updates to parent state
    useEffect(() => {
        if (setQuizDrafts) {
            setQuizDrafts(questions);
        }
    }, [questions, setQuizDrafts]);

    // Student Selection & Timer State
    const [timeLeft, setTimeLeft] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [myResponseTime, setMyResponseTime] = useState(null);

    // Question History Mode (to review past questions in session)
    const [viewingHistoryQuizId, setViewingHistoryQuizId] = useState(null);

    // Current editing question for host
    const currentEditQ = questions[activeQuestionIndex] || questions[0] || createEmptyQuestion(1);

    // Sync countdown timer with active quiz
    useEffect(() => {
        if (!activeQuiz || !activeQuiz.startedAt || activeQuiz.isEnded) {
            setTimeLeft(0);
            return;
        }

        const calcTimeLeft = () => {
            const elapsedSec = Math.floor((Date.now() - new Date(activeQuiz.startedAt).getTime()) / 1000);
            const remaining = Math.max(0, (activeQuiz.timeLimit || 30) - elapsedSec);
            return remaining;
        };

        setTimeLeft(calcTimeLeft());

        const timer = setInterval(() => {
            const rem = calcTimeLeft();
            setTimeLeft(rem);
            if (rem <= 0) {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [activeQuiz]);

    // Reset local student selection when activeQuiz changes
    useEffect(() => {
        if (activeQuiz?.id) {
            const existing = (quizResponses[activeQuiz.id] || []).find(r => r.userId === user?.id);
            if (existing) {
                setSelectedOption(existing.selectedOption);
                setHasSubmitted(true);
                setMyResponseTime(existing.responseTime);
            } else {
                setSelectedOption(null);
                setHasSubmitted(false);
                setMyResponseTime(null);
            }
        }
    }, [activeQuiz?.id, quizResponses, user?.id]);

    // Multi-Question Host Actions
    const handleAddQuestion = () => {
        const newQ = createEmptyQuestion(questions.length + 1);
        setQuestions(prev => [...prev, newQ]);
        setActiveQuestionIndex(questions.length);
        toast.success(`Question ${questions.length + 1} added to draft`);
    };

    const handleDeleteQuestion = (idxToDelete) => {
        if (questions.length <= 1) {
            toast.error('At least one question is required');
            return;
        }
        setQuestions(prev => prev.filter((_, i) => i !== idxToDelete));
        setActiveQuestionIndex(prev => (prev >= idxToDelete ? Math.max(0, prev - 1) : prev));
        toast('Question removed from draft');
    };

    const handleUpdateCurrentQuestion = (updates) => {
        setQuestions(prev => {
            const next = [...prev];
            next[activeQuestionIndex] = { ...next[activeQuestionIndex], ...updates };
            return next;
        });
    };

    const handleUpdateOptionText = (optKey, text) => {
        const currOpts = currentEditQ.options || DEFAULT_OPTIONS;
        const newOpts = currOpts.map(o => o.key === optKey ? { ...o, text } : o);
        handleUpdateCurrentQuestion({ options: newOpts });
    };

    // Host: Launch Selected Question
    const handleLaunchQuestion = (targetQ = currentEditQ) => {
        if (!targetQ.question.trim()) {
            toast.error('Please enter the question statement');
            return;
        }
        if (targetQ.options.some(opt => !opt.text.trim())) {
            toast.error('Please fill out all 4 options (A, B, C, D)');
            return;
        }

        const newQuiz = {
            id: targetQ.id || `quiz-${Date.now()}`,
            questionIndex: activeQuestionIndex + 1,
            totalQuestions: questions.length,
            question: targetQ.question.trim(),
            options: targetQ.options.map(o => ({ key: o.key, text: o.text.trim() })),
            correctOption: targetQ.correctOption || 'A',
            timeLimit: parseInt(targetQ.timeLimit || 30, 10),
            startedAt: new Date().toISOString(),
            hostName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Instructor',
            isEnded: false
        };

        if (socket) {
            socket.emit('meeting:quiz-start', {
                roomId,
                quiz: newQuiz
            });
        }

        setActiveQuiz(newQuiz);
        setQuizResponses(prev => ({ ...prev, [newQuiz.id]: [] }));
        setViewingHistoryQuizId(null);
        toast.success(`🚀 Launched Q${activeQuestionIndex + 1} (${activeQuestionIndex + 1}/${questions.length}) to class!`);
    };

    // Host: End Question
    const handleEndQuestion = () => {
        if (!activeQuiz) return;
        const endedQuiz = { ...activeQuiz, isEnded: true };
        if (socket) {
            socket.emit('meeting:quiz-end', {
                roomId,
                quizId: activeQuiz.id,
                summary: endedQuiz
            });
        }
        setActiveQuiz(endedQuiz);
        toast('Live question closed. Leaderboard revealed!');
    };

    // Student: Submit Answer
    const handleSelectOption = (optKey) => {
        if (hasSubmitted || timeLeft <= 0 || activeQuiz?.isEnded) return;

        const startMs = new Date(activeQuiz.startedAt).getTime();
        const diffMs = Math.max(100, Date.now() - startMs);
        const timeInSec = (diffMs / 1000).toFixed(1);

        const responsePayload = {
            quizId: activeQuiz.id,
            userId: user?.id || `user-${Date.now()}`,
            userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Student',
            userAvatar: user?.avatarUrl || null,
            selectedOption: optKey,
            isCorrect: optKey === activeQuiz.correctOption,
            responseTimeSec: parseFloat(timeInSec),
            responseTime: `${timeInSec}s`,
            submittedAt: new Date().toISOString()
        };

        setSelectedOption(optKey);
        setHasSubmitted(true);
        setMyResponseTime(`${timeInSec}s`);

        if (socket) {
            socket.emit('meeting:quiz-answer', {
                roomId,
                answer: responsePayload
            });
        }

        setQuizResponses(prev => {
            const list = prev[activeQuiz.id] || [];
            if (list.some(r => r.userId === responsePayload.userId)) return prev;
            return {
                ...prev,
                [activeQuiz.id]: [...list, responsePayload]
            };
        });

        toast.success(`Answer [${optKey}] submitted in ${timeInSec}s!`);
    };

    // Active Quiz or Selected History Quiz
    const displayQuiz = activeQuiz;
    const currentResponses = useMemo(() => {
        if (!displayQuiz?.id) return [];
        return quizResponses[displayQuiz.id] || [];
    }, [displayQuiz?.id, quizResponses]);

    // Leaderboard sorted by response time from MIN to MAX (Fastest finger first)
    const sortedResponses = useMemo(() => {
        return [...currentResponses].sort((a, b) => {
            if (a.isCorrect && !b.isCorrect) return -1;
            if (!a.isCorrect && b.isCorrect) return 1;
            return (a.responseTimeSec || 999) - (b.responseTimeSec || 999);
        });
    }, [currentResponses]);

    // Calculate percentage breakdown for options A, B, C, D
    const optionStats = useMemo(() => {
        const total = currentResponses.length;
        const counts = { A: 0, B: 0, C: 0, D: 0 };
        currentResponses.forEach(r => {
            if (counts[r.selectedOption] !== undefined) {
                counts[r.selectedOption]++;
            }
        });
        return ['A', 'B', 'C', 'D'].map(key => ({
            key,
            count: counts[key] || 0,
            percentage: total === 0 ? 0 : Math.round((counts[key] / total) * 100)
        }));
    }, [currentResponses]);

    const isQuizOver = displayQuiz && (timeLeft <= 0 || displayQuiz.isEnded);

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 text-slate-100 text-xs select-none">
            {/* Active Quiz Running Mode */}
            {displayQuiz && (!displayQuiz.isEnded || !isHost) ? (
                <div className="flex-1 flex flex-col overflow-y-auto p-3.5 space-y-3.5">
                    {/* Quiz Top Status Card */}
                    <div className="p-3 bg-gradient-to-r from-indigo-900/80 via-slate-800 to-violet-900/80 rounded-xl border border-indigo-500/30 shadow-md flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                                <Zap className="w-4 h-4 text-amber-400" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                                    {isQuizOver ? 'Question Ended' : 'Live Question Active'}
                                </span>
                                <span className="text-[11px] text-slate-300 font-medium">
                                    {displayQuiz.questionIndex ? `Q${displayQuiz.questionIndex} of ${displayQuiz.totalQuestions || questions.length} • ` : ''}
                                    {currentResponses.length} answered
                                </span>
                            </div>
                        </div>

                        {/* Live Timer Pill */}
                        <div className={`px-2.5 py-1 rounded-full font-mono font-bold text-xs flex items-center gap-1.5 border shadow-sm ${
                            timeLeft > 5 
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                                : timeLeft > 0 
                                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{timeLeft > 0 ? `${timeLeft}s` : 'Time Up'}</span>
                        </div>
                    </div>

                    {/* Question Statement */}
                    <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700/80 shadow-sm">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1 flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" /> Question
                        </div>
                        <h4 className="text-sm font-semibold text-white leading-relaxed">
                            {displayQuiz.question}
                        </h4>
                    </div>

                    {/* Options List */}
                    <div className="space-y-2">
                        {displayQuiz.options.map((opt) => {
                            const isSelected = selectedOption === opt.key;
                            const isCorrect = opt.key === displayQuiz.correctOption;
                            const showSolution = isQuizOver;
                            const stat = optionStats.find(s => s.key === opt.key);

                            let borderBg = 'bg-slate-800/80 border-slate-700 hover:border-indigo-500/60 text-slate-200';
                            if (showSolution) {
                                if (isCorrect) {
                                    borderBg = 'bg-emerald-950/60 border-emerald-500/70 text-emerald-200 font-semibold shadow-emerald-950/20';
                                } else if (isSelected && !isCorrect) {
                                    borderBg = 'bg-rose-950/60 border-rose-500/70 text-rose-200';
                                }
                            } else if (isSelected) {
                                borderBg = 'bg-indigo-950/80 border-indigo-500 text-indigo-200 font-medium shadow-indigo-950/40 ring-1 ring-indigo-500';
                            }

                            return (
                                <div
                                    key={opt.key}
                                    onClick={() => !isHost && !hasSubmitted && timeLeft > 0 && handleSelectOption(opt.key)}
                                    className={`relative p-3 rounded-xl border transition-all flex flex-col gap-1.5 overflow-hidden ${borderBg} ${
                                        !isHost && !hasSubmitted && timeLeft > 0 ? 'cursor-pointer active:scale-[0.99]' : ''
                                    }`}
                                >
                                    {/* Vote Percentage Progress Bar */}
                                    {showSolution && (
                                        <div
                                            className={`absolute left-0 top-0 bottom-0 opacity-25 transition-all duration-700 ${
                                                isCorrect ? 'bg-emerald-500' : 'bg-slate-500'
                                            }`}
                                            style={{ width: `${stat?.percentage || 0}%` }}
                                        />
                                    )}

                                    <div className="relative z-10 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <span className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border ${
                                                showSolution && isCorrect
                                                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                                    : showSolution && isSelected && !isCorrect
                                                        ? 'bg-rose-500 text-white border-rose-400'
                                                        : isSelected
                                                            ? 'bg-indigo-500 text-white border-indigo-400'
                                                            : 'bg-slate-700/80 text-slate-300 border-slate-600'
                                            }`}>
                                                {opt.key}
                                            </span>
                                            <span className="text-[12px] font-medium leading-snug">{opt.text}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {showSolution && isCorrect && (
                                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/30">
                                                    <Check className="w-3 h-3" /> Correct
                                                </span>
                                            )}
                                            {showSolution && isSelected && !isCorrect && (
                                                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-500/30">
                                                    <X className="w-3 h-3" /> Your Choice
                                                </span>
                                            )}
                                            {showSolution && (
                                                <span className="text-[11px] font-mono text-slate-400 font-semibold">
                                                    {stat?.percentage}% ({stat?.count})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Student Status Feedback */}
                    {!isHost && (
                        <div className="p-2.5 rounded-xl border border-slate-800 text-center text-xs bg-slate-800/40">
                            {hasSubmitted ? (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-semibold">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Answer Submitted in {myResponseTime}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400">
                                        {isQuizOver ? 'Full leaderboard revealed below' : 'Waiting for timer to expire to reveal solutions...'}
                                    </p>
                                </div>
                            ) : timeLeft > 0 ? (
                                <p className="text-amber-400 font-medium animate-pulse">
                                    ⚡ Click an option above before timer runs out!
                                </p>
                            ) : (
                                <p className="text-slate-400">
                                    ⏳ Time is up for this question.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Leaderboard Table (Sorted Min to Max) */}
                    <div className="pt-2 border-t border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <h5 className="font-bold text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-amber-400" />
                                Live Class Submissions ({currentResponses.length})
                            </h5>
                            <span className="text-[10px] text-slate-500">
                                Sorted by fastest time ⚡
                            </span>
                        </div>

                        {sortedResponses.length === 0 ? (
                            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-center text-slate-500">
                                No student answers submitted yet.
                            </div>
                        ) : (
                            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                {sortedResponses.map((resp, idx) => {
                                    const isCorrect = resp.isCorrect;
                                    return (
                                        <div
                                            key={resp.userId || idx}
                                            className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                                                isCorrect
                                                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                                                    : 'bg-rose-950/40 border-rose-500/40 text-rose-100'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                                    idx === 0 && isCorrect
                                                        ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/40'
                                                        : isCorrect
                                                            ? 'bg-emerald-500/30 text-emerald-300'
                                                            : 'bg-rose-500/30 text-rose-300'
                                                }`}>
                                                    #{idx + 1}
                                                </span>

                                                <span className="font-medium text-slate-200 truncate max-w-[140px]">
                                                    {resp.userName}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 ${
                                                    isCorrect
                                                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                                                        : 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                                                }`}>
                                                    {isCorrect ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                                                    Opt [{resp.selectedOption}]
                                                </span>

                                                <span className="text-[10px] font-mono text-slate-300 font-semibold bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-0.5">
                                                    <Zap className="w-2.5 h-2.5 text-amber-400" />
                                                    {resp.responseTime}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Host Actions for Live Question */}
                    {isHost && (
                        <div className="pt-2 border-t border-slate-800 flex gap-2">
                            {!isQuizOver ? (
                                <button
                                    onClick={handleEndQuestion}
                                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition shadow-sm"
                                >
                                    End Question Now
                                </button>
                            ) : (
                                <div className="flex-1 flex gap-2">
                                    <button
                                        onClick={() => {
                                            setActiveQuiz(null);
                                            if (activeQuestionIndex < questions.length - 1) {
                                                setActiveQuestionIndex(prev => prev + 1);
                                            }
                                        }}
                                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        {activeQuestionIndex < questions.length - 1 ? `Next Question (Q${activeQuestionIndex + 2})` : 'Create / Edit Questions'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : isHost ? (
                /* ========================================================================= */
                /* INSTRUCTOR / HOST FORM: MULTI-QUESTION CREATION & DRAFT MANAGER           */
                /* ========================================================================= */
                <div className="flex-1 flex flex-col overflow-y-auto p-3.5 space-y-3.5">
                    {/* Header Banner */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                                <Layers className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-xs">Live Quiz & Questions Bank</h4>
                                <p className="text-[10px] text-slate-400">Create multiple MCQs & launch during class</p>
                            </div>
                        </div>
                        <span className="text-[10px] bg-slate-800 text-emerald-400 border border-slate-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Draft Saved
                        </span>
                    </div>

                    {/* Question Tab Navigator */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Question {activeQuestionIndex + 1} of {questions.length}
                            </label>
                            <button
                                type="button"
                                onClick={handleAddQuestion}
                                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-950/60 hover:bg-indigo-900/80 px-2 py-0.5 rounded-lg border border-indigo-500/30 transition"
                            >
                                <Plus className="w-3 h-3" /> Add Question
                            </button>
                        </div>

                        {/* Question Pills List */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                            {questions.map((q, idx) => (
                                <button
                                    key={q.id || idx}
                                    type="button"
                                    onClick={() => setActiveQuestionIndex(idx)}
                                    className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                                        activeQuestionIndex === idx
                                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm shadow-indigo-600/30'
                                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                                    }`}
                                >
                                    <span>Q{idx + 1}</span>
                                    {q.question.trim() ? (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    ) : (
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Question Input Card */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Question Statement
                            </label>
                            {questions.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteQuestion(activeQuestionIndex)}
                                    className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
                                >
                                    <Trash2 className="w-3 h-3" /> Delete Q{activeQuestionIndex + 1}
                                </button>
                            )}
                        </div>
                        <textarea
                            rows={3}
                            value={currentEditQ.question}
                            onChange={(e) => handleUpdateCurrentQuestion({ question: e.target.value })}
                            placeholder={`Type Question ${activeQuestionIndex + 1} here (e.g. What is the SI unit of Electric Current?)...`}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
                        />
                    </div>

                    {/* Options A, B, C, D */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Options & Correct Answer
                        </label>
                        {(currentEditQ.options || DEFAULT_OPTIONS).map((opt) => (
                            <div key={opt.key} className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleUpdateCurrentQuestion({ correctOption: opt.key })}
                                    className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border transition ${
                                        currentEditQ.correctOption === opt.key
                                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm shadow-emerald-500/30'
                                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                                    }`}
                                    title={`Mark Option ${opt.key} as correct answer`}
                                >
                                    {opt.key}
                                </button>
                                <input
                                    type="text"
                                    value={opt.text}
                                    onChange={(e) => handleUpdateOptionText(opt.key, e.target.value)}
                                    placeholder={`Option ${opt.key} text...`}
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
                                />
                            </div>
                        ))}
                        <p className="text-[10px] text-emerald-400">
                            💡 Click an option letter (A, B, C, D) to mark it as the <strong>Correct Answer</strong>.
                        </p>
                    </div>

                    {/* Time Limit Selector */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Time Limit
                        </label>
                        <div className="grid grid-cols-5 gap-1.5">
                            {[15, 30, 45, 60, 90].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => handleUpdateCurrentQuestion({ timeLimit: t })}
                                    className={`py-1.5 rounded-lg font-bold text-xs border transition ${
                                        (currentEditQ.timeLimit || 30) === t
                                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                                    }`}
                                >
                                    {t}s
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Action Controls */}
                    <div className="pt-2 space-y-2">
                        <button
                            onClick={() => handleLaunchQuestion(currentEditQ)}
                            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/20 hover:scale-[1.01]"
                        >
                            <Play className="w-4 h-4 fill-slate-950" />
                            Launch Q{activeQuestionIndex + 1} to Class
                        </button>

                        <div className="flex gap-2">
                            {activeQuestionIndex < questions.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setActiveQuestionIndex(prev => prev + 1)}
                                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border border-slate-700 transition"
                                >
                                    <span>Edit Next (Q{activeQuestionIndex + 2})</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleAddQuestion}
                                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border border-slate-700 transition"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Another Question (Q{questions.length + 1})</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* Student Empty Waiting State */
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-indigo-400">
                        <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-white font-semibold text-sm">No Live Question Right Now</h4>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                            When the instructor launches an interactive question, it will appear here automatically with fastest-finger timer!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
