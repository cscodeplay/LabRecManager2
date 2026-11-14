'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
    Bell, BellOff, Check, X, Clock, BookOpen, Award, Video, MessageCircle,
    Trash2, Sparkles, Filter, CheckCheck, Volume2, Volume1, VolumeX, Sliders, Play
} from 'lucide-react';
import { FluentNotificationBellIcon } from '@/components/FluentAppIcons';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/dateUtils';
import toast from 'react-hot-toast';
import {
    playNotificationSound,
    isNotificationSoundMuted,
    toggleNotificationSoundMuted,
    setNotificationSoundMuted,
    getNotificationVolume,
    setNotificationVolume
} from '@/lib/notificationSound';

export default function NotificationBell({ variant = 'default', onOpenChange, lowMemory = false }) {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [viewTab, setViewTab] = useState('important'); // 'important' or 'all'
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0.7);
    const [showVolumeControl, setShowVolumeControl] = useState(false);
    const dropdownRef = useRef(null);
    const prevUnreadCountRef = useRef(0);

    useEffect(() => {
        setIsMuted(isNotificationSoundMuted());
        setVolume(getNotificationVolume());

        const handleMuteChange = (e) => {
            setIsMuted(Boolean(e?.detail?.muted));
        };
        const handleVolumeChange = (e) => {
            if (typeof e?.detail?.volume === 'number') {
                setVolume(e.detail.volume);
            }
        };

        window.addEventListener('notification-sound-muted-changed', handleMuteChange);
        window.addEventListener('notification-sound-volume-changed', handleVolumeChange);
        return () => {
            window.removeEventListener('notification-sound-muted-changed', handleMuteChange);
            window.removeEventListener('notification-sound-volume-changed', handleVolumeChange);
        };
    }, []);

    // Listen to real-time notification events across the app and play chime
    useEffect(() => {
        const handleIslandNotification = () => {
            playNotificationSound();
            loadNotifications();
        };
        window.addEventListener('app:island-notification', handleIslandNotification);
        return () => window.removeEventListener('app:island-notification', handleIslandNotification);
    }, []);

    useEffect(() => {
        onOpenChange?.(isOpen);
    }, [isOpen, onOpenChange]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen]);

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
            const newUnread = notifs.filter(n => !n.isRead).length;
            if (newUnread > prevUnreadCountRef.current && prevUnreadCountRef.current > 0) {
                playNotificationSound();
            }
            prevUnreadCountRef.current = newUnread;
            setNotifications(notifs);
            setUnreadCount(newUnread);
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

    const isCircle = variant === 'floating-circle';

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className={
                    isCircle
                        ? `relative w-11 h-11 rounded-full ${
                            isMuted
                                ? 'bg-rose-600 hover:bg-rose-700 border-rose-500 shadow-lg shadow-rose-600/30 text-white'
                                : `bg-white/95 dark:bg-slate-900/95 ${lowMemory ? '' : 'backdrop-blur-sm'} border-slate-200 dark:border-slate-700 shadow-lg text-slate-700 dark:text-slate-200`
                        } border hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer`
                        : `relative p-2 rounded-lg ${
                            isMuted
                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                        } transition flex items-center justify-center cursor-pointer`
                }
                title={
                    isMuted
                        ? unreadCount > 0
                            ? `Notifications (${unreadCount} unread, Chime Muted/Silent)`
                            : 'Notifications (Chime Muted/Silent)'
                        : unreadCount > 0
                            ? `Notifications (${unreadCount} unread)`
                            : 'Notifications'
                }
                aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
                aria-expanded={isOpen}
            >
                {isMuted ? (
                    <BellOff className="w-5 h-5 text-white shrink-0" />
                ) : (
                    <FluentNotificationBellIcon className="w-5 h-5 shrink-0" hasUnread={unreadCount > 0} />
                )}
                {unreadCount > 0 && (
                    <span
                        className={`absolute -top-1 -right-1 min-w-5 h-5 px-1 ${
                            isMuted
                                ? 'bg-white text-rose-600 font-black shadow-md border border-rose-200'
                                : 'bg-red-500 text-white font-extrabold animate-pulse shadow-sm'
                        } text-[10px] rounded-full flex items-center justify-center`}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    data-popover="true"
                    data-dropdown="true"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[100] overflow-hidden animate-in fade-in notif-menu"
                >
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
                        <div className="flex items-center gap-1.5">
                            {/* Notification Volume & Audio Control Button */}
                            <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowVolumeControl(prev => !prev);
                                }}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                                    showVolumeControl
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                        : isMuted
                                        ? 'bg-slate-100 dark:bg-slate-800 text-rose-500 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                }`}
                                title="Adjust Notification Sound Volume & Chime Settings"
                            >
                                {isMuted ? (
                                    <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                                ) : volume < 0.4 ? (
                                    <Volume1 className="w-3.5 h-3.5 text-indigo-500" />
                                ) : (
                                    <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                                )}
                                <span className="text-[11px] font-bold">
                                    {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
                                </span>
                            </button>

                            {unreadCount > 0 && (
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={markAllAsRead}
                                    className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold px-1"
                                    title="Mark all as read"
                                >
                                    Mark read
                                </button>
                            )}
                            {hasReadNotifications && (
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={clearReadNotifications}
                                    className="text-xs text-slate-400 hover:text-red-500 font-medium px-1"
                                    title="Clear read notifications to declutter"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notification Sound & Volume Control Panel */}
                    {showVolumeControl && (
                        <div
                            onPointerDown={(e) => e.stopPropagation()}
                            className="p-3.5 bg-slate-50 dark:bg-slate-850/90 border-b border-slate-200 dark:border-slate-800 space-y-2.5 animate-in fade-in duration-150"
                        >
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                    <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                                    Notification Sound Volume
                                </span>
                                <span className="font-mono text-[11px] font-extrabold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">
                                    {isMuted ? 'Muted (0%)' : `${Math.round(volume * 100)}%`}
                                </span>
                            </div>

                            {/* Volume Slider Row */}
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const nextMute = toggleNotificationSoundMuted();
                                        setIsMuted(nextMute);
                                        if (!nextMute && volume === 0) {
                                            setVolume(0.5);
                                            setNotificationVolume(0.5);
                                        }
                                        toast(nextMute ? 'Chime muted' : 'Chime unmuted');
                                    }}
                                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer shrink-0"
                                    title={isMuted ? 'Unmute' : 'Mute'}
                                >
                                    {isMuted ? (
                                        <VolumeX className="w-4 h-4 text-rose-500" />
                                    ) : volume < 0.4 ? (
                                        <Volume1 className="w-4 h-4 text-indigo-500" />
                                    ) : (
                                        <Volume2 className="w-4 h-4 text-indigo-500" />
                                    )}
                                </button>

                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={isMuted ? 0 : Math.round(volume * 100)}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        const v = Number(e.target.value) / 100;
                                        setVolume(v);
                                        setNotificationVolume(v);
                                        if (v > 0 && isMuted) {
                                            setIsMuted(false);
                                            setNotificationSoundMuted(false);
                                        }
                                    }}
                                    className="flex-1 accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                                />

                                <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        playNotificationSound({ force: true, testVolume: isMuted ? 0.6 : volume });
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[11px] font-bold shadow-xs cursor-pointer shrink-0 transition"
                                    title="Test notification chime sound at current volume"
                                >
                                    <Play className="w-3 h-3 fill-current" />
                                    Test
                                </button>
                            </div>

                            {/* Preset Quick-Buttons */}
                            <div className="flex items-center gap-1.5 pt-0.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Presets:</span>
                                {[
                                    { label: 'Mute', val: 0 },
                                    { label: '30%', val: 0.3 },
                                    { label: '60%', val: 0.6 },
                                    { label: '100%', val: 1.0 }
                                ].map((p) => {
                                    const isActive = p.val === 0 ? isMuted : (!isMuted && Math.abs(volume - p.val) < 0.1);
                                    return (
                                        <button
                                            key={p.label}
                                            type="button"
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (p.val === 0) {
                                                    setIsMuted(true);
                                                    setNotificationSoundMuted(true);
                                                } else {
                                                    setIsMuted(false);
                                                    setNotificationSoundMuted(false);
                                                    setVolume(p.val);
                                                    setNotificationVolume(p.val);
                                                    playNotificationSound({ force: true, testVolume: p.val });
                                                }
                                            }}
                                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer ${
                                                isActive
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

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
