'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    Search, X, Pin, PinOff, Calendar, Bell, ChevronDown,
    FileText, Folder, BookOpen, Users, GraduationCap,
    Sparkles, HelpCircle, Ticket, Wrench, Video, ArrowRight,
    CornerDownLeft, Clock, RotateCcw
} from 'lucide-react';
import api from '@/lib/api';
import SessionSelector from './SessionSelector';
import { useAuthStore } from '@/lib/store';

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

    const [isExpanded, setIsExpanded] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [query, setQuery] = useState('');
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
    const autohideTimerRef = useRef(null);

    // Load recent searches & pin preference from localStorage
    useEffect(() => {
        try {
            const savedRecent = localStorage.getItem('labrec_recent_searches');
            if (savedRecent) setRecentSearches(JSON.parse(savedRecent));

            const savedPinned = localStorage.getItem('topHoverBarPinned');
            if (savedPinned !== null) {
                const parsed = JSON.parse(savedPinned);
                if (typeof parsed === 'boolean') {
                    setIsPinned(parsed);
                    if (parsed) setIsExpanded(true);
                }
            }
        } catch {
            // ignore
        }
    }, []);

    // Global keyboard shortcut (⌘K or Ctrl+K) & custom event listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsExpanded(prev => {
                    const next = !prev;
                    if (next) {
                        setTimeout(() => inputRef.current?.focus(), 60);
                    }
                    return next;
                });
            } else if (e.key === 'Escape') {
                if (!sessionMenuOpenRef.current && !sessionMenuOpen) {
                    if (query) {
                        setQuery('');
                    } else if (!isPinned) {
                        setIsExpanded(false);
                    }
                }
            }
        };

        const handleCustomOpen = (e) => {
            setIsExpanded(true);
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
    }, [isPinned, query, sessionMenuOpen]);

    // Click outside to collapse (Guarded against Session & attached menus)
    useEffect(() => {
        if (!isExpanded || isPinned) return;

        const handleOutsideClick = (e) => {
            // Never dismiss if session menu is currently open
            if (sessionMenuOpenRef.current || sessionMenuOpen) return;

            // If target element was unmounted during click (e.g. clicking menu item that closes dropdown), do not collapse
            if (!e.target || !e.target.isConnected) return;

            // Check if click was inside container or any attached menu
            if (containerRef.current && containerRef.current.contains(e.target)) {
                return;
            }

            if (e.target && typeof e.target.closest === 'function') {
                if (e.target.closest('[data-popover], [role="menu"], [role="dialog"], [data-dropdown], .session-menu, .notif-menu, .session-selector-container')) {
                    return;
                }
            }

            setIsExpanded(false);
        };

        // Use bubbling listener so inside handlers run first
        window.addEventListener('pointerdown', handleOutsideClick);
        return () => window.removeEventListener('pointerdown', handleOutsideClick);
    }, [isExpanded, isPinned, sessionMenuOpen]);

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
                const res = await api.get('/search', { params: { q: query.trim() } });
                if (res.data?.data?.results) {
                    setResults(res.data.data.results);
                }
            } catch (err) {
                console.error('Unified top bar search error:', err);
            } finally {
                setLoading(false);
            }
        }, 220);

        return () => clearTimeout(debounceTimerRef.current);
    }, [query]);

    // Format results filtered by category
    const flattenedResults = useMemo(() => {
        const items = [];

        if (activeCategory === 'all' || activeCategory === 'labs') {
            results.labs?.forEach(item => items.push({
                type: 'lab',
                categoryLabel: 'Lab',
                id: item.id,
                title: item.name || item.nameHindi,
                subtitle: `Room: ${item.roomNumber || 'N/A'} • Capacity: ${item.capacity || 30}`,
                badge: 'LAB',
                badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                icon: Wrench,
                url: `/admin/labs`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'assignments') {
            results.assignments?.forEach(item => items.push({
                type: 'assignment',
                categoryLabel: 'Assignment',
                id: item.id,
                title: item.title || item.titleHindi,
                subtitle: item.description || (item.subject?.name ? `Subject: ${item.subject.name}` : ''),
                badge: (item.assignmentType || 'Assignment').toUpperCase(),
                badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
                icon: FileText,
                url: `/assignments/${item.id}`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'classes') {
            results.classes?.forEach(item => items.push({
                type: 'class',
                categoryLabel: 'Class',
                id: item.id,
                title: item.name || item.nameHindi,
                subtitle: `Grade: ${item.gradeLevel || 'N/A'} ${item.section ? `• Sec ${item.section}` : ''}`,
                badge: 'CLASS',
                badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
                icon: GraduationCap,
                url: `/classes/${item.id}`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'documents') {
            results.documents?.forEach(item => items.push({
                type: 'document',
                categoryLabel: 'Document',
                id: item.id,
                title: item.name || item.fileName || item.title || item.originalName,
                subtitle: item.description || 'Document Repository',
                badge: (item.fileType || 'DOC').toUpperCase(),
                badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                icon: Folder,
                url: `/documents?search=${encodeURIComponent(item.name || item.fileName || item.title || '')}`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'quizzes') {
            results.quizzes?.forEach(item => items.push({
                type: 'quiz',
                categoryLabel: 'Quiz',
                id: item.id,
                title: item.title,
                subtitle: `Code: ${item.code} • ${item.totalQuestions || 0} Questions`,
                badge: (item.difficulty || 'QUIZ').toUpperCase(),
                badgeColor: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
                icon: HelpCircle,
                url: `/quiz`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'training') {
            results.training?.forEach(item => items.push({
                type: 'training',
                categoryLabel: 'Training',
                id: item.id,
                title: item.title || item.titleHindi,
                subtitle: item.description || `Language: ${item.language || 'Python'}`,
                badge: `${item.totalUnits || 0} UNITS`,
                badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
                icon: Sparkles,
                url: `/training/${item.id}`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'users') {
            results.users?.forEach(item => items.push({
                type: 'user',
                categoryLabel: 'User',
                id: item.id,
                title: `${item.firstName} ${item.lastName || ''}`.trim(),
                subtitle: item.email || item.studentId || item.admissionNumber,
                badge: (item.role || 'USER').toUpperCase(),
                badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
                icon: Users,
                url: `/users?search=${encodeURIComponent(item.email || item.firstName)}`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'meetings') {
            results.meetings?.forEach(item => items.push({
                type: 'meeting',
                categoryLabel: 'Meeting',
                id: item.id,
                title: item.title || item.roomCode,
                subtitle: `Room: ${item.roomCode || item.code || ''}`,
                badge: 'VIVA',
                badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
                icon: Video,
                url: `/meetings`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'notes') {
            results.notes?.forEach(item => items.push({
                type: 'note',
                categoryLabel: 'Note',
                id: item.id,
                title: item.title,
                subtitle: item.content ? item.content.replace(/<[^>]*>?/gm, '').slice(0, 80) : '',
                badge: 'NOTE',
                badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                icon: BookOpen,
                url: `/admin/notes`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'tickets') {
            results.tickets?.forEach(item => items.push({
                type: 'ticket',
                categoryLabel: 'Ticket',
                id: item.id,
                title: item.title,
                subtitle: item.ticketNumber ? `#${item.ticketNumber}` : item.description,
                badge: (item.status || 'OPEN').toUpperCase(),
                badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
                icon: Ticket,
                url: `/tickets`
            }));
        }

        return items;
    }, [results, activeCategory]);

    const handleSelectResult = (item) => {
        // Save to recent searches
        try {
            const updatedRecent = [
                { query: item.title, timestamp: Date.now() },
                ...recentSearches.filter(r => r.query !== item.title)
            ].slice(0, 6);
            setRecentSearches(updatedRecent);
            localStorage.setItem('labrec_recent_searches', JSON.stringify(updatedRecent));
        } catch {}

        if (!isPinned) {
            setIsExpanded(false);
        }
        setQuery('');
        router.push(item.url);
    };

    const togglePin = () => {
        setIsPinned(prev => {
            const next = !prev;
            try {
                localStorage.setItem('topHoverBarPinned', JSON.stringify(next));
            } catch {}
            if (next) setIsExpanded(true);
            return next;
        });
    };

    const surfaceClass = isLowMemory
        ? 'bg-white/95 dark:bg-slate-900/95'
        : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md';

    return (
        <div ref={containerRef} onPointerDown={(e) => e.stopPropagation()} className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[80] select-none transition-all">
            {/* COLLAPSED STATE: Search Icon Button (Single Element) */}
            {!isExpanded && (
                <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                        setIsExpanded(true);
                        setTimeout(() => inputRef.current?.focus(), 60);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full ${surfaceClass} border border-slate-200/90 dark:border-slate-700/80 shadow-lg text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 transition-all cursor-pointer`}
                    title="Open Search with Session & Category Filters (⌘K)"
                    aria-label="Open Search with Session & Category Filters"
                >
                    <Search className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-semibold">Search</span>
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-400">
                        ⌘K
                    </kbd>
                </button>
            )}

            {/* EXPANDED SEARCH BAR WITH INTEGRATED SESSION & FILTER PILLS */}
            {isExpanded && (
                <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`w-[min(680px,calc(100vw-32px))] rounded-3xl ${surfaceClass} border border-slate-200/90 dark:border-slate-700/90 shadow-2xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150`}
                >
                    {/* Top Row: Search Input + Academic Session Selector + Pin + Close */}
                    <div className="flex items-center gap-2">
                        {/* Search Input Box */}
                        <div className="flex-1 flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 min-w-0">
                            <Search className="w-4 h-4 text-indigo-500 shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search labs, assignments, classes, documents, users..."
                                className="w-full bg-transparent border-0 outline-none text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 min-w-0"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Academic Session Selector */}
                        <div className="shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                            <SessionSelector variant="pill" onOpenChange={handleSessionOpenChange} />
                        </div>

                        {/* Pin Button */}
                        <button
                            type="button"
                            onClick={togglePin}
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition cursor-pointer ${
                                isPinned
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-600'
                            }`}
                            title={isPinned ? 'Unpin top bar' : 'Pin top bar open'}
                        >
                            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </button>

                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsExpanded(false);
                                setQuery('');
                            }}
                            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 flex items-center justify-center shrink-0 transition cursor-pointer"
                            title="Close Search Bar (Esc)"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Filter Options Row (Feature from older search bar) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none px-1">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.key}
                                type="button"
                                onClick={() => setActiveCategory(cat.key)}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                                    activeCategory === cat.key
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* LIVE SEARCH RESULTS DROPDOWN (Directly attached beneath the bar) */}
                    {query.trim().length >= 2 && (
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
                                                className="w-full text-left p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition flex items-center gap-3 group"
                                            >
                                                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-indigo-500">
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                            <HighlightText text={item.title} query={query} />
                                                        </span>
                                                        <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase font-mono ${item.badgeColor}`}>
                                                            {item.badge}
                                                        </span>
                                                    </div>
                                                    {item.subtitle && (
                                                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                                            <HighlightText text={item.subtitle} query={query} />
                                                        </p>
                                                    )}
                                                </div>
                                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition shrink-0" />
                                            </button>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    )}

                    {/* RECENT SEARCHES (When query is empty) */}
                    {query.trim().length < 2 && recentSearches.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 px-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                <span>Recent Searches</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRecentSearches([]);
                                        localStorage.removeItem('labrec_recent_searches');
                                    }}
                                    className="text-slate-400 hover:text-rose-500"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {recentSearches.map((r, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setQuery(r.query)}
                                        className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5 transition"
                                    >
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span>{r.query}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
