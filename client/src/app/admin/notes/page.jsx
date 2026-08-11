'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, FileText, Plus, X, Trash2, Edit3, Clock, User,
    Search, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Eye, Table, Link2, Image as ImageIcon, Save, CheckCircle2,
    RotateCcw, Sparkles, Copy, ExternalLink, Calendar, Frame, Highlighter
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import DOMPurify from 'dompurify';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

// All standard editor font sizes
const FONT_SIZES = [
    '8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px',
    '20px', '22px', '24px', '28px', '32px', '36px', '48px', '72px'
];

// Rich font families
const FONT_FAMILIES = [
    'arial', 'trebuchet-ms', 'inter', 'roboto', 'times-new-roman',
    'georgia', 'garamond', 'courier-new', 'verdana', 'tahoma', 'impact', 'comic-sans'
];

// Rich color palette
const COLOR_PALETTE = [
    '#000000', '#1e293b', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#ffffff',
    '#dc2626', '#ef4444', '#f87171', '#ea580c', '#f97316', '#fb923c', '#d97706',
    '#f59e0b', '#fbbf24', '#ca8a04', '#eab308', '#65a30d', '#84cc16', '#16a34a',
    '#22c55e', '#4ade80', '#059669', '#10b981', '#34d399', '#0d9488', '#14b8a6',
    '#0891b2', '#06b6d4', '#0284c7', '#0ea5e9', '#2563eb', '#3b82f6', '#4f46e5',
    '#6366f1', '#818cf8', '#7c3aed', '#8b5cf6', '#9333ea', '#a855f7', '#c026d3',
    '#d946ef', '#db2777', '#ec4899', '#e11d48', '#f43f5e'
];

