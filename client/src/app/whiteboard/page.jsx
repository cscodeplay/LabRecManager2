'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Users, Share2, Video, VideoOff, Plus, Trash2, Copy, Image as ImageIcon, Edit3 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import Whiteboard from '@/components/Whiteboard';
import WhiteboardShareModal from '@/components/WhiteboardShareModal';
import CameraOverlay from '@/components/CameraOverlay';
import api from '@/lib/api';

export default function WhiteboardPage() {
    const router = useRouter();
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

    // File Management State
    const [activeFileId, setActiveFileId] = useState(null);
    const [files, setFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(true);

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

        // Only instructors can access standalone whiteboard
        if (!isInstructor) {
            toast.error('Only instructors can access the whiteboard');
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
        if (activeFileId) {
            sessionStorage.setItem('active_whiteboard_file', activeFileId);
            sessionStorage.setItem('active_whiteboard_session_id', sessionId || '');
            sessionStorage.setItem('active_whiteboard_is_sharing', isSharing ? 'true' : 'false');
            sessionStorage.setItem('active_whiteboard_share_targets', JSON.stringify(shareTargets || []));
        } 
    }, [activeFileId, sessionId, isSharing, shareTargets]);

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
        if (!confirm('Are you sure you want to delete this whiteboard?')) return;
        
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
                instructorId: user?.id,
                instructorName: `${user?.firstName} ${user?.lastName}`,
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

    // PHASE 2: CANVAS VIEW
    if (activeFileId) {
        return (
            <div className="h-screen bg-slate-100 flex flex-col overflow-hidden relative">
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
                <main className="flex-1 p-4 flex items-center justify-center">
                    <div className={`${isFullscreen ? 'fixed inset-0 z-[9999] bg-slate-100 flex items-center justify-center' : 'w-full h-full'}`}>
                        <Whiteboard
                            width={1200}
                            height={700}
                            isFullscreen={isFullscreen}
                            onToggleFullscreen={handleToggleFullscreen}
                            onSave={handleSave}
                            isInstructor={true}
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
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
                <Link href="/dashboard" className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Pencil className="w-5 h-5 text-primary-600" />
                        My Whiteboards
                    </h1>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
                {loadingFiles ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        
                        {/* Create New Card */}
                        <div 
                            onClick={handleCreateNew}
                            className="bg-white border-2 border-dashed border-slate-300 rounded-xl aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition group shadow-sm"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-primary-100 flex items-center justify-center mb-3 transition">
                                <Plus className="w-6 h-6 text-slate-500 group-hover:text-primary-600" />
                            </div>
                            <span className="font-medium text-slate-600 group-hover:text-primary-700">New Whiteboard</span>
                        </div>

                        {/* File Cards */}
                        {files.map(file => (
                            <div 
                                key={file.id} 
                                className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition group flex flex-col relative overflow-hidden"
                            >
                                <div 
                                    onClick={() => setActiveFileId(file.id)}
                                    className="aspect-video bg-slate-50 relative border-b border-slate-100 flex items-center justify-center cursor-pointer group-hover:bg-slate-100 transition-colors"
                                >
                                    {isSharing && sharedFileId === file.id && (
                                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 text-xs bg-red-500 text-white font-bold px-2 py-1 rounded shadow-md animate-pulse">
                                            <span className="w-1.5 h-1.5 bg-white rounded-full" />
                                            LIVE
                                        </div>
                                    )}
                                    {file.thumbnailUrl ? (
                                        <img src={file.thumbnailUrl} alt={file.title} className="w-full h-full object-contain bg-white" />
                                    ) : (
                                        <ImageIcon className="w-10 h-10 text-slate-300" />
                                    )}
                                </div>
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
                                            className="font-semibold text-slate-900 flex-1 border border-primary-500 rounded px-1 outline-none w-full"
                                        />
                                    ) : (
                                        <h3 className="font-semibold text-slate-900 line-clamp-1">{file.title}</h3>
                                    )}
                                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                        <span>Modified: {new Date(file.lastOpenedAt).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>{file.pageCount || 1} {file.pageCount === 1 ? 'page' : 'pages'}</span>
                                    </div>
                                </div>
                                {/* Horizontal action bar */}
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
                        ))}

                    </div>
                )}
            </main>
        </div>
    );
}
