'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Terminal, Play, Square, RotateCcw, Trash2, Copy, Check,
    CornerDownLeft, Loader2, Sparkles, AlertCircle, CheckCircle2, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { compilerAPI } from '@/lib/api';

/**
 * Loads Skulpt scripts dynamically for in-browser Python execution with interactive input()
 */
let skulptLoadPromise = null;
function loadSkulpt() {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if (window.Sk) return Promise.resolve(true);

    if (skulptLoadPromise) return skulptLoadPromise;

    skulptLoadPromise = new Promise((resolve) => {
        const script1 = document.createElement('script');
        script1.src = 'https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js';
        script1.async = true;

        script1.onload = () => {
            const script2 = document.createElement('script');
            script2.src = 'https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js';
            script2.async = true;
            script2.onload = () => resolve(true);
            script2.onerror = () => resolve(false);
            document.head.appendChild(script2);
        };
        script1.onerror = () => resolve(false);
        document.head.appendChild(script1);
    });

    return skulptLoadPromise;
}

export default function InteractiveTerminal({
    code = '',
    language = 'python',
    initialStdin = '',
    onOutputChange,
    onExecutionFinish,
    autoSyncOutput = true,
    className = ''
}) {
    const [lines, setLines] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isWaitingInput, setIsWaitingInput] = useState(false);
    const [currentPrompt, setCurrentPrompt] = useState('');
    const [currentInputVal, setCurrentInputVal] = useState('');
    const [inputHistory, setInputHistory] = useState([]);
    const [historyIdx, setHistoryIdx] = useState(-1);
    const [copied, setCopied] = useState(false);
    const [execStatus, setExecStatus] = useState(null); // { success: boolean, message: string }

    const terminalEndRef = useRef(null);
    const inputFieldRef = useRef(null);
    const inputResolverRef = useRef(null);
    const executionAbortRef = useRef(false);

    // Auto-scroll terminal to bottom
    const scrollToBottom = useCallback(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [lines, isWaitingInput, scrollToBottom]);

    // Focus input field when waiting for input
    useEffect(() => {
        if (isWaitingInput && inputFieldRef.current) {
            inputFieldRef.current.focus();
        }
    }, [isWaitingInput]);

    // Preload Skulpt for instant Python execution
    useEffect(() => {
        if (language.toLowerCase().includes('python')) {
            loadSkulpt();
        }
    }, [language]);

    // Extract plain text representation of all terminal output
    const getCleanOutputText = useCallback(() => {
        return lines
            .filter(l => l.type !== 'system')
            .map(l => {
                if (l.type === 'input_prompt') {
                    return `${l.prompt || ''}${l.value || ''}`;
                }
                return l.text || '';
            })
            .join('');
    }, [lines]);

    // Sync output to parent callback if requested
    useEffect(() => {
        if (autoSyncOutput && onOutputChange) {
            const cleanText = getCleanOutputText();
            if (cleanText.trim()) {
                onOutputChange(cleanText.trim());
            }
        }
    }, [lines, autoSyncOutput, onOutputChange, getCleanOutputText]);

    // Clear terminal screen
    const handleClear = () => {
        setLines([]);
        setExecStatus(null);
    };

    // Copy entire output
    const handleCopy = async () => {
        const text = getCleanOutputText();
        if (!text) {
            toast.error('Terminal is empty');
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success('Terminal output copied!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy');
        }
    };

    // Stop execution
    const handleStop = () => {
        executionAbortRef.current = true;
        if (inputResolverRef.current) {
            inputResolverRef.current('');
            inputResolverRef.current = null;
        }
        setIsWaitingInput(false);
        setIsRunning(false);
        setLines(prev => [...prev, { type: 'system', text: '\n[Execution terminated by user]' }]);
        setExecStatus({ success: false, message: 'Execution stopped.' });
    };

    // Submit inline input when user presses Enter
    const handleSendInput = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!isWaitingInput || !inputResolverRef.current) return;

        const val = currentInputVal;
        const promptText = currentPrompt;

        // Append completed input line to terminal output
        setLines(prev => [
            ...prev,
            { type: 'input_prompt', prompt: promptText, value: val + '\n' }
        ]);

        // Save to input history for Up/Down arrow navigation
        if (val.trim()) {
            setInputHistory(prev => [...prev, val]);
        }

        // Reset input state
        setCurrentInputVal('');
        setCurrentPrompt('');
        setIsWaitingInput(false);
        setHistoryIdx(-1);

        // Resolve Python input Promise
        const resolver = inputResolverRef.current;
        inputResolverRef.current = null;
        resolver(val);
    };

    // Keyboard navigation for terminal input (History Up/Down)
    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSendInput(e);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (inputHistory.length === 0) return;
            const newIdx = historyIdx === -1 ? inputHistory.length - 1 : Math.max(0, historyIdx - 1);
            setHistoryIdx(newIdx);
            setCurrentInputVal(inputHistory[newIdx] || '');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIdx === -1) return;
            const newIdx = historyIdx + 1;
            if (newIdx >= inputHistory.length) {
                setHistoryIdx(-1);
                setCurrentInputVal('');
            } else {
                setHistoryIdx(newIdx);
                setCurrentInputVal(inputHistory[newIdx] || '');
            }
        }
    };

    // Run code interactively
    const handleRun = async () => {
        if (!code || !code.trim()) {
            toast.error('Please write or paste code first!');
            return;
        }

        executionAbortRef.current = false;
        setIsRunning(true);
        setIsWaitingInput(false);
        setCurrentPrompt('');
        setCurrentInputVal('');
        setExecStatus(null);
        setLines([{ type: 'system', text: `[Running ${language.toLowerCase()} program interactively...]\n` }]);

        const isPython = language.toLowerCase().includes('python');

        // Check if we can use Skulpt in-browser execution
        if (isPython) {
            const skulptReady = await loadSkulpt();
            if (skulptReady && window.Sk) {
                try {
                    window.Sk.configure({
                        output: (text) => {
                            if (executionAbortRef.current) return;
                            setLines(prev => [...prev, { type: 'stdout', text }]);
                        },
                        read: (filename) => {
                            if (window.Sk.builtinFiles === undefined || window.Sk.builtinFiles['files'][filename] === undefined) {
                                throw new Error(`File not found: '${filename}'`);
                            }
                            return window.Sk.builtinFiles['files'][filename];
                        },
                        inputfun: (prompt) => {
                            if (executionAbortRef.current) return Promise.resolve('');
                            return new Promise((resolve) => {
                                setIsWaitingInput(true);
                                setCurrentPrompt(prompt || '');
                                inputResolverRef.current = resolve;
                            });
                        },
                        inputfunTakesPrompt: true,
                        retainPath: true
                    });

                    await window.Sk.misceval.asyncToPromise(() => {
                        return window.Sk.importMainWithBody('<stdin>', false, code, true);
                    });

                    if (!executionAbortRef.current) {
                        setLines(prev => [...prev, { type: 'system', text: '\n\n[Program finished with exit code 0]' }]);
                        setExecStatus({ success: true, message: 'Execution complete!' });
                        toast.success('Program executed successfully!');
                        if (onExecutionFinish) onExecutionFinish(true);
                    }
                } catch (err) {
                    if (!executionAbortRef.current) {
                        const errMsg = err.toString();
                        setLines(prev => [...prev, { type: 'stderr', text: `\n${errMsg}\n` }]);
                        setExecStatus({ success: false, message: 'Runtime / Execution Error' });
                        toast.error('Execution error in program');
                        if (onExecutionFinish) onExecutionFinish(false);
                    }
                } finally {
                    setIsRunning(false);
                    setIsWaitingInput(false);
                    return;
                }
            }
        }

        // Fallback: Cloud API execution (Wandbox)
        try {
            const response = await compilerAPI.execute({
                language: language.toLowerCase(),
                code,
                stdin: initialStdin || ''
            });

            const data = response.data?.data || {};

            if (data.compile_stderr) {
                setLines(prev => [
                    ...prev,
                    { type: 'stderr', text: `[Compilation Error]:\n${data.compile_stderr}\n` }
                ]);
                setExecStatus({ success: false, message: 'Compilation failed' });
                toast.error('Compilation failed');
                if (onExecutionFinish) onExecutionFinish(false);
            } else if (data.stderr) {
                if (data.stdout) {
                    setLines(prev => [...prev, { type: 'stdout', text: data.stdout }]);
                }
                setLines(prev => [...prev, { type: 'stderr', text: `\n${data.stderr}\n` }]);
                setExecStatus({ success: false, message: 'Runtime error' });
                toast.error('Runtime error');
                if (onExecutionFinish) onExecutionFinish(false);
            } else {
                setLines(prev => [
                    ...prev,
                    { type: 'stdout', text: data.stdout || '[Program executed successfully with no stdout output]\n' },
                    { type: 'system', text: '\n[Program finished with exit code 0]' }
                ]);
                setExecStatus({ success: true, message: 'Executed successfully via Cloud Sandbox' });
                toast.success('Code executed!');
                if (onExecutionFinish) onExecutionFinish(true);
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || String(err);
            setLines(prev => [...prev, { type: 'stderr', text: `\n[Execution Error]: ${errMsg}\n` }]);
            setExecStatus({ success: false, message: errMsg });
            toast.error('Execution failed');
            if (onExecutionFinish) onExecutionFinish(false);
        } finally {
            setIsRunning(false);
            setIsWaitingInput(false);
        }
    };

    return (
        <div className={`rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col ${className}`}>
            {/* Terminal Header Bar */}
            <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-3 select-none">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 mr-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                        <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                        <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                    </div>
                    <Terminal className="w-4 h-4 text-emerald-400 ml-1" />
                    <span className="text-xs font-semibold text-slate-200 tracking-wide font-mono">
                        Terminal: {language}
                    </span>
                    {isRunning && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {isWaitingInput ? 'Waiting for Input...' : 'Running...'}
                        </span>
                    )}
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2">
                    {isRunning ? (
                        <button
                            type="button"
                            onClick={handleStop}
                            className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                            title="Stop Program"
                        >
                            <Square className="w-3.5 h-3.5 fill-red-400" />
                            Stop
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleRun}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5 active:scale-95"
                            title="Run Program Interactively (Ctrl+Enter)"
                        >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            Run Interactive
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleClear}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
                        title="Clear Terminal"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                        type="button"
                        onClick={handleCopy}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition flex items-center gap-1"
                        title="Copy All Output"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            {/* Terminal Body */}
            <div 
                className="p-4 font-mono text-xs leading-relaxed overflow-y-auto flex-1 min-h-[220px] max-h-[420px] text-slate-100 bg-slate-950 cursor-text select-text"
                onClick={() => {
                    if (isWaitingInput && inputFieldRef.current) {
                        inputFieldRef.current.focus();
                    }
                }}
            >
                {lines.length === 0 && !isRunning && (
                    <div className="text-slate-500 italic py-6 text-center select-none">
                        <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
                        <p>Click <strong className="text-slate-300">Run Interactive</strong> to execute your code.</p>
                        <p className="text-[11px] text-slate-600 mt-1">Interactive input() prompts will appear directly inside this terminal like any real IDE.</p>
                    </div>
                )}

                {/* Render Terminal Lines */}
                {lines.map((line, idx) => {
                    if (line.type === 'system') {
                        return <div key={idx} className="text-slate-500 font-mono italic my-0.5">{line.text}</div>;
                    }
                    if (line.type === 'stderr') {
                        return <div key={idx} className="text-rose-400 font-mono whitespace-pre-wrap">{line.text}</div>;
                    }
                    if (line.type === 'input_prompt') {
                        return (
                            <div key={idx} className="font-mono whitespace-pre-wrap">
                                <span className="text-slate-100">{line.prompt}</span>
                                <span className="text-emerald-400 font-bold bg-emerald-950/40 px-1 rounded">{line.value}</span>
                            </div>
                        );
                    }
                    return <span key={idx} className="text-slate-100 font-mono whitespace-pre-wrap">{line.text}</span>;
                })}

                {/* Active Inline Input Prompt Line */}
                {isWaitingInput && (
                    <div className="flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-500/30 rounded px-2 py-1 my-1.5 shadow-sm animate-fadeIn">
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                        <span className="text-emerald-300 font-bold select-none shrink-0">
                            {currentPrompt || 'input:'}
                        </span>
                        <input
                            ref={inputFieldRef}
                            type="text"
                            value={currentInputVal}
                            onChange={(e) => setCurrentInputVal(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            placeholder="Type input & press Enter..."
                            className="flex-1 bg-transparent text-emerald-300 font-mono text-xs outline-none border-none p-0 focus:ring-0 placeholder:text-slate-600 font-semibold"
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={handleSendInput}
                            className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] flex items-center gap-1 transition"
                            title="Submit Input (Enter)"
                        >
                            <CornerDownLeft className="w-3 h-3" />
                            <span>Enter</span>
                        </button>
                    </div>
                )}

                <div ref={terminalEndRef} />
            </div>

            {/* Terminal Footer Status */}
            {execStatus && (
                <div className={`px-4 py-2 border-t text-xs font-mono flex items-center justify-between gap-2 ${
                    execStatus.success ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300' : 'bg-red-950/40 border-red-800/40 text-red-300'
                }`}>
                    <div className="flex items-center gap-2">
                        {execStatus.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span>{execStatus.message}</span>
                    </div>

                    <span className="text-[11px] text-slate-400">
                        {autoSyncOutput ? 'Output auto-synced' : 'Ready'}
                    </span>
                </div>
            )}
        </div>
    );
}
