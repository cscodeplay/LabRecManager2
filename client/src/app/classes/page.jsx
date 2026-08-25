'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
    Users, GraduationCap, Search, Plus, Eye, UserPlus, Calendar, Lock,
    ArrowLeft, Edit2, Trash2, X, Check, AlertCircle, Save
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { classesAPI } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDateRange } from '@/lib/dateUtils';
import ConfirmDialog, { useConfirm } from '@/components/ConfirmDialog';

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

    const filteredClasses = classes.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.nameHindi?.includes(searchQuery)
    );

    const isAdmin = user?.role === 'admin' || user?.role === 'principal';

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
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

                {/* Search */}
                <div className="card p-4">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('classes.searchClasses')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-11 rounded-xl"
                        />
                    </div>
                </div>

                {/* Classes Grid */}
                {filteredClasses.length === 0 ? (
                    <div className="card p-12 text-center">
                        <GraduationCap className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">{t('classes.noClassesFound')}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {isAdmin ? t('classes.createFirst') : t('classes.noClassesAvailable')}
                        </p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredClasses.map((cls) => (
                            <div key={cls.id} className="card hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition group flex flex-col overflow-hidden">
                                <div className="p-5 flex-1">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-primary-500/20">
                                            {cls.gradeLevel}
                                            {cls.section && <span className="text-sm ml-0.5">{cls.section}</span>}
                                        </div>
                                        <span className="text-xs text-slate-600 dark:text-slate-300 font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                                            {cls.stream || t('classes.general')}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{cls.name}</h3>
                                    {cls.nameHindi && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{cls.nameHindi}</p>
                                    )}

                                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3 font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <Users className="w-4 h-4 text-primary-500" />
                                            {cls._count?.enrollments || 0} {t('classes.students')}
                                        </span>
                                    </div>

                                    {cls.classTeacher && (
                                        <p className="text-xs text-slate-600 dark:text-slate-300">
                                            <span className="font-bold text-slate-700 dark:text-slate-200">{t('classes.teacher')}:</span> {cls.classTeacher.firstName} {cls.classTeacher.lastName}
                                        </p>
                                    )}
                                </div>

                                {/* Icon-Only Action Bar */}
                                <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-1.5">
                                    <Link
                                        href={`/classes/${cls.id}`}
                                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg transition-colors"
                                        title={t('classes.view')}
                                    >
                                        <Eye className="w-5 h-5" />
                                    </Link>
                                    {isAdmin && (
                                        <>
                                            <Link
                                                href={`/classes/${cls.id}`}
                                                className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg transition-colors"
                                                title="Manage Students"
                                            >
                                                <UserPlus className="w-5 h-5" />
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={(e) => handleOpenEditModal(cls, e)}
                                                className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                                                title="Edit Class"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteClass(cls, e)}
                                                className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                                                title="Delete Class"
                                            >
                                                <Trash2 className="w-5 h-5 text-red-500" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
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
