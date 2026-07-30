'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Pencil, X, Maximize2, Minimize2, User } from 'lucide-react';

export default function SharedWhiteboardViewer({
    isOpen,
    onClose,
    instructorName = 'Instructor',
    socket,
    sessionId,
    width = 1200,
    height = 700,
    isInline = false // When true, renders inline instead of overlay
}) {
    const canvasRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width, height });
    const [isActive, setIsActive] = useState(true);
    const [bgColor, setBgColor] = useState('#ffffff');
    const [bgPattern, setBgPattern] = useState('plain');

    const getBackgroundStyle = () => {
        let backgroundImage = 'none';
        let backgroundSize = 'auto';
        let backgroundPosition = undefined;

        switch (bgPattern) {
            case 'dotted':
                backgroundImage = 'radial-gradient(circle, #999 1.5px, transparent 1.5px)';
                backgroundSize = '20px 20px';
                break;
            case 'grid':
                backgroundImage = 'linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)';
                backgroundSize = '25px 25px';
                break;
            case 'lined':
                backgroundImage = 'linear-gradient(#ccc 1px, transparent 1px)';
                backgroundSize = '100% 25px';
                break;
            case 'graph':
                backgroundImage = 'linear-gradient(#bbb 1px, transparent 1px), linear-gradient(90deg, #bbb 1px, transparent 1px), linear-gradient(#ddd 0.5px, transparent 0.5px), linear-gradient(90deg, #ddd 0.5px, transparent 0.5px)';
                backgroundSize = '100px 100px, 100px 100px, 20px 20px, 20px 20px';
                break;
            case 'music':
                backgroundImage = 'repeating-linear-gradient(transparent 0px, transparent 7px, #aaa 8px, #aaa 9px)';
                backgroundSize = '100% 40px';
                break;
            case 'iso':
                backgroundImage = 'linear-gradient(60deg, #ccc 1px, transparent 1px), linear-gradient(-60deg, #ccc 1px, transparent 1px), linear-gradient(#ccc 1px, transparent 1px)';
                backgroundSize = '30px 52px';
                backgroundPosition = '0 0, 0 0, 0 0';
                break;
            case 'hex':
                backgroundImage = 'radial-gradient(circle, transparent 12px, #ccc 13px, #ccc 14px, transparent 15px), radial-gradient(circle, transparent 12px, #ccc 13px, #ccc 14px, transparent 15px)';
                backgroundSize = '60px 52px';
                backgroundPosition = '0 0, 30px 26px';
                break;
            default:
                backgroundImage = 'none';
                break;
        }

        return {
            backgroundColor: bgColor,
            backgroundImage,
            backgroundSize,
            backgroundPosition
        };
    };

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, []);

    // Listen for drawing events from socket
    useEffect(() => {
        if (!socket || !sessionId) return;

        // Handle draw event
        const handleDraw = (data) => {
            if (data.sessionId !== sessionId) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            if (data.isEraser || data.color === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(0,0,0,1)';
                ctx.lineWidth = data.strokeWidth || 20;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (data.isStart) {
                    ctx.beginPath();
                    ctx.moveTo(data.x, data.y);
                } else {
                    ctx.lineTo(data.x, data.y);
                    ctx.stroke();
                }
                ctx.globalCompositeOperation = 'source-over';
            } else if (data.type === 'path') {
                ctx.strokeStyle = data.color || '#000000';
                ctx.lineWidth = data.strokeWidth || 4;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (data.isStart) {
                    ctx.beginPath();
                    ctx.moveTo(data.x, data.y);
                } else {
                    ctx.lineTo(data.x, data.y);
                    ctx.stroke();
                }
            } else if (data.type === 'line') {
                ctx.strokeStyle = data.color || '#000000';
                ctx.lineWidth = data.strokeWidth || 4;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(data.startX, data.startY);
                ctx.lineTo(data.endX, data.endY);
                ctx.stroke();
            } else if (data.type === 'rectangle') {
                ctx.strokeStyle = data.color || '#000000';
                ctx.lineWidth = data.strokeWidth || 4;
                ctx.strokeRect(data.x, data.y, data.width, data.height);
            } else if (data.type === 'ellipse') {
                ctx.strokeStyle = data.color || '#000000';
                ctx.lineWidth = data.strokeWidth || 4;
                ctx.beginPath();
                ctx.ellipse(data.centerX, data.centerY, data.radiusX, data.radiusY, 0, 0, 2 * Math.PI);
                ctx.stroke();
            } else if (data.type === 'text') {
                ctx.font = `${data.fontSize || 16}px sans-serif`;
                ctx.fillStyle = data.color || '#000000';
                ctx.fillText(data.text, data.x, data.y);
            }
        };

        // Handle clear event
        const handleClear = (data) => {
            if (data.sessionId !== sessionId) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };

        // Handle background change event
        const handleBackgroundChange = (data) => {
            if (data.sessionId !== sessionId) return;
            if (data.bgColor) setBgColor(data.bgColor);
            if (data.bgPattern) setBgPattern(data.bgPattern);
        };

        // Handle canvas state (full redraw)
        const handleCanvasState = (data) => {
            if (data.sessionId !== sessionId) return;
            if (data.bgColor) setBgColor(data.bgColor);
            if (data.bgPattern) setBgPattern(data.bgPattern);

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = data.imageData;
        };

        // Handle end sharing
        const handleEndSharing = (data) => {
            if (data.sessionId !== sessionId) return;
            setIsActive(false);
        };

        socket.on('whiteboard:draw', handleDraw);
        socket.on('whiteboard:clear', handleClear);
        socket.on('whiteboard:background-change', handleBackgroundChange);
        socket.on('whiteboard:canvas-state', handleCanvasState);
        socket.on('whiteboard:ended', handleEndSharing);

        // Request current canvas state when joining
        socket.emit('whiteboard:request-state', { sessionId });

        return () => {
            socket.off('whiteboard:draw', handleDraw);
            socket.off('whiteboard:clear', handleClear);
            socket.off('whiteboard:background-change', handleBackgroundChange);
            socket.off('whiteboard:canvas-state', handleCanvasState);
            socket.off('whiteboard:ended', handleEndSharing);
        };
    }, [socket, sessionId]);

    if (!isOpen) return null;

    // Inline mode - render directly in parent container
    if (isInline) {
        return (
            <div className="w-full h-full flex flex-col bg-white rounded-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-gradient-to-r from-amber-500 to-orange-500">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <Pencil className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                Shared Whiteboard
                                {isActive && (
                                    <span className="flex items-center gap-1 text-xs bg-red-500 px-2 py-0.5 rounded-full">
                                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        LIVE
                                    </span>
                                )}
                            </h3>
                            <p className="text-sm text-white/80 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {instructorName} is presenting
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-2 hover:bg-white/20 rounded-lg transition text-white"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>

                {/* Canvas */}
                <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center">
                    {isActive ? (
                        <canvas
                            ref={canvasRef}
                            width={width}
                            height={height}
                            className="rounded-lg shadow-lg"
                            style={{ maxWidth: '100%', maxHeight: '100%', ...getBackgroundStyle() }}
                        />
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Pencil className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">Sharing Ended</h3>
                            <p className="text-slate-600">The instructor has stopped sharing the whiteboard</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500">
                        👁️ View-only mode • You are watching the instructor's whiteboard live
                    </p>
                </div>
            </div>
        );
    }

    // Overlay mode (default)
    return (
        <div className={`fixed z-50 ${isFullscreen ? 'inset-0' : 'inset-4 md:inset-8 lg:inset-12'} flex items-center justify-center`}>
            <div
                className="absolute inset-0 bg-black/50"
                onClick={() => !isFullscreen && onClose()}
            />

            <div className={`relative z-10 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden ${isFullscreen ? 'w-full h-full rounded-none' : 'max-w-4xl w-full max-h-[80vh]'
                }`}>
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-gradient-to-r from-amber-500 to-orange-500">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <Pencil className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                Shared Whiteboard
                                {isActive && (
                                    <span className="flex items-center gap-1 text-xs bg-red-500 px-2 py-0.5 rounded-full">
                                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        LIVE
                                    </span>
                                )}
                            </h3>
                            <p className="text-sm text-white/80 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {instructorName} is presenting
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="p-2 hover:bg-white/20 rounded-lg transition text-white"
                            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition text-white"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center">
                    {isActive ? (
                        <canvas
                            ref={canvasRef}
                            width={width}
                            height={height}
                            className="rounded-lg shadow-lg"
                            style={{ maxWidth: '100%', maxHeight: '100%', ...getBackgroundStyle() }}
                        />
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Pencil className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">
                                Sharing Ended
                            </h3>
                            <p className="text-slate-600 mb-4">
                                The instructor has stopped sharing the whiteboard
                            </p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500">
                        👁️ View-only mode • You are watching the instructor's whiteboard live
                    </p>
                </div>
            </div>
        </div>
    );
}
