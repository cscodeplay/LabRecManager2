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
    AlertCircle
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
    onStopDebug
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
        }
    }, [isOpen]);

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
                    variables: Object.values({ ...runningVars }),
                    watches: {}
                });
            }
        });

        return simulatedSteps.length > 0 ? simulatedSteps : [
            {
                lineNumber: 1,
                functionName: '<module>',
                variables: [],
                watches: {}
            }
        ];
    }, [currentCode, isPython]);

    // Request full execution trace from backend when opened or when code/watches change
    const fetchTrace = async (watchesToEval = watchExpressions) => {
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
                        { id: 'w_init', expr: `${firstVar} is not None` }
                    ];
                    setWatchExpressions(initialWatch);
                    fetchTrace(initialWatch);
                    return;
                }
            }
            fetchTrace();
        }
    }, [isOpen, currentCode, isPython]);

    const activeStepsList = steps.length > 0 ? steps : fallbackSteps;
    const activeStep = activeStepsList[currentStepIndex] || activeStepsList[0];

    // Highlight current line in Monaco editor
    useEffect(() => {
        if (!isOpen || !editorRef?.current || !activeStep) return;
        const editor = editorRef.current;
        const line = activeStep.lineNumber || 1;

        // Apply Monaco step decoration (cyan line highlight + breakpoint glyph)
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
            {
                range: new window.monaco.Range(line, 1, line, 1),
                options: {
                    isWholeLine: true,
                    className: 'monaco-debug-active-line',
                    glyphMarginClassName: 'monaco-debug-breakpoint-glyph',
                    overviewRuler: { color: '#0284c7', position: 4 }
                }
            }
        ]);

        editor.revealLineInCenter(line);

        return () => {
            if (editorRef?.current) {
                editorRef.current.deltaDecorations(decorationsRef.current, []);
                decorationsRef.current = [];
            }
        };
    }, [isOpen, currentStepIndex, activeStep]);

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
        if (e.target.closest('button, input, select, table, a')) return;
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

    const handleStepOver = () => {
        if (currentStepIndex < activeStepsList.length - 1) {
            setCurrentStepIndex((prev) => prev + 1);
            toast('Step Over (F10)', { icon: '⏭️', duration: 800 });
        } else {
            toast.success('Program execution completed!', { icon: '🏁' });
        }
    };

    const handleContinue = () => {
        setCurrentStepIndex(activeStepsList.length - 1);
        toast.success('Continued to end of execution!', { icon: '▶' });
    };

    const handleReset = () => {
        setCurrentStepIndex(0);
        fetchTrace();
        toast('Debugger reset to entry point', { icon: '🔄' });
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
        fetchTrace(nextWatches);
    };

    const handleRemoveWatch = (id) => {
        const nextWatches = watchExpressions.filter((w) => w.id !== id);
        setWatchExpressions(nextWatches);
        fetchTrace(nextWatches);
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
            className={`w-[450px] rounded-2xl shadow-2xl border-2 select-none overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
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
                    {/* Stepping Controls Toolbar */}
                    <div className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
                        isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                    }`}>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleStepOver}
                                disabled={currentStepIndex >= activeStepsList.length - 1}
                                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-40 flex items-center gap-1 cursor-pointer shadow-xs"
                                title="Step Over to next statement (F10)"
                            >
                                <span>⏭ Step Over</span>
                            </button>
                            <button
                                onClick={handleContinue}
                                disabled={currentStepIndex >= activeStepsList.length - 1}
                                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-40 flex items-center gap-1 cursor-pointer shadow-xs"
                                title="Continue execution (F5)"
                            >
                                <span>▶ Continue</span>
                            </button>
                            <button
                                onClick={handleReset}
                                className="p-1 rounded-md border text-slate-600 dark:text-slate-400 hover:text-slate-900 transition cursor-pointer"
                                title="Restart Debugging"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            {isLoadingTrace && (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500 ml-1" />
                            )}
                        </div>

                        <div className="text-[11px] font-mono text-slate-500">
                            Step {currentStepIndex + 1} of {activeStepsList.length}
                        </div>
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
                            {/* Live Scope Variables Table */}
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                                    <span>Active In-Scope Variables:</span>
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

                            {/* Dynamic Watch Expressions */}
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
                                            placeholder="e.g. x + y or len(items) > 0"
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
