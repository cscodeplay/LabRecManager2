'use client';

import { useState, useEffect } from 'react';
import {
    Sparkles, Upload, FileText, CheckCircle2, AlertCircle, X,
    Loader2, Trash2, Plus, Edit2, Check, Calendar, Users, Award,
    Code, ArrowRight, ArrowLeft, RefreshCw, Cpu
} from 'lucide-react';
import { subjectsAPI, aiAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AIAssignmentGenerator({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState(1); // 1: Upload & Input, 2: Loading, 3: Draft Review, 4: Success
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [prompt, setPrompt] = useState('');
    const [provider, setProvider] = useState('groq'); // 'groq' | 'gemini'
    
    // Marks Breakdown
    const [practicalMarks, setPracticalMarks] = useState(60);
    const [vivaMarks, setVivaMarks] = useState(20);
    const [outputMarks, setOutputMarks] = useState(20);
    const [maxMarks, setMaxMarks] = useState(100);

    // Subjects
    const [subjects, setSubjects] = useState([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');

    // Extracted Data & Targets
    const [extractedAssignments, setExtractedAssignments] = useState([]);
    const [targetResolution, setTargetResolution] = useState(null);
    const [dueDate, setDueDate] = useState('');
    const [status, setStatus] = useState('published');

    // Target Selection Override Arrays
    const [targetClassIds, setTargetClassIds] = useState([]);
    const [targetGroupIds, setTargetGroupIds] = useState([]);
    const [targetStudentIds, setTargetStudentIds] = useState([]);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadSubjects();
        }
    }, [isOpen]);

    const loadSubjects = async () => {
        try {
            const res = await subjectsAPI.getAll();
            const list = res.data.data.subjects || [];
            setSubjects(list);
            
            // Default to Computer Science subject if found
            const csSubject = list.find(s => s.name?.toLowerCase().includes('computer'));
            if (csSubject) {
                setSelectedSubjectId(csSubject.id);
            } else if (list.length > 0) {
                setSelectedSubjectId(list[0].id);
            }
        } catch (err) {
            console.error('Failed to load subjects:', err);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Please upload a valid image file (PNG, JPG, JPEG)');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleParse = async (e) => {
        e?.preventDefault();
        if (!imageFile) {
            toast.error('Please upload an image of the syllabus or assignment list!');
            return;
        }

        setStep(2); // Loading step
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('image', imageFile);
            formData.append('prompt', prompt);
            formData.append('provider', provider);
            formData.append('subjectId', selectedSubjectId);

            const res = await aiAPI.parseAssignments(formData);
            const data = res.data.data;

            setExtractedAssignments(data.extractedAssignments || []);
            setTargetResolution(data.targetResolution || {});

            if (data.targetResolution?.selectedSubjectId) {
                setSelectedSubjectId(data.targetResolution.selectedSubjectId);
            }

            if (data.targetResolution?.targetClassIds) setTargetClassIds(data.targetResolution.matchedClassIds || []);
            if (data.targetResolution?.targetGroupIds) setTargetGroupIds(data.targetResolution.matchedGroupIds || []);
            if (data.targetResolution?.targetStudentIds) setTargetStudentIds(data.targetResolution.matchedStudentIds || []);

            // Due Date formatting for datetime-local input
            if (data.targetResolution?.dueDate) {
                const d = new Date(data.targetResolution.dueDate);
                setDueDate(d.toISOString().slice(0, 16));
            } else {
                const defaultDue = new Date(Date.now() + 24 * 60 * 60 * 1000);
                setDueDate(defaultDue.toISOString().slice(0, 16));
            }

            setStatus(data.targetResolution?.status || 'published');
            toast.success(`Successfully extracted ${data.extractedAssignments?.length || 0} tasks!`);
            setStep(3); // Review step
        } catch (err) {
            console.error('AI Parse error:', err);
            toast.error(err.response?.data?.message || 'AI extraction failed. Please try again.');
            setStep(1);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignmentChange = (index, field, value) => {
        setExtractedAssignments(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleDeleteAssignment = (index) => {
        setExtractedAssignments(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddAssignment = () => {
        setExtractedAssignments(prev => [
            ...prev,
            {
                title: `Lab Assignment #${prev.length + 1}`,
                description: '',
                aim: '',
                programmingLanguage: 'python',
                assignmentType: 'program',
                experimentNumber: `${prev.length + 1}`
            }
        ]);
    };

    const handleBatchCreate = async () => {
        if (extractedAssignments.length === 0) {
            toast.error('At least one assignment is required to publish.');
            return;
        }

        if (!selectedSubjectId) {
            toast.error('Please select a Subject for these assignments.');
            return;
        }

        setSubmitting(true);
        try {
            await aiAPI.batchCreate({
                assignments: extractedAssignments,
                subjectId: selectedSubjectId,
                practicalMarks: Number(practicalMarks),
                vivaMarks: Number(vivaMarks),
                outputMarks: Number(outputMarks),
                maxMarks: Number(maxMarks),
                status,
                dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
                targetClassIds,
                targetGroupIds,
                targetStudentIds
            });

            toast.success(`Created & assigned ${extractedAssignments.length} lab tasks successfully! 🎉`);
            setStep(4);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error('Batch create error:', err);
            toast.error(err.response?.data?.message || 'Failed to create assignments.');
        } finally {
            setSubmitting(false);
        }
    };

    const resetState = () => {
        setStep(1);
        setImageFile(null);
        setImagePreview(null);
        setPrompt('');
        setExtractedAssignments([]);
        setTargetResolution(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-primary-500/10 via-purple-500/5 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-purple-600 text-white flex items-center justify-center shadow-md">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                AI Assignment Generator & Assigner
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Extract assignments from textbook images & assign via natural language
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            resetState();
                            onClose();
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* STEP 1: Upload & Input */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Upload Box */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-slate-900 dark:text-white">
                                        1. Upload Syllabus / Program List Image <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-500 rounded-2xl p-6 text-center transition-colors bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center min-h-[220px]">
                                        {imagePreview ? (
                                            <div className="relative w-full h-48 group">
                                                <img src={imagePreview} alt="Syllabus Preview" className="w-full h-full object-contain rounded-xl" />
                                                <button
                                                    type="button"
                                                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                                                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-xl shadow hover:bg-red-700 transition"
                                                    title="Remove Image"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-3">
                                                    <Upload className="w-6 h-6" />
                                                </div>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    Click or Drag & Drop photo of textbook/syllabus
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">PNG, JPG, JPEG up to 10MB</p>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Natural Language Target Instructions */}
                                <div className="space-y-4 flex flex-col justify-between">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                                            2. Target Instructions (Natural Language)
                                        </label>
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder='e.g., "Assign these exercises to Class XII COM-A and Group Alpha. Publish now."'
                                            className="w-full min-h-[120px] p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none transition"
                                        />
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Tip: Specify class names (e.g. XII COM-A), group names, or target students in plain English. Include "publish now" to auto-publish.
                                        </p>
                                    </div>

                                    {/* AI Engine Choice & Subject */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                AI Engine
                                            </label>
                                            <select
                                                value={provider}
                                                onChange={(e) => setProvider(e.target.value)}
                                                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                                            >
                                                <option value="groq">Groq (Llama 3.2 Vision - Default)</option>
                                                <option value="gemini">Google Gemini 2.0 Flash</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Subject
                                            </label>
                                            <select
                                                value={selectedSubjectId}
                                                onChange={(e) => setSelectedSubjectId(e.target.value)}
                                                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                                            >
                                                {subjects.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name} ({s.code || 'Lab'})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Marks Breakdown Configuration */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Award className="w-4 h-4 text-primary-500" /> Standard Marks Breakdown
                                </h3>
                                <div className="grid grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-[11px] text-slate-500 mb-1 font-medium">Practical Marks</label>
                                        <input
                                            type="number"
                                            value={practicalMarks}
                                            onChange={(e) => setPracticalMarks(e.target.value)}
                                            className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-500 mb-1 font-medium">Viva Marks</label>
                                        <input
                                            type="number"
                                            value={vivaMarks}
                                            onChange={(e) => setVivaMarks(e.target.value)}
                                            className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-500 mb-1 font-medium">Output Marks</label>
                                        <input
                                            type="number"
                                            value={outputMarks}
                                            onChange={(e) => setOutputMarks(e.target.value)}
                                            className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-500 mb-1 font-medium">Max Marks</label>
                                        <input
                                            type="number"
                                            value={maxMarks}
                                            onChange={(e) => setMaxMarks(e.target.value)}
                                            className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-primary-600 dark:text-primary-400"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Loading State */}
                    {step === 2 && (
                        <div className="py-16 text-center space-y-4">
                            <div className="relative inline-flex">
                                <div className="w-16 h-16 rounded-3xl bg-primary-600/10 text-primary-600 flex items-center justify-center animate-pulse">
                                    <Cpu className="w-8 h-8 animate-spin" />
                                </div>
                                <Sparkles className="w-6 h-6 text-purple-500 absolute -top-2 -right-2 animate-bounce" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                Extracting Tasks with {provider === 'groq' ? 'Groq Llama Vision' : 'Google Gemini 2.0'}...
                            </h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                                Analyzing image content, extracting problem statements, aims, and resolving target classes/groups from your prompt...
                            </p>
                        </div>
                    )}

                    {/* STEP 3: Draft Review & Editing */}
                    {step === 3 && (
                        <div className="space-y-6">
                            {/* Summary & Target Resolution Banner */}
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-500/10 via-purple-500/10 to-transparent border border-primary-500/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4" /> AI Extracted {extractedAssignments.length} Assignments
                                    </span>
                                    <button
                                        onClick={handleAddAssignment}
                                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-semibold text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Task
                                    </button>
                                </div>

                                {/* Target Resolution Summary Pills */}
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium flex items-center gap-1">
                                        <Users className="w-3 h-3" /> Target Classes: {targetClassIds.length > 0 ? `${targetClassIds.length} Class(es) Matched` : 'None'}
                                    </span>
                                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-medium flex items-center gap-1">
                                        <Users className="w-3 h-3" /> Target Groups: {targetGroupIds.length > 0 ? `${targetGroupIds.length} Group(s) Matched` : 'None'}
                                    </span>
                                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-medium flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Due Date: {new Date(dueDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>

                            {/* Extracted Assignment Cards */}
                            <div className="space-y-4">
                                {extractedAssignments.map((task, idx) => (
                                    <div key={idx} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm space-y-3 relative group">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 flex-1">
                                                <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center">
                                                    #{idx + 1}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={task.title}
                                                    onChange={(e) => handleAssignmentChange(idx, 'title', e.target.value)}
                                                    placeholder="Assignment Title"
                                                    className="flex-1 font-semibold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 outline-none text-sm px-1 py-0.5"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={task.programmingLanguage || 'python'}
                                                    onChange={(e) => handleAssignmentChange(idx, 'programmingLanguage', e.target.value)}
                                                    className="text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-emerald-600 dark:text-emerald-400 font-semibold"
                                                >
                                                    <option value="python">Python</option>
                                                    <option value="cpp">C++</option>
                                                    <option value="c">C</option>
                                                    <option value="java">Java</option>
                                                    <option value="html">HTML</option>
                                                    <option value="sql">SQL</option>
                                                </select>
                                                <button
                                                    onClick={() => handleDeleteAssignment(idx)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 transition rounded-lg"
                                                    title="Delete Task"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Aim</label>
                                                <input
                                                    type="text"
                                                    value={task.aim || ''}
                                                    onChange={(e) => handleAssignmentChange(idx, 'aim', e.target.value)}
                                                    placeholder="Experiment Aim"
                                                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Description / Problem Statement</label>
                                                <input
                                                    type="text"
                                                    value={task.description || ''}
                                                    onChange={(e) => handleAssignmentChange(idx, 'description', e.target.value)}
                                                    placeholder="Problem details"
                                                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Due Date & Publish Options */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Due Date & Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Status
                                    </label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                                    >
                                        <option value="published">Published (Visible to students)</option>
                                        <option value="draft">Draft (Saved for review)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Success */}
                    {step === 4 && (
                        <div className="py-16 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {extractedAssignments.length} Assignments Published Successfully!
                            </h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                                All tasks have been saved to the database, associated with the target audience, and notifications sent to students.
                            </p>
                        </div>
                    )}
                </div>

                {/* Modal Footer Controls */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                    {step === 1 && (
                        <>
                            <button
                                type="button"
                                onClick={() => { resetState(); onClose(); }}
                                className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleParse}
                                disabled={!imageFile || loading}
                                className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white font-semibold rounded-xl transition shadow-md flex items-center gap-2 text-sm disabled:opacity-50"
                            >
                                <Sparkles className="w-4 h-4" /> Extract Tasks with AI
                            </button>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to Upload
                            </button>
                            <button
                                type="button"
                                onClick={handleBatchCreate}
                                disabled={submitting || extractedAssignments.length === 0}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition shadow-md flex items-center gap-2 text-sm disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Confirm & Publish All ({extractedAssignments.length})
                            </button>
                        </>
                    )}

                    {step === 4 && (
                        <button
                            type="button"
                            onClick={() => { resetState(); onClose(); }}
                            className="ml-auto px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition shadow-md text-sm"
                        >
                            Done
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
