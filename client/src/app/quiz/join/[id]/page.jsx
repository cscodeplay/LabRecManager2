'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    HelpCircle, Clock, Play, Award, CheckCircle2, XCircle, 
    ChevronLeft, ChevronRight, LogIn, User, Sparkles, AlertCircle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';
import { quizAPI, authAPI } from '@/lib/api';

export default function QuizJoinPage() {
    const params = useParams();
    const router = useRouter();
    const quizCodeOrId = params?.id;
    const { user, isAuthenticated, setAuth } = useAuthStore();

    const [quiz, setQuiz] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Inline Login State (if taking on another device while logged out)
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Active Quiz Taking State
    const [hasStarted, setHasStarted] = useState(false);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [userAnswers, setUserAnswers] = useState({}); // { [qId]: 'A' | 'B' | 'C' | 'D' }
    const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [quizResult, setQuizResult] = useState(null);

    // Fetch quiz metadata for taking
    useEffect(() => {
        if (!quizCodeOrId) return;

        const loadQuiz = async () => {
            try {
                setIsLoading(true);
                setError('');
                const res = await quizAPI.getForTaking(quizCodeOrId);
                if (res.data.success) {
                    setQuiz(res.data.data);
                    const totalSec = (res.data.data.timeLimitMinutes || 10) * 60;
                    setTimeLeftSeconds(totalSec);
                }
            } catch (err) {
                console.error('Failed to load quiz', err);
                setError(err.response?.data?.message || 'Quiz not found or is not yet published');
            } finally {
                setIsLoading(false);
            }
        };

        loadQuiz();
    }, [quizCodeOrId]);

    // Timer countdown
    useEffect(() => {
        let timer = null;
        if (isTimerRunning && timeLeftSeconds > 0) {
            timer = setInterval(() => {
                setTimeLeftSeconds((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setIsTimerRunning(false);
                        handleAutoSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isTimerRunning, timeLeftSeconds]);

    const handleInlineLogin = async (e) => {
        e.preventDefault();
        if (!loginEmail.trim() || !loginPassword.trim()) {
            toast.error('Please enter your email and password');
            return;
        }

        try {
            setIsLoggingIn(true);
            const res = await authAPI.login(loginEmail.trim(), loginPassword.trim());
            if (res.data.success) {
                const { user, accessToken, refreshToken } = res.data.data;
                setAuth(user, accessToken, refreshToken);
                toast.success(`Welcome back, ${user.firstName || user.name}!`);
            }
        } catch (err) {
            console.error('Login error', err);
            toast.error(err.response?.data?.message || 'Login failed. Please verify credentials.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleStartQuiz = () => {
        if (!isAuthenticated) {
            toast.error('Please sign in with your Login ID before starting the quiz');
            return;
        }
        setHasStarted(true);
        setIsTimerRunning(true);
    };

    const handleSelectOption = (questionId, optKey) => {
        setUserAnswers(prev => ({
            ...prev,
            [questionId]: optKey
        }));
    };

    const handleAutoSubmit = () => {
        toast('Time is up! Submitting your answers...', { icon: '⏰' });
        handleSubmitQuiz(true);
    };

    const handleSubmitQuiz = async (isTimeout = false) => {
        if (!quiz) return;

        try {
            setIsSubmitting(true);
            setIsTimerRunning(false);

            const formattedAnswers = Object.entries(userAnswers).map(([qId, opt]) => ({
                questionId: parseInt(qId) || qId,
                selectedOption: opt
            }));

            const durationTaken = Math.max(0, ((quiz.timeLimitMinutes || 10) * 60) - timeLeftSeconds);

            const res = await quizAPI.submit(quiz.id || quiz.code, {
                answers: formattedAnswers,
                timeTakenSeconds: durationTaken,
                isTimedOut: Boolean(isTimeout)
            });

            if (res.data.success) {
                setQuizResult(res.data.data);
                toast.success(`Quiz Submitted! Final Score: ${res.data.data.score}/${res.data.data.totalQuestions}`);
            }
        } catch (err) {
            console.error('Submission failed', err);
            toast.error(err.response?.data?.message || 'Submission failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTimer = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
                <div className="text-center space-y-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
                    <p className="text-sm text-slate-400">Loading quiz details...</p>
                </div>
            </div>
        );
    }

    if (error || !quiz) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
                    <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                    <h2 className="text-lg font-bold text-white">Quiz Unavailable</h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        {error || 'Unable to join this quiz. Please verify the link or contact your instructor.'}
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
            <div className="max-w-xl w-full">

                {/* 1. QUIZ LOBBY SCREEN (BEFORE START) */}
                {!hasStarted && !quizResult && (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
                        <div className="text-center space-y-2">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                                Join Code: {quiz.code}
                            </span>
                            <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-2">
                                {quiz.title}
                            </h1>
                            {quiz.description && (
                                <p className="text-xs text-slate-400 max-w-md mx-auto">
                                    {quiz.description}
                                </p>
                            )}
                        </div>

                        {/* Quiz Parameters Grid */}
                        <div className="grid grid-cols-3 gap-3 text-center bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Questions</div>
                                <div className="text-base font-extrabold text-white">{quiz.totalQuestions}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Duration</div>
                                <div className="text-base font-extrabold text-white">{quiz.timeLimitMinutes} Mins</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Difficulty</div>
                                <div className="text-base font-extrabold text-indigo-400 capitalize">{quiz.difficulty}</div>
                            </div>
                        </div>

                        {/* Authentication State & Login ID Check */}
                        {isAuthenticated ? (
                            <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-2xl space-y-2">
                                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Authenticated Participant</span>
                                </div>
                                <p className="text-xs text-slate-300">
                                    Taking quiz as: <strong>{user?.firstName} {user?.lastName}</strong>
                                </p>
                                <p className="text-[11px] text-slate-400 font-mono">
                                    Login ID: {user?.email || user?.studentId || user?.id}
                                </p>
                                <button
                                    onClick={handleStartQuiz}
                                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-bold text-sm shadow-xl transition flex items-center justify-center gap-2 mt-3"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                    Start Timed Quiz
                                </button>
                            </div>
                        ) : (
                            <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl space-y-4">
                                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                                    <LogIn className="w-4 h-4" />
                                    <span>Sign in Required to Record Your Result</span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Please enter your credentials to record your quiz submission under your Login ID.
                                </p>

                                <form onSubmit={handleInlineLogin} className="space-y-3">
                                    <input
                                        type="email"
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                        placeholder="Email / Login ID"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    />
                                    <input
                                        type="password"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        placeholder="Password"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isLoggingIn}
                                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-1.5"
                                    >
                                        {isLoggingIn ? 'Signing in...' : 'Sign In & Join'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. ACTIVE QUIZ TAKING INTERFACE */}
                {hasStarted && !quizResult && quiz.questions && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* Sticky Top Timer Bar */}
                        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-xl ${
                            timeLeftSeconds < 60
                                ? 'bg-rose-950/80 border-rose-500 text-rose-200 animate-pulse'
                                : 'bg-slate-900/90 border-slate-800 text-white'
                        }`}>
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-400" />
                                <span className="text-xs font-bold">Time Left:</span>
                            </div>
                            <div className="font-mono text-xl font-extrabold tracking-wider">
                                {formatTimer(timeLeftSeconds)}
                            </div>
                        </div>

                        {/* Question Navigator Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                            {quiz.questions.map((q, idx) => {
                                const isAnswered = !!userAnswers[q.id];
                                const isCurrent = idx === currentQuestionIdx;
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentQuestionIdx(idx)}
                                        className={`w-8 h-8 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center flex-shrink-0 ${
                                            isCurrent
                                                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                                                : isAnswered
                                                ? 'bg-emerald-600/60 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Active Question Card */}
                        {(() => {
                            const q = quiz.questions[currentQuestionIdx];
                            const currentSelected = userAnswers[q.id];

                            return (
                                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl backdrop-blur-xl">
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <span className="font-bold text-indigo-400">
                                            Question {currentQuestionIdx + 1} of {quiz.questions.length}
                                        </span>
                                        <span className="text-[11px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                            1 Point
                                        </span>
                                    </div>

                                    <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                                        {q.question}
                                    </h3>

                                    {/* 4 Choices */}
                                    <div className="space-y-2.5 pt-2">
                                        {(q.options || []).map((opt) => {
                                            const isSelected = currentSelected === opt.key;
                                            return (
                                                <button
                                                    key={opt.key}
                                                    onClick={() => handleSelectOption(q.id, opt.key)}
                                                    className={`w-full p-3.5 rounded-2xl border text-left text-xs sm:text-sm font-medium transition flex items-center gap-3 ${
                                                        isSelected
                                                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                                                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
                                                    }`}
                                                >
                                                    <span className={`w-7 h-7 rounded-xl font-mono font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                                                        isSelected ? 'bg-white text-indigo-700' : 'bg-slate-800 text-slate-400'
                                                    }`}>
                                                        {opt.key}
                                                    </span>
                                                    <span className="flex-1">{opt.text}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Navigation & Submit Buttons */}
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                                        <button
                                            onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                                            disabled={currentQuestionIdx === 0}
                                            className="py-2 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                                        >
                                            <ChevronLeft className="w-4 h-4" /> Previous
                                        </button>

                                        {currentQuestionIdx < quiz.questions.length - 1 ? (
                                            <button
                                                onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                                                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow"
                                            >
                                                Next <ChevronRight className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleSubmitQuiz(false)}
                                                disabled={isSubmitting}
                                                className="py-2.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-1.5"
                                            >
                                                {isSubmitting ? 'Grading...' : 'Submit Answers'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* 3. POST-SUBMISSION RESULTS SCREEN */}
                {quizResult && (
                    <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-300">
                        <div className="text-center space-y-3">
                            <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                                <Award className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                                Quiz Results
                            </h2>
                            <p className="text-xs text-slate-400 font-mono">
                                Registered with Login ID: {user?.email || user?.studentId || quizResult.userId}
                            </p>
                        </div>

                        {/* Score Overview */}
                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center space-y-1">
                            <div className="text-4xl font-extrabold text-indigo-400">
                                {quizResult.score} / {quizResult.totalQuestions}
                            </div>
                            <div className="text-xs font-bold text-emerald-400">
                                Accuracy: {quizResult.percentage}%
                            </div>
                            <div className="text-[11px] text-slate-500">
                                Time Taken: {Math.floor(quizResult.timeTakenSeconds / 60)}m {quizResult.timeTakenSeconds % 60}s
                            </div>
                        </div>

                        {/* Question Breakdown with Explanations */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                Detailed Question Review
                            </h3>
                            {(quizResult.answers || []).map((ans, idx) => (
                                <div
                                    key={idx}
                                    className={`p-4 rounded-2xl border text-xs space-y-2 ${
                                        ans.isCorrect
                                            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                                            : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between font-bold">
                                        <span>Q{idx + 1}: {ans.questionText}</span>
                                        {ans.isCorrect ? (
                                            <span className="flex items-center gap-1 text-emerald-400">
                                                <CheckCircle2 className="w-4 h-4" /> Correct
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-rose-400">
                                                <XCircle className="w-4 h-4" /> Incorrect
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-slate-300 text-xs">
                                        Your Answer: <strong className="font-mono">{ans.selectedOption || 'Not Answered'}</strong> • Correct Answer: <strong className="font-mono text-emerald-400">{ans.correctOption}</strong>
                                    </div>
                                    {ans.explanation && (
                                        <div className="text-[11px] text-slate-400 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                                            💡 {ans.explanation}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => router.push('/')}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition shadow"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
