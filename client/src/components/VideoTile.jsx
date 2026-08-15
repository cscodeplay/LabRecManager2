'use client';

import React, { useEffect, useRef, useState } from 'react';
import { User, Mic, MicOff, MonitorUp, Pin, PinOff } from 'lucide-react';

export default function VideoTile({
    stream,
    isLocal = false,
    isCameraOn = true,
    isMicOn = true,
    isScreenSharing = false,
    name = 'Participant',
    role = 'student',
    isSpeaking = false,
    isPinned = false,
    onTogglePin,
    className = '',
    compact = false
}) {
    const videoRef = useRef(null);
    const [hasVideoTrack, setHasVideoTrack] = useState(false);

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        if (stream) {
            videoElement.srcObject = stream;
            
            const checkTracks = () => {
                const tracks = stream.getVideoTracks();
                setHasVideoTrack(tracks.length > 0 && tracks.some(t => t.enabled && t.readyState === 'live'));
            };

            checkTracks();
            
            // Listen for track changes
            stream.onaddtrack = checkTracks;
            stream.onremovetrack = checkTracks;

            // Attempt to play immediately (handles iOS/iPad WebKit autoplay requirements)
            const playPromise = videoElement.play();
            if (playPromise !== undefined) {
                playPromise.catch((err) => {
                    console.log('Autoplay deferred for tile:', name, err.message);
                });
            }
        } else {
            videoElement.srcObject = null;
            setHasVideoTrack(false);
        }
    }, [stream, isCameraOn, isScreenSharing, name]);

    // Check if video should show
    const showVideo = (isCameraOn || isScreenSharing) && (hasVideoTrack || stream?.getVideoTracks()?.length > 0);

    // Initial avatar letters
    const initials = name
        ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : 'U';

    const isHostOrAdmin = role === 'instructor' || role === 'admin' || role === 'lab_assistant';

    return (
        <div
            className={`relative bg-slate-900 rounded-2xl overflow-hidden shadow-xl border-2 transition-all duration-200 flex items-center justify-center select-none ${
                isPinned
                    ? 'border-primary-500 ring-2 ring-primary-500/30'
                    : 'border-slate-800 hover:border-slate-700'
            } ${className}`}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                className={`w-full h-full object-cover ${showVideo ? 'block' : 'hidden'} ${
                    isLocal && !isScreenSharing ? 'scale-x-[-1]' : ''
                }`}
            />

            {/* Avatar Fallback when Camera is Off */}
            {!showVideo && (
                <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
                    <div
                        className={`relative rounded-full flex items-center justify-center font-bold text-white shadow-inner transition-all duration-300 ${
                            compact ? 'w-12 h-12 text-base' : 'w-20 h-20 text-2xl'
                        } ${
                            isHostOrAdmin
                                ? 'bg-gradient-to-tr from-amber-600 to-amber-400'
                                : 'bg-gradient-to-tr from-primary-600 to-indigo-500'
                        } ${isSpeaking ? 'animate-pulse scale-105' : ''}`}
                    >
                        {initials}
                        {isSpeaking && (
                            <span className="absolute -inset-1.5 rounded-full border-2 border-emerald-400 animate-ping opacity-60 pointer-events-none" />
                        )}
                    </div>
                    {!compact && (
                        <p className="text-slate-300 text-xs font-medium truncate max-w-[140px]">
                            {name} {isLocal ? '(You)' : ''}
                        </p>
                    )}
                </div>
            )}

            {/* Top Right Controls & Status Icons */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                {isScreenSharing && (
                    <span className="bg-blue-500/80 backdrop-blur-md text-white p-1 rounded-md text-[10px] flex items-center gap-1 shadow">
                        <MonitorUp className="w-3 h-3" />
                        {!compact && <span>Screen</span>}
                    </span>
                )}

                {/* Vertical Bottom-to-Top Mic Level Fill Badge */}
                <div
                    className={`relative overflow-hidden rounded-full p-2 backdrop-blur-md shadow-lg border transition-all flex items-center justify-center ${
                        isMicOn
                            ? 'border-emerald-500/60 bg-slate-950/80 shadow-emerald-500/20'
                            : 'border-red-500/60 bg-slate-950/80'
                    }`}
                    title={isMicOn ? (isSpeaking ? 'Speaking (Mic Active)' : 'Mic On') : 'Muted'}
                >
                    {/* Bottom-to-top dynamic audio fill level */}
                    {isMicOn && (
                        <div
                            className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-emerald-600 via-emerald-500 to-emerald-400 transition-all duration-150 ease-out ${
                                isSpeaking ? 'opacity-95 shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse' : 'opacity-60'
                            }`}
                            style={{ height: isSpeaking ? '92%' : '32%' }}
                        />
                    )}

                    {isMicOn ? (
                        <Mic className="relative z-10 w-3.5 h-3.5 text-white drop-shadow-md" />
                    ) : (
                        <MicOff className="relative z-10 w-3.5 h-3.5 text-red-400" />
                    )}
                </div>

                {/* Pin Button */}
                {onTogglePin && !compact && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin();
                        }}
                        className={`p-1.5 rounded-lg backdrop-blur-md shadow transition ${
                            isPinned
                                ? 'bg-primary-500 text-white'
                                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                        title={isPinned ? 'Unpin' : 'Pin to main view'}
                    >
                        {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                )}
            </div>

            {/* Bottom Left Name Badge */}
            <div className="absolute bottom-2 left-2 z-10 max-w-[85%] flex items-center gap-1.5 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-700/50 flex items-center gap-1.5 truncate shadow">
                    <span className="text-white text-xs font-medium truncate">
                        {name} {isLocal ? '(You)' : ''}
                    </span>

                    {/* Mic Fill Capsule next to Name */}
                    <div
                        className={`relative w-4 h-6 rounded-full overflow-hidden border flex items-end justify-center transition-all ${
                            isMicOn
                                ? 'border-emerald-500/70 bg-slate-950/80'
                                : 'border-red-500/60 bg-slate-950/80'
                        }`}
                        title={isMicOn ? (isSpeaking ? 'Speaking' : 'Mic On') : 'Muted'}
                    >
                        {/* Dynamic Bottom-to-Top Fill */}
                        {isMicOn && (
                            <div
                                className={`w-full bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-150 ease-out rounded-b-full ${
                                    isSpeaking ? 'animate-pulse' : ''
                                }`}
                                style={{ height: isSpeaking ? '92%' : '35%' }}
                            />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {isMicOn ? (
                                <Mic className="w-2.5 h-2.5 text-white drop-shadow-sm z-10" />
                            ) : (
                                <MicOff className="w-2.5 h-2.5 text-red-400 z-10" />
                            )}
                        </div>
                    </div>

                    {/* Role Pill */}
                    {isHostOrAdmin ? (
                        <span className="bg-amber-500/20 text-amber-300 text-[10px] font-semibold px-1.5 py-0.2 rounded border border-amber-500/30">
                            Host
                        </span>
                    ) : (
                        <span className="bg-slate-700 text-slate-300 text-[10px] px-1 rounded">
                            Participant
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
