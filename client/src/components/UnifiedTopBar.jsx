'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    Search, X, Pin, PinOff, Calendar, ChevronDown, ChevronUp,
    FileText, Folder, BookOpen, Users, GraduationCap,
    Sparkles, HelpCircle, Ticket, Wrench, Video, ArrowRight,
    CornerDownLeft, Clock, RotateCcw
} from 'lucide-react';
import {
    FluentWordDocIcon,
    FluentExcelDocIcon,
    FluentPdfDocIcon,
    FluentSlidesDocIcon,
    FluentTerminalIcon,
    FluentLabSuiteIcon
} from '@/components/FluentAppIcons';
import api from '@/lib/api';
import SessionSelector from './SessionSelector';
import { useAuthStore } from '@/lib/store';
import { useEdgeHoverReveal } from '@/hooks/useEdgeHoverReveal';

const CATEGORIES = [
    { key: 'all', label: 'All' },
    { key: 'labs', label: 'Labs' },
    { key: 'assignments', label: 'Assignments' },
    { key: 'classes', label: 'Classes' },
    { key: 'documents', label: 'Documents' },
    { key: 'quizzes', label: 'Quizzes' },
    { key: 'training', label: 'Training' },
    { key: 'users', label: 'Users' },
    { key: 'meetings', label: 'Meetings' },
    { key: 'notes', label: 'Notes' },
    { key: 'tickets', label: 'Tickets' },
    { key: 'plans', label: 'Plans' }
];

function HighlightText({ text, query }) {
    if (!text) return null;
    if (!query || !query.trim()) return <>{text}</>;

    const words = query.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return <>{text}</>;

    const regexPattern = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const parts = String(text).split(new RegExp(`(${regexPattern})`, 'gi'));

    return (
        <>
            {parts.map((part, i) => {
                const isMatch = words.some(w => w.toLowerCase() === part.toLowerCase());
                return isMatch ? (
                    <mark key={i} className="bg-amber-300 dark:bg-amber-400 text-slate-950 font-bold px-0.5 rounded">
                        {part}
                    </mark>
                ) : (
                    part
                );
            })}
        </>
    );
}

