'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import Sidebar from './Sidebar';
import UnifiedTopBar from './UnifiedTopBar';
import NotificationBell from './NotificationBell';
import { ReadOnlyBanner } from './SessionSelector';
import CommitInfoBadge from './CommitInfoBadge';
import FloatingChatbot from './FloatingChatbot';
import VoiceHUD from './VoiceHUD';
import GlobalQuickActions from './GlobalQuickActions';
import GreenSegmentedSpinner from './GreenSegmentedSpinner';
import { useAuthStore } from '@/lib/store';
import { useLowMemoryDevice } from '@/hooks/useEdgeHoverReveal';

export default function AppLayout({ children }) {
    const pathname = usePathname();
    const { isAuthenticated, _hasHydrated } = useAuthStore();
    const isLowMemory = useLowMemoryDevice();

    const [voiceHudOpen, setVoiceHudOpen] = useState(false);

    // Global keyboard shortcut for Voice HUD (Ctrl+Shift+V / Cmd+Shift+V)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                setVoiceHudOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Ensure hydration is acknowledged client-side to prevent infinite spinner
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        if (!useAuthStore.getState()._hasHydrated) {
            useAuthStore.getState().setHasHydrated(true);
        }
    }, []);

    // Don't show layout on public auth pages
    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/adminmoslogin' || pathname === '/reset-password-pin';

    if (isAuthPage) {
        return <>{children}</>;
    }

    if (!_hasHydrated && !mounted) {
        return <GreenSegmentedSpinner fullscreen />;
    }

    if (!isAuthenticated) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950">
            {/* Left-Edge macOS-Style Auto-Hide Icon Dock */}
            <Sidebar />

            {/* Unified Top Search Bar with Session & Category Filter Options */}
            <UnifiedTopBar isLowMemory={isLowMemory} />

            {/* Top-Right Notification Bell Floating Circle with Full Volume Control */}
            <div className={`fixed top-2.5 ${(pathname?.startsWith('/whiteboard') || pathname?.startsWith('/live-board')) ? 'right-[160px] sm:right-[236px]' : 'right-3.5'} z-[80]`}>
                <NotificationBell
                    variant="floating-circle"
                    lowMemory={isLowMemory}
                />
            </div>

            {/* Bottom-Right Small-Font Commit Hash */}
            <div className="fixed bottom-2.5 right-3.5 z-[70]">
                <CommitInfoBadge placement="bottom-right" />
            </div>

            {/* Read-Only Mode Banner & Fullscreen Main Content */}
            <div className="w-full min-h-[100dvh]">
                <ReadOnlyBanner />
                <main className="min-h-[100dvh] w-full">
                    {children}
                </main>
            </div>

            {/* Mobile & iPad Floating Search Shortcut Button */}
            {!pathname?.startsWith('/practice-ide') && !pathname?.startsWith('/whiteboard') && !pathname?.startsWith('/live-board') && (
                <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
                    className="md:hidden fixed bottom-6 left-5 z-40 w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all border border-white/20 cursor-pointer"
                    title="Search anything (tap to open)"
                    aria-label="Quick Search"
                >
                    <Search className="w-5 h-5" />
                </button>
            )}

            {/* Keyboard-Invoked Global Quick Actions (⌘1-⌘6, ⌘?) */}
            <GlobalQuickActions />

            {/* Global Voice Interaction HUD */}
            <VoiceHUD isOpen={voiceHudOpen} onClose={() => setVoiceHudOpen(false)} />

            {/* AI Chatbot floating widget — admin/principal only */}
            <FloatingChatbot />
        </div>
    );
}
