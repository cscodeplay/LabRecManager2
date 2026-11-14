'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
    Eye, EyeOff, LogIn, Calendar, KeyRound, Lock, Globe,
    ChevronDown, Check, Search, Shield, ShieldCheck, Sparkles
} from 'lucide-react';
import { FluentInstituteOpsIcon, FluentExamHubIcon } from '@/components/FluentAppIcons';
import { authAPI } from '@/lib/api';
import { useAuthStore, useLanguageStore } from '@/lib/store';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import DatabaseStatus from '@/components/DatabaseStatus';

// Login Page Language Selector Component
function LoginLanguageSelector() {
    const { t, i18n } = useTranslation('common');
    const { language, setLanguage } = useLanguageStore();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);

    const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageChange = (langCode) => {
        setLanguage(langCode);
        i18n.changeLanguage(langCode);
        setIsOpen(false);
        setSearchQuery('');

        const selectedLang = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
        if (selectedLang?.dir === 'rtl') {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
    };

    const filteredLanguages = SUPPORTED_LANGUAGES.filter(lang =>
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const indianLanguages = filteredLanguages.filter(l => l.group === 'indian');
    const internationalLanguages = filteredLanguages.filter(l => l.group === 'international');

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>{currentLang.nativeName}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2.5 border-b border-slate-100 dark:border-slate-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('common.search') + '...'}
                                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {internationalLanguages.length > 0 && (
                            <div className="p-1">
                                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {t('language.internationalLanguages')}
                                </div>
                                {internationalLanguages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        type="button"
                                        onClick={() => handleLanguageChange(lang.code)}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition ${language === lang.code ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <div>
                                            <span className="block text-xs font-semibold">{lang.nativeName}</span>
                                            <span className="block text-[10px] text-slate-400">{lang.name}</span>
                                        </div>
                                        {language === lang.code && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                    </button>
                                ))}
                            </div>
                        )}

                        {indianLanguages.length > 0 && (
                            <div className="p-1">
                                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {t('language.indianLanguages')}
                                </div>
                                {indianLanguages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        type="button"
                                        onClick={() => handleLanguageChange(lang.code)}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition ${language === lang.code ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <div>
                                            <span className="block text-xs font-semibold">{lang.nativeName}</span>
                                            <span className="block text-[10px] text-slate-400">{lang.name}</span>
                                        </div>
                                        {language === lang.code && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function LoginPage() {
    const router = useRouter();
    const { t } = useTranslation('common');
    const { setAuth, setSession, setAvailableSessions } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Session selection state
    const [academicYears, setAcademicYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [loadingYears, setLoadingYears] = useState(true);
    const [schoolInfo, setSchoolInfo] = useState({ name: '', nameHindi: '', logoUrl: '' });
    const [logoLoadError, setLogoLoadError] = useState(false);

    // PIN login state
    const [loginMode, setLoginMode] = useState('password');
    const [pinVerified, setPinVerified] = useState(false);
    const [pinEmail, setPinEmail] = useState('');
    const [pinValue, setPinValue] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [codeType, setCodeType] = useState('pin');
    const [firstTimeAlert, setFirstTimeAlert] = useState(null);

    const { register, handleSubmit, formState: { errors } } = useForm();

    useEffect(() => {
        try {
            const cached = localStorage.getItem('school_branding');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed?.name || parsed?.logoUrl) {
                    setSchoolInfo(prev => ({ ...prev, ...parsed }));
                }
            }
        } catch (e) {
            // ignore
        }

        loadAcademicYears();
    }, []);

    const loadAcademicYears = async () => {
        try {
            const res = await axios.get('/api/schools/academic-years');
            const years = res.data.data?.academicYears || [];
            let schoolData = res.data.data?.school;

            if (!schoolData || !schoolData.logoUrl) {
                try {
                    const brandRes = await axios.get('/api/schools/branding');
                    if (brandRes.data?.data?.school) {
                        schoolData = { ...(schoolData || {}), ...brandRes.data.data.school };
                    }
                } catch (bErr) {
                    console.warn('Could not load separate branding:', bErr.message);
                }
            }

            if (schoolData && (schoolData.name || schoolData.logoUrl)) {
                setSchoolInfo(schoolData);
                try {
                    localStorage.setItem('school_branding', JSON.stringify(schoolData));
                } catch (e) {
                    // ignore
                }
            }

            setAcademicYears(years);

            const currentYear = years.find(y => y.isCurrent);
            if (currentYear) {
                setSelectedYear(currentYear.id);
            } else if (years.length > 0) {
                const sorted = [...years].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
                setSelectedYear(sorted[0].id);
            }
        } catch (error) {
            console.error('Could not load academic years:', error.message);
            setTimeout(async () => {
                try {
                    const retryRes = await axios.get('/api/schools/academic-years');
                    const retryYears = retryRes.data?.data?.academicYears || [];
                    if (retryYears.length > 0) {
                        setAcademicYears(retryYears);
                        const cur = retryYears.find(y => y.isCurrent) || retryYears[0];
                        if (cur) setSelectedYear(cur.id);
                    }
                } catch (retryErr) {
                    console.warn('Academic years retry failed:', retryErr.message);
                }
            }, 2500);
        } finally {
            setLoadingYears(false);
        }
    };

    const onSubmit = async (data) => {
        if (academicYears.length > 0 && !selectedYear) {
            toast.error(t('auth.academicSession'));
            return;
        }

        setIsLoading(true);
        try {
            const response = await authAPI.login(data.email, data.password);
            const { user, accessToken, refreshToken } = response.data.data;
            setAuth(user, accessToken, refreshToken);

            const selectedSession = academicYears.find(y => y.id === selectedYear);
            if (selectedSession) {
                setAvailableSessions(academicYears);
                setSession(selectedSession);
            }

            toast.success(t('auth.welcome'));
            setTimeout(() => router.replace('/dashboard'), 100);
        } catch (error) {
            if (error.response?.data?.isAdminRestricted) {
                toast.error(error.response.data.message || 'Administrative accounts must log in via /adminmoslogin', { duration: 6000 });
                setTimeout(() => router.push('/adminmoslogin'), 1200);
                return;
            }
            if (error.response?.data?.requiresPasswordSetup) {
                const resData = error.response.data;
                toast.error(resData.message || 'You must set a new password before accessing the application.');
                setLoginMode('pin');
                if (data.email) setPinEmail(data.email);
                const enteredPass = data.password ? data.password.trim() : '';
                const verifiedPin = resData.data?.verifiedPin;
                if (resData.matchedViaPin || verifiedPin) {
                    setPinValue(verifiedPin || enteredPass);
                    setPinVerified(true);
                    setFirstName(resData.data?.firstName || 'Student');
                    toast.success('Default PIN verified! Please set your personal password.');
                } else if (/^\d{6}$/.test(enteredPass)) {
                    setPinValue(enteredPass);
                }
                return;
            }
            toast.error(error.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePinVerify = async () => {
        if (!pinEmail || !pinValue) {
            toast.error('Enter email and verification code');
            return;
        }
        setFirstTimeAlert(null);
        setIsLoading(true);

        const cleanVal = pinValue.trim().replace(/[-\s]/g, '');
        const isBackup = cleanVal.length > 6 || pinValue.includes('-');

        try {
            if (isBackup) {
                setCodeType('backup-code');
                const response = await axios.post('/api/pin/login-with-backup-code', {
                    email: pinEmail,
                    backupCode: pinValue
                });
                if (response.data.requiresPasswordSetup) {
                    setPinVerified(true);
                    setFirstName(response.data.data.firstName || 'Student');
                    toast.success(response.data.message || 'Backup code verified! Please set your password.');
                }
            } else {
                setCodeType('pin');
                if (cleanVal.length !== 6) {
                    toast.error('PIN must be 6 digits or enter an 8-character backup code');
                    setIsLoading(false);
                    return;
                }
                const response = await axios.post('/api/auth/login-with-pin', {
                    email: pinEmail,
                    pin: cleanVal
                });
                if (response.data.requiresPasswordSetup) {
                    setPinVerified(true);
                    setFirstName(response.data.data.firstName);
                    toast.success(t('auth.pinVerified'));
                }
            }
        } catch (error) {
            const errData = error.response?.data;
            if (errData?.code === 'BACKUP_CODE_ALREADY_USED') {
                setFirstTimeAlert({
                    type: 'used',
                    message: errData.message
                });
                toast.error(errData.message, { duration: 6000 });
            } else if (errData?.code === 'INVALID_CODE') {
                setFirstTimeAlert({
                    type: 'invalid',
                    message: errData.message || 'Invalid code. Please check your paper slip and try again.'
                });
                toast.error(errData.message || 'Invalid code');
            } else {
                toast.error(errData?.message || 'Verification failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetPassword = async () => {
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        if (academicYears.length > 0 && !selectedYear) {
            toast.error(t('auth.academicSession'));
            return;
        }

        setIsLoading(true);
        try {
            let response;
            if (codeType === 'backup-code') {
                response = await axios.post('/api/pin/login-with-backup-code', {
                    email: pinEmail,
                    backupCode: pinValue,
                    newPassword
                });
            } else {
                response = await axios.post('/api/auth/login-with-pin', {
                    email: pinEmail,
                    pin: pinValue.trim().replace(/[-\s]/g, ''),
                    newPassword
                });
            }

            const { user, accessToken, refreshToken } = response.data.data;
            setAuth(user, accessToken, refreshToken);

            const selectedSession = academicYears.find(y => y.id === selectedYear);
            if (selectedSession) {
                setAvailableSessions(academicYears);
                setSession(selectedSession);
            }

            toast.success(t('auth.welcome'));
            setTimeout(() => router.replace('/dashboard'), 100);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to set password');
        } finally {
            setIsLoading(false);
        }
    };

    const displayTitle = schoolInfo.name || t('login.title') || 'Unified Lab Record Management';

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-slate-900 text-slate-100 relative overflow-hidden">
            {/* Ambient Background Gradient Blooms */}
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* Left Section - 3D Fluent Hero (Desktop) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 relative p-12 flex-col justify-between border-r border-slate-800">
                {/* Brand Header */}
                <div className="relative z-10 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md p-2 flex items-center justify-center shadow-lg border border-white/20">
                        {schoolInfo.logoUrl && !logoLoadError ? (
                            <img
                                src={schoolInfo.logoUrl}
                                alt={schoolInfo.name || 'School Logo'}
                                className="w-full h-full object-contain"
                                onError={() => setLogoLoadError(true)}
                            />
                        ) : (
                            <FluentInstituteOpsIcon size={32} />
                        )}
                    </div>
                    <div>
                        <span className="font-black text-white text-lg tracking-tight leading-tight block">
                            {schoolInfo.name || 'ULRMS Enterprise'}
                        </span>
                        <span className="text-xs text-indigo-300 font-mono tracking-wider uppercase">
                            {schoolInfo.nameHindi || 'Laboratory Assessment Platform'}
                        </span>
                    </div>
                </div>

                {/* Central Showcase */}
                <div className="relative z-10 max-w-md my-auto py-8">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-sky-500 p-4 mb-6 shadow-2xl shadow-indigo-500/30 flex items-center justify-center border border-white/30">
                        <FluentExamHubIcon size={46} />
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3 leading-tight drop-shadow-sm">
                        {displayTitle}
                    </h1>
                    <p className="text-slate-300 text-sm leading-relaxed mb-8">
                        {t('login.subtitle') || 'High-performance laboratory record keeping, dynamic code IDEs, tabbed office studios, and real-time live evaluation.'}
                    </p>

                    {/* Tactile Feature Pills */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        {[
                            { label: 'Real-Time Viva Rubrics', icon: '⚡' },
                            { label: 'Tabbed Office & PDF Studio', icon: '📑' },
                            { label: '10-Turn Paper Slip PINs', icon: '🔑' },
                            { label: 'Multi-Language Support', icon: '🌐' }
                        ].map((feature, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-indigo-400/30 transition text-slate-200"
                            >
                                <span className="text-sm">{feature.icon}</span>
                                <span className="font-semibold">{feature.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Left Bottom Legal & Version */}
                <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-6 border-t border-slate-800/80">
                    <span>© 2026 ULRMS • Institutional Suite</span>
                    <Link
                        href="/licenses"
                        className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition font-medium"
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Open Source Licenses</span>
                    </Link>
                </div>
            </div>

            {/* Right Section - Login Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 bg-slate-900/60 backdrop-blur-xl relative z-10 min-h-screen lg:min-h-0">
                {/* Top Corner Utilities */}
                <div className="w-full max-w-md flex items-center justify-between mb-6">
                    {/* Mobile Brand */}
                    <div className="lg:hidden flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white/10 p-1.5 flex items-center justify-center border border-white/20">
                            {schoolInfo.logoUrl && !logoLoadError ? (
                                <img
                                    src={schoolInfo.logoUrl}
                                    alt="Logo"
                                    className="w-full h-full object-contain"
                                    onError={() => setLogoLoadError(true)}
                                />
                            ) : (
                                <FluentInstituteOpsIcon size={20} />
                            )}
                        </div>
                        <span className="font-black text-white text-sm tracking-tight truncate max-w-[150px]">
                            {schoolInfo.name || 'ULRMS'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                        <DatabaseStatus />
                        <LoginLanguageSelector />
                    </div>
                </div>

                {/* Login Card */}
                <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-7 sm:p-9 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                    <div className="mb-6">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            {t('auth.login') || 'Sign In'}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Choose your preferred authentication mode to access your lab portal.
                        </p>
                    </div>

                    {/* Mode Toggle Pills */}
                    <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 mb-6 gap-1 border border-slate-200/80 dark:border-slate-700/80">
                        <button
                            type="button"
                            onClick={() => { setLoginMode('password'); setPinVerified(false); }}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                                loginMode === 'password'
                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <Lock className="w-3.5 h-3.5" />
                            <span>{t('auth.usePassword') || 'Password'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setLoginMode('pin'); setPinVerified(false); }}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                                loginMode === 'pin'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>{t('auth.firstTimeLogin') || '10-Turn Slip / PIN'}</span>
                        </button>
                    </div>

                    {/* Academic Session Selector */}
                    <div className="mb-5">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            {t('auth.academicSession') || 'Academic Session'}
                        </label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={loadingYears}
                        >
                            {loadingYears ? (
                                <option>{t('common.loading') || 'Loading sessions...'}</option>
                            ) : academicYears.length === 0 ? (
                                <option value="">{t('auth.noSessions') || 'No sessions configured'}</option>
                            ) : (
                                academicYears.map(year => (
                                    <option key={year.id} value={year.id}>
                                        {year.yearLabel} {year.isCurrent ? `(${t('auth.current') || 'Current'})` : ''}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* PASSWORD MODE FORM */}
                    {loginMode === 'password' && (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                    {t('auth.email') || 'Institutional Email'}
                                </label>
                                <input
                                    type="email"
                                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="you@institution.edu"
                                    {...register('email', { required: true })}
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                    {t('auth.password') || 'Password'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="••••••••"
                                        {...register('password', { required: true })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 shadow-md shadow-indigo-500/20 active:scale-[0.99] transition flex items-center justify-center gap-2 mt-2"
                            >
                                {isLoading ? (
                                    t('auth.signingIn') || 'Authenticating...'
                                ) : (
                                    <>
                                        <LogIn className="w-4 h-4" />
                                        <span>{t('auth.login') || 'Sign In to Portal'}</span>
                                    </>
                                )}
                            </button>

                            <div className="text-center pt-2">
                                <Link
                                    href="/reset-password-pin"
                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                                >
                                    Forgot Password / Use 10-Turn Emergency Slip
                                </Link>
                            </div>
                        </form>
                    )}

                    {/* PIN / BACKUP CODE FIRST-TIME MODE */}
                    {loginMode === 'pin' && !pinVerified && (
                        <div className="space-y-4">
                            {firstTimeAlert && (
                                <div className={`p-3 rounded-xl text-xs ${
                                    firstTimeAlert.type === 'used'
                                        ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                                        : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
                                }`}>
                                    <div className="font-bold mb-0.5">
                                        {firstTimeAlert.type === 'used' ? '⚠️ Backup Code Already Used!' : '❌ Invalid Code'}
                                    </div>
                                    <div>{firstTimeAlert.message}</div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                    {t('auth.email') || 'Institutional Email'}
                                </label>
                                <input
                                    type="email"
                                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="you@institution.edu"
                                    value={pinEmail}
                                    onChange={(e) => { setPinEmail(e.target.value); setFirstTimeAlert(null); }}
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                        Verification Code
                                    </label>
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                                        6-digit PIN or XXXX-XXXX
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono tracking-widest text-center uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    placeholder="000000 or 4812-9214"
                                    maxLength={10}
                                    value={pinValue}
                                    onChange={(e) => { setPinValue(e.target.value); setFirstTimeAlert(null); }}
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Enter 6-digit PIN or any unused code from your 10-turn paper slip.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handlePinVerify}
                                disabled={isLoading}
                                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20 active:scale-[0.99] transition flex items-center justify-center gap-2 mt-2"
                            >
                                {isLoading ? (
                                    t('auth.verifying') || 'Verifying Code...'
                                ) : (
                                    <>
                                        <KeyRound className="w-4 h-4" />
                                        <span>Verify Code & Continue</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* PASSWORD SETUP after PIN verified */}
                    {loginMode === 'pin' && pinVerified && (
                        <div className="space-y-4">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
                                ✓ Verified for <strong>{firstName}</strong>! Set your permanent password below.
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                    {t('auth.setPassword') || 'New Password'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Min 6 characters"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                    {t('auth.confirmPassword') || 'Confirm Password'}
                                </label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Confirm password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleSetPassword}
                                disabled={isLoading}
                                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 mt-2"
                            >
                                {isLoading ? (
                                    t('auth.settingUp') || 'Setting Password...'
                                ) : (
                                    <>
                                        <LogIn className="w-4 h-4" />
                                        <span>{t('auth.setPasswordLogin') || 'Save Password & Enter'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Footer Links */}
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <Link
                            href="/adminmoslogin"
                            className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium inline-flex items-center gap-1.5 transition"
                        >
                            <Shield className="w-3.5 h-3.5 text-slate-400" />
                            <span>Administrator Portal</span>
                        </Link>

                        <Link
                            href="/licenses"
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium inline-flex items-center gap-1 transition"
                            title="Open Source & Licensing Notices"
                        >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Legal & Licenses</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
