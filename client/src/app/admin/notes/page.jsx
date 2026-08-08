'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Plus, X, Trash2, Edit3, Clock, User } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminNotesPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ title: '', content: '' });
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        if (user?.role !== 'admin' && user?.role !== 'principal') { router.push('/dashboard'); return; }
        loadNotes();
    }, [isAuthenticated, _hasHydrated]);

    const loadNotes = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin-notes');
            setNotes(res.data.data || []);
        } catch (error) {
            console.error('Failed to load notes:', error);
            toast.error('Failed to load notes');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.content) {
            toast.error('Title and content are required');
            return;
        }
        setSubmitting(true);
        try {
            if (editingId) {
                await api.put(`/admin-notes/${editingId}`, formData);
                toast.success('Note updated');
            } else {
                await api.post('/admin-notes', formData);
                toast.success('Note created');
            }
            setShowModal(false);
            setFormData({ title: '', content: '' });
            setEditingId(null);
            loadNotes();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save note');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (note) => {
        setFormData({ title: note.title, content: note.content });
        setEditingId(note.id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this note?')) return;
        try {
            await api.delete(`/admin-notes/${id}`);
            toast.success('Note deleted');
            loadNotes();
        } catch (error) {
            toast.error('Failed to delete note');
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString(undefined, {
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
                            <FileText className="w-6 h-6 text-primary-500" />
                            <h1 className="text-xl font-semibold text-slate-900">Admin Notes</h1>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            setFormData({ title: '', content: '' });
                            setEditingId(null);
                            setShowModal(true);
                        }} 
                        className="btn btn-primary"
                    >
                        <Plus className="w-4 h-4 mr-2" /> New Note
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {notes.length === 0 ? (
                    <div className="card p-12 text-center max-w-4xl mx-auto">
                        <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-700 mb-2">No notes available</h3>
                        <p className="text-slate-500 mb-6">Create a note to keep track of project builds, updates, and other admin tasks.</p>
                        <button 
                            onClick={() => {
                                setFormData({ title: '', content: '' });
                                setEditingId(null);
                                setShowModal(true);
                            }} 
                            className="btn btn-primary mx-auto"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Create First Note
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {notes.map((note) => (
                            <div key={note.id} className="card overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
                                <div className="p-5 flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-slate-800 line-clamp-2">{note.title}</h3>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button 
                                                onClick={() => handleEdit(note)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(note.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="prose prose-sm text-slate-600 max-h-48 overflow-y-auto mb-4 whitespace-pre-wrap">
                                        {note.content}
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5" />
                                        <span>{note.author?.firstName} {note.author?.lastName}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{formatDate(note.updatedAt || note.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h2 className="text-xl font-semibold text-slate-800">
                                {editingId ? 'Edit Note' : 'Create Note'}
                            </h2>
                            <button 
                                onClick={() => setShowModal(false)}
                                className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="form-input w-full"
                                        placeholder="e.g. Current Build Status, Server Setup Info..."
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Notes Content <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        required
                                        className="form-input w-full h-64 resize-y"
                                        placeholder="Add all your important information here..."
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                        </form>
                        
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="btn btn-outline"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="btn btn-primary"
                                disabled={submitting}
                            >
                                {submitting ? 'Saving...' : 'Save Note'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
