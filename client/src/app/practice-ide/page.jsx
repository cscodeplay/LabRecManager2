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
    Maximize2,
    Minimize2,
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
    Sliders,
    Layers,
    Shapes,
    GitBranch,
    FileDown,
    Share2,
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';
import { compilerAPI } from '@/lib/api';
import MermaidRenderer from '@/components/MermaidRenderer';

// Dynamically load Monaco Editor to avoid SSR conflicts
const Editor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-slate-900 text-slate-400">
            <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-primary-400" />
                <span className="text-sm font-medium">Loading Code Studio Editor...</span>
            </div>
        </div>
    )
});

// Built-in Starter Templates
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
            id: 'py_bubble_sort',
            title: 'Bubble Sort Algorithm',
            desc: 'Demonstrates list manipulation and nested loop sorting',
            code: `# Bubble Sort Algorithm
numbers = [64, 34, 25, 12, 22, 11, 90]
print("Original List:", numbers)

n = len(numbers)
for i in range(n):
    for j in range(0, n - i - 1):
        if numbers[j] > numbers[j + 1]:
            # Swap adjacent elements
            numbers[j], numbers[j + 1] = numbers[j + 1], numbers[j]

print("Sorted List:  ", numbers)
`
        },
        {
            id: 'py_blank',
            title: 'Blank Python Script',
            desc: 'Clean workspace to practice custom Python code',
            code: `# Write your Python practice code here
# Click 'Run Code' or press Ctrl+Enter to execute
# Click 'Generate Flowchart' to view conventional shapes flowchart

print("Hello, Python Practice Studio!")
`
        }
    ],
    sql: [
        {
            id: 'sql_university',
            title: 'University Schema (Chen & Relational ERD)',
            desc: 'Departments, Instructors, Students, Courses & Enrollments with Foreign Keys',
            code: `-- University Management Schema
-- Practice SQL DDL, Foreign Keys, and ER Diagram Generation

CREATE TABLE departments (
    id INTEGER PRIMARY KEY,
    dept_name TEXT NOT NULL,
    building TEXT
);

CREATE TABLE instructors (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    department_id INTEGER,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE students (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    department_id INTEGER,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE courses (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    credits INTEGER,
    department_id INTEGER,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE enrollments (
    id INTEGER PRIMARY KEY,
    student_id INTEGER,
    course_id INTEGER,
    grade TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Seed Initial Data
INSERT INTO departments VALUES (1, 'Computer Science', 'Turing Hall'), (2, 'Mathematics', 'Euler Block');
INSERT INTO instructors VALUES (1, 'Dr. Alan Turing', 'turing@mslabs.com', 1), (2, 'Prof. Ada Lovelace', 'ada@mslabs.com', 1);
INSERT INTO students VALUES (101, 'Aarav Sharma', 'aarav@mslabs.com', 1), (102, 'Priya Patel', 'priya@mslabs.com', 1);
INSERT INTO courses VALUES (501, 'Python Programming', 4, 1), (502, 'Relational Databases', 3, 1);
INSERT INTO enrollments VALUES (1, 101, 501, 'A+'), (2, 101, 502, 'A'), (3, 102, 501, 'B+');

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
CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    phone TEXT
);

CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    product_name TEXT NOT NULL,
    category TEXT,
    price DECIMAL(10, 2)
);

CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    order_date TEXT,
    status TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Sample Data
INSERT INTO customers VALUES (1, 'Rahul Verma', 'New Delhi', '+91 9876543210'), (2, 'Ananya Sen', 'Mumbai', '+91 9876500000');
INSERT INTO products VALUES (1, 'Mechanical Keyboard', 'Electronics', 2499.00), (2, 'Gaming Mouse', 'Electronics', 899.00), (3, 'Python Textbook', 'Books', 650.00);
INSERT INTO orders VALUES (101, 1, '2026-10-30', 'Delivered'), (102, 2, '2026-10-31', 'Processing');
INSERT INTO order_items VALUES (1, 101, 1, 1), (2, 101, 2, 1), (3, 102, 3, 2);

-- Query: Total Order Value Report
SELECT 
    o.id AS order_id, 
    c.name AS customer_name, 
    p.product_name, 
    oi.quantity, 
    p.price,
    (oi.quantity * p.price) AS subtotal
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN customers c ON o.customer_id = c.id
JOIN products p ON oi.product_id = p.id;
`
        },
        {
            id: 'sql_library',
            title: 'Library Book Loan Management',
            desc: 'Authors, Books, Members, and Book Borrowing Transactions',
            code: `-- Library Book Management Schema
CREATE TABLE authors (
    id INTEGER PRIMARY KEY,
    author_name TEXT NOT NULL,
    nationality TEXT
);

CREATE TABLE books (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    author_id INTEGER,
    isbn TEXT UNIQUE,
    copies INTEGER,
    FOREIGN KEY (author_id) REFERENCES authors(id)
);

CREATE TABLE members (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    member_type TEXT
);

CREATE TABLE loans (
    id INTEGER PRIMARY KEY,
    book_id INTEGER,
    member_id INTEGER,
    loan_date TEXT,
    return_due_date TEXT,
    FOREIGN KEY (book_id) REFERENCES books(id),
    FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Seed Data
INSERT INTO authors VALUES (1, 'Guido van Rossum', 'Dutch'), (2, 'Edgar F. Codd', 'British');
INSERT INTO books VALUES (1, 'Python 3 Programming', 1, '978-0123456789', 5), (2, 'Relational Database Model', 2, '978-9876543210', 3);
INSERT INTO members VALUES (1, 'Simran Kaur', 'Student'), (2, 'Rohan Mehta', 'Faculty');
INSERT INTO loans VALUES (1, 1, 1, '2026-10-25', '2026-11-08');

-- Query: Active Book Borrowers
SELECT 
    b.title AS book_title, 
    a.author_name AS author, 
    m.name AS borrowed_by, 
    l.loan_date, 
    l.return_due_date
FROM loans l
JOIN books b ON l.book_id = b.id
JOIN authors a ON b.author_id = a.id
JOIN members m ON l.member_id = m.id;
`
        },
        {
            id: 'sql_blank',
            title: 'Blank SQL Script',
            desc: 'Write custom SQL DDL and queries',
            code: `-- Write your SQL DDL & queries here
-- Click 'Run SQL' to execute on SQLite in-memory engine
-- Click 'Generate ER Diagram' to view Chen or Relational diagram

CREATE TABLE practice_items (
    id INTEGER PRIMARY KEY,
    item_name TEXT NOT NULL,
    category TEXT,
    score INTEGER
);

INSERT INTO practice_items VALUES 
(1, 'Variables & Types', 'Python', 95),
(2, 'Loops & Logic', 'Python', 88),
(3, 'DDL & Tables', 'SQL', 92);

SELECT * FROM practice_items;
`
        }
    ]
};

