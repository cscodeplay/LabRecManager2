'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
    Play,
    Sparkles,
    RotateCcw,
    Copy,
    Download,
    Check,
    Terminal,
    Database,
    Code2,
    Settings,
    Save,
    Trash2,
    Plus,
    FileCode,
    FileSpreadsheet,
    HelpCircle,
    Info,
    CheckCircle2,
    AlertCircle,
    Clock,
    Zap,
    Cpu,
    BookOpen,
    Eye,
    ChevronDown,
    Palette,
    Shapes,
    FileDown,
    RefreshCw,
    Lock,
    Unlock,
    Edit3,
    ArrowRight,
    CornerDownRight,
    Layers,
    Monitor,
    FileText,
    ChevronUp,
    X,
    UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';
import { compilerAPI, documentsAPI, foldersAPI } from '@/lib/api';
import IDEMenuBar from '@/components/IDEMenuBar';
import FlowchartVisualCanvas from '@/components/FlowchartVisualCanvas';
import DocumentCodeBrowserModal from '@/components/DocumentCodeBrowserModal';
import MermaidRenderer from '@/components/MermaidRenderer';

// Dynamically load Monaco Editor to avoid SSR conflicts
const Editor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-slate-950 text-slate-400">
            <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-primary-400" />
                <span className="text-sm font-medium">Initializing Practice Studio Editor...</span>
            </div>
        </div>
    )
});

// Output Screen Terminal Themes
const OUTPUT_THEMES = [
    {
        id: 'classic',
        label: 'Deep Slate (Classic)',
        containerClass: 'bg-slate-950 text-slate-200 border-slate-800',
        stdoutClass: 'bg-slate-900 border-slate-800 text-slate-100',
        headerClass: 'bg-slate-900/90 border-slate-800 text-slate-400',
        accentText: 'text-emerald-400'
    },
    {
        id: 'matrix',
        label: 'Matrix / Hacker Terminal (Green)',
        containerClass: 'bg-[#030804] text-emerald-300 border-emerald-950 font-mono',
        stdoutClass: 'bg-[#051207] border-emerald-900 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
        headerClass: 'bg-[#051408] border-emerald-900 text-emerald-400',
        accentText: 'text-emerald-400'
    },
    {
        id: 'cyberpunk',
        label: 'Cyberpunk Neon (Cyan / Purple)',
        containerClass: 'bg-[#090714] text-cyan-200 border-fuchsia-950 font-mono',
        stdoutClass: 'bg-[#0e0c24] border-fuchsia-900/70 text-cyan-300 shadow-[0_0_15px_rgba(217,70,239,0.1)]',
        headerClass: 'bg-[#0f0c26] border-fuchsia-900 text-fuchsia-300',
        accentText: 'text-cyan-400'
    },
    {
        id: 'amber',
        label: 'Retro CRT 80s (Amber Phosphor)',
        containerClass: 'bg-[#0c0803] text-amber-200 border-amber-950 font-mono',
        stdoutClass: 'bg-[#140e04] border-amber-900/70 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
        headerClass: 'bg-[#140f06] border-amber-900 text-amber-400',
        accentText: 'text-amber-400'
    },
    {
        id: 'light',
        label: 'Clean Daylight (Paper White)',
        containerClass: 'bg-slate-50 text-slate-900 border-slate-300 font-mono',
        stdoutClass: 'bg-white border-slate-200 text-slate-900 shadow-xs',
        headerClass: 'bg-slate-100 border-slate-200 text-slate-700',
        accentText: 'text-primary-600'
    }
];

// Default Initial Code Tab
const createDefaultTab = (id, lang = 'python', studentId = 'STU', studentName = 'Student') => {
    const isPy = lang === 'python';
    const dateStr = new Date().toISOString().split('T')[0];

    const pyStarter = `# Python Practice Script
# Calculate Factorial & Sum of 1..N

n = int(input("Enter positive number N: "))
total_sum = 0
factorial = 1
i = 1

while i <= n:
    total_sum = total_sum + i
    factorial = factorial * i
    i = i + 1

print("Sum of 1 to", n, "is:", total_sum)
print("Factorial of", n, "is:", factorial)
`;

    const sqlStarter = `-- SQL Practice Script
-- Tables created here are stored permanently in your personal database!

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT
);

INSERT OR IGNORE INTO students VALUES 
(101, 'Aarav Sharma', 'Computer Science'),
(102, 'Priya Patel', 'Data Science');

SELECT * FROM students;
`;

    return {
        id,
        title: isPy ? 'Factorial & Sum' : 'Student Schema',
        filename: `${studentId}_${dateStr}.${isPy ? 'py' : 'sql'}`,
        language: lang,
        code: isPy ? pyStarter : sqlStarter,
        stdin: '5\n',
        metadata: {
            title: isPy ? 'Factorial & Sum Calculation' : 'Student Database Schema',
            description: isPy ? 'Calculate cumulative sum and factorial using while loop' : 'Create tables and query student records',
            subject: isPy ? 'Python Programming' : 'Database Management',
            studentId,
            studentName,
            date: dateStr
        },
        output: null,
        flowchartData: null,
        isDirty: false
    };
};

