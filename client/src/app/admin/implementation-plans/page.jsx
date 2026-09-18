'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ListTodo, Plus, Search, Filter, Calendar, Clock,
    Download, Mail, CheckCircle2, Play, AlertCircle,
    FileSpreadsheet, FileText, ChevronRight, Edit3, Trash2,
    Check, X, RefreshCw, Sparkles, ArrowUpDown, ChevronDown,
    ExternalLink, Eye, ArrowLeft, Send, CheckSquare, Square,
    BarChart3, Activity, Layers, Tag
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { implementationPlansAPI } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { formatDateTime, formatDate } from '@/lib/dateUtils';

// Helper to convert ISO string to datetime-local input value (YYYY-MM-DDTHH:mm)
function toDatetimeLocal(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ImplementationPlansPage() {
    const router = useRouter();
    const confirm = useConfirm();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    // Data states
    const [plans, setPlans] = useState([]);
    const [kpis, setKpis] = useState({
        total: 0,
        completed: 0,
        in_progress: 0,
        draft: 0,
        on_hold: 0,
        totalTasks: 0,
        completedTasks: 0,
        totalDurationFormatted: '0h 0m'
    });
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');

    // Modals
    const [showCreateEditModal, setShowCreateEditModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [showViewModal, setShowViewModal] = useState(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportTargetPlan, setExportTargetPlan] = useState(null); // null means all filtered plans

    // Form state for Create/Edit
    const [formData, setFormData] = useState({
        title: '',
        category: 'Feature & Infrastructure',
        status: 'draft',
        started_at: '',
        ended_at: '',
        description: '',
        outcomes: '',
        tasks: []
    });
    const [newTaskInput, setNewTaskInput] = useState('');
    const [saving, setSaving] = useState(false);

    // Export & Auto-mail state
    const [exportFormats, setExportFormats] = useState({ pdf: true, xlsx: true, csv: false });
    const [mailRecipient, setMailRecipient] = useState('');
    const [mailSubject, setMailSubject] = useState('');
    const [mailMessage, setMailMessage] = useState('');
    const [sendingMail, setSendingMail] = useState(false);
    const [exportingFormat, setExportingFormat] = useState(null);

    // Quick Complete Modal state
    const [quickCompleteTarget, setQuickCompleteTarget] = useState(null);
    const [quickCompleteAutoMail, setQuickCompleteAutoMail] = useState(true);

    // Auth verification
    useEffect(() => {
        if (_hasHydrated && (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'principal'))) {
            router.push('/dashboard');
        }
    }, [isAuthenticated, user, _hasHydrated, router]);

    // Initial load
    const loadPlans = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            if (categoryFilter !== 'all') params.category = categoryFilter;
            if (searchQuery.trim()) params.search = searchQuery.trim();
            if (startDateFilter) params.startDate = startDateFilter;
            if (endDateFilter) params.endDate = endDateFilter;

            const res = await implementationPlansAPI.getAll(params);
            if (res.data?.success) {
                setPlans(res.data.data.plans || []);
                setKpis(res.data.data.kpis || {});
                setCategories(res.data.data.categories || []);
            }
        } catch (err) {
            console.error('Failed to load implementation plans:', err);
            toast.error('Failed to load implementation plans');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, categoryFilter, searchQuery, startDateFilter, endDateFilter]);

    useEffect(() => {
        if (isAuthenticated) {
            loadPlans();
        }
    }, [loadPlans, isAuthenticated]);

    // Pre-fill user email in mail modal
    useEffect(() => {
        if (user?.email && !mailRecipient) {
            setMailRecipient(user.email);
        }
    }, [user, mailRecipient]);

    // Handle Quick Start
    const handleQuickStart = async (plan) => {
        try {
            const res = await implementationPlansAPI.start(plan.id);
            if (res.data?.success) {
                toast.success(`Plan "${plan.title}" marked as In Progress`);
                loadPlans();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to start plan');
        }
    };

    // Handle Quick Complete confirmation
    const handleConfirmQuickComplete = async () => {
        if (!quickCompleteTarget) return;
        try {
            const res = await implementationPlansAPI.complete(quickCompleteTarget.id, {
                autoMail: quickCompleteAutoMail,
                recipient: mailRecipient || user?.email
            });
            if (res.data?.success) {
                toast.success(`Plan "${quickCompleteTarget.title}" completed!`);
                if (quickCompleteAutoMail) {
                    toast.success('Completion report emailed successfully');
                }
                setQuickCompleteTarget(null);
                loadPlans();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to complete plan');
        }
    };

    // Handle Task Toggle
    const handleToggleTask = async (planId, taskIndex, currentCompleted) => {
        try {
            const res = await implementationPlansAPI.toggleTask(planId, taskIndex, !currentCompleted);
            if (res.data?.success) {
                // Update local state smoothly
                setPlans(prev => prev.map(p => p.id === planId ? res.data.data : p));
                if (showViewModal && showViewModal.id === planId) {
                    setShowViewModal(res.data.data);
                }
            }
        } catch (err) {
            toast.error('Failed to update task');
        }
    };

    // Handle Delete
    const handleDelete = async (plan) => {
        const confirmed = await confirm({
            title: 'Delete Implementation Plan?',
            message: `Are you sure you want to delete "${plan.title}"? This cannot be undone.`,
            confirmText: 'Delete Plan',
            confirmButtonClass: 'bg-rose-600 hover:bg-rose-700 text-white'
        });
        if (!confirmed) return;

        try {
            await implementationPlansAPI.delete(plan.id);
            toast.success('Plan deleted successfully');
            loadPlans();
        } catch (err) {
            toast.error('Failed to delete plan');
        }
    };

    // Open Create Modal
    const handleOpenCreate = () => {
        setEditingPlan(null);
        setFormData({
            title: '',
            category: 'Feature & Infrastructure',
            status: 'draft',
            started_at: '',
            ended_at: '',
            description: '',
            outcomes: '',
            tasks: []
        });
        setNewTaskInput('');
        setShowCreateEditModal(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (plan) => {
        setEditingPlan(plan);
        setFormData({
            title: plan.title,
            category: plan.category || 'General',
            status: plan.status || 'draft',
            started_at: toDatetimeLocal(plan.started_at),
            ended_at: toDatetimeLocal(plan.ended_at),
            description: plan.description || '',
            outcomes: plan.outcomes || '',
            tasks: Array.isArray(plan.tasks) ? [...plan.tasks] : []
        });
        setNewTaskInput('');
        setShowCreateEditModal(true);
    };

    // Add Task to form
    const handleAddTask = () => {
        if (!newTaskInput.trim()) return;
        setFormData(prev => ({
            ...prev,
            tasks: [...prev.tasks, { title: newTaskInput.trim(), completed: false, completedAt: null }]
        }));
        setNewTaskInput('');
    };

    // Remove Task from form
    const handleRemoveTask = (idx) => {
        setFormData(prev => ({
            ...prev,
            tasks: prev.tasks.filter((_, i) => i !== idx)
        }));
    };

    // Toggle Task in form
    const handleFormToggleTask = (idx) => {
        setFormData(prev => ({
            ...prev,
            tasks: prev.tasks.map((t, i) => i === idx ? { ...t, completed: !t.completed } : t)
        }));
    };

    // Save Create/Edit Form
    const handleSavePlan = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            toast.error('Plan title is required');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                title: formData.title.trim(),
                category: formData.category.trim(),
                status: formData.status,
                started_at: formData.started_at ? new Date(formData.started_at).toISOString() : null,
                ended_at: formData.ended_at ? new Date(formData.ended_at).toISOString() : null,
                description: formData.description.trim(),
                outcomes: formData.outcomes.trim(),
                tasks: formData.tasks
            };

            if (editingPlan) {
                await implementationPlansAPI.update(editingPlan.id, payload);
                toast.success('Implementation plan updated');
            } else {
                await implementationPlansAPI.create(payload);
                toast.success('Implementation plan created');
            }

            setShowCreateEditModal(false);
            loadPlans();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save plan');
        } finally {
            setSaving(false);
        }
    };

    // Direct Download Handler
    const handleDownloadExport = async (format, specificPlanId = null) => {
        try {
            setExportingFormat(format);
            const params = specificPlanId ? { planId: specificPlanId } : {
                status: statusFilter !== 'all' ? statusFilter : undefined,
                category: categoryFilter !== 'all' ? categoryFilter : undefined,
                search: searchQuery.trim() || undefined,
                startDate: startDateFilter || undefined,
                endDate: endDateFilter || undefined
            };

            let res;
            if (format === 'pdf') res = await implementationPlansAPI.exportPdf(params);
            else if (format === 'xlsx') res = await implementationPlansAPI.exportXlsx(params);
            else if (format === 'csv') res = await implementationPlansAPI.exportCsv(params);

            const blob = new Blob([res.data], {
                type: format === 'pdf' ? 'application/pdf' :
                      format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                      'text/csv; charset=utf-8'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().slice(0, 10);
            link.setAttribute('download', specificPlanId ? `implementation_plan_${dateStr}.${format}` : `implementation_plans_${dateStr}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success(`Exported ${format.toUpperCase()} successfully`);
        } catch (err) {
            console.error(`Failed to export ${format}:`, err);
            toast.error(`Failed to export ${format.toUpperCase()}`);
        } finally {
            setExportingFormat(null);
        }
    };

    // Open Export & Mail Modal
    const handleOpenExportModal = (targetPlan = null) => {
        setExportTargetPlan(targetPlan);
        setExportFormats({ pdf: true, xlsx: true, csv: false });
        setMailSubject(targetPlan 
            ? `[LabRecManager] Implementation Report: ${targetPlan.title}`
            : `[LabRecManager] Implementation Plans Status Report (${plans.length} plans)`);
        setMailMessage('');
        setShowExportModal(true);
    };

    // Send Email Handler
    const handleSendEmail = async (e) => {
        e.preventDefault();
        if (!mailRecipient.trim()) {
            toast.error('Please enter at least one recipient email address');
            return;
        }

        const selectedFormats = Object.keys(exportFormats).filter(k => exportFormats[k]);
        if (selectedFormats.length === 0) {
            toast.error('Please select at least one attachment format (PDF, XLSX, or CSV)');
            return;
        }

        try {
            setSendingMail(true);
            const res = await implementationPlansAPI.sendEmail({
                recipients: mailRecipient.trim(),
                formats: selectedFormats,
                subject: mailSubject.trim(),
                message: mailMessage.trim(),
                planId: exportTargetPlan ? exportTargetPlan.id : undefined,
                status: !exportTargetPlan && statusFilter !== 'all' ? statusFilter : undefined,
                category: !exportTargetPlan && categoryFilter !== 'all' ? categoryFilter : undefined,
                search: !exportTargetPlan && searchQuery.trim() ? searchQuery.trim() : undefined,
                startDate: !exportTargetPlan && startDateFilter ? startDateFilter : undefined,
                endDate: !exportTargetPlan && endDateFilter ? endDateFilter : undefined
            });

            if (res.data?.success) {
                const info = res.data.data;
                if (info.simulated) {
                    toast.success('Report generated & email simulated (SMTP credentials pending in env)');
                } else {
                    toast.success(`Report emailed to ${info.recipients?.join(', ')} successfully!`);
                }
                setShowExportModal(false);
            }
        } catch (err) {
            console.error('Failed to send email:', err);
            toast.error(err.response?.data?.message || 'Failed to dispatch email');
        } finally {
            setSendingMail(false);
        }
    };

    // Status badge style helper
    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Completed
                    </span>
                );
            case 'in_progress':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                        </span>
                        In Progress
                    </span>
                );
            case 'draft':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Draft
                    </span>
                );
            case 'on_hold':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                        On Hold
                    </span>
                );
            case 'failed':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <X className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        Failed
                    </span>
                );
            default:
                return <span className="text-xs text-slate-500">{status}</span>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Top Breadcrumb & Actions Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            <Link href="/dashboard" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Dashboard</Link>
                            <ChevronRight className="w-3.5 h-3.5" />
                            <span className="text-slate-800 dark:text-slate-200 font-semibold">Implementation Plans</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                                <ListTodo className="w-6 h-6" />
                            </div>
                            Implementation Plans Tracker
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Track execution start/end datetimes, milestone checklists, durations, and export audit reports with auto-mail.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            onClick={() => handleOpenExportModal(null)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs transition-all"
                        >
                            <Download className="w-4 h-4 text-blue-600" />
                            Export & Auto-Mail
                        </button>

                        <button
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/25 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            New Implementation Plan
                        </button>
                    </div>
                </div>

                {/* KPI Metrics Ribbon */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Plans</span>
                            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                                <Layers className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{kpis.total || 0}</span>
                            <span className="text-xs text-slate-500">records</span>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">In Progress</span>
                            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                                <Activity className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">{kpis.in_progress || 0}</span>
                            <span className="text-xs text-slate-500">active now</span>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Completed</span>
                            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{kpis.completed || 0}</span>
                            <span className="text-xs text-slate-500">
                                ({kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : 0}%)
                            </span>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Duration</span>
                            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{kpis.totalDurationFormatted || '0m'}</span>
                            <span className="text-xs text-slate-500">logged</span>
                        </div>
                    </div>
                </div>

                {/* Search & Filters Controls */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search plans by title, category, or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>

                        {/* Category Dropdown */}
                        <div className="w-full md:w-56">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                                <option value="all">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Range Inputs */}
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDateFilter}
                                onChange={(e) => setStartDateFilter(e.target.value)}
                                title="Filter from start date"
                                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                            />
                            <span className="text-xs text-slate-400">to</span>
                            <input
                                type="date"
                                value={endDateFilter}
                                onChange={(e) => setEndDateFilter(e.target.value)}
                                title="Filter up to end date"
                                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                            />
                        </div>

                        {/* Reset Filters */}
                        {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || startDateFilter || endDateFilter) && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('all');
                                    setCategoryFilter('all');
                                    setStartDateFilter('');
                                    setEndDateFilter('');
                                }}
                                className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors shrink-0"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-medium border-t border-slate-100 dark:border-slate-800/80 pt-3">
                        <span className="text-slate-400 mr-2 uppercase text-[10px] tracking-wider font-semibold">Status:</span>
                        {[
                            { key: 'all', label: 'All Plans' },
                            { key: 'in_progress', label: 'In Progress' },
                            { key: 'completed', label: 'Completed' },
                            { key: 'draft', label: 'Draft' },
                            { key: 'on_hold', label: 'On Hold' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setStatusFilter(tab.key)}
                                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                                    statusFilter === tab.key
                                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Plans List / Table View */}
                {loading ? (
                    <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">Loading implementation plans...</p>
                    </div>
                ) : plans.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <ListTodo className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">No implementation plans found</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                            {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                                ? 'No plans match the applied filters. Try resetting your search or filter options.'
                                : 'Get started by creating your first implementation plan to track milestones, datetimes, and outcomes.'}
                        </p>
                        <button
                            onClick={handleOpenCreate}
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Create New Plan
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {plans.map(plan => (
                            <div
                                key={plan.id}
                                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-4"
                            >
                                {/* Top Header of Plan Card */}
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {getStatusBadge(plan.status)}
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                <Tag className="w-3 h-3 text-slate-400" />
                                                {plan.category || 'General'}
                                            </span>
                                            {plan.duration && plan.duration !== 'Not Started' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                    <Clock className="w-3 h-3 text-indigo-500" />
                                                    {plan.duration}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer" onClick={() => setShowViewModal(plan)}>
                                            {plan.title}
                                        </h3>
                                        {plan.description && (
                                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                                {plan.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0">
                                        {plan.status !== 'in_progress' && plan.status !== 'completed' && (
                                            <button
                                                onClick={() => handleQuickStart(plan)}
                                                title="Start Plan (records start datetime)"
                                                className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 hover:bg-blue-100 transition-colors"
                                            >
                                                <Play className="w-4 h-4" />
                                            </button>
                                        )}

                                        {plan.status === 'in_progress' && (
                                            <button
                                                onClick={() => {
                                                    setQuickCompleteTarget(plan);
                                                    setQuickCompleteAutoMail(true);
                                                }}
                                                title="Complete Plan (records end datetime & auto-mail)"
                                                className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setShowViewModal(plan)}
                                            title="View Details"
                                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>

                                        <button
                                            onClick={() => handleOpenExportModal(plan)}
                                            title="Export & Email this plan"
                                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>

                                        <button
                                            onClick={() => handleOpenEdit(plan)}
                                            title="Edit Plan"
                                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>

                                        <button
                                            onClick={() => handleDelete(plan)}
                                            title="Delete Plan"
                                            className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 hover:bg-rose-100 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* DateTime & Execution Metrics Box */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/80 text-xs">
                                    <div>
                                        <span className="text-slate-400 block font-medium mb-0.5">Start DateTime:</span>
                                        <span className="text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                            {plan.started_at ? formatDateTime(plan.started_at) : <span className="text-slate-400 font-normal">Not started</span>}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 block font-medium mb-0.5">End DateTime:</span>
                                        <span className="text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                                            {plan.ended_at ? formatDateTime(plan.ended_at) : (
                                                plan.status === 'in_progress' ? (
                                                    <span className="text-blue-600 font-medium">Running (Active)</span>
                                                ) : (
                                                    <span className="text-slate-400 font-normal">Not finished</span>
                                                )
                                            )}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 block font-medium mb-0.5">Milestones Progress:</span>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-300 ${
                                                        plan.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-600'
                                                    }`}
                                                    style={{ width: `${plan.progress || 0}%` }}
                                                />
                                            </div>
                                            <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                                {plan.completedTasks}/{plan.totalTasks} ({plan.progress}%)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Checklist Preview with Live Toggle */}
                                {plan.tasks && plan.tasks.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Milestone Tasks:</span>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {plan.tasks.slice(0, 4).map((task, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => handleToggleTask(plan.id, idx, task.completed)}
                                                    className="flex items-start gap-2.5 p-2 rounded-xl text-left bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                                                >
                                                    <div className={`mt-0.5 p-0.5 rounded ${
                                                        task.completed 
                                                            ? 'bg-emerald-500 text-white' 
                                                            : 'border border-slate-300 dark:border-slate-700 text-transparent group-hover:border-slate-400'
                                                    }`}>
                                                        <Check className="w-3 h-3 stroke-[3]" />
                                                    </div>
                                                    <span className={`text-xs ${
                                                        task.completed 
                                                            ? 'line-through text-slate-400 dark:text-slate-500' 
                                                            : 'text-slate-700 dark:text-slate-200'
                                                    }`}>
                                                        {task.title}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                        {plan.tasks.length > 4 && (
                                            <button
                                                onClick={() => setShowViewModal(plan)}
                                                className="text-xs font-semibold text-blue-600 hover:underline inline-block pt-0.5"
                                            >
                                                +{plan.tasks.length - 4} more milestones...
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Outcomes banner if completed */}
                                {plan.outcomes && (
                                    <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-200">
                                        <span className="font-semibold text-emerald-800 dark:text-emerald-300 mr-1.5">Key Deliverables & Outcomes:</span>
                                        {plan.outcomes}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* CREATE / EDIT PLAN MODAL */}
            {showCreateEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 my-8">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <ListTodo className="w-5 h-5 text-blue-600" />
                                {editingPlan ? 'Edit Implementation Plan' : 'Create Implementation Plan'}
                            </h2>
                            <button
                                onClick={() => setShowCreateEditModal(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePlan} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                    Plan Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Interactive Realtime Whiteboard & Sockets Engine"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                        Category / Module
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Realtime Collaboration, Documents"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                        Execution Status
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                        <option value="on_hold">On Hold</option>
                                        <option value="failed">Failed</option>
                                    </select>
                                </div>
                            </div>

                            {/* Date Time Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                            Start DateTime
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, started_at: toDatetimeLocal(new Date().toISOString()) })}
                                            className="text-[11px] font-semibold text-blue-600 hover:underline"
                                        >
                                            Set to Now
                                        </button>
                                    </div>
                                    <input
                                        type="datetime-local"
                                        value={formData.started_at}
                                        onChange={(e) => setFormData({ ...formData, started_at: e.target.value })}
                                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                            End DateTime
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, ended_at: toDatetimeLocal(new Date().toISOString()) })}
                                            className="text-[11px] font-semibold text-blue-600 hover:underline"
                                        >
                                            Set to Now
                                        </button>
                                    </div>
                                    <input
                                        type="datetime-local"
                                        value={formData.ended_at}
                                        onChange={(e) => setFormData({ ...formData, ended_at: e.target.value })}
                                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                    Description
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Brief background and scope of the implementation plan..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>

                            {/* Milestone Tasks Builder */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                    Milestone Checklist ({formData.tasks.length} tasks)
                                </label>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add a milestone task..."
                                        value={newTaskInput}
                                        onChange={(e) => setNewTaskInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTask(); } }}
                                        className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddTask}
                                        className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                                    >
                                        Add Task
                                    </button>
                                </div>

                                {formData.tasks.length > 0 && (
                                    <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800">
                                        {formData.tasks.map((task, idx) => (
                                            <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => handleFormToggleTask(idx)}
                                                    className="flex items-center gap-2 text-left flex-1"
                                                >
                                                    <div className={`p-0.5 rounded ${task.completed ? 'bg-emerald-500 text-white' : 'border border-slate-300 dark:border-slate-700'}`}>
                                                        <Check className="w-3 h-3 stroke-[3]" />
                                                    </div>
                                                    <span className={task.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}>
                                                        {task.title}
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveTask(idx)}
                                                    className="text-slate-400 hover:text-rose-600 p-1"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                                    Outcomes & Key Deliverables
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Key results, verification outcome, and performance metrics..."
                                    value={formData.outcomes}
                                    onChange={(e) => setFormData({ ...formData, outcomes: e.target.value })}
                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateEditModal(false)}
                                    className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : (editingPlan ? 'Update Plan' : 'Create Plan')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PLAN DETAILS MODAL */}
            {showViewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 my-8">
                        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    {getStatusBadge(showViewModal.status)}
                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        {showViewModal.category || 'General'}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {showViewModal.title}
                                </h2>
                            </div>
                            <button
                                onClick={() => setShowViewModal(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {showViewModal.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                {showViewModal.description}
                            </p>
                        )}

                        {/* Execution Timelines */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                            <div>
                                <span className="text-slate-400 block mb-1">Start DateTime:</span>
                                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-blue-500" />
                                    {showViewModal.started_at ? formatDateTime(showViewModal.started_at) : 'Not started'}
                                </span>
                            </div>

                            <div>
                                <span className="text-slate-400 block mb-1">End DateTime:</span>
                                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-emerald-500" />
                                    {showViewModal.ended_at ? formatDateTime(showViewModal.ended_at) : (
                                        showViewModal.status === 'in_progress' ? 'Running / Active' : 'Not completed'
                                    )}
                                </span>
                            </div>

                            <div>
                                <span className="text-slate-400 block mb-1">Total Duration:</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 text-sm">
                                    <Clock className="w-4 h-4" />
                                    {showViewModal.duration || '—'}
                                </span>
                            </div>
                        </div>

                        {/* Full Milestone Tasks List */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Milestones & Subtasks ({showViewModal.completedTasks}/{showViewModal.totalTasks} Completed)
                                </h4>
                                <span className="text-xs font-bold text-blue-600">{showViewModal.progress}% Done</span>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {showViewModal.tasks && showViewModal.tasks.length > 0 ? (
                                    showViewModal.tasks.map((task, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleToggleTask(showViewModal.id, idx, task.completed)}
                                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1 rounded ${task.completed ? 'bg-emerald-500 text-white' : 'border border-slate-300 dark:border-slate-700'}`}>
                                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                </div>
                                                <span className={`text-sm ${task.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                    {task.title}
                                                </span>
                                            </div>
                                            {task.completedAt && (
                                                <span className="text-[11px] text-slate-400">
                                                    Done at {formatDateTime(task.completedAt)}
                                                </span>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-slate-400 italic">No milestone tasks defined for this plan.</p>
                                )}
                            </div>
                        </div>

                        {showViewModal.outcomes && (
                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-1">
                                    Results & Outcomes
                                </h4>
                                <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                                    {showViewModal.outcomes}
                                </p>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDownloadExport('pdf', showViewModal.id)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5"
                                >
                                    <FileText className="w-3.5 h-3.5 text-rose-500" />
                                    PDF
                                </button>
                                <button
                                    onClick={() => handleDownloadExport('xlsx', showViewModal.id)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                    Excel
                                </button>
                                <button
                                    onClick={() => handleDownloadExport('csv', showViewModal.id)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
                                    CSV
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const p = showViewModal;
                                        setShowViewModal(null);
                                        handleOpenExportModal(p);
                                    }}
                                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5"
                                >
                                    <Mail className="w-3.5 h-3.5" />
                                    Email Plan
                                </button>
                                <button
                                    onClick={() => setShowViewModal(null)}
                                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 text-white hover:bg-slate-900"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* QUICK COMPLETE CONFIRMATION MODAL WITH AUTO-MAIL */}
            {quickCompleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Mark Plan Completed?</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Sets end datetime to now and records execution duration.</p>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">{quickCompleteTarget.title}</span>
                            <span className="text-slate-500">Milestones: {quickCompleteTarget.completedTasks}/{quickCompleteTarget.totalTasks} completed</span>
                        </div>

                        <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-slate-800 dark:text-slate-200">
                            <input
                                type="checkbox"
                                checked={quickCompleteAutoMail}
                                onChange={(e) => setQuickCompleteAutoMail(e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                                <span className="font-semibold text-blue-900 dark:text-blue-300 block">Auto-Mail Completion Report</span>
                                <span className="text-[11px] text-slate-500">Email summary with PDF report to {user?.email || 'admin'}.</span>
                            </div>
                        </label>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setQuickCompleteTarget(null)}
                                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmQuickComplete}
                                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                            >
                                Complete Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EXPORT & AUTO-MAIL MODAL */}
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 my-8">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Download className="w-5 h-5 text-blue-600" />
                                    Export & Auto-Mail Reports
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {exportTargetPlan ? `Target: Single plan "${exportTargetPlan.title}"` : `Target: All currently filtered plans (${plans.length} records)`}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowExportModal(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Quick Direct Download Buttons */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                1. Direct Instant Download
                            </label>
                            <div className="grid grid-cols-3 gap-2.5">
                                <button
                                    onClick={() => handleDownloadExport('pdf', exportTargetPlan?.id)}
                                    disabled={exportingFormat === 'pdf'}
                                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-950 text-center transition-all group"
                                >
                                    <FileText className="w-6 h-6 text-rose-500 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-bold text-slate-800 dark:text-white block">Download PDF</span>
                                    <span className="text-[10px] text-slate-400">Formatted Report</span>
                                </button>

                                <button
                                    onClick={() => handleDownloadExport('xlsx', exportTargetPlan?.id)}
                                    disabled={exportingFormat === 'xlsx'}
                                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50 dark:bg-slate-950 text-center transition-all group"
                                >
                                    <FileSpreadsheet className="w-6 h-6 text-emerald-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-bold text-slate-800 dark:text-white block">Download Excel</span>
                                    <span className="text-[10px] text-slate-400">Dual Sheet .xlsx</span>
                                </button>

                                <button
                                    onClick={() => handleDownloadExport('csv', exportTargetPlan?.id)}
                                    disabled={exportingFormat === 'csv'}
                                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-950 text-center transition-all group"
                                >
                                    <FileSpreadsheet className="w-6 h-6 text-blue-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-bold text-slate-800 dark:text-white block">Download CSV</span>
                                    <span className="text-[10px] text-slate-400">RFC-4180 Table</span>
                                </button>
                            </div>
                        </div>

                        {/* Email Dispatch Form */}
                        <form onSubmit={handleSendEmail} className="space-y-3.5 border-t border-slate-100 dark:border-slate-800 pt-4">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                2. Auto-Mail Report to Stakeholders
                            </label>

                            {/* Format Checkboxes */}
                            <div className="flex items-center gap-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                                <span className="text-slate-400">Attach formats:</span>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={exportFormats.pdf}
                                        onChange={(e) => setExportFormats({ ...exportFormats, pdf: e.target.checked })}
                                        className="rounded text-blue-600"
                                    />
                                    PDF (.pdf)
                                </label>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={exportFormats.xlsx}
                                        onChange={(e) => setExportFormats({ ...exportFormats, xlsx: e.target.checked })}
                                        className="rounded text-emerald-600"
                                    />
                                    Excel (.xlsx)
                                </label>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={exportFormats.csv}
                                        onChange={(e) => setExportFormats({ ...exportFormats, csv: e.target.checked })}
                                        className="rounded text-blue-600"
                                    />
                                    CSV (.csv)
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Recipient Email(s) * (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="admin@school.edu, principal@school.edu"
                                    value={mailRecipient}
                                    onChange={(e) => setMailRecipient(e.target.value)}
                                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Subject Line
                                </label>
                                <input
                                    type="text"
                                    value={mailSubject}
                                    onChange={(e) => setMailSubject(e.target.value)}
                                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Custom Message / Notes (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Add any additional context or remarks for the recipients..."
                                    value={mailMessage}
                                    onChange={(e) => setMailMessage(e.target.value)}
                                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowExportModal(false)}
                                    className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendingMail}
                                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-50"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    {sendingMail ? 'Dispatching Email...' : 'Send Report via Email'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
