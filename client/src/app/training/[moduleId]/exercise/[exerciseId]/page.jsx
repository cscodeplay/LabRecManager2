'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { trainingAPI } from '@/lib/api';
import { 
    Play, CheckCircle2, XCircle, ArrowLeft, Lightbulb, Beaker, 
    Plus, Trash2, RotateCcw, ListOrdered, FileText, Sparkles,
    CheckSquare, HelpCircle, Code2, BookOpen, AlertTriangle, Send, Award,
    PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2, Flame, RefreshCw, 
    Check, Undo2, Lock, CheckCircle, ArrowRight, X, Compass, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import MathRenderer from '@/components/MathRenderer';
import CodeEditorWithConfig from '@/components/CodeEditorWithConfig';

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
    const { isAuthenticated, user } = useAuthStore();
    
    // Module & Exercise state
    const [moduleData, setModuleData] = useState(null);
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
    
    // Gamification & Progress state
    const [xpEarned, setXpEarned] = useState(0);
    const [totalXP, setTotalXP] = useState(0);
    const [streak, setStreak] = useState(1);
    const [nextExerciseId, setNextExerciseId] = useState(null);
    const [advanceCountdown, setAdvanceCountdown] = useState(null);
    const [isUnitMastered, setIsUnitMastered] = useState(false);

    // UX Enhancements state
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSocraticDrawer, setShowSocraticDrawer] = useState(false);
    const [socraticLoading, setSocraticLoading] = useState(false);
    const [socraticAdvice, setSocraticAdvice] = useState(null);

    // Multi-modal state variables
    const [selectedMcqOption, setSelectedMcqOption] = useState(null);
    const [blankAnswers, setBlankAnswers] = useState([]);
    const [scenarioAnswers, setScenarioAnswers] = useState({});
    const [traceRows, setTraceRows] = useState([]);
    const [flaggedLine, setFlaggedLine] = useState(null);
    const [submittedData, setSubmittedData] = useState(null);

    const exerciseType = exercise?.exerciseType || 'coding';

    // Auto-detect input() statements in current code
    const detectedPrompts = useMemo(() => {
        return parseInputOccurrences(code);
    }, [code]);

    // Fullscreen change listener
    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    // Auto-advance countdown timer
    useEffect(() => {
        if (advanceCountdown === null) return;
        if (advanceCountdown > 0) {
            const timer = setTimeout(() => {
                setAdvanceCountdown(c => (c !== null && c > 0 ? c - 1 : null));
            }, 1000);
            return () => clearTimeout(timer);
        } else if (advanceCountdown === 0) {
            if (nextExerciseId) {
                setAdvanceCountdown(null);
                router.push(`/training/${moduleId}/exercise/${nextExerciseId}`);
            }
        }
    }, [advanceCountdown, nextExerciseId, moduleId, router]);

    // Auto-save code draft
    useEffect(() => {
        if (!exerciseId || !code) return;
        try {
            localStorage.setItem(`training_draft_${exerciseId}`, code);
        } catch {}
    }, [code, exerciseId]);

    // Ensure occurrence inputs array has at least as many fields as detected input() statements
    useEffect(() => {
        if (exerciseType === 'coding' || exerciseType === 'bug_fix') {
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
        }
    }, [detectedPrompts, exerciseType]);

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
        if (exercise?.testCases && Array.isArray(exercise.testCases) && exercise.testCases.length > 0) {
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

    const handleResetCode = () => {
        if (!exercise) return;
        const debugCode = exercise.exerciseType === 'code_debug' ? (exercise.testCases?.buggyCode || exercise.starterCode) : null;
        const initialCode = debugCode || exercise.starterCode || '# Write your code here\n';
        setCode(initialCode);
        try {
            localStorage.removeItem(`training_draft_${exerciseId}`);
        } catch {}
        toast.success('Reset to starter code template');
    };

    // Load exercise and parent module details
    useEffect(() => {
        if (!isAuthenticated) return;
        
        const fetchExerciseAndModule = async () => {
            try {
                const [exRes, modRes] = await Promise.all([
                    trainingAPI.getExercise(exerciseId),
                    trainingAPI.getModuleDetails(moduleId).catch(() => null)
                ]);

                const ex = exRes.data.data.exercise;
                const latestSub = exRes.data.data.latestSubmission;
                setExercise(ex);

                // Restore draft if present
                const savedDraft = localStorage.getItem(`training_draft_${exerciseId}`);
                const debugCode = ex.exerciseType === 'code_debug' ? (ex.testCases?.buggyCode || ex.starterCode) : null;
                const initialCode = savedDraft || 
                    (latestSub?.code && (ex.exerciseType === 'coding' || ex.exerciseType === 'bug_fix' || ex.exerciseType === 'code_debug') ? latestSub.code : null) || 
                    debugCode || 
                    ex.starterCode || 
                    '# Write your code here\n';
                setCode(initialCode);

                if (modRes?.data?.data?.module) {
                    const mod = modRes.data.data.module;
                    setModuleData(mod);
                    if (mod.studentProgress) {
                        setTotalXP(mod.studentProgress.totalXP || 0);
                        setStreak(mod.studentProgress.streak || 1);
                    }
                }

                const exType = ex.exerciseType || 'coding';

                // Restore latest submission data (scores, answers, test results, Socratic review)
                if (latestSub) {
                    setSubmittedData({
                        status: latestSub.status,
                        results: latestSub.testResults,
                        socraticReview: latestSub.aiSocraticReview
                    });
                    setTestResults(latestSub.testResults);
                    setSocraticReview(latestSub.aiSocraticReview);

                    if (exType === 'mcq' && latestSub.code) {
                        try {
                            const parsed = typeof latestSub.code === 'string' ? JSON.parse(latestSub.code) : latestSub.code;
                            if (parsed.selectedOption !== undefined && parsed.selectedOption !== null) {
                                setSelectedMcqOption(Number(parsed.selectedOption));
                            }
                        } catch {}
                    } else if (exType === 'fill_blank' && latestSub.code) {
                        try {
                            const parsed = typeof latestSub.code === 'string' ? JSON.parse(latestSub.code) : latestSub.code;
                            if (Array.isArray(parsed.answers)) {
                                setBlankAnswers(parsed.answers);
                            }
                        } catch {}
                    } else if (exType === 'case_study' && latestSub.code) {
                        try {
                            const parsed = typeof latestSub.code === 'string' ? JSON.parse(latestSub.code) : latestSub.code;
                            if (parsed.responses) {
                                setScenarioAnswers(parsed.responses);
                            }
                        } catch {}
                    }
                }

                // Initialize empty defaults if not restored from submission
                if (exType === 'fill_blank' && (!latestSub || !latestSub.code) && ex.testCases?.blanks) {
                    setBlankAnswers(new Array(ex.testCases.blanks.length).fill(''));
                } else if (exType === 'case_study' && (!latestSub || !latestSub.code) && ex.testCases?.questions) {
                    const initMap = {};
                    ex.testCases.questions.forEach(q => { initMap[q.id] = null; });
                    setScenarioAnswers(initMap);
                } else if ((exType === 'coding' || exType === 'bug_fix') && Array.isArray(ex.testCases) && ex.testCases.length > 0 && ex.testCases[0].input) {
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

        fetchExerciseAndModule();
    }, [exerciseId, isAuthenticated, moduleId, router]);

    const handleAskSocraticTutor = async () => {
        setShowSocraticDrawer(true);
        if (socraticAdvice) return;

        setSocraticLoading(true);
        try {
            const res = await trainingAPI.aiAssist({
                action: 'socratic_hint',
                payload: {
                    problemTitle: exercise?.title || '',
                    problemDescription: exercise?.description || '',
                    studentCode: code,
                    currentOutput: output,
                    failedTests: testResults ? testResults.filter(t => !t.passed) : []
                }
            });
            if (res.data?.success && res.data?.data) {
                setSocraticAdvice(res.data.data);
            }
        } catch (err) {
            console.error('Socratic Tutor error:', err);
            toast.error('AI Socratic Tutor unavailable at the moment');
        } finally {
            setSocraticLoading(false);
        }
    };

    const handleRun = async () => {
        setIsRunning(true);
        setOutput('Running in sandbox...');
        
        if (exercise?.unit?.module?.language === 'html') {
            setOutput(code);
            setTestResults(null);
            setSocraticReview(null);
            setIsRunning(false);
            return;
        }

        const joinedInput = occurrenceInputs.join('\n');
        const effectiveInput = joinedInput.trim() ? joinedInput : (exercise?.testCases?.[0]?.input || '');

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
        setOutput('Evaluating submission...');
        
        try {
            const payload = {
                code,
                selectedOption: selectedMcqOption,
                blankAnswers,
                scenarioAnswers,
                traceRows,
                flaggedLine
            };

            const res = await trainingAPI.submitCode(exerciseId, payload);
            const data = res.data.data;
            
            setTestResults(data.results);
            setSocraticReview(data.socraticReview);
            setSubmittedData(data);
            setXpEarned(data.xpEarned || 0);

            if (data.totalXP != null) {
                setTotalXP(data.totalXP);
            }
            if (data.nextExerciseId) {
                setNextExerciseId(data.nextExerciseId);
            }
            if (data.isUnitMastered) {
                setIsUnitMastered(true);
            }

            // Instantly update moduleData exercise status for curriculum drawer
            setModuleData(prev => {
                if (!prev) return prev;
                const updatedUnits = prev.units?.map(u => ({
                    ...u,
                    exercises: u.exercises?.map(e => e.id === exerciseId ? { ...e, userStatus: data.status } : e)
                }));
                return { ...prev, units: updatedUnits };
            });
            
            if (data.status === 'passed') {
                toast.success(`🎉 Excellent! +${data.xpEarned || exercise.xpReward || 10} XP earned!`);
                // Trigger auto-advance countdown if next exercise exists
                if (data.nextExerciseId) {
                    setAdvanceCountdown(3);
                }
            } else {
                toast.error('Submission review needed. Check details below.');
                setAdvanceCountdown(null);
            }
            
            setOutput('');
        } catch (err) {
            toast.error('Submission failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getTypeBadge = () => {
        switch (exerciseType) {
            case 'mcq':
                return <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-semibold flex items-center gap-1"><CheckSquare className="w-3 h-3"/> Output MCQ</span>;
            case 'fill_blank':
                return <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-semibold flex items-center gap-1"><FileText className="w-3 h-3"/> Syntax Cloze</span>;
            case 'case_study':
                return <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-semibold flex items-center gap-1"><BookOpen className="w-3 h-3"/> MNC Case Study</span>;
            case 'bug_fix':
                return <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> PR Bug Hunt</span>;
            case 'assertion_reason':
                return <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-semibold flex items-center gap-1"><Compass className="w-3 h-3"/> Assertion-Reason</span>;
            case 'code_trace':
                return <span className="text-xs bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded font-semibold flex items-center gap-1"><ListOrdered className="w-3 h-3"/> Dry-Run Trace</span>;
            case 'code_debug':
                return <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> CBSE Error Debug</span>;
            default:
                return <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold flex items-center gap-1"><Code2 className="w-3 h-3"/> Coding Lab</span>;
        }
    };

    if (!exercise) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-3">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Loading exercise...</span>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-slate-900 border-t-4 border-indigo-500 overflow-hidden">
            {/* Top Navigation Bar */}
            <div className="h-14 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 flex items-center justify-between px-3 md:px-4 z-40 shrink-0">
                
                {/* Left section: Drawer Toggle + Back + Title */}
                <div className="flex items-center gap-2.5 text-white min-w-0">
                    <button 
                        onClick={() => setIsNavOpen(prev => !prev)} 
                        className={`p-2 rounded-xl transition ${
                            isNavOpen 
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                                : 'hover:bg-slate-700 text-slate-300'
                        }`} 
                        title="Course Curriculum Navigator"
                    >
                        {isNavOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                    </button>

                    <button 
                        onClick={() => router.push(`/training/${moduleId}`)} 
                        className="p-2 hover:bg-slate-700 rounded-xl text-slate-300 transition" 
                        title="Back to Module Outline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2 min-w-0">
                        <h1 className="font-bold text-xs md:text-sm text-slate-100 truncate max-w-xs md:max-w-md">
                            {exercise?.title || 'Training Exercise'}
                        </h1>
                        {getTypeBadge()}
                    </div>
                </div>

                {/* Center / Right Gamification Stats: Live XP & Streak */}
                <div className="hidden lg:flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-sm">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        <span>{totalXP} XP</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold shadow-sm">
                        <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                        <span>{streak} Day Streak</span>
                    </div>

                    <span className="text-[11px] bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                        +{exercise?.xpReward || 10} XP Reward
                    </span>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Ask Socratic AI Tutor */}
                    <button
                        onClick={handleAskSocraticTutor}
                        className="btn bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5 rounded-xl transition"
                        title="Get Socratic Hints without spoiling the answer"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="hidden sm:inline">Ask AI Tutor</span>
                    </button>

                    {/* Unit Theory Reader */}
                    {exercise?.unitId && (
                        <button
                            onClick={() => router.push(`/training/${moduleId}/unit/${exercise.unitId}/theory`)}
                            className="btn bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 hover:text-white py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5 rounded-xl transition"
                            title="Read Pre-Lab Theory & Concept Notes"
                        >
                            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="hidden sm:inline">Unit Theory</span>
                        </button>
                    )}

                    {/* Reset Code */}
                    {(exerciseType === 'coding' || exerciseType === 'bug_fix') && (
                        <button
                            onClick={handleResetCode}
                            className="p-2 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl transition hidden sm:flex"
                            title="Reset Code to Starter Template"
                        >
                            <Undo2 className="w-4 h-4" />
                        </button>
                    )}

                    {/* Fullscreen Toggle */}
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl transition"
                        title={isFullscreen ? "Exit Fullscreen" : "Enter Distraction-Free Fullscreen"}
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>

                    {/* Run Code */}
                    {(exerciseType === 'coding' || exerciseType === 'bug_fix') && (
                        <button 
                            onClick={handleRun} 
                            disabled={isRunning || isSubmitting}
                            className="btn bg-slate-700 hover:bg-slate-600 text-white border-none py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5 rounded-xl transition"
                            title="Execute code with inputs"
                        >
                            {isRunning ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                            )}
                            <span className="hidden sm:inline">Run</span>
                        </button>
                    )}

                    {/* Submit Code */}
                    <button 
                        onClick={handleSubmit}
                        disabled={isRunning || isSubmitting}
                        className="btn bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white border-none py-1.5 px-4 font-bold text-xs flex items-center gap-1.5 rounded-xl shadow-lg shadow-indigo-600/30 transition"
                    >
                        {isSubmitting ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Evaluating...</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-3.5 h-3.5" />
                                <span>{exerciseType === 'coding' || exerciseType === 'bug_fix' ? 'Submit' : 'Submit Answers'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Stage with Collapsible Drawer Layout */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* Collapsible Course Curriculum Drawer */}
                {isNavOpen && (
                    <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col z-30 shrink-0 shadow-2xl animate-in slide-in-from-left duration-200">
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Compass className="w-4 h-4 text-indigo-400" />
                                <span className="font-bold text-xs uppercase tracking-wider text-slate-300">Curriculum Flow</span>
                            </div>
                            <button onClick={() => setIsNavOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-4">
                            {moduleData?.units?.map((unit, uIdx) => (
                                <div key={unit.id} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs px-2 py-1 font-bold text-slate-400">
                                        <span className="truncate">Unit {unit.unitNumber}: {unit.title}</span>
                                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                                            ≥{unit.unlockThreshold}%
                                        </span>
                                    </div>

                                    <div className="space-y-1">
                                        {unit.exercises?.map((exItem, exIdx) => {
                                            const isCurrent = exItem.id === exerciseId;
                                            const isPassed = exItem.userStatus === 'passed';
                                            const isFailed = exItem.userStatus === 'failed';
                                            const isUnvisited = !exItem.userStatus || exItem.userStatus === 'unvisited';

                                            let cardBg = 'bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:bg-slate-800';
                                            if (isCurrent) {
                                                cardBg = isPassed 
                                                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-md shadow-emerald-600/30'
                                                    : isFailed 
                                                    ? 'bg-amber-600 text-white ring-2 ring-amber-400 shadow-md shadow-amber-600/30'
                                                    : 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-md shadow-indigo-600/30';
                                            } else if (isPassed) {
                                                cardBg = 'bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-900/50 text-emerald-200';
                                            } else if (isFailed) {
                                                cardBg = 'bg-amber-950/40 border border-amber-500/40 hover:bg-amber-900/50 text-amber-200';
                                            } else if (isUnvisited) {
                                                cardBg = 'bg-rose-950/30 border border-rose-500/30 hover:bg-rose-900/40 text-rose-200';
                                            }

                                            return (
                                                <button
                                                    key={exItem.id}
                                                    onClick={() => {
                                                        router.push(`/training/${moduleId}/exercise/${exItem.id}`);
                                                        setIsNavOpen(false);
                                                    }}
                                                    className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between gap-2 ${cardBg}`}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                                            isCurrent 
                                                                ? 'bg-white/20 text-white' 
                                                                : isPassed 
                                                                ? 'bg-emerald-500/20 text-emerald-300' 
                                                                : isFailed 
                                                                ? 'bg-amber-500/20 text-amber-300' 
                                                                : 'bg-rose-500/20 text-rose-300'
                                                        }`}>
                                                            {isPassed ? <Check className="w-3 h-3 text-emerald-300" /> : isFailed ? <X className="w-3 h-3 text-amber-300" /> : exIdx + 1}
                                                        </span>
                                                        <span className="truncate">{exItem.title}</span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {isPassed && (
                                                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                                                                Passed
                                                            </span>
                                                        )}
                                                        {isFailed && (
                                                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">
                                                                Review
                                                            </span>
                                                        )}
                                                        {isUnvisited && (
                                                            <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Unvisited
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] opacity-75 font-mono">
                                                            +{exItem.xpReward || 10}XP
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            {/* ========================================================================= */}
            {/* 1. MCQ MODE RENDERER                                                      */}
            {/* ========================================================================= */}
            {exerciseType === 'mcq' && (
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Column: Problem & Code Snippet */}
                    <div className="w-5/12 bg-slate-800/95 border-r border-slate-700 p-6 overflow-y-auto space-y-4">
                        <div className="text-slate-200">
                            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <CheckSquare className="w-4 h-4" /> Code Tracing & Output Predictor
                            </h2>
                            <div className="prose prose-invert prose-xs text-slate-300 leading-relaxed">
                                <MathRenderer content={exercise.description} textClassName="text-slate-300" />
                            </div>
                        </div>

                        {exercise.testCases?.codeSnippet && (
                            <div className="space-y-1.5">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Target Code Snippet:</span>
                                <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 font-mono text-xs text-emerald-300 overflow-x-auto">
                                    <pre className="whitespace-pre-wrap">{exercise.testCases.codeSnippet}</pre>
                                </div>
                            </div>
                        )}

                        {/* Hints */}
                        {exercise.hints && exercise.hints.length > 0 && (
                            <div className="pt-2">
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
                                            <div key={hIdx} className="flex items-start gap-1.5">
                                                <span className="shrink-0">💡</span>
                                                <span className="flex-1"><MathRenderer content={h} inline /></span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Interactive Options & Immediate Evaluation */}
                    <div className="w-7/12 bg-slate-950 p-6 overflow-y-auto space-y-6">
                        <div>
                            <h3 className="text-sm font-bold text-white mb-4">
                                {exercise.testCases?.question || "Select the correct output / conclusion:"}
                            </h3>

                            <div className="space-y-3">
                                {(exercise.testCases?.options || []).map((opt, idx) => {
                                    const isSelected = (selectedMcqOption === idx);
                                    const result = testResults && testResults[0];
                                    const isCorrect = result && result.correctOption === idx;
                                    const isWrongPick = result && isSelected && !result.passed;

                                    let cardStyle = "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200";
                                    if (isSelected && !testResults) {
                                        cardStyle = "bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500 shadow-md shadow-indigo-500/10";
                                    } else if (result) {
                                        if (isCorrect) {
                                            cardStyle = "bg-emerald-950/60 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500";
                                        } else if (isWrongPick) {
                                            cardStyle = "bg-red-950/60 border-red-500 text-red-200 ring-1 ring-red-500";
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setSelectedMcqOption(idx)}
                                            className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 ${cardStyle}`}
                                        >
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                                                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                                            }`}>
                                                {String.fromCharCode(65 + idx)}
                                            </span>
                                            <span className="text-xs flex-1 leading-relaxed"><MathRenderer content={opt} inline /></span>
                                            {result && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                                            {result && isWrongPick && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Submit Action */}
                        {!testResults && (
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={selectedMcqOption === null || isSubmitting}
                                    className="btn bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-6 rounded-xl font-bold text-xs transition disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Evaluating...' : 'Confirm & Submit Answer'}
                                </button>
                            </div>
                        )}

                        {/* Feedback & Explanation Card */}
                        {testResults && (
                            <div className="space-y-4 pt-2">
                                <div className={`p-4 rounded-xl border ${testResults[0].passed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        {testResults[0].passed ? (
                                            <>
                                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                                <span className="font-bold text-emerald-300 text-sm">Correct! +{xpEarned} XP Earned</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-5 h-5 text-red-400" />
                                                <span className="font-bold text-red-300 text-sm">Incorrect Option</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-300 leading-relaxed font-sans mt-1">
                                        <strong className="text-white">Explanation:</strong>
                                        <MathRenderer content={testResults[0].explanation} textClassName="text-slate-300 mt-1" />
                                    </div>
                                </div>

                                {socraticReview && (
                                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                                        <h4 className="font-bold text-xs text-indigo-300 mb-1 flex items-center gap-1.5">
                                            🤖 Socratic Tutor
                                        </h4>
                                        <MathRenderer content={socraticReview} textClassName="text-indigo-100 text-xs" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 2. FILL-IN-THE-BLANKS (CLOZE) MODE RENDERER                                */}
            {/* ========================================================================= */}
            {exerciseType === 'fill_blank' && (
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Column: Problem & Rules */}
                    <div className="w-5/12 bg-slate-800/95 border-r border-slate-700 p-6 overflow-y-auto space-y-4">
                        <div className="text-slate-200">
                            <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <FileText className="w-4 h-4" /> Syntax & Logic Cloze
                            </h2>
                            <div className="prose prose-invert prose-xs text-slate-300 leading-relaxed">
                                <MathRenderer content={exercise.description} textClassName="text-slate-300" />
                            </div>
                        </div>

                        {exercise.hints && exercise.hints.length > 0 && (
                            <div className="pt-2">
                                <button 
                                    onClick={() => setShowHint(!showHint)}
                                    className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-xs font-semibold transition"
                                >
                                    <Lightbulb className="w-3.5 h-3.5" /> 
                                    {showHint ? 'Hide Socratic Hint' : 'Stuck? Show Socratic Hint'}
                                </button>
                                {showHint && (
                                    <div className="mt-2 p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-200 text-xs space-y-1">
                                        {exercise.hints.map((h, hIdx) => (
                                            <div key={hIdx} className="flex items-start gap-1.5">
                                                <span className="shrink-0">💡</span>
                                                <span className="flex-1"><MathRenderer content={h} inline /></span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Code Skeleton & Interactive Blanks */}
                    <div className="w-7/12 bg-slate-950 p-6 overflow-y-auto space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <span>Complete the Missing Code Statements</span>
                            </h3>

                            {/* Code Template Preview */}
                            {exercise.testCases?.codeTemplate && (
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-cyan-300 leading-loose overflow-x-auto mb-4">
                                    <pre className="whitespace-pre-wrap">{exercise.testCases.codeTemplate}</pre>
                                </div>
                            )}

                            {/* Blanks Inputs List */}
                            <div className="space-y-3">
                                {(exercise.testCases?.blanks || []).map((blank, bIdx) => {
                                    const bResult = testResults && testResults[bIdx];
                                    return (
                                        <div key={bIdx} className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-mono text-cyan-400 font-bold">__BLANK_{blank.id || (bIdx + 1)}__</span>
                                                <span className="text-[11px] text-slate-400">{blank.hint}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="text"
                                                    value={blankAnswers[bIdx] || ''}
                                                    onChange={(e) => {
                                                        const updated = [...blankAnswers];
                                                        updated[bIdx] = e.target.value;
                                                        setBlankAnswers(updated);
                                                    }}
                                                    placeholder={`Type code for Blank #${bIdx + 1}...`}
                                                    className={`w-full bg-slate-950 border px-3 py-2 rounded-lg font-mono text-xs text-white outline-none transition ${
                                                        bResult ? (bResult.isCorrect ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-red-500 ring-1 ring-red-500') : 'border-slate-700 focus:border-cyan-500'
                                                    }`}
                                                />
                                                {bResult && (
                                                    bResult.isCorrect 
                                                        ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                                                        : <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting || blankAnswers.some(a => !a?.trim())}
                                className="btn bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-6 rounded-xl font-bold text-xs transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Evaluating...' : 'Check All Blanks'}
                            </button>
                        </div>

                        {/* Review Alert */}
                        {submittedData && (
                            <div className={`p-4 rounded-xl border ${submittedData.status === 'passed' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                <h4 className="font-bold text-xs text-white mb-1">
                                    {submittedData.status === 'passed' ? `🎉 All Blanks Solved Correctly! (+${xpEarned} XP)` : 'Some statements need adjustment'}
                                </h4>
                                {socraticReview && <p className="text-xs text-slate-300 mt-1">{socraticReview}</p>}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 3. MNC CASE STUDY & WORKPLACE SCENARIO RENDERER                           */}
            {/* ========================================================================= */}
            {exerciseType === 'case_study' && (
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Column: Enterprise Incident & Briefing */}
                    <div className="w-5/12 bg-slate-800/95 border-r border-slate-700 p-6 overflow-y-auto space-y-4">
                        <div>
                            <span className="text-[10px] uppercase font-bold bg-purple-900/60 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded">
                                MNC Production Scenario
                            </span>
                            <h2 className="text-sm font-bold text-white mt-2 mb-2">
                                {exercise.testCases?.scenarioTitle || exercise.title}
                            </h2>
                            <div className="prose prose-invert prose-xs text-slate-300 leading-relaxed bg-slate-900/80 p-4 rounded-xl border border-slate-700/80">
                                <MathRenderer content={exercise.testCases?.scenarioContext || exercise.description} textClassName="text-slate-300" />
                            </div>
                        </div>

                        {exercise.hints && exercise.hints.length > 0 && (
                            <div className="pt-2">
                                <button 
                                    onClick={() => setShowHint(!showHint)}
                                    className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-xs font-semibold transition"
                                >
                                    <Lightbulb className="w-3.5 h-3.5" /> 
                                    {showHint ? 'Hide Socratic Hint' : 'Stuck? Show Socratic Hint'}
                                </button>
                                {showHint && (
                                    <div className="mt-2 p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-200 text-xs space-y-1">
                                        {exercise.hints.map((h, hIdx) => (
                                            <div key={hIdx} className="flex items-start gap-1.5">
                                                <span className="shrink-0">💡</span>
                                                <span className="flex-1"><MathRenderer content={h} inline /></span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Follow-up Questions & Soft Skills */}
                    <div className="w-7/12 bg-slate-950 p-6 overflow-y-auto space-y-6">
                        <div className="space-y-6">
                            {(exercise.testCases?.questions || []).map((q, qIdx) => {
                                const qResult = testResults && testResults[qIdx];
                                return (
                                    <div key={q.id || qIdx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-purple-300">Question {qIdx + 1}</span>
                                            {q.category && (
                                                <span className="text-[10px] bg-slate-800 text-slate-400 uppercase px-2 py-0.5 rounded font-mono">
                                                    {q.category}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-white font-medium leading-relaxed">{q.prompt}</p>

                                        {q.codeSnippet && (
                                            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300">
                                                <pre className="whitespace-pre-wrap">{q.codeSnippet}</pre>
                                            </div>
                                        )}

                                        <div className="space-y-2 pt-1">
                                            {(q.options || []).map((opt, oIdx) => {
                                                const isSelected = (scenarioAnswers[q.id] === oIdx);
                                                const isCorrect = qResult && qResult.correctOption === oIdx;
                                                const isWrong = qResult && isSelected && !qResult.isCorrect;

                                                let btnColor = "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300";
                                                if (isSelected && !testResults) {
                                                    btnColor = "bg-purple-950/60 border-purple-500 text-white ring-1 ring-purple-500";
                                                } else if (qResult) {
                                                    if (isCorrect) btnColor = "bg-emerald-950/60 border-emerald-500 text-emerald-200";
                                                    else if (isWrong) btnColor = "bg-red-950/60 border-red-500 text-red-200";
                                                }

                                                return (
                                                    <button
                                                        key={oIdx}
                                                        type="button"
                                                        onClick={() => {
                                                            setScenarioAnswers(prev => ({ ...prev, [q.id]: oIdx }));
                                                        }}
                                                        className={`w-full text-left p-3 rounded-lg border text-xs flex items-start gap-2.5 transition ${btnColor}`}
                                                    >
                                                        <span className="font-bold text-[11px] text-slate-400 shrink-0">{String.fromCharCode(65 + oIdx)}.</span>
                                                        <span className="leading-relaxed flex-1">{opt}</span>
                                                        {qResult && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                                                        {qResult && isWrong && <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {qResult && qResult.explanation && (
                                            <div className="mt-2 p-2.5 bg-slate-950 rounded-lg text-[11px] text-slate-300 border border-slate-800 leading-relaxed">
                                                <strong className="text-white">Rationale:</strong> {qResult.explanation}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="btn bg-purple-600 hover:bg-purple-500 text-white py-2 px-6 rounded-xl font-bold text-xs transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Evaluating Scenario...' : 'Submit Case Study Assessment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 4. CBSE ASSERTION-REASONING MODE RENDERER                                */}
            {/* ========================================================================= */}
            {exerciseType === 'assertion_reason' && (
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Column: Context & Guidelines */}
                    <div className="w-5/12 bg-slate-800/95 border-r border-slate-700 p-6 overflow-y-auto space-y-4">
                        <div className="text-slate-200">
                            <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Compass className="w-4 h-4" /> CBSE Assertion & Reason
                            </h2>
                            <div className="prose prose-invert prose-xs text-slate-300 leading-relaxed">
                                <MathRenderer content={exercise.description} textClassName="text-slate-300" />
                            </div>
                        </div>

                        <div className="p-4 bg-indigo-950/40 border border-indigo-500/20 rounded-2xl space-y-2 text-xs text-indigo-200">
                            <span className="font-bold flex items-center gap-1.5 text-indigo-300">
                                <Lightbulb className="w-4 h-4 text-amber-400" /> CBSE Strategy Tip:
                            </span>
                            <p>1. Check if Assertion (A) is a true statement on its own.</p>
                            <p>2. Check if Reason (R) is a true statement on its own.</p>
                            <p>3. If both are true, evaluate: does Reason (R) correctly explain WHY Assertion (A) occurs?</p>
                        </div>

                        {submittedData?.results?.[0]?.explanation && (
                            <div className="p-4 bg-slate-900 border border-slate-700 rounded-2xl space-y-2">
                                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5" /> Conceptual Explanation:
                                </span>
                                <div className="text-xs text-slate-300 leading-relaxed">
                                    <MathRenderer content={submittedData.results[0].explanation} textClassName="text-slate-300" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Assertion Card, Reason Card, 4 CBSE Options */}
                    <div className="flex-1 bg-slate-900 p-6 overflow-y-auto space-y-5">
                        {/* Assertion Statement Card */}
                        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">A</span>
                                Assertion Statement:
                            </span>
                            <div className="text-sm font-semibold text-white leading-relaxed">
                                <MathRenderer content={exercise.testCases?.assertion || exercise.description} textClassName="text-white" />
                            </div>
                        </div>

                        {/* Reason Statement Card */}
                        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">R</span>
                                Reason Statement:
                            </span>
                            <div className="text-sm font-semibold text-white leading-relaxed">
                                <MathRenderer content={exercise.testCases?.reason || 'Evaluate based on foundational language semantics and execution rules.'} textClassName="text-white" />
                            </div>
                        </div>

                        {/* 4 Standard CBSE Options */}
                        <div className="space-y-2.5 pt-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Select the Correct Assessment:
                            </span>
                            {[
                                { id: 0, label: '(A) Both Assertion (A) and Reason (R) are true, and Reason (R) is the correct explanation of Assertion (A).' },
                                { id: 1, label: '(B) Both Assertion (A) and Reason (R) are true, but Reason (R) is NOT the correct explanation of Assertion (A).' },
                                { id: 2, label: '(C) Assertion (A) is true, but Reason (R) is false.' },
                                { id: 3, label: '(D) Assertion (A) is false, but Reason (R) is true.' }
                            ].map((opt) => {
                                const isSelected = selectedMcqOption === opt.id;
                                const result = submittedData?.results?.[0];
                                const isTargetCorrect = result?.correctOption === opt.id;
                                let style = 'bg-slate-800/60 border-slate-700 hover:border-indigo-500 text-slate-300';

                                if (result) {
                                    if (isTargetCorrect) {
                                        style = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-semibold';
                                    } else if (isSelected && !result.passed) {
                                        style = 'bg-rose-950/60 border-rose-500 text-rose-200';
                                    }
                                } else if (isSelected) {
                                    style = 'bg-indigo-950/70 border-indigo-500 text-indigo-200 font-semibold shadow-sm';
                                }

                                return (
                                    <button
                                        key={opt.id}
                                        disabled={isSubmitting}
                                        onClick={() => setSelectedMcqOption(opt.id)}
                                        className={`w-full p-4 rounded-2xl border text-left text-xs transition flex items-start gap-3 ${style}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                                            isSelected ? 'border-indigo-400 bg-indigo-600 text-white' : 'border-slate-600'
                                        }`}>
                                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                        </div>
                                        <span className="leading-relaxed">{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-3">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || selectedMcqOption === null}
                                className="btn bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-6 rounded-xl font-bold text-xs transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Evaluating Assessment...' : 'Submit Assertion-Reason Answer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 5. CBSE DRY-RUN VARIABLE TRACING MODE RENDERER                           */}
            {/* ========================================================================= */}
            {exerciseType === 'code_trace' && (
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Column: Problem, Target Code Snippet to Trace */}
                    <div className="w-5/12 bg-slate-800/95 border-r border-slate-700 p-6 overflow-y-auto space-y-4">
                        <div className="text-slate-200">
                            <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <ListOrdered className="w-4 h-4" /> CBSE Dry-Run Trace Table
                            </h2>
                            <div className="prose prose-invert prose-xs text-slate-300 leading-relaxed">
                                <MathRenderer content={exercise.description} textClassName="text-slate-300" />
                            </div>
                        </div>

                        {exercise.testCases?.codeSnippet && (
                            <div className="space-y-1.5">
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Trace Target Code:</span>
                                <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 font-mono text-xs text-teal-300 overflow-x-auto">
                                    <pre className="whitespace-pre-wrap">{exercise.testCases.codeSnippet}</pre>
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-teal-950/30 border border-teal-500/20 rounded-2xl text-xs text-teal-200 space-y-1.5">
                            <span className="font-bold flex items-center gap-1 text-teal-300">
                                <Lightbulb className="w-3.5 h-3.5" /> Instructions:
                            </span>
                            <p>Fill in the values of each variable at every loop step/iteration in the table on the right.</p>
                        </div>

                        {submittedData?.results && (
                            <div className="p-4 bg-slate-900 border border-slate-700 rounded-2xl space-y-2">
                                <span className="text-xs font-bold text-teal-400">Execution Analysis:</span>
                                <p className="text-xs text-slate-300">
                                    {submittedData.status === 'passed' 
                                        ? 'All rows correctly traced! You have mastered dry-run output prediction.' 
                                        : 'Review the highlighted rows where variable states deviated from expected output.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Trace Table Input */}
                    <div className="flex-1 bg-slate-900 p-6 overflow-y-auto space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <ListOrdered className="w-4 h-4 text-teal-400" />
                                Dry-Run Variable State Table
                            </h3>
                            <span className="text-xs text-slate-400">Step-by-step Execution</span>
                        </div>

                        {/* Trace Table */}
                        <div className="border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-xs text-slate-200">
                                <thead className="bg-slate-800 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-700">
                                    <tr>
                                        {(exercise.testCases?.tableHeaders || ['Step', 'Variable 1', 'Variable 2']).map((th, hIdx) => (
                                            <th key={hIdx} className="p-3 font-bold text-teal-300">
                                                {th}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                                    {(traceRows.length > 0 ? traceRows : [new Array(exercise.testCases?.tableHeaders?.length || 2).fill('')]).map((row, rIdx) => {
                                        const rowResult = submittedData?.results?.[rIdx];
                                        return (
                                            <tr key={rIdx} className={rowResult ? (rowResult.isCorrect ? 'bg-emerald-950/20' : 'bg-rose-950/20') : ''}>
                                                {row.map((cell, cIdx) => (
                                                    <td key={cIdx} className="p-2">
                                                        <input
                                                            type="text"
                                                            value={cell || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setTraceRows(prev => {
                                                                    const base = prev.length > 0 ? prev : [new Array(exercise.testCases?.tableHeaders?.length || 2).fill('')];
                                                                    const updated = [...base];
                                                                    updated[rIdx] = [...(updated[rIdx] || [])];
                                                                    updated[rIdx][cIdx] = val;
                                                                    return updated;
                                                                });
                                                            }}
                                                            placeholder={`Val ${cIdx + 1}`}
                                                            className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => {
                                    const colCount = exercise.testCases?.tableHeaders?.length || 2;
                                    setTraceRows(prev => [...prev, new Array(colCount).fill('')]);
                                }}
                                className="btn btn-secondary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1 font-semibold"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Step Row
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="btn bg-teal-600 hover:bg-teal-500 text-white py-2 px-6 rounded-xl font-bold text-xs transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Evaluating Trace Table...' : 'Submit Dry-Run Trace'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 6. CBSE CODE DEBUGGING & ERROR SPOTTING MODE RENDERER                    */}
            {/* ========================================================================= */}
            {exerciseType === 'code_debug' && (
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Column: Problem, Bug Spotting Instructions */}
                    <div className="w-5/12 bg-slate-800/95 border-r border-slate-700 p-6 overflow-y-auto space-y-4">
                        <div className="text-slate-200">
                            <h2 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4" /> CBSE Error Spotting & Debugging
                            </h2>
                            <div className="prose prose-invert prose-xs text-slate-300 leading-relaxed">
                                <MathRenderer content={exercise.description} textClassName="text-slate-300" />
                            </div>
                        </div>

                        <div className="p-4 bg-rose-950/30 border border-rose-500/20 rounded-2xl text-xs text-rose-200 space-y-2">
                            <span className="font-bold flex items-center gap-1.5 text-rose-300">
                                <Lightbulb className="w-4 h-4 text-amber-400" /> Instructions:
                            </span>
                            <p>1. Spot the line with the syntax or logical bug on the right.</p>
                            <p>2. Select the flagged line number or rewrite the corrected program.</p>
                            <p>3. Run your corrected code to test it, then click Submit.</p>
                        </div>

                        {submittedData?.results?.[0]?.explanation && (
                            <div className="p-4 bg-slate-900 border border-slate-700 rounded-2xl space-y-2">
                                <span className="text-xs font-bold text-emerald-400">CBSE Solution Note:</span>
                                <div className="text-xs text-slate-300 leading-relaxed">
                                    <MathRenderer content={submittedData.results[0].explanation} textClassName="text-slate-300" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Code Editor & Error Line Selector */}
                    <div className="flex-1 bg-slate-900 flex flex-col overflow-hidden">
                        {/* Top Toolbar */}
                        <div className="h-12 bg-slate-800 border-b border-slate-700 px-4 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-300">Flag Error Line:</span>
                                <select
                                    value={flaggedLine || ''}
                                    onChange={(e) => setFlaggedLine(Number(e.target.value))}
                                    className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-rose-300 font-bold focus:border-rose-500"
                                >
                                    <option value="">Select Line #</option>
                                    {Array.from({ length: (code || '').split('\n').length }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>Line {i + 1}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleRun}
                                    disabled={isRunning}
                                    className="btn bg-slate-700 hover:bg-slate-600 text-white text-xs py-1.5 px-3 rounded-lg font-bold flex items-center gap-1"
                                >
                                    <Play className="w-3.5 h-3.5 text-emerald-400" /> Run Fix
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="btn bg-rose-600 hover:bg-rose-500 text-white text-xs py-1.5 px-4 rounded-lg font-bold flex items-center gap-1"
                                >
                                    {isSubmitting ? 'Evaluating Debug Fix...' : 'Submit Debug Fix'}
                                </button>
                            </div>
                        </div>

                        {/* Monaco Editor with Buggy / Editable Code */}
                        <div className="flex-1 overflow-hidden">
                            <CodeEditorWithConfig
                                height="100%"
                                language={moduleData?.language?.toLowerCase() || 'python'}
                                value={code}
                                onChange={(val) => setCode(val || '')}
                                fileName="debug_target.py"
                                runtimeLabel="Debug Workspace"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 7. CODING & PR BUG-FIX MODE RENDERER                                      */}
            {/* ========================================================================= */}
            {(exerciseType === 'coding' || exerciseType === 'bug_fix') && (
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: Problem Statement, Step-by-Step STDIN & Results */}
                    <div className="w-5/12 bg-slate-800/95 border-r border-slate-700 flex flex-col overflow-y-auto">
                        {/* PR Review Alert banner */}
                        {exerciseType === 'bug_fix' && (
                            <div className="p-3.5 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                                <span><strong>PR Code Review:</strong> Identify and fix the 2 intentional bugs in this Junior PR to pass all tests.</span>
                            </div>
                        )}

                        {/* Problem Description */}
                        <div className="p-5 text-slate-200">
                            {exercise.description.includes('## 📖 Learning Content') ? (
                                <>
                                    <h2 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                                        📖 Learning Content
                                    </h2>
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4 text-xs">
                                        <MathRenderer 
                                            content={exercise.description.split('---')[0].replace('## 📖 Learning Content', '').trim()} 
                                            textClassName="text-slate-200"
                                        />
                                    </div>
                                    <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                                        🎯 Problem Statement
                                    </h2>
                                    <div className="text-xs">
                                        <MathRenderer 
                                            content={exercise.description.split('## 🎯 Problem Statement')[1]?.trim() || ''} 
                                            textClassName="text-slate-300"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-sm font-bold text-white mb-3">Problem Statement</h2>
                                    <div className="text-xs text-slate-300">
                                        <MathRenderer content={exercise.description} textClassName="text-slate-300" />
                                    </div>
                                </>
                            )}

                            {/* Hints */}
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
                                                <div key={hIdx} className="flex items-start gap-1.5">
                                                    <span className="shrink-0">💡</span>
                                                    <span className="flex-1"><MathRenderer content={h} inline /></span>
                                                </div>
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

                            {/* Auto-Advance Celebratory Banner on Passing */}
                            {submittedData?.status === 'passed' && (
                                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-indigo-950/80 to-slate-900 border border-emerald-500/40 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/30">
                                                🎉
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-emerald-300">Exercise Mastered!</h4>
                                                <p className="text-[11px] text-emerald-400/80">+{xpEarned || exercise.xpReward || 10} XP awarded to your profile</p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
                                                Total XP: {totalXP}
                                            </span>
                                        </div>
                                    </div>

                                    {nextExerciseId ? (
                                        <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between gap-3">
                                            <div className="text-xs text-slate-300 flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                                                <span>
                                                    {advanceCountdown !== null ? `Auto-advancing in ${advanceCountdown}s...` : 'Next challenge ready'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {advanceCountdown !== null && (
                                                    <button
                                                        onClick={() => setAdvanceCountdown(null)}
                                                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                                                    >
                                                        Stay Here
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => router.push(`/training/${moduleId}/exercise/${nextExerciseId}`)}
                                                    className="btn bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-1 px-3.5 rounded-xl flex items-center gap-1 shadow-md shadow-emerald-500/20 transition"
                                                >
                                                    <span>Advance Now</span>
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs text-indigo-300">
                                            <span>🌟 Unit / Module Completed!</span>
                                            <button
                                                onClick={() => router.push(`/training/${moduleId}`)}
                                                className="btn btn-secondary text-xs py-1 px-3"
                                            >
                                                Return to Course Overview
                                            </button>
                                        </div>
                                    )}
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
                                    <div className="text-xs text-indigo-100 leading-relaxed">
                                        <MathRenderer content={socraticReview} textClassName="text-indigo-100" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Enhanced Monaco Editor with Configurations */}
                    <div className="w-7/12 h-full flex flex-col">
                        <CodeEditorWithConfig
                            language={exercise?.unit?.module?.language || 'python'}
                            value={code}
                            onChange={(val) => setCode(val || '')}
                            fileName="solution.py"
                            runtimeLabel={`${exercise?.unit?.module?.language ? exercise.unit.module.language.toUpperCase() : 'Python'} 3.11 Runtime`}
                        />
                    </div>
                </div>
            )}

            </div>

            {/* Socratic AI Tutor Side Drawer */}
            {showSocraticDrawer && (
                <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-indigo-950/40">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                                💡
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-slate-100">AI Socratic Tutor</h3>
                                <p className="text-[10px] text-indigo-300">Guiding questions without spoiling the code</p>
                            </div>
                        </div>
                        <button onClick={() => setShowSocraticDrawer(false)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                        {socraticLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                <RefreshCw className="w-7 h-7 text-indigo-500 animate-spin" />
                                <span>Reflecting on your code structure...</span>
                            </div>
                        ) : socraticAdvice ? (
                            <div className="space-y-4">
                                <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-200 leading-relaxed">
                                    <h4 className="font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
                                        <Lightbulb className="w-4 h-4 text-amber-400" /> Socratic Guidance:
                                    </h4>
                                    <p className="whitespace-pre-wrap">{socraticAdvice.guidance}</p>
                                </div>

                                {socraticAdvice.questionsToAskYourself && (
                                    <div className="space-y-2">
                                        <h5 className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                                            Questions to Ask Yourself:
                                        </h5>
                                        <div className="space-y-1.5">
                                            {socraticAdvice.questionsToAskYourself.map((q, qi) => (
                                                <div key={qi} className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700 text-slate-200 flex items-start gap-2">
                                                    <span className="text-indigo-400 font-bold">•</span>
                                                    <span>{typeof q === 'object' ? (q.prompt || q.question || JSON.stringify(q)) : String(q)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {socraticAdvice.edgeCasesToConsider && (
                                    <div className="space-y-2">
                                        <h5 className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                                            Edge Cases to Consider:
                                        </h5>
                                        <div className="space-y-1.5">
                                            {socraticAdvice.edgeCasesToConsider.map((e, ei) => (
                                                <div key={ei} className="p-2.5 bg-amber-950/30 rounded-xl border border-amber-500/20 text-amber-200 flex items-start gap-2">
                                                    <span className="text-amber-400 font-bold">⚠️</span>
                                                    <span>{typeof e === 'object' ? (e.description || (e.input ? `Input: ${e.input}` : JSON.stringify(e))) : String(e)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-400">
                                <p>Click the button below to get intelligent guiding prompts tailored to your current code.</p>
                                <button
                                    onClick={handleAskSocraticTutor}
                                    className="mt-3 btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-xl"
                                >
                                    Ask for Hint
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
