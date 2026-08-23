'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { meetingAPI } from '@/lib/api';
import { Video, ArrowRight, Clock } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useGlobalMeeting } from './GlobalMeetingContext';

export default function LiveMeetingBanner() {
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const { activeMeeting } = useGlobalMeeting();
    const router = useRouter();
    const pathname = usePathname();
    const [liveMeetings, setLiveMeetings] = useState([]);
    const [dismissed, setDismissed] = useState([]);
    const [now, setNow] = useState(Date.now());

    // Update current timestamp every second for accurate elapsed timer
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!_hasHydrated || !isAuthenticated || !user) return;

        let isMounted = true;
        const fetchLiveMeetings = async () => {
            try {
                const res = await meetingAPI.getSessions({ status: 'in_progress' });
                if (res.data?.data?.sessions && isMounted) {
                    setLiveMeetings(res.data.data.sessions);
                }
            } catch (err) {
                // Silently ignore network polling failures to avoid console spam
            }
        };

        fetchLiveMeetings();
        const interval = setInterval(fetchLiveMeetings, 15000); // Poll every 15s
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [_hasHydrated, isAuthenticated, user]);

    // Don't show if currently in a meeting or on the meeting page
    if (activeMeeting || pathname?.startsWith('/meeting/')) return null;

    const visibleMeetings = liveMeetings.filter(m => !dismissed.includes(m.id));
    if (visibleMeetings.length === 0) return null;

    const meeting = visibleMeetings[0];

    // Calculate elapsed time
    const startTime = meeting.actualStartTime || meeting.scheduledAt || meeting.createdAt;
    const getElapsedTimeStr = () => {
        if (!startTime) return 'Live';
        const diffMs = Math.max(0, now - new Date(startTime).getTime());
        const totalSec = Math.floor(diffMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        if (mins >= 60) {
            const hrs = Math.floor(mins / 60);
            const remMins = mins % 60;
            return `${hrs}h ${remMins}m`;
        }
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border border-emerald-500/40 text-white pl-3.5 pr-2 py-1.5 rounded-full shadow-2xl shadow-emerald-950/30 text-xs hover:border-emerald-500/60 transition-all group">
                {/* Live pulsing indicator */}
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Video className="w-3.5 h-3.5" />
                    </div>
                </div>

                {/* Meeting info & elapsed time */}
                <div className="flex items-center gap-2 max-w-[280px] sm:max-w-md">
                    <span className="font-semibold text-slate-100 truncate text-[12px]">
                        {meeting.title || 'Live Meeting'}
                    </span>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {getElapsedTimeStr()}
                    </span>
                </div>

                {/* Actions: Join & Ignore */}
                <div className="flex items-center gap-1.5 border-l border-slate-700/80 pl-2">
                    <button
                        onClick={() => router.push(`/meeting/${meeting.roomCode || meeting.id}`)}
                        className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-full text-[11px] flex items-center gap-1 transition shadow-sm hover:scale-105"
                    >
                        Join
                        <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => setDismissed(prev => [...prev, meeting.id])}
                        className="px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition flex items-center gap-1"
                        title="Ignore this meeting notification"
                    >
                        Ignore
                    </button>
                </div>
            </div>
        </div>
    );
}
