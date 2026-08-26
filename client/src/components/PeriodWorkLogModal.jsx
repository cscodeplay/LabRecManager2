'use client';

import React, { useState, useEffect } from 'react';
import {
    BookOpen, Clock, Calendar, User, CheckCircle2,
    AlertCircle, FileText, Sparkles, X, Save,
    Flag, UserCheck, ArrowRight, Check,
    CheckSquare, Plus, Trash2, ListTodo
} from 'lucide-react';
import { teachingAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const ACTIVITY_TYPES = [
    { id: 'lecture', label: 'Regular Lecture', icon: BookOpen, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'other_activity', label: 'Other Activity / Event', icon: Flag, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'early_leave', label: 'Early Dismissal', icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'substitute', label: 'Substitute Teacher', icon: UserCheck, color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { id: 'cancelled', label: 'Period Cancelled', icon: AlertCircle, color: 'bg-red-50 text-red-700 border-red-200' }
];

const LECTURE_TASK_PRESETS = {
    theory: [
        'Review previous class topic & check homework',
        'Explain core theory concepts and definitions',
        'Demonstrate board examples & solve problems',
        'Interactive student Q&A and doubt clearing',
        'Assign practice questions & homework reading'
    ],
    lab: [
        'Lab safety briefing & practical aim introduction',
        'Live algorithm / circuit / code demonstration',
        'Supervise individual student execution at workstations',
        'Inspect code output & conduct mini-viva assessment',
        'Verify and sign student practical records'
    ],
    revision: [
        'Rapid chapter summary & formula recap',
        'Solve previous year exam problems on board',
        'Targeted doubt solving for difficult topics'
    ],
    assessment: [
        'Student roll call & seating arrangement',
        'Distribute test questions & evaluate lab code',
        'Collect answer sheets & record marks'
    ]
};

export default function PeriodWorkLogModal({
    isOpen,
    onClose,
    period,
    day,
    dateStr,
    slot,
    classId,
    instructors = [],
    subjects = [],
    currentUser,
    onWorkSaved
}) {
    const [activityType, setActivityType] = useState('lecture');
    const [activityTitle, setActivityTitle] = useState('');
    const [topicsCovered, setTopicsCovered] = useState('');
    const [homework, setHomework] = useState('');
    const [remarks, setRemarks] = useState('');
    const [substituteTeacherId, setSubstituteTeacherId] = useState('');
    const [dismissalTime, setDismissalTime] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [existingPlanId, setExistingPlanId] = useState(null);

    // Lecture Tasks Checklist State
    const [tasks, setTasks] = useState([]);
    const [newTaskText, setNewTaskText] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        // Reset and check if there's an existing plan or log for this slot and date
        setActivityType('lecture');
        setActivityTitle('');
        setTopicsCovered('');
        setHomework('');
        setRemarks('');
        setSubstituteTeacherId('');
        setDismissalTime('');
        setExistingPlanId(null);
        setNewTaskText('');

        // Default initial tasks depending on slot type
        const defaultPresetKey = (slot?.slotType === 'lab' || period?.slotType === 'lab') ? 'lab' : 'theory';
        const defaultList = LECTURE_TASK_PRESETS[defaultPresetKey].map((t, idx) => ({
            id: `task_init_${idx}`,
            text: t,
            completed: false,
            completedAt: null
        }));
        setTasks(defaultList);

        // Fetch existing lecture plan for this slot and date if available
        if (slot?.id && dateStr) {
            loadExistingSlotLog();
        }
    }, [isOpen, slot, dateStr]);

    const loadExistingSlotLog = async () => {
        try {
            const formattedDate = new Date(dateStr).toISOString().split('T')[0];
            const res = await teachingAPI.getPlans({
                timetableSlotId: slot.id,
                date: formattedDate,
                classId
            });
            const plans = res.data?.data?.plans || [];
            if (plans.length > 0) {
                const plan = plans[0];
                setExistingPlanId(plan.id);
                setTopicsCovered(plan.description || plan.title || '');
                setHomework(plan.homeworkDescription || '');
                
                let rawNotes = plan.notes || '';
                
                // Parse embedded tasks checklist if present
                if (rawNotes.includes('[LECTURE_TASKS]:')) {
                    try {
                        const parts = rawNotes.split('[LECTURE_TASKS]:');
                        const afterTasks = parts[1];
                        const jsonEnd = afterTasks.indexOf('\n');
                        const jsonStr = jsonEnd !== -1 ? afterTasks.substring(0, jsonEnd) : afterTasks;
                        const parsedTasks = JSON.parse(jsonStr);
                        if (Array.isArray(parsedTasks) && parsedTasks.length > 0) {
                            setTasks(parsedTasks);
                        }
                        // Clean up notes for remarks textarea
                        rawNotes = parts[0] + (jsonEnd !== -1 ? afterTasks.substring(jsonEnd + 1) : '');
                    } catch (err) {
                        console.warn('Failed to parse lecture tasks JSON:', err);
                    }
                }

                if (rawNotes.startsWith('[OTHER ACTIVITY]:')) {
                    setActivityType('other_activity');
                    setActivityTitle(rawNotes.replace('[OTHER ACTIVITY]:', '').split('\n')[0].trim());
                } else if (rawNotes.startsWith('[EARLY DISMISSAL]:')) {
                    setActivityType('early_leave');
                    setDismissalTime(rawNotes.replace('[EARLY DISMISSAL]:', '').split('\n')[0].trim());
                } else if (rawNotes.startsWith('[SUBSTITUTE]:')) {
                    setActivityType('substitute');
                } else if (plan.status === 'cancelled') {
                    setActivityType('cancelled');
                }

                // Clean remarks of header tags
                const cleanRemarks = rawNotes
                    .replace(/^\[OTHER ACTIVITY\]:[^\n]*\n?/, '')
                    .replace(/^\[EARLY DISMISSAL\]:[^\n]*\n?/, '')
                    .replace(/^\[SUBSTITUTE\]:[^\n]*\n?/, '')
                    .trim();
                setRemarks(cleanRemarks);
            }
        } catch (e) {
            // Ignore error if teaching plans not yet initialized
        }
    };

    const handleToggleTask = (taskId) => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                const nextCompleted = !t.completed;
                return {
                    ...t,
                    completed: nextCompleted,
                    completedAt: nextCompleted ? timeStr : null
                };
            }
            return t;
        }));
    };

    const handleAddTask = () => {
        if (!newTaskText.trim()) return;
        const newTask = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            text: newTaskText.trim(),
            completed: false,
            completedAt: null
        };
        setTasks(prev => [...prev, newTask]);
        setNewTaskText('');
    };

    const handleRemoveTask = (taskId) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    const handleLoadPreset = (presetKey) => {
        const list = LECTURE_TASK_PRESETS[presetKey] || [];
        const newTasks = list.map((text, idx) => ({
            id: `task_${Date.now()}_${idx}`,
            text,
            completed: false,
            completedAt: null
        }));
        setTasks(newTasks);
        toast.success(`Loaded ${list.length} ${presetKey} tasks!`, { icon: '📋' });
    };

    if (!isOpen) return null;

    const subjectName = slot?.subject?.name || subjects.find(s => s.id === slot?.subjectId)?.name || 'Class Period';
    const instructorName = slot?.instructor
        ? `${slot.instructor.firstName} ${slot.instructor.lastName}`
        : instructors.find(i => i.id === slot?.instructorId)
        ? `${instructors.find(i => i.id === slot?.instructorId).firstName} ${instructors.find(i => i.id === slot?.instructorId).lastName}`
        : 'Assigned Faculty';

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const formattedDate = new Date(dateStr || Date.now()).toISOString().split('T')[0];

            let title = topicsCovered.trim() || `${subjectName} - Period ${period?.periodNumber || slot?.periodNumber || 1}`;
            if (activityType === 'other_activity' && activityTitle) {
                title = `[Activity: ${activityTitle}] ${title}`;
            }

            let fullNotes = remarks.trim();
            if (activityType === 'other_activity' && activityTitle) {
                fullNotes = `[OTHER ACTIVITY]: ${activityTitle}\n${fullNotes}`.trim();
            } else if (activityType === 'early_leave' && dismissalTime) {
                fullNotes = `[EARLY DISMISSAL]: Dismissed at ${dismissalTime}\n${fullNotes}`.trim();
            } else if (activityType === 'substitute' && substituteTeacherId) {
                const sub = instructors.find(i => i.id === substituteTeacherId);
                fullNotes = `[SUBSTITUTE]: ${sub ? `${sub.firstName} ${sub.lastName}` : 'Substitute Teacher'}\n${fullNotes}`.trim();
            }

            // Append tasks JSON to notes
            if (tasks.length > 0) {
                fullNotes = `[LECTURE_TASKS]:${JSON.stringify(tasks)}\n${fullNotes}`.trim();
            }

            let finalTopics = topicsCovered.trim();
            const completedTasks = tasks.filter(t => t.completed);
            if (!finalTopics && tasks.length > 0) {
                finalTopics = `${completedTasks.length}/${tasks.length} Tasks Done: ` + tasks.map(t => `${t.text}${t.completed ? ` (✓ ${t.completedAt})` : ''}`).join('; ');
            }

            const payload = {
                title,
                description: finalTopics || topicsCovered.trim(),
                homeworkDescription: homework.trim(),
                notes: fullNotes,
                status: activityType === 'cancelled' ? 'cancelled' : 'completed',
                lectureType: slot?.slotType === 'lab' ? 'practical' : 'theory',
                scheduledDate: formattedDate,
                scheduledDuration: 40,
                lectureNumber: period?.periodNumber || slot?.periodNumber || 1,
                classId: classId || slot?.classId,
                subjectId: slot?.subjectId || subjects[0]?.id,
                instructorId: substituteTeacherId || slot?.instructorId || currentUser?.id,
                timetableSlotId: slot?.id || null
            };

            if (existingPlanId) {
                await teachingAPI.updatePlan(existingPlanId, payload);
            } else {
                await teachingAPI.createPlan(payload);
            }

            toast.success('Period work & lecture tasks logged successfully!', { icon: '📝' });
            if (onWorkSaved) {
                onWorkSaved({
                    slotId: slot?.id,
                    periodNumber: period?.periodNumber || slot?.periodNumber,
                    day,
                    dateStr,
                    topicsCovered: finalTopics,
                    activityType,
                    activityTitle,
                    hasLoggedWork: true,
                    tasksCount: tasks.length,
                    completedTasksCount: completedTasks.length,
                    lastCompletedAt: completedTasks.slice(-1)[0]?.completedAt || null
                });
            }
            onClose();
        } catch (error) {
            console.error('Error logging period work:', error);
            toast.error(error.response?.data?.message || 'Failed to save period log');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Log Period Work & Activity
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Record topics covered, homework, or special activities for this period
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

                {/* Period Info Card */}
                <div className="px-6 py-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="font-bold px-2 py-0.5 rounded-md bg-indigo-600 text-white">
                            Period {period?.periodNumber || slot?.periodNumber || 1}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {subjectName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                            (slot?.slotType || period?.slotType) === 'lab' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                            (slot?.slotType || period?.slotType) === 'break_period' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                            {(slot?.slotType || period?.slotType) === 'break_period' ? 'Break' : (slot?.slotType || period?.slotType || 'lecture')}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            {period?.startTime || slot?.startTime || '08:00'} - {period?.endTime || slot?.endTime || '08:40'}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            {dateStr || day || 'Today'}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                            <User className="w-3.5 h-3.5 text-indigo-500" />
                            {instructorName}
                        </span>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5 flex-1">
                    {/* Activity Type Selector */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Period Status & Activity Type
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {ACTIVITY_TYPES.map((t) => {
                                const Icon = t.icon;
                                const isSelected = activityType === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setActivityType(t.id)}
                                        className={`p-2.5 rounded-xl border-2 text-left transition-all flex items-center gap-2 ${
                                            isSelected
                                                ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 shadow-sm font-semibold'
                                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                                        <span className="text-xs truncate">{t.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Conditional Fields based on Activity Type */}
                    {activityType === 'other_activity' && (
                        <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
                            <label className="block text-xs font-bold text-purple-900 dark:text-purple-200 mb-1">
                                Activity / Event Title *
                            </label>
                            <input
                                type="text"
                                className="input input-sm w-full bg-white dark:bg-slate-900"
                                placeholder="e.g., Cyber Security Seminar, Lab Practical Exam, Sports Rehearsal..."
                                value={activityTitle}
                                onChange={(e) => setActivityTitle(e.target.value)}
                            />
                        </div>
                    )}

                    {activityType === 'early_leave' && (
                        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                            <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                                Dismissal Time *
                            </label>
                            <input
                                type="time"
                                className="input input-sm w-full bg-white dark:bg-slate-900"
                                value={dismissalTime}
                                onChange={(e) => setDismissalTime(e.target.value)}
                            />
                        </div>
                    )}

                    {activityType === 'substitute' && (
                        <div className="p-3.5 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-800">
                            <label className="block text-xs font-bold text-teal-900 dark:text-teal-200 mb-1">
                                Substitute Instructor
                            </label>
                            <select
                                className="select select-sm w-full bg-white dark:bg-slate-900"
                                value={substituteTeacherId}
                                onChange={(e) => setSubstituteTeacherId(e.target.value)}
                            >
                                <option value="">Select Substitute Teacher...</option>
                                {instructors.map((ins) => (
                                    <option key={ins.id} value={ins.id}>
                                        {ins.firstName} {ins.lastName} ({ins.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Lecture Tasks Checklist (Auto-Stamps Time when Checked) */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                    Lecture Tasks Checklist
                                </label>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    tasks.filter(t => t.completed).length === tasks.length && tasks.length > 0
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300'
                                }`}>
                                    {tasks.filter(t => t.completed).length} / {tasks.length} Completed
                                </span>
                            </div>

                            {/* Preset Chips */}
                            <div className="flex items-center gap-1 text-[10px]">
                                <span className="text-slate-400 font-medium mr-0.5">Presets:</span>
                                <button
                                    type="button"
                                    onClick={() => handleLoadPreset('theory')}
                                    className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
                                >
                                    Theory
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleLoadPreset('lab')}
                                    className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
                                >
                                    Lab
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleLoadPreset('revision')}
                                    className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
                                >
                                    Revision
                                </button>
                            </div>
                        </div>

                        {/* Task Items List */}
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {tasks.map((t) => (
                                <div
                                    key={t.id}
                                    onClick={() => handleToggleTask(t.id)}
                                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                                        t.completed
                                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={t.completed}
                                            onChange={() => handleToggleTask(t.id)}
                                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <span className={`text-xs flex-1 truncate ${
                                            t.completed
                                                ? 'line-through text-slate-400 dark:text-slate-500 font-normal'
                                                : 'text-slate-800 dark:text-slate-200 font-medium'
                                        }`}>
                                            {t.text}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {t.completed && t.completedAt && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 rounded-full shadow-2xs animate-in fade-in">
                                                <Clock className="w-3 h-3 text-emerald-600" />
                                                ✓ {t.completedAt}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTask(t.id)}
                                            className="p-1 text-slate-400 hover:text-red-500 rounded transition"
                                            title="Remove Task"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Custom Task Row */}
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="text"
                                className="input input-sm flex-1 text-xs bg-white dark:bg-slate-800"
                                placeholder="Add a new lecture task item..."
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTask();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleAddTask}
                                className="btn btn-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1 border border-slate-300 dark:border-slate-600"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                        </div>
                    </div>

                    {/* Topics Covered / Work Done */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                            <span>Topics Covered / Work Done in Class</span>
                            <span className="text-[10px] font-normal text-slate-400">Required</span>
                        </label>
                        <textarea
                            rows={3}
                            className="input w-full py-2 text-xs leading-relaxed"
                            placeholder="e.g., Completed Chapter 4: Binary Trees and implemented traversal algorithms (Inorder, Preorder, Postorder)..."
                            value={topicsCovered}
                            onChange={(e) => setTopicsCovered(e.target.value)}
                        />
                    </div>

                    {/* Homework / Assignments */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Homework / Practice Questions Assigned
                        </label>
                        <input
                            type="text"
                            className="input input-sm w-full text-xs"
                            placeholder="e.g., Exercise 4.2 questions 1 to 5; submit by next Friday"
                            value={homework}
                            onChange={(e) => setHomework(e.target.value)}
                        />
                    </div>

                    {/* Remarks & Notes */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Teacher Remarks / Class Notes
                        </label>
                        <textarea
                            rows={2}
                            className="input w-full py-2 text-xs"
                            placeholder="Optional notes regarding student performance, doubts raised, or equipment used..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="btn btn-sm btn-secondary text-xs"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn btn-sm btn-primary flex items-center gap-1.5 text-xs px-5 shadow-md shadow-primary-500/20"
                    >
                        <Check className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save Period Log'}
                    </button>
                </div>
            </div>
        </div>
    );
}
