'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    FileText,
    Upload,
    ArrowRight,
    ArrowLeft,
    RefreshCw,
    Download,
    Check,
    CheckCircle2,
    AlertCircle,
    X,
    FileSpreadsheet,
    Image,
    Layers,
    FileCode,
    Clock,
    Sparkles,
    FolderPlus,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    Sliders,
    Eye,
    Presentation,
    Film,
    HardDrive
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import OfficeThemeToggle from '@/components/OfficeThemeToggle';
import { useThemeStore } from '@/lib/store';

const PRESET_CONVERSIONS = [
    {
        id: 'word-to-pdf',
        title: 'Word to PDF',
        desc: 'Preserve fonts, layout, and tables',
        from: 'docx',
        to: 'pdf',
        icon: FileText,
        color: 'from-blue-500 to-indigo-600',
        badge: 'DOCX → PDF'
    },
    {
        id: 'pdf-to-word',
        title: 'PDF to Word',
        desc: 'Reconstruct editable DOCX paragraphs',
        from: 'pdf',
        to: 'docx',
        icon: FileText,
        color: 'from-indigo-500 to-purple-600',
        badge: 'PDF → DOCX'
    },
    {
        id: 'excel-to-pdf',
        title: 'Excel to PDF',
        desc: 'Convert spreadsheets into crisp tables',
        from: 'xlsx',
        to: 'pdf',
        icon: FileSpreadsheet,
        color: 'from-emerald-500 to-teal-600',
        badge: 'XLSX → PDF'
    },
    {
        id: 'pdf-to-excel',
        title: 'PDF to Excel',
        desc: 'Extract columnar tables into rows',
        from: 'pdf',
        to: 'xlsx',
        icon: FileSpreadsheet,
        color: 'from-teal-500 to-emerald-600',
        badge: 'PDF → XLSX'
    },
    {
        id: 'image-to-pdf',
        title: 'Images to PDF',
        desc: 'Collate PNG & JPGs into a multi-page PDF',
        from: 'image',
        to: 'pdf',
        icon: Image,
        color: 'from-amber-500 to-orange-600',
        badge: 'JPG/PNG → PDF'
    },
    {
        id: 'excel-to-csv',
        title: 'Excel to CSV',
        desc: 'Export sheets to comma-separated text',
        from: 'xlsx',
        to: 'csv',
        icon: FileCode,
        color: 'from-cyan-500 to-blue-600',
        badge: 'XLSX → CSV'
    }
];

const COMPATIBLE_TARGETS = {
    docx: [
        { value: 'pdf', label: 'PDF Document (.pdf)' },
        { value: 'txt', label: 'Plain Text (.txt)' },
        { value: 'md', label: 'Markdown (.md)' }
    ],
    pdf: [
        { value: 'docx', label: 'Word Document (.docx)' },
        { value: 'xlsx', label: 'Excel Spreadsheet (.xlsx)' },
        { value: 'txt', label: 'Plain Text (.txt)' }
    ],
    xlsx: [
        { value: 'pdf', label: 'PDF Document (.pdf)' },
        { value: 'csv', label: 'CSV Comma Delimited (.csv)' }
    ],
    xls: [
        { value: 'pdf', label: 'PDF Document (.pdf)' },
        { value: 'csv', label: 'CSV Comma Delimited (.csv)' }
    ],
    csv: [
        { value: 'xlsx', label: 'Excel Spreadsheet (.xlsx)' },
        { value: 'pdf', label: 'PDF Document (.pdf)' }
    ],
    png: [
        { value: 'pdf', label: 'PDF Document (.pdf)' }
    ],
    jpg: [
        { value: 'pdf', label: 'PDF Document (.pdf)' }
    ],
    jpeg: [
        { value: 'pdf', label: 'PDF Document (.pdf)' }
    ],
    webp: [
        { value: 'pdf', label: 'PDF Document (.pdf)' }
    ]
};

