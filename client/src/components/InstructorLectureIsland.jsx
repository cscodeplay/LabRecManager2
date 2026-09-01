'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { timetableAPI } from '@/lib/api';
import io from 'socket.io-client';
import {
    BookOpen, Video, Pencil, Clock, UserCheck, Plus, Check,
    Minimize2, Maximize2, X, ChevronRight, MapPin, Sparkles,
    Calendar, Layers, Coffee, AlertCircle, ExternalLink
} from 'lucide-react';
import PeriodWorkLogModal from './PeriodWorkLogModal';

export default function InstructorLectureIsland() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    const [liveData, setLiveData] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [showWorkLogModal, setShowWorkLogModal] = useState(false);
    const [workLogData, setWorkLogData] = useState({ period: null, slot: null, day: '', dateStr: '' });

    const timerRef = useRef(null);
    const socketRef = useRef(null);

    const isInstructor = user?.role === 'instructor' || user?.role === 'lab_assistant' || user?.role === 'admin' || user?.role === 'principal';

    const loadLiveLecture = useCallback(async () => {
        if (!isAuthenticated || !isInstructor) return;
        try {
            const res = await timetableAPI.getLive();
            if (res.data?.data) {
                setLiveData(res.data.data);
                if (res.data.data.currentPeriod) {
                    setElapsedSeconds(res.data.data.currentPeriod.elapsed * 60);
                }
            }
        } catch (e) {
            // Silently ignore live polling error
        }
    }, [isAuthenticated, isInstructor]);

    // Live clock timer
    useEffect(() => {
        if (liveData?.currentPeriod) {
            timerRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
            return () => clearInterval(timerRef.current);
        }
    }, [liveData?.currentPeriod]);

    // Polling & socket initialization
    useEffect(() => {
        if (!_hasHydrated || !isAuthenticated || !isInstructor) return;

        loadLiveLecture();
        const pollInterval = setInterval(loadLiveLecture, 25000);

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001');
        try {
            const socket = io(socketUrl, {
                path: '/socket.io',
                transports: ['websocket', 'polling']
            });
            socketRef.current = socket;

            socket.on('connect', () => {
                if (user?.id) socket.emit('join-user', user.id);
            });

            socket.on('timetable:period-starting', () => {
                loadLiveLecture();
            });

            socket.on('timetable:timings-updated', () => {
                loadLiveLecture();
            });

            return () => {
                clearInterval(pollInterval);
                socket.disconnect();
            };
        } catch (err) {
            return () => clearInterval(pollInterval);
        }
    }, [_hasHydrated, isAuthenticated, isInstructor, user?.id, loadLiveLecture]);

    // Don't display if dismissed, on meeting pages, or not an instructor
    if (!_hasHydrated || !isAuthenticated || !isInstructor || isDismissed) return null;
    if (pathname?.startsWith('/meeting/') || pathname?.startsWith('/meetings/room/')) return null;

    const currentPeriod = liveData?.currentPeriod;
    const nextPeriod = liveData?.nextPeriod;
    const isHoliday = liveData?.isHoliday;

    // Only show if there is an active period, an upcoming period within 30 min, or today is active
    if (isHoliday || (!currentPeriod && !nextPeriod)) return null;

    // Calculate progress & countdown for current period
    let progressPercent = 0;
    let remainingMinutes = 0;
    let remainingSeconds = 0;

    if (currentPeriod) {
        const startMinutes = parseInt(currentPeriod.startTime.split(':')[0]) * 60 + parseInt(currentPeriod.startTime.split(':')[1]);
        const endMinutes = parseInt(currentPeriod.endTime.split(':')[0]) * 60 + parseInt(currentPeriod.endTime.split(':')[1]);
        const totalSeconds = Math.max((endMinutes - startMinutes) * 60, 1);
        const elapsed = Math.min(elapsedSeconds, totalSeconds);
        progressPercent = Math.min(100, Math.round((elapsed / totalSeconds) * 100));
        const remSec = Math.max(totalSeconds - elapsed, 0);
        remainingMinutes = Math.floor(remSec / 60);
        remainingSeconds = remSec % 60;
    }

    const isFreePeriod = currentPeriod && (!currentPeriod.subject || currentPeriod.slotType === 'free');
    const isLab = currentPeriod?.slotType === 'lab';

    const handleOpenWorkLog = (e) => {
        e?.stopPropagation?.();
        setWorkLogData({
            period: currentPeriod ? { periodNumber: currentPeriod.periodNumber, startTime: currentPeriod.startTime, endTime: currentPeriod.endTime } : null,
            slot: currentPeriod,
            day: liveData?.dayOfWeek || 'monday',
            dateStr: new Date().toISOString().split('T')[0]
        });
        setShowWorkLogModal(true);
    };

    return (
        <>
            <div
                className="fixed top-3.5 left-4 z-40 pointer-events-auto transition-all duration-300 ease-out select-none"
                style={{ maxWidth: 'calc(100vw - 32px)' }}
            >
                {/* Island Container */}
                <div
                    className={'relative bg-gradient-to-b text-white shadow-2xl backdrop-blur-2xl transition-all duration-300 ease-spring ' + (
                        currentPeriod
                            ? (isFreePeriod
                                ? 'from-slate-900/95 via-slate-900/95 to-slate-950/95 border border-slate-700/60 shadow-slate-950/60'
                                : isLab
                                    ? 'from-purple-950/80 via-slate-900/95 to-slate-950/95 border border-purple-500/50 shadow-purple-950/40'
                                    : 'from-blue-950/80 via-slate-900/95 to-slate-950/95 border border-blue-500/50 shadow-blue-950/40')
                            : 'from-amber-950/80 via-slate-900/95 to-slate-950/95 border border-amber-500/40 shadow-amber-950/40'
                    ) + ' ' + (
                        isExpanded
                            ? 'w-[92vw] sm:w-[380px] rounded-3xl p-4'
                            : 'w-auto max-w-[92vw] rounded-full py-1.5 pl-3 pr-2.5 hover:scale-[1.02] cursor-pointer'
                    )}
                    onClick={() => !isExpanded && setIsExpanded(true)}
                >
                    {/* ─── COMPACT LEFT PILL ─── */}
                    {!isExpanded ? (
                        <div className="flex items-center gap-2.5">
                            {/* Live Pulsing Beacon & Icon */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {currentPeriod ? (
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className={'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ' + (isLab ? 'bg-purple-400' : isFreePeriod ? 'bg-emerald-400' : 'bg-blue-400')}></span>
                                        <span className={'relative inline-flex rounded-full h-2.5 w-2.5 ' + (isLab ? 'bg-purple-500' : isFreePeriod ? 'bg-emerald-500' : 'bg-blue-500')}></span>
                                    </span>
                                ) : (
                                    <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                )}

                                <div className={'w-6 h-6 rounded-full flex items-center justify-center shrink-0 ' + (
                                    isFreePeriod ? 'bg-emerald-500/20 text-emerald-400' :
                                    isLab ? 'bg-purple-500/20 text-purple-400' :
                                    currentPeriod ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-amber-500/20 text-amber-400'
                                )}>
                                    {isFreePeriod ? <Coffee className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                                </div>
                            </div>

                            {/* Lecture Subject & Timer */}
                            <div className="flex items-center gap-2 min-w-0 pr-1">
                                {currentPeriod ? (
                                    <>
                                        <span className="text-[12px] font-bold text-slate-100 truncate max-w-[130px] sm:max-w-[180px]">
                                            {isFreePeriod ? 'Free Period P' + currentPeriod.periodNumber : (currentPeriod.subject?.name || 'Period ' + currentPeriod.periodNumber)}
                                        </span>
                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-white/10 text-white border border-white/15 shrink-0">
                                            {String(remainingMinutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-[12px] font-semibold text-amber-200 truncate max-w-[130px]">
                                            Next: {nextPeriod.subject?.name || 'Period ' + nextPeriod.periodNumber}
                                        </span>
                                        <span className="text-[10px] font-mono text-amber-400 shrink-0">
                                            {nextPeriod.startTime}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Quick Action Button */}
                            <div className="flex items-center gap-1.5 border-l border-slate-700/80 pl-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={handleOpenWorkLog}
                                    className={'px-2 py-0.5 rounded-full text-[10px] font-bold transition shadow-xs flex items-center gap-1 ' + (
                                        isFreePeriod
                                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                                            : 'bg-blue-500 hover:bg-blue-400 text-white'
                                    )}
                                    title="Log Tasks & Work Done"
                                >
                                    <Plus className="w-3 h-3" />
                                    <span>Task</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsDismissed(true);
                                    }}
                                    className="p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/10 transition"
                                    title="Dismiss"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* ─── EXPANDED INSTRUCTOR LECTURE CARD ─── */
                        <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className={'w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg ' + (
                                        isFreePeriod ? 'bg-emerald-500/20 text-emerald-400' :
                                        isLab ? 'bg-purple-500/20 text-purple-400' :
                                        currentPeriod ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-amber-500/20 text-amber-400'
                                    )}>
                                        {isFreePeriod ? <Coffee className="w-5 h-5" /> : <BookOpen className="w-5 h-5 animate-pulse" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className={'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ' + (
                                                currentPeriod
                                                    ? (isFreePeriod
                                                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                                        : isLab
                                                            ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                                            : 'bg-blue-500/15 text-blue-400 border-blue-500/30')
                                                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                            )}>
                                                {currentPeriod ? ('LIVE • Period ' + currentPeriod.periodNumber) : 'UPCOMING LECTURE'}
                                            </span>
                                            {isLab && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                    Lab Practical
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="text-[13px] font-bold text-white mt-0.5">
                                            {currentPeriod
                                                ? (isFreePeriod ? 'Free / Preparation Period' : currentPeriod.subject?.name || 'Class Period')
                                                : (nextPeriod?.subject?.name || 'Next Lecture')}
                                        </h4>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsExpanded(false)}
                                        className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 rounded-xl hover:bg-slate-800 transition"
                                        title="Minimize"
                                    >
                                        <Minimize2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsDismissed(true)}
                                        className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 rounded-xl hover:bg-rose-500/30 hover:text-rose-300 transition"
                                        title="Dismiss"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Details Box */}
                            <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-primary-400" />
                                        <span>Timing</span>
                                    </span>
                                    <span className="font-mono font-bold text-slate-200">
                                        {currentPeriod ? (currentPeriod.startTime + ' – ' + currentPeriod.endTime) : (nextPeriod.startTime + ' – ' + nextPeriod.endTime)}
                                    </span>
                                </div>

                                {currentPeriod?.timetable?.class?.name && (
                                    <div className="flex items-center justify-between text-xs border-t border-slate-800/60 pt-1.5">
                                        <span className="text-slate-400">Class & Section</span>
                                        <span className="font-semibold text-primary-300">{currentPeriod.timetable.class.name}</span>
                                    </div>
                                )}

                                {currentPeriod?.roomNumber && (
                                    <div className="flex items-center justify-between text-xs border-t border-slate-800/60 pt-1.5">
                                        <span className="text-slate-400">Location</span>
                                        <span className="font-medium text-slate-300">Room {currentPeriod.roomNumber}</span>
                                    </div>
                                )}

                                {/* Fluid Progress Bar */}
                                {currentPeriod && (
                                    <div className="space-y-1 pt-1 border-t border-slate-800/60">
                                        <div className="flex items-center justify-between text-[11px] font-mono">
                                            <span className="text-emerald-400 font-bold">{progressPercent}% elapsed</span>
                                            <span className="text-slate-300">{remainingMinutes}m {remainingSeconds}s left</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-1000 ease-linear rounded-full"
                                                style={{ width: progressPercent + '%' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Instructor Quick Actions */}
                            <div className="grid grid-cols-2 gap-2 pt-0.5">
                                <button
                                    type="button"
                                    onClick={handleOpenWorkLog}
                                    className="py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/30 transition active:scale-95"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Log Tasks Done</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsExpanded(false);
                                        router.push('/whiteboard');
                                    }}
                                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                                >
                                    <Pencil className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Whiteboard</span>
                                </button>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsExpanded(false);
                                        router.push('/timetable');
                                    }}
                                    className="hover:text-white flex items-center gap-1"
                                >
                                    <span>View Full Timetable</span>
                                    <ChevronRight className="w-3 h-3" />
                                </button>
                                <span>Instructor View</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Period Work Log Modal */}
            <PeriodWorkLogModal
                isOpen={showWorkLogModal}
                onClose={() => setShowWorkLogModal(false)}
                period={workLogData.period}
                slot={workLogData.slot}
                day={workLogData.day}
                dateStr={workLogData.dateStr}
                currentUser={user}
                onWorkSaved={() => loadLiveLecture()}
            />
        </>
    );
}
