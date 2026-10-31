'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
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
import SaveAsDialogModal from '@/components/SaveAsDialogModal';
import DatabaseEngineModal from '@/components/DatabaseEngineModal';
import StudentWorkInspectorModal from '@/components/StudentWorkInspectorModal';
import StudentFeedbackDrawer from '@/components/StudentFeedbackDrawer';
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
        documentId: null,
        output: null,
        flowchartData: null,
        isDirty: false
    };
};

export function PracticeIDEPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlDocId = searchParams?.get('docId') || searchParams?.get('id');
    const urlLang = searchParams?.get('lang');
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    const isInstructorOrAdmin =
        user?.role === 'admin' || user?.role === 'instructor' || user?.role === 'principal';

    const studentIdentifier =
        user?.admissionNumber || user?.studentId || user?.employeeId || user?.email?.split('@')[0] || 'STU';
    const studentDisplayName =
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Student';

    // 1. MULTI-TAB SYSTEM (Max 5 tabs) - Initial tabs default to both Python and SQL for immediate visibility
    const [tabs, setTabs] = useState(() => [
        createDefaultTab('tab_py', 'python', studentIdentifier, studentDisplayName),
        createDefaultTab('tab_sql', 'sql', studentIdentifier, studentDisplayName)
    ]);
    const [activeTabId, setActiveTabId] = useState(urlLang === 'sql' ? 'tab_sql' : 'tab_py');
    const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

    const tabsRef = useRef(tabs);
    tabsRef.current = tabs;
    const activeTabIdRef = useRef(activeTabId);
    activeTabIdRef.current = activeTabId;

    // Autosave Toggle (ON / OFF)
    const [isAutosaveEnabled, setIsAutosaveEnabled] = useState(true);
    const [autosaveStatus, setAutosaveStatus] = useState('saved'); // 'saved' | 'saving'
    const autosaveTimerRef = useRef(null);

    // Problem Details / Metadata Drawer
    const [showMetadataDrawer, setShowMetadataDrawer] = useState(true);

    // Document Browser & Save As Modals
    const [showDocBrowserModal, setShowDocBrowserModal] = useState(false);
    const [showSaveAsModal, setShowSaveAsModal] = useState(false);
    const [existingDocs, setExistingDocs] = useState([]);

    // Inline Tab Rename State
    const [editingTabId, setEditingTabId] = useState(null);
    const [editingTabTitle, setEditingTabTitle] = useState('');

    // Fetch existing documents to detect filename duplicates in same folder
    const loadExistingDocs = useCallback(async () => {
        try {
            const res = await documentsAPI.getAll({ category: 'code' });
            const list = res.data?.documents || res.data || [];
            setExistingDocs(Array.isArray(list) ? list : []);
        } catch (err) {
            console.warn('Failed to load documents list:', err.message);
        }
    }, []);

    // Execution state
    const [isExecuting, setIsExecuting] = useState(false);
    const [rightPanelMode, setRightPanelMode] = useState('output'); // 'output' | 'table' | 'diagram'

    // Themes - Light theme by default for both input and output/flowchart
    const [editorTheme, setEditorTheme] = useState('vs');
    const [outputThemeId, setOutputThemeId] = useState('light');
    const currentOutputTheme = OUTPUT_THEMES.find((t) => t.id === outputThemeId) || OUTPUT_THEMES.find((t) => t.id === 'light') || OUTPUT_THEMES[0];
    const [fontSize, setFontSize] = useState(14);
    const isLightMode = outputThemeId === 'light' || editorTheme === 'vs' || editorTheme === 'light';

    // Persistent student Database Engine (MySQL or SQLite)
    const [activeEngine, setActiveEngine] = useState('mysql');
    const [showEngineModal, setShowEngineModal] = useState(false);
    const [existingTables, setExistingTables] = useState([]);
    const [isResettingDb, setIsResettingDb] = useState(false);

    // Student Work Inspection & Review Studio
    const [showInspectorModal, setShowInspectorModal] = useState(false);
    const [studentsList, setStudentsList] = useState([]);
    const [inspectingStudentId, setInspectingStudentId] = useState(null);
    const [inspectingStudentInfo, setInspectingStudentInfo] = useState(null);

    // Student Review Feedback Drawer & Badge
    const [showFeedbackDrawer, setShowFeedbackDrawer] = useState(false);
    const [latestStudentReview, setLatestStudentReview] = useState(null);

    const editorRef = useRef(null);

    // Fetch initial SQL engine configuration
    useEffect(() => {
        let isMounted = true;
        compilerAPI.getEngineConfig()
            .then(res => {
                if (res.data?.success && res.data?.data && isMounted) {
                    setActiveEngine(res.data.data.activeEngine || 'mysql');
                }
            })
            .catch(() => {});
        return () => { isMounted = false; };
    }, []);

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
                    if (ws.reviewData?.latestReview) setLatestStudentReview(ws.reviewData.latestReview);

                    if (ws.studentInfo) {
                        setInspectingStudentInfo(ws.studentInfo);
                    } else {
                        setInspectingStudentInfo(null);
                    }

                    // Restore tabs if present
                    if (ws.tabs && Array.isArray(ws.tabs) && ws.tabs.length > 0) {
                        // Refresh code for any tab that has a documentId to guarantee actual saved content is displayed
                        const refreshedTabs = await Promise.all(
                            ws.tabs.map(async (tab) => {
                                if (tab.documentId) {
                                    try {
                                        const docRes = await documentsAPI.getFileContent(tab.documentId);
                                        const fileContent = typeof docRes.data === 'string' ? docRes.data : String(docRes.data || '');
                                        if (fileContent && fileContent.trim().length > 0) {
                                            return { ...tab, code: fileContent, isDirty: false };
                                        }
                                    } catch (fetchErr) {
                                        console.warn(`Could not refresh doc ${tab.documentId}:`, fetchErr.message);
                                    }
                                }
                                return tab;
                            })
                        );

                        // Ensure at least one SQL tab is present if the user had none
                        let finalTabs = refreshedTabs;
                        const hasSql = finalTabs.some((t) => t.language === 'sql');
                        if (!hasSql && finalTabs.length < 5) {
                            finalTabs = [
                                ...finalTabs,
                                createDefaultTab(`tab_sql_${Date.now()}`, 'sql', studentIdentifier, studentDisplayName)
                            ];
                        }

                        setTabs(finalTabs);
                        if (urlLang === 'sql') {
                            const sqlTab = finalTabs.find((t) => t.language === 'sql');
                            if (sqlTab) setActiveTabId(sqlTab.id);
                        } else if (ws.activeTabId && finalTabs.some((t) => t.id === ws.activeTabId)) {
                            setActiveTabId(ws.activeTabId);
                        } else {
                            setActiveTabId(finalTabs[0].id);
                        }
                    } else if (ws.pythonCode || ws.sqlCode) {
                        // Legacy single-code upgrade
                        const upgradedTabs = [];
                        if (ws.pythonCode) {
                            const pyTab = createDefaultTab('tab_py', 'python', studentIdentifier, studentDisplayName);
                            pyTab.code = ws.pythonCode;
                            upgradedTabs.push(pyTab);
                        }
                        if (ws.sqlCode) {
                            const sqlTab = createDefaultTab('tab_sql', 'sql', studentIdentifier, studentDisplayName);
                            sqlTab.code = ws.sqlCode;
                            upgradedTabs.push(sqlTab);
                        }
                        if (upgradedTabs.length === 0) {
                            upgradedTabs.push(
                                createDefaultTab('tab_py', 'python', studentIdentifier, studentDisplayName),
                                createDefaultTab('tab_sql', 'sql', studentIdentifier, studentDisplayName)
                            );
                        }
                        setTabs(upgradedTabs);
                        setActiveTabId(urlLang === 'sql' ? (upgradedTabs.find(t => t.language === 'sql')?.id || upgradedTabs[0].id) : upgradedTabs[0].id);
                    }
                }
            } catch (err) {
                console.warn('Workspace load warning:', err.message);
            }
        }

        loadWorkspace();
        loadExistingDocs();

        return () => {
            isMounted = false;
        };
    }, [inspectingStudentId, isInstructorOrAdmin, studentIdentifier, studentDisplayName, loadExistingDocs, urlLang]);

    // Auto-load document if opened with ?docId=...
    useEffect(() => {
        if (!urlDocId) return;
        let isMounted = true;
        async function fetchUrlDoc() {
            try {
                const docRes = await documentsAPI.getById(urlDocId);
                const docData = docRes.data?.data?.document || docRes.data?.data || docRes.data;
                const fileRes = await documentsAPI.getFileContent(urlDocId);
                const codeText = typeof fileRes.data === 'string' ? fileRes.data : String(fileRes.data || '');
                const fileName = docData?.fileName || docData?.name || 'practice.py';
                const isSql = fileName.endsWith('.sql') || docData?.category === 'sql';
                const lang = isSql ? 'sql' : 'python';

                if (isMounted && codeText) {
                    handleOpenDocumentContent({
                        name: fileName,
                        code: codeText,
                        language: lang,
                        documentId: urlDocId,
                        asNewTab: false
                    });
                    toast.success(`Loaded saved code: ${fileName}`, { icon: '📄' });
                }
            } catch (err) {
                console.warn('URL doc load failed:', err.message);
            }
        }
        fetchUrlDoc();
        return () => { isMounted = false; };
    }, [urlDocId]);

    // 3. Debounced Autosave (saves tabs, active tab, and output to server and local)
    const triggerSaveWorkspace = useCallback(
        async (updatedTabs, updatedActiveId, autosaveState) => {
            if (inspectingStudentId) return; // Do not overwrite when inspecting another student

            const tabsToSave = updatedTabs || tabsRef.current || tabs;
            const activeIdToSave = updatedActiveId || activeTabIdRef.current || activeTabId;
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
        [isAutosaveEnabled, editorTheme, outputThemeId, user?.id, inspectingStudentId]
    );

    // Code change handler
    const handleCodeChange = (newCode) => {
        if (inspectingStudentId) return;
        const val = newCode || '';

        setTabs((prevTabs) => {
            const nextTabs = prevTabs.map((t) => (t.id === activeTabId ? { ...t, code: val, isDirty: true } : t));
            if (isAutosaveEnabled) {
                setAutosaveStatus('saving');
                if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = setTimeout(() => {
                    triggerSaveWorkspace(nextTabs, activeTabId);
                }, 800);
            }
            return nextTabs;
        });
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
        const currentTabs = tabsRef.current || tabs;
        if (currentTabs.length >= 5) {
            toast.error('Maximum 5 editor tabs allowed. Please close a tab first.');
            return;
        }

        const newId = `tab_${Date.now()}`;
        const newLang = forcedLang || (activeTab?.language === 'sql' ? 'sql' : 'python');
        const isSql = newLang === 'sql';
        const newTab = createDefaultTab(newId, newLang, studentIdentifier, studentDisplayName);
        newTab.title = isSql ? `SQL Query ${currentTabs.length + 1}` : `Python ${currentTabs.length + 1}`;
        newTab.filename = `${studentIdentifier}_${new Date().toISOString().split('T')[0]}_p${currentTabs.length + 1}.${isSql ? 'sql' : 'py'}`;

        const updatedTabs = [...currentTabs, newTab];
        setTabs(updatedTabs);
        setActiveTabId(newId);
        triggerSaveWorkspace(updatedTabs, newId);
        toast.success(`Created ${isSql ? 'SQL Database' : 'Python'} Tab (${updatedTabs.length} of 5)`);
    };

    const handleCloseTab = (tabIdToClose, e) => {
        if (e) e.stopPropagation();
        const currentTabs = tabsRef.current || tabs;
        if (currentTabs.length <= 1) {
            toast.error('At least one tab must remain open.');
            return;
        }

        const tabToClose = currentTabs.find((t) => t.id === tabIdToClose);
        if (tabToClose?.isDirty && !isAutosaveEnabled) {
            if (!confirm(`Tab "${tabToClose.title}" has unsaved changes. Close anyway?`)) {
                return;
            }
        }

        const updatedTabs = currentTabs.filter((t) => t.id !== tabIdToClose);
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
        const newExt = newLang === 'sql' ? '.sql' : '.py';
        const defaultFilename = `${studentIdentifier}_${dateStr}${newExt}`;
        const updatedFilename = activeTab.filename
            ? (activeTab.filename.includes('.') ? activeTab.filename.replace(/\.(py|sql)$/i, newExt) : `${activeTab.filename}${newExt}`)
            : defaultFilename;

        // Check if code is default or empty
        const isDefaultCode = !activeTab.code || activeTab.code.trim().length === 0 ||
            activeTab.code.includes('Python Practice Script') ||
            activeTab.code.includes('SQL Practice Script') ||
            activeTab.code.includes('Calculate Factorial & Sum');

        const pyStarter = `# Python Practice Script\n# Calculate Factorial & Sum of 1..N\n\nn = int(input("Enter positive number N: "))\ntotal_sum = 0\nfactorial = 1\ni = 1\n\nwhile i <= n:\n    total_sum = total_sum + i\n    factorial = factorial * i\n    i = i + 1\n\nprint("Sum of 1 to", n, "is:", total_sum)\nprint("Factorial of", n, "is:", factorial)\n`;

        const sqlStarter = `-- SQL Practice Script\n-- Tables created here are stored permanently in your personal database!\n\nCREATE TABLE IF NOT EXISTS students (\n    id INTEGER PRIMARY KEY,\n    name TEXT NOT NULL,\n    department TEXT\n);\n\nINSERT OR IGNORE INTO students VALUES \n(101, 'Aarav Sharma', 'Computer Science'),\n(102, 'Priya Patel', 'Data Science');\n\nSELECT * FROM students;\n`;

        const newCode = isDefaultCode
            ? (newLang === 'sql' ? sqlStarter : pyStarter)
            : activeTab.code;

        const currentTabs = tabsRef.current || tabs;
        const updatedTabs = currentTabs.map((t) =>
            t.id === activeTabId
                ? {
                      ...t,
                      language: newLang,
                      filename: updatedFilename,
                      title: isDefaultCode ? (newLang === 'sql' ? 'Student Schema' : 'Factorial & Sum') : t.title,
                      code: newCode,
                      output: null,
                      metadata: {
                          ...t.metadata,
                          title: isDefaultCode ? (newLang === 'sql' ? 'Student Database Schema' : 'Factorial & Sum Calculation') : t.metadata?.title,
                          subject: newLang === 'sql' ? 'Database Management' : 'Python Programming'
                      }
                  }
                : t
        );
        setTabs(updatedTabs);
        triggerSaveWorkspace(updatedTabs, activeTabId);
        toast.success(`Switched active tab to ${newLang === 'sql' ? 'SQL Database' : 'Python 3'}`);
    };

    // Inline Tab Rename: updates title, synchronized filename, auto-creates or overwrites in Documents
    const handleCommitTabRename = async (tabId) => {
        const trimmed = (editingTabTitle || '').trim();
        if (!trimmed) {
            setEditingTabId(null);
            return;
        }

        const currentTab = tabs.find((t) => t.id === tabId);
        if (!currentTab) {
            setEditingTabId(null);
            return;
        }

        const ext = currentTab.language === 'sql' ? '.sql' : '.py';
        let newFilename = trimmed;
        if (!newFilename.toLowerCase().endsWith(ext)) {
            newFilename = `${newFilename.replace(/\.[^/.]+$/, '')}${ext}`;
        }

        setEditingTabId(null);

        const targetFolderName = currentTab.language === 'sql' ? 'SQL Practice' : 'Python Practice';

        try {
            // 1. Resolve or Create Target Folder
            const foldersRes = await foldersAPI.getAll();
            const rawFolders = foldersRes.data?.data;
            const foldersList = Array.isArray(rawFolders)
                ? rawFolders
                : Array.isArray(rawFolders?.folders)
                ? rawFolders.folders
                : [];
            let targetFolder = foldersList.find(
                (f) => f.name?.toLowerCase() === targetFolderName.toLowerCase()
            );

            if (!targetFolder) {
                const createFolderRes = await foldersAPI.create({
                    name: targetFolderName,
                    color: currentTab.language === 'sql' ? '#0284c7' : '#f59e0b'
                });
                targetFolder = createFolderRes.data?.data?.folder || createFolderRes.data?.data;
            }

            // 2. Upload file with overwrite and existingDocumentId
            const fileBlob = new Blob([currentTab.code], { type: 'text/plain;charset=utf-8' });
            const fileObj = new File([fileBlob], newFilename, { type: 'text/plain' });

            const uploadRes = await documentsAPI.upload(fileObj, {
                name: newFilename,
                description: `${trimmed} - Practice Code Document`,
                category: 'code',
                folderId: targetFolder?.id,
                overwrite: true,
                existingDocumentId: currentTab.documentId || undefined
            });

            const savedDoc = uploadRes.data?.data?.document || uploadRes.data?.data;
            const newDocId = savedDoc?.id || currentTab.documentId;

            // 3. Update tabs state with new documentId and reset isDirty
            setTabs((prevTabs) => {
                const nextTabs = prevTabs.map((t) => {
                    if (t.id !== tabId) return t;
                    return {
                        ...t,
                        title: trimmed,
                        filename: newFilename,
                        documentId: newDocId,
                        isDirty: false
                    };
                });
                triggerSaveWorkspace(nextTabs);
                return nextTabs;
            });

            loadExistingDocs();
            toast.success(`Saved to Documents / ${targetFolderName} / ${newFilename}`, { icon: '📁' });
        } catch (err) {
            console.error('Document auto-create on rename error:', err);
            // Fallback: update tab title and filename locally
            setTabs((prevTabs) => {
                const nextTabs = prevTabs.map((t) => {
                    if (t.id !== tabId) return t;
                    return {
                        ...t,
                        title: trimmed,
                        filename: newFilename,
                        isDirty: true
                    };
                });
                triggerSaveWorkspace(nextTabs);
                return nextTabs;
            });
            toast.error('Could not auto-save to Documents: ' + (err.response?.data?.message || err.message));
        }
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

    // 6. Save to Documents
    const executeSaveToDocuments = async ({ fileName, folderName, language, problemTitle, problemDescription }) => {
        const toastId = toast.loading(`Saving "${fileName}" to Documents...`);

        try {
            // 1. Resolve or Create Folder
            const targetFolderName = folderName || (language === 'sql' ? 'SQL' : 'Python');
            const foldersRes = await foldersAPI.getAll();
            const rawFolders = foldersRes.data?.data;
            const foldersList = Array.isArray(rawFolders)
                ? rawFolders
                : Array.isArray(rawFolders?.folders)
                ? rawFolders.folders
                : [];
            let targetFolder = foldersList.find(
                (f) => f.name?.toLowerCase() === targetFolderName.toLowerCase()
            );

            if (!targetFolder) {
                const createFolderRes = await foldersAPI.create({
                    name: targetFolderName,
                    color: language === 'sql' ? '#0284c7' : '#f59e0b'
                });
                targetFolder = createFolderRes.data?.data?.folder || createFolderRes.data?.data;
            }

            // 2. Upload file
            const fileBlob = new Blob([activeTab.code], { type: 'text/plain;charset=utf-8' });
            const fileObj = new File([fileBlob], fileName, { type: 'text/plain' });

            const uploadRes = await documentsAPI.upload(fileObj, {
                name: fileName,
                description: `${problemTitle || ''} - ${problemDescription || ''}`.trim(),
                category: 'code',
                folderId: targetFolder?.id,
                overwrite: true,
                existingDocumentId: activeTab.documentId || undefined
            });

            const savedDoc = uploadRes.data?.data?.document || uploadRes.data?.data;
            const newDocId = savedDoc?.id || activeTab.documentId;

            // 3. Mark active tab clean and update metadata
            const currentTabs = tabsRef.current || tabs;
            const nextTabs = currentTabs.map((t) =>
                t.id === activeTabId
                    ? {
                          ...t,
                          filename: fileName,
                          language: language || t.language,
                          title: problemTitle || t.title,
                          documentId: newDocId,
                          metadata: {
                              ...t.metadata,
                              title: problemTitle || t.metadata?.title || '',
                              description: problemDescription !== undefined ? problemDescription : t.metadata?.description || ''
                          },
                          isDirty: false
                      }
                    : t
            );
            setTabs(nextTabs);
            triggerSaveWorkspace(nextTabs, activeTabId);

            toast.success(`Saved to Documents / ${targetFolderName} / ${fileName}!`, { id: toastId });
            loadExistingDocs();
        } catch (err) {
            console.error('Save to documents error:', err);
            toast.error('Failed to save to Documents: ' + (err.response?.data?.message || err.message), { id: toastId });
            throw err;
        }
    };

    const handleSaveToDocuments = (openAsDialog = false) => {
        loadExistingDocs();
        // If explicitly requested via Save As, or if the active tab has never been saved yet (no filename), or if mandatory problem title is missing:
        if (openAsDialog || !activeTab.filename || !activeTab.metadata?.title?.trim()) {
            setShowSaveAsModal(true);
            return;
        }

        // Direct quick-save with existing filename and metadata
        const ext = activeTab.language === 'sql' ? 'sql' : 'py';
        const folder = activeTab.language === 'sql' ? 'SQL' : 'Python';
        const fileName = activeTab.filename.endsWith(`.${ext}`) ? activeTab.filename : `${activeTab.filename}.${ext}`;

        executeSaveToDocuments({
            fileName,
            folderName: folder,
            language: activeTab.language,
            problemTitle: activeTab.metadata?.title?.trim() || activeTab.title,
            problemDescription: activeTab.metadata?.description || ''
        });
    };

    // 7. Open Document from Browser into Tab
    const handleOpenDocumentContent = ({ name, code, language: docLang, asNewTab, docId, documentId }) => {
        const resolvedDocId = docId || documentId || null;
        const currentTabs = tabsRef.current || tabs;
        if (asNewTab) {
            if (currentTabs.length >= 5) {
                toast.error('Cannot open as new tab: Maximum 5 tabs reached.');
                return;
            }
            const newId = `tab_${Date.now()}`;
            const newTab = createDefaultTab(newId, docLang, studentIdentifier, studentDisplayName);
            newTab.title = name.replace(/\.(py|sql)$/i, '');
            newTab.filename = name;
            newTab.code = code;
            newTab.documentId = resolvedDocId;
            newTab.metadata.title = newTab.title;

            const updatedTabs = [...currentTabs, newTab];
            setTabs(updatedTabs);
            setActiveTabId(newId);
            triggerSaveWorkspace(updatedTabs, newId);
        } else {
            // Replace in active tab
            const updatedTabs = currentTabs.map((t) =>
                t.id === activeTabId
                    ? {
                          ...t,
                          title: name.replace(/\.(py|sql)$/i, ''),
                          filename: name,
                          language: docLang,
                          code: code,
                          documentId: resolvedDocId || t.documentId,
                          isDirty: false,
                          metadata: {
                              ...t.metadata,
                              title: name.replace(/\.(py|sql)$/i, '')
                          }
                      }
                    : t
            );
            setTabs(updatedTabs);
            triggerSaveWorkspace(updatedTabs, activeTabId);
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
                if (e.key === 's' || e.key === 'S') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        handleSaveToDocuments(true);
                    } else {
                        handleSaveToDocuments(false);
                    }
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
        <div className={`flex flex-col h-[calc(100vh-4rem)] max-w-[100vw] overflow-hidden font-sans ${isLightMode ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'}`}>
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
                activeEngine={activeEngine}
                onOpenEngineModal={() => setShowEngineModal(true)}
                onOpenInspectorStudio={() => setShowInspectorModal(true)}
                latestStudentReview={latestStudentReview}
                onOpenFeedbackDrawer={() => setShowFeedbackDrawer(true)}
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
            <div className={`flex items-center justify-between border-b px-2 overflow-x-auto select-none flex-shrink-0 ${isLightMode ? 'bg-slate-200 border-slate-300' : 'bg-slate-900/90 border-slate-800'}`}>
                {/* Tabs List */}
                <div className="flex items-center gap-1 py-1">
                    {tabs.map((tab, idx) => {
                        const isActive = tab.id === activeTabId;
                        const isSql = tab.language === 'sql';

                        return (
                            <div
                                key={tab.id}
                                onClick={() => setActiveTabId(tab.id)}
                                onDoubleClick={(e) => {
                                    if (inspectingStudentId) return;
                                    e.stopPropagation();
                                    setEditingTabId(tab.id);
                                    setEditingTabTitle(tab.title);
                                }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-t-2 text-xs font-medium cursor-pointer transition max-w-[200px] group ${
                                    isActive
                                        ? isLightMode
                                            ? 'bg-white border-primary-600 text-slate-900 shadow-xs'
                                            : 'bg-slate-950 border-primary-500 text-white shadow-xs'
                                        : isLightMode
                                        ? 'bg-slate-100 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                                        : 'bg-slate-900 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                }`}
                                title={`${tab.title} (${tab.filename}) - Double click to rename tab`}
                            >
                                <span
                                    className={`text-[9px] font-bold px-1 py-0.2 rounded font-mono ${
                                        isSql
                                            ? 'bg-sky-500/20 text-sky-500 dark:text-sky-400'
                                            : 'bg-amber-500/20 text-amber-500 dark:text-amber-400'
                                    }`}
                                >
                                    {isSql ? 'SQL' : 'PY'}
                                </span>

                                {editingTabId === tab.id ? (
                                    <input
                                        autoFocus
                                        type="text"
                                        value={editingTabTitle}
                                        onClick={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onChange={(e) => setEditingTabTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCommitTabRename(tab.id);
                                            if (e.key === 'Escape') setEditingTabId(null);
                                        }}
                                        onBlur={() => handleCommitTabRename(tab.id)}
                                        className={`w-24 px-1 py-0.2 border rounded text-[11px] font-mono focus:outline-none ${
                                            isLightMode
                                                ? 'bg-white border-primary-600 text-slate-900'
                                                : 'bg-slate-900 border-primary-500 text-white'
                                        }`}
                                    />
                                ) : (
                                    <span className="truncate flex-1 font-mono text-[11px] cursor-text" title="Double click to rename">
                                        {tab.title || `Tab ${idx + 1}`}
                                    </span>
                                )}

                                {tab.isDirty && !isAutosaveEnabled && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
                                )}

                                {tabs.length > 1 && (
                                    <button
                                        onClick={(e) => handleCloseTab(tab.id, e)}
                                        className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition ${
                                            isLightMode
                                                ? 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'
                                                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                                        }`}
                                        title="Close Tab"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {/* Add New Tab Buttons (Python and SQL) */}
                    {tabs.length < 5 ? (
                        <div className="flex items-center gap-1.5 ml-2">
                            <button
                                onClick={() => handleAddTab('python')}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border ${
                                    isLightMode
                                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 shadow-xs'
                                        : 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border-amber-700/60'
                                }`}
                                title="Open New Python Script (.py)"
                            >
                                <Plus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>+ Python</span>
                            </button>

                            <button
                                onClick={() => handleAddTab('sql')}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer border ${
                                    isLightMode
                                        ? 'bg-sky-100 hover:bg-sky-200 text-sky-900 border-sky-300 shadow-xs'
                                        : 'bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 border-sky-700/60'
                                }`}
                                title="Open New SQL Database Query (.sql)"
                            >
                                <Plus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                <span>+ SQL</span>
                            </button>
                        </div>
                    ) : (
                        <span className="text-[10px] text-slate-400 ml-2 italic">Max 5 Tabs Open</span>
                    )}
                </div>

                {/* Right controls: Language toggle for active tab */}
                <div className="flex items-center gap-2 text-xs">
                    <div className={`flex items-center p-0.5 rounded-lg border shadow-xs ${isLightMode ? 'bg-white border-slate-300' : 'bg-slate-800 border-slate-700'}`}>
                        <button
                            onClick={() => handleSwitchLanguage('python')}
                            className={`flex items-center gap-1 px-2.5 py-0.8 rounded-md text-[11px] font-bold transition cursor-pointer ${
                                activeTab.language === 'python'
                                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                                    : isLightMode
                                    ? 'text-slate-600 hover:text-slate-900'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="Switch active tab to Python 3"
                        >
                            <span>🐍 Python</span>
                        </button>
                        <button
                            onClick={() => handleSwitchLanguage('sql')}
                            className={`flex items-center gap-1 px-2.5 py-0.8 rounded-md text-[11px] font-bold transition cursor-pointer ${
                                activeTab.language === 'sql'
                                    ? 'bg-sky-500 text-slate-950 shadow-xs'
                                    : isLightMode
                                    ? 'text-slate-600 hover:text-slate-900'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                            title="Switch active tab to SQLite Database Query"
                        >
                            <span>🗄️ SQL</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setShowMetadataDrawer(!showMetadataDrawer)}
                        className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                            showMetadataDrawer
                                ? isLightMode
                                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                                    : 'bg-primary-600/30 border-primary-500 text-primary-300'
                                : isLightMode
                                ? 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900'
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
                <div className={`border-b px-4 py-2.5 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs animate-in slide-in-from-top-1 ${isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                    {/* Title (Mandatory) */}
                    <div className="md:col-span-2">
                        <label className={`text-[11px] font-bold flex items-center gap-1 mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                            <span>Problem Title</span>
                            <span className="text-rose-500 font-bold">*</span>
                            <span className="text-[10px] text-slate-400 font-normal">(Mandatory for saving)</span>
                        </label>
                        <input
                            type="text"
                            value={activeTab.metadata?.title || ''}
                            onChange={(e) => handleUpdateMetadata('title', e.target.value)}
                            placeholder="e.g. Factorial & Sum Calculation..."
                            className={`w-full px-2.5 py-1 border rounded text-xs focus:outline-none focus:border-primary-500 ${isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'}`}
                        />
                    </div>

                    {/* Subject / Course */}
                    <div>
                        <label className={`text-[11px] font-bold block mb-1 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                            Subject / Lab Course
                        </label>
                        <input
                            type="text"
                            value={activeTab.metadata?.subject || ''}
                            onChange={(e) => handleUpdateMetadata('subject', e.target.value)}
                            placeholder="e.g. Python Programming Lab"
                            className={`w-full px-2.5 py-1 border rounded text-xs focus:outline-none focus:border-primary-500 ${isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'}`}
                        />
                    </div>

                    {/* Student Info & Insert Docstring Action */}
                    <div className="flex items-end justify-between gap-2">
                        <div className="truncate">
                            <span className="text-[10px] text-slate-400 block">Student ID / Date</span>
                            <span className={`font-mono font-semibold text-xs ${isLightMode ? 'text-emerald-700' : 'text-emerald-400'}`}>
                                {activeTab.metadata?.studentId} • {activeTab.metadata?.date}
                            </span>
                        </div>

                        <button
                            onClick={handleInsertDocstringHeader}
                            className={`px-2.5 py-1 border rounded text-[11px] font-semibold transition cursor-pointer flex-shrink-0 ${isLightMode ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-primary-300'}`}
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
                <section className={`flex flex-col h-full border-r overflow-hidden ${isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                    {/* ERGONOMIC SUB-TOOLBAR DIRECTLY ABOVE EDITOR */}
                    <div className={`flex items-center justify-between px-3 py-2 border-b flex-shrink-0 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                        {/* Left: Active filename & Language switcher */}
                        <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs font-bold ${isLightMode ? 'text-primary-700' : 'text-emerald-400'}`}>
                                {activeTab.filename}
                            </span>
                            <div className="flex items-center p-0.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                                <button
                                    onClick={() => handleSwitchLanguage('python')}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                        activeTab.language === 'python'
                                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                    }`}
                                >
                                    🐍 Python
                                </button>
                                <button
                                    onClick={() => handleSwitchLanguage('sql')}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                        activeTab.language === 'sql'
                                            ? 'bg-sky-500 text-slate-950 shadow-xs'
                                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                    }`}
                                >
                                    🗄️ SQL
                                </button>
                            </div>
                            <span className="text-slate-400 hidden sm:inline">•</span>
                            <span className={`text-[11px] hidden sm:inline ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                {activeTab.language === 'python' ? 'Python 3.13 Sandbox' : (activeEngine === 'mysql' ? 'Persistent MySQL 9.3 Engine' : 'Persistent SQLite 3 Engine')}
                            </span>
                        </div>

                        {/* Center/Right: PROMINENT RUN CODE BUTTON ABOVE EDITOR + AUTOSAVE/SAVE CONTROL */}
                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={handleExecuteCode}
                                disabled={isExecuting}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black shadow-md transition disabled:opacity-50 cursor-pointer active:scale-95 ${
                                    activeTab.language === 'sql'
                                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/25'
                                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25'
                                }`}
                                title={activeTab.language === 'sql' ? 'Execute SQL queries against your SQLite database (Ctrl+Enter)' : 'Run active Python script (Ctrl+Enter)'}
                            >
                                <Play className={`w-3.5 h-3.5 fill-current ${isExecuting ? 'animate-spin' : ''}`} />
                                <span>
                                    {isExecuting
                                        ? 'Running...'
                                        : activeTab.language === 'sql'
                                        ? 'Run SQL Query'
                                        : 'Run Python Code'}
                                </span>
                                <kbd className={`text-[9px] px-1 py-0.2 rounded font-mono font-normal hidden sm:inline ${
                                    activeTab.language === 'sql' ? 'bg-sky-800/40 text-white' : 'bg-emerald-700/30 text-slate-950'
                                }`}>
                                    Ctrl+↵
                                </kbd>
                            </button>

                            {/* Hide Save button and show Autosave badge when autosave is ON */}
                            {isAutosaveEnabled ? (
                                <div
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold select-none border ${
                                        isLightMode
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    }`}
                                    title="Autosave is ON - your code is saved automatically"
                                >
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Autosave ON</span>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleSaveToDocuments(false)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer border ${
                                        isLightMode
                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-xs'
                                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                                    }`}
                                    title="Save to Documents (Ctrl+S)"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Save</span>
                                </button>
                            )}
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
                        <div className={`p-2.5 border-t ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                            <div className="flex items-center justify-between mb-1">
                                <label className={`text-[11px] font-semibold flex items-center gap-1 ${isLightMode ? 'text-indigo-700' : 'text-indigo-300'}`}>
                                    <Terminal className="w-3 h-3" />
                                    Standard Input (stdin for input() prompts)
                                </label>
                            </div>
                            <textarea
                                value={activeTab.stdin}
                                onChange={(e) => handleStdinChange(e.target.value)}
                                placeholder="Values entered here feed sequentially into input() calls..."
                                rows={2}
                                style={{ fontSize: `${fontSize}px` }}
                                className={`w-full p-2 border rounded font-mono focus:outline-none focus:border-indigo-500 resize-none ${
                                    isLightMode
                                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                                        : 'bg-slate-950 border-slate-700 text-slate-200 placeholder-slate-600'
                                }`}
                            />
                        </div>
                    )}
                </section>

                {/* RIGHT PANEL: COORDINATED OUTPUT & VISUAL FLOWCHART CANVAS */}
                <section className={`flex flex-col h-full overflow-hidden ${isLightMode ? 'bg-slate-50' : 'bg-slate-900/60'}`}>
                    {/* Tab Navigation Header */}
                    <div className={`flex items-center justify-between px-3 border-b flex-shrink-0 ${isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setRightPanelMode('output')}
                                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                                    rightPanelMode === 'output'
                                        ? isLightMode
                                            ? 'border-emerald-600 text-emerald-700'
                                            : 'border-emerald-500 text-emerald-400'
                                        : isLightMode
                                        ? 'border-transparent text-slate-500 hover:text-slate-800'
                                        : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Terminal className="w-3.5 h-3.5" />
                                <span>Output Screen ({activeTab.title})</span>
                                {activeTab.output?.durationMs !== undefined && (
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                        isLightMode ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-slate-800 text-slate-300'
                                    }`}>
                                        {activeTab.output.durationMs}ms
                                    </span>
                                )}
                            </button>

                            {/* SQL Structured Data Table Tab */}
                            {activeTab.language === 'sql' && (
                                <button
                                    onClick={() => setRightPanelMode('table')}
                                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                                        rightPanelMode === 'table'
                                            ? isLightMode
                                                ? 'border-sky-600 text-sky-700'
                                                : 'border-sky-500 text-sky-400'
                                            : isLightMode
                                            ? 'border-transparent text-slate-500 hover:text-slate-800'
                                            : 'border-transparent text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-sky-500" />
                                    <span>Database Tables & Results</span>
                                    {activeTab.output?.tables && activeTab.output.tables.length > 0 ? (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300 font-mono">
                                            {activeTab.output.tables.length} rows
                                        </span>
                                    ) : existingTables.length > 0 ? (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-mono">
                                            {existingTables.length} tables
                                        </span>
                                    ) : null}
                                </button>
                            )}

                            {/* Flowchart / Diagram Canvas Tab */}
                            <button
                                onClick={() => setRightPanelMode('diagram')}
                                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                                    rightPanelMode === 'diagram'
                                        ? isLightMode
                                            ? 'border-purple-600 text-purple-700'
                                            : 'border-purple-500 text-purple-400'
                                        : isLightMode
                                        ? 'border-transparent text-slate-500 hover:text-slate-800'
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
                            <div className="flex items-center gap-1 text-[11px] text-sky-500 font-medium">
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
                                                        : 'text-rose-500'
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
                                            style={{ fontSize: `${fontSize}px` }}
                                            className={`p-3 rounded-lg border whitespace-pre-wrap leading-relaxed select-text font-mono ${currentOutputTheme.stdoutClass}`}
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
                                        <div
                                            style={{ fontSize: `${fontSize}px` }}
                                            className="bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300 p-3 rounded-lg whitespace-pre-wrap leading-relaxed select-text font-mono"
                                        >
                                            <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400 mb-1 text-xs">
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
                                        <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[10px]">
                                            Ctrl+Enter
                                        </kbd>{' '}
                                        to execute this tab.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CONTENT 2: SQL STRUCTURED DATA TABLE & PERSISTENT DATABASE VIEWER */}
                    {rightPanelMode === 'table' && (
                        <div className="flex-1 flex flex-col p-4 overflow-auto">
                            {/* If query returned result rows */}
                            {activeTab.output?.tables && activeTab.output.tables.length > 0 ? (
                                <>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className={`text-xs font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>
                                            <FileSpreadsheet className="w-4 h-4 text-sky-500" />
                                            <span>Query Result Set ({activeTab.output.tables.length} rows)</span>
                                        </h3>
                                        <span className="text-[11px] text-slate-400 font-mono">
                                            {activeEngine === 'mysql' ? 'MySQL 9.3 Engine' : 'SQLite 3 Engine'}
                                        </span>
                                    </div>

                                    <div className={`flex-1 overflow-auto rounded-lg border shadow-xs ${isLightMode ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-950 shadow-inner'}`}>
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className={`border-b ${isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                                                    <th className="p-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-10 text-center">
                                                        #
                                                    </th>
                                                    {Object.keys(activeTab.output.tables[0] || {}).map((col) => (
                                                        <th
                                                            key={col}
                                                            className={`p-2.5 text-[11px] font-bold font-mono tracking-wider border-l ${isLightMode ? 'border-slate-200 text-sky-700' : 'border-slate-800 text-sky-400'}`}
                                                        >
                                                            {col}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y font-mono ${isLightMode ? 'divide-slate-200 text-slate-800' : 'divide-slate-800 text-slate-200'}`}>
                                                {activeTab.output.tables.map((row, idx) => (
                                                    <tr key={idx} className={`transition ${isLightMode ? 'hover:bg-slate-50' : 'hover:bg-slate-900/60'}`}>
                                                        <td className="p-2.5 text-[10px] text-slate-400 text-center select-none">
                                                            {idx + 1}
                                                        </td>
                                                        {Object.keys(row).map((col) => (
                                                            <td
                                                                key={col}
                                                                className={`p-2.5 border-l whitespace-nowrap ${isLightMode ? 'border-slate-200' : 'border-slate-800'}`}
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
                                </>
                            ) : (
                                /* Database Overview & Created Tables */
                                <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
                                    <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 mb-3">
                                        <Database className="w-6 h-6" />
                                    </div>
                                    <h3 className={`text-sm font-bold mb-1 ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>
                                        Persistent {activeEngine === 'mysql' ? 'MySQL' : 'SQLite'} Database
                                    </h3>
                                    <p className="text-xs text-slate-500 max-w-sm mb-4">
                                        Tables created in this studio are saved permanently in your private {activeEngine === 'mysql' ? 'MySQL schema' : 'SQLite database file'}.
                                    </p>

                                    {existingTables.length > 0 ? (
                                        <div className="w-full max-w-md text-left">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                                Your Created Tables ({existingTables.length})
                                            </h4>
                                            <div className="space-y-1.5 mb-4">
                                                {existingTables.map((tbl) => (
                                                    <div
                                                        key={tbl}
                                                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono ${
                                                            isLightMode
                                                                ? 'bg-slate-50 border-slate-200 text-slate-800'
                                                                : 'bg-slate-900 border-slate-800 text-slate-200'
                                                        }`}
                                                    >
                                                        <span className="font-semibold text-sky-600 dark:text-sky-400">{tbl}</span>
                                                        <button
                                                            onClick={() => {
                                                                handleCodeChange(`SELECT * FROM ${tbl};`);
                                                                setTimeout(handleExecuteCode, 100);
                                                            }}
                                                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition cursor-pointer"
                                                        >
                                                            SELECT *
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                handleCodeChange(`-- Create sample students table\nCREATE TABLE IF NOT EXISTS students (\n    id INTEGER PRIMARY KEY,\n    name TEXT NOT NULL,\n    department TEXT\n);\n\nINSERT OR IGNORE INTO students VALUES \n(101, 'Aarav Sharma', 'Computer Science'),\n(102, 'Priya Patel', 'Data Science');\n\nSELECT * FROM students;`);
                                                setTimeout(handleExecuteCode, 100);
                                            }}
                                            className="px-4 py-2 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md transition cursor-pointer"
                                        >
                                            Create Sample Students Table
                                        </button>
                                    )}
                                </div>
                            )}
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
                                theme={isLightMode ? 'light' : 'dark'}
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

            {/* Traditional Save As Dialog Modal */}
            <SaveAsDialogModal
                isOpen={showSaveAsModal}
                onClose={() => setShowSaveAsModal(false)}
                onSave={executeSaveToDocuments}
                currentFileName={activeTab.filename || ''}
                currentLanguage={activeTab.language}
                currentTitle={activeTab.metadata?.title || ''}
                currentDescription={activeTab.metadata?.description || ''}
                studentIdentifier={studentIdentifier}
                existingDocs={existingDocs}
            />

            {/* Practice SQL Database Engine Modal */}
            <DatabaseEngineModal
                isOpen={showEngineModal}
                onClose={() => setShowEngineModal(false)}
                isDarkMode={!isLightMode}
                onEngineChanged={(newCfg) => {
                    setActiveEngine(newCfg.activeEngine || 'mysql');
                }}
            />

            {/* Student Work Inspector & Review Studio Modal */}
            <StudentWorkInspectorModal
                isOpen={showInspectorModal}
                onClose={() => setShowInspectorModal(false)}
                isDarkMode={!isLightMode}
                initialStudentId={inspectingStudentId}
                onOpenInIDE={(stId) => {
                    setInspectingStudentId(stId);
                    setShowInspectorModal(false);
                }}
            />

            {/* Student Feedback & AI Suggestions Drawer */}
            <StudentFeedbackDrawer
                isOpen={showFeedbackDrawer}
                onClose={() => setShowFeedbackDrawer(false)}
                reviewData={{ latestReview: latestStudentReview }}
                isDarkMode={!isLightMode}
            />
        </div>
    );
}

export default function PracticeIDEPageWrapper() {
    return (
        <Suspense
            fallback={
                <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-slate-300 font-mono text-xs">
                    Loading Python & SQL Practice Studio...
                </div>
            }
        >
            <PracticeIDEPage />
        </Suspense>
    );
}
