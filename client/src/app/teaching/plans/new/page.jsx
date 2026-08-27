'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';
import api, { teachingAPI, timetableAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import AICardCopilot from '@/components/AICardCopilot';
import VoiceInputButton from '@/components/VoiceInputButton';
import { Calendar, Save, ArrowLeft, CheckSquare, Plus, Trash2, Clock } from 'lucide-react';
import Link from 'next/link';

const LECTURE_TASK_PRESETS = {
    theory: [
        'Review previous class topic & check homework',
        'Explain core theory concepts and definitions',
        'Demonstrate board examples & solve problems',
        'Interactive student Q&A and doubt clearing',
        'Assign practice questions & homework reading'
    ],
    lab: [
        'Lab safety briefing & practical aim introduction',
        'Live algorithm / circuit / code demonstration',
        'Supervise individual student execution at workstations',
        'Inspect code output & conduct mini-viva assessment',
        'Verify and sign student practical records'
    ],
    revision: [
        'Rapid chapter summary & formula recap',
        'Solve previous year exam problems on board',
        'Targeted doubt solving for difficult topics'
    ]
};

export default function CreateLecturePlan() {
    const router = useRouter();
    const { t } = useTranslation('common');
    const { user, isAuthenticated, _hasHydrated, selectedSessionId } = useAuthStore();
    
    const [loading, setLoading] = useState(false);
    const [fetchingFormData, setFetchingFormData] = useState(true);
    
    // Form data
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [checklistTasks, setChecklistTasks] = useState([
        'Review previous class topic & check homework',
        'Explain core theory concepts and definitions',
        'Demonstrate board examples & solve problems',
        'Interactive student Q&A and doubt clearing'
    ]);
    const [newTaskInput, setNewTaskInput] = useState('');
    
    const [formData, setFormData] = useState({
        classId: '',
        subjectId: '',
        title: '',
        titleHindi: '',
        description: '',
        lectureNumber: 1,
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledDuration: 40,
        lectureType: 'theory',
        notes: '',
        homeworkDescription: ''
    });

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        
        const loadFormData = async () => {
            try {
                // Fetch classes and subjects for this instructor
                const [classesRes, subjectsRes] = await Promise.all([
                    api.get('/classes'),
                    api.get('/subjects')
                ]);
                
                setClasses(classesRes.data.data.classes || []);
                setSubjects(subjectsRes.data.data.subjects || []);
            } catch (err) {
                toast.error('Failed to load form data');
            } finally {
                setFetchingFormData(false);
            }
        };
        
        loadFormData();
    }, [_hasHydrated, isAuthenticated, selectedSessionId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title || !formData.classId || !formData.subjectId || !formData.scheduledDate) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            let finalNotes = formData.notes || '';
            const validTasks = checklistTasks.filter(t => t.trim());
            if (validTasks.length > 0) {
                const structuredTasks = validTasks.map((t, idx) => ({
                    id: `task_${Date.now()}_${idx}`,
                    text: t.trim(),
                    completed: false,
                    completedAt: null
                }));
                finalNotes = `[LECTURE_TASKS]:${JSON.stringify(structuredTasks)}\n${finalNotes}`.trim();
            }

            await teachingAPI.createPlan({
                ...formData,
                notes: finalNotes
            });
            toast.success('Lecture plan created successfully!');
            router.push('/teaching/plans');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create lecture plan');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const selectedClassObj = classes.find(c => c.id === formData.classId);
    const selectedSubjectObj = subjects.find(s => s.id === formData.subjectId);

    const handleAICardInsert = (aiData) => {
        if (!aiData) return;
        setFormData(prev => ({
            ...prev,
            title: aiData.topic || aiData.title || prev.title,
            description: aiData.aim || aiData.description || prev.description,
            notes: `Objectives:\n${aiData.learningObjectives || ''}\n\nTeaching Aids:\n${aiData.teachingAids || ''}\n\nInteractive Activity:\n${aiData.interactiveActivity || ''}\n\nAssessment Questions:\n${aiData.assessmentQuestions || ''}`,
            homeworkDescription: aiData.homework || prev.homeworkDescription
        }));

        if (aiData.assessmentQuestions) {
            const questionsList = aiData.assessmentQuestions
                .split('\n')
                .map(q => q.replace(/^\d+\.\s*/, '').trim())
                .filter(Boolean);
            if (questionsList.length > 0) {
                setChecklistTasks(prev => [...new Set([...prev, ...questionsList])]);
            }
        }
    };

    if (!_hasHydrated || fetchingFormData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <PageHeader 
                title="Create Lecture Plan"
                backLink="/teaching/plans"
            />

            <main className="max-w-3xl mx-auto px-4 py-8">
                {/* AI Copilot Card */}
                <AICardCopilot
                    type="lesson_plan"
                    context={{
                        subjectName: selectedSubjectObj?.name,
                        className: selectedClassObj?.name,
                        topic: formData.title,
                        aim: formData.description,
                        durationMinutes: formData.scheduledDuration
                    }}
                    onInsert={handleAICardInsert}
                />

                <div className="card p-6 md:p-8 bg-white dark:bg-slate-800 border">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Course selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100 dark:border-slate-700">
                            <div>
                                <label className="label">Class <span className="text-red-500">*</span></label>
                                <select 
                                    name="classId" 
                                    value={formData.classId} 
                                    onChange={handleChange}
                                    className="input" 
                                    required
                                >
                                    <option value="">Select Class</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Subject <span className="text-red-500">*</span></label>
                                <select 
                                    name="subjectId" 
                                    value={formData.subjectId} 
                                    onChange={handleChange}
                                    className="input" 
                                    required
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} {s.nameHindi ? `(${s.nameHindi})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Timing and settings */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-100 dark:border-slate-700">
                            <div>
                                <label className="label">Scheduled Date <span className="text-red-500">*</span></label>
                                <input 
                                    type="date" 
                                    name="scheduledDate" 
                                    value={formData.scheduledDate} 
                                    onChange={handleChange}
                                    className="input" 
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Duration (min)</label>
                                <input 
                                    type="number" 
                                    name="scheduledDuration" 
                                    value={formData.scheduledDuration} 
                                    onChange={handleChange}
                                    min="15"
                                    step="5"
                                    className="input" 
                                />
                            </div>
                            <div>
                                <label className="label">Lecture Type</label>
                                <select 
                                    name="lectureType" 
                                    value={formData.lectureType} 
                                    onChange={handleChange}
                                    className="input"
                                >
                                    <option value="theory">Theory</option>
                                    <option value="practical">Practical / Lab</option>
                                    <option value="demo">Demonstration</option>
                                    <option value="revision">Revision</option>
                                    <option value="assessment">Assessment</option>
                                </select>
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-4 pb-6 border-b border-slate-100 dark:border-slate-700">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div className="md:col-span-1">
                                    <label className="label">Lecture #</label>
                                    <input 
                                        type="number" 
                                        name="lectureNumber" 
                                        value={formData.lectureNumber} 
                                        onChange={handleChange}
                                        min="1"
                                        className="input" 
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <div className="flex items-center justify-between">
                                        <label className="label">Title (English) <span className="text-red-500">*</span></label>
                                        <VoiceInputButton
                                            onTranscript={(text) => setFormData(p => ({ ...p, title: (p.title ? `${p.title} ${text}` : text).trim() }))}
                                            lang="en-IN"
                                        />
                                    </div>
                                    <input 
                                        type="text" 
                                        name="title" 
                                        value={formData.title} 
                                        onChange={handleChange}
                                        placeholder="e.g. Introduction to Physics"
                                        className="input" 
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <label className="label">Title (Hindi) - Optional</label>
                                    <VoiceInputButton
                                        onTranscript={(text) => setFormData(p => ({ ...p, titleHindi: (p.titleHindi ? `${p.titleHindi} ${text}` : text).trim() }))}
                                        lang="hi-IN"
                                    />
                                </div>
                                <input 
                                    type="text" 
                                    name="titleHindi" 
                                    value={formData.titleHindi} 
                                    onChange={handleChange}
                                    placeholder="e.g. भौतिकी का परिचय"
                                    className="input" 
                                    lang="hi"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <label className="label">Overview / Description</label>
                                    <VoiceInputButton
                                        onTranscript={(text) => setFormData(p => ({ ...p, description: (p.description ? `${p.description} ${text}` : text).trim() }))}
                                        lang="en-IN"
                                    />
                                </div>
                                <textarea 
                                    name="description" 
                                    value={formData.description} 
                                    onChange={handleChange}
                                    placeholder="Brief overview of what will be covered..."
                                    className="input resize-none h-24"
                                />
                            </div>

                            {/* Lecture Tasks Checklist Builder */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                                        <label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                            Lecture Delivery Checklist Tasks ({checklistTasks.length})
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px]">
                                        <span className="text-slate-400 font-medium mr-0.5">Presets:</span>
                                        <button
                                            type="button"
                                            onClick={() => setChecklistTasks([...LECTURE_TASK_PRESETS.theory])}
                                            className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
                                        >
                                            Theory
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setChecklistTasks([...LECTURE_TASK_PRESETS.lab])}
                                            className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
                                        >
                                            Lab
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setChecklistTasks([...LECTURE_TASK_PRESETS.revision])}
                                            className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
                                        >
                                            Revision
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {checklistTasks.map((taskText, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                {idx + 1}
                                            </div>
                                            <input
                                                type="text"
                                                className="input input-sm flex-1 text-xs bg-white dark:bg-slate-800"
                                                value={taskText}
                                                onChange={(e) => {
                                                    const updated = [...checklistTasks];
                                                    updated[idx] = e.target.value;
                                                    setChecklistTasks(updated);
                                                }}
                                                placeholder={`Lecture task #${idx + 1}...`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setChecklistTasks(checklistTasks.filter((_, i) => i !== idx))}
                                                className="p-1 text-slate-400 hover:text-red-500 rounded"
                                                title="Delete Task"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="text"
                                        className="input input-sm flex-1 text-xs bg-white dark:bg-slate-800"
                                        placeholder="Add a new checklist task..."
                                        value={newTaskInput}
                                        onChange={(e) => setNewTaskInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (newTaskInput.trim()) {
                                                    setChecklistTasks(prev => [...prev, newTaskInput.trim()]);
                                                    setNewTaskInput('');
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (newTaskInput.trim()) {
                                                setChecklistTasks(prev => [...prev, newTaskInput.trim()]);
                                                setNewTaskInput('');
                                            }
                                        }}
                                        className="btn btn-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs flex items-center gap-1 border border-slate-300 dark:border-slate-600"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Task
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Additional info */}
                        <div className="space-y-4">
                            <div>
                                <label className="label">Homework / Assignments</label>
                                <textarea 
                                    name="homeworkDescription" 
                                    value={formData.homeworkDescription} 
                                    onChange={handleChange}
                                    placeholder="Any tasks for students..."
                                    className="input resize-none h-20"
                                />
                            </div>
                            
                            <div>
                                <label className="label">Instructor Private Notes</label>
                                <textarea 
                                    name="notes" 
                                    value={formData.notes} 
                                    onChange={handleChange}
                                    placeholder="Notes only visible to you..."
                                    className="input bg-amber-50 dark:bg-amber-900/10 resize-none h-20"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-6 flex items-center justify-end gap-3">
                            <Link href="/teaching/plans" className="btn btn-ghost">
                                Cancel
                            </Link>
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="btn btn-primary"
                            >
                                {loading ? 'Saving...' : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" /> Save Lecture Plan
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
