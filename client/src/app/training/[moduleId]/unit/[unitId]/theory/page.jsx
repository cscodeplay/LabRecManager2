'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { trainingAPI } from '@/lib/api';
import { ArrowLeft, CheckCircle, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import StudentTheoryViewer from '@/components/StudentTheoryViewer';

export default function UnitTheoryPage() {
    const { moduleId, unitId } = useParams();
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();

    const [unit, setUnit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCompleting, setIsCompleting] = useState(false);
    const [completedTheory, setCompletedTheory] = useState(false);
    const [earnedXP, setEarnedXP] = useState(15);

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

    // Mark theory as completed
    const handleCompleteTheory = async () => {
        setIsCompleting(true);
        try {
            const res = await trainingAPI.completeUnitTheory(unitId);
            const xp = res.data.data?.xpEarned || 15;
            setEarnedXP(xp);
            setCompletedTheory(true);
            toast.success(`🎉 Stage 1 Theory completed! +${xp} XP earned!`);

            // If unit has exercises, navigate to the first one after a short delay
            if (unit?.firstExerciseId) {
                setTimeout(() => {
                    router.push(`/training/${moduleId}/exercise/${unit.firstExerciseId}`);
                }, 1400);
            } else {
                setTimeout(() => {
                    router.push(`/training/${moduleId}`);
                }, 1400);
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
            <main className="max-w-5xl mx-auto px-4 py-8">
                <StudentTheoryViewer
                    unit={unit}
                    onComplete={handleCompleteTheory}
                    isCompleting={isCompleting}
                    completed={completedTheory}
                    earnedXP={earnedXP}
                />
            </main>
        </div>
    );
}
