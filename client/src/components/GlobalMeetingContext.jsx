'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Video, VideoOff, Mic, MicOff, Phone, Maximize2, Minimize2, Users, Move, Volume2, VolumeX, ExternalLink } from 'lucide-react';
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

export const useGlobalMeeting = () => useContext(GlobalMeetingContext);

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
    const videoRef = useRef(null);

    const toggleNativePiP = async () => {
        if (!videoRef.current) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (error) {
            console.error('Failed to toggle Native OS PiP:', error);
            toast.error('Native Picture-in-Picture not supported by your browser');
        }
    };

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
        </GlobalMeetingContext.Provider>
    );
}
