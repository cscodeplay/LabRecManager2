'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { trainingAPI, classesAPI } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import { 
    GraduationCap, Clock, Award, ChevronRight, BookOpen, 
    AlertCircle, Plus, Sparkles, Edit3, BookCheck, ShieldCheck, Zap
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import TrainingModuleWizard from '@/components/TrainingModuleWizard';

export default function TrainingModulesPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [modules, setModules] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showWizard, setShowWizard] = useState(false);

    const isInstructorOrAdmin = user?.role === 'admin' || user?.role === 'principal' || user?.role === 'instructor' || user?.role === 'lab_assistant';

    const fetchModules = async () => {
        try {
            const [modRes, classRes] = await Promise.all([
                trainingAPI.getModules(),
                isInstructorOrAdmin ? classesAPI.getAll().catch(() => ({ data: { data: { classes: [] } } })) : Promise.resolve({ data: { data: { classes: [] } } })
            ]);
            
            if (modRes.data.success) {
                setModules(modRes.data.data.modules || []);
            }
            if (classRes.data?.data?.classes) {
                setClasses(classRes.data.data.classes);
            }
        } catch (error) {
            console.error('Error fetching training modules:', error);
            toast.error('Failed to load training modules');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        fetchModules();
    }, [_hasHydrated, isAuthenticated, router]);

    const totalAvailableExercises = modules.reduce((acc, m) => acc + (m.totalExercises || 0), 0);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            <PageHeader 
                title="Training & Coding LMS" 
                description="Self-paced mastery learning, interactive coding labs & automated AI pedagogy"
                icon={GraduationCap}
            >
                {isInstructorOrAdmin && (
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowWizard(true)}
                            className="btn bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs py-2 px-3.5 rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition"
                        >
                            <Sparkles className="w-4 h-4" /> ✨ Create Training Module
                        </button>
                        <Link 
                            href="/admin/training" 
                            className="btn btn-secondary text-xs py-2 px-3 rounded-xl hidden md:flex items-center gap-1.5 font-bold"
                        >
                            <Edit3 className="w-3.5 h-3.5" /> Pedagogy Builder
                        </Link>
                    </div>
                )}
            </PageHeader>

            {/* Top Stat Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">{modules.length}</div>
                        <div className="text-[11px] text-slate-500">Active Courses</div>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <Zap className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">{totalAvailableExercises}</div>
                        <div className="text-[11px] text-slate-500">Total Exercises</div>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                        <Award className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xl font-bold text-amber-600 dark:text-amber-400">Mastery XP</div>
                        <div className="text-[11px] text-slate-500">Earned in Arena</div>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xl font-bold text-purple-600 dark:text-purple-400">80% Gate</div>
                        <div className="text-[11px] text-slate-500">Unit Mastery Lock</div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                </div>
            ) : modules.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-lg">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Training Modules Available</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm">
                        {isInstructorOrAdmin 
                            ? 'Get started by creating your first pedagogy-aligned training course using the wizard or AI generator.' 
                            : 'There are currently no published training modules for your school. Please check back later.'}
                    </p>
                    {isInstructorOrAdmin && (
                        <button onClick={() => setShowWizard(true)} className="mt-5 btn btn-primary text-xs font-bold py-2.5 px-6 rounded-2xl">
                            <Sparkles className="w-4 h-4" /> Create Course Now
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map((mod) => (
                        <div 
                            key={mod.id}
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col justify-between"
                        >
                            <div>
                                <div className="h-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />
                                
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <BookOpen className="w-6 h-6" />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-full capitalize">
                                                {mod.language}
                                            </span>
                                            {isInstructorOrAdmin && (
                                                mod.isPublished ? (
                                                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                                                        Published
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold rounded-full">
                                                        Draft
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5 line-clamp-2">
                                        {mod.title}
                                    </h3>
                                    {mod.titleHindi && (
                                        <p className="text-xs text-slate-400 font-medium mb-2">{mod.titleHindi}</p>
                                    )}
                                    
                                    {mod.description && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                                            {mod.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 pt-0">
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                                        <span>{mod.totalUnits || mod._count?.units || 0} Units</span>
                                        <span>•</span>
                                        <span>{mod.totalExercises || 0} Exercises</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {isInstructorOrAdmin && (
                                            <button
                                                onClick={() => router.push(`/admin/training/${mod.id}/builder`)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950 transition"
                                                title="Edit in Pedagogy Builder"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        )}
                                        <Link
                                            href={`/training/${mod.id}`}
                                            className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1.5 px-3.5 rounded-xl flex items-center gap-1 shadow-sm"
                                        >
                                            <span>Enter Course</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 5-Step Training Module Creator Wizard */}
            <TrainingModuleWizard
                isOpen={showWizard}
                onClose={() => setShowWizard(false)}
                availableClasses={classes}
                onSuccess={() => fetchModules()}
            />
        </div>
    );
}

