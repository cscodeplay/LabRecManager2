'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Video, Play, Calendar, User, Clock, Award,
    Search, Download, Shield
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { meetingAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { formatDateTime } from '@/lib/dateUtils';

export default function MeetingRecordingsPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedRecording, setSelectedRecording] = useState(null);

    const isAdmin = user?.role === 'admin' || user?.role === 'principal';

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        if (!isAdmin) {
            toast.error('Access denied. Admin only.');
            router.push('/dashboard');
            return;
        }
        loadRecordings();
    }, [isAuthenticated, _hasHydrated, isAdmin]);

    const loadRecordings = async () => {
        setLoading(true);
        try {
            const res = await meetingAPI.getSessions({ limit: 100 });
            const sessions = res.data.data.sessions || [];
            // Strictly show sessions that have an uploaded recording
            const recordedSessions = sessions.filter(s => !!s.recordingUrl);
            setRecordings(recordedSessions);
        } catch (error) {
            console.error('Error loading recordings:', error);
            setError('Failed to load recordings. Please try again later.');
            toast.error('Failed to load recordings');
        } finally {
            setLoading(false);
        }
    };

    const filteredRecordings = recordings.filter(session => {
        if (!session.recordingUrl) return false;
        const searchLower = search.toLowerCase();
        const searchMatch = search === '' ||
            (session.student?.firstName || '').toLowerCase().includes(searchLower) ||
            (session.student?.lastName || '').toLowerCase().includes(searchLower) ||
            (session.examiner?.firstName || '').toLowerCase().includes(searchLower) ||
            (session.examiner?.lastName || '').toLowerCase().includes(searchLower) ||
            (session.host?.firstName || '').toLowerCase().includes(searchLower) ||
            (session.host?.lastName || '').toLowerCase().includes(searchLower) ||
            (session.title || '').toLowerCase().includes(searchLower) ||
            (session.submission?.assignment?.title || '').toLowerCase().includes(searchLower);

        return searchMatch;
    });

    const formatDuration = (seconds) => {
        if (!seconds && seconds !== 0) return null;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs}s`;
        if (secs === 0) return `${mins} min`;
        return `${mins}m ${secs}s`;
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    const getStreamUrl = (recUrl) => {
        if (!recUrl) return '';
        if (recUrl.startsWith('http') || recUrl.startsWith('/api')) return recUrl;
        const filename = recUrl.split('/').pop();
        return `/api/meetings/recordings/${filename}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading recordings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                title="Meeting Recordings"
                subtitle="Review recorded meeting and viva sessions with full playback and details"
            />

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Stats Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="card p-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
                        <div className="flex items-center gap-3">
                            <Video className="w-8 h-8 opacity-80" />
                            <div>
                                <p className="text-2xl font-bold">{recordings.length}</p>
                                <p className="text-sm opacity-80">Total Recordings</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                        <div className="flex items-center gap-3">
                            <Clock className="w-8 h-8 opacity-80" />
                            <div>
                                <p className="text-2xl font-bold">
                                    {Math.round(recordings.reduce((sum, r) => sum + (r.recordingDuration || (r.durationMinutes ? r.durationMinutes * 60 : 0)), 0) / 60)} min
                                </p>
                                <p className="text-sm opacity-80">Total Recorded Time</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        <div className="flex items-center gap-3">
                            <Shield className="w-8 h-8 opacity-80" />
                            <div>
                                <p className="text-2xl font-bold">
                                    {formatFileSize(recordings.reduce((sum, r) => sum + (r.recordingSize || 0), 0))}
                                </p>
                                <p className="text-sm opacity-80">Storage Used</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                        <div className="flex items-center gap-3">
                            <Award className="w-8 h-8 opacity-80" />
                            <div>
                                <p className="text-2xl font-bold">
                                    {recordings.filter(r => r.marksObtained).length > 0
                                        ? (recordings.reduce((sum, r) => sum + (parseFloat(r.marksObtained) || 0), 0) / recordings.filter(r => r.marksObtained).length).toFixed(1)
                                        : 'N/A'}
                                </p>
                                <p className="text-sm opacity-80">Avg Marks</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="card p-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by meeting title, student, or host..."
                            className="input pl-10 w-full"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Recordings List */}
                <div className="space-y-4">
                    {error ? (
                        <div className="card p-12 text-center">
                            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-red-500 text-2xl">⚠️</span>
                            </div>
                            <h3 className="text-lg font-medium text-slate-700">Failed to load recordings</h3>
                            <p className="text-slate-500 mb-6">{error}</p>
                            <button
                                onClick={loadRecordings}
                                className="inline-flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition"
                            >
                                Retry
                            </button>
                        </div>
                    ) : filteredRecordings.length === 0 ? (
                        <div className="card p-12 text-center">
                            <Video className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-medium text-slate-700">No recordings found</h3>
                            <p className="text-slate-500">Completed meeting sessions with recordings will appear here</p>
                        </div>
                    ) : (
                        filteredRecordings.map((session) => (
                            <div key={session.id} className="card p-5 hover:shadow-lg transition border-l-4 border-emerald-500">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                    {/* Session Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600 shrink-0">
                                                <Video className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900 text-base">
                                                    {session.title || session.questionsAsked?.sessionTitle || session.submission?.assignment?.title || 'Meeting Session'}
                                                </h3>
                                                <div className="flex flex-wrap gap-3 text-sm text-slate-500 mt-1">
                                                    {session.student && (
                                                        <span className="flex items-center gap-1">
                                                            <User className="w-4 h-4" />
                                                            Student: {session.student.firstName} {session.student.lastName}
                                                        </span>
                                                    )}
                                                    {(session.host || session.examiner) && (
                                                        <span className="flex items-center gap-1">
                                                            <Shield className="w-4 h-4" />
                                                            Host: {session.host ? `${session.host.firstName} ${session.host.lastName}` : `${session.examiner?.firstName} ${session.examiner?.lastName}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {formatDateTime(session.actualEndTime || session.updatedAt)}
                                            </span>
                                            <span className="flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                <Clock className="w-4 h-4 text-emerald-600" />
                                                Recorded: {session.recordingDuration ? formatDuration(session.recordingDuration) : `${session.durationMinutes || 10} min`}
                                            </span>
                                            {session.marksObtained && (
                                                <span className="flex items-center gap-1">
                                                    <Award className="w-4 h-4" />
                                                    {session.marksObtained}/{session.maxMarks} marks
                                                </span>
                                            )}
                                            {session.recordingSize && (
                                                <span className="text-slate-600">
                                                    📁 {formatFileSize(session.recordingSize)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setSelectedRecording(session)}
                                            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition shadow-sm flex items-center gap-2 font-semibold text-sm"
                                        >
                                            <Play className="w-4 h-4 fill-white" />
                                            Watch Recording
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Video Player Modal */}
            {selectedRecording && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-4 border-b flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    {selectedRecording.title || selectedRecording.questionsAsked?.sessionTitle || selectedRecording.submission?.assignment?.title || 'Meeting Recording'}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Host: {selectedRecording.host ? `${selectedRecording.host.firstName} ${selectedRecording.host.lastName}` : (selectedRecording.examiner ? `${selectedRecording.examiner.firstName} ${selectedRecording.examiner.lastName}` : 'Host')} • {formatDateTime(selectedRecording.actualEndTime || selectedRecording.updatedAt)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={getStreamUrl(selectedRecording.recordingUrl)}
                                    download={selectedRecording.recordingUrl?.split('/').pop() || 'meeting_recording.webm'}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                                    title="Download Video File"
                                >
                                    <Download className="w-4 h-4" /> Download
                                </a>
                                <button
                                    onClick={() => setSelectedRecording(null)}
                                    className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            <video
                                controls
                                autoPlay
                                className="w-full rounded-lg bg-black aspect-video shadow-md"
                                src={getStreamUrl(selectedRecording.recordingUrl)}
                            >
                                Your browser does not support video playback.
                            </video>
                            <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <h3 className="font-medium text-slate-900 mb-2">Session Details</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-500 text-xs">Topic / Title</p>
                                        <p className="font-medium mt-0.5">{selectedRecording.title || selectedRecording.submission?.assignment?.title || 'Meeting Session'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs">Marks</p>
                                        <p className="font-medium mt-0.5">{selectedRecording.marksObtained ? `${selectedRecording.marksObtained}/${selectedRecording.maxMarks}` : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs">Recorded Duration</p>
                                        <p className="font-medium text-emerald-700 mt-0.5">
                                            {selectedRecording.recordingDuration ? formatDuration(selectedRecording.recordingDuration) : `${selectedRecording.durationMinutes} min`}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs">Remarks</p>
                                        <p className="font-medium mt-0.5">{selectedRecording.examinerRemarks || 'No remarks'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
