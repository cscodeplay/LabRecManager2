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

    return (
        <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-white dark:bg-slate-900 rounded-lg p-6 text-slate-500 text-sm">
            Preview is not available for this file type ({type.toUpperCase()}).
        </div>
    );
}
