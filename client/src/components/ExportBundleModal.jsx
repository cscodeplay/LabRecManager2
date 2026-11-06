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
import { generateFlowchartFromCode, generateRelationalErDiagramFromSql } from '@/lib/traditionalGenerators';

/**
 * Deterministically renders flowchartData or code into a high-res standalone PNG base64 string
 * without relying on DOM SVG elements that could mis-target unrelated SVGs (e.g. hamburger icons).
 */
async function synthesizeDiagramPngBase64(diagramData, code = '', language = 'python') {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;

    // 1. If active flowchart SVG canvas is currently mounted in DOM, serialize it cleanly
    const activeCanvasSvg = document.getElementById('flowchart-svg-canvas') || document.querySelector('svg[data-canvas-svg="true"]');
    if (activeCanvasSvg) {
        try {
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(activeCanvasSvg);
            const canvas = document.createElement('canvas');
            canvas.width = 1400;
            canvas.height = 900;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const result = await new Promise((resolve) => {
                const img = new Image();
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.onerror = () => resolve(null);
                setTimeout(() => resolve(null), 900);
            });
            if (result) return result;
        } catch (_) {}
    }

    // 2. Otherwise synthesize pure SVG from structured diagramData or generate from code
    let resolvedData = diagramData;
    if (!resolvedData || !Array.isArray(resolvedData.nodes) || resolvedData.nodes.length === 0) {
        try {
            if (language === 'sql' || code.toLowerCase().includes('create table')) {
                resolvedData = generateRelationalErDiagramFromSql(code);
            } else {
                resolvedData = generateFlowchartFromCode(code, language);
            }
        } catch (_) {}
    }

    if (!resolvedData || !Array.isArray(resolvedData.nodes) || resolvedData.nodes.length === 0) {
        return null;
    }

    const { nodes = [], connectors = [] } = resolvedData;

    // Calculate canvas bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
        const x = n.x ?? 100;
        const y = n.y ?? 100;
        const w = n.width ?? 160;
        const h = n.height ?? 50;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x + w > maxX) maxX = x + w;
        if (y + h > maxY) maxY = y + h;
    });

    if (minX === Infinity) return null;

    const pad = 60;
    const width = Math.max(800, (maxX - minX) + pad * 2);
    const height = Math.max(500, (maxY - minY) + pad * 2);
    const offsetX = pad - minX;
    const offsetY = pad - minY;

    // Build SVG elements
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
        </marker>
    </defs>
    <rect width="${width}" height="${height}" fill="#ffffff"/>`;

    // Connectors
    connectors.forEach((conn) => {
        const fromNode = nodes.find((n) => n.id === conn.from);
        const toNode = nodes.find((n) => n.id === conn.to);
        if (!fromNode || !toNode) return;

        const getPort = (n, p) => {
            const x = (n.x ?? 0) + offsetX;
            const y = (n.y ?? 0) + offsetY;
            const w = n.width ?? 160;
            const h = n.height ?? 50;
            if (p === 'top') return { x: x + w / 2, y };
            if (p === 'bottom') return { x: x + w / 2, y: y + h };
            if (p === 'left') return { x, y: y + h / 2 };
            return { x: x + w, y: y + h / 2 };
        };

        const p1 = getPort(fromNode, conn.fromPort || 'bottom');
        const p2 = getPort(toNode, conn.toPort || 'top');

        let pathD = `M ${p1.x} ${p1.y}`;
        if (conn.label === 'Loop' && conn.fromPort === 'left' && conn.toPort === 'left') {
            const loopX = Math.min(p1.x, p2.x) - 40;
            pathD += ` L ${loopX} ${p1.y} L ${loopX} ${p2.y} L ${p2.x} ${p2.y}`;
        } else if (p1.x !== p2.x) {
            const midY = (p1.y + p2.y) / 2;
            pathD += ` L ${p1.x} ${midY} L ${p2.x} ${midY} L ${p2.x} ${p2.y}`;
        } else {
            pathD += ` L ${p2.x} ${p2.y}`;
        }

        svgContent += `<path d="${pathD}" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>`;
        if (conn.label) {
            const labelX = (p1.x + p2.x) / 2 + 8;
            const labelY = (p1.y + p2.y) / 2 - 4;
            svgContent += `<text x="${labelX}" y="${labelY}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#2563eb">${conn.label}</text>`;
        }
    });

    // Nodes
    nodes.forEach((n) => {
        const x = (n.x ?? 0) + offsetX;
        const y = (n.y ?? 0) + offsetY;
        const w = n.width ?? 160;
        const h = n.height ?? 50;
        const color = n.color || '#ffffff';
        const borderColor = n.borderColor || '#64748b';
        const textColor = n.textColor || '#0f172a';
        const lines = (n.text || '').split('\n');

        if (n.type === 'terminator') {
            svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" ry="24" fill="${color}" stroke="${borderColor}" stroke-width="2"/>`;
        } else if (n.type === 'decision') {
            const pts = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
            svgContent += `<polygon points="${pts}" fill="${color}" stroke="${borderColor}" stroke-width="2"/>`;
        } else if (n.type === 'io') {
            const pts = `${x + 20},${y} ${x + w},${y} ${x + w - 20},${y + h} ${x},${y + h / 2 + h / 2}`;
            svgContent += `<polygon points="${pts}" fill="${color}" stroke="${borderColor}" stroke-width="2"/>`;
        } else if (n.type === 'predefined_process') {
            svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ry="6" fill="${color}" stroke="${borderColor}" stroke-width="2"/>
            <line x1="${x + 14}" y1="${y}" x2="${x + 14}" y2="${y + h}" stroke="${borderColor}" stroke-width="2"/>
            <line x1="${x + w - 14}" y1="${y}" x2="${x + w - 14}" y2="${y + h}" stroke="${borderColor}" stroke-width="2"/>`;
        } else {
            svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ry="6" fill="${color}" stroke="${borderColor}" stroke-width="2"/>`;
        }

        const startTextY = y + h / 2 - ((lines.length - 1) * 14) / 2 + 4;
        lines.forEach((line, lIdx) => {
            const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            svgContent += `<text x="${x + w / 2}" y="${startTextY + lIdx * 15}" font-family="monospace" font-size="11" font-weight="600" text-anchor="middle" fill="${textColor}">${escaped}</text>`;
        });
    });

    svgContent += `</svg>`;

    // Rasterize SVG into high-res PNG canvas
    const canvas = document.createElement('canvas');
    canvas.width = width * 1.5;
    canvas.height = height * 1.5;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
        setTimeout(() => resolve(null), 1000);
    });
}

