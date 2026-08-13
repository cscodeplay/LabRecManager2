'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Pencil, Users, Clock, Radio, StopCircle, Video,
    Eye, Shield, User, RefreshCw
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useConfirm } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminWhiteboardDetailPage({ params: paramsPromise }) {
    const params = use(paramsPromise);
    const router = useRouter();
    const confirm = useConfirm();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    const sessionId = params?.id;

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated || !['admin', 'principal'].includes(user?.role)) {
            router.push('/dashboard');
            return;
        }
        if (sessionId) {
            loadSessionDetails();
        }
    }, [_hasHydrated, isAuthenticated, user, sessionId]);

    const loadSessionDetails = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/whiteboard/sessions/${sessionId}`);
            if (res.data?.success) {
                setSession(res.data.data);
            }
        } catch (err) {
            console.error('Failed to load session details:', err);
            toast.error('Failed to load session details');
        } finally {
            setLoading(false);
        }
    };

    const handleEndSession = async () => {
        const ok = await confirm({
            title: 'End Whiteboard Session?',
            message: 'Are you sure you want to forcibly terminate this active whiteboard session for all participants?',
            confirmText: 'End Session',
            cancelText: 'Cancel',
            type: 'warning',
        });
        if (!ok) return;

        try {
            await api.put(`/whiteboard/sessions/${sessionId}/end`);
            toast.success('Session ended');
            router.push('/admin/whiteboards');
        } catch (err) {
            toast.error('Failed to end session');
        }
    };

    const handleToggleRecording = async () => {
        if (!session) return;
        try {
            await api.put(`/whiteboard/sessions/${sessionId}/record`, { isRecording: !session.isRecording });
            toast.success(session.isRecording ? 'Recording stopped' : 'Recording started');
            loadSessionDetails();
        } catch (err) {
            toast.error('Failed to toggle recording');
        }
    };

    if (!_hasHydrated || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen p-8 bg-slate-50 flex flex-col items-center justify-center">
                <p className="text-slate-600 mb-4">Whiteboard session not found.</p>
                <Link href="/admin/whiteboards" className="btn-primary">
                    Back to Sessions
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/whiteboards" className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-slate-900">{session.title || 'Whiteboard Session'}</h1>
                                {session.status === 'active' && (
                                    <span className="flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-semibold">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        Live Active
                                    </span>
                                )}
                                {session.status === 'ended' && (
                                    <span className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-semibold">
                                        Ended
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Session ID: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs text-slate-700">{session.id}</code>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadSessionDetails}
                            className="p-2.5 text-slate-600 hover:bg-slate-200 rounded-xl transition"
                            title="Refresh"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        {session.status === 'active' && (
                            <>
                                <button
                                    onClick={handleToggleRecording}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2 ${session.isRecording
                                        ? 'bg-red-500 text-white hover:bg-red-600'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    <Video className="w-4 h-4" />
                                    {session.isRecording ? 'Stop Recording' : 'Record Session'}
                                </button>
                                <button
                                    onClick={handleEndSession}
                                    className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-sm font-medium transition flex items-center gap-2"
                                >
                                    <StopCircle className="w-4 h-4" />
                                    Terminate Session
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Main Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Host & Target Info */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Host & Scope</h2>
                        
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">{session.host?.firstName} {session.host?.lastName}</p>
                                <p className="text-xs text-slate-500">{session.host?.email} ({session.host?.role})</p>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3 space-y-2 text-sm text-slate-600">
                            {session.targetClass && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Target Class:</span>
                                    <span className="font-medium text-slate-800">{session.targetClass.name} {session.targetClass.section && `(${session.targetClass.section})`}</span>
                                </div>
                            )}
                            {session.targetGroup && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Target Group:</span>
                                    <span className="font-medium text-slate-800">{session.targetGroup.name}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-slate-500">Started:</span>
                                <span className="font-medium text-slate-800">{new Date(session.createdAt).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Live Stats */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Participation Stats</h2>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl text-center">
                                <Users className="w-6 h-6 text-primary-600 mx-auto mb-1" />
                                <p className="text-2xl font-bold text-slate-900">{session.participants?.length || 0}</p>
                                <p className="text-xs text-slate-500">Participants</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl text-center">
                                <Clock className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                                <p className="text-2xl font-bold text-slate-900">
                                    {session.duration ? `${Math.floor(session.duration / 60)}m` : 'Live'}
                                </p>
                                <p className="text-xs text-slate-500">Duration</p>
                            </div>
                        </div>
                    </div>

                    {/* Security & Access */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Access Control</h2>
                        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                            <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Whiteboard instances are protected and managed exclusively by Instructors and Admins.</span>
                        </div>
                    </div>
                </div>

                {/* Connected Participants List */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary-600" />
                            Session Participants ({session.participants?.length || 0})
                        </h3>
                    </div>

                    {!session.participants || session.participants.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            No participants have joined this session yet.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {session.participants.map((p, idx) => (
                                <div key={p.id || idx} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                                            {p.user?.firstName?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{p.user?.firstName} {p.user?.lastName}</p>
                                            <p className="text-xs text-slate-400 capitalize">{p.user?.role || 'Student'}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400">
                                        Joined {p.joinedAt ? new Date(p.joinedAt).toLocaleTimeString() : 'Recently'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
