'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutGrid, FileText, Grid, Presentation, Layers,
    Film, RefreshCw, FolderOpen, Cloud, X, Search, Sparkles,
    Plus, Clock, ArrowRight, Check, ChevronRight,
    Sun, Moon, Laptop, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import api from '@/lib/api';
import { useThemeStore } from '@/lib/store';
import OfficeAppBlurLoader from '@/components/OfficeAppBlurLoader';

const SUITE_APPS = [
    {
        id: 'word',
        name: 'LabDocs',
        tagline: 'Word Document & Lab Reports',
        description: 'Paginated A4 editor, KaTeX formulas, academic citations & auto-save',
        href: '/documents/word-editor',
        icon: FileText,
        color: 'blue',
        badgeBg: 'bg-blue-600',
        cardBgLight: 'bg-blue-50/80 border-blue-200 text-slate-800 hover:border-blue-400',
        cardBgDark: 'from-blue-900/40 via-indigo-950/50 to-slate-950/90 border-blue-500/40 hover:border-blue-400',
        accentGlow: 'rgba(59, 130, 246, 0.25)',
        pattern: 'lines'
    },
    {
        id: 'excel',
        name: 'LabSheets',
        tagline: 'Spreadsheets & Data Charts',
        description: '100+ formulas, multi-cell drag selection, embedded charts & borders',
        href: '/documents/excel-editor',
        icon: Grid,
        color: 'emerald',
        badgeBg: 'bg-emerald-600',
        cardBgLight: 'bg-emerald-50/80 border-emerald-200 text-slate-800 hover:border-emerald-400',
        cardBgDark: 'from-emerald-950/40 via-teal-950/50 to-slate-950/90 border-emerald-500/40 hover:border-emerald-400',
        accentGlow: 'rgba(16, 185, 129, 0.25)',
        pattern: 'grid'
    },
    {
        id: 'slides',
        name: 'LabSlides',
        tagline: 'Presentation Slide Decks',
        description: '16:9 widescreen slides, presenter view, KaTeX support & slideshow mode',
        href: '/documents/slides-editor',
        icon: Presentation,
        color: 'amber',
        badgeBg: 'bg-amber-600',
        cardBgLight: 'bg-amber-50/80 border-amber-200 text-slate-800 hover:border-amber-400',
        cardBgDark: 'from-amber-950/40 via-orange-950/50 to-slate-950/90 border-amber-500/40 hover:border-amber-400',
        accentGlow: 'rgba(245, 158, 11, 0.25)',
        pattern: 'stage'
    },
    {
        id: 'pdf',
        name: 'LabPDF Studio',
        tagline: 'PDF Utilities & Page Tools',
        description: 'Merge PDFs, extract & split pages, compress, rotate & watermark',
        href: '/documents/pdf-studio',
        icon: Layers,
        color: 'rose',
        badgeBg: 'bg-rose-600',
        cardBgLight: 'bg-rose-50/80 border-rose-200 text-slate-800 hover:border-rose-400',
        cardBgDark: 'from-rose-950/40 via-red-950/50 to-slate-950/90 border-rose-500/40 hover:border-rose-400',
        accentGlow: 'rgba(244, 63, 94, 0.25)',
        pattern: 'layers'
    },
    {
        id: 'media',
        name: 'Media Studio',
        tagline: 'Audio, Video & Media Processing',
        description: 'Convert video & audio, compress, trim timeline & clip media records',
        href: '/documents/media-studio',
        icon: Film,
        color: 'sky',
        badgeBg: 'bg-sky-600',
        cardBgLight: 'bg-sky-50/80 border-sky-200 text-slate-800 hover:border-sky-400',
        cardBgDark: 'from-sky-950/40 via-cyan-950/50 to-slate-950/90 border-sky-500/40 hover:border-sky-400',
        accentGlow: 'rgba(14, 165, 233, 0.25)',
        pattern: 'waves'
    },
    {
        id: 'converter',
        name: 'Universal Converter',
        tagline: 'Multi-Format File Transformation',
        description: 'Word ↔ PDF, Excel ↔ PDF, Images ↔ PDF with batch download',
        href: '/documents/converter',
        icon: RefreshCw,
        color: 'purple',
        badgeBg: 'bg-purple-600',
        cardBgLight: 'bg-purple-50/80 border-purple-200 text-slate-800 hover:border-purple-400',
        cardBgDark: 'from-purple-950/40 via-fuchsia-950/50 to-slate-950/90 border-purple-500/40 hover:border-purple-400',
        accentGlow: 'rgba(168, 85, 247, 0.25)',
        pattern: 'vortex'
    },
    {
        id: 'vault',
        name: 'CloudVault',
        tagline: 'Document Storage & Management',
        description: 'Folder organization, institutional file sharing & whiteboard recordings',
        href: '/documents',
        icon: Cloud,
        color: 'slate',
        badgeBg: 'bg-slate-700',
        cardBgLight: 'bg-slate-100 border-slate-300 text-slate-800 hover:border-slate-400',
        cardBgDark: 'from-slate-900/60 via-slate-950/80 to-slate-950/95 border-slate-700 hover:border-slate-500',
        accentGlow: 'rgba(148, 163, 184, 0.2)',
        pattern: 'vault'
    }
];

