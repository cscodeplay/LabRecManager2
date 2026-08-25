'use client';

import React, { useState, useMemo } from 'react';
import {
    Sparkles, Bot, Clock, BookOpen, User, Check,
    X, AlertCircle, RefreshCw, Plus, Trash2, ArrowRight,
    Calendar, MapPin, Layers, CheckCircle2, ChevronRight
} from 'lucide-react';
import api, { timetableAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_FULL_LABELS = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday'
};

const DAY_BADGE_COLORS = {
    monday: 'bg-blue-600 text-white',
    tuesday: 'bg-indigo-600 text-white',
    wednesday: 'bg-purple-600 text-white',
    thursday: 'bg-teal-600 text-white',
    friday: 'bg-emerald-600 text-white',
    saturday: 'bg-amber-600 text-white'
};

const SUGGESTIONS = [
    "Set Mon to Thu 2nd Period Computer Science for instructor Charanpreet Singh",
    "Set Mon, Wed, Fri Period 1 to Mathematics and Period 2 to Physics",
    "Schedule 2 consecutive periods for Computer Lab on Tuesday",
    "Create a balanced weekly schedule for core subjects with Break at Period 4"
];

const SLOT_TYPES = [
    { value: 'lecture', label: 'Theory Lecture' },
    { value: 'lab', label: 'Practical / Lab' },
    { value: 'break_period', label: 'Break' },
    { value: 'assembly', label: 'Assembly' },
    { value: 'sports', label: 'Sports / PE' },
    { value: 'library', label: 'Library' },
    { value: 'free', label: 'Free Period' }
];

