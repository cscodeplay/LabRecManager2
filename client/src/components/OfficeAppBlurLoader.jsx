'use client';

import { useState, useEffect } from 'react';
import { FileText, Grid, Presentation, Layers, Film, RefreshCw, FolderOpen, AlertCircle, RefreshCcw } from 'lucide-react';
import { useThemeStore } from '@/lib/store';

const APP_META = {
    excel: {
        icon: Grid,
        title: 'LabSheets',
        color: 'text-emerald-500 dark:text-emerald-400',
        glow: 'rgba(16, 185, 129, 0.4)',
        bgGradient: 'from-emerald-500/20 to-teal-500/20 dark:from-emerald-500/30 dark:to-teal-500/30',
        border: 'border-emerald-500/40'
    },
    word: {
        icon: FileText,
        title: 'LabDocs',
        color: 'text-blue-500 dark:text-blue-400',
        glow: 'rgba(59, 130, 246, 0.4)',
        bgGradient: 'from-blue-500/20 to-indigo-500/20 dark:from-blue-500/30 dark:to-indigo-500/30',
        border: 'border-blue-500/40'
    },
    slides: {
        icon: Presentation,
        title: 'LabSlides',
        color: 'text-amber-500 dark:text-amber-400',
        glow: 'rgba(245, 158, 11, 0.4)',
        bgGradient: 'from-amber-500/20 to-orange-500/20 dark:from-amber-500/30 dark:to-orange-500/30',
        border: 'border-amber-500/40'
    },
    pdf: {
        icon: Layers,
        title: 'LabPDF Studio',
        color: 'text-rose-500 dark:text-rose-400',
        glow: 'rgba(244, 63, 94, 0.4)',
        bgGradient: 'from-rose-500/20 to-red-500/20 dark:from-rose-500/30 dark:to-red-500/30',
        border: 'border-rose-500/40'
    },
    media: {
        icon: Film,
        title: 'Media Studio',
        color: 'text-sky-500 dark:text-sky-400',
        glow: 'rgba(14, 165, 233, 0.4)',
        bgGradient: 'from-sky-500/20 to-cyan-500/20 dark:from-sky-500/30 dark:to-cyan-500/30',
        border: 'border-sky-500/40'
    },
    converter: {
        icon: RefreshCw,
        title: 'Universal Converter',
        color: 'text-purple-500 dark:text-purple-400',
        glow: 'rgba(168, 85, 247, 0.4)',
        bgGradient: 'from-purple-500/20 to-fuchsia-500/20 dark:from-purple-500/30 dark:to-fuchsia-500/30',
        border: 'border-purple-500/40'
    }
};

export default function OfficeAppBlurLoader({
    appType = 'excel',
    message = 'Initializing and syncing with CloudVault...',
    subMessage = 'Restoring document contents and version history',
    error = null,
    onRetry = null
}) {
    const meta = APP_META[appType] || APP_META.excel;
    const Icon = meta.icon;

    const { theme } = useThemeStore();
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const updateTheme = () => {
            if (typeof document !== 'undefined') {
                setIsDark(document.documentElement.classList.contains('dark'));
            }
        };
        updateTheme();
        const obs = new MutationObserver(updateTheme);
        if (typeof document !== 'undefined') {
            obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        }
        return () => obs.disconnect();
    }, [theme]);

    return (
        <div className={`fixed inset-0 z-[150] flex flex-col items-center justify-center transition-all duration-300 ${
            isDark ? 'bg-slate-950/90 backdrop-blur-md text-white' : 'bg-slate-100/90 backdrop-blur-md text-slate-800'
        }`}>
            {/* Inline CSS Keyframe for Organic Breathing Animation */}
            <style jsx>{`
                @keyframes breathing {
                    0%, 100% {
                        transform: scale(0.94);
                        opacity: 0.85;
                        filter: drop-shadow(0 0 10px ${meta.glow});
                    }
                    50% {
                        transform: scale(1.08);
                        opacity: 1;
                        filter: drop-shadow(0 0 24px ${meta.glow});
                    }
                }
                .animate-breathing {
                    animation: breathing 2.4s ease-in-out infinite;
                }
            `}</style>

            <div className={`flex flex-col items-center text-center p-8 max-w-md rounded-3xl border shadow-2xl ${
                isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-slate-200/50'
            }`}>
                {error ? (
                    /* Error State with Retry Button */
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-4">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Failed to Load {meta.title}
                        </h3>
                        <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {error}
                        </p>
                        {onRetry && (
                            <button
                                type="button"
                                onClick={onRetry}
                                className="mt-5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105"
                            >
                                <RefreshCcw className="w-3.5 h-3.5" />
                                <span>Retry Connection</span>
                            </button>
                        )}
                    </div>
                ) : (
                    /* Active Organic Breathing Loader */
                    <>
                        {/* Breathing Center Icon */}
                        <div
                            className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${meta.bgGradient} border ${meta.border} flex items-center justify-center animate-breathing shadow-2xl mb-5`}
                        >
                            <Icon className={`w-10 h-10 ${meta.color}`} />
                        </div>

                        {/* App Name and Status */}
                        <h3 className={`text-lg font-bold tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {meta.title}
                        </h3>
                        <p className={`text-xs font-medium mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {message}
                        </p>
                        <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {subMessage}
                        </p>

                        {/* High-contrast animated progress bar */}
                        <div className={`w-48 h-1 rounded-full overflow-hidden mt-5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                            <div className="w-full h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-pulse" />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
