'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Users, Share2, Video, VideoOff, Plus, MoreVertical, Trash2, Copy, Image as ImageIcon, Edit3 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import Whiteboard from '@/components/Whiteboard';
import WhiteboardShareModal from '@/components/WhiteboardShareModal';
import CameraOverlay from '@/components/CameraOverlay';

export default function WhiteboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    // Whiteboard state
    const [showShareModal, setShowShareModal] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [shareTargets, setShareTargets] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

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
            const token = useAuthStore.getState().accessToken;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/whiteboard/files`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setFiles(data.data);
            }
        } catch (e) {
            console.error('Failed to fetch whiteboard files:', e);
            toast.error('Could not load whiteboards');
        } finally {
            setLoadingFiles(false);
        }
    };

    const migrateLegacyWorkspace = async () => {
        try {
            const token = useAuthStore.getState().accessToken;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/whiteboard/migrate-personal`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.message === 'Migrated successfully') {
                fetchFiles();
            }
        } catch (e) {
            console.error('Migration failed:', e);
        }
    };

    const handleCreateNew = async () => {
        try {
            const token = useAuthStore.getState().accessToken;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/whiteboard/files`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title: 'Untitled Whiteboard' })
            });
            const data = await res.json();
            if (data.success) {
                setActiveFileId(data.data.id);
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
            const token = useAuthStore.getState().accessToken;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/whiteboard/files/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Whiteboard deleted');
                setFiles(files.filter(f => f.id !== id));
            }
        } catch (e) {
            console.error('Failed to delete whiteboard:', e);
            toast.error('Failed to delete whiteboard');
        }
    };

    const handleRenameFile = async (id, currentTitle, e) => {
        e.stopPropagation();
        const newTitle = window.prompt('Enter a new name for this whiteboard:', currentTitle);
        
        if (newTitle === null || newTitle.trim() === '' || newTitle.trim() === currentTitle) {
            return;
        }

        try {
            const token = useAuthStore.getState().accessToken;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/whiteboard/files/${id}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title: newTitle.trim() })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Whiteboard renamed');
                setFiles(files.map(f => f.id === id ? { ...f, title: newTitle.trim() } : f));
            }
        } catch (e) {
            console.error('Failed to rename whiteboard:', e);
            toast.error('Failed to rename whiteboard');
        }
    };

    const handleDuplicateFile = async (id, e) => {
        e.stopPropagation();
        try {
            const token = useAuthStore.getState().accessToken;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/whiteboard/files/${id}/duplicate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
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
                            className="bg-white border-2 border-dashed border-slate-300 rounded-xl aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition group"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-primary-100 flex items-center justify-center mb-3 transition">
                                <Plus className="w-6 h-6 text-slate-500 group-hover:text-primary-600" />
                            </div>
                            <span className="font-medium text-slate-600 group-hover:text-primary-700">New Whiteboard</span>
                        </div>

                        {/* File Cards */}
                        {files.map(file => (
                            <div 
                                key={file.id} 
                                onClick={() => setActiveFileId(file.id)}
                                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer group flex flex-col"
                            >
                                <div className="aspect-video bg-slate-100 relative overflow-hidden border-b border-slate-100 flex items-center justify-center">
                                    {file.thumbnailUrl ? (
                                        <img src={file.thumbnailUrl} alt={file.title} className="w-full h-full object-contain bg-white" />
                                    ) : (
                                        <ImageIcon className="w-10 h-10 text-slate-300" />
                                    )}
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="font-semibold text-slate-800 line-clamp-1 flex-1">{file.title}</h3>
                                        
                                        <div className="relative group/menu">
                                            <button 
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition opacity-0 group-hover:opacity-100"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                            
                                            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-xl py-1 hidden group-hover/menu:block z-10">
                                                <button 
                                                    onClick={(e) => handleRenameFile(file.id, file.title, e)}
                                                    className="w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" /> Rename
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDuplicateFile(file.id, e)}
                                                    className="w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                >
                                                    <Copy className="w-3.5 h-3.5" /> Duplicate
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDeleteFile(file.id, e)}
                                                    className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-auto flex items-center justify-between text-xs text-slate-500">
                                        <span>{new Date(file.lastOpenedAt).toLocaleDateString()}</span>
                                        <span>{file.pageCount || 1} {file.pageCount === 1 ? 'page' : 'pages'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                    </div>
                )}
            </main>
        </div>
    );
}
