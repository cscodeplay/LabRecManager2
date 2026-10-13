'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Mic,
    Volume2,
    VolumeX,
    Sparkles,
    CheckCircle2,
    X,
    Maximize2,
    Minimize2,
    Loader2,
    Pencil,
    Send,
    ChevronDown,
    ChevronUp,
    Copy,
    Check,
    AlertTriangle,
    RefreshCw,
    Image as ImageIcon,
    Upload
} from 'lucide-react';
import katex from 'katex';
import toast from 'react-hot-toast';
import { aiAPI } from '@/lib/api';

function normalizeScientificLatex(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';
    let s = rawText
        // 1. Recover LaTeX commands whose leading backslash was parsed as a JSON control character (\f, \t, \b, \r)
        .replace(/\x0c(rac|orall|lat|box|ootnotesize)/g, '\\f$1')
        .replace(/\x09(imes|ext|extbf|extit|extrm|heta|an|anh|au|riangle|o\b|herefore|ilde|op\b|frac)/g, '\\t$1')
        .replace(/\x08(eta|oxed|ar\b|f\b|inom|egin|ig|ullet|ot\b|ackslash|ecause)/g, '\\b$1')
        .replace(/\x0d(ightarrow|ight|ho\b|angle|isingdotseq|times)/g, '\\r$1')
        // 2. Normalize \[ ... \] and \( ... \) to $$ ... $$ and $ ... $
        .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
        .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

    // 3. Collapse multi-line $$ ... $$ blocks onto a single line so line splitting keeps display equations intact
    s = s.replace(/\$\$([\s\S]*?)\$\$/g, (match, inner) => {
        const singleLine = inner
            .trim()
            .replace(/\r?\n\s*/g, ' ');
        return `$$${singleLine}$$`;
    });

    // 4. Convert plain-English math phrases into LaTeX if not already inside $...$
    s = s
        .replace(/\b([a-zA-Z])\s+squared\b/gi, '$$$1^2$$')
        .replace(/\b([a-zA-Z])\s+cubed\b/gi, '$$$1^3$$')
        .replace(/\bsquare\s+root\s+of\s+([a-zA-Z0-9_()+-]+)\b/gi, '$$\\sqrt{$1}$$');

    // 5. Auto-wrap bare LaTeX commands (\frac, \sqrt, \boxed, \vec) that are outside $...$
    const barePatterns = [
        /(?<!\$)\\(frac\{[^{}]*\}\{[^{}]*\})(?!\$)/g,
        /(?<!\$)\\(sqrt\{[^{}]*\})(?!\$)/g,
        /(?<!\$)\\(boxed\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})(?!\$)/g,
        /(?<!\$)\\(vec\{[^{}]*\})(?!\$)/g
    ];
    for (const pat of barePatterns) {
        s = s.replace(pat, '$\\$1$');
    }

    return s;
}

function renderFormattedText(rawText) {
    if (!rawText) return '';
    const normalized = normalizeScientificLatex(rawText);
    const mathTokens = [];

    // 1. Extract Block Math $$...$$ BEFORE HTML escaping so <, >, & inside LaTeX are preserved for KaTeX
    let tokenized = normalized.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
        const cleanMath = (math || '').trim();
        if (!cleanMath) return '';
        try {
            const rendered = `<div class="my-1.5 py-2 px-3 bg-slate-950/90 rounded-lg border border-indigo-500/35 overflow-x-auto text-center shadow-inner">${katex.renderToString(cleanMath, { displayMode: true, throwOnError: false, strict: false, trust: true })}</div>`;
            const idx = mathTokens.length;
            mathTokens.push(rendered);
            return `@@MATH_TOKEN_${idx}@@`;
        } catch (e) {
            return match;
        }
    });

    // 2. Extract Inline Math $...$ BEFORE HTML escaping
    tokenized = tokenized.replace(/\$([^$\n]+?)\$/g, (match, math) => {
        const cleanMath = (math || '').trim();
        if (!cleanMath) return match;
        try {
            const rendered = `<span class="inline-block px-0.5 text-indigo-100">${katex.renderToString(cleanMath, { displayMode: false, throwOnError: false, strict: false, trust: true })}</span>`;
            const idx = mathTokens.length;
            mathTokens.push(rendered);
            return `@@MATH_TOKEN_${idx}@@`;
        } catch (e) {
            return match;
        }
    });

    // 3. Escape HTML on the remaining non-math text
    const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    let html = escapeHtml(tokenized);

    // 4. Format Markdown Bold **text**, Italic *text*, and Inline Code `code`
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
    html = html.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[11px]">$1</code>');

    // 5. Restore rendered KaTeX tokens
    html = html.replace(/@@MATH_TOKEN_(\d+)@@/g, (_, idxStr) => {
        return mathTokens[Number(idxStr)] || '';
    });

    return html;
}

