'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as docx from 'docx-preview';
import {
    FileText, ZoomIn, ZoomOut, RotateCcw, Download,
    Copy, Check, Printer, AlertCircle, Loader2, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Extracts readable text streams from a legacy Word 97-2003 (.doc) binary buffer.
 */
function extractDocBinaryText(buffer) {
    try {
        const uint8 = new Uint8Array(buffer);
        // Look for ASCII printable runs and UTF-16LE characters
        let text = '';
        let currentRun = '';

        for (let i = 0; i < uint8.length; i++) {
            const byte = uint8[i];
            // Standard printable ASCII or newline/tab
            if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
                currentRun += String.fromCharCode(byte);
            } else {
                if (currentRun.length >= 4) {
                    text += currentRun + ' ';
                }
                currentRun = '';
            }
        }
        if (currentRun.length >= 4) text += currentRun;

        // Clean up repeated spaces and non-prose metadata markers
        const paragraphs = text
            .split(/[\r\n]+/)
            .map(p => p.trim())
            .filter(p => p.length > 5 && !p.match(/^[^\w\s]+$/) && !p.startsWith('Normal.dot'));

        return paragraphs.join('\n\n');
    } catch (e) {
        console.warn('Failed to parse .doc binary text:', e);
        return '';
    }
}

export default function DocxViewer({
    data,
    url,
    fileName = 'Document',
    className = ''
}) {
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [isLegacyDoc, setIsLegacyDoc] = useState(false);
    const [legacyText, setLegacyText] = useState('');
    const [copied, setCopied] = useState(false);
    const [rawBlob, setRawBlob] = useState(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);
        setIsLegacyDoc(false);
        setLegacyText('');

        const loadDoc = async () => {
            try {
                let blob;
                if (data instanceof Blob) {
                    blob = data;
                } else if (data instanceof ArrayBuffer) {
                    blob = new Blob([data]);
                } else if (data?.buffer instanceof ArrayBuffer) {
                    blob = new Blob([data.buffer]);
                } else if (url) {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`Could not fetch document: ${res.statusText}`);
                    blob = await res.blob();
                } else {
                    throw new Error('No document data or URL provided');
                }

                if (!isMounted) return;
                setRawBlob(blob);

                const lowerName = (fileName || '').toLowerCase();
                const isExplicitLegacyDoc = lowerName.endsWith('.doc') && !lowerName.endsWith('.docx');

                // If explicit .doc binary format, parse readable text stream
                if (isExplicitLegacyDoc) {
                    const arrayBuf = await blob.arrayBuffer();
                    const text = extractDocBinaryText(arrayBuf);
                    if (isMounted) {
                        setIsLegacyDoc(true);
                        setLegacyText(text || 'This older Word 97-2003 (.doc) binary file does not contain readable plain text streams. Please download to view in Microsoft Word or LibreOffice.');
                        setLoading(false);
                    }
                    return;
                }

                // Attempt docx-preview rendering for .docx
                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                    try {
                        await docx.renderAsync(blob, containerRef.current, null, {
                            className: 'docx-preview-document',
                            inWrapper: true,
                            ignoreWidth: false,
                            ignoreHeight: false
                        });
                        if (isMounted) setLoading(false);
                    } catch (renderErr) {
                        console.warn('[DocxViewer] renderAsync failed, checking if .doc fallback is applicable:', renderErr);
                        // Fallback to binary text extraction if docx parsing failed
                        const arrayBuf = await blob.arrayBuffer();
                        const text = extractDocBinaryText(arrayBuf);
                        if (isMounted) {
                            setIsLegacyDoc(true);
                            setLegacyText(text || 'Could not parse Word document package. Please download to open in Microsoft Word.');
                            setLoading(false);
                        }
                    }
                }
            } catch (err) {
                console.error('[DocxViewer] Error loading Word document:', err);
                if (isMounted) {
                    setError(err.message || 'Failed to load document');
                    setLoading(false);
                }
            }
        };

        loadDoc();

        return () => {
            isMounted = false;
        };
    }, [data, url, fileName]);

    const handleCopyText = () => {
        if (legacyText) {
            navigator.clipboard.writeText(legacyText);
            setCopied(true);
            toast.success('Document text copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } else if (containerRef.current) {
            const text = containerRef.current.innerText || '';
            navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success('Document text copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        if (!rawBlob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(rawBlob);
        link.download = fileName || 'document.docx';
        link.click();
        URL.revokeObjectURL(link.href);
    };

    return (
        <div className={`w-full h-full flex flex-col bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden ${className}`}>
            {/* Header Toolbar */}
            <div className="px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={fileName}>
                        {fileName}
                    </span>
                    {isLegacyDoc && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold flex-shrink-0">
                            Word 97-2003 (.doc)
                        </span>
                    )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1.5">
                    {/* Zoom Controls (for docx) */}
                    {!isLegacyDoc && (
                        <>
                            <button
                                type="button"
                                onClick={() => setZoom(z => Math.max(0.65, +(z - 0.1).toFixed(2)))}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                                title="Zoom out"
                            >
                                <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-mono text-slate-500 w-9 text-center">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                type="button"
                                onClick={() => setZoom(z => Math.min(1.5, +(z + 0.1).toFixed(2)))}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                                title="Zoom in"
                            >
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            {zoom !== 1 && (
                                <button
                                    type="button"
                                    onClick={() => setZoom(1)}
                                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
                                    title="Reset zoom"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                </button>
                            )}
                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                        </>
                    )}

                    {/* Copy Text */}
                    <button
                        type="button"
                        onClick={handleCopyText}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                        title="Copy document text"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {/* Download */}
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                        title="Download Word Document"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Document Content Viewport */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center justify-start">
                {loading && (
                    <div className="my-auto flex flex-col items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <span className="text-xs font-semibold">Rendering Word document...</span>
                    </div>
                )}

                {error && (
                    <div className="my-auto p-6 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900 text-center max-w-md">
                        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Preview Unavailable</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{error}</p>
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
                        >
                            Download Document
                        </button>
                    </div>
                )}

                {/* Word .docx Render Target */}
                <div
                    ref={containerRef}
                    style={{
                        transform: !isLegacyDoc ? `scale(${zoom})` : 'none',
                        transformOrigin: 'top center',
                        transition: 'transform 0.1s ease-out'
                    }}
                    className={`docx-wrapper-container w-full max-w-4xl ${isLegacyDoc || loading || error ? 'hidden' : 'block'}`}
                />

                {/* Legacy Word .doc Text View */}
                {isLegacyDoc && !loading && !error && (
                    <div className="w-full max-w-3xl bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 my-4">
                        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-900 dark:text-blue-300 text-xs mb-6 border border-blue-200 dark:border-blue-900">
                            <Info className="w-4 h-4 flex-shrink-0" />
                            <span>
                                This document is saved in the legacy Word 97-2003 (.doc) binary format. Showing extracted text below.
                            </span>
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm font-sans leading-relaxed whitespace-pre-wrap select-text text-slate-800 dark:text-slate-200">
                            {legacyText}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
