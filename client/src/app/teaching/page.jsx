'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import api, { teachingAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { BookMarked, Video, CalendarDays, LineChart, Play, Users, Clock, Award, BarChart3, Plus } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function TeachingDashboard() {
    const router = useRouter();
    const { t } = useTranslation('common');
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    
    const [upcomingPlans, setUpcomingPlans] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const isInstructor = user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'principal';

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated || !isInstructor) {
            router.push('/dashboard');
            return;
        }
        
        const loadDashboardInfo = async () => {
            setLoading(true);
            try {
                // Fetch today's and future plans
                const res = await teachingAPI.getPlans();
                const plans = res.data.data.plans || [];
                
                // Separate into active and upcoming
                const activeOrUpcoming = plans
                    .filter(p => ['planned', 'in_progress'].includes(p.status))
                    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
                    .slice(0, 5); // Just top 5
                
                setUpcomingPlans(activeOrUpcoming);
                
                // Mock stats for now since analytics endpoints are placeholders
                setStats({
                    totalLecturesConducted: plans.filter(p => p.status === 'completed').length,
                    averageEngagement: 85,
                    totalStudentsTaught: 124,
                    upcomingClassesCount: activeOrUpcoming.length
                });

            } catch (error) {
                console.error(error);
                toast.error('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        loadDashboardInfo();
    }, [_hasHydrated, isAuthenticated]);

    if (!_hasHydrated || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    const chartData = [
        { name: 'Mon', attendance: 95 },
        { name: 'Tue', attendance: 92 },
        { name: 'Wed', attendance: 88 },
        { name: 'Thu', attendance: 97 },
        { name: 'Fri', attendance: 85 }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <PageHeader 
                title={t('teachingDashboard')}
                titleHindi="शिक्षण डैशबोर्ड"
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="card p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                        <Video className="w-8 h-8 mb-2 opacity-80" />
                        <h3 className="text-3xl font-bold">{stats?.totalLecturesConducted}</h3>
                        <p className="text-blue-100 text-sm font-medium mt-1">Lectures Delivered</p>
                    </div>
                    
                    <div className="card p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Students Taught</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats?.totalStudentsTaught}</h3>
                        </div>
                    </div>

                    <div className="card p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                            <CalendarDays className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Upcoming Classes</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats?.upcomingClassesCount}</h3>
                        </div>
                    </div>

                    <div className="card p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                            <Award className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg Engagement</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats?.averageEngagement}%</h3>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Col - Upcoming / Active Plans */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="card p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-500" /> My Schedule
                                </h2>
                                <Link href="/teaching/plans" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                    View All Plans →
                                </Link>
                            </div>
                            
                            {upcomingPlans.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <BookMarked className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">No upcoming lectures scheduled.</p>
                                    <Link href="/teaching/plans/new" className="text-blue-500 hover:underline text-sm mt-2 inline-block">
                                        + Create Lecture Plan
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {upcomingPlans.map(plan => (
                                        <div key={plan.id} className="relative pl-10">
                                            {/* Timeline dot */}
                                            <div className="absolute left-3 top-2 bottom-0 w-[2px] bg-slate-100 dark:bg-slate-800 last:bottom-auto last:h-full"></div>
                                            <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center z-10 ${
                                                plan.status === 'in_progress' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
                                            }`}></div>

                                            <div className="card bg-slate-50/50 dark:bg-slate-800/50 border hover:shadow-sm p-4 relative overflow-hidden transition-all group">
                                                {plan.status === 'in_progress' && (
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                                                )}
                                                
                                                <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                                                {plan.class.name}
                                                            </span>
                                                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                                                {plan.subject.name}
                                                            </span>
                                                            {plan.status === 'in_progress' && (
                                                                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest ml-2 flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 animate-pulse"></span> LIVE
                                                                </span>
                                                            )}
                                                        </div>
                                                        <Link href={`/teaching/plans/${plan.id}`} className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition">
                                                            L{plan.lectureNumber}: {plan.title}
                                                        </Link>
                                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                                                            <span>📅 {new Date(plan.scheduledDate).toLocaleDateString()}</span>
                                                            <span>⏱️ {plan.scheduledDuration} min</span>
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 flex gap-2">
                                                        {plan.status === 'in_progress' ? (
                                                            <Link href={`/teaching/sessions/${plan.sessions[0]?.id}`} className="btn btn-sm bg-red-500 hover:bg-red-600 text-white border-0">
                                                                <Video className="w-3.5 h-3.5 mr-1" /> Join Live
                                                            </Link>
                                                        ) : (
                                                            <Link href={`/teaching/plans/${plan.id}`} className="btn btn-sm btn-outline">
                                                                Review Plan
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Col - Quick Actions & Charts */}
                    <div className="space-y-6">
                        <div className="card p-6">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
                            <div className="grid grid-cols-2 gap-3">
                                <Link href="/teaching/plans/new" className="btn btn-primary flex-col h-auto py-4 justify-center items-center text-center">
                                    <Plus className="w-6 h-6 mb-1" />
                                    <span className="text-sm">New Plan</span>
                                </Link>
                                <Link href="/classes" className="btn btn-outline flex-col h-auto py-4 justify-center items-center text-center border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                    <Users className="w-6 h-6 mb-1" />
                                    <span className="text-sm">My Classes</span>
                                </Link>
                                <Link href="/admin/timetable" className="btn btn-outline flex-col h-auto py-4 justify-center items-center text-center border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                    <CalendarDays className="w-6 h-6 mb-1" />
                                    <span className="text-sm">Timetable</span>
                                </Link>
                                <Link href="/reports" className="btn btn-outline flex-col h-auto py-4 justify-center items-center text-center border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                    <LineChart className="w-6 h-6 mb-1" />
                                    <span className="text-sm">Analytics</span>
                                </Link>
                            </div>
                        </div>

                        <div className="card p-6 lg:mb-0">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-emerald-500" /> Attendance Trends
                            </h2>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="attendance" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
