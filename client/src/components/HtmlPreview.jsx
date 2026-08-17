import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const HtmlPreview = ({ url, className }) => {
    const [htmlContent, setHtmlContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        
        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error('Failed to load content');
                return res.text();
            })
            .then(text => {
                setHtmlContent(text);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [url]);

    if (loading) {
        return (
            <div className={`flex flex-col items-center justify-center w-full h-full min-h-[500px] bg-slate-50 rounded-lg border border-slate-200 ${className || ''}`}>
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
                <p className="text-slate-500">Loading HTML preview...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`flex flex-col items-center justify-center w-full h-full min-h-[500px] bg-red-50 text-red-500 rounded-lg border border-red-200 p-6 text-center ${className || ''}`}>
                <p className="mb-4">Could not load HTML preview.</p>
                <p className="text-sm opacity-80">{error}</p>
                <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4 px-4 py-2 bg-white rounded-md shadow-sm border border-red-200 text-red-600 hover:bg-red-50 transition">
                    Open File Directly
                </a>
            </div>
        );
    }

    return (
        <iframe
            srcDoc={htmlContent}
            className={`w-full h-full min-h-[500px] rounded-lg border border-slate-200 bg-white ${className || ''}`}
            title="Text/HTML Preview"
            sandbox="allow-scripts allow-same-origin"
        />
    );
};

export default HtmlPreview;
