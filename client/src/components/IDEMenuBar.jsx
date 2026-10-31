'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    FileCode,
    FolderOpen,
    Save,
    Download,
    Play,
    Settings,
    Edit3,
    Trash2,
    RotateCcw,
    Database,
    Zap,
    CheckCircle2,
    UserCheck,
    ChevronDown,
    Plus,
    X,
    Check,
    Sparkles,
    FileText,
    HelpCircle,
    Info,
    Shapes,
    Star
} from 'lucide-react';

/**
 * Desktop-Grade Top Menu Bar for Practice Studio IDE
 * Features: File, Edit, View, Run, Autosave indicator, Student Inspection
 */
export default function IDEMenuBar({
    activeTab,
    onNewTab,
    onOpenFromDocuments,
    onSaveToDocuments,
    onSaveAs,
    onDownload,
    onExportDiagram,
    onRunCode,
    onClearOutput,
    onResetDatabase,
    onFormatCode,
    onInsertDocstringHeader,
    onClearCode,
    isAutosaveEnabled,
    onToggleAutosave,
    editorTheme,
    onSelectEditorTheme,
    outputThemeId,
    onSelectOutputTheme,
    fontSize,
    onFontSizeChange,
    isInstructorOrAdmin,
    studentsList = [],
    selectedStudentId,
    onSelectStudent,
    onCloseInspection,
    isInspecting,
    activeEngine = 'mysql',
    onOpenEngineModal,
    onOpenInspectorStudio,
    latestStudentReview,
    onOpenFeedbackDrawer
}) {
    const [openMenu, setOpenMenu] = useState(null); // 'file' | 'edit' | 'view' | 'run' | 'inspect' | null
    const menuRef = useRef(null);

    const isLightMode = outputThemeId === 'light' || editorTheme === 'vs' || editorTheme === 'light';

    // Dismiss dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleMenu = (name) => {
        setOpenMenu(openMenu === name ? null : name);
    };

    const handleAction = (callback) => {
        setOpenMenu(null);
        if (callback) callback();
    };

    const menuBtnClass = (menuName) =>
        `px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
            openMenu === menuName
                ? isLightMode
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'bg-slate-800 text-white'
                : isLightMode
                ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`;

    const dropdownClass = isLightMode
        ? 'absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-1 text-slate-800'
        : 'absolute left-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-1 text-slate-200';

    const itemBtnClass = isLightMode
        ? 'w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center justify-between text-xs cursor-pointer text-slate-700 hover:text-slate-900'
        : 'w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer text-slate-200 hover:text-white';

    const dividerClass = isLightMode ? 'my-1 border-t border-slate-200' : 'my-1 border-t border-slate-800';

    return (
        <div
            ref={menuRef}
            className={`flex flex-wrap items-center justify-between px-3 py-1 border-b text-xs select-none z-40 relative ${
                isLightMode
                    ? 'bg-white border-slate-200 text-slate-700'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
        >
            {/* Left Menus: File, Edit, View, Run */}
            <div className="flex items-center gap-1">
                {/* Brand / Logo Icon */}
                <div className={`flex items-center gap-1.5 pr-2 mr-1 border-r ${isLightMode ? 'border-slate-200' : 'border-slate-800'}`}>
                    <span className="font-extrabold bg-gradient-to-r from-amber-500 to-sky-500 bg-clip-text text-transparent text-xs tracking-wider font-mono">
                        PYTHON & SQL STUDIO
                    </span>
                </div>

                {/* FILE MENU */}
                <div className="relative">
                    <button onClick={() => toggleMenu('file')} className={menuBtnClass('file')}>
                        File
                    </button>
                    {openMenu === 'file' && (
                        <div className={`w-64 ${dropdownClass}`}>
                            <button
                                onClick={() => handleAction(() => onNewTab('python'))}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <Plus className="w-3.5 h-3.5 text-amber-500" />
                                    New Python Script (.py)
                                </span>
                                <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+N</kbd>
                            </button>

                            <button
                                onClick={() => handleAction(() => onNewTab('sql'))}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <Database className="w-3.5 h-3.5 text-sky-500" />
                                    New SQL Query (.sql)
                                </span>
                                <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+Alt+S</kbd>
                            </button>

                            <button
                                onClick={() => handleAction(onOpenFromDocuments)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                                    Open from Documents...
                                </span>
                                <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+O</kbd>
                            </button>

                            <div className={dividerClass} />

                            <button
                                onClick={() => handleAction(onSaveToDocuments)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <Save className="w-3.5 h-3.5 text-emerald-500" />
                                    Save to Documents
                                </span>
                                <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+S</kbd>
                            </button>

                            <button
                                onClick={() => handleAction(onSaveAs)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                                    Save As...
                                </span>
                                <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+Shift+S</kbd>
                            </button>

                            <div className={dividerClass} />

                            {/* Autosave Toggle */}
                            <button
                                onClick={() => handleAction(onToggleAutosave)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                                    Autosave
                                </span>
                                <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                        isAutosaveEnabled
                                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                            : isLightMode
                                            ? 'bg-slate-100 text-slate-500'
                                            : 'bg-slate-800 text-slate-400'
                                    }`}
                                >
                                    {isAutosaveEnabled ? 'ON' : 'OFF'}
                                </span>
                            </button>

                            <div className={dividerClass} />

                            <button
                                onClick={() => handleAction(onDownload)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <Download className="w-3.5 h-3.5 text-sky-500" />
                                    Download Code Script
                                </span>
                                <span className="text-[10px] text-slate-400">.{activeTab?.language === 'sql' ? 'sql' : 'py'}</span>
                            </button>

                            <button
                                onClick={() => handleAction(onExportDiagram)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <Shapes className="w-3.5 h-3.5 text-purple-500" />
                                    Export Flowchart (PNG)
                                </span>
                            </button>
                        </div>
                    )}
                </div>

                {/* EDIT MENU */}
                <div className="relative">
                    <button onClick={() => toggleMenu('edit')} className={menuBtnClass('edit')}>
                        Edit
                    </button>
                    {openMenu === 'edit' && (
                        <div className={`w-56 ${dropdownClass}`}>
                            <button
                                onClick={() => handleAction(onInsertDocstringHeader)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                    Insert Metadata Header
                                </span>
                            </button>

                            <button
                                onClick={() => handleAction(onFormatCode)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <Edit3 className="w-3.5 h-3.5 text-sky-500" />
                                    Format Document
                                </span>
                            </button>

                            <div className={dividerClass} />

                            <button
                                onClick={() => handleAction(onClearCode)}
                                className={`${itemBtnClass} text-rose-600 dark:text-rose-400`}
                            >
                                <span className="flex items-center gap-2">
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Clear Editor Code
                                </span>
                            </button>
                        </div>
                    )}
                </div>

                {/* VIEW MENU */}
                <div className="relative">
                    <button onClick={() => toggleMenu('view')} className={menuBtnClass('view')}>
                        View
                    </button>
                    {openMenu === 'view' && (
                        <div className={`w-60 p-1 ${dropdownClass}`}>
                            <p className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1">Editor Theme</p>
                            {[
                                { id: 'vs', label: 'Clean Light (Default)' },
                                { id: 'vs-dark', label: 'Dark Modern' },
                                { id: 'hc-black', label: 'High Contrast Black' }
                            ].map((th) => (
                                <button
                                    key={th.id}
                                    onClick={() => handleAction(() => onSelectEditorTheme(th.id))}
                                    className={itemBtnClass}
                                >
                                    <span>{th.label}</span>
                                    {editorTheme === th.id && <Check className="w-3.5 h-3.5 text-primary-500" />}
                                </button>
                            ))}

                            <div className={dividerClass} />

                            <p className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1">Output Screen Theme</p>
                            {[
                                { id: 'light', label: 'Paper White (Default)' },
                                { id: 'classic', label: 'Deep Slate' },
                                { id: 'matrix', label: 'Matrix Hacker Green' },
                                { id: 'cyberpunk', label: 'Cyberpunk Neon' },
                                { id: 'amber', label: 'Retro 80s Amber CRT' }
                            ].map((oth) => (
                                <button
                                    key={oth.id}
                                    onClick={() => handleAction(() => onSelectOutputTheme(oth.id))}
                                    className={itemBtnClass}
                                >
                                    <span>{oth.label}</span>
                                    {outputThemeId === oth.id && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                                </button>
                            ))}

                            <div className={dividerClass} />

                            <div className="px-3 py-1.5 flex items-center justify-between">
                                <span className="text-xs">Font Size</span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => onFontSizeChange(Math.max(11, fontSize - 1))}
                                        className={`px-1.5 py-0.5 rounded text-xs border ${
                                            isLightMode
                                                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                                                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                                        }`}
                                    >
                                        A-
                                    </button>
                                    <span className="font-mono text-xs px-1">{fontSize}px</span>
                                    <button
                                        onClick={() => onFontSizeChange(Math.min(22, fontSize + 1))}
                                        className={`px-1.5 py-0.5 rounded text-xs border ${
                                            isLightMode
                                                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                                                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                                        }`}
                                    >
                                        A+
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RUN MENU */}
                <div className="relative">
                    <button onClick={() => toggleMenu('run')} className={menuBtnClass('run')}>
                        Run
                    </button>
                    {openMenu === 'run' && (
                        <div className={`w-64 ${dropdownClass}`}>
                            <button
                                onClick={() => handleAction(onRunCode)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <Play className="w-3.5 h-3.5 text-emerald-500 fill-current" />
                                    Run Code
                                </span>
                                <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+Enter</kbd>
                            </button>

                            <button
                                onClick={() => handleAction(onClearOutput)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                                    Clear Active Output
                                </span>
                            </button>

                            {activeTab?.language === 'sql' && (
                                <>
                                    <div className={dividerClass} />
                                    <button
                                        onClick={() => handleAction(onResetDatabase)}
                                        className={`${itemBtnClass} text-rose-600 dark:text-rose-400`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Database className="w-3.5 h-3.5" />
                                            Reset Persistent SQLite DB
                                        </span>
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Autosave Toggle & Instructor Inspection Selector */}
            <div className="flex items-center gap-2.5">
                {/* Autosave Status Pill */}
                <div
                    onClick={onToggleAutosave}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer transition ${
                        isLightMode ? 'hover:bg-slate-100' : 'hover:bg-slate-800'
                    }`}
                    title={`Autosave is ${isAutosaveEnabled ? 'ENABLED' : 'DISABLED'}. Click to toggle.`}
                >
                    {isAutosaveEnabled ? (
                        <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Autosave: ON</span>
                        </>
                    ) : (
                        <>
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Autosave: OFF</span>
                        </>
                    )}
                </div>

                {/* SQL Engine Preselection Pill */}
                {isInstructorOrAdmin ? (
                    <button
                        onClick={onOpenEngineModal}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition cursor-pointer ${
                            isLightMode
                                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                        }`}
                        title="Configure and Preselect SQL Database Engine globally (MySQL or SQLite)"
                    >
                        <span>{activeEngine === 'mysql' ? '🐬' : '🗄️'}</span>
                        <span className="font-bold">
                            {activeEngine === 'mysql' ? 'MySQL 9.3' : 'SQLite 3'}
                        </span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                ) : (
                    <div
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            isLightMode
                                ? 'bg-slate-100 border-slate-200 text-slate-600'
                                : 'bg-slate-800/80 border-slate-700 text-slate-300'
                        }`}
                        title="Active SQL engine preselected by school administrator"
                    >
                        <span>{activeEngine === 'mysql' ? '🐬' : '🗄️'}</span>
                        <span>Engine: {activeEngine === 'mysql' ? 'MySQL' : 'SQLite'}</span>
                    </div>
                )}

                {/* Student Feedback Badge (When review is available for current user) */}
                {latestStudentReview && (
                    <button
                        onClick={onOpenFeedbackDrawer}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition cursor-pointer animate-pulse"
                        title="Click to view instructor comments and code improvement suggestions"
                    >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>Review: {latestStudentReview.rating || 5}/5</span>
                    </button>
                )}

                {/* Instructor / Admin Inspection Studio Button */}
                {isInstructorOrAdmin && (
                    <div className="flex items-center gap-1.5">
                        {isInspecting ? (
                            <button
                                onClick={onCloseInspection}
                                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer"
                                title="Click to return to your personal workspace"
                            >
                                <span>Inspecting Student</span>
                                <X className="w-3 h-3" />
                            </button>
                        ) : null}

                        <button
                            onClick={onOpenInspectorStudio}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                isLightMode
                                    ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-300 text-amber-900'
                                    : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300'
                            }`}
                            title="Open convenient Student Coding Work Inspection Studio & AI Reviews"
                        >
                            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                            <span>Inspect Student Work</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
