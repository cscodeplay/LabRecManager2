'use client';

import React, { useState } from 'react';
import {
    Package,
    FileText,
    FileCode,
    Download,
    X,
    Check,
    RefreshCw,
    Sparkles,
    Image as ImageIcon,
    Terminal
} from 'lucide-react';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { compilerAPI } from '@/lib/api';

export default function ExportBundleModal({
    isOpen,
    onClose,
    activeTab,
    editorRef,
    isLightMode = true,
    getDiagramImageBase64
}) {
    const [format, setFormat] = useState('pdf'); // 'pdf' | 'docx' | 'both'
    const [isExporting, setIsExporting] = useState(false);

    if (!isOpen || !activeTab) return null;

    const isSql = activeTab.language === 'sql' || activeTab.filename?.endsWith('.sql');
    const ext = isSql ? 'sql' : 'py';
    const cleanName = (activeTab.filename || activeTab.title || 'program').replace(/\.[^/.]+$/, '').trim();
    const fullFileName = `${cleanName}.${ext}`;

    const handleExport = async () => {
        setIsExporting(true);
        const toastId = toast.loading('Packaging code, visual diagram, and output into ZIP...');

        try {
            // 1. Capture live code from Monaco editor or tab state
            const liveCode = editorRef?.current ? editorRef.current.getValue() : (activeTab.code || '');

            // 2. Capture diagram PNG image if canvas is rendered
            let diagramBase64 = null;
            if (typeof getDiagramImageBase64 === 'function') {
                try {
                    diagramBase64 = await getDiagramImageBase64();
                } catch (imgErr) {
                    console.warn('[ExportBundle] Diagram image capture notice:', imgErr.message);
                }
            }

            // Fallback: If not passed as callback, attempt to serialize active SVG canvas directly from DOM
            if (!diagramBase64 && typeof document !== 'undefined') {
                try {
                    const svgEl = document.querySelector('svg[data-canvas-svg="true"]') || document.querySelector('svg.cursor-grab') || document.querySelector('svg');
                    if (svgEl) {
                        const serializer = new XMLSerializer();
                        const svgString = serializer.serializeToString(svgEl);
                        const canvas = document.createElement('canvas');
                        canvas.width = 1400;
                        canvas.height = 900;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        await new Promise((resolve) => {
                            const img = new Image();
                            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
                            img.onload = () => {
                                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                diagramBase64 = canvas.toDataURL('image/png');
                                resolve();
                            };
                            img.onerror = () => resolve();
                            setTimeout(resolve, 800);
                        });
                    }
                } catch (_) {}
            }

            // 3. Call backend export endpoint
            const response = await compilerAPI.exportBundle({
                fileName: fullFileName,
                code: liveCode,
                language: activeTab.language || (isSql ? 'sql' : 'python'),
                diagramImageBase64: diagramBase64,
                output: activeTab.output || null,
                stdin: activeTab.stdin || '',
                format
            });

            // 4. Download file using file-saver
            const blob = new Blob([response.data], { type: 'application/zip' });
            saveAs(blob, `${cleanName}_bundle.zip`);

            toast.success(`Exported ${cleanName}_bundle.zip successfully!`, { id: toastId, icon: '📦' });
            onClose();
        } catch (err) {
            console.error('Export bundle error:', err);
            toast.error('Failed to export project bundle: ' + (err.response?.data?.message || err.message), { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden select-none ${
                isLightMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 text-lg">
                            <Package className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm tracking-wide">Export Project Bundle</h3>
                            <p className="text-xs text-slate-500">Package code, visual diagrams, and output into a submission ZIP</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Active Program Pill */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                        isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}>
                        <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                                isSql ? 'bg-sky-100 text-sky-800 border border-sky-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                                {isSql ? 'SQL' : 'PY'}
                            </span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{fullFileName}</span>
                        </div>
                        <span className="text-slate-500 text-[11px]">Includes live buffer & output</span>
                    </div>

                    {/* Report Format Selection */}
                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                            Choose Report Document Format:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Option 1: PDF */}
                            <div
                                onClick={() => setFormat('pdf')}
                                className={`p-3 rounded-xl border-2 transition cursor-pointer flex flex-col gap-1 ${
                                    format === 'pdf'
                                        ? 'border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200'
                                        : isLightMode
                                        ? 'border-slate-200 bg-white hover:border-slate-300'
                                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs flex items-center gap-1.5">
                                        <FileText className="w-4 h-4 text-rose-500" />
                                        PDF Document (.pdf)
                                    </span>
                                    {format === 'pdf' && (
                                        <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                                    )}
                                </div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Ready-to-submit formatted lab record report with diagram & outputs
                                </span>
                            </div>

                            {/* Option 2: Word (DOCX) */}
                            <div
                                onClick={() => setFormat('docx')}
                                className={`p-3 rounded-xl border-2 transition cursor-pointer flex flex-col gap-1 ${
                                    format === 'docx'
                                        ? 'border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200'
                                        : isLightMode
                                        ? 'border-slate-200 bg-white hover:border-slate-300'
                                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs flex items-center gap-1.5">
                                        <FileCode className="w-4 h-4 text-sky-500" />
                                        Word Document (.docx)
                                    </span>
                                    {format === 'docx' && (
                                        <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                                    )}
                                </div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Fully editable Word report with embedded high-res diagram & tables
                                </span>
                            </div>
                        </div>

                        {/* Both Formats Option */}
                        <div
                            onClick={() => setFormat('both')}
                            className={`mt-2 p-2.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between ${
                                format === 'both'
                                    ? 'border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200'
                                    : isLightMode
                                    ? 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300'
                            }`}
                        >
                            <span className="text-xs font-bold flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                Include Both Formats (.pdf & .docx)
                            </span>
                            {format === 'both' && (
                                <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                            )}
                        </div>
                    </div>

                    {/* ZIP Archive Contents Preview */}
                    <div className={`p-3.5 rounded-xl border space-y-2 ${
                        isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <Package className="w-3.5 h-3.5" />
                            <span>ZIP Archive Contents ({cleanName}_bundle.zip):</span>
                        </div>
                        <div className="space-y-1 text-xs font-mono">
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                <FileCode className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                <span className="font-bold">{fullFileName}</span>
                                <span className="text-[10px] text-slate-400">(Source code script)</span>
                            </div>

                            {(format === 'pdf' || format === 'both') && (
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                    <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span className="font-bold">{cleanName}_report.pdf</span>
                                    <span className="text-[10px] text-slate-400">(Formatted report with diagram)</span>
                                </div>
                            )}

                            {(format === 'docx' || format === 'both') && (
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                    <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    <span className="font-bold">{cleanName}_report.docx</span>
                                    <span className="text-[10px] text-slate-400">(Word document with diagram)</span>
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                <ImageIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                <span className="font-bold">{cleanName}_diagram.png</span>
                                <span className="text-[10px] text-slate-400">(High-res diagram image)</span>
                            </div>

                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                <Terminal className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="font-bold">{cleanName}_output.txt</span>
                                <span className="text-[10px] text-slate-400">(Execution stdout/stderr and stats)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={`px-6 py-3.5 border-t flex items-center justify-end gap-2.5 ${
                    isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isExporting}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={isExporting}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        {isExporting ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Exporting ZIP...</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-3.5 h-3.5" />
                                <span>Download ZIP Bundle</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
