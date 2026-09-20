'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    HardDrive, Folder, FileText, FileSpreadsheet, File, Search, RefreshCw,
    Download, Eye, ExternalLink, ChevronRight, CornerUpLeft, Grid3X3, List,
    FolderPlus, Loader2, Check, AlertCircle, X, Clock, Database, Sparkles,
    Upload, LogOut, Settings, Key, ShieldCheck, User, Bot, CheckSquare, Square
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { googleDriveAPI, foldersAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import MediaPreviewModal from './MediaPreviewModal';
import { useDriveImport } from '@/context/DriveImportContext';

export default function GoogleDriveBrowser({ onImportSuccess, availableFolders = [], onLocalFolderCreated }) {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState([]);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Google Drive' }]);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [importingId, setImportingId] = useState(null);
    const [selectedTargetFolderId, setSelectedTargetFolderId] = useState('');
    const [previewFile, setPreviewFile] = useState(null);

    // Local Destination Folders state
    const [localFoldersList, setLocalFoldersList] = useState(availableFolders);
    const [showNewLocalFolderModal, setShowNewLocalFolderModal] = useState(false);
    const [newLocalFolderName, setNewLocalFolderName] = useState('');
    const [creatingLocalFolder, setCreatingLocalFolder] = useState(false);

    // Folder Sizes Cache: { [folderId]: number }
    const [folderSizes, setFolderSizes] = useState({});
    const [calculatingFolderIds, setCalculatingFolderIds] = useState(new Set());

    useEffect(() => {
        setLocalFoldersList(availableFolders);
    }, [availableFolders]);

    const handleCreateLocalFolder = async (e) => {
        e?.preventDefault();
        if (!newLocalFolderName.trim()) {
            toast.error('Please enter a folder name');
            return;
        }
        setCreatingLocalFolder(true);
        try {
            const res = await foldersAPI.create({ name: newLocalFolderName.trim() });
            const created = res.data?.data?.folder || res.data?.data;
            if (created && (created.id || created.name)) {
                setLocalFoldersList(prev => [...prev, created]);
                setSelectedTargetFolderId(created.id);
                toast.success(`Local folder "${created.name}" created and selected!`);
                onLocalFolderCreated?.(created);
                setShowNewLocalFolderModal(false);
                setNewLocalFolderName('');
            }
        } catch (err) {
            console.error('Failed to create local folder:', err);
            toast.error(err.response?.data?.message || 'Failed to create folder');
        } finally {
            setCreatingLocalFolder(false);
        }
    };

    // Multi-Selection State
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [failedThumbnails, setFailedThumbnails] = useState(new Set());

    // Global Drive Import Engine & Progress State
    const {
        executeImport: executeGlobalImport,
        isImporting: isBatchImporting,
        openModal: openImportModal,
    } = useDriveImport();

    // Quota Alert Modal state
    const [showQuotaAlert, setShowQuotaAlert] = useState(false);
    const [quotaAlertInfo, setQuotaAlertInfo] = useState(null);

    // OAuth & Direct Upload state
    const [connectingOAuth, setConnectingOAuth] = useState(false);
    const [showOAuthConfigModal, setShowOAuthConfigModal] = useState(false);
    const [oauthClientIdInput, setOauthClientIdInput] = useState('');
    const [oauthClientSecretInput, setOauthClientSecretInput] = useState('');
    const [savingConfig, setSavingConfig] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileUploadRef = useRef(null);

    // Scope & New Folder state
    const [driveScope, setDriveScope] = useState('ulrms'); // 'ulrms' or 'all'
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [creatingFolder, setCreatingFolder] = useState(false);

    // Fetch integration status
    const refreshStatus = useCallback(async () => {
        try {
            const res = await googleDriveAPI.getStatus();
            setStatus(res.data?.data || null);
        } catch (err) {
            setStatus({ isConfigured: false });
        }
    }, []);

    useEffect(() => {
        refreshStatus();
    }, [refreshStatus]);

    // Load files for current folder / search
    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await googleDriveAPI.listFiles({
                folderId: currentFolderId || undefined,
                query: searchQuery || undefined,
                pageSize: 100
            });
            const list = res.data?.data?.files || [];
            setFiles(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error('Failed to list Google Drive files:', err);
            toast.error('Failed to load Google Drive files');
        } finally {
            setLoading(false);
        }
    }, [currentFolderId, searchQuery]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    // Handle OAuth redirect return status in query params
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const urlParams = new URLSearchParams(window.location.search);
        const oauthStatus = urlParams.get('oauth');
        const oauthMessage = urlParams.get('message');

        if (oauthStatus === 'success') {
            toast.success('Successfully connected to 5TB Google Drive!');
            refreshStatus();
            fetchFiles();
            urlParams.delete('oauth');
            urlParams.delete('message');
            const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
            window.history.replaceState({}, '', newUrl);
        } else if (oauthStatus === 'error') {
            toast.error(`Google Drive connection error: ${oauthMessage || 'Authorization failed'}`);
            urlParams.delete('oauth');
            urlParams.delete('message');
            const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
            window.history.replaceState({}, '', newUrl);
        }
    }, [fetchFiles, refreshStatus]);

    // Connect Personal Google Drive via OAuth 2.0
    const handleConnectOAuth = async () => {
        setConnectingOAuth(true);
        try {
            const res = await googleDriveAPI.getAuthUrl();
            if (res.data?.data?.authUrl) {
                window.location.href = res.data.data.authUrl;
            } else {
                setShowOAuthConfigModal(true);
            }
        } catch (err) {
            // If OAuth credentials not yet configured on server, open modal
            setShowOAuthConfigModal(true);
        } finally {
            setConnectingOAuth(false);
        }
    };

    // Save Client ID / Secret from modal and trigger OAuth
    const handleSaveOAuthConfig = async (e) => {
        e?.preventDefault();
        if (!oauthClientIdInput.trim() || !oauthClientSecretInput.trim()) {
            toast.error('Please enter both Client ID and Client Secret');
            return;
        }
        setSavingConfig(true);
        try {
            await googleDriveAPI.saveOAuthConfig({
                clientId: oauthClientIdInput.trim(),
                clientSecret: oauthClientSecretInput.trim()
            });
            toast.success('Credentials saved! Redirecting to Google authorization...');
            setShowOAuthConfigModal(false);
            const res = await googleDriveAPI.getAuthUrl();
            if (res.data?.data?.authUrl) {
                window.location.href = res.data.data.authUrl;
            }
        } catch (err) {
            console.error('Failed to save OAuth config:', err);
            toast.error(err.response?.data?.message || 'Failed to save credentials');
        } finally {
            setSavingConfig(false);
        }
    };

    // Disconnect OAuth
    const handleDisconnectOAuth = async () => {
        if (!window.confirm('Disconnect your personal Google account?')) return;
        try {
            await googleDriveAPI.disconnect();
            toast.success('Google account disconnected');
            refreshStatus();
            fetchFiles();
        } catch (err) {
            toast.error('Failed to disconnect Google account');
        }
    };

    // Direct Upload to current Google Drive folder
    const handleDirectUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const toastId = toast.loading(`Uploading "${file.name}" to Google Drive...`);
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (currentFolderId && currentFolderId !== 'root') {
                formData.append('folderId', currentFolderId);
            }
            const res = await googleDriveAPI.upload(formData);
            if (res.data?.isLiveGoogleDrive) {
                toast.success(`"${file.name}" uploaded directly to your 5TB Google Drive!`, { id: toastId });
            } else {
                toast.success(`"${file.name}" uploaded to Google Drive sync!`, { id: toastId });
            }
            fetchFiles();
            refreshStatus();
        } catch (err) {
            console.error('Upload failed:', err);
            toast.error(err.response?.data?.message || 'Failed to upload file', { id: toastId });
        } finally {
            setUploading(false);
            if (fileUploadRef.current) fileUploadRef.current.value = '';
        }
    };

    // Switch between ULRMS workspace and entire 5TB Google Drive
    const handleSwitchScope = (scope) => {
        setDriveScope(scope);
        if (scope === 'all') {
            setCurrentFolderId('root');
            setBreadcrumbs([{ id: 'root', name: 'My Drive (All 5 TB)' }]);
        } else {
            setCurrentFolderId(null);
            setBreadcrumbs([{ id: null, name: 'ULRMS Workspace' }]);
        }
        setSearchQuery('');
    };

    // Create a new folder in current Google Drive location
    const handleCreateFolder = async (e) => {
        e?.preventDefault();
        if (!newFolderName.trim()) return;
        setCreatingFolder(true);
        try {
            const targetParent = currentFolderId && currentFolderId !== 'root' ? currentFolderId : (driveScope === 'all' ? 'root' : null);
            await googleDriveAPI.createFolder({
                name: newFolderName.trim(),
                parentFolderId: targetParent
            });
            toast.success(`Folder "${newFolderName.trim()}" created in Google Drive!`);
            setShowNewFolderModal(false);
            setNewFolderName('');
            fetchFiles();
        } catch (err) {
            console.error('Failed to create folder:', err);
            toast.error(err.response?.data?.message || 'Failed to create folder');
        } finally {
            setCreatingFolder(false);
        }
    };

    // Navigate into folder
    const handleOpenFolder = (folder) => {
        setCurrentFolderId(folder.id);
        setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
        setSearchQuery('');
    };

    // Navigate to breadcrumb
    const handleNavigateBreadcrumb = (index) => {
        const target = breadcrumbs[index];
        setCurrentFolderId(target.id);
        setBreadcrumbs(prev => prev.slice(0, index + 1));
        setSearchQuery('');
    };

    // Go up one level
    const handleGoUp = () => {
        if (breadcrumbs.length <= 1) return;
        handleNavigateBreadcrumb(breadcrumbs.length - 2);
    };

    // Multi-Selection Helpers
    const toggleSelectItem = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === files.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(files.map(f => f.id)));
        }
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    // Fetch stats for selected folders to compute accurate size
    useEffect(() => {
        selectedIds.forEach(id => {
            const item = files.find(f => f.id === id);
            const isFolder = item && (item.isFolder || item.mimeType === 'application/vnd.google-apps.folder');
            if (isFolder && folderSizes[id] === undefined && !calculatingFolderIds.has(id)) {
                setCalculatingFolderIds(prev => new Set(prev).add(id));
                googleDriveAPI.getFolderStats(id)
                    .then(res => {
                        const bytes = res.data?.data?.totalBytes || 0;
                        setFolderSizes(prev => ({ ...prev, [id]: bytes }));
                    })
                    .catch(() => {
                        setFolderSizes(prev => ({ ...prev, [id]: 0 }));
                    })
                    .finally(() => {
                        setCalculatingFolderIds(prev => {
                            const next = new Set(prev);
                            next.delete(id);
                            return next;
                        });
                    });
            }
        });
    }, [selectedIds, files, folderSizes, calculatingFolderIds]);

    const selectedItems = files.filter(f => selectedIds.has(f.id));
    const isCalculatingSizes = selectedItems.some(f => {
        const isFolder = f.isFolder || f.mimeType === 'application/vnd.google-apps.folder';
        return isFolder && (folderSizes[f.id] === undefined || calculatingFolderIds.has(f.id));
    });
    const selectedTotalBytes = selectedItems.reduce((acc, f) => {
        const isFolder = f.isFolder || f.mimeType === 'application/vnd.google-apps.folder';
        if (isFolder) {
            return acc + (folderSizes[f.id] || 0);
        }
        return acc + (parseInt(f.size, 10) || 0);
    }, 0);

    // Global Drive Import Invocation
    const executeImport = (itemsToImport, targetFolder) => {
        if (!itemsToImport || itemsToImport.length === 0) return;

        executeGlobalImport(itemsToImport, targetFolder, {
            onLocalFolderCreated: (created) => {
                setLocalFoldersList(prev => {
                    if (prev.some(f => f.id === created.id)) return prev;
                    return [...prev, created];
                });
                if (onLocalFolderCreated) onLocalFolderCreated(created);
            },
            onImportSuccess: () => {
                fetchFiles();
                clearSelection();
                if (onImportSuccess) onImportSuccess();
            }
        });
    };

    // Auto-sync folder list and file list when background imports complete
    useEffect(() => {
        const handleImportDone = () => {
            fetchFiles();
            clearSelection();
            if (onImportSuccess) onImportSuccess();
        };

        const handleFolderCreated = (e) => {
            if (e.detail?.id) {
                setLocalFoldersList(prev => {
                    if (prev.some(f => f.id === e.detail.id)) return prev;
                    return [...prev, e.detail];
                });
            }
        };

        window.addEventListener('drive-import-completed', handleImportDone);
        window.addEventListener('drive-local-folder-created', handleFolderCreated);
        return () => {
            window.removeEventListener('drive-import-completed', handleImportDone);
            window.removeEventListener('drive-local-folder-created', handleFolderCreated);
        };
    }, [fetchFiles, onImportSuccess]);

    // Attach file to Floating AI Copilot
    const handleAttachFileToBot = (file, customPrompt = '') => {
        window.dispatchEvent(new CustomEvent('attach-to-bot', {
            detail: {
                file,
                prompt: customPrompt || `I have attached "${file.name}". Please summarize its key concepts and suggest 3 teaching ideas.`
            }
        }));
    };

    // Attach all selected files to Bot
    const handleAttachSelectedToBot = () => {
        if (selectedItems.length === 0) return;
        selectedItems.forEach(file => {
            window.dispatchEvent(new CustomEvent('attach-to-bot', {
                detail: {
                    file,
                    prompt: `I have attached ${selectedItems.length} documents. Please analyze them.`
                }
            }));
        });
        clearSelection();
    };

    // Open Preview (Rich Instant Preview)
    const handlePreview = (file) => {
        setPreviewFile(file);
    };

    // 1-Click Import to ULRMS Documents
    const handleImportToDocuments = (file) => {
        executeImport([file], selectedTargetFolderId);
    };

    // Download file
    const handleDownload = async (file) => {
        try {
            toast.loading('Downloading file...', { id: 'drive-download' });
            const res = await googleDriveAPI.downloadContent(file.id);
            const blob = new Blob([res.data], { type: file.mimeType || 'application/octet-stream' });
            saveAs(blob, file.name);
            toast.success('Download complete', { id: 'drive-download' });
        } catch (err) {
            console.error('Download error:', err);
            toast.error('Failed to download file from Google Drive', { id: 'drive-download' });
        }
    };

    const getFileIcon = (file) => {
        if (file.isFolder || file.mimeType === 'application/vnd.google-apps.folder') {
            return <Folder className="w-5 h-5 text-amber-500 fill-amber-100" />;
        }
        const name = (file.name || '').toLowerCase();
        if (name.endsWith('.pdf')) {
            return <FileText className="w-5 h-5 text-rose-500" />;
        }
        if (name.match(/\.(csv|xlsx|xls)$/) || file.mimeType?.includes('spreadsheet')) {
            return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
        }
        return <File className="w-5 h-5 text-indigo-500" />;
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '—';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-4">
            {/* Hidden file input for direct uploads */}
            <input
                type="file"
                ref={fileUploadRef}
                onChange={handleDirectUpload}
                className="hidden"
            />

            {/* Google Drive Status & 5TB Quota Banner */}
            {status?.isOAuthConnected ? (
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        {/* Account & Status Details */}
                        <div className="flex items-start gap-3 min-w-0">
                            {status.user?.photoLink ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={status.user.photoLink}
                                    alt="User"
                                    className="w-10 h-10 rounded-full border-2 border-emerald-500 flex-shrink-0 shadow-xs object-cover"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                                    <HardDrive className="w-5 h-5" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-800 text-sm">Personal Google Drive</span>
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                                        <Check className="w-2.5 h-2.5" /> 5 TB Google One AI Pro Active
                                    </span>
                                </div>
                                <p className="text-slate-600 text-xs mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
                                    <span>{status.user?.emailAddress || 'Personal Google Account'}</span>
                                    {status.user?.displayName && <span className="text-slate-400">• {status.user.displayName}</span>}
                                </p>
                            </div>
                        </div>

                        {/* Storage Meter & Actions */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                            {/* Storage Gauge */}
                            <div className="bg-white/80 backdrop-blur-xs border border-emerald-200/80 rounded-xl px-3 py-2 text-xs flex flex-col justify-center min-w-[210px]">
                                <div className="flex justify-between items-center text-[11px] mb-1">
                                    <span className="font-semibold text-slate-700">Storage Used</span>
                                    <span className="font-bold text-emerald-700">{status.quota?.percentUsed || 0}%</span>
                                </div>
                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-1">
                                    <div
                                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                        style={{ width: `${Math.max(2, status.quota?.percentUsed || 0)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-slate-500">
                                    <span>{status.quota?.usageFormatted || '0 GB'} used</span>
                                    <span>{status.quota?.limitFormatted || '5.0 TB'} total</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <button
                                    type="button"
                                    onClick={() => fileUploadRef.current?.click()}
                                    disabled={uploading}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-xs text-xs disabled:opacity-50"
                                    title="Upload a file directly to Google Drive"
                                >
                                    <Upload className={`w-3.5 h-3.5 ${uploading ? 'animate-bounce' : ''}`} />
                                    <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
                                </button>
                                <a
                                    href={currentFolderId ? `https://drive.google.com/drive/folders/${currentFolderId}` : "https://drive.google.com/drive/folders/1fzuxLH580TlkwJyATBbrjv7LBnFnC1Qp"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition shadow-xs text-xs"
                                    title="Open Google Drive folder in a new tab"
                                >
                                    <span>Drive</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                    type="button"
                                    onClick={handleDisconnectOAuth}
                                    className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition"
                                    title="Disconnect Google account"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-slate-50 border border-indigo-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-800 text-sm">
                                        {status?.authError ? 'Re-authorize 5TB Personal Google Account' : 'Connect 5TB Personal Google Account'}
                                    </span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status?.authError ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                                        {status?.authError ? 'Permission Update Required' : 'Service Account (0 MB quota)'}
                                    </span>
                                </div>
                                <p className="text-slate-600 text-[11px] mt-0.5">
                                    {status?.authError
                                        ? `Notice: ${status.authError}. Click below to grant full Google Drive permissions so your session stays permanently connected.`
                                        : 'Connect your @gmail.com account to unlock your full 5 TB Google One AI Pro quota, upload files directly, and sync with iPhone Files app.'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                            <button
                                type="button"
                                onClick={handleConnectOAuth}
                                disabled={connectingOAuth}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs text-xs disabled:opacity-50"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>{connectingOAuth ? 'Connecting...' : (status?.authError ? 'Re-authorize 5TB Drive' : 'Connect 5TB Drive')}</span>
                            </button>
                            <a
                                href={currentFolderId ? `https://drive.google.com/drive/folders/${currentFolderId}` : "https://drive.google.com/drive/folders/1fzuxLH580TlkwJyATBbrjv7LBnFnC1Qp"}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition shadow-xs text-xs"
                                title="Open Google Drive folder in a new tab"
                            >
                                <span>Open Drive</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Bar: Breadcrumbs, Destination Folder, View Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Scope Switcher & Breadcrumbs Navigation */}
                <div className="flex items-center gap-2 flex-wrap text-sm">
                    {/* Workspace Scope Toggle */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs mr-1">
                        <button
                            type="button"
                            onClick={() => handleSwitchScope('ulrms')}
                            className={`px-2.5 py-1 rounded-md font-semibold transition ${
                                driveScope === 'ulrms' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="Focus on ULRMS dedicated workspace folder"
                        >
                            ULRMS Folder
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSwitchScope('all')}
                            className={`px-2.5 py-1 rounded-md font-semibold transition ${
                                driveScope === 'all' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="Browse all folders across your 5TB Google Drive"
                        >
                            All 5TB Drive
                        </button>
                    </div>

                    {breadcrumbs.length > 1 && (
                        <button
                            type="button"
                            onClick={handleGoUp}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition mr-1"
                            title="Go to parent folder"
                        >
                            <CornerUpLeft className="w-4 h-4" />
                        </button>
                    )}
                    <HardDrive className="w-4 h-4 text-emerald-600 mr-1 flex-shrink-0" />
                    {breadcrumbs.map((crumb, idx) => {
                        const isLast = idx === breadcrumbs.length - 1;
                        return (
                            <div key={crumb.id || 'root'} className="flex items-center gap-1">
                                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                                <button
                                    type="button"
                                    onClick={() => handleNavigateBreadcrumb(idx)}
                                    disabled={isLast}
                                    className={`font-semibold hover:underline transition ${
                                        isLast ? 'text-slate-900 cursor-default no-underline' : 'text-emerald-700 hover:text-emerald-800'
                                    }`}
                                >
                                    {crumb.name}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Search & Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Destination Folder Selector with New Folder Button */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="font-medium text-slate-500 dark:text-slate-400">Import to:</span>
                        <select
                            value={selectedTargetFolderId}
                            onChange={(e) => {
                                if (e.target.value === '__NEW__') {
                                    setShowNewLocalFolderModal(true);
                                } else {
                                    setSelectedTargetFolderId(e.target.value);
                                }
                            }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            title="Target folder when importing from Google Drive to My Documents"
                        >
                            <option value="">Root (No Folder)</option>
                            {localFoldersList.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                            <option value="__NEW__">+ New Local Folder...</option>
                        </select>
                        <button
                            type="button"
                            onClick={() => setShowNewLocalFolderModal(true)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 transition"
                            title="Create new local folder to import into"
                        >
                            <FolderPlus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter Google Drive..."
                            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 w-44 sm:w-56"
                        />
                    </div>

                    {/* New Folder Button (Icon-only with tooltip) */}
                    <button
                        type="button"
                        onClick={() => setShowNewFolderModal(true)}
                        className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center justify-center"
                        title="Create New Folder in Google Drive"
                        aria-label="Create New Folder in Google Drive"
                    >
                        <FolderPlus className="w-4 h-4 text-emerald-600" />
                    </button>

                    {/* Refresh */}
                    <button
                        type="button"
                        onClick={fetchFiles}
                        disabled={loading}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition disabled:opacity-50"
                        title="Refresh Google Drive"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                    </button>

                    {/* View Toggle */}
                    <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}
                            title="Grid view"
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}
                            title="List view"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main File Listing */}
            {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <span className="text-sm font-medium">Accessing Google Drive...</span>
                </div>
            ) : files.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
                    <HardDrive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-base font-semibold text-slate-700 mb-1">No files or folders found</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        This Google Drive location is currently empty or contains no matching documents.
                    </p>
                </div>
            ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                    {/* Select All bar for Grid View */}
                    <div className="col-span-full flex items-center justify-between px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-semibold select-none">
                            <input
                                type="checkbox"
                                checked={files.length > 0 && selectedIds.size === files.length}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span>Select All ({files.length} items)</span>
                        </label>
                        {selectedIds.size > 0 && (
                            <button
                                type="button"
                                onClick={clearSelection}
                                className="text-xs text-slate-500 hover:text-slate-800 underline"
                            >
                                Clear selection ({selectedIds.size})
                            </button>
                        )}
                    </div>

                    {files.map(file => {
                        const isFolder = file.isFolder || file.mimeType === 'application/vnd.google-apps.folder';

                        if (isFolder) {
                            return (
                                <div
                                    key={file.id}
                                    onClick={() => handleOpenFolder(file)}
                                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between group relative ${
                                        selectedIds.has(file.id)
                                            ? 'border-amber-400 bg-amber-50 shadow-xs'
                                            : 'border-amber-200/80 bg-gradient-to-b from-amber-50/40 to-white hover:border-amber-400 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(file.id)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                toggleSelectItem(file.id);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4 flex-shrink-0 mr-0.5"
                                            title="Select folder"
                                        />
                                        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                            <Folder className="w-5 h-5 text-amber-600 fill-amber-200" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-800 truncate group-hover:text-amber-700">
                                                {file.name}
                                            </p>
                                            <p className="text-[10px] text-slate-400">Folder</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-amber-600 transition" />
                                </div>
                            );
                        }

                        return (
                            <div
                                key={file.id}
                                className={`p-3.5 rounded-xl border transition flex flex-col justify-between group ${
                                    selectedIds.has(file.id)
                                        ? 'border-emerald-500 bg-emerald-50/30 shadow-xs'
                                        : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md'
                                }`}
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(file.id)}
                                                onChange={() => toggleSelectItem(file.id)}
                                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4 flex-shrink-0"
                                                title="Select file"
                                            />
                                            <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                {((file.thumbnailLink || file.mimeType?.startsWith('image/')) && !failedThumbnails.has(file.id)) ? (
                                                    <img
                                                        src={file.thumbnailLink || `/api/drive/files/${file.id}/content`}
                                                        alt={file.name}
                                                        className="w-full h-full object-cover rounded-lg"
                                                        loading="lazy"
                                                        onError={() => setFailedThumbnails(prev => new Set(prev).add(file.id))}
                                                    />
                                                ) : (
                                                    getFileIcon(file)
                                                )}
                                            </div>
                                        </div>
                                        {/* Icon-Only Action Buttons */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handlePreview(file)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                                title="Preview document"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleAttachFileToBot(file)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition"
                                                title="Attach to AI Bot"
                                            >
                                                <Bot className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleImportToDocuments(file)}
                                                disabled={isBatchImporting}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-40"
                                                title="Import to My Documents"
                                            >
                                                <FolderPlus className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDownload(file)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                                title="Download file"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </button>
                                            {file.webViewLink && (
                                                <a
                                                    href={file.webViewLink}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                                    title="Open in Google Drive"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <h5 className="text-xs font-semibold text-slate-800 line-clamp-2 mb-1" title={file.name}>
                                        {file.name}
                                    </h5>
                                </div>
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 mt-2">
                                    <span>{formatBytes(file.size)}</span>
                                    <span>{file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : ''}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* List View */
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                                <th className="py-2.5 pl-4 pr-1 w-8">
                                    <input
                                        type="checkbox"
                                        checked={files.length > 0 && selectedIds.size === files.length}
                                        onChange={toggleSelectAll}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                        title="Select all"
                                    />
                                </th>
                                <th className="py-2.5 px-3">Name</th>
                                <th className="py-2.5 px-3">Size</th>
                                <th className="py-2.5 px-3">Modified</th>
                                <th className="py-2.5 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {files.map(file => {
                                const isFolder = file.isFolder || file.mimeType === 'application/vnd.google-apps.folder';

                                if (isFolder) {
                                    return (
                                        <tr
                                            key={file.id}
                                            onClick={() => handleOpenFolder(file)}
                                            className={`hover:bg-amber-50/50 cursor-pointer transition ${selectedIds.has(file.id) ? 'bg-amber-50/40' : ''}`}
                                        >
                                            <td className="py-2.5 pl-4 pr-1 w-8" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(file.id)}
                                                    onChange={() => toggleSelectItem(file.id)}
                                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                    title="Select folder"
                                                />
                                            </td>
                                            <td className="py-2.5 px-3 flex items-center gap-2.5 font-semibold text-slate-800">
                                                <Folder className="w-4 h-4 text-amber-500 fill-amber-200 flex-shrink-0" />
                                                <span className="truncate max-w-md">{file.name}</span>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-400">—</td>
                                            <td className="py-2.5 px-3 text-slate-400">
                                                {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="py-2.5 px-4 text-right">
                                                <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                                            </td>
                                        </tr>
                                    );
                                }

                                return (
                                    <tr key={file.id} className={`hover:bg-slate-50/80 transition ${selectedIds.has(file.id) ? 'bg-emerald-50/30' : ''}`}>
                                        <td className="py-2.5 pl-4 pr-1 w-8" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(file.id)}
                                                onChange={() => toggleSelectItem(file.id)}
                                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                title="Select file"
                                            />
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                    {((file.thumbnailLink || file.mimeType?.startsWith('image/')) && !failedThumbnails.has(file.id)) ? (
                                                        <img
                                                            src={file.thumbnailLink || `/api/drive/files/${file.id}/content`}
                                                            alt={file.name}
                                                            className="w-full h-full object-cover rounded-md"
                                                            loading="lazy"
                                                            onError={() => setFailedThumbnails(prev => new Set(prev).add(file.id))}
                                                        />
                                                    ) : (
                                                        getFileIcon(file)
                                                    )}
                                                </div>
                                                <span className="font-medium text-slate-800 truncate max-w-sm" title={file.name}>
                                                    {file.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                                            {formatBytes(file.size)}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-400">
                                            {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                            {/* Icon-Only Action Buttons */}
                                            <div className="inline-flex items-center gap-1 justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => handlePreview(file)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                                    title="Preview document"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAttachFileToBot(file)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition"
                                                    title="Attach to AI Bot"
                                                >
                                                    <Bot className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleImportToDocuments(file)}
                                                    disabled={isBatchImporting}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-40"
                                                    title="Import to My Documents"
                                                >
                                                    <FolderPlus className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownload(file)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                                    title="Download file"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                </button>
                                                {file.webViewLink && (
                                                    <a
                                                        href={file.webViewLink}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                                        title="Open in Google Drive"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Floating Batch Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-200 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[11px]">
                            {selectedIds.size}
                        </span>
                        <span className="font-semibold">
                            {selectedIds.size === 1 ? '1 item' : `${selectedIds.size} items`} selected
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                            {isCalculatingSizes ? '(Calculating size...)' : `(${formatBytes(selectedTotalBytes)})`}
                        </span>
                    </div>

                    <div className="h-4 w-px bg-slate-700" />

                    {/* Target Folder Selector */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 hidden sm:inline text-xs">Import to:</span>
                        <select
                            value={selectedTargetFolderId}
                            onChange={(e) => {
                                if (e.target.value === '__NEW__') {
                                    setShowNewLocalFolderModal(true);
                                } else {
                                    setSelectedTargetFolderId(e.target.value);
                                }
                            }}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[150px] truncate"
                        >
                            <option value="">(Root Documents)</option>
                            {localFoldersList.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                            <option value="__NEW__">+ New Local Folder...</option>
                        </select>
                        <button
                            type="button"
                            onClick={() => setShowNewLocalFolderModal(true)}
                            className="p-1 rounded hover:bg-slate-800 text-emerald-400"
                            title="Create new local folder to import into"
                        >
                            <FolderPlus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Batch Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => executeImport(selectedItems, selectedTargetFolderId)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-xs"
                        >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>Import to Documents</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleAttachSelectedToBot}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
                            title="Attach all selected files to AI Copilot"
                        >
                            <Bot className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Attach to Bot</span>
                        </button>

                        <button
                            type="button"
                            onClick={clearSelection}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Clear selection"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Rich Media Preview Modal */}
            {previewFile && (
                <MediaPreviewModal
                    file={previewFile}
                    onClose={() => setPreviewFile(null)}
                    onImport={(f) => executeImport([f], selectedTargetFolderId)}
                    onAttachToBot={handleAttachFileToBot}
                    onDownload={handleDownload}
                />
            )}



            {/* Insufficient Storage Quota Warning Modal */}
            {showQuotaAlert && quotaAlertInfo && (
                <div className="fixed inset-0 z-[100001] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-4">
                            <AlertCircle className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                            Storage Quota Insufficient
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            You cannot import these items because your local storage quota will be exceeded.
                        </p>
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-xs space-y-1.5 text-left mb-5 font-mono">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Selected Items Size:</span>
                                <span className="font-bold text-rose-600">{formatBytes(quotaAlertInfo.requiredBytes)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Available Storage:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{formatBytes(quotaAlertInfo.remainingBytes)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1">
                                <span className="text-slate-500">Total Quota:</span>
                                <span>{quotaAlertInfo.quotaMb} MB</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowQuotaAlert(false)}
                                className="w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OAuth Credentials Configuration Modal */}
            {showOAuthConfigModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Key className="w-5 h-5 text-indigo-200" />
                                <div>
                                    <h3 className="font-bold text-sm">Configure Google OAuth 2.0</h3>
                                    <p className="text-[11px] text-indigo-100">Connect personal 5TB Google One account</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowOAuthConfigModal(false)}
                                className="p-1 rounded-lg hover:bg-indigo-500/50 text-indigo-200 hover:text-white transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveOAuthConfig} className="p-5 space-y-4 text-xs">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-slate-700 space-y-1.5">
                                <p className="font-bold text-indigo-950 flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-indigo-600" /> Quick 2-Minute Google Cloud Setup:
                                </p>
                                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 ml-1">
                                    <li>Open <a href="https://console.cloud.google.com/apis/credentials?project=ulrms-481916" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline">Google Cloud Credentials (ulrms-481916) ↗</a></li>
                                    <li>Click <strong>+ CREATE CREDENTIALS</strong> &rarr; <strong>OAuth client ID</strong></li>
                                    <li>Application type: <strong>Web application</strong></li>
                                    <li>Add Authorized redirect URI: <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-mono text-[10px] select-all">http://localhost:5001/api/drive/auth/callback</code></li>
                                    <li>Paste the generated <strong>Client ID</strong> and <strong>Client Secret</strong> below:</li>
                                </ol>
                            </div>

                            <div>
                                <label className="block text-slate-700 font-bold mb-1">OAuth Client ID</label>
                                <input
                                    type="text"
                                    value={oauthClientIdInput}
                                    onChange={(e) => setOauthClientIdInput(e.target.value)}
                                    placeholder="e.g. 1234567890-abcdef.apps.googleusercontent.com"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-700 font-bold mb-1">OAuth Client Secret</label>
                                <input
                                    type="password"
                                    value={oauthClientSecretInput}
                                    onChange={(e) => setOauthClientSecretInput(e.target.value)}
                                    placeholder="GOCSPX-..."
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowOAuthConfigModal(false)}
                                    className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingConfig}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {savingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    <span>Save & Connect</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create New Folder Modal */}
            {showNewFolderModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FolderPlus className="w-5 h-5 text-emerald-100" />
                                <h3 className="font-bold text-sm">New Folder</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowNewFolderModal(false);
                                    setNewFolderName('');
                                }}
                                className="p-1 rounded-lg hover:bg-emerald-500 text-emerald-100 hover:text-white transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateFolder} className="p-5 space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-700 font-bold mb-1">Folder Name</label>
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="e.g. Research Papers, Invoices, Chemistry Lab"
                                    autoFocus
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <p className="mt-1 text-[11px] text-slate-500">
                                    This folder will be created directly in your Google Drive under{' '}
                                    <span className="font-semibold text-slate-700">
                                        {breadcrumbs[breadcrumbs.length - 1]?.name || 'current directory'}
                                    </span>.
                                </p>
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowNewFolderModal(false);
                                        setNewFolderName('');
                                    }}
                                    className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingFolder || !newFolderName.trim()}
                                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {creatingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderPlus className="w-3.5 h-3.5" />}
                                    <span>Create Folder</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create New Local Folder Modal (For Import Destination) */}
            {showNewLocalFolderModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FolderPlus className="w-5 h-5 text-emerald-100" />
                                <h3 className="font-bold text-sm">New Local Folder</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowNewLocalFolderModal(false);
                                    setNewLocalFolderName('');
                                }}
                                className="p-1 rounded-lg hover:bg-emerald-500 text-emerald-100 hover:text-white transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateLocalFolder} className="p-5 space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Folder Name</label>
                                <input
                                    type="text"
                                    value={newLocalFolderName}
                                    onChange={(e) => setNewLocalFolderName(e.target.value)}
                                    placeholder="e.g. Science Lab Records, Syllabus 2026"
                                    autoFocus
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <p className="mt-1 text-[11px] text-slate-500">
                                    This folder will be created in your <span className="font-semibold text-slate-700 dark:text-slate-300">My Documents</span> library and automatically selected for imported files.
                                </p>
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowNewLocalFolderModal(false);
                                        setNewLocalFolderName('');
                                    }}
                                    className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingLocalFolder || !newLocalFolderName.trim()}
                                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {creatingLocalFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderPlus className="w-3.5 h-3.5" />}
                                    <span>Create & Select</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
