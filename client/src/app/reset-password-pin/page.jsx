'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, Mail, Lock, Eye, EyeOff, ArrowLeft, Ticket, ShieldCheck, CheckCircle2, HelpCircle, AlertTriangle, XCircle, Search } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPinPage() {
    const router = useRouter();
    const [resetMode, setResetMode] = useState('backup-code'); // 'backup-code' | 'pin' | 'security-question'
    const [formData, setFormData] = useState({
        email: '',
        backupCode: '',
        pin: '',
        securityAnswer: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resultData, setResultData] = useState(null);

    // Specific alert states for used code vs invalid code
    const [usedCodeAlert, setUsedCodeAlert] = useState(null);
    const [invalidCodeAlert, setInvalidCodeAlert] = useState(null);

    // Security question states
    const [fetchedQuestion, setFetchedQuestion] = useState(null);
    const [fetchingQuestion, setFetchingQuestion] = useState(false);
    const [questionLookupError, setQuestionLookupError] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Clear specific error alerts when user edits fields
        if (e.target.name === 'backupCode') {
            setUsedCodeAlert(null);
            setInvalidCodeAlert(null);
        }
    };

    const handleFetchSecurityQuestion = async () => {
        if (!formData.email) {
            toast.error('Please enter your email first');
            return;
        }
        setFetchingQuestion(true);
        setQuestionLookupError(null);
        setFetchedQuestion(null);
        try {
            const res = await api.post('/pin/security-questions/lookup', { email: formData.email });
            if (res.data.hasSecurityQuestion && res.data.data?.question) {
                setFetchedQuestion(res.data.data.question);
                toast.success('Security question retrieved!');
            } else {
                setQuestionLookupError('No security question configured for this account.');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'No security question found for this account. Please use your 10-turn paper slip or contact your teacher.';
            setQuestionLookupError(msg);
        } finally {
            setFetchingQuestion(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUsedCodeAlert(null);
        setInvalidCodeAlert(null);

        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (formData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        // --- METHOD 1: 10-Turn Emergency Backup Code ---
        if (resetMode === 'backup-code') {
            const cleanCode = formData.backupCode.trim().replace(/[-\s]/g, '');
            if (cleanCode.length < 6) {
                toast.error('Please enter a valid backup code from your paper slip');
                return;
            }

            try {
                setLoading(true);
                const response = await api.post('/pin/reset-with-backup-code', {
                    email: formData.email,
                    backupCode: formData.backupCode,
                    newPassword: formData.newPassword
                });

                setResultData(response.data);
                toast.success(response.data.message || 'Password reset successfully!');
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            } catch (error) {
                const errData = error.response?.data;
                if (errData?.code === 'BACKUP_CODE_ALREADY_USED') {
                    setUsedCodeAlert(errData);
                } else if (errData?.code === 'INVALID_CODE') {
                    setInvalidCodeAlert(errData.message || 'Invalid code. Please check your paper slip and try again.');
                } else {
                    toast.error(errData?.message || 'Failed to reset password with backup code');
                }
            } finally {
                setLoading(false);
            }
        }

        // --- METHOD 2: Teacher PIN ---
        else if (resetMode === 'pin') {
            if (formData.pin.length !== 6) {
                toast.error('PIN must be 6 digits');
                return;
            }

            try {
                setLoading(true);
                const response = await api.post('/pin/reset-with-pin', {
                    email: formData.email,
                    pin: formData.pin,
                    newPassword: formData.newPassword
                });

                toast.success(response.data.message || 'Password reset successfully!');
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to reset password with PIN');
            } finally {
                setLoading(false);
            }
        }

        // --- METHOD 3: Security Question ---
        else if (resetMode === 'security-question') {
            if (!formData.securityAnswer || formData.securityAnswer.trim().length < 2) {
                toast.error('Please provide the answer to your security question');
                return;
            }

            try {
                setLoading(true);
                const response = await api.post('/pin/reset-with-security-question', {
                    email: formData.email,
                    answer: formData.securityAnswer,
                    newPassword: formData.newPassword
                });

                setResultData(response.data);
                toast.success(response.data.message || 'Password reset successfully!');
                setTimeout(() => {
                    router.push('/login');
                }, 2500);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Incorrect answer to security question');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Back to login */}
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 mb-6 transition-colors font-medium text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Login</span>
                </Link>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
                            {resetMode === 'backup-code' && <Ticket className="w-7 h-7 text-white" />}
                            {resetMode === 'pin' && <KeyRound className="w-7 h-7 text-white" />}
                            {resetMode === 'security-question' && <HelpCircle className="w-7 h-7 text-white" />}
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Lab Password Reset</h1>
                        <p className="text-slate-500 text-xs mt-1">
                            Designed for students and instructors without phone/Google 2FA
                        </p>
                    </div>

                    {/* Method Switcher Tabs (3 Methods) */}
                    <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl mb-6 border border-slate-200 text-center">
                        <button
                            type="button"
                            onClick={() => { setResetMode('backup-code'); setUsedCodeAlert(null); setInvalidCodeAlert(null); }}
                            className={`py-2 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                                resetMode === 'backup-code'
                                    ? 'bg-white text-indigo-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Ticket className="w-3.5 h-3.5 text-indigo-600" />
                            10-Turn Slip
                        </button>
                        <button
                            type="button"
                            onClick={() => { setResetMode('pin'); setUsedCodeAlert(null); setInvalidCodeAlert(null); }}
                            className={`py-2 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                                resetMode === 'pin'
                                    ? 'bg-white text-amber-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                            Teacher PIN
                        </button>
                        <button
                            type="button"
                            onClick={() => { setResetMode('security-question'); setUsedCodeAlert(null); setInvalidCodeAlert(null); }}
                            className={`py-2 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                                resetMode === 'security-question'
                                    ? 'bg-white text-teal-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                            Question
                        </button>
                    </div>

                    {/* Specific Alert: Used Backup Code with Datetime */}
                    {usedCodeAlert && (
                        <div className="mb-5 p-4 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-950 text-xs animate-in fade-in shadow-xs">
                            <div className="flex items-start gap-2.5">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-extrabold text-amber-900 text-sm">
                                        Turn #{usedCodeAlert.data?.turnIndex} Already Used!
                                    </div>
                                    <p className="mt-1 text-amber-800 leading-relaxed">
                                        This backup code was already consumed on{' '}
                                        <strong className="font-mono bg-amber-100 px-1 py-0.5 rounded border border-amber-300">
                                            {usedCodeAlert.data?.formattedDateTime || 'a previous session'}
                                        </strong>.
                                    </p>
                                    <p className="mt-2 text-amber-700 font-medium">
                                        👉 Please select another unused turn from your printed A4 slip.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Specific Alert: Invalid Code */}
                    {invalidCodeAlert && (
                        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 text-xs animate-in fade-in">
                            <div className="flex items-center gap-2 font-bold text-rose-800">
                                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                Invalid Code
                            </div>
                            <p className="mt-1 text-rose-700">
                                {invalidCodeAlert}
                            </p>
                        </div>
                    )}

                    {/* Result Success Banner */}
                    {resultData && (
                        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs animate-in fade-in">
                            <div className="flex items-center gap-2 font-bold text-sm mb-1 text-emerald-800">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                Password Reset Successful!
                            </div>
                            <p className="mb-2">{resultData.message}</p>
                            {resultData.data?.remainingTurns !== undefined && (
                                <div className="p-2 bg-white rounded border border-emerald-200 font-mono text-[11px] font-bold text-emerald-700">
                                    Turn #{resultData.data.usedTurn} consumed. Turns Remaining: {resultData.data.remainingTurns} / 10
                                </div>
                            )}
                            <p className="text-[10px] text-emerald-600 mt-2">Redirecting to login page...</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Registered Email / Roll No. Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter your registered email"
                                    className="input pl-9 text-sm"
                                />
                            </div>
                        </div>

                        {/* MODE 1: 10-Turn Slip */}
                        {resetMode === 'backup-code' && (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        Emergency Backup Code (from paper slip)
                                    </label>
                                    <span className="text-[10px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                                        XXXX-XXXX
                                    </span>
                                </div>
                                <div className="relative">
                                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        name="backupCode"
                                        value={formData.backupCode}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g. 4812-9214"
                                        className="input pl-9 font-mono tracking-widest text-center text-base uppercase"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Use any 1 unused turn from your printed A4 slip. Tick it off after use.
                                </p>
                            </div>
                        )}

                        {/* MODE 2: Teacher PIN */}
                        {resetMode === 'pin' && (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        6-Digit PIN (from Teacher)
                                    </label>
                                    <span className="text-[10px] font-mono font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                                        6 Digits
                                    </span>
                                </div>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        name="pin"
                                        value={formData.pin}
                                        onChange={handleChange}
                                        required
                                        maxLength={6}
                                        placeholder="Enter 6-digit PIN"
                                        className="input pl-9 tracking-widest text-center font-mono text-base"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Ask your lab instructor to generate a temporary PIN.
                                </p>
                            </div>
                        )}

                        {/* MODE 3: Security Question */}
                        {resetMode === 'security-question' && (
                            <div className="space-y-3">
                                {!fetchedQuestion ? (
                                    <div>
                                        <button
                                            type="button"
                                            onClick={handleFetchSecurityQuestion}
                                            disabled={fetchingQuestion || !formData.email}
                                            className="w-full py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                        >
                                            <Search className="w-3.5 h-3.5" />
                                            {fetchingQuestion ? 'Looking up question...' : 'Find My Security Question'}
                                        </button>
                                        {questionLookupError && (
                                            <p className="text-xs text-rose-600 mt-1.5 bg-rose-50 p-2 rounded border border-rose-200">
                                                {questionLookupError}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl mb-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700 mb-0.5">
                                                Your Security Question
                                            </div>
                                            <div className="text-xs font-semibold text-teal-950">
                                                {fetchedQuestion}
                                            </div>
                                        </div>

                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                            Your Answer / आपका उत्तर
                                        </label>
                                        <input
                                            type="text"
                                            name="securityAnswer"
                                            value={formData.securityAnswer}
                                            onChange={handleChange}
                                            required
                                            placeholder="Enter your answer"
                                            className="input text-sm"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* New Password */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                New Password / नया पासवर्ड
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    required
                                    minLength={6}
                                    placeholder="Minimum 6 characters"
                                    className="input pl-9 pr-9 text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Confirm Password / पासवर्ड की पुष्टि करें
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    minLength={6}
                                    placeholder="Re-enter new password"
                                    className="input pl-9 text-sm"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full py-2.5 text-sm font-bold shadow-md cursor-pointer mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                    Verifying & Resetting...
                                </span>
                            ) : (
                                resetMode === 'backup-code' ? 'Use 1 Turn & Reset Password' :
                                resetMode === 'pin' ? 'Reset Password with PIN' :
                                'Verify Answer & Reset Password'
                            )}
                        </button>
                    </form>

                    {/* Notice box */}
                    <div className="mt-5 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-slate-600 leading-relaxed">
                            <strong>Lost your paper slip?</strong> Your teacher or administrator can print a fresh set of 10 backup codes for you anytime from the Admin panel.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
