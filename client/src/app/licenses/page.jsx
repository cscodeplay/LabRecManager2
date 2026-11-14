'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, ShieldCheck, ExternalLink, Copy, Check, FileText, Sparkles, Layers } from 'lucide-react';
import { FluentInstituteOpsIcon } from '@/components/FluentAppIcons';
import toast from 'react-hot-toast';

const OPEN_SOURCE_LIBRARIES = [
    {
        name: 'React',
        version: '^18.2.0',
        license: 'MIT',
        category: 'Framework & Core',
        url: 'https://react.dev',
        description: 'The library for web and native user interfaces.',
        copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.'
    },
    {
        name: 'Next.js',
        version: '14.0.4',
        license: 'MIT',
        category: 'Framework & Core',
        url: 'https://nextjs.org',
        description: 'The React framework for the Web, providing SSR, routing, and compilation.',
        copyright: 'Copyright (c) 2024 Vercel, Inc.'
    },
    {
        name: '@capacitor/core & @capacitor/ios',
        version: '^6.2.3',
        license: 'MIT',
        category: 'Framework & Core',
        url: 'https://capacitorjs.com',
        description: 'Cross-platform native runtime enabling iOS and iPadOS mobile compilation.',
        copyright: 'Copyright (c) 2017-present Ionic'
    },
    {
        name: 'Tailwind CSS',
        version: '^3.4.0',
        license: 'MIT',
        category: 'UI & Graphics',
        url: 'https://tailwindcss.com',
        description: 'A utility-first CSS framework for rapid responsive interface development.',
        copyright: 'Copyright (c) Tailwind Labs, Inc.'
    },
    {
        name: 'Framer Motion',
        version: '^13.1.0',
        license: 'MIT',
        category: 'UI & Graphics',
        url: 'https://www.framer.com/motion',
        description: 'Production-ready motion library for React gestures and spring animations.',
        copyright: 'Copyright (c) 2018 Framer B.V.'
    },
    {
        name: 'Lucide React',
        version: '^1.28.0',
        license: 'ISC',
        category: 'UI & Graphics',
        url: 'https://lucide.dev',
        description: 'Clean, consistent vector icon library for modern interfaces.',
        copyright: 'Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather.'
    },
    {
        name: 'Microsoft Fluent UI System Icons',
        version: '^1.2.61',
        license: 'MIT',
        category: 'UI & Graphics',
        url: 'https://github.com/microsoft/fluentui-system-icons',
        description: 'Official 3D and vector glyphs designed by Microsoft for Fluent Design.',
        copyright: 'Copyright (c) Microsoft Corporation.'
    },
    {
        name: 'ECharts & echarts-for-react',
        version: '^6.0.0',
        license: 'Apache-2.0',
        category: 'UI & Graphics',
        url: 'https://echarts.apache.org',
        description: 'Enterprise-grade charting and data visualization engine.',
        copyright: 'Copyright 2017-2024 The Apache Software Foundation.'
    },
    {
        name: 'Monaco Editor (@monaco-editor/react)',
        version: '^4.7.0',
        license: 'MIT',
        category: 'UI & Graphics',
        url: 'https://microsoft.github.io/monaco-editor',
        description: 'The code editor that powers VS Code, used for in-browser student programming.',
        copyright: 'Copyright (c) Microsoft Corporation.'
    },
    {
        name: 'KaTeX',
        version: '^0.18.5',
        license: 'MIT',
        category: 'UI & Graphics',
        url: 'https://katex.org',
        description: 'Fast math typesetting library for mathematical formulas and scientific proofs.',
        copyright: 'Copyright (c) 2013-2024 Khan Academy and other contributors.'
    },
    {
        name: 'Mermaid',
        version: '^12.2.0',
        license: 'MIT',
        category: 'UI & Graphics',
        url: 'https://mermaid.js.org',
        description: 'Diagramming and charting tool that uses Markdown-inspired text definitions.',
        copyright: 'Copyright (c) 2014 - 2024 Knut Sveidqvist.'
    },
    {
        name: 'SheetJS (xlsx)',
        version: '^0.18.5',
        license: 'Apache-2.0',
        category: 'Document Engines',
        url: 'https://sheetjs.com',
        description: 'High-performance parser and writer for spreadsheets (.xlsx, .csv, .ods).',
        copyright: 'Copyright (C) 2012-present SheetJS LLC.'
    },
    {
        name: 'PDF.js (pdfjs-dist)',
        version: '^3.11.174',
        license: 'Apache-2.0',
        category: 'Document Engines',
        url: 'https://mozilla.github.io/pdf.js',
        description: 'Community-driven PDF document rendering engine developed by Mozilla.',
        copyright: 'Copyright (c) Mozilla and individual contributors.'
    },
    {
        name: 'docx-preview',
        version: '^0.3.7',
        license: 'Apache-2.0',
        category: 'Document Engines',
        url: 'https://github.com/VolodymyrBaydalka/docxjs',
        description: 'High-fidelity Microsoft Word (.docx) renderer for web canvas.',
        copyright: 'Copyright 2018-2024 Volodymyr Baydalka.'
    },
    {
        name: 'Jspreadsheet CE',
        version: '^5.0.4',
        license: 'MIT',
        category: 'Document Engines',
        url: 'https://jspreadsheet.com',
        description: 'Interactive Excel-like data grid component with cell formulas.',
        copyright: 'Copyright (c) 2024 Jspreadsheet Ltd.'
    },
    {
        name: 'DOMPurify',
        version: '^3.4.13',
        license: 'Apache-2.0 / MPL-2.0',
        category: 'Security & AI',
        url: 'https://github.com/cure53/DOMPurify',
        description: 'Ultra-fast, tolerating XSS sanitizer for HTML, MathML and SVG.',
        copyright: 'Copyright 2014-2024 Cure53 and other contributors.'
    },
    {
        name: 'Zod & React Hook Form',
        version: '^3.22.4 / ^7.49.2',
        license: 'MIT',
        category: 'Framework & Core',
        url: 'https://zod.dev',
        description: 'Type-safe schema validation and performant form state engine.',
        copyright: 'Copyright (c) 2020 Colin McDonnell / Beier Luo.'
    },
    {
        name: 'Prisma Client & ORM',
        version: '^5.7.0',
        license: 'Apache-2.0',
        category: 'Backend & Data',
        url: 'https://www.prisma.io',
        description: 'Next-generation ORM for Node.js & TypeScript with schema migrations.',
        copyright: 'Copyright (c) 2019-present Prisma Data, Inc.'
    },
    {
        name: 'Google Generative AI SDK',
        version: '^0.24.1',
        license: 'Apache-2.0',
        category: 'Security & AI',
        url: 'https://ai.google.dev',
        description: 'Official SDK for Gemini multimodal intelligence and viva assessment assistants.',
        copyright: 'Copyright 2024 Google LLC.'
    },
    {
        name: 'Groq SDK',
        version: '^1.1.2',
        license: 'Apache-2.0',
        category: 'Security & AI',
        url: 'https://groq.com',
        description: 'Ultra-low latency LPU inference client for fast viva voice and transcription.',
        copyright: 'Copyright (c) 2024 Groq, Inc.'
    },
    {
        name: 'Sharp & Libvips (Backend Dynamic Binary)',
        version: '^0.35.5',
        license: 'Apache-2.0 / LGPL-3.0-or-later',
        category: 'Backend & Data',
        url: 'https://sharp.pixelplumbing.com',
        description: 'High performance Node.js image processing module dynamically linked with libvips.',
        copyright: 'Copyright (c) Lovell Fuller and contributors.'
    }
];

