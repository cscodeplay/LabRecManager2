'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    Clock, Play, Pause, Square, RotateCcw, X, Minimize2, Maximize2, 
    Volume2, VolumeX, Flag, Sparkles, ChevronDown, ChevronUp, Music
} from 'lucide-react';

export const COUNTDOWN_SOUNDS = [
    { id: 'standard_pip', name: 'Standard Pip' },
    { id: 'tick_tock', name: 'Tick-Tock' },
    { id: 'radar_ping', name: 'Radar Ping' },
    { id: 'digital_blip', name: 'Digital Blip' },
    { id: 'marimba_drop', name: 'Marimba Drop' },
    { id: 'electronic_beep', name: 'Electronic Beep' },
    { id: 'soft_click', name: 'Soft Click' },
    { id: 'pulse_thud', name: 'Pulse Thud' },
    { id: 'arcade_coin', name: 'Arcade Coin' },
    { id: 'space_laser', name: 'Space Laser' }
];

export const END_SOUNDS = [
    { id: 'fanfare_chime', name: 'Fanfare Chime' },
    { id: 'bell_chime', name: 'Cathedral Bell' },
    { id: 'digital_alarm', name: 'Digital Alarm' },
    { id: 'marimba_cascade', name: 'Marimba Cascade' },
    { id: 'temple_gong', name: 'Temple Gong' },
    { id: 'gentle_harp', name: 'Gentle Harp' },
    { id: 'game_buzzer', name: 'Game Buzzer' },
    { id: 'school_bell', name: 'School Bell' },
    { id: 'cyber_synth', name: 'Cyber Synth' },
    { id: 'triumph_brass', name: 'Triumph Brass' }
];

