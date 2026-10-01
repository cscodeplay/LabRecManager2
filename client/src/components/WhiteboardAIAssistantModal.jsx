'use client';

import React, { useState } from 'react';
import {
    Sparkles,
    Volume2,
    VolumeX,
    Play,
    Pause,
    RotateCcw,
    Copy,
    Check,
    X,
    PlusCircle,
    ArrowRight,
    Send,
    HelpCircle,
    Bot,
    FileText
} from 'lucide-react';
import MathRenderer from './MathRenderer';
import toast from 'react-hot-toast';

export default function WhiteboardAIAssistantModal({
    isOpen,
    onClose,
    question = '',
    speechResponse = '',
    solutionMarkdown = '',
    canvasAction = null,
    isSpeaking = false,
    onSpeak = () => {},
    onStopSpeak = () => {},
    onInsertToBoard = () => {},
    onAskFollowUp = () => {}
}) {
    const [followUpText, setFollowUpText] = useState('');
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = () => {
        const fullContent = `${question ? `Q: ${question}\n\n` : ''}${solutionMarkdown || speechResponse}`;
        navigator.clipboard?.writeText(fullContent);
        setCopied(true);
        toast.success('Copied solution to clipboard', { icon: '📋' });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleFollowUpSubmit = (e) => {
        e.preventDefault();
        if (followUpText.trim()) {
            onAskFollowUp(followUpText.trim());
            setFollowUpText('');
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col text-slate-100 overflow-hidden"
                style={{ backgroundColor: '#0f172a' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base text-white">AI Voice Assistant & Tutor</h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    Interactive Solutions
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Speech AI Synthesizer response & step-by-step whiteboard explanation
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Copy solution"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
                    {/* User Question / Spoken Prompt */}
                    {question && (
                        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
                            <Bot className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider">
                                    Question / Request:
                                </span>
                                <span className="text-slate-200 font-medium text-sm">{question}</span>
                            </div>
                        </div>
                    )}

                    {/* Spoken AI Audio Answer Card */}
                    {speechResponse && (
                        <div className="bg-purple-950/20 border border-purple-800/40 rounded-xl p-4 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold">
                                    <Volume2 className="w-4 h-4 text-purple-400" />
                                    <span>Spoken Voice Response</span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    {isSpeaking ? (
                                        <button
                                            type="button"
                                            onClick={onStopSpeak}
                                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition border border-rose-500/30"
                                        >
                                            <VolumeX className="w-3.5 h-3.5" />
                                            <span>Stop Voice</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => onSpeak(speechResponse)}
                                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                            <span>Play Voice</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <p className="text-sm text-purple-100 font-medium leading-relaxed italic bg-purple-950/40 p-3 rounded-lg border border-purple-800/30">
                                &quot;{speechResponse}&quot;
                            </p>
                        </div>
                    )}

                    {/* Full Step-by-Step Formatted Solution */}
                    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 border-b border-slate-800 pb-2">
                            <FileText className="w-4 h-4 text-indigo-400" />
                            <span>Step-by-Step Solution & Formulas</span>
                        </div>

                        <div className="text-sm text-slate-200 leading-relaxed pt-1">
                            <MathRenderer
                                content={solutionMarkdown || speechResponse || 'No detailed solution available.'}
                                textClassName="text-slate-200"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Follow-up Question Input */}
                    <form onSubmit={handleFollowUpSubmit} className="relative w-full sm:w-auto sm:flex-1">
                        <input
                            type="text"
                            value={followUpText}
                            onChange={(e) => setFollowUpText(e.target.value)}
                            placeholder="Ask follow-up question or equation..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 pr-8"
                        />
                        <button
                            type="submit"
                            disabled={!followUpText.trim()}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-purple-400 disabled:opacity-40 transition"
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </form>

                    {/* Insert to Whiteboard Button */}
                    <button
                        type="button"
                        onClick={() => {
                            onInsertToBoard({
                                question,
                                speechResponse,
                                solutionMarkdown,
                                canvasAction
                            });
                            onClose();
                        }}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition shrink-0"
                    >
                        <PlusCircle className="w-4 h-4" />
                        <span>Insert Solution to Whiteboard</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
