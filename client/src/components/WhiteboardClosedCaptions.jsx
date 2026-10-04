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
    Send,
    ChevronDown,
    ChevronUp,
    StickyNote as StickyNoteIcon,
    Type as TypeIcon,
    Copy,
    Check
} from 'lucide-react';
import katex from 'katex';

function renderFormattedText(rawText) {
    if (!rawText) return '';
    const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    let html = escapeHtml(rawText);

    // Block math $$...$$
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
        try {
            return `<div class="my-1.5 p-1 bg-slate-900/80 rounded border border-indigo-500/30 overflow-x-auto text-center">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
        } catch (e) { return match; }
    });

    // Inline math $...$
    html = html.replace(/\$([^$\n]+)\$/g, (match, math) => {
        try {
            return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
        } catch (e) { return match; }
    });

    // Bold **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
    return html;
}

// Parse text into structured, scannable bullet blocks for whiteboard teaching
function parseContentBlocks(rawText) {
    if (!rawText) return [];
    const lines = rawText.split('\n');
    const blocks = [];
    let currentBlock = null;
    let charOffset = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const lineLen = line.length + 1;

        if (!trimmed) {
            charOffset += lineLen;
            continue;
        }

        const bulletMatch = trimmed.match(/^(?:(?:\d+[\.\)]|Step\s+\d+[:\.]?|Stage\s+\d+[:\.]?|[-*•])\s*)(.+)$/i);
        const isHeading = trimmed.startsWith('#') || (trimmed.endsWith(':') && trimmed.length < 60 && !trimmed.includes('. '));

        if (bulletMatch) {
            if (currentBlock) blocks.push(currentBlock);
            const prefix = trimmed.slice(0, trimmed.length - bulletMatch[1].length).trim();
            currentBlock = {
                id: `blk_${blocks.length}`,
                type: 'bullet',
                prefix: prefix || '•',
                text: bulletMatch[1].trim(),
                startChar: charOffset,
                endChar: charOffset + trimmed.length
            };
        } else if (isHeading) {
            if (currentBlock) blocks.push(currentBlock);
            currentBlock = {
                id: `blk_${blocks.length}`,
                type: 'heading',
                prefix: '📌',
                text: trimmed.replace(/^#+\s*/, ''),
                startChar: charOffset,
                endChar: charOffset + trimmed.length
            };
        } else {
            if (currentBlock && currentBlock.type === 'bullet' && !trimmed.startsWith('$$')) {
                currentBlock.text += ' ' + trimmed;
                currentBlock.endChar = charOffset + trimmed.length;
            } else {
                if (currentBlock) blocks.push(currentBlock);
                currentBlock = {
                    id: `blk_${blocks.length}`,
                    type: 'paragraph',
                    prefix: '•',
                    text: trimmed,
                    startChar: charOffset,
                    endChar: charOffset + trimmed.length
                };
            }
        }
        charOffset += lineLen;
    }
    if (currentBlock) blocks.push(currentBlock);
    return blocks;
}

export default function WhiteboardClosedCaptions({
    isVisible = true,
    isListening = false,
    transcript = '',
    interimTranscript = '',
    feedback = '',
    isAiThinking = false,
    isAiSpeaking = false,
    aiSpeakingText = '',
    speakingCharIndex = 0,
    aiSolution = null,
    aiResponseText = '',
    suggestedFollowUps = [],
    onCreateStickyNote = () => {},
    onInsertAsText = () => {},
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
    const [isPaneCollapsed, setIsPaneCollapsed] = useState(false);
    const [isPaneDismissed, setIsPaneDismissed] = useState(false);
    const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'solution'
    const [heightMode, setHeightMode] = useState('standard'); // 'compact' | 'standard' | 'expanded'
    const [followUpInput, setFollowUpInput] = useState('');
    const [copied, setCopied] = useState(false);
    const lastResponseSeenRef = React.useRef('');
    const scrollContainerRef = React.useRef(null);
    const userIsScrollingRef = React.useRef(false);
    const scrollTimeoutRef = React.useRef(null);

    // Determine the active display response
    const activeAiResponse = aiResponseText || aiSolution?.solutionMarkdown || aiSolution?.speechResponse || (isAiSpeaking ? aiSpeakingText : '');

    // Reset pane expansion & visibility whenever a fresh AI response arrives
    useEffect(() => {
        if (activeAiResponse && activeAiResponse !== lastResponseSeenRef.current) {
            lastResponseSeenRef.current = activeAiResponse;
            setIsPaneDismissed(false);
            setIsPaneCollapsed(false);
        }
    }, [activeAiResponse]);

    // Keep track of the most recent utterance or feedback
    useEffect(() => {
        if (transcript) {
            setLastSpoken(transcript);
            if (!isEditing) {
                setEditText(transcript);
            }
        }
    }, [transcript, isEditing]);

    const displayText = (activeTab === 'solution' && aiSolution?.solutionMarkdown)
        ? aiSolution.solutionMarkdown
        : activeAiResponse;

    const blocks = React.useMemo(() => parseContentBlocks(displayText), [displayText]);

    // Track active bullet based on speakingCharIndex from speech synthesis
    const activeBlockIndex = React.useMemo(() => {
        if (!isAiSpeaking || blocks.length === 0) return -1;
        const idx = blocks.findIndex(b => speakingCharIndex >= b.startChar && speakingCharIndex <= b.endChar);
        if (idx !== -1) return idx;
        if (speakingCharIndex > 0) {
            for (let i = blocks.length - 1; i >= 0; i--) {
                if (speakingCharIndex >= blocks[i].startChar) return i;
            }
        }
        return 0;
    }, [isAiSpeaking, speakingCharIndex, blocks]);

    // Auto-scroll to active bullet point while dictating (respecting user manual scrolling)
    useEffect(() => {
        if (!isAiSpeaking || userIsScrollingRef.current || activeBlockIndex < 0) return;
        const el = document.getElementById(`cc-block-${activeBlockIndex}`);
        if (el && scrollContainerRef.current) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [activeBlockIndex, isAiSpeaking]);

    const handleUserScroll = () => {
        userIsScrollingRef.current = true;
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            userIsScrollingRef.current = false;
        }, 3000);
    };

    if (!isVisible) return null;

    // Determine current display mode
    const hasActiveText = Boolean(interimTranscript || transcript || aiSpeakingText || feedback || isAiThinking);

    // If completely idle and no recent text, keep it subtle or auto-compact
    // Contextual pills
    const defaultFollowUps = ['💡 Explain more simply', '📐 Show formula', '✨ Explain with 3D model', '📝 Summarize key points'];
    const activePills = (suggestedFollowUps && suggestedFollowUps.length > 0) ? suggestedFollowUps : defaultFollowUps;

    return (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] sm:w-[540px] pointer-events-auto select-none transition-all duration-200 flex flex-col">
            {/* Collapsible AI Explanation & Knowledge Pane Above CC Box (Integrated Solution Hub) */}
            {activeAiResponse && !isPaneDismissed && !isMinimized && (
                <div className="mb-2 bg-slate-950/95 backdrop-blur-md border border-indigo-500/50 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-2">
                    {/* Header Bar with Tabs & Controls */}
                    <div className="px-3.5 py-1.5 bg-indigo-950/60 border-b border-indigo-500/30 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            
                            {/* Tabs: Summary vs Full Solution */}
                            <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-indigo-500/30">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('summary')}
                                    className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition ${
                                        activeTab === 'summary'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    💬 Summary
                                </button>
                                {aiSolution?.solutionMarkdown && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('solution')}
                                        className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition ${
                                            activeTab === 'solution'
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        📑 Full Solution
                                    </button>
                                )}
                            </div>

                            {aiSolution?.question && (
                                <span className="text-[10px] text-slate-400 truncate max-w-[160px] hidden sm:inline">
                                    {aiSolution.question}
                                </span>
                            )}
                        </div>

                        {/* Right Header Controls */}
                        <div className="flex items-center gap-1">
                            {/* Whiteboard Space Mode (Compact vs Standard vs Expanded) */}
                            <button
                                type="button"
                                onClick={() => setHeightMode(prev => prev === 'compact' ? 'standard' : prev === 'standard' ? 'expanded' : 'compact')}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                                title={`Whiteboard Space Mode: ${heightMode} (Toggle Compact/Standard/Expanded)`}
                            >
                                {heightMode === 'compact' ? '🗜️ Mini' : heightMode === 'expanded' ? '↕️ Max' : '📐 Normal'}
                            </button>

                            {/* Copy button */}
                            <button
                                type="button"
                                onClick={() => {
                                    const textToCopy = (activeTab === 'solution' && aiSolution?.solutionMarkdown) ? aiSolution.solutionMarkdown : activeAiResponse;
                                    navigator.clipboard.writeText(textToCopy);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1800);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                title="Copy content"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {/* Collapse Toggle */}
                            <button
                                type="button"
                                onClick={() => setIsPaneCollapsed(prev => !prev)}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                title={isPaneCollapsed ? "Expand Response" : "Collapse Response"}
                            >
                                {isPaneCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                            </button>

                            {/* Dismiss */}
                            <button
                                type="button"
                                onClick={() => setIsPaneDismissed(true)}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                title="Dismiss Response Pane"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Expandable Content Area with Synchronized Dictation Scrolling */}
                    {!isPaneCollapsed && (
                        <div className="flex flex-col">
                            {/* Dictating Status Banner if active */}
                            {isAiSpeaking && blocks.length > 0 && activeBlockIndex >= 0 && (
                                <div className="px-3 py-1 bg-indigo-950/70 border-b border-indigo-500/20 flex items-center justify-between text-[11px] text-indigo-300">
                                    <div className="flex items-center gap-1.5 font-medium">
                                        <Volume2 className="w-3 h-3 text-indigo-400 animate-pulse" />
                                        <span>Dictating Point {activeBlockIndex + 1} of {blocks.length}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 italic">Auto-scrolling with voice</span>
                                </div>
                            )}

                            {/* Scannable Bullet Points Container */}
                            <div 
                                ref={scrollContainerRef}
                                onScroll={handleUserScroll}
                                onWheel={handleUserScroll}
                                onTouchStart={handleUserScroll}
                                className={`p-3 text-xs text-slate-200 space-y-2 overflow-y-auto custom-scrollbar select-text transition-all duration-200 ${
                                    heightMode === 'compact' ? 'max-h-36' : heightMode === 'expanded' ? 'max-h-96' : 'max-h-60'
                                }`}
                            >
                                {blocks.length > 0 ? (
                                    blocks.map((block, idx) => {
                                        const isActive = isAiSpeaking && (idx === activeBlockIndex);
                                        return (
                                            <div
                                                id={`cc-block-${idx}`}
                                                key={block.id || idx}
                                                className={`p-2 rounded-xl transition-all duration-200 border ${
                                                    isActive
                                                        ? 'bg-indigo-600/25 border-indigo-400 text-white ring-1 ring-indigo-400/40 shadow-md scale-[1.01]'
                                                        : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800/80 text-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                                        isActive ? 'bg-indigo-500 text-white shadow-xs' : 'bg-slate-800 text-indigo-300 border border-slate-700/80'
                                                    }`}>
                                                        {block.prefix || (idx + 1)}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div
                                                            className="leading-relaxed text-[12px]"
                                                            dangerouslySetInnerHTML={{ __html: renderFormattedText(block.text) }}
                                                        />
                                                    </div>
                                                    {isActive && (
                                                        <span className="shrink-0 flex items-center gap-1 text-[9px] text-indigo-300 font-semibold px-1 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/40 animate-pulse">
                                                            <Volume2 className="w-2.5 h-2.5 text-indigo-400" />
                                                            <span>Reading</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div
                                        className="leading-relaxed whitespace-pre-wrap select-text text-slate-200 text-[12px]"
                                        dangerouslySetInnerHTML={{ __html: renderFormattedText(displayText) }}
                                    />
                                )}
                            </div>

                            {/* Suggested Follow-up Action Pills */}
                            <div className="p-3 pt-2 border-t border-slate-800/90 flex flex-wrap gap-1.5 items-center bg-slate-950/40">
                                {/* 1. Create sticky note of above */}
                                <button
                                    type="button"
                                    onClick={() => onCreateStickyNote(displayText)}
                                    className="px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-[11px] font-medium flex items-center gap-1 transition shadow-sm hover:scale-105 active:scale-95"
                                    title="Create a yellow sticky note on canvas with this response"
                                >
                                    <span>📝</span>
                                    <span>Create sticky note of above</span>
                                </button>

                                {/* 2. Insert as text */}
                                <button
                                    type="button"
                                    onClick={() => onInsertAsText(displayText)}
                                    className="px-2.5 py-1 rounded-full bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/50 text-[11px] font-medium flex items-center gap-1 transition shadow-sm hover:scale-105 active:scale-95"
                                    title="Place this response directly on canvas as a text object"
                                >
                                    <span>🔤</span>
                                    <span>Insert as text</span>
                                </button>

                                {/* Contextual follow-up suggestions */}
                                {activePills.map((pill, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => onExecuteCommand(pill)}
                                        className="px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-medium transition shadow-sm hover:scale-105 active:scale-95"
                                    >
                                        {pill}
                                    </button>
                                ))}
                            </div>

                            {/* Inline Follow-up Input */}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (followUpInput.trim()) {
                                        onExecuteCommand(followUpInput.trim());
                                        setFollowUpInput('');
                                    }
                                }}
                                className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80"
                            >
                                <input
                                    type="text"
                                    value={followUpInput}
                                    onChange={(e) => setFollowUpInput(e.target.value)}
                                    placeholder="Ask follow-up question or command..."
                                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                                />
                                <button
                                    type="submit"
                                    disabled={!followUpInput.trim()}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1"
                                >
                                    <Send className="w-3 h-3" />
                                    <span>Ask</span>
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}

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
