'use client';

import React, { useState } from 'react';
import {
    Atom,
    X,
    Send,
    Sparkles,
    Check,
    FlaskConical,
    Calculator,
    Compass,
    TrendingUp,
    RefreshCw,
    Table,
    ChevronRight,
    HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const QUICK_PROMPT_CHIPS = [
    {
        icon: <Calculator size={13} className="text-cyan-400" />,
        label: 'Total & Percentage',
        prompt: 'Add a total marks column and a percentage column based on practical and theory scores'
    },
    {
        icon: <TrendingUp size={13} className="text-emerald-400" />,
        label: 'Summarize Statistics',
        prompt: 'Calculate Mean, Median, and Standard Deviation for all test marks in this sheet'
    },
    {
        icon: <FlaskConical size={13} className="text-purple-400" />,
        label: 'Generate Lab Reagents',
        prompt: 'Generate a 6-row chemistry lab reagent table with Reagent Name, Formula, Molarity, and pH'
    },
    {
        icon: <Compass size={13} className="text-amber-400" />,
        label: 'Calibration Curve',
        prompt: 'Calculate linear regression slope and intercept for concentration vs absorbance values'
    }
];

export default function LabIntelSidebar({
    isOpen,
    onClose,
    isDark,
    sheetContext,
    onApplyAction
}) {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hello! I am **LabIntel AI**, your scientific spreadsheet assistant. Ask me to generate lab formulas, compute statistics, create reagent tables, or analyze your sheet data.',
            data: null
        }
    ]);

    if (!isOpen) return null;

    const handleSubmit = async (userPromptText) => {
        const query = (userPromptText || prompt).trim();
        if (!query || isLoading) return;

        setMessages(prev => [...prev, { role: 'user', content: query }]);
        setPrompt('');
        setIsLoading(true);

        try {
            const res = await api.post('/ai/sheets-copilot', {
                prompt: query,
                sheetContext
            });

            if (res.data?.success && res.data.data) {
                const aiData = res.data.data;
                setMessages(prev => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: aiData.explanation || 'Here is the generated calculation for your spreadsheet:',
                        data: aiData,
                        provider: res.data.provider,
                        model: res.data.model
                    }
                ]);
            } else {
                toast.error('LabIntel was unable to process this request.');
            }
        } catch (err) {
            console.error('LabIntel Error:', err);
            toast.error(err.response?.data?.message || 'Failed to reach LabIntel AI service');
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: '⚠️ Failed to connect to LabIntel AI. Please check your network or try again.',
                    isError: true
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = (data) => {
        if (!data || !onApplyAction) return;
        onApplyAction(data);
        toast.success('Applied to spreadsheet!');
    };

    return (
        <aside
            className={`w-84 sm:w-96 border-l flex flex-col z-30 transition-all select-none shadow-2xl ${
                isDark ? 'bg-slate-950/95 border-slate-800 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-800'
            }`}
        >
            {/* Header */}
            <div className={`p-3.5 border-b flex items-center justify-between ${
                isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-200 bg-slate-50/80'
            }`}>
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-xs">
                        <Atom size={16} className="animate-spin-slow" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs tracking-tight">LabIntel AI</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                                Gemini Pro
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400">Scientific Spreadsheet Assistant</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className={`p-1.5 rounded-lg transition ${
                        isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                    }`}
                    title="Close LabIntel Sidebar"
                >
                    <X size={15} />
                </button>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex flex-col gap-1.5 ${
                            msg.role === 'user' ? 'items-end' : 'items-start'
                        }`}
                    >
                        <div
                            className={`max-w-[92%] p-3 rounded-2xl leading-relaxed ${
                                msg.role === 'user'
                                    ? 'bg-cyan-600 text-white rounded-br-none shadow-md'
                                    : isDark
                                        ? 'bg-slate-900 border border-slate-800/80 text-slate-200 rounded-bl-none shadow-xs'
                                        : 'bg-slate-100 border border-slate-200 text-slate-800 rounded-bl-none shadow-xs'
                            }`}
                        >
                            <p className="whitespace-pre-wrap">{msg.content}</p>

                            {/* Action Result Preview Card */}
                            {msg.data && (
                                <div className={`mt-2.5 p-2.5 rounded-xl border text-[11px] ${
                                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                                }`}>
                                    {msg.data.formula && (
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Target Cell: {msg.data.targetCell || 'Active'}</span>
                                            <div className="p-1.5 rounded bg-cyan-500/10 text-cyan-400 font-mono font-semibold text-xs border border-cyan-500/20 truncate">
                                                {msg.data.formula}
                                            </div>
                                        </div>
                                    )}

                                    {msg.data.columnData && (
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">New Column: {msg.data.columnData.header}</span>
                                            <div className="text-[10px] text-slate-400 font-mono">
                                                Col {msg.data.columnData.targetColLetter || 'Auto'}: {msg.data.columnData.formulas?.[0] || 'Computed formulas'}
                                            </div>
                                        </div>
                                    )}

                                    {msg.data.tableData && (
                                        <div className="space-y-1">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Generated Table ({msg.data.tableData.rows?.length || 0} rows)</span>
                                            <div className="text-[10px] text-slate-400 truncate font-mono">
                                                Headers: {msg.data.tableData.headers?.join(', ')}
                                            </div>
                                        </div>
                                    )}

                                    {msg.data.insights && Array.isArray(msg.data.insights) && (
                                        <ul className="list-disc pl-4 space-y-1 text-slate-300">
                                            {msg.data.insights.map((pt, i) => (
                                                <li key={i}>{pt}</li>
                                            ))}
                                        </ul>
                                    )}

                                    {/* Action Apply Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleApply(msg.data)}
                                        className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                                    >
                                        <Check size={13} />
                                        <span>Apply to Sheet</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-center gap-2 p-3 text-xs text-cyan-400 animate-pulse">
                        <RefreshCw size={14} className="animate-spin" />
                        <span>LabIntel is analyzing and calculating...</span>
                    </div>
                )}
            </div>

            {/* Quick Action Suggestion Chips */}
            <div className={`p-2.5 border-t space-y-1.5 ${
                isDark ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-200 bg-slate-50/60'
            }`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Suggested Lab Prompts</span>
                <div className="grid grid-cols-2 gap-1.5">
                    {QUICK_PROMPT_CHIPS.map((chip, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleSubmit(chip.prompt)}
                            disabled={isLoading}
                            className={`p-1.5 rounded-lg border text-left flex items-center gap-1.5 text-[11px] font-medium transition ${
                                isDark
                                    ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
                            }`}
                        >
                            {chip.icon}
                            <span className="truncate">{chip.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Input Bar */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }}
                className={`p-3 border-t flex items-center gap-2 ${
                    isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'
                }`}
            >
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ask LabIntel (e.g. molarity of NaCl, Beer-Lambert curve)..."
                    disabled={isLoading}
                    className={`flex-1 px-3 py-2 rounded-xl text-xs border outline-none transition ${
                        isDark
                            ? 'bg-slate-900 border-slate-800 text-white focus:border-cyan-500 placeholder-slate-500'
                            : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-600 placeholder-slate-400'
                    }`}
                />
                <button
                    type="submit"
                    disabled={isLoading || !prompt.trim()}
                    className={`p-2 rounded-xl text-white font-bold transition flex items-center justify-center ${
                        isLoading || !prompt.trim()
                            ? 'bg-slate-700/50 opacity-40 cursor-not-allowed'
                            : 'bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-600/20'
                    }`}
                    title="Send to LabIntel"
                >
                    <Send size={15} />
                </button>
            </form>
        </aside>
    );
}
