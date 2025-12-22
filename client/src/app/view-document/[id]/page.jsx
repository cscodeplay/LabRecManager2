'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileText, Download, ExternalLink, Clock } from 'lucide-react';
import { documentsAPI } from '@/lib/api';

const FILE_ICONS = {
    pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', csv: '📊', file: '📁'
};

export default function ViewDocumentPage() {
    const params = useParams();
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
        <div className="min-h-screen bg-slate-100">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-4">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">{FILE_ICONS[doc.fileType] || FILE_ICONS.file}</span>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">{doc.name}</h1>
                            <p className="text-sm text-slate-500">{doc.fileType.toUpperCase()} • {doc.fileSizeFormatted}</p>
                        </div>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                        <Download className="w-4 h-4" /> Download
                    </a>
                </div>
            </div>

            {/* Preview */}
            <div className="max-w-4xl mx-auto p-4">
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {doc.fileType === 'pdf' ? (
                        <iframe src={doc.url} className="w-full h-[80vh] border-0" />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <span className="text-8xl mb-6">{FILE_ICONS[doc.fileType]}</span>
                            <p className="text-lg mb-6">Preview not available for {doc.fileType.toUpperCase()} files</p>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                                <ExternalLink className="w-4 h-4" /> Open File
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="text-center py-6 text-sm text-slate-400">
                Shared via ULRMS
            </div>
        </div>
    );
}
