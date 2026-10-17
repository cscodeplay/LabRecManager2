'use client';

import React, { useState, useRef, useEffect } from 'react';
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
    Compass,
    Trash2,
    MessageSquare,
    Radio,
    RefreshCw,
    AlertCircle,
    CheckCircle2
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
    chatHistory = [],
    onClearChat = () => {},
    onSendMessage = () => {},
    onRetryMessage = () => {},
    question = '',
    speechResponse = '',
    solutionMarkdown = '',
    canvasAction = null,
    modelUsed = '',
    providerUsed = '',
    activeProvider = 'auto',
    onChangeActiveProvider = () => {},
    isSpeaking = false,
    isThinking = false,
    isVoiceListening = false,
    onToggleVoice = () => {},
    onSpeak = () => {},
    onStopSpeak = () => {},
    onInsertToBoard = () => {},
    onAskFollowUp = () => {}
}) {
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'voice'
    const [inputText, setInputText] = useState('');
    const [copiedIndex, setCopiedIndex] = useState(null);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (isOpen && activeTab === 'chat') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, isThinking, isOpen, activeTab]);

    // Auto-focus input when opened in chat mode
    useEffect(() => {
        if (isOpen && activeTab === 'chat') {
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
        }
    }, [isOpen, activeTab]);

    if (!isOpen) return null;

    const handleCopy = (text, idx = 'current') => {
        navigator.clipboard?.writeText(text);
        setCopiedIndex(idx);
        toast.success('Copied to clipboard', { icon: '📋' });
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleSend = () => {
        const trimmed = inputText.trim();
        if (!trimmed || isThinking) return;
        if (onSendMessage) {
            onSendMessage(trimmed);
        } else if (onAskFollowUp) {
            onAskFollowUp(trimmed);
        }
        setInputText('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleChipClick = (prompt) => {
        if (onSendMessage) {
            onSendMessage(prompt);
        } else if (onAskFollowUp) {
            onAskFollowUp(prompt);
        }
    };

    // Determine fallback messages if chatHistory is empty but question/solution exist
    const displayMessages = chatHistory.length > 0 ? chatHistory : (
        question || solutionMarkdown || speechResponse ? [
            ...(question ? [{ id: 'init_u', role: 'user', content: question, timestamp: 'Just now' }] : []),
            {
                id: 'init_a',
                role: 'assistant',
                question,
                content: solutionMarkdown || speechResponse,
                speechResponse,
                solutionMarkdown,
                canvasAction,
                modelUsed,
                providerUsed,
                timestamp: 'Just now'
            }
        ] : []
    );

    return (
        <div
            className="dark fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div
                className="dark bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl max-w-2xl w-full h-[88vh] max-h-[850px] flex flex-col text-slate-100 overflow-hidden"
                style={{ backgroundColor: '#0f172a' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ─── 1. Header ─── */}
                <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-sm sm:text-base text-white">AI Whiteboard Co-Pilot</h3>
                                {isThinking ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                        <span>Thinking...</span>
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        <span>Ready</span>
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10.5px] text-slate-400 font-medium">Engine:</span>
                                <select
                                    value={activeProvider}
                                    onChange={(e) => onChangeActiveProvider(e.target.value)}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-[10.5px] px-1.5 py-0.5 focus:outline-none focus:border-purple-500 font-medium"
                                >
                                    <option value="auto">Auto (Cascading)</option>
                                    <option value="groq">Groq (Qwen / Llama-3)</option>
                                    <option value="gemini">Google Gemini 2.5</option>
                                    <option value="sambanova">SambaNova</option>
                                    <option value="openai">OpenAI (GPT-4o)</option>
                                    <option value="anthropic">Claude 3.7</option>
                                    <option value="deepseek">DeepSeek</option>
                                    <option value="openrouter">OpenRouter</option>
                                    <option value="nvidia">NVIDIA NIM</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Mode Switcher Tabs */}
                        <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
                            <button
                                type="button"
                                onClick={() => setActiveTab('chat')}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                                    activeTab === 'chat'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                title="Chat Mode (Type prompts, no microphone required)"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Chat</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('voice')}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                                    activeTab === 'voice'
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                title="Voice Mode (Speak prompts with speech-to-text)"
                            >
                                <Radio className="w-3.5 h-3.5" />
                                <span>Voice</span>
                            </button>
                        </div>

                        {/* Clear Chat Button */}
                        <button
                            type="button"
                            onClick={() => {
                                onClearChat();
                                toast('Cleared chat conversation', { icon: '🧹' });
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Clear Chat Conversation"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Close Modal */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ─── 2. Quick Prompt Chips Bar ─── */}
                <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 shrink-0 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-300" /> Prompts:
                    </span>
                    {QUICK_PROMPT_CHIPS.map((chip, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleChipClick(chip.prompt)}
                            disabled={isThinking}
                            className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/80 hover:bg-purple-600/30 hover:border-purple-500/50 text-slate-300 hover:text-white border border-slate-700/60 transition shrink-0 disabled:opacity-50"
                        >
                            {chip.label}
                        </button>
                    ))}
                </div>

                {/* ─── 3. Main Body Area ─── */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {/* Voice Mode Banner & Listening Status */}
                    {activeTab === 'voice' && (
                        <div className="bg-gradient-to-r from-purple-950/50 via-slate-900 to-indigo-950/50 border border-purple-800/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                    isVoiceListening
                                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse ring-4 ring-rose-500/20'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}>
                                    {isVoiceListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-white">
                                        {isVoiceListening ? 'Listening to speech microphone...' : 'Microphone is standby'}
                                    </h4>
                                    <p className="text-[11px] text-slate-400">
                                        {isVoiceListening
                                            ? 'Speak questions, formulas, or commands clearly'
                                            : 'Click Toggle Microphone to speak instructions to AI'}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={onToggleVoice}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                                    isVoiceListening
                                        ? 'bg-rose-500 hover:bg-rose-600 text-white'
                                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                                }`}
                            >
                                {isVoiceListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                                <span>{isVoiceListening ? 'Stop Listening' : 'Start Speaking'}</span>
                            </button>
                        </div>
                    )}

                    {/* Empty Conversation Welcome State */}
                    {displayMessages.length === 0 && !isThinking && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                            <div className="w-14 h-14 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
                                <Sparkles className="w-7 h-7" />
                            </div>
                            <h4 className="font-bold text-base text-slate-200">How can AI Co-Pilot assist your whiteboard?</h4>
                            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                                Type any math equation, physics problem, geometry construction, flowchart, or concept below.
                                AI Co-Pilot will solve it step-by-step and can draw it directly on the canvas!
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => handleChipClick('Explain Pythagorean theorem with diagram')}
                                    className="px-3 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                                >
                                    📐 Pythagorean Theorem
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleChipClick('Draw concentric circles with radius 3cm, 5cm, 7cm')}
                                    className="px-3 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                                >
                                    ⭕ Concentric Circles
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleChipClick('Solve quadratic equation x^2 - 5x + 6 = 0')}
                                    className="px-3 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                                >
                                    🧮 Quadratic Equation
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Chat Messages Stream */}
                    {displayMessages.map((msg, index) => {
                        const isUser = msg.role === 'user';
                        const isError = Boolean(msg.isError || msg.error);
                        const hasCanvas = Boolean(msg.canvasAction && (msg.canvasAction.action || msg.canvasAction.type));

                        if (isUser) {
                            return (
                                <div key={msg.id || index} className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-150">
                                    <div className="max-w-[85%] bg-purple-600/90 text-white rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-md space-y-1">
                                        <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                        <div className="text-[9.5px] text-purple-200/80 text-right">{msg.timestamp || 'You'}</div>
                                    </div>
                                </div>
                            );
                        }

                        // Assistant Message Card
                        return (
                            <div key={msg.id || index} className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-150">
                                <div className="max-w-[95%] sm:max-w-[90%] bg-slate-950/90 border border-slate-800 rounded-2xl rounded-tl-xs p-4 shadow-xl space-y-3 text-slate-200">
                                    {/* Assistant Header & Badges */}
                                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white">
                                                <Bot className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-xs font-bold text-white">AI Co-Pilot</span>
                                            {msg.providerUsed && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                    {msg.providerUsed.toUpperCase()} {msg.modelUsed ? `(${msg.modelUsed.split('/').pop()})` : ''}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {/* Audio Speech Narration Button */}
                                            {msg.speechResponse && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSpeaking) onStopSpeak();
                                                        else onSpeak(msg.speechResponse);
                                                    }}
                                                    className={`p-1 rounded-md text-xs font-medium transition ${
                                                        isSpeaking ? 'text-rose-400 bg-rose-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                    }`}
                                                    title={isSpeaking ? 'Stop Voice' : 'Play Voice Narration'}
                                                >
                                                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                                </button>
                                            )}
                                            {/* Copy Message */}
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(msg.solutionMarkdown || msg.content || msg.speechResponse, index)}
                                                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                                title="Copy Solution"
                                            >
                                                {copiedIndex === index ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Error Alert Display */}
                                    {isError ? (
                                        <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-3 space-y-2 text-rose-200">
                                            <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                                                <AlertCircle className="w-4 h-4 text-rose-400" />
                                                <span>AI Execution Failed</span>
                                            </div>
                                            <p className="text-xs text-rose-300/90 leading-relaxed">{msg.error || 'The model could not process this prompt.'}</p>
                                            {msg.question && (
                                                <button
                                                    type="button"
                                                    onClick={() => onRetryMessage(msg.question)}
                                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition shadow"
                                                >
                                                    <RefreshCw className="w-3 h-3" />
                                                    <span>Retry Request</span>
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Canvas Action Notice Badge */}
                                            {hasCanvas && (
                                                <div className="bg-gradient-to-r from-indigo-950/50 via-purple-950/40 to-slate-900 border border-indigo-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs">
                                                    <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold">
                                                        <Shapes className="w-4 h-4 text-purple-400 shrink-0" />
                                                        <span>
                                                            {msg.canvasAction.action === 'insert_3d'
                                                                ? `3D Object Ready: ${msg.canvasAction.label || '3D Model'}`
                                                                : msg.canvasAction.action === 'flowchart'
                                                                ? `Flowchart Ready (${msg.canvasAction.nodes?.length || 0} Nodes)`
                                                                : `Canvas Diagram Ready: ${msg.canvasAction.title || 'Diagram'}`}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                                                        Interactive
                                                    </span>
                                                </div>
                                            )}

                                            {/* Markdown & Mathematical Formatted Output */}
                                            <div className="text-xs sm:text-sm text-slate-100 leading-relaxed">
                                                <MathRenderer
                                                    content={msg.solutionMarkdown || msg.content || msg.speechResponse || ''}
                                                    textClassName="text-slate-100"
                                                />
                                            </div>

                                            {/* Spoken Narration Quote */}
                                            {msg.speechResponse && msg.speechResponse !== msg.solutionMarkdown && (
                                                <div className="bg-purple-950/20 border border-purple-800/30 rounded-xl p-2.5 text-xs text-purple-200 italic">
                                                    &quot;{msg.speechResponse}&quot;
                                                </div>
                                            )}

                                            {/* Collapsible SchemDraw Python Code in 10px font */}
                                            {(msg.schemdrawCode || msg.diagram?.code || msg.canvasAction?.code) && (
                                                <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 overflow-hidden shadow-md">
                                                    <details className="group">
                                                        <summary className="flex items-center justify-between px-3 py-1.5 cursor-pointer bg-slate-950/90 hover:bg-slate-800/60 transition text-slate-300 hover:text-white select-none" style={{ fontSize: '10px' }}>
                                                            <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-emerald-400">
                                                                <span>🐍</span>
                                                                <span>View Executed SchemDraw Python Code</span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-mono group-open:rotate-180 transition-transform">▼</span>
                                                        </summary>
                                                        <div className="p-2.5 bg-slate-950 border-t border-slate-800/80 relative">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const codeStr = msg.schemdrawCode || msg.diagram?.code || msg.canvasAction?.code || '';
                                                                    navigator.clipboard.writeText(codeStr);
                                                                    toast.success('Python code copied to clipboard!', { icon: '📋' });
                                                                }}
                                                                className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-600 transition"
                                                                title="Copy Python Code"
                                                            >
                                                                Copy
                                                            </button>
                                                            <pre className="font-mono text-[10px] leading-relaxed text-indigo-200 whitespace-pre overflow-x-auto max-h-52 pr-12" style={{ fontSize: '10px' }}>
                                                                <code>{msg.schemdrawCode || msg.diagram?.code || msg.canvasAction?.code}</code>
                                                            </pre>
                                                        </div>
                                                    </details>
                                                </div>
                                            )}

                                            {/* Canvas Drawing Execution Buttons */}
                                            <div className="pt-1 flex flex-wrap items-center gap-2 border-t border-slate-800/60">
                                                {hasCanvas ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onInsertToBoard({
                                                                question: msg.question,
                                                                speechResponse: msg.speechResponse,
                                                                solutionMarkdown: msg.solutionMarkdown,
                                                                canvasAction: msg.canvasAction,
                                                                diagram: msg.diagram,
                                                                schemdrawCode: msg.schemdrawCode,
                                                                code: msg.code || msg.schemdrawCode || msg.diagram?.code
                                                            });
                                                            onClose();
                                                        }}
                                                        className="px-3 py-1.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow transition bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 shadow-emerald-500/20 ring-1 ring-emerald-400/40"
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                                        <span>Draw on Whiteboard</span>
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                onInsertToBoard({
                                                                    question: msg.question,
                                                                    speechResponse: msg.speechResponse,
                                                                    solutionMarkdown: msg.solutionMarkdown,
                                                                    canvasAction: msg.canvasAction,
                                                                    diagram: msg.diagram,
                                                                    schemdrawCode: msg.schemdrawCode,
                                                                    code: msg.code || msg.schemdrawCode || msg.diagram?.code
                                                                }, 'problem_diagram_layout');
                                                                onClose();
                                                            }}
                                                            className="px-2.5 py-1 rounded-lg text-white font-semibold text-xs flex items-center gap-1 transition bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 shadow-sm"
                                                            title="Draw diagram layout on whiteboard"
                                                        >
                                                            <Shapes className="w-3.5 h-3.5 text-emerald-300" />
                                                            <span>Board Layout</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                onInsertToBoard({
                                                                    question: msg.question,
                                                                    speechResponse: msg.speechResponse,
                                                                    solutionMarkdown: msg.solutionMarkdown,
                                                                    canvasAction: msg.canvasAction,
                                                                    diagram: msg.diagram,
                                                                    schemdrawCode: msg.schemdrawCode,
                                                                    code: msg.code || msg.schemdrawCode || msg.diagram?.code
                                                                }, 'flowchart');
                                                                onClose();
                                                            }}
                                                            className="px-2.5 py-1 rounded-lg text-white font-semibold text-xs flex items-center gap-1 transition bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-sm"
                                                            title="Generate flowchart from solution"
                                                        >
                                                            <Layers className="w-3.5 h-3.5 text-cyan-300" />
                                                            <span>Flowchart</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                onInsertToBoard({
                                                                    question: msg.question,
                                                                    speechResponse: msg.speechResponse,
                                                                    solutionMarkdown: msg.solutionMarkdown,
                                                                    canvasAction: msg.canvasAction,
                                                                    diagram: msg.diagram,
                                                                    schemdrawCode: msg.schemdrawCode,
                                                                    code: msg.code || msg.schemdrawCode || msg.diagram?.code
                                                                }, 'card');
                                                                onClose();
                                                            }}
                                                            className="px-2.5 py-1 rounded-lg text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-1 transition bg-slate-800 hover:bg-slate-700 border border-slate-700"
                                                            title="Insert solution card onto whiteboard"
                                                        >
                                                            <PlusCircle className="w-3.5 h-3.5 text-purple-400" />
                                                            <span>Card</span>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Thinking / Generating Live Indicator */}
                    {isThinking && (
                        <div className="flex justify-start animate-in fade-in duration-150">
                            <div className="bg-slate-950/90 border border-purple-500/50 rounded-2xl rounded-tl-xs p-3.5 flex items-center gap-3 shadow-xl">
                                <Loader2 className="w-5 h-5 text-purple-400 animate-spin shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-purple-200">
                                        Generating solution and canvas models...
                                    </p>
                                    <p className="text-[10.5px] text-purple-400">
                                        Formulating math derivations, step narration, and geometric drawings
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* ─── 4. Footer Input Panel (Chat Mode & Follow-Up) ─── */}
                <div className="p-3 border-t border-slate-800 bg-slate-950/95 shrink-0">
                    <div className="relative flex items-center bg-slate-900 border border-slate-700 rounded-xl focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500/30 transition shadow-inner">
                        <textarea
                            ref={textareaRef}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a math problem, physics question, or drawing prompt... (Enter to send, Shift+Enter for new line)"
                            rows={1}
                            className="w-full bg-transparent px-3.5 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none resize-none custom-scrollbar max-h-24 pr-20"
                            style={{ minHeight: '40px' }}
                        />

                        <div className="absolute right-2 flex items-center gap-1.5">
                            {/* Voice Mic Quick Toggle */}
                            <button
                                type="button"
                                onClick={onToggleVoice}
                                className={`p-1.5 rounded-lg transition ${
                                    isVoiceListening
                                        ? 'text-rose-400 bg-rose-500/20 animate-pulse'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                                title={isVoiceListening ? 'Stop Microphone' : 'Use Voice Input'}
                            >
                                {isVoiceListening ? <Mic className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
                            </button>

                            {/* Send Button */}
                            <button
                                type="button"
                                onClick={handleSend}
                                disabled={!inputText.trim() || isThinking}
                                className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-40 disabled:hover:bg-purple-600 transition shadow"
                                title="Send Prompt (Enter)"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] text-slate-500">
                        <span>Press <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded text-slate-400">Enter</kbd> to submit, <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded text-slate-400">Shift+Enter</kbd> for new line</span>
                        <span>Multi-modal • STEM & Geometry Ready</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
