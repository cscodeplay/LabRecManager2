'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
    FileText, Upload, Award, Video, Users,
    ChevronRight, TrendingUp, Clock, CheckCircle, BookOpen, Monitor, Pencil, Ticket, GraduationCap, Layers
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { dashboardAPI } from '@/lib/api';
import AssignmentCalendar from '@/components/AssignmentCalendar';

export default function DashboardPage() {
    const router = useRouter();
    const { t } = useTranslation('common');
    const { user, isAuthenticated, _hasHydrated, selectedSessionId } = useAuthStore();
    const [stats, setStats] = useState({});
    const [deadlines, setDeadlines] = useState([]);
    const [siteUpdate, setSiteUpdate] = useState(null);
    const [studentProfile, setStudentProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadDashboardData();
    }, [isAuthenticated, _hasHydrated, selectedSessionId]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const requests = [
                dashboardAPI.getStats(),
                dashboardAPI.getDeadlines(),
                dashboardAPI.getSiteUpdate().catch(() => null)
            ];
            if (user?.role === 'student') {
                requests.push(dashboardAPI.getStudentProfile().catch(() => null));
            }
            const [statsRes, deadlinesRes, siteUpdateRes, studentProfileRes] = await Promise.all(requests);
            setStats(statsRes.data.data.stats);
            setDeadlines(deadlinesRes.data.data.upcomingDeadlines || []);
            if (siteUpdateRes?.data?.data) setSiteUpdate(siteUpdateRes.data.data);
            if (studentProfileRes?.data?.data) setStudentProfile(studentProfileRes.data.data);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ icon: Icon, label, value, color, trend }) => (
        <div className="stat-card card-hover">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
                    {trend && (
                        <p className="text-sm text-emerald-600 mt-1 flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            {trend}
                        </p>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
    );

    if (!isAuthenticated || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 space-y-6">
            {/* Welcome banner */}
            <div className="card p-6 bg-gradient-to-r from-primary-500 to-accent-500 text-white">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">{t('dashboard.welcomeBack', { name: user?.firstName })} 👋</h2>
                        <p className="text-white/80 mt-1">{t('dashboard.labActivities')}</p>
                    </div>
                    {(user?.role === 'admin' || user?.role === 'principal') && siteUpdate && (
                        <Link href="/admin/site-updates" className="text-right text-xs text-white/70 hover:text-white transition">
                            <p>{t('dashboard.lastUpdated')}</p>
                            <p className="font-mono">
                                {new Date(siteUpdate.updatedAt).toLocaleString('en-IN', {
                                    day: 'numeric', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                            <p className="font-mono opacity-80">v{siteUpdate.version} →</p>
                        </Link>
                    )}
                </div>
            </div>

            {/* Student Profile Info Card */}
            {user?.role === 'student' && studentProfile && (
                <div className="card p-4 bg-white">
                    <div className="flex flex-wrap items-center gap-6">
                        {studentProfile.primaryClass && (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <GraduationCap className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">{t('dashboard.class')}</p>
                                    <p className="font-semibold text-slate-800">{studentProfile.primaryClass.name}</p>
                                </div>
                            </div>
                        )}
                        {studentProfile.primaryGroup && (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                    <Layers className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">{t('dashboard.group')}</p>
                                    <p className="font-semibold text-slate-800">{studentProfile.primaryGroup.name}</p>
                                </div>
                            </div>
                        )}
                        {studentProfile.assignedPc && (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <Monitor className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">{t('dashboard.assignedPc')}</p>
                                    <p className="font-semibold text-slate-800">
                                        {studentProfile.assignedPc.itemNumber}
                                        {studentProfile.assignedPc.lab && <span className="text-slate-500 font-normal"> • {studentProfile.assignedPc.lab.name}</span>}
                                    </p>
                                </div>
                            </div>
                        )}
                        {!studentProfile.primaryClass && !studentProfile.primaryGroup && !studentProfile.assignedPc && (
                            <p className="text-slate-500 text-sm">{t('dashboard.noClassGroup')}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {user?.role === 'student' && (
                    <>
                        <StatCard icon={FileText} label={t('dashboard.assignedToMe')} value={stats.assignedToMe || 0} color="bg-primary-500" />
                        <StatCard icon={Upload} label={t('dashboard.mySubmissions')} value={stats.mySubmissions || 0} color="bg-emerald-500" />
                        <StatCard icon={Video} label={t('dashboard.pendingVivas')} value={stats.pendingVivas || 0} color="bg-amber-500" />
                        <StatCard icon={Award} label={t('dashboard.avgScore')} value={stats.avgScore != null ? `${stats.avgScore}%` : '--'} color="bg-accent-500" trend={stats.totalGrades > 0 ? `${stats.totalGrades} ${t('dashboard.graded')}` : null} />
                    </>
                )}
                {(user?.role === 'instructor' || user?.role === 'lab_assistant') && (
                    <>
                        <StatCard icon={FileText} label={t('dashboard.myAssignments')} value={stats.myAssignments || 0} color="bg-primary-500" />
                        <StatCard icon={Clock} label={t('dashboard.pendingGrading')} value={stats.pendingGrading || 0} color="bg-amber-500" />
                        <StatCard icon={Video} label={t('dashboard.scheduledVivas')} value={stats.scheduledVivas || 0} color="bg-emerald-500" />
                        <StatCard icon={CheckCircle} label={t('dashboard.completed')} value="--" color="bg-accent-500" />
                    </>
                )}
                {user?.role === 'admin' && (
                    <>
                        <StatCard icon={Users} label={t('dashboard.totalUsers')} value={stats.totalUsers || 0} color="bg-primary-500" />
                        <StatCard icon={BookOpen} label={t('dashboard.totalClasses')} value={stats.totalClasses || 0} color="bg-emerald-500" />
                        <StatCard icon={FileText} label={t('dashboard.assignments')} value={stats.totalAssignments || 0} color="bg-amber-500" />
                        <StatCard icon={TrendingUp} label={t('dashboard.activeLabs')} value={stats.activeLabs ?? '--'} color="bg-accent-500" trend={stats.maintenanceLabs > 0 ? `${stats.maintenanceLabs} ${t('dashboard.maintenance')}` : null} />
                    </>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {user?.role === 'student' && (
                    <>
                        <Link href="/assignments" className="card p-4 hover:shadow-lg transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition">
                                    <FileText className="w-6 h-6 text-primary-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{t('dashboard.viewAssignments')}</p>
                                    <p className="text-sm text-slate-500">{t('dashboard.checkPendingWork')}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                            </div>
                        </Link>
                        <Link href="/submissions" className="card p-4 hover:shadow-lg transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition">
                                    <Upload className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{t('dashboard.mySubmissions')}</p>
                                    <p className="text-sm text-slate-500">{t('dashboard.trackYourWork')}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                            </div>
                        </Link>
                        <Link href="/grades" className="card p-4 hover:shadow-lg transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
                                    <Award className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{t('dashboard.viewGrades')}</p>
                                    <p className="text-sm text-slate-500">{t('dashboard.checkScores')}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                            </div>
                        </Link>
                        <Link href="/tickets" className="card p-4 hover:shadow-lg transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition">
                                    <Ticket className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{t('dashboard.reportIssue')}</p>
                                    <p className="text-sm text-slate-500">
                                        {studentProfile?.assignedPc ? `PC ${studentProfile.assignedPc.itemNumber}` : t('common.createTicket')}
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                            </div>
                        </Link>
                    </>
                )}
                {(user?.role === 'instructor' || user?.role === 'admin') && (
                    <>
                        <Link href="/assignments/create" className="card p-4 hover:shadow-lg transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition">
                                    <FileText className="w-6 h-6 text-primary-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{t('dashboard.createAssignment')}</p>
                                    <p className="text-sm text-slate-500">{t('dashboard.addNewPractical')}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                            </div>
                        </Link>
                        <Link href="/submissions" className="card p-4 hover:shadow-lg transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
                                    <Clock className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{t('dashboard.reviewPending')}</p>
                                    <p className="text-sm text-slate-500">{t('dashboard.gradeSubmissions')}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                            </div>
                        </Link>
                        <Link href="/classes" className="card p-4 hover:shadow-lg transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition">
                                    <Users className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{t('dashboard.manageClasses')}</p>
                                    <p className="text-sm text-slate-500">{t('dashboard.viewStudents')}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                            </div>
                        </Link>
                        <Link href="/whiteboard" className="card p-4 hover:shadow-lg transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
                                    <Pencil className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{t('nav.whiteboard')}</p>
                                    <p className="text-sm text-slate-500">{t('dashboard.shareWithStudents')}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                            </div>
                        </Link>
                    </>
                )}
                {user?.role === 'admin' && (
                    <>
                        <Link href="/admin/labs" className="card p-4 hover:shadow-lg transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                                    <Monitor className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{t('nav.labsPCs')}</p>
                                    <p className="text-sm text-slate-500">{t('dashboard.manageComputerLabs')}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                            </div>
                        </Link>
                        <Link href="/users" className="card p-4 hover:shadow-lg transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition">
                                    <Users className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{t('dashboard.userManagement')}</p>
                                    <p className="text-sm text-slate-500">{t('dashboard.manageAllUsers')}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                            </div>
                        </Link>
                        <Link href="/admin/students" className="card p-4 hover:shadow-lg transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition">
                                    <BookOpen className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{t('dashboard.importStudents')}</p>
                                    <p className="text-sm text-slate-500">{t('dashboard.bulkImportCsv')}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                            </div>
                        </Link>
                    </>
                )}
            </div>

            {/* Upcoming deadlines */}
            <div className="card">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">{t('dashboard.upcomingDeadlines')}</h3>
                    <Link href="/assignments" className="text-sm text-primary-600 hover:underline">{t('common.viewAll')} →</Link>
                </div>
                <div className="divide-y divide-slate-100">
                    {deadlines.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p>{t('dashboard.noUpcomingDeadlines')}</p>
                        </div>
                    ) : (
                        deadlines.slice(0, 5).map((item, i) => {
                            const dueDate = new Date(item.dueDate);
                            const now = new Date();
                            const timeLeft = dueDate - now;
                            const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                            const daysLeft = Math.floor(hoursLeft / 24);
                            const timeLeftText = daysLeft > 0
                                ? t('dashboard.daysLeft', { days: daysLeft, hours: hoursLeft % 24 })
                                : hoursLeft > 0
                                    ? t('dashboard.hoursLeft', { hours: hoursLeft })
                                    : t('dashboard.dueSoon');

                            const statusColors = {
                                graded: 'bg-emerald-100 text-emerald-700',
                                submitted: 'bg-blue-100 text-blue-700',
                                needs_revision: 'bg-amber-100 text-amber-700',
                                pending: 'bg-slate-100 text-slate-600'
                            };
                            const statusLabels = {
                                graded: `✓ ${t('dashboard.graded')}`,
                                submitted: `✓ ${t('dashboard.submitted')}`,
                                needs_revision: `! ${t('dashboard.revision')}`,
                                pending: t('dashboard.pending')
                            };

                            return (
                                <Link key={i} href={`/assignments/${item.id}`} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition block ${item.isCompleted ? 'border-l-4 border-emerald-500' : ''}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.isCompleted ? 'bg-emerald-100' : 'bg-primary-100'}`}>
                                            {item.isCompleted ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <FileText className="w-5 h-5 text-primary-600" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{item.title}</p>
                                            <p className="text-sm text-slate-500">{item.subject?.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[item.status] || statusColors.pending}`}>
                                            {statusLabels[item.status] || t('dashboard.pending')}
                                        </span>
                                        <div className="text-right">
                                            <span className="badge badge-warning text-xs">
                                                {dueDate.toLocaleDateString()}
                                            </span>
                                            <p className={`text-xs mt-0.5 ${hoursLeft < 24 ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                                                {timeLeftText}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Assignment Calendar - for students */}
            {user?.role === 'student' && (
                <AssignmentCalendar />
            )}
        </div>
    );
}
