'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    Clock, Play, Pause, RotateCcw, X, Minimize2, Maximize2, 
    Bell, Volume2, VolumeX, Flag, Sparkles, Plus, Minus
} from 'lucide-react';

export default function ClassroomTimerModal({ isOpen, onClose }) {
    const [mode, setMode] = useState('countdown'); // 'countdown' | 'stopwatch'
    const [duration, setDuration] = useState(300); // in seconds
    const [timeLeftMs, setTimeLeftMs] = useState(300 * 1000);
    const [stopwatchTimeMs, setStopwatchTimeMs] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
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

    // Countdown short pip / beep for final 10 seconds
    const playPip = (freq = 880) => {
        if (!soundEnabled) return;
        const ctx = getAudioCtx();
        if (!ctx) return;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.08);
        } catch (e) {
            console.warn('[Audio Pip] Error:', e);
        }
    };

    // Celebratory finish chime generator
    const playChime = () => {
        if (!soundEnabled) return;
        const ctx = getAudioCtx();
        if (!ctx) return;
        try {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                const startTime = ctx.currentTime + idx * 0.15;
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.35, startTime + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + 0.6);
            });
        } catch (e) {
            console.warn('[Audio Chime] Error:', e);
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
                            playPip(currentWholeSec === 1 ? 1046.5 : 880);
                        }

                        if (next <= 0) {
                            setIsRunning(false);
                            playChime();
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
    }, [isRunning, mode, soundEnabled]);

    // Format milliseconds into MM:SS.cs (e.g. 04:59.85)
    const formatTimeMs = (ms) => {
        const totalSec = Math.floor(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        const cs = Math.floor((ms % 1000) / 10);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    };

    // Format simple MM:SS without centiseconds for compact pill
    const formatTimeSec = (ms) => {
        const totalSec = Math.floor(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const handleSetCountdown = (seconds) => {
        setIsRunning(false);
        setDuration(seconds);
        setTimeLeftMs(seconds * 1000);
        lastBeepSecRef.current = -1;
    };

    const handleReset = () => {
        setIsRunning(false);
        lastBeepSecRef.current = -1;
        if (mode === 'countdown') {
            setTimeLeftMs(duration * 1000);
        } else {
            setStopwatchTimeMs(0);
            setLaps([]);
        }
    };

    const handleToggleStart = () => {
        getAudioCtx(); // unlock audio on user gesture
        if (mode === 'countdown' && timeLeftMs <= 0) {
            // If already finished at 0:00, reset and restart cleanly without chime
            setTimeLeftMs(duration * 1000);
            lastBeepSecRef.current = -1;
            setIsRunning(true);
            return;
        }
        setIsRunning(!isRunning);
    };

    const handleAddLap = () => {
        if (mode === 'stopwatch' && isRunning) {
            setLaps(prev => [stopwatchTimeMs, ...prev.slice(0, 9)]);
        }
    };

    // Dragging handlers
    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        isDraggingRef.current = true;
        dragOffsetRef.current = {
            x: e.clientX - pos.x,
            y: e.clientY - pos.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDraggingRef.current) return;
            const newX = Math.max(10, Math.min(window.innerWidth - 300, e.clientX - dragOffsetRef.current.x));
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
                <button
                    onClick={handleToggleStart}
                    className="p-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white"
                >
                    {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
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
            className="fixed z-50 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl backdrop-blur-xl p-4 space-y-4 select-none cursor-grab active:cursor-grabbing"
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

            {/* Controls */}
            <div className="flex items-center gap-2 pt-1">
                <button
                    onClick={handleToggleStart}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 text-white shadow-md transition-all ${
                        isRunning 
                            ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' 
                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                    }`}
                >
                    {isRunning ? (
                        <>
                            <Pause className="w-4 h-4" /> Pause
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4" /> Start
                        </>
                    )}
                </button>

                {mode === 'stopwatch' && isRunning && (
                    <button
                        onClick={handleAddLap}
                        title="Record Lap"
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <Flag className="w-4 h-4" />
                    </button>
                )}

                <button
                    onClick={handleReset}
                    title="Reset Timer"
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
