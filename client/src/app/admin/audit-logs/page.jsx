'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Activity, Search, Filter, RefreshCw,
    User, Clock, Download, ChevronLeft, ChevronRight,
    AlertCircle, CheckCircle, Settings, FileText, Edit3, Trash2, Database
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { auditAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const ACTION_ICONS = {
    login: '🔐',
    logout: '🚪',
    create: '➕',
    update: '✏️',
    delete: '🗑️',
    status_change: '🔄',
    grade: '📊',
    modify_grade: '📝',
    publish: '📢',
    share: '🔗',
    upload: '📤',
    download: '📥',
    approve: '✅',
    reject: '❌',
    assign: '📋',
    submit: '📨'
};

const ACTION_COLORS = {
    login: 'bg-blue-100 text-blue-700',
    logout: 'bg-slate-100 text-slate-700',
    create: 'bg-emerald-100 text-emerald-700',
    update: 'bg-amber-100 text-amber-700',
    delete: 'bg-red-100 text-red-700',
    status_change: 'bg-purple-100 text-purple-700',
    grade: 'bg-indigo-100 text-indigo-700',
    modify_grade: 'bg-orange-100 text-orange-700',
    publish: 'bg-green-100 text-green-700',
    share: 'bg-cyan-100 text-cyan-700',
    approve: 'bg-emerald-100 text-emerald-700',
    reject: 'bg-red-100 text-red-700'
};

export default function AuditLogsPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });

    // Filters
    const [filters, setFilters] = useState({
        action: '',
        entityType: '',
        search: '',
        startDate: '',
        endDate: ''
    });
    const [availableFilters, setAvailableFilters] = useState({ actions: [], entityTypes: [] });

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        if (!['admin', 'principal'].includes(user?.role)) {
            toast.error('Access denied');
            router.push('/dashboard');
            return;
        }
        loadData();
        loadFilters();
    }, [isAuthenticated, _hasHydrated]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [logsRes, statsRes] = await Promise.all([
                auditAPI.getLogs({
                    page: pagination.page,
                    limit: pagination.limit,
                    ...filters
                }),
                auditAPI.getStats()
            ]);
            setLogs(logsRes.data.data.logs || []);
            setPagination(p => ({ ...p, ...logsRes.data.data.pagination }));
            setStats(statsRes.data.data);
        } catch (error) {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const loadFilters = async () => {
        try {
            const res = await auditAPI.getActions();
            setAvailableFilters({
                actions: res.data.data.actions || [],
                entityTypes: res.data.data.entityTypes || []
            });
        } catch (error) {
            console.error('Failed to load filters:', error);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(f => ({ ...f, [key]: value }));
    };

    const applyFilters = () => {
        setPagination(p => ({ ...p, page: 1 }));
        loadData();
    };

    const clearFilters = () => {
        setFilters({ action: '', entityType: '', search: '', startDate: '', endDate: '' });
        setPagination(p => ({ ...p, page: 1 }));
        setTimeout(() => loadData(), 100);
    };

    const goToPage = (page) => {
        setPagination(p => ({ ...p, page }));
        loadData();
    };

    const formatDateTime = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading && logs.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="text-slate-400 hover:text-slate-600">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary-600" />
                                Audit Logs
                            </h1>
                            <p className="text-sm text-slate-500">System-wide activity tracking</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/admin/query-logs" className="btn btn-warning gap-2">
                            <Database className="w-4 h-4" />
                            Query Logs
                        </Link>
                        <button onClick={loadData} className="btn btn-secondary gap-2">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="card p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Last 24 Hours</p>
                                    <p className="text-2xl font-bold text-slate-900">{stats.totals?.last24h || 0}</p>
                                </div>
                            </div>
                        </div>
                        <div className="card p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                    <Activity className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Last 7 Days</p>
                                    <p className="text-2xl font-bold text-slate-900">{stats.totals?.last7d || 0}</p>
                                </div>
                            </div>
                        </div>
                        <div className="card p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Total Logs</p>
                                    <p className="text-2xl font-bold text-slate-900">{stats.totals?.all || 0}</p>
                                </div>
                            </div>
                        </div>
                        <Link href="/admin/query-logs" className="card p-4 hover:shadow-md transition-shadow cursor-pointer border-2 border-dashed border-orange-200 bg-orange-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                    <Database className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-orange-600 font-medium">View DB Query Logs</p>
                                    <p className="text-xs text-slate-500">Monitor database queries →</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                )}

                {/* Filters */}
                <div className="card p-4 mb-6">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs text-slate-500 mb-1">Search</label>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    placeholder="Search entity name..."
                                    className="input pl-9"
                                />
                            </div>
                        </div>
                        <div className="w-40">
                            <label className="block text-xs text-slate-500 mb-1">Action</label>
                            <select
                                value={filters.action}
                                onChange={(e) => handleFilterChange('action', e.target.value)}
                                className="input"
                            >
                                <option value="">All Actions</option>
                                {availableFilters.actions.map(a => (
                                    <option key={a} value={a}>{ACTION_ICONS[a] || '📋'} {a.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-40">
                            <label className="block text-xs text-slate-500 mb-1">Entity Type</label>
                            <select
                                value={filters.entityType}
                                onChange={(e) => handleFilterChange('entityType', e.target.value)}
                                className="input"
                            >
                                <option value="">All Types</option>
                                {availableFilters.entityTypes.map(e => (
                                    <option key={e} value={e}>{e.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-36">
                            <label className="block text-xs text-slate-500 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                className="input"
                            />
                        </div>
                        <div className="w-36">
                            <label className="block text-xs text-slate-500 mb-1">End Date</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                className="input"
                            />
                        </div>
                        <button onClick={applyFilters} className="btn btn-primary gap-2">
                            <Filter className="w-4 h-4" />
                            Apply
                        </button>
                        <button onClick={clearFilters} className="btn btn-secondary">
                            Clear
                        </button>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="card overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left py-3 px-4 font-semibold text-slate-600 text-sm">Timestamp</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-600 text-sm">User</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-600 text-sm">Action</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-600 text-sm">Entity</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-600 text-sm hidden lg:table-cell">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-500">
                                        <Activity className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                        <p>No audit logs found</p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="py-3 px-4">
                                            <span className="text-sm text-slate-600">
                                                {formatDateTime(log.createdAt)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                                    <User className="w-4 h-4 text-primary-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                                                    </p>
                                                    {log.user?.role && (
                                                        <p className="text-xs text-slate-500 capitalize">{log.user.role.replace('_', ' ')}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-700'}`}>
                                                <span>{ACTION_ICONS[log.action] || '📋'}</span>
                                                {log.action?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div>
                                                <p className="text-sm text-slate-500 capitalize">{log.entityType?.replace('_', ' ')}</p>
                                                {log.entityName && (
                                                    <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{log.entityName}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 hidden lg:table-cell">
                                            {log.details && (
                                                <pre className="text-xs text-slate-500 max-w-xs truncate">
                                                    {JSON.stringify(log.details)}
                                                </pre>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                            <p className="text-sm text-slate-600">
                                Page {pagination.page} of {pagination.totalPages} ({pagination.total} logs)
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => goToPage(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="btn btn-secondary p-2"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => goToPage(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="btn btn-secondary p-2"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