export default function ClassroomTimerModal({ isOpen, onClose }) {
    const [mode, setMode] = useState('countdown'); // 'countdown' | 'stopwatch'
    const [duration, setDuration] = useState(300); // in seconds
    const [timeLeftMs, setTimeLeftMs] = useState(300 * 1000);
    const [stopwatchTimeMs, setStopwatchTimeMs] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [showSoundConfig, setShowSoundConfig] = useState(false);
    const [countdownSound, setCountdownSound] = useState('standard_pip');
    const [endSound, setEndSound] = useState('fanfare_chime');
    const [laps, setLaps] = useState([]);

    // Draggable position
    const [pos, setPos] = useState({ x: 40, y: 100 });
    const isDraggingRef = useRef(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const audioCtxRef = useRef(null);
    const lastBeepSecRef = useRef(-1);

    // Audio helper that unlocks AudioContext
    const getAudioCtx = () => {
        if (!soundEnabled) return null;
        try {
            if (!audioCtxRef.current) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (AudioContextClass) {
                    audioCtxRef.current = new AudioContextClass();
                }
            }
            if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                audioCtxRef.current.resume();
            }
            return audioCtxRef.current;
        } catch (e) {
            console.warn('[Audio] Init failed:', e);
            return null;
        }
    };

    // 10 Countdown short audio synthesizer variations
    const playCountdownSound = (soundId = countdownSound, isFinal = false) => {
        if (!soundEnabled) return;
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;

        try {
            switch (soundId) {
                case 'standard_pip': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(isFinal ? 1046.5 : 880, now);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.08);
                    break;
                }
                case 'tick_tock': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(isFinal ? 1200 : 750, now);
                    gain.gain.setValueAtTime(0.25, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.04);
                    break;
                }
                case 'radar_ping': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(isFinal ? 1500 : 1200, now);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.18);
                    break;
                }
                case 'digital_blip': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(isFinal ? 987.77 : 659.25, now);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.06);
                    break;
                }
                case 'marimba_drop': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(isFinal ? 880 : 587.33, now);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.12);
                    break;
                }
                case 'electronic_beep': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(isFinal ? 1174.66 : 880, now);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.09);
                    break;
                }
                case 'soft_click': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(isFinal ? 1600 : 900, now);
                    gain.gain.setValueAtTime(0.18, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.03);
                    break;
                }
                case 'pulse_thud': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(isFinal ? 330 : 220, now);
                    osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
                    gain.gain.setValueAtTime(0.35, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.1);
                    break;
                }
                case 'arcade_coin': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(987.77, now);
                    osc.frequency.setValueAtTime(1318.51, now + 0.05);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.14);
                    break;
                }
                case 'space_laser': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(isFinal ? 1400 : 1000, now);
                    osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.08);
                    break;
                }
                default: {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(isFinal ? 1046.5 : 880, now);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.08);
                }
            }
        } catch (e) {
            console.warn('[Audio Countdown] Error:', e);
        }
    };

    // 10 End Sound celebratory/alarm generators
    const playEndSound = (soundId = endSound) => {
        if (!soundEnabled) return;
        const ctx = getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;

        try {
            switch (soundId) {
                case 'fanfare_chime': {
                    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                    notes.forEach((freq, idx) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        const startTime = now + idx * 0.14;
                        osc.frequency.setValueAtTime(freq, startTime);
                        gain.gain.setValueAtTime(0, startTime);
                        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.03);
                        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.55);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(startTime);
                        osc.stop(startTime + 0.55);
                    });
                    break;
                }
                case 'bell_chime': {
                    const harmonics = [523.25, 1046.5, 1569.75];
                    harmonics.forEach((freq, idx) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, now);
                        gain.gain.setValueAtTime(0.25 / (idx + 1), now);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(now);
                        osc.stop(now + 1.2);
                    });
                    break;
                }
                case 'digital_alarm': {
                    [0, 0.16, 0.32].forEach((offset) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'square';
                        const startTime = now + offset;
                        osc.frequency.setValueAtTime(980, startTime);
                        gain.gain.setValueAtTime(0.15, startTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(startTime);
                        osc.stop(startTime + 0.1);
                    });
                    break;
                }
                case 'marimba_cascade': {
                    const cascade = [587.33, 659.25, 783.99, 880, 1046.5];
                    cascade.forEach((freq, idx) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'triangle';
                        const startTime = now + idx * 0.1;
                        osc.frequency.setValueAtTime(freq, startTime);
                        gain.gain.setValueAtTime(0.3, startTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(startTime);
                        osc.stop(startTime + 0.35);
                    });
                    break;
                }
                case 'temple_gong': {
                    [180, 183, 270].forEach((freq) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, now);
                        gain.gain.setValueAtTime(0.3, now);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(now);
                        osc.stop(now + 1.6);
                    });
                    break;
                }
                case 'gentle_harp': {
                    const harpNotes = [440, 554.37, 659.25, 880, 1108.73];
                    harpNotes.forEach((freq, idx) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        const startTime = now + idx * 0.09;
                        osc.frequency.setValueAtTime(freq, startTime);
                        gain.gain.setValueAtTime(0.22, startTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(startTime);
                        osc.stop(startTime + 0.6);
                    });
                    break;
                }
                case 'game_buzzer': {
                    [150, 153].forEach(freq => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sawtooth';
                        osc.frequency.setValueAtTime(freq, now);
                        gain.gain.setValueAtTime(0.2, now);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(now);
                        osc.stop(now + 0.45);
                    });
                    break;
                }
                case 'school_bell': {
                    [800, 804, 1200].forEach((freq) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, now);
                        gain.gain.setValueAtTime(0.2, now);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(now);
                        osc.stop(now + 0.8);
                    });
                    break;
                }
                case 'cyber_synth': {
                    const chords = [440, 554.37, 659.25];
                    chords.forEach((freq) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sawtooth';
                        osc.frequency.setValueAtTime(freq, now);
                        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.5);
                        gain.gain.setValueAtTime(0.15, now);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(now);
                        osc.stop(now + 0.6);
                    });
                    break;
                }
                case 'triumph_brass': {
                    const brass = [
                        { f: 523.25, t: 0 },
                        { f: 659.25, t: 0.12 },
                        { f: 783.99, t: 0.24 },
                        { f: 1046.50, t: 0.36 }
                    ];
                    brass.forEach(({ f, t }) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'triangle';
                        const startTime = now + t;
                        osc.frequency.setValueAtTime(f, startTime);
                        gain.gain.setValueAtTime(0.28, startTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(startTime);
                        osc.stop(startTime + 0.5);
                    });
                    break;
                }
                default: {
                    const notes = [523.25, 659.25, 783.99, 1046.50];
                    notes.forEach((freq, idx) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        const startTime = now + idx * 0.15;
                        osc.frequency.setValueAtTime(freq, startTime);
                        gain.gain.setValueAtTime(0.3, startTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.55);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(startTime);
                        osc.stop(startTime + 0.55);
                    });
                }
            }
        } catch (e) {
            console.warn('[Audio End Sound] Error:', e);
        }
    };

    // High-resolution timer tick loop (50ms interval)
    useEffect(() => {
        let interval = null;
        if (isRunning) {
            let lastTick = Date.now();
            interval = setInterval(() => {
                const now = Date.now();
                const delta = now - lastTick;
                lastTick = now;

                if (mode === 'countdown') {
                    setTimeLeftMs(prev => {
                        const next = Math.max(0, prev - delta);
                        const currentWholeSec = Math.ceil(next / 1000);

                        // 10-second countdown audio pips (seconds 10, 9, 8... down to 1)
                        if (currentWholeSec > 0 && currentWholeSec <= 10 && currentWholeSec !== lastBeepSecRef.current) {
                            lastBeepSecRef.current = currentWholeSec;
                            playCountdownSound(countdownSound, currentWholeSec === 1);
                        }

                        if (next <= 0) {
                            setIsRunning(false);
                            playEndSound(endSound);
                            return 0;
                        }
                        return next;
                    });
                } else {
                    setStopwatchTimeMs(prev => prev + delta);
                }
            }, 50);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning, mode, soundEnabled, countdownSound, endSound]);

    // Format milliseconds into MM:SS.cs (e.g. 04:59.85)
    const formatTimeMs = (ms) => {
        const totalSec = Math.floor(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        const cs = Math.floor((ms % 1000) / 10);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    };

    const handleSetCountdown = (seconds) => {
        setIsRunning(false);
        setDuration(seconds);
        setTimeLeftMs(seconds * 1000);
        lastBeepSecRef.current = -1;
    };

    // Separate Pause Action
    const handlePause = () => {
        setIsRunning(false);
    };

    // Separate Resume/Start Action
    const handleStartResume = () => {
        getAudioCtx(); // unlock audio on user gesture
        if (mode === 'countdown' && timeLeftMs <= 0) {
            setTimeLeftMs(duration * 1000);
            lastBeepSecRef.current = -1;
        }
        setIsRunning(true);
    };

    // Separate Stop/Reset Action
    const handleStopReset = () => {
        setIsRunning(false);
        lastBeepSecRef.current = -1;
        if (mode === 'countdown') {
            setTimeLeftMs(duration * 1000);
        } else {
            setStopwatchTimeMs(0);
            setLaps([]);
        }
    };

    const handleAddLap = () => {
        if (mode === 'stopwatch' && isRunning) {
            setLaps(prev => [stopwatchTimeMs, ...prev.slice(0, 9)]);
        }
    };

    // Dragging handlers
    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
        isDraggingRef.current = true;
        dragOffsetRef.current = {
            x: e.clientX - pos.x,
            y: e.clientY - pos.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDraggingRef.current) return;
            const newX = Math.max(10, Math.min(window.innerWidth - 320, e.clientX - dragOffsetRef.current.x));
            const newY = Math.max(10, Math.min(window.innerHeight - 150, e.clientY - dragOffsetRef.current.y));
            setPos({ x: newX, y: newY });
        };
        const handleMouseUp = () => {
            isDraggingRef.current = false;
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    if (!isOpen) return null;

    const totalDurationMs = duration * 1000;
    const progressPct = mode === 'countdown' && totalDurationMs > 0 ? ((totalDurationMs - timeLeftMs) / totalDurationMs) * 100 : 0;
    const isCompleted = mode === 'countdown' && timeLeftMs <= 0;
    const isNearEnd = mode === 'countdown' && timeLeftMs > 0 && timeLeftMs <= totalDurationMs * 0.05;
    const isPaused = !isRunning && (mode === 'countdown' ? timeLeftMs < totalDurationMs && timeLeftMs > 0 : stopwatchTimeMs > 0);

    // Minimized Floating Pill Mode
    if (isMinimized) {
        return (
            <div 
                style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                onMouseDown={handleMouseDown}
                className="fixed z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900/90 text-white shadow-2xl backdrop-blur-md border border-slate-700/80 cursor-grab active:cursor-grabbing select-none"
            >
                <div className={`p-1.5 rounded-full ${isCompleted ? 'bg-rose-500 animate-bounce' : (isNearEnd ? 'bg-red-500 animate-pulse' : (isRunning ? 'bg-blue-600 animate-pulse' : 'bg-slate-700'))}`}>
                    <Clock className="w-3.5 h-3.5 text-white" />
                </div>
                <span className={`font-mono text-sm font-bold ${isCompleted ? 'text-rose-400 animate-pulse' : (isNearEnd ? 'text-rose-400 animate-pulse' : 'text-white')}`}>
                    {mode === 'countdown' ? formatTimeMs(timeLeftMs) : formatTimeMs(stopwatchTimeMs)}
                </span>
                <div className="flex items-center gap-1">
                    {isRunning ? (
                        <button
                            onClick={handlePause}
                            title="Pause"
                            className="p-1 rounded-full hover:bg-slate-800 text-amber-300"
                        >
                            <Pause className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleStartResume}
                            title="Start"
                            className="p-1 rounded-full hover:bg-slate-800 text-blue-400 hover:text-white"
                        >
                            <Play className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button
                        onClick={handleStopReset}
                        title="Stop & Reset"
                        className="p-1 rounded-full hover:bg-slate-800 text-rose-400 hover:text-rose-300"
                    >
                        <Square className="w-3.5 h-3.5" />
                    </button>
                </div>
                <button
                    onClick={() => setIsMinimized(false)}
                    title="Maximize Timer"
                    className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                    <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    }

    // Full Floating Card
    return (
        <div 
            style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
            onMouseDown={handleMouseDown}
            className="fixed z-50 w-84 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl backdrop-blur-xl p-4 space-y-4 select-none cursor-grab active:cursor-grabbing"
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                        <Clock className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Classroom Timer</h3>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowSoundConfig(!showSoundConfig)}
                        title="Audio Options"
                        className={`p-1.5 rounded-lg transition-colors ${
                            showSoundConfig 
                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Music className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                    </button>
                    <button
                        onClick={() => setIsMinimized(true)}
                        title="Minimize to floating pill"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <Minimize2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClose}
                        title="Close"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Sound Configuration Panel */}
            {showSoundConfig && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Sound Library
                        </span>
                        <span className="text-[10px] text-slate-400">10 synthesized effects</span>
                    </div>

                    {/* Countdown Sound Dropdown */}
                    <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Countdown Sound (Last 10s):
                        </label>
                        <div className="flex items-center gap-1.5">
                            <select
                                value={countdownSound}
                                onChange={(e) => setCountdownSound(e.target.value)}
                                className="flex-1 text-xs py-1 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                            >
                                {COUNTDOWN_SOUNDS.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => { getAudioCtx(); playCountdownSound(countdownSound, false); }}
                                title="Preview Countdown Sound"
                                className="px-2 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold"
                            >
                                ▶
                            </button>
                        </div>
                    </div>

                    {/* End Sound Dropdown */}
                    <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Finish Sound (0:00):
                        </label>
                        <div className="flex items-center gap-1.5">
                            <select
                                value={endSound}
                                onChange={(e) => setEndSound(e.target.value)}
                                className="flex-1 text-xs py-1 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                            >
                                {END_SOUNDS.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => { getAudioCtx(); playEndSound(endSound); }}
                                title="Preview Finish Sound"
                                className="px-2 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold"
                            >
                                ▶
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                    onClick={() => { setMode('countdown'); setIsRunning(false); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        mode === 'countdown' 
                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' 
                            : 'text-slate-600 dark:text-slate-400'
                    }`}
                >
                    Countdown
                </button>
                <button
                    onClick={() => { setMode('stopwatch'); setIsRunning(false); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        mode === 'stopwatch' 
                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' 
                            : 'text-slate-600 dark:text-slate-400'
                    }`}
                >
                    Stopwatch
                </button>
            </div>

            {/* Big Time Display with Running Milliseconds */}
            <div className={`text-center py-4 rounded-xl border transition-colors ${
                isCompleted 
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 animate-pulse' 
                    : (isNearEnd ? 'bg-red-50/80 dark:bg-red-950/30 border-red-300 dark:border-red-900' : 'bg-slate-50 dark:bg-slate-950/60 border-slate-100 dark:border-slate-800/80')
            }`}>
                <div className={`text-4xl font-mono font-black tracking-wider ${
                    isCompleted ? 'text-rose-600 dark:text-rose-400' : (isNearEnd ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-slate-900 dark:text-white')
                }`}>
                    {mode === 'countdown' ? formatTimeMs(timeLeftMs) : formatTimeMs(stopwatchTimeMs)}
                </div>
                {mode === 'countdown' && (
                    <div className="mt-3 px-6">
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-75 rounded-full ${
                                    isCompleted || isNearEnd ? 'bg-red-500 animate-pulse shadow-sm shadow-red-500/50' : 'bg-blue-600'
                                }`}
                                style={{ width: `${Math.min(100, progressPct)}%` }}
                            />
                        </div>
                        {isNearEnd && !isCompleted && (
                            <div className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1 uppercase tracking-wider animate-pulse">
                                Final 5% Remaining
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Presets for Countdown */}
            {mode === 'countdown' && (
                <div className="grid grid-cols-4 gap-1.5">
                    {[
                        { label: '1 min', val: 60 },
                        { label: '3 min', val: 180 },
                        { label: '5 min', val: 300 },
                        { label: '10 min', val: 600 }
                    ].map(p => (
                        <button
                            key={p.val}
                            onClick={() => handleSetCountdown(p.val)}
                            className={`py-1 rounded-lg text-xs font-semibold transition-colors border ${
                                duration === p.val && !isRunning
                                    ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Laps List for Stopwatch */}
            {mode === 'stopwatch' && laps.length > 0 && (
                <div className="max-h-24 overflow-y-auto space-y-1 text-xs">
                    {laps.map((lapMs, i) => (
                        <div key={i} className="flex justify-between px-2 py-1 bg-slate-50 dark:bg-slate-950 rounded text-slate-600 dark:text-slate-400">
                            <span>Lap {laps.length - i}</span>
                            <span className="font-mono font-semibold">{formatTimeMs(lapMs)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Controls with SEPARATE Pause and Stop Buttons */}
            <div className="flex items-center gap-2 pt-1">
                {isRunning ? (
                    <>
                        {/* PAUSE BUTTON */}
                        <button
                            onClick={handlePause}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                        >
                            <Pause className="w-4 h-4" /> Pause
                        </button>

                        {/* STOP BUTTON */}
                        <button
                            onClick={handleStopReset}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                        >
                            <Square className="w-4 h-4 fill-white" /> Stop
                        </button>

                        {mode === 'stopwatch' && (
                            <button
                                onClick={handleAddLap}
                                title="Record Lap"
                                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                                <Flag className="w-4 h-4" />
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        {/* START / RESUME BUTTON */}
                        <button
                            onClick={handleStartResume}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-white shadow-md transition-all cursor-pointer ${
                                isPaused 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                            }`}
                        >
                            <Play className="w-4 h-4 fill-white" /> {isPaused ? 'Resume' : (isCompleted ? 'Restart' : 'Start')}
                        </button>

                        {/* RESET / STOP BUTTON */}
                        <button
                            onClick={handleStopReset}
                            title="Reset Timer"
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
