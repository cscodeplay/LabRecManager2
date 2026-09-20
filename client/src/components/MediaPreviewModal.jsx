'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    X, Download, ExternalLink, FolderPlus, Bot, Sparkles, Loader2,
    FileText, FileSpreadsheet, FileCode, Music, Image as ImageIcon,
    ZoomIn, ZoomOut, RotateCcw, Copy, Check, Volume2, Search,
    Presentation, Maximize2, AlertCircle, RefreshCw
} from 'lucide-react';
import * as xlsx from 'xlsx';
import JSZip from 'jszip';
import { googleDriveAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import SpreadsheetViewer from './SpreadsheetViewer';
import DocxViewer from './DocxViewer';

function detectFileCategory(file) {
    const name = (file?.name || file?.fileName || '').toLowerCase();
    const mime = (file?.mimeType || '').toLowerCase();
    const fileType = (file?.fileType || '').toLowerCase();

    // Word Documents / Google Docs FIRST (High fidelity DocxViewer preview)
    if (fileType === 'docx' || fileType === 'doc' || name.match(/\.(docx|doc)$/) || mime.includes('wordprocessingml') || mime.includes('msword') || mime === 'application/vnd.google-apps.document') return 'word';

    // Spreadsheets / Google Sheets (SpreadsheetViewer with merged cells & sheet tabs)
    if (fileType === 'xlsx' || fileType === 'xls' || fileType === 'csv' || mime === 'application/vnd.google-apps.spreadsheet' || name.match(/\.(xlsx|xls|csv)$/) || mime.includes('spreadsheet') || mime.includes('csv')) return 'spreadsheet';

    // Google Slides / Presentations
    if (fileType === 'pptx' || fileType === 'ppt' || mime === 'application/vnd.google-apps.presentation' || name.match(/\.(pptx|ppt)$/) || mime.includes('presentationml') || mime.includes('powerpoint')) return 'presentation';

    // PDF Documents
    if (fileType === 'pdf' || name.endsWith('.pdf') || mime.includes('pdf')) return 'pdf';

    // Images
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(fileType) || name.match(/\.(png|jpg|jpeg|webp|gif|svg|bmp)$/) || mime.startsWith('image/')) return 'image';

    // Audio
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(fileType) || name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/) || mime.startsWith('audio/')) return 'audio';

    // Code & Text
    if (name.match(/\.(py|js|jsx|ts|tsx|html|css|json|sql|sh|c|cpp|java|php|rb|go|rs|md|yaml|yml|xml|env)$/)) return 'code';
    if (name.endsWith('.txt') || mime.includes('text/plain')) return 'text';

    return 'other';
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '—';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function MediaPreviewModal({
    file,
    onClose,
    onImport,
    onAttachToBot,
    onDownload
}) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [blobUrl, setBlobUrl] = useState(null);
    const [fileBlob, setFileBlob] = useState(null);

    // Content specific states
    const category = detectFileCategory(file);
    const [textContent, setTextContent] = useState('');
    const [slides, setSlides] = useState([]);
    const [imageZoom, setImageZoom] = useState(1);

    // On-Demand AI Text Extraction
    const [extractedText, setExtractedText] = useState(null);
    const [extractingText, setExtractingText] = useState(false);
    const [showTextDrawer, setShowTextDrawer] = useState(false);
    const [copiedText, setCopiedText] = useState(false);

    // Audio states
    const audioRef = useRef(null);
    const [playbackRate, setPlaybackRate] = useState(1);

    // Load file blob
    useEffect(() => {
        let isMounted = true;
        let createdUrl = null;

        const loadContent = async () => {
            if (!file?.id && !file?.url) return;
            setLoading(true);
            setError(null);

            try {
                let blob = null;
                if (file.url) {
                    // Local document or direct URL
                    const res = await fetch(file.url);
                    if (!res.ok) throw new Error(`Could not fetch file: ${res.statusText}`);
                    const arrayBuffer = await res.arrayBuffer();
                    let mime = file.mimeType || res.headers.get('content-type') || 'application/octet-stream';
                    if (category === 'pdf' || (file.name || file.fileName || '').toLowerCase().endsWith('.pdf')) {
                        mime = 'application/pdf';
                    }
                    blob = new Blob([arrayBuffer], { type: mime });
                } else if (file.id) {
                    // Google Drive file
                    const res = await googleDriveAPI.downloadContent(file.id);
                    let blobType = file.mimeType || 'application/octet-stream';
                    if (category === 'pdf' || (file.name || file.fileName || '').toLowerCase().endsWith('.pdf')) {
                        blobType = 'application/pdf';
                    } else if (file.mimeType === 'application/vnd.google-apps.document') {
                        blobType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                    } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
                        blobType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    }
                    const dataBuffer = res.data instanceof ArrayBuffer ? res.data : (res.data?.arrayBuffer ? await res.data.arrayBuffer() : res.data);
                    blob = new Blob([dataBuffer], { type: blobType });
                }

                if (!isMounted || !blob) return;

                setFileBlob(blob);
                createdUrl = URL.createObjectURL(blob);
                setBlobUrl(createdUrl);

                // Category-specific processing
                if (category === 'text' || category === 'code') {
                    const text = await blob.text();
                    if (isMounted) setTextContent(text);
                } else if (category === 'presentation') {
                    try {
                        const zip = await JSZip.loadAsync(blob);
                        const slideKeys = Object.keys(zip.files).filter(k => k.match(/^ppt\/slides\/slide\d+\.xml$/i));
                        slideKeys.sort((a, b) => {
                            const nA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
                            const nB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
                            return nA - nB;
                        });

                        const parsedSlides = [];
                        for (let i = 0; i < slideKeys.length; i++) {
                            const sf = zip.file(slideKeys[i]);
                            if (sf) {
                                const xml = await sf.async('text');
                                const matches = xml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
                                const lines = matches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
                                parsedSlides.push({
                                    slideNumber: i + 1,
                                    title: lines[0] || `Slide ${i + 1}`,
                                    content: lines.slice(1)
                                });
                            }
                        }
                        if (isMounted) setSlides(parsedSlides);
                    } catch (e) {
                        console.warn('PPTX parse error:', e);
                    }
                }
            } catch (err) {
                console.error('Failed to load file preview:', err);
                if (isMounted) setError(err.response?.data?.message || err.message || 'Could not load file stream.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadContent();

        return () => {
            isMounted = false;
            if (createdUrl) URL.revokeObjectURL(createdUrl);
        };
    }, [file?.id, file?.url, category, file?.mimeType, file?.name, file?.fileName]);

    // Optional On-Demand AI Text Extraction
    const handleExtractText = async () => {
        setShowTextDrawer(true);
        if (extractedText) return;

        setExtractingText(true);
        try {
            const res = await googleDriveAPI.getFileText(file.id);
            setExtractedText(res.data?.data?.text || 'No readable text could be extracted from this document.');
        } catch (err) {
            console.error('Extraction error:', err);
            setExtractedText('Failed to extract text. You can still download or open the file directly in Google Drive.');
            toast.error('AI Text Extraction failed');
        } finally {
            setExtractingText(false);
        }
    };

    const handleCopyExtracted = () => {
        if (!extractedText) return;
        navigator.clipboard.writeText(extractedText);
        setCopiedText(true);
        toast.success('Extracted text copied to clipboard!');
        setTimeout(() => setCopiedText(false), 2000);
    };

    const handleSendExtractedToBot = () => {
        if (onAttachToBot) {
            onAttachToBot(file, extractedText);
        } else {
            window.dispatchEvent(new CustomEvent('attach-to-bot', {
                detail: {
                    file,
                    prompt: `I have attached "${file.name}". Please analyze its contents and summarize the key points.`
                }
            }));
        }
        onClose();
    };

    const handleAttachCurrentFile = () => {
        if (onAttachToBot) {
            onAttachToBot(file);
        } else {
            window.dispatchEvent(new CustomEvent('attach-to-bot', {
                detail: {
                    file,
                    prompt: `I have attached "${file.name}". Can you summarize or extract key points from it?`
                }
            }));
        }
        onClose();
    };

    const changeAudioSpeed = (speed) => {
        setPlaybackRate(speed);
        if (audioRef.current) audioRef.current.playbackRate = speed;
    };

    return (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-6xl h-[92vh] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                {/* Header Toolbar */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 flex-shrink-0">
                    {/* File Info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center flex-shrink-0 text-emerald-700 dark:text-emerald-400">
                            {category === 'pdf' && <FileText className="w-4 h-4 text-rose-600" />}
                            {category === 'spreadsheet' && <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                            {category === 'word' && <FileText className="w-4 h-4 text-blue-600" />}
                            {category === 'presentation' && <Presentation className="w-4 h-4 text-amber-600" />}
                            {category === 'image' && <ImageIcon className="w-4 h-4 text-purple-600" />}
                            {category === 'audio' && <Music className="w-4 h-4 text-indigo-600" />}
                            {(category === 'code' || category === 'text') && <FileCode className="w-4 h-4 text-teal-600" />}
                            {category === 'other' && <FileText className="w-4 h-4 text-slate-500" />}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={file.name}>
                                {file.name}
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                <span className="uppercase font-semibold px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                    {category}
                                </span>
                                <span>{formatBytes(file.size)}</span>
                                {file.modifiedTime && <span>• {new Date(file.modifiedTime).toLocaleDateString()}</span>}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons Toolbar (Icon-Only with tooltips) */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Optional AI Text Extraction Trigger */}
                        <button
                            type="button"
                            onClick={handleExtractText}
                            className={`p-2 rounded-lg transition border ${
                                showTextDrawer
                                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700'
                            }`}
                            title="Extract text using AI OCR (Optional)"
                        >
                            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </button>

                        {/* Attach to AI Bot */}
                        <button
                            type="button"
                            onClick={handleAttachCurrentFile}
                            className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
                            title="Attach file to AI Copilot"
                        >
                            <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </button>

                        {/* Import to Documents */}
                        {onImport && (
                            <button
                                type="button"
                                onClick={() => onImport(file)}
                                className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition"
                                title="Import to ULRMS Documents"
                            >
                                <FolderPlus className="w-4 h-4" />
                            </button>
                        )}

                        {/* Download */}
                        {onDownload && (
                            <button
                                type="button"
                                onClick={() => onDownload(file)}
                                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                title="Download file"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        )}

                        {/* Google Drive Link */}
                        {file.webViewLink && (
                            <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                title="Open in Google Drive"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        )}

                        {/* Close */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            title="Close preview"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area (Split if text drawer is open) */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0 bg-slate-100 dark:bg-slate-950">
                    {/* Primary Visual Preview Viewport */}
                    <div className={`flex-1 overflow-auto p-3 sm:p-4 flex flex-col items-center justify-center transition-all ${
                        showTextDrawer ? 'md:w-3/5' : 'w-full'
                    }`}>
                        {loading ? (
                            <div className="flex flex-col items-center justify-center gap-2.5 text-slate-500">
                                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                                <span className="text-xs font-medium">Loading document preview...</span>
                            </div>
                        ) : error ? (
                            <div className="max-w-md text-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 shadow-xs">
                                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Preview Unavailable</h4>
                                <p className="text-xs text-slate-500 mb-4">{error}</p>
                                <div className="flex items-center justify-center gap-2">
                                    {onDownload && (
                                        <button
                                            type="button"
                                            onClick={() => onDownload(file)}
                                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
                                        >
                                            Download File
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Category Renderers */
                            <div className="w-full h-full flex flex-col">
                                {/* PDF */}
                                {category === 'pdf' && (blobUrl || file.url) && (
                                    <div className="w-full h-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs bg-white">
                                        <object
                                            data={blobUrl ? `${blobUrl}#toolbar=1&navpanes=0&scrollbar=1` : (file.url || '')}
                                            type="application/pdf"
                                            className="w-full h-full"
                                            title={file.name || file.fileName || 'PDF Document Preview'}
                                        >
                                            <iframe
                                                src={blobUrl ? `${blobUrl}#toolbar=1` : (file.url || '')}
                                                className="w-full h-full border-0"
                                                title={file.name || file.fileName || 'PDF Document Preview'}
                                            />
                                        </object>
                                    </div>
                                )}

                                {/* Image */}
                                {category === 'image' && blobUrl && (
                                    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-slate-900/90 rounded-xl p-4">
                                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-800/80 backdrop-blur-xs p-1 rounded-lg border border-slate-700 text-white z-10">
                                            <button
                                                type="button"
                                                onClick={() => setImageZoom(z => Math.max(0.5, z - 0.25))}
                                                className="p-1 hover:bg-slate-700 rounded"
                                                title="Zoom out"
                                            >
                                                <ZoomOut className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="text-[10px] font-mono px-1.5">{Math.round(imageZoom * 100)}%</span>
                                            <button
                                                type="button"
                                                onClick={() => setImageZoom(z => Math.min(3, z + 0.25))}
                                                className="p-1 hover:bg-slate-700 rounded"
                                                title="Zoom in"
                                            >
                                                <ZoomIn className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setImageZoom(1)}
                                                className="p-1 hover:bg-slate-700 rounded"
                                                title="Reset zoom"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={blobUrl}
                                            alt={file.name}
                                            style={{ transform: `scale(${imageZoom})`, transition: 'transform 0.15s ease' }}
                                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg select-none"
                                        />
                                    </div>
                                )}

                                {/* Spreadsheets (Excel, CSV, Google Sheets) */}
                                {category === 'spreadsheet' && (
                                    <SpreadsheetViewer data={fileBlob} fileName={file.name || file.fileName} />
                                )}

                                {/* Word Documents (DOCX, DOC) */}
                                {category === 'word' && (
                                    <DocxViewer data={fileBlob} fileName={file.name || file.fileName} />
                                )}

                                {/* PowerPoint Presentations */}
                                {category === 'presentation' && (
                                    <div className="w-full h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-auto p-4 space-y-4">
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                Presentation Slides ({slides.length} slides)
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {slides.map((s, idx) => (
                                                <div key={idx} className="p-4 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white dark:from-slate-800 dark:to-slate-900 dark:border-amber-900/50 shadow-2xs">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                                                            Slide {s.slideNumber}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">{s.title}</h4>
                                                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside">
                                                        {s.content.map((line, lIdx) => (
                                                            <li key={lIdx} className="line-clamp-2">{line}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Audio / Music */}
                                {category === 'audio' && blobUrl && (
                                    <div className="w-full max-w-xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center text-center">
                                        <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-inner">
                                            <Music className="w-10 h-10 animate-pulse" />
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 max-w-sm truncate">{file.name}</h4>
                                        <p className="text-xs text-slate-500 mb-6">Audio Recording / Track</p>

                                        <audio
                                            ref={audioRef}
                                            controls
                                            src={blobUrl}
                                            className="w-full mb-4"
                                        />

                                        {/* Playback speed controls */}
                                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                            <span className="text-[10px] font-bold mr-1">Speed:</span>
                                            {[0.75, 1, 1.25, 1.5, 2].map(speed => (
                                                <button
                                                    key={speed}
                                                    type="button"
                                                    onClick={() => changeAudioSpeed(speed)}
                                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                                        playbackRate === speed
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {speed}x
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Code / Notepad / Text */}
                                {(category === 'code' || category === 'text') && (
                                    <div className="w-full h-full bg-slate-950 text-slate-100 rounded-xl border border-slate-800 overflow-auto p-4 font-mono text-xs shadow-inner">
                                        <pre className="whitespace-pre-wrap select-text leading-relaxed">
                                            {textContent}
                                        </pre>
                                    </div>
                                )}

                                {/* Other / Fallback */}
                                {category === 'other' && (
                                    <div className="max-w-md text-center p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-xs">
                                        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">{file.name}</h4>
                                        <p className="text-xs text-slate-500 mb-4">Direct preview not supported for this binary format. You can download or view directly in Google Drive.</p>
                                        <div className="flex items-center justify-center gap-2">
                                            {onDownload && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDownload(file)}
                                                    className="px-3.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
                                                >
                                                    Download File
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Optional Extracted Text Drawer */}
                    {showTextDrawer && (
                        <div className="w-full md:w-2/5 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-64 md:h-full flex-shrink-0 animate-in slide-in-from-right-4 duration-200">
                            <div className="px-4 py-2.5 bg-purple-50/60 dark:bg-purple-950/40 border-b border-purple-100 dark:border-purple-900/50 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950 dark:text-purple-200">
                                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                    <span>AI Extracted Text</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {extractedText && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handleCopyExtracted}
                                                className="p-1 rounded text-purple-700 hover:bg-purple-100 dark:text-purple-300 dark:hover:bg-purple-900 transition"
                                                title="Copy extracted text"
                                            >
                                                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSendExtractedToBot}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-2xs transition"
                                                title="Send text to AI Copilot"
                                            >
                                                <Bot className="w-3 h-3" />
                                                <span>Send to Bot</span>
                                            </button>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowTextDrawer(false)}
                                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                        title="Close text panel"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto p-4">
                                {extractingText ? (
                                    <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500">
                                        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                                        <span className="text-xs">Extracting text with AI OCR...</span>
                                    </div>
                                ) : extractedText ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800">
                                            <span>{extractedText.length.toLocaleString()} characters</span>
                                            <span>{extractedText.split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
                                        </div>
                                        <pre className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-text leading-relaxed">
                                            {extractedText}
                                        </pre>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-xs text-slate-400">
                                        Click &quot;Extract Text&quot; to parse text with OCR
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
