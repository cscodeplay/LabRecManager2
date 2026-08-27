'use client';

import React, { useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';

export default function VoiceInputButton({
    onTranscript,
    lang = 'en-IN',
    className = '',
    title = 'Dictate with Voice',
    size = 'sm'
}) {
    const [listening, setListening] = useState(false);
    const { isListening, audioLevel, startListening, stopListening } = useVoiceInput({ lang });

    const handleToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isListening) {
            stopListening();
            setListening(false);
        } else {
            setListening(true);
            startListening({
                onFinalResult: (text) => {
                    if (onTranscript) {
                        onTranscript(text);
                    }
                },
                onEnd: () => {
                    setListening(false);
                }
            });
        }
    };

    const isSmall = size === 'sm';

    return (
        <button
            type="button"
            onClick={handleToggle}
            className={`relative flex items-center justify-center rounded-lg transition-all ${
                isListening
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse ring-2 ring-rose-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            } ${isSmall ? 'p-1.5 w-7 h-7' : 'p-2 w-9 h-9'} ${className}`}
            title={isListening ? 'Stop recording voice' : title}
        >
            {isListening ? (
                <>
                    <Mic className={`${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} animate-bounce`} />
                    {audioLevel > 10 && (
                        <span
                            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"
                        />
                    )}
                </>
            ) : (
                <Mic className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            )}
        </button>
    );
}
