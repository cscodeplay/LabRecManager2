'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ExternalLink, FileText, Download, Maximize, Minimize } from 'lucide-react';
import HtmlPreview from '@/components/HtmlPreview';
import { documentsAPI } from '@/lib/api';

const FILE_ICONS = {
    pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', csv: '📊', file: '📁'
};

export default function ViewDocumentPage() {
    const params = useParams();
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        loadDocument();
    }, [params.id]);

    const loadDocument = async () => {
        try {
            const res = await documentsAPI.getPublic(params.id);
            setDoc(res.data.data.document);
        } catch (err) {
            setError('Document not found or not public');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <p className="text-slate-500">Loading...</p>
            </div>
        );
    }

    if (error || !doc) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Document Not Found</h1>
                    <p className="text-slate-500">{error || 'This document may have been removed or is not public.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-slate-100 ${isFullscreen ? 'fixed inset-0 z-50 overflow-auto flex flex-col' : ''}`}>
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-4 shrink-0">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">{FILE_ICONS[doc.fileType] || FILE_ICONS.file}</span>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">{doc.name}</h1>
                            <p className="text-sm text-slate-500">{doc.fileType.toUpperCase()} • {doc.fileSizeFormatted}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsFullscreen(!isFullscreen)} className="btn btn-secondary text-sm">
                            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />} {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                        </button>
                        <a
                            href={doc.url}
                            download={doc.fileName || doc.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary text-sm flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" /> Download
                        </a>
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div className={`${isFullscreen ? 'flex-1 w-full p-0' : 'max-w-4xl mx-auto p-4'}`}>
                <div className={`bg-white shadow-sm overflow-hidden ${isFullscreen ? 'h-[calc(100vh-89px)] w-full' : 'rounded-xl'}`}>
                    {(() => {
                        const ext = doc.url.split('.').pop().toLowerCase();
                        const type = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odp', 'mp4', 'mpeg', 'ogg', 'webm', 'avi', 'mov', 'mp3', 'wav', 'm4a', 'aac', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt', 'html', 'csv'].includes(ext) ? ext : doc.fileType;
                        
                        if (type === 'pdf') {
                            return (
                                <iframe
                                    src={doc.url}
                                    className={`w-full border-0 ${isFullscreen ? 'h-full min-h-[calc(100vh-89px)]' : 'h-[80vh]'}`}
                                    title="PDF Preview"
                                />
                            );
                        } else if (['ppt', 'pptx'].includes(type)) {
                            const fullUrl = doc.url.startsWith('http') ? doc.url : `${typeof window !== 'undefined' ? window.location.origin : ''}${doc.url}`;
                            return (
                                <iframe
                                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`}
                                    className={`w-full border-0 ${isFullscreen ? 'h-full min-h-[calc(100vh-89px)]' : 'h-[80vh]'}`}
                                    title="Document Preview"
                                />
                            );
                        } else if (['doc', 'docx', 'xls', 'xlsx', 'odp'].includes(type)) {
                            const fullUrl = doc.url.startsWith('http') ? doc.url : `${typeof window !== 'undefined' ? window.location.origin : ''}${doc.url}`;
                            return (
                                <iframe
                                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`}
                                    className={`w-full border-0 ${isFullscreen ? 'h-full min-h-[calc(100vh-89px)]' : 'h-[80vh]'}`}
                                    title="Document Preview"
                                />
                            );
                        } else if (['mp4', 'mpeg', 'ogg', 'webm', 'avi', 'mov'].includes(type)) {
                            return <video controls src={doc.url} className={`w-full bg-black ${isFullscreen ? 'h-full min-h-[calc(100vh-89px)]' : 'h-[80vh]'}`} title="Video Preview" />;
                        } else if (['mp3', 'wav', 'm4a', 'aac'].includes(type)) {
                            return (
                                <div className={`flex items-center justify-center bg-slate-900 w-full ${isFullscreen ? 'h-full min-h-[calc(100vh-89px)]' : 'h-[40vh]'}`}>
                                    <audio controls src={doc.url} className="w-3/4 max-w-md" title="Audio Preview" />
                                </div>
                            );
                        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) {
                            return (
                                <div className={`flex items-center justify-center bg-slate-50 ${isFullscreen ? 'h-full min-h-[calc(100vh-89px)]' : 'h-[80vh]'}`}>
                                    <img src={doc.url} alt={doc.name} className="max-w-full max-h-full object-contain" />
                                </div>
                            );
                        } else if (['txt', 'html'].includes(type)) {
                            return <HtmlPreview url={doc.url} className={isFullscreen ? 'h-full min-h-[calc(100vh-89px)] rounded-none border-0' : ''} />;
                        } else {
                            return (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                    <span className="text-8xl mb-6">{FILE_ICONS[doc.fileType] || FILE_ICONS.file}</span>
                                    <p className="text-lg mb-6">Preview not available for {doc.fileType.toUpperCase()} files</p>
                                </div>
                            );
                        }
                    })()}
                </div>
            </div>

            {/* Footer */}
            <div className="text-center py-6 text-sm text-slate-400">
                Shared via ULRMS
            </div>
        </div>
    );
}
