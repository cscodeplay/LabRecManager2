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
    Monitor
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';
import { compilerAPI } from '@/lib/api';
import MermaidRenderer from '@/components/MermaidRenderer';

// Dynamically load Monaco Editor
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

// Editor Themes
const EDITOR_THEMES = [
    { id: 'vs-dark', label: 'Dark Modern (Default)' },
    { id: 'vs', label: 'Clean Light' },
    { id: 'hc-black', label: 'High Contrast Black' }
];

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

// Starter Templates
const STARTER_TEMPLATES = {
    python: [
        {
            id: 'py_evaluator',
            title: 'Student Grade Evaluator (I/O & If-Else)',
            desc: 'Demonstrates input, conditions, branching, and output conventional shapes',
            code: `# Student Grade Evaluator
# Uses Input (Parallelograms), Conditions (Diamonds), and Output (Parallelograms)

name = input("Enter student name: ")
score = int(input("Enter marks obtained (0-100): "))

if score >= 90:
    grade = "A+"
    remarks = "Outstanding Performance"
elif score >= 75:
    grade = "A"
    remarks = "Excellent Work"
elif score >= 60:
    grade = "B"
    remarks = "Good Effort"
elif score >= 40:
    grade = "C"
    remarks = "Passed"
else:
    grade = "F"
    remarks = "Needs Academic Improvement"

print("---------------------------------")
print("Student Name:", name)
print("Score:", score)
print("Grade:", grade)
print("Remarks:", remarks)
print("---------------------------------")
`
        },
        {
            id: 'py_loops',
            title: 'Sum & Factorial Calculator (Loops & Math)',
            desc: 'Demonstrates loop iteration and cumulative calculation',
            code: `# Sum of 1..N and Factorial Calculation
# Demonstrates Loop headers (Hexagon), Calculations (Rectangles), and I/O (Parallelograms)

n = int(input("Enter a positive number N: "))

total_sum = 0
factorial = 1
i = 1

while i <= n:
    total_sum = total_sum + i
    factorial = factorial * i
    i = i + 1

print("Sum of 1 to", n, "is:", total_sum)
print("Factorial of", n, "is:", factorial)
`
        },
        {
            id: 'py_prime',
            title: 'Prime Number Checker',
            desc: 'Demonstrates nested conditions, break statements, and boolean flags',
            code: `# Prime Number Checker
num = int(input("Enter an integer to test: "))

if num <= 1:
    is_prime = False
else:
    is_prime = True
    d = 2
    while d * d <= num:
        if num % d == 0:
            is_prime = False
            break
        d = d + 1

if is_prime:
    print(num, "is a PRIME number!")
else:
    print(num, "is NOT a prime number.")
`
        },
        {
            id: 'py_blank',
            title: 'Blank Python Script',
            desc: 'Clean workspace to practice custom Python code',
            code: `# Write your Python practice code here
# Click 'Run Code' or press Ctrl+Enter to execute

print("Hello, Python Practice Studio!")
`
        }
    ],
    sql: [
        {
            id: 'sql_university',
            title: 'University Schema (Persistent Tables)',
            desc: 'Departments, Instructors, Students, Courses & Enrollments with Foreign Keys',
            code: `-- University Management Schema
-- All tables and rows created are PERSISTENT and saved for your next login!

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY,
    dept_name TEXT NOT NULL,
    building TEXT
);

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    department_id INTEGER,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    credits INTEGER,
    department_id INTEGER,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY,
    student_id INTEGER,
    course_id INTEGER,
    grade TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Seed Data (Insert or Replace)
INSERT OR IGNORE INTO departments VALUES (1, 'Computer Science', 'Turing Hall'), (2, 'Mathematics', 'Euler Block');
INSERT OR IGNORE INTO students VALUES (101, 'Aarav Sharma', 'aarav@mslabs.com', 1), (102, 'Priya Patel', 'priya@mslabs.com', 1);
INSERT OR IGNORE INTO courses VALUES (501, 'Python Programming', 4, 1), (502, 'Relational Databases', 3, 1);
INSERT OR IGNORE INTO enrollments VALUES (1, 101, 501, 'A+'), (2, 101, 502, 'A'), (3, 102, 501, 'B+');

-- Query: Student Course Report
SELECT 
    s.name AS student_name, 
    d.dept_name AS department, 
    c.title AS course_title, 
    e.grade 
FROM enrollments e
JOIN students s ON e.student_id = s.id
JOIN courses c ON e.course_id = c.id
JOIN departments d ON s.department_id = d.id;
`
        },
        {
            id: 'sql_ecommerce',
            title: 'E-Commerce Orders & Customers',
            desc: 'Customers, Products, Orders, and Order Items Schema',
            code: `-- E-Commerce Platform Database Schema
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    product_name TEXT NOT NULL,
    price DECIMAL(10, 2)
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    order_date TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

INSERT OR IGNORE INTO customers VALUES (1, 'Rahul Verma', 'New Delhi'), (2, 'Ananya Sen', 'Mumbai');
INSERT OR IGNORE INTO products VALUES (1, 'Mechanical Keyboard', 2499.00), (2, 'Gaming Mouse', 899.00);
INSERT OR IGNORE INTO orders VALUES (101, 1, '2026-10-30'), (102, 2, '2026-10-31');

SELECT o.id AS order_id, c.name AS customer, c.city, o.order_date
FROM orders o
JOIN customers c ON o.customer_id = c.id;
`
        },
        {
            id: 'sql_blank',
            title: 'Blank SQL Script',
            desc: 'Write custom SQL DDL and queries',
            code: `-- Write your SQL DDL & queries here
-- Tables created here are permanently saved to your account!

CREATE TABLE IF NOT EXISTS practice_items (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    score INTEGER
);

INSERT INTO practice_items (title, score) VALUES ('Python Basics', 95);

SELECT * FROM practice_items;
`
        }
    ]
};

