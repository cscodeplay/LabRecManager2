'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
    FileText, Upload, Award, Video, Users,
    ChevronRight, TrendingUp, Clock, CheckCircle, BookOpen, Monitor, Pencil, Ticket, GraduationCap, Layers, CalendarDays, Activity
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
        <div className="card p-4 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">{label}</p>
                </div>
            </div>
        </div>
    );

    if (!isAuthenticated || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F3F2EF]">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 bg-[#F3F2EF] min-h-screen">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Content (Left, 2 columns wide) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Welcome banner */}
                    <div className="card p-6 border-l-4 border-primary-600">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{t('dashboard.welcomeBack', { name: user?.firstName })} 👋</h2>
                                <p className="text-slate-500 mt-1">{t('dashboard.labActivities')}</p>
                            </div>
                            {(user?.role === 'admin' || user?.role === 'principal') && siteUpdate && (
                                <Link href="/admin/site-updates" className="text-xs text-slate-500 hover:text-primary-600 transition text-right">
                                    <p>{t('dashboard.lastUpdated')}</p>
                                    <p className="font-mono text-slate-900 mt-0.5">
                                        {new Date(siteUpdate.updatedAt).toLocaleString(undefined, {
                                            day: 'numeric', month: 'short', year: 'numeric'
                                        })}
                                    </p>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="card p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="w-5 h-5 text-slate-700" />
                            <h3 className="font-semibold text-slate-900">Quick Actions</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {user?.role === 'student' && (
                                <>
                                    <Link href="/assignments" className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition">
                                                <FileText className="w-5 h-5 text-slate-600 group-hover:text-primary-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm group-hover:text-primary-700">{t('dashboard.viewAssignments')}</p>
                                            </div>
                                        </div>
                                    </Link>
                                    <Link href="/submissions" className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition">
                                                <Upload className="w-5 h-5 text-slate-600 group-hover:text-primary-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm group-hover:text-primary-700">{t('dashboard.mySubmissions')}</p>
                                            </div>
                                        </div>
                                    </Link>
                                    <Link href="/grades" className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition">
                                                <Award className="w-5 h-5 text-slate-600 group-hover:text-primary-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm group-hover:text-primary-700">{t('dashboard.viewGrades')}</p>
                                            </div>
                                        </div>
                                    </Link>
                                    <Link href="/tickets" className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition">
                                                <Ticket className="w-5 h-5 text-slate-600 group-hover:text-primary-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm group-hover:text-primary-700">{t('dashboard.reportIssue')}</p>
                                            </div>
                                        </div>
                                    </Link>
                                </>
                            )}
                            {(user?.role === 'instructor' || user?.role === 'admin') && (
                                <>
                                    <Link href="/assignments/create" className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary-100 transition">
                                                <FileText className="w-5 h-5 text-slate-600 group-hover:text-primary-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm">{t('dashboard.createAssignment')}</p>
                                            </div>
                                        </div>
                                    </Link>
                                    <Link href="/submissions" className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary-100 transition">
                                                <Clock className="w-5 h-5 text-slate-600 group-hover:text-primary-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm">{t('dashboard.reviewPending')}</p>
                                            </div>
                                        </div>
                                    </Link>
                                    <Link href="/classes" className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary-100 transition">
                                                <Users className="w-5 h-5 text-slate-600 group-hover:text-primary-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm">{t('dashboard.manageClasses')}</p>
                                            </div>
                                        </div>
                                    </Link>
                                    <Link href="/whiteboard" className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary-100 transition">
                                                <Pencil className="w-5 h-5 text-slate-600 group-hover:text-primary-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm">{t('nav.whiteboard')}</p>
                                            </div>
                                        </div>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Upcoming deadlines */}
                    <div className="card">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-5 h-5 text-slate-700" />
                                <h3 className="font-semibold text-slate-900">{t('dashboard.upcomingDeadlines')}</h3>
                            </div>
                            <Link href="/assignments" className="text-sm font-medium text-primary-600 hover:text-primary-700 transition">{t('common.viewAll')} →</Link>
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
                                        graded: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                                        submitted: 'bg-blue-100 text-blue-700 border-blue-200',
                                        needs_revision: 'bg-amber-100 text-amber-700 border-amber-200',
                                        pending: 'bg-slate-100 text-slate-600 border-slate-200'
                                    };
                                    
                                    return (
                                        <Link key={i} href={\`/assignments/\${item.id}\`} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition group">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                    <FileText className="w-5 h-5 text-slate-500 group-hover:text-primary-600 transition" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 group-hover:text-primary-700 transition">{item.title}</p>
                                                    <p className="text-sm text-slate-500 mt-0.5">{item.subject?.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                                <span className={\`text-xs font-medium px-2.5 py-1 rounded-md border \${statusColors[item.status] || statusColors.pending}\`}>
                                                    {item.status || t('dashboard.pending')}
                                                </span>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-slate-900">{dueDate.toLocaleDateString()}</p>
                                                    <p className={\`text-xs mt-0.5 \${hoursLeft < 24 ? 'text-red-600 font-medium' : 'text-slate-500'}\`}>
                                                        {timeLeftText}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    </div>
                    
                    {/* Assignment Calendar - for students */}
                    {user?.role === 'student' && (
                        <div className="card p-5">
                            <AssignmentCalendar />
                        </div>
                    )}
                </div>

                {/* Right Sidebar (1 column wide) */}
                <div className="space-y-6">
                    {/* Profile Summary */}
                    <div className="card overflow-hidden">
                        <div className="h-20 bg-gradient-to-r from-slate-200 to-slate-100"></div>
                        <div className="px-5 pb-5 relative text-center">
                            <div className="w-20 h-20 bg-white rounded-full p-1 mx-auto -mt-10 border shadow-sm flex justify-center items-center">
                                <div className="w-full h-full bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                                </div>
                            </div>
                            <h3 className="font-bold text-lg text-slate-900 mt-3">{user?.firstName} {user?.lastName}</h3>
                            <p className="text-sm text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                            
                            {user?.role === 'student' && studentProfile && (
                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center gap-6">
                                    <div className="text-center">
                                        <p className="text-xs text-slate-500">{t('dashboard.class')}</p>
                                        <p className="font-semibold text-slate-800">{studentProfile.primaryClass?.name || '-'}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-slate-500">{t('dashboard.assignedPc')}</p>
                                        <p className="font-semibold text-slate-800">{studentProfile.assignedPc?.itemNumber || '-'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {user?.role === 'student' && (
                            <>
                                <StatCard icon={FileText} label={t('dashboard.assignedToMe')} value={stats.assignedToMe || 0} color="bg-primary-600" />
                                <StatCard icon={Upload} label={t('dashboard.mySubmissions')} value={stats.mySubmissions || 0} color="bg-emerald-600" />
                                <StatCard icon={Video} label={t('dashboard.pendingVivas')} value={stats.pendingVivas || 0} color="bg-amber-600" />
                                <StatCard icon={Award} label={t('dashboard.avgScore')} value={stats.avgScore != null ? \`\${stats.avgScore}%\` : '--'} color="bg-blue-600" />
                            </>
                        )}
                        {(user?.role === 'instructor' || user?.role === 'lab_assistant') && (
                            <>
                                <StatCard icon={FileText} label={t('dashboard.myAssignments')} value={stats.myAssignments || 0} color="bg-primary-600" />
                                <StatCard icon={Clock} label={t('dashboard.pendingGrading')} value={stats.pendingGrading || 0} color="bg-amber-600" />
                                <StatCard icon={Video} label={t('dashboard.scheduledVivas')} value={stats.scheduledVivas || 0} color="bg-emerald-600" />
                                <StatCard icon={CheckCircle} label={t('dashboard.completed')} value="--" color="bg-blue-600" />
                            </>
                        )}
                        {user?.role === 'admin' && (
                            <>
                                <StatCard icon={Users} label={t('dashboard.totalUsers')} value={stats.totalUsers || 0} color="bg-primary-600" />
                                <StatCard icon={BookOpen} label={t('dashboard.totalClasses')} value={stats.totalClasses || 0} color="bg-emerald-600" />
                                <StatCard icon={FileText} label={t('dashboard.assignments')} value={stats.totalAssignments || 0} color="bg-amber-600" />
                                <StatCard icon={Monitor} label={t('dashboard.activeLabs')} value={stats.activeLabs ?? '--'} color="bg-blue-600" />
                            </>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
