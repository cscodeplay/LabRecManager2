'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { googleDriveAPI, foldersAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { usePathname, useRouter } from 'next/navigation';
import ImportProgressModal from '@/components/ImportProgressModal';

const DriveImportContext = createContext(null);
const STORAGE_KEY = 'ulrms_drive_import_state';

function formatSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec <= 0) return '—';
    if (bytesPerSec >= 1024 * 1024) {
        return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
    }
    if (bytesPerSec >= 1024) {
        return `${Math.round(bytesPerSec / 1024)} KB/s`;
    }
    return `${Math.round(bytesPerSec)} B/s`;
}

export function DriveImportProvider({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const prevPathnameRef = useRef(pathname);

    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(true);

    const [importQueue, setImportQueue] = useState([]);
    const [importProgress, setImportProgress] = useState(0);
    const [importCurrentIndex, setImportCurrentIndex] = useState(0);
    const [importSpeed, setImportSpeed] = useState('');

    const importStartTimeRef = useRef(null);
    const totalBytesTransferredRef = useRef(0);
    const isImportingRef = useRef(false);
    isImportingRef.current = isImporting;

    // Persist active state to localStorage so refresh never loses the process
    const persistState = useCallback((queue, currentIndex, progress, importing, minimized, open) => {
        try {
            if (queue && queue.length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    queue,
                    currentIndex,
                    progress,
                    isImporting: importing,
                    isMinimized: minimized,
                    isOpen: open,
                    savedAt: Date.now()
                }));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {
            console.warn('[DriveImport] Storage sync error:', e);
        }
    }, []);

    // Warn on tab close / reload if import is currently in progress
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isImportingRef.current) {
                e.preventDefault();
                e.returnValue = 'Import is currently in progress. If you leave or close this tab, the import process will be interrupted. Do you want to proceed?';
                return e.returnValue;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // If pathname changes while importing and modal is open, auto-minimize to phone toast so user can use the new page
    useEffect(() => {
        if (prevPathnameRef.current !== pathname) {
            if (isImporting && isOpen && !isMinimized) {
                setIsMinimized(true);
            }
            prevPathnameRef.current = pathname;
        }
    }, [pathname, isImporting, isOpen, isMinimized]);

    // Core Import Runner Loop
    const runImportLoop = useCallback(async (queueToRun, startIndex = 0, options = {}) => {
        if (!queueToRun || queueToRun.length === 0) return;

        setIsImporting(true);
        importStartTimeRef.current = Date.now();
        totalBytesTransferredRef.current = 0;

        let workingQueue = [...queueToRun];
        let succeeded = workingQueue.filter(i => i.status === 'success').length;
        let failed = workingQueue.filter(i => i.status === 'failed').length;

        for (let i = startIndex; i < workingQueue.length; i++) {
            // Skip already succeeded items
            if (workingQueue[i].status === 'success') {
                continue;
            }

            setImportCurrentIndex(i);
            workingQueue = workingQueue.map((it, idx) => idx === i ? { ...it, status: 'importing' } : it);
            setImportQueue(workingQueue);
            persistState(workingQueue, i, Math.round((i / workingQueue.length) * 100), true, true, true);

            const item = workingQueue[i];
            const itemStartTime = Date.now();

            try {
                await googleDriveAPI.importToDocuments({
                    fileId: item.id,
                    folderId: item.folderId || null,
                    name: item.name
                });

                succeeded++;
                workingQueue = workingQueue.map((it, idx) => idx === i ? { ...it, status: 'success' } : it);
                setImportQueue(workingQueue);

                // Calculate real-time transfer speed
                const itemDurationSec = Math.max(0.1, (Date.now() - itemStartTime) / 1000);
                const itemBytes = item.size || 0;
                totalBytesTransferredRef.current += itemBytes;
                const totalDurationSec = Math.max(0.2, (Date.now() - importStartTimeRef.current) / 1000);
                const currentSpeed = itemBytes / itemDurationSec;
                const avgSpeed = totalBytesTransferredRef.current / totalDurationSec;
                const effectiveSpeed = currentSpeed > 0 ? currentSpeed : avgSpeed;
                setImportSpeed(formatSpeed(effectiveSpeed));
            } catch (err) {
                failed++;
                const errMsg = err.response?.data?.message || err.message || 'Import failed';
                workingQueue = workingQueue.map((it, idx) => idx === i ? { ...it, status: 'failed', error: errMsg } : it);
                setImportQueue(workingQueue);
            }

            const currentProg = Math.round(((i + 1) / workingQueue.length) * 100);
            setImportProgress(currentProg);
            persistState(workingQueue, i, currentProg, true, true, true);
        }

        setIsImporting(false);
        setImportSpeed('');
        persistState(workingQueue, workingQueue.length - 1, 100, false, true, true);

        window.dispatchEvent(new CustomEvent('drive-import-completed', { detail: { succeeded, failed } }));

        if (options.onImportSuccess) options.onImportSuccess({ succeeded, failed });

        if (succeeded > 0) {
            toast.success(`Imported ${succeeded} file${succeeded > 1 ? 's' : ''} to Documents!`);
        }
        if (failed > 0) {
            toast.error(`${failed} file${failed > 1 ? 's' : ''} failed to import`);
        }
    }, [persistState]);

    // On mount: Check localStorage to resume any interrupted import after page refresh
    const hasRestoredRef = useRef(false);
    useEffect(() => {
        if (hasRestoredRef.current) return;
        hasRestoredRef.current = true;

        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (!saved || !Array.isArray(saved.queue) || saved.queue.length === 0) return;

            const hasPending = saved.queue.some(i => i.status === 'pending' || i.status === 'importing');
            if (hasPending) {
                // Reset any 'importing' items back to 'pending' to retry them cleanly
                const restoredQueue = saved.queue.map(i => i.status === 'importing' ? { ...i, status: 'pending' } : i);
                const firstPendingIdx = restoredQueue.findIndex(i => i.status === 'pending');
                const startIdx = firstPendingIdx !== -1 ? firstPendingIdx : 0;

                setImportQueue(restoredQueue);
                setImportProgress(saved.progress || 0);
                setImportCurrentIndex(startIdx);
                setIsOpen(true);
                setIsMinimized(true); // Keep minimized on reload so user's screen is not blocked

                toast('Resuming Google Drive import from where it left off...', { icon: '🔄' });
                runImportLoop(restoredQueue, startIdx);
            } else {
                // Clean up finished state from previous sessions
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {
            console.warn('[DriveImport] Could not restore state from storage:', e);
        }
    }, [runImportLoop]);

    // Pre-Import Space Check & Multi-Item Import Engine with Folder Expansion
    const executeImport = useCallback(async (itemsToImport, targetFolderId, options = {}) => {
        if (!itemsToImport || itemsToImport.length === 0) return;

        toast.loading('Preparing items for import...', { id: 'drive-prep' });
        try {
            // Check user storage quota
            const checkRes = await googleDriveAPI.checkStorage();
            const { remainingBytes, quotaMb } = checkRes.data?.data || {};

            let totalBytesNeeded = 0;
            const preparedItems = [];

            // Destination folder means also the folder the user created or/and selected
            const cleanTargetFolderId = (targetFolderId && typeof targetFolderId === 'string' && targetFolderId !== 'null' && targetFolderId !== 'undefined' && targetFolderId !== '__NEW__' && targetFolderId.trim().length > 0)
                ? targetFolderId.trim()
                : null;

            for (const item of itemsToImport) {
                const isFolder = item.isFolder || item.mimeType === 'application/vnd.google-apps.folder';
                if (isFolder) {
                    // Create the Drive folder inside the selected target folder in My Documents
                    let localSubFolderId = cleanTargetFolderId;
                    try {
                        const createFolderRes = await foldersAPI.create({
                            name: item.name || 'Imported Folder',
                            parentId: cleanTargetFolderId
                        });
                        const created = createFolderRes.data?.data?.folder || createFolderRes.data?.data;
                        if (created?.id) {
                            localSubFolderId = created.id;
                            if (options.onLocalFolderCreated) options.onLocalFolderCreated(created);
                            window.dispatchEvent(new CustomEvent('drive-local-folder-created', { detail: created }));
                        }
                    } catch (folderErr) {
                        console.warn('[Drive Import] Destination folder creation notice (using target folder):', folderErr.message);
                    }

                    // Recursively fetch subfiles
                    try {
                        const statsRes = await googleDriveAPI.getFolderStats(item.id);
                        const subFiles = statsRes.data?.data?.files || [];
                        const folderBytes = statsRes.data?.data?.totalBytes || 0;
                        totalBytesNeeded += folderBytes;

                        if (subFiles.length === 0) {
                            // Empty folder: record as already completed item
                            preparedItems.push({
                                id: item.id,
                                name: item.name,
                                isFolder: true,
                                size: 0,
                                folderId: localSubFolderId,
                                folderName: item.name,
                                status: 'success'
                            });
                        } else {
                            for (const sf of subFiles) {
                                const sz = parseInt(sf.size, 10) || 0;
                                preparedItems.push({
                                    id: sf.id,
                                    name: sf.name,
                                    isFolder: false,
                                    size: sz,
                                    mimeType: sf.mimeType,
                                    folderId: localSubFolderId,
                                    folderName: item.name,
                                    status: 'pending'
                                });
                            }
                        }
                    } catch (statsErr) {
                        preparedItems.push({
                            id: item.id,
                            name: item.name,
                            isFolder: true,
                            size: 0,
                            status: 'failed',
                            error: 'Could not fetch files from Google Drive folder'
                        });
                    }
                } else {
                    const sz = parseInt(item.size, 10) || 0;
                    totalBytesNeeded += sz;
                    preparedItems.push({
                        ...item,
                        isFolder: false,
                        size: sz,
                        folderId: cleanTargetFolderId,
                        folderName: null,
                        status: 'pending'
                    });
                }
            }

            toast.dismiss('drive-prep');

            // Quota Guard: Block if insufficient space
            if (remainingBytes !== undefined && totalBytesNeeded > remainingBytes) {
                const reqMb = (totalBytesNeeded / (1024 * 1024)).toFixed(1);
                const remMb = (remainingBytes / (1024 * 1024)).toFixed(1);
                toast.error(`Storage quota exceeded. Requires ${reqMb} MB, but only ${remMb} MB available in your ${quotaMb} MB plan.`);
                return;
            }

            if (preparedItems.length === 0) {
                toast.error('No files found to import');
                return;
            }

            // Launch live progress modal
            setImportQueue(preparedItems);
            setImportProgress(0);
            setImportCurrentIndex(0);
            setImportSpeed('');
            setIsOpen(true);
            setIsMinimized(false);
            setIsDetailsOpen(true);
            persistState(preparedItems, 0, 0, true, false, true);

            // Execute the import loop
            await runImportLoop(preparedItems, 0, options);
        } catch (err) {
            toast.dismiss('drive-prep');
            toast.error(err.response?.data?.message || 'Failed to prepare items for import');
        }
    }, [persistState, runImportLoop]);

    const retryFailed = useCallback(async () => {
        const failedItems = importQueue.filter(i => i.status === 'failed');
        if (failedItems.length === 0) return;

        const resetQueue = importQueue.map(i => i.status === 'failed' ? { ...i, status: 'pending', error: null } : i);
        setImportQueue(resetQueue);
        const firstPendingIdx = resetQueue.findIndex(i => i.status === 'pending');
        await runImportLoop(resetQueue, firstPendingIdx !== -1 ? firstPendingIdx : 0);
    }, [importQueue, runImportLoop]);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setIsMinimized(false);
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }, []);

    const handleViewDocuments = useCallback(() => {
        setIsOpen(false);
        setIsMinimized(false);
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        router.push('/documents');
    }, [router]);

    return (
        <DriveImportContext.Provider
            value={{
                isOpen,
                isMinimized,
                isImporting,
                isDetailsOpen,
                importQueue,
                importProgress,
                importCurrentIndex,
                importSpeed,
                executeImport,
                retryFailed,
                openModal: () => { setIsOpen(true); setIsMinimized(false); },
                closeModal: handleClose,
                minimizeModal: () => setIsMinimized(true),
                maximizeModal: () => setIsMinimized(false),
                toggleDetails: () => setIsDetailsOpen(prev => !prev),
            }}
        >
            {children}

            {/* Global Persistent Import Modal & Phone-Style Floating Toast */}
            <ImportProgressModal
                isOpen={isOpen}
                isMinimized={isMinimized}
                isImporting={isImporting}
                isDetailsOpen={isDetailsOpen}
                items={importQueue}
                progress={importProgress}
                currentIndex={importCurrentIndex}
                speed={importSpeed}
                onMinimize={() => setIsMinimized(true)}
                onMaximize={() => setIsMinimized(false)}
                onToggleDetails={() => setIsDetailsOpen(prev => !prev)}
                onRetryFailed={retryFailed}
                onClose={handleClose}
                onViewDocuments={handleViewDocuments}
            />
        </DriveImportContext.Provider>
    );
}

export function useDriveImport() {
    const context = useContext(DriveImportContext);
    if (!context) {
        throw new Error('useDriveImport must be used within a DriveImportProvider');
    }
    return context;
}
