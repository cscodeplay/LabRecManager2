'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, Users, UserCheck, GraduationCap, User, Calendar, 
    Clock, Check, Search, Edit3, Plus, AlertCircle, Sparkles,
    CheckSquare, Square, RefreshCw, Trash2
} from 'lucide-react';
import { trainingAPI, classesAPI, usersAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ModuleAssignmentModal({
    isOpen,
    module,
    onClose,
    onSuccess
}) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Raw loaded data
    const [assignments, setAssignments] = useState([]);
    const [allClasses, setAllClasses] = useState([]);
    const [allGroups, setAllGroups] = useState([]);
    const [allStudents, setAllStudents] = useState([]);

    // Form edit states
    const [selectedClassIds, setSelectedClassIds] = useState([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [deadline, setDeadline] = useState('');
    const [notes, setNotes] = useState('');

    // Filter/tab in edit mode
    const [activeEditTab, setActiveEditTab] = useState('classes'); // 'classes' | 'groups' | 'students'
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!isOpen || !module?.id) return;
        loadAssignmentData();
    }, [isOpen, module?.id]);

    const loadAssignmentData = async () => {
        setLoading(true);
        try {
            const [assignRes, classRes, userRes] = await Promise.all([
                trainingAPI.getModuleAssignments(module.id),
                classesAPI.getAll().catch(() => ({ data: { data: { classes: [] } } })),
                usersAPI.getAll({ role: 'student', limit: 300 }).catch(() => ({ data: { data: { users: [] } } }))
            ]);

            const loadedAssignments = assignRes.data?.data?.assignments || [];
            const loadedClasses = classRes.data?.data?.classes || [];
            const loadedStudents = userRes.data?.data?.users || [];

            setAssignments(loadedAssignments);
            setAllClasses(loadedClasses);
            setAllStudents(loadedStudents);

            // Fetch groups for all classes in parallel
            try {
                const groupPromises = loadedClasses.map(c => 
                    classesAPI.getGroups(c.id).catch(() => ({ data: { data: { groups: [] } } }))
                );
                const groupResults = await Promise.all(groupPromises);
                const combinedGroups = [];
                groupResults.forEach((res, idx) => {
                    const grps = res.data?.data?.groups || [];
                    const clsName = loadedClasses[idx]?.name || '';
                    grps.forEach(g => {
                        combinedGroups.push({ ...g, className: clsName });
                    });
                });
                setAllGroups(combinedGroups);
            } catch (grpErr) {
                console.warn('Could not load groups:', grpErr);
            }

            // Populate initial form state from latest assignment
            if (loadedAssignments.length > 0) {
                const primaryAssign = loadedAssignments[0];
                const cIds = [];
                const gIds = [];
                const sIds = [];

                loadedAssignments.forEach(a => {
                    (a.targets || []).forEach(t => {
                        if (t.targetType === 'class' && t.targetClassId) cIds.push(t.targetClassId);
                        if (t.targetType === 'group' && t.targetGroupId) gIds.push(t.targetGroupId);
                        if (t.targetType === 'student' && t.targetStudentId) sIds.push(t.targetStudentId);
                    });
                });

                setSelectedClassIds([...new Set(cIds)]);
                setSelectedGroupIds([...new Set(gIds)]);
                setSelectedStudentIds([...new Set(sIds)]);

                if (primaryAssign.due_date) {
                    try {
                        const d = new Date(primaryAssign.due_date);
                        // format to YYYY-MM-DDTHH:mm for datetime-local input
                        const pad = (n) => String(n).padStart(2, '0');
                        const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                        setDeadline(localIso);
                    } catch {
                        setDeadline('');
                    }
                } else {
                    setDeadline('');
                }
                setNotes(primaryAssign.description || '');
                setIsEditing(false);
            } else {
                setSelectedClassIds([]);
                setSelectedGroupIds([]);
                setSelectedStudentIds([]);
                setDeadline('');
                setNotes('');
                setIsEditing(true); // Open directly in edit mode if unassigned
            }
        } catch (err) {
            console.error('Failed to load assignments:', err);
            toast.error('Failed to load module assignment details');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAssignments = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            await trainingAPI.assignModule(module.id, {
                classIds: selectedClassIds,
                groupIds: selectedGroupIds,
                studentIds: selectedStudentIds,
                deadline: deadline ? new Date(deadline).toISOString() : null,
                notes
            });

            toast.success('Course module assignments updated successfully!');
            setIsEditing(false);
            await loadAssignmentData();
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error('Failed to assign module:', err);
            toast.error(err.response?.data?.message || 'Failed to save assignments');
        } finally {
            setSaving(false);
        }
    };

    // Toggle helpers
    const toggleClass = (id) => {
        setSelectedClassIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleGroup = (id) => {
        setSelectedGroupIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleStudent = (id) => {
        setSelectedStudentIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Quick deadline buttons
    const setQuickDeadlineDays = (days) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        d.setHours(23, 59, 0, 0);
        const pad = (n) => String(n).padStart(2, '0');
        setDeadline(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    };

    // Filters for edit search
    const filteredClasses = useMemo(() => {
        if (!searchQuery.trim()) return allClasses;
        const q = searchQuery.toLowerCase();
        return allClasses.filter(c => c.name?.toLowerCase().includes(q));
    }, [allClasses, searchQuery]);

    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return allGroups;
        const q = searchQuery.toLowerCase();
        return allGroups.filter(g => 
            g.name?.toLowerCase().includes(q) || g.className?.toLowerCase().includes(q)
        );
    }, [allGroups, searchQuery]);

    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return allStudents;
        const q = searchQuery.toLowerCase();
        return allStudents.filter(s => 
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q) ||
            String(s.rollNumber || '').includes(q)
        );
    }, [allStudents, searchQuery]);

    // Computed assigned targets for view mode
    const assignedClasses = useMemo(() => {
        const list = [];
        assignments.forEach(a => {
            (a.targets || []).forEach(t => {
                if (t.targetType === 'class') list.push(t);
            });
        });
        return list;
    }, [assignments]);

    const assignedGroups = useMemo(() => {
        const list = [];
        assignments.forEach(a => {
            (a.targets || []).forEach(t => {
                if (t.targetType === 'group') list.push(t);
            });
        });
        return list;
    }, [assignments]);

    const assignedStudents = useMemo(() => {
        const list = [];
        assignments.forEach(a => {
            (a.targets || []).forEach(t => {
                if (t.targetType === 'student') list.push(t);
            });
        });
        return list;
    }, [assignments]);

    const hasAnyAssignments = (assignedClasses.length > 0 || assignedGroups.length > 0 || assignedStudents.length > 0);
    const primaryDueDate = assignments[0]?.due_date;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                                Assigned Entities & Allocation
                            </h3>
                            <p className="text-xs text-slate-500 truncate max-w-md">
                                {module?.title || 'Course Module'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {!isEditing && hasAnyAssignments && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="btn btn-secondary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 font-bold"
                            >
                                <Edit3 className="w-3.5 h-3.5" /> Edit Assignments
                            </button>
                        )}
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
                            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                            <span className="text-xs text-slate-400 font-medium">Loading assigned entities...</span>
                        </div>
                    ) : !isEditing ? (
                        /* ========================================================================= */
                        /* 1. VIEW MODE: SHOW CURRENTLY ASSIGNED CLASSES, GROUPS, STUDENTS           */
                        /* ========================================================================= */
                        <div className="space-y-6">
                            {/* Due Date & General Assignment Status Card */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                            Assignment Deadline / Due Date
                                        </div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                                            {primaryDueDate ? new Date(primaryDueDate).toLocaleString() : 'No Deadline Set (Self-Paced)'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                        hasAnyAssignments 
                                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                    }`}>
                                        {hasAnyAssignments ? 'Active Assignments' : 'Unassigned'}
                                    </span>
                                </div>
                            </div>

                            {!hasAnyAssignments ? (
                                <div className="py-12 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-950/60 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-500 mb-3">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                        No Classes or Students Assigned Yet
                                    </h4>
                                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                                        Assign this training module to classes, specific groups, or individual students to track live progress and enforce deadlines.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className="mt-4 btn btn-primary text-xs py-2 px-5 rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
                                    >
                                        <Plus className="w-4 h-4" /> Assign Course Module
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* 1. Classes */}
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                                <GraduationCap className="w-4 h-4 text-indigo-500" />
                                                Assigned Classes ({assignedClasses.length})
                                            </h4>
                                        </div>
                                        {assignedClasses.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">No specific classes assigned directly.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {assignedClasses.map((t, idx) => (
                                                    <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                                            <GraduationCap className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                                {t.className || 'Class'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">All enrolled students</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. Groups */}
                                    <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                                <Users className="w-4 h-4 text-purple-500" />
                                                Assigned Student Groups ({assignedGroups.length})
                                            </h4>
                                        </div>
                                        {assignedGroups.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">No specific student groups assigned.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {assignedGroups.map((t, idx) => (
                                                    <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                                            <Users className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                                {t.groupName || 'Group'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">Team Lab Group</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Students */}
                                    <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                                <User className="w-4 h-4 text-teal-500" />
                                                Assigned Individual Students ({assignedStudents.length})
                                            </h4>
                                        </div>
                                        {assignedStudents.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">No individual student overrides assigned.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {assignedStudents.map((t, idx) => (
                                                    <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
                                                            <User className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                                {t.studentName || 'Student'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 truncate">
                                                                {t.student?.email || 'Individual Assignment'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ========================================================================= */
                        /* 2. EDIT MODE: SELECT CLASSES, GROUPS, STUDENTS & SET DEADLINE             */
                        /* ========================================================================= */
                        <form onSubmit={handleSaveAssignments} className="space-y-6">
                            {/* Deadline Picker */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-500" />
                                    Course Due Date / Deadline
                                </label>
                                
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                    <input 
                                        type="datetime-local"
                                        value={deadline}
                                        onChange={(e) => setDeadline(e.target.value)}
                                        className="input font-mono text-xs flex-1"
                                    />
                                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setQuickDeadlineDays(3)}
                                            className="px-2.5 py-1 text-[11px] rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800"
                                        >
                                            +3 Days
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setQuickDeadlineDays(7)}
                                            className="px-2.5 py-1 text-[11px] rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800"
                                        >
                                            +1 Week
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setQuickDeadlineDays(14)}
                                            className="px-2.5 py-1 text-[11px] rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800"
                                        >
                                            +2 Weeks
                                        </button>
                                        {deadline && (
                                            <button
                                                type="button"
                                                onClick={() => setDeadline('')}
                                                className="px-2.5 py-1 text-[11px] rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-800"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Target Selection Tabs */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => { setActiveEditTab('classes'); setSearchQuery(''); }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                                activeEditTab === 'classes'
                                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                        >
                                            <GraduationCap className="w-3.5 h-3.5" />
                                            Classes ({selectedClassIds.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setActiveEditTab('groups'); setSearchQuery(''); }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                                activeEditTab === 'groups'
                                                    ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                        >
                                            <Users className="w-3.5 h-3.5" />
                                            Groups ({selectedGroupIds.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setActiveEditTab('students'); setSearchQuery(''); }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                                activeEditTab === 'students'
                                                    ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                        >
                                            <User className="w-3.5 h-3.5" />
                                            Students ({selectedStudentIds.length})
                                        </button>
                                    </div>

                                    {/* Search Bar */}
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder={`Search ${activeEditTab}...`}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="input pl-8 pr-3 py-1.5 text-xs w-48 rounded-xl"
                                        />
                                    </div>
                                </div>

                                {/* List Container */}
                                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                    {/* Classes Tab */}
                                    {activeEditTab === 'classes' && (
                                        filteredClasses.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-slate-400">No classes found</div>
                                        ) : (
                                            filteredClasses.map(c => {
                                                const isSelected = selectedClassIds.includes(c.id);
                                                return (
                                                    <div 
                                                        key={c.id}
                                                        onClick={() => toggleClass(c.id)}
                                                        className={`p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                                                            isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                                                                isSelected 
                                                                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                                                                    : 'border-slate-300 dark:border-slate-700'
                                                            }`}>
                                                                {isSelected && <Check className="w-3.5 h-3.5" />}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-xs text-slate-900 dark:text-white">{c.name}</div>
                                                                <div className="text-[10px] text-slate-400">Section {c.section || 'A'}</div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-slate-400">
                                                            {c._count?.enrollments || 0} students
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )
                                    )}

                                    {/* Groups Tab */}
                                    {activeEditTab === 'groups' && (
                                        filteredGroups.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-slate-400">No groups found</div>
                                        ) : (
                                            filteredGroups.map(g => {
                                                const isSelected = selectedGroupIds.includes(g.id);
                                                return (
                                                    <div 
                                                        key={g.id}
                                                        onClick={() => toggleGroup(g.id)}
                                                        className={`p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                                                            isSelected ? 'bg-purple-50/50 dark:bg-purple-950/20' : ''
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                                                                isSelected 
                                                                    ? 'bg-purple-600 border-purple-600 text-white' 
                                                                    : 'border-slate-300 dark:border-slate-700'
                                                            }`}>
                                                                {isSelected && <Check className="w-3.5 h-3.5" />}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-xs text-slate-900 dark:text-white">{g.name}</div>
                                                                <div className="text-[10px] text-slate-400">{g.className}</div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-slate-400">
                                                            {g._count?.members || 0} members
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )
                                    )}

                                    {/* Students Tab */}
                                    {activeEditTab === 'students' && (
                                        filteredStudents.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-slate-400">No students found</div>
                                        ) : (
                                            filteredStudents.map(s => {
                                                const isSelected = selectedStudentIds.includes(s.id);
                                                return (
                                                    <div 
                                                        key={s.id}
                                                        onClick={() => toggleStudent(s.id)}
                                                        className={`p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                                                            isSelected ? 'bg-teal-50/50 dark:bg-teal-950/20' : ''
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                                                                isSelected 
                                                                    ? 'bg-teal-600 border-teal-600 text-white' 
                                                                    : 'border-slate-300 dark:border-slate-700'
                                                            }`}>
                                                                {isSelected && <Check className="w-3.5 h-3.5" />}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-xs text-slate-900 dark:text-white">
                                                                    {s.firstName} {s.lastName || ''}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400">{s.email}</div>
                                                            </div>
                                                        </div>
                                                        {s.rollNumber && (
                                                            <span className="text-[10px] font-mono text-slate-400">
                                                                Roll #{s.rollNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Summary Pill & Actions */}
                            <div className="pt-2 flex items-center justify-between">
                                <div className="text-xs text-slate-500 font-medium">
                                    Selected: <strong className="text-slate-900 dark:text-white">{selectedClassIds.length}</strong> classes, <strong className="text-slate-900 dark:text-white">{selectedGroupIds.length}</strong> groups, <strong className="text-slate-900 dark:text-white">{selectedStudentIds.length}</strong> students
                                </div>

                                <div className="flex items-center gap-2">
                                    {hasAnyAssignments && (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="btn btn-secondary text-xs py-2 px-4 rounded-xl"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="btn bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 px-5 rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                                    >
                                        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        <span>{saving ? 'Saving...' : 'Save & Apply Assignments'}</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
