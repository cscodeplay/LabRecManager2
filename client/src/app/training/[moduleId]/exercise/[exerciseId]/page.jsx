'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { trainingAPI } from '@/lib/api';
import { 
    Play, CheckCircle2, XCircle, ArrowLeft, Lightbulb, Beaker, 
    Plus, Trash2, RotateCcw, ListOrdered, FileText, Sparkles 
} from 'lucide-react';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';

// Helper to detect input() occurrences and prompts in Python code
function parseInputOccurrences(codeText) {
    if (!codeText) return [{ index: 1, prompt: '' }];
    const regex = /input\s*\(\s*(?:(['"`])([\s\S]*?)\1)?\s*\)/g;
    const occurrences = [];
    let match;
    let idx = 1;
    while ((match = regex.exec(codeText)) !== null) {
        const promptText = match[2] ? match[2].trim() : '';
        occurrences.push({
            index: idx,
            prompt: promptText
        });
        idx++;
    }
    if (occurrences.length === 0) {
        occurrences.push({ index: 1, prompt: '' });
    }
    return occurrences;
}

export default function ExerciseEditorPage() {
    const { moduleId, exerciseId } = useParams();
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    
    const [exercise, setExercise] = useState(null);
    const [code, setCode] = useState('');
    const [output, setOutput] = useState('');
    const [inputMode, setInputMode] = useState('occurrence'); // 'occurrence' | 'raw'
    const [occurrenceInputs, setOccurrenceInputs] = useState(['']);
    const [customInput, setCustomInput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [testResults, setTestResults] = useState(null);
    const [socraticReview, setSocraticReview] = useState(null);
    const [showHint, setShowHint] = useState(false);

    // Auto-detect input() statements in current code
    const detectedPrompts = useMemo(() => {
        return parseInputOccurrences(code);
    }, [code]);

    // Ensure occurrence inputs array has at least as many fields as detected input() statements
    useEffect(() => {
        setOccurrenceInputs(prev => {
            const neededLength = Math.max(detectedPrompts.length, 1);
            if (prev.length < neededLength) {
                const updated = [...prev];
                while (updated.length < neededLength) {
                    updated.push('');
                }
                return updated;
            }
            return prev;
        });
    }, [detectedPrompts]);

    // Keep customInput (joined string) in sync with occurrenceInputs
    const syncToCustomInput = useCallback((inputsArray) => {
        const joined = inputsArray.join('\n');
        setCustomInput(joined);
    }, []);

    const handleOccurrenceChange = (index, value) => {
        setOccurrenceInputs(prev => {
            const next = [...prev];
            next[index] = value;
            syncToCustomInput(next);
            return next;
        });
    };

    const handleAddOccurrence = () => {
        setOccurrenceInputs(prev => {
            const next = [...prev, ''];
            syncToCustomInput(next);
            return next;
        });
    };

    const handleRemoveOccurrence = (index) => {
        if (occurrenceInputs.length <= 1) {
            handleOccurrenceChange(0, '');
            return;
        }
        setOccurrenceInputs(prev => {
            const next = prev.filter((_, i) => i !== index);
            syncToCustomInput(next);
            return next;
        });
    };

    const handleRawInputChange = (value) => {
        setCustomInput(value);
        const lines = value.split(/\r?\n/);
        setOccurrenceInputs(lines.length > 0 ? lines : ['']);
    };

    const handleLoadSampleInput = () => {
        if (exercise?.testCases && exercise.testCases.length > 0) {
            const firstCase = exercise.testCases[0];
            const sampleInput = typeof firstCase.input === 'string' ? firstCase.input : '';
            if (sampleInput) {
                const lines = sampleInput.split(/\r?\n/);
                setOccurrenceInputs(lines.length > 0 ? lines : ['']);
                setCustomInput(sampleInput);
                toast.success('Loaded sample inputs from Test Case 1');
            } else {
                toast('Test Case 1 requires no standard input');
            }
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        
        const fetchExercise = async () => {
            try {
                const res = await trainingAPI.getExercise(exerciseId);
                const ex = res.data.data.exercise;
                setExercise(ex);
                const initialCode = ex.starterCode || '# Write your code here\n';
                setCode(initialCode);

                // Initialize sample inputs from first test case if available
                if (ex.testCases && ex.testCases.length > 0 && ex.testCases[0].input) {
                    const sample = String(ex.testCases[0].input);
                    const lines = sample.split(/\r?\n/);
                    setOccurrenceInputs(lines.length > 0 ? lines : ['']);
                    setCustomInput(sample);
                }
            } catch (err) {
                toast.error('Failed to load exercise');
                router.push(`/training/${moduleId}`);
            }
        };

        fetchExercise();
    }, [exerciseId, isAuthenticated, moduleId, router]);

    const handleRun = async () => {
        setIsRunning(true);
        setOutput('Running...');
        
        // Visual bypass for HTML
        if (exercise?.unit?.module?.language === 'html') {
            setOutput(code);
            setTestResults(null);
            setSocraticReview(null);
            setIsRunning(false);
            return;
        }

        const effectiveInput = occurrenceInputs.join('\n');

        try {
            const res = await trainingAPI.runCode(exerciseId, { code, customInput: effectiveInput });
            setOutput(res.data.data.output || 'Done (no output)');
            setTestResults(null); 
            setSocraticReview(null);
        } catch (err) {
            setOutput(`Execution Error:\n${err.response?.data?.error || err.message || 'Server Sandbox Error'}`);
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setOutput('Evaluating against automated test cases...');
        try {
            const res = await trainingAPI.submitCode(exerciseId, { code });
            const data = res.data.data;
            
            setTestResults(data.results);
            setSocraticReview(data.socraticReview);
            
            if (data.status === 'passed') {
                toast.success('All test cases passed! Mastery updated!');
            } else {
                toast.error('Some test cases failed. Review test suite below.');
            }
            
            setOutput('');
        } catch (err) {
            toast.error('Submission failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!exercise) return <div className="p-8 text-center text-slate-500">Loading editor...</div>;

    return (
        <div className="h-screen flex flex-col bg-slate-900 border-t-4 border-indigo-500">
            {/* Top Navigation */}
            <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
                <div className="flex items-center gap-4 text-white">
                    <button onClick={() => router.push(`/training/${moduleId}`)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="font-semibold text-sm md:text-base truncate max-w-md">{exercise.title}</h1>
                    <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 capitalize shrink-0">
                        {exercise.scaffoldLevel.replace('_', ' ')}
                    </span>
                    <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded font-semibold shrink-0">
                        +{exercise.xpReward || 10} XP
                    </span>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleRun} 
                        disabled={isRunning || isSubmitting}
                        className="btn bg-slate-700 hover:bg-slate-600 text-white border-none py-1.5 px-4 text-xs font-semibold flex items-center gap-1.5 rounded-lg transition"
                        title="Execute code using custom occurrence inputs"
                    >
                        {isRunning ? 'Running...' : <><Play className="w-4 h-4 text-emerald-400" /> Run</>}
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={isRunning || isSubmitting}
                        className="btn bg-indigo-600 hover:bg-indigo-500 text-white border-none py-1.5 px-6 font-bold text-xs flex items-center gap-1.5 rounded-lg shadow-lg shadow-indigo-600/20 transition"
                        title="Submit code for automated grading and XP rewards"
                    >
                        {isSubmitting ? 'Evaluating...' : 'Submit Code'}
                    </button>
                </div>
            </div>

            {/* Main Split Layout */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Left Panel: Problem Statement, Step-by-Step STDIN & Results */}
                <div className="w-5/12 bg-slate-800/95 border-r border-slate-700 flex flex-col overflow-y-auto">
                    
                    {/* Problem Description */}
                    <div className="p-5 text-slate-200">
                        {exercise.description.includes('## 📖 Learning Content') ? (
                            <>
                                <h2 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                                    📖 Learning Content
                                </h2>
                                <div className="prose prose-invert prose-xs leading-relaxed whitespace-pre-wrap bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4 text-xs">
                                    {exercise.description.split('---')[0].replace('## 📖 Learning Content', '').trim()}
                                </div>
                                <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                                    🎯 Problem Statement
                                </h2>
                                <div className="prose prose-invert prose-xs leading-relaxed whitespace-pre-wrap text-xs">
                                    {exercise.description.split('## 🎯 Problem Statement')[1]?.trim() || ''}
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="text-sm font-bold text-white mb-3">Problem Statement</h2>
                                <div className="prose prose-invert prose-xs leading-relaxed whitespace-pre-wrap text-xs text-slate-300">
                                    {exercise.description}
                                </div>
                            </>
                        )}

                        {/* Hints system */}
                        {exercise.hints && exercise.hints.length > 0 && (
                            <div className="mt-4">
                                <button 
                                    onClick={() => setShowHint(!showHint)}
                                    className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-xs font-semibold transition"
                                >
                                    <Lightbulb className="w-3.5 h-3.5" /> 
                                    {showHint ? 'Hide Socratic Hint' : 'Stuck? Show Socratic Hint'}
                                </button>
                                {showHint && (
                                    <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200 text-xs space-y-1">
                                        {exercise.hints.map((h, hIdx) => (
                                            <p key={hIdx}>💡 {h}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Step-by-Step STDIN (Occurrence-Based) Section */}
                    <div className="p-5 border-t border-slate-700 bg-slate-900/80 space-y-3.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                    <Beaker className="w-3.5 h-3.5 text-indigo-400" /> Standard Input (STDIN)
                                </h3>
                            </div>
                            
                            {/* Mode Switcher Tabs */}
                            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px]">
                                <button
                                    type="button"
                                    onClick={() => setInputMode('occurrence')}
                                    className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition ${inputMode === 'occurrence' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                                    title="Enter input for each input() call in order of occurrence"
                                >
                                    <ListOrdered className="w-3 h-3" /> By Occurrence
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInputMode('raw')}
                                    className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition ${inputMode === 'raw' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                                    title="Paste or edit multiline raw standard input"
                                >
                                    <FileText className="w-3 h-3" /> Raw Text
                                </button>
                            </div>
                        </div>

                        {/* Occurrence-Based Input Fields */}
                        {inputMode === 'occurrence' ? (
                            <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                                    <span className="flex items-center gap-1">
                                        <span>Each field feeds into each <code className="text-indigo-400">input()</code> sequentially:</span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleLoadSampleInput}
                                        className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition"
                                        title="Load sample values from Test Case 1"
                                    >
                                        <Sparkles className="w-3 h-3" /> Load Sample
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {occurrenceInputs.map((val, idx) => {
                                        const promptInfo = detectedPrompts[idx] || null;
                                        const labelText = promptInfo?.prompt 
                                            ? `Input #${idx + 1} ("${promptInfo.prompt}")`
                                            : `Input #${idx + 1} (${idx === 0 ? '1st' : idx === 1 ? '2nd' : idx === 2 ? '3rd' : `${idx + 1}th`} input())`;

                                        return (
                                            <div key={idx} className="flex items-center gap-2">
                                                <div className="flex-1 flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition">
                                                    <span className="px-2.5 py-2 text-[11px] font-mono text-indigo-300 bg-indigo-950/40 border-r border-slate-700/80 shrink-0 select-none">
                                                        {idx + 1}
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={val}
                                                        onChange={(e) => handleOccurrenceChange(idx, e.target.value)}
                                                        placeholder={labelText}
                                                        className="w-full bg-transparent px-3 py-1.5 text-xs font-mono text-slate-100 placeholder:text-slate-500 outline-none"
                                                    />
                                                </div>
                                                {occurrenceInputs.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveOccurrence(idx)}
                                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition shrink-0"
                                                        title="Remove this input occurrence"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="pt-2 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={handleAddOccurrence}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Input for Next input()
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOccurrenceInputs(['']);
                                            syncToCustomInput(['']);
                                        }}
                                        className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Clear
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Raw Multiline Textarea Mode */
                            <div>
                                <textarea 
                                    value={customInput}
                                    onChange={(e) => handleRawInputChange(e.target.value)}
                                    placeholder="Enter line-by-line input values...&#10;Line 1 -> 1st input()&#10;Line 2 -> 2nd input()"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 font-mono focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-y min-h-[90px] placeholder:text-slate-500"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    Each line corresponds to one <code className="text-indigo-400">input()</code> statement.
                                </span>
                            </div>
                        )}

                        {/* Console Output from Manual Run */}
                        {output && (
                            <div className="space-y-1.5 pt-2">
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Beaker className="w-3.5 h-3.5 text-emerald-400"/> Execution Output
                                </h3>
                                <div className="font-mono text-xs text-slate-200 bg-black/60 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                                    <pre className="p-3.5 overflow-x-auto whitespace-pre-wrap text-emerald-300 max-h-52 leading-relaxed">
                                        {output}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Automated Submission Test Cases */}
                        {testResults && (
                            <div className="space-y-3 pt-3">
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400"/> Automated Test Suite
                                </h3>
                                <div className="space-y-2">
                                    {testResults.map((tr, i) => (
                                        <div key={i} className={`p-3 rounded-xl border ${tr.passed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                {tr.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400"/> : <XCircle className="w-4 h-4 text-red-400"/>}
                                                <span className="font-bold text-xs text-white">Test Case {i + 1}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-auto ${tr.passed ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/30' : 'bg-red-900/60 text-red-300 border border-red-500/30'}`}>
                                                    {tr.passed ? 'PASSED' : 'FAILED'}
                                                </span>
                                                {tr.input === 'Hidden' && <span className="text-[10px] text-slate-400 uppercase bg-slate-800 px-2 py-0.5 rounded-md font-semibold">Hidden</span>}
                                            </div>
                                            {!tr.passed && tr.input !== 'Hidden' && (
                                                <div className="mt-2 text-[11px] font-mono space-y-1 bg-black/50 p-2.5 rounded-lg border border-red-500/20">
                                                    <div><span className="text-slate-400">Input:</span> <span className="text-emerald-300 whitespace-pre-wrap">{tr.input}</span></div>
                                                    <div><span className="text-slate-400">Expected:</span> <span className="text-blue-300 whitespace-pre-wrap">{tr.expected}</span></div>
                                                    <div><span className="text-slate-400">Actual:</span> <span className="text-red-300 whitespace-pre-wrap">{tr.actual}</span></div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Socratic AI Review */}
                        {socraticReview && (
                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl space-y-1">
                                <h4 className="flex items-center gap-2 font-bold text-xs text-indigo-300">
                                    🤖 Socratic AI Reviewer
                                </h4>
                                <p className="text-xs text-indigo-100 leading-relaxed whitespace-pre-wrap">
                                    {socraticReview}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Monaco Editor */}
                <div className="w-7/12 h-full pt-2 bg-slate-950 flex flex-col">
                    <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                        <span className="font-mono text-indigo-400">solution.py</span>
                        <span>Python 3.11 Runtime</span>
                    </div>
                    <div className="flex-1">
                        <Editor
                            height="100%"
                            language={exercise?.unit?.module?.language || 'python'}
                            theme="vs-dark"
                            value={code}
                            onChange={(val) => setCode(val || '')}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                lineHeight: 24,
                                fontFamily: 'JetBrains Mono, monospace',
                                scrollbar: { vertical: 'auto' },
                                padding: { top: 16 }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
