'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { trainingAPI, classesAPI } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import { 
    GraduationCap, Clock, Award, ChevronRight, BookOpen, 
    AlertCircle, Plus, Sparkles, Edit3, Trash2, BookCheck, ShieldCheck, Zap,
    Users, UserCheck, UserPlus, LayoutGrid, List, BarChart2
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import TrainingModuleWizard from '@/components/TrainingModuleWizard';
import ConfirmDialog from '@/components/ConfirmDialog';
import ModuleAssignmentModal from '@/components/ModuleAssignmentModal';
import AdminTrainingProgressModal from '@/components/AdminTrainingProgressModal';

export default function TrainingModulesPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [modules, setModules] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showWizard, setShowWizard] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [assigningModule, setAssigningModule] = useState(null);
    const [progressModalModule, setProgressModalModule] = useState(null);
    const [deleteModalState, setDeleteModalState] = useState({
        isOpen: false,
        moduleId: null,
        moduleTitle: '',
        isDeleting: false
    });

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

    const handleDeleteClick = (e, mod) => {
        e.stopPropagation();
        setDeleteModalState({
            isOpen: true,
            moduleId: mod.id,
            moduleTitle: mod.title,
            isDeleting: false
        });
    };

    const handleConfirmDelete = async () => {
        if (!deleteModalState.moduleId) return;
        setDeleteModalState(prev => ({ ...prev, isDeleting: true }));
        try {
            await trainingAPI.deleteModule(deleteModalState.moduleId);
            toast.success(`"${deleteModalState.moduleTitle}" deleted successfully`);
            setDeleteModalState({ isOpen: false, moduleId: null, moduleTitle: '', isDeleting: false });
            fetchModules();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete module');
            setDeleteModalState(prev => ({ ...prev, isDeleting: false }));
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
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button 
                            type="button" 
                            onClick={() => setViewMode('grid')} 
                            className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`} 
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setViewMode('list')} 
                            className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`} 
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    {isInstructorOrAdmin && (
                        <>
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
                        </>
                    )}
                </div>
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
            ) : viewMode === 'grid' ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map((mod) => {
                        const assignedClasses = [];
                        const assignedGroups = [];
                        const assignedStudents = [];
                        const seenC = new Set();
                        const seenG = new Set();
                        const seenS = new Set();

                        (mod.assignments || []).forEach(a => {
                            (a.targets || []).forEach(t => {
                                const cName = t.className || (t.targetClassId && classes.find(c => c.id === t.targetClassId)?.name) || (t.targetClassId ? 'Class' : null);
                                if (t.targetType === 'class' && cName && !seenC.has(cName)) {
                                    seenC.add(cName);
                                    assignedClasses.push(cName);
                                }
                                const gName = t.groupName || (t.targetGroupId ? 'Group' : null);
                                if (t.targetType === 'group' && gName && !seenG.has(gName)) {
                                    seenG.add(gName);
                                    assignedGroups.push(gName);
                                }
                                const sName = t.studentName || (t.targetStudentId ? 'Student' : null);
                                if (t.targetType === 'student' && sName && !seenS.has(sName)) {
                                    seenS.add(sName);
                                    assignedStudents.push(sName);
                                }
                            });
                        });

                        const hasAssignments = assignedClasses.length > 0 || assignedGroups.length > 0 || assignedStudents.length > 0;

                        return (
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

                                        {/* Assigned Entities Badges */}
                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
                                            {hasAssignments ? (
                                                <>
                                                    {assignedClasses.map((cls, i) => (
                                                        <span key={`c-${i}`} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                            <GraduationCap className="w-3 h-3 text-blue-500" />
                                                            {cls}
                                                        </span>
                                                    ))}
                                                    {assignedGroups.map((grp, i) => (
                                                        <span key={`g-${i}`} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                            <Users className="w-3 h-3 text-purple-500" />
                                                            {grp}
                                                        </span>
                                                    ))}
                                                    {assignedStudents.map((std, i) => (
                                                        <span key={`s-${i}`} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                            <UserCheck className="w-3 h-3 text-emerald-500" />
                                                            {std}
                                                        </span>
                                                    ))}
                                                </>
                                            ) : (
                                                <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 pt-0">
                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                                            <span>{mod.totalUnits || mod._count?.units || 0} Units</span>
                                            <span>•</span>
                                            <span>{mod.totalExercises || 0} Exercises</span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {isInstructorOrAdmin && (
                                                <>
                                                    <button
                                                        onClick={() => setProgressModalModule(mod)}
                                                        className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition"
                                                        title="Student Progress Dashboard"
                                                    >
                                                        <BarChart2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setAssigningModule(mod)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                                                        title="Assign or Edit Target Classes/Groups/Students"
                                                    >
                                                        <UserPlus className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => router.push(`/admin/training/${mod.id}/builder`)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950 transition"
                                                        title="Edit in Pedagogy Builder"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteClick(e, mod)}
                                                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                                        title="Delete Course Module"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            <Link
                                                href={`/training/${mod.id}`}
                                                className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1.5 px-3.5 rounded-xl flex items-center gap-1 shadow-sm ml-1"
                                            >
                                                <span>Enter Course</span>
                                                <ChevronRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* List View Table */
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[750px] text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                                    <th className="py-3.5 px-5">Course Module</th>
                                    <th className="py-3.5 px-3">Subject / Lang</th>
                                    <th className="py-3.5 px-3">Board & Level</th>
                                    <th className="py-3.5 px-3 text-center">Units</th>
                                    <th className="py-3.5 px-3 text-center">Exercises</th>
                                    <th className="py-3.5 px-3 text-center">Assigned</th>
                                    <th className="py-3.5 px-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {modules.map(mod => {
                                    const assignedClasses = [];
                                    const assignedGroups = [];
                                    const seenC = new Set();
                                    const seenG = new Set();

                                    (mod.assignments || []).forEach(a => {
                                        (a.targets || []).forEach(t => {
                                            const cName = t.className || (t.targetClassId && classes.find(c => c.id === t.targetClassId)?.name) || (t.targetClassId ? 'Class' : null);
                                            if (t.targetType === 'class' && cName && !seenC.has(cName)) {
                                                seenC.add(cName);
                                                assignedClasses.push(cName);
                                            }
                                            const gName = t.groupName || (t.targetGroupId ? 'Group' : null);
                                            if (t.targetType === 'group' && gName && !seenG.has(gName)) {
                                                seenG.add(gName);
                                                assignedGroups.push(gName);
                                            }
                                        });
                                    });
                                    const hasAssignments = assignedClasses.length > 0 || assignedGroups.length > 0;

                                    return (
                                        <tr 
                                            key={mod.id}
                                            onClick={() => router.push(`/training/${mod.id}`)}
                                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition group"
                                        >
                                            <td className="py-3.5 px-5">
                                                <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition text-sm">
                                                    {mod.title}
                                                </div>
                                                {mod.titleHindi && (
                                                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                                        {mod.titleHindi}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-3">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                                                    mod.language === 'python' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                                                }`}>
                                                    {mod.language}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-3 font-medium text-slate-600 dark:text-slate-300">
                                                {mod.boardAligned || 'CBSE'} • Class {mod.classLevel || 11}
                                            </td>
                                            <td className="py-3.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                                                {mod.totalUnits || mod._count?.units || 0}
                                            </td>
                                            <td className="py-3.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                                                {mod.totalExercises || 0}
                                            </td>
                                            <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                                                    {hasAssignments 
                                                        ? (assignedClasses.length > 0 ? assignedClasses.join(', ') : `${assignedGroups.length} Groups`)
                                                        : <span className="text-slate-400 italic">Unassigned</span>}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {isInstructorOrAdmin && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => setProgressModalModule(mod)}
                                                                className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition"
                                                                title="Student Progress Dashboard"
                                                            >
                                                                <BarChart2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setAssigningModule(mod)}
                                                                className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                                title="Assign Course"
                                                            >
                                                                <UserPlus className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => router.push(`/admin/training/${mod.id}/builder`)}
                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                                                title="Edit in Builder"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleDeleteClick(e, mod)}
                                                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                                                title="Delete Course"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                    <Link
                                                        href={`/training/${mod.id}`}
                                                        className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center gap-1 shadow-xs ml-1"
                                                    >
                                                        <span>Enter</span>
                                                        <ChevronRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Admin Student Progress Dashboard Modal */}
            {progressModalModule && (
                <AdminTrainingProgressModal
                    isOpen={!!progressModalModule}
                    moduleId={progressModalModule.id}
                    moduleTitle={progressModalModule.title}
                    onClose={() => setProgressModalModule(null)}
                />
            )}

            {/* 6-Step Training Module Creator Wizard */}
            <TrainingModuleWizard
                isOpen={showWizard}
                onClose={() => setShowWizard(false)}
                availableClasses={classes}
                onSuccess={() => fetchModules()}
            />

            {/* Module Assignment Modal */}
            {assigningModule && (
                <ModuleAssignmentModal
                    isOpen={!!assigningModule}
                    module={assigningModule}
                    onClose={() => setAssigningModule(null)}
                    onSuccess={() => {
                        setAssigningModule(null);
                        fetchModules();
                    }}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteModalState.isOpen}
                onClose={() => setDeleteModalState({ isOpen: false, moduleId: null, moduleTitle: '', isDeleting: false })}
                onConfirm={handleConfirmDelete}
                title="Delete Training Module"
                message={`Are you sure you want to delete "${deleteModalState.moduleTitle}"? All associated units, exercises, and student progress records will be permanently removed.`}
                confirmText="Delete Module"
                type="danger"
                loading={deleteModalState.isDeleting}
            />
        </div>
    );
}

