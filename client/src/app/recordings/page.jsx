'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Video, Download, Share2, Trash2, Play, Clock, Calendar, Link2, Copy, Check, Search, Grid, List, X, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import RecordingShareModal from '@/components/RecordingShareModal';

export default function RecordingsPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'grid' or 'list', default to list
    const [copiedId, setCopiedId] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [selectedRecordings, setSelectedRecordings] = useState(new Set());

    const isInstructor = user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'lab_assistant' || user?.role === 'principal';

    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [selectedRecordingId, setSelectedRecordingId] = useState(null);
    const [isSharing, setIsSharing] = useState(false);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        fetchRecordings();
    }, [isAuthenticated, _hasHydrated]);

    const fetchRecordings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/recordings');
            if (response.data.success) {
                setRecordings(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch recordings:', error);
            setError('Failed to load recordings. Please try again later.');
            toast.error('Failed to load recordings');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = async (recording) => {
        try {
            const shareUrl = `${(process.env.NEXT_PUBLIC_BASE_URL || window.location.origin)}/recordings/watch/${recording.shareToken}`;
            await navigator.clipboard.writeText(shareUrl);
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
            setSelectedRecordings(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
            toast.success('Recording deleted');
        } catch (error) {
            toast.error('Failed to delete recording');
        }
    };

    const handleBulkDelete = async () => {
        try {
            const promises = Array.from(selectedRecordings).map(id => api.delete(`/recordings/${id}`));
            await Promise.all(promises);
            setRecordings(prev => prev.filter(r => !selectedRecordings.has(r.id)));
            setSelectedRecordings(new Set());
            setDeleteConfirm(null);
            toast.success('Recordings deleted');
        } catch (error) {
            toast.error('Failed to delete some recordings');
        }
    };

    const handleBulkDownload = () => {
        Array.from(selectedRecordings).forEach(id => {
            const recording = recordings.find(r => r.id === id);
            if (recording && recording.cloudinaryUrl) {
                const a = document.createElement('a');
                a.href = recording.cloudinaryUrl;
                a.download = `recording-${id}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        });
        toast.success('Downloads started');
    };

    const toggleSelection = (id) => {
        setSelectedRecordings(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedRecordings.size === filteredRecordings.length) {
            setSelectedRecordings(new Set());
        } else {
            setSelectedRecordings(new Set(filteredRecordings.map(r => r.id)));
        }
    };

    const handleOpenShare = (id) => {
        setSelectedRecordingId(id);
        setShareModalOpen(true);
    };

    const handleShare = async (targetsPayload) => {
        try {
            setIsSharing(true);
            const res = await api.post(`/recordings/${selectedRecordingId}/share`, { targets: targetsPayload });
            if (res.data.success) {
                toast.success('Recording shared successfully!');
                setShareModalOpen(false);
                setSelectedRecordingId(null);
            }
        } catch (error) {
            console.error('Failed to share recording:', error);
            toast.error('Failed to share recording');
        } finally {
            setIsSharing(false);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString(undefined, {
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

                        {/* Bulk Actions */}
                        {selectedRecordings.size > 0 && (
                            <div className="flex items-center gap-2 mr-2">
                                <span className="text-sm font-medium text-slate-500 mr-2">{selectedRecordings.size} selected</span>
                                <button
                                    onClick={handleBulkDownload}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                                    title="Download Selected"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                                {isInstructor && (
                                    <button
                                        onClick={() => setDeleteConfirm('bulk')}
                                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition"
                                        title="Delete Selected"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* View Toggle */}
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Grid View"
                            >
                                <Grid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                title="List View"
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>

                        {/* New Recording Button */}
                        <Link
                            href="/whiteboard"
                            className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition shadow-sm"
                            title="New Recording"
                        >
                            <Video className="w-5 h-5" />
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
                ) : error ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-red-500 text-2xl">⚠️</span>
                        </div>
                        <h2 className="text-xl font-semibold text-slate-700 mb-2">Failed to load recordings</h2>
                        <p className="text-slate-500 mb-6">{error}</p>
                        <button
                            onClick={fetchRecordings}
                            className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition shadow-sm"
                            title="Retry"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
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
                                className="inline-flex p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition shadow-sm"
                                title="Go to Whiteboard"
                            >
                                <Video className="w-5 h-5" />
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
                                            className="flex-1 flex items-center justify-center p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                                            title="Play"
                                        >
                                            <Play className="w-5 h-5" />
                                        </Link>
                                        <button
                                            onClick={() => handleCopyLink(recording)}
                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                                            title="Copy share link"
                                        >
                                            {copiedId === recording.id ? <Check className="w-5 h-5 text-green-500" /> : <Link2 className="w-5 h-5" />}
                                        </button>
                                        <a
                                            href={recording.cloudinaryUrl}
                                            download
                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                                            title="Download"
                                        >
                                            <Download className="w-5 h-5" />
                                        </a>
                                        {isInstructor && (
                                            <button
                                                onClick={() => handleOpenShare(recording.id)}
                                                className="p-2 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl transition"
                                                title="Share"
                                            >
                                                <Share2 className="w-5 h-5" />
                                            </button>
                                        )}
                                        {isInstructor && (
                                            <button
                                                onClick={() => setDeleteConfirm(recording.id)}
                                                className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
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
                                    <th className="px-6 py-3 w-12 text-left">
                                        <input
                                            type="checkbox"
                                            checked={filteredRecordings.length > 0 && selectedRecordings.size === filteredRecordings.length}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                                        />
                                    </th>
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
                                            <input
                                                type="checkbox"
                                                checked={selectedRecordings.has(recording.id)}
                                                onChange={() => toggleSelection(recording.id)}
                                                className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                                            />
                                        </td>
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
                                                    className="p-2 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl transition"
                                                    title="Play"
                                                >
                                                    <Play className="w-5 h-5" />
                                                </Link>
                                                <button
                                                    onClick={() => handleCopyLink(recording)}
                                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                                                    title="Copy share link"
                                                >
                                                    {copiedId === recording.id ? <Check className="w-5 h-5 text-green-500" /> : <Link2 className="w-5 h-5" />}
                                                </button>
                                                <a
                                                    href={recording.cloudinaryUrl}
                                                    download
                                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                                                    title="Download"
                                                >
                                                    <Download className="w-5 h-5" />
                                                </a>
                                                {isInstructor && (
                                                    <button
                                                        onClick={() => handleOpenShare(recording.id)}
                                                        className="p-2 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl transition"
                                                        title="Share"
                                                    >
                                                        <Share2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                                {isInstructor && (
                                                    <button
                                                        onClick={() => setDeleteConfirm(recording.id)}
                                                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
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
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            {deleteConfirm === 'bulk' ? `Delete ${selectedRecordings.size} Recordings?` : 'Delete Recording?'}
                        </h3>
                        <p className="text-slate-600 mb-6">This action cannot be undone. The recording will be permanently deleted.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 flex justify-center p-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition"
                                title="Cancel"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => deleteConfirm === 'bulk' ? handleBulkDelete() : handleDelete(deleteConfirm)}
                                className="flex-1 flex justify-center p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
                                title="Delete"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            <RecordingShareModal
                isOpen={shareModalOpen}
                onClose={() => { setShareModalOpen(false); setSelectedRecordingId(null); }}
                onShare={handleShare}
                recordingId={selectedRecordingId}
            />
        </div>
    );
}
