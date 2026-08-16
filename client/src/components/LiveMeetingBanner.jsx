'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { meetingAPI } from '@/lib/api';
import { Video, ArrowRight, X } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useGlobalMeeting } from './GlobalMeetingContext';

export default function LiveMeetingBanner() {
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const { activeMeeting } = useGlobalMeeting();
    const router = useRouter();
    const pathname = usePathname();
    const [liveMeetings, setLiveMeetings] = useState([]);
    const [dismissed, setDismissed] = useState([]);

    useEffect(() => {
        if (!_hasHydrated || !isAuthenticated || !user) return;

        const fetchLiveMeetings = async () => {
            try {
                const res = await meetingAPI.getSessions({ status: 'in_progress' });
                if (res.data?.data?.sessions) {
                    setLiveMeetings(res.data.data.sessions);
                }
            } catch (err) {
                console.error('Failed to fetch live meetings:', err);
            }
        };

        fetchLiveMeetings();
        const interval = setInterval(fetchLiveMeetings, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [_hasHydrated, isAuthenticated, user]);

    // Don't show if currently in a meeting
    if (activeMeeting || pathname?.startsWith('/meeting/')) return null;

    const visibleMeetings = liveMeetings.filter(m => !dismissed.includes(m.id));

    if (visibleMeetings.length === 0) return null;

    const meeting = visibleMeetings[0];

    return (
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-4 py-2.5 flex items-center justify-between shadow-md relative z-50 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                <Video className="w-4 h-4" />
                <p className="text-sm font-medium">
                    Live Meeting in Progress: <strong className="font-bold">{meeting.title || 'Session'}</strong>
                </p>
            </div>
            
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.push(`/meeting/${meeting.roomCode || meeting.id}`)}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                    Join Now
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button 
                    onClick={() => setDismissed(prev => [...prev, meeting.id])}
                    className="p-1 hover:bg-white/20 rounded-md transition-colors text-white/80 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
