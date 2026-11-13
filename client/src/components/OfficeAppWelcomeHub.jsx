'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus,
    FileText,
    FileSpreadsheet,
    Presentation,
    File,
    FolderOpen,
    Upload,
    HardDrive,
    Sparkles,
    Clock,
    Search,
    X,
    ChevronRight,
    ArrowRight,
    GraduationCap,
    CheckCircle2,
    Calendar,
    Award,
    Layers
} from 'lucide-react';
import {
    FluentWordDocIcon,
    FluentExcelDocIcon,
    FluentSlidesDocIcon,
    FluentPdfDocIcon
} from './FluentAppIcons';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function OfficeAppWelcomeHub({
    isOpen = true,
    onClose,
    appName = 'word', // 'word' | 'excel' | 'slides' | 'pdf'
    onSelectBlank,
    onSelectTemplate,
    onOpenFile,
    onOpenDrive,
    onOpenOfficeMedia
}) {
    const router = useRouter();
    const [recentFiles, setRecentFiles] = useState([]);
    const [loadingRecent, setLoadingRecent] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        const fetchRecent = async () => {
            try {
                setLoadingRecent(true);
                const res = await api.get('/office/documents/media-files');
                if (res.data?.success && res.data.data?.files) {
                    const allFiles = res.data.data.files;
                    const catMap = {
                        word: 'word',
                        excel: 'excel',
                        slides: 'presentation',
                        pdf: 'pdf'
                    };
                    const targetCat = catMap[appName] || 'all';
                    const filtered = allFiles.filter(f => {
                        const cat = f.category || '';
                        const name = (f.name || f.fileName || '').toLowerCase();
                        if (targetCat === 'word') return cat === 'word' || name.endsWith('.docx') || name.endsWith('.doc') || name.endsWith('.txt');
                        if (targetCat === 'excel') return cat === 'excel' || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');
                        if (targetCat === 'presentation') return cat === 'presentation' || name.endsWith('.pptx') || name.endsWith('.ppt');
                        if (targetCat === 'pdf') return cat === 'pdf' || name.endsWith('.pdf');
                        return true;
                    });
                    setRecentFiles(filtered.slice(0, 8));
                }
            } catch (err) {
                console.error('Failed to load recent files in Welcome Hub:', err);
            } finally {
                setLoadingRecent(false);
            }
        };
        fetchRecent();
    }, [isOpen, appName]);

    if (!isOpen) return null;

    // Config per app
    const appConfig = {
        word: {
            title: 'Word Document Studio',
            subtitle: 'Rich academic papers, experiment records & lab documentation',
            badge: 'Word Suite',
            icon: FluentWordDocIcon,
            accentBg: 'bg-blue-600',
            accentText: 'text-blue-600 dark:text-blue-400',
            accentBorder: 'border-blue-500/30',
            accentGlow: 'shadow-blue-500/20',
            blankLabel: 'Blank Document',
            blankDesc: 'Start with a clean typography-focused page',
            templates: [
                {
                    id: 'lab-report',
                    title: 'Lab Experiment Report',
                    desc: 'Hypothesis, apparatus, procedure, results & error analysis',
                    tag: 'Lab STEM',
                    color: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-900',
                    icon: GraduationCap
                },
                {
                    id: 'research-paper',
                    title: 'Academic Research Paper',
                    desc: 'Abstract, introduction, methodology, literature review & citations',
                    tag: 'IEEE / APA',
                    color: 'from-slate-50 to-blue-50 border-slate-200 text-slate-900',
                    icon: Award
                },
                {
                    id: 'course-syllabus',
                    title: 'Course Syllabus & Objectives',
                    desc: 'Weekly breakdown, grading rubrics, lecture topics & references',
                    tag: 'Curriculum',
                    color: 'from-amber-50 to-orange-50 border-amber-200 text-amber-900',
                    icon: Calendar
                },
                {
                    id: 'department-notice',
                    title: 'Formal Department Notice',
                    desc: 'Official laboratory circular, guidelines & committee review',
                    tag: 'Institutional',
                    color: 'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-900',
                    icon: CheckCircle2
                }
            ]
        },
        excel: {
            title: 'Excel Spreadsheet Studio',
            subtitle: 'Advanced formulas, formulas engine, STEM tables & data analytics',
            badge: 'Excel Suite',
            icon: FluentExcelDocIcon,
            accentBg: 'bg-emerald-600',
            accentText: 'text-emerald-600 dark:text-emerald-400',
            accentBorder: 'border-emerald-500/30',
            accentGlow: 'shadow-emerald-500/20',
            blankLabel: 'Blank Workbook',
            blankDesc: 'Start fresh with an empty calculating spreadsheet grid',
            templates: [
                {
                    id: 'gradebook',
                    title: 'Student Gradebook & Analytics',
                    desc: 'Automated GPA calculations, weighted quizzes & grade curves',
                    tag: 'Grading',
                    color: 'from-emerald-50 to-green-50 border-emerald-200 text-emerald-900',
                    icon: Award
                },
                {
                    id: 'attendance',
                    title: 'Class & Lab Attendance Log',
                    desc: 'Daily presence tracking, absence statistics & percentage summaries',
                    tag: 'Attendance',
                    color: 'from-teal-50 to-cyan-50 border-teal-200 text-teal-900',
                    icon: Calendar
                },
                {
                    id: 'experiment-data',
                    title: 'Science Experiment Data Log',
                    desc: 'Trials, standard deviation, variance & mathematical observations',
                    tag: 'STEM Data',
                    color: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-900',
                    icon: GraduationCap
                },
                {
                    id: 'equipment-inventory',
                    title: 'Lab Apparatus & Chemical Inventory',
                    desc: 'Asset serials, remaining stock quantities, expiry & reorder thresholds',
                    tag: 'Inventory',
                    color: 'from-amber-50 to-yellow-50 border-amber-200 text-amber-900',
                    icon: CheckCircle2
                }
            ]
        },
        slides: {
            title: 'Presentation & Slides Studio',
            subtitle: 'Engaging classroom slide decks, research defense & projector views',
            badge: 'Slides Suite',
            icon: FluentSlidesDocIcon,
            accentBg: 'bg-orange-600',
            accentText: 'text-orange-600 dark:text-orange-400',
            accentBorder: 'border-orange-500/30',
            accentGlow: 'shadow-orange-500/20',
            blankLabel: 'Blank Presentation',
            blankDesc: 'Start fresh with a minimal title slide layout',
            templates: [
                {
                    id: 'lecture-deck',
                    title: 'Class Lecture & Chapter Deck',
                    desc: 'Topic introduction, visual diagrams, takeaways & discussion points',
                    tag: 'Teaching',
                    color: 'from-orange-50 to-amber-50 border-orange-200 text-orange-900',
                    icon: GraduationCap
                },
                {
                    id: 'defense-deck',
                    title: 'Science Project Defense Deck',
                    desc: 'Problem statement, proposed model, data results & conclusions',
                    tag: 'Defense',
                    color: 'from-rose-50 to-orange-50 border-rose-200 text-rose-900',
                    icon: Award
                },
                {
                    id: 'workshop-demo',
                    title: 'Technical Workshop & Demo',
                    desc: 'Step-by-step walkthrough, architecture diagrams & live experiments',
                    tag: 'Hands-on',
                    color: 'from-indigo-50 to-blue-50 border-indigo-200 text-indigo-900',
                    icon: Layers
                },
                {
                    id: 'seminar-keynote',
                    title: 'Conference & Seminar Keynote',
                    desc: 'High-impact visuals, speaker quotes & key research takeaways',
                    tag: 'Keynote',
                    color: 'from-violet-50 to-purple-50 border-violet-200 text-violet-900',
                    icon: Sparkles
                }
            ]
        },
        pdf: {
            title: 'PDF Studio & Document Viewer',
            subtitle: 'Professional PDF annotation, page management, digital signatures & forms',
            badge: 'PDF Suite',
            icon: FluentPdfDocIcon,
            accentBg: 'bg-red-600',
            accentText: 'text-red-600 dark:text-red-400',
            accentBorder: 'border-red-500/30',
            accentGlow: 'shadow-red-500/20',
            blankLabel: 'Blank PDF Document',
            blankDesc: 'Create an editable blank canvas ready for text and drawing',
            templates: [
                {
                    id: 'blank-doc',
                    title: 'Blank Multi-page PDF',
                    desc: 'Clean multi-page document structure ready for annotation & drafting',
                    tag: 'Blank',
                    color: 'from-red-50 to-rose-50 border-red-200 text-red-900',
                    icon: FileText
                },
                {
                    id: 'sign-form',
                    title: 'Fill & Sign Form',
                    desc: 'Pre-configured signature lines, checkboxes, stamp fields & review dates',
                    tag: 'Signatures',
                    color: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-900',
                    icon: CheckCircle2
                },
                {
                    id: 'lab-rubric',
                    title: 'Lab Evaluation & Scoring Rubric',
                    desc: 'Evaluation grids, marks allocation tables & instructor feedback fields',
                    tag: 'Grading',
                    color: 'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-900',
                    icon: Award
                },
                {
                    id: 'cert-form',
                    title: 'Laboratory Clearance Certificate',
                    desc: 'Formal clearance template with verification stamps and safety approval',
                    tag: 'Official',
                    color: 'from-amber-50 to-orange-50 border-amber-200 text-amber-900',
                    icon: GraduationCap
                }
            ]
        }
    };

    const cfg = appConfig[appName] || appConfig.word;
    const IconComp = cfg.icon;

    const filteredRecent = recentFiles.filter(f => {
        if (!searchFilter) return true;
        const q = searchFilter.toLowerCase();
        return (f.name || f.fileName || '').toLowerCase().includes(q);
    });

    return (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 select-none">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
                {/* ── TOP HEADER ── */}
                <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 bg-slate-50/80 dark:bg-slate-850/80">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                            className="w-10 h-10 shrink-0 flex items-center justify-center"
                        >
                            <IconComp size={36} className="w-9 h-9 shrink-0" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                                    {cfg.title}
                                </h2>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.accentBg} text-white shrink-0`}>
                                    {cfg.badge}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {cfg.subtitle}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {onOpenFile && (
                            <button
                                type="button"
                                onClick={onOpenFile}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
                                title="Open local file from computer"
                            >
                                <FolderOpen className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Open File</span>
                            </button>
                        )}
                        {onOpenOfficeMedia && (
                            <button
                                type="button"
                                onClick={onOpenOfficeMedia}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
                                title="Browse Office Media Files"
                            >
                                <HardDrive className="w-3.5 h-3.5 text-rose-500" />
                                <span className="hidden sm:inline">Office Media Files</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                            title="Skip to Editor"
                            aria-label="Close Launchpad"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* ── MAIN CONTENT (SCROLLABLE) ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-7 custom-scrollbar">
                    {/* SECTION 1: START NEW */}
                    <div>
                        <div className="flex items-center justify-between mb-3.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Start New Document or Template</span>
                            </h3>
                            <button
                                type="button"
                                onClick={onSelectBlank || onClose}
                                className={`text-xs font-semibold ${cfg.accentText} hover:underline flex items-center gap-1`}
                            >
                                <span>Open Blank</span>
                                <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Starter Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                            {/* Primary Card: Blank */}
                            <div
                                onClick={onSelectBlank || onClose}
                                className="group p-4 rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-850 dark:to-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[160px]"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                                        <Plus className="w-5 h-5 stroke-[2.5]" />
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                                        Blank
                                    </span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {cfg.blankLabel}
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                        {cfg.blankDesc}
                                    </p>
                                </div>
                            </div>

                            {/* Academic & Specialized Templates */}
                            {cfg.templates.map(tmpl => {
                                const TmplIcon = tmpl.icon || FileText;
                                return (
                                    <div
                                        key={tmpl.id}
                                        onClick={() => onSelectTemplate ? onSelectTemplate(tmpl.id, tmpl) : (onSelectBlank ? onSelectBlank() : onClose())}
                                        className="group p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[160px]"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                <TmplIcon className="w-4 h-4" />
                                            </div>
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                {tmpl.tag}
                                            </span>
                                        </div>
                                        <div className="mt-3">
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors line-clamp-1">
                                                {tmpl.title}
                                            </h4>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                                {tmpl.desc}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 2: RECENT DOCUMENTS */}
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Recent Files in Office Media</span>
                            </h3>
                            <div className="relative w-full sm:w-56">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Filter recent files..."
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        {loadingRecent ? (
                            <div className="py-8 text-center text-xs text-slate-400 italic">
                                Loading recent documents...
                            </div>
                        ) : filteredRecent.length === 0 ? (
                            <div className="py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    No recent {cfg.badge} files found. Create a new document above to get started!
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                {filteredRecent.map((f, idx) => (
                                    <div
                                        key={f.id || f.fileName || idx}
                                        onClick={() => {
                                            const qs = new URLSearchParams({
                                                ...(f.id ? { docId: f.id, id: f.id } : {}),
                                                ...(f.url ? { fileUrl: f.url } : {}),
                                                title: f.name || f.fileName || 'Document'
                                            }).toString();
                                            const pathMap = {
                                                word: '/documents/word-editor',
                                                excel: '/documents/excel-editor',
                                                slides: '/documents/slides-editor',
                                                pdf: '/documents/pdf-studio'
                                            };
                                            router.push(`${pathMap[appName] || '/documents/word-editor'}?${qs}`);
                                            onClose();
                                        }}
                                        className="p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm transition cursor-pointer group flex items-start gap-3"
                                    >
                                        <div
                                            style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-2xs"
                                        >
                                            <IconComp size={22} className="w-5 h-5 shrink-0" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={f.name || f.fileName}>
                                                {f.name || f.fileName || 'Untitled File'}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {f.updatedAt ? new Date(f.updatedAt).toLocaleDateString() : 'Recent'}
                                                {f.sizeFormatted ? ` • ${f.sizeFormatted}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── FOOTER ── */}
                <footer className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850/90 flex items-center justify-between text-xs text-slate-500 shrink-0">
                    <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>All documents automatically sync with Office Media Files and local storage</span>
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold transition"
                    >
                        Skip to Editor
                    </button>
                </footer>
            </div>
        </div>
    );
}
