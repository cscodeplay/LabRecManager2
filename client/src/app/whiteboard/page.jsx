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
                <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'w-full h-full'}`}>
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
                        whiteboardId="admin-standalone"
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
                availableGroups={shareTargets.map((name, i) => ({ id: i, name }))}
            />
        </div>
    );
}
