'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

export function useVoiceInput({ lang = 'en-IN', continuous = false } = {}) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);
    const [error, setError] = useState(null);
    const [isSupported, setIsSupported] = useState(true);

    const recognitionRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const micStreamRef = useRef(null);
    const animFrameRef = useRef(null);
    const currentLangRef = useRef(lang);

    useEffect(() => {
        currentLangRef.current = lang;
        if (recognitionRef.current) {
            recognitionRef.current.lang = lang;
        }
    }, [lang]);

    // Check browser support
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                setIsSupported(false);
            }
        }
    }, []);

    // Setup audio visualizer level analyzer
    const startAudioAnalyzer = async () => {
        try {
            if (!navigator.mediaDevices?.getUserMedia) return;
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStreamRef.current = stream;

            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            audioContextRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateLevel = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                const normalized = Math.min(100, Math.round((avg / 128) * 100));
                setAudioLevel(normalized);
                animFrameRef.current = requestAnimationFrame(updateLevel);
            };

            updateLevel();
        } catch (e) {
            console.warn('[useVoiceInput] Audio analyzer setup skipped:', e.message);
        }
    };

    const stopAudioAnalyzer = () => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
        setAudioLevel(0);
    };

    const startListening = useCallback((options = {}) => {
        setError(null);
        if (typeof window === 'undefined') return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.');
            setError('SpeechRecognition not supported');
            return;
        }

        try {
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch (_) {}
            }

            const recognition = new SpeechRecognition();
            recognition.continuous = options.continuous !== undefined ? options.continuous : continuous;
            recognition.interimResults = true;
            recognition.lang = options.lang || currentLangRef.current || 'en-IN';

            recognition.onstart = () => {
                setIsListening(true);
                startAudioAnalyzer();
            };

            recognition.onresult = (event) => {
                let finalStr = '';
                let interimStr = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const res = event.results[i];
                    if (res.isFinal) {
                        finalStr += res[0].transcript;
                    } else {
                        interimStr += res[0].transcript;
                    }
                }

                if (finalStr) {
                    setTranscript(prev => (prev ? `${prev} ${finalStr}` : finalStr).trim());
                    if (options.onFinalResult) {
                        options.onFinalResult(finalStr.trim());
                    }
                }
                setInterimTranscript(interimStr);

                if (options.onResult) {
                    options.onResult({ final: finalStr, interim: interimStr, combined: `${finalStr} ${interimStr}`.trim() });
                }
            };

            recognition.onerror = (event) => {
                console.warn('[useVoiceInput] recognition error:', event.error);
                if (event.error === 'not-allowed') {
                    toast.error('Microphone permission denied. Please allow microphone access.');
                }
                setError(event.error);
            };

            recognition.onend = () => {
                setIsListening(false);
                stopAudioAnalyzer();
                if (options.onEnd) {
                    options.onEnd();
                }
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error('[useVoiceInput] Start error:', err);
            setError(err.message);
            setIsListening(false);
            stopAudioAnalyzer();
        }
    }, [continuous]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (_) {}
        }
        setIsListening(false);
        stopAudioAnalyzer();
    }, []);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
    }, []);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch (_) {}
            }
            stopAudioAnalyzer();
        };
    }, []);

    return {
        isListening,
        transcript,
        interimTranscript,
        audioLevel,
        error,
        isSupported,
        startListening,
        stopListening,
        resetTranscript,
        setTranscript
    };
}
