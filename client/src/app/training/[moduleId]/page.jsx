'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { trainingAPI } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import { BookOpen, CheckCircle, Lock, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TrainingModulePage() {
    const { moduleId } = useParams();
    const router = useRouter();
    const { isAuthenticated, user } = useAuthStore();
    
    const [module, setModule] = useState(null);
    const [progress, setProgress] = useState(null);
    const [masteries, setMasteries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) return;
        
        const fetchModule = async () => {
            try {
                const res = await trainingAPI.getModuleDetails(moduleId);
                setModule(res.data.data.module);
                setProgress(res.data.data.progress);
                setMasteries(res.data.data.unitMasteries || []);
            } catch (err) {
                toast.error('Failed to load training module');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchModule();
    }, [moduleId, isAuthenticated]);

    if (loading) return <div className="p-8 text-center">Loading module...</div>;
    if (!module) return <div className="p-8 text-center text-red-500">Module not found</div>;

    const isMastered = (unitId) => masteries.find(m => m.unitId === unitId)?.status === 'mastered';
    const isUnlocked = (index, unitId) => {
        if (index === 0) return true; // First unit always unlocked
        const prevUnitId = module.units[index - 1].id;
        return isMastered(prevUnitId);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader title={module.title} backLink="/assigned-work" />
            
            <main className="max-w-5xl mx-auto px-4 py-8">
                {/* Header Card */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{module.title}</h1>
                            <p className="text-slate-600 mt-2">{module.description}</p>
                            <div className="flex gap-4 mt-4 text-sm text-slate-500">
                                <span>{module.units.length} Units</span>
                                <span>Language: {module.language}</span>
                                {progress?.totalXP !== undefined && (
                                    <span className="text-amber-600 font-bold">{progress.totalXP} XP Earned</span>
                                )}
                            </div>
                        </div>
                        <div className="bg-emerald-50 rounded-full p-4">
                            <BookOpen className="w-8 h-8 text-emerald-600" />
                        </div>
                    </div>
                </div>

                {/* Units List */}
                <div className="space-y-6">
                    {module.units.map((unit, index) => {
                        const unlocked = isUnlocked(index, unit.id);
                        const mastery = masteries.find(m => m.unitId === unit.id);
                        
                        return (
                            <div key={unit.id} className={`bg-white rounded-xl border ${unlocked ? 'border-primary-200 shadow-sm' : 'border-slate-200 opacity-75'}`}>
                                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                                    <div className="flex items-center gap-3">
                                        {!unlocked ? (
                                            <Lock className="w-5 h-5 text-slate-400" />
                                        ) : mastery?.status === 'mastered' ? (
                                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                            <PlayCircle className="w-5 h-5 text-primary-500" />
                                        )}
                                        <h2 className="text-lg font-bold text-slate-800">Unit {unit.unitNumber}: {unit.title}</h2>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {unlocked && (
                                            <button
                                                onClick={() => router.push(`/training/${moduleId}/unit/${unit.id}/theory`)}
                                                className="btn bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 dark:text-indigo-300 text-xs py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 transition border border-indigo-200 dark:border-indigo-800 shadow-xs"
                                            >
                                                <BookOpen className="w-3.5 h-3.5" />
                                                <span>📖 Theory & Mini-Checks</span>
                                            </button>
                                        )}
                                        <div className="text-sm">
                                            {mastery ? (
                                                <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full font-medium">
                                                    Mastery: {Math.round(mastery.masteryScore)}%
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 text-xs">Unlock Threshold: {unit.unlockThreshold}%</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-5">
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {unit.exercises.map((ex, i) => {
                                            const type = ex.exerciseType || 'coding';
                                            const isPassed = ex.userStatus === 'passed';
                                            const isFailed = ex.userStatus === 'failed';
                                            const isUnvisited = !ex.userStatus || ex.userStatus === 'unvisited';

                                            const typeBadge = {
                                                mcq: { label: '📝 MCQ', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
                                                fill_blank: { label: '🧩 Cloze', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
                                                case_study: { label: '🏢 Case Study', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
                                                bug_fix: { label: '🐞 PR Bug Hunt', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
                                                coding: { label: '⚡ Coding Lab', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                                            }[type] || { label: '⚡ Coding Lab', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

                                            let cardBorder = 'bg-white border-slate-200 hover:border-indigo-500 hover:shadow-md';
                                            if (isPassed) {
                                                cardBorder = 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-500 hover:shadow-md';
                                            } else if (isFailed) {
                                                cardBorder = 'bg-amber-50/40 border-amber-300 hover:border-amber-500 hover:shadow-md';
                                            } else if (isUnvisited) {
                                                cardBorder = 'bg-white border-rose-200 hover:border-rose-400 hover:shadow-md';
                                            }

                                            return (
                                                <button
                                                    key={ex.id}
                                                    disabled={!unlocked}
                                                    onClick={() => router.push(`/training/${moduleId}/exercise/${ex.id}`)}
                                                    className={`p-4 text-left rounded-xl border transition-all flex flex-col justify-between ${!unlocked ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-60' : `${cardBorder} cursor-pointer group`}`}
                                                >
                                                    <div>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Exercise {i + 1}</span>
                                                                {isPassed && (
                                                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                                                                        ✅ Passed
                                                                    </span>
                                                                )}
                                                                {isFailed && (
                                                                    <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
                                                                        ⚠️ Review
                                                                    </span>
                                                                )}
                                                                {isUnvisited && (
                                                                    <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Unvisited
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${typeBadge.bg}`}>
                                                                    {typeBadge.label}
                                                                </span>
                                                                {ex.isReviewExercise && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">Review</span>}
                                                            </div>
                                                        </div>
                                                        <h3 className="font-semibold text-slate-800 line-clamp-2 text-sm group-hover:text-indigo-600 transition-colors">
                                                            {ex.title}
                                                        </h3>
                                                    </div>
                                                    <div className="mt-4 pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                                                        <span className="capitalize text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                            {ex.scaffoldLevel?.replace('_', ' ') || ex.difficulty}
                                                        </span>
                                                        <span className="text-indigo-600 font-bold">+{ex.xpReward} XP</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
