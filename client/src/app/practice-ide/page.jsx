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
    Calendar,
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
    Edit2,
    Edit3,
    ArrowRight,
    CornerDownRight,
    Layers,
    Monitor,
    FileText,
    ChevronUp,
    X,
    UserCheck,
    AlertTriangle,
    Workflow,
    Undo2,
    Redo2,
    Search,
    Maximize2,
    Minimize2,
    WrapText,
    ListOrdered,
    Square,
    Bug
} from 'lucide-react';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import { useAuthStore } from '@/lib/store';
import { compilerAPI, documentsAPI, foldersAPI } from '@/lib/api';
import { generateFlowchartFromCode, generateRelationalErDiagram, generateErDiagramFromSql, generateRelationalErDiagramFromSql } from '@/lib/traditionalGenerators';
import IDEMenuBar from '@/components/IDEMenuBar';
import FlowchartVisualCanvas from '@/components/FlowchartVisualCanvas';
import DocumentCodeBrowserModal from '@/components/DocumentCodeBrowserModal';
import SaveAsDialogModal from '@/components/SaveAsDialogModal';
import DatabaseEngineModal from '@/components/DatabaseEngineModal';
import StudentWorkInspectorModal from '@/components/StudentWorkInspectorModal';
import StudentFeedbackDrawer from '@/components/StudentFeedbackDrawer';
import MermaidRenderer from '@/components/MermaidRenderer';
import FindReplaceModal from '@/components/FindReplaceModal';
import ExportBundleModal from '@/components/ExportBundleModal';
import DebugVariableInspectorModal from '@/components/DebugVariableInspectorModal';

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
        id: 'light',
        label: 'Clean Daylight (Paper White)',
        containerClass: 'bg-slate-50 text-slate-900 border-slate-300 font-mono',
        stdoutClass: 'bg-white border-slate-200 text-slate-900 shadow-xs',
        headerClass: 'bg-slate-100 border-slate-200 text-slate-700',
        accentText: 'text-primary-600'
    },
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
    }
];

// Supported Programming and Database Languages
const SUPPORTED_LANGUAGES = [
    { id: 'python', label: 'Python 3', icon: '🐍', ext: '.py', category: 'algorithmic', monaco: 'python', desc: 'Python 3.13 Sandbox' },
    { id: 'c', label: 'C', icon: '⚡', ext: '.c', category: 'algorithmic', monaco: 'c', desc: 'C (GCC 13.2)' },
    { id: 'cpp', label: 'C++', icon: '🔷', ext: '.cpp', category: 'algorithmic', monaco: 'cpp', desc: 'C++ (G++ 13.2)' },
    { id: 'java', label: 'Java', icon: '☕', ext: '.java', category: 'algorithmic', monaco: 'java', desc: 'Java 22 (OpenJDK)' },
    { id: 'sql', label: 'SQL', icon: '🗄️', ext: '.sql', category: 'database', monaco: 'sql', desc: 'Relational SQL Engine' },
    { id: 'plsql', label: 'PL/SQL', icon: '📜', ext: '.pls', category: 'database', monaco: 'sql', desc: 'Procedural SQL' }
];

const STARTER_CODES = {
    python: `# Python Practice Script\n# Calculate Factorial & Sum of 1..N\n\nn = int(input("Enter positive number N: "))\ntotal_sum = 0\nfactorial = 1\ni = 1\n\nwhile i <= n:\n    total_sum = total_sum + i\n    factorial = factorial * i\n    i = i + 1\n\nprint("Sum of 1 to", n, "is:", total_sum)\nprint("Factorial of", n, "is:", factorial)\n`,
    c: `// C Practice Program\n#include <stdio.h>\n\nint main() {\n    int n, i;\n    int total_sum = 0;\n    long long factorial = 1;\n\n    printf("Enter positive number N: ");\n    if (scanf("%d", &n) != 1) return 1;\n\n    for (i = 1; i <= n; i++) {\n        total_sum += i;\n        factorial *= i;\n    }\n\n    printf("Sum of 1 to %d is: %d\\n", n, total_sum);\n    printf("Factorial of %d is: %lld\\n", n, factorial);\n    return 0;\n}\n`,
    cpp: `// C++ Practice Program\n#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cout << "Enter positive number N: ";\n    if (!(cin >> n)) return 1;\n\n    int total_sum = 0;\n    long long factorial = 1;\n\n    for (int i = 1; i <= n; i++) {\n        total_sum += i;\n        factorial *= i;\n    }\n\n    cout << "Sum of 1 to " << n << " is: " << total_sum << endl;\n    cout << "Factorial of " << n << " is: " << factorial << endl;\n    return 0;\n}\n`,
    java: `// Java Practice Program\nimport java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print("Enter positive number N: ");\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n\n        int totalSum = 0;\n        long factorial = 1;\n\n        for (int i = 1; i <= n; i++) {\n            totalSum += i;\n            factorial *= i;\n        }\n\n        System.out.println("Sum of 1 to " + n + " is: " + totalSum);\n        System.out.println("Factorial of " + n + " is: " + factorial);\n    }\n}\n`,
    sql: `-- SQL Practice Script\n-- Tables created here are stored permanently in your personal database!\n\nCREATE TABLE IF NOT EXISTS students (\n    id INTEGER PRIMARY KEY,\n    name TEXT NOT NULL,\n    department TEXT\n);\n\nINSERT OR IGNORE INTO students VALUES \n(101, 'Aarav Sharma', 'Computer Science'),\n(102, 'Priya Patel', 'Data Science');\n\nSELECT * FROM students;\n`,
    plsql: `-- PL/SQL Procedural Script\n-- Declare, Begin, and Exception handling block\n\nDECLARE\n    v_student_count INTEGER;\nBEGIN\n    SELECT COUNT(*) INTO v_student_count FROM students;\n    DBMS_OUTPUT.PUT_LINE('Total enrolled students: ' || v_student_count);\nEND;\n/`
};