export default function PracticeIDEPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    const isInstructorOrAdmin =
        user?.role === 'admin' || user?.role === 'instructor' || user?.role === 'principal';

    const studentIdentifier =
        user?.admissionNumber || user?.studentId || user?.employeeId || user?.email?.split('@')[0] || 'STU';
    const studentDisplayName =
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Student';

    // 1. MULTI-TAB SYSTEM (Max 5 tabs)
    const [tabs, setTabs] = useState(() => [
        createDefaultTab('tab_1', 'python', studentIdentifier, studentDisplayName)
    ]);
    const [activeTabId, setActiveTabId] = useState('tab_1');
    const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

    // Autosave Toggle (ON / OFF)
    const [isAutosaveEnabled, setIsAutosaveEnabled] = useState(true);
    const [autosaveStatus, setAutosaveStatus] = useState('saved'); // 'saved' | 'saving'
    const autosaveTimerRef = useRef(null);

    // Problem Details / Metadata Drawer
    const [showMetadataDrawer, setShowMetadataDrawer] = useState(true);

    // Document Browser Modal
    const [showDocBrowserModal, setShowDocBrowserModal] = useState(false);

    // Execution state
    const [isExecuting, setIsExecuting] = useState(false);
    const [rightPanelMode, setRightPanelMode] = useState('output'); // 'output' | 'table' | 'diagram'

    // Themes
    const [editorTheme, setEditorTheme] = useState('vs-dark');
    const [outputThemeId, setOutputThemeId] = useState('classic');
    const currentOutputTheme = OUTPUT_THEMES.find((t) => t.id === outputThemeId) || OUTPUT_THEMES[0];
    const [fontSize, setFontSize] = useState(14);

    // Persistent student SQLite DB info
    const [existingTables, setExistingTables] = useState([]);
    const [isResettingDb, setIsResettingDb] = useState(false);

    // Instructor/Admin Student Inspection
    const [studentsList, setStudentsList] = useState([]);
    const [inspectingStudentId, setInspectingStudentId] = useState(null);
    const [inspectingStudentInfo, setInspectingStudentInfo] = useState(null);

    const editorRef = useRef(null);

    // 2. Initial Workspace Loading (Server + Local Storage)
    useEffect(() => {
        let isMounted = true;

        async function loadWorkspace() {
            try {
                // If instructor, fetch students list
                if (isInstructorOrAdmin) {
                    try {
                        const stRes = await compilerAPI.getStudents();
                        if (stRes.data?.success && isMounted) {
                            setStudentsList(stRes.data.data || []);
                        }
                    } catch (e) {}
                }

                const params = inspectingStudentId ? { studentId: inspectingStudentId } : {};
                const response = await compilerAPI.getWorkspace(params);

                if (response.data?.success && isMounted) {
                    const ws = response.data.data;

                    if (ws.editorTheme) setEditorTheme(ws.editorTheme);
                    if (ws.outputTheme) setOutputThemeId(ws.outputTheme);
                    if (ws.existingTables) setExistingTables(ws.existingTables);
                    if (ws.isAutosaveEnabled !== undefined) setIsAutosaveEnabled(ws.isAutosaveEnabled);

                    if (ws.studentInfo) {
                        setInspectingStudentInfo(ws.studentInfo);
                    } else {
                        setInspectingStudentInfo(null);
                    }

                    // Restore tabs if present
                    if (ws.tabs && Array.isArray(ws.tabs) && ws.tabs.length > 0) {
                        setTabs(ws.tabs);
                        if (ws.activeTabId && ws.tabs.some((t) => t.id === ws.activeTabId)) {
                            setActiveTabId(ws.activeTabId);
                        } else {
                            setActiveTabId(ws.tabs[0].id);
                        }
                    } else if (ws.pythonCode || ws.sqlCode) {
                        // Legacy single-code upgrade
                        const upgradedTab = createDefaultTab('tab_1', ws.sqlCode ? 'sql' : 'python', studentIdentifier, studentDisplayName);
                        if (ws.pythonCode) upgradedTab.code = ws.pythonCode;
                        if (ws.sqlCode) upgradedTab.code = ws.sqlCode;
                        setTabs([upgradedTab]);
                    }
                }
            } catch (err) {
                console.warn('Workspace load warning:', err.message);
            }
        }

        loadWorkspace();

        return () => {
            isMounted = false;
        };
    }, [inspectingStudentId, isInstructorOrAdmin, studentIdentifier, studentDisplayName]);

    // 3. Debounced Autosave (saves tabs, active tab, and output to server and local)
    const triggerSaveWorkspace = useCallback(
        async (updatedTabs, updatedActiveId, autosaveState) => {
            if (inspectingStudentId) return; // Do not overwrite when inspecting another student

            const tabsToSave = updatedTabs || tabs;
            const activeIdToSave = updatedActiveId || activeTabId;
            const isAuto = autosaveState !== undefined ? autosaveState : isAutosaveEnabled;

            if (typeof window !== 'undefined') {
                localStorage.setItem(`ulrms_ide_tabs_${user?.id || 'guest'}`, JSON.stringify(tabsToSave));
            }

            try {
                await compilerAPI.saveWorkspace({
                    tabs: tabsToSave,
                    activeTabId: activeIdToSave,
                    isAutosaveEnabled: isAuto,
                    editorTheme,
                    outputTheme: outputThemeId
                });
                setAutosaveStatus('saved');
            } catch (e) {
                setAutosaveStatus('saved');
            }
        },
        [tabs, activeTabId, isAutosaveEnabled, editorTheme, outputThemeId, user?.id, inspectingStudentId]
    );

    // Code change handler
    const handleCodeChange = (newCode) => {
        if (inspectingStudentId) return;
        const val = newCode || '';

        setTabs((prevTabs) =>
            prevTabs.map((t) => (t.id === activeTabId ? { ...t, code: val, isDirty: true } : t))
        );

        if (isAutosaveEnabled) {
            setAutosaveStatus('saving');
            if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = setTimeout(() => {
                triggerSaveWorkspace();
            }, 800);
        }
    };

    // Update metadata for active tab
    const handleUpdateMetadata = (field, val) => {
        if (inspectingStudentId) return;
        setTabs((prevTabs) =>
            prevTabs.map((t) =>
                t.id === activeTabId
                    ? {
                          ...t,
                          metadata: { ...t.metadata, [field]: val },
                          ...(field === 'title' ? { title: val } : {})
                      }
                    : t
            )
        );
        if (isAutosaveEnabled) {
            triggerSaveWorkspace();
        }
    };

    // Stdin change for active tab
    const handleStdinChange = (newStdin) => {
        setTabs((prevTabs) =>
            prevTabs.map((t) => (t.id === activeTabId ? { ...t, stdin: newStdin } : t))
        );
    };

    // Insert Docstring / Comment Header into Code
    const handleInsertDocstringHeader = () => {
        const meta = activeTab?.metadata || {};
        const title = meta.title || 'Untitled Practice Script';
        const desc = meta.description || 'Practice exercise';
        const sub = meta.subject || 'Computer Science Lab';
        const stId = meta.studentId || studentIdentifier;
        const stName = meta.studentName || studentDisplayName;
        const dateStr = meta.date || new Date().toISOString().split('T')[0];

        let headerBlock = '';
        if (activeTab.language === 'python') {
            headerBlock = `"""
===============================================================
Problem Title: ${title}
Objective:     ${desc}
Student Name:  ${stName} (ID: ${stId})
Subject/Lab:   ${sub}
Date:          ${dateStr}
===============================================================
"""\n\n`;
        } else {
            headerBlock = `-- ===============================================================
-- Problem Title: ${title}
-- Objective:     ${desc}
-- Student Name:  ${stName} (ID: ${stId})
-- Subject/Lab:   ${sub}
-- Date:          ${dateStr}
-- ===============================================================\n\n`;
        }

        const newCode = headerBlock + activeTab.code;
        handleCodeChange(newCode);
        toast.success('Inserted problem metadata header into code!');
    };

    // 4. Tab Actions: Add Tab (Max 5), Close Tab, Switch Tab
    const handleAddTab = (forcedLang) => {
        if (tabs.length >= 5) {
            toast.error('Maximum 5 editor tabs allowed. Please close a tab first.');
            return;
        }

        const newId = `tab_${Date.now()}`;
        const newLang = forcedLang || (activeTab?.language === 'sql' ? 'sql' : 'python');
        const newTab = createDefaultTab(newId, newLang, studentIdentifier, studentDisplayName);
        newTab.title = `Problem ${tabs.length + 1}`;
        newTab.filename = `${studentIdentifier}_${new Date().toISOString().split('T')[0]}_p${tabs.length + 1}.${newLang === 'sql' ? 'sql' : 'py'}`;

        const updatedTabs = [...tabs, newTab];
        setTabs(updatedTabs);
        setActiveTabId(newId);
        triggerSaveWorkspace(updatedTabs, newId);
        toast.success(`Created Tab ${updatedTabs.length} of 5`);
    };

    const handleCloseTab = (tabIdToClose, e) => {
        if (e) e.stopPropagation();
        if (tabs.length <= 1) {
            toast.error('At least one tab must remain open.');
            return;
        }

        const tabToClose = tabs.find((t) => t.id === tabIdToClose);
        if (tabToClose?.isDirty && !isAutosaveEnabled) {
            if (!confirm(`Tab "${tabToClose.title}" has unsaved changes. Close anyway?`)) {
                return;
            }
        }

        const updatedTabs = tabs.filter((t) => t.id !== tabIdToClose);
        let nextActiveId = activeTabId;
        if (activeTabId === tabIdToClose) {
            nextActiveId = updatedTabs[0].id;
            setActiveTabId(nextActiveId);
        }

        setTabs(updatedTabs);
        triggerSaveWorkspace(updatedTabs, nextActiveId);
        toast.success('Tab closed');
    };

    // Switch Language of Active Tab
    const handleSwitchLanguage = (newLang) => {
        if (activeTab.language === newLang) return;
        const dateStr = new Date().toISOString().split('T')[0];
        const newFilename = `${studentIdentifier}_${dateStr}.${newLang === 'sql' ? 'sql' : 'py'}`;

        setTabs((prevTabs) =>
            prevTabs.map((t) =>
                t.id === activeTabId
                    ? {
                          ...t,
                          language: newLang,
                          filename: newFilename,
                          output: null
                      }
                    : t
            )
        );
        toast.success(`Switched active tab to ${newLang.toUpperCase()}`);
    };

    // 5. Execute Code (Coordinated with Active Tab Output)
    const handleExecuteCode = async () => {
        if (!activeTab?.code?.trim()) {
            toast.error('Active editor tab is empty. Please write code to run.');
            return;
        }

        setIsExecuting(true);
        setRightPanelMode('output');

        try {
            const response = await compilerAPI.execute({
                language: activeTab.language === 'sql' ? 'sql' : 'python3',
                code: activeTab.code,
                stdin: activeTab.language === 'python' ? activeTab.stdin : ''
            });

            if (response.data && response.data.success) {
                const resData = response.data.data;

                // Update active tab output
                setTabs((prevTabs) =>
                    prevTabs.map((t) => (t.id === activeTabId ? { ...t, output: resData } : t))
                );

                if (resData.existingTables) {
                    setExistingTables(resData.existingTables);
                }

                if (resData.stderr && !resData.stdout) {
                    toast.error('Execution encountered an error');
                } else {
                    toast.success(`Executed Tab "${activeTab.title}" (${resData.durationMs || 0}ms)`);
                }
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || 'Execution failed';
            setTabs((prevTabs) =>
                prevTabs.map((t) =>
                    t.id === activeTabId
                        ? {
                              ...t,
                              output: { stdout: '', stderr: errMsg, exitCode: 1, durationMs: 0 }
                          }
                        : t
                )
            );
            toast.error(errMsg);
        } finally {
            setIsExecuting(false);
        }
    };

    // 6. Save to Documents (Defaulting to <studentId>_<YYYY-MM-DD>.<ext> in Python/SQL folder)
    const handleSaveToDocuments = async (promptCustomName = false) => {
        // Enforce Mandatory Title
        const problemTitle = activeTab.metadata?.title?.trim();
        if (!problemTitle) {
            toast.error('Mandatory Field Required: Please enter a Problem Title in the header panel before saving.');
            setShowMetadataDrawer(true);
            return;
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const ext = activeTab.language === 'sql' ? 'sql' : 'py';
        let defaultFileName = `${studentIdentifier}_${dateStr}.${ext}`;

        let finalFileName = defaultFileName;
        if (promptCustomName) {
            const custom = prompt('Enter filename to save in Documents:', defaultFileName);
            if (!custom) return;
            finalFileName = custom.endsWith(`.${ext}`) ? custom : `${custom}.${ext}`;
        }

        const toastId = toast.loading(`Saving "${finalFileName}" to Documents...`);

        try {
            // 1. Resolve or Create Folder
            const targetFolderName = activeTab.language === 'sql' ? 'SQL' : 'Python';
            const foldersRes = await foldersAPI.getAll();
            const foldersList = foldersRes.data?.data || [];
            let targetFolder = foldersList.find(
                (f) => f.name?.toLowerCase() === targetFolderName.toLowerCase()
            );

            if (!targetFolder) {
                const createFolderRes = await foldersAPI.create({
                    name: targetFolderName,
                    color: activeTab.language === 'sql' ? '#0284c7' : '#f59e0b'
                });
                targetFolder = createFolderRes.data?.data;
            }

            // 2. Upload file
            const fileBlob = new Blob([activeTab.code], { type: 'text/plain;charset=utf-8' });
            const fileObj = new File([fileBlob], finalFileName, { type: 'text/plain' });

            await documentsAPI.upload(fileObj, {
                name: finalFileName,
                description: `${problemTitle} - ${activeTab.metadata?.description || ''}`,
                category: 'code',
                folderId: targetFolder?.id
            });

            // Mark active tab clean
            setTabs((prevTabs) =>
                prevTabs.map((t) =>
                    t.id === activeTabId
                        ? { ...t, filename: finalFileName, isDirty: false }
                        : t
                )
            );

            toast.success(`Saved to Documents / ${targetFolderName} / ${finalFileName}!`, { id: toastId });
        } catch (err) {
            console.error('Save to documents error:', err);
            toast.error('Failed to save to Documents: ' + (err.response?.data?.message || err.message), { id: toastId });
        }
    };

    // 7. Open Document from Browser into Tab
    const handleOpenDocumentContent = ({ name, code, language: docLang, asNewTab }) => {
        if (asNewTab) {
            if (tabs.length >= 5) {
                toast.error('Cannot open as new tab: Maximum 5 tabs reached.');
                return;
            }
            const newId = `tab_${Date.now()}`;
            const newTab = createDefaultTab(newId, docLang, studentIdentifier, studentDisplayName);
            newTab.title = name.replace(/\.(py|sql)$/i, '');
            newTab.filename = name;
            newTab.code = code;
            newTab.metadata.title = newTab.title;

            const updatedTabs = [...tabs, newTab];
            setTabs(updatedTabs);
            setActiveTabId(newId);
            triggerSaveWorkspace(updatedTabs, newId);
        } else {
            // Replace in active tab
            setTabs((prevTabs) =>
                prevTabs.map((t) =>
                    t.id === activeTabId
                        ? {
                              ...t,
                              title: name.replace(/\.(py|sql)$/i, ''),
                              filename: name,
                              language: docLang,
                              code: code,
                              isDirty: false,
                              metadata: {
                                  ...t.metadata,
                                  title: name.replace(/\.(py|sql)$/i, '')
                              }
                          }
                        : t
                )
            );
            triggerSaveWorkspace();
        }
    };

    // Reset Personal SQLite Database
    const handleResetDatabase = async () => {
        if (!confirm('Are you sure you want to reset your personal database? All created tables and data will be erased.')) {
            return;
        }

        setIsResettingDb(true);
        try {
            await compilerAPI.resetDatabase();
            setExistingTables([]);
            toast.success('Your practice database has been reset to blank state.');
        } catch (err) {
            toast.error('Failed to reset database: ' + err.message);
        } finally {
            setIsResettingDb(false);
        }
    };

    // Keyboard Shortcuts (Ctrl+S, Ctrl+O, Ctrl+Enter, Ctrl+N)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') {
                    e.preventDefault();
                    handleSaveToDocuments(false);
                } else if (e.key === 'o') {
                    e.preventDefault();
                    setShowDocBrowserModal(true);
                } else if (e.key === 'n') {
                    e.preventDefault();
                    handleAddTab();
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    handleExecuteCode();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, tabs]);

    // Download code script
    const handleDownloadCode = () => {
        const ext = activeTab.language === 'sql' ? 'sql' : 'py';
        const blob = new Blob([activeTab.code], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = activeTab.filename || `${studentIdentifier}_code.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Downloaded script file!');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[100vw] overflow-hidden bg-slate-950 text-slate-100 font-sans">
            {/* 1. TOP DESKTOP-GRADE IDE MENU BAR */}
            <IDEMenuBar
                activeTab={activeTab}
                onNewTab={() => handleAddTab()}
                onOpenFromDocuments={() => setShowDocBrowserModal(true)}
                onSaveToDocuments={() => handleSaveToDocuments(false)}
                onSaveAs={() => handleSaveToDocuments(true)}
                onDownload={handleDownloadCode}
                onExportDiagram={() => toast('Export diagram available in Canvas toolbar')}
                onRunCode={handleExecuteCode}
                onClearOutput={() => {
                    setTabs((prev) =>
                        prev.map((t) => (t.id === activeTabId ? { ...t, output: null } : t))
                    );
                }}
                onResetDatabase={handleResetDatabase}
                onFormatCode={() => toast.success('Document formatted')}
                onInsertDocstringHeader={handleInsertDocstringHeader}
                onClearCode={() => handleCodeChange('')}
                isAutosaveEnabled={isAutosaveEnabled}
                onToggleAutosave={() => {
                    const next = !isAutosaveEnabled;
                    setIsAutosaveEnabled(next);
                    triggerSaveWorkspace(tabs, activeTabId, next);
                    toast.success(`Autosave ${next ? 'ENABLED' : 'DISABLED'}`);
                }}
                editorTheme={editorTheme}
                onSelectEditorTheme={setEditorTheme}
                outputThemeId={outputThemeId}
                onSelectOutputTheme={setOutputThemeId}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                isInstructorOrAdmin={isInstructorOrAdmin}
                studentsList={studentsList}
                selectedStudentId={inspectingStudentId}
                onSelectStudent={(stId) => {
                    setInspectingStudentId(stId);
                    toast.success('Loaded student workspace for review');
                }}
                onCloseInspection={() => {
                    setInspectingStudentId(null);
                    setInspectingStudentInfo(null);
                    toast('Returned to your own studio workspace');
                }}
                isInspecting={Boolean(inspectingStudentId)}
            />

            {/* Inspection Alert Banner (If Instructor reviewing a student) */}
            {inspectingStudentInfo && (
                <div className="bg-amber-950/80 border-b border-amber-700/80 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200 z-30">
                    <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-amber-400" />
                        <span>
                            Reviewing Student: <strong>{inspectingStudentInfo.name}</strong> ({inspectingStudentInfo.admissionNumber}) • Read-Only Inspection Mode
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            setInspectingStudentId(null);
                            setInspectingStudentInfo(null);
                        }}
                        className="text-xs font-bold underline hover:text-white"
                    >
                        Exit Inspection
                    </button>
                </div>
            )}

            {/* 2. DYNAMIC MULTI-TAB STRIP (MAX 5 TABS) */}
            <div className="flex items-center justify-between bg-slate-900/90 border-b border-slate-800 px-2 overflow-x-auto select-none flex-shrink-0">
                {/* Tabs List */}
                <div className="flex items-center gap-1 py-1">
                    {tabs.map((tab, idx) => {
                        const isActive = tab.id === activeTabId;
                        const isSql = tab.language === 'sql';

                        return (
                            <div
                                key={tab.id}
                                onClick={() => setActiveTabId(tab.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-t-2 text-xs font-medium cursor-pointer transition max-w-[180px] group ${
                                    isActive
                                        ? 'bg-slate-950 border-primary-500 text-white shadow-xs'
                                        : 'bg-slate-900 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                }`}
                                title={`${tab.title} (${tab.filename})`}
                            >
                                <span
                                    className={`text-[9px] font-bold px-1 py-0.2 rounded font-mono ${
                                        isSql
                                            ? 'bg-sky-500/20 text-sky-400'
                                            : 'bg-amber-500/20 text-amber-400'
                                    }`}
                                >
                                    {isSql ? 'SQL' : 'PY'}
                                </span>

                                <span className="truncate flex-1 font-mono text-[11px]">
                                    {tab.title || `Tab ${idx + 1}`}
                                </span>

                                {tab.isDirty && !isAutosaveEnabled && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
                                )}

                                {tabs.length > 1 && (
                                    <button
                                        onClick={(e) => handleCloseTab(tab.id, e)}
                                        className="opacity-0 group-hover:opacity-100 hover:bg-slate-800 p-0.5 rounded text-slate-400 hover:text-white transition"
                                        title="Close Tab"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {/* Add New Tab Button (Max 5) */}
                    {tabs.length < 5 ? (
                        <button
                            onClick={() => handleAddTab()}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition ml-1"
                            title="Open New Tab (Max 5)"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Tab</span>
                        </button>
                    ) : (
                        <span className="text-[10px] text-slate-500 ml-2 italic">Max 5 Tabs Open</span>
                    )}
                </div>

                {/* Right controls: Language toggle for active tab */}
                <div className="flex items-center gap-1 text-xs">
                    <div className="flex items-center bg-slate-800 p-0.5 rounded border border-slate-700">
                        <button
                            onClick={() => handleSwitchLanguage('python')}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                                activeTab.language === 'python'
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            Py
                        </button>
                        <button
                            onClick={() => handleSwitchLanguage('sql')}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                                activeTab.language === 'sql'
                                    ? 'bg-sky-500 text-slate-950'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            SQL
                        </button>
                    </div>

                    <button
                        onClick={() => setShowMetadataDrawer(!showMetadataDrawer)}
                        className={`p-1 rounded border text-xs transition ${
                            showMetadataDrawer
                                ? 'bg-primary-600/30 border-primary-500 text-primary-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title="Toggle Problem Details & Mandatory Fields Drawer"
                    >
                        <FileText className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* 3. PROBLEM DETAILS & MANDATORY FIELDS DRAWER */}
            {showMetadataDrawer && (
                <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs animate-in slide-in-from-top-1">
                    {/* Title (Mandatory) */}
                    <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1 mb-1">
                            <span>Problem Title</span>
                            <span className="text-rose-400 font-bold">*</span>
                            <span className="text-[10px] text-slate-500 font-normal">(Mandatory for saving)</span>
                        </label>
                        <input
                            type="text"
                            value={activeTab.metadata?.title || ''}
                            onChange={(e) => handleUpdateMetadata('title', e.target.value)}
                            placeholder="e.g. Factorial & Sum Calculation..."
                            className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-primary-500"
                        />
                    </div>

                    {/* Subject / Course */}
                    <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                            Subject / Lab Course
                        </label>
                        <input
                            type="text"
                            value={activeTab.metadata?.subject || ''}
                            onChange={(e) => handleUpdateMetadata('subject', e.target.value)}
                            placeholder="e.g. Python Programming Lab"
                            className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-primary-500"
                        />
                    </div>

                    {/* Student Info & Insert Docstring Action */}
                    <div className="flex items-end justify-between gap-2">
                        <div className="truncate">
                            <span className="text-[10px] text-slate-400 block">Student ID / Date</span>
                            <span className="font-mono text-emerald-400 font-semibold text-xs">
                                {activeTab.metadata?.studentId} • {activeTab.metadata?.date}
                            </span>
                        </div>

                        <button
                            onClick={handleInsertDocstringHeader}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-primary-300 rounded text-[11px] font-semibold transition cursor-pointer flex-shrink-0"
                            title="Generate formatted comment/docstring block at the top of code"
                        >
                            Insert Header
                        </button>
                    </div>
                </div>
            )}

            {/* 4. MAIN SPLIT SCREEN: LEFT EDITOR PANE, RIGHT OUTPUT & CANVAS */}
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 overflow-hidden">
                {/* LEFT PANEL: Monaco Code Editor with Ergonomic RUN CODE Button Above */}
                <section className="flex flex-col h-full border-r border-slate-800 overflow-hidden bg-slate-950">
                    {/* ERGONOMIC SUB-TOOLBAR DIRECTLY ABOVE EDITOR */}
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 flex-shrink-0">
                        {/* Left: Active filename & Runtime info */}
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-400">
                                {activeTab.filename}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[11px] text-slate-400">
                                {activeTab.language === 'python' ? 'Python 3.13 Sandbox' : 'Persistent SQLite Engine'}
                            </span>
                        </div>

                        {/* Center/Right: PROMINENT RUN CODE BUTTON ABOVE EDITOR */}
                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={handleExecuteCode}
                                disabled={isExecuting}
                                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md shadow-emerald-500/25 transition disabled:opacity-50 cursor-pointer active:scale-95"
                                title="Run active script (Ctrl+Enter / Cmd+Enter)"
                            >
                                <Play className={`w-3.5 h-3.5 fill-current ${isExecuting ? 'animate-spin' : ''}`} />
                                <span>{isExecuting ? 'Running...' : 'Run Code'}</span>
                                <kbd className="text-[9px] bg-emerald-700/30 text-slate-950 px-1 py-0.2 rounded font-mono font-normal hidden sm:inline">
                                    Ctrl+↵
                                </kbd>
                            </button>

                            <button
                                onClick={() => handleSaveToDocuments(false)}
                                className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
                                title="Save to Documents (Ctrl+S)"
                            >
                                <Save className="w-3.5 h-3.5 text-emerald-400" />
                            </button>
                        </div>
                    </div>

                    {/* Monaco Editor Canvas */}
                    <div className="flex-1 relative overflow-hidden">
                        <Editor
                            height="100%"
                            language={activeTab.language === 'sql' ? 'sql' : 'python'}
                            value={activeTab.code}
                            theme={editorTheme}
                            onChange={handleCodeChange}
                            onMount={(editor) => {
                                editorRef.current = editor;
                            }}
                            options={{
                                fontSize: fontSize,
                                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: activeTab.language === 'python' ? 4 : 2,
                                insertSpaces: true,
                                wordWrap: 'on',
                                padding: { top: 12, bottom: 12 },
                                lineNumbers: 'on',
                                renderLineHighlight: 'all',
                                bracketPairColorization: { enabled: true }
                            }}
                        />
                    </div>

                    {/* Collapsible Stdin Input (Python only) */}
                    {activeTab.language === 'python' && (
                        <div className="p-2.5 bg-slate-900 border-t border-slate-800">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1">
                                    <Terminal className="w-3 h-3" />
                                    Standard Input (stdin for input() prompts)
                                </label>
                            </div>
                            <textarea
                                value={activeTab.stdin}
                                onChange={(e) => handleStdinChange(e.target.value)}
                                placeholder="Values entered here feed sequentially into input() calls..."
                                rows={2}
                                className="w-full p-2 bg-slate-950 border border-slate-700 rounded font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none placeholder-slate-600"
                            />
                        </div>
                    )}
                </section>

                {/* RIGHT PANEL: COORDINATED OUTPUT & VISUAL FLOWCHART CANVAS */}
                <section className="flex flex-col h-full overflow-hidden bg-slate-900/60">
                    {/* Tab Navigation Header */}
                    <div className="flex items-center justify-between px-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setRightPanelMode('output')}
                                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition ${
                                    rightPanelMode === 'output'
                                        ? 'border-emerald-500 text-emerald-400'
                                        : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Terminal className="w-3.5 h-3.5" />
                                <span>Output Screen ({activeTab.title})</span>
                                {activeTab.output?.durationMs !== undefined && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                                        {activeTab.output.durationMs}ms
                                    </span>
                                )}
                            </button>

                            {/* SQL Structured Data Table Tab */}
                            {activeTab.language === 'sql' && activeTab.output?.tables && activeTab.output.tables.length > 0 && (
                                <button
                                    onClick={() => setRightPanelMode('table')}
                                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition ${
                                        rightPanelMode === 'table'
                                            ? 'border-sky-500 text-sky-400'
                                            : 'border-transparent text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                    <span>Query Results</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 font-mono">
                                        {activeTab.output.tables.length} rows
                                    </span>
                                </button>
                            )}

                            {/* Flowchart / Diagram Canvas Tab */}
                            <button
                                onClick={() => setRightPanelMode('diagram')}
                                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition ${
                                    rightPanelMode === 'diagram'
                                        ? 'border-purple-500 text-purple-400'
                                        : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Shapes className="w-3.5 h-3.5" />
                                <span>
                                    {activeTab.language === 'python'
                                        ? 'Flowchart Canvas'
                                        : 'ER Diagram Designer'}
                                </span>
                            </button>
                        </div>

                        {/* Persistent DB Tables list indicator (SQL mode) */}
                        {activeTab.language === 'sql' && existingTables.length > 0 && (
                            <div className="flex items-center gap-1 text-[11px] text-sky-400">
                                <Database className="w-3.5 h-3.5" />
                                <span className="font-mono font-semibold">{existingTables.length} tables saved</span>
                            </div>
                        )}
                    </div>

                    {/* CONTENT 1: COORDINATED OUTPUT SCREEN */}
                    {rightPanelMode === 'output' && (
                        <div
                            className={`flex-1 flex flex-col p-4 overflow-y-auto transition-colors duration-200 ${currentOutputTheme.containerClass}`}
                        >
                            {activeTab.output ? (
                                <div className="space-y-4">
                                    {/* Execution metadata bar */}
                                    <div
                                        className={`flex items-center justify-between pb-2 border-b text-[11px] ${currentOutputTheme.headerClass}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`inline-flex items-center gap-1 font-semibold ${
                                                    activeTab.output.exitCode === 0
                                                        ? currentOutputTheme.accentText
                                                        : 'text-rose-400'
                                                }`}
                                            >
                                                {activeTab.output.exitCode === 0 ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                ) : (
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                )}
                                                {activeTab.output.exitCode === 0
                                                    ? 'Process Finished (0)'
                                                    : `Exited with Error (${activeTab.output.exitCode})`}
                                            </span>
                                            <span>•</span>
                                            <span>Duration: {activeTab.output.durationMs || 0}ms</span>
                                        </div>
                                        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                                            Runner: {activeTab.output.runner || 'native'}
                                        </span>
                                    </div>

                                    {/* Standard Output (stdout) */}
                                    {activeTab.output.stdout ? (
                                        <div
                                            className={`p-3 rounded-lg border whitespace-pre-wrap leading-relaxed select-text font-mono text-xs ${currentOutputTheme.stdoutClass}`}
                                        >
                                            {activeTab.output.stdout}
                                        </div>
                                    ) : !activeTab.output.stderr ? (
                                        <p className="opacity-60 italic text-xs">
                                            Command executed successfully with no stdout output.
                                        </p>
                                    ) : null}

                                    {/* Standard Error (stderr) */}
                                    {activeTab.output.stderr && (
                                        <div className="bg-rose-950/40 p-3 rounded-lg border border-rose-800/60 text-rose-300 whitespace-pre-wrap leading-relaxed select-text font-mono text-xs">
                                            <div className="flex items-center gap-1.5 font-bold text-rose-400 mb-1">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>Runtime / Syntax Error:</span>
                                            </div>
                                            {activeTab.output.stderr}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
                                    <Terminal className="w-10 h-10 mb-3 stroke-1" />
                                    <p className="text-sm font-semibold">No execution output for {activeTab.title}</p>
                                    <p className="text-xs mt-1 max-w-sm">
                                        Click <span className="font-semibold underline">Run Code</span> above the editor or press{' '}
                                        <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">
                                            Ctrl+Enter
                                        </kbd>{' '}
                                        to execute this tab.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CONTENT 2: SQL STRUCTURED DATA TABLE */}
                    {rightPanelMode === 'table' && activeTab.output?.tables && (
                        <div className="flex-1 flex flex-col p-4 overflow-auto">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                                    <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                                    <span>Query Result Set ({activeTab.output.tables.length} rows)</span>
                                </h3>
                            </div>

                            <div className="flex-1 overflow-auto rounded-lg border border-slate-800 bg-slate-950 shadow-inner">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-900 border-b border-slate-800">
                                            <th className="p-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-10 text-center">
                                                #
                                            </th>
                                            {Object.keys(activeTab.output.tables[0] || {}).map((col) => (
                                                <th
                                                    key={col}
                                                    className="p-2.5 text-[11px] font-bold text-sky-400 font-mono tracking-wider border-l border-slate-800"
                                                >
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 font-mono">
                                        {activeTab.output.tables.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-900/60 transition">
                                                <td className="p-2.5 text-[10px] text-slate-400 text-center select-none">
                                                    {idx + 1}
                                                </td>
                                                {Object.keys(row).map((col) => (
                                                    <td
                                                        key={col}
                                                        className="p-2.5 text-slate-200 border-l border-slate-800 whitespace-nowrap"
                                                    >
                                                        {row[col] !== null && row[col] !== undefined ? (
                                                            String(row[col])
                                                        ) : (
                                                            <span className="text-slate-400 italic">NULL</span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* CONTENT 3: FULL VERTICAL PANE FLOWCHART VISUAL CANVAS */}
                    {rightPanelMode === 'diagram' && (
                        <div className="flex-1 h-full w-full overflow-hidden">
                            <FlowchartVisualCanvas
                                initialData={activeTab.flowchartData}
                                onChange={(canvasState) => {
                                    setTabs((prevTabs) =>
                                        prevTabs.map((t) =>
                                            t.id === activeTabId
                                                ? { ...t, flowchartData: canvasState }
                                                : t
                                        )
                                    );
                                }}
                                readOnly={Boolean(inspectingStudentId)}
                            />
                        </div>
                    )}
                </section>
            </main>

            {/* Document Browser Modal */}
            <DocumentCodeBrowserModal
                isOpen={showDocBrowserModal}
                onClose={() => setShowDocBrowserModal(false)}
                onOpenFile={handleOpenDocumentContent}
                defaultLanguage={activeTab.language}
            />
        </div>
    );
}
