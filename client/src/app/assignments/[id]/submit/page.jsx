'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Upload, Code, Image, FileText, Send, Play, Terminal, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { assignmentsAPI, submissionsAPI, compilerAPI } from '@/lib/api';
import InteractiveTerminal from '@/components/InteractiveTerminal';
import toast from 'react-hot-toast';

export default function SubmitAssignmentPage() {
    const router = useRouter();
    const params = useParams();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [existingSubmission, setExistingSubmission] = useState(null);
    const [runningCode, setRunningCode] = useState(false);
    const [execStatus, setExecStatus] = useState(null);

    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm();

    const handleRunCode = async () => {
        const code = watch('codeContent');
        const stdin = watch('customInput');
        const language = assignment?.programmingLanguage || 'python';
        
        if (!code || !code.trim()) {
            toast.error('Please write or paste code first!');
            return;
        }

        setRunningCode(true);
        setExecStatus(null);

        try {
            const response = await compilerAPI.execute({ language, code, stdin: stdin || '' });
            const data = response.data.data;

            if (data.compile_stderr) {
                setValue('outputContent', (data.compile_stderr + '\n' + (data.stderr || '')).trim());
                setExecStatus({ success: false, message: 'Compilation failed!' });
                toast.error('Compilation error.');
            } else if (data.stderr) {
                setValue('outputContent', (data.stderr + '\n' + (data.stdout || '')).trim());
                setExecStatus({ success: false, message: 'Runtime error!' });
                toast.error('Runtime error.');
            } else {
                setValue('outputContent', data.stdout?.trim() || '[Program executed successfully with no stdout output]');
                setExecStatus({ success: true, message: 'Code executed! Output auto-generated below.' });
                toast.success('Code compiled & executed!');
            }
        } catch (err) {
            console.error('Compilation error:', err);
            const errorMsg = err.response?.data?.message || err.message || String(err);
            setExecStatus({ success: false, message: errorMsg });
            toast.error('Compilation / Execution error.');
        } finally {
            setRunningCode(false);
        }
    };

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadData();
    }, [isAuthenticated, params.id]);

    const loadData = async () => {
        try {
            // First try to load the assignment
            let assignmentData = null;
            try {
                const assignmentRes = await assignmentsAPI.getById(params.id);
                assignmentData = assignmentRes.data.data.assignment;
                setAssignment(assignmentData);
            } catch (assignmentError) {
                console.error('Assignment load error:', assignmentError);
                const status = assignmentError.response?.status;
                const message = assignmentError.response?.data?.message;

                if (status === 403) {
                    toast.error('You are not assigned to this assignment');
                } else if (status === 404) {
                    toast.error('Assignment not found');
                } else {
                    toast.error(message || 'Failed to load assignment details');
                }
                router.push('/assignments');
                return;
            }

            // Then try to load existing submissions (this is optional, failure shouldn't block)
            try {
                const submissionsRes = await submissionsAPI.getMySubmissions({ assignmentId: params.id });
                const submissions = submissionsRes.data.data.submissions || [];
                if (submissions.length > 0) {
                    setExistingSubmission(submissions[0]);
                    setValue('codeContent', submissions[0].codeContent || '');
                    setValue('outputContent', submissions[0].outputContent || '');
                    setValue('observations', submissions[0].observations || '');
                    setValue('conclusion', submissions[0].conclusion || '');
                }
            } catch (submissionError) {
                // Don't block on submission load failure, just log it
                console.warn('Could not load existing submissions:', submissionError);
            }
        } catch (error) {
            console.error('Unexpected error loading data:', error);
            toast.error('An unexpected error occurred');
            router.push('/assignments');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data) => {
        setSubmitting(true);
        try {
            if (existingSubmission) {
                await submissionsAPI.update(existingSubmission.id, {
                    ...data,
                    status: 'submitted'
                });
                toast.success('Submission updated!');
            } else {
                await submissionsAPI.create({
                    assignmentId: params.id,
                    ...data,
                    status: 'submitted'
                });
                toast.success('Assignment submitted successfully!');
            }
            router.push('/assignments');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href={`/assignments/${params.id}`} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition" title="Back">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-xl font-semibold text-slate-900">
                            {existingSubmission ? 'Update Submission' : 'Submit Assignment'}
                        </h1>
                        <p className="text-sm text-slate-500">{assignment?.title}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {existingSubmission && (
                    <div className={`alert mb-6 ${existingSubmission.status === 'needs_revision' ? 'alert-warning' : 'alert-info'}`}>
                        <p>{existingSubmission.status === 'needs_revision' ? 'Your submission requires revision.' : 'You have already submitted this assignment. You can update your submission below.'}</p>
                        <p className="text-sm mt-1">
                            Submission #{existingSubmission.submissionNumber} •
                            Status: <span className="font-medium capitalize">{existingSubmission.status}</span>
                        </p>
                        {existingSubmission.status === 'needs_revision' && existingSubmission.revisions?.[0]?.revisionNote && (
                            <div className="mt-3 p-3 bg-white/50 rounded-lg text-amber-900 border border-amber-200">
                                <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-75">Instructor Comments</p>
                                <p className="text-sm">{existingSubmission.revisions[0].revisionNote}</p>
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Code Content & Compiler */}
                    <div className="card p-6 border border-slate-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2">
                                <Code className="w-5 h-5 text-primary-600" />
                                <h2 className="text-lg font-semibold text-slate-900">Code / Program ({assignment?.programmingLanguage || 'Python'})</h2>
                            </div>
                        </div>

                        <textarea
                            className="input font-mono text-sm min-h-[300px] bg-slate-900 text-emerald-400 p-4 rounded-xl shadow-inner focus:ring-2 focus:ring-emerald-500"
                            placeholder="Write or paste your code here..."
                            {...register('codeContent', { required: assignment?.assignmentType === 'program' ? 'Code is required' : false })}
                        />
                        {errors.codeContent && (
                            <p className="text-red-500 text-sm mt-1">{errors.codeContent.message}</p>
                        )}
                        
                        {/* Interactive IDE Terminal with Live Inline input() */}
                        <div className="mt-6">
                            <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-emerald-600" />
                                <span>Interactive Terminal & Live Output</span>
                                <span className="text-[11px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                    Supports live interactive typing & input()
                                </span>
                            </label>
                            <InteractiveTerminal
                                code={watch('codeContent') || ''}
                                language={assignment?.programmingLanguage || 'python'}
                                initialStdin={watch('customInput') || ''}
                                autoSyncOutput={true}
                                onOutputChange={(out) => setValue('outputContent', out)}
                                className="mt-2"
                            />
                        </div>

                        <div className="mt-4">
                            <details className="text-xs text-slate-500 group">
                                <summary className="cursor-pointer font-medium text-slate-600 hover:text-slate-900 select-none py-1">
                                    ⚙️ Advanced: Pre-fill Batch Custom Input (stdin)
                                </summary>
                                <div className="mt-2">
                                    <textarea
                                        className="input font-mono text-xs min-h-[80px] bg-slate-800 text-emerald-100 p-3 rounded-lg shadow-inner focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Optional: Enter pre-filled batch inputs (one per line) if not typing interactively in the terminal..."
                                        {...register('customInput')}
                                    />
                                </div>
                            </details>
                        </div>
                    </div>

                    {/* Final Program Output */}
                    <div className="card p-6 border border-slate-200">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <div className="flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-emerald-600" />
                                <h2 className="text-lg font-semibold text-slate-900">Final Program Output</h2>
                            </div>
                            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md font-medium">
                                Auto-synchronized from Terminal or editable
                            </span>
                        </div>
                        <textarea
                            className="input font-mono text-sm min-h-[140px] bg-slate-950 text-slate-100 p-4 rounded-xl shadow-inner border border-slate-800"
                            placeholder="Program output will be automatically generated and recorded here as you run code in the Interactive Terminal..."
                            {...register('outputContent')}
                        />
                    </div>

                    {/* Observations */}
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Observations</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Observations (English)</label>
                                <textarea
                                    className="input min-h-[120px]"
                                    placeholder="What did you observe during the experiment?"
                                    {...register('observations')}
                                />
                            </div>
                            <div>
                                <label className="label">Observations (Hindi)</label>
                                <textarea
                                    className="input min-h-[120px]"
                                    placeholder="प्रयोग के दौरान आपने क्या देखा?"
                                    {...register('observationsHindi')}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Conclusion */}
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Conclusion</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Conclusion (English)</label>
                                <textarea
                                    className="input min-h-[100px]"
                                    placeholder="What did you learn from this experiment?"
                                    {...register('conclusion')}
                                />
                            </div>
                            <div>
                                <label className="label">Conclusion (Hindi)</label>
                                <textarea
                                    className="input min-h-[100px]"
                                    placeholder="इस प्रयोग से आपने क्या सीखा?"
                                    {...register('conclusionHindi')}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Link href={`/assignments/${params.id}`} className="p-3 text-slate-500 hover:bg-slate-200 bg-slate-100 rounded-xl transition" title="Cancel">
                            <X className="w-5 h-5" />
                        </Link>
                        <button
                            type="submit"
                            className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition shadow-sm disabled:opacity-50 disabled:hover:bg-primary-600"
                            disabled={submitting}
                            title={existingSubmission ? 'Update Submission' : 'Submit Assignment'}
                        >
                            {submitting ? (
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
