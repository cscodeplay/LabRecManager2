'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    FileText,
    FileSpreadsheet,
    Presentation,
    Layers,
    Film,
    RefreshCw,
    HardDrive,
    Sparkles,
    LayoutGrid
} from 'lucide-react';

/**
 * Dedicated Sub-Sidebar Rail for the Office & Media Suite.
 * Displays all 7 editors simultaneously with 1-click instant switching.
 */
export default function OfficeSubSidebar({ activeApp = 'documents', className = '' }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isDark, setIsDark] = useState(false);
    const [hoveredApp, setHoveredApp] = useState(null);

    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
        checkDark();
        const observer = new MutationObserver(checkDark);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Derive active app from pathname if not explicitly passed
    const currentApp = activeApp || (() => {
        if (!pathname) return 'documents';
        if (pathname.includes('/excel-editor')) return 'excel';
        if (pathname.includes('/word-editor')) return 'word';
        if (pathname.includes('/slides-editor')) return 'slides';
        if (pathname.includes('/pdf-studio')) return 'pdf';
        if (pathname.includes('/media-studio')) return 'media';
        if (pathname.includes('/converter')) return 'converter';
        return 'documents';
    })();

    const apps = [
        {
            id: 'word',
            name: 'LabDocs',
            subtitle: 'Word Processor',
            href: '/documents/word-editor',
            icon: FileText,
            color: 'blue',
            activeClass: isDark
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-xs'
                : 'bg-blue-50 text-blue-600 border-blue-200 shadow-xs',
            hoverClass: isDark
                ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-800/80'
                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-200/80'
        },
        {
            id: 'excel',
            name: 'LabSheets',
            subtitle: 'Spreadsheets',
            href: '/documents/excel-editor',
            icon: FileSpreadsheet,
            color: 'emerald',
            activeClass: isDark
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-xs'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-xs',
            hoverClass: isDark
                ? 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80'
                : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-200/80'
        },
        {
            id: 'slides',
            name: 'LabSlides',
            subtitle: 'Presentations',
            href: '/documents/slides-editor',
            icon: Presentation,
            color: 'amber',
            activeClass: isDark
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-xs'
                : 'bg-amber-50 text-amber-600 border-amber-200 shadow-xs',
            hoverClass: isDark
                ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/80'
                : 'text-slate-600 hover:text-amber-600 hover:bg-slate-200/80'
        },
        {
            id: 'pdf',
            name: 'LabPDF Studio',
            subtitle: 'PDF Toolkit',
            href: '/documents/pdf-studio',
            icon: Layers,
            color: 'rose',
            activeClass: isDark
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-xs'
                : 'bg-rose-50 text-rose-600 border-rose-200 shadow-xs',
            hoverClass: isDark
                ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800/80'
                : 'text-slate-600 hover:text-rose-600 hover:bg-slate-200/80'
        },
        {
            id: 'media',
            name: 'Media Studio',
            subtitle: 'Audio/Video/Img',
            href: '/documents/media-studio',
            icon: Film,
            color: 'sky',
            activeClass: isDark
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 shadow-xs'
                : 'bg-sky-100 text-sky-700 border-sky-300 shadow-xs',
            hoverClass: isDark
                ? 'text-slate-400 hover:text-sky-400 hover:bg-slate-800/80'
                : 'text-slate-600 hover:text-sky-600 hover:bg-slate-200/80'
        },
        {
            id: 'converter',
            name: 'Universal Converter',
            subtitle: 'File Format Bridge',
            href: '/documents/converter',
            icon: RefreshCw,
            color: 'purple',
            activeClass: isDark
                ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 shadow-xs'
                : 'bg-purple-100 text-purple-700 border-purple-300 shadow-xs',
            hoverClass: isDark
                ? 'text-slate-400 hover:text-purple-400 hover:bg-slate-800/80'
                : 'text-slate-600 hover:text-purple-600 hover:bg-slate-200/80'
        }
    ];

    const storageApp = {
        id: 'documents',
        name: 'CloudVault & Docs',
        subtitle: '5TB Google Drive Hub',
        href: '/documents',
        icon: HardDrive,
        color: 'indigo',
        activeClass: isDark
            ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 shadow-xs'
            : 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs',
        hoverClass: isDark
            ? 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800/80'
            : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-200/80'
    };

    return (
        <aside
            className={`w-14 border-r flex flex-col items-center py-3 gap-2.5 z-30 shrink-0 select-none transition-colors duration-150 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            } ${className}`}
            aria-label="Office & Media Suite Sub-Sidebar"
        >
            {/* Header Icon / Suite Badge */}
            <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition mb-1 cursor-pointer ${
                    currentApp === 'documents'
                        ? (isDark ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/60' : 'bg-indigo-100 text-indigo-700 border border-indigo-200')
                        : (isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100')
                }`}
                onClick={() => router.push('/documents')}
                title="Office & Media Suite Hub"
            >
                <LayoutGrid size={18} />
            </div>

            <div className={`w-6 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

            {/* All 6 Editor Icons */}
            {apps.map((app) => {
                const isActive = currentApp === app.id;
                const IconComponent = app.icon;
                return (
                    <div key={app.id} className="relative group flex items-center justify-center">
                        <button
                            type="button"
                            onClick={() => router.push(app.href)}
                            onMouseEnter={() => setHoveredApp(app.id)}
                            onMouseLeave={() => setHoveredApp(null)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition border ${
                                isActive ? app.activeClass : `border-transparent ${app.hoverClass}`
                            }`}
                            aria-label={app.name}
                        >
                            <IconComponent size={18} />
                        </button>

                        {/* Floating Tooltip Bubble on Hover */}
                        <div className="absolute left-14 ml-2 px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 flex items-center gap-1.5 border border-slate-700">
                            <span>{app.name}</span>
                            <span className="text-[10px] text-slate-400">({app.subtitle})</span>
                            {isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5 animate-pulse" />
                            )}
                        </div>
                    </div>
                );
            })}

            <div className={`w-6 h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

            {/* CloudVault / Google Drive Storage Hub Icon */}
            <div className="relative group flex items-center justify-center mt-auto">
                <button
                    type="button"
                    onClick={() => router.push(storageApp.href)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition border ${
                        currentApp === storageApp.id
                            ? storageApp.activeClass
                            : `border-transparent ${storageApp.hoverClass}`
                    }`}
                    aria-label={storageApp.name}
                >
                    <HardDrive size={18} />
                </button>

                {/* Floating Tooltip */}
                <div className="absolute left-14 ml-2 px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 flex items-center gap-1.5 border border-slate-700">
                    <span>{storageApp.name}</span>
                    <span className="text-[10px] text-slate-400">({storageApp.subtitle})</span>
                    {currentApp === storageApp.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 ml-0.5 animate-pulse" />
                    )}
                </div>
            </div>
        </aside>
    );
}
