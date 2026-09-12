'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, Loader2, RefreshCw, ExternalLink, Download, AlertCircle } from 'lucide-react';

export default function PdfViewer({
    url,
    documentId,
    name = 'Document Preview',
    className = '',
    isFullscreen = false
}) {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingStep, setLoadingStep] = useState('Fetching document...');
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const blobRef = useRef(null);

    useEffect(() => {
        if (!url) return;

        let active = true;
        setLoading(true);
        setError(null);
        setLoadingStep('Connecting to secure document stream...');

        // Cleanup any previous blob URL
        if (blobRef.current) {
            URL.revokeObjectURL(blobRef.current);
            blobRef.current = null;
        }

        const loadPdf = async () => {
            try {
                // Determine fetch candidates in order of priority:
                // 1. If documentId is provided: use `/api/documents/${documentId}/file` (guaranteed inline disposition)
                // 2. Direct fetch of url
                // 3. Backend stream proxy: `/api/documents/stream-proxy?url=...`
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                let response = null;

                // Step 1: If documentId is provided, fetch via document file route
                if (documentId) {
                    try {
                        setLoadingStep('Buffering PDF from document server...');
                        const docFileUrl = `${apiUrl}/documents/${documentId}/file`;
                        const res = await fetch(docFileUrl, { headers });
                        if (res.ok) {
                            response = res;
                        }
                    } catch (e) {
                        console.warn('[PdfViewer] Direct doc endpoint failed, trying stream proxy:', e.message);
                    }
                }

                // Step 2: Try direct fetch if same-origin or local
                if (!response && (url.startsWith('/') || (typeof window !== 'undefined' && url.startsWith(window.location.origin)))) {
                    try {
                        setLoadingStep('Downloading document buffer...');
                        const res = await fetch(url);
                        if (res.ok) {
                            response = res;
                        }
                    } catch (e) {
                        console.warn('[PdfViewer] Local fetch failed:', e.message);
                    }
                }

                // Step 3: Stream proxy fallback for remote/Cloudinary URLs
                if (!response && url.startsWith('http')) {
                    try {
                        setLoadingStep('Proxying stream with inline rendering headers...');
                        const proxyUrl = `${apiUrl}/documents/stream-proxy?url=${encodeURIComponent(url)}`;
                        const res = await fetch(proxyUrl, { headers });
                        if (res.ok) {
                            response = res;
                        }
                    } catch (e) {
                        console.warn('[PdfViewer] Stream proxy failed, attempting direct fetch:', e.message);
                    }
                }

                // Step 4: Final direct fetch attempt
                if (!response) {
                    setLoadingStep('Fetching raw document...');
                    response = await fetch(url);
                }

                if (!response || !response.ok) {
                    throw new Error(`Failed to load PDF (${response ? response.status : 'Network error'})`);
                }

                setLoadingStep('Rendering inline PDF preview...');
                const arrayBuffer = await response.arrayBuffer();
                if (!active) return;

                const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
                const createdBlobUrl = URL.createObjectURL(pdfBlob);

                blobRef.current = createdBlobUrl;
                setBlobUrl(createdBlobUrl);
                setLoading(false);
            } catch (err) {
                console.error('[PdfViewer] Error loading PDF preview:', err);
                if (active) {
                    // Fall back to direct URL or stream proxy in iframe if fetch was blocked (e.g. CORS)
                    const fallbackUrl = url.startsWith('http')
                        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/documents/stream-proxy?url=${encodeURIComponent(url)}`
                        : url;
                    setBlobUrl(fallbackUrl);
                    setError(null);
                    setLoading(false);
                }
            }
        };

        loadPdf();

        return () => {
            active = false;
            if (blobRef.current) {
                URL.revokeObjectURL(blobRef.current);
                blobRef.current = null;
            }
        };
    }, [url, documentId, retryCount]);

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
    };

    return (
        <div className={`relative flex flex-col w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700/80 shadow-lg ${
            isFullscreen ? 'h-full min-h-[calc(100vh-80px)]' : 'h-[650px] min-h-[500px]'
        } ${className}`}>
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/90 border-b border-slate-700 text-xs text-slate-200 flex-shrink-0">
                <div className="flex items-center gap-2 truncate pr-2">
                    <span className="p-1 rounded bg-red-500/20 text-red-400 font-mono font-bold text-[10px] tracking-wider">PDF</span>
                    <span className="font-medium truncate text-slate-200">{name}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                        type="button"
                        onClick={handleRetry}
                        title="Reload PDF preview"
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open PDF in new tab"
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                        href={url}
                        download={name.endsWith('.pdf') ? name : `${name}.pdf`}
                        title="Download PDF"
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>

            {/* Viewer Content Area */}
            <div className="relative flex-1 w-full h-full bg-slate-950 overflow-hidden">
                {/* Loading Animation Overlay */}
                {loading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-xs p-6 text-center">
                        <div className="relative mb-5">
                            {/* Outer animated ring */}
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-red-500 animate-spin opacity-40 blur-xs" />
                            {/* Centered Document Icon */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg">
                                    <FileText className="w-6 h-6 text-red-400 animate-pulse" />
                                </div>
                            </div>
                        </div>

                        <h4 className="text-sm font-semibold text-slate-100 mb-1.5">Preparing PDF Document Preview</h4>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-3 font-mono">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                            <span>{loadingStep}</span>
                        </p>

                        {/* Skeleton Shimmer bar */}
                        <div className="w-56 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="w-full h-full bg-gradient-to-r from-indigo-500 via-red-500 to-indigo-500 animate-[pulse_1.5s_infinite]" />
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900 p-6 text-center text-slate-300">
                        <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
                        <h4 className="text-sm font-bold text-white mb-1">Could Not Render Inline Preview</h4>
                        <p className="text-xs text-slate-400 max-w-sm mb-4">{error}</p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRetry}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> Retry
                            </button>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                            >
                                <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                            </a>
                        </div>
                    </div>
                )}

                {/* Embedded PDF View (via in-memory blob or stream proxy) */}
                {blobUrl && (
                    <object
                        data={`${blobUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                        type="application/pdf"
                        className="w-full h-full border-0 bg-white"
                        title={name}
                    >
                        <iframe
                            src={`${blobUrl}#toolbar=1`}
                            className="w-full h-full border-0 bg-white"
                            title={name}
                        />
                    </object>
                )}
            </div>
        </div>
    );
}
