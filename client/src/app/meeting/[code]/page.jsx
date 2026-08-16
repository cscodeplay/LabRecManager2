'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGlobalMeeting } from '@/components/GlobalMeetingContext';
import { useAuthStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MeetingPageWrapper() {
    const params = useParams();
    const router = useRouter();
    const { activeMeeting, setActiveMeeting } = useGlobalMeeting();
    const { user } = useAuthStore();
    
    // Unwrap params in next.js
    const unwrappedParams = React.use(params);
    const code = unwrappedParams.code;

    useEffect(() => {
        if (!user) {
            toast.error('You must be logged in to join a meeting.');
            router.push('/login');
            return;
        }

        if (code) {
            if (!activeMeeting || activeMeeting.roomCode !== code) {
                // Trigger the global meeting component to handle connection
                setActiveMeeting({ roomCode: code });
            }
        }
    }, [code, user, router, activeMeeting, setActiveMeeting]);

    // This page itself renders nothing (or a loading screen) 
    // because GlobalMeetingRoom.jsx (which lives in Providers.jsx) 
    // detects the URL pathname `/meeting/[code]` and overlays the Full-Screen VC UI.
    
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
            <h2 className="text-xl font-bold">Initializing Meeting Space...</h2>
            <p className="text-slate-400 mt-2">Connecting to server and allocating media resources.</p>
        </div>
    );
}
