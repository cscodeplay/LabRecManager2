'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import api, { teachingAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { BookMarked, Search, Plus, Calendar, Clock, Video, FileText, ArrowRight, Play, Eye } from 'lucide-react';
import Link from 'next/link';

export default function LecturePlansPage() {
    const router = useRouter();
    const { t } = useTranslation('common');
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    const isInstructor = user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'principal';

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated || !isInstructor) {
            router.push('/dashboard');
            return;
        }
        loadPlans();
    }, [_hasHydrated, isAuthenticated]);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const res = await teachingAPI.getPlans();
            setPlans(res.data.data.plans || []);
        } catch (error) {
            toast.error('Failed to load lecture plans');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartSession = async (planId) => {
        const loadingToast = toast.loading('Starting live session...');
        try {
            const res = await teachingAPI.startSession(planId);
            toast.success('Live session started!', { id: loadingToast });
            const sessionId = res.data.data.session.id;
            router.push(`/teaching/sessions/${sessionId}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to start session', { id: loadingToast });
        }
    };

    const filteredPlans = plans.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.class.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.subject.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!_hasHydrated || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <PageHeader 
                title={t('lecturePlans')} 
                titleHindi="व्याख्यान योजनाएं"
            >
                <Link href="/teaching/plans/new" className="btn btn-primary">
                    <Plus className="w-5 h-5 mr-1" />
                    New Plan
                </Link>
            </PageHeader>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                
                {/* Filters / Search */}
                <div className="card p-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by title, class, or subject..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                </div>

                {/* Plans List */}
                {filteredPlans.length === 0 ? (
                    <div className="card p-12 text-center">
                        <BookMarked className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No lecture plans found</h3>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">Create your first lesson plan to get started.</p>
                        <div className="mt-6">
                            <Link href="/teaching/plans/new" className="btn btn-primary inline-flex">
                                <Plus className="w-5 h-5 mr-2" />
                                Create Plan
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPlans.map(plan => (
                            <div key={plan.id} className="card hover:shadow-md transition bg-white dark:bg-slate-800 border overflow-hidden flex flex-col">
                                <div className={`h-2 w-full ${
                                    plan.status === 'completed' ? 'bg-emerald-500' :
                                    plan.status === 'in_progress' ? 'bg-red-500' :
                                    'bg-blue-500'
                                }`} />
                                
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/50 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-300/20">
                                            {plan.class.name} • {plan.subject.name}
                                        </div>
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                            plan.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                            plan.status === 'in_progress' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 animate-pulse' :
                                            'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                                        }`}>
                                            {plan.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-2 mt-2">
                                        L{plan.lectureNumber}: {plan.title}
                                    </h3>
                                    {plan.titleHindi && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{plan.titleHindi}</p>
                                    )}

                                    <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400 flex-1">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            {new Date(plan.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                            {plan.scheduledDuration} min • {plan.lectureType}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-slate-400" />
                                            {plan.resources?.length || 0} resources attached
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                                        {plan.status === 'planned' ? (
                                            <button 
                                                onClick={() => handleStartSession(plan.id)}
                                                className="flex-1 btn bg-red-500 hover:bg-red-600 text-white flex justify-center items-center"
                                            >
                                                <Play className="w-4 h-4 mr-2" /> Start Session
                                            </button>
                                        ) : plan.status === 'in_progress' ? (
                                            <Link 
                                                href={`/teaching/sessions/${plan.sessions[0]?.id}`}
                                                className="flex-1 btn bg-red-500 text-white flex justify-center items-center hover:bg-red-600"
                                            >
                                                <Video className="w-4 h-4 mr-2" /> Join Live
                                            </Link>
                                        ) : (
                                            <div className="flex-1 text-center py-2 text-sm text-emerald-600 font-medium">
                                                Session Completed
                                            </div>
                                        )}
                                        <Link 
                                            href={`/teaching/plans/${plan.id}`}
                                            className="btn btn-outline p-2"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4 text-slate-600" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
