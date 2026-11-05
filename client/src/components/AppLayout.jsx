'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Search, GraduationCap } from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import ProfileDropdown from './ProfileDropdown';
import SessionSelector, { ReadOnlyBanner } from './SessionSelector';
import { DatabaseStatusBadge } from './DatabaseStatus';
import CommitInfoBadge from './CommitInfoBadge';
import FloatingChatbot from './FloatingChatbot';
import GlobalSearch from './GlobalSearch';
import VoiceHUD from './VoiceHUD';
import GlobalQuickActions from './GlobalQuickActions';
import { useAuthStore } from '@/lib/store';

export default function AppLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { isAuthenticated, _hasHydrated, user } = useAuthStore();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [voiceHudOpen, setVoiceHudOpen] = useState(false);
    const [schoolInfo, setSchoolInfo] = useState(() => {
        try {
            if (typeof window !== 'undefined') {
                const cached = localStorage.getItem('school_branding');
                if (cached) return JSON.parse(cached);
            }
        } catch (e) {}
        return null;
    });

    useEffect(() => {
        if (user?.school?.logoUrl || user?.school?.name) {
            setSchoolInfo(user.school);
        } else {
            try {
                const cached = localStorage.getItem('school_branding');
                if (cached) setSchoolInfo(JSON.parse(cached));
            } catch (e) {}
        }
    }, [user?.school]);

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

    // Load sidebar collapsed state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved) {
            setSidebarCollapsed(JSON.parse(saved));
        }
    }, []);

    // Save sidebar collapsed state
    const handleToggleCollapse = () => {
        const newState = !sidebarCollapsed;
        setSidebarCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
    };

    // Universal menu toggle handler: collapses/expands sidebar on desktop, toggles drawer on mobile
    const handleToggleMenu = () => {
        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
            handleToggleCollapse();
        } else {
            setSidebarOpen(prev => !prev);
        }
    };

    // If on auth page, just render children without layout
    if (isAuthPage) {
        return <>{children}</>;
    }

    // Wait for hydration (with mounted safety fallback)
    if (!_hasHydrated && !mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    // If not authenticated and not on auth page, render children (they will handle redirect)
    if (!isAuthenticated) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={handleToggleCollapse}
            />

            {/* Main Content */}
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                {/* Top Header */}
                <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
                    <div className="px-4 h-16 flex items-center justify-between gap-4">
                        {/* Left side - Menu toggle button & Branding */}
                        <div className="flex items-center gap-3 flex-1">
                            {/* Universal Collapse / Expand Hamburger Menu Button */}
                            <button
                                type="button"
                                onClick={handleToggleMenu}
                                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs"
                                title={sidebarCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
                                aria-label="Toggle navigation menu"
                            >
                                <Menu className="w-5 h-5 text-slate-700" />
                            </button>

                            {/* Mobile Brand: School Logo to the left of ULRMS */}
                            <div className="lg:hidden flex items-center gap-2 mr-1">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shadow-xs flex-shrink-0">
                                    {schoolInfo?.logoUrl ? (
                                        <img
                                            src={schoolInfo.logoUrl}
                                            alt={schoolInfo.name || 'School Logo'}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-md bg-primary-600 flex items-center justify-center text-white">
                                            <GraduationCap className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                                <span className="font-extrabold text-primary-600 text-sm tracking-wide">
                                    ULRMS
                                </span>
                            </div>
                        </div>

                        {/* Right side - Session, Status, Notifications, Profile */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <div className="hidden md:flex items-center">
                                <SessionSelector />
                            </div>
                            <div className="hidden sm:flex items-center">
                                <CommitInfoBadge />
                            </div>
                            <div className="hidden sm:flex items-center">
                                <DatabaseStatusBadge />
                            </div>
                            <NotificationBell />
                            <ProfileDropdown />
                        </div>
                    </div>
                </header>

                {/* Read-Only Mode Banner */}
                <ReadOnlyBanner />

                {/* Page Content */}
                <main className="min-h-[calc(100vh-4rem)]">
                    {children}
                </main>
            </div>

            {/* Mobile & iPad Floating Search Shortcut Button */}
            <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
                className="md:hidden fixed bottom-6 left-5 z-40 w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all border border-white/20 cursor-pointer"
                title="Search anything (tap to open)"
                aria-label="Quick Search"
            >
                <Search className="w-5 h-5" />
            </button>

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