// Initial Flowchart Designer Blueprint for Students
const DEFAULT_STUDENT_FLOWCHART = `flowchart TD
    startNode(["Start"]):::terminator
    inputNode[/"Input score"/]:::io
    decNode{"score >= 40?"}:::decision
    passNode[\\"Print 'Passed'\"\\]:::io
    failNode[\\"Print 'Needs Improvement'\"\\]:::io
    endNode(["End"]):::terminator

    startNode --> inputNode
    inputNode --> decNode
    decNode -->|Yes| passNode
    decNode -->|No| failNode
    passNode --> endNode
    failNode --> endNode

    classDef terminator fill:#dcfce7,stroke:#16a34a,stroke-width:2px,font-weight:bold,color:#14532d;
    classDef io fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a;
    classDef process fill:#f8fafc,stroke:#475569,stroke-width:2px,color:#0f172a;
    classDef decision fill:#fef3c7,stroke:#d97706,stroke-width:2px,font-weight:bold,color:#78350f;
    classDef loop fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,font-weight:bold,color:#581c87;`;

// Initial ER Diagram Designer Blueprint for Students (Chen Notation)
const DEFAULT_STUDENT_ERD = `flowchart TD
    ent_student["STUDENT"]:::entity
    ent_course["COURSE"]:::entity
    rel_enrolls{"ENROLLED_IN"}:::relationship

    attr_s_id(["<u>id</u> (PK)"]):::pkAttr
    attr_s_name(["name"]):::attr
    attr_c_id(["<u>id</u> (PK)"]):::pkAttr
    attr_c_title(["title"]):::attr

    ent_student --- attr_s_id
    ent_student --- attr_s_name
    ent_course --- attr_c_id
    ent_course --- attr_c_title

    ent_student ---|N| rel_enrolls
    rel_enrolls ---|M| ent_course

    classDef entity fill:#e0e7ff,stroke:#4338ca,stroke-width:2px,font-weight:bold,color:#1e1b4b;
    classDef relationship fill:#fef3c7,stroke:#d97706,stroke-width:2px,font-weight:bold,color:#78350f;
    classDef pkAttr fill:#dcfce7,stroke:#16a34a,stroke-width:2px,font-weight:bold,color:#14532d;
    classDef attr fill:#f8fafc,stroke:#64748b,stroke-width:1.5px,color:#334155;`;

