'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
    Search, X, Video, FileText, Folder, BookOpen, Users,
    GraduationCap, Sparkles, Clock, ArrowRight, CornerDownLeft,
    Ticket, Wrench, Calendar, ChevronRight, ExternalLink
} from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';

const CATEGORIES = [
    { key: 'all', label: 'All' },
    { key: 'meetings', label: 'Meetings' },
    { key: 'assignments', label: 'Assignments' },
    { key: 'documents', label: 'Documents' },
    { key: 'notes', label: 'Notes' },
    { key: 'users', label: 'Users' },
    { key: 'classes', label: 'Classes' },
    { key: 'training', label: 'Training' },
    { key: 'tickets', label: 'Tickets' },
    { key: 'labs', label: 'Labs' },
    { key: 'plans', label: 'Lecture Plans' }
];

export default function GlobalSearch() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);
    const [results, setResults] = useState({
        meetings: [],
        assignments: [],
        documents: [],
        notes: [],
        users: [],
        classes: [],
        training: [],
        tickets: [],
        labs: [],
        plans: []
    });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentSearches, setRecentSearches] = useState([]);
    
    const inputRef = useRef(null);
    const debounceTimerRef = useRef(null);

    // Load recent searches from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('labrec_recent_searches');
            if (saved) setRecentSearches(JSON.parse(saved));
        } catch {}
    }, []);

    // Global keyboard shortcut (⌘K or Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            } else if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 60);
        } else {
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Debounced search query
    useEffect(() => {
        if (!query.trim() || query.trim().length < 2) {
            setResults({
                meetings: [],
                assignments: [],
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
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        debounceTimerRef.current = setTimeout(async () => {
            try {
                const res = await api.get('/search', {
                    params: { q: query.trim() }
                });
                if (res.data?.data?.results) {
                    setResults(res.data.data.results);
                }
            } catch (err) {
                console.error('Global search error:', err);
            } finally {
                setLoading(false);
            }
        }, 200);

        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [query]);

    // Compile flat array of current category items for keyboard navigation
    const getFlattenedResults = () => {
        const items = [];

        if (activeCategory === 'all' || activeCategory === 'meetings') {
            results.meetings?.forEach(item => items.push({
                type: 'meeting',
                categoryLabel: 'Meeting',
                id: item.id,
                title: item.title,
                subtitle: item.description || `Host: ${item.host?.firstName || 'Staff'}`,
                badge: item.status === 'live' ? 'Live Now' : (item.type || 'Meeting'),
                badgeColor: item.status === 'live' ? 'bg-emerald-500 text-white animate-pulse' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300',
                icon: Video,
                url: `/meeting/${item.id}`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'assignments') {
            results.assignments?.forEach(item => items.push({
                type: 'assignment',
                categoryLabel: 'Assignment',
                id: item.id,
                title: item.title || item.titleHindi,
                subtitle: item.description || (item.subject?.name ? `Subject: ${item.subject.name}` : ''),
                badge: item.assignmentType || 'Assignment',
                badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
                icon: FileText,
                url: `/assignments/${item.id}`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'documents') {
            results.documents?.forEach(item => items.push({
                type: 'document',
                categoryLabel: 'Document',
                id: item.id,
                title: item.name || item.fileName || item.title || item.originalName,
                subtitle: item.description || (item.folder?.name ? `Folder: ${item.folder.name}` : (item.category ? `Category: ${item.category}` : 'Document Repository')),
                badge: (item.fileType || item.category || 'DOC').toUpperCase(),
                badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
                icon: Folder,
                url: `/documents?search=${encodeURIComponent(item.name || item.fileName || item.title || '')}`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'notes') {
            results.notes?.forEach(item => items.push({
                type: 'note',
                categoryLabel: 'Admin Note',
                id: item.id,
                title: item.title,
                subtitle: item.content ? item.content.replace(/<[^>]*>?/gm, '').slice(0, 100) : '',
                badge: item.category || 'Note',
                badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
                icon: BookOpen,
                url: `/admin/notes`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'users') {
            results.users?.forEach(item => items.push({
                type: 'user',
                categoryLabel: 'User',
                id: item.id,
                title: `${item.firstName} ${item.lastName || ''}`.trim(),
                subtitle: item.email || item.studentId || item.admissionNumber,
                badge: (item.role || 'user').toUpperCase(),
                badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
                icon: Users,
                url: `/users?search=${encodeURIComponent(item.email || item.firstName)}`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'classes') {
            results.classes?.forEach(item => items.push({
                type: 'class',
                categoryLabel: 'Class',
                id: item.id,
                title: item.name || item.nameHindi,
                subtitle: `Grade: ${item.gradeLevel || 'N/A'} ${item.section ? `• Sec ${item.section}` : ''} ${item.stream ? `• ${item.stream}` : ''}`,
                badge: 'Class',
                badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300',
                icon: GraduationCap,
                url: `/classes/${item.id}`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'training') {
            results.training?.forEach(item => items.push({
                type: 'training',
                categoryLabel: 'Training',
                id: item.id,
                title: item.title || item.titleHindi,
                subtitle: item.description || `Language: ${item.language || 'Python'}`,
                badge: `${item.totalUnits || 0} Units`,
                badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
                icon: Sparkles,
                url: `/training/${item.id}`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'tickets') {
            results.tickets?.forEach(item => items.push({
                type: 'ticket',
                categoryLabel: 'Ticket',
                id: item.id,
                title: item.title,
                subtitle: item.ticketNumber ? `#${item.ticketNumber} • ${item.description || ''}` : item.description,
                badge: item.status || 'open',
                badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300',
                icon: Ticket,
                url: `/tickets`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'labs') {
            results.labs?.forEach(item => items.push({
                type: 'lab',
                categoryLabel: 'Lab',
                id: item.id,
                title: item.name || item.nameHindi,
                subtitle: `Room: ${item.roomNumber || 'N/A'} • Capacity: ${item.capacity || 30}`,
                badge: item.status || 'Active',
                badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300',
                icon: Wrench,
                url: `/admin/labs`
            }));
        }

        if (activeCategory === 'all' || activeCategory === 'plans') {
            results.plans?.forEach(item => items.push({
                type: 'plan',
                categoryLabel: 'Lecture Plan',
                id: item.id,
                title: item.title || item.titleHindi,
                subtitle: `${item.class?.name || 'Class'} • ${item.subject?.name || 'Subject'}`,
                badge: item.lectureType || 'Lecture',
                badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
                icon: Calendar,
                url: `/teaching/plans`
            }));
        }

        return items;
    };

    const flattenedItems = getFlattenedResults();

    const handleSelectItem = (item) => {
        try {
            const nextRecent = [
                { query: item.title, url: item.url, type: item.categoryLabel },
                ...recentSearches.filter(r => r.query !== item.title)
            ].slice(0, 6);
            setRecentSearches(nextRecent);
            localStorage.setItem('labrec_recent_searches', JSON.stringify(nextRecent));
        } catch {}

        setIsOpen(false);
        router.push(item.url);
    };

    // Keyboard navigation inside list
    const handleKeyDown = (e) => {
        if (flattenedItems.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % flattenedItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + flattenedItems.length) % flattenedItems.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = flattenedItems[selectedIndex];
            if (selected) {
                handleSelectItem(selected);
            }
        }
    };

    // The top search bar has been removed as requested; only the modal invoked by Cmd+K / Ctrl+K renders.
    if (!isOpen || !mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-10 sm:pt-16 px-3 sm:px-4 animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 max-w-2xl w-full overflow-hidden flex flex-col max-h-[82vh] animate-in zoom-in-95 duration-150 ring-1 ring-black/5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Input Bar with Rounded Border */}
                <div className="p-4 pb-3">
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-inner focus-within:ring-2 focus-within:ring-primary-500/40 focus-within:border-primary-500 transition-all">
                        <Search className={`w-5 h-5 flex-shrink-0 ${loading ? 'text-primary-500 animate-spin' : 'text-slate-400'}`} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelectedIndex(0);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Search meetings, assignments, documents, notes, users..."
                            className="flex-1 bg-transparent border-0 outline-none text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-0"
                        />
                        {query && (
                            <button
                                onClick={() => {
                                    setQuery('');
                                    setSelectedIndex(0);
                                    inputRef.current?.focus();
                                }}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        <kbd
                            onClick={() => setIsOpen(false)}
                            className="cursor-pointer text-[10px] font-mono font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded-lg shadow-xs"
                        >
                            ESC
                        </kbd>
                    </div>
                </div>

                {/* Category Filter Tabs with Rounded Pills */}
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.key}
                            type="button"
                            onClick={() => {
                                setActiveCategory(cat.key);
                                setSelectedIndex(0);
                            }}
                            className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-all ${
                                activeCategory === cat.key
                                    ? 'bg-primary-600 text-white shadow-sm ring-2 ring-primary-500/30'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Search Results List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                    {loading && query.length >= 2 && flattenedItems.length === 0 && (
                        <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            <span>Searching across all modules...</span>
                        </div>
                    )}

                    {!loading && query.length >= 2 && flattenedItems.length === 0 && (
                        <div className="py-12 text-center text-slate-400 text-sm">
                            <p className="font-semibold text-slate-700 dark:text-slate-300">No results found for &ldquo;{query}&rdquo;</p>
                            <p className="text-xs text-slate-400 mt-1">Try searching by title, file name, keyword, or author name.</p>
                        </div>
                    )}

                    {/* Recent Searches (when query is empty) */}
                    {!query && recentSearches.length > 0 && (
                        <div className="p-2">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                                <span>Recent Searches</span>
                                <button
                                    onClick={() => {
                                        setRecentSearches([]);
                                        localStorage.removeItem('labrec_recent_searches');
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-red-500 normal-case"
                                >
                                    Clear all
                                </button>
                            </div>
                            <div className="space-y-1">
                                {recentSearches.map((rec, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            setIsOpen(false);
                                            router.push(rec.url);
                                        }}
                                        className="flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100/90 dark:hover:bg-slate-800/90 cursor-pointer group transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                            <span className="font-medium">{rec.query}</span>
                                        </div>
                                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                            {rec.type}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Live Result Rows with Rounded Borders */}
                    {flattenedItems.map((item, idx) => {
                        const ItemIcon = item.icon || FileText;
                        const isSelected = idx === selectedIndex;

                        return (
                            <div
                                key={`${item.type}-${item.id}-${idx}`}
                                onClick={() => handleSelectItem(item)}
                                onMouseEnter={() => setSelectedIndex(idx)}
                                className={`px-3.5 py-3 rounded-2xl cursor-pointer flex items-center justify-between gap-3 transition-all border ${
                                    isSelected
                                        ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-900 dark:text-primary-100 border-primary-300 dark:border-primary-700/60 shadow-xs'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 border-transparent'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                                        isSelected ? 'bg-primary-500 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}>
                                        <ItemIcon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs sm:text-sm font-bold truncate">
                                                {item.title}
                                            </span>
                                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${item.badgeColor}`}>
                                                {item.badge}
                                            </span>
                                        </div>
                                        {item.subtitle && (
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                {item.subtitle}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 flex-shrink-0 text-slate-400 group-hover:text-primary-500">
                                    <span className="hidden sm:inline text-[10px] font-semibold opacity-70">
                                        Jump to {item.categoryLabel}
                                    </span>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Help */}
                <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px]">↑</kbd>
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px]">↓</kbd>
                            to navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px]">↵</kbd>
                            to select
                        </span>
                    </div>
                    <span className="text-slate-400 font-medium">
                        {flattenedItems.length} results found
                    </span>
                </div>
            </div>
        </div>,
        document.body
    );
}
