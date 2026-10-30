'use client';

import React from 'react';
import { KeyRound, ShieldCheck, Sparkles, Scissors, CheckCircle2, Loader2, FileSpreadsheet } from 'lucide-react';

/**
 * SlipGenerationProgressModal
 * Displays a sleek, modern loading animation with real-time percentage progress
 * when generating individual or bulk emergency backup slips with 1st-time PINs.
 */
export default function SlipGenerationProgressModal({
    isOpen,
    progress = 0,
    statusText = 'Preparing cryptographic credentials...',
    userCount = 1,
    targetName = ''
}) {
    if (!isOpen) return null;

    const isComplete = progress >= 100;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-200">
                {/* Visual Icon with Animated Rings */}
                <div className="flex justify-center mb-5">
                    <div className="relative">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-300 ${
                            isComplete 
                                ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-400' 
                                : 'bg-amber-500/15 text-amber-600 border border-amber-300'
                        }`}>
                            {isComplete ? (
                                <CheckCircle2 className="w-8 h-8 animate-in zoom-in" />
                            ) : (
                                <KeyRound className="w-8 h-8 animate-pulse" />
                            )}
                        </div>
                        {!isComplete && (
                            <div className="absolute -inset-1 rounded-2xl border-2 border-amber-500/30 border-t-amber-500 animate-spin pointer-events-none" />
                        )}
                    </div>
                </div>

                {/* Title & Context */}
                <div className="text-center">
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center justify-center gap-1.5">
                        {isComplete ? 'Slips Ready to Print!' : 'Generating Emergency Slips'}
                        <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        {targetName
                            ? `Preparing 10-turn slip + PIN for ${targetName}`
                            : `Processing credentials for ${userCount} selected student${userCount === 1 ? '' : 's'}`}
                    </p>
                </div>

                {/* Progress Bar Container */}
                <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-600 font-sans font-medium flex items-center gap-1.5">
                            {!isComplete && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />}
                            {statusText}
                        </span>
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            {Math.round(progress)}%
                        </span>
                    </div>

                    {/* Styled Animated Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-3 p-0.5 overflow-hidden border border-slate-200">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ease-out ${
                                isComplete
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xs'
                                    : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 bg-[length:200%_100%] animate-shimmer shadow-xs'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                        />
                    </div>
                </div>

                {/* Security & A4 Cutting Hints */}
                <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="leading-tight">Bcrypt Hashing</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <Scissors className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="leading-tight">A4 Scissor Cut Guides</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
