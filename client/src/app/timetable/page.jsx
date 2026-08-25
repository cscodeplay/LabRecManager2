'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Clock, Bell, Play, Pause, ChevronRight, ChevronLeft, BookOpen,
    User, MapPin, Calendar, Sun, AlertCircle, Timer, Sparkles,
    Check, Plus, PartyPopper, LayoutGrid, CalendarDays
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { timetableAPI, calendarAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { formatDate } from '@/lib/dateUtils';
import PeriodWorkLogModal from '@/components/PeriodWorkLogModal';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' };

const SLOT_COLORS = {
    lecture: 'from-blue-500 to-blue-600',
    lab: 'from-purple-500 to-purple-600',
    break_period: 'from-amber-400 to-amber-500',
    assembly: 'from-teal-500 to-teal-600',
    free: 'from-slate-400 to-slate-500',
    sports: 'from-green-500 to-green-600',
    library: 'from-indigo-500 to-indigo-600',
};

const DEFAULT_PERIODS = [
    { periodNumber: 1, startTime: '08:00', endTime: '08:40' },
    { periodNumber: 2, startTime: '08:40', endTime: '09:20' },
    { periodNumber: 3, startTime: '09:20', endTime: '10:00' },
    { periodNumber: 4, startTime: '10:00', endTime: '10:15', slotType: 'break_period' },
    { periodNumber: 5, startTime: '10:15', endTime: '10:55' },
    { periodNumber: 6, startTime: '10:55', endTime: '11:35' },
    { periodNumber: 7, startTime: '11:35', endTime: '12:15' },
    { periodNumber: 8, startTime: '12:15', endTime: '12:55' },
];

export default function TimetablePage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const timerRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [liveData, setLiveData] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [upcomingHolidays, setUpcomingHolidays] = useState([]);
    
    // View state
    const [activeTab, setActiveTab] = useState('today'); // 'today' or 'week'
    const [weekOffset, setWeekOffset] = useState(0);
    const [calendarHolidays, setCalendarHolidays] = useState({});

    // Work Log Modal
    const [showWorkLogModal, setShowWorkLogModal] = useState(false);
    const [workLogData, setWorkLogData] = useState({
        period: null,
        slot: null,
        day: '',
        dateStr: ''
    });
    const [loggedWorkMap, setLoggedWorkMap] = useState({});

    const isInstructorOrAdmin = user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'principal';

    // Compute dynamic week days with date formatting
    const weekDays = useMemo(() => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday
        const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(today);
        monday.setDate(today.getDate() + distanceToMonday + weekOffset * 7);

        return DAYS.map((dayKey, idx) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + idx);
            const dateStr = d.toISOString().split('T')[0];
            const isTodayDate = d.toDateString() === today.toDateString();
            const formattedDate = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            const fullDateDisplay = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

            return {
                dayKey,
                date: d,
                dateStr,
                formattedDate,
                fullDateDisplay,
                isToday: isTodayDate
            };
        });
    }, [weekOffset]);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        loadLiveData();
        loadUpcomingHolidays();
        loadWeekHolidays();

        // Refresh live data every 30 seconds
        const interval = setInterval(loadLiveData, 30000);
        return () => clearInterval(interval);
    }, [isAuthenticated, _hasHydrated, weekOffset]);

    // Live timer tick
    useEffect(() => {
        if (liveData?.currentPeriod) {
            timerRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
            return () => clearInterval(timerRef.current);
        }
    }, [liveData?.currentPeriod]);

    const loadLiveData = async () => {
        try {
            const res = await timetableAPI.getLive();
            setLiveData(res.data.data);
            if (res.data.data?.currentPeriod) {
                setElapsedSeconds(res.data.data.currentPeriod.elapsed * 60);
            }
        } catch (error) {
            console.error('Error loading live data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUpcomingHolidays = async () => {
        try {
            const now = new Date();
            const res = await calendarAPI.getEvents({
                month: now.getMonth() + 1,
                year: now.getFullYear()
            });
            const upcoming = (res.data.data.events || [])
                .filter(e => (e.isHoliday || e.eventType === 'holiday') && new Date(e.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
                .slice(0, 3);
            setUpcomingHolidays(upcoming);
        } catch { /* quiet */ }
    };

    const loadWeekHolidays = async () => {
        try {
            if (weekDays.length === 0) return;
            const startDate = weekDays[0].dateStr;
            const endDate = weekDays[weekDays.length - 1].dateStr;
            const res = await calendarAPI.getEvents({ startDate, endDate });
            const events = res.data?.data?.events || [];
            const hMap = {};
            events.forEach(e => {
                if (e.isHoliday || e.eventType === 'holiday') {
                    const dateKey = new Date(e.date).toISOString().split('T')[0];
                    hMap[dateKey] = e;
                }
            });
            setCalendarHolidays(hMap);
        } catch (e) {
            console.warn('Failed to load week holidays:', e);
        }
    };

    const handleOpenWorkLogModal = (e, day, period, slot) => {
        e?.stopPropagation?.();
        const dayObj = weekDays.find(w => w.dayKey === day);
        setWorkLogData({
            period,
            slot,
            day,
            dateStr: dayObj?.dateStr || new Date().toISOString().split('T')[0]
        });
        setShowWorkLogModal(true);
    };

    const handleWorkSaved = (logData) => {
        const key = `${logData.slotId || logData.periodNumber}_${logData.dateStr}`;
        setLoggedWorkMap(prev => ({
            ...prev,
            [key]: logData
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    const isHoliday = liveData?.isHoliday;
    const currentPeriod = liveData?.currentPeriod;
    const nextPeriod = liveData?.nextPeriod;
    const allSlots = liveData?.allSlots || [];

    // Calculate live progress
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

    // Next period countdown
    let nextCountdown = '';
    if (nextPeriod?.minutesUntilStart) {
        const mins = nextPeriod.minutesUntilStart;
        nextCountdown = mins <= 5 ? `⚠️ Starts in ${mins} min!` : `Starts in ${mins} min`;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            <PageHeader title="My Timetable" titleHindi="मेरा समय सारणी" />

            <main className="max-w-5xl mx-auto px-4 lg:px-6 py-6 space-y-6">
                {/* View Tabs */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('today')}
                            className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
                                activeTab === 'today'
                                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            ⚡ Today's Live Schedule
                        </button>
                        <button
                            onClick={() => setActiveTab('week')}
                            className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
                                activeTab === 'week'
                                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            📅 Weekly Timetable View
                        </button>
                    </div>

                    {activeTab === 'week' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setWeekOffset(prev => prev - 1)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                                title="Previous Week"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setWeekOffset(0)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                                    weekOffset === 0
                                        ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-950/40 dark:border-primary-800 dark:text-primary-300'
                                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                {weekOffset === 0 ? 'This Week' : `${weekDays[0]?.formattedDate} - ${weekDays[5]?.formattedDate}`}
                            </button>
                            <button
                                onClick={() => setWeekOffset(prev => prev + 1)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                                title="Next Week"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {activeTab === 'today' && (
                    <>
                        {/* Holiday Banner */}
                        {isHoliday && (
                            <div className="card p-6 bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                        <Sun className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">Holiday Today!</h2>
                                        <p className="text-white/90 text-lg">{liveData.holiday?.title}</p>
                                        {liveData.holiday?.titleHindi && (
                                            <p className="text-white/70 text-sm">{liveData.holiday.titleHindi}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Live Period Card with Fluid Green Progress Bar */}
                        {currentPeriod && !isHoliday && (
                            <div className="card overflow-hidden shadow-lg border-2 border-emerald-500/50">
                                <div className={`bg-gradient-to-r ${SLOT_COLORS[currentPeriod.slotType] || SLOT_COLORS.lecture} p-6 text-white relative`}>
                                    <div className="flex items-start justify-between mb-4 relative z-10">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
                                                <span className="text-xs font-bold uppercase tracking-wider bg-black/30 px-2.5 py-0.5 rounded-full">
                                                    LIVE NOW — Period {currentPeriod.periodNumber}
                                                </span>
                                            </div>
                                            <h2 className="text-2xl font-bold mt-1">
                                                {currentPeriod.slotType === 'break_period' ? '☕ Break Time' :
                                                 currentPeriod.subject?.name || 'Free Period'}
                                            </h2>
                                            {currentPeriod.subject?.nameHindi && (
                                                <p className="text-white/70 text-sm">{currentPeriod.subject.nameHindi}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-mono font-extrabold tracking-tight">
                                                {String(remainingMinutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
                                            </div>
                                            <div className="text-xs text-white/70">remaining</div>
                                        </div>
                                    </div>

                                    {/* Fluid Green Progress Bar */}
                                    <div className="relative h-3.5 bg-black/25 rounded-full overflow-hidden mb-3 border border-white/20">
                                        <div
                                            className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-1000 shadow-sm"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between text-xs font-medium text-white/80">
                                        <span>{currentPeriod.startTime}</span>
                                        <span>{progressPercent}% covered</span>
                                        <span>{currentPeriod.endTime}</span>
                                    </div>

                                    {/* Teacher + Room + Class */}
                                    <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-medium">
                                        {currentPeriod.instructor && (
                                            <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                                <User className="w-3.5 h-3.5" />
                                                {currentPeriod.instructor.firstName} {currentPeriod.instructor.lastName}
                                            </span>
                                        )}
                                        {currentPeriod.timetable?.class && (
                                            <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                                <BookOpen className="w-3.5 h-3.5" />
                                                {currentPeriod.timetable.class.name}
                                            </span>
                                        )}
                                        {currentPeriod.roomNumber && (
                                            <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                                <MapPin className="w-3.5 h-3.5" />
                                                Room {currentPeriod.roomNumber}
                                            </span>
                                        )}

                                        {isInstructorOrAdmin && (
                                            <button
                                                type="button"
                                                onClick={(e) => handleOpenWorkLogModal(e, liveData?.dayOfWeek || 'monday', currentPeriod, currentPeriod)}
                                                className="ml-auto flex items-center gap-1.5 bg-white text-slate-900 px-3 py-1 rounded-full font-bold shadow-md hover:bg-slate-100 transition"
                                            >
                                                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                                                Log Work Done
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Next Period Peek */}
                                {nextPeriod && (
                                    <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                            <ChevronRight className="w-4 h-4 text-primary-500" />
                                            <span>Next Up: <strong>{nextPeriod.subject?.name || 'Free Period'}</strong></span>
                                            {nextPeriod.instructor && (
                                                <span className="text-slate-400">• {nextPeriod.instructor.firstName} {nextPeriod.instructor.lastName}</span>
                                            )}
                                        </div>
                                        <span className="text-xs font-mono font-semibold text-slate-500">{nextPeriod.startTime}–{nextPeriod.endTime}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Next Period Alert (when no current active period) */}
                        {!currentPeriod && nextPeriod && !isHoliday && (
                            <div className={`card p-5 ${nextPeriod.minutesUntilStart <= 5
                                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 dark:from-amber-900/20 dark:to-orange-900/20'
                                : 'bg-white dark:bg-slate-900'
                            }`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                        nextPeriod.minutesUntilStart <= 5
                                            ? 'bg-amber-100 text-amber-600'
                                            : 'bg-primary-100 text-primary-600'
                                    }`}>
                                        {nextPeriod.minutesUntilStart <= 5 ? <Bell className="w-6 h-6 animate-bounce" /> : <Timer className="w-6 h-6" />}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                                            Next: {nextPeriod.subject?.name || 'Period ' + nextPeriod.periodNumber}
                                        </h3>
                                        <p className="text-sm text-slate-500">{nextCountdown}</p>
                                    </div>
                                    <span className="text-sm font-mono text-slate-600 dark:text-slate-400">{nextPeriod.startTime}</span>
                                </div>
                            </div>
                        )}

                        {/* Today's Full Schedule with Past Graying */}
                        {!isHoliday && allSlots.length > 0 && (
                            <div className="card overflow-hidden">
                                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                                            Today's Periods — {DAY_LABELS[liveData?.dayOfWeek] || 'Today'}
                                        </h3>
                                        <p className="text-xs text-slate-500">{allSlots.length} periods configured</p>
                                    </div>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {allSlots.map((slot, i) => {
                                        const isCurrent = currentPeriod && slot.periodNumber === currentPeriod.periodNumber;
                                        const isPast = liveData?.currentTime > slot.endTime;
                                        const workKey = `${slot.id || slot.periodNumber}_${new Date().toISOString().split('T')[0]}`;
                                        const hasLoggedWork = !!loggedWorkMap[workKey];

                                        return (
                                            <div
                                                key={slot.id || i}
                                                className={`flex items-center gap-4 px-4 py-3 transition relative ${
                                                    isCurrent
                                                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-l-4 border-emerald-500'
                                                        : isPast
                                                            ? 'bg-slate-100/60 dark:bg-slate-800/40 opacity-70 hover:opacity-100'
                                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                }`}
                                            >
                                                <div className="w-14 text-center flex-shrink-0">
                                                    <div className="text-xs font-mono text-slate-500">{slot.startTime}</div>
                                                    <div className="text-[10px] text-slate-400">to</div>
                                                    <div className="text-xs font-mono text-slate-500">{slot.endTime}</div>
                                                </div>
                                                <div className={`w-1.5 h-10 rounded-full bg-gradient-to-b ${SLOT_COLORS[slot.slotType] || SLOT_COLORS.lecture}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate text-sm">
                                                            {slot.slotType === 'break_period' ? '☕ Break' :
                                                             slot.slotType === 'assembly' ? '🏫 Assembly' :
                                                             slot.slotType === 'sports' ? '⚽ Sports' :
                                                             slot.slotType === 'library' ? '📚 Library' :
                                                             slot.subject?.name || 'Free Period'}
                                                        </h4>
                                                        {hasLoggedWork && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                                                ✓ Work Logged
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                                        {slot.instructor && <span>{slot.instructor.firstName} {slot.instructor.lastName}</span>}
                                                        {slot.roomNumber && <span>Room {slot.roomNumber}</span>}
                                                        {slot.timetable?.class?.name && <span>{slot.timetable.class.name}</span>}
                                                    </div>
                                                </div>

                                                {isCurrent && (
                                                    <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full animate-pulse">
                                                        <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                                                        LIVE
                                                    </span>
                                                )}
                                                {isPast && (
                                                    <span className="text-xs text-slate-400 font-semibold">Done</span>
                                                )}

                                                {isInstructorOrAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleOpenWorkLogModal(e, liveData?.dayOfWeek || 'monday', { periodNumber: slot.periodNumber, startTime: slot.startTime, endTime: slot.endTime }, slot)}
                                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 hover:text-primary-600 transition"
                                                        title="Log Work Done"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'week' && (
                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-[850px]">
                                <thead>
                                    <tr className="bg-gradient-to-r from-primary-600 to-indigo-600 text-white">
                                        <th className="px-3 py-3 text-left text-sm font-semibold w-24">Period</th>
                                        {weekDays.map(dayObj => {
                                            const holiday = calendarHolidays[dayObj.dateStr];
                                            return (
                                                <th key={dayObj.dayKey} className={`px-3 py-2 text-center text-sm font-semibold transition ${dayObj.isToday ? 'bg-white/10 ring-2 ring-white/30' : ''}`}>
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex items-center gap-1">
                                                            <span>{dayObj.fullDateDisplay}</span>
                                                            {dayObj.isToday && (
                                                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 font-extrabold uppercase">
                                                                    Today
                                                                </span>
                                                            )}
                                                        </div>
                                                        {holiday && (
                                                            <div className="mt-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center gap-1 truncate max-w-[120px]" title={holiday.title}>
                                                                <PartyPopper className="w-3 h-3 flex-shrink-0" />
                                                                <span className="truncate">{holiday.title || 'Holiday'}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {DEFAULT_PERIODS.map((period) => (
                                        <tr key={period.periodNumber} className="border-b border-slate-100 dark:border-slate-800">
                                            <td className="px-3 py-2 border-r border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">P{period.periodNumber}</div>
                                                <div className="text-[10px] text-slate-500 font-mono">{period.startTime}-{period.endTime}</div>
                                            </td>
                                            {weekDays.map(dayObj => {
                                                const holiday = calendarHolidays[dayObj.dateStr];
                                                const daySlot = dayObj.isToday ? allSlots.find(s => s.periodNumber === period.periodNumber) : null;

                                                return (
                                                    <td key={dayObj.dayKey} className="px-1 py-1 border-r border-slate-100 dark:border-slate-800 align-top">
                                                        {holiday ? (
                                                            <div className="min-h-[55px] p-2 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg flex items-center justify-center text-center">
                                                                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                                                    🎉 {holiday.title || 'School Holiday'}
                                                                </span>
                                                            </div>
                                                        ) : daySlot ? (
                                                            <div className="min-h-[55px] p-2 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                                                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                                    {daySlot.subject?.name || daySlot.slotType}
                                                                </div>
                                                                {daySlot.instructor && (
                                                                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                                                        {daySlot.instructor.firstName} {daySlot.instructor.lastName?.[0]}.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="min-h-[55px] p-2 bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center">
                                                                <span className="text-[10px] text-slate-400">Regular Session</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Upcoming Holidays */}
                {upcomingHolidays.length > 0 && (
                    <div className="card p-4">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary-500" /> Upcoming School Holidays
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {upcomingHolidays.map(h => (
                                <div key={h.id} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl">
                                    <div className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">{h.title}</div>
                                    <div className="text-[11px] text-red-600 dark:text-red-400 mt-1 font-medium">
                                        {formatDate(h.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Period Work Log Modal */}
            <PeriodWorkLogModal
                isOpen={showWorkLogModal}
                onClose={() => setShowWorkLogModal(false)}
                period={workLogData.period}
                slot={workLogData.slot}
                day={workLogData.day}
                dateStr={workLogData.dateStr}
                currentUser={user}
                onWorkSaved={handleWorkSaved}
            />
        </div>
    );
}
