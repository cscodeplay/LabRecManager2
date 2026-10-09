'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ArrowLeft, Pencil, Users, Share2, Video, VideoOff, Plus, Trash2, Copy, 
    Image as ImageIcon, Edit3, LayoutGrid, List, ChevronLeft, ChevronRight, 
    ArrowUpDown, ArrowUp, ArrowDown 
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useConfirm } from '@/components/ConfirmDialog';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import Whiteboard from '@/components/Whiteboard';
import WhiteboardShareModal from '@/components/WhiteboardShareModal';
import CameraOverlay from '@/components/CameraOverlay';
import api from '@/lib/api';
import { formatDate } from '@/lib/dateUtils';

export default function WhiteboardPage() {
    const router = useRouter();
    const confirm = useConfirm();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    // Whiteboard state
    const [showShareModal, setShowShareModal] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [shareTargets, setShareTargets] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [sharedFileId, setSharedFileId] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [editingFileId, setEditingFileId] = useState(null);
    const [editTitle, setEditTitle] = useState('');

    // File Management & View State
    const [activeFileId, setActiveFileId] = useState(null);
    const [files, setFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [sortField, setSortField] = useState('lastOpenedAt'); // 'lastOpenedAt' | 'title' | 'sizeBytes' | 'pageCount'
    const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
    const [previewPages, setPreviewPages] = useState({}); // { [fileId]: number }

    // Camera state
    const [showCamera, setShowCamera] = useState(false);

    // Socket ref
    const socketRef = useRef(null);

    const isInstructor = user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'lab_assistant' || user?.role === 'principal';

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        // Route students smoothly to the live-board interface
        if (user?.role === 'student') {
            const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
            router.replace(`/live-board${currentSearch}`);
            return;
        }

        // Only instructors and admins can access standalone whiteboard instances
        if (!isInstructor) {
            toast.error('Only instructors and administrators can access the whiteboard');
            router.push('/dashboard');
            return;
        }

        // Initialize personal session ID if not set
        if (user?.id && !sessionId) {
            setSessionId(`personal_${user.id}`);
        }

        // Initialize socket connection
        initializeSocket();

        // Fetch files
        fetchFiles();
        
        // Restore active file if refreshed
        const savedFileId = sessionStorage.getItem('active_whiteboard_file');
        if (savedFileId) {
            setActiveFileId(savedFileId);
        }
        const savedSessionId = sessionStorage.getItem('active_whiteboard_session_id');
        if (savedSessionId) {
            setSessionId(savedSessionId);
        }
        const savedIsSharing = sessionStorage.getItem('active_whiteboard_is_sharing');
        if (savedIsSharing === 'true') {
            setIsSharing(true);
            setSharedFileId(savedFileId);
            try {
                const targets = JSON.parse(sessionStorage.getItem('active_whiteboard_share_targets') || '[]');
                setShareTargets(targets);
            } catch(e) {}
        }


        // Set active session for floating icon
        localStorage.setItem('active_whiteboard_session', JSON.stringify({
            title: 'My Whiteboard',
            url: window.location.pathname,
            timestamp: Date.now()
        }));

        // Migrate legacy personal workspace automatically in the background
        migrateLegacyWorkspace();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [isAuthenticated, _hasHydrated, isInstructor, user]);

    const initializeSocket = () => {
        const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        socketRef.current = io(socketUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        socketRef.current.on('connect', () => {
            console.log('Socket connected for whiteboard');
            if (user?.id) {
                socketRef.current.emit('join-user', user.id);
            }
        });
    };

    const fetchFiles = async () => {
        try {
            setLoadingFiles(true);
            const res = await api.get('/whiteboard/files');
            if (res.data.success) {
                setFiles(res.data.data);
            }
        } catch (e) {
            console.error('Failed to fetch whiteboard files:', e);
            toast.error('Could not load whiteboards');
        } finally {
            setLoadingFiles(false);
        }
    };

    useEffect(() => {
        const savedView = localStorage.getItem('whiteboard_view_mode');
        if (savedView === 'grid' || savedView === 'list') {
            setViewMode(savedView);
        }
    }, []);

    const handleSetViewMode = (mode) => {
        setViewMode(mode);
        localStorage.setItem('whiteboard_view_mode', mode);
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection(field === 'title' ? 'asc' : 'desc');
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes <= 0) return '0 KB';
        const kb = bytes / 1024;
        if (kb < 1024) return `${Math.round(kb)} KB`;
        const mb = kb / 1024;
        return `${mb.toFixed(1)} MB`;
    };

    const sortedFiles = useMemo(() => {
        return [...files].sort((a, b) => {
            let cmp = 0;
            if (sortField === 'title') {
                cmp = (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' });
            } else if (sortField === 'sizeBytes') {
                cmp = (a.sizeBytes || 0) - (b.sizeBytes || 0);
            } else if (sortField === 'pageCount') {
                cmp = (a.pageCount || 1) - (b.pageCount || 1);
            } else { // 'lastOpenedAt'
                const timeA = new Date(a.lastOpenedAt || a.updatedAt || a.createdAt || 0).getTime();
                const timeB = new Date(b.lastOpenedAt || b.updatedAt || b.createdAt || 0).getTime();
                cmp = timeA - timeB;
            }
            return sortDirection === 'asc' ? cmp : -cmp;
        });
    }, [files, sortField, sortDirection]);

    
    useEffect(() => {
        if (activeFileId) {
            sessionStorage.setItem('active_whiteboard_file', activeFileId);
            sessionStorage.setItem('active_whiteboard_session_id', sessionId || '');
            sessionStorage.setItem('active_whiteboard_is_sharing', isSharing ? 'true' : 'false');
            sessionStorage.setItem('active_whiteboard_share_targets', JSON.stringify(shareTargets || []));
        } 
    }, [activeFileId, sessionId, isSharing, shareTargets]);

    // Prevent iOS Safari gestures and vertical rubber-band bounce when whiteboard canvas is active
    useEffect(() => {
        if (!activeFileId) return;

        const preventOverscroll = (e) => {
            if (e.touches && e.touches.length > 1) {
                e.preventDefault();
            }
        };

        const preventGestures = (e) => {
            e.preventDefault();
        };

        document.body.classList.add('whiteboard-workspace-root');
        document.addEventListener('gesturestart', preventGestures, { passive: false });
        document.addEventListener('gesturechange', preventGestures, { passive: false });
        document.addEventListener('gestureend', preventGestures, { passive: false });
        window.addEventListener('touchmove', preventOverscroll, { passive: false });

        return () => {
            document.body.classList.remove('whiteboard-workspace-root');
            document.removeEventListener('gesturestart', preventGestures);
            document.removeEventListener('gesturechange', preventGestures);
            document.removeEventListener('gestureend', preventGestures);
            window.removeEventListener('touchmove', preventOverscroll);
        };
    }, [activeFileId]);

    const migrateLegacyWorkspace = async () => {
        try {
            const res = await api.post('/whiteboard/migrate-personal');
            if (res.data.success && res.data.message === 'Migrated successfully') {
                fetchFiles();
            }
        } catch (e) {
            console.error('Migration failed:', e);
        }
    };

    const handleCreateNew = async () => {
        try {
            const res = await api.post('/whiteboard/files', { title: 'Untitled Whiteboard' });
            if (res.data.success) {
                setActiveFileId(res.data.data.id);
            }
        } catch (e) {
            console.error('Failed to create whiteboard:', e);
            toast.error('Failed to create whiteboard');
        }
    };

    const handleDeleteFile = async (id, e) => {
        e.stopPropagation();
        const ok = await confirm({
            title: 'Delete Whiteboard?',
            message: 'Are you sure you want to permanently delete this whiteboard? Any drawings and elements will be removed.',
            confirmText: 'Delete Whiteboard',
            cancelText: 'Cancel',
            type: 'danger',
        });
        if (!ok) return;
        
        try {
            const res = await api.delete(`/whiteboard/files/${id}`);
            if (res.data.success) {
                toast.success('Whiteboard deleted');
                setFiles(files.filter(f => f.id !== id));
            }
        } catch (e) {
            console.error('Failed to delete whiteboard:', e);
            toast.error('Failed to delete whiteboard');
        }
    };

    const handleRenameFileStart = (id, currentTitle, e) => {
        e.stopPropagation();
        setEditingFileId(id);
        setEditTitle(currentTitle);
    };

    const handleRenameFileSubmit = async (id, e) => {
        if (e) {
            e.stopPropagation();
            if (e.type === 'keydown' && e.key !== 'Enter') return;
        }
        
        if (!editTitle.trim()) {
            setEditingFileId(null);
            return;
        }

        try {
            const res = await api.put(`/whiteboard/files/${id}`, { title: editTitle.trim() });
            if (res.data.success) {
                toast.success('Whiteboard renamed');
                setFiles(files.map(f => f.id === id ? { ...f, title: editTitle.trim() } : f));
            }
        } catch (e) {
            console.error('Failed to rename whiteboard:', e);
            toast.error('Failed to rename whiteboard');
        } finally {
            setEditingFileId(null);
        }
    };

    const handleDuplicateFile = async (id, e) => {
        e.stopPropagation();
        try {
            const res = await api.post(`/whiteboard/files/${id}/duplicate`);
            if (res.data.success) {
                toast.success('Whiteboard duplicated');
                fetchFiles();
            }
        } catch (e) {
            console.error('Failed to duplicate whiteboard:', e);
            toast.error('Failed to duplicate whiteboard');
        }
    };

    const handleStartSharing = (shareData) => {
        const newSessionId = `wb_standalone_${user?.id}_${Date.now()}`;
        setSessionId(newSessionId);
        setIsSharing(true);
        setSharedFileId(activeFileId);
        setShareTargets(shareData.targetNames);
        setShowShareModal(false);

        // Emit start sharing event
        if (socketRef.current) {
            socketRef.current.emit('whiteboard:start-share', {
                sessionId: newSessionId,
                whiteboardId: activeFileId,
                schoolId: user?.schoolId,
                instructorId: user?.id,
                instructorName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
                ...shareData
            });
        }

        toast.success(`Sharing whiteboard with ${shareData.targetNames.join(', ')}`);
    };

    const handleStopSharing = () => {
        setIsSharing(false);
        setSharedFileId(null);
        setShareTargets([]);
        if (socketRef.current && sessionId) {
            socketRef.current.emit('whiteboard:stop-share', {
                sessionId
            });
        }
        setSessionId(`personal_${user?.id}`);
        toast.success('Stopped sharing whiteboard');
    };

    const handleToggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const handleSave = (imageData) => {
        // Download the image
        const link = document.createElement('a');
        link.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = imageData;
        link.click();
        toast.success('Whiteboard saved!');
    };

    if (!_hasHydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (user?.role === 'student') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
                    <p className="text-sm font-medium text-slate-600">Connecting to Student Live Board...</p>
                </div>
            </div>
        );
    }

    // PHASE 2: CANVAS VIEW
    if (activeFileId) {
        return (
            <div className="h-[100dvh] w-screen bg-slate-100 flex flex-col overflow-hidden relative touch-none select-none overscroll-none whiteboard-workspace-root">
                {/* Top Navigation & Action Controls Bar (Minimal without title bar) */}
                <div className="absolute top-3 left-4 z-30 flex items-center gap-3">
                    <button 
                        onClick={() => {
                            setActiveFileId(null);
                            sessionStorage.removeItem('active_whiteboard_file');
                            sessionStorage.removeItem('active_whiteboard_session_id');
                            sessionStorage.removeItem('active_whiteboard_is_sharing');
                            sessionStorage.removeItem('active_whiteboard_share_targets');
                            fetchFiles();
                        }}
                        className="p-2 bg-white/90 hover:bg-white text-slate-700 rounded-lg shadow-md transition" 
                        title="Back to Whiteboards"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    {isSharing && (
                        <span className="flex items-center gap-1.5 text-xs bg-red-500 text-white font-bold px-2.5 py-1 rounded-full shadow-md animate-pulse">
                            <span className="w-2 h-2 bg-white rounded-full" />
                            LIVE SHARING
                        </span>
                    )}
                </div>

                {/* Camera toggle button placed at bottom-left of the board */}
                <div className="fixed bottom-6 left-6 z-40">
                    <button
                        onClick={() => setShowCamera(!showCamera)}
                        className={`p-3.5 rounded-full font-medium transition flex items-center justify-center shadow-2xl border ${showCamera
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                        title={showCamera ? 'Turn Camera Off' : 'Turn Camera On'}
                    >
                        {showCamera ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    </button>
                </div>

                {/* Whiteboard Area */}
                <main className="flex-1 overflow-hidden p-2 sm:p-4 flex items-center justify-center touch-none select-none overscroll-none">
                    <div className={`${isFullscreen ? 'fixed inset-0 z-[9999] bg-slate-100 flex items-center justify-center' : 'w-full h-full'}`}>
                        <Whiteboard
                            width={1200}
                            height={700}
                            isFullscreen={isFullscreen}
                            onToggleFullscreen={handleToggleFullscreen}
                            onSave={handleSave}
                            isInstructor={true}
                            isStudent={false}
                            permissions={{ canDraw: true, canShareAudio: true, canShareVideo: true }}
                            userName={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Instructor'}
                            userIdentifier={user?.employeeId || user?.id?.slice(0, 8) || ''}
                            isSharing={isSharing}
                            sharingTargets={shareTargets}
                            onShare={() => setShowShareModal(true)}
                            onStopSharing={handleStopSharing}
                            socket={socketRef.current}
                            sessionId={sessionId}
                            whiteboardId={activeFileId}
                        />
                    </div>
                </main>

                {/* Share Modal */}
                <WhiteboardShareModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    isSharing={isSharing}
                    currentTargets={shareTargets}
                    onStartSharing={handleStartSharing}
                    onStopSharing={handleStopSharing}
                />

                {/* Camera Overlay */}
                <CameraOverlay
                    isOpen={showCamera}
                    onClose={() => setShowCamera(false)}
                    socket={socketRef.current}
                    sessionId={sessionId}
                    isInstructor={true}
                />
            </div>
        );
    }

    // PHASE 1: FILE PICKER VIEW
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 shadow-xs">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-primary-600" />
                            My Whiteboards
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {files.length} {files.length === 1 ? 'whiteboard' : 'whiteboards'} saved
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Switcher: Grid vs List */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-2xs">
                        <button
                            onClick={() => handleSetViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-primary-600 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleSetViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    {/* New Whiteboard Button */}
                    <button
                        onClick={handleCreateNew}
                        className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Whiteboard</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
                {loadingFiles ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : sortedFiles.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto shadow-sm my-12">
                        <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Pencil className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">No Whiteboards Yet</h3>
                        <p className="text-sm text-slate-500 mb-6">Create your first collaborative or personal whiteboard to start drawing, teaching, and taking notes.</p>
                        <button
                            onClick={handleCreateNew}
                            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition shadow-md inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create Whiteboard</span>
                        </button>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {/* Create New Card */}
                        <div 
                            onClick={handleCreateNew}
                            className="bg-white border-2 border-dashed border-slate-300 rounded-xl aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50/50 transition group shadow-2xs"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-primary-100 flex items-center justify-center mb-3 transition">
                                <Plus className="w-6 h-6 text-slate-500 group-hover:text-primary-600" />
                            </div>
                            <span className="font-medium text-slate-600 group-hover:text-primary-700">New Whiteboard</span>
                        </div>

                        {/* File Cards */}
                        {sortedFiles.map(file => {
                            const thumbs = Array.isArray(file.pageThumbnails) && file.pageThumbnails.length > 0 
                                ? file.pageThumbnails 
                                : (file.thumbnailUrl ? [file.thumbnailUrl] : []);
                            const totalPagesCount = Math.max(thumbs.length, file.pageCount || 1);
                            const activePreviewIdx = Math.min(previewPages[file.id] || 0, totalPagesCount - 1);
                            const activeThumb = thumbs[activePreviewIdx] || thumbs[0] || null;

                            return (
                                <div 
                                    key={file.id} 
                                    className="bg-white border border-slate-200 rounded-xl shadow-xs hover:shadow-md hover:border-slate-300 transition group flex flex-col relative overflow-hidden"
                                >
                                    {/* Thumbnail Area with Carousel Nav */}
                                    <div 
                                        onClick={() => setActiveFileId(file.id)}
                                        className="aspect-video bg-white relative border-b border-slate-100 flex items-center justify-center cursor-pointer group/thumb overflow-hidden select-none"
                                    >
                                        {isSharing && sharedFileId === file.id && (
                                            <div className="absolute top-2 left-2 z-20 flex items-center gap-1 text-[11px] bg-red-500 text-white font-bold px-2 py-0.5 rounded shadow-md animate-pulse">
                                                <span className="w-1.5 h-1.5 bg-white rounded-full" />
                                                LIVE
                                            </div>
                                        )}

                                        {/* Multi-page Left Arrow */}
                                        {totalPagesCount > 1 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewPages(prev => ({
                                                        ...prev,
                                                        [file.id]: (activePreviewIdx - 1 + totalPagesCount) % totalPagesCount
                                                    }));
                                                }}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-slate-900/65 hover:bg-slate-900 text-white shadow-md flex items-center justify-center transition-all opacity-0 group-hover/thumb:opacity-100 hover:scale-105"
                                                title="Previous page preview"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                        )}

                                        {/* Multi-page Right Arrow */}
                                        {totalPagesCount > 1 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewPages(prev => ({
                                                        ...prev,
                                                        [file.id]: (activePreviewIdx + 1) % totalPagesCount
                                                    }));
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-slate-900/65 hover:bg-slate-900 text-white shadow-md flex items-center justify-center transition-all opacity-0 group-hover/thumb:opacity-100 hover:scale-105"
                                                title="Next page preview"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        )}

                                        {/* Page indicator badge */}
                                        {totalPagesCount > 1 && (
                                            <div className="absolute bottom-2 right-2 z-20 px-2 py-0.5 text-[10px] font-semibold bg-slate-900/75 text-white rounded-md backdrop-blur-xs shadow-xs pointer-events-none">
                                                {activePreviewIdx + 1} / {totalPagesCount}
                                            </div>
                                        )}

                                        {/* Thumbnail Image (with solid white background fallback) */}
                                        {activeThumb ? (
                                            <img 
                                                src={activeThumb} 
                                                alt={`${file.title} Page ${activePreviewIdx + 1}`} 
                                                className="w-full h-full object-contain bg-white transition-transform duration-200 group-hover/thumb:scale-102" 
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-slate-300 gap-1 bg-slate-50 w-full h-full">
                                                <ImageIcon className="w-8 h-8" />
                                                <span className="text-[11px] text-slate-400 font-medium">Page {activePreviewIdx + 1}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Content & Metadata */}
                                    <div className="p-4 flex-1">
                                        {editingFileId === file.id ? (
                                            <input
                                                type="text"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onKeyDown={(e) => handleRenameFileSubmit(file.id, e)}
                                                onBlur={(e) => handleRenameFileSubmit(file.id, e)}
                                                onClick={(e) => e.stopPropagation()}
                                                autoFocus
                                                className="font-semibold text-slate-900 flex-1 border border-primary-500 rounded px-1.5 py-0.5 outline-none w-full"
                                            />
                                        ) : (
                                            <h3 
                                                onClick={() => setActiveFileId(file.id)}
                                                className="font-semibold text-slate-900 line-clamp-1 cursor-pointer hover:text-primary-600 transition-colors"
                                                title={file.title}
                                            >
                                                {file.title}
                                            </h3>
                                        )}
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                            <span>{formatDate(file.lastOpenedAt || file.updatedAt)}</span>
                                            <span>•</span>
                                            <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                                {file.pageCount || 1} {file.pageCount === 1 ? 'page' : 'pages'}
                                            </span>
                                            <span>•</span>
                                            <span className="font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                                {formatFileSize(file.sizeBytes)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => setActiveFileId(file.id)}
                                                className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                                                title="Open Whiteboard"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={(e) => handleRenameFileStart(file.id, file.title, e)}
                                                className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                                                title="Rename"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={(e) => handleDuplicateFile(file.id, e)}
                                                className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                                                title="Duplicate"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <button 
                                            onClick={(e) => handleDeleteFile(file.id, e)}
                                            className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* LIST VIEW */
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider select-none">
                                        <th 
                                            onClick={() => handleSort('title')}
                                            className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>Name</span>
                                                {sortField === 'title' ? (
                                                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary-600" /> : <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
                                                ) : (
                                                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                                                )}
                                            </div>
                                        </th>
                                        <th 
                                            onClick={() => handleSort('pageCount')}
                                            className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>Pages</span>
                                                {sortField === 'pageCount' ? (
                                                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary-600" /> : <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
                                                ) : (
                                                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                                                )}
                                            </div>
                                        </th>
                                        <th 
                                            onClick={() => handleSort('sizeBytes')}
                                            className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>Size</span>
                                                {sortField === 'sizeBytes' ? (
                                                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary-600" /> : <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
                                                ) : (
                                                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                                                )}
                                            </div>
                                        </th>
                                        <th 
                                            onClick={() => handleSort('lastOpenedAt')}
                                            className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>Date Modified</span>
                                                {sortField === 'lastOpenedAt' ? (
                                                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary-600" /> : <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
                                                ) : (
                                                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                                                )}
                                            </div>
                                        </th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {sortedFiles.map(file => {
                                        const thumbs = Array.isArray(file.pageThumbnails) && file.pageThumbnails.length > 0 
                                            ? file.pageThumbnails 
                                            : (file.thumbnailUrl ? [file.thumbnailUrl] : []);
                                        const thumbUrl = thumbs[0] || file.thumbnailUrl;

                                        return (
                                            <tr 
                                                key={file.id}
                                                onClick={() => setActiveFileId(file.id)}
                                                className="hover:bg-slate-50 cursor-pointer transition-colors group"
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-14 h-9 bg-white border border-slate-200 rounded overflow-hidden flex-shrink-0 flex items-center justify-center shadow-2xs">
                                                            {thumbUrl ? (
                                                                <img src={thumbUrl} alt="" className="w-full h-full object-contain bg-white" />
                                                            ) : (
                                                                <ImageIcon className="w-4 h-4 text-slate-300" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            {editingFileId === file.id ? (
                                                                <input
                                                                    type="text"
                                                                    value={editTitle}
                                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                                    onKeyDown={(e) => handleRenameFileSubmit(file.id, e)}
                                                                    onBlur={(e) => handleRenameFileSubmit(file.id, e)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    autoFocus
                                                                    className="font-semibold text-slate-900 border border-primary-500 rounded px-1.5 py-0.5 outline-none w-full max-w-sm"
                                                                />
                                                            ) : (
                                                                <span className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors truncate block">
                                                                    {file.title}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isSharing && sharedFileId === file.id && (
                                                            <span className="flex items-center gap-1 text-[10px] bg-red-500 text-white font-bold px-1.5 py-0.5 rounded shadow-xs animate-pulse flex-shrink-0">
                                                                LIVE
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                                                        {file.pageCount || 1} {file.pageCount === 1 ? 'page' : 'pages'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                                                        {formatFileSize(file.sizeBytes)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap text-slate-600 text-xs">
                                                    {formatDate(file.lastOpenedAt || file.updatedAt)}
                                                </td>
                                                <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1 text-slate-500">
                                                        <button 
                                                            onClick={() => setActiveFileId(file.id)}
                                                            className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                                                            title="Open Whiteboard"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleRenameFileStart(file.id, file.title, e)}
                                                            className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                                                            title="Rename"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleDuplicateFile(file.id, e)}
                                                            className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                                                            title="Duplicate"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleDeleteFile(file.id, e)}
                                                            className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
