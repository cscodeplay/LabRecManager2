'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Video, VideoOff, Mic, MicOff, Phone,
    MessageSquare, Clock, User, Send, CheckCircle, XCircle,
    Maximize2, Minimize2, Download, Save, Volume2, VolumeX,
    Settings, Sliders, MonitorUp, Pencil, Users, ChevronUp,
    ChevronDown, Eye, EyeOff, Radio, Sparkles, Pause, Play,
    GripVertical, Move, Search, ShieldCheck, ShieldAlert,
    MoreVertical, UserCheck, UserX, PenTool, Coffee, Loader2,
    Info, Copy, Check, Share2, Key, LayoutGrid, ScreenShare,
    AlertTriangle, Shield, UserPlus, Link2
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { meetingAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import Whiteboard from '@/components/Whiteboard';
import VideoTile from '@/components/VideoTile';
import { formatTime } from '@/lib/dateUtils';

function formatRoomCode(code) {
    if (!code) return '';
    const str = code.toString().replace(/[^0-9]/g, '');
    if (str.length === 10) {
        return `${str.slice(0, 3)}-${str.slice(3, 6)}-${str.slice(6)}`;
    }
    return str || code.toString();
}

const ScreenSharePresenter = React.memo(function ScreenSharePresenter({
    stream,
    isLocal,
    presenterName,
    onStartShare,
    onBackToGallery
}) {
    const videoRef = useRef(null);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        if (stream) {
            if (videoEl.srcObject !== stream) {
                videoEl.srcObject = stream;
            }
            const playPromise = videoEl.play();
            if (playPromise !== undefined) {
                playPromise.catch((err) => {
                    console.log('Screen share playback deferred:', err.message);
                });
            }
        } else {
            videoEl.srcObject = null;
        }
    }, [stream]);

    if (!stream) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-900/80 rounded-3xl border border-slate-800 max-w-md space-y-4 shadow-2xl">
                <MonitorUp className="w-12 h-12 text-slate-500" />
                <h3 className="text-base font-semibold text-white">No Active Screen Share</h3>
                <p className="text-xs text-slate-400">Click below to start sharing your screen or switch back to the gallery view.</p>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onStartShare}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-lg transition"
                    >
                        Share My Screen
                    </button>
                    <button
                        onClick={onBackToGallery}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
                    >
                        Back to Gallery
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full max-w-7xl max-h-[85vh] bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                className="w-full h-full object-contain"
            />
            <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 text-xs text-white flex items-center gap-2 shadow-lg z-10">
                <MonitorUp className="w-4 h-4 text-emerald-400" />
                <span>{isLocal ? 'You are sharing your screen' : `${presenterName || 'Presenter'}'s Screen`}</span>
            </div>
        </div>
    );
});

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

    // Waiting Room state
    const [isWaitingInRoom, setIsWaitingInRoom] = useState(false);
    const [waitingParticipants, setWaitingParticipants] = useState([]);

    // Local Media state
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
    const [canDrawOnWhiteboard, setCanDrawOnWhiteboard] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Floating Draggable Video PIP Overlay States
    const [isFloatingVideoMinimized, setIsFloatingVideoMinimized] = useState(false);
    const [floatingVideoPos, setFloatingVideoPos] = useState({ x: 0, y: 0 });
    const [isDraggingFloatingVideo, setIsDraggingFloatingVideo] = useState(false);
    const floatingDragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });

    // Multi-Device Mesh Remote Participants Map: socketId -> participant info
    const [remoteParticipants, setRemoteParticipants] = useState(new Map());
    const [pinnedSocketId, setPinnedSocketId] = useState(null);

    // =========================================================================
    // THREE PRESENTATION SPACES: 'vc_tiles' | 'whiteboard' | 'screen_share'
    // =========================================================================
    const [activeSpace, setActiveSpace] = useState('vc_tiles');

    // Layout & Overlay Controls (Zoom-style floating panels)
    const [showChat, setShowChat] = useState(false);
    const [activeSidePanelTab, setActiveSidePanelTab] = useState('chat'); // 'chat' | 'participants' | 'invite'
    const [chatRecipient, setChatRecipient] = useState({ id: 'everyone', name: 'Everyone (in Meeting)' });
    const [participantSearchQuery, setParticipantSearchQuery] = useState('');

    // In-Meeting Global Search & Invite State
    const [inviteSearchQuery, setInviteSearchQuery] = useState('');
    const [inviteFilter, setInviteFilter] = useState('all'); // 'all' | 'student' | 'class' | 'group'
    const [inviteResults, setInviteResults] = useState({ students: [], classes: [], groups: [] });
    const [loadingInvites, setLoadingInvites] = useState(false);
    const [invitedMap, setInvitedMap] = useState({});

    const [showDeviceSettings, setShowDeviceSettings] = useState(false);
    const [showMeetingInfoModal, setShowMeetingInfoModal] = useState(false);
    const [copiedInfoField, setCopiedInfoField] = useState('');

    // Leave Meeting with Countdown state
    const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
    const [leaveCountdown, setLeaveCountdown] = useState(5);
    const leaveIntervalRef = useRef(null);

    const [isVideoPaletteMinimized, setIsVideoPaletteMinimized] = useState(false);
    const [isControlsHidden, setIsControlsHidden] = useState(false);
    const [controlsDock, setControlsDock] = useState('bottom'); // 'bottom' | 'top' | 'left' | 'right'

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

    // Chat / Participant window drag handlers
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
        const newX = Math.max(10, Math.min(window.innerWidth - 380, e.clientX - chatDragOffset.current.x));
        const newY = Math.max(10, Math.min(window.innerHeight - 520, e.clientY - chatDragOffset.current.y));
        setChatPos({ x: newX, y: newY });
    };

    const handleChatPointerUp = () => {
        isDraggingChat.current = false;
    };

    // Chat state (Ref + State for persistent broadcast and private messages)
    const [messages, setMessages] = useState([]);
    const messagesRef = useRef([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadChatCount, setUnreadChatCount] = useState(0);

    // Device selection state
    const [availableDevices, setAvailableDevices] = useState({ cameras: [], microphones: [], speakers: [] });
    const [selectedCamera, setSelectedCamera] = useState('');
    const [selectedMicrophone, setSelectedMicrophone] = useState('');
    const [micLevel, setMicLevel] = useState(0);

    // In-Meeting Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [showRecordingModal, setShowRecordingModal] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploadingRecording, setIsUploadingRecording] = useState(false);

    // Refs
    const localStreamRef = useRef(null);
    const socketRef = useRef(null);
    const peersRef = useRef(new Map());
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);
    const sessionTimerRef = useRef(null);
    const chatContainerRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const micAnimFrameRef = useRef(null);
    const canvasAnimRef = useRef(null);
    const activeRoomIdRef = useRef(params.code);

    const isInstructor = user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'principal' || user?.role === 'lab_assistant';

    // Sync initial drawing permission with role
    useEffect(() => {
        if (isInstructor) {
            setCanDrawOnWhiteboard(true);
        }
    }, [isInstructor]);

    // Fullscreen listeners
    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Fullscreen error:', err);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // Floating video drag handlers
    const handleFloatingDragStart = (e) => {
        setIsDraggingFloatingVideo(true);
        floatingDragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            posX: floatingVideoPos.x,
            posY: floatingVideoPos.y
        };

        const handleMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - floatingDragRef.current.startX;
            const dy = moveEvent.clientY - floatingDragRef.current.startY;
            setFloatingVideoPos({
                x: floatingDragRef.current.posX + dx,
                y: floatingDragRef.current.posY + dy
            });
        };

        const handleMouseUp = () => {
            setIsDraggingFloatingVideo(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Standard STUN servers for WebRTC mesh
    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ]
    };

    // Calculate passcode
    
    const getDisplayRoomCode = () => {
        if (session?.questionsAsked?.formattedRoomCode) return session.questionsAsked.formattedRoomCode;
        if (session?.questionsAsked?.roomCode) {
            const rc = session.questionsAsked.roomCode;
            return rc.length === 10 ? `${rc.slice(0, 3)}-${rc.slice(3, 6)}-${rc.slice(6)}` : rc;
        }
        const raw = (params.code || '').replace(/[^0-9]/g, '');
        if (raw.length === 10) {
            return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
        }
        if (session?.id) {
            const num = Math.abs(session.id.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) % 9000000000, 1000000000)).toString();
            return `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6)}`;
        }
        return params.code;
    };

    const getDisplayPasscode = () => {
        if (session?.questionsAsked?.passcode) return session.questionsAsked.passcode;
        const targetStr = session?.id || params.code || 'default';
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
        let code = '';
        let hash = targetStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        for (let i = 0; i < 8; i++) {
            hash = (hash * 9301 + 49297) % 233280;
            code += chars.charAt(Math.floor((hash / 233280) * chars.length));
        }
        return code;
    };

    const meetingPasscode = getDisplayPasscode();
    const displayRoomCode = getDisplayRoomCode();


    // ===========================================
    // 1. INITIALIZATION & LIFECYCLE
    // ===========================================
    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            toast.error('Please log in to join the meeting');
            router.push('/login');
            return;
        }

        loadSession();

        sessionTimerRef.current = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);

        return () => {
            cleanup();
        };
    }, [_hasHydrated, isAuthenticated, params.code]);

    const cleanup = () => {
        if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        if (leaveIntervalRef.current) clearInterval(leaveIntervalRef.current);
        if (micAnimFrameRef.current) cancelAnimationFrame(micAnimFrameRef.current);
        if (canvasAnimRef.current) cancelAnimationFrame(canvasAnimRef.current);

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
            activeRoomIdRef.current = sessionData.id || params.code;

            if (sessionData.status === 'completed') {
                toast.error('This meeting session has already ended');
                router.push('/meetings');
                return;
            }

            // Determine if student should enter waiting room
            const isHost = sessionData.hostId === user?.id || isInstructor;
            const autoAdmit = sessionData.autoStart !== false && sessionData.questionsAsked?.autoAdmit !== false;

            if (!isHost && !autoAdmit && sessionData.status !== 'in_progress') {
                setIsWaitingInRoom(true);
            }

            await meetingAPI.joinSession(sessionData.id || params.code).catch(() => {});
            await initializeLocalMedia();
            initializeSocket(sessionData.id || params.code, isHost, autoAdmit || sessionData.status === 'in_progress');

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
    // 2. SPACE SWITCHING & PRESENTATION ENGINE
    // ===========================================
    const switchActiveSpace = (newSpace, broadcast = true) => {
        setActiveSpace(newSpace);

        if (broadcast && isInstructor && socketRef.current) {
            socketRef.current.emit('meeting:set-active-space', {
                roomId: activeRoomIdRef.current,
                space: newSpace
            });
        }

        const labels = {
            vc_tiles: 'Gallery / Video Grid',
            whiteboard: 'Collaborative Whiteboard',
            screen_share: 'Screen Presentation'
        };
        toast.success(`Maximized ${labels[newSpace] || newSpace}`, { icon: '🔲', duration: 1500 });
    };

    // ===========================================
    // 3. LOCAL MEDIA & AUDIO MONITORING
    // ===========================================
    const initializeLocalMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });

            localStreamRef.current = stream;
            setLocalStream(stream);

            stream.getVideoTracks().forEach(track => { track.enabled = false; });
            stream.getAudioTracks().forEach(track => { track.enabled = false; });

            setupAudioAnalysis(stream);
            await enumerateDevices();
        } catch (error) {
            console.warn('Initial camera/mic access deferred:', error);
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
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
                    audio: false
                });
                const newVideoTrack = stream.getVideoTracks()[0];
                localStreamRef.current.addTrack(newVideoTrack);
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

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

                socketRef.current?.emit('meeting:media-toggle', {
                    roomId: activeRoomIdRef.current,
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
                    roomId: activeRoomIdRef.current,
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
                await switchCamera(selectedCamera || '');
                setIsScreenSharing(false);
                if (activeSpace === 'screen_share') {
                    switchActiveSpace('vc_tiles');
                }
                socketRef.current?.emit('meeting:media-toggle', {
                    roomId: activeRoomIdRef.current,
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

                screenTrack.onended = () => {
                    setIsScreenSharing(false);
                    if (activeSpace === 'screen_share') {
                        switchActiveSpace('vc_tiles');
                    }
                    switchCamera(selectedCamera || '');
                    socketRef.current?.emit('meeting:media-toggle', {
                        roomId: activeRoomIdRef.current,
                        isCameraOn: isVideoEnabled,
                        isMicOn: isAudioEnabled,
                        isScreenSharing: false
                    });
                };

                const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];
                if (oldVideoTrack) {
                    localStreamRef.current.removeTrack(oldVideoTrack);
                }
                localStreamRef.current.addTrack(screenTrack);
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

                peersRef.current.forEach(async (pc) => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) await sender.replaceTrack(screenTrack);
                });

                setIsScreenSharing(true);
                switchActiveSpace('screen_share');

                socketRef.current?.emit('meeting:media-toggle', {
                    roomId: activeRoomIdRef.current,
                    isCameraOn: true,
                    isMicOn: isAudioEnabled,
                    isScreenSharing: true
                });
                toast.success('Screen sharing started');
            }
        } catch (error) {
            console.error('Screen share error:', error);
            toast.error('Could not start screen share');
        }
    };

    // ===========================================
    // 4. MULTI-DEVICE MESH WEBRTC SIGNALING
    // ===========================================
    const createPeerConnection = (targetSocketId, isInitiator = false) => {
        if (peersRef.current.has(targetSocketId)) {
            const existingPc = peersRef.current.get(targetSocketId);
            if (existingPc.signalingState !== 'closed') {
                return existingPc;
            }
        }

        const pc = new RTCPeerConnection(iceServers);
        peersRef.current.set(targetSocketId, pc);

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                try {
                    pc.addTrack(track, localStreamRef.current);
                } catch (e) {}
            });
        }

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

        pc.ontrack = (event) => {
            const remoteStream = event.streams[0] || new MediaStream([event.track]);
            setRemoteParticipants(prev => {
                const next = new Map(prev);
                if (next.has(targetSocketId)) {
                    const current = next.get(targetSocketId);
                    next.set(targetSocketId, { ...current, stream: remoteStream });
                } else {
                    next.set(targetSocketId, {
                        socketId: targetSocketId,
                        stream: remoteStream,
                        name: 'Participant',
                        role: 'student',
                        isCameraOn: true,
                        isMicOn: true,
                        isScreenSharing: false,
                        canDraw: false
                    });
                }
                return next;
            });
        };

        let isNegotiating = false;
        pc.onnegotiationneeded = async () => {
            try {
                if (isNegotiating || pc.signalingState !== 'stable') return;
                isNegotiating = true;
                const offer = await pc.createOffer();
                if (pc.signalingState !== 'stable') return;
                await pc.setLocalDescription(offer);
                socketRef.current?.emit('meeting:signal', {
                    targetSocketId,
                    signal: {
                        type: 'offer',
                        sdp: offer
                    }
                });
            } catch (err) {
                console.warn('WebRTC negotiation note:', err.message || err);
            } finally {
                isNegotiating = false;
            }
        };

        return pc;
    };

    const initializeSocket = (canonicalRoomId, isHost, directAdmit) => {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5001' : (typeof window !== 'undefined' ? window.location.origin : ''));
        const socket = io(socketUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setMySocketId(socket.id);

            if (!isHost && !directAdmit) {
                socket.emit('meeting:join-waiting-room', {
                    roomId: canonicalRoomId,
                    user: {
                        id: user?.id,
                        firstName: user?.firstName,
                        lastName: user?.lastName,
                        username: user?.username,
                        role: user?.role
                    }
                });
            } else {
                socket.emit('meeting:join', {
                    roomId: canonicalRoomId,
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
            }
        });

        // Presentation Space synchronization from host
        socket.on('meeting:active-space-changed', ({ space, senderSocketId }) => {
            if (senderSocketId !== socket.id) {
                setActiveSpace(space);
                const labels = {
                    vc_tiles: 'Gallery',
                    whiteboard: 'Whiteboard',
                    screen_share: 'Screen Share'
                };
                toast(`Host switched presentation to ${labels[space] || space}`, { icon: '📺', duration: 2500 });
            }
        });

        // Waiting room status from server
        socket.on('meeting:waiting-status', ({ isWaiting }) => {
            setIsWaitingInRoom(isWaiting);
        });

        // Admitted by host
        socket.on('meeting:admitted', () => {
            setIsWaitingInRoom(false);
            toast.success('You have been admitted to the meeting room!', { icon: '🎉' });
            socket.emit('meeting:join', {
                roomId: canonicalRoomId,
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

        // Denied by host
        socket.on('meeting:denied', () => {
            toast.error('The host has denied entry to this session');
            cleanup();
            router.push('/meetings');
        });

        // Waiting participants list for host
        socket.on('meeting:waiting-users', ({ waiting }) => {
            setWaitingParticipants(waiting || []);
        });

        // Received current list of peers in room
        socket.on('meeting:room-users', async ({ participants, yourSocketId }) => {
            setMySocketId(yourSocketId);
            const otherParticipants = (participants || []).filter(p => p.socketId !== yourSocketId);

            otherParticipants.forEach((participant) => {
                setRemoteParticipants(prev => {
                    const next = new Map(prev);
                    next.set(participant.socketId, {
                        ...participant,
                        canDraw: participant.role === 'instructor' || participant.role === 'admin' || participant.role === 'principal'
                    });
                    return next;
                });

                createPeerConnection(participant.socketId, true);
            });
        });

        // A new device / user joined the room
        socket.on('meeting:user-joined', ({ participant }) => {
            if (participant.socketId === socket.id) return;
            setRemoteParticipants(prev => {
                const next = new Map(prev);
                next.set(participant.socketId, {
                    ...participant,
                    canDraw: participant.role === 'instructor' || participant.role === 'admin' || participant.role === 'principal'
                });
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
                    if (pc.signalingState !== 'stable') {
                        await pc.setLocalDescription({ type: 'rollback' }).catch(() => {});
                    }
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
                console.warn('Signal handling note:', err.message || err);
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

        // Remote Host Control Actions
        socket.on('meeting:host-action', ({ action, value }) => {
            if (action === 'mute-mic') {
                const audioTrack = localStreamRef.current?.getAudioTracks()[0];
                if (audioTrack) audioTrack.enabled = false;
                setIsAudioEnabled(false);
                socketRef.current?.emit('meeting:media-toggle', {
                    roomId: canonicalRoomId,
                    isCameraOn: isVideoEnabled,
                    isMicOn: false,
                    isScreenSharing
                });
                toast('Host muted your microphone', { icon: '🔇' });
            } else if (action === 'unmute-mic') {
                toast('Host requested you to unmute your microphone', { icon: '🎙️' });
            } else if (action === 'stop-video') {
                const videoTrack = localStreamRef.current?.getVideoTracks()[0];
                if (videoTrack) videoTrack.enabled = false;
                setIsVideoEnabled(false);
                socketRef.current?.emit('meeting:media-toggle', {
                    roomId: canonicalRoomId,
                    isCameraOn: false,
                    isMicOn: isAudioEnabled,
                    isScreenSharing
                });
                toast('Host stopped your camera', { icon: '📷' });
            } else if (action === 'start-video') {
                toast('Host requested you to start your camera', { icon: '🎥' });
            } else if (action === 'stop-screen') {
                if (isScreenSharing) {
                    toggleScreenShare();
                    toast('Host stopped your screen sharing', { icon: '🖥️' });
                }
            } else if (action === 'toggle-draw') {
                setCanDrawOnWhiteboard(prev => {
                    const next = value !== undefined ? value : !prev;
                    toast(next ? 'Host enabled your whiteboard drawing access' : 'Host disabled your whiteboard drawing access', { icon: '✏️' });
                    return next;
                });
            }
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

        // In-meeting Chat messages (persistent)
        socket.on('meeting:chat-message', (message) => {
            messagesRef.current = [...messagesRef.current, message];
            setMessages([...messagesRef.current]);
            if (!showChat) {
                setUnreadChatCount(prev => prev + 1);
            }
            setTimeout(() => {
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                }
            }, 100);
        });

        // Meeting ended
        socket.on('meeting:session-ended', () => {
            toast.success('Meeting has ended');
            cleanup();
            router.push('/meetings');
        });
    };

    // ===========================================
    // 5. HOST CONTROLS, WAITING ROOM & CHAT
    // ===========================================
    const handleAdmitUser = (targetSocketId) => {
        socketRef.current?.emit('meeting:admit-user', {
            roomId: activeRoomIdRef.current,
            targetSocketId
        });
        toast.success('Participant admitted to meeting');
    };

    const handleAdmitAll = () => {
        socketRef.current?.emit('meeting:admit-user', {
            roomId: activeRoomIdRef.current,
            targetSocketId: 'all'
        });
        toast.success('All waiting participants admitted');
    };

    const handleDenyUser = (targetSocketId) => {
        socketRef.current?.emit('meeting:deny-user', {
            roomId: activeRoomIdRef.current,
            targetSocketId
        });
        toast('Participant denied entry', { icon: '🚫' });
    };

    const handleHostMuteParticipant = (targetSocketId, currentMicState) => {
        socketRef.current?.emit('meeting:host-control', {
            roomId: activeRoomIdRef.current,
            targetSocketId,
            action: currentMicState ? 'mute-mic' : 'unmute-mic'
        });
        toast.success(currentMicState ? 'Mute signal sent' : 'Unmute request sent');
    };

    const handleHostVideoParticipant = (targetSocketId, currentVideoState) => {
        socketRef.current?.emit('meeting:host-control', {
            roomId: activeRoomIdRef.current,
            targetSocketId,
            action: currentVideoState ? 'stop-video' : 'start-video'
        });
        toast.success(currentVideoState ? 'Stop video signal sent' : 'Start video request sent');
    };

    const handleHostStopScreen = (targetSocketId) => {
        socketRef.current?.emit('meeting:host-control', {
            roomId: activeRoomIdRef.current,
            targetSocketId,
            action: 'stop-screen'
        });
        toast.success('Stop screen share signal sent');
    };

    const handleHostToggleDraw = (targetSocketId, currentDrawState) => {
        socketRef.current?.emit('meeting:host-control', {
            roomId: activeRoomIdRef.current,
            targetSocketId,
            action: 'toggle-draw',
            value: !currentDrawState
        });
        setRemoteParticipants(prev => {
            const next = new Map(prev);
            if (next.has(targetSocketId)) {
                const current = next.get(targetSocketId);
                next.set(targetSocketId, { ...current, canDraw: !currentDrawState });
            }
            return next;
        });
        toast.success(!currentDrawState ? 'Drawing permission enabled' : 'Drawing permission revoked');
    };

    const handleHostMuteAll = () => {
        socketRef.current?.emit('meeting:host-control', {
            roomId: activeRoomIdRef.current,
            targetSocketId: 'all',
            action: 'mute-mic'
        });
        toast.success('Muted all participants');
    };

    const handleOpenDirectChat = (participant) => {
        setChatRecipient({
            id: participant.socketId || participant.id || participant.userId,
            name: participant.name
        });
        setActiveSidePanelTab('chat');
        setShowChat(true);
        setUnreadChatCount(0);
    };

    const sendChatMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const messageData = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            senderId: user?.id || socketRef.current?.id,
            senderSocketId: socketRef.current?.id,
            sender: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'User',
            senderRole: user?.role,
            text: newMessage.trim(),
            time: formatTime(new Date()),
            recipientId: chatRecipient.id,
            recipientName: chatRecipient.name
        };

        socketRef.current?.emit('meeting:chat-message', {
            roomId: activeRoomIdRef.current,
            message: messageData
        });

        setNewMessage('');
    };

    const handleShareInviteInChat = () => {
        const currentRoomCode = displayRoomCode || params.code || '';
        const roomFormatted = formatRoomCode(currentRoomCode);
        const pass = passcode || 'k8m2px9a';
        const inviteTxt = `📋 Meeting Invitation:\n• Room ID: ${roomFormatted}\n• Passcode: ${pass}\n• Join Link: ${typeof window !== 'undefined' ? window.location.origin : ''}/meeting/${currentRoomCode}`;
        
        const messageData = {
            id: Date.now().toString(),
            sender: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Host',
            senderId: user?.id,
            senderSocketId: mySocketId,
            time: formatTime(new Date()),
            text: inviteTxt,
            recipientId: 'everyone',
            recipientName: 'Everyone (in Meeting)'
        };

        socketRef.current?.emit('meeting:chat-message', {
            roomId: activeRoomIdRef.current,
            message: messageData
        });
        setMessages(prev => [...prev, messageData]);
        toast.success('Meeting invitation shared in chat!', { icon: '📋' });
    };

    const searchGlobalTargets = async (query) => {
        if (!query || query.trim().length < 1) {
            setInviteResults({ students: [], classes: [], groups: [] });
            return;
        }
        setLoadingInvites(true);
        try {
            const res = await meetingAPI.searchTargets({ q: query.trim(), type: inviteFilter });
            setInviteResults(res.data.data || { students: [], classes: [], groups: [] });
        } catch (err) {
            console.error('Invite target search error:', err);
        } finally {
            setLoadingInvites(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (inviteSearchQuery) {
                searchGlobalTargets(inviteSearchQuery);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [inviteSearchQuery, inviteFilter]);

    const handleSendMeetingInvite = async (targetType, targetId, targetName) => {
        try {
            const meetingIdToUse = session?.id || code;
            await meetingAPI.sendInvite(meetingIdToUse, {
                targetType,
                targetId,
                message: `${user?.firstName || 'Host'} has invited you to join the live meeting "${session?.title || 'Online Meeting'}".`
            });
            setInvitedMap(prev => ({ ...prev, [targetId]: true }));
            toast.success(`Invite sent to ${targetName}!`, { icon: '🚀' });
        } catch (err) {
            console.error('Send invite error:', err);
            toast.error(err.response?.data?.message || 'Failed to send invite');
        }
    };

    const visibleMessages = messages.filter(m => {
        if (!m.recipientId || m.recipientId === 'everyone') return true;
        const myId = user?.id;
        const mySocket = socketRef.current?.id;
        return m.senderId === myId || m.senderSocketId === mySocket || m.recipientId === myId || m.recipientId === mySocket;
    });

    // =========================================================================
    // ROBUST MEETING RECORDING ENGINE (WebAudio Multi-Track & Presentation Capture)
    // =========================================================================
    const createCompositeRecordStream = () => {
        const stream = new MediaStream();

        // 1. Multi-Track Audio Mixing Pipeline via Web Audio API
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                const audioCtx = new AudioContextClass();
                const audioDest = audioCtx.createMediaStreamDestination();

                // Mix local microphone audio
                if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
                    try {
                        const localAudioTrack = localStreamRef.current.getAudioTracks()[0];
                        const localSource = audioCtx.createMediaStreamSource(new MediaStream([localAudioTrack]));
                        localSource.connect(audioDest);
                    } catch (e) {
                        console.log('Error mixing local audio track:', e);
                    }
                }

                // Mix all remote participants' audio
                remoteParticipants.forEach((p) => {
                    if (p.stream && p.stream.getAudioTracks().length > 0) {
                        try {
                            const remoteAudioTrack = p.stream.getAudioTracks()[0];
                            const remoteSource = audioCtx.createMediaStreamSource(new MediaStream([remoteAudioTrack]));
                            remoteSource.connect(audioDest);
                        } catch (e) {
                            console.log('Error mixing remote audio track:', e);
                        }
                    }
                });

                // Inaudible carrier tone (guarantees constant timestamps even during total silence)
                try {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    gain.gain.value = 0.00001; // Inaudible
                    osc.connect(gain);
                    gain.connect(audioDest);
                    osc.start();
                } catch (e) {
                    console.log('Error creating audio carrier:', e);
                }

                const mixedAudioTrack = audioDest.stream.getAudioTracks()[0];
                if (mixedAudioTrack) {
                    stream.addTrack(mixedAudioTrack);
                }
            }
        } catch (audioErr) {
            console.error('AudioContext mixer fallback:', audioErr);
            if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
                stream.addTrack(localStreamRef.current.getAudioTracks()[0].clone());
            }
        }

        // 2. Video Capture based on active Presentation Space
        let videoTrackAdded = false;

        // Space A: Screen Share active
        if (activeSpace === 'screen_share' && activeScreenStream && activeScreenStream.getVideoTracks().length > 0) {
            const screenTrack = activeScreenStream.getVideoTracks()[0];
            if (screenTrack && screenTrack.readyState === 'live') {
                stream.addTrack(screenTrack.clone());
                videoTrackAdded = true;
            }
        }

        // Space B: Whiteboard active - capture canvas directly
        if (!videoTrackAdded && activeSpace === 'whiteboard') {
            const wbCanvas = document.querySelector('canvas');
            if (wbCanvas && typeof wbCanvas.captureStream === 'function') {
                try {
                    const wbStream = wbCanvas.captureStream(30);
                    const wbTrack = wbStream.getVideoTracks()[0];
                    if (wbTrack) {
                        stream.addTrack(wbTrack);
                        videoTrackAdded = true;
                    }
                } catch (e) {
                    console.log('Error capturing whiteboard canvas:', e);
                }
            }
        }

        // Space C: Local camera video if available
        if (!videoTrackAdded) {
            const hasLiveLocalVideo = localStreamRef.current && localStreamRef.current.getVideoTracks().some(t => t.enabled && t.readyState === 'live');
            if (hasLiveLocalVideo) {
                const videoTrack = localStreamRef.current.getVideoTracks().find(t => t.enabled);
                if (videoTrack) {
                    stream.addTrack(videoTrack.clone());
                    videoTrackAdded = true;
                }
            }
        }

        // Space D: Dynamic High-Definition Composite Canvas Fallback (1280x720 30FPS)
        if (!videoTrackAdded) {
            const canvas = document.createElement('canvas');
            canvas.width = 1280;
            canvas.height = 720;
            const ctx = canvas.getContext('2d');

            let frame = 0;
            const title = session?.title || session?.submission?.assignment?.title || 'Meeting Session Recording';
            const roomCode = displayRoomCode || params.code;

            const draw = () => {
                frame++;
                // Gradient background
                const grad = ctx.createLinearGradient(0, 0, 1280, 720);
                grad.addColorStop(0, '#0f172a');
                grad.addColorStop(1, '#020617');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 1280, 720);

                // Animated glow circle
                const pulse = Math.sin(frame * 0.04) * 15;
                ctx.strokeStyle = '#6366f1';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(640, 320, 90 + pulse, 0, Math.PI * 2);
                ctx.stroke();

                // Live recording badge
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(580, 120, 8, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 20px system-ui, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('REC • LIVE MEETING', 600, 127);

                // Meeting Title
                ctx.font = 'bold 36px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(title, 640, 200);

                // Room ID & Info
                ctx.fillStyle = '#94a3b8';
                ctx.font = '20px monospace';
                ctx.fillText(`Meeting ID: ${roomCode}`, 640, 240);

                // Waveform Visualizer
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 3;
                ctx.beginPath();
                for (let x = 340; x <= 940; x += 10) {
                    const y = 520 + Math.sin(frame * 0.08 + x * 0.03) * (micLevel > 0 ? micLevel * 0.8 : 12);
                    if (x === 340) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();

                // Host label
                ctx.fillStyle = '#cbd5e1';
                ctx.font = '16px system-ui, sans-serif';
                ctx.fillText(`Host: ${session?.host ? `${session.host.firstName} ${session.host.lastName}` : (user?.firstName || 'Host')}`, 640, 600);

                canvasAnimRef.current = requestAnimationFrame(draw);
            };
            draw();

            const canvasStream = canvas.captureStream(30);
            const canvasVideoTrack = canvasStream.getVideoTracks()[0];
            if (canvasVideoTrack) stream.addTrack(canvasVideoTrack);
        }

        return stream;
    };

    const startRecording = () => {
        try {
            const recordStream = createCompositeRecordStream();
            recordedChunksRef.current = [];
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
                ? 'video/webm;codecs=vp9,opus'
                : MediaRecorder.isTypeSupported('video/webm')
                ? 'video/webm'
                : 'video/mp4';

            const mediaRecorder = new MediaRecorder(recordStream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                if (canvasAnimRef.current) cancelAnimationFrame(canvasAnimRef.current);
                const blob = new Blob(recordedChunksRef.current, { type: mimeType });
                setRecordedBlob(blob);
                setShowRecordingModal(true);
                setIsRecording(false);
                if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

                // Auto-upload immediately in background so recordings are never lost
                const targetId = session?.id || activeRoomIdRef.current || params.code;
                try {
                    const finalDuration = Math.max(recordingTime, 1);
                    const file = new File([blob], `meeting_${targetId}_${Date.now()}.webm`, { type: 'video/webm' });
                    await meetingAPI.uploadRecording(targetId, file, finalDuration);
                    toast.success('Recording saved to session records!', { icon: '💾' });
                } catch (saveErr) {
                    console.log('Background upload on stop error:', saveErr);
                }
            };

            mediaRecorder.start(1000);
            setIsRecording(true);
            setRecordingTime(0);

            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            toast.success('Meeting recording started', { icon: '🎙️' });
        } catch (err) {
            console.error('Start recording error:', err);
            toast.error('Failed to start recording');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            toast('Processing and saving recording...', { icon: '⏳' });
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
        const targetId = session?.id || activeRoomIdRef.current || params.code;
        try {
            setIsUploadingRecording(true);
            setUploadProgress(20);

            const timer1 = setTimeout(() => setUploadProgress(50), 300);
            const timer2 = setTimeout(() => setUploadProgress(80), 700);

            const finalDuration = Math.max(recordingTime, 1);
            const file = new File([recordedBlob], `meeting_${targetId}_${Date.now()}.webm`, { type: 'video/webm' });
            await meetingAPI.uploadRecording(targetId, file, finalDuration);

            clearTimeout(timer1);
            clearTimeout(timer2);
            setUploadProgress(100);

            setTimeout(() => {
                setIsUploadingRecording(false);
                setUploadProgress(0);
                toast.success('Recording saved to session records!');
                setShowRecordingModal(false);
                setRecordedBlob(null);
            }, 500);
        } catch (err) {
            setIsUploadingRecording(false);
            setUploadProgress(0);
            console.error('Failed to save recording:', err);
            toast.error('Failed to save recording');
        }
    };

    // =========================================================================
    // 6. LEAVE MEETING WITH 5-SECOND COUNTDOWN & CANCEL
    // =========================================================================
    const handleInitiateLeave = () => {
        setLeaveCountdown(5);
        setShowLeaveConfirmModal(true);

        if (leaveIntervalRef.current) clearInterval(leaveIntervalRef.current);
        leaveIntervalRef.current = setInterval(() => {
            setLeaveCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(leaveIntervalRef.current);
                    executeLeaveMeeting();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleCancelLeave = () => {
        if (leaveIntervalRef.current) clearInterval(leaveIntervalRef.current);
        setShowLeaveConfirmModal(false);
        setLeaveCountdown(5);
        toast('Stayed in meeting', { icon: '🛡️', duration: 1500 });
    };

    const executeLeaveMeeting = async () => {
        if (leaveIntervalRef.current) clearInterval(leaveIntervalRef.current);
        setShowLeaveConfirmModal(false);

        if (isRecording && mediaRecorderRef.current) {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {
                console.log('Error stopping recorder on leave:', e);
            }
        }

        if (isInstructor) {
            try {
                await meetingAPI.completeSession(activeRoomIdRef.current, {
                    marksObtained: 0,
                    maxMarks: 20,
                    examinerRemarks: 'Meeting completed'
                }).catch(() => {});
                socketRef.current?.emit('meeting:end-session', { roomId: activeRoomIdRef.current });
            } catch (e) {
                console.error('End session error:', e);
            }
        }

        cleanup();
        toast.success('Left meeting room');
        router.push('/meetings');
    };

    // =========================================================================
    // 7. COPY INVITATION DETAILS
    // =========================================================================
    const getInviteUrl = () => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/meeting/${params.code}`;
        }
        return `https://domain/meeting/${params.code}`;
    };

    const copyToClipboard = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedInfoField(fieldName);
        toast.success(`${fieldName} copied to clipboard!`, { icon: '📋' });
        setTimeout(() => setCopiedInfoField(''), 2000);
    };

    const copyFullInvitation = () => {
        const title = session?.submission?.assignment?.title || session?.title || 'Online Meeting Session';
        const hostName = session?.host ? `${session.host.firstName} ${session.host.lastName}` : 'Instructor';
        const inviteText = `Join Lab Record Manager Meeting
Topic: ${title}
Host: ${hostName}
Meeting ID: ${displayRoomCode}
Passcode: ${meetingPasscode}
Link: ${getInviteUrl()}`;

        navigator.clipboard.writeText(inviteText);
        setCopiedInfoField('full');
        toast.success('Full invitation copied to clipboard!', { icon: '🎉' });
        setTimeout(() => setCopiedInfoField(''), 2000);
    };

    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

    // =========================================================================
    // ZOOM-STYLE WAITING ROOM SCREEN FOR STUDENTS / WAITING PARTICIPANTS
    // =========================================================================
    if (isWaitingInRoom) {
        return (
            <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden text-white font-sans select-none">
                <div className="absolute w-96 h-96 bg-primary-600/20 rounded-full blur-3xl -top-20 -left-20 animate-pulse pointer-events-none" />
                <div className="absolute w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl -bottom-20 -right-20 animate-pulse pointer-events-none" />

                <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center space-y-6 z-10 animate-in fade-in zoom-in-95">
                    <div className="relative flex items-center justify-center">
                        <span className="w-20 h-20 rounded-full bg-primary-500/20 animate-ping absolute" />
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center shadow-xl border border-primary-400/40">
                            <Coffee className="w-8 h-8 text-white animate-bounce" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            Please wait, the meeting host will let you in soon.
                        </h2>
                        <p className="text-xs text-slate-400">
                            You are in the waiting room. The instructor has been notified of your presence.
                        </p>
                    </div>

                    <div className="w-full bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 text-left space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 uppercase font-semibold">Session</span>
                            <span className="text-xs font-mono text-primary-400 font-bold">{displayRoomCode}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-200">
                            {session?.submission?.assignment?.title || session?.title || 'Live Meeting Session'}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <User className="w-3.5 h-3.5 text-primary-400" />
                            <span>Host: {session?.host ? `${session.host.firstName} ${session.host.lastName}` : 'Instructor'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Connected to waiting room</span>
                    </div>

                    <button
                        onClick={() => router.push('/meetings')}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition"
                    >
                        Leave Waiting Room
                    </button>
                </div>
            </div>
        );
    }

    const remoteList = Array.from(remoteParticipants.values());
    const totalParticipants = 1 + remoteList.length;

    // Find if someone is sharing screen
    const remoteSharingUser = remoteList.find(p => p.isScreenSharing);
    const hasActiveScreenShare = isScreenSharing || !!remoteSharingUser;
    const activeScreenStream = isScreenSharing ? localStream : remoteSharingUser?.stream;

    // Compute offline participants from targetClass or targetStudent
    const activeUserIds = new Set([
        user?.id,
        ...remoteList.map(p => p.userId || p.id),
        ...waitingParticipants.map(w => w.userId || w.id)
    ]);

    const allInvitedStudents = [];
    if (session?.targetStudent) {
        allInvitedStudents.push(session.targetStudent);
    }
    if (session?.targetClass?.enrollments) {
        session.targetClass.enrollments.forEach(e => {
            if (e.student) allInvitedStudents.push(e.student);
        });
    }

    const offlineList = allInvitedStudents.filter(s => !activeUserIds.has(s.id));

    // Filter participants for Participants tab search
    const filteredInMeetingList = remoteList.filter(p =>
        p.name.toLowerCase().includes(participantSearchQuery.toLowerCase()) ||
        p.role.toLowerCase().includes(participantSearchQuery.toLowerCase())
    );

    const filteredWaitingList = waitingParticipants.filter(w =>
        w.name.toLowerCase().includes(participantSearchQuery.toLowerCase())
    );

    const filteredOfflineList = offlineList.filter(o =>
        `${o.firstName} ${o.lastName}`.toLowerCase().includes(participantSearchQuery.toLowerCase()) ||
        (o.admissionNumber && o.admissionNumber.toLowerCase().includes(participantSearchQuery.toLowerCase()))
    );

    // Controls dock positioning classes
    const dockClasses = {
        bottom: 'bottom-4 left-1/2 -translate-x-1/2 flex-row',
        top: 'top-16 left-1/2 -translate-x-1/2 flex-row',
        left: 'left-4 top-1/2 -translate-y-1/2 flex-col',
        right: 'right-4 top-1/2 -translate-y-1/2 flex-col'
    }[controlsDock] || 'bottom-4 left-1/2 -translate-x-1/2 flex-row';

    return (
        <div className="relative w-screen h-screen bg-slate-950 text-white overflow-hidden select-none font-sans flex flex-col">
            {/* ========================================================================= */}
            {/* LAYER 0 (BASE LAYER): THE THREE PRESENTATION SPACES                       */}
            {/* SPACE 1: WHITEBOARD MAXIMIZED                                             */}
            {/* SPACE 2: SHARED SCREEN MAXIMIZED                                          */}
            {/* SPACE 3: VC GALLERY TILES MAXIMIZED                                       */}
            {/* ========================================================================= */}
            <div className="relative w-full h-full flex-1 overflow-hidden z-0">
                {/* 1. WHITEBOARD SPACE */}
                {activeSpace === 'whiteboard' && (
                    <div className="absolute inset-0 w-full h-full z-0 bg-slate-900 animate-in fade-in">
                        <Whiteboard
                            width={typeof window !== 'undefined' ? window.innerWidth : 1280}
                            height={typeof window !== 'undefined' ? window.innerHeight : 800}
                            isFullscreen={isFullscreen}
                            onClose={() => switchActiveSpace('vc_tiles')}
                            onSave={() => toast.success('Whiteboard snapshot saved!')}
                            isMeetingMode={true}
                            showCameraControls={false}
                            isInstructor={isInstructor}
                            socket={socketRef.current}
                            sessionId={activeRoomIdRef.current || params.code}
                            isSharing={true}
                            whiteboardId={session?.id || params.code}
                            userName={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'User'}
                            userIdentifier={user?.studentId || user?.admissionNumber || user?.id?.slice(0, 8) || ''}
                            permissions={{
                                canDraw: isInstructor ? true : canDrawOnWhiteboard,
                                canShareAudio: isAudioEnabled,
                                canShareVideo: isVideoEnabled
                            }}
                            isStudent={!isInstructor}
                        />
                    </div>
                )}

                {/* 2. SHARED SCREEN SPACE (Flicker-Free Presenter) */}
                {activeSpace === 'screen_share' && (
                    <div className="w-full h-full p-4 flex flex-col items-center justify-center bg-slate-950 animate-in fade-in">
                        <ScreenSharePresenter
                            stream={activeScreenStream}
                            isLocal={isScreenSharing}
                            presenterName={remoteSharingUser?.name}
                            onStartShare={toggleScreenShare}
                            onBackToGallery={() => switchActiveSpace('vc_tiles')}
                        />
                    </div>
                )}

                {/* FLOATING DRAGGABLE / MINIMIZABLE PIP VIDEO TILES (For Whiteboard & Screen Share) */}
                {(activeSpace === 'whiteboard' || activeSpace === 'screen_share') && (
                    <div
                        style={{
                            transform: `translate(${floatingVideoPos.x}px, ${floatingVideoPos.y}px)`,
                            cursor: isDraggingFloatingVideo ? 'grabbing' : 'default'
                        }}
                        className="fixed top-16 right-6 z-30 transition-shadow select-none shadow-2xl rounded-2xl border border-slate-700/80 bg-slate-900/95 backdrop-blur-md overflow-hidden max-w-[90vw]"
                    >
                        {/* Drag Handle & Minimize Header */}
                        <div
                            onMouseDown={handleFloatingDragStart}
                            className="flex items-center justify-between px-3 py-1.5 bg-slate-800/90 border-b border-slate-700/60 cursor-grab active:cursor-grabbing text-xs text-slate-300 gap-3"
                        >
                            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                                <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                                <span>Live Video Strip</span>
                            </div>
                            <button
                                onClick={() => setIsFloatingVideoMinimized(!isFloatingVideoMinimized)}
                                className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md transition"
                                title={isFloatingVideoMinimized ? 'Expand Video Feeds' : 'Minimize Video Feeds'}
                            >
                                {isFloatingVideoMinimized ? <Maximize2 className="w-3.5 h-3.5 text-primary-400" /> : <Minimize2 className="w-3.5 h-3.5" />}
                            </button>
                        </div>

                        {/* Video Tiles (Presenter / Host + Active Speakers) */}
                        {!isFloatingVideoMinimized ? (
                            <div className="p-2 flex gap-2 overflow-x-auto max-w-[460px] hide-scrollbar">
                                <div className="w-40 h-28 shrink-0 rounded-xl overflow-hidden shadow-md border border-slate-700">
                                    <VideoTile
                                        stream={localStream}
                                        isLocal={true}
                                        isCameraOn={isVideoEnabled}
                                        isMicOn={isAudioEnabled}
                                        isScreenSharing={isScreenSharing}
                                        name={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'You'}
                                        role={user?.role}
                                        isSpeaking={isLocalSpeaking}
                                        compact={true}
                                        className="w-full h-full"
                                    />
                                </div>
                                {remoteList.map((participant) => (
                                    <div key={participant.socketId} className="w-40 h-28 shrink-0 rounded-xl overflow-hidden shadow-md border border-slate-700">
                                        <VideoTile
                                            stream={participant.stream}
                                            isLocal={false}
                                            isCameraOn={participant.isCameraOn}
                                            isMicOn={participant.isMicOn}
                                            isScreenSharing={participant.isScreenSharing}
                                            name={participant.name}
                                            role={participant.role}
                                            isSpeaking={participant.isSpeaking}
                                            compact={true}
                                            className="w-full h-full"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="px-3 py-1.5 text-[11px] text-slate-300 font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span>{1 + remoteList.length} Active Video Feeds (Minimized)</span>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. VC GALLERY TILES SPACE */}
                {activeSpace === 'vc_tiles' && (
                    <div className="w-full h-full p-4 flex items-center justify-center animate-in fade-in">
                        {totalParticipants === 1 ? (
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

                                {remoteList.map((participant) => (
                                    <div
                                        key={participant.socketId}
                                        onClick={() => handleOpenDirectChat(participant)}
                                        className="w-full h-full cursor-pointer group relative"
                                        title="Click to chat directly with participant"
                                    >
                                        <VideoTile
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
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition bg-slate-900/90 text-white text-[10px] px-2 py-1 rounded-lg border border-slate-700 pointer-events-none flex items-center gap-1 shadow-lg">
                                            <MessageSquare className="w-3 h-3 text-primary-400" />
                                            <span>Chat</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* LAYER 1 (FLOATING OVERLAYS): MINIMIZED FLOATING TILES FOR OTHER SPACES    */}
            {/* ========================================================================= */}
            {/* FLOATING VC VIDEO PALETTE (When Whiteboard or Screen Share is maximized) */}
            {activeSpace !== 'vc_tiles' && (
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
                    <div
                        onPointerDown={handleVideoPalettePointerDown}
                        onPointerMove={handleVideoPalettePointerMove}
                        onPointerUp={handleVideoPalettePointerUp}
                        className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 shadow-2xl text-xs cursor-grab active:cursor-grabbing touch-none"
                    >
                        <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                        <button
                            onClick={() => switchActiveSpace('vc_tiles')}
                            className="flex items-center gap-1 text-slate-200 hover:text-primary-300 font-medium transition"
                            title="Maximize Video Gallery"
                        >
                            <LayoutGrid className="w-3.5 h-3.5 text-primary-400" />
                            {totalParticipants} in call
                        </button>
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

                    {!isVideoPaletteMinimized && (
                        <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-1">
                            <div className="w-48 h-32 rounded-xl overflow-hidden shadow-2xl border border-slate-700 relative group">
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
                                <button
                                    onClick={() => switchActiveSpace('vc_tiles')}
                                    className="absolute bottom-1.5 right-1.5 p-1 bg-slate-900/80 hover:bg-primary-600 text-white rounded-md text-[10px] border border-slate-700 opacity-0 group-hover:opacity-100 transition"
                                    title="Maximize Gallery"
                                >
                                    <Maximize2 className="w-3 h-3" />
                                </button>
                            </div>

                            {remoteList.map((p) => (
                                <div
                                    key={p.socketId}
                                    onClick={() => handleOpenDirectChat(p)}
                                    className="w-48 h-32 rounded-xl overflow-hidden shadow-2xl border border-slate-700 cursor-pointer relative group"
                                    title="Click to chat"
                                >
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
                                    <div className="absolute inset-0 bg-primary-600/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                                        <span className="bg-slate-900/90 text-white text-[10px] px-2 py-1 rounded-full border border-slate-600 flex items-center gap-1 shadow-lg">
                                            <MessageSquare className="w-3 h-3 text-primary-400" /> Chat
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TOP BAR HEADER BADGE (Title + Clock + Info/Invite + Space Switcher) */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5 pointer-events-auto">
                <button
                    onClick={handleInitiateLeave}
                    className="bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700/60 text-slate-400 hover:text-white hover:bg-red-500/20 transition shadow-lg"
                    title="Leave Meeting"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/60 shadow-lg flex items-center gap-3">
                    <div>
                        <h2 className="text-white text-xs md:text-sm font-semibold leading-tight flex items-center gap-2">
                            <span>{session?.submission?.assignment?.title || session?.title || 'Live Meeting Session'}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </h2>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>ID: <strong className="text-slate-200 font-mono">{displayRoomCode}</strong></span>
                        </div>
                    </div>

                    <div className="h-5 w-[1px] bg-slate-700" />

                    {/* Timer */}
                    <div className="flex items-center gap-1 font-mono text-xs text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-primary-400" />
                        <span>{formatTimer(elapsedTime)}</span>
                    </div>

                    {/* Info / Invite Details Button */}
                    <button
                        onClick={() => setShowMeetingInfoModal(true)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-primary-400 hover:text-white rounded-lg border border-slate-700 transition flex items-center gap-1 text-xs font-semibold shadow"
                        title="Meeting Details, Passcode & Invitation Link"
                    >
                        <Shield className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Details</span>
                    </button>

                    {/* Recording Badge */}
                    {isRecording && (
                        <div className="flex items-center gap-1.5 bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-lg text-xs font-mono animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <span>REC {formatTimer(recordingTime)}</span>
                        </div>
                    )}
                </div>

                {/* 3 Presentation Spaces Quick Switcher */}
                <div className="hidden lg:flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-lg gap-1">
                    <button
                        onClick={() => switchActiveSpace('vc_tiles')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                            activeSpace === 'vc_tiles' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Maximize Video Gallery"
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Gallery</span>
                    </button>
                    <button
                        onClick={() => switchActiveSpace('whiteboard')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                            activeSpace === 'whiteboard' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Maximize Whiteboard"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Whiteboard</span>
                    </button>
                    <button
                        onClick={() => switchActiveSpace('screen_share')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                            activeSpace === 'screen_share' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Maximize Screen Share"
                    >
                        <MonitorUp className="w-3.5 h-3.5" />
                        <span>Screen</span>
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* LAYER 2 (FLOATING OVERLAY): ZOOM-STYLE CHAT & PARTICIPANTS WINDOW         */}
            {/* ========================================================================= */}
            {showChat && (
                <div
                    style={{
                        position: 'fixed',
                        left: chatPos.x !== null ? `${chatPos.x}px` : undefined,
                        right: chatPos.x === null ? '1rem' : undefined,
                        top: chatPos.y !== null ? `${chatPos.y}px` : undefined,
                        bottom: chatPos.y === null ? '5rem' : undefined,
                        zIndex: 35
                    }}
                    className="w-88 md:w-96 h-[540px] bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden pointer-events-auto animate-in fade-in select-none"
                >
                    {/* Draggable Header with Tab Switcher */}
                    <div className="border-b border-slate-800 bg-slate-800/80 flex items-center justify-between px-3 py-2">
                        <div
                            onPointerDown={handleChatPointerDown}
                            onPointerMove={handleChatPointerMove}
                            onPointerUp={handleChatPointerUp}
                            className="flex items-center gap-2 cursor-grab active:cursor-grabbing touch-none flex-1 py-1"
                        >
                            <GripVertical className="w-4 h-4 text-slate-400" />
                            <div className="flex items-center bg-slate-950/60 p-0.5 rounded-lg border border-slate-700/60">
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => {
                                        setActiveSidePanelTab('chat');
                                        setUnreadChatCount(0);
                                    }}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                                        activeSidePanelTab === 'chat'
                                            ? 'bg-primary-600 text-white shadow'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Chat</span>
                                    {unreadChatCount > 0 && activeSidePanelTab !== 'chat' && (
                                        <span className="bg-red-500 text-white text-[9px] px-1 rounded-full font-bold">
                                            {unreadChatCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => setActiveSidePanelTab('participants')}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                                        activeSidePanelTab === 'participants'
                                            ? 'bg-primary-600 text-white shadow'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    <span>Participants ({totalParticipants})</span>
                                    {waitingParticipants.length > 0 && (
                                        <span className="bg-amber-500 text-slate-950 text-[9px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                                            {waitingParticipants.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => setActiveSidePanelTab('invite')}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                                        activeSidePanelTab === 'invite'
                                            ? 'bg-primary-600 text-white shadow'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>Invite</span>
                                </button>
                            </div>
                        </div>

                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowChat(false);
                            }}
                            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition"
                            title="Close Window"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>

                    {/* TAB 1: CHAT */}
                    {activeSidePanelTab === 'chat' && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* In-Chat Quick Action Banner */}
                            <div className="px-3 py-1.5 bg-slate-800/60 border-b border-slate-700/60 flex items-center justify-between text-xs">
                                <button
                                    onClick={() => setActiveSidePanelTab('invite')}
                                    className="text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1 transition"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>+ Invite Participants</span>
                                </button>
                                <button
                                    onClick={handleShareInviteInChat}
                                    className="text-[10px] text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 px-2 py-0.5 rounded-lg border border-slate-600/40 transition"
                                    title="Post meeting details in chat"
                                >
                                    Post Info in Chat
                                </button>
                            </div>

                            <div className="px-3 py-2 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-medium">To:</span>
                                <select
                                    value={chatRecipient.id}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === 'everyone') {
                                            setChatRecipient({ id: 'everyone', name: 'Everyone (in Meeting)' });
                                        } else {
                                            const p = remoteList.find(x => (x.socketId === val || x.id === val || x.userId === val));
                                            if (p) setChatRecipient({ id: val, name: p.name });
                                        }
                                    }}
                                    className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-primary-300 font-medium focus:outline-none focus:ring-1 focus:ring-primary-500"
                                >
                                    <option value="everyone">Everyone (in Meeting)</option>
                                    {remoteList.map(p => (
                                        <option key={p.socketId} value={p.socketId}>
                                            {p.name} (Direct Message)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                                {visibleMessages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-4">
                                        <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                                        <p className="text-xs">No messages yet.</p>
                                        <p className="text-[10px] text-slate-500">Send a public message or direct message a participant.</p>
                                    </div>
                                ) : (
                                    visibleMessages.map((msg) => {
                                        const isMe = msg.senderId === user?.id || msg.senderSocketId === mySocketId;
                                        const isDirect = msg.recipientId && msg.recipientId !== 'everyone';

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                            >
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="text-[11px] font-semibold text-slate-300">
                                                        {isMe ? 'You' : msg.sender}
                                                    </span>
                                                    {isDirect && (
                                                        <span className="bg-primary-500/20 text-primary-300 border border-primary-500/30 text-[9px] px-1.5 py-0.2 rounded font-semibold">
                                                            Direct
                                                        </span>
                                                    )}
                                                    <span className="text-[9px] text-slate-500">{msg.time}</span>
                                                </div>
                                                <div
                                                    className={`px-3 py-2 rounded-2xl text-xs max-w-[85%] break-words ${
                                                        isMe
                                                            ? 'bg-primary-600 text-white rounded-tr-none'
                                                            : isDirect
                                                            ? 'bg-indigo-950/80 text-indigo-100 border border-indigo-700/60 rounded-tl-none'
                                                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                                                    }`}
                                                >
                                                    {msg.text}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <form onSubmit={sendChatMessage} className="p-2.5 border-t border-slate-800 bg-slate-800/30 flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={chatRecipient.id === 'everyone' ? 'Message everyone...' : `Message ${chatRecipient.name} (Direct)...`}
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="p-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white rounded-xl transition"
                                    title="Send Message"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </form>
                        </div>
                    )}

                    {/* TAB 2: PARTICIPANTS (IN MEETING, WAITING ROOM, OFFLINE) */}
                    {activeSidePanelTab === 'participants' && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-2.5 border-b border-slate-800 bg-slate-800/40">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={participantSearchQuery}
                                        onChange={(e) => setParticipantSearchQuery(e.target.value)}
                                        placeholder="Find participant..."
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
                                {/* SECTION 1: WAITING ROOM */}
                                {waitingParticipants.length > 0 && (
                                    <div className="space-y-2 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>Waiting Room ({waitingParticipants.length})</span>
                                            </div>
                                            {isInstructor && (
                                                <button
                                                    onClick={handleAdmitAll}
                                                    className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-md text-[10px] transition"
                                                >
                                                    Admit All
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            {filteredWaitingList.map(w => (
                                                <div key={w.socketId} className="flex items-center justify-between p-1.5 rounded-xl bg-slate-900/60 border border-slate-800">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold">
                                                            {w.name.slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-white leading-tight">{w.name}</p>
                                                            <span className="text-[9px] text-amber-400 font-semibold uppercase">Waiting</span>
                                                        </div>
                                                    </div>
                                                    {isInstructor && (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleAdmitUser(w.socketId)}
                                                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-medium transition"
                                                                title="Admit to Meeting"
                                                            >
                                                                Admit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDenyUser(w.socketId)}
                                                                className="px-1.5 py-1 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg text-[10px] transition"
                                                                title="Deny / Remove"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* SECTION 2: IN MEETING */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span>In Meeting ({totalParticipants})</span>
                                        </div>
                                    </div>

                                    {/* Local User */}
                                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-[10px] font-bold text-white">
                                                You
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-white leading-tight">
                                                    {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'You'} (Me)
                                                </p>
                                                <span className="text-[10px] text-primary-400 uppercase font-semibold">
                                                    {user?.role} {isInstructor && '• Host'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={toggleAudio}
                                                className={`p-1.5 rounded-lg transition ${isAudioEnabled ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-red-400 hover:bg-red-500/20'}`}
                                                title={isAudioEnabled ? 'Mute my mic' : 'Unmute my mic'}
                                            >
                                                {isAudioEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                                            </button>
                                            <button
                                                onClick={toggleVideo}
                                                className={`p-1.5 rounded-lg transition ${isVideoEnabled ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-slate-500 hover:bg-slate-700'}`}
                                                title={isVideoEnabled ? 'Stop my video' : 'Start my video'}
                                            >
                                                {isVideoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Remote Participants */}
                                    {filteredInMeetingList.map((p) => (
                                        <div
                                            key={p.socketId}
                                            className="flex items-center justify-between p-2 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:border-slate-600 transition"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-200">
                                                    {p.name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-white leading-tight">{p.name}</p>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                                        <span className="uppercase">{p.role}</span>
                                                        {p.isScreenSharing && (
                                                            <span className="text-emerald-400 font-semibold">• Sharing</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-0.5">
                                                <button
                                                    onClick={() => handleOpenDirectChat(p)}
                                                    className="p-1.5 text-slate-400 hover:text-primary-400 hover:bg-slate-800 rounded-lg transition"
                                                    title="Direct message"
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                </button>

                                                {isInstructor && (
                                                    <>
                                                        <button
                                                            onClick={() => handleHostMuteParticipant(p.socketId, p.isMicOn)}
                                                            className={`p-1.5 rounded-lg transition ${p.isMicOn ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-red-400 hover:bg-red-500/20'}`}
                                                            title={p.isMicOn ? 'Mute participant' : 'Ask to unmute'}
                                                        >
                                                            {p.isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleHostVideoParticipant(p.socketId, p.isCameraOn)}
                                                            className={`p-1.5 rounded-lg transition ${p.isCameraOn ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-slate-500 hover:bg-slate-700'}`}
                                                            title={p.isCameraOn ? 'Stop video' : 'Ask for video'}
                                                        >
                                                            {p.isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleHostToggleDraw(p.socketId, p.canDraw !== false)}
                                                            className={`p-1.5 rounded-lg transition ${p.canDraw !== false ? 'text-primary-400 hover:bg-primary-500/20' : 'text-slate-500 hover:bg-slate-700'}`}
                                                            title={p.canDraw !== false ? 'Disable Whiteboard Drawing' : 'Allow Whiteboard Drawing'}
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* SECTION 3: OFFLINE / INVITED */}
                                {filteredOfflineList.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 px-1">
                                            <span className="w-2 h-2 rounded-full bg-slate-600" />
                                            <span>Invited / Offline ({filteredOfflineList.length})</span>
                                        </div>

                                        <div className="space-y-1.5">
                                            {filteredOfflineList.map(off => (
                                                <div key={off.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800/50 opacity-60 hover:opacity-100 transition">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-bold">
                                                            {off.firstName?.slice(0, 1) || 'S'}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-slate-300 leading-tight">
                                                                {off.firstName} {off.lastName}
                                                            </p>
                                                            <span className="text-[9px] text-slate-500">{off.admissionNumber || 'Student'}</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded font-mono">
                                                        Offline
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Host Actions Footer */}
                            {isInstructor && (
                                <div className="p-2.5 border-t border-slate-800 bg-slate-800/40 flex items-center justify-between gap-2">
                                    <button
                                        onClick={handleHostMuteAll}
                                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5"
                                    >
                                        <MicOff className="w-3 h-3 text-red-400" />
                                        Mute All
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: GLOBAL SEARCH & INVITE PARTICIPANTS */}
                    {activeSidePanelTab === 'invite' && (
                        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
                            {/* Search Header */}
                            <div className="p-3 border-b border-slate-800 bg-slate-800/50 space-y-2">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={inviteSearchQuery}
                                        onChange={(e) => setInviteSearchQuery(e.target.value)}
                                        placeholder="Search student, class, or group..."
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    {inviteSearchQuery && (
                                        <button
                                            onClick={() => setInviteSearchQuery('')}
                                            className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Filter Pills */}
                                <div className="flex gap-1 text-[10px]">
                                    {[
                                        { id: 'all', label: 'All' },
                                        { id: 'student', label: 'Students' },
                                        { id: 'class', label: 'Classes' },
                                        { id: 'group', label: 'Groups' }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setInviteFilter(f.id)}
                                            className={`px-2.5 py-1 rounded-lg font-medium transition ${
                                                inviteFilter === f.id
                                                    ? 'bg-primary-600 text-white'
                                                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Search Results List */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {loadingInvites && (
                                    <div className="flex items-center justify-center py-8 text-slate-400 text-xs gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                                        Searching school directory...
                                    </div>
                                )}

                                {!loadingInvites && !inviteSearchQuery && (
                                    <div className="space-y-3">
                                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-3 text-center space-y-2">
                                            <UserPlus className="w-8 h-8 mx-auto text-primary-400 opacity-80" />
                                            <p className="text-xs font-semibold text-white">Invite Anyone in Real-Time</p>
                                            <p className="text-[11px] text-slate-400">
                                                Search students, class sections, or study groups to send live meeting invites directly during the call.
                                            </p>
                                        </div>

                                        {/* Meeting Quick Details Box */}
                                        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 space-y-2">
                                            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Quick Meeting Details</p>
                                            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/80">
                                                <span className="text-slate-400">Room ID</span>
                                                <span className="font-mono font-bold text-primary-400">{formatRoomCode(displayRoomCode || params.code)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/80">
                                                <span className="text-slate-400">Passcode</span>
                                                <span className="font-mono font-bold text-slate-200">{passcode}</span>
                                            </div>
                                            <button
                                                onClick={handleShareInviteInChat}
                                                className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow"
                                            >
                                                <Share2 className="w-3.5 h-3.5" />
                                                Share Invitation in Chat
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {!loadingInvites && inviteSearchQuery && (
                                    <>
                                        {/* Students Section */}
                                        {inviteResults.students?.length > 0 && (
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                                                    Students ({inviteResults.students.length})
                                                </p>
                                                {inviteResults.students.map(s => (
                                                    <div key={s.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-primary-900/60 text-primary-300 border border-primary-500/30 flex items-center justify-center text-[10px] font-bold">
                                                                {s.firstName?.[0]}{s.lastName?.[0]}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold text-white leading-tight">
                                                                    {s.firstName} {s.lastName}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400">
                                                                    {s.admissionNumber || s.studentId || s.email}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleSendMeetingInvite('student', s.id, `${s.firstName} ${s.lastName}`)}
                                                            disabled={invitedMap[s.id]}
                                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition ${
                                                                invitedMap[s.id]
                                                                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                                                                    : 'bg-primary-600 hover:bg-primary-500 text-white shadow'
                                                            }`}
                                                        >
                                                            {invitedMap[s.id] ? (
                                                                <>
                                                                    <Check className="w-3 h-3 text-emerald-400" />
                                                                    <span>Invited</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Send className="w-3 h-3" />
                                                                    <span>Invite</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Classes Section */}
                                        {inviteResults.classes?.length > 0 && (
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                                                    Classes ({inviteResults.classes.length})
                                                </p>
                                                {inviteResults.classes.map(c => (
                                                    <div key={c.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold">
                                                                📚
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold text-white leading-tight">
                                                                    Class: {c.name}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400">
                                                                    {c.section ? `Section: ${c.section}` : 'Entire Class'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleSendMeetingInvite('class', c.id, `Class ${c.name}`)}
                                                            disabled={invitedMap[c.id]}
                                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition ${
                                                                invitedMap[c.id]
                                                                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                                                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
                                                            }`}
                                                        >
                                                            {invitedMap[c.id] ? (
                                                                <>
                                                                    <Check className="w-3 h-3 text-emerald-400" />
                                                                    <span>Invited</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Users className="w-3 h-3" />
                                                                    <span>Invite Class</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Groups Section */}
                                        {inviteResults.groups?.length > 0 && (
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                                                    Groups ({inviteResults.groups.length})
                                                </p>
                                                {inviteResults.groups.map(g => (
                                                    <div key={g.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-purple-900/60 text-purple-300 border border-purple-500/30 flex items-center justify-center text-[10px] font-bold">
                                                                👥
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold text-white leading-tight">
                                                                    {g.name}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400">
                                                                    Study Group
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleSendMeetingInvite('group', g.id, g.name)}
                                                            disabled={invitedMap[g.id]}
                                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition ${
                                                                invitedMap[g.id]
                                                                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                                                                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow'
                                                            }`}
                                                        >
                                                            {invitedMap[g.id] ? (
                                                                <>
                                                                    <Check className="w-3 h-3 text-emerald-400" />
                                                                    <span>Invited</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Users className="w-3 h-3" />
                                                                    <span>Invite Group</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {inviteResults.students?.length === 0 && inviteResults.classes?.length === 0 && inviteResults.groups?.length === 0 && (
                                            <div className="py-8 text-center text-slate-500 text-xs">
                                                No students, classes, or groups found matching "{inviteSearchQuery}"
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* LAYER 2 (FLOATING OVERLAY): MEETING DETAILS & INVITATION MODAL            */}
            {/* ========================================================================= */}
            {showMeetingInfoModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center border border-primary-500/30">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Meeting Information</h3>
                                    <p className="text-[11px] text-slate-400">Share these credentials to invite participants</p>
                                </div>
                            </div>
                            <button onClick={() => setShowMeetingInfoModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Meeting Details List */}
                        <div className="space-y-3 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60">
                            {/* Topic */}
                            <div className="space-y-0.5">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Topic</span>
                                <p className="text-xs font-medium text-white">{session?.submission?.assignment?.title || session?.title || 'Meeting Session'}</p>
                            </div>

                            {/* Meeting ID */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                                <div>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Meeting ID</span>
                                    <p className="text-xs font-mono font-bold text-primary-300">{displayRoomCode}</p>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(displayRoomCode, 'Meeting ID')}
                                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
                                >
                                    {copiedInfoField === 'Meeting ID' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>Copy</span>
                                </button>
                            </div>

                            {/* Passcode */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                                <div>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Passcode</span>
                                    <p className="text-xs font-mono font-bold text-emerald-400">{meetingPasscode}</p>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(meetingPasscode, 'Passcode')}
                                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
                                >
                                    {copiedInfoField === 'Passcode' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>Copy</span>
                                </button>
                            </div>

                            {/* Direct Invite Link */}
                            <div className="pt-2 border-t border-slate-700/50 space-y-1.5">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Invite Link</span>
                                <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-700">
                                    <p className="text-[11px] font-mono text-slate-300 truncate flex-1">{getInviteUrl()}</p>
                                    <button
                                        onClick={() => copyToClipboard(getInviteUrl(), 'Invite Link')}
                                        className="px-2.5 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
                                    >
                                        {copiedInfoField === 'Invite Link' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>Copy Link</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Copy Full Invitation Action */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={copyFullInvitation}
                                className="flex-1 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg"
                            >
                                <Share2 className="w-4 h-4" />
                                {copiedInfoField === 'full' ? 'Invitation Copied!' : 'Copy Full Invitation'}
                            </button>
                            <button
                                onClick={() => setShowMeetingInfoModal(false)}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* LAYER 2 (FLOATING OVERLAY): LEAVE MEETING WITH 5S COUNTDOWN MODAL         */}
            {/* ========================================================================= */}
            {showLeaveConfirmModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-5">
                        <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                            <span className="w-16 h-16 rounded-full bg-red-500/20 animate-ping absolute" />
                            <div className="w-16 h-16 rounded-full bg-red-600/30 border border-red-500/50 flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-red-400" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-base font-bold text-white">
                                {isInstructor ? 'End Meeting for All?' : 'Leave Meeting Session?'}
                            </h3>
                            <p className="text-xs text-slate-300">
                                You are about to leave this call. Exiting permanently in:
                            </p>
                        </div>

                        {/* Animated 5s Countdown Circle */}
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-800 border-2 border-red-500 text-xl font-bold font-mono text-white shadow-inner">
                            {leaveCountdown}s
                        </div>

                        <p className="text-[11px] text-slate-400">
                            Click <strong className="text-slate-200">Cancel</strong> to stay in the meeting room or leave immediately.
                        </p>

                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                onClick={handleCancelLeave}
                                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition flex items-center justify-center gap-2 shadow"
                            >
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                Cancel & Stay in Meeting
                            </button>

                            <button
                                onClick={executeLeaveMeeting}
                                className="w-full py-2 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
                            >
                                <Phone className="w-3.5 h-3.5 rotate-[135deg]" />
                                Leave Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* LAYER 2 (FLOATING OVERLAY): DEVICE SETTINGS MODAL                         */}
            {/* ========================================================================= */}
            {showDeviceSettings && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 md:left-24 md:translate-x-0 w-88 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl z-40 pointer-events-auto">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                        <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                            <Settings className="w-3.5 h-3.5 text-primary-400" />
                            Audio & Video Devices
                        </h3>
                        <button onClick={() => setShowDeviceSettings(false)} className="text-slate-400 hover:text-white">
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-2 mb-3">
                        <label className="text-[11px] font-medium text-slate-300 flex items-center justify-between">
                            <span>Camera Source</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${isVideoEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {isVideoEnabled ? 'ACTIVE' : 'OFF'}
                            </span>
                        </label>
                        <select
                            value={selectedCamera}
                            onChange={(e) => switchCamera(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-primary-500"
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

                    <div className="space-y-2">
                        <label className="text-[11px] font-medium text-slate-300 flex items-center justify-between">
                            <span>Microphone Source</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${isAudioEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {isAudioEnabled ? 'ACTIVE' : 'MUTED'}
                            </span>
                        </label>
                        <select
                            value={selectedMicrophone}
                            onChange={(e) => switchMicrophone(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:ring-1 focus:ring-primary-500"
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

                        <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[9px] text-slate-400">
                                <span>Input Level</span>
                                <span>{micLevel}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
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
            {/* RECORDING COMPLETION / UPLOAD PROGRESS MODAL                             */}
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

                        <p className="text-xs text-slate-300">
                            Your meeting recording is complete ({formatTimer(recordingTime)}). You can save it to the session record or download it directly.
                        </p>

                        {/* Upload Progress Bar */}
                        {isUploadingRecording && (
                            <div className="space-y-2 py-2 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-1.5 text-primary-300 font-medium">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Uploading recording to storage...
                                    </span>
                                    <span className="font-mono font-bold text-white">{uploadProgress}%</span>
                                </div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                onClick={saveRecordingToDatabase}
                                disabled={isUploadingRecording}
                                className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 shadow-lg"
                            >
                                <Save className="w-4 h-4" />
                                {isUploadingRecording ? 'Saving Recording...' : 'Save to Session Record'}
                            </button>
                            <button
                                onClick={downloadRecording}
                                disabled={isUploadingRecording}
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
            {/* LAYER 3 (FLOATING CONTROLS BAR): COMPACT SLEEK PILL WITH 4-EDGE DOCKING    */}
            {/* ========================================================================= */}
            <div className={`absolute ${dockClasses} z-30 pointer-events-auto flex items-center gap-1.5`}>
                {!isControlsHidden && (
                    <div className={`bg-slate-900/95 backdrop-blur-md px-2 py-1 rounded-full border border-slate-700/60 shadow-2xl flex items-center gap-1 ${
                        controlsDock === 'left' || controlsDock === 'right' ? 'flex-col' : 'flex-row'
                    }`}>
                        {/* Audio / Mic Toggle */}
                        <button
                            onClick={toggleAudio}
                            className={`p-1.5 rounded-full transition flex items-center justify-center ${
                                isAudioEnabled
                                    ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
                                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            }`}
                            title={isAudioEnabled ? 'Mute Mic' : 'Unmute Mic'}
                        >
                            {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                        </button>

                        {/* Video / Camera Toggle */}
                        <button
                            onClick={toggleVideo}
                            className={`p-1.5 rounded-full transition flex items-center justify-center ${
                                isVideoEnabled
                                    ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
                                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            }`}
                            title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
                        >
                            {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                        </button>

                        {/* Screen Share Toggle */}
                        <button
                            onClick={toggleScreenShare}
                            className={`p-1.5 rounded-full transition flex items-center justify-center ${
                                isScreenSharing || activeSpace === 'screen_share'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                            title={isScreenSharing ? 'Stop Screen Share' : 'Share / Maximize Screen'}
                        >
                            <MonitorUp className="w-4 h-4" />
                        </button>

                        {/* Whiteboard Toggle / Space Switcher */}
                        <button
                            onClick={() => switchActiveSpace(activeSpace === 'whiteboard' ? 'vc_tiles' : 'whiteboard')}
                            className={`p-1.5 rounded-full transition flex items-center justify-center ${
                                activeSpace === 'whiteboard'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                            title={activeSpace === 'whiteboard' ? 'Restore Gallery Space' : 'Maximize Whiteboard Space'}
                        >
                            <Pencil className="w-4 h-4" />
                        </button>

                        {/* VC Gallery Toggle / Space Switcher */}
                        <button
                            onClick={() => switchActiveSpace('vc_tiles')}
                            className={`p-1.5 rounded-full transition flex items-center justify-center ${
                                activeSpace === 'vc_tiles'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                            title="Maximize Video Gallery Space"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>

                        {/* In-Meeting Recording */}
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`p-1.5 rounded-full transition flex items-center justify-center ${
                                isRecording
                                    ? 'bg-red-600 text-white animate-pulse'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                            title={isRecording ? 'Stop Recording' : 'Record Meeting'}
                        >
                            <Radio className="w-4 h-4" />
                        </button>

                        {/* Meeting Info & Passcode */}
                        <button
                            onClick={() => setShowMeetingInfoModal(true)}
                            className="p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white rounded-full transition flex items-center justify-center"
                            title="Meeting Info, Passcode & Link"
                        >
                            <Info className="w-4 h-4" />
                        </button>

                        {/* Side Panel: Participants & Chat */}
                        <button
                            onClick={() => {
                                setShowChat(!showChat);
                                setUnreadChatCount(0);
                            }}
                            className={`p-1.5 rounded-full transition flex items-center justify-center relative ${
                                showChat ? 'bg-primary-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                            title="Chat & Participants"
                        >
                            <MessageSquare className="w-4 h-4" />
                            {unreadChatCount > 0 && !showChat && (
                                <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold animate-bounce">
                                    {unreadChatCount}
                                </span>
                            )}
                            {waitingParticipants.length > 0 && (
                                <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                                    {waitingParticipants.length}
                                </span>
                            )}
                        </button>

                        {/* Fullscreen Toggle Button */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white rounded-full transition flex items-center justify-center"
                            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen ? <Minimize2 className="w-4 h-4 text-primary-400" /> : <Maximize2 className="w-4 h-4" />}
                        </button>

                        {/* Device Settings */}
                        <button
                            onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                            className={`p-1.5 rounded-full transition flex items-center justify-center ${
                                showDeviceSettings ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                            title="Device Settings"
                        >
                            <Settings className="w-4 h-4" />
                        </button>

                        <div className={`bg-slate-700 ${controlsDock === 'left' || controlsDock === 'right' ? 'w-4 h-[1px] my-0.5' : 'h-4 w-[1px] mx-0.5'}`} />

                        {/* Dock Alignment Cycle Button */}
                        <button
                            onClick={() => {
                                const next = { bottom: 'left', left: 'top', top: 'right', right: 'bottom' };
                                const newDock = next[controlsDock] || 'bottom';
                                setControlsDock(newDock);
                                toast(`Controls docked to ${newDock.toUpperCase()}`, { duration: 1500 });
                            }}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition flex items-center justify-center"
                            title={`Controls Dock: ${controlsDock.toUpperCase()} (Click to cycle Top/Bottom/Left/Right)`}
                        >
                            <Move className="w-3.5 h-3.5 text-primary-400" />
                        </button>

                        {/* End / Leave Meeting (with 5-second countdown & cancel) */}
                        <button
                            onClick={handleInitiateLeave}
                            className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full transition flex items-center justify-center shadow-lg shadow-red-600/30"
                            title={isInstructor ? 'End Meeting for All' : 'Leave Meeting'}
                        >
                            <Phone className="w-4 h-4 rotate-[135deg]" />
                        </button>
                    </div>
                )}

                {/* Hide / Show Controls Toggle */}
                <button
                    onClick={() => setIsControlsHidden(!isControlsHidden)}
                    className="p-1 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full border border-slate-700/60 shadow-lg transition"
                    title={isControlsHidden ? 'Show Controls' : 'Hide Controls'}
                >
                    {isControlsHidden ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
            </div>
        </div>
    );
}
