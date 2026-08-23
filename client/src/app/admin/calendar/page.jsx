'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Calendar, Plus, Trash2, Edit3, RefreshCw, ChevronLeft, ChevronRight,
    Sun, Star, BookOpen, Flag, Sparkles, Download
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { calendarAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { useConfirm } from '@/components/ConfirmDialog';
import { formatDate } from '@/lib/dateUtils';

const EVENT_TYPES = {
    gazetted_holiday: { label: 'Gazetted Holiday', icon: Flag, color: 'bg-red-100 text-red-700 border-red-200' },
    restricted_holiday: { label: 'Restricted Holiday', icon: Star, color: 'bg-orange-100 text-orange-700 border-orange-200' },
    exam_day: { label: 'Exam Day', icon: BookOpen, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    event: { label: 'Event', icon: Sparkles, color: 'bg-purple-100 text-purple-700 border-purple-200' },
    custom: { label: 'Custom', icon: Calendar, color: 'bg-slate-100 text-slate-700 border-slate-200' },
    summer_vacation: { label: 'Summer Vacation', icon: Sun, color: 'bg-amber-100 text-amber-700 border-amber-200' },
    winter_vacation: { label: 'Winter Vacation', icon: Sun, color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
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

    // Add/Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [form, setForm] = useState({
        date: '', title: '', titleHindi: '', type: 'custom', isHoliday: true
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

    const handleAddEvent = () => {
        setEditingEvent(null);
        setForm({ date: '', title: '', titleHindi: '', type: 'custom', isHoliday: true });
        setShowModal(true);
    };

    const handleAddEventForDate = (dateStr) => {
        setEditingEvent(null);
        setForm({ date: dateStr || '', title: '', titleHindi: '', type: 'custom', isHoliday: true });
        setShowModal(true);
    };

    const handleEditEvent = (event) => {
        setEditingEvent(event);
        setForm({
            date: new Date(event.date).toISOString().split('T')[0],
            title: event.title,
            titleHindi: event.titleHindi || '',
            type: event.type,
            isHoliday: event.isHoliday
        });
        setShowModal(true);
    };

    const handleSaveEvent = async () => {
        if (!form.date || !form.title) {
            toast.error('Date and title are required');
            return;
        }

        try {
            if (editingEvent) {
                await calendarAPI.updateEvent(editingEvent.id, form);
                toast.success('Event updated');
            } else {
                await calendarAPI.addEvent({
                    ...form,
                    academicYearId: selectedSessionId
                });
                toast.success('Event added');
            }
            setShowModal(false);
            loadEvents();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save event');
        }
    };

    const handleDeleteEvent = async (eventId) => {
        const ok = await confirm({
            title: 'Delete Calendar Event?',
            message: 'Are you sure you want to delete this event from the academic calendar?',
            confirmText: 'Delete Event',
            cancelText: 'Cancel',
            type: 'danger',
        });
        if (!ok) return;

        try {
            await calendarAPI.deleteEvent(eventId);
            toast.success('Event deleted');
            loadEvents();
        } catch (error) {
            toast.error('Failed to delete event');
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
    const generateCalendarDays = () => {
        const firstDay = new Date(currentYear, currentMonth - 1, 1);
        const lastDay = new Date(currentYear, currentMonth, 0);
        const startDayOfWeek = firstDay.getDay(); // 0=Sun
        const totalDays = lastDay.getDate();

        const days = [];

        // Empty cells for preceding days
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ day: null, events: [] });
        }

        // Actual days
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEvents = events.filter(e => {
                const eventDate = new Date(e.date);
                return eventDate.getDate() === d && eventDate.getMonth() === currentMonth - 1 && eventDate.getFullYear() === currentYear;
            });
            days.push({ day: d, events: dayEvents, dateStr });
        }

        return days;
    };

    const calendarDays = generateCalendarDays();
    const today = new Date();
    const isToday = (day) => day === today.getDate() && currentMonth === today.getMonth() + 1 && currentYear === today.getFullYear();

    const holidayCount = events.filter(e => e.isHoliday).length;
    const eventCount = events.filter(e => !e.isHoliday).length;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <PageHeader title="School Calendar" titleHindi="विद्यालय कैलेंडर">
                <button onClick={handleAddEvent} className="btn btn-primary">
                    <Plus className="w-4 h-4" /> Add Event
                </button>
                <button onClick={handleSeedWeekends} disabled={seeding} className="btn btn-secondary">
                    <Calendar className="w-4 h-4 text-orange-500" /> Mark 2nd Sat & Sun
                </button>
                <button onClick={() => setShowSeedModal(true)} className="btn btn-secondary">
                    <Download className="w-4 h-4" /> Punjab Holidays
                </button>
            </PageHeader>

            <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                                <Flag className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{holidayCount}</p>
                                <p className="text-xs text-slate-500">Holidays</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{eventCount}</p>
                                <p className="text-xs text-slate-500">Events</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{events.length}</p>
                                <p className="text-xs text-slate-500">Total This Month</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4 flex items-center justify-center gap-2">
                        <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === 'calendar' ? 'bg-primary-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                            Calendar
                        </button>
                        <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                            List
                        </button>
                    </div>
                </div>

                {/* Month Navigation */}
                <div className="card p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-lg">
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {MONTHS[currentMonth - 1]} {currentYear}
                        </h2>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-lg">
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                </div>

                {/* Calendar View */}
                {viewMode === 'calendar' && (
                    <div className="card overflow-hidden">
                        <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="px-2 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">
                            {calendarDays.map((cell, i) => (
                                <div
                                    key={i}
                                    onDoubleClick={() => cell.dateStr && handleAddEventForDate(cell.dateStr)}
                                    className={`min-h-[85px] md:min-h-[105px] border-b border-r border-slate-100 dark:border-slate-800 p-1 relative group/cell transition-colors ${
                                        cell.day ? 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40' : 'bg-slate-50 dark:bg-slate-950'
                                    } ${isToday(cell.day) ? 'ring-2 ring-inset ring-primary-400' : ''}`}
                                >
                                    {cell.day && (
                                        <>
                                            <div className="flex items-center justify-between mb-1 px-1">
                                                <span className={`text-sm font-medium ${
                                                    isToday(cell.day)
                                                        ? 'text-primary-600 font-bold'
                                                        : cell.events.some(e => e.isHoliday)
                                                            ? 'text-red-600'
                                                            : 'text-slate-700 dark:text-slate-300'
                                                }`}>
                                                    {cell.day}
                                                </span>
                                                {/* Hover Add Event Icon Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddEventForDate(cell.dateStr);
                                                    }}
                                                    className="opacity-0 group-hover/cell:opacity-100 transition-opacity p-0.5 hover:bg-primary-100 dark:hover:bg-primary-900/50 text-primary-600 dark:text-primary-400 rounded cursor-pointer"
                                                    title={`Add event on ${cell.dateStr}`}
                                                    aria-label={`Add event on ${cell.dateStr}`}
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            {cell.events.map(e => {
                                                const typeInfo = EVENT_TYPES[e.type] || EVENT_TYPES.custom;
                                                return (
                                                    <button
                                                        key={e.id}
                                                        onClick={() => handleEditEvent(e)}
                                                        className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate mb-0.5 border ${typeInfo.color} hover:opacity-80 transition`}
                                                        title={e.title}
                                                    >
                                                        {e.title}
                                                    </button>
                                                );
                                            })}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                    <div className="card overflow-hidden">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {events.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">No events this month</div>
                            ) : events.map(event => {
                                const typeInfo = EVENT_TYPES[event.type] || EVENT_TYPES.custom;
                                const Icon = typeInfo.icon;
                                return (
                                    <div key={event.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeInfo.color.split(' ')[0]}`}>
                                            <Icon className={`w-5 h-5 ${typeInfo.color.split(' ')[1]}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">{event.title}</h4>
                                            {event.titleHindi && <p className="text-xs text-slate-500 truncate">{event.titleHindi}</p>}
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {formatDate(event.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-[10px] font-medium border ${typeInfo.color}`}>
                                            {typeInfo.label}
                                        </span>
                                        {event.isHoliday && (
                                            <span className="px-2 py-1 rounded text-[10px] font-medium bg-red-100 text-red-700">
                                                Holiday
                                            </span>
                                        )}
                                        <span className="text-[10px] text-slate-400 capitalize">{event.source?.replace('_', ' ')}</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleEditEvent(event)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                                                <Edit3 className="w-4 h-4 text-slate-500" />
                                            </button>
                                            <button onClick={() => handleDeleteEvent(event.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* Add/Edit Event Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-xl">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                {editingEvent ? 'Edit Event' : 'Add Calendar Event'}
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Date *</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Title (English) *</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="e.g., Republic Day"
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Title (Hindi)</label>
                                <input
                                    type="text"
                                    value={form.titleHindi}
                                    onChange={(e) => setForm(f => ({ ...f, titleHindi: e.target.value }))}
                                    placeholder="e.g., गणतंत्र दिवस"
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Type</label>
                                <select
                                    value={form.type}
                                    onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                                    className="input w-full"
                                >
                                    {Object.entries(EVENT_TYPES).map(([value, info]) => (
                                        <option key={value} value={value}>{info.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="isHoliday"
                                    checked={form.isHoliday}
                                    onChange={(e) => setForm(f => ({ ...f, isHoliday: e.target.checked }))}
                                    className="w-4 h-4 rounded border-slate-300"
                                />
                                <label htmlFor="isHoliday" className="text-sm text-slate-700 dark:text-slate-300">
                                    Mark as Holiday (school closed)
                                </label>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                            <button onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                            <button onClick={handleSaveEvent} className="btn btn-primary flex-1">
                                {editingEvent ? 'Update' : 'Add Event'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Seed Punjab Holidays Modal */}
            {showSeedModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-xl">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                🇮🇳 Seed Punjab Holidays
                            </h3>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 dark:text-slate-400 mb-4">
                                This will auto-add <strong>20 Punjab state gazetted holidays</strong> for {currentYear}, including:
                            </p>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 max-h-48 overflow-y-auto text-sm space-y-1">
                                <div className="text-slate-700 dark:text-slate-300">🇮🇳 Republic Day (Jan 26)</div>
                                <div className="text-slate-700 dark:text-slate-300">🎨 Holi (Mar 14)</div>
                                <div className="text-slate-700 dark:text-slate-300">🌾 Baisakhi (Apr 13)</div>
                                <div className="text-slate-700 dark:text-slate-300">🇮🇳 Independence Day (Aug 15)</div>
                                <div className="text-slate-700 dark:text-slate-300">🙏 Gandhi Jayanti (Oct 2)</div>
                                <div className="text-slate-700 dark:text-slate-300">⚔️ Dussehra (Oct 20–24)</div>
                                <div className="text-slate-700 dark:text-slate-300">🪔 Diwali (Nov 1)</div>
                                <div className="text-slate-700 dark:text-slate-300">🙏 Guru Nanak Dev Birthday (Nov 15)</div>
                                <div className="text-slate-700 dark:text-slate-300">🎄 Christmas (Dec 25)</div>
                                <div className="text-slate-500 text-xs mt-2">...and more</div>
                            </div>
                            <p className="text-xs text-slate-500 mt-3">
                                Existing holidays on the same dates will not be duplicated.
                            </p>
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                            <button onClick={() => setShowSeedModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                            <button onClick={handleSeedPunjab} disabled={seeding} className="btn btn-primary flex-1">
                                {seeding ? 'Seeding...' : `Seed ${currentYear} Holidays`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
