'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    FluentAssignmentsIcon,
    FluentAssignedWorkIcon,
    FluentReviewSubmissionsIcon,
    FluentGradesIcon
} from '@/components/FluentNavIcons';

export default function AssignmentSuiteTabs({ activeTab, className = '' }) {
    const pathname = usePathname();

    const tabs = [
        {
            id: 'assignments',
            href: '/assignments',
            label: 'Assignment Library',
            subLabel: 'Catalog & AI Creator',
            icon: FluentAssignmentsIcon
        },
        {
            id: 'assigned-work',
            href: '/assigned-work',
            label: 'Class Allocations',
            subLabel: 'Dispatch & Deadlines',
            icon: FluentAssignedWorkIcon
        },
        {
            id: 'submissions',
            href: '/submissions',
            label: 'Submissions Review',
            subLabel: 'Turn-ins & Grading',
            icon: FluentReviewSubmissionsIcon
        },
        {
            id: 'grades',
            href: '/grades',
            label: 'Marks & Gradebook',
            subLabel: 'Evaluation & Analytics',
            icon: FluentGradesIcon
        }
    ];

    return (
        <div className={`bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 transition-colors ${className}`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto py-2.5">
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1.5 hidden md:inline">
                        Curriculum Hub:
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
                                        ? 'bg-primary-50 dark:bg-primary-950/70 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800/80 shadow-xs ring-1 ring-primary-500/20'
                                        : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                                }`}
                                title={`${tab.label} — ${tab.subLabel}`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span>{tab.label}</span>
                                {isActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 ml-0.5 animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
