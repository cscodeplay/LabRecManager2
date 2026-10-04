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
        // Remove LaTeX math blocks $$ ... $$ or $ ... $
        .replace(/\$\$([^$]+)\$\$/g, '$1')
        .replace(/\$([^$]+)\$/g, '$1')
        // Clean common math commands for natural pronunciation
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
        .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
        .replace(/\\cdot/g, 'times')
        .replace(/\\times/g, 'times')
        .replace(/\\pm/g, 'plus or minus')
        .replace(/\\approx/g, 'approximately')
        .replace(/\\le|\\leq/g, 'less than or equal to')
        .replace(/\\ge|\\geq/g, 'greater than or equal to')
        .replace(/\\neq/g, 'is not equal to')
        .replace(/\\pi/g, 'pi')
        .replace(/\\theta/g, 'theta')
        .replace(/\\alpha/g, 'alpha')
        .replace(/\\beta/g, 'beta')
        .replace(/\\infty/g, 'infinity')
        .replace(/\\sum/g, 'sum of')
        .replace(/\\int/g, 'integral of')
        .replace(/\\text\{([^}]+)\}/g, '$1')
        // Remove remaining backslashes
        .replace(/\\[a-zA-Z]+/g, '')
        // Clean markdown bold, italic, code backticks, headers
        .replace(/[*_#`~>]/g, '')
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

    // Stop and cancel speech
    const stop = useCallback(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
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

    // Speak text with synthesis
    const speak = useCallback((text, options = {}) => {
        if (!isEnabled || !text) return;
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        // Cancel any active speech before starting new utterance
        stop();

        const cleaned = cleanTextForSpeech(text);
        if (!cleaned) return;

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
                setIsSpeaking(true);
                setIsPaused(false);
                setSpeakingText(cleaned);
                setSpeakingCharIndex(0);
                if (options.onStart) options.onStart();
            };

            utterance.onboundary = (e) => {
                if (e.charIndex !== undefined) {
                    setSpeakingCharIndex(e.charIndex);
                    if (options.onBoundary) options.onBoundary(e);
                }
            };

            utterance.onend = () => {
                setIsSpeaking(false);
                setIsPaused(false);
                setSpeakingText('');
                setSpeakingCharIndex(0);
                window.__activeSpeechUtterance = null;
                if (options.onEnd) options.onEnd();
            };

            utterance.onerror = (e) => {
                // Ignore interruption errors when speech is cancelled deliberately
                if (e.error !== 'interrupted' && e.error !== 'canceled') {
                    console.warn('[useSpeechSynthesis] Utterance error:', e.error);
                }
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
            setIsSpeaking(false);
            setIsPaused(false);
            setSpeakingText('');
            setSpeakingCharIndex(0);
            window.__activeSpeechUtterance = null;
        }
    }, [isEnabled, selectedVoice, rate, pitch, volume, stop]);

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
