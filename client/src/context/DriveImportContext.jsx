'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { googleDriveAPI, foldersAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { usePathname, useRouter } from 'next/navigation';
import ImportProgressModal from '@/components/ImportProgressModal';

const DriveImportContext = createContext(null);

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

    // If pathname changes while importing and modal is open, auto-minimize to phone toast so user can use the new page!
    useEffect(() => {
        if (prevPathnameRef.current !== pathname) {
            if (isImporting && isOpen && !isMinimized) {
                setIsMinimized(true);
            }
            prevPathnameRef.current = pathname;
        }
    }, [pathname, isImporting, isOpen, isMinimized]);

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
            setIsImporting(true);
            setIsOpen(true);
            setIsMinimized(false);
            setIsDetailsOpen(true);

            let succeeded = 0;
            let failed = 0;

            for (let i = 0; i < preparedItems.length; i++) {
                // If item is already marked success (e.g. empty folder), skip import call
                if (preparedItems[i].status === 'success') {
                    succeeded++;
                    setImportCurrentIndex(i);
                    setImportProgress(Math.round(((i + 1) / preparedItems.length) * 100));
                    continue;
                }

                setImportCurrentIndex(i);
                setImportQueue(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'importing' } : it));

                const item = preparedItems[i];
                try {
                    await googleDriveAPI.importToDocuments({
                        fileId: item.id,
                        folderId: item.folderId || null,
                        name: item.name
                    });

                    succeeded++;
                    setImportQueue(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'success' } : it));
                } catch (err) {
                    failed++;
                    const errMsg = err.response?.data?.message || err.message || 'Import failed';
                    setImportQueue(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'failed', error: errMsg } : it));
                }

                setImportProgress(Math.round(((i + 1) / preparedItems.length) * 100));
            }

            setIsImporting(false);
            window.dispatchEvent(new CustomEvent('drive-import-completed', { detail: { succeeded, failed } }));

            if (options.onImportSuccess) options.onImportSuccess({ succeeded, failed });

            if (succeeded > 0) {
                toast.success(`Imported ${succeeded} file${succeeded > 1 ? 's' : ''} to Documents!`);
            }
            if (failed > 0) {
                toast.error(`${failed} file${failed > 1 ? 's' : ''} failed to import`);
            }
        } catch (err) {
            toast.dismiss('drive-prep');
            toast.error(err.response?.data?.message || 'Failed to prepare items for import');
        }
    }, []);

    const retryFailed = useCallback(async () => {
        const failedItems = importQueue.filter(i => i.status === 'failed');
        if (failedItems.length === 0) return;

        setIsImporting(true);
        let succeeded = 0;
        let failed = 0;

        for (let i = 0; i < importQueue.length; i++) {
            if (importQueue[i].status !== 'failed') continue;

            setImportCurrentIndex(i);
            setImportQueue(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'importing', error: null } : it));

            const item = importQueue[i];
            try {
                await googleDriveAPI.importToDocuments({
                    fileId: item.id,
                    folderId: item.folderId || null,
                    name: item.name
                });
                succeeded++;
                setImportQueue(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'success' } : it));
            } catch (err) {
                failed++;
                const errMsg = err.response?.data?.message || err.message || 'Import failed';
                setImportQueue(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'failed', error: errMsg } : it));
            }
        }

        setIsImporting(false);
        window.dispatchEvent(new CustomEvent('drive-import-completed', { detail: { succeeded, failed } }));
        if (succeeded > 0) toast.success(`Retried and imported ${succeeded} file${succeeded > 1 ? 's' : ''}`);
        if (failed > 0) toast.error(`${failed} file${failed > 1 ? 's' : ''} still failed`);
    }, [importQueue]);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setIsMinimized(false);
    }, []);

    const handleViewDocuments = useCallback(() => {
        setIsOpen(false);
        setIsMinimized(false);
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
