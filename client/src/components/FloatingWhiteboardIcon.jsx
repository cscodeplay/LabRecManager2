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
        <button 
            type="button"
            onClick={() => router.push(activeSession.url || '/live-board')}
            className="fixed bottom-6 right-20 z-[999] p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-lg text-indigo-600 dark:text-indigo-400 hover:scale-105 hover:border-indigo-400 hover:shadow-indigo-500/20 transition-all flex items-center gap-1.5 group cursor-pointer"
            title={`Return to Active Whiteboard: ${activeSession.title || 'Canvas'}`}
            aria-label="Return to Active Whiteboard"
        >
            <Pencil className="w-4 h-4" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <div className="absolute -top-9 right-0 bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition whitespace-nowrap shadow-lg pointer-events-none">
                Return to {activeSession.title || 'Whiteboard'}
            </div>
        </button>
    );
}