export default function UnifiedTopBar({ isLowMemory = false }) {
    const router = useRouter();
    const pathname = usePathname();
    const { selectedSession } = useAuthStore();

    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState({
        meetings: [],
        assignments: [],
        quizzes: [],
        documents: [],
        notes: [],
        users: [],
        classes: [],
        training: [],
        tickets: [],
        labs: [],
        plans: []
    });
    const [recentSearches, setRecentSearches] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const [sessionMenuOpen, setSessionMenuOpen] = useState(false);
    const sessionMenuOpenRef = useRef(false);

    const handleSessionOpenChange = useCallback((open) => {
        sessionMenuOpenRef.current = open;
        setSessionMenuOpen(open);
    }, []);

    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const debounceTimerRef = useRef(null);

    // Auto-hide edge reveal controller
    const topBarReveal = useEdgeHoverReveal({
        autoHideMs: 2500,
        initialPeekMs: 2500,
        storageKey: 'topHoverBarPinned',
        isLocked: sessionMenuOpen || isFocused || query.trim().length > 0,
    });

    // Load recent searches from localStorage
    useEffect(() => {
        try {
            const savedRecent = localStorage.getItem('labrec_recent_searches');
            if (savedRecent) setRecentSearches(JSON.parse(savedRecent));
        } catch {
            // ignore
        }
    }, []);

    // Global keyboard shortcut (⌘K or Ctrl+K) & custom event listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                topBarReveal.openNow();
                setIsFocused(true);
                setTimeout(() => inputRef.current?.focus(), 60);
            } else if (e.key === 'Escape') {
                if (!sessionMenuOpenRef.current && !sessionMenuOpen) {
                    if (query) {
                        setQuery('');
                    } else {
                        setIsFocused(false);
                        if (!topBarReveal.isPinned) {
                            topBarReveal.closeNow();
                        }
                    }
                }
            }
        };

        const handleCustomOpen = (e) => {
            topBarReveal.openNow();
            setIsFocused(true);
            const initial = e?.detail?.query;
            if (typeof initial === 'string' && initial.length > 0) {
                setQuery(initial);
            }
            setTimeout(() => inputRef.current?.focus(), 60);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('open-global-search', handleCustomOpen);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('open-global-search', handleCustomOpen);
        };
    }, [topBarReveal, query, sessionMenuOpen]);

    // Click outside search results flyout to unfocus
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (sessionMenuOpenRef.current || sessionMenuOpen) return;
            if (!e.target || !e.target.isConnected) return;

            if (containerRef.current && containerRef.current.contains(e.target)) {
                return;
            }

            if (e.target && typeof e.target.closest === 'function') {
                if (e.target.closest('[data-popover], [role="menu"], [role="dialog"], [data-dropdown], .session-menu, .notif-menu, .session-selector-container')) {
                    return;
                }
            }

            setIsFocused(false);
        };

        window.addEventListener('pointerdown', handleOutsideClick);
        return () => window.removeEventListener('pointerdown', handleOutsideClick);
    }, [sessionMenuOpen]);

    // Live search debounced fetch
    useEffect(() => {
        if (!query.trim() || query.trim().length < 2) {
            setResults({
                meetings: [],
                assignments: [],
                quizzes: [],
                documents: [],
                notes: [],
                users: [],
                classes: [],
                training: [],
                tickets: [],
                labs: [],
                plans: []
            });
            setLoading(false);
            return;
        }

        setLoading(true);
        clearTimeout(debounceTimerRef.current);

        debounceTimerRef.current = setTimeout(async () => {
            try {
                const categoryParam = activeCategory === 'all' ? '' : `&category=${activeCategory}`;
                const sessionParam = selectedSession?.id ? `&sessionId=${selectedSession.id}` : '';
                const res = await api.get(`/search?q=${encodeURIComponent(query.trim())}${categoryParam}${sessionParam}`);

                if (res.data?.success && res.data?.data) {
                    const payload = res.data.data.results || res.data.data;
                    setResults(payload);
                }
            } catch (err) {
                console.error('[UnifiedTopBar] search failed:', err);
            } finally {
                setLoading(false);
            }
        }, 220);

        return () => clearTimeout(debounceTimerRef.current);
    }, [query, activeCategory, selectedSession]);

    // Flatten results for selected category
    const flattenedResults = useMemo(() => {
        const items = [];

        // Labs
        if (activeCategory === 'all' || activeCategory === 'labs') {
            (results.labs || []).forEach(item => items.push({
                ...item,
                type: 'labs',
                title: item.name || item.labName || 'Lab Room',
                subtitle: item.roomNumber ? `Room ${item.roomNumber} • ${item.capacity || 0} PCs` : 'Lab Facility',
                badge: 'LAB',
                badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                icon: Wrench,
                url: `/admin/labs`
            }));
        }

        // Assignments
        if (activeCategory === 'all' || activeCategory === 'assignments') {
            (results.assignments || []).forEach(item => items.push({
                ...item,
                type: 'assignments',
                title: item.title,
                subtitle: item.class?.name ? `Class: ${item.class.name}` : (item.course || 'Assignment'),
                badge: 'ASSIGNMENT',
                badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
                icon: FileText,
                url: `/assignments/${item.id}`
            }));
        }

        // Classes
        if (activeCategory === 'all' || activeCategory === 'classes') {
            (results.classes || []).forEach(item => items.push({
                ...item,
                type: 'classes',
                title: item.name,
                subtitle: `${item.branch || 'General'} • Sem ${item.semester || 1}`,
                badge: 'CLASS',
                badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
                icon: GraduationCap,
                url: `/classes/${item.id}`
            }));
        }

        // Documents & Office Files (Word, Excel, PDF, Slides, Code)
        if (activeCategory === 'all' || activeCategory === 'documents') {
            (results.documents || []).forEach(item => {
                const ext = (item.fileType || item.fileName?.split('.').pop() || item.name?.split('.').pop() || '').toLowerCase();
                const isCode = item.category === 'code' || ['py', 'sql', 'js', 'ts', 'java', 'c', 'cpp', 'html', 'css'].includes(ext) || item.name?.endsWith('.py') || item.name?.endsWith('.sql');
                const isPdf = ext === 'pdf';
                const isWord = ['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext);
                const isExcel = ['xls', 'xlsx', 'csv', 'ods', 'sheet'].includes(ext);
                const isSlides = ['ppt', 'pptx', 'odp'].includes(ext);

                const title = item.name || item.fileName || 'Document';
                const qs = new URLSearchParams({
                    docId: item.id,
                    id: item.id,
                    ...(item.url ? { fileUrl: item.url } : {}),
                    title
                }).toString();

                let directUrl = `/view-document/${item.id}`;
                let badgeLabel = ext ? ext.toUpperCase() : 'DOC';
                let badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
                let docIcon = Folder;

                if (isCode) {
                    directUrl = `/practice-ide?${qs}`;
                    badgeLabel = ext ? ext.toUpperCase() : 'CODE';
                    badgeColor = 'bg-slate-900 text-emerald-400 dark:bg-black dark:text-emerald-300';
                    docIcon = FluentTerminalIcon;
                } else if (isPdf) {
                    directUrl = `/documents/pdf-studio?${qs}`;
                    badgeLabel = 'PDF';
                    badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
                    docIcon = FluentPdfDocIcon;
                } else if (isWord) {
                    directUrl = `/documents/word-editor?${qs}`;
                    badgeLabel = 'WORD';
                    badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
                    docIcon = FluentWordDocIcon;
                } else if (isExcel) {
                    directUrl = `/documents/excel-editor?${qs}`;
                    badgeLabel = 'EXCEL';
                    badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
                    docIcon = FluentExcelDocIcon;
                } else if (isSlides) {
                    directUrl = `/documents/slides-editor?${qs}`;
                    badgeLabel = 'SLIDES';
                    badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
                    docIcon = FluentSlidesDocIcon;
                }

                items.push({
                    ...item,
                    type: 'documents',
                    title,
                    subtitle: `${badgeLabel} • ${item.folder?.name ? `Folder: ${item.folder.name}` : 'Document Library'}${item.fileSize ? ` • ${(item.fileSize / 1024).toFixed(0)} KB` : ''}`,
                    badge: badgeLabel,
                    badgeColor,
                    icon: docIcon,
                    url: directUrl
                });
            });
        }

        // Quizzes
        if (activeCategory === 'all' || activeCategory === 'quizzes') {
            (results.quizzes || []).forEach(item => items.push({
                ...item,
                type: 'quizzes',
                title: item.title,
                subtitle: `${item.questionsCount || item.questions?.length || 0} Questions`,
                badge: 'QUIZ',
                badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
                icon: Sparkles,
                url: `/quiz`
            }));
        }

        // Training
        if (activeCategory === 'all' || activeCategory === 'training') {
            (results.training || []).forEach(item => items.push({
                ...item,
                type: 'training',
                title: item.title || item.name,
                subtitle: `${item.level || 'Interactive'} Module`,
                badge: 'TRAINING',
                badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
                icon: BookOpen,
                url: `/training`
            }));
        }

        // Users
        if (activeCategory === 'all' || activeCategory === 'users') {
            (results.users || []).forEach(item => items.push({
                ...item,
                type: 'users',
                title: item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim(),
                subtitle: `${(item.role || 'Member').toUpperCase()} • ${item.email || ''}`,
                badge: (item.role || 'USER').toUpperCase(),
                badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
                icon: Users,
                url: `/users`
            }));
        }

        // Meetings
        if (activeCategory === 'all' || activeCategory === 'meetings') {
            (results.meetings || []).forEach(item => items.push({
                ...item,
                type: 'meetings',
                title: item.title,
                subtitle: item.meetingCode ? `Code: ${item.meetingCode}` : 'Collab Session',
                badge: 'MEETING',
                badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
                icon: Video,
                url: item.meetingCode ? `/meeting/${item.meetingCode}` : `/meetings`
            }));
        }

        // Tickets
        if (activeCategory === 'all' || activeCategory === 'tickets') {
            (results.tickets || []).forEach(item => items.push({
                ...item,
                type: 'tickets',
                title: item.subject || item.title || `Ticket #${item.id}`,
                subtitle: `Priority: ${(item.priority || 'NORMAL').toUpperCase()}`,
                badge: (item.status || 'OPEN').toUpperCase(),
                badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
                icon: Ticket,
                url: `/tickets`
            }));
        }

        return items;
    }, [results, activeCategory]);

    const saveRecentSearch = (term) => {
        const clean = term?.trim();
        if (!clean || clean.length < 2) return;
        try {
            const updated = [
                { query: clean, timestamp: Date.now() },
                ...recentSearches.filter(r => r.query.toLowerCase() !== clean.toLowerCase())
            ].slice(0, 8);
            setRecentSearches(updated);
            localStorage.setItem('labrec_recent_searches', JSON.stringify(updated));
        } catch {}
    };

    const clearRecentSearches = (e) => {
        e?.stopPropagation();
        setRecentSearches([]);
        try {
            localStorage.removeItem('labrec_recent_searches');
        } catch {}
    };

    const removeRecentItem = (termToRemove, e) => {
        e?.stopPropagation();
        try {
            const updated = recentSearches.filter(r => r.query.toLowerCase() !== termToRemove.toLowerCase());
            setRecentSearches(updated);
            localStorage.setItem('labrec_recent_searches', JSON.stringify(updated));
        } catch {}
    };

    const handleSelectResult = (item) => {
        saveRecentSearch(query.trim() || item.title);

        setIsFocused(false);
        setQuery('');
        if (!topBarReveal.isPinned) {
            topBarReveal.closeNow();
        }
        router.push(item.url);
    };

    const surfaceClass = isLowMemory
        ? 'bg-white/95 dark:bg-slate-900/95'
        : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md';

    const showFlyout = isFocused || query.trim().length > 0;

    return (
        <>
            {/* Top-Edge Mouse & Pen Hover Hot-Zone (0ms reveal for Minimal Search Bar) */}
            <div
                {...topBarReveal.triggerProps}
                className="fixed top-0 left-20 right-20 h-3.5 z-[78] flex justify-center"
                aria-hidden="true"
            >
                {!topBarReveal.isVisible && (
                    <span className="mt-1 h-1 w-20 rounded-full bg-slate-400/40 dark:bg-slate-500/40 transition-opacity" />
                )}
            </div>

            {/* Touch Pull / Toggle Handle (Visible when bar auto-hides) */}
            {!topBarReveal.isVisible && (
                <button
                    type="button"
                    onClick={topBarReveal.toggleOpen}
                    className={`fixed top-2.5 left-1/2 -translate-x-1/2 z-[78] px-3.5 h-9 rounded-full ${surfaceClass} border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 transition-all`}
                    aria-label="Show search and session bar"
                    title="Open Search & Session Bar"
                >
                    <Search className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Search</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                </button>
            )}

            {/* Centered Minimal Search Bar with Session Selector and Pin Button */}
            <div
                ref={containerRef}
                {...topBarReveal.containerProps}
                style={{ willChange: topBarReveal.isVisible ? 'transform, opacity' : 'auto' }}
                className={`fixed top-2.5 left-1/2 -translate-x-1/2 z-[80] w-[min(580px,calc(100vw-140px))] transition-opacity duration-150 motion-safe:transition-[transform,opacity] motion-safe:duration-150 motion-safe:ease-out ${
                    topBarReveal.isVisible
                        ? 'translate-y-0 opacity-100 pointer-events-auto'
                        : '-translate-y-[140%] opacity-0 pointer-events-none'
                }`}
            >
                {/* Minimal Search Capsule Bar (Search Input + Academic Session Selector + Right-End Icon Pin) */}
                <header
                    role="banner"
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`w-full rounded-full border border-slate-200/90 dark:border-slate-700/80 shadow-2xl px-2.5 py-1.5 flex items-center gap-2 ${surfaceClass}`}
                >
                    {/* Search Input Box */}
                    <div className="flex-1 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 min-w-0">
                        <Search className="w-4 h-4 text-indigo-500 shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && query.trim().length >= 2) {
                                    saveRecentSearch(query.trim());
                                }
                            }}
                            placeholder="Search labs, docs, assignments, users..."
                            aria-label="Global search with category filters"
                            className="w-full bg-transparent border-0 outline-none text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 min-w-0"
                        />
                        {query && (
                            <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={() => {
                                    setQuery('');
                                    inputRef.current?.focus();
                                }}
                                className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-mono font-semibold text-slate-400 shrink-0">
                            ⌘K
                        </kbd>
                    </div>

                    {/* Academic Session Selector */}
                    <div className="shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                        <SessionSelector variant="pill" onOpenChange={handleSessionOpenChange} />
                    </div>

                    {/* Small Icon-Only Pin at Right End of Minimal Search Bar */}
                    <button
                        type="button"
                        onClick={topBarReveal.togglePinned}
                        aria-label={topBarReveal.isPinned ? 'Unpin top bar' : 'Pin top bar open'}
                        aria-pressed={topBarReveal.isPinned}
                        title={topBarReveal.isPinned ? 'Unpin Top Bar (Auto-Hide)' : 'Pin Top Bar Open'}
                        className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-colors active:scale-95 cursor-pointer ${
                            topBarReveal.isPinned
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                    >
                        {topBarReveal.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                </header>

                {/* Attached Categories & Search Results Panel (Directly underneath the minimal search bar) */}
                {showFlyout && (
                    <div
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`mt-2 rounded-3xl ${surfaceClass} border border-slate-200/90 dark:border-slate-700/90 shadow-2xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150`}
                    >
                        {/* Category Filter Pills (Older search bar features directly integrated) */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none px-1">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.key}
                                    type="button"
                                    onClick={() => setActiveCategory(cat.key)}
                                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                                        activeCategory === cat.key
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* LIVE SEARCH RESULTS DROPDOWN */}
                        {query.trim().length >= 2 ? (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 max-h-[380px] overflow-y-auto space-y-1">
                                {loading ? (
                                    <div className="p-6 text-center text-xs text-slate-400">
                                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        <span>Searching across institutional records...</span>
                                    </div>
                                ) : flattenedResults.length === 0 ? (
                                    <div className="p-6 text-center text-xs text-slate-400">
                                        <p className="font-semibold text-slate-600 dark:text-slate-300">No matching records found</p>
                                        <p className="text-[11px] mt-1">Try switching to the "All" category filter or using another search term.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                            <span>Results ({flattenedResults.length})</span>
                                            <span className="font-mono lowercase text-[10px]">tab: {activeCategory}</span>
                                        </div>
                                        {flattenedResults.map((item, idx) => {
                                            const Icon = item.icon;
                                            return (
                                                <button
                                                    key={`${item.type}-${item.id}-${idx}`}
                                                    type="button"
                                                    onClick={() => handleSelectResult(item)}
                                                    className="w-full text-left p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition flex items-center gap-3 group cursor-pointer"
                                                >
                                                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-indigo-500">
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 transition">
                                                                <HighlightText text={item.title} query={query} />
                                                            </span>
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${item.badgeColor}`}>
                                                                {item.badge}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                            {item.subtitle}
                                                        </p>
                                                    </div>
                                                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-indigo-500 transition-all shrink-0" />
                                                </button>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                {/* Recent Searches Section (Persisted in LocalStorage) */}
                                {recentSearches.length > 0 ? (
                                    <div className="space-y-1.5 px-1">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                                Recent Searches
                                            </span>
                                            <button
                                                type="button"
                                                onClick={clearRecentSearches}
                                                className="text-[11px] lowercase font-medium text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                            >
                                                Clear history
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {recentSearches.map((item, idx) => (
                                                <div
                                                    key={`${item.query}-${idx}`}
                                                    className="group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-200 hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                                                    onClick={() => {
                                                        setQuery(item.query);
                                                        inputRef.current?.focus();
                                                    }}
                                                >
                                                    <Clock className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                    <span className="font-medium">{item.query}</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => removeRecentItem(item.query, e)}
                                                        className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                                                        aria-label={`Remove ${item.query} from recent searches`}
                                                    >
                                                        <X className="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {/* Quick Document & Office Format Shortcuts */}
                                <div className="space-y-1.5 px-1">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-amber-500" />
                                        <span>Search by Format & Studio</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveCategory('documents');
                                                setQuery('docx');
                                                inputRef.current?.focus();
                                            }}
                                            className="flex items-center gap-2 p-2 rounded-xl bg-blue-50/70 hover:bg-blue-100/80 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 border border-blue-200/70 dark:border-blue-800/40 transition text-left cursor-pointer group"
                                        >
                                            <FluentWordDocIcon className="w-4 h-4 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-blue-900 dark:text-blue-200 group-hover:text-blue-700 transition">Word Docs</p>
                                                <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">.docx, .doc</p>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveCategory('documents');
                                                setQuery('xlsx');
                                                inputRef.current?.focus();
                                            }}
                                            className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 border border-emerald-200/70 dark:border-emerald-800/40 transition text-left cursor-pointer group"
                                        >
                                            <FluentExcelDocIcon className="w-4 h-4 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 group-hover:text-emerald-700 transition">Excel Sheets</p>
                                                <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">.xlsx, .csv</p>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveCategory('documents');
                                                setQuery('pdf');
                                                inputRef.current?.focus();
                                            }}
                                            className="flex items-center gap-2 p-2 rounded-xl bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 border border-rose-200/70 dark:border-rose-800/40 transition text-left cursor-pointer group"
                                        >
                                            <FluentPdfDocIcon className="w-4 h-4 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-rose-900 dark:text-rose-200 group-hover:text-rose-700 transition">PDF Files</p>
                                                <p className="text-[10px] text-rose-600/70 dark:text-rose-400/70">Studio & Annotate</p>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveCategory('documents');
                                                setQuery('code');
                                                inputRef.current?.focus();
                                            }}
                                            className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/5 hover:bg-slate-900/10 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-300/70 dark:border-slate-700/70 transition text-left cursor-pointer group"
                                        >
                                            <FluentTerminalIcon className="w-4 h-4 shrink-0 text-emerald-500" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition">Code Files</p>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400">Python, SQL, IDE</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Footer Tip & Dismiss */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 px-1">
                                    <span>Type to search across labs, assignments, office docs, and people</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsFocused(false)}
                                        className="text-indigo-500 hover:underline cursor-pointer font-medium"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
