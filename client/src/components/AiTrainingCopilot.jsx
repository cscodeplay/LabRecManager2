'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Sparkles, BookOpen, Code2, CheckSquare, FileText,
    Layers, Image as ImageIcon, Send, Copy, Check, Plus,
    RefreshCw, AlertCircle, Award, Lightbulb, Zap, ArrowRight, X, Eye,
    UploadCloud, FileUp, Database, CheckCircle2, Bookmark
} from 'lucide-react';
import { trainingAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const PRESETS = {
    outline: [
        'Python 3 Fundamentals for CBSE/PSEB Class 11',
        'Object-Oriented Programming & Design Patterns in Python',
        'Data Structures & Algorithms: Stacks, Queues & Trees',
        'Full-Stack Web Development with HTML5, CSS & JavaScript'
    ],
    theory: [
        'Python Lists vs Tuples & Memory Allocation (with SVG Diagram)',
        'Recursion Call Stack & Base Case Anatomy',
        'SQL Inner Join vs Left Join with Venn Diagrams',
        'Time Complexity & Big-O Notation visual walkthrough'
    ],
    exercise_coding: [
        'Write a function to detect Palindromic substrings with edge cases',
        'Implement Fibonacci Generator using Memoization in Python',
        'Matrix Rotation 90 degrees in-place',
        'Validate Balanced Parentheses with Stack'
    ],
    exercise_mcq: [
        'Predict output of Python shallow copy vs deep copy slice',
        'Python variable scope with global keyword in nested function',
        'Default mutable arguments trap in Python functions',
        'JavaScript event loop microtask vs macrotask execution order'
    ],
    exercise_cloze: [
        'Python Dictionary Comprehension for filtering items',
        'File I/O context manager with try-except block',
        'Custom class implementation with __init__ and __repr__',
        'SQL SELECT with GROUP BY and HAVING clauses'
    ],
    exercise_case_study: [
        'High memory consumption in background Celery worker processing image batch',
        'Database connection pool exhaustion during flash sale traffic surge',
        'Thread safety race condition in singleton cache manager'
    ]
};

export default function AiTrainingCopilot({
    isOpen,
    onClose,
    activeTab = 'outline', // 'outline' | 'theory' | 'exercise' | 'rag'
    onInsertOutline,
    onInsertTheory,
    onInsertExercise,
    context = {} // { language, classLevel, board, unitTitle, topic, exerciseType, difficulty, scaffoldLevel, bloomsLevel }
}) {
    const [tab, setTab] = useState(activeTab);
    const [subExerciseType, setSubExerciseType] = useState('coding'); // 'coding' | 'bug_fix' | 'mcq' | 'fill_blank' | 'case_study'
    const [prompt, setPrompt] = useState('');
    const [language, setLanguage] = useState('python');
    const [classLevel, setClassLevel] = useState(11);
    const [board, setBoard] = useState('PSEB');
    const [difficulty, setDifficulty] = useState('beginner');
    const [scaffoldLevel, setScaffoldLevel] = useState('guided');
    const [bloomsLevel, setBloomsLevel] = useState('apply');
    const [totalUnits, setTotalUnits] = useState(3);
    const [provider, setProvider] = useState('groq'); // 'groq' | 'gemini'
    
    // RAG Document & Vision State
    const [documentText, setDocumentText] = useState('');
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [imageBase64, setImageBase64] = useState(null);
    const [imageMimeType, setImageMimeType] = useState('image/jpeg');
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [copied, setCopied] = useState(false);

    // Synchronize inputs from context props whenever modal opens or context changes
    useEffect(() => {
        if (!isOpen) return;
        if (activeTab) setTab(activeTab);
        if (context.language) setLanguage(context.language);
        if (context.classLevel) setClassLevel(context.classLevel);
        if (context.board) setBoard(context.board);
        if (context.exerciseType) setSubExerciseType(context.exerciseType);
        if (context.difficulty) setDifficulty(context.difficulty);
        if (context.scaffoldLevel) setScaffoldLevel(context.scaffoldLevel);
        if (context.bloomsLevel) setBloomsLevel(context.bloomsLevel);
        
        // Prioritize unitTitle for exercise / theory tabs if topic is not custom
        const targetTopic = context.unitTitle || context.topic || '';
        if (targetTopic && (!prompt || prompt === PRESETS.outline[0])) {
            setPrompt(targetTopic);
        }
    }, [isOpen, activeTab, context]);

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadedFileName(file.name);

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                setImageBase64(base64);
                setImageMimeType(file.type);
                toast.success(`📸 Image "${file.name}" loaded for Vision RAG Grounding`);
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf') || file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
            const reader = new FileReader();
            reader.onload = () => {
                const text = reader.result;
                if (typeof text === 'string') {
                    setDocumentText(text);
                    toast.success(`📄 "${file.name}" text loaded (${text.length} chars) for RAG Grounding`);
                } else {
                    const base64 = reader.result.split(',')[1];
                    setImageBase64(base64);
                    setImageMimeType(file.type || 'application/pdf');
                    toast.success(`📄 Document "${file.name}" loaded for RAG Grounding`);
                }
            };
            if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
                reader.readAsText(file);
            } else {
                reader.readAsDataURL(file);
            }
        } else {
            toast.error('Supported formats: PDF, Images (PNG/JPG), TXT, Markdown');
        }
    };

    const handleClearDocument = () => {
        setUploadedFileName('');
        setDocumentText('');
        setImageBase64(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast.success('Document detached');
    };

    const handleGenerate = async () => {
        const effectiveTopic = prompt.trim() || context.unitTitle || context.topic || (tab === 'outline' ? 'Computer Science Foundations' : 'Core Unit Concepts');

        if (tab === 'rag' && !documentText.trim() && !imageBase64) {
            toast.error('Please upload an ebook/PDF/image or paste document text');
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            let action = 'generate_outline';
            let payload = {
                topic: effectiveTopic,
                unitTitle: context.unitTitle || '',
                unitDescription: context.unitDescription || '',
                moduleTitle: context.moduleTitle || '',
                documentText: documentText.trim(),
                imageBase64,
                mimeType: imageMimeType,
                language,
                classLevel,
                board,
                totalUnits
            };

            if (tab === 'outline') {
                action = 'generate_outline';
            } else if (tab === 'theory') {
                action = 'generate_theory';
            } else if (tab === 'exercise') {
                action = 'generate_exercise';
                payload = {
                    ...payload,
                    exerciseType: subExerciseType,
                    difficulty,
                    scaffoldLevel,
                    bloomsLevel,
                    customPrompt: prompt.trim()
                };
            } else if (tab === 'rag') {
                action = 'generate_from_document';
                payload = {
                    ...payload,
                    customPrompt: prompt.trim()
                };
            }

            const res = await trainingAPI.aiAssist({
                action,
                payload,
                provider
            });

            if (res.data?.success && res.data?.data) {
                setResult(res.data.data);
                toast.success('✨ AI Content Generated Successfully!');
            } else {
                toast.error('AI did not return content. Please retry.');
            }
        } catch (err) {
            console.error('AI generation error:', err);
            toast.error(err.response?.data?.message || 'AI generation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!result) return;
        navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Copied JSON to clipboard');
    };

    const handleApply = () => {
        if (!result) return;

        if ((tab === 'outline' || tab === 'rag') && onInsertOutline) {
            onInsertOutline(result);
            toast.success('Applied Course Blueprint & Units to Wizard!');
            onClose();
        } else if (tab === 'theory' && onInsertTheory) {
            onInsertTheory(result);
            toast.success('Applied Theory & Graphics to Form!');
            onClose();
        } else if (tab === 'exercise' && onInsertExercise) {
            onInsertExercise(result);
            toast.success('Inserted Exercise into Form / Module!');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-white dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                AI LMS Pedagogy Copilot & RAG Synthesizer
                                <span className="text-[10px] uppercase font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                                    {provider === 'groq' ? '⚡ Groq Llama 3.3 70B' : '✨ Gemini 1.5/2.0'}
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Auto-syncs with wizard step fields • Multi-modal RAG grounding from Ebooks/PDFs • All 5 question types
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <select 
                            value={provider} 
                            onChange={e => setProvider(e.target.value)}
                            className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700 outline-none"
                        >
                            <option value="groq">⚡ Groq (Ultra-Fast)</option>
                            <option value="gemini">✨ Gemini (Multimodal)</option>
                        </select>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 transition">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50 dark:bg-slate-900/50 gap-2 overflow-x-auto">
                    <button
                        onClick={() => { setTab('outline'); setResult(null); }}
                        className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                            tab === 'outline'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-xl'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <Layers className="w-4 h-4" /> 1. Course Blueprint
                    </button>
                    <button
                        onClick={() => { setTab('theory'); setResult(null); }}
                        className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                            tab === 'theory'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-xl'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <BookOpen className="w-4 h-4" /> 2. Lesson Theory & Graphics
                    </button>
                    <button
                        onClick={() => { setTab('exercise'); setResult(null); }}
                        className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                            tab === 'exercise'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-xl'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <Code2 className="w-4 h-4" /> 3. Exercise & Question Arena
                    </button>
                    <button
                        onClick={() => { setTab('rag'); setResult(null); }}
                        className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                            tab === 'rag'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-xl'
                                : 'border-transparent text-purple-600 hover:text-purple-700 dark:text-purple-400'
                        }`}
                    >
                        <Database className="w-4 h-4" /> 📚 4. Ebook / PDF RAG Synthesizer
                    </button>
                </div>

                {/* Main 2-Column Work Area */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
                    
                    {/* Left Panel: Inputs & Configuration */}
                    <div className="md:col-span-5 p-6 overflow-y-auto border-r border-slate-200 dark:border-slate-800 space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
                        
                        {/* Global Document Grounding Bar */}
                        <div className="rounded-2xl p-3.5 border transition-all bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Database className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                    Source Reference (RAG)
                                </span>
                                {uploadedFileName || documentText || imageBase64 ? (
                                    <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                                        <CheckCircle2 className="w-3 h-3" /> Grounding Active
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-slate-400">Optional</span>
                                )}
                            </div>

                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload} 
                                accept=".pdf,.png,.jpg,.jpeg,.txt,.md" 
                                className="hidden" 
                            />

                            {uploadedFileName || documentText || imageBase64 ? (
                                <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 text-xs">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileUp className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                        <div className="truncate">
                                            <div className="font-bold text-slate-900 dark:text-white truncate">
                                                {uploadedFileName || 'Pasted Resource Text'}
                                            </div>
                                            <div className="text-[10px] text-purple-700 dark:text-purple-300">
                                                {documentText ? `${documentText.length} characters loaded` : 'Vision / OCR processed'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-[10px] px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 font-bold"
                                        >
                                            Change
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleClearDocument}
                                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                            title="Detach Document"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2.5 border border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-center cursor-pointer transition flex items-center justify-center gap-2"
                                >
                                    <UploadCloud className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                        Upload PDF / Ebook / Image to ground all lessons & labs
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Unit Context Lock Indicator */}
                        {context.unitTitle && (
                            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-between">
                                <div className="overflow-hidden">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                        <Bookmark className="w-3 h-3" /> Target Unit Context
                                    </div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
                                        {context.unitTitle}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPrompt(context.unitTitle)}
                                    className="text-[10px] bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2 py-1 font-bold shrink-0 ml-2 hover:bg-indigo-50"
                                >
                                    Use As Prompt
                                </button>
                            </div>
                        )}

                        {/* Tab 4: RAG Resource Paste Area (If Tab === 'rag') */}
                        {tab === 'rag' && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                                    Resource Text / Chapter Notes
                                </label>
                                <textarea
                                    value={documentText}
                                    onChange={e => setDocumentText(e.target.value)}
                                    placeholder="Paste chapter excerpts, lab manual experiments, syllabus topics, or code examples here..."
                                    className="w-full h-24 p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono focus:ring-2 focus:ring-purple-500/20 outline-none"
                                />
                            </div>
                        )}

                        {/* Tab 3 Exercise Sub-Type selector */}
                        {tab === 'exercise' && (
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 block">
                                    Question / Lab Type
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'coding', label: '⚡ Coding Lab', desc: 'Code + Tests' },
                                        { id: 'mcq', label: '📝 Code Output MCQ', desc: 'Predict Output' },
                                        { id: 'fill_blank', label: '🧩 Syntax Cloze', desc: 'Fill blanks' },
                                        { id: 'bug_fix', label: '🐞 PR Bug Hunt', desc: 'Fix bugs' },
                                        { id: 'case_study', label: '🏢 MNC Case Study', desc: 'Incident triage' },
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setSubExerciseType(t.id)}
                                            className={`p-2.5 rounded-xl border text-left transition-all ${
                                                subExerciseType === t.id
                                                    ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="text-xs font-bold">{t.label}</div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400">{t.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Prompt Input */}
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                                <span>{tab === 'rag' ? 'Additional Instructions (Optional)' : 'Topic / Problem Focus'}</span>
                                <span className="text-[10px] font-normal text-slate-400">
                                    {context.unitTitle ? 'Defaults to active unit' : 'Auto-filled from wizard'}
                                </span>
                            </label>
                            <textarea
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                placeholder={
                                    context.unitTitle
                                        ? `e.g. Specific challenge for ${context.unitTitle}...`
                                        : tab === 'outline'
                                        ? "e.g. Python Object-Oriented Programming for Class 11..."
                                        : tab === 'theory'
                                        ? "e.g. How Recursion Call Stack works with visual SVG diagram..."
                                        : tab === 'rag'
                                        ? "e.g. Emphasize binary trees and include 3 coding challenges with test cases..."
                                        : "e.g. Function to find two numbers that sum up to target with test cases..."
                                }
                                className="w-full h-20 p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                            />
                        </div>

                        {/* Quick Presets Pills */}
                        {tab !== 'rag' && (
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                                    Quick Example Prompts:
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {(
                                        tab === 'outline' ? PRESETS.outline :
                                        tab === 'theory' ? PRESETS.theory :
                                        subExerciseType === 'mcq' ? PRESETS.exercise_mcq :
                                        subExerciseType === 'fill_blank' ? PRESETS.exercise_cloze :
                                        subExerciseType === 'case_study' ? PRESETS.exercise_case_study :
                                        PRESETS.exercise_coding
                                    ).map((p, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setPrompt(p)}
                                            className="text-[11px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-left transition"
                                        >
                                            + {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Config Controls */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500">Language</label>
                                <select 
                                    value={language} 
                                    onChange={e => setLanguage(e.target.value)}
                                    className="input w-full text-xs py-1.5 mt-1"
                                >
                                    <option value="python">Python</option>
                                    <option value="html">HTML5 / CSS</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="sql">SQL</option>
                                    <option value="cpp">C++</option>
                                    <option value="java">Java</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500">Class Level</label>
                                <input 
                                    type="number" 
                                    value={classLevel} 
                                    onChange={e => setClassLevel(parseInt(e.target.value) || 11)}
                                    className="input w-full text-xs py-1.5 mt-1" 
                                />
                            </div>
                        </div>

                        {(tab === 'outline' || tab === 'rag') && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Board</label>
                                    <input 
                                        type="text" 
                                        value={board} 
                                        onChange={e => setBoard(e.target.value)} 
                                        className="input w-full text-xs py-1.5 mt-1" 
                                        placeholder="PSEB / CBSE" 
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Units Count</label>
                                    <input 
                                        type="number" 
                                        value={totalUnits} 
                                        onChange={e => setTotalUnits(parseInt(e.target.value) || 3)} 
                                        className="input w-full text-xs py-1.5 mt-1" 
                                    />
                                </div>
                            </div>
                        )}

                        {tab === 'exercise' && (
                            <div className="space-y-2.5">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Target Question Type</label>
                                    <select
                                        value={subExerciseType}
                                        onChange={e => setSubExerciseType(e.target.value)}
                                        className="input w-full text-xs py-1.5 mt-1 font-semibold text-indigo-600 dark:text-indigo-400"
                                    >
                                        <option value="coding">⚡ Coding Lab</option>
                                        <option value="bug_fix">🐞 PR Bug Hunt</option>
                                        <option value="mcq">📝 Output MCQ</option>
                                        <option value="fill_blank">🧩 Syntax Cloze</option>
                                        <option value="case_study">🏢 MNC Case Study</option>
                                        <option value="assertion_reason">⚖️ CBSE Assertion-Reasoning</option>
                                        <option value="code_trace">🔍 CBSE Dry-Run Trace Table</option>
                                        <option value="code_debug">🐞 CBSE Error Spotting & Debug</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500">Difficulty</label>
                                        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="input w-full text-xs py-1.5 mt-1">
                                            <option value="beginner">Beginner</option>
                                            <option value="intermediate">Intermediate</option>
                                            <option value="advanced">Advanced</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500">Scaffold</label>
                                        <select value={scaffoldLevel} onChange={e => setScaffoldLevel(e.target.value)} className="input w-full text-xs py-1.5 mt-1">
                                            <option value="guided">Guided</option>
                                            <option value="semi_guided">Semi-Guided</option>
                                            <option value="independent">Independent</option>
                                            <option value="project">Project</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-500">Bloom's</label>
                                        <select value={bloomsLevel} onChange={e => setBloomsLevel(e.target.value)} className="input w-full text-xs py-1.5 mt-1">
                                            <option value="remember">Remember</option>
                                            <option value="understand">Understand</option>
                                            <option value="apply">Apply</option>
                                            <option value="analyze">Analyze</option>
                                            <option value="evaluate">Evaluate</option>
                                            <option value="create">Create</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Generate Trigger */}
                        <div className="pt-3">
                            <button
                                onClick={handleGenerate}
                                disabled={loading || (tab === 'rag' ? (!documentText.trim() && !imageBase64) : !prompt.trim())}
                                className="w-full btn bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>{tab === 'rag' ? 'Extracting & Grounding with RAG...' : 'Synthesizing Content...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        <span>{tab === 'rag' ? 'Synthesize Grounded Module' : 'Generate with AI'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Panel: Output & Live Preview */}
                    <div className="md:col-span-7 p-6 overflow-y-auto flex flex-col justify-between bg-white dark:bg-slate-900">
                        {result ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                                    <div>
                                        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                                            {result.title || 'Generated Content'}
                                        </h3>
                                        {result.titleHindi && (
                                            <p className="text-xs text-slate-500 font-medium">{result.titleHindi}</p>
                                        )}
                                        {result.extractedSummary && (
                                            <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                                                📚 {result.extractedSummary}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleCopy}
                                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copied ? 'Copied' : 'Copy JSON'}
                                        </button>
                                    </div>
                                </div>

                                {/* Preview based on Tab */}
                                {(tab === 'outline' || tab === 'rag') && (
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                            {result.description}
                                        </p>

                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                Curriculum Units Breakdown ({result.units?.length || 0} Units)
                                            </h4>
                                            {result.units?.map((u, i) => (
                                                <div key={i} className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 flex items-start gap-3">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                                        {u.unitNumber || i + 1}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <h5 className="font-bold text-sm text-slate-900 dark:text-white truncate">{u.title}</h5>
                                                            <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded font-semibold">
                                                                ≥ {u.unlockThreshold || 80}% gate
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{u.description}</p>
                                                        {u.keyConcepts && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {u.keyConcepts.map((c, ci) => (
                                                                    <span key={ci} className="text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                                                        {c}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {u.exercises && u.exercises.length > 0 && (
                                                            <div className="mt-2 text-[10px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                                                                <CheckCircle2 className="w-3 h-3" /> Includes {u.exercises.length} grounded exercises
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {tab === 'theory' && (
                                    <div className="space-y-4">
                                        {/* SVG Graphic Preview */}
                                        {result.svgGraphic && (
                                            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-950 p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                                        <ImageIcon className="w-3.5 h-3.5 text-indigo-400" /> Educational Concept Illustration (SVG)
                                                    </span>
                                                </div>
                                                <div 
                                                    className="w-full flex items-center justify-center max-h-60 overflow-hidden"
                                                    dangerouslySetInnerHTML={{ __html: result.svgGraphic }}
                                                />
                                            </div>
                                        )}

                                        {/* Markdown Theory preview */}
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto">
                                            <pre className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                                                {result.theoryMarkdown}
                                            </pre>
                                        </div>

                                        {result.keyTakeaways && (
                                            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl space-y-1">
                                                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Key Takeaways:</span>
                                                <ul className="list-disc pl-4 text-xs text-emerald-700 dark:text-emerald-400 space-y-0.5">
                                                    {result.keyTakeaways.map((k, ki) => <li key={ki}>{k}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {tab === 'exercise' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 capitalize">
                                                {result.exerciseType}
                                            </span>
                                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 capitalize">
                                                {result.difficulty}
                                            </span>
                                            <span className="text-xs font-bold text-amber-500 ml-auto flex items-center gap-1">
                                                <Award className="w-3.5 h-3.5" /> +{result.xpReward || 10} XP
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                            {result.description}
                                        </p>

                                        {/* Coding / Bug Fix */}
                                        {(result.exerciseType === 'coding' || result.exerciseType === 'bug_fix') && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Starter Code</span>
                                                    <pre className="bg-slate-950 text-emerald-400 text-xs p-3 rounded-xl mt-1 overflow-x-auto max-h-36 font-mono">
                                                        {result.starterCode}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Solution Code</span>
                                                    <pre className="bg-slate-950 text-blue-400 text-xs p-3 rounded-xl mt-1 overflow-x-auto max-h-36 font-mono">
                                                        {result.solutionCode}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}

                                        {/* Syntax Cloze / Fill in the Blanks */}
                                        {result.exerciseType === 'fill_blank' && (
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                                                        🧩 Cloze Code Template (with Blank Placeholders)
                                                    </span>
                                                    <pre className="bg-slate-950 text-amber-300 text-xs p-3 rounded-xl overflow-x-auto max-h-32 font-mono">
                                                        {result.testCases?.template || result.starterCode}
                                                    </pre>
                                                </div>

                                                {/* Blanks key */}
                                                {result.testCases?.blanks && (
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Answer Key & Hints:</span>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {result.testCases.blanks.map((b, bi) => (
                                                                <div key={bi} className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                                                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{b.id}</span>
                                                                    <span className="font-mono bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">{b.correctAnswer}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Full Solution Code */}
                                                {result.solutionCode && (
                                                    <div>
                                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                                                            ✅ Complete Solution (Working Executable Code)
                                                        </span>
                                                        <pre className="bg-slate-950 text-emerald-400 text-xs p-3 rounded-xl overflow-x-auto max-h-32 font-mono">
                                                            {result.solutionCode}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* MCQ */}
                                        {result.exerciseType === 'mcq' && (
                                            <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-2 text-xs">
                                                <span className="font-bold text-amber-400">MCQ Code Snippet:</span>
                                                <pre className="bg-black/50 p-2 rounded text-emerald-300 font-mono text-[11px]">
                                                    {result.testCases?.codeSnippet}
                                                </pre>
                                                <div className="space-y-1">
                                                    {result.testCases?.options?.map((opt, oi) => (
                                                        <div key={oi} className={`p-1.5 rounded text-xs flex items-center gap-2 ${
                                                            oi === result.testCases?.correctOption ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-200' : 'bg-slate-800 text-slate-300'
                                                        }`}>
                                                            <span className="w-4 h-4 rounded-full bg-slate-700 text-center font-bold text-[10px]">{String.fromCharCode(65 + oi)}</span>
                                                            <span>{opt}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Case Study */}
                                        {result.exerciseType === 'case_study' && (
                                            <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-2 text-xs">
                                                <span className="font-bold text-purple-400">Incident Code:</span>
                                                <pre className="bg-black/50 p-2 rounded text-purple-300 font-mono text-[11px]">
                                                    {result.testCases?.scenarioCode}
                                                </pre>
                                            </div>
                                        )}

                                        {/* Assertion Reason Preview */}
                                        {result.exerciseType === 'assertion_reason' && (
                                            <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/20 text-indigo-100 rounded-xl space-y-2 text-xs">
                                                <div className="space-y-1">
                                                    <span className="font-bold text-indigo-400">Assertion (A):</span>
                                                    <p className="text-slate-200">{result.testCases?.assertion}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="font-bold text-purple-400">Reason (R):</span>
                                                    <p className="text-slate-200">{result.testCases?.reason}</p>
                                                </div>
                                                <div className="text-[11px] text-emerald-400 font-semibold pt-1">
                                                    Correct Option: Option {String.fromCharCode(65 + (result.testCases?.correctOption || 0))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Dry Run Trace Preview */}
                                        {result.exerciseType === 'code_trace' && (
                                            <div className="p-3.5 bg-teal-950/40 border border-teal-500/20 text-teal-100 rounded-xl space-y-2 text-xs">
                                                <span className="font-bold text-teal-400">Trace Code:</span>
                                                <pre className="bg-black/50 p-2 rounded text-teal-300 font-mono text-[11px] overflow-x-auto">
                                                    {result.testCases?.codeSnippet}
                                                </pre>
                                                <span className="font-bold text-teal-400 block pt-1">Table Columns:</span>
                                                <div className="flex gap-2">
                                                    {(result.testCases?.tableHeaders || []).map((h, i) => (
                                                        <span key={i} className="px-2 py-0.5 rounded bg-teal-900/50 text-[10px] font-mono">{h}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Code Debug Preview */}
                                        {result.exerciseType === 'code_debug' && (
                                            <div className="p-3.5 bg-rose-950/40 border border-rose-500/20 text-rose-100 rounded-xl space-y-2 text-xs">
                                                <span className="font-bold text-rose-400">Buggy Target Code:</span>
                                                <pre className="bg-black/50 p-2 rounded text-rose-300 font-mono text-[11px] overflow-x-auto">
                                                    {result.starterCode || result.testCases?.buggyCode}
                                                </pre>
                                                <span className="font-bold text-rose-400 block pt-1">Clean Solution:</span>
                                                <pre className="bg-black/50 p-2 rounded text-emerald-300 font-mono text-[11px] overflow-x-auto">
                                                    {result.solutionCode}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center py-16 text-slate-400">
                                <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mb-3">
                                    <Sparkles className="w-8 h-8 text-indigo-500" />
                                </div>
                                <h4 className="font-bold text-slate-700 dark:text-slate-200">
                                    {tab === 'rag' ? 'Upload Ebook / PDF to Extract Course' : 'AI Assistant Ready'}
                                </h4>
                                <p className="text-xs text-slate-500 max-w-sm mt-1">
                                    {tab === 'rag'
                                        ? 'Upload a chapter PDF, textbook photo, or paste syllabus notes to synthesize a complete course module with units and labs.'
                                        : 'Select your topic and click Generate with AI.'}
                                </p>
                            </div>
                        )}

                        {/* Bottom Actions */}
                        {result && (
                            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                                <button onClick={onClose} className="btn btn-secondary text-xs">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApply}
                                    className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-5 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>
                                        {tab === 'outline' || tab === 'rag' ? 'Apply Full Blueprint & Units to Wizard' : tab === 'theory' ? 'Insert Theory & Graphics' : 'Insert Exercise into Module'}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
