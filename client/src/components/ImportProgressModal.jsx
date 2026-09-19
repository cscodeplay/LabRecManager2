'use client';

import React from 'react';
import {
    Loader2, CheckCircle2, XCircle, Clock, AlertTriangle,
    FolderPlus, RefreshCw, X, ArrowRight, FileText, Folder
} from 'lucide-react';

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '—';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function ImportProgressModal({
    isOpen,
    isImporting,
    items = [],
    progress = 0,
    currentIndex = 0,
    summary = null,
    onRetryFailed,
    onClose,
    onViewDocuments
}) {
    if (!isOpen) return null;

    const totalCount = items.length;
    const successCount = items.filter(i => i.status === 'success').length;
    const failedCount = items.filter(i => i.status === 'failed').length;
    const isCompleted = !isImporting && (successCount + failedCount >= totalCount);

    return (
        <div className="fixed inset-0 z-[100000] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {isCompleted ? 'Import Completed' : 'Importing from Google Drive'}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {isCompleted
                                    ? `${successCount} of ${totalCount} items imported to local documents`
                                    : `Saving to local storage (${currentIndex + 1} of ${totalCount})...`}
                            </p>
                        </div>
                    </div>
                    {isCompleted && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Progress Bar Area */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">
                            {isCompleted ? 'Finished' : `Progress (${progress}%)`}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">
                            {successCount} succeeded {failedCount > 0 && `• ${failedCount} failed`}
                        </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-300 ${
                                failedCount > 0 && successCount === 0
                                    ? 'bg-rose-500'
                                    : failedCount > 0
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(5, progress)}%` }}
                        />
                    </div>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto max-h-72 p-4 space-y-2 divide-y divide-slate-100 dark:divide-slate-800/60">
                    {items.map((item, idx) => {
                        const isCurrent = isImporting && idx === currentIndex;
                        return (
                            <div
                                key={item.id || idx}
                                className={`pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs ${
                                    isCurrent ? 'font-semibold text-emerald-900 dark:text-emerald-300' : ''
                                }`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    {item.isFolder ? (
                                        <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                    ) : (
                                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="truncate text-slate-800 dark:text-slate-200 text-xs" title={item.name}>
                                            {item.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {item.size ? formatBytes(item.size) : (item.isFolder ? 'Folder' : '')}
                                            {item.error && (
                                                <span className="text-rose-600 dark:text-rose-400 font-medium ml-1">
                                                    — {item.error}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Status Icon */}
                                <div className="flex-shrink-0 pt-0.5">
                                    {item.status === 'success' && (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    )}
                                    {item.status === 'failed' && (
                                        <XCircle className="w-4 h-4 text-rose-600" />
                                    )}
                                    {item.status === 'importing' && (
                                        <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                                    )}
                                    {(!item.status || item.status === 'pending') && (
                                        <Clock className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div>
                        {failedCount > 0 && isCompleted && onRetryFailed && (
                            <button
                                type="button"
                                onClick={onRetryFailed}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-xs font-semibold transition"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Retry {failedCount} Failed</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {isCompleted && (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                                >
                                    Close
                                </button>
                                {onViewDocuments && successCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={onViewDocuments}
                                        className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                                    >
                                        <span>View in Documents</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </>
                        )}
                        {isImporting && (
                            <span className="text-xs text-slate-400 italic">
                                Please keep this window open...
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
