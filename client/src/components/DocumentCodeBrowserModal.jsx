'use client';

import React, { useState, useEffect } from 'react';
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
    FileSpreadsheet
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

    // Fetch student's folders and code documents
    useEffect(() => {
        if (!isOpen) return;

        async function fetchDocs() {
            setLoading(true);
            try {
                // 1. Fetch folders
                const foldersRes = await foldersAPI.getAll();
                const fetchedFolders = foldersRes.data?.data || [];
                setFolders(fetchedFolders);

                // Find Python or SQL folder as default
                const targetFolder = fetchedFolders.find((f) =>
                    f.name.toLowerCase() === defaultLanguage.toLowerCase()
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
                const fetchedDocs = docsRes.data?.data || [];
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

    if (!isOpen) return null;

    // Filter documents
    const filteredDocs = documents.filter((doc) => {
        const matchesFolder =
            selectedFolderId === 'all' || doc.folderId === selectedFolderId;
        const matchesSearch =
            !searchQuery ||
            doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.fileName?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFolder && matchesSearch;
    });

    const handleSelectDocument = async (doc, asNewTab = false) => {
        setOpeningDocId(doc.id);
        try {
            // Fetch raw file text
            const downloadUrl = `/api/documents/${doc.id}/file`;
            const response = await fetch(downloadUrl);
            if (!response.ok) {
                throw new Error('Failed to download document content');
            }
            const codeText = await response.text();

            const isSql = doc.name?.endsWith('.sql') || doc.fileName?.endsWith('.sql');
            const lang = isSql ? 'sql' : 'python';

            onOpenFile({
                name: doc.name || doc.fileName,
                code: codeText,
                language: lang,
                documentId: doc.id,
                asNewTab
            });

            toast.success(`Opened "${doc.name}" in editor`);
            onClose();
        } catch (err) {
            console.error('Error opening doc:', err);
            toast.error('Failed to read code document content: ' + err.message);
        } finally {
            setOpeningDocId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <FolderOpen className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white">
                                Open Script from Documents
                            </h2>
                            <p className="text-[11px] text-slate-400">
                                Browse saved Python scripts and SQL queries from your cloud folders
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Filter & Search Bar */}
                <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
                    {/* Folder Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                        <button
                            onClick={() => setSelectedFolderId('all')}
                            className={`px-3 py-1 rounded-md font-medium transition ${
                                selectedFolderId === 'all'
                                    ? 'bg-primary-600 text-white font-semibold'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                            All Files ({documents.length})
                        </button>
                        {folders.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setSelectedFolderId(f.id)}
                                className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                                    selectedFolderId === f.id
                                        ? 'bg-amber-600 text-white font-semibold'
                                        : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                            >
                                <span className="font-mono">{f.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search saved files..."
                            className="w-full pl-8 pr-3 py-1 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-200 focus:outline-none focus:border-primary-500 placeholder-slate-600"
                        />
                    </div>
                </div>

                {/* Documents List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-primary-400" />
                            <span className="text-xs">Fetching your documents...</span>
                        </div>
                    ) : filteredDocs.length > 0 ? (
                        filteredDocs.map((doc) => {
                            const isSql = doc.name?.endsWith('.sql') || doc.fileName?.endsWith('.sql');
                            const isOpening = openingDocId === doc.id;

                            return (
                                <div
                                    key={doc.id}
                                    className="p-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between gap-4 transition hover:bg-slate-950/80 group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                                isSql
                                                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            }`}
                                        >
                                            {isSql ? 'SQL' : 'PY'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-200 truncate group-hover:text-primary-300">
                                                {doc.name || doc.fileName}
                                            </p>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 font-mono">
                                                <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                                                <span>•</span>
                                                <span>
                                                    {doc.updatedAt
                                                        ? new Date(doc.updatedAt).toLocaleDateString()
                                                        : 'Saved'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleSelectDocument(doc, false)}
                                            disabled={isOpening}
                                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                        >
                                            {isOpening ? (
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <ExternalLink className="w-3 h-3" />
                                            )}
                                            <span>Open</span>
                                        </button>

                                        <button
                                            onClick={() => handleSelectDocument(doc, true)}
                                            disabled={isOpening}
                                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                            title="Open in a new tab"
                                        >
                                            <Plus className="w-3 h-3" />
                                            <span>New Tab</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-center">
                            <FileCode className="w-10 h-10 mb-2 stroke-1 text-slate-600" />
                            <p className="text-xs font-semibold text-slate-400">
                                No code documents found
                            </p>
                            <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                                Save your scripts from the IDE to have them appear in your Documents
                                folder!
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-500">
                    <span>
                        Tip: Files saved here are accessible from any device upon login.
                    </span>
                    <button
                        onClick={onClose}
                        className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
