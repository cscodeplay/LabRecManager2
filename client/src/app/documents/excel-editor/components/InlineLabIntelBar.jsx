'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Atom, X, Send, CornerDownLeft, Sparkles, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function InlineLabIntelBar({
    isOpen,
    onClose,
    isDark,
    activeCell,
    sheetContext,
    onApplyFormula
}) {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [previewFormula, setPreviewFormula] = useState(null);
    const [explanation, setExplanation] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setPrompt('');
            setPreviewFormula(null);
            setExplanation('');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!prompt.trim() || isLoading) return;
        setIsLoading(true);

        try {
            const res = await api.post('/ai/sheets-copilot', {
                prompt: `Generate a single Excel spreadsheet formula for cell ${activeCell}: ${prompt.trim()}`,
                sheetContext
            });

            if (res.data?.success && res.data.data) {
                const d = res.data.data;
                const formula = d.formula || (d.columnData?.formulas?.[0]) || '';
                if (formula) {
                    setPreviewFormula(formula);
                    setExplanation(d.explanation || '');
                } else {
                    toast.error('Could not synthesize formula from prompt');
                }
            }
        } catch (err) {
            console.error('Inline LabIntel Error:', err);
            toast.error('LabIntel AI failed to generate formula');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = () => {
        if (!previewFormula) return;
        onApplyFormula(previewFormula);
        toast.success(`Inserted ${previewFormula} into ${activeCell}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
            <div
                className={`w-full max-w-lg rounded-2xl border shadow-2xl p-4 flex flex-col gap-3 select-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-2.5 border-slate-700/40">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                            <Atom size={14} className="animate-spin-slow" />
                        </div>
                        <span className="font-bold text-xs">LabIntel Formula Synthesizer</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            Cell {activeCell}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Input */}
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (previewFormula) {
                                    handleApply();
                                } else {
                                    handleGenerate();
                                }
                            } else if (e.key === 'Escape') {
                                onClose();
                            }
                        }}
                        placeholder="Describe the calculation (e.g. average of physics where chemistry > 80)..."
                        disabled={isLoading}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-none pr-10 transition ${
                            isDark
                                ? 'bg-slate-950 border-slate-800 text-white focus:border-cyan-500 placeholder-slate-500'
                                : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-600 placeholder-slate-400'
                        }`}
                    />
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        className={`absolute right-1.5 top-1.5 p-1 rounded-lg transition ${
                            isLoading || !prompt.trim()
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs'
                        }`}
                    >
                        {isLoading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                    </button>
                </div>

                {/* Preview Formula Output */}
                {previewFormula && (
                    <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        isDark ? 'bg-slate-950/80 border-cyan-500/40 text-cyan-300' : 'bg-cyan-50/80 border-cyan-300 text-cyan-900'
                    }`}>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Generated Formula</span>
                            <span className="text-[10px] text-slate-400">Press ↵ Enter to Insert</span>
                        </div>
                        <div className="font-mono font-bold text-sm bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20 text-cyan-400">
                            {previewFormula}
                        </div>
                        {explanation && (
                            <p className="text-[11px] text-slate-400 leading-normal">{explanation}</p>
                        )}
                        <button
                            type="button"
                            onClick={handleApply}
                            className="mt-2 w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                        >
                            <CornerDownLeft size={13} />
                            <span>Insert Formula into {activeCell}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
