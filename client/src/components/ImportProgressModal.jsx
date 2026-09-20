'use client';

import React, { useEffect, useRef } from 'react';
import {
    Loader2, CheckCircle2, XCircle, Clock,
    FolderPlus, RefreshCw, X, ArrowRight, FileText, Folder,
    Minimize2, Maximize2, ChevronDown, ChevronUp, Layers, Check
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
    isMinimized = false,
    isImporting = false,
    isDetailsOpen = true,
    items = [],
    progress = 0,
    currentIndex = 0,
    onMinimize,
    onMaximize,
    onToggleDetails,
    onRetryFailed,
    onClose,
    onViewDocuments
}) {
    const activeItemRef = useRef(null);

    // Auto-scroll the items list to the active item
    useEffect(() => {
        if (isImporting && activeItemRef.current) {
            activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [currentIndex, isImporting]);

    if (!isOpen) return null;

    const totalCount = items.length;
    const successCount = items.filter(i => i.status === 'success').length;
    const failedCount = items.filter(i => i.status === 'failed').length;
    const isCompleted = !isImporting && (successCount + failedCount >= totalCount);
    const currentItem = items[currentIndex] || null;

    // -------------------------------------------------------------
    // MINIMIZED STATE: Phone-Style Floating Dynamic Toast Notification
    // -------------------------------------------------------------
    if (isMinimized) {
        return (
            <div
                className="fixed bottom-6 right-6 z-[99999] max-w-sm sm:max-w-md w-[calc(100vw-2rem)] bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl shadow-2xl p-3.5 flex flex-col gap-2.5 animate-in slide-in-from-bottom-5 duration-300 select-none hover:border-emerald-500/60 transition cursor-pointer"
                onClick={onMaximize}
                role="region"
                aria-label="Google Drive Import Progress Notification"
            >
                {/* Header row */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
                            {isImporting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                            ) : failedCount > 0 ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-100 truncate block">
                                {isCompleted
                                    ? (failedCount > 0 ? `Import finished with ${failedCount} errors` : 'Import Completed')
                                    : `Importing (${currentIndex + 1}/${totalCount})`}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-800/80 px-2 py-0.5 rounded-md">
                            {progress}%
                        </span>
                        {onMaximize && (
                            <button
                                type="button"
                                onClick={onMaximize}
                                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                                title="Expand dialog"
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {isCompleted && onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                                title="Dismiss"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Body row: Current active item */}
                <div className="flex items-center gap-2 text-xs text-slate-300 min-w-0">
                    {currentItem?.isFolder ? (
                        <Folder className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    ) : (
                        <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="truncate font-medium text-slate-200">
                        {isCompleted
                            ? `${successCount} of ${totalCount} items saved to Documents`
                            : (currentItem?.name || 'Processing files...')}
                    </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 rounded-full ${
                            failedCount > 0 && successCount === 0
                                ? 'bg-rose-500'
                                : failedCount > 0
                                ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        }`}
                        style={{ width: `${Math.max(5, progress)}%` }}
                    />
                </div>

                {/* Action buttons if finished */}
                {isCompleted && (
                    <div className="pt-1 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[11px] text-slate-400">
                            {successCount} succeeded {failedCount > 0 && `• ${failedCount} failed`}
                        </span>
                        <div className="flex items-center gap-2">
                            {onViewDocuments && (
                                <button
                                    type="button"
                                    onClick={onViewDocuments}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs"
                                >
                                    <span>View Documents</span>
                                    <ArrowRight className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // -------------------------------------------------------------
    // FULL MODAL STATE
    // -------------------------------------------------------------
    return (
        <div className="fixed inset-0 z-[100000] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
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

                    <div className="flex items-center gap-1">
                        {onMinimize && (
                            <button
                                type="button"
                                onClick={onMinimize}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                title="Minimize to floating phone toast"
                                aria-label="Minimize"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </button>
                        )}
                        {isCompleted && onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                title="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress Bar Area */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">
                            {isCompleted ? 'Finished' : `Overall Progress (${progress}%)`}
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

                {/* Current Active File Card (Prominent Callout) */}
                {isImporting && currentItem && (
                    <div className="px-5 py-3 bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin flex-shrink-0" />
                            <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 block">
                                    Now Importing ({currentIndex + 1} of {totalCount}):
                                </span>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={currentItem.name}>
                                    {currentItem.name}
                                </p>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                {formatBytes(currentItem.size)}
                            </span>
                            {currentItem.folderName && (
                                <span className="block text-[10px] text-amber-700 dark:text-amber-400 truncate max-w-[120px]">
                                    → {currentItem.folderName}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Collapsible File Queue Bar */}
                <div className="border-b border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onToggleDetails}
                        className="w-full px-5 py-2 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                    >
                        <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            <span>Files Queue ({items.length} items)</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                            <span className="text-[11px] font-normal">{isDetailsOpen ? 'Collapse' : 'Expand list'}</span>
                            {isDetailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                    </button>
                </div>

                {/* Collapsible Items List */}
                {isDetailsOpen && (
                    <div className="flex-1 overflow-y-auto max-h-64 p-4 space-y-2 divide-y divide-slate-100 dark:divide-slate-800/60">
                        {items.map((item, idx) => {
                            const isCurrent = isImporting && idx === currentIndex;
                            return (
                                <div
                                    key={item.id || idx}
                                    ref={isCurrent ? activeItemRef : null}
                                    className={`pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs p-1.5 rounded-lg transition ${
                                        isCurrent
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 font-semibold'
                                            : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        {item.isFolder ? (
                                            <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                        ) : (
                                            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <p
                                                className={`truncate text-xs ${
                                                    isCurrent
                                                        ? 'text-emerald-900 dark:text-emerald-300 font-bold'
                                                        : 'text-slate-800 dark:text-slate-200'
                                                }`}
                                                title={item.name}
                                            >
                                                {item.name}
                                            </p>
                                            <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                                <span>{item.size ? formatBytes(item.size) : (item.isFolder ? 'Folder' : '—')}</span>
                                                {item.folderName && (
                                                    <span className="text-amber-600 dark:text-amber-400">
                                                        • in {item.folderName}
                                                    </span>
                                                )}
                                                {item.error && (
                                                    <span className="text-rose-600 dark:text-rose-400 font-medium">
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
                )}

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
                        {isImporting && onMinimize && (
                            <button
                                type="button"
                                onClick={onMinimize}
                                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition"
                            >
                                <Minimize2 className="w-3.5 h-3.5" />
                                <span>Minimize & continue in background</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {isCompleted && (
                            <>
                                {onClose && (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                                    >
                                        Close
                                    </button>
                                )}
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
                    </div>
                </div>
            </div>
        </div>
    );
}
