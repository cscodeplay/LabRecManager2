'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
    StickyNote, GraduationCap, BookOpen, Video, Ticket, Upload,
    X, Sparkles, Plus, Loader2, Check, AlertCircle, Calendar,
    Clock, Tag, Pin, Shield, Hash, Layers, Users, ExternalLink,
    HelpCircle, Keyboard, Copy, CheckCircle2, ChevronRight, FileText
} from 'lucide-react';
import api, { classesAPI, assignmentsAPI, meetingAPI, ticketsAPI, labsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';

const NOTE_COLORS = [
    { key: 'yellow', label: 'Classic Yellow', bg: 'bg-amber-100 border-amber-300 text-amber-900', dot: 'bg-amber-400' },
    { key: 'emerald', label: 'Emerald Mint', bg: 'bg-emerald-100 border-emerald-300 text-emerald-900', dot: 'bg-emerald-400' },
    { key: 'sky', label: 'Sky Blue', bg: 'bg-sky-100 border-sky-300 text-sky-900', dot: 'bg-sky-400' },
    { key: 'purple', label: 'Lilac Purple', bg: 'bg-purple-100 border-purple-300 text-purple-900', dot: 'bg-purple-400' },
    { key: 'rose', label: 'Rose Pink', bg: 'bg-rose-100 border-rose-300 text-rose-900', dot: 'bg-rose-400' },
    { key: 'slate', label: 'Slate Gray', bg: 'bg-slate-100 border-slate-300 text-slate-900', dot: 'bg-slate-400' }
];

export default function GlobalQuickActions() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    const [mounted, setMounted] = useState(false);

    // Active modal: 'note' | 'class' | 'assignment' | 'meeting' | 'ticket' | 'document' | 'cheatsheet' | null
    const [activeModal, setActiveModal] = useState(null);
    const [loading, setLoading] = useState(false);

    // Common dynamic data
    const [classes, setClasses] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [labs, setLabs] = useState([]);

    // 1. Note Form State
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [noteColor, setNoteColor] = useState('yellow');
    const [notePinned, setNotePinned] = useState(false);
    const [noteTags, setNoteTags] = useState('');

    // 2. Class Form State
    const [className, setClassName] = useState('');
    const [classSection, setClassSection] = useState('');
    const [classDescription, setClassDescription] = useState('');
    const [classAcademicYearId, setClassAcademicYearId] = useState('');

    // 3. Assignment Form State
    const [assignmentTitle, setAssignmentTitle] = useState('');
    const [assignmentClassId, setAssignmentClassId] = useState('');
    const [assignmentDueDate, setAssignmentDueDate] = useState('');
    const [assignmentMaxMarks, setAssignmentMaxMarks] = useState(100);
    const [assignmentDesc, setAssignmentDesc] = useState('');

    // 4. Meeting Form State
    const [meetingTitle, setMeetingTitle] = useState('');
    const [meetingType, setMeetingType] = useState('viva');
    const [meetingClassId, setMeetingClassId] = useState('');
    const [createdMeetingLink, setCreatedMeetingLink] = useState(null);

    // 5. Ticket Form State
    const [ticketTitle, setTicketTitle] = useState('');
    const [ticketCategory, setTicketCategory] = useState('hardware');
    const [ticketPriority, setTicketPriority] = useState('medium');
    const [ticketLabId, setTicketLabId] = useState('');
    const [ticketDescription, setTicketDescription] = useState('');

    // 6. Document Upload State
    const [docTitle, setDocTitle] = useState('');
    const [docFile, setDocFile] = useState(null);
    const [docClassId, setDocClassId] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    // Load classes, academic years, and labs for quick dropdowns
    useEffect(() => {
        if (!isAuthenticated) return;

        api.get('/classes').then(res => {
            if (res.data?.success) setClasses(res.data.data || []);
        }).catch(() => {});

        api.get('/academic-years').then(res => {
            if (res.data?.success) {
                const years = res.data.data || [];
                setAcademicYears(years);
                const activeYear = years.find(y => y.isCurrent) || years[0];
                if (activeYear) setClassAcademicYearId(activeYear.id);
            }
        }).catch(() => {});

        api.get('/labs').then(res => {
            if (res.data?.success) setLabs(res.data.data || []);
        }).catch(() => {});
    }, [isAuthenticated]);

    // Global Keydown Listener for Cmd+1, Cmd+2, Cmd+3, Cmd+4, Cmd+5, Cmd+6, Cmd+?, Cmd+H
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isCmdOrCtrl = e.metaKey || e.ctrlKey;

            // Prevent shortcut triggers when typing inside input/textarea/select unless it's Escape
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

            if (e.key === 'Escape') {
                if (activeModal) {
                    e.preventDefault();
                    setActiveModal(null);
                }
                return;
            }

            if (!isCmdOrCtrl) return;

            // Cmd+1 -> New Note
            if (e.key === '1') {
                e.preventDefault();
                setActiveModal(prev => (prev === 'note' ? null : 'note'));
            }
            // Cmd+2 -> New Class
            else if (e.key === '2') {
                e.preventDefault();
                setActiveModal(prev => (prev === 'class' ? null : 'class'));
            }
            // Cmd+3 -> New Assignment
            else if (e.key === '3') {
                e.preventDefault();
                setActiveModal(prev => (prev === 'assignment' ? null : 'assignment'));
            }
            // Cmd+4 -> Quick Meeting / Viva
            else if (e.key === '4') {
                e.preventDefault();
                setActiveModal(prev => (prev === 'meeting' ? null : 'meeting'));
            }
            // Cmd+5 -> Quick Ticket / Report Issue
            else if (e.key === '5') {
                e.preventDefault();
                setActiveModal(prev => (prev === 'ticket' ? null : 'ticket'));
            }
            // Cmd+6 -> Quick Document Upload
            else if (e.key === '6') {
                e.preventDefault();
                setActiveModal(prev => (prev === 'document' ? null : 'document'));
            }
            // Cmd+? or Cmd+H or Cmd+Shift+/ -> Shortcuts Cheat Sheet
            else if (e.key === '?' || (e.shiftKey && e.key === '/') || (e.key.toLowerCase() === 'h' && !e.shiftKey && !isTyping)) {
                e.preventDefault();
                setActiveModal(prev => (prev === 'cheatsheet' ? null : 'cheatsheet'));
            }
        };

        const handleCustomOpen = (e) => {
            if (e.detail?.modal) {
                setActiveModal(e.detail.modal);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('open-quick-action', handleCustomOpen);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('open-quick-action', handleCustomOpen);
        };
    }, [activeModal]);

    // ───────────────────────────────────────────
    // HANDLERS
    // ───────────────────────────────────────────

    // 1. Create Note
    const handleCreateNote = async (e) => {
        e.preventDefault();
        if (!noteTitle.trim() && !noteContent.trim()) {
            toast.error('Please enter a note title or content');
            return;
        }

        setLoading(true);
        try {
            const tagsArray = noteTags ? noteTags.split(',').map(t => t.trim()).filter(Boolean) : [];
            const res = await api.post('/admin-notes', {
                title: noteTitle.trim() || 'Quick Note',
                content: noteContent.trim(),
                color: noteColor,
                isPinned: notePinned,
                tags: tagsArray
            });

            if (res.data?.success) {
                toast.success('📝 Note saved successfully!');
                setNoteTitle('');
                setNoteContent('');
                setNoteTags('');
                setNotePinned(false);
                setActiveModal(null);
                window.dispatchEvent(new CustomEvent('admin-notes-updated'));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create note');
        } finally {
            setLoading(false);
        }
    };

    // 2. Create Class
    const handleCreateClass = async (e) => {
        e.preventDefault();
        if (!className.trim()) {
            toast.error('Please enter a class name');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/classes', {
                name: className.trim(),
                section: classSection.trim() || undefined,
                description: classDescription.trim() || undefined,
                academicYearId: classAcademicYearId || undefined
            });

            if (res.data?.success) {
                toast.success(`🎓 Class "${className}" created successfully!`);
                const newClassId = res.data.data?.id;
                setClassName('');
                setClassSection('');
                setClassDescription('');
                setActiveModal(null);
                window.dispatchEvent(new CustomEvent('classes-updated'));

                if (newClassId) {
                    router.push(`/classes/${newClassId}`);
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create class');
        } finally {
            setLoading(false);
        }
    };

    // 3. Create Assignment
    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        if (!assignmentTitle.trim()) {
            toast.error('Please enter an assignment title');
            return;
        }
        if (!assignmentClassId) {
            toast.error('Please select a target class');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/assignments', {
                title: assignmentTitle.trim(),
                description: assignmentDesc.trim() || 'Laboratory practical assignment',
                dueDate: assignmentDueDate ? new Date(assignmentDueDate).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
                maxMarks: Number(assignmentMaxMarks) || 100,
                targets: [{ type: 'class', id: assignmentClassId }]
            });

            if (res.data?.success) {
                toast.success('📋 Assignment published successfully!');
                setAssignmentTitle('');
                setAssignmentDesc('');
                setActiveModal(null);
                window.dispatchEvent(new CustomEvent('assignments-updated'));
                router.push('/assignments');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create assignment');
        } finally {
            setLoading(false);
        }
    };

    // 4. Create Quick Meeting / Viva
    const handleCreateMeeting = async (e) => {
        e.preventDefault();
        if (!meetingTitle.trim()) {
            toast.error('Please enter a meeting title');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/meetings/sessions/schedule', {
                title: meetingTitle.trim(),
                type: meetingType,
                scheduledAt: new Date().toISOString(),
                targetClassId: meetingClassId || undefined
            });

            if (res.data?.success) {
                const meeting = res.data.data;
                const link = `${window.location.origin}/meeting/${meeting.meetingLink || meeting.id}`;
                setCreatedMeetingLink(link);
                toast.success('📹 Meeting created successfully!');
                window.dispatchEvent(new CustomEvent('meetings-updated'));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to start meeting');
        } finally {
            setLoading(false);
        }
    };

    // 5. Create Quick Ticket
    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if (!ticketTitle.trim()) {
            toast.error('Please enter an issue title');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/tickets', {
                title: ticketTitle.trim(),
                description: ticketDescription.trim() || 'Quick ticket reported via shortcut',
                category: ticketCategory,
                priority: ticketPriority,
                labId: ticketLabId || undefined
            });

            if (res.data?.success) {
                toast.success('🎫 Ticket submitted successfully!');
                setTicketTitle('');
                setTicketDescription('');
                setActiveModal(null);
                window.dispatchEvent(new CustomEvent('tickets-updated'));
                router.push('/tickets');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit ticket');
        } finally {
            setLoading(false);
        }
    };

    // 6. Quick Document Upload
    const handleUploadDoc = async (e) => {
        e.preventDefault();
        if (!docFile) {
            toast.error('Please select a file to upload');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', docFile);
            formData.append('title', docTitle.trim() || docFile.name);
            if (docClassId) formData.append('targetClassId', docClassId);

            const res = await api.post('/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data?.success) {
                toast.success('📁 Document uploaded successfully!');
                setDocTitle('');
                setDocFile(null);
                setActiveModal(null);
                window.dispatchEvent(new CustomEvent('documents-updated'));
                router.push('/documents');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to upload document');
        } finally {
            setLoading(false);
        }
    };

    if (!mounted || !isAuthenticated || !activeModal) return null;

    return createPortal(
        <div 
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) setActiveModal(null);
            }}
        >
            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 1. QUICK NOTE MODAL (Cmd+1 / Ctrl+1) */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeModal === 'note' && (
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
                    <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                <StickyNote className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm leading-tight">Create Quick Note</h3>
                                <p className="text-[11px] text-amber-100">Saved instantly to your scratchpad</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-black/20 text-[10px] font-mono font-bold tracking-wider">⌘1</span>
                            <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg hover:bg-white/20 transition">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleCreateNote} className="p-5 space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Note Title</label>
                            <input
                                type="text"
                                autoFocus
                                value={noteTitle}
                                onChange={(e) => setNoteTitle(e.target.value)}
                                placeholder="e.g., Practical Lab 02 Preparation Notes"
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Note Content</label>
                            <textarea
                                rows={4}
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                placeholder="Type or paste your quick notes, reminders, or lab tasks..."
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition resize-none"
                            />
                        </div>

                        {/* Color Selector & Pin Toggle */}
                        <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-slate-500 mr-1">Color:</span>
                                {NOTE_COLORS.map(c => (
                                    <button
                                        key={c.key}
                                        type="button"
                                        onClick={() => setNoteColor(c.key)}
                                        className={`w-6 h-6 rounded-full ${c.dot} transition-transform ${noteColor === c.key ? 'scale-125 ring-2 ring-slate-800 ring-offset-1 shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                                        title={c.label}
                                    />
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => setNotePinned(!notePinned)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                                    notePinned ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                <Pin className={`w-3.5 h-3.5 ${notePinned ? 'fill-amber-600' : ''}`} />
                                {notePinned ? 'Pinned' : 'Pin Note'}
                            </button>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tags (Comma-separated)</label>
                            <input
                                type="text"
                                value={noteTags}
                                onChange={(e) => setNoteTags(e.target.value)}
                                placeholder="lab, python, viva, urgent"
                                className="w-full px-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setActiveModal(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-md hover:from-amber-600 hover:to-orange-600 transition disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                Save Note
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 2. QUICK CLASS MODAL (Cmd+2 / Ctrl+2) */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeModal === 'class' && (
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
                    <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                <GraduationCap className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm leading-tight">Create New Class</h3>
                                <p className="text-[11px] text-indigo-100">Add an academic batch or lab group</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-black/20 text-[10px] font-mono font-bold tracking-wider">⌘2</span>
                            <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg hover:bg-white/20 transition">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleCreateClass} className="p-5 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Class Name *</label>
                                <input
                                    type="text"
                                    autoFocus
                                    required
                                    value={className}
                                    onChange={(e) => setClassName(e.target.value)}
                                    placeholder="e.g., Class 11-B Science"
                                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Section</label>
                                <input
                                    type="text"
                                    value={classSection}
                                    onChange={(e) => setClassSection(e.target.value)}
                                    placeholder="e.g., A / CS"
                                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Academic Year</label>
                            <select
                                value={classAcademicYearId}
                                onChange={(e) => setClassAcademicYearId(e.target.value)}
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                            >
                                <option value="">Select Academic Year</option>
                                {academicYears.map(y => (
                                    <option key={y.id} value={y.id}>
                                        {y.name} {y.isCurrent ? '(Current Session)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description / Room Info</label>
                            <textarea
                                rows={3}
                                value={classDescription}
                                onChange={(e) => setClassDescription(e.target.value)}
                                placeholder="e.g., Senior Secondary Computer Science Batch, Lab Room 101"
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition resize-none"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setActiveModal(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-md hover:from-indigo-700 hover:to-violet-700 transition disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                Create & Open Class
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 3. QUICK ASSIGNMENT MODAL (Cmd+3 / Ctrl+3) */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeModal === 'assignment' && (
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
                    <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm leading-tight">Create Assignment</h3>
                                <p className="text-[11px] text-emerald-100">Assign lab practical or coding task</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-black/20 text-[10px] font-mono font-bold tracking-wider">⌘3</span>
                            <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg hover:bg-white/20 transition">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleCreateAssignment} className="p-5 space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Assignment Title *</label>
                            <input
                                type="text"
                                autoFocus
                                required
                                value={assignmentTitle}
                                onChange={(e) => setAssignmentTitle(e.target.value)}
                                placeholder="e.g., Python Data Structures & Linked Lists Practical"
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Class *</label>
                                <select
                                    required
                                    value={assignmentClassId}
                                    onChange={(e) => setAssignmentClassId(e.target.value)}
                                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition font-medium"
                                >
                                    <option value="">Select Class</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>
                                            🎓 {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Max Marks</label>
                                <input
                                    type="number"
                                    value={assignmentMaxMarks}
                                    onChange={(e) => setAssignmentMaxMarks(e.target.value)}
                                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Due Date</label>
                            <input
                                type="datetime-local"
                                value={assignmentDueDate}
                                onChange={(e) => setAssignmentDueDate(e.target.value)}
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Instructions / Description</label>
                            <textarea
                                rows={3}
                                value={assignmentDesc}
                                onChange={(e) => setAssignmentDesc(e.target.value)}
                                placeholder="Submit lab report file along with clean Python code..."
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition resize-none"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setActiveModal(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-md hover:from-emerald-700 hover:to-teal-700 transition disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                Publish Assignment
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 4. QUICK MEETING / VIVA MODAL (Cmd+4 / Ctrl+4) */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeModal === 'meeting' && (
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
                    <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                <Video className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm leading-tight">Instant Meeting / Live Viva</h3>
                                <p className="text-[11px] text-blue-100">Launch video room with 1-click invite link</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-black/20 text-[10px] font-mono font-bold tracking-wider">⌘4</span>
                            <button onClick={() => { setActiveModal(null); setCreatedMeetingLink(null); }} className="p-1 rounded-lg hover:bg-white/20 transition">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {!createdMeetingLink ? (
                        <form onSubmit={handleCreateMeeting} className="p-5 space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Session Title *</label>
                                <input
                                    type="text"
                                    autoFocus
                                    required
                                    value={meetingTitle}
                                    onChange={(e) => setMeetingTitle(e.target.value)}
                                    placeholder="e.g., Quick Lab Viva Session / Practical Doubt Clearing"
                                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Session Type</label>
                                    <select
                                        value={meetingType}
                                        onChange={(e) => setMeetingType(e.target.value)}
                                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                    >
                                        <option value="viva">🎙️ Viva Voce Examination</option>
                                        <option value="meeting">👥 General Meeting</option>
                                        <option value="class">🏫 Live Class</option>
                                        <option value="doubt">❓ Doubt Session</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Class (Optional)</label>
                                    <select
                                        value={meetingClassId}
                                        onChange={(e) => setMeetingClassId(e.target.value)}
                                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                    >
                                        <option value="">All / Open Session</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>
                                                🎓 {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setActiveModal(null)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl shadow-md hover:from-blue-700 hover:to-cyan-700 transition disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                                    Start Meeting Room
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="p-5 space-y-4 text-center">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-base">Meeting Room Ready!</h4>
                                <p className="text-xs text-slate-500 mt-1">Share the link with participants or join now.</p>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                                <span className="text-xs font-mono text-slate-700 truncate">{createdMeetingLink}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(createdMeetingLink);
                                        toast.success('📋 Link copied to clipboard!');
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition shadow-2xs"
                                >
                                    <Copy className="w-3.5 h-3.5" /> Copy
                                </button>
                            </div>

                            <div className="flex items-center justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        window.location.href = createdMeetingLink;
                                    }}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs shadow-md hover:from-blue-700 hover:to-cyan-700 transition"
                                >
                                    <Video className="w-4 h-4" /> Join Room Now
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 5. QUICK TICKET / ISSUE REPORT (Cmd+5 / Ctrl+5) */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeModal === 'ticket' && (
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
                    <div className="px-5 py-4 bg-gradient-to-r from-rose-600 to-pink-600 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                <Ticket className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm leading-tight">Report Lab Issue / Ticket</h3>
                                <p className="text-[11px] text-rose-100">Raise maintenance or hardware support ticket</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-black/20 text-[10px] font-mono font-bold tracking-wider">⌘5</span>
                            <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg hover:bg-white/20 transition">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Issue Title *</label>
                            <input
                                type="text"
                                autoFocus
                                required
                                value={ticketTitle}
                                onChange={(e) => setTicketTitle(e.target.value)}
                                placeholder="e.g., Computer Lab 01 - PC-04 Monitor Not Powering On"
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none transition font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                                <select
                                    value={ticketCategory}
                                    onChange={(e) => setTicketCategory(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none transition font-medium"
                                >
                                    <option value="hardware">🖥️ Hardware</option>
                                    <option value="software">💻 Software</option>
                                    <option value="network">🌐 Network</option>
                                    <option value="lab_equipment">⚡ Equipment</option>
                                    <option value="other">📋 General</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Priority</label>
                                <select
                                    value={ticketPriority}
                                    onChange={(e) => setTicketPriority(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none transition font-medium"
                                >
                                    <option value="low">🟢 Low</option>
                                    <option value="medium">🟡 Medium</option>
                                    <option value="high">🟠 High</option>
                                    <option value="urgent">🔴 Urgent</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Lab Location</label>
                                <select
                                    value={ticketLabId}
                                    onChange={(e) => setTicketLabId(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none transition"
                                >
                                    <option value="">Select Lab</option>
                                    {labs.map(l => (
                                        <option key={l.id} value={l.id}>
                                            {l.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Detailed Description</label>
                            <textarea
                                rows={3}
                                value={ticketDescription}
                                onChange={(e) => setTicketDescription(e.target.value)}
                                placeholder="Describe the fault symptoms, error codes, or affected workstation ID..."
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none transition resize-none"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setActiveModal(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-pink-600 rounded-xl shadow-md hover:from-rose-700 hover:to-pink-700 transition disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ticket className="w-3.5 h-3.5" />}
                                Submit Ticket
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 6. QUICK DOCUMENT UPLOAD (Cmd+6 / Ctrl+6) */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeModal === 'document' && (
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
                    <div className="px-5 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                <Upload className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm leading-tight">Quick Document Upload</h3>
                                <p className="text-[11px] text-purple-100">Upload lab manuals, study material, or notes</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-black/20 text-[10px] font-mono font-bold tracking-wider">⌘6</span>
                            <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg hover:bg-white/20 transition">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleUploadDoc} className="p-5 space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select File *</label>
                            <input
                                type="file"
                                required
                                autoFocus
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setDocFile(file);
                                        if (!docTitle) setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
                                    }
                                }}
                                className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition cursor-pointer"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Document Title</label>
                            <input
                                type="text"
                                value={docTitle}
                                onChange={(e) => setDocTitle(e.target.value)}
                                placeholder="e.g., Computer Science Practical Manual 2026"
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Class (Optional)</label>
                            <select
                                value={docClassId}
                                onChange={(e) => setDocClassId(e.target.value)}
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
                            >
                                <option value="">General / All Classes</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>
                                        🎓 {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setActiveModal(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-md hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                Upload Document
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 7. KEYBOARD SHORTCUTS CHEAT SHEET (Cmd+? / Cmd+H) */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeModal === 'cheatsheet' && (
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-150">
                    <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
                                <Keyboard className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base leading-tight">Keyboard Shortcuts Command Center</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Quickly invoke any feature from anywhere in the app</p>
                            </div>
                        </div>
                        <button onClick={() => setActiveModal(null)} className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 space-y-5">
                        <div>
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">Quick Creation & Invocations</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {[
                                    { key: '⌘1', title: 'New Sticky Note', desc: 'Create quick note / reminder', modal: 'note', icon: StickyNote, color: 'text-amber-600 bg-amber-50' },
                                    { key: '⌘2', title: 'New Class', desc: 'Create academic batch / class', modal: 'class', icon: GraduationCap, color: 'text-indigo-600 bg-indigo-50' },
                                    { key: '⌘3', title: 'New Assignment', desc: 'Create practical / task', modal: 'assignment', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50' },
                                    { key: '⌘4', title: 'Quick Meeting / Viva', desc: 'Start live video session', modal: 'meeting', icon: Video, color: 'text-blue-600 bg-blue-50' },
                                    { key: '⌘5', title: 'Report Issue / Ticket', desc: 'Raise hardware / lab ticket', modal: 'ticket', icon: Ticket, color: 'text-rose-600 bg-rose-50' },
                                    { key: '⌘6', title: 'Upload Document', desc: 'Fast file upload & share', modal: 'document', icon: Upload, color: 'text-purple-600 bg-purple-50' }
                                ].map(item => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.key}
                                            onClick={() => setActiveModal(item.modal)}
                                            className="flex items-center justify-between p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-md transition text-left group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-xs text-slate-800 group-hover:text-indigo-600 transition">{item.title}</h5>
                                                    <p className="text-[11px] text-slate-400">{item.desc}</p>
                                                </div>
                                            </div>
                                            <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 shadow-2xs">
                                                {item.key}
                                            </kbd>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">AI & Navigation Shortcuts</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {[
                                    { key: '⌘K', title: 'Global Search', desc: 'Search everything across ULRMS' },
                                    { key: '⌘J', title: 'AI Assistant (LIA)', desc: 'Open chatbot with direct input focus' },
                                    { key: '⌘⇧V', title: 'Voice AI Assistant', desc: 'Speak voice commands anywhere' },
                                    { key: '⌘?', title: 'Shortcuts Help', desc: 'Open this cheat sheet dialog' },
                                    { key: 'Esc', title: 'Close Dialogs', desc: 'Dismiss any open modal or menu' }
                                ].map(item => (
                                    <div
                                        key={item.key}
                                        className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/50 text-left"
                                    >
                                        <div>
                                            <h5 className="font-bold text-xs text-slate-700">{item.title}</h5>
                                            <p className="text-[11px] text-slate-400">{item.desc}</p>
                                        </div>
                                        <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 shadow-2xs">
                                            {item.key}
                                        </kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <span>💡 Tip: On Windows or Linux, replace <strong>⌘ (Cmd)</strong> with <strong>Ctrl</strong>.</span>
                        <button
                            onClick={() => setActiveModal(null)}
                            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
