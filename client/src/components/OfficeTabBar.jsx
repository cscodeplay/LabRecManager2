'use client';

import React from 'react';
import { Plus, X, FileText, FileSpreadsheet, Presentation, FileCode, Layers } from 'lucide-react';

const APP_THEMES = {
    word: {
        accentBorder: 'border-blue-600',
        activeText: 'text-blue-600 dark:text-blue-400',
        badgeBg: 'bg-blue-50 dark:bg-blue-950/60',
        icon: FileText,
        defaultName: 'Untitled Document'
    },
    excel: {
        accentBorder: 'border-emerald-600',
        activeText: 'text-emerald-600 dark:text-emerald-400',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
        icon: FileSpreadsheet,
        defaultName: 'Untitled Workbook'
    },
    slides: {
        accentBorder: 'border-amber-600',
        activeText: 'text-amber-600 dark:text-amber-400',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
        icon: Presentation,
        defaultName: 'Untitled Presentation'
    },
    pdf: {
        accentBorder: 'border-red-600',
        activeText: 'text-red-600 dark:text-red-400',
        badgeBg: 'bg-red-50 dark:bg-red-950/60',
        icon: FileCode,
        defaultName: 'Document.pdf'
    }
};

export default function OfficeTabBar({
    tabs = [],
    activeTabId,
    appType = 'word',
    onSelectTab,
    onAddTab,
    onCloseTab,
    className = ''
}) {
    const theme = APP_THEMES[appType] || APP_THEMES.word;
    const IconComp = theme.icon;

    if (!tabs || tabs.length === 0) return null;

    return (
        <div className={`w-full bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-2 pt-1 flex items-center gap-1 select-none overflow-x-auto no-scrollbar ${className}`}>
            <div className="flex items-center gap-1 min-w-0 flex-1">
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    return (
                        <div
                            key={tab.id}
                            onClick={() => onSelectTab(tab.id)}
                            className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-t-2 transition-all cursor-pointer text-xs font-medium max-w-[200px] shrink-0 ${
                                isActive
                                    ? `bg-white dark:bg-slate-950 ${theme.accentBorder} ${theme.activeText} shadow-xs font-semibold border-x border-slate-200 dark:border-slate-800`
                                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                            }`}
                            title={tab.title || theme.defaultName}
                        >
                            <IconComp className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate flex-1">
                                {tab.title || theme.defaultName}
                            </span>
                            {tab.isDirty && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Unsaved changes" />
                            )}
                            {onCloseTab && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCloseTab(tab.id, e);
                                    }}
                                    className="p-0.5 rounded-full hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400 text-slate-400 transition opacity-70 group-hover:opacity-100 shrink-0"
                                    title="Close Tab"
                                    aria-label="Close Tab"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Add New Tab Button */}
                {onAddTab && (
                    <button
                        type="button"
                        onClick={onAddTab}
                        className="p-1.5 mb-0.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition active:scale-95 shrink-0"
                        title={`Open new ${theme.defaultName}`}
                        aria-label="Add new document tab"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
