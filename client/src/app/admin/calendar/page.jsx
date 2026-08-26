'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Calendar, Plus, Trash2, Edit3, RefreshCw, ChevronLeft, ChevronRight,
    Sun, Star, BookOpen, Flag, Sparkles, Download, Clock, Info, AlertCircle,
    CheckCircle2, X
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { calendarAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { useConfirm } from '@/components/ConfirmDialog';
import { formatDate } from '@/lib/dateUtils';

const EVENT_TYPES = {
    // Holidays (School Closed)
    gazetted_holiday: { label: 'Gazetted Holiday', icon: Flag, color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40', isHolidayDefault: true },
    restricted_holiday: { label: 'Restricted Holiday', icon: Star, color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40', isHolidayDefault: true },
    summer_vacation: { label: 'Summer Vacation', icon: Sun, color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40', isHolidayDefault: true },
    winter_vacation: { label: 'Winter Vacation', icon: Sun, color: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/40', isHolidayDefault: true },

    // Events (School Open / Timed Activities)
    event: { label: 'School Event', icon: Sparkles, color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40', isHolidayDefault: false },
    exam_day: { label: 'Examination / Test', icon: BookOpen, color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40', isHolidayDefault: false },
    custom: { label: 'Custom Event / Activity', icon: Calendar, color: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700', isHolidayDefault: false },
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function AdminCalendarPage() {
    const router = useRouter();
    const confirm = useConfirm();
    const { user, isAuthenticated, _hasHydrated, selectedSessionId } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
    const [filterType, setFilterType] = useState('all'); // 'all', 'holidays', 'events'

    // Add/Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [form, setForm] = useState({
        date: '',
        title: '',
        titleHindi: '',
        type: 'gazetted_holiday',
        isHoliday: true,
        startTime: '',
        endTime: '',
        description: ''
    });

    // Seed Modal
    const [showSeedModal, setShowSeedModal] = useState(false);
    const [seeding, setSeeding] = useState(false);

    const isAdmin = user?.role === 'admin' || user?.role === 'principal';

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        if (!isAdmin) { router.push('/dashboard'); return; }
        loadEvents();
    }, [isAuthenticated, _hasHydrated, isAdmin, currentMonth, currentYear, selectedSessionId]);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const res = await calendarAPI.getEvents({
                month: currentMonth,
                year: currentYear,
                academicYearId: selectedSessionId
            });
            setEvents(res.data.data.events || []);
        } catch (error) {
            console.error('Error loading events:', error);
            toast.error('Failed to load calendar events');
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => {
        if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
        else setCurrentMonth(m => m - 1);
    };

    const handleNextMonth = () => {
        if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
        else setCurrentMonth(m => m + 1);
    };

    const handleAddHoliday = (dateStr = '') => {
        setEditingEvent(null);
        setForm({
            date: dateStr || `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
            title: '',
            titleHindi: '',
            type: 'gazetted_holiday',
            isHoliday: true,
            startTime: '',
            endTime: '',
            description: ''
        });
        setShowModal(true);
    };

    const handleAddEvent = (dateStr = '') => {
        setEditingEvent(null);
        setForm({
            date: dateStr || `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
            title: '',
            titleHindi: '',
            type: 'event',
            isHoliday: false,
            startTime: '09:00',
            endTime: '11:00',
            description: ''
        });
        setShowModal(true);
    };

    const handleEditEntry = (entry) => {
        setEditingEvent(entry);
        setForm({
            date: new Date(entry.date).toISOString().split('T')[0],
            title: entry.title || '',
            titleHindi: entry.titleHindi || '',
            type: entry.type || (entry.isHoliday ? 'gazetted_holiday' : 'event'),
            isHoliday: Boolean(entry.isHoliday),
            startTime: entry.startTime || '',
            endTime: entry.endTime || '',
            description: entry.description || ''
        });
        setShowModal(true);
    };

    const handleSaveEntry = async () => {
        if (!form.date || !form.title.trim()) {
            toast.error('Date and title are required');
            return;
        }

        try {
            if (editingEvent) {
                await calendarAPI.updateEvent(editingEvent.id, form);
                toast.success(form.isHoliday ? 'Holiday updated' : 'Event updated');
            } else {
                await calendarAPI.addEvent({
                    ...form,
                    academicYearId: selectedSessionId
                });
                toast.success(form.isHoliday ? 'Holiday added' : 'Event scheduled');
            }
            setShowModal(false);
            loadEvents();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save calendar entry');
        }
    };

    const handleDeleteEntry = async (entryId, e) => {
        e?.stopPropagation?.();
        const entryToDelete = events.find(x => x.id === entryId) || (editingEvent?.id === entryId ? editingEvent : null);
        const isHol = entryToDelete ? entryToDelete.isHoliday : form.isHoliday;
        const entryTitle = entryToDelete?.title || form.title || 'this entry';

        const ok = await confirm({
            title: isHol ? 'Delete Holiday?' : 'Delete Scheduled Event?',
            message: `Are you sure you want to delete "${entryTitle}" from the academic calendar?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger',
        });
        if (!ok) return;

        try {
            await calendarAPI.deleteEvent(entryId);
            toast.success(isHol ? 'Holiday deleted' : 'Event deleted');
            if (showModal) setShowModal(false);
            loadEvents();
        } catch (error) {
            toast.error('Failed to delete calendar entry');
        }
    };

    const handleSeedPunjab = async () => {
        setSeeding(true);
        try {
            const res = await calendarAPI.seedPunjabHolidays({
                academicYearId: selectedSessionId,
                year: currentYear
            });
            toast.success(res.data.message);
            setShowSeedModal(false);
            loadEvents();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to seed holidays');
        } finally {
            setSeeding(false);
        }
    };

    const handleSeedWeekends = async () => {
        const ok = await confirm({
            title: 'Mark 2nd Saturdays & Sundays as Holidays?',
            message: `This will mark all Sundays and 2nd Saturdays across the academic year (${currentYear}) as school holidays.`,
            confirmText: 'Mark Holidays',
            cancelText: 'Cancel',
            type: 'primary',
        });
        if (!ok) return;

        setSeeding(true);
        try {
            const res = await calendarAPI.seedWeekendHolidays({
                academicYearId: selectedSessionId,
                year: currentYear
            });
            toast.success(res.data.message);
            loadEvents();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to mark weekend holidays');
        } finally {
            setSeeding(false);
        }
    };

    // Calendar grid generation
    const calendarDays = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth - 1, 1);
        const lastDay = new Date(currentYear, currentMonth, 0);
        const startDayOfWeek = firstDay.getDay(); // 0=Sun
        const totalDays = lastDay.getDate();

        const days = [];

        // Empty cells for preceding days
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ day: null, holiday: null, timedEvents: [], allEntries: [] });
        }

        // Actual days
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEntries = events.filter(e => {
                const eventDate = new Date(e.date);
                return eventDate.getDate() === d && eventDate.getMonth() === currentMonth - 1 && eventDate.getFullYear() === currentYear;
            });

            // There can be at most one holiday per day
            const holiday = dayEntries.find(e => e.isHoliday) || null;
            // Multiple events can be scheduled at different times
            const timedEvents = dayEntries.filter(e => !e.isHoliday);

            days.push({
                day: d,
                dateStr,
                holiday,
                timedEvents,
                allEntries: dayEntries
            });
        }

        return days;
    }, [currentYear, currentMonth, events]);

    const today = new Date();
    const isToday = (day) => day === today.getDate() && currentMonth === today.getMonth() + 1 && currentYear === today.getFullYear();

    const holidayCount = useMemo(() => events.filter(e => e.isHoliday).length, [events]);
    const eventCount = useMemo(() => events.filter(e => !e.isHoliday).length, [events]);

    const filteredListEvents = useMemo(() => {
        if (filterType === 'holidays') return events.filter(e => e.isHoliday);
        if (filterType === 'events') return events.filter(e => !e.isHoliday);
        return events;
    }, [events, filterType]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <PageHeader title="School Calendar" titleHindi="विद्यालय कैलेंडर">
                <button onClick={() => handleAddHoliday()} className="btn bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-1.5 text-xs md:text-sm font-semibold">
                    <Flag className="w-4 h-4" /> + Holiday
                </button>
                <button onClick={() => handleAddEvent()} className="btn bg-purple-600 hover:bg-purple-700 text-white shadow-sm flex items-center gap-1.5 text-xs md:text-sm font-semibold">
                    <Sparkles className="w-4 h-4" /> + Event
                </button>
                <button onClick={handleSeedWeekends} disabled={seeding} className="btn btn-secondary text-xs md:text-sm">
                    <Calendar className="w-4 h-4 text-orange-500" /> 2nd Sat & Sun
                </button>
                <button onClick={() => setShowSeedModal(true)} className="btn btn-secondary text-xs md:text-sm">
                    <Download className="w-4 h-4" /> Punjab Holidays
                </button>
            </PageHeader>

            <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
                {/* Stats & Filters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <button
                        onClick={() => setFilterType(filterType === 'holidays' ? 'all' : 'holidays')}
                        className={`card p-4 text-left transition-all border-2 ${
                            filterType === 'holidays' ? 'border-red-500 bg-red-50/40 dark:bg-red-950/20 shadow-md' : 'border-transparent hover:border-slate-200'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                                <Flag className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{holidayCount}</p>
                                <p className="text-xs font-semibold text-slate-500">Holidays (Closed)</p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => setFilterType(filterType === 'events' ? 'all' : 'events')}
                        className={`card p-4 text-left transition-all border-2 ${
                            filterType === 'events' ? 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 shadow-md' : 'border-transparent hover:border-slate-200'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{eventCount}</p>
                                <p className="text-xs font-semibold text-slate-500">Events (Timed)</p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => setFilterType('all')}
                        className={`card p-4 text-left transition-all border-2 ${
                            filterType === 'all' ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-md' : 'border-transparent hover:border-slate-200'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{events.length}</p>
                                <p className="text-xs font-semibold text-slate-500">Total Entries</p>
                            </div>
                        </div>
                    </button>

                    <div className="card p-3 flex flex-col justify-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                                    viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                📅 Calendar View
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                                    viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                📋 List View
                            </button>
                        </div>
                        <div className="text-[11px] text-center text-slate-500">
                            {filterType === 'all' ? 'Showing all entries' : filterType === 'holidays' ? 'Showing holidays only' : 'Showing events only'}
                        </div>
                    </div>
                </div>

                {/* Month Navigation */}
                <div className="card p-4 mb-6 flex items-center justify-between shadow-xs">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {MONTHS[currentMonth - 1]} {currentYear}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {holidayCount} Holidays • {eventCount} Scheduled Events
                        </p>
                    </div>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Calendar View */}
                {viewMode === 'calendar' && (
                    <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="grid grid-cols-7 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="px-2 py-3 text-center text-xs uppercase tracking-wider">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 bg-slate-200 dark:bg-slate-800 gap-[1px]">
                            {calendarDays.map((cell, i) => (
                                <div
                                    key={i}
                                    className={`min-h-[110px] md:min-h-[130px] p-1.5 relative group/cell transition-colors flex flex-col justify-between ${
                                        cell.day ? 'bg-white dark:bg-slate-900 hover:bg-slate-50/90 dark:hover:bg-slate-850' : 'bg-slate-50/50 dark:bg-slate-950/40'
                                    } ${isToday(cell.day) ? 'ring-2 ring-inset ring-primary-500 bg-primary-50/20' : ''}`}
                                >
                                    {cell.day && (
                                        <>
                                            {/* Date Cell Header */}
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-xs font-bold ${
                                                        isToday(cell.day)
                                                            ? 'text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-950 px-1.5 py-0.2 rounded-full'
                                                            : cell.holiday
                                                                ? 'text-red-600 dark:text-red-400 font-black'
                                                                : 'text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {cell.day}
                                                    </span>
                                                    {cell.holiday && (
                                                        <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                                                            Holiday
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Add Actions on Hover */}
                                                <div className="opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center gap-0.5">
                                                    {!cell.holiday && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleAddHoliday(cell.dateStr); }}
                                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-600 rounded"
                                                            title={`Add Holiday on ${cell.dateStr}`}
                                                        >
                                                            <Flag className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAddEvent(cell.dateStr); }}
                                                        className="p-1 hover:bg-purple-100 dark:hover:bg-purple-950/60 text-purple-600 rounded"
                                                        title={`Add Event on ${cell.dateStr}`}
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Entries container */}
                                            <div className="space-y-1 overflow-y-auto max-h-[85px] scrollbar-thin">
                                                {/* 1. Full-day Holiday Banner (Max 1 per day) */}
                                                {cell.holiday && (
                                                    <div
                                                        onClick={() => handleEditEntry(cell.holiday)}
                                                        className="w-full text-left p-1.5 rounded-lg text-[10px] font-bold border bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-900/50 shadow-2xs cursor-pointer group/item flex items-center justify-between gap-1 transition hover:shadow-sm"
                                                    >
                                                        <div className="flex items-center gap-1 truncate min-w-0">
                                                            <Flag className="w-3 h-3 flex-shrink-0 text-red-600" />
                                                            <span className="truncate">{cell.holiday.title}</span>
                                                        </div>
                                                        {/* Quick Action buttons */}
                                                        <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleEditEntry(cell.holiday); }}
                                                                className="p-0.5 hover:bg-red-200 dark:hover:bg-red-800 rounded text-red-700 dark:text-red-200"
                                                                title="Edit Holiday"
                                                            >
                                                                <Edit3 className="w-2.5 h-2.5" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteEntry(cell.holiday.id, e)}
                                                                className="p-0.5 hover:bg-red-300 dark:hover:bg-red-700 rounded text-red-700 dark:text-red-200"
                                                                title="Delete Holiday"
                                                            >
                                                                <Trash2 className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 2. Timed Events (Multiple per day) */}
                                                {cell.timedEvents.map(evt => {
                                                    const typeInfo = EVENT_TYPES[evt.type] || EVENT_TYPES.event;
                                                    return (
                                                        <div
                                                            key={evt.id}
                                                            onClick={() => handleEditEntry(evt)}
                                                            className={`w-full text-left px-1.5 py-1 rounded text-[10px] font-medium border ${typeInfo.color} cursor-pointer group/item flex items-center justify-between gap-1 transition hover:opacity-90`}
                                                        >
                                                            <div className="truncate min-w-0 flex items-center gap-1">
                                                                {evt.startTime && (
                                                                    <span className="font-mono font-bold text-[9px] opacity-75">
                                                                        {evt.startTime}
                                                                    </span>
                                                                )}
                                                                <span className="truncate">{evt.title}</span>
                                                            </div>
                                                            {/* Quick Action buttons */}
                                                            <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleEditEntry(evt); }}
                                                                    className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                                                                    title="Edit Event"
                                                                >
                                                                    <Edit3 className="w-2.5 h-2.5" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleDeleteEntry(evt.id, e)}
                                                                    className="p-0.5 hover:bg-red-100 dark:hover:bg-red-950 text-red-600 rounded"
                                                                    title="Delete Event"
                                                                >
                                                                    <Trash2 className="w-2.5 h-2.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                    <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase text-slate-500">Filter:</span>
                                {['all', 'holidays', 'events'].map(ft => (
                                    <button
                                        key={ft}
                                        onClick={() => setFilterType(ft)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition ${
                                            filterType === ft
                                                ? 'bg-primary-600 text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                                        }`}
                                    >
                                        {ft} ({ft === 'all' ? events.length : ft === 'holidays' ? holidayCount : eventCount})
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredListEvents.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">
                                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="font-semibold">No {filterType} found for this month</p>
                                    <p className="text-xs text-slate-400 mt-1">Use the buttons above to add a holiday or schedule an event</p>
                                </div>
                            ) : filteredListEvents.map(entry => {
                                const typeInfo = EVENT_TYPES[entry.type] || (entry.isHoliday ? EVENT_TYPES.gazetted_holiday : EVENT_TYPES.event);
                                const Icon = typeInfo.icon;
                                return (
                                    <div key={entry.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                            entry.isHoliday ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                        }`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{entry.title}</h4>
                                                {entry.isHoliday ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                                                        School Closed
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                                                        Event (Open)
                                                    </span>
                                                )}
                                                {entry.startTime && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                        {entry.startTime} {entry.endTime ? `– ${entry.endTime}` : ''}
                                                    </span>
                                                )}
                                            </div>
                                            {entry.titleHindi && <p className="text-xs text-slate-500 truncate mt-0.5">{entry.titleHindi}</p>}
                                            {entry.description && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">{entry.description}</p>}
                                            <p className="text-xs text-slate-400 mt-1">
                                                {formatDate(entry.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>

                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${typeInfo.color}`}>
                                            {typeInfo.label}
                                        </span>

                                        {/* Action buttons: Edit & Delete */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleEditEntry(entry)}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition"
                                                title="Edit Entry"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteEntry(entry.id, e)}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-red-600 dark:text-red-400 transition"
                                                title="Delete Entry"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* Add / Edit Entry Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        {/* Modal Header with Type Switcher */}
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                    {editingEvent ? (form.isHoliday ? 'Edit Holiday' : 'Edit Event') : 'Add Calendar Entry'}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {form.isHoliday ? 'Full-day holiday (school closed)' : 'Timed event or activity (school open)'}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Mode Selector Tabs (Holiday vs Event) */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, isHoliday: true, type: 'gazetted_holiday' }))}
                                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                                        form.isHoliday
                                            ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    <Flag className="w-3.5 h-3.5" />
                                    <span>Holiday (School Closed)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, isHoliday: false, type: 'event' }))}
                                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                                        !form.isHoliday
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Scheduled Event (Timed)</span>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body Form */}
                        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                            {/* Date Field */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Date *</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                                    className="input w-full"
                                />
                            </div>

                            {/* Title (English) */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                                    {form.isHoliday ? 'Holiday Name (English) *' : 'Event Title *'}
                                </label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder={form.isHoliday ? "e.g., Independence Day" : "e.g., Annual Science Exhibition"}
                                    className="input w-full"
                                />
                            </div>

                            {/* Title (Regional / Hindi) */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                                    Regional Name (ਪੰਜਾਬੀ / हिंदी)
                                </label>
                                <input
                                    type="text"
                                    value={form.titleHindi}
                                    onChange={(e) => setForm(f => ({ ...f, titleHindi: e.target.value }))}
                                    placeholder="e.g., ਸੁਤੰਤਰਤਾ ਦਿਵਸ / स्वतंत्रता दिवस"
                                    className="input w-full"
                                />
                            </div>

                            {/* Type Selection */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Category Type</label>
                                <select
                                    value={form.type}
                                    onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                                    className="input w-full"
                                >
                                    {form.isHoliday ? (
                                        <>
                                            <option value="gazetted_holiday">Gazetted Holiday (ਗਜ਼ਟਿਡ ਛੁੱਟੀ)</option>
                                            <option value="restricted_holiday">Restricted Holiday (ਪ੍ਰਤਿਬੰਧਿਤ ਛੁੱਟੀ)</option>
                                            <option value="summer_vacation">Summer Vacation (ਗਰਮੀਆਂ ਦੀਆਂ ਛੁੱਟੀਆਂ)</option>
                                            <option value="winter_vacation">Winter Vacation (ਸਰਦੀਆਂ ਦੀਆਂ ਛੁੱਟੀਆਂ)</option>
                                            <option value="custom">Custom Holiday</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="event">School Event (ਸਮਾਗਮ)</option>
                                            <option value="exam_day">Examination / Test (ਪ੍ਰੀਖਿਆ)</option>
                                            <option value="custom">Activity / Session</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            {/* Timed Event specific fields: Start Time & End Time */}
                            {!form.isHoliday && (
                                <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-xl">
                                    <div>
                                        <label className="text-xs font-bold text-purple-900 dark:text-purple-300 mb-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Start Time
                                        </label>
                                        <input
                                            type="time"
                                            value={form.startTime}
                                            onChange={(e) => setForm(f => ({ ...f, startTime: e.target.value }))}
                                            className="input w-full text-xs font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-purple-900 dark:text-purple-300 mb-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> End Time
                                        </label>
                                        <input
                                            type="time"
                                            value={form.endTime}
                                            onChange={(e) => setForm(f => ({ ...f, endTime: e.target.value }))}
                                            className="input w-full text-xs font-mono"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Description / Notes */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Description & Notes</label>
                                <textarea
                                    rows={2}
                                    value={form.description}
                                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder={form.isHoliday ? "Optional holiday circular notes..." : "Venue, participants, schedule details..."}
                                    className="input w-full text-xs"
                                />
                            </div>

                            {/* Information Hint */}
                            <div className="text-[11px] p-2.5 rounded-lg flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                <Info className="w-4 h-4 flex-shrink-0 text-primary-500" />
                                <span>
                                    {form.isHoliday
                                        ? "There can be at most 1 holiday per day. If a holiday already exists on this date, saving will update it."
                                        : "Multiple events can be scheduled at different times on the same date without closing regular school."}
                                </span>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850">
                            {editingEvent ? (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteEntry(editingEvent.id)}
                                    className="btn bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950 dark:hover:bg-red-900 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center gap-1.5 text-xs font-bold"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete {form.isHoliday ? 'Holiday' : 'Event'}
                                </button>
                            ) : <div />}

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn btn-secondary text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveEntry}
                                    className={`btn text-xs font-bold text-white shadow-sm ${
                                        form.isHoliday ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'
                                    }`}
                                >
                                    {editingEvent ? 'Save Changes' : (form.isHoliday ? 'Add Holiday' : 'Schedule Event')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Seed Punjab Holidays Modal */}
            {showSeedModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                🇮🇳 Seed Punjab Gazetted Holidays
                            </h3>
                            <button onClick={() => setShowSeedModal(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5">
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                                Auto-seed <strong>20 official Punjab state holidays</strong> for {currentYear}, including Republic Day, Baisakhi, Diwali, Dussehra, Guru Nanak Dev Birthday, and more.
                            </p>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 max-h-48 overflow-y-auto text-xs space-y-1.5 border border-slate-200 dark:border-slate-700 font-medium">
                                <div className="text-slate-800 dark:text-slate-200">🇮🇳 Republic Day (26 Jan)</div>
                                <div className="text-slate-800 dark:text-slate-200">🎨 Holi (14 Mar)</div>
                                <div className="text-slate-800 dark:text-slate-200">🌾 Baisakhi (13 Apr)</div>
                                <div className="text-slate-800 dark:text-slate-200">🇮🇳 Independence Day (15 Aug)</div>
                                <div className="text-slate-800 dark:text-slate-200">🙏 Gandhi Jayanti (2 Oct)</div>
                                <div className="text-slate-800 dark:text-slate-200">⚔️ Dussehra (20–24 Oct)</div>
                                <div className="text-slate-800 dark:text-slate-200">🪔 Diwali (1 Nov)</div>
                                <div className="text-slate-800 dark:text-slate-200">🙏 Guru Nanak Dev Birthday (15 Nov)</div>
                                <div className="text-slate-800 dark:text-slate-200">🎄 Christmas (25 Dec)</div>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-3">
                                Holidays are marked as full-day school holidays (one per date). Existing holidays on the same date will be kept up-to-date.
                            </p>
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-2 bg-slate-50 dark:bg-slate-850">
                            <button onClick={() => setShowSeedModal(false)} className="btn btn-secondary flex-1 text-xs">
                                Cancel
                            </button>
                            <button onClick={handleSeedPunjab} disabled={seeding} className="btn btn-primary flex-1 text-xs font-bold">
                                {seeding ? 'Seeding...' : `Seed ${currentYear} Holidays`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
