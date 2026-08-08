'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Pencil } from 'lucide-react';

export default function FloatingWhiteboardIcon() {
    const router = useRouter();
    const pathname = usePathname();
    const [activeSession, setActiveSession] = useState(null);

    useEffect(() => {
        // Check for active session
        const checkSession = () => {
            try {
                const saved = localStorage.getItem('active_whiteboard_session');
                if (saved) {
                    const session = JSON.parse(saved);
                    // Expire after 2 hours
                    if (session && session.timestamp && (Date.now() - session.timestamp < 2 * 60 * 60 * 1000)) {
                        setActiveSession(session);
                        return;
                    }
                }
            } catch (e) {}
            setActiveSession(null);
        };
        
        checkSession();
        // Set up interval to check periodically
        const interval = setInterval(checkSession, 5000);
        return () => clearInterval(interval);
    }, [pathname]);

    // Don't show if we are currently on the whiteboard or live-board pages
    if (!activeSession || pathname.includes('/live-board') || pathname.includes('/whiteboard')) {
        return null;
    }

    return (
        <div 
            onClick={() => router.push(activeSession.url || '/live-board')}
            className="fixed bottom-24 right-8 z-[999] w-14 h-14 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center cursor-pointer hover:bg-indigo-700 hover:scale-110 transition-all group border-4 border-indigo-400/30"
            title="Return to Active Whiteboard"
        >
            <Pencil className="w-6 h-6 text-white" />
            <div className="absolute -top-10 right-0 bg-slate-900 text-white text-xs px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap shadow-lg pointer-events-none">
                Return to {activeSession.title || 'Whiteboard'}
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping opacity-20 pointer-events-none"></div>
        </div>
    );
}
