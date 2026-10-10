'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import io from 'socket.io-client';
import {
    Video, Pencil, Clock, Bell, ArrowRightLeft, BookOpen,
    AlertCircle, Sparkles, CheckCircle, X, ChevronRight,
    ChevronDown, Volume2, VolumeX, Maximize2, Minimize2,
    ExternalLink, Check, Layers
} from 'lucide-react';

// Play subtle glass chime using Web Audio API (Zero external assets needed)
function playIslandChime() {
    try {
        if (typeof window === 'undefined') return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // A5

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880.00, now + 0.12);
        osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.28); // D6

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.12);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.45);
    } catch (e) {
        // Silently ignore browser audio autoplay restrictions
    }
}

// Play tactile chocolate snap sound when cells break apart
function playChocolateSnapSound() {
    try {
        if (typeof window === 'undefined') return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.08);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);

        const bufferSize = Math.floor(ctx.sampleRate * 0.06);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 850;
        filter.Q.value = 1.2;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.08, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
    } catch (e) {}
}

// Config per event type matching the app-wide glassmorphic theme
const TYPE_CONFIG = {
    meeting: {
        label: 'Live Meeting',
        icon: Video,
        glowColor: 'emerald',
        borderColor: 'border-emerald-500/50',
        badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        iconBg: 'bg-emerald-500/20 text-emerald-400',
        ringColor: 'bg-emerald-500',
        actionBtnBg: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950',
        gradient: 'from-emerald-950/70 via-slate-900/95 to-slate-950/95'
    },
    whiteboard: {
        label: 'Live Whiteboard',
        icon: Pencil,
        glowColor: 'amber',
        borderColor: 'border-amber-500/50',
        badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        iconBg: 'bg-amber-500/20 text-amber-400',
        ringColor: 'bg-amber-500',
        actionBtnBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
        gradient: 'from-amber-950/70 via-slate-900/95 to-slate-950/95'
    },
    timetable: {
        label: 'Period Starting',
        icon: Bell,
        glowColor: 'cyan',
        borderColor: 'border-cyan-500/50',
        badgeBg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
        iconBg: 'bg-cyan-500/20 text-cyan-400',
        ringColor: 'bg-cyan-500',
        actionBtnBg: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950',
        gradient: 'from-cyan-950/70 via-slate-900/95 to-slate-950/95'
    },
    shift: {
        label: 'Equipment Shift',
        icon: ArrowRightLeft,
        glowColor: 'violet',
        borderColor: 'border-violet-500/50',
        badgeBg: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
        iconBg: 'bg-violet-500/20 text-violet-400',
        ringColor: 'bg-violet-500',
        actionBtnBg: 'bg-violet-500 hover:bg-violet-400 text-slate-950',
        gradient: 'from-violet-950/70 via-slate-900/95 to-slate-950/95'
    },
    assignment: {
        label: 'Assignment',
        icon: BookOpen,
        glowColor: 'indigo',
        borderColor: 'border-indigo-500/50',
        badgeBg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        iconBg: 'bg-indigo-500/20 text-indigo-400',
        ringColor: 'bg-indigo-500',
        actionBtnBg: 'bg-indigo-500 hover:bg-indigo-400 text-white',
        gradient: 'from-indigo-950/70 via-slate-900/95 to-slate-950/95'
    },
    ticket: {
        label: 'Alert',
        icon: AlertCircle,
        glowColor: 'rose',
        borderColor: 'border-rose-500/50',
        badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        iconBg: 'bg-rose-500/20 text-rose-400',
        ringColor: 'bg-rose-500',
        actionBtnBg: 'bg-rose-500 hover:bg-rose-400 text-white',
        gradient: 'from-rose-950/70 via-slate-900/95 to-slate-950/95'
    },
    info: {
        label: 'Notice',
        icon: Sparkles,
        glowColor: 'sky',
        borderColor: 'border-sky-500/50',
        badgeBg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        iconBg: 'bg-sky-500/20 text-sky-400',
        ringColor: 'bg-sky-500',
        actionBtnBg: 'bg-sky-500 hover:bg-sky-400 text-slate-950',
        gradient: 'from-sky-950/70 via-slate-900/95 to-slate-950/95'
    },
    success: {
        label: 'Success',
        icon: CheckCircle,
        glowColor: 'emerald',
        borderColor: 'border-emerald-500/50',
        badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        iconBg: 'bg-emerald-500/20 text-emerald-400',
        ringColor: 'bg-emerald-500',
        actionBtnBg: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950',
        gradient: 'from-emerald-950/70 via-slate-900/95 to-slate-950/95'
    }
};

