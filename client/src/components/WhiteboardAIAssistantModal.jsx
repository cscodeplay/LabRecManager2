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
    FileText,
    Mic,
    MicOff,
    Box,
    Loader2,
    Layers,
    Shapes,
    Compass
} from 'lucide-react';
import MathRenderer from './MathRenderer';
import toast from 'react-hot-toast';

const QUICK_PROMPT_CHIPS = [
    { label: '🪐 3D Earth', prompt: 'Draw 3D Earth model and explain planetary rotation' },
    { label: '⚛️ 3D Atom', prompt: 'Create 3D Atom model with orbiting electrons' },
    { label: '🧬 3D DNA', prompt: 'Insert 3D DNA double helix and explain genetics' },
    { label: '📊 Auth Flowchart', prompt: 'Draw login authentication flowchart' },
    { label: '🌊 Water Cycle', prompt: 'Draw water cycle flowchart and explain stages' },
    { label: '💻 3D Router', prompt: 'Draw 3D network router and explain packet routing' },
    { label: '📐 Pythagoras', prompt: 'Explain Pythagorean theorem with diagram' },
    { label: '⭕ Venn Diagram', prompt: 'Draw Venn diagram showing two overlapping sets' },
    { label: '🚀 3D Rocket', prompt: 'Draw 3D rocket model' },
    { label: '🪐 3D Saturn', prompt: 'Create 3D Saturn model with rings' }
];

