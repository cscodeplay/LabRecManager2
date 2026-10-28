'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    FolderOpen, Upload, HardDrive, FileText, FileSpreadsheet, Presentation,
    File, Image as ImageIcon, Music, Video, RefreshCw, X, Search, Check,
    ExternalLink, Clock, Sparkles, ChevronDown, ChevronRight
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function OfficeOpenImportMenu({
    currentApp = 'pdf', // 'pdf' | 'word' | 'excel' | 'presentation' | 'media' | 'converter'
    accept = '.pdf,application/pdf',
    onFileSelected,
    onOpenOfficeDoc,
    className = ''
}) {
    const router = useRouter();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef(null);
    const menuRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchMediaFiles = async () => {
        try {
            setLoadingFiles(true);
            const res = await api.get('/office/documents/media-files');
            if (res.data?.success && res.data.data?.files) {
                setMediaFiles(res.data.data.files);
            }
        } catch (err) {
            console.error('Failed to fetch office media files:', err);
            toast.error('Could not load Office Media Files');
        } finally {
            setLoadingFiles(false);
        }
    };

    const handleOpenModal = () => {
        setDropdownOpen(false);
        setModalOpen(true);
        fetchMediaFiles();
    };

    const handleNativeFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (onFileSelected) {
                onFileSelected(file);
            }
            toast.success(`Selected "${file.name}"`);
        }
        e.target.value = '';
        setDropdownOpen(false);
    };

    const handleSelectMediaFile = (fileItem) => {
        if (onOpenOfficeDoc) {
            onOpenOfficeDoc(fileItem);
            setModalOpen(false);
            return;
        }

        // Default navigation based on file type
        const ext = String(fileItem.fileType || '').toLowerCase();
        if (ext === 'pdf') {
            router.push(`/documents/pdf-studio?fileUrl=${encodeURIComponent(fileItem.url)}&title=${encodeURIComponent(fileItem.name)}`);
        } else if (['doc', 'docx'].includes(ext)) {
            router.push(`/documents/word-editor?docId=${fileItem.id}`);
        } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
            router.push(`/documents/excel-editor?docId=${fileItem.id}`);
        } else if (['ppt', 'pptx'].includes(ext)) {
            router.push(`/documents/slides-editor?docId=${fileItem.id}`);
        } else {
            window.open(fileItem.url, '_blank');
        }
        setModalOpen(false);
    };

    // Filtered files
    const filteredFiles = mediaFiles.filter((f) => {
        const ext = String(f.fileType || '').toLowerCase();
        const matchesSearch = f.name?.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (filterCategory === 'all') return true;
        if (filterCategory === 'pdf') return ext === 'pdf';
        if (filterCategory === 'word') return ['doc', 'docx'].includes(ext);
        if (filterCategory === 'excel') return ['xls', 'xlsx', 'csv'].includes(ext);
        if (filterCategory === 'presentation') return ['ppt', 'pptx'].includes(ext);
        if (filterCategory === 'image') return ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
        if (filterCategory === 'audio') return ['mp3', 'wav', 'm4a', 'ogg'].includes(ext);
        if (filterCategory === 'video') return ['mp4', 'webm'].includes(ext);
        return true;
    });

    const getFileIcon = (fileType) => {
        const ext = String(fileType || '').toLowerCase();
        if (ext === 'pdf') return <File className="w-4 h-4 text-rose-500" />;
        if (['doc', 'docx'].includes(ext)) return <FileText className="w-4 h-4 text-blue-500" />;
        if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
        if (['ppt', 'pptx'].includes(ext)) return <Presentation className="w-4 h-4 text-amber-500" />;
        if (['png', 'jpg', 'jpeg'].includes(ext)) return <ImageIcon className="w-4 h-4 text-purple-500" />;
        if (['mp3', 'wav', 'm4a'].includes(ext)) return <Music className="w-4 h-4 text-sky-500" />;
        if (['mp4', 'webm'].includes(ext)) return <Video className="w-4 h-4 text-indigo-500" />;
        return <File className="w-4 h-4 text-slate-400" />;
    };

    return (
        <div className={`relative inline-block ${className}`} ref={menuRef}>
            {/* Native Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleNativeFileChange}
                className="hidden"
            />

            {/* Menu Trigger Button */}
            <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                title="Open or Import Documents"
            >
                <FolderOpen className="w-3.5 h-3.5 text-rose-500" />
                <span>Open / Import</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Dropdown Popover */}
            {dropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1">
                        Open & Import Files
                    </div>

                    {/* Option 1: Open from Office Media Files */}
                    <button
                        type="button"
                        onClick={handleOpenModal}
                        className="w-full px-2.5 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors text-xs text-slate-800 dark:text-slate-200"
                    >
                        <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0">
                            <FolderOpen className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="font-semibold">Office Media Files</div>
                            <div className="text-[10px] text-slate-500">Access saved Office Suite documents</div>
                        </div>
                    </button>

                    {/* Option 2: Open from Device */}
                    <button
                        type="button"
                        onClick={() => {
                            setDropdownOpen(false);
                            fileInputRef.current?.click();
                        }}
                        className="w-full px-2.5 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors text-xs text-slate-800 dark:text-slate-200"
                    >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                            <Upload className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="font-semibold">Open from Device</div>
                            <div className="text-[10px] text-slate-500">Upload local files from computer</div>
                        </div>
                    </button>

                    {/* Option 3: Import from Google Drive / CloudVault */}
                    <button
                        type="button"
                        onClick={() => {
                            setDropdownOpen(false);
                            router.push('/documents?tab=drive');
                        }}
                        className="w-full px-2.5 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors text-xs text-slate-800 dark:text-slate-200"
                    >
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                            <HardDrive className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="font-semibold">Google Drive / CloudVault</div>
                            <div className="text-[10px] text-slate-500">Import connected cloud documents</div>
                        </div>
                    </button>
                </div>
            )}

            {/* Modal: Open from Office Media Files */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                                    <FolderOpen className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                                        Open from Office Media Files
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Access all documents, spreadsheets, presentations, and media saved across apps
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Search & Category Tabs */}
                        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2 bg-white dark:bg-slate-900">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search saved files by title..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                                />
                            </div>

                            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                                {[
                                    { id: 'all', label: 'All Files' },
                                    { id: 'pdf', label: 'PDFs' },
                                    { id: 'word', label: 'Word' },
                                    { id: 'excel', label: 'Excel' },
                                    { id: 'presentation', label: 'Slides' },
                                    { id: 'image', label: 'Images' },
                                    { id: 'audio', label: 'Audio' },
                                    { id: 'video', label: 'Video' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setFilterCategory(tab.id)}
                                        className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                                            filterCategory === tab.id
                                                ? 'bg-rose-500 text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* File List */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[220px]">
                            {loadingFiles ? (
                                <div className="h-44 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                                    <RefreshCw className="w-5 h-5 animate-spin text-rose-500" />
                                    <span>Loading Office Media Files...</span>
                                </div>
                            ) : filteredFiles.length === 0 ? (
                                <div className="h-44 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                                    <FolderOpen className="w-8 h-8 opacity-40 text-slate-400" />
                                    <span>No files found in this category.</span>
                                </div>
                            ) : (
                                filteredFiles.map((f) => (
                                    <div
                                        key={f.id}
                                        onClick={() => handleSelectMediaFile(f)}
                                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800/60 bg-white dark:bg-slate-850 hover:bg-rose-50/40 dark:hover:bg-rose-950/20 cursor-pointer flex items-center justify-between transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                {getFileIcon(f.fileType)}
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-slate-800 dark:text-white group-hover:text-rose-600 transition-colors">
                                                    {f.name}
                                                </div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                                    <span>{f.folder?.name || 'Office Media Files'}</span>
                                                    <span>•</span>
                                                    <span>{(f.fileSize / 1024).toFixed(1)} KB</span>
                                                    <span>•</span>
                                                    <span>{new Date(f.updatedAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Open
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs text-slate-500">
                            <span>{filteredFiles.length} file(s) available</span>
                            <button
                                type="button"
                                onClick={() => router.push('/documents')}
                                className="text-rose-600 hover:underline flex items-center gap-1 font-medium"
                            >
                                Manage in Documents <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
