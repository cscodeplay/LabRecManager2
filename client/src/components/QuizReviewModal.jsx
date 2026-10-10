'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    X, CheckCircle2, XCircle, HelpCircle, Clock, Award,
    ChevronLeft, ChevronRight, LayoutGrid, List, Sparkles,
    User, Filter, Check, Eye
} from 'lucide-react';
import MathRenderer from './MathRenderer';

export default function QuizReviewModal({
    isOpen,
    onClose,
    submission
}) {
    const [mounted, setMounted] = useState(false);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'correct' | 'incorrect' | 'skipped'
    const [viewMode, setViewMode] = useState('focus'); // 'focus' | 'list'
    const questionListRef = useRef(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset index when submission opens or changes
    useEffect(() => {
        if (isOpen) {
            setCurrentQuestionIdx(0);
            setFilterStatus('all');
        }
    }, [isOpen, submission?.id]);

    // Keyboard navigation (Esc, ArrowLeft, ArrowRight)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    const answers = useMemo(() => {
        if (!submission || !submission.answers) return [];
        return Array.isArray(submission.answers) ? submission.answers : [];
    }, [submission]);

    // Statistics
    const stats = useMemo(() => {
        const total = answers.length;
        let correct = 0;
        let incorrect = 0;
        let skipped = 0;

        answers.forEach((ans) => {
            const hasSelected = ans.selectedOption !== null && ans.selectedOption !== undefined && String(ans.selectedOption).trim() !== '';
            if (ans.isCorrect) {
                correct++;
            } else if (!hasSelected) {
                skipped++;
            } else {
                incorrect++;
            }
        });

        const score = submission?.score ?? correct;
        const totalScore = submission?.totalQuestions ?? submission?.maxScore ?? total;
        const percentage = submission?.percentage ?? (total > 0 ? Math.round((correct / total) * 100) : 0);

        return {
            total,
            correct,
            incorrect,
            skipped,
            score,
            totalScore,
            percentage
        };
    }, [answers, submission]);

    // Filtered list of answers
    const filteredIndices = useMemo(() => {
        return answers
            .map((ans, idx) => {
                const hasSelected = ans.selectedOption !== null && ans.selectedOption !== undefined && String(ans.selectedOption).trim() !== '';
                let status = 'skipped';
                if (ans.isCorrect) status = 'correct';
                else if (hasSelected) status = 'incorrect';

                return { idx, status };
            })
            .filter(item => {
                if (filterStatus === 'all') return true;
                return item.status === filterStatus;
            })
            .map(item => item.idx);
    }, [answers, filterStatus]);

    if (!mounted || !isOpen || !submission) return null;

    const currentQuestion = answers[currentQuestionIdx];

    const handlePrev = () => {
        if (currentQuestionIdx > 0) {
            setCurrentQuestionIdx(prev => prev - 1);
        }
    };

    const handleNext = () => {
        if (currentQuestionIdx < answers.length - 1) {
            setCurrentQuestionIdx(prev => prev + 1);
        }
    };

    const handleSelectQuestion = (idx) => {
        setCurrentQuestionIdx(idx);
        if (viewMode === 'list') {
            const element = document.getElementById(`review-question-${idx}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[92vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary-100 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
                            <Award className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                                    {submission.quizTitle || submission.quiz?.title || 'Quiz Assessment Review'}
                                </h3>
                                {(submission.quizCode || submission.quiz?.code) && (
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                        {submission.quizCode || submission.quiz?.code}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                <span>Candidate: <strong className="text-slate-700 dark:text-slate-300">{submission.userName || submission.user?.name || 'Student'}</strong></span>
                                {submission.submittedAt && (
                                    <span>• {new Date(submission.submittedAt).toLocaleDateString()}</span>
                                )}
                                {submission.timeTakenSeconds !== undefined && (
                                    <span>• Time: <strong className="text-slate-700 dark:text-slate-300 font-mono">{Math.floor(submission.timeTakenSeconds / 60)}m {submission.timeTakenSeconds % 60}s</strong></span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle */}
                        <div className="flex items-center p-1 bg-slate-200/60 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => setViewMode('focus')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                                    viewMode === 'focus'
                                        ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                                title="Single Question Focus Mode"
                            >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Focus</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                                    viewMode === 'list'
                                        ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                                title="Continuous List View"
                            >
                                <List className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">List</span>
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Close (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Score Summary Banner */}
                <div className="px-5 py-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4">
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Score</span>
                            <span className="font-extrabold text-base text-primary-300">
                                {stats.score} / {stats.totalScore}
                            </span>
                        </div>
                        <div className="h-7 w-[1px] bg-slate-700" />
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Accuracy</span>
                            <span className={`font-extrabold text-base ${stats.percentage >= 70 ? 'text-emerald-400' : stats.percentage >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                                {stats.percentage}%
                            </span>
                        </div>
                    </div>

                    {/* Quick Counts */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-xl">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="font-bold">{stats.correct}</span>
                            <span className="text-[11px] opacity-80">Correct</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-xl">
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            <span className="font-bold">{stats.incorrect}</span>
                            <span className="text-[11px] opacity-80">Incorrect</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-500/20 text-slate-300 border border-slate-500/40 px-2.5 py-1 rounded-xl">
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            <span className="font-bold">{stats.skipped}</span>
                            <span className="text-[11px] opacity-80">Skipped</span>
                        </div>
                    </div>
                </div>

                {/* Main Content Area: Palette Sidebar + Question Workspace */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
                    {/* LEFT / TOP: Interactive Question Palette */}
                    <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col min-h-0">
                        {/* Filter Chips */}
                        <div className="flex items-center gap-1.5 pb-3 border-b border-slate-200 dark:border-slate-800 mb-3 overflow-x-auto custom-scrollbar">
                            <button
                                type="button"
                                onClick={() => setFilterStatus('all')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                                    filterStatus === 'all'
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                All ({stats.total})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterStatus('correct')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                                    filterStatus === 'correct'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                                }`}
                            >
                                ✓ {stats.correct}
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterStatus('incorrect')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                                    filterStatus === 'incorrect'
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
                                }`}
                            >
                                ✗ {stats.incorrect}
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterStatus('skipped')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                                    filterStatus === 'skipped'
                                        ? 'bg-slate-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                ○ {stats.skipped}
                            </button>
                        </div>

                        {/* Question Palette Grid */}
                        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                                <span>Question Palette</span>
                                <span className="font-mono text-[10px] text-slate-500">
                                    Q{currentQuestionIdx + 1} of {answers.length}
                                </span>
                            </h4>

                            <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2">
                                {answers.map((ans, idx) => {
                                    const isCurrent = idx === currentQuestionIdx;
                                    const isCorrect = ans.isCorrect;
                                    const hasSelected = ans.selectedOption !== null && ans.selectedOption !== undefined && String(ans.selectedOption).trim() !== '';

                                    // Palette button styling
                                    let btnClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
                                    if (isCorrect) {
                                        btnClass = 'bg-emerald-500 text-white border-emerald-600 font-bold shadow-xs';
                                    } else if (hasSelected && !isCorrect) {
                                        btnClass = 'bg-rose-500 text-white border-rose-600 font-bold shadow-xs';
                                    } else {
                                        btnClass = 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600';
                                    }

                                    const isDimmed = !filteredIndices.includes(idx);

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleSelectQuestion(idx)}
                                            className={`h-10 rounded-xl border flex flex-col items-center justify-center font-mono text-xs transition relative ${btnClass} ${
                                                isCurrent ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-900 scale-105 z-10' : ''
                                            } ${isDimmed ? 'opacity-30' : 'hover:scale-102'}`}
                                            title={`Question ${idx + 1}: ${isCorrect ? 'Correct' : hasSelected ? 'Incorrect' : 'Skipped'}`}
                                        >
                                            <span>{idx + 1}</span>
                                            {isCorrect && <span className="text-[9px] -mt-0.5">✓</span>}
                                            {!isCorrect && hasSelected && <span className="text-[9px] -mt-0.5">✗</span>}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Legend */}
                            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px] text-slate-500">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-md bg-emerald-500 shrink-0" />
                                    <span>Correct Answer</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-md bg-rose-500 shrink-0" />
                                    <span>Incorrect Choice</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-md bg-slate-300 dark:bg-slate-700 shrink-0" />
                                    <span>Unanswered / Skipped</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Question Review Workspace */}
                    <div className="lg:col-span-8 flex flex-col min-h-0 bg-white dark:bg-slate-900">
                        {answers.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
                                <HelpCircle className="w-12 h-12 mb-2 text-slate-300" />
                                <p className="text-sm">Detailed question-by-question breakdown not available for this record.</p>
                            </div>
                        ) : viewMode === 'focus' ? (
                            /* FOCUS MODE: SINGLE QUESTION WITH PREV/NEXT */
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
                                    {/* Question Card Header */}
                                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 rounded-lg bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold font-mono text-xs">
                                                Question {currentQuestionIdx + 1} of {answers.length}
                                            </span>
                                            <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                                                {currentQuestion?.isCorrect ? '1 / 1 Point' : '0 / 1 Point'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Question Statement */}
                                    <div className="text-slate-900 dark:text-white font-medium text-sm sm:text-base leading-relaxed bg-slate-50/70 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                                        <MathRenderer content={currentQuestion?.questionText || currentQuestion?.question || ''} />
                                    </div>

                                    {/* Options Choices (Quiz UI with pure Green and Red selections) */}
                                    <div className="space-y-2.5">
                                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                            Answer Choices
                                        </h5>

                                        {currentQuestion?.options && currentQuestion.options.length > 0 ? (
                                            currentQuestion.options.map((opt) => {
                                                const optKey = String(opt.key || '').toUpperCase();
                                                const userChoice = String(currentQuestion.selectedOption || '').toUpperCase();
                                                const correctChoice = String(currentQuestion.correctOption || '').toUpperCase();
                                                const isUserSelected = optKey === userChoice;
                                                const isCorrectOption = optKey === correctChoice;

                                                let cardClass = 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200';
                                                let badgeClass = 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
                                                let textClass = 'text-slate-800 dark:text-slate-200';

                                                if (isCorrectOption) {
                                                    cardClass = 'bg-emerald-600 border-emerald-500 text-white shadow-md ring-2 ring-emerald-400/50';
                                                    badgeClass = 'bg-white text-emerald-700 font-bold';
                                                    textClass = 'text-white font-medium';
                                                } else if (isUserSelected && !isCorrectOption) {
                                                    cardClass = 'bg-rose-600 border-rose-500 text-white shadow-md ring-2 ring-rose-400/50';
                                                    badgeClass = 'bg-white text-rose-700 font-bold';
                                                    textClass = 'text-white font-medium';
                                                }

                                                return (
                                                    <div
                                                        key={optKey}
                                                        className={`w-full p-3.5 rounded-2xl border text-left text-xs sm:text-sm transition flex items-center gap-3 ${cardClass}`}
                                                    >
                                                        <span className={`w-7 h-7 rounded-xl font-mono font-bold text-xs flex items-center justify-center shrink-0 ${badgeClass}`}>
                                                            {optKey}
                                                        </span>
                                                        <span className={`flex-1 ${textClass}`}>
                                                            <MathRenderer content={opt.text || ''} inline />
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border text-xs text-slate-600 dark:text-slate-300">
                                                Selected Choice: <strong className="font-mono">{currentQuestion?.selectedOption || 'None'}</strong> • Correct Answer: <strong className="font-mono text-emerald-600">{currentQuestion?.correctOption}</strong>
                                            </div>
                                        )}
                                    </div>

                                    {/* Detailed Solution / Explanation */}
                                    {currentQuestion?.explanation && (
                                        <div className="bg-amber-500/10 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/40 rounded-2xl p-4 space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                                            <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                                <Sparkles className="w-4 h-4 text-amber-500" />
                                                <span>Detailed Explanation & Derivation</span>
                                            </div>
                                            <div className="leading-relaxed">
                                                <MathRenderer content={currentQuestion.explanation} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Prev / Next Footer Bar */}
                                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                                    <button
                                        type="button"
                                        onClick={handlePrev}
                                        disabled={currentQuestionIdx === 0}
                                        className="btn btn-sm btn-secondary flex items-center gap-1 text-xs disabled:opacity-40"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Previous
                                    </button>

                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-slate-500">
                                            Question {currentQuestionIdx + 1} of {answers.length}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        disabled={currentQuestionIdx === answers.length - 1}
                                        className="btn btn-sm btn-primary flex items-center gap-1 text-xs disabled:opacity-40"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* LIST MODE: CONTINUOUS SCROLL WITH DIRECT QUESTION JUMPING */
                            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar" ref={questionListRef}>
                                {answers.map((ans, idx) => {
                                    const isCurrent = idx === currentQuestionIdx;
                                    const isCorrect = ans.isCorrect;
                                    const hasSelected = ans.selectedOption !== null && ans.selectedOption !== undefined && String(ans.selectedOption).trim() !== '';

                                    return (
                                        <div
                                            key={idx}
                                            id={`review-question-${idx}`}
                                            className={`p-4 rounded-2xl border space-y-3 transition ${
                                                isCurrent ? 'ring-2 ring-primary-500/80 shadow-md' : ''
                                            } ${
                                                isCorrect
                                                    ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/40'
                                                    : 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-200 dark:border-rose-800/40'
                                            }`}
                                        >
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold font-mono text-xs text-slate-500">
                                                        Q{idx + 1}
                                                    </span>
                                                    <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                                                        {isCorrect ? '1 / 1 Point' : '0 / 1 Point'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Question Text */}
                                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                                                <MathRenderer content={ans.questionText || ans.question || ''} />
                                            </div>

                                            {/* Choices (Pure Green and Red selections, no labels) */}
                                            {ans.options && ans.options.length > 0 && (
                                                <div className="space-y-2 pt-1">
                                                    {ans.options.map((opt) => {
                                                        const optKey = String(opt.key || '').toUpperCase();
                                                        const userChoice = String(ans.selectedOption || '').toUpperCase();
                                                        const correctChoice = String(ans.correctOption || '').toUpperCase();
                                                        const isUserSelected = optKey === userChoice;
                                                        const isCorrectOption = optKey === correctChoice;

                                                        let cardClass = 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200';
                                                        let badgeClass = 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
                                                        let textClass = 'text-slate-800 dark:text-slate-200';

                                                        if (isCorrectOption) {
                                                            cardClass = 'bg-emerald-600 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-400/40';
                                                            badgeClass = 'bg-white text-emerald-700 font-bold';
                                                            textClass = 'text-white font-medium';
                                                        } else if (isUserSelected && !isCorrectOption) {
                                                            cardClass = 'bg-rose-600 border-rose-500 text-white shadow-sm ring-1 ring-rose-400/40';
                                                            badgeClass = 'bg-white text-rose-700 font-bold';
                                                            textClass = 'text-white font-medium';
                                                        }

                                                        return (
                                                            <div key={optKey} className={`p-3 rounded-xl border flex items-center gap-3 text-xs sm:text-sm ${cardClass}`}>
                                                                <span className={`w-6 h-6 rounded-lg font-bold font-mono text-xs flex items-center justify-center shrink-0 ${badgeClass}`}>
                                                                    {optKey}
                                                                </span>
                                                                <span className={`flex-1 ${textClass}`}>
                                                                    <MathRenderer content={opt.text || ''} inline />
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Explanation */}
                                            {ans.explanation && (
                                                <div className="p-3 bg-amber-500/10 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/40 rounded-xl text-xs text-slate-800 dark:text-slate-200 space-y-0.5">
                                                    <span className="font-bold text-amber-700 dark:text-amber-400 block">Explanation:</span>
                                                    <MathRenderer content={ans.explanation} inline />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