export default function PracticeIDEPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    // Language state
    const [language, setLanguage] = useState('python'); // 'python' | 'sql'

    // Editor content & autosave
    const [code, setCode] = useState('');
    const [stdin, setStdin] = useState('');
    const [showStdin, setShowStdin] = useState(false);
    const [autosaveStatus, setAutosaveStatus] = useState('saved'); // 'saved' | 'saving'
    const [lastSavedTime, setLastSavedTime] = useState(null);

    // Multi-project / snippet management
    const [activeTemplateId, setActiveTemplateId] = useState('py_evaluator');

    // Execution state
    const [isExecuting, setIsExecuting] = useState(false);
    const [output, setOutput] = useState(null); // { stdout, stderr, durationMs, exitCode, tables, runner }
    const [activeTab, setActiveTab] = useState('output'); // 'output' | 'diagram' | 'table'

    // Diagram generation state
    const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);
    const [diagramCode, setDiagramCode] = useState('');
    const [diagramNotation, setDiagramNotation] = useState('conventional'); // 'conventional' | 'relational'
    const [diagramSource, setDiagramSource] = useState('none'); // 'ai' | 'deterministic' | 'none'

    // Editor settings
    const [editorTheme, setEditorTheme] = useState('vs-dark');
    const [fontSize, setFontSize] = useState(14);
    const editorRef = useRef(null);
    const autosaveTimerRef = useRef(null);

    // Load initial code from localStorage or default template
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const storageKey = `ulrms_ide_${user?.id || 'guest'}_${language}`;
        const cached = localStorage.getItem(storageKey);

        if (cached && cached.trim()) {
            setCode(cached);
        } else {
            const defaultTemplate = STARTER_TEMPLATES[language][0];
            setCode(defaultTemplate.code);
            setActiveTemplateId(defaultTemplate.id);
        }

        // Stdin default
        if (language === 'python') {
            const cachedStdin = localStorage.getItem(`ulrms_ide_stdin_${user?.id || 'guest'}`);
            if (cachedStdin) setStdin(cachedStdin);
        }

        setAutosaveStatus('saved');
        setLastSavedTime(new Date());
    }, [language, user?.id]);

    // Handle code change with debounced autosave
    const handleCodeChange = (newCode) => {
        const val = newCode || '';
        setCode(val);
        setAutosaveStatus('saving');

        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
        }

        autosaveTimerRef.current = setTimeout(() => {
            if (typeof window !== 'undefined') {
                const storageKey = `ulrms_ide_${user?.id || 'guest'}_${language}`;
                localStorage.setItem(storageKey, val);
                setAutosaveStatus('saved');
                setLastSavedTime(new Date());
            }
        }, 600);
    };

    // Stdin change with autosave
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
        setDiagramCode('');

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

    // Load Template
    const handleSelectTemplate = (template) => {
        setActiveTemplateId(template.id);
        setCode(template.code);
        handleCodeChange(template.code);
        toast.success(`Loaded "${template.title}" template`);
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

                if (resData.stderr && !resData.stdout) {
                    toast.error('Execution encountered an error');
                } else {
                    toast.success(`Executed successfully (${resData.durationMs || 0}ms)`);
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

    // Generate Diagram using Conventional Shapes
    const handleGenerateDiagram = async (overrideNotation) => {
        if (!code.trim()) {
            toast.error('Please write some code first to generate a diagram');
            return;
        }

        const notationToUse = overrideNotation || diagramNotation;
        setIsGeneratingDiagram(true);
        setActiveTab('diagram');

        try {
            const response = await compilerAPI.generateDiagram({
                language,
                code,
                notation: notationToUse
            });

            if (response.data && response.data.success) {
                const dData = response.data.data;
                setDiagramCode(dData.mermaidCode);
                setDiagramSource(dData.isAiGenerated ? 'ai' : 'deterministic');
                toast.success(
                    language === 'python'
                        ? 'Conventional Flowchart generated!'
                        : `ER Diagram (${notationToUse === 'conventional' ? 'Chen Notation' : 'Relational'}) generated!`
                );
            } else {
                throw new Error(response.data?.message || 'Diagram generation failed');
            }
        } catch (err) {
            console.error('Diagram generation error:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to generate diagram');
        } finally {
            setIsGeneratingDiagram(false);
        }
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

    // Copy code
    const handleCopyCode = () => {
        navigator.clipboard.writeText(code);
        toast.success('Code copied to clipboard!');
    };

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
                                Student Practice Studio
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Interactive IDE
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
                            SQL (SQLite)
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
                                {language.toUpperCase()} Practice Templates
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

                {/* Right: Actions, Execution, Diagram Generation & Autosave */}
                <div className="flex items-center gap-2">
                    {/* Autosave Status Pill */}
                    <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-400"
                        title="Code is continuously autosaved to browser localStorage on every stroke"
                    >
                        {autosaveStatus === 'saving' ? (
                            <>
                                <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                                <span className="text-amber-400 font-medium">Autosaving...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-medium">Autosaved</span>
                            </>
                        )}
                    </div>

                    {/* Stdin Toggle (Python only) */}
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

                    {/* Copy Code */}
                    <button
                        onClick={handleCopyCode}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition"
                        title="Copy Code"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Download Code */}
                    <button
                        onClick={handleDownloadCode}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition"
                        title="Download Code File"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Generate Diagram Button (Flowchart for Python / ER for SQL) */}
                    <button
                        onClick={() => handleGenerateDiagram()}
                        disabled={isGeneratingDiagram}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
                        title={
                            language === 'python'
                                ? 'Generate Conventional Flowchart (Oval, Parallelogram, Rectangle, Diamond)'
                                : 'Generate Conventional ER Diagram (Chen or Relational Notation)'
                        }
                    >
                        <Sparkles className={`w-3.5 h-3.5 ${isGeneratingDiagram ? 'animate-spin' : ''}`} />
                        <span>
                            {isGeneratingDiagram
                                ? 'Generating...'
                                : language === 'python'
                                ? 'Generate Flowchart'
                                : 'Generate ER Diagram'}
                        </span>
                    </button>

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
                                {language === 'python' ? 'main.py' : 'query.sql'}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[11px] text-slate-400">
                                {language === 'python' ? 'Python 3.13 Runtime' : 'SQLite3 In-Memory DB'}
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

                            {/* Theme toggle */}
                            <button
                                onClick={() => setEditorTheme(editorTheme === 'vs-dark' ? 'vs' : 'vs-dark')}
                                className="px-2 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white text-[11px]"
                                title="Toggle Editor Theme"
                            >
                                {editorTheme === 'vs-dark' ? 'Dark' : 'Light'}
                            </button>
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

                    {/* Optional Standard Input (Stdin) Drawer */}
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

                {/* RIGHT PANEL: Output, Data Tables & Conventional Diagrams */}
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
                                <span>Output Console</span>
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

                            {/* Diagram Tab */}
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
                                    {language === 'python' ? 'Flowchart (Conventional)' : 'ER Diagram (Shapes)'}
                                </span>
                                {diagramCode && (
                                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                                )}
                            </button>
                        </div>

                        {/* Sub-controls when in Diagram View */}
                        {activeTab === 'diagram' && language === 'sql' && (
                            <div className="flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700 text-[11px]">
                                <button
                                    onClick={() => {
                                        setDiagramNotation('conventional');
                                        handleGenerateDiagram('conventional');
                                    }}
                                    className={`px-2 py-0.5 rounded font-medium transition ${
                                        diagramNotation === 'conventional'
                                            ? 'bg-purple-600 text-white font-semibold'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                    title="Peter Chen Conventional Notation (Rectangles, Diamonds, Ovals)"
                                >
                                    Chen Notation
                                </button>
                                <button
                                    onClick={() => {
                                        setDiagramNotation('relational');
                                        handleGenerateDiagram('relational');
                                    }}
                                    className={`px-2 py-0.5 rounded font-medium transition ${
                                        diagramNotation === 'relational'
                                            ? 'bg-purple-600 text-white font-semibold'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                    title="Relational Table ERD (Crow's Foot Notation)"
                                >
                                    Relational ERD
                                </button>
                            </div>
                        )}
                    </div>

                    {/* TAB CONTENT 1: Output Console */}
                    {activeTab === 'output' && (
                        <div className="flex-1 flex flex-col p-4 overflow-y-auto font-mono text-xs text-slate-200">
                            {output ? (
                                <div className="space-y-4">
                                    {/* Execution metadata bar */}
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`inline-flex items-center gap-1 font-semibold ${
                                                    output.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'
                                                }`}
                                            >
                                                {output.exitCode === 0 ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                ) : (
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                )}
                                                {output.exitCode === 0 ? 'Process Exited (0)' : `Exited with Error (${output.exitCode})`}
                                            </span>
                                            <span>•</span>
                                            <span>Duration: {output.durationMs || 0}ms</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                            Runner: {output.runner || 'native'}
                                        </span>
                                    </div>

                                    {/* Standard Output (stdout) */}
                                    {output.stdout ? (
                                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 whitespace-pre-wrap leading-relaxed select-text">
                                            {output.stdout}
                                        </div>
                                    ) : !output.stderr ? (
                                        <p className="text-slate-400 italic">Program executed successfully with no output.</p>
                                    ) : null}

                                    {/* Standard Error (stderr) */}
                                    {output.stderr && (
                                        <div className="bg-rose-950/40 p-3 rounded-lg border border-rose-800/60 text-rose-300 whitespace-pre-wrap leading-relaxed select-text">
                                            <div className="flex items-center gap-1.5 font-bold text-rose-400 mb-1">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>Runtime / Syntax Error:</span>
                                            </div>
                                            {output.stderr}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                                    <Terminal className="w-10 h-10 mb-3 text-slate-400 stroke-1" />
                                    <p className="text-sm font-semibold text-slate-300">No output yet</p>
                                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                        Click <span className="text-emerald-400 font-semibold">Run Code</span> or press{' '}
                                        <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 text-[10px]">
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
                                                        {row[col] !== null && row[col] !== undefined
                                                            ? String(row[col])
                                                            : <span className="text-slate-400 italic">NULL</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT 3: Conventional Diagram View */}
                    {activeTab === 'diagram' && (
                        <div className="flex-1 flex flex-col p-3 overflow-hidden">
                            {/* Shape Legend Header */}
                            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 mb-3 flex-shrink-0">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <Shapes className="w-3.5 h-3.5 text-purple-400" />
                                            {language === 'python' ? 'Flowchart Shape Standards:' : 'ER Diagram Standards:'}
                                        </span>
                                    </div>

                                    {/* Conventional Shape Pills */}
                                    {language === 'python' ? (
                                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-medium">
                                                🟢 Oval (Start / End)
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/50 text-blue-300 font-medium">
                                                🔵 Parallelogram (I/O)
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-200 font-medium">
                                                ⬜ Rectangle (Process)
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 font-medium">
                                                🟡 Diamond (Decision)
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-300 font-medium">
                                                🟣 Hexagon (Loop)
                                            </span>
                                        </div>
                                    ) : diagramNotation === 'conventional' ? (
                                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                            <span className="px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/50 text-indigo-300 font-medium">
                                                🟦 Rectangle (Entity)
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-medium">
                                                🟢 Underlined Oval (PK)
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-200 font-medium">
                                                ⚪ Oval (Attribute)
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 font-medium">
                                                🟧 Diamond (Relationship)
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-300 font-medium">
                                                1:N Cardinality
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                            <span className="px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-300 font-medium">
                                                Crow&apos;s Foot Notation
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-300 font-medium">
                                                Tables, Data Types, PK & FK
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Diagram Viewer Area */}
                            {diagramCode ? (
                                <div className="flex-1 overflow-auto bg-slate-950 rounded-xl border border-slate-800 p-4 shadow-inner flex flex-col items-center justify-center">
                                    <div className="w-full max-w-full overflow-auto">
                                        <MermaidRenderer chart={diagramCode} />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-950/40 rounded-xl border border-slate-800/80 text-slate-400">
                                    <Shapes className="w-12 h-12 mb-3 text-purple-400/60 stroke-1 animate-pulse" />
                                    <h4 className="text-sm font-bold text-slate-200">
                                        {language === 'python' ? 'Generate Python Flowchart' : 'Generate SQL ER Diagram'}
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                                        {language === 'python'
                                            ? 'Click the button below to turn your Python code into a standardized flowchart using textbook conventional shapes (Ovals, Parallelograms, Rectangles, and Diamonds).'
                                            : 'Click the button below to automatically extract entities, attributes, primary keys, and relationships from your SQL DDL statements into a visual ER diagram.'}
                                    </p>
                                    <button
                                        onClick={() => handleGenerateDiagram()}
                                        disabled={isGeneratingDiagram}
                                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-purple-500/20 transition cursor-pointer"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        <span>
                                            {isGeneratingDiagram
                                                ? 'Synthesizing Shapes...'
                                                : language === 'python'
                                                ? 'Generate Conventional Flowchart'
                                                : 'Generate Conventional ER Diagram'}
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
