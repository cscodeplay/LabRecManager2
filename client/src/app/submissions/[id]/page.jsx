'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import {
    ArrowLeft, Code, FileText, User, Calendar,
    CheckCircle, XCircle, Award, Send, MessageSquare, Play, Terminal, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { submissionsAPI, gradesAPI } from '@/lib/api';
import toast from 'react-hot-toast';

// Helper to get component max marks breakdown dynamically
const getAssignmentMarksBreakdown = (assignment) => {
    if (!assignment) {
        return { maxPractical: 60, maxOutput: 20, maxViva: 20, maxTotal: 100 };
    }

    const rawPractical = assignment.practicalMarks;
    const rawOutput = assignment.outputMarks;
    const rawViva = assignment.vivaMarks;
    const assignmentMaxTotal = assignment.maxMarks;

    const hasExplicitBreakdown = (rawPractical !== null && rawPractical !== undefined) ||
                                 (rawOutput !== null && rawOutput !== undefined) ||
                                 (rawViva !== null && rawViva !== undefined);

    let maxPractical = 0;
    let maxOutput = 0;
    let maxViva = 0;

    if (hasExplicitBreakdown) {
        maxPractical = rawPractical ?? 0;
        maxOutput = rawOutput ?? 0;
        maxViva = rawViva ?? 0;
    } else if (assignmentMaxTotal) {
        maxPractical = Math.round(assignmentMaxTotal * 0.6);
        maxOutput = Math.round(assignmentMaxTotal * 0.4);
        maxViva = 0;
    } else {
        maxPractical = 60;
        maxOutput = 20;
        maxViva = 20;
    }

    const maxTotal = assignmentMaxTotal ?? (maxPractical + maxOutput + maxViva);

    return { maxPractical, maxOutput, maxViva, maxTotal };
};

