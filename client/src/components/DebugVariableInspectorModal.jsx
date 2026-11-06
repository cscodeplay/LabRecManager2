'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Bug,
    Play,
    Square,
    RotateCcw,
    X,
    Eye,
    Plus,
    Trash2,
    ChevronRight,
    Minimize2,
    Maximize2,
    CheckCircle2,
    Clock,
    Sparkles,
    Move,
    RefreshCw,
    AlertCircle,
    Terminal,
    Layers,
    CircleDot
} from 'lucide-react';
import toast from 'react-hot-toast';
import { compilerAPI } from '@/lib/api';

export default function DebugVariableInspectorModal({
    isOpen,
    onClose,
    activeTab,
    code: propCode,
    language,
    editorRef,
    isLightMode = true,
    onStepLine,
    onStopDebug,
    externalBreakpoints,
    onToggleBreakpoint
}) {
    // Draggable position state
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const [isMinimized, setIsMinimized] = useState(false);

    // Active program code and language
    const currentCode = propCode !== undefined ? propCode : (activeTab?.code || '');
    const currentLang = (language || activeTab?.language || 'python').toLowerCase();
    const isPython = currentLang.includes('py');

    // Dynamic Execution Trace State
    const [steps, setSteps] = useState([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isLoadingTrace, setIsLoadingTrace] = useState(false);
    const [traceError, setTraceError] = useState(null);

    // Standard Input (stdin) state for interactive input() handling
    const [stdinValue, setStdinValue] = useState(() => {
        if (activeTab?.stdin && activeTab.stdin.trim()) return activeTab.stdin.trim();
        return currentCode.includes('input(') ? '7' : '';
    });
    const [showStdinDrawer, setShowStdinDrawer] = useState(() => currentCode.includes('input('));

    // Breakpoint Management (Code::Blocks style gutter red dots & continue-to-breakpoint)
    const [localBreakpoints, setLocalBreakpoints] = useState(() => [6]);
    const activeBreakpoints = externalBreakpoints || localBreakpoints;
    const [newBreakpointLine, setNewBreakpointLine] = useState('');
    const [showAddBreakpoint, setShowAddBreakpoint] = useState(false);

    // Inspector view mode tab ('variables' | 'watches' | 'callstack' | 'console')
    const [activeInspectorTab, setActiveInspectorTab] = useState('variables');

    // Watch Expressions
    const [watchExpressions, setWatchExpressions] = useState([]);
    const [newWatchText, setNewWatchText] = useState('');
    const [showAddWatch, setShowAddWatch] = useState(false);

    const decorationsRef = useRef([]);

    // Initialize position at top-right of editor screen
    useEffect(() => {
        if (isOpen) {
            const width = 450;
            const initialX = Math.max(30, window.innerWidth - width - 60);
            const initialY = 110;
            setPosition({ x: initialX, y: initialY });
            setCurrentStepIndex(0);
            if (currentCode.includes('input(') && !stdinValue) {
                setStdinValue('7');
                setShowStdinDrawer(true);
            }
        }
    }, [isOpen, currentCode]);

    // Client-side lightweight fallback parser for immediate response
    const fallbackSteps = useMemo(() => {
        if (!currentCode || !isPython) return [];
        const lines = currentCode.split('\n');
        const simulatedSteps = [];
        const runningVars = {};

        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;

            // Simple assignment detection
            const assignMatch = trimmed.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)/);
            if (assignMatch) {
                const varName = assignMatch[1];
                const rawVal = assignMatch[2];
                let valType = 'str';
                let cleanVal = rawVal;

                if (!isNaN(rawVal)) {
                    valType = rawVal.includes('.') ? 'float' : 'int';
                } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
                    valType = 'list';
                } else if (rawVal.startsWith('{') && rawVal.endsWith('}')) {
                    valType = 'dict';
                } else if (rawVal === 'True' || rawVal === 'False') {
                    valType = 'bool';
                }

                runningVars[varName] = {
                    name: varName,
                    value: cleanVal,
                    type: valType,
                    changed: true
                };

                simulatedSteps.push({
                    lineNumber: idx + 1,
                    functionName: '<module>',
                    callStack: [{ function: '<module>', line: idx + 1 }],
                    variables: Object.values({ ...runningVars }),
                    watches: {},
                    stdout: ''
                });
            }
        });

        return simulatedSteps.length > 0 ? simulatedSteps : [
            {
                lineNumber: 1,
                functionName: '<module>',
                callStack: [{ function: '<module>', line: 1 }],
                variables: [],
                watches: {},
                stdout: ''
            }
        ];
    }, [currentCode, isPython]);

    // Request full execution trace from backend when opened or when code/watches/stdin change
    const fetchTrace = async (watchesToEval = watchExpressions, inputToUse = stdinValue) => {
        if (!isPython || !currentCode.trim()) {
            setSteps(fallbackSteps);
            return;
        }

        setIsLoadingTrace(true);
        setTraceError(null);

        try {
            const watchStrings = (watchesToEval || []).map((w) => w.expr);
            const res = await compilerAPI.debugTrace({
                code: currentCode,
                stdin: inputToUse || '',
                watchExpressions: watchStrings
            });

            if (res.data?.success && Array.isArray(res.data?.data?.steps) && res.data.data.steps.length > 0) {
                setSteps(res.data.data.steps);
                setTraceError(res.data.data.error || null);
            } else {
                setSteps(fallbackSteps);
                if (res.data?.data?.error) {
                    setTraceError(res.data.data.error);
                }
            }
        } catch (err) {
            console.warn('[Debugger] Trace error, using fallback:', err.message);
            setSteps(fallbackSteps);
        } finally {
            setIsLoadingTrace(false);
        }
    };

    // Auto-load trace when debugger opens or when code changes
    useEffect(() => {
        if (isOpen && isPython) {
            // Suggest initial watch from user's actual code variables
            if (watchExpressions.length === 0 && currentCode) {
                const varMatches = currentCode.match(/\b([a-zA-Z_]\w*)\s*=/);
                if (varMatches && varMatches[1]) {
                    const firstVar = varMatches[1];
                    const initialWatch = [
                        { id: 'w_init', expr: `${firstVar} > 0` }
                    ];
                    setWatchExpressions(initialWatch);
                    fetchTrace(initialWatch, stdinValue);
                    return;
                }
            }
            fetchTrace(watchExpressions, stdinValue);
        }
    }, [isOpen, currentCode, isPython]);

    const activeStepsList = steps.length > 0 ? steps : fallbackSteps;
    const activeStep = activeStepsList[currentStepIndex] || activeStepsList[0];

    // Highlight current line and breakpoints in Monaco editor
    useEffect(() => {
        if (!isOpen || !editorRef?.current || !activeStep) return;
        const editor = editorRef.current;
        const currentLine = activeStep.lineNumber || 1;

        const decorations = [];

        // 1. Breakpoint dots on all registered breakpoint lines
        (activeBreakpoints || []).forEach((bpLine) => {
            decorations.push({
                range: new window.monaco.Range(bpLine, 1, bpLine, 1),
                options: {
                    isWholeLine: false,
                    glyphMarginClassName: 'monaco-debug-breakpoint-glyph',
                    overviewRuler: { color: '#ef4444', position: 4 }
                }
            });
        });

        // 2. Active execution line (cyan whole line + arrow glyph)
        decorations.push({
            range: new window.monaco.Range(currentLine, 1, currentLine, 1),
            options: {
                isWholeLine: true,
                className: 'monaco-debug-active-line',
                glyphMarginClassName: 'monaco-debug-active-glyph',
                overviewRuler: { color: '#0284c7', position: 4 }
            }
        });

        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
        editor.revealLineInCenter(currentLine);

        return () => {
            if (editorRef?.current) {
                editorRef.current.deltaDecorations(decorationsRef.current, []);
                decorationsRef.current = [];
            }
        };
    }, [isOpen, currentStepIndex, activeStep, activeBreakpoints]);

    // Cleanup decorations on unmount
    useEffect(() => {
        return () => {
            if (editorRef?.current && decorationsRef.current.length > 0) {
                editorRef.current.deltaDecorations(decorationsRef.current, []);
                decorationsRef.current = [];
            }
        };
    }, []);

    // Dragging handlers
    const handleMouseDown = (e) => {
        if (e.target.closest('button, input, select, table, a, textarea')) return;
        setIsDragging(true);
        dragOffsetRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const newX = Math.max(10, Math.min(window.innerWidth - 420, e.clientX - dragOffsetRef.current.x));
            const newY = Math.max(50, Math.min(window.innerHeight - 150, e.clientY - dragOffsetRef.current.y));
            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Step Over (F10 / Code::Blocks Next Line)
    const handleStepOver = () => {
        if (currentStepIndex < activeStepsList.length - 1) {
            setCurrentStepIndex((prev) => prev + 1);
            toast('Step Over (F10)', { icon: '⏭️', duration: 700 });
        } else {
            toast.success('Program execution completed!', { icon: '🏁' });
        }
    };

    // Continue to next breakpoint (F5 / Code::Blocks F8 Run)
    const handleContinue = () => {
        if (currentStepIndex >= activeStepsList.length - 1) {
            toast.success('Execution completed!', { icon: '🏁' });
            return;
        }

        // Look for next step whose line number matches a set breakpoint
        let nextBpIndex = -1;
        for (let i = currentStepIndex + 1; i < activeStepsList.length; i++) {
            const stepLine = activeStepsList[i].lineNumber;
            if (activeBreakpoints.includes(stepLine)) {
                nextBpIndex = i;
                break;
            }
        }

        if (nextBpIndex !== -1) {
            setCurrentStepIndex(nextBpIndex);
            toast(`Paused at Breakpoint (Line ${activeStepsList[nextBpIndex].lineNumber})`, { icon: '🔴', duration: 1200 });
        } else {
            // No more breakpoints, continue to end
            setCurrentStepIndex(activeStepsList.length - 1);
            toast.success('Continued to end of program!', { icon: '▶' });
        }
    };

    const handleReset = () => {
        setCurrentStepIndex(0);
        fetchTrace(watchExpressions, stdinValue);
        toast('Debugger reset to entry point', { icon: '🔄' });
    };

    // Toggle Breakpoint handler
    const handleToggleBreakpoint = (lineNum) => {
        const line = parseInt(lineNum, 10);
        if (isNaN(line) || line < 1) return;

        if (typeof onToggleBreakpoint === 'function') {
            onToggleBreakpoint(line);
        } else {
            setLocalBreakpoints((prev) =>
                prev.includes(line) ? prev.filter((l) => l !== line) : [...prev, line].sort((a, b) => a - b)
            );
        }
    };

    // Apply Standard Input and re-trace
    const handleApplyStdin = (e) => {
        if (e) e.preventDefault();
        const raw = stdinValue;
        if (!raw || !raw.trim()) {
            toast('Empty inputs or spaces are ignored, waiting for value', { icon: '⏳', duration: 1500 });
            return;
        }

        fetchTrace(watchExpressions, raw.trim());
        setCurrentStepIndex(0);
        toast.success(`Debug session reloaded with input: "${raw.trim()}"`);
    };

    // Evaluate watch expression against current step
    const getWatchValue = (expr) => {
        if (activeStep?.watches && activeStep.watches[expr] !== undefined) {
            return activeStep.watches[expr];
        }

        // Local evaluation fallback
        const vars = activeStep?.variables || [];
        const varMap = Object.fromEntries(vars.map((v) => [v.name, Number(v.value) || v.value]));

        try {
            if (expr.includes('==')) {
                const [left, right] = expr.split('==').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
                const lVal = varMap[left] !== undefined ? String(varMap[left]) : left;
                return String(lVal) === String(right) ? 'True' : 'False';
            }
            if (expr.includes('>')) {
                const [left, right] = expr.split('>').map((s) => s.trim());
                const lVal = varMap[left] !== undefined ? varMap[left] : Number(left);
                const rVal = varMap[right] !== undefined ? varMap[right] : Number(right);
                return lVal > rVal ? 'True' : 'False';
            }
            if (expr.includes('<')) {
                const [left, right] = expr.split('<').map((s) => s.trim());
                const lVal = varMap[left] !== undefined ? varMap[left] : Number(left);
                const rVal = varMap[right] !== undefined ? varMap[right] : Number(right);
                return lVal < rVal ? 'True' : 'False';
            }
            if (varMap[expr] !== undefined) return String(varMap[expr]);
            return '<undefined>';
        } catch (_) {
            return '<undefined>';
        }
    };

    const handleAddWatch = (e) => {
        if (e) e.preventDefault();
        const trimmed = newWatchText.trim();
        if (!trimmed) return;

        const nextWatches = [...watchExpressions, { id: `w_${Date.now()}`, expr: trimmed }];
        setWatchExpressions(nextWatches);
        setNewWatchText('');
        setShowAddWatch(false);
        fetchTrace(nextWatches, stdinValue);
    };

    const handleRemoveWatch = (id) => {
        const nextWatches = watchExpressions.filter((w) => w.id !== id);
        setWatchExpressions(nextWatches);
        fetchTrace(nextWatches, stdinValue);
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 9999
            }}
            className={`w-[460px] rounded-2xl shadow-2xl border-2 select-none overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
                isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
            }`}
        >
            {/* Custom Monaco Step CSS */}
            <style jsx global>{`
                .monaco-debug-active-line {
                    background-color: rgba(56, 189, 248, 0.22) !important;
                    border-left: 3px solid #0284c7 !important;
                }
                .monaco-debug-breakpoint-glyph {
                    background: #ef4444 !important;
                    border-radius: 50% !important;
                    width: 10px !important;
                    height: 10px !important;
                    margin-left: 5px !important;
                    margin-top: 5px !important;
                    box-shadow: 0 0 6px #ef4444 !important;
                }
                .monaco-debug-active-glyph {
                    color: #0284c7 !important;
                    font-weight: bold !important;
                    margin-left: 4px !important;
                    margin-top: 2px !important;
                }
            `}</style>

            {/* Draggable Header */}
            <div
                onMouseDown={handleMouseDown}
                className={`px-4 py-2.5 flex items-center justify-between cursor-move border-b ${
                    isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}
            >
                <div className="flex items-center gap-2">
                    <Move className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-xs flex items-center gap-1.5 text-slate-900 dark:text-white">
                        <Bug className="w-4 h-4 text-rose-500" />
                        <span>Debugger: {activeTab?.filename || 'program.py'}</span>
                    </span>
                    {isPython && (
                        <span className="bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border border-sky-300 dark:border-sky-800">
                            Line {activeStep?.lineNumber || 1}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                        title={isMinimized ? 'Expand' : 'Minimize'}
                    >
                        {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        title="Close Debugger (Esc)"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Non-Python Guard */}
            {!isPython ? (
                <div className="p-6 text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Debugger & Variable Monitor is active for Python programs (.py).
                    </p>
                    <p className="text-[11px] text-slate-500">
                        Currently active tab is <span className="font-bold text-slate-800 dark:text-slate-200">{activeTab?.language || 'SQL'}</span>. Please switch to a Python tab to step through variables.
                    </p>
                </div>
            ) : (
                <>
                    {/* Stepping Controls Toolbar (Code::Blocks Suite) */}
                    <div className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
                        isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                    }`}>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleStepOver}
                                disabled={currentStepIndex >= activeStepsList.length - 1}
                                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-40 flex items-center gap-1 cursor-pointer shadow-xs"
                                title="Step Over to next statement (F10 / Code::Blocks F7)"
                            >
                                <span>⏭ Step Over</span>
                            </button>
                            <button
                                onClick={handleContinue}
                                disabled={currentStepIndex >= activeStepsList.length - 1}
                                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-40 flex items-center gap-1 cursor-pointer shadow-xs"
                                title="Continue to next breakpoint or end (F5 / Code::Blocks F8)"
                            >
                                <span>▶ Continue</span>
                            </button>
                            <button
                                onClick={handleReset}
                                className="p-1 rounded-md border text-slate-600 dark:text-slate-400 hover:text-slate-900 transition cursor-pointer"
                                title="Restart Debugging from Line 1 (Ctrl+Shift+F5)"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            {isLoadingTrace && (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500 ml-1" />
                            )}
                        </div>

                        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
                            <span>Step {currentStepIndex + 1} of {activeStepsList.length}</span>
                        </div>
                    </div>

                    {/* Interactive Standard Input (stdin) Drawer */}
                    {showStdinDrawer && (
                        <div className={`px-4 py-2 border-b flex items-center justify-between gap-2 text-xs font-mono ${
                            isLightMode ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-amber-950/30 border-amber-800 text-amber-200'
                        }`}>
                            <span className="font-bold text-[10px] uppercase shrink-0">Input (stdin):</span>
                            <form onSubmit={handleApplyStdin} className="flex-1 flex items-center gap-1.5">
                                <input
                                    type="text"
                                    value={stdinValue}
                                    onChange={(e) => setStdinValue(e.target.value)}
                                    placeholder="Enter input (e.g. 7 or -3)"
                                    className="flex-1 px-2 py-0.5 text-xs rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                                />
                                <button
                                    type="submit"
                                    className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition cursor-pointer"
                                    title="Debug with this standard input"
                                >
                                    Apply
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Navigation Tab Bar (Variables, Watches, Call Stack, Console Output) */}
                    <div className={`px-4 pt-1.5 border-b flex items-center gap-3 text-[11px] font-semibold ${
                        isLightMode ? 'bg-slate-100/70 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}>
                        <button
                            onClick={() => setActiveInspectorTab('variables')}
                            className={`pb-1.5 transition border-b-2 cursor-pointer ${
                                activeInspectorTab === 'variables'
                                    ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-bold'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            Variables ({activeStep?.variables?.length || 0})
                        </button>
                        <button
                            onClick={() => setActiveInspectorTab('watches')}
                            className={`pb-1.5 transition border-b-2 cursor-pointer flex items-center gap-1 ${
                                activeInspectorTab === 'watches'
                                    ? 'border-purple-500 text-purple-600 dark:text-purple-400 font-bold'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <Eye className="w-3 h-3 text-purple-500" />
                            <span>Watches ({watchExpressions.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveInspectorTab('callstack')}
                            className={`pb-1.5 transition border-b-2 cursor-pointer flex items-center gap-1 ${
                                activeInspectorTab === 'callstack'
                                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <Layers className="w-3 h-3 text-emerald-500" />
                            <span>Call Stack</span>
                        </button>
                        <button
                            onClick={() => setActiveInspectorTab('console')}
                            className={`pb-1.5 transition border-b-2 cursor-pointer flex items-center gap-1 ${
                                activeInspectorTab === 'console'
                                    ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <Terminal className="w-3 h-3 text-amber-500" />
                            <span>Console Log</span>
                        </button>
                    </div>

                    {/* Trace Error Banner (If syntax error or runtime issue) */}
                    {traceError && (
                        <div className="bg-rose-500/10 border-b border-rose-500/30 px-3 py-1 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{traceError}</span>
                        </div>
                    )}

                    {/* Body (Collapsible when Minimized) */}
                    {!isMinimized && (
                        <div className="p-3.5 space-y-3 max-h-[360px] overflow-y-auto">
                            {/* TAB 1: Live Scope Variables Table */}
                            {activeInspectorTab === 'variables' && (
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                                        <span>Active Scope Variables:</span>
                                        <span className="font-mono text-[9px] text-sky-600 dark:text-sky-400">
                                            Scope: {activeStep?.functionName || '<module>'}
                                        </span>
                                    </div>

                                    <div className="rounded-xl border overflow-hidden">
                                        <table className="w-full text-left text-xs font-mono">
                                            <thead>
                                                <tr className={`border-b text-[10px] uppercase ${
                                                    isLightMode ? 'bg-slate-100 text-slate-600' : 'bg-slate-950 text-slate-400'
                                                }`}>
                                                    <th className="py-1 px-2.5">Variable</th>
                                                    <th className="py-1 px-2">Type</th>
                                                    <th className="py-1 px-2.5">Current Value</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(!activeStep?.variables || activeStep.variables.length === 0) ? (
                                                    <tr>
                                                        <td colSpan={3} className="py-3 px-2 text-center text-[11px] text-slate-400">
                                                            No local variables initialized at this step.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    activeStep.variables.map((v) => (
                                                        <tr
                                                            key={v.name}
                                                            className={`border-b last:border-0 transition ${
                                                                v.changed
                                                                    ? isLightMode ? 'bg-amber-50/80 font-bold' : 'bg-amber-950/40 font-bold'
                                                                    : isLightMode ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                                                            }`}
                                                        >
                                                            <td className="py-1.5 px-2.5 font-bold text-sky-700 dark:text-sky-300">
                                                                {v.name}
                                                            </td>
                                                            <td className="py-1.5 px-2 text-[10px] text-slate-500 dark:text-slate-400">
                                                                {v.type}
                                                            </td>
                                                            <td className="py-1.5 px-2.5">
                                                                <span className={`px-1.5 py-0.2 rounded font-bold ${
                                                                    v.changed
                                                                        ? 'bg-amber-200 text-amber-950 dark:bg-amber-900/60 dark:text-amber-200'
                                                                        : 'text-slate-900 dark:text-white'
                                                                }`}>
                                                                    {v.value}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: Dynamic Watch Expressions */}
                            {activeInspectorTab === 'watches' && (
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-3.5 h-3.5 text-purple-500" />
                                            Watch Expressions
                                        </span>
                                        <button
                                            onClick={() => setShowAddWatch(!showAddWatch)}
                                            className="text-purple-600 hover:text-purple-500 font-bold text-[10px] cursor-pointer"
                                        >
                                            + Add Watch
                                        </button>
                                    </div>

                                    {showAddWatch && (
                                        <form onSubmit={handleAddWatch} className="flex items-center gap-1.5 mb-2">
                                            <input
                                                type="text"
                                                value={newWatchText}
                                                onChange={(e) => setNewWatchText(e.target.value)}
                                                placeholder="e.g. num > 0 or len(items) > 0"
                                                className="flex-1 px-2 py-1 text-xs font-mono rounded-lg border border-purple-300 dark:border-purple-700 outline-none focus:ring-1 focus:ring-purple-500"
                                                autoFocus
                                            />
                                            <button
                                                type="submit"
                                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-600 text-white cursor-pointer"
                                            >
                                                Add
                                            </button>
                                        </form>
                                    )}

                                    <div className="space-y-1">
                                        {watchExpressions.length === 0 ? (
                                            <div className="text-[11px] text-slate-400 italic px-1">
                                                No watch expressions added. Click + Add Watch to evaluate expressions.
                                            </div>
                                        ) : (
                                            watchExpressions.map((w) => (
                                                <div
                                                    key={w.id}
                                                    className={`px-2.5 py-1 rounded-lg border flex items-center justify-between text-xs font-mono ${
                                                        isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                                                    }`}
                                                >
                                                    <span className="text-slate-700 dark:text-slate-300">{w.expr}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px]">
                                                            {getWatchValue(w.expr)}
                                                        </span>
                                                        <button
                                                            onClick={() => handleRemoveWatch(w.id)}
                                                            className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                                            title="Remove watch"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: Call Stack & Breakpoints Hierarchy */}
                            {activeInspectorTab === 'callstack' && (
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                                            <span>Active Call Stack:</span>
                                            <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400">
                                                {activeStep?.callStack?.length || 1} Frame(s)
                                            </span>
                                        </div>
                                        <div className="rounded-xl border overflow-hidden font-mono text-xs">
                                            {(activeStep?.callStack || [{ function: activeStep?.functionName || '<module>', line: activeStep?.lineNumber || 1 }]).map((frame, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`px-3 py-1.5 flex items-center justify-between border-b last:border-0 ${
                                                        idx === 0 ? 'bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300' : ''
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        <Layers className="w-3 h-3 text-emerald-500" />
                                                        <span>{frame.function}()</span>
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">Line {frame.line}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Breakpoint Manager */}
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                                            <span className="flex items-center gap-1">
                                                <CircleDot className="w-3.5 h-3.5 text-rose-500" />
                                                Active Breakpoints:
                                            </span>
                                            <button
                                                onClick={() => setShowAddBreakpoint(!showAddBreakpoint)}
                                                className="text-rose-600 hover:text-rose-500 font-bold text-[10px] cursor-pointer"
                                            >
                                                + Toggle Line
                                            </button>
                                        </div>

                                        {showAddBreakpoint && (
                                            <form
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    handleToggleBreakpoint(newBreakpointLine);
                                                    setNewBreakpointLine('');
                                                    setShowAddBreakpoint(false);
                                                }}
                                                className="flex items-center gap-1.5 mb-2"
                                            >
                                                <input
                                                    type="number"
                                                    value={newBreakpointLine}
                                                    onChange={(e) => setNewBreakpointLine(e.target.value)}
                                                    placeholder="Line # (e.g. 6)"
                                                    className="w-24 px-2 py-0.5 text-xs font-mono rounded border outline-none"
                                                    autoFocus
                                                />
                                                <button
                                                    type="submit"
                                                    className="px-2 py-0.5 text-xs font-bold rounded bg-rose-600 text-white cursor-pointer"
                                                >
                                                    Toggle
                                                </button>
                                            </form>
                                        )}

                                        <div className="flex flex-wrap gap-1.5">
                                            {activeBreakpoints.length === 0 ? (
                                                <span className="text-[11px] text-slate-400 italic">No breakpoints set. Click line # in gutter or + Toggle Line.</span>
                                            ) : (
                                                activeBreakpoints.map((bp) => (
                                                    <span
                                                        key={bp}
                                                        className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[10px] font-mono font-bold flex items-center gap-1"
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                        <span>Line {bp}</span>
                                                        <button
                                                            onClick={() => handleToggleBreakpoint(bp)}
                                                            className="hover:text-rose-900 cursor-pointer"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: Live Console Output Stream */}
                            {activeInspectorTab === 'console' && (
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                                        <span className="flex items-center gap-1">
                                            <Terminal className="w-3.5 h-3.5 text-amber-500" />
                                            Stdout Log (up to current line):
                                        </span>
                                    </div>
                                    <div className={`p-2.5 rounded-xl border font-mono text-xs min-h-[90px] whitespace-pre-wrap select-text ${
                                        isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
                                    }`}>
                                        {activeStep?.stdout ? activeStep.stdout : (
                                            <span className="text-slate-400 italic text-[11px]">
                                                No output generated yet at this execution line.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Footer */}
            <div className={`px-4 py-2 border-t text-[10px] font-mono text-slate-400 flex items-center justify-between ${
                isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
                <span>F10: Step Over • F5: Continue</span>
                <span>Active Python Program Monitor</span>
            </div>
        </div>
    );
}
