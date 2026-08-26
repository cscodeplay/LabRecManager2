'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
    Bell, Check, X, Clock, BookOpen, Award, Video, MessageCircle,
    Trash2, Sparkles, Filter, CheckCheck
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/dateUtils';
import toast from 'react-hot-toast';

export default function NotificationBell() {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [viewTab, setViewTab] = useState('important'); // 'important' or 'all'
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (isAuthenticated) {
            loadNotifications();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/notifications?limit=40');
            const notifs = data.data?.notifications || [];
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.isRead).length);
        } catch (error) {
            console.error('Failed to load notifications:', error);
            setNotifications([]);
            setUnreadCount(0);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId, e) => {
        e?.stopPropagation?.();
        try {
            await api.put(`/notifications/${notificationId}/read`);
            setNotifications(prev => prev.map(n =>
                n.id === notificationId ? { ...n, isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            setNotifications(prev => prev.map(n =>
                n.id === notificationId ? { ...n, isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    };

    const deleteNotification = async (notificationId, e) => {
        e?.stopPropagation?.();
        try {
            await api.delete(`/notifications/${notificationId}`);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            setUnreadCount(prev => {
                const wasUnread = notifications.find(n => n.id === notificationId && !n.isRead);
                return wasUnread ? Math.max(0, prev - 1) : prev;
            });
            toast.success('Notification dismissed');
        } catch (error) {
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            toast.success('All marked as read');
        } catch (error) {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        }
    };

    const clearReadNotifications = async () => {
        try {
            await api.delete('/notifications/clear-read');
            setNotifications(prev => prev.filter(n => !n.isRead));
            toast.success('Read notifications cleared');
        } catch (error) {
            setNotifications(prev => prev.filter(n => !n.isRead));
        }
    };

    const isImportantNotification = (n) => {
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
            title.includes('meeting') ||
            title.includes('assignment') ||
            title.includes('grade') ||
            title.includes('viva') ||
            title.includes('exam')
        );
    };

    // Deduplicate and group repetitive notifications
    const displayedNotifications = useMemo(() => {
        let list = notifications;
        if (viewTab === 'important') {
            list = list.filter(isImportantNotification);
        }

        // Deduplicate identical active unread messages
        const seen = new Set();
        const deduped = [];

        for (const n of list) {
            const key = `${n.type || 'info'}_${n.reference_id || n.title}_${n.isRead}`;
            if (!seen.has(key)) {
                seen.add(key);
                deduped.push(n);
            }
        }

        return deduped;
    }, [notifications, viewTab]);

    const getIcon = (type) => {
        switch (type) {
            case 'assignment': return <BookOpen className="w-4 h-4 text-blue-500" />;
            case 'grade': return <Award className="w-4 h-4 text-green-500" />;
            case 'meeting':
            case 'meeting_invite':
            case 'viva': return <Video className="w-4 h-4 text-purple-500" />;
            case 'reminder':
            case 'timetable': return <Clock className="w-4 h-4 text-amber-500" />;
            default: return <MessageCircle className="w-4 h-4 text-slate-500" />;
        }
    };

    const formatTime = (dateString) => {
        return formatRelativeTime(dateString);
    };

    if (!isAuthenticated) return null;

    const hasReadNotifications = notifications.some(n => n.isRead);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Notifications"
            >
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center animate-pulse shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[100] overflow-hidden animate-in fade-in">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                                    {unreadCount} unread
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold"
                                    title="Mark all as read"
                                >
                                    Mark all read
                                </button>
                            )}
                            {hasReadNotifications && (
                                <button
                                    onClick={clearReadNotifications}
                                    className="text-xs text-slate-400 hover:text-red-500 font-medium"
                                    title="Clear read notifications to declutter"
                                >
                                    Clear read
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Tabs (Important vs All) */}
                    <div className="p-2 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex gap-1">
                        <button
                            onClick={() => setViewTab('important')}
                            className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                                viewTab === 'important'
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            Important
                        </button>
                        <button
                            onClick={() => setViewTab('all')}
                            className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition ${
                                viewTab === 'all'
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            All ({notifications.length})
                        </button>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
                            </div>
                        ) : displayedNotifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2 opacity-50" />
                                <p className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                                    {viewTab === 'important' ? 'No priority notifications' : 'No notifications yet'}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {viewTab === 'important' ? 'You are all caught up on urgent tasks' : 'New alerts will appear here'}
                                </p>
                            </div>
                        ) : (
                            <ul>
                                {displayedNotifications.map((notification) => {
                                    const actionTarget = notification.actionUrl || notification.action_url || (
                                        (notification.type === 'meeting_invite' || notification.type === 'meeting') ? '/meetings' : null
                                    );

                                    const isMeetingInvite = notification.type === 'meeting_invite' || notification.type === 'meeting' || notification.title?.toLowerCase().includes('meeting');

                                    return (
                                        <li
                                            key={notification.id}
                                            className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group relative ${
                                                !notification.isRead ? 'bg-primary-50/40 dark:bg-primary-950/20' : ''
                                            }`}
                                            onClick={() => {
                                                if (!notification.isRead) markAsRead(notification.id);
                                                if (actionTarget) {
                                                    setIsOpen(false);
                                                    router.push(actionTarget);
                                                }
                                            }}
                                        >
                                            <div className="flex gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                    {getIcon(notification.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className={`text-xs ${!notification.isRead ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                                            {notification.title}
                                                        </p>
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            {!notification.isRead && (
                                                                <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                                                            )}
                                                            {/* Quick Dismiss Button on hover */}
                                                            <button
                                                                onClick={(e) => deleteNotification(notification.id, e)}
                                                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition"
                                                                title="Dismiss"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                                        {notification.message}
                                                    </p>

                                                    {/* Join Meeting Action Pill */}
                                                    {isMeetingInvite && actionTarget && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!notification.isRead) markAsRead(notification.id);
                                                                setIsOpen(false);
                                                                router.push(actionTarget);
                                                            }}
                                                            className="mt-2 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition"
                                                        >
                                                            <Video className="w-3 h-3" />
                                                            Join Meeting
                                                        </button>
                                                    )}

                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        {formatTime(notification.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
                        <Link
                            href="/notifications"
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-bold"
                        >
                            View all & manage →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
