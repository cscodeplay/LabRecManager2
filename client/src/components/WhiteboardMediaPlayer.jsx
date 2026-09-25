'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    Play, Pause, Volume2, VolumeX, Maximize2, Minimize2,
    Lock, Unlock, Trash2, Copy, Video, Music, Globe,
    ChevronDown, ChevronUp, GripHorizontal, RotateCcw
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
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        if (videoRef.current) {
            videoRef.current.muted = nextMuted;
        }
        onUpdate && onUpdate({ isMuted: nextMuted });
    };

    const toggleCollapse = (e) => {
        e?.stopPropagation();
        const nextCollapsed = !isCollapsed;
        setIsCollapsed(nextCollapsed);
        onUpdate && onUpdate({ isCollapsed: nextCollapsed });
    };

    const toggleLock = (e) => {
        e?.stopPropagation();
        const nextLocked = !isLocked;
        setIsLocked(nextLocked);
        onUpdate && onUpdate({ isLocked: nextLocked });
    };

    const toggleInfiniteCloner = (e) => {
        e?.stopPropagation();
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

    // Helper to extract clean YouTube embed URL
    const getYouTubeEmbedUrl = (url) => {
        if (!url) return '';
        if (url.includes('embed/')) return url;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        const id = (match && match[2].length === 11) ? match[2] : null;
        if (id) {
            return `https://www.youtube.com/embed/${id}?autoplay=0&enablejsapi=1&mute=${isMuted ? 1 : 0}`;
        }
        return url;
    };

    const isYouTube = media.mediaType === 'youtube' || (media.src && /youtube\.com|youtu\.be/i.test(media.src));
    const isAudio = media.mediaType === 'audio' || (media.src && /\.(mp3|wav|ogg|aac)(\?.*)?$/i.test(media.src));
    const isEmbed = media.mediaType === 'embed' && !isYouTube;

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                onSelect && onSelect(media.id);
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
            className={`absolute select-none transition-shadow ${
                isSelected ? 'ring-2 ring-indigo-500 shadow-2xl' : 'shadow-lg hover:shadow-xl'
            }`}
        >
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
                        onClick={toggleMute}
                        className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
                        title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                    >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                    <button
                        type="button"
                        onClick={toggleCollapse}
                        className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
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
                                onClick={toggleMute}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                                title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                            >
                                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                            </button>
                            <button
                                type="button"
                                onClick={toggleCollapse}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                                title="Collapse to Badge"
                            >
                                <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={toggleInfiniteCloner}
                                className={`p-1 rounded transition ${media.isInfiniteCloner ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                title={media.isInfiniteCloner ? "Disable Infinite Clone" : "Enable Infinite Clone"}
                            >
                                <span className="text-[11px] font-bold">∞</span>
                            </button>
                            <button
                                type="button"
                                onClick={toggleLock}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                                title={isLocked ? 'Unlock Element' : 'Lock Element'}
                            >
                                {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                            {onDuplicate && (
                                <button
                                    type="button"
                                    onClick={() => onDuplicate(media.id)}
                                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                                    title="Duplicate Media"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    type="button"
                                    onClick={() => onDelete(media.id)}
                                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 transition"
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
                            <iframe
                                src={getYouTubeEmbedUrl(media.src)}
                                title={media.title || 'YouTube Player'}
                                className="w-full h-full border-0 pointer-events-auto"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            />
                        ) : isEmbed ? (
                            <iframe
                                src={media.src}
                                title={media.title || 'Web Embed'}
                                className="w-full h-full border-0 bg-white pointer-events-auto"
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                            />
                        ) : isAudio ? (
                            <div className="w-full h-full p-4 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-900 to-indigo-950 pointer-events-auto">
                                <Music className="w-12 h-12 text-indigo-400 animate-pulse" />
                                <audio
                                    ref={videoRef}
                                    src={media.src}
                                    controls
                                    muted={isMuted}
                                    className="w-full max-w-sm"
                                />
                            </div>
                        ) : (
                            <video
                                ref={videoRef}
                                src={media.src}
                                controls
                                muted={isMuted}
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
