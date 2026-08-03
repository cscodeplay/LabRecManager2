import React, { useState, useRef, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, Circle, Square, Pause, Play } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';

const WhiteboardRecorder = ({ canvasRef, sessionId, socket, shapeObjects = [], textObjects = [], imageObjects = [], onRecordingComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [hasCamera, setHasCamera] = useState(false);
    const [hasMic, setHasMic] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const recordingTimeRef = useRef(0);
    const timerIntervalRef = useRef(null);
    
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const streamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const videoPreviewRef = useRef(null);
    const compositeCanvasRef = useRef(null);
    const requestAnimationFrameRef = useRef(null);
    const imageCacheRef = useRef({});

    // Draggable camera state
    const [position, setPosition] = useState({ x: 24, y: 100 });
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handlePointerDown = (e) => {
        isDragging.current = true;
        dragOffset.current = {
            x: e.clientX - position.x,
            y: window.innerHeight - e.clientY - position.y
        };
        e.target.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!isDragging.current) return;
        setPosition({
            x: Math.max(0, Math.min(window.innerWidth - 192, e.clientX - dragOffset.current.x)),
            y: Math.max(0, Math.min(window.innerHeight - 144, window.innerHeight - e.clientY - dragOffset.current.y))
        });
    };

    const handlePointerUp = (e) => {
        isDragging.current = false;
        e.target.releasePointerCapture(e.pointerId);
    };

    // Initialize media stream for camera/mic
    useEffect(() => {
        const initMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                streamRef.current = stream;
                setHasCamera(true);
                setHasMic(true);
                if (videoPreviewRef.current) {
                    videoPreviewRef.current.srcObject = stream;
                }
            } catch (err) {
                console.warn('Camera/Mic access denied or unavailable', err);
                // Fallback to audio only if video fails, or no AV
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    streamRef.current = audioStream;
                    setHasMic(true);
                } catch (audioErr) {
                    console.warn('Mic access denied', audioErr);
                }
            }
        };

        initMedia();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const toggleCamera = () => {
        if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setHasCamera(videoTrack.enabled);
            }
        }
    };

    const toggleMic = () => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setHasMic(audioTrack.enabled);
            }
        }
    };

    const startRecording = async () => {
        if (!canvasRef.current) {
            toast.error('Canvas not ready for recording');
            return;
        }

        try {
            recordedChunksRef.current = [];
            
            if (socket) {
                socket.emit('whiteboard:recording-started', { sessionId, startTime: Date.now() });
            }

            // Create a hidden composite canvas for recording
            const mainCanvas = canvasRef.current;
            // The canvas logical size (width/height attributes) is what we want to record
            const width = mainCanvas.width;
            const height = mainCanvas.height;
            
            if (!compositeCanvasRef.current) {
                compositeCanvasRef.current = document.createElement('canvas');
            }
            const compositeCanvas = compositeCanvasRef.current;
            compositeCanvas.width = width;
            compositeCanvas.height = height;
            
            const compositeCtx = compositeCanvas.getContext('2d', { willReadFrequently: true });
            
            // Function to continually composite the main canvas and the camera video
            const drawComposite = () => {
                // Fill with background color to avoid black backgrounds in video
                let bgColor = mainCanvas.style.backgroundColor || '#ffffff';
                if (bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') {
                    bgColor = '#ffffff';
                }
                compositeCtx.fillStyle = bgColor;
                compositeCtx.fillRect(0, 0, width, height);
                
                // Draw whiteboard
                compositeCtx.drawImage(mainCanvas, 0, 0);

                // Draw image objects
                imageObjects.forEach(imgObj => {
                    let img = imageCacheRef.current[imgObj.src];
                    if (!img) {
                        img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.src = imgObj.src;
                        imageCacheRef.current[imgObj.src] = img;
                    }
                    
                    if (img.complete && img.naturalWidth !== 0) {
                        compositeCtx.save();
                        const centerX = imgObj.x + imgObj.width / 2;
                        const centerY = imgObj.y + imgObj.height / 2;
                        compositeCtx.translate(centerX, centerY);
                        compositeCtx.rotate((imgObj.rotation || 0) * Math.PI / 180);
                        compositeCtx.drawImage(img, -imgObj.width / 2, -imgObj.height / 2, imgObj.width, imgObj.height);
                        compositeCtx.restore();
                    }
                });

                // Draw shape objects
                shapeObjects.forEach(shpObj => {
                    compositeCtx.save();
                    compositeCtx.translate(shpObj.x, shpObj.y);
                    // Handle rotation if any (Whiteboard doesn't support shape rotation yet but just in case)
                    if (shpObj.rotation) {
                        compositeCtx.translate(shpObj.width/2, shpObj.height/2);
                        compositeCtx.rotate(shpObj.rotation * Math.PI / 180);
                        compositeCtx.translate(-shpObj.width/2, -shpObj.height/2);
                    }
                    compositeCtx.strokeStyle = shpObj.color;
                    compositeCtx.lineWidth = shpObj.strokeWidth;
                    compositeCtx.fillStyle = shpObj.fillColor || 'transparent';

                    compositeCtx.beginPath();
                    if (shpObj.type === 'rectangle') {
                        compositeCtx.rect(0, 0, shpObj.width, shpObj.height);
                    } else if (shpObj.type === 'circle') {
                        compositeCtx.ellipse(shpObj.width / 2, shpObj.height / 2, shpObj.width / 2, shpObj.height / 2, 0, 0, 2 * Math.PI);
                    } else if (shpObj.type === 'triangle') {
                        compositeCtx.moveTo(shpObj.width / 2, 0);
                        compositeCtx.lineTo(0, shpObj.height);
                        compositeCtx.lineTo(shpObj.width, shpObj.height);
                        compositeCtx.closePath();
                    } else if (shpObj.type === 'star') {
                        const cx = shpObj.width / 2;
                        const cy = shpObj.height / 2;
                        const outerRadius = Math.min(cx, cy);
                        const innerRadius = outerRadius / 2.5;
                        for (let i = 0; i < 10; i++) {
                            const r = i % 2 === 0 ? outerRadius : innerRadius;
                            const angle = (i * Math.PI) / 5 - Math.PI / 2;
                            const x = cx + r * Math.cos(angle);
                            const y = cy + r * Math.sin(angle);
                            if (i === 0) compositeCtx.moveTo(x, y);
                            else compositeCtx.lineTo(x, y);
                        }
                        compositeCtx.closePath();
                    } else if (shpObj.type === 'graph') {
                        // Background
                        compositeCtx.rect(0, 0, shpObj.width, shpObj.height);
                        if (shpObj.fillColor) compositeCtx.fill();
                        
                        // Grid lines
                        compositeCtx.beginPath();
                        compositeCtx.lineWidth = Math.max(0.5, shpObj.strokeWidth * 0.3);
                        // setDash takes an array
                        compositeCtx.setLineDash([4, 4]);
                        compositeCtx.globalAlpha = 0.4;
                        for(let i=0; i<9; i++) {
                            // H
                            compositeCtx.moveTo(shpObj.width/10, shpObj.height/10 + (shpObj.height*0.8) * (i/8));
                            compositeCtx.lineTo(shpObj.width*0.9, shpObj.height/10 + (shpObj.height*0.8) * (i/8));
                            // V
                            compositeCtx.moveTo(shpObj.width/10 + (shpObj.width*0.8) * (i/8), shpObj.height/10);
                            compositeCtx.lineTo(shpObj.width/10 + (shpObj.width*0.8) * (i/8), shpObj.height*0.9);
                        }
                        compositeCtx.stroke();
                        
                        compositeCtx.beginPath();
                        compositeCtx.globalAlpha = 1.0;
                        compositeCtx.setLineDash([]);
                        compositeCtx.lineWidth = shpObj.strokeWidth;
                        // Y axis
                        compositeCtx.moveTo(shpObj.width/10, shpObj.height/10);
                        compositeCtx.lineTo(shpObj.width/10, shpObj.height*0.9);
                        // X axis
                        compositeCtx.moveTo(shpObj.width/10, shpObj.height/2);
                        compositeCtx.lineTo(shpObj.width*0.9, shpObj.height/2);
                        
                        // Y arrow
                        compositeCtx.moveTo(shpObj.width/10, shpObj.height/10);
                        compositeCtx.lineTo(shpObj.width/10 - 4, shpObj.height/10 + 8);
                        compositeCtx.moveTo(shpObj.width/10, shpObj.height/10);
                        compositeCtx.lineTo(shpObj.width/10 + 4, shpObj.height/10 + 8);
                        // X arrow
                        compositeCtx.moveTo(shpObj.width*0.9, shpObj.height/2);
                        compositeCtx.lineTo(shpObj.width*0.9 - 8, shpObj.height/2 - 4);
                        compositeCtx.moveTo(shpObj.width*0.9, shpObj.height/2);
                        compositeCtx.lineTo(shpObj.width*0.9 - 8, shpObj.height/2 + 4);
                    }
                    
                    if (shpObj.type !== 'graph') {
                        if (shpObj.fillColor) compositeCtx.fill();
                    }
                    compositeCtx.stroke();
                    
                    // Draw text inside shape if any
                    if (shpObj.text !== undefined && shpObj.text !== '') {
                        compositeCtx.font = `${shpObj.fontSize || 20}px 'Inter', system-ui, sans-serif`;
                        compositeCtx.fillStyle = shpObj.color;
                        compositeCtx.textAlign = 'center';
                        compositeCtx.textBaseline = 'middle';
                        
                        const lines = shpObj.text.split('\n');
                        const lineHeight = (shpObj.fontSize || 20) * 1.3;
                        let startY = (shpObj.height / 2) - ((lines.length - 1) * lineHeight) / 2;
                        
                        lines.forEach(line => {
                            compositeCtx.fillText(line, shpObj.width / 2, startY);
                            startY += lineHeight;
                        });
                    }

                    compositeCtx.restore();
                });

                // Draw text objects
                textObjects.forEach(txtObj => {
                    compositeCtx.save();
                    const centerX = txtObj.x + txtObj.width / 2;
                    const centerY = txtObj.y + txtObj.height / 2;
                    compositeCtx.translate(centerX, centerY);
                    compositeCtx.rotate((txtObj.rotation || 0) * Math.PI / 180);

                    compositeCtx.font = `${txtObj.fontStyle || 'normal'} ${txtObj.fontWeight || 'normal'} ${txtObj.fontSize}px ${txtObj.fontFamily || 'sans-serif'}`;
                    compositeCtx.fillStyle = txtObj.color;
                    compositeCtx.textAlign = txtObj.textAlign || 'left';
                    compositeCtx.textBaseline = 'top';

                    const lines = txtObj.text.split('\n');
                    const lineHeight = txtObj.fontSize * 1.3;
                    const startX = -txtObj.width / 2 + 8;
                    let startY = -txtObj.height / 2 + 8;

                    lines.forEach(line => {
                        compositeCtx.fillText(line, startX, startY);
                        startY += lineHeight;
                    });
                    compositeCtx.restore();
                });

                // Draw camera if active and ready
                if (hasCamera && videoPreviewRef.current && videoPreviewRef.current.readyState >= 2) {
                    const videoWidth = 192; // Match the CSS width
                    const videoHeight = 144; // Match the CSS height
                    
                    // We need to map the CSS position (left: x, bottom: y) to canvas coordinates.
                    // However, we want it relative to the visual window size vs logical canvas size.
                    // The main canvas css width is 100%, height is 100%. So the scale is:
                    const scaleX = width / mainCanvas.clientWidth;
                    const scaleY = height / mainCanvas.clientHeight;
                    
                    const drawX = position.x * scaleX;
                    const drawY = height - (position.y * scaleY) - (videoHeight * scaleY);
                    
                    // We must respect the scale to match the video element's CSS
                    // Also, the video is horizontally flipped! `transform scale-x-[-1]`
                    compositeCtx.save();
                    // Move to the position
                    compositeCtx.translate(drawX + (videoWidth * scaleX), drawY);
                    compositeCtx.scale(-1, 1);
                    // Draw video
                    compositeCtx.drawImage(videoPreviewRef.current, 0, 0, videoWidth * scaleX, videoHeight * scaleY);
                    compositeCtx.restore();
                }
                
                requestAnimationFrameRef.current = requestAnimationFrame(drawComposite);
            };
            
            // Start the loop
            drawComposite();
            
            // Capture the composited canvas stream at 30 fps
            const canvasStream = compositeCanvas.captureStream(30);
            
            // Combine with microphone stream if available
            const combinedTracks = [...canvasStream.getVideoTracks()];
            
            if (streamRef.current && streamRef.current.getAudioTracks().length > 0) {
                combinedTracks.push(streamRef.current.getAudioTracks()[0]);
            }

            const combinedStream = new MediaStream(combinedTracks);

            const options = { mimeType: 'video/webm; codecs=vp9' };
            let mediaRecorder;
            try {
                mediaRecorder = new MediaRecorder(combinedStream, options);
            } catch (e) {
                // Fallback to default if vp9 isn't supported
                mediaRecorder = new MediaRecorder(combinedStream);
            }

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    recordedChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                await uploadRecording(blob);
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorderRef.current.start(1000); // Record in 1s chunks
            setIsRecording(true);
            setIsPaused(false);
            setRecordingTime(0);
            recordingTimeRef.current = 0;
            
            timerIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    recordingTimeRef.current = prev + 1;
                    return prev + 1;
                });
            }, 1000);
            
            toast.success('Recording started');
        } catch (err) {
            console.error('Error starting recording:', err);
            toast.error('Failed to start recording');
        }
    };

    const togglePause = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            timerIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    recordingTimeRef.current = prev + 1;
                    return prev + 1;
                });
            }, 1000);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);
            
            if (socket) {
                socket.emit('whiteboard:recording-stopped', { sessionId });
            }

            if (requestAnimationFrameRef.current) {
                cancelAnimationFrame(requestAnimationFrameRef.current);
                requestAnimationFrameRef.current = null;
            }

            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
                screenStreamRef.current = null;
            }
            toast.loading('Uploading recording...', { id: 'recording-upload' });
        }
    };

    const uploadRecording = async (blob) => {
        try {
            // Convert Blob to File for upload API
            const file = new File([blob], `whiteboard_recording_${Date.now()}.webm`, {
                type: 'video/webm'
            });

            const formData = new FormData();
            formData.append('video', file);
            formData.append('title', `Whiteboard Lecture - ${new Date().toLocaleDateString()}`);
            if (sessionId) {
                formData.append('sessionId', sessionId);
            }
            formData.append('duration', recordingTimeRef.current);

            const res = await api.post('/recordings/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.data.success) {
                toast.success('Recording saved successfully!', { id: 'recording-upload' });
                
                if (onRecordingComplete) {
                    onRecordingComplete(res.data.data);
                }
            } else {
                throw new Error(res.data.error || 'Upload failed');
            }
        } catch (err) {
            console.error('Error uploading recording:', err);
            toast.error('Failed to upload recording', { id: 'recording-upload' });
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <>
            {/* Movable Video Preview Picture-in-Picture */}
            <div 
                className={`fixed z-50 w-48 h-36 bg-slate-900 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700 pointer-events-auto transition-opacity duration-300 ${hasCamera ? 'opacity-100' : 'opacity-0 hidden'}`}
                style={{ left: `${position.x}px`, bottom: `${position.y}px`, cursor: 'grab', touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <video 
                    ref={videoPreviewRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover transform scale-x-[-1] pointer-events-none"
                />
            </div>

            {/* Recording Controls (top center) */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-slate-800/95 backdrop-blur-md px-2 py-1 rounded-full shadow-xl border border-slate-700/50 flex items-center gap-1 pointer-events-auto z-50">
                <button
                    onClick={toggleMic}
                    className={`p-1.5 rounded-full transition-all ${hasMic ? 'text-slate-200 hover:bg-slate-700' : 'text-red-400 hover:bg-red-500/20 bg-red-500/10'}`}
                    title={hasMic ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                    {hasMic ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button
                    onClick={toggleCamera}
                    className={`p-1.5 rounded-full transition-all ${hasCamera ? 'text-slate-200 hover:bg-slate-700' : 'text-red-400 hover:bg-red-500/20 bg-red-500/10'}`}
                    title={hasCamera ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                    {hasCamera ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
                
                <div className="w-px h-5 bg-slate-700 mx-1"></div>
                
                {isRecording ? (
                    <>
                        <div className="text-red-500 text-xs font-mono font-medium mx-2 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full bg-red-500 ${isPaused ? '' : 'animate-pulse'}`}></span>
                            {formatTime(recordingTime)}
                        </div>
                        <button
                            onClick={isPaused ? resumeRecording : togglePause}
                            className={`p-1.5 rounded-full transition-all ${isPaused ? 'text-green-400 hover:bg-green-500/20 bg-green-500/10' : 'text-slate-200 hover:bg-slate-700'}`}
                            title={isPaused ? 'Resume Recording' : 'Pause Recording'}
                        >
                            {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
                        </button>
                        <button
                            onClick={stopRecording}
                            className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                            title="Stop Recording"
                        >
                            <Square className="w-4 h-4 fill-current" />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={startRecording}
                        className="p-1.5 text-white hover:bg-slate-700 rounded-full transition-colors group"
                        title="Start Recording"
                    >
                        <Circle className="w-4 h-4 fill-red-500 text-red-500 group-hover:scale-110 transition-transform" />
                    </button>
                )}
                
                {isRecording && (
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1.5 pointer-events-none whitespace-nowrap">
                        <div className={`w-1.5 h-1.5 rounded-full bg-red-500 ${isPaused ? '' : 'animate-pulse'}`}></div>
                        <span className="text-red-500 font-medium text-xs tracking-wider">{isPaused ? 'PAUSED' : 'REC'}</span>
                    </div>
                )}
            </div>
        </>
    );
};

export default WhiteboardRecorder;
