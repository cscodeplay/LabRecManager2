'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Pencil, X, Maximize2, Minimize2, User, MicOff } from 'lucide-react';
import WhiteboardChatWindow from '@/components/WhiteboardChatWindow';

// Helper component to render a MediaStream
const HostVideoRenderer = ({ stream }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    if (!stream) return null;

    // Check if video track exists and is enabled
    const hasVideo = stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
    const hasAudio = stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled;

    return (
        <div className="relative w-48 h-36 bg-slate-900 rounded-lg overflow-hidden shadow-lg border-2 border-slate-700 m-2 pointer-events-auto">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${hasVideo ? '' : 'hidden'}`}
            />
            {!hasVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                    <User className="w-12 h-12 text-slate-500" />
                </div>
            )}
            {!hasAudio && (
                <div className="absolute bottom-2 right-2 bg-red-500 rounded-full p-1 shadow-sm">
                    <MicOff className="w-3 h-3 text-white" />
                </div>
            )}
        </div>
    );
};

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

    // Objects state
    const [imageObjects, setImageObjects] = useState([]);
    const [textObjects, setTextObjects] = useState([]);
    const [shapeObjects, setShapeObjects] = useState([]);
    const [laserPos, setLaserPos] = useState(null);

    // Host A/V state
    const [hostStreams, setHostStreams] = useState({});
    const peerConnectionsRef = useRef({});

    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStartTime, setRecordingStartTime] = useState(null);
    const [recordingDuration, setRecordingDuration] = useState(0);

    const formatDuration = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

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

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, []);

    // Listen for drawing events from socket
    useEffect(() => {
        if (!socket || !sessionId) return;

        const getDashArray = (style) => {
            switch (style) {
                case 'dashed': return [10, 6];
                case 'dotted': return [3, 3];
                default: return [];
            }
        };

        // Handle draw event
        const handleDraw = (data) => {
            if (data.sessionId !== sessionId) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

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
                ctx.setLineDash(getDashArray(data.strokeStyle));

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
                ctx.setLineDash(getDashArray(data.strokeStyle));
                ctx.beginPath();
                ctx.moveTo(data.startX, data.startY);
                ctx.lineTo(data.endX, data.endY);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (data.type === 'rectangle') {
                ctx.strokeStyle = data.color || '#000000';
                ctx.lineWidth = data.strokeWidth || 4;
                ctx.setLineDash(getDashArray(data.strokeStyle));
                ctx.strokeRect(data.x, data.y, data.width, data.height);
                ctx.setLineDash([]);
            } else if (data.type === 'ellipse') {
                ctx.strokeStyle = data.color || '#000000';
                ctx.lineWidth = data.strokeWidth || 4;
                ctx.setLineDash(getDashArray(data.strokeStyle));
                ctx.beginPath();
                ctx.ellipse(data.centerX, data.centerY, data.radiusX, data.radiusY, 0, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (data.type === 'text') {
                ctx.font = `${data.fontSize || 18}px 'Inter', system-ui, sans-serif`;
                ctx.textBaseline = 'middle';
                ctx.fillStyle = data.color || '#000000';
                ctx.fillText(data.text, data.x, data.y);
            }
        };

        // Handle clear event
        const handleClear = (data) => {
            if (data.sessionId !== sessionId) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
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
            if (data.imageObjects) setImageObjects(data.imageObjects);
            if (data.textObjects) setTextObjects(data.textObjects);
            if (data.shapeObjects) setShapeObjects(data.shapeObjects);
            if (data.laserPos !== undefined) setLaserPos(data.laserPos);

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = data.imageData;
        };

        const handleObjectsUpdate = (data) => {
            if (data.sessionId !== sessionId) return;
            if (data.imageObjects) setImageObjects(data.imageObjects);
            if (data.textObjects) setTextObjects(data.textObjects);
            if (data.shapeObjects) setShapeObjects(data.shapeObjects);
        };

        const handleLaserUpdate = (data) => {
            if (data.sessionId !== sessionId) return;
            setLaserPos(data.laserPos);
        };

        const handleEndSharing = (data) => {
            if (data.sessionId !== sessionId) return;
            setIsActive(false);
        };

        const handleRecordingStarted = (data) => {
            if (data.sessionId !== sessionId) return;
            setIsRecording(true);
            setRecordingStartTime(data.startTime);
        };

        const handleRecordingStopped = (data) => {
            if (data.sessionId !== sessionId) return;
            setIsRecording(false);
            setRecordingStartTime(null);
            setRecordingDuration(0);
        };

        const handleCameraStart = (data) => {
            if (data.sessionId !== sessionId) return;
            // The host has started their camera. We should connect to them via WebRTC.
            socket.emit('whiteboard:webrtc-join', { sessionId });
        };

        const handleCameraStop = (data) => {
            if (data.sessionId !== sessionId) return;
            setHostStreams(prev => {
                const next = { ...prev };
                delete next[data.fromSocketId || 'unknown'];
                // Since we don't always know fromSocketId cleanly here if the event didn't pass it,
                // we might just clear everything if we assume single host, but we have max 2 limit.
                // We actually don't need to do anything here because the peer connection will close and onremovetrack will fire.
                return next;
            });
        };

        const handleWebrtcOffer = async (data) => {
            if (data.sessionId !== sessionId) return;
            const targetSocketId = data.fromSocketId;
            
            let pc = peerConnectionsRef.current[targetSocketId];
            if (!pc) {
                pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit('whiteboard:webrtc-ice-candidate', {
                            sessionId,
                            targetSocketId,
                            candidate: event.candidate
                        });
                    }
                };

                pc.ontrack = (event) => {
                    setHostStreams(prev => ({
                        ...prev,
                        [targetSocketId]: event.streams[0]
                    }));
                };

                pc.onconnectionstatechange = () => {
                    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                        setHostStreams(prev => {
                            const next = { ...prev };
                            delete next[targetSocketId];
                            return next;
                        });
                        delete peerConnectionsRef.current[targetSocketId];
                    }
                };

                peerConnectionsRef.current[targetSocketId] = pc;
            }

            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('whiteboard:webrtc-answer', {
                sessionId,
                targetSocketId,
                answer
            });
        };

        const handleWebrtcIceCandidate = async (data) => {
            if (data.sessionId !== sessionId) return;
            const pc = peerConnectionsRef.current[data.fromSocketId];
            if (pc && data.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        };

        socket.on('whiteboard:draw', handleDraw);
        socket.on('whiteboard:clear', handleClear);
        socket.on('whiteboard:background-change', handleBackgroundChange);
        socket.on('whiteboard:canvas-state', handleCanvasState);
        socket.on('whiteboard:objects-update', handleObjectsUpdate);
        socket.on('whiteboard:laser-update', handleLaserUpdate);
        socket.on('whiteboard:ended', handleEndSharing);
        socket.on('whiteboard:recording-started', handleRecordingStarted);
        socket.on('whiteboard:recording-stopped', handleRecordingStopped);
        socket.on('whiteboard:camera-start', handleCameraStart);
        socket.on('whiteboard:camera-stop', handleCameraStop);
        socket.on('whiteboard:webrtc-offer', handleWebrtcOffer);
        socket.on('whiteboard:webrtc-ice-candidate', handleWebrtcIceCandidate);

        // Request current canvas state when joining
        socket.emit('whiteboard:request-state', { sessionId });
        // Request WebRTC connection if host already has camera on
        socket.emit('whiteboard:webrtc-join', { sessionId });

        return () => {
            socket.off('whiteboard:draw', handleDraw);
            socket.off('whiteboard:clear', handleClear);
            socket.off('whiteboard:background-change', handleBackgroundChange);
            socket.off('whiteboard:canvas-state', handleCanvasState);
            socket.off('whiteboard:objects-update', handleObjectsUpdate);
            socket.off('whiteboard:laser-update', handleLaserUpdate);
            socket.off('whiteboard:ended', handleEndSharing);
            socket.off('whiteboard:recording-started', handleRecordingStarted);
            socket.off('whiteboard:recording-stopped', handleRecordingStopped);
            socket.off('whiteboard:camera-start', handleCameraStart);
            socket.off('whiteboard:camera-stop', handleCameraStop);
            socket.off('whiteboard:webrtc-offer', handleWebrtcOffer);
            socket.off('whiteboard:webrtc-ice-candidate', handleWebrtcIceCandidate);
            
            // Clean up peer connections
            Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
            peerConnectionsRef.current = {};
        };
    }, [socket, sessionId]);

    // Update recording duration locally
    useEffect(() => {
        let interval;
        if (isRecording && recordingStartTime) {
            interval = setInterval(() => {
                setRecordingDuration(Math.floor((Date.now() - recordingStartTime) / 1000));
            }, 1000);
        } else {
            setRecordingDuration(0);
        }
        return () => clearInterval(interval);
    }, [isRecording, recordingStartTime]);


    if (!isOpen) return null;

    const renderCanvasContent = () => (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ width: canvasSize.width, height: canvasSize.height, maxWidth: '100%', maxHeight: '100%' }}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="rounded-lg shadow-lg max-w-full max-h-full"
                style={{ ...getBackgroundStyle() }}
            />
            
            {/* Objects Layer */}
            {imageObjects.map(imgObj => (
                <div key={imgObj.id} className="absolute pointer-events-none" style={{ left: imgObj.x, top: imgObj.y, width: imgObj.width, height: imgObj.height, transform: `rotate(${imgObj.rotation || 0}deg)`, transformOrigin: 'center center' }}>
                    <img src={imgObj.src} className="w-full h-full object-contain pointer-events-none" />
                </div>
            ))}
            {textObjects.map(txtObj => (
                <div key={txtObj.id} className="absolute pointer-events-none flex items-center justify-center p-2" style={{ left: txtObj.x, top: txtObj.y, width: txtObj.width, minHeight: txtObj.height, transform: `rotate(${txtObj.rotation || 0}deg)`, transformOrigin: 'center center' }}>
                    <div className="w-full text-center whitespace-pre-wrap break-words" style={{ color: txtObj.color, fontSize: txtObj.fontSize || 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
                        {txtObj.text}
                    </div>
                </div>
            ))}
            {shapeObjects.map(shpObj => {
                const renderShapeSVG = () => {
                    if (shpObj.type === 'rectangle') return <rect x="0" y="0" width={shpObj.width} height={shpObj.height} fill="transparent" stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} />;
                    if (shpObj.type === 'circle') return <ellipse cx={shpObj.width/2} cy={shpObj.height/2} rx={shpObj.width/2} ry={shpObj.height/2} fill="transparent" stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} />;
                    if (shpObj.type === 'triangle') return <polygon points={`${shpObj.width/2},0 0,${shpObj.height} ${shpObj.width},${shpObj.height}`} fill="transparent" stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} strokeLinejoin="round" />;
                    if (shpObj.type === 'star') {
                        const cx = shpObj.width / 2, cy = shpObj.height / 2, outerRadius = Math.min(cx, cy), innerRadius = outerRadius / 2.5;
                        let points = [];
                        for (let i = 0; i < 10; i++) {
                            const r = i % 2 === 0 ? outerRadius : innerRadius;
                            const angle = (i * Math.PI) / 5 - Math.PI / 2;
                            points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
                        }
                        return <polygon points={points.join(' ')} fill="transparent" stroke={shpObj.color} strokeWidth={shpObj.strokeWidth} strokeLinejoin="round" />;
                    }
                    return null;
                };
                return (
                    <div key={shpObj.id} className="absolute pointer-events-none" style={{ left: shpObj.x, top: shpObj.y, width: shpObj.width, height: shpObj.height, transform: `rotate(${shpObj.rotation || 0}deg)`, transformOrigin: 'center center' }}>
                        <svg width="100%" height="100%" style={{ overflow: 'visible' }}>{renderShapeSVG()}</svg>
                        {shpObj.text !== undefined && (
                            <div className="absolute inset-0 flex items-center justify-center p-2 pointer-events-none">
                                <div className="w-full text-center whitespace-pre-wrap break-words" style={{ color: shpObj.color, fontSize: shpObj.fontSize || 20 }}>{shpObj.text}</div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Host Video Streams overlay */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-50">
                {Object.values(hostStreams).map((stream, idx) => (
                    <HostVideoRenderer key={stream.id || idx} stream={stream} />
                ))}
            </div>
        </div>
    );

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
                                {isRecording && (
                                    <span className="flex items-center gap-1 text-xs bg-red-600 px-2 py-0.5 rounded-full shadow-sm border border-red-400">
                                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        {formatDuration(recordingDuration)}
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
                        renderCanvasContent()
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

                {/* Floatable Student Live Chat */}
                <WhiteboardChatWindow
                    socket={socket}
                    sessionId={sessionId}
                    currentUser={{ name: 'Student', role: 'student' }}
                    isInstructor={false}
                />
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
                                {isRecording && (
                                    <span className="flex items-center gap-1 text-xs bg-red-600 px-2 py-0.5 rounded-full shadow-sm border border-red-400">
                                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        {formatDuration(recordingDuration)}
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
                        renderCanvasContent()
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

                {/* Floatable Student Live Chat */}
                <WhiteboardChatWindow
                    socket={socket}
                    sessionId={sessionId}
                    currentUser={{ name: 'Student', role: 'student' }}
                    isInstructor={false}
                />
            </div>
        </div>
    );
}
