import React, { useState, useRef, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, Circle, Square, Pause, Play, GripVertical, ChevronUp, ChevronDown, Check, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import fixWebmDuration from 'fix-webm-duration';
import { formatDate } from '@/lib/dateUtils';
import { get3DModelMesh, shadeColor } from './Whiteboard3DObject';
import { getConnectorArrowAngle } from './ConnectorLine';

const WhiteboardRecorder = ({
    canvasRef,
    sessionId,
    socket,
    shapeObjects = [],
    textObjects = [],
    imageObjects = [],
    threeDObjects = [],
    mediaObjects = [],
    onRecordingComplete,
    isVisible = false
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [hasCamera, setHasCamera] = useState(false);
    const [hasMic, setHasMic] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [uploadProgress, setUploadProgress] = useState(null);
    const recordingTimeRef = useRef(0);
    const timerIntervalRef = useRef(null);

    // Audio / Video Device Selection State
    const [availableDevices, setAvailableDevices] = useState({ cameras: [], microphones: [] });
    const [selectedCamera, setSelectedCamera] = useState('');
    const [selectedMicrophone, setSelectedMicrophone] = useState('');
    const [showCamMenu, setShowCamMenu] = useState(false);
    const [showMicMenu, setShowMicMenu] = useState(false);
    
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
    const threeDObjectsRef = useRef(threeDObjects);
    const mediaObjectsRef = useRef(mediaObjects);

    useEffect(() => {
        shapeObjectsRef.current = shapeObjects;
    }, [shapeObjects]);

    useEffect(() => {
        textObjectsRef.current = textObjects;
    }, [textObjects]);

    useEffect(() => {
        imageObjectsRef.current = imageObjects;
    }, [imageObjects]);

    useEffect(() => {
        threeDObjectsRef.current = threeDObjects;
    }, [threeDObjects]);

    useEffect(() => {
        mediaObjectsRef.current = mediaObjects;
    }, [mediaObjects]);

    // Enumerate connected cameras and microphones
    const refreshDevices = async () => {
        try {
            if (!navigator.mediaDevices?.enumerateDevices) return;
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(d => d.kind === 'videoinput');
            const microphones = devices.filter(d => d.kind === 'audioinput');
            setAvailableDevices({ cameras, microphones });
            if (cameras.length > 0 && !selectedCamera) {
                setSelectedCamera(cameras[0].deviceId);
            }
            if (microphones.length > 0 && !selectedMicrophone) {
                setSelectedMicrophone(microphones[0].deviceId);
            }
        } catch (err) {
            console.error("Failed to enumerate media devices", err);
        }
    };

    useEffect(() => {
        refreshDevices();
        navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
        return () => {
            navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
        };
    }, []);

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

    // Switch Camera Device
    const switchCamera = async (deviceId) => {
        if (deviceId) setSelectedCamera(deviceId);
        try {
            if (!streamRef.current) {
                streamRef.current = new MediaStream();
            }
            const oldTracks = streamRef.current.getVideoTracks();
            oldTracks.forEach(track => {
                track.stop();
                streamRef.current.removeTrack(track);
            });

            const constraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : true
            };
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            const newVideoTrack = newStream.getVideoTracks()[0];
            if (newVideoTrack) {
                streamRef.current.addTrack(newVideoTrack);
                setHasCamera(true);
                if (videoPreviewRef.current) {
                    videoPreviewRef.current.srcObject = streamRef.current;
                }
                refreshDevices();
            }
        } catch (err) {
            console.error("Failed to switch camera", err);
            toast.error("Failed to access selected camera");
        }
    };

    // Switch Microphone Device
    const switchMicrophone = async (deviceId) => {
        if (deviceId) setSelectedMicrophone(deviceId);
        try {
            if (!streamRef.current) {
                streamRef.current = new MediaStream();
            }
            const oldTracks = streamRef.current.getAudioTracks();
            oldTracks.forEach(track => {
                track.stop();
                streamRef.current.removeTrack(track);
            });
            stopAudioAnalysis();

            const constraints = {
                audio: deviceId ? { deviceId: { exact: deviceId } } : true
            };
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            const newAudioTrack = newStream.getAudioTracks()[0];
            if (newAudioTrack) {
                streamRef.current.addTrack(newAudioTrack);
                setHasMic(true);
                startAudioAnalysis(newStream);
                refreshDevices();
            }
        } catch (err) {
            console.error("Failed to switch microphone", err);
            toast.error("Failed to access selected microphone");
        }
    };

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
            await switchCamera(selectedCamera);
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
            await switchMicrophone(selectedMicrophone);
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

                // Helper for text wrapping on canvas
                const drawWrappedText = (ctx, text, x, y, maxWidth, lineHeight, maxLines = 10) => {
                    const words = String(text || '').split(' ');
                    let line = '';
                    let currentY = y;
                    let lineCount = 0;
                    for (let n = 0; n < words.length; n++) {
                        const testLine = line + words[n] + ' ';
                        const metrics = ctx.measureText(testLine);
                        if (metrics.width > maxWidth && n > 0) {
                            ctx.fillText(line, x, currentY);
                            line = words[n] + ' ';
                            currentY += lineHeight;
                            lineCount++;
                            if (lineCount >= maxLines) break;
                        } else {
                            line = testLine;
                        }
                    }
                    if (lineCount < maxLines && line) {
                        ctx.fillText(line, x, currentY);
                    }
                };

                // Draw shape objects (Rectangles, Circles, Polygons, Connectors, Sticky Notes, Lines, Graphs, Rulers)
                shapeObjectsRef.current.forEach(shpObj => {
                    compositeCtx.save();

                    // 1. Sticky Note Card rendering
                    if (shpObj.type === 'sticky_note') {
                        compositeCtx.translate(shpObj.x, shpObj.y);
                        if (shpObj.rotation) {
                            compositeCtx.translate(shpObj.width / 2, shpObj.height / 2);
                            compositeCtx.rotate(shpObj.rotation * Math.PI / 180);
                            compositeCtx.translate(-shpObj.width / 2, -shpObj.height / 2);
                        }
                        const noteW = shpObj.width || 200;
                        const noteH = shpObj.height || 200;
                        const noteColor = shpObj.fillColor || shpObj.color || '#fef08a';

                        // Card Body with rounded corners
                        compositeCtx.fillStyle = noteColor;
                        compositeCtx.shadowColor = 'rgba(0,0,0,0.18)';
                        compositeCtx.shadowBlur = 10;
                        compositeCtx.shadowOffsetY = 4;
                        compositeCtx.beginPath();
                        if (compositeCtx.roundRect) {
                            compositeCtx.roundRect(0, 0, noteW, noteH, 12);
                        } else {
                            compositeCtx.rect(0, 0, noteW, noteH);
                        }
                        compositeCtx.fill();
                        compositeCtx.shadowColor = 'transparent';

                        // Subtle border
                        compositeCtx.strokeStyle = 'rgba(0,0,0,0.12)';
                        compositeCtx.lineWidth = 1;
                        compositeCtx.stroke();

                        // Header strip
                        compositeCtx.fillStyle = 'rgba(0,0,0,0.06)';
                        compositeCtx.fillRect(0, 0, noteW, 26);

                        // Pin Indicator
                        compositeCtx.fillStyle = '#ef4444';
                        compositeCtx.beginPath();
                        compositeCtx.arc(noteW / 2, 13, 4, 0, 2 * Math.PI);
                        compositeCtx.fill();

                        // Title & Text
                        compositeCtx.fillStyle = '#1e293b';
                        compositeCtx.textAlign = 'left';
                        compositeCtx.textBaseline = 'top';
                        let textOffsetY = 34;

                        if (shpObj.title) {
                            compositeCtx.font = "bold 13px 'Inter', sans-serif";
                            compositeCtx.fillText(shpObj.title, 12, textOffsetY);
                            textOffsetY += 20;
                        }

                        if (shpObj.text) {
                            compositeCtx.font = "12px 'Inter', sans-serif";
                            drawWrappedText(compositeCtx, shpObj.text, 12, textOffsetY, noteW - 24, 16, 8);
                        }
                        compositeCtx.restore();
                        return;
                    }

                    // 2. Smart Connector Line rendering
                    if (shpObj.type === 'connector') {
                        let startX = shpObj.startX || 0;
                        let startY = shpObj.startY || 0;
                        let endX = shpObj.endX || 0;
                        let endY = shpObj.endY || 0;

                        // Resolve shape anchors if bound to shapes
                        if (shpObj.sourceId) {
                            const srcShape = shapeObjectsRef.current.find(s => s.id === shpObj.sourceId);
                            if (srcShape) {
                                startX = srcShape.x + (srcShape.width || 100) / 2;
                                startY = srcShape.y + (srcShape.height || 100) / 2;
                            }
                        }
                        if (shpObj.targetId) {
                            const tgtShape = shapeObjectsRef.current.find(s => s.id === shpObj.targetId);
                            if (tgtShape) {
                                endX = tgtShape.x + (tgtShape.width || 100) / 2;
                                endY = tgtShape.y + (tgtShape.height || 100) / 2;
                            }
                        }

                        compositeCtx.strokeStyle = shpObj.color || '#3b82f6';
                        compositeCtx.lineWidth = shpObj.strokeWidth || 2;
                        compositeCtx.lineCap = 'round';
                        compositeCtx.lineJoin = 'round';

                        if (shpObj.borderStyle === 'dashed' || shpObj.lineStyle === 'dashed') {
                            compositeCtx.setLineDash([6, 6]);
                        } else if (shpObj.borderStyle === 'dotted' || shpObj.lineStyle === 'dotted') {
                            compositeCtx.setLineDash([2, 4]);
                        } else {
                            compositeCtx.setLineDash([]);
                        }

                        compositeCtx.beginPath();
                        compositeCtx.moveTo(startX, startY);

                        const connType = shpObj.connectorType || 'orthogonal';
                        if (connType === 'orthogonal') {
                            // Elbow stepped path
                            const midX = (startX + endX) / 2;
                            compositeCtx.lineTo(midX, startY);
                            compositeCtx.lineTo(midX, endY);
                            compositeCtx.lineTo(endX, endY);
                        } else if (connType === 'curved') {
                            const dx = endX - startX;
                            const dy = endY - startY;
                            const cp1X = startX + dx * 0.2;
                            const cp1Y = startY + dy * 0.8;
                            compositeCtx.quadraticCurveTo(cp1X, cp1Y, endX, endY);
                        } else {
                            compositeCtx.lineTo(endX, endY);
                        }
                        compositeCtx.stroke();

                        // Arrowheads ensuring upright orientation at vertical anchors
                        const drawArrowHeadAtEndpoint = (x, y, angleDeg) => {
                            const rad = (angleDeg * Math.PI) / 180;
                            const headLen = Math.max(10, (shpObj.strokeWidth || 2) * 4);
                            compositeCtx.beginPath();
                            compositeCtx.moveTo(x, y);
                            compositeCtx.lineTo(x - headLen * Math.cos(rad - Math.PI / 6), y - headLen * Math.sin(rad - Math.PI / 6));
                            compositeCtx.lineTo(x - headLen * Math.cos(rad + Math.PI / 6), y - headLen * Math.sin(rad + Math.PI / 6));
                            compositeCtx.closePath();
                            compositeCtx.fillStyle = shpObj.color || '#3b82f6';
                            compositeCtx.fill();
                        };

                        const connPathStyle = shpObj.connectorType || shpObj.pathType || 'orthogonal';
                        if (shpObj.arrowEnd === 'arrow') {
                            const tgtAngle = getConnectorArrowAngle(
                                'target',
                                { x: startX, y: startY },
                                { x: endX, y: endY },
                                connPathStyle,
                                shpObj.waypoint,
                                shpObj.sourceAnchor,
                                shpObj.targetAnchor
                            );
                            drawArrowHeadAtEndpoint(endX, endY, tgtAngle);
                        }
                        if (shpObj.arrowStart === 'arrow') {
                            const srcAngle = getConnectorArrowAngle(
                                'source',
                                { x: startX, y: startY },
                                { x: endX, y: endY },
                                connPathStyle,
                                shpObj.waypoint,
                                shpObj.sourceAnchor,
                                shpObj.targetAnchor
                            );
                            drawArrowHeadAtEndpoint(startX, startY, srcAngle);
                        }

                        compositeCtx.restore();
                        return;
                    }

                    // 3. Standard Geometric Shapes (Rectangle, Circle, Triangle, Diamond, Hexagon, Star, Cloud, Arc, Lines, Graphs, Rulers)
                    compositeCtx.translate(shpObj.x, shpObj.y);
                    if (shpObj.rotation) {
                        compositeCtx.translate(shpObj.width / 2, shpObj.height / 2);
                        compositeCtx.rotate(shpObj.rotation * Math.PI / 180);
                        compositeCtx.translate(-shpObj.width / 2, -shpObj.height / 2);
                    }
                    compositeCtx.strokeStyle = shpObj.color;
                    compositeCtx.lineWidth = shpObj.strokeWidth || 2;
                    compositeCtx.fillStyle = shpObj.fillColor || 'transparent';

                    // Apply Border Styles: solid, dashed, dotted
                    const bStyle = shpObj.borderStyle || 'solid';
                    if (bStyle === 'dashed') {
                        compositeCtx.setLineDash([Math.max(6, (shpObj.strokeWidth || 2) * 3), Math.max(4, (shpObj.strokeWidth || 2) * 2)]);
                    } else if (bStyle === 'dotted') {
                        compositeCtx.setLineDash([Math.max(2, shpObj.strokeWidth || 2), Math.max(3, (shpObj.strokeWidth || 2) * 1.5)]);
                    } else {
                        compositeCtx.setLineDash([]);
                    }

                    compositeCtx.beginPath();
                    if (shpObj.type === 'rectangle') {
                        compositeCtx.rect(0, 0, shpObj.width, shpObj.height);
                    } else if (shpObj.type === 'rounded_rect') {
                        const r = Math.min(20, shpObj.width / 4, shpObj.height / 4);
                        if (compositeCtx.roundRect) compositeCtx.roundRect(0, 0, shpObj.width, shpObj.height, r);
                        else compositeCtx.rect(0, 0, shpObj.width, shpObj.height);
                    } else if (shpObj.type === 'circle') {
                        compositeCtx.ellipse(shpObj.width / 2, shpObj.height / 2, Math.abs(shpObj.width / 2), Math.abs(shpObj.height / 2), 0, 0, 2 * Math.PI);
                    } else if (shpObj.type === 'triangle') {
                        compositeCtx.moveTo(shpObj.width / 2, 0);
                        compositeCtx.lineTo(0, shpObj.height);
                        compositeCtx.lineTo(shpObj.width, shpObj.height);
                        compositeCtx.closePath();
                    } else if (shpObj.type === 'diamond') {
                        const w = shpObj.width, h = shpObj.height;
                        compositeCtx.moveTo(w / 2, 0);
                        compositeCtx.lineTo(w, h / 2);
                        compositeCtx.lineTo(w / 2, h);
                        compositeCtx.lineTo(0, h / 2);
                        compositeCtx.closePath();
                    } else if (shpObj.type === 'hexagon') {
                        const w = shpObj.width, h = shpObj.height;
                        compositeCtx.moveTo(w * 0.25, 0);
                        compositeCtx.lineTo(w * 0.75, 0);
                        compositeCtx.lineTo(w, h * 0.5);
                        compositeCtx.lineTo(w * 0.75, h);
                        compositeCtx.lineTo(w * 0.25, h);
                        compositeCtx.lineTo(0, h * 0.5);
                        compositeCtx.closePath();
                    } else if (shpObj.type === 'polygon' && shpObj.points && shpObj.points.length >= 3) {
                        const pts = shpObj.points;
                        const ox = shpObj.x || 0;
                        const oy = shpObj.y || 0;
                        compositeCtx.moveTo(pts[0].x - ox, pts[0].y - oy);
                        for (let i = 1; i < pts.length; i++) {
                            compositeCtx.lineTo(pts[i].x - ox, pts[i].y - oy);
                        }
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
                    } else if (shpObj.type === 'cloud') {
                        const w = shpObj.width, h = shpObj.height;
                        compositeCtx.moveTo(w * 0.2, h * 0.7);
                        compositeCtx.bezierCurveTo(w * 0.05, h * 0.7, w * 0.05, h * 0.4, w * 0.2, h * 0.4);
                        compositeCtx.bezierCurveTo(w * 0.2, h * 0.15, w * 0.45, h * 0.15, w * 0.5, h * 0.35);
                        compositeCtx.bezierCurveTo(w * 0.6, h * 0.2, w * 0.85, h * 0.2, w * 0.85, h * 0.45);
                        compositeCtx.bezierCurveTo(w * 0.98, h * 0.5, w * 0.98, h * 0.7, w * 0.85, h * 0.7);
                        compositeCtx.closePath();
                    } else if (shpObj.type === 'arc' || shpObj.type === 'curved_line') {
                        compositeCtx.moveTo(0, shpObj.height);
                        compositeCtx.quadraticCurveTo(shpObj.width / 2, 0, shpObj.width, shpObj.height);
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
                        compositeCtx.moveTo(shpObj.startX ?? 0, shpObj.startY ?? 0);
                        compositeCtx.lineTo(shpObj.endX ?? shpObj.width, shpObj.endY ?? shpObj.height);
                        compositeCtx.lineCap = 'round';
                    } else if (shpObj.type === 'dashed_line') {
                        compositeCtx.setLineDash([6, 6]);
                        compositeCtx.moveTo(shpObj.startX ?? 0, shpObj.startY ?? 0);
                        compositeCtx.lineTo(shpObj.endX ?? shpObj.width, shpObj.endY ?? shpObj.height);
                        compositeCtx.lineCap = 'round';
                    } else if (shpObj.type === 'arrow' || shpObj.type === 'double_arrow') {
                        const sx = shpObj.startX ?? 0;
                        const sy = shpObj.startY ?? 0;
                        const ex = shpObj.endX ?? shpObj.width;
                        const ey = shpObj.endY ?? shpObj.height;
                        compositeCtx.moveTo(sx, sy);
                        compositeCtx.lineTo(ex, ey);
                        compositeCtx.stroke();

                        // Arrowhead helper
                        const drawHead = (fromX, fromY, toX, toY) => {
                            const angle = Math.atan2(toY - fromY, toX - fromX);
                            const headLength = Math.max(10, (shpObj.strokeWidth || 2) * 4);
                            compositeCtx.beginPath();
                            compositeCtx.moveTo(toX, toY);
                            compositeCtx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
                            compositeCtx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
                            compositeCtx.closePath();
                            compositeCtx.fillStyle = shpObj.color;
                            compositeCtx.fill();
                        };
                        drawHead(sx, sy, ex, ey);
                        if (shpObj.type === 'double_arrow') {
                            drawHead(ex, ey, sx, sy);
                        }
                        compositeCtx.beginPath();
                    } else if (shpObj.type === 'graph') {
                        // Background
                        compositeCtx.rect(0, 0, shpObj.width, shpObj.height);
                        if (shpObj.fillColor) compositeCtx.fill();
                        
                        // Grid lines
                        compositeCtx.beginPath();
                        compositeCtx.lineWidth = Math.max(0.5, shpObj.strokeWidth * 0.3);
                        compositeCtx.setLineDash([4, 4]);
                        compositeCtx.globalAlpha = 0.4;
                        for(let i=0; i<9; i++) {
                            compositeCtx.moveTo(shpObj.width/10, shpObj.height/10 + (shpObj.height*0.8) * (i/8));
                            compositeCtx.lineTo(shpObj.width*0.9, shpObj.height/10 + (shpObj.height*0.8) * (i/8));
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
                        compositeCtx.stroke();
                    }

                    if (shpObj.type !== 'graph' && !['line', 'dashed_line', 'arrow', 'double_arrow'].includes(shpObj.type)) {
                        if (shpObj.fillColor && shpObj.fillColor !== 'transparent') compositeCtx.fill();
                    }
                    compositeCtx.stroke();

                    // Double border style support
                    if (bStyle === 'double' && ['rectangle', 'circle', 'rounded_rect', 'diamond', 'triangle'].includes(shpObj.type)) {
                        compositeCtx.save();
                        const inset = Math.max(3, (shpObj.strokeWidth || 2) * 1.5);
                        compositeCtx.lineWidth = Math.max(1, Math.round((shpObj.strokeWidth || 2) * 0.5));
                        compositeCtx.beginPath();
                        if (shpObj.type === 'rectangle') {
                            if (shpObj.width > inset * 2 && shpObj.height > inset * 2) {
                                compositeCtx.rect(inset, inset, shpObj.width - inset * 2, shpObj.height - inset * 2);
                            }
                        } else if (shpObj.type === 'circle') {
                            const rx = shpObj.width / 2 - inset;
                            const ry = shpObj.height / 2 - inset;
                            if (rx > 0 && ry > 0) {
                                compositeCtx.ellipse(shpObj.width / 2, shpObj.height / 2, rx, ry, 0, 0, 2 * Math.PI);
                            }
                        }
                        compositeCtx.stroke();
                        compositeCtx.restore();
                    }
                    
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

                // Draw 3D Objects Layer (3D perspective mesh projection, normals, lighting, shading, wireframe)
                threeDObjectsRef.current.forEach(obj3d => {
                    try {
                        const mesh = (obj3d.meshData && obj3d.meshData.vertices && obj3d.meshData.faces)
                            ? obj3d.meshData
                            : get3DModelMesh(obj3d.modelType || 'cube');
                        if (!mesh || !mesh.vertices || !mesh.faces) return;

                        const rotX = obj3d.rotX ?? -25;
                        const rotY = obj3d.rotY ?? 45;
                        const rotZ = obj3d.rotZ ?? 0;
                        const radX = (rotX * Math.PI) / 180;
                        const radY = (rotY * Math.PI) / 180;
                        const radZ = (rotZ * Math.PI) / 180;
                        const cosX = Math.cos(radX), sinX = Math.sin(radX);
                        const cosY = Math.cos(radY), sinY = Math.sin(radY);
                        const cosZ = Math.cos(radZ), sinZ = Math.sin(radZ);

                        let lx = 0.5, ly = -0.7, lz = 0.5;
                        if (obj3d.lightPreset === 'top') { lx = 0.1; ly = -0.95; lz = 0.3; }
                        else if (obj3d.lightPreset === 'flat') { lx = 0; ly = 0; lz = 1; }

                        const w = obj3d.width || 220;
                        const h = obj3d.height || 220;

                        const transformedVertices = mesh.vertices.map(([vx, vy, vz]) => {
                            let x1 = vx * cosY + vz * sinY;
                            let y1 = vy;
                            let z1 = -vx * sinY + vz * cosY;

                            let x2 = x1;
                            let y2 = y1 * cosX - z1 * sinX;
                            let z2 = y1 * sinX + z1 * cosX;

                            let x3 = x2 * cosZ - y2 * sinZ;
                            let y3 = x2 * sinZ + y2 * cosZ;
                            let z3 = z2;

                            const distance = 4;
                            const factor = distance / (distance + z3);
                            const scale = (Math.min(w, h) / 2) * 0.75;
                            const px = w / 2 + x3 * factor * scale;
                            const py = h / 2 + y3 * factor * scale;
                            return { px, py, pz: z3, x3, y3, z3 };
                        });

                        const baseColor = obj3d.color || mesh.color || '#3b82f6';
                        const isWireframe = obj3d.materialStyle === 'wireframe' || !!obj3d.wireframeOnly;
                        const isFlat = obj3d.materialStyle === 'flat';
                        const userOpacity = obj3d.opacity !== undefined ? obj3d.opacity : 1;

                        const renderedFaces = mesh.faces.map(faceIndices => {
                            if (faceIndices.length < 3) return null;
                            const v0 = transformedVertices[faceIndices[0]];
                            const v1 = transformedVertices[faceIndices[1]];
                            const v2 = transformedVertices[faceIndices[2]];
                            if (!v0 || !v1 || !v2) return null;

                            const ax = v1.x3 - v0.x3, ay = v1.y3 - v0.y3, az = v1.z3 - v0.z3;
                            const bx = v2.x3 - v0.x3, by = v2.y3 - v0.y3, bz = v2.z3 - v0.z3;
                            const nx = ay * bz - az * by;
                            const ny = az * bx - ax * bz;
                            const nz = ax * by - ay * bx;
                            const len = Math.hypot(nx, ny, nz) || 1;
                            const nnx = nx / len, nny = ny / len, nnz = nz / len;

                            const dot = nnx * lx + nny * ly + nnz * lz;
                            const effDot = nnz < 0 ? -dot : dot;
                            const intensity = isFlat ? 1.0 : Math.max(0.25, Math.min(1.0, effDot));
                            const avgZ = faceIndices.reduce((sum, idx) => sum + (transformedVertices[idx]?.pz || 0), 0) / faceIndices.length;

                            let faceFill = shadeColor(baseColor, intensity, obj3d.materialStyle);
                            return { faceIndices, avgZ, faceFill, userOpacity };
                        }).filter(Boolean);

                        renderedFaces.sort((a, b) => b.avgZ - a.avgZ);

                        compositeCtx.save();
                        compositeCtx.translate(obj3d.x || 0, obj3d.y || 0);
                        if (obj3d.rotation) {
                            compositeCtx.translate(w / 2, h / 2);
                            compositeCtx.rotate((obj3d.rotation * Math.PI) / 180);
                            compositeCtx.translate(-w / 2, -h / 2);
                        }

                        renderedFaces.forEach(f => {
                            compositeCtx.beginPath();
                            f.faceIndices.forEach((idx, i) => {
                                const pt = transformedVertices[idx];
                                if (i === 0) compositeCtx.moveTo(pt.px, pt.py);
                                else compositeCtx.lineTo(pt.px, pt.py);
                            });
                            compositeCtx.closePath();

                            if (!isWireframe) {
                                compositeCtx.fillStyle = f.faceFill;
                                compositeCtx.globalAlpha = f.userOpacity;
                                compositeCtx.fill();
                            }
                            compositeCtx.strokeStyle = baseColor;
                            compositeCtx.lineWidth = 1;
                            compositeCtx.globalAlpha = isWireframe ? 0.9 : 0.4;
                            compositeCtx.stroke();
                        });

                        compositeCtx.restore();
                    } catch (e) {
                        console.error("Failed to render 3D object to composite recording", e);
                    }
                });

                // Draw Embedded Media Players Layer (Videos, Audio, Embeds)
                mediaObjectsRef.current.forEach(mObj => {
                    try {
                        compositeCtx.save();
                        compositeCtx.translate(mObj.x || 0, mObj.y || 0);
                        const mW = mObj.width || 480;
                        const mH = mObj.height || 300;

                        // Check if an active HTML <video> tag is present in the document
                        const videoElement = document.querySelector(`.whiteboard-media-player video`);
                        if (videoElement && videoElement.readyState >= 2 && !videoElement.paused) {
                            compositeCtx.drawImage(videoElement, 0, 0, mW, mH);
                        } else {
                            // Render sleek media player frame
                            compositeCtx.fillStyle = '#090d16';
                            compositeCtx.beginPath();
                            if (compositeCtx.roundRect) compositeCtx.roundRect(0, 0, mW, mH, 12);
                            else compositeCtx.rect(0, 0, mW, mH);
                            compositeCtx.fill();
                            compositeCtx.strokeStyle = '#334155';
                            compositeCtx.lineWidth = 2;
                            compositeCtx.stroke();

                            // Player Header
                            compositeCtx.fillStyle = '#1e293b';
                            compositeCtx.fillRect(0, 0, mW, 32);
                            compositeCtx.fillStyle = '#f8fafc';
                            compositeCtx.font = "bold 12px 'Inter', sans-serif";
                            compositeCtx.textAlign = 'left';
                            compositeCtx.textBaseline = 'middle';
                            compositeCtx.fillText(mObj.title || 'Embedded Media Player', 12, 16);

                            // Center Play Icon
                            compositeCtx.fillStyle = '#6366f1';
                            compositeCtx.beginPath();
                            compositeCtx.arc(mW / 2, mH / 2, 22, 0, 2 * Math.PI);
                            compositeCtx.fill();
                            compositeCtx.fillStyle = '#ffffff';
                            compositeCtx.beginPath();
                            compositeCtx.moveTo(mW / 2 - 5, mH / 2 - 9);
                            compositeCtx.lineTo(mW / 2 + 9, mH / 2);
                            compositeCtx.lineTo(mW / 2 - 5, mH / 2 + 9);
                            compositeCtx.closePath();
                            compositeCtx.fill();
                        }
                        compositeCtx.restore();
                    } catch (e) {
                        console.error("Failed to render media player to composite recording", e);
                    }
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
                    // Calculate bounds relative to the main canvas
                    const rect = mainCanvas.getBoundingClientRect();
                    
                    // position.x and position.y are relative to the viewport.
                    // We need them relative to the canvas origin.
                    const relativeX = position.x - rect.left;
                    const relativeY = (position.y + 44) - rect.top; // +44 for the toolbar height

                    const rawDrawX = relativeX * scaleX;
                    const rawDrawY = relativeY * scaleY;

                    // Clamp to make sure the video fits entirely inside the canvas bounds
                    const scaledVideoW = videoWidth * scaleX;
                    const scaledVideoH = videoHeight * scaleY;
                    const clampedDrawX = Math.max(0, Math.min(rawDrawX, width - scaledVideoW));
                    const clampedDrawY = Math.max(0, Math.min(rawDrawY, height - scaledVideoH));
                    
                    // We must respect the scale to match the video element's CSS
                    // Also, the video is horizontally flipped! `transform scale-x-[-1]`
                    compositeCtx.save();
                    // Move to the position
                    compositeCtx.translate(clampedDrawX + scaledVideoW, clampedDrawY);
                    compositeCtx.scale(-1, 1);
                    // Draw video
                    compositeCtx.drawImage(videoPreviewRef.current, 0, 0, scaledVideoW, scaledVideoH);
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
                const durationMs = recordingTimeRef.current * 1000;
                
                if (durationMs > 0) {
                    fixWebmDuration(blob, durationMs, async (fixedBlob) => {
                        await uploadRecording(fixedBlob);
                    });
                } else {
                    await uploadRecording(blob);
                }
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
            
        }
    };

    const uploadRecording = async (blob) => {
        try {
            setUploadProgress(0);
            
            // Convert Blob to File for upload API
            const file = new File([blob], `whiteboard_recording_${Date.now()}.webm`, {
                type: 'video/webm'
            });

            const formData = new FormData();
            formData.append('video', file);
            formData.append('title', `Whiteboard Lecture - ${formatDate(new Date())}`);
            if (sessionId) {
                formData.append('sessionId', sessionId);
            }
            formData.append('duration', recordingTimeRef.current);

            const localBlobUrl = URL.createObjectURL(blob);
            const localRec = {
                id: `local_rec_${Date.now()}`,
                title: `Whiteboard Lecture - ${formatDate(new Date())}`,
                duration: recordingTimeRef.current,
                videoUrl: localBlobUrl,
                createdAt: new Date().toISOString(),
                isLocal: true
            };

            // Save to localStorage cache so recordings show in Insert Media modal immediately
            try {
                const existing = JSON.parse(localStorage.getItem('whiteboard_local_recordings') || '[]');
                localStorage.setItem('whiteboard_local_recordings', JSON.stringify([
                    { id: localRec.id, title: localRec.title, duration: localRec.duration, videoUrl: localBlobUrl, createdAt: localRec.createdAt, isLocal: true },
                    ...existing.filter(e => e.id !== localRec.id)
                ].slice(0, 30)));
            } catch (e) {}

            try {
                const res = await api.post('/recordings/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percentCompleted);
                    }
                });
                setUploadProgress(null);

                if (res.data?.success) {
                    toast.success('Recording saved successfully!', { id: 'recording-upload' });
                    const savedData = res.data.data || res.data;
                    if (onRecordingComplete) {
                        onRecordingComplete(savedData);
                    }
                    try {
                        const existing = JSON.parse(localStorage.getItem('whiteboard_local_recordings') || '[]');
                        localStorage.setItem('whiteboard_local_recordings', JSON.stringify([
                            { id: savedData.id, title: savedData.title, duration: savedData.duration, videoUrl: savedData.cloudinaryUrl || savedData.videoUrl || localBlobUrl, createdAt: savedData.createdAt },
                            ...existing.filter(e => e.id !== savedData.id && e.id !== localRec.id)
                        ].slice(0, 30)));
                    } catch (e) {}
                } else {
                    throw new Error(res.data?.error || 'Upload failed');
                }
            } catch (uploadErr) {
                setUploadProgress(null);
                console.warn('Server upload not available, saved recording locally:', uploadErr);
                toast.success('Recording saved to local whiteboard session!', { id: 'recording-upload', icon: '🎥' });
                if (onRecordingComplete) {
                    onRecordingComplete(localRec);
                }
            }
        } catch (err) {
            setUploadProgress(null);
            console.error('Error handling recording:', err);
            toast.error('Failed to save recording');
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
            {uploadProgress !== null && (
                <div className="absolute -top-8 left-0 right-0 bg-slate-800 rounded-full shadow-lg border border-slate-700/50 p-1 flex items-center gap-2 px-3 overflow-hidden">
                    <div className="text-xs text-primary-400 font-medium whitespace-nowrap">Uploading</div>
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary-500 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                    <div className="text-xs text-slate-400">{uploadProgress}%</div>
                </div>
            )}
            {/* Recording Controls */}
            <div className="bg-slate-800/95 backdrop-blur-md px-2 py-1 rounded-full shadow-xl border border-slate-700/50 flex items-center gap-1">
                <div className="px-1 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4" />
                </div>
                {/* Microphone Controls with Dropdown */}
                <div className="relative flex items-center bg-slate-700/50 rounded-full">
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={toggleMic}
                        className={`p-1.5 rounded-l-full transition-all ${hasMic ? 'text-slate-200 hover:bg-slate-700' : 'text-red-400 hover:bg-red-500/20 bg-red-500/10'}`}
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
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setShowMicMenu(!showMicMenu); setShowCamMenu(false); }}
                        className="px-1 py-1.5 rounded-r-full text-slate-400 hover:text-white border-l border-slate-600/40 hover:bg-slate-700 transition"
                        title="Select Microphone"
                    >
                        <ChevronUp className={`w-3 h-3 transition-transform ${showMicMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Microphone Device Menu Dropdown */}
                    {showMicMenu && (
                        <div 
                            className="absolute bottom-[125%] left-0 w-56 bg-slate-900/98 backdrop-blur-md border border-slate-700 rounded-xl p-2 shadow-2xl z-[120] animate-in fade-in zoom-in-95 pointer-events-auto"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-2 flex items-center justify-between">
                                <span>Microphones</span>
                                <span className="text-[9px] text-slate-500">{availableDevices.microphones.length} available</span>
                            </div>
                            <div className="space-y-1 max-h-44 overflow-y-auto">
                                {availableDevices.microphones.length === 0 ? (
                                    <div className="px-2 py-1.5 text-xs text-slate-400 italic">No microphones found</div>
                                ) : (
                                    availableDevices.microphones.map((m, idx) => {
                                        const isSelected = selectedMicrophone === m.deviceId;
                                        return (
                                            <button
                                                key={m.deviceId || idx}
                                                onClick={() => { switchMicrophone(m.deviceId); setShowMicMenu(false); }}
                                                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition truncate flex items-center justify-between gap-1.5 ${isSelected ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-300 hover:bg-slate-800'}`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0 truncate">
                                                    <Mic className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                                    <span className="truncate">{m.label || `Microphone ${idx + 1}`}</span>
                                                </div>
                                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Camera Controls with Dropdown */}
                <div className="relative flex items-center bg-slate-700/50 rounded-full">
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={toggleCamera}
                        className={`p-1.5 rounded-l-full transition-all ${hasCamera ? 'text-slate-200 hover:bg-slate-700' : 'text-red-400 hover:bg-red-500/20 bg-red-500/10'}`}
                        title={hasCamera ? 'Turn Camera Off' : 'Turn Camera On'}
                    >
                        {hasCamera ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </button>
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setShowCamMenu(!showCamMenu); setShowMicMenu(false); }}
                        className="px-1 py-1.5 rounded-r-full text-slate-400 hover:text-white border-l border-slate-600/40 hover:bg-slate-700 transition"
                        title="Select Camera"
                    >
                        <ChevronUp className={`w-3 h-3 transition-transform ${showCamMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Camera Device Menu Dropdown */}
                    {showCamMenu && (
                        <div 
                            className="absolute bottom-[125%] left-0 w-56 bg-slate-900/98 backdrop-blur-md border border-slate-700 rounded-xl p-2 shadow-2xl z-[120] animate-in fade-in zoom-in-95 pointer-events-auto"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-2 flex items-center justify-between">
                                <span>Cameras</span>
                                <span className="text-[9px] text-slate-500">{availableDevices.cameras.length} available</span>
                            </div>
                            <div className="space-y-1 max-h-44 overflow-y-auto">
                                {availableDevices.cameras.length === 0 ? (
                                    <div className="px-2 py-1.5 text-xs text-slate-400 italic">No cameras found</div>
                                ) : (
                                    availableDevices.cameras.map((c, idx) => {
                                        const isSelected = selectedCamera === c.deviceId;
                                        return (
                                            <button
                                                key={c.deviceId || idx}
                                                onClick={() => { switchCamera(c.deviceId); setShowCamMenu(false); }}
                                                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition truncate flex items-center justify-between gap-1.5 ${isSelected ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-300 hover:bg-slate-800'}`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0 truncate">
                                                    <Camera className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                                    <span className="truncate">{c.label || `Camera ${idx + 1}`}</span>
                                                </div>
                                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="w-px h-5 bg-slate-700 mx-1"></div>
                
                {isRecording ? (
                    <>
                        <div className={`text-red-500 text-xs font-mono font-medium mx-2 flex items-center gap-2 ${isPaused ? 'animate-pulse opacity-75' : ''}`}>
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

