'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Video, Download, Share2, Calendar, Clock, User, School, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WatchRecordingPage() {
    const params = useParams();
    const router = useRouter();
    const { token } = params;

    const [recording, setRecording] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (token) {
            fetchRecording();
        }
    }, [token]);

    const fetchRecording = async () => {
        try {
            setLoading(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const response = await fetch(`${apiUrl}/api/recordings/share/${token}`);
            const data = await response.json();

            if (data.success) {
                setRecording(data.data);
            } else {
                setError(data.error || 'Recording not found');
            }
        } catch (e) {
            console.error('Failed to fetch recording:', e);
            setError('Failed to load recording');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            toast.success('Link copied!');
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            toast.error('Failed to copy link');
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
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-center">
                    <Video className="w-20 h-20 mx-auto text-slate-600 mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Recording Not Found</h1>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="text-slate-400 hover:text-white transition"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-lg font-semibold text-white">{recording.title}</h1>
                            <p className="text-sm text-slate-400">
                                By {recording.user?.firstName} {recording.user?.lastName} • {recording.school?.name}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCopyLink}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
                            {copied ? 'Copied!' : 'Share'}
                        </button>
                        <a
                            href={recording.cloudinaryUrl}
                            download
                            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition"
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </a>
                    </div>
                </div>
            </header>

            {/* Video Player */}
            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
                    <video
                        src={recording.cloudinaryUrl}
                        controls
                        autoPlay
                        className="w-full aspect-video"
                        controlsList="nodownload"
                    />
                </div>

                {/* Info Panel */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Details */}
                    <div className="md:col-span-2 bg-slate-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">{recording.title}</h2>
                        {recording.description && (
                            <p className="text-slate-300 mb-4">{recording.description}</p>
                        )}
                        <div className="flex flex-wrap gap-6 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {recording.user?.firstName} {recording.user?.lastName}
                            </div>
                            <div className="flex items-center gap-2">
                                <School className="w-4 h-4" />
                                {recording.school?.name}
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {formatDate(recording.createdAt)}
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {formatDuration(recording.duration)}
                            </div>
                        </div>
                    </div>

                    {/* Share Card */}
                    <div className="bg-slate-800 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Share this recording</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={typeof window !== 'undefined' ? window.location.href : ''}
                                readOnly
                                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 text-sm"
                            />
                            <button
                                onClick={handleCopyLink}
                                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition"
                            >
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                            Anyone with this link can view the recording.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
