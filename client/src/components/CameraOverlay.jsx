'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
    Video, VideoOff, Mic, MicOff, Settings, X, Move, Maximize2, Minimize2,
    Volume2, VolumeX
} from 'lucide-react';

export default function CameraOverlay({
    isOpen,
    onClose,
    socket,
    sessionId,
    isInstructor = false
}) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const streamRef = useRef(null);

    // Camera state
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isMicOn, setIsMicOn] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Position for dragging
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Device selection
    const [videoDevices, setVideoDevices] = useState([]);
    const [audioDevices, setAudioDevices] = useState([]);
    const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
    const [selectedAudioDevice, setSelectedAudioDevice] = useState('');

    // Audio level indicator
    const [audioLevel, setAudioLevel] = useState(0);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);

    // Get available devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                // Request permission first
                await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

                const devices = await navigator.mediaDevices.enumerateDevices();
                setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
                setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
            } catch (err) {
                console.error('Error getting devices:', err);
            }
        };

        if (isOpen) {
            getDevices();
        }
    }, [isOpen]);

    // Start camera and microphone
    const startMedia = useCallback(async () => {
        try {
            const constraints = {
                video: selectedVideoDevice
                    ? { deviceId: { exact: selectedVideoDevice }, width: 320, height: 240 }
                    : { width: 320, height: 240, facingMode: 'user' },
                audio: selectedAudioDevice
                    ? { deviceId: { exact: selectedAudioDevice }, echoCancellation: true, noiseSuppression: true }
                    : { echoCancellation: true, noiseSuppression: true }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            // Set up audio level monitoring
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 256;
            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            // Monitor audio levels
            const checkAudioLevel = () => {
                if (!analyserRef.current) return;
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                setAudioLevel(average / 255);
                if (streamRef.current) {
                    requestAnimationFrame(checkAudioLevel);
                }
            };
            checkAudioLevel();

            setIsCameraOn(true);
            setIsMicOn(true);

            // Emit stream start event
            if (socket && sessionId) {
                socket.emit('whiteboard:camera-start', {
                    sessionId,
                    hasVideo: true,
                    hasAudio: true
                });
            }
        } catch (err) {
            console.error('Error starting media:', err);
        }
    }, [selectedVideoDevice, selectedAudioDevice, socket, sessionId]);

    // Stop camera and microphone
    const stopMedia = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setIsCameraOn(false);
        setIsMicOn(false);
        setAudioLevel(0);

        // Emit stream stop event
        if (socket && sessionId) {
            socket.emit('whiteboard:camera-stop', { sessionId });
        }
    }, [socket, sessionId]);

    // Toggle camera
    const toggleCamera = useCallback(() => {
        if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOn(videoTrack.enabled);
            }
        } else if (!isCameraOn) {
            startMedia();
        }
    }, [isCameraOn, startMedia]);

    // Toggle microphone
    const toggleMic = useCallback(() => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicOn(audioTrack.enabled);
            }
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopMedia();
        };
    }, [stopMedia]);

    // Dragging handlers
    const handleMouseDown = (e) => {
        if (e.target.closest('.drag-handle')) {
            setIsDragging(true);
            const rect = containerRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    };

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            });
        }
    }, [isDragging, dragOffset]);

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove]);

    if (!isOpen) return null;

    return (
        <div
            ref={containerRef}
            className={`fixed z-50 bg-slate-900 rounded-xl shadow-2xl overflow-hidden transition-all ${isMinimized ? 'w-16 h-16' : 'w-80'
                }`}
            style={{
                left: position.x,
                top: position.y,
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Header - Drag Handle */}
            <div className="flex items-center justify-between p-2 bg-slate-800 cursor-move drag-handle">
                <div className="flex items-center gap-2">
                    <Move className="w-4 h-4 text-slate-400" />
                    {!isMinimized && (
                        <span className="text-xs font-medium text-slate-300">
                            {isCameraOn ? 'Camera On' : 'Camera Off'}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1 hover:bg-slate-700 rounded transition"
                    >
                        {isMinimized ? (
                            <Maximize2 className="w-3 h-3 text-slate-400" />
                        ) : (
                            <Minimize2 className="w-3 h-3 text-slate-400" />
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-700 rounded transition"
                    >
                        <X className="w-3 h-3 text-slate-400" />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Video Preview */}
                    <div className="relative aspect-video bg-slate-950">
                        {isCameraOn ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover mirror"
                                style={{ transform: 'scaleX(-1)' }}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <VideoOff className="w-12 h-12 text-slate-600" />
                            </div>
                        )}

                        {/* Audio Level Indicator */}
                        {isMicOn && (
                            <div className="absolute bottom-2 left-2 flex items-center gap-1">
                                <Volume2 className="w-4 h-4 text-green-400" />
                                <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-400 transition-all duration-75"
                                        style={{ width: `${audioLevel * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Live indicator */}
                        {isCameraOn && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-red-500 rounded-full">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                <span className="text-xs font-medium text-white">LIVE</span>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-2 p-3 bg-slate-800">
                        <button
                            onClick={isCameraOn ? toggleCamera : startMedia}
                            className={`p-2.5 rounded-full transition ${isCameraOn
                                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                    : 'bg-red-500 hover:bg-red-600 text-white'
                                }`}
                            title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
                        >
                            {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                        </button>

                        <button
                            onClick={toggleMic}
                            disabled={!isCameraOn}
                            className={`p-2.5 rounded-full transition ${isMicOn
                                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                    : 'bg-red-500 hover:bg-red-600 text-white'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
                        >
                            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                        </button>

                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2.5 rounded-full bg-slate-700 hover:bg-slate-600 text-white transition"
                            title="Settings"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Settings Panel */}
                    {showSettings && (
                        <div className="p-3 bg-slate-850 border-t border-slate-700">
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                        Camera
                                    </label>
                                    <select
                                        value={selectedVideoDevice}
                                        onChange={(e) => setSelectedVideoDevice(e.target.value)}
                                        className="w-full bg-slate-700 text-white text-sm rounded-lg px-2 py-1.5 border-0"
                                    >
                                        <option value="">Default Camera</option>
                                        {videoDevices.map(device => (
                                            <option key={device.deviceId} value={device.deviceId}>
                                                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                        Microphone
                                    </label>
                                    <select
                                        value={selectedAudioDevice}
                                        onChange={(e) => setSelectedAudioDevice(e.target.value)}
                                        className="w-full bg-slate-700 text-white text-sm rounded-lg px-2 py-1.5 border-0"
                                    >
                                        <option value="">Default Microphone</option>
                                        {audioDevices.map(device => (
                                            <option key={device.deviceId} value={device.deviceId}>
                                                {device.label || `Mic ${device.deviceId.slice(0, 8)}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={() => {
                                        stopMedia();
                                        startMedia();
                                    }}
                                    className="w-full bg-primary-500 hover:bg-primary-600 text-white text-sm py-1.5 rounded-lg transition"
                                >
                                    Apply Changes
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