export default function UniversalDocumentConverterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const driveFileIdParam = searchParams.get('driveFileId');
    const titleParam = searchParams.get('title');
    const fileInputRef = useRef(null);

    // Global Theme State
    const { theme } = useThemeStore();
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const updateTheme = () => {
            if (theme === 'dark' || theme === 'contrast') {
                setIsDark(true);
            } else if (theme === 'light') {
                setIsDark(false);
            } else if (theme === 'system') {
                setIsDark(typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            }
        };
        updateTheme();
        if (typeof window !== 'undefined') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            mq.addEventListener('change', updateTheme);
            return () => mq.removeEventListener('change', updateTheme);
        }
    }, [theme]);

    // Conversion state
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [fromFormat, setFromFormat] = useState('docx');
    const [toFormat, setToFormat] = useState('pdf');
    const [isConverting, setIsConverting] = useState(false);
    const [conversionProgress, setConversionProgress] = useState(0);
    const [conversionResult, setConversionResult] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    // Advanced options
    const [showOptions, setShowOptions] = useState(false);
    const [orientation, setOrientation] = useState('portrait'); // portrait, landscape, auto
    const [pageSize, setPageSize] = useState('A4'); // A4, Letter

    // Save to documents modal state
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveTitle, setSaveTitle] = useState('');
    const [saveCategory, setSaveCategory] = useState('report');
    const [isSavingToDocs, setIsSavingToDocs] = useState(false);

    // Recent conversions history
    const [recentJobs, setRecentJobs] = useState([]);
    const [loadingRecent, setLoadingRecent] = useState(false);

    // Preview state
    const [previewModalOpen, setPreviewModalOpen] = useState(false);

    // Load recent conversions
    const fetchRecentJobs = async () => {
        try {
            setLoadingRecent(true);
            const res = await api.get('/documents/convert/recent');
            if (res.data?.success) {
                setRecentJobs(res.data.data || []);
            }
        } catch (err) {
            console.error('Failed to load recent jobs:', err);
        } finally {
            setLoadingRecent(false);
        }
    };

    useEffect(() => {
        fetchRecentJobs();
    }, []);

    // Handle files selection
    const handleFilesSelected = (files) => {
        if (!files || files.length === 0) return;
        const fileArr = Array.from(files);
        setSelectedFiles(fileArr);
        setConversionResult(null);

        // Detect format from primary file
        const primary = fileArr[0];
        const ext = primary.name.split('.').pop().toLowerCase();
        let detected = ext;
        if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
            detected = ext;
        }

        setFromFormat(detected);

        // Choose smart default target
        const targets = COMPATIBLE_TARGETS[detected] || [{ value: 'pdf', label: 'PDF Document (.pdf)' }];
        setToFormat(targets[0]?.value || 'pdf');

        // Pre-fill save title
        setSaveTitle(primary.name.replace(/\.[^/.]+$/, ''));
    };

    // Auto-load file from Google Drive if parameter provided
    useEffect(() => {
        if (driveFileIdParam) {
            const loadDriveFile = async () => {
                toast.loading(`Loading "${titleParam || 'file'}" from Google Drive...`, { id: 'gdrive-convert' });
                try {
                    const res = await api.get(`/drive/files/${driveFileIdParam}/content`, { responseType: 'blob' });
                    const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
                    const loadedFile = new File([blob], titleParam || 'drive_document.tmp', { type: blob.type });
                    handleFilesSelected([loadedFile]);
                    toast.success('Loaded file from Google Drive into Converter!', { id: 'gdrive-convert' });
                } catch (err) {
                    console.error('Failed to load Google Drive file into converter:', err);
                    toast.error('Could not download file from Google Drive', { id: 'gdrive-convert' });
                }
            };
            loadDriveFile();
        }
    }, [driveFileIdParam, titleParam]);

    // Apply quick preset
    const handleApplyPreset = (preset) => {
        setFromFormat(preset.from);
        setToFormat(preset.to);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    // Drag and drop handlers
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFilesSelected(e.dataTransfer.files);
        }
    };

    // Execute conversion
    const handleConvert = async () => {
        if (selectedFiles.length === 0) {
            toast.error('Please select at least one file to convert');
            return;
        }

        setIsConverting(true);
        setConversionProgress(25);
        setConversionResult(null);

        try {
            const formData = new FormData();
            selectedFiles.forEach((file) => {
                formData.append('files', file);
            });
            formData.append('fromFormat', fromFormat);
            formData.append('toFormat', toFormat);
            formData.append(
                'options',
                JSON.stringify({
                    orientation,
                    pageSize
                })
            );

            setConversionProgress(60);
            const res = await api.post('/documents/convert', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setConversionProgress(100);

            if (res.data?.success) {
                setConversionResult(res.data);
                toast.success(`Successfully converted to ${toFormat.toUpperCase()}!`);
                fetchRecentJobs();
            } else {
                throw new Error(res.data?.message || 'Conversion failed');
            }
        } catch (err) {
            console.error('Conversion error:', err);
            toast.error(err.response?.data?.message || err.message || 'File conversion failed');
        } finally {
            setIsConverting(false);
        }
    };

    // Save to school documents
    const handleSaveToDocuments = async () => {
        if (!conversionResult?.jobId) return;
        setIsSavingToDocs(true);

        try {
            const res = await api.post(`/documents/convert/save-to-documents/${conversionResult.jobId}`, {
                title: saveTitle || conversionResult.outputFileName,
                category: saveCategory
            });

            if (res.data?.success) {
                toast.success('Document saved to Lab Documents repository!');
                setShowSaveModal(false);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save document');
        } finally {
            setIsSavingToDocs(false);
        }
    };

    // Format bytes
    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className={`min-h-screen flex flex-col font-sans transition-colors duration-150 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
            {/* Top Navigation Bar */}
            <header className={`border-b sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between backdrop-blur-md transition-colors duration-150 ${isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-300/80 bg-white/80 shadow-xs'}`}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/documents')}
                        className={`p-1.5 rounded-lg transition flex items-center gap-1 text-xs font-semibold ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
                        title="Back to Documents"
                    >
                        <ArrowLeft size={16} />
                        <span>Documents</span>
                    </button>
                    <div className={`h-4 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                            <RefreshCw size={16} className="animate-spin-slow" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className={`text-sm sm:text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    Universal Document Converter
                                </h1>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 dark:text-indigo-300 border border-indigo-500/30">
                                    Phase 1
                                </span>
                            </div>
                            <p className={`text-[11px] hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                High-fidelity bi-directional conversion between Word, Excel, PDF, and Images
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <OfficeThemeToggle />

                    <button
                        onClick={() => router.push('/live-board')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'}`}
                    >
                        <span>Whiteboard</span>
                        <ExternalLink size={13} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <main className={`flex-1 overflow-y-auto max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 transition-colors duration-150 ${isDark ? 'bg-slate-950' : 'bg-slate-100/70'}`}>
                {/* Preset Fast-Pick Cards */}
                <div>
                    <h2 className={`text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        <Sparkles size={13} className="text-amber-500" />
                        Quick Conversion Presets
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {PRESET_CONVERSIONS.map((preset) => {
                            const IconComponent = preset.icon;
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => handleApplyPreset(preset)}
                                    className={`p-3 rounded-xl transition flex flex-col items-start text-left group shadow-sm hover:shadow-indigo-500/10 border ${isDark ? 'bg-slate-900/70 hover:bg-slate-850 border-slate-800/80 hover:border-indigo-500/50' : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-indigo-400'}`}
                                >
                                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${preset.color} text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition`}>
                                        <IconComponent size={14} />
                                    </div>
                                    <span className={`text-xs font-semibold ${isDark ? 'text-slate-200 group-hover:text-white' : 'text-slate-800 group-hover:text-slate-950'}`}>
                                        {preset.title}
                                    </span>
                                    <span className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {preset.badge}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Primary Conversion Zone */}
                <div className={`border rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-5 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
                    {/* Drag & Drop Upload Container */}
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                            dragActive
                                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.005]'
                                : selectedFiles.length > 0
                                ? (isDark ? 'border-indigo-500/60 bg-indigo-950/20' : 'border-indigo-400 bg-indigo-50/50')
                                : (isDark ? 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60' : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/70')
                        }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".docx,.doc,.pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
                            onChange={(e) => handleFilesSelected(e.target.files)}
                            className="hidden"
                        />

                        {selectedFiles.length > 0 ? (
                            <div className="flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                                    <FileText size={24} />
                                </div>
                                <div className="text-center">
                                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {selectedFiles.length === 1
                                            ? selectedFiles[0].name
                                            : `${selectedFiles.length} files selected (Collation Mode)`}
                                    </p>
                                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Total Size: {formatBytes(selectedFiles.reduce((acc, f) => acc + f.size, 0))}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedFiles([]);
                                        setConversionResult(null);
                                    }}
                                    className="mt-1 text-[11px] text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium px-2 py-0.5 rounded-md hover:bg-rose-500/10"
                                >
                                    <X size={12} />
                                    <span>Clear Selection</span>
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                                    <Upload size={22} className="text-indigo-500" />
                                </div>
                                <div>
                                    <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                        Drag & drop files here, or <span className="text-indigo-500 underline underline-offset-2">browse your device</span>
                                    </p>
                                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Supports Word (.docx), Excel (.xlsx/.csv), PDF (.pdf), and Images (.png, .jpg)
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Target Format & Options Configuration Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        {/* Target Format Selector */}
                        <div className="flex flex-col gap-1.5">
                            <label className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                <ArrowRight size={13} className="text-indigo-500" />
                                <span>Convert To:</span>
                            </label>
                            <select
                                value={toFormat}
                                onChange={(e) => setToFormat(e.target.value)}
                                className={`border rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                            >
                                {(COMPATIBLE_TARGETS[fromFormat] || [
                                    { value: 'pdf', label: 'PDF Document (.pdf)' },
                                    { value: 'docx', label: 'Word (.docx)' },
                                    { value: 'xlsx', label: 'Excel (.xlsx)' },
                                    { value: 'csv', label: 'CSV (.csv)' },
                                    { value: 'txt', label: 'Text (.txt)' }
                                ]).map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Page Layout / Options Toggle */}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <label className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <Sliders size={13} className="text-indigo-500" />
                                    <span>Conversion Options</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowOptions(!showOptions)}
                                    className="text-[11px] text-indigo-500 hover:text-indigo-600 flex items-center gap-0.5 font-medium"
                                >
                                    <span>{showOptions ? 'Hide' : 'Customize'}</span>
                                    {showOptions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                            </div>

                            {showOptions ? (
                                <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <div>
                                        <span className={`text-[10px] font-medium block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Orientation</span>
                                        <select
                                            value={orientation}
                                            onChange={(e) => setOrientation(e.target.value)}
                                            className={`w-full border rounded-lg px-2 py-1 text-[11px] ${isDark ? 'bg-slate-900 border-slate-700/80 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
                                        >
                                            <option value="portrait">Portrait</option>
                                            <option value="landscape">Landscape</option>
                                            <option value="auto">Auto-detect</option>
                                        </select>
                                    </div>
                                    <div>
                                        <span className={`text-[10px] font-medium block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Page Size</span>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => setPageSize(e.target.value)}
                                            className={`w-full border rounded-lg px-2 py-1 text-[11px] ${isDark ? 'bg-slate-900 border-slate-700/80 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
                                        >
                                            <option value="A4">A4 (210 x 297mm)</option>
                                            <option value="Letter">US Letter</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className={`text-xs border rounded-xl px-3 py-2 flex items-center justify-between ${isDark ? 'text-slate-400 bg-slate-950/60 border-slate-800/80' : 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                                    <span>Standard A4 ({orientation})</span>
                                    <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Default Margins</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar (during conversion) */}
                    {isConverting && (
                        <div className="flex flex-col gap-1.5 pt-2">
                            <div className={`flex items-center justify-between text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                <span>Transforming document structure...</span>
                                <span className="font-mono text-indigo-500 font-bold">{conversionProgress}%</span>
                            </div>
                            <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                                    style={{ width: `${conversionProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleConvert}
                            disabled={isConverting || selectedFiles.length === 0}
                            className={`px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg ${
                                isConverting || selectedFiles.length === 0
                                    ? (isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed')
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                            }`}
                        >
                            <RefreshCw size={14} className={isConverting ? 'animate-spin' : ''} />
                            <span>{isConverting ? 'Converting...' : 'Convert File Now'}</span>
                        </button>
                    </div>
                </div>

                {/* Conversion Result Presentation Card */}
                {conversionResult && (
                    <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        Conversion Complete!
                                    </h3>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                                        {conversionResult.outputFileName?.split('.').pop()?.toUpperCase()}
                                    </span>
                                </div>
                                <p className={`text-xs mt-0.5 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    {conversionResult.outputFileName}
                                    <span className="text-slate-500 mx-1.5">•</span>
                                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{formatBytes(conversionResult.outputFileSize)}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <a
                                href={conversionResult.downloadUrl}
                                download={conversionResult.outputFileName}
                                className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
                            >
                                <Download size={14} />
                                <span>Download File</span>
                            </a>

                            <button
                                type="button"
                                onClick={() => setShowSaveModal(true)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'}`}
                                title="Save to School Lab Documents"
                            >
                                <FolderPlus size={14} className="text-indigo-500" />
                                <span className="hidden sm:inline">Save to Documents</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Save to Documents Modal */}
                {showSaveModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                        <div className={`border rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                <h4 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    <FolderPlus size={16} className="text-indigo-500" />
                                    Save to Lab Documents
                                </h4>
                                <button
                                    onClick={() => setShowSaveModal(false)}
                                    className={`p-1 rounded-lg ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div>
                                    <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Document Title</label>
                                    <input
                                        type="text"
                                        value={saveTitle}
                                        onChange={(e) => setSaveTitle(e.target.value)}
                                        className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                                    />
                                </div>

                                <div>
                                    <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Category</label>
                                    <select
                                        value={saveCategory}
                                        onChange={(e) => setSaveCategory(e.target.value)}
                                        className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                                    >
                                        <option value="report">Reports</option>
                                        <option value="manual">Manuals</option>
                                        <option value="agreement">Agreements</option>
                                        <option value="policy">Policies</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className={`flex items-center justify-end gap-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                <button
                                    type="button"
                                    onClick={() => setShowSaveModal(false)}
                                    className={`px-3.5 py-1.5 text-xs transition ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveToDocuments}
                                    disabled={isSavingToDocs}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                                >
                                    {isSavingToDocs ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                                    <span>{isSavingToDocs ? 'Saving...' : 'Save to Repository'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Conversions History */}
                <div className={`border rounded-2xl p-5 shadow-lg flex flex-col gap-3 ${isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'}`}>
                    <div className={`flex items-center justify-between border-b pb-2.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-indigo-500" />
                            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                Recent Conversion Jobs
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={fetchRecentJobs}
                            className={`p-1 rounded-md transition ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                            title="Refresh Recent History"
                        >
                            <RefreshCw size={12} className={loadingRecent ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {recentJobs.length === 0 ? (
                        <div className={`py-6 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            No recent conversion jobs. Convert a file above to see it here!
                        </div>
                    ) : (
                        <div className={`divide-y ${isDark ? 'divide-slate-800/50' : 'divide-slate-200'}`}>
                            {recentJobs.map((job) => (
                                <div key={job.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                                            <FileText size={13} />
                                        </div>
                                        <div className="truncate">
                                            <span className={`font-medium truncate block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                                {job.output_file_name || job.input_file_name}
                                            </span>
                                            <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                {job.from_format?.toUpperCase()} → {job.to_format?.toUpperCase()}
                                                {job.output_file_size ? ` • ${formatBytes(job.output_file_size)}` : ''}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {job.status === 'completed' ? (
                                            <a
                                                href={`/api/documents/convert/download/${job.id}`}
                                                download={job.output_file_name}
                                                className={`p-1.5 rounded-lg transition ${isDark ? 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800' : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-100'}`}
                                                title="Download output file"
                                            >
                                                <Download size={14} />
                                            </a>
                                        ) : (
                                            <span className="text-[10px] text-amber-500 px-2 py-0.5 rounded bg-amber-500/10">
                                                {job.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            </div>
        </div>
    );
}
