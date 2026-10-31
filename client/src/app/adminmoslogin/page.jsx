'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
    Shield,
    ShieldCheck,
    Eye,
    EyeOff,
    LogIn,
    Calendar,
    Lock,
    Globe,
    ChevronDown,
    Check,
    Search,
    ArrowLeft,
    AlertCircle,
    Server,
    Key
} from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useAuthStore, useLanguageStore } from '@/lib/store';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import DatabaseStatus from '@/components/DatabaseStatus';

// Language Selector Component
function AdminLanguageSelector() {
    const { t, i18n } = useTranslation('common');
    const { language, setLanguage } = useLanguageStore();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);

    const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

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

        const selectedLang = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
        if (selectedLang?.dir === 'rtl') {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
    };

    const filteredLanguages = SUPPORTED_LANGUAGES.filter(
        (lang) =>
            lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-xs text-slate-300 font-medium transition shadow-xs"
            >
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>{currentLang.nativeName}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                    <div className="px-3 pb-2 border-b border-slate-800">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search language..."
                                className="w-full pl-8 pr-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto pt-1">
                        {filteredLanguages.map((lang) => (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => handleLanguageChange(lang.code)}
                                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition ${
                                    language === lang.code ? 'text-indigo-400 font-semibold bg-indigo-950/40' : 'text-slate-300'
                                }`}
                            >
                                <span>{lang.nativeName} ({lang.name})</span>
                                {language === lang.code && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminMosLoginPage() {
    const { t } = useTranslation('common');
    const router = useRouter();
    const { register, handleSubmit } = useForm();
    const { setAuth, setSession, setAvailableSessions, isAuthenticated, user } = useAuthStore();

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [academicYears, setAcademicYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [loadingYears, setLoadingYears] = useState(true);
    const [schoolInfo, setSchoolInfo] = useState({ name: '', nameHindi: '', logoUrl: '' });
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        // If already logged in as admin/principal, route straight to dashboard
        if (isAuthenticated && ['admin', 'principal'].includes(user?.role)) {
            router.replace('/dashboard');
            return;
        }

        // Preload cached branding
        try {
            const cachedBranding = localStorage.getItem('school_branding');
            if (cachedBranding) {
                const parsed = JSON.parse(cachedBranding);
                if (parsed.name || parsed.logoUrl) {
                    setSchoolInfo(parsed);
                }
            }
        } catch (e) {}

        loadInitialData();
    }, [isAuthenticated, user, router]);

    const loadInitialData = async () => {
        try {
            setLoadingYears(true);
            const [yearsRes, schoolRes] = await Promise.allSettled([
                axios.get('/api/schools/academic-years'),
                axios.get('/api/schools/profile')
            ]);

            let years = [];
            if (yearsRes.status === 'fulfilled') {
                years = yearsRes.value.data?.data?.academicYears || [];
            }

            let schoolData = null;
            if (schoolRes.status === 'fulfilled') {
                schoolData = schoolRes.value.data?.data?.school || schoolRes.value.data?.school;
            }

            if (schoolData && (schoolData.name || schoolData.logoUrl)) {
                setSchoolInfo(schoolData);
                try {
                    localStorage.setItem('school_branding', JSON.stringify(schoolData));
                } catch (e) {}
            }

            setAcademicYears(years);

            const currentYear = years.find((y) => y.isCurrent);
            if (currentYear) {
                setSelectedYear(currentYear.id);
            } else if (years.length > 0) {
                const sorted = [...years].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
                setSelectedYear(sorted[0].id);
            }
        } catch (error) {
            console.error('Failed to load initial admin portal metadata:', error.message);
        } finally {
            setLoadingYears(false);
        }
    };

    const onSubmit = async (data) => {
        setErrorMessage('');

        if (academicYears.length > 0 && !selectedYear) {
            toast.error('Please select an Academic Session');
            return;
        }

        setIsLoading(true);
        try {
            // Authenticate using dedicated admin-login endpoint
            const response = await authAPI.adminLogin(data.email, data.password);
            const { user: authUser, accessToken, refreshToken } = response.data.data;

            // Extra safeguard: confirm administrative role
            if (!['admin', 'principal'].includes(authUser.role)) {
                throw new Error('Access denied. This portal is strictly for administrators.');
            }

            setAuth(authUser, accessToken, refreshToken);

            const selectedSession = academicYears.find((y) => y.id === selectedYear);
            if (selectedSession) {
                setAvailableSessions(academicYears);
                setSession(selectedSession);
            }

            toast.success(`Welcome back, ${authUser.firstName || 'Administrator'}!`);
            setTimeout(() => router.replace('/dashboard'), 100);
        } catch (error) {
            const apiMessage = error.response?.data?.message || error.message || 'Administrative authentication failed';
            setErrorMessage(apiMessage);
            toast.error(apiMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-between text-slate-100 selection:bg-indigo-600 selection:text-white">
            {/* Header bar */}
            <header className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                            <span>LabRecManager</span>
                            <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                MOS Admin
                            </span>
                        </h1>
                        <p className="text-[11px] text-slate-400">Institutional Management &amp; Laboratory Control</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <DatabaseStatus />
                    <AdminLanguageSelector />
                </div>
            </header>

            {/* Main Login Card Area */}
            <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
                <div className="w-full max-w-md">
                    {/* Security Badge Pill */}
                    <div className="flex items-center justify-center mb-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-xs font-semibold text-indigo-300 shadow-inner">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                            <span>Restricted Administrative Portal</span>
                        </div>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                        {/* Glow accent */}
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

                        {/* School / System Branding */}
                        <div className="text-center mb-6 relative">
                            {schoolInfo.logoUrl ? (
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 p-2 mb-3 shadow-lg">
                                    <img
                                        src={schoolInfo.logoUrl}
                                        alt="School Logo"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-tr from-indigo-700 to-violet-600 text-white shadow-xl shadow-indigo-900/40 mb-3 border border-indigo-500/30">
                                    <Shield className="w-7 h-7" />
                                </div>
                            )}

                            <h2 className="text-xl font-black tracking-tight text-white">
                                {schoolInfo.name || 'Administrative Control Center'}
                            </h2>
                            <p className="text-xs text-slate-400 mt-1">
                                Secure credential access for Principals &amp; System Administrators
                            </p>
                        </div>

                        {/* Error Alert Box */}
                        {errorMessage && (
                            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative">
                            {/* Academic Year Selection */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>Academic Session</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        disabled={loadingYears}
                                        className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-800/90 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition appearance-none cursor-pointer"
                                    >
                                        {academicYears.length > 0 ? (
                                            academicYears.map((year) => (
                                                <option key={year.id} value={year.id}>
                                                    {year.name} {year.isCurrent ? '(Active Current Session)' : ''}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="">
                                                {loadingYears ? 'Loading Sessions...' : 'Default Session'}
                                            </option>
                                        )}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                    <Server className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>Administrator Official Email</span>
                                </label>
                                <input
                                    type="email"
                                    autoComplete="username"
                                    placeholder="admin@dps.edu"
                                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono text-xs"
                                    {...register('email', { required: true })}
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Lock className="w-3.5 h-3.5 text-indigo-400" />
                                        <span>Master Password</span>
                                    </span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        placeholder="••••••••••••"
                                        className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition pr-11"
                                        {...register('password', { required: true })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition transform active:scale-98 disabled:opacity-50 cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        <span>Verifying Credentials...</span>
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-4 h-4" />
                                        <span>Enter Administrative Console</span>
                                    </>
                                )}
                            </button>

                            {/* Forgot Password / Emergency Recovery link */}
                            <div className="pt-2 text-center">
                                <Link
                                    href="/reset-password-pin"
                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 transition"
                                >
                                    <Key className="w-3 h-3" />
                                    <span>Reset Password / Emergency Recovery Slip</span>
                                </Link>
                            </div>
                        </form>

                        {/* Audit notice */}
                        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                                <Shield className="w-3 h-3 text-slate-500" />
                                <span>Security Level 3: Session audit logging active</span>
                            </p>
                        </div>
                    </div>

                    {/* Backlink to student/instructor login */}
                    <div className="mt-5 text-center">
                        <Link
                            href="/login"
                            className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1.5 font-medium transition py-1 px-3 rounded-lg hover:bg-slate-800/60"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Return to Student &amp; Instructor Portal</span>
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full py-4 px-6 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950/40">
                &copy; {new Date().getFullYear()} LabRecManager &bull; Enterprise Institutional Management System
            </footer>
        </div>
    );
}