export default function AITimetableGeneratorModal({
    isOpen,
    onClose,
    timetable,
    classId,
    periodStructure = [],
    existingSlots = {},
    subjects = [],
    instructors = [],
    onSlotsApplied
}) {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [provider, setProvider] = useState('groq');
    
    // AI generated slots staging
    const [generatedSlots, setGeneratedSlots] = useState([]);
    const [hasGenerated, setHasGenerated] = useState(false);
    const [classDetails, setClassDetails] = useState(null);

    // Summary calculation for the AI preview card header
    const summary = useMemo(() => {
        if (!generatedSlots.length) return null;
        const days = Array.from(new Set(generatedSlots.map(s => DAY_FULL_LABELS[s.dayOfWeek] || s.dayOfWeek)));
        const periods = Array.from(new Set(generatedSlots.map(s => `P${s.periodNumber}`)));
        const subjNames = Array.from(new Set(generatedSlots.map(s => {
            const matched = subjects.find(sub => sub.id === s.subjectId);
            return matched?.name || s.subjectName || 'Lecture';
        })));
        const instNames = Array.from(new Set(generatedSlots.map(s => {
            const matched = instructors.find(ins => ins.id === s.instructorId);
            return matched ? `${matched.firstName} ${matched.lastName || ''}`.trim() : (s.instructorName || 'Unassigned');
        })));

        return {
            daysStr: days.join(', '),
            periodStr: periods.join(', '),
            subjectStr: subjNames.join(', '),
            instructorStr: instNames.join(', '),
            count: generatedSlots.length
        };
    }, [generatedSlots, subjects, instructors]);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error('Please enter a scheduling prompt for the AI');
            return;
        }

        setIsGenerating(true);
        try {
            const res = await api.post('/ai/generate-timetable-slots', {
                prompt,
                classId,
                periodStructure,
                existingSlots,
                provider
            });

            const rawSlots = res.data?.data?.slots || [];
            setClassDetails(res.data?.data?.classInfo || null);

            if (rawSlots.length === 0) {
                toast.error('AI could not identify specific slots from prompt. Please provide more details.');
            } else {
                setGeneratedSlots(rawSlots);
                setHasGenerated(true);
                toast.success(`AI drafted ${rawSlots.length} timetable slot(s)!`, { icon: '✨' });
            }
        } catch (error) {
            console.error('AI Timetable generation failed:', error);
            toast.error(error.response?.data?.message || 'Failed to generate timetable slots');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSlotChange = (index, field, value) => {
        setGeneratedSlots(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    const handleAddSlot = () => {
        const lastSlot = generatedSlots[generatedSlots.length - 1];
        setGeneratedSlots(prev => [
            ...prev,
            {
                dayOfWeek: lastSlot?.dayOfWeek || 'friday',
                periodNumber: lastSlot?.periodNumber || 1,
                startTime: lastSlot?.startTime || '08:00',
                endTime: lastSlot?.endTime || '08:40',
                subjectId: lastSlot?.subjectId || null,
                subjectName: lastSlot?.subjectName || '',
                instructorId: lastSlot?.instructorId || null,
                instructorName: lastSlot?.instructorName || '',
                roomNumber: lastSlot?.roomNumber || 'Room 101',
                slotType: lastSlot?.slotType || 'lecture',
                isNew: true
            }
        ]);
    };

    const handleRemoveSlot = (index) => {
        setGeneratedSlots(prev => prev.filter((_, i) => i !== index));
    };

    const handleApplyToTimetable = async () => {
        if (!timetable?.id) {
            toast.error('No active timetable found to apply slots');
            return;
        }

        if (generatedSlots.length === 0) {
            toast.error('No slots to apply');
            return;
        }

        setIsApplying(true);
        try {
            // Format slots for timetableAPI.bulkAddSlots
            const formattedSlots = generatedSlots.map(s => {
                const p = periodStructure.find(ps => ps.periodNumber === s.periodNumber);
                return {
                    dayOfWeek: s.dayOfWeek,
                    periodNumber: s.periodNumber,
                    startTime: s.startTime || p?.startTime || '08:00',
                    endTime: s.endTime || p?.endTime || '08:40',
                    subjectId: s.subjectId || null,
                    instructorId: s.instructorId || null,
                    roomNumber: s.roomNumber || null,
                    slotType: s.slotType || 'lecture'
                };
            });

            await timetableAPI.addBulkSlots(timetable.id, { slots: formattedSlots });
            toast.success(`Successfully applied ${formattedSlots.length} slot(s) to timetable!`, { icon: '🎉' });
            if (onSlotsApplied) onSlotsApplied();
            onClose();
        } catch (error) {
            console.error('Failed to apply slots:', error);
            toast.error(error.response?.data?.message || 'Failed to apply slots to timetable');
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-50 via-white to-indigo-50 dark:from-slate-900 dark:via-purple-950/20 dark:to-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                AI Timetable Assistant
                                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                    Natural Language Scheduler
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Enter your scheduling instructions — AI drafts editable timetable slot cards
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[72vh] space-y-5 flex-1">
                    {/* Prompt Input Box */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                Prompt Instructions
                            </label>
                            {timetable?.class?.name && (
                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                    Target Class: <strong className="text-slate-900 dark:text-white">{timetable.class.name}</strong>
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <textarea
                                rows={3}
                                className="input w-full py-2.5 text-xs leading-relaxed pr-28 rounded-xl border-purple-200 focus:border-purple-500 dark:border-slate-700"
                                placeholder="e.g., set Mon to Thu 2nd Period Computer Science for class 12 Medical A for instructor Charanpreet Singh..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                            <div className="absolute right-2.5 bottom-2.5">
                                <button
                                    type="button"
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !prompt.trim()}
                                    className="btn btn-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg shadow-md shadow-purple-500/20 hover:opacity-95 transition disabled:opacity-50"
                                >
                                    <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                                    {isGenerating ? 'Drafting...' : 'Generate Card'}
                                </button>
                            </div>
                        </div>

                        {/* Quick Prompts Chips */}
                        <div className="pt-1">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                Try Sample Prompts:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {SUGGESTIONS.map((sug, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setPrompt(sug)}
                                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-100 hover:text-purple-800 dark:hover:bg-purple-950/50 dark:hover:text-purple-300 transition text-left border border-slate-200 dark:border-slate-700"
                                    >
                                        💡 {sug}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* AI Generated Editable Card */}
                    {hasGenerated && (
                        <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                            {/* Summary Card Header */}
                            {summary && (
                                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg flex flex-wrap items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                                                ✨ AI Generated Schedule Plan
                                            </span>
                                            <span className="text-xs font-semibold text-purple-100">
                                                {summary.count} Slot{summary.count > 1 ? 's' : ''} Ready
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/90">
                                            <span><strong>Days:</strong> {summary.daysStr}</span>
                                            <span><strong>Period:</strong> {summary.periodStr}</span>
                                            <span><strong>Subject:</strong> {summary.subjectStr}</span>
                                            <span><strong>Instructor:</strong> {summary.instructorStr}</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddSlot}
                                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold flex items-center gap-1 backdrop-blur-sm transition"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Slot
                                    </button>
                                </div>
                            )}

                            {generatedSlots.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                        No slots in draft
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Try submitting a new prompt above
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                                    {generatedSlots.map((slot, idx) => {
                                        const p = periodStructure.find(ps => ps.periodNumber === slot.periodNumber);
                                        const timeDisplay = slot.startTime && slot.endTime ? `${slot.startTime} - ${slot.endTime}` : (p ? `${p.startTime} - ${p.endTime}` : '08:40 - 09:20');

                                        return (
                                            <div
                                                key={idx}
                                                className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-wrap items-center gap-3 text-xs shadow-sm hover:border-purple-300 dark:hover:border-purple-700 transition"
                                            >
                                                {/* Day & Period Badge */}
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <select
                                                        className="select select-sm font-bold bg-purple-600 text-white text-xs py-1 rounded-lg border-0 shadow-sm"
                                                        value={slot.dayOfWeek}
                                                        onChange={(e) => handleSlotChange(idx, 'dayOfWeek', e.target.value)}
                                                    >
                                                        {DAYS.map(d => (
                                                            <option key={d} value={d} className="text-slate-900 bg-white">
                                                                {DAY_FULL_LABELS[d]}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                                                            Period {slot.periodNumber}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {timeDisplay}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Subject Select */}
                                                <div className="flex-1 min-w-[150px]">
                                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-0.5">
                                                        Subject
                                                    </label>
                                                    <select
                                                        className="select select-sm w-full bg-white dark:bg-slate-900 text-xs py-1 rounded-lg border-slate-300 dark:border-slate-700 font-medium"
                                                        value={slot.subjectId || ''}
                                                        onChange={(e) => {
                                                            const selected = subjects.find(s => s.id === e.target.value);
                                                            handleSlotChange(idx, 'subjectId', e.target.value);
                                                            if (selected) handleSlotChange(idx, 'subjectName', selected.name);
                                                        }}
                                                    >
                                                        <option value="">{slot.subjectName ? `Custom: ${slot.subjectName}` : 'Select Subject...'}</option>
                                                        {subjects.map(s => (
                                                            <option key={s.id} value={s.id}>{s.name} ({s.code || 'Sub'})</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Instructor Select */}
                                                <div className="flex-1 min-w-[150px]">
                                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-0.5">
                                                        Instructor
                                                    </label>
                                                    <select
                                                        className="select select-sm w-full bg-white dark:bg-slate-900 text-xs py-1 rounded-lg border-slate-300 dark:border-slate-700 font-medium"
                                                        value={slot.instructorId || ''}
                                                        onChange={(e) => {
                                                            const selected = instructors.find(ins => ins.id === e.target.value);
                                                            handleSlotChange(idx, 'instructorId', e.target.value);
                                                            if (selected) handleSlotChange(idx, 'instructorName', `${selected.firstName} ${selected.lastName || ''}`.trim());
                                                        }}
                                                    >
                                                        <option value="">{slot.instructorName ? `Custom: ${slot.instructorName}` : 'Select Instructor...'}</option>
                                                        {instructors.map(ins => (
                                                            <option key={ins.id} value={ins.id}>{ins.firstName} {ins.lastName}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Room Number */}
                                                <div className="w-24">
                                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-0.5">
                                                        Room / Lab
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Room 101"
                                                        className="input input-sm w-full bg-white dark:bg-slate-900 text-xs py-1 rounded-lg border-slate-300 dark:border-slate-700"
                                                        value={slot.roomNumber || ''}
                                                        onChange={(e) => handleSlotChange(idx, 'roomNumber', e.target.value)}
                                                    />
                                                </div>

                                                {/* Slot Type */}
                                                <div className="w-28">
                                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-0.5">
                                                        Type
                                                    </label>
                                                    <select
                                                        className="select select-sm w-full bg-white dark:bg-slate-900 text-xs py-1 rounded-lg border-slate-300 dark:border-slate-700 font-medium"
                                                        value={slot.slotType || 'lecture'}
                                                        onChange={(e) => handleSlotChange(idx, 'slotType', e.target.value)}
                                                    >
                                                        {SLOT_TYPES.map(st => (
                                                            <option key={st.value} value={st.value}>{st.label}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Delete Slot */}
                                                <div className="pt-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveSlot(idx)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                                                        title="Remove this slot"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isApplying}
                        className="btn btn-sm btn-secondary text-xs"
                    >
                        Cancel
                    </button>

                    <div className="flex items-center gap-2">
                        {hasGenerated && generatedSlots.length > 0 && (
                            <button
                                type="button"
                                onClick={handleApplyToTimetable}
                                disabled={isApplying}
                                className="btn btn-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white flex items-center gap-1.5 text-xs px-6 py-2 rounded-xl shadow-lg shadow-emerald-500/20 font-bold transition"
                            >
                                <Check className="w-4 h-4" />
                                {isApplying ? 'Applying to Timetable...' : `Apply ${generatedSlots.length} Slots to Timetable`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
