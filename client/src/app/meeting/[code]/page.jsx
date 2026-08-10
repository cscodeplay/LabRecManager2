'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Video, VideoOff, Mic, MicOff, Phone,
    MessageSquare, Clock, User, Send, CheckCircle, XCircle,
    Maximize2, Minimize2, Download, Save, Volume2, VolumeX,
    Settings, Sliders, MonitorUp, Pencil, Users, ChevronUp,
    ChevronDown, Eye, EyeOff, Radio, Sparkles, Pause, Play,
    GripVertical, Move
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { meetingAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import Whiteboard from '@/components/Whiteboard';
import VideoTile from '@/components/VideoTile';

export default function MeetingRoomPage() {
    const router = useRouter();
    const params = useParams();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    // Session & Connection state
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessionStatus, setSessionStatus] = useState('connecting');
    const [elapsedTime, setElapsedTime] = useState(0);
    const [mySocketId, setMySocketId] = useState('');

    // Local Media state
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);

    // Multi-Device Mesh Remote Participants Map: socketId -> participant info
    const [remoteParticipants, setRemoteParticipants] = useState(new Map());
    const [pinnedSocketId, setPinnedSocketId] = useState(null);

    // Layout & Overlay Controls (Zoom-style floating panels)
    const [showWhiteboard, setShowWhiteboard] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showDeviceSettings, setShowDeviceSettings] = useState(false);
    const [showAudioSettings, setShowAudioSettings] = useState(false);
    const [isVideoPaletteMinimized, setIsVideoPaletteMinimized] = useState(false);
    const [isControlsHidden, setIsControlsHidden] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Draggable positions
    const [videoPalettePos, setVideoPalettePos] = useState({ x: null, y: 20 });
    const isDraggingVideoPalette = useRef(false);
    const videoPaletteDragOffset = useRef({ x: 0, y: 0 });

    const [chatPos, setChatPos] = useState({ x: null, y: null });
    const isDraggingChat = useRef(false);
    const chatDragOffset = useRef({ x: 0, y: 0 });

    // Video Palette drag handlers
    const handleVideoPalettePointerDown = (e) => {
        e.stopPropagation();
        isDraggingVideoPalette.current = true;
        const currentX = videoPalettePos.x !== null ? videoPalettePos.x : (window.innerWidth - 220);
        const currentY = videoPalettePos.y;
        videoPaletteDragOffset.current = {
            x: e.clientX - currentX,
            y: e.clientY - currentY
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handleVideoPalettePointerMove = (e) => {
        if (!isDraggingVideoPalette.current) return;
        const newX = Math.max(10, Math.min(window.innerWidth - 210, e.clientX - videoPaletteDragOffset.current.x));
        const newY = Math.max(10, Math.min(window.innerHeight - 180, e.clientY - videoPaletteDragOffset.current.y));
        setVideoPalettePos({ x: newX, y: newY });
    };

    const handleVideoPalettePointerUp = () => {
        isDraggingVideoPalette.current = false;
    };

    // Chat drag handlers
    const handleChatPointerDown = (e) => {
        e.stopPropagation();
        isDraggingChat.current = true;
        const currentX = chatPos.x !== null ? chatPos.x : (window.innerWidth - 400);
        const currentY = chatPos.y !== null ? chatPos.y : (window.innerHeight - 560);
        chatDragOffset.current = {
            x: e.clientX - currentX,
            y: e.clientY - currentY
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handleChatPointerMove = (e) => {
        if (!isDraggingChat.current) return;
        const newX = Math.max(10, Math.min(window.innerWidth - 360, e.clientX - chatDragOffset.current.x));
        const newY = Math.max(10, Math.min(window.innerHeight - 490, e.clientY - chatDragOffset.current.y));
        setChatPos({ x: newX, y: newY });
    };

    const handleChatPointerUp = () => {
        isDraggingChat.current = false;
    };

    // Chat state
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadChatCount, setUnreadChatCount] = useState(0);

    // Device selection state
    const [availableDevices, setAvailableDevices] = useState({ cameras: [], microphones: [], speakers: [] });
    const [selectedCamera, setSelectedCamera] = useState('');
    const [selectedMicrophone, setSelectedMicrophone] = useState('');
    const [micLevel, setMicLevel] = useState(0);
    const [speakerVolume, setSpeakerVolume] = useState(100);

    // In-Meeting Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [isRecordingPaused, setIsRecordingPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [showRecordingModal, setShowRecordingModal] = useState(false);

    // Refs
    const localStreamRef = useRef(null);
    const socketRef = useRef(null);
    const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);
    const sessionTimerRef = useRef(null);
    const chatContainerRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const micAnimFrameRef = useRef(null);

    const isInstructor = user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'lab_assistant';

    // Standard STUN servers for WebRTC mesh
    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
        ]
    };

    // ===========================================
    // 1. INITIALIZATION & LIFECYCLE
    // ===========================================
    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadSession();
        return () => cleanup();
    }, [isAuthenticated, params.code]);

    // Timer & Status updates
    useEffect(() => {
        if (session && sessionStatus === 'active') {
            sessionTimerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
        };
    }, [session, sessionStatus]);

    // Scroll chat to bottom
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Track fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const cleanup = () => {
        if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        if (micAnimFrameRef.current) cancelAnimationFrame(micAnimFrameRef.current);
        
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }

        peersRef.current.forEach((pc) => pc.close());
        peersRef.current.clear();

        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
        }
    };

    const loadSession = async () => {
        try {
            const res = await meetingAPI.getSession(params.code);
            const sessionData = res.data.data.session;
            setSession(sessionData);

            if (sessionData.status === 'completed') {
                toast.error('This meeting session has already ended');
                router.push('/meetings');
                return;
            }

            // Auto-join meeting
            await meetingAPI.joinSession(params.code);
            await initializeLocalMedia();
            initializeSocket();

            if (sessionData.status === 'in_progress') {
                setSessionStatus('active');
                if (sessionData.actualStartTime) {
                    const startTime = new Date(sessionData.actualStartTime);
                    const elapsed = Math.floor((new Date() - startTime) / 1000);
                    setElapsedTime(elapsed > 0 ? elapsed : 0);
                }
            } else {
                setSessionStatus('active');
            }
        } catch (error) {
            console.error('Load session error:', error);
            toast.error('Failed to load meeting session');
            router.push('/meetings');
        } finally {
            setLoading(false);
        }
    };

    // ===========================================
    // 2. LOCAL MEDIA & AUDIO MONITORING
    // ===========================================
    const initializeLocalMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });

            localStreamRef.current = stream;
            setLocalStream(stream);

            // Initially disable tracks until user clicks unmute/start video
            stream.getVideoTracks().forEach(track => { track.enabled = false; });
            stream.getAudioTracks().forEach(track => { track.enabled = false; });

            setupAudioAnalysis(stream);
            await enumerateDevices();
        } catch (error) {
            console.warn('Initial camera/mic access deferred:', error);
            // Fallback: create empty stream so mesh still functions
            const dummyStream = new MediaStream();
            localStreamRef.current = dummyStream;
            setLocalStream(dummyStream);
        }
    };

    const setupAudioAnalysis = (stream) => {
        try {
            const audioTrack = stream.getAudioTracks()[0];
            if (!audioTrack) return;

            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            audioContextRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.7;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateLevel = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const avg = sum / bufferLength;
                const normalized = Math.min(100, Math.round((avg / 128) * 100));
                setMicLevel(normalized);
                setIsLocalSpeaking(normalized > 18 && isAudioEnabled);

                micAnimFrameRef.current = requestAnimationFrame(updateLevel);
            };

            updateLevel();
        } catch (err) {
            console.error('Audio analysis setup error:', err);
        }
    };

    const enumerateDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(d => d.kind === 'videoinput');
            const microphones = devices.filter(d => d.kind === 'audioinput');
            const speakers = devices.filter(d => d.kind === 'audiooutput');

            setAvailableDevices({ cameras, microphones, speakers });

            if (cameras.length > 0 && !selectedCamera) setSelectedCamera(cameras[0].deviceId);
            if (microphones.length > 0 && !selectedMicrophone) setSelectedMicrophone(microphones[0].deviceId);
        } catch (err) {
            console.error('Enumerate devices error:', err);
        }
    };

    const toggleVideo = async () => {
        try {
            if (!localStreamRef.current || localStreamRef.current.getVideoTracks().length === 0) {
                // Request video stream if not present
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
                    audio: false
                });
                const newVideoTrack = stream.getVideoTracks()[0];
                localStreamRef.current.addTrack(newVideoTrack);
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

                // Update all peer connections
                peersRef.current.forEach((pc) => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(newVideoTrack);
                    } else {
                        pc.addTrack(newVideoTrack, localStreamRef.current);
                    }
                });
            }

            const videoTrack = localStreamRef.current?.getVideoTracks()[0];
            if (videoTrack) {
                const nextState = !videoTrack.enabled;
                videoTrack.enabled = nextState;
                setIsVideoEnabled(nextState);

                // Notify peers
                socketRef.current?.emit('meeting:media-toggle', {
                    roomId: params.code,
                    isCameraOn: nextState,
                    isMicOn: isAudioEnabled,
                    isScreenSharing
                });
            }
        } catch (error) {
            console.error('Toggle video error:', error);
            toast.error('Could not access camera');
        }
    };

    const toggleAudio = async () => {
        try {
            if (!localStreamRef.current || localStreamRef.current.getAudioTracks().length === 0) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: selectedMicrophone ? { deviceId: { exact: selectedMicrophone } } : true,
                    video: false
                });
                const newAudioTrack = stream.getAudioTracks()[0];
                localStreamRef.current.addTrack(newAudioTrack);
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

                setupAudioAnalysis(localStreamRef.current);

                peersRef.current.forEach((pc) => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                    if (sender) {
                        sender.replaceTrack(newAudioTrack);
                    } else {
                        pc.addTrack(newAudioTrack, localStreamRef.current);
                    }
                });
            }

            const audioTrack = localStreamRef.current?.getAudioTracks()[0];
            if (audioTrack) {
                const nextState = !audioTrack.enabled;
                audioTrack.enabled = nextState;
                setIsAudioEnabled(nextState);

                socketRef.current?.emit('meeting:media-toggle', {
                    roomId: params.code,
                    isCameraOn: isVideoEnabled,
                    isMicOn: nextState,
                    isScreenSharing
                });
            }
        } catch (error) {
            console.error('Toggle audio error:', error);
            toast.error('Could not access microphone');
        }
    };

    const switchCamera = async (deviceId) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: deviceId } },
                audio: false
            });
            const newTrack = stream.getVideoTracks()[0];
            const oldTrack = localStreamRef.current?.getVideoTracks()[0];

            if (oldTrack) {
                localStreamRef.current.removeTrack(oldTrack);
                oldTrack.stop();
            }
            if (localStreamRef.current) {
                localStreamRef.current.addTrack(newTrack);
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            }

            // Update mesh senders
            peersRef.current.forEach(async (pc) => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) await sender.replaceTrack(newTrack);
            });

            setSelectedCamera(deviceId);
            newTrack.enabled = isVideoEnabled;
            toast.success('Camera switched');
        } catch (error) {
            console.error('Error switching camera:', error);
            toast.error('Failed to switch camera');
        }
    };

    const switchMicrophone = async (deviceId) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: deviceId } },
                video: false
            });
            const newTrack = stream.getAudioTracks()[0];
            const oldTrack = localStreamRef.current?.getAudioTracks()[0];

            if (oldTrack) {
                localStreamRef.current.removeTrack(oldTrack);
                oldTrack.stop();
            }
            if (localStreamRef.current) {
                localStreamRef.current.addTrack(newTrack);
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            }

            peersRef.current.forEach(async (pc) => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                if (sender) await sender.replaceTrack(newTrack);
            });

            setupAudioAnalysis(localStreamRef.current);
            setSelectedMicrophone(deviceId);
            newTrack.enabled = isAudioEnabled;
            toast.success('Microphone switched');
        } catch (error) {
            console.error('Error switching microphone:', error);
            toast.error('Failed to switch microphone');
        }
    };

    const toggleScreenShare = async () => {
        try {
            if (isScreenSharing) {
                // Stop screen sharing -> revert to camera
                await switchCamera(selectedCamera || '');
                setIsScreenSharing(false);
                socketRef.current?.emit('meeting:media-toggle', {
                    roomId: params.code,
                    isCameraOn: isVideoEnabled,
                    isMicOn: isAudioEnabled,
                    isScreenSharing: false
                });
                toast.success('Screen share stopped');
            } else {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: 'always' },
                    audio: false
                });
                const screenTrack = screenStream.getVideoTracks()[0];
                const oldTrack = localStreamRef.current?.getVideoTracks()[0];

                screenTrack.onended = async () => {
                    await switchCamera(selectedCamera || '');
                    setIsScreenSharing(false);
                    socketRef.current?.emit('meeting:media-toggle', {
                        roomId: params.code,
                        isCameraOn: isVideoEnabled,
                        isMicOn: isAudioEnabled,
                        isScreenSharing: false
                    });
                };

                if (oldTrack) {
                    localStreamRef.current.removeTrack(oldTrack);
                    oldTrack.stop();
                }
                localStreamRef.current.addTrack(screenTrack);
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

                peersRef.current.forEach(async (pc) => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) await sender.replaceTrack(screenTrack);
                });

                setIsVideoEnabled(true);
                setIsScreenSharing(true);

                socketRef.current?.emit('meeting:media-toggle', {
                    roomId: params.code,
                    isCameraOn: true,
                    isMicOn: isAudioEnabled,
                    isScreenSharing: true
                });
                toast.success('Screen sharing started');
            }
        } catch (error) {
            console.error('Screen share error:', error);
            if (error.name !== 'NotAllowedError') {
                toast.error('Failed to start screen share');
            }
        }
    };

    // ===========================================
    // 3. MULTI-DEVICE WEBRTC MESH SIGNALING
    // ===========================================
    const createPeerConnection = useCallback((targetSocketId, isInitiator) => {
        if (peersRef.current.has(targetSocketId)) {
            return peersRef.current.get(targetSocketId);
        }

        const pc = new RTCPeerConnection(iceServers);
        peersRef.current.set(targetSocketId, pc);

        // Add local tracks to new peer connection
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        // Handle incoming remote media tracks
        pc.ontrack = (event) => {
            const remoteStream = event.streams[0] || new MediaStream([event.track]);
            setRemoteParticipants(prev => {
                const next = new Map(prev);
                const existing = next.get(targetSocketId) || { socketId: targetSocketId };
                next.set(targetSocketId, {
                    ...existing,
                    stream: remoteStream
                });
                return next;
            });
        };

        // Handle ICE Candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit('meeting:signal', {
                    targetSocketId,
                    signal: {
                        type: 'ice-candidate',
                        candidate: event.candidate
                    }
                });
            }
        };

        // Handle negotiation needed (when initiator adds tracks)
        if (isInitiator) {
            pc.onnegotiationneeded = async () => {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socketRef.current?.emit('meeting:signal', {
                        targetSocketId,
                        signal: {
                            type: 'offer',
                            sdp: offer
                        }
                    });
                } catch (err) {
                    console.error('Negotiation offer error:', err);
                }
            };
        }

        return pc;
    }, []);

    const initializeSocket = () => {
        const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const socket = io(socketUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setMySocketId(socket.id);
            socket.emit('meeting:join', {
                roomId: params.code,
                user: {
                    id: user?.id,
                    firstName: user?.firstName,
                    lastName: user?.lastName,
                    username: user?.username,
                    role: user?.role
                },
                isCameraOn: isVideoEnabled,
                isMicOn: isAudioEnabled,
                isScreenSharing
            });
        });

        // Received current list of peers in room
        socket.on('meeting:room-users', async ({ participants, yourSocketId }) => {
            setMySocketId(yourSocketId);
            const otherParticipants = (participants || []).filter(p => p.socketId !== yourSocketId);

            // Connect to each existing peer as an initiator
            otherParticipants.forEach(async (participant) => {
                setRemoteParticipants(prev => {
                    const next = new Map(prev);
                    next.set(participant.socketId, participant);
                    return next;
                });

                const pc = createPeerConnection(participant.socketId, true);
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit('meeting:signal', {
                        targetSocketId: participant.socketId,
                        signal: {
                            type: 'offer',
                            sdp: offer
                        }
                    });
                } catch (err) {
                    console.error('Error creating offer for peer:', participant.socketId, err);
                }
            });
        });

        // A new device / user joined the room
        socket.on('meeting:user-joined', ({ participant }) => {
            if (participant.socketId === socket.id) return;
            setRemoteParticipants(prev => {
                const next = new Map(prev);
                next.set(participant.socketId, participant);
                return next;
            });
            toast(`${participant.name} joined the meeting`, { icon: '👋', duration: 2500 });
        });

        // Direct WebRTC signaling packet received
        socket.on('meeting:signal', async ({ fromSocketId, signal }) => {
            if (!signal || !fromSocketId) return;

            try {
                if (signal.type === 'offer') {
                    const pc = createPeerConnection(fromSocketId, false);
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('meeting:signal', {
                        targetSocketId: fromSocketId,
                        signal: {
                            type: 'answer',
                            sdp: answer
                        }
                    });
                } else if (signal.type === 'answer') {
                    const pc = peersRef.current.get(fromSocketId);
                    if (pc && pc.signalingState !== 'stable') {
                        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    }
                } else if (signal.type === 'ice-candidate') {
                    const pc = peersRef.current.get(fromSocketId);
                    if (pc && signal.candidate) {
                        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
                    }
                }
            } catch (err) {
                console.error('Signal handling error:', err);
            }
        });

        // Remote peer media toggle (camera/mic/screen)
        socket.on('meeting:media-toggle', ({ socketId, isCameraOn, isMicOn, isScreenSharing }) => {
            setRemoteParticipants(prev => {
                const next = new Map(prev);
                if (next.has(socketId)) {
                    const current = next.get(socketId);
                    next.set(socketId, {
                        ...current,
                        isCameraOn: isCameraOn !== undefined ? isCameraOn : current.isCameraOn,
                        isMicOn: isMicOn !== undefined ? isMicOn : current.isMicOn,
                        isScreenSharing: isScreenSharing !== undefined ? isScreenSharing : current.isScreenSharing
                    });
                }
                return next;
            });
        });

        // Peer left
        socket.on('meeting:user-left', ({ socketId }) => {
            if (peersRef.current.has(socketId)) {
                peersRef.current.get(socketId).close();
                peersRef.current.delete(socketId);
            }
            setRemoteParticipants(prev => {
                const next = new Map(prev);
                next.delete(socketId);
                return next;
            });
            if (pinnedSocketId === socketId) setPinnedSocketId(null);
        });

        // In-meeting Chat messages
        socket.on('meeting:chat-message', (message) => {
            setMessages(prev => [...prev, message]);
            if (!showChat) {
                setUnreadChatCount(prev => prev + 1);
            }
        });

        // Meeting ended
        socket.on('meeting:session-ended', () => {
            toast.success('Meeting has ended');
            cleanup();
            router.push('/meetings');
        });
    };

    // ===========================================
    // 4. CHAT & RECORDING
    // ===========================================
    const sendChatMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const message = {
            id: Date.now(),
            senderId: user?.id,
            sender: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'User',
            text: newMessage.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        socketRef.current?.emit('meeting:chat-message', {
            roomId: params.code,
            message
        });

        setNewMessage('');
    };

    // In-meeting Recording Controls
    const startRecording = () => {
        try {
            if (!localStreamRef.current) {
                toast.error('No stream available to record');
                return;
            }

            recordedChunksRef.current = [];
            const mediaRecorder = new MediaRecorder(localStreamRef.current, {
                mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                    ? 'video/webm;codecs=vp9'
                    : 'video/webm'
            });

            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    recordedChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                setRecordedBlob(blob);
                setShowRecordingModal(true);
            };

            mediaRecorder.start(1000);
            setIsRecording(true);
            setIsRecordingPaused(false);
            setRecordingTime(0);

            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            toast.success('Recording started');
        } catch (err) {
            console.error('Start recording error:', err);
            toast.error('Failed to start recording');
        }
    };

    const pauseResumeRecording = () => {
        if (!mediaRecorderRef.current) return;
        if (isRecordingPaused) {
            mediaRecorderRef.current.resume();
            setIsRecordingPaused(false);
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
            toast.success('Recording resumed');
        } else {
            mediaRecorderRef.current.pause();
            setIsRecordingPaused(true);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            toast('Recording paused', { icon: '⏸️' });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsRecordingPaused(false);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            toast.success('Recording stopped');
        }
    };

    const downloadRecording = () => {
        if (!recordedBlob) return;
        const url = URL.createObjectURL(recordedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting_${session?.id || params.code}_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success('Recording downloaded');
    };

    const saveRecordingToDatabase = async () => {
        if (!recordedBlob) return;
        const targetId = session?.id || params.code;
        try {
            toast.loading('Saving recording to database...');
            const file = new File([recordedBlob], `meeting_${targetId}_${Date.now()}.webm`, { type: 'video/webm' });
            await meetingAPI.uploadRecording(targetId, file, recordingTime);
            toast.dismiss();
            toast.success('Recording saved to session records!');
            setShowRecordingModal(false);
            setRecordedBlob(null);
        } catch (err) {
            toast.dismiss();
            console.error('Failed to save recording:', err);
            toast.error('Failed to save recording');
        }
    };

    // ===========================================
    // 5. END / LEAVE MEETING
    // ===========================================
    const handleEndOrLeave = async () => {
        if (isInstructor) {
            const confirmEnd = window.confirm('Are you sure you want to end this meeting for all participants?');
            if (!confirmEnd) return;

            try {
                // Complete session on backend
                await meetingAPI.completeSession(params.code, {
                    marksObtained: 0,
                    maxMarks: 20,
                    examinerRemarks: 'Meeting completed'
                }).catch(() => {});

                // Notify all peers in room
                socketRef.current?.emit('meeting:end-session', { roomId: params.code });
                toast.success('Meeting ended successfully');
                cleanup();
                router.push('/meetings');
            } catch (err) {
                console.error('End session error:', err);
                cleanup();
                router.push('/meetings');
            }
        } else {
            const confirmLeave = window.confirm('Are you sure you want to leave the meeting?');
            if (!confirmLeave) return;

            cleanup();
            router.push('/meetings');
        }
    };

    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="text-center space-y-4">
                    <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
                    <p className="text-white font-medium text-lg">Joining meeting room...</p>
                </div>
            </div>
        );
    }

    const remoteList = Array.from(remoteParticipants.values());
    const totalParticipants = 1 + remoteList.length; // Local + Remotes

    // Determine featured speaker/tile
    const activeSpeakerTile = pinnedSocketId
        ? remoteParticipants.get(pinnedSocketId)
        : remoteList.find(p => p.isScreenSharing) || remoteList[0];

    return (
        <div className="relative w-screen h-screen bg-slate-950 text-white overflow-hidden select-none font-sans flex flex-col">
            {/* ========================================================================= */}
            {/* LAYER 0 (BASE LAYER): FULLSCREEN WHITEBOARD OR MAIN STAGE GRID           */}
            {/* ========================================================================= */}
            <div className="relative w-full h-full flex-1 overflow-hidden z-0">
                {showWhiteboard ? (
                    <div className="absolute inset-0 w-full h-full z-0 bg-slate-900">
                        <Whiteboard
                            width={typeof window !== 'undefined' ? window.innerWidth : 1280}
                            height={typeof window !== 'undefined' ? window.innerHeight : 800}
                            isFullscreen={true}
                            onClose={() => setShowWhiteboard(false)}
                            onSave={() => toast.success('Whiteboard snapshot saved!')}
                            isMeetingMode={true}
                            showCameraControls={false}
                            isInstructor={isInstructor}
                        />
                    </div>
                ) : (
                    /* Main Stage Video Gallery (Zoom-style responsive grid) */
                    <div className="w-full h-full p-4 flex items-center justify-center">
                        {totalParticipants === 1 ? (
                            /* Solo view */
                            <div className="w-full max-w-4xl h-[75vh]">
                                <VideoTile
                                    stream={localStream}
                                    isLocal={true}
                                    isCameraOn={isVideoEnabled}
                                    isMicOn={isAudioEnabled}
                                    isScreenSharing={isScreenSharing}
                                    name={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'You'}
                                    role={user?.role}
                                    isSpeaking={isLocalSpeaking}
                                    className="w-full h-full shadow-2xl"
                                />
                            </div>
                        ) : (
                            /* Multi-Participant Responsive Grid */
                            <div
                                className={`w-full h-full grid gap-4 place-items-center ${
                                    totalParticipants === 2
                                        ? 'grid-cols-1 md:grid-cols-2 max-w-6xl max-h-[80vh]'
                                        : totalParticipants <= 4
                                        ? 'grid-cols-2 max-w-6xl max-h-[85vh]'
                                        : totalParticipants <= 9
                                        ? 'grid-cols-2 md:grid-cols-3 max-w-7xl'
                                        : 'grid-cols-3 md:grid-cols-4 max-w-full'
                                }`}
                            >
                                {/* Local Video Tile */}
                                <VideoTile
                                    stream={localStream}
                                    isLocal={true}
                                    isCameraOn={isVideoEnabled}
                                    isMicOn={isAudioEnabled}
                                    isScreenSharing={isScreenSharing}
                                    name={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'You'}
                                    role={user?.role}
                                    isSpeaking={isLocalSpeaking}
                                    isPinned={pinnedSocketId === 'local'}
                                    onTogglePin={() => setPinnedSocketId(pinnedSocketId === 'local' ? null : 'local')}
                                    className="w-full h-full min-h-[180px]"
                                />

                                {/* Remote Video Tiles */}
                                {remoteList.map((participant) => (
                                    <VideoTile
                                        key={participant.socketId}
                                        stream={participant.stream}
                                        isLocal={false}
                                        isCameraOn={participant.isCameraOn}
                                        isMicOn={participant.isMicOn}
                                        isScreenSharing={participant.isScreenSharing}
                                        name={participant.name}
                                        role={participant.role}
                                        isSpeaking={participant.isSpeaking}
                                        isPinned={pinnedSocketId === participant.socketId}
                                        onTogglePin={() => setPinnedSocketId(pinnedSocketId === participant.socketId ? null : participant.socketId)}
                                        className="w-full h-full min-h-[180px]"
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* LAYER 1 (FLOATING OVERLAY): DRAGGABLE FLOATING VIDEO PALETTE              */}
            {/* ========================================================================= */}
            {showWhiteboard && (
                <div
                    style={{
                        position: 'fixed',
                        left: videoPalettePos.x !== null ? `${videoPalettePos.x}px` : undefined,
                        right: videoPalettePos.x === null ? '1rem' : undefined,
                        top: `${videoPalettePos.y}px`,
                        zIndex: 25
                    }}
                    className="flex flex-col items-end gap-2 pointer-events-auto select-none"
                >
                    {/* Draggable Header with Minimize / Expand Hook */}
                    <div
                        onPointerDown={handleVideoPalettePointerDown}
                        onPointerMove={handleVideoPalettePointerMove}
                        onPointerUp={handleVideoPalettePointerUp}
                        className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 shadow-2xl text-xs cursor-grab active:cursor-grabbing touch-none"
                    >
                        <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                        <span className="flex items-center gap-1 text-slate-200 font-medium">
                            <Users className="w-3.5 h-3.5 text-primary-400" />
                            {totalParticipants} in call
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsVideoPaletteMinimized(!isVideoPaletteMinimized);
                            }}
                            className="p-1 text-slate-400 hover:text-white rounded-md transition"
                            title={isVideoPaletteMinimized ? 'Show participant tiles' : 'Hide participant tiles'}
                        >
                            {isVideoPaletteMinimized ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                    </div>

                    {/* Floating Video Strip */}
                    {!isVideoPaletteMinimized && (
                        <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-1">
                            {/* Local Floating Tile */}
                            <div className="w-48 h-32 rounded-xl overflow-hidden shadow-2xl border border-slate-700">
                                <VideoTile
                                    stream={localStream}
                                    isLocal={true}
                                    isCameraOn={isVideoEnabled}
                                    isMicOn={isAudioEnabled}
                                    isScreenSharing={isScreenSharing}
                                    name="You"
                                    role={user?.role}
                                    isSpeaking={isLocalSpeaking}
                                    compact={true}
                                    className="w-full h-full"
                                />
                            </div>

                            {/* Remote Floating Tiles */}
                            {remoteList.map((p) => (
                                <div key={p.socketId} className="w-48 h-32 rounded-xl overflow-hidden shadow-2xl border border-slate-700">
                                    <VideoTile
                                        stream={p.stream}
                                        isLocal={false}
                                        isCameraOn={p.isCameraOn}
                                        isMicOn={p.isMicOn}
                                        isScreenSharing={p.isScreenSharing}
                                        name={p.name}
                                        role={p.role}
                                        isSpeaking={p.isSpeaking}
                                        compact={true}
                                        className="w-full h-full"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Top Bar Header Badge (Title + Clock + Multi-Device Indicator) */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-3 pointer-events-auto">
                <button
                    onClick={handleEndOrLeave}
                    className="bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-700/60 text-slate-400 hover:text-white transition shadow-lg"
                    title="Leave Meeting"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/60 shadow-lg flex items-center gap-3">
                    <div>
                        <h2 className="text-white text-sm font-semibold leading-tight">
                            {session?.submission?.assignment?.title || 'Live Meeting Session'}
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Room: <strong className="text-slate-200 font-mono">{params.code}</strong></span>
                        </div>
                    </div>

                    <div className="h-6 w-[1px] bg-slate-700" />

                    {/* Timer */}
                    <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-primary-400" />
                        <span>{formatTimer(elapsedTime)}</span>
                    </div>

                    {/* Recording Badge */}
                    {isRecording && (
                        <div className="flex items-center gap-1.5 bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-lg text-xs font-mono animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <span>REC {formatTimer(recordingTime)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* LAYER 2 (FLOATING OVERLAY): DRAGGABLE FLOATING CHAT WINDOW                */}
            {/* ========================================================================= */}
            {showChat && (
                <div
                    style={{
                        position: 'fixed',
                        left: chatPos.x !== null ? `${chatPos.x}px` : undefined,
                        right: chatPos.x === null ? '1rem' : undefined,
                        top: chatPos.y !== null ? `${chatPos.y}px` : undefined,
                        bottom: chatPos.y === null ? '6rem' : undefined,
                        zIndex: 35
                    }}
                    className="w-84 md:w-96 h-[480px] bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden pointer-events-auto animate-in fade-in select-none"
                >
                    {/* Draggable Chat Header */}
                    <div
                        onPointerDown={handleChatPointerDown}
                        onPointerMove={handleChatPointerMove}
                        onPointerUp={handleChatPointerUp}
                        className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-800/60 cursor-grab active:cursor-grabbing touch-none"
                    >
                        <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-slate-400" />
                            <MessageSquare className="w-4 h-4 text-primary-400" />
                            <h3 className="text-sm font-semibold text-white">In-Meeting Chat</h3>
                        </div>
                        <button
                            onClick={() => setShowChat(false)}
                            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>

                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-4">
                                <MessageSquare className="w-8 h-8 opacity-40 mb-2" />
                                <p className="text-xs">No messages yet. Send a message to all participants in this meeting.</p>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.senderId === user?.id;
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                                            {isMe ? 'You' : msg.sender} • {msg.time}
                                        </span>
                                        <div
                                            className={`px-3 py-2 rounded-xl text-xs max-w-[85%] break-words shadow ${
                                                isMe
                                                    ? 'bg-primary-600 text-white rounded-br-none'
                                                    : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none'
                                            }`}
                                        >
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <form onSubmit={sendChatMessage} className="p-3 border-t border-slate-800 bg-slate-800/30 flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="p-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl transition"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            )}

            {/* ========================================================================= */}
            {/* LAYER 2 (FLOATING OVERLAY): FLOATING PARTICIPANTS LIST                   */}
            {/* ========================================================================= */}
            {showParticipants && (
                <div className="absolute bottom-24 right-4 w-80 h-[400px] bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col z-30 overflow-hidden pointer-events-auto">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary-400" />
                            <h3 className="text-sm font-semibold text-white">Participants ({totalParticipants})</h3>
                        </div>
                        <button
                            onClick={() => setShowParticipants(false)}
                            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {/* Local User */}
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/40">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold">
                                    You
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-white">
                                        {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'You'} (Me)
                                    </p>
                                    <span className="text-[10px] text-primary-400 uppercase font-semibold">
                                        {user?.role}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400">
                                {isAudioEnabled ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                                {isVideoEnabled ? <Video className="w-3.5 h-3.5 text-emerald-400" /> : <VideoOff className="w-3.5 h-3.5 text-slate-500" />}
                            </div>
                        </div>

                        {/* Remote Users */}
                        {remoteList.map((p) => (
                            <div key={p.socketId} className="flex items-center justify-between p-2 rounded-xl bg-slate-800/30 border border-slate-700/20">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                                        {p.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-white">{p.name}</p>
                                        <span className="text-[10px] text-slate-400 uppercase">{p.role}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    {p.isMicOn ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                                    {p.isCameraOn ? <Video className="w-3.5 h-3.5 text-emerald-400" /> : <VideoOff className="w-3.5 h-3.5 text-slate-500" />}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* LAYER 2 (FLOATING OVERLAY): DEVICE & AUDIO SETTINGS MODALS               */}
            {/* ========================================================================= */}
            {showDeviceSettings && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 md:left-24 md:translate-x-0 w-88 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-5 shadow-2xl z-40 pointer-events-auto">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Settings className="w-4 h-4 text-primary-400" />
                            Camera & Microphone Settings
                        </h3>
                        <button onClick={() => setShowDeviceSettings(false)} className="text-slate-400 hover:text-white">
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Camera Selection */}
                    <div className="space-y-3 mb-4">
                        <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                            <span>Camera Source</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isVideoEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {isVideoEnabled ? 'ACTIVE' : 'OFF'}
                            </span>
                        </label>
                        <select
                            value={selectedCamera}
                            onChange={(e) => switchCamera(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-primary-500"
                        >
                            {availableDevices.cameras.length === 0 ? (
                                <option value="">Default Camera</option>
                            ) : (
                                availableDevices.cameras.map((c) => (
                                    <option key={c.deviceId} value={c.deviceId}>
                                        {c.label || `Camera (${c.deviceId.slice(0, 5)})`}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* Microphone Selection */}
                    <div className="space-y-3 mb-4">
                        <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                            <span>Microphone Source</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isAudioEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {isAudioEnabled ? 'ACTIVE' : 'MUTED'}
                            </span>
                        </label>
                        <select
                            value={selectedMicrophone}
                            onChange={(e) => switchMicrophone(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-primary-500"
                        >
                            {availableDevices.microphones.length === 0 ? (
                                <option value="">Default Microphone</option>
                            ) : (
                                availableDevices.microphones.map((m) => (
                                    <option key={m.deviceId} value={m.deviceId}>
                                        {m.label || `Microphone (${m.deviceId.slice(0, 5)})`}
                                    </option>
                                ))
                            )}
                        </select>

                        {/* Mic Level Meter */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>Input Level</span>
                                <span>{micLevel}%</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-75 ${
                                        micLevel > 60 ? 'bg-red-500' : micLevel > 25 ? 'bg-amber-400' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${micLevel}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* RECORDING COMPLETION / UPLOAD MODAL                                      */}
            {/* ========================================================================= */}
            {showRecordingModal && recordedBlob && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-semibold text-white flex items-center gap-2">
                                <Video className="w-5 h-5 text-primary-400" />
                                Meeting Recording Ready
                            </h3>
                            <button onClick={() => setShowRecordingModal(false)} className="text-slate-400 hover:text-white">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-slate-300">
                            Your meeting session was recorded for <strong>{formatTimer(recordingTime)}</strong> ({(recordedBlob.size / (1024 * 1024)).toFixed(2)} MB).
                        </p>

                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                onClick={saveRecordingToDatabase}
                                className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 shadow-lg"
                            >
                                <Save className="w-4 h-4" />
                                Save to Session Record
                            </button>
                            <button
                                onClick={downloadRecording}
                                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium border border-slate-700 transition flex items-center justify-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Download .webm File
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* LAYER 3 (FLOATING CONTROLS BAR): ZOOM-STYLE FLOATING BOTTOM BAR           */}
            {/* ========================================================================= */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center">
                {/* Hide / Expand Controls Hook */}
                <button
                    onClick={() => setIsControlsHidden(!isControlsHidden)}
                    className="mb-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/60 text-slate-400 hover:text-white text-xs flex items-center gap-1 transition shadow-lg"
                >
                    {isControlsHidden ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>{isControlsHidden ? 'Show Controls' : 'Hide Controls'}</span>
                </button>

                {!isControlsHidden && (
                    <div className="bg-slate-900/90 backdrop-blur-2xl px-5 py-3 rounded-2xl border border-slate-700/80 shadow-2xl flex items-center gap-2 md:gap-3">
                        {/* Audio / Mic Toggle + Settings Dropdown */}
                        <div className="flex items-center">
                            <button
                                onClick={toggleAudio}
                                className={`p-3 rounded-l-xl transition flex items-center justify-center ${
                                    isAudioEnabled
                                        ? 'bg-slate-800 hover:bg-slate-700 text-white'
                                        : 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                                }`}
                                title={isAudioEnabled ? 'Mute Mic' : 'Unmute Mic'}
                            >
                                {isAudioEnabled ? <Mic className="w-5 h-5 text-emerald-400" /> : <MicOff className="w-5 h-5 text-red-400" />}
                            </button>
                            <button
                                onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                                className="px-1.5 py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-r-xl border-l border-slate-700 transition"
                                title="Audio Settings"
                            >
                                <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Video / Camera Toggle */}
                        <div className="flex items-center">
                            <button
                                onClick={toggleVideo}
                                className={`p-3 rounded-l-xl transition flex items-center justify-center ${
                                    isVideoEnabled
                                        ? 'bg-slate-800 hover:bg-slate-700 text-white'
                                        : 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                                }`}
                                title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
                            >
                                {isVideoEnabled ? <Video className="w-5 h-5 text-emerald-400" /> : <VideoOff className="w-5 h-5 text-red-400" />}
                            </button>
                            <button
                                onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                                className="px-1.5 py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-r-xl border-l border-slate-700 transition"
                                title="Camera Settings"
                            >
                                <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="h-6 w-[1px] bg-slate-700 mx-1" />

                        {/* Screen Share */}
                        <button
                            onClick={toggleScreenShare}
                            className={`p-3 rounded-xl transition flex items-center justify-center ${
                                isScreenSharing
                                    ? 'bg-primary-600 text-white ring-2 ring-primary-400 shadow-lg'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                            }`}
                            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                        >
                            <MonitorUp className="w-5 h-5" />
                        </button>

                        {/* Whiteboard Toggle */}
                        <button
                            onClick={() => setShowWhiteboard(!showWhiteboard)}
                            className={`p-3 rounded-xl transition flex items-center justify-center ${
                                showWhiteboard
                                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                            }`}
                            title={showWhiteboard ? 'Exit Whiteboard' : 'Open Whiteboard'}
                        >
                            <Pencil className="w-5 h-5" />
                        </button>

                        {/* In-Meeting Recording */}
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`p-3 rounded-xl transition flex items-center justify-center ${
                                isRecording
                                    ? 'bg-red-600 text-white animate-pulse shadow-lg ring-2 ring-red-400'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                            }`}
                            title={isRecording ? 'Stop Recording' : 'Record Meeting'}
                        >
                            <Radio className="w-5 h-5" />
                        </button>

                        {/* Participants Button */}
                        <button
                            onClick={() => setShowParticipants(!showParticipants)}
                            className={`p-3 rounded-xl transition flex items-center justify-center relative ${
                                showParticipants ? 'bg-slate-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                            }`}
                            title="Participants"
                        >
                            <Users className="w-5 h-5" />
                            <span className="absolute -top-1 -right-1 bg-slate-700 text-slate-200 border border-slate-600 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                {totalParticipants}
                            </span>
                        </button>

                        {/* Chat Button */}
                        <button
                            onClick={() => {
                                setShowChat(!showChat);
                                setUnreadChatCount(0);
                            }}
                            className={`p-3 rounded-xl transition flex items-center justify-center relative ${
                                showChat ? 'bg-slate-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                            }`}
                            title="Chat"
                        >
                            <MessageSquare className="w-5 h-5" />
                            {unreadChatCount > 0 && !showChat && (
                                <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-bounce">
                                    {unreadChatCount}
                                </span>
                            )}
                        </button>

                        <div className="h-6 w-[1px] bg-slate-700 mx-1" />

                        {/* End / Leave Meeting Button */}
                        <button
                            onClick={handleEndOrLeave}
                            className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-medium text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-red-600/30"
                            title={isInstructor ? 'End Meeting for All' : 'Leave Meeting'}
                        >
                            <Phone className="w-4 h-4 rotate-[135deg]" />
                            <span className="hidden md:inline">{isInstructor ? 'End Meeting' : 'Leave'}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
