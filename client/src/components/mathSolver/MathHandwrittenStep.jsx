'use client';

import React, { useState, useEffect, useRef } from 'react';
import MathRenderer from '../MathRenderer';
import { Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';

/**
 * Renders an atomic math step with:
 * - Natural human handwriting fonts (Caveat, Patrick Hand, Kalam, Architects Daughter)
 * - Animated inking / typewriter reveal effect simulating a teacher writing live
 * - KaTeX formula block with matching chalkboard styling
 */
export default function MathHandwrittenStep({
    step,
    fontFamily = 'font-caveat', // 'font-caveat' | 'font-patrick' | 'font-kalam' | 'font-architect'
    fontSize = 'text-xl',
    isCurrent = true,
    animateTyping = true,
    typingSpeedMs = 28, // ms per character
    onTypingComplete
}) {
    const [displayedText, setDisplayedText] = useState(animateTyping ? '' : (step?.explanation || ''));
    const [isTyping, setIsTyping] = useState(animateTyping);
    const fullText = step?.explanation || '';
    const timerRef = useRef(null);

    useEffect(() => {
        if (!animateTyping) {
            setDisplayedText(fullText);
            setIsTyping(false);
            onTypingComplete?.();
            return;
        }

        setDisplayedText('');
        setIsTyping(true);
        let currentIndex = 0;

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            if (currentIndex < fullText.length) {
                currentIndex += 1;
                setDisplayedText(fullText.slice(0, currentIndex));
            } else {
                clearInterval(timerRef.current);
                setIsTyping(false);
                onTypingComplete?.();
            }
        }, typingSpeedMs);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [fullText, animateTyping, typingSpeedMs]);

    // Click to finish typing immediately
    const handleSkipTyping = () => {
        if (isTyping) {
            if (timerRef.current) clearInterval(timerRef.current);
            setDisplayedText(fullText);
            setIsTyping(false);
            onTypingComplete?.();
        }
    };

    return (
        <div 
            onClick={handleSkipTyping}
            className={`transition-all duration-300 rounded-2xl p-4 border ${
                isCurrent 
                    ? 'bg-amber-500/5 dark:bg-amber-400/5 border-amber-500/40 shadow-lg shadow-amber-500/10' 
                    : 'bg-slate-500/5 border-slate-700/30 opacity-75'
            }`}
        >
            {/* Step header */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200/20">
                <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-xs shadow-sm">
                        {step.stepNumber}
                    </span>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm tracking-wide">
                        {step.title || `Step ${step.stepNumber}`}
                    </h4>
                </div>
                {isTyping ? (
                    <span className="flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400 animate-pulse font-mono font-medium">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                        Inking...
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                    </span>
                )}
            </div>

            {/* LaTeX Formula Display */}
            {step.latex && (
                <div className="my-3 py-2.5 px-4 rounded-xl bg-slate-950/80 border border-slate-700/60 shadow-inner flex items-center justify-center overflow-x-auto text-amber-300">
                    <MathRenderer content={`$$${step.latex}$$`} size="lg" />
                </div>
            )}

            {/* Handwritten human explanation with live inking caret */}
            <div className={`relative ${fontFamily} ${fontSize} leading-relaxed text-slate-800 dark:text-slate-200 select-text`}>
                <span>{displayedText}</span>
                {isTyping && (
                    <span className="inline-block ml-1 text-amber-500 animate-bounce text-sm align-middle select-none">
                        ✍️
                    </span>
                )}
            </div>
        </div>
    );
}
