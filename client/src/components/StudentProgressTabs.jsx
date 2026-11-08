'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    FluentStudentProgressIcon,
    FluentAssignmentsIcon,
    FluentTrainingIcon,
    FluentQuizIcon,
    FluentExamHubIcon
} from '@/components/FluentNavIcons';

export default function StudentProgressTabs({ activeTab = 'overview', className = '' }) {
    const pathname = usePathname();

    const tabs = [
        {
            id: 'overview',
            href: '/reports/progress',
            label: '360° Academic Dossier',
            subLabel: 'Holistic Student Progress',
            icon: FluentStudentProgressIcon
        },
        {
            id: 'assignments',
            href: '/assignments',
            label: 'Assignments & Labs',
            subLabel: 'Submissions & Pass Rate',
            icon: FluentAssignmentsIcon
        },
        {
            id: 'training',
            href: '/training',
            label: 'Training Modules',
            subLabel: 'Theory & Interactive Units',
            icon: FluentTrainingIcon
        },
        {
            id: 'quizzes',
            href: '/quiz',
            label: 'AI Quizzes & Drills',
            subLabel: 'Diagnostic Test Scores',
            icon: FluentQuizIcon
        },
        {
            id: 'exams',
            href: '/reports/progress?tab=exams',
            label: 'Exams & Question Papers',
            subLabel: 'CBT, OMR & Blueprint Designer',
            icon: FluentExamHubIcon,
            badge: 'Exam Hub'
        }
    ];

    return (
        <div className={`bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 transition-colors ${className}`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto py-2.5">
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1.5 hidden md:inline">
                        Academic Growth:
                    </span>
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;

                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                                    isActive
                                        ? 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/80 shadow-xs ring-1 ring-cyan-500/20'
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
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 ml-0.5 animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
