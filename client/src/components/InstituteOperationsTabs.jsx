'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    FluentInstituteOpsIcon,
    FluentRolesIcon,
    FluentBuildingIcon,
    FluentStorageIcon,
    FluentActivityIcon
} from '@/components/FluentNavIcons';
import { Shield, Database } from 'lucide-react';

export default function InstituteOperationsTabs({ activeTab, className = '' }) {
    const pathname = usePathname();

    const tabs = [
        {
            id: 'audit-logs',
            href: '/admin/audit-logs',
            label: 'Audit Trail',
            subLabel: 'Security & Admin Logs',
            icon: Shield
        },
        {
            id: 'activity-logs',
            href: '/activity-logs',
            label: 'Activity Logs',
            subLabel: 'User Event Timeline',
            icon: FluentActivityIcon
        },
        {
            id: 'query-logs',
            href: '/admin/query-logs',
            label: 'Query Diagnostics',
            subLabel: 'Database Telemetry',
            icon: Database
        },
        {
            id: 'roles-permissions',
            href: '/admin/roles-permissions',
            label: 'Roles & Access',
            subLabel: 'RBAC Security Matrix',
            icon: FluentRolesIcon
        },
        {
            id: 'school-profile',
            href: '/admin/school-profile',
            label: 'School Profile',
            subLabel: 'Institute & Branding',
            icon: FluentBuildingIcon
        },
        {
            id: 'storage',
            href: '/admin/storage',
            label: 'Storage Quotas',
            subLabel: 'Cloud Files & Cache',
            icon: FluentStorageIcon
        }
    ];

    return (
        <div className={`bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 transition-colors ${className}`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto py-2.5">
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1.5 hidden md:inline">
                        Operations & Audit:
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
                                        ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/80 shadow-xs ring-1 ring-amber-500/20'
                                        : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                                }`}
                                title={`${tab.label} — ${tab.subLabel}`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span>{tab.label}</span>
                                {isActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-0.5 animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
