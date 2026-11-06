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
    SlidersHorizontal,
    HardDrive,
    Pencil,
    Trash2,
    AlertTriangle,
    CheckCircle2
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

    // Edit Document Dialog state
    const [editingDoc, setEditingDoc] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

    // Inline Rename state for file browser
    const [inlineEditingDocId, setInlineEditingDocId] = useState(null);
    const [inlineRenameText, setInlineRenameText] = useState('');
    const [isInlineSaving, setIsInlineSaving] = useState(false);

    // Delete Confirmation Dialog state
    const [deletingDoc, setDeletingDoc] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch student's folders and code documents
    const fetchDocs = async () => {
        setLoading(true);
        try {
            // Fetch folders and code documents concurrently for fastest load
            const [foldersRes, docsRes] = await Promise.all([
                foldersAPI.getAll({ all: 'true' }),
                documentsAPI.getAll({ category: 'code' })
            ]);

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
    };

    useEffect(() => {
        if (!isOpen) return;
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
            setSortOrder(field === 'name' || field === 'folder' ? 'asc' : 'desc');
        }
    };

    // Filter & Sort
    const rawSafeDocs = Array.isArray(documents) ? documents : [];
    const safeDocuments = useMemo(() => {
        const seen = new Map();
        const result = [];
        for (const doc of rawSafeDocs) {
            const key = `${doc.folderId || 'root'}::${(doc.name || doc.fileName || '').trim().toLowerCase()}`;
            if (!seen.has(key)) {
                seen.set(key, true);
                result.push(doc);
            }
        }
        return result;
    }, [rawSafeDocs]);
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

    // Validation for Edit Modal: Ensure unique filename in the same folder
    const editDuplicateConflict = useMemo(() => {
        if (!editingDoc || !editingName.trim()) return null;
        const targetClean = editingName.trim().toLowerCase();
        const conflict = safeDocuments.find((d) => {
            if (d.id === editingDoc.id) return false;
            // Check same folder
            if (d.folderId !== editingDoc.folderId) return false;
            const docName = (d.name || '').trim().toLowerCase();
            const docFileName = (d.fileName || '').trim().toLowerCase();
            return docName === targetClean || docFileName === targetClean;
        });
        return conflict || null;
    }, [editingDoc, editingName, safeDocuments]);

    // Live validation for Inline Rename in the table
    const inlineDuplicateConflict = useMemo(() => {
        if (!inlineEditingDocId || !inlineRenameText.trim()) return null;
        const targetDoc = safeDocuments.find((d) => d.id === inlineEditingDocId);
        if (!targetDoc) return null;
        const targetClean = inlineRenameText.trim().toLowerCase();
        const conflict = safeDocuments.find((d) => {
            if (d.id === targetDoc.id) return false;
            if (d.folderId !== targetDoc.folderId) return false;
            const docName = (d.name || '').trim().toLowerCase();
            const docFileName = (d.fileName || '').trim().toLowerCase();
            return docName === targetClean || docFileName === targetClean;
        });
        return conflict || null;
    }, [inlineEditingDocId, inlineRenameText, safeDocuments]);

    if (!isOpen) return null;

    // Handle Open Document (Always opens in new tab as requested)
    const handleSelectDocument = async (doc, asNewTab = true) => {
        setOpeningDocId(doc.id);
        try {
            let codeText = '';

            // Fast path: Immediately decode PostgreSQL data URL if present
            if (doc.url && doc.url.startsWith('data:')) {
                try {
                    const commaIdx = doc.url.indexOf(',');
                    const header = doc.url.substring(0, commaIdx);
                    const rawData = doc.url.substring(commaIdx + 1);
                    const isBase64 = header.includes(';base64');
                    const txt = isBase64 ? atob(rawData) : decodeURIComponent(rawData);
                    if (txt && txt.trim()) {
                        codeText = txt;
                    }
                } catch (decodeErr) {
                    console.warn('[DocModal] Data URL direct decode error:', decodeErr.message);
                }
            }

            if (!codeText || !codeText.trim()) {
                try {
                    const response = await documentsAPI.getFileContent(doc.id);
                    codeText = typeof response.data === 'string' ? response.data : String(response.data || '');
                } catch (apiErr) {
                    console.warn('[DocModal] Primary getFileContent failed, attempting fallbacks:', apiErr.message);
                }
            }

            // Fallback 1: Direct fetch via doc.url
            if (!codeText || !codeText.trim()) {
                if (doc.url && !doc.url.startsWith('data:')) {
                    try {
                        const directUrl = doc.url.startsWith('http') || doc.url.startsWith('/') ? doc.url : `/${doc.url}`;
                        const directRes = await fetch(directUrl);
                        if (directRes.ok) {
                            const txt = await directRes.text();
                            if (txt && txt.trim()) codeText = txt;
                        }
                    } catch (_) {}
                }
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

            const isSql = doc.name?.endsWith('.sql') || doc.fileName?.endsWith('.sql') || doc.category === 'sql';
            const lang = isSql ? 'sql' : 'python';

            onOpenFile({
                name: doc.name || doc.fileName,
                code: codeText,
                language: lang,
                documentId: doc.id,
                folderId: doc.folderId,
                description: doc.description,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt || doc.createdAt,
                asNewTab: true
            });

            onClose();
        } catch (err) {
            console.error('Error opening doc:', err);
            toast.error('Failed to read code document content: ' + (err.response?.data?.message || err.message));
        } finally {
            setOpeningDocId(null);
        }
    };

    // Handle Edit / Rename Document
    const handleStartEdit = (doc, e) => {
        if (e) e.stopPropagation();
        setEditingDoc(doc);
        setEditingName(doc.name || doc.fileName || '');
    };

    const handleSaveEdit = async (e) => {
        if (e) e.preventDefault();
        if (!editingDoc || !editingName.trim()) return;

        const cleanName = editingName.trim();
        if (cleanName === (editingDoc.name || editingDoc.fileName)) {
            setEditingDoc(null);
            setEditingName('');
            return;
        }

        if (editDuplicateConflict) {
            toast.error(`A file named "${cleanName}" already exists in this folder!`);
            return;
        }

        setIsSubmittingEdit(true);
        try {
            const res = await documentsAPI.update(editingDoc.id, {
                name: cleanName,
                fileName: cleanName
            });

            const updatedDoc = res.data?.data?.document || res.data?.document;
            setDocuments((prev) =>
                prev.map((d) => (d.id === editingDoc.id ? { ...d, name: cleanName, fileName: cleanName, updatedAt: new Date().toISOString() } : d))
            );

            toast.success(`Renamed document to "${cleanName}"`);
            setEditingDoc(null);
            setEditingName('');
        } catch (err) {
            console.error('Rename error:', err);
            toast.error(err.response?.data?.message || 'Failed to update document name');
        } finally {
            setIsSubmittingEdit(false);
        }
    };

    // Handle Inline Rename in Document Browser
    const handleStartInlineRename = (doc, e) => {
        if (e) e.stopPropagation();
        setInlineEditingDocId(doc.id);
        setInlineRenameText(doc.name || doc.fileName || '');
    };

    const handleCancelInlineRename = (e) => {
        if (e) e.stopPropagation();
        setInlineEditingDocId(null);
        setInlineRenameText('');
    };

    const handleSaveInlineRename = async (doc, e) => {
        if (e) e.stopPropagation();
        if (!inlineRenameText.trim()) {
            toast.error('Filename cannot be empty');
            return;
        }

        const cleanName = inlineRenameText.trim();
        if (cleanName === (doc.name || doc.fileName)) {
            setInlineEditingDocId(null);
            setInlineRenameText('');
            return;
        }

        if (inlineDuplicateConflict) {
            toast.error(`A file named "${cleanName}" already exists in this folder!`);
            return;
        }

        setIsInlineSaving(true);
        try {
            await documentsAPI.update(doc.id, {
                name: cleanName,
                fileName: cleanName
            });

            setDocuments((prev) =>
                prev.map((d) => (d.id === doc.id ? { ...d, name: cleanName, fileName: cleanName, updatedAt: new Date().toISOString() } : d))
            );

            toast.success(`Renamed file to "${cleanName}"`);
            setInlineEditingDocId(null);
            setInlineRenameText('');
        } catch (err) {
            console.error('Inline rename error:', err);
            toast.error(err.response?.data?.message || 'Failed to update document name');
        } finally {
            setIsInlineSaving(false);
        }
    };

    // Handle Delete Document
    const handleStartDelete = (doc, e) => {
        if (e) e.stopPropagation();
        setDeletingDoc(doc);
    };

    const handleConfirmDelete = async () => {
        if (!deletingDoc) return;
        setIsDeleting(true);
        try {
            await documentsAPI.delete(deletingDoc.id);
            setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id));
            toast.success(`Deleted "${deletingDoc.name || deletingDoc.fileName}"`);
            setDeletingDoc(null);
        } catch (err) {
            console.error('Delete error:', err);
            toast.error(err.response?.data?.message || 'Failed to delete document');
        } finally {
            setIsDeleting(false);
        }
    };

    const renderSortArrow = (field) => {
        if (sortField !== field) {
            return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100" />;
        }
        return sortOrder === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-amber-600 font-bold" />
        ) : (
            <ArrowDown className="w-3.5 h-3.5 text-amber-600 font-bold" />
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
            {/* Main Modal Container (Clean Light Theme) */}
            <div data-modal="document-code-browser" className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl text-slate-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                            <FolderOpen className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                Open Script from Documents
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-600 font-medium font-mono">
                                    {sortedDocs.length} {sortedDocs.length === 1 ? 'file' : 'files'}
                                </span>
                            </h2>
                            <p className="text-[11px] text-slate-500">
                                Open programs in a new tab, organize cloud files, edit filenames, or delete scripts
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
                        title="Close modal (Esc)"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Filter & Quick Sort Toolbar */}
                <div className="p-3 sm:px-5 sm:py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Folder Select Filter */}
                        <div className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 text-xs transition shadow-2xs">
                            <FolderOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <label htmlFor="folder-select-filter" className="text-[11px] text-slate-500 font-medium">Folder:</label>
                            <select
                                id="folder-select-filter"
                                value={selectedFolderId}
                                onChange={(e) => setSelectedFolderId(e.target.value)}
                                className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer pr-1"
                            >
                                <option value="all" className="bg-white text-slate-800">
                                    📁 All Folders ({safeDocuments.length})
                                </option>
                                {safeFolders.map((f) => {
                                    const count = safeDocuments.filter((d) => d.folderId === f.id).length;
                                    return (
                                        <option key={f.id} value={f.id} className="bg-white text-slate-800">
                                            📁 {f.name} ({count})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Quick Sort Dropdown */}
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 text-xs transition shadow-2xs">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Sort:</span>
                            <select
                                value={`${sortField}-${sortOrder}`}
                                onChange={(e) => {
                                    const [f, o] = e.target.value.split('-');
                                    setSortField(f);
                                    setSortOrder(o);
                                }}
                                className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer pr-1"
                            >
                                <option value="createdAt-desc" className="bg-white text-slate-800">Creation Date (Newest first)</option>
                                <option value="createdAt-asc" className="bg-white text-slate-800">Creation Date (Oldest first)</option>
                                <option value="name-asc" className="bg-white text-slate-800">Filename (A → Z)</option>
                                <option value="name-desc" className="bg-white text-slate-800">Filename (Z → A)</option>
                                <option value="updatedAt-desc" className="bg-white text-slate-800">Last Modified (Recent first)</option>
                                <option value="fileSize-desc" className="bg-white text-slate-800">Size (Largest first)</option>
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
                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-amber-500 placeholder-slate-400 transition shadow-2xs"
                        />
                    </div>
                </div>

                {/* Table Header Row */}
                <div className="grid grid-cols-12 gap-2 sm:gap-3 px-5 py-2.5 bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 select-none">
                    {/* Filename Column Header */}
                    <button
                        onClick={() => handleColumnSort('name')}
                        className="col-span-12 sm:col-span-3 flex items-center gap-1.5 hover:text-slate-900 transition group text-left cursor-pointer"
                        title="Click to sort by filename"
                    >
                        <span>Filename / Script</span>
                        {renderSortArrow('name')}
                    </button>

                    {/* Folder / Type Column Header */}
                    <button
                        onClick={() => handleColumnSort('folder')}
                        className="hidden sm:flex col-span-2 items-center gap-1.5 hover:text-slate-900 transition group cursor-pointer"
                        title="Click to sort by folder/type"
                    >
                        <span>Folder / Type</span>
                        {renderSortArrow('folder')}
                    </button>

                    {/* Creation Date Column Header */}
                    <button
                        onClick={() => handleColumnSort('createdAt')}
                        className={`hidden sm:flex col-span-2 items-center gap-1.5 transition group cursor-pointer ${
                            sortField === 'createdAt' ? 'text-amber-700 font-bold' : 'hover:text-slate-900'
                        }`}
                        title="Click to sort creation datewise"
                    >
                        <Calendar className="w-3 h-3 text-slate-500 group-hover:text-amber-700" />
                        <span>Created</span>
                        {renderSortArrow('createdAt')}
                    </button>

                    {/* Updated Date Column Header */}
                    <button
                        onClick={() => handleColumnSort('updatedAt')}
                        className={`hidden md:flex col-span-2 items-center gap-1.5 transition group cursor-pointer ${
                            sortField === 'updatedAt' ? 'text-amber-700 font-bold' : 'hover:text-slate-900'
                        }`}
                        title="Click to sort by updated date"
                    >
                        <Clock className="w-3 h-3 text-slate-500 group-hover:text-amber-700" />
                        <span>Updated</span>
                        {renderSortArrow('updatedAt')}
                    </button>

                    {/* File Size Column Header */}
                    <button
                        onClick={() => handleColumnSort('fileSize')}
                        className={`hidden md:flex col-span-1 items-center gap-1 hover:text-slate-900 transition group cursor-pointer justify-end pr-1 ${
                            sortField === 'fileSize' ? 'text-amber-700 font-bold' : 'hover:text-slate-900'
                        }`}
                        title="Click to sort by file size"
                    >
                        <span>Size</span>
                        {renderSortArrow('fileSize')}
                    </button>

                    {/* Actions Column Header */}
                    <div className="col-span-12 sm:col-span-2 flex items-center justify-end text-slate-600 font-bold pr-1">
                        <span>Actions</span>
                    </div>
                </div>

                {/* Documents List */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5">
                    {loading ? (
                        <div className="py-14 flex flex-col items-center justify-center text-slate-400 gap-2">
                            <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
                            <span className="text-xs text-slate-500 font-medium">Fetching documents...</span>
                        </div>
                    ) : sortedDocs.length > 0 ? (
                        sortedDocs.map((doc) => {
                            const isSql = doc.name?.endsWith('.sql') || doc.fileName?.endsWith('.sql') || doc.category === 'sql';
                            const isOpening = openingDocId === doc.id;
                            const folderName = folderMap[doc.folderId] || (isSql ? 'SQL' : 'Python');
                            const created = formatDate(doc.createdAt);
                            const updated = formatDate(doc.updatedAt || doc.createdAt);

                            return (
                                <div
                                    key={doc.id}
                                    data-doc-row={doc.id}
                                    onClick={(e) => {
                                        if (e.target.closest('button, input')) return;
                                        handleSelectDocument(doc, true);
                                    }}
                                    className="grid grid-cols-12 gap-2 sm:gap-3 items-center p-2.5 sm:px-3 bg-white hover:bg-amber-50/40 border border-slate-200/90 hover:border-amber-300/80 rounded-xl transition-all shadow-2xs group cursor-pointer"
                                >
                                    {/* Filename & Icon (col-span-12 sm:col-span-3) */}
                                    <div className="col-span-12 sm:col-span-3 flex items-center gap-2.5 min-w-0">
                                        <div
                                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] flex-shrink-0 ${
                                                isSql
                                                    ? 'bg-sky-100 text-sky-700 border border-sky-300'
                                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                            }`}
                                        >
                                            {isSql ? 'SQL' : 'PY'}
                                        </div>
                                        {inlineEditingDocId === doc.id ? (
                                            <div className="min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="text"
                                                        value={inlineRenameText}
                                                        onChange={(e) => setInlineRenameText(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveInlineRename(doc, e);
                                                            if (e.key === 'Escape') handleCancelInlineRename(e);
                                                        }}
                                                        autoFocus
                                                        className={`w-full text-xs font-bold px-2 py-1 rounded border bg-white focus:outline-none focus:ring-2 ${
                                                            inlineDuplicateConflict
                                                                ? 'border-rose-400 focus:ring-rose-200 text-rose-700'
                                                                : 'border-amber-400 focus:ring-amber-200 text-slate-900'
                                                        }`}
                                                        placeholder="Filename..."
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled={isInlineSaving || !!inlineDuplicateConflict || !inlineRenameText.trim()}
                                                        onClick={(e) => handleSaveInlineRename(doc, e)}
                                                        className="p-1 text-emerald-700 hover:bg-emerald-100 rounded disabled:opacity-40 transition cursor-pointer"
                                                        title="Save rename (Enter)"
                                                        aria-label="Save rename"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleCancelInlineRename(e)}
                                                        className="p-1 text-slate-500 hover:bg-slate-200 rounded transition cursor-pointer"
                                                        title="Cancel (Esc)"
                                                        aria-label="Cancel rename"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                {inlineDuplicateConflict && (
                                                    <p className="text-[10px] font-semibold text-rose-600 mt-0.5 flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                                        Duplicate name in folder
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                                                <div className="flex items-center gap-1.5 group/fname">
                                                    <p
                                                        className="text-xs font-bold text-slate-800 truncate group-hover:text-amber-700 transition cursor-pointer"
                                                        onClick={() => handleSelectDocument(doc, true)}
                                                        title={`Click to open ${doc.name || doc.fileName} in new tab`}
                                                    >
                                                        {doc.name || doc.fileName}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleStartInlineRename(doc, e)}
                                                        className="p-1 text-slate-400 hover:text-amber-700 rounded transition opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-amber-100/70 cursor-pointer"
                                                        title="Rename file inline"
                                                        aria-label="Rename file inline"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                {/* Mobile-only secondary info */}
                                                <div className="flex sm:hidden items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                                    <span className="text-amber-700 font-medium">{folderName}</span>
                                                    <span>•</span>
                                                    <span>{created.date}</span>
                                                    <span>•</span>
                                                    <span className="font-mono text-slate-600">{formatFileSize(doc.fileSize)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Folder / Type (col-span-2) */}
                                    <div className="hidden sm:flex col-span-2 items-center gap-1.5 min-w-0">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                            isSql
                                                ? 'bg-sky-50 text-sky-800 border-sky-200'
                                                : 'bg-amber-50 text-amber-800 border-amber-200'
                                        }`}>
                                            {folderName}
                                        </span>
                                    </div>

                                    {/* Created Date (col-span-2) */}
                                    <div className="hidden sm:flex col-span-2 flex-col justify-center text-[11px] min-w-0">
                                        <span className="text-slate-800 font-medium">{created.date}</span>
                                        <span className="text-[10px] text-slate-400">{created.time}</span>
                                    </div>

                                    {/* Updated Date (col-span-2) */}
                                    <div className="hidden md:flex col-span-2 flex-col justify-center text-[11px] min-w-0">
                                        <span className="text-slate-800 font-medium">{updated.date}</span>
                                        <span className="text-[10px] text-amber-700/80 font-mono">{updated.time}</span>
                                    </div>

                                    {/* File Size (col-span-1) */}
                                    <div className="hidden md:flex col-span-1 justify-end pr-1 items-center">
                                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold shadow-2xs">
                                            {formatFileSize(doc.fileSize)}
                                        </span>
                                    </div>

                                    {/* Action Buttons: Delete, Open (col-span-2) */}
                                    <div className="col-span-12 sm:col-span-2 flex items-center justify-end gap-1.5">
                                        {/* Delete Button */}
                                        <button
                                            onClick={(e) => handleStartDelete(doc, e)}
                                            className="p-1.5 rounded-md text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 border border-rose-200 hover:border-rose-300 transition cursor-pointer"
                                            title="Delete document"
                                            aria-label="Delete document"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Open in New Tab Button */}
                                        <button
                                            onClick={() => handleSelectDocument(doc, true)}
                                            disabled={isOpening}
                                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 flex items-center gap-1 cursor-pointer shadow-xs"
                                            title="Open script in new tab"
                                        >
                                            {isOpening ? (
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <ExternalLink className="w-3 h-3" />
                                            )}
                                            <span>Open</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-14 flex flex-col items-center justify-center text-slate-400 text-center">
                            <FileCode className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
                            <p className="text-xs font-bold text-slate-700">
                                No code documents found
                            </p>
                            <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                                {searchQuery ? 'No scripts match your search.' : 'Save scripts from the IDE to have them appear in your cloud folders!'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer with Summary & Help */}
                <div className="px-5 py-2.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2 text-[11px]">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>
                            Sorted by: <strong className="text-slate-800 font-semibold">
                                {sortField === 'createdAt' ? 'Creation Date' : sortField === 'name' ? 'Filename' : sortField === 'updatedAt' ? 'Last Modified' : sortField === 'fileSize' ? 'Size' : 'Folder'}
                            </strong> ({sortOrder === 'asc' ? 'Ascending' : 'Descending'})
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-3.5 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 transition text-xs font-medium cursor-pointer shadow-2xs"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* EDIT / RENAME DOCUMENT MODAL */}
            {editingDoc && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-2xs animate-in fade-in">
                    <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl p-5 text-slate-800">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                                    <Pencil className="w-3.5 h-3.5" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">Rename Script</h3>
                            </div>
                            <button
                                onClick={() => setEditingDoc(null)}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Filename:
                                </label>
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    placeholder="Enter filename..."
                                    className={`w-full px-3 py-2 text-xs rounded-lg border bg-white focus:outline-none transition ${
                                        editDuplicateConflict
                                            ? 'border-rose-400 text-rose-800 focus:border-rose-500 bg-rose-50/30'
                                            : 'border-slate-300 text-slate-800 focus:border-amber-500'
                                    }`}
                                    autoFocus
                                />
                            </div>

                            {/* Duplicate Warning */}
                            {editDuplicateConflict && (
                                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                                    <span>
                                        A file named <strong>&quot;{editingName.trim()}&quot;</strong> already exists in this folder. Duplicate filenames are not allowed in the same folder.
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingDoc(null)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingEdit || !editingName.trim() || !!editDuplicateConflict}
                                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-xs"
                                >
                                    {isSubmittingEdit ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    <span>Save Changes</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION DIALOG */}
            {deletingDoc && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-2xs animate-in fade-in">
                    <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm shadow-2xl p-5 text-slate-800">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                                <Trash2 className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Delete Script?</h3>
                                <p className="text-xs text-slate-500">This will remove the file from your Documents.</p>
                            </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 truncate mb-4">
                            📄 {deletingDoc.name || deletingDoc.fileName}
                        </div>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeletingDoc(null)}
                                disabled={isDeleting}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-xs"
                            >
                                {isDeleting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                <span>Delete Script</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
