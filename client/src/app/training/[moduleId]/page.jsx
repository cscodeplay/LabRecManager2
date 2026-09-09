'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { trainingAPI } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import { 
    BookOpen, CheckCircle, Lock, PlayCircle, Clock, ArrowRight, Code2,
    Users, GraduationCap, UserCheck, Edit3 
} from 'lucide-react';
import toast from 'react-hot-toast';
import TrainingLiveBanner from '@/components/TrainingLiveBanner';
import ModuleAssignmentModal from '@/components/ModuleAssignmentModal';

export default function TrainingModulePage() {
    const { moduleId } = useParams();
    const router = useRouter();
    const { isAuthenticated, user } = useAuthStore();
    
    const [module, setModule] = useState(null);
    const [progress, setProgress] = useState(null);
    const [masteries, setMasteries] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignmentInfo, setAssignmentInfo] = useState(null);
    const [lectureInfo, setLectureInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    const isInstructorOrAdmin = ['admin', 'principal', 'instructor', 'lab_assistant'].includes(user?.role);

    const fetchModule = async () => {
        try {
            const res = await trainingAPI.getModuleDetails(moduleId);
            setModule(res.data.data.module);
            setProgress(res.data.data.progress);
            setMasteries(res.data.data.unitMasteries || []);
            setAssignments(res.data.data.assignments || []);
            setAssignmentInfo(res.data.data.assignmentInfo || null);
            setLectureInfo(res.data.data.lectureInfo || null);
        } catch (err) {
            toast.error('Failed to load training module');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
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

    const assignedClasses = [];
    const assignedGroups = [];
    const assignedStudents = [];
    const seenClass = new Set();
    const seenGroup = new Set();
    const seenStudent = new Set();

    (assignments || []).forEach(a => {
        (a.targets || []).forEach(t => {
            if (t.targetType === 'class' && t.className && !seenClass.has(t.className)) {
                seenClass.add(t.className);
                assignedClasses.push(t.className);
            }
            if (t.targetType === 'group' && t.groupName && !seenGroup.has(t.groupName)) {
                seenGroup.add(t.groupName);
                assignedGroups.push(t.groupName);
            }
            if (t.targetType === 'student' && t.studentName && !seenStudent.has(t.studentName)) {
                seenStudent.add(t.studentName);
                assignedStudents.push(t.studentName);
            }
        });
    });

    const hasAnyAssignments = assignedClasses.length > 0 || assignedGroups.length > 0 || assignedStudents.length > 0;

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader title={module.title} backLink="/assigned-work" />
            
            <main className="max-w-5xl mx-auto px-4 py-8">
                {/* Live Countdown & Live Lecture Notification Banner */}
                <TrainingLiveBanner assignmentInfo={assignmentInfo} lectureInfo={lectureInfo} className="mb-6" />

                {/* Header Card */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 pr-4">
                            <h1 className="text-2xl font-bold text-slate-900">{module.title}</h1>
                            <p className="text-slate-600 mt-2">{module.description}</p>
                            <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500">
                                <span>{module.units.length} Units</span>
                                <span>Language: {module.language}</span>
                                {progress?.totalXP !== undefined && (
                                    <span className="text-amber-600 font-bold">{progress.totalXP} XP Earned</span>
                                )}
                            </div>

                            {/* Assigned Entities Section */}
                            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center flex-wrap gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 text-indigo-500" /> Assigned To:
                                    </span>
                                    {hasAnyAssignments ? (
                                        <>
                                            {assignedClasses.map((cls, idx) => (
                                                <span key={`cls-${idx}`} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                                    <GraduationCap className="w-3 h-3 text-blue-500" />
                                                    {cls}
                                                </span>
                                            ))}
                                            {assignedGroups.map((grp, idx) => (
                                                <span key={`grp-${idx}`} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                                    <Users className="w-3 h-3 text-purple-500" />
                                                    {grp}
                                                </span>
                                            ))}
                                            {assignedStudents.map((std, idx) => (
                                                <span key={`std-${idx}`} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <UserCheck className="w-3 h-3 text-emerald-500" />
                                                    {std}
                                                </span>
                                            ))}
                                        </>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">
                                            Not assigned to any class, group, or student yet
                                        </span>
                                    )}
                                </div>
                                {isInstructorOrAdmin && (
                                    <button
                                        onClick={() => setShowAssignModal(true)}
                                        className="btn bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs py-1.5 px-3 rounded-lg font-semibold flex items-center gap-1.5 transition border border-indigo-200 shadow-xs"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>{hasAnyAssignments ? 'Edit Assignments' : 'Assign Module'}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="bg-emerald-50 rounded-full p-4 shrink-0">
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
                                        <h2 className="text-lg font-bold text-slate-800">Unit {unit.unitNumber}: {unit.title?.replace(/^(?:unit\s+\d+[:\s-]*)+/i, '')}</h2>
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
                                
                                <div className="p-5 space-y-4">
                                    {/* Stage 1: Pre-Lab Foundation — Theory & Interactive Checks (Displayed before exercises) */}
                                    <div 
                                        onClick={() => unlocked && router.push(`/training/${moduleId}/unit/${unit.id}/theory`)}
                                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                                            !unlocked 
                                                ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-60' 
                                                : 'bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-white dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 hover:shadow-md cursor-pointer group'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                <BookOpen className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                                        Stage 1: Pre-Lab Foundation
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-indigo-500" /> 10 min Pre-Lab Reading & Checks
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 group-hover:text-indigo-600 transition-colors">
                                                    Interactive Concept Notes & Comprehension Checkpoints
                                                </h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                    Master essential syntax boundaries, theoretical rules, and comprehension checkpoints before starting coding sandboxes.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2">
                                            <button
                                                disabled={!unlocked}
                                                className="btn btn-primary text-xs py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-500/20"
                                            >
                                                <span>Start Reading & Checks</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stage 2 & 3: Formative Practice Labs & Unit Tests */}
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <Code2 className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>Stage 2 & 3: Practice Labs & Mastery Assessments ({unit.exercises.length})</span>
                                        </div>
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
                                                    code_debug: { label: '🐞 CBSE Debug', bg: 'bg-red-50 text-red-700 border-red-200' },
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
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Module Assignment Modal */}
            {showAssignModal && (
                <ModuleAssignmentModal
                    isOpen={showAssignModal}
                    module={module}
                    onClose={() => setShowAssignModal(false)}
                    onSuccess={() => {
                        setShowAssignModal(false);
                        fetchModule();
                    }}
                />
            )}
        </div>
    );
}
