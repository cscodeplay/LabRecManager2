'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    HelpCircle, Clock, Play, Award, CheckCircle2, XCircle, 
    ChevronLeft, ChevronRight, LogIn, AlertCircle, RefreshCw, Maximize2
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

    // Inline Login State
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

    // Proctoring & Fullscreen warning state
    const [warningActive, setWarningActive] = useState(false);
    const [warningCountdown, setWarningCountdown] = useState(5);
    const warningTimerRef = useRef(null);
    const hasStartedRef = useRef(false);
    const isSubmittingRef = useRef(false);
    const quizResultRef = useRef(null);

    hasStartedRef.current = hasStarted;
    isSubmittingRef.current = isSubmitting;
    quizResultRef.current = quizResult;

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
                setError(err.response?.data?.message || 'Quiz not found or not accessible');
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

    // Fullscreen helper functions
    const enterFullscreen = async () => {
        try {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                await elem.msRequestFullscreen();
            }
        } catch (err) {
            console.warn('[Quiz] Could not enter fullscreen automatically:', err);
        }
    };

    const exitFullscreen = () => {
        try {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            }
        } catch (err) {}
    };

    // Proctoring warning trigger
    const triggerProctorWarning = () => {
        if (!hasStartedRef.current || quizResultRef.current || isSubmittingRef.current) return;
        setWarningActive(true);
    };

    const dismissProctorWarning = () => {
        setWarningActive(false);
        setWarningCountdown(5);
        if (warningTimerRef.current) {
            clearInterval(warningTimerRef.current);
            warningTimerRef.current = null;
        }
        enterFullscreen();
    };

    // 5-second countdown effect when warning is active
    useEffect(() => {
        if (warningActive) {
            setWarningCountdown(5);
            warningTimerRef.current = setInterval(() => {
                setWarningCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(warningTimerRef.current);
                        warningTimerRef.current = null;
                        setWarningActive(false);
                        toast.error('Security alert: Fullscreen not restored. Auto-submitting test now.');
                        handleSubmitQuiz(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (warningTimerRef.current) {
                clearInterval(warningTimerRef.current);
                warningTimerRef.current = null;
            }
            setWarningCountdown(5);
        }
        return () => {
            if (warningTimerRef.current) {
                clearInterval(warningTimerRef.current);
            }
        };
    }, [warningActive]);

    // Fullscreen & window blur/visibility change listeners
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
            if (!isFull && hasStartedRef.current && !quizResultRef.current && !isSubmittingRef.current) {
                triggerProctorWarning();
            } else if (isFull && !document.hidden) {
                setWarningActive(false);
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden && hasStartedRef.current && !quizResultRef.current && !isSubmittingRef.current) {
                triggerProctorWarning();
            } else if (!document.hidden) {
                const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
                if (isFull) {
                    setWarningActive(false);
                }
            }
        };

        const handleWindowBlur = () => {
            if (hasStartedRef.current && !quizResultRef.current && !isSubmittingRef.current) {
                triggerProctorWarning();
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
        };
    }, []);

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
                toast.success(`Welcome back!`);
                // Reload quiz info to check assignment and attempts for this user
                const quizRes = await quizAPI.getForTaking(quizCodeOrId);
                if (quizRes.data.success) {
                    setQuiz(quizRes.data.data);
                }
            }
        } catch (err) {
            console.error('Login error', err);
            toast.error(err.response?.data?.message || 'Login failed. Please verify credentials.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleStartQuiz = async () => {
        if (!isAuthenticated) {
            toast.error('Please sign in before starting the quiz');
            return;
        }
        if (quiz?.canAttempt === false || (quiz?.attemptsTaken >= quiz?.maxAttempts)) {
            toast.error(`Maximum attempts reached (${quiz?.maxAttempts || 1}/${quiz?.maxAttempts || 1}).`);
            return;
        }
        await enterFullscreen();
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
        if (!quiz || isSubmitting) return;

        try {
            setIsSubmitting(true);
            setIsTimerRunning(false);
            setWarningActive(false);

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
                exitFullscreen();
                toast.success(`Quiz Submitted! Final Score: ${res.data.data.score}/${res.data.data.totalQuestions}`);
            }
        } catch (err) {
            console.error('Submission failed', err);
            toast.error(err.response?.data?.message || 'Submission failed');
        } finally {
            setIsSubmitting(false);
            exitFullscreen();
        }
    };

    const formatTimer = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4">
                <div className="text-center space-y-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
                    <p className="text-sm text-slate-500">Loading quiz details...</p>
                </div>
            </div>
        );
    }

    if (error || !quiz) {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
                    <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quiz Unavailable</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {error || 'Unable to join this quiz. It may not be assigned to your class, group, or account.'}
                    </p>
                    <button
                        onClick={() => router.push('/quiz')}
                        className="py-2.5 px-5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow"
                    >
                        Return to Quizzes
                    </button>
                </div>
            </div>
        );
    }

    const maxAttempts = quiz.maxAttempts || 1;
    const attemptsTaken = quiz.attemptsTaken || 0;
    const isAttemptsExhausted = attemptsTaken >= maxAttempts;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4">
            
            {/* PROCTORING 5-SECOND WARNING MODAL */}
            {warningActive && (
                <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border-2 border-rose-500 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
                        <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto text-3xl">
                            ⚠️
                        </div>
                        <h3 className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
                            Security Alert!
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Full-screen mode was exited or you navigated away from the quiz window. Return to full screen immediately!
                        </p>
                        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800">
                            <span className="text-xs uppercase font-bold text-rose-600 dark:text-rose-400">Auto-submitting test in</span>
                            <div className="text-4xl font-mono font-black text-rose-600 dark:text-rose-400 mt-1">
                                00:0{warningCountdown}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={dismissProctorWarning}
                            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2"
                        >
                            <Maximize2 className="w-4 h-4" />
                            Return to Full Screen
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-xl w-full">

                {/* 1. QUIZ LOBBY SCREEN (BEFORE START) */}
                {!hasStarted && !quizResult && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                        <div className="text-center space-y-2">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800">
                                Code: {quiz.code}
                            </span>
                            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                                {quiz.title}
                            </h1>
                            {quiz.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                    {quiz.description}
                                </p>
                            )}
                        </div>

                        {/* Quiz Parameters Grid */}
                        <div className="grid grid-cols-4 gap-2 text-center bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Questions</div>
                                <div className="text-base font-extrabold text-slate-900 dark:text-white">{quiz.totalQuestions}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Duration</div>
                                <div className="text-base font-extrabold text-slate-900 dark:text-white">{quiz.timeLimitMinutes} Mins</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Difficulty</div>
                                <div className="text-base font-extrabold text-primary-600 capitalize">{quiz.difficulty}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Attempts</div>
                                <div className="text-base font-extrabold text-slate-900 dark:text-white">
                                    {attemptsTaken} / {maxAttempts}
                                </div>
                            </div>
                        </div>

                        {/* Proctoring Notice */}
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/40 p-3.5 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                            <div>
                                <strong className="font-semibold block mb-0.5">Test Security & Full-Screen Policy</strong>
                                <span>Starting the quiz will lock your screen into full-screen mode. Attempting to exit or switch tabs triggers a 5-second countdown before auto-submitting.</span>
                            </div>
                        </div>

                        {/* Authentication State Check */}
                        {isAuthenticated ? (
                            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700/30 p-4 rounded-2xl space-y-3">
                                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Ready to Begin Assessment</span>
                                </div>

                                {isAttemptsExhausted ? (
                                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold text-center">
                                        Maximum attempts reached ({attemptsTaken}/{maxAttempts}). You cannot take this quiz again.
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleStartQuiz}
                                        className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 mt-2"
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                        Start Full-Screen Quiz
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4">
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold">
                                    <LogIn className="w-4 h-4" />
                                    <span>Sign in Required to Take Assessment</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Please enter your credentials to verify your assignment and start the quiz.
                                </p>

                                <form onSubmit={handleInlineLogin} className="space-y-3">
                                    <input
                                        type="email"
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                        placeholder="Email Address"
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                                    />
                                    <input
                                        type="password"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        placeholder="Password"
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isLoggingIn}
                                        className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-1.5"
                                    >
                                        {isLoggingIn ? 'Signing in...' : 'Sign In & Verify'}
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
                        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-md ${
                            timeLeftSeconds < 60
                                ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-400 text-rose-700 dark:text-rose-200 animate-pulse'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
                        }`}>
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary-600" />
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
                                                ? 'bg-primary-600 text-white ring-2 ring-primary-400'
                                                : isAnswered
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
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
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span className="font-bold text-primary-600">
                                            Question {currentQuestionIdx + 1} of {quiz.questions.length}
                                        </span>
                                        <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                                            1 Point
                                        </span>
                                    </div>

                                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
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
                                                            ? 'bg-primary-600 border-primary-500 text-white shadow-md'
                                                            : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                    }`}
                                                >
                                                    <span className={`w-7 h-7 rounded-xl font-mono font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                                                        isSelected ? 'bg-white text-primary-700' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {opt.key}
                                                    </span>
                                                    <span className="flex-1">{opt.text}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Navigation & Submit Buttons */}
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                                        <button
                                            onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                                            disabled={currentQuestionIdx === 0}
                                            className="py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                                        >
                                            <ChevronLeft className="w-4 h-4" /> Previous
                                        </button>

                                        {currentQuestionIdx < quiz.questions.length - 1 ? (
                                            <button
                                                onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                                                className="py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow"
                                            >
                                                Next <ChevronRight className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleSubmitQuiz(false)}
                                                disabled={isSubmitting}
                                                className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
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
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in zoom-in-95 duration-300">
                        <div className="text-center space-y-3">
                            <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-md">
                                <Award className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                                Quiz Results
                            </h2>
                        </div>

                        {/* Score Overview */}
                        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                            <div className="text-4xl font-extrabold text-primary-600">
                                {quizResult.score} / {quizResult.totalQuestions}
                            </div>
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                Accuracy: {quizResult.percentage}%
                            </div>
                            <div className="text-[11px] text-slate-500">
                                Time Taken: {Math.floor(quizResult.timeTakenSeconds / 60)}m {quizResult.timeTakenSeconds % 60}s
                            </div>
                        </div>

                        {/* Question Breakdown with Explanations */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Detailed Question Review
                            </h3>
                            {(quizResult.answers || []).map((ans, idx) => (
                                <div
                                    key={idx}
                                    className={`p-4 rounded-2xl border text-xs space-y-2 ${
                                        ans.isCorrect
                                            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                                            : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between font-bold">
                                        <span>Q{idx + 1}: {ans.questionText}</span>
                                        {ans.isCorrect ? (
                                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 className="w-4 h-4" /> Correct
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                                <XCircle className="w-4 h-4" /> Incorrect
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-slate-700 dark:text-slate-300 text-xs">
                                        Your Answer: <strong className="font-mono">{ans.selectedOption || 'Not Answered'}</strong> • Correct Answer: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{ans.correctOption}</strong>
                                    </div>
                                    {ans.explanation && (
                                        <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-950/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed">
                                            💡 {ans.explanation}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => router.push('/quiz')}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition shadow"
                        >
                            Return to Quizzes
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
