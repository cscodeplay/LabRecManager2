'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { Pencil, ArrowLeft, AlertCircle, Radio, Maximize2, Minimize2 } from 'lucide-react';
import Whiteboard from '@/components/Whiteboard';
import CameraOverlay from '@/components/CameraOverlay';
import io from 'socket.io-client';
import api from '@/lib/api';

export default function LiveBoardPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [sharedSession, setSharedSession] = useState(null);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showCamera, setShowCamera] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated || user?.role !== 'student') {
            router.push('/login');
            return;
        }

        // 1. Check for saved session in localStorage
        try {
            const saved = localStorage.getItem('active_whiteboard_session');
            if (saved) {
                const session = JSON.parse(saved);
                if (session && session.timestamp && (Date.now() - session.timestamp < 2 * 60 * 60 * 1000)) {
                    setSharedSession(session);
                }
            }
        } catch (e) {
            console.error('Error loading session:', e);
        }

        // 2. Proactively fetch active shared session from backend API
        api.get('/whiteboard/active-session')
            .then(res => {
                if (res.data?.success && res.data.data?.session) {
                    const activeSess = res.data.data.session;
                    setSharedSession(activeSess);
                    localStorage.setItem('active_whiteboard_session', JSON.stringify({
                        ...activeSess,
                        timestamp: Date.now()
                    }));
                }
            })
            .catch(err => {
                console.warn('[LiveBoard] Active session check:', err?.message);
            });

        // Initialize socket
        const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const newSocket = io(socketUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            setIsConnected(true);
            if (user?.id) newSocket.emit('join-user', user.id);
            if (user?.classId) newSocket.emit('join-class', user.classId);
        });

        newSocket.on('disconnect', () => setIsConnected(false));

        newSocket.on('whiteboard:shared-with-you', (data) => {
            setSharedSession(data);
            localStorage.setItem('active_whiteboard_session', JSON.stringify({
                ...data,
                timestamp: Date.now()
            }));
        });

        newSocket.on('whiteboard:ended', (data) => {
            setSharedSession(prev => {
                if (!data?.sessionId || prev?.sessionId === data.sessionId) {
                    localStorage.removeItem('active_whiteboard_session');
                    return null;
                }
                return prev;
            });
        });

        setSocket(newSocket);

        return () => {
            if (newSocket) newSocket.disconnect();
        };
    }, [_hasHydrated, isAuthenticated, user, router]);

    if (!_hasHydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-slate-50 ${isFullscreen ? 'overflow-hidden' : ''}`}>
            {/* Fullscreen Overlay */}
            {isFullscreen && sharedSession ? (
                <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col w-screen h-screen">
                    <div className="bg-slate-900/90 text-white px-4 py-2 border-b border-slate-800 flex items-center justify-between z-20">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Pencil className="w-4 h-4 text-amber-400" />
                                <span className="font-semibold text-sm">Live Whiteboard</span>
                            </div>
                            {sharedSession.instructorName && (
                                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                                    Shared by {sharedSession.instructorName}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-1.5 text-xs font-medium ${isConnected ? 'text-green-400' : 'text-slate-400'}`}>
                                <Radio className="w-3.5 h-3.5 animate-pulse" />
                                {isConnected ? 'Connected' : 'Connecting...'}
                            </div>
                            <button
                                onClick={() => setIsFullscreen(false)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition"
                                title="Exit Fullscreen (Esc)"
                            >
                                <Minimize2 className="w-3.5 h-3.5" />
                                <span>Exit Fullscreen</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 w-full h-full relative overflow-hidden bg-white touch-none select-none overscroll-none whiteboard-workspace-root">
                        <Whiteboard
                            width={1200}
                            height={700}
                            isFullscreen={true}
                            onToggleFullscreen={() => setIsFullscreen(false)}
                            onClose={() => setIsFullscreen(false)}
                            socket={socket}
                            sessionId={sharedSession.sessionId}
                            whiteboardId={sharedSession.whiteboardId || null}
                            isSharing={false}
                            isInstructor={false}
                            isStudent={true}
                            userName={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Student' : 'Student'}
                            userIdentifier={user?.studentId || user?.admissionNumber || user?.id?.slice(0, 8) || ''}
                            permissions={sharedSession.permissions || { canDraw: true, canShareAudio: false, canShareVideo: false }}
                            showCameraControls={true}
                            isCameraOn={showCamera}
                            onCameraToggle={() => setShowCamera(!showCamera)}
                        />
                        <CameraOverlay
                            isOpen={showCamera}
                            onClose={() => setShowCamera(false)}
                            socket={socket}
                            sessionId={sharedSession.sessionId}
                            isInstructor={false}
                        />
                    </div>
                </div>
            ) : null}

            {/* Standard View */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <Pencil className="w-4 h-4 text-amber-500" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-lg font-semibold text-slate-900 leading-none">Live Whiteboard</h1>
                                    {sharedSession?.instructorName && (
                                        <span className="text-xs bg-amber-50 text-amber-800 font-medium px-2 py-0.5 rounded-full border border-amber-200">
                                            {sharedSession.instructorName}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${isConnected ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500'}`}>
                            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-green-600 animate-pulse' : 'text-slate-400'}`} />
                            {isConnected ? 'Connected' : 'Connecting...'}
                        </div>
                        {sharedSession && (
                            <button
                                onClick={() => setIsFullscreen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition shadow-sm"
                                title="Maximize Whiteboard"
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Maximize</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-4">
                {sharedSession ? (
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200/80 overflow-hidden touch-none select-none overscroll-none whiteboard-workspace-root" style={{ height: 'calc(100vh - 120px)', minHeight: '600px' }}>
                        <Whiteboard
                            width={1200}
                            height={700}
                            isFullscreen={isFullscreen}
                            onToggleFullscreen={() => setIsFullscreen(prev => !prev)}
                            onClose={() => { }}
                            socket={socket}
                            sessionId={sharedSession.sessionId}
                            whiteboardId={sharedSession.whiteboardId || null}
                            isSharing={false}
                            isInstructor={false}
                            isStudent={true}
                            userName={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Student' : 'Student'}
                            userIdentifier={user?.studentId || user?.admissionNumber || user?.id?.slice(0, 8) || ''}
                            permissions={sharedSession.permissions || { canDraw: true, canShareAudio: false, canShareVideo: false }}
                            showCameraControls={true}
                            isCameraOn={showCamera}
                            onCameraToggle={() => setShowCamera(!showCamera)}
                        />
                        <CameraOverlay
                            isOpen={showCamera}
                            onClose={() => setShowCamera(false)}
                            socket={socket}
                            sessionId={sharedSession.sessionId}
                            isInstructor={false}
                        />
                    </div>
                ) : (
                    <div className="card p-12 text-center my-8">
                        <AlertCircle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                        <h2 className="text-xl font-semibold text-slate-700 mb-2">No Active Whiteboard</h2>
                        <p className="text-slate-500 mb-6">
                            Your instructor hasn't shared a whiteboard yet.<br />
                            When they do, it will appear here automatically.
                        </p>
                        <div className="text-sm text-slate-400">
                            <div className={`inline-flex items-center gap-2 ${isConnected ? 'text-green-600' : 'text-amber-500'}`}>
                                <Radio className="w-4 h-4" />
                                {isConnected ? 'Listening for updates...' : 'Connecting to server...'}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