export default function PracticeIDEPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    // Permissions: Generation is limited to Admin & Instructor!
    const isInstructorOrAdmin =
        user?.role === 'admin' || user?.role === 'instructor' || user?.role === 'principal';

    // Language state
    const [language, setLanguage] = useState('python'); // 'python' | 'sql'

    // Editor content & autosave
    const [code, setCode] = useState('');
    const [stdin, setStdin] = useState('');
    const [showStdin, setShowStdin] = useState(false);
    const [autosaveStatus, setAutosaveStatus] = useState('saved'); // 'saved' | 'saving'
    const [lastSavedTime, setLastSavedTime] = useState(null);

    // Persistent student database tables
    const [existingTables, setExistingTables] = useState([]);
    const [isResettingDb, setIsResettingDb] = useState(false);

    // Multi-project / template state
    const [activeTemplateId, setActiveTemplateId] = useState('py_evaluator');

    // Execution state
    const [isExecuting, setIsExecuting] = useState(false);
    const [output, setOutput] = useState(null); // { stdout, stderr, durationMs, exitCode, tables, runner }
    const [activeTab, setActiveTab] = useState('output'); // 'output' | 'diagram' | 'table'

    // Diagram Designer state (Editable by Students)
    const [pythonFlowchartCode, setPythonFlowchartCode] = useState(DEFAULT_STUDENT_FLOWCHART);
    const [sqlErDiagramCode, setSqlErDiagramCode] = useState(DEFAULT_STUDENT_ERD);
    const [diagramNotation, setDiagramNotation] = useState('conventional'); // 'conventional' | 'relational'
    const [designerMode, setDesignerMode] = useState('visual'); // 'visual' | 'code'
    const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);

    // Quick shape node creator in Designer
    const [newNodeText, setNewNodeText] = useState('');
    const [newNodeType, setNewNodeType] = useState('process'); // 'process' | 'io_in' | 'io_out' | 'decision' | 'loop' | 'terminator'

    // Multiple Themes: Editor and Output
    const [editorTheme, setEditorTheme] = useState('vs-dark');
    const [outputThemeId, setOutputThemeId] = useState('classic');
    const currentOutputTheme = OUTPUT_THEMES.find((t) => t.id === outputThemeId) || OUTPUT_THEMES[0];

    const [fontSize, setFontSize] = useState(14);
    const editorRef = useRef(null);
    const autosaveTimerRef = useRef(null);

    // 1. Initial Load: Retrieve saved student workspace from Server & Database
    useEffect(() => {
        let isMounted = true;

        async function loadStudentWorkspace() {
            try {
                const response = await compilerAPI.getWorkspace();
                if (response.data && response.data.success && isMounted) {
                    const ws = response.data.data;

                    if (ws.editorTheme) setEditorTheme(ws.editorTheme);
                    if (ws.outputTheme) setOutputThemeId(ws.outputTheme);
                    if (ws.existingTables) setExistingTables(ws.existingTables);
                    if (ws.pythonFlowchart) setPythonFlowchartCode(ws.pythonFlowchart);
                    if (ws.sqlErDiagram) setSqlErDiagramCode(ws.sqlErDiagram);

                    // Restore code if present
                    if (language === 'python' && ws.pythonCode) {
                        setCode(ws.pythonCode);
                        return;
                    } else if (language === 'sql' && ws.sqlCode) {
                        setCode(ws.sqlCode);
                        return;
                    }
                }
            } catch (err) {
                console.warn('Workspace fetch warning:', err.message);
            }

            // Fallback to localStorage or starter template
            if (typeof window !== 'undefined' && isMounted) {
                const storageKey = `ulrms_ide_${user?.id || 'guest'}_${language}`;
                const cached = localStorage.getItem(storageKey);
                if (cached && cached.trim()) {
                    setCode(cached);
                } else {
                    const defaultTemplate = STARTER_TEMPLATES[language][0];
                    setCode(defaultTemplate.code);
                    setActiveTemplateId(defaultTemplate.id);
                }
            }
        }

        loadStudentWorkspace();

        return () => {
            isMounted = false;
        };
    }, [language, user?.id]);

    // 2. Debounced Autosave to both localStorage AND Server-side Workspace
    const handleCodeChange = (newCode) => {
        const val = newCode || '';
        setCode(val);
        setAutosaveStatus('saving');

        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
        }

        autosaveTimerRef.current = setTimeout(async () => {
            if (typeof window !== 'undefined') {
                const storageKey = `ulrms_ide_${user?.id || 'guest'}_${language}`;
                localStorage.setItem(storageKey, val);
            }

            // Sync with backend persistent workspace
            try {
                await compilerAPI.saveWorkspace({
                    [language === 'python' ? 'pythonCode' : 'sqlCode']: val,
                    editorTheme,
                    outputTheme: outputThemeId
                });
                setAutosaveStatus('saved');
                setLastSavedTime(new Date());
            } catch (err) {
                setAutosaveStatus('saved'); // Local is saved
            }
        }, 800);
    };

    // Stdin change with storage
    const handleStdinChange = (e) => {
        const val = e.target.value;
        setStdin(val);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`ulrms_ide_stdin_${user?.id || 'guest'}`, val);
        }
    };

    // Switch Language
    const handleLanguageSwitch = (newLang) => {
        if (newLang === language) return;
        setLanguage(newLang);
        setOutput(null);

        const storageKey = `ulrms_ide_${user?.id || 'guest'}_${newLang}`;
        const cached = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;

        if (cached && cached.trim()) {
            setCode(cached);
        } else {
            const defaultTemplate = STARTER_TEMPLATES[newLang][0];
            setCode(defaultTemplate.code);
            setActiveTemplateId(defaultTemplate.id);
        }
    };

    // Load Starter Template
    const handleSelectTemplate = (template) => {
        setActiveTemplateId(template.id);
        setCode(template.code);
        handleCodeChange(template.code);
        toast.success(`Loaded "${template.title}" template`);
    };

    // Save Theme change
    const handleEditorThemeChange = async (theme) => {
        setEditorTheme(theme);
        try {
            await compilerAPI.saveWorkspace({ editorTheme: theme });
        } catch (e) {}
    };

    const handleOutputThemeChange = async (tId) => {
        setOutputThemeId(tId);
        try {
            await compilerAPI.saveWorkspace({ outputTheme: tId });
        } catch (e) {}
    };

    // Execute Code
    const handleExecuteCode = async () => {
        if (!code.trim()) {
            toast.error('Editor is empty. Please enter code to execute.');
            return;
        }

        setIsExecuting(true);
        setActiveTab('output');

        try {
            const response = await compilerAPI.execute({
                language: language === 'sql' ? 'sql' : 'python3',
                code: code,
                stdin: language === 'python' ? stdin : ''
            });

            if (response.data && response.data.success) {
                const resData = response.data.data;
                setOutput(resData);

                if (resData.existingTables) {
                    setExistingTables(resData.existingTables);
                }

                if (resData.stderr && !resData.stdout) {
                    toast.error('Execution encountered an error');
                } else {
                    toast.success(
                        language === 'sql' && resData.isPersistent
                            ? `Executed! Saved to your personal database (${resData.durationMs || 0}ms)`
                            : `Executed successfully (${resData.durationMs || 0}ms)`
                    );
                }
            } else {
                throw new Error(response.data?.message || 'Execution failed');
            }
        } catch (err) {
            console.error('Execution error:', err);
            const errMsg = err.response?.data?.message || err.message || 'Execution failed';
            setOutput({
                stdout: '',
                stderr: errMsg,
                exitCode: 1,
                durationMs: 0
            });
            toast.error(errMsg);
        } finally {
            setIsExecuting(false);
        }
    };

    // Reset Personal Practice Database
    const handleResetDatabase = async () => {
        if (!confirm('Are you sure you want to reset your personal database? All created tables and records will be deleted.')) {
            return;
        }

        setIsResettingDb(true);
        try {
            await compilerAPI.resetDatabase();
            setExistingTables([]);
            setOutput(null);
            toast.success('Your practice database has been reset to blank state.');
        } catch (err) {
            toast.error('Failed to reset database: ' + err.message);
        } finally {
            setIsResettingDb(false);
        }
    };

    // Auto-Generate Diagram (Restricted to Instructors & Admins)
    const handleAutoGenerateDiagram = async () => {
        if (!isInstructorOrAdmin) {
            toast.error('Diagram auto-generation is reserved for Instructors and Administrators.');
            return;
        }

        if (!code.trim()) {
            toast.error('Please write some code first to generate a diagram.');
            return;
        }

        setIsGeneratingDiagram(true);
        setActiveTab('diagram');

        try {
            const response = await compilerAPI.generateDiagram({
                language,
                code,
                notation: diagramNotation
            });

            if (response.data && response.data.success) {
                const dData = response.data.data;
                if (language === 'python') {
                    setPythonFlowchartCode(dData.mermaidCode);
                } else {
                    setSqlErDiagramCode(dData.mermaidCode);
                }

                // Persist to server
                await compilerAPI.saveWorkspace({
                    [language === 'python' ? 'pythonFlowchart' : 'sqlErDiagram']: dData.mermaidCode
                });

                toast.success('Diagram generated and saved to your workspace!');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Diagram generation failed');
        } finally {
            setIsGeneratingDiagram(false);
        }
    };

    // Student Designer: Add a Conventional Shape Node
    const handleAddDesignerShape = (shapeType) => {
        const text = (newNodeText || 'Action').trim();
        const randId = `n_${Math.random().toString(36).substring(2, 7)}`;

        if (language === 'python') {
            let shapeSnippet = '';
            if (shapeType === 'terminator') shapeSnippet = `    ${randId}(["${text}"]):::terminator\n`;
            else if (shapeType === 'io_in') shapeSnippet = `    ${randId}[/"Input: ${text}"/]:::io\n`;
            else if (shapeType === 'io_out') shapeSnippet = `    ${randId}[\\"Print: ${text}\\"\\]:::io\n`;
            else if (shapeType === 'decision') shapeSnippet = `    ${randId}{"${text}?"}:::decision\n`;
            else if (shapeType === 'loop') shapeSnippet = `    ${randId}{{"Loop: ${text}"}}:::loop\n`;
            else shapeSnippet = `    ${randId}["${text}"]:::process\n`;

            // Insert before classDef
            const parts = pythonFlowchartCode.split('classDef');
            const updatedCode = parts[0] + shapeSnippet + (parts[1] ? 'classDef' + parts[1] : '');
            setPythonFlowchartCode(updatedCode);
            handleSaveDesignedDiagram(updatedCode, sqlErDiagramCode);
        } else {
            // SQL ER Chen shape insertion
            let shapeSnippet = '';
            if (shapeType === 'entity') shapeSnippet = `    ent_${randId}["${text.toUpperCase()}"]:::entity\n`;
            else if (shapeType === 'pk') shapeSnippet = `    attr_${randId}(["<u>${text}</u> (PK)"]):::pkAttr\n`;
            else if (shapeType === 'attr') shapeSnippet = `    attr_${randId}(["${text}"]):::attr\n`;
            else if (shapeType === 'relationship') shapeSnippet = `    rel_${randId}{"${text.toUpperCase()}"}:::relationship\n`;

            const parts = sqlErDiagramCode.split('classDef');
            const updatedCode = parts[0] + shapeSnippet + (parts[1] ? 'classDef' + parts[1] : '');
            setSqlErDiagramCode(updatedCode);
            handleSaveDesignedDiagram(pythonFlowchartCode, updatedCode);
        }

        setNewNodeText('');
        toast.success('Shape added to your diagram!');
    };

    // Save Student Designed Diagram to Server Workspace
    const handleSaveDesignedDiagram = async (pyCode, sqlCode) => {
        try {
            await compilerAPI.saveWorkspace({
                pythonFlowchart: pyCode !== undefined ? pyCode : pythonFlowchartCode,
                sqlErDiagram: sqlCode !== undefined ? sqlCode : sqlErDiagramCode
            });
        } catch (e) {}
    };

    // Quick Insert Table Query
    const handleInsertTableQuery = (tableName) => {
        const query = `\nSELECT * FROM ${tableName};\n`;
        setCode((prev) => prev + query);
        handleCodeChange(code + query);
        toast.success(`Appended SELECT query for table "${tableName}"`);
    };

    // Keyboard shortcut (Ctrl+Enter or Cmd+Enter to run)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleExecuteCode();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [code, stdin, language]);

    // Download code file
    const handleDownloadCode = () => {
        const extension = language === 'python' ? 'py' : 'sql';
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `practice_${language}_${Date.now()}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded .${extension} script!`);
    };

    const currentDiagramCode = language === 'python' ? pythonFlowchartCode : sqlErDiagramCode;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[100vw] overflow-hidden bg-slate-950 text-slate-100 font-sans">
            {/* Top Command Toolbar */}
            <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex-shrink-0">
                {/* Left: Language Selector & Title */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                            <Code2 className="w-4 h-4" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                                Code Practice Studio
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Persistent Workspace
                                </span>
                            </h1>
                        </div>
                    </div>

                    {/* Language Switcher Buttons */}
                    <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                        <button
                            onClick={() => handleLanguageSwitch('python')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                                language === 'python'
                                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                        >
                            <span className="font-mono font-bold">Py</span>
                            Python 3
                        </button>
                        <button
                            onClick={() => handleLanguageSwitch('sql')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                                language === 'sql'
                                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                        >
                            <Database className="w-3.5 h-3.5" />
                            SQL (SQLite DB)
                        </button>
                    </div>

                    {/* Starter Templates Dropdown */}
                    <div className="relative group hidden sm:block">
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs font-medium text-slate-300 transition">
                            <BookOpen className="w-3.5 h-3.5 text-primary-400" />
                            <span>Templates</span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        <div className="absolute left-0 top-full mt-1 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 hidden group-hover:block animate-in fade-in slide-in-from-top-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider">
                                {language.toUpperCase()} Starter Templates
                            </p>
                            {STARTER_TEMPLATES[language].map((tmpl) => (
                                <button
                                    key={tmpl.id}
                                    onClick={() => handleSelectTemplate(tmpl)}
                                    className={`w-full text-left p-2 rounded-lg text-xs transition ${
                                        activeTemplateId === tmpl.id
                                            ? 'bg-primary-600/20 text-primary-300 font-semibold'
                                            : 'text-slate-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <p className="font-medium text-slate-200">{tmpl.title}</p>
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{tmpl.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Actions, Themes, Persistent DB State & Execution */}
                <div className="flex items-center gap-2">
                    {/* Persistent DB Tables Indicator (SQL mode) */}
                    {language === 'sql' && (
                        <div className="relative group hidden md:block">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-950/70 border border-sky-800/80 text-[11px] text-sky-300 cursor-pointer">
                                <Database className="w-3.5 h-3.5 text-sky-400" />
                                <span className="font-semibold">My DB Tables ({existingTables.length})</span>
                                <ChevronDown className="w-3 h-3 text-sky-400" />
                            </div>
                            <div className="absolute right-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 hidden group-hover:block animate-in fade-in">
                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-1.5">
                                    <span className="text-[10px] uppercase font-bold text-sky-400">
                                        Saved SQLite Tables
                                    </span>
                                    <button
                                        onClick={handleResetDatabase}
                                        disabled={isResettingDb}
                                        className="text-[10px] text-rose-400 hover:text-rose-300 underline font-medium"
                                        title="Clear all saved tables and restart with a clean database"
                                    >
                                        Reset DB
                                    </button>
                                </div>
                                {existingTables.length > 0 ? (
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                        {existingTables.map((tbl) => (
                                            <button
                                                key={tbl}
                                                onClick={() => handleInsertTableQuery(tbl)}
                                                className="w-full text-left px-2 py-1 rounded hover:bg-slate-800 flex items-center justify-between text-xs text-slate-200 transition"
                                                title="Click to query this table"
                                            >
                                                <span className="font-mono text-sky-300">{tbl}</span>
                                                <span className="text-[10px] text-slate-500">Query &rarr;</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-slate-400 p-1 italic">
                                        No tables created yet. Run CREATE TABLE to persist your data!
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Autosave Status Pill */}
                    <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-400"
                        title="Code & tables are continuously saved to your server account and local cache"
                    >
                        {autosaveStatus === 'saving' ? (
                            <>
                                <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                                <span className="text-amber-400 font-medium">Autosaving...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-medium">Saved (Next Login)</span>
                            </>
                        )}
                    </div>

                    {/* Theme Selector Popover */}
                    <div className="relative group">
                        <button
                            className="flex items-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs text-slate-300 transition"
                            title="Editor & Output Screen Themes"
                        >
                            <Palette className="w-3.5 h-3.5 text-purple-400" />
                            <span className="hidden sm:inline">Themes</span>
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2.5 z-50 hidden group-hover:block animate-in fade-in">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                                Monaco Editor Theme
                            </p>
                            <div className="space-y-1 mb-3">
                                {EDITOR_THEMES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => handleEditorThemeChange(t.id)}
                                        className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between ${
                                            editorTheme === t.id
                                                ? 'bg-purple-600/30 text-purple-300 font-bold'
                                                : 'text-slate-300 hover:bg-slate-800'
                                        }`}
                                    >
                                        <span>{t.label}</span>
                                        {editorTheme === t.id && <Check className="w-3 h-3 text-purple-400" />}
                                    </button>
                                ))}
                            </div>

                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                                Output Screen Theme
                            </p>
                            <div className="space-y-1">
                                {OUTPUT_THEMES.map((ot) => (
                                    <button
                                        key={ot.id}
                                        onClick={() => handleOutputThemeChange(ot.id)}
                                        className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between ${
                                            outputThemeId === ot.id
                                                ? 'bg-emerald-600/30 text-emerald-300 font-bold'
                                                : 'text-slate-300 hover:bg-slate-800'
                                        }`}
                                    >
                                        <span>{ot.label}</span>
                                        {outputThemeId === ot.id && <Check className="w-3 h-3 text-emerald-400" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Stdin Drawer Toggle (Python only) */}
                    {language === 'python' && (
                        <button
                            onClick={() => setShowStdin(!showStdin)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border transition ${
                                showStdin
                                    ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                            }`}
                            title="Provide standard input for input() prompts"
                        >
                            <Terminal className="w-3.5 h-3.5" />
                            <span>Stdin</span>
                            {stdin.trim() && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />}
                        </button>
                    )}

                    {/* Download Script */}
                    <button
                        onClick={handleDownloadCode}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition"
                        title="Download Code File"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Auto-Generate Button (Instructors & Admins ONLY) */}
                    {isInstructorOrAdmin && (
                        <button
                            onClick={handleAutoGenerateDiagram}
                            disabled={isGeneratingDiagram}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
                            title="Auto-generate Flowchart/ER Diagram from code (Instructor & Admin Tool)"
                        >
                            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingDiagram ? 'animate-spin' : ''}`} />
                            <span>{isGeneratingDiagram ? 'Generating...' : 'Auto-Generate'}</span>
                        </button>
                    )}

                    {/* Run Code Button */}
                    <button
                        onClick={handleExecuteCode}
                        disabled={isExecuting}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition disabled:opacity-50 cursor-pointer"
                        title="Run code (Ctrl+Enter / Cmd+Enter)"
                    >
                        <Play className={`w-3.5 h-3.5 fill-current ${isExecuting ? 'animate-pulse' : ''}`} />
                        <span>{isExecuting ? 'Running...' : 'Run Code'}</span>
                    </button>
                </div>
            </header>

            {/* Main Split Screen Area: Left Editor, Right Output & Diagrams */}
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 overflow-hidden">
                {/* LEFT PANEL: Monaco Code Editor & Stdin */}
                <section className="flex flex-col h-full border-r border-slate-800 overflow-hidden bg-slate-950">
                    {/* Editor Mini Toolbar */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-emerald-400 font-semibold">
                                {language === 'python' ? 'main.py' : 'database.sql'}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[11px] text-slate-400">
                                {language === 'python'
                                    ? 'Python 3.13 Runtime'
                                    : 'Persistent SQLite DB (Saved across Logins)'}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Font size adjustments */}
                            <div className="flex items-center gap-1 text-[11px]">
                                <button
                                    onClick={() => setFontSize(Math.max(11, fontSize - 1))}
                                    className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                                    title="Decrease font size"
                                >
                                    A-
                                </button>
                                <span className="font-mono">{fontSize}px</span>
                                <button
                                    onClick={() => setFontSize(Math.min(22, fontSize + 1))}
                                    className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                                    title="Increase font size"
                                >
                                    A+
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Monaco Editor Canvas */}
                    <div className="flex-1 relative overflow-hidden">
                        <Editor
                            height="100%"
                            language={language === 'sql' ? 'sql' : 'python'}
                            value={code}
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
                                tabSize: language === 'python' ? 4 : 2,
                                insertSpaces: true,
                                wordWrap: 'on',
                                padding: { top: 12, bottom: 12 },
                                lineNumbers: 'on',
                                renderLineHighlight: 'all',
                                bracketPairColorization: { enabled: true }
                            }}
                        />
                    </div>

                    {/* Standard Input (Stdin) Drawer */}
                    {language === 'python' && showStdin && (
                        <div className="p-3 bg-slate-900 border-t border-slate-800 animate-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                                    <Terminal className="w-3.5 h-3.5" />
                                    Standard Input (stdin for input() calls)
                                </label>
                                <button
                                    onClick={() => setShowStdin(false)}
                                    className="text-[11px] text-slate-400 hover:text-slate-200"
                                >
                                    Collapse
                                </button>
                            </div>
                            <textarea
                                value={stdin}
                                onChange={handleStdinChange}
                                placeholder="Enter input values separated by newlines (e.g. line 1 = first input(), line 2 = second input())..."
                                rows={3}
                                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-md font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-600 resize-none"
                            />
                        </div>
                    )}
                </section>

                {/* RIGHT PANEL: Themed Output Screen & Conventional Diagram Designer */}
                <section className="flex flex-col h-full overflow-hidden bg-slate-900/60">
                    {/* Tab Navigation Header */}
                    <div className="flex items-center justify-between px-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setActiveTab('output')}
                                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition ${
                                    activeTab === 'output'
                                        ? 'border-emerald-500 text-emerald-400'
                                        : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Terminal className="w-3.5 h-3.5" />
                                <span>Output Screen</span>
                                {output?.durationMs !== undefined && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                                        {output.durationMs}ms
                                    </span>
                                )}
                            </button>

                            {/* Structured SQL Data Table Tab */}
                            {language === 'sql' && output?.tables && output.tables.length > 0 && (
                                <button
                                    onClick={() => setActiveTab('table')}
                                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition ${
                                        activeTab === 'table'
                                            ? 'border-sky-500 text-sky-400'
                                            : 'border-transparent text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                    <span>Query Results</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 font-mono">
                                        {output.tables.length} row(s)
                                    </span>
                                </button>
                            )}

                            {/* Diagram Designer Tab */}
                            <button
                                onClick={() => setActiveTab('diagram')}
                                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition ${
                                    activeTab === 'diagram'
                                        ? 'border-purple-500 text-purple-400'
                                        : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Shapes className="w-3.5 h-3.5" />
                                <span>
                                    {language === 'python' ? 'Flowchart Designer' : 'ER Diagram Designer'}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                                    Conventional
                                </span>
                            </button>
                        </div>

                        {/* Right header actions */}
                        <div className="flex items-center gap-2">
                            {/* Output theme quick switcher */}
                            {activeTab === 'output' && (
                                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                    <span className="hidden sm:inline">Theme:</span>
                                    <select
                                        value={outputThemeId}
                                        onChange={(e) => handleOutputThemeChange(e.target.value)}
                                        className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                                    >
                                        {OUTPUT_THEMES.map((th) => (
                                            <option key={th.id} value={th.id}>
                                                {th.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Diagram mode toggles */}
                            {activeTab === 'diagram' && (
                                <div className="flex items-center gap-2">
                                    {language === 'sql' && (
                                        <div className="flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700 text-[11px]">
                                            <button
                                                onClick={() => setDiagramNotation('conventional')}
                                                className={`px-2 py-0.5 rounded font-medium transition ${
                                                    diagramNotation === 'conventional'
                                                        ? 'bg-purple-600 text-white font-semibold'
                                                        : 'text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                Chen Notation
                                            </button>
                                            <button
                                                onClick={() => setDiagramNotation('relational')}
                                                className={`px-2 py-0.5 rounded font-medium transition ${
                                                    diagramNotation === 'relational'
                                                        ? 'bg-purple-600 text-white font-semibold'
                                                        : 'text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                Relational ERD
                                            </button>
                                        </div>
                                    )}

                                    {/* Visual vs Code view toggle for Diagram */}
                                    <div className="flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700 text-[11px]">
                                        <button
                                            onClick={() => setDesignerMode('visual')}
                                            className={`px-2 py-0.5 rounded font-medium transition ${
                                                designerMode === 'visual'
                                                    ? 'bg-indigo-600 text-white font-semibold'
                                                    : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            Visual Preview
                                        </button>
                                        <button
                                            onClick={() => setDesignerMode('code')}
                                            className={`px-2 py-0.5 rounded font-medium transition ${
                                                designerMode === 'code'
                                                    ? 'bg-indigo-600 text-white font-semibold'
                                                    : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            Edit Syntax
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* TAB CONTENT 1: Themed Output Screen */}
                    {activeTab === 'output' && (
                        <div
                            className={`flex-1 flex flex-col p-4 overflow-y-auto transition-colors duration-200 ${currentOutputTheme.containerClass}`}
                        >
                            {output ? (
                                <div className="space-y-4">
                                    {/* Execution metadata bar */}
                                    <div
                                        className={`flex items-center justify-between pb-2 border-b text-[11px] ${currentOutputTheme.headerClass}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`inline-flex items-center gap-1 font-semibold ${
                                                    output.exitCode === 0
                                                        ? currentOutputTheme.accentText
                                                        : 'text-rose-400'
                                                }`}
                                            >
                                                {output.exitCode === 0 ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                ) : (
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                )}
                                                {output.exitCode === 0
                                                    ? 'Process Finished (0)'
                                                    : `Exited with Error (${output.exitCode})`}
                                            </span>
                                            <span>•</span>
                                            <span>Duration: {output.durationMs || 0}ms</span>
                                        </div>
                                        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                                            Runner: {output.runner || 'native'}
                                        </span>
                                    </div>

                                    {/* Standard Output (stdout) */}
                                    {output.stdout ? (
                                        <div
                                            className={`p-3 rounded-lg border whitespace-pre-wrap leading-relaxed select-text font-mono text-xs ${currentOutputTheme.stdoutClass}`}
                                        >
                                            {output.stdout}
                                        </div>
                                    ) : !output.stderr ? (
                                        <p className="opacity-60 italic text-xs">
                                            Command executed successfully with no stdout output.
                                        </p>
                                    ) : null}

                                    {/* Standard Error (stderr) */}
                                    {output.stderr && (
                                        <div className="bg-rose-950/40 p-3 rounded-lg border border-rose-800/60 text-rose-300 whitespace-pre-wrap leading-relaxed select-text font-mono text-xs">
                                            <div className="flex items-center gap-1.5 font-bold text-rose-400 mb-1">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>Runtime / Syntax Error:</span>
                                            </div>
                                            {output.stderr}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
                                    <Terminal className="w-10 h-10 mb-3 stroke-1" />
                                    <p className="text-sm font-semibold">No execution output yet</p>
                                    <p className="text-xs mt-1 max-w-sm">
                                        Click <span className="font-semibold underline">Run Code</span> or press{' '}
                                        <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">
                                            Ctrl+Enter
                                        </kbd>{' '}
                                        to execute your {language === 'python' ? 'Python' : 'SQL'} script.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB CONTENT 2: SQL Structured Data Table */}
                    {activeTab === 'table' && output?.tables && (
                        <div className="flex-1 flex flex-col p-4 overflow-auto">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                                    <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                                    <span>Query Result Set ({output.tables.length} rows)</span>
                                </h3>
                            </div>

                            <div className="flex-1 overflow-auto rounded-lg border border-slate-800 bg-slate-950 shadow-inner">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-900 border-b border-slate-800">
                                            <th className="p-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-10 text-center">
                                                #
                                            </th>
                                            {Object.keys(output.tables[0] || {}).map((col) => (
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
                                        {output.tables.map((row, idx) => (
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

                    {/* TAB CONTENT 3: Student Flowchart & ER Diagram Visual Designer */}
                    {activeTab === 'diagram' && (
                        <div className="flex-1 flex flex-col p-3 overflow-hidden">
                            {/* Shape Designer Toolbar */}
                            <div className="bg-slate-900/95 p-2.5 rounded-lg border border-slate-800 mb-2.5 flex-shrink-0">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <Shapes className="w-4 h-4 text-purple-400" />
                                        <span className="text-xs font-bold text-slate-200">
                                            {language === 'python'
                                                ? 'Flowchart Shape Palette'
                                                : 'Chen ER Shape Palette'}
                                        </span>
                                        {!isInstructorOrAdmin && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 ml-1">
                                                Student Designer Mode
                                            </span>
                                        )}
                                    </div>

                                    {/* Shape Insertion Buttons */}
                                    {language === 'python' ? (
                                        <div className="flex flex-wrap items-center gap-1 text-[11px]">
                                            <button
                                                onClick={() => handleAddDesignerShape('terminator')}
                                                className="px-2 py-1 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900 font-medium transition cursor-pointer"
                                                title="Add Oval Start/End Terminator"
                                            >
                                                + Oval (Start/End)
                                            </button>
                                            <button
                                                onClick={() => handleAddDesignerShape('io_in')}
                                                className="px-2 py-1 rounded bg-blue-950/80 border border-blue-500/50 text-blue-300 hover:bg-blue-900 font-medium transition cursor-pointer"
                                                title="Add Parallelogram Input"
                                            >
                                                + Parallelogram (Input)
                                            </button>
                                            <button
                                                onClick={() => handleAddDesignerShape('process')}
                                                className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700 font-medium transition cursor-pointer"
                                                title="Add Rectangle Calculation / Assignment"
                                            >
                                                + Rectangle (Process)
                                            </button>
                                            <button
                                                onClick={() => handleAddDesignerShape('decision')}
                                                className="px-2 py-1 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 hover:bg-amber-900 font-medium transition cursor-pointer"
                                                title="Add Diamond Decision Condition"
                                            >
                                                + Diamond (Decision)
                                            </button>
                                            <button
                                                onClick={() => handleAddDesignerShape('io_out')}
                                                className="px-2 py-1 rounded bg-blue-950/80 border border-blue-500/50 text-blue-300 hover:bg-blue-900 font-medium transition cursor-pointer"
                                                title="Add Parallelogram Output"
                                            >
                                                + Parallelogram (Output)
                                            </button>
                                            <button
                                                onClick={() => handleAddDesignerShape('loop')}
                                                className="px-2 py-1 rounded bg-purple-950/80 border border-purple-500/50 text-purple-300 hover:bg-purple-900 font-medium transition cursor-pointer"
                                                title="Add Hexagon Loop Header"
                                            >
                                                + Hexagon (Loop)
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap items-center gap-1 text-[11px]">
                                            <button
                                                onClick={() => handleAddDesignerShape('entity')}
                                                className="px-2 py-1 rounded bg-indigo-950/80 border border-indigo-500/50 text-indigo-300 hover:bg-indigo-900 font-medium transition cursor-pointer"
                                                title="Add Rectangle Entity"
                                            >
                                                + Rectangle (Entity)
                                            </button>
                                            <button
                                                onClick={() => handleAddDesignerShape('pk')}
                                                className="px-2 py-1 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900 font-medium transition cursor-pointer"
                                                title="Add Underlined Oval Primary Key"
                                            >
                                                + Underlined Oval (PK)
                                            </button>
                                            <button
                                                onClick={() => handleAddDesignerShape('attr')}
                                                className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700 font-medium transition cursor-pointer"
                                                title="Add Oval Attribute"
                                            >
                                                + Oval (Attribute)
                                            </button>
                                            <button
                                                onClick={() => handleAddDesignerShape('relationship')}
                                                className="px-2 py-1 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 hover:bg-amber-900 font-medium transition cursor-pointer"
                                                title="Add Diamond Relationship"
                                            >
                                                + Diamond (Relationship)
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Quick label input */}
                                <div className="mt-2 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newNodeText}
                                        onChange={(e) => setNewNodeText(e.target.value)}
                                        placeholder={
                                            language === 'python'
                                                ? 'Shape text (e.g. "total = total + i", "score >= 40?", "input n")...'
                                                : 'Element name (e.g. "STUDENT", "student_id", "ENROLLED_IN")...'
                                        }
                                        className="flex-1 px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-purple-500 placeholder-slate-600"
                                    />
                                    <span className="text-[10px] text-slate-400 hidden md:inline">
                                        Type text & click shape to add!
                                    </span>
                                </div>
                            </div>

                            {/* Designer Canvas View (Visual Preview vs Code Syntax Editor) */}
                            {designerMode === 'visual' ? (
                                <div className="flex-1 overflow-auto bg-slate-950 rounded-xl border border-slate-800 p-4 shadow-inner flex flex-col items-center justify-center">
                                    <div className="w-full max-w-full overflow-auto">
                                        <MermaidRenderer chart={currentDiagramCode} />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                                    <div className="p-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
                                        <span className="font-mono text-purple-400 font-semibold">
                                            Mermaid Diagram Syntax Editor
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                            Changes render immediately in Visual Preview
                                        </span>
                                    </div>
                                    <textarea
                                        value={currentDiagramCode}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (language === 'python') {
                                                setPythonFlowchartCode(val);
                                                handleSaveDesignedDiagram(val, sqlErDiagramCode);
                                            } else {
                                                setSqlErDiagramCode(val);
                                                handleSaveDesignedDiagram(pythonFlowchartCode, val);
                                            }
                                        }}
                                        className="flex-1 p-3 bg-slate-950 font-mono text-xs text-slate-200 focus:outline-none resize-none leading-relaxed"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
