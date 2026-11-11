'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Pin, PinOff, ChevronDown, ChevronUp } from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import SessionSelector, { ReadOnlyBanner } from './SessionSelector';
import CommitInfoBadge from './CommitInfoBadge';
import FloatingChatbot from './FloatingChatbot';
import GlobalSearch from './GlobalSearch';
import VoiceHUD from './VoiceHUD';
import GlobalQuickActions from './GlobalQuickActions';
import GreenSegmentedSpinner from './GreenSegmentedSpinner';
import { useAuthStore } from '@/lib/store';
import { useEdgeHoverReveal, useLowMemoryDevice } from '@/hooks/useEdgeHoverReveal';

export default function AppLayout({ children }) {
    const pathname = usePathname();
    const { isAuthenticated, _hasHydrated } = useAuthStore();
    const isLowMemory = useLowMemoryDevice();

    const [voiceHudOpen, setVoiceHudOpen] = useState(false);
    const [topSearchValue, setTopSearchValue] = useState('');
    const [sessionMenuOpen, setSessionMenuOpen] = useState(false);
    const [notifMenuOpen, setNotifMenuOpen] = useState(false);

    const topBarReveal = useEdgeHoverReveal({
        autoHideMs: 2500,
        initialPeekMs: 2500,
        storageKey: 'topHoverBarPinned',
        isLocked: sessionMenuOpen || notifMenuOpen,
    });

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

    const triggerGlobalSearch = (initialQuery = '') => {
        window.dispatchEvent(new CustomEvent('open-global-search', { detail: { query: initialQuery } }));
        setTopSearchValue('');
    };

    const topSurface = isLowMemory
        ? 'bg-white/95 dark:bg-slate-900/95'
        : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm';

    return (
        <div className="min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950">
            {/* Left-Edge macOS-Style Auto-Hide Icon Dock */}
            <Sidebar />

            {/* Top-Edge Mouse & Pen Hover Hot-Zone (0ms reveal for Top Bar + Bell Circle) */}
            <div
                {...topBarReveal.triggerProps}
                className="fixed top-0 left-16 right-0 h-3.5 z-[78] flex justify-center"
                aria-hidden="true"
            >
                {!topBarReveal.isVisible && (
                    <span className="mt-1 h-1 w-20 rounded-full bg-slate-400/40 dark:bg-slate-500/40 transition-opacity" />
                )}
            </div>

            {/* Touch-Only Top Pull Pill (Devices without hover capability) */}
            <button
                type="button"
                onClick={topBarReveal.toggleOpen}
                className={`[@media(hover:none)]:flex hidden fixed top-2 left-1/2 -translate-x-1/2 z-[78] px-3.5 h-11 rounded-full ${topSurface} border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-lg items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 transition-transform`}
                aria-label={topBarReveal.isVisible ? 'Hide search and notifications bar' : 'Show search and notifications bar'}
                aria-expanded={topBarReveal.isVisible}
            >
                <Search className="w-4 h-4" />
                <span>Search</span>
                {topBarReveal.isVisible ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Centered Hover Top Bar (Search Input + Session Selector + Right-End Icon Pin, z-[80] over OfficeFloatingTopNav) */}
            <header
                {...topBarReveal.containerProps}
                role="banner"
                aria-label="Quick Search and Session Bar"
                style={{ willChange: topBarReveal.isVisible ? 'transform, opacity' : 'auto' }}
                className={`fixed top-2.5 left-1/2 -translate-x-1/2 z-[80] w-[min(580px,calc(100vw-168px))] sm:w-[min(580px,calc(100vw-220px))] rounded-full border border-slate-200/90 dark:border-slate-700/80 shadow-2xl px-2 py-1.5 flex items-center gap-2 ${topSurface} transition-opacity duration-150 motion-safe:transition-[transform,opacity] motion-safe:duration-150 motion-safe:ease-out ${
                    topBarReveal.isVisible
                        ? 'translate-y-0 opacity-100 pointer-events-auto'
                        : '-translate-y-[140%] opacity-0 pointer-events-none'
                }`}
            >
                {/* Centered Search Input */}
                <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/25 min-w-0">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                        type="text"
                        value={topSearchValue}
                        onChange={(e) => {
                            const val = e.target.value;
                            setTopSearchValue(val);
                            if (val.trim().length > 0) {
                                triggerGlobalSearch(val);
                            }
                        }}
                        onClick={() => triggerGlobalSearch(topSearchValue)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                triggerGlobalSearch(topSearchValue);
                            }
                        }}
                        placeholder="Search labs, docs, assignments, users..."
                        aria-label="Global search"
                        className="w-full bg-transparent border-0 outline-none text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-0 min-w-0"
                    />
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-300 shrink-0">
                        ⌘K
                    </kbd>
                </div>

                {/* Session Selector */}
                <div className="shrink-0">
                    <SessionSelector variant="pill" onOpenChange={setSessionMenuOpen} />
                </div>

                {/* Small Icon-Only Pin at Right End of Centered Top Bar */}
                <button
                    type="button"
                    onClick={topBarReveal.togglePinned}
                    aria-label={topBarReveal.isPinned ? 'Unpin top bar' : 'Pin top bar open'}
                    aria-pressed={topBarReveal.isPinned}
                    title={topBarReveal.isPinned ? 'Unpin Top Bar (Auto-Hide)' : 'Pin Top Bar Open'}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-colors active:scale-95 cursor-pointer ${
                        topBarReveal.isPinned
                            ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                >
                    {topBarReveal.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                </button>
            </header>

            {/* Separate Top-Rightmost Notification Bell Circle (Offset clear of Fullscreen toggle on Whiteboard) */}
            <div
                {...topBarReveal.containerProps}
                style={{ willChange: topBarReveal.isVisible ? 'transform, opacity' : 'auto' }}
                className={`fixed top-2.5 ${(pathname?.startsWith('/whiteboard') || pathname?.startsWith('/live-board')) ? 'right-14' : 'right-3.5'} z-[80] transition-opacity duration-150 motion-safe:transition-[transform,opacity] motion-safe:duration-150 motion-safe:ease-out ${
                    topBarReveal.isVisible
                        ? 'translate-y-0 opacity-100 pointer-events-auto'
                        : '-translate-y-[140%] opacity-0 pointer-events-none'
                }`}
            >
                <NotificationBell
                    variant="floating-circle"
                    onOpenChange={setNotifMenuOpen}
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

            {/* Mobile & iPad Floating Search Shortcut Button (Suppressed on Practice IDE and Whiteboard where bottom-left belongs to Minimap) */}
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

            {/* Keyboard-Invoked Global Search Dialog (⌘K / Ctrl+K) */}
            <GlobalSearch />

            {/* Keyboard-Invoked Global Quick Actions (⌘1-⌘6, ⌘?) */}
            <GlobalQuickActions />

            {/* Global Voice Interaction HUD */}
            <VoiceHUD isOpen={voiceHudOpen} onClose={() => setVoiceHudOpen(false)} />

            {/* AI Chatbot floating widget — admin/principal only */}
            <FloatingChatbot />
        </div>
    );
}