// Parse text into structured sections, formulas, steps, and statements for real-time voice highlighting
function parseContentBlocks(rawText) {
    if (!rawText) return [];
    const normalizedText = normalizeScientificLatex(rawText);
    const lines = normalizedText.split('\n');
    const blocks = [];
    let charOffset = 0;
    let inAnswerSection = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const lineLen = line.length + 1;

        if (!trimmed || trimmed === '---') {
            charOffset += lineLen;
            continue;
        }

        // 1. Markdown Section Headings (e.g. ### 📌 Given & Concept, ### 📐 Formula, **Given:**)
        const headingMatch = trimmed.match(/^(?:#{1,4}\s+)(.+)$/) ||
            (trimmed.match(/^\*\*([^*]{2,45}):\*\*$/) ? [trimmed, trimmed.replace(/\*\*/g, '')] : null);

        if (headingMatch) {
            const titleText = headingMatch[1].replace(/\*\*/g, '').trim();
            inAnswerSection = /\b(final\s+answer|conclusion|result|answer)\b/i.test(titleText);
            blocks.push({
                id: `blk_${blocks.length}`,
                type: 'heading',
                prefix: '',
                text: titleText,
                startChar: charOffset,
                endChar: charOffset + trimmed.length
            });
            charOffset += lineLen;
            continue;
        }

        // 2. Standalone Display Formula Block ($$...$$)
        if (/^\$\$[\s\S]+\$\$$/.test(trimmed)) {
            const isBoxedAnswer = inAnswerSection || trimmed.includes('\\boxed');
            blocks.push({
                id: `blk_${blocks.length}`,
                type: isBoxedAnswer ? 'answer' : 'formula',
                prefix: isBoxedAnswer ? '✅' : '📐',
                text: trimmed,
                startChar: charOffset,
                endChar: charOffset + trimmed.length
            });
            charOffset += lineLen;
            continue;
        }

        // 3. Numbered Steps or Bullet Points (1. ..., Step 1: ..., - ..., • ...)
        const bulletMatch = trimmed.match(/^(?:(\d+[\.\)]|Step\s+\d+[:\.]?|Stage\s+\d+[:\.]?|[-*•])\s+)(.+)$/i);
        if (bulletMatch) {
            const rawPrefix = bulletMatch[1].trim();
            const isBulletSymbol = /^[-*•]$/.test(rawPrefix);
            const content = bulletMatch[2].trim();
            const isAnswerLine = inAnswerSection || content.includes('\\boxed');
            blocks.push({
                id: `blk_${blocks.length}`,
                type: isAnswerLine ? 'answer' : (isBulletSymbol ? 'bullet' : 'step'),
                prefix: isAnswerLine ? '✅' : (isBulletSymbol ? '•' : rawPrefix.replace(/[:\.]$/, '')),
                text: content,
                startChar: charOffset,
                endChar: charOffset + trimmed.length
            });
            charOffset += lineLen;
            continue;
        }

        // 4. Plain paragraph: only split into sentences if it has NO math delimiters ($) and is long
        if (!trimmed.includes('$') && trimmed.length > 140) {
            const sentences = trimmed.split(/(?<=[.?!])\s+(?=[A-Z])/);
            if (sentences.length > 1) {
                let sOffset = charOffset;
                sentences.forEach((sent) => {
                    const sTrim = sent.trim();
                    if (sTrim) {
                        blocks.push({
                            id: `blk_${blocks.length}`,
                            type: 'statement',
                            prefix: '•',
                            text: sTrim,
                            startChar: sOffset,
                            endChar: sOffset + sTrim.length
                        });
                    }
                    sOffset += sent.length + 1;
                });
                charOffset += lineLen;
                continue;
            }
        }

        const isAnswerLine = inAnswerSection || trimmed.includes('\\boxed');
        blocks.push({
            id: `blk_${blocks.length}`,
            type: isAnswerLine ? 'answer' : 'statement',
            prefix: isAnswerLine ? '✅' : '•',
            text: trimmed,
            startChar: charOffset,
            endChar: charOffset + trimmed.length
        });
        charOffset += lineLen;
    }
    return blocks;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

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
    onSpeak = () => {},
    speechRate = 1.0,
    onChangeSpeechRate = () => {},
    aiSpeechEnabled = true,
    onToggleAiSpeech = () => {},
    preferredProvider = 'auto',
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
    const [activeTab, setActiveTab] = useState('solution'); // 'solution' | 'summary'
    const [followUpInput, setFollowUpInput] = useState('');
    const [copied, setCopied] = useState(false);

    // Image question scanner state
    const [isScanningImage, setIsScanningImage] = useState(false);
    const [scannedPreviewUrl, setScannedPreviewUrl] = useState(null);
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    const fileInputRef = useRef(null);
    const editInputRef = useRef(null);

    const lastResponseSeenRef = useRef('');
    const scrollContainerRef = useRef(null);
    const userIsScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef(null);

    // Determine the active display response
    const activeAiResponse = aiSolution?.solutionMarkdown || aiResponseText || aiSolution?.speechResponse || (isAiSpeaking ? aiSpeakingText : '');

    // Reset pane expansion & visibility whenever a fresh AI response arrives
    useEffect(() => {
        if (activeAiResponse && activeAiResponse !== lastResponseSeenRef.current) {
            lastResponseSeenRef.current = activeAiResponse;
            setIsPaneDismissed(false);
            setIsPaneCollapsed(false);
            setActiveTab(aiSolution?.solutionMarkdown ? 'solution' : 'summary');
        }
    }, [activeAiResponse, aiSolution?.solutionMarkdown]);

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
        : (aiResponseText || aiSolution?.speechResponse || activeAiResponse);

    const blocks = React.useMemo(() => parseContentBlocks(displayText), [displayText]);

    // Track active step or statement based on speakingCharIndex from speech synthesis
    const activeBlockIndex = React.useMemo(() => {
        if (!isAiSpeaking || blocks.length === 0) return -1;
        // First try direct character offset match
        const idx = blocks.findIndex(b => speakingCharIndex >= b.startChar && speakingCharIndex <= b.endChar);
        if (idx !== -1) return idx;
        // Proportional fallback when speaking speechResponse while viewing solutionMarkdown
        const spokenLen = (aiSpeakingText || '').length;
        if (spokenLen > 0 && speakingCharIndex > 0) {
            const progress = Math.min(0.99, speakingCharIndex / spokenLen);
            return Math.min(blocks.length - 1, Math.floor(progress * blocks.length));
        }
        return 0;
    }, [isAiSpeaking, speakingCharIndex, blocks, aiSpeakingText]);

    // Auto-scroll to active step/statement while dictating (respecting user manual scrolling)
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

    // Scan an uploaded, dropped, or pasted image to extract the question into the AI request input
    const handleScanQuestionImage = async (file) => {
        if (!file || !file.type.startsWith('image/')) {
            toast.error('Please upload a valid image file (PNG, JPG, WebP)');
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setScannedPreviewUrl(previewUrl);
        setIsScanningImage(true);
        setIsEditing(true);

        try {
            const res = await aiAPI.scanQuestionImage(file, preferredProvider);
            const extractedQuestion = res?.data?.data?.question?.trim();
            if (extractedQuestion) {
                setEditText(extractedQuestion);
                toast.success('Question scanned from image! Press Enter or click Send to solve.', { icon: '📸', duration: 4000 });
                setTimeout(() => {
                    editInputRef.current?.focus();
                }, 80);
            } else {
                toast.error('Could not detect a question in the image.');
            }
        } catch (err) {
            const errMsg = err?.response?.data?.message || err?.message || 'Failed to scan image';
            toast.error(`Image scan error: ${errMsg}`);
        } finally {
            setIsScanningImage(false);
        }
    };

    const handleDropImage = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingImage(false);
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('image/')) {
            handleScanQuestionImage(file);
        }
    };

    const handlePasteImage = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    handleScanQuestionImage(file);
                    break;
                }
            }
        }
    };

    if (!isVisible && !activeAiResponse) return null;

    return (
        <>
            {/* 1. MINIMAL SOLUTION PANE — Placed to the RIGHT of the Center of the Whiteboard */}
            {activeAiResponse && !isPaneDismissed && (
                <div className="fixed top-1/2 left-[calc(50%+20px)] -translate-y-1/2 z-40 w-[350px] sm:w-[410px] max-w-[44vw] pointer-events-auto select-none transition-all duration-200 flex flex-col">
                    <div className={`bg-slate-950/92 backdrop-blur-md border rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
                        aiSolution?.isError ? 'border-rose-500/70 shadow-rose-950/40' : 'border-slate-700/80'
                    }`}>
                        {/* Minimal Header Bar: Title + Voice Speed Controls + Actions */}
                        <div className={`px-3 py-2 border-b flex items-center justify-between gap-2 text-xs ${
                            aiSolution?.isError ? 'bg-rose-950/80 border-rose-500/40 text-rose-200' : 'bg-slate-900/90 border-slate-800'
                        }`}>
                            <div className="flex items-center gap-1.5 min-w-0">
                                {aiSolution?.isError ? (
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                ) : (
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                )}

                                {aiSolution?.isError ? (
                                    <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-[11px]">
                                        <span>AI Error</span>
                                        {aiSolution?.question && (
                                            <button
                                                type="button"
                                                onClick={() => onExecuteCommand(aiSolution.question)}
                                                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                                                title="Retry this question"
                                            >
                                                <RefreshCw className="w-2.5 h-2.5" />
                                                <span>Retry</span>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('solution')}
                                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                                activeTab === 'solution'
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            Solution
                                        </button>
                                        {aiSolution?.solutionMarkdown && aiSolution?.speechResponse && (
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('summary')}
                                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                                    activeTab === 'summary'
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                Summary
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Voice Speed Control + Speak/Mute + Utility Buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                                {/* Voice Speed Selector */}
                                <div className="flex items-center bg-slate-950/90 border border-slate-800 rounded-lg p-0.5" title="AI Voice Speed">
                                    {SPEED_OPTIONS.map((spd) => (
                                        <button
                                            key={spd}
                                            type="button"
                                            onClick={() => {
                                                onChangeSpeechRate(spd);
                                                if (isAiSpeaking) {
                                                    onSpeak(aiSpeakingText || displayText, { rate: spd });
                                                }
                                            }}
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                                                Math.abs((speechRate || 1) - spd) < 0.05
                                                    ? 'bg-indigo-600 text-white font-bold'
                                                    : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            {spd}x
                                        </button>
                                    ))}
                                </div>

                                {/* Play / Stop Voice Toggle */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isAiSpeaking) {
                                            onStopSpeaking();
                                        } else {
                                            onSpeak(aiSolution?.speechResponse || displayText, { rate: speechRate });
                                        }
                                    }}
                                    className={`p-1 rounded transition ${
                                        isAiSpeaking
                                            ? 'bg-indigo-600/30 text-indigo-300 hover:bg-rose-500/30 hover:text-rose-300'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                    title={isAiSpeaking ? 'Stop speaking' : 'Read aloud'}
                                >
                                    {isAiSpeaking ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
                                </button>

                                {/* Copy */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(displayText);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 1800);
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                    title="Copy solution"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>

                                {/* Collapse */}
                                <button
                                    type="button"
                                    onClick={() => setIsPaneCollapsed(prev => !prev)}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                    title={isPaneCollapsed ? 'Expand' : 'Collapse'}
                                >
                                    {isPaneCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                </button>

                                {/* Dismiss */}
                                <button
                                    type="button"
                                    onClick={() => setIsPaneDismissed(true)}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                    title="Close Solution Pane"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Question Subtitle */}
                        {!isPaneCollapsed && aiSolution?.question && (
                            <div className="px-3 py-1.5 bg-slate-900/50 border-b border-slate-800/70 text-[11px] text-slate-300 truncate font-medium">
                                <span className="text-indigo-400 font-semibold mr-1">Q:</span>
                                {aiSolution.question}
                            </div>
                        )}

                        {/* Step / Statement Body with Real-Time Voice Highlighting */}
                        {!isPaneCollapsed && (
                            <div className="flex flex-col">
                                <div
                                    ref={scrollContainerRef}
                                    onScroll={handleUserScroll}
                                    onWheel={handleUserScroll}
                                    onTouchStart={handleUserScroll}
                                    className="p-3 text-xs text-slate-200 space-y-1.5 max-h-[52vh] overflow-y-auto custom-scrollbar select-text"
                                >
                                    {blocks.length > 0 ? (
                                        blocks.map((block, idx) => {
                                            const isActive = isAiSpeaking && (idx === activeBlockIndex);

                                            if (block.type === 'heading') {
                                                return (
                                                    <div
                                                        id={`cc-block-${idx}`}
                                                        key={block.id || idx}
                                                        className={`pt-2 pb-1 px-1 flex items-center gap-1.5 border-b transition-colors ${
                                                            isActive
                                                                ? 'border-indigo-400/60 text-indigo-200'
                                                                : 'border-slate-800/80 text-indigo-300'
                                                        }`}
                                                    >
                                                        <span
                                                            className="text-[11px] font-bold uppercase tracking-wider"
                                                            dangerouslySetInnerHTML={{ __html: renderFormattedText(block.text) }}
                                                        />
                                                    </div>
                                                );
                                            }

                                            if (block.type === 'formula') {
                                                return (
                                                    <div
                                                        id={`cc-block-${idx}`}
                                                        key={block.id || idx}
                                                        onClick={() => onSpeak(block.text, { rate: speechRate })}
                                                        className={`p-2 rounded-xl transition-all duration-200 border cursor-pointer ${
                                                            isActive
                                                                ? 'bg-indigo-600/25 border-indigo-400 text-white ring-1 ring-indigo-400/40 shadow-md'
                                                                : 'bg-slate-900/70 hover:bg-slate-900/95 border-indigo-500/30 text-slate-100'
                                                        }`}
                                                        title="Click to hear this formula"
                                                    >
                                                        <div
                                                            className="w-full min-w-0 leading-relaxed text-[12px]"
                                                            dangerouslySetInnerHTML={{ __html: renderFormattedText(block.text) }}
                                                        />
                                                    </div>
                                                );
                                            }

                                            if (block.type === 'answer') {
                                                return (
                                                    <div
                                                        id={`cc-block-${idx}`}
                                                        key={block.id || idx}
                                                        onClick={() => onSpeak(block.text, { rate: speechRate })}
                                                        className={`p-2.5 rounded-xl transition-all duration-200 border cursor-pointer ${
                                                            isActive
                                                                ? 'bg-emerald-600/25 border-emerald-400 text-white ring-1 ring-emerald-400/50 shadow-md'
                                                                : 'bg-emerald-950/35 hover:bg-emerald-950/50 border-emerald-500/40 text-emerald-100'
                                                        }`}
                                                        title="Click to hear final answer"
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600/40 text-emerald-200 border border-emerald-500/40">
                                                                {block.prefix || '✅'}
                                                            </span>
                                                            <div
                                                                className="flex-1 min-w-0 leading-relaxed text-[12px] font-medium"
                                                                dangerouslySetInnerHTML={{ __html: renderFormattedText(block.text) }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div
                                                    id={`cc-block-${idx}`}
                                                    key={block.id || idx}
                                                    onClick={() => onSpeak(block.text, { rate: speechRate })}
                                                    className={`p-2 rounded-xl transition-all duration-200 border cursor-pointer ${
                                                        isActive
                                                            ? 'bg-indigo-600/25 border-indigo-400 text-white ring-1 ring-indigo-400/40 shadow-md'
                                                            : 'bg-slate-900/50 hover:bg-slate-900/80 border-slate-800/70 text-slate-300'
                                                    }`}
                                                    title="Click to hear this step"
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                            isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-indigo-300'
                                                        }`}>
                                                            {block.prefix || '•'}
                                                        </span>
                                                        <div
                                                            className="flex-1 min-w-0 leading-relaxed text-[12px]"
                                                            dangerouslySetInnerHTML={{ __html: renderFormattedText(block.text) }}
                                                        />
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

                                {/* Minimal Footer Actions + Follow-up Input */}
                                <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/60 flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => onInsertAsText(displayText)}
                                            className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-medium transition"
                                        >
                                            🔤 Insert as Text
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onCreateStickyNote(displayText)}
                                            className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-medium transition"
                                        >
                                            📝 Sticky Note
                                        </button>
                                    </div>

                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            if (followUpInput.trim()) {
                                                onExecuteCommand(followUpInput.trim());
                                                setFollowUpInput('');
                                            }
                                        }}
                                        className="flex items-center gap-1.5"
                                    >
                                        <input
                                            type="text"
                                            value={followUpInput}
                                            onChange={(e) => setFollowUpInput(e.target.value)}
                                            placeholder="Ask follow-up..."
                                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!followUpInput.trim()}
                                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold transition flex items-center gap-1"
                                        >
                                            <Send className="w-3 h-3" />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 2. BOTTOM AI REQUEST & CLOSED CAPTIONS BAR — Supports Image Upload & Drag-and-Drop Question Scanning */}
            {isVisible && (
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingImage(true);
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingImage(false);
                    }}
                    onDrop={handleDropImage}
                    onPaste={handlePasteImage}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] sm:w-[540px] pointer-events-auto select-none transition-all duration-200 flex flex-col"
                >
                    {/* Hidden file input for scanning question images */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleScanQuestionImage(file);
                            e.target.value = '';
                        }}
                    />

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
                                    {isAiSpeaking ? '🔊 AI Speaking...' : isListening ? (interimTranscript || transcript || 'Listening...') : 'AI Request & Captions'}
                                </span>
                            </div>

                            <Maximize2 className="w-3 h-3 text-slate-400 group-hover:text-white" />
                        </div>
                    ) : (
                        /* Full Bottom AI Request & Closed Captions Banner */
                        <div className={`bg-slate-950/95 backdrop-blur-md border rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col animate-in fade-in slide-in-from-bottom-3 duration-150 ${
                            isDraggingImage ? 'border-indigo-400 ring-2 ring-indigo-500/40' : 'border-slate-700/90'
                        }`}>
                            {/* Top Status Bar */}
                            <div className="px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-2">
                                    {isScanningImage ? (
                                        <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Scanning Image Question...</span>
                                        </div>
                                    ) : isAiSpeaking ? (
                                        <div className="flex items-center gap-1.5 text-purple-400 font-semibold">
                                            <Volume2 className="w-3.5 h-3.5 animate-pulse text-purple-400" />
                                            <span>AI Speaking ({speechRate}x)</span>
                                        </div>
                                    ) : isAiThinking ? (
                                        <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>AI Solving...</span>
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
                                            <span>AI Request Box (Drop/Upload Image or Type)</span>
                                        </div>
                                    )}

                                    <span className="bg-amber-500/20 text-amber-300 font-mono text-[9px] px-1.5 py-0.2 rounded border border-amber-500/40 uppercase font-bold tracking-wider">
                                        AI
                                    </span>
                                </div>

                                {/* Controls: Upload Image, Type/Edit, Stop Speech, Minimize, Close */}
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

                                    {/* Scan Question Image Button */}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isScanningImage}
                                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 text-[10px] font-semibold flex items-center gap-1 transition"
                                        title="Upload or drag-and-drop an image of a question to scan and solve"
                                    >
                                        {isScanningImage ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <ImageIcon className="w-2.5 h-2.5" />}
                                        <span>Scan Image</span>
                                    </button>

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
                                        title="Click to type a question or command"
                                    >
                                        <Pencil className="w-2.5 h-2.5" />
                                        <span>{isEditing ? 'Close' : 'Type / Edit'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsMinimized(true)}
                                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                        title="Minimize"
                                    >
                                        <Minimize2 className="w-3 h-3" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                        title="Close"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            {/* Drag-and-drop overlay indicator */}
                            {isDraggingImage && (
                                <div className="px-4 py-3 bg-indigo-950/90 border-b border-indigo-500/40 flex items-center justify-center gap-2 text-xs text-indigo-200 font-semibold">
                                    <Upload className="w-4 h-4 text-indigo-400 animate-bounce" />
                                    <span>Drop image here to scan the question into the AI request box</span>
                                </div>
                            )}

                            {/* Scanned Image Preview Strip */}
                            {scannedPreviewUrl && (
                                <div className="px-4 pt-2 flex items-center justify-between gap-2 bg-slate-900/60 border-b border-slate-800/70 pb-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <img
                                            src={scannedPreviewUrl}
                                            alt="Scanned question"
                                            className="h-9 w-12 object-cover rounded border border-indigo-500/50 shrink-0"
                                        />
                                        <span className="text-[11px] text-slate-300 truncate">
                                            {isScanningImage ? 'Extracting question text from image...' : 'Scanned question ready — press Enter or click Send to solve'}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setScannedPreviewUrl(null)}
                                        className="p-1 text-slate-400 hover:text-white rounded"
                                        title="Remove image preview"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            {/* Main Closed Captions / AI Request Input Area */}
                            <div className="px-4 py-2.5 min-h-[48px] max-h-32 overflow-y-auto custom-scrollbar flex flex-col justify-center">
                                {isEditing ? (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            if (editText.trim()) {
                                                onExecuteCommand(editText.trim());
                                                setIsEditing(false);
                                                setScannedPreviewUrl(null);
                                            }
                                        }}
                                        className="flex items-center gap-1.5 w-full my-0.5"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isScanningImage}
                                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 shrink-0 transition"
                                            title="Upload image to scan question"
                                        >
                                            {isScanningImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                                        </button>
                                        <input
                                            ref={editInputRef}
                                            type="text"
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            placeholder={isScanningImage ? 'Scanning image for question...' : 'Type or paste/drop an image of a question, then press Enter...'}
                                            autoFocus
                                            className="flex-1 bg-slate-900 border border-indigo-500/80 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!editText.trim() || isScanningImage}
                                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1 shrink-0"
                                            title="Send to AI"
                                        >
                                            <Send className="w-3 h-3" />
                                            <span>Send</span>
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
                                    <div className="text-purple-200 text-xs sm:text-sm font-medium leading-snug truncate">
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
                                        title="Click to type or drop an image"
                                    >
                                        <span>{isListening ? 'Speak a command, type a question, or drag & drop an image...' : 'Click to type a question, or drag & drop / upload an image to scan & solve.'}</span>
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
            )}
        </>
    );
}
