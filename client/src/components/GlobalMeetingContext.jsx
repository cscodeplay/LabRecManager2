'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Video, VideoOff, Mic, MicOff, Phone, Maximize2, Minimize2, Users, Move, Volume2, VolumeX } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

const GlobalMeetingContext = createContext({
    activeMeeting: null,
    setActiveMeeting: () => {},
    isPiPVisible: false,
    setIsPiPVisible: () => {},
    leaveMeeting: () => {},
    toggleMic: () => {},
    toggleCamera: () => {},
    isMicOn: true,
    isCameraOn: true,
    localStream: null
});

export function GlobalMeetingProvider({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuthStore();

    const [activeMeeting, setActiveMeeting] = useState(null); // { roomCode, title, hostName, participantCount }
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isPiPMinimized, setIsPiPMinimized] = useState(false);
    const [pipPosition, setPipPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef({ startX: 0, startY: 0, initialX: 20, initialY: 20 });

    const isMeetingRoute = pathname?.startsWith('/meeting/');
    const showPiP = activeMeeting && !isMeetingRoute;

    const leaveMeeting = () => {
        if (activeMeeting?.onLeave) {
            activeMeeting.onLeave();
        }
        setActiveMeeting(null);
        toast('Left meeting', { icon: '👋' });
    };

    const toggleMic = () => {
        if (activeMeeting?.onToggleMic) {
            activeMeeting.onToggleMic();
            setIsMicOn(prev => !prev);
        } else {
            setIsMicOn(prev => !prev);
        }
    };

    const toggleCamera = () => {
        if (activeMeeting?.onToggleCamera) {
            activeMeeting.onToggleCamera();
            setIsCameraOn(prev => !prev);
        } else {
            setIsCameraOn(prev => !prev);
        }
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: pipPosition.x,
            initialY: pipPosition.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const dx = dragRef.current.startX - e.clientX;
            const dy = dragRef.current.startY - e.clientY;
            setPipPosition({
                x: Math.max(10, Math.min(window.innerWidth - 280, dragRef.current.initialX + dx)),
                y: Math.max(10, Math.min(window.innerHeight - 200, dragRef.current.initialY + dy))
            });
        };

        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <GlobalMeetingContext.Provider value={{
            activeMeeting,
            setActiveMeeting,
            isPiPVisible: showPiP,
            leaveMeeting,
            toggleMic,
            toggleCamera,
            isMicOn,
            isCameraOn
        }}>
            {children}

            {/* Global Picture-in-Picture (PiP) Floating Meeting Overlay */}
            {showPiP && (
                <div
                    style={{ right: `${pipPosition.x}px`, bottom: `${pipPosition.y}px` }}
                    className={`fixed z-[99999] bg-slate-900 border-2 border-emerald-500/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-150 text-white select-none ${
                        isPiPMinimized ? 'w-64 h-16' : 'w-72 md:w-80 h-48 md:h-52'
                    }`}
                >
                    {/* Header Bar */}
                    <div
                        onMouseDown={handleMouseDown}
                        className="bg-slate-950/90 px-3 py-2 border-b border-slate-800 flex items-center justify-between cursor-move"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                            <p className="text-xs font-bold truncate text-white max-w-[140px]">
                                {activeMeeting.title || 'Live Meeting'}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsPiPMinimized(!isPiPMinimized)}
                                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                                title={isPiPMinimized ? 'Expand PiP' : 'Minimize PiP'}
                            >
                                {isPiPMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                                onClick={() => router.push(`/meeting/${activeMeeting.roomCode}`)}
                                className="p-1 text-emerald-400 hover:text-emerald-300 rounded hover:bg-emerald-500/20 transition"
                                title="Open Fullscreen Meeting"
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Content View */}
                    {!isPiPMinimized && (
                        <div className="relative w-full h-[calc(100%-80px)] bg-slate-950 flex items-center justify-center overflow-hidden">
                            {/* Stream or Avatar Display */}
                            {activeMeeting.stream ? (
                                <video
                                    ref={el => {
                                        if (el && activeMeeting.stream) el.srcObject = activeMeeting.stream;
                                    }}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover scale-x-[-1]"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center p-4 text-center">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white font-bold text-lg shadow-lg animate-pulse mb-1">
                                        {activeMeeting.title ? activeMeeting.title[0].toUpperCase() : 'M'}
                                    </div>
                                    <p className="text-[11px] text-emerald-400 font-semibold">Live Session Active</p>
                                </div>
                            )}

                            {/* Participant count badge */}
                            <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-slate-700 text-[10px] text-slate-200 flex items-center gap-1">
                                <Users className="w-3 h-3 text-emerald-400" />
                                <span>{activeMeeting.participantCount || 1} Connected</span>
                            </div>
                        </div>
                    )}

                    {/* Bottom Controls */}
                    <div className="bg-slate-950 px-3 py-2 border-t border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            {/* Mic Toggle */}
                            <button
                                onClick={toggleMic}
                                className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center transition ${
                                    isMicOn ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700' : 'bg-red-500/80 text-white'
                                }`}
                                title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
                            >
                                {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                            </button>

                            {/* Camera Toggle */}
                            <button
                                onClick={toggleCamera}
                                className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center transition ${
                                    isCameraOn ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700' : 'bg-red-500/80 text-white'
                                }`}
                                title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
                            >
                                {isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Rejoin Full Screen */}
                            <button
                                onClick={() => router.push(`/meeting/${activeMeeting.roomCode}`)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow transition"
                            >
                                Rejoin
                            </button>

                            {/* Disconnect Phone Button */}
                            <button
                                onClick={leaveMeeting}
                                className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition shadow"
                                title="Disconnect Meeting"
                            >
                                <Phone className="w-3.5 h-3.5 rotate-[135deg]" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </GlobalMeetingContext.Provider>
    );
}

export function useGlobalMeeting() {
    return useContext(GlobalMeetingContext);
}
