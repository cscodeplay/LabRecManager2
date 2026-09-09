'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Radio, Video, Calendar, AlertTriangle, ChevronRight, User, Sparkles } from 'lucide-react';

/**
 * Calculates live remaining time between now and target date in months, days, hours, min, sec format.
 */
function calculateTimeRemaining(targetDate) {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    if (isNaN(target.getTime())) return null;

    const now = new Date();
    const diffMs = target.getTime() - now.getTime();

    if (diffMs <= 0) {
        // Overdue calculation
        const pastMs = Math.abs(diffMs);
        const totalSecs = Math.floor(pastMs / 1000);
        const totalDays = Math.floor(totalSecs / 86400);
        const months = Math.floor(totalDays / 30);
        const days = totalDays % 30;
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;

        return {
            isOverdue: true,
            months,
            days,
            hours,
            mins,
            secs,
            formatted: [
                months > 0 ? `${months}mo` : null,
                days > 0 ? `${days}d` : null,
                `${hours}h`,
                `${mins}m`,
                `${secs}s`
            ].filter(Boolean).join(' ')
        };
    }

    const totalSecs = Math.floor(diffMs / 1000);
    const totalDays = Math.floor(totalSecs / 86400);
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    return {
        isOverdue: false,
        months,
        days,
        hours,
        mins,
        secs,
        formatted: [
            months > 0 ? `${months} months` : null,
            days > 0 ? `${days} days` : null,
            `${hours} hrs`,
            `${mins} min`,
            `${secs} sec`
        ].filter(Boolean).join(', ')
    };
}

export default function TrainingLiveBanner({
    assignmentInfo,
    lectureInfo,
    compact = false,
    className = ''
}) {
    const router = useRouter();
    const dueDate = assignmentInfo?.dueDate;

    const [countdown, setCountdown] = useState(() => calculateTimeRemaining(dueDate));

    useEffect(() => {
        if (!dueDate) {
            setCountdown(null);
            return;
        }

        // Set initial
        setCountdown(calculateTimeRemaining(dueDate));

        // Update countdown every 1000ms
        const interval = setInterval(() => {
            setCountdown(calculateTimeRemaining(dueDate));
        }, 1000);

        return () => clearInterval(interval);
    }, [dueDate]);

    const hasDueDate = Boolean(dueDate && countdown);
    const hasLecture = Boolean(lectureInfo);

    if (!hasDueDate && !hasLecture) {
        return null;
    }

    const formattedLectureDate = useMemo(() => {
        if (!lectureInfo?.scheduledAt) return null;
        try {
            const d = new Date(lectureInfo.scheduledAt);
            return d.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return null;
        }
    }, [lectureInfo?.scheduledAt]);

    const handleJoinMeeting = () => {
        if (lectureInfo?.roomCode) {
            router.push(`/meeting/${lectureInfo.roomCode}`);
        } else if (lectureInfo?.meetingId) {
            router.push(`/meeting/${lectureInfo.meetingId}`);
        }
    };

    if (compact) {
        return (
            <div className={`flex flex-wrap items-center gap-2 text-xs ${className}`}>
                {/* Live Lecture Pill */}
                {lectureInfo?.isLive && (
                    <button
                        onClick={handleJoinMeeting}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold animate-pulse shadow-md transition"
                        title="Live Lecture in Progress - Click to Join"
                    >
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                        <span>LIVE LECTURE</span>
                        <Video className="w-3.5 h-3.5" />
                    </button>
                )}

                {/* Due Date Countdown Pill */}
                {hasDueDate && (
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-semibold border ${
                        countdown.isOverdue
                            ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                            : 'bg-indigo-950/80 border-indigo-500/40 text-indigo-200'
                    }`}>
                        <Clock className={`w-3.5 h-3.5 ${countdown.isOverdue ? 'text-rose-400' : 'text-indigo-400'}`} />
                        <span>
                            {countdown.isOverdue ? 'Overdue: ' : 'Due in: '}
                            <strong className="text-white font-bold">{countdown.formatted}</strong>
                        </span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`space-y-3 ${className}`}>
            {/* 1. LIVE LECTURE IN PROGRESS ALERT */}
            {lectureInfo?.isLive && (
                <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-pink-700 text-white rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse border border-rose-400/40">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <Radio className="w-5 h-5 text-white animate-spin" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase bg-black/30 px-2 py-0.5 rounded-md tracking-wider">
                                    LIVE CLASSROOM LECTURE
                                </span>
                                <span className="text-xs opacity-90">In Progress</span>
                            </div>
                            <h4 className="text-sm font-bold truncate mt-0.5">
                                {lectureInfo.title || 'Live Lecture Session'}
                            </h4>
                            <p className="text-xs opacity-90 truncate">
                                Instructor: <strong>{lectureInfo.instructorName || 'Your Teacher'}</strong>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleJoinMeeting}
                        className="btn bg-white hover:bg-slate-100 text-rose-700 font-extrabold text-xs py-2 px-5 rounded-xl shadow-lg flex items-center gap-2 shrink-0 transition"
                    >
                        <Video className="w-4 h-4" />
                        <span>Join Live Lecture</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* 2. SCHEDULED UPCOMING LECTURE (when not live) */}
            {!lectureInfo?.isLive && formattedLectureDate && (
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-slate-200">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 text-xs">
                            <span className="text-[11px] text-indigo-400 font-bold uppercase tracking-wider block">
                                Upcoming Class Lecture
                            </span>
                            <span className="font-semibold text-white">{lectureInfo.title || 'Course Lecture'}</span>
                            <span className="text-slate-400 ml-2">with {lectureInfo.instructorName}</span>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-indigo-300">{formattedLectureDate}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                            {lectureInfo.durationMinutes ? `${lectureInfo.durationMinutes} mins` : 'Scheduled'}
                        </div>
                    </div>
                </div>
            )}

            {/* 3. RUNNING LIVE DUE DATE COUNTDOWN BANNER */}
            {hasDueDate && (
                <div className={`rounded-2xl p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                    countdown.isOverdue
                        ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                        : 'bg-slate-900/90 border-slate-700/80 text-slate-200 shadow-sm'
                }`}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            countdown.isOverdue
                                ? 'bg-rose-600/20 text-rose-400'
                                : 'bg-indigo-600/20 text-indigo-400'
                        }`}>
                            {countdown.isOverdue ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                    countdown.isOverdue
                                        ? 'bg-rose-500/30 text-rose-300'
                                        : 'bg-indigo-500/20 text-indigo-300'
                                }`}>
                                    {countdown.isOverdue ? 'Assignment Deadline Passed' : 'Assignment Due Date'}
                                </span>
                                {assignmentInfo?.title && (
                                    <span className="text-xs text-slate-400 truncate max-w-xs">
                                        • {assignmentInfo.title}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                                Target Date: <strong className="text-slate-200">{new Date(dueDate).toLocaleString()}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Running Live Countdown Display */}
                    <div className="flex items-center gap-2 shrink-0 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1"></div>
                        <div className="text-right">
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                {countdown.isOverdue ? 'Overdue By' : 'Remaining Time (Live)'}
                            </div>
                            <div className={`font-mono text-xs sm:text-sm font-black ${
                                countdown.isOverdue ? 'text-rose-400' : 'text-emerald-300'
                            }`}>
                                {countdown.formatted}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
