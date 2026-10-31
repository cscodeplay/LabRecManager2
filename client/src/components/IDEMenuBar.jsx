'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    FileCode,
    FolderOpen,
    Save,
    Download,
    Play,
    RotateCcw,
    Trash2,
    Copy,
    Scissors,
    Edit3,
    FileText,
    Palette,
    Sun,
    Moon,
    Eye,
    ZoomIn,
    ZoomOut,
    Check,
    CheckCircle2,
    Sparkles,
    Database,
    HelpCircle,
    UserCheck,
    ChevronDown,
    Sliders,
    Layers,
    Shapes,
    Plus,
    X,
    FileSpreadsheet,
    Zap,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';

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
    isInspecting
}) {
    const [openMenu, setOpenMenu] = useState(null); // 'file' | 'edit' | 'view' | 'run' | 'inspect' | null
    const menuRef = useRef(null);

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

    return (
        <div
            ref={menuRef}
            className="flex flex-wrap items-center justify-between px-3 py-1 bg-slate-900 border-b border-slate-800 text-xs text-slate-300 select-none z-40 relative"
        >
            {/* Left Menus: File, Edit, View, Run */}
            <div className="flex items-center gap-1">
                {/* Brand / Logo Icon */}
                <div className="flex items-center gap-1.5 pr-2 mr-1 border-r border-slate-800">
                    <span className="font-extrabold text-primary-400 text-xs tracking-wider font-mono">
                        STUDIO
                    </span>
                </div>

                {/* FILE MENU */}
                <div className="relative">
                    <button
                        onClick={() => toggleMenu('file')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                            openMenu === 'file'
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                    >
                        File
                    </button>
                    {openMenu === 'file' && (
                        <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-1 text-slate-200">
                            <button
                                onClick={() => handleAction(onNewTab)}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs"
                            >
                                <span className="flex items-center gap-2">
                                    <Plus className="w-3.5 h-3.5 text-primary-400" />
                                    New Script Tab
                                </span>
                                <kbd className="text-[10px] text-slate-500 font-mono">Ctrl+N</kbd>
                            </button>

                            <button
                                onClick={() => handleAction(onOpenFromDocuments)}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs"
                            >
                                <span className="flex items-center gap-2">
                                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                                    Open from Documents...
                                </span>
                                <kbd className="text-[10px] text-slate-500 font-mono">Ctrl+O</kbd>
                            </button>

                            <div className="my-1 border-t border-slate-800" />

                            <button
                                onClick={() => handleAction(onSaveToDocuments)}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs"
                            >
                                <span className="flex items-center gap-2">
                                    <Save className="w-3.5 h-3.5 text-emerald-400" />
                                    Save to Documents
                                </span>
                                <kbd className="text-[10px] text-slate-500 font-mono">Ctrl+S</kbd>
                            </button>

                            <button
                                onClick={() => handleAction(onSaveAs)}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs"
                            >
                                <span className="flex items-center gap-2">
                                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                                    Save As...
                                </span>
                                <kbd className="text-[10px] text-slate-500 font-mono">Ctrl+Shift+S</kbd>
                            </button>

                            <div className="my-1 border-t border-slate-800" />

                            {/* Autosave Toggle */}
                            <button
                                onClick={() => handleAction(onToggleAutosave)}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs"
                            >
                                <span className="flex items-center gap-2">
                                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                                    Autosave
                                </span>
                                <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                        isAutosaveEnabled
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-slate-800 text-slate-400'
                                    }`}
                                >
                                    {isAutosaveEnabled ? 'ON' : 'OFF'}
                                </span>
                            </button>

                            <div className="my-1 border-t border-slate-800" />

                            <button
                                onClick={() => handleAction(onDownload)}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs"
                            >
                                <span className="flex items-center gap-2">
                                    <Download className="w-3.5 h-3.5 text-sky-400" />
                                    Download Code Script
                                </span>
                                <span className="text-[10px] text-slate-500">.{activeTab?.language === 'sql' ? 'sql' : 'py'}</span>
                            </button>

                            <button
                                onClick={() => handleAction(onExportDiagram)}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs"
                            >
                                <span className="flex items-center gap-2">
                                    <Shapes className="w-3.5 h-3.5 text-purple-400" />
                                    Export Flowchart (PNG)
                                </span>
                            </button>
                        </div>
                    )}
                </div>

                {/* EDIT MENU */}
                <div className="relative">
                    <button
                        onClick={() => toggleMenu('edit')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                            openMenu === 'edit'
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                    >
                        Edit
                    </button>
                    {openMenu === 'edit' && (
                        <div className="absolute left-0 top-full mt-1 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-1 text-slate-200">
                            <button
                                onClick={() => handleAction(onInsertDocstringHeader)}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-xs"
                            >
                                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Insert Metadata Header</span>
                            </button>

                            <button
                                onClick={() => handleAction(onFormatCode)}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-xs"
                            >
                                <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                                <span>Format Document</span>
                            </button>

                            <div className="my-1 border-t border-slate-800" />

                            <button
                                onClick={() => handleAction(onClearCode)}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-xs text-rose-400"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Clear Editor Code</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* VIEW MENU */}
                <div className="relative">
                    <button
                        onClick={() => toggleMenu('view')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                            openMenu === 'view'
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                    >
                        View
                    </button>
                    {openMenu === 'view' && (
                        <div className="absolute left-0 top-full mt-1 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 text-slate-200">
                            <p className="text-[10px] uppercase font-bold text-slate-500 px-3 py-1">Editor Theme</p>
                            {[
                                { id: 'vs-dark', label: 'Dark Modern (Default)' },
                                { id: 'vs', label: 'Clean Light' },
                                { id: 'hc-black', label: 'High Contrast Black' }
                            ].map((th) => (
                                <button
                                    key={th.id}
                                    onClick={() => handleAction(() => onSelectEditorTheme(th.id))}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs"
                                >
                                    <span>{th.label}</span>
                                    {editorTheme === th.id && <Check className="w-3.5 h-3.5 text-primary-400" />}
                                </button>
                            ))}

                            <div className="my-1 border-t border-slate-800" />

                            <p className="text-[10px] uppercase font-bold text-slate-500 px-3 py-1">Output Screen Theme</p>
                            {[
                                { id: 'classic', label: 'Deep Slate' },
                                { id: 'matrix', label: 'Matrix Hacker Green' },
                                { id: 'cyberpunk', label: 'Cyberpunk Neon' },
                                { id: 'amber', label: 'Retro 80s Amber CRT' },
                                { id: 'light', label: 'Paper White' }
                            ].map((oth) => (
                                <button
                                    key={oth.id}
                                    onClick={() => handleAction(() => onSelectOutputTheme(oth.id))}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs"
                                >
                                    <span>{oth.label}</span>
                                    {outputThemeId === oth.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                </button>
                            ))}

                            <div className="my-1 border-t border-slate-800" />

                            <div className="px-3 py-1.5 flex items-center justify-between">
                                <span className="text-xs">Font Size</span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => onFontSizeChange(Math.max(11, fontSize - 1))}
                                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-xs"
                                    >
                                        A-
                                    </button>
                                    <span className="font-mono text-xs px-1">{fontSize}px</span>
                                    <button
                                        onClick={() => onFontSizeChange(Math.min(22, fontSize + 1))}
                                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-xs"
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
                    <button
                        onClick={() => toggleMenu('run')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                            openMenu === 'run'
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                    >
                        Run
                    </button>
                    {openMenu === 'run' && (
                        <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-1 text-slate-200">
                            <button
                                onClick={() => handleAction(onRunCode)}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs"
                            >
                                <span className="flex items-center gap-2">
                                    <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                                    Run Code
                                </span>
                                <kbd className="text-[10px] text-slate-500 font-mono">Ctrl+Enter</kbd>
                            </button>

                            <button
                                onClick={() => handleAction(onClearOutput)}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-xs"
                            >
                                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                                <span>Clear Active Output</span>
                            </button>

                            {activeTab?.language === 'sql' && (
                                <>
                                    <div className="my-1 border-t border-slate-800" />
                                    <button
                                        onClick={() => handleAction(onResetDatabase)}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-xs text-rose-400"
                                    >
                                        <Database className="w-3.5 h-3.5" />
                                        <span>Reset Persistent SQLite DB</span>
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
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer hover:bg-slate-800 transition"
                    title={`Autosave is ${isAutosaveEnabled ? 'ENABLED' : 'DISABLED'}. Click to toggle.`}
                >
                    {isAutosaveEnabled ? (
                        <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span className="text-[11px] text-emerald-400 font-medium">Autosave: ON</span>
                        </>
                    ) : (
                        <>
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-[11px] text-amber-400 font-medium">Autosave: OFF</span>
                        </>
                    )}
                </div>

                {/* Instructor / Admin Student Inspection Dropdown */}
                {isInstructorOrAdmin && (
                    <div className="relative">
                        <button
                            onClick={() => toggleMenu('inspect')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition ${
                                isInspecting
                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                            }`}
                        >
                            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                            <span>
                                {isInspecting ? 'Inspecting Student' : 'Inspect Student Work'}
                            </span>
                            <ChevronDown className="w-3 h-3" />
                        </button>

                        {openMenu === 'inspect' && (
                            <div className="absolute right-0 top-full mt-1 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1 text-slate-200">
                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-1.5">
                                    <span className="text-[10px] uppercase font-bold text-amber-400">
                                        Student Practice Audits
                                    </span>
                                    {isInspecting && (
                                        <button
                                            onClick={() => handleAction(onCloseInspection)}
                                            className="text-[10px] text-primary-400 hover:underline"
                                        >
                                            Return to My Studio
                                        </button>
                                    )}
                                </div>

                                <div className="max-h-60 overflow-y-auto space-y-1">
                                    <button
                                        onClick={() => handleAction(onCloseInspection)}
                                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between ${
                                            !selectedStudentId
                                                ? 'bg-primary-600/30 text-primary-300 font-bold'
                                                : 'text-slate-300 hover:bg-slate-800'
                                        }`}
                                    >
                                        <span>My Workspace (Instructor)</span>
                                        {!selectedStudentId && <Check className="w-3.5 h-3.5 text-primary-400" />}
                                    </button>

                                    {studentsList.map((st) => (
                                        <button
                                            key={st.id}
                                            onClick={() => handleAction(() => onSelectStudent(st.id))}
                                            className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between ${
                                                selectedStudentId === st.id
                                                    ? 'bg-amber-600/30 text-amber-300 font-bold'
                                                    : 'text-slate-300 hover:bg-slate-800'
                                            }`}
                                        >
                                            <div className="truncate">
                                                <p className="font-medium text-slate-200">{st.name}</p>
                                                <p className="text-[10px] text-slate-400 font-mono">
                                                    {st.admissionNumber} • {st.className}
                                                </p>
                                            </div>
                                            {selectedStudentId === st.id && (
                                                <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
