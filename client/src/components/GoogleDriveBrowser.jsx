'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    HardDrive, Folder, FileText, FileSpreadsheet, File, Search, RefreshCw,
    Download, Eye, ExternalLink, ChevronRight, CornerUpLeft, Grid3X3, List,
    FolderPlus, Loader2, Check, AlertCircle, X, Clock, Database, Sparkles
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { googleDriveAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function GoogleDriveBrowser({ onImportSuccess, availableFolders = [] }) {
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
    const [previewContent, setPreviewContent] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Fetch integration status
    useEffect(() => {
        googleDriveAPI.getStatus()
            .then(res => {
                setStatus(res.data?.data || null);
            })
            .catch(() => setStatus({ isConfigured: false }));
    }, []);

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

    // 1-Click Import to ULRMS Documents
    const handleImportToDocuments = async (file) => {
        setImportingId(file.id);
        try {
            const res = await googleDriveAPI.importToDocuments({
                fileId: file.id,
                folderId: selectedTargetFolderId || null,
                name: file.name
            });
            if (res.data.success) {
                toast.success(`Imported "${file.name}" to Documents!`);
                if (onImportSuccess) onImportSuccess(res.data.data);
            } else {
                toast.error(res.data.message || 'Import failed');
            }
        } catch (err) {
            console.error('Import error:', err);
            toast.error(err.response?.data?.message || 'Failed to import document');
        } finally {
            setImportingId(null);
        }
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

    // Open Preview
    const handlePreview = async (file) => {
        setPreviewFile(file);
        setPreviewLoading(true);
        setPreviewContent(null);
        try {
            const res = await googleDriveAPI.getFileText(file.id);
            setPreviewContent(res.data?.data?.text || 'No text content available.');
        } catch (err) {
            setPreviewContent('Unable to preview content directly. Please download or open in Google Drive.');
        } finally {
            setPreviewLoading(false);
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
            {/* Google Drive Status & Live Folder Link */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                        <HardDrive className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800">Connected to Google Drive</span>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" /> ULRMS Shared Folder
                            </span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                            Files placed in your <strong>ULRMS</strong> Google Drive folder appear here automatically. To add new documents, drop them into your folder on Google Drive.
                        </p>
                    </div>
                </div>
                <a
                    href={currentFolderId ? `https://drive.google.com/drive/folders/${currentFolderId}` : "https://drive.google.com/drive/folders/1fzuxLH580TlkwJyATBbrjv7LBnFnC1Qp"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-xs flex-shrink-0 text-xs"
                    title="Open Google Drive folder in a new tab"
                >
                    <span>Open in Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                </a>
            </div>

            {/* Top Bar: Breadcrumbs, Destination Folder, View Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Breadcrumbs & Navigation */}
                <div className="flex items-center gap-1.5 flex-wrap text-sm">
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
                    {/* Destination Folder Selector */}
                    {availableFolders.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                            <span className="font-medium text-slate-500">Import to:</span>
                            <select
                                value={selectedTargetFolderId}
                                onChange={(e) => setSelectedTargetFolderId(e.target.value)}
                                className="bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                title="Target folder when importing from Google Drive to My Documents"
                            >
                                <option value="">Root (No Folder)</option>
                                {availableFolders.map(f => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

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
                    {files.map(file => {
                        const isFolder = file.isFolder || file.mimeType === 'application/vnd.google-apps.folder';
                        const isImporting = importingId === file.id;

                        if (isFolder) {
                            return (
                                <div
                                    key={file.id}
                                    onClick={() => handleOpenFolder(file)}
                                    className="p-3.5 rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50/40 to-white hover:border-amber-400 hover:shadow-md transition cursor-pointer flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
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
                                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition flex flex-col justify-between group"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                                            {getFileIcon(file)}
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
                                                onClick={() => handleImportToDocuments(file)}
                                                disabled={isImporting}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-40"
                                                title="Import to My Documents"
                                            >
                                                {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <FolderPlus className="w-3.5 h-3.5" />}
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
                                <th className="py-2.5 px-4">Name</th>
                                <th className="py-2.5 px-3">Size</th>
                                <th className="py-2.5 px-3">Modified</th>
                                <th className="py-2.5 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {files.map(file => {
                                const isFolder = file.isFolder || file.mimeType === 'application/vnd.google-apps.folder';
                                const isImporting = importingId === file.id;

                                if (isFolder) {
                                    return (
                                        <tr
                                            key={file.id}
                                            onClick={() => handleOpenFolder(file)}
                                            className="hover:bg-amber-50/50 cursor-pointer transition"
                                        >
                                            <td className="py-2.5 px-4 flex items-center gap-2.5 font-semibold text-slate-800">
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
                                    <tr key={file.id} className="hover:bg-slate-50/80 transition">
                                        <td className="py-2.5 px-4">
                                            <div className="flex items-center gap-2.5">
                                                {getFileIcon(file)}
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
                                                    onClick={() => handleImportToDocuments(file)}
                                                    disabled={isImporting}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-40"
                                                    title="Import to My Documents"
                                                >
                                                    {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <FolderPlus className="w-3.5 h-3.5" />}
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

            {/* Preview Modal */}
            {previewFile && (
                <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                            <div className="flex items-center gap-2 min-w-0">
                                {getFileIcon(previewFile)}
                                <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-slate-900 truncate" title={previewFile.name}>
                                        {previewFile.name}
                                    </h4>
                                    <p className="text-[10px] text-slate-500">Google Drive Document Preview</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleImportToDocuments(previewFile)}
                                    className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition"
                                    title="Import to My Documents"
                                >
                                    <FolderPlus className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDownload(previewFile)}
                                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition"
                                    title="Download file"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewFile(null)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
                                    title="Close preview"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto bg-slate-50/50">
                            {previewLoading ? (
                                <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                                    <span className="text-xs">Extracting text preview from Drive...</span>
                                </div>
                            ) : (
                                <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap break-words bg-white p-4 rounded-xl border border-slate-200">
                                    {previewContent}
                                </pre>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
