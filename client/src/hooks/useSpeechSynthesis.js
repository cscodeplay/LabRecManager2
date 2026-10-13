'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useVoiceStore } from '@/lib/store';

/**
 * Text cleaner for Speech Synthesis (removes heavy markdown and LaTeX syntax
 * so spoken output sounds natural, fluid, and conversational).
 */
export function cleanTextForSpeech(text = '') {
    if (!text || typeof text !== 'string') return '';

    // Helper to convert '-' inside math expressions ($...$ or $$...$$) before stripping delimiters
    const formatMathMinus = (mathStr) =>
        mathStr
            .replace(/(^|[=({[,<>+*/:])\s*-\s*([0-9a-zA-Z\\(])/g, '$1 negative $2')
            .replace(/([0-9a-zA-Z)\]}])\s*-\s*([0-9a-zA-Z\\(])/g, '$1 minus $2');

    return text
        // Remove horizontal rules and markdown headers
        .replace(/^---+$/gm, ' ')
        // Remove structural section labels at start of lines/blocks (e.g. "Formula:", "Given & Concept:", "Final Answer:")
        .replace(/^(?:[*#\s]*)(?:formula(?:s|\s*&\s*units)?|given(?:\s*&\s*concept)?|concept|step-by-step\s+solution|solution\s+steps?|final\s+answer|definition|key\s+takeaway)\s*:?\s*/gim, ' ')
        // Format math minus inside $$ ... $$ and $ ... $ before unwrapping delimiters
        .replace(/\$\$([\s\S]*?)\$\$/g, (_, m) => ` ${formatMathMinus(m)} `)
        .replace(/\$([^$]+)\$/g, (_, m) => ` ${formatMathMinus(m)} `)
        .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => ` ${formatMathMinus(m)} `)
        .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => ` ${formatMathMinus(m)} `)
        // Clean common LaTeX wrappers first (run twice for nested wrappers)
        .replace(/\\(?:boxed|text|textbf|textit|mathrm|mathbf|mathcal)\s*\{([^{}]*)\}/g, '$1')
        .replace(/\\(?:boxed|text|textbf|textit|mathrm|mathbf|mathcal)\s*\{([^{}]*)\}/g, '$1')
        .replace(/\\left\s*([()[\]|.]?)/g, '$1')
        .replace(/\\right\s*([()[\]|.]?)/g, '$1')
        // Clean common math commands for natural pronunciation (handle nested braces)
        .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1 over $2')
        .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1 over $2')
        .replace(/\\sqrt\s*\{([^{}]+)\}/g, 'square root of $1')
        .replace(/\^\{2\}|\^2(?![0-9])|²/g, ' squared ')
        .replace(/\^\{3\}|\^3(?![0-9])|³/g, ' cubed ')
        .replace(/\^\{([^{}]+)\}/g, ' to the power of $1 ')
        .replace(/\^([0-9a-zA-Z]+)/g, ' to the power of $1 ')
        .replace(/_\{([^{}]+)\}/g, ' sub $1 ')
        .replace(/_([0-9a-zA-Z]+)/g, ' sub $1 ')
        .replace(/\\cdot|\\times|×/g, ' times ')
        .replace(/\\div|÷/g, ' divided by ')
        .replace(/\\pm|±/g, ' plus or minus ')
        .replace(/\\mp/g, ' minus or plus ')
        .replace(/\\approx|≈/g, ' is approximately ')
        .replace(/\\le|\\leq|≤/g, ' is less than or equal to ')
        .replace(/\\ge|\\geq|≥/g, ' is greater than or equal to ')
        .replace(/\\neq|≠/g, ' is not equal to ')
        .replace(/\\iff|\\Longleftrightarrow|<=>/g, ', which is equivalent to ')
        .replace(/\\Rightarrow|\\implies|=>|→/g, ', which gives ')
        .replace(/\\rightarrow|\\to/g, ' to ')
        .replace(/\\therefore|∴/g, ' therefore ')
        .replace(/\\sin\b/g, ' sine ')
        .replace(/\\cos\b/g, ' cosine ')
        .replace(/\\tan\b/g, ' tangent ')
        .replace(/\\ln\b/g, ' natural log of ')
        .replace(/\\log\b/g, ' log of ')
        .replace(/\\pi\b|π/g, ' pi ')
        .replace(/\\theta\b|θ/g, ' theta ')
        .replace(/\\alpha\b|α/g, ' alpha ')
        .replace(/\\beta\b|β/g, ' beta ')
        .replace(/\\gamma\b|γ/g, ' gamma ')
        .replace(/\\delta\b|\\Delta\b|Δ/g, ' delta ')
        .replace(/\\lambda\b|λ/g, ' lambda ')
        .replace(/\\omega\b|\\Omega\b|ω|Ω/g, ' omega ')
        .replace(/\\infty\b|∞/g, ' infinity ')
        .replace(/\\sum\b|∑/g, ' sum of ')
        .replace(/\\int\b|∫/g, ' integral of ')
        // Pronounce math operators (=, +, -) naturally without breaking hyphenated English words
        .replace(/=/g, ' equals ')
        .replace(/\+/g, ' plus ')
        .replace(/\s+[−–-]\s+/g, ' minus ')
        .replace(/(^|[=(,])\s*[−–-]([0-9a-zA-Z])/g, '$1 negative $2')
        // Remove remaining backslashes and LaTeX commands
        .replace(/\\[a-zA-Z]+/g, ' ')
        // Strip ALL Unicode emojis, pictographs, dingbats, and variation selectors so TTS never reads emoji names
        .replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu, ' ')
        // Clean markdown bold, italic, code backticks, headers, braces, bullet symbols
        .replace(/[*_#`~>{}•]/g, ' ')
        // Strip any remaining leading "Formula:" or "Final Answer:" prefix after markdown cleanup
        .replace(/^\s*(?:formula|final\s+answer|given\s+and\s+concept|given|concept)\s*:?\s+/i, '')
        // Replace multiple whitespace/newlines
        .replace(/\s+/g, ' ')
        .trim();
}

export function useSpeechSynthesis({
    defaultRate = 1.0,
    defaultPitch = 1.0,
    defaultVolume = 1.0,
    enabledByDefault = true
} = {}) {
    const {
        voiceProfile,
        voiceName,
        rate: storeRate,
        pitch: storePitch,
        volume: storeVolume,
        autoReadAiResponses,
        setVoiceName,
        setVoiceProfile
    } = useVoiceStore();

    const [isSupported, setIsSupported] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [speakingText, setSpeakingText] = useState('');
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoiceState] = useState(null);
    const [rate, setRate] = useState(storeRate || defaultRate);
    const [pitch, setPitch] = useState(storePitch || defaultPitch);
    const [volume, setVolume] = useState(storeVolume !== undefined ? storeVolume : defaultVolume);
    const [isEnabled, setIsEnabled] = useState(enabledByDefault);

    // Sync store changes to local state
    useEffect(() => {
        if (storeRate !== undefined) setRate(storeRate);
    }, [storeRate]);

    useEffect(() => {
        if (storePitch !== undefined) setPitch(storePitch);
    }, [storePitch]);

    useEffect(() => {
        if (storeVolume !== undefined) setVolume(storeVolume);
    }, [storeVolume]);

    // Keep isEnabled in sync with prop changes
    useEffect(() => {
        setIsEnabled(enabledByDefault);
    }, [enabledByDefault]);

    const utteranceRef = useRef(null);
    const speakTimerRef = useRef(null);
    const lastBoundaryUpdateRef = useRef(0);
    const lastCharIndexRef = useRef(0);
    const currentCleanedTextRef = useRef('');

    // Helper to find best matching voice
    const resolveVoice = useCallback((availableVoices, profile, explicitName) => {
        if (!availableVoices || availableVoices.length === 0) return null;

        // 1. Explicit name match
        if (explicitName) {
            const found = availableVoices.find(v => v.name.toLowerCase() === explicitName.toLowerCase());
            if (found) return found;
        }

        // 2. Profile-based matching
        if (profile === 'samantha') {
            return (
                availableVoices.find(v => v.name.toLowerCase().includes('samantha')) ||
                availableVoices.find(v => v.name.includes('Natural') && v.lang.startsWith('en-US')) ||
                availableVoices.find(v => v.name.includes('Google US English')) ||
                availableVoices.find(v => v.name.includes('Karen')) ||
                availableVoices.find(v => v.lang === 'en-US' && v.name.includes('Female')) ||
                availableVoices.find(v => v.lang.startsWith('en'))
            );
        } else if (profile === 'daniel') {
            return (
                availableVoices.find(v => v.name.toLowerCase().includes('daniel')) ||
                availableVoices.find(v => v.name.includes('George')) ||
                availableVoices.find(v => v.name.includes('Oliver')) ||
                availableVoices.find(v => v.name.includes('Google UK English Male')) ||
                availableVoices.find(v => v.lang.startsWith('en-GB')) ||
                availableVoices.find(v => v.lang.startsWith('en'))
            );
        } else if (profile === 'rishi') {
            return (
                availableVoices.find(v => v.name.toLowerCase().includes('rishi')) ||
                availableVoices.find(v => v.name.includes('Neerja')) ||
                availableVoices.find(v => v.name.includes('India')) ||
                availableVoices.find(v => v.lang.startsWith('en-IN')) ||
                availableVoices.find(v => v.lang.startsWith('hi')) ||
                availableVoices.find(v => v.lang.startsWith('en'))
            );
        }

        // 3. Fallback to best natural English voice
        return (
            availableVoices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))) ||
            availableVoices.find(v => v.lang.startsWith('en')) ||
            availableVoices[0]
        );
    }, []);

    // Check browser support and load voices
    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            setIsSupported(false);
            return;
        }

        setIsSupported(true);

        const updateVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            if (availableVoices && availableVoices.length > 0) {
                setVoices(availableVoices);
                const matched = resolveVoice(availableVoices, voiceProfile, voiceName);
                if (matched) {
                    setSelectedVoiceState(matched);
                }
            }
        };

        updateVoices();

        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = updateVoices;
        }

        return () => {
            if (speakTimerRef.current) {
                clearTimeout(speakTimerRef.current);
                speakTimerRef.current = null;
            }
            if (utteranceRef.current) {
                utteranceRef.current.onstart = null;
                utteranceRef.current.onboundary = null;
                utteranceRef.current.onend = null;
                utteranceRef.current.onerror = null;
                utteranceRef.current = null;
            }
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, [voiceProfile, voiceName, resolveVoice]);

    // Setter that updates both local state and store
    const setSelectedVoice = useCallback((voice) => {
        setSelectedVoiceState(voice);
        if (voice?.name) {
            setVoiceName(voice.name);
            const lower = voice.name.toLowerCase();
            if (lower.includes('samantha')) setVoiceProfile('samantha');
            else if (lower.includes('daniel')) setVoiceProfile('daniel');
            else if (lower.includes('rishi')) setVoiceProfile('rishi');
            else setVoiceProfile('custom');
        }
    }, [setVoiceName, setVoiceProfile]);

    const [speakingCharIndex, setSpeakingCharIndex] = useState(0);
    const [activeStepIndex, setActiveStepIndex] = useState(-1);
    const [totalSteps, setTotalSteps] = useState(0);
    const [isStepMode, setIsStepMode] = useState(false);

    const stepsQueueRef = useRef([]);
    const activeStepIndexRef = useRef(-1);
    const stepOptionsRef = useRef({});
    const stepAdvanceTimerRef = useRef(null);
    const isPausedRef = useRef(false);

    // Helper to cancel active synthesis utterance and timers without resetting step queue
    const cancelActiveUtterance = useCallback(() => {
        if (speakTimerRef.current) {
            clearTimeout(speakTimerRef.current);
            speakTimerRef.current = null;
        }
        if (stepAdvanceTimerRef.current) {
            clearTimeout(stepAdvanceTimerRef.current);
            stepAdvanceTimerRef.current = null;
        }
        if (utteranceRef.current) {
            utteranceRef.current.onstart = null;
            utteranceRef.current.onboundary = null;
            utteranceRef.current.onend = null;
            utteranceRef.current.onerror = null;
            utteranceRef.current = null;
        }
        currentCleanedTextRef.current = '';
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
                window.__activeSpeechUtterance = null;
            } catch (e) {
                console.warn('[useSpeechSynthesis] cancel error:', e);
            }
        }
    }, []);

    // Stop and cancel speech cleanly without triggering stale onend/onerror callbacks
    const stop = useCallback((resetStepSelection = false) => {
        cancelActiveUtterance();
        isPausedRef.current = false;
        setIsSpeaking(false);
        setIsPaused(false);
        setSpeakingText('');
        setSpeakingCharIndex(0);
        if (resetStepSelection) {
            activeStepIndexRef.current = -1;
            setActiveStepIndex(-1);
            setIsStepMode(false);
        }
    }, [cancelActiveUtterance]);

    // Internal helper to speak a single step at `stepIdx` and gate advancement on `utterance.onend`
    const speakStepAtIndex = useCallback((stepIdx, customOptions = {}) => {
        const queue = stepsQueueRef.current;
        if (!queue || stepIdx < 0 || stepIdx >= queue.length) {
            cancelActiveUtterance();
            isPausedRef.current = false;
            setIsSpeaking(false);
            setIsPaused(false);
            setSpeakingText('');
            setSpeakingCharIndex(0);
            if (stepOptionsRef.current?.onComplete) {
                stepOptionsRef.current.onComplete();
            }
            return;
        }

        const stepItem = queue[stepIdx];
        activeStepIndexRef.current = stepIdx;
        setActiveStepIndex(stepIdx);
        setIsStepMode(true);

        if (stepOptionsRef.current?.onStepChange) {
            stepOptionsRef.current.onStepChange(stepIdx, stepItem);
        }

        if (!isEnabled || customOptions.shouldSpeak === false) {
            cancelActiveUtterance();
            setIsSpeaking(false);
            setIsPaused(false);
            return;
        }

        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        const rawStepText = typeof stepItem === 'string'
            ? stepItem
            : (stepItem.type === 'heading'
                ? ''
                : (stepItem.spokenText !== undefined ? stepItem.spokenText : (stepItem.text || '')));
        const cleaned = cleanTextForSpeech(rawStepText);

        // If a step has no speakable text, advance cleanly to the next step
        if (!cleaned) {
            if (customOptions.autoAdvance !== false && stepIdx + 1 < queue.length) {
                stepAdvanceTimerRef.current = setTimeout(() => {
                    stepAdvanceTimerRef.current = null;
                    if (!isPausedRef.current) {
                        speakStepAtIndex(stepIdx + 1, customOptions);
                    }
                }, 40);
            } else {
                setIsSpeaking(false);
                setIsPaused(false);
            }
            return;
        }

        cancelActiveUtterance();
        currentCleanedTextRef.current = cleaned;
        lastBoundaryUpdateRef.current = 0;
        lastCharIndexRef.current = 0;
        isPausedRef.current = false;

        speakTimerRef.current = setTimeout(() => {
            speakTimerRef.current = null;
            try {
                const utterance = new SpeechSynthesisUtterance(cleaned);
                utteranceRef.current = utterance;
                window.__activeSpeechUtterance = utterance;

                const mergedOpts = { ...stepOptionsRef.current, ...customOptions };
                const voiceToUse = mergedOpts.voice || selectedVoice;
                if (voiceToUse) {
                    utterance.voice = voiceToUse;
                }

                utterance.rate = mergedOpts.rate !== undefined ? mergedOpts.rate : rate;
                utterance.pitch = mergedOpts.pitch !== undefined ? mergedOpts.pitch : pitch;
                utterance.volume = mergedOpts.volume !== undefined ? mergedOpts.volume : volume;

                utterance.onstart = () => {
                    if (utteranceRef.current !== utterance) return;
                    setIsSpeaking(true);
                    setIsPaused(false);
                    isPausedRef.current = false;
                    setSpeakingText(cleaned);
                    setSpeakingCharIndex(0);
                    if (mergedOpts.onStepStart) mergedOpts.onStepStart(stepIdx, stepItem);
                };

                utterance.onboundary = (e) => {
                    if (utteranceRef.current !== utterance) return;
                    if (e.charIndex !== undefined) {
                        const now = performance.now();
                        if (
                            e.charIndex === 0 ||
                            (now - lastBoundaryUpdateRef.current >= 140 && Math.abs(e.charIndex - lastCharIndexRef.current) >= 8)
                        ) {
                            lastBoundaryUpdateRef.current = now;
                            lastCharIndexRef.current = e.charIndex;
                            setSpeakingCharIndex(e.charIndex);
                        }
                    }
                };

                utterance.onend = () => {
                    if (utteranceRef.current !== utterance) return;
                    utteranceRef.current = null;
                    currentCleanedTextRef.current = '';
                    window.__activeSpeechUtterance = null;

                    if (mergedOpts.onStepEnd) mergedOpts.onStepEnd(stepIdx, stepItem);

                    // Strictly wait for current step's utterance.onend before advancing to the next step
                    const shouldAdvance = mergedOpts.autoAdvance !== false && !isPausedRef.current;
                    if (shouldAdvance && stepIdx + 1 < stepsQueueRef.current.length) {
                        stepAdvanceTimerRef.current = setTimeout(() => {
                            stepAdvanceTimerRef.current = null;
                            if (!isPausedRef.current) {
                                speakStepAtIndex(stepIdx + 1, customOptions);
                            }
                        }, 180);
                    } else if (!isPausedRef.current) {
                        setIsSpeaking(false);
                        setIsPaused(false);
                        setSpeakingText('');
                        setSpeakingCharIndex(0);
                        if (mergedOpts.onComplete) mergedOpts.onComplete();
                    }
                };

                utterance.onerror = (e) => {
                    if (utteranceRef.current !== utterance) return;
                    if (e.error !== 'interrupted' && e.error !== 'canceled') {
                        console.warn('[useSpeechSynthesis] Step utterance error:', e.error);
                    }
                    utteranceRef.current = null;
                    currentCleanedTextRef.current = '';
                    window.__activeSpeechUtterance = null;
                    if (!isPausedRef.current) {
                        setIsSpeaking(false);
                        setIsPaused(false);
                        setSpeakingText('');
                        setSpeakingCharIndex(0);
                    }
                };

                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                }

                window.speechSynthesis.speak(utterance);
            } catch (err) {
                console.error('[useSpeechSynthesis] Failed to speak step:', err);
                setIsSpeaking(false);
                setIsPaused(false);
            }
        }, 40);
    }, [isEnabled, selectedVoice, rate, pitch, volume, cancelActiveUtterance]);

    // Start step-synchronized narration from an array of parsed solution blocks/steps
    const speakSteps = useCallback((steps = [], options = {}) => {
        if (!Array.isArray(steps) || steps.length === 0) {
            stepsQueueRef.current = [];
            activeStepIndexRef.current = -1;
            setTotalSteps(0);
            setActiveStepIndex(-1);
            setIsStepMode(false);
            return;
        }

        stepsQueueRef.current = steps;
        stepOptionsRef.current = options;
        setTotalSteps(steps.length);
        setIsStepMode(true);

        const startIdx = Math.max(0, Math.min(options.startIndex || 0, steps.length - 1));
        const shouldAutoPlay = options.autoPlay !== false && isEnabled;

        speakStepAtIndex(startIdx, {
            ...options,
            shouldSpeak: shouldAutoPlay,
            autoAdvance: true
        });
    }, [isEnabled, speakStepAtIndex]);

    // Jump to a specific step (maintaining synchronization whether speaking or paused)
    const goToStep = useCallback((stepIdx, options = {}) => {
        const queue = stepsQueueRef.current;
        if (!queue || queue.length === 0) return;
        const clamped = Math.max(0, Math.min(stepIdx, queue.length - 1));
        const shouldSpeak = options.shouldSpeak !== undefined
            ? options.shouldSpeak
            : (isEnabled && (isSpeaking || !isPausedRef.current));

        speakStepAtIndex(clamped, {
            ...options,
            shouldSpeak,
            autoAdvance: options.autoAdvance !== undefined ? options.autoAdvance : true
        });
    }, [isEnabled, isSpeaking, speakStepAtIndex]);

    // Advance to the next speakable step (skipping structural headings)
    const nextStep = useCallback((options = {}) => {
        const queue = stepsQueueRef.current;
        if (!queue || queue.length === 0) return;
        let nextIdx = activeStepIndexRef.current < 0 ? 0 : Math.min(activeStepIndexRef.current + 1, queue.length - 1);
        while (nextIdx < queue.length - 1 && queue[nextIdx]?.type === 'heading') {
            nextIdx += 1;
        }
        goToStep(nextIdx, options);
    }, [goToStep]);

    // Go back to the previous speakable step (skipping structural headings)
    const prevStep = useCallback((options = {}) => {
        const queue = stepsQueueRef.current;
        if (!queue || queue.length === 0) return;
        let prevIdx = activeStepIndexRef.current <= 0 ? 0 : activeStepIndexRef.current - 1;
        while (prevIdx > 0 && queue[prevIdx]?.type === 'heading') {
            prevIdx -= 1;
        }
        goToStep(prevIdx, options);
    }, [goToStep]);

    // Pause speech while preserving active step synchronization
    const pause = useCallback(() => {
        if (stepAdvanceTimerRef.current) {
            clearTimeout(stepAdvanceTimerRef.current);
            stepAdvanceTimerRef.current = null;
        }
        isPausedRef.current = true;
        setIsPaused(true);
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
            try {
                window.speechSynthesis.pause();
            } catch (e) {}
        }
    }, []);

    // Resume speech from exact paused point or active step
    const resume = useCallback(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        isPausedRef.current = false;
        setIsPaused(false);

        if (window.speechSynthesis.paused && window.speechSynthesis.speaking) {
            try {
                window.speechSynthesis.resume();
                setIsSpeaking(true);
                return;
            } catch (e) {}
        }

        // If paused between steps or after navigation, resume speaking from activeStepIndex
        if (stepsQueueRef.current.length > 0) {
            const resumeIdx = activeStepIndexRef.current >= 0 ? activeStepIndexRef.current : 0;
            speakStepAtIndex(resumeIdx, { shouldSpeak: true, autoAdvance: true });
        }
    }, [speakStepAtIndex]);

    // Speak text with synthesis (debounced & race-safe to prevent stuttering)
    const speak = useCallback((text, options = {}) => {
        if (!isEnabled || !text) return;
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        const cleaned = cleanTextForSpeech(text);
        if (!cleaned) return;

        // If the exact same utterance is already speaking and rate isn't changing, do not cancel/restart it
        if (
            window.speechSynthesis.speaking &&
            !window.speechSynthesis.paused &&
            currentCleanedTextRef.current === cleaned &&
            options.rate === undefined &&
            !options.forceRestart
        ) {
            return;
        }

        // Clear any pending step queue timers when speaking a standalone message
        if (!options.keepStepMode) {
            setIsStepMode(false);
        }
        cancelActiveUtterance();

        currentCleanedTextRef.current = cleaned;
        lastBoundaryUpdateRef.current = 0;
        lastCharIndexRef.current = 0;
        isPausedRef.current = false;

        // Short 45ms delay allows Chromium audio pipeline to flush cancel() cleanly and deduplicates rapid calls
        speakTimerRef.current = setTimeout(() => {
            speakTimerRef.current = null;
            try {
                const utterance = new SpeechSynthesisUtterance(cleaned);
                utteranceRef.current = utterance;

                // Retain on window object to prevent Chromium garbage collector from cutting speech mid-sentence
                window.__activeSpeechUtterance = utterance;

                const voiceToUse = options.voice || selectedVoice;
                if (voiceToUse) {
                    utterance.voice = voiceToUse;
                }

                utterance.rate = options.rate !== undefined ? options.rate : rate;
                utterance.pitch = options.pitch !== undefined ? options.pitch : pitch;
                utterance.volume = options.volume !== undefined ? options.volume : volume;

                utterance.onstart = () => {
                    if (utteranceRef.current !== utterance) return;
                    setIsSpeaking(true);
                    setIsPaused(false);
                    setSpeakingText(cleaned);
                    setSpeakingCharIndex(0);
                    if (options.onStart) options.onStart();
                };

                utterance.onboundary = (e) => {
                    if (utteranceRef.current !== utterance) return;
                    if (e.charIndex !== undefined) {
                        const now = performance.now();
                        // Throttle React state updates to avoid re-rendering heavy parent components on every syllable/word
                        if (
                            e.charIndex === 0 ||
                            (now - lastBoundaryUpdateRef.current >= 180 && Math.abs(e.charIndex - lastCharIndexRef.current) >= 12)
                        ) {
                            lastBoundaryUpdateRef.current = now;
                            lastCharIndexRef.current = e.charIndex;
                            setSpeakingCharIndex(e.charIndex);
                        }
                        if (options.onBoundary) options.onBoundary(e);
                    }
                };

                utterance.onend = () => {
                    if (utteranceRef.current !== utterance) return;
                    utteranceRef.current = null;
                    currentCleanedTextRef.current = '';
                    setIsSpeaking(false);
                    setIsPaused(false);
                    setSpeakingText('');
                    setSpeakingCharIndex(0);
                    window.__activeSpeechUtterance = null;
                    if (options.onEnd) options.onEnd();
                };

                utterance.onerror = (e) => {
                    if (utteranceRef.current !== utterance) return;
                    if (e.error !== 'interrupted' && e.error !== 'canceled') {
                        console.warn('[useSpeechSynthesis] Utterance error:', e.error);
                    }
                    utteranceRef.current = null;
                    currentCleanedTextRef.current = '';
                    setIsSpeaking(false);
                    setIsPaused(false);
                    setSpeakingText('');
                    setSpeakingCharIndex(0);
                    window.__activeSpeechUtterance = null;
                    if (options.onError) options.onError(e);
                };

                // Wake up paused synthesis queue in Chromium
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                }

                window.speechSynthesis.speak(utterance);
            } catch (err) {
                console.error('[useSpeechSynthesis] Failed to speak:', err);
                currentCleanedTextRef.current = '';
                setIsSpeaking(false);
                setIsPaused(false);
                setSpeakingText('');
                setSpeakingCharIndex(0);
                window.__activeSpeechUtterance = null;
            }
        }, 45);
    }, [isEnabled, selectedVoice, rate, pitch, volume, cancelActiveUtterance]);

    return {
        isSupported,
        isSpeaking,
        isPaused,
        speakingText,
        speakingCharIndex,
        activeStepIndex,
        setActiveStepIndex,
        totalSteps,
        isStepMode,
        voices,
        selectedVoice,
        setSelectedVoice,
        rate,
        setRate,
        pitch,
        setPitch,
        volume,
        setVolume,
        isEnabled,
        setIsEnabled,
        speak,
        speakSteps,
        goToStep,
        nextStep,
        prevStep,
        stop,
        pause,
        resume
    };
}

export default useSpeechSynthesis;
