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
    ChevronLeft,
    ChevronRight,
    Play,
    Pause,
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

function transformOutsideMath(input, transformFn) {
    if (!input) return '';
    const parts = input.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g);
    for (let i = 0; i < parts.length; i += 2) {
        if (parts[i]) {
            parts[i] = transformFn(parts[i]);
        }
    }
    return parts.join('');
}

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

    // 4. Line-by-line check for pure unadorned equations outside math (e.g. "1. (x + 1)^2 + y^2 = 7" or "x^2 + y^2 + 2x = 6")
    const lines = s.split('\n');
    const normalizedLines = lines.map(line => {
        if (line.includes('$')) return line;
        const m = line.match(/^(\s*(?:(?:\d+[\.\)]|Step\s+\d+[:\.]?|Stage\s+\d+[:\.]?|[-*•])\s+)?)([^:=]+=[^:=]+)$/i);
        if (m) {
            const prefix = m[1] || '';
            const candidate = m[2].trim();
            const words = candidate.match(/\b[a-zA-Z]{4,}\b/g) || [];
            if (words.length === 0 && /[xyzrhtk]/i.test(candidate) && /[0-9^+\-*\/]/.test(candidate)) {
                return `${prefix}$${candidate}$`;
            }
        }
        return line;
    });
    s = normalizedLines.join('\n');

    // 5. Convert unicode superscripts outside math: ² -> ^2, ³ -> ^3
    s = transformOutsideMath(s, str => str.replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4'));

    // 6. Convert plain-English math phrases into LaTeX if outside math
    s = transformOutsideMath(s, str => str
        .replace(/\b([a-zA-Z])\s+squared\b/gi, '$$$1^2$$')
        .replace(/\b([a-zA-Z])\s+cubed\b/gi, '$$$1^3$$')
        .replace(/\bsquare\s+root\s+of\s+([a-zA-Z0-9_()+-]+)\b/gi, '$$\\sqrt{$1}$$')
    );

    // 7. Auto-wrap bare LaTeX commands with braces outside math: \frac{...}{...}, \sqrt{...}, \boxed{...}, \vec{...}, \hat{...}
    s = transformOutsideMath(s, str => {
        return str
            .replace(/(\\frac\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}(?:\s*(?:\\[a-zA-Z]+|[a-zA-Z0-9^]+))?)/g, '$$$1$$')
            .replace(/(\\sqrt(?:\s*\[[^{}]*\])?\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/g, '$$$1$$')
            .replace(/(\\boxed\s*\{[^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*\})/g, '$$$1$$')
            .replace(/(\\vec\s*\{[^{}]*\})/g, '$$$1$$')
            .replace(/(\\hat\s*\{[^{}]*\}|\\[ij]hat\b)/g, '$$$1$$')
            .replace(/(\\(?:mathbf|mathbfit)\s*\{[^{}]*\})/g, '$$$1$$');
    });

    // 8. Auto-wrap bare Greek letters or math symbols outside math
    s = transformOutsideMath(s, str => {
        return str.replace(/(\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega|approx|neq|le|ge|leq|geq|pm|mp|times|div|cdot|in|notin|subset|subseteq|cup|cap|infty|partial|nabla|forall|exists|to|rightarrow|leftarrow|Rightarrow|Leftarrow|iff|implies)\b)/g, '$$$1$$');
    });

    // 9. Auto-wrap isolated powers outside math: (x + 1)^2, x^2, y^2, r^2, cm^2, 10^5
    s = transformOutsideMath(s, str => {
        let res = str.replace(/(\([a-zA-Z0-9_\s*+\-.]+\)\^[0-9a-zA-Z+-]+)/g, '$$$1$$');
        res = res.replace(/\b([a-zA-Z0-9_]\^[0-9a-zA-Z+-]+)\b/g, '$$$1$$');
        return res;
    });

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
            const rendered = `<div class="my-1.5 py-2 px-3 bg-slate-950 rounded-lg border border-slate-700 overflow-x-auto text-center shadow-inner" style="background-color:#020617">${katex.renderToString(cleanMath, { displayMode: true, throwOnError: false, strict: false, trust: true })}</div>`;
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
            const rendered = `<span class="inline-block px-0.5 text-amber-100">${katex.renderToString(cleanMath, { displayMode: false, throwOnError: false, strict: false, trust: true })}</span>`;
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

// Extract math expressions and coordinate points from a single block of text for synchronized graphing
function extractStepMathMetadata(text = '') {
    const equations = [];
    const points = [];
    if (!text) return { equations, points };

    // Extract LaTeX blocks $$...$$ and inline $...$
    const blockMatches = [...text.matchAll(/\$\$([\s\S]*?)\$\$/g)];
    for (const m of blockMatches) {
        if (m[1]?.trim()) equations.push(m[1].trim());
    }
    const strippedBlocks = text.replace(/\$\$[\s\S]*?\$\$/g, ' ');
    const inlineMatches = [...strippedBlocks.matchAll(/\$([^$\n]+?)\$/g)];
    for (const m of inlineMatches) {
        if (m[1]?.trim()) equations.push(m[1].trim());
    }

    // Extract 2D coordinate points like (2, -3) or \left( 2, -3 \right)
    const cleanForPoints = text.replace(/\\left|\\right/g, '');
    const ptMatches = [...cleanForPoints.matchAll(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g)];
    for (const pm of ptMatches) {
        const x = parseFloat(pm[1]);
        const y = parseFloat(pm[2]);
        if (Number.isFinite(x) && Number.isFinite(y)) {
            points.push({ x, y });
        }
    }

    return { equations, points };
}

// Parse text into structured sections, formulas, steps, and statements as the SINGLE SOURCE OF TRUTH
// for both visual display and step-by-step voice narration.
export function parseContentBlocks(rawText) {
    if (!rawText) return [];
    const normalizedText = normalizeScientificLatex(rawText);
    const lines = normalizedText.split('\n');
    const blocks = [];
    let charOffset = 0;
    let inAnswerSection = false;
    let stepSequenceNum = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const lineLen = line.length + 1;

        if (!trimmed || trimmed === '---') {
            charOffset += lineLen;
            continue;
        }

        // 1. Markdown Section Headings (e.g. ### 📌 Given & Concept, ### 📐 Formula, **Given:**, **Formula**)
        const headingMatch = trimmed.match(/^(?:#{1,4}\s+)(.+)$/) ||
            (trimmed.match(/^\*\*([^*]{2,55}):?\*\*$/) ? [trimmed, trimmed.replace(/\*\*/g, '')] : null);

        if (headingMatch) {
            const titleText = headingMatch[1].replace(/\*\*/g, '').trim();
            inAnswerSection = /\b(final\s+answer|conclusion|result|answer)\b/i.test(titleText);
            blocks.push({
                id: `blk_${blocks.length}`,
                index: blocks.length,
                type: 'heading',
                prefix: '',
                text: titleText,
                spokenText: '', // Headings are structural; voice narration advances directly to the content step
                equations: [],
                points: [],
                startChar: charOffset,
                endChar: charOffset + trimmed.length
            });
            charOffset += lineLen;
            continue;
        }

        // 2. Standalone Display Formula Block ($$...$$)
        if (/^\$\$[\s\S]+\$\$$/.test(trimmed)) {
            const isBoxedAnswer = inAnswerSection || trimmed.includes('\\boxed');
            const meta = extractStepMathMetadata(trimmed);
            stepSequenceNum += 1;
            blocks.push({
                id: `blk_${blocks.length}`,
                index: blocks.length,
                stepNumber: stepSequenceNum,
                type: isBoxedAnswer ? 'answer' : 'formula',
                prefix: isBoxedAnswer ? '✅' : '📐',
                text: trimmed,
                spokenText: trimmed,
                equations: meta.equations,
                points: meta.points,
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
            const meta = extractStepMathMetadata(content);
            stepSequenceNum += 1;
            const cleanPrefix = isAnswerLine ? '✅' : (isBulletSymbol ? '•' : rawPrefix.replace(/[:\.]$/, ''));
            blocks.push({
                id: `blk_${blocks.length}`,
                index: blocks.length,
                stepNumber: stepSequenceNum,
                type: isAnswerLine ? 'answer' : (isBulletSymbol ? 'bullet' : 'step'),
                prefix: cleanPrefix,
                text: content,
                spokenText: content,
                equations: meta.equations,
                points: meta.points,
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
                        const meta = extractStepMathMetadata(sTrim);
                        stepSequenceNum += 1;
                        blocks.push({
                            id: `blk_${blocks.length}`,
                            index: blocks.length,
                            stepNumber: stepSequenceNum,
                            type: 'statement',
                            prefix: '•',
                            text: sTrim,
                            spokenText: sTrim,
                            equations: meta.equations,
                            points: meta.points,
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
        const meta = extractStepMathMetadata(trimmed);
        stepSequenceNum += 1;
        blocks.push({
            id: `blk_${blocks.length}`,
            index: blocks.length,
            stepNumber: stepSequenceNum,
            type: isAnswerLine ? 'answer' : 'statement',
            prefix: isAnswerLine ? '✅' : '•',
            text: trimmed,
            spokenText: trimmed,
            equations: meta.equations,
            points: meta.points,
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
    isAiPaused = false,
    aiSpeakingText = '',
    speakingCharIndex = 0,
    activeStepIndex = -1,
    isStepMode = false,
    aiSolution = null,
    aiResponseText = '',
    suggestedFollowUps = [],
    onCreateStickyNote = () => {},
    onInsertAsText = () => {},
    onOpenAiSolution = () => {},
    onStopSpeaking = () => {},
    onPauseSpeaking = () => {},
    onResumeSpeaking = () => {},
    onSpeak = () => {},
    onSpeakSteps = null,
    onGoToStep = null,
    onNextStep = null,
    onPrevStep = null,
    onActiveStepChange = null,
    speechRate = 1.0,
    onChangeSpeechRate = () => {},
    aiSpeechEnabled = true,
    onToggleAiSpeech = () => {},
    preferredProvider = 'auto',
    onClose = () => {},
    onExecuteCommand = () => {},
    onOpenPhysicsSpace = null,
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
    const [clickedBlockIdx, setClickedBlockIdx] = useState(null);

    // Image question scanner state
    const [isScanningImage, setIsScanningImage] = useState(false);
    const [scannedPreviewUrl, setScannedPreviewUrl] = useState(null);
    const [scannedFile, setScannedFile] = useState(null);
    const [scannedDataUrl, setScannedDataUrl] = useState(null);
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    const fileInputRef = useRef(null);
    const editInputRef = useRef(null);

    const lastResponseSeenRef = useRef('');
    const lastNarratedSolutionRef = useRef('');
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
            setClickedBlockIdx(null);
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

    // Automatically start step-synchronized narration whenever a fresh AI solution arrives
    useEffect(() => {
        if (!displayText || aiSolution?.isError || blocks.length === 0) return;
        const solutionKey = `${activeTab}::${displayText}`;
        if (solutionKey !== lastNarratedSolutionRef.current) {
            lastNarratedSolutionRef.current = solutionKey;
            if (typeof onSpeakSteps === 'function') {
                const firstContentIdx = Math.max(0, blocks.findIndex(b => b.type !== 'heading'));
                onSpeakSteps(blocks, {
                    rate: speechRate,
                    startIndex: firstContentIdx,
                    autoPlay: aiSpeechEnabled
                });
            }
        }
    }, [displayText, activeTab, blocks, aiSolution?.isError, onSpeakSteps, speechRate, aiSpeechEnabled]);

    // Determine the active step index from step-based narration (primary source of truth)
    // with fallback to character-index mapping only when speaking non-step text.
    const activeBlockIndex = React.useMemo(() => {
        if (blocks.length === 0) return -1;
        if (isStepMode && activeStepIndex >= 0 && activeStepIndex < blocks.length) {
            return activeStepIndex;
        }
        if (clickedBlockIdx !== null && clickedBlockIdx >= 0 && clickedBlockIdx < blocks.length) {
            return clickedBlockIdx;
        }
        if (!isAiSpeaking) return -1;
        const spokenLen = Math.max(1, (aiSpeakingText || '').length);
        const totalBlockEnd = blocks[blocks.length - 1]?.endChar || displayText?.length || 1;
        const progress = Math.min(0.995, Math.max(0, speakingCharIndex / spokenLen));
        const mappedChar = progress * totalBlockEnd;
        const idx = blocks.findIndex(b => mappedChar >= b.startChar && mappedChar <= b.endChar);
        if (idx !== -1) return idx;
        return Math.min(blocks.length - 1, Math.floor(progress * blocks.length));
    }, [isStepMode, activeStepIndex, isAiSpeaking, speakingCharIndex, blocks, aiSpeakingText, clickedBlockIdx, displayText]);

    // Notify parent (Whiteboard & Graphing Panel) whenever the active step changes
    useEffect(() => {
        if (typeof onActiveStepChange === 'function') {
            const activeBlock = activeBlockIndex >= 0 && activeBlockIndex < blocks.length
                ? blocks[activeBlockIndex]
                : null;
            onActiveStepChange(activeBlock, activeBlockIndex, blocks);
        }
    }, [activeBlockIndex, blocks, onActiveStepChange]);

    // Auto-scroll to active step/statement while dictating or navigating (respecting user manual scrolling)
    useEffect(() => {
        if (userIsScrollingRef.current || activeBlockIndex < 0) return;
        const el = document.getElementById(`cc-block-${activeBlockIndex}`);
        if (el && scrollContainerRef.current) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [activeBlockIndex]);

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
        setScannedFile(file);
        setIsScanningImage(true);
        setIsEditing(true);

        const reader = new FileReader();
        reader.onload = (ev) => {
            setScannedDataUrl(ev.target?.result);
        };
        reader.readAsDataURL(file);

        try {
            const res = await aiAPI.scanQuestionImage(file, preferredProvider);
            const extractedQuestion = res?.data?.data?.questionText?.trim() || res?.data?.data?.question?.trim();
            if (extractedQuestion) {
                setEditText(extractedQuestion);
            }
            setTimeout(() => {
                editInputRef.current?.focus();
            }, 80);
        } catch (err) {
            const errMsg = err?.response?.data?.message || err?.message || 'Failed to scan image';
            toast.error(`Image scan error: ${errMsg}`);
        } finally {
            setIsScanningImage(false);
        }
    };

    const handleFormSubmit = (e) => {
        e?.preventDefault();
        const trimmed = editText.trim();
        const hasImg = Boolean(scannedPreviewUrl || scannedDataUrl || scannedFile);
        if (!trimmed && !hasImg) return;

        const cmdText = trimmed || 'Solve the problem shown in this image';
        onExecuteCommand(cmdText, {
            imageDataUrl: scannedDataUrl || scannedPreviewUrl,
            imageFile: scannedFile
        });
        setIsEditing(false);
        setScannedPreviewUrl(null);
        setScannedDataUrl(null);
        setScannedFile(null);
        setEditText('');
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
                    <div
                        style={{ backgroundColor: '#0f172a' }}
                        className={`bg-slate-950 border-2 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
                            aiSolution?.isError ? 'border-rose-500 shadow-rose-950/40' : 'border-slate-700'
                        }`}
                    >
                        {/* Minimal Header Bar: Title + Voice Speed Controls + Actions */}
                        <div
                            style={{ backgroundColor: aiSolution?.isError ? '#4c0519' : '#1e293b' }}
                            className={`px-3 py-2 border-b flex items-center justify-between gap-2 text-xs ${
                                aiSolution?.isError ? 'bg-rose-950 border-rose-500 text-rose-200' : 'bg-slate-900 border-slate-700'
                            }`}
                        >
                            <div className="flex items-center gap-1.5 min-w-0">
                                {aiSolution?.isError ? (
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                ) : (
                                    <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
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
                                                    ? 'bg-yellow-400 text-slate-950 font-bold'
                                                    : 'text-slate-300 hover:text-white'
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
                                                        ? 'bg-yellow-400 text-slate-950 font-bold'
                                                        : 'text-slate-300 hover:text-white'
                                                }`}
                                            >
                                                Summary
                                            </button>
                                        )}
                                        {onOpenPhysicsSpace && (
                                            <button
                                                type="button"
                                                onClick={onOpenPhysicsSpace}
                                                className="px-2 py-0.5 rounded text-[11px] font-semibold transition bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/40 flex items-center gap-1 cursor-pointer"
                                                title="Open interactive physics simulation laboratory"
                                            >
                                                <span>⚛️ Lab</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Voice Speed Control + Step Controls + Speak/Mute + Utility Buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                                {/* Step Navigation Controls (Prev / Play-Pause / Next) */}
                                {!aiSolution?.isError && blocks.length > 0 && (
                                    <div
                                        style={{ backgroundColor: '#020617' }}
                                        className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-0.5 gap-0.5"
                                        title="Step-Synchronized Voice Controls"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (typeof onPrevStep === 'function') {
                                                    // Find previous non-heading block
                                                    let prev = (activeBlockIndex > 0 ? activeBlockIndex : 0) - 1;
                                                    while (prev > 0 && blocks[prev]?.type === 'heading') prev--;
                                                    if (typeof onGoToStep === 'function') {
                                                        onGoToStep(Math.max(0, prev), { rate: speechRate, shouldSpeak: isAiSpeaking });
                                                    } else {
                                                        onPrevStep({ rate: speechRate });
                                                    }
                                                }
                                            }}
                                            className="p-0.5 rounded text-slate-300 hover:text-yellow-400 hover:bg-slate-800 transition"
                                            title="Previous Step"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isAiSpeaking && !isAiPaused) {
                                                    onPauseSpeaking();
                                                } else if (isAiPaused) {
                                                    onResumeSpeaking();
                                                } else if (typeof onSpeakSteps === 'function') {
                                                    const startIdx = activeBlockIndex >= 0
                                                        ? activeBlockIndex
                                                        : Math.max(0, blocks.findIndex(b => b.type !== 'heading'));
                                                    onSpeakSteps(blocks, { rate: speechRate, startIndex: startIdx, autoPlay: true });
                                                } else {
                                                    onSpeak(displayText, { rate: speechRate });
                                                }
                                            }}
                                            className={`p-0.5 rounded transition ${
                                                isAiSpeaking && !isAiPaused
                                                    ? 'bg-yellow-400 text-slate-950 font-bold'
                                                    : 'text-yellow-400 hover:bg-slate-800'
                                            }`}
                                            title={isAiSpeaking && !isAiPaused ? 'Pause step narration' : (isAiPaused ? 'Resume step narration' : 'Play step-by-step narration')}
                                        >
                                            {isAiSpeaking && !isAiPaused ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (typeof onNextStep === 'function') {
                                                    let next = (activeBlockIndex >= 0 ? activeBlockIndex : -1) + 1;
                                                    while (next < blocks.length - 1 && blocks[next]?.type === 'heading') next++;
                                                    if (typeof onGoToStep === 'function') {
                                                        onGoToStep(Math.min(blocks.length - 1, next), { rate: speechRate, shouldSpeak: isAiSpeaking });
                                                    } else {
                                                        onNextStep({ rate: speechRate });
                                                    }
                                                }
                                            }}
                                            className="p-0.5 rounded text-slate-300 hover:text-yellow-400 hover:bg-slate-800 transition"
                                            title="Next Step"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}

                                {/* Voice Speed Selector */}
                                <div
                                    style={{ backgroundColor: '#020617' }}
                                    className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-0.5"
                                    title="AI Voice Speed"
                                >
                                    {SPEED_OPTIONS.map((spd) => (
                                        <button
                                            key={spd}
                                            type="button"
                                            onClick={() => {
                                                onChangeSpeechRate(spd);
                                                if (isAiSpeaking) {
                                                    if (typeof onGoToStep === 'function' && activeBlockIndex >= 0) {
                                                        onGoToStep(activeBlockIndex, { rate: spd, shouldSpeak: true });
                                                    } else {
                                                        onSpeak(aiSpeakingText || displayText, { rate: spd });
                                                    }
                                                }
                                            }}
                                            className={`px-1 py-0.5 rounded text-[10px] font-mono transition ${
                                                Math.abs((speechRate || 1) - spd) < 0.05
                                                    ? 'bg-yellow-400 text-slate-950 font-bold'
                                                    : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            {spd}x
                                        </button>
                                    ))}
                                </div>

                                {/* Stop / Read Aloud Voice Toggle */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isAiSpeaking || isAiPaused) {
                                            setClickedBlockIdx(null);
                                            onStopSpeaking();
                                        } else if (typeof onSpeakSteps === 'function' && blocks.length > 0) {
                                            setClickedBlockIdx(null);
                                            const firstContentIdx = Math.max(0, blocks.findIndex(b => b.type !== 'heading'));
                                            onSpeakSteps(blocks, { rate: speechRate, startIndex: firstContentIdx, autoPlay: true });
                                        } else {
                                            setClickedBlockIdx(null);
                                            onSpeak(displayText, { rate: speechRate });
                                        }
                                    }}
                                    className={`p-1 rounded transition ${
                                        isAiSpeaking
                                            ? 'bg-yellow-400 text-slate-950 hover:bg-rose-500 hover:text-white'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                                    }`}
                                    title={isAiSpeaking ? 'Stop speaking' : 'Read steps aloud'}
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
                                    className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition"
                                    title="Copy solution"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>

                                {/* Collapse */}
                                <button
                                    type="button"
                                    onClick={() => setIsPaneCollapsed(prev => !prev)}
                                    className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition"
                                    title={isPaneCollapsed ? 'Expand' : 'Collapse'}
                                >
                                    {isPaneCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                </button>

                                {/* Dismiss */}
                                <button
                                    type="button"
                                    onClick={() => setIsPaneDismissed(true)}
                                    className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition"
                                    title="Close Solution Pane"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Question Subtitle + Active Step Synchronizer Badge */}
                        {!isPaneCollapsed && (aiSolution?.question || activeBlockIndex >= 0) && (
                            <div
                                style={{ backgroundColor: '#1e293b' }}
                                className="px-3 py-1.5 bg-slate-900 border-b border-slate-700 text-[11px] text-slate-200 flex items-center justify-between gap-2 font-medium"
                            >
                                <div className="truncate min-w-0">
                                    {aiSolution?.question ? (
                                        <>
                                            <span className="text-yellow-400 font-bold mr-1">Q:</span>
                                            <span>{aiSolution.question}</span>
                                        </>
                                    ) : (
                                        <span className="text-slate-400">Step-by-Step Solution</span>
                                    )}
                                </div>
                                {activeBlockIndex >= 0 && blocks[activeBlockIndex] && (
                                    <span
                                        style={{ backgroundColor: '#422006', borderColor: '#facc15' }}
                                        className="shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-bold text-yellow-300"
                                    >
                                        {blocks[activeBlockIndex].stepNumber
                                            ? `Step ${blocks[activeBlockIndex].stepNumber}/${blocks.filter(b => b.type !== 'heading').length}`
                                            : `Active`}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Step / Statement Body with Real-Time Voice Highlighting */}
                        {!isPaneCollapsed && (
                            <div className="flex flex-col" style={{ backgroundColor: '#0f172a' }}>
                                <div
                                    ref={scrollContainerRef}
                                    onScroll={handleUserScroll}
                                    onWheel={handleUserScroll}
                                    onTouchStart={handleUserScroll}
                                    style={{ backgroundColor: '#0f172a' }}
                                    className="p-3 text-xs text-slate-100 space-y-1.5 max-h-[52vh] overflow-y-auto custom-scrollbar select-text bg-slate-950"
                                >
                                    {blocks.length > 0 ? (
                                        blocks.map((block, idx) => {
                                            const isActive = (idx === activeBlockIndex) && (isAiSpeaking || isAiPaused || isStepMode || clickedBlockIdx !== null);
                                            const handleSelectStep = () => {
                                                setClickedBlockIdx(idx);
                                                if (typeof onGoToStep === 'function') {
                                                    onGoToStep(idx, { rate: speechRate, shouldSpeak: true });
                                                } else {
                                                    onSpeak(block.spokenText || block.text, { rate: speechRate });
                                                }
                                            };

                                            if (block.type === 'heading') {
                                                return (
                                                    <div
                                                        id={`cc-block-${idx}`}
                                                        key={block.id || idx}
                                                        style={isActive ? { backgroundColor: '#422006', borderColor: '#facc15' } : undefined}
                                                        className={`pt-2 pb-1 px-2 flex items-center gap-1.5 border-b transition-colors ${
                                                            isActive
                                                                ? 'border-yellow-400 text-yellow-300 rounded-lg'
                                                                : 'border-slate-700 text-amber-300'
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
                                                        onClick={handleSelectStep}
                                                        style={{
                                                            backgroundColor: isActive ? '#422006' : '#1e293b',
                                                            borderColor: isActive ? '#facc15' : '#475569'
                                                        }}
                                                        className={`p-2 rounded-xl transition-all duration-200 border-2 cursor-pointer ${
                                                            isActive
                                                                ? 'border-yellow-400 text-yellow-50 ring-2 ring-yellow-400 shadow-lg'
                                                                : 'bg-slate-900 hover:border-yellow-400/60 border-slate-700 text-slate-100'
                                                        }`}
                                                        title="Click to jump to and hear this formula"
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
                                                        onClick={handleSelectStep}
                                                        style={{
                                                            backgroundColor: isActive ? '#422006' : '#064e3b',
                                                            borderColor: isActive ? '#facc15' : '#10b981'
                                                        }}
                                                        className={`p-2.5 rounded-xl transition-all duration-200 border-2 cursor-pointer ${
                                                            isActive
                                                                ? 'border-yellow-400 text-yellow-50 ring-2 ring-yellow-400 shadow-lg'
                                                                : 'bg-emerald-950 hover:border-yellow-400/70 border-emerald-500 text-emerald-100'
                                                        }`}
                                                        title="Click to jump to and hear final answer"
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                                                isActive
                                                                    ? 'bg-yellow-400 text-slate-950 font-extrabold border-yellow-300'
                                                                    : 'bg-emerald-700 text-emerald-100 border-emerald-500'
                                                            }`}>
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
                                                    onClick={handleSelectStep}
                                                    style={{
                                                        backgroundColor: isActive ? '#422006' : '#1e293b',
                                                        borderColor: isActive ? '#facc15' : '#334155'
                                                    }}
                                                    className={`p-2 rounded-xl transition-all duration-200 border-2 cursor-pointer ${
                                                        isActive
                                                            ? 'border-yellow-400 text-yellow-50 ring-2 ring-yellow-400 shadow-lg'
                                                            : 'bg-slate-900 hover:border-yellow-400/60 border-slate-700 text-slate-200'
                                                    }`}
                                                    title="Click to jump to and hear this step"
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                            isActive ? 'bg-yellow-400 text-slate-950 font-extrabold' : 'bg-slate-800 text-yellow-300'
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
                                            className="leading-relaxed whitespace-pre-wrap select-text text-slate-100 text-[12px]"
                                            dangerouslySetInnerHTML={{ __html: renderFormattedText(displayText) }}
                                        />
                                    )}
                                </div>

                                {/* Minimal Footer Actions + Follow-up Input */}
                                <div
                                    style={{ backgroundColor: '#1e293b' }}
                                    className="px-3 py-2 border-t border-slate-700 bg-slate-900 flex flex-col gap-1.5"
                                >
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => onInsertAsText(displayText)}
                                            className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 text-[10px] font-medium transition"
                                        >
                                            🔤 Insert as Text
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onCreateStickyNote(displayText)}
                                            className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 text-[10px] font-medium transition"
                                        >
                                            📝 Sticky Note
                                        </button>
                                        {onOpenPhysicsSpace && (
                                            <button
                                                type="button"
                                                onClick={onOpenPhysicsSpace}
                                                className="px-2 py-0.5 rounded-md bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 hover:text-white border border-indigo-500/50 text-[10px] font-medium transition flex items-center gap-1 cursor-pointer"
                                                title="Open interactive physics simulation laboratory"
                                            >
                                                ⚛️ Physics Lab
                                            </button>
                                        )}
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
                                            style={{ backgroundColor: '#0f172a' }}
                                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!followUpInput.trim()}
                                            className="px-2.5 py-1 rounded-lg bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-slate-950 text-xs font-bold transition flex items-center gap-1"
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
                                <span className="font-semibold text-[11px] text-indigo-300">Voice AI</span>
                                <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                                    {isAiSpeaking ? '🔊 AI Speaking...' : isListening ? (interimTranscript || transcript || 'Listening...') : 'Voice AI'}
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
                                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                            <span className="font-medium text-slate-300">Voice AI</span>
                                        </div>
                                    )}
                                </div>

                                {/* Controls: Stop Speech, Edit Toggle (Pencil), Minimize, Close */}
                                <div className="flex items-center gap-1">
                                    {isAiSpeaking && (
                                        <button
                                            type="button"
                                            onClick={onStopSpeaking}
                                            className="p-1 rounded text-rose-300 hover:text-white hover:bg-rose-500/30 transition border border-rose-500/30"
                                            title="Mute Speech Output"
                                        >
                                            <VolumeX className="w-3.5 h-3.5" />
                                        </button>
                                    )}

                                    {/* Edit / Type Toggle with Tooltip */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(prev => !prev);
                                            if (!editText && transcript) setEditText(transcript);
                                        }}
                                        className={`p-1 rounded transition border ${
                                            isEditing
                                                ? 'bg-indigo-600 text-white border-indigo-400'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent hover:border-slate-700'
                                        }`}
                                        title={isEditing ? 'Close input' : 'Edit or type question'}
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsMinimized(true)}
                                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                        title="Minimize"
                                    >
                                        <Minimize2 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                        title="Close"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Drag-and-drop overlay indicator */}
                            {isDraggingImage && (
                                <div className="px-4 py-3 bg-indigo-950/90 border-b border-indigo-500/40 flex items-center justify-center gap-2 text-xs text-indigo-200 font-semibold">
                                    <Upload className="w-4 h-4 text-indigo-400 animate-bounce" />
                                    <span>Drop image here to scan the question</span>
                                </div>
                            )}

                            {/* Main Closed Captions / AI Request Input Area */}
                            <div className="px-4 py-2.5 min-h-[48px] max-h-32 overflow-y-auto custom-scrollbar flex flex-col justify-center">
                                {isEditing ? (
                                    <form
                                        onSubmit={handleFormSubmit}
                                        className="flex items-center gap-1.5 w-full my-0.5"
                                    >
                                        {/* Retained Single Scan Image Button */}
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isScanningImage}
                                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 shrink-0 transition"
                                            title="Scan or upload question image"
                                        >
                                            {isScanningImage ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" /> : <ImageIcon className="w-3.5 h-3.5" />}
                                        </button>

                                        {/* Compact Image Chip if image is attached */}
                                        {scannedPreviewUrl && (
                                            <div className="relative shrink-0 flex items-center">
                                                <img
                                                    src={scannedPreviewUrl}
                                                    alt="Attached question"
                                                    className="h-7 w-7 object-cover rounded-md border border-indigo-500/70 shadow-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setScannedPreviewUrl(null);
                                                        setScannedDataUrl(null);
                                                        setScannedFile(null);
                                                    }}
                                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] shadow"
                                                    title="Remove image"
                                                >
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        )}

                                        <input
                                            ref={editInputRef}
                                            type="text"
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            onPaste={handlePasteImage}
                                            placeholder={
                                                isScanningImage
                                                    ? 'Scanning image for question...'
                                                    : scannedPreviewUrl
                                                        ? 'Enter optional instructions, or press Enter to solve image...'
                                                        : 'Type question, or paste an image...'
                                            }
                                            autoFocus
                                            className="flex-1 bg-slate-900 border border-indigo-500/80 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                        />

                                        <button
                                            type="submit"
                                            disabled={(!editText.trim() && !scannedPreviewUrl) || isScanningImage}
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
                                            title="Close"
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
