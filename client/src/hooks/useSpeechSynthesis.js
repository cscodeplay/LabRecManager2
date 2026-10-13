'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useVoiceStore } from '@/lib/store';

/**
 * Text cleaner for Speech Synthesis (removes heavy markdown and LaTeX syntax
 * so spoken output sounds natural, fluid, and conversational).
 */
export function cleanTextForSpeech(text = '') {
    if (!text || typeof text !== 'string') return '';

    return text
        // Remove horizontal rules and markdown headers
        .replace(/^---+$/gm, ' ')
        // Remove LaTeX math delimiters $$ ... $$, $ ... $, \[ ... \], \( ... \)
        .replace(/\$\$([\s\S]*?)\$\$/g, ' $1 ')
        .replace(/\$([^$]+)\$/g, ' $1 ')
        .replace(/\\\[([\s\S]*?)\\\]/g, ' $1 ')
        .replace(/\\\(([\s\S]*?)\\\)/g, ' $1 ')
        // Clean common LaTeX wrappers first
        .replace(/\\(?:boxed|text|textbf|mathrm|mathbf)\{([^{}]*)\}/g, '$1')
        .replace(/\\left\s*([()[\]|.]?)/g, '')
        .replace(/\\right\s*([()[\]|.]?)/g, '')
        // Clean common math commands for natural pronunciation (handle nested braces once)
        .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1 over $2')
        .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1 over $2')
        .replace(/\\sqrt\{([^{}]+)\}/g, 'square root of $1')
        .replace(/\^\{2\}|\^2\b/g, ' squared')
        .replace(/\^\{3\}|\^3\b/g, ' cubed')
        .replace(/\^\{([^{}]+)\}/g, ' to the power of $1')
        .replace(/\^([0-9a-zA-Z]+)/g, ' to the power of $1')
        .replace(/_\{([^{}]+)\}/g, ' sub $1')
        .replace(/_([0-9a-zA-Z]+)/g, ' sub $1')
        .replace(/\\cdot/g, ' times ')
        .replace(/\\times/g, ' times ')
        .replace(/\\div/g, ' divided by ')
        .replace(/\\pm/g, ' plus or minus ')
        .replace(/\\approx/g, ' approximately ')
        .replace(/\\le|\\leq/g, ' less than or equal to ')
        .replace(/\\ge|\\geq/g, ' greater than or equal to ')
        .replace(/\\neq/g, ' is not equal to ')
        .replace(/\\Rightarrow|\\implies|=>|→/g, ', which gives ')
        .replace(/\\rightarrow|\\to/g, ' to ')
        .replace(/\\therefore|∴/g, ' therefore ')
        .replace(/\\pi\b/g, ' pi ')
        .replace(/\\theta\b/g, ' theta ')
        .replace(/\\alpha\b/g, ' alpha ')
        .replace(/\\beta\b/g, ' beta ')
        .replace(/\\gamma\b/g, ' gamma ')
        .replace(/\\delta\b|\\Delta\b/g, ' delta ')
        .replace(/\\lambda\b/g, ' lambda ')
        .replace(/\\omega\b|\\Omega\b/g, ' omega ')
        .replace(/\\infty\b/g, ' infinity ')
        .replace(/\\sum\b/g, ' sum of ')
        .replace(/\\int\b/g, ' integral of ')
        // Remove remaining backslashes and LaTeX commands
        .replace(/\\[a-zA-Z]+/g, ' ')
        // Clean markdown bold, italic, code backticks, headers, braces
        .replace(/[*_#`~>{}]/g, ' ')
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

    // Stop and cancel speech cleanly without triggering stale onend/onerror callbacks
    const stop = useCallback(() => {
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
        currentCleanedTextRef.current = '';
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
                window.__activeSpeechUtterance = null;
            } catch (e) {
                console.warn('[useSpeechSynthesis] cancel error:', e);
            }
        }
        setIsSpeaking(false);
        setIsPaused(false);
        setSpeakingText('');
        setSpeakingCharIndex(0);
    }, []);

    // Pause speech
    const pause = useCallback(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && isSpeaking) {
            window.speechSynthesis.pause();
            setIsPaused(true);
        }
    }, [isSpeaking]);

    // Resume speech
    const resume = useCallback(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && isPaused) {
            window.speechSynthesis.resume();
            setIsPaused(false);
        }
    }, [isPaused]);

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

        // Clear any pending scheduled speak call
        if (speakTimerRef.current) {
            clearTimeout(speakTimerRef.current);
            speakTimerRef.current = null;
        }

        // Detach listeners from previous utterance BEFORE calling cancel() so its async cancel event doesn't clobber the new utterance
        if (utteranceRef.current) {
            utteranceRef.current.onstart = null;
            utteranceRef.current.onboundary = null;
            utteranceRef.current.onend = null;
            utteranceRef.current.onerror = null;
            utteranceRef.current = null;
        }

        try {
            if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                window.speechSynthesis.cancel();
            }
        } catch (e) {}

        currentCleanedTextRef.current = cleaned;
        lastBoundaryUpdateRef.current = 0;
        lastCharIndexRef.current = 0;

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
    }, [isEnabled, selectedVoice, rate, pitch, volume]);

    return {
        isSupported,
        isSpeaking,
        isPaused,
        speakingText,
        speakingCharIndex,
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
        stop,
        pause,
        resume
    };
}

export default useSpeechSynthesis;
