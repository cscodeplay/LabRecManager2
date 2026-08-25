'use client';

import React, { useState } from 'react';
import {
    Sparkles, Bot, Clock, BookOpen, User, Check,
    X, AlertCircle, RefreshCw, Plus, Trash2, ArrowRight
} from 'lucide-react';
import api, { timetableAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat'
};

const SUGGESTIONS = [
    "Set Mon, Wed, Fri Period 1 to Mathematics and Period 2 to Physics",
    "Schedule 2 consecutive periods for Computer Lab on Tuesday",
    "Set Saturday morning assembly in Period 1 and Sports in Period 4",
    "Create a balanced weekly schedule for all 6 core subjects with 1 break at Period 4"
];

const SLOT_TYPES = [
    { value: 'lecture', label: 'Lecture' },
    { value: 'lab', label: 'Lab' },
    { value: 'break_period', label: 'Break' },
    { value: 'assembly', label: 'Assembly' },
    { value: 'sports', label: 'Sports' },
    { value: 'library', label: 'Library' },
    { value: 'free', label: 'Free' }
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
            if (rawSlots.length === 0) {
                toast.error('AI could not identify specific slots from prompt. Please provide more details.');
            } else {
                setGeneratedSlots(rawSlots);
                setHasGenerated(true);
                toast.success(`AI suggested ${rawSlots.length} timetable slot(s)!`, { icon: '✨' });
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
                // Find matching period from periodStructure if times not set
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
            toast.success(`Successfully added ${formattedSlots.length} slot(s) to timetable!`, { icon: '🎉' });
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
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                AI Timetable Assistant
                                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                    Smart Scheduling
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Describe lectures, periods, days, and subjects in natural language — AI will draft the schedule
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
                <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5 flex-1">
                    {/* Prompt Box */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            Prompt / Scheduling Instructions
                        </label>
                        <div className="relative">
                            <textarea
                                rows={3}
                                className="input w-full py-2.5 text-xs leading-relaxed pr-24"
                                placeholder="e.g., Set Period 1 on Mon, Wed, Fri to Physics with Dr. Sharma in Room 101, and Period 2 to Chemistry Lab on Tuesday..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                            <div className="absolute right-2 bottom-2.5 flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !prompt.trim()}
                                    className="btn btn-sm btn-primary flex items-center gap-1.5 text-xs px-3 shadow-sm"
                                >
                                    <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                                    {isGenerating ? 'Drafting...' : 'Generate'}
                                </button>
                            </div>
                        </div>

                        {/* Quick Prompts Chips */}
                        <div className="pt-1">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                                Quick Prompt Templates:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {SUGGESTIONS.map((sug, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setPrompt(sug)}
                                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/40 transition text-left"
                                    >
                                        💡 {sug}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* AI Preview Card / Staged Slots */}
                    {hasGenerated && (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                    AI Proposed Timetable Slots ({generatedSlots.length})
                                </h3>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Review, adjust any field, or remove slots before applying
                                </span>
                            </div>

                            {generatedSlots.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                        No slots in draft
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Try writing a new prompt above
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                    {generatedSlots.map((slot, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-xl flex flex-wrap items-center gap-2.5 text-xs animate-in fade-in duration-150"
                                        >
                                            {/* Day & Period Badge */}
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <span className="font-bold px-2 py-1 rounded-md bg-purple-600 text-white uppercase text-[11px]">
                                                    {DAY_LABELS[slot.dayOfWeek] || slot.dayOfWeek}
                                                </span>
                                                <span className="font-semibold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                                                    Period {slot.periodNumber}
                                                </span>
                                            </div>

                                            {/* Subject Select */}
                                            <div className="flex-1 min-w-[130px]">
                                                <select
                                                    className="select select-sm w-full bg-white dark:bg-slate-900 text-xs py-1"
                                                    value={slot.subjectId || ''}
                                                    onChange={(e) => handleSlotChange(idx, 'subjectId', e.target.value)}
                                                >
                                                    <option value="">{slot.subjectName || 'Select Subject...'}</option>
                                                    {subjects.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Instructor Select */}
                                            <div className="flex-1 min-w-[130px]">
                                                <select
                                                    className="select select-sm w-full bg-white dark:bg-slate-900 text-xs py-1"
                                                    value={slot.instructorId || ''}
                                                    onChange={(e) => handleSlotChange(idx, 'instructorId', e.target.value)}
                                                >
                                                    <option value="">{slot.instructorName || 'Select Instructor...'}</option>
                                                    {instructors.map(ins => (
                                                        <option key={ins.id} value={ins.id}>{ins.firstName} {ins.lastName}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Room Number */}
                                            <div className="w-20">
                                                <input
                                                    type="text"
                                                    placeholder="Room"
                                                    className="input input-sm w-full bg-white dark:bg-slate-900 text-xs py-1"
                                                    value={slot.roomNumber || ''}
                                                    onChange={(e) => handleSlotChange(idx, 'roomNumber', e.target.value)}
                                                />
                                            </div>

                                            {/* Slot Type */}
                                            <div className="w-24">
                                                <select
                                                    className="select select-sm w-full bg-white dark:bg-slate-900 text-xs py-1"
                                                    value={slot.slotType || 'lecture'}
                                                    onChange={(e) => handleSlotChange(idx, 'slotType', e.target.value)}
                                                >
                                                    {SLOT_TYPES.map(st => (
                                                        <option key={st.value} value={st.value}>{st.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Delete Slot */}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSlot(idx)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                                                title="Remove this slot"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
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
                                className="btn btn-sm btn-primary flex items-center gap-1.5 text-xs px-5 shadow-md shadow-purple-500/20"
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
