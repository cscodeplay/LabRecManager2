'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Users, Share2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import Whiteboard from '@/components/Whiteboard';
import WhiteboardShareModal from '@/components/WhiteboardShareModal';

export default function WhiteboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    // Whiteboard state
    const [showShareModal, setShowShareModal] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [shareTargets, setShareTargets] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

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
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 transition">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                <Pencil className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    Interactive Whiteboard
                                    {isSharing && (
                                        <span className="flex items-center gap-1 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                            LIVE
                                        </span>
                                    )}
                                </h1>
                                <p className="text-sm text-slate-500">
                                    {isSharing
                                        ? `Sharing with: ${shareTargets.join(', ')}`
                                        : 'Draw and share with your students'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Share button */}
                        {!isSharing ? (
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition"
                            >
                                <Share2 className="w-4 h-4" />
                                Share with Students
                            </button>
                        ) : (
                            <button
                                onClick={handleStopSharing}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
                            >
                                <Users className="w-4 h-4" />
                                Stop Sharing
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
        </div>
    );
}
