'use client';

import React, { useState, useEffect } from 'react';
import {
    Mic,
    Volume2,
    VolumeX,
    Sparkles,
    CheckCircle2,
    X,
    Maximize2,
    Minimize2,
    BookOpen,
    HelpCircle,
    Loader2,
    Pencil,
    Send
} from 'lucide-react';

export default function WhiteboardClosedCaptions({
    isVisible = true,
    isListening = false,
    transcript = '',
    interimTranscript = '',
    feedback = '',
    isAiThinking = false,
    isAiSpeaking = false,
    aiSpeakingText = '',
    aiSolution = null,
    onOpenAiSolution = () => {},
    onStopSpeaking = () => {},
    onClose = () => {},
    onExecuteCommand = () => {},
    audioLevel = 0
}) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [lastSpoken, setLastSpoken] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');

    // Keep track of the most recent utterance or feedback
    useEffect(() => {
        if (transcript) {
            setLastSpoken(transcript);
            if (!isEditing) {
                setEditText(transcript);
            }
        }
    }, [transcript, isEditing]);

    if (!isVisible) return null;

    // Determine current display mode
    const hasActiveText = Boolean(interimTranscript || transcript || aiSpeakingText || feedback || isAiThinking);

    // If completely idle and no recent text, keep it subtle or auto-compact
    return (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] sm:w-auto min-w-[320px] pointer-events-auto select-none transition-all duration-200">
            {isMinimized ? (
                /* Minimized floating pill */
                <div
                    onClick={() => setIsMinimized(false)}
                    className="mx-auto flex items-center justify-between gap-2.5 px-3.5 py-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-700/80 rounded-full shadow-2xl cursor-pointer text-xs text-slate-200 backdrop-blur-md transition group"
                >
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            {isListening && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${isListening ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                        </span>
                        <span className="font-semibold text-[11px] text-amber-300">CC</span>
                        <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                            {isAiSpeaking ? '🔊 AI Speaking...' : isListening ? (interimTranscript || transcript || 'Listening...') : 'Closed Captions'}
                        </span>
                    </div>

                    <Maximize2 className="w-3 h-3 text-slate-400 group-hover:text-white" />
                </div>
            ) : (
                /* Full Broadcast Closed Captions Banner */
                <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col animate-in fade-in slide-in-from-bottom-3 duration-150">
                    {/* Top Status Bar */}
                    <div className="px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                            {/* Listening / Speaking / Thinking Indicator */}
                            {isAiSpeaking ? (
                                <div className="flex items-center gap-1.5 text-purple-400 font-semibold">
                                    <Volume2 className="w-3.5 h-3.5 animate-pulse text-purple-400" />
                                    <span>AI Speaking</span>
                                    {/* Mini animated equalizer bars */}
                                    <div className="flex items-center gap-0.5 ml-1">
                                        <span className="w-0.5 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-0.5 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-0.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            ) : isAiThinking ? (
                                <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>AI Searching for Solution...</span>
                                </div>
                            ) : isListening ? (
                                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Microphone Active</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                                    <span>Closed Captions (Mic Idle)</span>
                                </div>
                            )}

                            {/* CC Badge */}
                            <span className="bg-amber-500/20 text-amber-300 font-mono text-[9px] px-1.5 py-0.2 rounded border border-amber-500/40 uppercase font-bold tracking-wider">
                                CC
                            </span>
                        </div>

                        {/* Controls: Stop Speech, Minimize, Close */}
                        <div className="flex items-center gap-1">
                            {isAiSpeaking && (
                                <button
                                    type="button"
                                    onClick={onStopSpeaking}
                                    className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-semibold flex items-center gap-1 transition border border-rose-500/30"
                                    title="Stop Speech Output"
                                >
                                    <VolumeX className="w-3 h-3" />
                                    <span>Mute</span>
                                </button>
                            )}

                            {aiSolution && (
                                <button
                                    type="button"
                                    onClick={onOpenAiSolution}
                                    className="px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-semibold flex items-center gap-1 transition border border-purple-500/30"
                                    title="View Full Solution & Insert to Canvas"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    <span>View Solution</span>
                                </button>
                            )}

                            {/* Type or Correct in CC Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditing(prev => !prev);
                                    if (!editText && transcript) setEditText(transcript);
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition border ${
                                    isEditing
                                        ? 'bg-indigo-600 text-white border-indigo-400'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                                }`}
                                title="Click to type in CC or correct speech recognition"
                            >
                                <Pencil className="w-2.5 h-2.5" />
                                <span>{isEditing ? 'Close' : 'Type / Edit'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsMinimized(true)}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                title="Minimize Captions"
                            >
                                <Minimize2 className="w-3 h-3" />
                            </button>

                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                title="Close Closed Captions"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Main Closed Captions Content Area */}
                    <div className="px-4 py-2.5 min-h-[48px] max-h-32 overflow-y-auto custom-scrollbar flex flex-col justify-center">
                        {isEditing ? (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (editText.trim()) {
                                        onExecuteCommand(editText.trim());
                                        setIsEditing(false);
                                    }
                                }}
                                className="flex items-center gap-1.5 w-full my-0.5"
                            >
                                <input
                                    type="text"
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    placeholder="Type command or question (e.g. 'reduce border by 2px', 'draw 3D earth')..."
                                    autoFocus
                                    className="flex-1 bg-slate-900 border border-indigo-500/80 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                />
                                <button
                                    type="submit"
                                    disabled={!editText.trim()}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1 shrink-0"
                                    title="Execute Command"
                                >
                                    <Send className="w-3 h-3" />
                                    <span>Run</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="p-1 text-slate-400 hover:text-white rounded shrink-0"
                                    title="Cancel"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </form>
                        ) : isAiSpeaking && aiSpeakingText ? (
                            <div className="text-purple-200 text-xs sm:text-sm font-medium leading-snug">
                                <span className="text-purple-400 font-bold mr-1.5">🔊 AI Tutor:</span>
                                <span>{aiSpeakingText}</span>
                            </div>
                        ) : isAiThinking ? (
                            <div className="text-amber-200/90 text-xs sm:text-sm italic flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                                <span>Interpreting request and calculating solution...</span>
                            </div>
                        ) : interimTranscript || transcript ? (
                            <div
                                onClick={() => {
                                    setIsEditing(true);
                                    setEditText(transcript || interimTranscript);
                                }}
                                className="text-xs sm:text-sm leading-snug cursor-pointer group flex items-center justify-between"
                                title="Click to edit or correct this text"
                            >
                                <div>
                                    {transcript && (
                                        <span className="text-white font-medium mr-1.5">{transcript}</span>
                                    )}
                                    {interimTranscript && (
                                        <span className="text-cyan-300 italic opacity-90 animate-pulse">
                                            {interimTranscript}...
                                        </span>
                                    )}
                                </div>
                                <Pencil className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1.5" />
                            </div>
                        ) : feedback ? (
                            <div className="text-xs sm:text-sm font-medium text-emerald-300 flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>{feedback}</span>
                            </div>
                        ) : (
                            <div
                                onClick={() => setIsEditing(true)}
                                className="text-xs text-slate-400 italic cursor-pointer hover:text-slate-300 flex items-center justify-between group"
                                title="Click to type in CC"
                            >
                                <span>{isListening ? 'Speak a whiteboard command or ask a question (e.g., "Solve 3x + 9 = 27")...' : 'Microphone idle. Click to type or click Mic to speak.'}</span>
                                <Pencil className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1.5" />
                            </div>
                        )}

                        {/* Recent Feedback Pill (if different from speech) */}
                        {feedback && (transcript || interimTranscript || isAiSpeaking) && (
                            <div className="mt-1.5 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 font-medium">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {feedback}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
