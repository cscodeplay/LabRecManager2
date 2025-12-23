'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, Eye, Clock, User, Share2, Inbox, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { documentsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';

const FILE_ICONS = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    xls: '📊',
    xlsx: '📊',
    csv: '📊',
    txt: '📝',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    webp: '🖼️',
    file: '📁'
};

export default function SharedDocumentsPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingDoc, setViewingDoc] = useState(null);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadSharedDocuments();
    }, [_hasHydrated, isAuthenticated]);

    const loadSharedDocuments = async () => {
        setLoading(true);
        try {
            const res = await documentsAPI.getShared();
            setDocuments(res.data.data.documents || []);
        } catch (err) {
            console.error('Failed to load shared documents:', err);
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (doc) => {
        const ext = doc.document?.fileName?.split('.').pop()?.toLowerCase();
        return FILE_ICONS[ext] || FILE_ICONS.file;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const handleDownload = async (doc) => {
        try {
            window.open(doc.document.url, '_blank');
        } catch (err) {
            toast.error('Failed to download');
        }
    };

    if (!_hasHydrated) return null;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <PageHeader
                title="Shared Documents"
                titleHindi="साझा दस्तावेज़"
                icon={<Share2 className="w-8 h-8 text-primary-500" />}
            />

            {loading ? (
                <div className="text-center py-16 text-slate-500">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
                    Loading documents...
                </div>
            ) : documents.length === 0 ? (
                <div className="card p-12 text-center">
                    <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No Documents Shared</h3>
                    <p className="text-slate-500">Documents shared with you by instructors or admins will appear here.</p>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left py-3 px-4 font-semibold text-slate-600">Document</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-600">Shared By</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-600">Shared On</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-600">Source</th>
                                <th className="text-right py-3 px-4 font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {documents.map(item => (
                                <tr key={item.shareId} className="hover:bg-slate-50 transition">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{getIcon(item)}</span>
                                            <div>
                                                <p className="font-medium text-slate-900">{item.document.name}</p>
                                                <p className="text-sm text-slate-500">
                                                    {item.document.fileSizeFormatted || '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-slate-400" />
                                            <span className="text-slate-700">
                                                {item.sharedBy?.firstName} {item.sharedBy?.lastName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                            <span className="text-slate-600">{formatDate(item.sharedAt)}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        {item.targetClass ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
                                                Class: {item.targetClass.name}
                                            </span>
                                        ) : item.targetGroup ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
                                                Group: {item.targetGroup.name}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs">
                                                Direct
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button
                                                onClick={() => setViewingDoc(item.document)}
                                                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                                                title="View"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDownload(item)}
                                                className="p-2 rounded-lg bg-primary-100 hover:bg-primary-200 text-primary-600 transition"
                                                title="Download"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Document Preview Modal */}
            {viewingDoc && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingDoc(null)}>
                    <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{FILE_ICONS[viewingDoc.fileType?.toLowerCase()] || FILE_ICONS.file}</span>
                                <div>
                                    <h3 className="font-semibold text-slate-900">{viewingDoc.name}</h3>
                                    <p className="text-sm text-slate-500">{viewingDoc.fileSizeFormatted}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={viewingDoc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-primary-100 hover:bg-primary-200 text-primary-600 transition"
                                    title="Open in new tab"
                                >
                                    <ExternalLink className="w-5 h-5" />
                                </a>
                                <button
                                    onClick={() => setViewingDoc(null)}
                                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-4 bg-slate-50">
                            {viewingDoc.mimeType?.startsWith('image/') ? (
                                <img
                                    src={viewingDoc.url}
                                    alt={viewingDoc.name}
                                    className="max-w-full mx-auto rounded-lg shadow-lg"
                                />
                            ) : viewingDoc.mimeType === 'application/pdf' ? (
                                <iframe
                                    src={viewingDoc.url}
                                    className="w-full h-[70vh] rounded-lg"
                                    title={viewingDoc.name}
                                />
                            ) : (
                                <div className="text-center py-12">
                                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-500 mb-4">Preview not available for this file type</p>
                                    <a
                                        href={viewingDoc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-primary"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download File
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