export default function DynamicIsland() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    const [queue, setQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const [progress, setProgress] = useState(100);
    const [isChocolateDissolving, setIsChocolateDissolving] = useState(false);

    const socketRef = useRef(null);
    const dismissTimerRef = useRef(null);
    const progressIntervalRef = useRef(null);

    // Current active notification
    const activeItem = queue[currentIndex] || null;

    // Remove notification by ID
    const removeNotification = useCallback((id) => {
        setQueue(prev => {
            const next = prev.filter(item => item.id !== id);
            if (next.length === 0) {
                setIsExpanded(false);
            }
            return next;
        });
        setCurrentIndex(prev => Math.max(0, Math.min(prev, Math.max(0, queue.length - 2))));
    }, [queue.length]);

    // Trigger tactile chocolate cells disappearance animation before removing notification
    const triggerChocolateDismiss = useCallback((id, callback) => {
        if (!id || isChocolateDissolving) return;
        setIsChocolateDissolving(true);
        playChocolateSnapSound();
        clearInterval(progressIntervalRef.current);
        clearTimeout(dismissTimerRef.current);

        setTimeout(() => {
            removeNotification(id);
            setIsChocolateDissolving(false);
            if (callback) callback();
        }, 750);
    }, [isChocolateDissolving, removeNotification]);

    // Push new notification to queue with audio chime and auto-open if high priority
    const addNotification = useCallback((notif) => {
        const item = {
            id: notif.id || ('island-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
            type: notif.type || 'info',
            title: notif.title || 'Notification',
            subtitle: notif.subtitle || '',
            message: notif.message || '',
            badge: notif.badge || null,
            duration: notif.duration !== undefined ? notif.duration : 7000,
            actionLabel: notif.actionLabel || null,
            onAction: notif.onAction || null,
            route: notif.route || null,
            data: notif.data || {},
            priority: notif.priority || 'normal',
            timestamp: notif.timestamp || new Date().toISOString()
        };

        // Play chime on incoming notification
        playIslandChime();

        setQueue(prev => {
            const exists = prev.some(existing => existing.id === item.id || (existing.title === item.title && existing.type === item.type));
            if (exists) return prev;
            return [item, ...prev];
        });

        setCurrentIndex(0);

        // Auto-expand on high priority
        if (item.priority === 'high' || item.type === 'meeting' || item.type === 'timetable') {
            setIsExpanded(true);
        }
    }, []);

    // Manage auto-dismiss timer and progress bar
    useEffect(() => {
        if (!activeItem || activeItem.duration === 0 || isChocolateDissolving) {
            setProgress(100);
            return;
        }

        const duration = activeItem.duration;
        const startTime = Date.now();
        setProgress(100);

        clearInterval(progressIntervalRef.current);
        clearTimeout(dismissTimerRef.current);

        progressIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remainingRatio = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remainingRatio);

            if (remainingRatio <= 0) {
                clearInterval(progressIntervalRef.current);
            }
        }, 50);

        dismissTimerRef.current = setTimeout(() => {
            triggerChocolateDismiss(activeItem.id);
        }, duration);

        return () => {
            clearInterval(progressIntervalRef.current);
            clearTimeout(dismissTimerRef.current);
        };
    }, [activeItem, isChocolateDissolving, triggerChocolateDismiss]);

    // Expose global test trigger for demoing chocolate cells disappear animation
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.__testChocolateIsland = (customMsg) => {
                addNotification({
                    type: 'info',
                    title: 'Chocolate Island Notification',
                    subtitle: 'Snap & Break Animation',
                    message: customMsg || 'Watch this centered notification break and dissolve into chocolate squares!',
                    actionLabel: 'Snap Cells',
                    priority: 'high',
                    duration: 7000
                });
            };
        }
        return () => {
            if (typeof window !== 'undefined') {
                delete window.__testChocolateIsland;
            }
        };
    }, [addNotification]);

    // Socket.io Real-Time Event Listeners
    useEffect(() => {
        if (!_hasHydrated || !isAuthenticated || !user?.id) return;

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001');

        try {
            const socket = io(socketUrl, {
                path: '/socket.io',
                transports: ['websocket', 'polling']
            });
            socketRef.current = socket;

            socket.on('connect', () => {
                if (user?.id) socket.emit('join-user', user.id);
                if (user?.classId) socket.emit('join-class', user.classId);
                if (user?.groups && Array.isArray(user.groups)) {
                    user.groups.forEach(g => socket.emit('join-group', g.id));
                }
            });

            // 1. Live Meeting Invitation
            socket.on('meeting:invitation-received', (data) => {
                addNotification({
                    type: 'meeting',
                    title: data?.title || 'Live Meeting Invitation',
                    subtitle: 'Hosted by ' + (data?.hostName || 'Instructor'),
                    message: data?.inviteMessage || 'You have been invited to join an active meeting room.',
                    actionLabel: 'Join Meeting',
                    route: '/meeting/' + (data?.roomCode || data?.meetingId),
                    priority: 'high',
                    duration: 12000,
                    data
                });
            });

            // 2. Whiteboard Shared
            socket.on('whiteboard:shared-with-you', (data) => {
                addNotification({
                    type: 'whiteboard',
                    title: 'Live Whiteboard Broadcast',
                    subtitle: data?.hostName ? ('Shared by ' + data.hostName) : 'Active Drawing Canvas',
                    message: 'Interactive Whiteboard session is now live for your class.',
                    actionLabel: 'Open Whiteboard',
                    route: data?.sessionId ? ('/whiteboard?session=' + data.sessionId) : '/whiteboard',
                    priority: 'normal',
                    duration: 9000,
                    data
                });
            });

            // 3. Timetable Period Alarm
            socket.on('timetable:period-starting', (data) => {
                addNotification({
                    type: 'timetable',
                    title: (data.subject || 'Class Period') + ' in 5 min',
                    subtitle: data.roomNumber ? ('Room ' + data.roomNumber + ' • ' + (data.className || '')) : (data.className || 'Class'),
                    message: data.message || 'Please proceed to your assigned laboratory or classroom.',
                    actionLabel: 'View Timetable',
                    route: '/timetable',
                    priority: 'high',
                    duration: 10000,
                    data
                });
            });

            // 4. Equipment Shift Request Updates
            socket.on('shift:completed', (data) => {
                addNotification({
                    type: 'shift',
                    title: 'Equipment Transfer Completed',
                    subtitle: (data?.itemNumber || 'Item') + ' → ' + (data?.toLabName || 'Destination Lab'),
                    message: data?.message || 'Equipment has been relocated and inventory updated.',
                    actionLabel: 'View Lab',
                    route: '/admin/labs',
                    priority: 'normal',
                    duration: 8000,
                    data
                });
            });

            // 5. In-App Notifications
            socket.on('notification:new', (data) => {
                addNotification({
                    type: data?.type || 'info',
                    title: data?.title || 'New Notification',
                    subtitle: data?.category || '',
                    message: data?.message || '',
                    actionLabel: data?.actionUrl ? 'View' : null,
                    route: data?.actionUrl || null,
                    duration: 7000,
                    data
                });
            });

            return () => {
                socket.disconnect();
            };
        } catch (err) {
            console.warn('[DynamicIsland] Socket initialization error:', err);
        }
    }, [_hasHydrated, isAuthenticated, user, addNotification]);

    // Custom DOM Window Event Listeners for in-app trigger
    useEffect(() => {
        const handleCustomNotification = (e) => {
            if (e.detail) {
                addNotification(e.detail);
            }
        };

        const handleCustomDismiss = (e) => {
            if (activeItem) {
                triggerChocolateDismiss(activeItem.id);
            } else if (e.detail?.id) {
                triggerChocolateDismiss(e.detail.id);
            } else {
                setQueue([]);
            }
        };

        window.addEventListener('app:island-notification', handleCustomNotification);
        window.addEventListener('app:island-dismiss', handleCustomDismiss);

        return () => {
            window.removeEventListener('app:island-notification', handleCustomNotification);
            window.removeEventListener('app:island-dismiss', handleCustomDismiss);
        };
    }, [addNotification, activeItem, triggerChocolateDismiss]);

    if (!activeItem) return null;

    const config = TYPE_CONFIG[activeItem.type] || TYPE_CONFIG.info;
    const Icon = config.icon;

    const handleAction = () => {
        triggerChocolateDismiss(activeItem.id, () => {
            if (activeItem.onAction) {
                activeItem.onAction(activeItem);
            } else if (activeItem.route) {
                router.push(activeItem.route);
            }
        });
    };

    return (
        <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] pointer-events-auto transition-all duration-300 ease-out select-none"
            style={{ maxWidth: 'calc(100vw - 24px)' }}
        >
            {/* Scoped CSS for tactile chocolate snap & crumbling break animation */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes chocolateSnapBreak {
                    0% {
                        transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
                        opacity: 1;
                        filter: brightness(1);
                    }
                    20% {
                        transform: translate3d(var(--snap-x), var(--snap-y), 20px) scale(1.08) rotate(calc(var(--tumble-rot) * 0.25));
                        filter: brightness(1.35);
                        box-shadow: 0 10px 22px rgba(0, 0, 0, 0.7);
                    }
                    60% {
                        transform: translate3d(calc(var(--tumble-x) * 0.6), calc(var(--tumble-y) * 0.5), 0px) scale(0.85) rotate(calc(var(--tumble-rot) * 0.7));
                        opacity: 0.85;
                    }
                    100% {
                        transform: translate3d(var(--tumble-x), var(--tumble-y), -25px) scale(0.18) rotate(var(--tumble-rot));
                        opacity: 0;
                        filter: blur(1.5px);
                    }
                }
                .chocolate-cell-anim {
                    background: linear-gradient(135deg, #47241e 0%, #2b130f 50%, #150705 100%);
                    border-radius: 6px;
                    border: 1px solid rgba(255, 255, 255, 0.18);
                    box-shadow: 
                        inset 1.5px 1.5px 3px rgba(255, 255, 255, 0.28),
                        inset -2px -2px 4px rgba(0, 0, 0, 0.85),
                        0 4px 10px rgba(0, 0, 0, 0.55);
                    padding: 3px;
                    animation: chocolateSnapBreak 0.75s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
                    animation-delay: var(--delay);
                    transform-origin: center center;
                    will-change: transform, opacity;
                }
                .chocolate-inner-bevel {
                    width: 100%;
                    height: 100%;
                    border-radius: 4px;
                    background: linear-gradient(145deg, #371813 0%, #1c0906 100%);
                    box-shadow: 
                        inset 1px 1px 2px rgba(255, 255, 255, 0.2),
                        inset -1px -1px 3px rgba(0, 0, 0, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .chocolate-groove {
                    width: 40%;
                    height: 2px;
                    background: rgba(0, 0, 0, 0.65);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 1px;
                }
            `}} />

            {/* Morphing Dynamic Island Container */}
            <div
                className={'relative bg-gradient-to-b ' + config.gradient + ' text-white shadow-2xl backdrop-blur-2xl border ' + config.borderColor + ' transition-all duration-300 ease-spring ' + (
                    isExpanded
                        ? 'w-[92vw] sm:w-[460px] rounded-3xl p-4 shadow-emerald-950/40'
                        : 'w-auto max-w-[92vw] rounded-full py-1.5 pl-3 pr-2.5 shadow-slate-950/60 hover:scale-[1.02]'
                ) + (isChocolateDissolving ? ' border-transparent bg-transparent shadow-none' : '')}
                onClick={() => !isExpanded && !isChocolateDissolving && setIsExpanded(true)}
            >
                {/* ─── CHOCOLATE CELLS DISSOLVE OVERLAY ─── */}
                {isChocolateDissolving && (
                    <div className="absolute inset-0 z-50 rounded-3xl overflow-visible pointer-events-none p-1">
                        <div className="grid grid-cols-4 grid-rows-3 gap-1.5 w-full h-full" style={{ perspective: '900px' }}>
                            {Array.from({ length: 12 }).map((_, idx) => {
                                const col = idx % 4;
                                const row = Math.floor(idx / 4);
                                return (
                                    <div
                                        key={`choc-cell-${idx}`}
                                        className="chocolate-cell-anim min-h-[16px] sm:min-h-[22px]"
                                        style={{
                                            '--delay': `${(row * 4 + col) * 35}ms`,
                                            '--snap-x': `${(col - 1.5) * 16}px`,
                                            '--snap-y': `${(row - 1) * -10}px`,
                                            '--tumble-x': `${(col - 1.5) * 45}px`,
                                            '--tumble-y': `${55 + row * 30}px`,
                                            '--tumble-rot': `${((idx % 2 === 0 ? 1 : -1) * (15 + idx * 7))}deg`,
                                        }}
                                    >
                                        <div className="chocolate-inner-bevel">
                                            <span className="chocolate-groove" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ─── COMPACT PILL MODE ─── */}
                {!isExpanded ? (
                    <div className={`flex items-center gap-2.5 cursor-pointer transition-opacity duration-150 ${isChocolateDissolving ? 'opacity-0' : 'opacity-100'}`}>
                        {/* Glowing Icon & Pulse Beacon */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className={'animate-ping absolute inline-flex h-full w-full rounded-full ' + config.ringColor + ' opacity-75'}></span>
                                <span className={'relative inline-flex rounded-full h-2.5 w-2.5 ' + config.ringColor}></span>
                            </span>
                            <div className={'w-6 h-6 rounded-full ' + config.iconBg + ' flex items-center justify-center shrink-0'}>
                                <Icon className="w-3.5 h-3.5 animate-pulse" />
                            </div>
                        </div>

                        {/* Title & Subtitle */}
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                            <span className="text-[12px] font-semibold text-slate-100 truncate max-w-[140px] sm:max-w-[220px]">
                                {activeItem.title}
                            </span>
                            {activeItem.subtitle && (
                                <span className="text-[10px] text-slate-400 truncate hidden sm:inline max-w-[120px]">
                                    • {activeItem.subtitle}
                                </span>
                            )}
                        </div>

                        {/* Quick Action Button or Chevron */}
                        <div className="flex items-center gap-1.5 border-l border-slate-700/80 pl-2 shrink-0">
                            {activeItem.actionLabel ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAction();
                                    }}
                                    className={'px-2.5 py-1 rounded-full text-[11px] font-bold ' + config.actionBtnBg + ' shadow-xs transition active:scale-95 flex items-center gap-1'}
                                >
                                    <span>{activeItem.actionLabel}</span>
                                    <ChevronRight className="w-3 h-3" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsExpanded(true);
                                    }}
                                    className="p-1 rounded-full text-slate-400 hover:text-white transition"
                                >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                            )}

                            {/* Queue Badge if multi-notification */}
                            {queue.length > 1 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                    +{queue.length - 1}
                                </span>
                            )}

                            {/* Dismiss button */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    triggerChocolateDismiss(activeItem.id);
                                }}
                                className="p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/10 transition"
                                title="Dismiss"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ─── EXPANDED CARD MODE ─── */
                    <div className={`space-y-3 transition-opacity duration-150 ${isChocolateDissolving ? 'opacity-0' : 'opacity-100'}`}>
                        {/* Header: Icon, Badges, Expand Controls, Dismiss */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className={'w-9 h-9 rounded-2xl ' + config.iconBg + ' flex items-center justify-center shadow-lg'}>
                                    <Icon className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ' + config.badgeBg}>
                                            {activeItem.badge || config.label}
                                        </span>
                                        {activeItem.priority === 'high' && (
                                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                                                Urgent
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-[13px] font-bold text-white mt-0.5 leading-snug">
                                        {activeItem.title}
                                    </h4>
                                </div>
                            </div>

                            {/* Top Right Controls */}
                            <div className="flex items-center gap-1">
                                {queue.length > 1 && (
                                    <div className="flex items-center gap-1 mr-1 text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
                                        <Layers className="w-3 h-3 text-slate-300" />
                                        <span>{currentIndex + 1}/{queue.length}</span>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsExpanded(false)}
                                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 rounded-xl hover:bg-slate-800 transition"
                                    title="Minimize to Pill"
                                >
                                    <Minimize2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => triggerChocolateDismiss(activeItem.id)}
                                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 rounded-xl hover:bg-rose-500/30 hover:text-rose-300 transition"
                                    title="Dismiss"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Body Details Box */}
                        <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80 space-y-1.5">
                            {activeItem.subtitle && (
                                <p className="text-[12px] font-semibold text-slate-200">
                                    {activeItem.subtitle}
                                </p>
                            )}
                            {activeItem.message && (
                                <p className="text-[11px] text-slate-300 leading-relaxed">
                                    {activeItem.message}
                                </p>
                            )}
                        </div>

                        {/* Action Buttons & Navigation */}
                        <div className="flex items-center gap-2 pt-0.5">
                            {activeItem.actionLabel && (
                                <button
                                    type="button"
                                    onClick={handleAction}
                                    className={'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold shadow-lg transition active:scale-[0.98] flex items-center justify-center gap-2 ' + config.actionBtnBg}
                                >
                                    <span>{activeItem.actionLabel}</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => triggerChocolateDismiss(activeItem.id)}
                                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition"
                            >
                                Dismiss
                            </button>
                        </div>

                        {/* Multi-Queue Pagination */}
                        {queue.length > 1 && (
                            <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCurrentIndex(prev => (prev > 0 ? prev - 1 : queue.length - 1))}
                                    className="hover:text-white flex items-center gap-1"
                                >
                                    ← Previous
                                </button>
                                <span>Showing {currentIndex + 1} of {queue.length} events</span>
                                <button
                                    type="button"
                                    onClick={() => setCurrentIndex(prev => (prev < queue.length - 1 ? prev + 1 : 0))}
                                    className="hover:text-white flex items-center gap-1"
                                >
                                    Next →
                                </button>
                            </div>
                        )}

                        {/* Progress Bar (Auto-Dismiss) */}
                        {activeItem.duration > 0 && (
                            <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden mt-1">
                                <div
                                    className={'h-full transition-all duration-75 ease-linear ' + config.ringColor}
                                    style={{ width: progress + '%' }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
