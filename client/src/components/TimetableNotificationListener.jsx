'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import { Bell, Clock, X, BookOpen } from 'lucide-react';

export default function TimetableNotificationListener() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const socketRef = useRef(null);
    const [notification, setNotification] = useState(null);

    const isRelevantRole = user?.role === 'student' || user?.role === 'instructor' || user?.role === 'lab_assistant';

    useEffect(() => {
        if (!_hasHydrated || !isAuthenticated || !isRelevantRole) return;

        const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        socketRef.current = io(socketUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        socketRef.current.on('connect', () => {
            if (user?.id) {
                socketRef.current.emit('join-user', user.id);
            }
        });

        // Listen for 5-min-before notifications
        socketRef.current.on('timetable:period-starting', (data) => {
            console.log('[Timetable] Period notification:', data);
            setNotification(data);

            // Auto-dismiss after 4 minutes
            setTimeout(() => setNotification(null), 4 * 60 * 1000);

            // Show toast
            toast.custom((t) => (
                <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
                    <div className="flex-1 w-0 p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 pt-0.5">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Bell className="w-5 h-5 text-blue-600 animate-bounce" />
                                </div>
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-slate-900">
                                    {data.subject} in 5 min
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    {data.message}
                                </p>
                                {data.roomNumber && (
                                    <p className="text-xs text-slate-400 mt-0.5">Room {data.roomNumber}</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex border-l border-slate-200">
                        <button
                            onClick={() => { toast.dismiss(t.id); router.push('/timetable'); }}
                            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500"
                        >
                            View
                        </button>
                    </div>
                </div>
            ), { duration: 15000 });
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [_hasHydrated, isAuthenticated, isRelevantRole, user, router]);

    if (!isRelevantRole || !notification) return null;

    return (
        <div className="fixed bottom-4 left-4 z-50 animate-in slide-in-from-left">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => router.push('/timetable')}
                    className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition"
                >
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-sm">{notification.subject}</p>
                        <p className="text-xs text-white/80">
                            Starts at {notification.startTime} • {notification.className}
                        </p>
                    </div>
                    <span className="w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
                </button>
                <button
                    onClick={() => setNotification(null)}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-slate-100 transition"
                >
                    <X className="w-4 h-4 text-slate-500" />
                </button>
            </div>
        </div>
    );
}
