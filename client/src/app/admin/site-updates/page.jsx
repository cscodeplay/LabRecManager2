'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, History, Plus, X, Clock, User, FileText } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { dashboardAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SiteUpdatesPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [updates, setUpdates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ version: '', description: '', changes: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        if (user?.role !== 'admin' && user?.role !== 'principal') { router.push('/dashboard'); return; }
        loadUpdates();
    }, [isAuthenticated, _hasHydrated]);

    const loadUpdates = async () => {
        setLoading(true);
        try {
            const res = await dashboardAPI.getAllSiteUpdates();
            setUpdates(res.data.data.updates || []);
        } catch (error) {
            console.error('Failed to load updates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.version || !formData.description) {
            toast.error('Version and description are required');
            return;
        }
        setSubmitting(true);
        try {
            await dashboardAPI.addSiteUpdate({
                ...formData,
                updatedBy: `${user?.firstName} ${user?.lastName}`
            });
            toast.success('Site update logged');
            setShowModal(false);
            setFormData({ version: '', description: '', changes: '' });
            loadUpdates();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add update');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (!_hasHydrated || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-lg">
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <History className="w-6 h-6 text-primary-500" />
                            <h1 className="text-xl font-semibold text-slate-900">Site Updates</h1>
                        </div>
                    </div>
                    <button onClick={() => setShowModal(true)} className="btn btn-primary">
                        <Plus className="w-4 h-4" /> Log Update
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {updates.length === 0 ? (
                    <div className="card p-12 text-center">
                        <History className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-700 mb-2">No updates logged yet</h3>
                        <p className="text-slate-500 mb-4">Start logging site updates to track changes.</p>
                        <button onClick={() => setShowModal(true)} className="btn btn-primary">
                            <Plus className="w-4 h-4" /> Log First Update
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {updates.map((update, idx) => (
                            <div key={update.id} className={`card p-6 ${idx === 0 ? 'border-l-4 border-primary-500 bg-primary-50/30' : ''}`}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                                            v{update.version}
                                        </span>
                                        {idx === 0 && (
                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                                                Latest
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(update.updatedAt)}
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">{update.description}</h3>
                                {update.changes && (
                                    <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 whitespace-pre-wrap">
                                        {update.changes}
                                    </div>
                                )}
                                {update.updatedBy && (
                                    <div className="flex items-center gap-1 mt-3 text-xs text-slate-500">
                                        <User className="w-3 h-3" />
                                        Updated by: {update.updatedBy}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Add Update Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900">Log Site Update</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Version *</label>
                                <input
                                    type="text"
                                    value={formData.version}
                                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                    className="input"
                                    placeholder="e.g., 1.5.1"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input"
                                    placeholder="Brief summary of changes"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Detailed Changes</label>
                                <textarea
                                    value={formData.changes}
                                    onChange={(e) => setFormData({ ...formData, changes: e.target.value })}
                                    className="input min-h-[120px]"
                                    placeholder="• Fixed bug X&#10;• Added feature Y&#10;• Improved Z"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
                                    {submitting ? 'Saving...' : 'Log Update'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
