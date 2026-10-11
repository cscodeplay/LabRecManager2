'use client';

import React, { useState } from 'react';
import {
    ChevronLeft, ChevronRight, Check, Send, FileText,
    Sparkles, Eye, LayoutGrid, List, RefreshCw
} from 'lucide-react';
import MathRenderer from './MathRenderer';
import QuestionDiagram from './QuestionDiagram';

export default function QuizPreviewPalette({
    questions = [],
    quizTitle = '',
    onChangeTitle,
    timeLimitMinutes = 10,
    maxAttempts = 1,
    generationSource = null,
    onSaveDraft,
    onOpenPublishConfirm,
    isSaving = false,
    onBackToPrompt
}) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [viewMode, setViewMode] = useState('focus'); // 'focus' | 'list'

    if (!questions || questions.length === 0) return null;

    const currentQ = questions[currentIdx] || questions[0];

    const renderQuestionCard = (q, idx) => {
        const isFillInBlank = q.type === 'fill_in_the_blank' || q.type === 'nat' || (!q.options || q.options.length === 0);
        const occurrences = Array.isArray(q.examOccurrences) && q.examOccurrences.length > 0
            ? q.examOccurrences
            : (q.examType ? [{ exam: q.examType, year: q.examYear }] : []);

        return (
            <div
                key={q.id || idx}
                id={`preview-q-${idx}`}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm transition"
            >
                {/* Header: Question Number & Points */}
                <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="font-bold text-primary-600 flex items-center gap-1.5">
                        <span>Question {idx + 1} of {questions.length}</span>
                        {isFillInBlank && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                Numerical / Fill-in-Blank
                            </span>
                        )}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-semibold text-slate-600 dark:text-slate-300">
                        {q.points || 1} {q.points === 1 ? 'Point' : 'Points'}
                    </span>
                </div>

                {/* Question Statement */}
                <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-snug">
                    <MathRenderer content={q.question || ''} />
                </div>

                {/* Exam Occurrences, Topic, and Difficulty Pills directly UNDER the question */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {occurrences.map((occ, oIdx) => {
                        if (!occ.exam && !occ.year) return null;
                        return (
                            <span
                                key={oIdx}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/50 shadow-xs"
                            >
                                <span>🏛️</span>
                                <span>{occ.exam || 'Exam'} {occ.year ? `(${occ.year})` : ''}</span>
                            </span>
                        );
                    })}
                    {q.topic && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <span>🏷️</span>
                            <span>{q.topic}</span>
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800/60 text-slate-500 capitalize">
                        <span>⚡</span>
                        <span>{q.difficulty || 'medium'}</span>
                    </span>
                </div>

                {/* Technical / Crisp Diagram (if present) */}
                {(q.diagramSvg || q.diagramUrl) && (
                    <div className="py-1">
                        <QuestionDiagram
                            diagramSvg={q.diagramSvg}
                            diagramUrl={q.diagramUrl}
                            title={`Question ${idx + 1} Diagram`}
                        />
                    </div>
                )}

                {/* Options / Answer Section */}
                {isFillInBlank ? (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl space-y-1">
                        <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>Correct Numerical / Text Answer:</span>
                        </div>
                        <div className="font-mono text-sm sm:text-base font-extrabold text-emerald-900 dark:text-emerald-100 px-2 py-1 bg-white/80 dark:bg-slate-900/80 rounded-lg inline-block border border-emerald-500/30">
                            {q.correctOption}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2 pt-1">
                        {(q.options || []).map((opt) => {
                            const isCorrect = String(q.correctOption || '').toUpperCase() === String(opt.key || '').toUpperCase();
                            return (
                                <div
                                    key={opt.key}
                                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-left text-xs sm:text-sm transition flex items-center gap-2.5 ${
                                        isCorrect
                                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/40 shadow-xs'
                                            : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                                    }`}
                                >
                                    <span className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                                        isCorrect
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}>
                                        {opt.key}
                                    </span>
                                    <span className="flex-1 font-medium">
                                        <MathRenderer content={opt.text || ''} inline />
                                    </span>
                                    {isCorrect && (
                                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Step-by-Step Solution & Explanation */}
                {q.explanation && (
                    <div className="text-xs text-slate-800 dark:text-slate-200 bg-amber-500/10 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-300 dark:border-amber-800/40 space-y-1">
                        <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 text-[11px]">
                            <span>💡</span>
                            <span>Step-by-Step Solution & Rationale</span>
                        </div>
                        <div className="leading-relaxed">
                            <MathRenderer content={q.explanation} />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Top Bar: Source Badge + Title Input + View Mode Switch */}
            <div className="space-y-2">
                {generationSource && (
                    <div className={`p-2 rounded-xl border text-xs flex items-center justify-between ${
                        generationSource === 'question_bank'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            : 'bg-primary-50 dark:bg-primary-950/40 border-primary-200 dark:border-primary-800 text-primary-800 dark:text-primary-300'
                    }`}>
                        <span className="font-bold flex items-center gap-1.5 text-[11px]">
                            {generationSource === 'question_bank' ? '🏛️ Loaded from Question Bank' : '🌐 Grounded via Authentic Web Archives'}
                        </span>
                        <span className="text-[10px] font-semibold opacity-80">
                            {questions.length} Questions Generated
                        </span>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={quizTitle}
                        onChange={(e) => onChangeTitle(e.target.value)}
                        placeholder="Enter Quiz Title..."
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                    />
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl shrink-0">
                        <button
                            type="button"
                            onClick={() => setViewMode('focus')}
                            className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                viewMode === 'focus'
                                    ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Focus Mode (Question Palette)"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                viewMode === 'list'
                                    ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="List Mode (All Questions)"
                        >
                            <List className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Question Palette Navigator (in Focus Mode) */}
            {viewMode === 'focus' && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                    {questions.map((q, idx) => {
                        const isCurrent = idx === currentIdx;
                        return (
                            <button
                                key={q.id || idx}
                                type="button"
                                onClick={() => setCurrentIdx(idx)}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center flex-shrink-0 ${
                                    isCurrent
                                        ? 'bg-primary-600 text-white ring-2 ring-primary-400 shadow-xs scale-105'
                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Question Card Display */}
            {viewMode === 'focus' ? (
                <div>
                    {renderQuestionCard(currentQ, currentIdx)}

                    {/* Palette Navigation Controls */}
                    <div className="flex items-center justify-between pt-3">
                        <button
                            type="button"
                            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                            disabled={currentIdx === 0}
                            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" /> Previous
                        </button>
                        <span className="text-[11px] text-slate-400 font-medium">
                            {currentIdx + 1} / {questions.length}
                        </span>
                        <button
                            type="button"
                            onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                            disabled={currentIdx === questions.length - 1}
                            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                        >
                            Next <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                    {questions.map((q, idx) => renderQuestionCard(q, idx))}
                </div>
            )}

            {/* Footer Actions: Save as Draft vs Publish Quiz */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                {onBackToPrompt && (
                    <button
                        type="button"
                        onClick={onBackToPrompt}
                        disabled={isSaving}
                        className="py-2 px-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-bold transition"
                    >
                        ← Adjust Parameters
                    </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                    <button
                        type="button"
                        onClick={onSaveDraft}
                        disabled={isSaving}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 disabled:opacity-50"
                    >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        {isSaving ? 'Saving...' : 'Save as Draft'}
                    </button>
                    <button
                        type="button"
                        onClick={onOpenPublishConfirm}
                        disabled={isSaving}
                        className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                        <Send className="w-3.5 h-3.5" />
                        Publish Quiz...
                    </button>
                </div>
            </div>
        </div>
    );
}
