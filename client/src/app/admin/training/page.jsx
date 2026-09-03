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
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingModule, setEditingModule] = useState(null);
    const [editForm, setEditForm] = useState({
        title: '',
        titleHindi: '',
        description: '',
        language: 'python',
        boardAligned: 'CBSE',
        classLevel: 11
    });

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

    const handleOpenEditModule = (e, mod) => {
        e.stopPropagation();
        setEditingModule(mod);
        setEditForm({
            title: mod.title || '',
            titleHindi: mod.titleHindi || '',
            description: mod.description || '',
            language: mod.language || 'python',
            boardAligned: mod.boardAligned || 'CBSE',
            classLevel: mod.classLevel || 11
        });
        setShowEditModal(true);
    };

    const handleSaveModule = async (e) => {
        e.preventDefault();
        if (!editForm.title.trim()) {
            toast.error('Module title is required');
            return;
        }
        try {
            await trainingAPI.updateModule(editingModule.id, editForm);
            toast.success('Course module settings updated!');
            setShowEditModal(false);
            setEditingModule(null);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update module');
        }
    };

    const handleDeleteModule = async (e, modId, modTitle) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to delete "${modTitle}"? All units, exercises, and student progress will be removed.`)) {
            return;
        }
        try {
            await trainingAPI.deleteModule(modId);
            toast.success('Course module deleted successfully');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete module');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <PageHeader title="Training Module Builder" titleHindi="प्रशिक्षण मॉड्यूल निर्माता">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowWizard(true)} 
                        className="btn bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-indigo-600/20 text-xs py-2 px-4 rounded-xl flex items-center gap-2 transition"
                    >
                        <Sparkles className="w-4 h-4" /> ✨ Create Course Module
                    </button>
                </div>
            </PageHeader>

            <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 border-b border-slate-200 dark:border-slate-800">
                <div className="mb-6 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-200 dark:border-indigo-800 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/25">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">CBSE Pedagogy & AI Mastery LMS Engine</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                                Build mastery-based pedagogy courses with multi-modal challenges: <strong>Coding Labs</strong>, <strong>Pre-Lab Theory & Mini-Checks</strong>, <strong>Assertion-Reasoning</strong>, <strong>Dry-Run Tracing</strong>, and <strong>CBSE Error Debugging</strong>.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5">
                            <BookCheck className="w-3.5 h-3.5" /> CBSE Class 11 & 12
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> AI Curriculum Synthesizer
                        </span>
                    </div>
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
                                    <div className="flex items-center gap-1.5">
                                        {!mod.isPublished ? (
                                            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                Draft
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                                <BookCheck className="w-3 h-3" /> Published
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => handleOpenEditModule(e, mod)}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                            title="Edit Course Settings"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteModule(e, mod.id, mod.title)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                            title="Delete Course Module"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
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

            {/* Quick Edit Module Metadata Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                                <Edit3 className="w-4 h-4 text-indigo-500" /> Edit Course Settings
                            </h3>
                            <button onClick={() => setShowEditModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSaveModule} className="p-6 space-y-4">
                            <div>
                                <label className="label">Course Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.title}
                                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                    className="input font-bold"
                                    placeholder="e.g. Python Data Structures & Algorithms"
                                />
                            </div>
                            <div>
                                <label className="label">Hindi Subtitle (Optional)</label>
                                <input
                                    type="text"
                                    value={editForm.titleHindi}
                                    onChange={e => setEditForm(f => ({ ...f, titleHindi: e.target.value }))}
                                    className="input"
                                    placeholder="e.g. पायथन डेटा संरचना और एल्गोरिदम"
                                />
                            </div>
                            <div>
                                <label className="label">Overview / Description</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                    className="input h-20 text-xs"
                                    placeholder="Course description and learning objectives..."
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="label">Language</label>
                                    <select
                                        value={editForm.language}
                                        onChange={e => setEditForm(f => ({ ...f, language: e.target.value }))}
                                        className="input text-xs"
                                    >
                                        <option value="python">Python</option>
                                        <option value="javascript">JavaScript</option>
                                        <option value="cpp">C++</option>
                                        <option value="java">Java</option>
                                        <option value="sql">SQL</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Board</label>
                                    <select
                                        value={editForm.boardAligned}
                                        onChange={e => setEditForm(f => ({ ...f, boardAligned: e.target.value }))}
                                        className="input text-xs"
                                    >
                                        <option value="CBSE">CBSE</option>
                                        <option value="PSEB">PSEB</option>
                                        <option value="ICSE">ICSE</option>
                                        <option value="Custom">Custom</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Class Level</label>
                                    <select
                                        value={editForm.classLevel}
                                        onChange={e => setEditForm(f => ({ ...f, classLevel: Number(e.target.value) }))}
                                        className="input text-xs"
                                    >
                                        <option value={11}>Class 11</option>
                                        <option value={12}>Class 12</option>
                                        <option value={10}>Class 10</option>
                                        <option value={9}>Class 9</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary text-xs">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary text-xs font-bold">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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

