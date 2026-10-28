'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Laptop, Eye, Check } from 'lucide-react';
import { useThemeStore } from '@/lib/store';

export default function OfficeThemeToggle({ className = '' }) {
    const { theme, setTheme, initializeTheme } = useThemeStore();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        initializeTheme();
    }, [initializeTheme]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const themes = [
        { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Clean white canvas & daylight interface' },
        { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Deep slate background with soft contrast' },
        { id: 'system', label: 'Follow System', icon: Laptop, desc: 'Syncs with your OS appearance' },
        { id: 'contrast', label: 'High Contrast', icon: Eye, desc: 'Maximum accessibility & stark outlines' }
    ];

    const currentIcon = theme === 'dark' ? Moon : theme === 'contrast' ? Eye : theme === 'system' ? Laptop : Sun;
    const CurrentIconComponent = currentIcon;

    const handleSelectTheme = (themeId) => {
        if (themeId === 'contrast') {
            document.documentElement.classList.remove('light');
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-contrast', 'true');
            setTheme('dark');
        } else {
            document.documentElement.removeAttribute('data-contrast');
            setTheme(themeId);
        }
        setIsOpen(false);
    };

    return (
        <div className={`relative inline-block ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-medium transition shadow-xs"
                title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (Click to switch)`}
            >
                <CurrentIconComponent size={14} className="text-amber-400 dark:text-sky-400" />
                <span className="hidden md:inline capitalize">{theme === 'system' ? 'System' : theme}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in backdrop-blur-md">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                        Appearance & Theme
                    </div>
                    {themes.map((t) => {
                        const Icon = t.icon;
                        const isSelected = theme === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => handleSelectTheme(t.id)}
                                className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-800 transition ${
                                    isSelected ? 'text-indigo-400 font-semibold bg-indigo-500/10' : 'text-slate-300'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Icon size={14} className={isSelected ? 'text-indigo-400' : 'text-slate-400'} />
                                    <div>
                                        <div>{t.label}</div>
                                        <div className="text-[10px] text-slate-500 leading-tight">{t.desc}</div>
                                    </div>
                                </div>
                                {isSelected && <Check size={14} className="text-indigo-400 shrink-0 ml-1" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
