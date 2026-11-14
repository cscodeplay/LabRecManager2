'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Upload, Zap, Calendar, FileText, X, Eye, CheckCircle2, Sparkles, Clock } from 'lucide-react';
import {
    FluentPythonIcon, FluentSqlIcon, FluentCppIcon,
    FluentTerminalIcon, FluentExamHubIcon, FluentWordDocIcon
} from '@/components/FluentAppIcons';
import { useAuthStore } from '@/lib/store';
import { assignmentsAPI, trainingAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import axios from 'axios';
import PageHeader from '@/components/PageHeader';

export default function CreateAssignmentPage() {
    const router = useRouter();
    const { user, isAuthenticated, accessToken, _hasHydrated } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [publishNow, setPublishNow] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [labs, setLabs] = useState([]);
    const [classes, setClasses] = useState([]);
    const [trainingModules, setTrainingModules] = useState([]);
    const [pdfFile, setPdfFile] = useState(null);
    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [editId, setEditId] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const searchParams = useSearchParams();

    const [draftSavedAt, setDraftSavedAt] = useState(null);

    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
        defaultValues: {
            assignmentType: 'program',
            maxMarks: 100,
            passingMarks: 35,
            vivaMarks: 20,
            practicalMarks: 60,
            outputMarks: 20,
            latePenaltyPercent: 10,
            lateSubmissionAllowed: true,
            status: 'draft'
        }
    });

    const watchPractical = watch('practicalMarks');
    const watchOutput = watch('outputMarks');
    const watchViva = watch('vivaMarks');
    const watchTitle = watch('title');
    const watchTitleHindi = watch('titleHindi');
    const watchDescription = watch('description');
    const watchAim = watch('aim');
    const watchExpNumber = watch('experimentNumber');
    const watchSubjectId = watch('subjectId');
    const watchType = watch('assignmentType');
    const watchLang = watch('programmingLanguage');

    // Auto-save draft every 5 seconds (Pattern 2 default option)
    useEffect(() => {
        if (isEditMode) return;
        const interval = setInterval(() => {
            try {
                const values = watch();
                if (values.title) {
                    localStorage.setItem('assignment_creator_draft', JSON.stringify(values));
                    setDraftSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                }
            } catch (e) {}
        }, 5000);
        return () => clearInterval(interval);
    }, [watch, isEditMode]);

    // Restore draft if available
    useEffect(() => {
        if (isEditMode) return;
        try {
            const saved = localStorage.getItem('assignment_creator_draft');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.title && !watchTitle) {
                    Object.keys(parsed).forEach(k => {
                        if (parsed[k] !== undefined && parsed[k] !== null) {
                            setValue(k, parsed[k]);
                        }
                    });
                }
            }
        } catch (e) {}
    }, [isEditMode, setValue]);

    // Auto-calculate Total Marks (maxMarks) = Practical + Output + Viva
    useEffect(() => {
        const p = Number(watchPractical) || 0;
        const o = Number(watchOutput) || 0;
        const v = Number(watchViva) || 0;
        setValue('maxMarks', p + o + v);
    }, [watchPractical, watchOutput, watchViva, setValue]);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        const initForm = async () => {
            // Load form data first (subjects, classes) then load existing assignment if in edit mode
            await loadFormData();

            // Check for edit mode after form data is loaded
            const editParam = searchParams.get('edit');
            if (editParam) {
                setEditId(editParam);
                setIsEditMode(true);
                loadExistingAssignment(editParam);
            }
        };
        initForm();
    }, [isAuthenticated, _hasHydrated, searchParams]);

    const loadFormData = async () => {
        try {
            const [subjectsRes, classesRes, modulesRes] = await Promise.all([
                axios.get('/api/subjects', { headers: { Authorization: `Bearer ${accessToken}` } }),
                axios.get('/api/classes', { headers: { Authorization: `Bearer ${accessToken}` } }),
                trainingAPI.getModules()
            ]);
            setSubjects(subjectsRes.data.data.subjects || []);
            setClasses(classesRes.data.data.classes || []);
            setTrainingModules(modulesRes?.data?.data?.modules || []);
        } catch (error) {
            console.error('Failed to load form data:', error);
        }
    };

    const loadExistingAssignment = async (id) => {
        try {
            const res = await assignmentsAPI.getById(id);
            const a = res.data.data.assignment;
            // Populate form with existing data
            setValue('title', a.title || '');
            setValue('titleHindi', a.titleHindi || '');
            setValue('description', a.description || '');
            setValue('experimentNumber', a.experimentNumber || '');
            setValue('assignmentType', a.assignmentType || 'program');
            setValue('subjectId', a.subjectId || '');
            setValue('aim', a.aim || '');
            setValue('theory', a.theory || '');
            setValue('procedure', a.procedure || '');
            setValue('expectedOutput', a.expectedOutput || '');
            setValue('referenceCode', a.referenceCode || '');
            setValue('maxMarks', a.maxMarks || 100);
            setValue('passingMarks', a.passingMarks || 35);
            setValue('vivaMarks', (a.vivaMarks !== undefined && a.vivaMarks !== null) ? a.vivaMarks : 0);
            setValue('practicalMarks', (a.practicalMarks !== undefined && a.practicalMarks !== null) ? a.practicalMarks : 60);
            setValue('outputMarks', (a.outputMarks !== undefined && a.outputMarks !== null) ? a.outputMarks : 20);
            setValue('programmingLanguage', a.programmingLanguage || '');
            setValue('trainingModuleId', a.trainingModuleId || '');
            if (a.publishDate) {
                setValue('publishDate', new Date(a.publishDate).toISOString().slice(0, 16));
            }
        } catch (error) {
            toast.error('Failed to load assignment for editing');
            router.push('/assignments');
        }
    };

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            const submitData = {
                ...data,
                // Note: dueDate is set in assign-work form, not here
                publishDate: publishNow ? new Date().toISOString() : (data.publishDate ? new Date(data.publishDate).toISOString() : null),
                status: publishNow ? 'published' : 'draft'
            };

            let assignmentId;

            if (isEditMode && editId) {
                // Update existing assignment
                await assignmentsAPI.update(editId, submitData);
                assignmentId = editId;
                toast.success('Assignment updated successfully!');
            } else {
                // Create new assignment
                const response = await assignmentsAPI.create(submitData);
                assignmentId = response.data.data.assignment.id;
                if (publishNow) {
                    toast.success('Assignment created and published!');
                } else {
                    toast.success('Assignment created as draft!');
                }
            }

            // Upload PDF if selected
            if (pdfFile) {
                setUploadingPdf(true);
                try {
                    await assignmentsAPI.uploadPdf(assignmentId, pdfFile);
                } catch (pdfError) {
                    console.error('Failed to upload PDF:', pdfError);
                    toast.error('Assignment saved but PDF upload failed');
                }
                setUploadingPdf(false);
            }

            router.push(`/assignments/${assignmentId}`);
        } catch (error) {
            // Show specific validation errors if available
            const errorData = error.response?.data;
            if (errorData?.errors?.length > 0) {
                const errorMessages = errorData.errors.map(e => e.msg || e.message).join(', ');
                toast.error(`Validation failed: ${errorMessages}`);
            } else {
                toast.error(errorData?.message || `Failed to ${isEditMode ? 'update' : 'create'} assignment`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePdfSelect = (e) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
        } else {
            toast.error('Please select a PDF file');
        }
    };

    const selectedSubject = subjects.find(s => s.id === watchSubjectId);

    const renderLangIcon = (lang) => {
        switch (lang) {
            case 'python': return <FluentPythonIcon size={18} />;
            case 'sql': return <FluentSqlIcon size={18} />;
            case 'c++':
            case 'c': return <FluentCppIcon size={18} />;
            default: return <FluentTerminalIcon size={18} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            <PageHeader
                title={isEditMode ? "Edit Assignment" : "Create Assignment"}
                titleHindi="असाइनमेंट बनाएं"
                backLink="/assignments"
            />

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Auto-Draft Notification Bar */}
                {draftSavedAt && !isEditMode && (
                    <div className="mb-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Draft auto-saved to local browser storage at <strong>{draftSavedAt}</strong></span>
                        </span>
                        <button
                            type="button"
                            onClick={() => { localStorage.removeItem('assignment_creator_draft'); setDraftSavedAt(null); toast.success('Draft cleared'); }}
                            className="text-slate-400 hover:text-rose-500 underline text-[11px]"
                        >
                            Discard Draft
                        </button>
                    </div>
                )}

                {/* Pattern 2: Asymmetric Split-Screen Form (7 cols form : 5 cols sticky preview) */}
                <div className="grid lg:grid-cols-12 gap-8 items-start">
                    {/* LEFT COLUMN: Input Forms (7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Basic Info */}
                            <div className="card p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                                <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <FluentWordDocIcon size={20} />
                                    Basic Information
                                </h2>
                                <div className="grid gap-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label text-xs font-bold uppercase tracking-wider">Title (English) *</label>
                                            <input
                                                type="text"
                                                className="input rounded-xl text-xs"
                                                placeholder="e.g. Python: Dual-Stack Expression Parser"
                                                {...register('title', { required: 'Title is required' })}
                                            />
                                            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                                        </div>
                                        <div>
                                            <label className="label text-xs font-bold uppercase tracking-wider">Title (Hindi)</label>
                                            <input
                                                type="text"
                                                className="input rounded-xl text-xs"
                                                placeholder="पायथन: ड्यूल-स्टैक पार्सर"
                                                {...register('titleHindi')}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="label text-xs font-bold uppercase tracking-wider">Description & Context</label>
                                        <textarea
                                            className="input rounded-xl text-xs min-h-[90px]"
                                            placeholder="Provide context and requirements for the laboratory exercise..."
                                            {...register('description')}
                                        />
                                    </div>

                                    <div className="grid md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="label text-xs font-bold uppercase tracking-wider">Subject *</label>
                                            <select className="input rounded-xl text-xs" {...register('subjectId', { required: 'Subject is required' })}>
                                                <option value="">Select Subject</option>
                                                {subjects.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label text-xs font-bold uppercase tracking-wider">Experiment No.</label>
                                            <input
                                                type="text"
                                                className="input rounded-xl text-xs"
                                                placeholder="EXP-01"
                                                {...register('experimentNumber')}
                                            />
                                        </div>
                                        <div>
                                            <label className="label text-xs font-bold uppercase tracking-wider">Assignment Type *</label>
                                            <select className="input rounded-xl text-xs" {...register('assignmentType')}>
                                                <option value="program">Program</option>
                                                <option value="experiment">Experiment</option>
                                                <option value="project">Project</option>
                                                <option value="observation">Observation</option>
                                                <option value="viva_only">Viva Only</option>
                                                <option value="training_module">Training Module</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label text-xs font-bold uppercase tracking-wider">Programming Language</label>
                                            <select className="input rounded-xl text-xs" {...register('programmingLanguage')}>
                                                <option value="">-- None / Written --</option>
                                                <option value="python">Python</option>
                                                <option value="java">Java</option>
                                                <option value="c">C</option>
                                                <option value="c++">C++</option>
                                                <option value="sql">SQL</option>
                                                <option value="javascript">JavaScript</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label text-xs font-bold uppercase tracking-wider">Learning Aim / Objective</label>
                                            <input
                                                type="text"
                                                className="input rounded-xl text-xs"
                                                placeholder="e.g. Master dual stack allocation and pointer arithmetic"
                                                {...register('aim')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Marks Configuration */}
                            <div className="card p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                                <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                                    <span>Marks Rubric Breakdown</span>
                                    <span className="font-mono text-xs font-bold text-primary-600 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-1 rounded-lg">
                                        Total: {watch('maxMarks') || 100} pts
                                    </span>
                                </h2>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="label text-xs font-bold uppercase tracking-wider">Practical Marks</label>
                                        <input type="number" min="0" className="input rounded-xl text-xs" {...register('practicalMarks', { valueAsNumber: true })} />
                                    </div>
                                    <div>
                                        <label className="label text-xs font-bold uppercase tracking-wider">Output Marks</label>
                                        <input type="number" min="0" className="input rounded-xl text-xs" {...register('outputMarks', { valueAsNumber: true })} />
                                    </div>
                                    <div>
                                        <label className="label text-xs font-bold uppercase tracking-wider">Viva Marks</label>
                                        <input type="number" min="0" className="input rounded-xl text-xs" {...register('vivaMarks', { valueAsNumber: true })} />
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div>
                                        <label className="label text-xs font-bold uppercase tracking-wider">Passing Marks</label>
                                        <input type="number" min="0" className="input rounded-xl text-xs" {...register('passingMarks', { valueAsNumber: true })} />
                                    </div>
                                    <div>
                                        <label className="label text-xs font-bold uppercase tracking-wider">Late Penalty %</label>
                                        <input type="number" min="0" max="100" className="input rounded-xl text-xs" {...register('latePenaltyPercent', { valueAsNumber: true })} />
                                    </div>
                                </div>
                            </div>

                            {/* PDF Attachment */}
                            <div className="card p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                                <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-2">Reference PDF Sheet (Optional)</h2>
                                <p className="text-xs text-slate-500 mb-4">Attach lab manual pages, problem sheets, or diagrams.</p>

                                <div
                                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${pdfFile ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-primary-400'}`}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => { e.preventDefault(); handlePdfSelect({ target: { files: e.dataTransfer.files } }); }}
                                >
                                    {pdfFile ? (
                                        <div className="flex items-center gap-3 justify-center">
                                            <FileText className="w-8 h-8 text-emerald-600" />
                                            <div className="text-left">
                                                <p className="text-xs font-bold text-slate-900 dark:text-white">{pdfFile.name}</p>
                                                <p className="text-[11px] text-slate-500">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB • Ready for upload</p>
                                            </div>
                                            <button type="button" onClick={() => setPdfFile(null)} className="p-1 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer block">
                                            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Click or drag & drop PDF lab sheet</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">Maximum file size: 50MB</p>
                                            <input type="file" className="hidden" accept=".pdf,application/pdf" onChange={handlePdfSelect} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Schedule & Publishing */}
                            <div className="card p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                                <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-4">Publishing Status</h2>
                                <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-slate-800 dark:to-primary-950/30 border border-primary-200 dark:border-primary-900/50">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={publishNow}
                                            onChange={(e) => setPublishNow(e.target.checked)}
                                            className="w-4 h-4 rounded text-primary-600"
                                        />
                                        <div>
                                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                                                <Zap className="w-3.5 h-3.5 text-primary-600" />
                                                <span>Publish Immediately</span>
                                            </div>
                                            <span className="text-[11px] text-slate-500">Makes assignment immediately visible to all enrolled students</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Form Action Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <Link
                                    href="/assignments"
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                >
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center gap-2 ${
                                        publishNow
                                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25'
                                            : 'bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 shadow-indigo-500/25'
                                    }`}
                                >
                                    {loading ? (
                                        <span>Saving...</span>
                                    ) : (
                                        <>
                                            <Save className="w-3.5 h-3.5" />
                                            <span>{publishNow ? 'Publish Assignment' : (isEditMode ? 'Update Assignment' : 'Save as Draft')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* RIGHT COLUMN: Sticky Live Student Viewport Preview (5 cols) */}
                    <div className="lg:col-span-5 hidden lg:block sticky top-24">
                        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/60 shadow-xl overflow-hidden">
                            {/* Device Chrome / Header */}
                            <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-900/50">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs font-extrabold tracking-tight uppercase">Live Student Viewport</span>
                                </div>
                                <span className="font-mono text-[10px] text-indigo-300 bg-white/10 px-2 py-0.5 rounded-md">
                                    Preview Mode
                                </span>
                            </div>

                            {/* Simulated Student Screen */}
                            <div className="p-6 space-y-5 bg-slate-50/50 dark:bg-slate-950/50">
                                {/* Subject & Exp Number */}
                                <div className="flex items-center justify-between gap-2">
                                    <span className="px-3 py-1 rounded-lg text-[11px] font-bold font-mono tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
                                        {selectedSubject?.name || 'General Laboratory'}
                                    </span>
                                    <span className="text-xs font-bold font-mono text-slate-500">
                                        {watchExpNumber || 'EXP-01'}
                                    </span>
                                </div>

                                {/* Title Header */}
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
                                        {watchTitle || 'Untitled Assignment'}
                                    </h3>
                                    {watchTitleHindi && (
                                        <p className="text-xs text-slate-500 mt-0.5 font-medium">{watchTitleHindi}</p>
                                    )}
                                </div>

                                {/* Aim Card */}
                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Aim & Learning Objective
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                        {watchAim || 'No specific objective specified yet. Complete requirements described below.'}
                                    </p>
                                </div>

                                {/* Programming Language & Tool Badge */}
                                {watchLang && (
                                    <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800">
                                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                            {renderLangIcon(watchLang)}
                                        </div>
                                        <div>
                                            <span className="block text-xs font-bold text-slate-900 dark:text-white capitalize">
                                                {watchLang} Workspace Environment
                                            </span>
                                            <span className="block text-[10px] text-slate-400">
                                                In-browser interactive compiler & terminal available
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Marks Breakdown Chips */}
                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">Marks Distribution</span>
                                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                            {(Number(watchPractical) || 0) + (Number(watchOutput) || 0) + (Number(watchViva) || 0)} Total
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                            <span className="block font-mono text-xs font-bold text-slate-900 dark:text-white">
                                                {watchPractical || 60}
                                            </span>
                                            <span className="block text-[10px] text-slate-400">Practical</span>
                                        </div>
                                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                            <span className="block font-mono text-xs font-bold text-slate-900 dark:text-white">
                                                {watchOutput || 20}
                                            </span>
                                            <span className="block text-[10px] text-slate-400">Output</span>
                                        </div>
                                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                            <span className="block font-mono text-xs font-bold text-slate-900 dark:text-white">
                                                {watchViva || 20}
                                            </span>
                                            <span className="block text-[10px] text-slate-400">Viva Voce</span>
                                        </div>
                                    </div>
                                </div>

                                {/* PDF Attached Chip */}
                                {pdfFile && (
                                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
                                        <FileText className="w-4 h-4 text-emerald-600" />
                                        <span className="font-semibold truncate">{pdfFile.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
