'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    FileText,
    Table,
    FileSpreadsheet,
    BookOpen,
    GraduationCap,
    Server,
    Laptop,
    Sparkles,
    Check,
    Search,
    X,
    Folder
} from 'lucide-react';
import { documentsAPI } from '@/lib/api';

/**
 * Built-in / preset files available in the workspace and sample libraries
 */
const PRESET_FILES = [
    {
        fileName: 'python_math_library_syllabus.pdf',
        name: 'Engineering Mathematics & Python Scientific Computing Syllabus',
        category: 'Engineering Mathematics & Ebook',
        fileType: 'pdf',
        description: '4 Units covering Linear Algebra, Differential Calculus, Numerical Methods & Fourier Analysis',
        aiCapability: '🎓 Generates Training Module (Math Problems, Proofs, Python Programs, Bug Fixes)',
        badgeColor: 'bg-purple-100 text-purple-700 border-purple-200'
    },
    {
        fileName: 'lab1_inventory.csv',
        name: 'Computer Lab 1 Hardware Inventory',
        category: 'Lab Hardware & Equipment',
        fileType: 'csv',
        description: '25 Hardware items (PCs, Monitors, Keyboards, Switches) with specs & serials',
        aiCapability: '📊 Auto-maps columns & loads into Lab 1 Inventory',
        badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    },
    {
        fileName: 'lab2_inventory.csv',
        name: 'Computer Lab 2 Equipment & Network Devices',
        category: 'Lab Hardware & Equipment',
        fileType: 'csv',
        description: '20 Network devices, Dell Workstations and peripherals',
        aiCapability: '📊 Auto-maps columns & loads into Lab 2 Inventory',
        badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    },
    {
        fileName: 'class_11A_students.csv',
        name: 'Class 11-A Student Roster',
        category: 'Student Data',
        fileType: 'csv',
        description: 'Student records with Name, Admission No, Contact & Parent Details',
        aiCapability: '👥 Auto-maps & imports students into Class 11-A',
        badgeColor: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    {
        fileName: 'class_12A_students.csv',
        name: 'Class 12-A Student Roster',
        category: 'Student Data',
        fileType: 'csv',
        description: 'Student records with Name, Admission No, Contact & Parent Details',
        aiCapability: '👥 Auto-maps & imports students into Class 12-A',
        badgeColor: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    {
        fileName: 'class_10A_students.csv',
        name: 'Class 10-A Student Roster',
        category: 'Student Data',
        fileType: 'csv',
        description: 'Secondary grade student records with roll numbers and contact info',
        aiCapability: '👥 Auto-maps & imports students into Class 10-A',
        badgeColor: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    {
        fileName: 'computer_lab2_laptops.csv',
        name: 'Computer Lab 2 Laptop Registry',
        category: 'Lab Hardware & Equipment',
        fileType: 'csv',
        description: 'Dell Latitude & Lenovo ThinkPad laptop devices and battery health status',
        aiCapability: '📊 Auto-maps columns & loads into Lab Registry',
        badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    }
];

export default function FileReferenceDropdown({
    query = '',
    isOpen = false,
    onSelect,
    onClose,
    uploadedDocs = []
}) {
    const [dbDocuments, setDbDocuments] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef(null);

    // Fetch documents from system Document table
    useEffect(() => {
        if (!isOpen) return;

        documentsAPI.getAll({ limit: 50 })
            .then(res => {
                const docs = res.data?.data?.documents || res.data?.data || [];
                if (Array.isArray(docs)) {
                    setDbDocuments(docs.map(d => ({
                        id: d.id,
                        fileName: d.fileName || d.name,
                        name: d.name || d.fileName,
                        fileType: (d.fileType || d.fileName?.split('.').pop() || 'pdf').toLowerCase(),
                        category: d.category || 'Uploaded Document',
                        description: d.description || `${d.fileSize ? Math.round(d.fileSize / 1024) + ' KB' : 'Document'}`,
                        aiCapability: (d.fileName || '').match(/\.(csv|xlsx|xls)$/i)
                            ? '📊 Auto-detects table & maps columns for import'
                            : '🎓 Analyzes document / generates training content',
                        badgeColor: (d.fileName || '').match(/\.(csv|xlsx|xls)$/i)
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-indigo-100 text-indigo-700 border-indigo-200',
                        isDbDoc: true
                    })));
                }
            })
            .catch(() => {});
    }, [isOpen]);

    // Format session uploads
    const sessionDocs = (uploadedDocs || []).map(d => ({
        fileName: d.fileName || d.name,
        name: d.fileName || d.name,
        fileType: (d.fileName?.split('.').pop() || 'txt').toLowerCase(),
        category: 'Session Upload',
        description: `${d.charCount ? d.charCount.toLocaleString() + ' chars' : 'Uploaded in chat'}`,
        aiCapability: (d.fileName || '').match(/\.(csv|xlsx|xls)$/i)
            ? '📊 Delimited data ready for import'
            : '💡 Extracted text ready for reasoning',
        badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
        isSessionUpload: true
    }));

    // Merge and deduplicate all file sources
    const allFiles = React.useMemo(() => {
        const map = new Map();

        // 1. Session uploads first
        sessionDocs.forEach(f => {
            if (f.fileName) map.set(f.fileName.toLowerCase(), f);
        });

        // 2. Presets next
        PRESET_FILES.forEach(f => {
            if (!map.has(f.fileName.toLowerCase())) {
                map.set(f.fileName.toLowerCase(), f);
            }
        });

        // 3. Database documents
        dbDocuments.forEach(f => {
            if (!map.has(f.fileName.toLowerCase())) {
                map.set(f.fileName.toLowerCase(), f);
            }
        });

        return Array.from(map.values());
    }, [dbDocuments, uploadedDocs]);

    // Filter files by user search query
    const filteredFiles = React.useMemo(() => {
        const q = (query || '').trim().toLowerCase();
        if (!q) return allFiles;

        return allFiles.filter(f =>
            (f.fileName && f.fileName.toLowerCase().includes(q)) ||
            (f.name && f.name.toLowerCase().includes(q)) ||
            (f.category && f.category.toLowerCase().includes(q)) ||
            (f.description && f.description.toLowerCase().includes(q))
        );
    }, [allFiles, query]);

    // Reset selection index when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Keyboard navigation listener
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredFiles.length));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredFiles.length) % Math.max(1, filteredFiles.length));
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                if (filteredFiles.length > 0 && selectedIndex < filteredFiles.length) {
                    e.preventDefault();
                    onSelect(filteredFiles[selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredFiles, selectedIndex, onSelect, onClose]);

    // Ensure selected item is scrolled into view
    useEffect(() => {
        if (listRef.current) {
            const activeEl = listRef.current.children[selectedIndex];
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    if (!isOpen) return null;

    const getFileIcon = (fileType = '', fileName = '') => {
        const type = (fileType || fileName.split('.').pop() || '').toLowerCase();
        if (type === 'pdf') {
            return <FileText className="w-4 h-4 text-red-500" />;
        }
        if (['csv', 'xlsx', 'xls'].includes(type)) {
            return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
        }
        if (['doc', 'docx'].includes(type)) {
            return <BookOpen className="w-4 h-4 text-blue-500" />;
        }
        return <FileText className="w-4 h-4 text-indigo-500" />;
    };

    return (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 shadow-2xl shadow-indigo-950/20 overflow-hidden flex flex-col max-h-80 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {/* Header */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 dark:from-indigo-950/60 dark:via-violet-950/60 dark:to-purple-950/60 border-b border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-xs font-mono font-bold">
                        \
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Reference File for AI Bot
                    </span>
                    {query && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-medium">
                            matching &quot;{query}&quot;
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                        ↑↓ Navigate • Enter to select • Esc to close
                    </span>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition"
                        title="Close"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* List */}
            <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1.5 scrollbar-thin">
                {filteredFiles.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                        <Search className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">No matching files found</p>
                        <p className="text-[10px] text-slate-400 mt-1">Try another keyword or upload your file directly</p>
                    </div>
                ) : (
                    filteredFiles.map((file, idx) => {
                        const isSelected = idx === selectedIndex;
                        return (
                            <div
                                key={file.fileName + idx}
                                onClick={() => onSelect(file)}
                                onMouseEnter={() => setSelectedIndex(idx)}
                                className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-start gap-3 ${
                                    isSelected
                                        ? 'bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    file.fileType === 'pdf'
                                        ? 'bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50'
                                        : file.fileType === 'csv' || file.fileType === 'xlsx'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50'
                                        : 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/50'
                                }`}>
                                    {getFileIcon(file.fileType, file.fileName)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                            \{file.fileName}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium uppercase ${file.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                                            {file.fileType || 'file'}
                                        </span>
                                        {file.isSessionUpload && (
                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-medium">
                                                Uploaded
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                                        {file.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                                            <Sparkles className="w-2.5 h-2.5" />
                                            {file.aiCapability}
                                        </span>
                                    </div>
                                </div>

                                {isSelected && (
                                    <div className="self-center flex-shrink-0">
                                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md bg-indigo-100/70 dark:bg-indigo-900/50">
                                            Select ↵
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
