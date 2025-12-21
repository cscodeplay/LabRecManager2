'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, History, FileSpreadsheet, CheckCircle, AlertCircle, XCircle, Calendar, User, HardDrive } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { labsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ImportHistoryPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        if (!['admin', 'principal', 'lab_assistant'].includes(user?.role)) {
            router.push('/dashboard'); return;
        }
        loadHistory();
    }, [isAuthenticated, _hasHydrated]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const res = await labsAPI.getImportHistory();
            setHistory(res.data.data.history || []);
        } catch (error) {
            toast.error('Failed to load import history');
        } finally {
            setLoading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs"><CheckCircle className="w-3 h-3" /> Completed</span>;
            case 'partial':
                return <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs"><AlertCircle className="w-3 h-3" /> Partial</span>;
            case 'failed':
                return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs"><XCircle className="w-3 h-3" /> Failed</span>;
            default:
                return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">{status}</span>;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/labs" className="text-slate-500 hover:text-slate-700">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <History className="w-6 h-6 text-primary-500" />
                            <h1 className="text-xl font-semibold text-slate-900">Import History</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {history.length === 0 ? (
                    <div className="card p-12 text-center">
                        <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-500">No import history found</p>
                        <p className="text-sm text-slate-400 mt-1">Import CSV files from the inventory page to see history here</p>
                    </div>
                ) : (
                    <div className="card overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">File</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Lab</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Imported</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Failed</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Uploaded By</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map(record => (
                                    <tr key={record.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                                                <div>
                                                    <p className="font-medium text-slate-900 text-sm">{record.fileName}</p>
                                                    <p className="text-xs text-slate-400 flex items-center gap-1">
                                                        <HardDrive className="w-3 h-3" /> {formatFileSize(record.fileSize)}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link href={`/admin/labs/${record.lab?.id}/pcs`} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                                                {record.lab?.name || 'Unknown'}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-semibold text-emerald-600">{record.itemsImported}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {record.itemsFailed > 0 ? (
                                                <span className="font-semibold text-red-600">{record.itemsFailed}</span>
                                            ) : (
                                                <span className="text-slate-400">0</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {getStatusBadge(record.status)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 text-sm text-slate-600">
                                                <User className="w-3 h-3" />
                                                {record.uploadedBy?.firstName} {record.uploadedBy?.lastName}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 text-sm text-slate-500">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(record.createdAt)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}
