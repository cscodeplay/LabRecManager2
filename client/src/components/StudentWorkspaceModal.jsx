'use client';

import React, { useState, useEffect } from 'react';
import { 
    X, FolderArchive, FileText, Database, FileCode, 
    RefreshCw, Trash2, Upload, Download, Eye, Check, AlertCircle, Sparkles
} from 'lucide-react';
import { trainingAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function StudentWorkspaceModal({ isOpen, onClose }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileContent, setFileContent] = useState(null);
    const [contentLoading, setContentLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadFiles();
        } else {
            setSelectedFile(null);
            setFileContent(null);
        }
    }, [isOpen]);

    const loadFiles = async () => {
        setLoading(true);
        try {
            const res = await trainingAPI.getWorkspaceFiles();
            setFiles(res.data?.data?.files || []);
        } catch (err) {
            console.error('Failed to load workspace files:', err);
            toast.error('Failed to load workspace files');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectFile = async (file) => {
        setSelectedFile(file);
        setContentLoading(true);
        try {
            const res = await trainingAPI.getWorkspaceFileContent(file.name);
            setFileContent(res.data?.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to read file');
            setFileContent(null);
        } finally {
            setContentLoading(false);
        }
    };

    const handleReset = async () => {
        if (!confirm('Are you sure you want to reset your workspace? Ephemeral files created by your scripts will be cleared.')) return;
        setIsResetting(true);
        try {
            await trainingAPI.resetWorkspace();
            toast.success('Workspace reset successfully');
            setSelectedFile(null);
            setFileContent(null);
            await loadFiles();
        } catch (err) {
            toast.error('Failed to reset workspace');
        } finally {
            setIsResetting(false);
        }
    };

    const handleFileUpload = async (e) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        const formData = new FormData();
        formData.append('file', uploadedFile);

        try {
            await trainingAPI.uploadWorkspaceFile(formData);
            toast.success(`'${uploadedFile.name}' uploaded to workspace`);
            await loadFiles();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to upload file');
        } finally {
            e.target.value = '';
        }
    };

    if (!isOpen) return null;

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
                
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
                            <FolderArchive className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                                Student Workspace Files & Sandbox
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                Isolated per-student storage for Python file handling (`open()`, `pickle`) & SQLite databases.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="btn bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-sm font-semibold">
                            <Upload className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Upload File</span>
                            <input type="file" onChange={handleFileUpload} className="hidden" />
                        </label>
                        <button
                            onClick={handleReset}
                            disabled={isResetting || files.length === 0}
                            className="btn bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
                            title="Clear workspace"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body split view */}
                <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-800">
                    
                    {/* Left: File List */}
                    <div className="w-full md:w-5/12 overflow-y-auto p-4 space-y-2 shrink-0 bg-slate-950/30">
                        <div className="flex items-center justify-between pb-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                Files ({files.length})
                            </span>
                            <button 
                                onClick={loadFiles} 
                                className="p-1 text-slate-400 hover:text-white rounded transition"
                                title="Refresh files"
                            >
                                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {loading ? (
                            <div className="py-8 text-center text-xs text-slate-500">Loading files...</div>
                        ) : files.length === 0 ? (
                            <div className="py-12 text-center text-xs text-slate-500 space-y-2 p-4 border border-dashed border-slate-800 rounded-2xl">
                                <FolderArchive className="w-8 h-8 text-slate-600 mx-auto" />
                                <p className="font-semibold text-slate-400">Workspace is empty</p>
                                <p className="text-[11px] text-slate-500">
                                    Files created with Python `open("filename", "w")` or documents uploaded in the Documents tab will appear here automatically.
                                </p>
                            </div>
                        ) : (
                            files.map((file) => {
                                const isSelected = selectedFile?.name === file.name;
                                return (
                                    <div
                                        key={file.name}
                                        onClick={() => handleSelectFile(file)}
                                        className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-2.5 ${
                                            isSelected 
                                                ? 'bg-indigo-600/20 border-indigo-500/50 text-white' 
                                                : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 text-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {file.isDb ? (
                                                <Database className="w-4 h-4 text-amber-400 shrink-0" />
                                            ) : file.isText ? (
                                                <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                                            ) : (
                                                <FileCode className="w-4 h-4 text-purple-400 shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold truncate">{file.name}</div>
                                                <div className="text-[10px] text-slate-500">{formatSize(file.size)}</div>
                                            </div>
                                        </div>
                                        <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Right: File Preview */}
                    <div className="w-full md:w-7/12 flex-1 min-h-0 flex flex-col p-4 bg-slate-900 overflow-hidden">
                        {!selectedFile ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                                <FileText className="w-10 h-10 text-slate-700 mb-2" />
                                <p className="text-xs font-semibold text-slate-400">Select a file to preview</p>
                                <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                                    Click any `.txt`, `.csv`, `.dat`, or `.sqlite` file on the left to inspect its contents.
                                </p>
                            </div>
                        ) : contentLoading ? (
                            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                                Loading preview...
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                                    <div>
                                        <span className="text-xs font-bold text-white">{selectedFile.name}</span>
                                        <span className="text-[10px] text-slate-400 ml-2">({formatSize(selectedFile.size)})</span>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto mt-3 rounded-xl bg-slate-950 p-3 border border-slate-800 font-mono text-xs text-slate-200">
                                    {fileContent?.isDb ? (
                                        <div className="space-y-2 p-3 text-center">
                                            <Database className="w-8 h-8 text-amber-400 mx-auto" />
                                            <div className="font-bold text-amber-300">SQLite Database Active</div>
                                            <p className="text-xs text-slate-400">
                                                {fileContent.message || 'SQLite database file'}
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                You can query this database in your Python script using:
                                                <code className="block bg-slate-900 p-2 rounded mt-1 text-teal-300">
                                                    con = sqlite3.connect(&quot;{selectedFile.name}&quot;)
                                                </code>
                                            </p>
                                        </div>
                                    ) : (
                                        <pre className="whitespace-pre-wrap leading-relaxed">
                                            {fileContent?.content || '(Empty file)'}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info Ribbon */}
                <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Path: Your Python script executes with <code>cwd=&quot;./&quot;</code> directly in this workspace.</span>
                    </div>
                    <button onClick={onClose} className="btn btn-secondary text-xs py-1 px-3">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
