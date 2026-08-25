'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bot, Send, Upload, Database, ChevronDown, ChevronRight, Trash2,
    Sparkles, FileText, AlertTriangle, Copy, Check, RefreshCw, X, Download, Loader2,
    GraduationCap, Clock, CheckCircle2, Edit3, XCircle, Undo2, ExternalLink
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api, { classesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { formatTime } from '@/lib/dateUtils';

// Markdown-like renderer for AI messages
function RenderMessage({ content }) {
    if (!content) return null;

    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
            {parts.map((part, i) => {
                if (part.startsWith('```')) {
                    const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
                    if (match) {
                        const lang = match[1] || '';
                        const code = match[2].trim();
                        return <CodeBlock key={i} code={code} language={lang} />;
                    }
                }
                // Convert basic markdown
                const html = part
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono text-pink-600 dark:text-pink-400">$1</code>')
                    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
                    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
                    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
                    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
                    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
                    .replace(/\n{2,}/g, '</p><p class="mb-2">')
                    .replace(/\n/g, '<br/>');

                return <div key={i} dangerouslySetInnerHTML={{ __html: `<p class="mb-2">${html}</p>` }} />;
            })}
        </div>
    );
}

function CodeBlock({ code, language }) {
    const [copied, setCopied] = useState(false);
    const isSql = language.toLowerCase() === 'sql';

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-xs">
                <span className="text-slate-400 font-mono uppercase">{language || 'code'}</span>
                <button onClick={handleCopy} className="flex items-center gap-1 text-slate-400 hover:text-white transition">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm text-slate-100 font-mono leading-relaxed">
                <code>{code}</code>
            </pre>
        </div>
    );
}

