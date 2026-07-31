'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Users, Share2, Video, VideoOff } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import Whiteboard from '@/components/Whiteboard';
import WhiteboardShareModal from '@/components/WhiteboardShareModal';
import CameraOverlay from '@/components/CameraOverlay';
import WhiteboardChatWindow from '@/components/WhiteboardChatWindow';

export default function WhiteboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    // Whiteboard state
    const [showShareModal, setShowShareModal] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [shareTargets, setShareTargets] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

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

        // Initialize socket connection
        initializeSocket();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [isAuthenticated, _hasHydrated, isInstructor]);

    const initializeSocket = () => {
        const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        socketRef.current = io(socketUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        socketRef.current.on('connect', () => {
            console.log('Socket connected for whiteboard');
            // Join user room for notifications
            if (user?.id) {
                socketRef.current.emit('join-user', user.id);
            }
        });
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
        setSessionId(null);
        toast.success('Stopped sharing whiteboard');
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

    return (
        <div className="h-screen bg-slate-100 flex flex-col overflow-hidden relative">
            {/* Top Navigation & Action Controls Bar (Minimal without title bar) */}
            <div className="absolute top-3 left-4 z-30 flex items-center gap-3">
                <Link href="/dashboard" className="p-2 bg-white/90 hover:bg-white text-slate-700 rounded-lg shadow-md transition" title="Back to Dashboard">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                {isSharing && (
                    <span className="flex items-center gap-1.5 text-xs bg-red-500 text-white font-bold px-2.5 py-1 rounded-full shadow-md animate-pulse">
                        <span className="w-2 h-2 bg-white rounded-full" />
                        LIVE SHARING
                    </span>
                )}
            </div>

                    <div className="flex items-center gap-3">
                        {/* Camera toggle button */}
                        <button
                            onClick={() => setShowCamera(!showCamera)}
                            className={`p-2.5 rounded-lg font-medium transition flex items-center justify-center ${showCamera
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                            title={showCamera ? 'Turn Camera Off' : 'Turn Camera On'}
                        >
                            {showCamera ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                        </button>

                        {/* Share button */}
                        {!isSharing ? (
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="p-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition flex items-center justify-center shadow-sm"
                                title="Share Whiteboard with Students"
                            >
                                <Share2 className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleStopSharing}
                                className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition flex items-center justify-center shadow-sm"
                                title="Stop Sharing Whiteboard"
                            >
                                <Users className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Whiteboard Area */}
            <main className="flex-1 p-4 flex items-center justify-center">
                <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'w-full max-w-6xl'}`}>
                    <Whiteboard
                        width={1200}
                        height={700}
                        isFullscreen={isFullscreen}
                        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                        onSave={handleSave}
                        isInstructor={true}
                        isSharing={isSharing}
                        sharingTargets={shareTargets}
                        onShare={() => setShowShareModal(true)}
                        onStopSharing={handleStopSharing}
                        socket={socketRef.current}
                        sessionId={sessionId}
                        whiteboardId={user?.id ? `user_${user.id}` : null}
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

            {/* Floatable Chat & Audience Window */}
            <WhiteboardChatWindow
                socket={socketRef.current}
                sessionId={sessionId}
                currentUser={{ name: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Instructor', role: 'instructor' }}
                isInstructor={true}
                availableGroups={availableGroups}
                selectedGroupIds={selectedGroupIds}
                onToggleGroupSelection={(groupId) => {
                    setSelectedGroupIds(prev =>
                        prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
                    );
                }}
            />
        </div>
    );
}
