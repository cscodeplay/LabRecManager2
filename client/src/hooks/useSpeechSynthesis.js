'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
    const [isSupported, setIsSupported] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [speakingText, setSpeakingText] = useState('');
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [rate, setRate] = useState(defaultRate);
    const [pitch, setPitch] = useState(defaultPitch);
    const [volume, setVolume] = useState(defaultVolume);
    const [isEnabled, setIsEnabled] = useState(enabledByDefault);

    const utteranceRef = useRef(null);

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

                // Auto-pick optimal high quality natural English voice
                const preferredVoice =
                    availableVoices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Karen'))) ||
                    availableVoices.find(v => v.lang.startsWith('en')) ||
                    availableVoices[0];

                setSelectedVoice(prev => prev || preferredVoice);
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
    }, []);

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
                if (options.onStart) options.onStart();
            };

            utterance.onend = () => {
                setIsSpeaking(false);
                setIsPaused(false);
                setSpeakingText('');
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
                if (options.onError) options.onError(e);
            };

            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.error('[useSpeechSynthesis] Failed to speak:', err);
            setIsSpeaking(false);
            setIsPaused(false);
            setSpeakingText('');
        }
    }, [isEnabled, selectedVoice, rate, pitch, volume, stop]);

    return {
        isSupported,
        isSpeaking,
        isPaused,
        speakingText,
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