export default function WhiteboardAIAssistantModal({
    isOpen,
    onClose,
    question = '',
    speechResponse = '',
    solutionMarkdown = '',
    canvasAction = null,
    isSpeaking = false,
    isThinking = false,
    isVoiceListening = false,
    onToggleVoice = () => {},
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
        e?.preventDefault?.();
        if (followUpText.trim()) {
            onAskFollowUp(followUpText.trim());
            setFollowUpText('');
        }
    };

    const handleChipClick = (prompt) => {
        onAskFollowUp(prompt);
    };

    const hasCanvasAction = Boolean(canvasAction && canvasAction.action);

    return (
        <div
            className="dark fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div
                className="dark bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col text-slate-100 overflow-hidden"
                style={{ backgroundColor: '#0f172a' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base text-white">AI Whiteboard Co-Pilot</h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    Interactive 3D • Voice • Drawing
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Generates interactive 3D models, flowcharts, solutions, and speaks explanations
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Direct Voice Listening Toggle in Modal */}
                        <button
                            type="button"
                            onClick={onToggleVoice}
                            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition border ${
                                isVoiceListening
                                    ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30 animate-pulse'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
                            }`}
                            title={isVoiceListening ? 'Stop Voice Listening' : 'Speak to AI Co-Pilot'}
                        >
                            {isVoiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            <span className="hidden sm:inline">{isVoiceListening ? 'Listening...' : 'Voice Mic'}</span>
                        </button>

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

                {/* Quick Generative Chips */}
                <div className="px-5 py-2.5 bg-slate-950/50 border-b border-slate-800/80 overflow-x-auto no-scrollbar flex items-center gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-purple-400 shrink-0 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Quick Draw:
                    </span>
                    {QUICK_PROMPT_CHIPS.map((chip, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleChipClick(chip.prompt)}
                            disabled={isThinking}
                            className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 hover:bg-purple-600/30 hover:border-purple-500/50 text-slate-300 hover:text-white border border-slate-700/60 transition shrink-0 disabled:opacity-50"
                        >
                            {chip.label}
                        </button>
                    ))}
                </div>

                {/* Body Content */}
                <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
                    {/* Thinking status indicator */}
                    {isThinking && (
                        <div className="bg-purple-950/40 border border-purple-500/50 rounded-xl p-3.5 flex items-center gap-3 animate-pulse">
                            <Loader2 className="w-5 h-5 text-purple-400 animate-spin shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-purple-200">
                                    AI Co-Pilot is generating solution and whiteboard canvas models...
                                </p>
                                <p className="text-[11px] text-purple-400">
                                    Preparing step-by-step narration, math formulas, and interactive diagrams
                                </p>
                            </div>
                        </div>
                    )}

                    {/* User Question / Spoken Prompt */}
                    {question && (
                        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
                            <Bot className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider">
                                    Prompt / Spoken Command:
                                </span>
                                <span className="text-slate-200 font-medium text-sm">{question}</span>
                            </div>
                        </div>
                    )}

                    {/* Canvas Action Generation Preview Badge */}
                    {hasCanvasAction && (
                        <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-pink-950/30 border border-indigo-500/50 rounded-xl p-3.5 space-y-1.5 shadow-md">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold">
                                    {canvasAction.action === 'insert_3d' ? (
                                        <Box className="w-4 h-4 text-pink-400 animate-pulse" />
                                    ) : canvasAction.action === 'flowchart' ? (
                                        <Layers className="w-4 h-4 text-indigo-400" />
                                    ) : (
                                        <Shapes className="w-4 h-4 text-purple-400" />
                                    )}
                                    <span>
                                        {canvasAction.action === 'insert_3d'
                                            ? `Interactive 3D Model Ready: ${canvasAction.label || canvasAction.modelType || '3D Object'}`
                                            : canvasAction.action === 'flowchart'
                                            ? `Native Flowchart Diagram Ready (${canvasAction.nodes?.length || 0} Connected Nodes)`
                                            : `Native Whiteboard Diagram Ready: ${canvasAction.title || 'Diagram'}`}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    Fully Editable
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                {canvasAction.action === 'insert_3d'
                                    ? `This 3D model will be placed directly on the board. You can freely rotate it in 3D, scale, move, and inspect all dimensions.`
                                    : canvasAction.action === 'flowchart'
                                    ? `Generated using native whiteboard shapes and smart arrow connectors. Drag, edit text, or reposition nodes anytime!`
                                    : `Generated using native geometric shapes, arrows, and labels. Fully selectable and customizable.`}
                            </p>
                        </div>
                    )}

                    {/* Spoken AI Audio Answer Card */}
                    {speechResponse && (
                        <div className="bg-purple-950/20 border border-purple-800/40 rounded-xl p-4 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold">
                                    <Volume2 className="w-4 h-4 text-purple-400" />
                                    <span>Spoken Voice Narration</span>
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
                            <span>Step-by-Step Solution & Notes</span>
                        </div>

                        <div className="text-sm text-slate-100 leading-relaxed pt-1">
                            <MathRenderer
                                content={solutionMarkdown || speechResponse || 'Ask any math problem, drawing prompt, or question to get started.'}
                                textClassName="text-slate-100"
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
                            placeholder="Ask follow-up, equation, or drawing prompt..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 pr-16"
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                                type="button"
                                onClick={onToggleVoice}
                                className={`p-1 rounded-md transition ${
                                    isVoiceListening ? 'text-rose-400 bg-rose-500/20' : 'text-slate-400 hover:text-white'
                                }`}
                                title="Toggle Microphone"
                            >
                                <Mic className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="submit"
                                disabled={!followUpText.trim() || isThinking}
                                className="p-1 text-slate-400 hover:text-purple-400 disabled:opacity-40 transition"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </form>

                    {/* Insert / Draw to Whiteboard Buttons */}
                    {hasCanvasAction ? (
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
                            className="w-full sm:w-auto px-4 py-2 rounded-xl text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition shrink-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 shadow-emerald-500/20 ring-1 ring-emerald-400/40"
                        >
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>Draw & Place on Whiteboard</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    onInsertToBoard({
                                        question,
                                        speechResponse,
                                        solutionMarkdown,
                                        canvasAction
                                    }, 'flowchart');
                                    onClose();
                                }}
                                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg transition bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-indigo-500/20"
                                title="Convert solution steps into a connected whiteboard flowchart diagram"
                            >
                                <Layers className="w-4 h-4 text-cyan-300" />
                                <span>Build Flowchart</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onInsertToBoard({
                                        question,
                                        speechResponse,
                                        solutionMarkdown,
                                        canvasAction
                                    }, 'card');
                                    onClose();
                                }}
                                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition bg-slate-800 hover:bg-slate-700 border border-slate-700"
                                title="Insert clean solution card onto whiteboard"
                            >
                                <PlusCircle className="w-4 h-4 text-purple-400" />
                                <span>Insert Card</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
