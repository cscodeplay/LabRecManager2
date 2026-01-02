'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Database, AlertCircle, CheckCircle, Clock, RefreshCw, Trash2, Filter, Search } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import axios from 'axios';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';

export default function QueryLogsPage() {
    const router = useRouter();
    const { user, isAuthenticated, accessToken, _hasHydrated } = useAuthStore();
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
    const [filters, setFilters] = useState({ success: '', model: '', search: '' });
    const [models, setModels] = useState([]);
    const [expandedLog, setExpandedLog] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTimeRange, setDeleteTimeRange] = useState('7d');

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        if (!['admin', 'principal'].includes(user?.role)) {
            router.push('/dashboard');
            return;
        }
        loadData();
    }, [isAuthenticated, _hasHydrated, user, pagination.page, filters]);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...(filters.success && { success: filters.success }),
                ...(filters.model && { model: filters.model }),
                ...(filters.search && { search: filters.search })
            });

            const [logsRes, statsRes, modelsRes] = await Promise.all([
                axios.get(`/api/admin/query-logs?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
                axios.get('/api/admin/query-logs/stats', { headers: { Authorization: `Bearer ${accessToken}` } }),
                axios.get('/api/admin/query-logs/models', { headers: { Authorization: `Bearer ${accessToken}` } })
            ]);

            setLogs(logsRes.data.data.logs);
            setPagination(prev => ({ ...prev, ...logsRes.data.data.pagination }));
            setStats(statsRes.data.data);
            setModels(modelsRes.data.data || []);
        } catch (error) {
            console.error('Failed to load query logs:', error);
            toast.error('Failed to load query logs');
        } finally {
            setLoading(false);
        }
    };

    const timeRangeOptions = [
        { value: '1h', label: 'Last hour', days: 0.042 },
        { value: '24h', label: 'Last 24 hours', days: 1 },
        { value: '7d', label: 'Last 7 days', days: 7 },
        { value: '4w', label: 'Last 4 weeks', days: 28 },
        { value: 'all', label: 'All time', days: 9999 }
    ];

    const handleClearLogs = async () => {
        const selected = timeRangeOptions.find(o => o.value === deleteTimeRange);
        if (!selected) return;

        setShowDeleteModal(false);
        try {
            const res = await axios.delete(`/api/admin/query-logs/clear?days=${selected.days}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            toast.success(res.data.message || `Cleared logs from ${selected.label.toLowerCase()}`);
            loadData();
        } catch (error) {
            toast.error('Failed to clear logs');
        }
    };

    const formatDuration = (ms) => {
        if (!ms) return '-';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader title="Query Logs" titleHindi="क्वेरी लॉग" backLink="/admin" />

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <Database className="w-4 h-4" />
                                Total Queries
                            </div>
                            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
                                <AlertCircle className="w-4 h-4" />
                                Errors
                            </div>
                            <div className="text-2xl font-bold text-red-600">{stats.totalErrors}</div>
                            <div className="text-xs text-slate-500">{stats.errorRate}% rate</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
                                <Clock className="w-4 h-4" />
                                Last 24h
                            </div>
                            <div className="text-2xl font-bold">{stats.last24h.total.toLocaleString()}</div>
                            <div className="text-xs text-red-500">{stats.last24h.errors} errors</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-green-500 text-sm mb-1">
                                <CheckCircle className="w-4 h-4" />
                                Last Hour
                            </div>
                            <div className="text-2xl font-bold">{stats.lastHour.toLocaleString()}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-purple-500 text-sm mb-1">
                                <Clock className="w-4 h-4" />
                                Avg Duration
                            </div>
                            <div className="text-2xl font-bold">{formatDuration(stats.avgDurationMs)}</div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                value={filters.success}
                                onChange={e => { setFilters(f => ({ ...f, success: e.target.value })); setPagination(p => ({ ...p, page: 1 })); }}
                                className="input text-sm"
                            >
                                <option value="">All Status</option>
                                <option value="true">Success</option>
                                <option value="false">Errors Only</option>
                            </select>
                        </div>
                        <select
                            value={filters.model}
                            onChange={e => { setFilters(f => ({ ...f, model: e.target.value })); setPagination(p => ({ ...p, page: 1 })); }}
                            className="input text-sm"
                        >
                            <option value="">All Models</option>
                            {models.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <div className="flex-1 relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search query or error..."
                                className="input pl-10 text-sm w-full"
                                value={filters.search}
                                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && loadData()}
                            />
                        </div>
                        <button onClick={loadData} className="btn btn-secondary text-sm">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                        <button onClick={() => setShowDeleteModal(true)} className="btn bg-red-500 hover:bg-red-600 text-white text-sm">
                            <Trash2 className="w-4 h-4" /> Clear Logs
                        </button>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3 text-left">Timestamp</th>
                                    <th className="px-4 py-3 text-left">Query</th>
                                    <th className="px-4 py-3 text-left">Model</th>
                                    <th className="px-4 py-3 text-left">Action</th>
                                    <th className="px-4 py-3 text-right">Duration</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <>
                                        <tr
                                            key={log.id}
                                            className={`border-t cursor-pointer hover:bg-slate-50 ${!log.success ? 'bg-red-50' : ''}`}
                                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                        >
                                            <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                                                {formatDate(log.createdAt)}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs max-w-xs truncate">
                                                {log.query}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 rounded bg-slate-100 text-xs">{log.model || '-'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs ${log.action === 'create' ? 'bg-green-100 text-green-700' :
                                                    log.action === 'update' ? 'bg-blue-100 text-blue-700' :
                                                        log.action === 'delete' ? 'bg-red-100 text-red-700' :
                                                            'bg-slate-100'
                                                    }`}>
                                                    {log.action || '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-xs">
                                                {formatDuration(log.duration)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {log.success ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500 inline" />
                                                ) : (
                                                    <AlertCircle className="w-4 h-4 text-red-500 inline" />
                                                )}
                                            </td>
                                        </tr>
                                        {expandedLog === log.id && (
                                            <tr className="bg-slate-50">
                                                <td colSpan={6} className="px-4 py-3">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="font-medium text-xs text-slate-500 mb-1">Parameters</div>
                                                            <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                                                                {log.params ? JSON.stringify(JSON.parse(log.params), null, 2) : '-'}
                                                            </pre>
                                                        </div>
                                                        {log.error && (
                                                            <div>
                                                                <div className="font-medium text-xs text-red-500 mb-1">Error</div>
                                                                <pre className="text-xs bg-red-50 text-red-700 p-2 rounded border border-red-200 overflow-auto max-h-40">
                                                                    {log.error}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                            No query logs found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="px-4 py-3 border-t flex justify-between items-center">
                            <div className="text-sm text-slate-500">
                                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                    disabled={pagination.page <= 1}
                                    className="btn btn-secondary text-sm disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                    disabled={pagination.page >= pagination.pages}
                                    className="btn btn-secondary text-sm disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Delete Time Range Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                                    <Trash2 className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-slate-900">Clear Query Logs</h3>
                                    <p className="text-sm text-slate-500">Select time range to delete</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-slate-600 mb-4">
                                Choose the time period of logs you want to delete. This action cannot be undone.
                            </p>

                            <div className="space-y-2">
                                {timeRangeOptions.map(option => (
                                    <label
                                        key={option.value}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${deleteTimeRange === option.value
                                                ? 'border-red-500 bg-red-50'
                                                : 'border-slate-200 hover:border-red-300'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="deleteTimeRange"
                                            value={option.value}
                                            checked={deleteTimeRange === option.value}
                                            onChange={(e) => setDeleteTimeRange(e.target.value)}
                                            className="w-4 h-4 text-red-500 focus:ring-red-500"
                                        />
                                        <div className="flex-1">
                                            <span className="font-medium text-slate-900">{option.label}</span>
                                            {option.value === 'all' && (
                                                <span className="ml-2 text-xs text-red-600 font-medium">⚠️ Deletes everything</span>
                                            )}
                                        </div>
                                        {option.value === '1h' && <Clock className="w-4 h-4 text-slate-400" />}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="btn btn-ghost"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClearLogs}
                                className="btn bg-red-500 hover:bg-red-600 text-white"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Logs
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
