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
    Star,
    Undo2,
    Redo2,
    Search,
    Maximize2,
    Minimize2,
    WrapText,
    ListOrdered,
    Code2
} from 'lucide-react';

const CODE_SNIPPETS_LIST = {
    python: [
        { label: 'File I/O (Read & Write Sample)', code: '# File Input & Output Sample\nfilename = "practice_records.txt"\n\n# 1. Writing to a file\nwith open(filename, "w", encoding="utf-8") as f:\n    f.write("Roll,Name,Score\\n")\n    f.write("101,Aarav Sharma,92.5\\n")\n    f.write("102,Priya Patel,88.0\\n")\n    f.write("103,Rohan Verma,79.5\\n")\nprint(f"Created \'{filename}\' successfully!\\n")\n\n# 2. Reading and processing the file\nprint("Reading file contents:")\nwith open(filename, "r", encoding="utf-8") as f:\n    header = f.readline().strip()\n    print("Header:", header)\n    for line in f:\n        roll, name, score = line.strip().split(",")\n        print(f"Student #{roll}: {name} -> {score}%")' },
        { label: 'Database I/O (SQLite / DB Connect)', code: '# Database I/O Sample in Python (SQLite / Practice DB)\nimport sqlite3\n\n# Connect to the local practice database in workspace\nconn = sqlite3.connect("practice.sqlite")\ncursor = conn.cursor()\n\n# 1. Create Table\ncursor.execute("""\nCREATE TABLE IF NOT EXISTS students (\n    id INTEGER PRIMARY KEY,\n    name TEXT NOT NULL,\n    marks REAL\n)\n""")\n\n# 2. Insert Records\ncursor.executemany("INSERT OR REPLACE INTO students VALUES (?, ?, ?)", [\n    (1, "Aarav Sharma", 95.0),\n    (2, "Priya Patel", 89.5),\n    (3, "Rohan Verma", 78.0)\n])\nconn.commit()\n\n# 3. Query Records\ncursor.execute("SELECT id, name, marks FROM students ORDER BY marks DESC")\nrows = cursor.fetchall()\n\nprint(f"{\'ID\':<4} {\'Name\':<16} {\'Marks\':<6}")\nprint("-" * 30)\nfor r in rows:\n    print(f"{r[0]:<4} {r[1]:<16} {r[2]:<6.1f}")\n\nconn.close()' },
        { label: 'Multi-Value Input (Space/Tab)', code: '# Reading Multiple Values (Space or Tab Separated)\nprint("Enter values separated by spaces or tabs:")\ntry:\n    values = input().split()\n    print("Tokens received:", values)\n    nums = [float(v) for v in values if v.replace(\'.\', \'\', 1).isdigit()]\n    if nums:\n        print("Count:", len(nums))\n        print("Sum:", sum(nums))\n        print("Average:", sum(nums) / len(nums))\nexcept EOFError:\n    print("No input provided via stdin.")' },
        { label: 'For Loop (Range)', code: 'for i in range(1, 11):\n    print(f"Number: {i}")' },
        { label: 'While Loop', code: 'count = 0\nwhile count < 5:\n    print("Iteration:", count)\n    count += 1' },
        { label: 'If - Elif - Else', code: 'score = 85\nif score >= 90:\n    print("Grade A")\nelif score >= 75:\n    print("Grade B")\nelse:\n    print("Grade C")' },
        { label: 'Function Definition', code: 'def calculate_area(length, width):\n    """Calculates rectangular area"""\n    return length * width' },
        { label: 'Try - Except Handling', code: 'try:\n    val = int(input("Enter number: "))\n    print("Result:", 100 / val)\nexcept ZeroDivisionError:\n    print("Cannot divide by zero")\nexcept ValueError:\n    print("Invalid numeric input")' },
        { label: 'List Comprehension', code: 'even_squares = [x**2 for x in range(1, 11) if x % 2 == 0]\nprint(even_squares)' }
    ],
    sql: [
        { label: 'SELECT with WHERE', code: 'SELECT id, name, department\nFROM students\nWHERE department = \'Computer Science\'\nORDER BY name ASC;' },
        { label: 'CREATE TABLE (PK & Constraints)', code: 'CREATE TABLE students (\n    id INTEGER PRIMARY KEY,\n    name VARCHAR(100) NOT NULL,\n    email VARCHAR(100) UNIQUE,\n    marks DECIMAL(5, 2) DEFAULT 0.0\n);' },
        { label: 'INSERT INTO', code: 'INSERT INTO students (id, name, email, marks)\nVALUES (101, \'Aarav Sharma\', \'aarav@school.edu\', 88.5);' },
        { label: 'INNER JOIN Query', code: 'SELECT s.id, s.name, e.course_name, e.grade\nFROM students s\nINNER JOIN enrollments e ON s.id = e.student_id;' },
        { label: 'GROUP BY & HAVING', code: 'SELECT department, COUNT(*) AS student_count, AVG(marks) AS avg_marks\nFROM students\nGROUP BY department\nHAVING COUNT(*) >= 2;' },
        { label: 'UPDATE Records', code: 'UPDATE students\nSET marks = marks + 5\nWHERE department = \'Computer Science\';' },
        { label: 'DELETE Records', code: 'DELETE FROM students\nWHERE marks < 35.0;' }
    ]
};

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
    onOpenFeedbackDrawer,
    lastAutosavedAt = null,
    autosaveStatus = 'saved',
    onUndo,
    onRedo,
    onFind,
    onInsertSnippet,
    isWordWrapOn = true,
    onToggleWordWrap,
    isLineNumbersOn = true,
    onToggleLineNumbers,
    isMinimapOn = false,
    onToggleMinimap,
    isEditorMaximized = false,
    onToggleEditorMaximize
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
        ? 'absolute left-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 z-[100] animate-in fade-in slide-in-from-top-1 text-slate-800'
        : 'absolute left-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-[100] animate-in fade-in slide-in-from-top-1 text-slate-200';

    const itemBtnClass = isLightMode
        ? 'w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center justify-between text-xs cursor-pointer text-slate-700 hover:text-slate-900'
        : 'w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer text-slate-200 hover:text-white';

    const dividerClass = isLightMode ? 'my-1 border-t border-slate-200' : 'my-1 border-t border-slate-800';

    return (
        <div
            ref={menuRef}
            className={`flex items-center justify-between px-2 sm:px-3 py-1 border-b text-xs select-none z-40 relative flex-nowrap w-full max-w-full overflow-visible ${
                isLightMode
                    ? 'bg-white border-slate-200 text-slate-700'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
        >
            {/* Left Menus: File, Edit, View, Run */}
            <div className="flex items-center gap-1">
                {/* Brand / Logo Icon */}
                <div className={`flex items-center gap-1.5 pr-1.5 sm:pr-2 mr-1 border-r ${isLightMode ? 'border-slate-200' : 'border-slate-800'}`}>
                    <span className="font-extrabold bg-gradient-to-r from-amber-500 to-sky-500 bg-clip-text text-transparent text-xs tracking-wider font-mono">
                        <span className="hidden md:inline">PYTHON & SQL </span>STUDIO
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
                        <div className={`w-60 ${dropdownClass}`}>
                            <button
                                onClick={() => handleAction(onUndo)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <Undo2 className="w-3.5 h-3.5 text-amber-500" />
                                    Undo
                                </span>
                                <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+Z</kbd>
                            </button>

                            <button
                                onClick={() => handleAction(onRedo)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <Redo2 className="w-3.5 h-3.5 text-amber-500" />
                                    Redo
                                </span>
                                <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+Y</kbd>
                            </button>

                            <div className={dividerClass} />

                            <button
                                onClick={() => handleAction(onFind)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <Search className="w-3.5 h-3.5 text-sky-500" />
                                    Find & Replace
                                </span>
                                <kbd className="text-[10px] text-slate-400 font-mono">Ctrl+F</kbd>
                            </button>

                            <button
                                onClick={() => handleAction(onFormatCode)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                                    Format Document
                                </span>
                                <kbd className="text-[10px] text-slate-400 font-mono">Shift+Alt+F</kbd>
                            </button>

                            <button
                                onClick={() => handleAction(onInsertDocstringHeader)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5 text-purple-500" />
                                    Insert Metadata Header
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

                {/* SNIPPETS MENU */}
                <div className="relative">
                    <button onClick={() => toggleMenu('snippets')} className={menuBtnClass('snippets')}>
                        Snippets
                    </button>
                    {openMenu === 'snippets' && (
                        <div className={`w-72 max-h-[75vh] overflow-y-auto p-1.5 ${dropdownClass}`}>
                            <p className="text-[10px] uppercase font-bold text-amber-500 px-3 py-1 flex items-center justify-between">
                                <span>Python Snippets</span>
                                <span className="font-mono text-[9px] bg-amber-500/10 px-1.5 py-0.2 rounded text-amber-500 font-bold">.py</span>
                            </p>
                            {CODE_SNIPPETS_LIST.python.map((snip, idx) => (
                                <button
                                    key={`py-${idx}`}
                                    onClick={() => handleAction(() => onInsertSnippet && onInsertSnippet(snip, 'python'))}
                                    className={itemBtnClass}
                                >
                                    <span className="flex items-center gap-2 truncate">
                                        <FileCode className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                        <span className="truncate">{snip.label}</span>
                                    </span>
                                </button>
                            ))}

                            <div className={dividerClass} />

                            <p className="text-[10px] uppercase font-bold text-sky-500 px-3 py-1 flex items-center justify-between">
                                <span>SQL Snippets</span>
                                <span className="font-mono text-[9px] bg-sky-500/10 px-1.5 py-0.2 rounded text-sky-500 font-bold">.sql</span>
                            </p>
                            {CODE_SNIPPETS_LIST.sql.map((snip, idx) => (
                                <button
                                    key={`sql-${idx}`}
                                    onClick={() => handleAction(() => onInsertSnippet && onInsertSnippet(snip, 'sql'))}
                                    className={itemBtnClass}
                                >
                                    <span className="flex items-center gap-2 truncate">
                                        <Database className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                        <span className="truncate">{snip.label}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* VIEW MENU */}
                <div className="relative">
                    <button onClick={() => toggleMenu('view')} className={menuBtnClass('view')}>
                        View
                    </button>
                    {openMenu === 'view' && (
                        <div className={`w-64 p-1 ${dropdownClass}`}>
                            <p className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1">Editor Layout</p>
                            <button
                                onClick={() => handleAction(onToggleEditorMaximize)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    {isEditorMaximized ? (
                                        <Minimize2 className="w-3.5 h-3.5 text-primary-500" />
                                    ) : (
                                        <Maximize2 className="w-3.5 h-3.5 text-primary-500" />
                                    )}
                                    {isEditorMaximized ? 'Restore Split Screen' : 'Maximize Code Editor'}
                                </span>
                                {isEditorMaximized && <Check className="w-3.5 h-3.5 text-primary-500" />}
                            </button>

                            <button
                                onClick={() => handleAction(onToggleWordWrap)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <WrapText className="w-3.5 h-3.5 text-sky-500" />
                                    Word Wrap
                                </span>
                                {isWordWrapOn && <Check className="w-3.5 h-3.5 text-sky-500" />}
                            </button>

                            <button
                                onClick={() => handleAction(onToggleLineNumbers)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <ListOrdered className="w-3.5 h-3.5 text-indigo-500" />
                                    Line Numbers
                                </span>
                                {isLineNumbersOn && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                            </button>

                            <button
                                onClick={() => handleAction(onToggleMinimap)}
                                className={itemBtnClass}
                            >
                                <span className="flex items-center gap-2">
                                    <Shapes className="w-3.5 h-3.5 text-purple-500" />
                                    Code Minimap
                                </span>
                                {isMinimapOn && <Check className="w-3.5 h-3.5 text-purple-500" />}
                            </button>

                            <div className={dividerClass} />

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
                                            Reset Persistent MySQL Sandbox
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
                {/* Autosave Status Pill (Global toggle; timestamp tracked on individual file level) */}
                <div
                    onClick={onToggleAutosave}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer transition ${
                        isLightMode ? 'hover:bg-slate-100' : 'hover:bg-slate-800'
                    }`}
                    title={
                        isAutosaveEnabled
                            ? 'Autosave is ON (per-file automatic saving enabled). Click to disable.'
                            : 'Autosave is OFF. Click to enable.'
                    }
                >
                    {isAutosaveEnabled ? (
                        <>
                            {autosaveStatus === 'saving' ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                    <span className="hidden md:inline text-[11px] text-emerald-500 font-bold">Saving...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="hidden md:inline text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                                        Autosave: ON
                                    </span>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="hidden md:inline text-[11px] text-amber-600 dark:text-amber-400 font-medium">Autosave: OFF</span>
                        </>
                    )}
                </div>

                {/* SQL Engine Preselection Pill */}
                <button
                    onClick={onOpenEngineModal}
                    className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded text-xs font-semibold border transition cursor-pointer ${
                        isLightMode
                            ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                    }`}
                    title="Active SQL Engine (MySQL 9.3+ / TiDB Cloud) - Click to view connection status"
                >
                    <span>🐬</span>
                    <span className="font-bold hidden sm:inline">
                        MySQL 9.3
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
                </button>

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
                                <span className="hidden md:inline">Inspecting Student</span>
                                <X className="w-3 h-3" />
                            </button>
                        ) : null}

                        <button
                            onClick={onOpenInspectorStudio}
                            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                isLightMode
                                    ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-300 text-amber-900'
                                    : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300'
                            }`}
                            title="Open convenient Student Coding Work Inspection Studio & AI Reviews"
                        >
                            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                            <span className="hidden md:inline">Inspect Student Work</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
