'use client';

import React, { useState, useMemo } from 'react';
import {
    GraduationCap,
    BookOpen,
    Code,
    CheckCircle2,
    XCircle,
    ChevronDown,
    ChevronRight,
    Sparkles,
    CheckSquare,
    Square,
    Loader2,
    ExternalLink,
    FileText,
    Copy,
    Check,
    Sigma,
    Bug,
    BarChart2,
    HelpCircle,
    Layers,
    Clock,
    Zap,
    Award
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import MathRenderer from './MathRenderer';

export default function TrainingModuleConfirmCard({ action }) {
    if (!action) return null;

    const [title, setTitle] = useState(action.title || 'Engineering Mathematics & Python Scientific Computing');
    const [description, setDescription] = useState(action.description || 'Comprehensive engineering mathematics & scientific programming module');
    const [language, setLanguage] = useState(action.language || 'python');
    const [classLevel, setClassLevel] = useState(action.classLevel || 11);
    const [boardAligned, setBoardAligned] = useState(action.boardAligned || 'CBSE / Engineering Mathematics');

    const [units, setUnits] = useState(() => action.units || []);
    const [exercises, setExercises] = useState(() => (action.exercises || []).map((ex, i) => ({ ...ex, _selected: true, _id: i })));

    const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
    const [expandedUnit, setExpandedUnit] = useState(0); // Unit 1 expanded by default
    const [previewExercise, setPreviewExercise] = useState(null);
    const [showTheoryUnit, setShowTheoryUnit] = useState(null); // Accordion to inspect extracted theory

    const [loading, setLoading] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(action.isConfirmed || false);
    const [createdModule, setCreatedModule] = useState(null);
    const [copiedCode, setCopiedCode] = useState(false);

    // Extract or parse structured theory data for a unit
    const getParsedUnitTheory = (u) => {
        if (!u) return null;
        if (typeof u.theory === 'object' && u.theory !== null) return u.theory;
        if (u.description) {
            try {
                const parsed = JSON.parse(u.description);
                if (parsed && typeof parsed === 'object') return parsed;
            } catch (e) {
                return { content: u.description };
            }
        }
        return null;
    };

    // Filter exercises by selected question type
    const filteredExercises = useMemo(() => {
        if (selectedTypeFilter === 'all') return exercises;
        return exercises.filter(e => e.exerciseType === selectedTypeFilter);
    }, [exercises, selectedTypeFilter]);

    const selectedCount = exercises.filter(e => e._selected).length;

    const toggleSelectAll = () => {
        const allSelected = selectedCount === exercises.length;
        setExercises(prev => prev.map(e => ({ ...e, _selected: !allSelected })));
    };

    const toggleExercise = (id) => {
        setExercises(prev => prev.map(e => e._id === id ? { ...e, _selected: !e._selected } : e));
    };

    // Exercise type metadata & icon mappings
    const getExerciseTypeMeta = (type) => {
        switch (type) {
            case 'math_problem':
                return {
                    label: 'Math Problem',
                    icon: <Sigma className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
                    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                };
            case 'applied_math_code':
            case 'coding':
                return {
                    label: 'Python Program',
                    icon: <Code className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
                    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                };
            case 'formula_derivation':
                return {
                    label: 'Formula Proof / Derivation',
                    icon: <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />,
                    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                };
            case 'bug_fix':
                return {
                    label: 'Algorithm Bug Fix',
                    icon: <Bug className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
                    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                };
            case 'graph_plot':
                return {
                    label: 'Function Plotting',
                    icon: <BarChart2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
                    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                };
            case 'mcq':
                return {
                    label: 'Concept Quiz / MCQ',
                    icon: <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
                    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                };
            case 'code_trace':
                return {
                    label: 'Algorithm Trace',
                    icon: <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />,
                    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800'
                };
            default:
                return {
                    label: 'Exercise',
                    icon: <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />,
                    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                };
        }
    };

    // Question type counts
    const typeCounts = useMemo(() => {
        const counts = { all: exercises.length };
        exercises.forEach(e => {
            const t = e.exerciseType || 'coding';
            counts[t] = (counts[t] || 0) + 1;
        });
        return counts;
    }, [exercises]);

    // Confirm & Save Module via /api/admin/chatbot/load-data
    const handleConfirmCreate = async () => {
        const selectedExercises = exercises.filter(e => e._selected);
        if (selectedExercises.length === 0) {
            toast.error('Please select at least one exercise to include in the module');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/admin/chatbot/load-data', {
                actionType: 'training_module_create',
                moduleData: {
                    title: title.trim(),
                    description: description.trim(),
                    language,
                    classLevel: parseInt(classLevel, 10),
                    boardAligned,
                    units,
                    exercises: selectedExercises
                }
            });

            if (res.data?.success) {
                setIsConfirmed(true);
                setCreatedModule(res.data.data?.module || { title, id: 'latest' });
                toast.success(res.data.message || `Training Module "${title}" created successfully!`);
                window.dispatchEvent(new CustomEvent('training-modules-updated'));
            } else {
                toast.error(res.data?.message || 'Failed to create training module');
            }
        } catch (err) {
            console.error('Create module error:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to create module');
        } finally {
            setLoading(false);
        }
    };

    const copyCodeToClipboard = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
        toast.success('Code copied to clipboard');
    };

    return (
        <div className="mt-3 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 shadow-xl overflow-hidden text-xs">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm leading-tight">{title}</h4>
                            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold">
                                {action.sourceDocument || 'Syllabus / Reference Ebook'}
                            </span>
                        </div>
                        <p className="text-[11px] text-purple-100 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{units.length} Units • {exercises.length} Exercises Generated • Board: {boardAligned}</span>
                            <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px] font-semibold tracking-wide">
                                ⚡ Max 2 Chapters Active
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-black/20 text-[11px] font-semibold">
                        {selectedCount}/{exercises.length} Selected
                    </span>
                </div>
            </div>

            {/* Config & Question Variety Pills */}
            <div className="px-4 py-2.5 bg-purple-50/50 dark:bg-purple-950/20 border-b border-purple-100 dark:border-purple-900/40 flex flex-wrap items-center justify-between gap-2">
                {/* Question Type Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        onClick={() => setSelectedTypeFilter('all')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                            selectedTypeFilter === 'all'
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-100 dark:hover:bg-slate-700'
                        }`}
                    >
                        All ({typeCounts.all})
                    </button>
                    {typeCounts.math_problem > 0 && (
                        <button
                            onClick={() => setSelectedTypeFilter('math_problem')}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition ${
                                selectedTypeFilter === 'math_problem'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                            }`}
                        >
                            <Sigma className="w-3 h-3" />
                            <span>Math ({typeCounts.math_problem})</span>
                        </button>
                    )}
                    {typeCounts.applied_math_code > 0 && (
                        <button
                            onClick={() => setSelectedTypeFilter('applied_math_code')}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition ${
                                selectedTypeFilter === 'applied_math_code'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                            }`}
                        >
                            <Code className="w-3 h-3" />
                            <span>Python ({typeCounts.applied_math_code})</span>
                        </button>
                    )}
                    {typeCounts.formula_derivation > 0 && (
                        <button
                            onClick={() => setSelectedTypeFilter('formula_derivation')}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition ${
                                selectedTypeFilter === 'formula_derivation'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                            }`}
                        >
                            <BookOpen className="w-3 h-3" />
                            <span>Proofs ({typeCounts.formula_derivation})</span>
                        </button>
                    )}
                    {typeCounts.bug_fix > 0 && (
                        <button
                            onClick={() => setSelectedTypeFilter('bug_fix')}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition ${
                                selectedTypeFilter === 'bug_fix'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                            }`}
                        >
                            <Bug className="w-3 h-3" />
                            <span>Bug Fix ({typeCounts.bug_fix})</span>
                        </button>
                    )}
                    {typeCounts.graph_plot > 0 && (
                        <button
                            onClick={() => setSelectedTypeFilter('graph_plot')}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition ${
                                selectedTypeFilter === 'graph_plot'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                            }`}
                        >
                            <BarChart2 className="w-3 h-3" />
                            <span>Plotting ({typeCounts.graph_plot})</span>
                        </button>
                    )}
                    {typeCounts.mcq > 0 && (
                        <button
                            onClick={() => setSelectedTypeFilter('mcq')}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition ${
                                selectedTypeFilter === 'mcq'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                            }`}
                        >
                            <HelpCircle className="w-3 h-3" />
                            <span>Quiz ({typeCounts.mcq})</span>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        disabled={isConfirmed}
                        onClick={toggleSelectAll}
                        className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition"
                    >
                        {selectedCount === exercises.length ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
            </div>

            {/* Units & Exercises List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-2 scrollbar-thin">
                {units.map((u, uIdx) => {
                    const unitExercises = filteredExercises.filter(e => e.unitIndex === uIdx || e.unitNumber === (uIdx + 1));
                    const isUnitExpanded = expandedUnit === uIdx;

                    return (
                        <div key={uIdx} className="rounded-xl overflow-hidden mb-2 border border-slate-200 dark:border-slate-800">
                            {/* Unit Header */}
                            <div
                                onClick={() => setExpandedUnit(isUnitExpanded ? -1 : uIdx)}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                <div className="flex items-center gap-2">
                                    {isUnitExpanded ? (
                                        <ChevronDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                    ) : (
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                        {u.title}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        ({unitExercises.length} questions • ~{u.expectedHours || 2}h)
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowTheoryUnit(showTheoryUnit === uIdx ? null : uIdx);
                                        }}
                                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/80 dark:hover:bg-purple-900/80 text-purple-800 dark:text-purple-300 flex items-center gap-1 transition"
                                        title="View Chapter Theory Notes extracted from book"
                                    >
                                        <BookOpen className="w-3 h-3" />
                                        <span>{showTheoryUnit === uIdx ? 'Hide Theory' : '📖 Theory Notes'}</span>
                                    </button>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold">
                                        Unit {u.unitNumber || (uIdx + 1)}
                                    </span>
                                </div>
                            </div>

                            {/* Extracted Chapter Theory Preview Drawer */}
                            {showTheoryUnit === uIdx && (() => {
                                const theory = getParsedUnitTheory(u);
                                if (!theory) {
                                    return (
                                        <div className="p-3 bg-purple-50/50 dark:bg-purple-950/30 text-slate-500 text-xs text-center border-b border-purple-100 dark:border-purple-900/40">
                                            No detailed theory notes populated for this unit.
                                        </div>
                                    );
                                }
                                return (
                                    <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 border-b border-purple-100 dark:border-purple-900/40 text-xs space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5 text-xs">
                                                <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                                                Grounded Theory & Textbook Concept Notes
                                            </span>
                                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                                Persisted into Student Theory Viewer
                                            </span>
                                        </div>

                                        {theory.summary && (
                                            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/50 text-[11px] text-slate-700 dark:text-slate-300">
                                                <strong className="text-purple-700 dark:text-purple-300">Summary: </strong>
                                                <MathRenderer content={theory.summary} inline size="sm" />
                                            </div>
                                        )}

                                        {Array.isArray(theory.keyConcepts) && theory.keyConcepts.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {theory.keyConcepts.map((kc, kcIdx) => (
                                                    <span key={kcIdx} className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 text-[10px] font-medium">
                                                        • {typeof kc === 'string' ? kc : (kc.title || kc.name || JSON.stringify(kc))}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {theory.content && (
                                            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/50 text-[11px] max-h-48 overflow-y-auto scrollbar-thin text-slate-700 dark:text-slate-300">
                                                <MathRenderer content={theory.content} size="sm" />
                                            </div>
                                        )}

                                        {Array.isArray(theory.cbseTips) && theory.cbseTips.length > 0 && (
                                            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[10px] text-amber-900 dark:text-amber-200 space-y-0.5">
                                                <strong className="text-amber-800 dark:text-amber-300 block">💡 Exam Tips & Pitfalls:</strong>
                                                {theory.cbseTips.map((tip, tIdx) => (
                                                    <p key={tIdx}>• {tip}</p>
                                                ))}
                                            </div>
                                        )}

                                        {Array.isArray(theory.miniCheckpoints) && theory.miniCheckpoints.length > 0 && (
                                            <div className="pt-1">
                                                <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300">
                                                    {theory.miniCheckpoints.length} Interactive Mini-Checkpoints:
                                                </span>
                                                <div className="mt-1 space-y-1">
                                                    {theory.miniCheckpoints.map((cp, cpIdx) => (
                                                        <div key={cpIdx} className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px]">
                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">Q{cpIdx + 1}: {cp.question}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Exercises within Unit */}
                            {isUnitExpanded && (
                                <div className="p-2 divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                                    {unitExercises.length === 0 ? (
                                        <div className="p-3 text-center text-slate-400 text-[11px]">
                                            No exercises match this question filter in this unit
                                        </div>
                                    ) : (
                                        unitExercises.map(ex => {
                                            const meta = getExerciseTypeMeta(ex.exerciseType);
                                            return (
                                                <div
                                                    key={ex._id}
                                                    className={`p-2.5 rounded-lg flex items-start gap-2.5 transition ${
                                                        ex._selected
                                                            ? 'hover:bg-purple-50/40 dark:hover:bg-purple-950/20'
                                                            : 'opacity-50 hover:opacity-80'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={!!ex._selected}
                                                        onChange={() => toggleExercise(ex._id)}
                                                        disabled={isConfirmed}
                                                        className="mt-1 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                    />

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                                                {ex.title}
                                                            </span>
                                                            <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold flex items-center gap-1 ${meta.badgeClass}`}>
                                                                {meta.icon}
                                                                {meta.label}
                                                            </span>
                                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium capitalize">
                                                                {ex.difficulty || 'medium'}
                                                            </span>
                                                        </div>

                                                        {/* Description with KaTeX / Math rendering */}
                                                        <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                                                            <MathRenderer content={ex.description} size="sm" />
                                                        </div>

                                                        {/* Math formulas if present */}
                                                        {ex.mathFormulas && ex.mathFormulas.length > 0 && (
                                                            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                                                {ex.mathFormulas.slice(0, 2).map((formula, fIdx) => (
                                                                    <span
                                                                        key={fIdx}
                                                                        className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 text-[10px] font-mono text-purple-900 dark:text-purple-200"
                                                                    >
                                                                        <MathRenderer content={`$${formula}$`} inline size="sm" />
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewExercise(previewExercise?._id === ex._id ? null : ex)}
                                                        className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 self-center flex-shrink-0"
                                                    >
                                                        {previewExercise?._id === ex._id ? 'Close' : 'Inspect'}
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Exercise Detail Drawer Modal / Inspector */}
            {previewExercise && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-purple-100 dark:border-purple-900/40">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                {previewExercise.title}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold">
                                {previewExercise.exerciseType}
                            </span>
                        </div>
                        <button
                            onClick={() => setPreviewExercise(null)}
                            className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                            ✕ Close
                        </button>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] space-y-2">
                        <div>
                            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Problem Statement:</span>
                            <MathRenderer content={previewExercise.description} />
                        </div>

                        {previewExercise.mathFormulas && (
                            <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Key Equations / Formulas:</span>
                                <div className="space-y-1">
                                    {previewExercise.mathFormulas.map((f, i) => (
                                        <div key={i} className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded font-mono text-purple-700 dark:text-purple-300">
                                            <MathRenderer content={`$$${f}$$`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {previewExercise.starterCode && (
                            <div>
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Python Starter Code:</span>
                                    <button
                                        onClick={() => copyCodeToClipboard(previewExercise.starterCode)}
                                        className="text-[10px] text-purple-600 hover:underline flex items-center gap-1"
                                    >
                                        {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        {copiedCode ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                                <pre className="p-2 bg-slate-900 text-slate-100 rounded-lg font-mono text-[10px] overflow-x-auto">
                                    <code>{previewExercise.starterCode}</code>
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Post-Creation Success or Action Footer */}
            {isConfirmed && createdModule ? (
                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border-t border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h5 className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                                    Training Module Created Successfully!
                                </h5>
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                    &quot;{title}&quot; is now available with {selectedCount} exercises.
                                </p>
                            </div>
                        </div>

                        <a
                            href={`/admin/training`}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-emerald-700 shadow-xs transition"
                        >
                            <span>Open in Training Center</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                </div>
            ) : (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {selectedCount === 0 ? (
                            <span className="text-amber-600 font-medium">Select at least one exercise to enable creation</span>
                        ) : (
                            <span>Will create <strong>{units.length} units</strong> with <strong>{selectedCount} exercises</strong></span>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleConfirmCreate}
                        disabled={selectedCount === 0 || loading || isConfirmed}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Generating Curriculum & Exercises...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirm & Create Training Module ({selectedCount} Exercises)</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