export default function SubmissionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [grading, setGrading] = useState(false);
    const [showGradeForm, setShowGradeForm] = useState(false);

    const [runningCode, setRunningCode] = useState(false);
    const [liveOutput, setLiveOutput] = useState(null);
    const [execError, setExecError] = useState(null);

    const handleRunSubmittedPythonCode = async () => {
        if (!submission?.codeContent) return;
        setRunningCode(true);
        setLiveOutput(null);
        setExecError(null);

        try {
            if (!window.pyodideInstance) {
                if (!window.pyodidePromise) {
                    window.pyodidePromise = (async () => {
                        if (!document.getElementById('pyodide-cdn')) {
                            const script = document.createElement('script');
                            script.id = 'pyodide-cdn';
                            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
                            document.body.appendChild(script);
                            await new Promise((resolve, reject) => {
                                script.onload = resolve;
                                script.onerror = () => reject(new Error('Failed to load Pyodide CDN'));
                            });
                        }
                        const pyodide = await window.loadPyodide();
                        window.pyodideInstance = pyodide;
                        return pyodide;
                    })();
                }
                await window.pyodidePromise;
            }

            const pyodide = window.pyodideInstance;

            let capturedOutput = '';
            pyodide.setStdout({
                batched: (str) => {
                    capturedOutput += str + '\n';
                }
            });

            await pyodide.runPythonAsync(submission.codeContent);

            const finalOutput = capturedOutput.trim() || '[Program executed with no stdout output]';
            setLiveOutput(finalOutput);
            toast.success('Live Python execution completed!');
        } catch (err) {
            console.error('Python execution error:', err);
            setExecError(err.message || String(err));
            toast.error('Execution error occurred!');
        } finally {
            setRunningCode(false);
        }
    };

    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
        defaultValues: {
            practicalMarks: 0,
            outputMarks: 0,
            vivaMarks: 0
        }
    });

    const watchMarks = watch(['practicalMarks', 'outputMarks', 'vivaMarks']);
    const totalMarks = (Number(watchMarks[0]) || 0) + (Number(watchMarks[1]) || 0) + (Number(watchMarks[2]) || 0);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadSubmission();
    }, [isAuthenticated, params.id]);

    const loadSubmission = async () => {
        try {
            const res = await submissionsAPI.getById(params.id);
            setSubmission(res.data.data.submission);

            if (res.data.data.submission.grade) {
                const grade = res.data.data.submission.grade;
                setValue('practicalMarks', grade.practicalMarks);
                setValue('outputMarks', grade.outputMarks);
                setValue('vivaMarks', grade.vivaMarks);
                setValue('codeFeedback', grade.codeFeedback);
                setValue('outputFeedback', grade.outputFeedback);
                setValue('generalRemarks', grade.generalRemarks);
            }
        } catch (error) {
            toast.error('Failed to load submission');
            router.push('/submissions');
        } finally {
            setLoading(false);
        }
    };

    const onGradeSubmit = async (data) => {
        setGrading(true);
        try {
            await gradesAPI.grade(submission.id, {
                ...data,
                practicalMarks: Number(data.practicalMarks),
                outputMarks: Number(data.outputMarks),
                vivaMarks: Number(data.vivaMarks)
            });
            toast.success('Submission graded successfully!');
            loadSubmission();
            setShowGradeForm(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to grade submission');
        } finally {
            setGrading(false);
        }
    };

    const handlePublishGrade = async () => {
        try {
            await gradesAPI.publish(submission.grade.id);
            toast.success('Grade published to student!');
            loadSubmission();
        } catch (error) {
            toast.error('Failed to publish grade');
        }
    };

    const handleRequestRevision = async () => {
        try {
            await submissionsAPI.updateStatus(submission.id, 'needs_revision');
            toast.success('Revision requested');
            loadSubmission();
        } catch (error) {
            toast.error('Failed to request revision');
        }
    };

    if (loading || !submission) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    const isInstructor = user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'lab_assistant';
    const canGrade = isInstructor && (submission.status === 'submitted' || submission.status === 'under_review');

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/submissions" className="text-slate-500 hover:text-slate-700">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-xl font-semibold text-slate-900">
                            {submission.assignment?.title || 'Submission'}
                        </h1>
                        <p className="text-sm text-slate-500">
                            {submission.student?.firstName} {submission.student?.lastName}
                            {(submission.student?.studentId || submission.student?.admissionNumber) && ` (${submission.student.studentId || submission.student.admissionNumber})`}
                        </p>
                    </div>
                    <span className={`badge ${submission.status === 'graded' ? 'badge-success' :
                        submission.status === 'needs_revision' ? 'badge-danger' : 'badge-primary'
                        }`}>
                        {submission.status.replace('_', ' ')}
                    </span>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-6">
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Submitted Code & Live Python Compiler */}
                        {submission.codeContent && (
                            <div className="card p-6 border border-slate-200">
                                <div className="flex items-center justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Code className="w-5 h-5 text-primary-600" />
                                        <h2 className="text-lg font-semibold text-slate-900">Submitted Code</h2>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRunSubmittedPythonCode}
                                        disabled={runningCode}
                                        className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-sm disabled:opacity-50"
                                        title="Re-run Code (Python Compiler)"
                                    >
                                        {runningCode ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Play className="w-5 h-5 fill-white" />
                                        )}
                                    </button>
                                </div>
                                <pre className="code-block overflow-x-auto bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-sm">{submission.codeContent}</pre>

                                {/* Live Execution Output Box */}
                                {(liveOutput || execError) && (
                                    <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-xl">
                                        <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                            <Terminal className="w-4 h-4 text-emerald-500" />
                                            Live Execution Terminal Output
                                        </div>
                                        {liveOutput && (
                                            <pre className="font-mono text-xs text-slate-100 whitespace-pre-wrap">{liveOutput}</pre>
                                        )}
                                        {execError && (
                                            <div className="text-xs font-mono text-red-400 mt-1 flex items-start gap-2">
                                                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
                                                <pre className="whitespace-pre-wrap">{execError}</pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Submitted Output */}
                        {submission.outputContent && (
                            <div className="card p-6 border border-slate-200">
                                <div className="flex items-center gap-2 mb-4">
                                    <FileText className="w-5 h-5 text-emerald-600" />
                                    <h2 className="text-lg font-semibold text-slate-900">Submitted Output</h2>
                                </div>
                                <pre className="code-block bg-slate-900 text-emerald-400 font-mono text-sm p-4 rounded-xl">{submission.outputContent}</pre>
                            </div>
                        )}

                        {/* Observations */}
                        {(submission.observations || submission.conclusion) && (
                            <div className="card p-6">
                                {submission.observations && (
                                    <div className="mb-4">
                                        <h3 className="font-semibold text-slate-900 mb-2">Observations</h3>
                                        <p className="text-slate-600">{submission.observations}</p>
                                        {submission.observationsHindi && (
                                            <p className="text-slate-500 text-sm mt-1">{submission.observationsHindi}</p>
                                        )}
                                    </div>
                                )}
                                {submission.conclusion && (
                                    <div>
                                        <h3 className="font-semibold text-slate-900 mb-2">Conclusion</h3>
                                        <p className="text-slate-600">{submission.conclusion}</p>
                                        {submission.conclusionHindi && (
                                            <p className="text-slate-500 text-sm mt-1">{submission.conclusionHindi}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Grading Form (for instructors) */}
                        {canGrade && (
                            <div className="card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-slate-900">Grade Submission</h2>
                                    {!showGradeForm && (
                                        <button
                                            onClick={() => setShowGradeForm(true)}
                                            className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition shadow-sm"
                                            title="Grade Now"
                                        >
                                            <Award className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>

                                {showGradeForm && (() => {
                                    const { maxPractical, maxOutput, maxViva, maxTotal } = getAssignmentMarksBreakdown(submission.assignment);

                                    return (
                                        <form onSubmit={handleSubmit(onGradeSubmit)} className="space-y-4">
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="label">Practical Marks (/{maxPractical})</label>
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        min="0"
                                                        max={maxPractical}
                                                        {...register('practicalMarks', {
                                                            required: true,
                                                            valueAsNumber: true,
                                                            min: { value: 0, message: 'Cannot be negative' },
                                                            max: { value: maxPractical, message: `Max allowed is ${maxPractical}` }
                                                        })}
                                                    />
                                                    {errors.practicalMarks && (
                                                        <p className="text-xs text-red-500 mt-1">{errors.practicalMarks.message}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="label">Output Marks (/{maxOutput})</label>
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        min="0"
                                                        max={maxOutput}
                                                        {...register('outputMarks', {
                                                            required: true,
                                                            valueAsNumber: true,
                                                            min: { value: 0, message: 'Cannot be negative' },
                                                            max: { value: maxOutput, message: `Max allowed is ${maxOutput}` }
                                                        })}
                                                    />
                                                    {errors.outputMarks && (
                                                        <p className="text-xs text-red-500 mt-1">{errors.outputMarks.message}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="label">Viva Marks (/{maxViva})</label>
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        min="0"
                                                        max={maxViva}
                                                        {...register('vivaMarks', {
                                                            required: true,
                                                            valueAsNumber: true,
                                                            min: { value: 0, message: 'Cannot be negative' },
                                                            max: { value: maxViva, message: `Max allowed is ${maxViva}` }
                                                        })}
                                                    />
                                                    {errors.vivaMarks && (
                                                        <p className="text-xs text-red-500 mt-1">{errors.vivaMarks.message}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-3 bg-primary-50 rounded-lg">
                                                <p className="text-primary-700 font-medium">
                                                    Total: {totalMarks} / {maxTotal}
                                                </p>
                                            </div>

                                        <div>
                                            <label className="label">Code Feedback</label>
                                            <textarea
                                                className="input min-h-[80px]"
                                                placeholder="Feedback on the code quality, logic, etc."
                                                {...register('codeFeedback')}
                                            />
                                        </div>

                                        <div>
                                            <label className="label">Output Feedback</label>
                                            <textarea
                                                className="input min-h-[80px]"
                                                placeholder="Feedback on the output correctness"
                                                {...register('outputFeedback')}
                                            />
                                        </div>

                                        <div>
                                            <label className="label">General Remarks</label>
                                            <textarea
                                                className="input min-h-[80px]"
                                                placeholder="Overall comments and suggestions"
                                                {...register('generalRemarks')}
                                            />
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setShowGradeForm(false)}
                                                className="p-3 text-slate-500 hover:bg-slate-200 bg-slate-100 rounded-xl transition"
                                                title="Cancel"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleRequestRevision}
                                                className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition shadow-sm"
                                                title="Request Revision"
                                            >
                                                <AlertCircle className="w-5 h-5" />
                                            </button>
                                            <button
                                                type="submit"
                                                className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition shadow-sm disabled:opacity-50"
                                                disabled={grading}
                                                title="Save Grade"
                                            >
                                                {grading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </form>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Submission Info */}
                        <div className="card p-6">
                            <h3 className="font-semibold text-slate-900 mb-4">Submission Details</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-slate-400" />
                                    <div>
                                        <p className="text-sm text-slate-500">Submitted</p>
                                        <p className="font-medium">{new Date(submission.submittedAt).toLocaleString()}</p>
                                    </div>
                                </div>
                                {submission.isLate && (
                                    <div className="p-3 bg-red-50 rounded-lg">
                                        <p className="text-red-700 text-sm font-medium">
                                            Late by {submission.lateDays} days
                                        </p>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-slate-400" />
                                    <div>
                                        <p className="text-sm text-slate-500">Revision</p>
                                        <p className="font-medium">#{submission.submissionNumber}</p>
                                    </div>
                                </div>
                                {submission.assignment && (() => {
                                    const { maxPractical, maxOutput, maxViva, maxTotal } = getAssignmentMarksBreakdown(submission.assignment);

                                    return (
                                        <div className="pt-3 border-t border-slate-100">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Max Marks Breakdown</p>
                                            <div className="space-y-1 text-xs text-slate-600">
                                                <div className="flex justify-between">
                                                    <span>Practical:</span>
                                                    <span className="font-semibold text-slate-800">{maxPractical}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Output:</span>
                                                    <span className="font-semibold text-slate-800">{maxOutput}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Viva:</span>
                                                    <span className="font-semibold text-slate-800">{maxViva}</span>
                                                </div>
                                                <div className="flex justify-between pt-1 border-t border-slate-100 font-bold text-slate-900">
                                                    <span>Total Max:</span>
                                                    <span className="text-primary-600">{maxTotal}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Grade Card */}
                        {submission.grade && (() => {
                            const { maxPractical, maxOutput, maxViva, maxTotal } = getAssignmentMarksBreakdown(submission.assignment);

                            return (
                                <div className="card p-6">
                                    <h3 className="font-semibold text-slate-900 mb-4">Grade</h3>
                                    <div className="text-center mb-4">
                                        <div className="text-4xl font-bold text-primary-600">
                                            {submission.grade.finalMarks}
                                        </div>
                                        <p className="text-slate-500">out of {submission.grade.maxMarks || maxTotal}</p>
                                        {submission.grade.gradeLetter && (
                                            <span className="inline-block mt-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-full font-semibold">
                                                Grade: {submission.grade.gradeLetter}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2.5 text-sm border-t border-slate-100 pt-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600">Practical Marks</span>
                                            <span className="font-semibold text-slate-900">
                                                {submission.grade.practicalMarks} <span className="text-slate-400 font-normal">/ {maxPractical}</span>
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600">Output Marks</span>
                                            <span className="font-semibold text-slate-900">
                                                {submission.grade.outputMarks} <span className="text-slate-400 font-normal">/ {maxOutput}</span>
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-600">Viva Marks</span>
                                            <span className="font-semibold text-slate-900">
                                                {submission.grade.vivaMarks} <span className="text-slate-400 font-normal">/ {maxViva}</span>
                                            </span>
                                        </div>
                                        {submission.grade.latePenaltyMarks > 0 && (
                                            <div className="flex justify-between items-center text-red-600">
                                                <span>Late Penalty</span>
                                                <span className="font-semibold">-{submission.grade.latePenaltyMarks}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center border-t border-slate-200 pt-2 font-bold text-slate-900">
                                            <span>Total Score</span>
                                            <span className="text-primary-600">
                                                {submission.grade.finalMarks} <span className="text-slate-400 font-normal">/ {submission.grade.maxMarks || maxTotal}</span>
                                            </span>
                                        </div>
                                    </div>

                                    {isInstructor && !submission.grade.isPublished && (
                                        <button
                                            onClick={handlePublishGrade}
                                            className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-sm w-full mt-4 flex justify-center items-center"
                                            title="Publish Grade"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    )}

                                    {submission.grade.isPublished && (
                                        <div className="mt-4 p-2 bg-emerald-50 rounded text-center">
                                            <span className="text-emerald-700 text-sm">✓ Published to student</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Feedback */}
                        {submission.grade && (submission.grade.codeFeedback || submission.grade.generalRemarks) && (
                            <div className="card p-6">
                                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5" />
                                    Feedback
                                </h3>
                                {submission.grade.codeFeedback && (
                                    <div className="mb-3">
                                        <p className="text-sm text-slate-500 mb-1">Code Feedback</p>
                                        <p className="text-slate-700">{submission.grade.codeFeedback}</p>
                                    </div>
                                )}
                                {submission.grade.generalRemarks && (
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">General Remarks</p>
                                        <p className="text-slate-700">{submission.grade.generalRemarks}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
