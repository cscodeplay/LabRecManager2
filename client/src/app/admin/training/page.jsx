'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, BookOpen, GraduationCap, ChevronRight, Edit3, Trash2, 
    BookCheck, AlertCircle, Sparkles, MoveRight, Layers, Award
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { trainingAPI, classesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import TrainingModuleWizard from '@/components/TrainingModuleWizard';

export default function AdminTrainingModules() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    
    const [modules, setModules] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showWizard, setShowWizard] = useState(false);

    const isAdmin = user?.role === 'admin' || user?.role === 'principal' || user?.role === 'instructor';

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        if (!isAdmin) { router.push('/dashboard'); return; }
        loadData();
    }, [isAuthenticated, _hasHydrated, isAdmin]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [modRes, classRes] = await Promise.all([
                trainingAPI.getModules(),
                classesAPI.getAll().catch(() => ({ data: { data: { classes: [] } } }))
            ]);
            setModules(modRes.data.data.modules || []);
            setClasses(classRes.data?.data?.classes || []);
        } catch (error) {
            console.error('Error loading training modules:', error);
            toast.error('Failed to load training modules');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <PageHeader title="Training Module Builder" titleHindi="प्रशिक्षण मॉड्यूल निर्माता">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowWizard(true)} 
                        className="btn bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-indigo-600/20 text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5"
                    >
                        <Sparkles className="w-4 h-4" /> ✨ AI Course Wizard
                    </button>
                    <button 
                        onClick={() => setShowWizard(true)} 
                        className="btn btn-primary text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 font-bold"
                    >
                        <Plus className="w-4 h-4" /> Create New Module
                    </button>
                </div>
            </PageHeader>

            <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 border-b border-slate-200">
                <div className="mb-6 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-200 dark:border-indigo-800 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/25">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">Pedagogy Design & AI LMS Engine</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                                Build mastery-based pedagogy courses with multi-modal challenges: <strong>Coding Labs</strong>, <strong>Predict Output MCQs</strong>, <strong>Syntax Cloze</strong>, <strong>PR Bug Hunts</strong>, and <strong>MNC Case Studies</strong> with automatic AI feedback and XP progression.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowWizard(true)}
                        className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-5 rounded-2xl shrink-0 shadow-md shadow-indigo-600/20 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Launch 5-Step Creator
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.length === 0 && !loading && (
                        <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-dashed rounded-3xl p-8">
                            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mb-4 text-indigo-500">
                                <GraduationCap className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Training Modules Yet</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-1 text-xs">
                                Create your first pedagogy-aligned course using the step-by-step wizard or AI curriculum synthesizer.
                            </p>
                            <button onClick={() => setShowWizard(true)} className="mt-5 btn btn-primary text-xs font-bold py-2.5 px-6 rounded-2xl">
                                <Sparkles className="w-4 h-4" /> Create First Module
                            </button>
                        </div>
                    )}
                    
                    {modules.map(mod => (
                        <div 
                            key={mod.id} 
                            className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between" 
                            onClick={() => router.push(`/admin/training/${mod.id}/builder`)}
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold uppercase tracking-wider ${
                                        mod.language === 'python' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                                    }`}>
                                        {mod.language}
                                    </div>
                                    {!mod.isPublished ? (
                                        <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                            <Edit3 className="w-3 h-3" /> Draft
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                            <BookCheck className="w-3 h-3" /> Published
                                        </span>
                                    )}
                                </div>
                                
                                <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                                    {mod.title}
                                </h3>
                                {mod.boardAligned && (
                                    <p className="text-xs text-slate-500 font-medium mt-1">
                                        {mod.boardAligned} mapped • Class {mod.classLevel}
                                    </p>
                                )}
                            </div>
                            
                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex gap-4">
                                    <div>
                                        <div className="text-lg font-bold text-slate-800 dark:text-slate-200">{mod._count?.units || mod.totalUnits || 0}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Units</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold text-slate-800 dark:text-slate-200">{mod.totalExercises || 0}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Exercises</div>
                                    </div>
                                </div>
                                <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 flex items-center justify-center transition-colors">
                                    <MoveRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* 5-Step Training Module Creator Wizard */}
            <TrainingModuleWizard
                isOpen={showWizard}
                onClose={() => setShowWizard(false)}
                availableClasses={classes}
                onSuccess={() => loadData()}
            />
        </div>
    );
}

