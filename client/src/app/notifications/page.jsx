'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Bell, ArrowLeft, Check, CheckCheck, Trash2, BookOpen, Award, Video,
    Clock, MessageCircle, Filter, RefreshCw, Sparkles, Search, CheckCircle2,
    Calendar, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
    const router = useRouter();
    const { isAuthenticated, _hasHydrated } = useAuthStore();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('important'); // 'important', 'all', 'unread', 'read'
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadNotifications();
    }, [_hasHydrated, isAuthenticated]);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/notifications?limit=100');
            setNotifications(data.data?.notifications || []);
        } catch (error) {
            console.error('Failed to load notifications:', error);
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await api.put(`/notifications/${notificationId}/read`);
            setNotifications(prev => prev.map(n =>
                n.id === notificationId ? { ...n, isRead: true } : n
            ));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            toast.success('All notifications marked as read');
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const clearReadNotifications = async () => {
        try {
            await api.delete('/notifications/clear-read');
            setNotifications(prev => prev.filter(n => !n.isRead));
            toast.success('All read notifications cleared');
        } catch (error) {
            setNotifications(prev => prev.filter(n => !n.isRead));
            toast.success('Cleared read notifications');
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            await api.delete(`/notifications/${notificationId}`);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            toast.success('Notification deleted');
        } catch (error) {
            toast.error('Failed to delete notification');
        }
    };

    const isImportant = (n) => {
        if (!n.isRead) return true;
        const type = (n.type || '').toLowerCase();
        const title = (n.title || '').toLowerCase();
        return (
            type === 'meeting' ||
            type === 'meeting_invite' ||
            type === 'viva' ||
            type === 'assignment' ||
            type === 'grade' ||
            type === 'ticket' ||
            type === 'timetable' ||
            type === 'reminder' ||
            type === 'urgent' ||
            title.includes('meeting') ||
            title.includes('assignment') ||
            title.includes('grade') ||
            title.includes('viva') ||
            title.includes('urgent') ||
            title.includes('exam')
        );
    };

    const getIcon = (type) => {
        switch (type) {
            case 'assignment': return <BookOpen className="w-5 h-5 text-blue-500" />;
            case 'grade': return <Award className="w-5 h-5 text-emerald-500" />;
            case 'viva':
            case 'meeting':
            case 'meeting_invite': return <Video className="w-5 h-5 text-purple-500" />;
            case 'timetable':
            case 'reminder': return <Clock className="w-5 h-5 text-amber-500" />;
            case 'urgent': return <AlertTriangle className="w-5 h-5 text-rose-500" />;
            default: return <MessageCircle className="w-5 h-5 text-slate-500" />;
        }
    };

    const getTypeBadge = (type) => {
        switch (type) {
            case 'assignment':
                return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Assignment</span>;
            case 'grade':
                return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Grade Released</span>;
            case 'meeting':
            case 'meeting_invite':
            case 'viva':
                return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">Meeting Invite</span>;
            case 'timetable':
            case 'reminder':
                return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Schedule</span>;
            case 'urgent':
                return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">Urgent Alert</span>;
            default:
                return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Update</span>;
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString(undefined, {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Filter and search notifications
    const filteredNotifications = useMemo(() => {
        return notifications.filter(n => {
            // Tab filter
            if (filter === 'important' && !isImportant(n)) return false;
            if (filter === 'unread' && n.isRead) return false;
            if (filter === 'read' && !n.isRead) return false;

            // Search query filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchTitle = (n.title || '').toLowerCase().includes(query);
                const matchMsg = (n.message || '').toLowerCase().includes(query);
                const matchType = (n.type || '').toLowerCase().includes(query);
                if (!matchTitle && !matchMsg && !matchType) return false;
            }

            return true;
        });
    }, [notifications, filter, searchQuery]);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const importantCount = notifications.filter(isImportant).length;
    const readCount = notifications.filter(n => n.isRead).length;

    if (!_hasHydrated || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 backdrop-blur-md">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Bell className="w-5 h-5 text-primary-600" />
                                Notifications Center
                                {unreadCount > 0 && (
                                    <span className="px-2.5 py-0.5 bg-red-500 text-white text-xs font-extrabold rounded-full animate-pulse shadow-xs">
                                        {unreadCount} unread
                                    </span>
                                )}
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Showing essential academic alerts, live meeting invites, and urgent actions
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                            >
                                <CheckCheck className="w-4 h-4 text-emerald-500" />
                                Mark all read
                            </button>
                        )}
                        {readCount > 0 && (
                            <button
                                onClick={clearReadNotifications}
                                className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-rose-200 dark:border-rose-900"
                                title="Clear read notifications to avoid clutter"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Clear Read
                            </button>
                        )}
                        <button
                            onClick={loadNotifications}
                            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
                {/* Search and Filters Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                        <button
                            onClick={() => setFilter('important')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                                filter === 'important'
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Important ({importantCount})
                        </button>
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                                filter === 'all'
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            All ({notifications.length})
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                                filter === 'unread'
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            Unread ({unreadCount})
                        </button>
                        <button
                            onClick={() => setFilter('read')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                                filter === 'read'
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            Read ({readCount})
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search alerts..."
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Notifications List */}
                {filteredNotifications.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-2xs">
                        <Bell className="w-14 h-14 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                            {filter === 'important' ? 'No priority notifications' :
                             filter === 'unread' ? 'All caught up! No unread notifications.' :
                             filter === 'read' ? 'No read notifications.' :
                             'No notifications found.'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                            {filter === 'important'
                                ? 'You do not have any urgent meeting invites, pending assignments, or alerts requiring your attention.'
                                : 'All new notifications will be cleanly categorized and displayed here.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {filteredNotifications.map(notification => {
                            const actionTarget = notification.actionUrl || notification.action_url || (
                                (notification.type === 'meeting_invite' || notification.type === 'meeting') ? '/meetings' : null
                            );
                            const isMeetingInvite = notification.type === 'meeting_invite' || notification.type === 'meeting' || notification.title?.toLowerCase().includes('meeting');

                            return (
                                <div
                                    key={notification.id}
                                    className={`p-4 rounded-2xl border transition-all shadow-2xs flex gap-3.5 items-start ${
                                        !notification.isRead
                                            ? 'bg-white dark:bg-slate-900 border-primary-300 dark:border-primary-800 ring-1 ring-primary-500/20'
                                            : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 opacity-90'
                                    }`}
                                >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-2xs">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {getTypeBadge(notification.type)}
                                                <h4 className={`text-sm ${!notification.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                                    {notification.title}
                                                </h4>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {!notification.isRead && (
                                                    <button
                                                        onClick={() => markAsRead(notification.id)}
                                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition"
                                                        title="Mark as read"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => deleteNotification(notification.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                                                    title="Delete notification"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                                            {notification.message}
                                        </p>

                                        {/* Actionable Buttons */}
                                        <div className="mt-3 flex items-center gap-3">
                                            {isMeetingInvite && actionTarget && (
                                                <button
                                                    onClick={() => {
                                                        if (!notification.isRead) markAsRead(notification.id);
                                                        router.push(actionTarget);
                                                    }}
                                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
                                                >
                                                    <Video className="w-3.5 h-3.5" />
                                                    Join Live Meeting
                                                </button>
                                            )}

                                            {actionTarget && !isMeetingInvite && (
                                                <button
                                                    onClick={() => {
                                                        if (!notification.isRead) markAsRead(notification.id);
                                                        router.push(actionTarget);
                                                    }}
                                                    className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
                                                >
                                                    View Details →
                                                </button>
                                            )}

                                            <span className="text-[11px] text-slate-400">
                                                {formatTime(notification.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
