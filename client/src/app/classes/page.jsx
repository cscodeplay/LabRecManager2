'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
    Users, GraduationCap, Search, Plus, Eye, UserPlus, Calendar, Lock,
    ArrowLeft, Edit2, Trash2, X, Check, AlertCircle, Save, ChevronLeft, ChevronRight, RotateCcw
} from 'lucide-react';
import { FluentExamHubIcon } from '@/components/FluentAppIcons';
import { useAuthStore } from '@/lib/store';
import { classesAPI } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDateRange } from '@/lib/dateUtils';
import ConfirmDialog, { useConfirm } from '@/components/ConfirmDialog';
import GreenSegmentedSpinner from '@/components/GreenSegmentedSpinner';

const STREAMS = ['General', 'Science', 'Commerce', 'Arts', 'Medical', 'Non-Medical', 'Vocational'];

export default function ClassesPage() {
    const router = useRouter();
    const confirm = useConfirm();
    const { t } = useTranslation('common');
    const { user, isAuthenticated, _hasHydrated, selectedSessionId, selectedSession, isReadOnlyMode } = useAuthStore();
    const [classes, setClasses] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStream, setSelectedStream] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 9;

    // Edit Class Modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [editForm, setEditForm] = useState({
        name: '',
        nameHindi: '',
        gradeLevel: 1,
        section: '',
        stream: 'General',
        classTeacherId: '',
        maxStudents: 60
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadClasses();
        loadInstructors();
    }, [isAuthenticated, _hasHydrated, selectedSessionId]);

    const loadClasses = async () => {
        setLoading(true);
        try {
            const res = await classesAPI.getAll();
            setClasses(res.data.data.classes || []);
        } catch (error) {
            toast.error(t('common.noData'));
        } finally {
            setLoading(false);
        }
    };

    const loadInstructors = async () => {
        try {
            const res = await api.get('/users', { params: { role: 'instructor', limit: 200 } });
            setInstructors(res.data?.data?.users || []);
        } catch {
            // quiet
        }
    };

    const handleOpenEditModal = (cls, e) => {
        e?.stopPropagation?.();
        setEditingClass(cls);
        setEditForm({
            name: cls.name || '',
            nameHindi: cls.nameHindi || '',
            gradeLevel: cls.gradeLevel || 1,
            section: cls.section || '',
            stream: cls.stream || 'General',
            classTeacherId: cls.classTeacher?.id || cls.classTeacherId || '',
            maxStudents: cls.maxStudents || 60
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async (e) => {
        e?.preventDefault?.();
        if (!editingClass?.id) return;
        if (!editForm.name.trim()) {
            toast.error('Class name is required');
            return;
        }

        setSaving(true);
        try {
            await classesAPI.update(editingClass.id, {
                name: editForm.name.trim(),
                nameHindi: editForm.nameHindi?.trim() || null,
                gradeLevel: parseInt(editForm.gradeLevel, 10),
                section: editForm.section?.trim() || null,
                stream: editForm.stream || 'General',
                classTeacherId: editForm.classTeacherId || null,
                maxStudents: parseInt(editForm.maxStudents, 10) || 60
            });
            toast.success('Class updated successfully', { icon: '✓' });
            setShowEditModal(false);
            loadClasses();
        } catch (error) {
            console.error('Failed to update class:', error);
            toast.error(error.response?.data?.message || 'Failed to update class');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClass = async (cls, e) => {
        e?.stopPropagation?.();
        const confirmed = await confirm({
            title: `Delete Class "${cls.name}"?`,
            message: `Are you sure you want to delete class ${cls.name}? This will remove the class, its student enrollments, subject mappings, and timetables. This action cannot be undone.`,
            confirmText: 'Delete Class',
            cancelText: 'Cancel',
            danger: true
        });

        if (!confirmed) return;

        const toastId = toast.loading('Deleting class...');
        try {
            await classesAPI.delete(cls.id);
            toast.success('Class deleted successfully', { id: toastId, icon: '🗑️' });
            setClasses(prev => prev.filter(c => c.id !== cls.id));
        } catch (error) {
            console.error('Failed to delete class:', error);
            toast.error(error.response?.data?.message || 'Failed to delete class', { id: toastId });
        }
    };

    const filteredClasses = classes.filter(c => {
        const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.nameHindi?.includes(searchQuery);
        const matchesStream = selectedStream === 'All' || (c.stream || 'General') === selectedStream;
        return matchesSearch && matchesStream;
    });

    const totalPages = Math.max(1, Math.ceil(filteredClasses.length / ITEMS_PER_PAGE));
    const paginatedClasses = filteredClasses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const streamCounts = {
        All: classes.length,
        ...STREAMS.reduce((acc, s) => {
            acc[s] = classes.filter(c => (c.stream || 'General') === s).length;
            return acc;
        }, {})
    };

    const isAdmin = user?.role === 'admin' || user?.role === 'principal';

    if (loading) {
        return <GreenSegmentedSpinner fullscreen label="Loading classes roster..." />;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 -ml-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition" title={t('common.back')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('classes.title')}</h1>
                    </div>
                    {isAdmin && (
                        <Link href="/classes/create" className="p-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-md shadow-primary-500/20 transition-colors flex items-center justify-center" title={t('classes.addClass')}>
                            <Plus className="w-5 h-5" />
                        </Link>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Session Indicator */}
                {selectedSession && (
                    <div className={`rounded-2xl p-4 flex items-center justify-between ${isReadOnlyMode
                        ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50'
                        : 'bg-gradient-to-r from-primary-50 to-primary-100 dark:from-slate-900 dark:to-primary-950/40 border border-primary-200 dark:border-primary-900/50'
                        }`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isReadOnlyMode ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-primary-100 dark:bg-primary-900/50'
                                }`}>
                                <Calendar className={`w-5 h-5 ${isReadOnlyMode ? 'text-amber-600 dark:text-amber-400' : 'text-primary-600 dark:text-primary-400'}`} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {selectedSession.yearLabel}
                                    </span>
                                    {selectedSession.isCurrent ? (
                                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs rounded-full font-bold">
                                            {t('classes.currentSession')}
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs rounded-full font-bold flex items-center gap-1">
                                            <Lock className="w-3 h-3" />
                                            {t('classes.historical')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {formatDateRange(selectedSession.startDate, selectedSession.endDate, true)}
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                            {t('classes.sessionHint')}
                        </p>
                    </div>
                )}

                {/* Stream Filter Pills & Search Bar (Pattern 1: Data Catalog) */}
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        {/* Stream Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                            {['All', ...STREAMS].map((st) => {
                                const count = streamCounts[st] || 0;
                                const isSelected = selectedStream === st;
                                return (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => { setSelectedStream(st); setCurrentPage(1); }}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                            isSelected
                                                ? 'bg-primary-600 text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <span>{st}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search Input */}
                        <div className="relative min-w-[240px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder={t('classes.searchClasses')}
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Classes Grid */}
                {filteredClasses.length === 0 ? (
                    /* Pattern 5: Friendly Tactile Empty State */
                    <div className="card p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-xs">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 mx-auto flex items-center justify-center mb-4 text-primary-500 shadow-xs border border-slate-200/80 dark:border-slate-700/80">
                            <FluentExamHubIcon size={34} />
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
                            {searchQuery || selectedStream !== 'All' ? 'No matching classes found' : t('classes.noClassesFound')}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                            {searchQuery || selectedStream !== 'All'
                                ? 'Try adjusting your search query or selecting a different academic stream filter.'
                                : (isAdmin ? t('classes.createFirst') : t('classes.noClassesAvailable'))
                            }
                        </p>
                        {(searchQuery || selectedStream !== 'All') && (
                            <button
                                type="button"
                                onClick={() => { setSearchQuery(''); setSelectedStream('All'); setCurrentPage(1); }}
                                className="btn btn-sm btn-secondary text-xs inline-flex items-center gap-1.5 rounded-xl"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset Filter Pills</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {paginatedClasses.map((cls) => (
                                <div key={cls.id} className="card hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95">
                                    <div className="p-5 flex-1">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-xs shadow-primary-500/20">
                                                {cls.gradeLevel}
                                                {cls.section && <span className="text-xs ml-0.5">{cls.section}</span>}
                                            </div>
                                            <span className="text-[11px] text-slate-700 dark:text-slate-300 font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-mono uppercase tracking-wider">
                                                {cls.stream || t('classes.general')}
                                            </span>
                                        </div>

                                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1 tracking-tight">{cls.name}</h3>
                                        {cls.nameHindi && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{cls.nameHindi}</p>
                                        )}

                                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3 font-medium">
                                            <span className="flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5 text-primary-500" />
                                                <span>{cls._count?.enrollments || 0} enrolled</span>
                                            </span>
                                            {cls.maxStudents && (
                                                <span className="text-slate-400 font-mono text-[11px]">
                                                    / {cls.maxStudents} max
                                                </span>
                                            )}
                                        </div>

                                        {cls.classTeacher && (
                                            <p className="text-xs text-slate-600 dark:text-slate-300">
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{t('classes.teacher')}:</span> {cls.classTeacher.firstName} {cls.classTeacher.lastName}
                                            </p>
                                        )}
                                    </div>

                                    {/* Icon-Only Action Bar */}
                                    <div className="px-4 py-2 bg-slate-50/90 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-1">
                                        <Link
                                            href={`/classes/${cls.id}`}
                                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg transition-colors"
                                            title={t('classes.view')}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                        {isAdmin && (
                                            <>
                                                <Link
                                                    href={`/classes/${cls.id}`}
                                                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg transition-colors"
                                                    title="Manage Students"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleOpenEditModal(cls, e)}
                                                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                                                    title="Edit Class"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDeleteClass(cls, e)}
                                                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                                                    title="Delete Class"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Bar (Default 9-10 items per page) */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                                <div>
                                    Showing <span className="font-bold text-slate-700 dark:text-slate-300">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(currentPage * ITEMS_PER_PAGE, filteredClasses.length)}</span> of <span className="font-bold text-slate-700 dark:text-slate-300">{filteredClasses.length}</span> classes
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                        title="Previous Page"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="px-3 py-1 font-mono text-xs font-semibold">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                        title="Next Page"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Edit Class Modal */}
            {showEditModal && editingClass && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Edit2 className="w-4 h-4 text-primary-500" />
                                Edit Class: {editingClass.name}
                            </h2>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                    Class Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="input text-sm"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    placeholder="e.g., 12 Medical A"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                        Grade Level (1-12) *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        required
                                        className="input text-sm"
                                        value={editForm.gradeLevel}
                                        onChange={(e) => setEditForm({ ...editForm, gradeLevel: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                        Section
                                    </label>
                                    <input
                                        type="text"
                                        maxLength="10"
                                        className="input text-sm"
                                        value={editForm.section}
                                        onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                                        placeholder="e.g., A, B"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                        Stream
                                    </label>
                                    <select
                                        className="select text-sm"
                                        value={editForm.stream}
                                        onChange={(e) => setEditForm({ ...editForm, stream: e.target.value })}
                                    >
                                        {STREAMS.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                        Max Students
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="200"
                                        className="input text-sm"
                                        value={editForm.maxStudents}
                                        onChange={(e) => setEditForm({ ...editForm, maxStudents: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                    Class Teacher
                                </label>
                                <select
                                    className="select text-sm"
                                    value={editForm.classTeacherId}
                                    onChange={(e) => setEditForm({ ...editForm, classTeacherId: e.target.value })}
                                >
                                    <option value="">No class teacher assigned</option>
                                    {instructors.map(ins => (
                                        <option key={ins.id} value={ins.id}>
                                            {ins.firstName} {ins.lastName} ({ins.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                    Name in Hindi (Optional)
                                </label>
                                <input
                                    type="text"
                                    className="input text-sm"
                                    value={editForm.nameHindi}
                                    onChange={(e) => setEditForm({ ...editForm, nameHindi: e.target.value })}
                                    placeholder="कक्षा 12"
                                />
                            </div>

                            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    disabled={saving}
                                    className="btn btn-sm btn-secondary text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn btn-sm btn-primary flex items-center gap-1.5 text-xs px-5 shadow-sm"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    {saving ? 'Saving Changes...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
