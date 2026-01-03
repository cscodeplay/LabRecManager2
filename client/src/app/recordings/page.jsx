'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Video, Download, Share2, Trash2, Play, Clock, Calendar, Link2, Copy, Check, Search, Grid, List } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function RecordingsPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [copiedId, setCopiedId] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const isInstructor = user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'lab_assistant' || user?.role === 'principal';

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        if (!isInstructor) {
            toast.error('Only instructors can access recordings');
            router.push('/dashboard');
            return;
        }
        fetchRecordings();
    }, [isAuthenticated, _hasHydrated, isInstructor]);

    const fetchRecordings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/recordings');
            if (response.data.success) {
                setRecordings(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch recordings:', error);
            toast.error('Failed to load recordings');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = async (recording) => {
        try {
            await navigator.clipboard.writeText(recording.shareUrl);
            setCopiedId(recording.id);
            toast.success('Share link copied!');
            setTimeout(() => setCopiedId(null), 2000);
        } catch (e) {
            toast.error('Failed to copy link');
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/recordings/${id}`);
            setRecordings(prev => prev.filter(r => r.id !== id));
            setDeleteConfirm(null);
            toast.success('Recording deleted');
        } catch (error) {
            toast.error('Failed to delete recording');
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '--';
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const filteredRecordings = recordings.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!_hasHydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 transition">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                                <Video className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-slate-900">My Recordings</h1>
                                <p className="text-sm text-slate-500">{recordings.length} recording{recordings.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search recordings..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
                            />
                        </div>

                        {/* View Toggle */}
                        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 ${viewMode === 'grid' ? 'bg-primary-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Grid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>

                        {/* New Recording Button */}
                        <Link
                            href="/whiteboard"
                            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition"
                        >
                            <Video className="w-4 h-4" />
                            New Recording
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : filteredRecordings.length === 0 ? (
                    <div className="text-center py-20">
                        <Video className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                        <h2 className="text-xl font-semibold text-slate-700 mb-2">
                            {searchQuery ? 'No recordings found' : 'No recordings yet'}
                        </h2>
                        <p className="text-slate-500 mb-6">
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Start a recording from the Whiteboard to create your first recording.'
                            }
                        </p>
                        {!searchQuery && (
                            <Link
                                href="/whiteboard"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition"
                            >
                                <Video className="w-5 h-5" />
                                Go to Whiteboard
                            </Link>
                        )}
                    </div>
                ) : viewMode === 'grid' ? (
                    /* Grid View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRecordings.map((recording) => (
                            <div key={recording.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition group">
                                {/* Thumbnail */}
                                <div className="relative aspect-video bg-slate-100">
                                    {recording.thumbnailUrl ? (
                                        <img
                                            src={recording.thumbnailUrl}
                                            alt={recording.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Video className="w-12 h-12 text-slate-300" />
                                        </div>
                                    )}
                                    {/* Play overlay */}
                                    <Link
                                        href={`/recordings/watch/${recording.shareToken}`}
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                                            <Play className="w-8 h-8 text-slate-900 ml-1" />
                                        </div>
                                    </Link>
                                    {/* Duration badge */}
                                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                        {formatDuration(recording.duration)}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <h3 className="font-semibold text-slate-900 truncate">{recording.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {formatDate(recording.createdAt)}
                                        <span className="text-slate-300">•</span>
                                        {formatFileSize(recording.fileSize)}
                                    </p>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 mt-4">
                                        <Link
                                            href={`/recordings/watch/${recording.shareToken}`}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
                                        >
                                            <Play className="w-4 h-4" />
                                            Play
                                        </Link>
                                        <button
                                            onClick={() => handleCopyLink(recording)}
                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                            title="Copy share link"
                                        >
                                            {copiedId === recording.id ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                                        </button>
                                        <a
                                            href={recording.cloudinaryUrl}
                                            download
                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                            title="Download"
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>
                                        <button
                                            onClick={() => setDeleteConfirm(recording.id)}
                                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* List View */
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Recording</th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Size</th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredRecordings.map((recording) => (
                                    <tr key={recording.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-16 h-10 rounded bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {recording.thumbnailUrl ? (
                                                        <img src={recording.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Video className="w-5 h-5 text-slate-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{recording.title}</p>
                                                    {recording.description && (
                                                        <p className="text-sm text-slate-500 truncate max-w-xs">{recording.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{formatDuration(recording.duration)}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{formatFileSize(recording.fileSize)}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(recording.createdAt)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/recordings/watch/${recording.shareToken}`}
                                                    className="p-2 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg transition"
                                                    title="Play"
                                                >
                                                    <Play className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleCopyLink(recording)}
                                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                                                    title="Copy share link"
                                                >
                                                    {copiedId === recording.id ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
                                                </button>
                                                <a
                                                    href={recording.cloudinaryUrl}
                                                    download
                                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                                <button
                                                    onClick={() => setDeleteConfirm(recording.id)}
                                                    className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Recording?</h3>
                        <p className="text-slate-600 mb-6">This action cannot be undone. The recording will be permanently deleted.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
