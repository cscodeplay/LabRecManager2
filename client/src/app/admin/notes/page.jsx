'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Plus, X, Trash2, Edit3, Clock, User, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import DOMPurify from 'dompurify';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

export default function AdminNotesPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [viewingNote, setViewingNote] = useState(null);
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
                    <div className="flex flex-col gap-4 max-w-4xl mx-auto">
                        {notes.map((note) => (
                            <div key={note.id} className="card overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg text-slate-800 mb-2">{note.title}</h3>
                                        <div className="bg-slate-50 p-2 rounded-lg flex items-center gap-4 text-xs text-slate-500 mb-4 inline-flex">
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5" />
                                                <span>{note.author?.firstName} {note.author?.lastName}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>{formatDate(note.updatedAt || note.createdAt)}</span>
                                            </div>
                                        </div>
                                        <div 
                                            className="prose prose-sm max-w-none text-slate-600 line-clamp-3 overflow-hidden"
                                            dangerouslySetInnerHTML={{ __html: typeof window !== 'undefined' ? DOMPurify.sanitize(note.content) : '' }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 md:flex-col">
                                        <button 
                                            onClick={() => setViewingNote(note)}
                                            className="btn btn-primary px-3 py-1.5 w-full justify-center text-sm"
                                        >
                                            <FileText className="w-4 h-4 mr-1.5" /> View
                                        </button>
                                        <button 
                                            onClick={() => handleEdit(note)}
                                            className="btn btn-secondary px-3 py-1.5 w-full justify-center text-sm"
                                        >
                                            <Edit3 className="w-4 h-4 mr-1.5" /> Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(note.id)}
                                            className="btn btn-outline border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-3 py-1.5 w-full justify-center text-sm"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* View Note Modal */}
            {viewingNote && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">{viewingNote.title}</h2>
                                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5" />
                                        <span>{viewingNote.author?.firstName} {viewingNote.author?.lastName}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{formatDate(viewingNote.updatedAt || viewingNote.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setViewingNote(null)}
                                className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg self-start"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                            <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-100 prose max-w-none"
                                dangerouslySetInnerHTML={{ __html: typeof window !== 'undefined' ? DOMPurify.sanitize(viewingNote.content) : '' }}
                            />
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end">
                            <button onClick={() => setViewingNote(null)} className="btn btn-outline">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit/Create Modal */}
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
                                    <div className="h-64 mb-12">
                                        <ReactQuill 
                                            theme="snow" 
                                            value={formData.content} 
                                            onChange={(val) => setFormData({ ...formData, content: val })} 
                                            className="h-full"
                                        />
                                    </div>
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
