'use client';

import { useState, useEffect, useRef } from 'react';
import { 
    X, Search, Folder, ChevronRight, FileText, HardDrive, 
    Upload, Camera, Loader2, Image as ImageIcon, AlertCircle 
} from 'lucide-react';
import { documentsAPI, foldersAPI, googleDriveAPI } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

export default function WhiteboardImagePickerModal({ isOpen, onClose, onSelectImage }) {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState('documents'); // 'documents' | 'drive' | 'screenshots'
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [insertingId, setInsertingId] = useState(null);

    // --- Tab 1: Documents State ---
    const [docFolders, setDocFolders] = useState([]);
    const [docImages, setDocImages] = useState([]);
    const [currentDocFolder, setCurrentDocFolder] = useState(null);
    const [docBreadcrumbs, setDocBreadcrumbs] = useState([]);

    // --- Tab 2: Google Drive State ---
    const [driveStatus, setDriveStatus] = useState(null);
    const [driveFolders, setDriveFolders] = useState([]);
    const [driveImages, setDriveImages] = useState([]);
    const [currentDriveFolder, setCurrentDriveFolder] = useState('root');
    const [driveBreadcrumbs, setDriveBreadcrumbs] = useState([]);
    const [driveViewMode, setDriveViewMode] = useState('all'); // 'all' (all folders recursive) | 'folders' (browse folder by folder)

    // --- Tab 3: Screenshots State ---
    const [screenshots, setScreenshots] = useState([]);

    const fileUploadRef = useRef(null);

    // Load Documents & Folders
    const loadDocumentsData = async () => {
        setLoading(true);
        try {
            // Load folders
            const folderParams = {};
            if (searchQuery) {
                folderParams.search = searchQuery;
            } else {
                folderParams.parentId = currentDocFolder ? currentDocFolder.id : null;
            }
            const fRes = await foldersAPI.getAll(folderParams);
            setDocFolders(fRes.data?.data?.folders || []);

            // Load documents
            const docParams = {};
            if (searchQuery) docParams.search = searchQuery;
            if (currentDocFolder) docParams.folderId = currentDocFolder.id;
            else if (!searchQuery) docParams.folderId = 'root';

            const dRes = await documentsAPI.getAll(docParams);
            const allDocs = dRes.data?.data?.documents || [];
            const imgs = allDocs.filter(d => 
                IMAGE_EXTENSIONS.includes(d.fileType?.toLowerCase()) && d.url
            );
            setDocImages(imgs);
        } catch (err) {
            console.error('Failed to load documents data:', err);
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    // Load Google Drive files
    const loadDriveData = async () => {
        setLoading(true);
        try {
            // Verify status
            const sRes = await googleDriveAPI.getStatus();
            const statusData = sRes.data?.data;
            setDriveStatus(statusData);

            if (!statusData?.isConfigured) {
                setLoading(false);
                return;
            }

            if (driveViewMode === 'all') {
                // Search recursively across all folders and subfolders
                const params = {
                    folderId: 'all',
                    recursive: true,
                    mimeType: 'image',
                    pageSize: 100
                };
                if (searchQuery) params.search = searchQuery;

                const res = await googleDriveAPI.listFiles(params);
                const files = res.data?.data?.files || [];

                setDriveFolders([]);
                const imgs = files.filter(f => {
                    if (f.isFolder) return false;
                    if (f.mimeType?.startsWith('image/')) return true;
                    const ext = f.name?.split('.').pop()?.toLowerCase();
                    return IMAGE_EXTENSIONS.includes(ext);
                });
                setDriveImages(imgs);
            } else {
                // Browse by specific folder
                const params = {
                    folderId: currentDriveFolder,
                    pageSize: 60
                };
                if (searchQuery) params.search = searchQuery;

                const res = await googleDriveAPI.listFiles(params);
                const files = res.data?.data?.files || [];

                setDriveFolders(files.filter(f => f.isFolder));
                const imgs = files.filter(f => {
                    if (f.isFolder) return false;
                    if (f.mimeType?.startsWith('image/')) return true;
                    const ext = f.name?.split('.').pop()?.toLowerCase();
                    return IMAGE_EXTENSIONS.includes(ext);
                });
                setDriveImages(imgs);
            }
        } catch (err) {
            console.error('Failed to load Google Drive files:', err);
            toast.error('Failed to load Google Drive files');
        } finally {
            setLoading(false);
        }
    };

    // Load Screenshots
    const loadScreenshotsData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/documents?category=Screenshot');
            const docs = res.data?.data?.documents || [];
            setScreenshots(docs.filter(d => d.url));
        } catch (err) {
            console.error('Failed to load screenshots:', err);
            toast.error('Failed to load screenshots');
        } finally {
            setLoading(false);
        }
    };

    // Effect on tab change or folder/search change
    useEffect(() => {
        if (activeTab === 'documents') {
            loadDocumentsData();
        } else if (activeTab === 'drive') {
            loadDriveData();
        } else if (activeTab === 'screenshots') {
            loadScreenshotsData();
        }
    }, [activeTab, currentDocFolder, currentDriveFolder, driveViewMode, searchQuery]);

    // Handle Documents Folder Navigation
    const handleDocFolderClick = (folder) => {
        setCurrentDocFolder(folder);
        setDocBreadcrumbs(prev => [...prev, folder]);
    };

    const handleDocBreadcrumbClick = (folder, index) => {
        if (!folder) {
            setCurrentDocFolder(null);
            setDocBreadcrumbs([]);
        } else {
            setCurrentDocFolder(folder);
            setDocBreadcrumbs(prev => prev.slice(0, index + 1));
        }
    };

    // Handle Drive Folder Navigation
    const handleDriveFolderClick = (folder) => {
        setCurrentDriveFolder(folder.id);
        setDriveBreadcrumbs(prev => [...prev, folder]);
    };

    const handleDriveBreadcrumbClick = (folder, index) => {
        if (!folder) {
            setCurrentDriveFolder('root');
            setDriveBreadcrumbs([]);
        } else {
            setCurrentDriveFolder(folder.id);
            setDriveBreadcrumbs(prev => prev.slice(0, index + 1));
        }
    };

    // Handle selecting local document or screenshot image
    const handleSelectLocalImage = (doc) => {
        if (!doc.url) return;
        onSelectImage(doc.url);
        onClose();
    };

    // Handle selecting Google Drive image
    const handleSelectDriveImage = async (file) => {
        setInsertingId(file.id);
        try {
            // Attempt to download content blob to avoid CORS issues on canvas
            const res = await googleDriveAPI.downloadContent(file.id);
            const blob = res.data;
            const reader = new FileReader();
            reader.onload = (e) => {
                onSelectImage(e.target.result);
                setInsertingId(null);
                onClose();
            };
            reader.onerror = () => {
                // Fallback to direct web/content link or thumbnail
                const fallbackUrl = file.webViewLink || file.thumbnailLink || `/api/drive/files/${file.id}/content`;
                onSelectImage(fallbackUrl);
                setInsertingId(null);
                onClose();
            };
            reader.readAsDataURL(blob);
        } catch (err) {
            console.warn('Failed to stream Drive buffer, falling back to direct link:', err);
            const fallbackUrl = file.thumbnailLink || `/api/drive/files/${file.id}/content`;
            onSelectImage(fallbackUrl);
            setInsertingId(null);
            onClose();
        }
    };

    // Handle Direct File Upload
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            onSelectImage(event.target.result);
            onClose();
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                            <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Insert Image to Whiteboard</h2>
                            <p className="text-xs text-slate-500">Choose images from your Documents, Google Drive, or Screenshots</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fileUploadRef.current?.click()}
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="Upload from Device"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Upload from Device
                        </button>
                        <input
                            type="file"
                            ref={fileUploadRef}
                            onChange={handleFileUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs & Search Bar */}
                <div className="px-6 pt-3 pb-2 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => { setActiveTab('documents'); setSearchQuery(''); }}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                                activeTab === 'documents'
                                    ? 'bg-white text-primary-600 shadow-xs border border-slate-200/80'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            <FileText className="w-4 h-4" />
                            My Documents
                        </button>
                        <button
                            type="button"
                            onClick={() => { setActiveTab('drive'); setSearchQuery(''); }}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                                activeTab === 'drive'
                                    ? 'bg-white text-emerald-600 shadow-xs border border-slate-200/80'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            <HardDrive className="w-4 h-4" />
                            Google Drive
                        </button>
                        <button
                            type="button"
                            onClick={() => { setActiveTab('screenshots'); setSearchQuery(''); }}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                                activeTab === 'screenshots'
                                    ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/80'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            <Camera className="w-4 h-4" />
                            Screenshots
                        </button>
                    </div>

                    {activeTab !== 'screenshots' && (
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search images or folders..."
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Breadcrumbs Navigation */}
                {activeTab === 'documents' && (
                    <div className="px-6 py-2 border-b border-slate-100 bg-white flex items-center gap-1.5 text-xs text-slate-600 overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => handleDocBreadcrumbClick(null)}
                            className={`hover:text-primary-600 flex items-center gap-1 ${!currentDocFolder ? 'font-bold text-slate-900' : ''}`}
                        >
                            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                            Documents
                        </button>
                        {docBreadcrumbs.map((crumb, idx) => (
                            <div key={crumb.id} className="flex items-center gap-1.5 shrink-0">
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                                <button
                                    type="button"
                                    onClick={() => handleDocBreadcrumbClick(crumb, idx)}
                                    className={`hover:text-primary-600 ${idx === docBreadcrumbs.length - 1 ? 'font-bold text-slate-900' : ''}`}
                                >
                                    {crumb.name}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Google Drive Account ID Banner & View Mode Toggle */}
                {activeTab === 'drive' && driveStatus?.isConfigured && (
                    <div className="px-6 py-2.5 bg-emerald-50/70 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <HardDrive className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 text-xs">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-slate-900">
                                        {driveStatus?.user?.displayName ? `${driveStatus.user.displayName} ` : 'Google Drive'}
                                    </span>
                                    <span className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-950 truncate max-w-[260px]" title={driveStatus?.user?.emailAddress || 'charan881130@gmail.com'}>
                                        {driveStatus?.user?.emailAddress || (driveStatus?.authType === 'oauth_user' ? 'charan881130@gmail.com' : driveStatus?.serviceAccountEmail) || 'charan881130@gmail.com'}
                                    </span>
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        {driveStatus?.authType === 'oauth_user' ? 'OAuth 2.0 (5 TB)' : 'Service Account'}
                                    </span>
                                    {driveStatus?.scopeNotice && (
                                        <a
                                            href="/documents?tab=drive"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[10px] text-emerald-700 underline font-medium hover:text-emerald-900 ml-1"
                                            title={driveStatus.scopeNotice}
                                        >
                                            Re-authorize Full Scopes
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-emerald-200 shrink-0 text-xs">
                            <button
                                type="button"
                                onClick={() => setDriveViewMode('all')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                                    driveViewMode === 'all'
                                        ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                All Drive Images
                            </button>
                            <button
                                type="button"
                                onClick={() => setDriveViewMode('folders')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                                    driveViewMode === 'folders'
                                        ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                Browse Folders
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'drive' && driveStatus?.isConfigured && driveViewMode === 'folders' && (
                    <div className="px-6 py-2 border-b border-slate-100 bg-white flex items-center gap-1.5 text-xs text-slate-600 overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => handleDriveBreadcrumbClick(null)}
                            className={`hover:text-emerald-600 flex items-center gap-1 ${currentDriveFolder === 'root' ? 'font-bold text-slate-900' : ''}`}
                        >
                            <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                            Google Drive
                        </button>
                        {driveBreadcrumbs.map((crumb, idx) => (
                            <div key={crumb.id} className="flex items-center gap-1.5 shrink-0">
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                                <button
                                    type="button"
                                    onClick={() => handleDriveBreadcrumbClick(crumb, idx)}
                                    className={`hover:text-emerald-600 ${idx === driveBreadcrumbs.length - 1 ? 'font-bold text-slate-900' : ''}`}
                                >
                                    {crumb.name}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Main Content Area */}
                <div className="p-6 overflow-y-auto flex-1 min-h-[320px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-56 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary-500" />
                            <p className="text-xs">Loading items...</p>
                        </div>
                    ) : activeTab === 'documents' ? (
                        // Tab 1: Documents content
                        <div>
                            {/* Folders row */}
                            {docFolders.length > 0 && (
                                <div className="mb-5">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Folders</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {docFolders.map(folder => (
                                            <div
                                                key={folder.id}
                                                onClick={() => handleDocFolderClick(folder)}
                                                className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-300 cursor-pointer transition group"
                                            >
                                                <Folder className="w-5 h-5 text-yellow-500 fill-yellow-100 group-hover:scale-105 transition-transform" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-slate-800 truncate">{folder.name}</p>
                                                    <p className="text-[10px] text-slate-400">{folder.documentCount || 0} files</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Images grid */}
                            <div>
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                                    Images {docImages.length > 0 && `(${docImages.length})`}
                                </h3>
                                {docImages.length === 0 ? (
                                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <ImageIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                        <p className="text-xs text-slate-600 font-medium">No image files in this folder</p>
                                        <p className="text-[11px] text-slate-400 mt-1">Images in PNG, JPG, WEBP, or SVG format will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {docImages.map(doc => (
                                            <div
                                                key={doc.id}
                                                onClick={() => handleSelectLocalImage(doc)}
                                                className="group relative border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-primary-500 hover:shadow-md transition bg-slate-50"
                                            >
                                                <div className="aspect-square bg-slate-100 flex items-center justify-center relative overflow-hidden">
                                                    <img
                                                        src={doc.url}
                                                        alt={doc.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                                        <span className="text-white text-xs font-semibold bg-primary-600 px-3 py-1.5 rounded-full shadow-md">
                                                            Insert
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="p-2.5 bg-white border-t border-slate-100">
                                                    <p className="text-xs font-medium text-slate-800 truncate" title={doc.name}>{doc.name}</p>
                                                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                                                        <span className="uppercase">{doc.fileType}</span>
                                                        <span>{doc.fileSizeFormatted || ''}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'drive' ? (
                        // Tab 2: Google Drive content
                        <div>
                            {!driveStatus?.isConfigured ? (
                                <div className="text-center py-12 bg-emerald-50/50 rounded-xl border border-emerald-100 p-6">
                                    <AlertCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                                    <h3 className="text-sm font-bold text-slate-800">Google Drive is Not Configured</h3>
                                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                        Configure Google Drive in the Documents tab or Settings to browse and insert your cloud images.
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    {/* Drive Folders (only in folder browsing mode) */}
                                    {driveViewMode === 'folders' && driveFolders.length > 0 && (
                                        <div className="mb-5">
                                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Drive Folders</h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                {driveFolders.map(folder => (
                                                    <div
                                                        key={folder.id}
                                                        onClick={() => handleDriveFolderClick(folder)}
                                                        className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/60 hover:border-emerald-300 cursor-pointer transition group"
                                                    >
                                                        <Folder className="w-5 h-5 text-emerald-500 fill-emerald-100 group-hover:scale-105 transition-transform" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-semibold text-slate-800 truncate">{folder.name}</p>
                                                            <p className="text-[10px] text-slate-400">Folder</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Drive Images */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2.5">
                                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                {driveViewMode === 'all' ? 'All Images Across Drive' : 'Folder Images'} {driveImages.length > 0 && `(${driveImages.length})`}
                                            </h3>
                                            {driveViewMode === 'folders' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDriveViewMode('all')}
                                                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1"
                                                >
                                                    <Search className="w-3 h-3" /> Search all folders instead
                                                </button>
                                            )}
                                        </div>

                                        {driveImages.length === 0 ? (
                                            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
                                                <ImageIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                                <p className="text-xs text-slate-700 font-semibold">
                                                    {driveViewMode === 'folders' ? 'No image files directly in this folder' : 'No image files found on this Google Drive'}
                                                </p>
                                                {driveViewMode === 'folders' && driveFolders.length > 0 ? (
                                                    <div className="mt-2 text-xs text-slate-500 max-w-md mx-auto">
                                                        <p>This folder contains {driveFolders.length} subfolder(s). Your images might be stored inside subfolders.</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDriveViewMode('all')}
                                                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs"
                                                        >
                                                            <Search className="w-3.5 h-3.5" />
                                                            Search All Drive Folders for Images
                                                        </button>
                                                    </div>
                                                ) : driveViewMode === 'folders' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setDriveViewMode('all')}
                                                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs"
                                                    >
                                                        <Search className="w-3.5 h-3.5" />
                                                        Search All Drive Folders
                                                    </button>
                                                ) : (
                                                    <p className="text-[11px] text-slate-400 mt-1">
                                                        Make sure images are saved in JPEG, PNG, WEBP, or SVG format, or upload directly from your device.
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                {driveImages.map(file => (
                                                    <div
                                                        key={file.id}
                                                        onClick={() => insertingId !== file.id && handleSelectDriveImage(file)}
                                                        className="group relative border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-emerald-500 hover:shadow-md transition bg-slate-50"
                                                    >
                                                        <div className="aspect-square bg-slate-100 flex items-center justify-center relative overflow-hidden">
                                                            <img
                                                                src={file.thumbnailLink || `/api/drive/files/${file.id}/content`}
                                                                alt={file.name}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                                loading="lazy"
                                                                onError={(e) => {
                                                                    e.currentTarget.onerror = null;
                                                                    e.currentTarget.src = `/api/drive/files/${file.id}/content`;
                                                                }}
                                                            />
                                                            <div className={`absolute inset-0 bg-slate-900/40 ${insertingId === file.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} flex items-center justify-center transition`}>
                                                                {insertingId === file.id ? (
                                                                    <div className="flex items-center gap-1.5 text-white text-xs bg-emerald-600 px-3 py-1.5 rounded-full shadow-md">
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                        Loading...
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-white text-xs font-semibold bg-emerald-600 px-3 py-1.5 rounded-full shadow-md">
                                                                        Insert
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="p-2.5 bg-white border-t border-slate-100">
                                                            <p className="text-xs font-medium text-slate-800 truncate" title={file.name}>{file.name}</p>
                                                            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                                                                <span className="truncate max-w-[100px]">{file.mimeType?.replace('image/', '') || 'image'}</span>
                                                                <span>{file.size ? `${(file.size / 1024).toFixed(0)} KB` : ''}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Tab 3: Screenshots content
                        <div>
                            {screenshots.length === 0 ? (
                                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <Camera className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                    <p className="text-xs text-slate-600 font-medium">No screenshots found</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Screenshots saved in documents will appear here.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {screenshots.map(doc => (
                                        <div
                                            key={doc.id}
                                            onClick={() => handleSelectLocalImage(doc)}
                                            className="group relative border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-indigo-500 hover:shadow-md transition bg-slate-50"
                                        >
                                            <div className="aspect-video bg-slate-100 flex items-center justify-center relative overflow-hidden">
                                                <img
                                                    src={doc.url}
                                                    alt={doc.name}
                                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                                    <span className="text-white text-xs font-semibold bg-indigo-600 px-3 py-1.5 rounded-full shadow-md">
                                                        Insert
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-2.5 bg-white border-t border-slate-100">
                                                <p className="text-xs font-medium text-slate-800 truncate" title={doc.name}>{doc.name}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    {new Date(doc.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => fileUploadRef.current?.click()}
                        className="sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs"
                    >
                        <Upload className="w-3.5 h-3.5" /> Upload
                    </button>
                    <div className="hidden sm:block text-[11px] text-slate-400">
                        Click on any image to insert it directly onto the Whiteboard canvas.
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary text-xs py-1.5 px-4"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
