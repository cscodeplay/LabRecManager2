'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { trainingAPI } from '@/lib/api';
import { Play, CheckCircle2, XCircle, ArrowLeft, Lightbulb, Beaker } from 'lucide-react';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';

export default function ExerciseEditorPage() {
    const { moduleId, exerciseId } = useParams();
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    
    const [exercise, setExercise] = useState(null);
    const [code, setCode] = useState('');
    const [output, setOutput] = useState('');
    const [customInput, setCustomInput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [testResults, setTestResults] = useState(null);
    const [socraticReview, setSocraticReview] = useState(null);
    const [showHint, setShowHint] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) return;
        
        const fetchExercise = async () => {
            try {
                const res = await trainingAPI.getExercise(exerciseId);
                const ex = res.data.data.exercise;
                setExercise(ex);
                setCode(ex.starterCode || '# Write your code here\n');
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
            setOutput(code); // For HTML, the code IS the output
            setTestResults(null);
            setSocraticReview(null);
            setIsRunning(false);
            return;
        }

        try {
            const res = await trainingAPI.runCode(exerciseId, { code, customInput });
            setOutput(res.data.data.output || 'Done (no output)');
            setTestResults(null); 
            setSocraticReview(null);
        } catch (err) {
            setOutput(`Compilation Error:\n${err.response?.data?.error || err.message || 'Server Sandbox Error'}`);
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setOutput('Evaluating against test cases...');
        try {
            const res = await trainingAPI.submitCode(exerciseId, { code });
            const data = res.data.data;
            
            setTestResults(data.results);
            setSocraticReview(data.socraticReview);
            
            if (data.status === 'passed') {
                toast.success('All test cases passed! Mastery updated!');
            } else {
                toast.error('Some test cases failed. See AI review.');
            }
            
            setOutput(''); // Clear manual runner output
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
                    <button onClick={() => router.push(`/training/${moduleId}`)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-300">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="font-semibold">{exercise.title}</h1>
                    <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 capitalize">
                        {exercise.scaffoldLevel.replace('_', ' ')}
                    </span>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleRun} 
                        disabled={isRunning || isSubmitting}
                        className="btn bg-slate-700 hover:bg-slate-600 text-white border-none py-1.5 px-4"
                    >
                        {isRunning ? 'Running...' : <><Play className="w-4 h-4 text-emerald-400" /> Run</>}
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={isRunning || isSubmitting}
                        className="btn bg-indigo-600 hover:bg-indigo-500 text-white border-none py-1.5 px-6 font-bold"
                    >
                        {isSubmitting ? 'Evaluating...' : 'Submit Code'}
                    </button>
                </div>
            </div>

            {/* Main Split Layout */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Left Panel: Problem Statement & Results */}
                <div className="w-1/3 bg-slate-800 border-r border-slate-700 flex flex-col overflow-y-auto">
                    
                    {/* Problem Description with Learning Content */}
                    <div className="p-6 text-slate-200">
                        {exercise.description.includes('## 📖 Learning Content') ? (
                            <>
                                {/* Learning Content Section */}
                                <h2 className="text-lg font-bold text-emerald-400 mb-3 flex items-center gap-2">
                                    📖 Learning Content
                                </h2>
                                <div className="prose prose-invert prose-sm leading-relaxed whitespace-pre-wrap bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-6">
                                    {exercise.description.split('---')[0].replace('## 📖 Learning Content', '').trim()}
                                </div>
                                {/* Problem Statement Section */}
                                <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                    🎯 Problem Statement
                                </h2>
                                <div className="prose prose-invert prose-sm leading-relaxed whitespace-pre-wrap">
                                    {exercise.description.split('## 🎯 Problem Statement')[1]?.trim() || ''}
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-white mb-4">Problem Statement</h2>
                                <div className="prose prose-invert prose-sm leading-relaxed whitespace-pre-wrap">
                                    {exercise.description}
                                </div>
                            </>
                        )}

                        {/* Hints system (AI Augmented) */}
                        {exercise.hints && exercise.hints.length > 0 && (
                            <div className="mt-6">
                                <button 
                                    onClick={() => setShowHint(!showHint)}
                                    className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm font-medium transition"
                                >
                                    <Lightbulb className="w-4 h-4" /> 
                                    {showHint ? 'Hide Hint' : 'Stuck? Show Hint'}
                                </button>
                                {showHint && (
                                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200 text-sm space-y-1.5">
                                        {exercise.hints.map((h, hIdx) => (
                                            <p key={hIdx}>• {h}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Interactive Input & Console Section */}
                    <div className="p-6 border-t border-slate-700 bg-slate-900/60 space-y-4">
                        {/* STDIN Custom Input Area - Always Accessible */}
                        {exercise?.unit?.module?.language !== 'html' && (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <span>STDIN (Custom Input)</span>
                                    </label>
                                    <span className="text-[10px] text-slate-400">Tested when clicking "Run"</span>
                                </div>
                                <textarea 
                                    value={customInput}
                                    onChange={(e) => setCustomInput(e.target.value)}
                                    placeholder="Enter custom input values (e.g. 5&#10;10&#10;Apple)..."
                                    className="w-full bg-slate-800/80 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-y min-h-[65px] placeholder:text-slate-500"
                                />
                            </div>
                        )}

                        {/* Console Output from Manual Run */}
                        {output && (
                            <div className="space-y-1.5">
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Beaker className="w-3.5 h-3.5 text-emerald-400"/> Terminal Output
                                </h3>
                                <div className="font-mono text-xs text-slate-300 bg-black/50 border border-slate-800 rounded-lg overflow-hidden">
                                    {exercise?.unit?.module?.language === 'html' ? (
                                        <iframe 
                                            srcDoc={output}
                                            sandbox="allow-scripts"
                                            className="w-full h-64 bg-white"
                                            title="HTML Output"
                                        />
                                    ) : (
                                        <pre className="p-3 overflow-x-auto whitespace-pre-wrap text-emerald-300 max-h-48">
                                            {output}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Automated Submission Test Cases */}
                        {testResults && (
                            <div className="space-y-3 pt-2">
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400"/> Test Suite Evaluation
                                </h3>
                                <div className="space-y-2.5">
                                    {testResults.map((tr, i) => (
                                        <div key={i} className={`p-3 rounded-lg border ${tr.passed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                {tr.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400"/> : <XCircle className="w-4 h-4 text-red-400"/>}
                                                <span className="font-bold text-xs text-white">Test Case {i + 1}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ml-auto ${tr.passed ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'}`}>
                                                    {tr.passed ? 'PASSED' : 'FAILED'}
                                                </span>
                                                {tr.input === 'Hidden' && <span className="text-[10px] text-slate-400 uppercase bg-slate-800 px-1.5 py-0.5 rounded">Hidden</span>}
                                            </div>
                                            {!tr.passed && tr.input !== 'Hidden' && (
                                                <div className="mt-2 text-[11px] font-mono space-y-1 bg-black/40 p-2 rounded border border-red-500/20">
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
                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                                <h4 className="flex items-center gap-2 font-bold text-xs text-indigo-300 mb-1.5">
                                    🤖 Socratic AI Tutor
                                </h4>
                                <p className="text-xs text-indigo-100 leading-relaxed whitespace-pre-wrap">
                                    {socraticReview}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Monaco Editor */}
                <div className="w-2/3 h-full pt-4">
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
    );
}
