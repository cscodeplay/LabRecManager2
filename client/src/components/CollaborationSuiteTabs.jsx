'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import {
    FluentMeetingsIcon,
    FluentWhiteboardIcon,
    FluentLiveCollabIcon
} from '@/components/FluentNavIcons';
import { Video, Radio, Disc } from 'lucide-react';

export default function CollaborationSuiteTabs({ activeTab, className = '' }) {
    const pathname = usePathname();
    const { user } = useAuthStore();
    const isStaff = user && ['admin', 'principal', 'instructor', 'lab_assistant'].includes(user.role);

    const tabs = [
        {
            id: 'meetings',
            href: '/meetings',
            label: 'Virtual Classes',
            subLabel: 'Video Calls & Rooms',
            icon: FluentMeetingsIcon
        },
        {
            id: 'whiteboard',
            href: '/whiteboard',
            label: 'Whiteboard',
            subLabel: 'Interactive Canvas',
            icon: FluentWhiteboardIcon
        },
        {
            id: 'live-sessions',
            href: isStaff ? '/admin/whiteboards' : '/live-board',
            label: isStaff ? 'Broadcast Monitor' : 'Live Board',
            subLabel: isStaff ? 'Active Broadcasts' : 'Teacher Stream',
            icon: Radio,
            badge: isStaff ? 'Live' : undefined
        },
        {
            id: 'recordings',
            href: isStaff ? '/admin/recordings' : '/recordings',
            label: 'Recordings',
            subLabel: 'Cloud Lecture Archive',
            icon: Disc
        }
    ];

    return (
        <div className={`bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 transition-colors ${className}`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto py-2.5">
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1.5 hidden md:inline">
                        Collab Hub:
                    </span>
                    {tabs.map((tab) => {
                        const isActive = activeTab
                            ? activeTab === tab.id
                            : pathname === tab.href || pathname.startsWith(tab.href + '/');
                        const Icon = tab.icon;

                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                                    isActive
                                        ? 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/80 shadow-xs ring-1 ring-purple-500/20'
                                        : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                                }`}
                                title={`${tab.label} — ${tab.subLabel}`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/25">
                                        {tab.badge}
                                    </span>
                                )}
                                {isActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 ml-0.5 animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
