'use client';

import React, { useState, useEffect } from 'react';
import {
    HardDrive, HardDriveUpload, Folder, FolderPlus,
    Check, X, Loader2, AlertCircle, ArrowRight, Trash2, Copy
} from 'lucide-react';
import { googleDriveAPI } from '@/lib/api';
import toast from 'react-hot-toast';

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function MoveCopyToDriveModal({
    isOpen,
    onClose,
    selectedDocuments = [],
    onSuccess
}) {
    const [loadingFolders, setLoadingFolders] = useState(true);
    const [driveFolders, setDriveFolders] = useState([]);
    const [targetFolderId, setTargetFolderId] = useState(''); // '' means root
    const [isMove, setIsMove] = useState(false); // false = copy, true = move
    const [transferring, setTransferring] = useState(false);
    const [driveStatus, setDriveStatus] = useState(null);

    // New Google Drive folder creation inside modal
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [newDriveFolderName, setNewDriveFolderName] = useState('');
    const [creatingDriveFolder, setCreatingDriveFolder] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        setLoadingFolders(true);

        const init = async () => {
            try {
                const statusRes = await googleDriveAPI.getStatus();
                if (!isMounted) return;
                setDriveStatus(statusRes.data?.data);

                // Fetch Google Drive folders
                const res = await googleDriveAPI.listFiles({
                    pageSize: 100
                });
                if (!isMounted) return;

                const allFiles = res.data?.data?.files || [];
                const folders = allFiles.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
                setDriveFolders(folders);
            } catch (err) {
                console.error('Failed to fetch Drive status or folders:', err);
            } finally {
                if (isMounted) setLoadingFolders(false);
            }
        };

        init();

        return () => {
            isMounted = false;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const totalBytes = selectedDocuments.reduce((acc, d) => acc + (d.fileSize || 0), 0);
    const docIds = selectedDocuments.map(d => d.id);

    const handleCreateDriveFolder = async (e) => {
        e?.preventDefault();
        if (!newDriveFolderName.trim()) return;
        setCreatingDriveFolder(true);
        try {
            const res = await googleDriveAPI.createFolder({
                name: newDriveFolderName.trim(),
                parentId: targetFolderId || null
            });
            const newF = res.data?.data;
            if (newF) {
                setDriveFolders(prev => [newF, ...prev]);
                setTargetFolderId(newF.id);
                toast.success(`Created Drive folder: ${newF.name}`);
                setShowNewFolderInput(false);
                setNewDriveFolderName('');
            }
        } catch (err) {
            console.error('Failed to create Drive folder:', err);
            toast.error(err.response?.data?.message || 'Failed to create Drive folder');
        } finally {
            setCreatingDriveFolder(false);
        }
    };

    const handleTransfer = async () => {
        if (docIds.length === 0) return;
        setTransferring(true);

        try {
            const res = await googleDriveAPI.exportFromDocuments({
                documentIds: docIds,
                targetFolderId: targetFolderId || null,
                isMove
            });

            toast.success(res.data?.message || `Successfully transferred ${docIds.length} files to Google Drive`);
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Transfer failed:', err);
            toast.error(err.response?.data?.message || 'Transfer to Google Drive failed');
        } finally {
            setTransferring(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-700/60 flex items-center justify-center">
                            <HardDriveUpload className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold">Transfer to Google Drive</h3>
                            <p className="text-[11px] text-emerald-100">
                                {docIds.length} document{docIds.length === 1 ? '' : 's'} ({formatBytes(totalBytes)})
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-emerald-700/60 text-emerald-100 hover:text-white transition"
                        title="Close dialog"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto space-y-4 text-xs">
                    {/* Action Mode (Copy vs Move) */}
                    <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-bold mb-2">
                            Select Action:
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setIsMove(false)}
                                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                                    !isMove
                                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500'
                                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs flex items-center gap-1.5">
                                        <Copy className="w-3.5 h-3.5" /> Copy to Drive
                                    </span>
                                    {!isMove && <Check className="w-4 h-4 text-emerald-600" />}
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Copies file to Google Drive and keeps original in My Documents.
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsMove(true)}
                                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                                    isMove
                                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 ring-1 ring-amber-500'
                                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs flex items-center gap-1.5 text-amber-800 dark:text-amber-400">
                                        <ArrowRight className="w-3.5 h-3.5" /> Move to Drive
                                    </span>
                                    {isMove && <Check className="w-4 h-4 text-amber-600" />}
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Transfers file to Google Drive and moves local file to trash.
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Target Drive Folder Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-slate-700 dark:text-slate-300 font-bold">
                                Google Drive Destination Folder:
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowNewFolderInput(v => !v)}
                                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                            >
                                <FolderPlus className="w-3 h-3" />
                                <span>+ New Drive Folder</span>
                            </button>
                        </div>

                        {/* Inline Create Folder in Drive */}
                        {showNewFolderInput && (
                            <form onSubmit={handleCreateDriveFolder} className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 mb-2 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newDriveFolderName}
                                    onChange={(e) => setNewDriveFolderName(e.target.value)}
                                    placeholder="New Drive folder name..."
                                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={creatingDriveFolder || !newDriveFolderName.trim()}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-xs disabled:opacity-50"
                                >
                                    {creatingDriveFolder ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}
                                </button>
                            </form>
                        )}

                        <select
                            value={targetFolderId}
                            onChange={(e) => setTargetFolderId(e.target.value)}
                            disabled={loadingFolders}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                        >
                            <option value="">(Root of Google Drive)</option>
                            {driveFolders.map(f => (
                                <option key={f.id} value={f.id}>
                                    📁 {f.name}
                                </option>
                            ))}
                        </select>
                        {driveFolders.length === 0 && !loadingFolders && (
                            <p className="mt-1 text-[11px] text-slate-400">
                                No custom folders found. Files will be uploaded to your Google Drive root.
                            </p>
                        )}
                    </div>

                    {/* Selected Documents List Preview */}
                    <div>
                        <span className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                            Documents to Transfer ({selectedDocuments.length}):
                        </span>
                        <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-1">
                            {selectedDocuments.map((doc, idx) => (
                                <div key={doc.id || idx} className="p-2 flex items-center justify-between text-xs">
                                    <div className="min-w-0 pr-2">
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                            {doc.fileName || doc.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {formatBytes(doc.fileSize)} • {(doc.fileType || 'file').toUpperCase()}
                                        </p>
                                    </div>
                                    <HardDrive className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Toolbar */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={transferring}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 font-medium text-xs disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleTransfer}
                        disabled={transferring || docIds.length === 0}
                        className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 ${
                            isMove ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                    >
                        {transferring ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Transferring...</span>
                            </>
                        ) : (
                            <>
                                <HardDriveUpload className="w-3.5 h-3.5" />
                                <span>{isMove ? 'Move to Google Drive' : 'Copy to Google Drive'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
