'use client';

import React, { useState, useEffect, useRef } from 'react';
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
    Move
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DebugVariableInspectorModal({
    isOpen,
    onClose,
    activeTab,
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

    // Debug execution state
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(true);
    const [watchExpressions, setWatchExpressions] = useState([
        { id: 'w1', expr: 'total_sum > 10' }
    ]);
    const [newWatchText, setNewWatchText] = useState('');
    const [showAddWatch, setShowAddWatch] = useState(false);

    const decorationsRef = useRef([]);

    // Initialize position at top-right of editor screen
    useEffect(() => {
        if (isOpen) {
            const width = 440;
            const initialX = Math.max(30, window.innerWidth - width - 60);
            const initialY = 110;
            setPosition({ x: initialX, y: initialY });
            setCurrentStepIndex(0);
            setIsPaused(true);
        }
    }, [isOpen]);

    // Simulated / Instrument-driven step traces for the active code
    const getExecutionSteps = () => {
        const code = activeTab?.code || '';
        const lines = code.split('\n');

        // Extract key variable lines or loop steps
        const steps = [];
        let accSum = 0;
        let accProd = 1;

        for (let i = 1; i <= 5; i++) {
            accSum += i;
            accProd *= i;
            steps.push({
                lineNumber: 7, // Loop body line
                functionName: 'calculate_series_sum',
                variables: [
                    { name: 'n', type: 'int', value: '10', changed: false },
                    { name: 'i', type: 'int', value: String(i), changed: true },
                    { name: 'total_sum', type: 'int', value: String(accSum), changed: true },
                    { name: 'total_prod', type: 'int', value: String(accProd), changed: true }
                ]
            });
        }

        // Return statement step
        steps.push({
            lineNumber: 11,
            functionName: 'calculate_series_sum',
            variables: [
                { name: 'n', type: 'int', value: '10', changed: false },
                { name: 'total_sum', type: 'int', value: String(accSum), changed: false },
                { name: 'total_prod', type: 'int', value: String(accProd), changed: false },
                { name: 'return_value', type: 'tuple', value: `(${accSum}, ${accProd})`, changed: true }
            ]
        });

        return steps;
    };

    const steps = getExecutionSteps();
    const activeStep = steps[currentStepIndex] || steps[0];

    // Highlight current line in Monaco editor
    useEffect(() => {
        if (!isOpen || !editorRef?.current || !activeStep) return;
        const editor = editorRef.current;
        const line = activeStep.lineNumber;

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
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex((prev) => prev + 1);
            toast('Step Over (F10)', { icon: '⏭️', duration: 1000 });
        } else {
            toast.success('Program execution completed!', { icon: '🏁' });
        }
    };

    const handleContinue = () => {
        setCurrentStepIndex(steps.length - 1);
        toast.success('Continued to end of execution!', { icon: '▶' });
    };

    const handleReset = () => {
        setCurrentStepIndex(0);
        toast('Debugger reset to entry point', { icon: '🔄' });
    };

    const evaluateWatch = (expr) => {
        const vars = activeStep?.variables || [];
        const varMap = Object.fromEntries(vars.map((v) => [v.name, Number(v.value) || v.value]));

        try {
            if (expr.includes('>')) {
                const [left, right] = expr.split('>').map((s) => s.trim());
                const lVal = varMap[left] !== undefined ? varMap[left] : Number(left);
                const rVal = varMap[right] !== undefined ? varMap[right] : Number(right);
                return lVal > rVal ? 'True' : 'False';
            }
            if (expr.includes('-')) {
                const [left, right] = expr.split('-').map((s) => s.trim());
                const lVal = varMap[left] !== undefined ? varMap[left] : Number(left);
                const rVal = varMap[right] !== undefined ? varMap[right] : Number(right);
                return String(lVal - rVal);
            }
            if (varMap[expr] !== undefined) return String(varMap[expr]);
            return 'True';
        } catch (_) {
            return 'undefined';
        }
    };

    const handleAddWatch = (e) => {
        if (e) e.preventDefault();
        if (!newWatchText.trim()) return;
        setWatchExpressions((prev) => [...prev, { id: `w_${Date.now()}`, expr: newWatchText.trim() }]);
        setNewWatchText('');
        setShowAddWatch(false);
    };

    const handleRemoveWatch = (id) => {
        setWatchExpressions((prev) => prev.filter((w) => w.id !== id));
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
                        Debugger & Variable Watcher
                    </span>
                    <span className="bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border border-sky-300 dark:border-sky-800">
                        Line {activeStep?.lineNumber || 1}
                    </span>
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

            {/* Stepping Controls Toolbar */}
            <div className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
                isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
            }`}>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={handleStepOver}
                        disabled={currentStepIndex >= steps.length - 1}
                        className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-40 flex items-center gap-1 cursor-pointer shadow-xs"
                        title="Step Over to next statement (F10)"
                    >
                        <span>⏭ Step Over</span>
                    </button>
                    <button
                        onClick={handleContinue}
                        disabled={currentStepIndex >= steps.length - 1}
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
                </div>

                <div className="text-[11px] font-mono text-slate-500">
                    Step {currentStepIndex + 1} of {steps.length}
                </div>
            </div>

            {/* Body (Collapsible when Minimized) */}
            {!isMinimized && (
                <div className="p-3.5 space-y-3 max-h-[360px] overflow-y-auto">
                    {/* Live Scope Variables Table */}
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                            <span>In-Scope Local Variables:</span>
                            <span className="font-mono text-[9px] text-sky-600 dark:text-sky-400">{activeStep?.functionName || 'global'}</span>
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
                                    {(activeStep?.variables || []).map((v) => (
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
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Watch Expressions */}
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
                                    placeholder="e.g. total_sum > 10"
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
                            {watchExpressions.map((w) => (
                                <div
                                    key={w.id}
                                    className={`px-2.5 py-1 rounded-lg border flex items-center justify-between text-xs font-mono ${
                                        isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                                    }`}
                                >
                                    <span className="text-slate-700 dark:text-slate-300">{w.expr}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px]">
                                            {evaluateWatch(w.expr)}
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
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className={`px-4 py-2 border-t text-[10px] font-mono text-slate-400 flex items-center justify-between ${
                isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
                <span>F10: Step Over • F5: Continue</span>
                <span>Draggable Overlay</span>
            </div>
        </div>
    );
}
