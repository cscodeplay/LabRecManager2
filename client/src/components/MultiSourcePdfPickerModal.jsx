'use client';

import React, { useState, useEffect } from 'react';
import {
    X, Search, Folder, Cloud, HardDrive, FileText, RefreshCw,
    Download, Check, AlertCircle, ArrowRight
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function MultiSourcePdfPickerModal({
    isOpen,
    onClose,
    initialTab = 'pdf-folder', // 'pdf-folder' | 'drive' | 'user-docs'
    onSelectPdf
}) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
            setSearchQuery('');
            setErrorMsg('');
            loadTabFiles(initialTab);
        }
    }, [isOpen, initialTab]);

    const loadTabFiles = async (tab) => {
        setLoading(true);
        setErrorMsg('');
        setFiles([]);

        try {
            if (tab === 'pdf-folder') {
                // Fetch from Office Media Files, filtering for PDF documents
                const res = await api.get('/office/documents/media-files');
                if (res.data?.success && res.data.data?.files) {
                    const pdfOnly = res.data.data.files.filter(f => {
                        const name = (f.name || '').toLowerCase();
                        const type = (f.fileType || '').toLowerCase();
                        return name.endsWith('.pdf') || type === 'pdf';
                    });
                    setFiles(pdfOnly);
                } else {
                    setFiles([]);
                }
            } else if (tab === 'drive') {
                // Fetch from Google Drive API
                try {
                    const res = await api.get('/drive/files', {
                        params: { mimeType: 'application/pdf' }
                    });
                    const driveFiles = res.data?.data?.files || res.data?.files || [];
                    const pdfOnly = driveFiles.filter(f => {
                        const name = (f.name || '').toLowerCase();
                        const mime = (f.mimeType || '').toLowerCase();
                        return name.endsWith('.pdf') || mime.includes('pdf');
                    });
                    setFiles(pdfOnly);
                } catch (err) {
                    console.warn('Google Drive fetch error:', err);
                    setErrorMsg('Could not connect to Google Drive. Please ensure Google Drive account is linked in settings.');
                    setFiles([]);
                }
            } else if (tab === 'user-docs') {
                // Fetch from User CloudVault Documents
                try {
                    const res = await api.get('/documents');
                    const allDocs = res.data?.data?.documents || res.data?.documents || [];
                    const pdfOnly = allDocs.filter(d => {
                        const title = (d.title || d.name || '').toLowerCase();
                        const mime = (d.mimeType || d.fileType || '').toLowerCase();
                        return title.endsWith('.pdf') || mime.includes('pdf');
                    });
                    setFiles(pdfOnly);
                } catch (err) {
                    console.warn('User Documents fetch error:', err);
                    setErrorMsg('Could not retrieve CloudVault documents.');
                    setFiles([]);
                }
            }
        } catch (err) {
            console.error('Failed to load files for tab:', tab, err);
            setErrorMsg('Failed to load files from storage provider.');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setSearchQuery('');
        loadTabFiles(newTab);
    };

    if (!isOpen) return null;

    const filteredFiles = files.filter(f => {
        const name = (f.name || f.title || '').toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    const formatFileSize = (bytesOrMb) => {
        if (!bytesOrMb) return 'Unknown size';
        if (typeof bytesOrMb === 'string' && bytesOrMb.includes('MB')) return bytesOrMb;
        const num = parseFloat(bytesOrMb);
        if (isNaN(num)) return 'Unknown';
        if (num > 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(2)} MB`;
        if (num > 1024) return `${(num / 1024).toFixed(1)} KB`;
        if (num < 100) return `${num.toFixed(1)} MB`; // In case stored as MB
        return `${num} B`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                                <FileText className="w-4 h-4" />
                            </span>
                            Select PDF Document
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Choose a PDF from your CloudVault library, Google Drive, or user documents
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50/30 dark:bg-slate-950/30">
                    <button
                        onClick={() => handleTabChange('pdf-folder')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                            activeTab === 'pdf-folder'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Folder className="w-3.5 h-3.5" />
                        <span>PDF Documents Folder</span>
                    </button>

                    <button
                        onClick={() => handleTabChange('drive')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                            activeTab === 'drive'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Google Drive</span>
                    </button>

                    <button
                        onClick={() => handleTabChange('user-docs')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                            activeTab === 'user-docs'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <HardDrive className="w-3.5 h-3.5" />
                        <span>User CloudVault</span>
                    </button>
                </div>

                {/* Search & Actions */}
                <div className="px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Search ${activeTab === 'pdf-folder' ? 'PDF Documents folder' : activeTab === 'drive' ? 'Google Drive' : 'CloudVault documents'}...`}
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-none text-slate-800 dark:text-slate-200"
                        />
                    </div>
                    <button
                        onClick={() => loadTabFiles(activeTab)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                        title="Refresh file list"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* File List Body */}
                <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
                            <span className="text-xs">Fetching PDF documents...</span>
                        </div>
                    ) : errorMsg ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 px-6 text-center">
                            <AlertCircle className="w-8 h-8 text-amber-500" />
                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{errorMsg}</span>
                            <button
                                onClick={() => loadTabFiles(activeTab)}
                                className="mt-2 px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 text-center">
                            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {searchQuery ? 'No PDF documents match your search' : 'No PDF documents found in this location'}
                            </span>
                            <span className="text-[11px] text-slate-400 max-w-sm">
                                {activeTab === 'pdf-folder'
                                    ? 'Exported PDFs saved to CloudVault > PDF Documents will appear here.'
                                    : activeTab === 'drive'
                                    ? 'PDF files from your linked Google Drive account will appear here.'
                                    : 'Upload PDFs to your CloudVault documents to view them here.'}
                            </span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {filteredFiles.map((f, idx) => {
                                const fileName = f.name || f.title || 'Untitled Document.pdf';
                                const fileSize = formatFileSize(f.size || f.fileSize);
                                const fileDate = f.updatedAt || f.modifiedTime || f.createdAt;
                                const dateFormatted = fileDate ? new Date(fileDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

                                return (
                                    <div
                                        key={f.id || f.fileId || idx}
                                        onClick={() => {
                                            onSelectPdf(f);
                                            onClose();
                                        }}
                                        className="group p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-rose-500 dark:hover:border-rose-500 bg-white dark:bg-slate-900 hover:bg-rose-50/20 dark:hover:bg-rose-950/20 transition flex items-center justify-between cursor-pointer shadow-xs"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-rose-600 transition" title={fileName}>
                                                    {fileName}
                                                </div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                    <span>{fileSize}</span>
                                                    {dateFormatted && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{dateFormatted}</span>
                                                        </>
                                                    )}
                                                    {f.folderName && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="font-mono text-slate-500">{f.folderName}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-rose-600 group-hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ml-2 shadow-xs"
                                        >
                                            <span>Open</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50 text-xs text-slate-400">
                    <span>{filteredFiles.length} PDF file{filteredFiles.length === 1 ? '' : 's'} available</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
