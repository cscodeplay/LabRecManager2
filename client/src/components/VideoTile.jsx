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
                isSpeaking
                    ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-emerald-500/10'
                    : isPinned
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

                {/* Mic Status & Dynamic Equalizer Animation */}
                <div
                    className={`px-2 py-1 rounded-lg backdrop-blur-md shadow text-xs flex items-center gap-1.5 transition-all ${
                        isMicOn
                            ? isSpeaking
                                ? 'bg-emerald-500/90 text-white ring-2 ring-emerald-400/50'
                                : 'bg-slate-800/80 text-emerald-400'
                            : 'bg-red-500/80 text-white'
                    }`}
                    title={isMicOn ? (isSpeaking ? 'Speaking' : 'Mic Active') : 'Muted'}
                >
                    {isMicOn ? (
                        <>
                            <Mic className="w-3.5 h-3.5" />
                            {/* Animated Audio Equalizer Waveform for host and participants */}
                            <div className="flex items-end gap-[2px] h-3 px-0.5" title="Mic Audio Level">
                                <span className={`w-0.5 rounded-full bg-emerald-400 transition-all duration-150 ${isSpeaking ? 'h-3 animate-pulse' : 'h-1.5 opacity-70'}`} />
                                <span className={`w-0.5 rounded-full bg-emerald-400 transition-all duration-200 ${isSpeaking ? 'h-2.5 animate-bounce' : 'h-2 opacity-70'}`} />
                                <span className={`w-0.5 rounded-full bg-emerald-400 transition-all duration-150 ${isSpeaking ? 'h-3.5 animate-pulse' : 'h-1 opacity-70'}`} />
                                <span className={`w-0.5 rounded-full bg-emerald-400 transition-all duration-300 ${isSpeaking ? 'h-2 animate-bounce' : 'h-1.5 opacity-70'}`} />
                            </div>
                        </>
                    ) : (
                        <MicOff className="w-3.5 h-3.5" />
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

                    {/* Dynamic Mic Waveform next to Name */}
                    {isMicOn && (
                        <div className="flex items-end gap-[1.5px] h-2.5 px-0.5">
                            <span className={`w-0.5 rounded-full bg-emerald-400 transition-all duration-150 ${isSpeaking ? 'h-2.5 animate-pulse' : 'h-1 opacity-60'}`} />
                            <span className={`w-0.5 rounded-full bg-emerald-400 transition-all duration-200 ${isSpeaking ? 'h-2 animate-bounce' : 'h-1.5 opacity-60'}`} />
                            <span className={`w-0.5 rounded-full bg-emerald-400 transition-all duration-150 ${isSpeaking ? 'h-3 animate-pulse' : 'h-1 opacity-60'}`} />
                        </div>
                    )}

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
