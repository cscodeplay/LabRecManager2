'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { dashboardAPI } from '@/lib/api';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_COLORS = {
    graded: 'bg-emerald-500',
    submitted: 'bg-blue-500',
    pending: 'bg-amber-500',
    overdue: 'bg-red-500',
    needs_revision: 'bg-orange-500',
    in_progress: 'bg-purple-500'
};

export default function AssignmentCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarItems, setCalendarItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null); // 0 = left month, 1 = right month

    const month1 = currentDate.getMonth();
    const year1 = currentDate.getFullYear();
    const month2 = month1 === 11 ? 0 : month1 + 1;
    const year2 = month1 === 11 ? year1 + 1 : year1;

    useEffect(() => {
        loadCalendarData();
    }, [month1, year1]);

    const loadCalendarData = async () => {
        setLoading(true);
        try {
            // Load data for both months
            const [res1, res2] = await Promise.all([
                dashboardAPI.getCalendar(month1, year1),
                dashboardAPI.getCalendar(month2, year2)
            ]);
            const items1 = res1.data.data.calendarItems || [];
            const items2 = res2.data.data.calendarItems || [];
            setCalendarItems([...items1, ...items2]);
        } catch (err) {
            console.error('Failed to load calendar:', err);
        } finally {
            setLoading(false);
        }
    };

    const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

    const goToPrevMonth = () => setCurrentDate(new Date(year1, month1 - 1, 1));
    const goToNextMonth = () => setCurrentDate(new Date(year1, month1 + 1, 1));
    const goToToday = () => { setCurrentDate(new Date()); setSelectedDay(null); setSelectedMonth(null); };

    // Group items by day for graded/submitted dates AND track due dates
    const getItemsForMonth = (month, year) => {
        const gradedByDay = {};
        const dueByDay = {};

        calendarItems.forEach(item => {
            // Mark by gradedAt if graded, otherwise by submittedAt if submitted
            const markDate = item.gradedAt ? new Date(item.gradedAt) :
                item.submittedAt ? new Date(item.submittedAt) : null;

            if (markDate && markDate.getMonth() === month && markDate.getFullYear() === year) {
                const day = markDate.getDate();
                if (!gradedByDay[day]) gradedByDay[day] = [];
                gradedByDay[day].push(item);
            }

            // Track due dates separately
            if (item.dueDate) {
                const dueDate = new Date(item.dueDate);
                if (dueDate.getMonth() === month && dueDate.getFullYear() === year) {
                    const day = dueDate.getDate();
                    if (!dueByDay[day]) dueByDay[day] = [];
                    dueByDay[day].push(item);
                }
            }
        });

        return { gradedByDay, dueByDay };
    };

    const today = new Date();

    const renderMonth = (month, year, monthIndex) => {
        const daysInMonth = getDaysInMonth(month, year);
        const firstDay = getFirstDayOfMonth(month, year);
        const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
        const { gradedByDay, dueByDay } = getItemsForMonth(month, year);

        const calendarDays = [];
        for (let i = 0; i < firstDay; i++) calendarDays.push(null);
        for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day);

        return (
            <div className="flex-1 min-w-0">
                <div className="text-center mb-2">
                    <h4 className="text-sm font-semibold text-slate-700">{MONTHS[month]} {year}</h4>
                </div>

                {/* Days header */}
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {DAYS.map((day, i) => (
                        <div key={i} className="text-center text-[10px] font-medium text-slate-400 py-1">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-0.5">
                    {calendarDays.map((day, idx) => {
                        if (day === null) {
                            return <div key={`empty-${idx}`} className="h-8"></div>;
                        }

                        const isToday = isCurrentMonth && day === today.getDate();
                        const gradedItems = gradedByDay[day] || [];
                        const dueItems = dueByDay[day] || [];
                        const hasGraded = gradedItems.length > 0;
                        const hasDue = dueItems.length > 0;
                        const isSelected = selectedDay === day && selectedMonth === monthIndex;

                        return (
                            <button
                                key={day}
                                onClick={() => {
                                    if (hasGraded || hasDue) {
                                        setSelectedDay(isSelected ? null : day);
                                        setSelectedMonth(isSelected ? null : monthIndex);
                                    }
                                }}
                                className={`
                                    h-8 rounded text-[11px] relative flex flex-col items-center justify-center transition-all
                                    ${isToday ? 'bg-primary-100 text-primary-700 font-bold' : 'text-slate-600'}
                                    ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : ''}
                                    ${(hasGraded || hasDue) ? 'cursor-pointer hover:bg-slate-100' : 'cursor-default'}
                                `}
                            >
                                <span>{day}</span>

                                {/* Indicators row */}
                                <div className="flex items-center gap-0.5 absolute bottom-0.5">
                                    {/* Graded/submitted dots */}
                                    {hasGraded && gradedItems.slice(0, 2).map((item, i) => (
                                        <div
                                            key={i}
                                            className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[item.status] || STATUS_COLORS.pending}`}
                                        />
                                    ))}
                                    {gradedItems.length > 2 && (
                                        <span className="text-[8px] text-slate-400">+{gradedItems.length - 2}</span>
                                    )}

                                    {/* Due date clock icon */}
                                    {hasDue && (
                                        <div className="flex items-center">
                                            <Clock className="w-2.5 h-2.5 text-amber-500" />
                                            {dueItems.length > 1 && (
                                                <span className="text-[8px] text-amber-600 font-medium">{dueItems.length}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Get selected day items
    const getSelectedItems = () => {
        if (selectedDay === null || selectedMonth === null) return { graded: [], due: [] };

        const month = selectedMonth === 0 ? month1 : month2;
        const year = selectedMonth === 0 ? year1 : year2;
        const { gradedByDay, dueByDay } = getItemsForMonth(month, year);

        return {
            graded: gradedByDay[selectedDay] || [],
            due: dueByDay[selectedDay] || []
        };
    };

    const selectedItems = getSelectedItems();

    return (
        <div className="card overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-primary-50 to-accent-50">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary-600" />
                    <h3 className="font-semibold text-sm text-slate-900">Assignment Calendar</h3>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={goToPrevMonth} className="p-1 rounded hover:bg-white/60 transition">
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <button onClick={goToToday} className="px-2 py-0.5 text-xs font-medium text-primary-600 hover:bg-white/60 rounded transition">
                        Today
                    </button>
                    <button onClick={goToNextMonth} className="p-1 rounded hover:bg-white/60 transition">
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                </div>
            </div>

            <div className="p-3">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-3 border-primary-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <>
                        {/* Two months side by side */}
                        <div className="flex gap-3">
                            {renderMonth(month1, year1, 0)}
                            <div className="w-px bg-slate-200"></div>
                            {renderMonth(month2, year2, 1)}
                        </div>

                        {/* Legend */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-[10px]">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-slate-500">Graded</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-slate-500">Submitted</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-amber-500" />
                                <span className="text-slate-500">Due</span>
                            </div>
                        </div>

                        {/* Selected day details */}
                        {selectedDay !== null && (selectedItems.graded.length > 0 || selectedItems.due.length > 0) && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <h5 className="text-xs font-semibold text-slate-700 mb-2">
                                    {MONTHS[selectedMonth === 0 ? month1 : month2]} {selectedDay}
                                </h5>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {/* Graded items */}
                                    {selectedItems.graded.map((item, i) => (
                                        <div key={`g-${i}`} className="flex items-center gap-2 text-xs">
                                            <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[item.status]}`} />
                                            <span className="flex-1 truncate font-medium">{item.title}</span>
                                            {item.gradedAt && (
                                                <span className="text-emerald-600 text-[10px]">
                                                    ✓ {new Date(item.gradedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    {/* Due items (only show if not already in graded) */}
                                    {selectedItems.due.filter(d => !selectedItems.graded.find(g => g.id === d.id)).map((item, i) => (
                                        <div key={`d-${i}`} className="flex items-center gap-2 text-xs text-amber-700">
                                            <Clock className="w-3 h-3" />
                                            <span className="flex-1 truncate">Due: {item.title}</span>
                                            <span className="text-[10px]">
                                                {new Date(item.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
