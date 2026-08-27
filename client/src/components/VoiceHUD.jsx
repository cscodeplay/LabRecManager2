'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic,
    MicOff,
    Sparkles,
    X,
    Globe,
    Volume2,
    CheckCircle2,
    ArrowRight,
    Loader2
} from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { aiAPI } from '../lib/api';
import toast from 'react-hot-toast';

export default function VoiceHUD({ isOpen, onClose }) {
    const router = useRouter();
    const pathname = usePathname();
    const [selectedLang, setSelectedLang] = useState('en-IN');
    const [status, setStatus] = useState('idle'); // idle | listening | processing | executed
    const [recognizedCommand, setRecognizedCommand] = useState(null);
    const [processing, setProcessing] = useState(false);

    const {
        isListening,
        transcript,
        interimTranscript,
        audioLevel,
        startListening,
        stopListening,
        resetTranscript
    } = useVoiceInput({ lang: selectedLang });

    // Canvas waveform ref
    const canvasRef = useRef(null);

    // Auto-start listening when modal opens
    useEffect(() => {
        if (isOpen) {
            resetTranscript();
            setRecognizedCommand(null);
            setStatus('listening');
            startListening({
                onFinalResult: async (text) => {
                    if (text && text.trim().length > 2) {
                        await handleProcessCommand(text.trim());
                    }
                }
            });
        } else {
            stopListening();
            setStatus('idle');
        }
    }, [isOpen]);

    // Draw dynamic waveform on canvas based on audioLevel
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId;
        const numBars = 24;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const width = canvas.width;
            const height = canvas.height;
            const barWidth = width / numBars - 2;

            for (let i = 0; i < numBars; i++) {
                // Generate dynamic height using audioLevel + slight sine wave offset
                const variance = Math.sin(Date.now() / 150 + i) * 8;
                const baseHeight = isListening ? Math.max(4, (audioLevel * 0.8) + variance) : 4;
                const barHeight = Math.min(height - 4, baseHeight);

                const x = i * (barWidth + 2);
                const y = (height - barHeight) / 2;

                const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
                if (audioLevel > 25) {
                    gradient.addColorStop(0, '#f43f5e'); // rose-500
                    gradient.addColorStop(1, '#8b5cf6'); // violet-500
                } else {
                    gradient.addColorStop(0, '#6366f1'); // indigo-500
                    gradient.addColorStop(1, '#3b82f6'); // blue-500
                }

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barHeight, 4);
                ctx.fill();
            }

            animId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animId);
        };
    }, [isListening, audioLevel]);

    const handleProcessCommand = async (spokenText) => {
        setProcessing(true);
        setStatus('processing');
        try {
            const res = await aiAPI.voiceCommand({
                speechText: spokenText,
                context: { currentRoute: pathname }
            });

            const cmd = res.data?.data;
            setRecognizedCommand(cmd);
            setStatus('executed');

            if (cmd?.spokenFeedback) {
                toast.success(cmd.spokenFeedback);
            }

            // Execute navigation if applicable
            if (cmd?.targetRoute && cmd.targetRoute !== pathname) {
                setTimeout(() => {
                    router.push(cmd.targetRoute);
                    if (onClose) onClose();
                }, 1200);
            }
        } catch (e) {
            console.error('Voice command error:', e);
            toast.error('Failed to interpret voice command');
            setStatus('listening');
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 20 }}
                    className="relative w-full max-w-lg bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl shadow-indigo-500/10 overflow-hidden flex flex-col p-6 text-white"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                                    Voice AI Assistant
                                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                        Live
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-400">Speak a command or dictate text hands-free</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Language Switch */}
                            <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-xl px-2 py-1 text-xs">
                                <Globe className="w-3.5 h-3.5 text-slate-400" />
                                <select
                                    value={selectedLang}
                                    onChange={(e) => {
                                        setSelectedLang(e.target.value);
                                        resetTranscript();
                                    }}
                                    className="bg-transparent text-slate-300 text-xs border-0 focus:outline-none focus:ring-0 cursor-pointer"
                                >
                                    <option value="en-IN" className="bg-slate-900 text-white">English (IN)</option>
                                    <option value="hi-IN" className="bg-slate-900 text-white">हिन्दी (Hindi)</option>
                                    <option value="en-US" className="bg-slate-900 text-white">English (US)</option>
                                </select>
                            </div>

                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Waveform Visualizer */}
                    <div className="py-8 flex flex-col items-center justify-center">
                        <div className="relative mb-6">
                            <motion.div
                                animate={{
                                    scale: isListening ? [1, 1.1 + (audioLevel / 200), 1] : 1,
                                }}
                                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                                    isListening
                                        ? 'bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-600 shadow-2xl shadow-rose-500/40 ring-4 ring-rose-400/30'
                                        : 'bg-slate-800 text-slate-400'
                                }`}
                            >
                                {processing ? (
                                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                                ) : isListening ? (
                                    <Mic className="w-10 h-10 text-white animate-pulse" />
                                ) : (
                                    <MicOff className="w-10 h-10" />
                                )}
                            </motion.div>
                        </div>

                        {/* Waveform Canvas */}
                        <canvas
                            ref={canvasRef}
                            width={280}
                            height={40}
                            className="w-72 h-10 rounded-xl"
                        />

                        {/* Status Label */}
                        <p className="mt-3 text-xs font-medium text-slate-400 tracking-wide">
                            {processing
                                ? 'Analyzing command with AI...'
                                : isListening
                                ? 'Listening to your voice...'
                                : 'Tap mic to start listening'}
                        </p>
                    </div>

                    {/* Speech Transcript Display Box */}
                    <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 min-h-[90px] flex flex-col justify-center">
                        {transcript || interimTranscript ? (
                            <p className="text-sm text-slate-200 leading-relaxed">
                                <span className="font-medium">{transcript}</span>{' '}
                                <span className="text-indigo-400 italic opacity-80">{interimTranscript}</span>
                            </p>
                        ) : (
                            <p className="text-xs text-slate-500 italic text-center">
                                Try saying: &quot;Create a lecture plan for Physics&quot; or &quot;Add period 9 to timetable&quot;
                            </p>
                        )}
                    </div>

                    {/* Recognized Command Result */}
                    {recognizedCommand && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2.5">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                                <div>
                                    <div className="text-xs font-semibold text-emerald-300">
                                        Intent: {recognizedCommand.intent?.replace(/_/g, ' ').toUpperCase()}
                                    </div>
                                    <div className="text-[11px] text-slate-300">
                                        {recognizedCommand.spokenFeedback}
                                    </div>
                                </div>
                            </div>
                            {recognizedCommand.targetRoute && (
                                <span className="text-xs flex items-center gap-1 text-emerald-400 font-medium">
                                    Navigating <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                            )}
                        </motion.div>
                    )}

                    {/* Action Bar */}
                    <div className="mt-6 flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                        <button
                            type="button"
                            onClick={() => {
                                resetTranscript();
                                setRecognizedCommand(null);
                                if (!isListening) {
                                    startListening({
                                        onFinalResult: (t) => handleProcessCommand(t)
                                    });
                                }
                            }}
                            className="text-slate-400 hover:text-slate-200 transition"
                        >
                            Clear / Retry
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (isListening) stopListening();
                                    else startListening({ onFinalResult: (t) => handleProcessCommand(t) });
                                }}
                                className={`px-4 py-2 rounded-xl font-medium transition ${
                                    isListening
                                        ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25'
                                }`}
                            >
                                {isListening ? 'Stop Recording' : 'Start Speaking'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
