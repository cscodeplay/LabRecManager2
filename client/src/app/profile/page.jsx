'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    User, Mail, Phone, Shield, Building, Award, 
    Monitor, Calendar, ArrowLeft, Settings, CheckCircle2,
    BookOpen, GraduationCap, Copy, Check
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import UserAvatar from '@/components/UserAvatar';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [studentProfile, setStudentProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState(false);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        const fetchDetails = async () => {
            try {
                if (user?.role === 'student') {
                    const res = await api.get('/dashboard/student');
                    if (res.data?.success && res.data.data?.profile) {
                        setStudentProfile(res.data.data.profile);
                    }
                }
            } catch (err) {
                console.error('Failed to load profile details:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [_hasHydrated, isAuthenticated, user, router]);

    const handleCopyId = (id) => {
        if (!id) return;
        navigator.clipboard.writeText(id);
        setCopiedId(true);
        toast.success('ID copied to clipboard');
        setTimeout(() => setCopiedId(false), 2000);
    };

    if (!_hasHydrated || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    const institutionalId = user?.studentId || user?.admissionNumber || user?.employeeId;
    const isStudent = user?.role === 'student';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Back bar */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <Link
                        href="/settings"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-sm"
                    >
                        <Settings className="w-3.5 h-3.5" />
                        Account Settings
                    </Link>
                </div>

                {/* Hero Profile Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    {/* Header banner */}
                    <div className="h-32 bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 relative">
                        <div className="absolute top-4 right-4 flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-md border border-white/30">
                                {user?.role?.replace('_', ' ')}
                            </span>
                        </div>
                    </div>

                    {/* Avatar & Core Meta */}
                    <div className="px-6 pb-6 pt-0 relative">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 sm:-mt-12 text-center sm:text-left mb-4">
                            <div className="p-1 rounded-full bg-white dark:bg-slate-900 shadow-xl ring-4 ring-slate-100 dark:ring-slate-800">
                                <UserAvatar user={user} size="2xl" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                    {user?.firstName} {user?.lastName}
                                </h1>
                                {user?.firstNameHindi && (
                                    <p className="text-sm font-medium text-slate-400">
                                        {user.firstNameHindi} {user.lastNameHindi}
                                    </p>
                                )}
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {user?.email}
                                </p>
                            </div>

                            {/* ID badge card */}
                            {institutionalId && (
                                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3 flex items-center gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            {isStudent ? 'Student ID' : 'Employee ID'}
                                        </p>
                                        <p className="font-mono font-extrabold text-base text-primary-600 dark:text-primary-400">
                                            {institutionalId}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyId(institutionalId)}
                                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 transition"
                                        title="Copy ID"
                                    >
                                        {copiedId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Institutional & Academic Details */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <GraduationCap className="w-5 h-5 text-primary-500" />
                            <h2 className="font-bold text-slate-900 dark:text-white text-base">
                                {isStudent ? 'Academic Enrollment' : 'Institutional Position'}
                            </h2>
                        </div>

                        <div className="space-y-3 text-sm">
                            {isStudent && (
                                <>
                                    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/50">
                                        <span className="text-slate-500 dark:text-slate-400">Assigned Class</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">
                                            {studentProfile?.primaryClass?.name || 'Class 12 Non-Medical C'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/50">
                                        <span className="text-slate-500 dark:text-slate-400">Assigned Computer</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                                            {studentProfile?.assignedPc?.itemNumber || 'PC-04 (Computer Lab 1)'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/50">
                                        <span className="text-slate-500 dark:text-slate-400">Student ID / Roll No</span>
                                        <span className="font-bold text-primary-600 dark:text-primary-400 font-mono">
                                            {institutionalId || '20260011'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5">
                                        <span className="text-slate-500 dark:text-slate-400">Enrollment Status</span>
                                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 className="w-4 h-4" /> Active Student
                                        </span>
                                    </div>
                                </>
                            )}

                            {!isStudent && (
                                <>
                                    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/50">
                                        <span className="text-slate-500 dark:text-slate-400">System Role</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                                            {user?.role?.replace('_', ' ')}
                                        </span>
                                    </div>
                                    {user?.employeeId && (
                                        <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/50">
                                            <span className="text-slate-500 dark:text-slate-400">Employee ID</span>
                                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                {user.employeeId}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between py-1.5">
                                        <span className="text-slate-500 dark:text-slate-400">Account Status</span>
                                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 className="w-4 h-4" /> Active Staff
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Contact & Security */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <Shield className="w-5 h-5 text-indigo-500" />
                            <h2 className="font-bold text-slate-900 dark:text-white text-base">Contact & Security</h2>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/50">
                                <span className="text-slate-500 dark:text-slate-400">Official Email</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{user?.email}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/50">
                                <span className="text-slate-500 dark:text-slate-400">Phone Number</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{user?.phone || 'Not provided'}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/50">
                                <span className="text-slate-500 dark:text-slate-400">Two-Factor Auth</span>
                                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                    Managed via SSO
                                </span>
                            </div>
                            <div className="pt-2">
                                <Link
                                    href="/settings"
                                    className="w-full py-2 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center justify-center gap-1.5"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                    Edit Contact & Appearance
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
