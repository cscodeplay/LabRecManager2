'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import {
    FluentLabsIcon,
    FluentTicketsIcon,
    FluentLabSuiteIcon
} from '@/components/FluentNavIcons';
import { Monitor, Laptop, Barcode, ClipboardList, Wrench, History } from 'lucide-react';

export default function LabInfrastructureTabs({ activeTab, className = '' }) {
    const pathname = usePathname();
    const { user } = useAuthStore();
    const isStaff = user && ['admin', 'principal', 'instructor', 'lab_assistant'].includes(user.role);

    const tabs = [
        ...(isStaff ? [{
            id: 'labs',
            href: '/admin/labs',
            label: 'Computer Labs',
            subLabel: 'Rooms & Station Mapping',
            icon: FluentLabsIcon
        }] : []),
        {
            id: 'tickets',
            href: '/tickets',
            label: 'IT Helpdesk & Tickets',
            subLabel: 'Hardware & Issue Tracking',
            icon: FluentTicketsIcon,
            badge: 'Support'
        },
        ...(isStaff ? [{
            id: 'device-issuance',
            href: '/admin/laptop-issuances',
            label: 'Device Issuance',
            subLabel: 'Hardware & Asset Loans',
            icon: Laptop
        }] : []),
        ...(isStaff ? [{
            id: 'barcodes',
            href: '/admin/barcode-generator',
            label: 'Asset Barcodes',
            subLabel: 'Tagging & Inventory',
            icon: Barcode
        }] : []),
        ...(isStaff ? [{
            id: 'import-history',
            href: '/admin/labs/import-history',
            label: 'Import History',
            subLabel: 'CSV & Excel Imports',
            icon: History
        }] : []),
        ...(isStaff ? [{
            id: 'procurement',
            href: '/admin/procurement',
            label: 'Procurement',
            subLabel: 'Purchase & Vendor Orders',
            icon: ClipboardList
        }] : [])
    ];

    const tabAccents = {
        'labs': {
            active: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-500/20 shadow-xs',
            dot: 'bg-emerald-500',
            hover: 'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300',
            badge: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
        },
        'tickets': {
            active: 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 ring-1 ring-rose-500/20 shadow-xs',
            dot: 'bg-rose-500',
            hover: 'hover:bg-rose-50/60 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300',
            badge: 'bg-rose-500/15 text-rose-600 border-rose-500/30'
        },
        'device-issuance': {
            active: 'bg-violet-50 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-800 ring-1 ring-violet-500/20 shadow-xs',
            dot: 'bg-violet-500',
            hover: 'hover:bg-violet-50/60 dark:hover:bg-violet-950/40 hover:text-violet-700 dark:hover:text-violet-300',
            badge: 'bg-violet-500/15 text-violet-600 border-violet-500/30'
        },
        'barcodes': {
            active: 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 ring-1 ring-amber-500/20 shadow-xs',
            dot: 'bg-amber-500',
            hover: 'hover:bg-amber-50/60 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300',
            badge: 'bg-amber-500/15 text-amber-600 border-amber-500/30'
        },
        'import-history': {
            active: 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 ring-1 ring-sky-500/20 shadow-xs',
            dot: 'bg-sky-500',
            hover: 'hover:bg-sky-50/60 dark:hover:bg-sky-950/40 hover:text-sky-700 dark:hover:text-sky-300',
            badge: 'bg-sky-500/15 text-sky-600 border-sky-500/30'
        },
        'procurement': {
            active: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-500/20 shadow-xs',
            dot: 'bg-indigo-500',
            hover: 'hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300',
            badge: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30'
        }
    };

    return (
        <div className={`bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 transition-colors ${className}`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto py-2.5">
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1.5 hidden md:inline">
                        Lab Infrastructure:
                    </span>
                    {tabs.map((tab) => {
                        const isActive = activeTab
                            ? activeTab === tab.id
                            : pathname === tab.href || pathname.startsWith(tab.href + '/');
                        const Icon = tab.icon;
                        const accent = tabAccents[tab.id] || tabAccents.procurement;

                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                                    isActive
                                        ? accent.active
                                        : `text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 ${accent.hover}`
                                }`}
                                title={`${tab.label} — ${tab.subLabel}`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-full border ${accent.badge}`}>
                                        {tab.badge}
                                    </span>
                                )}
                                {isActive && (
                                    <span className={`w-1.5 h-1.5 rounded-full ml-0.5 animate-pulse ${accent.dot}`} />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