// Collapsible SQL result table
function SQLResultPanel({ sql, result, onRerun }) {
    const [isOpen, setIsOpen] = useState(true);
    const [sqlOpen, setSqlOpen] = useState(false);

    if (!result) return null;

    return (
        <div className="mt-3 rounded-xl border border-indigo-200 dark:border-indigo-800 overflow-hidden bg-white dark:bg-slate-900">
            {/* SQL Query — collapsible */}
            {sql && (
                <button
                    onClick={() => setSqlOpen(!sqlOpen)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition text-left"
                >
                    {sqlOpen ? <ChevronDown className="w-3.5 h-3.5 text-indigo-500" /> : <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />}
                    <Database className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-medium text-indigo-700 dark:text-indigo-300">SQL Query</span>
                    <span className="text-indigo-400 ml-auto font-mono truncate max-w-[300px]">{sql.substring(0, 60)}...</span>
                </button>
            )}
            {sqlOpen && sql && (
                <div className="px-4 py-3 bg-slate-900 border-b border-indigo-200 dark:border-indigo-800">
                    <pre className="text-xs text-indigo-200 font-mono whitespace-pre-wrap">{sql}</pre>
                    <div className="flex gap-2 mt-2">
                        <button title="Copy" onClick={() => { navigator.clipboard.writeText(sql); toast.success('SQL copied'); }}
                            className="text-xs text-indigo-400 hover:text-white flex items-center gap-1">
                            <Copy className="w-4 h-4" />
                        </button>
                        {onRerun && (
                            <button onClick={onRerun} className="text-xs text-emerald-400 hover:text-white flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" /> Re-run
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Results */}
            {!result.success ? (
                <div className="px-4 py-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm">
                    <AlertTriangle className="w-4 h-4 inline mr-1" /> {result.error}
                </div>
            ) : (
                <>
                    <button onClick={() => setIsOpen(!isOpen)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <span className="text-slate-600 dark:text-slate-400">
                            {result.rowCount ?? result.rows?.length ?? 0} row(s) returned — {result.command || 'SELECT'}
                        </span>
                    </button>
                    {isOpen && result.rows && result.rows.length > 0 && (
                        <div className="overflow-x-auto max-h-80">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                                    <tr>
                                        {(result.fields?.map(f => f.name) || Object.keys(result.rows[0])).map((col, i) => (
                                            <th key={i} className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.rows.slice(0, 50).map((row, ri) => (
                                        <tr key={ri} className={ri % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/30'}>
                                            {(result.fields?.map(f => f.name) || Object.keys(row)).map((col, ci) => (
                                                <td key={ci} className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 font-mono whitespace-nowrap max-w-[300px] truncate">
                                                    {row[col] === null ? <span className="text-slate-400 italic">NULL</span>
                                                        : typeof row[col] === 'object' ? JSON.stringify(row[col])
                                                            : String(row[col])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {result.rows.length > 50 && (
                                <p className="text-xs text-slate-500 text-center py-2">Showing first 50 of {result.rows.length} rows</p>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/* ─── Class Creation Action Card ─── */
function ClassActionCard({ action }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(action?.isConfirmed || false);
    const [isCancelled, setIsCancelled] = useState(action?.isCancelled || false);
    const [createdClass, setCreatedClass] = useState(null);

    // Form state
    const [name, setName] = useState(action?.name || 'Class 11 Non-Medical A');
    const [nameHindi, setNameHindi] = useState(action?.nameHindi || '');
    const [gradeLevel, setGradeLevel] = useState(action?.gradeLevel || 11);
    const [section, setSection] = useState(action?.section || 'A');
    const [stream, setStream] = useState(action?.stream || 'Non-Medical');
    const [maxStudents, setMaxStudents] = useState(action?.maxStudents || 60);
    const [academicYearId, setAcademicYearId] = useState(action?.academicYearId || '');

    useEffect(() => {
        if (action) {
            setName(action.name || '');
            setNameHindi(action.nameHindi || '');
            setGradeLevel(action.gradeLevel || 11);
            setSection(action.section || 'A');
            setStream(action.stream || 'Non-Medical');
            setMaxStudents(action.maxStudents || 60);
            setAcademicYearId(action.academicYearId || '');
            setIsConfirmed(action.isConfirmed || false);
            setIsCancelled(action.isCancelled || false);
        }
    }, [action]);

    const handleConfirm = async () => {
        if (!name.trim()) {
            toast.error('Class name is required');
            return;
        }

        setIsSaving(true);
        try {
            const res = await classesAPI.create({
                name: name.trim(),
                nameHindi: nameHindi.trim() || undefined,
                gradeLevel: parseInt(gradeLevel, 10),
                section: section.trim() || undefined,
                stream: stream || 'General',
                maxStudents: parseInt(maxStudents, 10) || 60,
                academicYearId: academicYearId || undefined
            });

            const newClass = res.data?.data?.class;
            setCreatedClass(newClass);
            setIsConfirmed(true);
            setIsEditing(false);
            toast.success(res.data?.message || `Class "${name}" created successfully!`, { icon: '🎓' });
        } catch (err) {
            console.error('Failed to create class:', err);
            toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to create class');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsCancelled(true);
        setIsEditing(false);
        toast('Class creation cancelled', { icon: '🚫' });
    };

    if (isCancelled) {
        return (
            <div className="mt-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 p-3.5 shadow-xs space-y-2 text-[12px] animate-in fade-in">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                        <XCircle className="w-4 h-4 text-slate-400" />
                        <span>Class Draft Cancelled</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsCancelled(false)}
                        className="text-[11px] text-primary-600 hover:text-primary-700 font-semibold hover:underline flex items-center gap-1 transition"
                    >
                        <Undo2 className="w-3 h-3" /> Restore Draft
                    </button>
                </div>
                <p className="text-[11px] text-slate-500">
                    The draft for class "{name}" was cancelled and not created.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-2.5 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-b from-indigo-50/90 via-white to-violet-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 shadow-sm overflow-hidden text-[12px] animate-in fade-in">
            {/* Header */}
            <div className="px-3 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-xs tracking-tight">
                    <GraduationCap className="w-4 h-4 text-indigo-100" />
                    <span>{isConfirmed ? 'Class Created' : 'Class Draft (Pending Confirmation)'}</span>
                </div>
                {isConfirmed ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-300 text-emerald-950 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Created & Active
                    </span>
                ) : (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-300 text-amber-950 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> Ready to Confirm
                    </span>
                )}
            </div>

            {/* Content Body */}
            <div className="p-3.5 space-y-3">
                {isConfirmed ? (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                                    {gradeLevel}{section ? section : ''}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white text-[13px]">{name}</h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{stream} Stream • Capacity: {maxStudents} Students</p>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
                                Active
                            </span>
                        </div>
                        {createdClass?.id && (
                            <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-end">
                                <a
                                    href={`/classes/${createdClass.id}`}
                                    className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                >
                                    <ExternalLink className="w-3 h-3" /> View Class Details
                                </a>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {isEditing ? (
                            <div className="space-y-2.5">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Class Name *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-[12px] font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        placeholder="e.g. 11 Non-Medical A"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Grade (1-12)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="12"
                                            value={gradeLevel}
                                            onChange={(e) => setGradeLevel(e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-[12px] font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Section</label>
                                        <input
                                            type="text"
                                            maxLength="10"
                                            value={section}
                                            onChange={(e) => setSection(e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-[12px] font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            placeholder="A"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Stream</label>
                                        <select
                                            value={stream}
                                            onChange={(e) => setStream(e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-[12px] font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        >
                                            <option value="General">General</option>
                                            <option value="Non-Medical">Non-Medical</option>
                                            <option value="Medical">Medical</option>
                                            <option value="Science">Science</option>
                                            <option value="Commerce">Commerce</option>
                                            <option value="Arts">Arts</option>
                                            <option value="Vocational">Vocational</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Max Students</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="200"
                                            value={maxStudents}
                                            onChange={(e) => setMaxStudents(e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-[12px] font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Name (Hindi)</label>
                                        <input
                                            type="text"
                                            value={nameHindi}
                                            onChange={(e) => setNameHindi(e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-[12px] font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            placeholder="कक्षा 11"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-3 border border-indigo-100/80 dark:border-indigo-900/50 space-y-2.5 shadow-2xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                                            {gradeLevel}{section || ''}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-[14px] leading-tight">{name}</h4>
                                            {nameHindi && <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{nameHindi}</p>}
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold rounded-full border border-indigo-200 dark:border-indigo-800">
                                        {stream}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-[11px]">
                                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Grade</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">Class {gradeLevel}</span>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Section</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">Section {section || 'A'}</span>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Capacity</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{maxStudents} Students</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg transition flex items-center gap-1"
                                >
                                    <Edit3 className="w-3 h-3" /> {isEditing ? 'Done' : 'Edit Details'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-2 py-1.5 text-slate-400 hover:text-red-600 text-[11px] font-bold rounded-lg transition flex items-center gap-1"
                                >
                                    <XCircle className="w-3 h-3" /> Cancel
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={isSaving}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-[11px] font-bold rounded-lg shadow-sm shadow-indigo-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating Class...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirm & Create Class
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Document badge
function DocumentBadge({ doc, onRemove }) {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 rounded-lg text-xs">
            <FileText className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-violet-700 dark:text-violet-300 font-medium truncate max-w-[150px]">{doc.fileName}</span>
            <span className="text-violet-400">{(doc.fileSize / 1024).toFixed(1)}KB</span>
            <button onClick={onRemove} className="text-violet-400 hover:text-red-500 transition">
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

export default function AIAssistantPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadedDocs, setUploadedDocs] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        if (user?.role !== 'admin' && user?.role !== 'principal') {
            router.push('/dashboard');
            toast.error('Access denied. Admin only.');
        }
    }, [isAuthenticated, user, _hasHydrated]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Welcome message
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                role: 'assistant',
                content: `👋 Hello! I'm your **AI Database Assistant**. I have full access to the school database schema and can help you:\n\n- 📊 **Query data** — "How many students are enrolled this year?"\n- 📋 **Generate reports** — "Show top 10 students by grades"\n- 🔍 **Analyze trends** — "Compare submissions per month"\n- 📄 **Read documents** — Upload any file and ask questions about it\n- 🗄️ **Explore schema** — "What tables store fee information?"\n\nJust ask anything in plain English!`,
                timestamp: new Date().toISOString()
            }]);
        }
    }, []);

    const handleSend = async () => {
        const msg = input.trim();
        if (!msg || isLoading) return;

        const userMessage = { role: 'user', content: msg, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Build conversation history (last 10 messages for context)
            const history = messages.slice(-10).map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                content: m.content
            }));

            // Build document context
            const docContext = uploadedDocs.map(d => `--- Document: ${d.fileName} ---\n${d.extractedText}`).join('\n\n');

            const res = await api.post('/admin/chatbot/chat', {
                message: msg,
                conversationHistory: history,
                documentContext: docContext
            });

            if (res.data.success) {
                const data = res.data.data;
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.message,
                    sql: data.sql,
                    queryResult: data.queryResult,
                    reportAction: data.reportAction,
                    classAction: data.classAction,
                    timestamp: data.timestamp
                }]);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Something went wrong';
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ **Error:** ${errorMsg}\n\nPlease try rephrasing your question.`,
                timestamp: new Date().toISOString(),
                isError: true
            }]);
            toast.error('AI request failed');
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleRerunSQL = async (sql) => {
        setIsLoading(true);
        try {
            const res = await api.post('/admin/chatbot/execute', { sql });
            if (res.data.success) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '🔄 **Query re-executed successfully:**',
                    sql,
                    queryResult: res.data.data,
                    timestamp: new Date().toISOString()
                }]);
            }
        } catch (err) {
            toast.error('Query failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('document', file);

            const res = await api.post('/admin/chatbot/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.success) {
                setUploadedDocs(prev => [...prev, res.data.data]);
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `📄 **Document loaded:** ${res.data.data.fileName}\n\n*${res.data.data.charCount.toLocaleString()} characters extracted.* You can now ask me questions about this document.`,
                    timestamp: new Date().toISOString()
                }]);
                toast.success('Document uploaded');
            }
        } catch (err) {
            toast.error('Upload failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const clearChat = () => {
        setMessages([{
            role: 'assistant',
            content: '🗑️ Chat cleared. How can I help you?',
            timestamp: new Date().toISOString()
        }]);
        setUploadedDocs([]);
    };

    const suggestions = [
        "How many students are enrolled this year?",
        "Show top 5 classes by submission count",
        "List all active instructors with their subjects",
        "What's the average grade percentage across all submissions?",
        "Show pending procurement requests",
        "Count unresolved tickets by priority"
    ];

    if (!_hasHydrated || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20">
            <PageHeader title="AI Assistant" titleHindi="AI सहायक">
                <div className="flex items-center gap-2">
                    <button title="Clear" onClick={clearChat} className="btn btn-ghost text-sm flex items-center justify-center gap-1.5">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </PageHeader>

            <main className="max-w-5xl mx-auto px-4 pb-4 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
                {/* Document badges */}
                {uploadedDocs.length > 0 && (
                    <div className="flex flex-wrap gap-2 py-2">
                        {uploadedDocs.map((doc, i) => (
                            <DocumentBadge key={i} doc={doc} onRemove={() => setUploadedDocs(prev => prev.filter((_, j) => j !== i))} />
                        ))}
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 py-4 scrollbar-thin">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl rounded-br-md px-5 py-3 shadow-lg shadow-indigo-500/20'
                                    : `rounded-2xl rounded-bl-md px-5 py-4 shadow-sm ${msg.isError
                                        ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'}`
                                }`}>
                                {msg.role === 'assistant' && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                                            <Bot className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">AI Assistant</span>
                                        <span className="text-[10px] text-slate-400">
                                            {msg.timestamp ? formatTime(msg.timestamp) : ''}
                                        </span>
                                    </div>
                                )}
                                {msg.role === 'user' ? (
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                ) : (
                                    <>
                                        <RenderMessage content={msg.content} />
                                        {msg.classAction && <ClassActionCard action={msg.classAction} />}
                                    </>
                                )}
                                {msg.queryResult && (
                                    <SQLResultPanel
                                        sql={msg.sql}
                                        result={msg.queryResult}
                                        onRerun={() => handleRerunSQL(msg.sql)}
                                    />
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                                        <Bot className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <span className="text-xs font-medium text-slate-500">Thinking...</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />

                    {/* Suggestions — only show at start */}
                    {messages.length <= 1 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                            {suggestions.map((s, i) => (
                                <button key={i} onClick={() => { setInput(s); }}
                                    className="text-left px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:shadow-md transition-all text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                                    <Sparkles className="w-3.5 h-3.5 inline mr-2 text-indigo-400" />
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Input bar */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3 pb-2">
                    <div className="flex items-end gap-2">
                        {/* Upload button */}
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden"
                            accept=".txt,.csv,.json,.pdf,.md,.sql,.log" />
                        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                            className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 flex items-center justify-center text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900 transition disabled:opacity-50"
                            title="Upload document">
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        </button>

                        {/* Text input */}
                        <div className="flex-1 relative">
                            <textarea ref={inputRef} value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                                }}
                                placeholder="Ask anything about your data..."
                                rows={1}
                                className="w-full px-4 py-2.5 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                style={{ minHeight: '44px', maxHeight: '120px' }}
                            />
                        </div>

                        {/* Send button */}
                        <button onClick={handleSend} disabled={!input.trim() || isLoading}
                            className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center hover:from-indigo-600 hover:to-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                        AI can make mistakes. Always verify SQL before running destructive queries. Press Enter to send, Shift+Enter for new line.
                    </p>
                </div>
            </main>
        </div>
    );
}