const CATEGORIES = ['All', 'Framework & Core', 'UI & Graphics', 'Document Engines', 'Backend & Data', 'Security & AI'];

export default function LicensesPage() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [copiedIndex, setCopiedIndex] = useState(null);

    const filteredLibraries = useMemo(() => {
        return OPEN_SOURCE_LIBRARIES.filter((lib) => {
            const matchesCategory = activeCategory === 'All' || lib.category === activeCategory;
            const matchesSearch =
                lib.name.toLowerCase().includes(search.toLowerCase()) ||
                lib.description.toLowerCase().includes(search.toLowerCase()) ||
                lib.license.toLowerCase().includes(search.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [search, activeCategory]);

    const handleCopyNotice = (lib, index) => {
        const text = `${lib.name} (${lib.version})\nLicense: ${lib.license}\n${lib.copyright}\nURL: ${lib.url}`;
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        toast.success(`Copied notice for ${lib.name}!`);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
            {/* Top Navigation */}
            <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Go Back"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                                <FluentInstituteOpsIcon size={22} />
                            </div>
                            <div>
                                <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                                    Legal & Open Source Notices
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    Unified Lab Record Management System (ULRMS)
                                </p>
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/login"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                        Sign In
                    </Link>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                {/* Hero Banner */}
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4 border border-indigo-500/30">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Open Source Compliance & Integrity
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
                            Third-Party Software Attributions
                        </h2>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            ULRMS is built on top of high-performance, permissive open-source libraries. In accordance with the terms of the MIT, Apache 2.0, ISC, and BSD licenses, all respective copyright notices, permission grants, and library disclaimers are preserved below.
                        </p>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    {/* Category Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                    activeCategory === cat
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative min-w-[260px]">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Filter by package or license..."
                            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Library Cards Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                    {filteredLibraries.map((lib, idx) => (
                        <div
                            key={lib.name}
                            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                                {lib.name}
                                            </h3>
                                            <span className="font-mono text-[10px] text-slate-400">
                                                {lib.version}
                                            </span>
                                        </div>
                                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                            {lib.license}
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-lg">
                                        {lib.category}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                                    {lib.description}
                                </p>
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span className="font-mono text-[10px] truncate max-w-[220px]" title={lib.copyright}>
                                    {lib.copyright}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleCopyNotice(lib, idx)}
                                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                                        title="Copy Attribution Notice"
                                    >
                                        {copiedIndex === idx ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                        ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                    <a
                                        href={lib.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                                        title="Visit Project Repository"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredLibraries.length === 0 && (
                    <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No libraries match your filter</h4>
                        <p className="text-xs text-slate-500 mt-1">Try searching by package name or license abbreviation.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