export default function ExportBundleModal({
    isOpen,
    onClose,
    activeTab,
    flowchartData,
    editorRef,
    isLightMode = true,
    getDiagramImageBase64
}) {
    // Checkboxes state for PDF and Word reports (enforcing minimum one checked)
    const [includePdf, setIncludePdf] = useState(true);
    const [includeDocx, setIncludeDocx] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    if (!isOpen || !activeTab) return null;

    const isSql = activeTab.language === 'sql' || activeTab.filename?.endsWith('.sql');
    const ext = isSql ? 'sql' : 'py';
    const cleanName = (activeTab.filename || activeTab.title || 'program').replace(/\.[^/.]+$/, '').trim();
    const fullFileName = `${cleanName}.${ext}`;

    // Minimum one checked toggle handlers
    const handleTogglePdf = () => {
        if (includePdf && !includeDocx) {
            toast('At least one document format (PDF or Word) must remain selected', { icon: 'ℹ️' });
            return;
        }
        setIncludePdf(!includePdf);
    };

    const handleToggleDocx = () => {
        if (includeDocx && !includePdf) {
            toast('At least one document format (PDF or Word) must remain selected', { icon: 'ℹ️' });
            return;
        }
        setIncludeDocx(!includeDocx);
    };

    const handleExport = async () => {
        setIsExporting(true);
        const toastId = toast.loading('Packaging code, visual diagram, and output into ZIP...');

        try {
            // 1. Capture live code from Monaco editor or tab state
            const liveCode = editorRef?.current ? editorRef.current.getValue() : (activeTab.code || '');

            // 2. Capture diagram PNG image using deterministic synthesizer (never falling back to arbitrary hamburger icons)
            let diagramBase64 = null;
            if (typeof getDiagramImageBase64 === 'function') {
                try {
                    diagramBase64 = await getDiagramImageBase64();
                } catch (imgErr) {
                    console.warn('[ExportBundle] Callback capture notice:', imgErr.message);
                }
            }

            if (!diagramBase64) {
                const tabData = flowchartData || activeTab.flowchartData;
                diagramBase64 = await synthesizeDiagramPngBase64(tabData, liveCode, activeTab.language);
            }

            // 3. Resolve format parameter ('pdf' | 'docx' | 'both')
            const format = includePdf && includeDocx ? 'both' : (includePdf ? 'pdf' : 'docx');

            // 4. Call backend export endpoint
            const response = await compilerAPI.exportBundle({
                fileName: fullFileName,
                code: liveCode,
                language: activeTab.language || (isSql ? 'sql' : 'python'),
                diagramImageBase64: diagramBase64,
                output: activeTab.output || null,
                stdin: activeTab.stdin || '',
                format
            });

            // 5. Download file using file-saver
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

                    {/* Report Format Selection Checkboxes (Minimum 1 Checked) */}
                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                            Select Document Formats to Include (Min 1 required):
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Checkbox 1: PDF Document */}
                            <div
                                onClick={handleTogglePdf}
                                className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between ${
                                    includePdf
                                        ? 'border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200'
                                        : isLightMode
                                        ? 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                                        : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <input
                                        type="checkbox"
                                        checked={includePdf}
                                        onChange={handleTogglePdf}
                                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                    />
                                    <div>
                                        <span className="font-bold text-xs flex items-center gap-1.5 text-slate-900 dark:text-white">
                                            <FileText className="w-4 h-4 text-rose-500" />
                                            PDF Document (.pdf)
                                        </span>
                                        <p className="text-[10px] text-slate-500">Submission-ready formatted report</p>
                                    </div>
                                </div>
                                {includePdf && <span className="text-xs font-bold text-amber-600">Selected</span>}
                            </div>

                            {/* Checkbox 2: Word (DOCX) */}
                            <div
                                onClick={handleToggleDocx}
                                className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between ${
                                    includeDocx
                                        ? 'border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200'
                                        : isLightMode
                                        ? 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                                        : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <input
                                        type="checkbox"
                                        checked={includeDocx}
                                        onChange={handleToggleDocx}
                                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                    />
                                    <div>
                                        <span className="font-bold text-xs flex items-center gap-1.5 text-slate-900 dark:text-white">
                                            <FileCode className="w-4 h-4 text-sky-500" />
                                            Word Document (.docx)
                                        </span>
                                        <p className="text-[10px] text-slate-500">Editable Word document</p>
                                    </div>
                                </div>
                                {includeDocx && <span className="text-xs font-bold text-amber-600">Selected</span>}
                            </div>
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

                            {includePdf && (
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                    <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span className="font-bold">{cleanName}_report.pdf</span>
                                    <span className="text-[10px] text-slate-400">(Formatted report with diagram)</span>
                                </div>
                            )}

                            {includeDocx && (
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
