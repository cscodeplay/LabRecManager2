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
import { Monitor, Laptop, Barcode, ClipboardList, Wrench } from 'lucide-react';

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
            id: 'procurement',
            href: '/admin/procurement',
            label: 'Procurement',
            subLabel: 'Purchase & Vendor Orders',
            icon: ClipboardList
        }] : [])
    ];

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

                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                                    isActive
                                        ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/80 shadow-xs ring-1 ring-blue-500/20'
                                        : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                                }`}
                                title={`${tab.label} — ${tab.subLabel}`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/25">
                                        {tab.badge}
                                    </span>
                                )}
                                {isActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-0.5 animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
