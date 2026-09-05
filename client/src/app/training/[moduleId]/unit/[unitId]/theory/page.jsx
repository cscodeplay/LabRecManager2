'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { trainingAPI } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import { 
    BookOpen, CheckCircle, ArrowRight, ArrowLeft, Award, Sparkles, 
    AlertTriangle, Lightbulb, Check, X, HelpCircle, Code2, Play, Flame, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import MathRenderer from '@/components/MathRenderer';

export default function UnitTheoryPage() {
    const { moduleId, unitId } = useParams();
    const router = useRouter();
    const { isAuthenticated, user } = useAuthStore();

    const [unit, setUnit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checkpointAnswers, setCheckpointAnswers] = useState({});
    const [checkpointChecked, setCheckpointChecked] = useState({});
    const [isCompleting, setIsCompleting] = useState(false);
    const [completedTheory, setCompletedTheory] = useState(false);
    const [earnedXP, setEarnedXP] = useState(0);

    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchTheory = async () => {
            try {
                const res = await trainingAPI.getUnitTheory(unitId);
                setUnit(res.data.data.unit);
            } catch (err) {
                console.error(err);
                toast.error('Failed to load unit theory');
            } finally {
                setLoading(false);
            }
        };

        fetchTheory();
    }, [unitId, isAuthenticated]);

    // Handle checkpoint option selection
    const handleSelectOption = (checkpointId, optionIdx) => {
        setCheckpointAnswers(prev => ({
            ...prev,
            [checkpointId]: optionIdx
        }));
    };

    // Verify a checkpoint answer
    const handleVerifyCheckpoint = (checkpoint) => {
        const selected = checkpointAnswers[checkpoint.id];
        if (selected === undefined || selected === null) {
            toast.error('Please select an answer first!');
            return;
        }

        const isCorrect = selected === checkpoint.correctOption;
        setCheckpointChecked(prev => ({
            ...prev,
            [checkpoint.id]: {
                checked: true,
                isCorrect
            }
        }));

        if (isCorrect) {
            toast.success('🎯 Correct answer! Well done.');
        } else {
            toast.error('Not quite! Check the explanation below.');
        }
    };

    // Calculate completed checkpoints count
    const checkpointsCount = unit?.miniCheckpoints?.length || 0;
    const completedCheckpointsCount = useMemo(() => {
        if (!unit?.miniCheckpoints) return 0;
        return unit.miniCheckpoints.filter(cp => checkpointChecked[cp.id]?.isCorrect).length;
    }, [unit?.miniCheckpoints, checkpointChecked]);

    // Mark theory as completed
    const handleCompleteTheory = async () => {
        setIsCompleting(true);
        try {
            const res = await trainingAPI.completeUnitTheory(unitId);
            const xp = res.data.data?.xpEarned || 15;
            setEarnedXP(xp);
            setCompletedTheory(true);
            toast.success(`🎉 Theory completed! +${xp} XP earned!`);

            // If unit has exercises, navigate to the first one after a short delay
            if (unit?.firstExerciseId) {
                setTimeout(() => {
                    router.push(`/training/${moduleId}/exercise/${unit.firstExerciseId}`);
                }, 1500);
            } else {
                setTimeout(() => {
                    router.push(`/training/${moduleId}`);
                }, 1500);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to record completion');
        } finally {
            setIsCompleting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Loading Concept Notes & Mini-Exercises...</span>
            </div>
        );
    }

    if (!unit) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 text-center text-red-500">
                Unit theory not found.
            </div>
        );
    }

    // Default theory fallback if content is empty
    const rawContent = unit.content || unit.summary || `## ${unit.title}\n\nWelcome to this learning unit! Review the concepts and complete the interactive mini-checkpoints below before starting your practical coding exercises.`;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Top Navigation & Status Bar */}
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => router.push(`/training/${moduleId}`)}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                            title="Back to Module"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full">
                                    Unit {unit.unitNumber} Concept Notes
                                </span>
                                {unit.module?.boardAligned && (
                                    <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                                        {unit.module.boardAligned} Aligned
                                    </span>
                                )}
                            </div>
                            <h1 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-md">
                                {unit.title}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {checkpointsCount > 0 && (
                            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span>Checkpoints: {completedCheckpointsCount}/{checkpointsCount}</span>
                            </div>
                        )}
                        {unit.firstExerciseId && (
                            <button
                                onClick={() => router.push(`/training/${moduleId}/exercise/${unit.firstExerciseId}`)}
                                className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                            >
                                <Play className="w-3.5 h-3.5 text-indigo-500" /> Jump to Lab Exercises
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Learning Canvas */}
            <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                
                {/* Hero Card */}
                <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10 space-y-3 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-semibold text-indigo-100">
                            <BookOpen className="w-3.5 h-3.5" /> CBSE NCERT Theory & Scaffolding
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            {unit.title}
                        </h2>
                        <p className="text-sm sm:text-base text-indigo-100/90 leading-relaxed">
                            {unit.summary || 'Master core foundational concepts, syntax conventions, and common pitfalls before attempting your hands-on coding challenges.'}
                        </p>
                        <div className="flex items-center gap-4 pt-2 text-xs text-indigo-200">
                            <span className="flex items-center gap-1">
                                <Flame className="w-4 h-4 text-amber-300" /> +15 XP on Reading Complete
                            </span>
                            <span className="flex items-center gap-1">
                                <Code2 className="w-4 h-4 text-cyan-300" /> Language: {unit.module?.language || 'Python'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Core Concepts & Reading Topics Badges */}
                {unit.keyConcepts && unit.keyConcepts.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 p-5 shadow-sm space-y-2.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4" /> Core Reading Topics & Syllabus Concepts
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {unit.keyConcepts.map((concept, cIdx) => (
                                <span
                                    key={cIdx}
                                    className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-medium px-3 py-1 rounded-xl border border-indigo-200/80 dark:border-indigo-800 shadow-2xs"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    {concept}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Theory Content Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
                        <MathRenderer content={rawContent} textClassName="text-slate-800 dark:text-slate-200 text-sm leading-relaxed" />
                    </div>

                    {/* CBSE Board Exam Corner & Common Traps Callout */}
                    {unit.cbseTips && unit.cbseTips.length > 0 && (
                        <div className="mt-8 p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-3">
                            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
                                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span>📌 CBSE Board Exam Corner: Frequent Traps & Pitfalls</span>
                            </div>
                            <ul className="space-y-2 text-xs text-amber-800 dark:text-amber-300">
                                {unit.cbseTips.map((tip, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="font-bold shrink-0">•</span>
                                        <span className="flex-1"><MathRenderer content={tip} inline /></span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Embedded Interactive Mini-Checkpoints */}
                {unit.miniCheckpoints && unit.miniCheckpoints.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    Inline Mini-Checkpoints
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Test your understanding with instant feedback before moving to coding labs
                                </p>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                {completedCheckpointsCount} of {unit.miniCheckpoints.length} passed
                            </span>
                        </div>

                        <div className="space-y-4">
                            {unit.miniCheckpoints.map((cp, cpIdx) => {
                                const checkedState = checkpointChecked[cp.id];
                                const isChecked = !!checkedState?.checked;
                                const isCorrect = !!checkedState?.isCorrect;
                                const selectedIdx = checkpointAnswers[cp.id];

                                return (
                                    <div 
                                        key={cp.id || cpIdx}
                                        className={`p-5 rounded-2xl border transition-all ${
                                            isChecked 
                                                ? isCorrect 
                                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' 
                                                    : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                                                    {cpIdx + 1}
                                                </span>
                                                <div className="text-sm font-bold text-slate-900 dark:text-white">
                                                    <MathRenderer content={cp.question} inline />
                                                </div>
                                            </div>
                                            {isChecked && (
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                                    isCorrect 
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                                }`}>
                                                    {isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                                    {isCorrect ? 'Correct' : 'Needs Review'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Code Snippet if applicable */}
                                        {cp.codeSnippet && (
                                            <pre className="p-3 mb-3 rounded-xl bg-slate-900 text-cyan-300 font-mono text-xs overflow-x-auto">
                                                <code>{cp.codeSnippet}</code>
                                            </pre>
                                        )}

                                        {/* Options */}
                                        <div className="space-y-2 mb-4">
                                            {cp.options?.map((opt, optIdx) => {
                                                const isSelected = selectedIdx === optIdx;
                                                const isTargetCorrect = optIdx === cp.correctOption;
                                                let optionStyle = 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-indigo-400';

                                                if (isChecked) {
                                                    if (isTargetCorrect) {
                                                        optionStyle = 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-semibold';
                                                    } else if (isSelected && !isCorrect) {
                                                        optionStyle = 'bg-rose-100 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200';
                                                    }
                                                } else if (isSelected) {
                                                    optionStyle = 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-semibold';
                                                }

                                                return (
                                                    <button
                                                        key={optIdx}
                                                        disabled={isChecked && isCorrect}
                                                        onClick={() => handleSelectOption(cp.id, optIdx)}
                                                        className={`w-full p-3 rounded-xl border text-xs text-left transition flex items-center justify-between ${optionStyle}`}
                                                    >
                                                        <span className="flex-1 mr-2"><MathRenderer content={opt} inline /></span>
                                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                            isSelected 
                                                                ? 'border-indigo-600 bg-indigo-600 text-white' 
                                                                : 'border-slate-300 dark:border-slate-600'
                                                        }`}>
                                                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Action Button & Feedback */}
                                        <div className="flex items-center justify-between gap-3">
                                            {isChecked && cp.explanation && (
                                                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                                                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                                    <span className="flex-1"><MathRenderer content={cp.explanation} inline /></span>
                                                </div>
                                            )}
                                            <div className="ml-auto">
                                                {(!isChecked || !isCorrect) && (
                                                    <button
                                                        onClick={() => handleVerifyCheckpoint(cp)}
                                                        className="btn btn-primary text-xs py-1.5 px-3 rounded-lg font-bold"
                                                    >
                                                        Check Answer
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Bottom Completion & Transition Bar */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-500" />
                            Ready for the Practical Labs?
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Marking theory completed awards you +15 XP and advances your unit roadmap.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            disabled={isCompleting || completedTheory}
                            onClick={handleCompleteTheory}
                            className={`btn w-full sm:w-auto text-xs py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md ${
                                completedTheory 
                                    ? 'bg-emerald-600 text-white cursor-default' 
                                    : 'btn-primary'
                            }`}
                        >
                            {completedTheory ? (
                                <>
                                    <CheckCircle className="w-4 h-4" /> Completed (+{earnedXP} XP)
                                </>
                            ) : isCompleting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Saving Progress...
                                </>
                            ) : (
                                <>
                                    <span>Complete Theory & Start Exercises</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
}
