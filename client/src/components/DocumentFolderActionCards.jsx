'use client';

import React, { useState, useEffect } from 'react';
import { 
    Folder, FolderInput, FileText, CheckCircle2, Loader2, ExternalLink, 
    X, Check, ChevronRight, HardDrive, ArrowRight, CornerDownRight, Tag 
} from 'lucide-react';
import api, { foldersAPI } from '@/lib/api';
import toast from 'react-hot-toast';

/**
 * Interactive card that allows users to confirm and save an uploaded file directly
 * into any document folder in the school's Document Repository.
 */
export function DocumentSaveToFolderCard({ action }) {
    const [folders, setFolders] = useState(action?.availableFolders || []);
    const [selectedFolderId, setSelectedFolderId] = useState(action?.folderId || '');
    const [docName, setDocName] = useState(action?.name || (action?.fileName ? action.fileName.replace(/\.[^.]+$/, '') : 'Document'));
    const [category, setCategory] = useState(action?.category || 'other');
    const [isConfirmed, setIsConfirmed] = useState(action?.isConfirmed || false);
    const [isSaving, setIsSaving] = useState(false);
    const [savedDoc, setSavedDoc] = useState(null);

    useEffect(() => {
        if (!folders || folders.length === 0) {
            foldersAPI.getAll()
                .then(res => {
                    const list = res.data?.data?.folders || res.data?.folders || [];
                    setFolders(list.map(f => ({ id: f.id, name: f.name })));
                })
                .catch(() => {});
        }
    }, []);

    const formatBytes = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await api.post('/admin/chatbot/save-to-folder', {
                fileName: action?.fileName,
                localFileName: action?.localFileName,
                folderId: selectedFolderId || null,
                name: docName.trim() || action?.fileName,
                category,
                isPublic: false
            });

            if (res.data.success) {
                setIsConfirmed(true);
                setSavedDoc(res.data.data?.document);
                toast.success('Document saved to folder successfully!');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save document to folder');
        } finally {
            setIsSaving(false);
        }
    };

    const currentFolderName = folders.find(f => f.id === selectedFolderId)?.name || 'Root Folder (All Documents)';

    if (isConfirmed) {
        return (
            <div className="mt-2.5 p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Document Saved to Folder!
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold">
                        SAVED
                    </span>
                </div>
                <div className="p-2.5 bg-white/90 dark:bg-slate-800/90 rounded-xl border border-emerald-100 dark:border-emerald-900 text-slate-700 dark:text-slate-300 space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Document:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[200px]">{docName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Folder:</span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <Folder className="w-3 h-3" /> {currentFolderName}
                        </span>
                    </div>
                </div>
                <div className="flex items-center justify-end">
                    <a
                        href="/admin/documents"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition"
                    >
                        View in Documents <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-2.5 p-3.5 bg-indigo-50/70 dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl text-xs space-y-3 animate-in fade-in shadow-xs">
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-indigo-950 dark:text-indigo-200">
                    <FolderInput className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Save to Document Folder
                </span>
                {action?.fileSize && (
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-indigo-100 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                        {formatBytes(action.fileSize)}
                    </span>
                )}
            </div>

            <div className="space-y-2">
                <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Document Title
                    </label>
                    <input
                        type="text"
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Document title"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Destination Folder
                        </label>
                        <select
                            value={selectedFolderId}
                            onChange={(e) => setSelectedFolderId(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                            <option value="">Root / All Documents</option>
                            {folders.map(f => (
                                <option key={f.id} value={f.id}>📁 {f.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Category
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                            <option value="other">General / Other</option>
                            <option value="manual">Manuals</option>
                            <option value="report">Reports</option>
                            <option value="agreement">Agreements</option>
                            <option value="policy">Policies</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-indigo-100 dark:border-indigo-900/60">
                <span className="text-[10px] text-slate-400">
                    Stores file in Document Management
                </span>
                <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSave}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Confirm & Save to Folder
                </button>
            </div>
        </div>
    );
}

/**
 * Interactive card to confirm moving an existing document to another folder
 */
export function DocumentMoveFolderCard({ action }) {
    const [folders, setFolders] = useState(action?.availableFolders || []);
    const [selectedFolderId, setSelectedFolderId] = useState(action?.targetFolderId || '');
    const [isConfirmed, setIsConfirmed] = useState(action?.isConfirmed || false);
    const [isMoving, setIsMoving] = useState(false);

    useEffect(() => {
        if (!folders || folders.length === 0) {
            foldersAPI.getAll()
                .then(res => {
                    const list = res.data?.data?.folders || res.data?.folders || [];
                    setFolders(list.map(f => ({ id: f.id, name: f.name })));
                })
                .catch(() => {});
        }
    }, []);

    const handleMove = async () => {
        setIsMoving(true);
        try {
            const res = await api.post('/admin/chatbot/move-document', {
                documentId: action?.documentId,
                targetFolderId: selectedFolderId || null
            });
            if (res.data.success) {
                setIsConfirmed(true);
                toast.success('Document moved successfully!');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to move document');
        } finally {
            setIsMoving(false);
        }
    };

    const targetFolderName = folders.find(f => f.id === selectedFolderId)?.name || 'Root Folder (All Documents)';

    if (isConfirmed) {
        return (
            <div className="mt-2.5 p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Document Moved Successfully!
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    <strong>{action?.documentName}</strong> is now located in <strong>{targetFolderName}</strong>.
                </p>
                <div className="flex justify-end">
                    <a href="/admin/documents" className="text-xs text-emerald-700 dark:text-emerald-300 font-bold hover:underline flex items-center gap-1">
                        Open Documents <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-2.5 p-3.5 bg-amber-50/70 dark:bg-slate-800/80 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-xs space-y-3 animate-in fade-in shadow-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-950 dark:text-amber-200">
                <FolderInput className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Move Document to Folder
            </div>

            <div className="p-2.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-amber-100 dark:border-amber-950 space-y-1">
                <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Document:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{action?.documentName}</span>
                </div>
            </div>

            <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Select Target Folder
                </label>
                <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                >
                    <option value="">Root / All Documents</option>
                    {folders.map(f => (
                        <option key={f.id} value={f.id}>📁 {f.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex items-center justify-end pt-1">
                <button
                    type="button"
                    disabled={isMoving}
                    onClick={handleMove}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                    {isMoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Confirm & Move Document
                </button>
            </div>
        </div>
    );
}
