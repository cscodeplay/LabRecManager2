'use client';

import React, { useState } from 'react';
import {
    Star,
    CheckCircle2,
    AlertCircle,
    X,
    Sparkles,
    UserCheck,
    Calendar,
    Lightbulb,
    MessageSquare,
    CheckSquare,
    Square
} from 'lucide-react';

export default function StudentFeedbackDrawer({
    isOpen,
    onClose,
    reviewData,
    isDarkMode = true
}) {
    const [checkedSuggestions, setCheckedSuggestions] = useState({});

    if (!isOpen || !reviewData?.latestReview) return null;

    const review = reviewData.latestReview;
    const rating = review.rating || 5;

    const toggleSuggestion = (index) => {
        setCheckedSuggestions(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const drawerBg = isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800';
    const subCardBg = isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200';

    const getStatusBadge = (status) => {
        switch (status) {
            case 'excellent':
                return {
                    label: 'Outstanding Work',
                    bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                    icon: CheckCircle2
                };
            case 'needs_improvement':
                return {
                    label: 'Needs Improvement',
                    bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                    icon: AlertCircle
                };
            default:
                return {
                    label: 'Reviewed & Approved',
                    bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
                    icon: CheckCircle2
                };
        }
    };

    const statusBadge = getStatusBadge(review.status);
    const StatusIcon = statusBadge.icon;

    // Format review datetime
    let formattedDate = 'Recent';
    if (review.reviewedAt) {
        try {
            const d = new Date(review.reviewedAt);
            formattedDate = d.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (_) {}
    }

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
            <div className={`relative w-full max-w-md h-full shadow-2xl border-l flex flex-col ${drawerBg}`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-5 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
                            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold">Instructor & AI Code Review</h2>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                {formattedDate}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 flex-1 overflow-y-auto space-y-5 text-xs">
                    {/* Status & Rating Card */}
                    <div className={`p-4 rounded-xl border ${subCardBg} space-y-3`}>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Evaluation Score</span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge.bg}`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {statusBadge.label}
                            </span>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`w-6 h-6 ${
                                        star <= rating
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'text-slate-700'
                                    }`}
                                />
                            ))}
                            <span className="ml-2 font-mono font-bold text-base text-amber-400">
                                {rating} / 5
                            </span>
                        </div>

                        {/* Reviewer */}
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                            <span>Evaluated By:</span>
                            <span className="font-semibold text-slate-200 flex items-center gap-1">
                                {review.isAiGenerated ? <Sparkles className="w-3.5 h-3.5 text-purple-400" /> : <UserCheck className="w-3.5 h-3.5 text-primary-400" />}
                                {review.reviewedBy || 'Instructor'}
                            </span>
                        </div>
                    </div>

                    {/* Instructor Feedback Comments */}
                    {review.comments && (
                        <div className={`p-4 rounded-xl border ${subCardBg} space-y-2`}>
                            <h3 className="font-bold text-xs flex items-center gap-2 text-slate-200">
                                <MessageSquare className="w-4 h-4 text-primary-400" />
                                Reviewer Comments
                            </h3>
                            <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-[11px] bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                                {review.comments}
                            </div>
                        </div>
                    )}

                    {/* Actionable Suggestions */}
                    {review.suggestions && review.suggestions.length > 0 && (
                        <div className={`p-4 rounded-xl border ${subCardBg} space-y-3`}>
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-xs flex items-center gap-2 text-slate-200">
                                    <Lightbulb className="w-4 h-4 text-amber-400" />
                                    Actionable Improvement Suggestions
                                </h3>
                                <span className="text-[10px] text-slate-400">
                                    {Object.values(checkedSuggestions).filter(Boolean).length}/{review.suggestions.length} Completed
                                </span>
                            </div>

                            <div className="space-y-2">
                                {review.suggestions.map((sug, idx) => {
                                    const isDone = Boolean(checkedSuggestions[idx]);
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => toggleSuggestion(idx)}
                                            className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition ${
                                                isDone
                                                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300/80 line-through'
                                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                                            }`}
                                        >
                                            {isDone ? (
                                                <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <Square className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                                            )}
                                            <span className="text-[11px] leading-snug">{sug}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`p-4 border-t flex justify-end ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white transition cursor-pointer"
                    >
                        Got It, Continue Coding
                    </button>
                </div>
            </div>
        </div>
    );
}
