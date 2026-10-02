'use client';

import React from 'react';
import PdfViewer from './PdfViewer';
import SpreadsheetViewer from './SpreadsheetViewer';
import DocxViewer from './DocxViewer';

export default function FileViewer({ url, fileType, name, documentId, className = '' }) {
    const type = (fileType || '').toLowerCase();

    if (type === 'pdf') {
        return <PdfViewer url={url} name={name} documentId={documentId} />;
    }

    if (['xlsx', 'xls', 'csv'].includes(type)) {
        return (
            <div className={`w-full h-full min-h-[500px] ${className}`}>
                <SpreadsheetViewer url={url} fileName={name} />
            </div>
        );
    }

    if (['docx', 'doc'].includes(type)) {
        return (
            <div className={`w-full h-full min-h-[500px] ${className}`}>
                <DocxViewer url={url} fileName={name} />
            </div>
        );
    }

    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(type) || type === 'audio') {
        return (
            <div className={`w-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 ${className}`}>
                <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-3xl mb-4 shadow-inner">
                    🎵
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1 max-w-md text-center truncate">{name}</h3>
                <p className="text-xs text-slate-500 mb-6">Audio Recording / Lecture ({type.toUpperCase()})</p>
                <audio controls src={url} className="w-full max-w-md shadow-sm" />
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-white dark:bg-slate-900 rounded-lg p-6 text-slate-500 text-sm">
            Preview is not available for this file type ({type.toUpperCase()}).
        </div>
    );
}
