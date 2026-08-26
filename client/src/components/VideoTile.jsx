'use client';

import React, { useEffect, useRef, useState, useId } from 'react';
import { User, Mic, MicOff, MonitorUp, Pin, PinOff, PictureInPicture } from 'lucide-react';

// SVG Microphone component that fills the actual Microphone outline shape from bottom to top based on audio volume
function MicOutlineFilled({ isMicOn = true, isSpeaking = false, className = "w-4 h-4" }) {
    const fillPercent = isMicOn ? (isSpeaking ? 92 : 32) : 0;
    const id = useId();

    if (!isMicOn) {
        return <MicOff className={`${className} text-red-400`} />;
    }

    return (
        <svg
            viewBox="0 0 24 24"
            className={`${className} overflow-visible transition-all duration-150`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
                    <stop offset={`${fillPercent}%`} stopColor="#10b981" />
                    <stop offset={`${fillPercent}%`} stopColor="rgba(255, 255, 255, 0.25)" />
                </linearGradient>
            </defs>

            {/* Mic Body Inner Capsule (Fills bottom-to-top) */}
            <rect
                x="8.5"
                y="2.5"
                width="7"
                height="11"
                rx="3.5"
                fill={`url(#${id})`}
                stroke="#10b981"
                strokeWidth="1.5"
                className={isSpeaking ? "animate-pulse" : ""}
            />

            {/* Mic Stand Base & Arc */}
            <path
                d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"
                stroke={isSpeaking ? "#10b981" : "#94a3b8"}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

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
    const [isPiP, setIsPiP] = useState(false);

    // Handle PiP events
    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        const handleEnterPiP = () => setIsPiP(true);
        const handleLeavePiP = () => setIsPiP(false);

        videoElement.addEventListener('enterpictureinpicture', handleEnterPiP);
        videoElement.addEventListener('leavepictureinpicture', handleLeavePiP);

        // Auto PiP when user switches tabs (requires Chrome 120+)
        if ('autoPictureInPicture' in HTMLVideoElement.prototype) {
            videoElement.autoPictureInPicture = isPinned || isScreenSharing;
        }

        return () => {
            videoElement.removeEventListener('enterpictureinpicture', handleEnterPiP);
            videoElement.removeEventListener('leavepictureinpicture', handleLeavePiP);
        };
    }, [isPinned, isScreenSharing]);

    const togglePiP = async (e) => {
        e.stopPropagation();
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (videoRef.current && document.pictureInPictureEnabled) {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (error) {
            console.error('Failed to enter/exit PiP:', error);
        }
    };

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
            data-participant-tile="true"
            data-participant-name={name || 'Participant'}
            data-is-local={isLocal ? 'true' : 'false'}
            data-has-video={showVideo ? 'true' : 'false'}
            data-is-speaking={isSpeaking ? 'true' : 'false'}
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
                data-participant-video="true"
                data-participant-name={name || 'Participant'}
                data-is-local={isLocal ? 'true' : 'false'}
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

                {/* Mic Status Badge with Bottom-to-Top Mic Outline Fill */}
                <div
                    className={`p-1.5 rounded-xl backdrop-blur-md shadow-lg border transition-all flex items-center justify-center ${
                        isMicOn
                            ? isSpeaking
                                ? 'border-emerald-500/80 bg-slate-950/90 ring-2 ring-emerald-400/50'
                                : 'border-emerald-500/40 bg-slate-950/80'
                            : 'border-red-500/60 bg-slate-950/80'
                    }`}
                    title={isMicOn ? (isSpeaking ? 'Speaking (Mic Active)' : 'Mic On') : 'Muted'}
                >
                    <MicOutlineFilled isMicOn={isMicOn} isSpeaking={isSpeaking} className="w-4 h-4" />
                </div>

                {/* PiP Button */}
                {!compact && (
                    <button
                        onClick={togglePiP}
                        className={`p-1.5 rounded-lg backdrop-blur-md shadow transition ${
                            isPiP
                                ? 'bg-primary-500 text-white'
                                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                        title={isPiP ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
                    >
                        <PictureInPicture className="w-3.5 h-3.5" />
                    </button>
                )}

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

                    {/* Mic Outline Fill Icon next to Name */}
                    <div className="p-0.5">
                        <MicOutlineFilled isMicOn={isMicOn} isSpeaking={isSpeaking} className="w-3.5 h-3.5" />
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
