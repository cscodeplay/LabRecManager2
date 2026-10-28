'use client';

import React, { useState, useEffect } from 'react';
import { History, Clock, Check, RotateCcw, Plus, X, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function VersionHistoryDrawer({ isOpen, onClose, docId, onRestore, docTitle = 'Document' }) {
    const [revisions, setRevisions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newMilestoneSummary, setNewMilestoneSummary] = useState('');
    const [creatingMilestone, setCreatingMilestone] = useState(false);
    const [restoringId, setRestoringId] = useState(null);

    const fetchRevisions = async () => {
        if (!docId) return;
        setLoading(true);
        try {
            const res = await api.get(`/office/documents/${docId}/revisions`);
            if (res.data?.success) {
                setRevisions(res.data.data || []);
            }
        } catch (err) {
            console.error('Failed to load version history:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && docId) {
            fetchRevisions();
        }
    }, [isOpen, docId]);

    const handleCreateMilestone = async (e) => {
        e?.preventDefault();
        if (!newMilestoneSummary.trim()) {
            toast.error('Please enter a milestone description');
            return;
        }
        setCreatingMilestone(true);
        try {
            const res = await api.post(`/office/documents/${docId}/revisions`, {
                summary: newMilestoneSummary.trim()
            });
            if (res.data?.success) {
                toast.success('Named milestone snapshot created!');
                setNewMilestoneSummary('');
                fetchRevisions();
            }
        } catch (err) {
            console.error('Create revision error:', err);
            toast.error('Failed to create checkpoint milestone');
        } finally {
            setCreatingMilestone(false);
        }
    };

    const handleRestore = async (rev) => {
        if (!confirm(`Restore ${docTitle} to Version ${rev.version_number} (${rev.change_summary || 'Untitled'})? Any unsaved edits will be replaced.`)) {
            return;
        }

        setRestoringId(rev.id);
        toast.loading(`Restoring Version ${rev.version_number}...`, { id: 'restore-rev' });
        try {
            const res = await api.post(`/office/documents/${docId}/revisions/${rev.id}/restore`);
            if (res.data?.success) {
                toast.success(`Successfully restored Version ${rev.version_number}!`, { id: 'restore-rev' });
                onRestore?.(res.data.data);
                onClose?.();
            }
        } catch (err) {
            console.error('Restore error:', err);
            toast.error('Failed to restore selected version', { id: 'restore-rev' });
        } finally {
            setRestoringId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

            <aside className="relative w-96 max-w-full bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                            <History size={16} />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Version History</h3>
                            <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{docTitle}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Create Named Milestone */}
                <div className="p-3 bg-slate-950/60 border-b border-slate-800/80">
                    <form onSubmit={handleCreateMilestone} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Name current version milestone..."
                            value={newMilestoneSummary}
                            onChange={(e) => setNewMilestoneSummary(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                            type="submit"
                            disabled={creatingMilestone || !newMilestoneSummary.trim()}
                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                            title="Save Snapshot Milestone"
                        >
                            <Plus size={13} />
                            <span>Save</span>
                        </button>
                    </form>
                </div>

                {/* Revisions List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                    {loading ? (
                        <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                            <Clock size={14} className="animate-spin" />
                            <span>Loading version milestones...</span>
                        </div>
                    ) : revisions.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500">
                            No version snapshots yet. Save a milestone above to create one!
                        </div>
                    ) : (
                        revisions.map((rev, idx) => (
                            <div
                                key={rev.id || idx}
                                className="p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition flex flex-col gap-2 group"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                        Version {rev.version_number}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        {new Date(rev.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                    </span>
                                </div>

                                <p className="text-xs text-slate-300 font-medium">
                                    {rev.change_summary || 'Auto-saved Checkpoint'}
                                </p>

                                <div className="flex justify-end pt-1 border-t border-slate-700/40">
                                    <button
                                        type="button"
                                        onClick={() => handleRestore(rev)}
                                        disabled={restoringId === rev.id}
                                        className="px-2.5 py-1 bg-slate-700 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-md text-[11px] font-semibold flex items-center gap-1 transition"
                                    >
                                        <RotateCcw size={11} />
                                        <span>Restore this Version</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </aside>
        </div>
    );
}
