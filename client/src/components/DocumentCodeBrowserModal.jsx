'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    X,
    FolderOpen,
    FileCode,
    Clock,
    Download,
    RefreshCw,
    Search,
    ExternalLink,
    Check,
    AlertCircle,
    Plus,
    FileSpreadsheet,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Calendar,
    CalendarDays,
    SlidersHorizontal,
    HardDrive
} from 'lucide-react';
import toast from 'react-hot-toast';
import { documentsAPI, foldersAPI } from '@/lib/api';

export default function DocumentCodeBrowserModal({
    isOpen,
    onClose,
    onOpenFile,
    defaultLanguage = 'python'
}) {
    const [loading, setLoading] = useState(true);
    const [folders, setFolders] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [selectedFolderId, setSelectedFolderId] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [openingDocId, setOpeningDocId] = useState(null);

    // Sorting state (default: Creation Date descending / newest first)
    const [sortField, setSortField] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

    // Fetch student's folders and code documents
    useEffect(() => {
        if (!isOpen) return;

        async function fetchDocs() {
            setLoading(true);
            try {
                // 1. Fetch folders
                const foldersRes = await foldersAPI.getAll();
                const rawFolders = foldersRes.data?.data;
                const fetchedFolders = Array.isArray(rawFolders)
                    ? rawFolders
                    : Array.isArray(rawFolders?.folders)
                    ? rawFolders.folders
                    : Array.isArray(foldersRes.data?.folders)
                    ? foldersRes.data.folders
                    : Array.isArray(foldersRes.data)
                    ? foldersRes.data
                    : [];
                setFolders(fetchedFolders);

                // Find Python or SQL folder as default
                const targetFolder = fetchedFolders.find((f) =>
                    f.name?.toLowerCase() === defaultLanguage.toLowerCase()
                );
                if (targetFolder) {
                    setSelectedFolderId(targetFolder.id);
                } else {
                    setSelectedFolderId('all');
                }

                // 2. Fetch code documents
                const docsRes = await documentsAPI.getAll({
                    category: 'code'
                });
                const rawDocs = docsRes.data?.data;
                const fetchedDocs = Array.isArray(rawDocs)
                    ? rawDocs
                    : Array.isArray(rawDocs?.documents)
                    ? rawDocs.documents
                    : Array.isArray(docsRes.data?.documents)
                    ? docsRes.data.documents
                    : Array.isArray(docsRes.data)
                    ? docsRes.data
                    : [];
                setDocuments(fetchedDocs);
            } catch (err) {
                console.error('Failed to load documents:', err);
                toast.error('Could not load code documents from storage');
            } finally {
                setLoading(false);
            }
        }

        fetchDocs();
    }, [isOpen, defaultLanguage]);

    // Format helpers
    const formatDate = (isoString) => {
        if (!isoString) return { date: '—', time: '' };
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return { date: '—', time: '' };
            return {
                date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
                time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
            };
        } catch {
            return { date: '—', time: '' };
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes <= 0) return '0 B';
        if (bytes < 1024) return `${bytes} B`;
        return `${(bytes / 1024).toFixed(1)} KB`;
    };

    // Toggle column sort
    const handleColumnSort = (field) => {
        if (sortField === field) {
            setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            // Default to newest first for dates/sizes, asc for names
            setSortOrder(field === 'name' || field === 'folder' ? 'asc' : 'desc');
        }
    };

    // Filter & Sort
    const safeDocuments = Array.isArray(documents) ? documents : [];
    const safeFolders = Array.isArray(folders) ? folders : [];

    const folderMap = useMemo(() => {
        const map = {};
        safeFolders.forEach((f) => {
            if (f?.id) map[f.id] = f.name;
        });
        return map;
    }, [safeFolders]);

    const filteredDocs = useMemo(() => {
        return safeDocuments.filter((doc) => {
            const matchesFolder =
                selectedFolderId === 'all' || doc.folderId === selectedFolderId;
            const matchesSearch =
                !searchQuery ||
                doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.fileName?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFolder && matchesSearch;
        });
    }, [safeDocuments, selectedFolderId, searchQuery]);

    const sortedDocs = useMemo(() => {
        return [...filteredDocs].sort((a, b) => {
            let comparison = 0;
            if (sortField === 'name') {
                const nameA = (a.name || a.fileName || '').toLowerCase();
                const nameB = (b.name || b.fileName || '').toLowerCase();
                comparison = nameA.localeCompare(nameB);
            } else if (sortField === 'createdAt') {
                const timeA = new Date(a.createdAt || 0).getTime();
                const timeB = new Date(b.createdAt || 0).getTime();
                comparison = timeA - timeB;
            } else if (sortField === 'updatedAt') {
                const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                comparison = timeA - timeB;
            } else if (sortField === 'fileSize') {
                comparison = (a.fileSize || 0) - (b.fileSize || 0);
            } else if (sortField === 'folder') {
                const fA = (folderMap[a.folderId] || '').toLowerCase();
                const fB = (folderMap[b.folderId] || '').toLowerCase();
                comparison = fA.localeCompare(fB);
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [filteredDocs, sortField, sortOrder, folderMap]);

    if (!isOpen) return null;

    const handleSelectDocument = async (doc, asNewTab = false) => {
        setOpeningDocId(doc.id);
        try {
            // Fetch raw file text via authenticated api with layered fallbacks
            let codeText = '';
            try {
                const response = await documentsAPI.getFileContent(doc.id);
                codeText = typeof response.data === 'string' ? response.data : String(response.data || '');
            } catch (apiErr) {
                console.warn('[DocModal] Primary getFileContent failed, attempting fallbacks:', apiErr.message);
            }

            // If empty string returned from primary API or error, execute layered fallbacks
            if (!codeText || !codeText.trim()) {
                // Fallback 1: Direct fetch via doc.url (local /uploads rewrites or remote Cloudinary https)
                if (doc.url) {
                    try {
                        const directUrl = doc.url.startsWith('http') || doc.url.startsWith('/') ? doc.url : `/${doc.url}`;
                        const directRes = await fetch(directUrl);
                        if (directRes.ok) {
                            const txt = await directRes.text();
                            if (txt && txt.trim()) codeText = txt;
                        }
                    } catch (_) {}
                }

                // Fallback 2: Stream via download endpoint
                if (!codeText || !codeText.trim()) {
                    try {
                        const dlRes = await documentsAPI.download(doc.id);
                        if (dlRes?.data) {
                            const txt = typeof dlRes.data === 'string' ? dlRes.data : String(dlRes.data);
                            if (txt && txt.trim()) codeText = txt;
                        }
                    } catch (_) {}
                }

                // Fallback 3: Provide a clean starter code template rather than opening completely blank
                if (!codeText || !codeText.trim()) {
                    const isSqlFile = doc.name?.endsWith('.sql') || doc.fileName?.endsWith('.sql') || doc.category === 'sql';
                    const cleanName = doc.name || doc.fileName || (isSqlFile ? 'query.sql' : 'program.py');
                    codeText = isSqlFile
                        ? `-- ===============================================================\n-- Script: ${cleanName}\n-- Created: ${new Date(doc.createdAt || Date.now()).toLocaleDateString()}\n-- Ready for SQL queries\n-- ===============================================================\n\n`
                        : `\"\"\"\n===============================================================\nScript: ${cleanName}\nCreated: ${new Date(doc.createdAt || Date.now()).toLocaleDateString()}\nReady for Python code\n===============================================================\n\"\"\"\n\n`;
                    toast(`Opened "${doc.name}" with starter template`, { icon: 'ℹ️' });
                }
            }

            const isSql = doc.name?.endsWith('.sql') || doc.fileName?.endsWith('.sql') || doc.category === 'sql';
            const lang = isSql ? 'sql' : 'python';

            onOpenFile({
                name: doc.name || doc.fileName,
                code: codeText,
                language: lang,
                documentId: doc.id,
                folderId: doc.folderId,
                updatedAt: doc.updatedAt || doc.createdAt,
                asNewTab
            });

            if (!codeText.includes('Ready for Python code') && !codeText.includes('Ready for SQL queries')) {
                toast.success(`Opened "${doc.name}" in editor`);
            }
            onClose();
        } catch (err) {
            console.error('Error opening doc:', err);
            toast.error('Failed to read code document content: ' + (err.response?.data?.message || err.message));
        } finally {
            setOpeningDocId(null);
        }
    };

    const renderSortArrow = (field) => {
        if (sortField !== field) {
            return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-50 group-hover:opacity-100" />;
        }
        return sortOrder === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-amber-400 font-bold" />
        ) : (
            <ArrowDown className="w-3.5 h-3.5 text-amber-400 font-bold" />
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <FolderOpen className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                Open Script from Documents
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-medium font-mono">
                                    {sortedDocs.length} {sortedDocs.length === 1 ? 'file' : 'files'}
                                </span>
                            </h2>
                            <p className="text-[11px] text-slate-400">
                                Browse saved Python scripts and SQL queries from your cloud folders with instant column sorting
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Close modal (Esc)"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Filter & Quick Sort Toolbar */}
                <div className="p-3 sm:px-5 sm:py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/50">
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Folder Type Select Filter */}
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs transition">
                            <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <label htmlFor="folder-select-filter" className="text-[11px] text-slate-400 font-medium">Folder:</label>
                            <select
                                id="folder-select-filter"
                                value={selectedFolderId}
                                onChange={(e) => setSelectedFolderId(e.target.value)}
                                className="bg-transparent text-xs text-slate-100 font-medium focus:outline-none cursor-pointer pr-1"
                            >
                                <option value="all" className="bg-slate-900 text-slate-100">
                                    📁 All Folders ({safeDocuments.length})
                                </option>
                                {safeFolders.map((f) => {
                                    const count = safeDocuments.filter((d) => d.folderId === f.id).length;
                                    return (
                                        <option key={f.id} value={f.id} className="bg-slate-900 text-slate-100">
                                            📁 {f.name} ({count})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Quick Sort Dropdown */}
                        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs transition">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Sort:</span>
                            <select
                                value={`${sortField}-${sortOrder}`}
                                onChange={(e) => {
                                    const [f, o] = e.target.value.split('-');
                                    setSortField(f);
                                    setSortOrder(o);
                                }}
                                className="bg-transparent text-xs text-slate-100 font-medium focus:outline-none cursor-pointer pr-1"
                            >
                                <option value="createdAt-desc" className="bg-slate-900 text-slate-100">Creation Date (Newest first)</option>
                                <option value="createdAt-asc" className="bg-slate-900 text-slate-100">Creation Date (Oldest first)</option>
                                <option value="name-asc" className="bg-slate-900 text-slate-100">Filename (A → Z)</option>
                                <option value="name-desc" className="bg-slate-900 text-slate-100">Filename (Z → A)</option>
                                <option value="updatedAt-desc" className="bg-slate-900 text-slate-100">Last Modified (Recent first)</option>
                                <option value="fileSize-desc" className="bg-slate-900 text-slate-100">Size (Largest first)</option>
                            </select>
                        </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1 sm:w-48 md:w-56 max-w-xs">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search scripts..."
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500 placeholder-slate-500 transition"
                        />
                    </div>
                </div>

                {/* Table Header Row for Easy Sorting */}
                <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-slate-950 border-b border-slate-800 text-[11px] font-semibold text-slate-400 select-none">
                    {/* Filename Column Header (col-span-3, reduced to view filesize column) */}
                    <button
                        onClick={() => handleColumnSort('name')}
                        className="col-span-12 sm:col-span-3 flex items-center gap-1.5 hover:text-white transition group text-left cursor-pointer"
                        title="Click to sort by filename"
                    >
                        <span>Filename / Script</span>
                        {renderSortArrow('name')}
                    </button>

                    {/* Folder / Type Column Header */}
                    <button
                        onClick={() => handleColumnSort('folder')}
                        className="hidden sm:flex col-span-2 items-center gap-1.5 hover:text-white transition group cursor-pointer"
                        title="Click to sort by folder/type"
                    >
                        <span>Folder / Type</span>
                        {renderSortArrow('folder')}
                    </button>

                    {/* Creation Date Column Header */}
                    <button
                        onClick={() => handleColumnSort('createdAt')}
                        className={`hidden sm:flex col-span-2 items-center gap-1.5 transition group cursor-pointer ${
                            sortField === 'createdAt' ? 'text-amber-400 font-bold' : 'hover:text-white'
                        }`}
                        title="Click to sort creation datewise"
                    >
                        <Calendar className="w-3 h-3 text-slate-400 group-hover:text-amber-400" />
                        <span>Created Date</span>
                        {renderSortArrow('createdAt')}
                    </button>

                    {/* Last Modified Column Header */}
                    <button
                        onClick={() => handleColumnSort('updatedAt')}
                        className={`hidden md:flex col-span-2 items-center gap-1.5 transition group cursor-pointer ${
                            sortField === 'updatedAt' ? 'text-amber-400 font-bold' : 'hover:text-white'
                        }`}
                        title="Click to sort by last modified date"
                    >
                        <Clock className="w-3 h-3 text-slate-400 group-hover:text-amber-400" />
                        <span>Last Modified</span>
                        {renderSortArrow('updatedAt')}
                    </button>

                    {/* File Size Column Header (col-span-2, increased so file size is clearly visible!) */}
                    <button
                        onClick={() => handleColumnSort('fileSize')}
                        className={`hidden sm:flex col-span-2 items-center gap-1.5 hover:text-white transition group cursor-pointer justify-end pr-2 ${
                            sortField === 'fileSize' ? 'text-amber-400 font-bold' : 'hover:text-white'
                        }`}
                        title="Click to sort by file size"
                    >
                        <HardDrive className="w-3 h-3 text-slate-400 group-hover:text-amber-400" />
                        <span>File Size</span>
                        {renderSortArrow('fileSize')}
                    </button>

                    <div className="col-span-12 sm:col-span-1 flex items-center justify-end text-slate-500 font-normal">
                        <span>Action</span>
                    </div>
                </div>

                {/* Documents List */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 divide-y divide-slate-800/40">
                    {loading ? (
                        <div className="py-14 flex flex-col items-center justify-center text-slate-500 gap-2">
                            <RefreshCw className="w-7 h-7 animate-spin text-amber-400" />
                            <span className="text-xs">Fetching your documents...</span>
                        </div>
                    ) : sortedDocs.length > 0 ? (
                        sortedDocs.map((doc) => {
                            const isSql = doc.name?.endsWith('.sql') || doc.fileName?.endsWith('.sql') || doc.category === 'sql';
                            const isOpening = openingDocId === doc.id;
                            const folderName = folderMap[doc.folderId] || (isSql ? 'SQL' : 'Python');
                            const created = formatDate(doc.createdAt);
                            const updated = formatDate(doc.updatedAt);

                            return (
                                <div
                                    key={doc.id}
                                    className="grid grid-cols-12 gap-3 items-center p-2.5 sm:px-3 bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800/70 hover:border-slate-700 rounded-xl transition group"
                                >
                                    {/* Filename & Icon (col-span-3) */}
                                    <div className="col-span-12 sm:col-span-3 flex items-center gap-2.5 min-w-0">
                                        <div
                                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] flex-shrink-0 ${
                                                isSql
                                                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            }`}
                                        >
                                            {isSql ? 'SQL' : 'PY'}
                                        </div>
                                        <div className="min-w-0">
                                            <p
                                                className="text-xs font-semibold text-slate-200 truncate group-hover:text-amber-300 transition cursor-pointer"
                                                onClick={() => handleSelectDocument(doc, false)}
                                                title={`Click to open ${doc.name || doc.fileName}`}
                                            >
                                                {doc.name || doc.fileName}
                                            </p>
                                            {/* Mobile-only secondary info */}
                                            <div className="flex sm:hidden items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                                <span className="text-amber-400/90 font-medium">{folderName}</span>
                                                <span>•</span>
                                                <span>{created.date}</span>
                                                <span>•</span>
                                                <span className="font-mono text-slate-500">{formatFileSize(doc.fileSize)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Folder / Type */}
                                    <div className="hidden sm:flex col-span-2 items-center gap-1.5 min-w-0">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                            isSql
                                                ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                                                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                        }`}>
                                            {folderName}
                                        </span>
                                    </div>

                                    {/* Created Date */}
                                    <div className="hidden sm:flex col-span-2 flex-col justify-center text-[11px] min-w-0">
                                        <span className="text-slate-200 font-medium">{created.date}</span>
                                        <span className="text-[10px] text-slate-500">{created.time}</span>
                                    </div>

                                    {/* Last Modified */}
                                    <div className="hidden md:flex col-span-2 flex-col justify-center text-[11px] min-w-0">
                                        <span className="text-slate-300">{updated.date !== '—' ? updated.date : created.date}</span>
                                        <span className="text-[10px] text-emerald-400/80 font-mono">
                                            {updated.time || created.time}
                                        </span>
                                    </div>

                                    {/* File Size (col-span-2: clear, prominent badge) */}
                                    <div className="hidden sm:flex col-span-2 justify-end pr-2 items-center">
                                        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-emerald-400 font-semibold shadow-xs">
                                            {formatFileSize(doc.fileSize)}
                                        </span>
                                    </div>

                                    {/* Actions (col-span-1) */}
                                    <div className="col-span-12 sm:col-span-1 flex items-center justify-end gap-1.5">
                                        <button
                                            onClick={() => handleSelectDocument(doc, false)}
                                            disabled={isOpening}
                                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-50 flex items-center gap-1 cursor-pointer shadow-xs"
                                            title="Load script into current editor tab"
                                        >
                                            {isOpening ? (
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <ExternalLink className="w-3 h-3" />
                                            )}
                                            <span className="hidden sm:inline">Open</span>
                                            <span className="sm:hidden">Open in Editor</span>
                                        </button>

                                        <button
                                            onClick={() => handleSelectDocument(doc, true)}
                                            disabled={isOpening}
                                            className="p-1 rounded-md text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition disabled:opacity-50 cursor-pointer hidden sm:flex items-center justify-center"
                                            title="Open in a new tab (Max 5 tabs)"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-14 flex flex-col items-center justify-center text-slate-500 text-center">
                            <FileCode className="w-10 h-10 mb-2 stroke-1 text-slate-600" />
                            <p className="text-xs font-semibold text-slate-400">
                                No code documents found
                            </p>
                            <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                                {searchQuery ? 'No scripts match your search.' : 'Save your scripts from the IDE to have them appear in your Documents folder!'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer with Summary & Help */}
                <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <div className="flex items-center gap-2 text-[11px]">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>
                            Currently sorted by: <strong className="text-amber-400 font-semibold">
                                {sortField === 'createdAt' ? 'Creation Date' : sortField === 'name' ? 'Filename' : sortField === 'updatedAt' ? 'Last Modified' : sortField === 'fileSize' ? 'Size' : 'Folder'}
                            </strong> ({sortOrder === 'asc' ? 'Ascending' : 'Descending'})
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-3.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs font-medium cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
