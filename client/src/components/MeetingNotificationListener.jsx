'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import { Video, X, ArrowRight, Shield, User, Clock, Copy, Check } from 'lucide-react';

export default function MeetingNotificationListener() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const socketRef = useRef(null);
    const [inviteData, setInviteData] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!_hasHydrated || !isAuthenticated || !user?.id) return;

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001');
        
        try {
            const socket = io(socketUrl, {
                path: '/socket.io',
                transports: ['websocket', 'polling']
            });
            socketRef.current = socket;

            socket.on('connect', () => {
                console.log('[MeetingListener] Socket connected');

                if (user?.id) {
                    socket.emit('join-user', user.id);
                }
                if (user?.classId) {
                    socket.emit('join-class', user.classId);
                }
                if (user?.groups && Array.isArray(user.groups)) {
                    user.groups.forEach(g => socket.emit('join-group', g.id));
                }
            });

            socket.on('meeting:invitation-received', (data) => {
                console.log('[MeetingListener] Received invitation:', data);
                setInviteData(data);
                toast.custom((t) => (
                    <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-slate-900 shadow-2xl rounded-2xl pointer-events-auto flex flex-col p-4 border border-emerald-500/50 text-white z-[9999]`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                                <Video className="w-6 h-6 animate-pulse" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Live Meeting Invitation</p>
                                <p className="text-sm font-bold truncate text-white">{data?.title || 'Meeting Session'}</p>
                                <p className="text-xs text-slate-300 truncate">From {data?.hostName || 'Host'}</p>
                            </div>
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="p-1 text-slate-400 hover:text-white rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    if (data?.roomCode) {
                                        router.push(`/meeting/${data.roomCode}`);
                                    }
                                }}
                                className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/20"
                            >
                                <Video className="w-3.5 h-3.5" />
                                Join Meeting
                            </button>
                        </div>
                    </div>
                ), { duration: 10000 });
            });

            return () => {
                socket.disconnect();
            };
        } catch (err) {
            console.warn('[MeetingListener] Socket connection error:', err);
        }
    }, [_hasHydrated, isAuthenticated, user]);

    if (!inviteData) return null;

    const roomCodeFormatted = inviteData.roomCode ? inviteData.roomCode.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') : '';

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl space-y-5 text-white relative">
                {/* Close button */}
                <button
                    onClick={() => setInviteData(null)}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/60 rounded-full transition"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header Badge */}
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30">
                        <Video className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Live Invitation
                        </span>
                        <h3 className="text-lg font-bold text-white mt-0.5">Meeting Invite Received</h3>
                    </div>
                </div>

                {/* Content Box */}
                <div className="bg-slate-950/70 rounded-2xl border border-slate-800 p-4 space-y-3">
                    <div>
                        <p className="text-xs text-slate-400">Meeting Topic</p>
                        <p className="text-base font-bold text-white truncate">{inviteData.title || 'Live Meeting Session'}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs py-2 border-t border-slate-800/80">
                        <span className="text-slate-400">Host / Organizer</span>
                        <span className="font-semibold text-emerald-300">{inviteData.hostName || 'Host'}</span>
                    </div>

                    {inviteData.roomCode && (
                        <div className="flex items-center justify-between text-xs py-2 border-t border-slate-800/80">
                            <span className="text-slate-400">Room ID</span>
                            <span className="font-mono font-bold text-primary-400">{roomCodeFormatted || inviteData.roomCode}</span>
                        </div>
                    )}

                    {inviteData.inviteMessage && (
                        <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300 italic">
                            "{inviteData.inviteMessage}"
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setInviteData(null)}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-semibold transition"
                    >
                        Dismiss
                    </button>
                    <button
                        onClick={() => {
                            const code = inviteData.roomCode;
                            setInviteData(null);
                            if (code) {
                                router.push(`/meeting/${code}`);
                            }
                        }}
                        className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-xl shadow-emerald-500/20 hover:scale-[1.02]"
                    >
                        <Video className="w-4 h-4" />
                        Join Meeting Now
                    </button>
                </div>
            </div>
        </div>
    );
}