export default function OfficeFloatingTopNav() {
    const pathname = usePathname();
    const router = useRouter();

    const { theme, setTheme } = useThemeStore();
    const [isDark, setIsDark] = useState(false);

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
    const [recentDocs, setRecentDocs] = useState([]);
    const [searchFilter, setSearchFilter] = useState('');
    const [loadingRecent, setLoadingRecent] = useState(false);
    const [navigatingApp, setNavigatingApp] = useState(null);

    const collapseTimerRef = useRef(null);

    // Auto-collapse after 5 seconds of inactivity outside hover
    useEffect(() => {
        if (isHovered || isCollapsed || isWelcomeOpen) {
            if (collapseTimerRef.current) {
                clearTimeout(collapseTimerRef.current);
                collapseTimerRef.current = null;
            }
        } else {
            collapseTimerRef.current = setTimeout(() => {
                setIsCollapsed(true);
            }, 5000);
        }

        return () => {
            if (collapseTimerRef.current) {
                clearTimeout(collapseTimerRef.current);
            }
        };
    }, [isHovered, isCollapsed, isWelcomeOpen]);

    // Clear navigating indicator when path changes
    useEffect(() => {
        setNavigatingApp(null);
    }, [pathname]);

    // Escape key listener to close Welcome Launchpad
    useEffect(() => {
        if (!isWelcomeOpen) return;
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setIsWelcomeOpen(false);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isWelcomeOpen]);

    // Track active theme reactively
    useEffect(() => {
        const updateTheme = () => {
            if (typeof document !== 'undefined') {
                setIsDark(document.documentElement.classList.contains('dark'));
            }
        };
        updateTheme();
        const obs = new MutationObserver(updateTheme);
        if (typeof document !== 'undefined') {
            obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        }
        return () => obs.disconnect();
    }, [theme]);

    // Fetch recent documents for Welcome Launchpad
    useEffect(() => {
        if (isWelcomeOpen) {
            const fetchRecent = async () => {
                setLoadingRecent(true);
                try {
                    const res = await api.get('/office/documents?limit=6');
                    if (res.data?.success && Array.isArray(res.data.data)) {
                        setRecentDocs(res.data.data);
                    }
                } catch (err) {
                    console.error('Failed to fetch recent office documents:', err);
                } finally {
                    setLoadingRecent(false);
                }
            };
            fetchRecent();
        }
    }, [isWelcomeOpen]);

    // Keyboard shortcut Escape closes Launchpad
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isWelcomeOpen) {
                setIsWelcomeOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isWelcomeOpen]);

    const filteredApps = SUITE_APPS.filter(app =>
        app.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        app.tagline.toLowerCase().includes(searchFilter.toLowerCase()) ||
        app.description.toLowerCase().includes(searchFilter.toLowerCase())
    );

    const toggleTheme = () => {
        const nextTheme = isDark ? 'light' : 'dark';
        setTheme(nextTheme);
    };

    return (
        <>
            {/* Top Navigation Bar: Fully Opaque, Stable Layout without Accidental Timeouts */}
            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[60] select-none transition-all duration-200"
            >
                {isCollapsed ? (
                    /* 4-Square Collapsed Icon */
                    <button
                        onClick={() => setIsWelcomeOpen(true)}
                        className={`group flex items-center gap-2 px-3 py-1.5 rounded-2xl border shadow-xl transition-all transform hover:scale-105 ${
                            isDark
                                ? 'bg-slate-900 border-slate-700 text-white hover:border-emerald-500 shadow-slate-950/80'
                                : 'bg-white border-slate-300 text-slate-800 hover:border-emerald-600 shadow-slate-300/60'
                        }`}
                        title="Click to open Office & Media Suite Welcome Launchpad"
                    >
                        <div className="relative">
                            <LayoutGrid className="w-4 h-4 text-emerald-500 group-hover:rotate-90 transition-transform duration-300" />
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        </div>
                        <span className="text-xs font-bold tracking-wide hidden sm:inline text-emerald-600 dark:text-emerald-400">
                            Office Suite
                        </span>
                        <span
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCollapsed(false);
                            }}
                            className="ml-1 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title="Expand Navigation Bar"
                        >
                            <ChevronDown className="w-3.5 h-3.5" />
                        </span>
                    </button>
                ) : (
                    /* Expanded Floating Horizontal Suite Bar - 100% Opaque, High Contrast */
                    <div className={`flex items-center gap-1.5 p-1 rounded-2xl border shadow-2xl transition-all max-w-[95vw] ${
                        isDark
                            ? 'bg-slate-900 border-slate-700 text-white shadow-slate-950/90'
                            : 'bg-white border-slate-300 text-slate-800 shadow-slate-400/40'
                    }`}>
                        {/* 4-Square Launcher Button */}
                        <button
                            type="button"
                            onClick={() => setIsWelcomeOpen(true)}
                            className={`w-8 h-8 rounded-xl transition-all flex items-center justify-center shrink-0 border ${
                                isDark
                                    ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700 hover:border-emerald-500/50 shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-emerald-600 border-slate-200 hover:border-emerald-500/50 shadow-xs'
                            }`}
                            title="Open Welcome Launchpad with all apps and recent files"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>

                        <div className={`h-4 w-px mx-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

                        {/* Horizontal Suite Apps - Fully Responsive & High Contrast */}
                        <div className="flex items-center gap-1 overflow-x-auto max-w-[80vw] sm:max-w-none py-0.5 px-0.5">
                            {SUITE_APPS.map(app => {
                                const Icon = app.icon;
                                const isActive = pathname === app.href;

                                return (
                                    <Link
                                        key={app.id}
                                        href={app.href}
                                        onClick={() => {
                                            if (pathname !== app.href) setNavigatingApp(app.id);
                                        }}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                                            isActive
                                                ? `${app.badgeBg} text-white shadow-sm ring-1 ring-white/30 font-bold`
                                                : isDark
                                                ? 'text-slate-200 hover:text-white hover:bg-slate-800'
                                                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                                        }`}
                                        title={`${app.name} — ${app.tagline}`}
                                    >
                                        <Icon className="w-3.5 h-3.5 shrink-0" />
                                        <span className="whitespace-nowrap">{app.name}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        <div className={`h-4 w-px mx-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

                        {/* Fast Theme Toggle in Top Bar */}
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className={`p-1.5 rounded-xl transition-all shrink-0 border ${
                                isDark
                                    ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                            }`}
                            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                        >
                            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                        </button>

                        {/* Minimize / Collapse Bar Button */}
                        <button
                            type="button"
                            onClick={() => setIsCollapsed(true)}
                            className={`p-1.5 rounded-xl transition-all shrink-0 ${
                                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                            title="Collapse bar to 4-Square icon"
                        >
                            <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Welcome Launchpad Modal: Full Light & Dark Theme Support */}
            {isWelcomeOpen && (
                <div
                    className={`fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in ${
                        isDark ? 'bg-slate-950/80 backdrop-blur-md' : 'bg-slate-900/40 backdrop-blur-md'
                    }`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsWelcomeOpen(false);
                    }}
                >
                    <div className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden my-auto transition-all ${
                        isDark
                            ? 'bg-slate-900 border-slate-800 text-white'
                            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
                    }`}>
                        {/* Header Bar */}
                        <div className={`p-6 border-b flex items-center justify-between gap-4 shrink-0 ${
                            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-600 text-white shadow-lg shadow-emerald-500/20">
                                    <LayoutGrid className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                                        Office & Media Suite
                                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                            Integrated
                                        </span>
                                    </h2>
                                    <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Create, analyze, present, convert, and manage institutional records
                                    </p>
                                </div>
                            </div>

                            {/* Search, Theme Toggle and Close */}
                            <div className="flex items-center gap-2.5">
                                <div className="relative hidden md:block w-60">
                                    <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                                    <input
                                        type="text"
                                        placeholder="Search apps & tools..."
                                        value={searchFilter}
                                        onChange={(e) => setSearchFilter(e.target.value)}
                                        className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border outline-none transition ${
                                            isDark
                                                ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-400 focus:border-emerald-500'
                                                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500 focus:border-emerald-600'
                                        }`}
                                    />
                                </div>

                                {/* Theme Mode Switcher in Welcome Launchpad */}
                                <div className={`flex items-center p-1 rounded-xl border ${
                                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
                                }`}>
                                    <button
                                        type="button"
                                        onClick={() => setTheme('light')}
                                        className={`p-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                                            !isDark ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-400 hover:text-white'
                                        }`}
                                        title="Switch to Light Mode"
                                    >
                                        <Sun className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline text-[11px]">Light</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTheme('dark')}
                                        className={`p-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                                            isDark ? 'bg-slate-700 text-emerald-400 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                        title="Switch to Dark Mode"
                                    >
                                        <Moon className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline text-[11px]">Dark</span>
                                    </button>
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={() => setIsWelcomeOpen(false)}
                                    className={`p-2 rounded-xl transition border ${
                                        isDark
                                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200'
                                    }`}
                                    title="Close Launchpad (Esc)"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* App Grid with Themed Cards */}
                            <div>
                                <h3 className={`text-xs uppercase tracking-wider font-bold mb-3 flex items-center gap-2 ${
                                    isDark ? 'text-slate-400' : 'text-slate-600'
                                }`}>
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    Core Suite Applications
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredApps.map(app => {
                                        const Icon = app.icon;

                                        return (
                                            <div
                                                key={app.id}
                                                className={`group relative overflow-hidden rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${
                                                    isDark
                                                        ? `bg-gradient-to-br ${app.cardBgDark}`
                                                        : `${app.cardBgLight} shadow-sm`
                                                }`}
                                                style={{ boxShadow: isDark ? `0 10px 30px -10px ${app.accentGlow}` : undefined }}
                                            >
                                                {/* Abstract Background SVG Accent */}
                                                <div className={`absolute inset-0 pointer-events-none overflow-hidden ${isDark ? 'opacity-15' : 'opacity-10'}`}>
                                                    {app.pattern === 'lines' && (
                                                        <svg className="w-full h-full text-blue-500" viewBox="0 0 200 200" fill="none">
                                                            <line x1="10" y1="30" x2="190" y2="30" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                                                            <line x1="10" y1="70" x2="160" y2="70" stroke="currentColor" strokeWidth="2" />
                                                            <line x1="10" y1="110" x2="180" y2="110" stroke="currentColor" strokeWidth="2" />
                                                            <line x1="10" y1="150" x2="140" y2="150" stroke="currentColor" strokeWidth="2" />
                                                        </svg>
                                                    )}
                                                    {app.pattern === 'grid' && (
                                                        <svg className="w-full h-full text-emerald-500" viewBox="0 0 200 200" fill="none">
                                                            <path d="M0 40H200M0 80H200M0 120H200M0 160H200M40 0V200M80 0V200M120 0V200M160 0V200" stroke="currentColor" strokeWidth="1" strokeOpacity="0.6" />
                                                        </svg>
                                                    )}
                                                    {app.pattern === 'stage' && (
                                                        <svg className="w-full h-full text-amber-500" viewBox="0 0 200 200" fill="none">
                                                            <rect x="20" y="30" width="160" height="100" rx="8" stroke="currentColor" strokeWidth="2" />
                                                            <polygon points="100,130 80,180 120,180" stroke="currentColor" strokeWidth="2" />
                                                        </svg>
                                                    )}
                                                    {app.pattern === 'layers' && (
                                                        <svg className="w-full h-full text-rose-500" viewBox="0 0 200 200" fill="none">
                                                            <rect x="30" y="40" width="120" height="140" rx="6" stroke="currentColor" strokeWidth="2" fill="none" />
                                                            <rect x="50" y="20" width="120" height="140" rx="6" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                                                        </svg>
                                                    )}
                                                    {(app.pattern === 'waves' || app.pattern === 'media' || app.id === 'media') && (
                                                        <svg className="w-full h-full text-sky-500" viewBox="0 0 200 200" fill="none">
                                                            {/* Windows-style Image (Photos) Frame */}
                                                            <g transform="translate(108, 16)">
                                                                <rect x="0" y="0" width="76" height="54" rx="6" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                <circle cx="20" cy="18" r="6" stroke="currentColor" strokeWidth="1.5" />
                                                                <path d="M6 46 L26 26 L46 46 L56 36 L70 48" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" fill="none" />
                                                            </g>
                                                            {/* Windows-style Audio (Music Notes & Equalizer) */}
                                                            <g transform="translate(16, 75)">
                                                                <ellipse cx="22" cy="68" rx="9" ry="6.5" transform="rotate(-20 22 68)" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
                                                                <ellipse cx="54" cy="58" rx="9" ry="6.5" transform="rotate(-20 54 58)" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
                                                                <line x1="29" y1="65" x2="29" y2="22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                                                                <line x1="61" y1="55" x2="61" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                                                                <polygon points="28,24 62,14 62,21 28,31" fill="currentColor" />
                                                                {/* Audio Wave / EQ Bars */}
                                                                <line x1="4" y1="96" x2="4" y2="112" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                                <line x1="14" y1="90" x2="14" y2="112" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                                <line x1="24" y1="84" x2="24" y2="112" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                                <line x1="34" y1="92" x2="34" y2="112" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                                <line x1="44" y1="86" x2="44" y2="112" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                                <line x1="54" y1="98" x2="54" y2="112" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                            </g>
                                                            {/* Windows-style Video (Film strip with play button) */}
                                                            <g transform="translate(96, 92)">
                                                                <rect x="0" y="0" width="88" height="68" rx="7" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                <line x1="0" y1="16" x2="88" y2="16" stroke="currentColor" strokeWidth="1" />
                                                                <line x1="0" y1="52" x2="88" y2="52" stroke="currentColor" strokeWidth="1" />
                                                                {/* Sprockets Top */}
                                                                <rect x="6" y="4" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.15" />
                                                                <rect x="23" y="4" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.15" />
                                                                <rect x="40" y="4" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.15" />
                                                                <rect x="57" y="4" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.15" />
                                                                <rect x="73" y="4" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.15" />
                                                                {/* Sprockets Bottom */}
                                                                <rect x="6" y="56" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.15" />
                                                                <rect x="23" y="56" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.15" />
                                                                <rect x="40" y="56" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.15" />
                                                                <rect x="57" y="56" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.15" />
                                                                <rect x="73" y="56" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.15" />
                                                                {/* Center Play Button */}
                                                                <polygon points="38,26 58,34 38,42" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                                                            </g>
                                                        </svg>
                                                    )}
                                                    {(app.pattern === 'vortex' || app.pattern === 'converter' || app.id === 'converter') && (
                                                        <svg className="w-full h-full text-purple-500" viewBox="0 0 200 200" fill="none">
                                                            {/* Outer Square Cyclic Track */}
                                                            <rect x="28" y="28" width="144" height="144" rx="20" stroke="currentColor" strokeWidth="2" strokeDasharray="8 6" opacity="0.35" />
                                                            {/* Inner Square Cyclic Track */}
                                                            <rect x="54" y="54" width="92" height="92" rx="14" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.2" />

                                                            {/* Top Side: Double Arrows in Clockwise Direction (Left -> Right) */}
                                                            <g transform="translate(86, 28)">
                                                                <path d="M-12 -6 L-4 0 L-12 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                                <path d="M2 -6 L10 0 L2 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                            </g>
                                                            <g transform="translate(118, 54)">
                                                                <path d="M-8 -4 L-2 0 L-8 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
                                                                <path d="M2 -4 L8 0 L2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
                                                            </g>

                                                            {/* Right Side: Double Arrows in Clockwise Direction (Top -> Bottom) */}
                                                            <g transform="translate(172, 86)">
                                                                <path d="M-6 -12 L0 -4 L6 -12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                                <path d="M-6 2 L0 10 L6 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                            </g>
                                                            <g transform="translate(146, 118)">
                                                                <path d="M-4 -8 L0 -2 L4 -8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
                                                                <path d="M-4 2 L0 8 L4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
                                                            </g>

                                                            {/* Bottom Side: Double Arrows in Clockwise Direction (Right -> Left) */}
                                                            <g transform="translate(114, 172)">
                                                                <path d="M12 -6 L4 0 L12 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                                <path d="M-2 -6 L-10 0 L-2 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                            </g>
                                                            <g transform="translate(82, 146)">
                                                                <path d="M8 -4 L2 0 L8 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
                                                                <path d="M-2 -4 L-8 0 L-2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
                                                            </g>

                                                            {/* Left Side: Double Arrows in Clockwise Direction (Bottom -> Top) */}
                                                            <g transform="translate(28, 114)">
                                                                <path d="M-6 12 L0 4 L6 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                                <path d="M-6 -2 L0 -10 L6 -2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                            </g>
                                                            <g transform="translate(54, 82)">
                                                                <path d="M-4 8 L0 2 L4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
                                                                <path d="M-4 -2 L0 -8 L4 -2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
                                                            </g>

                                                            {/* Center Cyclic Node */}
                                                            <circle cx="100" cy="100" r="15" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.4" />
                                                            <path d="M92 97 A 10 10 0 0 1 108 97" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                            <polygon points="107,93 111,97 107,101" fill="currentColor" />
                                                            <path d="M108 103 A 10 10 0 0 1 92 103" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                            <polygon points="93,99 89,103 93,107" fill="currentColor" />
                                                        </svg>
                                                    )}
                                                    {(app.pattern === 'vault' || app.id === 'vault') && (
                                                        <svg className="w-full h-full text-slate-400" viewBox="0 0 200 200" fill="none">
                                                            {/* Cloud Icon */}
                                                            <g transform="translate(10, 5)">
                                                                <path
                                                                    d="M 40 70 A 18 18 0 0 1 60 48 A 26 26 0 0 1 105 46 A 20 20 0 0 1 130 64 A 16 16 0 0 1 122 86 L 40 86 A 15 15 0 0 1 40 70 Z"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                    fill="currentColor"
                                                                    fillOpacity="0.1"
                                                                    strokeLinejoin="round"
                                                                />
                                                                {/* Cloud Internal Data Nodes */}
                                                                <circle cx="75" cy="66" r="3" fill="currentColor" fillOpacity="0.6" />
                                                                <circle cx="95" cy="66" r="3" fill="currentColor" fillOpacity="0.6" />
                                                                <line x1="78" y1="66" x2="92" y2="66" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
                                                            </g>

                                                            {/* Earth / Globe Icon */}
                                                            <g transform="translate(10, 5)">
                                                                <circle cx="120" cy="130" r="38" stroke="currentColor" strokeWidth="2" fill="none" />
                                                                {/* Equator & Latitudes */}
                                                                <line x1="82" y1="130" x2="158" y2="130" stroke="currentColor" strokeWidth="1.5" />
                                                                <ellipse cx="120" cy="130" rx="38" ry="18" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 2" fill="none" />
                                                                {/* Meridians (Longitudes) */}
                                                                <ellipse cx="120" cy="130" rx="20" ry="38" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                                                <line x1="120" y1="92" x2="120" y2="168" stroke="currentColor" strokeWidth="1.5" />

                                                                {/* Internet Symbol: Orbital Ring & Global Network Satellites */}
                                                                <ellipse cx="120" cy="130" rx="54" ry="18" transform="rotate(-25 120 130)" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 3" fill="none" opacity="0.8" />
                                                                <circle cx="74" cy="112" r="3.5" fill="currentColor" />
                                                                <circle cx="166" cy="148" r="3.5" fill="currentColor" />
                                                            </g>

                                                            {/* Internet Symbol: Signal / Wi-Fi Transmission Waves */}
                                                            <g transform="translate(15, 5)">
                                                                <path d="M 48 128 A 16 16 0 0 1 64 144" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                                                                <path d="M 38 118 A 28 28 0 0 1 64 154" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="4 2" fill="none" />
                                                                <path d="M 28 108 A 40 40 0 0 1 64 164" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="3 3" fill="none" />
                                                                <circle cx="64" cy="144" r="2.5" fill="currentColor" />
                                                            </g>

                                                            {/* Data Sync Line Between Cloud & Earth */}
                                                            <path d="M 75 92 L 95 110" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7" />
                                                            <polygon points="95,106 99,112 92,111" fill="currentColor" />
                                                        </svg>
                                                    )}
                                                </div>

                                                {/* Card Content */}
                                                <div className="relative z-10">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className={`p-2.5 rounded-xl ${app.badgeBg} text-white shadow-md`}>
                                                            <Icon className="w-5 h-5" />
                                                        </div>
                                                        <span className={`text-[11px] font-mono uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                            {app.id}
                                                        </span>
                                                    </div>

                                                    <h4 className={`text-base font-bold transition-colors ${
                                                        isDark ? 'text-white group-hover:text-emerald-300' : 'text-slate-900 group-hover:text-emerald-700'
                                                    }`}>
                                                        {app.name}
                                                    </h4>
                                                    <p className={`text-xs font-semibold mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        {app.tagline}
                                                    </p>
                                                    <p className={`text-[11.5px] mt-2 line-clamp-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {app.description}
                                                    </p>
                                                </div>

                                                {/* Card Action Button */}
                                                <div className={`relative z-10 mt-5 pt-3 border-t flex items-center justify-between ${
                                                    isDark ? 'border-white/10' : 'border-slate-200'
                                                }`}>
                                                    <button
                                                        onClick={() => {
                                                            setIsWelcomeOpen(false);
                                                            if (pathname !== app.href) setNavigatingApp(app.id);
                                                            router.push(app.href);
                                                        }}
                                                        className={`flex items-center gap-1.5 text-xs font-bold group-hover:translate-x-1 transition-transform ${
                                                            isDark ? 'text-white' : 'text-slate-900'
                                                        }`}
                                                    >
                                                        <span>Launch Application</span>
                                                        <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Recent Documents Quick Access */}
                            <div>
                                <h3 className={`text-xs uppercase tracking-wider font-bold mb-3 flex items-center gap-2 ${
                                    isDark ? 'text-slate-400' : 'text-slate-600'
                                }`}>
                                    <Clock className="w-3.5 h-3.5 text-sky-500" />
                                    Recent Account Documents
                                </h3>

                                {loadingRecent ? (
                                    <div className="p-6 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                                        <span>Loading your recent files...</span>
                                    </div>
                                ) : recentDocs.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {recentDocs.map(doc => {
                                            const docTarget = doc.doc_type === 'excel'
                                                ? `/documents/excel-editor?id=${doc.id}`
                                                : doc.doc_type === 'presentation'
                                                ? `/documents/slides-editor?id=${doc.id}`
                                                : `/documents/word-editor?id=${doc.id}`;

                                            const typeBadge = doc.doc_type === 'excel'
                                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                                : doc.doc_type === 'presentation'
                                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                                : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';

                                            return (
                                                <button
                                                    key={doc.id}
                                                    onClick={() => {
                                                        setIsWelcomeOpen(false);
                                                        router.push(docTarget);
                                                    }}
                                                    className={`p-3 rounded-xl border transition flex items-center justify-between text-left group ${
                                                        isDark
                                                            ? 'bg-slate-800/70 hover:bg-slate-800 border-slate-700 hover:border-slate-600'
                                                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="min-w-0 pr-2">
                                                        <h5 className={`text-xs font-bold truncate ${
                                                            isDark ? 'text-white group-hover:text-emerald-300' : 'text-slate-900 group-hover:text-emerald-700'
                                                        }`}>
                                                            {doc.title || 'Untitled Document'}
                                                        </h5>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${typeBadge}`}>
                                                                {doc.doc_type}
                                                            </span>
                                                            <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                {new Date(doc.updated_at || doc.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className={`p-6 rounded-2xl border text-center ${
                                        isDark ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                                    }`}>
                                        <p className="text-xs">No documents saved in your account yet.</p>
                                        <p className="text-[11px] opacity-80 mt-1">Launch an app above to create your first document or spreadsheet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Instant Blur Breathing Loader on App Selection */}
            {navigatingApp && (
                <OfficeAppBlurLoader
                    appType={navigatingApp}
                    message={`Opening ${SUITE_APPS.find(a => a.id === navigatingApp)?.name || 'Office Suite Application'}...`}
                    subMessage="Preparing workspace, tools and synchronization..."
                />
            )}
        </>
    );
}
