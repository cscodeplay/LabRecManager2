'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    X, Download, Share2, QrCode, Copy, Check, FileText, 
    Image as ImageIcon, Layers, Upload, ExternalLink, Sparkles,
    FileSpreadsheet, MonitorPlay, CheckCircle2, AlertCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import toast from 'react-hot-toast';

export default function WhiteboardExportModal({
    isOpen,
    onClose,
    whiteboardData,
    sessionId,
    whiteboardId,
    canvasRef,
    currentPage = 0,
    totalPages = 1,
    onImportWBF
}) {
    const [activeTab, setActiveTab] = useState('export'); // 'export' | 'share' | 'import'
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState('wbf'); // 'wbf' | 'iwb' | 'pdf' | 'png' | 'jpeg' | 'svg'
    const fileInputRef = useRef(null);

    // Compute shareable URL and generate QR code
    useEffect(() => {
        if (!isOpen) return;

        if (typeof window !== 'undefined') {
            const origin = window.location.origin;
            let url = '';
            if (sessionId) {
                url = `${origin}/live-board?session=${sessionId}`;
            } else if (whiteboardId) {
                url = `${origin}/whiteboard?id=${whiteboardId}`;
            } else {
                url = window.location.href;
            }
            setShareUrl(url);

            QRCode.toDataURL(url, {
                width: 280,
                margin: 2,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff'
                }
            }).then(uri => {
                setQrCodeDataUrl(uri);
            }).catch(err => {
                console.error('QR code generation failed:', err);
            });
        }
    }, [isOpen, sessionId, whiteboardId]);

    if (!isOpen) return null;

    const handleCopyLink = async () => {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl);
            } else {
                const el = document.createElement('textarea');
                el.value = shareUrl;
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
            }
            setCopied(true);
            toast.success('Shareable link copied to clipboard!', { icon: '📋' });
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            toast.error('Failed to copy link');
        }
    };

    // Helper to download a Blob or DataURL with filename
    const triggerDownload = (blobOrUrl, filename) => {
        const link = document.createElement('a');
        if (typeof blobOrUrl === 'string') {
            link.href = blobOrUrl;
        } else {
            link.href = URL.createObjectURL(blobOrUrl);
        }
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (typeof blobOrUrl !== 'string') {
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        }
    };

    // 1. Export WBF (Native Whiteboard File)
    const exportWBF = () => {
        try {
            const data = {
                format: 'WBF',
                version: '2.0',
                appName: 'Interactive Whiteboard',
                exportedAt: new Date().toISOString(),
                totalPages,
                currentPage,
                pageBackgrounds: whiteboardData.pageBackgrounds || {},
                pageImageObjects: whiteboardData.pageImageObjects || {},
                pageTextObjects: whiteboardData.pageTextObjects || {},
                pageShapeObjects: whiteboardData.pageShapeObjects || {},
                pages: whiteboardData.pages || []
            };

            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const timestamp = new Date().toISOString().slice(0, 10);
            triggerDownload(blob, `Whiteboard_${timestamp}.wbf`);
            toast.success('Exported native WBF file! Ready to reopen anytime.', { icon: '💾' });
        } catch (err) {
            console.error('WBF Export error:', err);
            toast.error('Failed to export WBF file');
        }
    };

    // 2. Export IWB / CFF (Interactive Whiteboard Common File Format for BenQ EZWrite, ViewSonic, Promethean, SMART)
    const exportIWB = async () => {
        setIsExporting(true);
        try {
            const zip = new JSZip();
            const canvas = canvasRef?.current;
            const bgDataUrl = canvas ? canvas.toDataURL('image/png') : '';
            const base64Png = bgDataUrl.replace(/^data:image\/png;base64,/, '');

            if (base64Png) {
                zip.file('images/page_1.png', base64Png, { base64: true });
            }

            const currentShapes = whiteboardData.pageShapeObjects?.[currentPage] || [];
            const currentTexts = whiteboardData.pageTextObjects?.[currentPage] || [];
            const currentImages = whiteboardData.pageImageObjects?.[currentPage] || [];

            // IMS Global / BSI CFF XML structure
            const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<iwb xmlns="http://www.imsglobal.org/xsd/iwb_v1p0" version="1.0">
    <head>
        <title>Interactive Panel Whiteboard Session</title>
        <generator>Interactive Whiteboard Suite</generator>
        <date>${new Date().toISOString()}</date>
    </head>
    <body>
        <page id="page_1" width="${canvas ? canvas.width : 1920}" height="${canvas ? canvas.height : 1080}">
            <background src="images/page_1.png" />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas ? canvas.width : 1920} ${canvas ? canvas.height : 1080}">
                ${currentShapes.map(s => {
                    if (s.type === 'rectangle') {
                        return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${s.fillColor || 'transparent'}" stroke="${s.color || '#000'}" stroke-width="${s.strokeWidth || 2}" rx="${s.radius || 0}" />`;
                    } else if (s.type === 'circle') {
                        return `<ellipse cx="${s.x + s.width/2}" cy="${s.y + s.height/2}" rx="${s.width/2}" ry="${s.height/2}" fill="${s.fillColor || 'transparent'}" stroke="${s.color || '#000'}" stroke-width="${s.strokeWidth || 2}" />`;
                    } else if (s.type === 'diamond') {
                        return `<polygon points="${s.x + s.width/2},${s.y} ${s.x + s.width},${s.y + s.height/2} ${s.x + s.width/2},${s.y + s.height} ${s.x},${s.y + s.height/2}" fill="${s.fillColor || 'transparent'}" stroke="${s.color || '#000'}" stroke-width="${s.strokeWidth || 2}" />`;
                    }
                    return '';
                }).join('\n                ')}
                ${currentTexts.map(t => `<text x="${t.x}" y="${t.y + (t.fontSize || 20)}" font-size="${t.fontSize || 20}" fill="${t.color || '#000'}">${(t.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`).join('\n                ')}
            </svg>
        </page>
    </body>
</iwb>`;

            zip.file('content.xml', contentXml);
            const content = await zip.generateAsync({ type: 'blob' });
            const timestamp = new Date().toISOString().slice(0, 10);
            triggerDownload(content, `Whiteboard_Panel_${timestamp}.iwb`);
            toast.success('Exported IWB file! Compatible with BenQ EZWrite & ViewSonic myViewBoard.', { icon: '📟', duration: 4000 });
        } catch (err) {
            console.error('IWB export error:', err);
            toast.error('Failed to export IWB package');
        } finally {
            setIsExporting(false);
        }
    };

    // 3. Export PNG / JPEG
    const exportImage = (format = 'png') => {
        try {
            const canvas = canvasRef?.current;
            if (!canvas) {
                toast.error('Canvas not found');
                return;
            }

            // Create export canvas with background and all objects rendered
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = canvas.width;
            exportCanvas.height = canvas.height;
            const ctx = exportCanvas.getContext('2d');

            // Draw background
            const pageBg = whiteboardData.pageBackgrounds?.[currentPage] || { color: '#ffffff' };
            ctx.fillStyle = pageBg.color || '#ffffff';
            ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

            // Draw base canvas strokes
            ctx.drawImage(canvas, 0, 0);

            // Export format
            const mimeType = format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 'image/png';
            const dataUrl = exportCanvas.toDataURL(mimeType, 0.95);
            const timestamp = new Date().toISOString().slice(0, 10);
            triggerDownload(dataUrl, `Whiteboard_${timestamp}.${format}`);
            toast.success(`Exported ${format.toUpperCase()} image!`, { icon: '🖼️' });
        } catch (err) {
            console.error('Image export error:', err);
            toast.error(`Failed to export ${format.toUpperCase()}`);
        }
    };

    // 4. Export PDF (Offline native PDF generator embedding canvas image)
    const exportPDF = () => {
        try {
            const canvas = canvasRef?.current;
            if (!canvas) return;

            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = canvas.width;
            exportCanvas.height = canvas.height;
            const ctx = exportCanvas.getContext('2d');

            const pageBg = whiteboardData.pageBackgrounds?.[currentPage] || { color: '#ffffff' };
            ctx.fillStyle = pageBg.color || '#ffffff';
            ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            ctx.drawImage(canvas, 0, 0);

            const imgData = exportCanvas.toDataURL('image/jpeg', 0.9);

            // Construct printable window/frame for direct PDF saving across all OS & interactive panels
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Whiteboard_Page_${currentPage + 1}</title>
                        <style>
                            @page { size: landscape; margin: 0; }
                            body { margin: 0; padding: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; }
                            img { width: 100vw; height: auto; max-height: 100vh; object-fit: contain; }
                        </style>
                    </head>
                    <body>
                        <img src="${imgData}" onload="window.print(); window.close();" />
                    </body>
                    </html>
                `);
                printWindow.document.close();
                toast.success('PDF print/export dialog launched!', { icon: '📄' });
            } else {
                // Fallback direct download as image
                exportImage('png');
            }
        } catch (err) {
            console.error('PDF export error:', err);
            toast.error('Failed to export PDF');
        }
    };

    // 5. Export SVG Vector
    const exportSVG = () => {
        try {
            const canvas = canvasRef?.current;
            const w = canvas ? canvas.width : 1920;
            const h = canvas ? canvas.height : 1080;
            const currentShapes = whiteboardData.pageShapeObjects?.[currentPage] || [];
            const currentTexts = whiteboardData.pageTextObjects?.[currentPage] || [];
            const bg = whiteboardData.pageBackgrounds?.[currentPage]?.color || '#ffffff';

            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="${bg}" />
    ${currentShapes.map(s => {
        if (s.type === 'rectangle') {
            return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${s.fillColor || 'transparent'}" stroke="${s.color || '#000'}" stroke-width="${s.strokeWidth || 2}" rx="${s.radius || 0}" />`;
        } else if (s.type === 'circle') {
            return `<ellipse cx="${s.x + s.width/2}" cy="${s.y + s.height/2}" rx="${s.width/2}" ry="${s.height/2}" fill="${s.fillColor || 'transparent'}" stroke="${s.color || '#000'}" stroke-width="${s.strokeWidth || 2}" />`;
        } else if (s.type === 'diamond') {
            return `<polygon points="${s.x + s.width/2},${s.y} ${s.x + s.width},${s.y + s.height/2} ${s.x + s.width/2},${s.y + s.height} ${s.x},${s.y + s.height/2}" fill="${s.fillColor || 'transparent'}" stroke="${s.color || '#000'}" stroke-width="${s.strokeWidth || 2}" />`;
        }
        return '';
    }).join('\n    ')}
    ${currentTexts.map(t => `<text x="${t.x}" y="${t.y + (t.fontSize || 20)}" font-size="${t.fontSize || 20}" fill="${t.color || '#000'}" font-family="sans-serif">${(t.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`).join('\n    ')}
</svg>`;

            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
            triggerDownload(blob, `Whiteboard_Vector_${Date.now()}.svg`);
            toast.success('Exported scalable vector SVG!', { icon: '📐' });
        } catch (err) {
            toast.error('Failed to export SVG');
        }
    };

    // Handle WBF / IWB Import
    const handleFileImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.name.endsWith('.iwb') || file.name.endsWith('.zip')) {
            try {
                const zip = await JSZip.loadAsync(file);
                let bgImage = null;
                // Look for background image in zip
                const imgFiles = Object.keys(zip.files).filter(f => f.match(/\.(png|jpg|jpeg)$/i));
                if (imgFiles.length > 0) {
                    const imgData = await zip.files[imgFiles[0]].async('base64');
                    bgImage = `data:image/png;base64,${imgData}`;
                }
                if (onImportWBF) {
                    onImportWBF({
                        format: 'IWB',
                        bgImage
                    });
                    toast.success('Successfully imported Interactive Whiteboard (.iwb) package!', { icon: '📟' });
                    onClose();
                    return;
                }
            } catch (err) {
                console.error('IWB import error:', err);
                toast.error('Failed to unpack .iwb archive');
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (onImportWBF) {
                    onImportWBF(parsed);
                    toast.success('Successfully imported Whiteboard File (.wbf)!', { icon: '🎉' });
                    onClose();
                }
            } catch (err) {
                console.error('Import error:', err);
                toast.error('Invalid .wbf or JSON file');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                            <Share2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-wide">Export & Classroom Sharing</h2>
                            <p className="text-xs text-slate-400">Save lessons or share live whiteboard with interactive displays</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2">
                    <button
                        onClick={() => setActiveTab('export')}
                        className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
                            activeTab === 'export'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Download className="w-4 h-4" /> Export Lesson
                    </button>
                    <button
                        onClick={() => setActiveTab('share')}
                        className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
                            activeTab === 'share'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <QrCode className="w-4 h-4" /> Live Share & QR Code
                    </button>
                    <button
                        onClick={() => setActiveTab('import')}
                        className={`pb-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
                            activeTab === 'import'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Upload className="w-4 h-4" /> Open / Import File
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* TAB 1: EXPORT */}
                    {activeTab === 'export' && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                                    Interactive Display & Native Formats
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* WBF Native */}
                                    <div 
                                        onClick={exportWBF}
                                        className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/60 transition cursor-pointer group flex items-start gap-3.5"
                                    >
                                        <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition shrink-0">
                                            <Layers className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition">Native Whiteboard (.wbf)</span>
                                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold">100% EDITABLE</span>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">Preserves shapes, text, real connectors, images, and rotation for reopening.</p>
                                        </div>
                                    </div>

                                    {/* IWB CFF Format */}
                                    <div 
                                        onClick={exportIWB}
                                        className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 transition cursor-pointer group flex items-start gap-3.5"
                                    >
                                        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition shrink-0">
                                            <MonitorPlay className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition">Interactive Panel (.iwb)</span>
                                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">EZWRITE / VIEWSONIC</span>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">Standard CFF package compatible with BenQ EZWrite & ViewSonic myViewBoard.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                                    Document & Image Formats
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {/* PDF */}
                                    <button
                                        onClick={exportPDF}
                                        className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-2 text-center transition group"
                                    >
                                        <FileText className="w-6 h-6 text-rose-400 group-hover:scale-110 transition" />
                                        <span className="text-xs font-semibold text-slate-200">PDF Document</span>
                                    </button>

                                    {/* PNG */}
                                    <button
                                        onClick={() => exportImage('png')}
                                        className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-2 text-center transition group"
                                    >
                                        <ImageIcon className="w-6 h-6 text-blue-400 group-hover:scale-110 transition" />
                                        <span className="text-xs font-semibold text-slate-200">PNG Image</span>
                                    </button>

                                    {/* JPEG */}
                                    <button
                                        onClick={() => exportImage('jpeg')}
                                        className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-2 text-center transition group"
                                    >
                                        <ImageIcon className="w-6 h-6 text-amber-400 group-hover:scale-110 transition" />
                                        <span className="text-xs font-semibold text-slate-200">JPEG Image</span>
                                    </button>

                                    {/* SVG */}
                                    <button
                                        onClick={exportSVG}
                                        className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-2 text-center transition group"
                                    >
                                        <Sparkles className="w-6 h-6 text-purple-400 group-hover:scale-110 transition" />
                                        <span className="text-xs font-semibold text-slate-200">SVG Vector</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: LIVE SHARE & QR CODE */}
                    {activeTab === 'share' && (
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            {/* QR Code */}
                            <div className="p-3 bg-white rounded-2xl shadow-xl border border-slate-200 shrink-0">
                                {qrCodeDataUrl ? (
                                    <img 
                                        src={qrCodeDataUrl} 
                                        alt="Whiteboard QR Code" 
                                        className="w-52 h-52 object-contain select-none"
                                    />
                                ) : (
                                    <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs">
                                        Generating QR...
                                    </div>
                                )}
                            </div>

                            {/* Share Details */}
                            <div className="flex-1 flex flex-col gap-4 w-full">
                                <div>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        Ready for Students & Classroom Panels
                                    </span>
                                    <h4 className="text-base font-bold text-white mb-1">Scan QR Code to Join Instantly</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Students and teachers can scan this QR code with any tablet, phone, or interactive panel to open this whiteboard in real time.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs text-slate-400 font-medium">Direct Shareable Link</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={shareUrl}
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={handleCopyLink}
                                            className={`px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition shrink-0 ${
                                                copied 
                                                    ? 'bg-emerald-600 text-white' 
                                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                            }`}
                                        >
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2 flex items-center gap-3">
                                    <a
                                        href={shareUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 transition"
                                    >
                                        <ExternalLink className="w-4 h-4 text-indigo-400" /> Open in New Window
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: IMPORT WBF */}
                    {activeTab === 'import' && (
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-950/40 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
                                <Upload className="w-7 h-7" />
                            </div>
                            <h4 className="text-base font-bold text-white mb-1">Open Whiteboard File (.wbf / .iwb)</h4>
                            <p className="text-xs text-slate-400 max-w-sm mb-4">
                                Select a native `.wbf` file or interactive flat panel `.iwb` package to restore your whiteboard session.
                            </p>

                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept=".wbf,.json,.iwb,.zip" 
                                className="hidden" 
                                onChange={handleFileImport}
                            />

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4" /> Browse Device Files
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Optimized for BenQ, ViewSonic, SMART, and Promethean panels
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
}
