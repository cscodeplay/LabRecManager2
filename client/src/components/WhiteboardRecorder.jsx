import React, { useState, useRef, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, Circle, Square, Pause, Play , GripVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';

const WhiteboardRecorder = ({ canvasRef, sessionId, socket, shapeObjects = [], textObjects = [], imageObjects = [], onRecordingComplete, isVisible = false }) => {
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
    
    // Refs to hold the latest objects so the recording loop always has access to the most recent state
    const shapeObjectsRef = useRef(shapeObjects);
    const textObjectsRef = useRef(textObjects);
    const imageObjectsRef = useRef(imageObjects);

    useEffect(() => {
        shapeObjectsRef.current = shapeObjects;
    }, [shapeObjects]);

    useEffect(() => {
        textObjectsRef.current = textObjects;
    }, [textObjects]);

    useEffect(() => {
        imageObjectsRef.current = imageObjects;
    }, [imageObjects]);

    // Draggable camera state
    const [position, setPosition] = useState({ x: 24, y: 24 });
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    
    const [micLevel, setMicLevel] = useState(0);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const animFrameRef = useRef(null);

    const startAudioAnalysis = (stream) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);
        
        const updateMicLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArrayRef.current);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArrayRef.current[i];
            }
            const average = sum / bufferLength;
            setMicLevel(Math.min(1, (average / 255) * 3.5)); // amplified for visibility
            animFrameRef.current = requestAnimationFrame(updateMicLevel);
        };
        updateMicLevel();
    };

    const stopAudioAnalysis = () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (analyserRef.current) {
            analyserRef.current.disconnect();
            analyserRef.current = null;
        }
        setMicLevel(0);
    };

    const handlePointerDown = (e) => {
        e.stopPropagation();
        isDragging.current = true;
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        e.target.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        e.stopPropagation();
        if (!isDragging.current) return;
        setPosition({
            x: Math.max(0, Math.min(window.innerWidth - 192, e.clientX - dragOffset.current.x)),
            y: Math.max(0, Math.min(window.innerHeight - 144, e.clientY - dragOffset.current.y))
        });
    };

    const handlePointerUp = (e) => {
        e.stopPropagation();
        isDragging.current = false;
        e.target.releasePointerCapture(e.pointerId);
    };

    // Initialize media stream for camera/mic
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            stopAudioAnalysis();
        };
    }, []);

    const toggleCamera = async () => {
        if (!streamRef.current) {
            streamRef.current = new MediaStream();
        }

        if (hasCamera) {
            const videoTracks = streamRef.current.getVideoTracks();
            videoTracks.forEach(track => {
                track.stop();
                streamRef.current.removeTrack(track);
            });
            setHasCamera(false);
        } else {
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const newVideoTrack = newStream.getVideoTracks()[0];
                if (newVideoTrack) {
                    streamRef.current.addTrack(newVideoTrack);
                    setHasCamera(true);
                    if (videoPreviewRef.current) {
                        videoPreviewRef.current.srcObject = streamRef.current;
                    }
                }
            } catch (err) {
                console.error("Failed to re-enable camera", err);
                toast.error("Failed to access camera");
            }
        }
    };

    
    useEffect(() => {
        if (hasCamera && videoPreviewRef.current && streamRef.current) {
            videoPreviewRef.current.srcObject = streamRef.current;
        }
    }, [hasCamera]);

    const toggleMic = async () => {
        if (!streamRef.current) {
            streamRef.current = new MediaStream();
        }

        if (hasMic) {
            const audioTracks = streamRef.current.getAudioTracks();
            audioTracks.forEach(track => {
                track.stop();
                streamRef.current.removeTrack(track);
            });
            setHasMic(false);
            stopAudioAnalysis();
        } else {
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const newAudioTrack = newStream.getAudioTracks()[0];
                if (newAudioTrack) {
                    streamRef.current.addTrack(newAudioTrack);
                    setHasMic(true);
                    startAudioAnalysis(newStream);
                }
            } catch (err) {
                console.error("Failed to re-enable mic", err);
                toast.error("Failed to access microphone");
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
                imageObjectsRef.current.forEach(imgObj => {
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
                shapeObjectsRef.current.forEach(shpObj => {
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
                    } else if (shpObj.type === 'path') {
                        if (shpObj.points && shpObj.points.length > 0) {
                            const pts = shpObj.points;
                            compositeCtx.moveTo(pts[0].x, pts[0].y);
                            if (shpObj.smooth && pts.length > 2) {
                                for (let i = 1; i < pts.length - 1; i++) {
                                    const xc = (pts[i].x + pts[i + 1].x) / 2;
                                    const yc = (pts[i].y + pts[i + 1].y) / 2;
                                    compositeCtx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
                                }
                                compositeCtx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
                            } else {
                                for (let i = 1; i < pts.length; i++) {
                                    compositeCtx.lineTo(pts[i].x, pts[i].y);
                                }
                            }
                            if (shpObj.isHighlighter) {
                                compositeCtx.globalAlpha = 0.5;
                            }
                            compositeCtx.lineCap = 'round';
                            compositeCtx.lineJoin = 'round';
                        }
                    } else if (shpObj.type === 'line') {
                        compositeCtx.moveTo(shpObj.startX, shpObj.startY);
                        compositeCtx.lineTo(shpObj.endX, shpObj.endY);
                        compositeCtx.lineCap = 'round';
                    } else if (shpObj.type === 'arrow') {
                        compositeCtx.moveTo(shpObj.startX, shpObj.startY);
                        compositeCtx.lineTo(shpObj.endX, shpObj.endY);
                        const angle = Math.atan2(shpObj.endY - shpObj.startY, shpObj.endX - shpObj.startX);
                        const headLength = shpObj.strokeWidth * 4;
                        const p1 = { x: shpObj.endX, y: shpObj.endY };
                        const p2 = { x: shpObj.endX - headLength * Math.cos(angle - Math.PI / 6), y: shpObj.endY - headLength * Math.sin(angle - Math.PI / 6) };
                        const p3 = { x: shpObj.endX - headLength * Math.cos(angle + Math.PI / 6), y: shpObj.endY - headLength * Math.sin(angle + Math.PI / 6) };
                        compositeCtx.stroke();
                        compositeCtx.beginPath();
                        compositeCtx.moveTo(p1.x, p1.y);
                        compositeCtx.lineTo(p2.x, p2.y);
                        compositeCtx.lineTo(p3.x, p3.y);
                        compositeCtx.closePath();
                        compositeCtx.fillStyle = shpObj.color;
                        compositeCtx.fill();
                        compositeCtx.beginPath();
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
                textObjectsRef.current.forEach(txtObj => {
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
                    
                    // position.x and position.y are absolute screen coordinates (left, top)
                    // The video PIP is below the controls (roughly 44px gap)
                    const drawX = position.x * scaleX;
                    const drawY = (position.y + 44) * scaleY;
                    
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
        <div 
            className={`fixed z-[100] flex flex-col items-center gap-2 pointer-events-auto transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ left: `${position.x}px`, top: `${position.y}px`, cursor: isDragging.current ? 'grabbing' : 'grab', touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            {/* Recording Controls */}
            <div className="bg-slate-800/95 backdrop-blur-md px-2 py-1 rounded-full shadow-xl border border-slate-700/50 flex items-center gap-1">
                <div className="px-1 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4" />
                </div>
                <button onPointerDown={(e) => e.stopPropagation()}
                    onClick={toggleMic}
                    className={`p-1.5 rounded-full transition-all ${hasMic ? 'text-slate-200 hover:bg-slate-700' : 'text-red-400 hover:bg-red-500/20 bg-red-500/10'}`}
                    title={hasMic ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                    <div className="relative flex items-center justify-center">
                        {hasMic ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                        {hasMic && (
                            <div className="absolute inset-0 text-green-400 overflow-hidden" style={{ clipPath: `inset(${100 - (micLevel * 100)}% 0 0 0)` }}>
                                <Mic className="w-4 h-4 fill-current" />
                            </div>
                        )}
                    </div>
                </button>
                <button onPointerDown={(e) => e.stopPropagation()}
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
                        <button onPointerDown={(e) => e.stopPropagation()}
                            onClick={isPaused ? resumeRecording : togglePause}
                            className={`p-1.5 rounded-full transition-all ${isPaused ? 'text-green-400 hover:bg-green-500/20 bg-green-500/10' : 'text-slate-200 hover:bg-slate-700'}`}
                            title={isPaused ? 'Resume Recording' : 'Pause Recording'}
                        >
                            {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
                        </button>
                        <button onPointerDown={(e) => e.stopPropagation()}
                            onClick={stopRecording}
                            className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                            title="Stop Recording"
                        >
                            <Square className="w-4 h-4 fill-current" />
                        </button>
                    </>
                ) : (
                    <button onPointerDown={(e) => e.stopPropagation()}
                        onClick={startRecording}
                        className="p-1.5 text-white hover:bg-slate-700 rounded-full transition-colors group"
                        title="Start Recording"
                    >
                        <Circle className="w-4 h-4 fill-red-500 text-red-500 group-hover:scale-110 transition-transform" />
                    </button>
                )}
            </div>

            {/* Movable Video Preview Picture-in-Picture */}
            {hasCamera && (
                <div className="w-48 h-36 bg-slate-900 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700 pointer-events-none">
                    <video 
                        ref={videoPreviewRef} 
                        autoPlay 
                        muted 
                        playsInline 
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                </div>
            )}
        </div>
    );
};

export default WhiteboardRecorder;

