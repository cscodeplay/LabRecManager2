'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    Play, Pause, Volume2, VolumeX, Maximize2, Minimize2,
    Lock, Unlock, Trash2, Video, Music, Globe,
    ChevronDown, ChevronUp, GripHorizontal, RotateCcw,
    ExternalLink, Copy, Film
} from 'lucide-react';

export default function WhiteboardMediaPlayer({
    media,
    isSelected = false,
    onSelect,
    onUpdate,
    onDelete,
    onDuplicate,
    scale = 1
}) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPlayerActive, setIsPlayerActive] = useState(Boolean(media.isPlaying));
    const [isMuted, setIsMuted] = useState(media.isMuted ?? true);
    const [isCollapsed, setIsCollapsed] = useState(media.isCollapsed ?? false);
    const [isLocked, setIsLocked] = useState(media.isLocked ?? false);
    const videoRef = useRef(null);
    const handleSize = 10;

    // Sync media prop updates
    useEffect(() => {
        if (typeof media.isMuted === 'boolean') setIsMuted(media.isMuted);
        if (typeof media.isCollapsed === 'boolean') setIsCollapsed(media.isCollapsed);
        if (typeof media.isLocked === 'boolean') setIsLocked(media.isLocked);
    }, [media.isMuted, media.isCollapsed, media.isLocked]);

    // Keep DOM video/audio element mute state strictly synchronized
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
            if (!isMuted && videoRef.current.volume === 0) {
                videoRef.current.volume = 1;
            }
        }
    }, [isMuted]);

    // Pointer + Click Debounce refs to prevent double-firing on stylus/pencil taps
    const lastMuteToggleRef = useRef(0);
    const lastCollapseToggleRef = useRef(0);
    const lastLockToggleRef = useRef(0);
    const lastClonerToggleRef = useRef(0);
    const lastDupToggleRef = useRef(0);
    const lastDeleteToggleRef = useRef(0);

    const togglePlay = (e) => {
        e?.stopPropagation();
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
            }
        } else {
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = (e) => {
        e?.stopPropagation();
        const now = Date.now();
        if (now - lastMuteToggleRef.current < 250) return;
        lastMuteToggleRef.current = now;

        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        if (videoRef.current) {
            videoRef.current.muted = nextMuted;
            if (!nextMuted && videoRef.current.volume === 0) {
                videoRef.current.volume = 1;
            }
        }
        onUpdate && onUpdate({ isMuted: nextMuted });
    };

    const toggleCollapse = (e) => {
        e?.stopPropagation();
        const now = Date.now();
        if (now - lastCollapseToggleRef.current < 250) return;
        lastCollapseToggleRef.current = now;

        const nextCollapsed = !isCollapsed;
        setIsCollapsed(nextCollapsed);
        onUpdate && onUpdate({ isCollapsed: nextCollapsed });
    };

    const toggleLock = (e) => {
        e?.stopPropagation();
        const now = Date.now();
        if (now - lastLockToggleRef.current < 250) return;
        lastLockToggleRef.current = now;

        const nextLocked = !isLocked;
        setIsLocked(nextLocked);
        onUpdate && onUpdate({ isLocked: nextLocked });
    };

    const toggleInfiniteCloner = (e) => {
        e?.stopPropagation();
        const now = Date.now();
        if (now - lastClonerToggleRef.current < 250) return;
        lastClonerToggleRef.current = now;

        onUpdate && onUpdate({ isInfiniteCloner: !media.isInfiniteCloner });
    };

    // Drag-to-move handler
    const handleMoveStart = (e) => {
        if (isLocked) return;
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();

        // Infinite Cloner drag-to-clone behavior
        if (media.isInfiniteCloner && onDuplicate) {
            onDuplicate(media.id);
            return;
        }

        const startX = e.clientX;
        const startY = e.clientY;
        const initialX = media.x || 0;
        const initialY = media.y || 0;

        const onMove = (moveEvt) => {
            const dx = (moveEvt.clientX - startX) / (scale || 1);
            const dy = (moveEvt.clientY - startY) / (scale || 1);
            onUpdate && onUpdate({ x: initialX + dx, y: initialY + dy });
        };

        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    // 8-Handle Resize
    const handleResizeStart = (handle, e) => {
        if (isLocked) return;
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;
        const initialW = media.width || 480;
        const initialH = media.height || 300;
        const initialX = media.x || 0;
        const initialY = media.y || 0;

        const onMove = (moveEvt) => {
            const dx = (moveEvt.clientX - startX) / (scale || 1);
            const dy = (moveEvt.clientY - startY) / (scale || 1);
            let newW = initialW;
            let newH = initialH;
            let newX = initialX;
            let newY = initialY;

            if (handle.includes('e')) newW = Math.max(200, initialW + dx);
            if (handle.includes('s')) newH = Math.max(140, initialH + dy);
            if (handle.includes('w')) {
                const calculatedW = Math.max(200, initialW - dx);
                newX = initialX + (initialW - calculatedW);
                newW = calculatedW;
            }
            if (handle.includes('n')) {
                const calculatedH = Math.max(140, initialH - dy);
                newY = initialY + (initialH - calculatedH);
                newH = calculatedH;
            }

            onUpdate && onUpdate({ width: newW, height: newH, x: newX, y: newY });
        };

        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    // 2D Rotation
    const handleRotateStart = (e) => {
        if (isLocked) return;
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();

        const centerX = (media.x || 0) + (media.width || 480) / 2;
        const centerY = (media.y || 0) + (media.height || 300) / 2;

        const onMove = (moveEvt) => {
            const radians = Math.atan2(moveEvt.clientY - centerY, moveEvt.clientX - centerX);
            let degrees = radians * (180 / Math.PI) - 90;
            degrees = (degrees + 360) % 360;
            onUpdate && onUpdate({ rotation: Math.round(degrees) });
        };

        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const mediaSource = media.src || media.url || '';

    // Extract 11-char YouTube Video ID across watch, shorts, youtu.be, embed, mobile
    const extractYouTubeId = (url) => {
        if (!url) return null;
        const idMatch = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/|watch\?.+&v=)|(?:^))([a-zA-Z0-9_-]{11})/);
        return idMatch ? idMatch[1] : null;
    };

    const youtubeId = extractYouTubeId(mediaSource);
    const isYouTube = media.mediaType === 'youtube' || Boolean(youtubeId) || (mediaSource && /youtube\.com|youtu\.be/i.test(mediaSource));
    const isAudio = media.mediaType === 'audio' || (mediaSource && /\.(mp3|wav|ogg|aac)(\?.*)?$/i.test(mediaSource));
    const isEmbed = media.mediaType === 'embed' && !isYouTube;

    const youtubeThumbnail = media.thumbnail || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null);

    // Universal clean YouTube embed URL without restrictive origins or cookies
    const getYouTubeEmbedUrl = (url, autoplay = true) => {
        if (!url) return '';
        const id = extractYouTubeId(url);
        if (id) {
            return `https://www.youtube.com/embed/${id}?autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1&playsinline=1&mute=${isMuted ? 1 : 0}`;
        }
        if (url.includes('youtube.com/embed/')) {
            return `${url}${url.includes('?') ? '&' : '?'}autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1&playsinline=1&mute=${isMuted ? 1 : 0}`;
        }
        return url;
    };

    return (
        <div
            tabIndex={0}
            onClick={(e) => {
                e.stopPropagation();
                onSelect && onSelect(media.id);
            }}
            onKeyDown={(e) => {
                if ((e.key === 'Delete' || e.key === 'Backspace') && isSelected) {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete && onDelete(media.id);
                }
            }}
            style={{
                left: `${media.x || 0}px`,
                top: `${media.y || 0}px`,
                width: isCollapsed ? 'auto' : `${media.width || 480}px`,
                height: isCollapsed ? 'auto' : `${media.height || 300}px`,
                transform: `rotate(${media.rotation || 0}deg)`,
                transformOrigin: 'center center',
                zIndex: media.zIndex || 20
            }}
            data-media-player="true"
            className={`whiteboard-media-player absolute select-none transition-shadow outline-none ${
                isSelected ? 'ring-2 ring-indigo-500 shadow-2xl' : 'shadow-lg hover:shadow-xl'
            }`}
        >
            {/* Standardized Floating Media Context Toolbar (Shown when selected) */}
            {isSelected && (
                <div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '-40px',
                        transform: 'translateX(-50%)',
                        pointerEvents: 'auto'
                    }}
                    className="h-8 min-h-[32px] px-2 py-0.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/60 shadow-xl flex items-center gap-1.5 z-40 text-xs select-none"
                >
                    {/* Open original link */}
                    {media.src && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(media.src, '_blank', 'noopener,noreferrer');
                            }}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                            title="Open Video in New Tab"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Mute / Unmute */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleMute(e);
                        }}
                        className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>

                    <div className="h-4 w-[1px] bg-slate-700/60 mx-0.5" />

                    {/* 16:9 Aspect Ratio preset */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            const curW = media.width || 480;
                            onUpdate && onUpdate({ height: Math.round((curW * 9) / 16) });
                        }}
                        className="px-1.5 h-6 rounded text-[10px] font-mono font-bold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                        title="Set 16:9 Widescreen"
                    >
                        16:9
                    </button>

                    {/* 4:3 Aspect Ratio preset */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            const curW = media.width || 480;
                            onUpdate && onUpdate({ height: Math.round((curW * 3) / 4) });
                        }}
                        className="px-1.5 h-6 rounded text-[10px] font-mono font-bold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                        title="Set 4:3 Standard"
                    >
                        4:3
                    </button>

                    {/* Return to Poster mode for YouTube */}
                    {isYouTube && isPlayerActive && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsPlayerActive(false);
                                setIsPlaying(false);
                            }}
                            className="px-1.5 h-6 rounded text-[10px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-1 transition-colors"
                            title="Show Preview Poster"
                        >
                            <Film className="w-3 h-3 text-red-400" />
                            <span>Poster</span>
                        </button>
                    )}

                    <div className="h-4 w-[1px] bg-slate-700/60 mx-0.5" />

                    {/* Duplicate */}
                    {onDuplicate && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDuplicate(media.id);
                            }}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                            title="Duplicate Video"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Lock / Unlock */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleLock(e);
                        }}
                        className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                        title={isLocked ? 'Unlock Element' : 'Lock Element'}
                    >
                        {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>

                    {/* Delete */}
                    {onDelete && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(media.id);
                            }}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
                            title="Delete Video"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}

            {/* Collapsed Pill View */}
            {isCollapsed ? (
                <div 
                    onPointerDown={handleMoveStart}
                    className="bg-slate-900/95 border border-slate-700/90 text-white rounded-full px-3.5 py-2 flex items-center gap-2.5 shadow-2xl backdrop-blur-md cursor-move pointer-events-auto"
                >
                    <div className="p-0.5 text-slate-500 hover:text-slate-300">
                        <GripHorizontal className="w-3.5 h-3.5" />
                    </div>
                    {isYouTube ? (
                        <div className="w-5 h-5 rounded bg-red-600 flex items-center justify-center text-white text-[9px] font-bold">YT</div>
                    ) : isAudio ? (
                        <Music className="w-4 h-4 text-emerald-400" />
                    ) : isEmbed ? (
                        <Globe className="w-4 h-4 text-sky-400" />
                    ) : (
                        <Video className="w-4 h-4 text-indigo-400" />
                    )}
                    <span className="text-xs font-semibold max-w-[160px] truncate text-slate-200">
                        {media.title || 'Media Player'}
                    </span>
                    <button
                        type="button"
                        onPointerDown={(e) => { e.stopPropagation(); toggleMute(e); }}
                        onClick={(e) => { e.stopPropagation(); toggleMute(e); }}
                        className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white cursor-pointer"
                        title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                    >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                    <button
                        type="button"
                        onPointerDown={(e) => { e.stopPropagation(); toggleCollapse(e); }}
                        onClick={(e) => { e.stopPropagation(); toggleCollapse(e); }}
                        className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white cursor-pointer"
                        title="Expand Player"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ) : (
                /* Full Media Player Frame */
                <div className="w-full h-full rounded-xl overflow-hidden bg-slate-950 border border-slate-700/80 flex flex-col shadow-2xl relative group">
                    {/* Header Bar (Movable) */}
                    <div 
                        onPointerDown={handleMoveStart}
                        className="px-3 py-1.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between text-white text-xs select-none cursor-move"
                    >
                        <div className="flex items-center gap-2 max-w-[55%]">
                            <GripHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {isYouTube ? (
                                <span className="px-1.5 py-0.2 rounded bg-red-600 text-[9px] font-bold uppercase shrink-0">YouTube</span>
                            ) : isEmbed ? (
                                <span className="px-1.5 py-0.2 rounded bg-sky-600 text-[9px] font-bold uppercase shrink-0">Embed</span>
                            ) : (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-[9px] font-bold uppercase shrink-0">Media</span>
                            )}
                            <span className="font-semibold truncate text-slate-200 text-[11px]">
                                {media.title || 'Interactive Media'}
                            </span>
                        </div>

                        {/* Top Controls */}
                        <div className="flex items-center gap-1" onPointerDown={e => e.stopPropagation()}>
                            <button
                                type="button"
                                onPointerDown={(e) => { e.stopPropagation(); toggleMute(e); }}
                                onClick={(e) => { e.stopPropagation(); toggleMute(e); }}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                                title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                            >
                                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                            </button>
                            <button
                                type="button"
                                onPointerDown={(e) => { e.stopPropagation(); toggleCollapse(e); }}
                                onClick={(e) => { e.stopPropagation(); toggleCollapse(e); }}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                                title="Collapse to Badge"
                            >
                                <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onPointerDown={(e) => { e.stopPropagation(); toggleLock(e); }}
                                onClick={(e) => { e.stopPropagation(); toggleLock(e); }}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                                title={isLocked ? 'Unlock Element' : 'Lock Element'}
                            >
                                {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                            {onDelete && (
                                <button
                                    type="button"
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        const now = Date.now();
                                        if (now - lastDeleteToggleRef.current < 250) return;
                                        lastDeleteToggleRef.current = now;
                                        onDelete(media.id);
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const now = Date.now();
                                        if (now - lastDeleteToggleRef.current < 250) return;
                                        lastDeleteToggleRef.current = now;
                                        onDelete(media.id);
                                    }}
                                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 transition cursor-pointer"
                                    title="Delete Media"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Viewport Content */}
                    <div className="flex-1 w-full bg-black relative flex items-center justify-center overflow-hidden">
                        {isYouTube ? (
                            isPlayerActive ? (
                                <iframe
                                    src={getYouTubeEmbedUrl(mediaSource, true)}
                                    title={media.title || 'YouTube Player'}
                                    className="w-full h-full border-0 pointer-events-auto"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                                    allowFullScreen
                                />
                            ) : (
                                /* Interactive YouTube Preview Poster with Centered Play Button */
                                <div 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect && onSelect(media.id);
                                        setIsPlayerActive(true);
                                        setIsPlaying(true);
                                    }}
                                    className="w-full h-full relative cursor-pointer group/poster flex items-center justify-center bg-slate-950 overflow-hidden"
                                >
                                    {/* Video Poster Thumbnail */}
                                    {youtubeThumbnail ? (
                                        <img 
                                            src={youtubeThumbnail} 
                                            alt={media.title || 'YouTube Video Preview'}
                                            className="w-full h-full object-cover opacity-85 group-hover/poster:opacity-100 group-hover/poster:scale-105 transition-all duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-slate-900 via-red-950/30 to-slate-900 flex items-center justify-center" />
                                    )}

                                    {/* Dark Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 pointer-events-none" />

                                    {/* Large Centered YouTube Red Play Button */}
                                    <div className="relative z-10 w-16 h-12 rounded-2xl bg-red-600 group-hover/poster:bg-red-500 shadow-2xl shadow-red-600/50 flex items-center justify-center transition-all duration-200 group-hover/poster:scale-110 active:scale-95">
                                        <Play className="w-7 h-7 text-white fill-white ml-0.5" />
                                    </div>

                                    {/* Play Video Hint Badge */}
                                    <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
                                        <span className="text-[11px] text-white/95 bg-black/70 backdrop-blur-xs px-3 py-1 rounded-full border border-white/20 font-semibold shadow-lg">
                                            ▶ Click to Play Video
                                        </span>
                                    </div>
                                </div>
                            )
                        ) : isEmbed ? (
                            <iframe
                                src={mediaSource}
                                title={media.title || 'Web Embed'}
                                className="w-full h-full border-0 bg-white pointer-events-auto"
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                            />
                        ) : isAudio ? (
                            <div className="w-full h-full p-4 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-900 to-indigo-950 pointer-events-auto">
                                <Music className="w-12 h-12 text-indigo-400 animate-pulse" />
                                <audio
                                    ref={videoRef}
                                    src={mediaSource}
                                    controls
                                    playsInline
                                    muted={isMuted}
                                    onPointerDown={e => e.stopPropagation()}
                                    className="w-full max-w-sm pointer-events-auto"
                                />
                            </div>
                        ) : (
                            <video
                                ref={videoRef}
                                src={mediaSource}
                                controls
                                playsInline
                                webkit-playsinline="true"
                                muted={isMuted}
                                onPointerDown={e => e.stopPropagation()}
                                className="w-full h-full object-contain pointer-events-auto"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Selection Handles (Resize & Rotate) */}
            {isSelected && !isCollapsed && !isLocked && (
                <>
                    {/* 2D Rotate Handle */}
                    <div
                        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-30"
                        style={{ top: -32, pointerEvents: 'auto' }}
                    >
                        <div className="w-px h-4 bg-indigo-500" />
                        <div
                            onPointerDown={handleRotateStart}
                            className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center cursor-grab hover:bg-indigo-700 shadow-md transition-transform hover:scale-110 active:cursor-grabbing"
                            title="Rotate Media Player"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </div>
                    </div>

                    {/* Corner Resize Handles */}
                    {[
                        { handle: 'nw', style: { left: -handleSize / 2, top: -handleSize / 2, cursor: 'nwse-resize' } },
                        { handle: 'ne', style: { right: -handleSize / 2, top: -handleSize / 2, cursor: 'nesw-resize' } },
                        { handle: 'sw', style: { left: -handleSize / 2, bottom: -handleSize / 2, cursor: 'nesw-resize' } },
                        { handle: 'se', style: { right: -handleSize / 2, bottom: -handleSize / 2, cursor: 'nwse-resize' } },
                    ].map(({ handle, style }) => (
                        <div
                            key={handle}
                            onPointerDown={(e) => handleResizeStart(handle, e)}
                            className="absolute bg-white border-2 border-indigo-600 rounded-xs shadow-md z-30 pointer-events-auto"
                            style={{ width: handleSize + 2, height: handleSize + 2, ...style }}
                        />
                    ))}

                    {/* Edge Resize Handles */}
                    {[
                        { handle: 'n', style: { left: '50%', top: -handleSize / 2, transform: 'translateX(-50%)', cursor: 'ns-resize' } },
                        { handle: 's', style: { left: '50%', bottom: -handleSize / 2, transform: 'translateX(-50%)', cursor: 'ns-resize' } },
                        { handle: 'e', style: { right: -handleSize / 2, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' } },
                        { handle: 'w', style: { left: -handleSize / 2, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' } },
                    ].map(({ handle, style }) => (
                        <div
                            key={handle}
                            onPointerDown={(e) => handleResizeStart(handle, e)}
                            className="absolute bg-white border-2 border-indigo-600 rounded-xs shadow-md z-30 pointer-events-auto"
                            style={{ width: handleSize, height: handleSize, ...style }}
                        />
                    ))}
                </>
            )}
        </div>
    );
}