const CODE_SNIPPETS = {
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

const isDatabaseLanguage = (lang) => lang === 'sql' || lang === 'plsql';
const getLanguageMeta = (lang) => SUPPORTED_LANGUAGES.find((l) => l.id === lang) || SUPPORTED_LANGUAGES[0];
const getMonacoLanguage = (lang) => getLanguageMeta(lang).monaco;

// Helper to determine next free available program number (e.g. program 1, program 2, ...)
const getNextProgramNumber = (existingTabs = []) => {
    const usedNumbers = new Set();
    const regex = /^program\s*(\d+)/i;
    for (const tab of existingTabs) {
        const titleMatch = (tab.title || '').match(regex);
        if (titleMatch) {
            usedNumbers.add(parseInt(titleMatch[1], 10));
        }
        const fileMatch = (tab.filename || '').match(regex);
        if (fileMatch) {
            usedNumbers.add(parseInt(fileMatch[1], 10));
        }
    }
    let n = 1;
    while (usedNumbers.has(n)) {
        n++;
    }
    return n;
};

// Default Initial Code Tab (Dynamic program n free number, no student name/date in filename)
const createDefaultTab = (id, lang = 'python', studentId = 'STU', studentName = 'Student', programNumber = 1) => {
    const isDb = isDatabaseLanguage(lang);
    const dateStr = new Date().toISOString().split('T')[0];
    const meta = getLanguageMeta(lang);
    const ext = isDb ? (lang === 'plsql' ? '.sql' : '.sql') : meta.ext;
    const initialHeaderComment = isDb
        ? `-- Program: program ${programNumber}\n-- Language: ${meta.label}\n\n`
        : `# Program: program ${programNumber}\n# Language: ${meta.label}\n\n`;

    return {
        id,
        title: `program ${programNumber}`,
        filename: `program ${programNumber}${ext}`,
        language: lang,
        code: initialHeaderComment,
        stdin: '',
        metadata: {
            title: `program ${programNumber}`,
            description: '',
            subject: isDb ? 'Database Management' : `${meta.label} Programming`,
            studentId,
            studentName,
            date: dateStr
        },
        documentId: null,
        output: null,
        flowchartData: { nodes: [], connectors: [] },
        isDirty: false
    };
};

const getOrCreateDiagramForTab = (tab, liveCode) => {
    const code = liveCode !== undefined ? liveCode : (tab?.code || '');
    if (tab?.flowchartData && Array.isArray(tab.flowchartData.nodes) && tab.flowchartData.nodes.length > 0) {
        return tab.flowchartData;
    }
    if (!code || !code.trim()) {
        return { nodes: [], connectors: [] };
    }
    try {
        const lang = tab?.language || 'python';
        if (isDatabaseLanguage(lang)) {
            const rel = generateRelationalErDiagramFromSql(code);
            if (rel?.nodes?.length > 0) return rel;
            const chen = generateErDiagramFromSql(code);
            if (chen?.nodes?.length > 0) return chen;
        } else {
            const fc = generateFlowchartFromCode(code, lang);
            if (fc?.nodes?.length > 0) return fc;
        }
    } catch (e) {
        console.warn('[IDE] Auto diagram generation warning:', e.message);
    }
    return { nodes: [], connectors: [] };
};

function PracticeIDEPage() {
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

    // 1. MULTI-TAB SYSTEM (Max 5 tabs) - Initial tabs default to both Python and SQL with program 1 and program 2
    const [tabs, setTabs] = useState(() => [
        createDefaultTab('tab_py', 'python', studentIdentifier, studentDisplayName, 1),
        createDefaultTab('tab_sql', 'sql', studentIdentifier, studentDisplayName, 2)
    ]);
    const [activeTabId, setActiveTabId] = useState(urlLang === 'sql' ? 'tab_sql' : 'tab_py');
    const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

    const tabsRef = useRef(tabs);
    tabsRef.current = tabs;
    const activeTabIdRef = useRef(activeTabId);
    activeTabIdRef.current = activeTabId;
    const isCommittingRenameRef = useRef(false);
    const isSavingTabRef = useRef({});
    const isProgrammaticUpdateRef = useRef(false);
    const [showFindReplaceModal, setShowFindReplaceModal] = useState(false);
    const [showExportBundleModal, setShowExportBundleModal] = useState(false);
    const [showDebugModal, setShowDebugModal] = useState(false);
    const executionAbortControllerRef = useRef(null);

    // Autosave Toggle & Flashing Disappearing Indicator
    const [isAutosaveEnabled, setIsAutosaveEnabled] = useState(true);
    const [autosaveStatus, setAutosaveStatus] = useState('saved'); // 'saved' | 'saving'
    const [lastAutosavedAt, setLastAutosavedAt] = useState(null);
    const autosaveTimerRef = useRef(null);
    const tabAutosaveTimersRef = useRef({});
    const [autosaveFlash, setAutosaveFlash] = useState({ visible: false, status: 'saved', text: '' });
    const autosaveFlashTimerRef = useRef(null);

    // Problem Details / Metadata Drawer (Collapsed by default on mobile < lg)
    const [showMetadataDrawer, setShowMetadataDrawer] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth >= 1024;
        }
        return false;
    });

    // Collapsible stdin input on mobile
    const [isStdinOpen, setIsStdinOpen] = useState(false);

    // Document Browser & Save As Modals
    const [showDocBrowserModal, setShowDocBrowserModal] = useState(false);
    const [showSaveAsModal, setShowSaveAsModal] = useState(false);

    // File Datetime Info Popover State
    const [showFileInfoPopover, setShowFileInfoPopover] = useState(false);
    const fileInfoPopoverRef = useRef(null);

    useEffect(() => {
        if (!showFileInfoPopover) return;
        const handleClickOutside = (e) => {
            if (fileInfoPopoverRef.current && !fileInfoPopoverRef.current.contains(e.target)) {
                setShowFileInfoPopover(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showFileInfoPopover]);
    const [existingDocs, setExistingDocs] = useState([]);

    // Inline Tab Rename State
    const [editingTabId, setEditingTabId] = useState(null);
    const [editingTabLocation, setEditingTabLocation] = useState(null); // 'tab' | 'subtoolbar' | null
    const [editingTabTitle, setEditingTabTitle] = useState('');

    // Monaco Cursor Position tracking for Input Status Bar
    const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });

    // Intercept harmless Monaco Editor cancellation promises ('ERR Canceled: Canceled')
    useEffect(() => {
        const handleUnhandledRejection = (event) => {
            const reason = event.reason;
            if (
                reason?.name === 'Canceled' ||
                reason?.message === 'Canceled' ||
                (typeof reason === 'string' && reason.includes('Canceled'))
            ) {
                // Harmless Monaco cancellation token abortion during typing or tab switching; prevent unhandled rejection overlay
                event.preventDefault();
            }
        };
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    }, []);

    // Fetch existing documents to detect filename duplicates in same folder
    const loadExistingDocs = useCallback(async () => {
        try {
            const res = await documentsAPI.getAll({ category: 'code' });
            const rawDocs = res.data?.data;
            const list = Array.isArray(rawDocs)
                ? rawDocs
                : Array.isArray(rawDocs?.documents)
                ? rawDocs.documents
                : res.data?.documents || res.data || [];
            setExistingDocs(Array.isArray(list) ? list : []);
        } catch (err) {
            console.warn('Failed to load documents list:', err.message);
        }
    }, []);

    // Absolute Path Resolver for Program Tabs (displayed on hover and quick rename)
    const getTabAbsolutePath = useCallback(
        (tab) => {
            if (!tab) return '';
            const safeUser = (user?.id || studentIdentifier || 'student').replace(/[^a-zA-Z0-9_-]/g, '_');
            const fname = tab.filename || `${tab.title || 'program'}.${tab.language === 'sql' ? 'sql' : 'py'}`;
            return `/Users/charanpreetsingh/Downloads/LabRecManager/server/storage/workspaces/students/${safeUser}/${fname}`;
        },
        [user?.id, studentIdentifier]
    );

    // Execution state
    const [isExecuting, setIsExecuting] = useState(false);
    const [rightPanelMode, setRightPanelMode] = useState('output'); // 'output' | 'table' | 'diagram'

    // Responsive Mobile Views ('code_output' | 'editor' | 'diagram')
    const [mobileView, setMobileView] = useState('code_output');

    // Python Tutor style interactive in-console stdin input state
    const [consoleInputText, setConsoleInputText] = useState('');

    // Socket.IO Interactive Compiler State (for sequential input() prompting)
    const socketRef = useRef(null);
    const [activePrompt, setActivePrompt] = useState(null); // { sessionId: string, prompt: string }
    const [promptValue, setPromptValue] = useState('');
    const promptInputRef = useRef(null);

    // UI-aligned Custom Confirmation Modals (Replacing browser alert/confirm)
    const [tabToCloseConfirm, setTabToCloseConfirm] = useState(null);
    const [showResetDbModal, setShowResetDbModal] = useState(false);

    // Themes - Light theme by default for both input and output/flowchart
    const [editorTheme, setEditorTheme] = useState('vs');
    const [outputThemeId, setOutputThemeId] = useState('light');
    const currentOutputTheme = OUTPUT_THEMES.find((t) => t.id === outputThemeId) || OUTPUT_THEMES.find((t) => t.id === 'light') || OUTPUT_THEMES[0];
    const [fontSize, setFontSize] = useState(14);
    const isLightMode = outputThemeId === 'light' || editorTheme === 'vs' || editorTheme === 'light';

    // Persistent student Database Engine (MySQL / TiDB Cloud)
    const [activeEngine, setActiveEngine] = useState('mysql');
    const [showEngineModal, setShowEngineModal] = useState(false);
    const [existingTables, setExistingTables] = useState([]);
    const [isResettingDb, setIsResettingDb] = useState(false);
    const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);

    // Student Work Inspection & Review Studio
    const [showInspectorModal, setShowInspectorModal] = useState(false);
    const [studentsList, setStudentsList] = useState([]);
    const [inspectingStudentId, setInspectingStudentId] = useState(null);
    const [inspectingStudentInfo, setInspectingStudentInfo] = useState(null);

    // Student Review Feedback Drawer & Badge
    const [showFeedbackDrawer, setShowFeedbackDrawer] = useState(false);
    const [latestStudentReview, setLatestStudentReview] = useState(null);

    // Debugger Gutter Breakpoints (Line numbers)
    const [debuggerBreakpoints, setDebuggerBreakpoints] = useState([6]);
    const handleToggleBreakpoint = (line) => {
        const lineNum = typeof line === 'number' ? line : parseInt(line, 10);
        if (isNaN(lineNum) || lineNum < 1) return;
        setDebuggerBreakpoints((prev) =>
            prev.includes(lineNum) ? prev.filter((l) => l !== lineNum) : [...prev, lineNum].sort((a, b) => a - b)
        );
    };

    // Major Code Editor Features
    const [isWordWrapOn, setIsWordWrapOn] = useState(true);
    const [isLineNumbersOn, setIsLineNumbersOn] = useState(true);
    const [isMinimapOn, setIsMinimapOn] = useState(false);
    const [isEditorMaximized, setIsEditorMaximized] = useState(false);
    const [showSnippetsMenu, setShowSnippetsMenu] = useState(false);
    const snippetsMenuRef = useRef(null);

    // Close snippets menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (snippetsMenuRef.current && !snippetsMenuRef.current.contains(e.target)) {
                setShowSnippetsMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Socket.IO Interactive Compiler Connection
    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001');
        const socket = io(socketUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });
        socketRef.current = socket;

        socket.on('compiler:stdout', ({ sessionId, text }) => {
            setTabs((prevTabs) =>
                prevTabs.map((t) => {
                    if (t.id === sessionId) {
                        const curOut = t.output || { stdout: '', stderr: '', exitCode: null, durationMs: 0 };
                        return {
                            ...t,
                            output: {
                                ...curOut,
                                stdout: (curOut.stdout || '') + text
                            }
                        };
                    }
                    return t;
                })
            );
        });

        socket.on('compiler:stderr', ({ sessionId, text }) => {
            setTabs((prevTabs) =>
                prevTabs.map((t) => {
                    if (t.id === sessionId) {
                        const curOut = t.output || { stdout: '', stderr: '', exitCode: null, durationMs: 0 };
                        return {
                            ...t,
                            output: {
                                ...curOut,
                                stderr: (curOut.stderr || '') + text
                            }
                        };
                    }
                    return t;
                })
            );
        });

        socket.on('compiler:prompt', ({ sessionId, prompt }) => {
            setActivePrompt({ sessionId, prompt: typeof prompt === 'string' ? prompt : '' });
            setPromptValue('');
            setTimeout(() => {
                if (promptInputRef.current) {
                    promptInputRef.current.focus();
                }
            }, 60);
        });

        socket.on('compiler:exit', ({ sessionId, exitCode, durationMs, existingTables: newTables }) => {
            setIsExecuting(false);
            setActivePrompt((prev) => (prev?.sessionId === sessionId ? null : prev));
            setTabs((prevTabs) =>
                prevTabs.map((t) => {
                    if (t.id === sessionId) {
                        const curOut = t.output || { stdout: '', stderr: '', exitCode: null, durationMs: 0 };
                        return {
                            ...t,
                            output: {
                                ...curOut,
                                exitCode: exitCode ?? 0,
                                durationMs: durationMs || curOut.durationMs || 0
                            }
                        };
                    }
                    return t;
                })
            );
            if (newTables && Array.isArray(newTables) && newTables.length > 0) {
                setExistingTables(newTables);
            }
        });

        return () => {
            if (socket) socket.disconnect();
        };
    }, []);

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
        if (!_hasHydrated) return;
        let isMounted = true;

        // Fallback safety timeout so splash screen never hangs
        const safetyTimer = setTimeout(() => {
            if (isMounted) setIsLoadingWorkspace(false);
        }, 2000);

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

                // Check if opened with urlDocId
                let urlDocLoaded = null;
                if (urlDocId) {
                    try {
                        const docRes = await documentsAPI.getById(urlDocId);
                        const docData = docRes.data?.data?.document || docRes.data?.data || docRes.data;
                        let codeText = '';
                        try {
                            const fileRes = await documentsAPI.getFileContent(urlDocId);
                            codeText = typeof fileRes.data === 'string' ? fileRes.data : String(fileRes.data || '');
                        } catch (_) {}
                        if (docData) {
                            const fileName = docData.fileName || docData.name || 'practice.py';
                            const isSql = fileName.endsWith('.sql') || docData.category === 'sql';
                            urlDocLoaded = {
                                docData,
                                fileName,
                                codeText: codeText || (isSql ? '-- SQL script\n' : '# Python script\n'),
                                lang: isSql ? 'sql' : 'python',
                                updatedAt: docData.updatedAt || docData.createdAt
                            };
                        }
                    } catch (e) {
                        console.warn('Could not pre-load urlDocId in workspace:', e.message);
                    }
                }

                const params = inspectingStudentId ? { studentId: inspectingStudentId } : {};
                const response = await compilerAPI.getWorkspace(params);

                if (response.data?.success && isMounted) {
                    const ws = response.data.data;

                    if (ws.editorTheme && (ws.editorTheme === 'vs' || ws.editorTheme === 'light')) {
                        setEditorTheme(ws.editorTheme);
                    } else {
                        setEditorTheme('vs');
                    }
                    if (ws.outputTheme && ws.outputTheme === 'light') {
                        setOutputThemeId(ws.outputTheme);
                    } else {
                        setOutputThemeId('light');
                    }
                    if (ws.existingTables) setExistingTables(ws.existingTables);
                    if (ws.isAutosaveEnabled !== undefined) setIsAutosaveEnabled(ws.isAutosaveEnabled);
                    if (ws.updatedAt) setLastAutosavedAt(ws.updatedAt);
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
                                        const docRes = await Promise.race([
                                            documentsAPI.getFileContent(tab.documentId),
                                            new Promise((_, reject) => setTimeout(() => reject(new Error('fetch_timeout')), 2500))
                                        ]);
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

                        if (urlDocLoaded) {
                            const existingIdx = finalTabs.findIndex((t) => t.documentId === urlDocId);
                            if (existingIdx !== -1) {
                                finalTabs[existingIdx] = {
                                    ...finalTabs[existingIdx],
                                    title: urlDocLoaded.fileName.replace(/\.(py|sql)$/i, ''),
                                    filename: urlDocLoaded.fileName,
                                    language: urlDocLoaded.lang,
                                    code: urlDocLoaded.codeText,
                                    lastSavedAt: urlDocLoaded.updatedAt,
                                    isDirty: false
                                };
                                setActiveTabId(finalTabs[existingIdx].id);
                            } else {
                                const newId = `tab_${Date.now()}`;
                                const newTab = createDefaultTab(newId, urlDocLoaded.lang, studentIdentifier, studentDisplayName);
                                newTab.title = urlDocLoaded.fileName.replace(/\.(py|sql)$/i, '');
                                newTab.filename = urlDocLoaded.fileName;
                                newTab.code = urlDocLoaded.codeText;
                                newTab.documentId = urlDocId;
                                newTab.lastSavedAt = urlDocLoaded.updatedAt;
                                newTab.isDirty = false;
                                finalTabs = [newTab, ...finalTabs];
                                setActiveTabId(newId);
                            }
                            if (urlDocLoaded.updatedAt) setLastAutosavedAt(urlDocLoaded.updatedAt);
                        } else {
                            if (urlLang === 'sql') {
                                const sqlTab = finalTabs.find((t) => t.language === 'sql');
                                if (sqlTab) setActiveTabId(sqlTab.id);
                            } else if (ws.activeTabId && finalTabs.some((t) => t.id === ws.activeTabId)) {
                                setActiveTabId(ws.activeTabId);
                            } else {
                                setActiveTabId(finalTabs[0].id);
                            }
                        }

                        finalTabs = finalTabs.map((t) => ({
                            ...t,
                            flowchartData: getOrCreateDiagramForTab(t, t.code)
                        }));

                        setTabs(finalTabs);
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
            } finally {
                if (isMounted) {
                    setIsLoadingWorkspace(false);
                    if (typeof window !== 'undefined') {
                        window.__workspaceHydrated = true;
                    }
                }
            }
        }

        loadWorkspace();
        loadExistingDocs();

        return () => {
            isMounted = false;
            clearTimeout(safetyTimer);
        };
    }, [_hasHydrated, isAuthenticated, inspectingStudentId, isInstructorOrAdmin, studentIdentifier, studentDisplayName, loadExistingDocs, urlLang, urlDocId]);

    // Auto-load document if opened with ?docId=... after initial workspace hydration
    useEffect(() => {
        if (!urlDocId || isLoadingWorkspace) return;
        const currentTabs = tabsRef.current || tabs;
        if (currentTabs.some(t => t.documentId === urlDocId && t.id === activeTabId)) {
            return; // Already loaded and active tab
        }
        let isMounted = true;
        async function fetchUrlDoc() {
            try {
                const docRes = await documentsAPI.getById(urlDocId);
                const docData = docRes.data?.data?.document || docRes.data?.data || docRes.data;
                let codeText = '';
                try {
                    const fileRes = await documentsAPI.getFileContent(urlDocId);
                    codeText = typeof fileRes.data === 'string' ? fileRes.data : String(fileRes.data || '');
                } catch (fetchErr) {
                    if (docData?.url) {
                        try {
                            const directUrl = docData.url.startsWith('http') || docData.url.startsWith('/') ? docData.url : `/${docData.url}`;
                            const directRes = await fetch(directUrl);
                            if (directRes.ok) codeText = await directRes.text();
                        } catch (_) {}
                    }
                }
                const fileName = docData?.fileName || docData?.name || 'practice.py';
                const isSql = fileName.endsWith('.sql') || docData?.category === 'sql';
                const lang = isSql ? 'sql' : 'python';

                const docUpdatedAt = docData?.updatedAt || docData?.createdAt;

                if (isMounted) {
                    if (docUpdatedAt) setLastAutosavedAt(docUpdatedAt);
                    handleOpenDocumentContent({
                        name: fileName,
                        code: codeText || (isSql ? '-- SQL script\n' : '# Python script\n'),
                        language: lang,
                        documentId: urlDocId,
                        description: docData?.description,
                        updatedAt: docUpdatedAt,
                        asNewTab: false
                    });
                }
            } catch (err) {
                console.warn('URL doc load failed:', err.message);
            }
        }
        fetchUrlDoc();
        return () => { isMounted = false; };
    }, [urlDocId, isLoadingWorkspace]);

    // Auto-save Program to Appropriate Documents Folder (Coding files / Python or Coding files / SQL)
    const saveProgramToAppropriateFolder = useCallback(
        async (tabToSave) => {
            if (!tabToSave || inspectingStudentId) return null;
            // Prevent creating 0-byte blank documents if no real code exists yet
            if (!tabToSave.code || !tabToSave.code.trim()) {
                return null;
            }
            // Prevent duplicate parallel save operations on the same tab
            if (isSavingTabRef.current[tabToSave.id]) {
                return null;
            }
            isSavingTabRef.current[tabToSave.id] = true;

            const isSql = isDatabaseLanguage(tabToSave.language);
            const targetSubfolderName = isSql ? 'SQL' : 'Python';
            const ext = isSql ? '.sql' : '.py';
            let fileName = tabToSave.filename || `program 1${ext}`;
            if (!fileName.toLowerCase().endsWith(ext)) {
                fileName = `${fileName}${ext}`;
            }

            try {
                // 1. Resolve or Create Main Folder "Coding files" and Subfolder ("Python" or "SQL")
                const foldersRes = await foldersAPI.getAll({ all: 'true' });
                const rawFolders = foldersRes.data?.data;
                const foldersList = Array.isArray(rawFolders)
                    ? rawFolders
                    : Array.isArray(rawFolders?.folders)
                    ? rawFolders.folders
                    : [];

                let codingFilesFolder = foldersList.find(
                    (f) => !f.parentId && f.name?.toLowerCase() === 'coding files'
                );
                if (!codingFilesFolder) {
                    try {
                        const createRootRes = await foldersAPI.create({
                            name: 'Coding files',
                            color: '#6366f1'
                        });
                        codingFilesFolder = createRootRes.data?.data?.folder || createRootRes.data?.data;
                    } catch (_) {
                        codingFilesFolder = foldersList.find((f) => f.name?.toLowerCase() === 'coding files');
                    }
                }

                let targetFolder = foldersList.find(
                    (f) => f.name?.toLowerCase() === targetSubfolderName.toLowerCase() &&
                           (codingFilesFolder?.id ? f.parentId === codingFilesFolder.id : true)
                );

                if (!targetFolder) {
                    try {
                        const createFolderRes = await foldersAPI.create({
                            name: targetSubfolderName,
                            parentId: codingFilesFolder?.id || undefined,
                            color: isSql ? '#0284c7' : '#f59e0b'
                        });
                        targetFolder = createFolderRes.data?.data?.folder || createFolderRes.data?.data;
                    } catch (_) {
                        targetFolder = foldersList.find((f) => f.name?.toLowerCase() === targetSubfolderName.toLowerCase());
                    }
                }

                // 2. Upload file to Documents
                const fileBlob = new Blob([tabToSave.code || ''], { type: 'text/plain;charset=utf-8' });
                const fileObj = new File([fileBlob], fileName, { type: 'text/plain' });

                const tabDiagram = getOrCreateDiagramForTab(tabToSave, tabToSave.code);
                const metaPayload = {
                    summary: `${tabToSave.title || fileName} - Auto-saved program`.trim(),
                    problemTitle: tabToSave.metadata?.title || tabToSave.title || fileName,
                    problemDescription: tabToSave.metadata?.description || '',
                    flowchartData: tabDiagram,
                    output: tabToSave.output || null,
                    stdin: tabToSave.stdin || '',
                    rightPanelMode: rightPanelMode || 'output',
                    language: tabToSave.language || 'python'
                };

                const uploadRes = await documentsAPI.upload(fileObj, {
                    name: fileName,
                    description: JSON.stringify(metaPayload),
                    category: 'code',
                    folderId: targetFolder?.id,
                    overwrite: true,
                    existingDocumentId: tabToSave.documentId || undefined
                });

                const savedDoc = uploadRes.data?.data?.document || uploadRes.data?.data;
                const newDocId = savedDoc?.id || tabToSave.documentId;

                // 3. Update tab with documentId in tabs state and storage immediately without clobbering live code
                const saveTimestamp = new Date().toISOString();
                if (newDocId) {
                    const currentActiveId = activeTabIdRef.current || activeTabId;
                    const liveCodeNow = (editorRef.current && currentActiveId === tabToSave.id)
                        ? editorRef.current.getValue()
                        : ((tabsRef.current || []).find((t) => t.id === tabToSave.id)?.code ?? tabToSave.code);
                    const userTypedMore = liveCodeNow !== tabToSave.code;
                    const finalCode = userTypedMore ? liveCodeNow : tabToSave.code;

                    if (userTypedMore && isAutosaveEnabled) {
                        if (tabAutosaveTimersRef.current[tabToSave.id]) {
                            clearTimeout(tabAutosaveTimersRef.current[tabToSave.id]);
                        }
                        tabAutosaveTimersRef.current[tabToSave.id] = setTimeout(() => {
                            triggerSaveWorkspace();
                            delete tabAutosaveTimersRef.current[tabToSave.id];
                        }, 1200);
                    }

                    if (tabsRef.current) {
                        tabsRef.current = tabsRef.current.map((t) =>
                            t.id === tabToSave.id
                                ? {
                                      ...t,
                                      filename: fileName,
                                      code: finalCode,
                                      documentId: newDocId,
                                      folderId: targetFolder?.id,
                                      flowchartData: tabDiagram,
                                      createdAt: t.createdAt || saveTimestamp,
                                      lastSavedAt: saveTimestamp,
                                      isDirty: userTypedMore
                                  }
                                : t
                        );
                    }

                    setTabs((prevTabs) => {
                        const nextTabs = prevTabs.map((t) =>
                            t.id === tabToSave.id
                                ? {
                                      ...t,
                                      filename: fileName,
                                      code: finalCode,
                                      documentId: newDocId,
                                      folderId: targetFolder?.id,
                                      flowchartData: tabDiagram,
                                      createdAt: t.createdAt || saveTimestamp,
                                      lastSavedAt: saveTimestamp,
                                      isDirty: userTypedMore
                                  }
                                : t
                        );

                        // Persist new documentId directly to workspace storage
                        compilerAPI.saveWorkspace({
                            tabs: nextTabs,
                            activeTabId: activeTabIdRef.current || activeTabId,
                            isAutosaveEnabled,
                            editorTheme,
                            outputTheme: outputThemeId
                        }).catch(() => {});

                        return nextTabs;
                    });
                }

                loadExistingDocs();
                return newDocId;
            } catch (err) {
                console.warn('[IDE] Auto-save program to folder warning:', err?.message);
                return null;
            } finally {
                delete isSavingTabRef.current[tabToSave.id];
            }
        },
        [inspectingStudentId, loadExistingDocs, isAutosaveEnabled, editorTheme, outputThemeId, activeTabId]
    );

    // 3. Debounced Autosave (saves tabs, active tab, and output to server and local)
    const triggerSaveWorkspace = useCallback(
        async (updatedTabs, updatedActiveId, autosaveState) => {
            if (inspectingStudentId) return; // Do not overwrite when inspecting another student

            const tabsToSave = updatedTabs || tabsRef.current || tabs;
            const activeIdToSave = updatedActiveId || activeTabIdRef.current || activeTabId;
            const isAuto = autosaveState !== undefined ? autosaveState : isAutosaveEnabled;
            const nowIso = new Date().toISOString();

            if (typeof window !== 'undefined') {
                localStorage.setItem(`ulrms_ide_tabs_${user?.id || 'guest'}`, JSON.stringify(tabsToSave));
            }

            try {
                // 1. Save workspace state to server
                await compilerAPI.saveWorkspace({
                    tabs: tabsToSave,
                    activeTabId: activeIdToSave,
                    isAutosaveEnabled: isAuto,
                    editorTheme,
                    outputTheme: outputThemeId
                });

                // 2. Auto-sync dirty tabs with linked documents directly to PostgreSQL
                let documentSyncFailed = false;
                const currentActiveTab = (tabsRef.current || tabsToSave).find((t) => t.id === activeIdToSave);
                const activeLiveCode = (editorRef.current && activeIdToSave === (activeTabIdRef.current || activeTabId))
                    ? editorRef.current.getValue()
                    : currentActiveTab?.code;

                for (const tab of tabsToSave) {
                    const isTabActive = tab.id === activeIdToSave;
                    const tabCode = isTabActive ? activeLiveCode : tab.code;

                    if (tab.documentId && (tab.isDirty || (isTabActive && tabCode !== tab.code)) && tabCode && tabCode.trim()) {
                        if (isSavingTabRef.current[tab.id]) continue;
                        isSavingTabRef.current[tab.id] = true;
                        try {
                            const fileBlob = new Blob([tabCode], { type: 'text/plain;charset=utf-8' });
                            const fileObj = new File([fileBlob], tab.filename || 'script.txt', { type: 'text/plain' });
                            const tabDiagram = getOrCreateDiagramForTab(tab, tabCode);
                            const metaPayload = {
                                summary: `${tab.metadata?.title || tab.title || tab.filename} - Auto-saved program`.trim(),
                                problemTitle: tab.metadata?.title || tab.title || '',
                                problemDescription: tab.metadata?.description || '',
                                flowchartData: tabDiagram,
                                output: tab.output || null,
                                stdin: tab.stdin || '',
                                rightPanelMode: rightPanelMode || 'output',
                                language: tab.language || 'python'
                            };

                            const uploadRes = await documentsAPI.upload(fileObj, {
                                name: tab.filename,
                                description: JSON.stringify(metaPayload),
                                category: 'code',
                                folderId: tab.folderId,
                                overwrite: true,
                                existingDocumentId: tab.documentId
                            });

                            const savedDoc = uploadRes.data?.data?.document || uploadRes.data?.data;
                            const resolvedDocId = savedDoc?.id || tab.documentId;

                            const liveCodeNow = (editorRef.current && (activeTabIdRef.current || activeTabId) === tab.id)
                                ? editorRef.current.getValue()
                                : ((tabsRef.current || []).find((t) => t.id === tab.id)?.code ?? tabCode);
                            const userTypedMore = liveCodeNow !== tabCode;
                            const finalCode = userTypedMore ? liveCodeNow : tabCode;

                            if (userTypedMore && isAuto) {
                                if (tabAutosaveTimersRef.current[tab.id]) {
                                    clearTimeout(tabAutosaveTimersRef.current[tab.id]);
                                }
                                tabAutosaveTimersRef.current[tab.id] = setTimeout(() => {
                                    triggerSaveWorkspace();
                                    delete tabAutosaveTimersRef.current[tab.id];
                                }, 1200);
                            }

                            if (tabsRef.current) {
                                tabsRef.current = tabsRef.current.map((t) =>
                                    t.id === tab.id
                                    ? { ...t, code: finalCode, documentId: resolvedDocId, flowchartData: tabDiagram, isDirty: userTypedMore, lastSavedAt: nowIso, createdAt: t.createdAt || nowIso }
                                    : t
                                );
                            }
                            setTabs((prevTabs) =>
                                prevTabs.map((t) =>
                                    t.id === tab.id
                                    ? { ...t, code: finalCode, documentId: resolvedDocId, flowchartData: tabDiagram, isDirty: userTypedMore, lastSavedAt: nowIso, createdAt: t.createdAt || nowIso }
                                    : t
                                )
                            );
                        } catch (docSyncErr) {
                            console.warn('[Autosave] Document sync error:', docSyncErr.message);
                            documentSyncFailed = true;
                        } finally {
                            delete isSavingTabRef.current[tab.id];
                        }
                    } else if (isTabActive && !tab.documentId && tabCode && tabCode.trim() && isAuto) {
                        await saveProgramToAppropriateFolder({ ...tab, code: tabCode });
                    }
                }

                loadExistingDocs();

                if (!documentSyncFailed) {
                    setLastAutosavedAt(nowIso);
                    setAutosaveStatus('saved');
                    setAutosaveFlash({ visible: true, status: 'saved', text: 'Autosaved' });
                } else {
                    setAutosaveStatus('error');
                    setAutosaveFlash({ visible: true, status: 'error', text: 'Save failed' });
                }
                if (autosaveFlashTimerRef.current) clearTimeout(autosaveFlashTimerRef.current);
                autosaveFlashTimerRef.current = setTimeout(() => {
                    setAutosaveFlash({ visible: false, status: 'saved', text: '' });
                }, 2500);
            } catch (e) {
                console.warn('[Autosave] Workspace save notice:', e.message);
                setAutosaveStatus('error');
                setAutosaveFlash({ visible: true, status: 'error', text: 'Save error' });
                if (autosaveFlashTimerRef.current) clearTimeout(autosaveFlashTimerRef.current);
                autosaveFlashTimerRef.current = setTimeout(() => {
                    setAutosaveFlash({ visible: false, status: 'saved', text: '' });
                }, 2500);
            }
        },
        [isAutosaveEnabled, editorTheme, outputThemeId, user?.id, inspectingStudentId, loadExistingDocs, saveProgramToAppropriateFolder]
    );

    // Code change handler (Per-tab debounced autosave prevents cursor repositioning and isolates changes per file)
    const handleCodeChange = (newCode) => {
        if (inspectingStudentId) return;
        if (isProgrammaticUpdateRef.current) return;
        const val = newCode || '';
        const currentActiveId = activeTabIdRef.current || activeTabId;

        setTabs((prevTabs) => {
            const nextTabs = prevTabs.map((t) => (t.id === currentActiveId ? { ...t, code: val, isDirty: true } : t));
            tabsRef.current = nextTabs;

            if (isAutosaveEnabled) {
                setAutosaveStatus('saving');
                setAutosaveFlash({ visible: true, status: 'saving', text: 'Autosaving...' });
                if (tabAutosaveTimersRef.current[currentActiveId]) {
                    clearTimeout(tabAutosaveTimersRef.current[currentActiveId]);
                }
                tabAutosaveTimersRef.current[currentActiveId] = setTimeout(async () => {
                    await triggerSaveWorkspace(tabsRef.current || nextTabs, currentActiveId);
                    delete tabAutosaveTimersRef.current[currentActiveId];
                }, 2000);
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
        const currentActiveId = activeTabIdRef.current || activeTabId;
        setTabs((prevTabs) =>
            prevTabs.map((t) => (t.id === currentActiveId || t.id === activeTab.id ? { ...t, stdin: newStdin } : t))
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
        const isSql = isDatabaseLanguage(newLang);
        const nextNum = getNextProgramNumber(currentTabs);
        const newTab = createDefaultTab(newId, newLang, studentIdentifier, studentDisplayName, nextNum);
        newTab.title = `program ${nextNum}`;
        newTab.filename = `program ${nextNum}.${isSql ? 'sql' : 'py'}`;

        const updatedTabs = [...currentTabs, newTab];
        tabsRef.current = updatedTabs;
        setTabs(updatedTabs);
        setActiveTabId(newId);
        activeTabIdRef.current = newId;

        if (editorRef.current) {
            isProgrammaticUpdateRef.current = true;
            editorRef.current.setValue(newTab.code || '');
            setTimeout(() => {
                isProgrammaticUpdateRef.current = false;
            }, 100);
        }

        triggerSaveWorkspace(updatedTabs, newId);
        toast.success(`Created program ${nextNum} (${isSql ? 'SQL' : 'Python'})`);
    };

    // Major Editor Action Handlers
    const handleFormatCode = async () => {
        if (!editorRef.current) return;
        try {
            const formatAction = editorRef.current.getAction('editor.action.formatDocument');
            if (formatAction) {
                await formatAction.run();
                toast.success('Document formatted cleanly!', { icon: '✨' });
            } else {
                toast('Auto-format not available for this mode');
            }
        } catch (err) {
            console.warn('Format warning:', err);
        }
    };

    const handleUndo = () => {
        if (editorRef.current) {
            editorRef.current.trigger('keyboard', 'undo', null);
        }
    };

    const handleRedo = () => {
        if (editorRef.current) {
            editorRef.current.trigger('keyboard', 'redo', null);
        }
    };

    const handleFind = () => {
        setShowFindReplaceModal((prev) => !prev);
    };

    const handleCopyCode = async () => {
        if (!activeTab?.code) {
            toast.error('No code in active editor to copy');
            return;
        }
        try {
            await navigator.clipboard.writeText(activeTab.code);
            toast.success(`Copied ${activeTab.filename || 'code'} to clipboard!`, { icon: '📋' });
        } catch {
            toast.error('Could not copy code');
        }
    };

    const handleInsertSnippet = (snippetOrCode, langHint, options = {}) => {
        setShowSnippetsMenu(false);
        const isObject = typeof snippetOrCode === 'object' && snippetOrCode !== null;
        const codeText = isObject ? snippetOrCode.code : snippetOrCode;
        const snippetLabel = isObject ? snippetOrCode.label : (options.label || 'Snippet');
        const isInlineOnly = options.inlineOnly || false;

        const currentTabs = tabsRef.current || tabs;
        const activeTabObj = currentTabs.find((t) => t.id === activeTabId) || activeTab;

        // If explicitly inline or if user made a text selection in editor, insert into selection
        const editor = editorRef.current;
        const selection = editor ? editor.getSelection() : null;
        const hasTextSelected = selection && !selection.isEmpty();

        if (isInlineOnly || hasTextSelected) {
            if (editor) {
                const model = editor.getModel();
                const range = hasTextSelected ? selection : (model ? model.getFullModelRange() : null);
                if (range) {
                    editor.executeEdits('snippet', [{ range, text: codeText, forceMoveMarkers: true }]);
                    editor.focus();
                    handleCodeChange(editor.getValue());
                    toast.success('Inserted code snippet!');
                }
            }
            return;
        }

        // If active tab is pristine empty initial tab, load snippet directly into active tab
        const isPristineEmptyTab =
            currentTabs.length === 1 &&
            !activeTabObj?.documentId &&
            !activeTabObj?.isDirty &&
            (!activeTabObj?.code ||
                activeTabObj.code.trim() === '' ||
                activeTabObj.code.includes('Online Python & MySQL Practice Sandbox') ||
                activeTabObj.code.includes('MySQL Practice Console'));

        const targetLang = langHint || (codeText?.includes('CREATE TABLE') || codeText?.includes('SELECT') ? 'sql' : 'python');
        const ext = targetLang === 'sql' ? '.sql' : '.py';
        const cleanName = snippetLabel.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').toLowerCase();
        const snippetFileName = `${cleanName || 'snippet'}${ext}`;

        if (isPristineEmptyTab) {
            isProgrammaticUpdateRef.current = true;
            if (editor) editor.setValue(codeText);
            setTimeout(() => {
                isProgrammaticUpdateRef.current = false;
            }, 300);

            const updatedTabs = currentTabs.map((t) =>
                t.id === activeTabObj.id
                    ? {
                          ...t,
                          title: snippetLabel,
                          filename: snippetFileName,
                          language: targetLang,
                          code: codeText,
                          isDirty: false,
                          metadata: { ...t.metadata, title: snippetLabel }
                      }
                    : t
            );
            tabsRef.current = updatedTabs;
            setTabs(updatedTabs);
            triggerSaveWorkspace(updatedTabs, activeTabObj.id);
            toast.success(`Loaded snippet "${snippetLabel}"!`, { icon: '✨' });
            return;
        }

        // Otherwise ALWAYS open in a NEW TAB (preserving existing open program tab)
        if (currentTabs.length >= 5) {
            toast.error('Cannot open snippet in new tab: Maximum 5 tabs reached. Please close a tab first.');
            return;
        }

        const newId = `tab_${Date.now()}`;
        const newTab = createDefaultTab(newId, targetLang, studentIdentifier, studentDisplayName);
        newTab.title = snippetLabel;
        newTab.filename = snippetFileName;
        newTab.code = codeText;
        newTab.language = targetLang;
        newTab.metadata.title = snippetLabel;
        newTab.isDirty = false;

        const updatedTabs = [...currentTabs, newTab];
        tabsRef.current = updatedTabs;
        setTabs(updatedTabs);
        setActiveTabId(newId);
        activeTabIdRef.current = newId;
        triggerSaveWorkspace(updatedTabs, newId);
        toast.success(`Opened "${snippetLabel}" in new tab!`, { icon: '✨' });
    };

    const handleCloseTab = async (tabIdToClose, e) => {
        if (e) e.stopPropagation();
        console.log('[handleCloseTab] Starting close for tabId:', tabIdToClose);
        const currentTabs = tabsRef.current || tabs;
        if (currentTabs.length <= 1) {
            toast.error('At least one tab must remain open.');
            return;
        }

        const tabToClose = currentTabs.find((t) => t.id === tabIdToClose);
        if (!tabToClose) {
            console.warn('[handleCloseTab] tabToClose not found in currentTabs:', tabIdToClose, currentTabs.map(t => t.id));
            return;
        }

        if (tabToClose.isDirty && !isAutosaveEnabled) {
            console.log('[handleCloseTab] Tab is dirty without autosave. Showing confirmation.');
            setTabToCloseConfirm(tabToClose);
            return;
        }

        // Cancel pending debounced timer for this tab
        if (tabAutosaveTimersRef.current[tabIdToClose]) {
            clearTimeout(tabAutosaveTimersRef.current[tabIdToClose]);
            delete tabAutosaveTimersRef.current[tabIdToClose];
        }

        const curActiveId = activeTabIdRef.current || activeTabId;
        // Get latest editor code if closing active tab
        const liveCode = (curActiveId === tabIdToClose && editorRef.current)
            ? editorRef.current.getValue()
            : (tabToClose.code || '');

        // Persist code before closing tab so changes are never lost
        if (tabToClose.documentId && liveCode && liveCode.trim()) {
            try {
                console.log('[handleCloseTab] Syncing document before close:', tabToClose.filename);
                const fileBlob = new Blob([liveCode], { type: 'text/plain;charset=utf-8' });
                const fileObj = new File([fileBlob], tabToClose.filename || 'script.txt', { type: 'text/plain' });
                const tabDiagram = getOrCreateDiagramForTab(tabToClose, liveCode);
                const metaPayload = {
                    summary: `${tabToClose.metadata?.title || tabToClose.title || tabToClose.filename} - Auto-saved program`.trim(),
                    problemTitle: tabToClose.metadata?.title || tabToClose.title || '',
                    problemDescription: tabToClose.metadata?.description || '',
                    flowchartData: tabDiagram,
                    output: tabToClose.output || null,
                    stdin: tabToClose.stdin || '',
                    rightPanelMode: rightPanelMode || 'output',
                    language: tabToClose.language || 'python'
                };
                await documentsAPI.upload(fileObj, {
                    name: tabToClose.filename,
                    description: JSON.stringify(metaPayload),
                    category: 'code',
                    folderId: tabToClose.folderId,
                    overwrite: true,
                    existingDocumentId: tabToClose.documentId
                });
            } catch (err) {
                console.warn('[handleCloseTab] Failed to sync document before closing:', err.message);
            }
        } else if (!tabToClose.documentId && liveCode && liveCode.trim() && isAutosaveEnabled) {
            try {
                console.log('[handleCloseTab] Saving program to folder before close:', tabToClose.filename);
                await saveProgramToAppropriateFolder({ ...tabToClose, code: liveCode });
            } catch (err) {
                console.warn('[handleCloseTab] Failed to save program to folder before closing:', err.message);
            }
        }

        console.log('[handleCloseTab] Now calling executeCloseTab for:', tabIdToClose);
        executeCloseTab(tabIdToClose);
    };

    const handleSelectTab = (targetTabId) => {
        if (targetTabId === activeTabId) return;
        const currentTabs = tabsRef.current || tabs;
        if (editorRef.current) {
            const liveVal = editorRef.current.getValue();
            const updated = currentTabs.map((t) => (t.id === activeTabId ? { ...t, code: liveVal } : t));
            tabsRef.current = updated;
            setTabs(updated);
        }
        setActiveTabId(targetTabId);
        activeTabIdRef.current = targetTabId;

        const targetTab = (tabsRef.current || currentTabs).find((t) => t.id === targetTabId);
        if (targetTab && editorRef.current) {
            isProgrammaticUpdateRef.current = true;
            editorRef.current.setValue(targetTab.code || '');
            setTimeout(() => {
                isProgrammaticUpdateRef.current = false;
            }, 100);
        }
    };

    const executeCloseTab = (tabIdToClose) => {
        console.log('[executeCloseTab] Closing tabId:', tabIdToClose);
        const currentTabs = tabsRef.current || tabs;
        const updatedTabs = currentTabs.filter((t) => t.id !== tabIdToClose);
        const currentActiveId = activeTabIdRef.current || activeTabId;
        let nextActiveId = currentActiveId;
        if (currentActiveId === tabIdToClose) {
            nextActiveId = updatedTabs[0]?.id || '';
            setActiveTabId(nextActiveId);
            activeTabIdRef.current = nextActiveId;
            const targetTab = updatedTabs[0];
            if (targetTab && editorRef.current) {
                isProgrammaticUpdateRef.current = true;
                editorRef.current.setValue(targetTab.code || '');
                setTimeout(() => {
                    isProgrammaticUpdateRef.current = false;
                }, 100);
            }
        }

        tabsRef.current = updatedTabs;
        setTabs(updatedTabs);
        triggerSaveWorkspace(updatedTabs, nextActiveId);
        setTabToCloseConfirm(null);
        toast.success('Tab closed');
    };

    // Switch Language of Active Tab
    const handleSwitchLanguage = (newLang) => {
        if (activeTab.language === newLang) return;
        const meta = getLanguageMeta(newLang);
        const dateStr = new Date().toISOString().split('T')[0];
        const updatedFilename = activeTab.filename
            ? (activeTab.filename.includes('.') ? activeTab.filename.replace(/\.[a-zA-Z0-9]+$/i, meta.ext) : `${activeTab.filename}${meta.ext}`)
            : `${studentIdentifier}_${dateStr}${meta.ext}`;

        // Check if code is default or empty
        const isDefaultCode = !activeTab.code || activeTab.code.trim().length === 0 ||
            activeTab.code.includes('Practice Script') ||
            activeTab.code.includes('Practice Program') ||
            activeTab.code.includes('Calculate Factorial & Sum');

        const newCode = isDefaultCode
            ? (STARTER_CODES[newLang] || STARTER_CODES.python)
            : activeTab.code;

        const isDb = isDatabaseLanguage(newLang);
        const currentTabs = tabsRef.current || tabs;
        const updatedTabs = currentTabs.map((t) =>
            t.id === activeTabId
                ? {
                      ...t,
                      language: newLang,
                      filename: updatedFilename,
                      title: isDefaultCode ? (isDb ? (newLang === 'plsql' ? 'PL/SQL Block' : 'Student Schema') : `${meta.label} Program`) : t.title,
                      code: newCode,
                      output: null,
                      metadata: {
                          ...t.metadata,
                          title: isDefaultCode ? (isDb ? 'Database Management Schema' : `${meta.label} Program`) : t.metadata?.title,
                          subject: isDb ? 'Database Management' : `${meta.label} Programming`
                      }
                  }
                : t
        );
        setTabs(updatedTabs);
        triggerSaveWorkspace(updatedTabs, activeTabId);
        toast.success(`Switched active tab to ${meta.label} (${isDb ? 'ER Diagram Designer' : 'Flowchart Designer'})`);
    };

    // Inline Tab Rename: updates title & synchronized filename immediately and non-blockingly
    const handleCommitTabRename = async (tabId) => {
        if (isCommittingRenameRef.current) return;
        isCommittingRenameRef.current = true;

        try {
            const trimmed = (editingTabTitle || '').trim();
            setEditingTabId(null);
            setEditingTabLocation(null);
            if (!trimmed) return;

            const currentTabs = tabsRef.current || tabs;
            const currentTab = currentTabs.find((t) => t.id === tabId);
            if (!currentTab) return;

            const ext = currentTab.language === 'sql' ? '.sql' : '.py';
            let newFilename = trimmed;
            if (!newFilename.toLowerCase().endsWith(ext)) {
                newFilename = `${newFilename.replace(/\.[^/.]+$/, '')}${ext}`;
            }
            const cleanTitle = trimmed.replace(new RegExp(`\\${ext}$`, 'i'), '');

            // Do not notify or save if name is identical
            if (cleanTitle === currentTab.title && newFilename === currentTab.filename) {
                return;
            }

            // Reject duplicate tab name
            const duplicateTab = currentTabs.find(
                (t) => t.id !== tabId &&
                       (t.filename?.toLowerCase() === newFilename.toLowerCase() ||
                        t.title?.toLowerCase() === cleanTitle.toLowerCase())
            );
            if (duplicateTab) {
                toast.error(`A tab with the name "${newFilename}" is already open.`);
                return;
            }

            // 1. Immediately update local tabs state
            const updatedTabs = currentTabs.map((t) => {
                if (t.id !== tabId) return t;
                return {
                    ...t,
                    title: cleanTitle,
                    filename: newFilename,
                    metadata: {
                        ...(t.metadata || {}),
                        title: cleanTitle
                    }
                };
            });

            tabsRef.current = updatedTabs;
            setTabs(updatedTabs);
            triggerSaveWorkspace(updatedTabs);
            toast.success(`Renamed program to ${newFilename}`);

            // 2. If this program is already saved in Documents, sync its name in the background
            if (currentTab.documentId) {
                try {
                    await documentsAPI.update(currentTab.documentId, {
                        name: newFilename,
                        fileName: newFilename
                    });
                    loadExistingDocs();
                } catch (docErr) {
                    console.warn('[IDE] Non-blocking document rename sync:', docErr?.message);
                    if (docErr?.response?.status === 409 || docErr?.response?.data?.message?.includes('already exists')) {
                        toast.error(docErr?.response?.data?.message || `A document named "${newFilename}" already exists in this folder.`);
                    }
                }
            }
        } finally {
            setTimeout(() => {
                isCommittingRenameRef.current = false;
            }, 100);
        }
    };

    // 5. Execute Code (Coordinated with Active Tab Output)
    const handleExecuteCode = async (overrideStdin = null) => {
        const currentActiveId = activeTabIdRef.current || activeTabId;
        const currentTab = (tabsRef.current || tabs).find((t) => t.id === currentActiveId) || activeTab;
        const codeToExecute = editorRef.current ? editorRef.current.getValue() : (currentTab?.code || '');
        if (!codeToExecute.trim()) {
            toast.error('Active editor tab is empty. Please write code to run.');
            return;
        }

        setIsExecuting(true);
        setActivePrompt(null);
        setPromptValue('');
        setRightPanelMode('output');
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setMobileView('code_output');
        }

        const isPython = currentTab.language === 'python' || currentTab.language === 'python3';
        if (isPython && socketRef.current) {
            // Live Interactive Socket Execution
            setTabs((prevTabs) =>
                prevTabs.map((t) =>
                    (t.id === currentActiveId || t.id === activeTab.id)
                        ? {
                              ...t,
                              output: { stdout: '', stderr: '', exitCode: null, durationMs: 0, runner: 'interactive-python' }
                          }
                        : t
                )
            );

            socketRef.current.emit('compiler:run', {
                sessionId: currentActiveId,
                code: codeToExecute,
                language: 'python3',
                userId: user?.id || studentIdentifier || 'guest'
            });
            return;
        }

        const effectiveStdin = typeof overrideStdin === 'string'
            ? overrideStdin
            : (!isDatabaseLanguage(currentTab.language) ? (currentTab.stdin || '') : '');

        try {
            const controller = new AbortController();
            executionAbortControllerRef.current = controller;
            const response = await compilerAPI.execute({
                language: isDatabaseLanguage(currentTab.language) ? (currentTab.language === 'plsql' ? 'plsql' : 'sql') : (currentTab.language === 'python' ? 'python3' : currentTab.language),
                code: codeToExecute,
                stdin: effectiveStdin
            }, { signal: controller.signal });

            if (response.data && response.data.success) {
                const resData = response.data.data;

                // Update active tab output (and stdin if overridden)
                setTabs((prevTabs) => {
                    const nextTabs = prevTabs.map((t) => ((t.id === currentActiveId || t.id === activeTab.id) ? {
                        ...t,
                        stdin: typeof overrideStdin === 'string' ? overrideStdin : t.stdin,
                        output: resData
                    } : t));
                    tabsRef.current = nextTabs;
                    return nextTabs;
                });

                if (resData.existingTables) {
                    setExistingTables(resData.existingTables);
                }

                if (resData.stderr && !resData.stdout) {
                    toast.error('Execution encountered an error');
                } else {
                    toast.success(`Executed Tab "${currentTab.title}" (${resData.durationMs || 0}ms)`);
                }
            }
        } catch (err) {
            if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
                toast('Execution cancelled (Ctrl+C)', { icon: '⏹️' });
                return;
            }
            const errMsg = err.response?.data?.message || err.message || 'Execution failed';
            setTabs((prevTabs) => {
                const nextTabs = prevTabs.map((t) =>
                    (t.id === currentActiveId || t.id === activeTab.id)
                        ? {
                              ...t,
                              stdin: typeof overrideStdin === 'string' ? overrideStdin : t.stdin,
                              output: { stdout: '', stderr: errMsg, exitCode: 1, durationMs: 0 }
                          }
                        : t
                );
                tabsRef.current = nextTabs;
                return nextTabs;
            });
            toast.error(errMsg);
        } finally {
            executionAbortControllerRef.current = null;
            setIsExecuting(false);
        }
    };

    // Submit value for active input() prompt
    const handlePromptSubmit = (e) => {
        if (e) e.preventDefault();
        if (!activePrompt || !socketRef.current) return;

        const rawVal = promptValue;
        // Do not process empty string or whitespace-only inputs; program waits until a non-empty value is received
        if (!rawVal || !rawVal.trim()) {
            toast('Please enter a value (empty inputs or spaces are ignored)', { icon: '⏳', duration: 1500 });
            return;
        }

        const val = rawVal.trim();
        const sId = activePrompt.sessionId;
        const promptText = activePrompt.prompt || '';

        // Immediately append prompt and user's input line to the console stdout stream
        setTabs((prevTabs) =>
            prevTabs.map((t) => {
                if (t.id === sId) {
                    const curOut = t.output || { stdout: '', stderr: '', exitCode: null, durationMs: 0 };
                    const echoLine = promptText ? `${promptText}${val}\n` : `${val}\n`;
                    return {
                        ...t,
                        output: {
                            ...curOut,
                            stdout: (curOut.stdout || '') + echoLine
                        }
                    };
                }
                return t;
            })
        );

        // Send value to running Python process
        socketRef.current.emit('compiler:stdin', {
            sessionId: sId,
            value: val
        });

        setActivePrompt(null);
        setPromptValue('');
    };

    // Kill currently executing program
    const handleStopExecution = () => {
        const currentActiveId = activeTabIdRef.current || activeTabId;
        if (socketRef.current) {
            socketRef.current.emit('compiler:kill', { sessionId: currentActiveId });
        }
        if (executionAbortControllerRef.current) {
            try {
                executionAbortControllerRef.current.abort();
            } catch (_) {}
            executionAbortControllerRef.current = null;
        }
        setIsExecuting(false);
        setActivePrompt(null);
        setPromptValue('');
        toast('Execution stopped (Ctrl+C)', { icon: '⏹️' });
    };

    // Python Tutor style interactive in-console stdin input handler
    const handleSendConsoleInput = (inputVal) => {
        if (activePrompt) {
            handlePromptSubmit();
            return;
        }
        const inputDomVal = typeof document !== 'undefined'
            ? document.querySelector('input[data-console-stdin="true"]')?.value ||
              document.querySelector('input[placeholder*="stdin"]')?.value ||
              document.querySelector('input[placeholder*="Type program input"]')?.value || ''
            : '';
        const val = inputVal !== undefined ? inputVal : (consoleInputText || inputDomVal || '');
        const currentActiveId = activeTabIdRef.current || activeTabId;
        const currentTab = (tabsRef.current || tabs).find((t) => t.id === currentActiveId) || activeTab;
        if (!val.trim() && !currentTab?.stdin) return;

        const nextStdin = currentTab?.stdin ? `${currentTab.stdin}\n${val}` : val;
        handleStdinChange(nextStdin);
        setConsoleInputText('');
        handleExecuteCode(nextStdin);
    };

    // 6. Save to Documents
    const executeSaveToDocuments = async ({ fileName, folderName, language, problemTitle, problemDescription }) => {
        const toastId = toast.loading(`Saving "${fileName}" to Documents...`);

        // Synchronously capture target tab, tab ID, and live code BEFORE any async network yields
        const currentActiveId = activeTabIdRef.current || activeTabId;
        const currentTabs = tabsRef.current || tabs;
        const targetTab = currentTabs.find((t) => t.id === currentActiveId) || activeTab;
        const targetTabId = targetTab?.id;
        const currentCode = (editorRef.current && (activeTabIdRef.current || activeTabId) === targetTabId)
            ? editorRef.current.getValue()
            : (targetTab?.code ?? '');

        if (targetTabId) {
            if (tabAutosaveTimersRef.current[targetTabId]) {
                clearTimeout(tabAutosaveTimersRef.current[targetTabId]);
                delete tabAutosaveTimersRef.current[targetTabId];
            }
            if (isSavingTabRef.current[targetTabId]) {
                toast.error('A save operation is already in progress for this file.', { id: toastId });
                return null;
            }
            isSavingTabRef.current[targetTabId] = true;
        }

        try {
            // 1. Resolve or Create Main Folder "Coding files" and Subfolder ("Python" or "SQL")
            const targetFolderName = folderName || (language === 'sql' ? 'SQL' : 'Python');
            const foldersRes = await foldersAPI.getAll({ all: 'true' });
            const rawFolders = foldersRes.data?.data;
            const foldersList = Array.isArray(rawFolders)
                ? rawFolders
                : Array.isArray(rawFolders?.folders)
                ? rawFolders.folders
                : [];

            let codingFilesFolder = foldersList.find(
                (f) => !f.parentId && f.name?.toLowerCase() === 'coding files'
            );
            if (!codingFilesFolder) {
                try {
                    const createRootRes = await foldersAPI.create({
                        name: 'Coding files',
                        color: '#6366f1'
                    });
                    codingFilesFolder = createRootRes.data?.data?.folder || createRootRes.data?.data;
                } catch (_) {
                    codingFilesFolder = foldersList.find((f) => f.name?.toLowerCase() === 'coding files');
                }
            }

            let targetFolder = foldersList.find(
                (f) => f.name?.toLowerCase() === targetFolderName.toLowerCase() &&
                       (codingFilesFolder?.id ? f.parentId === codingFilesFolder.id : true)
            );

            if (!targetFolder) {
                try {
                    const createFolderRes = await foldersAPI.create({
                        name: targetFolderName,
                        parentId: codingFilesFolder?.id || undefined,
                        color: language === 'sql' ? '#0284c7' : '#f59e0b'
                    });
                    targetFolder = createFolderRes.data?.data?.folder || createFolderRes.data?.data;
                } catch (_) {
                    targetFolder = foldersList.find((f) => f.name?.toLowerCase() === targetFolderName.toLowerCase());
                }
            }

            // 2. Upload file with captured code and full associated IDE bundle (diagram, output, stdin)
            const fileBlob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
            const fileObj = new File([fileBlob], fileName, { type: 'text/plain' });

            const tabDiagram = getOrCreateDiagramForTab(targetTab, currentCode);
            const metaPayload = {
                summary: `${problemTitle || ''} - ${problemDescription || ''}`.trim(),
                problemTitle: problemTitle || targetTab?.metadata?.title || targetTab?.title || '',
                problemDescription: problemDescription !== undefined ? problemDescription : targetTab?.metadata?.description || '',
                flowchartData: tabDiagram,
                output: targetTab?.output || null,
                stdin: targetTab?.stdin || '',
                rightPanelMode: rightPanelMode || 'output',
                language: language || targetTab?.language || 'python'
            };

            const uploadRes = await documentsAPI.upload(fileObj, {
                name: fileName,
                description: JSON.stringify(metaPayload),
                category: 'code',
                folderId: targetFolder?.id,
                overwrite: true,
                existingDocumentId: targetTab?.documentId || undefined
            });

            const savedDoc = uploadRes.data?.data?.document || uploadRes.data?.data;
            const newDocId = savedDoc?.id || targetTab?.documentId;

            // 3. Mark active tab clean and update metadata using captured targetTabId without clobbering faster live typing
            const liveCodeNow = (editorRef.current && (activeTabIdRef.current || activeTabId) === targetTabId)
                ? editorRef.current.getValue()
                : ((tabsRef.current || []).find((t) => t.id === targetTabId)?.code ?? currentCode);
            const userTypedMore = liveCodeNow !== currentCode;
            const finalCode = userTypedMore ? liveCodeNow : currentCode;

            if (userTypedMore && isAutosaveEnabled) {
                if (tabAutosaveTimersRef.current[targetTabId]) {
                    clearTimeout(tabAutosaveTimersRef.current[targetTabId]);
                }
                tabAutosaveTimersRef.current[targetTabId] = setTimeout(() => {
                    triggerSaveWorkspace();
                    delete tabAutosaveTimersRef.current[targetTabId];
                }, 1200);
            }

            const nowTabs = tabsRef.current || tabs;
            const nextTabs = nowTabs.map((t) =>
                t.id === targetTabId
                    ? {
                          ...t,
                          filename: fileName,
                          language: language || t.language,
                          title: problemTitle || t.title,
                          code: finalCode,
                          documentId: newDocId,
                          folderId: targetFolder?.id,
                          flowchartData: tabDiagram,
                          metadata: {
                              ...t.metadata,
                              title: problemTitle || t.metadata?.title || '',
                              description: problemDescription !== undefined ? problemDescription : t.metadata?.description || ''
                          },
                          isDirty: userTypedMore,
                          lastSavedAt: new Date().toISOString()
                      }
                    : t
            );
            tabsRef.current = nextTabs;
            setTabs(nextTabs);
            await triggerSaveWorkspace(nextTabs, activeTabIdRef.current || activeTabId);

            toast.success(`Saved to Documents / ${targetFolderName} / ${fileName}!`, { id: toastId });
            loadExistingDocs();
            return savedDoc;
        } catch (err) {
            console.error('Save to documents error:', err);
            toast.error('Failed to save to Documents: ' + (err.response?.data?.message || err.message), { id: toastId });
            throw err;
        } finally {
            if (targetTabId) {
                delete isSavingTabRef.current[targetTabId];
            }
        }
    };

    const handleSaveToDocuments = async (openAsDialog = false) => {
        loadExistingDocs();
        const currentActiveId = activeTabIdRef.current || activeTabId;
        const currentTab = (tabsRef.current || tabs).find((t) => t.id === currentActiveId) || activeTab;

        // If explicitly requested via Save As or if no filename exists
        if (openAsDialog || !currentTab?.filename) {
            setShowSaveAsModal(true);
            return null;
        }

        // Direct quick-save with existing filename
        const ext = currentTab.language === 'sql' ? 'sql' : 'py';
        const folder = currentTab.language === 'sql' ? 'SQL' : 'Python';
        const fileName = currentTab.filename.endsWith(`.${ext}`) ? currentTab.filename : `${currentTab.filename}.${ext}`;

        return await executeSaveToDocuments({
            fileName,
            folderName: folder,
            language: currentTab.language,
            problemTitle: currentTab.title || currentTab.filename,
            problemDescription: currentTab.metadata?.description || ''
        });
    };

    // 7. Open Document from Browser into Tab (Switches to existing tab if already open, loads into pristine empty tab, or opens in a NEW tab)
    const handleOpenDocumentContent = ({ name, code, language: docLang, asNewTab, docId, documentId, folderId, description, createdAt, updatedAt }) => {
        const resolvedDocId = docId || documentId || null;
        const currentTabs = tabsRef.current || tabs;
        const safeCode = typeof code === 'string' && code.length > 0 ? code : (docLang === 'sql' ? '-- SQL script\n' : '# Python script\n');
        const nowIso = new Date().toISOString();
        const fileCreatedAt = createdAt || updatedAt || nowIso;
        const fileUpdatedAt = updatedAt || createdAt || nowIso;

        const savedTimeStr = updatedAt
            ? `(Last saved: ${new Date(updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
            : '';

        // Parse saved metadata bundle from document description if present
        let metaObj = null;
        if (description) {
            try {
                const parsed = typeof description === 'string' ? JSON.parse(description) : description;
                if (parsed && typeof parsed === 'object') {
                    metaObj = parsed;
                }
            } catch (_) {}
        }

        // 1. Resolve flowchart / ER diagram: use saved diagram, or auto-generate if missing
        let resolvedFlowchart = metaObj?.flowchartData || null;
        if (!resolvedFlowchart || !Array.isArray(resolvedFlowchart.nodes) || resolvedFlowchart.nodes.length === 0) {
            if (safeCode && safeCode.trim()) {
                try {
                    if (docLang === 'sql' || isDatabaseLanguage(docLang)) {
                        resolvedFlowchart = generateRelationalErDiagramFromSql(safeCode);
                        if (!resolvedFlowchart?.nodes?.length) {
                            resolvedFlowchart = generateErDiagramFromSql(safeCode);
                        }
                    } else {
                        resolvedFlowchart = generateFlowchartFromCode(safeCode, docLang || 'python');
                    }
                } catch (genErr) {
                    console.warn('[IDE] Diagram auto-generation fallback warning:', genErr.message);
                }
            }
        }
        if (!resolvedFlowchart || !Array.isArray(resolvedFlowchart.nodes)) {
            resolvedFlowchart = { nodes: [], connectors: [] };
        }

        // 2. Resolve output and stdin
        const resolvedOutput = metaObj?.output || null;
        const resolvedStdin = metaObj?.stdin !== undefined ? metaObj.stdin : '';
        const resolvedPanelMode = metaObj?.rightPanelMode || (resolvedFlowchart.nodes.length > 0 ? 'diagram' : 'output');

        if (resolvedPanelMode) {
            setRightPanelMode(resolvedPanelMode);
        }

        // 1. If this document is ALREADY open in an existing tab, update it and switch to it!
        const existingTab = currentTabs.find(
            (t) => (resolvedDocId && t.documentId === resolvedDocId) ||
                   (t.filename && t.filename.toLowerCase() === name.toLowerCase())
        );
        if (existingTab) {
            setActiveTabId(existingTab.id);
            activeTabIdRef.current = existingTab.id;
            isProgrammaticUpdateRef.current = true;
            if (editorRef.current) {
                editorRef.current.setValue(safeCode);
            }
            setTimeout(() => {
                isProgrammaticUpdateRef.current = false;
            }, 300);

            const updatedTabs = currentTabs.map((t) =>
                t.id === existingTab.id
                    ? {
                          ...t,
                          filename: name,
                          title: name.replace(/\.(py|sql)$/i, ''),
                          language: docLang || t.language,
                          code: safeCode,
                          documentId: resolvedDocId || t.documentId,
                          folderId: folderId || t.folderId,
                          createdAt: t.createdAt || fileCreatedAt,
                          lastSavedAt: fileUpdatedAt,
                          flowchartData: resolvedFlowchart.nodes.length > 0 ? resolvedFlowchart : (t.flowchartData || { nodes: [], connectors: [] }),
                          output: resolvedOutput !== null ? resolvedOutput : t.output,
                          stdin: resolvedStdin !== '' ? resolvedStdin : t.stdin,
                          isDirty: false
                      }
                    : t
            );
            tabsRef.current = updatedTabs;
            setTabs(updatedTabs);
            triggerSaveWorkspace(updatedTabs, existingTab.id);
            toast.success(`Loaded open tab "${existingTab.filename || existingTab.title}" ${savedTimeStr}`, { icon: '📄' });
            return;
        }

        // 2. Check if active tab is a pristine unmodified initial empty tab
        const activeTabObj = currentTabs.find((t) => t.id === activeTabId) || activeTab;
        const isPristineEmptyTab =
            currentTabs.length === 1 &&
            !activeTabObj?.documentId &&
            !activeTabObj?.isDirty &&
            (!activeTabObj?.code ||
                activeTabObj.code.trim() === '' ||
                activeTabObj.code.includes('Online Python & MySQL Practice Sandbox') ||
                activeTabObj.code.includes('MySQL Practice Console'));

        if (isPristineEmptyTab && !asNewTab) {
            isProgrammaticUpdateRef.current = true;
            if (editorRef.current) {
                editorRef.current.setValue(safeCode);
            }
            setTimeout(() => {
                isProgrammaticUpdateRef.current = false;
            }, 300);

            const updatedTabs = currentTabs.map((t) =>
                t.id === activeTabObj.id
                    ? {
                          ...t,
                          title: name.replace(/\.(py|sql)$/i, ''),
                          filename: name,
                          language: docLang,
                          code: safeCode,
                          documentId: resolvedDocId || t.documentId,
                          folderId: folderId || t.folderId,
                          createdAt: fileCreatedAt,
                          lastSavedAt: fileUpdatedAt,
                          flowchartData: resolvedFlowchart,
                          output: resolvedOutput,
                          stdin: resolvedStdin,
                          isDirty: false,
                          metadata: {
                              ...t.metadata,
                              title: metaObj?.problemTitle || name.replace(/\.(py|sql)$/i, ''),
                              description: metaObj?.problemDescription || t.metadata?.description || ''
                          }
                      }
                    : t
            );
            tabsRef.current = updatedTabs;
            setTabs(updatedTabs);
            triggerSaveWorkspace(updatedTabs, activeTabObj.id);
            toast.success(`Loaded "${name}" ${savedTimeStr}`, { icon: '📄' });
            return;
        }

        // 3. Otherwise ALWAYS open in a NEW TAB (does NOT replace other open programs)
        if (currentTabs.length >= 5) {
            toast.error('Cannot open file: Maximum 5 tabs reached. Please close a tab first.');
            return;
        }

        const newId = `tab_${Date.now()}`;
        const newTab = createDefaultTab(newId, docLang, studentIdentifier, studentDisplayName);
        newTab.title = name.replace(/\.(py|sql)$/i, '');
        newTab.filename = name;
        newTab.code = safeCode;
        newTab.documentId = resolvedDocId;
        newTab.folderId = folderId || newTab.folderId;
        newTab.createdAt = fileCreatedAt;
        newTab.lastSavedAt = fileUpdatedAt;
        newTab.flowchartData = resolvedFlowchart;
        newTab.output = resolvedOutput;
        newTab.stdin = resolvedStdin;
        newTab.isDirty = false;
        newTab.metadata.title = metaObj?.problemTitle || newTab.title;
        newTab.metadata.description = metaObj?.problemDescription || '';

        const updatedTabs = [...currentTabs, newTab];
        tabsRef.current = updatedTabs;
        setTabs(updatedTabs);
        setActiveTabId(newId);
        activeTabIdRef.current = newId;

        isProgrammaticUpdateRef.current = true;
        if (editorRef.current) {
            editorRef.current.setValue(safeCode);
        }
        setTimeout(() => {
            isProgrammaticUpdateRef.current = false;
        }, 300);

        triggerSaveWorkspace(updatedTabs, newId);
        toast.success(`Opened "${name}" in new tab ${savedTimeStr}`, { icon: '📄' });
    };

    // Reset Personal MySQL Sandbox Database (UI Dialog aligned)
    const handleResetDatabase = () => {
        setShowResetDbModal(true);
    };

    const executeResetDatabase = async () => {
        setShowResetDbModal(false);
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
                } else if (e.key === 'f' || e.key === 'F' || e.key === 'h' || e.key === 'H') {
                    e.preventDefault();
                    setShowFindReplaceModal(true);
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

    // Auto-Generate Database Diagram (Relational Schema Designer or Conceptual Chen ERD)
    const handleAutoGenerateErDiagram = async (mode = 'relational') => {
        try {
            toast.loading(mode === 'relational' ? 'Generating Database Designer tables...' : 'Generating Conceptual ER Diagram...', { id: 'er-gen' });
            let result = null;

            if (mode === 'relational') {
                // 1. Try to fetch live database schema from server instance
                try {
                    const res = await compilerAPI.getDbSchema();
                    if (res.data?.success && res.data?.data && res.data.data.tables && res.data.data.tables.length > 0) {
                        result = generateRelationalErDiagram(res.data.data);
                    }
                } catch (dbErr) {
                    console.warn('[ER Diagram] Live schema fetch failed, falling back to DDL parser:', dbErr.message);
                }

                // 2. If no tables exist in live DB, parse active SQL tab DDL into relational table cards
                if (!result || result.nodes.length === 0) {
                    if (activeTab.code && activeTab.code.trim()) {
                        result = generateRelationalErDiagramFromSql(activeTab.code);
                    }
                }
            } else {
                // Conceptual Chen ERD (Entities, Ovals, Diamonds)
                if (activeTab.code && activeTab.code.trim()) {
                    result = generateErDiagramFromSql(activeTab.code);
                }
            }

            if (!result || result.nodes.length === 0) {
                toast.error(mode === 'relational'
                    ? 'No tables found in database or SQL editor. Create tables or write CREATE TABLE statements first.'
                    : 'No CREATE TABLE statements found in SQL editor to build Chen ER diagram.',
                    { id: 'er-gen' });
                return;
            }

            // 3. Update tab's flowchartData
            setTabs((prev) =>
                prev.map((t) => (t.id === activeTabId ? { ...t, flowchartData: result } : t))
            );

            // 4. Switch right panel & mobile view to diagram
            setRightPanelMode('diagram');
            setMobileView('diagram');

            toast.success(mode === 'relational'
                ? `Generated Database Designer with ${result.nodes.length} relational table(s) (100% Offline, Zero AI)!`
                : `Generated Conceptual ER Diagram with ${result.nodes.length} component(s) (No AI)!`, {
                id: 'er-gen',
                icon: '⚡'
            });
        } catch (err) {
            toast.error('Failed to generate diagram: ' + err.message, { id: 'er-gen' });
        }
    };

    return (
        <div className={`flex flex-col h-[calc(100vh-4rem)] w-full max-w-full overflow-x-hidden min-w-0 font-sans relative ${isLightMode ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'}`}>
            {/* 0. WORKSPACE RESTORATION LOADING SPLASH */}
            {isLoadingWorkspace && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs transition-opacity duration-300">
                    <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-center max-w-sm mx-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary-600/20 border border-primary-500/40 flex items-center justify-center text-primary-400">
                            <RefreshCw className="w-6 h-6 animate-spin" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white tracking-wide">Restoring Coding Studio</h3>
                            <p className="text-xs text-slate-400 mt-1">Loading your workspace programs, opened tabs, and database state...</p>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
                            <div className="bg-primary-500 h-full rounded-full animate-pulse w-3/4" />
                        </div>
                    </div>
                </div>
            )}

            {/* 1. TOP DESKTOP-GRADE IDE MENU BAR */}
            <IDEMenuBar
                activeTab={activeTab}
                onNewTab={(lang) => handleAddTab(lang)}
                onOpenFromDocuments={() => setShowDocBrowserModal(true)}
                onSaveToDocuments={() => handleSaveToDocuments(false)}
                onSaveAs={() => handleSaveToDocuments(true)}
                onDownload={handleDownloadCode}
                onExportDiagram={() => toast('Export diagram available in Canvas toolbar')}
                onExportBundle={() => setShowExportBundleModal(true)}
                isExecuting={isExecuting}
                onStopCode={handleStopExecution}
                onRunCode={handleExecuteCode}
                onClearOutput={() => {
                    setTabs((prev) =>
                        prev.map((t) => (t.id === activeTabId ? { ...t, output: null } : t))
                    );
                }}
                onResetDatabase={handleResetDatabase}
                onFormatCode={handleFormatCode}
                onInsertDocstringHeader={handleInsertDocstringHeader}
                onClearCode={() => handleCodeChange('')}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onFind={handleFind}
                onInsertSnippet={handleInsertSnippet}
                isWordWrapOn={isWordWrapOn}
                onToggleWordWrap={() => setIsWordWrapOn((prev) => !prev)}
                isLineNumbersOn={isLineNumbersOn}
                onToggleLineNumbers={() => setIsLineNumbersOn((prev) => !prev)}
                isMinimapOn={isMinimapOn}
                onToggleMinimap={() => setIsMinimapOn((prev) => !prev)}
                isEditorMaximized={isEditorMaximized}
                onToggleEditorMaximize={() => setIsEditorMaximized((prev) => !prev)}
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
                lastAutosavedAt={lastAutosavedAt}
                autosaveStatus={autosaveStatus}
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
            <div className={`flex items-center justify-between border-b px-2 w-full max-w-full min-w-0 overflow-x-auto select-none flex-shrink-0 ${isLightMode ? 'bg-slate-200 border-slate-300' : 'bg-slate-900/90 border-slate-800'}`}>
                {/* Tabs List */}
                <div className="flex items-center gap-1 py-1">
                    {tabs.map((tab, idx) => {
                        const isActive = tab.id === activeTabId;
                        const isSql = tab.language === 'sql';

                        return (
                            <div
                                key={tab.id}
                                data-tab-id={tab.id}
                                onClick={() => handleSelectTab(tab.id)}
                                onDoubleClick={(e) => {
                                    if (inspectingStudentId) return;
                                    e.stopPropagation();
                                    setEditingTabLocation('tab');
                                    setEditingTabId(tab.id);
                                    setEditingTabTitle(tab.title || (tab.filename ? tab.filename.replace(/\.[^/.]+$/, '') : ''));
                                }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-t-2 text-xs font-medium cursor-pointer transition max-w-[210px] group ${
                                    isActive
                                        ? isLightMode
                                            ? 'bg-white border-primary-600 text-slate-900 shadow-xs'
                                            : 'bg-slate-950 border-primary-500 text-white shadow-xs'
                                        : isLightMode
                                        ? 'bg-slate-100 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                                        : 'bg-slate-900 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                }`}
                                title={`Path: ${getTabAbsolutePath(tab)}\nFile: ${tab.filename}\n(Double-click or click pencil to rename)`}
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

                                {editingTabId === tab.id && editingTabLocation === 'tab' ? (
                                    <input
                                        autoFocus
                                        type="text"
                                        value={editingTabTitle}
                                        onFocus={(e) => e.target.select()}
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onChange={(e) => setEditingTabTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            e.stopPropagation();
                                            if (e.key === 'Enter') handleCommitTabRename(tab.id);
                                            if (e.key === 'Escape') {
                                                setEditingTabId(null);
                                                setEditingTabLocation(null);
                                            }
                                        }}
                                        onBlur={() => handleCommitTabRename(tab.id)}
                                        className={`w-28 px-1 py-0.2 border rounded text-[11px] font-mono focus:outline-none ${
                                            isLightMode
                                                ? 'bg-white border-primary-600 text-slate-900 shadow-xs'
                                                : 'bg-slate-900 border-primary-500 text-white shadow-xs'
                                        }`}
                                    />
                                ) : (
                                    <div className="flex items-center gap-1 min-w-0 flex-1">
                                        <span className="truncate font-mono text-[11px] cursor-text" title={`Path: ${getTabAbsolutePath(tab)}`}>
                                            {tab.filename || tab.title || `program ${idx + 1}`}
                                        </span>
                                        {!inspectingStudentId && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingTabLocation('tab');
                                                    setEditingTabId(tab.id);
                                                    setEditingTabTitle(tab.title || (tab.filename ? tab.filename.replace(/\.[^/.]+$/, '') : ''));
                                                }}
                                                className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition ${
                                                    isLightMode
                                                        ? 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'
                                                        : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                                                }`}
                                                title="Quick rename tab"
                                            >
                                                <Edit2 className="w-2.5 h-2.5" />
                                            </button>
                                        )}
                                    </div>
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
                </div>
            </div>

            {/* MOBILE VIEW SWITCHER BAR (< lg screens for Android & iOS) */}
            <div className={`lg:hidden flex items-center justify-around border-b px-2 py-1.5 flex-shrink-0 select-none ${
                isLightMode ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-slate-800'
            }`}>
                <button
                    onClick={() => {
                        setMobileView('code_output');
                        if (rightPanelMode === 'diagram') setRightPanelMode('output');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        mobileView === 'code_output'
                            ? isLightMode
                                ? 'bg-white text-primary-700 shadow-xs border border-slate-200'
                                : 'bg-slate-800 text-white shadow-xs border border-slate-700'
                            : isLightMode
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Code2 className="w-3.5 h-3.5 text-primary-500" />
                    <span>Code & Output</span>
                    {activeTab.output && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                </button>
                <button
                    onClick={() => setMobileView('editor')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        mobileView === 'editor'
                            ? isLightMode
                                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                                : 'bg-slate-800 text-indigo-400 shadow-xs border border-slate-700'
                            : isLightMode
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Code Only</span>
                </button>
                <button
                    onClick={() => {
                        setMobileView('diagram');
                        setRightPanelMode('diagram');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        mobileView === 'diagram'
                            ? isLightMode
                                ? 'bg-white text-purple-700 shadow-xs border border-slate-200'
                                : 'bg-slate-800 text-purple-400 shadow-xs border border-slate-700'
                            : isLightMode
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Layers className="w-3.5 h-3.5 text-purple-500" />
                    <span>{isDatabaseLanguage(activeTab.language) ? 'ER / Designer' : 'Flowchart'}</span>
                </button>
            </div>

            {/* 4. MAIN SPLIT SCREEN: LEFT EDITOR PANE, RIGHT OUTPUT & CANVAS */}
            <main className={`flex-1 min-h-0 min-w-0 w-full max-w-full overflow-hidden ${
                isEditorMaximized ? 'flex flex-col' : 'flex flex-col lg:grid lg:grid-cols-2'
            }`}>
                {/* LEFT PANEL: Monaco Code Editor with Ergonomic RUN CODE Button Above */}
                <section className={`flex flex-col min-w-0 max-w-full overflow-hidden ${
                    isEditorMaximized
                        ? 'w-full flex-1 h-full'
                        : mobileView === 'code_output'
                        ? 'h-[50%] lg:h-full border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800'
                        : mobileView === 'editor'
                        ? 'h-full w-full'
                        : 'hidden lg:flex lg:h-full lg:border-r'
                } ${isLightMode ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                    {/* ERGONOMIC SUB-TOOLBAR DIRECTLY ABOVE EDITOR */}
                    <div className={`flex items-center justify-between px-3 py-2 border-b flex-shrink-0 w-full max-w-full relative z-20 overflow-visible ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                        {/* Left: Language Badge & Autosave Status */}
                        <div className="flex items-center gap-2 min-w-0 flex-1 relative overflow-visible">
                            <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                                isLightMode
                                    ? 'bg-slate-100 border-slate-300 text-slate-700'
                                    : 'bg-slate-800 border-slate-700 text-slate-300'
                            }`}>
                                {activeTab.language === 'plsql' ? 'PL/SQL' : activeTab.language?.toUpperCase() || 'CODE'}
                            </span>

                            {/* File Datetime & Sync Information Tooltip */}
                            <div className="relative group/fileinfo" ref={fileInfoPopoverRef}>
                                <button
                                    type="button"
                                    data-testid="file-info-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowFileInfoPopover((v) => !v);
                                    }}
                                    className={`p-1 rounded-md text-xs transition cursor-pointer flex items-center justify-center ${
                                        showFileInfoPopover
                                            ? isLightMode
                                                ? 'text-amber-800 bg-amber-100/90 border border-amber-300'
                                                : 'text-amber-300 bg-slate-800 border border-amber-600/40'
                                            : isLightMode
                                            ? 'text-slate-500 hover:text-amber-700 hover:bg-slate-200/70'
                                            : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                                    }`}
                                    title="Click or hover to view file creation & update timestamps"
                                    aria-label="View file creation and update timestamps"
                                >
                                    <Info className="w-3.5 h-3.5" />
                                </button>

                                {/* Tooltip / Popover Card */}
                                <div className={`absolute left-0 top-full mt-1.5 z-50 w-76 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl text-[11px] text-slate-700 dark:text-slate-200 animate-in fade-in duration-150 ${
                                    showFileInfoPopover ? 'flex flex-col' : 'hidden group-hover/fileinfo:flex flex-col'
                                }`}>
                                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2 flex items-center justify-between gap-1.5">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <FileCode className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                            <span className="truncate">{activeTab.filename || `${activeTab.title}.${activeTab.language === 'sql' ? 'sql' : 'py'}`}</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                            {activeTab.language === 'sql' ? 'SQL' : 'Python'}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3 text-slate-400" />
                                                Created:
                                            </span>
                                            <span className="font-medium text-slate-800 dark:text-slate-200">
                                                {activeTab.createdAt
                                                    ? new Date(activeTab.createdAt).toLocaleString(undefined, {
                                                          month: 'short',
                                                          day: 'numeric',
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                          second: '2-digit'
                                                      })
                                                    : (activeTab.lastSavedAt
                                                          ? new Date(activeTab.lastSavedAt).toLocaleString(undefined, {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                second: '2-digit'
                                                            })
                                                          : 'Initial Session')}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-slate-400" />
                                                Last Updated:
                                            </span>
                                            <span className="font-medium text-slate-800 dark:text-slate-200">
                                                {activeTab.lastSavedAt
                                                    ? new Date(activeTab.lastSavedAt).toLocaleString(undefined, {
                                                          month: 'short',
                                                          day: 'numeric',
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                          second: '2-digit'
                                                      })
                                                    : (activeTab.isDirty ? 'Unsaved changes' : 'Not yet modified')}
                                            </span>
                                        </div>

                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                                            <span className="text-slate-400">Sync Status:</span>
                                            <span className={`font-semibold px-1.5 py-0.5 rounded text-[9px] ${
                                                activeTab.isDirty
                                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                                                    : activeTab.documentId
                                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                            }`}>
                                                {activeTab.isDirty ? '● Unsaved edits' : activeTab.documentId ? '✓ Saved to Documents' : 'Draft Script'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Flashing Autosave Transient Notice (appears on autosave, disappears after 2.5s) */}
                            <div
                                className={`transition-all duration-500 ease-out flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                    autosaveFlash.visible
                                        ? 'opacity-100 scale-100 ' + (autosaveFlash.status === 'saving'
                                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs')
                                        : 'opacity-0 scale-95 pointer-events-none w-0 px-0 overflow-hidden border-0'
                                }`}
                            >
                                {autosaveFlash.status === 'saving' ? (
                                    <>
                                        <RefreshCw className="w-3 h-3 animate-spin text-amber-500 shrink-0" />
                                        <span className="whitespace-nowrap">Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                        <span className="whitespace-nowrap">Autosaved</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Center/Right: Quick Actions, Snippets, Play, ER Gen */}
                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            {/* Undo Button */}
                            <button
                                onClick={handleUndo}
                                className={`p-1.5 rounded-md transition cursor-pointer ${
                                    isLightMode
                                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                                title="Undo (Ctrl+Z)"
                                aria-label="Undo"
                            >
                                <Undo2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Redo Button */}
                            <button
                                onClick={handleRedo}
                                className={`p-1.5 rounded-md transition cursor-pointer ${
                                    isLightMode
                                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                                title="Redo (Ctrl+Y)"
                                aria-label="Redo"
                            >
                                <Redo2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Find & Replace */}
                            <button
                                onClick={handleFind}
                                className={`p-1.5 rounded-md transition cursor-pointer hidden sm:flex items-center ${
                                    isLightMode
                                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                                title="Find and Replace (Ctrl+F)"
                                aria-label="Find and Replace"
                            >
                                <Search className="w-3.5 h-3.5" />
                            </button>

                            {/* Format Document */}
                            <button
                                onClick={handleFormatCode}
                                className={`p-1.5 rounded-md transition cursor-pointer hidden sm:flex items-center ${
                                    isLightMode
                                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                                title="Format Code (Shift+Alt+F)"
                                aria-label="Format Code"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            </button>

                            {/* Copy Entire Code */}
                            <button
                                onClick={handleCopyCode}
                                className={`p-1.5 rounded-md transition cursor-pointer ${
                                    isLightMode
                                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                                title="Copy All Code"
                                aria-label="Copy All Code"
                            >
                                <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Maximize / Restore Editor Button */}
                            <button
                                onClick={() => setIsEditorMaximized(!isEditorMaximized)}
                                className={`p-1.5 rounded-md transition cursor-pointer hidden md:flex items-center ${
                                    isEditorMaximized
                                        ? 'bg-primary-100 text-primary-700 border border-primary-300 dark:bg-primary-950 dark:text-primary-300'
                                        : isLightMode
                                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                                title={isEditorMaximized ? 'Restore Split Screen' : 'Maximize Code Editor (Full Width)'}
                                aria-label="Maximize Code Editor"
                            >
                                {isEditorMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            </button>

                            <div className={`h-4 w-px mx-0.5 ${isLightMode ? 'bg-slate-300' : 'bg-slate-700'}`} />

                            {/* Round Play / Stop Button (Icon-Only with Tooltip) */}
                            {isExecuting ? (
                                <button
                                    onClick={handleStopExecution}
                                    className="w-8 h-8 rounded-full bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition-all flex items-center justify-center cursor-pointer active:scale-95 group relative animate-pulse"
                                    title="Stop Program Execution (Ctrl+C)"
                                    aria-label="Stop Program Execution (Ctrl+C)"
                                >
                                    <Square className="w-3.5 h-3.5 fill-current" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleExecuteCode()}
                                    className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center cursor-pointer active:scale-95 group relative"
                                    title="Run Program (Ctrl+↵)"
                                    aria-label="Run Program (Ctrl+↵)"
                                >
                                    <Play className="w-4 h-4 fill-current ml-0.5" />
                                </button>
                            )}

                            {/* Debugger & Variable Monitoring Overlay Button */}
                            <button
                                data-debugger-btn="true"
                                onClick={() => setShowDebugModal(true)}
                                title="Debug & Variable Inspector (Ctrl+Shift+D)"
                                className={`w-8 h-8 rounded-full border transition-all flex items-center justify-center cursor-pointer active:scale-95 group relative ${
                                    showDebugModal
                                        ? 'border-rose-500 bg-rose-500/20 text-rose-500 shadow-xs'
                                        : isLightMode
                                        ? 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700'
                                        : 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                                }`}
                                title="Debug & Variable Inspector (F5 / Step)"
                                aria-label="Debug & Variable Inspector"
                            >
                                <Bug className="w-4 h-4 text-rose-500" />
                            </button>

                            {/* ER Diagram Generator from Live Database Schema (in SQL / PL-SQL mode) */}
                            {isDatabaseLanguage(activeTab.language) && (
                                <button
                                    onClick={handleAutoGenerateErDiagram}
                                    className={`w-8 h-8 rounded-full border transition-all flex items-center justify-center cursor-pointer active:scale-95 group relative ${
                                        isLightMode
                                            ? 'border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-700 shadow-xs'
                                            : 'border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400'
                                    }`}
                                    title="Generate ER Diagram from DB Schema (No AI)"
                                    aria-label="Generate ER Diagram from DB Schema"
                                >
                                    <Workflow className="w-4 h-4" />
                                </button>
                            )}

                            {/* Show manual Save button only when autosave is OFF */}
                            {!isAutosaveEnabled && (
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
                            language={getMonacoLanguage(activeTab.language)}
                            value={activeTab.code}
                            theme={editorTheme}
                            onChange={handleCodeChange}
                            onMount={(editor) => {
                                editorRef.current = editor;
                                editor.onDidChangeCursorPosition((e) => {
                                    setCursorPosition({
                                        lineNumber: e.position.lineNumber,
                                        column: e.position.column
                                    });
                                });

                                // Gutter click to toggle red dot breakpoints (Code::Blocks style)
                                editor.onMouseDown((e) => {
                                    if (e.target.type === 2 || e.target.type === 3 || // GUTTER_GLYPH_MARGIN or GUTTER_LINE_NUMBERS
                                        e.target.element?.classList?.contains('line-numbers')) {
                                        const line = e.target.position?.lineNumber;
                                        if (line) {
                                            handleToggleBreakpoint(line);
                                        }
                                    }
                                });
                            }}
                            options={{
                                fontSize: fontSize,
                                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                                minimap: { enabled: isMinimapOn },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                glyphMargin: true,
                                tabSize: isDatabaseLanguage(activeTab.language) ? 2 : 4,
                                insertSpaces: true,
                                wordWrap: isWordWrapOn ? 'on' : 'off',
                                padding: { top: 12, bottom: 12 },
                                lineNumbers: isLineNumbersOn ? 'on' : 'off',
                                renderLineHighlight: 'all',
                                bracketPairColorization: { enabled: true },
                                contextmenu: true
                            }}
                        />
                    </div>

                    {/* INPUT STATUS BAR DIRECTLY BELOW MONACO EDITOR */}
                    <div className={`px-3 py-1 border-t text-[11px] font-mono flex items-center justify-between select-none shrink-0 ${
                        isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
                            </span>
                            <span className="hidden sm:inline opacity-40">•</span>
                            <span className="hidden sm:inline">UTF-8</span>
                            <span className="hidden sm:inline opacity-40">•</span>
                            <span className="hidden sm:inline">Spaces: {isDatabaseLanguage(activeTab.language) ? 2 : 4}</span>
                            <span className="hidden md:inline opacity-40">•</span>
                            <span className="hidden md:inline font-semibold">
                                {isDatabaseLanguage(activeTab.language)
                                    ? 'SQL (MySQL / TiDB Cloud)'
                                    : getLanguageMeta(activeTab.language).label}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <span>
                                {(activeTab.code || '').split('\n').length} lines, {(activeTab.code || '').length} chars
                            </span>
                            <span className="opacity-40">•</span>
                            <span className="flex items-center gap-1 font-semibold">
                                <span className={`w-1.5 h-1.5 rounded-full ${isAutosaveEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                                <span className="hidden sm:inline">{isAutosaveEnabled ? 'Autosaved' : 'Draft'}</span>
                            </span>
                        </div>
                    </div>

                    {/* Collapsible Stdin Input (For Algorithmic languages: Python, C, C++, Java) */}
                    {!isDatabaseLanguage(activeTab.language) && (
                        <div className={`border-t ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                            <button
                                type="button"
                                onClick={() => setIsStdinOpen(!isStdinOpen)}
                                className={`w-full px-3 py-1.5 flex items-center justify-between text-[11px] font-semibold cursor-pointer ${
                                    isLightMode ? 'text-indigo-700 hover:bg-slate-100' : 'text-indigo-300 hover:bg-slate-800/60'
                                }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    <Terminal className="w-3 h-3" />
                                    <span>Standard Input (stdin)</span>
                                    {activeTab.stdin?.trim() && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    )}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                    {isStdinOpen ? '▲ Collapse' : (activeTab.stdin?.trim() ? '▼ Edit Inputs' : '▼ Tap to Enter Inputs')}
                                </span>
                            </button>
                            {(isStdinOpen || activeTab.stdin?.trim()) && (
                                <div className="px-3 pb-2 pt-0.5">
                                    <textarea
                                        value={activeTab.stdin}
                                        onChange={(e) => handleStdinChange(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Tab') {
                                                e.preventDefault();
                                                const target = e.target;
                                                const start = target.selectionStart;
                                                const end = target.selectionEnd;
                                                const val = target.value;
                                                const updated = val.substring(0, start) + '\t' + val.substring(end);
                                                handleStdinChange(updated);
                                                setTimeout(() => {
                                                    target.selectionStart = target.selectionEnd = start + 1;
                                                }, 0);
                                            }
                                        }}
                                        placeholder="Values entered here feed sequentially into input() calls (supports spaces & tabs)..."
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
                        </div>
                    )}
                </section>

                {/* RIGHT PANEL: COORDINATED OUTPUT & VISUAL FLOWCHART CANVAS */}
                <section className={`flex flex-col min-w-0 max-w-full overflow-hidden ${
                    isEditorMaximized
                        ? 'hidden'
                        : mobileView === 'code_output'
                        ? 'h-[50%] lg:h-full border-t lg:border-t-0'
                        : mobileView === 'diagram' || mobileView === 'output'
                        ? 'h-full w-full'
                        : 'hidden lg:flex lg:h-full'
                } ${isLightMode ? 'bg-slate-50' : 'bg-slate-900/60'}`}>
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

                            {/* Database Structured Data Table Tab */}
                            {isDatabaseLanguage(activeTab.language) && (
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

                            {/* Flowchart / ER Diagram Canvas Tab (Automatically switched based on Language) */}
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
                                {isDatabaseLanguage(activeTab.language) ? (
                                    <>
                                        <Database className="w-3.5 h-3.5 text-sky-500" />
                                        <span>ER Diagram Designer</span>
                                    </>
                                ) : (
                                    <>
                                        <Shapes className="w-3.5 h-3.5 text-purple-500" />
                                        <span>Flowchart Designer</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Persistent DB Tables list indicator (SQL mode) */}
                        {isDatabaseLanguage(activeTab.language) && existingTables.length > 0 && (
                            <div className="flex items-center gap-1 text-[11px] text-sky-500 font-medium">
                                <Database className="w-3.5 h-3.5" />
                                <span className="font-mono font-semibold">{existingTables.length} tables saved</span>
                            </div>
                        )}
                    </div>

                    {/* CONTENT 1: COORDINATED OUTPUT SCREEN */}
                    {rightPanelMode === 'output' && (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div
                                className={`flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar transition-colors duration-200 ${currentOutputTheme.containerClass}`}
                            >
                                {activeTab.output || isExecuting ? (
                                    <div className="space-y-4">
                                        {/* Execution metadata bar */}
                                        <div
                                            className={`flex items-center justify-between pb-2 border-b text-[11px] ${currentOutputTheme.headerClass}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {isExecuting ? (
                                                    <span className="inline-flex items-center gap-1.5 font-bold text-amber-500 animate-pulse">
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                        <span>{activePrompt && activePrompt.sessionId === activeTab.id ? 'Waiting for input()...' : 'Program Running...'}</span>
                                                    </span>
                                                ) : (
                                                    <span
                                                        className={`inline-flex items-center gap-1 font-semibold ${
                                                            activeTab.output?.exitCode === 0
                                                                ? currentOutputTheme.accentText
                                                                : 'text-rose-500'
                                                        }`}
                                                    >
                                                        {activeTab.output?.exitCode === 0 ? (
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <AlertCircle className="w-3.5 h-3.5" />
                                                        )}
                                                        {activeTab.output?.exitCode === 0
                                                            ? 'Process Finished (0)'
                                                            : `Exited with Error (${activeTab.output?.exitCode})`}
                                                    </span>
                                                )}
                                                <span>•</span>
                                                <span>Duration: {activeTab.output?.durationMs || 0}ms</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isExecuting && (
                                                    <button
                                                        type="button"
                                                        onClick={handleStopExecution}
                                                        className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                                                        title="Stop execution (Ctrl+C)"
                                                    >
                                                        <Square className="w-3 h-3 fill-current" />
                                                        <span>Stop</span>
                                                    </button>
                                                )}
                                                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                                                    Runner: {activeTab.output?.runner || 'native'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Standard Output (stdout) or Active Prompt stream */}
                                        {(activeTab.output?.stdout || (activePrompt && activePrompt.sessionId === activeTab.id) || (isExecuting && !activeTab.output?.stderr)) ? (
                                            <div
                                                style={{ fontSize: `${fontSize}px` }}
                                                className={`p-3 rounded-lg border whitespace-pre-wrap leading-relaxed select-text font-mono ${currentOutputTheme.stdoutClass}`}
                                            >
                                                {activeTab.output?.stdout || ''}

                                                {/* Real-time Interactive Prompt (Triggered when program calls input()) */}
                                                {activePrompt && activePrompt.sessionId === activeTab.id ? (
                                                    <div className="mt-2.5 pt-2 border-t border-dashed border-amber-400/50 font-mono">
                                                        <form
                                                            onSubmit={handlePromptSubmit}
                                                            className="flex items-center gap-1.5 text-xs"
                                                        >
                                                            <span data-interactive-prompt-label="true" className="text-amber-500 font-bold select-none">{activePrompt.prompt || '>'}</span>
                                                            <input
                                                                ref={promptInputRef}
                                                                type="text"
                                                                data-interactive-prompt="true"
                                                                value={promptValue}
                                                                onChange={(e) => setPromptValue(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Tab') {
                                                                        e.preventDefault();
                                                                        setPromptValue((prev) => prev + '\t');
                                                                    }
                                                                }}
                                                                placeholder="type value & press Enter ↵ (empty input ignored)..."
                                                                autoFocus
                                                                className="flex-1 bg-transparent border-0 border-b border-dashed border-amber-400/80 focus:border-emerald-500 focus:outline-none text-emerald-500 dark:text-emerald-400 font-bold text-xs font-mono py-0.5 px-1 transition-colors"
                                                            />
                                                            <button
                                                                type="submit"
                                                                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-mono font-bold transition cursor-pointer shadow-xs flex items-center gap-1"
                                                                title="Send input into program (Enter)"
                                                            >
                                                                <span>Enter</span>
                                                                <span>↵</span>
                                                            </button>
                                                        </form>
                                                    </div>
                                                ) : (
                                                    /* Standard Console Input bar when not in active input() prompt */
                                                    !isDatabaseLanguage(activeTab.language) && !isExecuting && (
                                                        <div className="mt-2.5 pt-2 border-t border-dashed border-slate-400/30 font-mono">
                                                            {activeTab.stdin?.trim() && (
                                                                <div className="mb-1 text-[11px] opacity-75 flex items-center justify-between">
                                                                    <span>stdin: <strong className="text-emerald-400">"{activeTab.stdin.replace(/\n/g, '\\n')}"</strong></span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleStdinChange('')}
                                                                        className="text-[10px] text-rose-400 hover:underline cursor-pointer font-sans"
                                                                    >
                                                                        Clear stdin
                                                                    </button>
                                                                </div>
                                                            )}
                                                            <form
                                                                onSubmit={(e) => {
                                                                    e.preventDefault();
                                                                    handleSendConsoleInput();
                                                                }}
                                                                className="flex items-center gap-1.5 text-xs"
                                                            >
                                                                <span className="text-emerald-500 font-bold select-none">&gt;</span>
                                                                <input
                                                                    type="text"
                                                                    data-console-stdin="true"
                                                                    value={consoleInputText}
                                                                    onChange={(e) => setConsoleInputText(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Tab') {
                                                                            e.preventDefault();
                                                                            setConsoleInputText((prev) => prev + '\t');
                                                                        }
                                                                    }}
                                                                    placeholder="type input & press Enter ↵ (supports space/tab)..."
                                                                    className="flex-1 bg-transparent border-0 border-b border-dashed border-slate-400/40 focus:border-emerald-500 focus:outline-none text-inherit text-xs font-mono py-0.5 px-1 transition-colors"
                                                                />
                                                                <button
                                                                    type="submit"
                                                                    disabled={isExecuting}
                                                                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-mono transition cursor-pointer shadow-xs"
                                                                    title="Send input into program (Enter)"
                                                                >
                                                                    Enter ↵
                                                                </button>
                                                            </form>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        ) : !activeTab.output?.stderr ? (
                                            <p className="opacity-60 italic text-xs">
                                                Command executed successfully with no stdout output.
                                            </p>
                                        ) : null}

                                        {/* Standard Error (stderr) */}
                                        {activeTab.output?.stderr && (() => {
                                            const noSuchTableMatch = activeTab.output.stderr.match(/Table\s+['`](?:[^'`. ]+\.)?([^'` ]+)['`]\s+doesn't exist/i) ||
                                                activeTab.output.stderr.match(/no such table:\s*['`]?([^'`\s\n]+)['`]?/i);
                                            const missingTableName = noSuchTableMatch ? noSuchTableMatch[1] : null;

                                            return (
                                                <div className="space-y-3">
                                                    <div
                                                        style={{ fontSize: `${fontSize}px` }}
                                                        className="bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300 p-3 rounded-lg whitespace-pre-wrap leading-relaxed select-text font-mono overflow-x-auto custom-scrollbar"
                                                    >
                                                        <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400 mb-1 text-xs">
                                                            <AlertCircle className="w-4 h-4" />
                                                            <span>Runtime / SQL Execution Error:</span>
                                                        </div>
                                                        {activeTab.output.stderr}

                                                        {/* Inline Stdin Input on EOFError when stdout was empty */}
                                                        {!isDatabaseLanguage(activeTab.language) && !activeTab.output?.stdout && (
                                                            <div className="mt-3 pt-2 border-t border-dashed border-rose-300/40 dark:border-rose-800/50">
                                                                <div className="mb-2 text-[11px] text-amber-600 dark:text-amber-400 font-sans font-medium flex items-center gap-1">
                                                                    <Terminal className="w-3.5 h-3.5" />
                                                                    <span><strong>Input needed:</strong> Program reached <code className="font-mono font-bold">input()</code>. Enter your value inline below:</span>
                                                                </div>
                                                                <form
                                                                    onSubmit={(e) => {
                                                                        e.preventDefault();
                                                                        handleSendConsoleInput();
                                                                    }}
                                                                    className="flex items-center gap-1.5 text-xs font-mono"
                                                                >
                                                                    <span className="text-amber-500 font-bold select-none">&gt;</span>
                                                                    <input
                                                                        type="text"
                                                                        data-console-stdin="true"
                                                                        value={consoleInputText}
                                                                        onChange={(e) => setConsoleInputText(e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Tab') {
                                                                                e.preventDefault();
                                                                                setConsoleInputText((prev) => prev + '\t');
                                                                            }
                                                                        }}
                                                                        placeholder="type input & press Enter ↵..."
                                                                        className="flex-1 bg-white/70 dark:bg-slate-900/80 border border-rose-300 dark:border-rose-700 focus:border-amber-500 rounded px-2 py-1 text-xs font-mono focus:outline-none"
                                                                        autoFocus
                                                                    />
                                                                    <button
                                                                        type="submit"
                                                                        disabled={isExecuting}
                                                                        className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold transition cursor-pointer"
                                                                    >
                                                                        Send & Run ↵
                                                                    </button>
                                                                </form>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Intelligent MySQL Error Diagnostic Card */}
                                                    {missingTableName && (
                                                        <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/90 dark:border-amber-700/60 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 text-xs space-y-2.5 shadow-xs">
                                                            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                                                                <Database className="w-4 h-4 text-amber-600" />
                                                                <span>MySQL Error 1146: Table <code className="px-1.5 py-0.5 rounded bg-amber-200/70 dark:bg-amber-900/60 font-mono text-amber-950 dark:text-amber-100">{missingTableName}</code> Does Not Exist</span>
                                                            </div>

                                                            <p className="leading-relaxed">
                                                                Your personal practice MySQL database is an isolated sandbox and currently does not have a table named <code className="font-bold underline">{missingTableName}</code>. In SQL, any table queried with <code className="font-mono">SELECT</code> or <code className="font-mono">INSERT</code> must first be defined with a <code className="font-mono font-bold">CREATE TABLE</code> statement.
                                                            </p>

                                                            <div className="pt-2 border-t border-amber-200 dark:border-amber-800/60 flex flex-wrap items-center justify-between gap-2">
                                                                <div className="text-[11px] text-amber-800 dark:text-amber-300">
                                                                    <strong>Existing Tables: </strong>
                                                                    {existingTables && existingTables.length > 0 ? (
                                                                        <span className="font-mono font-semibold">{existingTables.join(', ')}</span>
                                                                    ) : (
                                                                        <span className="italic opacity-80">None (database is currently empty)</span>
                                                                    )}
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const ddlSnippet = `\n-- Create '${missingTableName}' Table\nCREATE TABLE ${missingTableName} (\n    id INT AUTO_INCREMENT PRIMARY KEY,\n    name VARCHAR(100) NOT NULL,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n`;
                                                                        handleInsertSnippet(ddlSnippet, 'sql', { inlineOnly: true, label: `Create ${missingTableName}` });
                                                                        toast.success(`Inserted CREATE TABLE template for ${missingTableName}!`);
                                                                    }}
                                                                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                                                                >
                                                                    <span>+ Insert CREATE TABLE {missingTableName}</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
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
                                            MySQL / TiDB Cloud Engine
                                        </span>
                                    </div>

                                    <div className={`flex-1 overflow-auto custom-scrollbar rounded-lg border shadow-xs ${isLightMode ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-950 shadow-inner'}`}>
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
                                        Persistent MySQL Database
                                    </h3>
                                    <p className="text-xs text-slate-500 max-w-sm mb-4">
                                        Tables created in this studio are saved permanently in your private MySQL schema.
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
                                key={activeTab.id}
                                initialData={activeTab.flowchartData}
                                onChange={(canvasState) => {
                                    setTabs((prevTabs) => {
                                        const nextTabs = prevTabs.map((t) =>
                                            t.id === (activeTabIdRef.current || activeTabId)
                                                ? { ...t, flowchartData: canvasState }
                                                : t
                                        );
                                        tabsRef.current = nextTabs;
                                        return nextTabs;
                                    });
                                }}
                                readOnly={Boolean(inspectingStudentId)}
                                theme={isLightMode ? 'light' : 'dark'}
                                language={activeTab.language}
                                activeCode={(editorRef.current && activeTabId === activeTab.id) ? editorRef.current.getValue() : (activeTab.code || '')}
                                onInsertSqlDdl={(sqlCode) => {
                                    if (isDatabaseLanguage(activeTab.language)) {
                                        const newCode = activeTab.code?.trim() ? `${activeTab.code.trim()}\n\n${sqlCode}` : sqlCode;
                                        handleCodeChange(newCode);
                                        toast.success('Inserted ER SQL DDL into active SQL editor tab!');
                                    } else {
                                        handleAddTab('sql');
                                        setTimeout(() => {
                                            handleCodeChange(sqlCode);
                                            toast.success('Created new SQL tab with ER Schema DDL!');
                                        }, 150);
                                    }
                                }}
                            />
                        </div>
                    )}

                    {/* OUTPUT STATUS BAR DIRECTLY BELOW OUTPUT / RESULTS / DIAGRAM */}
                    <div className={`px-3 py-1 border-t text-[11px] font-mono flex items-center justify-between select-none shrink-0 ${
                        isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}>
                        <div className="flex items-center gap-2 sm:gap-3">
                            {activeTab.output ? (
                                <>
                                    <span className={`font-semibold flex items-center gap-1 ${activeTab.output.exitCode === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {activeTab.output.exitCode === 0 ? '✓ Exit: 0 (Success)' : `✗ Exit: ${activeTab.output.exitCode}`}
                                    </span>
                                    {activeTab.output.durationMs !== undefined && (
                                        <>
                                            <span className="opacity-40">•</span>
                                            <span>⚡ {activeTab.output.durationMs}ms</span>
                                        </>
                                    )}
                                    {activeTab.output.tables && activeTab.output.tables.length > 0 && (
                                        <>
                                            <span className="hidden sm:inline opacity-40">•</span>
                                            <span className="hidden sm:inline">{activeTab.output.tables.length} rows • {Object.keys(activeTab.output.tables[0] || {}).length} cols</span>
                                        </>
                                    )}
                                </>
                            ) : (
                                <span className="opacity-70">Ready to execute</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            {isDatabaseLanguage(activeTab.language) ? (
                                <>
                                    <span className="flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400">
                                        <span>🐬</span>
                                        <span className="hidden sm:inline">MySQL / TiDB</span>
                                    </span>
                                    <span className="hidden md:inline opacity-40">•</span>
                                    <span className="hidden md:inline">{existingTables.length} tables in DB</span>
                                </>
                            ) : (
                                <span className="hidden sm:inline opacity-70">
                                    {getLanguageMeta(activeTab.language).desc}
                                </span>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            {/* Custom UI Modal: Close Dirty Tab Confirmation */}
            {tabToCloseConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 transition-all ${
                        isLightMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base leading-tight">Unsaved Changes</h3>
                                <p className={`text-xs mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Tab: "{tabToCloseConfirm.title}"
                                </p>
                            </div>
                        </div>
                        <p className={`text-sm mb-6 ${isLightMode ? 'text-slate-600' : 'text-slate-300'}`}>
                            This file has unsaved changes. Closing it will discard your edits. Are you sure you want to close this tab?
                        </p>
                        <div className="flex items-center justify-end gap-2.5">
                            <button
                                onClick={() => setTabToCloseConfirm(null)}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                                    isLightMode
                                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                                }`}
                            >
                                Keep Open
                            </button>
                            <button
                                onClick={() => executeCloseTab(tabToCloseConfirm.id)}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition cursor-pointer"
                            >
                                Discard & Close Tab
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom UI Modal: Reset Database Confirmation */}
            {showResetDbModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 transition-all ${
                        isLightMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base leading-tight">Reset Personal Database</h3>
                                <p className={`text-xs mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Irreversible database wipe
                                </p>
                            </div>
                        </div>
                        <p className={`text-sm mb-6 ${isLightMode ? 'text-slate-600' : 'text-slate-300'}`}>
                            Are you sure you want to reset your personal database? All created tables, records, and schema objects will be erased.
                        </p>
                        <div className="flex items-center justify-end gap-2.5">
                            <button
                                onClick={() => setShowResetDbModal(false)}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                                    isLightMode
                                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeResetDatabase}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition cursor-pointer"
                            >
                                Reset Database
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Browser Modal */}
            <DocumentCodeBrowserModal
                isOpen={showDocBrowserModal}
                onClose={() => setShowDocBrowserModal(false)}
                onOpenFile={handleOpenDocumentContent}
                defaultLanguage={activeTab.language}
            />

            {/* Draggable Centered Find and Replace Modal with Black Border */}
            <FindReplaceModal
                isOpen={showFindReplaceModal}
                onClose={() => setShowFindReplaceModal(false)}
                editorRef={editorRef}
                onCodeChange={handleCodeChange}
                isLightMode={isLightMode}
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
                lastAutosavedAt={lastAutosavedAt}
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
                editorTheme={editorTheme}
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

            {/* Project Bundle Exporter Modal (.zip with source, pdf/docx report, diagram & output) */}
            <ExportBundleModal
                isOpen={showExportBundleModal}
                onClose={() => setShowExportBundleModal(false)}
                activeTab={activeTab}
                flowchartData={activeTab.flowchartData}
                editorRef={editorRef}
                isLightMode={isLightMode}
            />

            {/* Draggable Centered Debugger & Variable Monitoring Overlay */}
            <DebugVariableInspectorModal
                isOpen={showDebugModal}
                onClose={() => setShowDebugModal(false)}
                editorRef={editorRef}
                activeTab={activeTab}
                code={editorRef.current ? editorRef.current.getValue() : (activeTab.code || '')}
                language={activeTab.language}
                isLightMode={isLightMode}
                onRunCode={handleExecuteCode}
                externalBreakpoints={debuggerBreakpoints}
                onToggleBreakpoint={handleToggleBreakpoint}
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
