'use client';

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
    Settings, 
    ZoomIn, 
    ZoomOut, 
    RotateCcw, 
    WrapText, 
    Eye, 
    EyeOff, 
    Sun, 
    Moon, 
    Palette,
    Check
} from 'lucide-react';

const STORAGE_KEY = 'ulrms_editor_settings';

const DEFAULT_SETTINGS = {
    fontSize: 14,
    theme: 'vs-dark',
    wordWrap: 'on',
    minimap: false,
    tabSize: 4,
    lineNumbers: 'on',
};

/**
 * Enhanced Monaco Code Editor with Integrated Configuration Toolbar
 * Features:
 * - Font scaling (A- / A+ / reset)
 * - Theme selector (vs-dark, vs [light], hc-black)
 * - Word wrap toggle
 * - Tab size (2 / 4 spaces)
 * - Minimap toggle
 * - Line numbers toggle
 * - Persistent configuration via localStorage
 */
export default function CodeEditorWithConfig({
    value = '',
    onChange,
    language = 'python',
    height = '100%',
    className = '',
    fileName = 'solution.py',
    runtimeLabel = 'Python 3.11 Runtime',
    readOnly = false,
    options = {},
    extraToolbarRight = null,
    onMount
}) {
    // Load persisted settings or fallback to defaults
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [showSettingsPopover, setShowSettingsPopover] = useState(false);
    const popoverRef = useRef(null);

    // Initialize from localStorage after client hydration
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setSettings(prev => ({ ...prev, ...parsed }));
            }
        } catch (e) {
            console.warn('[CodeEditor] Failed to load editor settings from localStorage:', e);
        }
    }, []);

    // Save to localStorage when settings change
    const updateSetting = (key, val) => {
        setSettings(prev => {
            const updated = { ...prev, [key]: val };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
                console.warn('[CodeEditor] Failed to persist settings:', e);
            }
            return updated;
        });
    };

    // Close settings popover on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setShowSettingsPopover(false);
            }
        };
        if (showSettingsPopover) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSettingsPopover]);

    // Quick font controls
    const increaseFontSize = () => {
        if (settings.fontSize < 24) {
            updateSetting('fontSize', settings.fontSize + 1);
        }
    };

    const decreaseFontSize = () => {
        if (settings.fontSize > 11) {
            updateSetting('fontSize', settings.fontSize - 1);
        }
    };

    const resetSettings = () => {
        setSettings(DEFAULT_SETTINGS);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
        } catch (e) {}
    };

    const toggleWordWrap = () => {
        updateSetting('wordWrap', settings.wordWrap === 'on' ? 'off' : 'on');
    };

    // Monaco options merged with user configurations
    const editorOptions = {
        fontSize: settings.fontSize,
        lineHeight: Math.round(settings.fontSize * 1.6),
        fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
        fontLigatures: true,
        wordWrap: settings.wordWrap,
        tabSize: settings.tabSize,
        lineNumbers: settings.lineNumbers,
        minimap: { enabled: settings.minimap },
        readOnly,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        padding: { top: 12, bottom: 12 },
        ...options
    };

    return (
        <div className={`flex flex-col h-full bg-slate-950 overflow-hidden relative ${className}`}>
            {/* Standard IDE Header Toolbar */}
            <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 select-none shrink-0">
                {/* Left: File name & runtime badge */}
                <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-indigo-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        {fileName}
                    </span>
                    <span className="hidden sm:inline text-[11px] text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
                        {runtimeLabel}
                    </span>
                </div>

                {/* Right: Quick Font Controls & IDE Settings */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Word Wrap Quick Toggle */}
                    <button
                        type="button"
                        onClick={toggleWordWrap}
                        title={`Word Wrap: ${settings.wordWrap === 'on' ? 'ON (Click to disable)' : 'OFF (Click to enable)'}`}
                        className={`p-1.5 rounded-lg border transition flex items-center gap-1 ${
                            settings.wordWrap === 'on'
                                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30'
                                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                    >
                        <WrapText className="w-3.5 h-3.5" />
                        <span className="text-[10px] hidden md:inline font-mono">Wrap</span>
                    </button>

                    {/* Font Size Decrement */}
                    <button
                        type="button"
                        onClick={decreaseFontSize}
                        disabled={settings.fontSize <= 11}
                        title="Decrease Font Size (Ctrl + -)"
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-slate-700 transition flex items-center"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>

                    {/* Font Size Indicator */}
                    <span 
                        className="px-2 py-0.5 bg-slate-800 text-[11px] font-mono text-slate-300 rounded border border-slate-700"
                        title="Current Font Size"
                    >
                        {settings.fontSize}px
                    </span>

                    {/* Font Size Increment */}
                    <button
                        type="button"
                        onClick={increaseFontSize}
                        disabled={settings.fontSize >= 24}
                        title="Increase Font Size (Ctrl + +)"
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-slate-700 transition flex items-center"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>

                    {/* Settings Popover Trigger */}
                    <div className="relative" ref={popoverRef}>
                        <button
                            type="button"
                            onClick={() => setShowSettingsPopover(!showSettingsPopover)}
                            title="Editor Settings"
                            className={`p-1.5 rounded-lg border transition ${
                                showSettingsPopover
                                    ? 'bg-indigo-600 text-white border-indigo-500'
                                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                        >
                            <Settings className="w-3.5 h-3.5" />
                        </button>

                        {/* Settings Dropdown Popover */}
                        {showSettingsPopover && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 text-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                                    <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                                        <Settings className="w-3.5 h-3.5 text-indigo-400" /> Editor Preferences
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={resetSettings}
                                        title="Reset to default settings"
                                        className="text-[10px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Reset
                                    </button>
                                </div>

                                {/* Theme Selector */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                                        <Palette className="w-3.5 h-3.5 text-indigo-400" /> Color Theme
                                    </label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {[
                                            { id: 'vs-dark', label: 'Dark+', icon: Moon },
                                            { id: 'vs', label: 'Light', icon: Sun },
                                            { id: 'hc-black', label: 'High Contrast', icon: Palette }
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => updateSetting('theme', t.id)}
                                                className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium flex flex-col items-center gap-1 transition ${
                                                    settings.theme === t.id
                                                        ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500'
                                                        : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200'
                                                }`}
                                            >
                                                <t.icon className="w-3 h-3" />
                                                <span className="text-[10px]">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Word Wrap Option */}
                                <div className="flex items-center justify-between py-1 border-t border-slate-800/80 pt-2">
                                    <span className="text-xs text-slate-300">Word Wrap</span>
                                    <button
                                        type="button"
                                        onClick={toggleWordWrap}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                                            settings.wordWrap === 'on'
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                                : 'bg-slate-800 text-slate-400 border-slate-700'
                                        }`}
                                    >
                                        {settings.wordWrap === 'on' ? 'Enabled' : 'Disabled'}
                                    </button>
                                </div>

                                {/* Tab Size Option */}
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-xs text-slate-300">Tab Indentation</span>
                                    <div className="flex items-center gap-1">
                                        {[2, 4].map(size => (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => updateSetting('tabSize', size)}
                                                className={`px-2 py-0.5 rounded text-xs font-mono border transition ${
                                                    settings.tabSize === size
                                                        ? 'bg-indigo-600 text-white border-indigo-500'
                                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                                }`}
                                            >
                                                {size} spaces
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Minimap Option */}
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-xs text-slate-300">Code Minimap</span>
                                    <button
                                        type="button"
                                        onClick={() => updateSetting('minimap', !settings.minimap)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
                                            settings.minimap
                                                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                                                : 'bg-slate-800 text-slate-400 border-slate-700'
                                        }`}
                                    >
                                        {settings.minimap ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                        {settings.minimap ? 'Shown' : 'Hidden'}
                                    </button>
                                </div>

                                {/* Line Numbers Option */}
                                <div className="flex items-center justify-between py-1 border-b border-slate-800/80 pb-2">
                                    <span className="text-xs text-slate-300">Line Numbers</span>
                                    <button
                                        type="button"
                                        onClick={() => updateSetting('lineNumbers', settings.lineNumbers === 'on' ? 'off' : 'on')}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                                            settings.lineNumbers === 'on'
                                                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                                                : 'bg-slate-800 text-slate-400 border-slate-700'
                                        }`}
                                    >
                                        {settings.lineNumbers === 'on' ? 'On' : 'Off'}
                                    </button>
                                </div>

                                <div className="text-[10px] text-slate-500 text-center">
                                    Preferences are automatically saved to your browser.
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Extra toolbar items passed from parent (e.g. Run button, Reset code) */}
                    {extraToolbarRight}
                </div>
            </div>

            {/* Monaco Editor Container */}
            <div className="flex-1 w-full h-full relative overflow-hidden">
                <Editor
                    height={height}
                    language={language}
                    theme={settings.theme}
                    value={value}
                    onChange={onChange}
                    onMount={onMount}
                    options={editorOptions}
                />
            </div>
        </div>
    );
}