// Reusable text highlighter for search matches
function HighlightText({ text, query, className = '' }) {
    if (!text) return null;
    if (!query || !query.trim()) return <span className={className}>{text}</span>;

    const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = String(text).split(regex);

    return (
        <span className={className}>
            {parts.map((part, index) =>
                regex.test(part) ? (
                    <mark
                        key={index}
                        className="bg-yellow-300 text-slate-900 font-bold px-1 py-0.5 rounded-sm shadow-xs border-b-2 border-yellow-500"
                    >
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </span>
    );
}

export default function AdminNotesPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const quillRef = useRef(null);
    const autoSaveTimerRef = useRef(null);

    // Main notes state
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);

    // View & Modal states
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [showModal, setShowModal] = useState(false);
    const [viewingNote, setViewingNote] = useState(null);

    // Table Insertion Modal states
    const [showTableModal, setShowTableModal] = useState(false);
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);
    const [tableHasHeader, setTableHasHeader] = useState(true);
    const [tableBorderStyle, setTableBorderStyle] = useState('table-bordered');

    // Image Frame Insertion Modal states
    const [showImageFrameModal, setShowImageFrameModal] = useState(false);
    const [imageFrameStyle, setImageFrameStyle] = useState('img-frame-shadow');
    const [imageUrlInput, setImageUrlInput] = useState('');

    // Form state
    const [formData, setFormData] = useState({ title: '', content: '' });
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Auto-save state
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'unsaved'
    const [lastSavedAt, setLastSavedAt] = useState(null);

    // Filter, Search, Sort & Pagination state
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('updatedAt'); // 'title', 'createdAt', 'updatedAt', 'author'
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpPageInput, setJumpPageInput] = useState('');

    // Register Quill size and font whitelists on client side
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const Quill = require('react-quill').Quill;
                if (Quill) {
                    const Size = Quill.import('attributors/style/size');
                    Size.whitelist = FONT_SIZES;
                    Quill.register(Size, true);

                    const Font = Quill.import('attributors/style/font');
                    Font.whitelist = FONT_FAMILIES;
                    Quill.register(Font, true);
                }
            } catch (err) {
                console.error('Quill size/font whitelist registration failed:', err);
            }
        }
    }, []);

    // Load user preferences from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedView = localStorage.getItem('notes_view_mode');
            if (savedView === 'grid' || savedView === 'list') {
                setViewMode(savedView);
            }
            const savedAutoSave = localStorage.getItem('notes_autosave_enabled');
            if (savedAutoSave !== null) {
                setAutoSaveEnabled(savedAutoSave === 'true');
            }
        }
    }, []);

    // Keyboard shortcut for Escape key to close modals
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (showImageFrameModal) setShowImageFrameModal(false);
                else if (showTableModal) setShowTableModal(false);
                else if (viewingNote) setViewingNote(null);
                else if (showModal) setShowModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showImageFrameModal, showTableModal, viewingNote, showModal]);

    // Auth check & load notes
    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        if (user?.role !== 'admin' && user?.role !== 'principal') { router.push('/dashboard'); return; }
        loadNotes();
    }, [isAuthenticated, _hasHydrated]);

    const loadNotes = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin-notes');
            setNotes(res.data.data || []);
        } catch (error) {
            console.error('Failed to load notes:', error);
            toast.error('Failed to load notes');
        } finally {
            setLoading(false);
        }
    };

    // Toggle View Mode & persist
    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        if (typeof window !== 'undefined') {
            localStorage.setItem('notes_view_mode', mode);
        }
    };

    // Toggle Auto-save & persist
    const handleAutoSaveToggle = () => {
        const newVal = !autoSaveEnabled;
        setAutoSaveEnabled(newVal);
        if (typeof window !== 'undefined') {
            localStorage.setItem('notes_autosave_enabled', String(newVal));
        }
        toast.success(`Auto-save ${newVal ? 'Enabled' : 'Disabled'}`);
    };

    // Auto-Save Handler
    const executeAutoSave = useCallback(async (currentData, currentId) => {
        if (!currentData.title || !currentData.title.trim()) return;
        setSaveStatus('saving');
        try {
            if (currentId) {
                await api.put(`/admin-notes/${currentId}`, currentData);
            } else {
                const res = await api.post('/admin-notes', currentData);
                if (res.data?.data?.id) {
                    setEditingId(res.data.data.id);
                }
            }
            setSaveStatus('saved');
            setLastSavedAt(new Date());
            // Silently reload notes list in background
            api.get('/admin-notes').then(res => setNotes(res.data.data || [])).catch(() => {});
        } catch (error) {
            console.error('Auto-save error:', error);
            setSaveStatus('unsaved');
        }
    }, []);

    // Track changes for auto-save debounce
    const handleContentChange = (content) => {
        setFormData(prev => ({ ...prev, content }));
        if (autoSaveEnabled && showModal && formData.title.trim()) {
            setSaveStatus('unsaved');
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = setTimeout(() => {
                executeAutoSave({ title: formData.title, content }, editingId);
            }, 2000);
        }
    };

    const handleTitleChange = (e) => {
        const title = e.target.value;
        setFormData(prev => ({ ...prev, title }));
        if (autoSaveEnabled && showModal && title.trim()) {
            setSaveStatus('unsaved');
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = setTimeout(() => {
                executeAutoSave({ title, content: formData.content }, editingId);
            }, 2000);
        }
    };

    // Manual Submit / Save Note
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!formData.title || !formData.title.trim()) {
            toast.error('Note title is required');
            return;
        }
        if (!formData.content || formData.content === '<p><br></p>') {
            toast.error('Note content cannot be empty');
            return;
        }

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        setSubmitting(true);
        try {
            if (editingId) {
                await api.put(`/admin-notes/${editingId}`, formData);
                toast.success('Note updated successfully!');
            } else {
                await api.post('/admin-notes', formData);
                toast.success('Note created successfully!');
            }
            setShowModal(false);
            setFormData({ title: '', content: '' });
            setEditingId(null);
            setSaveStatus('idle');
            loadNotes();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save note');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (note) => {
        setFormData({ title: note.title, content: note.content || '' });
        setEditingId(note.id);
        setSaveStatus('saved');
        setShowModal(true);
    };

    const handleDelete = async (id, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this note?')) return;
        try {
            await api.delete(`/admin-notes/${id}`);
            toast.success('Note deleted');
            if (viewingNote?.id === id) setViewingNote(null);
            loadNotes();
        } catch (error) {
            toast.error('Failed to delete note');
        }
    };

    // Copy-paste Image handler for the editor
    const handleEditorPaste = (e) => {
        const clipboardItems = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
        if (!clipboardItems) return;

        for (let i = 0; i < clipboardItems.length; i++) {
            const item = clipboardItems[i];
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64 = event.target.result;
                        if (quillRef.current) {
                            const editor = quillRef.current.getEditor();
                            const range = editor.getSelection(true) || { index: editor.getLength(), length: 0 };
                            editor.clipboard.dangerouslyPasteHTML(
                                range.index,
                                `<img src="${base64}" class="img-frame-shadow" alt="Pasted Image" /><p><br></p>`
                            );
                            editor.setSelection(range.index + 1);
                            toast.success('Image pasted from clipboard!', { icon: '📷' });
                        }
                    };
                    reader.readAsDataURL(file);
                }
                return;
            }
        }
    };

    // Insert Table into Quill Editor with chosen border style
    const handleInsertTable = () => {
        if (!quillRef.current) return;
        const rows = Math.max(1, Math.min(20, tableRows));
        const cols = Math.max(1, Math.min(10, tableCols));

        let tableHtml = `<table class="notes-table ${tableBorderStyle}"><tbody>`;
        if (tableHasHeader) {
            tableHtml += '<tr>';
            for (let c = 1; c <= cols; c++) {
                tableHtml += `<th>Header ${c}</th>`;
            }
            tableHtml += '</tr>';
        }
        for (let r = 1; r <= rows; r++) {
            tableHtml += '<tr>';
            for (let c = 1; c <= cols; c++) {
                tableHtml += `<td>Row ${r}, Cell ${c}</td>`;
            }
            tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table><p><br></p>';

        const editor = quillRef.current.getEditor();
        const range = editor.getSelection(true) || { index: editor.getLength(), length: 0 };
        editor.clipboard.dangerouslyPasteHTML(range.index, tableHtml);
        setShowTableModal(false);
        toast.success(`Inserted ${rows}x${cols} table!`);
    };

    // Insert Styled Image Frame into Quill Editor
    const handleInsertFramedImage = (imageUrl) => {
        if (!quillRef.current) return;
        const urlToUse = imageUrl || imageUrlInput;
        if (!urlToUse || !urlToUse.trim()) {
            toast.error('Please enter a valid image URL or choose a file');
            return;
        }

        const imgHtml = `<img src="${urlToUse.trim()}" class="${imageFrameStyle}" alt="Framed Image" /><p><br></p>`;
        const editor = quillRef.current.getEditor();
        const range = editor.getSelection(true) || { index: editor.getLength(), length: 0 };
        editor.clipboard.dangerouslyPasteHTML(range.index, imgHtml);
        setShowImageFrameModal(false);
        setImageUrlInput('');
        toast.success('Inserted framed image!');
    };

    const handleImageFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target.result;
                handleInsertFramedImage(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    // ReactQuill custom toolbar modules with font families & sizes
    const quillModules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'font': FONT_FAMILIES }],
                [{ 'header': [1, 2, 3, 4, false] }],
                [{ 'size': FONT_SIZES }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': COLOR_PALETTE }, { 'background': COLOR_PALETTE }],
                [{ 'script': 'sub' }, { 'script': 'super' }],
                [{ 'align': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
                ['blockquote', 'code-block'],
                ['link', 'image'],
                ['clean']
            ]
        }
    }), []);

    // Date formatting helper
    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Filter and Sort Notes
    const filteredAndSortedNotes = useMemo(() => {
        let result = [...notes];

        // Search Filter across Title, Content, and Author
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(note => {
                const titleMatch = note.title?.toLowerCase().includes(q);
                const contentMatch = note.content?.replace(/<[^>]*>/g, '').toLowerCase().includes(q);
                const authorMatch = `${note.author?.firstName || ''} ${note.author?.lastName || ''}`.toLowerCase().includes(q);
                return titleMatch || contentMatch || authorMatch;
            });
        }

        // Sorting
        result.sort((a, b) => {
            let valA, valB;
            if (sortBy === 'title') {
                valA = a.title?.toLowerCase() || '';
                valB = b.title?.toLowerCase() || '';
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else if (sortBy === 'author') {
                valA = `${a.author?.firstName || ''} ${a.author?.lastName || ''}`.toLowerCase();
                valB = `${b.author?.firstName || ''} ${b.author?.lastName || ''}`.toLowerCase();
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else if (sortBy === 'createdAt') {
                valA = new Date(a.createdAt || 0).getTime();
                valB = new Date(b.createdAt || 0).getTime();
                return sortOrder === 'asc' ? valA - valB : valB - valA;
            } else {
                // Default: updatedAt
                valA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                valB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                return sortOrder === 'asc' ? valA - valB : valB - valA;
            }
        });

        return result;
    }, [notes, searchQuery, sortBy, sortOrder]);

    // Pagination calculations
    const totalItems = filteredAndSortedNotes.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    const paginatedNotes = filteredAndSortedNotes.slice(startIndex, startIndex + itemsPerPage);

    const handleSortToggle = (columnKey) => {
        if (sortBy === columnKey) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(columnKey);
            setSortOrder(columnKey === 'title' || columnKey === 'author' ? 'asc' : 'desc');
        }
        setCurrentPage(1);
    };

    const handleJumpPage = (e) => {
        e.preventDefault();
        const pageNum = parseInt(jumpPageInput, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
            setJumpPageInput('');
        } else {
            toast.error(`Please enter a page number between 1 and ${totalPages}`);
        }
    };

    // Generate highlighted HTML for View Modal
    const getHighlightedModalContent = (htmlContent, query) => {
        const cleanHtml = DOMPurify.sanitize(htmlContent || '', { ADD_ATTR: ['target', 'rel'] });
        if (!query || !query.trim()) return cleanHtml;

        const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match text nodes outside tags
        const regex = new RegExp(`(?![^<]*>)(${escaped})`, 'gi');
        return cleanHtml.replace(
            regex,
            '<mark class="bg-yellow-300 text-slate-900 font-bold px-1 py-0.5 rounded-sm shadow-xs border-b-2 border-yellow-500">$1</mark>'
        );
    };

    if (!_hasHydrated || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-500 text-sm font-medium">Loading Notes & Editor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/80">
            {/* Header Bar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <h1 className="text-xl font-bold text-slate-900">Admin Notes</h1>
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">
                                    {totalItems} {totalItems === 1 ? 'Note' : 'Notes'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* View Switcher (Grid vs List) */}
                        <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
                            <button
                                onClick={() => handleViewModeChange('grid')}
                                className={`p-2 rounded-lg transition text-xs font-medium flex items-center gap-1.5 ${
                                    viewMode === 'grid'
                                        ? 'bg-white text-primary-600 shadow-sm font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Card Grid View"
                            >
                                <LayoutGrid className="w-4 h-4" />
                                <span className="hidden sm:inline">Grid</span>
                            </button>
                            <button
                                onClick={() => handleViewModeChange('list')}
                                className={`p-2 rounded-lg transition text-xs font-medium flex items-center gap-1.5 ${
                                    viewMode === 'list'
                                        ? 'bg-white text-primary-600 shadow-sm font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Data Table List View"
                            >
                                <List className="w-4 h-4" />
                                <span className="hidden sm:inline">List</span>
                            </button>
                        </div>

                        {/* New Note Button */}
                        <button
                            onClick={() => {
                                setFormData({ title: '', content: '' });
                                setEditingId(null);
                                setSaveStatus('idle');
                                setShowModal(true);
                            }}
                            className="btn btn-primary px-4 py-2 text-sm shadow-md"
                        >
                            <Plus className="w-4 h-4 mr-1.5" /> New Note
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Search & Sorting Toolbar */}
                <div className="card p-4 mb-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Search Bar with Highlight Alert */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by title, content, or author..."
                            className={`input pl-10 pr-9 py-2 text-sm w-full transition ${
                                searchQuery ? 'border-yellow-400 ring-2 ring-yellow-200/60 bg-yellow-50/20' : ''
                            }`}
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                title="Clear Search"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Quick Sort Dropdown & Items Per Page */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
                        {searchQuery && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200 font-medium">
                                <Highlighter className="w-3.5 h-3.5 text-amber-600" />
                                <span>Highlighting matches for: <strong>"{searchQuery}"</strong></span>
                            </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                            <span>Sort:</span>
                            <select
                                value={`${sortBy}-${sortOrder}`}
                                onChange={(e) => {
                                    const [newSort, newOrder] = e.target.value.split('-');
                                    setSortBy(newSort);
                                    setSortOrder(newOrder);
                                    setCurrentPage(1);
                                }}
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            >
                                <option value="updatedAt-desc">Recently Updated</option>
                                <option value="updatedAt-asc">Oldest Updated</option>
                                <option value="createdAt-desc">Newest Created</option>
                                <option value="createdAt-asc">Oldest Created</option>
                                <option value="title-asc">Title (A-Z)</option>
                                <option value="title-desc">Title (Z-A)</option>
                                <option value="author-asc">Author (A-Z)</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                            <span>Show:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            >
                                <option value={5}>5 / page</option>
                                <option value={10}>10 / page</option>
                                <option value={20}>20 / page</option>
                                <option value={50}>50 / page</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Empty State */}
                {filteredAndSortedNotes.length === 0 ? (
                    <div className="card p-12 text-center max-w-2xl mx-auto shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">
                            {searchQuery ? 'No matching notes found' : 'No notes available'}
                        </h3>
                        <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                            {searchQuery
                                ? `No notes matched your search query "${searchQuery}". Try searching with different keywords.`
                                : 'Create notes to store build configurations, team announcements, or meeting documentation.'}
                        </p>
                        {searchQuery ? (
                            <button onClick={() => setSearchQuery('')} className="btn btn-secondary text-sm">
                                Clear Search
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    setFormData({ title: '', content: '' });
                                    setEditingId(null);
                                    setShowModal(true);
                                }}
                                className="btn btn-primary text-sm shadow-md"
                            >
                                <Plus className="w-4 h-4 mr-1.5" /> Create First Note
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* 1. GRID VIEW */}
                        {viewMode === 'grid' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {paginatedNotes.map((note) => {
                                    const plainSnippet = note.content?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '';
                                    return (
                                        <div
                                            key={note.id}
                                            onClick={() => setViewingNote(note)}
                                            className="card card-hover p-5 cursor-pointer flex flex-col justify-between border-slate-200 hover:border-primary-300 transition group relative"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-3 mb-2.5">
                                                    <h3 className="font-bold text-base text-slate-900 group-hover:text-primary-600 transition line-clamp-1">
                                                        <HighlightText text={note.title} query={searchQuery} />
                                                    </h3>
                                                </div>

                                                {/* Text snippet with yellow search highlight */}
                                                <div className="text-slate-500 text-xs line-clamp-3 mb-4 leading-relaxed">
                                                    <HighlightText text={plainSnippet || 'No text preview available'} query={searchQuery} />
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
                                                {/* Author and Date metadata */}
                                                <div className="flex items-center justify-between text-xs text-slate-500">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-[10px]">
                                                            {note.author?.firstName?.charAt(0) || 'A'}
                                                        </div>
                                                        <span className="font-medium text-slate-700 truncate max-w-[120px]">
                                                            <HighlightText text={`${note.author?.firstName || ''} ${note.author?.lastName || ''}`} query={searchQuery} />
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] text-slate-400 font-mono" title={`Updated: ${formatDate(note.updatedAt || note.createdAt)}`}>
                                                        {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                {/* Single-row Icon Actions Only */}
                                                <div
                                                    className="flex items-center justify-end gap-1.5 pt-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() => setViewingNote(note)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition"
                                                        title="View Note"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(note)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                                                        title="Edit Note"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(note.id, e)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                                                        title="Delete Note"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 2. LIST VIEW (Data Table) */}
                        {viewMode === 'list' && (
                            <div className="card overflow-hidden shadow-sm border border-slate-200">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider select-none">
                                                <th
                                                    onClick={() => handleSortToggle('title')}
                                                    className="px-5 py-3.5 cursor-pointer hover:bg-slate-100 transition"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <span>Title & Content</span>
                                                        {sortBy === 'title' ? (
                                                            sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary-600" /> : <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
                                                        ) : (
                                                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    onClick={() => handleSortToggle('author')}
                                                    className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 transition hidden sm:table-cell"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <span>Author</span>
                                                        {sortBy === 'author' ? (
                                                            sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary-600" /> : <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
                                                        ) : (
                                                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    onClick={() => handleSortToggle('createdAt')}
                                                    className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 transition hidden md:table-cell"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <span>Created Date & Time</span>
                                                        {sortBy === 'createdAt' ? (
                                                            sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary-600" /> : <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
                                                        ) : (
                                                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    onClick={() => handleSortToggle('updatedAt')}
                                                    className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 transition"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <span>Updated Date & Time</span>
                                                        {sortBy === 'updatedAt' ? (
                                                            sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary-600" /> : <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
                                                        ) : (
                                                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                                                        )}
                                                    </div>
                                                </th>
                                                <th className="px-5 py-3.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-sm">
                                            {paginatedNotes.map((note) => {
                                                const plainSnippet = note.content?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '';
                                                return (
                                                    <tr
                                                        key={note.id}
                                                        onClick={() => setViewingNote(note)}
                                                        className="hover:bg-primary-50/40 transition cursor-pointer group"
                                                    >
                                                        <td className="px-5 py-3.5 max-w-xs">
                                                            <div className="font-semibold text-slate-900 group-hover:text-primary-600 transition truncate">
                                                                <HighlightText text={note.title} query={searchQuery} />
                                                            </div>
                                                            <div className="text-xs text-slate-400 truncate mt-0.5">
                                                                <HighlightText text={plainSnippet || 'No text preview'} query={searchQuery} />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-slate-600 text-xs hidden sm:table-cell whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px] border">
                                                                    {note.author?.firstName?.charAt(0) || 'A'}
                                                                </div>
                                                                <span>
                                                                    <HighlightText text={`${note.author?.firstName || ''} ${note.author?.lastName || ''}`} query={searchQuery} />
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-slate-500 text-xs font-mono hidden md:table-cell whitespace-nowrap">
                                                            {formatDate(note.createdAt)}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-slate-700 text-xs font-mono font-medium whitespace-nowrap">
                                                            {formatDate(note.updatedAt || note.createdAt)}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                            {/* Icons Only in a Single Row */}
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    onClick={() => setViewingNote(note)}
                                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition"
                                                                    title="View Note"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEdit(note)}
                                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                                                                    title="Edit Note"
                                                                >
                                                                    <Edit3 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleDelete(note.id, e)}
                                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                                                                    title="Delete Note"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Pagination Bar with Jump to Page & Nav Buttons */}
                        <div className="card p-4 mt-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                            {/* Summary info */}
                            <div className="text-xs text-slate-500">
                                Showing <span className="font-semibold text-slate-700">{startIndex + 1}</span> to{' '}
                                <span className="font-semibold text-slate-700">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of{' '}
                                <span className="font-semibold text-slate-700">{totalItems}</span> notes
                            </div>

                            {/* Pagination Buttons & Jump */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* First Button */}
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition text-xs flex items-center gap-1"
                                    title="First Page"
                                >
                                    <ChevronsLeft className="w-4 h-4" />
                                    <span className="hidden sm:inline">First</span>
                                </button>

                                {/* Prev Button */}
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition text-xs flex items-center gap-1"
                                    title="Previous Page"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span className="hidden sm:inline">Prev</span>
                                </button>

                                {/* Page Number Pills */}
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) pageNum = i + 1;
                                        else if (currentPage <= 3) pageNum = i + 1;
                                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                        else pageNum = currentPage - 2 + i;

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                                                    currentPage === pageNum
                                                        ? 'bg-primary-600 text-white shadow-sm'
                                                        : 'hover:bg-slate-100 text-slate-700'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Next Button */}
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition text-xs flex items-center gap-1"
                                    title="Next Page"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>

                                {/* Last Button */}
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition text-xs flex items-center gap-1"
                                    title="Last Page"
                                >
                                    <span className="hidden sm:inline">Last</span>
                                    <ChevronsRight className="w-4 h-4" />
                                </button>

                                {/* Jump to Page Form */}
                                <form onSubmit={handleJumpPage} className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200">
                                    <span className="text-xs text-slate-500 hidden sm:inline">Jump:</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={totalPages}
                                        placeholder="#"
                                        value={jumpPageInput}
                                        onChange={(e) => setJumpPageInput(e.target.value)}
                                        className="w-14 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    />
                                    <button
                                        type="submit"
                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
                                    >
                                        Go
                                    </button>
                                </form>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* View Note Modal */}
            {viewingNote && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
                    onClick={() => setViewingNote(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">
                                    <HighlightText text={viewingNote.title} query={searchQuery} />
                                </h2>
                                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-primary-600" />
                                        <span>Author: {viewingNote.author?.firstName} {viewingNote.author?.lastName}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Created: {formatDate(viewingNote.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Last Updated: {formatDate(viewingNote.updatedAt || viewingNote.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const note = viewingNote;
                                        setViewingNote(null);
                                        handleEdit(note);
                                    }}
                                    className="p-2 text-slate-600 hover:text-primary-600 hover:bg-slate-100 rounded-xl transition"
                                    title="Edit this Note"
                                >
                                    <Edit3 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setViewingNote(null)}
                                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                                    title="Close Preview (Esc)"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content Area with Rich Typography and Table Styling and Highlighted Search Matches */}
                        <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-slate-50/40">
                            <div
                                className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200 notes-content prose max-w-none"
                                dangerouslySetInnerHTML={{
                                    __html: typeof window !== 'undefined'
                                        ? getHighlightedModalContent(viewingNote.content, searchQuery)
                                        : ''
                                }}
                            />
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
                            <span className="text-xs text-slate-400">
                                Press <kbd className="px-1.5 py-0.5 bg-slate-100 border rounded text-[10px] font-mono">Esc</kbd> to dismiss
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const note = viewingNote;
                                        setViewingNote(null);
                                        handleEdit(note);
                                    }}
                                    className="btn btn-secondary text-xs"
                                >
                                    <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit Note
                                </button>
                                <button
                                    onClick={() => setViewingNote(null)}
                                    className="btn btn-primary text-xs"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit / Create Note Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 md:p-6 backdrop-blur-sm animate-in fade-in"
                    onClick={() => {
                        if (saveStatus === 'unsaved') {
                            if (window.confirm('You have unsaved changes. Close anyway?')) setShowModal(false);
                        } else {
                            setShowModal(false);
                        }
                    }}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header with Auto-Save Switch and Status */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/80">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                                    {editingId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">
                                        {editingId ? 'Edit Note' : 'Create New Note'}
                                    </h2>
                                </div>
                            </div>

                            {/* Auto-Save & Status Badge */}
                            <div className="flex items-center gap-3">
                                {/* Auto-save Status Indicator */}
                                {autoSaveEnabled && (
                                    <div className="hidden sm:flex items-center gap-1.5 text-xs">
                                        {saveStatus === 'saving' && (
                                            <span className="flex items-center gap-1 text-blue-600 font-medium">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                                                Auto-saving...
                                            </span>
                                        )}
                                        {saveStatus === 'saved' && (
                                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                Saved
                                            </span>
                                        )}
                                        {saveStatus === 'unsaved' && (
                                            <span className="flex items-center gap-1 text-amber-600 font-medium">
                                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                Unsaved edits
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Auto-save Toggle Button */}
                                <button
                                    type="button"
                                    onClick={handleAutoSaveToggle}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                                        autoSaveEnabled
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                            : 'bg-slate-100 border-slate-300 text-slate-500'
                                    }`}
                                    title="Toggle automatic saving as you type"
                                >
                                    <span className={`w-2 h-2 rounded-full ${autoSaveEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                    Auto-Save: {autoSaveEnabled ? 'ON' : 'OFF'}
                                </button>

                                {/* Close Button */}
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
                                    title="Close (Esc)"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
                            {/* Title Field */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Note Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="input text-base font-semibold w-full"
                                    placeholder="Enter a descriptive title for this note..."
                                    value={formData.title}
                                    onChange={handleTitleChange}
                                />
                            </div>

                            {/* Extra Quick Tools Bar (Insert Table, Image Frame, Paste Hint) */}
                            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Content & Formatting <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => setShowTableModal(true)}
                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition flex items-center gap-1.5 shadow-sm"
                                        title="Insert table with custom borders"
                                    >
                                        <Table className="w-3.5 h-3.5 text-primary-600" />
                                        <span>Insert Table</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowImageFrameModal(true)}
                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition flex items-center gap-1.5 shadow-sm"
                                        title="Insert image with custom frame & border styles"
                                    >
                                        <Frame className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>Framed Image</span>
                                    </button>

                                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                                        💡 Paste screenshots directly (<kbd className="font-mono px-1 py-0.5 bg-slate-100 rounded text-[10px]">Ctrl+V</kbd>)
                                    </span>
                                </div>
                            </div>

                            {/* Quill Editor Container with Custom Paste Handling */}
                            <div
                                className="flex-1 min-h-[300px] flex flex-col"
                                onPasteCapture={handleEditorPaste}
                            >
                                <ReactQuill
                                    ref={quillRef}
                                    theme="snow"
                                    value={formData.content}
                                    onChange={handleContentChange}
                                    modules={quillModules}
                                    placeholder="Type your notes here... Use the toolbar above for custom fonts (Arial, Trebuchet MS, Roboto, etc.), sizes (8px to 72px), colors, tables, and hyperlinks."
                                    className="flex-1"
                                />
                            </div>
                        </form>

                        {/* Modal Footer Actions */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                                {lastSavedAt && `Last saved at ${lastSavedAt.toLocaleTimeString()}`}
                            </span>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn btn-secondary text-xs"
                                    disabled={submitting}
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    className="btn btn-primary text-xs shadow-md"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Saving...' : editingId ? 'Update Note' : 'Save Note'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Insertion Modal with Border Styles */}
            {showTableModal && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setShowTableModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Table className="w-5 h-5 text-primary-600" />
                                <h3 className="text-base font-bold text-slate-900">Insert Table</h3>
                            </div>
                            <button
                                onClick={() => setShowTableModal(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Rows</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={tableRows}
                                        onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                        className="input py-2 text-sm w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Columns</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={tableCols}
                                        onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                        className="input py-2 text-sm w-full"
                                    />
                                </div>
                            </div>

                            {/* Table Border Style Selection */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Table Border Style
                                </label>
                                <select
                                    value={tableBorderStyle}
                                    onChange={(e) => setTableBorderStyle(e.target.value)}
                                    className="input py-2 text-xs w-full font-medium"
                                >
                                    <option value="table-bordered">Standard Clean (1px slate borders)</option>
                                    <option value="table-minimal">Minimalist Horizontal (Subtle dividers)</option>
                                    <option value="table-bold">Bold Blueprint (2px dark slate grid)</option>
                                    <option value="table-dashed">Dashed Modern (Dashed borders)</option>
                                    <option value="table-primary">Primary Indigo Accent (Colored borders & header)</option>
                                    <option value="table-emerald">Emerald Green Accent (Soft green header & border)</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="headerRow"
                                    checked={tableHasHeader}
                                    onChange={(e) => setTableHasHeader(e.target.checked)}
                                    className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                                />
                                <label htmlFor="headerRow" className="text-xs text-slate-700 font-medium cursor-pointer">
                                    Include Table Header Row
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => setShowTableModal(false)}
                                className="btn btn-secondary text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleInsertTable}
                                className="btn btn-primary text-xs shadow-md"
                            >
                                Insert Table
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Frame & Border Style Modal */}
            {showImageFrameModal && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setShowImageFrameModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Frame className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-base font-bold text-slate-900">Insert Framed Image</h3>
                            </div>
                            <button
                                onClick={() => setShowImageFrameModal(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            {/* Frame Style Selection */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Image Frame & Border Style
                                </label>
                                <select
                                    value={imageFrameStyle}
                                    onChange={(e) => setImageFrameStyle(e.target.value)}
                                    className="input py-2 text-xs w-full font-medium"
                                >
                                    <option value="img-frame-shadow">Modern Shadow & Border (Rounded + Soft Shadow)</option>
                                    <option value="img-frame-solid">Crisp Solid Border (3px dark outline)</option>
                                    <option value="img-frame-glow">Primary Glow Frame (Indigo border + Glow shadow)</option>
                                    <option value="img-frame-dashed">Dashed Blueprint Frame (2px dashed border + padding)</option>
                                    <option value="img-frame-pill">Curved Pill (High-radius border)</option>
                                    <option value="img-frame-polaroid">Polaroid Snapshot (White border with bottom caption pad)</option>
                                </select>
                            </div>

                            {/* Image Source (URL or File) */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Image Web URL
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://example.com/image.png"
                                    value={imageUrlInput}
                                    onChange={(e) => setImageUrlInput(e.target.value)}
                                    className="input py-2 text-sm w-full"
                                />
                            </div>

                            <div className="relative flex py-1 items-center">
                                <div className="flex-grow border-t border-slate-200"></div>
                                <span className="flex-shrink mx-3 text-xs text-slate-400 font-medium">OR Upload File</span>
                                <div className="flex-grow border-t border-slate-200"></div>
                            </div>

                            <div>
                                <label className="btn btn-secondary w-full text-xs cursor-pointer justify-center border-dashed border-2 py-3">
                                    <ImageIcon className="w-4 h-4 mr-2 text-slate-500" />
                                    Choose Image File from Device
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageFileUpload}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => setShowImageFrameModal(false)}
                                className="btn btn-secondary text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleInsertFramedImage()}
                                className="btn btn-primary text-xs shadow-md"
                            >
                                Insert Framed Image
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
