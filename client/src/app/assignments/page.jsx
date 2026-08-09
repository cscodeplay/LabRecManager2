'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
    FileText, Plus, Search, Filter, Calendar, Users,
    ChevronRight, Clock, CheckCircle, Edit, Trash2, Eye, Send, Upload
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { assignmentsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function AssignmentsPage() {
    const router = useRouter();
    const { t } = useTranslation('common');
    const { user, isAuthenticated, _hasHydrated, selectedSessionId } = useAuthStore();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, title: '' });
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadAssignments();
    }, [isAuthenticated, _hasHydrated, selectedSessionId, statusFilter]);

    const loadAssignments = async () => {
        setLoading(true);
        try {
            const res = await assignmentsAPI.getAll({ status: statusFilter !== 'all' ? statusFilter : undefined });
            const list = res.data?.data?.assignments || res.data?.assignments || (Array.isArray(res.data) ? res.data : []);
            setAssignments(list);
        } catch (error) {
            console.error('Failed to load assignments:', error);
            const msg = error.response?.data?.message || error.message || t('common.noData');
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (id, title) => {
        setDeleteDialog({ open: true, id, title });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteDialog.id) return;
        setDeleteLoading(true);
        try {
            await assignmentsAPI.delete(deleteDialog.id);
            toast.success(t('common.delete'));
            setDeleteDialog({ open: false, id: null, title: '' });
            loadAssignments();
        } catch (error) {
            toast.error(error.response?.data?.message || t('common.noData'));
        } finally {
            setDeleteLoading(false);
        }
    };

    const handlePublish = async (id) => {
        try {
            await assignmentsAPI.publish(id);
            toast.success(t('assignments.published') + '!');
            loadAssignments();
        } catch (error) {
            toast.error(t('common.noData'));
        }
    };

    const filteredAssignments = assignments.filter(a =>
        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.titleHindi?.includes(searchQuery)
    );

    const getStatusBadge = (status) => {
        const styles = {
            draft: 'badge-warning',
            published: 'badge-success',
            archived: 'badge-danger'
        };
        return styles[status] || 'badge-primary';
    };

    const getStatusLabel = (status) => {
        const labels = {
            draft: t('assignments.draft'),
            published: t('assignments.published'),
            archived: t('assignments.archived')
        };
        return labels[status] || status;
    };

    const isInstructor = user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'lab_assistant';

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader title={t('assignments.title')}>
                {isInstructor && (
                    <Link href="/assignments/create" className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-sm transition-colors flex items-center justify-center" title={t('assignments.createAssignment')}>
                        <Plus className="w-5 h-5" />
                    </Link>
                )}
            </PageHeader>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Filters */}
                <div className="card p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder={t('assignments.searchAssignments')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input pl-10"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); loadAssignments(); }}
                            className="input w-full md:w-48"
                        >
                            <option value="all">{t('assignments.allStatus')}</option>
                            <option value="draft">{t('assignments.draft')}</option>
                            <option value="published">{t('assignments.published')}</option>
                            <option value="archived">{t('assignments.archived')}</option>
                        </select>
                    </div>
                </div>

                {/* Assignments List */}
                {filteredAssignments.length === 0 ? (
                    <div className="card p-12 text-center">
                        <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-700 mb-2">{t('assignments.noAssignmentsFound')}</h3>
                        <p className="text-slate-500">
                            {isInstructor ? t('assignments.createFirst') : t('assignments.noAssignmentsYet')}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredAssignments.map((assignment) => (
                            <div key={assignment.id} className="card hover:shadow-md hover:border-slate-300 transition group flex flex-col overflow-hidden">
                                <div className="p-5 flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`badge ${getStatusBadge(assignment.status)}`}>
                                                {getStatusLabel(assignment.status)}
                                            </span>
                                            {assignment.experimentNumber && (
                                                <span className="text-sm text-slate-500">{assignment.experimentNumber}</span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-1">
                                            {assignment.title}
                                        </h3>
                                        {assignment.titleHindi && (
                                            <p className="text-sm text-slate-600 mb-2">{assignment.titleHindi}</p>
                                        )}
                                        <p className="text-slate-600 text-sm line-clamp-2 mb-3">
                                            {assignment.description}
                                        </p>
                                        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                                            {assignment.status === 'draft' && assignment.publishDate && (
                                                <span className="flex items-center gap-1 text-amber-600">
                                                    <Clock className="w-4 h-4" />
                                                    {t('assignments.scheduled')}: {new Date(assignment.publishDate).toLocaleString()}
                                                </span>
                                            )}
                                            {assignment.status === 'published' && (
                                                <span className="flex items-center gap-1 text-emerald-600">
                                                    <CheckCircle className="w-4 h-4" />
                                                    {t('assignments.published')}: {assignment.publishDate ? new Date(assignment.publishDate).toLocaleString() : new Date(assignment.createdAt).toLocaleString()}
                                                </span>
                                            )}
                                            {!assignment.publishDate && assignment.status === 'draft' && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {t('assignments.created')}: {new Date(assignment.createdAt).toLocaleString()}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <CheckCircle className="w-4 h-4" />
                                                {t('assignments.maxMarks')}: {assignment.maxMarks}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FileText className="w-4 h-4" />
                                                {assignment.assignmentType}
                                            </span>
                                        </div>
                                </div>
                                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-1 text-slate-500">
                                    <Link
                                        href={`/assignments/${assignment.id}`}
                                        className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                                        title={t('common.view')}
                                    >
                                        <Eye className="w-5 h-5" />
                                    </Link>
                                    {isInstructor && (
                                        <>
                                            {assignment.status === 'draft' && (
                                                <button
                                                    onClick={() => handlePublish(assignment.id)}
                                                    className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                                    title={t('assignments.publish')}
                                                >
                                                    <Send className="w-5 h-5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteClick(assignment.id, assignment.title)}
                                                className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title={t('common.delete')}
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                    {user?.role === 'student' && assignment.status === 'published' && (
                                        <Link
                                            href={`/assignments/${assignment.id}/submit`}
                                            className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                                            title={t('assignments.submit')}
                                        >
                                            <Upload className="w-5 h-5" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteDialog.open}
                onClose={() => setDeleteDialog({ open: false, id: null, title: '' })}
                onConfirm={handleDeleteConfirm}
                title={t('assignments.deleteAssignment')}
                message={t('assignments.deleteConfirm')}
                confirmText={t('common.delete')}
                type="danger"
                loading={deleteLoading}
            />
        </div>
    );
}
