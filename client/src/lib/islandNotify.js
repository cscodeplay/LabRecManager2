'use client';

/**
 * Universal Island Notification Dispatcher
 * Can be imported anywhere in the app:
 * 
 * import { showIslandNotification } from '@/lib/islandNotify';
 * 
 * showIslandNotification({
 *     type: 'meeting', // 'meeting' | 'whiteboard' | 'timetable' | 'shift' | 'assignment' | 'grade' | 'ticket' | 'info' | 'success'
 *     title: 'Live Lab Viva Session',
 *     subtitle: 'Physics Lab 01 • Dr. Sharma',
 *     actionLabel: 'Join Room',
 *     route: '/meeting/abc-123'
 * });
 */

export function showIslandNotification(notification) {
    if (typeof window === 'undefined') return;
    
    const payload = {
        id: notification.id || `island-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: notification.type || 'info',
        title: notification.title || 'Notification',
        subtitle: notification.subtitle || '',
        message: notification.message || '',
        icon: notification.icon || null,
        badge: notification.badge || null,
        duration: notification.duration !== undefined ? notification.duration : 7000,
        actionLabel: notification.actionLabel || null,
        onAction: notification.onAction || null,
        route: notification.route || null,
        data: notification.data || {},
        priority: notification.priority || 'normal', // 'high' | 'normal' | 'low'
        timestamp: notification.timestamp || new Date().toISOString()
    };

    window.dispatchEvent(new CustomEvent('app:island-notification', { detail: payload }));
    return payload.id;
}

export function dismissIslandNotification(id) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('app:island-dismiss', { detail: { id } }));
}
